'use client'

import * as React from 'react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { PlusCircle, Trash2, Plus } from 'lucide-react'
import { VscCode } from 'react-icons/vsc'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import IconPicker from '@/components/admin/IconPicker'

interface Skill {
  _id: string;
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
}

import { iconMap, type IconProps, isCustomIconPath } from '@/components/skills/icon-registry'

interface Props {
  skills: Skill[];
  onSave: (skill: Skill) => Promise<void>;
}

export default function SkillsManager({ skills, onSave }: Props) {
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
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
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow-md border-l-4 border-red-600">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Skills Management</h2>
            <p className="text-slate-600 text-sm mt-1">Add and organize your technical skills</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Button
              onClick={() => setIsAddingSkill(true)}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </Button>
            <div className="flex items-center gap-2">
              <Input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="w-48 border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 bg-white"
              />
              <Button
                onClick={handleAddCategory}
                variant="outline"
                className="flex items-center gap-2 border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <PlusCircle className="w-4 h-4" />
                Add Category
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isAddingSkill && (
        <Card className="bg-white shadow-md border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-red-600 text-white">
            <CardTitle>Add New Skill</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-semibold">Name</Label>
                  <Input
                    value={newSkill.name}
                    onChange={e => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Skill name"
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Category</Label>
                  <Select
                    value={newSkill.category}
                    onChange={e => setNewSkill(prev => ({ ...prev, category: e.target.value }))}
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Proficiency (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newSkill.proficiency || ''}
                    onChange={(e) => handleNumberChange(e, 'proficiency', setNewSkill)}
                    placeholder="Proficiency percentage"
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Years of Experience</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newSkill.yearsOfExperience || ''}
                    onChange={(e) => handleNumberChange(e, 'yearsOfExperience', setNewSkill)}
                    placeholder="Years of experience"
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-slate-700 font-semibold">Icon</Label>
                  <IconPicker value={newSkill.icon} onChange={(val) => setNewSkill(prev => ({ ...prev, icon: val }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingSkill(false)}
                  className="border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSkill}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add Skill
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="w-64">
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-300"
          />
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-26rem)] mt-4">
        <div className="space-y-6">
          {categories.map(category => (
            <Card key={category} className="bg-white shadow-md border-0">
              <CardHeader className="bg-gradient-to-r from-red-600 to-blue-600 text-white">
                <CardTitle className="capitalize">{category}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="text-slate-700 font-semibold">Icon</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Name</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Proficiency</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Years</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skills
                      .filter(skill => skill.category === category)
                      .filter(skill =>
                        (skill.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (skill.category || '').toLowerCase().includes(search.toLowerCase())
                      )
                      .map(skill => (
                        <TableRow key={skill._id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="w-12">
                            {skill.icon && (
                              isCustomIconPath(skill.icon) ? (
                                <Image src={skill.icon.startsWith('/') ? skill.icon : `/${skill.icon}`} alt={skill.name || 'Icon'} width={24} height={24} className="w-6 h-6 object-contain" />
                              ) : (
                                iconMap[skill.icon] ? React.createElement(iconMap[skill.icon], { className: 'w-6 h-6 text-blue-600' }) : <VscCode className="w-6 h-6 text-blue-600" />
                              )
                            )}
                          </TableCell>
                          <TableCell>
                            {editingSkill?._id === skill._id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingSkill.name}
                                  onChange={e => setEditingSkill({ ...editingSkill, name: e.target.value })}
                                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                                />
                                <Select
                                  value={editingSkill.category}
                                  onChange={e => setEditingSkill({ ...editingSkill, category: e.target.value })}
                                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                                >
                                  {categories.map(category => (
                                    <option key={category} value={category}>
                                      {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </option>
                                  ))}
                                </Select>
                                <IconPicker value={editingSkill.icon} onChange={(val) => setEditingSkill({ ...editingSkill, icon: val })} />
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium text-slate-900">{skill.name}</div>
                                <div className="text-sm text-slate-500">
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
                                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                              />
                            ) : (
                              <span className="font-medium text-slate-900">{skill.proficiency}%</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingSkill?._id === skill._id ? (
                              <Input
                                type="number"
                                min="0"
                                value={editingSkill.yearsOfExperience || ''}
                                onChange={(e) => handleNumberChange(e, 'yearsOfExperience', setEditingSkill)}
                                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                              />
                            ) : (
                              <span className="font-medium text-slate-900">{skill.yearsOfExperience} years</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingSkill?._id === skill._id ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSave(editingSkill)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingSkill(null)}
                                  className="border-slate-300 text-slate-600 hover:bg-slate-50"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingSkill(skill)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                Edit
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 