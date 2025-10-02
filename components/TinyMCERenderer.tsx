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
    if (editorRef.current) {
      editorRef.current.setContent(content || '')
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
          height: 600,
          plugins: 'lists link table image media charmap autolink code',
          skin_url: '/tinymce/skins/ui/oxide',
          content_css: '/tinymce/skins/content/default/content.min.css',
          convert_urls: false,
          relative_urls: false,
          entity_encoding: 'raw',
          forced_root_block: 'p',
          quickbars_selection_toolbar: false,
          setup: editor => {
            editorRef.current = editor
            editor.on('init', () => {
              editor.mode.set('readonly')
              const root = editor.getBody()
              if (root) {
                root.classList.add('blog-content', 'mce-content-body')
                root.setAttribute('contenteditable', 'false')
              }
            })
          }
        }}
      />
    </div>
  )
}

