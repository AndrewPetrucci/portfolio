export type OilPoint = {
  date: string
  price: number
}

export type OilPrices = {
  symbol: string
  latest: number
  first: number
  start: string
  end: string
  markerDate: string
  points: OilPoint[]
}

const CHART_START = '2026-02-01'
const WAR_START = '2026-02-28'

type YahooChart = {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
        }>
      }
    }>
    error?: { description?: string } | null
  }
}

function dayStamp(unixSeconds: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(unixSeconds * 1000))
}

export async function fetchOilPrices(): Promise<OilPrices> {
  const period1 = Math.floor(Date.parse(`${CHART_START}T00:00:00.000Z`) / 1000)
  const period2 = Math.floor(Date.now() / 1000) + 86_400
  const url = new URL('https://query1.finance.yahoo.com/v8/finance/chart/CL=F')
  url.searchParams.set('period1', String(period1))
  url.searchParams.set('period2', String(period2))
  url.searchParams.set('interval', '1d')

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!response.ok) {
    throw new Error('Could not load oil prices.')
  }

  const data = (await response.json()) as YahooChart
  const result = data.chart?.result?.[0]
  const timestamps = result?.timestamp ?? []
  const closes = result?.indicators?.quote?.[0]?.close ?? []

  const points = timestamps.flatMap((unix, index) => {
    const price = closes[index]
    if (typeof price !== 'number' || !Number.isFinite(price)) return []
    const date = dayStamp(unix)
    if (date < CHART_START) return []
    return [{ date, price: Math.round(price * 100) / 100 }]
  })

  if (points.length < 2) {
    throw new Error('Could not load oil prices.')
  }

  return {
    symbol: 'CL=F',
    latest: points[points.length - 1].price,
    first: points[0].price,
    start: points[0].date,
    end: points[points.length - 1].date,
    markerDate: WAR_START,
    points,
  }
}
