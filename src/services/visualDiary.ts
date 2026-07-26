import Taro from "@tarojs/taro";
import { VISUAL_DIARY_PAGE_SIZE } from "@/data/tryOn";
import type { WeatherSnapshot } from "@/data/weather";
import type { VisualDiaryEntry } from "@/data/tryOn";
import { isEphemeralExternalImageUrl } from "@/utils/imageUrl";

export interface SaveVisualDiaryInput {
  title: string;
  description: string;
  coverFileId?: string;
  coverUrl?: string;
  pieceIds: string[];
  weatherSnapshot?: WeatherSnapshot;
}

export interface FetchVisualDiaryEntriesOptions {
  skip?: number;
  limit?: number;
}

function normalizeEntry(raw: Record<string, unknown>): VisualDiaryEntry {
  const createdAt =
    typeof raw.createdAt === "number"
      ? raw.createdAt
      : raw.createdAt instanceof Date
        ? raw.createdAt.getTime()
        : Date.now();

  return {
    _id: raw._id ? String(raw._id) : undefined,
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    coverFileId:
      typeof raw.coverFileId === "string" ? raw.coverFileId : undefined,
    coverUrl: typeof raw.coverUrl === "string" ? raw.coverUrl : undefined,
    pieceIds: Array.isArray(raw.pieceIds) ? raw.pieceIds.map(String) : [],
    weatherSnapshot:
      raw.weatherSnapshot &&
      typeof raw.weatherSnapshot === "object"
        ? (raw.weatherSnapshot as WeatherSnapshot)
        : undefined,
    createdAt,
  };
}

async function resolveCoverUrl(
  entry: VisualDiaryEntry,
): Promise<VisualDiaryEntry> {
  if (entry.coverFileId) {
    const res = await Taro.cloud.getTempFileURL({
      fileList: [entry.coverFileId],
    });
    const file = res.fileList[0];
    if (file?.status === 0 && file.tempFileURL) {
      return { ...entry, coverUrl: file.tempFileURL };
    }
    return { ...entry, coverUrl: undefined };
  }
  if (entry.coverUrl && isEphemeralExternalImageUrl(entry.coverUrl)) {
    return { ...entry, coverUrl: undefined };
  }
  return entry;
}

async function resolveCoverUrls(
  entries: VisualDiaryEntry[],
): Promise<VisualDiaryEntry[]> {
  return Promise.all(entries.map(resolveCoverUrl));
}

export async function saveVisualDiaryEntry(
  input: SaveVisualDiaryInput,
): Promise<VisualDiaryEntry> {
  const db = Taro.cloud.database();
  const now = db.serverDate();
  const data: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim(),
    pieceIds: input.pieceIds,
    weatherSnapshot: input.weatherSnapshot ?? null,
    createdAt: now,
  };

  if (input.coverFileId) {
    data.coverFileId = input.coverFileId;
  }
  if (input.coverUrl) {
    data.coverUrl = input.coverUrl;
  }

  const addRes = await db.collection("visual_diary").add({ data });
  const entry = normalizeEntry({
    _id: addRes._id,
    ...data,
    createdAt: Date.now(),
  });
  return resolveCoverUrl(entry);
}

export async function fetchVisualDiaryEntries(
  options: FetchVisualDiaryEntriesOptions = {},
): Promise<VisualDiaryEntry[]> {
  const db = Taro.cloud.database();
  const skip = options.skip ?? 0;
  const limit = options.limit ?? VISUAL_DIARY_PAGE_SIZE;

  const res = await db
    .collection("visual_diary")
    .orderBy("createdAt", "desc")
    .skip(skip)
    .limit(limit)
    .get();

  const entries = (res.data as Record<string, unknown>[]).map(normalizeEntry);
  return resolveCoverUrls(entries);
}

export async function fetchVisualDiaryEntryById(
  id: string,
): Promise<VisualDiaryEntry> {
  const db = Taro.cloud.database();
  const res = await db.collection("visual_diary").doc(id).get({});
  const raw = res.data as Record<string, unknown> | undefined;

  if (!raw || !raw._id) {
    throw new Error("穿搭记录不存在或已被删除");
  }

  return resolveCoverUrl(normalizeEntry(raw));
}

export async function deleteVisualDiaryEntry(id: string): Promise<void> {
  const db = Taro.cloud.database();
  await db.collection("visual_diary").doc(id).remove({});
}

export async function fetchVisualDiaryCount(): Promise<number> {
  const db = Taro.cloud.database();
  const res = await db.collection("visual_diary").count();
  return res.total;
}
