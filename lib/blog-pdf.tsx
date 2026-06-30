import path from 'path'
import fs from 'fs'
import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
  Font,
  renderToBuffer,
} from '@react-pdf/renderer'
import DOMPurify from 'isomorphic-dompurify'
import { parse, HTMLElement, Node, NodeType } from 'node-html-parser'

// ---------------------------------------------------------------------------
// Brand palette
// ---------------------------------------------------------------------------
const NAVY = '#1a2433'
const NAVY_DEEP = '#0a1628'
const MAROON = '#800020'
const RED = '#ef4444'
const BODY = '#1f2937'
const MUTED = '#6b7280'
const HAIRLINE = '#e5e7eb'
const LIGHT_MAROON_BG = '#faf5f6'
const CODE_BG = '#f1f5f9'
const PRE_BG = '#0f172a'
const PRE_TEXT = '#e2e8f0'
const WHITE = '#ffffff'
const WHITE_SOFT = 'rgba(255,255,255,0.82)'
const WHITE_MUTED = 'rgba(255,255,255,0.6)'

// A4 geometry (points). Content width = page width − horizontal padding.
const PAGE_PADDING_X = 50
const PAGE_HEIGHT = 841.89 // A4 portrait
const CONTENT_WIDTH = 595.28 - PAGE_PADDING_X * 2 // ≈ 495pt
// Position fixed footer from the top: react-pdf paints `fixed` + `bottom`
// elements unreliably, while `fixed` + `top` (used for the header) is solid.
const FOOTER_TOP = PAGE_HEIGHT - 40

// ---------------------------------------------------------------------------
// Fonts — prefer bundled Inter; fall back to built-in Helvetica if missing.
// ---------------------------------------------------------------------------
const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts')
const INTER_FILES = {
  regular: path.join(FONTS_DIR, 'Inter-Regular.ttf'),
  medium: path.join(FONTS_DIR, 'Inter-Medium.ttf'),
  semibold: path.join(FONTS_DIR, 'Inter-SemiBold.ttf'),
  bold: path.join(FONTS_DIR, 'Inter-Bold.ttf'),
  italic: path.join(FONTS_DIR, 'Inter-Italic.ttf'),
  boldItalic: path.join(FONTS_DIR, 'Inter-BoldItalic.ttf'),
}
const MONO_FILES = {
  regular: path.join(FONTS_DIR, 'SourceCodePro-Regular.ttf'),
  bold: path.join(FONTS_DIR, 'SourceCodePro-Bold.ttf'),
}

let FONT_FAMILY = 'Helvetica'
// 'Courier' is a PDF base-14 font (always available); upgraded to a bundled
// monospace family when the TTFs are present.
let MONO_FAMILY = 'Courier'
let fontsReady = false

function ensureFonts() {
  if (fontsReady) return
  fontsReady = true
  // Never hyphenate — react-pdf's default callback inserts bad break points.
  Font.registerHyphenationCallback((word) => [word])
  try {
    const allPresent = Object.values(INTER_FILES).every((p) => fs.existsSync(p))
    if (allPresent) {
      Font.register({
        family: 'Inter',
        fonts: [
          { src: INTER_FILES.regular, fontWeight: 400 },
          { src: INTER_FILES.medium, fontWeight: 500 },
          { src: INTER_FILES.semibold, fontWeight: 600 },
          { src: INTER_FILES.bold, fontWeight: 700 },
          { src: INTER_FILES.italic, fontWeight: 400, fontStyle: 'italic' },
          { src: INTER_FILES.boldItalic, fontWeight: 700, fontStyle: 'italic' },
        ],
      })
      FONT_FAMILY = 'Inter'
    }
  } catch {
    FONT_FAMILY = 'Helvetica'
  }
  try {
    if (Object.values(MONO_FILES).every((p) => fs.existsSync(p))) {
      Font.register({
        family: 'SourceCodePro',
        fonts: [
          { src: MONO_FILES.regular, fontWeight: 400 },
          { src: MONO_FILES.bold, fontWeight: 700 },
        ],
      })
      MONO_FAMILY = 'SourceCodePro'
    }
  } catch {
    MONO_FAMILY = 'Courier'
  }
}

