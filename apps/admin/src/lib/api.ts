import { supabase } from './supabase'
import type { AdminApi, UserDetail } from '../../shared/types'

export class AdminApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function adminRequest<K extends keyof AdminApi>(resource: K): Promise<AdminApi[K]> {
  const session = await supabase?.auth.getSession()
  const token = session?.data.session?.access_token
  if (!token) throw new AdminApiError('Tu sesión expiró. Vuelve a iniciar sesión.', 401)
  const response = await fetch(`/api/admin?resource=${resource}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = (await response.json()) as { data?: AdminApi[K]; message?: string }
  if (!response.ok || body.data === undefined) {
    throw new AdminApiError(body.message ?? 'No pudimos cargar la información.', response.status)
  }
  return body.data
}

export async function getUserDetail(userId: string, workspaceId: string): Promise<UserDetail> {
  const session = await supabase?.auth.getSession()
  const token = session?.data.session?.access_token
  if (!token) throw new AdminApiError('Tu sesión expiró. Vuelve a iniciar sesión.', 401)
  const query = new URLSearchParams({ resource: 'user', userId, workspaceId })
  const response = await fetch(`/api/admin?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = (await response.json()) as { data?: UserDetail; message?: string }
  if (!response.ok || !body.data) throw new AdminApiError(body.message ?? 'No pudimos cargar la ficha.', response.status)
  return body.data
}
