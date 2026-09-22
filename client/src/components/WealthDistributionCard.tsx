import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { getWealthDistribution } from '../api'
import type { WealthDistribution, WealthLatest, WealthSharePoint } from '../types'
import './WealthDistributionCard.css'

const REFRESH_MS = 6 * 60 * 60 * 1000

const BANDS = [
  { key: 'bottom50', label: 'Bottom 50%' },
  { key: 'next40', label: '50–90%' },
  { key: 'next9', label: '90–99%' },
  { key: 'top1', label: 'Top 1%' },
] as const

type BandKey = (typeof BANDS)[number]['key']

function formatShare(value: number) {
  return `${value.toFixed(1)}%`
}

function formatQuarter(quarter: string) {
  const match = /^(\d{4}):Q([1-4])$/.exec(quarter)
  if (!match) return quarter
  return `Q${match[2]} ${match[1]}`
}

type Pt = { x: number; y: number }

function pinPoint(root: HTMLElement, name: string): Pt | null {
  const pin = root.querySelector(`[data-pin="${name}"]`)
  if (!(pin instanceof HTMLElement)) return null
  const rect = pin.getBoundingClientRect()
  return { x: rect.left, y: rect.top }
}

function inverseBilinear(p: Pt, a: Pt, b: Pt, c: Pt, d: Pt) {
  const e = { x: b.x - a.x, y: b.y - a.y }
  const f = { x: d.x - a.x, y: d.y - a.y }
  const g = { x: a.x - b.x + c.x - d.x, y: a.y - b.y + c.y - d.y }
  const h = { x: p.x - a.x, y: p.y - a.y }
  const k2 = g.x * f.y - g.y * f.x
  const k1 = e.x * f.y - e.y * f.x + h.x * g.y - h.y * g.x
  const k0 = h.x * e.y - h.y * e.x

  let u = 0
  let v = 0

  if (Math.abs(k2) < 1e-6) {
    if (Math.abs(k1) < 1e-6) return null
    v = -k0 / k1
    const denom = e.x + g.x * v
    u = Math.abs(denom) < 1e-6 ? (h.y - f.y * v) / (e.y + g.y * v) : (h.x - f.x * v) / denom
  } else {
    const disc = k1 * k1 - 4 * k0 * k2
    if (disc < 0) return null
    const sqrt = Math.sqrt(disc)
    const v1 = (-k1 - sqrt) / (2 * k2)
    const v2 = (-k1 + sqrt) / (2 * k2)
    const in01 = (value: number) => value >= -0.02 && value <= 1.02
    v = in01(v1) ? v1 : v2
    const denom = e.x + g.x * v
    u = Math.abs(denom) < 1e-6 ? (h.y - f.y * v) / (e.y + g.y * v) : (h.x - f.x * v) / denom
  }

  if (!Number.isFinite(u) || !Number.isFinite(v)) return null
  return {
    u: Math.max(0, Math.min(1, u)),
    v: Math.max(0, Math.min(1, v)),
  }
}

export function WealthDistributionCard() {
  const [wealth, setWealth] = useState<WealthDistribution | null>(null)
  const [error, setError] = useState('')
  const wealthRef = useRef<WealthDistribution | null>(null)
  const fetchedAtRef = useRef<number | null>(null)

  wealthRef.current = wealth

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const next = await getWealthDistribution()
        if (cancelled) return
        fetchedAtRef.current = Date.now()
        setWealth(next)
        setError('')
      } catch (reason) {
        if (cancelled || wealthRef.current) return
        setError(
          reason instanceof Error ? reason.message : 'Could not load wealth distribution.',
        )
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

  return (
    <article className="card wealth-card">
      {!wealth && <h3>Wealth</h3>}
      {!wealth && !error && <WealthSkeleton />}
      {error && <p>{error}</p>}
      {wealth && <WealthBody wealth={wealth} />}
    </article>
  )
}

function WealthBody({ wealth }: { wealth: WealthDistribution }) {
  const [hover, setHover] = useState<WealthSharePoint | null>(null)
  const view = hover ?? wealth.latest
  const hoveredDate = hover?.date ?? wealth.points[wealth.points.length - 1]?.date

  return (
    <>
      <h3>Wealth Distribution</h3>
      <p className="wealth-meta">US household net worth</p>
      <WealthChart points={wealth.points} onHover={setHover} />
      <WealthLegend latest={view} />
      <p className="wealth-now">
        <span className="wealth-now-label">{wealth.source}</span>
        {hoveredDate && (
          <time dateTime={hoveredDate}>{formatQuarter(view.quarter)}</time>
        )}
      </p>
    </>
  )
}

function WealthLegend({ latest }: { latest: WealthLatest }) {
  return (
    <ul className="wealth-legend">
      {BANDS.map((band) => (
        <li key={band.key}>
          <span className="wealth-swatch" data-band={band.key} />
          <span>{band.label}</span>
          {/* <span className="wealth-legend-value">{formatShare(latest[band.key])}</span> */}
        </li>
      ))}
    </ul>
  )
}

type ChartPoint = {
  date: Date
  source: WealthSharePoint
  bottom50: number
  next40: number
  next9: number
  top1: number
}

