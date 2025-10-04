import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application-name': 'ticovision-crm',
    },
  },
})

// Helper function to get the current user's tenant ID
export async function getCurrentTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.user_metadata?.tenant_id || null
}

// Helper function to get the current user's role
export async function getCurrentUserRole(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.user_metadata?.role || null
}