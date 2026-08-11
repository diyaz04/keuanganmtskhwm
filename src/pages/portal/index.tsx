import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import GuruPortal from './GuruPortal'
import SiswaPortal from './SiswaPortal'

export interface PortalUser {
  id: string
  nama: string
  type: 'guru' | 'siswa'
  token: string
}

export default function Portal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null)

  useEffect(() => {
    const type = searchParams.get('type')
    const code = searchParams.get('code')
    const nisn = searchParams.get('nisn')

    // Periksa apakah sudah ada token di localStorage
    const storedSession = localStorage.getItem('portal_session')
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as PortalUser
        setPortalUser(parsed)
        setLoading(false)
        return
      } catch {
        localStorage.removeItem('portal_session')
      }
    }

    // Jika ada parameter login di URL
    if (type && (code || nisn)) {
      handleLogin(type, code || nisn || '')
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const handleLogin = async (type: string, credential: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('portal-login', {
        body: { type, credential }
      })

      if (error) {
        throw new Error(error.message || 'Gagal terhubung ke server')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      if (data?.token && data?.user) {
        const sessionData: PortalUser = {
          ...data.user,
          token: data.token
        }
        localStorage.setItem('portal_session', JSON.stringify(sessionData))
        setPortalUser(sessionData)
        
        // Bersihkan URL dari credential rahasia
        navigate('/portal', { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Gagal login. Kredensial mungkin salah.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('portal_session')
    setPortalUser(null)
    navigate('/')
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Memproses login...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Gagal Masuk</h2>
        <p className="text-muted-foreground">{error}</p>
        <button 
          onClick={() => navigate('/')} 
          className="text-primary hover:underline font-medium"
        >
          Kembali ke halaman utama
        </button>
      </div>
    )
  }

  if (!portalUser) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <h2 className="text-2xl font-bold">Akses Ditolak</h2>
        <p className="text-muted-foreground">Anda belum login ke portal.</p>
        <button 
          onClick={() => navigate('/')} 
          className="text-primary hover:underline font-medium"
        >
          Kembali ke halaman utama
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex justify-between items-center pb-4 border-b print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-primary">Portal {portalUser.type === 'guru' ? 'Guru & Staf' : 'Wali Murid'}</h2>
          <p className="text-sm text-muted-foreground">Selamat datang, {portalUser.nama}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          Keluar
        </button>
      </div>

      {portalUser.type === 'guru' && <GuruPortal user={portalUser} />}
      {portalUser.type === 'siswa' && <SiswaPortal user={portalUser} />}
    </div>
  )
}
