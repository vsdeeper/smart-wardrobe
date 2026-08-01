import Taro from "@tarojs/taro";
import { CLOUD_TEMP_URL_MAX_AGE_S } from "@/config/cloud";

/** getTempFileURL 单次调用的文件数上限 */
const TEMP_URL_BATCH_SIZE = 50;

/** 带云存储图片字段的数据项（WardrobeItem、RecognizedPreviewItem 等通用） */
export interface CloudImageItem {
  imageFileId: string;
  imageUrl?: string;
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
  knownUrls?: Map<string, string>,
): Promise<Map<string, string>> {
  const urlMap = new Map(knownUrls ?? []);
  const pending = [...new Set(fileIds.filter((id) => id && !urlMap.has(id)))];

  for (let i = 0; i < pending.length; i += TEMP_URL_BATCH_SIZE) {
    const chunk = pending.slice(i, i + TEMP_URL_BATCH_SIZE);
    const res = await Taro.cloud.getTempFileURL({
      fileList: toTempUrlFileList(chunk),
    });
    for (const file of res.fileList) {
      if (file.status === 0 && file.fileID) {
        urlMap.set(file.fileID, file.tempFileURL);
      }
    }
  }

  return urlMap;
}

/** 为列表补齐图片临时链接，解析失败的项保留原有 imageUrl */
export async function attachImageUrls<T extends CloudImageItem>(
  items: T[],
  knownUrls?: Map<string, string>,
): Promise<T[]> {
  if (items.length === 0) return items;

  const urlMap = await resolveTempFileUrls(
    items.map((item) => item.imageFileId),
    knownUrls,
  );

  return items.map((item) => ({
    ...item,
    imageUrl: urlMap.get(item.imageFileId) ?? item.imageUrl,
  }));
}

/** 收集列表中已有的图片链接，供刷新时复用 */
export function collectImageUrls<T extends CloudImageItem>(
  items: T[],
): Map<string, string> {
  const urlMap = new Map<string, string>();
  for (const item of items) {
    if (item.imageFileId && item.imageUrl) {
      urlMap.set(item.imageFileId, item.imageUrl);
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
  return urlMap.get(id) ?? null;
}
