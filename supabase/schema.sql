-- ============================================================
-- VENTES DU JOUR — OPTIC CITY
-- À coller tel quel dans Supabase → SQL Editor → Run.
-- ============================================================

-- Table des ventes
create table if not exists public.ventes (
  id text primary key,
  day date not null,
  created_at timestamptz not null default now(),
  client text not null default '',
  type text not null check (type in ('lunettes', 'lentilles')),
  price numeric not null default 0,
  mutuelle numeric not null default 0,
  mutuelle_nom text not null default '',
  plateforme text not null default '',
  reste numeric not null default 0,
  vendor text not null default '',
  teletrans boolean not null default false,
  teletrans_at timestamptz,
  payments jsonb not null default '[]'::jsonb
);

create index if not exists ventes_day_idx on public.ventes (day desc);

-- Réglages (une seule ligne : vendeurs, moyens de paiement, code d'accès)
create table if not exists public.reglages (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb
);

insert into public.reglages (id, data) values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- Sécurité : accès via la clé anon de l'app uniquement.
-- (App interne au magasin, protégée par le code d'accès à l'écran.)
alter table public.ventes enable row level security;
alter table public.reglages enable row level security;

drop policy if exists "acces app ventes" on public.ventes;
create policy "acces app ventes" on public.ventes
  for all using (true) with check (true);

drop policy if exists "acces app reglages" on public.reglages;
create policy "acces app reglages" on public.reglages
  for all using (true) with check (true);

-- Temps réel : publier les changements aux autres postes
alter publication supabase_realtime add table public.ventes;
alter publication supabase_realtime add table public.reglages;
