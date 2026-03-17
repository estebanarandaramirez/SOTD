export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: never;
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          spotify_track_id: string;
          track_name: string;
          artist_name: string;
          album_name: string;
          album_art_url: string | null;
          preview_url: string | null;
          note: string | null;
          genre: string | null;
          posted_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          spotify_track_id: string;
          track_name: string;
          artist_name: string;
          album_name: string;
          album_art_url?: string | null;
          preview_url?: string | null;
          note?: string | null;
          genre?: string | null;
          posted_date?: string;
          created_at?: string;
        };
        Update: {
          note?: string | null;
          genre?: string | null;
        };
      };
      likes: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: never;
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: never;
      };
    };
    Functions: {
      get_feed: {
        Args: { requesting_user_id: string; since_date?: string; page_size?: number; page_offset?: number };
        Returns: FeedPost[];
      };
      get_discover: {
        Args: {
          requesting_user_id: string;
          page_size?: number;
          page_offset?: number;
          genre_filter?: string | null;
        };
        Returns: FeedPost[];
      };
      get_similar_taste: {
        Args: { requesting_user_id: string; result_limit?: number };
        Returns: SimilarUser[];
      };
    };
  };
}

export interface FeedPost {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  spotify_track_id: string;
  track_name: string;
  artist_name: string;
  album_name: string;
  album_art_url: string | null;
  preview_url: string | null;
  note: string | null;
  genre: string | null;
  posted_date: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

export interface SimilarUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  shared_artists: string[];
  latest_track: string | null;
  latest_artist: string | null;
  is_following: boolean;
}
