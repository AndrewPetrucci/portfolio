import { LavaLamp } from './LavaLamp'
import './LavaLampCard.css'

export function LavaLampCard() {
  return (
    <article className="card lava-lamp-card">
      <h3>Lava Lamp</h3>
      <LavaLamp />
    </article>
  )
}
