import { createClient } from './supabase'

export async function logAdmin(action: string, detail = '') {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('admin_logs').insert({
      admin_email: user.email,
      action,
      detail,
    })
  } catch (e) {
    console.error('logAdmin error:', e)
  }
}
