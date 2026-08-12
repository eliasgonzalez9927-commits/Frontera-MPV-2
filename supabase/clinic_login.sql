-- Frontera MVP: clinic username/password login.
-- Run after supabase/clinic_token_hashes.sql.
-- Replaces the raw "clinic access token" with a real username/password login
-- per clinic/hospital, matching how admin login already works.

alter table public.clinics
  add column if not exists username text,
  add column if not exists password_hash text;

create unique index if not exists clinics_username_idx
  on public.clinics (username)
  where username is not null;

-- The app sets username/password_hash from the admin panel (bcrypt-hashed
-- there, not in SQL) when you create or edit a clinic — nothing to fill in
-- here manually. This migration only adds the columns/index.
