import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchForecast } from './forecast.js'
import { fetchNews, normalizeQuery } from './news.js'
import { fetchOilPrices } from './oil.js'
import { fetchWikiPreview, normalizeWikipediaUrl } from './wiki.js'
import { profile, projects } from './data/portfolio.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 3001
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const isProduction = process.env.NODE_ENV === 'production'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type ContactMessage = {
  id: number
  name: string
  email: string
  message: string
  receivedAt: string
}

const messages: ContactMessage[] = []

app.use(
  cors({
    origin: isProduction ? true : clientOrigin,
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'portfolio-api' })
})

app.get('/api/profile', (_req, res) => {
  res.json(profile)
})

app.get('/api/projects', (_req, res) => {
  res.json(projects)
})

app.get('/api/forecast', async (req, res) => {
  const latitude = Number(req.query.lat)
  const longitude = Number(req.query.lon)
  const unit = req.query.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius'

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    res.status(400).json({ error: 'Latitude and longitude are required.' })
    return
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    res.status(400).json({ error: 'That location looks invalid.' })
    return
  }

  try {
    const forecast = await fetchForecast(latitude, longitude, unit)
    res.json(forecast)
  } catch {
    res.status(502).json({ error: 'Could not load the forecast.' })
  }
})

app.get('/api/oil', async (_req, res) => {
  try {
    const oil = await fetchOilPrices()
    res.json(oil)
  } catch {
    res.status(502).json({ error: 'Could not load oil prices.' })
  }
})

app.get('/api/news', async (req, res) => {
  const query = normalizeQuery(req.query.q)

  if (query.length < 2) {
    res.status(400).json({ error: 'A news query is required.' })
    return
  }

  try {
    const feed = await fetchNews(query)
    res.json(feed)
  } catch {
    res.status(502).json({ error: 'Could not load the news feed.' })
  }
})

app.get('/api/wiki', async (req, res) => {
  let href = ''

  try {
    href = normalizeWikipediaUrl(req.query.url)
  } catch (reason) {
    res.status(400).json({
      error: reason instanceof Error ? reason.message : 'A Wikipedia link is required.',
    })
    return
  }

  try {
    const preview = await fetchWikiPreview(href)
    res.json(preview)
  } catch {
    res.status(502).json({ error: 'Could not load the Wikipedia preview.' })
  }
})

app.post('/api/contact', (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  const email = String(req.body?.email ?? '').trim()
  const message = String(req.body?.message ?? '').trim()

  if (name.length < 2) {
    res.status(400).json({ error: 'Please enter your name.' })
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' })
    return
  }

  if (message.length < 10) {
    res.status(400).json({ error: 'Please write a slightly longer message.' })
    return
  }

  const entry: ContactMessage = {
    id: messages.length + 1,
    name,
    email,
    message,
    receivedAt: new Date().toISOString(),
  }

  messages.push(entry)
  console.log('Contact message received:', entry)

  res.status(201).json({
    ok: true,
    message: 'Thanks — your message was received.',
  })
})

if (isProduction) {
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next()
      return
    }
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`)
})
