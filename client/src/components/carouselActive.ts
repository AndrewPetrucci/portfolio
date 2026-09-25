import { createContext, useContext } from 'react'

export const CarouselActiveContext = createContext(false)

export function useCarouselActive() {
  return useContext(CarouselActiveContext)
}
