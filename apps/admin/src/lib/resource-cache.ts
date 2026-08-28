import { useCallback, useEffect, useState } from 'react'

export type CachedResourceState<T> = {
  status: 'loading' | 'error' | 'success'
  data?: T
  message?: string
  refreshing: boolean
}

type CacheEntry = { data: unknown; updatedAt: number }
type InFlight = { promise: Promise<unknown>; controller: AbortController }

const entries = new Map<string, CacheEntry>()
const inFlight = new Map<string, InFlight>()
const listeners = new Map<string, Set<() => void>>()
let generation = 0

export const ADMIN_STALE_TIME_MS = {
  session: 5 * 60_000,
  dashboard: 60_000,
  users: 60_000,
  subscriptions: 60_000,
  system: 45_000,
  userDetail: 60_000,
} as const

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener())
}

function subscribe(key: string, listener: () => void) {
  const current = listeners.get(key) ?? new Set()
  current.add(listener)
  listeners.set(key, current)
  return () => {
    current.delete(listener)
    if (!current.size) listeners.delete(key)
  }
}

async function request<T>(key: string, loader: (signal: AbortSignal) => Promise<T>, force: boolean) {
  if (!force && inFlight.has(key)) return inFlight.get(key)!.promise as Promise<T>
  if (force) inFlight.get(key)?.controller.abort()
  const controller = new AbortController()
  const requestGeneration = generation
  const promise = loader(controller.signal).then((data) => {
    if (requestGeneration === generation && !controller.signal.aborted) {
      entries.set(key, { data, updatedAt: Date.now() })
      notify(key)
    }
    return data
  }).finally(() => {
    if (inFlight.get(key)?.promise === promise) inFlight.delete(key)
  })
  inFlight.set(key, { promise, controller })
  notify(key)
  return promise
}

export function clearAdminResourceCache() {
  generation += 1
  inFlight.forEach(({ controller }) => controller.abort())
  inFlight.clear()
  entries.clear()
  listeners.forEach((group) => group.forEach((listener) => listener()))
}

export function useCachedAdminResource<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  staleTime: number,
  enabled = true,
) {
  const snapshot = () => entries.get(key) as CacheEntry | undefined
  const [state, setState] = useState<CachedResourceState<T>>(() => ({
    status: snapshot() ? 'success' : 'loading',
    data: snapshot()?.data as T | undefined,
    refreshing: false,
  }))

  const load = useCallback(async (force = false) => {
    if (!enabled) return
    const cached = snapshot()
    setState((current) => ({ status: cached ? 'success' : 'loading', data: (cached?.data as T | undefined) ?? current.data, refreshing: Boolean(cached), message: undefined }))
    try {
      await request(key, loader, force)
      const next = snapshot()
      setState({ status: 'success', data: next?.data as T, refreshing: false })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const retained = snapshot()
      setState({ status: retained ? 'success' : 'error', data: retained?.data as T | undefined, refreshing: false, message: error instanceof Error ? error.message : undefined })
    }
  }, [enabled, key, loader])

  useEffect(() => {
    const unsubscribe = subscribe(key, () => {
      const cached = snapshot()
      if (cached) setState((current) => ({ ...current, status: 'success', data: cached.data as T }))
    })
    if (enabled) {
      const cached = snapshot()
      if (!cached || Date.now() - cached.updatedAt >= staleTime) void load(false)
    }
    return unsubscribe
  }, [enabled, key, load, staleTime])

  return { ...state, retry: () => load(true) }
}
