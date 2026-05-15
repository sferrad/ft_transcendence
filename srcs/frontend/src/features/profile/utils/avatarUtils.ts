export function normalizeAvatarUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith("/profile/avatars/")) {
        return `/api/profile/avatars/${url.slice("/profile/avatars/".length)}`;
    }
    return url;
}

export async function loadAvatarForImgSrc(
    token: string,
    normalizedUrl: string | null
): Promise<{ src: string | null; isObjectUrl: boolean }> {
    if (!normalizedUrl) return { src: null, isObjectUrl: false };

    if (normalizedUrl.startsWith("/api/profile/avatars/")) {
        const response = await fetch(normalizedUrl, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Avatar HTTP ${response.status}`);
        const blob = await response.blob();
        return { src: URL.createObjectURL(blob), isObjectUrl: true };
    }

    return { src: normalizedUrl, isObjectUrl: false };
}
