/* Caietul de teme: secțiunile pentru liceu (BAC, opere, limbă, jocuri, plan anual, bancă de subiecte).
   Folosește funcțiile din app.js (h, S, render, toast, avatar etc.), care sunt disponibile când se desenează pagina. */
"use strict";

/* ---------------- file (secțiuni) ---------------- */
const FILE_ELEV = [["teme", "Teme"], ["calendar", "Calendar"], ["bac", "BAC"], ["opere", "Opere"], ["limba", "Limbă"], ["jocuri", "Jocuri"]];
const FILE_PROF = [["clasa", "Clasa"], ["calendar", "Calendar"], ["plan", "Plan anual"], ["banca", "Banca de subiecte"]];
function bareFile(file, cheie) {
  return h("nav", { class: "file", "aria-label": "Secțiuni" }, file.map(([k, n]) =>
    h("button", { type: "button", class: "fila" + (S[cheie] === k ? " on" : ""), "aria-current": S[cheie] === k ? "page" : null,
      onclick: () => { S[cheie] = k; S.ultimaCheie = null; sunetClic(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); } }, n)));
}
function citesteJSON(k, d) { try { return JSON.parse(citesteLocal(k, "") || "null") ?? d; } catch { return d; } }
function eroareFunctie(error, implicit) {
  return (async () => { let m = implicit; try { const j = await error.context.json(); if (j && j.eroare) m = j.eroare; } catch { /* */ } return m; })();
}
async function cereAI(corp, implicit) {
  const { data, error } = await S.sb.functions.invoke("corecteaza", { body: corp });
  if (error) throw new Error(await eroareFunctie(error, implicit));
  return data;
}
const cheieElev = k => k + "-" + ((S.user && S.user.id) || "anonim");

/* =====================================================================
   BAC: simulare completă, text argumentativ, plan de eseu, corector de redactare
   ===================================================================== */
function bacView() {
  return [
    h("div", { class: "sheet stack", style: "--acc:var(--c5)" },
      h("h2", null, "Pregătire pentru BAC"),
      h("p", { class: "muted" }, "Simulări cu subiecte noi în stilul modelului oficial, antrenament pe textul argumentativ, planuri de eseu pentru operele din programă și un corector pentru textele tale.")),
    antrenamentView(), istoricBac(), planEseuView(), corectorView()];
}

function istoricBac() {
  let ist = [];
  try { ist = JSON.parse(citesteLocal("antrenamente", "[]")); } catch { ist = []; }
  const sim = ist.filter(x => x.bac);
  if (!sim.length) return h("div", { class: "sheet" }, h("h3", null, "Progresul la simulări"), h("p", { class: "muted small" }, "După prima simulare de BAC, aici vezi cum evoluează nota."));
  const med = sim.reduce((s, x) => s + x.nota, 0) / sim.length;
  return h("div", { class: "sheet" }, h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Progresul la simulări"), h("span", { class: "muted small" }, `${sim.length} simulări · media ${fmtNota(med)}`)),
    h("div", { style: "margin-top:10px" }, sparkline(sim.slice(-12).map(x => x.nota))));
}

/* ---- plan de eseu ---- */
const DEMO_PLAN = { titlu: "Particularitățile unui text poetic romantic: „Luceafărul”", sectiuni: [
  { titlu: "Introducere", idei: ["Încadrarea în romantism și în creația eminesciană (poem publicat în 1883).", "Tema: condiția geniului, într-o lume incapabilă să-l înțeleagă."] },
  { titlu: "Cuprins – două trăsături ale romantismului", idei: ["Antiteza între lumea terestră (Cătălina, Cătălin) și lumea cosmică (Hyperion).", "Motive romantice: luceafărul, zborul cosmic, visul; fuziunea genurilor."] },
  { titlu: "Cuprins – elemente de compoziție și limbaj", idei: ["Structura în patru tablouri și simetria I–IV.", "Imagini artistice; figurile de stil; prozodia (catrene, rimă încrucișată)."] },
  { titlu: "Încheiere", idei: ["Reluarea ideii: poemul exprimă esența romantismului eminescian.", "O opinie personală argumentată."] }],
  sfat: "Folosește citate scurte din text la fiecare argument și verifică-le în manual." };
