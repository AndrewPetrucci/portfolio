import '@testing-library/jest-dom/vitest'

class DOMMatrixStub {
  m11 = 1
  m13 = 0

  constructor(source?: string) {
    if (!source || source === 'none') return
    const match = /rotateY\((-?[\d.]+)deg\)/.exec(source)
    if (!match) return
    const radians = (Number(match[1]) * Math.PI) / 180
    this.m11 = Math.cos(radians)
    this.m13 = -Math.sin(radians)
  }
}

if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = DOMMatrixStub as unknown as typeof DOMMatrix
}
