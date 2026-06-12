import Taro from "@tarojs/taro";
import type { WeatherSnapshot } from "@/data/weather";
import type { VisualDiaryEntry } from "@/data/tryOn";

export interface SaveVisualDiaryInput {
  title: string;
  description: string;
  coverFileId?: string;
  coverUrl?: string;
  pieceIds: string[];
  matchScore?: number;
  weatherSnapshot?: WeatherSnapshot;
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
    matchScore:
      typeof raw.matchScore === "number" ? raw.matchScore : undefined,
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
  if (entry.coverUrl || !entry.coverFileId) return entry;
  const res = await Taro.cloud.getTempFileURL({
    fileList: [entry.coverFileId],
  });
  const file = res.fileList[0];
  if (file?.status === 0 && file.tempFileURL) {
    return { ...entry, coverUrl: file.tempFileURL };
  }
  return entry;
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
    matchScore: input.matchScore ?? null,
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
  limit = 20,
): Promise<VisualDiaryEntry[]> {
  const db = Taro.cloud.database();
  const res = await db
    .collection("visual_diary")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const entries = (res.data as Record<string, unknown>[]).map(normalizeEntry);
  return Promise.all(entries.map(resolveCoverUrl));
}
