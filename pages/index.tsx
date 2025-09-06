import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session } = useSession();
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<any[]>([]);
  const [googlePlaylists, setGooglePlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const hasSpotify = !!session?.providers?.spotify?.accessToken;
  const hasGoogle = !!session?.providers?.google?.accessToken;

  useEffect(() => {
    async function loadSpotify() {
      if (!hasSpotify) return;
      const res = await fetch("/api/spotify/playlists");
      const data = await res.json();
      if (res.ok && data.playlists) setSpotifyPlaylists(data.playlists);
    }
    async function loadGoogle() {
      if (!hasGoogle) return;
      const res = await fetch("/api/google/playlists");
      const data = await res.json();
      if (res.ok && data.playlists) setGooglePlaylists(data.playlists);
    }
    loadSpotify();
    loadGoogle();
  }, [hasSpotify, hasGoogle]);

  async function transfer(p: any) {
    if (!hasGoogle) {
      alert("Connect Google (YouTube) first");
      return;
    }
    setLoading(true);
    setMessage("Transferring… this may take a minute for big playlists.");
    const res = await fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId: p.id, playlistName: p.name }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(
        `✅ Done! Added ${data.success}/${data.total}. YouTube Playlist ID: ${data.createdPlaylistId}. Failed: ${data.failed.length}`
      );
      console.log("Failed tracks:", data.failed);
    } else {
      setMessage(`❌ Error: ${data.error || "Transfer failed"}`);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#0b0b0b] to-black text-white font-sans px-6 py-10">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-5xl md:text-7xl font-bold bodoni-heading rock-glow mb-4">
        <span className="bg-gradient-to-r from-[#e5e6e8] to-[#d4d5d7] bg-clip-text text-transparent">
            BEATBRIDGE
        </span>
        </h1>
        <p className="text-gray-400 text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
         A Web Application That Lets Users Seamlessly Transfer Their Music Playlists Across Streaming Platforms Like Spotify and YouTube Music
        </p>
      </section>

      {/* Auth Section */}
      <div className="flex items-center justify-center gap-4 mt-10">
        {!session ? (
          <button
            onClick={() => signIn()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ff0033] to-[#ff4d6d] shadow-lg shadow-red-500/30 hover:scale-105 transition-all"
          >
            Sign In
          </button>
        ) : (
          <>
            <span className="text-gray-300 text-lg">
              Hi, {session.user?.name || "User"}
            </span>
            <button
              onClick={() => signOut()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ff0033] to-[#ff4d6d] shadow-lg shadow-red-500/30 hover:scale-105 transition-all"
            >
              Sign Out
            </button>
          </>
        )}
      </div>

        {/* Providers Section */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto">
    {/* Spotify Card */}
    <div className="bg-[#1DB954] bg-opacity-10 border border-[#1DB954] p-8 rounded-2xl text-center flex flex-col items-center justify-center shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105">
        <h2 className="text-3xl font-bold mb-6 text-[#1DB954] flex items-center gap-3">
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="black">
            <path d="M12 0C5.37 0 0 5.373 0 12c0 6.627 5.37 12 12 12s12-5.373 12-12c0-6.627-5.37-12-12-12zm5.28 17.38a.84.84 0 0 1-1.16.28c-3.18-1.94-7.18-2.38-11.84-1.28a.84.84 0 0 1-.4-1.64c5.08-1.2 9.52-.68 13.08 1.44.4.24.52.76.32 1.2zm1.64-3.64a1 1 0 0 1-1.36.36c-3.66-2.18-9.26-2.82-13.56-1.52a1 1 0 1 1-.56-1.92c5-1.46 11.06-.74 15.24 1.74.48.28.64.88.24 1.34zm.24-3.84c-4.2-2.48-11.16-2.72-15.2-1.46a1.2 1.2 0 1 1-.68-2.3c4.72-1.42 12.46-1.12 17.28 1.72a1.2 1.2 0 1 1-1.4 2.04z" />
        </svg>
        Spotify
        </h2>

        {hasSpotify ? (
        <p className="text-[#000000] font-semibold text-lg mt-4">Connected ✅</p>
        ) : (
        <button
            onClick={() => signIn("spotify")}
            className="mt-4 bg-[#1DB954] text-black font-semibold flex items-center justify-center gap-3 px-8 py-3 rounded-full hover:scale-110 transition-transform duration-300"
        >
            CONNECT
        </button>
        )}
    </div>

    {/* YouTube Card */}
    <div className="bg-[#FF0000] bg-opacity-10 border border-[#FF0000] p-8 rounded-2xl text-center flex flex-col items-center justify-center shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out">
    <h2 className="text-3xl font-bold mb-6 text-[#FF0000] flex items-center gap-3">
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.5 6.2s-.2-1.6-.8-2.3c-.7-.8-1.5-.8-1.9-.9C18.5 2.7 12 2.7 12 2.7s-6.5 0-8.8.3c-.5.1-1.3.1-1.9.9-.6.7-.8 2.3-.8 2.3S0 8.1 0 10v1.9c0 1.9.2 3.8.2 3.8s.2 1.6.8 2.3c.7.8 1.7.8 2.1.9 1.6.1 6.7.3 8.8.3s7.2 0 8.8-.3c.5-.1 1.4-.1 2.1-.9.6-.7.8-2.3.8-2.3s.2-1.9.2-3.8V10c0-1.9-.2-3.8-.2-3.8zM9.6 14.7v-5.4l5.2 2.7-5.2 2.7z" />
        </svg>
        YouTube
    </h2>

    {hasGoogle ? (
        <p className="text-[#000000] font-semibold text-lg mt-4">Connected ✅</p>
    ) : (
        <button
        onClick={() => signIn("google")}
        className="mt-4 bg-[#FF0000] text-white font-semibold flex items-center justify-center gap-3 px-8 py-3 rounded-full hover:scale-110 transition-transform duration-300 ease-in-out"
        >
        CONNECT
        </button>
    )}
    </div>
</div>


      {/* Playlist Sections */}
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-12">
        {/* Spotify Playlists */}
        <section className="glass-card p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-4">Your Spotify Playlists</h3>
          {spotifyPlaylists.length ? (
            spotifyPlaylists.map((p) => (
              <div
                key={p.id}
                className="p-4 glass-card rounded-xl flex items-center justify-between mb-3"
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-gray-400">
                    {p.tracks.total} Songs
                  </div>
                </div>
                <button
                  disabled={loading}
                  onClick={() => transfer(p)}
                  className="bg-[#1DB954] bg-opacity-10 border border-[#1DB954] p-8 rounded-2xl text-center flex flex-col items-center justify-center shadow-lg hover:shadow-2xl transition-all"
                >
                  Transfer → YouTube
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No Spotify playlists loaded.</p>
          )}
        </section>

        {/* YouTube Playlists */}
        <section className="glass-card p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-4">Your YouTube Playlists</h3>
          {googlePlaylists.length ? (
            googlePlaylists.map((g: any) => (
              <div
                key={g.id}
                className="p-4 glass-card rounded-xl flex items-center justify-between mb-3"
              >
                <div>
                  <div className="font-medium">{g.snippet?.title}</div>
                  <div className="text-sm text-gray-400">
                    {g.contentDetails?.itemCount ?? 0} Songs
                  </div>
                </div>
                {hasGoogle && hasSpotify ? (
                  <button
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      setMessage(
                        "Transferring playlist… this may take a while."
                      );
                      const res = await fetch("/api/transfer-from-youtube", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          playlistId: g.id,
                          playlistName: g.snippet?.title,
                        }),
                      });
                      const data = await res.json();
                      if (res.ok)
                        setMessage(
                          `✅ Done: added ${data.added}/${data.totalVideos}. Spotify playlist ID: ${data.createdPlaylistId}`
                        );
                      else
                        setMessage(`❌ ${data.error || "Transfer failed"}`);
                      setLoading(false);
                    }}
                    className="bg-[#FF0000] bg-opacity-10 border border-[#FF0000] p-8 rounded-2xl text-center flex flex-col items-center justify-center shadow-lg hover:shadow-2xl transition-all"
                  >
                    Transfer → Spotify
                  </button>
                ) : (
                  <div className="text-sm text-gray-400">
                    Connect both to transfer
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500">No YouTube Music playlists loaded.</p>
          )}
        </section>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="mt-8 max-w-4xl mx-auto glass-card p-5 rounded-xl text-center">
          {loading ? (
            <span className="animate-pulse">{message}</span>
          ) : (
            message
          )}
        </div>
      )}
    </main>
  );
}