// ---------------------------------------------------------------------------
// Blog field access (mirrors lib/newsletter-template.ts localizedField)
// ---------------------------------------------------------------------------
export type BlogPdfInput = {
  slug?: string
  title?: string
  subtitle?: string
  content?: string
  footer?: string
  bibliography?: string
  title_en?: string
  title_es?: string
  subtitle_en?: string
  subtitle_es?: string
  content_en?: string
  content_es?: string
  footer_en?: string
  footer_es?: string
  bibliography_en?: string
  bibliography_es?: string
  tags?: string[]
  createdAt?: Date | string
}

type Lang = 'en' | 'es'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function localized(blog: BlogPdfInput, field: string, lang: Lang): string {
  const b = blog as Record<string, unknown>
  const english = str(b[`${field}_en`]).trim() || str(b[field]).trim()
  const spanish = str(b[`${field}_es`]).trim() || english
  return lang === 'es' ? spanish || english : english || spanish
}

const UI = {
  en: { eyebrow: 'ARTICLE', author: 'Iñaki F. Lozano', readTime: (m: number) => `${m} min read`, interactive: '[ Interactive content — view online ]', mathInline: ' [formula — view online] ', references: 'References' },
  es: { eyebrow: 'ARTÍCULO', author: 'Iñaki F. Lozano', readTime: (m: number) => `${m} min de lectura`, interactive: '[ Contenido interactivo — ver en línea ]', mathInline: ' [fórmula — ver en línea] ', references: 'Referencias' },
} as const

function formatDate(value: unknown, lang: Lang): string {
  if (!value) return ''
  const d = new Date(value as string)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return ''
  }
}

