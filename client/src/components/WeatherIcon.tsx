import type { ReactNode } from 'react'

type WeatherKind = 'clear' | 'partly' | 'clouds' | 'fog' | 'drizzle' | 'rain' | 'showers' | 'snow' | 'storm'

export function weatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly'
  if (code <= 3) return 'clouds'
  if (code <= 48) return 'fog'
  if (code <= 57) return 'drizzle'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'showers'
  if (code <= 86) return 'snow'
  return 'storm'
}

export function weatherLabel(code: number) {
  switch (weatherKind(code)) {
    case 'clear':
      return 'Clear'
    case 'partly':
      return 'Partly cloudy'
    case 'clouds':
      return 'Clouds'
    case 'fog':
      return 'Fog'
    case 'drizzle':
      return 'Drizzle'
    case 'rain':
      return 'Rain'
    case 'showers':
      return 'Showers'
    case 'snow':
      return 'Snow'
    case 'storm':
      return 'Storm'
  }
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      className="forecast-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function ClearIcon() {
  return (
    <IconFrame>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
    </IconFrame>
  )
}

function PartlyIcon() {
  return (
    <IconFrame>
      <circle cx="9" cy="9" r="3" />
      <path d="M9 3.5V5M3.5 9H5M5.1 5.1l1.1 1.1" />
      <path d="M8 17.5h8.2A3.3 3.3 0 0 0 16 11a4.6 4.6 0 0 0-8.5-1.4A2.9 2.9 0 0 0 8 17.5Z" />
    </IconFrame>
  )
}

function CloudsIcon() {
  return (
    <IconFrame>
      <path d="M7 18h10a4 4 0 0 0 .2-8 5.4 5.4 0 0 0-10.5-1.2A3.5 3.5 0 0 0 7 18Z" />
    </IconFrame>
  )
}

function FogIcon() {
  return (
    <IconFrame>
      <path d="M5 9h14M4 12.5h16M6 16h12" />
    </IconFrame>
  )
}

function DrizzleIcon() {
  return (
    <IconFrame>
      <path d="M7 14h9.5A3.5 3.5 0 0 0 16.4 7 4.8 4.8 0 0 0 7.2 6.2 3.2 3.2 0 0 0 7 14Z" />
      <path d="M8.5 17v1.5M12 17.5v1.5M15.5 17v1.5" />
    </IconFrame>
  )
}

function RainIcon() {
  return (
    <IconFrame>
      <path d="M7 13.5h10a3.8 3.8 0 0 0 .1-7.6A5.2 5.2 0 0 0 7.1 4.8 3.4 3.4 0 0 0 7 13.5Z" />
      <path d="M8.2 16.2 7.4 19M12 16.6l-.8 2.8M15.8 16.2l-.8 2.8" />
    </IconFrame>
  )
}

function ShowersIcon() {
  return (
    <IconFrame>
      <path d="M7 12.5h10a3.8 3.8 0 0 0 .1-7.6A5.2 5.2 0 0 0 7.1 3.8 3.4 3.4 0 0 0 7 12.5Z" />
      <path d="M8 15.2 6.8 19M12 15.6 10.8 19.4M16 15.2 14.8 19" />
    </IconFrame>
  )
}

function SnowIcon() {
  return (
    <IconFrame>
      <path d="M7 13h10a3.8 3.8 0 0 0 .1-7.6A5.2 5.2 0 0 0 7.1 4.3 3.4 3.4 0 0 0 7 13Z" />
      <path d="M8.5 16.4v2.2M7.4 17.5h2.2M12 16.8v2.2M10.9 17.9h2.2M15.5 16.4v2.2M14.4 17.5h2.2" />
    </IconFrame>
  )
}

function StormIcon() {
  return (
    <IconFrame>
      <path d="M7 13h9.2A3.6 3.6 0 0 0 16.3 6 5 5 0 0 0 7.2 5.2 3.3 3.3 0 0 0 7 13Z" />
      <path d="m11 13-2 4h3l-1.5 4" />
    </IconFrame>
  )
}

const ICONS: Record<WeatherKind, () => ReactNode> = {
  clear: ClearIcon,
  partly: PartlyIcon,
  clouds: CloudsIcon,
  fog: FogIcon,
  drizzle: DrizzleIcon,
  rain: RainIcon,
  showers: ShowersIcon,
  snow: SnowIcon,
  storm: StormIcon,
}

export function WeatherIcon({ code }: { code: number }) {
  const Icon = ICONS[weatherKind(code)]
  return <Icon />
}
