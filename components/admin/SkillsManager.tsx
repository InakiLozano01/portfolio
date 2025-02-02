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
import { PlusCircle, Trash2, Plus } from 'lucide-react'
import { FaJava, FaJs, FaPhp, FaPython, FaHtml5, FaReact, FaCss3, FaBootstrap, FaNodeJs, FaGithub, FaGitlab, FaGit, FaUbuntu, FaDocker, FaAws, FaFigma, FaAngular, FaVuejs, FaRust, FaLinux, FaWindows, FaApple } from 'react-icons/fa'
import { SiTypescript, SiSpring, SiCodeigniter, SiFlask, SiMysql, SiPostgresql, SiIntellijidea, SiGooglecloud, SiGithubcopilot, SiOpenai, SiMeta, SiMongodb, SiPython, SiTensorflow, SiNextdotjs, SiTailwindcss, SiPrisma, SiSupabase, SiVercel, SiFirebase, SiRedis, SiVite, SiAstro, SiDjango, SiLaravel, SiExpress, SiNestjs, SiGraphql, SiPostman, SiJest, SiCypress, SiSelenium, SiWebpack, SiRollupdotjs, SiSwagger, SiKubernetes, SiNginx, SiApache, SiWebstorm, SiPycharm, SiPhpstorm } from 'react-icons/si'
import { VscCode } from 'react-icons/vsc'
import { cn } from '@/lib/utils'
import Image from 'next/image'

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

const CursorIcon: React.FC<IconProps> = ({ className }) => (
  <div className={className}>
    <Image
      src="/images/skills/cursor.webp"
      alt="Cursor"
      width={20}
      height={20}
      className="w-full h-full"
    />
  </div>
);

const iconMap: { [key: string]: React.ComponentType<IconProps> } = {
  FaJava, FaJs, FaPhp, FaPython, FaHtml5, FaReact, FaCss3, FaBootstrap,
  FaNodeJs, FaGithub, FaGitlab, FaGit, FaUbuntu, FaDocker, FaAws, FaFigma,
  FaAngular, FaVuejs, FaRust, FaLinux, FaWindows, FaApple,
  SiTypescript, SiSpring, SiCodeigniter, SiFlask, SiMysql, SiPostgresql,
  SiIntellijidea, SiGooglecloud, SiGithubcopilot, SiOpenai, SiMeta,
  SiMongodb, SiPython, SiTensorflow, SiNextdotjs, SiTailwindcss, SiPrisma,
  SiSupabase, SiVercel, SiFirebase, SiRedis, SiVite, SiAstro, SiDjango,
  SiLaravel, SiExpress, SiNestjs, SiGraphql, SiPostman, SiJest, SiCypress,
  SiSelenium, SiWebpack, SiRollupdotjs, SiSwagger, SiKubernetes, SiNginx,
  SiApache, SiWebstorm, SiPycharm, SiPhpstorm,
  VscCode,
  CursorIcon
}

interface Props {
  skills: Skill[];
  onSave: (skill: Skill) => Promise<void>;
}

export default function SkillsManager({ skills, onSave }: Props) {
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState<Omit<Skill, '_id'>>({
    name: '',
    category: '',
    proficiency: 0,
    yearsOfExperience: 0,
    icon: ''
  });

  const categories = Array.from(new Set([
    ...skills.map(skill => skill.category),
    ...(pendingCategory ? [pendingCategory] : [])
  ])).sort();

  const handleSave = async (skill: Skill) => {
    await onSave(skill);
    setEditingSkill(null);
  };

  const handleAddSkill = async () => {
    if (!newSkill.name || !newSkill.category || !newSkill.icon) {
      alert('Please fill in all required fields (Name, Category, and Icon)');
      return;
    }
    await onSave(newSkill as Skill);
    setIsAddingSkill(false);
    setPendingCategory(null);
    setNewSkill({
      name: '',
      category: '',
      proficiency: 0,
      yearsOfExperience: 0,
      icon: ''
    });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'proficiency' | 'yearsOfExperience', setter: Function) => {
    const value = e.target.value === '' ? 0 : parseInt(e.target.value);
    if (!isNaN(value)) {
      setter((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const handleAddCategory = () => {
    if (!newCategory) {
      alert('Please enter a category name');
      return;
    }

    const normalizedCategory = newCategory.toLowerCase();
    if (categories.includes(normalizedCategory)) {
      alert('This category already exists');
      return;
    }

    setPendingCategory(normalizedCategory);
    setNewSkill(prev => ({
      ...prev,
      category: normalizedCategory,
      name: '',
      icon: ''
    }));
    setNewCategory('');
    setIsAddingSkill(true);
  };

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-8 pr-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsAddingSkill(true)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </Button>
            <div className="flex items-center gap-2">
              <Input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="w-48 bg-white dark:bg-background"
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
                    className="bg-white dark:bg-background"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={newSkill.category}
                    onChange={e => setNewSkill(prev => ({ ...prev, category: e.target.value }))}
                    className="bg-white dark:bg-background"
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
                    value={newSkill.proficiency || ''}
                    onChange={(e) => handleNumberChange(e, 'proficiency', setNewSkill)}
                    placeholder="Proficiency percentage"
                    className="bg-white dark:bg-background"
                  />
                </div>
                <div>
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newSkill.yearsOfExperience || ''}
                    onChange={(e) => handleNumberChange(e, 'yearsOfExperience', setNewSkill)}
                    placeholder="Years of experience"
                    className="bg-white dark:bg-background"
                  />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select
                    value={newSkill.icon}
                    onChange={e => setNewSkill(prev => ({ ...prev, icon: e.target.value }))}
                    className="bg-white dark:bg-background"
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
                <Button
                  onClick={handleAddSkill}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
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
                          <div className="space-y-2">
                            <Input
                              value={editingSkill.name}
                              onChange={e => setEditingSkill({ ...editingSkill, name: e.target.value })}
                              className="bg-white dark:bg-background"
                            />
                            <Select
                              value={editingSkill.category}
                              onChange={e => setEditingSkill({ ...editingSkill, category: e.target.value })}
                              className="bg-white dark:bg-background"
                            >
                              {categories.map(category => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </Select>
                          </div>
                        ) : (
                          <div>
                            <div>{skill.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Category: {skill.category}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSkill?._id === skill._id ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={editingSkill.proficiency || ''}
                            onChange={(e) => handleNumberChange(e, 'proficiency', setEditingSkill)}
                            className="bg-white dark:bg-background"
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
                            value={editingSkill.yearsOfExperience || ''}
                            onChange={(e) => handleNumberChange(e, 'yearsOfExperience', setEditingSkill)}
                            className="bg-white dark:bg-background"
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