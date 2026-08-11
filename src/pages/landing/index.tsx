import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, GraduationCap, ArrowRight } from 'lucide-react'

export default function Landing() { 
  const navigate = useNavigate()
  
  const [kodeAkses, setKodeAkses] = useState('')
  const [nisn, setNisn] = useState('')

  const handleCekGaji = (e: React.FormEvent) => {
    e.preventDefault()
    if (kodeAkses.trim()) {
      navigate(`/portal?type=guru&code=${encodeURIComponent(kodeAkses)}`)
    }
  }

  const handleCekTagihan = (e: React.FormEvent) => {
    e.preventDefault()
    if (nisn.trim()) {
      navigate(`/portal?type=siswa&nisn=${encodeURIComponent(nisn)}`)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-140px)] py-4 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      {/* Scope-specific animations and styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(0.5deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.05); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-glow {
          animation: pulse-glow 8s ease-in-out infinite;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(226, 232, 240, 0.7);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-4px);
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 15px 30px -10px rgba(16, 185, 129, 0.1);
        }
        .glass-card-blue:hover {
          border-color: rgba(59, 130, 246, 0.35);
          box-shadow: 0 15px 30px -10px rgba(59, 130, 246, 0.1);
        }
      `}} />

      {/* Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-glow"></div>
      <div className="absolute top-2/3 left-1/3 w-[350px] h-[350px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-20"></div>

      {/* Title & Description Section */}
      <div className="text-center max-w-3xl mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="inline-flex items-center justify-center mb-3 animate-float">
          <div className="relative p-2 rounded-2xl bg-gradient-to-b from-white to-emerald-50/50 shadow-sm border border-emerald-100/50">
            <img src="/logo.png" alt="Logo MTs" className="w-16 h-16 object-contain" />
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur opacity-15 -z-10 animate-pulse"></div>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-3 bg-gradient-to-r from-emerald-950 via-emerald-800 to-green-800 bg-clip-text text-transparent leading-tight drop-shadow-sm">
          Sistem Informasi Keuangan
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          Platform terpadu untuk transparansi administrasi <span className="font-semibold text-emerald-800">MTs KH A Wahab Muhsin</span>. 
          Akses slip gaji staf dan pantau tagihan siswa dengan mudah, aman, dan instan.
        </p>
      </div>

      {/* Portal Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl px-2">
        
        {/* Card Guru/Karyawan */}
        <Card className="glass-card relative overflow-hidden group border-border/40 rounded-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-600 opacity-80"></div>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300 border border-emerald-100/40">
              <Briefcase className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl text-slate-800 font-bold">Portal Staf & Guru</CardTitle>
            <CardDescription className="text-slate-500 text-xs mt-1 leading-relaxed">
              Masuk menggunakan kode akses untuk melihat riwayat penggajian dan slip gaji bulanan Anda.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCekGaji}>
            <CardContent className="px-5 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="kode_akses" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Kode Akses / PIN</Label>
                <Input 
                  id="kode_akses" 
                  type="password" 
                  placeholder="Masukkan 6-digit kode akses..." 
                  value={kodeAkses}
                  onChange={(e) => setKodeAkses(e.target.value)}
                  className="bg-white/80 border-slate-200/80 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all rounded-xl h-10 text-sm placeholder:text-slate-400"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="pt-1 pb-4 px-5">
              <Button type="submit" className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-semibold shadow-md hover:shadow-emerald-500/10 transition-all duration-300 group/btn border-0">
                Cek Gaji
                <ArrowRight className="ml-2 w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Card Wali Murid */}
        <Card className="glass-card glass-card-blue relative overflow-hidden group border-border/40 rounded-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-600 opacity-80"></div>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300 border border-blue-100/40">
              <GraduationCap className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl text-slate-800 font-bold">Portal Wali Murid</CardTitle>
            <CardDescription className="text-slate-500 text-xs mt-1 leading-relaxed">
              Masuk menggunakan NISN siswa untuk memantau status tagihan SPP dan konfirmasi pembayaran.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCekTagihan}>
            <CardContent className="px-5 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="nisn" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">NISN Siswa</Label>
                <Input 
                  id="nisn" 
                  type="text" 
                  placeholder="Masukkan NISN siswa..." 
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  className="bg-white/80 border-slate-200/80 focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl h-10 text-sm placeholder:text-slate-400"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="pt-1 pb-4 px-5">
              <Button type="submit" className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md hover:shadow-blue-500/10 transition-all duration-300 group/btn border-0">
                Cek Tagihan
                <ArrowRight className="ml-2 w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">
        Sistem Informasi Keuangan (SIK) MTs KH A Wahab Muhsin &middot; copyright by simpluse 2026
      </footer>
    </div>
  )
}
