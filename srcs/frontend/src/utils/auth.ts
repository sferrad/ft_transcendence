export type CurrentUser = {
  username?: string;
  email?: string;
  userId?: string;
  accessToken?: string;
};

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;

  const username = localStorage.getItem("username") || undefined;
  const email = localStorage.getItem("email") || undefined;
  const userId = localStorage.getItem("user_id") || undefined;
  const accessToken = localStorage.getItem("access_token") || undefined;

  if (!username && !email && !userId && !accessToken) return null;

  return { username, email, userId, accessToken };
}