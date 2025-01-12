'use client'

import * as React from 'react'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { PlusCircle, Trash2 } from 'lucide-react'
import { FaJava, FaJs, FaPhp, FaPython, FaHtml5, FaReact, FaCss3, FaBootstrap, FaNodeJs, FaGithub, FaGitlab, FaGit, FaUbuntu, FaDocker, FaAws } from 'react-icons/fa'
import { SiTypescript, SiSpring, SiCodeigniter, SiFlask, SiMysql, SiPostgresql, SiIntellijidea, SiGooglecloud, SiGithubcopilot, SiOpenai, SiMeta, SiMongodb, SiPython, SiTensorflow } from 'react-icons/si'
import { VscCode } from 'react-icons/vsc'

interface Skill {
  _id: string;
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
}

interface IconProps {
  className?: string;
}

const iconMap: { [key: string]: React.ComponentType<IconProps> } = {
  FaJava, FaJs, FaPhp, FaPython, FaHtml5, FaReact, FaCss3, FaBootstrap, 
  FaNodeJs, FaGithub, FaGitlab, FaGit, FaUbuntu, FaDocker, FaAws,
  SiTypescript, SiSpring, SiCodeigniter, SiFlask, SiMysql, SiPostgresql, 
  SiIntellijidea, SiGooglecloud, SiGithubcopilot, SiOpenai, SiMeta,
  SiMongodb, SiPython, SiTensorflow, VscCode
}

interface Props {
  skills: Skill[];
  onSave: (skill: Skill) => Promise<void>;
}

export default function SkillsManager({ skills, onSave }: Props) {
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newSkill, setNewSkill] = useState<Omit<Skill, '_id'>>({
    name: '',
    category: '',
    proficiency: 0,
    yearsOfExperience: 0,
    icon: ''
  });

  const categories = Array.from(new Set(skills.map(skill => skill.category))).sort();

  const handleSave = async (skill: Skill) => {
    await onSave(skill);
    setEditingSkill(null);
  };

  const handleAddSkill = async () => {
    if (!newSkill.category) {
      newSkill.category = categories[0];
    }
    await onSave(newSkill as Skill);
    setIsAddingSkill(false);
    setNewSkill({
      name: '',
      category: '',
      proficiency: 0,
      yearsOfExperience: 0,
      icon: ''
    });
  };

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setNewSkill(prev => ({ ...prev, category: newCategory }));
      setNewCategory('');
      setIsAddingSkill(true);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-8 pr-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsAddingSkill(true)}
              className="flex items-center gap-2"
              variant="outline"
            >
              <PlusCircle className="w-4 h-4" />
              Add Skill
            </Button>
            <div className="flex items-center gap-2">
              <Input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="w-48"
              />
              <Button
                onClick={handleAddCategory}
                variant="outline"
                className="flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Add Category
              </Button>
            </div>
          </div>
        </div>

        {isAddingSkill && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newSkill.name}
                    onChange={e => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Skill name"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={newSkill.category}
                    onChange={e => setNewSkill(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Proficiency (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newSkill.proficiency}
                    onChange={e => setNewSkill(prev => ({ ...prev, proficiency: parseInt(e.target.value) }))}
                    placeholder="Proficiency percentage"
                  />
                </div>
                <div>
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newSkill.yearsOfExperience}
                    onChange={e => setNewSkill(prev => ({ ...prev, yearsOfExperience: parseInt(e.target.value) }))}
                    placeholder="Years of experience"
                  />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select
                    value={newSkill.icon}
                    onChange={e => setNewSkill(prev => ({ ...prev, icon: e.target.value }))}
                  >
                    <option value="">Select icon</option>
                    {Object.keys(iconMap).map(icon => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </Select>
                  {newSkill.icon && iconMap[newSkill.icon] && (
                    <div className="mt-2 flex items-center gap-2">
                      <span>Preview:</span>
                      {React.createElement(iconMap[newSkill.icon], {
                        className: "w-5 h-5 text-foreground"
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingSkill(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSkill}>
                  Add Skill
                </Button>
              </div>
            </div>
          </Card>
        )}

        {categories.map(category => (
          <Card key={category} className="p-6">
            <h3 className="text-lg font-semibold mb-4">{category}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Proficiency</TableHead>
                  <TableHead>Years</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills
                  .filter(skill => skill.category === category)
                  .map(skill => (
                    <TableRow key={skill._id}>
                      <TableCell className="w-10">
                        {skill.icon && iconMap[skill.icon] && 
                          React.createElement(iconMap[skill.icon], {
                            className: "w-5 h-5 text-foreground"
                          })
                        }
                      </TableCell>
                      <TableCell>
                        {editingSkill?._id === skill._id ? (
                          <Input
                            value={editingSkill.name}
                            onChange={e => setEditingSkill({ ...editingSkill, name: e.target.value })}
                          />
                        ) : (
                          skill.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSkill?._id === skill._id ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={editingSkill.proficiency}
                            onChange={e => setEditingSkill({ ...editingSkill, proficiency: parseInt(e.target.value) })}
                          />
                        ) : (
                          `${skill.proficiency}%`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSkill?._id === skill._id ? (
                          <Input
                            type="number"
                            min="0"
                            value={editingSkill.yearsOfExperience}
                            onChange={e => setEditingSkill({ ...editingSkill, yearsOfExperience: parseInt(e.target.value) })}
                          />
                        ) : (
                          `${skill.yearsOfExperience} years`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSkill?._id === skill._id ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSave(editingSkill)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingSkill(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setEditingSkill(skill)}>
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
} 