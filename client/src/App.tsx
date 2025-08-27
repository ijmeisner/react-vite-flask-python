import { useEffect, useRef, useState } from 'react'

function App() {
  const [message, setMessage] = useState<string>('Loading...')
  const [toastMsg, setToastMsg] = useState<string>('')
  const [showToast, setShowToast] = useState<boolean>(false)
  const hideTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    fetch('/api/hello')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setMessage(data.message ?? 'No message'))
      .catch(() => setMessage('API unavailable'))
  }, [])

  const handleTestClick = async () => {
    try {
      const res = await fetch('/api/notify')
      if (!res.ok) throw new Error('Request failed')
      const data: { message?: string } = await res.json()
      showToastNow(data.message ?? 'Notification')
    } catch (e) {
      showToastNow(`Failed: ${new Date().toLocaleString()}`)
    }
  }

  const showToastNow = (msg: string) => {
    setToastMsg(msg)
    setShowToast(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Vite + React + TS</h1>
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

export default App