function readingMinutes(html: string): number {
  const text = str(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = text ? text.split(' ').length : 0
  return Math.max(1, Math.round(words / 200))
}

// ---------------------------------------------------------------------------
// Sanitize (mirror BlogArticle config so figure/figcaption etc. survive)
// ---------------------------------------------------------------------------
function sanitize(html: string): string {
  return DOMPurify.sanitize(str(html), {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['iframe', 'figure', 'figcaption', 'video', 'source', 'math', 'mi', 'mn', 'mo', 'ms', 'mspace', 'mtext', 'semantics', 'annotation', 'annotation-xml'],
    ADD_ATTR: ['style', 'class', 'id', 'title', 'target', 'rel', 'frameborder', 'allow', 'allowfullscreen', 'controls', 'src', 'href', 'alt', 'colspan', 'rowspan', 'data-katex-display'],
    ALLOW_DATA_ATTR: true,
  })
}

// ---------------------------------------------------------------------------
// Image resolution — sharp converts any format (png/jpg/webp/gif/data-uri) to
// a PNG buffer and gives intrinsic dimensions so we can size correctly.
// Unreadable / remote-unavailable images are silently skipped.
// ---------------------------------------------------------------------------
type ResolvedImage = { data: Buffer; format: 'png'; width: number; height: number }

function imageInput(src: string): string | Buffer | null {
  if (!src) return null
  if (src.startsWith('data:')) {
    const comma = src.indexOf(',')
    if (comma === -1) return null
    const meta = src.slice(5, comma)
    const raw = src.slice(comma + 1)
    try {
      return Buffer.from(raw, /;base64/i.test(meta) ? 'base64' : 'utf8')
    } catch {
      return null
    }
  }
  let rel = src
  if (/^https?:/i.test(src)) {
    try {
      rel = new URL(src).pathname
    } catch {
      return null
    }
  }
  // Resolve against public/ and guard against traversal escaping the dir.
  const publicDir = path.join(process.cwd(), 'public')
  const abs = path.normalize(path.join(publicDir, rel.replace(/^\/+/, '')))
  if (!abs.startsWith(publicDir)) return null
  try {
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs
  } catch {
    return null
  }
  return null
}

async function resolveImage(src: string): Promise<ResolvedImage | null> {
  const input = imageInput(src)
  if (!input) return null
  try {
    const sharp = (await import('sharp')).default
    const meta = await sharp(input).metadata()
    const iw = meta.width || 0
    const ih = meta.height || 0
    if (!iw || !ih) return null
    let displayW = Math.min(CONTENT_WIDTH, iw)
    let displayH = (displayW * ih) / iw
    const MAX_H = 520
    if (displayH > MAX_H) {
      displayH = MAX_H
      displayW = (displayH * iw) / ih
    }
    const targetPx = Math.max(1, Math.round(displayW * 2)) // 2x for crispness
    const data = await sharp(input).rotate().resize({ width: targetPx, withoutEnlargement: true }).png().toBuffer()
    return { data, format: 'png', width: displayW, height: displayH }
  } catch {
    return null
  }
}

// Collect every <img> src in document order so they can be pre-resolved.
function collectImageSrcs(root: HTMLElement): string[] {
  const srcs: string[] = []
  const visit = (node: Node) => {
    if (node.nodeType === NodeType.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.tagName?.toLowerCase() === 'img') {
        const s = el.getAttribute('src')
        if (s) srcs.push(s)
      }
      el.childNodes.forEach(visit)
    }
  }
  visit(root)
  return srcs
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
function buildStyles(family: string) {
  return StyleSheet.create({
    // Cover
    cover: { backgroundColor: NAVY, paddingHorizontal: 64, paddingVertical: 80, fontFamily: family, height: '100%' },
    coverInner: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
    coverLogo: { width: 76, height: 76, borderRadius: 14, marginBottom: 30 },
    coverEyebrow: { fontSize: 11, letterSpacing: 4, color: RED, fontWeight: 600, marginBottom: 18, textAlign: 'center' },
    coverTitle: { fontSize: 28, fontWeight: 700, color: WHITE, textAlign: 'center', lineHeight: 1.25 },
    coverSubtitle: { fontSize: 14, color: WHITE_SOFT, textAlign: 'center', marginTop: 14, lineHeight: 1.5, maxWidth: 420 },
    accentRule: { flexDirection: 'row', height: 3, width: 96, marginTop: 26, marginBottom: 26, borderRadius: 2, overflow: 'hidden' },
    accentMaroon: { flexGrow: 1, backgroundColor: MAROON },
    accentRed: { flexGrow: 1, backgroundColor: RED },
    coverMeta: { fontSize: 10, color: WHITE_MUTED, textAlign: 'center', letterSpacing: 0.4 },
    coverTags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 24, maxWidth: 440 },
    coverTag: { fontSize: 8.5, color: WHITE_SOFT, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 9, marginHorizontal: 3, marginVertical: 3, letterSpacing: 0.5 },
    coverFooter: { position: 'absolute', bottom: 46, left: 64, right: 64, textAlign: 'center', fontSize: 9, color: WHITE_MUTED, letterSpacing: 1 },

    // Content page
    page: { backgroundColor: WHITE, paddingTop: 78, paddingBottom: 56, paddingHorizontal: PAGE_PADDING_X, fontFamily: family, fontSize: 11, color: BODY, lineHeight: 1.5 },
    header: { position: 'absolute', top: 28, left: PAGE_PADDING_X, right: PAGE_PADDING_X, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLogo: { width: 18, height: 18, borderRadius: 4, marginRight: 8 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerBrand: { fontSize: 9, color: NAVY, fontWeight: 600, letterSpacing: 0.5 },
    headerTitle: { fontSize: 8.5, color: MUTED, maxWidth: 280, textAlign: 'right' },
    headerRule: { position: 'absolute', top: 52, left: PAGE_PADDING_X, right: PAGE_PADDING_X, borderBottomWidth: 0.75, borderBottomColor: HAIRLINE },
    footerSite: { position: 'absolute', top: FOOTER_TOP, left: PAGE_PADDING_X, fontSize: 8.5, color: MAROON, fontWeight: 600 },
    footerPage: { position: 'absolute', top: FOOTER_TOP, left: 0, right: 0, textAlign: 'center', fontSize: 8.5, color: MUTED },

    // Block elements
    p: { fontSize: 11, color: BODY, lineHeight: 1.55, marginBottom: 10, textAlign: 'justify' },
    h1: { fontSize: 22, fontWeight: 700, color: NAVY, marginTop: 18, marginBottom: 10, lineHeight: 1.25 },
    h2: { fontSize: 17, fontWeight: 700, color: NAVY, marginTop: 16, marginBottom: 9, lineHeight: 1.3 },
    h3: { fontSize: 14, fontWeight: 700, color: NAVY, marginTop: 14, marginBottom: 7, lineHeight: 1.3 },
    h4: { fontSize: 12.5, fontWeight: 600, color: NAVY, marginTop: 12, marginBottom: 6 },
    h5: { fontSize: 11.5, fontWeight: 600, color: NAVY, marginTop: 10, marginBottom: 5 },
    h6: { fontSize: 11, fontWeight: 600, color: MUTED, marginTop: 10, marginBottom: 5, letterSpacing: 0.5 },
    listRow: { flexDirection: 'row', marginBottom: 5, paddingRight: 6 },
    listMarker: { width: 18, fontSize: 11, color: MAROON, lineHeight: 1.55 },
    listContent: { flex: 1 },
    listItemText: { fontSize: 11, color: BODY, lineHeight: 1.55 },
    blockquote: { borderLeftWidth: 3, borderLeftColor: MAROON, backgroundColor: LIGHT_MAROON_BG, paddingVertical: 8, paddingHorizontal: 14, marginVertical: 10, borderRadius: 2 },
    blockquoteText: { fontSize: 11, color: '#374151', fontStyle: 'italic', lineHeight: 1.5 },
    pre: { backgroundColor: PRE_BG, borderRadius: 6, padding: 12, marginVertical: 10 },
    preText: { fontFamily: MONO_FAMILY, fontSize: 8.5, color: PRE_TEXT, lineHeight: 1.45 },
    hr: { borderBottomWidth: 0.75, borderBottomColor: HAIRLINE, marginVertical: 14 },
    figure: { marginVertical: 10, alignItems: 'center' },
    image: { borderRadius: 4 },
    caption: { fontSize: 9, color: MUTED, fontStyle: 'italic', textAlign: 'center', marginTop: 5 },
    interactive: { fontSize: 9.5, color: MUTED, fontStyle: 'italic', backgroundColor: '#f8fafc', borderWidth: 0.75, borderColor: HAIRLINE, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 10, marginVertical: 8, textAlign: 'center' },
    mathInline: { fontSize: 9.5, color: MUTED, fontStyle: 'italic' },

    // Tables
    table: { marginVertical: 10, borderWidth: 0.75, borderColor: HAIRLINE, borderRadius: 2 },
    tr: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: HAIRLINE },
    trLast: { flexDirection: 'row' },
    th: { flex: 1, fontSize: 9.5, fontWeight: 700, color: NAVY, backgroundColor: '#f8fafc', padding: 6, borderRightWidth: 0.75, borderRightColor: HAIRLINE },
    td: { flex: 1, fontSize: 9.5, color: BODY, padding: 6, borderRightWidth: 0.75, borderRightColor: HAIRLINE },

    // Inline
    strong: { fontWeight: 700 },
    em: { fontStyle: 'italic' },
    link: { color: MAROON, textDecoration: 'underline' },
    code: { fontFamily: MONO_FAMILY, fontSize: 9.5, backgroundColor: CODE_BG, color: '#9d174d' },

    // Trailing sections
    divider: { borderBottomWidth: 0.75, borderBottomColor: HAIRLINE, marginTop: 18, marginBottom: 12 },
    sectionLabel: { fontSize: 9, fontWeight: 700, color: MAROON, letterSpacing: 1.5, marginBottom: 8 },
    biblio: { fontSize: 9.5, color: MUTED, lineHeight: 1.5 },
  })
}

// ---------------------------------------------------------------------------
// HTML → react-pdf mapping
// ---------------------------------------------------------------------------
const BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
  'pre', 'figure', 'figcaption', 'hr', 'table', 'thead', 'tbody', 'tr',
  'img', 'iframe', 'video', 'math',
])
const INTERACTIVE_TAGS = new Set(['iframe', 'video', 'audio', 'math', 'svg', 'object', 'embed'])

