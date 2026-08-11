import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileText, Trophy, Heart, Plus, Trash2, ToggleLeft, ToggleRight,
  Loader2, AlertTriangle, CheckCircle2, X, Edit2
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BillingTemplate {
  id: string
  jenis_tagihan: string
  nominal: number
  tipe_periode: 'bulanan' | 'tahunan' | 'sekali_selama_sekolah'
  keterangan: string | null
  is_active: boolean
  created_at: string
}

interface Student {
  id: string
  nisn: string
  nama: string
  kelas: string
  angkatan: string
}

interface Override {
  id: string
  student_id: string
  billing_template_id: string
  tipe: 'gratis' | 'keringanan'
  nominal_override: number | null
  alasan: string
  start_date: string
  end_date: string | null
  created_at: string
  students?: { nama: string; nisn: string; kelas: string }
  billing_templates?: { jenis_tagihan: string; nominal: number }
}

interface ExistingBill {
  id: string
  created_at: string
  nominal: number
}

function SearchableStudentSelect({ value, onChange, students, placeholder, focusRingColor }: any) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedStudent = students.find((s: any) => s.id === value)

  useEffect(() => {
    if (selectedStudent) {
      setSearch(`${selectedStudent.nama} (${selectedStudent.kelas || selectedStudent.angkatan})`)
    } else {
      setSearch('')
    }
  }, [value, selectedStudent])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        if (selectedStudent) {
          setSearch(`${selectedStudent.nama} (${selectedStudent.kelas || selectedStudent.angkatan})`)
        } else {
          setSearch('')
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [wrapperRef, selectedStudent])

  const filtered = students.filter((s: any) => 
    s.nama.toLowerCase().includes(search.toLowerCase()) || 
    (s.kelas && s.kelas.toLowerCase().includes(search.toLowerCase())) ||
    (s.angkatan && s.angkatan.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          if (!isOpen) setIsOpen(true)
          if (e.target.value === '') onChange('')
        }}
        onFocus={() => setIsOpen(true)}
        className={`flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 ${focusRingColor}`}
      />
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">Siswa tidak ditemukan</div>
          ) : (
            filtered.map((s: any) => (
              <div
                key={s.id}
                onClick={() => {
                  onChange(s.id)
                  setIsOpen(false)
                }}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100"
              >
                {s.nama} <span className="text-gray-500 text-xs">({s.kelas || s.angkatan})</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const ALASAN_PRESET_GRATIS = ['Juara Paralel', 'Juara Umum', 'Juara Kelas', 'Beasiswa Penuh', 'Lainnya']
const ALASAN_PRESET_KERINGANAN = ['Kurang Mampu', 'Yatim/Piatu', 'Beasiswa Parsial', 'Keringanan Khusus', 'Lainnya']

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TagihanConfig() {
  const [activeTab, setActiveTab] = useState<'template' | 'berprestasi' | 'keringanan'>('template')

  // ── Shared Data ──
  const [templates, setTemplates] = useState<BillingTemplate[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [overrides, setOverrides] = useState<Override[]>([])
  const [loading, setLoading] = useState(true)

  // ── Template Form ──
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [tplJenis, setTplJenis] = useState('')
  const [tplNominal, setTplNominal] = useState('')
  const [tplPeriode, setTplPeriode] = useState<'bulanan' | 'tahunan' | 'sekali_selama_sekolah'>('bulanan')
  const [tplKet, setTplKet] = useState('')
  const [tplSubmitting, setTplSubmitting] = useState(false)

  // ── Berprestasi Form ──
  const [editingBpId, setEditingBpId] = useState<string | null>(null)
  const [bpStudent, setBpStudent] = useState('')
  const [bpTemplate, setBpTemplate] = useState('')
  const [bpAlasan, setBpAlasan] = useState('')
  const [bpAlasanCustom, setBpAlasanCustom] = useState('')
  const [bpStartDate, setBpStartDate] = useState('')
  const [bpEndDate, setBpEndDate] = useState('')
  const [bpSubmitting, setBpSubmitting] = useState(false)

  // ── Retroactive confirm dialog ──
  const [retroBills, setRetroBills] = useState<ExistingBill[]>([])
  const [retroPending, setRetroPending] = useState<{ student_id: string; template_id: string; alasan: string; start_date: string; end_date: string } | null>(null)
  const [retroDeleting, setRetroDeleting] = useState(false)

  // ── Keringanan Form ──
  const [editingKmId, setEditingKmId] = useState<string | null>(null)
  const [kmStudent, setKmStudent] = useState('')
  const [kmTemplate, setKmTemplate] = useState('')
  const [kmNominal, setKmNominal] = useState('')
  const [kmAlasan, setKmAlasan] = useState('')
  const [kmAlasanCustom, setKmAlasanCustom] = useState('')
  const [kmSubmitting, setKmSubmitting] = useState(false)

  // ── Feedback ──
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ─── Load Data ───────────────────────────────────────────────────────────
  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [tplRes, stuRes, ovrRes] = await Promise.all([
        supabase.from('billing_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('students').select('id,nisn,nama,kelas,angkatan').eq('status', 'aktif').order('nama'),
        supabase.from('student_billing_overrides')
          .select(`*, students:student_id(nama,nisn,kelas), billing_templates:billing_template_id(jenis_tagihan,nominal)`)
          .order('created_at', { ascending: false })
      ])
      if (tplRes.data) setTemplates(tplRes.data as BillingTemplate[])
      if (stuRes.data) setStudents(stuRes.data as Student[])
      if (ovrRes.data) setOverrides(ovrRes.data as Override[])
    } finally {
      setLoading(false)
    }
  }

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  // ─── Tab 1: Template ─────────────────────────────────────────────────────

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tplJenis || !tplNominal) return
    setTplSubmitting(true)
    try {
      if (editingTemplateId) {
        const { error } = await supabase.from('billing_templates').update({
          jenis_tagihan: tplJenis.trim(),
          nominal: parseFloat(tplNominal),
          tipe_periode: tplPeriode,
          keterangan: tplKet.trim() || null,
        }).eq('id', editingTemplateId)
        if (error) throw error
        showMsg('success', 'Template tagihan berhasil diperbarui!')
      } else {
        const { error } = await supabase.from('billing_templates').insert({
          jenis_tagihan: tplJenis.trim(),
          nominal: parseFloat(tplNominal),
          tipe_periode: tplPeriode,
          keterangan: tplKet.trim() || null,
          is_active: true
        })
        if (error) throw error
        showMsg('success', 'Template tagihan berhasil ditambahkan!')
      }
      handleCancelEditTemplate()
      await fetchAll()
    } catch (err: any) {
      showMsg('error', err.message || 'Gagal menyimpan template.')
    } finally {
      setTplSubmitting(false)
    }
  }

  const handleCancelEditTemplate = () => {
    setEditingTemplateId(null)
    setTplJenis('')
    setTplNominal('')
    setTplPeriode('bulanan')
    setTplKet('')
  }

  const handleEditTemplate = (t: BillingTemplate) => {
    setEditingTemplateId(t.id)
    setTplJenis(t.jenis_tagihan)
    setTplNominal(String(t.nominal))
    setTplPeriode(t.tipe_periode)
    setTplKet(t.keterangan || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggleTemplate = async (id: string, current: boolean) => {
    await supabase.from('billing_templates').update({ is_active: !current }).eq('id', id)
    await fetchAll()
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Hapus template ini? Override yang menggunakan template ini juga akan terhapus.')) return
    await supabase.from('billing_templates').delete().eq('id', id)
    await fetchAll()
    showMsg('success', 'Template dihapus.')
  }

  // ─── Tab 2: Berprestasi ──────────────────────────────────────────────────

  const handleSaveBerprestasi = async (e: React.FormEvent) => {
    e.preventDefault()
    const alasanFinal = bpAlasan === 'Lainnya' ? bpAlasanCustom.trim() : bpAlasan
    if (!bpStudent || !bpTemplate || !alasanFinal || !bpStartDate) return

    setBpSubmitting(true)
    try {
      if (editingBpId) {
        const { error } = await supabase.from('student_billing_overrides').update({
          student_id: bpStudent,
          billing_template_id: bpTemplate,
          tipe: 'gratis',
          alasan: alasanFinal,
          start_date: bpStartDate,
          end_date: bpEndDate || null
        }).eq('id', editingBpId)
        if (error) throw error
        showMsg('success', 'Pengecualian berhasil diperbarui!')
        handleCancelEditBerprestasi()
        await fetchAll()
        setBpSubmitting(false)
        return
      }

      // Cek tagihan unpaid yang sudah ada untuk siswa + jenis ini (Hanya untuk insert baru)
      const template = templates.find(t => t.id === bpTemplate)
      const { data: existingBills } = await supabase
        .from('bills')
        .select('id, created_at, nominal')
        .eq('student_id', bpStudent)
        .eq('jenis_tagihan', template?.jenis_tagihan || '')
        .eq('status', 'unpaid')
        .gte('created_at', bpStartDate)

      if (existingBills && existingBills.length > 0) {
        // Ada tagihan → tunda insert, tampilkan dialog konfirmasi
        setRetroBills(existingBills as ExistingBill[])
        setRetroPending({
          student_id: bpStudent,
          template_id: bpTemplate,
          alasan: alasanFinal,
          start_date: bpStartDate,
          end_date: bpEndDate
        })
        setBpSubmitting(false)
        return
      }

      // Tidak ada tagihan existing → langsung insert
      await insertBerprestasiOverride(bpStudent, bpTemplate, alasanFinal, bpStartDate, bpEndDate, [])
    } catch (err: any) {
      showMsg('error', err.message || 'Gagal menyimpan pengecualian.')
      setBpSubmitting(false)
    }
  }

  const insertBerprestasiOverride = async (
    studentId: string, templateId: string, alasan: string,
    startDate: string, endDate: string, billsToDelete: ExistingBill[]
  ) => {
    try {
      // Delete retroactive bills if any
      if (billsToDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('bills').delete()
          .in('id', billsToDelete.map(b => b.id))
        if (delErr) throw delErr
      }
      // Insert override
      const { error } = await supabase.from('student_billing_overrides').insert({
        student_id: studentId,
        billing_template_id: templateId,
        tipe: 'gratis',
        alasan,
        start_date: startDate,
        end_date: endDate || null
      })
      if (error) throw error

      setBpStudent(''); setBpTemplate(''); setBpAlasan(''); setBpAlasanCustom('')
      setBpStartDate(''); setBpEndDate('')
      setRetroBills([]); setRetroPending(null)
      await fetchAll()
      showMsg('success', `Pengecualian disimpan${billsToDelete.length > 0 ? ` + ${billsToDelete.length} tagihan dihapus` : ''}.`)
    } catch (err: any) {
      showMsg('error', err.message || 'Gagal.')
    } finally {
      setBpSubmitting(false)
      setRetroDeleting(false)
    }
  }

  const handleEditBerprestasi = (o: Override) => {
    setEditingBpId(o.id)
    setBpStudent(o.student_id)
    setBpTemplate(o.billing_template_id)
    const isCustomAlasan = !ALASAN_PRESET_GRATIS.includes(o.alasan)
    setBpAlasan(isCustomAlasan ? 'Lainnya' : o.alasan)
    setBpAlasanCustom(isCustomAlasan ? o.alasan : '')
    setBpStartDate(o.start_date.split('T')[0])
    setBpEndDate(o.end_date ? o.end_date.split('T')[0] : '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEditBerprestasi = () => {
    setEditingBpId(null)
    setBpStudent('')
    setBpTemplate('')
    setBpAlasan('')
    setBpAlasanCustom('')
    setBpStartDate('')
    setBpEndDate('')
  }

  const handleConfirmRetro = async (deleteExisting: boolean) => {
    if (!retroPending) return
    setRetroDeleting(true)
    await insertBerprestasiOverride(
      retroPending.student_id, retroPending.template_id,
      retroPending.alasan, retroPending.start_date, retroPending.end_date,
      deleteExisting ? retroBills : []
    )
  }

  // ─── Tab 3: Keringanan ───────────────────────────────────────────────────

  const handleSaveKeringanan = async (e: React.FormEvent) => {
    e.preventDefault()
    const alasanFinal = kmAlasan === 'Lainnya' ? kmAlasanCustom.trim() : kmAlasan
    if (!kmStudent || !kmTemplate || !alasanFinal || kmNominal === '') return
    setKmSubmitting(true)
    try {
      if (editingKmId) {
        const { error } = await supabase.from('student_billing_overrides').update({
          student_id: kmStudent,
          billing_template_id: kmTemplate,
          tipe: 'keringanan',
          nominal_override: parseFloat(kmNominal),
          alasan: alasanFinal,
        }).eq('id', editingKmId)
        if (error) throw error
        showMsg('success', 'Keringanan berhasil diperbarui!')
      } else {
        const { error } = await supabase.from('student_billing_overrides').insert({
          student_id: kmStudent,
          billing_template_id: kmTemplate,
          tipe: 'keringanan',
          nominal_override: parseFloat(kmNominal),
          alasan: alasanFinal,
          start_date: new Date().toISOString().split('T')[0],
          end_date: null
        })
        if (error) throw error
        showMsg('success', 'Keringanan berhasil disimpan!')
      }
      handleCancelEditKeringanan()
      await fetchAll()
    } catch (err: any) {
      showMsg('error', err.message || 'Gagal menyimpan keringanan.')
    } finally {
      setKmSubmitting(false)
    }
  }

  const handleCancelEditKeringanan = () => {
    setEditingKmId(null)
    setKmStudent('')
    setKmTemplate('')
    setKmNominal('')
    setKmAlasan('')
    setKmAlasanCustom('')
  }

  const handleEditKeringanan = (o: Override) => {
    setEditingKmId(o.id)
    setKmStudent(o.student_id)
    setKmTemplate(o.billing_template_id)
    setKmNominal(String(o.nominal_override || 0))
    const isCustomAlasan = !ALASAN_PRESET_KERINGANAN.includes(o.alasan)
    setKmAlasan(isCustomAlasan ? 'Lainnya' : o.alasan)
    setKmAlasanCustom(isCustomAlasan ? o.alasan : '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('Hapus konfigurasi ini?')) return
    await supabase.from('student_billing_overrides').delete().eq('id', id)
    await fetchAll()
    showMsg('success', 'Konfigurasi dihapus.')
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const activeTemplates = templates.filter(t => t.is_active)
  const gratisOverrides = overrides.filter(o => o.tipe === 'gratis')
  const keringananOverrides = overrides.filter(o => o.tipe === 'keringanan')
  const kmSelectedTemplate = templates.find(t => t.id === kmTemplate)

  const tabs = [
    { key: 'template', label: 'Template Tagihan', icon: FileText, count: templates.length },
    { key: 'berprestasi', label: 'Pengecualian Berprestasi', icon: Trophy, count: gratisOverrides.length },
    { key: 'keringanan', label: 'Keringanan Kurang Mampu', icon: Heart, count: keringananOverrides.length },
  ] as const

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Konfigurasi Tagihan</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Kelola template tagihan, pengecualian siswa berprestasi, dan keringanan siswa kurang mampu.
        </p>
      </div>

      {/* Feedback Message */}
      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
          msg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* Retroactive Delete Dialog */}
      {retroPending && retroBills.length > 0 && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Tagihan Sudah Tergenerate</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ditemukan <strong>{retroBills.length} tagihan unpaid</strong> untuk siswa ini dengan jenis yang sama mulai tanggal yang dikonfigurasi.
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 mb-4 space-y-1.5 max-h-40 overflow-y-auto">
              {retroBills.map(b => (
                <div key={b.id} className="flex justify-between items-center text-xs px-2 py-1.5 bg-white rounded-xl border border-slate-100">
                  <span className="text-slate-600">Dibuat: {new Date(b.created_at).toLocaleDateString('id-ID')}</span>
                  <span className="font-bold text-red-600">{formatCurrency(b.nominal)}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 mb-5">Apakah tagihan-tagihan di atas juga ingin dihapus sekarang?</p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleConfirmRetro(true)}
                disabled={retroDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                {retroDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Ya, Hapus Tagihan
              </Button>
              <Button
                onClick={() => handleConfirmRetro(false)}
                disabled={retroDeleting}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                Tidak, Biarkan
              </Button>
            </div>
            <button
              onClick={() => { setRetroPending(null); setRetroBills([]) }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-100/70 p-1.5 rounded-2xl w-fit">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === key ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat data...
        </div>
      ) : (
        <>
          {/* ── TAB 1: TEMPLATE ── */}
          {activeTab === 'template' && (
            <div className="grid gap-6 md:grid-cols-[380px_1fr]">
              {/* Form */}
              <Card className="rounded-3xl border-slate-100 shadow-sm h-fit">
                <CardHeader className="pb-4 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${editingTemplateId ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {editingTemplateId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                    <div>
                      <CardTitle className="text-base">{editingTemplateId ? 'Edit Template' : 'Tambah Template'}</CardTitle>
                      <CardDescription className="text-xs">{editingTemplateId ? 'Perbarui informasi template tagihan' : 'Jenis tagihan standar yang bisa dipilih ulang'}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <form onSubmit={handleSaveTemplate} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="tpl_jenis">Jenis Tagihan</Label>
                      <Input id="tpl_jenis" placeholder="Contoh: SPP, PU, Buku Paket" value={tplJenis}
                        onChange={e => setTplJenis(e.target.value)} required className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tpl_nominal">Nominal Standar (Rp)</Label>
                      <Input id="tpl_nominal" type="number" min="0" placeholder="150000" value={tplNominal}
                        onChange={e => setTplNominal(e.target.value)} required className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tpl_periode">Siklus Tagihan</Label>
                      <select id="tpl_periode" value={tplPeriode} onChange={e => setTplPeriode(e.target.value as any)} required
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                        <option value="bulanan">Bulanan</option>
                        <option value="tahunan">Tahunan</option>
                        <option value="sekali_selama_sekolah">Sekali Selama Sekolah</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tpl_ket">Keterangan <span className="text-slate-400">(opsional)</span></Label>
                      <Input id="tpl_ket" placeholder="Catatan tambahan..." value={tplKet}
                        onChange={e => setTplKet(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={tplSubmitting} className={`flex-1 rounded-xl ${editingTemplateId ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                        {tplSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingTemplateId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
                        {editingTemplateId ? 'Simpan Perubahan' : 'Tambah Template'}
                      </Button>
                      {editingTemplateId && (
                        <Button type="button" variant="outline" onClick={handleCancelEditTemplate} className="rounded-xl flex-shrink-0">
                          Batal
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* List */}
              <Card className="rounded-3xl border-slate-100 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-50">
                  <CardTitle className="text-base">Daftar Template ({templates.length})</CardTitle>
                  <CardDescription className="text-xs">Template aktif akan muncul di dropdown saat membuat tagihan</CardDescription>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-50">
                  {templates.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">Belum ada template. Tambahkan di sebelah kiri.</div>
                  ) : (
                    templates.map(t => (
                      <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-slate-800 truncate">{t.jenis_tagihan}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">
                              {t.tipe_periode === 'sekali_selama_sekolah' ? 'Sekali Selama Sekolah' : t.tipe_periode}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                              {t.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatCurrency(t.nominal)}{t.keterangan ? ` · ${t.keterangan}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => handleEditTemplate(t)}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-1" title="Edit Template">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleTemplate(t.id, t.is_active)}
                            className="text-slate-400 hover:text-emerald-600 transition-colors p-1" title={t.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                            {t.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button onClick={() => handleDeleteTemplate(t.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Hapus Template">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── TAB 2: BERPRESTASI ── */}
          {activeTab === 'berprestasi' && (
            <div className="grid gap-6 md:grid-cols-[380px_1fr]">
              {/* Form */}
              <Card className="rounded-3xl border-slate-100 shadow-sm h-fit">
                <CardHeader className="pb-4 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${editingBpId ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                      {editingBpId ? <Edit2 className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                    </div>
                    <div>
                      <CardTitle className="text-base">{editingBpId ? 'Edit Pengecualian' : 'Tambah Pengecualian'}</CardTitle>
                      <CardDescription className="text-xs">Siswa yang dibebaskan (Gratis) tagihan 100%</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {activeTemplates.length === 0 ? (
                    <p className="text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-xl">
                      ⚠️ Buat minimal 1 template aktif di tab Template terlebih dahulu.
                    </p>
                  ) : (
                    <form onSubmit={handleSaveBerprestasi} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Siswa</Label>
                        <SearchableStudentSelect
                          value={bpStudent}
                          onChange={setBpStudent}
                          students={students}
                          placeholder="-- Ketik Nama Siswa --"
                          focusRingColor="focus-visible:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Jenis Tagihan (Template)</Label>
                        <select value={bpTemplate} onChange={e => setBpTemplate(e.target.value)} required
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                          <option value="">-- Pilih Jenis Tagihan --</option>
                          {activeTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.jenis_tagihan} ({formatCurrency(t.nominal)})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Alasan Prestasi</Label>
                        <select value={bpAlasan} onChange={e => setBpAlasan(e.target.value)} required
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                          <option value="">-- Pilih Alasan --</option>
                          {ALASAN_PRESET_GRATIS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        {bpAlasan === 'Lainnya' && (
                          <Input placeholder="Tulis alasan..." value={bpAlasanCustom}
                            onChange={e => setBpAlasanCustom(e.target.value)} required className="rounded-xl mt-2" />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Mulai Berlaku</Label>
                          <Input type="date" value={bpStartDate} onChange={e => setBpStartDate(e.target.value)} required className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Berakhir Pada <span className="text-slate-400 font-normal">(opsional)</span></Label>
                          <Input type="date" value={bpEndDate} onChange={e => setBpEndDate(e.target.value)} className="rounded-xl" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={bpSubmitting} className={`flex-1 rounded-xl ${editingBpId ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}>
                          {bpSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingBpId ? <Edit2 className="w-4 h-4 mr-2" /> : <Trophy className="w-4 h-4 mr-2" />)}
                          {editingBpId ? 'Simpan Perubahan' : 'Simpan Pengecualian'}
                        </Button>
                        {editingBpId && (
                          <Button type="button" variant="outline" onClick={handleCancelEditBerprestasi} className="rounded-xl flex-shrink-0">
                            Batal
                          </Button>
                        )}
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* List */}
              <Card className="rounded-3xl border-slate-100 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-50">
                  <CardTitle className="text-base">Daftar Pengecualian Aktif ({gratisOverrides.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-50">
                  {gratisOverrides.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">Belum ada pengecualian berprestasi.</div>
                  ) : (
                    gratisOverrides.map(o => (
                      <div key={o.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-slate-800">{o.students?.nama}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Gratis</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {o.billing_templates?.jenis_tagihan} · {o.alasan}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(o.start_date).toLocaleDateString('id-ID')}
                            {o.end_date ? ` s/d ${new Date(o.end_date).toLocaleDateString('id-ID')}` : ' (tidak terbatas)'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => handleEditBerprestasi(o)}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-1" title="Edit Pengecualian">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteOverride(o.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── TAB 3: KERINGANAN ── */}
          {activeTab === 'keringanan' && (
            <div className="grid gap-6 md:grid-cols-[380px_1fr]">
              {/* Form */}
              <Card className="rounded-3xl border-slate-100 shadow-sm h-fit">
                <CardHeader className="pb-4 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${editingKmId ? 'bg-blue-50 text-blue-600' : 'bg-sky-50 text-sky-600'}`}>
                      {editingKmId ? <Edit2 className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                    </div>
                    <div>
                      <CardTitle className="text-base">{editingKmId ? 'Edit Keringanan' : 'Tambah Keringanan'}</CardTitle>
                      <CardDescription className="text-xs">Nominal custom untuk siswa kurang mampu</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {activeTemplates.length === 0 ? (
                    <p className="text-sm text-sky-600 bg-sky-50 px-4 py-3 rounded-xl">
                      ⚠️ Buat minimal 1 template aktif di tab Template terlebih dahulu.
                    </p>
                  ) : (
                    <form onSubmit={handleSaveKeringanan} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Siswa</Label>
                        <SearchableStudentSelect
                          value={kmStudent}
                          onChange={setKmStudent}
                          students={students}
                          placeholder="-- Ketik Nama Siswa --"
                          focusRingColor="focus-visible:ring-sky-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Jenis Tagihan (Template)</Label>
                        <select value={kmTemplate} onChange={e => { setKmTemplate(e.target.value); setKmNominal('') }} required
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                          <option value="">-- Pilih Jenis Tagihan --</option>
                          {activeTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.jenis_tagihan} ({formatCurrency(t.nominal)})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nominal Keringanan (Rp)</Label>
                        {kmSelectedTemplate && (
                          <p className="text-xs text-slate-400 mb-1.5">
                            Nominal standar: <strong className="text-slate-600">{formatCurrency(kmSelectedTemplate.nominal)}</strong>
                            {' '}· Masukkan nilai antara 0 s/d {formatCurrency(kmSelectedTemplate.nominal)}
                          </p>
                        )}
                        <Input type="number" min="0" max={kmSelectedTemplate?.nominal}
                          placeholder="Contoh: 50000" value={kmNominal}
                          onChange={e => setKmNominal(e.target.value)} required className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Alasan</Label>
                        <select value={kmAlasan} onChange={e => setKmAlasan(e.target.value)} required
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                          <option value="">-- Pilih Alasan --</option>
                          {ALASAN_PRESET_KERINGANAN.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        {kmAlasan === 'Lainnya' && (
                          <Input placeholder="Tulis alasan..." value={kmAlasanCustom}
                            onChange={e => setKmAlasanCustom(e.target.value)} required className="rounded-xl mt-2" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={kmSubmitting} className={`flex-1 rounded-xl ${editingKmId ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}>
                          {kmSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingKmId ? <Edit2 className="w-4 h-4 mr-2" /> : <Heart className="w-4 h-4 mr-2" />)}
                          {editingKmId ? 'Simpan Perubahan' : 'Simpan Keringanan'}
                        </Button>
                        {editingKmId && (
                          <Button type="button" variant="outline" onClick={handleCancelEditKeringanan} className="rounded-xl flex-shrink-0">
                            Batal
                          </Button>
                        )}
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* List */}
              <Card className="rounded-3xl border-slate-100 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-50">
                  <CardTitle className="text-base">Daftar Keringanan Aktif ({keringananOverrides.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-50">
                  {keringananOverrides.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">Belum ada keringanan terdaftar.</div>
                  ) : (
                    keringananOverrides.map(o => (
                      <div key={o.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-slate-800">{o.students?.nama}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">Keringanan</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {o.billing_templates?.jenis_tagihan} · {o.alasan}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-sky-600">{formatCurrency(o.nominal_override ?? 0)}</span>
                            {o.billing_templates && (
                              <span className="text-xs text-slate-400">
                                dari {formatCurrency(o.billing_templates.nominal)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => handleEditKeringanan(o)}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-1" title="Edit Keringanan">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteOverride(o.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
