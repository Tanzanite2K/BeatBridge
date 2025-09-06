// pages/api/transfer-from-youtube.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { getPlaylistVideoDetails } from "../../lib/youtube";
import { searchSpotifyTrackUri, createSpotifyPlaylistForMe, addTracksToSpotifyPlaylist } from "../../lib/spotify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions);
  const gg = session?.providers?.google;
  const sp = session?.providers?.spotify;
  if (!gg?.accessToken) return res.status(401).json({ error: "Connect Google (YouTube) first" });
  if (!sp?.accessToken) return res.status(401).json({ error: "Connect Spotify first" });

  const { playlistId, playlistName } = req.body;
  if (!playlistId || !playlistName) return res.status(400).json({ error: "Missing playlistId or playlistName" });

  try {
    // 1) get video titles
    const videos = await getPlaylistVideoDetails(gg.accessToken, playlistId, 100); // up to 100
    // 2) for each video try to parse "artist - title" then search Spotify
    const uris: string[] = [];
    for (const v of videos) {
      // heuristic parsing
      let artist: string | undefined;
      let title = v.title;
      // common separators: " - ", " — ", " | "
      if (title.includes(" - ")) {
        const [a, t] = title.split(" - ");
        artist = a?.trim();
        title = t?.trim();
      } else if (title.includes(" — ")) {
        const [a, t] = title.split(" — ");
        artist = a?.trim();
        title = t?.trim();
      } else if (title.includes("|")) {
        const [a, t] = title.split("|");
        artist = a?.trim();
        title = t?.trim();
      }

      // search Spotify
      try {
        const uri = await searchSpotifyTrackUri(sp.accessToken, title, artist);
        if (uri) uris.push(uri);
      } catch (e) {
        // skip if search fails
        continue;
      }
    }

    // 3) create Spotify playlist and add found tracks
    const newPlaylistId = await createSpotifyPlaylistForMe(sp.accessToken, `Imported — ${playlistName}`);
    if (uris.length) await addTracksToSpotifyPlaylist(sp.accessToken, newPlaylistId, uris);

    res.status(200).json({ createdPlaylistId: newPlaylistId, totalVideos: videos.length, added: uris.length });
  } catch (e: any) {
    console.error("transfer-from-youtube error:", e);
    res.status(500).json({ error: e.message || "Transfer failed" });
  }
}