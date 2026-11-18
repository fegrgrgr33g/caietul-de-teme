-- =====================================================================
-- Caietul de teme: baza de date (Supabase / PostgreSQL)
-- Rulează tot acest fișier o singură dată în Supabase -> SQL Editor.
-- =====================================================================

-- ---------- Tabele ----------

create table if not exists public.profiles (
  id        uuid primary key references auth.users on delete cascade,
  nume      text not null,
  rol       text not null check (rol in ('elev', 'profesor')),
  creat_la  timestamptz not null default now()
);

create table if not exists public.clase (
  id           uuid primary key default gen_random_uuid(),
  nume         text not null,
  cod          text not null unique,
  profesor_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  creat_la     timestamptz not null default now()
);

create table if not exists public.membri (
  clasa_id  uuid not null references public.clase(id) on delete cascade,
  elev_id   uuid not null references public.profiles(id) on delete cascade,
  intrat_la timestamptz not null default now(),
  primary key (clasa_id, elev_id)
);

create table if not exists public.teme (
  id          uuid primary key default gen_random_uuid(),
  clasa_id    uuid not null references public.clase(id) on delete cascade,
  titlu       text not null,
  cerinta     text not null,
  barem       text not null default '',
  termen      date,
  elevii_vad  boolean not null default true,
  creat_la    timestamptz not null default now()
);

create table if not exists public.predari (
  id             uuid primary key default gen_random_uuid(),
  tema_id        uuid not null references public.teme(id) on delete cascade,
  elev_id        uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text           text not null default '' check (length(text) <= 60000),
  imagini        text[] not null default '{}' check (cardinality(imagini) <= 5),
  status         text not null default 'trimis' check (status in ('trimis', 'in_corectare', 'corectat', 'eroare')),
  nota           numeric(3,1),
  procent        int,
  feedback       jsonb,
  eroare         text,
  nota_profesor  numeric(3,1) check (nota_profesor between 1 and 10),
  incercari      int not null default 0,
  trimis_la      timestamptz not null default now(),
  corectat_la    timestamptz,
  unique (tema_id, elev_id)
);

-- ---------- Cont nou -> profil (nume și rol din formularul de înregistrare) ----------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nume, rol) values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nume'), ''), split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'rol' = 'profesor' then 'profesor' else 'elev' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Funcții ajutătoare pentru reguli (evită bucle între reguli) ----------

create or replace function public.e_profesor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and rol = 'profesor');
$$;

create or replace function public.e_profesorul_clasei(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from clase where id = c and profesor_id = auth.uid());
$$;

create or replace function public.e_membru(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from membri where clasa_id = c and elev_id = auth.uid());
$$;

