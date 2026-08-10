function buildProviderConfig() {
  return {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_API_BASE_URL,
      model: process.env.DEEPSEEK_MODEL,
    },
    doubao: {
      apiKey: process.env.DOUBAO_API_KEY,
      baseUrl: process.env.DOUBAO_API_BASE_URL,
      model: process.env.DOUBAO_MODEL,
    },
  }
}

module.exports = { buildProviderConfig }
