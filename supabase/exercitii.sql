-- =====================================================================
-- Caietul de teme: exerciții cu corectare automată
-- Se rulează DUPĂ schema.sql, în Supabase -> SQL Editor.
--   numar / text / grila  -> corectate gratuit de baza de date (răspunsul dat de profesor)
--   liber                 -> corectat de AI (Gemini sau Claude), dacă e configurată o cheie,
--                            altfel de profesor
-- =====================================================================

create table if not exists public.exercitii (
  id        uuid primary key default gen_random_uuid(),
  tema_id   uuid not null references public.teme(id) on delete cascade,
  ordine    int not null default 1,
  enunt     text not null,
  tip       text not null check (tip in ('numar', 'text', 'grila', 'liber')),
  variante  text[] not null default '{}',
  puncte    numeric not null default 1 check (puncte > 0)
);

-- Răspunsurile corecte stau separat: elevii nu le pot citi.
create table if not exists public.raspunsuri_corecte (
  exercitiu_id  uuid primary key references public.exercitii(id) on delete cascade,
  tema_id       uuid not null references public.teme(id) on delete cascade,
  raspuns       text not null default '',
  toleranta     numeric not null default 0.01
);

alter table public.predari add column if not exists raspunsuri  jsonb;
alter table public.predari add column if not exists rezultate   jsonb;
alter table public.predari add column if not exists punctaj     numeric;
alter table public.predari add column if not exists punctaj_max numeric;
alter table public.predari drop constraint if exists predari_status_check;
alter table public.predari add constraint predari_status_check
  check (status in ('trimis', 'in_corectare', 'partial', 'corectat', 'eroare'));

alter table public.exercitii enable row level security;
alter table public.raspunsuri_corecte enable row level security;

drop policy if exists "exercitii vizibile" on public.exercitii;
create policy "exercitii vizibile" on public.exercitii for select to authenticated
  using (public.e_profesorul_clasei(public.clasa_temei(tema_id)) or public.e_membru(public.clasa_temei(tema_id)));
drop policy if exists "raspunsuri doar profesorul" on public.raspunsuri_corecte;
create policy "raspunsuri doar profesorul" on public.raspunsuri_corecte for select to authenticated
  using (public.e_profesorul_clasei(public.clasa_temei(tema_id)));

-- Elevii trimit doar prin funcția trimite_raspunsuri; profesorul poate șterge o lucrare (retrimitere).
drop policy if exists "elevul trimite" on public.predari;
drop policy if exists "elev sau profesor modifica" on public.predari;
drop policy if exists "profesorul modifica lucrari" on public.predari;
create policy "profesorul modifica lucrari" on public.predari for update to authenticated
  using (public.e_profesorul_clasei(public.clasa_temei(tema_id)));
drop policy if exists "profesorul sterge lucrari" on public.predari;
create policy "profesorul sterge lucrari" on public.predari for delete to authenticated
  using (public.e_profesorul_clasei(public.clasa_temei(tema_id)));

-- Protecția notelor: funcțiile de sistem de mai jos marchează tranzacția cu app.sistem = 'da'.
create or replace function public.protejeaza_predare()
returns trigger language plpgsql as $$
declare v numeric(3,1);
begin
  if current_setting('app.sistem', true) = 'da'
     or auth.uid() is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.elev_id := auth.uid();
  elsif auth.uid() <> old.elev_id then
    v := new.nota_profesor;
    old.nota_profesor := v;
    return old;
  else
    new.id := old.id; new.tema_id := old.tema_id; new.elev_id := old.elev_id;
    new.incercari := old.incercari;
  end if;
  new.status := 'trimis'; new.nota := null; new.procent := null; new.feedback := null;
  new.eroare := null; new.nota_profesor := null; new.corectat_la := null; new.trimis_la := now();
  new.rezultate := null; new.punctaj := null; new.punctaj_max := null;
  if tg_op = 'INSERT' then new.incercari := 0; end if;
  return new;
end $$;

-- ---------- Comparare răspunsuri ----------

create or replace function public.normalizeaza(t text)
returns text language sql immutable as $$
  select regexp_replace(translate(lower(trim(coalesce(t, ''))), 'ăâîșşțţ', 'aaisstt'), '\s+', ' ', 'g');
$$;

