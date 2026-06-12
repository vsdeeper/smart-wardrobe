import Taro from "@tarojs/taro";
import type {
  ClothingType,
  RecognizedPreviewItem,
  WardrobeItem,
} from "@/data/wardrobe";
import { WARDROBE_PAGE_SIZE } from "@/data/wardrobe";
import { createTempId } from "@/utils/recognition";

export interface FetchWardrobeItemsOptions {
  typeId?: string | null;
  skip: number;
  limit?: number;
}

interface RecognizeClothingError {
  error: string;
  message: string;
}

interface RecognizePreviewCloudResult {
  preview: {
    name: string;
    typeName: string;
    tags: string[];
    imageFileId: string;
  };
}

type RecognizeCloudResult =
  | RecognizePreviewCloudResult
  | RecognizeClothingError;

function isRecognizeError(
  result: RecognizeCloudResult,
): result is RecognizeClothingError {
  return "error" in result && typeof result.error === "string";
}

interface SaveWardrobeItemsCloudResult {
  saved?: Record<string, unknown>[];
  failed?: { index: number; message: string }[];
  error?: string;
  message?: string;
}

function normalizeCreatedAt(value: unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "getTime" in value) {
    return (value as Date).getTime();
  }
  return Date.now();
}

function normalizeWardrobeItem(raw: Record<string, unknown>): WardrobeItem {
  const createdAt = normalizeCreatedAt(raw.createdAt);
  const item: WardrobeItem = {
    _id: String(raw._id ?? ""),
    name: String(raw.name ?? ""),
    typeId: String(raw.typeId ?? ""),
    typeName: String(raw.typeName ?? ""),
    imageFileId: String(raw.imageFileId ?? ""),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    createdAt,
  };

  if (raw.updatedAt != null) {
    item.updatedAt = normalizeCreatedAt(raw.updatedAt);
  }
  if (typeof raw.outfitRecommendation === "string") {
    item.outfitRecommendation = raw.outfitRecommendation;
  }
  if (typeof raw.warmthLevel === "number") {
    item.warmthLevel = raw.warmthLevel;
  }

  return item;
}

export type WardrobeItemsByType = Record<string, WardrobeItem[]>;

/** 拉取全部衣橱单品并按 typeName 分组，供 AI 推荐使用 */
export async function fetchWardrobeItemsGroupedByType(): Promise<{
  items: WardrobeItem[];
  byType: WardrobeItemsByType;
}> {
  const db = Taro.cloud.database();
  const MAX = 100;
  const res = await db
    .collection("wardrobe_items")
    .orderBy("createdAt", "desc")
    .limit(MAX)
    .get();

  const items = (res.data as Record<string, unknown>[]).map(
    normalizeWardrobeItem,
  );
  const withUrls = await resolveImageUrls(items);
  const byType: WardrobeItemsByType = {};

  for (const item of withUrls) {
    const key = item.typeName || "其他";
    if (!byType[key]) byType[key] = [];
    byType[key].push(item);
  }

  return { items: withUrls, byType };
}

function normalizeClothingType(raw: Record<string, unknown>): ClothingType {
  return {
    _id: String(raw._id ?? ""),
    name: String(raw.name ?? ""),
    itemCount: typeof raw.itemCount === "number" ? raw.itemCount : 0,
  };
}

/** 查询当前用户的衣物类型列表 */
export async function fetchClothingTypes(): Promise<ClothingType[]> {
  const db = Taro.cloud.database();
  const res = await db
    .collection("clothing_types")
    .orderBy("itemCount", "desc")
    .get();
  return (res.data as Record<string, unknown>[]).map(normalizeClothingType);
}

/** 分页查询衣橱单品，可选按类型过滤 */
export async function fetchWardrobeItems(
  options: FetchWardrobeItemsOptions,
): Promise<WardrobeItem[]> {
  const db = Taro.cloud.database();
  const limit = options.limit ?? WARDROBE_PAGE_SIZE;
  const coll = db.collection("wardrobe_items");

  const query = options.typeId ? coll.where({ typeId: options.typeId }) : coll;

  const res = await query
    .orderBy("createdAt", "desc")
    .skip(options.skip)
    .limit(limit)
    .get();

  const items = (res.data as Record<string, unknown>[]).map(
    normalizeWardrobeItem,
  );
  return resolveImageUrls(items);
}

