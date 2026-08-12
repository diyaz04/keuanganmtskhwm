import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { 
  LayoutDashboard, 
  LayoutGrid,
  Wallet, 
  Users, 
  FileSpreadsheet, 
  ReceiptText, 
  Settings, 
  LogOut,
  Building2,
  PieChart,
  Menu,
  X,
  Bell,
  UserCog
} from 'lucide-react'

export default function DashboardLayout() {
  const { role, user, nama, avatarUrl, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [showMobileProfileMenu, setShowMobileProfileMenu] = useState(false)
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null)
  const [showMobileNotifMenu, setShowMobileNotifMenu] = useState(false)
  const mobileNotifMenuRef = useRef<HTMLDivElement>(null)
  const [acknowledgedCount, setAcknowledgedCount] = useState(() => {
    return parseInt(localStorage.getItem('acknowledgedPendingCount') || '0')
  })

  // Fetch pending payment count (for admin & bendahara)
  useEffect(() => {
    if (role !== 'admin' && role !== 'bendahara') return

    const fetchCount = async () => {
      const { count } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      setPendingCount(count ?? 0)
    }

    fetchCount()

    // Subscribe to realtime changes on payments table
    const channel = supabase
      .channel('pending-payments-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchCount()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [role])

  useEffect(() => {
    if (location.pathname === '/admin/bendahara') {
      setAcknowledgedCount(pendingCount)
      localStorage.setItem('acknowledgedPendingCount', pendingCount.toString())
    } else if (pendingCount < acknowledgedCount) {
      setAcknowledgedCount(pendingCount)
      localStorage.setItem('acknowledgedPendingCount', pendingCount.toString())
    }
  }, [location.pathname, pendingCount, acknowledgedCount])

  const displayCount = Math.max(0, pendingCount - acknowledgedCount)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileProfileMenuRef.current && !mobileProfileMenuRef.current.contains(event.target as Node)) {
        setShowMobileProfileMenu(false)
      }
      if (mobileNotifMenuRef.current && !mobileNotifMenuRef.current.contains(event.target as Node)) {
        setShowMobileNotifMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitials = (fullName: string | null | undefined, email: string | null | undefined) => {
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'US';
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  // Group links into categories
  const getNavLinks = () => {
    if (role === 'admin') {
      return [
        {
          title: "MENU UTAMA",
          links: [
            { path: '/admin/menu', label: 'Menu', icon: LayoutGrid },
            { path: '/admin/dashboard', label: 'Dashboard Admin', icon: LayoutDashboard },
            { path: '/admin/bendahara', label: 'Verifikasi Pembayaran', icon: Building2 },
            { path: '/admin/payroll', label: 'Penggajian', icon: Wallet },
            { path: '/admin/bills', label: 'Tagihan Siswa', icon: ReceiptText },
            { path: '/admin/tagihan-lama', label: 'Tagihan Alumni', icon: ReceiptText },
            { path: '/admin/koperasi', label: 'Import Koperasi', icon: FileSpreadsheet },
          ]
        },
        {
          title: "MASTER & PENGATURAN",
          links: [
            { path: '/admin/master-data', label: 'Data Master', icon: Users },
            { path: '/admin/potongan', label: 'Master Potongan', icon: PieChart },
            { path: '/admin/accounts', label: 'Kelola Akun', icon: UserCog },
            { path: '/admin/settings', label: 'Pengaturan', icon: Settings },
          ]
        }
      ]
    } else if (role === 'bendahara') {
      return [
        {
          title: "MENU UTAMA",
          links: [
            { path: '/admin/menu', label: 'Menu', icon: LayoutGrid },
            { path: '/admin/bendahara', label: 'Verifikasi Pembayaran', icon: Building2 },
            { path: '/admin/payroll', label: 'Penggajian', icon: Wallet },
            { path: '/admin/bills', label: 'Tagihan Siswa', icon: ReceiptText },
            { path: '/admin/tagihan-lama', label: 'Tagihan Alumni', icon: ReceiptText },
            { path: '/admin/koperasi', label: 'Import Koperasi', icon: FileSpreadsheet },
            { path: '/admin/settings', label: 'Pengaturan', icon: Settings },
          ]
        }
      ]
    } else if (role === 'koperasi') {
      return [
        {
          title: "MENU KOPERASI",
          links: [
            { path: '/admin/menu', label: 'Menu', icon: LayoutGrid },
            { path: '/admin/master-data', label: 'Data Pegawai', icon: Users },
            { path: '/admin/koperasi', label: 'Import Tagihan', icon: FileSpreadsheet },
            { path: '/admin/settings', label: 'Pengaturan', icon: Settings },
          ]
        }
      ]
    }
    return []
  }

  const menuSections = getNavLinks()

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white hidden md:flex flex-col shadow-sm z-10 print:hidden">
        {/* Logo Area */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-full object-contain" />
            <div>
              <h2 className="font-bold text-lg text-slate-800 leading-tight">KEUANGAN<br/>MTs KHWM</h2>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Command Center</p>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {menuSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="px-3 text-xs font-bold text-slate-400 mb-2">{section.title}</h3>
              <nav className="space-y-1">
                {section.links.map((link) => {
                  const isActive = location.pathname === link.path
                  const Icon = link.icon
                  
                  return (
                    <Link 
                      key={link.path} 
                      to={link.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon size={18} className={isActive ? "text-emerald-600" : "text-slate-400"} />
                      <span className="flex-1">{link.label}</span>
                      {link.path === '/admin/bendahara' && displayCount > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {displayCount > 99 ? '99+' : displayCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom Profile & Logout */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm uppercase">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (nama || user?.email || 'A').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-slate-800 truncate" title={nama || user?.email?.split('@')[0] || 'User'}>
                {nama || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs font-bold text-emerald-600 uppercase mt-0.5">{role}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" 
            onClick={handleSignOut}
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible print:block">
        {/* Mobile Header (replicated from mockup) */}
        <header className="md:hidden border-b py-3 px-4 bg-white flex items-center justify-between shadow-sm z-10 print:hidden">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-700"
            >
              <Menu size={22} />
            </button>
            <span className="font-extrabold text-slate-800 tracking-wider text-base">SIK MTs KHWM</span>
          </div>
          
          <div className="flex items-center gap-3.5">
            {/* Notification Bell Button & Dropdown */}
            <div ref={mobileNotifMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowMobileNotifMenu(v => !v)
                  if (displayCount > 0) {
                    setAcknowledgedCount(pendingCount)
                    localStorage.setItem('acknowledgedPendingCount', pendingCount.toString())
                  }
                }}
                className="relative w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
              >
                {displayCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center shadow">
                    {displayCount > 99 ? '99+' : displayCount}
                  </span>
                ) : (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                )}
                <Bell size={15} />
              </button>

              {/* Mobile Notification Dropdown */}
              {showMobileNotifMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Header */}
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <p className="font-bold text-xs text-slate-800">Notifikasi</p>
                    {displayCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[8px] font-bold">
                        {displayCount} belum dibaca
                      </span>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                    {displayCount > 0 ? (
                      <Link 
                        to="/admin/bendahara" 
                        onClick={() => setShowMobileNotifMenu(false)}
                        className="p-3 hover:bg-slate-50 transition-colors flex gap-2 block text-left"
                      >
                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Building2 size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-800 leading-tight">Persetujuan Pembayaran</p>
                          <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">
                            Ada <span className="font-bold text-amber-600">{displayCount} pembayaran</span> dari wali murid yang memerlukan verifikasi Anda.
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <div className="px-4 py-6 text-center text-slate-400 text-[10px]">
                        Tidak ada notifikasi baru
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Avatar Button & Dropdown */}
            <div ref={mobileProfileMenuRef} className="relative">
              <button
                onClick={() => setShowMobileProfileMenu(v => !v)}
                className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden uppercase focus:outline-none hover:ring-2 hover:ring-emerald-500/30 transition-all"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitials(nama, user?.email)
                )}
              </button>

              {/* Mobile Profile Dropdown Menu */}
              {showMobileProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2.5 border-b border-slate-50">
                    <p className="font-bold text-xs text-slate-800 truncate">{nama || 'User'}</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">{role}</p>
                  </div>
                  <div className="p-1">
                    <Link
                      to="/admin/settings"
                      onClick={() => setShowMobileProfileMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors w-full text-left"
                    >
                      <Settings size={14} className="text-slate-400" />
                      Pengaturan
                    </Link>
                    <button
                      onClick={() => {
                        setShowMobileProfileMenu(false)
                        handleSignOut()
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full text-left"
                    >
                      <LogOut size={14} className="text-red-500" />
                      Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Sidebar overlay backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer Panel */}
        <div className={cn(
          "fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col md:hidden transition-transform duration-300 ease-in-out transform",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Drawer Header */}
          <div className="p-5 pb-4 border-b flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full object-contain" />
              <span className="font-extrabold text-slate-800 tracking-wider">SIK MTs KHWM</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-full hover:bg-slate-200 transition-colors text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Drawer Navigation Links */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {menuSections.map((section, idx) => (
              <div key={idx}>
                <h3 className="px-3 text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{section.title}</h3>
                <nav className="space-y-1">
                  {section.links.map((link) => {
                    const isActive = location.pathname === link.path
                    const Icon = link.icon
                    
                    return (
                      <Link 
                        key={link.path} 
                        to={link.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                          isActive 
                            ? "bg-emerald-50 text-emerald-600" 
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <Icon size={18} className={isActive ? "text-emerald-600" : "text-slate-400"} />
                        <span className="flex-1">{link.label}</span>
                        {link.path === '/admin/bendahara' && displayCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {displayCount > 99 ? '99+' : displayCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            ))}
          </div>
          
          {/* Drawer Profile & Logout */}
          <div className="p-4 border-t bg-slate-50">
            <div className="mb-4 px-2">
              <p className="font-bold text-sm text-slate-800 truncate">{nama || user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-xs font-bold text-emerald-600 uppercase mt-0.5">{role}</p>
            </div>
            <Button 
              variant="outline" 
              className="w-full justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white rounded-xl h-10" 
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleSignOut();
              }}
            >
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>

        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6 lg:p-8 overflow-y-auto print:overflow-visible print:p-0 print:block">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation (Visible only on md:hidden) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden z-40 rounded-t-2xl print:hidden">
          <div className="flex justify-around items-end h-[68px] pb-2 px-1">
            
            <Link to="/admin/dashboard" className="flex flex-col items-center gap-1 flex-1 pb-1">
              <LayoutDashboard size={24} strokeWidth={location.pathname === '/admin/dashboard' ? 2.5 : 2} className={location.pathname === '/admin/dashboard' ? "text-emerald-500" : "text-slate-400"} />
              <span className={cn("text-[10px] font-medium", location.pathname === '/admin/dashboard' ? "text-emerald-500" : "text-slate-400")}>Dashboard</span>
            </Link>
            
            <Link to="/admin/bendahara" className="flex flex-col items-center gap-1 flex-1 pb-1 relative">
              <Building2 size={24} strokeWidth={location.pathname === '/admin/bendahara' ? 2.5 : 2} className={location.pathname === '/admin/bendahara' ? "text-emerald-500" : "text-slate-400"} />
              {displayCount > 0 && (
                <span className="absolute -top-1 right-3 w-4 h-4 rounded-full bg-red-500 border border-white text-white text-[8px] font-bold flex items-center justify-center">
                  {displayCount > 99 ? '99+' : displayCount}
                </span>
              )}
              <span className={cn("text-[10px] font-medium", location.pathname === '/admin/bendahara' ? "text-emerald-500" : "text-slate-400")}>Verifikasi</span>
            </Link>
            
            {/* Floating Action Button (MENU) */}
            <div className="flex-[1.2] flex flex-col items-center justify-end relative">
              <Link 
                to="/admin/menu" 
                className="absolute -top-8 flex items-center justify-center w-[60px] h-[60px] bg-emerald-500 rounded-full shadow-lg border-[4px] border-white text-white active:scale-95 transition-transform"
              >
                <Menu size={28} strokeWidth={2.5} />
              </Link>
              <span className="text-[10px] font-bold text-emerald-600 mt-8 mb-0.5 uppercase tracking-wider">Menu</span>
            </div>
            
            <Link to="/admin/bills" className="flex flex-col items-center gap-1 flex-1 pb-1">
              <ReceiptText size={24} strokeWidth={location.pathname === '/admin/bills' ? 2.5 : 2} className={location.pathname === '/admin/bills' ? "text-emerald-500" : "text-slate-400"} />
              <span className={cn("text-[10px] font-medium", location.pathname === '/admin/bills' ? "text-emerald-500" : "text-slate-400")}>Tagihan</span>
            </Link>
            
            <Link to="/admin/payroll" className="flex flex-col items-center gap-1 flex-1 pb-1">
              <Wallet size={24} strokeWidth={location.pathname === '/admin/payroll' ? 2.5 : 2} className={location.pathname === '/admin/payroll' ? "text-emerald-500" : "text-slate-400"} />
              <span className={cn("text-[10px] font-medium", location.pathname === '/admin/payroll' ? "text-emerald-500" : "text-slate-400")}>Gaji</span>
            </Link>

          </div>
        </div>
      </div>
    </div>
  )
}
