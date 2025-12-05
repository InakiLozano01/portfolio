'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { iconMap, isCustomIconPath, type IconProps } from '@/components/skills/icon-registry'
import { VscCode } from 'react-icons/vsc'
import Image from 'next/image'

interface IconPickerProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export default function IconPicker({ value, onChange, placeholder = 'Select icon' }: IconPickerProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState('')
    const [custom, setCustom] = React.useState('')

    const Icon = (value && iconMap[value as keyof typeof iconMap]) as React.ComponentType<IconProps> | undefined

    const handleSelect = (name: string) => {
        onChange(name)
        setOpen(false)
        setQuery('')
    }

    const submitCustom = () => {
        if (!custom) return
        onChange(custom)
        setOpen(false)
        setQuery('')
        setCustom('')
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                    <span className="flex items-center gap-2">
                        {value ? (
                            isCustomIconPath(value) ? (
                                <Image src={value.startsWith('/') ? value : `/${value}`} alt="icon" width={18} height={18} className="w-4 h-4 object-contain" />
                            ) : Icon ? (
                                <Icon className="w-4 h-4 text-[#FD4345]" />
                            ) : (
                                <VscCode className="w-4 h-4 text-[#FD4345]" />
                            )
                        ) : null}
                        {value || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0 bg-white shadow-lg border border-slate-200" align="start">
                <Command className="bg-white text-slate-900">
                    <CommandInput placeholder="Search icons or enter a path…" value={query} onValueChange={setQuery} className="border-b border-slate-100" />
                    <CommandList className="max-h-[300px] p-1">
                        <CommandEmpty className="py-4 text-center text-sm text-slate-500">No icons found.</CommandEmpty>
                        <CommandGroup heading="Icons">
                            {Object.keys(iconMap)
                                .filter(k => k.toLowerCase().includes(query.toLowerCase()))
                                .sort()
                                .map((name) => {
                                    const ItemIcon = iconMap[name]
                                    const selected = value === name
                                    return (
                                        <CommandItem 
                                            key={name} 
                                            value={name} 
                                            onSelect={() => handleSelect(name)} 
                                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 aria-selected:bg-slate-100"
                                        >
                                            <ItemIcon className="w-4 h-4 text-slate-600" />
                                            <span className="flex-1">{name}</span>
                                            {selected && <Check className="h-4 w-4 text-[#FD4345]" />}
                                        </CommandItem>
                                    )
                                })}
                        </CommandGroup>
                        <CommandGroup heading="Custom path">
                            <div className="px-2 py-2 bg-slate-50 rounded-md mt-2 mx-2 border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <input
                                        value={custom}
                                        onChange={(e) => setCustom(e.target.value)}
                                        placeholder="images/skills/logo.png"
                                        className="flex-1 h-8 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FD4345]"
                                    />
                                    <Button type="button" size="sm" onClick={submitCustom} className="h-8 px-3 bg-[#263547] text-white hover:bg-[#1e293b]">
                                        Use
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1.5">Relative to /public or absolute URL.</p>
                            </div>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
