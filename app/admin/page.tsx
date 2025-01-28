'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SectionsManager from '@/components/admin/SectionsManager'
import SkillsManager from '@/components/admin/SkillsManager'
import MessagesManager from '@/components/admin/MessagesManager'
import BlogManager from '@/components/admin/BlogManager'
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
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchSkills();
    }
  }, [session]);

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
      const method = '_id' in skill ? 'PUT' : 'POST';
      const response = await fetch('/api/skills', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(skill),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${method === 'PUT' ? 'update' : 'create'} skill`);
      }

      await fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save skill');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({
        redirect: true,
        callbackUrl: '/admin/login'
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect on error
      window.location.href = '/admin/login';
    }
  };

  // Show loading state while checking session
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Logout
          </Button>
        </div>
        <Tabs defaultValue="sections" className="space-y-4">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="sections" className="text-gray-600 hover:text-gray-900 data-[state=active]:text-gray-900 data-[state=active]:bg-gray-100">
              Sections
            </TabsTrigger>
            <TabsTrigger value="skills" className="text-gray-600 hover:text-gray-900 data-[state=active]:text-gray-900 data-[state=active]:bg-gray-100">
              Skills
            </TabsTrigger>
            <TabsTrigger value="blogs" className="text-gray-600 hover:text-gray-900 data-[state=active]:text-gray-900 data-[state=active]:bg-gray-100">
              Blogs
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-gray-600 hover:text-gray-900 data-[state=active]:text-gray-900 data-[state=active]:bg-gray-100">
              Messages
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sections" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <SectionsManager />
          </TabsContent>
          <TabsContent value="skills" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            {loading ? (
              <div className="text-center text-gray-600">Loading skills...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <SkillsManager skills={skills} onSave={handleSaveSkill} />
            )}
          </TabsContent>
          <TabsContent value="blogs" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <BlogManager />
          </TabsContent>
          <TabsContent value="messages" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <MessagesManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 