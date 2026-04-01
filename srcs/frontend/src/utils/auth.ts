export type CurrentUser = {
  username?: string;
  email?: string;
  user_id?: string;
  access_token?: string;
};

export function getCurrentUser(): CurrentUser | null {
  // Conventions utilisées dans le frontend (voir `src/log/useAuth.tsx`).
  const username = localStorage.getItem("username") || undefined;
  const email = localStorage.getItem("email") || undefined;
  const user_id = localStorage.getItem("user_id") || undefined;
  const access_token = localStorage.getItem("access_token") || undefined;

  if (!username && !email && !user_id && !access_token) return null;
  return { username, email, user_id, access_token };
}
