import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Camera, CheckCircle2, AlertCircle, Loader2, Pencil, Landmark } from 'lucide-react'

export default function Settings() {
  const { user, role, nama, avatarUrl, refreshProfile } = useAuth()
  
  // Password State
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Nama State
  const [namaEdit, setNamaEdit] = useState(nama || '')
  const [namaLoading, setNamaLoading] = useState(false)
  
  // Status State
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Rekening Madrasah State (admin & bendahara)
  const canEditRekening = role === 'admin' || role === 'bendahara'
  const [namaBank, setNamaBank] = useState('')
  const [noRekening, setNoRekening] = useState('')
  const [atasNama, setAtasNama] = useState('')
  const [rekeningLoading, setRekeningLoading] = useState(false)
  const [rekeningFetching, setRekeningFetching] = useState(true)

  useEffect(() => {
    if (!canEditRekening) {
      setRekeningFetching(false)
      return
    }
    const fetchRekening = async () => {
      const { data } = await supabase
        .from('school_settings')
        .select('nama_bank, no_rekening, atas_nama')
        .eq('id', 1)
        .maybeSingle()
      if (data) {
        setNamaBank(data.nama_bank || '')
        setNoRekening(data.no_rekening || '')
        setAtasNama(data.atas_nama || '')
      }
      setRekeningFetching(false)
    }
    fetchRekening()
  }, [canEditRekening])

  const handleRekeningSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRekeningLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('school_settings')
        .upsert({
          id: 1,
          nama_bank: namaBank.trim() || null,
          no_rekening: noRekening.trim() || null,
          atas_nama: atasNama.trim() || null,
          updated_at: new Date().toISOString()
        })
      if (error) throw error
      setMessage({ type: 'success', text: 'Info rekening madrasah berhasil diperbarui!' })
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: err.message || 'Gagal memperbarui info rekening.' })
    } finally {
      setRekeningLoading(false)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'File harus berupa gambar!' })
      return
    }

    setAvatarLoading(true)
    setMessage(null)

    try {
      // 1. Upload ke Cloudinary
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)
      formData.append('folder', 'sik_profiles')

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      )

      if (!cloudinaryRes.ok) {
        throw new Error('Upload ke Cloudinary gagal. Periksa konfigurasi upload preset.')
      }

      const cloudinaryData = await cloudinaryRes.json()
      const imageUrl: string = cloudinaryData.secure_url

      // 2. Simpan URL Cloudinary ke Supabase
      if (!user) return
      const { error } = await supabase
        .from('admin_profiles')
        .update({ avatar_url: imageUrl })
        .eq('id', user.id)

      if (error) throw error

      // 3. Refresh profil di context agar avatar langsung terupdate
      await refreshProfile()
      setMessage({ type: 'success', text: 'Foto profil berhasil diperbarui!' })
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: err.message || 'Gagal mengunggah foto profil.' })
    } finally {
      setAvatarLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validasi
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok!' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password baru minimal harus 6 karakter!' })
      return
    }

    setPasswordLoading(true)
    setMessage(null)

    try {
      // 1. Validasi Password Lama dengan cara mencoba login kembali
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: oldPassword
      })

      if (signInError) {
        throw new Error('Password lama yang Anda masukkan salah.')
      }

      // 2. Jika login berhasil, update password ke yang baru
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      setMessage({ type: 'success', text: 'Password berhasil diperbarui!' })
      
      // Reset form
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: err.message || 'Gagal memperbarui password.' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleNamaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const trimmed = namaEdit.trim()
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Nama tidak boleh kosong!' })
      return
    }

    setNamaLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({ nama: trimmed })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      setMessage({ type: 'success', text: 'Nama berhasil diperbarui!' })
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: err.message || 'Gagal memperbarui nama.' })
    } finally {
      setNamaLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl md:text-3xl font-bold tracking-tight text-slate-800">Pengaturan Akun</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Kelola foto profil, nama tampilan, dan ubah kata sandi akun Anda.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-medium">{message.text}</div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Profile Card */}
        <div className="md:col-span-1">
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Profil Anda</CardTitle>
              <CardDescription>Detail identitas login aktif</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pb-6">
              {/* Profile Photo Area */}
              <div className="relative group mb-6">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-50 bg-slate-100 flex items-center justify-center shadow-md relative">
                  {avatarLoading ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  ) : null}
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-500 text-white flex items-center justify-center font-extrabold text-3xl uppercase">
                      {(nama || user?.email || 'A').charAt(0)}
                    </div>
                  )}
                </div>
                
                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="absolute bottom-0 right-0 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white"
                  title="Upload Foto Profil"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden" 
                />
              </div>

              <div className="text-center space-y-1 w-full px-2">
                <h3 className="font-bold text-slate-800 truncate" title={nama || ''}>
                  {nama || 'User'}
                </h3>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{role}</p>
                <div className="pt-3 border-t border-slate-100 text-left space-y-2 mt-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Email</span>
                    <span className="text-xs font-medium text-slate-600 break-all">{user?.email}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Forms */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Ubah Nama Card */}
          <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Ubah Nama Tampilan</CardTitle>
                  <CardDescription>Perbarui nama yang tampil di seluruh sistem</CardDescription>
                </div>
              </div>
            </CardHeader>
            <form onSubmit={handleNamaSubmit}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label htmlFor="nama_edit">Nama Lengkap</Label>
                  <Input
                    id="nama_edit"
                    type="text"
                    placeholder="Masukkan nama lengkap..."
                    value={namaEdit}
                    onChange={(e) => setNamaEdit(e.target.value)}
                    className="rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="pb-6 pt-2 border-t border-slate-50 flex justify-end">
                <Button
                  type="submit"
                  disabled={namaLoading}
                  className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-md px-6"
                >
                  {namaLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Nama'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Ubah Password Card */}
          <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Ubah Kata Sandi</CardTitle>
                  <CardDescription>Perbarui password akun untuk keamanan tambahan</CardDescription>
                </div>
              </div>
            </CardHeader>
            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="old_password">Password Lama</Label>
                  <Input 
                    id="old_password"
                    type="password"
                    placeholder="Masukkan password saat ini..."
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">Password Baru</Label>
                    <Input 
                      id="new_password"
                      type="password"
                      placeholder="Minimal 6 karakter..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
                    <Input 
                      id="confirm_password"
                      type="password"
                      placeholder="Ulangi password baru..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pb-6 pt-2 border-t border-slate-50 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={passwordLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md px-6"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Perbarui Password'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Rekening Madrasah Card (Admin & Bendahara) */}
          {canEditRekening && (
            <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Rekening Pembayaran Madrasah</CardTitle>
                    <CardDescription>Nomor rekening ini akan tampil di Portal Wali saat mereka upload bukti transfer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handleRekeningSubmit}>
                <CardContent className="space-y-4 pt-6">
                  {rekeningFetching ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="nama_bank">Nama Bank</Label>
                          <Input
                            id="nama_bank"
                            placeholder="Contoh: BSI, BRI, Mandiri..."
                            value={namaBank}
                            onChange={(e) => setNamaBank(e.target.value)}
                            className="rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="no_rekening">Nomor Rekening</Label>
                          <Input
                            id="no_rekening"
                            placeholder="Contoh: 1234567890"
                            value={noRekening}
                            onChange={(e) => setNoRekening(e.target.value)}
                            className="rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="atas_nama">Atas Nama</Label>
                        <Input
                          id="atas_nama"
                          placeholder="Contoh: MTs KH A Wahab Muhsin"
                          value={atasNama}
                          onChange={(e) => setAtasNama(e.target.value)}
                          className="rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter className="pb-6 pt-2 border-t border-slate-50 flex justify-end">
                  <Button
                    type="submit"
                    disabled={rekeningLoading || rekeningFetching}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md px-6"
                  >
                    {rekeningLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Rekening'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
