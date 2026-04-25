import type { RoomOut, RoomCreate, MessageOut, MessageCreate, JoinRoomOut, LeaveRoomOut, DeleteRoomOut } from "../types";

async function parseErrorDetail(response: Response): Promise<string | null> {
    try {
        const data = await response.json();
        if (data && typeof data.detail === "string") return data.detail;
    } catch {
        // ignore
    }
    return null;
}

export async function getRooms(token: string): Promise<RoomOut[]> {
    const response = await fetch("/api/chat/rooms", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || "Failed to fetch rooms");
    }
    const data = await response.json();
    return data;
}

export async function createRoom(token: string, roomData: RoomCreate): Promise<RoomOut> {
    const response = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(roomData),
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || "Failed to create room");
    }
    const data = await response.json();
    return data;
}

export async function sendMessage(token: string, roomId: number, messageData: MessageCreate): Promise<MessageOut> {
    const response = await fetch(`/api/chat/rooms/${encodeURIComponent(String(roomId))}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || "Failed to send message");
    }
    const data = await response.json();
    return data;
}

export async function getMessages(token: string, roomId: number): Promise<MessageOut[]> {
    const response = await fetch(`/api/chat/rooms/${encodeURIComponent(String(roomId))}/messages`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || "Failed to fetch messages");
    }
    const data = await response.json();
    return data;
}

export async function joinRoom(token: string, roomId: number): Promise<JoinRoomOut> {
    const response = await fetch(`/api/chat/rooms/${encodeURIComponent(String(roomId))}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {        const detail = await parseErrorDetail(response);
        throw new Error(detail || "Failed to join room");
    }
    const data = await response.json();
    return data;
}

export async function leaveRoom(token: string, roomId: number): Promise<LeaveRoomOut> {
    const response = await fetch(`/api/chat/rooms/${encodeURIComponent(String(roomId))}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {        const detail = await parseErrorDetail(response);
        throw new Error(detail || "Failed to leave room");
    }
    const data = await response.json();
    return data;
}

export async function deleteRoom(token: string, roomId: number): Promise<DeleteRoomOut> {
    const response = await fetch(`/api/chat/rooms/${encodeURIComponent(String(roomId))}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {        const detail = await parseErrorDetail(response);
        throw new Error(detail || "Failed to delete room");
    }
    const data = await response.json();
    return data;
}

export async function getRoomMembers(token: string, roomId: number): Promise<number[]> {
    const response = await fetch(`/api/chat/rooms/${encodeURIComponent(String(roomId))}/members`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const detail = await parseErrorDetail(response);
        throw new Error(detail || "Failed to fetch room members");
    }
    const data = await response.json();
    return data;
}
