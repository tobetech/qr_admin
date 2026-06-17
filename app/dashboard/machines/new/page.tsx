'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NewMachinePage() {
  const router = useRouter()
  const supabase = createClient()

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [shopId, setShopId] = useState('')
  const [macAddress, setMacAddress] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

  const [machineId, setMachineId] = useState('')
  const [name, setName] = useState('')
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!shop) {
        router.push('/login')
        return
      }

      setShopId(shop.id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    return () => stopScanning()
  }, [])

  async function startScanning() {
    setScanError('')

    if (!('BarcodeDetector' in window)) {
      setScanError('เบราว์เซอร์นี้ไม่รองรับการสแกน QR กรุณากรอก MAC address ด้วยมือ')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setScanning(true)

      // @ts-ignore - BarcodeDetector ไม่อยู่ใน TS lib มาตรฐานทุกเวอร์ชัน
      const detector = new BarcodeDetector({ formats: ['qr_code'] })

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0) {
            const value = codes[0].rawValue
            setMacAddress(value)
            stopScanning()
          }
        } catch {
          // เฟรมนี้ตรวจไม่เจอ ลองเฟรมต่อไป
        }
      }, 500)
    } catch (err: any) {
      setScanError('ไม่สามารถเปิดกล้องได้: ' + err.message)
    }
  }

  function stopScanning() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!machineId.trim()) {
      setError('กรุณากรอกรหัสเครื่อง')
      return
    }
    if (!macAddress.trim()) {
      setError('กรุณาสแกน QR หรือกรอก MAC address ของเครื่อง')
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: machineId.trim().toUpperCase(),
          mac_address: macAddress.trim(),
          shop_id: shopId,
          name,
          product_name: productName,
          price: parseFloat(price) || 0,
          stock: parseInt(stock) || 0,
          is_active: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'สร้างเครื่องไม่สำเร็จ')

      router.push(`/dashboard/machines/${data.machine.machine_id}`)
    } catch (err: any) {
      setError(err.message)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 sm:px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-indigo-600 font-medium">
          ← กลับ
        </button>
        <h1 className="font-bold text-lg text-gray-900">เพิ่มเครื่องใหม่</h1>
      </div>

      <div className="p-4 sm:p-6 max-w-md mx-auto space-y-5">
        {/* ส่วนสแกน MAC address */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            MAC Address ของเครื่อง
          </label>

          {scanning ? (
            <div className="space-y-3">
              <video
                ref={videoRef}
                className="w-full rounded-xl bg-black aspect-square object-cover"
                muted
                playsInline
              />
              <button
                type="button"
                onClick={stopScanning}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium"
              >
                ยกเลิกการสแกน
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={macAddress}
                onChange={e => setMacAddress(e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white mb-2"
              />
              <button
                type="button"
                onClick={startScanning}
                className="w-full py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              >
                📷 สแกน QR จากหน้าจอตู้
              </button>
              {scanError && (
                <p className="text-red-500 text-xs mt-2">{scanError}</p>
              )}
            </>
          )}
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสเครื่อง (machine_id)
            </label>
            <input
              type="text"
              value={machineId}
              onChange={e => setMachineId(e.target.value)}
              required
              placeholder="VM002"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white uppercase"
            />
            <p className="text-xs text-gray-400 mt-1">
              ตั้งชื่อเองได้ แต่ห้ามซ้ำกับเครื่องอื่น
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเครื่อง</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ตู้ออฟฟิศ 2"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า</label>
            <input
              type="text"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="น้ำเปล่า"
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
                placeholder="10"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สต็อกเริ่มต้น</label>
              <input
                type="number"
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-base hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50"
          >
            {saving ? 'กำลังสร้าง...' : 'สร้างเครื่อง'}
          </button>
        </form>
      </div>
    </div>
  )
}
