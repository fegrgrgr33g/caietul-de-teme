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
  // peisajul (desen vectorial original): apus, munți, castelul pe deal, pădure, râu cu pod și cascadă, drumul luminos
  harta.innerHTML = `<svg class="harta-fundal" viewBox="0 0 1000 380" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="hb-cer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d5a96"/><stop offset=".38" stop-color="#c98fae"/><stop offset=".62" stop-color="#f3b99a"/><stop offset=".8" stop-color="#f8d9a2"/></linearGradient>
      <radialGradient id="hb-soare" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d8"/><stop offset=".25" stop-color="#ffe2a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffc98a" stop-opacity="0"/></radialGradient>
      <linearGradient id="hb-munte1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a77a8"/><stop offset="1" stop-color="#b79cb8"/></linearGradient>
      <linearGradient id="hb-munte2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e5a86"/><stop offset="1" stop-color="#8e8aa6"/></linearGradient>
      <linearGradient id="hb-deal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f9a72"/><stop offset="1" stop-color="#4d6a4e"/></linearGradient>
      <linearGradient id="hb-deal2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93ad80"/><stop offset="1" stop-color="#5a7a55"/></linearGradient>
      <linearGradient id="hb-apa" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fb7c9"/><stop offset="1" stop-color="#bfe0e6"/></linearGradient>
      <filter id="hb-stralucire" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <rect width="1000" height="380" fill="url(#hb-cer)"/>
    <circle cx="860" cy="128" r="90" fill="url(#hb-soare)"/><circle cx="860" cy="128" r="20" fill="#fff4cf"/>
    <path d="M0 190 L70 130 L130 168 L210 104 L300 160 L380 118 L470 170 L560 112 L650 160 L740 120 L830 168 L920 130 L1000 160 V260 H0Z" fill="url(#hb-munte1)" opacity=".8"/>
    <path d="M0 220 L90 170 L170 200 L260 150 L350 205 L450 168 L540 210 L640 172 L720 205 L800 180 L1000 210 V280 H0Z" fill="url(#hb-munte2)" opacity=".75"/>
    <!-- castelul pe deal -->
    <path d="M760 250 C800 180 900 170 1000 196 V300 H760Z" fill="url(#hb-deal)"/>
    <g fill="#3d2d5c"><rect x="836" y="120" width="80" height="58"/><rect x="826" y="98" width="20" height="80"/><rect x="906" y="92" width="20" height="86"/><rect x="866" y="86" width="22" height="92"/>
      <path d="M822 98 l14 -26 14 26z M902 92 l14 -28 14 28z M862 86 l15 -30 15 30z"/></g>
    <g fill="#ffd27a"><rect x="848" y="140" width="5" height="8" rx="2"/><rect x="872" y="112" width="5" height="8" rx="2"/><rect x="896" y="146" width="5" height="8" rx="2"/><rect x="913" y="118" width="4" height="7" rx="2"/><rect x="832" y="120" width="4" height="7" rx="2"/></g>
    <path d="M872 66 v-12 l12 4 -12 4" fill="#8a2f45" stroke="#3d2d5c" stroke-width="1.5"/>
    <!-- dealurile din față -->
    <path d="M0 270 C120 220 260 236 380 250 C520 266 640 226 780 244 C880 256 950 250 1000 246 V380 H0Z" fill="url(#hb-deal2)"/>
    <path d="M0 316 C160 290 300 300 460 318 C620 336 780 300 1000 310 V380 H0Z" fill="#55744f"/>
    <!-- pădurea -->
    <g fill="#36573f">${Array.from({ length: 18 }, (_, i) => { const x = 222 + i * 12 + (i % 2) * 5, y = 196 + (i % 3) * 8; return `<path d="M${x} ${y} l10 -32 10 32z"/>`; }).join("")}</g>
    <g fill="#4b6e4f">${Array.from({ length: 12 }, (_, i) => { const x = 238 + i * 15, y = 214 + (i % 2) * 6; return `<path d="M${x} ${y} l9 -26 9 26z"/>`; }).join("")}</g>
    <!-- turnul argumentării -->
    <g><rect x="700" y="86" width="28" height="94" fill="#6b5a86"/><path d="M694 86 l20 -34 20 34z" fill="#8a2f45"/><rect x="709" y="104" width="10" height="16" rx="5" fill="#ffd27a"/><rect x="696" y="176" width="36" height="10" fill="#4d3f66"/></g>
    <!-- biblioteca operelor: un templu cu coloane -->
    <g><path d="M488 226 h72 l-36 -22z" fill="#e9d6b0"/><rect x="490" y="226" width="68" height="6" fill="#d8c09a"/>
      <g fill="#f3e6c8">${[494, 508, 522, 536, 550].map(x => `<rect x="${x}" y="232" width="5" height="26"/>`).join("")}</g><rect x="486" y="258" width="76" height="7" fill="#d8c09a"/><rect x="514" y="238" width="18" height="20" fill="#ffd27a" opacity=".8"/></g>
    <!-- poarta / satul gramaticii -->
    <g><rect x="92" y="262" width="56" height="44" fill="#8a6a50"/><path d="M106 306 v-22 a14 14 0 0 1 28 0 v22z" fill="#3a2414"/><rect x="86" y="254" width="68" height="10" fill="#6d5240"/>
      <rect x="160" y="276" width="30" height="24" fill="#b08a62"/><path d="M156 276 l19 -14 19 14z" fill="#8a2f45"/><rect x="170" y="284" width="8" height="8" fill="#ffd27a"/>
      <path d="M150 230 v34" stroke="#5a3c1c" stroke-width="3"/><path d="M150 232 h24 v26 l-12 -6 -12 6z" fill="#8a2f45"/><text x="162" y="250" font-size="9" text-anchor="middle" fill="#f6dc95" font-family="serif" font-weight="700">BAC</text></g>
    <!-- râul, podul și cascada -->
    <path d="M960 250 c-10 30 -40 40 -60 60 c-30 30 -120 30 -200 70 H760 c70 -40 150 -40 180 -70 c18 -18 24 -40 20 -60z" fill="url(#hb-apa)" opacity=".85"/>
    <path d="M948 230 v34" stroke="#e8f6f8" stroke-width="7" opacity=".85"/><path d="M944 232 v32 M952 236 v28" stroke="#ffffff" stroke-width="1.5" opacity=".8"/>
    <path d="M800 320 q34 -26 68 0" fill="none" stroke="#a88a66" stroke-width="7"/><path d="M806 320 v10 M834 308 v18 M862 320 v10" stroke="#a88a66" stroke-width="4"/>
    <!-- drumul luminos care leagă zonele -->
    <path d="M120 300 C210 300 250 200 320 186 S460 260 524 262 S650 160 712 150 S820 220 880 222" fill="none" stroke="#ffd98a" stroke-width="14" stroke-linecap="round" opacity=".55" filter="url(#hb-stralucire)"/>
    <path class="drum-bac" d="M120 300 C210 300 250 200 320 186 S460 260 524 262 S650 160 712 150 S820 220 880 222" fill="none" stroke="#fff1c4" stroke-width="3.5" stroke-dasharray="2 12" stroke-linecap="round"/>
    <!-- flori și licurici -->
    <g fill="#e6a0c8" opacity=".9">${Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 41) % 1000}" cy="${338 + (i * 13) % 34}" r="${3 + (i % 3)}"/>`).join("")}</g>
    <g fill="#fff3c4">${Array.from({ length: 10 }, (_, i) => `<circle cx="${80 + i * 92}" cy="${150 + (i * 37) % 110}" r="1.6"/>`).join("")}</g>
    <g transform="translate(44 44)" stroke="#fff3d6" fill="none" opacity=".75"><circle r="24"/><path d="M0 -30 L6 0 L0 30 L-6 0Z M-30 0 L0 6 L30 0 L0 -6Z" fill="#fff3d6" fill-opacity=".25"/></g></svg>`;
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
