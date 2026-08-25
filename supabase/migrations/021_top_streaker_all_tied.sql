-- Return ALL users sharing the highest active streak, not just one.
-- Callers should check whether the target user_id is in the result set.
CREATE OR REPLACE FUNCTION public.get_top_streaker()
RETURNS TABLE (user_id uuid, streak int)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH
  ranked AS (
    SELECT
      user_id,
      posted_date,
      posted_date + (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY posted_date DESC))::int AS grp
    FROM public.posts
  ),
  streaks AS (
    SELECT
      user_id,
      COUNT(*)::int    AS streak_len,
      MAX(posted_date) AS last_date
    FROM ranked
    GROUP BY user_id, grp
  ),
  active AS (
    SELECT user_id, streak_len
    FROM streaks
    WHERE last_date >= CURRENT_DATE - 1
  ),
  top AS (
    SELECT MAX(streak_len) AS max_streak FROM active
  )
  SELECT a.user_id, a.streak_len AS streak
  FROM active a
  JOIN top t ON a.streak_len = t.max_streak;
$$;