function planEseuView() {
  const P = S.planEseu || (S.planEseu = { opera: OPERE[0].id, tip: "Particularitățile unui text poetic / ale unei opere", busy: false, rez: null });
  const tipuri = ["Particularitățile unui text poetic / ale unei opere", "Tema și viziunea despre lume", "Relația dintre două personaje", "Construcția unui personaj", "Particularitățile unui basm / ale unei nuvele / ale unei comedii"];
  return h("section", { class: "sheet stack", style: "--acc:var(--c4)" },
    h("div", null, h("h2", null, "Plan de eseu"), h("p", { class: "muted small" }, "Primești un plan pe structura BAC (introducere, argumente, încheiere). Eseul îl scrii tu.")),
    h("div", { class: "grid2" },
      h("label", { class: "f", for: "pe-opera" }, "Opera",
        h("select", { id: "pe-opera", onchange: e => P.opera = e.target.value }, OPERE.map(o => { const x = h("option", { value: o.id }, `${o.autor} – ${o.titlu}`); x.selected = o.id === P.opera; return x; }))),
      h("label", { class: "f", for: "pe-tip" }, "Tipul eseului",
        h("select", { id: "pe-tip", onchange: e => P.tip = e.target.value }, tipuri.map(t => { const x = h("option", { value: t }, t); x.selected = t === P.tip; return x; })))),
    h("div", null, h("button", { class: "btn", type: "button", disabled: P.busy, onclick: async () => {
      P.busy = true; render();
      try {
        const o = OPERE.find(x => x.id === P.opera);
        P.rez = S.demo ? DEMO_PLAN : await cereAI({ actiune: "plan_eseu", opera: `${o.autor}, „${o.titlu}” (${o.specie}, ${o.curent})`, tip: P.tip }, "Planul nu a putut fi generat.");
        sunetClic();
      } catch (e) { toast(e.message); }
      finally { P.busy = false; render(); }
    } }, P.busy ? "Se pregătește planul…" : "Fă-mi un plan")),
    P.rez ? h("div", { class: "plan" }, h("h3", null, P.rez.titlu),
      h("ol", null, (P.rez.sectiuni || []).map(s => h("li", null, h("strong", null, s.titlu), h("ul", null, (s.idei || []).map(i => h("li", null, i)))))),
      P.rez.sfat ? h("p", { class: "muted small" }, P.rez.sfat) : null) : null);
}

