/// <reference types="react" />
'use client';

import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import BlogManager from './BlogManager';
import MessagesManager from './MessagesManager';
import SectionsManager from './SectionsManager';
import SkillsManager from './SkillsManager';
import ProjectsManager from './ProjectsManager';
import AssetsManager from './AssetsManager';
import StatusCards from './StatusCards';
import { 
  RefreshCw, 
  Activity, 
  Database, 
  Settings, 
  FileText, 
  Briefcase, 
  Wrench, 
  MessageSquare, 
  Menu, 
  X, 
  Home, 
  Lock,
  LayoutDashboard,
  Image as ImageIcon,
  UserCog
} from 'lucide-react';
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

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.height = '100%';
    body.style.height = '100%';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
    };
  }, []);

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
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'sections', label: 'Sections', icon: Activity },
    { id: 'skills', label: 'Skills', icon: Wrench },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'blogs', label: 'Blog', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'assets', label: 'Assets', icon: ImageIcon },
    { id: 'account', label: 'Account', icon: UserCog },
  ];

  return (
    <div className="flex h-full min-h-0 bg-[#F8F9FA] overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-[#263547] text-white shadow-xl z-20 flex flex-col flex-shrink-0 relative"
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50">
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-xl tracking-tight flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-[#FD4345] rounded-lg flex items-center justify-center text-white">
                    A
                </div>
                <span>Admin</span>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white hover:bg-slate-700/50 ml-auto"
          >
            {sidebarOpen ? <Menu className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <Button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  variant="ghost"
                  className={`w-full justify-start h-11 px-3 relative transition-all duration-200 ${
                    isActive
                      ? 'bg-[#FD4345] text-white shadow-md hover:bg-[#FD4345] hover:text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : 'mr-0'} flex-shrink-0`} />
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {isActive && sidebarOpen && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute right-0 w-1 h-6 bg-white/20 rounded-l-full"
                    />
                  )}
                </Button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Cache Controls (Collapsed or Expanded) */}
        <div className="p-4 border-t border-slate-700/50 bg-[#1e293b]">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Database className="w-3 h-3" />
                <span>Cache Control</span>
              </div>
              <Select
                value={selectedCacheType}
                onValueChange={setSelectedCacheType}
              >
                <SelectTrigger className="w-full bg-slate-800 border-slate-600 text-slate-200 h-9 text-xs">
                  <SelectValue placeholder="Select cache" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                   <SelectItem value="all">All Caches</SelectItem>
                   <SelectItem value="projects">Projects</SelectItem>
                   <SelectItem value="sections">Sections</SelectItem>
                   <SelectItem value="skills">Skills</SelectItem>
                   <SelectItem value="blogs">Blogs</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleCacheRefresh}
                disabled={isRefreshing}
                size="sm"
                className="w-full bg-slate-700 hover:bg-slate-600 text-white border-0 h-9"
              >
                <RefreshCw className={`w-3 h-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          ) : (
             <div className="flex flex-col items-center gap-2">
                 <Button
                    onClick={() => setSidebarOpen(true)}
                    size="icon"
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                 >
                    <Database className="w-5 h-5" />
                 </Button>
             </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 capitalize">
                {activeSection === 'overview' ? 'Overview' : activeSection}
              </h2>
              <p className="text-xs text-slate-500 hidden md:block">
                {activeSection === 'overview' && 'Dashboard Metrics'}
                {activeSection === 'sections' && 'Manage Homepage'}
                {activeSection === 'skills' && 'Manage Skills'}
                {activeSection === 'projects' && 'Manage Projects'}
                {activeSection === 'blogs' && 'Manage Blog Posts'}
                {activeSection === 'messages' && 'Inbox'}
                {activeSection === 'assets' && 'File Manager'}
                {activeSection === 'account' && 'Settings'}
              </p>
            </div>
          </div>
          <TopBar onRefreshAll={() => { setSelectedCacheType('all'); handleCacheRefresh(); }} />
        </header>

        {/* Scrollable Content Area */}
        <main className={`flex-1 bg-[#F8F9FA] min-h-0 ${['projects', 'blogs'].includes(activeSection) ? 'overflow-hidden' : 'overflow-y-auto p-6'}`}>
          <div className={`max-w-7xl mx-auto w-full h-full min-h-0 ${['projects', 'blogs'].includes(activeSection) ? '' : ''}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={['projects', 'blogs'].includes(activeSection) ? 'h-full min-h-0' : ''}
              >
                {activeSection === 'overview' && (
                  <div className="space-y-8">
                    <StatusCards />
                    
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                      {sidebarItems.slice(1).map((item) => {
                        const Icon = item.icon;
                        return (
                          <Card 
                            key={item.id} 
                            className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100 hover:border-[#FD4345]/20 overflow-hidden" 
                            onClick={() => setActiveSection(item.id)}
                          >
                            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                              <div className={`p-4 rounded-full bg-slate-50 text-slate-600 group-hover:bg-[#FD4345] group-hover:text-white transition-colors duration-300`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900 group-hover:text-[#FD4345] transition-colors">
                                  {item.label}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                  Manage {item.label.toLowerCase()}
                                </p>
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
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
