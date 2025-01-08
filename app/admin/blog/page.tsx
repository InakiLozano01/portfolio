'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

interface BlogPost {
  id: number
  title: string
  content: string
  date: string
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const router = useRouter()
  const { isAuthenticated, logout } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    } else {
      // Load existing posts from localStorage
      const storedPosts = localStorage.getItem('blog_posts')
      if (storedPosts) {
        setPosts(JSON.parse(storedPosts))
      }
    }
  }, [isAuthenticated, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newPost: BlogPost = {
      id: Date.now(),
      title,
      content,
      date: new Date().toISOString(),
    }
    const updatedPosts = [newPost, ...posts]
    setPosts(updatedPosts)
    localStorage.setItem('blog_posts', JSON.stringify(updatedPosts))
    setTitle('')
    setContent('')
  }

  const handleDelete = (id: number) => {
    const updatedPosts = posts.filter(post => post.id !== id)
    setPosts(updatedPosts)
    localStorage.setItem('blog_posts', JSON.stringify(updatedPosts))
  }

  return (
    <div className="min-h-screen bg-[#263547] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Blog Management</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-[#FD4345] hover:bg-[#ff5456] rounded"
          >
            Logout
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white text-gray-900 rounded"
              required
            />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 bg-white text-gray-900 rounded h-32"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#FD4345] hover:bg-[#ff5456] rounded"
          >
            Add Post
          </button>
        </form>

        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white/10 p-4 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{post.title}</h2>
                  <p className="text-sm text-gray-400">
                    {new Date(post.date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="text-[#FD4345] hover:text-[#ff5456]"
                >
                  Delete
                </button>
              </div>
              <p className="mt-2 text-gray-300">{post.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 