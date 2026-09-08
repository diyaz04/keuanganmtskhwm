import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Calendar, Pencil, Trash2, CheckCircle2, History, X } from 'lucide-react'

type Payment = {
  id: string
  bill_id: string
  nominal_dibayar: number
  status: string
  tanggal_bayar: string
  catatan: string
  bukti_url: string | null
  bills: {
    id: string
    jenis_tagihan: string
    nominal: number
    nominal_terbayar: number
    students: {
      id: string
      nama: string
      kelas: string
    }
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export default function RiwayatPembayaran() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchName, setSearchName] = useState('')
  const [filterType, setFilterType] = useState('all') // all, manual, online

  // Edit Modal
  const [editPayment, setEditPayment] = useState<Payment | null>(null)
  const [editNominal, setEditNominal] = useState('')
  const [editTanggal, setEditTanggal] = useState('')
  const [editCatatan, setEditCatatan] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('payments')
        .select(`
          id, bill_id, nominal_dibayar, status, tanggal_bayar, catatan, bukti_url,
          bills (
            id, jenis_tagihan, nominal, nominal_terbayar,
            students (
              id, nama, kelas
            )
          )
        `)
        .eq('status', 'approved')
        .order('tanggal_bayar', { ascending: false })

      if (startDate) {
        query = query.gte('tanggal_bayar', `${startDate}T00:00:00.000Z`)
      }
      if (endDate) {
        query = query.lte('tanggal_bayar', `${endDate}T23:59:59.999Z`)
      }

      const { data, error } = await query

      if (error) throw error
      setPayments((data as any) || [])
    } catch (err: any) {
      alert(`Gagal mengambil data riwayat: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchName = p.bills?.students?.nama.toLowerCase().includes(searchName.toLowerCase())
      let matchType = true
      if (filterType === 'manual') matchType = !p.bukti_url
      if (filterType === 'online') matchType = !!p.bukti_url
      return matchName && matchType
    })
  }, [payments, searchName, filterType])

  const handleDelete = async (payment: Payment) => {
    if (!confirm(`Hapus riwayat pembayaran sebesar ${formatCurrency(payment.nominal_dibayar)} untuk ${payment.bills?.students?.nama}? \n\nPenghapusan ini akan mengembalikan sisa tagihan siswa ke status sebelum pembayaran ini dilakukan.`)) return

    setIsSubmitting(true)
    try {
      const bill = payment.bills
      const currentTerbayar = bill.nominal_terbayar || 0
      const newTerbayar = Math.max(0, currentTerbayar - payment.nominal_dibayar)
      let newStatus = 'unpaid'
      if (newTerbayar >= bill.nominal) {
        newStatus = 'paid'
      } else if (newTerbayar > 0) {
        newStatus = 'partial'
      }

      // Update bill
      const { error: billErr } = await supabase.from('bills').update({
        nominal_terbayar: newTerbayar,
        status: newStatus
      }).eq('id', bill.id)
      if (billErr) throw billErr

      // Delete payment
      const { error: payErr } = await supabase.from('payments').delete().eq('id', payment.id)
      if (payErr) throw payErr

      alert('Berhasil menghapus riwayat pembayaran.')
      fetchPayments()
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPayment) return
    setIsSubmitting(true)
    try {
      const newNominalValue = parseFloat(editNominal)
      if (isNaN(newNominalValue) || newNominalValue <= 0) throw new Error('Nominal tidak valid')

      const bill = editPayment.bills
      const nominalDiff = newNominalValue - editPayment.nominal_dibayar
      
      const newTerbayar = (bill.nominal_terbayar || 0) + nominalDiff
      let newStatus = 'unpaid'
      if (newTerbayar >= bill.nominal) {
        newStatus = 'paid'
      } else if (newTerbayar > 0) {
        newStatus = 'partial'
      }

      // Update bill
      const { error: billErr } = await supabase.from('bills').update({
        nominal_terbayar: newTerbayar,
        status: newStatus
      }).eq('id', bill.id)
      if (billErr) throw billErr

      // Update payment
      const { error: payErr } = await supabase.from('payments').update({
        nominal_dibayar: newNominalValue,
        tanggal_bayar: new Date(editTanggal).toISOString(),
        catatan: editCatatan
      }).eq('id', editPayment.id)
      if (payErr) throw payErr

      alert('Berhasil mengupdate riwayat pembayaran.')
      setEditPayment(null)
      fetchPayments()
    } catch (err: any) {
      alert(`Gagal mengupdate: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (p: Payment) => {
    setEditPayment(p)
    setEditNominal(p.nominal_dibayar.toString())
    
    // Parse tanggal untuk input type="date"
    const tgl = new Date(p.tanggal_bayar)
    // format YYYY-MM-DD
    const yyyy = tgl.getFullYear()
    const mm = String(tgl.getMonth() + 1).padStart(2, '0')
    const dd = String(tgl.getDate()).padStart(2, '0')
    setEditTanggal(`${yyyy}-${mm}-${dd}`)
    
    setEditCatatan(p.catatan || '')
  }

  const totalFilteredNominal = filteredPayments.reduce((sum, p) => sum + Number(p.nominal_dibayar), 0)

  return (
    <div className="p-0 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <History className="text-emerald-600" />
            Riwayat Pencatatan Pembayaran
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Pantau, koreksi, atau batalkan pencatatan pembayaran tagihan siswa.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="w-full lg:w-auto flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Pencarian Nama Siswa</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Ketik nama..." 
                    className="pl-9"
                    value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Dari Tanggal</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    type="date"
                    className="pl-9"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Sampai Tanggal</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    type="date"
                    className="pl-9"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Jenis Transaksi</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="all">Semua Jenis</option>
                  <option value="manual">Bayar Manual (Admin)</option>
                  <option value="online">Transfer Online (Wali)</option>
                </select>
              </div>
            </div>
            {startDate || endDate ? (
              <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); setSearchName('') }}>
                Reset Filter
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex justify-between items-center">
            <span className="text-emerald-800 font-semibold text-sm">Total {filteredPayments.length} Transaksi Ditemukan</span>
            <span className="text-emerald-700 font-bold text-lg">{formatCurrency(totalFilteredNominal)}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Siswa & Kelas</th>
                  <th className="px-4 py-3 font-semibold">Jenis Tagihan</th>
                  <th className="px-4 py-3 font-semibold">Nominal Masuk</th>
                  <th className="px-4 py-3 font-semibold">Catatan / Bukti</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">Memuat data riwayat...</td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">Tidak ada riwayat pembayaran yang ditemukan.</td>
                  </tr>
                ) : (
                  filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="text-slate-700 font-medium">
                          {new Date(p.tanggal_bayar).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-slate-400 text-xs mt-0.5">
                          {new Date(p.tanggal_bayar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{p.bills?.students?.nama}</div>
                        <div className="text-slate-500 text-xs">Kelas: {p.bills?.students?.kelas}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.bills?.jenis_tagihan}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                          +{formatCurrency(p.nominal_dibayar)}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-slate-500">
                        <div className="flex items-center gap-2">
                          {!p.bukti_url ? (
                            <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide">Manual</span>
                          ) : (
                            <a href={p.bukti_url} target="_blank" rel="noreferrer" className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide hover:underline">
                              Lihat Bukti
                            </a>
                          )}
                          <span className="truncate" title={p.catatan}>{p.catatan}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => openEditModal(p)} title="Edit Nominal/Tanggal">
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleDelete(p)} title="Batalkan/Hapus Pembayaran">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Edit Riwayat Pembayaran</h3>
              <button onClick={() => setEditPayment(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="editPaymentForm" onSubmit={handleEditSubmit} className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border text-sm space-y-1 mb-4">
                  <p><span className="text-slate-500">Siswa:</span> <strong className="text-slate-800">{editPayment.bills?.students?.nama}</strong></p>
                  <p><span className="text-slate-500">Tagihan:</span> <strong className="text-slate-800">{editPayment.bills?.jenis_tagihan}</strong></p>
                  <p><span className="text-slate-500">Total Tagihan:</span> <strong className="text-slate-800">{formatCurrency(editPayment.bills?.nominal || 0)}</strong></p>
                </div>

                <div className="space-y-2">
                  <Label>Nominal Terbayar</Label>
                  <Input 
                    type="number" 
                    required 
                    min="1"
                    value={editNominal}
                    onChange={e => setEditNominal(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Nominal ini akan merevisi sisa tagihan siswa secara otomatis.</p>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Bayar</Label>
                  <Input 
                    type="date" 
                    required 
                    value={editTanggal}
                    onChange={e => setEditTanggal(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <Input 
                    type="text" 
                    value={editCatatan}
                    onChange={e => setEditCatatan(e.target.value)}
                    placeholder="Opsional"
                  />
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditPayment(null)} disabled={isSubmitting}>Batal</Button>
              <Button type="submit" form="editPaymentForm" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
