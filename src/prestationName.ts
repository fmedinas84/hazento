type NamedService = { id: number; name: string }

export function resolvePrestationName(name: string, serviceId: number | undefined, services: NamedService[], fallback: string) {
  return name.trim() || services.find(service => service.id === serviceId)?.name || fallback
}
