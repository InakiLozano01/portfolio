/// <reference types="react" />
'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import BlogManager from './BlogManager';
import MessagesManager from './MessagesManager';
import SectionsManager from './SectionsManager';
import SkillsManager from './SkillsManager';
import ProjectsManager from './ProjectsManager';

interface Skill {
  _id: string;
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
}

const AdminDashboard: FC = () => {
  const [activeTab, setActiveTab] = useState('sections');
  const [skills, setSkills] = useState<Skill[]>([]);

  const handleSaveSkill = async (skill: Skill) => {
    try {
      const method = skill._id ? 'PUT' : 'POST';
      const response = await fetch('/api/skills', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(skill)
      });

      if (!response.ok) {
        throw new Error('Failed to save skill');
      }

      const savedSkill = await response.json();

      setSkills((prevSkills: Skill[]) => {
        const index = prevSkills.findIndex((s: Skill) => s._id === savedSkill._id);
        if (index >= 0) {
          return [
            ...prevSkills.slice(0, index),
            savedSkill,
            ...prevSkills.slice(index + 1)
          ];
        }
        return [...prevSkills, savedSkill];
      });
    } catch (error) {
      console.error('Error saving skill:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="blogs">Blog</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>
          <TabsContent value="sections">
            <SectionsManager />
          </TabsContent>
          <TabsContent value="skills">
            <SkillsManager skills={skills} onSave={handleSaveSkill} />
          </TabsContent>
          <TabsContent value="projects">
            <ProjectsManager />
          </TabsContent>
          <TabsContent value="blogs">
            <BlogManager />
          </TabsContent>
          <TabsContent value="messages">
            <MessagesManager />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminDashboard; 