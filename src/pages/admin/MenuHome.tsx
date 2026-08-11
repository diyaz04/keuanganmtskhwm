import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  ReceiptText, 
  Wallet, 
  LayoutDashboard, 
  Settings, 
  Building2, 
  FileSpreadsheet, 
  ChevronRight, 
  ChevronDown,
  Search, 
  Bell,
  LogOut
} from 'lucide-react'

interface MenuItem {
  title: string
  description: string
  path: string
  badge?: string
}

interface MenuCategory {
  category: string
  icon: any
  items: MenuItem[]
}

interface KopNotif {
  id: string
  type: 'koperasi_upload' | 'koperasi_employee'
  message: string
  time: string
}

export default function MenuHome() {
  const { user, role, nama, avatarUrl, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [acknowledgedCount, setAcknowledgedCount] = useState(() => {
    return parseInt(localStorage.getItem('acknowledgedPendingCount') || '0')
  })
  const [kopNotifs, setKopNotifs] = useState<KopNotif[]>([])
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const notifMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch pending payment count (admin & bendahara only)
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

    const channel = supabase
      .channel('menu-pending-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchCount()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [role])

  useEffect(() => {
    if (pendingCount < acknowledgedCount) {
      setAcknowledgedCount(pendingCount)
      localStorage.setItem('acknowledgedPendingCount', pendingCount.toString())
    }
  }, [pendingCount, acknowledgedCount])

  const displayCount = Math.max(0, pendingCount - acknowledgedCount)

  // Realtime koperasi notifications (admin only)
  useEffect(() => {
    if (role !== 'admin') return

    const formatTime = () => {
      const now = new Date()
      return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }

    const channel = supabase
      .channel('koperasi-notifs')
      // Upload tagihan koperasi baru
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'koperasi_uploads' }, (payload) => {
        const periode = (payload.new as any)?.periode || ''
        setKopNotifs(prev => [{
          id: `kop-upload-${Date.now()}`,
          type: 'koperasi_upload',
          message: `Koperasi mengunggah data tagihan${periode ? ` periode ${periode}` : ''}.`,
          time: formatTime()
        }, ...prev.slice(0, 9)])
      })
      // Perubahan data ID koperasi pegawai
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'employees' }, (payload) => {
        const old = payload.old as any
        const updated = payload.new as any
        // Hanya notifikasi jika kolom nip (ID koperasi) berubah
        if (old?.nip !== updated?.nip) {
          setKopNotifs(prev => [{
            id: `kop-emp-${Date.now()}`,
            type: 'koperasi_employee',
            message: `ID pegawai ${updated?.nama || ''} diperbarui oleh koperasi.`,
            time: formatTime()
          }, ...prev.slice(0, 9)])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [role])

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 11) return 'Pagi'
    if (hour >= 11 && hour < 15) return 'Siang'
    if (hour >= 15 && hour < 18) return 'Sore'
    return 'Malam'
  }

  const getCurrentDateString = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const now = new Date()
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
  }

  const getTheme = () => {
    const greeting = getGreeting()
    const isKoperasi = role === 'koperasi'
    
    switch (greeting) {
      case 'Pagi':
        return {
          bannerBg: 'from-amber-50 via-rose-50/70 to-sky-100/80 border-amber-100/60 text-slate-800',
          fadeColor: 'from-amber-50 via-amber-50/40 to-transparent',
          imgSrc: isKoperasi ? '/finance_hero_male_morning.jpg' : '/finance_hero_hijab_morning.jpg',
          imgFilter: 'opacity-90 contrast-105 saturate-110',
          titleColor: 'text-slate-800',
          subColor: 'text-slate-500',
          emoji: '🌅',
          badgeBg: 'bg-amber-100/60 border-amber-200 text-amber-900',
          badgeIconBg: 'bg-amber-500 text-white',
          decor: (
            <div className="absolute top-[-50px] right-[100px] w-48 h-48 rounded-full bg-gradient-to-tr from-amber-300/30 to-rose-200/20 blur-3xl pointer-events-none" />
          )
        }
      case 'Siang':
        return {
          bannerBg: 'from-sky-100 via-blue-50/60 to-amber-50/60 border-sky-200/50 text-slate-800',
          fadeColor: 'from-sky-100 via-sky-100/40 to-transparent',
          imgSrc: isKoperasi ? '/finance_hero_male.jpg' : '/finance_hero_hijab.jpg',
          imgFilter: 'brightness-105 contrast-100',
          titleColor: 'text-slate-800',
          subColor: 'text-slate-500',
          emoji: '☀️',
          badgeBg: 'bg-sky-100/60 border-sky-200 text-sky-900',
          badgeIconBg: 'bg-sky-500 text-white',
          decor: (
            <>
              <div className="absolute top-[-40px] right-[80px] w-40 h-40 rounded-full bg-amber-300/30 blur-2xl animate-pulse pointer-events-none" />
              <div className="absolute top-[-20px] right-[60px] w-24 h-24 rounded-full bg-yellow-400/20 blur-xl pointer-events-none" />
            </>
          )
        }
      case 'Sore':
        return {
          bannerBg: 'from-orange-50 via-rose-50/70 to-indigo-100/70 border-orange-100 text-slate-800',
          fadeColor: 'from-orange-50 via-orange-50/40 to-transparent',
          imgSrc: isKoperasi ? '/finance_hero_male_evening.jpg' : '/finance_hero_hijab_evening.jpg',
          imgFilter: 'brightness-95 contrast-105 saturate-110',
          titleColor: 'text-slate-800',
          subColor: 'text-slate-500',
          emoji: '🌇',
          badgeBg: 'bg-orange-100/60 border-orange-200 text-orange-950',
          badgeIconBg: 'bg-orange-500 text-white',
          decor: (
            <div className="absolute top-[-60px] right-[120px] w-52 h-52 rounded-full bg-gradient-to-br from-orange-300/30 to-indigo-400/20 blur-3xl pointer-events-none" />
          )
        }
      case 'Malam':
      default:
        return {
          bannerBg: 'from-slate-900 via-indigo-950 to-slate-950 border-slate-800 text-white shadow-inner',
          fadeColor: 'from-slate-900 via-slate-900/40 to-transparent',
          imgSrc: isKoperasi ? '/finance_hero_male_night.jpg' : '/finance_hero_hijab_night.jpg',
          imgFilter: 'brightness-[70%] contrast-110 saturate-[90%] md:opacity-100',
          titleColor: 'text-white',
          subColor: 'text-slate-300',
          emoji: '🌙',
          badgeBg: 'bg-white/10 border-white/20 text-slate-100',
          badgeIconBg: 'bg-indigo-600 text-white',
          decor: (
            <>
              {/* Moon glow */}
              <div className="absolute top-[-30px] right-[90px] w-44 h-44 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
              <div className="absolute top-4 right-20 w-8 h-8 rounded-full bg-amber-100/80 shadow-md shadow-amber-200/20 pointer-events-none">
                {/* Crescent inner shadow effect */}
                <div className="absolute top-0.5 left-2 w-7 h-7 rounded-full bg-slate-950" />
              </div>
              {/* Stars */}
              <div className="absolute top-12 right-40 w-1 h-1 rounded-full bg-white/80 animate-pulse pointer-events-none" />
              <div className="absolute top-6 right-64 w-1 h-1 rounded-full bg-white/40 animate-pulse pointer-events-none" />
              <div className="absolute top-16 right-56 w-1 h-1 rounded-full bg-white/60 pointer-events-none" />
              <div className="absolute top-24 right-36 w-1 h-1 rounded-full bg-white/90 animate-pulse pointer-events-none" />
            </>
          )
        }
    }
  }

  const getMenuCategories = (): MenuCategory[] => {
    if (role === 'admin') {
      return [
        {
          category: 'Master Data',
          icon: Users,
          items: [
            { title: 'Daftar Siswa & Pegawai', description: 'Lihat, tambah, import data siswa terdaftar dan data pegawai sekolah beserta status keaktifan.', path: '/admin/master-data', badge: 'Utama' },
          ]
        },
        {
          category: 'Kelola Tagihan',
          icon: ReceiptText,
          items: [
            { title: 'Pembuatan & Riwayat Tagihan', description: 'Buat tagihan baru per angkatan atau kelola tunggakan tagihan siswa.', path: '/admin/bills', badge: 'Tagihan' },
            { title: 'Tagihan Lama & Piutang Alumni', description: 'Pantau tunggakan dan catat piutang untuk siswa yang telah lulus.', path: '/admin/tagihan-lama', badge: 'Alumni' },
            { title: 'Konfigurasi Tagihan', description: 'Atur template jenis tagihan, pengecualian siswa berprestasi, dan keringanan siswa kurang mampu.', path: '/admin/tagihan-config', badge: 'Setting' },
          ]
        },
        {
          category: 'Penggajian',
          icon: Wallet,
          items: [
            { title: 'Proses Gaji Pegawai', description: 'Hitung gaji bersih bulanan beserta potongan koperasi dan cetak slip gaji.', path: '/admin/payroll', badge: 'Gaji Bulanan' },
            { title: 'Master Jenis Potongan', description: 'Atur kategori potongan gaji pegawai (misalnya simpanan, arisan, dll).', path: '/admin/potongan', badge: 'Setting' },
          ]
        },
        {
          category: 'Dashboard Analitik',
          icon: LayoutDashboard,
          items: [
            { title: 'Command Center Keuangan', description: 'Pantau arus kas, realisasi tagihan, piutang, dan statistik bulanan.', path: '/admin/dashboard', badge: 'Grafik' },
          ]
        },
        {
          category: 'Manajemen Sistem',
          icon: Settings,
          items: [
            { title: 'Akun Pengguna', description: 'Kelola akun login untuk admin, bendahara, dan koperasi.', path: '/admin/accounts', badge: 'Akses' },
          ]
        }
      ]
    }
    
    if (role === 'bendahara') {
      return [
        {
          category: 'Verifikasi Keuangan',
          icon: Building2,
          items: [
            { title: 'Verifikasi Pembayaran Wali', description: 'Validasi bukti transfer pembayaran tagihan siswa dari wali murid.', path: '/admin/bendahara', badge: 'Approval' },
          ]
        },
        {
          category: 'Kelola Tagihan',
          icon: ReceiptText,
          items: [
            { title: 'Konfigurasi Tagihan', description: 'Atur template jenis tagihan, pengecualian siswa berprestasi, dan keringanan siswa kurang mampu.', path: '/admin/tagihan-config', badge: 'Setting' },
          ]
        }
      ]
    }
    
    if (role === 'koperasi') {
      return [
        {
          category: 'Manajemen Koperasi',
          icon: FileSpreadsheet,
          items: [
            { title: 'Data ID Pegawai', description: 'Sinkronisasi NIP/ID Pegawai sekolah dengan ID anggota koperasi.', path: '/admin/master-data', badge: 'Sinkron' },
            { title: 'Import Potongan Gaji', description: 'Upload tagihan cicilan & simpanan koperasi Bina Sejahtera.', path: '/admin/koperasi', badge: 'Upload' },
          ]
        }
      ]
    }
    
    return []
  }

  const theme = getTheme()
  const menuCategories = getMenuCategories()
  const filteredCategories = menuCategories.map(cat => {
    const matchedItems = cat.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return {
      ...cat,
      items: matchedItems
    }
  }).filter(cat => cat.items.length > 0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar inside page */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 no-print">
        {/* Date Badge */}
        <div className="bg-slate-100/80 text-slate-600 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2">
          📅 {getCurrentDateString()}
        </div>
        
        {/* Right tools (Notification + Avatar dropdown) */}
        <div className="flex items-center gap-4">
          {/* Bell Notification Button */}
          {(role === 'admin' || role === 'bendahara') ? (
            <div ref={notifMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifMenu(v => !v);
                  if (displayCount > 0) {
                    setAcknowledgedCount(pendingCount)
                    localStorage.setItem('acknowledgedPendingCount', pendingCount.toString())
                  }
                }}
                className="relative w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors border border-slate-100"
              >
                {(displayCount + kopNotifs.length) > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                    {(displayCount + kopNotifs.length) > 99 ? '99+' : (displayCount + kopNotifs.length)}
                  </span>
                ) : (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-300"></span>
                )}
                <Bell size={18} />
              </button>

              {/* Notification Dropdown */}
              {showNotifMenu && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="font-bold text-sm text-slate-800">Notifikasi</p>
                    <div className="flex items-center gap-2">
                      {(displayCount + kopNotifs.length) > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                          {displayCount + kopNotifs.length} belum dibaca
                        </span>
                      )}
                      {kopNotifs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setKopNotifs([])}
                          className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {/* Pending Payments Section */}
                    {displayCount > 0 && (
                      <button
                        type="button"
                        onClick={() => { setShowNotifMenu(false); navigate('/admin/bendahara') }}
                        className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-red-50 transition-colors text-left group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                          {displayCount}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 group-hover:text-red-600 transition-colors">Pembayaran Menunggu Verifikasi</p>
                          <p className="text-xs text-slate-400 mt-0.5">Klik untuk membuka halaman verifikasi</p>
                        </div>
                      </button>
                    )}

                    {/* Koperasi Notifications */}
                    {kopNotifs.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => { setShowNotifMenu(false); navigate(notif.type === 'koperasi_upload' ? '/admin/koperasi' : '/admin/master-data') }}
                        className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-emerald-50 transition-colors text-left group"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${
                          notif.type === 'koperasi_upload'
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-sky-100 text-sky-600'
                        }`}>
                          {notif.type === 'koperasi_upload' ? '📥' : '🔄'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 group-hover:text-emerald-700 transition-colors leading-tight">{notif.message}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{notif.time}</p>
                        </div>
                      </button>
                    ))}

                    {/* Empty State */}
                    {displayCount === 0 && kopNotifs.length === 0 && (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Tidak ada notifikasi baru</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
              <Bell size={18} />
            </div>
          )}
          
          {/* Profile Pill + Dropdown */}
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(v => !v)}
              className="flex items-center gap-3 bg-slate-50/50 border border-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800 leading-none">{nama || user?.email?.split('@')[0] || 'User'}</p>
                <p className="text-[10px] font-medium text-slate-400 capitalize mt-1">{role}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (nama || user?.email || 'A').charAt(0).toUpperCase()
                )}
              </div>
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-xs font-bold text-slate-800 truncate">{nama || user?.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{user?.email}</p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => { setShowProfileMenu(false); navigate('/admin/settings') }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                      <Settings className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm">Pengaturan Akun</span>
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-slate-50 py-1">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm">Keluar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Greeting Section */}
      <div className={`relative overflow-hidden border rounded-[32px] min-h-[180px] sm:min-h-[220px] flex flex-row justify-between shadow-sm no-print mt-6 transition-all duration-500 bg-gradient-to-r ${theme.bannerBg}`}>
        {/* Dynamic theme decoration background element */}
        {theme.decor}

        {/* Left column - Content inside padding */}
        <div className="p-4 sm:p-6 md:p-8 pr-0 z-10 w-[60%] sm:w-[65%] flex flex-col justify-center space-y-2 sm:space-y-4 text-left">
          <div className="space-y-1 sm:space-y-2">
            <p className={`font-semibold text-[10px] sm:text-sm flex items-center gap-1.5 ${theme.subColor}`}>
              {theme.emoji} Selamat {getGreeting()},
            </p>
            <h2 className={`text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight ${theme.titleColor} leading-tight`}>
              {nama || user?.email?.split('@')[0] || 'User'}
              <span className="text-emerald-500">.</span>
            </h2>
            <p className={`text-[10px] sm:text-xs md:text-sm max-w-md ${theme.subColor} leading-normal sm:leading-relaxed`}>
              Semoga hari ini penuh berkah dan kemudahan dalam mengelola keuangan MTs KHWM.
            </p>
          </div>
          
          <div className="flex">
            <div className={`inline-flex items-center gap-2 sm:gap-3 border rounded-xl sm:rounded-2xl px-2.5 py-1 sm:px-4 sm:py-2 transition-colors ${theme.badgeBg}`}>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-bold ${theme.badgeIconBg}`}>
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <p className="text-[8px] sm:text-[9px] font-bold opacity-60 uppercase tracking-wider leading-none">Akses Akun</p>
                <p className="text-[10px] sm:text-xs font-bold capitalize mt-0.5 sm:mt-1">{role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side background image that blends seamlessly with the card */}
        <div className="absolute right-0 top-0 bottom-0 w-[42%] sm:w-[45%] md:w-[48%] lg:w-[480px] h-full overflow-hidden pointer-events-none rounded-r-[30px] z-0">
          {/* Smooth gradient fade to theme color on the left side of the image */}
          <div className={`absolute inset-0 bg-gradient-to-r ${theme.fadeColor} z-10 pointer-events-none`} />
          
          <img 
            src={theme.imgSrc} 
            alt="Finance Illustration" 
            className={`w-full h-full object-cover object-right md:object-center transition-all duration-700 ${theme.imgFilter || ''}`}
          />
        </div>
      </div>

      {/* Search Input for Menu */}
      <div className="relative mt-6 no-print">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Cari menu atau layanan di sini..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white text-sm shadow-sm transition-all focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Menu Categories - Compact Tile List */}
      <div className="flex flex-col gap-2.5 mt-4">
        {filteredCategories.map((cat, i) => {
          const Icon = cat.icon
          const isExpanded = expandedCategory === i
          const isSingleItem = cat.items.length === 1

          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
              {/* Tile Header — always visible */}
              <button
                type="button"
                onClick={() => {
                  if (isSingleItem) {
                    navigate(cat.items[0].path)
                  } else {
                    setExpandedCategory(isExpanded ? null : i)
                  }
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 leading-tight">{cat.category}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {cat.items.length} fitur
                  </p>
                </div>

                {/* Chevron */}
                {isSingleItem ? (
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                ) : (
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                )}
              </button>

              {/* Expandable Sub-items (only for multi-item categories) */}
              {!isSingleItem && isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  {cat.items.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-emerald-50/50 transition-colors text-left group"
                    >
                      <div className="w-1 h-8 rounded-full bg-emerald-200 group-hover:bg-emerald-400 transition-colors flex-shrink-0 ml-2" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-700 group-hover:text-emerald-600 transition-colors">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-1">{item.description}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
