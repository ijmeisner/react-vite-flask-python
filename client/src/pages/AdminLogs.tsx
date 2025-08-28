import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Props = { apiBase: string }

export default function AdminLogs({ apiBase }: Props) {
  const [logs, setLogs] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/logs`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load logs')
      const text = await res.text()
      setLogs(text)
    } catch (e) {
      setLogs('Error loading logs')
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="shadow-medium">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Application Logs</h2>
            <div className="flex items-center gap-2">
              <Button onClick={fetchLogs} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
              <Button variant="outline" onClick={() => setLogs('')}>Clear View</Button>
            </div>
          </div>
          <div className="border rounded bg-muted/20 p-3 max-h-[60vh] overflow-auto">
            <pre className="text-sm whitespace-pre-wrap break-words leading-relaxed">{logs || 'No logs yet.'}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