/** 批量解析云存储 fileID 为临时 HTTPS URL */
export async function resolveImageUrls(
  items: WardrobeItem[],
): Promise<WardrobeItem[]> {
  if (items.length === 0) return items;

  const fileIds = [
    ...new Set(items.map((item) => item.imageFileId).filter(Boolean)),
  ];
  if (fileIds.length === 0) return items;

  const res = await Taro.cloud.getTempFileURL({ fileList: fileIds });
  const urlMap = new Map<string, string>();
  for (const file of res.fileList) {
    if (file.status === 0 && file.fileID) {
      urlMap.set(file.fileID, file.tempFileURL);
    }
  }

  return items.map((item) => ({
    ...item,
    imageUrl: urlMap.get(item.imageFileId) ?? item.imageUrl,
  }));
}

/** 为预览项批量解析图片临时 URL */
export async function resolvePreviewImageUrls(
  items: RecognizedPreviewItem[],
): Promise<RecognizedPreviewItem[]> {
  if (items.length === 0) return items;

  const fileIds = [
    ...new Set(items.map((item) => item.imageFileId).filter(Boolean)),
  ];
  if (fileIds.length === 0) return items;

  const res = await Taro.cloud.getTempFileURL({ fileList: fileIds });
  const urlMap = new Map<string, string>();
  for (const file of res.fileList) {
    if (file.status === 0 && file.fileID) {
      urlMap.set(file.fileID, file.tempFileURL);
    }
  }

  return items.map((item) => ({
    ...item,
    imageUrl: urlMap.get(item.imageFileId) ?? item.imageUrl,
  }));
}

