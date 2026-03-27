-- Nutrition schema additions for Obsidian Fitness PWA.
-- This migration adds the tables used by the Diet Plan tab.

create table if not exists public.meal_logs (
  id text primary key,
  profile_id text not null,
  meal_name text not null,
  calories integer not null check (calories >= 0),
  protein integer not null check (protein >= 0),
  consumed_on date not null,
  created_at timestamptz not null default now()
);

create index if not exists meal_logs_profile_id_idx
  on public.meal_logs (profile_id);

create index if not exists meal_logs_profile_consumed_on_idx
  on public.meal_logs (profile_id, consumed_on desc);

create table if not exists public.weekly_plan (
  id text primary key,
  profile_id text not null,
  day text not null check (day in (
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  )),
  slot text not null check (slot in ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  meal_name text not null,
  ingredients text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create unique index if not exists weekly_plan_profile_day_slot_uniq
  on public.weekly_plan (profile_id, day, slot);

create index if not exists weekly_plan_profile_id_idx
  on public.weekly_plan (profile_id);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    begin
      alter table public.meal_logs
        add constraint meal_logs_profile_id_fk
        foreign key (profile_id) references public.profiles(id)
        on delete cascade;
    exception
      when duplicate_object then null;
    end;

    begin
      alter table public.weekly_plan
        add constraint weekly_plan_profile_id_fk
        foreign key (profile_id) references public.profiles(id)
        on delete cascade;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;
