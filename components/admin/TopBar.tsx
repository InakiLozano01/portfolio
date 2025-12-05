'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { RefreshCw, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Props {
    onRefreshAll: () => void
}

export default function TopBar({ onRefreshAll }: Props) {
    const { data: session } = useSession()
    
    const userInitials = session?.user?.name 
        ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : session?.user?.email?.substring(0, 2).toUpperCase() || 'AD';

    return (
        <div className="flex items-center gap-4">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefreshAll}
                className="hidden md:flex text-slate-600 border-slate-200 hover:border-[#FD4345] hover:text-[#FD4345]"
            >
                <RefreshCw className="w-4 h-4 mr-2" /> 
                Refresh Cache
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-slate-100">
                        <Avatar className="h-9 w-9 border border-slate-200">
                            <AvatarFallback className="bg-[#263547] text-white text-xs">{userInitials}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white border border-slate-200 shadow-lg" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{session?.user?.name || 'Admin'}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {session?.user?.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onRefreshAll}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        <span>Refresh Cache</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={() => signOut({ callbackUrl: '/admin/login' })}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
