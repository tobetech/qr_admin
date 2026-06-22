'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { logAdmin } from '@/lib/log'

interface LoyaltySettings {
  id: number
  is_enabled: boolean
  points_per_baht: number
}

interface LoyaltyTier {
  id: string
  tier_name: string
  min_points: number
  sort_order: number
}

const emptyTier = { tier_name: '', min_points: 0, sort_order: 0 }

export default function LoyaltyPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<LoyaltySettings | null>(null)
  const [tiers, setTiers] = useState<LoyaltyTier[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingTier, setSavingTier] = useState(false)
  const [modal, setModal] = useState(false)
  const [editTier, setEditTier] = useState<LoyaltyTier | null>(null)
  const [tierForm, setTierForm] = useState(emptyTier)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tierError, setTierError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [settingsRes, tiersRes] = await Promise.all([
      supabase.from('loyalty_settings').select('*').eq('id', 1).single(),
      supabase.from('loyalty_tiers').select('*').order('sort_order'),
    ])
    setSettings(settingsRes.data)
    setTiers(tiersRes.data || [])
    setLoading(false)
  }

  async function handleSaveSettings() {
    if (!settings) return
    setSavingSettings(true)
    setError('')
    setSuccess('')
    try {
      const { error: err } = await supabase
        .from('loyalty_settings')
        .update({
          is_enabled: settings.is_enabled,
          points_per_baht: settings.points_per_baht,
        })
        .eq('id', 1)
      if (err) throw new Error(err.message)
      await logAdmin('edit_loyalty_settings', `enabled=${settings.is_enabled} points_per_baht=${settings.points_per_baht}`)
      setSuccess('บันทึกการตั้งค่าสำเร็จ')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingSettings(false)
    }
  }

  function openAddTier() {
    setEditTier(null)
    setTierForm(emptyTier)
    setTierError('')
    setModal(true)
  }

  function openEditTier(t: LoyaltyTier) {
    setEditTier(t)
    setTierForm({ tier_name: t.tier_name, min_points: t.min_points, sort_order: t.sort_order })
    setTierError('')
    setModal(true)
  }

  async function handleSaveTier() {
    if (!tierForm.tier_name.trim()) { setTierError('กรุณากรอกชื่อ Tier'); return }
    setSavingTier(true)
    setTierError('')
    try {
      if (editTier) {
        const { error: err } = await supabase
          .from('loyalty_tiers')
          .update({ tier_name: tierForm.tier_name.trim(), min_points: Number(tierForm.min_points), sort_order: Number(tierForm.sort_order) })
          .eq('id', editTier.id)
        if (err) throw new Error(err.message)
        await logAdmin('edit_loyalty_tier', `name=${tierForm.tier_name}`)
      } else {
        const { error: err } = await supabase
          .from('loyalty_tiers')
          .insert({ tier_name: tierForm.tier_name.trim(), min_points: Number(tierForm.min_points), sort_order: Number(tierForm.sort_order) })
        if (err) throw new Error(err.message)
        await logAdmin('add_loyalty_tier', `name=${tierForm.tier_name}`)
      }
      await loadData()
      setModal(false)
    } catch (e: any) {
      setTierError(e.message)
    } finally {
      setSavingTier(false)
    }
  }

  async function handleDeleteTier(t: LoyaltyTier) {
    if (!confirm(`ต้องการลบ Tier "${t.tier_name}" ออกจากระบบ?`)) return
    await supabase.from('loyalty_tiers').delete().eq('id', t.id)
    await logAdmin('delete_loyalty_tier', `name=${t.tier_name}`)
    await loadData()
  }

  const tierColors: Record<string, string> = {
    Bronze: '#fb923c',
    Silver: '#94a3b8',
    Gold: '#fbbf24',
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h2>ระบบคะแนนสะสม</h2>
      </div>

      {/* การตั้งค่าหลัก */}
      <div className="card-box" style={{ padding: 24, marginBottom: 24, maxWidth: 500 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
          ตั้งค่าระบบคะแนน
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div
              onClick={() => settings && setSettings(s => s ? { ...s, is_enabled: !s.is_enabled } : s)}
              style={{
                width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                position: 'relative', background: settings?.is_enabled ? '#16a34a' : '#334155',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, width: 20, height: 20,
                background: '#fff', borderRadius: '50%', transition: 'left 0.2s',
                left: settings?.is_enabled ? '25px' : '3px',
              }} />
            </div>
            <span style={{ color: '#f1f5f9', fontSize: 14 }}>
              {settings?.is_enabled ? 'เปิดใช้งานระบบคะแนน' : 'ปิดใช้งานระบบคะแนน'}
            </span>
          </label>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="field-label">คะแนนที่ได้รับต่อ ฿1 ที่ใช้จ่าย</label>
          <div className="input-wrap" style={{ maxWidth: 200 }}>
            <input
              type="number"
              value={settings?.points_per_baht || 0}
              onChange={e => settings && setSettings(s => s ? { ...s, points_per_baht: parseFloat(e.target.value) || 0 } : s)}
              min="0"
              step="0.1"
              placeholder="1"
            />
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            เช่น ใส่ 1 = ซื้อสินค้า ฿1 ได้ 1 คะแนน, ใส่ 0.5 = ซื้อ ฿2 ได้ 1 คะแนน
          </div>
        </div>

        {error && <div className="msg-error">{error}</div>}
        {success && <div className="msg-success">{success}</div>}

        <button className="btn-primary" onClick={handleSaveSettings} disabled={savingSettings}>
          {savingSettings ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
        </button>
      </div>

      {/* Tiers */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>ระดับสมาชิก (Tiers)</div>
        <button className="btn-sm success" onClick={openAddTier}>+ เพิ่ม Tier</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ชื่อ Tier</th>
              <th>คะแนนขั้นต่ำ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {tiers.length === 0
              ? <tr><td colSpan={4} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ยังไม่มี Tier</td></tr>
              : tiers.map(t => (
                <tr key={t.id}>
                  <td style={{ color: '#64748b' }}>{t.sort_order}</td>
                  <td>
                    <span style={{
                      fontWeight: 600,
                      color: tierColors[t.tier_name] || '#f1f5f9',
                      fontSize: 15,
                    }}>
                      ★ {t.tier_name}
                    </span>
                  </td>
                  <td style={{ color: '#f1f5f9' }}>{t.min_points.toLocaleString()} คะแนน</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-sm" onClick={() => openEditTier(t)}>✏️ แก้ไข</button>
                      <button className="btn-sm danger" onClick={() => handleDeleteTier(t)}>🗑️ ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal Tier */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{editTier ? 'แก้ไข Tier' : 'เพิ่ม Tier ใหม่'}</h3>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">ชื่อ Tier *</label>
              <div className="input-wrap">
                <input
                  value={tierForm.tier_name}
                  onChange={e => setTierForm(f => ({ ...f, tier_name: e.target.value }))}
                  placeholder="เช่น Bronze, Silver, Gold"
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">คะแนนขั้นต่ำ</label>
              <div className="input-wrap">
                <input
                  type="number"
                  value={tierForm.min_points}
                  onChange={e => setTierForm(f => ({ ...f, min_points: Number(e.target.value) }))}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">ลำดับการแสดง</label>
              <div className="input-wrap">
                <input
                  type="number"
                  value={tierForm.sort_order}
                  onChange={e => setTierForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {tierError && <div className="msg-error">{tierError}</div>}

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleSaveTier} disabled={savingTier}>
                {savingTier ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
