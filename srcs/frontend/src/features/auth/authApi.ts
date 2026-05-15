const API_BASE_URL = "/api";

export const getUserInfo = async (token: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("access_token", token);
            const payload = data?.payload;
            if (payload?.username) localStorage.setItem("username", payload.username);
            if (payload?.email) localStorage.setItem("email", payload.email);
            if (payload?.sub) localStorage.setItem("user_id", String(payload.sub));
            window.dispatchEvent(new Event('auth:login'));
        }
    } catch (error) {
        console.error("An error occurred while fetching user info:", error);
    }
};

export const parseValidationError = (data: Record<string, unknown>): string => {
    if (Array.isArray(data?.detail)) {
        return (data.detail as Array<{ msg?: string }>)
            .map(err => err.msg || JSON.stringify(err))
            .join("; ");
    }
    return (data?.detail as string) || ((data?.error as Record<string, unknown>)?.message as string) || "An error occurred";
};

export const performLogin = async (identifier: string, password: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password }),
        });
        const data = await response.json();
        if (response.ok && data.access_token) {
            await getUserInfo(data.access_token);
            return true;
        }
        return false;
    } catch {
        return false;
    }
};
