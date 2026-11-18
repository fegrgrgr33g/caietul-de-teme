-- =====================================================================
-- Caietul de teme: linkuri pentru părinți și mesaje profesor–elev la fiecare temă.
-- Se rulează DUPĂ liceu.sql.
-- =====================================================================

-- ---------- linkul pentru părinți ----------
-- Elevul creează un link secret (un cod lung, greu de ghicit). Cine are linkul vede doar notele lui, fără cont.
create table if not exists public.linkuri_parinti (
  token     uuid primary key default gen_random_uuid(),
  elev_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  creat_la  timestamptz not null default now()
);
alter table public.linkuri_parinti enable row level security;
drop policy if exists "linkul meu" on public.linkuri_parinti;
create policy "linkul meu" on public.linkuri_parinti for all to authenticated
  using (elev_id = auth.uid()) with check (elev_id = auth.uid());

-- ce vede părintele: numele elevului și, pentru fiecare temă din clasele lui, termenul, starea și nota
create or replace function public.note_parinte(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when l.token is null then null else jsonb_build_object(
    'elev', p.nume,
    'teme', coalesce((
      select jsonb_agg(jsonb_build_object(
               'titlu', t.titlu, 'clasa', c.nume, 'termen', t.termen, 'creat_la', t.creat_la,
               'trimis_la', pr.trimis_la, 'nota', coalesce(pr.nota_profesor, pr.nota), 'status', pr.status,
               'comentariu', pr.comentariu_profesor) order by t.creat_la desc)
      from membri m join clase c on c.id = m.clasa_id join teme t on t.clasa_id = c.id
      left join predari pr on pr.tema_id = t.id and pr.elev_id = l.elev_id
      where m.elev_id = l.elev_id and (t.grupa is null or t.grupa = m.grupa)), '[]'::jsonb)) end
  from (select 1) x
  left join linkuri_parinti l on l.token = p_token
  left join profiles p on p.id = l.elev_id;
$$;
grant execute on function public.note_parinte(uuid) to anon, authenticated;

-- ---------- mesaje la o temă (o conversație pentru fiecare elev și temă) ----------
create table if not exists public.mesaje (
  id        uuid primary key default gen_random_uuid(),
  tema_id   uuid not null references public.teme(id) on delete cascade,
  elev_id   uuid not null references public.profiles(id) on delete cascade,   -- elevul din conversație
  autor_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text      text not null check (length(trim(text)) between 1 and 2000),
  creat_la  timestamptz not null default now()
);
create index if not exists mesaje_tema_elev on public.mesaje (tema_id, elev_id, creat_la);
alter table public.mesaje enable row level security;
drop policy if exists "mesaje vizibile" on public.mesaje;
create policy "mesaje vizibile" on public.mesaje for select to authenticated
  using (elev_id = auth.uid() or public.e_profesorul_clasei(public.clasa_temei(tema_id)));
drop policy if exists "scriu mesaje" on public.mesaje;
create policy "scriu mesaje" on public.mesaje for insert to authenticated
  with check (autor_id = auth.uid() and (
    (elev_id = auth.uid() and public.e_membru(public.clasa_temei(tema_id)))
    or public.e_profesorul_clasei(public.clasa_temei(tema_id))));

select 'gata' as rezultat;
