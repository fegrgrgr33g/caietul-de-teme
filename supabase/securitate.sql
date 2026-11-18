-- =====================================================================
-- Caietul de teme: verificări de securitate în plus. Se rulează DUPĂ plus.sql.
-- =====================================================================

-- Un elev nu poate trimite (sau retrimite) o temă care e ciornă sau programată pentru mai târziu,
-- nici direct în tabel, nici prin funcția trimite_raspunsuri. Profesorul și sistemul (corectarea AI) nu sunt afectați.
create or replace function public.verifica_tema_vizibila()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.elev_id = auth.uid()
     and not public.e_profesorul_clasei(public.clasa_temei(new.tema_id))
     and not public.tema_vizibila(new.tema_id) then
    raise exception 'Tema nu este încă disponibilă.';
  end if;
  return new;
end $$;
drop trigger if exists predare_tema_vizibila on public.predari;
create trigger predare_tema_vizibila before insert or update on public.predari
  for each row execute function public.verifica_tema_vizibila();

-- la fel pentru ciorne și mesaje: doar la teme pe care elevul le vede
drop policy if exists "ciorna proprie" on public.ciorne;
create policy "ciorna proprie" on public.ciorne for all to authenticated
  using (elev_id = auth.uid())
  with check (elev_id = auth.uid() and public.e_membru(public.clasa_temei(tema_id)) and public.tema_vizibila(tema_id));

drop policy if exists "scriu mesaje" on public.mesaje;
create policy "scriu mesaje" on public.mesaje for insert to authenticated
  with check (autor_id = auth.uid() and (
    (elev_id = auth.uid() and public.e_membru(public.clasa_temei(tema_id)) and public.tema_vizibila(tema_id))
    or public.e_profesorul_clasei(public.clasa_temei(tema_id))));

-- funcțiile ajutătoare folosite de reguli nu trebuie apelate de vizitatori fără cont (anon);
-- utilizatorii autentificați le păstrează (regulile RLS au nevoie de ele). note_parinte rămâne publică.
revoke execute on function public.e_profesor() from public, anon;
revoke execute on function public.e_profesorul_clasei(uuid) from public, anon;
revoke execute on function public.e_membru(uuid) from public, anon;
revoke execute on function public.clasa_temei(uuid) from public, anon;
revoke execute on function public.vede_profilul(uuid) from public, anon;
revoke execute on function public.tema_vizibila(uuid) from public, anon;
grant execute on function public.e_profesor(), public.e_profesorul_clasei(uuid), public.e_membru(uuid),
  public.clasa_temei(uuid), public.vede_profilul(uuid), public.tema_vizibila(uuid) to authenticated;

-- pagina pentru părinți: doar temele publicate (fără ciorne și fără cele programate pentru mai târziu)
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
      where m.elev_id = l.elev_id and (t.grupa is null or t.grupa = m.grupa)
        and not t.ciorna and (t.publicata_la is null or t.publicata_la <= now())), '[]'::jsonb)) end
  from (select 1) x
  left join linkuri_parinti l on l.token = p_token
  left join profiles p on p.id = l.elev_id;
$$;
grant execute on function public.note_parinte(uuid) to anon, authenticated;

select 'gata' as rezultat;
