'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { VscCode } from 'react-icons/vsc'
import { useEffect, useState, useMemo, useRef } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'
import Image from 'next/image'
import { iconMap, isCustomIconPath, resolveIconKey, type IconProps } from '@/components/skills/icon-registry'

// Icon map and helpers are imported from icon-registry

interface Skill {
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
}

export default function Skills() {
  const [description, setDescription] = useState<string>('')
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

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        // First fetch section data
        const sectionResponse = await fetch('/api/sections/skills')
        if (!sectionResponse.ok) {
          throw new Error('Failed to fetch skills section')
        }
        const sectionData = await sectionResponse.json()
        console.log('[Skills Component] Section data:', sectionData)

        if (sectionData && sectionData.content) {
          setDescription(sectionData.content.description)

          // Then fetch skills data
          const skillsResponse = await fetch('/api/skills')
          if (!skillsResponse.ok) {
            throw new Error('Failed to fetch skills data')
          }
          const skillsData = await skillsResponse.json()
          console.log('[Skills Component] Skills data:', skillsData)

          if (Array.isArray(skillsData)) {
            setContent(skillsData)
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

  // Calculate items per page based on available height
  useEffect(() => {
    function calculateItemsPerPage() {
      if (!gridRef.current || window.innerWidth < 768) {
        setItemsPerPage(999) // Show all items on mobile
        return
      }

      const gridElement = gridRef.current
      const headerHeight = 200 // Header + navigation height
      const footerHeight = 100 // Footer height + padding
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
    const withCategory = selectedCategory === 'all'
      ? content
      : content.filter(skill => {
        const category = skill.category.charAt(0).toUpperCase() + skill.category.slice(1)
        return category === selectedCategory
      })
    const q = searchQuery.trim().toLowerCase()
    const withSearch = q
      ? withCategory.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      : withCategory
    const sorted = [...withSearch].sort((a, b) => {
      if (sortBy === 'proficiency') return (sortDir === 'desc' ? b.proficiency - a.proficiency : a.proficiency - b.proficiency)
      if (sortBy === 'years') return (sortDir === 'desc' ? b.yearsOfExperience - a.yearsOfExperience : a.yearsOfExperience - b.yearsOfExperience)
      return sortDir === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
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
        <h2 className="text-3xl font-bold mb-2 text-primary">Skills & Technologies</h2>

        {description && (
          <p className="text-lg text-gray-600 mb-2">{description}</p>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center" role="tablist" aria-label="Filter skills by category">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} touch-target`}
              role="tab"
              aria-selected={selectedCategory === 'all'}
              aria-controls={`all-panel`}
            >
              All <span className="ml-1 text-xs opacity-70">{content.length}</span>
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
              placeholder="Search skills…"
              className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              aria-label="Sort by"
            >
              <option value="proficiency">Sort by proficiency</option>
              <option value="years">Sort by years</option>
              <option value="name">Sort by name</option>
            </select>
            <button
              onClick={() => setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="h-9 px-3 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
              aria-label="Toggle sort direction"
            >
              {sortDir === 'desc' ? 'Desc' : 'Asc'}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4 px-4 md:px-0"
        role="tabpanel"
        id={`${selectedCategory}-panel`}
        aria-label={`${selectedCategory === 'all' ? 'All skills' : `${selectedCategory} skills`}`}
      >
        {paginatedSkills.map((skill, index) => {
          const iconKey = resolveIconKey(skill.icon, skill.name)
          const Icon = (iconKey ? iconMap[iconKey as keyof typeof iconMap] : undefined) || (iconMap[skill.icon as keyof typeof iconMap] as any) || VscCode
          return (
            <motion.div
              key={skill.name}
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
                    <span>Proficiency</span>
                    <span>{skill.proficiency}%</span>
                  </div>
                  <div
                    className="h-2 bg-gray-200 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={skill.proficiency}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Proficiency for ${skill.name}`}
                  >
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${skill.proficiency}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Experience: </span>
                  {skill.yearsOfExperience} {skill.yearsOfExperience === 1 ? 'year' : 'years'}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {totalPages > 1 && typeof window !== 'undefined' && window.innerWidth >= 768 && (
        <div className="flex justify-center items-center gap-2 py-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            Previous
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
            Next
          </button>
        </div>
      )}
    </div>
  )
}

