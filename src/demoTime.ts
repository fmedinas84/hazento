export const DEMO_NOW = new Date('2026-08-18T12:00:00-04:00')

export function demoToday() {
  return new Date(DEMO_NOW)
}

export function demoDateInput() {
  return DEMO_NOW.toISOString().slice(0, 10)
}

export function demoMonthRange() {
  const today = demoToday()
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
  return { today, end }
}

export function demoComparablePeriod() {
  const today = demoToday()
  const previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const previousEnd = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate(), 23, 59, 59)
  return { today, previousStart, previousEnd }
}

export function isSameDemoDay(value: Date) {
  const today = demoToday()
  return value.getFullYear() === today.getFullYear() && value.getMonth() === today.getMonth() && value.getDate() === today.getDate()
}
