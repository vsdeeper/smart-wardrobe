const {
  QWEATHER_ICON_MAP,
  DEFAULT_QWEATHER_HOST,
} = require('../constants/qweather')

function mapQWeatherIcon(iconCode) {
  const code = Number(iconCode)
  if (Number.isNaN(code)) return 'sunny'
  for (const [min, max, condition] of QWEATHER_ICON_MAP) {
    if (code >= min && code <= max) return condition
  }
  if (code >= 900 && code <= 901) return 'windy'
  return 'sunny'
}

function normalizeHost(host, fallback = DEFAULT_QWEATHER_HOST) {
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

function buildCurrentWeatherV1Url(host, latitude, longitude) {
  const lat = Number(latitude).toFixed(2)
  const lng = Number(longitude).toFixed(2)
  return `${host}/weather/v1/current/${lat}/${lng}`
}

function buildDailyWeatherV1Url(host, latitude, longitude, days) {
  const lat = Number(latitude).toFixed(2)
  const lng = Number(longitude).toFixed(2)
  return buildUrl(host, `/weather/v1/daily/${lat}/${lng}`, {
    days,
    localTime: 'true',
  })
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

function getDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWearDateOffset(dateKey, todayKey = getDateKey()) {
  const parse = (key) => {
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
  }
  return Math.round((parse(dateKey) - parse(todayKey)) / (24 * 60 * 60 * 1000))
}

/** 解析 Current Weather v1 响应 */
function parseCurrentWeatherV1(res, city, district, aqi, dateKey) {
  return {
    city,
    district,
    dateKey,
    conditionCode: mapQWeatherIcon(res.condition && res.condition.code),
    temperature: Math.round(Number(res.temperature && res.temperature.value) || 0),
    humidity: Math.round((Number(res.humidity) || 0) * 100),
    aqi,
  }
}

/** 解析 Daily Forecast v1 单日白天段 */
function parseDailyWeatherV1Day(day, city, district, aqi, dateKey) {
  const daytime = day && day.daytime
  const tempMax =
    (daytime && daytime.temperatureMax && daytime.temperatureMax.value) ??
    (day && day.temperatureMax && day.temperatureMax.value) ??
    0
  const humidityRaw =
    (daytime && daytime.humidity) ?? (day && day.daytime && day.daytime.humidity) ?? 0
  const conditionCode =
    daytime && daytime.condition ? daytime.condition.code : '100'

  return {
    city,
    district,
    dateKey,
    conditionCode: mapQWeatherIcon(conditionCode),
    temperature: Math.round(Number(tempMax) || 0),
    humidity: Math.round(Number(humidityRaw) * 100),
    aqi,
  }
}

async function fetchGeoCity(apiHost, latitude, longitude, apiKey) {
  const coordQuery = `${longitude},${latitude}`
  const geoRes = await fetchJson(
    buildUrl(apiHost, '/geo/v2/city/lookup', { location: coordQuery }),
    apiKey,
  )
  const loc = geoRes.location && geoRes.location[0]
  return parseGeoLocation(loc)
}

/**
 * 按 dateKey 拉取单日天气快照。
 * 今天：v1 current；非今天：v1 daily?days=offset+1 取对应条目。
 */
async function fetchWeatherForDateKey(latitude, longitude, dateKey) {
  const apiKey = process.env.QWEATHER_API_KEY
  if (!apiKey) {
    return { error: 'CONFIG_ERROR', message: '未配置 QWEATHER_API_KEY 环境变量' }
  }

  const apiHost = normalizeHost(process.env.QWEATHER_API_HOST)
  const todayKey = getDateKey()
  const targetKey = dateKey || todayKey
  const offset = getWearDateOffset(targetKey, todayKey)

  if (offset < 0 || offset >= 7) {
    return {
      error: 'WEATHER_DATE_OUT_OF_RANGE',
      message: '所选日期超出预报范围',
    }
  }

  try {
    const { city, district } = await fetchGeoCity(
      apiHost,
      latitude,
      longitude,
      apiKey,
    )
    const aqi = await fetchAirV1Aqi(apiHost, latitude, longitude, apiKey)

    if (offset === 0) {
      const currentRes = await fetchJson(
        buildCurrentWeatherV1Url(apiHost, latitude, longitude),
        apiKey,
      )
      return parseCurrentWeatherV1(
        currentRes,
        city,
        district,
        aqi,
        targetKey,
      )
    }

    const days = offset + 1
    const dailyRes = await fetchJson(
      buildDailyWeatherV1Url(apiHost, latitude, longitude, days),
      apiKey,
    )
    const dayList = (dailyRes && dailyRes.days) || []
    const day = dayList[offset]
    if (!day) {
      return {
        error: 'WEATHER_DATE_OUT_OF_RANGE',
        message: '未能获取该日预报',
      }
    }
    return parseDailyWeatherV1Day(day, city, district, aqi, targetKey)
  } catch (err) {
    return {
      error: 'FETCH_FAILED',
      message: err && err.message ? err.message : '请求和风天气失败',
    }
  }
}

/** 实时天气（供非试穿场景）；走 v1 current，不用已弃用 v7/now */
async function fetchWeatherSnapshot(latitude, longitude) {
  return fetchWeatherForDateKey(latitude, longitude, getDateKey())
}

module.exports = {
  mapQWeatherIcon,
  normalizeHost,
  fetchWeatherSnapshot,
  fetchWeatherForDateKey,
  getDateKey,
}
