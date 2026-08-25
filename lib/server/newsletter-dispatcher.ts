import { sendNewsletterEmail } from '@/lib/email'
import { buildNewsletterEmail } from '@/lib/newsletter-template'
import { withInlineNewsletterAssets } from '@/lib/server/newsletter-inline-images'

export type DispatchResult = { email: string; success: boolean; error?: string }

export type DispatchOptions = {
    /** Parallel sends (default 1 = sequential). */
    concurrency?: number
    /** Stop starting new sends after this many ms; remaining recipients are reported as deadline_exceeded. */
    deadlineMs?: number
    /** Sleep after each send (gentle pacing for picky SMTP providers). */
    paceMs?: number
}

/**
 * Single seam for sending a built newsletter to a list of recipients.
 * Every send goes through: build template -> inline assets -> send with list-unsubscribe header.
 */
export async function dispatchNewsletter(
    blog: Record<string, any>,
    recipients: Array<Record<string, any> & { email: string }>,
    { concurrency = 1, deadlineMs, paceMs }: DispatchOptions = {}
): Promise<DispatchResult[]> {
    const results: DispatchResult[] = []
    if (!recipients.length) return results

    const deadline = typeof deadlineMs === 'number' ? Date.now() + deadlineMs : undefined
    let nextIndex = 0

    async function worker() {
        while (nextIndex < recipients.length) {
            const recipient = recipients[nextIndex]
            nextIndex += 1

            if (deadline !== undefined && Date.now() > deadline) {
                results.push({ email: recipient.email, success: false, error: 'deadline_exceeded' })
                continue
            }

            const built = buildNewsletterEmail(blog, recipient)
            const { html, attachments } = await withInlineNewsletterAssets({
                html: built.html,
                attachments: built.attachments as any,
            })
            const success = await sendNewsletterEmail({
                to: recipient.email,
                subject: built.subject,
                html,
                text: built.text,
                attachments,
                listUnsubscribe: built.listUnsubscribeUrl,
            })
            results.push({ email: recipient.email, success })

            if (paceMs) await new Promise((resolve) => setTimeout(resolve, paceMs))
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(concurrency, recipients.length) }, () => worker())
    )

    return results
}
