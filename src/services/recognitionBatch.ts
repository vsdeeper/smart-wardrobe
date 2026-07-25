import Taro from "@tarojs/taro";
import type { RecognizedPreviewItem } from "@/data/wardrobe";
import {
  RECOGNITION_HISTORY_PAGE_SIZE,
  type RecognitionBatch,
  type RecognitionBatchProgress,
  type RecognitionBatchStatus,
  type RecognitionConfirmStatus,
} from "@/data/recognition";
import { isGenderSet } from "@/data/profile";
import { fetchUserProfile } from "@/services/profile";
import { readProfileCache } from "@/services/profileCache";
import { resolveCloudFileUrl } from "@/services/wardrobe";
import { normalizeRecognitionErrorMessage } from "@/utils/recognition";

const COLLECTION = "recognition_batches";

function normalizeCreatedAt(value: unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "getTime" in value) {
    return (value as Date).getTime();
  }
  return Date.now();
}

function normalizePreviewItem(raw: Record<string, unknown>): RecognizedPreviewItem {
  const item: RecognizedPreviewItem = {
    tempId: String(raw.tempId ?? ""),
    name: String(raw.name ?? ""),
    typeName: String(raw.typeName ?? ""),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    imageFileId: String(raw.imageFileId ?? ""),
  };
  if (typeof raw.imageUrl === "string") {
    item.imageUrl = raw.imageUrl;
  }
  if (typeof raw.warmthLevel === "number") {
    item.warmthLevel = raw.warmthLevel;
  }
  return item;
}

function normalizeProgress(
  raw: unknown,
): RecognitionBatchProgress | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const current = typeof obj.current === "number" ? obj.current : undefined;
  const total = typeof obj.total === "number" ? obj.total : undefined;
  if (current === undefined || total === undefined) return undefined;
  const progress: RecognitionBatchProgress = { current, total };
  if (
    obj.phase === "recognizing" ||
    obj.phase === "generating"
  ) {
    progress.phase = obj.phase;
  }
  return progress;
}

function normalizeBatch(raw: Record<string, unknown>): RecognitionBatch {
  const status = String(raw.status ?? "failed") as RecognitionBatchStatus;
  const confirmStatus = String(
    raw.confirmStatus ?? "pending",
  ) as RecognitionConfirmStatus;

  const batch: RecognitionBatch = {
    _id: String(raw._id ?? ""),
    status:
      status === "processing" || status === "succeeded" || status === "failed"
        ? status
        : "failed",
    confirmStatus:
      confirmStatus === "confirmed" ||
      confirmStatus === "discarded" ||
      confirmStatus === "pending"
        ? confirmStatus
        : "pending",
    sourceFileIds: Array.isArray(raw.sourceFileIds)
      ? raw.sourceFileIds.map(String)
      : [],
    createdAt: normalizeCreatedAt(raw.createdAt),
  };

  if (typeof raw.coverFileId === "string") {
    batch.coverFileId = raw.coverFileId;
  }
  if (typeof raw.coverUrl === "string") {
    batch.coverUrl = raw.coverUrl;
  }
  if (typeof raw.itemCount === "number") {
    batch.itemCount = raw.itemCount;
  }
  if (typeof raw.errorMessage === "string") {
    batch.errorMessage = raw.errorMessage;
  }
  if (raw.updatedAt != null) {
    batch.updatedAt = normalizeCreatedAt(raw.updatedAt);
  }
  if (raw.confirmedAt != null) {
    batch.confirmedAt = normalizeCreatedAt(raw.confirmedAt);
  }

  const progress = normalizeProgress(raw.progress);
  if (progress) {
    batch.progress = progress;
  }

  if (Array.isArray(raw.items)) {
    batch.items = raw.items.map((item) =>
      normalizePreviewItem(item as Record<string, unknown>),
    );
  }

  return batch;
}

function getBatchCoverFileId(batch: RecognitionBatch): string | undefined {
  return batch.sourceFileIds[0] || batch.coverFileId;
}

