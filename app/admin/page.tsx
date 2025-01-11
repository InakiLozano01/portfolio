'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SectionsManager from '@/components/admin/SectionsManager'
import SkillsManager from '@/components/admin/SkillsManager'
import MessagesManager from '@/components/admin/MessagesManager'
import { signOut } from 'next-auth/react'

interface Skill {
  _id: string;
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
}

export default function AdminPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSkills();
  }, []);

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

  const handleSaveSkill = async (skill: Skill) => {
    try {
      const response = await fetch('/api/skills', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(skill),
      });

      if (!response.ok) {
        throw new Error('Failed to update skill');
      }

      await fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update skill');
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' });
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button 
            onClick={handleLogout}
            variant="destructive"
            className="bg-[#FD4345] hover:bg-[#ff5456]"
          >
            Logout
          </Button>
        </div>
        <Tabs defaultValue="sections" className="space-y-4">
          <TabsList className="bg-[#2a2a2a] border-b border-[#3a3a3a]">
            <TabsTrigger value="sections" className="text-gray-300 hover:text-white data-[state=active]:text-white data-[state=active]:bg-[#3a3a3a]">
              Sections
            </TabsTrigger>
            <TabsTrigger value="skills" className="text-gray-300 hover:text-white data-[state=active]:text-white data-[state=active]:bg-[#3a3a3a]">
              Skills
            </TabsTrigger>
            <TabsTrigger value="blog" className="text-gray-300 hover:text-white data-[state=active]:text-white data-[state=active]:bg-[#3a3a3a]">
              Blog
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-gray-300 hover:text-white data-[state=active]:text-white data-[state=active]:bg-[#3a3a3a]">
              Messages
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sections" className="bg-[#2a2a2a] p-6 rounded-lg">
            <SectionsManager />
          </TabsContent>
          <TabsContent value="skills" className="bg-[#2a2a2a] p-6 rounded-lg">
            {loading ? (
              <div className="text-center">Loading skills...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <SkillsManager skills={skills} onSave={handleSaveSkill} />
            )}
          </TabsContent>
          <TabsContent value="blog" className="bg-[#2a2a2a] p-6 rounded-lg">
            <div className="text-center text-gray-400">Blog management coming soon...</div>
          </TabsContent>
          <TabsContent value="messages" className="bg-[#2a2a2a] p-6 rounded-lg">
            <MessagesManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 