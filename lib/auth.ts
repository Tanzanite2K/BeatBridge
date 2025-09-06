// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prismadb";

type ProviderTokenShape = {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null; // ms timestamp
};

async function refreshSpotifyToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!res.ok) throw new Error("Failed to refresh Spotify token");
  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
}

async function refreshGoogleToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) throw new Error("Failed to refresh Google token");
  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    id_token?: string;
  };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "playlist-read-private",
            "playlist-read-collaborative",
            "playlist-modify-private",
            "playlist-modify-public",
            "user-read-email",
          ].join(" "),
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "profile",
            "email",
            "https://www.googleapis.com/auth/youtube",
            "https://www.googleapis.com/auth/youtube.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],

  callbacks: {
    /**
     * jwt callback:
     * - ensure token.sub is populated (from user or DB account lookup)
     * - merge provider tokens (do not wipe existing providers)
     * - if provider tokens missing, hydrate from DB accounts for this userId
     * - attempt refresh if expiring
     */
    async jwt({ token, user, account }) {
      const t: any = { ...token };

      // 1) If this is a fresh sign-in, ensure we have user.id as sub
      if (user && (user as any).id) {
        t.sub = (user as any).id;
      }

      // 2) If account is present, try to determine userId (sub) from DB if not present
      if (account && !t.sub) {
        try {
          const dbAcc = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            select: { userId: true },
          });
          if (dbAcc?.userId) t.sub = dbAcc.userId;
        } catch (err) {
          // ignore DB read error; continue
          console.error("jwt: account lookup failed:", (err as any)?.message || err);
        }
      }

      // 3) Merge provider tokens when account present (do not remove other providers)
      if (account) {
        const provider = account.provider;
        const existing: ProviderTokenShape = t[provider] ?? {};
        t[provider] = {
          accessToken: account.access_token ?? existing.accessToken ?? null,
          refreshToken: account.refresh_token ?? existing.refreshToken ?? null,
          expiresAt: account.expires_at ? account.expires_at * 1000 : existing.expiresAt ?? null,
        };
      }

      // 4) If any provider tokens are missing, hydrate from DB using t.sub
      if (typeof t.sub === "string") {
        try {
          const accounts = await prisma.account.findMany({
            where: { userId: t.sub },
          });
          for (const a of accounts) {
            if (!t[a.provider] || !t[a.provider].accessToken) {
              t[a.provider] = {
                accessToken: a.access_token ?? null,
                refreshToken: a.refresh_token ?? null,
                expiresAt: a.expires_at ? a.expires_at * 1000 : null,
              };
            }
          }
        } catch (err) {
          console.error("jwt: hydrate from DB failed:", (err as any)?.message || err);
        }
      }

      // 5) Refresh tokens if expiring (safe attempts)
      try {
        if (t.spotify?.refreshToken && t.spotify?.expiresAt && Date.now() > t.spotify.expiresAt - 60_000) {
          const data = await refreshSpotifyToken(t.spotify.refreshToken);
          t.spotify.accessToken = data.access_token;
          t.spotify.expiresAt = Date.now() + data.expires_in * 1000;
          if (data.refresh_token) t.spotify.refreshToken = data.refresh_token;

          // Optional: persist refreshed tokens back to DB (uncomment if desired)
          // await prisma.account.updateMany({
          //   where: { provider: 'spotify', userId: t.sub },
          //   data: { access_token: t.spotify.accessToken, refresh_token: t.spotify.refreshToken, expires_at: Math.floor(t.spotify.expiresAt/1000) }
          // });
        }
      } catch (err) {
        console.error("jwt: spotify refresh failed:", (err as any)?.message || err);
      }

      try {
        if (t.google?.refreshToken && t.google?.expiresAt && Date.now() > t.google.expiresAt - 60_000) {
          const data = await refreshGoogleToken(t.google.refreshToken);
          t.google.accessToken = data.access_token;
          t.google.expiresAt = Date.now() + data.expires_in * 1000;
          // optional persist
        }
      } catch (err) {
        console.error("jwt: google refresh failed:", (err as any)?.message || err);
      }

      return t;
    },

    async session({ session, token }) {
      const t: any = token as any;
      session.providers = {
        spotify: t.spotify ?? null,
        google: t.google ?? null,
      };
      return session;
    },
  },

  // keep events as-is (optional)
  events: {
    // no-op here; we rely on jwt hydration instead of merging on createUser
  },
};

// TS augmentations (optional)
declare module "next-auth" {
  interface Session {
    providers?: {
      spotify?: { accessToken?: string | null; refreshToken?: string | null; expiresAt?: number | null } | null;
      google?: { accessToken?: string | null; refreshToken?: string | null; expiresAt?: number | null } | null;
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    spotify?: { accessToken?: string | null; refreshToken?: string | null; expiresAt?: number | null };
    google?: { accessToken?: string | null; refreshToken?: string | null; expiresAt?: number | null };
    sub?: string | undefined;
  }
}