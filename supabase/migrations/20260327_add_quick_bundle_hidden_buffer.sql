-- Add quick bundle support and hidden calorie buffer behavior.

alter table public.profiles
  add column if not exists hidden_calorie_buffer_percent integer not null default 10;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_hidden_calorie_buffer_percent_chk'
  ) then
    alter table public.profiles
      add constraint profiles_hidden_calorie_buffer_percent_chk
      check (hidden_calorie_buffer_percent >= 0 and hidden_calorie_buffer_percent <= 30);
  end if;
end $$;

alter table public.meal_logs
  add column if not exists is_outside_food boolean not null default false;

alter table public.meal_logs
  add column if not exists outside_calories integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meal_logs_outside_calories_chk'
  ) then
    alter table public.meal_logs
      add constraint meal_logs_outside_calories_chk
      check (outside_calories >= 0);
  end if;
end $$;

create table if not exists public.saved_foods (
  id text primary key,
  profile_id text not null,
  name text not null,
  calories integer not null check (calories >= 0),
  protein integer not null check (protein >= 0),
  is_outside_food boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_foods_profile_id_idx
  on public.saved_foods (profile_id);

create table if not exists public.quick_bundles (
  id text primary key,
  profile_id text not null,
  name text not null,
  item_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quick_bundles_profile_id_idx
  on public.quick_bundles (profile_id);

do $$
begin
  begin
    alter table public.saved_foods
      add constraint saved_foods_profile_id_fk
      foreign key (profile_id) references public.profiles(id)
      on delete cascade;
  exception
    when duplicate_object then null;
  end;

  begin
    alter table public.quick_bundles
      add constraint quick_bundles_profile_id_fk
      foreign key (profile_id) references public.profiles(id)
      on delete cascade;
  exception
    when duplicate_object then null;
  end;
end $$;
