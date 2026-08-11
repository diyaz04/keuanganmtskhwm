import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'bendahara' | 'koperasi')[]
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, role, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center h-full p-8 text-muted-foreground">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // User is logged in but doesn't have the required role
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">Akses Ditolak</h2>
        <p className="text-muted-foreground">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}
