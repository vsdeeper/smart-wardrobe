const cloud = require('wx-server-sdk')
const { fetchWeatherSnapshot, fetchWeatherForDateKey } = require('./utils/qweather')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { latitude, longitude, dateKey } = event || {}

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { error: 'INVALID_PARAMS', message: '缺少 latitude / longitude' }
  }

  try {
    const result =
      typeof dateKey === 'string' && dateKey
        ? await fetchWeatherForDateKey(latitude, longitude, dateKey)
        : await fetchWeatherSnapshot(latitude, longitude)
    if (result.error) {
      return result
    }
    return result
  } catch (err) {
    return {
      error: 'FETCH_FAILED',
      message: err && err.message ? err.message : '请求和风天气失败',
    }
  }
}
