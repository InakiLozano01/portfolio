'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Lock, Eye, EyeOff, Shield } from 'lucide-react'

export default function ChangePassword() {
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validate = (): string | null => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return 'All fields are required'
    }
    if (newPassword !== confirmPassword) {
      return 'New passwords do not match'
    }
    if (newPassword.length < 12) {
      return 'Password must be at least 12 characters long'
    }
    const hasUpper = /[A-Z]/.test(newPassword)
    const hasLower = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword)
    if (!(hasUpper && hasLower && hasNumber && hasSymbol)) {
      return 'Password must include upper, lower, number and symbol'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      toast({ title: 'Invalid password', description: err, variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to change password')
      }
      toast({ title: 'Password updated', description: 'Use your new password next sign in' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to change password', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
                <CardTitle className="text-lg font-bold text-slate-900">Change Password</CardTitle>
                <CardDescription className="text-xs mt-0.5">Secure your account with a strong password</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input 
                id="current-password"
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                required 
                className="bg-white text-slate-900 focus-visible:ring-[#FD4345]" 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
                <Input 
                    id="new-password"
                    type={showPassword ? "text" : "password"} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required 
                    className="bg-white text-slate-900 pr-10 focus-visible:ring-[#FD4345]" 
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
            <p className="text-xs text-slate-500">
                At least 12 chars, including upper, lower, number & symbol.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input 
                id="confirm-password"
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                className="bg-white text-slate-900 focus-visible:ring-[#FD4345]" 
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full bg-[#FD4345] hover:bg-[#ff5456] text-white mt-2">
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
