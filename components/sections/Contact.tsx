'use client'

import { motion } from 'framer-motion'
import { FaEnvelope, FaGithub, FaLinkedin, FaMapMarkerAlt } from 'react-icons/fa'

export default function Contact() {
  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-8 text-primary">Get in Touch</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          className="bg-gray-50 rounded-lg p-6 shadow-sm"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <FaEnvelope className="text-[#FD4345] text-xl mr-3" />
              <a href="mailto:kakitolozano@gmail.com" className="text-gray-600 hover:text-[#FD4345] transition-colors">
                kakitolozano@gmail.com
              </a>
            </div>
            <div className="flex items-center">
              <FaMapMarkerAlt className="text-[#FD4345] text-xl mr-3" />
              <span className="text-gray-600">Tucuman, Argentina</span>
            </div>
            <div className="flex items-center space-x-4 mt-6">
              <a
                href="https://github.com/InakiLozano01"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#FD4345] transition-colors"
              >
                <FaGithub className="text-2xl" />
              </a>
              <a
                href="https://linkedin.com/in/inaki-fernando-lozano-b783021b0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#FD4345] transition-colors"
              >
                <FaLinkedin className="text-2xl" />
              </a>
            </div>
          </div>
        </motion.div>

        <motion.form
          className="bg-gray-50 rounded-lg p-6 shadow-sm"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-800 font-medium mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FD4345]/50"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-800 font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FD4345]/50"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="message" className="block text-gray-800 font-medium mb-2">
              Message
            </label>
            <textarea
              id="message"
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FD4345]/50"
              required
            ></textarea>
          </div>
          <button
            type="submit"
            className="w-full bg-[#FD4345] text-white py-2 px-6 rounded-lg font-semibold hover:bg-[#ff5456] transition-colors"
          >
            Send Message
          </button>
        </motion.form>
      </div>
    </div>
  )
}

