create table if not exists device_tokens (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  token      text not null unique,
  platform   text not null check (platform in ('android', 'ios', 'web')),
  updated_at timestamptz default now() not null
);

create index if not exists device_tokens_user_id_idx on device_tokens(user_id);

alter table device_tokens enable row level security;

create policy "Users can manage their own tokens"
  on device_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
