import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getForecast } from '../api'
import type { Forecast } from '../types'
import { WeatherIcon, weatherLabel } from './WeatherIcon'
import './ForecastCard.css'

const REFRESH_MS = 10 * 60 * 1000
const AGE_TICK_MS = 15_000

function weekday(date: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(`${date}T12:00:00`))
}

function formatForecastAge(fetchedAt: number, now: number) {
  const seconds = Math.max(0, Math.round((now - fetchedAt) / 1000))
  if (seconds < 20) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function readCoords() {
  return new Promise<{ lat: number; lon: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser cannot read location.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
      },
      () => reject(new Error('Allow location to load the forecast.')),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30 * 60 * 1000 },
    )
  })
}

export function ForecastCard() {
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')
  const forecastRef = useRef<Forecast | null>(null)
  const fetchedAtRef = useRef<number | null>(null)

  forecastRef.current = forecast
  fetchedAtRef.current = fetchedAt

  useEffect(() => {
    const unit = navigator.language.startsWith('en-US') ? 'fahrenheit' : 'celsius'
    let cancelled = false
    let coords: { lat: number; lon: number } | null = null

    async function load() {
      try {
        if (!coords) coords = await readCoords()
        const next = await getForecast(coords.lat, coords.lon, unit)
        if (cancelled) return
        const stamp = Date.now()
        setForecast(next)
        setFetchedAt(stamp)
        setNow(stamp)
        setError('')
      } catch (reason) {
        if (cancelled || forecastRef.current) return
        setError(reason instanceof Error ? reason.message : 'Could not load the forecast.')
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
    <article className="card forecast-card">
      <h3>Forecast</h3>
      {!forecast && !error && <ForecastSkeleton />}
      {error && <p>{error}</p>}
      {forecast && (
        <>
          <p className="forecast-now">
            <WeatherIcon code={forecast.weatherCode} />
            <span>
              {forecast.temperature}°{forecast.unit}
            </span>
            <span className="forecast-now-label">{weatherLabel(forecast.weatherCode)}</span>
          </p>
          <div className="forecast-meta">
            <p className="forecast-place">{forecast.location}</p>
            {fetchedAt != null && (
              <time
                className="forecast-age"
                dateTime={new Date(fetchedAt).toISOString()}
                title={new Date(fetchedAt).toLocaleString()}
              >
                {formatForecastAge(fetchedAt, now)}
              </time>
            )}
          </div>
          <ul className="forecast-days">
            {forecast.days.map((day) => (
              <li key={day.date}>
                <span>{weekday(day.date)}</span>
                <span className="forecast-day-condition">
                  <WeatherIcon code={day.weatherCode} />
                  <span className="forecast-day-label">{weatherLabel(day.weatherCode)}</span>
                </span>
                <span>
                  {day.high}° / {day.low}°
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  )
}

function ForecastSkeleton() {
  return (
    <div className="forecast-skeleton" aria-busy="true" aria-label="Loading local weather">
      <div className="forecast-now">
        <span className="forecast-skeleton-bone forecast-skeleton-icon" />
        <span className="forecast-skeleton-bone forecast-skeleton-temp" />
        <span className="forecast-skeleton-bone forecast-skeleton-label" />
      </div>
      <p className="forecast-place">
        <span className="forecast-skeleton-bone forecast-skeleton-place" />
      </p>
      <ul className="forecast-days">
        {Array.from({ length: 5 }, (_, index) => (
          <li key={index} style={{ '--d': `${index * 90}ms` } as CSSProperties}>
            <span className="forecast-skeleton-bone forecast-skeleton-day" />
            <span className="forecast-day-condition">
              <span className="forecast-skeleton-bone forecast-skeleton-icon-sm" />
              <span className="forecast-skeleton-bone forecast-skeleton-condition" />
            </span>
            <span className="forecast-skeleton-bone forecast-skeleton-range" />
          </li>
        ))}
      </ul>
    </div>
  )
}
