export type Vertical = 'health' | 'creative' | 'creator' | 'sessions' | 'other'

export const verticalLabels = {
  health: {
    profession: 'Salud', professionDescription: 'Pacientes, tratamientos y atenciones',
    account: 'Paciente', accounts: 'Pacientes', engagement: 'Tratamiento', engagements: 'Tratamientos', prestation: 'Atención', prestations: 'Atenciones', navigationPrestation: 'Atenciones', service: 'Tipo de atención', services: 'Tipos de atención',
    peopleTab: 'Pacientes', organization: 'Empresa', organizations: 'Empresas', organizationRelationship: 'Representa a', organizationList: 'Organización', createOrganization: 'Nueva empresa',
    createAccount: 'Nuevo paciente', createEngagement: 'Nuevo tratamiento', createPrestation: 'Nueva atención', defaultAgendaView: 'Semana', supportsFollowUp: true, planningLabel: 'Agenda', calendarEnabled: true, timelineEnabled: false,
    engagementDescription: 'Organiza tratamientos o planes de atención y revisa el avance de sus sesiones.',
  },
  creative: {
    profession: 'Diseñador', professionDescription: 'Clientes, proyectos y entregables',
    account: 'Cliente', accounts: 'Clientes', engagement: 'Proyecto', engagements: 'Proyectos', prestation: 'Entregable', prestations: 'Entregables', navigationPrestation: 'Entregables', service: 'Servicio', services: 'Servicios',
    peopleTab: 'Personas', organization: 'Empresa', organizations: 'Empresas', organizationRelationship: 'Representa a', organizationList: 'Organización', createOrganization: 'Nueva empresa',
    createAccount: 'Nuevo cliente', createEngagement: 'Nuevo proyecto', createPrestation: 'Nuevo entregable', defaultAgendaView: 'Semana', supportsFollowUp: false, planningLabel: 'Planificación', calendarEnabled: true, timelineEnabled: true,
    engagementDescription: 'Organiza tus proyectos y revisa entregables, avance y cobros.',
  },
  creator: {
    profession: 'Influencer', professionDescription: 'Contactos, empresas, partnerships y contenidos',
    account: 'Contacto', accounts: 'Contactos', engagement: 'Partnership', engagements: 'Partnerships', prestation: 'Contenido', prestations: 'Contenidos', navigationPrestation: 'Contenido', service: 'Servicio', services: 'Servicios',
    peopleTab: 'Personas', organization: 'Empresa', organizations: 'Empresas', organizationRelationship: 'Representa a', organizationList: 'Organización', createOrganization: 'Nueva empresa',
    createAccount: 'Nuevo contacto', createEngagement: 'Nuevo partnership', createPrestation: 'Nuevo contenido', defaultAgendaView: 'Semana', supportsFollowUp: false, planningLabel: 'Planificación', calendarEnabled: true, timelineEnabled: true,
    engagementDescription: 'Gestiona tus acuerdos con marcas, contenidos, fechas y cobros.',
  },
  sessions: {
    profession: 'Profesor', professionDescription: 'Alumnos, planes y clases',
    account: 'Alumno', accounts: 'Alumnos', engagement: 'Plan', engagements: 'Planes', prestation: 'Clase', prestations: 'Clases', navigationPrestation: 'Clases', service: 'Servicio', services: 'Servicios',
    peopleTab: 'Alumnos', organization: 'Empresa', organizations: 'Empresas', organizationRelationship: 'Representa a', organizationList: 'Organización', createOrganization: 'Nueva empresa',
    createAccount: 'Nuevo alumno', createEngagement: 'Nuevo plan', createPrestation: 'Nueva clase', defaultAgendaView: 'Semana', supportsFollowUp: false, planningLabel: 'Agenda', calendarEnabled: true, timelineEnabled: false,
    engagementDescription: 'Organiza los planes de tus alumnos y revisa clases, avance y pagos.',
  },
  other: {
    profession: 'Otras actividades', professionDescription: 'Clientes, proyectos y entregables',
    account: 'Cliente', accounts: 'Clientes', engagement: 'Proyecto', engagements: 'Proyectos', prestation: 'Entregable', prestations: 'Entregables', navigationPrestation: 'Entregables', service: 'Servicio', services: 'Servicios',
    peopleTab: 'Personas', organization: 'Empresa', organizations: 'Empresas', organizationRelationship: 'Representa a', organizationList: 'Organización', createOrganization: 'Nueva empresa',
    createAccount: 'Nuevo cliente', createEngagement: 'Nuevo proyecto', createPrestation: 'Nuevo entregable', defaultAgendaView: 'Semana', supportsFollowUp: false, planningLabel: 'Planificación', calendarEnabled: true, timelineEnabled: true,
    engagementDescription: 'Organiza tus proyectos y revisa entregas, avance y cobros.',
  },
} as const

