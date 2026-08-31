import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  PlayCircle, CheckCircle2, Search, Settings, 
  FileText, UploadCloud, Send, ArrowRight, Users, Database,
  Download, X
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface PayrollRecord {
  id: string
  employee_id: string
  periode: string
  gaji_pokok: number
  total_potongan: number
  gaji_bersih: number
  status: 'draft' | 'published' | 'paid'
  employees: {
    nama: string
    nip: string
    no_rekening: string | null
  }
}

export default function Penggajian() {
  const [periode, setPeriode] = useState('')
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [activeStep, setActiveStep] = useState<number>(1)

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportType, setExportType] = useState<'all' | 'rekening'>('all')
  const [biayaAdmin, setBiayaAdmin] = useState<number>(3000)

  // Preview Modal State
  const [showEmployeeDataModal, setShowEmployeeDataModal] = useState(false)
  const [previewEmployees, setPreviewEmployees] = useState<any[]>([])
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const handleOpenPreview = async () => {
    setShowEmployeeDataModal(true)
    setIsPreviewLoading(true)
    const { data } = await supabase
      .from('employees')
      .select(`
        *,
        employee_deductions (
          custom_nominal,
          deduction_types ( nama, tipe )
        )
      `)
      .eq('status', 'aktif')
      .order('nama', { ascending: true })
    
    if (data) {
      setPreviewEmployees(data)
    }
    setIsPreviewLoading(false)
  }

  useEffect(() => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    setPeriode(`${now.getFullYear()}-${month}`)
  }, [])

  useEffect(() => {
    if (periode) fetchRecords()
  }, [periode])

  const fetchRecords = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('payroll_records')
      .select(`
        id, employee_id, periode, gaji_pokok, total_potongan, gaji_bersih, status, penghasilan_details,
        employees ( nama, nip, no_rekening )
      `)
      .eq('periode', periode)
    
    if (!error && data) {
      setRecords(data as any)
      
      // Auto-determine step based on data
      const draftsCount = data.filter(r => r.status === 'draft').length
      const generatedDraftsCount = data.filter(r => r.status === 'draft' && r.penghasilan_details !== null).length
      const publishedCount = data.filter(r => r.status === 'published' || r.status === 'paid').length
      
      if (data.length === 0) {
        setActiveStep(1)
      } else if (draftsCount > 0 && generatedDraftsCount === 0) {
        // Drafts exist but they haven't been run through the 'Generate Draft' step (e.g. only imported from Koperasi)
        setActiveStep(2)
      } else if (draftsCount > 0 && generatedDraftsCount > 0) {
        setActiveStep(3)
      } else if (publishedCount > 0) {
        setActiveStep(4)
      }
    }
    setIsLoading(false)
  }

  const handleGenerate = async () => {
    if (!periode) return
    if (!confirm(`Generate draft payroll untuk periode ${periode}? Ini akan menarik gaji dan potongan terbaru dari master data.`)) return

    setIsGenerating(true)
    try {
      // 1. Fetch active employees
      const { data: employees, error: errEmp } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'aktif')
      if (errEmp || !employees) throw errEmp

      // 2. Fetch all current employee deductions
      const { data: allDeductions, error: errDed } = await supabase
        .from('employee_deductions')
        .select(`
          id, employee_id, deduction_type_id, custom_nominal,
          deduction_types ( id, tipe )
        `)
      if (errDed) throw errDed

      // Fetch cooperative deduction type IDs once to preserve them on generate/sync
      const { data: copTypes } = await supabase
        .from('deduction_types')
        .select('id')
        .in('nama', [
          'Simpanan Pokok',
          'Simpanan Wajib',
          'Simpanan Sukarela',
          'Cicilan Pinjaman',
          'Jasa Pinjaman',
          'Sosial Via Cash'
        ])
      const copTypeIds = copTypes?.map(t => t.id) || []

      // 3. For each employee, generate or update payroll_records
      for (const emp of employees) {
        let recordId = ''
        let currentStatus = 'draft'
        
        const { data: existingRecord } = await supabase
          .from('payroll_records')
          .select('id, status')
          .eq('employee_id', emp.id)
          .eq('periode', periode)
          .single()

        if (existingRecord) {
          recordId = existingRecord.id
          currentStatus = existingRecord.status
        }

        if (currentStatus !== 'draft' && currentStatus !== 'pending') {
           if (currentStatus === 'published' || currentStatus === 'paid') continue
        }

        const grossSalary = emp.gaji_pokok + emp.tunjangan + (emp.tunjangan_koordinator || 0) + (emp.tunjangan_walikelas || 0) + (emp.tunjangan_lomba || 0)

        const penghasilanDetails: Record<string, number> = {
          'Gaji Pokok': emp.gaji_pokok
        }
        if (emp.tunjangan) penghasilanDetails['Tunjangan'] = emp.tunjangan
        if (emp.tunjangan_koordinator) penghasilanDetails['Tunjangan Koordinator'] = emp.tunjangan_koordinator
        if (emp.tunjangan_walikelas) penghasilanDetails['Tunjangan Walikelas'] = emp.tunjangan_walikelas
        if (emp.tunjangan_lomba) penghasilanDetails['Tunjangan Lomba'] = emp.tunjangan_lomba

        // Buat record draft jika belum ada
        if (!recordId) {
          const { data: newRec, error: errNew } = await supabase
            .from('payroll_records')
            .insert({
              employee_id: emp.id,
              periode,
              gaji_pokok: grossSalary,
              penghasilan_details: penghasilanDetails,
              total_potongan: 0,
              gaji_bersih: 0,
              status: 'draft'
            })
            .select('id')
            .single()
          if (errNew) throw errNew
          recordId = newRec.id
        } else {
          // Update penghasilan jika record sudah ada (misalnya dibuat oleh koperasi import)
          await supabase
            .from('payroll_records')
            .update({
              gaji_pokok: grossSalary,
              penghasilan_details: penghasilanDetails
            })
            .eq('id', recordId)
        }

        // 1. Get current deductions for this payroll record from the database
        const { data: currentDeds } = await supabase
          .from('payroll_deductions')
          .select('id, deduction_type_id')
          .eq('payroll_record_id', recordId)

        // 2. Identify and delete only the non-cooperative master deductions, preserving cooperative deductions
        const nonCopDeds = currentDeds?.filter(d => !copTypeIds.includes(d.deduction_type_id)) || []
        const nonCopDedIds = nonCopDeds.map(d => d.id)

        if (nonCopDedIds.length > 0) {
          const { error: delError } = await supabase
            .from('payroll_deductions')
            .delete()
            .in('id', nonCopDedIds)
          if (delError) throw delError
        }

        // 3. Get latest master deductions for the employee
        const empDeds = (allDeductions as any[]).filter(d => d.employee_id === emp.id)

        // 4. Insert the latest master deductions
        const deductionsToInsert = []
        for (const ed of empDeds) {
          let nominalPotongan = ed.custom_nominal
          if (ed.deduction_types.tipe === 'persen') {
            nominalPotongan = emp.gaji_pokok * (ed.custom_nominal / 100)
          }
          if (nominalPotongan > 0) {
            deductionsToInsert.push({
              payroll_record_id: recordId,
              deduction_type_id: ed.deduction_type_id,
              nominal: nominalPotongan
            })
          }
        }

        if (deductionsToInsert.length > 0) {
          const { error: insError } = await supabase.from('payroll_deductions').insert(deductionsToInsert)
          if (insError) throw insError
        }

        // 5. Query all final deductions (both master & cooperative) to calculate total
        const { data: finalDeds } = await supabase
          .from('payroll_deductions')
          .select('nominal')
          .eq('payroll_record_id', recordId)
        
        const totalPotongan = finalDeds?.reduce((sum, d) => sum + Number(d.nominal), 0) || 0
        const gajiBersih = grossSalary - totalPotongan

        await supabase
          .from('payroll_records')
          .update({
            total_potongan: totalPotongan,
            gaji_bersih: gajiBersih
          })
          .eq('id', recordId)
      }

      alert('Berhasil generate payroll!')
      fetchRecords()
      setActiveStep(3)

    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!periode) return
    if (!confirm(`Anda yakin ingin mempublikasikan gaji periode ${periode}? Setelah dipublish, slip gaji akan muncul di portal guru.`)) return

    setIsPublishing(true)
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({ status: 'published' })
        .eq('periode', periode)
        .eq('status', 'draft')

      if (error) throw error
      alert('Berhasil! Slip gaji telah dipublikasikan ke portal guru.')
      fetchRecords()
      setActiveStep(4)
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setIsPublishing(false)
    }
  }

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  const draftsCount = records.filter(r => r.status === 'draft').length
  const publishedCount = records.filter(r => r.status === 'published' || r.status === 'paid').length

  const handleExportExcel = () => {
    let filteredRecords = records;
    if (exportType === 'rekening') {
      filteredRecords = records.filter(r => r.employees.no_rekening && r.employees.no_rekening.trim() !== '')
    }

    // Format month for header (e.g. 2026-07 -> JULI 2026)
    const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const [year, monthStr] = periode.split('-');
    const monthName = monthNames[parseInt(monthStr, 10) - 1];
    const headerPeriode = `" BULAN ${monthName} ${year} "`;

    const data: any[][] = [];
    data.push(['DAFTAR PENYERAHAN HONORARIUM GURU', null, null, null, null, null]);
    data.push(['MADRASAH TSANAWIYAH KH.A.WAHAB MUHSIN', null, null, null, null, null]);
    data.push([headerPeriode, null, null, null, null, null]);
    data.push([]);
    
    // Headers
    data.push(['No', 'Nomor Rekening', 'Nama Guru', 'Jumlah Uang', 'Biaya', 'Bersih']);
    
    // Rows
    filteredRecords.forEach((r, idx) => {
      const bersih = r.gaji_bersih - biayaAdmin;
      data.push([
        idx + 1,
        r.employees.no_rekening || '-',
        r.employees.nama,
        r.gaji_bersih,
        biayaAdmin,
        bersih
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Merge titles across columns
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });
    ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 5 } });

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 20 },  // No Rek
      { wch: 30 },  // Nama
      { wch: 15 },  // Jumlah
      { wch: 10 },  // Biaya
      { wch: 15 }   // Bersih
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gaji');
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Honorarium_Guru_${periode}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
  }

  const steps = [
    { id: 1, title: 'Persiapan', icon: Settings },
    { id: 2, title: 'Draft Gaji', icon: FileText },
    { id: 3, title: 'Koperasi', icon: UploadCloud },
    { id: 4, title: 'Publish', icon: Send },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Generate Penggajian</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Ikuti tahapan di bawah ini untuk memproses gaji dan potongan bulanan.
          </p>
        </div>
        <div className="w-48">
          <Label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">Pilih Periode</Label>
          <Input type="month" value={periode} onChange={e => setPeriode(e.target.value)} className="font-semibold text-primary" />
        </div>
      </div>

      {/* Stepper UI */}
      <div className="relative border-b pb-8">
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200 hidden md:block z-0"></div>
        <div className="grid grid-cols-4 gap-1 relative z-10">
          {steps.map((step) => {
            const Icon = step.icon
            const isActive = activeStep === step.id
            const isCompleted = activeStep > step.id
            
            return (
              <div 
                key={step.id} 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => setActiveStep(step.id)}
              >
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-200
                  ${isActive ? 'bg-primary border-primary text-white ring-4 ring-primary/20' : 
                    isCompleted ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 
                    'bg-white border-slate-200 text-slate-400 group-hover:border-primary/50'}
                `}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : <Icon className="w-4 h-4 md:w-5 md:h-5" />}
                </div>
                <div className={`mt-2 text-[10px] md:text-sm font-bold text-center leading-tight
                  ${isActive ? 'text-primary' : isCompleted ? 'text-slate-700' : 'text-slate-400'}
                `}>
                  Step {step.id}
                  <div className="text-[9px] md:text-xs font-medium opacity-80 mt-0.5">{step.title}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_3fr] pt-4">
        {/* Konten Berdasarkan Step Aktif */}
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {steps.find(s => s.id === activeStep)?.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Pastikan data Gaji Pokok, Tunjangan, dan Master Potongan pegawai sudah benar sebelum membuat Draft.
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={handleOpenPreview}>
                      <Users className="w-4 h-4 mr-2 text-blue-600" /> Cek Pratinjau Data Pegawai
                    </Button>
                    <Link to="/admin/potongan" className={buttonVariants({ variant: "outline", className: "w-full justify-start flex items-center" })}>
                      <Database className="w-4 h-4 mr-2 text-indigo-600" /> Cek Master Potongan
                    </Link>
                  </div>
                  <Button className="w-full mt-4" onClick={() => setActiveStep(2)}>
                    Lanjut ke Draft <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sistem akan membuat Draft gaji untuk periode <strong className="text-slate-700">{periode}</strong> berdasarkan Master Data saat ini.
                  </p>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12" 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !periode}
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    {isGenerating ? 'Memproses...' : 'Generate Draft Gaji'}
                  </Button>
                  {records.length > 0 && (
                    <Button variant="ghost" className="w-full" onClick={() => setActiveStep(3)}>
                      Lewati <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Apakah ada tagihan Koperasi bulan ini? Import data Koperasi agar potongannya otomatis terhitung di Draft Gaji.
                  </p>
                  <Link to="/admin/koperasi" className={buttonVariants({ variant: "outline", className: "w-full justify-start h-12 border-orange-200 hover:bg-orange-50 hover:text-orange-700 flex items-center" })}>
                    <UploadCloud className="w-5 h-5 mr-2 text-orange-500" /> Import Tagihan Koperasi
                  </Link>
                  <Button className="w-full mt-2" onClick={() => setActiveStep(4)}>
                    Sudah Selesai <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {activeStep === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Periksa kembali ringkasan di bawah. Jika sudah sesuai, publikasikan agar Slip Gaji dapat diakses oleh Guru.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-lg border text-sm mb-4">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Total Pegawai</span>
                      <span className="font-bold text-slate-700">{records.length}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Draft Siap</span>
                      <span className="font-bold text-amber-600">{draftsCount}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Sudah Publish</span>
                      <span className="font-bold text-emerald-600">{publishedCount}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-12" 
                    onClick={handlePublish} 
                    disabled={isPublishing || draftsCount === 0}
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Publish {draftsCount > 0 ? `(${draftsCount} Draft)` : ''}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabel Data Gaji */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-lg">Pratinjau Gaji ({periode})</CardTitle>
            </div>
            <div className="flex gap-2">
              {records.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(true)}>
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={fetchRecords} disabled={isLoading}>
                <Search className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-16 px-4 text-muted-foreground">
                <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <p>Belum ada data gaji untuk periode ini.</p>
                <Button variant="link" onClick={() => setActiveStep(2)}>Mulai Generate Draft</Button>
              </div>
            ) : (
              <div className="overflow-x-auto border-t">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nama Pegawai</th>
                      <th className="px-4 py-3 font-medium text-right">Penghasilan</th>
                      <th className="px-4 py-3 font-medium text-right">Potongan</th>
                      <th className="px-4 py-3 font-medium text-right">Bersih</th>
                      <th className="px-4 py-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-700">{row.employees?.nama}</div>
                          <div className="text-xs text-slate-400">NIP: {row.employees?.nip || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-600">{formatRupiah(row.gaji_pokok)}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-500">{formatRupiah(row.total_potongan)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatRupiah(row.gaji_bersih)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize
                            ${row.status === 'published' || row.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Export Data Penggajian</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="font-semibold">Filter Pegawai</Label>
                <div className="flex flex-col space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 transition-colors">
                    <input 
                      type="radio" 
                      name="exportType" 
                      value="all" 
                      checked={exportType === 'all'} 
                      onChange={() => setExportType('all')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Semua Pegawai
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 transition-colors">
                    <input 
                      type="radio" 
                      name="exportType" 
                      value="rekening" 
                      checked={exportType === 'rekening'} 
                      onChange={() => setExportType('rekening')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Hanya yang memiliki Rekening (untuk Bank)
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="biayaAdmin" className="font-semibold">Biaya Admin / Potongan Bank (opsional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Jika diisi, gaji bersih akan otomatis dikurangi nominal ini dan tercatat di kolom "Biaya".
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">Rp</span>
                  <Input 
                    id="biayaAdmin"
                    type="number" 
                    className="pl-9"
                    value={biayaAdmin} 
                    onChange={e => setBiayaAdmin(Number(e.target.value) || 0)} 
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Batal</Button>
              <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4 mr-2" /> Download Excel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Data Preview Modal */}
      {showEmployeeDataModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50/90 backdrop-blur-sm animate-in fade-in zoom-in-95">
          <div className="bg-white flex flex-col h-full w-full max-w-7xl mx-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Pratinjau Data Pegawai (Simulasi Gaji & Potongan)</h2>
              <button onClick={() => setShowEmployeeDataModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-auto p-4 bg-slate-50">
              {isPreviewLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">Memuat data pegawai...</div>
              ) : previewEmployees.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">Tidak ada pegawai aktif.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {previewEmployees.map(emp => {
                    const totalPenghasilan = emp.gaji_pokok + (emp.tunjangan||0) + (emp.tunjangan_koordinator||0) + (emp.tunjangan_walikelas||0) + (emp.tunjangan_lomba||0)
                    
                    let totalPotongan = 0
                    const potonganList = emp.employee_deductions?.map((d: any) => {
                      let nom = d.custom_nominal
                      if (d.deduction_types.tipe === 'persen') {
                        nom = emp.gaji_pokok * (d.custom_nominal / 100)
                      }
                      totalPotongan += nom
                      return { nama: d.deduction_types.nama, nom }
                    }) || []

                    return (
                      <Card key={emp.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-4 bg-white border-b">
                          <h3 className="font-bold text-lg">{emp.nama}</h3>
                          <p className="text-xs text-muted-foreground">NIP/ID: {emp.nip || '-'}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x">
                          <div className="p-4 bg-emerald-50/30">
                            <h4 className="text-sm font-semibold mb-2 text-emerald-800">Rincian Penghasilan</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between"><span>Gaji Pokok</span><span>{formatRupiah(emp.gaji_pokok)}</span></div>
                              {emp.tunjangan > 0 && <div className="flex justify-between"><span>Tunjangan</span><span>{formatRupiah(emp.tunjangan)}</span></div>}
                              {emp.tunjangan_koordinator > 0 && <div className="flex justify-between"><span>T. Koordinator</span><span>{formatRupiah(emp.tunjangan_koordinator)}</span></div>}
                              {emp.tunjangan_walikelas > 0 && <div className="flex justify-between"><span>T. Walikelas</span><span>{formatRupiah(emp.tunjangan_walikelas)}</span></div>}
                              {emp.tunjangan_lomba > 0 && <div className="flex justify-between"><span>T. Lomba</span><span>{formatRupiah(emp.tunjangan_lomba)}</span></div>}
                              <div className="flex justify-between font-bold border-t pt-1 mt-1 text-emerald-700">
                                <span>Total</span>
                                <span>{formatRupiah(totalPenghasilan)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 bg-red-50/30">
                            <h4 className="text-sm font-semibold mb-2 text-red-800">Rincian Potongan</h4>
                            <div className="space-y-1 text-sm">
                              {potonganList.length > 0 ? potonganList.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between">
                                  <span>{p.nama}</span>
                                  <span>{formatRupiah(p.nom)}</span>
                                </div>
                              )) : <div className="text-muted-foreground italic">Tidak ada potongan</div>}
                              <div className="flex justify-between font-bold border-t pt-1 mt-1 text-red-700">
                                <span>Total</span>
                                <span>{formatRupiah(totalPotongan)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-100 flex justify-between items-center text-sm">
                          <span className="font-semibold text-slate-700">Estimasi Bersih:</span>
                          <span className="font-bold text-lg text-slate-900">{formatRupiah(totalPenghasilan - totalPotongan)}</span>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
