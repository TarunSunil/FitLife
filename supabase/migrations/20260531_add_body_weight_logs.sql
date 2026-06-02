create table if not exists public.body_weight_logs (
  id text primary key,
  profile_id text not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg < 500),
  logged_on date not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists body_weight_logs_profile_id_idx
  on public.body_weight_logs (profile_id);

create index if not exists body_weight_logs_profile_logged_on_idx
  on public.body_weight_logs (profile_id, logged_on desc);

do $$
begin
  begin
    alter table public.body_weight_logs
      add constraint body_weight_logs_profile_id_fk
      foreign key (profile_id) references public.profiles(id)
      on delete cascade;
  exception
    when duplicate_object then null;
  end;
end $$;

insert into public.body_weight_logs (id, profile_id, weight_kg, logged_on, note, created_at)
values (
  gen_random_uuid()::text,
  'local-profile',
  57.0,
  '2026-05-31',
  'Starting weight',
  now()
) on conflict do nothing;