async function resolveBatchCover(
  batch: RecognitionBatch,
): Promise<RecognitionBatch> {
  const preferredId = batch.sourceFileIds[0];
  const fallbackId = batch.coverFileId;
  if (!preferredId && !fallbackId) return batch;

  if (preferredId) {
    if (batch.coverUrl && batch.coverFileId === preferredId) {
      return batch;
    }
    const url = await resolveCloudFileUrl(preferredId);
    if (url) {
      return { ...batch, coverFileId: preferredId, coverUrl: url };
    }
    // 原图已删（旧数据）时回退到库内 coverFileId（可能是单品图）
    if (fallbackId && fallbackId !== preferredId) {
      if (batch.coverUrl && batch.coverFileId === fallbackId) {
        return batch;
      }
      const fallbackUrl = await resolveCloudFileUrl(fallbackId);
      if (fallbackUrl) {
        return { ...batch, coverFileId: fallbackId, coverUrl: fallbackUrl };
      }
    }
    return { ...batch, coverFileId: preferredId };
  }

  if (batch.coverUrl && batch.coverFileId === fallbackId) return batch;
  const url = await resolveCloudFileUrl(fallbackId!);
  if (url) {
    return { ...batch, coverFileId: fallbackId, coverUrl: url };
  }
  return batch;
}

async function resolveBatchCovers(
  batches: RecognitionBatch[],
): Promise<RecognitionBatch[]> {
  return Promise.all(batches.map(resolveBatchCover));
}

/**
 * 合并轮询结果到已有条目：封面原图未变则复用 coverUrl，避免临时链接刷新导致闪图。
 */
export async function mergeBatchCover(
  prev: RecognitionBatch | undefined,
  next: RecognitionBatch,
): Promise<RecognitionBatch> {
  const nextCoverId = getBatchCoverFileId(next);
  const prevCoverId = prev ? getBatchCoverFileId(prev) : undefined;
  if (prevCoverId && prevCoverId === nextCoverId && prev?.coverUrl) {
    return {
      ...next,
      coverFileId: nextCoverId,
      coverUrl: prev.coverUrl,
    };
  }
  if (next.coverUrl && next.coverFileId === nextCoverId) {
    return nextCoverId ? { ...next, coverFileId: nextCoverId } : next;
  }
  return resolveBatchCover(next);
}

export async function fetchRecognitionBatchesByIds(
  ids: string[],
): Promise<RecognitionBatch[]> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const db = Taro.cloud.database();
  const docs = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const res = await db.collection(COLLECTION).doc(id).get({});
        return res.data as Record<string, unknown> | undefined;
      } catch {
        return undefined;
      }
    }),
  );
  return docs
    .filter((raw): raw is Record<string, unknown> => Boolean(raw?._id))
    .map(normalizeBatch);
}

async function resolveUserGenderForRecognition(): Promise<string | undefined> {
  const cached = readProfileCache()?.profile.gender;
  if (isGenderSet(cached)) {
    return cached;
  }
  const profile = await fetchUserProfile();
  return isGenderSet(profile.gender) ? profile.gender : undefined;
}

export interface FetchRecognitionBatchesOptions {
  skip?: number;
  limit?: number;
}

export async function fetchRecognitionBatches(
  options: FetchRecognitionBatchesOptions = {},
): Promise<RecognitionBatch[]> {
  const db = Taro.cloud.database();
  const skip = options.skip ?? 0;
  const limit = options.limit ?? RECOGNITION_HISTORY_PAGE_SIZE;

  const res = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .skip(skip)
    .limit(limit)
    .get();

  const batches = (res.data as Record<string, unknown>[]).map(normalizeBatch);
  return resolveBatchCovers(batches);
}

export async function fetchRecognitionBatchCount(): Promise<number> {
  const db = Taro.cloud.database();
  const res = await db.collection(COLLECTION).count();
  return res.total;
}

export async function fetchRecognitionBatchById(
  id: string,
): Promise<RecognitionBatch> {
  const db = Taro.cloud.database();
  const res = await db.collection(COLLECTION).doc(id).get({});
  const raw = res.data as Record<string, unknown> | undefined;

  if (!raw || !raw._id) {
    throw new Error("识别记录不存在或已被删除");
  }

  return resolveBatchCover(normalizeBatch(raw));
}

