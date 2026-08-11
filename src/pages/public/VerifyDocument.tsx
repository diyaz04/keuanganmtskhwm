import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeCheck, AlertCircle, Calendar } from 'lucide-react'

export default function VerifyDocument() {
  const { type, id } = useParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verifyData() {
      if (!id || !type) {
        setError('Parameter tidak valid')
        setLoading(false)
        return
      }

      try {
        if (type === 'slip') {
          // Fetch payroll_records
          const { data: record, error: recError } = await supabase
            .from('payroll_records')
            .select(`
              *,
              employees ( nama, nip, posisi, pangkat_golongan )
            `)
            .eq('id', id)
            .single()

          if (recError || !record) {
            setError('Slip gaji tidak ditemukan atau tidak valid')
          } else {
            setData({ ...record, docType: 'slip' })
          }
        } else if (type === 'kwitansi') {
          // Fetch student_payments
          const { data: payment, error: payError } = await supabase
            .from('student_payments')
            .select(`
              *,
              students ( nama, nisn, kelas )
            `)
            .eq('id', id)
            .single()

          if (payError || !payment) {
            setError('Kwitansi pembayaran tidak ditemukan atau tidak valid')
          } else {
            setData({ ...payment, docType: 'kwitansi' })
          }
        } else {
          setError('Tipe dokumen tidak didukung')
        }
      } catch (err: any) {
        setError('Terjadi kesalahan koneksi saat verifikasi')
      } finally {
        setLoading(false)
      }
    }

    verifyData()
  }, [type, id])

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const d = new Date(dateString)
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
    return d.toLocaleDateString('id-ID', options)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">Memverifikasi Dokumen Digital...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
        <Card className="w-full max-w-md border-red-200 shadow-lg">
          <CardHeader className="bg-red-50 border-b border-red-100 rounded-t-xl text-center pb-8 pt-8">
            <div className="mx-auto bg-red-100 w-20 h-20 flex items-center justify-center rounded-full mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-700">Verifikasi Gagal</CardTitle>
            <p className="text-red-600/80 mt-2">{error}</p>
          </CardHeader>
          <CardContent className="pt-6 flex justify-center">
            <Link 
              to="/" 
              className="text-primary hover:underline font-medium text-sm"
            >
              Kembali ke Beranda
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center py-10 px-4">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 gap-3">
        <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
        <div className="text-center">
          <h1 className="font-bold text-xl text-slate-800">Sistem Keuangan MTs</h1>
          <p className="text-sm text-slate-500">KH A Wahab Muhsin</p>
        </div>
      </div>

      <Card className="w-full max-w-lg shadow-xl overflow-hidden border-0 ring-1 ring-slate-900/5">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center text-white">
          <div className="mx-auto bg-white/20 w-24 h-24 flex items-center justify-center rounded-full mb-4 ring-4 ring-white/30">
            <BadgeCheck className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">TERVERIFIKASI</h2>
          <p className="text-emerald-50 font-medium">Dokumen Resmi dan Sah</p>
        </div>

        <CardContent className="p-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
            <p className="text-sm text-slate-600 text-center leading-relaxed">
              Dokumen ini diterbitkan dan ditandatangani secara digital oleh sistem keuangan 
              <strong className="text-slate-800 font-semibold"> MTs KH A Wahab Muhsin</strong>. Data di bawah ini terjamin keasliannya.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Detail Transaksi
            </h3>
            
            {data.docType === 'slip' ? (
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-slate-500">Jenis Dokumen</div>
                <div className="font-semibold text-right">Slip Gaji</div>
                
                <div className="text-slate-500">Periode</div>
                <div className="font-semibold text-right">{data.periode}</div>
                
                <div className="text-slate-500">Nama Pegawai</div>
                <div className="font-semibold text-right">{data.employees?.nama}</div>
                
                <div className="text-slate-500">ID / NIP</div>
                <div className="font-semibold text-right">{data.employees?.nip || '-'}</div>

                <div className="col-span-2 my-2 border-t border-dashed border-slate-200"></div>

                <div className="text-slate-500">Gaji Pokok & Tunjangan</div>
                <div className="font-semibold text-right">{formatRupiah(data.gaji_pokok)}</div>

                <div className="text-slate-500">Total Potongan</div>
                <div className="font-semibold text-right text-red-600">-{formatRupiah(data.total_potongan)}</div>

                <div className="col-span-2 my-1 border-t border-slate-200"></div>

                <div className="text-slate-500 font-bold">Gaji Bersih Diterima</div>
                <div className="font-bold text-right text-emerald-700 text-lg">{formatRupiah(data.gaji_bersih)}</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-slate-500">Jenis Dokumen</div>
                <div className="font-semibold text-right">Kwitansi Pembayaran</div>
                
                <div className="text-slate-500">Nomor Kwitansi</div>
                <div className="font-mono font-semibold text-right bg-slate-100 px-2 py-0.5 rounded ml-auto text-xs">{data.nomor_kwitansi || data.id.substring(0,8).toUpperCase()}</div>
                
                <div className="text-slate-500">Tanggal Bayar</div>
                <div className="font-semibold text-right">{formatDate(data.tanggal_bayar)}</div>
                
                <div className="text-slate-500">Nama Siswa</div>
                <div className="font-semibold text-right">{data.students?.nama}</div>
                
                <div className="text-slate-500">Keterangan</div>
                <div className="font-semibold text-right capitalize">{data.payment_type || 'Tagihan'} - {data.keterangan || '-'}</div>

                <div className="col-span-2 my-2 border-t border-slate-200"></div>

                <div className="text-slate-500 font-bold">Total Pembayaran</div>
                <div className="font-bold text-right text-emerald-700 text-lg">{formatRupiah(data.jumlah)}</div>
              </div>
            )}
          </div>
        </CardContent>
        
        <div className="bg-slate-50 p-4 border-t text-center text-xs text-slate-500">
          Scan QR Code di dokumen cetak akan selalu mengarah ke halaman validasi resmi ini.
        </div>
      </Card>
    </div>
  )
}
