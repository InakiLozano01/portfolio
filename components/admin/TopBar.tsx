'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface Props {
    onRefreshAll: () => void
}

export default function TopBar({ onRefreshAll }: Props) {
    const { data: session } = useSession()
    return (
        <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
                Logged in as <span className="font-medium text-slate-900">{session?.user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" className="border-blue-200 text-blue-700" onClick={onRefreshAll}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh All Caches
                </Button>
                <Button variant="destructive" onClick={() => signOut({ callbackUrl: '/admin/login' })}>Logout</Button>
            </div>
        </div>
    )
}


