/// <reference types="react" />
'use client';

import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import BlogManager from './BlogManager';
import MessagesManager from './MessagesManager';
import SectionsManager from './SectionsManager';
import SkillsManager from './SkillsManager';
import ProjectsManager from './ProjectsManager';
import AssetsManager from './AssetsManager';
import StatusCards from './StatusCards';
import { RefreshCw, Activity, Database, Settings, FileText, Briefcase, Wrench, MessageSquare, Menu, X, Home, Lock } from 'lucide-react';
import ChangePassword from './ChangePassword';
import TopBar from './TopBar';
import EmailDiagnostics from './EmailDiagnostics';

interface Skill {
  _id: string;
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
}

const AdminDashboard: FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCacheType, setSelectedCacheType] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();

  // Load skills so SkillsManager shows existing items
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const res = await fetch('/api/skills')
        if (!res.ok) throw new Error('Failed to fetch skills')
        const data = await res.json()
        setSkills(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Skills fetch error:', err)
      }
    }
    loadSkills()
  }, [])

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

      toast({
        title: 'Success',
        description: `Skill ${method === 'POST' ? 'created' : 'updated'} successfully`,
      });
    } catch (error) {
      console.error('Error saving skill:', error);
      toast({
        title: 'Error',
        description: 'Failed to save skill',
        variant: 'destructive',
      });
    }
  };

  const handleCacheRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/cache/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cacheType: selectedCacheType }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh cache');
      }

      const result = await response.json();
      toast({
        title: 'Cache Refreshed',
        description: result.message,
      });
    } catch (error) {
      console.error('Error refreshing cache:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh cache',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: Home, color: 'text-blue-600' },
    { id: 'sections', label: 'Sections', icon: Settings, color: 'text-red-600' },
    { id: 'skills', label: 'Skills', icon: Wrench, color: 'text-blue-600' },
    { id: 'projects', label: 'Projects', icon: Briefcase, color: 'text-red-600' },
    { id: 'blogs', label: 'Blog', icon: FileText, color: 'text-blue-600' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, color: 'text-red-600' },
    { id: 'assets', label: 'Assets', icon: Settings, color: 'text-blue-600' },
    { id: 'account', label: 'Account', icon: Lock, color: 'text-red-600' },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-xl flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <p className="text-sm text-slate-300">Portfolio Management</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-slate-700"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${isActive
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-current'
                  }`} />
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Cache Controls */}
        {sidebarOpen && (
          <div className="p-4 border-t border-slate-700">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Database className="w-4 h-4" />
                <span>Cache Control</span>
              </div>
              <Select
                value={selectedCacheType}
                onChange={(e) => setSelectedCacheType(e.target.value)}
                className="w-full bg-slate-700 text-white border-slate-600"
              >
                <option value="all">All Caches</option>
                <option value="projects">Projects</option>
                <option value="sections">Sections</option>
                <option value="skills">Skills</option>
                <option value="blogs">Blogs</option>
              </Select>
              <Button
                onClick={handleCacheRefresh}
                disabled={isRefreshing}
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700 text-white border-0"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Cache'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 capitalize">
                {activeSection === 'overview' ? 'Dashboard Overview' : activeSection}
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                {activeSection === 'overview' && 'Manage your portfolio content and settings'}
                {activeSection === 'sections' && 'Configure homepage sections and content'}
                {activeSection === 'skills' && 'Add and organize your technical skills'}
                {activeSection === 'projects' && 'Showcase your work and projects'}
                {activeSection === 'blogs' && 'Write and publish blog articles'}
                {activeSection === 'messages' && 'Handle visitor inquiries and messages'}
                {activeSection === 'assets' && 'Upload/replace CV and Profile image'}
                {activeSection === 'account' && 'Account security and settings'}
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
            </Badge>
          </div>
          <div className="mt-4">
            <TopBar onRefreshAll={() => { setSelectedCacheType('all'); handleCacheRefresh(); }} />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 bg-slate-50">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <StatusCards />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sidebarItems.slice(1).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.id} className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-md" onClick={() => setActiveSection(item.id)}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg bg-gradient-to-br ${item.color.includes('red')
                            ? 'from-red-50 to-red-100 border border-red-200'
                            : 'from-blue-50 to-blue-100 border border-blue-200'
                            }`}>
                            <Icon className={`w-6 h-6 ${item.color}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {item.label}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              {item.id === 'sections' && 'Manage homepage content'}
                              {item.id === 'skills' && 'Technical proficiencies'}
                              {item.id === 'projects' && 'Portfolio showcase'}
                              {item.id === 'blogs' && 'Content publishing'}
                              {item.id === 'messages' && 'Visitor communications'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === 'sections' && <SectionsManager />}
          {activeSection === 'skills' && <SkillsManager skills={skills} onSave={handleSaveSkill} />}
          {activeSection === 'projects' && <ProjectsManager />}
          {activeSection === 'blogs' && <BlogManager />}
          {activeSection === 'messages' && <MessagesManager />}
          {activeSection === 'assets' && <AssetsManager />}
          {activeSection === 'account' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChangePassword />
              <EmailDiagnostics />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard; 