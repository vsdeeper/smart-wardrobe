import Taro from '@tarojs/taro'
import type { ClothingType, WardrobeItem } from '@/data/wardrobe'
import { WARDROBE_PAGE_SIZE } from '@/data/wardrobe'

export interface FetchWardrobeItemsOptions {
  typeId?: string | null
  skip: number
  limit?: number
}

export interface RecognizeClothingResult {
  item: WardrobeItem
  type: ClothingType
  isNewType: boolean
}

interface RecognizeClothingError {
  error: string
  message: string
}

type RecognizeCloudResult = RecognizeClothingResult | RecognizeClothingError

function isRecognizeError(
  result: RecognizeCloudResult,
): result is RecognizeClothingError {
  return 'error' in result && typeof result.error === 'string'
}

function normalizeCreatedAt(value: unknown): number {
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (value && typeof value === 'object' && 'getTime' in value) {
    return (value as Date).getTime()
  }
  return Date.now()
}

function normalizeWardrobeItem(raw: Record<string, unknown>): WardrobeItem {
  return {
    _id: String(raw._id ?? ''),
    name: String(raw.name ?? ''),
    typeId: String(raw.typeId ?? ''),
    typeName: String(raw.typeName ?? ''),
    imageFileId: String(raw.imageFileId ?? ''),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    createdAt: normalizeCreatedAt(raw.createdAt),
  }
}

function normalizeClothingType(raw: Record<string, unknown>): ClothingType {
  return {
    _id: String(raw._id ?? ''),
    name: String(raw.name ?? ''),
    itemCount: typeof raw.itemCount === 'number' ? raw.itemCount : 0,
  }
}

/** 查询当前用户的衣物类型列表 */
export async function fetchClothingTypes(): Promise<ClothingType[]> {
  const db = Taro.cloud.database()
  const res = await db
    .collection('clothing_types')
    .orderBy('itemCount', 'desc')
    .get()
  return (res.data as Record<string, unknown>[]).map(normalizeClothingType)
}

/** 分页查询衣橱单品，可选按类型过滤 */
export async function fetchWardrobeItems(
  options: FetchWardrobeItemsOptions,
): Promise<WardrobeItem[]> {
  const db = Taro.cloud.database()
  const limit = options.limit ?? WARDROBE_PAGE_SIZE
  const coll = db.collection('wardrobe_items')

  const query = options.typeId
    ? coll.where({ typeId: options.typeId })
    : coll

  const res = await query
    .orderBy('createdAt', 'desc')
    .skip(options.skip)
    .limit(limit)
    .get()

  const items = (res.data as Record<string, unknown>[]).map(normalizeWardrobeItem)
  return resolveImageUrls(items)
}

/** 批量解析云存储 fileID 为临时 HTTPS URL */
export async function resolveImageUrls(
  items: WardrobeItem[],
): Promise<WardrobeItem[]> {
  if (items.length === 0) return items

  const fileIds = [...new Set(items.map((item) => item.imageFileId).filter(Boolean))]
  if (fileIds.length === 0) return items

  const res = await Taro.cloud.getTempFileURL({ fileList: fileIds })
  const urlMap = new Map<string, string>()
  for (const file of res.fileList) {
    if (file.status === 0 && file.fileID) {
      urlMap.set(file.fileID, file.tempFileURL)
    }
  }

  return items.map((item) => ({
    ...item,
    imageUrl: urlMap.get(item.imageFileId) ?? item.imageUrl,
  }))
}

/** 上传图片并调用 AI 识别，写入云数据库 */
export async function uploadAndRecognize(
  filePath: string,
): Promise<RecognizeClothingResult> {
  const ext = filePath.includes('.') ? filePath.slice(filePath.lastIndexOf('.')) : '.jpg'
  const cloudPath = `wardrobe/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  const uploadRes = await Taro.cloud.uploadFile({
    cloudPath,
    filePath,
  })

  const { result } = await Taro.cloud.callFunction({
    name: 'recognize-clothing',
    data: { fileID: uploadRes.fileID },
  })

  const data = result as RecognizeCloudResult
  if (isRecognizeError(data)) {
    throw new Error(data.message || data.error)
  }

  const [itemWithUrl] = await resolveImageUrls([data.item])
  return {
    ...data,
    item: itemWithUrl ?? data.item,
  }
}

export interface BatchRecognizeProgress {
  current: number
  total: number
  phase: 'uploading' | 'recognizing'
}

export interface BatchRecognizeResult {
  succeeded: RecognizeClothingResult[]
  failed: { index: number; message: string }[]
}

/** 串行批量上传并识别，单张失败不影响后续 */
export async function uploadAndRecognizeBatch(
  filePaths: string[],
  onProgress?: (progress: BatchRecognizeProgress) => void,
): Promise<BatchRecognizeResult> {
  const total = filePaths.length
  const succeeded: RecognizeClothingResult[] = []
  const failed: { index: number; message: string }[] = []

  for (let i = 0; i < filePaths.length; i++) {
    const current = i + 1
    onProgress?.({ current, total, phase: 'uploading' })
    onProgress?.({ current, total, phase: 'recognizing' })

    try {
      const result = await uploadAndRecognize(filePaths[i])
      succeeded.push(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '识别失败'
      failed.push({ index: current, message })
    }
  }

  return { succeeded, failed }
}

/** 统计当前用户衣物总数 */
export async function fetchWardrobeItemCount(): Promise<number> {
  const db = Taro.cloud.database()
  const res = await db.collection('wardrobe_items').count()
  return res.total
}