export const verticalOptions = (Object.keys(verticalLabels) as Vertical[]).map(value => ({ value, ...verticalLabels[value] }))

export type AccountData = {
  id: number
  workspaceId?: number
  initials: string
  name: string
  firstName?: string
  lastName?: string
  displayName?: string
  organizationId?: number
  role?: string
  type: string
  status: string
  last: string
  next: string
  income: string
  pending: string
  email?: string
  phone: string
  rut: string
  legalName?: string
  address?: string
  city?: string
  commune?: string
  notes?: string
  color: string
  createdAt?: string
  updatedAt?: string
  archivedAt?: string
}

export type OrganizationData = {
  id: number
  workspaceId: number
  name: string
  legalName?: string
  taxId?: string
  email?: string
  phone?: string
  website?: string
  businessActivity?: string
  address?: string
  commune?: string
  city?: string
  region?: string
  notes?: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export type ContactData = {
  id: number
  accountId: number
  firstName: string
  lastName: string
  jobTitle?: string
  email?: string
  phone?: string
  isPrimary: boolean
}

export type OpportunityData = {
  id: number
  accountId?: number
  account: string
  title: string
  amount: string
  close: string
  contact: string
  last: string
  stage: string
  createdAt?: string
  updatedAt?: string
}

export type EngagementData = {
  id: number
  accountId?: number
  opportunityId?: number
  name: string
  account: string
  type: string
  progress: number
  detail: string
  amount: string
  status: string
  startDate?: string
  endDate?: string
  createdAt?: string
  updatedAt?: string
}

export type PrestationData = {
  id: number
  accountId: number
  engagementId?: number
  opportunityId?: number
  serviceId?: number
  date: string
  account: string
  name: string
  description?: string
  durationMinutes?: number
  origin: string
  status: string
  amount: string
  payment: string
  followUpNote?: string
  createdAt?: string
}

export type ActivityData = {
  id: number
  title: string
  relation: string
  date: string
  type: string
  activityType?: string
  status: string
  description?: string
  accountId?: number
  prestationId?: number
  engagementId?: number
  opportunityId?: number
  source?: 'prestation_follow_up'
  scheduledAt?: string
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

export type PaymentData = {
  id: number
  accountId?: number
  date: string
  account: string
  amount: string
  method: string
  status: string
  allocations: string
  createdAt?: string
}

export const accounts: AccountData[] = [
  { id: 1, workspaceId: 1, initials: 'MP', name: 'María Pérez', firstName: 'María', lastName: 'Pérez', displayName: 'María Pérez', type: 'Persona', status: 'Activo', last: 'Hoy', next: '24 Ago', income: '$280.000', pending: '$35.000', email: 'maria.perez@email.cl', phone: '+56 9 4421 8870', rut: '17.284.391-2', color: '#dff5e8' },
  { id: 2, workspaceId: 1, initials: 'JS', name: 'Juan Soto', firstName: 'Juan', lastName: 'Soto', displayName: 'Juan Soto', organizationId: 1, role: 'Gerente Comercial', type: 'Persona', status: 'Activo', last: 'Ayer', next: '19 Ago', income: '$175.000', pending: '$70.000', email: 'juan@acme.cl', phone: '+56 9 6732 2210', rut: '15.931.240-8', color: '#ede9ff' },
  { id: 3, workspaceId: 1, initials: 'CD', name: 'Carolina Díaz', firstName: 'Carolina', lastName: 'Díaz', displayName: 'Carolina Díaz', organizationId: 2, role: 'Brand Manager', type: 'Persona', status: 'Activo', last: '15 Ago', next: 'Hoy', income: '$135.000', pending: '$45.000', email: 'carolina@nike.cl', phone: '+56 9 7814 9022', rut: '18.402.116-5', color: '#fff0d8' },
  { id: 4, workspaceId: 1, initials: 'PG', name: 'Pedro González', firstName: 'Pedro', lastName: 'González', displayName: 'Pedro González', type: 'Persona', status: 'Activo', last: '12 Ago', next: 'Hoy', income: '$315.000', pending: '$0', email: 'pedro.g@email.cl', phone: '+56 9 3380 1244', rut: '14.770.803-1', color: '#dceeff' },
  { id: 5, workspaceId: 1, initials: 'DS', name: 'Daniela Silva', firstName: 'Daniela', lastName: 'Silva', displayName: 'Daniela Silva', organizationId: 3, role: 'Dueña', type: 'Persona', status: 'Prospecto', last: '10 Ago', next: '21 Ago', income: '$0', pending: '$0', email: 'daniela@oslo.cl', phone: '+56 9 2284 6115', rut: '19.730.842-9', color: '#f5e6f0' },
  { id: 6, workspaceId: 1, initials: 'FV', name: 'Felipe Vargas', firstName: 'Felipe', lastName: 'Vargas', displayName: 'Felipe Vargas', type: 'Persona', status: 'Inactivo', last: '28 Jul', next: '—', income: '$210.000', pending: '$35.000', email: 'felipe@email.cl', phone: '+56 9 3120 4566', rut: '16.982.177-4', color: '#e6efeb' },
]

export const organizations: OrganizationData[] = [
  { id: 1, workspaceId: 1, name: 'Acme', legalName: 'Acme SpA', taxId: '76.432.100-8', website: 'https://acme.cl', city: 'Santiago', createdAt: '2026-07-10T12:00:00-04:00', updatedAt: '2026-08-18T09:00:00-04:00' },
  { id: 2, workspaceId: 1, name: 'Nike', website: 'https://nike.cl', createdAt: '2026-07-15T12:00:00-04:00', updatedAt: '2026-08-18T09:00:00-04:00' },
  { id: 3, workspaceId: 1, name: 'Restaurante Oslo', city: 'Santiago', createdAt: '2026-08-01T12:00:00-04:00', updatedAt: '2026-08-18T09:00:00-04:00' },
  { id: 4, workspaceId: 1, name: 'Globex', createdAt: '2026-08-10T12:00:00-04:00', updatedAt: '2026-08-18T09:00:00-04:00' },
]

export const contacts: ContactData[] = []

export const agenda = [
  { id: 1, time: '09:00', name: 'María Pérez', type: 'Sesión individual', status: 'Confirmada', amount: '$35.000', tone: 'violet' },
  { id: 2, time: '10:30', name: 'Carolina Díaz', type: 'Evaluación inicial', status: 'Pendiente', amount: '$45.000', tone: 'orange' },
  { id: 3, time: '12:00', name: 'Daniela Silva', type: 'Llamada de seguimiento', status: 'Actividad', amount: '', tone: 'blue' },
  { id: 4, time: '15:00', name: 'Pedro González', type: 'Sesión individual', status: 'Confirmada', amount: '$35.000', tone: 'violet' },
]

export const prestations: PrestationData[] = [
  { id: 1, accountId: 1, engagementId: 1, serviceId: 1, date: '17 Ago · 09:00', account: 'María Pérez', name: 'Sesión semanal de seguimiento', description: 'Revisión de avances y próximos objetivos acordados.', origin: 'Tratamiento', status: 'Completada', amount: '$35.000', payment: 'Pendiente', followUpNote: 'Se mantiene frecuencia semanal. Buena evolución respecto de la sesión anterior.' },
  { id: 2, accountId: 3, serviceId: 2, date: '17 Ago · 10:30', account: 'Carolina Díaz', name: 'Evaluación inicial', description: 'Primera evaluación y definición de plan de trabajo.', origin: 'Directa', status: 'Programada', amount: '$45.000', payment: 'Pendiente' },
  { id: 3, accountId: 4, engagementId: 2, serviceId: 1, date: '17 Ago · 15:00', account: 'Pedro González', name: 'Sesión individual', origin: 'Tratamiento', status: 'Programada', amount: '$35.000', payment: 'Pagado' },
  { id: 4, accountId: 2, engagementId: 3, serviceId: 3, date: '14 Ago · 11:00', account: 'Juan Soto', name: 'Control', origin: 'Tratamiento', status: 'Completada', amount: '$30.000', payment: 'Parcial' },
  { id: 5, accountId: 6, opportunityId: 5, date: '12 Ago · 16:30', account: 'Felipe Vargas', name: 'Sesión individual', origin: 'Directa', status: 'No asistió', amount: '$35.000', payment: 'Pendiente' },
  { id: 6, accountId: 1, engagementId: 1, date: '10 Ago · 09:00', account: 'María Pérez', name: 'Sesión individual', origin: 'Tratamiento', status: 'Completada', amount: '$35.000', payment: 'Pagado' },
  { id: 7, accountId: 2, engagementId: 3, date: '18 Ago · 09:00', account: 'Juan Soto', name: 'Sesión individual', origin: 'Tratamiento', status: 'Completada', amount: '$35.000', payment: 'Pendiente', followUpNote: 'Se acuerda revisar evolución en la próxima sesión.' },
  { id: 8, accountId: 1, engagementId: 1, date: '19 Ago · 11:00', account: 'María Pérez', name: 'Control', origin: 'Tratamiento', status: 'Programada', amount: '$30.000', payment: 'Pendiente' },
  { id: 9, accountId: 5, opportunityId: 1, date: '20 Ago · 15:30', account: 'Daniela Silva', name: 'Evaluación inicial', origin: 'Directa', status: 'Programada', amount: '$45.000', payment: 'Pendiente' },
  { id: 10, accountId: 4, engagementId: 2, date: '21 Ago · 10:00', account: 'Pedro González', name: 'Sesión individual', origin: 'Tratamiento', status: 'Programada', amount: '$35.000', payment: 'Pendiente' },
  { id: 11, accountId: 3, engagementId: 4, date: '08 Ago · 12:00', account: 'Carolina Díaz', name: 'Evaluación inicial', origin: 'Plan', status: 'Completada', amount: '$45.000', payment: 'Pagado' },
  { id: 12, accountId: 1, engagementId: 1, date: '03 Ago · 09:00', account: 'María Pérez', name: 'Sesión individual', origin: 'Tratamiento', status: 'Completada', amount: '$35.000', payment: 'Pagado' },
  { id: 13, accountId: 1, engagementId: 1, serviceId: 1, date: '26 Ago · 09:00', account: 'María Pérez', name: 'Sesión de continuidad', description: 'Próxima atención del tratamiento activo.', origin: 'Tratamiento', status: 'Programada', amount: '$35.000', payment: 'Pendiente' },
]

export const opportunities: OpportunityData[] = [
  { id: 1, accountId: 5, account: 'Daniela Silva', title: 'Evaluación y plan inicial', amount: '$180.000', close: '24 Ago', contact: 'Daniela Silva', last: 'Hace 2 días', stage: 'Nuevo', createdAt: '2026-08-10T14:00:00-04:00', updatedAt: '2026-08-16T11:00:00-04:00' },
  { id: 2, accountId: 2, account: 'Juan Soto', title: 'Plan de 8 sesiones', amount: '$280.000', close: '28 Ago', contact: 'Juan Soto', last: 'Ayer', stage: 'Contactado', createdAt: '2026-08-08T10:00:00-04:00', updatedAt: '2026-08-17T16:00:00-04:00' },
  { id: 3, accountId: 3, account: 'Carolina Díaz', title: 'Evaluación y seguimiento', amount: '$165.000', close: '20 Ago', contact: 'Carolina Díaz', last: 'Hoy', stage: 'Contactado', createdAt: '2026-08-07T12:00:00-04:00', updatedAt: '2026-08-18T09:15:00-04:00' },
  { id: 4, accountId: 4, account: 'Pedro González', title: 'Taller bienestar equipo', amount: '$650.000', close: '30 Ago', contact: 'Pedro González', last: 'Hace 3 días', stage: 'Propuesta', createdAt: '2026-08-04T15:00:00-04:00', updatedAt: '2026-08-15T17:30:00-04:00' },
  { id: 5, accountId: 6, account: 'Felipe Vargas', title: 'Retomar plan de seguimiento', amount: '$210.000', close: '05 Sep', contact: 'Felipe Vargas', last: 'Hace 7 días', stage: 'Negociación', createdAt: '2026-07-28T12:00:00-04:00', updatedAt: '2026-08-11T10:00:00-04:00' },
]

export const engagements: EngagementData[] = [
  { id: 1, accountId: 1, name: 'Tratamiento María Pérez', account: 'María Pérez', type: 'Tratamiento', progress: 75, detail: '6 de 8 atenciones', amount: '$280.000', status: 'Activo', startDate: '2026-08-05', endDate: '2026-08-26', createdAt: '2026-07-20T10:00:00-04:00', updatedAt: '2026-08-17T10:00:00-04:00' },
  { id: 2, accountId: 4, opportunityId: 4, name: 'Plan de recuperación Pedro', account: 'Pedro González', type: 'Tratamiento', progress: 50, detail: '4 de 8 atenciones', amount: '$280.000', status: 'Activo', startDate: '2026-08-18', endDate: '2026-09-30', createdAt: '2026-08-01T10:00:00-04:00', updatedAt: '2026-08-17T15:30:00-04:00' },
  { id: 3, accountId: 2, opportunityId: 2, name: 'Seguimiento Juan Soto', account: 'Juan Soto', type: 'Tratamiento', progress: 40, detail: '2 de 5 atenciones', amount: '$150.000', status: 'Activo', startDate: '2026-08-18', endDate: '2026-09-15', createdAt: '2026-08-05T09:00:00-04:00', updatedAt: '2026-08-18T09:45:00-04:00' },
  { id: 4, accountId: 3, opportunityId: 3, name: 'Evaluación Carolina', account: 'Carolina Díaz', type: 'Plan', progress: 20, detail: '1 de 5 atenciones', amount: '$165.000', status: 'Activo', createdAt: '2026-08-08T12:00:00-04:00', updatedAt: '2026-08-17T11:00:00-04:00' },
]

export const activities: ActivityData[] = [
  { id: 1, title: 'Confirmar atención de Carolina', relation: 'Carolina Díaz · Atención', date: 'Hoy, 09:30', type: 'Tarea', status: 'Pendiente', accountId: 3, prestationId: 2, scheduledAt: '2026-08-18T09:30:00-04:00', createdAt: '2026-08-16T12:00:00-04:00' },
  { id: 2, title: 'Llamar para coordinar evaluación', relation: 'Daniela Silva · Oportunidad', date: 'Hoy, 12:00', type: 'Llamada', status: 'Pendiente', accountId: 5, opportunityId: 1, scheduledAt: '2026-08-18T12:00:00-04:00', createdAt: '2026-08-16T11:00:00-04:00' },
  { id: 3, title: 'Enviar propuesta de taller', relation: 'Pedro González · Oportunidad', date: 'Hoy, 16:00', type: 'Email', status: 'Pendiente', accountId: 4, opportunityId: 4, scheduledAt: '2026-08-18T16:00:00-04:00', createdAt: '2026-08-15T17:30:00-04:00' },
  { id: 4, title: 'Revisar evolución del tratamiento', relation: 'María Pérez · Tratamiento', date: 'Mañana, 10:00', type: 'Hito', status: 'Pendiente', accountId: 1, engagementId: 1, scheduledAt: '2026-08-19T10:00:00-04:00', createdAt: '2026-08-17T09:00:00-04:00' },
  { id: 5, title: 'Retomar plan de seguimiento', relation: 'Felipe Vargas · Oportunidad', date: '15 Ago', type: 'Llamada', status: 'Vencida', accountId: 6, opportunityId: 5 },
  { id: 6, title: 'Seguimiento', relation: '', date: '18 Ago · 20:35', type: 'Nota', activityType: 'note', status: 'Completada', description: 'Se mantiene frecuencia semanal. Buena evolución respecto de la sesión anterior.', accountId: 1, prestationId: 1, engagementId: 1, source: 'prestation_follow_up', createdAt: '2026-08-18T20:35:00-04:00', updatedAt: '2026-08-18T20:35:00-04:00', completedAt: '2026-08-18T20:35:00-04:00' },
  { id: 7, title: 'Seguimiento', relation: '', date: '18 Ago · 20:50', type: 'Nota', activityType: 'note', status: 'Completada', description: 'Se acuerda revisar evolución en la próxima sesión.', accountId: 2, prestationId: 7, engagementId: 3, source: 'prestation_follow_up', createdAt: '2026-08-18T20:50:00-04:00', updatedAt: '2026-08-18T20:50:00-04:00', completedAt: '2026-08-18T20:50:00-04:00' },
]

export const payments: PaymentData[] = [
  { id: 1, accountId: 4, date: '17 Ago', account: 'Pedro González', amount: '$35.000', method: 'Transferencia', status: 'Pagado', allocations: '1 atención', createdAt: '2026-08-17T16:00:00-04:00' },
  { id: 2, accountId: 2, date: '14 Ago', account: 'Juan Soto', amount: '$15.000', method: 'Efectivo', status: 'Pagado', allocations: 'Pago parcial', createdAt: '2026-08-14T11:30:00-04:00' },
  { id: 3, accountId: 1, date: '10 Ago', account: 'María Pérez', amount: '$35.000', method: 'Transferencia', status: 'Pagado', allocations: '1 atención', createdAt: '2026-08-10T10:30:00-04:00' },
  { id: 4, accountId: 3, date: '08 Ago', account: 'Carolina Díaz', amount: '$45.000', method: 'Tarjeta', status: 'Pagado', allocations: 'Evaluación', createdAt: '2026-08-08T13:00:00-04:00' },
  { id: 5, accountId: 1, date: '03 Ago', account: 'María Pérez', amount: '$70.000', method: 'Transferencia', status: 'Pagado', allocations: '2 atenciones', createdAt: '2026-08-03T10:00:00-04:00' },
]

// Demo-only representation of the real payment_allocations table. Payment status is
// derived from these records; it must never become a second source of truth.
export const paymentAllocations = [
  { id: 1, paymentId: 1, prestationId: 3, amount: 35000 },
  { id: 2, paymentId: 2, prestationId: 4, amount: 15000 },
  { id: 3, paymentId: 3, prestationId: 6, amount: 35000 },
  { id: 4, paymentId: 4, prestationId: 11, amount: 45000 },
  { id: 5, paymentId: 5, prestationId: 12, amount: 35000 },
  { id: 6, paymentId: 5, prestationId: 1, amount: 17500 },
]

export const services = [
  { id: 1, name: 'Sesión individual', description: 'Sesión de atención individual', duration: '60 min', price: '$35.000', active: true },
  { id: 2, name: 'Evaluación inicial', description: 'Evaluación y definición de objetivos', duration: '90 min', price: '$45.000', active: true },
  { id: 3, name: 'Control', description: 'Sesión breve de seguimiento', duration: '45 min', price: '$30.000', active: true },
  { id: 4, name: 'Taller grupal', description: 'Sesión para equipos u organizaciones', duration: '120 min', price: '$180.000', active: true },
]
