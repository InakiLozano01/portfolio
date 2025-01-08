import Image from 'next/image'
import { motion } from 'framer-motion'

export default function About() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src="/pfp.jpg?height=400&width=400"
            alt="Iñaki Lozano"
            width={400}
            height={400}
            className="rounded-full mx-auto"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold mb-4 text-primary">About Me</h2>
          <p className="text-gray-600 mb-4">
            I&apos;m a software developer with a passion for creating innovative solutions. With 1.5 years of experience in the industry, I&apos;ve worked on a wide range of projects, from web applications to APIs and everything in between.
          </p>
          <p className="text-gray-600 mb-4">
            My journey in software development began in 2nd year of university. Since then, I&apos;ve been constantly learning and adapting to new technologies to stay at the forefront of the industry.
          </p>
          <h3 className="text-xl font-semibold mb-2 text-primary">Hobbies & Interests</h3>
          <ul className="list-disc list-inside text-gray-600 mb-6">
            <li>Open-source projects</li>
            <li>Podcasts</li>
            <li>Watching Sports</li>
            <li>Self development</li>
          </ul>
          <a
            href="/CV.pdf"
            download
            className="bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-accent transition-colors duration-200"
          >
            Download CV
          </a>
        </motion.div>
      </div>
    </div>
  )
}

