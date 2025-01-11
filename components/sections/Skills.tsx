'use client'

import { motion } from 'framer-motion'
import { FaJava, FaJs, FaPhp, FaPython, FaHtml5, FaReact, FaCss3, FaBootstrap, FaNodeJs, FaGithub, FaGitlab, FaGit, FaUbuntu, FaDocker } from 'react-icons/fa'
import { SiTypescript, SiSpring, SiCodeigniter, SiFlask, SiMysql, SiPostgresql, SiIntellijidea, SiGooglecloud, SiGithubcopilot, SiOpenai, SiMeta } from 'react-icons/si'
import { VscCode } from 'react-icons/vsc'
import { useEffect, useState } from 'react'

const iconMap = {
  FaJava, FaJs, FaPhp, FaPython, FaHtml5, FaReact, FaCss3, FaBootstrap, 
  FaNodeJs, FaGithub, FaGitlab, FaGit, FaUbuntu, FaDocker,
  SiTypescript, SiSpring, SiCodeigniter, SiFlask, SiMysql, SiPostgresql, 
  SiIntellijidea, SiGooglecloud, SiOpenai,
  VscCode
}

interface Skill {
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
}

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch('/api/skills');
        if (!response.ok) {
          throw new Error('Failed to fetch skills');
        }
        const data = await response.json();
        setSkills(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch skills');
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  if (loading) return <div className="text-center">Loading skills...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="w-full px-4 md:px-8 pb-8">
      <h2 className="text-3xl font-bold mb-8 text-primary">Skills</h2>
      <div className="space-y-12">
        {['language', 'framework', 'database', 'tool', 'devops', 'ai'].map((category) => (
          <div key={category}>
            <h3 className="text-2xl font-semibold mb-4 text-primary capitalize">{category}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {skills
                .filter(skill => skill.category === category)
                .map((skill, index) => {
                  const Icon = iconMap[skill.icon as keyof typeof iconMap];
                  return (
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
                          {Icon && <Icon className="w-8 h-8 text-[#FD4345]" />}
                        </div>
                      </div>
                      <p className="text-center font-semibold text-gray-800">{skill.name}</p>
                      <p className="text-sm text-gray-600">{skill.proficiency}%</p>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

