import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

// FIXED IMPORT PATHS FOR NEXT.JS API ROUTES
// (Place this file at: pages/api/transfer.ts)
import { getPlaylistTracks } from "../../lib/spotify";
import { ytCreatePlaylist, ytSearchFirstVideoId, ytAddToPlaylist } from "../../lib/youtube";

const BodySchema = z.object({
    playlistId: z.string(),
    playlistName: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    const session = await getServerSession(req, res, authOptions);
    const sp = session?.providers?.spotify;
    const gg = session?.providers?.google;

    if (!sp?.accessToken) return res.status(401).json({ error: "Connect Spotify" });
    if (!gg?.accessToken) return res.status(401).json({ error: "Connect Google (YouTube)" });

    const parse = BodySchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: "Invalid body" });

    const { playlistId, playlistName } = parse.data;

    try {
        // 1) Fetch tracks from Spotify
        const tracks = await getPlaylistTracks(sp.accessToken, playlistId);

        // 2) Create YouTube playlist
        const ytPlaylistId = await ytCreatePlaylist(gg.accessToken, `Imported — ${playlistName}`);

        // 3) For each track, search and add
        let success = 0;
        const failed: { title: string; artists: string[] }[] = [];

        // simple sequential loop (safe for quotas; okay for demo)
        for (const t of tracks) {
            const q = t.isrc ? `${t.title} ${t.artists[0] || ""} ${t.isrc}` : `${t.title} ${t.artists.join(" ")}`;
            const vid = await ytSearchFirstVideoId(gg.accessToken, q);
            if (!vid) {
                failed.push({ title: t.title, artists: t.artists });
                continue;
            }
            try {
                await ytAddToPlaylist(gg.accessToken, ytPlaylistId, vid);
                success++;
            } catch (e) {
                failed.push({ title: t.title, artists: t.artists });
            }
        }

        res.status(200).json({
            createdPlaylistId: ytPlaylistId,
            total: tracks.length,
            success,
            failed,
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message || "Transfer failed" });
    }
}