import { notFound } from 'next/navigation'
import ProjectEditor from '@/components/admin/pages/ProjectEditor'

export const metadata = { title: 'Edit project' }

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound()
  return <ProjectEditor key={id} id={id} />
}
