import { useEffect, useState, type CSSProperties } from 'react'
import { getForecast } from '../api'
import type { Forecast } from '../types'
import { WeatherIcon, weatherLabel } from './WeatherIcon'
import './ForecastCard.css'

function weekday(date: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(`${date}T12:00:00`))
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
  const [error, setError] = useState('')

  useEffect(() => {
    const unit = navigator.language.startsWith('en-US') ? 'fahrenheit' : 'celsius'

    readCoords()
      .then(({ lat, lon }) => getForecast(lat, lon, unit))
      .then(setForecast)
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : 'Could not load the forecast.')
      })
  }, [])

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
          <p className="forecast-place">{forecast.location}</p>
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
