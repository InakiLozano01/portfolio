'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Mail, CheckCircle, AlertTriangle, Server } from 'lucide-react'

export default function EmailDiagnostics() {
    const { toast } = useToast()
    const [verifying, setVerifying] = useState(false)
    const [sending, setSending] = useState(false)
    const [verifyResult, setVerifyResult] = useState<{status: 'success' | 'error' | null, message: string | null}>({status: null, message: null})

    const testVerify = async () => {
        setVerifying(true)
        setVerifyResult({status: null, message: null})
        try {
            const res = await fetch('/api/contact/test', { method: 'GET' })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.message || 'Verification failed')
            setVerifyResult({status: 'success', message: data?.message || 'Email configuration OK'})
            toast({ title: 'Email verification', description: data?.message || 'OK' })
        } catch (err) {
            setVerifyResult({status: 'error', message: err instanceof Error ? err.message : 'Failed'})
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
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <Server className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900">Email Diagnostics</CardTitle>
                        <CardDescription className="text-xs mt-0.5">Troubleshoot SMTP configuration</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p>Use these tools to verify your SMTP settings and test email delivery capabilities.</p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button 
                            variant="outline" 
                            className="border-slate-300 text-slate-700 hover:bg-slate-50 h-auto py-3 flex flex-col items-center gap-2" 
                            disabled={verifying} 
                            onClick={testVerify}
                        >
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span>{verifying ? 'Verifying...' : 'Verify Connection'}</span>
                        </Button>
                        <Button 
                            variant="outline"
                            className="border-slate-300 text-slate-700 hover:bg-slate-50 h-auto py-3 flex flex-col items-center gap-2" 
                            disabled={sending} 
                            onClick={testSend}
                        >
                            <Mail className="w-5 h-5 text-blue-600" />
                            <span>{sending ? 'Sending...' : 'Send Test Email'}</span>
                        </Button>
                    </div>
                    
                    {verifyResult.status && (
                        <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                            verifyResult.status === 'success' 
                                ? 'bg-green-50 text-green-800 border border-green-100' 
                                : 'bg-red-50 text-red-800 border border-red-100'
                        }`}>
                            {verifyResult.status === 'success' 
                                ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> 
                                : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            }
                            <span>{verifyResult.message}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