type Styles = ReturnType<typeof buildStyles>

class Mapper {
  styles: Styles
  images: Map<string, ResolvedImage>
  lang: Lang
  key = 0

  constructor(styles: Styles, images: Map<string, ResolvedImage>, lang: Lang) {
    this.styles = styles
    this.images = images
    this.lang = lang
  }

  nextKey(): string {
    return `n${this.key++}`
  }

  isBlock(node: Node): boolean {
    if (node.nodeType !== NodeType.ELEMENT_NODE) return false
    return BLOCK_TAGS.has((node as HTMLElement).tagName?.toLowerCase() || '')
  }

  // Inline content → string | <Text> | <Link> spans, valid inside a <Text>.
  inline(nodes: Node[], inheritItalic = false, inheritBold = false): React.ReactNode[] {
    const out: React.ReactNode[] = []
    for (const node of nodes) {
      if (node.nodeType === NodeType.TEXT_NODE) {
        const t = node.text.replace(/\s+/g, ' ')
        if (t) out.push(t)
        continue
      }
      if (node.nodeType !== NodeType.ELEMENT_NODE) continue
      const el = node as HTMLElement
      const tag = el.tagName?.toLowerCase() || ''

      // Inline interactive content (KaTeX/MathML, embeds) → compact placeholder
      // instead of flattening its duplicated MathML+HTML text.
      const cls = el.getAttribute('class') || ''
      if (INTERACTIVE_TAGS.has(tag) || /\bkatex/.test(cls)) {
        out.push(<Text key={this.nextKey()} style={this.styles.mathInline}>{UI[this.lang].mathInline}</Text>)
        continue
      }

      if (tag === 'br') {
        out.push('\n')
        continue
      }
      if (tag === 'code') {
        out.push(<Text key={this.nextKey()} style={this.styles.code}>{el.text.replace(/\s+/g, ' ')}</Text>)
        continue
      }
      if (tag === 'a') {
        const href = el.getAttribute('href') || ''
        const children = this.inline(el.childNodes, inheritItalic, inheritBold)
        if (href && /^(https?:|mailto:|#|\/)/i.test(href)) {
          out.push(<Link key={this.nextKey()} src={href} style={this.styles.link}>{children}</Link>)
        } else {
          out.push(<Text key={this.nextKey()} style={this.styles.link}>{children}</Text>)
        }
        continue
      }

      const bold = inheritBold || tag === 'strong' || tag === 'b'
      const italic = inheritItalic || tag === 'em' || tag === 'i'
      const sub = this.inline(el.childNodes, italic, bold)
      if (tag === 'strong' || tag === 'b' || tag === 'em' || tag === 'i') {
        const style = [bold ? this.styles.strong : null, italic ? this.styles.em : null].filter(Boolean) as Styles['strong'][]
        out.push(<Text key={this.nextKey()} style={style}>{sub}</Text>)
      } else {
        // span / unknown inline wrapper — pass children through
        out.push(...sub)
      }
    }
    return out
  }

  hasText(node: Node): boolean {
    return node.text.replace(/\s+/g, '').length > 0
  }

  // Render the children of a container, grouping runs of inline nodes into
  // paragraphs and emitting block nodes on their own.
  children(parent: HTMLElement): React.ReactNode[] {
    const out: React.ReactNode[] = []
    let buffer: Node[] = []
    const flush = () => {
      if (!buffer.length) return
      const spans = this.inline(buffer)
      const hasContent = buffer.some((n) => this.hasText(n) || (n.nodeType === NodeType.ELEMENT_NODE && (n as HTMLElement).tagName?.toLowerCase() === 'br'))
      if (hasContent && spans.length) {
        out.push(<Text key={this.nextKey()} style={this.styles.p}>{spans}</Text>)
      }
      buffer = []
    }
    for (const node of parent.childNodes) {
      if (this.isBlock(node)) {
        flush()
        const rendered = this.block(node as HTMLElement)
        if (rendered) out.push(rendered)
      } else {
        buffer.push(node)
      }
    }
    flush()
    return out
  }

  block(el: HTMLElement): React.ReactNode {
    const tag = el.tagName?.toLowerCase() || ''
    const s = this.styles

    if (INTERACTIVE_TAGS.has(tag)) {
      return <Text key={this.nextKey()} style={s.interactive}>{UI[this.lang].interactive}</Text>
    }

    switch (tag) {
      case 'p': {
        const spans = this.inline(el.childNodes)
        if (!spans.length) return null
        return <Text key={this.nextKey()} style={s.p}>{spans}</Text>
      }
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const style = s[tag as keyof Styles]
        return <Text key={this.nextKey()} style={style}>{this.inline(el.childNodes)}</Text>
      }
      case 'ul':
      case 'ol':
        return this.list(el, tag === 'ol')
      case 'blockquote': {
        const parts: React.ReactNode[] = []
        let buffer: Node[] = []
        const flushBuffer = () => {
          if (!buffer.length) return
          const spans = this.inline(buffer)
          if (spans.length) parts.push(<Text key={this.nextKey()} style={s.blockquoteText}>{spans}</Text>)
          buffer = []
        }
        for (const child of el.childNodes) {
          const childTag = child.nodeType === NodeType.ELEMENT_NODE ? (child as HTMLElement).tagName?.toLowerCase() : ''
          if (childTag === 'p') {
            flushBuffer()
            const spans = this.inline((child as HTMLElement).childNodes)
            if (spans.length) parts.push(<Text key={this.nextKey()} style={s.blockquoteText}>{spans}</Text>)
          } else if (this.isBlock(child)) {
            flushBuffer()
            const rendered = this.block(child as HTMLElement)
            if (rendered) parts.push(rendered)
          } else {
            buffer.push(child)
          }
        }
        flushBuffer()
        return <View key={this.nextKey()} style={s.blockquote} wrap={false}>{parts}</View>
      }
      case 'pre': {
        const code = parse(el.innerHTML).text.trim()
        return (
          <View key={this.nextKey()} style={s.pre}>
            <Text style={s.preText}>{code}</Text>
          </View>
        )
      }
      case 'figure': {
        return <View key={this.nextKey()} style={s.figure} wrap={false}>{this.children(el)}</View>
      }
      case 'figcaption':
        return <Text key={this.nextKey()} style={s.caption}>{this.inline(el.childNodes)}</Text>
      case 'img':
        return this.image(el)
      case 'hr':
        return <View key={this.nextKey()} style={s.hr} />
      case 'table':
        return this.table(el)
      case 'div':
      case 'section':
      case 'article':
      case 'header':
      case 'footer':
      case 'main':
      case 'aside':
      default: {
        const kids = this.children(el)
        if (!kids.length) return null
        return <View key={this.nextKey()}>{kids}</View>
      }
    }
  }

