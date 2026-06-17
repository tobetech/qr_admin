'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Machine {
  id: string
  machine_id: string
  name: string
  product_name: string
  price: number
  stock: number
  is_active: boolean
  status: string
  last_seen: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [shopName, setShopName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: shop } = await supabase
        .from('shops')
        .select('id, shop_name')
        .eq('owner_id', user.id)
        .single()

      if (!shop) {
        router.push('/login')
        return
      }

      setShopName(shop.shop_name)

      const { data: machinesData } = await supabase
        .from('machines')
        .select('*')
        .eq('shop_id', shop.id)
        .order('machine_id')

      setMachines(machinesData || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalStock = machines.reduce((sum, m) => sum + (m.stock || 0), 0)
  const activeMachines = machines.filter(m => m.is_active).length
  const onlineMachines = machines.filter(m => m.status === 'online').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg text-gray-900">{shopName}</h1>
          <p className="text-sm text-gray-500">Admin Dashboard</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 font-medium"
        >
          ออกจากระบบ
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">เครื่องทั้งหมด</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{machines.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">ออนไลน์</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{onlineMachines}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">สต็อกรวม</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalStock}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">เครื่องของฉัน</h2>
          </div>

          <div className="space-y-3">
            {machines.map(machine => (
              <div
                key={machine.id}
                onClick={() => router.push(`/dashboard/machines/${machine.machine_id}`)}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${machine.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">{machine.name || machine.machine_id}</p>
                    <p className="text-sm text-gray-500">{machine.product_name} · ฿{machine.price}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${machine.stock === 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    สต็อก {machine.stock}
                  </p>
                  <p className="text-xs text-gray-400">
                    {machine.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </p>
                </div>
              </div>
            ))}

            {machines.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                ยังไม่มีเครื่องในร้านนี้
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
