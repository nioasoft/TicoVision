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

// Service role client for admin operations (setup, etc.)
// Only create if explicitly needed and service role key is available
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = null // Disabled to prevent multiple client instances
// Will be enabled when service role operations are needed
// export const supabaseAdmin = supabaseServiceRoleKey 
//   ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
//       auth: {
//         persistSession: false,
//         autoRefreshToken: false,
//       },
//       global: {
//         headers: {
//           'x-application-name': 'ticovision-crm-admin',
//         },
//       },
//     })
//   : null

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