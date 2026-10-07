/**
 * Turns a normalised payload into an update. Normalisers map empty optional fields to undefined, which an update
 * would silently drop; a field the client actually sent empty is removed instead, so clearing it sticks.
 */
export function toUpdate(data: Record<string, unknown>, sent: Record<string, unknown>) {
  const $set: Record<string, unknown> = {}
  const $unset: Record<string, ''> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) $set[key] = value
    else if (key in sent) $unset[key] = ''
  }
  return Object.keys($unset).length ? { $set, $unset } : { $set }
}
