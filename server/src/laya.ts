export type LayaQuestionType = 'choice' | 'score' | 'noul'

export type LayaQuestion = {
  type: LayaQuestionType
  instructions: string
  criteria?: Record<string, string> | string[]
}

export type LayaAnswerView = {
  id: string
  type: LayaQuestionType
  value: string
  confidence: number | null
}

export type LayaResult = {
  model: string
  latencyMs: number
  source: string
  answers: LayaAnswerView[]
}

export class LayaRequestError extends Error {}

const SPACE_URL =
  process.env.LAYA_SPACE_URL || 'https://convaiinnovations-laya-demo.hf.space'
const SERVE_URL = process.env.LAYA_URL?.replace(/\/$/, '') ?? ''
const TIMEOUT_MS = 90_000
const MAX_STATE = 4_000
const MAX_QUESTIONS = 8

type QuestionMap = Record<string, LayaQuestion>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseQuestions(value: unknown): QuestionMap {
  if (!isRecord(value)) {
    throw new LayaRequestError('Questions are required.')
  }

  const ids = Object.keys(value)
  if (!ids.length || ids.length > MAX_QUESTIONS) {
    throw new LayaRequestError('Send between 1 and 8 questions.')
  }

  const questions: QuestionMap = {}

  for (const id of ids) {
    const raw = value[id]
    if (!isRecord(raw)) {
      throw new LayaRequestError(`Question "${id}" is invalid.`)
    }

    const type = asString(raw.type)
    const instructions = asString(raw.instructions)

    if (type !== 'choice' && type !== 'score' && type !== 'noul') {
      throw new LayaRequestError(`Question "${id}" needs type choice, score, or noul.`)
    }

    if (!instructions) {
      throw new LayaRequestError(`Question "${id}" needs instructions.`)
    }

    const question: LayaQuestion = { type, instructions }

    if (type === 'choice') {
      if (!isRecord(raw.criteria) || !Object.keys(raw.criteria).length) {
        throw new LayaRequestError(`Question "${id}" needs choice criteria.`)
      }
      const criteria: Record<string, string> = {}
      for (const [key, label] of Object.entries(raw.criteria)) {
        criteria[key] = asString(label) || key
      }
      question.criteria = criteria
    }

    if (type === 'score') {
      if (!Array.isArray(raw.criteria) || raw.criteria.length < 2) {
        throw new LayaRequestError(`Question "${id}" needs score levels.`)
      }
      question.criteria = raw.criteria.map((level) => asString(level) || String(level))
    }

    questions[id] = question
  }

  return questions
}

function parseState(value: unknown) {
  if (typeof value === 'string') {
    const state = value.trim()
    if (!state) throw new LayaRequestError('A state is required.')
    if (state.length > MAX_STATE) throw new LayaRequestError('That state is too long.')
    return state
  }

  if (isRecord(value) || Array.isArray(value)) {
    const state = JSON.stringify(value)
    if (state.length > MAX_STATE) throw new LayaRequestError('That state is too long.')
    return state
  }

  throw new LayaRequestError('A state is required.')
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function viewAnswer(id: string, value: unknown): LayaAnswerView | null {
  if (!isRecord(value)) return null

  const type = asString(value.type)
  const confidence = asNumber(value.confidence)

  if (type === 'choice' || 'choice' in value) {
    const choice = asString(value.choice)
    if (!choice) return null
    return { id, type: 'choice', value: choice, confidence }
  }

  if (type === 'score' || 'score' in value) {
    const score = asNumber(value.score)
    if (score == null) return null
    return { id, type: 'score', value: String(Math.round(score * 100) / 100), confidence }
  }

  if (type === 'noul' || 'noul' in value) {
    const noul = asNumber(value.noul)
    if (noul == null) return null
    return { id, type: 'noul', value: percent(noul), confidence: null }
  }

  return null
}

function viewFromRaw(raw: unknown, fallbackModel: string, source: string): LayaResult {
  if (!isRecord(raw)) {
    throw new Error('Laya returned an empty response.')
  }

  const answersRaw = isRecord(raw.answers) ? raw.answers : {}
  const answers = Object.entries(answersRaw)
    .map(([id, value]) => viewAnswer(id, value))
    .filter((row): row is LayaAnswerView => Boolean(row))

  if (!answers.length) {
    throw new Error('Laya did not return any answers.')
  }

  return {
    model: asString(raw.model) || fallbackModel,
    latencyMs: Math.round(asNumber(raw.latency_ms) ?? 0),
    source,
    answers,
  }
}

function parseSseComplete(body: string) {
  const blocks = body.split(/\r?\n\r?\n/)

  for (const block of blocks) {
    let event = 'message'
    const data: string[] = []

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
    }

    const payload = data.join('\n')
    if (!payload || payload === '[DONE]') continue

    if (event === 'error' || event === 'unexpected_error') {
      throw new Error(payload || 'Laya returned an error.')
    }

    if (event === 'complete') {
      return JSON.parse(payload) as unknown
    }
  }

  throw new Error('Laya did not finish.')
}

async function runPlayground(state: string, questions: QuestionMap): Promise<LayaResult> {
  const started = await fetch(`${SPACE_URL}/gradio_api/call/run_playground`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify({
      data: [state, JSON.stringify(questions)],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!started.ok) {
    throw new Error('Could not reach the Laya demo.')
  }

  const startBody = (await started.json()) as { event_id?: string }
  if (!startBody.event_id) {
    throw new Error('Could not start the Laya demo.')
  }

  const stream = await fetch(
    `${SPACE_URL}/gradio_api/call/run_playground/${startBody.event_id}`,
    {
      headers: {
        Accept: 'text/event-stream',
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  )

  if (!stream.ok) {
    throw new Error('Could not read the Laya demo.')
  }

  const complete = parseSseComplete(await stream.text())
  if (!Array.isArray(complete) || complete.length < 2) {
    throw new Error('Laya returned an unexpected response.')
  }

  const rawText = complete[1]
  if (typeof rawText !== 'string' || !rawText.trim().startsWith('{')) {
    throw new Error(typeof rawText === 'string' && rawText ? rawText : 'Laya failed.')
  }

  return viewFromRaw(JSON.parse(rawText), 'laya', 'huggingface')
}

async function runServe(state: string, questions: QuestionMap): Promise<LayaResult> {
  const response = await fetch(`${SERVE_URL}/v1/systemone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify({
      state,
      model: 'laya',
      questions,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    const nested = isRecord(data.error) ? asString(data.error.message) : asString(data.error)
    throw new Error(nested || 'Could not reach Laya.')
  }

  return viewFromRaw(data, 'laya', 'laya-serve')
}

export async function runLaya(body: unknown): Promise<LayaResult> {
  if (!isRecord(body)) {
    throw new LayaRequestError('A state and questions are required.')
  }

  const state = parseState(body.state)
  const questions = parseQuestions(body.questions)

  try {
    return SERVE_URL ? await runServe(state, questions) : await runPlayground(state, questions)
  } catch (reason) {
    if (reason instanceof LayaRequestError) throw reason
    if (reason instanceof Error && reason.name === 'TimeoutError') {
      throw new Error('Laya took too long to answer.')
    }
    throw reason instanceof Error ? reason : new Error('Could not run Laya.')
  }
}
