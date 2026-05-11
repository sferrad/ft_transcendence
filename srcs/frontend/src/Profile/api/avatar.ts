function normalizeAvatarUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('/profile/avatars/'))
    return `/api/profile/avatars/${url.slice('/profile/avatars/'.length)}`
  return url
}

export async function loadAvatarSrc(token: string, avatarUrl: string | null): Promise<string | null> {
  const normalized = normalizeAvatarUrl(avatarUrl)
  if (!normalized) return null
  if (normalized.startsWith('/api/profile/avatars/')) {
    try {
      const res = await fetch(normalized, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return null
      return URL.createObjectURL(await res.blob())
    } catch { return null }
  }
  return normalized
}
