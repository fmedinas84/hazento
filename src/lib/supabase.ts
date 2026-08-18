import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/**
 * The visual prototype runs with the isolated demo repository by default.
 * A real client is only created when both public environment variables exist.
 * Never place a service-role or secret key in a VITE_* variable.
 */
export const supabase: SupabaseClient | null =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null

export const isSupabaseConfigured = Boolean(supabase)
