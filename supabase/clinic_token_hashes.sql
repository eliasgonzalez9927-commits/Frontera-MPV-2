-- Frontera MVP: clinic token hardening.
-- Run after supabase/multiclinic_qr.sql.
-- This lets real clinics use hashed access tokens instead of plaintext tokens.
-- Do not paste real tokens into SQL saved in git.

create extension if not exists pgcrypto with schema extensions;

alter table public.clinics
  add column if not exists access_token_hash text;

alter table public.clinics
  alter column access_token drop not null;

create unique index if not exists clinics_access_token_hash_idx
  on public.clinics (access_token_hash)
  where access_token_hash is not null;

update public.clinics
set access_token_hash = encode(extensions.digest(access_token, 'sha256'), 'hex')
where access_token is not null
  and access_token_hash is null;

-- Optional cleanup after verifying the hashed token works:
-- update public.clinics
-- set access_token = null
-- where access_token_hash is not null;

-- Template for a real clinic.
-- 1. Generate a token locally and keep it outside this repo/chat.
-- 2. Generate its SHA-256 hash locally.
-- 3. Replace the placeholders below in Supabase SQL Editor.
--
-- insert into public.clinics (name, slug, access_token_hash, is_active)
-- values (
--   'NOMBRE PUBLICO DE LA CLINICA',
--   'slug-publico-de-la-clinica',
--   'SHA256_HASH_DEL_TOKEN',
--   true
-- )
-- on conflict (slug) do update
-- set
--   name = excluded.name,
--   access_token_hash = excluded.access_token_hash,
--   access_token = null,
--   is_active = excluded.is_active,
--   updated_at = now();
