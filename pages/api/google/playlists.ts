// pages/api/google/playlists.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getMyYouTubePlaylists, isPlaylistMusic } from "../../../lib/youtube";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const gg = session?.providers?.google;
  const accessToken = gg?.accessToken ?? null;

  if (!accessToken) {
    return res.status(401).json({ error: "Connect Google (YouTube) first" });
  }

  try {
    const playlists = await getMyYouTubePlaylists(accessToken);

    const checks = await Promise.allSettled(
      playlists.map(async (p: any) => {
        try {
          const isMusic = await isPlaylistMusic(accessToken, p.id, 5);
          return { playlist: p, isMusic };
        } catch {
          return { playlist: p, isMusic: false };
        }
      })
    );

    const musicPlaylists = checks
      .filter((c: any) => c.status === "fulfilled" && c.value.isMusic)
      .map((c: any) => c.value.playlist);

    res.status(200).json({ playlists: musicPlaylists });
  } catch (e: any) {
    console.error("google/playlists error:", e?.message || e);
    res.status(500).json({ error: e.message || "Failed to fetch YouTube playlists" });
  }
}