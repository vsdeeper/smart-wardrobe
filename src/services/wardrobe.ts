import Taro from "@tarojs/taro";
import { isGenderSet } from "@/data/profile";
import type {
  ClothingType,
  RecognizedPreviewItem,
  WardrobeItem,
} from "@/data/wardrobe";
import { WARDROBE_PAGE_SIZE } from "@/data/wardrobe";
import { attachImageUrls, resolveTempFileUrls } from "@/services/cloudFile";
import {
  getFreshUrlMap,
  mergeImageUrlCache,
  resolvedUrlMapToEntries,
} from "@/services/imageUrlCache";
import { fetchUserProfile } from "@/services/profile";
import { readProfileCache } from "@/services/profileCache";
import { createTempId, RECOGNITION_FAIL_MESSAGE } from "@/utils/recognition";

export interface FetchWardrobeItemsOptions {
  typeId?: string | null;
  skip: number;
  limit?: number;
}

function stripItemImageUrl(item: WardrobeItem): WardrobeItem {
  if (!item.imageUrl && !item.imageUrlAt) return item;
  const next = { ...item };
  delete next.imageUrl;
  delete next.imageUrlAt;
  return next;
}

/** 解析临时链写入 imageUrlCache，返回不含 URL 的业务项 */
async function resolveWardrobeImageUrls(
  items: WardrobeItem[],
): Promise<WardrobeItem[]> {
  if (items.length === 0) return items;
  const fileIds = items.map((item) => item.imageFileId);
  const urlMap = await resolveTempFileUrls(
    fileIds,
    getFreshUrlMap("wardrobe", fileIds),
  );
  mergeImageUrlCache("wardrobe", resolvedUrlMapToEntries(urlMap));
  return items.map(stripItemImageUrl);
}

interface RecognizeClothingError {
  error: string;
  message: string;
  model?: string;
}

interface RecognizeItemPayload {
  name: string;
  typeName: string;
  tags: string[];
  stylingAdvice?: string;
}

interface RecognizeItemsCloudResult {
  items: RecognizeItemPayload[];
  sourceFileId: string;
}

interface GeneratePreviewItemPayload {
  name: string;
  typeName: string;
  tags: string[];
  imageFileId: string;
  stylingAdvice?: string;
}

interface GenerateDisplayCloudResult {
  previews: GeneratePreviewItemPayload[];
  failed?: { index: number; message: string }[];
}

type RecognizeCloudResult = RecognizeItemsCloudResult | RecognizeClothingError;
type GenerateCloudResult = GenerateDisplayCloudResult | RecognizeClothingError;

async function resolveUserGenderForRecognition(): Promise<string | undefined> {
  const cached = readProfileCache()?.profile.gender;
  if (isGenderSet(cached)) {
    return cached;
  }
  const profile = await fetchUserProfile();
  return isGenderSet(profile.gender) ? profile.gender : undefined;
}

function isCloudFunctionError(
  result: RecognizeCloudResult | GenerateCloudResult,
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
  if (typeof raw.stylingAdvice === "string") {
    item.stylingAdvice = raw.stylingAdvice;
  }

  return item;
}

export type WardrobeItemsByType = Record<string, WardrobeItem[]>;

/**
 * 拉取衣橱单品并按 typeName 分组，供 AI 推荐分析使用。
 * 仅供 AI 分析，不解析图片临时链接；展示前请对选中单品解析并 mergeImageUrlCache。
 */
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
  const byType: WardrobeItemsByType = {};

  for (const item of items) {
    const key = item.typeName || "其他";
    if (!byType[key]) byType[key] = [];
    byType[key].push(item);
  }

  return { items, byType };
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
  return resolveWardrobeImageUrls(items);
}

