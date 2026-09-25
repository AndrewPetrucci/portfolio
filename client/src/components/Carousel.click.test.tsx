import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Carousel } from './Carousel'
import type { FaceRect } from './carouselHit'

const STORAGE_KEY = 'portfolio-carousel'
const FORECAST = 2
const LAYA = 3
const MODEL = 4
const LAVA = 5
const THEME = 6

function rect(left: number, right: number, top = 80, bottom = 480): FaceRect {
  return { left, right, top, bottom }
}

const separated: FaceRect[] = [
  rect(0, 90),
  rect(100, 190),
  rect(200, 290),
  rect(300, 390),
  rect(400, 490),
  rect(500, 590),
  rect(600, 690),
]

const lavaFrontOverlap: FaceRect[] = [
  rect(360, 640),
  rect(200, 500),
  rect(120, 420),
  rect(40, 300),
  rect(80, 420),
  rect(380, 620),
  rect(150, 920),
]

const forecastFrontOverlap: FaceRect[] = [
  rect(200, 520),
  rect(80, 380),
  rect(380, 620),
  rect(620, 920),
  rect(500, 950),
  rect(560, 880),
  rect(300, 700),
]

function mockFaceRects(faces: FaceRect[]) {
  const carousel = document.querySelector('.carousel')
  if (!carousel) throw new Error('carousel missing')
  Array.from(carousel.children).forEach((child, index) => {
    const box = faces[index]
    vi.spyOn(child as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      x: box.left,
      y: box.top,
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      width: box.right - box.left,
      height: box.bottom - box.top,
      toJSON() {
        return {}
      },
    })
  })
}

function faceWraps() {
  const carousel = document.querySelector('.carousel')
  if (!carousel) throw new Error('carousel missing')
  return Array.from(carousel.children) as HTMLElement[]
}

function renderRing() {
  return render(
    <Carousel>
      <article>Oil</article>
      <article>News</article>
      <article>Forecast</article>
      <article>
        Laya
        <button type="button">Support</button>
      </article>
      <article>Model</article>
      <article>Lava</article>
      <article>Theme</article>
    </Carousel>,
  )
}

function clickFace(wrap: HTMLElement, clientX: number, clientY: number) {
  fireEvent.click(wrap, { clientX, clientY })
}

async function flushRotation() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))
  })
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY)
})

describe('carousel click targeting', () => {
  it('rotates to Model when Lava is front and the click lands on Theme’s overlapping box', async () => {
    renderRing()
    mockFaceRects(separated)
    clickFace(faceWraps()[LAVA], 545, 280)
    await flushRotation()
    expect(faceWraps()[LAVA]).toHaveClass('is-active')

    vi.restoreAllMocks()
    mockFaceRects(lavaFrontOverlap)
    clickFace(faceWraps()[THEME], 220, 280)
    expect(faceWraps()[MODEL]).toHaveClass('is-active')
    expect(faceWraps()[THEME]).not.toHaveClass('is-active')
  })

  it('rotates to Laya when Forecast is front and the click lands on Model’s overlapping box', async () => {
    renderRing()
    mockFaceRects(separated)
    clickFace(faceWraps()[FORECAST], 245, 280)
    await flushRotation()
    expect(faceWraps()[FORECAST]).toHaveClass('is-active')

    vi.restoreAllMocks()
    mockFaceRects(forecastFrontOverlap)
    clickFace(faceWraps()[MODEL], 780, 280)
    expect(faceWraps()[LAYA]).toHaveClass('is-active')
    expect(faceWraps()[MODEL]).not.toHaveClass('is-active')
  })

  it('selects Model when a click passes through the transparent card onto the scene', async () => {
    renderRing()
    mockFaceRects(separated)
    clickFace(faceWraps()[LAVA], 545, 280)
    await flushRotation()

    vi.restoreAllMocks()
    mockFaceRects(lavaFrontOverlap)
    fireEvent.click(document.querySelector('.carousel-scene') as HTMLElement, {
      clientX: 220,
      clientY: 280,
    })
    expect(faceWraps()[MODEL]).toHaveClass('is-active')
  })

  it('selects Laya when a click passes through a later face onto the scene', async () => {
    renderRing()
    mockFaceRects(separated)
    clickFace(faceWraps()[FORECAST], 245, 280)
    await flushRotation()

    vi.restoreAllMocks()
    mockFaceRects(forecastFrontOverlap)
    fireEvent.click(document.querySelector('.carousel-scene') as HTMLElement, {
      clientX: 780,
      clientY: 280,
    })
    expect(faceWraps()[LAYA]).toHaveClass('is-active')
  })
})
