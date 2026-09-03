import { AlertCircle, BellRing, Check, Clock3, Mail, Sparkles, XCircle } from 'lucide-react'
import { canUseFeature, entitlementLabel } from './entitlements'
import { useRepositories } from './repositories'
import {
  isValidReminderEmail,
  appointmentEmailTemplate,
  parseAppointmentDate,
  reminderEligibility,
  reminderLeadOptions,
  type AppointmentReminder,
} from './reminders'
import { verticalLabels, type PrestationData, type Vertical } from './data'
import { demoToday } from './demoTime'

type Labels = typeof verticalLabels[Vertical]

const leadLabel = (hours: number) => hours === 1 ? '1 hora antes' : `${hours} horas antes`
const statusLabel = { scheduled: 'Programado', sent: 'Enviado', cancelled: 'Cancelado', failed: 'Falló' } as const

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' }).format(new Date(value))
}

function ReminderRow({ reminder, canSimulate }: { reminder: AppointmentReminder; canSimulate: boolean }) {
  const repositories = useRepositories()
  const Icon = reminder.status === 'sent' ? Check : reminder.status === 'failed' ? AlertCircle : reminder.status === 'cancelled' ? XCircle : Clock3
  return <article className={`appointment-reminder-row ${reminder.status}`}>
    <span className="appointment-reminder-icon"><Icon size={16}/></span>
    <div><strong>{statusLabel[reminder.status]}</strong><span>{formatDateTime(reminder.scheduledFor)} · {leadLabel(reminder.leadHours)}</span><small>{reminder.recipientEmail}</small>{reminder.errorMessage && <small className="reminder-error">{reminder.errorMessage}</small>}</div>
    {canSimulate && reminder.status === 'scheduled' && <div className="reminder-simulation-actions" aria-label="Simulación de desarrollo"><button type="button" onClick={() => repositories.reminderRepository.markSent(reminder.id)}>Simular envío</button><button type="button" onClick={() => repositories.reminderRepository.markFailed(reminder.id)}>Simular fallo</button></div>}
  </article>
}

export function AppointmentReminderPanel({ prestation, labels }: { prestation: Pick<PrestationData, 'id' | 'accountId' | 'date' | 'status'>; labels: Labels }) {
  const repositories = useRepositories()
  if (!labels.supportsAppointmentReminders) return null
  const account = repositories.accounts.find(record => record.id === prestation.accountId)
  const reminders = repositories.reminderRepository.getByPrestation(prestation.id).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
  const eligibility = reminderEligibility(prestation, account, { supportsAppointmentReminders: true, scheduledStatus: labels.scheduledStatus, settings: repositories.reminderSettings, now: demoToday() })
  const appointment = parseAppointmentDate(prestation.date)
  const visible = reminders.filter(record => record.status !== 'cancelled' || reminders.every(item => item.status === 'cancelled'))
  return <section className="appointment-reminder-panel">
    <header><span><BellRing size={17}/></span><div><strong>Recordatorio</strong><small>{entitlementLabel(repositories.reminderSettings.entitlementMode)}</small></div></header>
    {appointment && <p className="appointment-reminder-date"><span>Cita</span><b>{formatDateTime(appointment.toISOString())}</b></p>}
    {visible.length > 0 ? <div className="appointment-reminder-list">{visible.map(reminder => <ReminderRow key={reminder.id} reminder={reminder} canSimulate={repositories.reminderSettings.entitlementMode === 'demo_plus'}/>)}</div> : <div className="appointment-reminder-empty"><Mail size={16}/><p>{eligibility.eligible ? 'Los recordatorios se programarán al guardar la cita.' : eligibility.reason}</p></div>}
  </section>
}

