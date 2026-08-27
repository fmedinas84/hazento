type NamedService = { id: string; name: string }

export function resolvePrestationName(name: string, serviceId: string | undefined, services: readonly NamedService[], fallback: string) {
  return name.trim() || services.find(service => service.id === serviceId)?.name || fallback
}
