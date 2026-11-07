-- Usernames are always lowercased client-side before being saved, but nothing
-- enforced that server-side. Without this, a direct API call (bypassing the
-- UI) could create "Costco" alongside an existing "costco" — the UNIQUE
-- constraint on username is case-sensitive, so it wouldn't catch that.
alter table public.profiles
  add constraint profiles_username_lowercase check (username = lower(username));
