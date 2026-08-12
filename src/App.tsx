import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom"
import Landing from "@/pages/landing"
import Portal from "@/pages/portal"
import Login from "@/pages/admin/Login"
import DashboardLayout from "@/pages/admin/DashboardLayout"
import AdminDashboard from "@/pages/admin/AdminDashboard"
import BendaharaDashboard from "@/pages/admin/BendaharaDashboard"
import ManageAccounts from "@/pages/admin/ManageAccounts"
import MasterPotongan from "@/pages/admin/MasterPotongan"
import ImportKoperasi from "@/pages/admin/ImportKoperasi"
import MasterData from "@/pages/admin/MasterData"
import ManageTagihan from "@/pages/admin/ManageTagihan"
import TagihanLama from "@/pages/admin/TagihanLama"
import TagihanConfig from "@/pages/admin/TagihanConfig"
import StudentDetail from "@/pages/admin/StudentDetail"
import Penggajian from "@/pages/admin/Penggajian"
import MenuHome from "@/pages/admin/MenuHome"
import SettingsPage from "@/pages/admin/Settings"
import VerifyDocument from "@/pages/public/VerifyDocument"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AuthProvider } from "@/contexts/AuthContext"

import { Lock } from "lucide-react"

function RoleBasedRedirect() {
  return <Navigate to="/admin/menu" replace />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
          
          <Routes>
            {/* Public Routes with standard layout */}
            <Route path="/" element={
              <>
                <header className="border-b border-slate-100 p-4 flex justify-between items-center bg-white shadow-sm sticky top-0 z-50 print:hidden">
                  <Link to="/" className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo MTs" className="w-10 h-10 object-contain" />
                    <div>
                      <h1 className="font-extrabold text-sm md:text-base text-emerald-800 leading-none">MTs KH A WAHAB MUHSIN</h1>
                      <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 leading-none font-semibold uppercase tracking-wider">Unggul dalam Prestasi, Berakhlak Islami</p>
                    </div>
                  </Link>
                  <nav className="flex-shrink-0 ml-2">
                    <Link to="/admin/login" className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] md:text-xs px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl transition-all shadow-md flex-shrink-0">
                      <Lock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      Login Admin
                    </Link>
                  </nav>
                </header>
                <main className="flex-1 w-full print:p-0">
                  <Landing />
                </main>
              </>
            } />
            <Route path="/portal/*" element={
              <>
                <header className="hidden sm:flex border-b p-4 gap-4 items-center bg-white shadow-sm sticky top-0 z-10 print:hidden">
                  <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary mr-auto">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                    Sistem Keuangan MTs
                  </Link>
                </header>
                <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 print:p-0">
                  <Portal />
                </main>
              </>
            } />

            {/* Admin Login Route */}
            <Route path="/admin/login" element={
              <main className="flex-1 w-full print:p-0">
                <Login />
              </main>
            } />

            {/* Public Verification Route */}
            <Route path="/verify/:type/:id" element={
              <main className="flex-1 w-full min-h-screen bg-slate-50">
                <VerifyDocument />
              </main>
            } />

            {/* Protected Admin/Bendahara/Koperasi Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'bendahara', 'koperasi']} />}>
              <Route element={<DashboardLayout />}>
                
                <Route path="/admin/menu" element={
                  <ProtectedRoute allowedRoles={['admin', 'bendahara', 'koperasi']}>
                    <MenuHome />
                  </ProtectedRoute>
                } />

                <Route path="/admin/settings" element={
                  <ProtectedRoute allowedRoles={['admin', 'bendahara', 'koperasi']}>
                    <SettingsPage />
                  </ProtectedRoute>
                } />

                {/* Dashboard router based on role is handled simply by explicit routes or a redirect */}
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/accounts" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageAccounts />
                  </ProtectedRoute>
                } />

                <Route path="/admin/potongan" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <MasterPotongan />
                  </ProtectedRoute>
                } />

                <Route path="/admin/master-data" element={
                  <ProtectedRoute allowedRoles={['admin', 'koperasi']}>
                    <MasterData />
                  </ProtectedRoute>
                } />

                <Route path="/admin/koperasi" element={
                  <ProtectedRoute allowedRoles={['admin', 'bendahara', 'koperasi']}>
                    <ImportKoperasi />
                  </ProtectedRoute>
                } />

                <Route path="/admin/bendahara" element={
                  <ProtectedRoute allowedRoles={['admin', 'bendahara']}>
                    <BendaharaDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/admin/payroll" element={
                  <ProtectedRoute allowedRoles={['admin', 'bendahara']}>
                    <Penggajian />
                  </ProtectedRoute>
                } />
                <Route path="/admin/bills" element={
                  <ProtectedRoute allowedRoles={['admin', 'bendahara']}>
                    <ManageTagihan />
                  </ProtectedRoute>
                } />
                <Route path="/admin/tagihan-lama" element={
                  <ProtectedRoute allowedRoles={['admin', 'bendahara']}>
                    <TagihanLama />
                  </ProtectedRoute>
                } />
                <Route path="/admin/tagihan-config" element={
                  <ProtectedRoute allowedRoles={['admin', 'bendahara']}>
                    <TagihanConfig />
                  </ProtectedRoute>
                } />
                <Route path="/admin/student/:studentId" element={
                  <ProtectedRoute allowedRoles={['admin', 'bendahara']}>
                    <StudentDetail />
                  </ProtectedRoute>
                } />
                
                {/* Catch all admin route redirects */}
                <Route path="/admin" element={
                  <RoleBasedRedirect />
                } />
              </Route>
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
