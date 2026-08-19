import type { AccountData } from './data'

export type EmailAccount = {
  id: number
  email?: string
}

export type NewAccountRecord = Omit<AccountData, 'id' | 'initials' | 'color'>

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))

// The demo has one active workspace, so this collection represents the future
// workspace_id + normalized email uniqueness boundary in PostgreSQL.
export function findAccountByEmail<T extends EmailAccount>(accounts: T[], email: string, excludeId?: number) {
  const normalized = normalizeEmail(email)
  if (!normalized) return undefined
  return accounts.find(account => account.id !== excludeId && normalizeEmail(account.email || '') === normalized)
}

export function prepareAccountCreate(accounts: AccountData[], record: NewAccountRecord, colors: string[]) {
  const normalizedEmail = normalizeEmail(record.email || '')
  const existing = findAccountByEmail(accounts, normalizedEmail)
  if (existing) return { account: existing, created: false }
  const names = record.name.trim().split(/\s+/)
  const account: AccountData = {
    ...record,
    email: normalizedEmail || undefined,
    id: accounts.reduce((max, account) => Math.max(max, account.id), 0) + 1,
    initials: names.slice(0, 2).map(name => name[0]?.toUpperCase()).join(''),
    color: colors[accounts.length % colors.length],
  }
  return { account, created: true }
}