/** 上传图片并调用 AI 识别（预览模式，不入库） */
export async function uploadAndRecognize(
  filePath: string,
  onPhase?: (phase: "uploading" | "recognizing") => void,
): Promise<RecognizedPreviewItem> {
  const ext = filePath.includes(".")
    ? filePath.slice(filePath.lastIndexOf("."))
    : ".jpg";
  const cloudPath = `wardrobe/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  onPhase?.("uploading");
  const uploadRes = await Taro.cloud.uploadFile({
    cloudPath,
    filePath,
  });

  onPhase?.("recognizing");
  const { result } = await Taro.cloud.callFunction({
    name: "recognize-clothing",
    data: { fileID: uploadRes.fileID, persist: false },
  });

  const data = result as RecognizeCloudResult;
  if (isRecognizeError(data)) {
    throw new Error(data.message || data.error);
  }

  const preview: RecognizedPreviewItem = {
    tempId: createTempId(),
    name: data.preview.name,
    typeName: data.preview.typeName,
    tags: data.preview.tags,
    imageFileId: data.preview.imageFileId,
  };

  const [withUrl] = await resolvePreviewImageUrls([preview]);
  return withUrl ?? preview;
}

export interface BatchRecognizeProgress {
  current: number;
  total: number;
  phase: "uploading" | "recognizing";
}

export interface BatchRecognizeResult {
  succeeded: RecognizedPreviewItem[];
  failed: { index: number; message: string }[];
}

/** 串行批量上传并识别，单张失败不影响后续 */
export async function uploadAndRecognizeBatch(
  filePaths: string[],
  onProgress?: (progress: BatchRecognizeProgress) => void,
): Promise<BatchRecognizeResult> {
  const total = filePaths.length;
  const succeeded: RecognizedPreviewItem[] = [];
  const failed: { index: number; message: string }[] = [];

  for (let i = 0; i < filePaths.length; i++) {
    const current = i + 1;

    try {
      const result = await uploadAndRecognize(filePaths[i], (phase) => {
        onProgress?.({ current, total, phase });
      });
      succeeded.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "识别失败";
      failed.push({ index: current, message });
    }
  }

  return { succeeded, failed };
}

export interface SaveWardrobeItemsResult {
  saved: WardrobeItem[];
  failed: { index: number; message: string }[];
}

/** 将预览列表批量写入云数据库 */
export async function saveWardrobeItems(
  items: RecognizedPreviewItem[],
): Promise<SaveWardrobeItemsResult> {
  if (items.length === 0) {
    return { saved: [], failed: [] };
  }

  const { result } = await Taro.cloud.callFunction({
    name: "save-wardrobe-items",
    data: {
      items: items.map(({ name, typeName, tags, imageFileId }) => ({
        name,
        typeName,
        tags,
        imageFileId,
      })),
    },
  });

  const data = result as SaveWardrobeItemsCloudResult;
  if (data.error) {
    throw new Error(data.message || data.error);
  }

  const saved = (data.saved ?? []).map((raw) =>
    normalizeWardrobeItem(raw as Record<string, unknown>),
  );
  const withUrls = await resolveImageUrls(saved);

  return {
    saved: withUrls,
    failed: data.failed ?? [],
  };
}

/** 删除云存储中的图片文件 */
export async function deleteCloudFiles(fileIds: string[]): Promise<void> {
  const unique = [...new Set(fileIds.filter(Boolean))];
  if (unique.length === 0) return;

  try {
    await Taro.cloud.deleteFile({ fileList: unique });
  } catch {
    // 云存储删除失败不阻断主流程
  }
}

/** 统计当前用户衣物总数 */
export async function fetchWardrobeItemCount(): Promise<number> {
  const db = Taro.cloud.database();
  const res = await db.collection("wardrobe_items").count();
  return res.total;
}

/** 按 id 查询单件衣橱单品 */
export async function fetchWardrobeItemById(id: string): Promise<WardrobeItem> {
  const db = Taro.cloud.database();
  const res = await db.collection("wardrobe_items").doc(id).get({});
  const raw = res.data as Record<string, unknown> | undefined;

  if (!raw || !raw._id) {
    throw new Error("衣物不存在或已被删除");
  }

  const item = normalizeWardrobeItem(raw);
  const [withUrl] = await resolveImageUrls([item]);
  return withUrl ?? item;
}

export interface UpdateWardrobeItemInput {
  _id: string;
  name: string;
  typeName: string;
  tags: string[];
  outfitRecommendation?: string;
  previousTypeId: string;
}

/** 更新衣橱单品，类别变更时同步迁移类型计数 */
export async function updateWardrobeItem(
  input: UpdateWardrobeItemInput,
): Promise<WardrobeItem> {
  const trimmedName = input.name.trim();
  const trimmedTypeName = input.typeName.trim();

  if (!trimmedName) {
    throw new Error("名称不能为空");
  }
  if (!trimmedTypeName) {
    throw new Error("类别不能为空");
  }

  const db = Taro.cloud.database();
  const _ = db.command;
  const typeColl = db.collection("clothing_types");
  const now = db.serverDate();

  const typeRes = await typeColl.where({ name: trimmedTypeName }).limit(1).get();
  let newTypeId: string;
  let newTypeName: string;

  if (typeRes.data.length > 0) {
    const typeDoc = typeRes.data[0] as Record<string, unknown>;
    newTypeId = String(typeDoc._id);
    newTypeName = String(typeDoc.name ?? trimmedTypeName);
  } else {
    const addRes = await typeColl.add({
      data: {
        name: trimmedTypeName,
        itemCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    });
    newTypeId = addRes._id as string;
    newTypeName = trimmedTypeName;
  }

  const updateData: Record<string, unknown> = {
    name: trimmedName,
    typeId: newTypeId,
    typeName: newTypeName,
    tags: input.tags,
    updatedAt: now,
  };

  if (input.outfitRecommendation !== undefined) {
    updateData.outfitRecommendation = input.outfitRecommendation;
  }

  await db.collection("wardrobe_items").doc(input._id).update({ data: updateData });

  if (input.previousTypeId && input.previousTypeId !== newTypeId) {
    await typeColl.doc(input.previousTypeId).update({
      data: {
        itemCount: _.inc(-1),
        updatedAt: now,
      },
    });
    await typeColl.doc(newTypeId).update({
      data: {
        itemCount: _.inc(1),
        updatedAt: now,
      },
    });
  }

  return fetchWardrobeItemById(input._id);
}

/** 删除衣橱单品，同步减少类型计数并尝试清理云存储图片 */
export async function deleteWardrobeItem(item: WardrobeItem): Promise<void> {
  const db = Taro.cloud.database();
  const _ = db.command;

  await db.collection("wardrobe_items").doc(item._id).remove({});

  if (item.typeId) {
    await db
      .collection("clothing_types")
      .doc(item.typeId)
      .update({
        data: {
          itemCount: _.inc(-1),
          updatedAt: db.serverDate(),
        },
      });
  }

  if (item.imageFileId) {
    await deleteCloudFiles([item.imageFileId]);
  }
}
