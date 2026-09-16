import { useEffect, useId, useRef, useState } from 'react'
import {
  applyColors,
  COLOR_VARS,
  colorsMatch,
  getColorPresets,
  loadColors,
  resetColors,
  saveColors,
  type ColorKey,
  type ThemeColors,
} from './theme'
import './ThemeSettings.css'

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96c-.5-.38-1.04-.7-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.8 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.92 14.16a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.8c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.26.12.55.02.69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"
      />
    </svg>
  )
}

export function ThemeSettings() {
  const [open, setOpen] = useState(false)
  const [colors, setColors] = useState<ThemeColors>(loadColors)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    applyColors(colors)
  }, [colors])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function updateColor(key: ColorKey, value: string) {
    const next = { ...colors, [key]: value }
    setColors(next)
    saveColors(next)
  }

  function handleReset() {
    setColors(resetColors())
  }

  function applyPreset(next: ThemeColors) {
    setColors({ ...next })
    saveColors(next)
  }

  return (
    <div className="theme-settings">
      <button
        ref={buttonRef}
        type="button"
        className="theme-toggle"
        aria-label="Theme colors"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <GearIcon />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="theme-panel"
          role="dialog"
          aria-labelledby={titleId}
        >
          <div className="theme-panel-head">
            <h2 id={titleId}>Colors</h2>
            <button type="button" className="theme-reset" onClick={handleReset}>
              Reset
            </button>
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
        </div>
      )}
    </div>
  )
}
