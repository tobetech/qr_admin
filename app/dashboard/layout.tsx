'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { logAdmin } from '@/lib/log'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )},
  { id: 'machines', label: 'จัดการเครื่อง', href: '/dashboard/machines', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  )},
  { id: 'members', label: 'จัดการสมาชิก', href: '/dashboard/members', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { id: 'transactions', label: 'ธุรกรรม', href: '/dashboard/transactions', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )},
  { id: 'topup', label: 'เติมเงินสมาชิก', href: '/dashboard/topup', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  )},
  { id: 'promotions', label: 'โปรโมชั่น', href: '/dashboard/promotions', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )},
  { id: 'rewards', label: 'สินค้าแลกคะแนน', href: '/dashboard/rewards', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="6"/>
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  )},
  { id: 'loyalty', label: 'ระบบคะแนน', href: '/dashboard/loyalty', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="6"/>
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  )},
  { id: 'report', label: 'รายงานรายเดือน', href: '/dashboard/report', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )},
  { id: 'logs', label: 'Log Admin', href: '/dashboard/logs', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )},
]

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/machines': 'จัดการเครื่อง',
  '/dashboard/members': 'จัดการสมาชิก',
  '/dashboard/transactions': 'ธุรกรรม',
  '/dashboard/topup': 'เติมเงินสมาชิก',
  '/dashboard/promotions': 'โปรโมชั่น',
  '/dashboard/rewards': 'สินค้าแลกคะแนน',
  '/dashboard/loyalty': 'ระบบคะแนน',
  '/dashboard/report': 'รายงานรายเดือน',
  '/dashboard/logs': 'Log Admin',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [adminName, setAdminName] = useState('-')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const phone = user.email?.replace('@vending.local', '') || ''
      setAdminName(phone)
    })
  }, [])

  async function handleLogout() {
    await logAdmin('logout', '')
    await supabase.auth.signOut()
    router.push('/login')
  }

  const pageTitle = Object.entries(pageTitles).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] || 'Dashboard'

  function NavItem({ item }: { item: typeof navItems[0] }) {
    const isActive = pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href))
    return (
      <button
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => {
          router.push(item.href)
          if (window.innerWidth <= 768) setSidebarOpen(false)
        }}
      >
        {item.icon}
        {item.label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>Vending Admin</h1>
          <p>{adminName}</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Main */}
      <div className={`main-content ${sidebarOpen ? 'shifted' : ''}`}>
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 6, borderRadius: 8, display: 'flex' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h2 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600 }}>{pageTitle}</h2>
          </div>
          <span style={{ background: '#1d4ed8', color: '#bfdbfe', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
            Admin
          </span>
        </div>
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}
