import { useState } from 'react'
import synitiLogo from '../assets/syniti-logo.svg'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

type Props = { apiBase: string }

export default function Home({ apiBase }: Props) {
  const [busy, setBusy] = useState(false)

  const handleTestServer = async () => {
    try {
      setBusy(true)
      const res = await fetch(`${apiBase}/notify`, { credentials: 'include' })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      const who = (data.user || data.sub || '').toString()
      toast({
        title: 'Server response',
        description: `${data.message}${who ? ` (user: ${who})` : ''}`,
      })
    } catch (e) {
      toast({
        title: 'Server test failed',
        description: 'Unable to reach the Flask API',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="mb-8">
          <img src={synitiLogo} alt="Syniti Logo" className="h-20 mx-auto" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Welcome to Syniti Template</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            This is a modern React application built with Flask boilerplate structure. The
            application maintains your purple branding while providing a clean, modern interface.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <Card className="shadow-medium">
        <CardContent className="p-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center mb-6">Application Features</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <div className="w-6 h-6 bg-primary rounded" />
                </div>
                <h3 className="font-semibold mb-2">User Management</h3>
                <p className="text-sm text-muted-foreground">Complete admin dashboard for managing users, roles, and permissions.</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <div className="w-6 h-6 bg-primary rounded" />
                </div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground">Support for both local authentication and Azure OAuth integration.</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <div className="w-6 h-6 bg-primary rounded" />
                </div>
                <h3 className="font-semibold mb-2">Log Monitoring</h3>
                <p className="text-sm text-muted-foreground">Real-time log viewer for debugging and system monitoring.</p>
              </div>
            </div>

            <div className="text-center pt-6 border-t border-border">
              <p className="text-muted-foreground">
                Navigate using the menu above to explore the admin features and user management tools.
              </p>
              <Button className="mt-4" onClick={handleTestServer} disabled={busy}>
                {busy ? 'Testing…' : 'Test Server'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
