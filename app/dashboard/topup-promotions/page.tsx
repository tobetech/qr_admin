'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { logAdmin } from '@/lib/log'

interface Slot {
  id: string
  slot: number
  min_amount: number
  bonus_bronze: number
  bonus_silver: number
  bonus_gold: number
  is_active: boolean
}

export default function TopupPromotionsPage() {
  const supabase = createClient()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadSlots() }, [])

  async function loadSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('topup_promotions')
      .select('*')
      .order('slot')
    setSlots(data || [])
    setLoading(false)
  }

  function updateSlot(slot: number, field: keyof Slot, value: any) {
    setSlots(prev => prev.map(s => s.slot === slot ? { ...s, [field]: value } : s))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      for (const s of slots) {
        const { error: err } = await supabase
          .from('topup_promotions')
          .update({
            min_amount: Number(s.min_amount) || 0,
            bonus_bronze: Number(s.bonus_bronze) || 0,
            bonus_silver: Number(s.bonus_silver) || 0,
            bonus_gold: Number(s.bonus_gold) || 0,
            is_active: s.is_active,
          })
          .eq('slot', s.slot)
        if (err) throw new Error(err.message)
      }
      await logAdmin('save_topup_promotions', 'บันทึกตั้งค่าโปรโมชั่นเติมเงิน')
      setSuccess('บันทึกสำเร็จ')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h2>ตั้งค่าโปรโมชั่นเติมเงิน</h2>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
        </button>
      </div>

      {/* คำอธิบาย */}
      <div className="card-box" style={{ padding: 20, marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          กำหนดโบนัสเครดิตเมื่อสมาชิกเติมเงินถึงจำนวนที่กำหนด แยกตาม Tier ครับ
        </p>

        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 60px',
          gap: 8,
          marginBottom: 12,
          padding: '0 4px',
        }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>ช่อง</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>เติมเงินขั้นต่ำ (฿)</div>
          <div style={{ fontSize: 11, color: '#fb923c', fontWeight: 600 }}>Bronze (+฿)</div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Silver (+฿)</div>
          <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>Gold (+฿)</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>เปิดใช้</div>
        </div>

        {/* Slots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {slots.map(s => (
            <div key={s.slot} style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 60px',
              gap: 8,
              alignItems: 'center',
              padding: '8px 4px',
              borderRadius: 10,
              background: s.is_active ? 'transparent' : 'rgba(100,116,139,0.05)',
            }}>
              {/* ชื่อช่อง */}
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: s.is_active ? '#f1f5f9' : '#475569',
              }}>
                ช่อง {s.slot}
              </div>

              {/* เติมเงินขั้นต่ำ */}
              <div className="input-wrap">
                <input
                  type="number"
                  value={s.min_amount}
                  onChange={e => updateSlot(s.slot, 'min_amount', e.target.value)}
                  min="0"
                  style={{ opacity: s.is_active ? 1 : 0.5 }}
                />
              </div>

              {/* Bronze */}
              <div className="input-wrap">
                <input
                  type="number"
                  value={s.bonus_bronze}
                  onChange={e => updateSlot(s.slot, 'bonus_bronze', e.target.value)}
                  min="0"
                  style={{ color: '#fb923c', opacity: s.is_active ? 1 : 0.5 }}
                />
              </div>

              {/* Silver */}
              <div className="input-wrap">
                <input
                  type="number"
                  value={s.bonus_silver}
                  onChange={e => updateSlot(s.slot, 'bonus_silver', e.target.value)}
                  min="0"
                  style={{ color: '#94a3b8', opacity: s.is_active ? 1 : 0.5 }}
                />
              </div>

              {/* Gold */}
              <div className="input-wrap">
                <input
                  type="number"
                  value={s.bonus_gold}
                  onChange={e => updateSlot(s.slot, 'bonus_gold', e.target.value)}
                  min="0"
                  style={{ color: '#fbbf24', opacity: s.is_active ? 1 : 0.5 }}
                />
              </div>

              {/* Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  onClick={() => updateSlot(s.slot, 'is_active', !s.is_active)}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: s.is_active ? '#2563eb' : '#334155',
                    position: 'relative', cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, width: 18, height: 18,
                    background: '#fff', borderRadius: '50%',
                    transition: 'left 0.2s',
                    left: s.is_active ? '23px' : '3px',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div style={{ marginTop: 24, padding: '16px', background: '#0f172a', borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, fontWeight: 600 }}>
            ตัวอย่าง: ลูกค้า tier Bronze เติม ฿100
          </div>
          {(() => {
            const activeSlots = slots.filter(s => s.is_active && s.min_amount > 0 && 100 >= s.min_amount)
            const matched = activeSlots.sort((a, b) => b.min_amount - a.min_amount)[0]
            if (!matched) return <p style={{ fontSize: 12, color: '#475569' }}>ไม่เข้าเงื่อนไขโปรโมชั่นใด</p>
            return (
              <div style={{ fontSize: 13, color: '#f1f5f9' }}>
                เข้าช่อง {matched.slot} (เติมขั้นต่ำ ฿{matched.min_amount}) →
                ได้โบนัส <span style={{ color: '#fb923c', fontWeight: 600 }}>+฿{matched.bonus_bronze}</span>
                {' '}= ยอดรวม <span style={{ color: '#4ade80', fontWeight: 600 }}>฿{100 + matched.bonus_bronze}</span>
              </div>
            )
          })()}
        </div>
      </div>

      {error && <div className="msg-error">{error}</div>}
      {success && <div className="msg-success">✅ {success}</div>}
    </div>
  )
}
