'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { VscCode } from 'react-icons/vsc'
import { useEffect, useState, useMemo, useRef } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'
import Image from 'next/image'
import { iconMap, isCustomIconPath, resolveIconKey, type IconProps } from '@/components/skills/icon-registry'

// Icon map and helpers are imported from icon-registry

interface Skill {
  _id?: string;
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
}

const copy = {
  en: {
    heading: 'Skills & Technologies',
    descriptionFallback: 'A comprehensive set of technical skills across various domains',
    searchPlaceholder: 'Search skills...',
    sortLabel: 'Sort by',
    sortOptions: {
      proficiency: 'Proficiency',
      years: 'Years',
      name: 'Name',
    },
    sortDirAsc: 'Asc',
    sortDirDesc: 'Desc',
    all: 'All',
    proficiency: 'Proficiency',
    experience: 'Experience',
    years: (n: number) => (n === 1 ? 'year' : 'years'),
    paginationPrev: 'Previous',
    paginationNext: 'Next',
    ariaSortToggle: 'Toggle sort direction',
  },
  es: {
    heading: 'Habilidades y Tecnologías',
    descriptionFallback: 'Un conjunto integral de habilidades técnicas en diversos dominios',
    searchPlaceholder: 'Buscar habilidades...',
    sortLabel: 'Ordenar por',
    sortOptions: {
      proficiency: 'Dominio',
      years: 'Años',
      name: 'Nombre',
    },
    sortDirAsc: 'Ascendente',
    sortDirDesc: 'Descendente',
    all: 'Todas',
    proficiency: 'Dominio',
    experience: 'Experiencia',
    years: (n: number) => (n === 1 ? 'año' : 'años'),
    paginationPrev: 'Anterior',
    paginationNext: 'Siguiente',
    ariaSortToggle: 'Cambiar dirección de orden',
  },
} as const

function coerceSkill(raw: any): Skill {
  return {
    _id: raw._id,
    name: String(raw.name || '').trim(),
    category: String(raw.category || '').trim(),
    proficiency: typeof raw.proficiency === 'number' ? raw.proficiency : Number(raw.proficiency) || 0,
    yearsOfExperience: typeof raw.yearsOfExperience === 'number' ? raw.yearsOfExperience : Number(raw.yearsOfExperience) || 0,
    icon: String(raw.icon || '').trim()
  }
}

