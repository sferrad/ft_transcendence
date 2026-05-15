import type { ProfileOut, UserLookupOut } from "../types";

async function parseErrorDetail(response: Response): Promise<string | null> {
    try {
        const data = await response.json();
        if (data && typeof data.detail === "string") return data.detail;
    } catch {
        // ignore
    }
    return null;
}

export async function fetchMyProfile(token: string): Promise<ProfileOut> {
    const response = await fetch("/api/profile/me", {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return await response.json();
}

export async function fetchUserByUsername(username: string): Promise<UserLookupOut> {
    const response = await fetch(`/api/users/by-username/${encodeURIComponent(username)}`);
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return await response.json();
}

export async function fetchProfileByUserId(token: string, userId: number): Promise<ProfileOut> {
    const response = await fetch(`/api/profile/profiles/${encodeURIComponent(String(userId))}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return await response.json();
}

export async function updateMyAvatar(token: string, avatarUrl: string): Promise<void> {
    const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar_url: avatarUrl }),
    });

    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
}

export async function uploadMyAvatar(token: string, file: File): Promise<ProfileOut> {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch("/api/profile/me/avatar", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }

    return await response.json();
}


export async function updateMyProfile(token: string, updates: Partial<{ display_name: string; avatar_url: string | null; bio: string | null; country: string | null; language: string | null; }>): Promise<ProfileOut> {
    const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
    });

    if (response.ok == false) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }

    return await response.json();
}
