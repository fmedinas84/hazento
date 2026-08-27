import assert from 'node:assert/strict'
import { buildCalendarEvents, parsePlanningDate } from '../src/planning.ts'

const expected = new Date(2026, 7, 27, 16, 0).getTime()

assert.equal(parsePlanningDate('27 ago · 16:00'), expected)
assert.equal(parsePlanningDate('27-ago · 16:00'), expected)
assert.equal(parsePlanningDate('27 ago, 16:00'), expected)

const events = buildCalendarEvents({
  accounts: [{ id: 'person-qa-a', name: 'Paciente QA A' }],
  engagements: [],
  activities: [],
  prestations: [{
    id: 'prestation-qa-a',
    accountId: 'person-qa-a',
    date: '27-ago · 16:00',
    account: 'Paciente QA A',
    name: 'Atención QA A',
    origin: 'Directa',
    status: 'Programada',
    amount: '$30.000',
    payment: 'Pagado parcial',
  }],
})

assert.equal(events.length, 1)
assert.equal(events[0].timestamp, expected)
assert.equal(events[0].title, 'Atención QA A')

console.log('Planning date validation passed.')
