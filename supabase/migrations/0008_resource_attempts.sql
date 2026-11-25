alter table public.resources add column if not exists max_attempts int not null default 1;
