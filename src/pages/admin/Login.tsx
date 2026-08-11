import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  
  // The role will be fetched by AuthContext and will trigger a redirect on successful login in App.tsx layout/routes
  
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
        // Successful login, wait for role fetch or redirect
        navigate('/admin/menu')
      }
    } catch (err: any) {
      setError(err.message || 'Gagal login. Periksa kembali email dan password Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
      <div className="w-full max-w-md px-2">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
          &larr; Kembali ke Beranda
        </Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <CardTitle className="text-2xl text-center">Login Staf</CardTitle>
          <CardDescription className="text-center">
            Masukkan email dan password untuk masuk ke dashboard Admin/Bendahara.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Login'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
