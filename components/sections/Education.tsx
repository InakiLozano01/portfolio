'use client'

import { motion } from 'framer-motion'
import { FaGraduationCap } from 'react-icons/fa'

const educationData = [
  {
    year: '2019 - Now',
    degree: 'Computer Engineering',
    institution: 'National University of Tucuman',
    achievements: 'Currently with 3 remaining tests to graduate.'
  },
  {
    year: '2012',
    degree: 'Bachelor in Theory and Management of Organizations',
    institution: 'Instituto Integral Argentino Hebreo Independencia',
    achievements: 'Best student 1st year. Standard bearer at last year.',
  },
]

export default function Education() {
  return (
    <section className="flex items-center justify-center bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-primary">Education</h2>
        <div className="relative pl-6">
          <div className="absolute left-0 top-0 h-full w-0.5 bg-[#FD4345]/20"></div>
          {educationData.map((item, index) => (
            <motion.div
              key={index}
              className="mb-8 relative"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <div className="absolute left-0 top-4 -translate-x-[13px] z-20 flex items-center justify-center bg-[#FD4345] shadow-xl w-5 h-5 rounded-full">
                <FaGraduationCap className="text-white text-xs" />
              </div>
              <div className="ml-6 bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="mb-2 font-bold text-[#FD4345] text-xl">{item.degree}</h3>
                <p className="text-gray-800 mb-1">{item.institution}</p>
                <p className="text-gray-600 mb-1">{item.year}</p>
                <p className="text-gray-600">{item.achievements}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

