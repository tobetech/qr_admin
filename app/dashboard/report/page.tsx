'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface MonthStat {
  revenue: number
  purchases: number
  topups: number
  newMembers: number
}

interface MachineStat {
  machine_id: string
  revenue: number
  count: number
}

interface TopMember {
  user_id: string
  full_name: string
  phone: string
  count: number
  amount: number
}

export default function ReportPage() {
  const supabase = createClient()
  const [months, setMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(false)
  const [stat, setStat] = useState<MonthStat | null>(null)
  const [machineStats, setMachineStats] = useState<MachineStat[]>([])
  const [topMembers, setTopMembers] = useState<TopMember[]>([])
  const [txData, setTxData] = useState<any[]>([])

  useEffect(() => {
    const list: string[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    setMonths(list)
    setSelectedMonth(list[0])
  }, [])

  useEffect(() => {
    if (selectedMonth) generateReport()
  }, [selectedMonth])

  async function generateReport() {
    setLoading(true)
    const [year, month] = selectedMonth.split('-').map(Number)
    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`
    const lastDay = new Date(year, month, 0).getDate()
    const dateTo = `${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59`

    const [txRes, membersRes] = await Promise.all([
      supabase.from('transactions')
        .select('*, users(full_name, phone)')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .order('created_at', { ascending: false }),
      supabase.from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo),
    ])

    const [topupRes] = await Promise.all([
      supabase.from('vending_topup_orders')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo),
    ])

    const txAll = txRes.data || []
    setTxData(txAll)

    const revenue = txAll.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
    const topupTotal = (topupRes.data || []).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)

    setStat({
      revenue,
      purchases: txAll.length,
      topups: topupTotal,
      newMembers: membersRes.count || 0,
    })

    // ยอดแต่ละเครื่อง
    const machineMap: Record<string, { revenue: number; count: number }> = {}
    txAll.forEach(t => {
      if (!t.machine_id) return
      if (!machineMap[t.machine_id]) machineMap[t.machine_id] = { revenue: 0, count: 0 }
      machineMap[t.machine_id].revenue += parseFloat(t.amount) || 0
      machineMap[t.machine_id].count++
    })
    setMachineStats(
      Object.entries(machineMap)
        .map(([machine_id, s]) => ({ machine_id, ...s }))
        .sort((a, b) => b.revenue - a.revenue)
    )

    // Top 10 สมาชิก
    const memberMap: Record<string, TopMember> = {}
    txAll.forEach(t => {
      if (!t.user_id) return
      if (!memberMap[t.user_id]) memberMap[t.user_id] = {
        user_id: t.user_id,
        full_name: t.users?.full_name || '-',
        phone: t.users?.phone || '-',
        count: 0,
        amount: 0,
      }
      memberMap[t.user_id].count++
      memberMap[t.user_id].amount += parseFloat(t.amount) || 0
    })
    setTopMembers(Object.values(memberMap).sort((a, b) => b.count - a.count).slice(0, 10))

    setLoading(false)
  }

  function exportCSV() {
    if (!txData.length) return alert('ไม่มีข้อมูลที่จะ Export')
    const headers = ['วันที่', 'ชื่อสมาชิก', 'เบอร์', 'เครื่อง', 'สินค้า', 'จำนวน', 'สถานะ']
    const rows = txData.map(t => [
      new Date(t.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      t.users?.full_name || '-',
      t.users?.phone || '-',
      t.machine_id || '-',
      t.product_name || '-',
      `฿${parseFloat(t.amount || 0).toFixed(2)}`,
      t.status,
    ].map(v => `"${v}"`).join(','))

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `report_${selectedMonth}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function monthLabel(val: string) {
    const [y, m] = val.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  }

  const maxMachineRev = machineStats[0]?.revenue || 1

  return (
    <div>
      <div className="page-header">
        <h2>รายงานรายเดือน</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="input-dark"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: 'auto' }}
          >
            {months.map(m => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <button className="btn-sm success" onClick={exportCSV}>⬇️ Export CSV</button>
        </div>
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : stat && (
          <>
            {/* Stats */}
            <div className="stats-grid">
              {[
                { label: 'รายได้จากการซื้อ', value: `฿${stat.revenue.toFixed(0)}`, color: '#fbbf24' },
                { label: 'จำนวนครั้งที่ซื้อ', value: stat.purchases.toLocaleString(), color: '#4ade80' },
                { label: 'ยอดเติมเงิน (Ksher)', value: `฿${stat.topups.toFixed(0)}`, color: '#60a5fa' },
                { label: 'สมาชิกใหม่', value: stat.newMembers.toLocaleString(), color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* ยอดแต่ละเครื่อง + Top Members */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {/* ยอดขายแต่ละเครื่อง */}
              <div className="card-box" style={{ padding: 20 }}>
                <div className="section-title">ยอดขายแต่ละเครื่อง</div>
                {machineStats.length === 0
                  ? <p style={{ color: '#475569', fontSize: 13 }}>ไม่มีข้อมูล</p>
                  : machineStats.map(m => (
                    <div key={m.machine_id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: '#f1f5f9' }}>{m.machine_id}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 13, color: '#fbbf24' }}>฿{m.revenue.toFixed(0)}</span>
                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>{m.count} ครั้ง</span>
                        </div>
                      </div>
                      <div style={{ background: '#334155', borderRadius: 4, height: 6 }}>
                        <div style={{ background: '#2563eb', borderRadius: 4, height: 6, width: `${(m.revenue / maxMachineRev * 100).toFixed(0)}%` }} />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Top สมาชิก */}
              <div className="card-box" style={{ padding: 20 }}>
                <div className="section-title">Top สมาชิกที่ซื้อมากสุด</div>
                {topMembers.length === 0
                  ? <p style={{ color: '#475569', fontSize: 13 }}>ไม่มีข้อมูล</p>
                  : topMembers.map((m, i) => (
                    <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: '#64748b', width: 20 }}>{i + 1}.</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{m.full_name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{m.phone}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, color: '#4ade80' }}>{m.count} ครั้ง</div>
                        <div style={{ fontSize: 11, color: '#fbbf24' }}>฿{m.amount.toFixed(0)}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* ตารางธุรกรรม */}
            <div className="section-title">รายการทั้งหมดในเดือนนี้ ({txData.length} รายการ)</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>สมาชิก</th>
                    <th>เบอร์</th>
                    <th>เครื่อง</th>
                    <th>สินค้า</th>
                    <th>จำนวน</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {txData.length === 0
                    ? <tr><td colSpan={7} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ไม่มีรายการ</td></tr>
                    : txData.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontSize: 12, color: '#64748b' }}>
                          {new Date(t.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{t.users?.full_name || '-'}</td>
                        <td style={{ color: '#fbbf24' }}>{t.users?.phone || '-'}</td>
                        <td>{t.machine_id || '-'}</td>
                        <td>{t.product_name || '-'}</td>
                        <td style={{ color: '#f87171', fontWeight: 600 }}>฿{parseFloat(t.amount || 0).toFixed(2)}</td>
                        <td style={{ fontSize: 12, color: '#94a3b8' }}>{t.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
    </div>
  )
}
