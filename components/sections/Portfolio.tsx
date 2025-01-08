import { motion } from 'framer-motion'
import Image from 'next/image'

const projects = [
  {
    title: 'E-commerce Platform',
    description: 'A full-stack e-commerce solution with React, Node.js, and MongoDB',
    image: '/placeholder.svg?height=300&width=400',
    technologies: ['React', 'Node.js', 'MongoDB', 'Express'],
    link: '#'
  },
  {
    title: 'Task Management App',
    description: 'A responsive web app for managing tasks and projects',
    image: '/placeholder.svg?height=300&width=400',
    technologies: ['Vue.js', 'Firebase', 'Vuex'],
    link: '#'
  },
  {
    title: 'Weather Forecast Dashboard',
    description: 'Real-time weather dashboard using OpenWeatherMap API',
    image: '/placeholder.svg?height=300&width=400',
    technologies: ['React', 'Redux', 'Chart.js', 'API Integration'],
    link: '#'
  },
  {
    title: 'Social Media Analytics Tool',
    description: 'Analytics dashboard for tracking social media engagement',
    image: '/placeholder.svg?height=300&width=400',
    technologies: ['Angular', 'D3.js', 'Node.js', 'PostgreSQL'],
    link: '#'
  }
]

export default function Portfolio() {
  return (
    <section id="portfolio" className="min-h-screen flex items-center justify-center bg-white">
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center text-[#800020]">Portfolio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <Image
                src={project.image}
                alt={project.title}
                width={400}
                height={300}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-bold text-[#800020] mb-2">{project.title}</h3>
                <p className="text-gray-600 mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.technologies.map((tech, idx) => (
                    <span key={idx} className="bg-[#F5F5F5] text-[#800020] text-sm px-2 py-1 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
                <a
                  href={project.link}
                  className="inline-block bg-[#800020] text-white px-4 py-2 rounded hover:bg-[#005f99] transition-colors duration-200"
                >
                  View Project
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

