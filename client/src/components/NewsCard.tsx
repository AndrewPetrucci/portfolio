import { useEffect, useRef, useState } from 'react'
import { getNews, getWikiPreview } from '../api'
import type { NewsFeed, WikiPreview } from '../types'
import './NewsCard.css'

const REFRESH_MS = 15 * 60 * 1000
const AGE_TICK_MS = 15_000
const ROTATE_MS = 10_000
const VISIBLE_ITEMS = 2

export type NewsCardProps = {
  title: string
  query: string
  wikipedia?: string
}

function formatFeedAge(fetchedAt: number, now: number) {
  const seconds = Math.max(0, Math.round((now - fetchedAt) / 1000))
  if (seconds < 20) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function formatArticleAge(publishedAt: string, now: number) {
  const then = Date.parse(publishedAt)
  if (!Number.isFinite(then)) return ''
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(then))
}

export function NewsCard({ title, query, wikipedia }: NewsCardProps) {
  const [feed, setFeed] = useState<NewsFeed | null>(null)
  const [wiki, setWiki] = useState<WikiPreview | null>(null)
  const [wikiReady, setWikiReady] = useState(!wikipedia)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')
  const [itemIndex, setItemIndex] = useState(0)
  const feedRef = useRef<NewsFeed | null>(null)
  const fetchedAtRef = useRef<number | null>(null)
  const pausedRef = useRef(false)

  feedRef.current = feed
  fetchedAtRef.current = fetchedAt

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const next = await getNews(query)
        if (cancelled) return
        const stamp = Date.now()
        setFeed(next)
        setFetchedAt(stamp)
        setNow(stamp)
        setError('')
      } catch (reason) {
        if (cancelled || feedRef.current) return
        setError(reason instanceof Error ? reason.message : 'Could not load the news feed.')
      }
    }

    function loadIfStale() {
      const last = fetchedAtRef.current
      if (last && Date.now() - last < REFRESH_MS) return
      void load()
    }

    void load()
    const refresh = window.setInterval(() => {
      void load()
    }, REFRESH_MS)

    function onVisible() {
      if (document.visibilityState === 'visible') loadIfStale()
    }

    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [query])

  useEffect(() => {
    if (!wikipedia) {
      setWiki(null)
      setWikiReady(true)
      return
    }

    let cancelled = false
    setWikiReady(false)

    getWikiPreview(wikipedia)
      .then((next) => {
        if (cancelled) return
        setWiki(next)
        setWikiReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setWiki(null)
        setWikiReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [wikipedia])

  useEffect(() => {
    if (fetchedAt == null) return
    const tick = window.setInterval(() => setNow(Date.now()), AGE_TICK_MS)
    return () => window.clearInterval(tick)
  }, [fetchedAt])

  useEffect(() => {
    const count = feed?.items.length ?? 0
    if (count === 0) {
      setItemIndex(0)
      return
    }

    setItemIndex((current) => current % count)
  }, [feed])

  useEffect(() => {
    const count = feed?.items.length ?? 0
    if (count <= VISIBLE_ITEMS) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduceMotion.matches) return

    const tick = window.setInterval(() => {
      if (pausedRef.current || document.visibilityState !== 'visible') return
      setItemIndex((current) => (current + 1) % count)
    }, ROTATE_MS)

    return () => window.clearInterval(tick)
  }, [feed])

  const showWikiPhoto = Boolean(wiki?.thumbnail) || Boolean(wikipedia && !wikiReady)
  const visibleItems = feed
    ? Array.from({ length: Math.min(VISIBLE_ITEMS, feed.items.length) }, (_, offset) => {
        return feed.items[(itemIndex + offset) % feed.items.length]
      })
    : []

  return (
    <article className="card news-card">
      <div className={showWikiPhoto ? 'news-top has-photo' : 'news-top'}>
        <div className="news-intro">
          <div className="news-head">
            <h3>{title}</h3>
            {fetchedAt != null && !wiki?.thumbnail && (
              <time
                className="news-age"
                dateTime={new Date(fetchedAt).toISOString()}
                title={new Date(fetchedAt).toLocaleString()}
              >
                {formatFeedAge(fetchedAt, now)}
              </time>
            )}
          </div>
          {wikipedia && !wiki && !wikiReady && (
            <div className="news-wiki-body" aria-hidden="true">
              <span className="news-skeleton-bone news-skeleton-meta" />
            </div>
          )}
          {wiki && (
            <a className="news-wiki" href={wiki.href} target="_blank" rel="noreferrer">
              <span className="news-wiki-kicker">{wiki.description || 'Wikipedia'}</span>
            </a>
          )}
        </div>
        {wikipedia && !wiki && !wikiReady && (
          <span className="news-skeleton-bone news-wiki-thumb" />
        )}
        {wiki?.thumbnail && (
          <a className="news-wiki-photo" href={wiki.href} target="_blank" rel="noreferrer">
            <img src={wiki.thumbnail} alt="" width={72} height={72} referrerPolicy="no-referrer" />
          </a>
        )}
        {/* {wikipedia && !wiki && !wikiReady && (
          <span className="news-skeleton-bone news-skeleton-title news-wiki-extract" />
        )} */}
        {wiki && (
          <>
            {/* <span className="news-wiki-extract">{wiki.extract}</span> */}
            <span className="news-item-meta news-wiki-meta">
              <SourceMarquee text="Wikipedia" delay={0} />
              {wiki.updatedAt && (
                <span className="news-item-age">{formatArticleAge(wiki.updatedAt, now)}</span>
              )}
            </span>
          </>
        )}
      </div>
      {!feed && !error && <NewsSkeleton />}
      {error && <p>{error}</p>}
      {feed && visibleItems.length > 0 && (
        <ul
          className="news-list"
          aria-live="polite"
          onMouseEnter={() => {
            pausedRef.current = true
          }}
          onMouseLeave={() => {
            pausedRef.current = false
          }}
        >
          {visibleItems.map((item, index) => (
            <li key={item.href}>
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.title}
              </a>
              <span className="news-item-meta">
                <SourceMarquee text={item.source} delay={index * 1.6} />
                {item.publishedAt && (
                  <span className="news-item-age">{formatArticleAge(item.publishedAt, now)}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function SourceMarquee({ text, delay }: { text: string; delay: number }) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const copyRef = useRef<HTMLSpanElement>(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    const copy = copyRef.current
    if (!root || !copy) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    function measure() {
      if (!root || !copy) return
      setOverflowing(!reduceMotion.matches && copy.scrollWidth > root.clientWidth + 1)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    reduceMotion.addEventListener('change', measure)

    return () => {
      observer.disconnect()
      reduceMotion.removeEventListener('change', measure)
    }
  }, [text])

  return (
    <span ref={rootRef} className={overflowing ? 'news-source is-overflowing' : 'news-source'}>
      <span
        className="news-source-track"
        style={
          overflowing
            ? {
                animationDuration: `${Math.max(8, text.length * 0.38)}s`,
                animationDelay: `-${delay}s`,
              }
            : undefined
        }
      >
        <span ref={copyRef} className="news-source-copy">
          {text}
        </span>
        {overflowing && (
          <span className="news-source-copy" aria-hidden="true">
            {text}
          </span>
        )}
      </span>
    </span>
  )
}

function NewsSkeleton() {
  return (
    <ul className="news-list news-skeleton" aria-busy="true" aria-label="Loading news">
      {Array.from({ length: VISIBLE_ITEMS }, (_, index) => (
        <li key={index}>
          <span className="news-skeleton-bone news-skeleton-title" />
          <span className="news-skeleton-bone news-skeleton-meta" />
        </li>
      ))}
    </ul>
  )
}
