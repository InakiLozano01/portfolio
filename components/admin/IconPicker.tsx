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
                    className="w-full justify-between"
                >
                    <span className="flex items-center gap-2">
                        {value ? (
                            isCustomIconPath(value) ? (
                                <Image src={value.startsWith('/') ? value : `/${value}`} alt="icon" width={18} height={18} className="w-4 h-4 object-contain" />
                            ) : Icon ? (
                                <Icon className="w-4 h-4" />
                            ) : (
                                <VscCode className="w-4 h-4" />
                            )
                        ) : null}
                        {value || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0 bg-white shadow-lg border">
                <Command className="bg-white text-slate-900">
                    <CommandInput placeholder="Search icons or enter a path…" value={query} onValueChange={setQuery} />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup heading="Icons">
                            {Object.keys(iconMap)
                                .filter(k => k.toLowerCase().includes(query.toLowerCase()))
                                .sort()
                                .map((name) => {
                                    const ItemIcon = iconMap[name]
                                    const selected = value === name
                                    return (
                                        <CommandItem key={name} value={name} onSelect={() => handleSelect(name)} className="flex items-center gap-2">
                                            <ItemIcon className="w-4 h-4" />
                                            <span className="flex-1">{name}</span>
                                            <Check className={cn('h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                                        </CommandItem>
                                    )
                                })}
                        </CommandGroup>
                        <CommandGroup heading="Custom path">
                            <div className="px-2 py-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        value={custom}
                                        onChange={(e) => setCustom(e.target.value)}
                                        placeholder="images/skills/my-logo.png or https://…"
                                        className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                                    />
                                    <Button type="button" size="sm" onClick={submitCustom}>
                                        Use
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Files should be inside <code>/public</code> or an absolute URL. Example: <code>images/skills/custom.png</code>.</p>
                            </div>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}


