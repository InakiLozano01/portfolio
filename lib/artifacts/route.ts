// Host routing for the two artifacts origins; proxy.ts imports this, so it must stay free of server-only modules.
export const ORIGINS = {
  app: () => process.env.ARTIFACTS_APP_ORIGIN || 'https://artifacts.inakilozano.com',
  content: () => process.env.ARTIFACTS_CONTENT_ORIGIN || 'https://artifacts-content.inakilozano.com',
}
const hostOf = (origin: string) => new URL(origin).host

export const isAppHost = (host: string | null) => !!host && host.toLowerCase() === hostOf(ORIGINS.app())
export const isContentHost = (host: string | null) => !!host && host.toLowerCase() === hostOf(ORIGINS.content())

/** The path as the visitor requested it (set by proxy.ts), or null when the request did not come in on the expected host. */
export function originalPath(req: Request, isHost: (h: string | null) => boolean) {
  return isHost(req.headers.get('host')) ? req.headers.get('x-artifacts-path') : null
}
