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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TinyMCE } from '@/components/ui/tinymce'

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
  degree_es?: string;
  period: string;
  description: string;
  description_es?: string;
}

interface Experience {
  title: string;
  title_es?: string;
  company: string;
  period: string;
  description: string;
  description_es?: string;
  responsibilities: string[];
  responsibilities_es?: string[];
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
      case 'projects':
        initialContent = {
          title: initialContent.title || section.title || 'Projects',
          title_en: initialContent.title_en || initialContent.title || section.title || 'Projects',
          title_es: initialContent.title_es || initialContent.title || section.title || 'Proyectos',
          description: initialContent.description || '',
          description_en: initialContent.description_en || initialContent.description || '',
          description_es: initialContent.description_es || '',
          featured: initialContent.featured || false
        };
        break;
      case 'blog':
        initialContent = {
          title: initialContent.title || section.title || 'Blog',
          title_en: initialContent.title_en || initialContent.title || section.title || 'Blog',
          title_es: initialContent.title_es || initialContent.title || section.title || 'Blog',
          description: initialContent.description || '',
          description_en: initialContent.description_en || initialContent.description || '',
          description_es: initialContent.description_es || '',
          featured: initialContent.featured || false
        };
        break;
      case 'skills':
        initialContent = {
          title: initialContent.title || section.title || 'Skills',
          title_en: initialContent.title_en || initialContent.title || section.title || 'Skills',
          title_es: initialContent.title_es || initialContent.title || section.title || 'Habilidades',
          description: initialContent.description || '',
          description_en: initialContent.description_en || initialContent.description || '',
          description_es: initialContent.description_es || '',
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
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(
    JSON.stringify(section.content, null, 2)
  );

  const getFieldName = (base: string) => language === 'en' ? base : `${base}_es`;

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
      const sanitizedContent = sanitizeSectionContent(section.title, editedSection.content);
      const sanitizedSection = {
        ...editedSection,
        content: sanitizedContent
      };
      setEditedSection(sanitizedSection);
      await onSave(sanitizedSection);
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
    const respField = language === 'en' ? 'responsibilities' : 'responsibilities_es';
    handleContentChange(JSON.stringify({
      ...editedSection.content,
      experiences: editedSection.content.experiences?.map((item: Experience, i: number) =>
        i === expIndex ? {
          ...item,
          [respField]: ((item as any)[respField] || []).map((r: string, rIndex: number) =>
            rIndex === respIndex ? value : r
          )
        } : item
      )
    }));
  };

  const addResponsibility = (expIndex: number) => {
    const respField = language === 'en' ? 'responsibilities' : 'responsibilities_es';
    handleContentChange(JSON.stringify({
      ...editedSection.content,
      experiences: editedSection.content.experiences?.map((item: Experience, i: number) =>
        i === expIndex ? {
          ...item,
          [respField]: [...((item as any)[respField] || []), '']
        } : item
      )
    }));
  };

  const removeResponsibility = (expIndex: number, respIndex: number) => {
    const respField = language === 'en' ? 'responsibilities' : 'responsibilities_es';
    handleContentChange(JSON.stringify({
      ...editedSection.content,
      experiences: editedSection.content.experiences?.map((item: Experience, i: number) =>
        i === expIndex ? {
          ...item,
          [respField]: ((item as any)[respField] || []).filter((_: any, index: number) => index !== respIndex)
        } : item
      )
    }));
  };

  const sanitizeSectionContent = (title: string, content: Record<string, any>) => {
    if (!content) return content;
    const sanitized = JSON.parse(JSON.stringify(content));

    switch (title.toLowerCase()) {
      case 'about':
        sanitized.highlights = (sanitized.highlights || []).map((item: string) => item.trim()).filter(Boolean);
        break;
      case 'experience':
        sanitized.experiences = (sanitized.experiences || []).map((exp: Experience) => ({
          ...exp,
          responsibilities: (exp.responsibilities || []).map((resp: string) => resp.trim()).filter(Boolean)
        }));
        break;
      default:
        break;
    }

    return sanitized;
  };

  const handleJsonSave = (newContent: Record<string, any>) => {
    setEditedSection(prev => ({
      ...prev,
      content: newContent
    }));
  };