  list(el: HTMLElement, ordered: boolean): React.ReactNode {
    const s = this.styles
    const items = el.childNodes.filter(
      (n) => n.nodeType === NodeType.ELEMENT_NODE && (n as HTMLElement).tagName?.toLowerCase() === 'li',
    ) as HTMLElement[]
    let index = 0
    return (
      <View key={this.nextKey()}>
        {items.map((li) => {
          index += 1
          const marker = ordered ? `${index}.` : '•'
          // Split li into inline content (its own text) and nested block lists.
          const inlineKids = li.childNodes.filter((n) => !this.isBlock(n) || (n.nodeType === NodeType.ELEMENT_NODE && !['ul', 'ol'].includes((n as HTMLElement).tagName?.toLowerCase() || '')))
          const nestedLists = li.childNodes.filter((n) => n.nodeType === NodeType.ELEMENT_NODE && ['ul', 'ol'].includes((n as HTMLElement).tagName?.toLowerCase() || '')) as HTMLElement[]
          const spans = this.inline(inlineKids)
          return (
            <View key={this.nextKey()} wrap={false}>
              <View style={s.listRow}>
                <Text style={s.listMarker}>{marker}</Text>
                <View style={s.listContent}>
                  {spans.length ? <Text style={s.listItemText}>{spans}</Text> : null}
                  {nestedLists.map((nl) => (
                    <View key={this.nextKey()} style={{ marginTop: 3, marginLeft: 6 }}>{this.list(nl, nl.tagName?.toLowerCase() === 'ol')}</View>
                  ))}
                </View>
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  image(el: HTMLElement): React.ReactNode {
    const src = el.getAttribute('src') || ''
    const resolved = this.images.get(src)
    if (!resolved) return null
    const alt = el.getAttribute('alt') || ''
    // Avoid a duplicate caption when a <figcaption> already describes the image.
    const parent = el.parentNode
    const inCaptionedFigure = !!parent && parent.tagName?.toLowerCase() === 'figure' && !!parent.querySelector('figcaption')
    const showAlt = alt && !inCaptionedFigure
    return (
      <View key={this.nextKey()} style={this.styles.figure} wrap={false}>
        <Image src={{ data: resolved.data, format: 'png' }} style={[this.styles.image, { width: resolved.width, height: resolved.height }]} />
        {showAlt ? <Text style={this.styles.caption}>{alt}</Text> : null}
      </View>
    )
  }

  table(el: HTMLElement): React.ReactNode {
    const s = this.styles
    const rows: HTMLElement[] = []
    const walk = (n: Node) => {
      if (n.nodeType !== NodeType.ELEMENT_NODE) return
      const e = n as HTMLElement
      if (e.tagName?.toLowerCase() === 'tr') rows.push(e)
      else e.childNodes.forEach(walk)
    }
    el.childNodes.forEach(walk)
    if (!rows.length) return null
    return (
      <View key={this.nextKey()} style={s.table} wrap={false}>
        {rows.map((row, ri) => {
          const cells = row.childNodes.filter(
            (n) => n.nodeType === NodeType.ELEMENT_NODE && ['td', 'th'].includes((n as HTMLElement).tagName?.toLowerCase() || ''),
          ) as HTMLElement[]
          const isLast = ri === rows.length - 1
          return (
            <View key={this.nextKey()} style={isLast ? s.trLast : s.tr}>
              {cells.map((cell) => {
                const isHead = cell.tagName?.toLowerCase() === 'th'
                return (
                  <Text key={this.nextKey()} style={isHead ? s.th : s.td}>{this.inline(cell.childNodes)}</Text>
                )
              })}
            </View>
          )
        })}
      </View>
    )
  }

  render(html: string): React.ReactNode[] {
    const root = parse(html, { lowerCaseTagName: true, comment: false })
    return this.children(root)
  }
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------
function CoverPage({ styles, title, subtitle, meta, tags, lang, logo }: {
  styles: Styles
  title: string
  subtitle: string
  meta: string
  tags: string[]
  lang: Lang
  logo: string | null
}) {
  return (
    <Page size="A4" style={styles.cover}>
      <View style={styles.coverInner}>
        {logo ? <Image src={logo} style={styles.coverLogo} /> : null}
        <Text style={styles.coverEyebrow}>{UI[lang].eyebrow}</Text>
        <Text style={styles.coverTitle}>{title}</Text>
        {subtitle ? <Text style={styles.coverSubtitle}>{subtitle}</Text> : null}
        <View style={styles.accentRule}>
          <View style={styles.accentMaroon} />
          <View style={styles.accentRed} />
        </View>
        {meta ? <Text style={styles.coverMeta}>{meta}</Text> : null}
        {tags.length ? (
          <View style={styles.coverTags}>
            {tags.slice(0, 8).map((t, i) => (
              <Text key={i} style={styles.coverTag}>{t}</Text>
            ))}
          </View>
        ) : null}
      </View>
      <Text style={styles.coverFooter}>inakilozano.com</Text>
    </Page>
  )
}

function ContentPage({ styles, title, lang, logo, body }: {
  styles: Styles
  title: string
  lang: Lang
  logo: string | null
  body: React.ReactNode[]
}) {
  return (
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.header} fixed>
        <View style={styles.headerLeft}>
          {logo ? <Image src={logo} style={styles.headerLogo} /> : null}
          <Text style={styles.headerBrand}>{UI[lang].author}</Text>
        </View>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.headerRule} fixed />
      <Text style={styles.footerSite} fixed render={() => 'inakilozano.com'} />
      <Text style={styles.footerPage} fixed render={({ pageNumber }) => `${Math.max(1, pageNumber - 1)}`} />
      {body}
    </Page>
  )
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export async function renderBlogPdf(blog: BlogPdfInput, lang: Lang): Promise<Buffer> {
  ensureFonts()
  const styles = buildStyles(FONT_FAMILY)

  const title = localized(blog, 'title', lang) || str(blog.slug)
  const subtitle = localized(blog, 'subtitle', lang)
  const rawContent = localized(blog, 'content', lang)
  const rawFooter = localized(blog, 'footer', lang)
  const rawBibliography = localized(blog, 'bibliography', lang)

  const contentHtml = sanitize(rawContent)
  const footerHtml = rawFooter ? sanitize(rawFooter) : ''
  const biblioHtml = rawBibliography ? sanitize(rawBibliography) : ''

  // Pre-resolve every image referenced across all sections.
  const roots = [parse(contentHtml), footerHtml ? parse(footerHtml) : null, biblioHtml ? parse(biblioHtml) : null]
    .filter(Boolean) as HTMLElement[]
  const srcSet = new Set<string>()
  for (const r of roots) collectImageSrcs(r).forEach((s) => srcSet.add(s))
  const images = new Map<string, ResolvedImage>()
  await Promise.all(
    Array.from(srcSet).map(async (src) => {
      const r = await resolveImage(src)
      if (r) images.set(src, r)
    }),
  )

  const mapper = new Mapper(styles, images, lang)
  const contentNodes = mapper.render(contentHtml)
  const footerNodes = footerHtml ? mapper.render(footerHtml) : []
  const biblioNodes = biblioHtml ? mapper.render(biblioHtml) : []

  const body: React.ReactNode[] = [...contentNodes]
  if (footerNodes.length) {
    body.push(<View key="footer-sec" style={{ marginTop: 6 }}>{footerNodes}</View>)
  }
  if (biblioNodes.length) {
    body.push(<View key="biblio-div" style={styles.divider} />)
    body.push(<Text key="biblio-label" style={styles.sectionLabel}>{UI[lang].references}</Text>)
    body.push(<View key="biblio-sec" style={styles.biblio}>{biblioNodes}</View>)
  }

  const dateLabel = formatDate(blog.createdAt, lang)
  const metaParts = [dateLabel, UI[lang].readTime(readingMinutes(rawContent)), UI[lang].author].filter(Boolean)
  const tags = Array.isArray(blog.tags) ? blog.tags.filter((t) => typeof t === 'string' && t.trim()) : []

  // Cover logo: opaque navy square mark (copied into the runtime image via public/).
  const logoPath = path.join(process.cwd(), 'public', 'inakilozanodotcomlogo.png')
  const logo = fs.existsSync(logoPath) ? logoPath : null

  const doc = (
    <Document title={title} author={UI[lang].author} creator="inakilozano.com" producer="inakilozano.com">
      <CoverPage styles={styles} title={title} subtitle={subtitle} meta={metaParts.join('   ·   ')} tags={tags} lang={lang} logo={logo} />
      <ContentPage styles={styles} title={title} lang={lang} logo={logo} body={body} />
    </Document>
  )

  return renderToBuffer(doc)
}
