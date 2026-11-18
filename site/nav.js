/* Caietul de teme: navigarea pe pagini (meniu lateral pe calculator, bară jos pe telefon).
   Fiecare pagină are adresa ei (#/teme, #/tema/<id>, #/calendar…), deci merg și butoanele Înapoi/Înainte din browser.
   Folosește funcțiile din app.js, liceu.js și extra.js. */
"use strict";

/* ---------------- paginile ---------------- */
const PAGINI_ELEV = [
  { k: "acasa", n: "Acasă", i: "⌂", g: "Caietul meu", c: "var(--c1)" },
  { k: "teme", n: "Teme", i: "✎", g: "Caietul meu", c: "var(--c2)" },
  { k: "calendar", n: "Calendar", i: "▦", g: "Caietul meu", c: "var(--c4)" },
  { k: "clasament", n: "Clasament", i: "★", g: "Caietul meu", c: "var(--c3)" },
  { k: "bac", n: "BAC", i: "◎", g: "Învăț", c: "var(--c5)" },
  { k: "opere", n: "Opere", i: "❦", g: "Învăț", c: "var(--c1)" },
  { k: "limba", n: "Limbă", i: "Ă", g: "Învăț", c: "var(--c3)" },
  { k: "jocuri", n: "Jocuri", i: "◆", g: "Învăț", c: "var(--c2)" },
  { k: "profil", n: "Profil", i: "☺", g: "Eu", c: "var(--c4)" }];
const MOBIL_ELEV = ["acasa", "teme", "calendar", "bac"];

const PAGINI_PROF = [
  { k: "acasa", n: "Clasa", i: "⌂", g: "Clasa", c: "var(--c1)" },
  { k: "teme", n: "Teme", i: "✎", g: "Clasa", c: "var(--c2)" },
  { k: "elevi", n: "Elevi", i: "☺", g: "Clasa", c: "var(--c3)" },
  { k: "calendar", n: "Calendar", i: "▦", g: "Clasa", c: "var(--c4)" },
  { k: "plan", n: "Plan anual", i: "≡", g: "Materiale", c: "var(--c5)" },
  { k: "banca", n: "Banca de subiecte", i: "▤", g: "Materiale", c: "var(--c4)" },
  { k: "clase", n: "Clasele mele", i: "▣", g: "Cont", c: "var(--c1)" }];
const MOBIL_PROF = ["acasa", "teme", "elevi", "calendar"];

