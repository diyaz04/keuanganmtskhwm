import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trash2, PlusCircle, Calculator, CheckSquare } from 'lucide-react'

// Types
interface DeductionType {
  id: string
  nama: string
  tipe: string
  default_nominal: number
}

interface Employee {
  id: string
  nama: string
  nip: string
  gaji_pokok: number
  tunjangan: number
  tunjangan_koordinator: number
  tunjangan_walikelas: number
  tunjangan_lomba: number
}

interface EmployeeDeduction {
  id: string
  employee_id: string
  deduction_type_id: string
  custom_nominal: number
  deduction_types: DeductionType
}

export default function MasterPotongan() {
  const [deductionTypes, setDeductionTypes] = useState<DeductionType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  
  // Tab 1: Form state
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeCategory, setNewTypeCategory] = useState('flat')
  const [newTypeNominal, setNewTypeNominal] = useState('')
  const [loadingTypes, setLoadingTypes] = useState(false)

  // Tab 2: Assignment state (Per Pegawai)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [employeeDeductions, setEmployeeDeductions] = useState<EmployeeDeduction[]>([])
  const [assignTypeId, setAssignTypeId] = useState<string>('')
  const [assignNominal, setAssignNominal] = useState('')
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  // Tab 3: Assignment Massal
  const [massAssignTypeId, setMassAssignTypeId] = useState('')
  const [massAssignNominal, setMassAssignNominal] = useState('')
  const [massSelectedEmployees, setMassSelectedEmployees] = useState<string[]>([])

  useEffect(() => {
    fetchDeductionTypes()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchEmployeeDeductions(selectedEmployeeId)
    } else {
      setEmployeeDeductions([])
    }
  }, [selectedEmployeeId])

  const fetchDeductionTypes = async () => {
    setLoadingTypes(true)
    const { data, error } = await supabase.from('deduction_types').select('*').order('created_at', { ascending: false })
    if (!error) setDeductionTypes(data || [])
    setLoadingTypes(false)
  }

  const fetchEmployees = async () => {
    const { data, error } = await supabase.from('employees').select('*').order('nama', { ascending: true })
    if (!error) setEmployees(data || [])
  }

  const fetchEmployeeDeductions = async (empId: string) => {
    setLoadingAssignments(true)
    const { data, error } = await supabase
      .from('employee_deductions')
      .select(`
        id, employee_id, deduction_type_id, custom_nominal,
        deduction_types ( id, nama, tipe, default_nominal )
      `)
      .eq('employee_id', empId)
    if (!error) setEmployeeDeductions((data as any) || [])
    setLoadingAssignments(false)
  }

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTypeName || !newTypeNominal) return
    const { error } = await supabase.from('deduction_types').insert({
      nama: newTypeName,
      tipe: newTypeCategory,
      default_nominal: parseFloat(newTypeNominal)
    })
    if (!error) {
      setNewTypeName('')
      setNewTypeNominal('')
      fetchDeductionTypes()
    } else {
      alert(`Gagal menambah: ${error.message}`)
    }
  }

  const handleDeleteType = async (id: string) => {
    if (!confirm('Hapus jenis potongan ini? Semua assignment ke pegawai untuk potongan ini juga akan terhapus.')) return
    const { error } = await supabase.from('deduction_types').delete().eq('id', id)
    if (!error) fetchDeductionTypes()
  }

  const handleAssignSelectType = (typeId: string) => {
    setAssignTypeId(typeId)
    const dt = deductionTypes.find(d => d.id === typeId)
    if (dt) setAssignNominal(dt.default_nominal.toString())
  }

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployeeId || !assignTypeId || !assignNominal) return
    
    // Check if already assigned
    const exists = employeeDeductions.find(ed => ed.deduction_type_id === assignTypeId)
    if (exists) {
      alert('Pegawai sudah memiliki potongan ini!')
      return
    }

    const { error } = await supabase.from('employee_deductions').insert({
      employee_id: selectedEmployeeId,
      deduction_type_id: assignTypeId,
      custom_nominal: parseFloat(assignNominal)
    })

    if (!error) {
      setAssignTypeId('')
      setAssignNominal('')
      fetchEmployeeDeductions(selectedEmployeeId)
    } else {
      alert(`Gagal assign: ${error.message}`)
    }
  }

  const handleDeleteAssignment = async (id: string) => {
    const { error } = await supabase.from('employee_deductions').delete().eq('id', id)
    if (!error && selectedEmployeeId) fetchEmployeeDeductions(selectedEmployeeId)
  }

  const handleMassAssignSelectType = (typeId: string) => {
    setMassAssignTypeId(typeId)
    const dt = deductionTypes.find(d => d.id === typeId)
    if (dt) setMassAssignNominal(dt.default_nominal.toString())
  }

  const toggleEmployeeSelection = (empId: string) => {
    setMassSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  const handleSelectAll = () => {
    if (massSelectedEmployees.length === employees.length) {
      setMassSelectedEmployees([])
    } else {
      setMassSelectedEmployees(employees.map(e => e.id))
    }
  }

  const handleAddMassAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!massAssignTypeId || !massAssignNominal || massSelectedEmployees.length === 0) return
    
    setLoadingAssignments(true)
    
    // First, fetch all existing assignments for these employees for this type
    const { data: existing } = await supabase
      .from('employee_deductions')
      .select('employee_id')
      .eq('deduction_type_id', massAssignTypeId)
      .in('employee_id', massSelectedEmployees)
      
    const existingIds = new Set(existing?.map(e => e.employee_id) || [])
    
    const newAssignments = massSelectedEmployees
      .filter(id => !existingIds.has(id))
      .map(id => ({
        employee_id: id,
        deduction_type_id: massAssignTypeId,
        custom_nominal: parseFloat(massAssignNominal)
      }))
      
    if (newAssignments.length > 0) {
      const { error } = await supabase.from('employee_deductions').insert(newAssignments)
      if (error) {
        alert(`Gagal assign massal: ${error.message}`)
      } else {
        alert(`Berhasil menambahkan potongan ke ${newAssignments.length} pegawai. (${existingIds.size} pegawai dilewati karena sudah memiliki potongan ini)`)
        setMassAssignTypeId('')
        setMassAssignNominal('')
        setMassSelectedEmployees([])
      }
    } else {
      alert('Semua pegawai yang dipilih sudah memiliki potongan ini.')
    }
    setLoadingAssignments(false)
  }

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  // Simulation Logic
  const selectedEmpData = employees.find(e => e.id === selectedEmployeeId)
  let simulasiGross = 0
  let simulasiDeductions = 0
  
  if (selectedEmpData) {
    simulasiGross = selectedEmpData.gaji_pokok + selectedEmpData.tunjangan + (selectedEmpData.tunjangan_koordinator || 0) + (selectedEmpData.tunjangan_walikelas || 0) + (selectedEmpData.tunjangan_lomba || 0)
    employeeDeductions.forEach(ed => {
      if (ed.deduction_types.tipe === 'flat') {
        simulasiDeductions += ed.custom_nominal
      } else {
        // Asumsikan persen dihitung dari Gaji Pokok
        simulasiDeductions += (selectedEmpData.gaji_pokok * (ed.custom_nominal / 100))
      }
    })
  }
  const simulasiNet = simulasiGross - simulasiDeductions

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-3xl font-bold tracking-tight">Master Potongan</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Kelola referensi potongan (Koperasi, Asuransi, dll) dan terapkan ke pegawai.
        </p>
      </div>

      <Tabs defaultValue="jenis" className="w-full">
        <TabsList className="flex overflow-x-auto w-full md:grid md:grid-cols-3 max-w-[600px] gap-1 p-1 bg-slate-100 rounded-xl no-scrollbar justify-start md:justify-center">
          <TabsTrigger value="jenis" className="flex-1 md:flex-none py-2 text-xs md:text-sm rounded-lg whitespace-nowrap px-3">Jenis Potongan</TabsTrigger>
          <TabsTrigger value="massal" className="flex-1 md:flex-none py-2 text-xs md:text-sm rounded-lg whitespace-nowrap px-3">Assign Sekaligus</TabsTrigger>
          <TabsTrigger value="assignment" className="flex-1 md:flex-none py-2 text-xs md:text-sm rounded-lg whitespace-nowrap px-3">Simulasi Pegawai</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: Jenis Potongan */}
        <TabsContent value="jenis" className="space-y-4 mt-6">
          <Card className="max-w-3xl shadow-sm border border-slate-100">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
              <CardTitle className="text-base md:text-lg">Tambah Jenis Potongan</CardTitle>
              <CardDescription className="text-xs md:text-sm">Buat tipe potongan baru yang nanti bisa diterapkan ke pegawai.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              <form onSubmit={handleAddType} className="flex flex-col md:flex-row gap-3 md:gap-4 items-end">
                <div className="space-y-1.5 flex-1 w-full">
                  <Label className="text-xs font-semibold text-slate-500">Nama Potongan</Label>
                  <Input placeholder="Misal: Koperasi Berkah" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} required className="h-9 text-xs md:text-sm rounded-lg" />
                </div>
                <div className="space-y-1.5 w-full md:w-[150px]">
                  <Label className="text-xs font-semibold text-slate-500">Tipe</Label>
                  <Select value={newTypeCategory} onValueChange={(val) => setNewTypeCategory(val || '')}>
                    <SelectTrigger className="h-9 text-xs md:text-sm rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat (Rp)</SelectItem>
                      <SelectItem value="persen">Persen (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1 w-full">
                  <Label className="text-xs font-semibold text-slate-500">Nominal Default / Besaran %</Label>
                  <Input type="number" placeholder="Contoh: 50000 atau 5" value={newTypeNominal} onChange={e => setNewTypeNominal(e.target.value)} required className="h-9 text-xs md:text-sm rounded-lg" />
                </div>
                <Button type="submit" className="w-full md:w-auto h-9 text-xs md:text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"><PlusCircle className="w-4 h-4 mr-2" /> Tambah</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Jenis Potongan</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTypes ? <div className="text-center py-4">Memuat...</div> : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nama Potongan</th>
                        <th className="px-4 py-3 font-medium">Tipe</th>
                        <th className="px-4 py-3 font-medium">Default Nominal</th>
                        <th className="px-4 py-3 font-medium text-center w-[100px]">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {deductionTypes.map(type => (
                        <tr key={type.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 font-semibold">{type.nama}</td>
                          <td className="px-4 py-3 uppercase text-xs font-bold text-muted-foreground">{type.tipe}</td>
                          <td className="px-4 py-3">
                            {type.tipe === 'flat' ? formatRupiah(type.default_nominal) : `${type.default_nominal}%`}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteType(type.id)} className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {deductionTypes.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Belum ada data.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Assignment Massal */}
        <TabsContent value="massal" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Assign Potongan Massal</CardTitle>
              <CardDescription>Pilih jenis potongan dan tetapkan sekaligus ke beberapa pegawai.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMassAssignment} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-lg border">
                  <div className="space-y-2 flex-1">
                    <Label>Pilih Jenis Potongan</Label>
                    <Select value={massAssignTypeId} onValueChange={(val) => handleMassAssignSelectType(val || '')}>
                      <SelectTrigger><SelectValue placeholder="Pilih..."/></SelectTrigger>
                      <SelectContent>
                        {deductionTypes.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Nominal / %</Label>
                    <Input type="number" value={massAssignNominal} onChange={e => setMassAssignNominal(e.target.value)} required placeholder="Nominal" />
                  </div>
                  <Button type="submit" disabled={massSelectedEmployees.length === 0 || !massAssignTypeId} className="w-full md:w-auto">
                    <CheckSquare className="w-4 h-4 mr-2" /> Assign ke {massSelectedEmployees.length} Pegawai
                  </Button>
                </div>

                <div className="border rounded-md">
                  <div className="bg-muted p-3 flex justify-between items-center border-b">
                    <span className="font-medium text-sm">Pilih Pegawai yang akan di-assign:</span>
                    <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                      {massSelectedEmployees.length === employees.length ? 'Batalkan Semua' : 'Pilih Semua'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4 max-h-[400px] overflow-y-auto">
                    {employees.map(emp => (
                      <label key={emp.id} className={`flex items-center space-x-3 p-3 rounded border cursor-pointer transition-colors ${massSelectedEmployees.includes(emp.id) ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-slate-50'}`}>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                          checked={massSelectedEmployees.includes(emp.id)}
                          onChange={() => toggleEmployeeSelection(emp.id)}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{emp.nama}</span>
                          <span className="text-xs text-muted-foreground">NIP: {emp.nip}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Assignment Pegawai (Simulasi) */}
        <TabsContent value="assignment" className="space-y-4 mt-6">
          <div className="flex flex-col md:flex-row gap-6">
            
            <div className="w-full md:w-1/3 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pilih Pegawai</CardTitle>
                  <CardDescription>Pilih untuk mengatur potongan dan melihat simulasi gajinya.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedEmployeeId} onValueChange={(val) => setSelectedEmployeeId(val || '')}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih Pegawai" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.nama} - {emp.nip}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {selectedEmpData && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-primary"><Calculator className="w-5 h-5 mr-2" /> Simulasi Payroll</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gaji Pokok:</span>
                      <span className="font-medium">{formatRupiah(selectedEmpData.gaji_pokok)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Tunjangan:</span>
                      <span className="font-medium">{formatRupiah(selectedEmpData.tunjangan)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-1">
                      <span>Gross Pendapatan:</span>
                      <span>{formatRupiah(simulasiGross)}</span>
                    </div>
                    <div className="flex justify-between text-destructive pt-2">
                      <span>Total Potongan:</span>
                      <span>- {formatRupiah(simulasiDeductions)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                      <span>Gaji Bersih:</span>
                      <span className="text-green-600">{formatRupiah(simulasiNet)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="w-full md:w-2/3 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Daftar Potongan Pegawai</CardTitle>
                  <CardDescription>Tambahkan *override* potongan khusus untuk pegawai terpilih.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedEmployeeId ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md">Silakan pilih pegawai terlebih dahulu.</div>
                  ) : (
                    <>
                      <form onSubmit={handleAddAssignment} className="flex gap-2 items-end">
                        <div className="space-y-2 flex-1">
                          <Label>Jenis Potongan</Label>
                          <Select value={assignTypeId} onValueChange={(val) => handleAssignSelectType(val || '')}>
                            <SelectTrigger><SelectValue placeholder="Pilih..."/></SelectTrigger>
                            <SelectContent>
                              {deductionTypes.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 w-[150px]">
                          <Label>Override Nominal/%</Label>
                          <Input type="number" value={assignNominal} onChange={e => setAssignNominal(e.target.value)} required />
                        </div>
                        <Button type="submit"><PlusCircle className="w-4 h-4 mr-2" /> Assign</Button>
                      </form>

                      {loadingAssignments ? <div className="py-4">Memuat...</div> : (
                        <div className="border rounded-md overflow-hidden mt-4">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground">
                              <tr>
                                <th className="px-4 py-2 font-medium">Jenis Potongan</th>
                                <th className="px-4 py-2 font-medium">Nilai Disimpan</th>
                                <th className="px-4 py-2 font-medium text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {employeeDeductions.map(ed => (
                                <tr key={ed.id} className="hover:bg-muted/30">
                                  <td className="px-4 py-2">
                                    <span className="font-semibold">{ed.deduction_types.nama}</span>
                                    <span className="ml-2 text-[10px] bg-muted px-1.5 rounded uppercase">{ed.deduction_types.tipe}</span>
                                  </td>
                                  <td className="px-4 py-2 font-mono">
                                    {ed.deduction_types.tipe === 'flat' ? formatRupiah(ed.custom_nominal) : `${ed.custom_nominal}%`}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteAssignment(ed.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                              {employeeDeductions.length === 0 && (
                                <tr><td colSpan={3} className="text-center py-4 text-muted-foreground">Tidak ada potongan aktif.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
