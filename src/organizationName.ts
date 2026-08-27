import type { OrganizationData } from './data'

export type NewOrganizationRecord = Omit<OrganizationData, 'id' | 'createdAt' | 'updatedAt'>

export const normalizeOrganizationName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()

export function findOrganizationByName<T extends Pick<OrganizationData, 'id' | 'name'>>(organizations: T[], name: string, excludeId?: string) {
  const normalized = normalizeOrganizationName(name)
  if (!normalized) return undefined
  return organizations.find(organization => organization.id !== excludeId && normalizeOrganizationName(organization.name) === normalized)
}
