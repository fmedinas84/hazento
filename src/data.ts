export type Vertical = 'health' | 'creative' | 'creator'

export const verticalLabels = {
  health: { account: 'Paciente', accounts: 'Pacientes', engagement: 'Tratamiento', engagements: 'Tratamientos', prestation: 'Atención', prestations: 'Atenciones', service: 'Tipo de atención', services: 'Tipos de atención' },
  creative: { account: 'Cliente', accounts: 'Clientes', engagement: 'Proyecto', engagements: 'Proyectos', prestation: 'Entregable', prestations: 'Entregables', service: 'Servicio', services: 'Servicios' },
  creator: { account: 'Marca', accounts: 'Marcas', engagement: 'Partnership', engagements: 'Partnerships', prestation: 'Contenido', prestations: 'Contenidos', service: 'Tipo de contenido', services: 'Tipos de contenido' },
} as const

export const accounts = [
  { id: 1, initials: 'MP', name: 'María Pérez', type: 'Persona', status: 'Activo', last: 'Hoy', next: '24 Ago', income: '$280.000', pending: '$35.000', email: 'maria.perez@email.cl', phone: '+56 9 4421 8870', rut: '17.284.391-2', color: '#dff5e8' },
  { id: 2, initials: 'JS', name: 'Juan Soto', type: 'Persona', status: 'Activo', last: 'Ayer', next: '19 Ago', income: '$175.000', pending: '$70.000', email: 'juan.soto@email.cl', phone: '+56 9 6732 2210', rut: '15.931.240-8', color: '#ede9ff' },
  { id: 3, initials: 'CD', name: 'Carolina Díaz', type: 'Persona', status: 'Activo', last: '15 Ago', next: 'Hoy', income: '$135.000', pending: '$45.000', email: 'carolina.diaz@email.cl', phone: '+56 9 7814 9022', rut: '18.402.116-5', color: '#fff0d8' },
  { id: 4, initials: 'PG', name: 'Pedro González', type: 'Persona', status: 'Activo', last: '12 Ago', next: 'Hoy', income: '$315.000', pending: '$0', email: 'pedro.g@email.cl', phone: '+56 9 3380 1244', rut: '14.770.803-1', color: '#dceeff' },
  { id: 5, initials: 'DS', name: 'Daniela Silva', type: 'Persona', status: 'Prospecto', last: '10 Ago', next: '21 Ago', income: '$0', pending: '$0', email: 'daniela@email.cl', phone: '+56 9 2284 6115', rut: '19.730.842-9', color: '#f5e6f0' },
  { id: 6, initials: 'FV', name: 'Felipe Vargas', type: 'Persona', status: 'Inactivo', last: '28 Jul', next: '—', income: '$210.000', pending: '$35.000', email: 'felipe@email.cl', phone: '+56 9 3120 4566', rut: '16.982.177-4', color: '#e6efeb' },
]

export const agenda = [
  { id: 1, time: '09:00', name: 'María Pérez', type: 'Sesión individual', status: 'Confirmada', amount: '$35.000', tone: 'violet' },
  { id: 2, time: '10:30', name: 'Carolina Díaz', type: 'Evaluación inicial', status: 'Pendiente', amount: '$45.000', tone: 'orange' },
  { id: 3, time: '12:00', name: 'Daniela Silva', type: 'Llamada de seguimiento', status: 'Actividad', amount: '', tone: 'blue' },
  { id: 4, time: '15:00', name: 'Pedro González', type: 'Sesión individual', status: 'Confirmada', amount: '$35.000', tone: 'violet' },
]

export const prestations = [
  { id: 1, date: '17 Ago · 09:00', account: 'María Pérez', name: 'Sesión individual', origin: 'Tratamiento', status: 'Programada', amount: '$35.000', payment: 'Pendiente' },
  { id: 2, date: '17 Ago · 10:30', account: 'Carolina Díaz', name: 'Evaluación inicial', origin: 'Directa', status: 'Programada', amount: '$45.000', payment: 'Pendiente' },
  { id: 3, date: '17 Ago · 15:00', account: 'Pedro González', name: 'Sesión individual', origin: 'Tratamiento', status: 'Programada', amount: '$35.000', payment: 'Pagado' },
  { id: 4, date: '14 Ago · 11:00', account: 'Juan Soto', name: 'Control', origin: 'Tratamiento', status: 'Completada', amount: '$30.000', payment: 'Parcial' },
  { id: 5, date: '12 Ago · 16:30', account: 'Felipe Vargas', name: 'Sesión individual', origin: 'Directa', status: 'No asistió', amount: '$35.000', payment: 'Pendiente' },
  { id: 6, date: '10 Ago · 09:00', account: 'María Pérez', name: 'Sesión individual', origin: 'Tratamiento', status: 'Completada', amount: '$35.000', payment: 'Pagado' },
]

