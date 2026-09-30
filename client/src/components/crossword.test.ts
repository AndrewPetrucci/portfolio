import { describe, expect, it } from 'vitest'
import { buildCrossword, daySeed, wordAt } from './buildCrossword'

function lettersOf(word: ReturnType<typeof buildCrossword>['words'][number], puzzle: ReturnType<typeof buildCrossword>) {
  return Array.from({ length: word.word.length }, (_, index) => {
    const row = word.row + (word.dir === 'down' ? index : 0)
    const col = word.col + (word.dir === 'across' ? index : 0)
    return puzzle.letters[row][col]
  }).join('')
}

describe('buildCrossword', () => {
  it('uses the calendar day as a stable seed', () => {
    const morning = new Date(2026, 8, 29, 1, 15)
    const evening = new Date(2026, 8, 29, 23, 40)
    const nextDay = new Date(2026, 8, 30, 1, 15)

    expect(daySeed(morning)).toEqual(daySeed(evening))
    expect(daySeed(morning).dateKey).toBe('2026-09-29')
    expect(daySeed(nextDay).seed).not.toBe(daySeed(morning).seed)

    const first = buildCrossword(morning)
    const second = buildCrossword(evening)
    expect(second).toEqual(first)
    expect(buildCrossword(nextDay).words.map((word) => word.word).join('|')).not.toBe(
      first.words.map((word) => word.word).join('|'),
    )
  })

  it('places a connected crossword whose letters match the clues', () => {
    for (let day = 1; day <= 14; day++) {
      const puzzle = buildCrossword(new Date(2026, 8, day))
      expect(puzzle.words.length).toBeGreaterThanOrEqual(6)
      expect(puzzle.rows).toBeLessThanOrEqual(13)
      expect(puzzle.cols).toBeLessThanOrEqual(13)

      for (const word of puzzle.words) {
        expect(lettersOf(word, puzzle)).toBe(word.word)
        expect(word.number).toBe(puzzle.numbers[word.row][word.col])
        expect(wordAt(puzzle, word.row, word.col, word.dir)?.word).toBe(word.word)
      }
    }
  })
})
