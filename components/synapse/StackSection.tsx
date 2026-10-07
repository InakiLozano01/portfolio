'use client'

import { useMemo } from 'react'
import SkillIcon from '@/components/SkillIcon'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'
import { clean, pick, type Lang, type ProjectCard, type SkillSummary } from './content'

interface StackSectionProps {
    lang?: Lang
    initialContent?: Record<string, any> | null
    initialSkills?: SkillSummary[]
    initialProjects?: ProjectCard[]
    dictionary?: any
}

interface Group {
    category: string
    label: string
    skills: SkillSummary[]
}

/** Base geometry of one constellation, in px; rendered in % so it scales with its column. */
const BOX_W = 360
const CX = BOX_W / 2

const PLACEMENT: Record<string, string> = {
    right: 'flex-row -translate-y-1/2',
    left: 'flex-row-reverse -translate-x-full -translate-y-1/2',
    top: 'flex-col-reverse -translate-x-1/2 -translate-y-full',
    bottom: 'flex-col -translate-x-1/2',
}

function Constellation({ group, index, usage }: { group: Group; index: number; usage: Map<string, ProjectCard[]> }) {
    const n = group.skills.length
    // Small clusters get a shorter box so sparse categories do not leave a band of empty ground.
    const BOX_H = n <= 3 ? 200 : 290
    const CY = BOX_H / 2
    const radius = n <= 2 ? 62 : n <= 4 ? 74 : 92
    const step = (Math.PI * 2) / n
    const nodes = group.skills.map((skill, i) => {
        // Three or fewer nodes fan sideways (right, then left) so none hangs below the hub.
        const angle = n <= 3 ? (n === 1 ? 0 : [0, Math.PI - 0.5, Math.PI + 0.5][i]) : -Math.PI / 2 + step / 2 + i * step
        const x = CX + radius * Math.cos(angle)
        const y = CY + radius * Math.sin(angle)
        const cos = Math.cos(angle)
        const side = cos > 0.3 ? 'right' : cos < -0.3 ? 'left' : Math.sin(angle) < 0 ? 'top' : 'bottom'
        const key = skill.name.toLowerCase()
        const count = usage.get(key)?.length || 0
        return { skill, key, x, y, side, count, dot: 4 + Math.min(count, 8) * 0.5 }
    })

    return (
        <Reveal delay={(index % 3) * 0.08} className="relative">
            <div className="relative mx-auto w-full max-w-[460px]" style={{ aspectRatio: `${BOX_W} / ${BOX_H}` }}>
                <svg aria-hidden="true" viewBox={`0 0 ${BOX_W} ${BOX_H}`} className="absolute inset-0 h-full w-full overflow-visible">
                    {nodes.map((node, i) => {
                        const midX = (CX + node.x) / 2 + (node.y - CY) * 0.12
                        const midY = (CY + node.y) / 2 - (node.x - CX) * 0.12
                        const d = `M ${CX} ${CY} Q ${midX} ${midY} ${node.x} ${node.y}`
                        return (
                            <g key={node.key} className="text-fg">
                                <path d={d} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} />
                                <path
                                    d={d}
                                    fill="none"
                                    stroke="#fd4345"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    className="synapse-signal"
                                    style={{ animationDelay: `${((index * 0.9 + i * 0.55) % 3.2).toFixed(2)}s`, animationDuration: `${2.6 + (i % 3) * 0.4}s` }}
                                />
                            </g>
                        )
                    })}
                    <circle cx={CX} cy={CY} r={10} fill="none" stroke="currentColor" className="text-fg" strokeWidth={1.25} />
                    <circle cx={CX} cy={CY} r={4} fill="#fd4345" />
                </svg>
                <h3
                    className="absolute flex -translate-x-1/2 items-baseline gap-1.5 whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-soft"
                    style={{ left: '50%', top: `${((CY + 16) / BOX_H) * 100}%` }}
                >
                    {group.label}
                    <span className="font-mono text-[11px] text-fg-dim">{n}</span>
                </h3>
                {nodes.map((node) => (
                    <span
                        key={node.skill._id}
                        className={`absolute flex items-center gap-2 whitespace-nowrap p-1 text-[14px] font-medium text-fg ${PLACEMENT[node.side]}`}
                        style={{
                            left: `${(node.x / BOX_W) * 100}%`,
                            top: `${(node.y / BOX_H) * 100}%`,
                            marginLeft: node.side === 'right' ? -node.dot - 4 : node.side === 'left' ? node.dot + 4 : 0,
                            marginTop: node.side === 'top' ? node.dot + 4 : node.side === 'bottom' ? -node.dot - 4 : 0,
                        }}
                    >
                        <span aria-hidden="true" className="shrink-0 rounded-full bg-signal ring-4 ring-field" style={{ width: node.dot * 2, height: node.dot * 2 }} />
                        <span className="inline-flex items-center gap-1.5">
                            <SkillIcon name={node.skill.name} icon={node.skill.icon} size={15} className="h-[15px] w-[15px] text-fg" />
                            {node.skill.name}
                            {node.count > 0 && <span className="font-mono text-[11px] font-normal text-fg-dim">{node.count}</span>}
                        </span>
                    </span>
                ))}
            </div>
        </Reveal>
    )
}

