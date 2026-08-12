import { forwardRef, useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'

export interface PayrollRecord {
  id: string
  periode: string
  gaji_pokok: number
  total_potongan: number
  gaji_bersih: number
  status: string
  created_at: string
  penghasilan_details?: Record<string, number>
  employees: { nama: string; nip: string }
  payroll_deductions: {
    id: string
    nominal: number
    deduction_types: { nama: string }
  }[]
}

interface SlipGajiPrintProps {
  record: PayrollRecord | null
}

const SlipGajiPrint = forwardRef<HTMLDivElement, SlipGajiPrintProps>(({ record }, ref) => {
  const [adminName, setAdminName] = useState('Ayu Siti Fatimah')

  useEffect(() => {
    async function fetchAdmin() {
      const { data } = await supabase
        .from('admin_profiles')
        .select('full_name')
        .in('role', ['bendahara', 'admin'])
        .limit(1)
        .single()
      
      if (data?.full_name) {
        setAdminName(data.full_name)
      }
    }
    fetchAdmin()
  }, [])

  if (!record) return null

  // Format currency
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  // Helper to format periode e.g. "2026-08" -> "Agustus 2026"
  const formatPeriode = (periode: string) => {
    try {
      const [year, month] = periode.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    } catch {
      return periode
    }
  }

  return (
    <div ref={ref} className="hidden print:block print:p-4 print:w-full print:bg-white print:text-black text-xs">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 12mm 8mm 12mm !important;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
      <div className="text-center border-b-2 border-black pb-1 mb-3">
        <div className="flex items-center justify-center gap-3 mb-1">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider">Slip Gaji Pegawai</h1>
            <h2 className="text-lg font-semibold">MTs KH A Wahab Muhsin</h2>
            <p className="text-xs">Kp. Bageur, Sukarapih, Sukarame, Kab. Tasikmalaya</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between mb-4">
        <div>
          <table className="text-xs">
            <tbody>
              <tr>
                <td className="py-0.5 pr-3 font-semibold">Nama</td>
                <td className="py-0.5">: {record.employees.nama}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-3 font-semibold">NIP</td>
                <td className="py-0.5">: {record.employees.nip || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <table className="text-xs">
            <tbody>
              <tr>
                <td className="py-0.5 pr-3 font-semibold">Periode</td>
                <td className="py-0.5">: {formatPeriode(record.periode)}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-3 font-semibold">Tanggal Cetak</td>
                <td className="py-0.5">: {new Date().toLocaleDateString('id-ID')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-3">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-0.5 mb-1">Penerimaan</h3>
        <table className="w-full text-xs">
          <tbody>
            {record.penghasilan_details ? (
              <>
                {Object.entries(record.penghasilan_details).map(([key, value]) => (
                  <tr key={key}>
                    <td className="py-0.5 w-2/3">{key}</td>
                    <td className="py-0.5 w-1/3 text-right">{formatRupiah(value as number)}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-300">
                  <td className="py-1 font-bold text-right pr-6">Total Penerimaan</td>
                  <td className="py-1 font-bold text-right">{formatRupiah(record.gaji_pokok)}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td className="py-1 w-2/3">Gaji Pokok & Tunjangan</td>
                <td className="py-1 w-1/3 text-right font-medium">{formatRupiah(record.gaji_pokok)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-3">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-0.5 mb-1">Potongan</h3>
        {record.payroll_deductions && record.payroll_deductions.length > 0 ? (
          <table className="w-full text-xs">
            <tbody>
              {record.payroll_deductions.map(deduction => (
                <tr key={deduction.id}>
                  <td className="py-0.5 w-2/3">{deduction.deduction_types.nama}</td>
                  <td className="py-0.5 w-1/3 text-right">{formatRupiah(deduction.nominal)}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-300">
                <td className="py-1 font-bold text-right pr-6">Total Potongan</td>
                <td className="py-1 font-bold text-right">{formatRupiah(record.total_potongan)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-gray-500 italic">Tidak ada potongan pada periode ini.</p>
        )}
      </div>

      <div className="border-t-4 border-double border-gray-800 pt-2 mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 font-bold uppercase w-2/3 text-right pr-6">Total Gaji Bersih (Diterima)</td>
              <td className="py-1.5 font-bold text-right text-base">{formatRupiah(record.gaji_bersih)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end text-xs break-inside-avoid mt-1">
        <div className="text-center flex flex-col items-center">
          <p className="mb-1">Tasikmalaya, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <div className="mb-1 bg-white p-1 border border-slate-200 rounded inline-block">
            <QRCodeSVG 
              value={`${window.location.origin}/verify/slip/${record.id}`} 
              size={80}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-[9px] text-slate-500 mb-1">Scan untuk Verifikasi Digital</p>
          <p className="font-bold border-b border-black inline-block px-3 pb-0.5 mb-0.5">{adminName}</p>
          <p className="text-[10px] text-slate-600">Bendahara MTs</p>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-dashed border-gray-300 text-center text-[10px] text-gray-500 italic">
        Slip Gaji ini ditandatangani secara digital serta dikeluarkan melalui sistem informasi keuangan MTs KH A Wahab Muhsin
      </div>
    </div>
  )
})

SlipGajiPrint.displayName = 'SlipGajiPrint'

export default SlipGajiPrint
