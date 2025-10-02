'use client';

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PlusCircle, Trash2, AlertCircle, RefreshCw } from 'lucide-react'
import SectionEditor from './SectionEditor'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Section {
  _id: string;
  title: string;
  order: number;
  visible: boolean;
  content: Record<string, any>;
}

export default function SectionsManager() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [newSection, setNewSection] = useState({
    title: '',
    order: 0,
    visible: true,
    content: {}
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/sections');
      if (!response.ok) {
        throw new Error('Failed to fetch sections');
      }
      const data = await response.json();
      setSections(data.sort((a: Section, b: Section) => a.order - b.order));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sections');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async () => {
    try {
      const response = await fetch('/api/sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSection),
      });

      if (!response.ok) {
        throw new Error('Failed to create section');
      }

      await handleRefreshCache();
      setIsAddingSection(false);
      setNewSection({
        title: '',
        order: 0,
        visible: true,
        content: {}
      });
      toast.success('Section created successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create section');
    }
  };

  const handleDeleteSection = async (section: Section) => {
    setSectionToDelete(section);
  };

  const confirmDelete = async () => {
    if (!sectionToDelete) return;

    try {
      const response = await fetch(`/api/sections/${sectionToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete section');
      }

      await handleRefreshCache();
      toast.success('Section deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete section');
    } finally {
      setSectionToDelete(null);
    }
  };

  const handleSaveSection = async (updatedSection: Section) => {
    try {
      const response = await fetch(`/api/sections/${updatedSection._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSection),
      });

      if (!response.ok) {
        throw new Error('Failed to update section');
      }

      await handleRefreshCache();
      toast.success('Section updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update section');
    }
  };

  const handleVisibilityChange = async (section: Section) => {
    const updatedSection = {
      ...section,
      visible: !section.visible
    };
    await handleSaveSection(updatedSection);
  };

  const bulkSetVisibility = async (visible: boolean) => {
    for (const s of sections) {
      if (s.visible !== visible) {
        await handleSaveSection({ ...s, visible });
      }
    }
    await fetchSections();
  };

  const handleRefreshCache = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/sections/refresh', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh cache');
      }

      await fetchSections();
    } catch (error) {
      console.error('Error refreshing cache:', error);
      toast.error('Failed to refresh content cache');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <div>Loading sections...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="flex flex-col space-y-6 sm:space-y-8">
      <div className="p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-600">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sections Management</h2>
            <p className="text-slate-600 text-sm mt-1">Configure homepage sections and content</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRefreshCache}
              disabled={refreshing}
              variant="outline"
              className="flex items-center gap-2 border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Cache'}
            </Button>
            <Button
              onClick={() => bulkSetVisibility(true)}
              variant="outline"
              className="border-slate-300 text-blue-700 hover:bg-blue-50"
            >
              Show all
            </Button>
            <Button
              onClick={() => bulkSetVisibility(false)}
              variant="outline"
              className="border-slate-300 text-red-700 hover:bg-red-50"
            >
              Hide all
            </Button>
            <Button
              onClick={() => setIsAddingSection(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Section
            </Button>
          </div>
        </div>
      </div>

      {isAddingSection && (
        <Card className="bg-white shadow-md border-0">
          <CardHeader className="bg-gradient-to-r from-red-600 to-blue-600 text-white">
            <CardTitle>Create New Section</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">Title</Label>
                  <Input
                    value={newSection.title}
                    onChange={e => setNewSection({ ...newSection, title: e.target.value })}
                    placeholder="Section title"
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">Order</Label>
                  <Input
                    type="number"
                    value={newSection.order}
                    onChange={e => setNewSection({ ...newSection, order: parseInt(e.target.value) })}
                    placeholder="Display order"
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Label className="text-slate-700 font-semibold">Visible</Label>
                <Switch
                  checked={newSection.visible}
                  onCheckedChange={checked => setNewSection({ ...newSection, visible: checked })}
                />
                <span className="text-sm text-slate-600">
                  {newSection.visible ? 'Section will be visible on the website' : 'Section will be hidden from visitors'}
                </span>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingSection(false)}
                  className="border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSection}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Create Section
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6 p-4 pt-4 sm:p-6 overflow-y-auto">
        {sections.map(section => (
          <Card key={section._id} className="bg-white shadow-md border-0 relative group">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-red-600 text-white relative">
              <div className="flex justify-between items-center">
                <CardTitle className="capitalize">{section.title}</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-white text-sm font-medium">Visible</Label>
                    <Switch
                      checked={section.visible}
                      onCheckedChange={() => handleVisibilityChange(section)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 transition-colors"
                    onClick={() => handleDeleteSection(section)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <SectionEditor
                section={section}
                onSave={handleSaveSection}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!sectionToDelete} onOpenChange={() => setSectionToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Section
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to delete the "{sectionToDelete?.title}" section? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 text-slate-600 hover:bg-slate-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 