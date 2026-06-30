'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import {
  MessageCircle,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  CornerDownRight,
  Reply,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'
type CommentStatus = 'approved' | 'rejected' | 'pending'

interface PopulatedBlog {
  _id: string
  title?: string
  title_en?: string
  slug?: string
}

interface Comment {
  _id: string
  blog: PopulatedBlog | null
  alias: string
  content: string
  status: CommentStatus
  isOfficial: boolean
  parent?: string | null
  createdAt: string
}

const COMMENTS_PER_PAGE = 10

const statusBadge: Record<CommentStatus, { label: string; className: string }> = {
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100' },
}

export default function CommentsManager() {
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [replyOpen, setReplyOpen] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null)

  const fetchComments = useCallback(async () => {
    try {
      const query = filter === 'all' ? '' : `?status=${filter}`
      const response = await fetch(`/api/admin/comments${query}`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      const data = await response.json()
      setComments(Array.isArray(data) ? data : [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      })
    }
  }, [filter, toast])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  useEffect(() => {
    setCurrentPage(1)
  }, [filter, search])

  const handleStatusChange = async (id: string, status: CommentStatus) => {
    try {
      const response = await fetch(`/api/admin/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Failed to update comment')
      await fetchComments()
      toast({ title: 'Success', description: `Comment ${status}` })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete comment')
      const data = await response.json()
      await fetchComments()
      toast({
        title: 'Success',
        description: `Deleted ${data.deleted ?? 1} comment${(data.deleted ?? 1) === 1 ? '' : 's'}`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      })
    }
  }

  const confirmDelete = async () => {
    if (!commentToDelete) return
    await handleDelete(commentToDelete._id)
    setCommentToDelete(null)
  }

  const handleReplySubmit = async (comment: Comment) => {
    if (!comment.blog?._id) {
      toast({
        title: 'Error',
        description: 'Cannot reply: missing blog reference',
        variant: 'destructive',
      })
      return
    }
    const content = replyText.trim()
    if (!content) return

    setReplySubmitting(true)
    try {
      const response = await fetch('/api/admin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: comment.blog._id,
          parentId: comment._id,
          content,
        }),
      })
      if (!response.ok) throw new Error('Failed to post reply')
      setReplyText('')
      setReplyOpen(null)
      await fetchComments()
      toast({ title: 'Success', description: 'Reply posted' })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post reply',
        variant: 'destructive',
      })
    } finally {
      setReplySubmitting(false)
    }
  }

  const getFilteredComments = () => {
    let filtered = comments
    if (search) {
      const query = search.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.alias.toLowerCase().includes(query) ||
          c.content.toLowerCase().includes(query)
      )
    }
    return filtered
  }

  const filteredComments = getFilteredComments()
  const totalPages = Math.ceil(filteredComments.length / COMMENTS_PER_PAGE)
  const currentComments = filteredComments.slice(
    (currentPage - 1) * COMMENTS_PER_PAGE,
    currentPage * COMMENTS_PER_PAGE
  )

  const filterTabs: { id: FilterType; label: string; activeClass: string }[] = [
    { id: 'all', label: 'All', activeClass: 'bg-white text-slate-900 shadow-sm' },
    { id: 'pending', label: 'Pending', activeClass: 'bg-white text-amber-600 shadow-sm' },
    { id: 'approved', label: 'Approved', activeClass: 'bg-white text-green-600 shadow-sm' },
    { id: 'rejected', label: 'Rejected', activeClass: 'bg-white text-red-600 shadow-sm' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 p-4 md:p-6 bg-white rounded-lg shadow-sm border-l-4 border-[#FD4345]">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">Comments</h2>
            <p className="text-slate-500 text-sm mt-1">Moderate blog comments and reply as the author</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {filterTabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                variant="ghost"
                size="sm"
                className={`rounded-md transition-all ${filter === tab.id ? tab.activeClass : 'text-slate-500 hover:text-slate-900'}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search comments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white focus-visible:ring-[#FD4345]"
          />
        </div>
      </div>

      <div className="space-y-4">
        {currentComments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-200 shadow-sm">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No comments found</h3>
            <p className="text-slate-500 text-sm mt-1">
              {filter === 'all'
                ? 'Comments from readers will appear here.'
                : `No ${filter} comments found.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {currentComments.map((comment) => {
              const blogTitle = comment.blog?.title || comment.blog?.title_en || 'Unknown blog'
              const badge = statusBadge[comment.status]
              return (
                <Card
                  key={comment._id}
                  className={`group transition-all duration-200 border bg-white hover:border-[#FD4345]/30 ${comment.isOfficial ? 'border-l-4 border-l-[#FD4345] shadow-md' : 'border-slate-200 shadow-sm'}`}
                >
                  <CardContent className="p-4 md:p-5">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{comment.alias}</span>
                        {comment.isOfficial && (
                          <Badge className="bg-[#FD4345] hover:bg-[#ff5456] border-none text-white shadow-sm flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Author
                          </Badge>
                        )}
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                        </Badge>
                        {comment.parent && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                            <CornerDownRight className="w-3 h-3" /> Reply
                          </span>
                        )}
                        <span className="text-xs text-slate-400 truncate">on “{blogTitle}”</span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-md border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {comment.status !== 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleStatusChange(comment._id, 'approved')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                          </Button>
                        )}
                        {comment.status !== 'rejected' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => handleStatusChange(comment._id, 'rejected')}
                          >
                            <XCircle className="w-4 h-4 mr-1.5" /> Reject
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-[#FD4345] hover:bg-[#FD4345]/10"
                          onClick={() => {
                            setReplyOpen(replyOpen === comment._id ? null : comment._id)
                            setReplyText('')
                          }}
                        >
                          <Reply className="w-4 h-4 mr-1.5" /> Reply
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setCommentToDelete(comment)}
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                        </Button>
                      </div>

                      {replyOpen === comment._id && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <Textarea
                            placeholder="Write a public reply as the author..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="focus-visible:ring-[#FD4345] focus:border-[#FD4345]"
                          />
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Replies post publicly as “Iñaki Fernando Lozano” with the Author badge.
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-500 hover:text-slate-700"
                              onClick={() => {
                                setReplyOpen(null)
                                setReplyText('')
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="bg-[#FD4345] hover:bg-[#ff5456] text-white disabled:bg-slate-200 disabled:text-slate-400"
                              disabled={!replyText.trim() || replySubmitting}
                              onClick={() => handleReplySubmit(comment)}
                            >
                              {replySubmitting ? 'Posting...' : 'Post Reply'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              className={currentPage === page ? 'bg-[#FD4345] hover:bg-[#ff5456] text-white shadow-sm' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
        </div>
      )}

      <AlertDialog open={!!commentToDelete} onOpenChange={() => setCommentToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Comment
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to delete this comment? Any replies to it will also be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 text-slate-600 hover:bg-slate-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
