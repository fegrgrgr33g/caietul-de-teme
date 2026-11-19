/* Caietul de teme — capitolele „Poveștii Cunoașterii”: componente noi pentru calendar, BAC, bibliotecă, rezultate și profesor.
   Folosesc doar date reale din aplicație; se încarcă înainte de app.js. */
"use strict";

/* pune titlul între ghilimele românești doar dacă nu le are deja (ex.: „Plumb” de George Bacovia) */
function inGhilimele(t) { t = String(t || ""); return /^[„"«]/.test(t.trim()) ? t : `„${t}”`; }

/* =====================================================================
   CALENDAR — HARTA TIMPULUI: panoul zilei alese și vederea „agendă”
   ===================================================================== */
function panouZiAleasa(rol, peZi, predate) {
  const azi = ziISO(Date.now()), zi = S.calZi || azi, lista = peZi[zi] || [];
  const data = new Date(zi + "T12:00:00");
  return h("aside", { class: "sheet stack panou-zi", "aria-labelledby": "pz-titlu", "aria-live": "polite" },
    h("div", { class: "label" }, zi === azi ? "Azi" : "Ziua aleasă"),
    h("h3", { id: "pz-titlu", style: "text-transform:capitalize" }, data.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" })),
    lista.length ? h("ul", { class: "lista-zi" }, lista.map(t => {
      const n = predate(t.id), trecut = zi < azi;
      const stare = rol === "profesor" ? (n >= Math.max(1, S.membri.length) ? "ok" : trecut ? "err" : "wait") : (n ? "ok" : trecut ? "err" : "wait");
      return h("li", null, h("a", { href: "#/tema/" + encodeURIComponent(t.id), class: "ev-zi " + stare },
        h("b", null, t.titlu), h("span", { class: "small muted" }, rol === "profesor" ? `${n} din ${S.membri.length} lucrări trimise` : n ? "trimisă" : trecut ? "termen trecut" : "de făcut"),
        h("span", { "aria-hidden": "true" }, "→")));
    })) : h("p", { class: "muted small" }, "Niciun termen în această zi. Alege o zi marcată din calendar."));
}

function calendarAgenda(rol, teme) {
  const azi = ziISO(Date.now());
  const cu = teme.filter(t => t.termen).sort((a, b) => a.termen.localeCompare(b.termen));
  const viitoare = cu.filter(t => t.termen >= azi), trecute = cu.filter(t => t.termen < azi).reverse().slice(0, 6);
  const predata = t => rol === "profesor" ? S.predari.filter(p => p.tema_id === t.id).length : S.predariElev.some(p => p.tema_id === t.id);
  const grup = (titlu, lista) => {
    const zile = {}; lista.forEach(t => (zile[t.termen] || (zile[t.termen] = [])).push(t));
    return h("section", { class: "sheet stack agenda" }, h("h3", null, titlu),
      Object.keys(zile).length ? Object.entries(zile).map(([zi, ts]) => { const z = zileRamase(zi);
        return h("div", { class: "agenda-zi" + (zi === azi ? " azi" : "") },
          h("div", { class: "agenda-data" }, h("b", null, new Date(zi + "T12:00:00").getDate()), h("span", null, new Date(zi + "T12:00:00").toLocaleDateString("ro-RO", { month: "short", weekday: "short" }))),
          h("ul", null, ts.map(t => { const n = predata(t);
            return h("li", null, h("a", { href: "#/tema/" + encodeURIComponent(t.id) }, h("b", null, t.titlu),
              h("span", { class: "chip " + (rol === "profesor" ? (n >= Math.max(1, S.membri.length) ? "ok" : z < 0 ? "err" : "wait") : n ? "ok" : z < 0 ? "err" : z <= 1 ? "wait" : "none") },
                rol === "profesor" ? `${n}/${S.membri.length} lucrări` : n ? "trimisă" : z < 0 ? "termen trecut" : z === 0 ? "azi" : z === 1 ? "mâine" : `în ${z} zile`))); }))); })
        : h("p", { class: "muted small" }, "Nimic aici."));
  };
  return [unelteCalendar(teme), grup("Urmează", viitoare), trecute.length ? grup("Termene trecute", trecute) : null].filter(Boolean);
}

/* =====================================================================
   PREGĂTIRE BAC — DRUMUL CUNOAȘTERII: harta cu cinci zone (doar prezentare; nimic nu e blocat)
   ===================================================================== */
function hartaBac() {
  const gram = Number(citesteLocal(cheieElev("gram-corecte"), "0")) || 0;
  const doom = Object.values(citesteJSON(cheieElev("doom-greseli"), {})).length;
  const citite = Object.values(citesteJSON(cheieElev("citite"), {})).filter(x => x && x.citit).length;
  const ist = istoricAntrenamente(), sim = ist.filter(x => x.bac).length, arg = ist.filter(x => !x.bac).length;
  const zone = [
    { k: "sat", n: "Satul gramaticii", d: "DOOM, punctuație, acord", p: gram ? `${gram} răspunsuri corecte` : doom ? "exersat" : "neînceput", x: 12, y: 74, mergi: () => { S.subLimba = "gram"; mergi("limba"); } },
    { k: "padure", n: "Pădurea lecturilor", d: "fișele operelor din programă", p: `${citite} din ${OPERE.length} opere citite`, x: 32, y: 40, mergi: () => { S.subOpere = "bib"; mergi("opere"); } },
    { k: "biblioteca", n: "Biblioteca operelor", d: "planuri de eseu", p: "pentru orice operă", x: 52, y: 66, mergi: () => { S.subBac = "plan"; draw(); } },
    { k: "turn", n: "Turnul argumentării", d: "corectorul de redactare", p: arg ? `${arg} antrenamente scurte` : "neînceput", x: 71, y: 34, mergi: () => { S.subBac = "corector"; draw(); } },
    { k: "castel", n: "Castelul simulărilor", d: "simulări BAC complete", p: sim ? `${sim} ${sim === 1 ? "simulare" : "simulări"}` : "nicio simulare încă", x: 88, y: 58, mergi: () => { S.subBac = "sim"; draw(); setTimeout(() => document.querySelector(".antrenament")?.scrollIntoView({ behavior: MISCARE_REDUSA() ? "auto" : "smooth", block: "start" }), 60); } }];
  const harta = h("div", { class: "harta-bac", role: "group", "aria-label": "Drumul cunoașterii: cinci zone de pregătire" });
  harta.innerHTML = `<svg class="harta-fundal" viewBox="0 0 1000 380" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="hb-cer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e4c3"/><stop offset="1" stop-color="#ead2a6"/></linearGradient></defs>
    <rect width="1000" height="380" fill="url(#hb-cer)"/>
    <path d="M0 300 Q150 250 300 290 T620 270 T1000 260 V380 H0Z" fill="#c7d3b3" opacity=".7"/>
    <g fill="#7f9a72" opacity=".75">${Array.from({ length: 16 }, (_, i) => `<path d="M${250 + i * 18} ${170 + (i % 3) * 10} l12 -34 12 34z"/>`).join("")}</g>
    <path d="M120 282 C220 260 260 160 320 150 S460 250 520 252 S640 140 710 130 S820 210 880 222" fill="none" stroke="#8a5a2c" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round"/>
    <g fill="#5a4636"><rect x="96" y="262" width="34" height="24"/><path d="M92 262 l21 -16 21 16z"/><rect x="138" y="268" width="26" height="18"/><path d="M135 268 l16 -12 16 12z"/></g>
    <g fill="#6a4a2e"><rect x="494" y="214" width="56" height="40"/><path d="M488 214 l34 -24 34 24z"/></g>
    <g fill="#53416f"><rect x="700" y="60" width="26" height="80"/><path d="M696 60 l17 -30 17 30z"/></g>
    <g fill="#3a2a5c"><rect x="842" y="150" width="76" height="70"/><rect x="832" y="128" width="20" height="92"/><rect x="908" y="120" width="20" height="100"/><path d="M828 128 l14 -26 14 26z M904 120 l14 -28 14 28z"/></g>
    <g transform="translate(44 44)" stroke="#8a5a2c" fill="none" opacity=".7"><circle r="26"/><path d="M0 -32 L6 0 L0 32 L-6 0Z M-32 0 L0 6 L32 0 L0 -6Z" fill="#8a5a2c" fill-opacity=".2"/></g></svg>`;
  zone.forEach((z, i) => harta.append(h("button", { type: "button", class: "zona-bac z-" + z.k, style: `left:${z.x}%;top:${z.y}%`, onclick: z.mergi,
      "aria-label": `Zona ${i + 1}: ${z.n} — ${z.d}. ${z.p}.` },
    h("span", { class: "zona-nr", "aria-hidden": "true" }, i + 1), h("span", { class: "zona-text" }, h("b", null, z.n), h("small", null, z.p)))));
  return h("section", { class: "sheet stack harta-bac-sec" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Drumul cunoașterii"),
      h("span", { class: "muted small" }, "Poți intra în orice zonă, în orice ordine.")), harta);
}

/* =====================================================================
   BIBLIOTECA — vedere de tip listă (accesibilă), lângă rafturile cu coperți
   ===================================================================== */
function comutatorVedereOpere() {
  const v = S.vedereOpere || "rafturi";
  return h("div", { class: "seg", role: "group", "aria-label": "Cum afișez operele" },
    [["rafturi", "Rafturi"], ["lista", "Listă"]].map(([k, n]) => h("button", { type: "button", class: v === k ? "on" : "", "aria-pressed": v === k ? "true" : "false", onclick: () => { S.vedereOpere = k; draw(); } }, n)));
}
function listaOpere(lista, citite) {
  return h("div", { class: "sheet tbl-wrap" }, h("table", { class: "tabel-carduri tabel-opere" },
    h("caption", { class: "muted small", style: "text-align:left;padding-bottom:8px" }, `${lista.length} opere. Apasă pe titlu pentru fișă.`),
    h("thead", null, h("tr", null, h("th", { scope: "col" }, "Opera"), h("th", { scope: "col" }, "Autor"), h("th", { scope: "col" }, "An"), h("th", { scope: "col" }, "Curent"), h("th", { scope: "col" }, "Specie"), h("th", { scope: "col" }, "Citită"))),
    h("tbody", null, lista.map(o => h("tr", null,
      h("td", { "data-label": "Opera" }, h("button", { type: "button", class: "link-btn", onclick: () => { S.vedereOpere = "rafturi"; S.operaDeschisa = o.id; draw(); setTimeout(() => document.querySelector(".opera.deschisa")?.scrollIntoView({ block: "start", behavior: MISCARE_REDUSA() ? "auto" : "smooth" }), 80); } }, o.titlu)),
      h("td", { "data-label": "Autor" }, o.autor), h("td", { "data-label": "An" }, o.an), h("td", { "data-label": "Curent" }, o.curent),
      h("td", { "data-label": "Specie" }, o.specie), h("td", { "data-label": "Citită" }, (citite[o.id] || {}).citit ? h("span", { class: "chip ok" }, "da") : h("span", { class: "muted" }, "—")))))));
}

/* =====================================================================
   REZULTATE — feedbackul primit (comentariile profesorului și rezumatele corectării)
   ===================================================================== */
function feedbackPrimit() {
  const cu = S.predariElev.filter(p => p.comentariu_profesor || (p.feedback && p.feedback.rezumat))
    .sort((a, b) => String(b.trimis_la).localeCompare(String(a.trimis_la))).slice(0, 8);
  return h("section", { class: "sheet stack", style: "--acc:var(--c5)" }, h("h3", null, "Feedbackul primit"),
    cu.length ? h("ul", { class: "lista-feedback" }, cu.map(p => { const t = S.temeElev.find(x => x.id === p.tema_id);
      return h("li", null, h("a", { href: "#/tema/" + encodeURIComponent(p.tema_id), class: "link-btn" }, t ? t.titlu : "Temă"),
        p.comentariu_profesor ? h("p", { class: "small" }, h("span", { class: "sursa prof" }, "profesor"), " ", p.comentariu_profesor) : null,
        p.feedback && p.feedback.rezumat ? h("p", { class: "small muted" }, h("span", { class: "sursa ai" }, "corectare automată"), " ", p.feedback.rezumat) : null); }))
      : h("p", { class: "muted small" }, "Comentariile profesorului și rezumatele corectării apar aici."));
}

/* =====================================================================
   PROFESOR — activitate recentă, editor de teme pe pași și previzualizare
   ===================================================================== */
function activitateRecenta() {
  const nume = id => ((S.membri.find(m => m.elev_id === id) || {}).profiles || {}).nume || "Elev";
  const lucrari = [...(S.predari || [])].sort((a, b) => String(b.trimis_la).localeCompare(String(a.trimis_la))).slice(0, 6);
  const mesaje = [...(S.mesaje || [])].filter(m => m.autor_id === m.elev_id).sort((a, b) => String(b.creat_la).localeCompare(String(a.creat_la))).slice(0, 3);
  const ev = [...lucrari.map(p => ({ t: p.trimis_la, el: () => { const tm = S.teme.find(x => x.id === p.tema_id), n = notaFinala(p);
      return h("button", { type: "button", class: "rand-activ", onclick: () => deschideLucrarea(p.tema_id, p.id) },
        h("span", { class: "tip-nou", style: "--ic:var(--c3)" }, "Lucrare"), h("span", { class: "ra-text" }, h("b", null, nume(p.elev_id)), ` a trimis „${tm ? tm.titlu : "tema"}”`),
        n != null ? h("span", { class: "nota" + (n < 5 ? " fail" : "") }, fmtNota(n)) : h("span", { class: "chip wait" }, "de corectat"), h("span", { class: "muted small" }, fmtData(p.trimis_la))); } })),
    ...mesaje.map(m => ({ t: m.creat_la, el: () => h("button", { type: "button", class: "rand-activ", onclick: () => { const p = S.predari.find(x => x.tema_id === m.tema_id && x.elev_id === m.elev_id); S.msgDeschis = "msg-" + m.tema_id + "-" + m.elev_id; if (p) deschideLucrarea(m.tema_id, p.id, "in-msg-" + m.tema_id + "-" + m.elev_id); else mergi("tema", m.tema_id); } },
      h("span", { class: "tip-nou", style: "--ic:var(--c4)" }, "Mesaj"), h("span", { class: "ra-text" }, h("b", null, nume(m.elev_id)), ": „" + m.text.slice(0, 60) + (m.text.length > 60 ? "…" : "") + "”"), h("span", { class: "muted small" }, fmtData(m.creat_la))) }))]
    .sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, 7);
  return h("section", { class: "sheet stack", style: "--acc:var(--c3)" }, h("h3", null, "Activitate recentă"),
    ev.length ? h("div", { class: "stack", style: "gap:6px" }, ev.map(x => x.el())) : h("p", { class: "muted small" }, "Lucrările și mesajele noi apar aici."));
}
function pasiEditor(d) {
  const pas = (n, titlu, gata, tinta) => h("li", { class: gata ? "gata" : "" }, h("button", { type: "button", onclick: () => document.querySelector(tinta)?.scrollIntoView({ block: "center", behavior: MISCARE_REDUSA() ? "auto" : "smooth" }) },
    h("span", { class: "pas-nr", "aria-hidden": "true" }, gata ? "✓" : n), titlu));
  const exOk = (d.ex || []).some(x => (x.enunt || "").trim());
  return h("nav", { class: "pasi-editor", "aria-label": "Pașii temei" }, h("ol", null,
    pas(1, "Detalii", !!(d.titlu || "").trim(), "#t-titlu"), pas(2, "Exerciții", exOk, "#e0-enunt"), pas(3, "Publicare", false, "#t-minute"),
    h("li", null, h("button", { type: "button", class: S.previzTema ? "on" : "", "aria-pressed": S.previzTema ? "true" : "false", onclick: () => { S.previzTema = !S.previzTema; render(); } },
      h("span", { class: "pas-nr", "aria-hidden": "true" }, "👁"), S.previzTema ? "Ascunde previzualizarea" : "Previzualizează ca elev"))));
}
function previzualizareTema(d) {
  if (!S.previzTema) return null;
  return h("section", { class: "sheet stack previz-tema", "aria-label": "Previzualizare: așa vede elevul tema" },
    h("div", { class: "label" }, "Previzualizare · așa vede elevul tema"),
    h("h2", null, (d.titlu || "").trim() || "(fără titlu)"),
    d.termen ? h("div", { class: "muted small" }, "Termen: " + fmtZi(d.termen)) : null,
    (d.cerinta || "").trim() ? textSuport(d.cerinta) : null,
    (d.ex || []).map((x, i) => h("div", { class: "stack", style: "gap:6px" },
      h("strong", { class: "pre" }, `${i + 1}. ${(x.enunt || "").trim() || "(enunț gol)"}`),
      x.tip === "grila" ? h("div", { class: "stack", style: "gap:4px" }, String(x.variante || "").split("\n").map(s => s.trim()).filter(Boolean).map((v, k) =>
        h("label", { class: "row optiune", style: "gap:10px" }, h("input", { type: "radio", disabled: true }), `${String.fromCharCode(97 + k)}) ${v}`)))
        : x.tip === "liber" ? h("textarea", { disabled: true, placeholder: "Elevul scrie aici…", style: "min-height:80px" })
        : h("input", { type: "text", disabled: true, placeholder: "Răspunsul elevului" }))));
}
