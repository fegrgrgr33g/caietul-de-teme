-- =====================================================================
-- Caietul de teme: ciorne, a doua încercare, comentariile profesorului,
-- poze cu lucrarea scrisă de mână. Se rulează DUPĂ imbunatatiri.sql.
-- =====================================================================

alter table public.teme    add column if not exists a_doua_incercare boolean not null default true;
alter table public.predari add column if not exists comentariu_profesor text;
alter table public.predari add column if not exists incercare int not null default 1;
alter table public.predari add column if not exists prima jsonb;

-- ciorna elevului (se salvează automat cât scrie; o vede doar el)
create table if not exists public.ciorne (
  tema_id    uuid not null references public.teme(id) on delete cascade,
  elev_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  raspunsuri jsonb not null default '{}'::jsonb,
  actualizat timestamptz not null default now(),
  primary key (tema_id, elev_id)
);
alter table public.ciorne enable row level security;
drop policy if exists "ciorna proprie" on public.ciorne;
create policy "ciorna proprie" on public.ciorne for all to authenticated
  using (elev_id = auth.uid())
  with check (elev_id = auth.uid() and public.e_membru(public.clasa_temei(tema_id)));

-- profesorul poate schimba nota finală și comentariul lui; restul lucrării rămâne protejat
create or replace function public.protejeaza_predare()
returns trigger language plpgsql as $$
begin
  if current_setting('app.sistem', true) = 'da'
     or auth.uid() is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.elev_id := auth.uid();
  elsif auth.uid() <> old.elev_id then
    old.nota_profesor := new.nota_profesor;
    old.comentariu_profesor := new.comentariu_profesor;
    return old;
  else
    new.id := old.id; new.tema_id := old.tema_id; new.elev_id := old.elev_id;
    new.incercari := old.incercari;
  end if;
  new.status := 'trimis'; new.nota := null; new.procent := null; new.feedback := null;
  new.eroare := null; new.nota_profesor := null; new.corectat_la := null; new.trimis_la := now();
  new.rezultate := null; new.punctaj := null; new.punctaj_max := null; new.comentariu_profesor := null;
  if tg_op = 'INSERT' then new.incercari := 0; end if;
  return new;
end $$;

