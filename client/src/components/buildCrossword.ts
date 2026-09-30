import { CROSSWORD_WORDS, type CrosswordEntry } from './crosswordWords'

export type Direction = 'across' | 'down'

export type PlacedWord = {
  word: string
  clue: string
  row: number
  col: number
  dir: Direction
  number: number
}

export type Crossword = {
  seed: number
  dateKey: string
  rows: number
  cols: number
  letters: string[][]
  numbers: number[][]
  words: PlacedWord[]
}

const MAX_SPAN = 13
const MAX_WORDS = 12

export function daySeed(date: Date) {
  const dateKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')

  let hash = 2166136261
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return { dateKey, seed: hash >>> 0 }
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], random: () => number) {
  const next = items.slice()
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = next[i]
    next[i] = next[j]
    next[j] = swap
  }
  return next
}

function cellKey(row: number, col: number) {
  return `${row},${col}`
}

function parseKey(key: string) {
  const [row, col] = key.split(',').map(Number)
  return { row, col }
}

type Slot = {
  row: number
  col: number
  dir: Direction
  overlaps: number
}

function boundsOf(grid: Map<string, string>, extra?: { row: number; col: number; endRow: number; endCol: number }) {
  let minRow = extra?.row ?? Infinity
  let maxRow = extra?.endRow ?? -Infinity
  let minCol = extra?.col ?? Infinity
  let maxCol = extra?.endCol ?? -Infinity

  for (const key of grid.keys()) {
    const { row, col } = parseKey(key)
    minRow = Math.min(minRow, row)
    maxRow = Math.max(maxRow, row)
    minCol = Math.min(minCol, col)
    maxCol = Math.max(maxCol, col)
  }

  return { minRow, maxRow, minCol, maxCol }
}

function canPlace(grid: Map<string, string>, word: string, row: number, col: number, dir: Direction) {
  const down = dir === 'down'
  const stepRow = down ? 1 : 0
  const stepCol = down ? 0 : 1
  const endRow = row + stepRow * (word.length - 1)
  const endCol = col + stepCol * (word.length - 1)

  if (grid.has(cellKey(row - stepRow, col - stepCol))) return null
  if (grid.has(cellKey(endRow + stepRow, endCol + stepCol))) return null

  const box = boundsOf(grid, { row, col, endRow, endCol })
  if (box.maxRow - box.minRow + 1 > MAX_SPAN || box.maxCol - box.minCol + 1 > MAX_SPAN) return null

  let overlaps = 0
  for (let i = 0; i < word.length; i++) {
    const nextRow = row + stepRow * i
    const nextCol = col + stepCol * i
    const existing = grid.get(cellKey(nextRow, nextCol))
    if (existing) {
      if (existing !== word[i]) return null
      overlaps += 1
      continue
    }

    const sideRow = down ? 0 : 1
    const sideCol = down ? 1 : 0
    if (grid.has(cellKey(nextRow - sideRow, nextCol - sideCol))) return null
    if (grid.has(cellKey(nextRow + sideRow, nextCol + sideCol))) return null
  }

  if (grid.size > 0 && (overlaps === 0 || overlaps === word.length)) return null
  return { overlaps, endRow, endCol }
}

function slotsFor(grid: Map<string, string>, word: string): Slot[] {
  const seen = new Set<string>()
  const slots: Slot[] = []

  for (const [key, letter] of grid) {
    const { row, col } = parseKey(key)
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== letter) continue
      const candidates: Array<{ row: number; col: number; dir: Direction }> = [
        { row, col: col - i, dir: 'across' },
        { row: row - i, col, dir: 'down' },
      ]
      for (const candidate of candidates) {
        const id = `${candidate.dir}:${candidate.row},${candidate.col}`
        if (seen.has(id)) continue
        seen.add(id)
        const placed = canPlace(grid, word, candidate.row, candidate.col, candidate.dir)
        if (!placed) continue
        slots.push({ ...candidate, overlaps: placed.overlaps })
      }
    }
  }

  return slots
}

function writeWord(grid: Map<string, string>, word: string, row: number, col: number, dir: Direction) {
  const stepRow = dir === 'down' ? 1 : 0
  const stepCol = dir === 'down' ? 0 : 1
  for (let i = 0; i < word.length; i++) {
    grid.set(cellKey(row + stepRow * i, col + stepCol * i), word[i])
  }
}

function placeEntries(entries: CrosswordEntry[], random: () => number) {
  const grid = new Map<string, string>()
  const placed: Array<Omit<PlacedWord, 'number'>> = []
  const order = shuffle(entries, random)
  const pending = order.slice()

  for (let pass = 0; pass < 2 && placed.length < MAX_WORDS; pass++) {
    const skipped: CrosswordEntry[] = []
    for (const entry of pending) {
      if (placed.length >= MAX_WORDS) break
      if (grid.size === 0) {
        writeWord(grid, entry.word, 0, 0, 'across')
        placed.push({ ...entry, row: 0, col: 0, dir: 'across' })
        continue
      }

      const slots = slotsFor(grid, entry.word)
      if (!slots.length) {
        skipped.push(entry)
        continue
      }

      const best = Math.max(...slots.map((slot) => slot.overlaps))
      const choices = slots.filter((slot) => slot.overlaps === best)
      const slot = choices[Math.floor(random() * choices.length)]
      writeWord(grid, entry.word, slot.row, slot.col, slot.dir)
      placed.push({ ...entry, row: slot.row, col: slot.col, dir: slot.dir })
    }
    pending.length = 0
    pending.push(...skipped)
  }

  return { grid, placed }
}

export function buildCrossword(date: Date, entries: readonly CrosswordEntry[] = CROSSWORD_WORDS): Crossword {
  const { dateKey, seed } = daySeed(date)
  const bank = entries.filter((entry, index) => {
    return /^[A-Z]{3,}$/.test(entry.word) && entries.findIndex((item) => item.word === entry.word) === index
  })
  const { grid, placed } = placeEntries(bank, mulberry32(seed))
  const box = boundsOf(grid)
  const rows = grid.size ? box.maxRow - box.minRow + 1 : 0
  const cols = grid.size ? box.maxCol - box.minCol + 1 : 0
  const letters = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''))
  const numbers = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))

  for (const [key, letter] of grid) {
    const { row, col } = parseKey(key)
    letters[row - box.minRow][col - box.minCol] = letter
  }

  const words = placed
    .map((word) => ({
      ...word,
      row: word.row - box.minRow,
      col: word.col - box.minCol,
      number: 0,
    }))
    .sort((a, b) => a.row - b.row || a.col - b.col || (a.dir === b.dir ? 0 : a.dir === 'across' ? -1 : 1))

  let nextNumber = 1
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!letters[row][col]) continue
      const startsAcross = !letters[row][col - 1] && Boolean(letters[row][col + 1])
      const startsDown = !letters[row - 1]?.[col] && Boolean(letters[row + 1]?.[col])
      if (!startsAcross && !startsDown) continue
      numbers[row][col] = nextNumber
      for (const word of words) {
        if (word.row === row && word.col === col) word.number = nextNumber
      }
      nextNumber += 1
    }
  }

  return { seed, dateKey, rows, cols, letters, numbers, words }
}

export function wordAt(puzzle: Crossword, row: number, col: number, dir: Direction) {
  return puzzle.words.find((word) => {
    if (word.dir !== dir) return false
    if (dir === 'across') {
      return word.row === row && col >= word.col && col < word.col + word.word.length
    }
    return word.col === col && row >= word.row && row < word.row + word.word.length
  })
}
