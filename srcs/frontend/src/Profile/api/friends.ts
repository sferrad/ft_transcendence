import type { FriendOut, FriendRequestOut, FriendswithStatusOut, PresencePingOut, ProfileOut } from "../types";

async function parseErrorDetail(response: Response): Promise<string | null> {
    try {
        const data = await response.json();
        if (data && typeof data.detail === "string") return data.detail;
    } catch {
        // ignore
    }
    return null;
}

export async function getFriendsList(token: string): Promise<FriendOut[]> {
    // api-gateway proxies /friends/{path} -> friends-service
    // friends-service route is GET /friends, so gateway path is /friends/friends
    const response = await fetch("/api/friends/friends", {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return await response.json();
}

export async function fetchIncomingFriendRequests(token: string): Promise<FriendRequestOut[]> {
    const response = await fetch("/api/friends/requests/incoming", {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return await response.json();
}

export async function acceptFriendRequest(token: string, requestId: number): Promise<void> {
    const response = await fetch(`/api/friends/requests/${encodeURIComponent(String(requestId))}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
}

export async function rejectFriendRequest(token: string, requestId: number): Promise<void> {
    const response = await fetch(`/api/friends/requests/${encodeURIComponent(String(requestId))}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
}

export async function resolveRequesterNames(
    token: string,
    requests: FriendRequestOut[]
): Promise<Record<number, string>> {
    const uniqueFromIds = Array.from(new Set(requests.map((r) => r.from_user_id)));

    const lookups = await Promise.all(
        uniqueFromIds.map(async (fromId) => {
            try {
                const r = await fetch(`/api/profile/profiles/${encodeURIComponent(String(fromId))}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!r.ok) return [fromId, String(fromId)] as const;
                const p: ProfileOut = await r.json();
                return [fromId, p.display_name || String(fromId)] as const;
            } catch {
                return [fromId, String(fromId)] as const;
            }
        })
    );

    const map: Record<number, string> = {};
    for (const [id, name] of lookups) map[id] = name;
    return map;
}

export async function blockFriend(token: string, blockedUserId: number): Promise<void> {
    const response = await fetch("/api/friends/block", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blocked_user_id: blockedUserId }),
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
}

export async function getFriendsWithStatus(token: string): Promise<FriendswithStatusOut[]> {
    const response = await fetch("/api/friends/friends/with-status", {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return await response.json();
}

export async function pingPresence(token: string): Promise<PresencePingOut> {
    const response = await fetch("/api/friends/presence/ping", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return await response.json();
}


export async function unblockFriend(token: string, blockedUserId: number): Promise<void> {
    const response = await fetch(`/api/friends/block/${encodeURIComponent(String(blockedUserId))}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
}