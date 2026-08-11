import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, X, Eye, FileText, CheckCircle, XCircle } from 'lucide-react'

interface PendingPayment {
  id: string
  bukti_transfer_url: string
  catatan: string
  created_at: string
  bill_id: string
  nominal_dibayar?: number
  status?: string
  bills: {
    jenis_tagihan: string
    nominal: number
    nominal_terbayar: number
    students: {
      nama: string
      nisn: string
    }
  }
}

export default function BendaharaDashboard() {
  const { user } = useAuth()
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [verifiedPayments, setVerifiedPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingPayments()
  }, [])

  const fetchPendingPayments = async () => {
    try {
      setLoading(true)
      const [pendingRes, verifiedRes] = await Promise.all([
        supabase
          .from('payments')
          .select(`
            id, bukti_transfer_url, catatan, created_at, bill_id, nominal_dibayar, status,
            bills (
              jenis_tagihan, nominal, nominal_terbayar,
              students ( nama, nisn )
            )
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true }),
        supabase
          .from('payments')
          .select(`
            id, bukti_transfer_url, catatan, created_at, bill_id, nominal_dibayar, status,
            bills (
              jenis_tagihan, nominal, nominal_terbayar,
              students ( nama, nisn )
            )
          `)
          .in('status', ['approved', 'rejected'])
          .order('created_at', { ascending: false })
          .limit(100)
      ])

      if (pendingRes.error) throw pendingRes.error
      if (verifiedRes.error) throw verifiedRes.error
      
      setPendingPayments((pendingRes.data as any) || [])
      setVerifiedPayments((verifiedRes.data as any) || [])
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar verifikasi.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (payment: PendingPayment) => {
    if (!confirm('Setujui pembayaran ini?')) return
    setProcessingId(payment.id)
    try {
      // Generate nomor kwitansi: KWT-YYYYMMDD-ID
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const shortId = payment.id.split('-')[0].toUpperCase()
      const noKwitansi = `KWT-${dateStr}-${shortId}`

      // Update payment
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'approved',
          tanggal_bayar: new Date().toISOString(),
          nomor_kwitansi: noKwitansi,
          verified_by: user?.id
        })
        .eq('id', payment.id)

      if (paymentError) throw paymentError

      // Calculate new bill state
      const paymentAmount = payment.nominal_dibayar || payment.bills.nominal
      const currentPaid = payment.bills.nominal_terbayar || 0
      const newPaid = currentPaid + paymentAmount
      const newStatus = newPaid >= payment.bills.nominal ? 'paid' : 'partial'

      // Update bill
      const { error: billError } = await supabase
        .from('bills')
        .update({ 
          status: newStatus,
          nominal_terbayar: newPaid
        })
        .eq('id', payment.bill_id)

      if (billError) throw billError

      // Refresh list
      setPendingPayments(prev => prev.filter(p => p.id !== payment.id))
      setVerifiedPayments(prev => [{ ...payment, status: 'approved' }, ...prev])
    } catch (err: any) {
      alert(`Gagal menyetujui: ${err.message}`)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectPaymentId || !rejectReason.trim()) return

    setProcessingId(rejectPaymentId)
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'rejected',
          catatan: rejectReason,
          verified_by: user?.id
        })
        .eq('id', rejectPaymentId)

      if (error) throw error

      const rejectedPayment = pendingPayments.find(p => p.id === rejectPaymentId)
      if (rejectedPayment) {
        setVerifiedPayments(prev => [{ ...rejectedPayment, status: 'rejected' }, ...prev])
      }
      setPendingPayments(prev => prev.filter(p => p.id !== rejectPaymentId))
      setRejectPaymentId(null)
      setRejectReason('')
    } catch (err: any) {
      alert(`Gagal menolak: ${err.message}`)
    } finally {
      setProcessingId(null)
    }
  }

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Bendahara</h1>
        <p className="text-muted-foreground mt-2">
          Verifikasi pembayaran tagihan dari Wali Murid.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Verifikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {loading ? '-' : pendingPayments.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pembayaran perlu ditinjau</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Menunggu Verifikasi</TabsTrigger>
          <TabsTrigger value="verified">Sudah Diverifikasi</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Antrean Verifikasi Pembayaran</CardTitle>
              <CardDescription>Review bukti transfer dan setujui untuk menerbitkan kwitansi otomatis.</CardDescription>
            </CardHeader>
            <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Memuat data...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : pendingPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
              Tidak ada pembayaran yang menunggu verifikasi saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Siswa</th>
                    <th className="px-4 py-3 font-medium">Tagihan</th>
                    <th className="px-4 py-3 font-medium">Nominal</th>
                    <th className="px-4 py-3 font-medium">Waktu Upload</th>
                    <th className="px-4 py-3 font-medium text-center">Bukti Bayar</th>
                    <th className="px-4 py-3 font-medium text-center rounded-tr-lg">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b">
                  {pendingPayments.map(payment => (
                    <tr key={payment.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{payment.bills.students.nama}</div>
                        <div className="text-xs text-muted-foreground">NISN: {payment.bills.students.nisn}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{payment.bills.jenis_tagihan}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold">{formatRupiah(payment.nominal_dibayar || payment.bills.nominal)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {(!payment.nominal_dibayar || payment.nominal_dibayar === payment.bills.nominal) && (!payment.bills.nominal_terbayar || payment.bills.nominal_terbayar === 0) 
                            ? 'Lunas' 
                            : 'Cicilan'
                          } 
                          {' · '}Tagihan: {formatRupiah(payment.bills.nominal)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">{formatDate(payment.created_at)}</td>
                      <td className="px-4 py-3 text-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => setPreviewUrl(payment.bukti_transfer_url)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Lihat
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-8 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(payment)}
                            disabled={processingId === payment.id}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Setuju
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8"
                            onClick={() => setRejectPaymentId(payment.id)}
                            disabled={processingId === payment.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Tolak
                          </Button>
                        </div>
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
        <TabsContent value="verified" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Verifikasi Pembayaran</CardTitle>
              <CardDescription>Daftar pembayaran yang sudah disetujui atau ditolak sebelumnya.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground animate-pulse">Memuat data...</div>
              ) : verifiedPayments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                  Belum ada riwayat verifikasi.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 font-medium rounded-tl-lg">Siswa</th>
                        <th className="px-4 py-3 font-medium">Tagihan</th>
                        <th className="px-4 py-3 font-medium">Nominal</th>
                        <th className="px-4 py-3 font-medium">Waktu Transaksi</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-center rounded-tr-lg">Bukti Bayar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-b">
                      {verifiedPayments.map(payment => (
                        <tr key={payment.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{payment.bills?.students?.nama}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{payment.bills?.students?.nisn}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">{payment.bills?.jenis_tagihan}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(payment.nominal_dibayar || payment.bills?.nominal || 0)}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {new Date(payment.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="px-4 py-3">
                            {payment.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700">
                                <CheckCircle className="w-3.5 h-3.5" /> Disetujui
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700">
                                <XCircle className="w-3.5 h-3.5" /> Ditolak
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {payment.bukti_transfer_url ? (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setPreviewUrl(payment.bukti_transfer_url)}>
                                <Eye size={16} />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Manual</span>
                            )}
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

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative bg-background p-2 rounded-lg max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-2 px-2">
              <h3 className="font-semibold">Preview Bukti Transfer</h3>
              <Button variant="ghost" size="icon" onClick={() => setPreviewUrl(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-muted/50 rounded flex justify-center items-center p-4 min-h-[50vh]">
              {previewUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewUrl} className="w-full h-[70vh]" title="PDF Preview" />
              ) : (
                <img src={previewUrl} alt="Bukti Transfer" className="max-w-full max-h-[70vh] object-contain" />
              )}
            </div>
            <div className="mt-2 text-center">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline inline-flex items-center">
                <FileText className="w-4 h-4 mr-1"/> Buka di Tab Baru
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectPaymentId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-xl border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Tolak Pembayaran</CardTitle>
              <CardDescription>
                Berikan alasan penolakan agar wali murid dapat memperbaikinya.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRejectSubmit}>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="alasan">Alasan Penolakan</Label>
                  <Input 
                    id="alasan" 
                    placeholder="Contoh: Gambar buram / Nominal tidak sesuai" 
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => { setRejectPaymentId(null); setRejectReason(''); }}
                  disabled={!!processingId}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  variant="destructive"
                  className="w-full" 
                  disabled={!!processingId || !rejectReason.trim()}
                >
                  {processingId === rejectPaymentId ? 'Memproses...' : 'Konfirmasi Tolak'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
