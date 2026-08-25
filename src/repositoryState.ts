import { useCallback, useRef, useState } from 'react'

export type RepositoryStatus = 'idle' | 'loading' | 'success' | 'error'

export function useRepositoryAction() {
  const [status, setStatus] = useState<RepositoryStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)

  const run = useCallback(async <T,>(operation: () => T | Promise<T>) => {
    if (running.current) return undefined
    running.current = true
    setStatus('loading')
    setError(null)
    try {
      const result = await operation()
      setStatus('success')
      return result
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'No pudimos completar la acción.')
      throw cause
    } finally {
      running.current = false
    }
  }, [])

  const reset = useCallback(() => { setStatus('idle'); setError(null) }, [])
  return { status, error, loading: status === 'loading', run, reset }
}
