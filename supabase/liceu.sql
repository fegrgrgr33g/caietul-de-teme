-- =====================================================================
-- Caietul de teme: liceu – unități din programă, grupe (uman / real), banca de subiecte.
-- Se rulează DUPĂ noutati.sql.
-- =====================================================================

alter table public.teme   add column if not exists unitate text;
alter table public.teme   add column if not exists grupa text check (grupa in ('uman', 'real'));
alter table public.membri add column if not exists grupa text check (grupa in ('uman', 'real'));

-- profesorul pune elevii în grupe
drop policy if exists "profesorul schimba grupa" on public.membri;
create policy "profesorul schimba grupa" on public.membri for update to authenticated
  using (public.e_profesorul_clasei(clasa_id)) with check (public.e_profesorul_clasei(clasa_id));

-- banca de subiecte a fiecărui profesor (subiecte importate, refolosibile în orice clasă)
create table if not exists public.banca (
  id          uuid primary key default gen_random_uuid(),
  profesor_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  titlu       text not null,
  continut    jsonb not null,
  creat_la    timestamptz not null default now()
);
alter table public.banca enable row level security;
drop policy if exists "banca proprie" on public.banca;
create policy "banca proprie" on public.banca for all to authenticated
  using (profesor_id = auth.uid()) with check (profesor_id = auth.uid() and public.e_profesor());

select 'gata' as rezultat;
