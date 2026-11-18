# Caietul de teme: cum funcționează și cum îl pui online

Site-ul merge în Chrome (și în orice browser), fără cont Claude și **fără costuri**.

**Cum se corectează exercițiile:**

| Tipul exercițiului | Cine corectează | Cost |
|---|---|---|
| Răspuns liber (compunere, eseu, analiză literară, explicație) | AI-ul Gemini, după baremul profesorului, ca la Evaluarea Națională / BAC (conținut + redactare, ortografie după DOOM3); fără AI, profesorul | gratuit (cu limite) |
| Grilă (ex. figura de stil, sensul unui cuvânt) | site-ul, pe loc | gratuit |
| Cuvânt / text scurt (ex. despărțire în silabe, sinonim, parte de vorbire) | site-ul, pe loc; cu **scriere exactă** contează și diacriticele, majusculele și cratima | gratuit |
| Număr (ex. numărul de silabe sau de strofe) | site-ul, pe loc | gratuit |

Proiectul are trei părți:

| Parte | Unde stă | Ce face |
|---|---|---|
| `site/` | Netlify (gratuit) sau direct de pe calculator | paginile pe care le deschid elevii și profesorul |
| `supabase/schema.sql` + `supabase/exercitii.sql` | Supabase (gratuit) | conturi, clase, teme, exerciții, răspunsuri, corectarea automată |
| `supabase/functions/corecteaza` | Supabase | corectează cu AI exercițiile cu răspuns liber |

---

## Ce e deja făcut

Pașii 1–4 sunt deja făcuți pentru proiectul tău Supabase **caietul-de-teme**:
- baza de date (ambele fișiere SQL)
- conturile fără confirmare pe email
- funcția `corecteaza`
- `site/config.js`

Pentru un proiect nou de la zero, urmează-i în ordine.

## Pasul 1. Proiectul Supabase
1. Pe **supabase.com**: **New project**, numele `caietul-de-teme`, regiunea Europe.
2. Pune adresa proiectului și cheia **publishable** în `site/config.js` (butonul **Connect** din Supabase).

## Pasul 2. Baza de date
1. Deschide **SQL Editor → New query**. Lipește conținutul fișierului `supabase/schema.sql` și apasă **Run**.
2. Fă la fel, în ordine, cu `supabase/exercitii.sql`, `supabase/romana.sql` și `supabase/imbunatatiri.sql`.
3. Dacă apare avertismentul „destructive operation”, apasă **Run query**. E normal: vine din liniile `drop ... if exists`.

## Pasul 3. Conturile
Mergi la **Authentication → Sign In / Providers** și oprește **Confirm email**. Apoi apasă **Save changes**.

## Pasul 4. Funcția `corecteaza`
1. Mergi la **Edge Functions → Deploy a new function → Via Editor**. Numele trebuie să fie `corecteaza`.
2. Lipește conținutul fișierului `supabase/functions/corecteaza/index.ts`, apoi apasă **Deploy**.

## Pasul 5. Verify JWT (de făcut de tine)
1. Mergi la **Edge Functions → corecteaza → Settings**.
2. Oprește **Verify JWT with legacy secret**, apoi apasă **Save changes**.

Funcția verifică singură cine e autentificat.

## Pasul 6. (Opțional) AI gratuit pentru răspunsurile libere
1. Intră pe **aistudio.google.com** cu un cont Google și apasă **Get API key → Create API key**. Nu e nevoie de card.
2. În Supabase, mergi la **Edge Functions → Secrets** și adaugă:
   - Name: `GEMINI_API_KEY`
   - Value: cheia de la punctul 1
3. Apasă **Save**.

**Atenție:** la varianta gratuită, Google poate folosi textele trimise ca să-și îmbunătățească modelele. Nu cere elevilor date personale în răspunsuri.

Ca alternativă plătită, poți pune `ANTHROPIC_API_KEY` (Claude).

Fără nicio cheie, exercițiile libere le punctează profesorul.

## Pasul 7. Pune site-ul pe internet
1. Intră pe **app.netlify.com/drop** și fă-ți cont gratuit.
2. Trage folderul `site` în pagină.
3. Primești un link `https://....netlify.app` pe care îl dai elevilor.

Test rapid, înainte de Netlify: dă dublu-clic pe `site/index.html`.

---

## Cum se folosește

**Profesorul**
1. Își face cont și alege **Profesor**.
2. Creează o clasă și le dă elevilor **codul clasei**.
3. Apasă **+ Temă nouă**:
   - titlul și, opțional, indicații și termen
   - exercițiile, fiecare cu enunț, tip, răspunsul corect și punctaj
4. Poate lipi textul suport (poezia sau fragmentul) la începutul temei. La exercițiile de tip **text** poate accepta mai multe variante, despărțite cu `|`. Exemplu: `fru-mu-se-țe|fru-mu-se-te`. Pentru exerciții de ortografie, bifează **Scriere exactă**. La compuneri, scrie baremul (conținut, redactare, număr minim de cuvinte): AI-ul îl folosește.
5. La fiecare temă vede:
   - media clasei și câți au promovat
   - distribuția notelor
   - cât la sută din clasă a rezolvat corect fiecare exercițiu
6. Deschide lucrarea oricărui elev și poate:
   - schimba punctajul oricărui exercițiu
   - pune o notă finală
   - cere corectarea cu AI
   - permite retrimiterea temei

**Elevul**
1. Își face cont, alege **Elev** și scrie codul clasei.
2. Răspunde la exerciții și apasă **Trimite răspunsurile**. Poate trimite o singură dată.
3. Primește imediat:
   - nota
   - punctajul
   - ce e corect și ce e greșit
   - răspunsul corect, dacă profesorul a ales să-l arate

## Bine de știut
- **Nota** = punctajul obținut / punctajul maxim × 10. Nota minimă e 1.
- **Răspunsurile corecte sunt ascunse.** Ele stau într-un tabel pe care elevii nu-l pot citi. Elevii nu-și pot scrie singuri nota.
- **Notele libere apar mai târziu.** Dacă tema are exerciții libere și nu e pornit niciun AI, nota apare după ce profesorul le punctează.
- **Rețeaua școlii poate bloca site-ul.** Pe unele rețele Wi-Fi, adresele `*.supabase.co` sunt blocate și site-ul nu se poate conecta. Pe datele mobile sau acasă merge.
- **Proiectul gratuit Supabase se oprește** după o săptămână fără activitate. Îl repornești din panoul Supabase.
