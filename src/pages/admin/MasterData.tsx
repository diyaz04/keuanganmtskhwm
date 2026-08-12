import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { read, utils, write } from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronRight, Search, KeyRound, Copy, Check, RefreshCw, Eye, EyeOff, X, ShieldCheck, Pencil, GraduationCap, Printer } from 'lucide-react'
import KodeAksesPrint, { type PrintKodeAksesData } from '@/components/KodeAksesPrint'

interface EmployeeData {
  nama: string
  nip: string
  no_rekening?: string
  gaji_pokok: number
  tunjangan: number
  tunjangan_koordinator: number
  tunjangan_walikelas: number
  tunjangan_lomba: number
  status: string
}

interface StudentData {
  nisn: string
  nama: string
  kelas: string
  angkatan: string
  status: string
  nama_wali: string
}

interface ExistingEmployee {
  id: string
  nama: string
  nip: string
  no_rekening: string | null
  status: string
  kode_akses_hash: string | null
  gaji_pokok: number
  tunjangan: number
  tunjangan_koordinator: number
  tunjangan_walikelas: number
  tunjangan_lomba: number
}

interface ExistingStudent {
  id: string
  nisn: string
  nama: string
  kelas: string
  angkatan: string
  status: string
  nama_wali: string
}

// SHA-256 hash function — must match the one in supabase/functions/portal-login
async function hashPIN(pin: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate random numeric PIN
function generatePIN(length = 6): string {
  const digits = '0123456789'
  let pin = ''
  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    pin += digits[randomValues[i] % digits.length]
  }
  return pin
}

