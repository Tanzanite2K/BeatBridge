// lib/youtube.ts
import axios, { AxiosResponse } from "axios";

interface YouTubePlaylistSnippet {
    title: string;
    description: string;
    thumbnails?: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
    };
}

interface YouTubePlaylist {
    id: string;
    snippet: YouTubePlaylistSnippet;
    contentDetails: {
        itemCount: number;
    };
}

interface YouTubePlaylistsResponse {
    items: YouTubePlaylist[];
    nextPageToken?: string;
}

export async function ytCreatePlaylist(accessToken: string, title: string, description?: string) {
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet%2Cstatus`;
    const { data } = await axios.post(
        url,
        {
            snippet: { title, description: description || "Imported from Spotify" },
            status: { privacyStatus: "unlisted" },
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return data.id as string;
}

export async function ytSearchFirstVideoId(accessToken: string, query: string): Promise<string | null> {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const item = data.items?.[0];
    return item?.id?.videoId || null;
}

export async function ytAddToPlaylist(accessToken: string, playlistId: string, videoId: string) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`;
    await axios.post(
        url,
        {
            snippet: {
                playlistId,
                resourceId: { kind: "youtube#video", videoId },
            },
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
}

// NEW: fetch authenticated user's YouTube playlists (paginated)
export async function getMyYouTubePlaylists(accessToken: string): Promise<YouTubePlaylist[]> {
    const out: YouTubePlaylist[] = [];
    let pageToken: string | undefined = undefined;

    do {
        const url: string = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`;

        const response: AxiosResponse<YouTubePlaylistsResponse> = await axios.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const data: YouTubePlaylistsResponse = response.data;
        out.push(...(data.items || []));
        pageToken = data.nextPageToken;
    } while (pageToken);

    return out;
}

/** get basic playlist items (videoId + title) up to `max` */
export async function getPlaylistVideoDetails(accessToken: string, playlistId: string, max = 50) {
    const out: { videoId: string; title: string }[] = [];
    let pageToken: string | undefined = undefined;
    let remaining = max;

    do {
        const url: string = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${Math.min(
            50,
            remaining
        )}${pageToken ? `&pageToken=${pageToken}` : ""}`;
        const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        for (const it of data.items || []) {
            const videoId = it.snippet?.resourceId?.videoId;
            const title = it.snippet?.title;
            if (videoId && title) out.push({ videoId, title });
        }
        pageToken = data.nextPageToken;
        remaining -= (data.items || []).length;
    } while (pageToken && remaining > 0);

    return out;
}

/** return true if sampled videos from the playlist are mostly music (categoryId === '10') */
export async function isPlaylistMusic(accessToken: string, playlistId: string, sampleSize = 5) {
    // 1) get up to `sampleSize` videoIds
    const urlPI = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=${sampleSize}`;
    const { data: piData } = await axios.get(urlPI, { headers: { Authorization: `Bearer ${accessToken}` } });
    const ids = (piData.items || []).map((it: any) => it.contentDetails?.videoId).filter(Boolean);
    if (!ids.length) return false;

    // 2) ask videos.list for snippet (categoryId)
    const urlV = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids.join(",")}`;
    const { data: vData } = await axios.get(urlV, { headers: { Authorization: `Bearer ${accessToken}` } });
    const items = vData.items || [];
    const musicCount = items.filter((v: any) => v.snippet?.categoryId === "10").length;

    // require at least half the sampled videos to be categoryId '10'
    return musicCount >= Math.ceil(items.length / 2);
}