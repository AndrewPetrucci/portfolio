export type SocialLink = {
  label: string
  href: string
}

export type SkillGroup = {
  group: string
  items: string[]
}

export type Profile = {
  name: string
  title: string
  location: string
  email: string
  summary: string
  socials: SocialLink[]
  skills: SkillGroup[]
}

export type Project = {
  id: string
  title: string
  description: string
  tags: string[]
  href?: string
  repo?: string
}

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

export type NewsItem = {
  title: string
  href: string
  source: string
  publishedAt: string
}

export type NewsFeed = {
  query: string
  items: NewsItem[]
}

export type WikiPreview = {
  title: string
  description: string
  extract: string
  href: string
  thumbnail: string
  updatedAt: string
}

export type LayaQuestionType = 'choice' | 'score' | 'noul'

export type LayaQuestion = {
  type: LayaQuestionType
  instructions: string
  criteria?: Record<string, string> | string[]
}

export type LayaAnswer = {
  id: string
  type: LayaQuestionType
  value: string
  confidence: number | null
}

export type LayaResult = {
  model: string
  latencyMs: number
  source: string
  answers: LayaAnswer[]
}
