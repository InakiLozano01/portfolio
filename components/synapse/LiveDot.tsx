/** Coral pulse used only for something that is live right now (an ongoing role or degree). */
export default function LiveDot({ label }: { label?: string }) {
    return (
        <span className="relative inline-flex h-2 w-2" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
            <span className="absolute inset-0 animate-[synapse-pulse_2.4s_ease-in-out_infinite] rounded-full bg-signal/60" />
            <span className="relative h-2 w-2 rounded-full bg-signal" />
        </span>
    )
}

export const isOngoing = (period?: string) => /present|presente|actual|current|hoy/i.test(period || '')
