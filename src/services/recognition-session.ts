import { RecognizedPreviewItem } from "@/types/wardrobe";


let session: RecognizedPreviewItem[] | null = null;

/** 识别页加载草稿后初始化会话 */
export function initRecognitionSession(items: RecognizedPreviewItem[]): void {
  session = items.map((item) => ({ ...item }));
}

/** 返回当前列表快照 */
export function getRecognitionSession(): RecognizedPreviewItem[] {
  return session ?? [];
}

/** 编辑页按 tempId 取单条 */
export function getRecognitionSessionItem(
  tempId: string,
): RecognizedPreviewItem | undefined {
  return session?.find((item) => item.tempId === tempId);
}

/** 编辑保存后写回 */
export function updateRecognitionSessionItem(item: RecognizedPreviewItem): void {
  if (!session) return;
  session = session.map((existing) =>
    existing.tempId === item.tempId ? { ...item } : existing,
  );
}

/** 确认/放弃/unload 时清理 */
export function clearRecognitionSession(): void {
  session = null;
}
