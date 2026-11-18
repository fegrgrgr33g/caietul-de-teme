-- =====================================================================
-- Caietul de teme: clasament, avatare, copierea temelor
-- Se rulează DUPĂ schema.sql, exercitii.sql și romana.sql.
-- =====================================================================

-- profesorul alege dacă în clasament apar numele elevilor sau „Elev 1, Elev 2…”
alter table public.clase add column if not exists arata_nume boolean not null default true;

-- avatarul ales de elev (un cod scurt, ex. „a3”)
alter table public.profiles add column if not exists avatar text not null default '';
revoke update on public.profiles from authenticated;
grant update (nume, avatar) on public.profiles to authenticated;

-- Clasamentul unei clase: XP = punctaj × 10 + 20 pentru fiecare temă trimisă (la fel ca în site).
create or replace function public.clasament(p_clasa uuid)
returns table (elev_id uuid, nume text, avatar text, xp int, teme int, media numeric, eu boolean)
language sql stable security definer set search_path = public as $$
  with date as (
    select m.elev_id, m.intrat_la, p.nume, p.avatar, c.arata_nume, c.profesor_id,
           coalesce(sum(coalesce(pr.punctaj, 0)), 0) as pct, count(pr.id) as nr,
           avg(coalesce(pr.nota_profesor, pr.nota)) as med
    from clase c
    join membri m on m.clasa_id = c.id
    join profiles p on p.id = m.elev_id
    left join teme t on t.clasa_id = c.id
    left join predari pr on pr.tema_id = t.id and pr.elev_id = m.elev_id
    where c.id = p_clasa and (public.e_membru(c.id) or c.profesor_id = auth.uid())
    group by m.elev_id, m.intrat_la, p.nume, p.avatar, c.arata_nume, c.profesor_id
  )
  select elev_id,
         case when arata_nume or elev_id = auth.uid() or profesor_id = auth.uid() then nume
              else 'Elev ' || row_number() over (order by intrat_la) end,
         avatar,
         round(pct * 10 + nr * 20)::int,
         nr::int,
         round(med, 2),
         elev_id = auth.uid()
  from date
  order by 4 desc, 2;
$$;
revoke execute on function public.clasament(uuid) from public, anon;
grant execute on function public.clasament(uuid) to authenticated;

-- Profesorul copiază o temă (cu exerciții și răspunsuri) în altă clasă a lui.
create or replace function public.copiaza_tema(p_tema uuid, p_clasa uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare t teme; nou uuid; ex record; e uuid;
begin
  select * into t from teme where id = p_tema;
  if not found or not public.e_profesorul_clasei(t.clasa_id) or not public.e_profesorul_clasei(p_clasa) then
    raise exception 'Poți copia teme doar între clasele tale.';
  end if;
  insert into teme (clasa_id, titlu, cerinta, barem, termen, elevii_vad)
    values (p_clasa, t.titlu, t.cerinta, t.barem, t.termen, t.elevii_vad) returning id into nou;
  for ex in
    select x.ordine, x.enunt, x.tip, x.variante, x.puncte, rc.raspuns, rc.toleranta, rc.exact
    from exercitii x left join raspunsuri_corecte rc on rc.exercitiu_id = x.id
    where x.tema_id = p_tema order by x.ordine
  loop
    insert into exercitii (tema_id, ordine, enunt, tip, variante, puncte)
      values (nou, ex.ordine, ex.enunt, ex.tip, ex.variante, ex.puncte) returning id into e;
    insert into raspunsuri_corecte (exercitiu_id, tema_id, raspuns, toleranta, exact)
      values (e, nou, coalesce(ex.raspuns, ''), coalesce(ex.toleranta, 0.01), coalesce(ex.exact, false));
  end loop;
  return nou;
end $$;
revoke execute on function public.copiaza_tema(uuid, uuid) from public, anon;
grant execute on function public.copiaza_tema(uuid, uuid) to authenticated;
