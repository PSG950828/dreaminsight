-- DreamInsight Community schema (Supabase)

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  anon_name text not null,
  user_uid text not null,
  text text not null,
  pinned boolean not null default false,
  private boolean not null default false,
  reported boolean not null default false,
  likes_count integer not null default 0
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid not null references posts(id) on delete cascade,
  anon_name text not null,
  user_uid text not null,
  text text not null
);

-- Votes to prevent multiple likes by same device/user
create table if not exists votes (
  post_id uuid not null references posts(id) on delete cascade,
  user_uid text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_uid)
);

-- Basic policies (RLS)
alter table posts enable row level security;
alter table comments enable row level security;
alter table votes enable row level security;

create policy "read_all_posts" on posts for select using (true);
create policy "insert_any_post" on posts for insert with check (true);
create policy "update_own_post" on posts for update using (user_uid = current_setting('request.jwt.claims', true)::jsonb->>'sub') with check (user_uid = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- Restrict direct comment reads to public posts only; owners access via RPC
drop policy if exists read_all_comments on comments;
create policy "select_public_comments" on comments for select
  using (exists (select 1 from posts p where p.id = comments.post_id and p.private = false));
create policy "insert_any_comment" on comments for insert with check (true);

create policy "read_all_votes" on votes for select using (true);
create policy "insert_any_vote" on votes for insert with check (true);
create policy "delete_own_vote" on votes for delete using (true);

-- Note: For anon-key clients, you may not have 'sub' claim. For simplicity, allow updates via RPC only.

-- Optional: RPC to like/report/pin safely
-- List posts: respect privacy (private=false or owner)
create or replace function list_posts(p_uid text)
returns setof posts
language sql
security definer as $$
  select * from posts
  where (not private) or user_uid = p_uid
  order by pinned desc, created_at desc
  limit 200;
$$;

-- Comments list respecting post privacy (public or owner's)
create or replace function list_comments(p_uid text, p_limit int default 500)
returns setof comments
language sql
security definer as $$
  select c.*
  from comments c
  join posts p on p.id = c.post_id
  where (not p.private) or p.user_uid = p_uid
  order by c.created_at desc
  limit p_limit;
$$;

-- Reports table for moderation
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid not null references posts(id) on delete cascade,
  reporter_uid text not null,
  reason text not null
);

alter table reports enable row level security;
-- For production, restrict reports select to service role only (no select policy for anon)
drop policy if exists read_all_reports on reports;
create policy "insert_any_report" on reports for insert with check (true);

-- Moderation status on reports
do $$ begin
  alter table reports add column if not exists status text not null default 'pending';
exception when duplicate_column then null; end $$;
create index if not exists idx_reports_status on reports(status);

create or replace function toggle_pin(p_post uuid, p_state boolean) returns void as $$
begin
  update posts set pinned = p_state where id = p_post;
end; $$ language plpgsql security definer;

create or replace function set_reported(p_post uuid, p_state boolean) returns void as $$
begin
  update posts set reported = p_state where id = p_post;
end; $$ language plpgsql security definer;

-- Toggle vote and return new likes_count
create or replace function toggle_vote(p_post uuid, p_uid text)
returns integer
language plpgsql
security definer as $$
declare
  liked boolean;
  new_count integer;
begin
  select exists(select 1 from votes where post_id = p_post and user_uid = p_uid) into liked;
  if liked then
    delete from votes where post_id = p_post and user_uid = p_uid;
    update posts set likes_count = greatest(0, likes_count - 1) where id = p_post returning likes_count into new_count;
  else
    insert into votes(post_id, user_uid) values (p_post, p_uid) on conflict do nothing;
    update posts set likes_count = likes_count + 1 where id = p_post returning likes_count into new_count;
  end if;
  return new_count;
end;
$$;

-- Telemetry (server aggregate)
create table if not exists telemetry (
  user_uid text not null,
  type text not null, -- symbol | suggestion | action.done
  k text not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  primary key(user_uid, type, k)
);

alter table telemetry enable row level security;
-- Allow inserts from anon if desired; otherwise only service role writes via API
create policy if not exists insert_any_telemetry on telemetry for insert with check (true);

-- Event log for per-day trends
create table if not exists telemetry_events (
  id uuid primary key default gen_random_uuid(),
  user_uid text not null,
  type text not null,
  k text not null,
  delta integer not null default 1,
  created_at timestamptz not null default now()
);
alter table telemetry_events enable row level security;
create policy if not exists insert_any_telemetry_events on telemetry_events for insert with check (true);

-- Admin dictionary (server-side aliases)
create table if not exists admin_aliases (
  sym_key text not null,
  alias text not null,
  created_at timestamptz not null default now(),
  primary key(sym_key, alias)
);
alter table admin_aliases enable row level security;
-- no select policy for anon; only service role via API should access
