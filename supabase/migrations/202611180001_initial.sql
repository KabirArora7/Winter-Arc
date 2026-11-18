create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('Ananya', 'Kabir')),
  created_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  default_points numeric(7,2) not null check (default_points >= 0),
  display_order integer not null unique check (display_order > 0),
  active boolean not null default true
);

create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  habit_id uuid not null references public.habits(id) on delete restrict,
  date date not null check (date between date '2026-11-17' and date '2026-12-21'),
  completed boolean not null default false,
  default_points_snapshot numeric(7,2) not null check (default_points_snapshot >= 0),
  points_adjustment numeric(7,2) not null default 0,
  adjustment_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, habit_id, date)
);

create table public.point_adjustments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  date date not null check (date between date '2026-11-17' and date '2026-12-21'),
  points_change numeric(7,2) not null,
  reason text,
  created_at timestamptz not null default now()
);

create index daily_entries_profile_date_idx on public.daily_entries(profile_id, date);
create index point_adjustments_profile_date_idx on public.point_adjustments(profile_id, date);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger daily_entries_touch_updated_at before update on public.daily_entries
for each row execute function public.touch_updated_at();

insert into public.profiles (id, name) values
  ('10000000-0000-4000-8000-000000000001', 'Ananya'),
  ('10000000-0000-4000-8000-000000000002', 'Kabir')
on conflict (name) do nothing;

insert into public.habits (id, code, name, description, default_points, display_order) values
  ('20000000-0000-4000-8000-000000000001', 'H01', 'Deep work', '3 hours of deep work daily', 10, 1),
  ('20000000-0000-4000-8000-000000000002', 'H02', 'Sleep by 11:00 PM', 'Be in bed by 11:00 PM', 10, 2),
  ('20000000-0000-4000-8000-000000000003', 'H03', 'No junk food', 'No junk food, eating out, or takeaway (except parties)', 5, 3),
  ('20000000-0000-4000-8000-000000000004', 'H04', 'Intense physical activity', 'Complete intense physical activity', 5, 4),
  ('20000000-0000-4000-8000-000000000005', 'H05', '10,000 steps', 'Walk at least 10,000 steps', 2, 5),
  ('20000000-0000-4000-8000-000000000006', 'H06', '7–8 hours of sleep', 'Get 7 to 8 hours of sleep', 3, 6),
  ('20000000-0000-4000-8000-000000000007', 'H07', 'Skincare and care routine', 'Daily skincare plus body or hair care', 3, 7),
  ('20000000-0000-4000-8000-000000000008', 'H08', '1.5 L water', 'Drink at least 1.5 litres of water', 2, 8),
  ('20000000-0000-4000-8000-000000000009', 'H09', 'Supplements + protein', 'Take supplements and protein powder', 3, 9),
  ('20000000-0000-4000-8000-000000000010', 'H10', 'Journal and Photo Entry', 'Mark this daily habit complete', 2, 10)
on conflict (code) do nothing;

-- This app deliberately has no authentication. These policies permit anyone with
-- the public anon key to read and edit both profiles; profile mode is only a UX safeguard.
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.daily_entries enable row level security;
alter table public.point_adjustments enable row level security;

create policy "Public read profiles" on public.profiles for select to anon, authenticated using (true);
create policy "Public read habits" on public.habits for select to anon, authenticated using (true);
create policy "Public manage daily entries" on public.daily_entries for all to anon, authenticated using (true) with check (true);
create policy "Public manage adjustments" on public.point_adjustments for all to anon, authenticated using (true) with check (true);
