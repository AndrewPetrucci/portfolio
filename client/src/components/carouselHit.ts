export type FaceRect = {
  left: number
  right: number
  top: number
  bottom: number
}

function wrapAngle(degrees: number) {
  let facing = degrees % 360
  if (facing > 180) facing -= 360
  if (facing <= -180) facing += 360
  return facing
}

export function faceFacing(rotateY: number, index: number, count: number) {
  if (count < 1) return 0
  return wrapAngle(rotateY + (index * 360) / count)
}

export function pickCarouselFaceIndex(
  faces: FaceRect[],
  rotateY: number,
  clientX: number,
  clientY: number,
) {
  const count = faces.length
  if (!count) return null

  let best: { index: number; absFacing: number; dist: number } | null = null

  for (let index = 0; index < count; index++) {
    const rect = faces[index]
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      continue
    }

    const absFacing = Math.abs(faceFacing(rotateY, index, count))
    const centerX = (rect.left + rect.right) / 2
    const centerY = (rect.top + rect.bottom) / 2
    const dist = (clientX - centerX) ** 2 + (clientY - centerY) ** 2

    if (
      !best ||
      absFacing < best.absFacing - 0.01 ||
      (Math.abs(absFacing - best.absFacing) <= 0.01 && dist < best.dist)
    ) {
      best = { index, absFacing, dist }
    }
  }

  return best?.index ?? null
}