/* ---- corector de redactare ---- */
function corectorDemo(text) {
  const obs = [];
  const reguli = [[/\bsa\s+(dus|făcut|întâmplat|terminat|supărat)/gi, "s-a $1", "ortografie", "„s-a” (pronume + verb auxiliar) se scrie cu cratimă."],
    [/\bnici un\b/gi, "niciun", "ortografie", "Conform DOOM3, „niciun” se scrie legat."], [/\s+dar\b/g, ", dar", "punctuatie", "Înaintea lui „dar” se pune virgulă."],
    [/\bcopii\s+mei\b/gi, "copiii mei", "ortografie", "Forma articulată are trei de „i”: „copiii”."]];
  for (const [re, corect, tip, expl] of reguli) for (const m of text.matchAll(re)) obs.push({ tip, fragment: m[0].trim(), corect: m[0].replace(re, corect).trim(), explicatie: expl });
  return { observatii: obs.slice(0, 10), rezumat: obs.length ? "Am găsit câteva greșeli frecvente. (verificare simulată în demonstrație)" : "Nu am găsit greșelile frecvente pe care le verifică demonstrația." };
}
function corectorView() {
  const C = S.corector || (S.corector = { text: "", busy: false, rez: null });
  const cuv = (C.text.match(/\S+/g) || []).length;
  return h("section", { class: "sheet stack", style: "--acc:var(--c3)" },
    h("div", null, h("h2", null, "Corector de redactare"), h("p", { class: "muted small" }, "Lipește un text scris de tine (un eseu, un text argumentativ). Primești observații de ortografie, punctuație, gramatică și exprimare, înainte să-l predai.")),
    h("textarea", { id: "corector-text", value: C.text, style: "min-height:160px", placeholder: "Lipește aici textul tău…", oninput: e => { C.text = e.target.value; const n = document.getElementById("corector-nr"); if (n) n.textContent = `${(e.target.value.match(/\S+/g) || []).length} cuvinte`; } }),
    h("div", { class: "row", style: "justify-content:space-between" }, h("span", { class: "muted small", id: "corector-nr" }, `${cuv} cuvinte`),
      h("button", { class: "btn", type: "button", disabled: C.busy, onclick: async () => {
        if (C.text.trim().length < 20) { toast("Scrie sau lipește un text mai lung."); return; }
        C.busy = true; render();
        try { C.rez = S.demo ? corectorDemo(C.text) : await cereAI({ actiune: "corecteaza_text", text: C.text }, "Textul nu a putut fi verificat."); sunetClic(); }
        catch (e) { toast(e.message); }
        finally { C.busy = false; render(); }
      } }, C.busy ? "Se verifică…" : "Verifică textul")),
    C.rez ? h("div", { class: "stack", style: "gap:8px" },
      C.rez.rezumat ? h("p", null, C.rez.rezumat) : null,
      (C.rez.observatii || []).map(o => h("div", { class: "mistake", style: `border-left-color:var(${o.tip === "punctuatie" ? "--warn" : o.tip === "stil" ? "--c4" : "--bad"})` },
        h("div", { class: "row" }, h("span", { class: "chip none" }, { ortografie: "Ortografie", punctuatie: "Punctuație", gramatica: "Gramatică", stil: "Exprimare" }[o.tip] || o.tip),
          h("span", null, h("s", { class: "muted" }, o.fragment), " → ", h("b", null, o.corect))),
        o.explicatie ? h("div", { class: "small" }, o.explicatie) : null))) : null);
}

/* =====================================================================
   OPERE: biblioteca, harta curentelor, cercul de lectură
   ===================================================================== */
