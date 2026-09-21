export type WikiPreview = {
  title: string
  description: string
  extract: string
  href: string
  thumbnail: string
  updatedAt: string
}

const CACHE_MS = 60 * 60 * 1000
const MAX_HREF = 300
const WIKI_HOST = /^(?:[a-z0-9-]{2,12})(?:\.m)?\.wikipedia\.org$/i
const USER_AGENT = 'AndrewPetrucciPortfolio/1.0 (https://github.com/AndrewPetrucci/portfolio)'

const cache = new Map<string, { at: number; data: WikiPreview }>()

type WikiSummary = {
  title?: string
  description?: string
  extract?: string
  timestamp?: string
  thumbnail?: { source?: string }
  content_urls?: { desktop?: { page?: string } }
}

type WikiMedia = {
  items?: Array<{
    type?: string
    srcset?: Array<{ src?: string }>
  }>
}

function wikiHeaders() {
  return { 'User-Agent': USER_AGENT, Accept: 'application/json' }
}

function parseWikipediaUrl(value: unknown) {
  const href = String(value ?? '').trim()
  if (href.length < 12 || href.length > MAX_HREF) {
    throw new Error('A Wikipedia link is required.')
  }

  let url: URL
  try {
    url = new URL(href)
  } catch {
    throw new Error('That Wikipedia link looks invalid.')
  }

  if (url.protocol !== 'https:') {
    throw new Error('That Wikipedia link looks invalid.')
  }

  const host = url.hostname.toLowerCase()
  if (!WIKI_HOST.test(host)) {
    throw new Error('That Wikipedia link looks invalid.')
  }

  const lang = host.split('.')[0] || 'en'
  const wikiPath = url.pathname.match(/^\/wiki\/(.+)$/)
  const title = decodeURIComponent(
    (wikiPath ? wikiPath[1] : url.searchParams.get('title') ?? '').replace(/_/g, ' '),
  ).trim()

  if (!title) {
    throw new Error('That Wikipedia link looks invalid.')
  }

  return { lang, title, href: url.toString() }
}

function absoluteImage(src: string) {
  if (src.startsWith('//')) return `https:${src}`
  return src
}

async function firstArticleImage(lang: string, title: string) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'))
  const response = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encoded}`,
    { headers: wikiHeaders() },
  )
  if (!response.ok) return ''

  const media = (await response.json()) as WikiMedia
  const image = media.items?.find((item) => item.type === 'image' && item.srcset?.[0]?.src)
  const src = image?.srcset?.[0]?.src
  return src ? absoluteImage(src) : ''
}

export function normalizeWikipediaUrl(value: unknown) {
  return parseWikipediaUrl(value).href
}

export async function fetchWikiPreview(href: string): Promise<WikiPreview> {
  const cached = cache.get(href)
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.data
  }

  const { lang, title } = parseWikipediaUrl(href)
  const encoded = encodeURIComponent(title.replace(/ /g, '_'))
  const response = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    { headers: wikiHeaders() },
  )

  if (!response.ok) {
    throw new Error('Could not load the Wikipedia preview.')
  }

  const summary = (await response.json()) as WikiSummary
  const pageTitle = summary.title?.trim() || title
  const extract = (summary.extract ?? '').replace(/\s+/g, ' ').trim()
  const pageHref = summary.content_urls?.desktop?.page || href
  let thumbnail = summary.thumbnail?.source ? absoluteImage(summary.thumbnail.source) : ''

  if (!thumbnail) {
    thumbnail = await firstArticleImage(lang, pageTitle)
  }

  if (!extract) {
    throw new Error('Could not load the Wikipedia preview.')
  }

  const data: WikiPreview = {
    title: pageTitle,
    description: (summary.description ?? '').trim(),
    extract,
    href: pageHref,
    thumbnail,
    updatedAt: summary.timestamp ? new Date(summary.timestamp).toISOString() : '',
  }

  cache.set(href, { at: Date.now(), data })
  return data
}
