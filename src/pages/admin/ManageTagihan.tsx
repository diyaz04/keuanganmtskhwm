import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heart, Settings, Ban, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'

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
  nominal_terbayar: number
  status: 'unpaid' | 'partial' | 'paid'
  created_at: string
  students?: Student
}

type BillingTemplate = {
  id: string
  jenis_tagihan: string
  nominal: number
  tipe_periode: 'bulanan' | 'tahunan' | 'sekali_selama_sekolah'
  keterangan: string | null
  is_active: boolean
}

type Override = {
  id: string
  student_id: string
  billing_template_id: string
  tipe: 'gratis' | 'keringanan'
  nominal_override: number | null
  alasan: string
  start_date: string
  end_date: string | null
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

const getBaseJenisTagihan = (jenis: string) => {
  const match = jenis.match(/^(.*?)\s*\(.*?\)$/)
  return match ? match[1].trim() : jenis.trim()
}

export default function ManageTagihan() {
  const [students, setStudents] = useState<Student[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [templates, setTemplates] = useState<BillingTemplate[]>([])
  const [overrides, setOverrides] = useState<Override[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [nominal, setNominal] = useState('')

  // Form State (Massal)
  const [massalTemplateId, setMassalTemplateId] = useState('')
  const [massalTargetGroup, setMassalTargetGroup] = useState('all')
  const [massalAngkatan, setMassalAngkatan] = useState('')
  const [massalKelas, setMassalKelas] = useState('')
  const [massalBulan, setMassalBulan] = useState('')
  const [massalTahun, setMassalTahun] = useState(new Date().getFullYear().toString())

  // Form State (Tarik Massal)
  const [tarikTemplateId, setTarikTemplateId] = useState('')
  const [tarikTargetGroup, setTarikTargetGroup] = useState('all')
  const [tarikAngkatan, setTarikAngkatan] = useState('')
  const [tarikKelas, setTarikKelas] = useState('')
  const [tarikBulan, setTarikBulan] = useState('')
  const [tarikTahun, setTarikTahun] = useState(new Date().getFullYear().toString())

  // Filter State
  const [searchName, setSearchName] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAngkatan, setFilterAngkatan] = useState('all')
  const [activeCategoryTab, setActiveCategoryTab] = useState('Semua')

  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set())

  // ── Pagination State ──
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal Pembayaran Manual State
  const [activePaymentBill, setActivePaymentBill] = useState<Bill | null>(null)
  const [activeMobileSectionTab, setActiveMobileSectionTab] = useState<'ringkasan' | 'buat' | 'daftar'>('ringkasan')
  const [paymentMode, setPaymentMode] = useState<'full' | 'partial' | 'advance'>('full')
  const [partialAmount, setPartialAmount] = useState('')
  const [advanceMonths, setAdvanceMonths] = useState('1')

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportCategory, setExportCategory] = useState('Semua')
  const [exportFields, setExportFields] = useState({
    nisn: true,
    nama: true,
    kelas: true,
    angkatan: true,
    nominal: true,
    nominal_terbayar: true,
    sisa_tagihan: true,
    status: true
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [studentsRes, billsRes, templatesRes, overridesRes] = await Promise.all([
        supabase.from('students').select('id, nisn, nama, kelas, angkatan, status').order('nama'),
        supabase.from('bills').select(`*, students:student_id (id, nisn, nama, kelas, angkatan, status)`).order('created_at', { ascending: false }),
        supabase.from('billing_templates').select('id, jenis_tagihan, nominal, tipe_periode, keterangan, is_active').eq('is_active', true).order('jenis_tagihan'),
        supabase.from('student_billing_overrides').select('id, student_id, billing_template_id, tipe, nominal_override, alasan, start_date, end_date'),
      ])

      if (studentsRes.error) throw studentsRes.error
      if (studentsRes.data) setStudents(studentsRes.data as Student[])

      if (billsRes.error) throw billsRes.error
      if (billsRes.data) {
        const allBills = billsRes.data as Bill[]
        // Filter out bills from graduated students
        const activeBills = allBills.filter(b => b.students?.status !== 'lulus')
        setBills(activeBills)
      }

      if (templatesRes.data) setTemplates(templatesRes.data as BillingTemplate[])
      if (overridesRes.data) setOverrides(overridesRes.data as Override[])
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Gagal mengambil data')
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  )

  const matchedOverride = useMemo(
    () => overrides.find(o => o.student_id === selectedStudent && o.billing_template_id === selectedTemplateId) || null,
    [overrides, selectedStudent, selectedTemplateId]
  )

  // Apakah hari ini (saat tagihan dibuat) jatuh di dalam rentang pengecualian "gratis"
  const isGratisBlocked = useMemo(() => {
    if (!matchedOverride || matchedOverride.tipe !== 'gratis') return false
    const today = new Date().toISOString().split('T')[0]
    const startDate = matchedOverride.start_date.split('T')[0]
    const endDate = matchedOverride.end_date ? matchedOverride.end_date.split('T')[0] : null
    if (today < startDate) return false
    if (endDate && today > endDate) return false
    return true
  }, [matchedOverride])

  // Prefill nominal otomatis saat pilih jenis tagihan / saat override keringanan terdeteksi
  useEffect(() => {
    if (matchedOverride && matchedOverride.tipe === 'keringanan') {
      setNominal(String(matchedOverride.nominal_override ?? 0))
    } else if (selectedTemplate) {
      setNominal(String(selectedTemplate.nominal))
    }
  }, [selectedTemplateId, matchedOverride, selectedTemplate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent || !selectedTemplateId || !nominal) {
      alert('Harap isi semua field yang dibutuhkan.')
      return
    }

    // Cek ulang (defensif) sebelum insert: siswa berprestasi yang bebas biaya tidak boleh tergenerate
    if (isGratisBlocked) {
      alert('Tagihan tidak dibuat: siswa ini sedang dibebaskan dari jenis tagihan ini.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('bills')
        .insert({
          student_id: selectedStudent,
          jenis_tagihan: selectedTemplate?.jenis_tagihan || '',
          nominal: parseFloat(nominal),
          status: 'unpaid'
        })

      if (error) throw error

      alert('Berhasil membuat tagihan baru!')
      // Reset form
      setSelectedStudent('')
      setSelectedTemplateId('')
      setNominal('')
      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error creating bill:', error)
      alert('Gagal membuat tagihan baru')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMassSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!massalTemplateId) {
      alert('Pilih jenis tagihan terlebih dahulu.')
      return
    }

    const template = templates.find(t => t.id === massalTemplateId)
    if (!template) return

    // Filter students based on target group
    let targetStudents = students.filter(s => s.status !== 'lulus' && s.status !== 'keluar')
    
    if (massalTargetGroup === 'angkatan') {
      if (!massalAngkatan) {
        alert('Pilih angkatan terlebih dahulu.')
        return
      }
      targetStudents = targetStudents.filter(s => s.angkatan === massalAngkatan)
    } else if (massalTargetGroup === 'kelas') {
      if (!massalKelas) {
        alert('Pilih kelas terlebih dahulu.')
        return
      }
      targetStudents = targetStudents.filter(s => s.kelas === massalKelas)
    }

    if (targetStudents.length === 0) {
      alert('Tidak ada siswa yang cocok dengan kriteria tersebut.')
      return
    }

    // Build insert payload taking overrides into account
    const today = new Date().toISOString().split('T')[0]
    const billsToInsert: any[] = []
    let skippedGratis = 0
    let appliedKeringanan = 0
    
    let tagihanSuffix = ''
    if (template.tipe_periode === 'bulanan' && massalBulan && massalTahun) {
      tagihanSuffix = ` (${massalBulan} ${massalTahun})`
    } else if (template.tipe_periode === 'tahunan' && massalTahun) {
      tagihanSuffix = ` (${massalTahun})`
    }
    const finalJenisTagihan = `${template.jenis_tagihan}${tagihanSuffix}`

    // Cek tagihan yang sudah ada (untuk menghindari duplikat jika siswa sudah "Bayar Maju")
    const { data: existingBills } = await supabase.from('bills').select('student_id').eq('jenis_tagihan', finalJenisTagihan)
    const existingStudentIds = new Set(existingBills?.map(b => b.student_id) || [])

    targetStudents.forEach(student => {
      const override = overrides.find(o => o.student_id === student.id && o.billing_template_id === massalTemplateId)
      
      let finalNominal = template.nominal
      let isBlocked = false

      if (override) {
        const startDate = override.start_date.split('T')[0]
        const endDate = override.end_date ? override.end_date.split('T')[0] : null
        const isOverrideActive = today >= startDate && (!endDate || today <= endDate)
        if (isOverrideActive) {
          if (override.tipe === 'gratis') {
            isBlocked = true
          } else if (override.tipe === 'keringanan') {
            finalNominal = override.nominal_override ?? 0
            appliedKeringanan++
          }
        }
      }

      if (existingStudentIds.has(student.id)) {
        // Skip duplikat (sudah ada)
      } else if (isBlocked) {
        skippedGratis++
      } else {
        billsToInsert.push({
          student_id: student.id,
          jenis_tagihan: finalJenisTagihan,
          nominal: finalNominal,
          status: 'unpaid'
        })
      }
    })

    if (billsToInsert.length === 0) {
      alert(`Tidak ada tagihan baru yang dibuat.\n\nAlasan:\n- ${existingStudentIds.size} siswa sudah memiliki tagihan ini (mungkin karena bayar maju/sudah dibuat).\n- ${skippedGratis} siswa dibebaskan (Gratis).`)
      return
    }

    const confirmMsg = `Akan membuat ${billsToInsert.length} tagihan baru untuk jenis "${finalJenisTagihan}".\n\nInfo:\n- ${appliedKeringanan} tagihan dikurangi nominalnya (Keringanan).\n- ${existingStudentIds.size} dilewati (sudah ada tagihan).\n- ${skippedGratis} dilewati (bebas biaya).\n\nLanjutkan?`
    if (!window.confirm(confirmMsg)) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('bills').insert(billsToInsert)
      if (error) throw error

      alert(`Berhasil membuat ${billsToInsert.length} tagihan secara massal!`)
      setMassalTemplateId('')
      setMassalTargetGroup('all')
      setMassalAngkatan('')
      setMassalKelas('')
      setMassalBulan('')
      setMassalTahun(new Date().getFullYear().toString())
      fetchData()
    } catch (error) {
      console.error('Error mass creating bills:', error)
      alert('Gagal membuat tagihan massal')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportExcel = () => {
    // 1. Filter bills based on selected export category
    const filtered = bills.filter(b => {
      if (exportCategory === 'Semua') return true
      return getBaseJenisTagihan(b.jenis_tagihan) === exportCategory
    })

    if (filtered.length === 0) {
      alert('Tidak ada data tagihan untuk kategori yang dipilih.')
      return
    }

    // 2. Separate into Paid and Unpaid
    const paidBills = filtered.filter(b => b.status === 'paid')
    const unpaidBills = filtered.filter(b => b.status !== 'paid')

    // 3. Calculate Summary Stats
    const totalBilled = filtered.reduce((sum, b) => sum + b.nominal, 0)
    const totalPaid = filtered.reduce((sum, b) => sum + (b.nominal_terbayar || 0), 0)
    const totalOutstanding = totalBilled - totalPaid

    const ringkasanData = [
      { 'METRIK LAPORAN': 'Kategori Tagihan', 'NILAI / JUMLAH': exportCategory },
      { 'METRIK LAPORAN': 'Total Tagihan Diterbitkan', 'NILAI / JUMLAH': filtered.length },
      { 'METRIK LAPORAN': 'Jumlah Siswa Lunas', 'NILAI / JUMLAH': paidBills.length },
      { 'METRIK LAPORAN': 'Jumlah Siswa Belum Lunas (Termasuk Cicilan)', 'NILAI / JUMLAH': unpaidBills.length },
      { 'METRIK LAPORAN': 'Tingkat Kelunasan (%)', 'NILAI / JUMLAH': `${((paidBills.length / filtered.length) * 100).toFixed(2)}%` },
      { 'METRIK LAPORAN': '', 'NILAI / JUMLAH': '' }, // Empty row separator
      { 'METRIK LAPORAN': 'Total Akumulasi Tagihan', 'NILAI / JUMLAH': formatCurrency(totalBilled) },
      { 'METRIK LAPORAN': 'Total Nominal Terbayar', 'NILAI / JUMLAH': formatCurrency(totalPaid) },
      { 'METRIK LAPORAN': 'Total Sisa Piutang Sekolah', 'NILAI / JUMLAH': formatCurrency(totalOutstanding) }
    ]

    // Helper to map bill data according to selected fields
    const mapBillData = (billList: Bill[]) => {
      if (billList.length === 0) {
        return [{ 'Informasi': 'Tidak ada data siswa untuk kategori ini.' }]
      }
      return billList.map((b, idx) => {
        const row: any = { 'No': idx + 1 }
        if (exportFields.nisn) row['NISN'] = b.students?.nisn || '-'
        if (exportFields.nama) row['Nama Siswa'] = b.students?.nama || '-'
        if (exportFields.kelas) row['Kelas'] = b.students?.kelas || '-'
        if (exportFields.angkatan) row['Angkatan'] = b.students?.angkatan || '-'
        row['Nama Tagihan'] = b.jenis_tagihan
        if (exportFields.nominal) row['Nominal Tagihan'] = b.nominal
        if (exportFields.nominal_terbayar) row['Terbayar'] = b.nominal_terbayar || 0
        if (exportFields.sisa_tagihan) row['Sisa Tagihan'] = b.nominal - (b.nominal_terbayar || 0)
        if (exportFields.status) {
          row['Status'] = b.status === 'paid' ? 'LUNAS' : b.status === 'partial' ? 'DICICIL' : 'BELUM BAYAR'
        }
        return row
      })
    }

    const paidData = mapBillData(paidBills)
    const unpaidData = mapBillData(unpaidBills)

    // 4. Generate Workbook and Sheets
    const wb = XLSX.utils.book_new()
    
    const wsRingkasan = XLSX.utils.json_to_sheet(ringkasanData)
    const wsPaid = XLSX.utils.json_to_sheet(paidData)
    const wsUnpaid = XLSX.utils.json_to_sheet(unpaidData)

    // Append sheets to workbook
    XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan Laporan')
    XLSX.utils.book_append_sheet(wb, wsPaid, 'Siswa Sudah Lunas')
    XLSX.utils.book_append_sheet(wb, wsUnpaid, 'Siswa Belum Lunas')

    // Write file and trigger download
    const fileName = `Laporan_Tagihan_${exportCategory.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
    
    setIsExportModalOpen(false)
  }

  const handleTarikMassal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tarikTemplateId) {
      alert('Pilih jenis tagihan terlebih dahulu.')
      return
    }

    const template = templates.find(t => t.id === tarikTemplateId)
    if (!template) return
    
    // Build tagihanName to match
    let tagihanSuffix = ''
    if (template.tipe_periode === 'bulanan' && tarikBulan && tarikTahun) {
      tagihanSuffix = ` (${tarikBulan} ${tarikTahun})`
    } else if (template.tipe_periode === 'tahunan' && tarikTahun) {
      tagihanSuffix = ` (${tarikTahun})`
    }
    const finalJenisTagihan = `${template.jenis_tagihan}${tagihanSuffix}`

    // Find all matching bills
    let matchingBills = bills.filter(b => b.jenis_tagihan === finalJenisTagihan)

    if (tarikTargetGroup === 'angkatan') {
      matchingBills = matchingBills.filter(b => b.students?.angkatan === tarikAngkatan)
    } else if (tarikTargetGroup === 'kelas') {
      matchingBills = matchingBills.filter(b => b.students?.kelas === tarikKelas)
    }

    if (matchingBills.length === 0) {
      alert('Tidak ada tagihan yang ditemukan dengan kriteria tersebut.')
      return
    }

    const paidBills = matchingBills.filter(b => b.status === 'paid' || b.status === 'partial')
    const unpaidBills = matchingBills.filter(b => b.status === 'unpaid')

    let billsToDelete: Bill[] = []

    if (paidBills.length > 0) {
      const confirmStr = `Ditemukan ${matchingBills.length} tagihan. Namun, ${paidBills.length} di antaranya sudah lunas atau dicicil.\n\nKlik "OK" untuk REFUND (menghapus riwayat bayar dan tagihan).\nKlik "Cancel" untuk MEMBIARKAN UANG (hanya menghapus ${unpaidBills.length} tagihan belum dibayar).`
      
      if (window.confirm(confirmStr)) {
        billsToDelete = matchingBills // Hapus semua
      } else {
        billsToDelete = unpaidBills // Hapus yang unpaid saja
        if (billsToDelete.length === 0) {
          alert('Tidak ada tagihan yang belum dibayar. Operasi dibatalkan.')
          return
        }
      }
    } else {
      if (!window.confirm(`Ditemukan ${matchingBills.length} tagihan (semua belum dibayar). Yakin hapus/tarik tagihan tersebut?`)) {
        return
      }
      billsToDelete = matchingBills
    }

    setSubmitting(true)
    try {
      const idsToDelete = billsToDelete.map(b => b.id)
      const { error } = await supabase.from('bills').delete().in('id', idsToDelete)
      if (error) throw error

      alert(`Berhasil menarik ${idsToDelete.length} tagihan.`)
      fetchData()
    } catch (err: any) {
      alert(`Gagal menarik tagihan: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBayarManual = (bill: Bill) => {
    setActivePaymentBill(bill)
    setPaymentMode('full')
    setPartialAmount('')
    setAdvanceMonths('1')
  }

  const processPayment = async () => {
    if (!activePaymentBill) return
    const bill = activePaymentBill
    setSubmitting(true)
    try {
      if (paymentMode === 'full' || paymentMode === 'partial') {
        const sisa = bill.nominal - (bill.nominal_terbayar || 0)
        let payAmount = sisa
        
        if (paymentMode === 'partial') {
          payAmount = parseFloat(partialAmount)
          if (isNaN(payAmount) || payAmount <= 0) throw new Error('Nominal tidak valid')
          if (payAmount > sisa) throw new Error('Nominal melebihi sisa tagihan')
        }

        const newTerbayar = (bill.nominal_terbayar || 0) + payAmount
        const newStatus = newTerbayar >= bill.nominal ? 'paid' : 'partial'

        const { error: paymentError } = await supabase.from('payments').insert({
          bill_id: bill.id,
          nominal_dibayar: payAmount,
          status: 'approved',
          tanggal_bayar: new Date().toISOString(),
          catatan: paymentMode === 'full' ? 'Lunas bayar manual ke bendahara madrasah' : 'Cicilan bayar manual ke bendahara madrasah',
        })
        if (paymentError) throw paymentError

        const { error: billError } = await supabase.from('bills').update({
          nominal_terbayar: newTerbayar,
          status: newStatus
        }).eq('id', bill.id)
        if (billError) throw billError
        
        alert('Pembayaran berhasil dicatat.')
      } else if (paymentMode === 'advance') {
        const monthsToAdd = parseInt(advanceMonths)
        if (isNaN(monthsToAdd) || monthsToAdd <= 0) throw new Error('Jumlah bulan tidak valid')

        // 1. Pay current bill fully
        const sisa = bill.nominal - (bill.nominal_terbayar || 0)
        const { error: paymentError } = await supabase.from('payments').insert({
          bill_id: bill.id,
          nominal_dibayar: sisa,
          status: 'approved',
          tanggal_bayar: new Date().toISOString(),
          catatan: 'Lunas bayar manual ke bendahara madrasah',
        })
        if (paymentError) throw paymentError

        await supabase.from('bills').update({
          nominal_terbayar: bill.nominal,
          status: 'paid'
        }).eq('id', bill.id)

        // 2. Determine future bills
        const match = bill.jenis_tagihan.match(/^(.*?)\s*\((.*?)\s+(\d{4})\)$/)
        if (!match) throw new Error('Format nama tagihan tidak mendukung pembayaran maju. Format harus diakhiri dengan (Bulan Tahun).')

        const baseName = match[1].trim()
        const currentMonthName = match[2]
        const currentYear = parseInt(match[3])
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

        const monthIndex = months.indexOf(currentMonthName)
        if (monthIndex === -1) throw new Error('Bulan tidak valid pada nama tagihan.')

        // Create future bills sequentially
        for (let i = 1; i <= monthsToAdd; i++) {
          let nextMonthIndex = monthIndex + i
          let nextYear = currentYear
          while (nextMonthIndex > 11) {
            nextMonthIndex -= 12
            nextYear++
          }
          const nextMonthName = months[nextMonthIndex]
          const nextJenisTagihan = `${baseName} (${nextMonthName} ${nextYear})`

          const { data: existing } = await supabase
            .from('bills')
            .select('*')
            .eq('student_id', bill.student_id)
            .eq('jenis_tagihan', nextJenisTagihan)
            .maybeSingle()

          if (existing) {
             const sisaExisting = existing.nominal - (existing.nominal_terbayar || 0)
             if (sisaExisting > 0) {
               await supabase.from('payments').insert({
                  bill_id: existing.id,
                  nominal_dibayar: sisaExisting,
                  status: 'approved',
                  tanggal_bayar: new Date().toISOString(),
                  catatan: 'Lunas (Bayar Maju) ke bendahara',
               })
               await supabase.from('bills').update({
                  nominal_terbayar: existing.nominal,
                  status: 'paid'
               }).eq('id', existing.id)
             }
          } else {
             const { data: newBill, error: insertError } = await supabase.from('bills').insert({
               student_id: bill.student_id,
               jenis_tagihan: nextJenisTagihan,
               nominal: bill.nominal,
               nominal_terbayar: bill.nominal,
               status: 'paid'
             }).select('id').single()
             
             if (insertError) throw insertError
             
             await supabase.from('payments').insert({
                  bill_id: newBill.id,
                  nominal_dibayar: bill.nominal,
                  status: 'approved',
                  tanggal_bayar: new Date().toISOString(),
                  catatan: 'Lunas (Bayar Maju) ke bendahara',
             })
          }
        }
        
        alert(`Berhasil memproses pembayaran tagihan ini + ${monthsToAdd} bulan ke depan.`)
      }
      
      setActivePaymentBill(null)
      fetchData()
    } catch (err: any) {
      alert(`Gagal memproses pembayaran: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBayarManualMassal = async () => {
    if (selectedBills.size === 0) return
    if (!window.confirm(`Lakukan pembayaran manual untuk ${selectedBills.size} tagihan terpilih? \nStatus akan langsung menjadi Lunas.`)) return

    setSubmitting(true)
    try {
      const billsToPay = bills.filter(b => selectedBills.has(b.id))
      const paymentsToInsert = billsToPay.map(bill => ({
        bill_id: bill.id,
        nominal_dibayar: bill.nominal - (bill.nominal_terbayar || 0),
        status: 'approved',
        tanggal_bayar: new Date().toISOString(),
        catatan: 'Lunas bayar manual massal ke bendahara madrasah',
      }))

      const { error: paymentError } = await supabase.from('payments').insert(paymentsToInsert)
      if (paymentError) throw paymentError

      const updates = billsToPay.map(bill => 
        supabase.from('bills').update({
          nominal_terbayar: bill.nominal,
          status: 'paid'
        }).eq('id', bill.id)
      )
      
      await Promise.all(updates)

      alert('Pembayaran manual massal berhasil dicatat.')
      setSelectedBills(new Set())
      fetchData()
    } catch (err: any) {
      alert(`Gagal bayar manual massal: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleTarikManualMassal = async () => {
    if (selectedBills.size === 0) return
    const billsToDelete = bills.filter(b => selectedBills.has(b.id))
    
    const paidBills = billsToDelete.filter(b => b.status === 'paid' || b.status === 'partial')
    let finalBillsToDelete: Bill[] = []

    if (paidBills.length > 0) {
      const confirmStr = `Dari ${billsToDelete.length} tagihan terpilih, ada ${paidBills.length} yang sudah lunas/dicicil.\n\nKlik "OK" untuk REFUND (Menghapus riwayat bayar dan tagihan ini).\nKlik "Cancel" untuk MEMBATALKAN seluruh operasi penarikan.`
      if (window.confirm(confirmStr)) {
        finalBillsToDelete = billsToDelete
      } else {
        return
      }
    } else {
      if (!window.confirm(`Yakin hapus/tarik ${billsToDelete.length} tagihan terpilih?`)) {
        return
      }
      finalBillsToDelete = billsToDelete
    }

    setSubmitting(true)
    try {
      const idsToDelete = finalBillsToDelete.map(b => b.id)
      const { error } = await supabase.from('bills').delete().in('id', idsToDelete)
      if (error) throw error

      alert(`Berhasil menarik ${idsToDelete.length} tagihan secara massal.`)
      setSelectedBills(new Set())
      fetchData()
    } catch (err: any) {
      alert(`Gagal menarik tagihan massal: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Derived Stats
  const totalAktif = bills.length
  const totalBelumBayar = bills.filter(b => b.status === 'unpaid').length
  const totalLunas = bills.filter(b => b.status === 'paid').length

  const massalSelectedTemplate = templates.find(t => t.id === massalTemplateId)
  const tarikSelectedTemplate = templates.find(t => t.id === tarikTemplateId)

  // Filtered Bills
  const filteredBills = bills.filter(bill => {
    const baseName = getBaseJenisTagihan(bill.jenis_tagihan)
    const matchCategory = activeCategoryTab === 'Semua' || baseName === activeCategoryTab
    const matchName = bill.students?.nama.toLowerCase().includes(searchName.toLowerCase())
    const matchStatus = filterStatus === 'all' || bill.status === filterStatus
    const matchAngkatan = filterAngkatan === 'all' || bill.students?.angkatan === filterAngkatan
    return matchCategory && matchName && matchStatus && matchAngkatan
  })

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchName, filterAngkatan, filterStatus, activeCategoryTab])

  // Pagination calculation
  const totalItems = filteredBills.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1))
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const paginatedBills = filteredBills.slice(startIndex, startIndex + itemsPerPage)

  // Select Bills Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Hanya check yang ada di halaman ini
      const newSelected = new Set(selectedBills)
      paginatedBills.forEach(b => {
        if (b.status !== 'paid') newSelected.add(b.id)
      })
      setSelectedBills(newSelected)
    } else {
      // Uncheck yang ada di halaman ini
      const newSelected = new Set(selectedBills)
      paginatedBills.forEach(b => newSelected.delete(b.id))
      setSelectedBills(newSelected)
    }
  }

  const handleSelect = (billId: string) => {
    const newSelected = new Set(selectedBills)
    if (newSelected.has(billId)) {
      newSelected.delete(billId)
    } else {
      newSelected.add(billId)
    }
    setSelectedBills(newSelected)
  }

  // Get unique angkatans and kelas
  const uniqueAngkatans = Array.from(new Set(students.map(s => s.angkatan).filter(Boolean))).sort()
  const uniqueKelas = Array.from(new Set(students.map(s => s.kelas).filter(Boolean))).sort()
  const uniqueCategories = Array.from(new Set(bills.map(b => getBaseJenisTagihan(b.jenis_tagihan)))).sort()
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - 1 + i)

  return (
    <div className="p-0 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Manajemen Tagihan</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Kelola data tagihan siswa, buat tagihan baru, dan pantau status pembayaran.
          </p>
        </div>
        <Link
          to="/admin/tagihan-config"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl px-4 py-2.5 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Konfigurasi Tagihan
        </Link>
      </div>

      {/* Mobile Section Tabs */}
      <div className="md:hidden bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
        <Tabs value={activeMobileSectionTab} onValueChange={(val) => setActiveMobileSectionTab(val as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent">
            <TabsTrigger value="ringkasan" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold py-2">Ringkasan</TabsTrigger>
            <TabsTrigger value="buat" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold py-2">Buat Baru</TabsTrigger>
            <TabsTrigger value="daftar" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold py-2">Daftar</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className={cn(
        "grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3",
        activeMobileSectionTab === 'ringkasan' ? 'grid' : 'hidden md:grid'
      )}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium">Total Tagihan Aktif</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-sm sm:text-2xl font-bold">{totalAktif}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium">Belum Dibayar</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-sm sm:text-2xl font-bold text-red-600">{totalBelumBayar}</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium">Sudah Lunas</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-sm sm:text-2xl font-bold text-green-600">{totalLunas}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Create Bill */}
        <Card className={cn(
          "md:col-span-1 h-fit",
          activeMobileSectionTab === 'buat' ? 'block' : 'hidden md:block'
        )}>
          <CardHeader>
            <CardTitle>Buat Tagihan Baru</CardTitle>
            <CardDescription>
              Buat tagihan satu per satu atau secara massal sekaligus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-xl">
                ⚠️ Belum ada template jenis tagihan. Buat dulu di{' '}
                <Link to="/admin/tagihan-config" className="underline font-semibold">Konfigurasi Tagihan</Link>.
              </p>
            ) : (
              <Tabs defaultValue="individu" className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-4">
                  <TabsTrigger value="individu">Individu</TabsTrigger>
                  <TabsTrigger value="massal">Massal</TabsTrigger>
                  <TabsTrigger value="tarik">Tarik Tagihan</TabsTrigger>
                </TabsList>
                
                <TabsContent value="individu">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student">Pilih Siswa</Label>
                      <select
                        id="student"
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="" disabled>-- Pilih Siswa --</option>
                        {students
                          .filter(s => s.status !== 'lulus' && s.status !== 'keluar')
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.nisn} - {s.nama} (Kelas: {s.kelas || '-'}, Angkatan: {s.angkatan || '-'})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jenis">Jenis Tagihan</Label>
                      <select
                        id="jenis"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="" disabled>-- Pilih Jenis Tagihan --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.jenis_tagihan} ({formatCurrency(t.nominal)})</option>
                        ))}
                      </select>
                    </div>

                    {/* Info Override: Keringanan */}
                    {matchedOverride && matchedOverride.tipe === 'keringanan' && (
                      <div className="flex items-start gap-2.5 text-sky-700 bg-sky-50 border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs">
                        <Heart className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Keringanan aktif untuk siswa ini ({matchedOverride.alasan}).</p>
                          <p className="mt-0.5">Nominal otomatis diisi {formatCurrency(matchedOverride.nominal_override ?? 0)}, masih bisa disesuaikan bila perlu.</p>
                        </div>
                      </div>
                    )}

                    {/* Info Override: Gratis / Blocked */}
                    {isGratisBlocked && (
                      <div className="flex items-start gap-2.5 text-red-700 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 text-xs">
                        <Ban className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Tagihan ini otomatis diblokir.</p>
                          <p className="mt-0.5">
                            Siswa dibebaskan dari "{selectedTemplate?.jenis_tagihan}" ({matchedOverride?.alasan})
                            {matchedOverride?.end_date ? ` hingga ${new Date(matchedOverride.end_date).toLocaleDateString('id-ID')}` : ' sampai pengecualian dihapus'}.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="nominal">Nominal (Rp)</Label>
                      <Input
                        id="nominal"
                        type="number"
                        placeholder="Contoh: 150000"
                        value={nominal}
                        onChange={(e) => setNominal(e.target.value)}
                        required
                        min="0"
                        disabled={isGratisBlocked}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting || isGratisBlocked}>
                      {submitting ? 'Menyimpan...' : isGratisBlocked ? 'Diblokir (Gratis)' : 'Buat Tagihan'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="massal">
                  <form onSubmit={handleMassSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="massalJenis">Jenis Tagihan</Label>
                      <select
                        id="massalJenis"
                        value={massalTemplateId}
                        onChange={(e) => setMassalTemplateId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="" disabled>-- Pilih Jenis Tagihan --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.jenis_tagihan} ({formatCurrency(t.nominal)})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {massalSelectedTemplate?.tipe_periode === 'bulanan' && (
                        <div className="space-y-2">
                          <Label htmlFor="massalBulan">Bulan</Label>
                          <select
                            id="massalBulan"
                            value={massalBulan}
                            onChange={(e) => setMassalBulan(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                          >
                            <option value="">-- Pilih Bulan --</option>
                            {months.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {massalSelectedTemplate && massalSelectedTemplate.tipe_periode !== 'sekali_selama_sekolah' && (
                        <div className="space-y-2">
                          <Label htmlFor="massalTahun">Tahun</Label>
                          <select
                            id="massalTahun"
                            value={massalTahun}
                            onChange={(e) => setMassalTahun(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                          >
                            <option value="">-- Pilih Tahun --</option>
                            {years.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="massalTarget">Target Siswa</Label>
                      <select
                        id="massalTarget"
                        value={massalTargetGroup}
                        onChange={(e) => setMassalTargetGroup(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="all">Semua Siswa Aktif</option>
                        <option value="angkatan">Berdasarkan Angkatan</option>
                        <option value="kelas">Berdasarkan Kelas</option>
                      </select>
                    </div>

                    {massalTargetGroup === 'angkatan' && (
                      <div className="space-y-2">
                        <Label htmlFor="massalAngkatan">Pilih Angkatan</Label>
                        <select
                          id="massalAngkatan"
                          value={massalAngkatan}
                          onChange={(e) => setMassalAngkatan(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="" disabled>-- Pilih Angkatan --</option>
                          {uniqueAngkatans.map(a => (
                            <option key={a} value={a}>Angkatan {a}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {massalTargetGroup === 'kelas' && (
                      <div className="space-y-2">
                        <Label htmlFor="massalKelas">Pilih Kelas</Label>
                        <select
                          id="massalKelas"
                          value={massalKelas}
                          onChange={(e) => setMassalKelas(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="" disabled>-- Pilih Kelas --</option>
                          {uniqueKelas.map(k => (
                            <option key={k} value={k}>Kelas {k}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-100">
                      <strong>Info:</strong> Fitur tagihan massal akan otomatis mengabaikan siswa yang berstatus gratis, dan menyesuaikan nominal bagi siswa yang memiliki keringanan.
                    </div>

                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? 'Memproses...' : 'Buat Tagihan Massal'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="tarik">
                  <form onSubmit={handleTarikMassal} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tarikJenis">Jenis Tagihan</Label>
                      <select
                        id="tarikJenis"
                        value={tarikTemplateId}
                        onChange={(e) => setTarikTemplateId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="" disabled>-- Pilih Jenis Tagihan --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.jenis_tagihan} ({formatCurrency(t.nominal)})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {tarikSelectedTemplate?.tipe_periode === 'bulanan' && (
                        <div className="space-y-2">
                          <Label htmlFor="tarikBulan">Bulan</Label>
                          <select
                            id="tarikBulan"
                            value={tarikBulan}
                            onChange={(e) => setTarikBulan(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">-- Kosongkan Jika Tanpa Bulan --</option>
                            {months.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {tarikSelectedTemplate && tarikSelectedTemplate.tipe_periode !== 'sekali_selama_sekolah' && (
                        <div className="space-y-2">
                          <Label htmlFor="tarikTahun">Tahun</Label>
                          <select
                            id="tarikTahun"
                            value={tarikTahun}
                            onChange={(e) => setTarikTahun(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">-- Kosongkan Jika Tanpa Tahun --</option>
                            {years.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tarikTarget">Target Siswa</Label>
                      <select
                        id="tarikTarget"
                        value={tarikTargetGroup}
                        onChange={(e) => setTarikTargetGroup(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="all">Semua Siswa Aktif</option>
                        <option value="angkatan">Berdasarkan Angkatan</option>
                        <option value="kelas">Berdasarkan Kelas</option>
                      </select>
                    </div>

                    {tarikTargetGroup === 'angkatan' && (
                      <div className="space-y-2">
                        <Label htmlFor="tarikAngkatan">Pilih Angkatan</Label>
                        <select
                          id="tarikAngkatan"
                          value={tarikAngkatan}
                          onChange={(e) => setTarikAngkatan(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="" disabled>-- Pilih Angkatan --</option>
                          {uniqueAngkatans.map(a => (
                            <option key={a} value={a}>Angkatan {a}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {tarikTargetGroup === 'kelas' && (
                      <div className="space-y-2">
                        <Label htmlFor="tarikKelas">Pilih Kelas</Label>
                        <select
                          id="tarikKelas"
                          value={tarikKelas}
                          onChange={(e) => setTarikKelas(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="" disabled>-- Pilih Kelas --</option>
                          {uniqueKelas.map(k => (
                            <option key={k} value={k}>Kelas {k}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-100">
                      <strong>Peringatan:</strong> Menarik tagihan massal akan membatalkan (menghapus) tagihan. Jika ada pembayaran yang sudah masuk, Anda akan diberikan pilihan untuk me-refund uang atau tidak.
                    </div>

                    <Button type="submit" variant="destructive" className="w-full bg-red-600 hover:bg-red-700" disabled={submitting}>
                      {submitting ? 'Memproses...' : 'Tarik Tagihan Massal'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Bills Table */}
        <Card className={cn(
          "md:col-span-2",
          activeMobileSectionTab === 'daftar' ? 'block' : 'hidden md:block'
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Daftar Tagihan</CardTitle>
              <CardDescription>Daftar semua tagihan siswa dan status pembayarannya.</CardDescription>
            </div>
            <Button
              onClick={() => {
                setExportCategory(activeCategoryTab)
                setIsExportModalOpen(true)
              }}
              variant="outline"
              className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Download className="h-4 w-4" />
              Ekspor Laporan
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Tabs per Jenis Tagihan */}
            {uniqueCategories.length > 0 && (
              <div className="flex overflow-x-auto pb-2 gap-2 w-full no-scrollbar">
                <button
                  onClick={() => setActiveCategoryTab('Semua')}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${activeCategoryTab === 'Semua' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Semua Tagihan
                </button>
                {uniqueCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategoryTab(cat)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${activeCategoryTab === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="search">Cari Siswa</Label>
                <Input 
                  id="search" 
                  placeholder="Nama Siswa..." 
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48 space-y-1">
                <Label htmlFor="angkatanFilter">Filter Angkatan</Label>
                <select 
                  id="angkatanFilter"
                  value={filterAngkatan}
                  onChange={(e) => setFilterAngkatan(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">Semua Angkatan</option>
                  {uniqueAngkatans.map(a => (
                    <option key={a} value={a}>Angkatan {a}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-48 space-y-1">
                <Label htmlFor="statusFilter">Filter Status</Label>
                <select 
                  id="statusFilter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">Semua Status</option>
                  <option value="unpaid">Belum Bayar</option>
                  <option value="partial">Bayar Sebagian</option>
                  <option value="paid">Lunas</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {selectedBills.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
                <span className="text-sm font-semibold text-blue-800">{selectedBills.size} Tagihan terpilih</span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    onClick={handleTarikManualMassal} 
                    disabled={submitting}
                    variant="destructive"
                    className="h-8 flex-1 sm:flex-none"
                  >
                    Tarik {selectedBills.size} Tagihan
                  </Button>
                  <Button 
                    onClick={handleBayarManualMassal} 
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 h-8 flex-1 sm:flex-none"
                  >
                    Bayar Manual {selectedBills.size} Tagihan
                  </Button>
                </div>
              </div>
            )}
            {/* Mobile List View (md:hidden) */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Memuat data...</div>
              ) : paginatedBills.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Tidak ada tagihan ditemukan</div>
              ) : (
                paginatedBills.map((bill) => (
                  <div key={bill.id} className="bg-white border rounded-xl p-3.5 shadow-sm space-y-2.5">
                    {/* Top Section: Checkbox + Name & NISN */}
                    <div className="flex items-start gap-2.5">
                      {bill.status !== 'paid' && (
                        <input 
                          type="checkbox" 
                          className="w-4.5 h-4.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
                          checked={selectedBills.has(bill.id)}
                          onChange={() => handleSelect(bill.id)}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-slate-800 text-xs truncate leading-normal">{bill.students?.nama}</h5>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
                          {bill.students?.nisn} &middot; Angkatan {bill.students?.angkatan || '-'} {bill.students?.kelas ? `(Kelas ${bill.students.kelas})` : '(Keluar/Alumni)'}
                        </p>
                      </div>
                    </div>

                    {/* Mid Section: Tagihan Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-b border-slate-50/80">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Jenis Tagihan</span>
                        <span className="font-bold text-slate-700 mt-0.5 block">{bill.jenis_tagihan}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Nominal</span>
                        <span className="font-extrabold text-slate-800 mt-0.5 block">
                          {formatCurrency(bill.nominal)}
                          {bill.status === 'partial' && (
                            <span className="text-[9px] font-bold text-red-500 block mt-0.5">
                              Sisa: {formatCurrency(bill.nominal - (bill.nominal_terbayar || 0))}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Section: Status, Date, Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold capitalize
                          ${bill.status === 'paid' ? 'bg-green-50 text-green-700 border border-green-200' : 
                            bill.status === 'partial' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 
                            'bg-red-50 text-red-700 border border-red-200'}`}>
                          {bill.status === 'paid' ? 'Lunas' : 
                           bill.status === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                        </span>
                        <span className="text-[9px] text-slate-400">{new Date(bill.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                      
                      {bill.status !== 'paid' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-[10px] h-7 px-3 font-bold text-blue-600 border-blue-200 hover:bg-blue-50 bg-white rounded-lg shadow-sm"
                          onClick={() => handleBayarManual(bill)}
                          disabled={submitting}
                        >
                          Bayar Manual
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block border rounded-md overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th scope="col" className="p-4 w-4">
                      <input 
                        type="checkbox" 
                        className="w-4.5 h-4.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" 
                        onChange={handleSelectAll}
                        checked={paginatedBills.length > 0 && paginatedBills.filter(b => b.status !== 'paid').length > 0 && paginatedBills.filter(b => b.status !== 'paid').every(b => selectedBills.has(b.id))}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3">Nama Siswa</th>
                    <th scope="col" className="px-6 py-3">Jenis Tagihan</th>
                    <th scope="col" className="px-6 py-3">Nominal</th>
                    <th scope="col" className="px-6 py-3">Tanggal Dibuat</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center">Memuat data...</td>
                    </tr>
                  ) : paginatedBills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center">Tidak ada tagihan ditemukan</td>
                    </tr>
                  ) : (
                    paginatedBills.map((bill) => (
                      <tr key={bill.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="p-4">
                          {bill.status !== 'paid' ? (
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                              checked={selectedBills.has(bill.id)}
                              onChange={() => handleSelect(bill.id)}
                            />
                          ) : null}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {bill.students?.nama}
                          <div className="text-xs text-gray-500">
                            {bill.students?.nisn} &middot; Angkatan {bill.students?.angkatan || '-'} {bill.students?.kelas ? `(Kelas ${bill.students.kelas})` : '(Keluar/Alumni)'}
                          </div>
                        </td>
                        <td className="px-6 py-4">{bill.jenis_tagihan}</td>
                        <td className="px-6 py-4">
                          {formatCurrency(bill.nominal)}
                          {bill.status === 'partial' && (
                            <div className="text-[10px] font-bold text-red-500 mt-1">
                              Sisa: {formatCurrency(bill.nominal - (bill.nominal_terbayar || 0))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">{new Date(bill.created_at).toLocaleDateString('id-ID')}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${bill.status === 'paid' ? 'bg-green-100 text-green-800' : 
                              bill.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {bill.status === 'paid' ? 'Lunas' : 
                             bill.status === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
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

            {/* Pagination Controls */}
            {filteredBills.length > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100 text-xs md:text-sm text-slate-500 w-full">
                {/* Tampilkan data per halaman */}
                <div className="flex items-center justify-center gap-2 w-full md:w-auto">
                  <span>Tampilkan:</span>
                  <select
                    className="border-slate-200 rounded-lg text-xs md:text-sm focus:ring-indigo-500 focus:border-indigo-500 p-1.5 bg-white shadow-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>data per halaman</span>
                </div>

                {/* Info & Navigasi Halaman */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full md:w-auto">
                  <span className="text-center sm:text-left text-slate-400">
                    Menampilkan <span className="font-semibold text-slate-700">{startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)}</span> dari <span className="font-semibold text-slate-700">{totalItems}</span> data
                  </span>
                  
                  {/* Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage === 1}
                      className="px-3 h-8 text-xs font-semibold rounded-lg bg-white"
                    >
                      Sebelumnya
                    </Button>
                    <span className="px-3 h-8 flex items-center justify-center font-bold text-slate-700 bg-slate-100 rounded-lg text-xs min-w-[50px]">
                      {safeCurrentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="px-3 h-8 text-xs font-semibold rounded-lg bg-white"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      {activePaymentBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Opsi Pembayaran Manual</h2>
              <p className="text-sm text-gray-500 mt-1">
                {activePaymentBill.students?.nama} - {activePaymentBill.jenis_tagihan}
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Pilih Metode</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className={`cursor-pointer rounded-lg border p-3 flex flex-col gap-1 items-center justify-center text-center transition-colors ${paymentMode === 'full' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'hover:bg-gray-50 border-gray-200'}`}>
                    <input type="radio" name="paymentMode" className="sr-only" checked={paymentMode === 'full'} onChange={() => setPaymentMode('full')} />
                    <span className="font-semibold text-sm">Bayar Penuh</span>
                  </label>
                  <label className={`cursor-pointer rounded-lg border p-3 flex flex-col gap-1 items-center justify-center text-center transition-colors ${paymentMode === 'partial' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'hover:bg-gray-50 border-gray-200'}`}>
                    <input type="radio" name="paymentMode" className="sr-only" checked={paymentMode === 'partial'} onChange={() => setPaymentMode('partial')} />
                    <span className="font-semibold text-sm">Bayar Cicil</span>
                  </label>
                  <label className={`cursor-pointer rounded-lg border p-3 flex flex-col gap-1 items-center justify-center text-center transition-colors ${(activePaymentBill.jenis_tagihan.match(/\(.*\)/) && paymentMode === 'advance') ? 'bg-blue-50 border-blue-600 text-blue-700' : 'hover:bg-gray-50 border-gray-200'} ${!activePaymentBill.jenis_tagihan.match(/\(.*\)/) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input type="radio" name="paymentMode" className="sr-only" disabled={!activePaymentBill.jenis_tagihan.match(/\(.*\)/)} checked={paymentMode === 'advance'} onChange={() => setPaymentMode('advance')} />
                    <span className="font-semibold text-sm">Bayar Maju</span>
                  </label>
                </div>
                {!activePaymentBill.jenis_tagihan.match(/\(.*\)/) && (
                  <p className="text-xs text-orange-600 mt-1">Opsi Bayar Maju hanya untuk tagihan berformat bulanan (contoh: SPP (Juli 2026)).</p>
                )}
              </div>

              {paymentMode === 'full' && (
                <div className="bg-gray-50 p-4 rounded-lg border text-center">
                  <p className="text-sm text-gray-500 mb-1">Total Sisa Tagihan</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(activePaymentBill.nominal - (activePaymentBill.nominal_terbayar || 0))}</p>
                </div>
              )}

              {paymentMode === 'partial' && (
                <div className="space-y-2">
                  <Label htmlFor="partialAmount">Nominal Cicilan (Rp)</Label>
                  <Input 
                    id="partialAmount" 
                    type="number" 
                    placeholder="Contoh: 50000"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    max={activePaymentBill.nominal - (activePaymentBill.nominal_terbayar || 0)}
                  />
                  <p className="text-xs text-gray-500">
                    Sisa tagihan maksimal: {formatCurrency(activePaymentBill.nominal - (activePaymentBill.nominal_terbayar || 0))}
                  </p>
                </div>
              )}

              {paymentMode === 'advance' && (
                <div className="space-y-2">
                  <Label htmlFor="advanceMonths">Bayar Maju Berapa Bulan?</Label>
                  <Input 
                    id="advanceMonths" 
                    type="number" 
                    placeholder="Contoh: 1, 2, 3..."
                    value={advanceMonths}
                    onChange={(e) => setAdvanceMonths(e.target.value)}
                    min="1"
                    max="12"
                  />
                  <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100 leading-relaxed">
                    <strong>Catatan:</strong> Fitur ini akan melunasi tagihan saat ini secara penuh, dan sekaligus melunasi (serta membuatkan jika belum ada) tagihan untuk <strong>{advanceMonths || 0} bulan berikutnya</strong> dengan nominal yang sama.
                  </div>
                </div>
              )}

            </div>
            
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActivePaymentBill(null)} disabled={submitting}>
                Batal
              </Button>
              <Button onClick={processPayment} disabled={submitting || (paymentMode === 'partial' && !partialAmount) || (paymentMode === 'advance' && !advanceMonths)}>
                {submitting ? 'Memproses...' : 'Proses Pembayaran'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                <Download className="h-5 w-5 text-indigo-600" />
                Ekspor Laporan Tagihan
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Unduh file Excel (.xlsx) berisi ringkasan pembayaran dan daftar status kelunasan siswa.
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Category Select */}
              <div className="space-y-2">
                <Label htmlFor="exportCategorySelect" className="font-semibold text-gray-700">Kategori Tagihan</Label>
                <select
                  id="exportCategorySelect"
                  value={exportCategory}
                  onChange={(e) => setExportCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="Semua">Semua Kategori Tagihan</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Data yang diekspor akan dikelompokkan menjadi sheet Ringkasan, Lunas, dan Belum Lunas.
                </p>
              </div>

              {/* Fields Checklist */}
              <div className="space-y-3">
                <Label className="font-semibold text-gray-700">Sertakan Data Siswa & Tagihan</Label>
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportFields.nisn}
                      onChange={(e) => setExportFields(prev => ({ ...prev, nisn: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    NISN
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportFields.nama}
                      onChange={(e) => setExportFields(prev => ({ ...prev, nama: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Nama Siswa
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportFields.kelas}
                      onChange={(e) => setExportFields(prev => ({ ...prev, kelas: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Kelas
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportFields.angkatan}
                      onChange={(e) => setExportFields(prev => ({ ...prev, angkatan: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Angkatan
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportFields.nominal}
                      onChange={(e) => setExportFields(prev => ({ ...prev, nominal: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Nominal Tagihan
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportFields.nominal_terbayar}
                      onChange={(e) => setExportFields(prev => ({ ...prev, nominal_terbayar: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Nominal Terbayar
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportFields.sisa_tagihan}
                      onChange={(e) => setExportFields(prev => ({ ...prev, sisa_tagihan: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Sisa Tagihan
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportFields.status}
                      onChange={(e) => setExportFields(prev => ({ ...prev, status: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Status Pembayaran
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleExportExcel} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                <Download className="h-4 w-4" />
                Unduh Excel (.xlsx)
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
