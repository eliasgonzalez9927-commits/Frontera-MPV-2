-- Frontera MVP: clinic team accounts (replaces the single-token-per-clinic
-- and single-username-per-clinic approaches with real multi-user login).
-- Run this instead of any earlier draft of this file — it supersedes it.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.clinic_users (
  id uuid primary key default extensions.gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  username text not null unique,
  password_hash text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinic_users_clinic_id_idx
  on public.clinic_users (clinic_id);

-- Nothing to fill in manually — the app creates the first "admin" account
-- for a clinic when you create it from /admin/clinicas, and that clinic
-- admin can add staff accounts from there on.
