import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { getOilPrices } from '../api'
import type { OilPoint, OilPrices } from '../types'
import './OilPricesCard.css'

const REFRESH_MS = 30 * 60 * 1000
const AGE_TICK_MS = 15_000

function formatPrice(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatOilAge(fetchedAt: number, now: number) {
  const seconds = Math.max(0, Math.round((now - fetchedAt) / 1000))
  if (seconds < 20) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function changeSinceStart(oil: OilPrices) {
  const delta = ((oil.latest - oil.first) / oil.first) * 100
  const rounded = Math.round(delta)
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

export function OilPricesCard() {
  const [oil, setOil] = useState<OilPrices | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')
  const oilRef = useRef<OilPrices | null>(null)
  const fetchedAtRef = useRef<number | null>(null)

  oilRef.current = oil
  fetchedAtRef.current = fetchedAt

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const next = await getOilPrices()
        if (cancelled) return
        const stamp = Date.now()
        setOil(next)
        setFetchedAt(stamp)
        setNow(stamp)
        setError('')
      } catch (reason) {
        if (cancelled || oilRef.current) return
        setError(reason instanceof Error ? reason.message : 'Could not load oil prices.')
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
  }, [])

  useEffect(() => {
    if (fetchedAt == null) return
    const tick = window.setInterval(() => setNow(Date.now()), AGE_TICK_MS)
    return () => window.clearInterval(tick)
  }, [fetchedAt])

  return (
    <article className="card oil-card">
      <h3>Oil Prices{oil ? ` up ${changeSinceStart(oil)}` : ''}</h3>
      {!oil && !error && <OilSkeleton />}
      {error && <p>{error}</p>}
      {oil && (
        <>
          <p className="oil-meta">since beginning of Iran War</p>
          <OilChart points={oil.points} markerDate={oil.markerDate} />
          
          <p className="oil-now">
            <span>{formatPrice(oil.latest)}</span>
            <span className="oil-now-label">WTI</span>
            {fetchedAt != null && (
              <time
                className="oil-age"
                dateTime={new Date(fetchedAt).toISOString()}
                title={new Date(fetchedAt).toLocaleString()}
              >
                {formatOilAge(fetchedAt, now)}
              </time>
            )}
          </p>
        </>
      )}
    </article>
  )
}

function OilChart({ points, markerDate }: { points: OilPoint[]; markerDate: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const svgElement = svgRef.current
    if (!wrap || !svgElement || points.length < 2) return
    const chart = wrap
    const svgNode = svgElement

    const series = points.map((point) => ({
      date: new Date(`${point.date}T12:00:00`),
      price: point.price,
    }))
    const marker = new Date(`${markerDate}T12:00:00`)

    function draw() {
      const width = chart.clientWidth
      const height = chart.clientHeight
      if (width < 40 || height < 40) return

      const margin = { top: 8, right: 6, bottom: 20, left: 30 }
      const innerWidth = Math.max(1, width - margin.left - margin.right)
      const innerHeight = Math.max(1, height - margin.top - margin.bottom)
      const x = d3
        .scaleTime()
        .domain(d3.extent(series, (d) => d.date) as [Date, Date])
        .range([0, innerWidth])
      const minPrice = d3.min(series, (d) => d.price) ?? 0
      const maxPrice = d3.max(series, (d) => d.price) ?? 0
      const y = d3
        .scaleLinear()
        .domain([minPrice * 0.92, maxPrice * 1.04])
        .nice()
        .range([innerHeight, 0])

      const line = d3
        .line<(typeof series)[number]>()
        .x((d) => x(d.date))
        .y((d) => y(d.price))
        .curve(d3.curveMonotoneX)
      const area = d3
        .area<(typeof series)[number]>()
        .x((d) => x(d.date))
        .y0(innerHeight)
        .y1((d) => y(d.price))
        .curve(d3.curveMonotoneX)

      const svg = d3.select(svgNode)
      svg.selectAll('*').remove()
      svg.attr('viewBox', `0 0 ${width} ${height}`)

      const plot = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

      plot.append('path').attr('class', 'oil-area').attr('d', area(series) ?? '')
      plot.append('path').attr('class', 'oil-line').attr('d', line(series) ?? '')

      const [x0, x1] = x.domain()
      if (marker >= x0 && marker <= x1) {
        const mx = x(marker)
        plot
          .append('line')
          .attr('class', 'oil-marker')
          .attr('x1', mx)
          .attr('x2', mx)
          .attr('y1', 0)
          .attr('y2', innerHeight)
      }

      plot
        .append('g')
        .attr('class', 'oil-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(3)
            .tickSizeOuter(0)
            .tickFormat((value) => d3.timeFormat('%b')(value instanceof Date ? value : new Date(Number(value)))),
        )
      plot
        .append('g')
        .attr('class', 'oil-axis')
        .call(d3.axisLeft(y).ticks(3).tickSizeOuter(0).tickFormat((value) => `$${Number(value)}`))
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(chart)
    return () => observer.disconnect()
  }, [markerDate, points])

  return (
    <div className="oil-chart" ref={wrapRef}>
      <svg ref={svgRef} role="img" aria-label="WTI crude oil prices since February 2026" />
    </div>
  )
}

function OilSkeleton() {
  return (
    <div className="oil-skeleton" aria-busy="true" aria-label="Loading oil prices">
      <span className="oil-skeleton-bone oil-skeleton-price" />
      <span className="oil-skeleton-bone oil-skeleton-meta" />
      <span className="oil-skeleton-bone oil-skeleton-chart" />
    </div>
  )
}
