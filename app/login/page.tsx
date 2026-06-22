'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { logAdmin } from '@/lib/log'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const email = `${phone}@vending.local`
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })

    if (authErr || !data.user) {
      setError('เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
      return
    }

    // เช็คว่าเป็น admin ไหม (มี shop ของตัวเอง)
    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', data.user.id)
      .single()

    if (!shop) {
      await supabase.auth.signOut()
      setError('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน Admin')
      setLoading(false)
      return
    }

    await logAdmin('login', `phone=${phone}`)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: '#0f172a',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#1e293b',
        borderRadius: '24px',
        padding: '48px 40px',
        border: '1px solid #334155',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72,
          borderRadius: 20,
          background: '#1d4ed8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
        </div>

        <div style={{ textAlign: 'center', color: '#f8fafc', fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
          Vending Admin
        </div>
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginBottom: 36 }}>
          เข้าสู่ระบบสำหรับผู้ดูแลระบบ
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="field-label">เบอร์โทรศัพท์</label>
            <div className="input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ marginRight: 8 }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="0812345678"
                required
                inputMode="numeric"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="field-label">รหัสผ่าน</label>
            <div className="input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ marginRight: 8 }}>
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && handleLogin(e as any)}
              />
            </div>
          </div>

          {error && <div className="msg-error" style={{ marginBottom: 0 }}>{error}</div>}

          <button
            type="submit"
            className="btn-primary full"
            disabled={loading}
            style={{ marginTop: 8, padding: '13px' }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  )
}
