import { dataSource } from './persistence/dataSource'

export const DEMO_NOW = new Date('2026-08-18T12:00:00-04:00')

export function demoToday() {
  return dataSource === 'demo' ? new Date(DEMO_NOW) : new Date()
}

export function demoDateInput() {
  const today = demoToday()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
