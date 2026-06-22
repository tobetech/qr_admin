'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { logAdmin } from '@/lib/log'

interface Reward {
  id: string
  name: string
  description: string
  image_url: string
  points_cost: number
  tier_required: string
  is_active: boolean
}

interface Tier {
  tier_name: string
  sort_order: number
}

const emptyForm = {
  name: '',
  description: '',
  image_url: '',
  points_cost: '',
  tier_required: 'Bronze',
  is_active: true,
}

export default function RewardsPage() {
  const supabase = createClient()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [rewardsRes, tiersRes] = await Promise.all([
      supabase.from('rewards').select('*').order('tier_required').order('points_cost'),
      supabase.from('loyalty_tiers').select('tier_name, sort_order').order('sort_order'),
    ])
    setRewards(rewardsRes.data || [])
    setTiers(tiersRes.data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditId(null)
    setForm({ ...emptyForm, tier_required: tiers[0]?.tier_name || 'Bronze' })
    setError(''); setSuccess('')
    setModal(true)
  }

  function openEdit(r: Reward) {
    setEditId(r.id)
    setForm({
      name: r.name || '',
      description: r.description || '',
      image_url: r.image_url || '',
      points_cost: r.points_cost?.toString() || '',
      tier_required: r.tier_required || 'Bronze',
      is_active: r.is_active,
    })
    setError(''); setSuccess('')
    setModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('กรุณากรอกชื่อสินค้า'); return }
    if (!form.points_cost || isNaN(Number(form.points_cost))) { setError('กรุณากรอกคะแนนที่ใช้แลก'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        points_cost: parseInt(form.points_cost),
        tier_required: form.tier_required,
        is_active: form.is_active,
      }
      if (editId) {
        const { error: err } = await supabase.from('rewards').update(payload).eq('id', editId)
        if (err) throw new Error(err.message)
        await logAdmin('edit_reward', `name=${form.name}`)
      } else {
        const { error: err } = await supabase.from('rewards').insert(payload)
        if (err) throw new Error(err.message)
        await logAdmin('add_reward', `name=${form.name}`)
      }
      setSuccess(editId ? 'แก้ไขสำเร็จ' : 'เพิ่มสินค้าสำเร็จ')
      await loadData()
      setTimeout(() => setModal(false), 800)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(r: Reward) {
    await supabase.from('rewards').update({ is_active: !r.is_active }).eq('id', r.id)
    await logAdmin('toggle_reward', `name=${r.name} active=${!r.is_active}`)
    await loadData()
  }

  async function handleDelete(r: Reward) {
    if (!confirm(`ต้องการลบ "${r.name}" ออกจากระบบ?`)) return
    await supabase.from('rewards').delete().eq('id', r.id)
    await logAdmin('delete_reward', `name=${r.name}`)
    await loadData()
  }

  const tierColors: Record<string, string> = {
    Bronze: '#fb923c',
    Silver: '#94a3b8',
    Gold: '#fbbf24',
  }

  return (
    <div>
      <div className="page-header">
        <h2>สินค้าแลกคะแนน</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-sm" onClick={loadData}>🔄 รีเฟรช</button>
          <button className="btn-sm success" onClick={openAdd}>+ เพิ่มสินค้า</button>
        </div>
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>สินค้า</th>
                  <th>รายละเอียด</th>
                  <th>Tier</th>
                  <th>คะแนนที่ใช้แลก</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rewards.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ยังไม่มีสินค้า</td></tr>
                  : rewards.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {r.image_url
                            ? <img src={r.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #334155' }} />
                            : <div style={{ width: 40, height: 40, borderRadius: 8, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎁</div>
                          }
                          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{r.name}</span>
                        </div>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.description || '-'}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: tierColors[r.tier_required] || '#f1f5f9', fontSize: 13 }}>
                          ★ {r.tier_required}
                        </span>
                      </td>
                      <td style={{ color: '#fbbf24', fontWeight: 600 }}>
                        ⭐ {r.points_cost?.toLocaleString()} คะแนน
                      </td>
                      <td>
                        <span className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`}>
                          {r.is_active ? 'เปิด' : 'ปิด'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-sm" onClick={() => openEdit(r)}>✏️ แก้ไข</button>
                          <button className={`btn-sm ${r.is_active ? 'danger' : 'success'}`} onClick={() => toggleActive(r)}>
                            {r.is_active ? 'ปิด' : 'เปิด'}
                          </button>
                          <button className="btn-sm danger" onClick={() => handleDelete(r)}>🗑️ ลบ</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3>{editId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าแลกคะแนน'}</h3>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">ชื่อสินค้า *</label>
              <div className="input-wrap">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น กาแฟฟรี 1 แก้ว" />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">รายละเอียด</label>
              <div className="input-wrap">
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="รายละเอียดสินค้า" />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">URL รูปภาพ</label>
              <div className="input-wrap">
                <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              </div>
              {form.image_url && (
                <img src={form.image_url} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', marginTop: 8, border: '1px solid #334155' }} />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="field-label">Tier ที่ต้องการ</label>
                <div className="input-wrap">
                  <select
                    value={form.tier_required}
                    onChange={e => setForm(f => ({ ...f, tier_required: e.target.value }))}
                    style={{ flex: 1, border: 'none', background: 'transparent', color: tierColors[form.tier_required] || '#f1f5f9', fontFamily: 'Prompt, sans-serif', fontSize: 14, padding: '12px 0', outline: 'none', fontWeight: 600 }}
                  >
                    {tiers.length > 0
                      ? tiers.map(t => <option key={t.tier_name} value={t.tier_name}>{t.tier_name}</option>)
                      : ['Bronze', 'Silver', 'Gold'].map(t => <option key={t} value={t}>{t}</option>)
                    }
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">คะแนนที่ใช้แลก *</label>
                <div className="input-wrap">
                  <input
                    type="number"
                    value={form.points_cost}
                    onChange={e => setForm(f => ({ ...f, points_cost: e.target.value }))}
                    placeholder="100"
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                เปิดใช้งาน
              </label>
            </div>

            {error && <div className="msg-error">{error}</div>}
            {success && <div className="msg-success">{success}</div>}

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
