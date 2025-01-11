'use client'

import { useEffect, useState } from 'react'
import SectionEditor from '@/components/admin/SectionEditor'

interface Section {
  _id: string;
  title: string;
  order: number;
  visible: boolean;
  content: Record<string, any>;
}

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="p-8">Loading sections...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Manage Sections</h1>
      <div className="space-y-8">
        {sections.map(section => (
          <SectionEditor
            key={section._id}
            section={section}
            onSave={handleSaveSection}
          />
        ))}
      </div>
    </div>
  );
} 