function triggerProcessRecognitionBatch(
  batchId: string,
  userGender: string | undefined,
): void {
  void Taro.cloud
    .callFunction({
      name: "process-recognition-batch",
      data: { batchId, userGender },
      config: { timeout: 300000 },
    } as Parameters<typeof Taro.cloud.callFunction>[0] & {
      config?: { timeout?: number };
    })
    .then((res) => {
      const result = res?.result as
        | { error?: string; message?: string }
        | undefined;
      if (result?.error) {
        void markRecognitionBatchFailed(
          batchId,
          normalizeRecognitionErrorMessage(
            result.message || result.error || "识别失败",
          ),
        );
      }
    })
    .catch((err) => {
      console.warn("[recognition-batch] process trigger failed", err);
      const message =
        err instanceof Error ? err.message : "识别服务调用失败";
      void markRecognitionBatchFailed(
        batchId,
        normalizeRecognitionErrorMessage(message),
      );
    });
}

/** 上传原图：每张图独立建批次并触发云端异步处理（不阻塞等待结果） */
export async function createRecognitionBatchAndStart(
  filePaths: string[],
): Promise<{ batchIds: string[] }> {
  if (filePaths.length === 0) {
    throw new Error("请选择图片");
  }

  const userGender = await resolveUserGenderForRecognition();
  const db = Taro.cloud.database();
  const batchIds: string[] = [];

  for (const filePath of filePaths) {
    const ext = filePath.includes(".")
      ? filePath.slice(filePath.lastIndexOf("."))
      : ".jpg";
    const cloudPath = `wardrobe/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const uploadRes = await Taro.cloud.uploadFile({
      cloudPath,
      filePath,
    });
    const fileID = uploadRes.fileID;
    const now = Date.now();
    const addRes = await db.collection(COLLECTION).add({
      data: {
        status: "processing",
        confirmStatus: "pending",
        sourceFileIds: [fileID],
        coverFileId: fileID,
        progress: { current: 0, total: 1 },
        itemCount: 0,
        items: [],
        createdAt: now,
        updatedAt: now,
      },
    });
    const batchId = String(addRes._id);
    batchIds.push(batchId);
    triggerProcessRecognitionBatch(batchId, userGender);
  }

  return { batchIds };
}

/** 将仍为 processing 的批次标记为失败（触发失败 / 超时兜底） */
export async function markRecognitionBatchFailed(
  batchId: string,
  errorMessage: string,
): Promise<void> {
  const db = Taro.cloud.database();
  try {
    const res = await db.collection(COLLECTION).doc(batchId).get({});
    const raw = res.data as Record<string, unknown> | undefined;
    if (!raw || String(raw.status) !== "processing") {
      return;
    }
    await db.collection(COLLECTION).doc(batchId).update({
      data: {
        status: "failed",
        errorMessage: errorMessage || "识别失败",
        updatedAt: Date.now(),
      },
    });
  } catch (err) {
    console.warn("[recognition-batch] mark failed", err);
  }
}

export async function updateRecognitionBatchItems(
  batchId: string,
  items: RecognizedPreviewItem[],
): Promise<void> {
  const db = Taro.cloud.database();
  await db.collection(COLLECTION).doc(batchId).update({
    data: {
      items: items.map(
        ({ tempId, name, typeName, tags, imageFileId, warmthLevel }) => ({
          tempId,
          name,
          typeName,
          tags,
          imageFileId,
          ...(warmthLevel !== undefined && { warmthLevel }),
        }),
      ),
      itemCount: items.length,
      updatedAt: Date.now(),
    },
  });
}

export async function confirmRecognitionBatch(
  batchId: string,
): Promise<void> {
  const db = Taro.cloud.database();
  const now = Date.now();
  await db.collection(COLLECTION).doc(batchId).update({
    data: {
      confirmStatus: "confirmed",
      confirmedAt: now,
      updatedAt: now,
    },
  });
}

export async function discardRecognitionBatch(
  batchId: string,
): Promise<void> {
  const db = Taro.cloud.database();
  await db.collection(COLLECTION).doc(batchId).update({
    data: {
      confirmStatus: "discarded",
      updatedAt: Date.now(),
    },
  });
}
