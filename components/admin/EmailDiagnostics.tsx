'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export default function EmailDiagnostics() {
    const { toast } = useToast()
    const [verifying, setVerifying] = useState(false)
    const [sending, setSending] = useState(false)
    const [verifyResult, setVerifyResult] = useState<string | null>(null)

    const testVerify = async () => {
        setVerifying(true)
        setVerifyResult(null)
        try {
            const res = await fetch('/api/contact/test', { method: 'GET' })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.message || 'Verification failed')
            setVerifyResult(data?.message || 'Email configuration OK')
            toast({ title: 'Email verification', description: data?.message || 'OK' })
        } catch (err) {
            toast({ title: 'Verification error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' })
        } finally { setVerifying(false) }
    }

    const testSend = async () => {
        setSending(true)
        try {
            const res = await fetch('/api/contact/test', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.message || 'Test email failed')
            toast({ title: 'Test email', description: 'Sent successfully' })
        } catch (err) {
            toast({ title: 'Test email error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' })
        } finally { setSending(false) }
    }

    return (
        <Card className="max-w-xl">
            <CardHeader>
                <CardTitle>Email diagnostics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="text-sm text-slate-600">
                    Verify SMTP configuration and send a test message to the admin.
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-blue-200 text-blue-700" disabled={verifying} onClick={testVerify}>
                        {verifying ? 'Verifying...' : 'Verify connection'}
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700" disabled={sending} onClick={testSend}>
                        {sending ? 'Sending...' : 'Send test email'}
                    </Button>
                </div>
                {verifyResult && (
                    <div className="text-sm text-green-700">{verifyResult}</div>
                )}
            </CardContent>
        </Card>
    )
}


