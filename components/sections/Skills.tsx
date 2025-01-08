'use client'

import { motion } from 'framer-motion'
import { FaJava, FaJs, FaPhp, FaPython, FaHtml5, FaReact, FaCss3, FaBootstrap, FaNodeJs, FaGithub, FaGitlab, FaGit, FaUbuntu, FaDocker } from 'react-icons/fa'
import { SiTypescript, SiSpring, SiCodeigniter, SiFlask, SiMysql, SiPostgresql, SiIntellijidea, SiGooglecloud, SiGithubcopilot, SiOpenai, SiMeta } from 'react-icons/si'
import { VscCode } from 'react-icons/vsc'

const skills = [
  // Languages
  { name: 'Java', icon: FaJava, proficiency: 80, type: 'language'},
  { name: 'JavaScript', icon: FaJs, proficiency: 75, type: 'language'},
  { name: 'TypeScript', icon: SiTypescript, proficiency: 85, type: 'language'},
  { name: 'PHP', icon: FaPhp, proficiency: 80, type: 'language'},
  { name: 'Python', icon: FaPython, proficiency: 85, type: 'language'},
  { name: 'HTML5', icon: FaHtml5, proficiency: 95, type: 'language'},
  
  // Frameworks and Libraries
  { name: 'Spring', icon: SiSpring, proficiency: 75, type: 'framework'},
  { name: 'React', icon: FaReact, proficiency: 65, type: 'framework'},
  { name: 'CSS3', icon: FaCss3, proficiency: 90, type: 'framework'},
  { name: 'Bootstrap', icon: FaBootstrap, proficiency: 85, type: 'framework'},
  { name: 'CodeIgniter', icon: SiCodeigniter, proficiency: 70, type: 'framework'},
  { name: 'Flask', icon: SiFlask, proficiency: 75, type: 'framework'},
  
  // Databases
  { name: 'MySQL', icon: SiMysql, proficiency: 85, type: 'database'},
  { name: 'PostgreSQL', icon: SiPostgresql, proficiency: 90, type: 'database'},
  
  // Dev Tools
  { name: 'VS Code', icon: VscCode, proficiency: 90, type: 'tool'},
  { name: 'IntelliJ', icon: SiIntellijidea, proficiency: 80, type: 'tool'},
  { name: 'Node.js', icon: FaNodeJs, proficiency: 80, type: 'tool'},
  { name: 'GitHub', icon: FaGithub, proficiency: 90, type: 'tool'},
  { name: 'GitLab', icon: FaGitlab, proficiency: 70, type: 'tool'},
  { name: 'Git', icon: FaGit, proficiency: 85, type: 'tool'},
  
  // DevOps and SysAdmin
  { name: 'Ubuntu', icon: FaUbuntu, proficiency: 85, type: 'devops'},
  { name: 'Docker', icon: FaDocker, proficiency: 90, type: 'devops'},
  { name: 'Google Cloud', icon: SiGooglecloud, proficiency: 60, type: 'devops'},
  
  // AI Tools
  { name: 'ChatGPT', icon: SiOpenai, proficiency: 95, type: 'ai'},
]

export default function Skills() {
  return (
    <div className="w-full px-4 md:px-8 pb-8">
      <h2 className="text-3xl font-bold mb-8 text-primary">Skills</h2>
      <div className="space-y-12">
        {['language', 'framework', 'database', 'tool', 'devops', 'ai'].map((type) => (
          <div key={type}>
            <h3 className="text-2xl font-semibold mb-4 text-primary capitalize">{type}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {skills.filter(skill => skill.type === type).map((skill, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="relative w-20 h-20 mb-4">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        className="text-gray-200 stroke-current"
                        strokeWidth="8"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                      ></circle>
                      <circle
                        className="text-[#FD4345] progress-ring__circle stroke-current"
                        strokeWidth="8"
                        strokeLinecap="round"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - skill.proficiency / 100)}`}
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <skill.icon className="w-8 h-8 text-[#FD4345]" />
                    </div>
                  </div>
                  <p className="text-center font-semibold text-gray-800">{skill.name}</p>
                  <p className="text-sm text-gray-600">{skill.proficiency}%</p>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

