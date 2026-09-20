export type ForecastDay = {
  date: string
  weatherCode: number
  high: number
  low: number
}

export type Forecast = {
  location: string
  temperature: number
  weatherCode: number
  unit: string
  days: ForecastDay[]
}

type OpenMeteoForecast = {
  current?: {
    temperature_2m?: number
    weather_code?: number
  }
  daily?: {
    time?: string[]
    weather_code?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
  }
  daily_units?: {
    temperature_2m_max?: string
  }
}

type OpenMeteoGeo = {
  results?: Array<{
    name?: string
    admin1?: string
    country?: string
  }>
}

function formatLocation(geo: OpenMeteoGeo) {
  const place = geo.results?.[0]
  if (!place?.name) return 'Local'
  return [place.name, place.admin1].filter(Boolean).join(', ')
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
  unit: 'celsius' | 'fahrenheit',
): Promise<Forecast> {
  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
  forecastUrl.searchParams.set('latitude', String(latitude))
  forecastUrl.searchParams.set('longitude', String(longitude))
  forecastUrl.searchParams.set('current', 'temperature_2m,weather_code')
  forecastUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min')
  forecastUrl.searchParams.set('timezone', 'auto')
  forecastUrl.searchParams.set('forecast_days', '5')
  forecastUrl.searchParams.set('temperature_unit', unit)

  const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/reverse')
  geoUrl.searchParams.set('latitude', String(latitude))
  geoUrl.searchParams.set('longitude', String(longitude))
  geoUrl.searchParams.set('language', 'en')
  geoUrl.searchParams.set('format', 'json')

  const [forecastResponse, geoResponse] = await Promise.all([
    fetch(forecastUrl),
    fetch(geoUrl),
  ])

  if (!forecastResponse.ok) {
    throw new Error('Could not load the forecast.')
  }

  const data = (await forecastResponse.json()) as OpenMeteoForecast
  const geo = geoResponse.ok ? ((await geoResponse.json()) as OpenMeteoGeo) : {}
  const days = data.daily?.time ?? []

  return {
    location: formatLocation(geo),
    temperature: Math.round(data.current?.temperature_2m ?? 0),
    weatherCode: data.current?.weather_code ?? 0,
    unit: data.daily_units?.temperature_2m_max === '°F' ? 'F' : 'C',
    days: days.map((date, index) => ({
      date,
      weatherCode: data.daily?.weather_code?.[index] ?? 0,
      high: Math.round(data.daily?.temperature_2m_max?.[index] ?? 0),
      low: Math.round(data.daily?.temperature_2m_min?.[index] ?? 0),
    })),
  }
}
