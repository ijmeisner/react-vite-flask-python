import { useEffect, useState } from 'react'
import Home from './pages/Home'

function App() {
  // Use HOME_DIRECTORY from Vite env to prefix routes (e.g., '/parse')
  const homeDir = (import.meta.env.VITE_HOME_DIRECTORY as string | undefined) || ''
  const prefix = homeDir === '/' ? '' : (homeDir?.replace(/\/$/, '') || '')
  const apiBase = `${prefix}/api`
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  useEffect(() => {
    // Determine session status via a lightweight API call
    fetch(`${apiBase}/hello`, { credentials: 'include' })
      .then(res => { setLoggedIn(res.ok) })
      .catch(() => setLoggedIn(false))
  }, [])

  if (loggedIn === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!loggedIn) {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-semibold">Syniti Template</h1>
          <a href={`${prefix}/logout`} className="rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-soft hover:bg-primary-hover">Logout</a>
        </div>
      </header>
      <main className="container py-8">
        <Home apiBase={apiBase} />
      </main>
    </div>
  )
}

export default App
