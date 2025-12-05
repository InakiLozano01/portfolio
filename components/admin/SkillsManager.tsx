'use client'

import * as React from 'react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlusCircle, Trash2, Plus } from 'lucide-react'
import { VscCode } from 'react-icons/vsc'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import IconPicker from '@/components/admin/IconPicker'
import { iconMap, type IconProps, isCustomIconPath } from '@/components/skills/icon-registry'

interface Skill {
  _id: string;
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
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
      <div className="p-6 bg-white rounded-lg shadow-sm border-l-4 border-[#FD4345]">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Skills Management</h2>
            <p className="text-slate-500 text-sm mt-1">Add and organize your technical skills</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Button
              onClick={() => setIsAddingSkill(true)}
              className="bg-[#FD4345] hover:bg-[#ff5456] text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </Button>
            <div className="flex items-center gap-2">
              <Input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="w-48 border-slate-300 focus-visible:ring-[#FD4345] bg-white"
              />
              <Button
                onClick={handleAddCategory}
                variant="outline"
                className="flex items-center gap-2 border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-[#FD4345] hover:border-[#FD4345]"
              >
                <PlusCircle className="w-4 h-4" />
                Add Category
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isAddingSkill && (
        <Card className="bg-white shadow-md border-0 overflow-hidden">
          <CardHeader className="bg-[#263547] text-white py-4">
            <CardTitle className="text-lg font-medium">Add New Skill</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-medium mb-1.5 block">Name</Label>
                  <Input
                    value={newSkill.name}
                    onChange={e => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Skill name"
                    className="border-slate-300 focus-visible:ring-[#FD4345]"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-1.5 block">Category</Label>
                  <Select
                    value={newSkill.category}
                    onValueChange={val => setNewSkill(prev => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger className="border-slate-300 focus:ring-[#FD4345]">
                       <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-1.5 block">Proficiency (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newSkill.proficiency || ''}
                    onChange={(e) => handleNumberChange(e, 'proficiency', setNewSkill)}
                    placeholder="Proficiency percentage"
                    className="border-slate-300 focus-visible:ring-[#FD4345]"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-1.5 block">Years of Experience</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newSkill.yearsOfExperience || ''}
                    onChange={(e) => handleNumberChange(e, 'yearsOfExperience', setNewSkill)}
                    placeholder="Years of experience"
                    className="border-slate-300 focus-visible:ring-[#FD4345]"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-slate-700 font-medium mb-1.5 block">Icon</Label>
                  <IconPicker value={newSkill.icon} onChange={(val) => setNewSkill(prev => ({ ...prev, icon: val }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingSkill(false)}
                  className="border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSkill}
                  className="bg-[#FD4345] hover:bg-[#ff5456] text-white"
                >
                  Add Skill
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="w-72">
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-300 focus-visible:ring-[#FD4345]"
          />
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-28rem)] pr-4">
        <div className="space-y-6 pb-10">
          {categories.map(category => (
            <Card key={category} className="bg-white shadow-sm border border-slate-200 overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 px-4">
                <CardTitle className="capitalize text-slate-700 text-base font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#FD4345]" />
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 border-b border-slate-200 hover:bg-slate-50/50">
                      <TableHead className="w-16 text-slate-500 font-medium text-xs uppercase tracking-wider">Icon</TableHead>
                      <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider">Name</TableHead>
                      <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider">Proficiency</TableHead>
                      <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider">Years</TableHead>
                      <TableHead className="text-right text-slate-500 font-medium text-xs uppercase tracking-wider">Actions</TableHead>
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
                        <TableRow key={skill._id} className="hover:bg-slate-50 transition-colors border-slate-100">
                          <TableCell>
                            {skill.icon && (
                              isCustomIconPath(skill.icon) ? (
                                <Image src={skill.icon.startsWith('/') ? skill.icon : `/${skill.icon}`} alt={skill.name || 'Icon'} width={24} height={24} className="w-6 h-6 object-contain" />
                              ) : (
                                iconMap[skill.icon] ? React.createElement(iconMap[skill.icon], { className: 'w-6 h-6 text-slate-600' }) : <VscCode className="w-6 h-6 text-slate-600" />
                              )
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {editingSkill?._id === skill._id ? (
                                <Input
                                  value={editingSkill.name}
                                  onChange={e => setEditingSkill({ ...editingSkill, name: e.target.value })}
                                  className="h-8"
                                />
                            ) : skill.name}
                          </TableCell>
                          <TableCell>
                            {editingSkill?._id === skill._id ? (
                              <Input
                                type="number"
                                value={editingSkill.proficiency || ''}
                                onChange={(e) => handleNumberChange(e, 'proficiency', setEditingSkill)}
                                className="h-8 w-20"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#FD4345]" style={{ width: `${skill.proficiency}%` }} />
                                </div>
                                <span className="text-sm text-slate-600">{skill.proficiency}%</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600">
                             {editingSkill?._id === skill._id ? (
                              <Input
                                type="number"
                                value={editingSkill.yearsOfExperience || ''}
                                onChange={(e) => handleNumberChange(e, 'yearsOfExperience', setEditingSkill)}
                                className="h-8 w-20"
                              />
                            ) : (
                              <span className="text-sm">{skill.yearsOfExperience}y</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingSkill?._id === skill._id ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSave(editingSkill)}
                                  className="h-8 bg-[#FD4345] hover:bg-[#ff5456] text-white"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingSkill(null)}
                                  className="h-8"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingSkill(skill)}
                                className="h-8 text-slate-400 hover:text-[#FD4345] hover:bg-[#FD4345]/10"
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