/** 上传图片并调用 AI 识别（预览模式，不入库） */
export async function uploadAndRecognize(
  filePath: string,
  onPhase?: (phase: "uploading" | "recognizing" | "generating") => void,
): Promise<RecognizedPreviewItem[]> {
  const ext = filePath.includes(".")
    ? filePath.slice(filePath.lastIndexOf("."))
    : ".jpg";
  const cloudPath = `wardrobe/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  onPhase?.("uploading");
  const uploadRes = await Taro.cloud.uploadFile({
    cloudPath,
    filePath,
  });
  const sourceFileId = uploadRes.fileID;

  onPhase?.("recognizing");
  const userGender = await resolveUserGenderForRecognition();
  const { result: recognizeResult } = await Taro.cloud.callFunction({
    name: "recognize-clothing",
    data: { fileID: sourceFileId, userGender },
  });

  const recognizeData = recognizeResult as RecognizeCloudResult;
  if (isCloudFunctionError(recognizeData)) {
    throw new Error(recognizeData.message || recognizeData.error);
  }

  const items = recognizeData.items ?? [];
  if (items.length === 0) {
    throw new Error("没认出衣物，请换张更清晰的照片试试");
  }

  onPhase?.("generating");
  let generateData: GenerateCloudResult;
  try {
    const generateRes = (await Taro.cloud.callFunction({
      name: "generate-wardrobe-display",
      data: { fileID: sourceFileId, items },
      config: { timeout: 120000 },
    } as Parameters<typeof Taro.cloud.callFunction>[0] & {
      config?: { timeout?: number };
    })) as { result: unknown };
    generateData = generateRes.result as GenerateCloudResult;
  } catch (err) {
    await deleteCloudFiles([sourceFileId]);
    throw err;
  }

  if (isCloudFunctionError(generateData)) {
    await deleteCloudFiles([sourceFileId]);
    throw new Error(generateData.message || generateData.error);
  }

  const rawPreviews = generateData.previews ?? [];
  if (rawPreviews.length === 0) {
    await deleteCloudFiles([sourceFileId]);
    const partialMsg = generateData.failed?.[0]?.message;
    throw new Error(partialMsg || "展示图没能生成，请稍后重试");
  }

  const previews: RecognizedPreviewItem[] = rawPreviews.map((item) => ({
    tempId: createTempId(),
    name: item.name,
    typeName: item.typeName,
    tags: item.tags,
    imageFileId: item.imageFileId,
    stylingAdvice: item.stylingAdvice,
  }));

  return attachImageUrls(previews);
}

export interface BatchRecognizeProgress {
  current: number;
  total: number;
  phase: "uploading" | "recognizing" | "generating";
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
      const results = await uploadAndRecognize(filePaths[i], (phase) => {
        onProgress?.({ current, total, phase });
      });
      succeeded.push(...results);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : RECOGNITION_FAIL_MESSAGE;
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
      items: items.map(({ name, typeName, tags, imageFileId, stylingAdvice }) => ({
        name,
        typeName,
        tags,
        imageFileId,
        stylingAdvice,
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
  const withUrls = await attachImageUrls(saved);

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

/** 按 id 批量查询衣橱单品，返回顺序与 ids 一致（跳过未找到的 id） */
export async function fetchWardrobeItemsByIds(
  ids: string[],
): Promise<WardrobeItem[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const db = Taro.cloud.database();
  const _ = db.command;
  const res = await db
    .collection("wardrobe_items")
    .where({ _id: _.in(uniqueIds) })
    .get();

  const itemMap = new Map<string, WardrobeItem>();
  for (const raw of res.data as Record<string, unknown>[]) {
    const item = normalizeWardrobeItem(raw);
    if (item._id) {
      itemMap.set(item._id, item);
    }
  }

  const ordered = ids
    .map((id) => itemMap.get(id))
    .filter((item): item is WardrobeItem => item != null);

  return resolveWardrobeImageUrls(ordered);
}

/** 按 id 查询单件衣橱单品 */
export async function fetchWardrobeItemById(id: string): Promise<WardrobeItem> {
  const db = Taro.cloud.database();
  const res = await db.collection("wardrobe_items").doc(id).get({});
  const raw = res.data as Record<string, unknown> | undefined;

  if (!raw || !raw._id) {
    throw new Error("这件衣物已经不在衣橱里了");
  }

  const item = normalizeWardrobeItem(raw);
  const [resolved] = await resolveWardrobeImageUrls([item]);
  return resolved ?? stripItemImageUrl(item);
}

export interface UpdateWardrobeItemInput {
  _id: string;
  name: string;
  typeName: string;
  tags: string[];
  previousTypeId: string;
}

/** 更新衣橱单品，类别变更时同步迁移类型计数 */
export async function updateWardrobeItem(
  input: UpdateWardrobeItemInput,
): Promise<WardrobeItem> {
  const trimmedName = input.name.trim();
  const trimmedTypeName = input.typeName.trim();

  if (!trimmedName) {
    throw new Error("请填写名称");
  }
  if (!trimmedTypeName) {
    throw new Error("请选择类别");
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