-- Trimiterea (prima sau a doua încercare). Pozele vin în p_raspunsuri sub cheia "img:<id exercițiu>",
-- ca listă de căi din spațiul de stocare; se păstrează doar pozele din folderul elevului.
create or replace function public.trimite_raspunsuri(p_tema uuid, p_raspunsuri jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_tema teme; v_pred predari; r jsonb := '{}'::jsonb; ex record; ans text; ok boolean; corect_afisat text; poze jsonb;
begin
  if auth.uid() is null then raise exception 'Trebuie să fii autentificat.'; end if;
  select * into v_tema from teme where id = p_tema;
  if not found or not public.e_membru(v_tema.clasa_id) then raise exception 'Nu ești în clasa acestei teme.'; end if;
  select * into v_pred from predari where tema_id = p_tema and elev_id = auth.uid();
  if found and not (v_tema.a_doua_incercare and v_pred.incercare = 1) then
    raise exception 'Ai folosit toate încercările pentru această temă.';
  end if;

  for ex in
    select e.id, e.tip, e.puncte, e.variante, rc.raspuns as corect, rc.toleranta, rc.exact
    from exercitii e left join raspunsuri_corecte rc on rc.exercitiu_id = e.id
    where e.tema_id = p_tema order by e.ordine
  loop
    ans := left(coalesce(p_raspunsuri ->> ex.id::text, ''), 20000);
    if ex.tip = 'liber' then
      select coalesce(jsonb_agg(x), '[]'::jsonb) into poze
        from jsonb_array_elements_text(coalesce(p_raspunsuri -> ('img:' || ex.id::text), '[]'::jsonb)) x
        where x like auth.uid()::text || '/' || p_tema::text || '/%';
      r := r || jsonb_build_object(ex.id::text, jsonb_build_object('raspuns', ans, 'corect', null, 'puncte', null, 'max', ex.puncte, 'imagini', poze));
    else
      ok := public.verifica_raspuns(ex.tip, ans, ex.corect, ex.toleranta, ex.exact);
      corect_afisat := case when ex.tip = 'grila' then ex.variante[(nullif(ex.corect, ''))::int + 1]
                            else split_part(coalesce(ex.corect, ''), '|', 1) end;
      r := r || jsonb_build_object(ex.id::text, jsonb_build_object(
             'raspuns', ans, 'corect', ok, 'puncte', case when ok then ex.puncte else 0 end, 'max', ex.puncte,
             'raspuns_corect', case when v_tema.elevii_vad then corect_afisat else null end));
    end if;
  end loop;

  perform set_config('app.sistem', 'da', true);
  if v_pred.id is null then
    insert into predari (tema_id, elev_id, raspunsuri, rezultate, status, trimis_la)
      values (p_tema, auth.uid(), p_raspunsuri, r, 'trimis', now()) returning * into v_pred;
  else
    update predari set
      prima = jsonb_build_object('raspunsuri', raspunsuri, 'rezultate', rezultate, 'nota', coalesce(nota_profesor, nota),
                                 'punctaj', punctaj, 'feedback', feedback, 'trimis_la', trimis_la),
      incercare = 2, raspunsuri = p_raspunsuri, rezultate = r, status = 'trimis', nota = null, nota_profesor = null,
      feedback = null, eroare = null, incercari = 0, trimis_la = now()
    where id = v_pred.id returning * into v_pred;
  end if;
  delete from ciorne where tema_id = p_tema and elev_id = auth.uid();
  perform public.recalculeaza_nota(v_pred.id);
  return v_pred.id;
end $$;
revoke execute on function public.trimite_raspunsuri(uuid, jsonb) from public, anon;
grant execute on function public.trimite_raspunsuri(uuid, jsonb) to authenticated;

-- teme cu a doua încercare: profesorul o poate opri la creare
create or replace function public.creeaza_tema(p_clasa uuid, p_titlu text, p_cerinta text, p_termen date,
                                               p_elevii_vad boolean, p_exercitii jsonb, p_a_doua boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid; ex jsonb; e uuid; i int := 0;
begin
  if not public.e_profesorul_clasei(p_clasa) then raise exception 'Poți adăuga teme doar în clasele tale.'; end if;
  if coalesce(trim(p_titlu), '') = '' then raise exception 'Tema are nevoie de un titlu.'; end if;
  if jsonb_array_length(coalesce(p_exercitii, '[]'::jsonb)) = 0 then raise exception 'Adaugă cel puțin un exercițiu.'; end if;
  insert into teme (clasa_id, titlu, cerinta, termen, elevii_vad, a_doua_incercare)
    values (p_clasa, trim(p_titlu), coalesce(p_cerinta, ''), p_termen, coalesce(p_elevii_vad, true), coalesce(p_a_doua, true))
    returning id into t;
  for ex in select value from jsonb_array_elements(p_exercitii) loop
    i := i + 1;
    insert into exercitii (tema_id, ordine, enunt, tip, variante, puncte)
      values (t, i, coalesce(ex ->> 'enunt', ''), ex ->> 'tip',
              coalesce(array(select jsonb_array_elements_text(coalesce(ex -> 'variante', '[]'::jsonb))), '{}'),
              greatest(coalesce((ex ->> 'puncte')::numeric, 1), 0.25))
      returning id into e;
    insert into raspunsuri_corecte (exercitiu_id, tema_id, raspuns, toleranta, exact)
      values (e, t, coalesce(ex ->> 'raspuns', ''), coalesce((ex ->> 'toleranta')::numeric, 0.01),
              coalesce((ex ->> 'exact')::boolean, false));
  end loop;
  return t;
end $$;
drop function if exists public.creeaza_tema(uuid, text, text, date, boolean, jsonb);
revoke execute on function public.creeaza_tema(uuid, text, text, date, boolean, jsonb, boolean) from public, anon;
grant execute on function public.creeaza_tema(uuid, text, text, date, boolean, jsonb, boolean) to authenticated;

select 'gata' as rezultat;
