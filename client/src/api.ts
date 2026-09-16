import type { Profile, Project } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const data = (await response.json().catch(() => ({}))) as T & { error?: string }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.')
  }

  return data
}

export function getProfile() {
  return request<Profile>('/api/profile')
}

export function getProjects() {
  return request<Project[]>('/api/projects')
}

export function sendMessage(body: { name: string; email: string; message: string }) {
  return request<{ ok: boolean; message: string }>('/api/contact', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
