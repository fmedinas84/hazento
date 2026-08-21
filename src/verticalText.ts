const prestationTerms = /atenciones|entregables|contenidos|clases/gi

export function verticalizeEngagementDetail(detail: string, prestations: string) {
  return detail.replace(prestationTerms, prestations.toLowerCase())
}

export function completedWord(prestation: string) {
  return ['Entregable', 'Contenido'].includes(prestation) ? 'completados' : 'completadas'
}
