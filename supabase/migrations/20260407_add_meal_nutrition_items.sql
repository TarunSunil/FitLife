-- Persist item-level nutrition details for AI-analyzed meals.

create table if not exists public.meal_nutrition_items (
  id text primary key,
  meal_log_id text not null,
  profile_id text not null,
  item_name text not null,
  calories integer not null check (calories >= 0),
  protein integer not null check (protein >= 0),
  carbs integer not null check (carbs >= 0),
  fats integer not null check (fats >= 0),
  created_at timestamptz not null default now()
);

create index if not exists meal_nutrition_items_profile_id_idx
  on public.meal_nutrition_items (profile_id);

create index if not exists meal_nutrition_items_meal_log_id_idx
  on public.meal_nutrition_items (meal_log_id);

do $$
begin
  begin
    alter table public.meal_nutrition_items
      add constraint meal_nutrition_items_profile_id_fk
      foreign key (profile_id) references public.profiles(id)
      on delete cascade;
  exception
    when duplicate_object then null;
  end;

  begin
    alter table public.meal_nutrition_items
      add constraint meal_nutrition_items_meal_log_id_fk
      foreign key (meal_log_id) references public.meal_logs(id)
      on delete cascade;
  exception
    when duplicate_object then null;
  end;
end $$;
