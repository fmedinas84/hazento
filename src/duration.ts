export const durationOptions = Array.from({ length: 8 }, (_, index) => (index + 1) * 30)

export function serviceDurationMinutes(duration?: string) {
  const minutes = Number(duration?.match(/\d+/)?.[0]) || 60
  return Math.min(240, Math.max(30, Math.round(minutes / 30) * 30))
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} minutos`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}${remainder ? ' h 30 min' : hours === 1 ? ' hora' : ' horas'}`
}
