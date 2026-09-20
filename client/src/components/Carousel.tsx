import { Children, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import './Carousel.css'

type CarouselProps = {
  children: ReactNode
}

function wrapIndex(value: number, count: number) {
  return ((value % count) + count) % count
}

function stepToward(current: number, index: number, count: number) {
  const currentIndex = wrapIndex(current, count)
  let delta = index - currentIndex
  if (delta > count / 2) delta -= count
  if (delta < -count / 2) delta += count
  return current + delta
}

export function Carousel({ children }: CarouselProps) {
  const items = Children.toArray(children)
  const [step, setStep] = useState(0)
  const [rotateX, setRotateX] = useState(-9)
  const [rotateZ, setRotateZ] = useState(0)
  const count = items.length

  if (!count) return null

  const theta = -((step * 360) / count)
  const activeIndex = wrapIndex(step, count)

  function goTo(index: number, event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('a, button')) return
    setStep((current) => stepToward(current, index, count))
  }

  return (
    <div>
      <div className="carousel-scene">
        <div
          className="carousel-tilt"
          style={
            {
              '--rx': `${rotateX}deg`,
              '--rz': `${rotateZ}deg`,
            } as CSSProperties
          }
        >
          <div
            className="carousel"
            style={
              {
                '--n': count,
                '--theta': `${theta}deg`,
                ...(count < 2 ? { '--radius': '0px' } : {}),
              } as CSSProperties
            }
          >
            {items.map((child, index) => (
              <div
                key={index}
                className={index === activeIndex ? 'is-active' : undefined}
                style={{ '--i': index } as CSSProperties}
                onClick={(event) => goTo(index, event)}
              >
                {child}
              </div>
            ))}
          </div>
        </div>
        <div className="carousel-sliders">
          <label className="carousel-slider-x">
            <span>Rotate X {rotateX}°</span>
            <input
              type="range"
              min={-25}
              max={25}
              value={rotateX}
              onChange={(event) => setRotateX(Number(event.target.value))}
            />
          </label>
          <label className="carousel-slider-z">
            <span>Rotate Z {rotateZ}°</span>
            <input
              type="range"
              min={-25}
              max={25}
              value={rotateZ}
              onChange={(event) => setRotateZ(Number(event.target.value))}
            />
          </label>
        </div>
      </div>
      {/* {count > 1 && (
        <div className="carousel-controls">
          <div className="carousel-nav">
            <button
              type="button"
              className="button ghost"
              onClick={() => setStep((current) => current - 1)}
            >
              Prev
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => setStep((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )} */}
    </div>
  )
}
