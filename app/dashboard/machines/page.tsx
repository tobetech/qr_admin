'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { logAdmin } from '@/lib/log'

interface Machine {
  id: string
  machine_id: string
  name: string
  product_name: string
  price: number
  status: string
  location: string
  last_seen: string
  is_active: boolean
  mac_address: string
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '-'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'เมื่อกี้'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

const emptyEditForm = { name: '', product_name: '', price: '', is_active: true }
const emptyAddForm = { mac_address: '', name: '', product_name: '', price: '', is_active: true }

export default function MachinesPage() {
  const supabase = createClient()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<'edit' | 'add' | null>(null)
  const [selected, setSelected] = useState<Machine | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [addForm, setAddForm] = useState(emptyAddForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // QR scan
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

  useEffect(() => { loadMachines() }, [])
  useEffect(() => { return () => stopScanning() }, [])

  async function loadMachines() {
    setLoading(true)
    const { data } = await supabase.from('machines').select('*').order('machine_id')
    setMachines(data || [])
    setLoading(false)
  }

  // ── QR Scan ──
  function stopScanning() {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setScanning(false)
  }

  async function startScanning() {
    setScanError('')
    if (!('BarcodeDetector' in window)) {
      setScanError('เบราว์เซอร์นี้ไม่รองรับการสแกน QR กรุณากรอก MAC address ด้วยมือ')
      return
    }
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      await new Promise(r => setTimeout(r, 50))
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      // @ts-ignore
      const detector = new BarcodeDetector({ formats: ['qr_code'] })
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0) {
            setAddForm(f => ({ ...f, mac_address: codes[0].rawValue }))
            stopScanning()
          }
        } catch {}
      }, 500)
    } catch (err: any) {
      setScanError('ไม่สามารถเปิดกล้องได้: ' + err.message)
      setScanning(false)
    }
  }

  // ── Edit ──
  function openEdit(m: Machine) {
    setSelected(m)
    setEditForm({ name: m.name || '', product_name: m.product_name || '', price: m.price?.toString() || '', is_active: m.is_active })
    setError(''); setSuccess('')
    setModal('edit')
  }

  async function handleSaveEdit() {
    if (!selected) return
    if (!editForm.name.trim()) { setError('กรุณากรอกชื่อเครื่อง'); return }
    if (!editForm.price || isNaN(Number(editForm.price))) { setError('กรุณากรอกราคาที่ถูกต้อง'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/machines/${selected.machine_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name.trim(), product_name: editForm.product_name.trim(), price: parseFloat(editForm.price), is_active: editForm.is_active }),
      })
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
      await logAdmin('edit_machine', `machine=${selected.machine_id}`)
      setSuccess('บันทึกสำเร็จ')
      await loadMachines()
      setTimeout(() => setModal(null), 800)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  // ── Add ──
  function openAdd() {
    setAddForm(emptyAddForm)
    setError(''); setSuccess(''); setScanError('')
    stopScanning()
    setModal('add')
  }

  function closeAdd() {
    stopScanning()
    setModal(null)
  }

  async function handleSaveAdd() {
    if (!addForm.mac_address.trim()) { setError('กรุณาสแกน QR หรือกรอก MAC address'); return }
    if (!addForm.name.trim()) { setError('กรุณากรอกชื่อเครื่อง'); return }
    if (!addForm.price || isNaN(Number(addForm.price))) { setError('กรุณากรอกราคาที่ถูกต้อง'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac_address: addForm.mac_address.trim().toUpperCase(),
          name: addForm.name.trim(),
          product_name: addForm.product_name.trim(),
          price: parseFloat(addForm.price),
          is_active: addForm.is_active,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'เพิ่มเครื่องไม่สำเร็จ') }
      await logAdmin('add_machine', `mac=${addForm.mac_address} name=${addForm.name}`)
      setSuccess('เพิ่มเครื่องสำเร็จ')
      await loadMachines()
      setTimeout(() => setModal(null), 800)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h2>จัดการเครื่อง</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-sm" onClick={loadMachines}>🔄 รีเฟรช</button>
          <button className="btn-sm success" onClick={openAdd}>+ เพิ่มเครื่อง</button>
        </div>
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {machines.length === 0
              ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>ไม่มีเครื่อง</div>
              : machines.map(m => (
                <div key={m.machine_id} className="card-box" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, background: '#1d4ed820', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{m.name || m.machine_id}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{m.machine_id} · {m.product_name || '-'} · ฿{m.price || '-'} · IP: {m.location || '-'}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Last seen: {timeAgo(m.last_seen)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span className={`badge ${m.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
                      {m.status === 'online' ? '● Online' : '● Offline'}
                    </span>
                    <span className={`badge ${m.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {m.is_active ? 'เปิด' : 'ปิด'}
                    </span>
                    <button className="btn-sm" onClick={() => openEdit(m)}>✏️ แก้ไข</button>
                  </div>
                </div>
              ))}
          </div>
        )}

      {/* Modal Edit */}
      {modal === 'edit' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>แก้ไขเครื่อง — {selected.machine_id}</h3>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">ชื่อเครื่อง</label>
              <div className="input-wrap">
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น Office1" />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">ชื่อสินค้า</label>
              <div className="input-wrap">
                <input value={editForm.product_name} onChange={e => setEditForm(f => ({ ...f, product_name: e.target.value }))} placeholder="เช่น Mario2" />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">ราคา (฿)</label>
              <div className="input-wrap">
                <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} placeholder="20" min="0" />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {[10, 20, 50, 100].map(p => (
                  <button key={p} className="btn-sm" onClick={() => setEditForm(f => ({ ...f, price: p.toString() }))}>฿{p}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>
                <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} />
                เปิดใช้งาน
              </label>
            </div>

            {error && <div className="msg-error">{error}</div>}
            {success && <div className="msg-success">{success}</div>}
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={closeAdd}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3>เพิ่มเครื่องใหม่</h3>

            {/* QR Scan Section */}
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">MAC Address (สแกนจาก ESP32)</label>
              {scanning ? (
                <div>
                  <video
                    ref={videoRef}
                    style={{ width: '100%', borderRadius: 12, background: '#000', aspectRatio: '1', objectFit: 'cover', marginBottom: 8 }}
                    muted
                    playsInline
                  />
                  <button className="btn-sm danger" onClick={stopScanning} style={{ width: '100%', padding: '10px' }}>
                    ยกเลิกการสแกน
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div className="input-wrap" style={{ flex: 1 }}>
                      <input
                        value={addForm.mac_address}
                        onChange={e => setAddForm(f => ({ ...f, mac_address: e.target.value.toUpperCase() }))}
                        placeholder="AA:BB:CC:DD:EE:FF"
                        style={{ textTransform: 'uppercase', letterSpacing: 1 }}
                      />
                    </div>
                  </div>
                  <button
                    className="btn-sm"
                    onClick={startScanning}
                    style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    📷 สแกน QR จากหน้าจอตู้
                  </button>
                  {scanError && <div style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>{scanError}</div>}
                </>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">ชื่อเครื่อง</label>
              <div className="input-wrap">
                <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น Office1" />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">ชื่อสินค้า</label>
              <div className="input-wrap">
                <input value={addForm.product_name} onChange={e => setAddForm(f => ({ ...f, product_name: e.target.value }))} placeholder="เช่น Mario2" />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">ราคา (฿)</label>
              <div className="input-wrap">
                <input type="number" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} placeholder="20" min="0" />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {[10, 20, 50, 100].map(p => (
                  <button key={p} className="btn-sm" onClick={() => setAddForm(f => ({ ...f, price: p.toString() }))}>฿{p}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>
                <input type="checkbox" checked={addForm.is_active} onChange={e => setAddForm(f => ({ ...f, is_active: e.target.checked }))} />
                เปิดใช้งาน
              </label>
            </div>

            {error && <div className="msg-error">{error}</div>}
            {success && <div className="msg-success">{success}</div>}
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeAdd}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleSaveAdd} disabled={saving}>{saving ? 'กำลังเพิ่ม...' : 'เพิ่มเครื่อง'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
