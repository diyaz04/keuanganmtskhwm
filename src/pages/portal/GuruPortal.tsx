import { useEffect, useState, useRef, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import type { PortalUser } from './index'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer, ChevronDown, ChevronUp, Users } from 'lucide-react'
import SlipGajiPrint from '@/components/SlipGajiPrint'
import type { PayrollRecord } from '@/components/SlipGajiPrint'

interface GuruPortalProps {
  user: PortalUser
}

export default function GuruPortal({ user }: GuruPortalProps) {
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [printRecord, setPrintRecord] = useState<PayrollRecord | null>(null)

  const printComponentRef = useRef<HTMLDivElement>(null)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 11) return 'Pagi'
    if (hour >= 11 && hour < 15) return 'Siang'
    if (hour >= 15 && hour < 18) return 'Sore'
    return 'Malam'
  }

  const getGenderFromName = (name: string): 'L' | 'P' => {
    const lowercaseName = name.toLowerCase();
    
    // Hajah / Ibu / Sdri / Nn / Ny
    if (/\b(hj|hajah|ibu|ny|nyonya|sdri|saudari|nn|nona|siti|sri|dewi|putri|anisa|annisa|rahma|rahmawati|fitria|fitri|diah|kartika|retno|laila|wardah|halimah|mutiara|widya|ayu|mega|wulan|khadijah|fatimah|aisyah|nurul|yuni|yuliana|dina|lilis|neneng|ratna|tati|titin|yani|eneng|indri|lestari|wulandari|purnamasari|lestari|hartati|kusuma|pratiwi|novita|desy|eka|lia)\b/.test(lowercaseName)) {
      return 'P';
    }
    
    // Haji / Bapak / Sdr / Mas / Bung
    if (/\b(h|haji|bpk|bapak|sdr|saudara|mas|bung|ahmad|achmad|muhammad|mohammad|abdul|agus|budi|eko|joko|hendra|maman|dadang|asep|cecep|dodi|diki|faisal|hadi|heru|iwan|mulyono|rizal|rudi|sigit|supriadi|wawan|yudi|yusuf|zainal|diyaz|najib|muhsin|wahab|ridwan|suryono|prabowo|jokowi|susilo|bambang|dwi|tri|agung|arif|taufik|eko|aditya|bagus|chandra|denny|fajar|gunawan|indra|putra|pratama|setiawan|tri|wahyu|wibowo|yanto)\b/.test(lowercaseName)) {
      return 'L';
    }

    if (/(wati|ni|ty|ah|tria|tri)$/.test(lowercaseName)) {
      return 'P';
    }
    
    if (/(wan|to|ono|anto|adi|us|ur|at|din|man)$/.test(lowercaseName)) {
      return 'L';
    }

    return 'P';
  }

  const getTheme = () => {
    const greeting = getGreeting()
    const isMale = getGenderFromName(user.nama) === 'L'
    
    switch (greeting) {
      case 'Pagi':
        return {
          bannerBg: 'from-amber-50 via-rose-50/70 to-sky-100/80 border-amber-100/60 text-slate-800',
          fadeColor: 'from-amber-50 via-amber-50/40 to-transparent',
          imgSrc: isMale ? '/finance_hero_male_morning.jpg' : '/finance_hero_hijab_morning.jpg',
          imgFilter: 'opacity-90 contrast-105 saturate-110',
          titleColor: 'text-slate-800',
          subColor: 'text-slate-500',
          emoji: '🌅',
          badgeBg: 'bg-amber-100/60 border-amber-200 text-amber-900',
          badgeIconBg: 'bg-amber-500 text-white',
          decor: (
            <div className="absolute top-[-50px] right-[100px] w-48 h-48 rounded-full bg-gradient-to-tr from-amber-300/30 to-rose-200/20 blur-3xl pointer-events-none" />
          )
        }
      case 'Siang':
        return {
          bannerBg: 'from-sky-100 via-blue-50/60 to-amber-50/60 border-sky-200/50 text-slate-800',
          fadeColor: 'from-sky-100 via-sky-100/40 to-transparent',
          imgSrc: isMale ? '/finance_hero_male.jpg' : '/finance_hero_hijab.jpg',
          imgFilter: 'brightness-105 contrast-100',
          titleColor: 'text-slate-800',
          subColor: 'text-slate-500',
          emoji: '☀️',
          badgeBg: 'bg-sky-100/60 border-sky-200 text-sky-900',
          badgeIconBg: 'bg-sky-500 text-white',
          decor: (
            <>
              <div className="absolute top-[-40px] right-[80px] w-40 h-40 rounded-full bg-amber-300/30 blur-2xl animate-pulse pointer-events-none" />
              <div className="absolute top-[-20px] right-[60px] w-24 h-24 rounded-full bg-yellow-400/20 blur-xl pointer-events-none" />
            </>
          )
        }
      case 'Sore':
        return {
          bannerBg: 'from-orange-50 via-rose-50/70 to-indigo-100/70 border-orange-100 text-slate-800',
          fadeColor: 'from-orange-50 via-orange-50/40 to-transparent',
          imgSrc: isMale ? '/finance_hero_male_evening.jpg' : '/finance_hero_hijab_evening.jpg',
          imgFilter: 'brightness-95 contrast-105 saturate-110',
          titleColor: 'text-slate-800',
          subColor: 'text-slate-500',
          emoji: '🌇',
          badgeBg: 'bg-orange-100/60 border-orange-200 text-orange-950',
          badgeIconBg: 'bg-orange-500 text-white',
          decor: (
            <div className="absolute top-[-60px] right-[120px] w-52 h-52 rounded-full bg-gradient-to-br from-orange-300/30 to-indigo-400/20 blur-3xl pointer-events-none" />
          )
        }
      case 'Malam':
      default:
        return {
          bannerBg: 'from-slate-900 via-indigo-950 to-slate-950 border-slate-800 text-white shadow-inner',
          fadeColor: 'from-slate-900 via-slate-900/40 to-transparent',
          imgSrc: isMale ? '/finance_hero_male_night.jpg' : '/finance_hero_hijab_night.jpg',
          imgFilter: 'brightness-[70%] contrast-110 saturate-[90%] md:opacity-100',
          titleColor: 'text-white',
          subColor: 'text-slate-300',
          emoji: '🌙',
          badgeBg: 'bg-white/10 border-white/20 text-slate-100',
          badgeIconBg: 'bg-indigo-600 text-white',
          decor: (
            <>
              {/* Moon glow */}
              <div className="absolute top-[-30px] right-[90px] w-44 h-44 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
              <div className="absolute top-4 right-20 w-8 h-8 rounded-full bg-amber-100/80 shadow-md shadow-amber-200/20 pointer-events-none">
                {/* Crescent inner shadow effect */}
                <div className="absolute top-0.5 left-2 w-7 h-7 rounded-full bg-slate-950" />
              </div>
              {/* Stars */}
              <div className="absolute top-12 right-40 w-1 h-1 rounded-full bg-white/80 animate-pulse pointer-events-none" />
              <div className="absolute top-6 right-64 w-1 h-1 rounded-full bg-white/40 animate-pulse pointer-events-none" />
              <div className="absolute top-16 right-56 w-1 h-1 rounded-full bg-white/60 pointer-events-none" />
              <div className="absolute top-24 right-36 w-1 h-1 rounded-full bg-white/90 animate-pulse pointer-events-none" />
            </>
          )
        }
    }
  }

  const theme = getTheme()

  useEffect(() => {
    fetchPayrollData()
  }, [])

  const fetchPayrollData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-payroll-records', {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setRecords(data.records || [])
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat penggajian')
    } finally {
      setLoading(false)
    }
  }

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedRows(newSet)
  }

  const handlePrint = (record: PayrollRecord) => {
    setPrintRecord(record)
    // Beri waktu sejenak agar state react terupdate dan komponen siap dirender sebelum dialog print muncul
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground animate-pulse">Memuat riwayat penggajian...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">{error}</div>
  }

  return (
    <div className="space-y-6">
      
      {/* Hidden print component */}
      <SlipGajiPrint ref={printComponentRef} record={printRecord} />

      {/* Screen layout */}
      <div className="print:hidden">
        {/* Hero Greeting Section */}
        <div className={`relative overflow-hidden border rounded-[32px] min-h-[180px] sm:min-h-[220px] flex flex-row justify-between shadow-sm no-print mb-6 transition-all duration-500 bg-gradient-to-r ${theme.bannerBg}`}>
          {/* Dynamic theme decoration background element */}
          {theme.decor}

          {/* Left column - Content inside padding */}
          <div className="p-4 sm:p-6 md:p-8 pr-0 z-10 w-[60%] sm:w-[65%] flex flex-col justify-center space-y-2 sm:space-y-4 text-left">
            <div className="space-y-1 sm:space-y-2">
              <p className={`font-semibold text-[10px] sm:text-sm flex items-center gap-1.5 ${theme.subColor}`}>
                {theme.emoji} Selamat {getGreeting()},
              </p>
              <h2 className={`text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight ${theme.titleColor} leading-tight`}>
                {user.nama}
                <span className="text-emerald-500">.</span>
              </h2>
              <p className={`text-[10px] sm:text-xs md:text-sm max-w-md ${theme.subColor} leading-normal sm:leading-relaxed`}>
                Semoga hari ini penuh berkah dan kemudahan dalam memeriksa rincian slip gaji Anda.
              </p>
            </div>
            
            <div className="flex">
              <div className={`inline-flex items-center gap-2 sm:gap-3 border rounded-xl sm:rounded-2xl px-2.5 py-1 sm:px-4 sm:py-2 transition-colors ${theme.badgeBg}`}>
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-bold ${theme.badgeIconBg}`}>
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <p className="text-[8px] sm:text-[9px] font-bold opacity-60 uppercase tracking-wider leading-none">Akses Portal</p>
                  <p className="text-[10px] sm:text-xs font-bold capitalize mt-0.5 sm:mt-1">Guru & Staf</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side background image that blends seamlessly with the card */}
          <div className="absolute right-0 top-0 bottom-0 w-[42%] sm:w-[45%] md:w-[48%] lg:w-[420px] h-full overflow-hidden pointer-events-none rounded-r-[30px] z-0">
            {/* Smooth gradient fade to theme color on the left side of the image */}
            <div className={`absolute inset-0 bg-gradient-to-r ${theme.fadeColor} z-10 pointer-events-none`} />
            
            <img 
              src={theme.imgSrc} 
              alt="Portal Illustration" 
              className={`w-full h-full object-cover object-right md:object-center transition-all duration-700 ${theme.imgFilter || ''}`}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Penggajian</CardTitle>
            <CardDescription>
              Daftar gaji dan rincian potongan Anda setiap bulan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                Belum ada data penggajian untuk akun Anda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-tl-lg">Periode</th>
                      <th className="px-4 py-3 font-medium text-right">Penerimaan</th>
                      <th className="px-4 py-3 font-medium text-right">Potongan</th>
                      <th className="px-4 py-3 font-medium text-right">Gaji Bersih</th>
                      <th className="px-4 py-3 font-medium text-center">Status</th>
                      <th className="px-4 py-3 font-medium text-center rounded-tr-lg">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {records.map((record) => (
                      <Fragment key={record.id}>
                        <tr className="hover:bg-muted/20 transition-colors group">
                          <td className="px-4 py-4 font-medium">{record.periode}</td>
                          <td className="px-4 py-4 text-right">{formatRupiah(record.gaji_pokok)}</td>
                          <td className="px-4 py-4 text-right text-destructive">{formatRupiah(record.total_potongan)}</td>
                          <td className="px-4 py-4 text-right font-bold text-primary">{formatRupiah(record.gaji_bersih)}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                              ${record.status === 'paid' ? 'badge-paid' : 
                                record.status === 'published' ? 'badge-published' : 
                                'badge-pending'}`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => toggleRow(record.id)}
                                className="h-8"
                              >
                                Detail
                                {expandedRows.has(record.id) ? (
                                  <ChevronUp className="ml-1 w-4 h-4" />
                                ) : (
                                  <ChevronDown className="ml-1 w-4 h-4" />
                                )}
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => handlePrint(record)}
                                disabled={record.status === 'draft'}
                                className="h-8 bg-emerald-600 hover:bg-emerald-700"
                              >
                                <Printer className="w-4 h-4 mr-1" />
                                Slip
                              </Button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Details Row */}
                        {expandedRows.has(record.id) && (
                          <tr className="bg-muted/10 border-b-0">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="max-w-4xl ml-auto mr-auto bg-background rounded-lg border p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Kolom Penerimaan */}
                                <div>
                                  <h4 className="font-semibold mb-3 border-b pb-2">Rincian Penerimaan ({record.periode})</h4>
                                  <ul className="space-y-2">
                                    {record.penghasilan_details ? (
                                      <>
                                        {Object.entries(record.penghasilan_details).map(([key, value]) => (
                                          <li key={key} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{key}</span>
                                            <span className="font-medium text-emerald-600">{formatRupiah(value as number)}</span>
                                          </li>
                                        ))}
                                        <li className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                                          <span>Total Penerimaan</span>
                                          <span className="text-emerald-600">{formatRupiah(record.gaji_pokok)}</span>
                                        </li>
                                      </>
                                    ) : (
                                      <li className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Gaji Pokok & Tunjangan</span>
                                        <span className="font-medium text-emerald-600">{formatRupiah(record.gaji_pokok)}</span>
                                      </li>
                                    )}
                                  </ul>
                                </div>

                                {/* Kolom Potongan */}
                                <div>
                                  <h4 className="font-semibold mb-3 border-b pb-2">Rincian Potongan ({record.periode})</h4>
                                  {record.payroll_deductions && record.payroll_deductions.length > 0 ? (
                                    <ul className="space-y-2">
                                      {record.payroll_deductions.map(deduction => (
                                        <li key={deduction.id} className="flex justify-between text-sm">
                                          <span className="text-muted-foreground">{deduction.deduction_types.nama}</span>
                                          <span className="font-medium text-destructive">{formatRupiah(deduction.nominal)}</span>
                                        </li>
                                      ))}
                                      <li className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                                        <span>Total Potongan</span>
                                        <span className="text-destructive">{formatRupiah(record.total_potongan)}</span>
                                      </li>
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">Tidak ada potongan pada bulan ini.</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
