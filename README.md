# Caietul de teme

Aplicație web pentru Limba și literatura română la liceu (pregătire BAC). Elevii primesc și trimit teme, iar acestea se corectează automat. Profesorul vede cât de bine au lucrat elevii.

## Ce face
- **Elev:** teme cu corectare pe loc (grilă și răspunsuri scurte) și cu AI (compuneri), a doua încercare, „Explică-mi greșeala”, calendar, clasament, simulări BAC, fișe pentru opere, exerciții DOOM și de gramatică, jocuri.
- **Profesor:** clase cu cod, teme (ciornă, programate, cu timp limită), import de subiecte din PDF, lista „De verificat”, mesaje cu elevii, fișa fiecărui elev, raport pentru părinți, plan anual, banca de subiecte.
- **Părinți:** un link doar pentru citit, cu notele copilului.

## Structura
- `site/`: site-ul static (HTML, CSS, JavaScript simplu, fără build).
- `supabase/*.sql`: baza de date (Postgres + RLS). Fișierele se rulează în ordine: `schema.sql`, `exercitii.sql`, `romana.sql`, `imbunatatiri.sql`, `noutati.sql`, `liceu.sql`, `parinti_mesaje.sql`, `plus.sql`.
- `supabase/functions/corecteaza/`: funcția Edge pentru AI (Gemini, gratuit; Claude ca variantă).
- `GHID.md`: ghidul de instalare.

## Pornire locală
```
powershell -ExecutionPolicy Bypass -File serve.ps1
```
Apoi deschide http://localhost:8765. Butoanele „Demonstrație” merg și fără cont.

Cheia din `site/config.js` este cheia **publică** a proiectului Supabase. Cheile secrete (Gemini, service role) stau doar în Supabase, la Secrets.
