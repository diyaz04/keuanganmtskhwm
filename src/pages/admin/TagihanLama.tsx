import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, Upload, CheckCircle, FileSpreadsheet } from 'lucide-react'
import { read, utils, write } from 'xlsx'

type Student = {
  id: string
  nisn: string
  nama: string
  kelas: string
  angkatan: string
  status: string
}

type Bill = {
  id: string
  student_id: string
  jenis_tagihan: string
  nominal: number
  nominal_terbayar?: number
  tipe_periode: string
  bulan?: number
  tahun?: number
  status: string
  created_at: string
  students?: Student
}

export default function TagihanLama() {
  const [bills, setBills] = useState<Bill[]>([])
  const [students, setStudents] = useState<Student[]>([]) // Hanya untuk referensi saat import
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null)

  // Filter State
  const [searchName, setSearchName] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAngkatan, setFilterAngkatan] = useState('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [studentsRes, billsRes] = await Promise.all([
        supabase.from('students').select('id, nisn, nama, kelas, angkatan, status').eq('status', 'lulus').order('nama'),
        supabase.from('bills').select(`*, students:student_id (id, nisn, nama, kelas, angkatan, status)`).order('created_at', { ascending: false })
      ])

      if (studentsRes.error) throw studentsRes.error
      if (studentsRes.data) setStudents(studentsRes.data as Student[])

      if (billsRes.error) throw billsRes.error
      if (billsRes.data) {
        const allBills = billsRes.data as Bill[]
        // Filter out bills that belong to alumni
        const alumniBills = allBills.filter(b => b.students?.status === 'lulus')
        setBills(alumniBills)
      }
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: 'Gagal mengambil data: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleBayarManual = async (bill: Bill) => {
    if (!window.confirm(`Anda yakin ingin MELUNASKAN secara manual tagihan ${bill.jenis_tagihan} untuk ${bill.students?.nama}?`)) return
    
    setSubmitting(true)
    try {
      const sisa = bill.nominal - (bill.nominal_terbayar || 0)
      
      const { error: paymentError } = await supabase.from('payments').insert({
        bill_id: bill.id,
        nominal_dibayar: sisa,
        status: 'approved',
        tanggal_bayar: new Date().toISOString(),
        catatan: 'Lunas bayar manual ke bendahara madrasah',
      })
      if (paymentError) throw paymentError

      const { error: billError } = await supabase.from('bills').update({
        nominal_terbayar: bill.nominal,
        status: 'paid'
      }).eq('id', bill.id)
      if (billError) throw billError

      setMessage({ type: 'success', text: 'Pembayaran manual berhasil dicatat.' })
      fetchData()
    } catch (err: any) {
      setMessage({ type: 'error', text: `Gagal bayar manual: ${err.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const data = [
      ['NISN', 'Nama Lengkap', 'Kelas 9 Terakhir', 'Nama Tagihan', 'Nominal Piutang', 'Keterangan (Opsional)'],
      ['1234567890', 'Ahmad Budi', '9A', 'Tunggakan SPP', 150000, 'Tunggakan SPP Juli 2024']
    ]
    const ws = utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 30 }]
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Template_Piutang')
    const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' })
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Template_Import_Piutang_Alumni.xlsx'
    link.click()
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSubmitting(true)
    setMessage(null)

    try {
      const reader = new FileReader()
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result
          const wb = read(bstr, { type: 'binary' })
          const wsname = wb.SheetNames[0]
          const ws = wb.Sheets[wsname]
          const data = utils.sheet_to_json(ws) as any[]

          let insertedCount = 0
          const errors = []

          for (const row of data) {
            const nisn = row['NISN']?.toString().trim()
            const jenisTagihan = row['Nama Tagihan']
            const nominal = parseFloat(row['Nominal Piutang'])
            
            if (!nisn || !jenisTagihan || isNaN(nominal)) {
              errors.push(`Baris dilewati (Data tidak lengkap): NISN ${nisn || '-'}`)
              continue
            }

            const student = students.find(s => s.nisn === nisn)
            if (!student) {
              errors.push(`Siswa Alumni dengan NISN ${nisn} tidak ditemukan`)
              continue
            }

            const { error: insertError } = await supabase.from('bills').insert({
              student_id: student.id,
              jenis_tagihan: jenisTagihan,
              nominal: nominal,
              tipe_periode: 'Sekali Selama Sekolah', // Default piutang masa lalu
              status: 'unpaid'
            })

            if (insertError) {
              errors.push(`Gagal insert untuk NISN ${nisn}: ${insertError.message}`)
            } else {
              insertedCount++
            }
          }

          setMessage({ type: 'success', text: `Import selesai. Berhasil: ${insertedCount} tagihan. ${errors.length > 0 ? 'Beberapa baris gagal (lihat console)' : ''}` })
          if (errors.length > 0) console.error("Import Errors:", errors)
          fetchData()

        } catch (err: any) {
          setMessage({ type: 'error', text: 'Error memproses file excel: ' + err.message })
        } finally {
          setSubmitting(false)
          e.target.value = '' // reset input
        }
      }
      reader.readAsBinaryString(file)
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error: ' + err.message })
      setSubmitting(false)
    }
  }

  // Derived Stats
  const totalAktif = bills.length
  const totalBelumBayar = bills.filter(b => b.status === 'unpaid').length
  const totalLunas = bills.filter(b => b.status === 'paid').length
  
  const uniqueAngkatans = useMemo(() => {
    const angkatans = bills.map(b => b.students?.angkatan).filter(Boolean) as string[]
    return Array.from(new Set(angkatans)).sort((a, b) => b.localeCompare(a))
  }, [bills])

  const filteredBills = bills.filter(b => {
    const matchName = b.students?.nama.toLowerCase().includes(searchName.toLowerCase()) || b.students?.nisn.includes(searchName)
    const matchStatus = filterStatus === 'all' ? true : b.status === filterStatus
    const matchAngkatan = filterAngkatan === 'all' ? true : b.students?.angkatan === filterAngkatan
    return matchName && matchStatus && matchAngkatan
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Tagihan Lama (Alumni)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola tagihan dan piutang dari siswa yang sudah lulus.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Piutang Alumni</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-2">{totalAktif}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Belum Lunas</p>
                <h3 className="text-3xl font-bold text-red-600 mt-2">{totalBelumBayar}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                <span className="font-bold text-lg">!</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Sudah Lunas</p>
                <h3 className="text-3xl font-bold text-emerald-600 mt-2">{totalLunas}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Piutang Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Piutang Alumni</CardTitle>
          <CardDescription>Upload file Excel untuk mencatat piutang lama alumni secara massal.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Button variant="outline" onClick={handleDownloadTemplate} disabled={submitting}>
              <Download className="w-4 h-4 mr-2" />
              Unduh Template
            </Button>
            <div className="relative w-full sm:w-auto">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                disabled={submitting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Button disabled={submitting} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                {submitting ? 'Memproses...' : 'Upload Data Piutang'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Tagihan Alumni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari berdasarkan nama / NISN..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <select
              value={filterAngkatan}
              onChange={(e) => setFilterAngkatan(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Semua Angkatan</option>
              {uniqueAngkatans.map(a => (
                <option key={a} value={a}>Angkatan {a}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="unpaid">Belum Lunas</option>
              <option value="paid">Lunas</option>
              <option value="partial">Bayar Sebagian</option>
            </select>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Siswa</th>
                  <th className="px-4 py-3">Jenis Tagihan</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground animate-pulse">Memuat data...</td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada tagihan alumni yang ditemukan.</td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{bill.students?.nama}</div>
                        <div className="text-xs text-slate-500">NISN: {bill.students?.nisn} | Akt: {bill.students?.angkatan}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{bill.jenis_tagihan}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits:0 }).format(bill.nominal)}</div>
                        {bill.status === 'partial' && (
                          <div className="text-[10px] text-red-500 font-bold mt-1">
                            Sisa: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits:0 }).format(bill.nominal - (bill.nominal_terbayar || 0))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase
                          ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                            bill.status === 'partial' ? 'bg-amber-100 text-amber-700' : 
                            'bg-red-100 text-red-700'}`}>
                          {bill.status === 'paid' ? 'Lunas' : bill.status === 'partial' ? 'Sebagian' : 'Belum Lunas'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {bill.status !== 'paid' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => handleBayarManual(bill)}
                            disabled={submitting}
                          >
                            Bayar Manual
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
