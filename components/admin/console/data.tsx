'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { adminFetch } from '@/lib/admin-fetch'
import { Button } from './kit'

/* One way to talk to the API: errors carry the server's own message, and a 401 tells the shell the session
   ended so it can offer a sign-in without throwing away what is on screen. */

export class ApiError extends Error {
  status: number
  data: any
  constructor(message: string, status: number, data: any) {
    super(message)
    this.status = status
    this.data = data
  }
}

export const SESSION_EXPIRED = 'admin-session-expired'

export async function api<T = any>(url: string, options: { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal } = {}): Promise<T> {
  const { method = 'GET', body, form, signal } = options
  let response: Response
  try {
    response = await adminFetch(url, method === 'GET' && !signal ? undefined : {
      method,
      signal,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError('Could not reach the server. Check the connection and try again.', 0, null)
  }
  const data = await response.json().catch(() => null)
  if (response.status === 401) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EXPIRED))
    throw new ApiError('Your session ended. Sign in again to continue.', 401, data)
  }
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : typeof data?.message === 'string' ? data.message : `Request failed (${response.status})`
    throw new ApiError(message, response.status, data)
  }
  return data as T
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong')

/** Loads a URL through the short-lived admin cache, with loading, error and reload. */
export function useResource<T>(url: string | null) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: !!url })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!url) return
    let alive = true
    setState((prev) => ({ ...prev, loading: true, error: null }))
    api<T>(url)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState((prev) => ({ ...prev, error: errorMessage(error), loading: false })))
    return () => {
      alive = false
    }
  }, [url, nonce])
  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const mutate = useCallback((update: (prev: T | null) => T | null) => setState((prev) => ({ ...prev, data: update(prev.data) })), [])
  return { ...state, reload, mutate }
}

/* Confirmation: a native modal dialog (focus trap, Escape, inert page) for actions that cannot be undone. */

interface ConfirmOptions {
  title: string
  body?: React.ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
}

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false)
export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      requestAnimationFrame(() => dialogRef.current?.showModal())
    })
  }, [])

  const close = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    dialogRef.current?.close()
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault()
          close(false)
        }}
        aria-labelledby="admin-confirm-title"
        className="field-cream m-auto w-[min(440px,calc(100vw-32px))] rounded-3xl border border-line/10 p-0 text-fg backdrop:bg-navy/50 backdrop:backdrop-blur-[2px]"
      >
        {options && (
          <div className="p-6">
            <h2 id="admin-confirm-title" className="text-lg font-semibold tracking-[-0.02em]">
              {options.title}
            </h2>
            {options.body && <div className="mt-2 text-sm leading-relaxed text-fg-soft">{options.body}</div>}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)} autoFocus>
                Cancel
              </Button>
              <Button variant={options.tone === 'primary' ? 'primary' : 'danger'} onClick={() => close(true)}>
                {options.confirmLabel || 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}
