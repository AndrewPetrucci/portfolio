import { describe, expect, it } from 'vitest'
import { pickCarouselFaceIndex, type FaceRect } from './carouselHit'

const FORECAST = 2
const LAYA = 3
const MODEL = 4
const LAVA = 5
const COUNT = 7

function rotateYFor(index: number) {
  return -((index * 360) / COUNT)
}

function rect(left: number, right: number, top = 80, bottom = 480): FaceRect {
  return { left, right, top, bottom }
}

describe('pickCarouselFaceIndex', () => {
  it('selects Model on the left when Lava is front and Theme’s AABB covers Model', () => {
    const faces: FaceRect[] = [
      rect(360, 640),
      rect(200, 500),
      rect(120, 420),
      rect(40, 300),
      rect(80, 420),
      rect(380, 620),
      rect(150, 920),
    ]
    const index = pickCarouselFaceIndex(faces, rotateYFor(LAVA), 220, 280)
    expect(index).toBe(MODEL)
  })

  it('selects Laya on the right when Forecast is front and Model’s AABB covers Laya', () => {
    const faces: FaceRect[] = [
      rect(200, 520),
      rect(80, 380),
      rect(380, 620),
      rect(620, 920),
      rect(500, 950),
      rect(560, 880),
      rect(300, 700),
    ]
    const index = pickCarouselFaceIndex(faces, rotateYFor(FORECAST), 780, 280)
    expect(index).toBe(LAYA)
  })

  it('still selects the front card when neighbor AABBs overlap the center', () => {
    const faces: FaceRect[] = [
      rect(200, 700),
      rect(80, 380),
      rect(360, 640),
      rect(620, 920),
      rect(500, 950),
      rect(560, 880),
      rect(300, 700),
    ]
    const index = pickCarouselFaceIndex(faces, rotateYFor(FORECAST), 500, 280)
    expect(index).toBe(FORECAST)
  })

  it('returns null when the click misses every face', () => {
    const faces: FaceRect[] = Array.from({ length: COUNT }, () => rect(0, 100))
    expect(pickCarouselFaceIndex(faces, 0, 800, 280)).toBeNull()
  })
})
