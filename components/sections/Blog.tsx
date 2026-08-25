'use client'

import { motion } from 'framer-motion'
import BlogSection from './BlogSection'

export default function Blog({ lang = 'en', initialContent, initialBlogs, dictionary = {} }: { lang?: 'en' | 'es'; initialContent?: Record<string, any>; initialBlogs?: any[]; dictionary?: any }) {
  return (
    <div className="w-full h-full py-4 md:py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <BlogSection lang={lang} initialContent={initialContent} initialBlogs={initialBlogs} dictionary={dictionary} />
      </motion.div>
    </div>
  )
}
