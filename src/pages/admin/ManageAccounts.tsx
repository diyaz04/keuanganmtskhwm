import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface AdminProfile {
  id: string
  nama: string
  role: string
  created_at: string
}

export default function ManageAccounts() {
  // session is implicitly required for this page to be mounted, but not used directly here
  const [accounts, setAccounts] = useState<AdminProfile[]>([])
  const [loading, setLoading] = useState(true)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nama, setNama] = useState('')
  const [role, setRole] = useState('bendahara')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)

  const [showDangerModal, setShowDangerModal] = useState(false)
  const [dangerConfirmText, setDangerConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  
  const [resetOptions, setResetOptions] = useState({
    payments: true,
    bills: true,
    students: true,
    employees: true,
    billing_templates: true,
    deduction_types: true,
    koperasi_uploads: true,
  })

  const isAllChecked = Object.values(resetOptions).every(Boolean)

  const handleSelectAll = () => {
    const newValue = !isAllChecked
    setResetOptions({
      payments: newValue,
      bills: newValue,
      students: newValue,
      employees: newValue,
      billing_templates: newValue,
      deduction_types: newValue,
      koperasi_uploads: newValue,
    })
  }

  const handleOptionChange = (key: keyof typeof resetOptions) => {
    setResetOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleFactoryReset = async () => {
    if (dangerConfirmText !== 'hapus data sekarang') return
    setIsResetting(true)
    setMessage(null)
    
    try {
      const promises: any[] = []
      
      // Jika hanya payments yang dihapus (tanpa bills/students), kita perlu reset status bills
      if (resetOptions.payments && !resetOptions.bills && !resetOptions.students) {
        promises.push(supabase.from('payments').delete().not('id', 'is', null))
        promises.push(supabase.from('bills').update({ status: 'unpaid', nominal_terbayar: 0 }).neq('status', 'draft').gt('nominal', 0))
      } else if (resetOptions.payments) {
        promises.push(supabase.from('payments').delete().not('id', 'is', null))
      }

      if (resetOptions.bills) promises.push(supabase.from('bills').delete().not('id', 'is', null))
      if (resetOptions.students) promises.push(supabase.from('students').delete().not('id', 'is', null))
      if (resetOptions.employees) promises.push(supabase.from('employees').delete().not('id', 'is', null))
      if (resetOptions.billing_templates) promises.push(supabase.from('billing_templates').delete().not('id', 'is', null))
      if (resetOptions.deduction_types) promises.push(supabase.from('deduction_types').delete().not('id', 'is', null))
      if (resetOptions.koperasi_uploads) promises.push(supabase.from('koperasi_uploads').delete().not('id', 'is', null))

      if (promises.length === 0) {
        throw new Error('Tidak ada data yang dipilih untuk dihapus.')
      }

      await Promise.all(promises)
      
      setMessage({ type: 'success', text: 'Reset Data berhasil. Data yang dipilih telah dikosongkan.' })
      setShowDangerModal(false)
      setDangerConfirmText('')
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal melakukan reset data: ' + err.message })
    } finally {
      setIsResetting(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setAccounts(data)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      // Call Edge Function to create user
      const { error } = await supabase.functions.invoke('create-admin-user', {
        body: { email, password, nama, role }
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Akun berhasil dibuat.' })
      setEmail('')
      setPassword('')
      setNama('')
      fetchAccounts()
    } catch (error: any) {
      console.error('Error creating account:', error)
      setMessage({ type: 'error', text: error.message || 'Gagal membuat akun.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kelola Akun</h1>
        <p className="text-muted-foreground mt-2">
          Tambahkan atau lihat daftar akun Admin dan Bendahara.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Buat Akun Baru</CardTitle>
            <CardDescription>Daftarkan staf baru sebagai Admin atau Bendahara.</CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateAccount}>
            <CardContent className="space-y-4">
              {message && (
                <div className={`p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-destructive/15 text-destructive' : 'bg-green-100 text-green-800'}`}>
                  {message.text}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select 
                  id="role" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="bendahara">Bendahara</option>
                  <option value="admin">Admin</option>
                  <option value="koperasi">Koperasi</option>
                </select>
              </div>
            </CardContent>
            <div className="p-6 pt-0">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Buat Akun'}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Staf Terdaftar</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Memuat data...</p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada staf terdaftar.</p>
            ) : (
              <div className="space-y-4">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{acc.nama}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <div className="mt-12">
        <Card className="border-red-200">
          <CardHeader className="bg-red-50/50 rounded-t-xl">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone (Area Pengembang)
            </CardTitle>
            <CardDescription className="text-red-600/80">
              Pengaturan kritis yang dapat menyebabkan hilangnya data permanen.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="font-semibold text-slate-900">Factory Reset</h4>
                <p className="text-sm text-slate-500 max-w-xl">
                  Menghapus SELURUH data di aplikasi (Siswa, Pegawai, Tagihan, Pembayaran, Penggajian, Konfigurasi) kecuali akun admin ini. Aplikasi akan kembali seperti baru terpasang.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => setShowDangerModal(true)}
              >
                Hapus Semua Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Modal */}
      {showDangerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-red-700">Peringatan Kritis!</h2>
              <p className="text-sm text-red-600 mt-2">
                Tindakan ini tidak dapat dibatalkan. Pilih data apa saja yang ingin Anda hapus selamanya.
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Checkboxes */}
              <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
                <label className="flex items-center gap-3 pb-3 border-b border-slate-200 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded text-red-600 focus:ring-red-500 accent-red-600" checked={isAllChecked} onChange={handleSelectAll} />
                  <span className="font-bold text-slate-800">Pilih Semua Data</span>
                </label>
                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600" checked={resetOptions.payments} onChange={() => handleOptionChange('payments')} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">Riwayat Pembayaran</span>
                      <span className="text-xs text-slate-500">Menghapus transaksi pembayaran, status tagihan kembali menjadi Belum Lunas.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600" checked={resetOptions.bills} onChange={() => handleOptionChange('bills')} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">Data Tagihan Siswa</span>
                      <span className="text-xs text-slate-500">Menghapus seluruh tagihan yang sudah digenerate (termasuk pembayarannya).</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600" checked={resetOptions.students} onChange={() => handleOptionChange('students')} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">Data Siswa</span>
                      <span className="text-xs text-slate-500">Menghapus seluruh siswa beserta tagihan dan pembayaran.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600" checked={resetOptions.employees} onChange={() => handleOptionChange('employees')} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">Data Pegawai</span>
                      <span className="text-xs text-slate-500">Menghapus seluruh pegawai beserta riwayat penggajian.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600" checked={resetOptions.billing_templates} onChange={() => handleOptionChange('billing_templates')} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">Template & Master Tagihan</span>
                      <span className="text-xs text-slate-500">Menghapus konfigurasi tagihan siswa.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600" checked={resetOptions.deduction_types} onChange={() => handleOptionChange('deduction_types')} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">Master Potongan Pegawai</span>
                      <span className="text-xs text-slate-500">Menghapus daftar jenis potongan untuk guru.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600" checked={resetOptions.koperasi_uploads} onChange={() => handleOptionChange('koperasi_uploads')} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">Data Koperasi</span>
                      <span className="text-xs text-slate-500">Menghapus riwayat import data potongan koperasi.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm text-slate-700 font-medium mb-3">
                  Untuk memverifikasi, ketik kalimat di bawah ini:
                </p>
                <div className="p-3 bg-slate-100 rounded-lg text-center font-mono text-sm font-bold text-slate-800 select-all mb-3 border border-slate-200">
                  hapus data sekarang
                </div>
                <Input
                  value={dangerConfirmText}
                  onChange={(e) => setDangerConfirmText(e.target.value)}
                  placeholder="Ketik persis seperti kalimat di atas"
                  className="w-full text-center h-11 text-base font-medium"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDangerModal(false)} disabled={isResetting}>
                Batal
              </Button>
              <Button 
                variant="destructive" 
                disabled={dangerConfirmText !== 'hapus data sekarang' || isResetting || !Object.values(resetOptions).some(Boolean)}
                onClick={handleFactoryReset}
              >
                {isResetting ? 'Menghapus...' : 'Ya, Hapus Data Terpilih'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
