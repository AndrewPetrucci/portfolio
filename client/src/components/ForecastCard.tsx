import { useEffect, useState } from 'react'
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
      {!forecast && !error && <p>Loading local weather…</p>}
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
