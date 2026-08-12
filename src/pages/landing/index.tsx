import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, GraduationCap, ArrowRight, ArrowLeft, Shield, BarChart3, Clock, Quote, HelpCircle, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Landing() { 
  const navigate = useNavigate()
  
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedRole, setSelectedRole] = useState<'guru' | 'siswa' | null>(null)
  const [roleBouncing, setRoleBouncing] = useState<'guru' | 'siswa' | null>(null)

  const [kodeAkses, setKodeAkses] = useState('')
  const [nisn, setNisn] = useState('')

  const handleRoleSelect = (role: 'guru' | 'siswa') => {
    if (step === 2) return // Do nothing if already in step 2
    
    // Trigger bounce animation first
    setRoleBouncing(role)
    
    // Delay transition slightly for micro-interaction feedback (180ms)
    setTimeout(() => {
      setRoleBouncing(null)
      setSelectedRole(role)
      setStep(2)
    }, 180)
  }

  const handleBack = () => {
    setStep(1)
    // Wait for morph-out transition to finish before clearing selectedRole
    setTimeout(() => {
      setSelectedRole(null)
    }, 500)
  }

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

  // Card 1: Guru Option classes (morphs/expands in place, other collapses)
  const guruCardClass = cn(
    "relative overflow-hidden group transition-all duration-500 ease-out flex flex-col justify-between w-full border",
    step === 1 
      ? "bg-white/85 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/10 hover:shadow-md hover:scale-[1.01] cursor-pointer p-4 rounded-2xl max-h-[140px] opacity-100 scale-100" 
      : selectedRole === 'guru'
        ? "bg-transparent border-transparent shadow-none p-0 cursor-default max-h-[500px] opacity-100 scale-100"
        : "max-h-0 opacity-0 scale-90 border-transparent p-0 my-0 overflow-hidden pointer-events-none"
  )

  // Card 2: Siswa Option classes (morphs/expands in place, other collapses)
  const siswaCardClass = cn(
    "relative overflow-hidden group transition-all duration-500 ease-out flex flex-col justify-between w-full border",
    step === 1 
      ? "bg-white/85 border-slate-100 hover:border-blue-300 hover:bg-blue-50/10 hover:shadow-md hover:scale-[1.01] cursor-pointer p-4 rounded-2xl max-h-[140px] opacity-100 scale-100" 
      : selectedRole === 'siswa'
        ? "bg-transparent border-transparent shadow-none p-0 cursor-default max-h-[500px] opacity-100 scale-100"
        : "max-h-0 opacity-0 scale-90 border-transparent p-0 my-0 overflow-hidden pointer-events-none"
  )

  return (
    <div className="relative z-0 flex flex-col items-center justify-start min-h-[calc(100vh-80px)] pt-6 md:pt-10 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden select-none bg-slate-50/30">
      {/* Scope-specific animations and styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(0.5deg); }
        }
        @keyframes float-glow-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -60px) scale(1.1); }
        }
        @keyframes float-glow-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1.05); }
          50% { transform: translate(-50px, 40px) scale(0.95); }
        }
        @keyframes bounce-icon {
          0%, 100% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(1.2) rotate(-10deg); }
          60% { transform: scale(0.9) rotate(8deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-glow-1 {
          animation: float-glow-1 14s ease-in-out infinite alternate;
        }
        .animate-glow-2 {
          animation: float-glow-2 18s ease-in-out infinite alternate;
        }
        .animate-bounce-icon {
          animation: bounce-icon 0.4s ease-out;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(226, 232, 240, 0.65);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.88);
          border-color: rgba(16, 185, 129, 0.32);
          box-shadow: 0 20px 40px -15px rgba(16, 185, 129, 0.12);
        }
        .glass-card-blue:hover {
          border-color: rgba(59, 130, 246, 0.32);
          box-shadow: 0 20px 40px -15px rgba(59, 130, 246, 0.12);
        }
      `}} />

      {/* Decorative Wave/Ribbon Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <svg className="absolute w-[180%] md:w-[120%] h-[150%] top-[-20%] left-[-20%] md:left-0 opacity-20 text-emerald-400" viewBox="0 0 1440 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100,600 C300,800 400,400 800,600 C1200,800 1300,500 1700,700 L1700,1200 L-100,1200 Z" fill="url(#wave-gradient)" />
          <defs>
            <linearGradient id="wave-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Grid Pattern Background (<5% opacity for subtle details) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none -z-20"></div>

      {/* Glow Blobs */}
      <div className="absolute top-[10%] left-[5%] w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-emerald-400/10 rounded-full blur-[100px] md:blur-[130px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute bottom-[5%] right-[5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-emerald-500/8 rounded-full blur-[110px] md:blur-[140px] pointer-events-none -z-10 animate-pulse"></div>

      {/* Huge Transparent Wallet Icons in the Background */}
      <div className="absolute right-[-10%] bottom-[10%] text-emerald-500/[0.03] pointer-events-none -z-20 rotate-[-15deg] hidden lg:block select-none">
        <Wallet size={480} strokeWidth={0.4} />
      </div>
      <div className="absolute left-[-5%] top-[10%] text-emerald-500/[0.02] pointer-events-none -z-20 rotate-[18deg] hidden lg:block select-none">
        <Wallet size={380} strokeWidth={0.4} />
      </div>

      {/* Main Responsive Split Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 w-full max-w-7xl mx-auto items-center pb-12 z-10">
        
        {/* LEFT COLUMN: Branding & Info */}
        <div className="flex flex-col items-start text-left max-w-xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-left-6 duration-700 -mt-6 lg:-mt-12">
          
          {/* Subtle Dotted Pattern Asset */}
          <div className="flex gap-1.5 mb-6 opacity-30 select-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="w-1 h-1 rounded-full bg-slate-400"></div>
                ))}
              </div>
            ))}
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-800 leading-tight">
            Sistem Informasi
          </h1>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-emerald-600 mt-1 leading-none">
            Keuangan
          </h2>
          <div className="flex flex-col items-start mt-4">
            <h3 className="text-xl md:text-2xl font-bold text-slate-700 leading-none">
              MTs KH A Wahab Muhsin
            </h3>
            <div className="w-16 h-1 bg-emerald-500 mt-2.5 rounded-full"></div>
          </div>

          <p className="text-slate-500 text-sm md:text-base mt-6 leading-relaxed max-w-xl">
            Sistem informasi keuangan yang transparan, akuntabel, dan modern untuk mendukung pengelolaan keuangan madrasah yang lebih baik.
          </p>

          {/* 3 Feature Badges */}
          <div className="grid grid-cols-3 gap-4 mt-8 w-full border-t border-slate-150/40 pt-6">
            {/* Aman */}
            <div className="flex flex-col items-start">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <span className="font-bold text-xs md:text-sm text-slate-800">Aman</span>
              <span className="text-[10px] md:text-xs text-slate-400 mt-1 leading-tight">Data keuangan terlindungi</span>
            </div>
            {/* Transparan */}
            <div className="flex flex-col items-start">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <span className="font-bold text-xs md:text-sm text-slate-800">Transparan</span>
              <span className="text-[10px] md:text-xs text-slate-400 mt-1 leading-tight">Informasi jelas & mudah diakses</span>
            </div>
            {/* Efisien */}
            <div className="flex flex-col items-start">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <span className="font-bold text-xs md:text-sm text-slate-800">Efisien</span>
              <span className="text-[10px] md:text-xs text-slate-400 mt-1 leading-tight">Proses cepat & terintegrasi</span>
            </div>
          </div>

          {/* Building Photo & Quote Card */}
          <div className="relative rounded-[32px] overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.04)] mt-10 w-full border border-slate-200/40 group">
            <img 
              src="/madrasah_building.jpg" 
              alt="Gedung MTs KH A Wahab Muhsin" 
              className="w-full h-[220px] md:h-[260px] object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Quote Overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-emerald-950/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white flex items-start gap-3">
              <Quote className="w-6 h-6 text-emerald-400 flex-shrink-0 opacity-80 mt-0.5" />
              <p className="text-[11px] md:text-xs font-semibold leading-relaxed italic text-emerald-50/90">
                "Kelola keuangan dengan amanah, wujudkan madrasah yang berkah dan maju."
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Login Container Card */}
        <div className="w-full max-w-lg mx-auto animate-in fade-in slide-in-from-right-6 duration-700">
          
          {/* Back Button (only shown in Step 2) */}
          <div className={cn(
            "w-full mb-3 flex items-center justify-start transition-all duration-300",
            step === 2 ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none -translate-x-4"
          )}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-slate-200/40 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </Button>
          </div>

          <div className="bg-white/72 backdrop-blur-xl border border-slate-200/65 shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-[36px] p-6 md:p-8 relative min-h-[460px] flex flex-col justify-between overflow-hidden">
            
            {/* Card Content Top Wrapper */}
            <div className="space-y-6 w-full">
              {/* Question & Subtitle Section */}
              <div className="flex flex-col items-center text-center">
                {/* Help/Info Icon */}
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                  <HelpCircle className="w-5 h-5 animate-pulse" />
                </div>
                
                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
                  {step === 1 ? (
                    <>Anda ingin <span className="text-emerald-600">masuk sebagai apa?</span></>
                  ) : selectedRole === 'guru' ? (
                    "Portal Staf & Guru"
                  ) : (
                    "Portal Wali Murid"
                  )}
                </h2>
                
                <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-sm">
                  {step === 1 
                    ? "Pilih salah satu gerbang masuk yang sesuai dengan peran Anda di sekolah." 
                    : "Silakan lengkapi formulir otentikasi di bawah ini untuk mengakses dashboard Anda."}
                </p>
              </div>

              {/* Portal Selector Cards & Forms Container */}
              <div className="relative min-h-[240px] flex flex-col justify-center gap-4 w-full">
                
                {/* Portal Staf & Guru Option (Card 1) */}
                <div 
                  onClick={() => handleRoleSelect('guru')}
                  className={guruCardClass}
                >
                  {/* Left accent color strip (only in step 1) */}
                  {step === 1 && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-100 group-hover:bg-emerald-400 transition-colors duration-300"></div>
                  )}
                  
                  <div className={cn("flex flex-col w-full", step === 2 && "gap-4")}>
                    <div className="flex items-start gap-4 pl-1">
                      {/* Icon */}
                      <div className={cn(
                        "w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300",
                        step === 1 && "group-hover:scale-105",
                        roleBouncing === 'guru' && "animate-bounce-icon"
                      )}>
                        <Briefcase className="w-5.5 h-5.5" />
                      </div>
                      
                      {/* Title & Description */}
                      <div className="text-left flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm md:text-base text-slate-800">Portal Staf & Guru</h4>
                        <p className="text-[11px] md:text-xs text-slate-400 mt-1 leading-relaxed">
                          Masuk menggunakan kode akses untuk melihat riwayat penggajian dan slip gaji bulanan Anda.
                        </p>
                      </div>

                      {/* Right green arrow button */}
                      {step === 1 && (
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 self-center">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Step 2 Form (in-place expansion reveal) */}
                    {step === 2 && selectedRole === 'guru' && (
                      <form onSubmit={handleCekGaji} className="w-full animate-in fade-in zoom-in-95 duration-500 delay-150" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1.5 text-left mb-4">
                          <Label htmlFor="kode_akses" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kode Akses / PIN</Label>
                          <Input 
                            id="kode_akses" 
                            type="password" 
                            placeholder="Masukkan 6-digit kode akses..." 
                            value={kodeAkses}
                            onChange={(e) => setKodeAkses(e.target.value)}
                            className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all rounded-xl h-10 text-xs placeholder:text-slate-400"
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-bold shadow-md hover:shadow-emerald-500/10 transition-all duration-300 border-0 flex items-center justify-center gap-2 cursor-pointer">
                          Cek Gaji
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Portal Wali Murid Option (Card 2) */}
                <div 
                  onClick={() => handleRoleSelect('siswa')}
                  className={siswaCardClass}
                >
                  {/* Left accent color strip (only in step 1) */}
                  {step === 1 && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-100 group-hover:bg-blue-400 transition-colors duration-300"></div>
                  )}
                  
                  <div className={cn("flex flex-col w-full", step === 2 && "gap-4")}>
                    <div className="flex items-start gap-4 pl-1">
                      {/* Icon */}
                      <div className={cn(
                        "w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300",
                        step === 1 && "group-hover:scale-105",
                        roleBouncing === 'siswa' && "animate-bounce-icon"
                      )}>
                        <GraduationCap className="w-5.5 h-5.5" />
                      </div>
                      
                      {/* Title & Description */}
                      <div className="text-left flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm md:text-base text-slate-800">Portal Wali Murid</h4>
                        <p className="text-[11px] md:text-xs text-slate-400 mt-1 leading-relaxed">
                          Masuk menggunakan NISN siswa untuk memantau status tagihan SPP dan konfirmasi pembayaran.
                        </p>
                      </div>

                      {/* Right blue arrow button */}
                      {step === 1 && (
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 self-center">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Step 2 Form (in-place expansion reveal) */}
                    {step === 2 && selectedRole === 'siswa' && (
                      <form onSubmit={handleCekTagihan} className="w-full animate-in fade-in zoom-in-95 duration-500 delay-150" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1.5 text-left mb-4">
                          <Label htmlFor="nisn" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">NISN Siswa</Label>
                          <Input 
                            id="nisn" 
                            type="text" 
                            placeholder="Masukkan NISN siswa..." 
                            value={nisn}
                            onChange={(e) => setNisn(e.target.value)}
                            className="bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl h-10 text-xs placeholder:text-slate-400"
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition-all duration-300 border-0 flex items-center justify-center gap-2 cursor-pointer">
                          Cek Tagihan
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </form>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Security Disclaimer Box */}
            <div className="w-full border-t border-slate-150/40 pt-4 mt-6">
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3 flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 opacity-80" />
                <span className="text-[10px] md:text-xs text-slate-450 leading-normal text-left font-medium">
                  Sistem ini dirancang untuk menjaga keamanan data dan memberikan layanan terbaik bagi seluruh civitas madrasah.
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-slate-400 text-[9px] md:text-xs font-bold uppercase tracking-widest no-print mt-12 border-t border-slate-100/60 z-10">
        Sistem Informasi Keuangan (SIK) MTs KH A Wahab Muhsin &middot; Copyright by Simpluse 2026
      </footer>
    </div>
  )
}
