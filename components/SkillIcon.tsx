'use client'

import Image from 'next/image'
import { iconMap, isCustomIconPath, resolveIconKey, type IconProps } from '@/components/skills/icon-registry'
import { VscCode } from 'react-icons/vsc'

interface SkillIconProps {
    name: string
    icon: string
    size?: number
    className?: string
}

export default function SkillIcon({ name, icon, size = 16, className }: SkillIconProps) {
    const iconKey = resolveIconKey(icon, name)
    const Icon = (iconKey ? iconMap[iconKey as keyof typeof iconMap] : undefined) as React.ComponentType<IconProps> | undefined

    if (isCustomIconPath(icon)) {
        const src = icon.startsWith('http') ? icon : (icon.startsWith('/') ? icon : `/${icon}`)
        return (
            <Image src={src} alt={name} width={size} height={size} className={className || `w-[${size}px] h-[${size}px] object-contain`} />
        )
    }

    if (Icon) {
        return <Icon className={className || `w-[${size}px] h-[${size}px}`} />
    }

    return <VscCode className={className || `w-[${size}px] h-[${size}px}`} />
}


