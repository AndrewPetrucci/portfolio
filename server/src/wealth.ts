export type WealthSharePoint = {
  date: string
  quarter: string
  bottom50: number
  next40: number
  next9: number
  top1: number
}

export type WealthLatest = {
  quarter: string
  bottom50: number
  next40: number
  next9: number
  top1: number
}

export type WealthDistribution = {
  source: string
  start: string
  end: string
  latest: WealthLatest
  points: WealthSharePoint[]
}

const CSV_URL =
  'https://www.federalreserve.gov/releases/z1/dataviz/download/dfa-networth-shares.csv'
const CACHE_MS = 6 * 60 * 60 * 1000

const CATEGORIES = ['TopPt1', 'RemainingTop1', 'Next9', 'Next40', 'Bottom50'] as const
type Category = (typeof CATEGORIES)[number]

type QuarterRow = Partial<Record<Category, number>>

let cache: { at: number; data: WealthDistribution } | null = null

function roundShare(value: number) {
  return Math.round(value * 10) / 10
}

function quarterToDate(quarter: string) {
  const match = /^(\d{4}):Q([1-4])$/.exec(quarter)
  if (!match) return null
  const month = String((Number(match[2]) - 1) * 3 + 1).padStart(2, '0')
  return `${match[1]}-${month}-01`
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  const header = lines.shift()?.split(',') ?? []
  const dateIndex = header.indexOf('Date')
  const categoryIndex = header.indexOf('Category')
  const shareIndex = header.indexOf('Net worth')

  if (dateIndex < 0 || categoryIndex < 0 || shareIndex < 0) {
    throw new Error('Could not load wealth distribution.')
  }

  const byQuarter = new Map<string, QuarterRow>()

  for (const line of lines) {
    if (!line) continue
    const cells = line.split(',')
    const quarter = cells[dateIndex]?.trim()
    const category = cells[categoryIndex]?.trim() as Category
    const share = Number(cells[shareIndex])
    if (!quarter || !CATEGORIES.includes(category) || !Number.isFinite(share)) continue
    const row = byQuarter.get(quarter) ?? {}
    row[category] = share
    byQuarter.set(quarter, row)
  }

  const points: WealthSharePoint[] = []

  for (const [quarter, row] of byQuarter) {
    const date = quarterToDate(quarter)
    if (
      !date ||
      row.Bottom50 == null ||
      row.Next40 == null ||
      row.Next9 == null ||
      row.TopPt1 == null ||
      row.RemainingTop1 == null
    ) {
      continue
    }

    points.push({
      date,
      quarter,
      bottom50: roundShare(row.Bottom50),
      next40: roundShare(row.Next40),
      next9: roundShare(row.Next9),
      top1: roundShare(row.TopPt1 + row.RemainingTop1),
    })
  }

  points.sort((a, b) => a.date.localeCompare(b.date))
  return points
}

export async function fetchWealthDistribution(): Promise<WealthDistribution> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data
  }

  const response = await fetch(CSV_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!response.ok) {
    throw new Error('Could not load wealth distribution.')
  }

  const points = parseCsv(await response.text())
  const first = points[0]
  const last = points[points.length - 1]

  if (!first || !last) {
    throw new Error('Could not load wealth distribution.')
  }

  const data: WealthDistribution = {
    source: 'Fed DFA',
    start: first.quarter,
    end: last.quarter,
    latest: {
      quarter: last.quarter,
      bottom50: last.bottom50,
      next40: last.next40,
      next9: last.next9,
      top1: last.top1,
    },
    points,
  }

  cache = { at: Date.now(), data }
  return data
}
