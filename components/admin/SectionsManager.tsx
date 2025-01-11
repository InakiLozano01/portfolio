'use client';

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlusCircle, Trash2 } from 'lucide-react'
import SectionEditor from './SectionEditor'
import { toast } from 'sonner'

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

      await fetchSections();
      setIsAddingSection(false);
      setNewSection({
        title: '',
        order: 0,
        visible: true,
        content: {}
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create section');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      const response = await fetch(`/api/sections/${sectionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete section');
      }

      await fetchSections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete section');
    }
  };

  const handleSaveSection = async (updatedSection: Section) => {
    try {
      const response = await fetch('/api/sections', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSection),
      });

      if (!response.ok) {
        throw new Error('Failed to update section');
      }

      await fetchSections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update section');
    }
  };

  const handleVisibilityChange = async (section: Section) => {
    try {
      const response = await fetch(`/api/sections/${section._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...section,
          visible: !section.visible,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update section');
      }

      await fetchSections();
    } catch (error) {
      console.error('Error updating section:', error);
      toast.error('Failed to update section visibility');
    }
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

      toast.success('Content cache has been refreshed');

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
            <Button onClick={() => setIsAddingSection(true)} className="flex items-center gap-2">
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
                />
              </div>
              <div className="space-y-2">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={newSection.order}
                  onChange={e => setNewSection({ ...newSection, order: parseInt(e.target.value) })}
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
                <Button onClick={handleAddSection}>
                  Create Section
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {sections.map(section => (
            <Card key={section._id} className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 text-red-500 hover:text-red-700 hover:bg-red-100"
                onClick={() => handleDeleteSection(section._id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <SectionEditor
                section={section}
                onSave={handleSaveSection}
              />
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
} 