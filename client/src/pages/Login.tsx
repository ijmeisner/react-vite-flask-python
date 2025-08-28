import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { user, loading } = useAuth()

  const homeDir = (import.meta.env.VITE_HOME_DIRECTORY as string | undefined) || ''
  const prefix = homeDir === '/' ? '' : (homeDir?.replace(/\/$/, '') || '')

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-white to-secondary">
      <div className="rounded-lg border bg-card p-8 shadow-medium">
        <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
        <p className="mb-6 max-w-md text-sm text-muted-foreground">Please sign in with your Microsoft account to continue.</p>
        <a href={`${prefix}/azure_login`} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-soft transition hover:bg-primary-hover">
          Sign in with Microsoft
        </a>
      </div>
    </div>
  )
}
