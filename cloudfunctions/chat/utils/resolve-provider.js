const { requireEnv } = require('./env')
const { buildProviderConfig } = require('../constants/providers')
function resolveProvider(name) {
  const PROVIDERS = buildProviderConfig()
  const provider = name || requireEnv('LLM_DEFAULT_PROVIDER')
  const config = PROVIDERS[provider]
  if (!config) {
    return { error: `不支持的 provider: ${provider}，可选 deepseek | doubao` }
  }
  if (!config.apiKey) {
    return {
      error: `未配置 ${provider === 'deepseek' ? 'DEEPSEEK' : 'DOUBAO'}_API_KEY 环境变量`,
      provider,
    }
  }
  if (provider === 'doubao' && !config.model) {
    return { error: '未配置 DOUBAO_MODEL 环境变量（方舟模型 ID）', provider }
  }
  return { provider, config }
}

module.exports = { resolveProvider }
