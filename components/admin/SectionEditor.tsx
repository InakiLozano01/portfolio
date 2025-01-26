'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { PlusCircle, Trash2, Code } from 'lucide-react'
import JsonEditor from './JsonEditor'

interface Section {
  _id: string;
  title: string;
  order: number;
  visible: boolean;
  content: Record<string, any>;
}

interface Education {
  institution: string;
  degree: string;
  period: string;
  description: string;
}

interface Experience {
  title: string;
  company: string;
  period: string;
  description: string;
  responsibilities: string[];
}

interface SectionEditorProps {
  section: Section;
  onSave: (section: Section) => Promise<void>;
}

export default function SectionEditor({ section, onSave }: SectionEditorProps) {
  const [editedSection, setEditedSection] = useState(() => {
    // Initialize content based on section type
    let initialContent = section.content || {};
    switch (section.title.toLowerCase()) {
      case 'home':
        initialContent = {
          headline: initialContent.headline || '',
          description: initialContent.description || ''
        };
        break;
      case 'about':
        initialContent = {
          description: initialContent.description || '',
          highlights: initialContent.highlights || []
        };
        break;
      case 'education':
        initialContent = {
          education: initialContent.education || []
        };
        break;
      case 'experience':
        initialContent = {
          experiences: initialContent.experiences || []
        };
        break;
      case 'blog':
        initialContent = {
          description: initialContent.description || '',
          featured: initialContent.featured || false
        };
        break;
      case 'contact':
        initialContent = {
          email: initialContent.email || '',
          city: initialContent.city || '',
          social: {
            github: initialContent.social?.github || '',
            linkedin: initialContent.social?.linkedin || ''
          }
        };
        break;
    }
    return {
      ...section,
      content: initialContent
    };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);

  // Handle order changes outside of render
  const handleOrderChange = (value: string) => {
    const order = parseInt(value);
    if (!isNaN(order)) {
      setEditedSection(prev => ({ ...prev, order }));
    }
  };

  const handleContentChange = (value: string) => {
    try {
      const parsedContent = value.trim() ? JSON.parse(value) : {};
      setEditedSection(prev => ({
        ...prev,
        content: parsedContent
      }));
      setContentError(null);
    } catch (error) {
      setContentError('Invalid JSON format');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contentError) return;

    setIsSubmitting(true);
    try {
      await onSave(editedSection);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEducationEntry = () => {
    const newEducation = [...(editedSection.content.education || []), {
      institution: '',
      degree: '',
      period: '',
      description: ''
    }];
    handleContentChange(JSON.stringify({
      ...editedSection.content,
      education: newEducation
    }));
  };

  const removeEducationEntry = (index: number) => {
    const newEducation = [...editedSection.content.education];
    newEducation.splice(index, 1);
    handleContentChange(JSON.stringify({
      ...editedSection.content,
      education: newEducation
    }));
  };

  const addExperienceEntry = () => {
    const newExperiences = [...(editedSection.content.experiences || []), {
      title: '',
      company: '',
      period: '',
      description: '',
      responsibilities: []
    }];
    handleContentChange(JSON.stringify({
      ...editedSection.content,
      experiences: newExperiences
    }));
  };

  const removeExperienceEntry = (index: number) => {
    const newExperiences = [...editedSection.content.experiences];
    newExperiences.splice(index, 1);
    handleContentChange(JSON.stringify({
      ...editedSection.content,
      experiences: newExperiences
    }));
  };

  const handleEducationChange = (index: number, field: keyof Education, value: string) => {
    handleContentChange(JSON.stringify({
      ...editedSection.content,
      education: editedSection.content.education?.map((item: Education, i: number) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleExperienceChange = (index: number, field: keyof Experience, value: string) => {
    handleContentChange(JSON.stringify({
      ...editedSection.content,
      experiences: editedSection.content.experiences?.map((item: Experience, i: number) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleResponsibilityChange = (expIndex: number, respIndex: number, value: string) => {
    handleContentChange(JSON.stringify({
      ...editedSection.content,
      experiences: editedSection.content.experiences?.map((item: Experience, i: number) =>
        i === expIndex ? {
          ...item,
          responsibilities: item.responsibilities?.map((r: string, rIndex: number) =>
            rIndex === respIndex ? value : r
          )
        } : item
      )
    }));
  };

  const handleJsonSave = (newContent: Record<string, any>) => {
    setEditedSection(prev => ({
      ...prev,
      content: newContent
    }));
  };

  const renderContentEditor = () => {
    switch (section.title.toLowerCase()) {
      case 'home':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-gray-900">Headline</Label>
              <Input
                value={editedSection.content.headline || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  headline: e.target.value
                }))}
                placeholder="Enter a catchy headline"
                className="bg-white text-black placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900">Description</Label>
              <Textarea
                value={editedSection.content.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  description: e.target.value
                }))}
                placeholder="Describe yourself and your work"
                className="bg-white text-black placeholder:text-gray-500"
              />
            </div>
          </>
        );

      case 'about':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-gray-900">Description</Label>
              <Textarea
                value={editedSection.content.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  description: e.target.value
                }))}
                placeholder="Tell your story"
                className="bg-white text-black placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900">Highlights (one per line)</Label>
              <Textarea
                value={(editedSection.content.highlights || []).join('\n')}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  highlights: e.target.value.split('\n').filter(Boolean)
                }))}
                placeholder="List your key achievements or highlights"
                className="bg-white text-black placeholder:text-gray-500"
              />
            </div>
          </>
        );

      case 'education':
        return (
          <div className="space-y-4">
            <Button
              type="button"
              onClick={addEducationEntry}
              className="flex items-center gap-2"
              variant="outline"
            >
              <PlusCircle className="w-4 h-4" />
              Add Education
            </Button>
            {(editedSection.content.education || []).map((edu: Education, index: number) => (
              <Card key={index}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex justify-end mb-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                      onClick={() => removeEducationEntry(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-gray-900">Institution</Label>
                    <Input
                      value={edu.institution}
                      onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                      placeholder="Enter institution name"
                      className="bg-white text-black placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-900">Degree</Label>
                    <Input
                      value={edu.degree}
                      onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                      placeholder="Enter degree name"
                      className="bg-white text-black placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-900">Period</Label>
                    <Input
                      value={edu.period}
                      onChange={(e) => handleEducationChange(index, 'period', e.target.value)}
                      placeholder="e.g., 2018 - 2022"
                      className="bg-white text-black placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-900">Description</Label>
                    <Textarea
                      value={edu.description}
                      onChange={(e) => handleEducationChange(index, 'description', e.target.value)}
                      placeholder="Describe your studies and achievements"
                      className="bg-white text-black placeholder:text-gray-500"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'experience':
        return (
          <div className="space-y-4">
            <Button
              type="button"
              onClick={addExperienceEntry}
              className="flex items-center gap-2"
              variant="outline"
            >
              <PlusCircle className="w-4 h-4" />
              Add Experience
            </Button>
            {(editedSection.content.experiences || []).map((exp: Experience, index: number) => (
              <Card key={index}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex justify-end mb-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                      onClick={() => removeExperienceEntry(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-gray-900">Title</Label>
                    <Input
                      value={exp.title}
                      onChange={(e) => handleExperienceChange(index, 'title', e.target.value)}
                      placeholder="Enter job title"
                      className="bg-white text-black placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-900">Company</Label>
                    <Input
                      value={exp.company}
                      onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                      placeholder="Enter company name"
                      className="bg-white text-black placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-900">Period</Label>
                    <Input
                      value={exp.period}
                      onChange={(e) => handleExperienceChange(index, 'period', e.target.value)}
                      placeholder="e.g., Jan 2020 - Present"
                      className="bg-white text-black placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-900">Description</Label>
                    <Textarea
                      value={exp.description}
                      onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                      placeholder="Brief overview of your role"
                      className="bg-white text-black placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-900">Responsibilities (one per line)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-blue-500 hover:text-blue-700"
                        onClick={() => handleResponsibilityChange(index, 0, '')}
                      >
                        <PlusCircle className="w-4 h-4 mr-1" />
                        Add Responsibility
                      </Button>
                    </div>
                    {exp.responsibilities?.map((responsibility, respIndex) => (
                      <div key={respIndex} className="flex gap-2 mb-2">
                        <Input
                          value={responsibility}
                          onChange={(e) => handleResponsibilityChange(index, respIndex, e.target.value)}
                          placeholder={`Responsibility ${respIndex + 1}`}
                          className="bg-white text-black placeholder:text-gray-500"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 shrink-0"
                          onClick={() => handleResponsibilityChange(index, respIndex, '')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'contact':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-gray-900">Email</Label>
              <Input
                value={editedSection.content.email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  email: e.target.value
                }))}
                placeholder="Enter your email address"
                className="bg-white text-black placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900">City</Label>
              <Input
                value={editedSection.content.city || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  city: e.target.value
                }))}
                placeholder="Enter your city"
                className="bg-white text-black placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900">GitHub URL</Label>
              <Input
                value={editedSection.content.social?.github || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  social: {
                    ...editedSection.content.social,
                    github: e.target.value
                  }
                }))}
                placeholder="Enter your GitHub profile URL"
                className="bg-white text-black placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900">LinkedIn URL</Label>
              <Input
                value={editedSection.content.social?.linkedin || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  social: {
                    ...editedSection.content.social,
                    linkedin: e.target.value
                  }
                }))}
                placeholder="Enter your LinkedIn profile URL"
                className="bg-white text-black placeholder:text-gray-500"
              />
            </div>
          </>
        );

      case 'blog':
        return (
          <div className="p-4 text-center">
            <p className="text-muted-foreground">Blog management is available in the Blog tab.</p>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label className="text-gray-900">Content (JSON)</Label>
            <Textarea
              value={JSON.stringify(editedSection.content, null, 2)}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(e.target.value)}
              placeholder="Enter content in JSON format"
              className="bg-white text-black placeholder:text-gray-500"
            />
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{section.title}</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Label className="text-gray-900">Order</Label>
                <Input
                  type="number"
                  value={editedSection.order || 0}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  className="w-20 bg-white text-black placeholder:text-gray-500"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setJsonEditorOpen(true)}
                title="Edit JSON"
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderContentEditor()}
          {contentError && (
            <p className="text-sm text-red-500">{contentError}</p>
          )}
        </CardContent>
      </Card>
      <Button
        type="submit"
        disabled={isSubmitting || !!contentError}
      >
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </Button>

      <JsonEditor
        open={jsonEditorOpen}
        onOpenChange={setJsonEditorOpen}
        initialJson={editedSection.content}
        onSave={handleJsonSave}
        title={`Edit ${section.title} Content`}
      />
    </form>
  );
} 