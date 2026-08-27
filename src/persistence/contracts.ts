/** Persistence-neutral contracts for the future DemoStore -> Supabase switch. */
export type PersistenceStatus = 'idle' | 'loading' | 'success' | 'error'

export type PersistenceResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

export type MutationContext = {
  workspaceId: string
  /** Stable key used by remote implementations to reject duplicate submissions. */
  idempotencyKey?: string
}

export interface AsyncRepository<TEntity, TCreate, TUpdate> {
  list(workspaceId: string): Promise<PersistenceResult<TEntity[]>>
  getById(workspaceId: string, id: string): Promise<PersistenceResult<TEntity | null>>
  create(input: TCreate, context: MutationContext): Promise<PersistenceResult<TEntity>>
  update(id: string, input: TUpdate, context: MutationContext): Promise<PersistenceResult<TEntity>>
}

export const ok = <T>(data: T): PersistenceResult<T> => ({ status: 'success', data })
export const failure = (cause: unknown): PersistenceResult<never> => ({
  status: 'error',
  error: cause instanceof Error ? cause : new Error('No pudimos completar la operación.'),
})
