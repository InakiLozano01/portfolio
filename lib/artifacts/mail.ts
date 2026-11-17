// The one plain template for every artifacts email, sent through the portfolio's mail engine.
import { sendNewsletterEmail } from '@/lib/email'
import { escapeHtml } from './util'

export async function sendPlain(to: string, subject: string, paragraphs: string[], link?: { href: string; label: string }) {
  const html = `<div style="font:15px/1.5 system-ui,sans-serif;color:#111;max-width:560px">${paragraphs
    .map((p) => `<p style="white-space:pre-wrap">${escapeHtml(p)}</p>`).join('')}${
    link ? `<p><a href="${escapeHtml(link.href)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none">${escapeHtml(link.label)}</a></p><p style="font-size:12px;color:#666">${escapeHtml(link.href)}</p>` : ''
  }</div>`
  const text = [...paragraphs, ...(link ? [`${link.label}: ${link.href}`] : [])].join('\n\n')
  const ok = await sendNewsletterEmail({ to, subject, html, text })
  if (!ok) console.error('[artifacts] mail failed', subject)
  return ok
}

export const ownerAddress = () => process.env.CONTACT_MAIL_TO || process.env.CONTACT_MAIL_FROM || ''
