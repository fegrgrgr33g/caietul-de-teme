/* Caietul de teme: pagina pentru părinți, calendarul termenelor, mesajele profesor–elev.
   Folosește funcțiile din app.js (h, S, render, toast, avatar etc.), disponibile când se desenează pagina. */
"use strict";

/* =====================================================================
   PĂRINȚI: linkul (creat de elev) și pagina doar-citire
   ===================================================================== */
function adresaParinte(token) { return location.href.split(/[?#]/)[0] + "?parinte=" + token; }

function linkParintiView() {
  const L = S.linkParinti || (S.linkParinti = { deschis: false, token: null, incarcat: false });
  const card = h("div", { class: "link-parinti" },
    h("button", { type: "button", class: "btn ghost", onclick: async () => {
      L.deschis = !L.deschis;
      if (L.deschis && !L.incarcat && !S.demo) {
        const { data } = await S.sb.from("linkuri_parinti").select("token").eq("elev_id", S.user.id).limit(1);
        L.token = data && data[0] ? data[0].token : null; L.incarcat = true;
      }
      render();
    } }, L.deschis ? "Închide" : "Link pentru părinți"));
  if (!L.deschis) return card;
  if (!L.token) {
    card.append(h("p", { class: "muted small" }, "Creează un link pe care să-l trimiți părinților. Ei văd doar temele și notele tale, fără cont. Poți opri linkul oricând."),
      h("button", { type: "button", class: "btn", onclick: async () => {
        if (S.demo) { L.token = "demo"; render(); return; }
        const { data, error } = await S.sb.from("linkuri_parinti").insert({ elev_id: S.user.id }).select().single();
        if (error) { toast("Linkul nu a putut fi creat."); return; }
        L.token = data.token; render();
      } }, "Creează linkul"));
    return card;
  }
  const url = adresaParinte(L.token);
  card.append(
    h("div", { class: "row" }, h("input", { type: "text", id: "link-parinti", value: url, readonly: true, onfocus: e => e.target.select() }),
      h("button", { type: "button", class: "btn", onclick: async () => {
        try { await navigator.clipboard.writeText(url); toast("Linkul a fost copiat. Trimite-l părinților."); }
        catch { document.getElementById("link-parinti").select(); toast("Selectat: apasă Ctrl+C ca să-l copiezi."); }
      } }, "Copiază")),
    h("div", { class: "row" },
      h("a", { href: url, target: "_blank", rel: "noopener", class: "link-btn" }, "Vezi ce văd părinții"),
      h("button", { type: "button", class: "btn danger", onclick: async () => {
        if (!S.demo) { const { error } = await S.sb.from("linkuri_parinti").delete().eq("token", L.token); if (error) { toast("Linkul nu a putut fi oprit."); return; } }
        L.token = null; toast("Linkul a fost oprit. Cine îl avea nu mai vede notele."); render();
      } }, "Oprește linkul")));
  return card;
}

const DEMO_PARINTE = { elev: "Ana Ionescu (exemplu)", teme: [
  { titlu: "„Plumb” de George Bacovia", clasa: "a X-a A — Română", termen: "2026-11-20", nota: 9.2, status: "corectat", trimis_la: "2026-11-12T16:00:00Z", comentariu: "Analiză foarte bună." },
  { titlu: "Ortograma „s-a / sa”", clasa: "a X-a A — Română", termen: "2026-11-05", nota: 10, status: "corectat", trimis_la: "2026-11-04T10:00:00Z" },
  { titlu: "Basmul cult – „Povestea lui Harap-Alb”", clasa: "a X-a A — Română", termen: "2026-11-25", nota: null, status: null, trimis_la: null }] };

async function paginaParinte(token) {
  const app = document.getElementById("app"); document.getElementById("role").replaceChildren();
  // aceeași lume ilustrată, estompată: părinții citesc rapid informațiile
  app.dataset.pag = "parinte"; app.dataset.rol = "parinte";
  if (typeof asiguraScena === "function") { asiguraScena(); const sc = document.getElementById("scena"); if (sc) { sc.dataset.pag = "parinte"; sc.dataset.rol = "parinte"; } }
  app.replaceChildren(h("div", { class: "sheet empty" }, h("h2", null, "Se încarcă notele…")));
  let d = null;
  const formatBun = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  if (token === "demo") d = DEMO_PARINTE;
  else if (S.sb && formatBun) {
    let r;
    try { r = await S.sb.rpc("note_parinte", { p_token: token }); } catch (e) { r = { error: e }; }
    if (r.error) {
      app.replaceChildren(h("div", { class: "sheet empty" }, h("h2", null, "Notele nu au putut fi încărcate"),
        h("p", { class: "muted" }, "Verifică conexiunea la internet și încearcă din nou."),
        h("button", { class: "btn", type: "button", style: "margin-top:12px", onclick: () => paginaParinte(token) }, "Încearcă din nou")));
      return;
    }
    d = r.data;
  }
  if (!d) { app.replaceChildren(h("div", { class: "sheet empty" }, h("h2", null, "Linkul nu mai e valabil"), h("p", { class: "muted" }, "Cere-i elevului un link nou."))); return; }
  const note = d.teme.map(t => t.nota).filter(n => n != null).map(Number);
  const media = note.length ? note.reduce((a, b) => a + b, 0) / note.length : null;
  const nefacute = d.teme.filter(t => !t.trimis_la && t.termen && new Date(t.termen + "T23:59:59") < new Date()).length;
  app.replaceChildren(
    h("div", { class: "sheet stack", style: "--acc:var(--c3)" },
      h("div", { class: "label" }, "Pagina pentru părinți · doar citire"),
      h("h2", null, d.elev),
      h("div", { class: "stats" },
        h("div", { class: "stat" }, h("div", { class: "label" }, "Media"), h("div", { class: "v nota" + (media != null && media < 5 ? " fail" : "") }, fmtNota(media))),
        h("div", { class: "stat" }, h("div", { class: "label" }, "Teme trimise"), h("div", { class: "v" }, `${d.teme.filter(t => t.trimis_la).length}/${d.teme.length}`)),
        h("div", { class: "stat" }, h("div", { class: "label" }, "Întârziate"), h("div", { class: "v", style: nefacute ? "color:var(--bad)" : "" }, nefacute))),
      note.length > 1 ? h("div", null, h("div", { class: "label" }, "Evoluția notelor"), sparkline([...d.teme].reverse().map(t => t.nota == null ? null : Number(t.nota)))) : null),
    h("div", { class: "sheet" }, h("div", { class: "tbl-wrap" }, h("table", null,
      h("thead", null, h("tr", null, h("th", null, "Tema"), h("th", null, "Termen"), h("th", null, "Stare"), h("th", null, "Nota"))),
      h("tbody", null, d.teme.map(t => h("tr", null,
        h("td", null, h("div", null, t.titlu), t.comentariu ? h("div", { class: "muted small" }, "Profesorul: " + t.comentariu) : null),
        h("td", { class: "small" }, t.termen ? fmtZi(t.termen) : "–"),
        h("td", null, t.trimis_la ? h("span", { class: "chip ok" }, "Trimisă") : t.termen && new Date(t.termen + "T23:59:59") < new Date() ? h("span", { class: "chip err" }, "Netrimisă") : h("span", { class: "chip none" }, "De făcut")),
        h("td", null, t.nota == null ? h("span", { class: "muted" }, "–") : h("span", { class: "nota" + (t.nota < 5 ? " fail" : "") }, fmtNota(Number(t.nota)))))))))),
    h("p", { class: "muted small", style: "text-align:center" }, "Linkul l-a creat elevul și îl poate opri oricând. Pagina nu permite modificări."));
}

/* =====================================================================
   CALENDARUL termenelor
   ===================================================================== */
function calendarView(rol) {
  const azi = new Date(); azi.setHours(0, 0, 0, 0);
  const C = S.cal || (S.cal = { an: azi.getFullYear(), luna: azi.getMonth() });
  const teme = rol === "profesor" ? S.teme : S.temeElev;
  if (S.calVedere == null && innerWidth < 700) S.calVedere = "agenda"; // pe telefon, agenda e mai practică
  if (S.calVedere === "sapt") return calendarSaptamana(rol, teme);
  if (S.calVedere === "agenda" && typeof calendarAgenda === "function") return calendarAgenda(rol, teme);
  const predate = id => rol === "profesor" ? S.predari.filter(p => p.tema_id === id).length : (S.predariElev.some(p => p.tema_id === id) ? 1 : 0);
  const prima = new Date(C.an, C.luna, 1), zile = new Date(C.an, C.luna + 1, 0).getDate();
  const start = (prima.getDay() + 6) % 7; // luni = 0
  const numeLuna = prima.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  const peZi = {};
  for (const t of teme) if (t.termen) (peZi[t.termen] || (peZi[t.termen] = [])).push(t);
  const celule = [];
  for (let i = 0; i < start; i++) celule.push(h("div", { class: "zi goala" }));
  for (let z = 1; z <= zile; z++) {
    const data = new Date(C.an, C.luna, z), cheie = `${C.an}-${String(C.luna + 1).padStart(2, "0")}-${String(z).padStart(2, "0")}`;
    const lista = peZi[cheie] || [];
    const aleasa = (S.calZi || ziISO(azi)) === cheie;
    celule.push(h("div", { class: "zi" + (data.getTime() === azi.getTime() ? " azi" : "") + (lista.length ? " are" : "") + (lista.length >= 3 ? " are3" : lista.length === 2 ? " are2" : "") + (aleasa ? " aleasa" : "") },
      h("button", { type: "button", class: "nr-zi", "aria-pressed": aleasa ? "true" : "false",
        "aria-label": `${data.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" })}${lista.length ? `, ${lista.length} ${lista.length === 1 ? "termen" : "termene"}` : ""}`,
        onclick: () => { S.calZi = cheie; draw(); } }, z),
      lista.map(t => {
        const n = predate(t.id), trecut = data < azi;
        const stare = rol === "profesor" ? (n >= Math.max(1, S.membri.length) ? "ok" : trecut ? "err" : "wait") : (n ? "ok" : trecut ? "err" : "wait");
        return h("button", { type: "button", class: "ev " + stare, title: t.titlu, onclick: () => mergi("tema", t.id) }, t.titlu + (rol === "profesor" ? ` (${n}/${S.membri.length})` : ""));
      })));
  }
  const viitoare = teme.filter(t => t.termen && new Date(t.termen + "T00:00:00") >= azi).sort((a, b) => a.termen.localeCompare(b.termen)).slice(0, 5);
  const schimbaLuna = d => { C.luna += d; if (C.luna < 0) { C.luna = 11; C.an--; } if (C.luna > 11) { C.luna = 0; C.an++; } S.calDir = d; draw(); };
  const dir = S.calDir; S.calDir = 0;
  return [
    unelteCalendar(teme),
    h("div", { class: "calendar-layout" },
    h("section", { class: "sheet stack calendar", style: "--acc:var(--c4)" },
      h("div", { class: "row", style: "justify-content:space-between" },
        h("button", { type: "button", class: "btn ghost", "aria-label": "Luna trecută", onclick: () => schimbaLuna(-1) }, "‹"),
        h("h2", { style: "text-transform:capitalize", "aria-live": "polite" }, numeLuna),
        h("button", { type: "button", class: "btn ghost", "aria-label": "Luna viitoare", onclick: () => schimbaLuna(1) }, "›")),
      h("div", { class: "grila-cal" + (dir > 0 ? " glisare-dr" : dir < 0 ? " glisare-st" : "") }, ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map(z => h("div", { class: "cap-zi" }, z)), celule),
      h("div", { class: "row small muted" }, h("span", { class: "chip ok" }, rol === "profesor" ? "toți au trimis" : "trimisă"), h("span", { class: "chip wait" }, "urmează"), h("span", { class: "chip err" }, rol === "profesor" ? "termen trecut, lipsesc lucrări" : "termen trecut"))),
    typeof panouZiAleasa === "function" ? panouZiAleasa(rol, peZi, predate) : null),
    h("div", { class: "sheet" }, h("h3", null, "Termene apropiate"),
      viitoare.length ? h("div", { class: "stack", style: "gap:8px;margin-top:10px" }, viitoare.map(t => {
        const zile = Math.round((new Date(t.termen + "T00:00:00") - azi) / 86400000);
        return h("a", { class: "rand-verif", href: "#/tema/" + encodeURIComponent(t.id) }, h("span", { class: "chip " + (zile <= 1 ? "wait" : "none") }, zile === 0 ? "azi" : zile === 1 ? "mâine" : `în ${zile} zile`), h("span", { style: "flex:1;text-align:left" }, t.titlu), h("span", { class: "muted" }, "›"));
      })) : h("p", { class: "muted small" }, "Niciun termen în viitor."))];
}

/* =====================================================================
   MESAJE la o temă (o conversație elev–profesor)
   ===================================================================== */
function mesajeView(temaId, elevId, titluElev) {
  const lista = (S.mesaje || []).filter(m => m.tema_id === temaId && m.elev_id === elevId).sort((a, b) => String(a.creat_la).localeCompare(String(b.creat_la)));
  const cheie = "msg-" + temaId + "-" + elevId;
  const deschis = S.msgDeschis === cheie;
  const eu = S.user.id;
  const box = h("div", { class: "mesaje" },
    h("button", { type: "button", class: "link-btn", style: "text-align:left", onclick: () => { S.msgDeschis = S.msgDeschis === cheie ? null : cheie; render(); } },
      (S.profil.rol === "elev" ? "Întreabă profesorul" : `Mesaje cu ${titluElev || "elevul"}`) + (lista.length ? ` (${lista.length})` : "")));
  if (!deschis) return box;
  box.append(
    lista.length ? h("div", { class: "fir-mesaje" }, lista.map(m => h("div", { class: "bula" + (m.autor_id === eu ? " a-mea" : "") },
      h("div", { class: "pre" }, m.text), h("div", { class: "muted small" }, (m.autor_id === elevId ? (S.profil.rol === "elev" ? "Tu" : titluElev || "Elevul") : (S.profil.rol === "profesor" ? "Tu" : "Profesorul")) + " · " + fmtData(m.creat_la)))))
      : h("p", { class: "muted small" }, S.profil.rol === "elev" ? "Nu înțelegi o cerință sau o corectură? Scrie-i profesorului aici. Doar el vede mesajul." : "Niciun mesaj încă."),
    h("form", { class: "row", onsubmit: async e => {
      e.preventDefault();
      const text = (S.drafts[cheie] || "").trim();
      if (!text) return;
      const nou = { tema_id: temaId, elev_id: elevId, autor_id: eu, text, creat_la: new Date().toISOString() };
      if (!S.demo) {
        const { data, error } = await S.sb.from("mesaje").insert({ tema_id: temaId, elev_id: elevId, text }).select().single();
        if (error) { toast("Mesajul nu a putut fi trimis."); return; }
        Object.assign(nou, data);
      }
      (S.mesaje || (S.mesaje = [])).push(nou); S.drafts[cheie] = ""; sunetClic(); render();
      setTimeout(() => document.getElementById("in-" + cheie)?.focus(), 30);
    } },
      h("input", { type: "text", id: "in-" + cheie, value: S.drafts[cheie] || "", maxlength: "2000", placeholder: "Scrie un mesaj…", style: "flex:1;min-width:180px", oninput: e => S.drafts[cheie] = e.target.value }),
      h("button", { class: "btn", type: "submit" }, "Trimite")));
  return box;
}

/* profesorul: conversațiile în care ultimul mesaj e al elevului (așteaptă răspuns) */
function mesajeNoiView() {
  const fire = {};
  for (const m of S.mesaje || []) { const k = m.tema_id + "|" + m.elev_id; if (!fire[k] || String(fire[k].creat_la) < String(m.creat_la)) fire[k] = m; }
  const asteapta = Object.values(fire).filter(m => m.autor_id === m.elev_id);
  if (!asteapta.length) return null;
  const nume = id => { const x = S.membri.find(y => y.elev_id === id); return (x && x.profiles && x.profiles.nume) || "Elev"; };
  return h("div", { class: "sheet mesaje-noi", style: "--acc:var(--c1)" },
    h("h3", null, `Mesaje care așteaptă răspuns (${asteapta.length})`),
    h("div", { class: "stack", style: "gap:8px;margin-top:10px" }, asteapta.map(m => {
      const t = S.teme.find(x => x.id === m.tema_id);
      return h("button", { type: "button", class: "rand-verif", onclick: () => {
        S.msgDeschis = "msg-" + m.tema_id + "-" + m.elev_id;
        // dacă elevul a trimis lucrarea, conversația e lângă lucrare, pe pagina temei
        const p = (S.predari || []).find(x => x.tema_id === m.tema_id && x.elev_id === m.elev_id);
        if (p) { S.msgProf = null; deschideLucrarea(m.tema_id, p.id, "in-msg-" + m.tema_id + "-" + m.elev_id); return; }
        S.msgProf = m; render();
        setTimeout(() => document.getElementById("in-msg-" + m.tema_id + "-" + m.elev_id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); } },
        h("span", { class: "nume" }, nume(m.elev_id)), h("span", { class: "muted small" }, t ? t.titlu : ""), h("span", { class: "small", style: "flex:1;text-align:left" }, "„" + m.text.slice(0, 80) + (m.text.length > 80 ? "…" : "") + "”"));
    })),
    S.msgProf ? h("div", { style: "margin-top:12px" }, mesajeView(S.msgProf.tema_id, S.msgProf.elev_id, nume(S.msgProf.elev_id))) : null);
}
