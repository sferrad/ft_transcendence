export type CurrentUser = {
  username?: string
  email?: string
  userId?: string
}

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null

  const username = window.localStorage.getItem('username') || undefined
  const email = window.localStorage.getItem('email') || undefined
  const userId = window.localStorage.getItem('user_id') || undefined

  if (!username && !email && !userId) return null

  return { username, email, userId }
}
