export function normalizeUUID(uuid: string): string {
  return uuid.replace(/-/g, '')
}
