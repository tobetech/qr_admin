'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Machine {
  machine_id: string
  name: string
  status: string
  location: string
  last_seen: string
}

interface StatCard {
  label: string
  value: string
  sub?: string
  color: string
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

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ members: 0, online: 0, total: 0, revenue: 0, today: 0, yesterday: 0 })
  const [machines, setMachines] = useState<Machine[]>([])
  const [topMachines, setTopMachines] = useState<{ id: string, revenue: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    setLoading(true)
    const [membersRes, machinesRes, txRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('machines').select('machine_id, name, status, location, last_seen').order('machine_id'),
      supabase.from('transactions').select('amount, created_at, machine_id, status').limit(5000),
    ])

    const allTx = txRes.data || []
    const revenue = allTx.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const todayCount = allTx.filter(t => new Date(t.created_at).toDateString() === today).length
    const yestCount = allTx.filter(t => new Date(t.created_at).toDateString() === yesterday).length

    const online = (machinesRes.data || []).filter(m => m.status === 'online').length

    // Top 5 เครื่อง
    const machineRev: Record<string, number> = {}
    allTx.forEach(t => {
      if (!t.machine_id) return
      machineRev[t.machine_id] = (machineRev[t.machine_id] || 0) + (parseFloat(t.amount) || 0)
    })
    const top = Object.entries(machineRev).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, revenue]) => ({ id, revenue }))

    setStats({
      members: membersRes.count || 0,
      online,
      total: machinesRes.data?.length || 0,
      revenue,
      today: todayCount,
      yesterday: yestCount,
    })
    setMachines(machinesRes.data || [])
    setTopMachines(top)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  )

  const maxRev = topMachines[0]?.revenue || 1

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'สมาชิกทั้งหมด', value: stats.members.toLocaleString(), color: '#60a5fa' },
          { label: 'เครื่อง Online', value: stats.online.toString(), sub: `จาก ${stats.total} เครื่อง`, color: '#4ade80' },
          { label: 'รายได้รวม', value: `฿${stats.revenue.toFixed(0)}`, color: '#fbbf24' },
          { label: 'วันนี้', value: stats.today.toString(), sub: `เมื่อวาน ${stats.yesterday}`, color: '#f87171' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Top 5 + สถานะเครื่อง */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Top 5 */}
        <div className="card-box" style={{ padding: 20 }}>
          <div className="section-title">Top 5 เครื่อง (รายได้)</div>
          {topMachines.length === 0
            ? <p style={{ color: '#475569', fontSize: 13 }}>ยังไม่มีข้อมูล</p>
            : topMachines.map((m, i) => (
              <div key={m.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#f1f5f9' }}>{i + 1}. {m.id}</span>
                  <span style={{ fontSize: 13, color: '#fbbf24' }}>฿{m.revenue.toFixed(0)}</span>
                </div>
                <div style={{ background: '#334155', borderRadius: 4, height: 6 }}>
                  <div style={{ background: '#2563eb', borderRadius: 4, height: 6, width: `${(m.revenue / maxRev * 100).toFixed(0)}%` }} />
                </div>
              </div>
            ))}
        </div>

        {/* เครื่องออนไลน์ */}
        <div className="card-box" style={{ padding: 20 }}>
          <div className="section-title">สถานะเครื่อง</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {machines.slice(0, 6).map(m => (
              <div key={m.machine_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{m.name || m.machine_id}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{m.location || '-'} · {timeAgo(m.last_seen)}</div>
                </div>
                <span className={`badge ${m.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
                  {m.status === 'online' ? '● Online' : '● Offline'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ตารางเครื่องทั้งหมด */}
      <div className="section-title">เครื่องทั้งหมด</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ชื่อเครื่อง</th>
              <th>Machine ID</th>
              <th>สถานะ</th>
              <th>IP</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {machines.length === 0
              ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ไม่มีเครื่อง</td></tr>
              : machines.map(m => (
                <tr key={m.machine_id}>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{m.name || '-'}</td>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{m.machine_id}</td>
                  <td><span className={`badge ${m.status === 'online' ? 'badge-online' : 'badge-offline'}`}>{m.status === 'online' ? '● Online' : '● Offline'}</span></td>
                  <td>{m.location || '-'}</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{timeAgo(m.last_seen)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
