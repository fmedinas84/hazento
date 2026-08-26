import type { ActivityData, EngagementData, OpportunityData, PrestationData, Vertical } from './data'
import { verticalLabels } from './data'

const opportunityNames: Record<Vertical, string[]> = {
  health: ['Evaluación y plan inicial', 'Plan de 8 sesiones', 'Evaluación y seguimiento', 'Taller bienestar equipo', 'Retomar plan de seguimiento'],
  creative: ['Identidad visual Restaurante Oslo', 'Rediseño web Acme', 'Campaña de lanzamiento Nike', 'Catálogo nueva temporada', 'Kit de marca personal'],
  creator: ['Campaña Running septiembre', 'Lanzamiento Acme', 'Contenido temporada Oslo', 'Partnership bienestar', 'Campaña UGC primavera'],
  sessions: ['Plan Piano Inicial', 'Ciclo de guitarra', 'Clases de nivelación', 'Taller grupal', 'Plan de evaluación'],
  other: ['Implementación Acme', 'Proyecto Restaurante Oslo', 'Diagnóstico operativo Nike', 'Asesoría mensual', 'Proyecto de mejora'],
}

const engagementNames: Record<Vertical, string[]> = {
  health: ['Tratamiento María Pérez', 'Tratamiento Juan Soto', 'Tratamiento Carolina Díaz', 'Tratamiento Pedro González'],
  creative: ['Identidad Restaurante Oslo', 'Sitio web Acme', 'Campaña Nike', 'Catálogo temporada'],
  creator: ['Nike Running 2026', 'Partnership Acme', 'Campaña Restaurante Oslo', 'Contenido mensual'],
  sessions: ['Plan Piano Inicial', 'Plan Guitarra Juan', 'Plan de nivelación', 'Plan grupal'],
  other: ['Proyecto Acme', 'Proyecto Restaurante Oslo', 'Implementación Nike', 'Asesoría mensual'],
}

export const scenarioOpportunities = (records: OpportunityData[], vertical: Vertical) => vertical === 'health' ? records : records.map((record, index) => index < 5 ? ({ ...record, title: opportunityNames[vertical][index % opportunityNames[vertical].length] }) : record)
export const scenarioEngagements = (records: EngagementData[], vertical: Vertical) => vertical === 'health' ? records : records.map((record, index) => index < 4 ? ({ ...record, name: engagementNames[vertical][index % engagementNames[vertical].length], type: verticalLabels[vertical].engagement, detail: record.detail.replace(/atenciones/gi, verticalLabels[vertical].prestations.toLowerCase()) }) : record)

export function scenarioPrestations(records: PrestationData[], vertical: Vertical) {
  if (vertical === 'health') return records
  const labels = verticalLabels[vertical]
  return records.map((record, index) => {
    if (index >= 13) return record
    const service = labels.demoServices.find(item => item.id === record.serviceId) || labels.demoServices[index % labels.demoServices.length]
    const status = record.status === 'Completada' ? labels.completedStatus : record.status === 'Programada' ? labels.scheduledStatus : ['No asistió', 'Cancelada'].includes(record.status) ? 'Cancelado' : record.status
    return { ...record, name: service.name, status, origin: ['Tratamiento', 'Plan'].includes(record.origin) ? labels.engagement : record.origin }
  })
}

export function scenarioActivities(records: ActivityData[], vertical: Vertical) {
  if (vertical === 'health') return records
  const noun = verticalLabels[vertical].prestation.toLowerCase()
  return records.map((record, index) => index < 7 ? ({ ...record, title: record.source === 'prestation_follow_up' ? 'Nota de avance' : record.title.replace(/sesión|atención/gi, noun) }) : record)
}
