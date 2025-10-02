'use client'

import { Editor } from '@tinymce/tinymce-react'
import { useEffect, useMemo, useRef } from 'react'
import type { Editor as TinyMCEEditor } from 'tinymce'

interface TinyMCERendererProps {
  html: string
}

export default function TinyMCERenderer({ html }: TinyMCERendererProps) {
  const content = useMemo(() => html, [html])
  const editorRef = useRef<TinyMCEEditor | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !editor.initialized) {
      return
    }
    const currentContent = editor.getContent({ format: 'raw' })
    if (currentContent !== content) {
      editor.setContent(content || '', { format: 'raw' })
    }
  }, [content])

  return (
    <div className="tinymce-readonly">
      <Editor
        key={content}
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        initialValue={content}
        disabled
        init={{
          inline: false,
          menubar: false,
          toolbar: false,
          statusbar: false,
          promotion: false,
          branding: false,
          autoresize_bottom_margin: 32,
          autoresize_overflow_padding: 24,
          autoresize_min_height: 320,
          plugins: 'lists link table image media charmap autolink autoresize code',
          skin_url: '/tinymce/skins/ui/oxide',
          content_css: '/tinymce/skins/content/default/content.min.css',
          convert_urls: false,
          relative_urls: false,
          entity_encoding: 'raw',
          forced_root_block: 'p',
          quickbars_selection_toolbar: false,
          setup: editor => {
            editor.on('init', () => {
              editorRef.current = editor
              editor.mode.set('readonly')
              const root = editor.getBody()
              if (root) {
                root.classList.add('blog-content', 'mce-content-body')
                root.setAttribute('contenteditable', 'false')
              }
              if (content) {
                editor.setContent(content, { format: 'raw' })
              }
              editor.execCommand('mceAutoResize')
            })
            editor.on('remove', () => {
              if (editorRef.current === editor) {
                editorRef.current = null
              }
            })
          }
        }}
      />
    </div>
  )
}

