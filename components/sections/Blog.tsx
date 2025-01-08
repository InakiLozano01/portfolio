'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

const blogPosts: any[] = [] // Empty array for now

export default function Blog() {
  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-8 text-primary">Latest Blog Posts</h2>
      {blogPosts.length === 0 ? (
        <motion.div
          className="bg-gray-50 rounded-lg p-8 text-center shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-gray-600 text-lg">No blog posts yet. Check back soon!</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post, index) => (
            <motion.div
              key={index}
              className="bg-gray-50 rounded-lg overflow-hidden shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <div className="relative h-48">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <p className="text-gray-600 text-sm mb-2">{post.date}</p>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{post.title}</h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-[#FD4345] font-semibold hover:text-[#ff5456] transition-colors"
                >
                  Read More →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