create or replace function public.clasa_temei(t uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select clasa_id from teme where id = t;
$$;

-- Un profil se vede de: proprietarul lui, profesorul elevului, elevii profesorului.
create or replace function public.vede_profilul(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p = auth.uid() or exists (
    select 1 from membri m join clase c on c.id = m.clasa_id
    where (m.elev_id = p and c.profesor_id = auth.uid())
       or (c.profesor_id = p and m.elev_id = auth.uid())
  );
$$;

-- Elevul intră într-o clasă cu codul primit de la profesor.
create or replace function public.intra_in_clasa(p_cod text)
returns uuid language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if auth.uid() is null then raise exception 'Trebuie să fii autentificat.'; end if;
  select id into c from clase where upper(cod) = upper(trim(p_cod));
  if c is null then raise exception 'Nu există nicio clasă cu acest cod.'; end if;
  insert into membri (clasa_id, elev_id) values (c, auth.uid()) on conflict do nothing;
  return c;
end $$;

revoke execute on function public.intra_in_clasa(text) from public, anon;
grant execute on function public.intra_in_clasa(text) to authenticated;

-- ---------- Protecția notelor ----------
-- Elevul poate trimite doar textul și imaginile; nota și corectura le scrie numai
-- funcția de corectare (cheia de server). Profesorul poate schimba doar nota_profesor.

create or replace function public.protejeaza_predare()
returns trigger language plpgsql as $$
declare v numeric(3,1);
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;  -- funcția de corectare sau SQL Editor
  end if;

  if tg_op = 'INSERT' then
    new.elev_id := auth.uid();
  elsif auth.uid() <> old.elev_id then
    -- profesorul: păstrează totul în afară de nota proprie
    v := new.nota_profesor;
    old.nota_profesor := v;
    return old;
  else
    new.id := old.id; new.tema_id := old.tema_id; new.elev_id := old.elev_id;
    new.incercari := old.incercari;
  end if;

  -- elevul a trimis (din nou) tema: corectura veche se șterge
  new.status := 'trimis'; new.nota := null; new.procent := null; new.feedback := null;
  new.eroare := null; new.nota_profesor := null; new.corectat_la := null; new.trimis_la := now();
  if tg_op = 'INSERT' then new.incercari := 0; end if;
  return new;
end $$;

drop trigger if exists protejeaza_predare on public.predari;
create trigger protejeaza_predare
  before insert or update on public.predari
  for each row execute function public.protejeaza_predare();

-- ---------- Reguli de acces (Row Level Security) ----------

alter table public.profiles enable row level security;
alter table public.clase    enable row level security;
alter table public.membri   enable row level security;
alter table public.teme     enable row level security;
alter table public.predari  enable row level security;

drop policy if exists "profil vizibil" on public.profiles;
create policy "profil vizibil" on public.profiles for select to authenticated using (public.vede_profilul(id));
drop policy if exists "profil propriu" on public.profiles;
create policy "profil propriu" on public.profiles for update to authenticated using (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (nume) on public.profiles to authenticated;   -- rolul nu se poate schimba din site

drop policy if exists "clase vizibile" on public.clase;
create policy "clase vizibile" on public.clase for select to authenticated
  using (profesor_id = auth.uid() or public.e_membru(id));
drop policy if exists "profesorul creează clase" on public.clase;
create policy "profesorul creează clase" on public.clase for insert to authenticated
  with check (profesor_id = auth.uid() and public.e_profesor());
drop policy if exists "profesorul își modifică clasele" on public.clase;
create policy "profesorul își modifică clasele" on public.clase for update to authenticated using (profesor_id = auth.uid());
drop policy if exists "profesorul își șterge clasele" on public.clase;
create policy "profesorul își șterge clasele" on public.clase for delete to authenticated using (profesor_id = auth.uid());

drop policy if exists "membri vizibili" on public.membri;
create policy "membri vizibili" on public.membri for select to authenticated
  using (elev_id = auth.uid() or public.e_profesorul_clasei(clasa_id));
drop policy if exists "scoatere din clasă" on public.membri;
create policy "scoatere din clasă" on public.membri for delete to authenticated
  using (elev_id = auth.uid() or public.e_profesorul_clasei(clasa_id));

drop policy if exists "teme vizibile" on public.teme;
create policy "teme vizibile" on public.teme for select to authenticated
  using (public.e_profesorul_clasei(clasa_id) or public.e_membru(clasa_id));
drop policy if exists "profesorul adaugă teme" on public.teme;
create policy "profesorul adaugă teme" on public.teme for insert to authenticated
  with check (public.e_profesorul_clasei(clasa_id));
drop policy if exists "profesorul modifică teme" on public.teme;
create policy "profesorul modifică teme" on public.teme for update to authenticated
  using (public.e_profesorul_clasei(clasa_id)) with check (public.e_profesorul_clasei(clasa_id));
drop policy if exists "profesorul șterge teme" on public.teme;
create policy "profesorul șterge teme" on public.teme for delete to authenticated
  using (public.e_profesorul_clasei(clasa_id));

drop policy if exists "lucrări vizibile" on public.predari;
create policy "lucrări vizibile" on public.predari for select to authenticated
  using (elev_id = auth.uid() or public.e_profesorul_clasei(public.clasa_temei(tema_id)));
drop policy if exists "elevul trimite" on public.predari;
create policy "elevul trimite" on public.predari for insert to authenticated
  with check (elev_id = auth.uid() and public.e_membru(public.clasa_temei(tema_id)));
drop policy if exists "elev sau profesor modifică" on public.predari;
create policy "elev sau profesor modifică" on public.predari for update to authenticated
  using (elev_id = auth.uid() or public.e_profesorul_clasei(public.clasa_temei(tema_id)));

-- ---------- Imaginile lucrărilor (Storage) ----------
-- Calea fiecărei imagini: <id elev>/<id temă>/<fișier>.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lucrari', 'lucrari', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "elevul încarcă imagini" on storage.objects;
create policy "elevul încarcă imagini" on storage.objects for insert to authenticated
  with check (bucket_id = 'lucrari' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "elevul își șterge imaginile" on storage.objects;
create policy "elevul își șterge imaginile" on storage.objects for delete to authenticated
  using (bucket_id = 'lucrari' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "imagini vizibile" on storage.objects;
create policy "imagini vizibile" on storage.objects for select to authenticated
  using (
    bucket_id = 'lucrari' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.e_profesorul_clasei(public.clasa_temei(((storage.foldername(name))[2])::uuid))
    )
  );
