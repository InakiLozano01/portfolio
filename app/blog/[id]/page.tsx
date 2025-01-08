'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BlogPost {
  id: number
  title: string
  content: string
  date: string
}

export default function BlogPostPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<BlogPost | null>(null)

  useEffect(() => {
    // In a real app, this would fetch from an API
    const storedPosts = localStorage.getItem('blog_posts')
    if (storedPosts) {
      const posts = JSON.parse(storedPosts)
      const foundPost = posts.find((p: BlogPost) => p.id.toString() === params.id)
      if (foundPost) {
        setPost(foundPost)
      }
    }
  }, [params.id])

  if (!post) {
    return (
      <div className="min-h-screen bg-[#263547] text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Post not found</h1>
            <Link href="/#blog" className="text-[#FD4345] hover:text-[#ff5456]">
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#263547] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <article className="prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
          <div className="text-gray-400 mb-8">
            {new Date(post.date).toLocaleDateString()}
          </div>
          <div className="whitespace-pre-wrap">{post.content}</div>
        </article>
        <div className="mt-8">
          <Link href="/#blog" className="text-[#FD4345] hover:text-[#ff5456]">
            ← Back to Blog
          </Link>
        </div>
      </div>
    </div>
  )
} 