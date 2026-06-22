'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { logAdmin } from '@/lib/log'

interface Promotion {
  id: string
  title: string
  description: string
  image_url: string
  is_active: boolean
  sort_order: number
  starts_at: string
  ends_at: string
}

const emptyForm = {
  title: '',
  description: '',
  image_url: '',
  is_active: true,
  sort_order: 0,
  starts_at: '',
  ends_at: '',
}

export default function PromotionsPage() {
  const supabase = createClient()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadPromotions() }, [])

  async function loadPromotions() {
    setLoading(true)
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .order('sort_order')
    setPromotions(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditId(null)
    setForm(emptyForm)
    setError('')
    setSuccess('')
    setModal(true)
  }

  function openEdit(p: Promotion) {
    setEditId(p.id)
    setForm({
      title: p.title || '',
      description: p.description || '',
      image_url: p.image_url || '',
      is_active: p.is_active,
      sort_order: p.sort_order || 0,
      starts_at: p.starts_at ? p.starts_at.slice(0, 10) : '',
      ends_at: p.ends_at ? p.ends_at.slice(0, 10) : '',
    })
    setError('')
    setSuccess('')
    setModal(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('กรุณากรอกชื่อโปรโมชั่น'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      }

      if (editId) {
        const { error: err } = await supabase.from('promotions').update(payload).eq('id', editId)
        if (err) throw new Error(err.message)
        await logAdmin('edit_promotion', `id=${editId} title=${form.title}`)
      } else {
        const { error: err } = await supabase.from('promotions').insert(payload)
        if (err) throw new Error(err.message)
        await logAdmin('add_promotion', `title=${form.title}`)
      }

      setSuccess(editId ? 'แก้ไขสำเร็จ' : 'เพิ่มโปรโมชั่นสำเร็จ')
      await loadPromotions()
      setTimeout(() => setModal(false), 800)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(p: Promotion) {
    if (!confirm(`ต้องการลบ "${p.title}" ออกจากระบบ?`)) return
    await supabase.from('promotions').delete().eq('id', p.id)
    await logAdmin('delete_promotion', `title=${p.title}`)
    await loadPromotions()
  }

  async function toggleActive(p: Promotion) {
    await supabase.from('promotions').update({ is_active: !p.is_active }).eq('id', p.id)
    await logAdmin('toggle_promotion', `title=${p.title} active=${!p.is_active}`)
    await loadPromotions()
  }

  return (
    <div>
      <div className="page-header">
        <h2>ตั้งค่าโปรโมชั่น</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-sm" onClick={loadPromotions}>🔄 รีเฟรช</button>
          <button className="btn-sm success" onClick={openAdd}>+ เพิ่มโปรโมชั่น</button>
        </div>
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>ชื่อโปรโมชั่น</th>
                  <th>รายละเอียด</th>
                  <th>ช่วงเวลา</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {promotions.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ยังไม่มีโปรโมชั่น</td></tr>
                  : promotions.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: '#64748b' }}>{p.sort_order}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.image_url && (
                            <img src={p.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{p.title}</span>
                        </div>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.description || '-'}
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {p.starts_at ? new Date(p.starts_at).toLocaleDateString('th-TH') : '-'}
                        {' — '}
                        {p.ends_at ? new Date(p.ends_at).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td>
                        <span className={`badge ${p.is_active ? 'badge-active' : 'badge-inactive'}`}>
                          {p.is_active ? 'เปิด' : 'ปิด'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-sm" onClick={() => openEdit(p)}>✏️ แก้ไข</button>
                          <button className={`btn-sm ${p.is_active ? 'danger' : 'success'}`} onClick={() => toggleActive(p)}>
                            {p.is_active ? 'ปิด' : 'เปิด'}
                          </button>
                          <button className="btn-sm danger" onClick={() => handleDelete(p)}>🗑️ ลบ</button>
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
            <h3>{editId ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่น'}</h3>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">ชื่อโปรโมชั่น *</label>
              <div className="input-wrap">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="เช่น โปรโมชั่นเดือนนี้" />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">รายละเอียด</label>
              <div className="input-wrap">
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="รายละเอียดโปรโมชั่น" />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">URL รูปภาพ</label>
              <div className="input-wrap">
                <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="field-label">วันเริ่มต้น</label>
                <input className="input-dark" type="date" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">วันสิ้นสุด</label>
                <input className="input-dark" type="date" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="field-label">ลำดับการแสดง</label>
                <div className="input-wrap">
                  <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} placeholder="0" min="0" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  เปิดใช้งาน
                </label>
              </div>
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
