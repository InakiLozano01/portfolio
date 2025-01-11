'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { PlusCircle, Trash2 } from 'lucide-react'

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
  const [editedSection, setEditedSection] = useState(section);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContentChange = (key: string, value: any) => {
    setEditedSection(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [key]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    handleContentChange('education', newEducation);
  };

  const removeEducationEntry = (index: number) => {
    const newEducation = [...editedSection.content.education];
    newEducation.splice(index, 1);
    handleContentChange('education', newEducation);
  };

  const addExperienceEntry = () => {
    const newExperiences = [...(editedSection.content.experiences || []), {
      title: '',
      company: '',
      period: '',
      description: '',
      responsibilities: []
    }];
    handleContentChange('experiences', newExperiences);
  };

  const removeExperienceEntry = (index: number) => {
    const newExperiences = [...editedSection.content.experiences];
    newExperiences.splice(index, 1);
    handleContentChange('experiences', newExperiences);
  };

  const renderContentEditor = () => {
    switch (section.title.toLowerCase()) {
      case 'home':
        return (
          <>
            <div className="space-y-2">
              <Label>Headline</Label>
              <Input
                value={editedSection.content.headline || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange('headline', e.target.value)}
                placeholder="Enter a catchy headline"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editedSection.content.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange('description', e.target.value)}
                placeholder="Describe yourself and your work"
              />
            </div>
          </>
        );

      case 'about':
        return (
          <>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editedSection.content.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange('description', e.target.value)}
                placeholder="Tell your story"
              />
            </div>
            <div className="space-y-2">
              <Label>Highlights (one per line)</Label>
              <Textarea
                value={(editedSection.content.highlights || []).join('\n')}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange('highlights', e.target.value.split('\n').filter(Boolean))}
                placeholder="List your key achievements or highlights"
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
                    <Label>Institution</Label>
                    <Input
                      value={edu.institution}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newEducation = [...editedSection.content.education];
                        newEducation[index] = { ...edu, institution: e.target.value };
                        handleContentChange('education', newEducation);
                      }}
                      placeholder="Enter institution name"
                    />
                  </div>
                  <div>
                    <Label>Degree</Label>
                    <Input
                      value={edu.degree}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newEducation = [...editedSection.content.education];
                        newEducation[index] = { ...edu, degree: e.target.value };
                        handleContentChange('education', newEducation);
                      }}
                      placeholder="Enter degree name"
                    />
                  </div>
                  <div>
                    <Label>Period</Label>
                    <Input
                      value={edu.period}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newEducation = [...editedSection.content.education];
                        newEducation[index] = { ...edu, period: e.target.value };
                        handleContentChange('education', newEducation);
                      }}
                      placeholder="e.g., 2018 - 2022"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={edu.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const newEducation = [...editedSection.content.education];
                        newEducation[index] = { ...edu, description: e.target.value };
                        handleContentChange('education', newEducation);
                      }}
                      placeholder="Describe your studies and achievements"
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
                    <Label>Title</Label>
                    <Input
                      value={exp.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newExperiences = [...editedSection.content.experiences];
                        newExperiences[index] = { ...exp, title: e.target.value };
                        handleContentChange('experiences', newExperiences);
                      }}
                      placeholder="Enter job title"
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={exp.company}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newExperiences = [...editedSection.content.experiences];
                        newExperiences[index] = { ...exp, company: e.target.value };
                        handleContentChange('experiences', newExperiences);
                      }}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <Label>Period</Label>
                    <Input
                      value={exp.period}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newExperiences = [...editedSection.content.experiences];
                        newExperiences[index] = { ...exp, period: e.target.value };
                        handleContentChange('experiences', newExperiences);
                      }}
                      placeholder="e.g., Jan 2020 - Present"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={exp.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const newExperiences = [...editedSection.content.experiences];
                        newExperiences[index] = { ...exp, description: e.target.value };
                        handleContentChange('experiences', newExperiences);
                      }}
                      placeholder="Brief overview of your role"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Responsibilities (one per line)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-blue-500 hover:text-blue-700"
                        onClick={() => {
                          const newExperiences = [...editedSection.content.experiences];
                          newExperiences[index] = {
                            ...exp,
                            responsibilities: [...(exp.responsibilities || []), '']
                          };
                          handleContentChange('experiences', newExperiences);
                        }}
                      >
                        <PlusCircle className="w-4 h-4 mr-1" />
                        Add Responsibility
                      </Button>
                    </div>
                    {exp.responsibilities?.map((responsibility, respIndex) => (
                      <div key={respIndex} className="flex gap-2 mb-2">
                        <Input
                          value={responsibility}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newExperiences = [...editedSection.content.experiences];
                            const newResponsibilities = [...exp.responsibilities];
                            newResponsibilities[respIndex] = e.target.value;
                            newExperiences[index] = { ...exp, responsibilities: newResponsibilities };
                            handleContentChange('experiences', newExperiences);
                          }}
                          placeholder={`Responsibility ${respIndex + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 shrink-0"
                          onClick={() => {
                            const newExperiences = [...editedSection.content.experiences];
                            const newResponsibilities = [...exp.responsibilities];
                            newResponsibilities.splice(respIndex, 1);
                            newExperiences[index] = { ...exp, responsibilities: newResponsibilities };
                            handleContentChange('experiences', newExperiences);
                          }}
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
              <Label>Email</Label>
              <Input
                value={editedSection.content.email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange('email', e.target.value)}
                placeholder="Enter your email address"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={editedSection.content.city || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange('city', e.target.value)}
                placeholder="Enter your city"
              />
            </div>
            <div className="space-y-2">
              <Label>GitHub URL</Label>
              <Input
                value={editedSection.content.social?.github || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange('social', {
                  ...editedSection.content.social,
                  github: e.target.value
                })}
                placeholder="Enter your GitHub profile URL"
              />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input
                value={editedSection.content.social?.linkedin || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContentChange('social', {
                  ...editedSection.content.social,
                  linkedin: e.target.value
                })}
                placeholder="Enter your LinkedIn profile URL"
              />
            </div>
          </>
        );

      case 'blog':
        return (
          <>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editedSection.content.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange('description', e.target.value)}
                placeholder="Enter a description for your blog section"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label>Featured</Label>
              <Switch
                checked={editedSection.content.featured || false}
                onCheckedChange={checked => handleContentChange('featured', checked)}
              />
            </div>
          </>
        );

      default:
        return (
          <div className="space-y-2">
            <Label>Content (JSON)</Label>
            <Textarea
              value={JSON.stringify(editedSection.content, null, 2)}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                try {
                  handleContentChange('content', JSON.parse(e.target.value));
                } catch (error) {
                  // Invalid JSON, ignore
                }
              }}
              placeholder="Enter content in JSON format"
            />
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{section.title}</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Label>Visible</Label>
                <Switch
                  checked={editedSection.visible}
                  onCheckedChange={checked => setEditedSection(prev => ({ ...prev, visible: checked }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={editedSection.order}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedSection(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                  className="w-20"
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderContentEditor()}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} variant="outline">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
} 