'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Customer {
  id: string
  full_name: string
  phone: string
  balance: number
  loyalty_points: number
  created_at: string
}

export default function CustomersPage() {
  const router = useRouter()
  const supabase = createClient()

  const [phone, setPhone] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
    }
    checkAuth()
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchError('')
    setCustomer(null)
    setResetSuccess(false)
    setNewPassword('')

    if (!phone.trim()) {
      setSearchError('กรุณากรอกเบอร์โทรศัพท์')
      return
    }

    setSearching(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/customers/search?phone=${encodeURIComponent(phone.trim())}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ค้นหาไม่สำเร็จ')
      setCustomer(data.customer)
    } catch (err: any) {
      setSearchError(err.message)
    } finally {
      setSearching(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetError('')
    setResetSuccess(false)

    if (!newPassword || newPassword.length < 6) {
      setResetError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    if (!customer) return

    setResetting(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/customers/${customer.id}/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: newPassword }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'รีเซ็ตไม่สำเร็จ')
      setResetSuccess(true)
      setNewPassword('')
    } catch (err: any) {
      setResetError(err.message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 sm:px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-indigo-600 font-medium">
          ← กลับ
        </button>
        <h1 className="font-bold text-lg text-gray-900">จัดการสมาชิก</h1>
      </div>

      <div className="p-4 sm:p-6 max-w-md mx-auto space-y-5">
        <form onSubmit={handleSearch} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            ค้นหาด้วยเบอร์โทรศัพท์
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="0812345678"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
            >
              {searching ? '...' : 'ค้นหา'}
            </button>
          </div>
          {searchError && (
            <p className="text-red-500 text-sm">{searchError}</p>
          )}
        </form>

        {customer && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div>
              <p className="font-semibold text-gray-900 text-lg">{customer.full_name}</p>
              <p className="text-sm text-gray-500">{customer.phone}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">ยอดเงินคงเหลือ</p>
                <p className="font-bold text-gray-900">฿{customer.balance.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">คะแนนสะสม</p>
                <p className="font-bold text-gray-900">{customer.loyalty_points}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="font-medium text-gray-900 mb-3">ตั้งรหัสผ่านใหม่</p>
              <form onSubmit={handleResetPassword} className="space-y-3">
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                />

                {resetError && (
                  <p className="text-red-500 text-sm">{resetError}</p>
                )}
                {resetSuccess && (
                  <p className="text-green-600 text-sm">รีเซ็ตรหัสผ่านสำเร็จแล้ว</p>
                )}

                <button
                  type="submit"
                  disabled={resetting}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {resetting ? 'กำลังบันทึก...' : 'รีเซ็ตรหัสผ่าน'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
