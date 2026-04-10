-- Add planner macro fields and meal ingredients persistence.

alter table if exists public.meal_logs
  add column if not exists ingredients text[] not null default '{}';

alter table if exists public.weekly_plan
  add column if not exists calories integer not null default 0;

alter table if exists public.weekly_plan
  add column if not exists protein integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'weekly_plan'
  ) then
    return;
  end if;

  begin
    alter table public.weekly_plan
      add constraint weekly_plan_calories_non_negative_chk
      check (calories >= 0) not valid;
  exception
    when duplicate_object then null;
  end;

  begin
    alter table public.weekly_plan
      add constraint weekly_plan_protein_non_negative_chk
      check (protein >= 0) not valid;
  exception
    when duplicate_object then null;
  end;
end $$;

alter table if exists public.weekly_plan
  validate constraint weekly_plan_calories_non_negative_chk;

alter table if exists public.weekly_plan
  validate constraint weekly_plan_protein_non_negative_chk;
