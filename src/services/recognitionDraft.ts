import type { RecognizedPreviewItem } from '@/data/wardrobe'

let draft: RecognizedPreviewItem[] | null = null

/** 衣橱页识别成功后写入预览草稿 */
export function setRecognitionDraft(items: RecognizedPreviewItem[]): void {
  draft = items
}

/** 识别页读取并清空草稿（单次消费） */
export function consumeRecognitionDraft(): RecognizedPreviewItem[] | null {
  const value = draft
  draft = null
  return value
}

/** 读取草稿但不消费（用于 unload 清理等场景） */
export function peekRecognitionDraft(): RecognizedPreviewItem[] | null {
  return draft
}

/** 主动清空草稿 */
export function clearRecognitionDraft(): void {
  draft = null
}
