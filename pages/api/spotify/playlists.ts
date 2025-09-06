import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getMyPlaylists } from "../../../lib/spotify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const token = session?.providers?.spotify?.accessToken;
  if (!token) return res.status(401).json({ error: "Connect Spotify first" });

  try {
    const playlists = await getMyPlaylists(token);
    res.status(200).json({ playlists });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch playlists" });
  }
}