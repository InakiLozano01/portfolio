import { assertBlogPayloadCanBeSaved } from '@/lib/blog-payload-guard'

const BLOG_SAVE_TIMEOUT_MS = 20_000

type BlogSaveMethod = 'POST' | 'PUT'

export async function saveBlogRequest<T>(
  url: string,
  method: BlogSaveMethod,
  payload: unknown
): Promise<T> {
  if (payload && typeof payload === 'object') {
    assertBlogPayloadCanBeSaved(payload as Record<string, unknown>)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BLOG_SAVE_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const fallback = method === 'POST' ? 'Failed to create blog' : 'Failed to update blog'
      throw new Error(typeof data?.error === 'string' ? data.error : fallback)
    }

    return data as T
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Saving took too long. Refresh the blog list before trying again.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