export default function Skills({ lang = 'en' }: { lang?: 'en' | 'es' }) {
  const [titleBase, setTitleBase] = useState<string>('')
  const [titleEn, setTitleEn] = useState<string>('')
  const [titleEs, setTitleEs] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [description_en, setDescription_en] = useState<string>('')
  const [description_es, setDescription_es] = useState<string>('')
  const [content, setContent] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'proficiency' | 'years' | 'name'>('proficiency')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const gridRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const [isClient, setIsClient] = useState(false)

  const t = copy[lang] ?? copy.en
  const heading = lang === 'es'
    ? (titleEs || t.heading)
    : (titleEn || titleBase || t.heading)
  const displayDescription =
    lang === 'es'
      ? (description_es || t.descriptionFallback)
      : (description_en || description || t.descriptionFallback)

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        // First fetch section data
        const sectionResponse = await fetch('/api/sections/skills')
        if (!sectionResponse.ok) {
          throw new Error('Failed to fetch skills section')
        }
        const sectionData = await sectionResponse.json()

        if (sectionData && sectionData.content) {
          setTitleBase(sectionData.title || sectionData.content.title || '')
          setTitleEn(sectionData.content.title_en || sectionData.content.title || sectionData.title || '')
          setTitleEs(sectionData.content.title_es || sectionData.content.title || sectionData.title || '')
          setDescription(sectionData.content.description || '')
          setDescription_en(sectionData.content.description_en || '')
          setDescription_es(sectionData.content.description_es || '')

          // Then fetch skills data
          const skillsResponse = await fetch('/api/skills')
          if (!skillsResponse.ok) {
            throw new Error('Failed to fetch skills data')
          }
          const skillsData = await skillsResponse.json()

          if (Array.isArray(skillsData)) {
            const normalizedSkills = skillsData
              .map(coerceSkill)
              .filter(skill => skill.name && skill.category)
            setContent(normalizedSkills)
          } else {
            console.error('[Skills Component] Invalid skills data format:', skillsData)
            setError('Invalid skills data format')
          }
        }
      } catch (err) {
        console.error('[Skills Component] Error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchSkills()
  }, [])

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Calculate items per page based on available height
  useEffect(() => {
    function calculateItemsPerPage() {
      if (!gridRef.current || window.innerWidth < 768) {
        setItemsPerPage(999) // Show all items on mobile
        return
      }

      const headerHeight = 200 // Header + navigation height
      const footerHeight = 140 // Footer height + padding and overlap guard
      const paginationHeight = 60 // Pagination controls height + margin
      const availableHeight = window.innerHeight - headerHeight - footerHeight - paginationHeight
      const itemHeight = 160 // Height of each skill card including margin
      const gap = 16 // Gap between items
      const columns = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : 2

      const rowsCanFit = Math.floor(availableHeight / itemHeight)
      const newItemsPerPage = Math.max(rowsCanFit * columns, columns)

      setItemsPerPage(newItemsPerPage)
    }

    calculateItemsPerPage()
    window.addEventListener('resize', calculateItemsPerPage)
    return () => window.removeEventListener('resize', calculateItemsPerPage)
  }, [])

  const categories = useMemo(() => {
    const cats = new Map<string, number>()
    content.forEach(skill => {
      // Capitalize first letter of each category
      const category = skill.category
      const norm = category.charAt(0).toUpperCase() + category.slice(1)
      cats.set(norm, (cats.get(norm) || 0) + 1)
    })
    return Array.from(cats.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [content])

  const filteredSkills = useMemo(() => {
    const dataset = selectedCategory === 'all'
      ? content
      : content.filter(skill => {
        const category = skill.category.charAt(0).toUpperCase() + skill.category.slice(1)
        return category === selectedCategory
      })

    const q = searchQuery.trim().toLowerCase()
    const withSearch = q
      ? dataset.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      : dataset

    // Create a stable sort key that includes the skill ID for uniqueness
    const sorted = [...withSearch].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'proficiency':
          comparison = a.proficiency - b.proficiency
          break
        case 'years':
          comparison = a.yearsOfExperience - b.yearsOfExperience
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        default:
          comparison = 0
      }

      // Apply sort direction
      return sortDir === 'desc' ? -comparison : comparison
    })

    return sorted
  }, [content, selectedCategory, searchQuery, sortBy, sortDir])

  const paginatedSkills = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSkills.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSkills, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredSkills.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when category changes
  }, [selectedCategory, itemsPerPage])

  if (loading) return <LoadingSpinner />
  if (error) return <div role="alert" className="text-center text-red-500">{error}</div>
  if (!content.length) return null

  return (
    <div className="max-w-6xl mx-auto flex flex-col">
      <div className="sticky top-0 bg-white backdrop-blur-sm py-6 md:static md:bg-transparent z-20 -mx-4 px-4 md:mx-0 md:px-0 md:py-0 shadow-sm md:shadow-none">
        <h2 className="text-3xl font-bold mb-2 text-primary">{heading}</h2>

        {displayDescription && (
          <p className="text-lg text-gray-600 mb-2">{displayDescription}</p>
        )}

        <div className="space-y-3">
          <div
            className="flex flex-wrap gap-2 items-center"
            role="tablist"
            aria-label={lang === 'es' ? 'Filtrar habilidades por categoría' : 'Filter skills by category'}
          >
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} touch-target`}
              role="tab"
              aria-selected={selectedCategory === 'all'}
              aria-controls={`all-panel`}
            >
              {t.all} <span className="ml-1 text-xs opacity-70">{content.length}</span>
            </button>
            {categories.map(([category, count]) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                role="tab"
                aria-selected={selectedCategory === category}
                aria-controls={`${category}-panel`}
              >
                {category} <span className="ml-1 text-xs opacity-70">{count}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              aria-label={t.sortLabel}
            >
              <option value="proficiency">{t.sortOptions.proficiency}</option>
              <option value="years">{t.sortOptions.years}</option>
              <option value="name">{t.sortOptions.name}</option>
            </select>
            <button
              onClick={() => setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="h-9 px-3 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
              aria-label={t.ariaSortToggle}
            >
              {sortDir === 'desc' ? t.sortDirDesc : t.sortDirAsc}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4 px-4 md:px-0"
        role="tabpanel"
        id={`${selectedCategory}-panel`}
        aria-label={
          selectedCategory === 'all'
            ? `${t.all} ${lang === 'es' ? 'habilidades' : 'skills'}`
            : `${selectedCategory} ${lang === 'es' ? 'habilidades' : 'skills'}`
        }
      >
        {paginatedSkills.map((skill, index) => {
          // Use skill ID or create a unique key from name + category to avoid conflicts
          const uniqueKey = skill._id || `${skill.name}-${skill.category}`

          // Simplify icon resolution to avoid potential issues
          let Icon = VscCode
          if (skill.icon && iconMap[skill.icon as keyof typeof iconMap]) {
            Icon = iconMap[skill.icon as keyof typeof iconMap] as any
          }

          return (
            <motion.div
              key={uniqueKey}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: index * 0.1 }}
              className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 h-40"
            >
              <div className="flex items-center gap-2 mb-2">
                {isCustomIconPath(skill.icon) ? (
                  <Image
                    src={skill.icon.startsWith('http') ? skill.icon : (skill.icon.startsWith('/') ? skill.icon : `/${skill.icon}`)}
                    alt={skill.name}
                    width={24}
                    height={24}
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  Icon && (
                    <Icon
                      className="w-6 h-6 text-primary"
                      aria-hidden="true"
                    />
                  )
                )}
                <h3 className="font-medium text-base">{skill.name}</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{t.proficiency}</span>
                    <span>{skill.proficiency}%</span>
                  </div>
                  <div
                    className="h-2 bg-gray-200 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={skill.proficiency}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={
                      lang === 'es'
                        ? `Dominio de ${skill.name}`
                        : `Proficiency for ${skill.name}`
                    }
                  >
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${skill.proficiency}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{t.experience}: </span>
                  {skill.yearsOfExperience} {t.years(skill.yearsOfExperience)}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {totalPages > 1 && isClient && window.innerWidth >= 768 && (
        <div className="flex justify-center items-center gap-2 py-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            {t.paginationPrev}
          </button>
          <div className="flex items-center gap-1" aria-label="Pagination">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                aria-current={currentPage === i + 1}
                className={`w-8 h-8 rounded-md text-sm ${currentPage === i + 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            {t.paginationNext}
          </button>
        </div>
      )}
    </div>
  )
}
