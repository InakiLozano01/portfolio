'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { FaBriefcase } from 'react-icons/fa'

const experienceData = [
  {
    title: 'Jr Software Engineer',
    company: 'Tribunal de Cuentas de la Provincia de Tucuman',
    date: 'Nov 2023 - Present',
    responsibilities: [
      'Digital signatures, integrity middleware and API',
      'Full stack development of Documents and Records System',
      'Database design and development',
    ]
  },
  {
    title: 'Trainee Backend Developer',
    company: 'Third Party Startup Project',
    date: 'Jan 2024 - Oct 2024',
    responsibilities: [
      'Designed complete database business logic for a REST API',
      'Developed entire backend API for the web application'
    ]
  },
]

export default function Experience() {
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-8 text-primary">Experience</h2>
      <div className="relative pl-6">
        <div className="absolute left-0 top-0 h-full w-0.5 bg-[#FD4345]/20"></div>
        {experienceData.map((job, index) => (
          <motion.div
            key={index}
            className="mb-8 relative"
            initial={isClient ? { opacity: 0, x: -50 } : false}
            animate={isClient ? { opacity: 1, x: 0 } : false}
            transition={{ duration: 0.5, delay: index * 0.2 }}
          >
            <div className="absolute left-0 top-4 -translate-x-[13px] z-20 flex items-center justify-center bg-[#FD4345] shadow-xl w-5 h-5 rounded-full">
              <FaBriefcase className="text-white text-xs" />
            </div>
            <div className="ml-6 bg-gray-50 rounded-lg p-6 shadow-sm">
              <h3 className="mb-2 font-bold text-[#FD4345] text-xl">{job.title}</h3>
              <p className="text-gray-800 mb-1">{job.company}</p>
              <p className="text-gray-600 mb-2">{job.date}</p>
              <ul className="space-y-2">
                {job.responsibilities.map((responsibility, idx) => (
                  <li key={idx} className="text-gray-600 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[0.6em] before:w-1.5 before:h-1.5 before:bg-[#FD4345]/50 before:rounded-full">
                    {responsibility}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

