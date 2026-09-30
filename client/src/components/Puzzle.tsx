import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  buildCrossword,
  daySeed,
  wordAt,
  type Crossword as CrosswordPuzzle,
  type Direction,
} from './buildCrossword'
import './Puzzle.css'

const STORAGE_PREFIX = 'portfolio-crossword-'

function entryKey(row: number, col: number) {
  return `${row},${col}`
}

function loadEntries(dateKey: string) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dateKey)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const entries: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && /^[A-Z]$/.test(value)) entries[key] = value
    }
    return entries
  } catch {
    return {}
  }
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function clearPreviousPuzzles(dateKey: string) {
  const stale: string[] = []
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (key?.startsWith(STORAGE_PREFIX) && key !== STORAGE_PREFIX + dateKey) stale.push(key)
  }
  for (const key of stale) localStorage.removeItem(key)
}

function firstCell(puzzle: CrosswordPuzzle) {
  const word = puzzle.words.find((item) => item.dir === 'across') ?? puzzle.words[0]
  return word ? { row: word.row, col: word.col, dir: word.dir } : { row: 0, col: 0, dir: 'across' as Direction }
}

function step(dir: Direction, amount: number) {
  return dir === 'across' ? { row: 0, col: amount } : { row: amount, col: 0 }
}

