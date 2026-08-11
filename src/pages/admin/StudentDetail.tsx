import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Pencil } from 'lucide-react'

// Types
interface Student {
  id: string
  nama: string
  nisn: string
  kelas: string
  angkatan: string
  status: string
  nama_wali: string
}

interface Payment {
  status: string
  tanggal_bayar: string
  nomor_kwitansi: string
}

interface Bill {
  id: string
  jenis_tagihan: string
  nominal: number
  jatuh_tempo: string
  status: string
  created_at: string
  payments: Payment[]
}

export default function StudentDetail() {
  const { studentId: id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editNama, setEditNama] = useState('')
  const [editNisn, setEditNisn] = useState('')
  const [editKelas, setEditKelas] = useState('')
  const [editAngkatan, setEditAngkatan] = useState('')
  const [editNamaWali, setEditNamaWali] = useState('')
  const [editStatus, setEditStatus] = useState('aktif')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        if (!id) return

        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('id', id)
          .single()

        if (studentError) throw studentError
        if (studentData) {
          setStudent(studentData)
          setEditNama(studentData.nama || '')
          setEditNisn(studentData.nisn || '')
          setEditKelas(studentData.kelas || '')
          setEditAngkatan(studentData.angkatan || '')
          setEditNamaWali(studentData.nama_wali || '')
          setEditStatus(studentData.status || 'aktif')
        }

        const { data: billsData, error: billsError } = await supabase
          .from('bills')
          .select('*, payments(status, tanggal_bayar, nomor_kwitansi)')
          .eq('student_id', id)
          .order('created_at', { ascending: false })

        if (billsError) throw billsError
        setBills(billsData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student || !id) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('students')
        .update({
          nama: editNama,
          nisn: editNisn,
          kelas: editKelas,
          angkatan: editAngkatan,
          nama_wali: editNamaWali,
          status: editStatus
        })
        .eq('id', id)

      if (error) throw error

      setStudent({
        ...student,
        nama: editNama,
        nisn: editNisn,
        kelas: editKelas,
        angkatan: editAngkatan,
        nama_wali: editNamaWali,
        status: editStatus
      })
      setIsEditModalOpen(false)
      alert('Profil siswa berhasil diperbarui!')
    } catch (err: any) {
      console.error(err)
      alert('Gagal memperbarui profil siswa: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Summary calculations
  const totalTagihan = bills.reduce((acc, bill) => acc + (bill.nominal || 0), 0)
  const totalDibayar = bills.reduce((acc, bill) => acc + (bill.status === 'paid' ? (bill.nominal || 0) : 0), 0)
  const totalTunggakan = totalTagihan - totalDibayar

  const isLunas = bills.length > 0 && totalTunggakan === 0

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground flex justify-center items-center h-64">Memuat data siswa...</div>
  }

  if (!student) {
    return <div className="p-8 text-center text-destructive flex justify-center items-center h-64 font-medium">Data siswa tidak ditemukan</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 relative">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Detail Siswa</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="relative overflow-hidden">
          {/* LUNAS Stamp Overlay */}
          {isLunas && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none select-none opacity-25 z-0">
              <div className="border-[10px] border-green-600 text-green-600 text-6xl font-black uppercase tracking-widest p-6 rounded-xl shadow-lg whitespace-nowrap bg-white/50 backdrop-blur-sm mix-blend-multiply">
                LUNAS
              </div>
            </div>
          )}
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle>Profil Siswa</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditModalOpen(true)}
              className="gap-1.5 h-8 text-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Profil
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nama Lengkap</p>
                <p className="text-lg font-semibold">{student.nama}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                student.status === 'aktif' ? 'bg-green-100 text-green-800' :
                student.status === 'lulus' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {student.status || 'aktif'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">NISN</p>
                <p className="font-medium">{student.nisn}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kelas</p>
                <p className="font-medium">{student.kelas || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Angkatan</p>
                <p className="font-medium">{student.angkatan || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nama Wali</p>
              <p className="font-medium">{student.nama_wali || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <p className="text-sm font-medium text-muted-foreground">Total Tagihan</p>
              <p className="text-lg font-semibold">{formatCurrency(totalTagihan)}</p>
            </div>
            <div className="flex justify-between items-center border-b pb-4">
              <p className="text-sm font-medium text-muted-foreground">Sudah Dibayar</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(totalDibayar)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-muted-foreground">Total Tunggakan</p>
              <p className={`text-xl font-bold ${totalTunggakan > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(totalTunggakan)}
              </p>
            </div>
            {totalTunggakan > 0 && (
              <div className="mt-4 bg-red-100 text-red-800 px-4 py-3 rounded-md text-center font-semibold flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Belum Lunas: {formatCurrency(totalTunggakan)}
              </div>
            )}
            {isLunas && (
               <div className="mt-4 bg-green-100 text-green-800 px-4 py-3 rounded-md text-center font-bold text-lg border-2 border-green-500 border-dashed shadow-sm">
                 Semua Tagihan LUNAS
               </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Tagihan</CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
              Belum ada riwayat tagihan untuk siswa ini.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3">Jenis Tagihan</th>
                    <th className="px-4 py-3">Nominal</th>
                    <th className="px-4 py-3">Tanggal Dibuat</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tanggal Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bills.map((bill) => {
                    // Find a relevant payment date
                    const approvedPayment = bill.payments?.find(p => p.status === 'approved')
                    const paymentDate = approvedPayment?.tanggal_bayar || (bill.payments?.length > 0 ? bill.payments[0].tanggal_bayar : null)
                    
                    return (
                      <tr key={bill.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-4 font-medium">{bill.jenis_tagihan}</td>
                        <td className="px-4 py-4">{formatCurrency(bill.nominal)}</td>
                        <td className="px-4 py-4">{formatDate(bill.created_at)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            bill.status === 'paid' ? 'bg-green-100 text-green-800' : 
                            bill.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {bill.status === 'paid' ? 'Lunas' : bill.status === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {bill.status === 'paid' && paymentDate ? formatDate(paymentDate) : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Edit Student Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-xl border border-slate-200/80 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                <Pencil className="w-5 h-5 text-primary" />
                Edit Profil Siswa
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_nama" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Lengkap</Label>
                  <Input 
                    id="edit_nama" 
                    value={editNama} 
                    onChange={e => setEditNama(e.target.value)} 
                    className="h-10 rounded-lg"
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_nisn" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">NISN</Label>
                    <Input 
                      id="edit_nisn" 
                      value={editNisn} 
                      onChange={e => setEditNisn(e.target.value)} 
                      className="h-10 rounded-lg"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_status" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status Keaktifan</Label>
                    <select 
                      id="edit_status" 
                      value={editStatus} 
                      onChange={e => setEditStatus(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="lulus">Lulus</option>
                      <option value="keluar">Keluar</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_kelas" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Kelas</Label>
                    <Input 
                      id="edit_kelas" 
                      value={editKelas} 
                      onChange={e => setEditKelas(e.target.value)} 
                      className="h-10 rounded-lg"
                      placeholder="Contoh: 7A, 8B"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_angkatan" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Angkatan</Label>
                    <Input 
                      id="edit_angkatan" 
                      value={editAngkatan} 
                      onChange={e => setEditAngkatan(e.target.value)} 
                      className="h-10 rounded-lg"
                      placeholder="Contoh: 2024/2025"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_nama_wali" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Wali</Label>
                  <Input 
                    id="edit_nama_wali" 
                    value={editNamaWali} 
                    onChange={e => setEditNamaWali(e.target.value)} 
                    className="h-10 rounded-lg"
                    placeholder="Masukkan nama wali..."
                  />
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-10 rounded-lg" 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="w-full h-10 rounded-lg" 
                  disabled={isSaving}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
