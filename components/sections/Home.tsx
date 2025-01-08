import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <section id="home" className="flex items-start justify-center min-h-screen bg-white relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F5F5F5" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className="container mx-auto px-4 text-center relative z-10 mt-36">
        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-4 text-primary"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Technology Accelerationist and Innovation Pursuer
        </motion.h1>
        <motion.p
          className="text-xl mb-8 text-gray-600"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Hi, I&apos;m Iñaki Lozano, a Computer Engineering student at the National University of Tucuman. I&apos;m passionate about building innovative and creative solutions with code.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
        </motion.div>
      </div>
    </section>
  )
}

