-- Le Vivant : base de données pour la sauvegarde en ligne et le classement entre amis.
-- À coller une seule fois dans Supabase : SQL Editor > New query > coller > Run.

-- Profil public : pseudo, nombre de cartes, victoires (visible par les joueurs connectés, pour le classement).
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  pseudo     text not null check (char_length(pseudo) between 1 and 20),
  cards      integer not null default 0,
  wins       integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Collection privée : seule la personne connectée peut lire et modifier la sienne.
create table if not exists public.collections (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles    enable row level security;
alter table public.collections enable row level security;

create policy "classement visible des joueurs connectés" on public.profiles
  for select to authenticated using (true);
create policy "créer son profil" on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy "modifier son profil" on public.profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "lire sa collection" on public.collections
  for select to authenticated using (auth.uid() = user_id);
create policy "créer sa collection" on public.collections
  for insert to authenticated with check (auth.uid() = user_id);
create policy "modifier sa collection" on public.collections
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