export default function MasterData() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([])
  
  const [studentData, setStudentData] = useState<StudentData[]>([])
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Existing employees from DB
  const [existingEmployees, setExistingEmployees] = useState<ExistingEmployee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [searchEmployee, setSearchEmployee] = useState('')

  // Existing students from DB
  const [existingStudents, setExistingStudents] = useState<ExistingStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [searchStudent, setSearchStudent] = useState('')
  const [selectedStudentAngkatan, setSelectedStudentAngkatan] = useState('all')

  // Kode akses state
  const [generatingFor, setGeneratingFor] = useState<string | null>(null) // employee id currently generating
  const [revealedPIN, setRevealedPIN] = useState<{ employeeId: string, employeeName: string, pin: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPIN, setShowPIN] = useState(true)

  // Edit Employee State
  const [editingEmployee, setEditingEmployee] = useState<ExistingEmployee | null>(null)
  const [editNama, setEditNama] = useState('')
  const [editNip, setEditNip] = useState('')
  const [editNoRekening, setEditNoRekening] = useState('')
  const [editGajiPokok, setEditGajiPokok] = useState(0)
  const [editTunjangan, setEditTunjangan] = useState(0)
  const [editTunjanganKoordinator, setEditTunjanganKoordinator] = useState(0)
  const [editTunjanganWalikelas, setEditTunjanganWalikelas] = useState(0)
  const [editTunjanganLomba, setEditTunjanganLomba] = useState(0)
  const [editStatus, setEditStatus] = useState('aktif')
  const [isUpdatingEmployee, setIsUpdatingEmployee] = useState(false)

  // Add Employee State
  const [isAddingEmployee, setIsAddingEmployee] = useState(false)
  const [addNama, setAddNama] = useState('')
  const [addNip, setAddNip] = useState('')
  const [addNoRekening, setAddNoRekening] = useState('')
  const [addGajiPokok, setAddGajiPokok] = useState(0)
  const [addTunjangan, setAddTunjangan] = useState(0)
  const [addTunjanganKoordinator, setAddTunjanganKoordinator] = useState(0)
  const [addTunjanganWalikelas, setAddTunjanganWalikelas] = useState(0)
  const [addTunjanganLomba, setAddTunjanganLomba] = useState(0)
  const [addStatus, setAddStatus] = useState('aktif')
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false)

  // Add Student State
  const [isAddingStudent, setIsAddingStudent] = useState(false)
  const [addSiswaNisn, setAddSiswaNisn] = useState('')
  const [addSiswaNama, setAddSiswaNama] = useState('')
  const [addSiswaKelas, setAddSiswaKelas] = useState('')
  const [addSiswaAngkatan, setAddSiswaAngkatan] = useState('')
  const [addSiswaNamaWali, setAddSiswaNamaWali] = useState('')
  const [addSiswaStatus, setAddSiswaStatus] = useState('aktif')
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false)

  // Salary Visibility State
  const [revealedSalaries, setRevealedSalaries] = useState<Set<string>>(new Set())

  // Print State
  const [printQueue, setPrintQueue] = useState<PrintKodeAksesData[] | null>(null)

  const toggleSalaryReveal = (id: string) => {
    setRevealedSalaries(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  useEffect(() => {
    fetchExistingEmployees()
    fetchExistingStudents()
  }, [])

  const fetchExistingEmployees = async () => {
    setLoadingEmployees(true)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, nama, nip, no_rekening, status, kode_akses_hash, gaji_pokok, tunjangan, tunjangan_koordinator, tunjangan_walikelas, tunjangan_lomba')
        .order('nama', { ascending: true })
      if (error) throw error
      setExistingEmployees(data || [])
    } catch (err) {
      console.error('Error fetching employees:', err)
    } finally {
      setLoadingEmployees(false)
    }
  }

  const fetchExistingStudents = async () => {
    setLoadingStudents(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, nisn, nama, kelas, angkatan, status, nama_wali')
        .order('nama', { ascending: true })
      if (error) throw error
      setExistingStudents(data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
    } finally {
      setLoadingStudents(false)
    }
  }

  const filteredEmployees = existingEmployees.filter(e =>
    e.nama.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    (e.nip && e.nip.toLowerCase().includes(searchEmployee.toLowerCase()))
  )

  const filteredStudents = existingStudents.filter(s => {
    const matchesSearch = s.nama.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.nisn.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.kelas.toLowerCase().includes(searchStudent.toLowerCase()) ||
      (s.status && s.status.toLowerCase().includes(searchStudent.toLowerCase()))
    const matchesAngkatan = selectedStudentAngkatan === 'all' || s.angkatan === selectedStudentAngkatan
    return matchesSearch && matchesAngkatan
  })

  // Get unique angkatan values
  const uniqueAngkatans = Array.from(
    new Set(existingStudents.map(s => s.angkatan).filter(Boolean))
  ).sort()

  const openEditModal = (emp: ExistingEmployee) => {
    setEditingEmployee(emp)
    setEditNama(emp.nama)
    setEditNip(emp.nip || '')
    setEditNoRekening(emp.no_rekening || '')
    setEditGajiPokok(emp.gaji_pokok || 0)
    setEditTunjangan(emp.tunjangan || 0)
    setEditTunjanganKoordinator(emp.tunjangan_koordinator || 0)
    setEditTunjanganWalikelas(emp.tunjangan_walikelas || 0)
    setEditTunjanganLomba(emp.tunjangan_lomba || 0)
    setEditStatus(emp.status)
  }

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmployee) return
    setIsUpdatingEmployee(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          nama: editNama,
          nip: editNip || null,
          no_rekening: editNoRekening || null,
          gaji_pokok: Number(editGajiPokok),
          tunjangan: Number(editTunjangan),
          tunjangan_koordinator: Number(editTunjanganKoordinator),
          tunjangan_walikelas: Number(editTunjanganWalikelas),
          tunjangan_lomba: Number(editTunjanganLomba),
          status: editStatus
        })
        .eq('id', editingEmployee.id)

      if (error) throw error

      // Update local state immediately
      setExistingEmployees(prev =>
        prev.map(e => e.id === editingEmployee.id ? {
          ...e,
          nama: editNama,
          nip: editNip,
          no_rekening: editNoRekening || null,
          gaji_pokok: Number(editGajiPokok),
          tunjangan: Number(editTunjangan),
          tunjangan_koordinator: Number(editTunjanganKoordinator),
          tunjangan_walikelas: Number(editTunjanganWalikelas),
          tunjangan_lomba: Number(editTunjanganLomba),
          status: editStatus
        } : e)
      )

      setMessage({ type: 'success', text: `Data pegawai ${editNama} berhasil diperbarui!` })
      setEditingEmployee(null)
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: 'Gagal memperbarui data pegawai: ' + err.message })
    } finally {
      setIsUpdatingEmployee(false)
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingEmployee(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          nama: addNama,
          nip: addNip || null,
          no_rekening: addNoRekening || null,
          gaji_pokok: Number(addGajiPokok),
          tunjangan: Number(addTunjangan),
          tunjangan_koordinator: Number(addTunjanganKoordinator),
          tunjangan_walikelas: Number(addTunjanganWalikelas),
          tunjangan_lomba: Number(addTunjanganLomba),
          status: addStatus
        })
        .select()
        .single()

      if (error) throw error

      setExistingEmployees(prev => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)))
      setMessage({ type: 'success', text: `Pegawai ${addNama} berhasil ditambahkan!` })
      setIsAddingEmployee(false)
      setAddNama('')
      setAddNip('')
      setAddNoRekening('')
      setAddGajiPokok(0)
      setAddTunjangan(0)
      setAddTunjanganKoordinator(0)
      setAddTunjanganWalikelas(0)
      setAddTunjanganLomba(0)
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: 'Gagal menambah pegawai: ' + err.message })
    } finally {
      setIsSubmittingEmployee(false)
    }
  }

  // --- Generate Kode Akses ---
  const handleGenerateKodeAkses = useCallback(async (employeeId: string, employeeName: string) => {
    setGeneratingFor(employeeId)
    setRevealedPIN(null)
    setCopied(false)
    setShowPIN(true)

    try {
      const pin = generatePIN(6)
      const hash = await hashPIN(pin)

      const { error } = await supabase
        .from('employees')
        .update({ kode_akses_hash: hash })
        .eq('id', employeeId)

      if (error) throw error

      // Update local state
      setExistingEmployees(prev =>
        prev.map(e => e.id === employeeId ? { ...e, kode_akses_hash: hash } : e)
      )

      // Show the PIN to admin
      setRevealedPIN({ employeeId, employeeName, pin })
      setMessage({ type: 'success', text: `Kode akses untuk ${employeeName} berhasil dibuat!` })
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: 'Gagal membuat kode akses: ' + err.message })
    } finally {
      setGeneratingFor(null)
    }
  }, [])

  const handleGenerateMassalKodeAkses = async () => {
    if (!window.confirm("PERINGATAN: Anda akan men-generate ulang PIN untuk SEMUA pegawai. PIN lama tidak akan bisa digunakan lagi. Apakah Anda yakin?")) return
    
    setGeneratingFor('massal')
    setMessage(null)
    setRevealedPIN(null)
    
    try {
      const generatedData: PrintKodeAksesData[] = []
      const updates = existingEmployees.map(async (emp) => {
        const pin = generatePIN(6)
        const hash = await hashPIN(pin)
        
        generatedData.push({
          employeeId: emp.id,
          employeeName: emp.nama,
          nip: emp.nip || '-',
          pin
        })
        
        return {
          id: emp.id,
          kode_akses_hash: hash
        }
      })
      
      const resolvedUpdates = await Promise.all(updates)
      
      const batchPromises = resolvedUpdates.map(u => 
        supabase.from('employees').update({ kode_akses_hash: u.kode_akses_hash }).eq('id', u.id)
      )
      
      await Promise.all(batchPromises)
      
      // Update local state
      setExistingEmployees(prev => prev.map(e => {
        const updated = resolvedUpdates.find(u => u.id === e.id)
        return updated ? { ...e, kode_akses_hash: updated.kode_akses_hash } : e
      }))
      
      setPrintQueue(generatedData)
      setMessage({ type: 'success', text: `Berhasil men-generate PIN baru untuk ${generatedData.length} pegawai.` })
      
      setTimeout(() => {
        window.print()
      }, 500)
      
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: 'Gagal generate PIN massal: ' + err.message })
    } finally {
      setGeneratingFor(null)
    }
  }

  const handleCopyPIN = useCallback(async () => {
    if (!revealedPIN) return
    try {
      await navigator.clipboard.writeText(revealedPIN.pin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = revealedPIN.pin
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [revealedPIN])

  // --- Handlers for Pegawai ---
  const handleEmployeeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null)
    const file = e.target.files?.[0]
    if (!file) return
    
    const data = await file.arrayBuffer()
    const workbook = read(data)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const parsedData = utils.sheet_to_json<any>(sheet)
    
    // Normalize keys (lowercase and map)
    const normalized = parsedData.map(row => ({
      nama: row['Nama'] || row['nama'] || '',
      nip: (row['ID Pegawai'] || row['id pegawai'] || row['NIP'] || row['nip'] || '').toString().trim(),
      no_rekening: (row['No Rekening'] || row['no_rekening'] || '').toString().trim(),
      gaji_pokok: Number(row['Gaji Pokok'] || row['gaji_pokok'] || 0),
      tunjangan: Number(row['Tunjangan'] || row['tunjangan'] || 0),
      tunjangan_koordinator: Number(row['Tunjangan Koordinator'] || row['tunjangan_koordinator'] || 0),
      tunjangan_walikelas: Number(row['Tunjangan Walikelas'] || row['tunjangan_walikelas'] || 0),
      tunjangan_lomba: Number(row['Tunjangan Lomba'] || row['tunjangan_lomba'] || 0),
      status: (row['Status'] || row['status'] || 'aktif').toString().toLowerCase()
    }))
    
    setEmployeeData(normalized)
  }

  const uploadEmployeeData = async () => {
    if (employeeData.length === 0) return
    setLoading(true)
    setMessage(null)
    
    try {
      const { error } = await supabase
        .from('employees')
        .insert(employeeData)
      
      if (error) throw error
      
      setMessage({ type: 'success', text: `${employeeData.length} data pegawai berhasil diupload!` })
      setEmployeeData([])
      fetchExistingEmployees() // Refresh list
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: 'Gagal mengupload data pegawai: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  // --- Handlers for Siswa ---
  const handleStudentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null)
    const file = e.target.files?.[0]
    if (!file) return
    
    const data = await file.arrayBuffer()
    const workbook = read(data)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const parsedData = utils.sheet_to_json<any>(sheet)
    
    const normalized = parsedData.map(row => ({
      nisn: (row['NISN'] || row['nisn'] || '').toString(),
      nama: row['Nama'] || row['nama'] || '',
      kelas: (row['Kelas'] || row['kelas'] || '').toString(),
      angkatan: (row['Angkatan'] || row['angkatan'] || '').toString(),
      status: (row['Status'] || row['status'] || 'aktif').toString().toLowerCase().trim(),
      nama_wali: row['Nama Wali'] || row['nama_wali'] || ''
    }))
    
    setStudentData(normalized)
  }

  const uploadStudentData = async () => {
    if (studentData.length === 0) return
    setLoading(true)
    setMessage(null)
    
    try {
      const { error } = await supabase
        .from('students')
        .insert(studentData)
      
      if (error) throw error
      
      setMessage({ type: 'success', text: `${studentData.length} data siswa berhasil diupload!` })
      setStudentData([])
      fetchExistingStudents() // Refresh list
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: 'Gagal mengupload data siswa: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLuluskanAngkatan = async () => {
    if (selectedStudentAngkatan === 'all') {
      alert('Pilih spesifik angkatan terlebih dahulu dari dropdown filter.')
      return
    }

    const angkatanCount = existingStudents.filter(s => s.angkatan === selectedStudentAngkatan && s.status !== 'lulus').length
    if (angkatanCount === 0) {
      alert(`Tidak ada siswa dengan status aktif di angkatan ${selectedStudentAngkatan} yang bisa diluluskan.`)
      return
    }

    if (!window.confirm(`Anda yakin ingin MELULUSKAN ${angkatanCount} siswa dari Angkatan ${selectedStudentAngkatan}?\nTindakan ini akan mengubah status mereka menjadi "lulus".`)) {
      return
    }

    setLoadingStudents(true)
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'lulus' })
        .eq('angkatan', selectedStudentAngkatan)
        .neq('status', 'lulus')

      if (error) throw error

      setMessage({ type: 'success', text: `${angkatanCount} siswa Angkatan ${selectedStudentAngkatan} berhasil diluluskan!` })
      fetchExistingStudents()
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: 'Gagal meluluskan angkatan: ' + err.message })
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingStudent(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from('students')
        .insert({
          nisn: addSiswaNisn,
          nama: addSiswaNama,
          kelas: addSiswaKelas,
          angkatan: addSiswaAngkatan,
          nama_wali: addSiswaNamaWali,
          status: addSiswaStatus
        })
        .select()
        .single()

      if (error) throw error

      setExistingStudents(prev => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)))
      setMessage({ type: 'success', text: `Siswa ${addSiswaNama} berhasil ditambahkan!` })
      setIsAddingStudent(false)
      setAddSiswaNisn('')
      setAddSiswaNama('')
      setAddSiswaKelas('')
      setAddSiswaAngkatan('')
      setAddSiswaNamaWali('')
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: 'Gagal menambah siswa: ' + err.message })
    } finally {
      setIsSubmittingStudent(false)
    }
  }

  const downloadEmployeeTemplate = () => {
    const data = [
      ['Nama', 'ID Pegawai', 'No Rekening', 'Gaji Pokok', 'Tunjangan', 'Tunjangan Koordinator', 'Tunjangan Walikelas', 'Tunjangan Lomba', 'Status'],
      ['Contoh Guru', '123456789', '0123456789', 3000000, 500000, 100000, 150000, 50000, 'aktif'],
    ]
    const ws = utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 10 }]
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Template Pegawai')
    const wbOut = write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'Template_Pegawai.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadStudentTemplate = () => {
    const data = [
      ['NISN', 'Nama', 'Kelas', 'Angkatan', 'Status', 'Nama Wali'],
      ['0011223344', 'Siswa Contoh', '7A', '2024/2025', 'aktif', 'Bapak Siswa'],
    ]
    const ws = utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 25 }]
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Template Siswa')
    const wbOut = write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'Template_Siswa.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Data Master</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Upload dan kelola data master Pegawai (Guru/Karyawan) dan Siswa.
            </p>
          </div>
        </div>

      {message && (
        <div className={`p-4 rounded-md border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* PIN Reveal Banner */}
      {revealedPIN && (
        <div className="relative border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-5 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
          <button
            onClick={() => setRevealedPIN(null)}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-amber-200/50 transition-colors text-amber-600"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-amber-900 text-base">Kode Akses Berhasil Dibuat</h4>
              <p className="text-sm text-amber-700 mt-0.5">
                Kode akses untuk <span className="font-semibold">{revealedPIN.employeeName}</span>
              </p>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Kiri: PIN Box + Eye Toggle */}
                <div className="flex items-center gap-2">
                  <div className="bg-white border-2 border-amber-200 rounded-lg px-4 py-2 font-mono text-xl md:text-2xl font-bold tracking-[0.3em] text-slate-800 select-all min-w-[140px] text-center">
                    {showPIN ? revealedPIN.pin : '••••••'}
                  </div>
                  <button
                    onClick={() => setShowPIN(!showPIN)}
                    className="p-2 rounded-lg hover:bg-amber-100 transition-colors text-amber-700 border border-amber-200 bg-white"
                    title={showPIN ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showPIN ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Kanan: Salin & Cetak Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPIN}
                    className={`gap-1.5 transition-all flex-1 sm:flex-initial ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'border-amber-300 text-amber-800 hover:bg-amber-100 bg-white'}`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Tersalin!' : 'Salin'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const emp = existingEmployees.find(e => e.id === revealedPIN.employeeId)
                      setPrintQueue([{
                        employeeId: revealedPIN.employeeId,
                        employeeName: revealedPIN.employeeName,
                        nip: emp?.nip || '-',
                        pin: revealedPIN.pin
                      }])
                      setTimeout(() => window.print(), 500)
                    }}
                    className="gap-1.5 transition-all border-amber-300 text-amber-800 hover:bg-amber-100 bg-white flex-1 sm:flex-initial"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak PIN
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-600 bg-amber-100/60 rounded-md px-3 py-2">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Catat kode ini dan berikan kepada pegawai. Kode ini <strong>tidak bisa dilihat lagi</strong> setelah ditutup. 
                  Jika lupa, Anda harus generate ulang (reset).
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="pegawai" className="w-full">
        {role !== 'koperasi' && (
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="pegawai">Data Pegawai</TabsTrigger>
            <TabsTrigger value="siswa">Data Siswa</TabsTrigger>
          </TabsList>
        )}
        
        {/* TAB PEGAWAI */}
        <TabsContent value="pegawai" className="mt-4 space-y-6">
          {role !== 'koperasi' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Data Pegawai</CardTitle>
                  <CardDescription className="mt-1 hidden md:block">
                    Upload file Excel (.xlsx) berisi: Nama, ID Pegawai, Gaji Pokok, Tunjangan, Tunjangan Koordinator, Tunjangan Walikelas, Tunjangan Lomba, Status.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadEmployeeTemplate}>
                    Download Template
                  </Button>
                  <Button variant="default" size="sm" onClick={() => setIsAddingEmployee(true)}>
                    Tambah Manual
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleEmployeeFileChange}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary/10 file:text-primary
                      hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>
                
                {employeeData.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Preview Data ({employeeData.length} baris)</h3>
                    <div className="overflow-x-auto max-h-64 border rounded">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground bg-muted uppercase sticky top-0">
                          <tr>
                            <th className="px-4 py-2">Nama</th>
                            <th className="px-4 py-2">ID Pegawai</th>
                            <th className="px-4 py-2">No Rekening</th>
                            <th className="px-4 py-2">Gaji Pokok</th>
                            <th className="px-4 py-2">Tunjangan</th>
                            <th className="px-4 py-2">Tunjangan Koordinator</th>
                            <th className="px-4 py-2">Tunjangan Walikelas</th>
                            <th className="px-4 py-2">Tunjangan Lomba</th>
                            <th className="px-4 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeData.map((emp, i) => (
                            <tr key={i} className="border-b">
                              <td className="px-4 py-2">{emp.nama}</td>
                              <td className="px-4 py-2">{emp.nip}</td>
                              <td className="px-4 py-2">{emp.no_rekening || '-'}</td>
                              <td className="px-4 py-2">Rp {emp.gaji_pokok.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2">Rp {emp.tunjangan.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2">Rp {emp.tunjangan_koordinator.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2">Rp {emp.tunjangan_walikelas.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2">Rp {emp.tunjangan_lomba.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2">{emp.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button 
                      className="mt-4" 
                      onClick={uploadEmployeeData} 
                      disabled={loading}
                    >
                      {loading ? 'Uploading...' : 'Simpan Data Pegawai'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Daftar Pegawai yang Sudah Terdaftar + Kelola Kode Akses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-primary" />
                    {role === 'koperasi' ? 'Daftar Pegawai Sekolah' : 'Kelola Kode Akses Pegawai'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {role === 'koperasi' 
                      ? 'Daftar pegawai aktif dan nonaktif untuk sinkronisasi ID Koperasi.'
                      : 'Generate atau reset kode akses (PIN 6 digit) untuk login portal guru/staf.'}
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, ID Pegawai..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {role !== 'koperasi' && existingEmployees.length > 0 && (
                  <Button
                    variant="outline"
                    className="ml-2 gap-2 text-primary border-primary hover:bg-primary/10"
                    onClick={handleGenerateMassalKodeAkses}
                    disabled={generatingFor === 'massal'}
                  >
                    {generatingFor === 'massal' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    Generate Semua & Cetak
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingEmployees ? (
                <p className="text-sm text-muted-foreground animate-pulse">Memuat data pegawai...</p>
              ) : filteredEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada pegawai terdaftar. Upload data pegawai terlebih dahulu.</p>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted uppercase">
                      <tr>
                        <th className="px-4 py-3">Nama</th>
                        <th className="px-4 py-3">ID Pegawai</th>
                        <th className="px-4 py-3">No Rekening</th>
                        {role !== 'koperasi' && (
                          <>
                            <th className="px-4 py-3 text-right">Gaji Pokok</th>
                            <th className="px-4 py-3 text-right">Tunjangan</th>
                          </>
                        )}
                        <th className="px-4 py-3 text-center">Status</th>
                        {role !== 'koperasi' && (
                          <th className="px-4 py-3 text-center">Kode Akses</th>
                        )}
                        <th className="px-4 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredEmployees.map((emp) => {
                        const isSalaryRevealed = revealedSalaries.has(emp.id)
                        return (
                          <tr 
                            key={emp.id} 
                            className={`transition-colors ${
                              revealedPIN?.employeeId === emp.id 
                                ? 'bg-amber-50' 
                                : 'hover:bg-muted/30'
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-slate-800">{emp.nama}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.nip || '-'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.no_rekening || '-'}</td>
                            {role !== 'koperasi' && (
                              <>
                                <td className="px-4 py-3 text-right font-medium text-slate-800">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="font-mono">
                                      {isSalaryRevealed ? `Rp ${(emp.gaji_pokok || 0).toLocaleString('id-ID')}` : '••••••'}
                                    </span>
                                    <button
                                      onClick={() => toggleSalaryReveal(emp.id)}
                                      className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100/80"
                                      title={isSalaryRevealed ? 'Sembunyikan Gaji' : 'Tampilkan Gaji'}
                                    >
                                      {isSalaryRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono">
                                  {isSalaryRevealed ? `Rp ${(emp.tunjangan || 0).toLocaleString('id-ID')}` : '••••••'}
                                </td>
                              </>
                            )}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              emp.status === 'aktif' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          {role !== 'koperasi' && (
                            <td className="px-4 py-3 text-center">
                              {emp.kode_akses_hash ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md font-medium">
                                  <ShieldCheck className="w-3 h-3" />
                                  Sudah diset
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Belum diset</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                                onClick={() => openEditModal(emp)}
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </Button>
                              {role !== 'koperasi' && (
                                <Button
                                  variant={emp.kode_akses_hash ? "outline" : "default"}
                                  size="sm"
                                  className={`gap-1.5 text-xs ${
                                    emp.kode_akses_hash 
                                      ? 'border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800' 
                                      : ''
                                  }`}
                                  disabled={generatingFor === emp.id}
                                  onClick={() => handleGenerateKodeAkses(emp.id, emp.nama)}
                                >
                                  {generatingFor === emp.id ? (
                                    <>
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      Gen...
                                    </>
                                  ) : emp.kode_akses_hash ? (
                                    <>
                                      <RefreshCw className="w-3 h-3" />
                                      Reset PIN
                                    </>
                                  ) : (
                                    <>
                                      <KeyRound className="w-3 h-3" />
                                      Gen PIN
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              )}
              {role !== 'koperasi' ? (
                <p className="text-xs text-muted-foreground mt-3">
                  Total: {existingEmployees.length} pegawai &middot; {existingEmployees.filter(e => e.kode_akses_hash).length} sudah memiliki kode akses
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-3">
                  Total: {existingEmployees.length} pegawai terdaftar
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB SISWA */}
        <TabsContent value="siswa" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Data Siswa</CardTitle>
                <CardDescription className="mt-1 hidden md:block">
                  Upload file Excel (.xlsx) berisi: NISN, Nama, Kelas, Nama Wali.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadStudentTemplate}>
                  Download Template
                </Button>
                <Button variant="default" size="sm" onClick={() => setIsAddingStudent(true)}>
                  Tambah Manual
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleStudentFileChange}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary/10 file:text-primary
                    hover:file:bg-primary/20 cursor-pointer"
                />
              </div>
              
              {studentData.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Preview Data ({studentData.length} baris)</h3>
                  <div className="overflow-x-auto max-h-64 border rounded">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground bg-muted uppercase sticky top-0">
                        <tr>
                          <th className="px-4 py-2">NISN</th>
                          <th className="px-4 py-2">Nama</th>
                          <th className="px-4 py-2">Kelas</th>
                          <th className="px-4 py-2">Angkatan</th>
                          <th className="px-4 py-2 text-center">Status</th>
                          <th className="px-4 py-2">Nama Wali</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentData.map((std, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2">{std.nisn}</td>
                            <td className="px-4 py-2">{std.nama}</td>
                            <td className="px-4 py-2">{std.kelas}</td>
                            <td className="px-4 py-2">{std.angkatan || '-'}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                std.status === 'aktif' ? 'bg-green-100 text-green-700' :
                                std.status === 'lulus' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {std.status || 'aktif'}
                              </span>
                            </td>
                            <td className="px-4 py-2">{std.nama_wali}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button 
                    className="mt-4" 
                    onClick={uploadStudentData} 
                    disabled={loading}
                  >
                    {loading ? 'Uploading...' : 'Simpan Data Siswa'}
                  </Button>
                </div>
              )}

              {/* Daftar Siswa yang Sudah Terdaftar */}
              <div className="mt-8 border-t pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h3 className="font-bold text-lg">Siswa Terdaftar ({existingStudents.length})</h3>
                  <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-xl sm:justify-end">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari nama, NISN, kelas..."
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="w-full sm:w-44">
                      <select
                        value={selectedStudentAngkatan}
                        onChange={(e) => setSelectedStudentAngkatan(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="all">Semua Angkatan</option>
                        {uniqueAngkatans.map(a => (
                          <option key={a} value={a}>Angkatan {a}</option>
                        ))}
                      </select>
                    </div>
                    {selectedStudentAngkatan !== 'all' && (
                      <Button
                        variant="default"
                        className="h-10 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                        onClick={handleLuluskanAngkatan}
                        disabled={loadingStudents}
                      >
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Luluskan Angkatan
                      </Button>
                    )}
                  </div>
                </div>
                {loadingStudents ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Memuat data siswa...</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada siswa terdaftar.</p>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground bg-muted uppercase">
                        <tr>
                          <th className="px-4 py-3">NISN</th>
                          <th className="px-4 py-3">Nama</th>
                          <th className="px-4 py-3">Kelas</th>
                          <th className="px-4 py-3">Angkatan</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3">Nama Wali</th>
                          <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredStudents.map((s) => (
                          <tr 
                            key={s.id} 
                            className="hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => navigate(`/admin/student/${s.id}`)}
                          >
                            <td className="px-4 py-3 font-mono text-xs">{s.nisn}</td>
                            <td className="px-4 py-3 font-semibold text-primary hover:underline">{s.nama}</td>
                            <td className="px-4 py-3">{s.kelas}</td>
                            <td className="px-4 py-3">{s.angkatan || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                s.status === 'aktif' ? 'bg-green-100 text-green-700' :
                                s.status === 'lulus' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {s.status || 'aktif'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{s.nama_wali}</td>
                            <td className="px-4 py-3 text-center">
                              <ChevronRight className="w-4 h-4 text-muted-foreground inline-block" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md max-h-[95vh] flex flex-col shadow-xl border border-slate-200/80 bg-white">
            <CardHeader className="pb-4 shrink-0">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                <Pencil className="w-5 h-5 text-primary" />
                Edit Data Pegawai
              </CardTitle>
              <CardDescription>
                Sesuaikan informasi profil, gaji pokok, tunjangan, dan status keaktifan guru.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateEmployee} className="flex flex-col min-h-0">
              <CardContent className="space-y-4 overflow-y-auto py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_nama" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Lengkap</Label>
                  <Input 
                    id="edit_nama" 
                    value={editNama} 
                    onChange={e => setEditNama(e.target.value)} 
                    className="h-10 rounded-lg"
                    required 
                    disabled={role === 'koperasi'}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_nip" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">ID Pegawai</Label>
                  <Input 
                    id="edit_nip" 
                    value={editNip} 
                    onChange={e => setEditNip(e.target.value)} 
                    className="h-10 rounded-lg"
                    placeholder="Masukkan ID Pegawai (opsional)..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_no_rekening" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">No Rekening</Label>
                  <Input 
                    id="edit_no_rekening" 
                    value={editNoRekening} 
                    onChange={e => setEditNoRekening(e.target.value)} 
                    className="h-10 rounded-lg"
                    placeholder="Masukkan No Rekening (opsional)..."
                    disabled={role === 'koperasi'}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_gaji" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Gaji Pokok (Rp)</Label>
                    <Input 
                      id="edit_gaji" 
                      type="number" 
                      value={editGajiPokok} 
                      onChange={e => setEditGajiPokok(Number(e.target.value))} 
                      className="h-10 rounded-lg"
                      required 
                      min="0"
                      disabled={role === 'koperasi'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_tunjangan" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tunjangan Lain (Rp)</Label>
                    <Input 
                      id="edit_tunjangan" 
                      type="number" 
                      value={editTunjangan} 
                      onChange={e => setEditTunjangan(Number(e.target.value))} 
                      className="h-10 rounded-lg"
                      required 
                      min="0"
                      disabled={role === 'koperasi'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_tunjangan_koordinator" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tunjangan Koordinator (Rp)</Label>
                    <Input 
                      id="edit_tunjangan_koordinator" 
                      type="number" 
                      value={editTunjanganKoordinator} 
                      onChange={e => setEditTunjanganKoordinator(Number(e.target.value))} 
                      className="h-10 rounded-lg"
                      required 
                      min="0"
                      disabled={role === 'koperasi'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_tunjangan_walikelas" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tunjangan Walikelas (Rp)</Label>
                    <Input 
                      id="edit_tunjangan_walikelas" 
                      type="number" 
                      value={editTunjanganWalikelas} 
                      onChange={e => setEditTunjanganWalikelas(Number(e.target.value))} 
                      className="h-10 rounded-lg"
                      required 
                      min="0"
                      disabled={role === 'koperasi'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_tunjangan_lomba" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tunjangan Lomba (Rp)</Label>
                    <Input 
                      id="edit_tunjangan_lomba" 
                      type="number" 
                      value={editTunjanganLomba} 
                      onChange={e => setEditTunjanganLomba(Number(e.target.value))} 
                      className="h-10 rounded-lg"
                      required 
                      min="0"
                      disabled={role === 'koperasi'}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_status" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status Keaktifan</Label>
                  <select 
                    id="edit_status" 
                    value={editStatus} 
                    onChange={e => setEditStatus(e.target.value)}
                    disabled={role === 'koperasi'}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </CardContent>
              <div className="p-6 pt-4 shrink-0 border-t flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 h-10 rounded-lg" 
                  onClick={() => setEditingEmployee(null)}
                  disabled={isUpdatingEmployee}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 h-10 rounded-lg bg-green-600 hover:bg-green-700" 
                  disabled={isUpdatingEmployee}
                >
                  {isUpdatingEmployee ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md max-h-[95vh] flex flex-col shadow-xl border border-slate-200/80 bg-white">
            <CardHeader className="pb-4 shrink-0">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                Tambah Pegawai
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleAddEmployee} className="flex flex-col min-h-0">
              <CardContent className="space-y-4 overflow-y-auto py-4">
                <div className="space-y-2">
                  <Label htmlFor="add_nama" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Lengkap</Label>
                  <Input 
                    id="add_nama" 
                    value={addNama} 
                    onChange={e => setAddNama(e.target.value)} 
                    className="h-10 rounded-lg"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add_nip" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">ID Pegawai</Label>
                  <Input 
                    id="add_nip" 
                    value={addNip} 
                    onChange={e => setAddNip(e.target.value)} 
                    className="h-10 rounded-lg"
                    placeholder="Masukkan ID Pegawai (opsional)..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add_no_rekening" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">No Rekening</Label>
                  <Input 
                    id="add_no_rekening" 
                    value={addNoRekening} 
                    onChange={e => setAddNoRekening(e.target.value)} 
                    className="h-10 rounded-lg"
                    placeholder="Masukkan No Rekening (opsional)..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add_gaji" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Gaji Pokok (Rp)</Label>
                    <Input id="add_gaji" type="number" value={addGajiPokok} onChange={e => setAddGajiPokok(Number(e.target.value))} className="h-10 rounded-lg" required min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add_tunjangan" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tunjangan Lain (Rp)</Label>
                    <Input id="add_tunjangan" type="number" value={addTunjangan} onChange={e => setAddTunjangan(Number(e.target.value))} className="h-10 rounded-lg" required min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add_tunjangan_koordinator" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tunjangan Koord. (Rp)</Label>
                    <Input id="add_tunjangan_koordinator" type="number" value={addTunjanganKoordinator} onChange={e => setAddTunjanganKoordinator(Number(e.target.value))} className="h-10 rounded-lg" required min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add_tunjangan_walikelas" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tunj. Walikelas (Rp)</Label>
                    <Input id="add_tunjangan_walikelas" type="number" value={addTunjanganWalikelas} onChange={e => setAddTunjanganWalikelas(Number(e.target.value))} className="h-10 rounded-lg" required min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add_tunjangan_lomba" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tunjangan Lomba (Rp)</Label>
                    <Input id="add_tunjangan_lomba" type="number" value={addTunjanganLomba} onChange={e => setAddTunjanganLomba(Number(e.target.value))} className="h-10 rounded-lg" required min="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add_status" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status Keaktifan</Label>
                  <select id="add_status" value={addStatus} onChange={e => setAddStatus(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </CardContent>
              <div className="p-6 pt-4 shrink-0 border-t flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-10 rounded-lg" onClick={() => setIsAddingEmployee(false)} disabled={isSubmittingEmployee}>Batal</Button>
                <Button type="submit" className="flex-1 h-10 rounded-lg bg-green-600 hover:bg-green-700" disabled={isSubmittingEmployee}>{isSubmittingEmployee ? 'Menyimpan...' : 'Simpan'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md max-h-[95vh] flex flex-col shadow-xl border border-slate-200/80 bg-white">
            <CardHeader className="pb-4 shrink-0">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                Tambah Siswa
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleAddStudent} className="flex flex-col min-h-0">
              <CardContent className="space-y-4 overflow-y-auto py-4">
                <div className="space-y-2">
                  <Label htmlFor="add_siswa_nisn" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">NISN</Label>
                  <Input id="add_siswa_nisn" value={addSiswaNisn} onChange={e => setAddSiswaNisn(e.target.value)} className="h-10 rounded-lg" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add_siswa_nama" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Lengkap</Label>
                  <Input id="add_siswa_nama" value={addSiswaNama} onChange={e => setAddSiswaNama(e.target.value)} className="h-10 rounded-lg" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add_siswa_kelas" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Kelas</Label>
                    <Input id="add_siswa_kelas" value={addSiswaKelas} onChange={e => setAddSiswaKelas(e.target.value)} className="h-10 rounded-lg" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add_siswa_angkatan" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Angkatan</Label>
                    <Input id="add_siswa_angkatan" value={addSiswaAngkatan} onChange={e => setAddSiswaAngkatan(e.target.value)} className="h-10 rounded-lg" placeholder="Contoh: 2024/2025" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add_siswa_wali" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Wali</Label>
                  <Input id="add_siswa_wali" value={addSiswaNamaWali} onChange={e => setAddSiswaNamaWali(e.target.value)} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add_siswa_status" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</Label>
                  <select id="add_siswa_status" value={addSiswaStatus} onChange={e => setAddSiswaStatus(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="aktif">Aktif</option>
                    <option value="lulus">Lulus</option>
                    <option value="pindah">Pindah</option>
                    <option value="keluar">Keluar</option>
                  </select>
                </div>
              </CardContent>
              <div className="p-6 pt-4 shrink-0 border-t flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-10 rounded-lg" onClick={() => setIsAddingStudent(false)} disabled={isSubmittingStudent}>Batal</Button>
                <Button type="submit" className="flex-1 h-10 rounded-lg bg-green-600 hover:bg-green-700" disabled={isSubmittingStudent}>{isSubmittingStudent ? 'Menyimpan...' : 'Simpan'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      </div>

      {/* Render Print Component Only When Needed */}
      {printQueue && <KodeAksesPrint data={printQueue} />}
    </>
  )
}
