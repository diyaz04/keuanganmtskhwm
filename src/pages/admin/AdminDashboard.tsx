import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Printer, Download, Users, Wallet, CreditCard, Banknote } from 'lucide-react'

export default function AdminDashboard() {
  const [rawEmpCount, setRawEmpCount] = useState(0)
  const [rawStudents, setRawStudents] = useState<any[]>([])
  const [rawBills, setRawBills] = useState<any[]>([])
  const [billingTemplates, setBillingTemplates] = useState<any[]>([])
  const [rawPayroll, setRawPayroll] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('all') // angkatan
  const [activeBillTypeTab, setActiveBillTypeTab] = useState('all') // jenis tagihan
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [{ count: empCount }, { data: studentsData }, { data: billsData }, { data: payrollData }, { data: templatesData }] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'aktif'),
        supabase.from('students').select('id, angkatan'),
        supabase.from('bills').select('nominal, status, created_at, student_id, jenis_tagihan'),
        supabase.from('payroll_records').select('periode, gaji_bersih, status'),
        supabase.from('billing_templates').select('jenis_tagihan').eq('is_active', true)
      ])

      setRawEmpCount(empCount || 0)
      setRawStudents(studentsData || [])
      setRawBills(billsData || [])
      setRawPayroll(payrollData || [])
      setBillingTemplates(templatesData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Unique Cohorts list
  const uniqueCohorts = Array.from(new Set(rawStudents.map(s => s.angkatan).filter(Boolean))).sort()

  // Create student to cohort map
  const studentCohortMap = new Map<string, string>()
  rawStudents.forEach(s => {
    studentCohortMap.set(s.id, s.angkatan || 'Tidak Diketahui')
  })

  // Filter lists based on activeTab (Angkatan)
  const filteredStudents = activeTab === 'all'
    ? rawStudents
    : rawStudents.filter(s => s.angkatan === activeTab)

  const billsForAngkatan = activeTab === 'all'
    ? rawBills
    : rawBills.filter(b => studentCohortMap.get(b.student_id) === activeTab)

  // Unique Bill Types for the selected angkatan (or all)
  const uniqueBillTypesFromBills = billsForAngkatan.map(b => b.jenis_tagihan).filter(Boolean)
  const uniqueBillTypesFromTemplates = billingTemplates.map(t => t.jenis_tagihan).filter(Boolean)
  
  // Combine types from bills and templates, stripping month/year suffixes to get pure base type
  const baseBillTypes = new Set<string>()
  
  uniqueBillTypesFromBills.forEach(type => {
    const baseType = type.replace(/\s\([^)]+\)$/, '').trim()
    baseBillTypes.add(baseType)
  })
  
  uniqueBillTypesFromTemplates.forEach(type => {
    const baseType = type.replace(/\s\([^)]+\)$/, '').trim()
    baseBillTypes.add(baseType)
  })

  const uniqueBillTypes = Array.from(baseBillTypes).sort()

  // Final filter for bills based on activeBillTypeTab
  // Match bills where the base type matches the active tab
  const finalBills = activeBillTypeTab === 'all'
    ? billsForAngkatan
    : billsForAngkatan.filter(b => {
        const baseType = b.jenis_tagihan?.replace(/\s\([^)]+\)$/, '').trim()
        return baseType === activeBillTypeTab
      })

  // Calculations for current tab
  const totalSiswa = filteredStudents.length

  let tagihanMasuk = 0
  let tagihanOutstanding = 0
  const monthlyData: Record<string, { gaji: number, pendapatan: number }> = {}

  finalBills.forEach(b => {
    if (b.status === 'paid') {
      tagihanMasuk += b.nominal
      const date = new Date(b.created_at)
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyData[period]) monthlyData[period] = { gaji: 0, pendapatan: 0 }
      monthlyData[period].pendapatan += b.nominal
    } else {
      tagihanOutstanding += b.nominal
    }
  })

  // Payroll calculations
  let totalGaji = 0
  rawPayroll.forEach(pr => {
    if (pr.status === 'published' || pr.status === 'paid') {
      totalGaji += pr.gaji_bersih
      const period = pr.periode
      if (!monthlyData[period]) monthlyData[period] = { gaji: 0, pendapatan: 0 }
      if (activeTab === 'all' && activeBillTypeTab === 'all') {
        monthlyData[period].gaji += pr.gaji_bersih
      }
    }
  })

  // Convert monthly data to array and sort
  const chartData = Object.keys(monthlyData).sort().map(key => ({
    name: key,
    'Beban Gaji': monthlyData[key].gaji,
    'Pendapatan': monthlyData[key].pendapatan
  })).slice(-6)

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  const handleExportCSV = () => {
    let csv = 'Periode,Beban Gaji,Pendapatan Tagihan\n'
    chartData.forEach(row => {
      csv += `${row.name},${row['Beban Gaji'] || 0},${row['Pendapatan'] || 0}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Laporan_Keuangan_Rekap_${activeTab === 'all' ? 'Keseluruhan' : `Angkatan_${activeTab.replace(/\//g, '_')}`}.csv`
    a.click()
  }

  const handlePrint = () => {
    window.print()
  }

  const handleAngkatanChange = (tab: string) => {
    setActiveTab(tab)
    setActiveBillTypeTab('all')
  }

  return (
    <div className="space-y-8 print-container">
      {/* Tombol cetak akan di-hide saat print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Ringkasan eksekutif arus kas dan performa keuangan sekolah.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Cetak PDF
          </Button>
        </div>
      </div>
      
      {/* Kop Surat Khusus Print */}
      <div className="hidden print-header mb-8 text-center border-b pb-4">
        <div className="flex items-center justify-center gap-4 mb-2">
          <img src="/logo.png" alt="Logo" className="w-14 h-14 object-contain" />
          <div>
            <h1 className="text-2xl font-bold uppercase">Laporan Rekapitulasi Keuangan</h1>
            <h2 className="text-xl font-semibold">MTs KH A WAHAB MUHSIN</h2>
            <p className="text-sm">Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Tabs Filter Angkatan */}
      <div className="no-print border-b border-slate-200 pb-px">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
          <button
            onClick={() => handleAngkatanChange('all')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Keseluruhan
          </button>
          {uniqueCohorts.map(cohort => (
            <button
              key={cohort}
              onClick={() => handleAngkatanChange(cohort)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === cohort
                  ? 'border-emerald-600 text-emerald-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Angkatan {cohort}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Filter Jenis Tagihan */}
      {uniqueBillTypes.length > 0 && (
        <div className="no-print border-b border-slate-100 pb-px -mt-4 mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
            <button
              onClick={() => setActiveBillTypeTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                activeBillTypeTab === 'all'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Jenis Tagihan
            </button>
            {uniqueBillTypes.map(type => (
              <button
                key={type}
                onClick={() => setActiveBillTypeTab(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                  activeBillTypeTab === type
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Memuat data analitik...</div>
      ) : (
        <>
          {activeTab === 'all' ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-[10px] sm:text-sm font-medium text-primary">Beban Gaji Terbayar</CardTitle>
                  <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="text-sm sm:text-2xl font-bold text-primary">{formatRupiah(totalGaji)}</div>
                  <p className="text-[8px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Akumulasi seluruh periode</p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-[10px] sm:text-sm font-medium text-green-700">Tagihan Masuk (Lunas)</CardTitle>
                  <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="text-sm sm:text-2xl font-bold text-green-700">{formatRupiah(tagihanMasuk)}</div>
                  <p className="text-[8px] sm:text-xs text-green-600/80 mt-0.5 sm:mt-1 truncate">
                    {activeBillTypeTab === 'all' ? 'Pendapatan SPP & Uang Pangkal' : `Pendapatan khusus ${activeBillTypeTab}`}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-[10px] sm:text-sm font-medium text-amber-700">Piutang / Outstanding</CardTitle>
                  <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="text-sm sm:text-2xl font-bold text-amber-700">{formatRupiah(tagihanOutstanding)}</div>
                  <p className="text-[8px] sm:text-xs text-amber-600/80 mt-0.5 sm:mt-1 truncate">
                    {activeBillTypeTab === 'all' ? 'Tagihan siswa yang belum dibayar' : `Tagihan ${activeBillTypeTab} belum dibayar`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-[10px] sm:text-sm font-medium">Populasi Aktif</CardTitle>
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="text-sm sm:text-2xl font-bold">{totalSiswa} Siswa</div>
                  <p className="text-[8px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{rawEmpCount} Guru & Staf Aktif</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-[10px] sm:text-sm font-medium text-green-700">Tagihan Masuk (Lunas)</CardTitle>
                  <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="text-sm sm:text-2xl font-bold text-green-700">{formatRupiah(tagihanMasuk)}</div>
                  <p className="text-[8px] sm:text-xs text-green-600/80 mt-0.5 sm:mt-1 truncate">
                    {activeBillTypeTab === 'all' 
                      ? `Pendapatan khusus angkatan ${activeTab}`
                      : `Pendapatan ${activeBillTypeTab}`
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-[10px] sm:text-sm font-medium text-amber-700">Piutang / Outstanding</CardTitle>
                  <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="text-sm sm:text-2xl font-bold text-amber-700">{formatRupiah(tagihanOutstanding)}</div>
                  <p className="text-[8px] sm:text-xs text-amber-600/80 mt-0.5 sm:mt-1 truncate">
                    {activeBillTypeTab === 'all' 
                      ? `Tagihan belum bayar angkatan ${activeTab}`
                      : `Tagihan ${activeBillTypeTab} belum lunas`
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="col-span-2 md:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-[10px] sm:text-sm font-medium">Populasi Angkatan {activeTab}</CardTitle>
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="text-sm sm:text-2xl font-bold">{totalSiswa} Siswa</div>
                  <p className="text-[8px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">Jumlah terdaftar angkatan {activeTab}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-1">
            <Card className="h-[450px] flex flex-col">
              <CardHeader>
                <CardTitle>
                  {activeTab === 'all' 
                    ? 'Arus Kas Bulanan (6 Bulan Terakhir)' 
                    : `Arus Kas Masuk Bulanan - Angkatan ${activeTab} ${activeBillTypeTab !== 'all' ? `(${activeBillTypeTab})` : ''} (6 Bulan Terakhir)`}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'all'
                    ? `Perbandingan beban pengeluaran (gaji) dengan pendapatan tagihan${activeBillTypeTab !== 'all' ? ` (${activeBillTypeTab})` : ''}.`
                    : `Pendapatan tagihan masuk lunas dari siswa angkatan ${activeTab}.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 pb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(val) => `Rp ${val / 1000000}M`} />
                    <Tooltip 
                      formatter={(value: any) => formatRupiah(Number(value) || 0)}
                      cursor={{fill: 'rgba(0,0,0,0.05)'}}
                    />
                    <Legend />
                    <Bar dataKey="Pendapatan" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    {activeTab === 'all' && (
                      <Bar dataKey="Beban Gaji" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Global Style overrides for Print Mode */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* Ensure charts render properly in PDF */
          .recharts-responsive-container {
            width: 100% !important;
            height: 350px !important;
          }
        }
      `}</style>
    </div>
  )
}
