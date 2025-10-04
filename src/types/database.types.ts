export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Functions: {
      get_users_for_tenant: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_active: boolean
          last_sign_in_at: string
          permissions: Json
          phone: string
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }[]
      }
    }
  }
}
