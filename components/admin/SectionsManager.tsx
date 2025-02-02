'use client';

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlusCircle, Trash2, AlertCircle } from 'lucide-react'
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
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-8 pr-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Sections</h2>
          <div className="flex gap-2">
            <Button
              onClick={handleRefreshCache}
              disabled={refreshing}
              variant="outline"
              className="flex items-center gap-2"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Content Cache'}
            </Button>
            <Button
              onClick={() => setIsAddingSection(true)}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
            >
              <PlusCircle className="w-4 h-4" />
              Add Section
            </Button>
          </div>
        </div>

        {isAddingSection && (
          <Card>
            <CardHeader>
              <CardTitle>New Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newSection.title}
                  onChange={e => setNewSection({ ...newSection, title: e.target.value })}
                  className="bg-white text-black placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={newSection.order}
                  onChange={e => setNewSection({ ...newSection, order: parseInt(e.target.value) })}
                  className="bg-white text-black placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label>Visible</Label>
                <Switch
                  checked={newSection.visible}
                  onCheckedChange={checked => setNewSection({ ...newSection, visible: checked })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddingSection(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSection}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Create Section
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {sections.map(section => (
            <Card key={section._id} className="relative group">
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-500">Visible</Label>
                  <Switch
                    checked={section.visible}
                    onCheckedChange={() => handleVisibilityChange(section)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-100"
                  onClick={() => handleDeleteSection(section)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="pt-14">
                <SectionEditor
                  section={section}
                  onSave={handleSaveSection}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={!!sectionToDelete} onOpenChange={() => setSectionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Delete Section
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{sectionToDelete?.title}" section? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
} 