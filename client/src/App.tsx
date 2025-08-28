import { useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import AdminLogs from './pages/AdminLogs'
import { useAuth } from '@/context/AuthContext'

function App() {
  // Compute backend prefixes once
  const { prefix, apiBase } = useMemo(() => {
    const homeDir = (import.meta.env.VITE_HOME_DIRECTORY as string | undefined) || ''
    const p = homeDir === '/' ? '' : (homeDir?.replace(/\/$/, '') || '')
    return { prefix: p, apiBase: `${p}/api` }
  }, [])

  const { user, loading } = useAuth()
  const loggedIn = !!user

  return (
    <BrowserRouter basename={prefix || '/'}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth loading={loading} loggedIn={loggedIn}>
              <ProtectedLayout prefix={prefix}>
                <Home apiBase={apiBase} />
              </ProtectedLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/logs"
          element={
            <RequireAuth loading={loading} loggedIn={loggedIn}>
              <ProtectedLayout prefix={prefix}>
                <AdminLogs apiBase={apiBase} />
              </ProtectedLayout>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function RequireAuth({ children, loading, loggedIn }: { children: React.ReactNode, loading: boolean, loggedIn: boolean }) {
  const location = useLocation()
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }
  if (!loggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}

function ProtectedLayout({ children, prefix }: { children: React.ReactNode, prefix: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <nav className="flex items-center gap-4">
            <Link to="/" className="text-xl font-semibold">Syniti Template</Link>
            <Link to="/logs" className="text-sm text-muted-foreground hover:text-foreground">Logs</Link>
          </nav>
          <a href={`${prefix}/logout`} className="rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-soft hover:bg-primary-hover">Logout</a>
        </div>
      </header>
      <main className="container py-8">
        {children}
      </main>
    </div>
  )
}

export default App
