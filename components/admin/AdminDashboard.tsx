'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SectionsManager from './SectionsManager';
import SkillsManager from './SkillsManager';

interface Skill {
  _id: string;
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('sections');
  const [skills, setSkills] = React.useState<Skill[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="sections">Sections</TabsTrigger>
        <TabsTrigger value="skills">Skills</TabsTrigger>
      </TabsList>

      <TabsContent value="sections" className="space-y-4">
        <SectionsManager />
      </TabsContent>

      <TabsContent value="skills" className="space-y-4">
        {loading ? (
          <div>Loading skills...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <SkillsManager skills={skills} onSave={handleSaveSkill} />
        )}
      </TabsContent>
    </Tabs>
  );
};

export default AdminDashboard; 