'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Project {
  _id: string;
  title: string;
  description: string;
  technologies: string[];
  images: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured: boolean;
}

export default function ProjectsManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newProject, setNewProject] = useState<Partial<Project>>({
    title: '',
    description: '',
    technologies: [],
    images: [],
    featured: false,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProjects(data);
    } catch (err) {
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      fetchProjects();
      setNewProject({
        title: '',
        description: '',
        technologies: [],
        images: [],
        featured: false,
      });
    } catch (err) {
      setError('Failed to add project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      fetchProjects();
    } catch (err) {
      setError('Failed to delete project');
    }
  };

  const toggleFeatured = async (project: Project) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...project, featured: !project.featured }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      fetchProjects();
    } catch (err) {
      setError('Failed to update project');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newProject.title}
                onChange={(e) =>
                  setNewProject({ ...newProject, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject({ ...newProject, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="technologies">Technologies (comma-separated)</Label>
              <Input
                id="technologies"
                value={newProject.technologies?.join(', ')}
                onChange={(e) =>
                  setNewProject({
                    ...newProject,
                    technologies: e.target.value.split(',').map((t) => t.trim()),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="liveUrl">Live URL</Label>
              <Input
                id="liveUrl"
                value={newProject.liveUrl}
                onChange={(e) =>
                  setNewProject({ ...newProject, liveUrl: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="githubUrl">GitHub URL</Label>
              <Input
                id="githubUrl"
                value={newProject.githubUrl}
                onChange={(e) =>
                  setNewProject({ ...newProject, githubUrl: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="featured"
                checked={newProject.featured}
                onCheckedChange={(checked) =>
                  setNewProject({ ...newProject, featured: checked })
                }
              />
              <Label htmlFor="featured">Featured Project</Label>
            </div>
            <Button onClick={handleAddProject}>Add Project</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {projects.map((project) => (
          <Card key={project._id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{project.title}</span>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={project.featured}
                    onCheckedChange={() => toggleFeatured(project)}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteProject(project._id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <div>{project.description}</div>
                </div>
                <div>
                  <Label>Technologies</Label>
                  <div>{project.technologies.join(', ')}</div>
                </div>
                {project.liveUrl && (
                  <div>
                    <Label>Live URL</Label>
                    <div>
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {project.liveUrl}
                      </a>
                    </div>
                  </div>
                )}
                {project.githubUrl && (
                  <div>
                    <Label>GitHub URL</Label>
                    <div>
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {project.githubUrl}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 