create or replace function public.ca_numar(t text)
returns numeric language plpgsql immutable as $$
declare s text := replace(replace(trim(coalesce(t, '')), ' ', ''), ',', '.'); p text[];
begin
  if s ~ '^-?\d+(\.\d+)?$' then return s::numeric; end if;
  if s ~ '^-?\d+(\.\d+)?/-?\d+(\.\d+)?$' then
    p := string_to_array(s, '/');
    if p[2]::numeric = 0 then return null; end if;
    return p[1]::numeric / p[2]::numeric;
  end if;
  return null;
end $$;

create or replace function public.verifica_raspuns(p_tip text, p_ans text, p_corect text, p_tol numeric)
returns boolean language plpgsql immutable as $$
declare opt text; a numeric; b numeric;
begin
  if coalesce(trim(p_ans), '') = '' then return false; end if;
  if p_tip = 'grila' then return trim(p_ans) = trim(coalesce(p_corect, '')); end if;
  foreach opt in array string_to_array(coalesce(p_corect, ''), '|') loop
    if p_tip = 'numar' then
      a := public.ca_numar(p_ans); b := public.ca_numar(opt);
      if a is not null and b is not null and abs(a - b) <= coalesce(p_tol, 0.01) then return true; end if;
    elsif public.normalizeaza(p_ans) = public.normalizeaza(opt) then
      return true;
    end if;
  end loop;
  return false;
end $$;

-- ---------- Nota din punctaj ----------

