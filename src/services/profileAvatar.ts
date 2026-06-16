import Taro from "@tarojs/taro";
import { resolveCloudFileUrl } from "@/services/wardrobe";

export async function uploadAvatar(filePath: string): Promise<string> {
  const ext = filePath.includes(".")
    ? filePath.slice(filePath.lastIndexOf("."))
    : ".jpg";
  const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const uploadRes = await Taro.cloud.uploadFile({
    cloudPath,
    filePath,
  });

  return uploadRes.fileID;
}

export async function resolveAvatarUrl(
  fileId?: string,
): Promise<string | null> {
  if (!fileId?.trim()) return null;
  return resolveCloudFileUrl(fileId);
}
