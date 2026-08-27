import type { AccountData, ActivityData, EngagementData, PrestationData } from './data'

export type CalendarEvent = {
  id: string
  recordId: string
  kind: 'prestation' | 'activity'
  timestamp: number
  title: string
  accountId?: string
  accountName: string
  engagementId?: string
  engagementName?: string
  status: string
  detail: string
  source?: ActivityData['source']
}

export type TimelineRow = {
  engagement: EngagementData
  account?: AccountData
  milestones: Array<{ prestation: PrestationData; timestamp: number; outsideRange: boolean }>
  start: number
  end: number
  progress: number
}

const months: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 }

export function parsePlanningDate(value?: string): number {
  if (!value) return 0
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12).getTime()
  const iso = Date.parse(value)
  if (!Number.isNaN(iso)) return iso
  const display = value.match(/^(\d{1,2}) ([a-záéíóú]{3})(?:\s*[·,]\s*(\d{1,2}):(\d{2}))?/i)
  const month = display ? months[display[2].toLocaleLowerCase('es-CL')] : undefined
  if (!display || month === undefined) return 0
  return new Date(2026, month, Number(display[1]), Number(display[3] || 12), Number(display[4] || 0)).getTime()
}

export function activityCalendarTimestamp(activity: ActivityData) {
  return parsePlanningDate(activity.scheduledAt ?? activity.completedAt ?? activity.createdAt ?? activity.date)
}

export function buildCalendarEvents(input: {
  prestations: PrestationData[]
  activities: ActivityData[]
  accounts: AccountData[]
  engagements: EngagementData[]
}): CalendarEvent[] {
  const accountById = new Map(input.accounts.map(account => [account.id, account]))
  const engagementById = new Map(input.engagements.map(engagement => [engagement.id, engagement]))
  const prestationEvents: CalendarEvent[] = input.prestations.flatMap(prestation => {
    const timestamp = parsePlanningDate(prestation.date)
    if (!timestamp) return []
    return [{ id: `prestation-${prestation.id}`, recordId: prestation.id, kind: 'prestation', timestamp, title: prestation.name, accountId: prestation.accountId, accountName: accountById.get(prestation.accountId)?.name || prestation.account, engagementId: prestation.engagementId, engagementName: engagementById.get(prestation.engagementId || '')?.name, status: prestation.status, detail: prestation.description || prestation.origin }]
  })
  const activityEvents: CalendarEvent[] = input.activities.flatMap(activity => {
    const timestamp = activityCalendarTimestamp(activity)
    if (!timestamp) return []
    return [{ id: `activity-${activity.id}`, recordId: activity.id, kind: 'activity', timestamp, title: activity.title, accountId: activity.accountId, accountName: accountById.get(activity.accountId || '')?.name || activity.relation.split(' · ')[0] || 'Sin cuenta', engagementId: activity.engagementId, engagementName: engagementById.get(activity.engagementId || '')?.name, status: activity.status, detail: activity.description || activity.type, source: activity.source }]
  })
  return [...prestationEvents, ...activityEvents].sort((left, right) => left.timestamp - right.timestamp)
}

export function buildTimelineRows(input: {
  engagements: EngagementData[]
  prestations: PrestationData[]
  accounts: AccountData[]
}): { dated: TimelineRow[]; undated: EngagementData[] } {
  const accountById = new Map(input.accounts.map(account => [account.id, account]))
  const dated: TimelineRow[] = []
  const undated: EngagementData[] = []
  input.engagements.forEach(engagement => {
    const start = parsePlanningDate(engagement.startDate)
    const end = parsePlanningDate(engagement.endDate)
    if (!start || !end || end < start) { undated.push(engagement); return }
    const related = input.prestations.filter(prestation => prestation.engagementId === engagement.id)
    const milestones = related.map(prestation => {
      const timestamp = parsePlanningDate(prestation.date)
      return { prestation, timestamp, outsideRange: Boolean(timestamp && (timestamp < start || timestamp > end)) }
    }).filter(milestone => milestone.timestamp)
    const completed = related.filter(prestation => prestation.status === 'Completada').length
    dated.push({ engagement, account: accountById.get(engagement.accountId || ''), milestones, start, end, progress: related.length ? Math.round(completed / related.length * 100) : 0 })
  })
  return { dated: dated.sort((left, right) => left.start - right.start), undated }
}

export function timelineBounds(rows: TimelineRow[]) {
  if (!rows.length) return { start: 0, end: 0, duration: 1 }
  const start = Math.min(...rows.map(row => Math.min(row.start, ...row.milestones.map(milestone => milestone.timestamp))))
  const end = Math.max(...rows.map(row => Math.max(row.end, ...row.milestones.map(milestone => milestone.timestamp))))
  return { start, end, duration: Math.max(86400000, end - start) }
}
