import type { Forecast, NewsFeed, OilPrices, Profile, Project, WikiPreview } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const data = (await response.json().catch(() => ({}))) as T & { error?: string }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.')
  }

  return data
}

export function getProfile() {
  return request<Profile>('/api/profile')
}

export function getProjects() {
  return request<Project[]>('/api/projects')
}

export function getForecast(
  lat: number,
  lon: number,
  unit: 'celsius' | 'fahrenheit' = 'celsius',
) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    unit,
  })
  return request<Forecast>(`/api/forecast?${params}`)
}

export function getOilPrices() {
  return request<OilPrices>('/api/oil')
}

export function getNews(query: string) {
  const params = new URLSearchParams({ q: query })
  return request<NewsFeed>(`/api/news?${params}`)
}

export function getWikiPreview(url: string) {
  const params = new URLSearchParams({ url })
  return request<WikiPreview>(`/api/wiki?${params}`)
}

export function sendMessage(body: { name: string; email: string; message: string }) {
  return request<{ ok: boolean; message: string }>('/api/contact', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
