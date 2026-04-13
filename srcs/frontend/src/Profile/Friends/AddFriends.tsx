export async function Handleadd(toUserId: number) {
    if (!toUserId || toUserId <= 0) {
        throw new Error("Invalid toUserId");
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
        throw new Error("Missing access_token");
    }

    const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to_user_id: toUserId }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.detail || `HTTP ${response.status}`);
    }

    return await response.json();
}