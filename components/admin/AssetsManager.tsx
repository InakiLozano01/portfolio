'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export default function AssetsManager() {
    const { toast } = useToast()
    const [cvUploading, setCvUploading] = useState(false)
    const [pfpUploading, setPfpUploading] = useState(false)
    const [selectedCv, setSelectedCv] = useState<File | null>(null)
    const [selectedPfp, setSelectedPfp] = useState<File | null>(null)

    const upload = async (file: File, url: string, setUploading: (v: boolean) => void, successMsg: string) => {
        try {
            setUploading(true)
            const form = new FormData()
            form.append('file', file)
            const res = await fetch(url, { method: 'POST', body: form })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.error || 'Upload failed')
            }
            toast({ title: 'Success', description: successMsg })
        } catch (err) {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Upload failed', variant: 'destructive' })
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Profile Picture (pfp.jpg)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setSelectedPfp(e.target.files?.[0] || null)}
                    />
                    <Button
                        onClick={() => selectedPfp && upload(selectedPfp, '/api/upload/pfp', setPfpUploading, 'Profile image updated')}
                        disabled={!selectedPfp || pfpUploading}
                    >
                        {pfpUploading ? 'Uploading...' : 'Upload Profile Image'}
                    </Button>
                    <p className="text-sm text-slate-500">JPEG/PNG/WebP, will be resized to 512x512 and saved as /public/pfp.jpg</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Curriculum Vitae (CV.pdf)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setSelectedCv(e.target.files?.[0] || null)}
                    />
                    <Button
                        onClick={() => selectedCv && upload(selectedCv, '/api/upload/cv', setCvUploading, 'CV updated')}
                        disabled={!selectedCv || cvUploading}
                    >
                        {cvUploading ? 'Uploading...' : 'Upload CV'}
                    </Button>
                    <p className="text-sm text-slate-500">PDF only. Will overwrite /public/CV.pdf</p>
                </CardContent>
            </Card>
        </div>
    )
}