/* ---------------- adresa paginii ---------------- */
function citesteRuta() {
  const m = location.hash.match(/^#\/([\w-]+)(?:\/([^/?#]+))?/);
  S.pag = m ? m[1] : "acasa";
  S.pagId = m && m[2] ? decodeURIComponent(m[2]) : null;
}
/* S e definit în app.js (încărcat după acest fișier), deci adresa se citește la primul desen */
function asiguraRuta() { if (S.pag === undefined) citesteRuta(); }
function mergi(pag, id) {
  const nou = "#/" + pag + (id ? "/" + encodeURIComponent(id) : "");
  if (location.hash === nou) { schimbaPagina(); return; }
  location.hash = nou; // hashchange desenează pagina
}
function schimbaPagina() {
  citesteRuta(); S.meniuMai = false; S.ultimaCheie = null;
  if (!S.profil) return;
  document.activeElement?.blur?.();
  draw(); aplicaFocus(); window.scrollTo(0, 0);
}
addEventListener("hashchange", () => { if (/^#demo/.test(location.hash)) return; schimbaPagina(); });

/* ---------------- cadrul: meniu + pagină ---------------- */
function linkNav(p, extra) {
  const activ = S.pag === p.k || (p.k === "teme" && (S.pag === "tema" || S.pag === "tema-noua")) || (p.k === "elevi" && S.pag === "elev");
  return h("a", { href: "#/" + p.k, class: "nav-item" + (activ ? " on" : "") + (extra || ""), "aria-current": activ ? "page" : null,
    style: "--ic:" + p.c, onclick: () => sunetClic() },
    h("span", { class: "nav-ic", "aria-hidden": "true" }, p.i), h("span", { class: "nav-n" }, p.n),
    p.badge ? h("span", { class: "nav-badge", "aria-label": p.badge + " noi" }, p.badge) : null);
}
function cadru(pagini, mobil, continut, susMeniu) {
  const grupe = [];
  for (const p of pagini) { let g = grupe.find(x => x.n === p.g); if (!g) grupe.push(g = { n: p.g, l: [] }); g.l.push(p); }
  const elev = S.profil && S.profil.rol === "elev";
  const side = h("nav", { class: "sidenav", "aria-label": "Meniu" },
    h("a", { href: "#/acasa", class: "nav-marca", "aria-label": "Caietul de teme, acasă", style: "text-decoration:none" },
      h("span", { class: "semn", "aria-hidden": "true" }, "✦"), h("span", null, h("strong", null, "Caietul de teme"), h("small", null, elev ? "ATELIER LITERAR" : "CATEDRA DE ROMÂNĂ"))),
    susMeniu || null,
    grupe.map(g => h("div", { class: "nav-grup" }, h("div", { class: "nav-titlu" }, g.n), g.l.map(p => linkNav(p)))),
    h("div", { class: "nota-meniu" }, h("strong", null, elev ? "În ritmul tău." : "La catedră."),
      h("p", null, elev ? "Un loc pentru idei, lecturi și progresul tău la limba română." : "Teme, corecturi și progresul clasei, într-un singur caiet."),
      elev ? h("a", { href: "#/opere" }, "Explorează biblioteca ↗") : h("a", { href: "#/tema-noua" }, "Pregătește o temă nouă ↗")));
  const deJos = pagini.filter(p => mobil.includes(p.k));
  const restul = pagini.filter(p => !mobil.includes(p.k));
  const restActiv = restul.some(p => p.k === S.pag);
  const jos = h("nav", { class: "bottomnav", "aria-label": "Meniu" },
    deJos.map(p => linkNav(p)),
    h("button", { type: "button", class: "nav-item" + (restActiv || S.meniuMai ? " on" : ""), style: "--ic:var(--c5)", "aria-expanded": S.meniuMai ? "true" : "false",
      onclick: () => { S.meniuMai = !S.meniuMai; draw(); } },
      h("span", { class: "nav-ic", "aria-hidden": "true" }, "⋯"), h("span", { class: "nav-n" }, "Mai mult")));
  const foaie = S.meniuMai ? h("div", { class: "meniu-mai", onclick: e => { if (e.target === e.currentTarget) { S.meniuMai = false; draw(); } } },
    h("div", { class: "meniu-mai-in" }, susMeniu ? h("div", { class: "meniu-mai-sus" }, susMeniu.cloneNode(true)) : null,
      h("div", { class: "meniu-mai-grila" }, restul.map(p => linkNav(p, " mare"))))) : null;
  if (foaie) { // clona selectorului de clasă are nevoie de evenimentul ei
    const sel = foaie.querySelector("select"); if (sel) sel.onchange = e => schimbaClasa(e.target.value);
  }
  return [h("div", { class: "cadru" }, side, h("div", { class: "pagina stack" }, continut)), jos, foaie].filter(Boolean);
}

/* titlul paginii, cu link înapoi când e o pagină „de detaliu” */
function capPagina(titlu, sub, actiuni, inapoi) {
  return h("div", { class: "cap-pagina" },
    inapoi ? h("a", { href: "#/" + inapoi[0], class: "inapoi" }, "‹ " + inapoi[1]) : null,
    h("div", { class: "cap-rand" },
      h("div", null, h("h2", { class: "titlu-pagina" }, titlu), sub ? h("p", { class: "muted small" }, sub) : null),
      actiuni || null));
}
/* file mici în interiorul unei pagini (de ex. BAC: Simulare / Plan de eseu / Corector) */
function subFile(lista, cheie) {
  if (!lista.some(([k]) => k === S[cheie])) S[cheie] = lista[0][0];
  return h("div", { class: "seg sub-file", role: "tablist" }, lista.map(([k, n]) =>
    h("button", { type: "button", role: "tab", "aria-selected": S[cheie] === k ? "true" : "false", class: S[cheie] === k ? "on" : "",
      onclick: () => { S[cheie] = k; sunetClic(); draw(); } }, n)));
}
function gol(titlu, text, buton) {
  return h("div", { class: "sheet empty" }, h("h2", null, titlu), h("p", { class: "muted" }, text), buton || null);
}

/* banda de sus de pe pagina Acasă (carte deschisă, stele aurii) și cardurile cu cifre */
function erouAcasa(supra, titlu, text, buton) {
  return h("section", { class: "erou-acasa", "aria-label": "Bun venit" },
    h("div", { class: "erou-text" }, h("div", { class: "erou-supra" }, "✦ " + supra), h("h2", null, titlu), h("p", null, text),
      buton ? h("a", { class: "erou-btn", href: buton[1] }, buton[0], h("span", { "aria-hidden": "true" }, "↗")) : null),
    h("div", { class: "erou-arta", "aria-hidden": "true" }, h("div", { class: "orb" }),
      h("div", { class: "fila-st" }, h("div", { class: "randuri" })), h("div", { class: "fila-dr" }, h("div", { class: "randuri" })),
      h("span", { class: "ornament" }, "❦"), h("span", { class: "sc a" }, "✧"), h("span", { class: "sc b" }, "✦"), h("span", { class: "sc c" }, "✧")));
}
function cifra(eticheta, valoare, mic, ic, culoare, href) {
  return h(href ? "a" : "div", { class: "cifra", href: href || null, style: "--ci:" + culoare },
    h("div", { class: "cifra-sus" }, h("span", { class: "cifra-et" }, eticheta), h("span", { class: "cifra-ic", "aria-hidden": "true" }, ic)),
    h("strong", null, valoare), h("small", null, mic));
}

/* ---------------- ELEV ---------------- */
function paginiElev() {
  const nefacute = (S.temeElev || []).filter(t => !S.predariElev.some(p => p.tema_id === t.id)).length;
  const necitite = mesajeNecititeElev();
  return PAGINI_ELEV.map(p => p.k === "teme" && nefacute ? { ...p, badge: nefacute } : p.k === "acasa" && necitite ? { ...p, badge: necitite } : p);
}
function drawElev() {
  asiguraRuta();
  if (S.offline) return drawOffline();
  const pag = S.pag;
  let c;
  if (pag === "tema") c = paginaTemaElev(S.pagId);
  else if (pag === "teme") c = paginaTemeElev();
  else if (pag === "calendar") c = [capPagina("Calendar", "Termenele temelor, pe zile. Apasă pe o temă ca s-o deschizi."), ...calendarView("elev")];
  else if (pag === "clasament") c = paginaClasamentElev();
  else if (pag === "bac") c = [capPagina("Pregătire pentru BAC", "Simulări în stilul modelului oficial, planuri de eseu și un corector pentru textele tale."),
    subFile([["sim", "Simulare"], ["plan", "Plan de eseu"], ["corector", "Corector"]], "subBac"),
    ...(S.subBac === "plan" ? [planEseuView()] : S.subBac === "corector" ? [corectorView()] : [antrenamentView(), istoricBac()])];
  else if (pag === "opere") c = [capPagina("Opere", "Fișele operelor din programă și harta curentelor literare."),
    subFile([["bib", "Biblioteca"], ["cur", "Curente literare"]], "subOpere"),
    ...(S.subOpere === "cur" ? [curenteView()] : opereView().slice(0, 2))];
  else if (pag === "limba") c = [capPagina("Limba română", "Exersează DOOM-ul și termenii de teorie literară."),
    subFile([["doom", "DOOM"], ["gram", "Punctuație și gramatică"], ["fc", "Fișe de memorat"]], "subLimba"),
    S.subLimba === "fc" ? flashcardsView() : S.subLimba === "gram" ? gramaticaView() : doomView()];
  else if (pag === "jocuri") c = [capPagina("Jocuri", "Învață figurile de stil jucându-te."),
    subFile([["fig", "Ghicește figura"], ["autori", "Autori și citate"], ["duel", "Duel"]], "subJocuri"),
    S.subJocuri === "duel" ? duelView() : S.subJocuri === "autori" ? autoriView() : figuriView()];
  else if (pag === "profil") c = paginaProfilElev();
  else c = paginaAcasaElev();
  return cadru(paginiElev(), MOBIL_ELEV, c);
}

function formIntraInClasa() {
  return h("form", { class: "sheet row", onsubmit: async e => {
      e.preventDefault();
      const v = (S.drafts.cod || "").trim();
      if (!v) { toast("Scrie codul primit de la profesor."); return; }
      const { error } = await S.sb.rpc("intra_in_clasa", { p_cod: v });
      if (error) { toast(eroareDb(error, "Nu am putut intra în clasă.")); return; }
      S.drafts.cod = ""; toast("Ai intrat în clasă."); reincarca();
    } },
    h("label", { class: "row", for: "cod-clasa", style: "flex:1;min-width:220px" }, h("span", { class: "small", style: "white-space:nowrap" }, "Cod de clasă"),
      h("input", { type: "text", id: "cod-clasa", value: S.drafts.cod || "", placeholder: "Ex.: K7M2QX", style: "flex:1;text-transform:uppercase", oninput: e => S.drafts.cod = e.target.value })),
    h("button", { class: "btn", type: "submit" }, "Intră în clasă"));
}

const numeClasaElev = id => ((S.claseElev || []).find(c => c.id === id) || {}).nume || "";
function zileRamase(termen) {
  if (!termen) return null;
  const azi = new Date(); azi.setHours(0, 0, 0, 0);
  return Math.round((new Date(termen + "T00:00:00") - azi) / 86400000);
}
function chipTermen(termen, gata) {
  const z = zileRamase(termen);
  if (z == null) return null;
  if (gata) return h("span", { class: "chip none" }, "Termen " + fmtZi(termen));
  return h("span", { class: "chip " + (z < 0 ? "err" : z <= 2 ? "wait" : "none") }, z < 0 ? "Termen trecut" : z === 0 ? "Termen azi" : z === 1 ? "Termen mâine" : `În ${z} zile`);
}
/* un rând din lista de teme: se deschide pagina temei */
function randTemaElev(t, i) {
  const p = S.predariElev.find(x => x.tema_id === t.id);
  const fin = p ? notaFinala(p) : null;
  const nMsg = (S.mesaje || []).filter(m => m.tema_id === t.id).length;
  return h("a", { href: "#/tema/" + encodeURIComponent(t.id), class: "rand-tema", style: "--acc:" + CULORI[i % 5] },
    h("span", { class: "rt-bara", "aria-hidden": "true" }),
    h("span", { class: "rt-text" }, h("span", { class: "rt-titlu" }, t.titlu),
      h("span", { class: "muted small" }, [numeClasaElev(t.clasa_id), `${(t.exercitii || []).length} exerciții`, nMsg ? `${nMsg} mesaje` : ""].filter(Boolean).join(" · "))),
    h("span", { class: "rt-dr" }, chipTermen(t.termen, !!p), statusChip(p, S.busy[t.id]),
      fin != null ? h("span", { class: "nota" + (fin < 5 ? " fail" : "") }, fmtNota(fin)) : null),
    h("span", { class: "rt-sageata", "aria-hidden": "true" }, "›"));
}

function paginaAcasaElev() {
  const nume = (S.profil.nume || "").split(" ")[0] || "elevule";
  if (!S.claseElev.length) return [capPagina(`Salut, ${nume}!`, "Ca să primești teme, intră în clasa profesorului tău."), formIntraInClasa(),
    gol("Nu ești încă într-o clasă", "Cere-i profesorului codul clasei și scrie-l mai sus. Apoi temele apar aici.")];
  const lucrari = S.predariElev;
  const xp = Math.round(lucrari.reduce((s, p) => s + Number(p.punctaj || 0), 0) * 10 + lucrari.length * 20);
  const nivel = Math.floor(xp / 100) + 1;
  const note = lucrari.map(notaFinala).filter(n => n != null);
  const media = note.length ? note.reduce((a, b) => a + b, 0) / note.length : null;
  const deFacut = S.temeElev.filter(t => !lucrari.some(p => p.tema_id === t.id))
    .sort((a, b) => String(a.termen || "9999").localeCompare(String(b.termen || "9999")));
  const recente = lucrari.filter(p => notaFinala(p) != null).sort((a, b) => String(b.trimis_la).localeCompare(String(a.trimis_la))).slice(0, 3);
  const lista = Object.values(S.clasamente || {})[0] || [];
  const loc = lista.findIndex(r => r.eu) + 1;
  const urm = deFacut[0];
  const curand = deFacut.filter(t => { const z = zileRamase(t.termen); return z != null && z >= 0 && z <= 3; }).length;
  const out = [
    erouAcasa("Jurnalul tău de învățare", [`Salut, ${nume}! `, h("em", null, deFacut.length ? "Fiecare pagină are o poveste." : "Ești la zi.")],
      deFacut.length ? `Ai ${deFacut.length} ${deFacut.length === 1 ? "temă" : "teme"} de făcut. Temele, lecturile și pregătirea pentru BAC sunt aici, organizate pentru tine.` : "Ai trimis toate temele. Profită de timp pentru o simulare BAC sau o lectură nouă.",
      urm ? ["Continuă de unde ai rămas", "#/tema/" + encodeURIComponent(urm.id)] : ["Fă o simulare BAC", "#/bac"]),
    h("div", { class: "cifre" },
      cifra("Teme de făcut", deFacut.length, curand ? `${curand} cu termen apropiat` : "niciun termen apropiat", "▤", "var(--c1)", "#/teme"),
      cifra("Media ta", media == null ? "–" : fmtNota(media), `${lucrari.length} ${lucrari.length === 1 ? "temă trimisă" : "teme trimise"}`, "✓", "var(--c3)", "#/profil"),
      cifra("Nivel", nivel, `${xp} XP · încă ${100 - xp % 100} până la nivelul ${nivel + 1}`, "◔", "var(--c4)", "#/profil"),
      cifra("Locul în clasă", loc ? `${loc}/${lista.length}` : "–", "după puncte XP", "✧", "var(--c2)", "#/clasament"))];
  out.push(...anunturiElev());
  out.push(h("div", { class: "grid-acasa" }, obiectivSaptamana(), serieSiSugestie()));
  const notif = notificariElev(); if (notif) out.push(notif);
  const necitite = firePrimiteElev();
  if (necitite.length) out.push(h("div", { class: "sheet", style: "--acc:var(--c4)" }, h("h3", null, "Răspunsuri de la profesor"),
    h("div", { class: "stack", style: "gap:8px;margin-top:10px" }, necitite.map(m => {
      const t = S.temeElev.find(x => x.id === m.tema_id);
      return h("a", { class: "rand-verif", href: "#/tema/" + encodeURIComponent(m.tema_id), onclick: () => { S.msgDeschis = "msg-" + m.tema_id + "-" + S.user.id; } },
        h("span", { class: "nume" }, t ? t.titlu : "Temă"), h("span", { class: "small", style: "flex:1;text-align:left" }, "„" + m.text.slice(0, 90) + (m.text.length > 90 ? "…" : "") + "”"));
    }))));
  out.push(h("div", { class: "grid-acasa" },
    h("section", { class: "sheet stack", style: "--acc:var(--c2)" },
      h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "De făcut"), h("a", { href: "#/teme", class: "link-btn" }, "Toate temele ›")),
      deFacut.length ? h("div", { class: "stack", style: "gap:8px" }, deFacut.slice(0, 4).map(randTemaElev)) : h("p", { class: "muted small" }, "Nimic de făcut acum.")),
    h("section", { class: "sheet stack", style: "--acc:var(--c3)" },
      h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Ultimele note"), h("a", { href: "#/profil", class: "link-btn" }, "Profilul meu ›")),
      recente.length ? h("div", { class: "stack", style: "gap:8px" }, recente.map(p => {
        const t = S.temeElev.find(x => x.id === p.tema_id); return t ? randTemaElev(t, S.temeElev.indexOf(t)) : null;
      })) : h("p", { class: "muted small" }, "Notele apar aici după ce trimiți temele."))));
  out.push(h("div", { class: "scurtaturi" }, PAGINI_ELEV.filter(p => p.g === "Învăț").map(p =>
    h("a", { href: "#/" + p.k, class: "scurtatura", style: "--ic:" + p.c }, h("span", { class: "nav-ic", "aria-hidden": "true" }, p.i), h("b", null, p.n),
      h("span", { class: "muted small" }, { bac: "Simulări și eseuri", opere: "Fișe de lectură", limba: "DOOM și termeni", jocuri: "Figuri de stil" }[p.k])))));
  return out;
}

function paginaTemeElev() {
  const f = S.filtruTeme || "de-facut";
  const trimisa = t => S.predariElev.some(p => p.tema_id === t.id);
  const toate = S.temeElev || [];
  const caut = normalizeaza(S.cautTeme || "");
  const lista = sorteazaTeme(toate.filter(t => (f === "toate" || (f === "trimise" ? trimisa(t) : !trimisa(t)))
    && (!caut || normalizeaza(t.titlu + " " + numeClasaElev(t.clasa_id)).includes(caut))));
  const n = { "de-facut": toate.filter(t => !trimisa(t)).length, trimise: toate.filter(trimisa).length, toate: toate.length };
  const out = [capPagina("Teme", "Apasă pe o temă ca s-o deschizi: o rezolvi, vezi corectura și îi scrii profesorului.")];
  if (!S.claseElev.length) return out.concat(formIntraInClasa(), gol("Nu ești încă într-o clasă", "Cere-i profesorului codul clasei."));
  out.push(h("div", { class: "seg sub-file" }, [["de-facut", "De făcut"], ["trimise", "Trimise"], ["toate", "Toate"]].map(([k, t]) =>
    h("button", { type: "button", class: f === k ? "on" : "", onclick: () => { S.filtruTeme = k; draw(); } }, `${t} (${n[k]})`))),
    cautaSiSorteaza());
  if (!lista.length) out.push(gol(f === "de-facut" ? "Nicio temă de făcut" : "Nicio temă aici", f === "de-facut" ? "Ai trimis tot. Temele noi apar aici." : "Temele trimise apar aici."));
  else out.push(h("div", { class: "stack lista-teme", style: "gap:10px" }, lista.map(t => randTemaElev(t, toate.indexOf(t)))));
  return out;
}

function paginaTemaElev(id) {
  const t = (S.temeElev || []).find(x => x.id === id);
  if (!t) return [capPagina("Tema nu a fost găsită", "Poate a fost ștearsă de profesor.", null, ["teme", "Toate temele"])];
  const i = S.temeElev.indexOf(t);
  if (t.minute && !S.predariElev.some(p => p.tema_id === t.id) && !startLimita(t.id))
    return [h("a", { href: "#/teme", class: "inapoi" }, "‹ Toate temele"), ecranStartTimp(t)];
  const card = cardElev(t, S.predariElev.find(p => p.tema_id === t.id), numeClasaElev(t.clasa_id));
  card.style.setProperty("--acc", CULORI[i % 5]);
  // conversația cu profesorul e deschisă de la început pe pagina temei
  const cheie = "msg-" + t.id + "-" + S.user.id;
  if (S.msgAuto !== cheie) { S.msgAuto = cheie; S.msgDeschis = cheie; marcheazaCitite(t.id); }
  const vecini = [S.temeElev[i - 1], S.temeElev[i + 1]];
  return [h("div", { class: "row", style: "justify-content:space-between" }, h("a", { href: "#/teme", class: "inapoi" }, "‹ Toate temele"), bareTema(t)), card,
    h("section", { class: "sheet stack", style: "--acc:var(--c4)" }, h("h3", null, "Întrebări pentru profesor"), mesajeView(t.id, S.user.id)),
    h("div", { class: "row vecini" },
      vecini[0] ? h("a", { href: "#/tema/" + encodeURIComponent(vecini[0].id), class: "btn ghost" }, "‹ " + vecini[0].titlu) : h("span"),
      vecini[1] ? h("a", { href: "#/tema/" + encodeURIComponent(vecini[1].id), class: "btn ghost" }, vecini[1].titlu + " ›") : null)];
}

function paginaClasamentElev() {
  const out = [capPagina("Clasament", "Puncte XP din temele trimise. Cu cât lucrezi mai bine, cu atât urci.")];
  for (const c of S.claseElev || []) { const v = clasamentView((S.clasamente || {})[c.id], c.nume); if (v) out.push(v); }
  if (out.length === 1) out.push(gol("Clasamentul e gol", "Apare după primele teme trimise în clasă."));
  return out;
}

function paginaProfilElev() {
  return [capPagina("Profilul meu", "Avatarul, nivelul, insignele și linkul pentru părinți."), profilElev(),
    insigneExtraView(), statisticiTipuriView(), setariContView(),
    h("section", { class: "sheet stack", style: "--acc:var(--c3)" }, h("h3", null, "Clasele mele"),
      S.claseElev.length ? h("div", { class: "files" }, S.claseElev.map(c => h("span", { class: "chip none" }, c.nume))) : h("p", { class: "muted small" }, "Nu ești încă într-o clasă."),
      h("p", { class: "muted small" }, "Ai primit codul unei clase noi? Scrie-l aici:")),
    formIntraInClasa()];
}

/* mesaje: ce a răspuns profesorul și elevul n-a văzut încă */
function vazuteMsg() { try { return JSON.parse(citesteLocal(cheieElev("msg-vazute"), "{}")) || {}; } catch { return {}; } }
function firePrimiteElev() {
  const v = vazuteMsg(), fire = {};
  for (const m of S.mesaje || []) { if (m.elev_id !== S.user.id) continue; if (!fire[m.tema_id] || String(fire[m.tema_id].creat_la) < String(m.creat_la)) fire[m.tema_id] = m; }
  return Object.values(fire).filter(m => m.autor_id !== S.user.id && String(m.creat_la) > String(v[m.tema_id] || ""));
}
function mesajeNecititeElev() { return S.profil && S.profil.rol === "elev" ? firePrimiteElev().length : 0; }
function marcheazaCitite(temaId) {
  const v = vazuteMsg(); v[temaId] = new Date().toISOString(); scrieLocal(cheieElev("msg-vazute"), JSON.stringify(v));
}

/* ---------------- PROFESOR ---------------- */
async function schimbaClasa(id) {
  S.clasaSel = id; S.open = {}; S.raport = null; S.msgProf = null;
  if (!S.demo) await incarcaClasa().catch(() => toast("Clasa nu a putut fi încărcată."));
  if (S.pag === "tema") mergi("teme"); else draw();
}
function selectorClasa() {
  if (!S.clase.length) return null;
  const sel = h("select", { id: "alege-clasa", "aria-label": "Clasa", onchange: e => schimbaClasa(e.target.value) },
    S.clase.map(c => { const o = h("option", { value: c.id }, c.nume); o.selected = c.id === S.clasaSel; return o; }));
  return h("label", { class: "alege-clasa", for: "alege-clasa" }, h("span", { class: "nav-titlu" }, "Clasa curentă"), sel);
}
function paginiProf() {
  const n = deVerificatLista().length;
  const fire = {};
  for (const m of S.mesaje || []) { const k = m.tema_id + "|" + m.elev_id; if (!fire[k] || String(fire[k].creat_la) < String(m.creat_la)) fire[k] = m; }
  const msg = Object.values(fire).filter(m => m.autor_id === m.elev_id).length;
  return PAGINI_PROF.map(p => p.k === "acasa" && (n + msg) ? { ...p, badge: n + msg } : p);
}
function drawProfesor() {
  asiguraRuta();
  const pag = S.pag, clasa = S.clase.find(c => c.id === S.clasaSel);
  let c;
  const faraClasa = () => [capPagina("Bun venit!", "Începe prin a crea o clasă. Fiecare clasă primește un cod pe care îl dai elevilor."), formClasaNoua(true)];
  if (pag === "clase") c = paginaClase();
  else if (pag === "plan") c = planAnualView();
  else if (pag === "banca") c = bancaView();
  else if (!clasa) c = faraClasa();
  else if (pag === "tema") c = paginaTemaProf(S.pagId);
  else if (pag === "elev") c = fisaElev(S.pagId);
  else if (pag === "tema-noua") { S.newTema = true; c = [capPagina("Temă nouă", "Pentru " + clasa.nume + ". Grila și răspunsurile scurte se corectează pe loc; compunerile le corectează AI-ul după baremul tău.", null, ["teme", "Teme"]), formularTema()]; }
  else if (pag === "teme") c = paginaTemeProf(clasa);
  else if (pag === "elevi") c = [capPagina("Elevii clasei", `${S.membri.length} elevi în ${clasa.nume}`),
    ...(S.membri.length ? [eleviView(true), clasamentProfView()].filter(Boolean) : [gol("Niciun elev încă", "Dă-le elevilor codul clasei: " + clasa.cod)])];
  else if (pag === "calendar") c = [capPagina("Calendar", "Termenele temelor din " + clasa.nume + " și câți elevi au trimis."), ...calendarView("profesor")];
  else c = paginaClasa(clasa);
  return cadru(paginiProf(), MOBIL_PROF, c, selectorClasa());
}

function formClasaNoua(mare) {
  return h("form", { class: (mare ? "sheet " : "") + "stack", style: "gap:8px", onsubmit: async e => {
      e.preventDefault();
      const nume = (S.drafts.clasaNoua || "").trim();
      if (!nume) { toast("Scrie numele clasei."); return; }
      for (let i = 0; i < 3; i++) {
        const { data, error } = await S.sb.from("clase").insert({ nume, cod: codNou(), profesor_id: S.user.id }).select().single();
        if (!error) { S.drafts.clasaNoua = ""; S.clasaSel = data.id; toast("Clasa a fost creată. Dă-le elevilor codul ei."); await reincarca(); mergi("acasa"); return; }
        if (error.code !== "23505") break;
      }
      toast("Clasa nu a putut fi creată. Încearcă din nou.");
    } },
    mare ? h("h3", null, "Clasă nouă") : null,
    h("div", { class: "row" },
      h("input", { type: "text", id: "clasa-noua", style: "flex:1;min-width:200px", placeholder: "Ex.: a IX-a B — Română", value: S.drafts.clasaNoua || "", oninput: e => S.drafts.clasaNoua = e.target.value, "aria-label": "Numele clasei noi" }),
      h("button", { class: "btn", type: "submit" }, "+ Creează clasa")));
}

function paginaClase() {
  return [capPagina("Clasele mele", "Alege clasa cu care lucrezi sau creează una nouă."),
    S.clase.length ? h("div", { class: "grila-clase" }, S.clase.map((c, i) =>
      h("button", { type: "button", class: "sheet card-clasa" + (c.id === S.clasaSel ? " on" : ""), style: "--acc:" + CULORI[i % 5],
        onclick: async () => { await schimbaClasa(c.id); mergi("acasa"); } },
        h("span", { class: "rt-titlu" }, c.nume), h("span", { class: "muted small" }, "Cod: " + c.cod),
        c.id === S.clasaSel ? h("span", { class: "chip ok" }, "Clasa curentă") : h("span", { class: "chip none" }, "Deschide")))) : null,
    formClasaNoua(true)];
}

function paginaClasa(clasa) {
  const note = S.predari.map(notaFinala).filter(n => n != null);
  const media = note.length ? note.reduce((a, b) => a + b, 0) / note.length : null;
  const nVerif = deVerificatLista().length;
  const prenume = (S.profil.nume || "").replace(/\s*\(.*\)$/, "");
  const out = [
    erouAcasa("Catedra ta · " + clasa.nume, [`Bună ziua, ${prenume}. `, h("em", null, nVerif ? "Ai lucrări de citit." : "Clasa e la zi.")],
      nVerif ? `${nVerif} ${nVerif === 1 ? "lucrare așteaptă" : "lucrări așteaptă"} privirea ta. Restul s-au corectat singure.` : `${S.membri.length} elevi și ${S.teme.length} teme în această clasă. Toate lucrările sunt corectate.`,
      ["+ Temă nouă", "#/tema-noua"]),
    h("div", { class: "sheet stack", style: "--acc:var(--c1)" },
      h("div", { class: "tema-head" },
        h("div", null, h("div", { class: "nav-titlu" }, "Clasa"), h("h2", { class: "titlu-pagina" }, clasa.nume), h("div", { class: "muted small" }, `${S.membri.length} elevi · ${S.teme.length} teme`)),
        h("div", null, h("div", { class: "label" }, "Codul clasei"), h("div", { class: "tile-row", "aria-label": "Codul clasei: " + clasa.cod, style: "margin-top:6px" }, [...clasa.cod].map(c => h("span", { class: "tila", "aria-hidden": "true" }, c))))),
      S.membri.length ? h("div", { class: "row" },
          h("button", { class: "btn ghost", type: "button", onclick: () => exportaNote(clasa) }, "Descarcă notele (Excel)"),
          h("label", { class: "row small", style: "gap:8px;cursor:pointer" },
            h("input", { type: "checkbox", checked: clasa.arata_nume !== false, onchange: async e => {
              const v = e.target.checked; clasa.arata_nume = v;
              const { error } = await S.sb.from("clase").update({ arata_nume: v }).eq("id", clasa.id);
              toast(error ? "Setarea nu a putut fi salvată." : v ? "Elevii văd numele colegilor în clasament." : "În clasament, colegii apar ca „Elev 1, Elev 2…”.");
            } }), "Elevii văd numele colegilor în clasament"))
        : h("p", { class: "muted small" }, "Niciun elev încă. Dă-le codul de mai sus; ei îl scriu după ce își fac cont.")),
    h("div", { class: "stats stats-mari" },
      h("a", { href: "#/elevi", class: "stat" }, h("div", { class: "label" }, "Elevi"), h("div", { class: "v" }, S.membri.length)),
      h("a", { href: "#/teme", class: "stat" }, h("div", { class: "label" }, "Teme"), h("div", { class: "v" }, S.teme.length)),
      h("div", { class: "stat" }, h("div", { class: "label" }, "Media clasei"), h("div", { class: "v nota" }, fmtNota(media))),
      h("div", { class: "stat" }, h("div", { class: "label" }, "De verificat"), h("div", { class: "v", style: nVerif ? "color:var(--warn)" : "" }, nVerif))),
    h("div", { class: "row" }, h("a", { href: "#/tema-noua", class: "btn" }, "+ Temă nouă"), h("a", { href: "#/teme", class: "btn ghost" }, "Vezi temele")),
    anuntProfView(clasa)];
  if (S.membri.length) {
    const al = alertaEleviView(); if (al) out.push(al);
    const gr = graficMediiView(); if (gr) out.push(gr);
    out.push(deVerificatView());
    const mn = mesajeNoiView(); if (mn) out.push(mn);
    if (S.raport) out.push(raportView());
    else if (S.predari.length) out.push(h("div", null, h("button", { class: "btn ghost", type: "button", onclick: cereRaport }, "Raport: greșelile frecvente din clasă")));
  }
  return out;
}

function paginaTemeProf(clasa) {
  const out = [capPagina("Teme", clasa.nume + ": apasă pe o temă ca să vezi lucrările elevilor.", h("a", { href: "#/tema-noua", class: "btn" }, "+ Temă nouă"))];
  if (!S.teme.length) return out.concat(gol("Nicio temă în această clasă", "Adaugă prima temă: grilă, răspunsuri scurte sau compuneri corectate de AI.", h("a", { href: "#/tema-noua", class: "btn" }, "+ Temă nouă")));
  out.push(h("div", { class: "stack lista-teme", style: "gap:10px" }, S.teme.map((t, i) => {
    const rows = S.predari.filter(p => p.tema_id === t.id);
    const note = rows.map(notaFinala).filter(n => n != null);
    const media = note.length ? note.reduce((a, b) => a + b, 0) / note.length : null;
    const verif = deVerificatLista().filter(x => x.t.id === t.id).length;
    return h("a", { href: "#/tema/" + encodeURIComponent(t.id), class: "rand-tema", style: "--acc:" + CULORI[i % 5] },
      h("span", { class: "rt-bara", "aria-hidden": "true" }),
      h("span", { class: "rt-text" }, h("span", { class: "rt-titlu" }, t.titlu),
        h("span", { class: "muted small" }, ["Publicată " + fmtData(t.creat_la), t.termen ? "termen " + fmtZi(t.termen) : ""].filter(Boolean).join(" · "))),
      h("span", { class: "rt-dr" },
        t.ciorna ? h("span", { class: "chip none" }, "Ciornă") : t.publicata_la && new Date(t.publicata_la) > new Date() ? h("span", { class: "chip wait" }, "Apare " + fmtData(t.publicata_la)) : null,
        t.minute ? h("span", { class: "chip none" }, `${t.minute} min`) : null,
        verif ? h("span", { class: "chip wait" }, `${verif} de verificat`) : null,
        h("span", { class: "chip " + (rows.length >= S.membri.length && S.membri.length ? "ok" : "none") }, `${rows.length}/${S.membri.length} lucrări`),
        media != null ? h("span", { class: "nota" + (media < 5 ? " fail" : "") }, fmtNota(media)) : null),
      h("span", { class: "rt-sageata", "aria-hidden": "true" }, "›"));
  })));
  return out;
}

function paginaTemaProf(id) {
  const t = S.teme.find(x => x.id === id);
  if (!t) return [capPagina("Tema nu a fost găsită", "Poate e în altă clasă sau a fost ștearsă.", null, ["teme", "Teme"])];
  const card = cardProfesor(t);
  card.style.setProperty("--acc", CULORI[S.teme.indexOf(t) % 5]);
  return [h("a", { href: "#/teme", class: "inapoi" }, "‹ Teme"), card];
}

/* lista „De verificat” ca date (folosită și pentru numărul din meniu) */
function deVerificatLista() {
  const lista = [];
  for (const p of S.predari || []) {
    const t = (S.teme || []).find(x => x.id === p.tema_id); if (!t) continue;
    const motive = [];
    if (p.status === "partial") motive.push(p.eroare ? "AI-ul n-a putut corecta" : "Răspunsuri libere necorectate");
    if (Object.values(p.rezultate || {}).some(r => r.sigur === false)) motive.push("AI-ul nu e sigur");
    const n = notaFinala(p);
    if (n != null && n < 5 && p.nota_profesor == null) motive.push("Notă sub 5");
    if (motive.length) lista.push({ p, t, motive });
  }
  return lista;
}
/* deschide lucrarea unui elev pe pagina temei */
function deschideLucrarea(temaId, predareId, laMesaje) {
  if (predareId) S.open[predareId] = true;
  mergi("tema", temaId);
  setTimeout(() => document.getElementById(laMesaje || ("lucrare-" + predareId))?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
}
