import Taro from '@tarojs/taro'

/** 支持的大模型 Provider */
export type LLMProvider = 'deepseek' | 'doubao'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatWithLLMOptions {
  /** 默认使用云函数 LLM_DEFAULT_PROVIDER 环境变量 */
  provider?: LLMProvider
  /** 覆盖 Provider 默认模型 */
  model?: string
}

export interface ChatWithLLMResult {
  provider: string
  model: string
  content: string
  usage: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  } | null
}

export interface ChatWithLLMError {
  error: string
  message: string
  provider?: string
  model?: string
}

type ChatCloudResult = ChatWithLLMResult | ChatWithLLMError

function isChatError(result: ChatCloudResult): result is ChatWithLLMError {
  return 'error' in result && typeof result.error === 'string'
}

/**
 * 调用 chat 云函数，转发至 DeepSeek 或豆包大模型。
 *
 * @example
 * // 默认 DeepSeek
 * const res = await chatWithLLM([{ role: 'user', content: '你好' }])
 *
 * @example
 * // 指定豆包
 * const res = await chatWithLLM(
 *   [{ role: 'user', content: '用三句话介绍秋季穿搭' }],
 *   { provider: 'doubao' }
 * )
 */
export async function chatWithLLM(
  messages: ChatMessage[],
  options?: ChatWithLLMOptions
): Promise<ChatWithLLMResult> {
  const { result } = await Taro.cloud.callFunction({
    name: 'chat',
    data: {
      provider: options?.provider,
      model: options?.model,
      messages,
    },
  })

  const data = result as ChatCloudResult

  if (isChatError(data)) {
    throw new Error(data.message || data.error)
  }

  return data
}
