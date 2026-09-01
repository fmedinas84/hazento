import assert from 'node:assert/strict'
import { isValidPartnerSlug, normalizePartnerSlug } from '../packages/partners-config/index.ts'

assert.equal(normalizePartnerSlug('María José Soto'), 'maria-jose-soto')
assert.equal(normalizePartnerSlug('  Diseño & Salud  '), 'diseno-salud')
assert.equal(normalizePartnerSlug('https://hazento.cl/Mi Página'), '')
assert.equal(isValidPartnerSlug('maria-jose-soto'), true)
assert.equal(isValidPartnerSlug('admin'), false)
assert.equal(isValidPartnerSlug('ab'), false)
assert.equal(isValidPartnerSlug('con espacios'), false)
console.log('Partner slug normalization and validation: OK')