function WealthChart({
  points,
  onHover,
}: {
  points: WealthSharePoint[]
  onHover: (point: WealthSharePoint | null) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const onHoverRef = useRef(onHover)
  onHoverRef.current = onHover

  useEffect(() => {
    const wrap = wrapRef.current
    const svgElement = svgRef.current
    if (!wrap || !svgElement || points.length < 2) return
    const chart = wrap
    const svgNode = svgElement

    const series: ChartPoint[] = points.map((point) => ({
      date: new Date(`${point.date}T12:00:00`),
      source: point,
      bottom50: point.bottom50,
      next40: point.next40,
      next9: point.next9,
      top1: point.top1,
    }))
    const keys = BANDS.map((band) => band.key)
    const stacked = d3.stack<ChartPoint, BandKey>().keys(keys)(series)
    const bisectDate = d3.bisector<ChartPoint, Date>((d) => d.date).center

    function draw() {
      const width = chart.clientWidth
      const height = chart.clientHeight
      if (width < 40 || height < 40) return

      const margin = { top: 6, right: 6, bottom: 18, left: 28 }
      const innerWidth = Math.max(1, width - margin.left - margin.right)
      const innerHeight = Math.max(1, height - margin.top - margin.bottom)
      const x = d3
        .scaleTime()
        .domain(d3.extent(series, (d) => d.date) as [Date, Date])
        .range([0, innerWidth])
      const y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0])
      const area = d3
        .area<d3.SeriesPoint<ChartPoint>>()
        .x((d) => x(d.data.date))
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]))
        .curve(d3.curveMonotoneX)

      const svg = d3.select(svgNode)
      svg.selectAll('*').remove()
      svg.attr('viewBox', `0 0 ${width} ${height}`)

      const plot = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

      for (const layer of stacked) {
        plot
          .append('path')
          .attr('class', `wealth-band wealth-band-${layer.key}`)
          .attr('d', area(layer) ?? '')
      }

      plot
        .append('g')
        .attr('class', 'wealth-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(4)
            .tickSizeOuter(0)
            .tickFormat((value) =>
              d3.timeFormat('%Y')(value instanceof Date ? value : new Date(Number(value))),
            ),
        )
      plot
        .append('g')
        .attr('class', 'wealth-axis')
        .call(
          d3
            .axisLeft(y)
            .tickValues([0, 50, 100])
            .tickSizeOuter(0)
            .tickFormat((value) => `${Number(value)}%`),
        )

      const hover = plot.append('g').attr('class', 'wealth-hover').attr('hidden', true)
      hover
        .append('line')
        .attr('class', 'wealth-hover-line')
        .attr('y1', 0)
        .attr('y2', innerHeight)

      for (const band of BANDS) {
        hover
          .append('text')
          .attr('class', `wealth-hover-share wealth-hover-share-${band.key}`)
          .attr('data-band', band.key)
          .attr('dy', '0.35em')
      }

      const overlay = plot
        .append('rect')
        .attr('class', 'wealth-hover-capture')
        .attr('width', innerWidth)
        .attr('height', innerHeight)

      const pinPositions = {
        tl: [margin.left, margin.top],
        tr: [margin.left + innerWidth, margin.top],
        br: [margin.left + innerWidth, margin.top + innerHeight],
        bl: [margin.left, margin.top + innerHeight],
      } as const
      for (const [name, [x, y]] of Object.entries(pinPositions)) {
        const pin = chart.querySelector(`[data-pin="${name}"]`)
        if (pin instanceof HTMLElement) {
          pin.style.left = `${x}px`
          pin.style.top = `${y}px`
        }
      }

      function hideHover() {
        hover.attr('hidden', true)
        onHoverRef.current(null)
      }

      function plotXFromEvent(event: PointerEvent) {
        const tl = pinPoint(chart, 'tl')
        const tr = pinPoint(chart, 'tr')
        const br = pinPoint(chart, 'br')
        const bl = pinPoint(chart, 'bl')
        if (!tl || !tr || !br || !bl) return 0
        const uv = inverseBilinear({ x: event.clientX, y: event.clientY }, tl, tr, br, bl)
        if (!uv) return 0
        return uv.u * innerWidth
      }

      function showHover(event: PointerEvent) {
        const mx = Math.max(0, Math.min(innerWidth, plotXFromEvent(event)))
        const index = Math.max(0, Math.min(series.length - 1, bisectDate(series, x.invert(mx))))
        const point = series[index]
        const alignRight = mx > innerWidth * 0.58
        const labelX = mx + (alignRight ? -5 : 5)
        const anchor = alignRight ? 'end' : 'start'

        hover.attr('hidden', null)
        hover.select('.wealth-hover-line').attr('x1', mx).attr('x2', mx)

        let cumulative = 0
        for (const band of BANDS) {
          const value = point[band.key]
          const mid = cumulative + value / 2
          cumulative += value
          const ty = Math.min(innerHeight - 7, Math.max(7, y(mid)))
          hover
            .select(`text[data-band="${band.key}"]`)
            .attr('x', labelX)
            .attr('y', ty)
            .attr('text-anchor', anchor)
            .text(formatShare(value))
        }

        onHoverRef.current(point.source)
      }

      overlay
        .on('pointerenter', showHover)
        .on('pointermove', showHover)
        .on('pointerleave', hideHover)
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(chart)
    return () => {
      observer.disconnect()
      onHoverRef.current(null)
    }
  }, [points])

  return (
    <div className="wealth-chart" ref={wrapRef}>
      <svg
        ref={svgRef}
        role="img"
        aria-label="US household net worth shares since 1989, stacked by wealth percentile"
      />
      <span className="wealth-pin" data-pin="tl" aria-hidden="true" />
      <span className="wealth-pin" data-pin="tr" aria-hidden="true" />
      <span className="wealth-pin" data-pin="br" aria-hidden="true" />
      <span className="wealth-pin" data-pin="bl" aria-hidden="true" />
    </div>
  )
}

function WealthSkeleton() {
  return (
    <div className="wealth-skeleton" aria-busy="true" aria-label="Loading wealth distribution">
      <span className="wealth-skeleton-bone wealth-skeleton-meta" />
      <span className="wealth-skeleton-bone wealth-skeleton-chart" />
      <span className="wealth-skeleton-bone wealth-skeleton-legend" />
    </div>
  )
}