  const handleSave = async () => {
    try {
      const parsedContent = JSON.parse(editedContent);
      const sanitizedContent = sanitizeSectionContent(section.title, parsedContent);
      await onSave({
        ...section,
        content: sanitizedContent,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Invalid JSON:', error);
      alert('Invalid JSON format');
    }
  };

  const renderContentEditor = () => {
    switch (section.title.toLowerCase()) {
      case 'home':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Headline ({language.toUpperCase()})</Label>
              <Input
                value={editedSection.content[getFieldName('headline')] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  [getFieldName('headline')]: e.target.value
                }))}
                placeholder={`Enter a catchy headline (${language})`}
                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Description ({language.toUpperCase()})</Label>
              <Textarea
                value={editedSection.content[getFieldName('description')] || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  [getFieldName('description')]: e.target.value
                }))}
                placeholder={`Describe yourself and your work (${language})`}
                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
              />
            </div>
          </>
        );

      case 'about':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Description ({language.toUpperCase()})</Label>
              <Textarea
                value={editedSection.content[getFieldName('description')] || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  [getFieldName('description')]: e.target.value
                }))}
                placeholder={`Tell your story (${language})`}
                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Highlights (one per line) ({language.toUpperCase()})</Label>
              <Textarea
                value={(editedSection.content[getFieldName('highlights')] || []).join('\n')}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  [getFieldName('highlights')]: e.target.value.split('\n')
                }))}
                onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                  handleContentChange(JSON.stringify({
                    ...editedSection.content,
                    [getFieldName('highlights')]: e.target.value
                      .split('\n')
                      .map((item) => item.trim())
                      .filter(Boolean)
                  }))
                }}
                placeholder={`List your key achievements or highlights (${language})`}
                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
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
              className="flex items-center gap-2 border-slate-300 text-slate-600 hover:bg-slate-50"
              variant="outline"
            >
              <PlusCircle className="w-4 h-4" />
              Add Education
            </Button>
            {(editedSection.content.education || []).map((edu: Education, index: number) => (
              <Card key={index} className="bg-slate-50 border border-slate-200">
                <CardContent className="space-y-3 pt-4">
                  <div className="flex justify-end mb-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeEducationEntry(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-slate-700 font-semibold">Institution</Label>
                    <Input
                      value={edu.institution}
                      onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                      placeholder="Enter institution name"
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-900">Degree ({language.toUpperCase()})</Label>
                    <Input
                      value={language === 'en' ? edu.degree : (edu.degree_es || '')}
                      onChange={(e) => handleEducationChange(index, language === 'en' ? 'degree' : 'degree_es' as keyof Education, e.target.value)}
                      placeholder={`Enter degree name (${language})`}
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
                    <Label className="text-gray-900">Description ({language.toUpperCase()})</Label>
                    <Textarea
                      value={language === 'en' ? edu.description : (edu.description_es || '')}
                      onChange={(e) => handleEducationChange(index, language === 'en' ? 'description' : 'description_es' as keyof Education, e.target.value)}
                      placeholder={`Describe your studies and achievements (${language})`}
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
                    <Label className="text-gray-900">Title ({language.toUpperCase()})</Label>
                    <Input
                      value={language === 'en' ? exp.title : (exp.title_es || '')}
                      onChange={(e) => handleExperienceChange(index, language === 'en' ? 'title' : 'title_es' as keyof Experience, e.target.value)}
                      placeholder={`Enter job title (${language})`}
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
                    <Label className="text-gray-900">Description ({language.toUpperCase()})</Label>
                    <Textarea
                      value={language === 'en' ? exp.description : (exp.description_es || '')}
                      onChange={(e) => handleExperienceChange(index, language === 'en' ? 'description' : 'description_es' as keyof Experience, e.target.value)}
                      placeholder={`Brief overview of your role (${language})`}
                      className="bg-white text-black placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-900">Responsibilities (one per line) ({language.toUpperCase()})</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-blue-500 hover:text-blue-700"
                        onClick={() => addResponsibility(index)}
                      >
                        <PlusCircle className="w-4 h-4 mr-1" />
                        Add Responsibility
                      </Button>
                    </div>
                    {(language === 'en' ? exp.responsibilities : (exp.responsibilities_es || []))?.map((responsibility, respIndex) => (
                      <div key={respIndex} className="flex gap-2 mb-2">
                        <Input
                          value={responsibility}
                          onChange={(e) => handleResponsibilityChange(index, respIndex, e.target.value)}
                          placeholder={`Responsibility ${respIndex + 1} (${language})`}
                          className="bg-white text-black placeholder:text-gray-500"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 shrink-0"
                          onClick={() => removeResponsibility(index, respIndex)}
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
              <Label className="text-gray-900">City ({language.toUpperCase()})</Label>
              <Input
                value={editedSection.content[getFieldName('city')] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange(JSON.stringify({
                  ...editedSection.content,
                  [getFieldName('city')]: e.target.value
                }))}
                placeholder={`Enter your city (${language})`}
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
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 font-semibold">Title (EN)</Label>
                <Input
                  value={editedSection.content.title_en || ''}
                  onChange={(e) => handleContentChange(JSON.stringify({
                    ...editedSection.content,
                    title_en: e.target.value
                  }))}
                  placeholder="Blog"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 font-semibold">Título (ES)</Label>
                <Input
                  value={editedSection.content.title_es || ''}
                  onChange={(e) => handleContentChange(JSON.stringify({
                    ...editedSection.content,
                    title_es: e.target.value
                  }))}
                  placeholder="Blog"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 font-semibold">Description (EN)</Label>
                <Textarea
                  value={editedSection.content.description_en || editedSection.content.description || ''}
                  onChange={(e) => handleContentChange(JSON.stringify({
                    ...editedSection.content,
                    description_en: e.target.value
                  }))}
                  placeholder="Sharing insights and experiences in software development"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 font-semibold">Descripción (ES)</Label>
                <Textarea
                  value={editedSection.content.description_es || ''}
                  onChange={(e) => handleContentChange(JSON.stringify({
                    ...editedSection.content,
                    description_es: e.target.value
                  }))}
                  placeholder="Compartiendo ideas y experiencias de desarrollo"
                />
              </div>
            </div>
          </div>
        );

      case 'skills':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 font-semibold">Title (EN)</Label>
                <Input
                  value={editedSection.content.title_en || ''}
                  onChange={(e) => handleContentChange(JSON.stringify({
                    ...editedSection.content,
                    title_en: e.target.value
                  }))}
                  placeholder="Skills & Technologies"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 font-semibold">Título (ES)</Label>
                <Input
                  value={editedSection.content.title_es || ''}
                  onChange={(e) => handleContentChange(JSON.stringify({
                    ...editedSection.content,
                    title_es: e.target.value
                  }))}
                  placeholder="Habilidades y Tecnologías"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 font-semibold">Description (EN)</Label>
                <Textarea
                  value={editedSection.content.description_en || editedSection.content.description || ''}
                  onChange={(e) => handleContentChange(JSON.stringify({
                    ...editedSection.content,
                    description_en: e.target.value
                  }))}
                  placeholder="A comprehensive set of technical skills across various domains"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 font-semibold">Descripción (ES)</Label>
                <Textarea
                  value={editedSection.content.description_es || ''}
                  onChange={(e) => handleContentChange(JSON.stringify({
                    ...editedSection.content,
                    description_es: e.target.value
                  }))}
                  placeholder="Conjunto integral de habilidades técnicas en varios dominios"
                />
              </div>
            </div>
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
              className="min-h-[200px] bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-slate-700 font-semibold">Order</Label>
              <Input
                type="number"
                value={editedSection.order || 0}
                onChange={(e) => handleOrderChange(e.target.value)}
                className="w-20 border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
              />
            </div>
            <div className="flex items-center border rounded-md overflow-hidden border-slate-300">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                English
              </button>
              <div className="w-px bg-slate-300 h-full"></div>
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${language === 'es' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Español
              </button>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setJsonEditorOpen(true)}
            title="Edit JSON"
            className="border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {renderContentEditor()}
          {contentError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{contentError}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white flex justify-end pt-4 mt-6 border-t border-slate-200 z-10">
          <Button
            type="submit"
            disabled={isSubmitting || !!contentError}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-400"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <JsonEditor
        open={jsonEditorOpen}
        onOpenChange={setJsonEditorOpen}
        initialJson={editedSection.content}
        onSave={handleJsonSave}
        title={`Edit ${section.title} Content`}
      />

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Edit {section.title} Content</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <TinyMCE
              value={editedContent}
              onChange={setEditedContent}
              height={500}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
} 