create or replace function public.recalculeaza_nota(p uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v predari; tot numeric; mx numeric; pend boolean;
begin
  select * into v from predari where id = p;
  if not found then return; end if;
  select coalesce(sum(puncte), 0) into mx from exercitii where tema_id = v.tema_id;
  select coalesce(sum(case when jsonb_typeof(value -> 'puncte') = 'number' then (value ->> 'puncte')::numeric else 0 end), 0),
         coalesce(bool_or(jsonb_typeof(value -> 'puncte') is distinct from 'number'), false)
    into tot, pend
    from jsonb_each(coalesce(v.rezultate, '{}'::jsonb));
  perform set_config('app.sistem', 'da', true);
  update predari set
    punctaj = tot, punctaj_max = mx,
    procent = case when mx = 0 then null else round(100 * tot / mx) end,
    nota    = case when pend or mx = 0 then null else greatest(1, round(10 * tot / mx, 1)) end,
    status  = case when pend then 'partial' else 'corectat' end,
    corectat_la = case when pend then null else now() end
  where id = p;
end $$;
revoke execute on function public.recalculeaza_nota(uuid) from public, anon, authenticated;
grant execute on function public.recalculeaza_nota(uuid) to service_role;

-- ---------- Profesorul creează tema cu exerciții ----------

create or replace function public.creeaza_tema(p_clasa uuid, p_titlu text, p_cerinta text, p_termen date,
                                               p_elevii_vad boolean, p_exercitii jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid; ex jsonb; e uuid; i int := 0;
begin
  if not public.e_profesorul_clasei(p_clasa) then raise exception 'Poți adăuga teme doar în clasele tale.'; end if;
  if coalesce(trim(p_titlu), '') = '' then raise exception 'Tema are nevoie de un titlu.'; end if;
  if jsonb_array_length(coalesce(p_exercitii, '[]'::jsonb)) = 0 then raise exception 'Adaugă cel puțin un exercițiu.'; end if;
  insert into teme (clasa_id, titlu, cerinta, termen, elevii_vad)
    values (p_clasa, trim(p_titlu), coalesce(p_cerinta, ''), p_termen, coalesce(p_elevii_vad, true))
    returning id into t;
  for ex in select value from jsonb_array_elements(p_exercitii) loop
    i := i + 1;
    insert into exercitii (tema_id, ordine, enunt, tip, variante, puncte)
      values (t, i, coalesce(ex ->> 'enunt', ''), ex ->> 'tip',
              coalesce(array(select jsonb_array_elements_text(coalesce(ex -> 'variante', '[]'::jsonb))), '{}'),
              greatest(coalesce((ex ->> 'puncte')::numeric, 1), 0.25))
      returning id into e;
    insert into raspunsuri_corecte (exercitiu_id, tema_id, raspuns, toleranta)
      values (e, t, coalesce(ex ->> 'raspuns', ''), coalesce((ex ->> 'toleranta')::numeric, 0.01));
  end loop;
  return t;
end $$;
revoke execute on function public.creeaza_tema(uuid, text, text, date, boolean, jsonb) from public, anon;
grant execute on function public.creeaza_tema(uuid, text, text, date, boolean, jsonb) to authenticated;

-- ---------- Elevul trimite răspunsurile: corectare automată pe loc ----------

create or replace function public.trimite_raspunsuri(p_tema uuid, p_raspunsuri jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_tema teme; v_pred predari; r jsonb := '{}'::jsonb; ex record; ans text; ok boolean; corect_afisat text;
begin
  if auth.uid() is null then raise exception 'Trebuie să fii autentificat.'; end if;
  select * into v_tema from teme where id = p_tema;
  if not found or not public.e_membru(v_tema.clasa_id) then raise exception 'Nu ești în clasa acestei teme.'; end if;
  select * into v_pred from predari where tema_id = p_tema and elev_id = auth.uid();
  if found then raise exception 'Ai trimis deja această temă. Cere-i profesorului să-ți permită retrimiterea.'; end if;

  for ex in
    select e.id, e.tip, e.puncte, e.variante, rc.raspuns as corect, rc.toleranta
    from exercitii e left join raspunsuri_corecte rc on rc.exercitiu_id = e.id
    where e.tema_id = p_tema order by e.ordine
  loop
    ans := left(coalesce(p_raspunsuri ->> ex.id::text, ''), 5000);
    if ex.tip = 'liber' then
      r := r || jsonb_build_object(ex.id::text, jsonb_build_object('raspuns', ans, 'corect', null, 'puncte', null, 'max', ex.puncte));
    else
      ok := public.verifica_raspuns(ex.tip, ans, ex.corect, ex.toleranta);
      corect_afisat := case when ex.tip = 'grila' then ex.variante[(nullif(ex.corect, ''))::int + 1]
                            else split_part(coalesce(ex.corect, ''), '|', 1) end;
      r := r || jsonb_build_object(ex.id::text, jsonb_build_object(
             'raspuns', ans, 'corect', ok, 'puncte', case when ok then ex.puncte else 0 end, 'max', ex.puncte,
             'raspuns_corect', case when v_tema.elevii_vad then corect_afisat else null end));
    end if;
  end loop;

  perform set_config('app.sistem', 'da', true);
  insert into predari (tema_id, elev_id, raspunsuri, rezultate, status, trimis_la)
    values (p_tema, auth.uid(), p_raspunsuri, r, 'trimis', now())
    returning * into v_pred;
  perform public.recalculeaza_nota(v_pred.id);
  return v_pred.id;
end $$;
revoke execute on function public.trimite_raspunsuri(uuid, jsonb) from public, anon;
grant execute on function public.trimite_raspunsuri(uuid, jsonb) to authenticated;

-- ---------- Profesorul schimbă punctajul unui exercițiu ----------

create or replace function public.seteaza_puncte(p_predare uuid, p_exercitiu uuid, p_puncte numeric, p_comentariu text)
returns void language plpgsql security definer set search_path = public as $$
declare v predari; mx numeric;
begin
  select * into v from predari where id = p_predare;
  if not found or not public.e_profesorul_clasei(public.clasa_temei(v.tema_id)) then
    raise exception 'Doar profesorul clasei poate schimba punctajul.';
  end if;
  select puncte into mx from exercitii where id = p_exercitiu and tema_id = v.tema_id;
  if mx is null then raise exception 'Exercițiul nu face parte din această temă.'; end if;
  perform set_config('app.sistem', 'da', true);
  update predari set rezultate = jsonb_set(
      coalesce(rezultate, '{}'::jsonb), array[p_exercitiu::text],
      coalesce(rezultate -> p_exercitiu::text, '{}'::jsonb) || jsonb_build_object(
        'puncte', least(greatest(p_puncte, 0), mx), 'max', mx, 'corect', p_puncte >= mx,
        'comentariu', coalesce(p_comentariu, rezultate -> p_exercitiu::text ->> 'comentariu'), 'de_profesor', true))
    where id = p_predare;
  perform public.recalculeaza_nota(p_predare);
end $$;
revoke execute on function public.seteaza_puncte(uuid, uuid, numeric, text) from public, anon;
grant execute on function public.seteaza_puncte(uuid, uuid, numeric, text) to authenticated;
