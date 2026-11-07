-- Supersedes 028: usernames must be lowercase AND alphanumeric only (no
-- spaces, underscores, or other characters). The client already enforces
-- this, but nothing did server-side, so a direct API call could still bypass
-- it.
alter table public.profiles
  drop constraint if exists profiles_username_lowercase;

alter table public.profiles
  add constraint profiles_username_alphanumeric check (username ~ '^[a-z0-9]+$');
