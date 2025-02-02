'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import BlogManager from './BlogManager';
import MessagesManager from './MessagesManager';
import SectionsManager from './SectionsManager';
import SkillsManager from './SkillsManager';
import ProjectsManager from './ProjectsManager';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('sections');

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
            <SkillsManager />
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
} 