import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey)
  : null

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
    )
  }
  return supabase
}

export const auth = {
  async signUp({ email, password, fullName }) {
    const client = requireClient()
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    return data
  },

  async signIn({ email, password }) {
    const client = requireClient()
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signOut() {
    const client = requireClient()
    const { error } = await client.auth.signOut()
    if (error) throw error
  },

  async getSession() {
    if (!supabase) return null
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },
}
