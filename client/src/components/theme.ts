export const COLOR_VARS = [
  { key: '--bg', label: 'Background' },
  { key: '--bg-raise', label: 'Surface' },
  { key: '--ink', label: 'Text' },
  { key: '--muted', label: 'Muted text' },
  { key: '--line', label: 'Border' },
  { key: '--accent', label: 'Accent' },
  { key: '--accent-ink', label: 'Accent text' },
] as const

export type ColorKey = (typeof COLOR_VARS)[number]['key']
export type ThemeColors = Record<ColorKey, string>

export type ColorPreset = {
  id: string
  name: string
  colors: ThemeColors
}

const STORAGE_KEY = 'portfolio-theme-colors'

const STATIC_PRESETS: ColorPreset[] = [
  {
    id: 'harbor',
    name: 'Harbor',
    colors: {
      '--bg': '#0b1220',
      '--bg-raise': '#152038',
      '--ink': '#e8eefc',
      '--muted': '#93a0c0',
      '--line': '#243154',
      '--accent': '#5eead4',
      '--accent-ink': '#042f2e',
    },
  },
  {
    id: 'daylight',
    name: 'Daylight',
    colors: {
      '--bg': '#f4efe6',
      '--bg-raise': '#fffdf8',
      '--ink': '#1c1915',
      '--muted': '#6b6458',
      '--line': '#d9d0c3',
      '--accent': '#c2410c',
      '--accent-ink': '#fff7ed',
    },
  },
]

function toHex(color: string): string {
  const value = color.trim()
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value
      .slice(1)
      .split('')
      .map((char) => char + char)
      .join('')}`.toLowerCase()
  }
  if (typeof document === 'undefined') return value

  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return value
  ctx.fillStyle = '#000000'
  ctx.fillStyle = value
  const filled = ctx.fillStyle
  if (/^#[0-9a-f]{6}$/i.test(filled)) return filled.toLowerCase()

  const match = filled.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!match) return value
  return `#${[match[1], match[2], match[3]]
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`
}

function readFromStyleSheets(): Partial<ThemeColors> {
  const found: Partial<ThemeColors> = {}
  if (typeof document === 'undefined') return found

  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }

    for (const rule of rules) {
      if (!(rule instanceof CSSStyleRule)) continue
      const targetsRoot = rule.selectorText.split(',').some((selector) => selector.trim() === ':root')
      if (!targetsRoot) continue

      for (const { key } of COLOR_VARS) {
        const value = rule.style.getPropertyValue(key).trim()
        if (value) found[key] = toHex(value)
      }
    }
  }

  return found
}

function readFromComputedStyle(): Partial<ThemeColors> {
  const found: Partial<ThemeColors> = {}
  if (typeof document === 'undefined') return found

  const root = document.documentElement
  const inline = COLOR_VARS.map(({ key }) => [key, root.style.getPropertyValue(key)] as const)
  for (const { key } of COLOR_VARS) root.style.removeProperty(key)

  const styles = getComputedStyle(root)
  for (const { key } of COLOR_VARS) {
    const value = styles.getPropertyValue(key).trim()
    if (value) found[key] = toHex(value)
  }

  for (const [key, value] of inline) {
    if (value) root.style.setProperty(key, value)
  }

  return found
}

let cachedDefaults: ThemeColors | null = null

export function getDefaultColors(): ThemeColors {
  if (cachedDefaults) return { ...cachedDefaults }

  const fromSheet = readFromStyleSheets()
  const fromComputed = COLOR_VARS.every(({ key }) => fromSheet[key])
    ? {}
    : readFromComputedStyle()
  const merged = { ...fromComputed, ...fromSheet }

  cachedDefaults = Object.fromEntries(
    COLOR_VARS.map(({ key }) => [key, merged[key] ?? '#000000']),
  ) as ThemeColors

  return { ...cachedDefaults }
}

export function getColorPresets(): ColorPreset[] {
  return [
    { id: 'atelier', name: 'Atelier', colors: getDefaultColors() },
    ...STATIC_PRESETS,
  ]
}

function isThemeColors(value: unknown): value is ThemeColors {
  if (!value || typeof value !== 'object') return false
  return COLOR_VARS.every(({ key }) => typeof (value as ThemeColors)[key] === 'string')
}

export function loadColors(): ThemeColors {
  const defaults = getDefaultColors()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed: unknown = JSON.parse(raw)
    if (!isThemeColors(parsed)) return defaults
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

export function saveColors(colors: ThemeColors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
}

export function applyColors(colors: ThemeColors) {
  const root = document.documentElement
  for (const { key } of COLOR_VARS) {
    root.style.setProperty(key, colors[key])
  }
}

export function colorsMatch(a: ThemeColors, b: ThemeColors) {
  return COLOR_VARS.every(({ key }) => a[key].toLowerCase() === b[key].toLowerCase())
}

export function resetColors() {
  const root = document.documentElement
  for (const { key } of COLOR_VARS) {
    root.style.removeProperty(key)
  }
  localStorage.removeItem(STORAGE_KEY)
  cachedDefaults = null
  return getDefaultColors()
}

if (typeof document !== 'undefined') {
  applyColors(loadColors())
}