/** Phones: the same nodes as a compact branch list, since radial labels need width. */
function Branch({ group, usage }: { group: Group; usage: Map<string, ProjectCard[]> }) {
    return (
        <Reveal className="relative pl-6">
            <span aria-hidden="true" className="absolute bottom-3 left-[4.5px] top-3 w-px bg-fg/[0.12]" />
            <h3 className="relative flex items-baseline gap-2 text-[15px] font-medium text-fg">
                <span aria-hidden="true" className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full border border-line/50 bg-field" />
                {group.label}
                <span className="font-mono text-[11px] text-fg-dim">{group.skills.length}</span>
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
                {group.skills.map((skill) => {
                    const count = usage.get(skill.name.toLowerCase())?.length || 0
                    return (
                        <li key={skill._id} className="inline-flex h-10 items-center gap-2 rounded-full bg-fg/[0.07] px-3.5 text-sm font-medium text-fg">
                            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-signal" />
                            <SkillIcon name={skill.name} icon={skill.icon} size={14} className="h-3.5 w-3.5" />
                            {skill.name}
                            {count > 0 && <span className="font-mono text-[11px] font-normal text-fg-dim">{count}</span>}
                        </li>
                    )
                })}
            </ul>
        </Reveal>
    )
}

export default function StackSection({ lang = 'en', initialContent = null, initialSkills = [], initialProjects = [], dictionary = {} }: StackSectionProps) {
    const t = dictionary?.skills || {}
    const categoryLabels: Record<string, string> | undefined = dictionary?.skills?.categoryLabels

    const usage = useMemo(() => {
        const map = new Map<string, ProjectCard[]>()
        for (const project of initialProjects) {
            for (const item of project.technologies || []) {
                const key = item?.name?.toLowerCase()
                if (!key) continue
                map.set(key, [...(map.get(key) || []), project])
            }
        }
        return map
    }, [initialProjects])

    // Cheap for a few dozen skills; the React Compiler memoizes it.
    const groups: Group[] = (() => {
        const labels = categoryLabels || {}
        const byCategory = new Map<string, SkillSummary[]>()
        for (const skill of initialSkills) {
            const key = (skill.category || 'other').toLowerCase()
            byCategory.set(key, [...(byCategory.get(key) || []), skill])
        }
        return Array.from(byCategory.entries())
            .map(([category, skills]) => ({
                category,
                label: labels[category] || category.charAt(0).toUpperCase() + category.slice(1),
                skills: skills.sort((a, b) => (usage.get(b.name.toLowerCase())?.length || 0) - (usage.get(a.name.toLowerCase())?.length || 0) || a.name.localeCompare(b.name)),
            }))
            .sort((a, b) => b.skills.length - a.skills.length)
    })()

    if (!groups.length) return null

    const heading = clean(pick(lang, initialContent, 'title')) || t.heading || 'Skills & Technologies'
    const lead = clean(pick(lang, initialContent, 'description')) || t.descriptionFallback
    return (
        <div>
            <SectionHeading title={heading} lead={lead} circuit="chip" />

            <div className="mt-10 hidden items-center gap-x-10 gap-y-4 sm:grid lg:grid-cols-2 xl:grid-cols-3">
                {groups.map((group, index) => (
                    <Constellation key={group.category} group={group} index={index} usage={usage} />
                ))}
            </div>
            <div className="mt-10 grid gap-10 sm:hidden">
                {groups.map((group) => (
                    <Branch key={group.category} group={group} usage={usage} />
                ))}
            </div>

        </div>
    )
}
