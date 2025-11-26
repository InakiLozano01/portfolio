'use client'

interface TinyMCERendererProps {
  html: string
}

export default function TinyMCERenderer({ html }: TinyMCERendererProps) {
  return (
    <div className="tinymce-readonly">
      <div
        className="blog-content mce-content-body min-h-[320px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

