-- Posts allow longer captions (500) than comments (300). Comments previously
-- had no effective cap below 500 at the DB level even though the client
-- limited to 300; posts had no DB cap at all.
alter table public.comments
  drop constraint comments_body_check;
alter table public.comments
  add constraint comments_body_check check (char_length(body) > 0 and char_length(body) <= 300);

alter table public.posts
  add constraint posts_note_length check (note is null or char_length(note) <= 500);

alter table public.profiles
  add constraint profiles_username_length check (char_length(username) <= 30);
