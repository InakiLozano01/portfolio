'use client'

import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ChevronsUpDown, Check } from 'lucide-react'
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
        // Only files from /public: remote hosts are not allowed by the image optimiser and would break the page.
        const path = custom.trim().replace(/^\/+/, '')
        if (!path || /^[a-z]+:/i.test(path) || path.includes('..')) return
        onChange(path)
        setOpen(false)
        setQuery('')
        setCustom('')
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-expanded={open}
                    className="flex h-10 w-full items-center justify-between rounded-xl border border-line/15 bg-surface px-3.5 text-[14px] text-fg transition-colors hover:border-line/40"
                >
                    <span className="flex items-center gap-2">
                        {value ? (
                            isCustomIconPath(value) ? (
                                <Image src={value.startsWith('/') ? value : `/${value}`} alt="icon" width={18} height={18} className="w-4 h-4 object-contain" />
                            ) : Icon ? (
                                <Icon aria-hidden="true" className="w-4 h-4 text-bordeaux" />
                            ) : (
                                <VscCode aria-hidden="true" className="w-4 h-4 text-bordeaux" />
                            )
                        ) : null}
                        {value || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-1.5rem)] max-w-[360px] rounded-2xl border border-[#1a2433]/10 bg-white p-0 text-[#1a2433] shadow-none" align="start">
                <Command className="bg-white text-[#1a2433]">
                    <CommandInput placeholder="Search icons or enter a path…" value={query} onValueChange={setQuery} className="border-b border-[#1a2433]/10" />
                    <CommandList className="max-h-[300px] p-1">
                        <CommandEmpty className="py-4 text-center text-sm text-[#5c6677]">No icons found.</CommandEmpty>
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
                                            className="flex cursor-pointer items-center gap-2 rounded-lg data-[selected=true]:bg-[#1a2433] data-[selected=true]:text-[#faf8f5]"
                                        >
                                            <ItemIcon aria-hidden="true" className="w-4 h-4 opacity-80" />
                                            <span className="flex-1">{name}</span>
                                            {selected && <Check className="h-4 w-4 text-[#fd4345]" />}
                                        </CommandItem>
                                    )
                                })}
                        </CommandGroup>
                    </CommandList>
                </Command>
                        <div className="border-t border-[#1a2433]/10 py-2">
                            <p className="px-4 text-xs font-medium text-[#3b4657]">Custom image</p>
                            <div className="mx-2 mt-1 px-2 py-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        aria-label="Custom icon path"
                                        value={custom}
                                        onChange={(e) => setCustom(e.target.value)}
                                        placeholder="images/skills/logo.png"
                                        className="h-8 flex-1 rounded-lg border border-[#1a2433]/15 bg-white px-3 py-1 text-xs text-[#1a2433] focus:border-[#fd4345]/70 focus:outline-none"
                                    />
                                    <button type="button" onClick={submitCustom} className="h-8 rounded-full bg-[#1a2433] px-3 text-xs font-medium text-[#faf8f5] hover:bg-[#800020]">
                                        Use
                                    </button>
                                </div>
                                <p className="mt-1.5 text-[11px] text-[#5c6677]">A file inside /public, e.g. images/skills/logo.png.</p>
                            </div>
                        </div>
            </PopoverContent>
        </Popover>
    )
}
