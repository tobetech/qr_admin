'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface AdminLog {
  id: string
  admin_email: string
  action: string
  detail: string
  created_at: string
}

const actionLabels: Record<string, string> = {
  login: '🔑 เข้าสู่ระบบ',
  logout: '🚪 ออกจากระบบ',
  edit_machine: '🖥️ แก้ไขเครื่อง',
  add_machine: '➕ เพิ่มเครื่อง',
  reset_password: '🔑 รีเซ็ตรหัสผ่าน',
  admin_topup: '💰 เติมเงินสมาชิก',
  add_promotion: '🎁 เพิ่มโปรโมชั่น',
  edit_promotion: '✏️ แก้ไขโปรโมชั่น',
  delete_promotion: '🗑️ ลบโปรโมชั่น',
  toggle_promotion: '🔄 เปิด/ปิดโปรโมชั่น',
  edit_loyalty_settings: '⭐ แก้ไขการตั้งค่าคะแนน',
  add_loyalty_tier: '⭐ เพิ่ม Tier',
  edit_loyalty_tier: '✏️ แก้ไข Tier',
  delete_loyalty_tier: '🗑️ ลบ Tier',
}

export default function LogsPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')

  useEffect(() => { loadLogs() }, [])

  async function loadLogs() {
    setLoading(true)
    let query = supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)

    if (dateFrom) query = query.gte('created_at', dateFrom + 'T00:00:00')
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')
    if (actionFilter) query = query.eq('action', actionFilter)
    if (emailFilter) query = query.ilike('admin_email', `%${emailFilter}%`)

    const { data } = await query
    setLogs(data || [])
    setLoading(false)
  }

  function clearFilter() {
    setDateFrom('')
    setDateTo('')
    setActionFilter('')
    setEmailFilter('')
    setTimeout(loadLogs, 0)
  }

  function exportCSV() {
    if (!logs.length) return alert('ไม่มีข้อมูลที่จะ Export')
    const headers = ['วันที่', 'Admin', 'Action', 'รายละเอียด']
    const rows = logs.map(l => [
      new Date(l.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      l.admin_email || '-',
      actionLabels[l.action] || l.action,
      l.detail || '-',
    ].map(v => `"${v}"`).join(','))

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `admin_logs_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-header">
        <h2>Log Admin</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-sm success" onClick={exportCSV}>⬇️ Export CSV</button>
          <button className="btn-sm" onClick={loadLogs}>🔄 รีเฟรช</button>
        </div>
      </div>

      {/* Filter */}
      <div className="card-box" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>วันที่เริ่มต้น</div>
            <input className="input-dark" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>วันที่สิ้นสุด</div>
            <input className="input-dark" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Admin Email</div>
            <input
              className="input-dark"
              placeholder="ค้นหา email"
              value={emailFilter}
              onChange={e => setEmailFilter(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Action</div>
            <select className="input-dark" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {Object.entries(actionLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-sm success" onClick={loadLogs}>🔍 ค้นหา</button>
            <button className="btn-sm" onClick={clearFilter}>✕ ล้าง</button>
          </div>
        </div>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>พบ {logs.length} รายการ</span>
        {logs.length > 0 && (
          <span style={{ fontSize: 13, color: '#64748b' }}>
            · ล่าสุด {new Date(logs[0].created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ไม่พบ Log</td></tr>
                  : logs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(l.created_at).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td style={{ color: '#60a5fa', fontSize: 13 }}>{l.admin_email || '-'}</td>
                      <td>
                        <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: 13 }}>
                          {actionLabels[l.action] || l.action}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{l.detail || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
