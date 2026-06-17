'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const PHONE_DOMAIN = '@vending.local'

function phoneToEmail(phone: string) {
  return `${phone}${PHONE_DOMAIN}`
}

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

    const fakeEmail = phoneToEmail(phone)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    })

    if (signInError) {
      setError('เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
      return
    }

    // เช็คว่ามีร้านเป็นของตัวเองไหม
    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', data.user.id)
      .single()

    if (!shop) {
      setError('บัญชีนี้ไม่มีร้านที่ผูกอยู่ กรุณาติดต่อผู้ดูแลระบบ')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 sm:px-6 py-12 bg-gray-50">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <span className="text-white text-3xl">🏪</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-1">เข้าสู่ระบบสำหรับเจ้าของร้าน</p>
      </div>

      <form onSubmit={handleLogin} className="max-w-sm w-full mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
            required
            inputMode="numeric"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            placeholder="0812345678"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-base hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50"
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
