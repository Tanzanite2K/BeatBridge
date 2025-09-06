# Music Playlist Transfer App 🎵

A web application to seamlessly transfer music playlists between streaming platforms like Spotify, YouTube Music, and more. Built with modern web technologies, it allows users to authenticate securely, view their playlists, and transfer them across platforms with ease.

---

## **Features**

- Sign in with **Spotify** and **Google (YouTube Music)** accounts independently.
- **View playlists** and filter only music playlists (YouTube Music).
- **One-click transfer** of playlists between connected platforms.
- Automatic **token management and refresh** for uninterrupted service.
- Cross-platform **account linking**, allowing multiple providers under a single user account.
- Built with **Next.js**, **NextAuth**, **Prisma**, **SQLite**, and **TypeScript** for fast, secure, and scalable implementation.

---

## **Tech Stack**

- **Frontend / Backend:** Next.js, TypeScript  
- **Authentication:** NextAuth.js with OAuth2 (Spotify & Google)  
- **Database:** Prisma ORM with SQLite  
- **API Integrations:** Spotify Web API, YouTube Data API v3  
- **Other Tools:** Node.js, Fetch API  

---

## **Motivation**

Managing music playlists across multiple streaming services is tedious. This app simplifies the process by enabling users to **transfer playlists seamlessly** without manual recreation. It’s perfect for users switching platforms or maintaining playlists across accounts.

---

## **Current Limitations**

- Currently fully supports **Spotify and YouTube Music** only.  
- Large playlists may take time due to API rate limits.  
- Does not yet handle **playlist conflicts or metadata syncing**.  
- Limited UI for bulk operations and advanced playlist management.

---

## **Future Improvements**

- Add support for **Apple Music, JioSaavn, Amazon Music**, and more.  
- Implement **duplicate handling and metadata syncing** (song order, album art).  
- Enhance UI/UX with **bulk transfer, drag-and-drop, and search features**.  
- Optimize performance using **caching and pagination** for large playlists.  
- Add **analytics and user insights**, such as favorite genres or top transferred songs.

---

## **Getting Started**

1. Clone the repository:  
```bash
git clone https://github.com/yourusername/music-playlist-transfer-app.git
```
2. Install dependencies:
```bash
cd music-playlist-transfer-app
npm install
```
3.	Setup .env file with your credentials:
```env
NEXTAUTH_SECRET=your_nextauth_secret
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
DATABASE_URL=file:./dev.db
```
4.	Run Prisma migrations:
```bash
npx prisma migrate dev --name init
```
5.	Start the development server:
```bash
npm run dev
```
6.	Open your browser at http://127.0.0.1:3000 and sign in with Spotify and Google.

---

