import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, Eye, EyeOff, LogIn, Shield, BarChart3, Clock, Quote, Wallet, Key, ArrowLeft } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.session) {
        navigate('/admin/menu')
      }
    } catch (err: any) {
      setError(err.message || 'Gagal login. Periksa kembali email dan password Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-0 flex flex-col min-h-screen overflow-hidden select-none bg-slate-50/30">
      
      {/* Scope-specific animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(0.5deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}} />

      {/* Header school branding (hidden on mobile viewports matching mockup) */}
      <header className="hidden md:flex border-b border-slate-100 p-4 justify-between items-center bg-white shadow-sm sticky top-0 z-50 print:hidden">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo MTs" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-extrabold text-sm md:text-base text-emerald-800 leading-none">MTs KH A WAHAB MUHSIN</h1>
            <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 leading-none font-semibold uppercase tracking-wider">Unggul dalam Prestasi, Berakhlak Islami</p>
          </div>
        </Link>
      </header>

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

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none -z-20"></div>

      {/* Glow Blobs */}
      <div className="absolute top-[10%] left-[5%] w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-emerald-400/10 rounded-full blur-[100px] md:blur-[130px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[5%] right-[5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-emerald-500/8 rounded-full blur-[110px] md:blur-[140px] pointer-events-none -z-10"></div>

      {/* Huge Transparent Wallet Icons in the Background */}
      <div className="absolute right-[-10%] bottom-[10%] text-emerald-500/[0.03] pointer-events-none -z-20 rotate-[-15deg] hidden lg:block select-none">
        <Wallet size={480} strokeWidth={0.4} />
      </div>
      <div className="absolute left-[-5%] top-[10%] text-emerald-500/[0.02] pointer-events-none -z-20 rotate-[18deg] hidden lg:block select-none">
        <Wallet size={380} strokeWidth={0.4} />
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. DESKTOP LAYOUT (lg:flex) */}
      {/* ---------------------------------------------------- */}
      <div className="hidden lg:grid grid-cols-2 gap-12 lg:gap-16 w-full max-w-7xl mx-auto items-center pb-12 z-10 relative flex-1 pt-6 md:pt-10 px-4 sm:px-6 lg:px-8">
        
        {/* LEFT COLUMN: Branding & Info */}
        <div className="flex flex-col items-start text-left max-w-xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-left-6 duration-700 -mt-20 lg:-mt-40">
          {/* Dotted Pattern */}
          <div className="flex gap-1.5 mb-6 opacity-30 select-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="w-1 h-1 rounded-full bg-slate-400"></div>
                ))}
              </div>
            ))}
          </div>

          <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.25em] leading-none mb-3">
            Sistem Informasi
          </span>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-800 leading-none">
            Keuangan
          </h2>
          <div className="flex flex-col items-start mt-4">
            <h3 className="text-xl md:text-2xl font-bold text-emerald-600 leading-none">
              MTs KH A Wahab Muhsin
            </h3>
            <div className="w-16 h-1 bg-emerald-500 mt-2.5 rounded-full"></div>
          </div>

          <p className="text-slate-500 text-sm md:text-base mt-6 leading-relaxed max-w-xl">
            Sistem informasi keuangan yang transparan, akuntabel, dan modern untuk mendukung pengelolaan keuangan madrasah yang lebih baik.
          </p>

          {/* Building Photo & Quote Card */}
          <div className="relative rounded-[32px] overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.04)] mt-10 w-full border border-slate-200/40 group">
            <img 
              src="/madrasah_building.jpg" 
              alt="Gedung MTs KH A Wahab Muhsin" 
              className="w-full h-[220px] md:h-[260px] object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-emerald-950/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white flex items-start gap-3">
              <Quote className="w-6 h-6 text-emerald-400 flex-shrink-0 opacity-80 mt-0.5" />
              <p className="text-[11px] md:text-xs font-semibold leading-relaxed italic text-emerald-50/90">
                "Kelola keuangan dengan amanah, wujudkan madrasah yang berkah dan maju."
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Login Card Container */}
        <div className="w-full max-w-lg mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-right-6 duration-700">
          {/* Back Button */}
          <div className="w-full flex items-center justify-start">
            <Link 
              to="/"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-slate-200/40 shadow-sm cursor-pointer transition-colors duration-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Beranda
            </Link>
          </div>

          {/* Login Card */}
          <div className="bg-white/72 backdrop-blur-xl border border-slate-200/65 shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-[36px] p-6 md:p-8 relative min-h-[480px] flex flex-col justify-between overflow-hidden">
            <div className="absolute top-6 right-6 w-10 h-10 bg-emerald-50/80 border border-emerald-100/50 rounded-full flex items-center justify-center text-emerald-600 select-none">
              <Shield className="w-5 h-5 fill-emerald-50/30" />
            </div>

            <div className="w-full space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center p-2 mb-4 animate-float">
                  <img src="/logo.png" alt="Logo MTs" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
                  Login <span className="text-emerald-600">Staf</span>
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">
                  Masukkan email dan password untuk masuk ke dashboard Admin/Bendahara.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs font-semibold">
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</Label>
                  <div className="flex rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden bg-white/80 transition-all">
                    <div className="w-12 h-10 bg-emerald-50 text-emerald-600 flex items-center justify-center border-r border-slate-100/60 flex-shrink-0">
                      <Mail className="w-4.5 h-4.5" />
                    </div>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Masukkan email Anda" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 text-xs placeholder:text-slate-400 w-full bg-transparent pl-3"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="flex rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden bg-white/80 transition-all">
                    <div className="w-12 h-10 bg-emerald-50 text-emerald-600 flex items-center justify-center border-r border-slate-100/60 flex-shrink-0">
                      <Lock className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 flex items-center pr-3">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Masukkan password Anda" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 text-xs placeholder:text-slate-400 w-full bg-transparent pl-3"
                        required 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-650 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="remember_me" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 w-3.5 h-3.5 cursor-pointer accent-emerald-600"
                    />
                    <label htmlFor="remember_me" className="text-xs text-slate-500 font-medium cursor-pointer select-none">
                      Ingat saya
                    </label>
                  </div>
                  <Link to="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                    Lupa password?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-bold shadow-md hover:shadow-emerald-500/10 transition-all duration-300 border-0 flex items-center justify-center gap-2 cursor-pointer mt-4" 
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Login
                    </>
                  )}
                </Button>
              </form>

              {/* SSO */}
              <div className="space-y-4 pt-4 border-t border-slate-150/40">
                <div className="relative flex py-1.5 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">atau masuk dengan</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-11 rounded-xl border-slate-200 hover:bg-slate-50/80 text-slate-600 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Key className="w-4 h-4 text-slate-400" />
                  Login dengan Akun Madrasah (SSO)
                </Button>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="grid grid-cols-3 gap-3 w-full mt-2">
            <div className="flex flex-col items-start bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">Aman</span>
              <span className="text-[9px] text-slate-400 mt-1 leading-normal font-medium">Data keuangan terlindungi dengan sistem keamanan berlapis.</span>
            </div>
            <div className="flex flex-col items-start bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">Transparan</span>
              <span className="text-[9px] text-slate-400 mt-1 leading-normal font-medium">Informasi jelas dan mudah diakses kapan saja.</span>
            </div>
            <div className="flex flex-col items-start bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">Efisien</span>
              <span className="text-[9px] text-slate-400 mt-1 leading-normal font-medium">Proses cepat dan terintegrasi untuk efisiensi kerja.</span>
            </div>
          </div>
        </div>

      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. MOBILE LAYOUT (lg:hidden) */}
      {/* ---------------------------------------------------- */}
      <div className="lg:hidden flex flex-col items-center justify-start w-full px-4 pt-6 pb-20 space-y-6 z-10 relative flex-1">
        
        {/* Back Button for mobile */}
        <div className="w-full flex items-center justify-start">
          <Link 
            to="/"
            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl flex items-center gap-1 px-2.5 py-1.5 bg-white/60 border border-slate-200/40 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            Kembali
          </Link>
        </div>

        {/* Top Circular Logo */}
        <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 animate-float select-none">
          <img src="/logo.png" alt="Logo MTs" className="w-full h-full object-contain" />
        </div>

        {/* Title branding for mobile */}
        <div className="text-center space-y-1.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Selamat Datang di</p>
          <h2 className="text-2xl font-black text-slate-800 leading-none">Sistem Informasi</h2>
          <h3 className="text-3xl font-black text-emerald-600 leading-none">Keuangan</h3>
          
          {/* Divider Line Ornament */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="w-6 h-[1px] bg-gradient-to-r from-transparent to-emerald-500"></div>
            <span className="text-[10px] font-bold text-slate-650 tracking-wider">MTs KH A Wahab Muhsin</span>
            <div className="w-6 h-[1px] bg-gradient-to-l from-transparent to-emerald-500"></div>
          </div>
          
          <p className="text-slate-500 text-[10px] px-4 pt-1.5 leading-relaxed max-w-xs mx-auto">
            Sistem informasi keuangan yang transparan, akuntabel, dan modern untuk mendukung pengelolaan keuangan madrasah.
          </p>
        </div>

        {/* Login Staf Card for mobile */}
        <div className="bg-white/75 backdrop-blur-xl border border-slate-200/60 shadow-[0_12px_30px_rgba(0,0,0,0.03)] rounded-[28px] p-5 w-full max-w-sm relative flex flex-col justify-between overflow-hidden">
          <div className="absolute top-5 right-5 w-8 h-8 bg-emerald-50 border border-emerald-100/50 rounded-full flex items-center justify-center text-emerald-600">
            <Shield className="w-4 h-4" />
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <h4 className="text-base font-extrabold text-slate-800">Login <span className="text-emerald-600">Staf</span></h4>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                Masukkan email dan password untuk masuk ke dashboard Admin/Bendahara.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-650 p-2.5 rounded-xl text-[10px] font-bold text-left">
                  {error}
                </div>
              )}
              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="email_mobile" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email</Label>
                <div className="flex rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden bg-white transition-all">
                  <div className="w-10 h-9 bg-emerald-50 text-emerald-600 flex items-center justify-center border-r border-slate-100 flex-shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <Input 
                    id="email_mobile" 
                    type="email" 
                    placeholder="Masukkan email Anda" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-xs placeholder:text-slate-400 w-full bg-transparent pl-2.5"
                    required 
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <Label htmlFor="password_mobile" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Password</Label>
                <div className="flex rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden bg-white transition-all">
                  <div className="w-10 h-9 bg-emerald-50 text-emerald-600 flex items-center justify-center border-r border-slate-100 flex-shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 flex items-center pr-2.5">
                    <Input 
                      id="password_mobile" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Masukkan password Anda" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-xs placeholder:text-slate-400 w-full bg-transparent pl-2.5"
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-650 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Keep Me Logged In */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-1.5">
                  <input 
                    type="checkbox" 
                    id="remember_me_mobile" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 w-3 h-3 cursor-pointer accent-emerald-600"
                  />
                  <label htmlFor="remember_me_mobile" className="text-[10px] text-slate-500 font-medium cursor-pointer select-none">
                    Ingat saya
                  </label>
                </div>
                <Link to="/forgot-password" className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700">
                  Lupa password?
                </Link>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-bold shadow-md transition-all duration-300 border-0 flex items-center justify-center gap-2 cursor-pointer mt-2.5" 
                disabled={loading}
              >
                {loading ? 'Memproses...' : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Login
                  </>
                )}
              </Button>
            </form>

            {/* SSO */}
            <div className="space-y-3 pt-3 border-t border-slate-150/40">
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-[9px] text-slate-400 font-semibold uppercase tracking-wider">atau masuk dengan</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
              <Button 
                variant="outline" 
                className="w-full h-10 rounded-xl border-slate-200 hover:bg-slate-50/80 text-slate-650 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-slate-450" />
                Login dengan Akun Madrasah (SSO)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <footer className="w-full text-center py-4 md:py-6 text-slate-400 text-[8px] md:text-xs font-bold uppercase tracking-wider md:tracking-widest no-print border-t border-slate-100/60 z-10 bg-white/30 backdrop-blur-sm mt-auto">
        Sistem Informasi Keuangan (SIK) MTs KH A Wahab Muhsin &middot; Copyright by Simpluse 2026
      </footer>
    </div>
  )
}
