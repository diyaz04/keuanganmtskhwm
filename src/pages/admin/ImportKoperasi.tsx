import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, FileSpreadsheet, UploadCloud, AlertCircle, Calendar, RefreshCw, History, UserCheck, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

interface ParsedRow {
  id_pegawai: string
  nama_pegawai: string
  simpanan_pokok: number
  simpanan_wajib: number
  simpanan_sukarela: number
  cicilan_pinjaman: number
  jasa_pinjaman: number
  total_via_transfer: number
  sosial_via_cash: number
  total_keseluruhan: number
  total_potongan_gaji: number
  matched_employee_id?: string
  status: 'matched' | 'not_found'
}

export default function ImportKoperasi() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import')
  
  // Import State
  const [periode, setPeriode] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [dbEmployees, setDbEmployees] = useState<any[]>([])

  // History State
  const [viewPeriode, setViewPeriode] = useState('')
  const [historyLogs, setHistoryLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [importedRows, setImportedRows] = useState<any[]>([])
  const [loadingImported, setLoadingImported] = useState(false)

  // Set default periods
  useEffect(() => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const currentPeriode = `${now.getFullYear()}-${month}`
    setPeriode(currentPeriode)
    setViewPeriode(currentPeriode)
  }, [])

  // Load history data when viewPeriode changes
  useEffect(() => {
    if (viewPeriode) {
      fetchHistoryAndData(viewPeriode)
    }
  }, [viewPeriode])

  const fetchHistoryAndData = async (targetPeriod: string) => {
    if (!targetPeriod) return
    
    // 1. Fetch History Logs (Koperasi uploads history)
    setLoadingLogs(true)
    try {
      const { data, error } = await supabase
        .from('koperasi_uploads')
        .select(`
          id,
          periode,
          file_url,
          created_at,
          status,
          uploaded_by,
          admin_profiles:uploaded_by (nama)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setHistoryLogs(data || [])
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoadingLogs(false)
    }

    // 2. Fetch Imported Rows (Detailed payroll deductions of previous month)
    setLoadingImported(true)
    try {
      // Get deduction types for cooperative
      const { data: dedTypes } = await supabase
        .from('deduction_types')
        .select('id, nama')
        .in('nama', [
          'Simpanan Pokok',
          'Simpanan Wajib',
          'Simpanan Sukarela',
          'Cicilan Pinjaman',
          'Jasa Pinjaman',
          'Sosial Via Cash'
        ])
      
      if (!dedTypes || dedTypes.length === 0) {
        setImportedRows([])
        return
      }
      
      const typeIds = dedTypes.map(t => t.id)
      const typeIdToName = new Map(dedTypes.map(t => [t.id, t.nama]))

      // Fetch records that have the target period
      const { data: records, error } = await supabase
        .from('payroll_records')
        .select(`
          id,
          employee_id,
          periode,
          employees (nip, nama),
          payroll_deductions (
            id,
            deduction_type_id,
            nominal
          )
        `)
        .eq('periode', targetPeriod)
      
      if (error) throw error

      const rows: any[] = []
      records?.forEach((rec: any) => {
        // filter cooperative deductions
        const copDeds = rec.payroll_deductions.filter((d: any) => typeIds.includes(d.deduction_type_id))
        if (copDeds.length > 0) {
          const simpanan_pokok = copDeds.find((d: any) => typeIdToName.get(d.deduction_type_id) === 'Simpanan Pokok')?.nominal || 0
          const simpanan_wajib = copDeds.find((d: any) => typeIdToName.get(d.deduction_type_id) === 'Simpanan Wajib')?.nominal || 0
          const simpanan_sukarela = copDeds.find((d: any) => typeIdToName.get(d.deduction_type_id) === 'Simpanan Sukarela')?.nominal || 0
          const cicilan_pinjaman = copDeds.find((d: any) => typeIdToName.get(d.deduction_type_id) === 'Cicilan Pinjaman')?.nominal || 0
          const jasa_pinjaman = copDeds.find((d: any) => typeIdToName.get(d.deduction_type_id) === 'Jasa Pinjaman')?.nominal || 0
          const sosial_via_cash = copDeds.find((d: any) => typeIdToName.get(d.deduction_type_id) === 'Sosial Via Cash')?.nominal || 0
          
          const total_potongan_gaji = simpanan_pokok + simpanan_wajib + simpanan_sukarela + cicilan_pinjaman + jasa_pinjaman + sosial_via_cash

          if (total_potongan_gaji > 0) {
            rows.push({
              nip: rec.employees?.nip || '-',
              nama: rec.employees?.nama || '-',
              simpanan_pokok,
              simpanan_wajib,
              simpanan_sukarela,
              cicilan_pinjaman,
              jasa_pinjaman,
              sosial_via_cash,
              total_potongan_gaji
            })
          }
        }
      })
      setImportedRows(rows)
    } catch (err) {
      console.error('Error fetching imported data:', err)
    } finally {
      setLoadingImported(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setParsedData([])
    }
  }

  const handleParse = async () => {
    if (!file) return
    setIsParsing(true)

    try {
      const { data: employees } = await supabase.from('employees').select('id, nip, nama, gaji_pokok, tunjangan, tunjangan_koordinator, tunjangan_walikelas, tunjangan_lomba')
      const employeeMap = new Map()
      if (employees) {
        setDbEmployees(employees)
        employees.forEach(emp => {
          if (emp.nip) employeeMap.set(emp.nip.toString().trim(), emp.id)
        })
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        const rows: ParsedRow[] = []

        const parseValue = (val: any) => {
          if (!val) return 0
          if (typeof val === 'number') return val
          const cleaned = String(val).replace(/[^0-9-]/g, '')
          return parseFloat(cleaned) || 0
        }

        jsonData.forEach((row: any) => {
          const idPegawai = (row['ID Pegawai'] || row['ID PEGAWAI'] || '').toString().trim()
          if (!idPegawai) return

          const matchedId = employeeMap.get(idPegawai)
          const rawNama = (row['Nama Pegawai'] || row['NAMA PEGAWAI'] || row['NAMA'] || row['Nama'] || '').toString().trim()

          const simpanan_pokok = parseValue(row['SIMPANAN POKOK'] || row['Simpanan Pokok'])
          const simpanan_wajib = parseValue(row['SIMPANAN WAJIB'] || row['Simpanan Wajib'])
          const simpanan_sukarela = parseValue(row['SIMPANAN SUKARELA'] || row['Simpanan Sukarela'])
          const cicilan_pinjaman = parseValue(row['CICILAN PINJAMAN'] || row['Cicilan Pinjaman'])
          const jasa_pinjaman = parseValue(row['JASA PINJAMAN'] || row['Jasa Pinjaman'])
          
          const total_via_transfer = parseValue(row['TOTAL VIA TRANSFER'] || row['Total Via Transfer'] || row['TOTAL VIA TRF'])
          const sosial_via_cash = parseValue(row['SOSIAL VIA CASH'] || row['Sosial Via Cash'])
          const total_keseluruhan = parseValue(row['TOTAL KESELURUHAN'] || row['Total Keseluruhan'])
          
          const total_potongan_gaji = simpanan_pokok + simpanan_wajib + simpanan_sukarela + cicilan_pinjaman + jasa_pinjaman + sosial_via_cash

          if (total_potongan_gaji > 0 || total_keseluruhan > 0) {
            rows.push({
              id_pegawai: idPegawai,
              nama_pegawai: rawNama,
              simpanan_pokok,
              simpanan_wajib,
              simpanan_sukarela,
              cicilan_pinjaman,
              jasa_pinjaman,
              total_via_transfer,
              sosial_via_cash,
              total_keseluruhan,
              total_potongan_gaji,
              matched_employee_id: matchedId,
              status: matchedId ? 'matched' : 'not_found'
            })
          }
        })

        setParsedData(rows)
        setIsParsing(false)
      }
      reader.readAsBinaryString(file)
    } catch (error) {
      alert('Gagal memproses file Excel.')
      setIsParsing(false)
    }
  }

  const getOrCreateDeductionType = async (nama: string): Promise<string> => {
    const { data: existing } = await supabase.from('deduction_types').select('id').eq('nama', nama).single()
    if (existing) return existing.id

    const { data: created, error } = await supabase.from('deduction_types').insert({
      nama,
      tipe: 'flat',
      default_nominal: 0
    }).select('id').single()

    if (error) throw error
    return created.id
  }

  const handleSubmit = async () => {
    if (parsedData.length === 0 || !periode) return
    if (!confirm(`Konfirmasi import data koperasi untuk periode ${periode}?`)) return

    setIsSubmitting(true)
    try {
      const dtSimpananPokok = await getOrCreateDeductionType('Simpanan Pokok')
      const dtSimpananWajib = await getOrCreateDeductionType('Simpanan Wajib')
      const dtSimpananSukarela = await getOrCreateDeductionType('Simpanan Sukarela')
      const dtCicilanPinjaman = await getOrCreateDeductionType('Cicilan Pinjaman')
      const dtJasaPinjaman = await getOrCreateDeductionType('Jasa Pinjaman')
      const dtSosialViaCash = await getOrCreateDeductionType('Sosial Via Cash')

      const matchedRows = parsedData.filter(r => r.status === 'matched')
      
      let currentIndex = 0
      for (const row of matchedRows) {
        currentIndex++
        setProgressText(`Menyimpan data ${currentIndex} dari ${matchedRows.length}...`)
        const empId = row.matched_employee_id!
        const empData = dbEmployees.find((e: any) => e.id === empId)
        const grossSalary = empData ? (Number(empData.gaji_pokok || 0) + Number(empData.tunjangan || 0) + Number(empData.tunjangan_koordinator || 0) + Number(empData.tunjangan_walikelas || 0) + Number(empData.tunjangan_lomba || 0)) : 0

        let recordId = ''
        const { data: existingRecord } = await supabase
          .from('payroll_records')
          .select('id')
          .eq('employee_id', empId)
          .eq('periode', periode)
          .single()

        if (existingRecord) {
          recordId = existingRecord.id
        } else {
          const { data: newRecord, error: recError } = await supabase
            .from('payroll_records')
            .insert({
              employee_id: empId,
              periode: periode,
              gaji_pokok: grossSalary,
              total_potongan: 0,
              gaji_bersih: grossSalary,
              status: 'draft'
            })
            .select('id')
            .single()
          
          if (recError) throw recError
          recordId = newRecord.id
        }

        const deductionsToInsert = []
        if (row.simpanan_pokok > 0) deductionsToInsert.push({ payroll_record_id: recordId, deduction_type_id: dtSimpananPokok, nominal: row.simpanan_pokok })
        if (row.simpanan_wajib > 0) deductionsToInsert.push({ payroll_record_id: recordId, deduction_type_id: dtSimpananWajib, nominal: row.simpanan_wajib })
        if (row.simpanan_sukarela > 0) deductionsToInsert.push({ payroll_record_id: recordId, deduction_type_id: dtSimpananSukarela, nominal: row.simpanan_sukarela })
        if (row.cicilan_pinjaman > 0) deductionsToInsert.push({ payroll_record_id: recordId, deduction_type_id: dtCicilanPinjaman, nominal: row.cicilan_pinjaman })
        if (row.jasa_pinjaman > 0) deductionsToInsert.push({ payroll_record_id: recordId, deduction_type_id: dtJasaPinjaman, nominal: row.jasa_pinjaman })
        if (row.sosial_via_cash > 0) deductionsToInsert.push({ payroll_record_id: recordId, deduction_type_id: dtSosialViaCash, nominal: row.sosial_via_cash })

        if (deductionsToInsert.length > 0) {
          const { error: insError } = await supabase.from('payroll_deductions').insert(deductionsToInsert)
          if (insError) throw insError
        }

        const { data: finalDeds } = await supabase
          .from('payroll_deductions')
          .select('nominal')
          .eq('payroll_record_id', recordId)
        
        const totalPotongan = finalDeds?.reduce((sum, d) => sum + Number(d.nominal), 0) || 0
        const gajiBersih = grossSalary - totalPotongan
        
        await supabase
          .from('payroll_records')
          .update({
            gaji_pokok: grossSalary,
            total_potongan: totalPotongan,
            gaji_bersih: gajiBersih
          })
          .eq('id', recordId)
      }

      await supabase.from('koperasi_uploads').insert({
        periode,
        file_url: 'Client Parsed / ' + file?.name,
        uploaded_by: user?.id,
        status: 'processed'
      })

      alert('Berhasil! Data Koperasi telah masuk ke antrean pemotongan gaji (draft).')
      setParsedData([])
      setFile(null)
      setProgressText('')
      
      // Refresh history data
      fetchHistoryAndData(periode)

    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`)
      setProgressText('')
    } finally {
      setIsSubmitting(false)
      setProgressText('')
    }
  }

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  const downloadTemplate = () => {
    const data = [
      ['ID Pegawai', 'Nama Pegawai', 'SIMPANAN POKOK', 'SIMPANAN WAJIB', 'SIMPANAN SUKARELA', 'CICILAN PINJAMAN', 'JASA PINJAMAN', 'TOTAL VIA TRF', 'SOSIAL VIA CASH', 'TOTAL KESELURUHAN'],
      ['123456789', 'Contoh Guru', 100000, 50000, 20000, 200000, 10000, 0, 50000, 430000],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 22 }, { wch: 18 }, { wch: 20 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Koperasi')
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'Template_Import_Koperasi.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold tracking-tight">Import Koperasi</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Kelola integrasi data tagihan Koperasi Bina Sejahtera dengan antrean pemotongan gaji pegawai.
        </p>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('import')}
          className={cn(
            "py-2.5 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'import'
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          <UploadCloud className="w-4 h-4" />
          Import Baru
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "py-2.5 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'history'
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          <History className="w-4 h-4" />
          Riwayat & Data Terimport
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'import' ? (
        <div className="grid gap-6 md:grid-cols-[1fr_3fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>File Excel</CardTitle>
              <CardDescription>Pilih periode dan unggah template.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Periode Penggajian</Label>
                <Input type="month" value={periode} onChange={e => setPeriode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pilih File (.xlsx)</Label>
                <Input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
              </div>
              <Button 
                className="w-full" 
                onClick={handleParse} 
                disabled={!file || isParsing}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {isParsing ? 'Memproses...' : 'Preview Data'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full mt-2" 
                onClick={downloadTemplate}
              >
                Download Template Excel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Preview Hasil Parsing</CardTitle>
                <CardDescription>
                  Tinjau kembali data sebelum dikonfirmasi. Baris merah berarti NIP (ID Pegawai) tidak ditemukan di database.
                </CardDescription>
              </div>
              {parsedData.length > 0 && (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !parsedData.some(r => r.status === 'matched')}
                  className="bg-green-600 hover:bg-green-700 transition-all"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  {isSubmitting ? (progressText || 'Menyimpan...') : 'Konfirmasi Import'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {parsedData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-md">
                  Belum ada data. Silakan unggah dan preview file Excel.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Pegawai</th>
                        <th className="px-4 py-3 font-medium text-right">Pokok</th>
                        <th className="px-4 py-3 font-medium text-right">Wajib</th>
                        <th className="px-4 py-3 font-medium text-right">Sukarela</th>
                        <th className="px-4 py-3 font-medium text-right">Cicilan</th>
                        <th className="px-4 py-3 font-medium text-right">Jasa</th>
                        <th className="px-4 py-3 font-medium text-right text-muted-foreground">Via Transfer</th>
                        <th className="px-4 py-3 font-medium text-right text-muted-foreground">Sosial Cash</th>
                        <th className="px-4 py-3 font-medium text-right text-primary">Total Potongan Gaji</th>
                        <th className="px-4 py-3 font-medium text-right text-foreground">Total Keseluruhan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedData.map((row, i) => (
                        <tr key={i} className={row.status === 'not_found' ? 'bg-destructive/10' : 'hover:bg-muted/30'}>
                          <td className="px-4 py-2">
                            {row.status === 'matched' ? (
                              <span className="inline-flex items-center text-green-600 font-medium text-xs">
                                <Check className="w-3 h-3 mr-1" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-destructive font-medium text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" /> Gagal
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="font-semibold">{row.nama_pegawai}</div>
                            <div className="text-xs text-muted-foreground">ID: {row.id_pegawai}</div>
                          </td>
                          <td className="px-4 py-2 text-right">{formatRupiah(row.simpanan_pokok)}</td>
                          <td className="px-4 py-2 text-right">{formatRupiah(row.simpanan_wajib)}</td>
                          <td className="px-4 py-2 text-right">{formatRupiah(row.simpanan_sukarela)}</td>
                          <td className="px-4 py-2 text-right">{formatRupiah(row.cicilan_pinjaman)}</td>
                          <td className="px-4 py-2 text-right">{formatRupiah(row.jasa_pinjaman)}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{formatRupiah(row.total_via_transfer)}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{formatRupiah(row.sosial_via_cash)}</td>
                          <td className="px-4 py-2 text-right font-bold text-primary">{formatRupiah(row.total_potongan_gaji)}</td>
                          <td className="px-4 py-2 text-right font-bold text-foreground">{formatRupiah(row.total_keseluruhan)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Riwayat & Data Terimport Tab
        <div className="grid gap-6 md:grid-cols-[1.2fr_2.8fr]">
          {/* History Upload Logs card */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Log Upload Koperasi</CardTitle>
              <CardDescription>Daftar berkas Excel koperasi yang pernah berhasil diproses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingLogs ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Memuat riwayat log...</div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Belum ada riwayat upload.</div>
              ) : (
                <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                  {historyLogs.map((log) => {
                    const uploaderName = log.admin_profiles?.nama || 'System / Koperasi'
                    const date = log.created_at ? new Date(log.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'
                    
                    return (
                      <div 
                        key={log.id} 
                        onClick={() => setViewPeriode(log.periode)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1.5",
                          viewPeriode === log.periode 
                            ? "border-emerald-600 bg-emerald-50/10 shadow-sm"
                            : "border-slate-100 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded">
                            {log.periode}
                          </span>
                          <span className="inline-flex items-center text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                            Selesai
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium truncate">
                          File: {log.file_url?.replace('Client Parsed / ', '')}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold pt-1 border-t border-slate-50">
                          <span>Oleh: {uploaderName}</span>
                          <span>{date}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Imported Data for target month card */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border p-4 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Periode Data</span>
                  <Input 
                    type="month" 
                    value={viewPeriode} 
                    onChange={e => setViewPeriode(e.target.value)} 
                    className="h-8 py-1 text-xs w-36 mt-0.5" 
                  />
                </div>
              </div>

              {/* Summary details */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Pegawai</span>
                  <span className="text-sm font-extrabold text-slate-800 flex items-center justify-end gap-1.5 mt-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    {importedRows.length} Orang
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Potongan Koperasi</span>
                  <span className="text-sm font-extrabold text-emerald-700 flex items-center justify-end gap-1.5 mt-0.5">
                    <Wallet className="w-3.5 h-3.5" />
                    {formatRupiah(importedRows.reduce((sum, r) => sum + r.total_potongan_gaji, 0))}
                  </span>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => fetchHistoryAndData(viewPeriode)}
                  disabled={loadingImported}
                  className="h-8 w-8 text-slate-500 rounded-lg hover:bg-slate-100"
                >
                  <RefreshCw className={cn("w-4 h-4", loadingImported && "animate-spin")} />
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Rincian Potongan Koperasi Terimport</CardTitle>
                <CardDescription>
                  Daftar nominal pemotongan gaji koperasi yang berhasil diintegrasikan pada periode {viewPeriode}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingImported ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">Memuat rincian data...</div>
                ) : importedRows.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-md">
                    Tidak ada rincian data koperasi untuk periode {viewPeriode}. Silakan pilih periode lain atau import berkas baru.
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 font-bold">Pegawai</th>
                          <th className="px-4 py-3 font-bold text-right">Pokok</th>
                          <th className="px-4 py-3 font-bold text-right">Wajib</th>
                          <th className="px-4 py-3 font-bold text-right">Sukarela</th>
                          <th className="px-4 py-3 font-bold text-right">Cicilan</th>
                          <th className="px-4 py-3 font-bold text-right">Jasa</th>
                          <th className="px-4 py-3 font-bold text-right text-muted-foreground">Sosial Cash</th>
                          <th className="px-4 py-3 font-bold text-right text-primary">Total Potongan Gaji</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {importedRows.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <div className="font-semibold text-slate-800 text-xs md:text-sm">{row.nama}</div>
                              <div className="text-[10px] text-muted-foreground font-semibold">ID: {row.nip}</div>
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs">{formatRupiah(row.simpanan_pokok)}</td>
                            <td className="px-4 py-2.5 text-right text-xs">{formatRupiah(row.simpanan_wajib)}</td>
                            <td className="px-4 py-2.5 text-right text-xs">{formatRupiah(row.simpanan_sukarela)}</td>
                            <td className="px-4 py-2.5 text-right text-xs">{formatRupiah(row.cicilan_pinjaman)}</td>
                            <td className="px-4 py-2.5 text-right text-xs">{formatRupiah(row.jasa_pinjaman)}</td>
                            <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{formatRupiah(row.sosial_via_cash)}</td>
                            <td className="px-4 py-2.5 text-right font-extrabold text-xs text-primary">{formatRupiah(row.total_potongan_gaji)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
