import { useEffect, useId, useState } from 'react'
import {
  applyColors,
  COLOR_VARS,
  colorsMatch,
  getColorPresets,
  loadColors,
  saveColors,
  type ColorKey,
  type ThemeColors,
} from './theme'
import './ThemeSettings.css'

export function ThemeSettings() {
  const [colors, setColors] = useState<ThemeColors>(loadColors)
  const titleId = useId()

  useEffect(() => {
    applyColors(colors)
  }, [colors])

  function updateColor(key: ColorKey, value: string) {
    const next = { ...colors, [key]: value }
    setColors(next)
    saveColors(next)
  }

  function applyPreset(next: ThemeColors) {
    setColors({ ...next })
    saveColors(next)
  }

  return (
    <article className="card theme-card" aria-labelledby={titleId}>
      <div className="theme-card-head">
        <h3 id={titleId}>Theme</h3>
      </div>
      <div className="theme-presets" role="radiogroup" aria-label="Color presets">
        {getColorPresets().map((preset) => {
          const selected = colorsMatch(colors, preset.colors)
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={selected ? 'is-active' : undefined}
              onClick={() => applyPreset(preset.colors)}
            >
              <span className="theme-swatches" aria-hidden="true">
                <i style={{ background: preset.colors['--bg'] }} />
                <i style={{ background: preset.colors['--accent'] }} />
                <i style={{ background: preset.colors['--ink'] }} />
              </span>
              {preset.name}
            </button>
          )
        })}
      </div>
      <ul className="theme-list">
        {COLOR_VARS.map(({ key, label }) => (
          <li key={key}>
            <label>
              <span>{label}</span>
              <input
                type="color"
                value={colors[key]}
                onChange={(event) => updateColor(key, event.target.value)}
              />
              <code>{colors[key]}</code>
            </label>
          </li>
        ))}
      </ul>
    </article>
  )
}