function opereView() {
  const citite = citesteJSON(cheieElev("citite"), {});
  const nr = Object.values(citite).filter(x => x && x.citit).length;
  const filtru = S.filtruOpere || "toate";
  const caut = normalizeaza(S.cautOpere || ""), curent = S.curentOpere || "", clasaF = S.clasaOpere || "";
  const lista = OPERE.filter(o => (filtru === "toate" || o.gen.startsWith(filtru))
    && (!caut || normalizeaza(`${o.titlu} ${o.autor} ${o.curent} ${o.specie}`).includes(caut))
    && (!curent || o.curent.includes(curent)) && (!clasaF || o.clasa.includes(clasaF)));
  return [
    h("div", { class: "sheet stack", style: "--acc:var(--c1)" },
      h("div", { class: "row", style: "justify-content:space-between" }, h("h2", null, "Operele din programă"),
        h("span", { class: "chip " + (nr >= 5 ? "ok" : "none") }, `Cercul de lectură: ${nr}/${OPERE.length} citite`)),
      h("p", { class: "muted small" }, "Fișe de recapitulare pentru operele de BAC. Bifează ce ai citit și scrie-ți impresiile în jurnal."),
      h("div", { class: "seg" }, [["toate", "Toate"], ["liric", "Poezie"], ["epic", "Proză"], ["dramatic", "Teatru"]].map(([k, n]) =>
        h("button", { type: "button", class: filtru === k ? "on" : "", onclick: () => { S.filtruOpere = k; render(); } }, n))),
      h("div", { class: "row", style: "justify-content:space-between" }, filtreOpere(), typeof comutatorVedereOpere === "function" ? comutatorVedereOpere() : null)),
    !lista.length ? h("div", { class: "sheet empty" }, h("h2", null, "Nicio operă găsită"), h("p", { class: "muted" }, "Schimbă căutarea sau filtrele."))
      : S.vedereOpere === "lista" && typeof listaOpere === "function" ? listaOpere(lista, citite)
      : h("div", { class: "grila-opere" }, lista.map((o, i) => fisaOpera(o, citite, i))),
    curenteView()];
}
function fisaOpera(o, citite, i) {
  const deschis = S.operaDeschisa === o.id, c = citite[o.id] || {};
  const card = h("section", { class: "sheet opera" + (deschis ? " deschisa" : ""), style: `--acc:${CULORI[i % 5]}` },
    h("button", { type: "button", class: "opera-cap", "aria-expanded": deschis ? "true" : "false", onclick: () => { S.operaDeschisa = deschis ? null : o.id; render(); } },
      h("span", { class: "opera-an" }, o.an), h("span", { class: "opera-titlu" }, o.titlu), h("span", { class: "muted small" }, o.autor),
      h("span", { class: "row", style: "gap:6px;margin-top:6px" }, h("span", { class: "chip none" }, o.specie.split(" (")[0]), c.citit ? h("span", { class: "chip ok" }, "Citită") : null)));
  if (!deschis) return card;
  const salveaza = patch => { const t = citesteJSON(cheieElev("citite"), {}); t[o.id] = { ...(t[o.id] || {}), ...patch }; scrieLocal(cheieElev("citite"), JSON.stringify(t)); };
  card.append(h("div", { class: "stack", style: "gap:12px;margin-top:12px" },
    h("div", { class: "files" }, h("span", { class: "chip none" }, o.curent), h("span", { class: "chip none" }, "genul " + o.gen), h("span", { class: "chip none" }, "clasa " + o.clasa)),
    h("div", null, h("div", { class: "label" }, "Tema"), h("p", null, o.tema)),
    h("div", null, h("div", { class: "label" }, "Idei și viziune"), h("ul", null, o.idei.map(x => h("li", null, x)))),
    h("div", null, h("div", { class: "label" }, "Compoziție, personaje, limbaj"), h("ul", null, o.elemente.map(x => h("li", null, x)))),
    o.citate.length ? h("div", null, h("div", { class: "label" }, "De reținut"), o.citate.map(x => h("blockquote", { class: "citat" }, x))) : null,
    o.personaje && o.personaje.length ? hartaPersonaje(o) : null,
    testOpera(o),
    h("div", { class: "jurnal" },
      h("label", { class: "row", style: "gap:8px;cursor:pointer" }, h("input", { type: "checkbox", checked: !!c.citit, onchange: e => {
        salveaza({ citit: e.target.checked }); if (e.target.checked) { sunetNota(10); toast(`Bravo! „${o.titlu}” a intrat în cercul tău de lectură.`); } render(); } }), "Am citit opera"),
      h("label", { class: "f", for: "jurnal-" + o.id }, "Jurnal de lectură (doar pentru tine)",
        h("textarea", { id: "jurnal-" + o.id, value: c.jurnal || "", style: "min-height:80px", placeholder: "Ce ți-a plăcut? Ce citat ai reținut? Ce personaj te-a surprins?", oninput: e => salveaza({ jurnal: e.target.value }) })))));
  return card;
}
function curenteView() {
  return h("section", { class: "sheet stack", style: "--acc:var(--c2)" },
    h("h2", null, "Harta curentelor literare"),
    h("div", { class: "cronologie" }, CURENTE.map((c, i) => {
      const des = S.curentDeschis === i;
      return h("div", { class: "curent" + (des ? " deschis" : ""), style: `--cc:${c.culoare}` },
        h("button", { type: "button", class: "curent-cap", onclick: () => { S.curentDeschis = des ? null : i; render(); } },
          h("span", { class: "punct" }), h("span", { class: "curent-ani" }, c.ani), h("b", null, c.nume)),
        des ? h("div", { class: "curent-corp" }, h("p", { class: "small muted" }, c.autori), h("ul", null, c.trasaturi.map(t => h("li", null, t))),
          h("div", { class: "files" }, OPERE.filter(o => o.curent.toLowerCase().includes(c.nume.split(" ")[0].toLowerCase().slice(0, 6))).map(o => h("span", { class: "chip none" }, o.titlu)))) : null);
    })));
}

