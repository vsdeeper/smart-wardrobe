import Taro from "@tarojs/taro";
import { CLOUD_TEMP_URL_MAX_AGE_S, CLOUD_TEMP_URL_TTL_MS } from "@/config/cloud";

/** getTempFileURL 单次调用的文件数上限 */
const TEMP_URL_BATCH_SIZE = 50;

/** 带云存储图片字段的数据项（WardrobeItem、RecognizedPreviewItem 等通用） */
export interface CloudImageItem {
  imageFileId: string;
  imageUrl?: string;
  /** imageUrl 的生成时刻，用于判断该链接是否仍在有效期内 */
  imageUrlAt?: number;
}

/** 单个图片临时链接及其生成时刻 */
export interface ResolvedImageUrl {
  url: string;
  at: number;
}

/** 判断某个 imageUrl 的生成时刻是否仍在有效期内 */
export function isImageUrlFresh(at: number | undefined): boolean {
  if (!at) return false;
  return Date.now() - at < CLOUD_TEMP_URL_TTL_MS;
}

/**
 * 构造 getTempFileURL 的 fileList，显式指定有效期而非依赖平台默认值。
 * 微信支持 { fileID, maxAge } 对象形式，但 Taro 类型只声明了 string[]，故此处收敛断言。
 */
function toTempUrlFileList(fileIds: string[]): string[] {
  return fileIds.map((fileID) => ({
    fileID,
    maxAge: CLOUD_TEMP_URL_MAX_AGE_S,
  })) as unknown as string[];
}

/**
 * 批量把云存储 fileID 换成临时 HTTPS 链接：自动去重、按上限分批。
 * knownUrls 中已有的 fileID 直接复用，不再请求——临时链接每次签名都不同，
 * 复用可避免 src 变化导致的图片重新加载（闪图）。
 */
export async function resolveTempFileUrls(
  fileIds: string[],
  knownUrls?: Map<string, ResolvedImageUrl>,
): Promise<Map<string, ResolvedImageUrl>> {
  const urlMap = new Map(knownUrls ?? []);
  const pending = [...new Set(fileIds.filter((id) => id && !urlMap.has(id)))];

  for (let i = 0; i < pending.length; i += TEMP_URL_BATCH_SIZE) {
    const chunk = pending.slice(i, i + TEMP_URL_BATCH_SIZE);
    const res = await Taro.cloud.getTempFileURL({
      fileList: toTempUrlFileList(chunk),
    });
    for (const file of res.fileList) {
      if (file.status === 0 && file.fileID) {
        urlMap.set(file.fileID, { url: file.tempFileURL, at: Date.now() });
      }
    }
  }

  return urlMap;
}

/** 为列表补齐图片临时链接，解析失败的项保留原有 imageUrl */
export async function attachImageUrls<T extends CloudImageItem>(
  items: T[],
  knownUrls?: Map<string, ResolvedImageUrl>,
): Promise<T[]> {
  if (items.length === 0) return items;

  const urlMap = await resolveTempFileUrls(
    items.map((item) => item.imageFileId),
    knownUrls,
  );

  return items.map((item) => {
    const resolved = urlMap.get(item.imageFileId);
    return {
      ...item,
      imageUrl: resolved?.url ?? item.imageUrl,
      imageUrlAt: resolved?.at ?? item.imageUrlAt,
    };
  });
}

/** 收集列表中仍新鲜的图片链接，供刷新时复用；已过期的不收集，交由下次请求重新解析 */
export function collectImageUrls<T extends CloudImageItem>(
  items: T[],
): Map<string, ResolvedImageUrl> {
  const urlMap = new Map<string, ResolvedImageUrl>();
  for (const item of items) {
    if (item.imageFileId && item.imageUrl && isImageUrlFresh(item.imageUrlAt)) {
      urlMap.set(item.imageFileId, { url: item.imageUrl, at: item.imageUrlAt! });
    }
  }
  return urlMap;
}

/** 单个云存储 fileID 解析为临时 HTTPS 链接 */
export async function resolveCloudFileUrl(
  fileId: string,
): Promise<string | null> {
  const id = fileId.trim();
  if (!id) return null;

  const urlMap = await resolveTempFileUrls([id]);
  return urlMap.get(id)?.url ?? null;
}
