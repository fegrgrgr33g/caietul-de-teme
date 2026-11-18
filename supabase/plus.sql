-- =====================================================================
-- Caietul de teme: anunțuri pentru clasă, teme programate, ciorne de teme și teme cu timp limită.
-- Se rulează DUPĂ parinti_mesaje.sql.
-- =====================================================================

-- anunțul clasei (îl văd elevii pe pagina Acasă)
alter table public.clase add column if not exists anunt text check (anunt is null or length(anunt) <= 1000);
alter table public.clase add column if not exists anunt_la timestamptz;

-- teme: ciornă (n-o văd elevii), programată (apare la o dată), timp limită (în minute)
alter table public.teme add column if not exists ciorna boolean not null default false;
alter table public.teme add column if not exists publicata_la timestamptz;
alter table public.teme add column if not exists minute int check (minute is null or minute between 1 and 600);

-- o temă e „vizibilă pentru elevi” dacă nu e ciornă și i-a venit data
create or replace function public.tema_vizibila(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from teme where id = t and not ciorna and (publicata_la is null or publicata_la <= now()));
$$;

drop policy if exists "teme vizibile" on public.teme;
create policy "teme vizibile" on public.teme for select to authenticated
  using (public.e_profesorul_clasei(clasa_id)
    or (public.e_membru(clasa_id) and not ciorna and (publicata_la is null or publicata_la <= now())));

drop policy if exists "exercitii vizibile" on public.exercitii;
create policy "exercitii vizibile" on public.exercitii for select to authenticated
  using (public.e_profesorul_clasei(public.clasa_temei(tema_id))
    or (public.e_membru(public.clasa_temei(tema_id)) and public.tema_vizibila(tema_id)));

select 'gata' as rezultat;
