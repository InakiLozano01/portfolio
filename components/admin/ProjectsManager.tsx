'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TinyMCE } from '@/components/ui/tinymce';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { IProject } from '@/models/Project';
import Skill from '@/models/Skill';
import { Plus, Trash2, Save, Edit } from 'lucide-react';
import { Types } from 'mongoose';

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

  const handleSave = async () => {
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

      setSelectedProject({
        title: '',
        subtitle: '',
        description: '',
        technologies: [],
        thumbnail: '',
        githubUrl: '',
      });

      toast({
        title: 'Success',
        description: `Project ${method === 'POST' ? 'created' : 'updated'} successfully`,
      });

      router.refresh();
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: 'Failed to save project',
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
      <div className="col-span-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedProject._id ? 'Edit Project' : 'New Project'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Title"
              value={selectedProject.title || ''}
              onChange={(e) =>
                setSelectedProject({ ...selectedProject, title: e.target.value })
              }
              className="bg-white text-gray-900 placeholder:text-gray-500"
            />
            <Input
              placeholder="Subtitle"
              value={selectedProject.subtitle || ''}
              onChange={(e) =>
                setSelectedProject({ ...selectedProject, subtitle: e.target.value })
              }
              className="bg-white text-gray-900 placeholder:text-gray-500"
            />
            <Input
              placeholder="Thumbnail URL"
              value={selectedProject.thumbnail || ''}
              onChange={(e) =>
                setSelectedProject({ ...selectedProject, thumbnail: e.target.value })
              }
              className="bg-white text-gray-900 placeholder:text-gray-500"
            />
            <Input
              placeholder="GitHub URL"
              value={selectedProject.githubUrl || ''}
              onChange={(e) =>
                setSelectedProject({ ...selectedProject, githubUrl: e.target.value })
              }
              className="bg-white text-gray-900 placeholder:text-gray-500"
            />
            <div>
              <h4 className="mb-2 font-medium">Technologies</h4>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge
                    key={skill._id.toString()}
                    variant={
                      selectedProject.technologies.some(
                        (id) => id.toString() === skill._id.toString()
                      )
                        ? 'default'
                        : 'secondary'
                    }
                    className="cursor-pointer"
                    onClick={() => handleTechnologyToggle(skill._id.toString())}
                  >
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 font-medium">Description</h4>
              <TinyMCE
                value={selectedProject.description || ''}
                onChange={(content) =>
                  setSelectedProject({ ...selectedProject, description: content })
                }
              />
            </div>
            <div className="flex justify-end space-x-2">
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
                }}
                variant="outline"
              >
                Clear
              </Button>
              <Button
                onClick={handleSave}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {selectedProject._id ? 'Update Project' : 'Create Project'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="col-span-4">
        <Card>
          <CardHeader>
            <CardTitle>Projects List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.map((project) => (
              <Card
                key={project._id.toString()}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setSelectedProject({
                    ...project,
                    technologies: project.technologies.map((tech) => tech._id),
                  });
                }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{project.title}</h3>
                      <p className="text-sm text-gray-500">{project.subtitle}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject({
                            ...project,
                            technologies: project.technologies.map((tech) => tech._id),
                          });
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project._id.toString());
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {project.technologies.map((tech: ISkill) => (
                      <Badge
                        key={tech._id.toString()}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tech.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 