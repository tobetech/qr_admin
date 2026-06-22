'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Transaction {
  id: string
  tx_id: string
  user_id: string
  machine_id: string
  product_name: string
  amount: number
  status: string
  created_at: string
  users?: { full_name: string; phone: string }
}

interface TopupOrder {
  id: string
  mch_order_no: string
  user_id: string
  amount: number
  status: string
  created_at: string
  users?: { full_name: string; phone: string }
}

type Tab = 'purchase' | 'topup'

export default function TransactionsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('purchase')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [topups, setTopups] = useState<TopupOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [machineFilter, setMachineFilter] = useState('')
  const [machines, setMachines] = useState<string[]>([])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [txRes, topupRes, machineRes] = await Promise.all([
      supabase.from('transactions')
        .select('*, users(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('vending_topup_orders')
        .select('*, users(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('machines').select('machine_id').order('machine_id'),
    ])
    setTransactions(txRes.data || [])
    setTopups(topupRes.data || [])
    setMachines((machineRes.data || []).map((m: any) => m.machine_id))
    setLoading(false)
  }

  async function applyFilter() {
    setLoading(true)
    let txQuery = supabase.from('transactions')
      .select('*, users(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(500)
    let topupQuery = supabase.from('vending_topup_orders')
      .select('*, users(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(500)

    if (dateFrom) {
      txQuery = txQuery.gte('created_at', dateFrom + 'T00:00:00')
      topupQuery = topupQuery.gte('created_at', dateFrom + 'T00:00:00')
    }
    if (dateTo) {
      txQuery = txQuery.lte('created_at', dateTo + 'T23:59:59')
      topupQuery = topupQuery.lte('created_at', dateTo + 'T23:59:59')
    }
    if (machineFilter) txQuery = txQuery.eq('machine_id', machineFilter)

    const [txRes, topupRes] = await Promise.all([txQuery, topupQuery])
    setTransactions(txRes.data || [])
    setTopups(topupRes.data || [])
    setLoading(false)
  }

  function clearFilter() {
    setDateFrom('')
    setDateTo('')
    setMachineFilter('')
    loadAll()
  }

  function exportCSV() {
    const data = tab === 'purchase' ? transactions : topups
    const headers = tab === 'purchase'
      ? ['วันที่', 'ชื่อสมาชิก', 'เบอร์', 'เครื่อง', 'สินค้า', 'จำนวน', 'สถานะ']
      : ['วันที่', 'ชื่อสมาชิก', 'เบอร์', 'Order No', 'จำนวน', 'สถานะ']

    const rows = data.map((t: any) => {
      const date = new Date(t.created_at).toLocaleDateString('th-TH', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
      if (tab === 'purchase') {
        return [date, t.users?.full_name || '-', t.users?.phone || '-',
          t.machine_id || '-', t.product_name || '-',
          `฿${parseFloat(t.amount).toFixed(2)}`, t.status].map(v => `"${v}"`).join(',')
      } else {
        return [date, t.users?.full_name || '-', t.users?.phone || '-',
          t.mch_order_no || '-',
          `฿${parseFloat(t.amount).toFixed(2)}`, t.status].map(v => `"${v}"`).join(',')
      }
    })

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const statusLabel: Record<string, { text: string; cls: string }> = {
    completed: { text: 'สำเร็จ', cls: 'badge-completed' },
    pending: { text: 'รอดำเนินการ', cls: 'badge-pending' },
    failed: { text: 'ไม่สำเร็จ', cls: 'badge-failed' },
    dispensing: { text: 'กำลังจ่าย', cls: 'badge-pending' },
    failed_refunded: { text: 'คืนเงินแล้ว', cls: 'badge-failed' },
    expired: { text: 'หมดอายุ', cls: 'badge-failed' },
  }

  return (
    <div>
      <div className="page-header">
        <h2>ธุรกรรม</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-sm success" onClick={exportCSV}>⬇️ Export CSV</button>
          <button className="btn-sm" onClick={loadAll}>🔄 รีเฟรช</button>
        </div>
      </div>

      {/* Filter */}
      <div className="card-box" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>วันที่เริ่มต้น</div>
            <input className="input-dark" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>วันที่สิ้นสุด</div>
            <input className="input-dark" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>เครื่อง</div>
            <select className="input-dark" value={machineFilter} onChange={e => setMachineFilter(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {machines.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-sm success" onClick={applyFilter}>🔍 ค้นหา</button>
            <button className="btn-sm" onClick={clearFilter}>✕ ล้าง</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['purchase', 'topup'] as Tab[]).map(t => (
          <button
            key={t}
            className="btn-sm"
            onClick={() => setTab(t)}
            style={tab === t ? { background: '#2563eb', borderColor: '#2563eb', color: '#fff' } : {}}
          >
            {t === 'purchase' ? `ซื้อสินค้า (${transactions.length})` : `เติมเงิน (${topups.length})`}
          </button>
        ))}
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : tab === 'purchase' ? (
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
                {transactions.length === 0
                  ? <tr><td colSpan={7} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ไม่มีรายการ</td></tr>
                  : transactions.map(t => {
                    const s = statusLabel[t.status] || { text: t.status, cls: 'badge-silver' }
                    return (
                      <tr key={t.id}>
                        <td style={{ fontSize: 12, color: '#64748b' }}>
                          {new Date(t.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{t.users?.full_name || '-'}</td>
                        <td style={{ color: '#fbbf24' }}>{t.users?.phone || '-'}</td>
                        <td>{t.machine_id || '-'}</td>
                        <td>{t.product_name || '-'}</td>
                        <td style={{ color: '#f87171', fontWeight: 600 }}>฿{parseFloat(t.amount?.toString() || '0').toFixed(2)}</td>
                        <td><span className={`badge ${s.cls}`}>{s.text}</span></td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>สมาชิก</th>
                  <th>เบอร์</th>
                  <th>Order No</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {topups.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ไม่มีรายการ</td></tr>
                  : topups.map(t => {
                    const s = statusLabel[t.status] || { text: t.status, cls: 'badge-silver' }
                    return (
                      <tr key={t.id}>
                        <td style={{ fontSize: 12, color: '#64748b' }}>
                          {new Date(t.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{t.users?.full_name || '-'}</td>
                        <td style={{ color: '#fbbf24' }}>{t.users?.phone || '-'}</td>
                        <td style={{ fontSize: 12, color: '#94a3b8' }}>{t.mch_order_no || '-'}</td>
                        <td style={{ color: '#4ade80', fontWeight: 600 }}>+฿{parseFloat(t.amount?.toString() || '0').toFixed(2)}</td>
                        <td><span className={`badge ${s.cls}`}>{s.text}</span></td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
