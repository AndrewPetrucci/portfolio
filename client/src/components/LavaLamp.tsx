import type { CSSProperties } from 'react'
import './LavaLamp.css'

type Blob = {
  id: string
  from: 'top' | 'bottom'
  size: number
  left: string
  duration: number
  delay: number
  drift: number
}

const BLOBS: Blob[] = [
  { id: 'd1', from: 'top', size: 58, left: '10%', duration: 14, delay: -3, drift: 22 },
  { id: 'd2', from: 'top', size: 86, left: '34%', duration: 21, delay: -11, drift: -16 },
  { id: 'd3', from: 'top', size: 44, left: '58%', duration: 12, delay: -6, drift: 28 },
  { id: 'd4', from: 'top', size: 72, left: '72%', duration: 18, delay: -14, drift: -24 },
  { id: 'd5', from: 'top', size: 50, left: '22%', duration: 26, delay: -8, drift: 12 },
  { id: 'u1', from: 'bottom', size: 96, left: '16%', duration: 23, delay: -5, drift: 18 },
  { id: 'u2', from: 'bottom', size: 48, left: '44%', duration: 13, delay: -9, drift: -20 },
  { id: 'u3', from: 'bottom', size: 78, left: '62%', duration: 19, delay: -2, drift: 14 },
  { id: 'u4', from: 'bottom', size: 40, left: '8%', duration: 11, delay: -7, drift: 26 },
  { id: 'u5', from: 'bottom', size: 64, left: '78%', duration: 17, delay: -12, drift: -18 },
]

export function LavaLamp() {
  return (
    <div className="lava-lamp" aria-hidden="true">
      <div className="lava-lamp-goo">
        <div className="lava-pool lava-pool-top" />
        <div className="lava-pool lava-pool-bottom" />
        {BLOBS.map((blob) => (
          <div
            key={blob.id}
            className={`lava-blob lava-blob-${blob.from}`}
            style={
              {
                '--size': `${blob.size}px`,
                '--left': blob.left,
                '--duration': `${blob.duration}s`,
                '--delay': `${blob.delay}s`,
                '--drift': `${blob.drift}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  )
}
