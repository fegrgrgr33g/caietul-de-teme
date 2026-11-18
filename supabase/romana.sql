-- =====================================================================
-- Caietul de teme: ajustări pentru Limba și literatura română
-- Se rulează DUPĂ schema.sql și exercitii.sql.
--   * „scriere exactă” la exercițiile de tip text: contează diacriticele,
--     majusculele și punctuația (pentru ortografie / ortogramă)
--   * răspunsuri lungi (compuneri, eseuri): până la 20.000 de caractere
-- =====================================================================

alter table public.raspunsuri_corecte add column if not exists exact boolean not null default false;

create or replace function public.verifica_raspuns(p_tip text, p_ans text, p_corect text, p_tol numeric, p_exact boolean)
returns boolean language plpgsql immutable as $$
declare opt text; a numeric; b numeric;
begin
  if coalesce(trim(p_ans), '') = '' then return false; end if;
  if p_tip = 'grila' then return trim(p_ans) = trim(coalesce(p_corect, '')); end if;
  foreach opt in array string_to_array(coalesce(p_corect, ''), '|') loop
    if p_tip = 'numar' then
      a := public.ca_numar(p_ans); b := public.ca_numar(opt);
      if a is not null and b is not null and abs(a - b) <= coalesce(p_tol, 0.01) then return true; end if;
    elsif coalesce(p_exact, false) then
      -- doar spațiile în plus nu contează; ș/ş și ț/ţ sunt considerate la fel
      if regexp_replace(translate(trim(p_ans), 'şţŞŢ', 'șțȘȚ'), '\s+', ' ', 'g')
       = regexp_replace(translate(trim(opt), 'şţŞŢ', 'șțȘȚ'), '\s+', ' ', 'g') then return true; end if;
    elsif public.normalizeaza(p_ans) = public.normalizeaza(opt) then
      return true;
    end if;
  end loop;
  return false;
end $$;

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
    insert into raspunsuri_corecte (exercitiu_id, tema_id, raspuns, toleranta, exact)
      values (e, t, coalesce(ex ->> 'raspuns', ''), coalesce((ex ->> 'toleranta')::numeric, 0.01),
              coalesce((ex ->> 'exact')::boolean, false));
  end loop;
  return t;
end $$;

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
    select e.id, e.tip, e.puncte, e.variante, rc.raspuns as corect, rc.toleranta, rc.exact
    from exercitii e left join raspunsuri_corecte rc on rc.exercitiu_id = e.id
    where e.tema_id = p_tema order by e.ordine
  loop
    ans := left(coalesce(p_raspunsuri ->> ex.id::text, ''), 20000);
    if ex.tip = 'liber' then
      r := r || jsonb_build_object(ex.id::text, jsonb_build_object('raspuns', ans, 'corect', null, 'puncte', null, 'max', ex.puncte));
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
  insert into predari (tema_id, elev_id, raspunsuri, rezultate, status, trimis_la)
    values (p_tema, auth.uid(), p_raspunsuri, r, 'trimis', now())
    returning * into v_pred;
  perform public.recalculeaza_nota(v_pred.id);
  return v_pred.id;
end $$;

-- verificare (trebuie să iasă toate true)
select public.verifica_raspuns('text', 'înțelege', 'înțelege', 0.01, true) as exact_bun,
       not public.verifica_raspuns('text', 'intelege', 'înțelege', 0.01, true) as exact_fara_diacritice_respins,
       public.verifica_raspuns('text', 'înţelege', 'înțelege', 0.01, true) as sedila_acceptata,
       public.verifica_raspuns('text', 'Intelege', 'înțelege', 0.01, false) as liber_fara_diacritice;
