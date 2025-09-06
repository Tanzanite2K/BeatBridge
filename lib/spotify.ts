import axios from "axios";

export type SpotifyPlaylist = {
    id: string;
    name: string;
    images: { url: string }[];
    tracks: { total: number };
};

export async function getMyPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
    const out: SpotifyPlaylist[] = [];
    let url = `https://api.spotify.com/v1/me/playlists?limit=50`;
    while (url) {
        const { data } = await axios.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        out.push(
            ...data.items.map((p: any) => ({
                id: p.id,
                name: p.name,
                images: p.images,
                tracks: { total: p.tracks.total },
            }))
        );
        url = data.next;
    }
    return out;
}

export type SimpleTrack = {
    title: string;
    artists: string[];
    isrc?: string;
};

export async function getPlaylistTracks(accessToken: string, playlistId: string): Promise<SimpleTrack[]> {
    const tracks: SimpleTrack[] = [];
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
    while (url) {
        const { data } = await axios.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        for (const item of data.items) {
            const t = item.track;
            if (!t) continue;
            const isrc = t.external_ids?.isrc || undefined;
            tracks.push({
                title: t.name,
                artists: (t.artists || []).map((a: any) => a.name),
                isrc,
            });
        }
        url = data.next;
    }
    return tracks;
}

export async function searchSpotifyTrackUri(accessToken: string, title: string, artist?: string): Promise<string | null> {
    const qParts = [];
    if (title) qParts.push(`track:${title}`);
    if (artist) qParts.push(`artist:${artist}`);
    const q = qParts.join(" ");
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`;
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const item = data.tracks?.items?.[0];
    return item?.uri || null;
}

export async function createSpotifyPlaylistForMe(accessToken: string, name: string, description = "") {
    // get current user id
    const me = await axios.get("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${accessToken}` } });
    const userId = me.data.id;
    const { data } = await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        { name, description, public: false },
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return data.id as string;
}

function chunkArray<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

export async function addTracksToSpotifyPlaylist(accessToken: string, playlistId: string, uris: string[]) {
    const chunks = chunkArray(uris, 100);
    for (const c of chunks) {
        await axios.post(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            { uris: c },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
    }
}