/* =====================================================================
   LIMBĂ: antrenor DOOM3 (se adaptează la greșeli) + flashcards cu repetare la interval
   ===================================================================== */
function limbaView() { return [doomView(), flashcardsView()]; }

function alegeDoom() {
  const gres = citesteJSON(cheieElev("doom-greseli"), {});
  // categoriile greșite mai des au șanse mai mari
  const ponderi = DOOM.map(d => 1 + 3 * (gres[d[0]] || 0));
  let r = Math.random() * ponderi.reduce((a, b) => a + b, 0);
  for (let i = 0; i < DOOM.length; i++) { r -= ponderi[i]; if (r <= 0) return i; }
  return 0;
}
function doomView() {
  const D = S.doom || (S.doom = { i: alegeDoom(), ales: null, scor: 0, total: 0 });
  const [cat, prop, variante, ok] = DOOM[D.i];
  const gres = citesteJSON(cheieElev("doom-greseli"), {});
  const slabe = Object.entries(gres).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const parti = prop.split("___");
  return h("section", { class: "sheet stack", style: "--acc:var(--c3)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h2", null, "Antrenor DOOM3"), h("span", { class: "muted small" }, `Corecte: ${D.scor}/${D.total}`)),
    h("p", { class: "muted small" }, "Alege forma corectă. Exercițiile la care greșești revin mai des."),
    h("div", { class: "doom-prop" }, parti[0], h("span", { class: "gol" + (D.ales == null ? "" : D.ales === ok ? " bine" : " rau") }, D.ales == null ? "____" : variante[ok]), parti.slice(1).join("___")),
    h("div", { class: "row" }, variante.map((v, k) => h("button", { type: "button", class: "btn ghost doom-opt" + (D.ales === k ? (k === ok ? " bine" : " rau") : ""), disabled: D.ales != null, onclick: () => {
      D.ales = k; D.total++;
      const g = citesteJSON(cheieElev("doom-greseli"), {});
      if (k === ok) { D.scor++; g[cat] = Math.max(0, (g[cat] || 0) - 1); canta([660, 880]); }
      else { g[cat] = (g[cat] || 0) + 1; canta([300], "sine"); }
      scrieLocal(cheieElev("doom-greseli"), JSON.stringify(g)); render();
    } }, v))),
    D.ales != null ? h("div", { class: "row" }, h("span", { class: D.ales === ok ? "chip ok" : "chip err" }, D.ales === ok ? "Corect!" : `Corect era „${variante[ok]}”`),
      h("span", { class: "muted small" }, DOOM_CATEGORII[cat]),
      h("button", { class: "btn", type: "button", onclick: () => { S.doom = { ...D, i: alegeDoom(), ales: null }; render(); } }, "Următorul")) : null,
    slabe.length ? h("div", { class: "small muted" }, "De exersat: ", slabe.map(([c]) => DOOM_CATEGORII[c]).join(", ")) : null);
}

