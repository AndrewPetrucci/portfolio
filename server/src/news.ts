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

const MAX_ITEMS = 5
const MAX_QUERY = 120

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim()
}

function innerTag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
  return match ? decodeXml(match[1]) : ''
}

function sourceName(block: string) {
  const match = block.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/i)
  return match ? decodeXml(match[1]) : ''
}

function cleanTitle(title: string, source: string) {
  if (source && title.endsWith(` - ${source}`)) {
    return title.slice(0, title.length - source.length - 3).trim()
  }
  return title
}

export function normalizeQuery(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_QUERY)
}

export async function fetchNews(query: string): Promise<NewsFeed> {
  const url = new URL('https://news.google.com/rss/search')
  url.searchParams.set('q', query)
  url.searchParams.set('hl', 'en-US')
  url.searchParams.set('gl', 'US')
  url.searchParams.set('ceid', 'US:en')

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!response.ok) {
    throw new Error('Could not load the news feed.')
  }

  const xml = await response.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map((match) => {
      const block = match[1]
      const source = sourceName(block)
      const title = cleanTitle(innerTag(block, 'title'), source)
      const href = innerTag(block, 'link')
      const published = innerTag(block, 'pubDate')
      const publishedAt = published ? new Date(published).toISOString() : ''
      return { title, href, source, publishedAt }
    })
    .filter((item) => item.title && item.href)
    .slice(0, MAX_ITEMS)

  if (!items.length) {
    throw new Error('Could not load the news feed.')
  }

  return { query, items }
}
