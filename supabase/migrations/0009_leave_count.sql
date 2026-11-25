alter table public.attempts add column if not exists leave_count int not null default 0;
