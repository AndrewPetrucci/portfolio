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
