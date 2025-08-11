

import { type ComponentType } from 'react'
import { VscCode } from 'react-icons/vsc'
import {
    FaJava, FaJs, FaPhp, FaPython, FaHtml5, FaReact, FaCss3, FaBootstrap, FaNodeJs,
    FaGithub, FaGitlab, FaGit, FaUbuntu, FaDocker, FaAws, FaFigma, FaAngular, FaVuejs,
    FaRust, FaLinux, FaWindows, FaApple, FaCloud
} from 'react-icons/fa'
import {
    SiTypescript, SiSpring, SiCodeigniter, SiFlask, SiMysql, SiPostgresql, SiIntellijidea,
    SiGooglecloud, SiGithubcopilot, SiOpenai, SiMeta, SiMongodb, SiTensorflow, SiNextdotjs,
    SiTailwindcss, SiPrisma, SiSupabase, SiVercel, SiFirebase, SiRedis, SiVite, SiAstro,
    SiDjango, SiLaravel, SiExpress, SiNestjs, SiGraphql, SiPostman, SiJest, SiCypress,
    SiSelenium, SiWebpack, SiRollupdotjs, SiSwagger, SiKubernetes, SiNginx, SiApache,
    SiWebstorm, SiPycharm, SiPhpstorm, SiSvelte, SiGo, SiKotlin, SiSwift,
    SiDotnet, SiDigitalocean, SiHeroku, SiRabbitmq, SiApachekafka,
    SiJenkins, SiStorybook, SiStyledcomponents, SiRedux, SiReact, SiGraphql as SiGraphQLIcon
} from 'react-icons/si'
import Image from 'next/image'

export interface IconProps {
    className?: string
}

export const CursorIcon: React.FC<IconProps> = ({ className }) => (
    <div className={className}>
        <Image
            src="/images/skills/cursor.webp"
            alt="Cursor"
            width={20}
            height={20}
            className="w-full h-full"
        />
    </div>
)

export const iconMap: Record<string, ComponentType<IconProps>> = {
    // Brands / languages
    FaJava, FaJs, FaPhp, FaPython, FaHtml5, FaReact, FaCss3, FaBootstrap, FaNodeJs,
    FaGithub, FaGitlab, FaGit, FaUbuntu, FaDocker, FaAws, FaFigma, FaAngular, FaVuejs,
    FaRust, FaLinux, FaWindows, FaApple,
    // Simple Icons set
    SiTypescript, SiSpring, SiCodeigniter, SiFlask, SiMysql, SiPostgresql, SiIntellijidea,
    SiGooglecloud, SiGithubcopilot, SiOpenai, SiMeta, SiMongodb, SiTensorflow, SiNextdotjs,
    SiTailwindcss, SiPrisma, SiSupabase, SiVercel, SiFirebase, SiRedis, SiVite, SiAstro,
    SiDjango, SiLaravel, SiExpress, SiNestjs, SiGraphql, SiPostman, SiJest, SiCypress,
    SiSelenium, SiWebpack, SiRollupdotjs, SiSwagger, SiKubernetes, SiNginx, SiApache,
    SiWebstorm, SiPycharm, SiPhpstorm, SiSvelte, SiGo, SiKotlin, SiSwift, SiDotnet,
    SiDigitalocean, SiHeroku, SiRabbitmq, SiApachekafka, SiJenkins,
    SiStorybook, SiStyledcomponents, SiRedux, SiReact, SiGraphQLIcon,
    // Fallbacks / custom
    VscCode,
    CursorIcon,
    FaCloud,
}

export function isCustomIconPath(icon: string): boolean {
    return /^\/?images\/.+\.(svg|png|jpe?g|webp|avif)$/i.test(icon) || icon.startsWith('/') || icon.startsWith('http')
}

// Common name aliases -> keys in iconMap
const aliasMap: Record<string, string> = {
    'typescript': 'SiTypescript',
    'javascript': 'FaJs',
    'js': 'FaJs',
    'ts': 'SiTypescript',
    'node': 'FaNodeJs',
    'node.js': 'FaNodeJs',
    'next': 'SiNextdotjs',
    'nextjs': 'SiNextdotjs',
    'next.js': 'SiNextdotjs',
    'react': 'SiReact',
    'redux': 'SiRedux',
    'tailwind': 'SiTailwindcss',
    'tailwindcss': 'SiTailwindcss',
    'prisma': 'SiPrisma',
    'supabase': 'SiSupabase',
    'vercel': 'SiVercel',
    'firebase': 'SiFirebase',
    'redis': 'SiRedis',
    'vite': 'SiVite',
    'astro': 'SiAstro',
    'django': 'SiDjango',
    'laravel': 'SiLaravel',
    'express': 'SiExpress',
    'nestjs': 'SiNestjs',
    'nest': 'SiNestjs',
    'graphql': 'SiGraphQLIcon',
    'postman': 'SiPostman',
    'jest': 'SiJest',
    'cypress': 'SiCypress',
    'selenium': 'SiSelenium',
    'webpack': 'SiWebpack',
    'rollup': 'SiRollupdotjs',
    'swagger': 'SiSwagger',
    'kubernetes': 'SiKubernetes',
    'nginx': 'SiNginx',
    'apache': 'SiApache',
    'aws': 'FaAws',
    'gcp': 'SiGooglecloud',
    'google cloud': 'SiGooglecloud',
    'azure': 'FaCloud',
    'docker': 'FaDocker',
    'ubuntu': 'FaUbuntu',
    'linux': 'FaLinux',
    'mongodb': 'SiMongodb',
    'postgresql': 'SiPostgresql',
    'mysql': 'SiMysql',
    'git': 'FaGit',
    'github': 'FaGithub',
    'gitlab': 'FaGitlab',
    'java': 'FaJava',
    'python': 'FaPython',
    'php': 'FaPhp',
    'html': 'FaHtml5',
    'css': 'FaCss3',
    'spring': 'SiSpring',
    'flask': 'SiFlask',
    'intellij': 'SiIntellijidea',
    'webstorm': 'SiWebstorm',
    'vscode': 'VscCode',
    'storybook': 'SiStorybook',
    'styled-components': 'SiStyledcomponents',
    'kafka': 'SiApachekafka',
    'rabbitmq': 'SiRabbitmq',
    'jenkins': 'SiJenkins',
    'svelte': 'SiSvelte',
    'go': 'SiGo',
    'kotlin': 'SiKotlin',
    'swift': 'SiSwift',
    'c#': 'SiDotnet',
    '.net': 'SiDotnet',
    'azure devops': 'FaCloud',
    'microsoft azure': 'FaCloud',
}

export function resolveIconKey(iconKeyOrPath: string, name?: string): string | undefined {
    if (!iconKeyOrPath) return name ? aliasMap[name.trim().toLowerCase()] : undefined
    if (iconMap[iconKeyOrPath]) return iconKeyOrPath
    const guessFromName = name ? aliasMap[name.trim().toLowerCase()] : undefined
    return guessFromName
}