export function Puzzle() {
  const [dateKey, setDateKey] = useState(() => daySeed(new Date()).dateKey)
  const puzzle = useMemo(() => buildCrossword(dateFromKey(dateKey)), [dateKey])
  const gridRef = useRef<HTMLDivElement>(null)
  const [entries, setEntries] = useState<Record<string, string>>(() => loadEntries(dateKey))
  const [cursor, setCursor] = useState(() => firstCell(puzzle))
  const [checked, setChecked] = useState(false)
  const [activeDate, setActiveDate] = useState(dateKey)

  if (activeDate !== puzzle.dateKey) {
    setActiveDate(puzzle.dateKey)
    setEntries({})
    setCursor(firstCell(puzzle))
    setChecked(false)
  }

  useEffect(() => {
    function syncDay() {
      const next = daySeed(new Date()).dateKey
      setDateKey((current) => (current === next ? current : next))
    }

    syncDay()
    const id = window.setInterval(syncDay, 60_000)
    window.addEventListener('focus', syncDay)
    document.addEventListener('visibilitychange', syncDay)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', syncDay)
      document.removeEventListener('visibilitychange', syncDay)
    }
  }, [])

  useEffect(() => {
    clearPreviousPuzzles(puzzle.dateKey)
  }, [puzzle.dateKey])

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + puzzle.dateKey, JSON.stringify(entries))
  }, [entries, puzzle.dateKey])

  const active = wordAt(puzzle, cursor.row, cursor.col, cursor.dir)
  const solved = puzzle.letters.every((row, rowIndex) =>
    row.every((letter, colIndex) => !letter || entries[entryKey(rowIndex, colIndex)] === letter),
  )

  function select(row: number, col: number, dir = cursor.dir) {
    if (!puzzle.letters[row]?.[col]) return
    const nextDir = wordAt(puzzle, row, col, dir) ? dir : dir === 'across' ? 'down' : 'across'
    setCursor({ row, col, dir: nextDir })
    gridRef.current?.focus()
  }

  function move(dir: Direction, amount: number) {
    const delta = step(dir, amount)
    let row = cursor.row + delta.row
    let col = cursor.col + delta.col
    while (puzzle.letters[row]?.[col] === '') {
      row += delta.row
      col += delta.col
    }
    if (puzzle.letters[row]?.[col]) select(row, col, dir)
  }

  function write(letter: string) {
    const key = entryKey(cursor.row, cursor.col)
    setEntries((current) => ({ ...current, [key]: letter }))
    const delta = step(cursor.dir, 1)
    const row = cursor.row + delta.row
    const col = cursor.col + delta.col
    if (puzzle.letters[row]?.[col]) setCursor({ row, col, dir: cursor.dir })
  }

  function erase() {
    const key = entryKey(cursor.row, cursor.col)
    if (entries[key]) {
      setEntries((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      return
    }
    const delta = step(cursor.dir, -1)
    const row = cursor.row + delta.row
    const col = cursor.col + delta.col
    if (!puzzle.letters[row]?.[col]) return
    setCursor({ row, col, dir: cursor.dir })
    setEntries((current) => {
      const next = { ...current }
      delete next[entryKey(row, col)]
      return next
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const letter = event.key.length === 1 ? event.key.toUpperCase() : ''
    if (/^[A-Z]$/.test(letter)) {
      event.preventDefault()
      write(letter)
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      erase()
      return
    }

    const arrows: Record<string, [Direction, number]> = {
      ArrowLeft: ['across', -1],
      ArrowRight: ['across', 1],
      ArrowUp: ['down', -1],
      ArrowDown: ['down', 1],
    }
    const arrow = arrows[event.key]
    if (!arrow) return
    event.preventDefault()
    move(arrow[0], arrow[1])
  }

  const across = puzzle.words.filter((word) => word.dir === 'across')
  const down = puzzle.words.filter((word) => word.dir === 'down')
  const dateLabel = new Date(`${puzzle.dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="crossword">
      <div className="crossword-toolbar">
        <p>
          {dateLabel}
          <span>Seed {puzzle.seed}</span>
          {solved && <span className="crossword-solved">Solved</span>}
        </p>
      </div>
      <div className="crossword-layout">
        <div
          ref={gridRef}
          className="crossword-grid"
          role="grid"
          aria-label={`Crossword for ${puzzle.dateKey}`}
          tabIndex={0}
          style={{ gridTemplateColumns: `repeat(${puzzle.cols}, minmax(0, 1fr))` }}
          onKeyDown={onKeyDown}
        >
          {puzzle.letters.map((row, rowIndex) =>
            row.map((letter, colIndex) => {
              const key = entryKey(rowIndex, colIndex)
              const inWord =
                active != null &&
                ((active.dir === 'across' &&
                  active.row === rowIndex &&
                  colIndex >= active.col &&
                  colIndex < active.col + active.word.length) ||
                  (active.dir === 'down' &&
                    active.col === colIndex &&
                    rowIndex >= active.row &&
                    rowIndex < active.row + active.word.length))
              const selected = cursor.row === rowIndex && cursor.col === colIndex
              const wrong = checked && letter && entries[key] && entries[key] !== letter
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  className={[
                    'crossword-cell',
                    letter ? '' : 'is-block',
                    inWord ? 'is-word' : '',
                    selected ? 'is-selected' : '',
                    wrong ? 'is-wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!letter}
                  tabIndex={-1}
                  onClick={() => {
                    if (selected && wordAt(puzzle, rowIndex, colIndex, cursor.dir === 'across' ? 'down' : 'across')) {
                      select(rowIndex, colIndex, cursor.dir === 'across' ? 'down' : 'across')
                      return
                    }
                    select(rowIndex, colIndex)
                  }}
                >
                  {puzzle.numbers[rowIndex][colIndex] > 0 && (
                    <span className="crossword-number">{puzzle.numbers[rowIndex][colIndex]}</span>
                  )}
                  {entries[key]}
                </button>
              )
            }),
          )}
        </div>
        <div className="crossword-clues">
          <ClueList title="Across" words={across} active={active} onSelect={select} />
          <ClueList title="Down" words={down} active={active} onSelect={select} />
        </div>
      </div>
      <div className="crossword-actions">
        <button type="button" className="button ghost" onClick={() => setChecked(true)}>
          Check
        </button>
        <button
          type="button"
          className="button ghost"
          onClick={() => {
            setEntries({})
            setChecked(false)
          }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

function ClueList({
  title,
  words,
  active,
  onSelect,
}: {
  title: string
  words: CrosswordPuzzle['words']
  active: ReturnType<typeof wordAt>
  onSelect: (row: number, col: number, dir: Direction) => void
}) {
  return (
    <section>
      <h3>{title}</h3>
      <ol>
        {words.map((word) => (
          <li key={`${word.dir}-${word.number}`}>
            <button
              type="button"
              className={active === word ? 'is-active' : undefined}
              onClick={() => onSelect(word.row, word.col, word.dir)}
            >
              <span>{word.number}</span>
              {word.clue}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