/* Flashcards, sistem Leitner: cutia 1 revine imediat, cutia 5 rar. */
function flashcardsView() {
  const cutii = citesteJSON(cheieElev("flash"), {});
  const F = S.flash || (S.flash = { intors: false, curent: null });
  if (F.curent == null) {
    const lista = FLASHCARDS.map(([t], i) => ({ i, c: cutii[t] || 1 }));
    const minim = Math.min(...lista.map(x => x.c));
    const cand = lista.filter(x => x.c === minim);
    F.curent = cand[Math.floor(Math.random() * cand.length)].i;
  }
  const [termen, def] = FLASHCARDS[F.curent];
  const stapanite = FLASHCARDS.filter(([t]) => (cutii[t] || 1) >= 4).length;
  const raspunde = stiu => {
    const t = citesteJSON(cheieElev("flash"), {});
    t[termen] = stiu ? Math.min(5, (t[termen] || 1) + 1) : 1;
    scrieLocal(cheieElev("flash"), JSON.stringify(t));
    S.flash = { intors: false, curent: null }; stiu ? canta([660, 880]) : canta([392], "sine"); render();
  };
  return h("section", { class: "sheet stack", style: "--acc:var(--c5)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h2", null, "Flashcards: teorie literară"), h("span", { class: "muted small" }, `Stăpânite: ${stapanite}/${FLASHCARDS.length}`)),
    h("div", { class: "xp" }, h("span", { style: `width:${Math.round(stapanite / FLASHCARDS.length * 100)}%` })),
    h("button", { type: "button", class: "card-flash" + (F.intors ? " intors" : ""), "aria-label": "Întoarce cartonașul", onclick: () => { F.intors = !F.intors; render(); } },
      h("span", { class: "fata-card" }, h("span", { class: "label" }, "Ce înseamnă?"), h("b", null, termen), h("span", { class: "muted small" }, "Apasă ca să vezi definiția")),
      h("span", { class: "spate-card" }, h("span", { class: "label" }, termen), h("span", null, def))),
    F.intors ? h("div", { class: "row" }, h("button", { class: "btn ghost", type: "button", onclick: () => raspunde(false) }, "Nu știam"), h("button", { class: "btn", type: "button", onclick: () => raspunde(true) }, "Știam")) : null);
}

/* =====================================================================
   JOCURI: recunoaște figura de stil, duel „ghicește opera” contra ceasului
   ===================================================================== */
function jocuriView() { return [figuriView(), duelView()]; }

function figuriView() {
  const Q = S.figQuiz || (S.figQuiz = { i: Math.floor(Math.random() * FIGURI_QUIZ.length), ales: null, serie: 0, xp: Number(citesteLocal(cheieElev("fig-xp"), "0")) || 0 });
  const [text, corect] = FIGURI_QUIZ[Q.i];
  const variante = Q.var || (Q.var = [corect, ...FIGURI.filter(f => f !== corect).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5));
  const nivel = Math.floor(Q.xp / 50) + 1;
  return h("section", { class: "sheet stack", style: "--acc:var(--c1)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h2", null, "Recunoaște figura de stil"),
      h("span", { class: "muted small" }, `Nivel ${nivel} · ${Q.xp} XP · serie ${Q.serie}`)),
    h("blockquote", { class: "citat mare" }, text),
    h("div", { class: "grid2" }, variante.map(v => h("button", { type: "button", class: "btn ghost doom-opt" + (Q.ales === v ? (v === corect ? " bine" : " rau") : Q.ales && v === corect ? " bine" : ""), disabled: !!Q.ales, onclick: () => {
      Q.ales = v;
      if (v === corect) { Q.serie++; Q.xp += 5 + Math.min(Q.serie, 5); canta([523, 659, 784]); if (Q.serie % 5 === 0) confetti(); }
      else { Q.serie = 0; canta([330], "sine"); }
      scrieLocal(cheieElev("fig-xp"), String(Q.xp)); render();
    } }, v))),
    Q.ales ? h("div", { class: "row" }, h("span", { class: Q.ales === corect ? "chip ok" : "chip err" }, Q.ales === corect ? "Corect!" : `Era ${corect}`),
      h("button", { class: "btn", type: "button", onclick: () => { S.figQuiz = { ...Q, i: (Q.i + 1 + Math.floor(Math.random() * (FIGURI_QUIZ.length - 1))) % FIGURI_QUIZ.length, ales: null, var: null }; render(); } }, "Următoarea")) : null);
}

