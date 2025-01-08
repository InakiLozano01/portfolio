'use client'

import Link from 'next/link'
import { FaLinkedin, FaGithub, FaEnvelope } from 'react-icons/fa'

export default function Footer() {
  return (
    <footer className="bg-[#1a2433] text-white py-2">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="https://linkedin.com/in/inaki-fernando-lozano-b783021b0" target="_blank" className="hover:text-[#FD4345] transition-colors">
            <FaLinkedin size={20} />
          </Link>
          <Link href="https://github.com/InakiLozano01" target="_blank" className="hover:text-[#FD4345] transition-colors">
            <FaGithub size={20} />
          </Link>
          <Link href="mailto:kakitolozano@gmail.com" className="hover:text-[#FD4345] transition-colors">
            <FaEnvelope size={20} />
          </Link>
        </div>
        <p className="text-sm text-gray-400">© 2024 Iñaki Lozano</p>
      </div>
    </footer>
  )
}

