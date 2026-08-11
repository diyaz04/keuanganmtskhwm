import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { PortalUser } from './index'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UploadCloud, CheckCircle, Clock, XCircle, Printer, Users, Landmark, Info } from 'lucide-react'
import KwitansiPrint from '@/components/KwitansiPrint'
import type { KwitansiData } from '@/components/KwitansiPrint'

interface Payment {
  id: string
  status: string
  catatan: string
  nominal_dibayar?: number
  tanggal_bayar: string
  nomor_kwitansi: string
  created_at?: string
}

interface Bill {
  id: string
  jenis_tagihan: string
  nominal: number
  nominal_terbayar?: number
  status: string
  created_at: string
  students: { nama: string, nisn: string }
  payments: Payment[]
}

interface Rekening {
  nama_bank: string | null
  no_rekening: string | null
  atas_nama: string | null
}

interface SiswaPortalProps {
  user: PortalUser
}

export default function SiswaPortal({ user }: SiswaPortalProps) {
  const [bills, setBills] = useState<Bill[]>([])
  const [rekening, setRekening] = useState<Rekening | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Payment Cart State
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set())
  const [paymentDistributions, setPaymentDistributions] = useState<Record<string, number>>({})
  const [autoDistributeTotal, setAutoDistributeTotal] = useState<string>('')
  
  // Upload State
  const [file, setFile] = useState<File | null>(null)
  const [catatan, setCatatan] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  // Kwitansi Print State
  const printComponentRef = useRef<HTMLDivElement>(null)
  const [printData, setPrintData] = useState<KwitansiData | null>(null)

  // Copy nomor rekening - removed unused variables

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 11) return 'Pagi'
    if (hour >= 11 && hour < 15) return 'Siang'
    if (hour >= 15 && hour < 18) return 'Sore'
    return 'Malam'
  }

  const getGenderFromName = (name: string): 'L' | 'P' => {
    const lowercaseName = name.toLowerCase();
    if (/\b(hj|hajah|ibu|ny|nyonya|sdri|saudari|nn|nona|siti|sri|dewi|putri|anisa|annisa|rahma|rahmawati|fitria|fitri|diah|kartika|retno|laila|wardah|halimah|mutiara|widya|ayu|mega|wulan|khadijah|fatimah|aisyah|nurul|yuni|yuliana|dina|lilis|neneng|ratna|tati|titin|yani|eneng|indri|lestari|wulandari|purnamasari|lestari|hartati|kusuma|pratiwi|novita|desy|eka|lia)\b/.test(lowercaseName)) return 'P';
    if (/\b(h|haji|bpk|bapak|sdr|saudara|mas|bung|ahmad|achmad|muhammad|mohammad|abdul|agus|budi|eko|joko|hendra|maman|dadang|asep|cecep|dodi|diki|faisal|hadi|heru|iwan|mulyono|rizal|rudi|sigit|supriadi|wawan|yudi|yusuf|zainal|diyaz|najib|muhsin|wahab|ridwan|suryono|prabowo|jokowi|susilo|bambang|dwi|tri|agung|arif|taufik|eko|aditya|bagus|chandra|denny|fajar|gunawan|indra|putra|pratama|setiawan|tri|wahyu|wibowo|yanto)\b/.test(lowercaseName)) return 'L';
    if (/(wati|ni|ty|ah|tria|tri)$/.test(lowercaseName)) return 'P';
    if (/(wan|to|ono|anto|adi|us|ur|at|din|man)$/.test(lowercaseName)) return 'L';
    return 'P';
  }

  const getTheme = () => {
    const greeting = getGreeting()
    const isMale = getGenderFromName(user.nama) === 'L'
    switch (greeting) {
      case 'Pagi': return { imgFilter: 'opacity-90 contrast-105 saturate-110', bannerBg: 'from-amber-50 via-rose-50/70 to-sky-100/80 border-amber-100/60 text-slate-800', fadeColor: 'from-amber-50 via-amber-50/40 to-transparent', imgSrc: isMale ? '/finance_hero_male_morning.jpg' : '/finance_hero_hijab_morning.jpg', titleColor: 'text-slate-800', subColor: 'text-slate-500', emoji: '🌅', badgeBg: 'bg-amber-100/60 border-amber-200 text-amber-900', badgeIconBg: 'bg-amber-500 text-white', decor: (<div className="absolute top-[-50px] right-[100px] w-48 h-48 rounded-full bg-gradient-to-tr from-amber-300/30 to-rose-200/20 blur-3xl pointer-events-none" />) }
      case 'Siang': return { imgFilter: 'brightness-105 contrast-100', bannerBg: 'from-sky-100 via-blue-50/60 to-amber-50/60 border-sky-200/50 text-slate-800', fadeColor: 'from-sky-100 via-sky-100/40 to-transparent', imgSrc: isMale ? '/finance_hero_male.jpg' : '/finance_hero_hijab.jpg', titleColor: 'text-slate-800', subColor: 'text-slate-500', emoji: '☀️', badgeBg: 'bg-sky-100/60 border-sky-200 text-sky-900', badgeIconBg: 'bg-sky-500 text-white', decor: (<><div className="absolute top-[-40px] right-[80px] w-40 h-40 rounded-full bg-amber-300/30 blur-2xl animate-pulse pointer-events-none" /><div className="absolute top-[-20px] right-[60px] w-24 h-24 rounded-full bg-yellow-400/20 blur-xl pointer-events-none" /></>) }
      case 'Sore': return { imgFilter: 'brightness-95 contrast-105 saturate-110', bannerBg: 'from-orange-50 via-rose-50/70 to-indigo-100/70 border-orange-100 text-slate-800', fadeColor: 'from-orange-50 via-orange-50/40 to-transparent', imgSrc: isMale ? '/finance_hero_male_evening.jpg' : '/finance_hero_hijab_evening.jpg', titleColor: 'text-slate-800', subColor: 'text-slate-500', emoji: '🌇', badgeBg: 'bg-orange-100/60 border-orange-200 text-orange-950', badgeIconBg: 'bg-orange-500 text-white', decor: (<div className="absolute top-[-60px] right-[120px] w-52 h-52 rounded-full bg-gradient-to-br from-orange-300/30 to-indigo-400/20 blur-3xl pointer-events-none" />) }
      case 'Malam': default: return { imgFilter: 'brightness-[70%] contrast-110 saturate-[90%] md:opacity-100', bannerBg: 'from-slate-900 via-indigo-950 to-slate-950 border-slate-800 text-white shadow-inner', fadeColor: 'from-slate-900 via-slate-900/40 to-transparent', imgSrc: isMale ? '/finance_hero_male_night.jpg' : '/finance_hero_hijab_night.jpg', titleColor: 'text-white', subColor: 'text-slate-300', emoji: '🌙', badgeBg: 'bg-white/10 border-white/20 text-slate-100', badgeIconBg: 'bg-indigo-600 text-white', decor: (<><div className="absolute top-[-30px] right-[90px] w-44 h-44 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" /><div className="absolute top-4 right-20 w-8 h-8 rounded-full bg-amber-100/80 shadow-md shadow-amber-200/20 pointer-events-none"><div className="absolute top-0.5 left-2 w-7 h-7 rounded-full bg-slate-950" /></div><div className="absolute top-12 right-40 w-1 h-1 rounded-full bg-white/80 animate-pulse pointer-events-none" /><div className="absolute top-6 right-64 w-1 h-1 rounded-full bg-white/40 animate-pulse pointer-events-none" /><div className="absolute top-16 right-56 w-1 h-1 rounded-full bg-white/60 pointer-events-none" /><div className="absolute top-24 right-36 w-1 h-1 rounded-full bg-white/90 animate-pulse pointer-events-none" /></>) }
    }
  }

  const theme = getTheme()

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-student-bills', {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setBills(data.bills || [])
      setRekening(data.rekening || null)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat tagihan')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBill = (bill: Bill) => {
    const newSelected = new Set(selectedBillIds)
    if (newSelected.has(bill.id)) {
      newSelected.delete(bill.id)
      const newDists = { ...paymentDistributions }
      delete newDists[bill.id]
      setPaymentDistributions(newDists)
    } else {
      newSelected.add(bill.id)
      const sisa = bill.nominal - (bill.nominal_terbayar || 0)
      setPaymentDistributions({ ...paymentDistributions, [bill.id]: sisa })
    }
    setSelectedBillIds(newSelected)
  }

  const handleDistributeChange = (billId: string, value: string) => {
    const num = parseFloat(value) || 0
    setPaymentDistributions({ ...paymentDistributions, [billId]: num })
  }

  const handleAutoDistribute = () => {
    let total = parseFloat(autoDistributeTotal) || 0
    if (total <= 0) return

    const newDists = { ...paymentDistributions }
    Array.from(selectedBillIds).forEach(id => {
      const bill = bills.find(b => b.id === id)
      if (!bill) return
      const sisa = bill.nominal - (bill.nominal_terbayar || 0)
      if (total >= sisa) {
        newDists[id] = sisa
        total -= sisa
      } else {
        newDists[id] = total
        total = 0
      }
    })
    setPaymentDistributions(newDists)
  }

  const totalPayment = Object.values(paymentDistributions).reduce((a, b) => a + b, 0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.size > 5 * 1024 * 1024) {
        setUploadMessage({ type: 'error', text: 'Ukuran file maksimal 5MB' })
        return
      }
      setFile(selected)
      setUploadMessage(null)
    }
  }



  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedBillIds.size === 0 || !file) return

    setIsUploading(true)
    setUploadMessage(null)

    try {
      // Step 1: Upload file directly to Cloudinary from browser (bypass Edge Function body limit)
      setUploadMessage({ type: 'info', text: 'Mengunggah bukti transfer...' })
      const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

      const cloudinaryFormData = new FormData()
      cloudinaryFormData.append('file', file)
      cloudinaryFormData.append('upload_preset', cloudinaryUploadPreset)
      cloudinaryFormData.append('folder', `payment_proofs`)

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        body: cloudinaryFormData
      })

      if (!cloudinaryRes.ok) {
        const errText = await cloudinaryRes.text()
        throw new Error(`Gagal upload gambar: ${errText}`)
      }

      const cloudinaryData = await cloudinaryRes.json()
      const buktiUrl = cloudinaryData.secure_url

      // Step 2: Build distributions array
      const distsArray = Array.from(selectedBillIds).map(id => ({
        bill_id: id,
        nominal_dibayar: paymentDistributions[id] || 0,
        catatan: catatan
      })).filter(d => d.nominal_dibayar > 0)

      if (distsArray.length === 0) {
        throw new Error('Total nominal tidak boleh nol.')
      }

      // Step 3: Call Edge Function with URL (not base64) - small payload, no body limit issue
      setUploadMessage({ type: 'info', text: 'Memproses pembayaran...' })
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const response = await fetch(`${supabaseUrl}/functions/v1/submit-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          distributions: distsArray,
          bukti_url: buktiUrl,
          file_base64: 'UPLOADED_VIA_CLIENT',
          content_type: file.type
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Gagal memproses pembayaran: ${data?.error || response.statusText}`)
      }
      
      if (data?.error) throw new Error(data.error)

      setUploadMessage({ type: 'success', text: 'Bukti pembayaran berhasil diunggah.' })
      setFile(null)
      setCatatan('')
      setSelectedBillIds(new Set())
      setPaymentDistributions({})
      setAutoDistributeTotal('')
      
      fetchBills()
      setTimeout(() => setUploadMessage(null), 3000)

    } catch (err: any) {
      console.error(err)
      setUploadMessage({ type: 'error', text: err.message || 'Gagal mengunggah bukti pembayaran.' })
    } finally {
      setIsUploading(false)
    }
  }

  const handlePrintKwitansi = (bill: Bill, payment: any) => {
    if (!payment) return
    setPrintData({
      id: bill.id,
      nama: bill.students?.nama || user.nama,
      nisn: bill.students?.nisn || '-',
      jenis_tagihan: bill.jenis_tagihan,
      nominal: payment.nominal_dibayar || bill.nominal,
      tanggal_bayar: payment.tanggal_bayar || new Date().toISOString(),
      nomor_kwitansi: payment.nomor_kwitansi
    })
    setTimeout(() => window.print(), 100)
  }

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return <div className="text-center py-8 animate-pulse">Memuat data tagihan...</div>
  if (error) return <div className="text-center py-8 text-destructive">{error}</div>

  const activeBills = bills.filter(b => b.status !== 'paid' && (!b.payments || !b.payments.some(p => p.status === 'pending')))
  const allPayments = bills.flatMap(b => b.payments.map(p => ({ ...p, bill_jenis: b.jenis_tagihan }))).sort((a, b) => new Date(b.tanggal_bayar || b.created_at || '').getTime() - new Date(a.tanggal_bayar || a.created_at || '').getTime())

  return (
    <div className="space-y-6 relative">
      <KwitansiPrint ref={printComponentRef} data={printData} />
      <div className="print:hidden space-y-6">
        {/* Hero Greeting Section */}
        <div className={`relative overflow-hidden border rounded-[32px] min-h-[180px] sm:min-h-[220px] flex flex-row justify-between shadow-sm no-print mb-6 transition-all duration-500 bg-gradient-to-r ${theme.bannerBg}`}>
          {theme.decor}
          <div className="p-4 sm:p-6 md:p-8 pr-0 z-10 w-[60%] sm:w-[65%] flex flex-col justify-center space-y-2 sm:space-y-4 text-left">
            <div className="space-y-1 sm:space-y-2">
              <p className={`font-semibold text-[10px] sm:text-sm flex items-center gap-1.5 ${theme.subColor}`}>
                {theme.emoji} Selamat {getGreeting()},
              </p>
              <h2 className={`text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight ${theme.titleColor} leading-tight`}>
                Wali dari {user.nama}
                <span className="text-emerald-500">.</span>
              </h2>
              <p className={`text-[10px] sm:text-xs md:text-sm max-w-md ${theme.subColor} leading-normal sm:leading-relaxed`}>
                Semoga hari ini penuh berkah dan kemudahan dalam memantau tagihan keuangan sekolah anak Anda.
              </p>
            </div>
            
            <div className="flex">
              <div className={`inline-flex items-center gap-2 sm:gap-3 border rounded-xl sm:rounded-2xl px-2.5 py-1 sm:px-4 sm:py-2 transition-colors ${theme.badgeBg}`}>
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-bold ${theme.badgeIconBg}`}>
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <p className="text-[8px] sm:text-[9px] font-bold opacity-60 uppercase tracking-wider leading-none">Akses Portal</p>
                  <p className="text-[10px] sm:text-xs font-bold capitalize mt-0.5 sm:mt-1">Wali Murid</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-[42%] sm:w-[45%] md:w-[48%] lg:w-[420px] h-full overflow-hidden pointer-events-none rounded-r-[30px] z-0">
            <div className={`absolute inset-0 bg-gradient-to-r ${theme.fadeColor} z-10 pointer-events-none`} />
            <img src={theme.imgSrc} alt="Portal" className={`w-full h-full object-cover object-right md:object-center transition-all duration-700 ${theme.imgFilter || ''}`} />
          </div>
        </div>

        {rekening?.no_rekening && (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="text-sm">
              <span className="font-semibold text-blue-900">Rekening Pembayaran: </span>
              <span className="text-blue-800">
                {rekening.nama_bank ? `${rekening.nama_bank} - ` : ''}{rekening.no_rekening}
                {rekening.atas_nama ? ` a.n. ${rekening.atas_nama}` : ''}
              </span>
            </div>
          </div>
        )}

        <Tabs defaultValue="tagihan" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-12 p-0 mb-6">
            <TabsTrigger 
              value="tagihan" 
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none text-base px-6 h-full font-semibold"
            >
              Tagihan Aktif ({activeBills.length})
            </TabsTrigger>
            <TabsTrigger 
              value="riwayat" 
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none text-base px-6 h-full font-semibold"
            >
              Riwayat Pembayaran
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tagihan" className="space-y-6">
            <Card>
              <CardContent className="p-0">
                {activeBills.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Tidak ada tagihan aktif.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b text-slate-600 font-semibold uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center">Pilih</th>
                          <th className="px-4 py-3">Jenis Tagihan</th>
                          <th className="px-4 py-3 text-right">Sisa Tagihan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeBills.map((bill) => {
                          const sisa = bill.nominal - (bill.nominal_terbayar || 0)
                          return (
                            <tr key={bill.id} className="border-b hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-4 text-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 cursor-pointer accent-blue-600 rounded border-slate-300"
                                  checked={selectedBillIds.has(bill.id)}
                                  onChange={() => handleToggleBill(bill)}
                                />
                              </td>
                              <td className="px-4 py-4">
                                <p className="font-semibold text-slate-800 text-base">{bill.jenis_tagihan}</p>
                                <p className="text-xs text-slate-500">Total: {formatRupiah(bill.nominal)}</p>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="font-bold text-slate-800 text-base">{formatRupiah(sisa)}</span>
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

            {/* Keranjang Pembayaran */}
            {selectedBillIds.size > 0 && (
              <Card className="border-blue-200 shadow-md animate-in fade-in slide-in-from-bottom-4">
                <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
                  <CardTitle className="text-blue-900 flex items-center gap-2 text-lg">
                    <UploadCloud className="w-5 h-5 text-blue-600" />
                    Keranjang Pembayaran ({selectedBillIds.size} Tagihan)
                  </CardTitle>
                  <CardDescription className="text-blue-800/80">
                    Silakan tentukan nominal pembayaran untuk masing-masing tagihan. Jika Anda menginput nominal lebih besar pada tagihan bulanan (contoh SPP), sisa dananya otomatis dipakai untuk melunasi bulan berikutnya!
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleUploadPayment}>
                  <CardContent className="space-y-6 pt-6">
                    {uploadMessage && (
                      <div className={`p-3 rounded-md text-sm ${uploadMessage.type === 'error' ? 'bg-destructive/15 text-destructive' : 'bg-green-100 text-green-800'}`}>
                        {uploadMessage.text}
                      </div>
                    )}
                    
                    <div className="bg-slate-50 p-4 rounded-xl border space-y-4">
                      <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Punya Uang Berapa? (Opsional)</Label>
                          <Input 
                            type="number" 
                            placeholder="Contoh: 500000" 
                            value={autoDistributeTotal}
                            onChange={(e) => setAutoDistributeTotal(e.target.value)}
                            className="h-10 border-slate-300 shadow-sm"
                          />
                        </div>
                        <Button type="button" variant="secondary" onClick={handleAutoDistribute} className="h-10 whitespace-nowrap bg-white border shadow-sm">
                          Bantu Distribusikan
                        </Button>
                      </div>
                      
                      <div className="space-y-3 pt-2">
                        {Array.from(selectedBillIds).map(id => {
                          const bill = bills.find(b => b.id === id)
                          if (!bill) return null
                          const sisaTagihanDefault = bill.nominal - (bill.nominal_terbayar || 0)
                          const dist = paymentDistributions[id] || 0
                          const isBulanan = /\((Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) \d{4}\)$/.test(bill.jenis_tagihan)
                          const overpaid = dist > sisaTagihanDefault
                          const isError = !isBulanan && overpaid

                          return (
                            <div key={id} className={`flex flex-col gap-2 p-3 rounded-lg border ${isError ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
                              <div className="flex justify-between items-center flex-wrap gap-2">
                                <Label className="text-sm font-semibold">{bill.jenis_tagihan} <span className="text-xs font-normal text-muted-foreground ml-1">(Tagihan: {formatRupiah(sisaTagihanDefault)})</span></Label>
                                <div className="flex items-center gap-2">
                                  {isBulanan && (
                                    <select 
                                      className="h-9 text-xs border-slate-300 rounded-md px-2 bg-slate-50 text-slate-600 focus:ring-blue-500 focus:border-blue-500"
                                      onChange={(e) => {
                                        const months = parseInt(e.target.value);
                                        if (months > 0) {
                                          const amount = sisaTagihanDefault + ((months - 1) * bill.nominal);
                                          handleDistributeChange(id, amount.toString());
                                        }
                                      }}
                                      value={
                                        dist > 0 && (dist - sisaTagihanDefault) % bill.nominal === 0 
                                          ? 1 + ((dist - sisaTagihanDefault) / bill.nominal) 
                                          : ""
                                      }
                                    >
                                      <option value="" disabled>Pilih opsi bulan...</option>
                                      {[1, 2, 3, 4, 5, 6, 12].map(m => (
                                        <option key={m} value={m}>{m} Bulan Sekaligus</option>
                                      ))}
                                    </select>
                                  )}
                                  <span className="text-sm font-medium">Rp</span>
                                  <Input 
                                    type="number"
                                    min="0"
                                    className="h-9 w-32 sm:w-40 text-right font-semibold"
                                    value={paymentDistributions[id] || ''}
                                    onChange={(e) => handleDistributeChange(id, e.target.value)}
                                    required
                                    placeholder="Nominal..."
                                  />
                                </div>
                              </div>
                              {overpaid && isBulanan && (
                                <div className="flex items-start gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded">
                                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                  <p>Sisa dana <strong className="font-bold">{formatRupiah(dist - sisaTagihanDefault)}</strong> akan dipakai otomatis melunasi SPP bulan-bulan berikutnya.</p>
                                </div>
                              )}
                              {isError && (
                                <p className="text-[11px] text-red-600 font-medium">Nominal tidak boleh melebihi sisa tagihan untuk jenis ini.</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="flex-1 space-y-4 w-full">
                        <div className="space-y-2">
                          <Label htmlFor="file_bukti" className="text-sm font-semibold">Bukti Transfer (Gbr/PDF Max 5MB) <span className="text-red-500">*</span></Label>
                          <Input 
                            id="file_bukti" 
                            type="file" 
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            required 
                            className="cursor-pointer file:cursor-pointer"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="catatan" className="text-sm font-semibold">Catatan (Opsional)</Label>
                          <Input 
                            id="catatan" 
                            placeholder="Contoh: Titip lewat Budi..." 
                            value={catatan}
                            onChange={(e) => setCatatan(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="w-full md:w-64 bg-slate-50 p-4 rounded-xl border space-y-4">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Pembayaran</p>
                          <p className="text-2xl font-bold text-blue-700">{formatRupiah(totalPayment)}</p>
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full h-11 bg-blue-600 hover:bg-blue-700 shadow-md font-semibold text-base" 
                          disabled={isUploading || !file || totalPayment <= 0}
                        >
                          {isUploading ? 'Mengunggah...' : 'Kirim Bukti'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </form>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="riwayat">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Transaksi</CardTitle>
                <CardDescription>Catatan seluruh pembayaran yang pernah Anda lakukan.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {allPayments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Belum ada riwayat pembayaran.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b text-slate-600 font-semibold uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3">Tagihan</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Nominal</th>
                          <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allPayments.map((pay, i) => (
                          <tr key={pay.id || i} className="border-b last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3 whitespace-nowrap">{formatDate(pay.tanggal_bayar)}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{pay.bill_jenis}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase w-fit
                                  ${pay.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' : 
                                    pay.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
                                    'bg-red-100 text-red-700 border border-red-200'}`}>
                                  {pay.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                                  {pay.status === 'pending' && <Clock className="w-3 h-3" />}
                                  {pay.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                  {pay.status === 'approved' ? 'Disetujui' : pay.status === 'pending' ? 'Menunggu' : 'Ditolak'}
                                </span>
                                {pay.status === 'rejected' && pay.catatan && (
                                  <span className="text-[10px] text-red-600">Alasan: {pay.catatan}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800">
                              {formatRupiah(pay.nominal_dibayar || 0)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {pay.status === 'approved' ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
                                  onClick={() => {
                                    const b = bills.find(b => b.jenis_tagihan === pay.bill_jenis)
                                    if(b) handlePrintKwitansi(b, pay)
                                  }}
                                >
                                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Kwitansi
                                </Button>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