export const opportunities = [
  { id: 1, account: 'Daniela Silva', title: 'Evaluación y plan inicial', amount: '$180.000', close: '24 Ago', contact: 'Daniela Silva', last: 'Hace 2 días', stage: 'Nuevo' },
  { id: 2, account: 'Rodrigo Leiva', title: 'Plan de 8 sesiones', amount: '$280.000', close: '28 Ago', contact: 'Rodrigo Leiva', last: 'Ayer', stage: 'Contactado' },
  { id: 3, account: 'Isidora Mora', title: 'Evaluación inicial', amount: '$45.000', close: '20 Ago', contact: 'Isidora Mora', last: 'Hoy', stage: 'Contactado' },
  { id: 4, account: 'Fundación Norte', title: 'Taller bienestar equipo', amount: '$650.000', close: '30 Ago', contact: 'Andrea Ruiz', last: 'Hace 3 días', stage: 'Propuesta' },
  { id: 5, account: 'Centro Armonía', title: 'Convenio de derivación', amount: '$420.000', close: '05 Sep', contact: 'Tomás Vidal', last: 'Hace 7 días', stage: 'Negociación' },
]

export const engagements = [
  { id: 1, name: 'Tratamiento María Pérez', account: 'María Pérez', type: 'Tratamiento', progress: 75, detail: '6 de 8 atenciones', amount: '$280.000', status: 'Activo' },
  { id: 2, name: 'Plan de recuperación Pedro', account: 'Pedro González', type: 'Tratamiento', progress: 50, detail: '4 de 8 atenciones', amount: '$280.000', status: 'Activo' },
  { id: 3, name: 'Seguimiento Juan Soto', account: 'Juan Soto', type: 'Tratamiento', progress: 40, detail: '2 de 5 atenciones', amount: '$150.000', status: 'Activo' },
  { id: 4, name: 'Evaluación Carolina', account: 'Carolina Díaz', type: 'Plan', progress: 20, detail: '1 de 5 atenciones', amount: '$165.000', status: 'Activo' },
]

export const activities = [
  { id: 1, title: 'Confirmar atención de Carolina', relation: 'Carolina Díaz · Atención', date: 'Hoy, 09:30', type: 'Tarea', status: 'Pendiente' },
  { id: 2, title: 'Llamar para coordinar evaluación', relation: 'Daniela Silva · Oportunidad', date: 'Hoy, 12:00', type: 'Llamada', status: 'Pendiente' },
  { id: 3, title: 'Enviar propuesta de taller', relation: 'Fundación Norte · Oportunidad', date: 'Hoy, 16:00', type: 'Email', status: 'Pendiente' },
  { id: 4, title: 'Revisar evolución del tratamiento', relation: 'María Pérez · Tratamiento', date: 'Mañana, 10:00', type: 'Hito', status: 'Pendiente' },
  { id: 5, title: 'Seguimiento convenio', relation: 'Centro Armonía · Oportunidad', date: '15 Ago', type: 'Llamada', status: 'Vencida' },
]

export const payments = [
  { id: 1, date: '17 Ago', account: 'Pedro González', amount: '$35.000', method: 'Transferencia', status: 'Pagado', allocations: '1 atención' },
  { id: 2, date: '14 Ago', account: 'Juan Soto', amount: '$15.000', method: 'Efectivo', status: 'Pagado', allocations: 'Pago parcial' },
  { id: 3, date: '10 Ago', account: 'María Pérez', amount: '$35.000', method: 'Transferencia', status: 'Pagado', allocations: '1 atención' },
  { id: 4, date: '08 Ago', account: 'Carolina Díaz', amount: '$45.000', method: 'Tarjeta', status: 'Pagado', allocations: 'Evaluación' },
  { id: 5, date: '03 Ago', account: 'María Pérez', amount: '$70.000', method: 'Transferencia', status: 'Pagado', allocations: '2 atenciones' },
]

export const services = [
  { id: 1, name: 'Sesión individual', description: 'Sesión de atención individual', duration: '60 min', price: '$35.000', active: true },
  { id: 2, name: 'Evaluación inicial', description: 'Evaluación y definición de objetivos', duration: '90 min', price: '$45.000', active: true },
  { id: 3, name: 'Control', description: 'Sesión breve de seguimiento', duration: '45 min', price: '$30.000', active: true },
  { id: 4, name: 'Taller grupal', description: 'Sesión para equipos u organizaciones', duration: '120 min', price: '$180.000', active: true },
]
