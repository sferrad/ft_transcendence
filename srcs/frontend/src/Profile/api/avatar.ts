function normalizeAvatarUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('/profile/avatars/'))
    return `/api/profile/avatars/${url.slice('/profile/avatars/'.length)}`
  return url
}

// Module-level cache: normalized URL → blob URL
// Avoids re-fetching and re-creating blob URLs on component remounts,
// which would otherwise cause the avatar to flash to default briefly.
const _blobCache = new Map<string, string>()

export async function loadAvatarSrc(token: string, avatarUrl: string | null): Promise<string | null> {
  const normalized = normalizeAvatarUrl(avatarUrl)
  if (!normalized) return null
  if (normalized.startsWith('/api/profile/avatars/')) {
    const cached = _blobCache.get(normalized)
    if (cached) return cached
    try {
      const res = await fetch(normalized, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return null
      const blobUrl = URL.createObjectURL(await res.blob())
      _blobCache.set(normalized, blobUrl)
      return blobUrl
    } catch { return null }
  }
  return normalized
}

export function invalidateAvatarCache(avatarUrl: string | null): void {
  const normalized = normalizeAvatarUrl(avatarUrl)
  if (!normalized) return
  const cached = _blobCache.get(normalized)
  if (cached) {
    URL.revokeObjectURL(cached)
    _blobCache.delete(normalized)
  }
}
