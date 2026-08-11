import { forwardRef, useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'

export interface KwitansiData {
  id: string
  nama: string
  nisn: string
  jenis_tagihan: string
  nominal: number
  tanggal_bayar: string
  nomor_kwitansi: string
}

interface KwitansiPrintProps {
  data: KwitansiData | null
}

const KwitansiPrint = forwardRef<HTMLDivElement, KwitansiPrintProps>(({ data }, ref) => {
  const [adminName, setAdminName] = useState('Ayu Siti Fatimah')

  useEffect(() => {
    async function fetchAdmin() {
      const { data: admin } = await supabase
        .from('admin_profiles')
        .select('full_name')
        .in('role', ['bendahara', 'admin'])
        .limit(1)
        .single()
      
      if (admin?.full_name) {
        setAdminName(admin.full_name)
      }
    }
    fetchAdmin()
  }, [])

  if (!data) return null

  // Format currency
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div ref={ref} className="hidden print:block print:p-8 print:w-full print:bg-white print:text-black">
      <div className="border-4 border-double border-gray-800 p-8">
        
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img src="/logo.png" alt="Logo" className="w-14 h-14 object-contain" />
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider">Kwitansi Pembayaran</h1>
              <h2 className="text-xl font-semibold">MTs KH A Wahab Muhsin</h2>
              <p className="text-sm">Kp. Bageur, Sukarapih, Sukarame, Kab. Tasikmalaya</p>
            </div>
          </div>
        </div>

        {/* Kwitansi Info */}
        <div className="flex justify-between mb-4 text-sm font-semibold">
          <div>No. Kwitansi: {data.nomor_kwitansi || '-'}</div>
          <div>Tanggal: {formatDate(data.tanggal_bayar)}</div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <table className="w-full text-base">
            <tbody>
              <tr>
                <td className="py-3 w-1/4 align-top">Telah terima dari</td>
                <td className="py-3 w-4 align-top">:</td>
                <td className="py-3 font-semibold text-lg">{data.nama} (NISN: {data.nisn})</td>
              </tr>
              <tr>
                <td className="py-3 align-top">Uang sejumlah</td>
                <td className="py-3 align-top">:</td>
                <td className="py-3">
                  <div className="bg-gray-200 px-4 py-2 inline-block font-bold text-xl italic tracking-wide">
                    {formatRupiah(data.nominal)}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="py-3 align-top">Untuk pembayaran</td>
                <td className="py-3 align-top">:</td>
                <td className="py-3 font-medium capitalize">{data.jenis_tagihan}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Signatures */}
        <div className="flex justify-between text-sm mt-8 pt-4 break-inside-avoid">
          <div className="text-center">
            <p className="mb-20 invisible">Mengetahui,</p>
            <p className="font-semibold border-b border-black inline-block px-8 pb-1 mb-1">Penyetor</p>
            <p>{data.nama}</p>
          </div>
          <div className="text-center flex flex-col items-center">
            <p className="mb-2">Tasikmalaya, {formatDate(data.tanggal_bayar)}</p>
            <div className="mb-2 bg-white p-2 border border-slate-200 rounded-lg inline-block">
              <QRCodeSVG 
                value={`${window.location.origin}/verify/kwitansi/${data.id}`} 
                size={96}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-[10px] text-slate-500 mb-2">Scan untuk Verifikasi Digital</p>
            <p className="font-semibold border-b border-black inline-block px-4 pb-1 mb-1">{adminName}</p>
            <p className="text-xs text-slate-600">Bendahara / Penerima</p>
          </div>
        </div>
        {/* Footer Disclaimer */}
        <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center text-xs text-gray-500 italic">
          Kwitansi ini ditandatangani secara digital serta dikeluarkan melalui sistem informasi keuangan MTs KH A Wahab Muhsin
        </div>
      </div>
    </div>
  )
})

KwitansiPrint.displayName = 'KwitansiPrint'

export default KwitansiPrint
