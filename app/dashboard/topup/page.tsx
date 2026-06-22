'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { logAdmin } from '@/lib/log'

interface Member {
  id: string
  full_name: string
  phone: string
  balance: number
}

interface AdminTopup {
  id: string
  member_name: string
  phone: string
  amount: number
  note: string
  admin_email: string
  created_at: string
}

export default function TopupPage() {
  const supabase = createClient()
  const [phone, setPhone] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [history, setHistory] = useState<AdminTopup[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => { loadHistory() }, [])

  async function loadHistory() {
    setLoadingHistory(true)
    const { data } = await supabase
      .from('admin_topups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setHistory(data || [])
    setLoadingHistory(false)
  }

  async function handleSearch() {
    if (phone.length < 9) { setError('กรุณากรอกเบอร์โทรให้ครบ'); return }
    setSearching(true)
    setError('')
    setMember(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/customers/search?phone=${phone.trim()}`)
      const data = await res.json()
      const found = data.customer || data.user
      if (!found) { setError('ไม่พบสมาชิกหมายเลขนี้'); return }
      setMember(found)
    } catch {
      setError('เกิดข้อผิดพลาดในการค้นหา')
    } finally {
      setSearching(false)
    }
  }

  async function handleTopup() {
    if (!member) { setError('กรุณาค้นหาสมาชิกก่อน'); return }
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('กรุณากรอกจำนวนเงินที่ถูกต้อง'); return }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const newBalance = parseFloat(member.balance?.toString() || '0') + amt

      const { error: updateErr } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', member.id)
      if (updateErr) throw new Error(updateErr.message)

      await supabase.from('admin_topups').insert({
        user_id: member.id,
        member_name: member.full_name,
        phone: member.phone,
        amount: amt,
        note: note || null,
        admin_email: user?.email || 'admin',
      })

      await logAdmin('admin_topup', `user=${member.full_name} phone=${member.phone} amount=${amt}`)

      setSuccess(`เติมเงิน ฿${amt.toFixed(2)} ให้ ${member.full_name} สำเร็จ ยอดใหม่: ฿${newBalance.toFixed(2)}`)
      setMember({ ...member, balance: newBalance })
      setAmount('')
      setNote('')
      await loadHistory()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>เติมเงินสมาชิก</h2>
        <button className="btn-sm" onClick={loadHistory}>🔄 รีเฟรช</button>
      </div>

      {/* ฟอร์มเติมเงิน */}
      <div className="card-box" style={{ padding: 24, marginBottom: 24, maxWidth: 500 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
          เติมเครดิตให้สมาชิก
        </div>

        {/* ค้นหา */}
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">หมายเลขโทรศัพท์สมาชิก</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="input-wrap" style={{ flex: 1 }}>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="0812345678"
                inputMode="numeric"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button className="btn-sm" onClick={handleSearch} disabled={searching} style={{ padding: '0 16px' }}>
              {searching ? '...' : 'ค้นหา'}
            </button>
          </div>
        </div>

        {/* ผลค้นหา */}
        {member && (
          <div style={{ background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1d4ed820', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{member.full_name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {member.phone} · ยอดปัจจุบัน: <span style={{ color: '#fbbf24' }}>฿{parseFloat(member.balance?.toString() || '0').toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* จำนวนเงิน */}
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">จำนวนเงินที่เติม (฿)</label>
          <div className="input-wrap">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="100"
              min="1"
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {[20, 50, 100, 200, 500].map(a => (
              <button key={a} className="btn-sm" onClick={() => setAmount(a.toString())}>฿{a}</button>
            ))}
          </div>
        </div>

        {/* หมายเหตุ */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">หมายเหตุ (ไม่บังคับ)</label>
          <div className="input-wrap">
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เช่น โปรโมชั่น, เติมเงินพิเศษ"
            />
          </div>
        </div>

        {error && <div className="msg-error">{error}</div>}
        {success && <div className="msg-success">{success}</div>}

        <button className="btn-primary full" onClick={handleTopup} disabled={saving || !member}>
          {saving ? 'กำลังเติมเงิน...' : 'เติมเครดิต'}
        </button>
      </div>

      {/* ประวัติ */}
      <div className="section-title">ประวัติการเติมเงินโดย Admin</div>
      {loadingHistory
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ชื่อสมาชิก</th>
                  <th>เบอร์</th>
                  <th>จำนวนเงิน</th>
                  <th>หมายเหตุ</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ยังไม่มีรายการ</td></tr>
                  : history.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(h.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{h.member_name || '-'}</td>
                      <td style={{ color: '#fbbf24' }}>{h.phone || '-'}</td>
                      <td style={{ color: '#4ade80', fontWeight: 600 }}>+฿{parseFloat(h.amount?.toString() || '0').toFixed(2)}</td>
                      <td style={{ color: '#94a3b8' }}>{h.note || '-'}</td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{h.admin_email || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
