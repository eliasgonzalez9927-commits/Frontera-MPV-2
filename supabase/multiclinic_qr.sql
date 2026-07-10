-- Frontera MVP: multi-clinic QR support.
-- El access_token demo es solo para desarrollo local. Cambiar antes de
-- cualquier prueba real con una clinica.
-- No crear policies publicas amplias: las APIs server-side usan service role.

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  access_token text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clinics enable row level security;

alter table public.triage_cases
  add column if not exists clinic_id uuid references public.clinics(id),
  add column if not exists clinic_slug text;

create index if not exists clinics_slug_idx
  on public.clinics (slug);

create index if not exists triage_cases_clinic_id_idx
  on public.triage_cases (clinic_id);

create index if not exists triage_cases_clinic_slug_idx
  on public.triage_cases (clinic_slug);

drop trigger if exists clinics_set_updated_at on public.clinics;

create trigger clinics_set_updated_at
before update on public.clinics
for each row
execute function public.set_updated_at();

insert into public.clinics (name, slug, access_token, is_active)
values (
  'Clínica Demo Frontera',
  'clinica-demo',
  'demo-clinic-token-change-me',
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  access_token = excluded.access_token,
  is_active = excluded.is_active,
  updated_at = now();
