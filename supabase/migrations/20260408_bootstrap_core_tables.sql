-- Bootstrap core FitLife tables required by downstream nutrition migrations.
-- Run this first on projects that do not already have profiles/workout_logs.

create table if not exists public.profiles (
  id text primary key,
  has_squat_rack boolean not null default true,
  has_pullup_bar boolean not null default true,
  has_bench boolean not null default true,
  has_fridge boolean not null default true,
  has_kettle boolean not null default true,
  max_db_weight_kg integer not null default 30 check (max_db_weight_kg >= 1 and max_db_weight_kg <= 200),
  target_calories integer not null default 2200 check (target_calories >= 900 and target_calories <= 7000),
  target_protein integer not null default 160 check (target_protein >= 30 and target_protein <= 400),
  hidden_calorie_buffer_percent integer not null default 10 check (hidden_calorie_buffer_percent >= 0 and hidden_calorie_buffer_percent <= 30),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id text primary key,
  profile_id text not null,
  exercise text not null,
  weight_kg integer not null check (weight_kg >= 0 and weight_kg <= 500),
  reps integer not null check (reps >= 1 and reps <= 100),
  tempo text not null,
  performed_at timestamptz not null default now()
);

create index if not exists workout_logs_profile_id_idx
  on public.workout_logs (profile_id);

create index if not exists workout_logs_profile_performed_at_idx
  on public.workout_logs (profile_id, performed_at desc);

do $$
begin
  begin
    alter table public.workout_logs
      add constraint workout_logs_profile_id_fk
      foreign key (profile_id) references public.profiles(id)
      on delete cascade;
  exception
    when duplicate_object then null;
  end;
end $$;

insert into public.profiles (
  id,
  has_squat_rack,
  has_pullup_bar,
  has_bench,
  has_fridge,
  has_kettle,
  max_db_weight_kg,
  target_calories,
  target_protein,
  hidden_calorie_buffer_percent,
  updated_at
)
values (
  'local-profile',
  true,
  true,
  true,
  true,
  true,
  30,
  2200,
  160,
  10,
  now()
)
on conflict (id) do nothing;
