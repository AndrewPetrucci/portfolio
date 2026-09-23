import {
  Children,
  forwardRef,
  isValidElement,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react'
import './Carousel.css'

const INITIAL_ROTATE_X = -12
const INITIAL_ROTATE_Z = -12
const RESET_ROTATE_X = -9
const RESET_ROTATE_Z = 0
const MIN_TILT = -25
const MAX_TILT = 25
const STORAGE_KEY = 'portfolio-carousel'

type CarouselProps = {
  children: ReactNode
}

export type CarouselHandle = {
  reset: () => void
}

type StoredCarousel = {
  rotateX: number
  rotateZ: number
  selectedKey: string | null
}

function shortestAngle(from: number, to: number) {
  let delta = (to - from) % 360
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return from + delta
}

function readRotateY(element: HTMLDivElement) {
  const matrix = new DOMMatrix(getComputedStyle(element).transform)
  return Math.atan2(-matrix.m13, matrix.m11) * (180 / Math.PI)
}

function sliderAxis(target: EventTarget | null): 'x' | 'z' | null {
  const element = target instanceof Element ? target : null
  if (element?.closest('.carousel-slider-x')) return 'x'
  if (element?.closest('.carousel-slider-z')) return 'z'
  return null
}

function clampTilt(value: number) {
  return Math.min(MAX_TILT, Math.max(MIN_TILT, Math.round(value)))
}

function defaultStored(): StoredCarousel {
  return {
    rotateX: INITIAL_ROTATE_X,
    rotateZ: INITIAL_ROTATE_Z,
    selectedKey: null,
  }
}

function loadStored(): StoredCarousel {
  const defaults = defaultStored()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaults
    const value = parsed as Partial<StoredCarousel>
    return {
      rotateX: typeof value.rotateX === 'number' ? clampTilt(value.rotateX) : defaults.rotateX,
      rotateZ: typeof value.rotateZ === 'number' ? clampTilt(value.rotateZ) : defaults.rotateZ,
      selectedKey: typeof value.selectedKey === 'string' ? value.selectedKey : null,
    }
  } catch {
    return defaults
  }
}

function saveStored(state: StoredCarousel) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function itemKey(child: ReactNode, index: number) {
  if (isValidElement(child) && child.key != null) return String(child.key)
  return `index-${index}`
}

export const Carousel = forwardRef<CarouselHandle, CarouselProps>(function Carousel(
  { children },
  ref,
) {
  const items = Children.toArray(children)
  const count = items.length
  const keysJoined = items.map((child, index) => itemKey(child, index)).join('|')
  const [stored] = useState(loadStored)
  const carouselRef = useRef<HTMLDivElement>(null)
  const rotateXRef = useRef(stored.rotateX)
  const rotateZRef = useRef(stored.rotateZ)
  const selectedKeyRef = useRef(stored.selectedKey)
  const skipRestoreRef = useRef(false)
  const [idle, setIdle] = useState(stored.selectedKey == null)
  const [theta, setTheta] = useState(0)
  const [rotateX, setRotateX] = useState(stored.rotateX)
  const [rotateZ, setRotateZ] = useState(stored.rotateZ)
  const [selectedKey, setSelectedKey] = useState<string | null>(stored.selectedKey)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [restoring, setRestoring] = useState(stored.selectedKey != null)
  const [tiltAxis, setTiltAxis] = useState<'x' | 'z' | null>(null)

  rotateXRef.current = rotateX
  rotateZRef.current = rotateZ
  selectedKeyRef.current = selectedKey

  function persist(next: Partial<StoredCarousel>) {
    saveStored({
      rotateX: rotateXRef.current,
      rotateZ: rotateZRef.current,
      selectedKey: selectedKeyRef.current,
      ...next,
    })
  }

  useLayoutEffect(() => {
    if (!selectedKey || !count) return
    const index = items.findIndex((child, itemIndex) => itemKey(child, itemIndex) === selectedKey)
    if (index < 0) {
      setIdle(true)
      setRestoring(false)
      setActiveIndex(null)
      setSelectedKey(null)
      persist({ selectedKey: null })
      return
    }

    if (skipRestoreRef.current) {
      skipRestoreRef.current = false
      return
    }

    setRestoring(true)
    setIdle(false)
    setActiveIndex(index)
    setTheta(-((index * 360) / count))
    requestAnimationFrame(() => setRestoring(false))
  }, [selectedKey, count, keysJoined])

  useImperativeHandle(ref, () => ({
    reset() {
      setRotateX(RESET_ROTATE_X)
      setRotateZ(RESET_ROTATE_Z)
      setIdle(true)
      setActiveIndex(null)
      setSelectedKey(null)
      setTheta(0)
      persist({
        rotateX: RESET_ROTATE_X,
        rotateZ: RESET_ROTATE_Z,
        selectedKey: null,
      })
    },
  }))

  if (!count) return null

  function goTo(index: number, event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('a, button, input, textarea, select, label')) return

    const key = itemKey(items[index], index)
    const target = -((index * 360) / count)
    if (key !== selectedKeyRef.current) skipRestoreRef.current = true
    setSelectedKey(key)
    setActiveIndex(index)
    persist({ selectedKey: key })

    if (!idle) {
      setTheta((current) => shortestAngle(current, target))
      return
    }

    const from = carouselRef.current ? readRotateY(carouselRef.current) : theta
    setIdle(false)
    setTheta(from)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTheta(shortestAngle(from, target))
      })
    })
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
            ref={carouselRef}
            className={[
              'carousel',
              idle && count > 1 ? 'is-idle' : '',
              restoring ? 'is-restoring' : '',
            ]
              .filter(Boolean)
              .join(' ')}
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
                key={itemKey(child, index)}
                className={index === activeIndex ? 'is-active' : undefined}
                style={{ '--i': index } as CSSProperties}
                onClick={(event) => goTo(index, event)}
              >
                {child}
              </div>
            ))}
          </div>
        </div>
        <div
          className="carousel-sliders"
          onPointerDown={(event) => {
            const axis = sliderAxis(event.target)
            if (!axis) return

            setTiltAxis(axis)
            const endTilt = () => {
              setTiltAxis(null)
              window.removeEventListener('pointerup', endTilt)
              window.removeEventListener('pointercancel', endTilt)
            }
            window.addEventListener('pointerup', endTilt)
            window.addEventListener('pointercancel', endTilt)
          }}
          onFocusCapture={(event) => {
            const axis = sliderAxis(event.target)
            if (axis) setTiltAxis(axis)
          }}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setTiltAxis(null)
            }
          }}
        >
          <label className="carousel-slider-x">
            <span>Rotate X {rotateX}°</span>
            <input
              type="range"
              min={MIN_TILT}
              max={MAX_TILT}
              value={rotateX}
              onChange={(event) => {
                const value = Number(event.target.value)
                setRotateX(value)
                persist({ rotateX: value })
              }}
            />
          </label>
          <label className="carousel-slider-z">
            <span>Rotate Z {rotateZ}°</span>
            <input
              type="range"
              min={MIN_TILT}
              max={MAX_TILT}
              value={rotateZ}
              onChange={(event) => {
                const value = Number(event.target.value)
                setRotateZ(value)
                persist({ rotateZ: value })
              }}
            />
          </label>
          {tiltAxis && (
            <p className="carousel-slider-readout" aria-hidden="true">
              {tiltAxis === 'x' ? `X ${rotateX}°` : `Z ${rotateZ}°`}
            </p>
          )}
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
})
