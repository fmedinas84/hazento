export type DataSource = 'demo' | 'supabase'

const configured = (import.meta.env.VITE_DATA_SOURCE || 'demo').trim().toLowerCase()
if (configured !== 'demo' && configured !== 'supabase') throw new Error(`VITE_DATA_SOURCE inválido: ${configured}`)
export const dataSource = configured as DataSource
