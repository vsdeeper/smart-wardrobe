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

function buildUrl(host, path, params) {
  const parts = Object.entries(params).map(
    ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
  )
  return parts.length ? `${host}${path}?${parts.join('&')}` : `${host}${path}`
}

function buildAirCurrentUrl(host, latitude, longitude) {
  return `${host}/airquality/v1/current/${latitude}/${longitude}`
}

function parseAirV1Aqi(airRes) {
  const indexes = (airRes && airRes.indexes) || []
  const cn = indexes.find(
    (item) => item.code === 'cn-mee' || item.code === 'cn-mee-1h',
  )
  const raw = cn && cn.aqi != null ? Number(cn.aqi) : NaN
  return Number.isNaN(raw) ? 0 : Math.round(raw)
}

async function fetchJson(url, apiKey) {
  const res = await fetch(url, {
    headers: { 'X-QW-Api-Key': apiKey },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200) || 'empty body'}`)
  }
  if (!text) {
    throw new Error('和风 API 返回空响应')
  }
  return JSON.parse(text)
}

function parseGeoLocation(loc) {
  if (!loc) {
    return { city: '当前位置', district: '' }
  }
  const city = loc.adm2 || loc.name || '当前位置'
  const district =
    loc.adm3 ||
    (loc.name && loc.adm2 && loc.name !== loc.adm2 ? loc.name : '') ||
    ''
  return { city, district }
}

async function fetchAirV1Aqi(apiHost, latitude, longitude, apiKey) {
  try {
    const airRes = await fetchJson(
      buildAirCurrentUrl(apiHost, latitude, longitude),
      apiKey,
    )
    return parseAirV1Aqi(airRes)
  } catch {
    return 0
  }
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
  const coordQuery = `${longitude},${latitude}`

  try {
    const geoRes = await fetchJson(
      buildUrl(apiHost, '/geo/v2/city/lookup', { location: coordQuery }),
      apiKey,
    )

    const loc = geoRes.location && geoRes.location[0]
    const locationId = loc && loc.id
    const { city, district } = parseGeoLocation(loc)
    const weatherLocation = locationId || coordQuery

    const [weatherRes, aqi] = await Promise.all([
      fetchJson(
        buildUrl(apiHost, '/v7/weather/now', { location: weatherLocation }),
        apiKey,
      ),
      fetchAirV1Aqi(apiHost, latitude, longitude, apiKey),
    ])

    if (weatherRes.code !== '200' || !weatherRes.now) {
      return {
        error: 'WEATHER_API_ERROR',
        message: weatherRes.code || '天气接口返回异常',
      }
    }

    return {
      city,
      district,
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