let ceasDuel = null;
function intrebareDuel() {
  const o = OPERE[Math.floor(Math.random() * OPERE.length)];
  const indicii = [`Opera de ${o.autor}, ${o.an}.`, o.tema, o.idei[0], o.elemente[0]];
  const indiciu = indicii[Math.floor(Math.random() * indicii.length)];
  const alte = OPERE.filter(x => x.id !== o.id).sort(() => Math.random() - 0.5).slice(0, 3);
  return { o, indiciu: indiciu.replace(new RegExp(o.titlu, "gi"), "…"), variante: [o, ...alte].sort(() => Math.random() - 0.5) };
}
function duelView() {
  const D = S.duel || (S.duel = { activ: false, scor: 0, ramas: 60, q: null, record: Number(citesteLocal(cheieElev("duel-record"), "0")) || 0 });
  const card = h("section", { class: "sheet stack", style: "--acc:var(--c2)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h2", null, "Duel: ghicește opera"),
      h("span", { class: "muted small" }, `Record: ${D.record}`)));
  if (!D.activ) {
    card.append(h("p", { class: "muted" }, "Ai 60 de secunde. Primești un indiciu (autor, temă, personaje, compoziție) și alegi opera. Fiecare răspuns corect: +1, fiecare greșeală: −5 secunde. Provoacă-ți colegii să-ți bată recordul!"),
      h("div", null, h("button", { class: "btn", type: "button", onclick: () => {
        Object.assign(D, { activ: true, scor: 0, ramas: 60, q: intrebareDuel(), feedback: null });
        clearInterval(ceasDuel);
        ceasDuel = setInterval(() => {
          D.ramas--;
          const el = document.getElementById("ceas-duel"); if (el) el.textContent = D.ramas + " s";
          if (D.ramas <= 0) {
            clearInterval(ceasDuel); D.activ = false;
            if (D.scor > D.record) { D.record = D.scor; scrieLocal(cheieElev("duel-record"), String(D.scor)); confetti(); toast(`Record nou: ${D.scor}!`); }
            else toast(`Timpul a expirat! Scor: ${D.scor}.`);
            render();
          }
        }, 1000);
        render();
      } }, D.scor ? "Încă un duel" : "Start")));
    if (D.scor) card.append(h("p", null, `Ultimul scor: ${D.scor}`));
    return card;
  }
  card.append(h("div", { class: "row", style: "justify-content:space-between" }, h("span", { class: "chip ok" }, `Scor: ${D.scor}`), h("b", { id: "ceas-duel", class: "ceas-duel" }, D.ramas + " s")),
    h("blockquote", { class: "citat" }, D.q.indiciu),
    h("div", { class: "grid2" }, D.q.variante.map(o => h("button", { type: "button", class: "btn ghost doom-opt", onclick: () => {
      if (o.id === D.q.o.id) { D.scor++; canta([660, 880]); } else { D.ramas = Math.max(1, D.ramas - 5); canta([300], "sine"); toast(`Era „${D.q.o.titlu}”.`); }
      D.q = intrebareDuel(); render();
    } }, `${o.titlu} (${o.autor.split(" ").slice(-1)[0]})`))));
  return card;
}

/* =====================================================================
   PROFESOR: plan anual pe unități, banca de subiecte
   ===================================================================== */
