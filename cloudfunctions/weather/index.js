const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const QWEATHER_ICON_MAP = [
  [100, 100, 'sunny'],
  [150, 150, 'sunny'],
  [101, 103, 'cloudy'],
  [104, 104, 'overcast'],
  [151, 153, 'cloudy'],
  [300, 399, 'rainy'],
  [400, 499, 'snowy'],
  [500, 515, 'foggy'],
  [302, 302, 'thunderstorm'],
]

function mapQWeatherIcon(iconCode) {
  const code = Number(iconCode)
  if (Number.isNaN(code)) return 'sunny'
  for (const [min, max, condition] of QWEATHER_ICON_MAP) {
    if (code >= min && code <= max) return condition
  }
  if (code >= 900 && code <= 901) return 'windy'
  return 'sunny'
}

function normalizeHost(host, fallback) {
  const trimmed = (host || '').trim()
  if (!trimmed) return fallback.replace(/\/+$/, '')
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    return `${url.protocol}//${url.host}`
  } catch {
    return fallback.replace(/\/+$/, '')
  }
}

function buildUrl(host, path, key, params) {
  const parts = Object.entries({ ...params, key }).map(
    ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
  )
  return `${host}${path}?${parts.join('&')}`
}

async function fetchJson(url) {
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200) || 'empty body'}`)
  }
  if (!text) {
    throw new Error('和风 API 返回空响应')
  }
  return JSON.parse(text)
}

exports.main = async (event) => {
  const { latitude, longitude } = event || {}

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { error: 'INVALID_PARAMS', message: '缺少 latitude / longitude' }
  }

  const apiKey = process.env.QWEATHER_API_KEY
  if (!apiKey) {
    return { error: 'CONFIG_ERROR', message: '未配置 QWEATHER_API_KEY 环境变量' }
  }

  const apiHost = normalizeHost(
    process.env.QWEATHER_API_HOST,
    'https://devapi.qweather.com',
  )
  const location = `${longitude},${latitude}`

  try {
    const [weatherRes, airRes, geoRes] = await Promise.all([
      fetchJson(buildUrl(apiHost, '/v7/weather/now', apiKey, { location })),
      fetchJson(buildUrl(apiHost, '/v7/air/now', apiKey, { location })),
      fetchJson(buildUrl(apiHost, '/geo/v2/city/lookup', apiKey, { location })),
    ])

    if (weatherRes.code !== '200' || !weatherRes.now) {
      return {
        error: 'WEATHER_API_ERROR',
        message: weatherRes.code || '天气接口返回异常',
      }
    }

    const loc = geoRes.location && geoRes.location[0]
    const city = (loc && loc.name) || (loc && loc.adm2) || '当前位置'

    const aqiRaw = airRes.now && airRes.now.aqi != null ? Number(airRes.now.aqi) : NaN
    const aqi = Number.isNaN(aqiRaw) ? 0 : aqiRaw

    return {
      city,
      conditionCode: mapQWeatherIcon(weatherRes.now.icon),
      temperature: Number(weatherRes.now.temp) || 0,
      humidity: Number(weatherRes.now.humidity) || 0,
      aqi,
    }
  } catch (err) {
    return {
      error: 'FETCH_FAILED',
      message: err && err.message ? err.message : '请求和风天气失败',
    }
  }
}
