import { useEffect, useRef, useState } from 'react'

type User = {
  name?: string
  preferred_username?: string
}

function Login({ apiBase }: { apiBase: string }) {
  const onLogin = () => {
    window.location.href = `${apiBase}/login`
  }
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Sign in</h1>
      <p>Please sign in with your Microsoft account to continue.</p>
      <button
        onClick={onLogin}
        style={{
          background: '#2563eb',
          color: 'white',
          border: 'none',
          padding: '10px 14px',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Sign in with Microsoft
      </button>
    </div>
  )
}

function Home({ apiBase, user }: { apiBase: string; user: User }) {
  const [message, setMessage] = useState<string>('Loading...')
  const [toastMsg, setToastMsg] = useState<string>('')
  const [showToast, setShowToast] = useState<boolean>(false)
  const hideTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    fetch(`${apiBase}/hello`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setMessage(data.message ?? 'No message'))
      .catch(() => setMessage('API unavailable'))
  }, [])

  const handleTestClick = async () => {
    try {
      const res = await fetch(`${apiBase}/notify`)
      if (!res.ok) throw new Error('Request failed')
      const data: { message?: string } = await res.json()
      showToastNow(data.message ?? 'Notification')
    } catch (e) {
      showToastNow(`Failed: ${new Date().toLocaleString()}`)
    }
  }

  const onLogout = () => {
    window.location.href = `${apiBase}/logout`
  }

  const showToastNow = (msg: string) => {
    setToastMsg(msg)
    setShowToast(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Home</h1>
        <div>
          <span style={{ marginRight: 12 }}>{user.name || user.preferred_username}</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>
      <p>{message}</p>
      <button
        onClick={handleTestClick}
        style={{
          background: '#2563eb',
          color: 'white',
          border: 'none',
          padding: '10px 14px',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Test Notification
      </button>

      {showToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            background: '#111827',
            color: 'white',
            padding: '12px 14px',
            borderRadius: 10,
            boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
            maxWidth: 360,
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  )
}

function App() {
  // Use HOME_DIRECTORY from Vite env to prefix routes (e.g., '/parse')
  const homeDir = (import.meta.env.VITE_HOME_DIRECTORY as string | undefined) || ''
  const prefix = homeDir === '/' ? '' : (homeDir?.replace(/\/$/, '') || '')
  const apiBase = `${prefix}/api`

  const [authChecked, setAuthChecked] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${apiBase}/me`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (e) {
        setUser(null)
      } finally {
        setAuthChecked(true)
      }
    }
    check()
  }, [])

  if (!authChecked) return null
  if (!user) return <Login apiBase={apiBase} />
  return <Home apiBase={apiBase} user={user} />
}

export default App
