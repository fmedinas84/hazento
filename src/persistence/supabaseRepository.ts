import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { activityMapper, engagementMapper, opportunityMapper, organizationMapper, paymentMapper, paymentRequestMapper, personMapper, prestationMapper, serviceMapper } from './mappers'

type Client = SupabaseClient<Database>
type PublicTables = Database['public']['Tables']
type TableName = keyof PublicTables

export class SupabasePersistenceError extends Error {
  constructor(operation: string, message: string) {
    super(`${operation}: ${message}`)
    this.name = 'SupabasePersistenceError'
  }
}

const unwrap = <T>(operation: string, result: { data: T | null; error: { message: string } | null }): T => {
  if (result.error) throw new SupabasePersistenceError(operation, result.error.message)
  if (result.data == null) throw new SupabasePersistenceError(operation, 'Supabase no devolvió datos.')
  return result.data
}

export class SupabaseRepository {
  constructor(private readonly client: Client) {}

  async resolveWorkspaceId(): Promise<string> {
    const { data: claims, error: claimsError } = await this.client.auth.getClaims()
    if (claimsError || !claims?.claims?.sub) throw new SupabasePersistenceError('resolveWorkspaceId', claimsError?.message || 'No existe una sesión autenticada válida.')
    const result = await this.client.from('workspace_members').select('workspace_id').eq('user_id', claims.claims.sub).order('created_at').limit(1).maybeSingle()
    const membership = unwrap('resolveWorkspaceId', result)
    if (!membership) throw new SupabasePersistenceError('resolveWorkspaceId', 'El usuario no pertenece a un workspace.')
    return membership.workspace_id
  }

  private async listRows<T extends TableName>(table: T, workspaceId: string) {
    const result = await (this.client as SupabaseClient).from(String(table)).select('*').eq('workspace_id', workspaceId)
    return unwrap(`list ${String(table)}`, result) as unknown as PublicTables[T]['Row'][]
  }

  private async insertRow<T extends TableName>(table: T, value: PublicTables[T]['Insert']) {
    const result = await (this.client as SupabaseClient).from(String(table)).insert(value).select('*').single()
    return unwrap(`create ${String(table)}`, result) as unknown as PublicTables[T]['Row']
  }

  private async updateRow<T extends TableName>(table: T, workspaceId: string, id: string, value: PublicTables[T]['Update']) {
    const result = await (this.client as SupabaseClient).from(String(table)).update(value).eq('workspace_id', workspaceId).eq('id', id).select('*').single()
    return unwrap(`update ${String(table)}`, result) as unknown as PublicTables[T]['Row']
  }

  async listPeople(workspaceId: string) { return (await this.listRows('accounts', workspaceId)).map(personMapper.fromRow) }
  async createPerson(input: Parameters<typeof personMapper.toInsert>[0]) { return personMapper.fromRow(await this.insertRow('accounts', personMapper.toInsert(input))) }
  async updatePerson(workspaceId: string, id: string, input: PublicTables['accounts']['Update']) { return personMapper.fromRow(await this.updateRow('accounts', workspaceId, id, input)) }

  async listOrganizations(workspaceId: string) { return (await this.listRows('organizations', workspaceId)).map(organizationMapper.fromRow) }
  async createOrganization(input: Parameters<typeof organizationMapper.toInsert>[0]) { return organizationMapper.fromRow(await this.insertRow('organizations', organizationMapper.toInsert(input))) }
  async updateOrganization(workspaceId: string, id: string, input: PublicTables['organizations']['Update']) { return organizationMapper.fromRow(await this.updateRow('organizations', workspaceId, id, input)) }

  async listOpportunities(workspaceId: string) { return (await this.listRows('opportunities', workspaceId)).map(opportunityMapper.fromRow) }
  async createOpportunity(input: PublicTables['opportunities']['Insert']) { return opportunityMapper.fromRow(await this.insertRow('opportunities', input)) }
  async updateOpportunity(workspaceId: string, id: string, input: PublicTables['opportunities']['Update']) { return opportunityMapper.fromRow(await this.updateRow('opportunities', workspaceId, id, input)) }

  async listEngagements(workspaceId: string) { return (await this.listRows('engagements', workspaceId)).map(engagementMapper.fromRow) }
  async createEngagement(input: PublicTables['engagements']['Insert']) { return engagementMapper.fromRow(await this.insertRow('engagements', input)) }
  async updateEngagement(workspaceId: string, id: string, input: PublicTables['engagements']['Update']) { return engagementMapper.fromRow(await this.updateRow('engagements', workspaceId, id, input)) }

  async listPrestations(workspaceId: string) { return (await this.listRows('prestations', workspaceId)).map(prestationMapper.fromRow) }
  async createPrestation(input: PublicTables['prestations']['Insert']) { return prestationMapper.fromRow(await this.insertRow('prestations', input)) }
  async updatePrestation(workspaceId: string, id: string, input: PublicTables['prestations']['Update']) { return prestationMapper.fromRow(await this.updateRow('prestations', workspaceId, id, input)) }

  async listActivities(workspaceId: string) { return (await this.listRows('activities', workspaceId)).map(activityMapper.fromRow) }
  async createActivity(input: PublicTables['activities']['Insert']) { return activityMapper.fromRow(await this.insertRow('activities', input)) }
  async updateActivity(workspaceId: string, id: string, input: PublicTables['activities']['Update']) { return activityMapper.fromRow(await this.updateRow('activities', workspaceId, id, input)) }

  async listPaymentRequests(workspaceId: string) { return (await this.listRows('payment_requests', workspaceId)).map(paymentRequestMapper.fromRow) }
  async createPaymentRequest(input: PublicTables['payment_requests']['Insert']) { return paymentRequestMapper.fromRow(await this.insertRow('payment_requests', input)) }
  async updatePaymentRequest(workspaceId: string, id: string, input: PublicTables['payment_requests']['Update']) { return paymentRequestMapper.fromRow(await this.updateRow('payment_requests', workspaceId, id, input)) }

  async listPayments(workspaceId: string) { return (await this.listRows('payments', workspaceId)).map(paymentMapper.fromRow) }
  async settlePaymentRequest(args: Database['public']['Functions']['settle_payment_request']['Args']) {
    return unwrap('settle payment request', await this.client.rpc('settle_payment_request', args))
  }
  async voidPayment(args: Database['public']['Functions']['void_received_payment']['Args']) {
    return unwrap('void received payment', await this.client.rpc('void_received_payment', args))
  }

  async listServices(workspaceId: string) { return (await this.listRows('services', workspaceId)).map(serviceMapper.fromRow) }
  async createService(input: PublicTables['services']['Insert']) { return serviceMapper.fromRow(await this.insertRow('services', input)) }
  async updateService(workspaceId: string, id: string, input: PublicTables['services']['Update']) { return serviceMapper.fromRow(await this.updateRow('services', workspaceId, id, input)) }
}
