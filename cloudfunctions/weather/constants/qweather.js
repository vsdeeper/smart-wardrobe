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

const DEFAULT_QWEATHER_HOST = 'https://devapi.qweather.com'

module.exports = { QWEATHER_ICON_MAP, DEFAULT_QWEATHER_HOST }
