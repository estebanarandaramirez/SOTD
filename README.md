# SOTD — Song of the Day

A social web app where you share one song a day with people you follow. Discover new music through friends, explore by genre, and build your posting streak.

## Features

- **Daily post** — share one song per day via Spotify search
- **Feed** — see today's, this week's, or this month's picks from people you follow
- **Discover** — explore posts from everyone, filterable by genre
- **Artist pages** — view Spotify artist info + everyone who's posted that artist
- **Profiles** — posting calendar, streak, song history, followers/following
- **Likes & comments** — interact with posts
- **Notifications** — get notified when someone likes, comments, or follows you
- **Search** — find other users
- **Compact / banner view** — toggle between two post layouts
- **Content moderation** — profanity filter on notes, bios, and comments

## Tech Stack

- **Framework** — [Next.js 14](https://nextjs.org) (App Router)
- **Database & Auth** — [Supabase](https://supabase.com) (Postgres + RLS)
- **Styling** — [Tailwind CSS](https://tailwindcss.com)
- **Music data** — [Spotify Web API](https://developer.spotify.com)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/estebanarandaramirez/SOTD.git
cd SOTD
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run all migrations in order from `supabase/migrations/` in the SQL editor
3. Create a storage bucket named `avatars` with public read access

### 3. Set up Spotify

1. Create an app at [developer.spotify.com](https://developer.spotify.com)
2. Copy your Client ID and Client Secret

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Migrations

Run these in order in your Supabase SQL editor:

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Core tables, RLS policies, `get_feed` and `get_discover` RPCs |
| `002_genre_and_features.sql` | Genre field, `get_similar_taste` RPC |
| `003_genre_in_rpc_output.sql` | Genre added to RPC return types |
| `004_feed_own_posts.sql` | Feed includes your own posts |
| `005_feed_pagination.sql` | Pagination support for `get_feed` |
| `006_notifications.sql` | Notifications table and DB triggers |

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated pages
│   │   ├── feed/
│   │   ├── discover/
│   │   ├── profile/
│   │   ├── artist/
│   │   ├── notifications/
│   │   ├── search/
│   │   ├── settings/
│   │   └── post/
│   ├── (auth)/         # Login & signup
│   └── api/            # Spotify search endpoint
├── components/         # Shared UI components
├── lib/
│   ├── supabase/       # Client & server Supabase instances
│   ├── spotify.ts      # Spotify API helpers
│   ├── moderation.ts   # Profanity filter
│   └── utils.ts
└── types/
    └── database.ts     # Supabase table & RPC types
```
