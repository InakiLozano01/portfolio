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
    subtitle: '',
    description: '',
    technologies: [],
    thumbnail: '',
    githubUrl: '',
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
            subtitle: draft.subtitle || '',
            description: draft.description || '',
            technologies: Array.isArray(draft.technologies) ? draft.technologies.map((id: string) => new Types.ObjectId(id)) : [],
            thumbnail: draft.thumbnail || '',
            githubUrl: draft.githubUrl || '',
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
      const method = selectedProject._id ? 'PUT' : 'POST';
      const url = selectedProject._id
        ? `/api/projects/${selectedProject._id}`
        : '/api/projects';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedProject),
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
    <div className="grid grid-cols-12 gap-6">
      {/* New/Edit Project Form */}
      <div className="col-span-12 lg:col-span-8">
        <Card className="bg-white border border-gray-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-red-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <Edit className="w-5 h-5 text-blue-600" />
              {selectedProject._id ? 'Edit Project' : 'Create New Project'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Project Title *
              </label>
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
              <label className="text-sm font-medium text-slate-700">
                Project Subtitle *
              </label>
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
              <label className="text-sm font-medium text-slate-700">
                Thumbnail Image
              </label>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
                />
                {(imagePreview || selectedProject.thumbnail) && (
                  <div className="relative aspect-video w-full max-w-md bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                GitHub URL
              </label>
              <Input
                placeholder="https://github.com/username/repository"
                value={selectedProject.githubUrl || ''}
                onChange={(e) =>
                  setSelectedProject({ ...selectedProject, githubUrl: e.target.value })
                }
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">
                Technologies Used
              </label>
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
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">
                Project Description *
              </label>
              <p className="text-xs text-slate-500">
                Provide a detailed description of the project, its features, and your role.
              </p>
              <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
                <TinyMCE
                  value={selectedProject.description || ''}
                  onChange={(content) =>
                    setSelectedProject({ ...selectedProject, description: content })
                  }
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-4 mt-6 z-10 flex flex-col sm:flex-row justify-between gap-3">
              <Button
                onClick={() => {
                  setSelectedProject({
                    title: '',
                    subtitle: '',
                    description: '',
                    technologies: [],
                    thumbnail: '',
                    githubUrl: '',
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
                disabled={!selectedProject.title || !selectedProject.subtitle || !selectedProject.description}
                className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {selectedProject._id ? 'Update Project' : 'Create Project'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="col-span-12 lg:col-span-4">
        <Card className="bg-white border border-gray-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-red-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Projects ({projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 max-h-[600px] overflow-y-auto">
            <div className="mb-2">
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-slate-300"
              />
            </div>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No projects yet</p>
                <p className="text-sm text-slate-500">Create your first project to get started</p>
              </div>
            ) : (
              projects
                .filter((p) =>
                  (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
                  (p.subtitle || '').toLowerCase().includes(search.toLowerCase())
                )
                .map((project) => {
                  const isSelected = selectedProject._id?.toString() === project._id.toString();
                  return (
                    <Card
                      key={project._id.toString()}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-slate-50'
                        }`}
                      onClick={() => {
                        setSelectedProject({
                          ...project,
                          technologies: project.technologies.map((tech) => tech._id),
                        });
                        setImagePreview(null);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-900 line-clamp-1">
                              {project.title}
                            </h3>
                            <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                              {project.subtitle}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject({
                                  ...project,
                                  technologies: project.technologies.map((tech) => tech._id),
                                });
                                setImagePreview(null);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this project?')) {
                                  handleDelete(project._id.toString());
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {project.technologies.slice(0, 3).map((tech) => {
                              const techObj = tech as { _id: Types.ObjectId; name: string };
                              return (
                                <Badge
                                  key={techObj._id.toString()}
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 bg-blue-50 text-blue-800 border-blue-200"
                                >
                                  {techObj.name}
                                </Badge>
                              );
                            })}
                            {project.technologies.length > 3 && (
                              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-slate-50">
                                +{project.technologies.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 