export function ReminderSettingsPanel({ labels, onUpgrade }: { labels: Labels; onUpgrade: () => void }) {
  const repositories = useRepositories()
  const settings = repositories.reminderSettings
  const entitled = canUseFeature('email_reminders', { mode: settings.entitlementMode })
  const update = repositories.reminderRepository.updateSettings
  const professionalName = `${repositories.profile.firstName} ${repositories.profile.lastName}`.trim() || 'Tu profesional'
  const previewMessage = appointmentEmailTemplate({
    professionalName,
    recipientName: labels.prestation === 'Clase' ? 'Tomás' : 'María',
    prestation: labels.prestation,
    appointmentDate: new Date('2026-08-26T20:00:00.000Z'),
    address: repositories.workspace.address || '[Dirección configurada en Negocio]',
    recipientEmail: 'cliente@ejemplo.cl',
    replyTo: repositories.profile.email,
  })

  if (!labels.supportsAppointmentReminders) return <div className="reminder-settings">
    <div className="reminder-settings-heading"><span className="section-kicker">Recordatorios</span><h2>Recordatorios de citas</h2><p>Esta profesión usa {labels.prestations.toLowerCase()} sin asistencia, por lo que no programa recordatorios de citas.</p></div>
    <div className="reminder-unavailable"><BellRing size={22}/><div><strong>Disponible para prestaciones con asistencia</strong><p>La capacidad se define por tipo de prestación y no por su nombre visible.</p></div></div>
  </div>

  return <div className="reminder-settings">
    <div className="reminder-settings-heading"><span className="section-kicker">Recordatorios</span><h2>Recordatorios de citas</h2><p>Envía automáticamente un email a tus {labels.accounts.toLowerCase()} antes de una cita.</p><span className="plus-feature-badge"><Sparkles size={13}/> Función Plus</span></div>
    {!entitled ? <section className="reminder-upgrade-card"><BellRing size={24}/><div><h3>Recordatorios automáticos</h3><p>Hazento puede avisar automáticamente a tus {labels.accounts.toLowerCase()} antes de una cita.</p><button className="primary-btn" type="button" onClick={onUpgrade}>Actualiza a Plus para enviar notificaciones</button></div></section> : <section className="reminder-config-card">
      <label className="setting-switch"><input type="checkbox" checked={settings.emailEnabled} onChange={event => update({ emailEnabled: event.target.checked })}/><span><b>Recordatorio por email</b><small>{entitlementLabel(settings.entitlementMode)}</small></span></label>
      <div className="reminder-config-row"><label><span>Enviar</span><select value={settings.primaryLeadHours} onChange={event => { const primaryLeadHours = Number(event.target.value); const nextSecondary = primaryLeadHours === settings.secondaryLeadHours ? reminderLeadOptions.find(hours => hours !== primaryLeadHours) : settings.secondaryLeadHours; update({ primaryLeadHours, secondaryLeadHours: nextSecondary }) }}>{reminderLeadOptions.map(hours => <option key={hours} value={hours}>{leadLabel(hours)}</option>)}</select></label></div>
      <label className="setting-switch secondary-reminder"><input type="checkbox" checked={settings.secondaryEnabled} onChange={event => update({ secondaryEnabled: event.target.checked })}/><span><b>Segundo recordatorio</b><small>Opcional</small></span></label>
      {settings.secondaryEnabled && <div className="reminder-config-row"><label><span>Enviar</span><select value={settings.secondaryLeadHours} onChange={event => update({ secondaryLeadHours: Number(event.target.value) })}>{reminderLeadOptions.filter(hours => hours !== settings.primaryLeadHours).map(hours => <option key={hours} value={hours}>{leadLabel(hours)}</option>)}</select></label></div>}
    </section>}
    <section className="reminder-email-preview" aria-labelledby="reminder-email-preview-title">
      <div className="reminder-email-preview-heading"><div><span className="section-kicker">Vista previa</span><h3 id="reminder-email-preview-title">Email que recibirá tu cliente</h3><p>Atenciones y clases utilizan esta misma plantilla.</p></div><Mail size={20}/></div>
      <div className="reminder-template-variables" aria-label="Variables de la plantilla"><span>Nombre</span><span>Fecha</span><span>Hora</span><span>Dirección</span></div>
      <div className="reminder-email-frame"><div><small>Asunto</small><strong>{previewMessage.subject}</strong></div><pre>{previewMessage.text}</pre></div>
    </section>
  </div>
}

export function MissingReminderEmailNotice({ labels, onReview }: { labels: Labels; onReview: () => void }) {
  const repositories = useRepositories()
  if (!labels.supportsAppointmentReminders || !canUseFeature('email_reminders', { mode: repositories.reminderSettings.entitlementMode }) || !repositories.reminderSettings.emailEnabled) return null
  const now = demoToday()
  const missing = repositories.prestations.filter(prestation => prestation.status === labels.scheduledStatus && parseAppointmentDate(prestation.date)?.getTime()! > now.getTime() && !isValidReminderEmail(repositories.accounts.find(account => account.id === prestation.accountId)?.email))
  if (!missing.length) return null
  return <button className="dashboard-reminder-warning" type="button" onClick={onReview}><AlertCircle size={17}/><span><b>{missing.length} {missing.length === 1 ? 'cita próxima no tiene' : 'citas próximas no tienen'} email para recordatorio</b><small>Revisa los datos de contacto antes de la cita.</small></span></button>
}
