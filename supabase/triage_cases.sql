-- Frontera MVP: pre-triage cases.
-- Para MVP se accede desde API server-side con service role. No habilitar
-- lectura/escritura publica con anon key.

create table if not exists public.triage_cases (
  id uuid primary key default gen_random_uuid(),
  case_code text unique not null,
  source text not null,
  source_label text not null,
  patient_label text not null default 'Paciente sin identificar',
  chief_complaint text not null,
  evolution text,
  intensity integer,
  symptoms text[] not null default '{}',
  red_signals text[] not null default '{}',
  priority text not null,
  priority_label text not null,
  recommendation text not null,
  handover jsonb not null,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint triage_cases_priority_check check (
    priority in ('ROJO', 'NARANJA', 'AMARILLO', 'VERDE', 'AZUL')
  ),
  constraint triage_cases_status_check check (
    status in ('waiting', 'in_review', 'attended')
  ),
  constraint triage_cases_intensity_check check (
    intensity is null or intensity between 1 and 10
  )
);

create index if not exists triage_cases_case_code_idx
  on public.triage_cases (case_code);

create index if not exists triage_cases_status_idx
  on public.triage_cases (status);

create index if not exists triage_cases_created_at_idx
  on public.triage_cases (created_at desc);

create index if not exists triage_cases_priority_idx
  on public.triage_cases (priority);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists triage_cases_set_updated_at on public.triage_cases;

create trigger triage_cases_set_updated_at
before update on public.triage_cases
for each row
execute function public.set_updated_at();

alter table public.triage_cases enable row level security;
