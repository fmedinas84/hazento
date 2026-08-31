export const COUNTRIES = {
  CL: { name: 'Chile', currency: 'CLP', currencyName: 'Peso chileno', enabled: true },
  PE: { name: 'Perú', currency: 'PEN', currencyName: 'Sol peruano', enabled: false },
  PY: { name: 'Paraguay', currency: 'PYG', currencyName: 'Guaraní paraguayo', enabled: false },
} as const

export type CountryCode = keyof typeof COUNTRIES
export type WorkspaceCurrency = (typeof COUNTRIES)[CountryCode]['currency']

export const countryEntries = Object.entries(COUNTRIES) as Array<[CountryCode, (typeof COUNTRIES)[CountryCode]]>

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(COUNTRIES, value)
}

export function enabledCountryCode(value: unknown): CountryCode | null {
  return isCountryCode(value) && COUNTRIES[value].enabled ? value : null
}

export function currencyForCountry(countryCode: CountryCode): WorkspaceCurrency {
  return COUNTRIES[countryCode].currency
}
