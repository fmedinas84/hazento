import assert from 'node:assert/strict'
import { buildCalendarEvents, parsePlanningDate } from '../src/planning.ts'

const expected = new Date(2026, 7, 27, 16, 0).getTime()

assert.equal(parsePlanningDate('27 ago · 16:00'), expected)
assert.equal(parsePlanningDate('27-ago · 16:00'), expected)
assert.equal(parsePlanningDate('27 ago, 16:00'), expected)

// September is rendered as "sept" by es-CL in current ICU versions.
// Previously the parser consumed "sep", dropped the time and defaulted to noon.
const september = new Date(2026, 8, 24, 9, 0).getTime()
for (const value of ['24-sept · 09:00', '24 sept. · 09:00', '24 sep · 09:00', '24 sept, 09:00']) {
  assert.equal(parsePlanningDate(value), september, value)
}
assert.equal(parsePlanningDate('24 septiembre · 09:00'), 0)
assert.equal(parsePlanningDate('24 sept · inválida'), 0)
const bookingDate = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit', month: 'short', timeZone: 'America/Santiago',
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date('2026-09-24T12:00:00Z')).replace('.', '').replace(',', ' ·')
assert.equal(parsePlanningDate(bookingDate), september)

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

const bookingEvents = buildCalendarEvents({
  accounts: [], engagements: [], activities: [],
  prestations: [{ id: 'booking', date: bookingDate, name: 'Reserva', accountId: 'qa', account: 'QA', status: 'Programada' }],
})
assert.equal(bookingEvents[0].timestamp, september)
const calendarDate = new Date(bookingEvents[0].timestamp)
assert.equal(calendarDate.getDate(), 24)
assert.equal(calendarDate.getHours(), 9)
assert.equal((calendarDate.getHours() - 8) * 60 + calendarDate.getMinutes(), 60)

console.log('Planning date validation passed.')
