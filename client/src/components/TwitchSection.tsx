import { useState, type FormEvent } from 'react'
import './TwitchSection.css'

const DEFAULT_CHANNEL = 'hasanabi'
const STORAGE_KEY = 'portfolio-twitch-channel'

function parseChannel(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_CHANNEL

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    if (url.hostname === 'twitch.tv' || url.hostname.endsWith('.twitch.tv')) {
      const [channel] = url.pathname.split('/').filter(Boolean)
      if (channel) return channel.toLowerCase()
    }
  } catch {
    // not a URL
  }

  return trimmed.replace(/^@/, '').split(/[/?#\s]/)[0].toLowerCase() || DEFAULT_CHANNEL
}

function loadChannel() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return parseChannel(stored)
  } catch {
    // ignore
  }
  return DEFAULT_CHANNEL
}

function embedParents() {
  const host = window.location.hostname
  const parents = new Set([host])
  if (host === 'localhost') parents.add('127.0.0.1')
  if (host === '127.0.0.1') parents.add('localhost')
  return [...parents]
}

function playerSrc(channel: string) {
  const params = new URLSearchParams({
    channel,
    muted: 'true',
    autoplay: 'true',
  })
  for (const parent of embedParents()) {
    params.append('parent', parent)
  }
  return `https://player.twitch.tv/?${params.toString()}`
}

export function TwitchSection() {
  const [channel, setChannel] = useState(loadChannel)
  const [draft, setDraft] = useState(channel)

  function applyChannel(value: string) {
    const next = parseChannel(value)
    setChannel(next)
    setDraft(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    applyChannel(draft)
  }

  return (
    <section id="twitch" className="section">
      <div className="section-head">
        <h2>Twitch</h2>
        <form className="twitch-channel" onSubmit={handleSubmit}>
          <label>
            <input
              type="text"
              name="channel"
              value={draft}
              spellCheck={false}
              autoComplete="off"
              aria-label="Twitch channel"
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => applyChannel(draft)}
            />
          </label>
        </form>
      </div>
      <div className="twitch-player">
        <iframe
          key={channel}
          src={playerSrc(channel)}
          title={`${channel} on Twitch`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  )
}
