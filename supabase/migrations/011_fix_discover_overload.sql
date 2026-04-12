-- Drop the old 3-parameter get_discover overload created in migration 001.
-- Migration 002 added genre_filter as a 4th param, but PostgreSQL treated it as a
-- new overload (different signature) instead of replacing the original.
-- This caused "Could not choose the best candidate function" errors.
DROP FUNCTION IF EXISTS public.get_discover(uuid, integer, integer);
