'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

export default function MachineDetailPage() {
  const router = useRouter()
  const params = useParams()
  const machineId = params.machine_id as string
  const supabase = createClient()

  const [machine, setMachine] = useState<Machine | null>(null)
  const [name, setName] = useState('')
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error: fetchErr } = await supabase
        .from('machines')
        .select('*')
        .eq('machine_id', machineId)
        .single()

      if (fetchErr || !data) {
        setError('ไม่พบเครื่องนี้')
        setLoading(false)
        return
      }

      setMachine(data)
      setName(data.name || '')
      setProductName(data.product_name || '')
      setPrice(String(data.price ?? ''))
      setStock(String(data.stock ?? 0))
      setIsActive(data.is_active)
      setLoading(false)
    }
    load()
  }, [machineId])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/machines/${machineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          product_name: productName,
          price: parseFloat(price),
          stock: parseInt(stock),
          is_active: isActive,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ')

      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error}</p>
        <button onClick={() => router.push('/dashboard')} className="text-indigo-600">
          กลับหน้าหลัก
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 sm:px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-indigo-600 font-medium">
          ← กลับ
        </button>
        <h1 className="font-bold text-lg text-gray-900">{machine.machine_id}</h1>
      </div>

      <div className="p-4 sm:p-6 max-w-md mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${machine.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-600">
              {machine.status === 'online' ? 'ออนไลน์' : 'ออฟไลน์'}
            </span>
          </div>
          {machine.last_seen && (
            <span className="text-xs text-gray-400">
              {new Date(machine.last_seen).toLocaleString('th-TH')}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเครื่อง</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า</label>
          <input
            type="text"
            value={productName}
            onChange={e => setProductName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ราคา (บาท)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สต็อก</label>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4">
          <span className="text-sm font-medium text-gray-700">เปิดใช้งานเครื่องนี้</span>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`w-12 h-7 rounded-full transition relative ${isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${isActive ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-xl">
            บันทึกสำเร็จ ส่งค่าไปที่เครื่องแล้ว
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-base hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  )
}