function planAnualView() {
  const clasa = S.clase.find(c => c.id === S.clasaSel);
  if (!clasa) return [h("div", { class: "sheet empty" }, h("h2", null, "Creează întâi o clasă"))];
  const grupe = {};
  for (const t of S.teme) (grupe[t.unitate || "Fără unitate"] || (grupe[t.unitate || "Fără unitate"] = [])).push(t);
  const ordine = Object.keys(grupe).sort((a, b) => (a === "Fără unitate") - (b === "Fără unitate") || a.localeCompare(b));
  return [
    h("div", { class: "sheet stack", style: "--acc:var(--c4)" }, h("h2", null, `Plan anual – ${clasa.nume}`),
      h("p", { class: "muted small" }, "Temele grupate pe unitățile de învățare. Pentru fiecare unitate vezi cât au trimis elevii și media. Unitatea o alegi când creezi tema (sau din „Editează”).")),
    ...(ordine.length ? ordine.map((u, i) => {
      const teme = grupe[u];
      const lucrari = S.predari.filter(p => teme.some(t => t.id === p.tema_id));
      const note = lucrari.map(notaFinala).filter(n => n != null);
      const media = note.length ? note.reduce((a, b) => a + b, 0) / note.length : null;
      const asteptate = teme.length * Math.max(1, S.membri.length), procent = Math.round(lucrari.length / asteptate * 100);
      return h("section", { class: "sheet stack", style: `--acc:${CULORI[i % 5]}` },
        h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, u),
          h("div", { class: "row" }, h("span", { class: "muted small" }, `${teme.length} teme · media ${fmtNota(media)}`), bifaUnitate(u))),
        h("div", { class: "xp" }, h("span", { style: `width:${Math.min(100, procent)}%` })),
        h("div", { class: "muted small" }, `${procent}% din lucrări trimise`),
        h("div", { class: "files" }, teme.map(t => h("span", { class: "chip none" }, t.titlu + (t.grupa ? ` (${t.grupa})` : "")))));
    }) : [h("div", { class: "sheet empty" }, h("h2", null, "Nicio temă încă"))])];
}

function bancaView() {
  const B = S.banca || [];
  return [
    h("div", { class: "sheet stack", style: "--acc:var(--c5)" }, h("h2", null, "Banca de subiecte"),
      h("p", { class: "muted small" }, "Subiectele importate (de exemplu modelele și subiectele de BAC de pe edu.ro) rămân aici. Le poți folosi oricând, în orice clasă. Când imporți un subiect, apasă „Salvează în bancă”.")),
    B.length ? cautareBanca() : null,
    B.length ? h("div", { class: "stack" }, filtreazaBanca(B).map(s => h("section", { class: "sheet", style: "--acc:var(--c4)" },
      h("div", { class: "tema-head" }, h("div", null, h("h3", null, s.titlu), h("div", { class: "meta" }, h("span", null, `${(s.continut.exercitii || []).length} cerințe`), h("span", null, fmtData(s.creat_la))), eticheteBanca(s)),
        h("div", { class: "row" },
          h("button", { class: "btn", type: "button", onclick: () => {
            S.newTema = true;
            S.drafts.tema = { titlu: s.titlu, cerinta: "", termen: "", eleviiVad: true, aDoua: true, ex: [exNou()] };
            aplicaImport(s.continut); S.ultimImport = null; mergi("tema-noua");
          } }, "Folosește în clasa curentă"),
          h("button", { class: "btn danger", type: "button", onclick: async () => {
            if (!S.demo) { const { error } = await S.sb.from("banca").delete().eq("id", s.id); if (error) { toast("Subiectul nu a putut fi șters."); return; } }
            S.banca = B.filter(x => x.id !== s.id); toast("Subiectul a fost scos din bancă."); render();
          } }, "Șterge")))))) : h("div", { class: "sheet empty" }, h("h2", null, "Banca e goală"), h("p", { class: "muted" }, "Importă un subiect la „+ Temă nouă” și salvează-l aici."))];
}
async function salveazaInBanca(rez) {
  const rand = { titlu: rez.titlu || "Subiect", continut: { titlu: rez.titlu, text_suport: rez.text_suport, exercitii: rez.exercitii } };
  if (S.demo) { (S.banca || (S.banca = [])).unshift({ id: "b" + Date.now(), creat_la: new Date().toISOString(), ...rand }); toast("Subiectul a fost salvat în bancă."); render(); return; }
  const { data, error } = await S.sb.from("banca").insert({ ...rand, profesor_id: S.user.id }).select().single();
  if (error) { toast("Subiectul nu a putut fi salvat."); return; }
  (S.banca || (S.banca = [])).unshift(data); toast("Subiectul a fost salvat în bancă."); render();
}
