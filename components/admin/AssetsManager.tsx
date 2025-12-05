'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { FileText, Image as ImageIcon, UploadCloud, AlertCircle, FileType } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
            // Reset selection
            if (url.includes('cv')) setSelectedCv(null)
            else setSelectedPfp(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="p-6 bg-white rounded-lg shadow-sm border-l-4 border-[#FD4345]">
                <h2 className="text-2xl font-bold text-slate-900">Assets Manager</h2>
                <p className="text-slate-500 text-sm mt-1">Manage your global assets like CV and Profile Picture</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                                <ImageIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-900">Profile Picture</CardTitle>
                                <CardDescription className="text-xs mt-0.5">Update your main avatar image</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center transition-all hover:border-blue-400 hover:bg-blue-50/30 group cursor-pointer relative">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => setSelectedPfp(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center gap-2 pointer-events-none">
                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-6 h-6 text-blue-500" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">
                                    {selectedPfp ? selectedPfp.name : "Click to select image"}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {selectedPfp ? `${(selectedPfp.size / 1024).toFixed(1)} KB` : "JPEG, PNG, WebP (max 2MB)"}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Alert className="bg-blue-50 border-blue-100 text-blue-800 py-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    Image will be resized to 512x512px and saved as <code className="font-semibold">pfp.jpg</code>
                                </AlertDescription>
                            </Alert>
                            
                            <Button
                                onClick={() => selectedPfp && upload(selectedPfp, '/api/upload/pfp', setPfpUploading, 'Profile image updated')}
                                disabled={!selectedPfp || pfpUploading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {pfpUploading ? 'Uploading...' : 'Upload New Profile Picture'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-50 rounded-lg border border-red-100">
                                <FileText className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-900">Curriculum Vitae</CardTitle>
                                <CardDescription className="text-xs mt-0.5">Update your downloadable resume</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center transition-all hover:border-red-400 hover:bg-red-50/30 group cursor-pointer relative">
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setSelectedCv(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center gap-2 pointer-events-none">
                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <FileType className="w-6 h-6 text-red-500" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">
                                    {selectedCv ? selectedCv.name : "Click to select PDF"}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {selectedCv ? `${(selectedCv.size / 1024).toFixed(1)} KB` : "PDF files only (max 5MB)"}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Alert className="bg-red-50 border-red-100 text-red-800 py-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    File will be saved as <code className="font-semibold">CV.pdf</code> and overwrite the existing one.
                                </AlertDescription>
                            </Alert>

                            <Button
                                onClick={() => selectedCv && upload(selectedCv, '/api/upload/cv', setCvUploading, 'CV updated')}
                                disabled={!selectedCv || cvUploading}
                                className="w-full bg-[#FD4345] hover:bg-[#ff5456] text-white"
                            >
                                {cvUploading ? 'Uploading...' : 'Upload New CV'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
