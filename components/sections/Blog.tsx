'use client'

import { motion } from 'framer-motion'

export default function Blog() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold mb-4 text-primary">Blog</h2>
        <p className="text-gray-600 mb-4 text-lg">
          Coming Soon! 🚀
        </p>
        <p className="text-gray-500">
          I&apos;m working on some exciting content to share with you.
          <br />
          Stay tuned for tech articles, tutorials, and more!
        </p>
      </motion.div>
    </div>
  )
}

