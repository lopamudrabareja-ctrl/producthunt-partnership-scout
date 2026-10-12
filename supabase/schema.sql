-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Three tables, matching the Components Map (Cache check / Store run / Status persisted).

-- 1. scout_runs: the cache. One row per successful scout; we reuse a row younger than 10 minutes.
create table if not exists scout_runs (
  id bigint generated always as identity primary key,
  categories_key text not null,            -- e.g. "hr-tech,team-communication" (sorted), identifies the request
  results jsonb not null,                  -- the ranked list including Gemini drafts
  created_at timestamptz not null default now()
);
create index if not exists scout_runs_key_time on scout_runs (categories_key, created_at desc);

-- 2. launches: history of every product we have ever surfaced (so Kavya can see what she saw before).
create table if not exists launches (
  ph_id text primary key,                  -- ProductHunt post id
  name text not null,
  data jsonb not null,                     -- latest snapshot of the ranked row
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- 3. outreach_status: the pipeline. One row per product Kavya has touched.
create table if not exists outreach_status (
  ph_id text primary key,
  status text not null default 'new' check (status in ('new', 'contacted', 'replied', 'skip')),
  updated_at timestamptz not null default now()
);

-- Row Level Security: ON for all tables, with explicit policies for the anon role.
-- Trade-off: anyone holding the anon key could read/write these tables.
-- That is acceptable here because (a) the key is only used server-side, never sent to the browser,
-- (b) the data is public ProductHunt info plus a status word, no personal data, (c) this is a single-user tool.
-- A multi-user product would add login and per-user policies.
alter table scout_runs enable row level security;
alter table launches enable row level security;
alter table outreach_status enable row level security;

create policy "anon read runs" on scout_runs for select to anon using (true);
create policy "anon insert runs" on scout_runs for insert to anon with check (true);

create policy "anon read launches" on launches for select to anon using (true);
create policy "anon insert launches" on launches for insert to anon with check (true);
create policy "anon update launches" on launches for update to anon using (true) with check (true);

create policy "anon read status" on outreach_status for select to anon using (true);
create policy "anon insert status" on outreach_status for insert to anon with check (true);
create policy "anon update status" on outreach_status for update to anon using (true) with check (true);
