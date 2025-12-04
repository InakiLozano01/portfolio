'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TinyMCE } from '@/components/ui/tinymce';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { IProject } from '@/models/Project';
import Skill from '@/models/Skill';
import { Plus, Trash2, Save, Edit, Briefcase } from 'lucide-react';
import { Types } from 'mongoose';
import Image from 'next/image';
import { slugify } from '@/lib/utils';

interface ISkill {
  _id: Types.ObjectId;
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
}

// Extend IProject to explicitly include _id
type ProjectWithId = IProject & {
  _id: Types.ObjectId;
};

type ProjectWithTechnologies = ProjectWithId & {
  technologies: ISkill[];
};

export default function ProjectsManager() {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectWithTechnologies[]>([]);
  const [skills, setSkills] = useState<ISkill[]>([]);
  const [selectedProject, setSelectedProject] = useState<Partial<ProjectWithId> & { technologies: Types.ObjectId[] }>({
    title: '',
    title_es: '',
    subtitle_en: '',
    subtitle: '',
    subtitle_es: '',
    description: '',
    description_en: '',
    description_es: '',
    technologies: [],
    thumbnail: '',
    githubUrl: '',
    publicUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: string; subtitle?: string }>({});
  const [search, setSearch] = useState('');
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, skillsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/skills'),
        ]);

        if (!projectsRes.ok || !skillsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [projectsData, skillsData] = await Promise.all([
          projectsRes.json(),
          skillsRes.json(),
        ]);

        setProjects(projectsData);
        setSkills(skillsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Rehydrate draft if present
  useEffect(() => {
    try {
      const raw = localStorage.getItem('projectDraft');
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft === 'object') {
          setSelectedProject({
            title: draft.title || '',
            title_es: draft.title_es || '',
            subtitle_en: draft.subtitle_en || draft.subtitle || '',
            subtitle: draft.subtitle || '',
            subtitle_es: draft.subtitle_es || '',
            description_en: draft.description_en || draft.description || '',
            description: draft.description || '',
            description_es: draft.description_es || '',
            technologies: Array.isArray(draft.technologies) ? draft.technologies.map((id: string) => new Types.ObjectId(id)) : [],
            thumbnail: draft.thumbnail || '',
            githubUrl: draft.githubUrl || '',
            publicUrl: draft.publicUrl || '',
            _id: draft._id ? new Types.ObjectId(draft._id) : undefined,
          });
        }
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave draft
  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      try {
        const toSave = {
          ...selectedProject,
          technologies: selectedProject.technologies.map((id) => id.toString()),
        };
        localStorage.setItem('projectDraft', JSON.stringify(toSave));
      } catch { }
    }, 600);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [selectedProject]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type before uploading
      const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!supportedTypes.includes(file.type)) {
        toast({
          title: 'Unsupported File Format',
          description: 'Please upload a JPEG, PNG, WebP, or GIF image.',
          variant: 'destructive',
        });
        e.target.value = '';
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      // Try uploading the file
      const formData = new FormData();
      formData.append('file', file);

      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.message || 'Failed to upload image');
        }

        // If upload successful, set the image file and preview
        setImageFile(file);
        setImagePreview(previewUrl);
        const imageData = await uploadResponse.json();
        setSelectedProject(prev => ({ ...prev, thumbnail: imageData.path }));
      } catch (error) {
        // Clean up the preview URL
        URL.revokeObjectURL(previewUrl);

        // Show error message
        toast({
          title: 'Upload Failed',
          description: error instanceof Error ? error.message : 'Failed to upload image. Please try again.',
          variant: 'destructive',
        });

        // Reset the input
        e.target.value = '';
      }
    }
  };

  const validate = () => {
    const next: { title?: string; subtitle?: string } = {};
    if (!selectedProject.title || selectedProject.title.trim().length < 3) {
      next.title = 'Title is required (min 3 chars)';
    }
    if (!selectedProject.subtitle || selectedProject.subtitle.trim().length < 3) {
      next.subtitle = 'Subtitle is required (min 3 chars)';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      const normalized = {
        ...selectedProject,
        title_en: selectedProject.title || selectedProject.title_en || '',
        title: selectedProject.title || selectedProject.title_en || '',
        subtitle_en: selectedProject.subtitle_en || selectedProject.subtitle || '',
        subtitle: selectedProject.subtitle || selectedProject.subtitle_en || '',
        description_en: selectedProject.description_en || selectedProject.description || '',
        description: selectedProject.description_en || selectedProject.description || '',
        publicUrl: selectedProject.publicUrl || '',
      };
      const method = selectedProject._id ? 'PUT' : 'POST';
      const url = selectedProject._id
        ? `/api/projects/${selectedProject._id}`
        : '/api/projects';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalized),
      });

      if (!response.ok) throw new Error('Failed to save project');

      const savedProject = await response.json();

      if (method === 'POST') {
        setProjects([...projects, savedProject]);
      } else {
        setProjects(
          projects.map((p) =>
            p._id === savedProject._id ? savedProject : p
          )
        );
      }

      // Reset form
      setSelectedProject({
        title: '',
        subtitle: '',
        description: '',
        technologies: [],
        thumbnail: '',
        githubUrl: '',
        publicUrl: '',
      });
      setImageFile(null);
      setImagePreview(null);

      const projectSlug = slugify(savedProject.title || selectedProject.title || '');
      toast({
        title: 'Success',
        description: `Project ${method === 'POST' ? 'created' : 'updated'} successfully. View: /projects/${projectSlug}`,
      });

      router.refresh();
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save project',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    const userInput = prompt('Type DELETE to confirm project removal')
    if (!userInput || userInput.trim().toUpperCase() !== 'DELETE') {
      return
    }
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete project');

      setProjects(projects.filter((p) => p._id.toString() !== id));

      if (selectedProject._id?.toString() === id) {
        setSelectedProject({
          title: '',
          subtitle: '',
          description: '',
          technologies: [],
          thumbnail: '',
          githubUrl: '',
          publicUrl: '',
        });
      }

      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });

      router.refresh();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    }
  };

  const handleTechnologyToggle = (techId: string) => {
    const objectId = new Types.ObjectId(techId);
    const newTechnologies = selectedProject.technologies.some(
      (id) => id.toString() === techId
    )
      ? selectedProject.technologies.filter((id) => id.toString() !== techId)
      : [...selectedProject.technologies, objectId];

    setSelectedProject({
      ...selectedProject,
      technologies: newTechnologies,
    });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Horizontal project rail */}
      <Card className="bg-gradient-to-r from-emerald-50 to-lime-50 border border-emerald-200 shadow-sm">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r border-emerald-200">
              <Briefcase className="w-5 h-5 text-emerald-700" />
              <span className="text-sm font-semibold text-emerald-800">Projects ({projects.length})</span>
            </div>
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 max-w-full h-9 border-emerald-200 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-3 min-w-fit">
                {projects
                  .filter((p) =>
                    (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
                    (p.subtitle || '').toLowerCase().includes(search.toLowerCase())
                  )
                  .map((project) => {
                    const isSelected = selectedProject._id?.toString() === project._id.toString();
                    return (
                      <div
                        key={project._id.toString()}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition shadow-sm ${isSelected
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white text-slate-800 border-emerald-100 hover:border-emerald-300'
                          }`}
                      >
                        <button
                          className="flex-1 text-left"
                          onClick={() => {
            setSelectedProject({
              ...project,
              title_es: project.title_es || '',
              subtitle_en: project.subtitle_en || project.subtitle || '',
              subtitle_es: project.subtitle_es || '',
              description_en: project.description_en || project.description || '',
              description_es: project.description_es || '',
              publicUrl: project.publicUrl || '',
              technologies: project.technologies.map((tech) => tech._id),
            });
            setImagePreview(null);
          }}
        >
                          <div className="font-semibold line-clamp-1">{project.title}</div>
                          <div className="text-xs opacity-80 line-clamp-1">{project.subtitle}</div>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${isSelected ? 'text-white hover:bg-white/10' : 'text-emerald-700 hover:bg-emerald-50'}`}
                          onClick={() => {
                            handleDelete(project._id.toString());
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                {projects.length === 0 && (
                  <span className="text-sm text-emerald-800">No projects yet</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editing canvas */}
      <Card className="bg-white border border-gray-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-red-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
            <Edit className="w-5 h-5 text-blue-600" />
            {selectedProject._id ? 'Edit Project' : 'Create New Project'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Two-column language fields */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-semibold bg-slate-100 rounded text-slate-700">English</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Project Title *</label>
                <Input
                  placeholder="Enter project title"
                  value={selectedProject.title || ''}
                  onChange={(e) =>
                    setSelectedProject({ ...selectedProject, title: e.target.value })
                  }
                  className={errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Project Subtitle *</label>
                <Input
                  placeholder="Brief description or tagline"
                  value={selectedProject.subtitle || ''}
                  onChange={(e) =>
                    setSelectedProject({ ...selectedProject, subtitle: e.target.value })
                  }
                  className={errors.subtitle ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {errors.subtitle && <p className="text-xs text-red-600">{errors.subtitle}</p>}
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Description (EN)</label>
                <TinyMCE
                  value={selectedProject.description_en || selectedProject.description || ''}
                  onChange={(content) =>
                    setSelectedProject({ ...selectedProject, description_en: content, description: content })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-semibold bg-slate-100 rounded text-slate-700">Español</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Título (ES)</label>
                <Input
                  placeholder="Título del proyecto"
                  value={selectedProject.title_es || ''}
                  onChange={(e) =>
                    setSelectedProject({ ...selectedProject, title_es: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Subtítulo (ES)</label>
                <Input
                  placeholder="Descripción breve"
                  value={selectedProject.subtitle_es || ''}
                  onChange={(e) =>
                    setSelectedProject({ ...selectedProject, subtitle_es: e.target.value })
                  }
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Descripción (ES)</label>
                <TinyMCE
                  value={selectedProject.description_es || ''}
                  onChange={(content) =>
                    setSelectedProject({ ...selectedProject, description_es: content })
                  }
                />
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">GitHub URL</label>
              <Input
                placeholder="https://github.com/username/repository"
                value={selectedProject.githubUrl || ''}
                onChange={(e) =>
                  setSelectedProject({ ...selectedProject, githubUrl: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Public URL (optional)</label>
              <Input
                placeholder="https://your-live-site.com"
                value={selectedProject.publicUrl || ''}
                onChange={(e) =>
                  setSelectedProject({ ...selectedProject, publicUrl: e.target.value })
                }
              />
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-3">
            <label className="text-sm font-medium text-slate-700">Thumbnail Image</label>
            <div className="space-y-3">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
              />
              {(imagePreview || selectedProject.thumbnail) && (
                <div className="relative aspect-video w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <Image
                    src={imagePreview || selectedProject.thumbnail || ''}
                    alt="Project thumbnail preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Technologies Used</label>
            <p className="text-xs text-slate-500">
              Select all technologies used in this project. Click to toggle selection.
            </p>
            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
              {skills.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  No skills available. Please add skills first.
                </p>
              ) : (
                skills.map((skill) => {
                  const isSelected = selectedProject.technologies.some(
                    (id) => id.toString() === skill._id.toString()
                  );
                  return (
                    <Badge
                      key={skill._id.toString()}
                      className={`cursor-pointer transition-all duration-200 hover:scale-105 border ${isSelected
                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-blue-400'
                        }`}
                      onClick={() => handleTechnologyToggle(skill._id.toString())}
                    >
                      {skill.name}
                      {isSelected && <span className="ml-1">✓</span>}
                    </Badge>
                  );
                })
              )}
            </div>
            {selectedProject.technologies.length > 0 && (
              <p className="text-xs text-blue-600">
                {selectedProject.technologies.length} technology(ies) selected
              </p>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-4 mt-6 z-10 flex flex-col sm:flex-row justify-between gap-3">
            <Button
              onClick={() => {
                setSelectedProject({
                  title: '',
                  title_es: '',
                  subtitle_en: '',
                  subtitle: '',
                  subtitle_es: '',
              description: '',
              description_en: '',
              description_es: '',
              technologies: [],
              thumbnail: '',
              githubUrl: '',
              publicUrl: '',
            });
            setImageFile(null);
            setImagePreview(null);
          }}
              variant="outline"
              className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear Form
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedProject.title || !selectedProject.subtitle || !selectedProject.description_en}
              className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {selectedProject._id ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
