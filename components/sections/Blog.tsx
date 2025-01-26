'use client'

import { motion } from 'framer-motion'
import BlogSection from './BlogSection'

export default function Blog() {
  return (
    <div className="w-full h-full p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold mb-8 text-primary">Blog</h2>
        <BlogSection />
      </motion.div>
    </div>
  )
}

