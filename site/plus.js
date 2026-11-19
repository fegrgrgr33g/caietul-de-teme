/* Caietul de teme: îmbunătățiri pe fiecare secțiune (elev, profesor, peste tot).
   Se încarcă înainte de app.js; funcțiile de aici se folosesc doar când se desenează pagina. */
"use strict";

/* ---------------- utilitare ---------------- */
function normalizeaza(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); }
const minuteText = n => n === 1 ? "un minut" : n % 100 >= 20 || n % 100 === 0 ? `${n} de minute` : `${n} minute`;
const asteapta = ms => new Promise(r => setTimeout(r, ms));
function amestec(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function luniSaptamanii(d) { const x = new Date(d || Date.now()); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const ziISO = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
/* un câmp de căutare care se actualizează pe loc (render() se amână cât scrii, deci aici redesenăm și refocusăm) */
function campCautare(id, cheie, placeholder) {
  return h("input", { type: "search", id, value: S[cheie] || "", placeholder, "aria-label": placeholder, style: "flex:1;min-width:180px",
    oninput: e => { S[cheie] = e.target.value; const poz = e.target.selectionStart; draw(); const el = document.getElementById(id); if (el) { el.focus(); try { el.setSelectionRange(poz, poz); } catch { /* */ } } } });
}
function selectSimplu(id, eticheta, optiuni, valoare, laSchimbare) {
  return h("select", { id, "aria-label": eticheta, style: "width:auto", onchange: e => laSchimbare(e.target.value) },
    optiuni.map(([v, n]) => { const o = h("option", { value: v }, n); o.selected = (valoare || "") === v; return o; }));
}

/* erori neprevăzute: un mesaj clar pentru utilizator (o dată la câteva secunde), detaliile rămân în consolă */
let ultimaEroare = 0;
function anuntaEroare(e) {
  console.error(e);
  if (Date.now() - ultimaEroare < 8000) return;
  ultimaEroare = Date.now();
  try { toast(navigator.onLine ? "Ceva n-a mers. Dacă se repetă, reîncarcă pagina." : "Nu ai conexiune la internet. Încearcă din nou când revine."); } catch { /* toast indisponibil */ }
}
addEventListener("error", e => { if (e.message && !/ResizeObserver|Script error/.test(e.message)) anuntaEroare(e.error || e.message); });
addEventListener("unhandledrejection", e => anuntaEroare(e.reason));
addEventListener("offline", () => { try { toast("Ai pierdut conexiunea. Ce scrii se păstrează pe acest dispozitiv."); } catch { /* */ } });
addEventListener("online", () => { try { if (typeof S !== "undefined" && S.profil && !S.offline) { toast("Conexiunea a revenit."); reincarca(); } } catch { /* */ } });

/* „Sari la conținut” (pentru tastatură și cititoare de ecran): mută focusul fără să schimbe adresa paginii */
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest(".sari-continut"); if (!a) return;
  e.preventDefault(); const app = document.getElementById("app"); app.tabIndex = -1; app.focus();
});

/* nu pierde răspunsurile: avertizează dacă pagina se închide înainte de salvare */
addEventListener("beforeunload", e => {
  const s = Object.values((typeof S !== "undefined" && S.stareCiorna) || {});
  if (s.some(x => x.stare === "asteapta" || x.stare === "salveaza")) { e.preventDefault(); e.returnValue = ""; }
});

/* ---------------- zilele în care elevul a lucrat (pentru serie) ---------------- */
function zileActive() { return citesteJSON(cheieElev("zile"), []); }
function marcheazaZi() {
  if (!S.profil || S.profil.rol !== "elev" || S.demo) return;
  const z = zileActive(), azi = ziISO(Date.now());
  if (z[z.length - 1] !== azi) { z.push(azi); scrieLocal(cheieElev("zile"), JSON.stringify(z.slice(-200))); }
}
document.addEventListener("click", e => { if (e.target.closest && e.target.closest("#app button, #app input, #app a")) marcheazaZi(); }, true);
function serieZile() {
  const z = new Set(zileActive()); if (S.demo) { for (let i = 0; i < 4; i++) z.add(ziISO(Date.now() - i * 864e5)); }
  let n = 0; const d = new Date();
  if (!z.has(ziISO(d))) d.setDate(d.getDate() - 1); // seria nu se rupe până la finalul zilei
  while (z.has(ziISO(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* =====================================================================
   ELEV · ACASĂ: anunțuri, obiectivul săptămânii, serie, sugestia zilei
   ===================================================================== */
function anunturiElev() {
  const vazute = citesteJSON(cheieElev("anunturi"), {});
  return (S.claseElev || []).filter(c => c.anunt && vazute[c.id] !== String(c.anunt_la || c.anunt)).map(c =>
    h("section", { class: "sheet anunt", style: "--acc:var(--c2)" },
      h("div", { class: "row", style: "justify-content:space-between" }, h("div", { class: "nav-titlu", style: "padding:0" }, "Anunț · " + c.nume),
        c.anunt_la ? h("span", { class: "muted small" }, fmtData(c.anunt_la)) : null),
      h("p", { class: "pre", style: "margin:6px 0 10px" }, c.anunt),
      h("button", { class: "btn ghost", type: "button", onclick: () => { const v = citesteJSON(cheieElev("anunturi"), {}); v[c.id] = String(c.anunt_la || c.anunt); scrieLocal(cheieElev("anunturi"), JSON.stringify(v)); draw(); } }, "Am înțeles")));
}

function obiectivSaptamana() {
  const luni = luniSaptamanii().getTime();
  const teme = S.predariElev.filter(p => new Date(p.trimis_la).getTime() >= luni).length;
  const tinta = Math.max(1, Math.min(3, S.temeElev.length));
  const antr = citesteJSON("antrenamente", []).filter(x => x.data >= luni).length;
  const zile = new Set(zileActive().filter(z => new Date(z + "T00:00:00").getTime() >= luni)).size + (S.demo ? 3 : 0);
  const rand = (n, v, t) => h("div", { class: "stack", style: "gap:4px" },
    h("div", { class: "row small", style: "justify-content:space-between" }, h("span", null, n), h("b", null, `${Math.min(v, t)}/${t}`)),
    h("div", { class: "xp" + (v >= t ? " plin" : "") }, h("span", { style: `width:${Math.min(100, Math.round(v / t * 100))}%` })));
  const gata = teme >= tinta && antr >= 1 && zile >= 4;
  return h("section", { class: "sheet stack", style: "--acc:var(--c3)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Obiectivul săptămânii"), gata ? h("span", { class: "chip ok" }, "Atins! Bravo!") : h("span", { class: "muted small" }, "se reia luni")),
    rand(`Trimite ${tinta} ${tinta === 1 ? "temă" : "teme"}`, teme, tinta), rand("Fă un antrenament sau o simulare", antr, 1), rand("Lucrează în 4 zile diferite", zile, 4));
}

function sugestiaZilei() {
  const zi = Math.floor(Date.now() / 864e5), tip = zi % 4;
  if (tip === 0) { const [t, f] = FIGURI_QUIZ[zi % FIGURI_QUIZ.length]; return ["Ce figură de stil e aici?", h("blockquote", { class: "citat" }, t), f]; }
  if (tip === 1) { const [cat, p, v, c] = DOOM[zi % DOOM.length]; return ["DOOM: cum se scrie corect?", h("p", { class: "doom-prop", style: "font-size:18px" }, p.replace("___", "____")), `${v[c]} (${DOOM_CATEGORII[cat]})`]; }
  if (tip === 2) { const [t, d] = FLASHCARDS[zi % FLASHCARDS.length]; return ["Termenul zilei", h("p", null, h("b", null, t)), d]; }
  const o = OPERE[zi % OPERE.length];
  return ["Opera zilei", h("p", null, h("b", null, `„${o.titlu}”`), ` – ${o.autor}`), o.tema];
}
function serieSiSugestie() {
  const n = serieZile(), [titlu, corp, raspuns] = sugestiaZilei();
  return h("section", { class: "sheet stack", style: "--acc:var(--c1)" },
    h("div", { class: "row", style: "justify-content:space-between" },
      h("div", { class: "row", style: "gap:10px" }, h("span", { class: "flacara" + (n ? "" : " stinsa"), "aria-hidden": "true" }, "🔥"),
        h("div", null, h("b", { style: "font-size:18px" }, n === 1 ? "1 zi la rând" : `${n} zile la rând`), h("div", { class: "muted small" }, n ? "Lucrează și azi ca să nu pierzi seria." : "Rezolvă ceva azi și pornește o serie."))),
      n >= 7 ? h("span", { class: "chip ok" }, "Serie de foc!") : null),
    h("div", { class: "sugestie" }, h("div", { class: "label" }, "Sugestia zilei · " + titlu), corp,
      h("details", null, h("summary", null, "Vezi răspunsul"), h("p", { class: "small", style: "margin:6px 0 0" }, raspuns))));
}

/* =====================================================================
   ELEV · TEME: căutare, sortare, cronometru, mod concentrare, timp limită, „explică-mi greșeala”
   ===================================================================== */
function sorteazaTeme(lista) {
  const s = S.sortTeme || "termen";
  const nota = t => { const p = S.predariElev.find(x => x.tema_id === t.id); return p ? notaFinala(p) ?? -1 : -2; };
  return [...lista].sort((a, b) => s === "recente" ? String(b.creat_la).localeCompare(String(a.creat_la))
    : s === "nota" ? nota(b) - nota(a)
    : String(a.termen || "9999").localeCompare(String(b.termen || "9999")));
}
function cautaSiSorteaza() {
  return h("div", { class: "row" }, campCautare("caut-teme", "cautTeme", "Caută o temă…"),
    selectSimplu("sort-teme", "Ordonează", [["termen", "După termen"], ["recente", "Cele mai noi"], ["nota", "După notă"]], S.sortTeme || "termen", v => { S.sortTeme = v; draw(); }));
}

/* cronometrul elevului și timpul limită al temei: un singur ceas pentru toată pagina */
function startLimita(id) { return Number(citesteLocal(cheieElev("start-" + id), "0")) || 0; }
function ecranStartTimp(t) {
  return h("section", { class: "sheet stack empty", style: "--acc:var(--c2)" },
    h("h2", null, t.titlu), h("p", null, `Tema are timp de lucru: ${minuteText(t.minute)}. Ceasul pornește când apeși „Încep acum” și nu se oprește dacă închizi pagina.`),
    h("p", { class: "muted small" }, "Când se termină timpul, răspunsurile scrise până atunci se trimit singure."),
    h("div", null, h("button", { class: "btn", type: "button", onclick: () => { scrieLocal(cheieElev("start-" + t.id), String(Date.now())); sunetClic(); draw(); } }, "Încep acum")));
}
function bareTema(t) {
  const p = S.predariElev.find(x => x.tema_id === t.id);
  const cr = S.crono && S.crono.tema === t.id;
  return h("div", { class: "row bara-tema" },
    t.minute && !p && startLimita(t.id) ? h("span", { class: "chip wait ceas-limita" }, "Timp rămas ", h("b", { id: "limita-el" }, "…")) : null,
    !p ? h("button", { type: "button", class: "btn ghost", onclick: () => { S.crono = cr ? null : { tema: t.id, start: Date.now() }; draw(); } },
      cr ? h("span", null, "⏱ ", h("b", { id: "crono-el" }, "0:00"), " · Oprește") : "⏱ Cronometru") : null,
    h("button", { type: "button", class: "btn ghost" + (S.focus ? " on" : ""), "aria-pressed": S.focus ? "true" : "false",
      onclick: () => { S.focus = !S.focus; aplicaFocus(); draw(); } }, S.focus ? "Ieși din modul concentrare" : "Mod concentrare"));
}
function aplicaFocus() { document.body.classList.toggle("concentrare", !!S.focus && S.pag === "tema" && S.profil && S.profil.rol === "elev"); }
const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
setInterval(() => {
  if (!S || !S.profil) return;
  const c = document.getElementById("crono-el");
  if (c && S.crono) c.textContent = mmss(Date.now() - S.crono.start);
  if (S.pag !== "tema" || S.profil.rol !== "elev") return;
  const t = (S.temeElev || []).find(x => x.id === S.pagId);
  if (!t || !t.minute || S.predariElev.some(p => p.tema_id === t.id)) return;
  const st = startLimita(t.id); if (!st) return;
  const ramas = st + t.minute * 60000 - Date.now();
  const el = document.getElementById("limita-el");
  if (el) { el.textContent = mmss(ramas); el.parentElement.classList.toggle("err", ramas < 60000); }
  if (ramas <= 0 && !S.busy[t.id] && !(S.trimisAuto || (S.trimisAuto = {}))[t.id]) {
    S.trimisAuto[t.id] = true; toast("Timpul s-a terminat. Răspunsurile tale se trimit acum.");
    if (!S.raspunsuri[t.id]) S.raspunsuri[t.id] = {};
    trimite(t, { auto: true });
  }
}, 1000);

/* „Explică-mi greșeala” lângă un exercițiu greșit */
function explicaView(p, ex, r, raspunsAfisat, corectText) {
  const cheie = p.id + "|" + ex.id, E = (S.explic || (S.explic = {}))[cheie];
  if (!E) return h("div", null, h("button", { type: "button", class: "link-btn small", onclick: async () => {
    S.explic[cheie] = { busy: true }; render();
    try {
      const tema = (S.temeElev || []).find(t => t.id === p.tema_id);
      S.explic[cheie] = S.demo ? (await asteapta(900), {
        explicatie: `Exercițiul cerea: „${ex.enunt}”. Răspunsul tău („${raspunsAfisat || "gol"}”) nu se potrivește cu ce cere cerința${corectText ? `; răspunsul bun este „${corectText}”` : ""}.`,
        regula: ex.tip === "liber" ? "La un comentariu: idee → citat scurt → explicație → efectul asupra cititorului." : "Citește cerința de două ori și caută în text cuvântul exact la care se referă.",
        exemplu: "„Inima ei era o grădină înflorită” – metaforă: inima e numită direct „grădină”, fără „ca”.",
        exercitiu: "Găsește în prima strofă un alt cuvânt care sugerează tristețea și explică-l în două rânduri.", demo: true })
        : await cereAI({ actiune: "explica", enunt: ex.enunt, raspuns: raspunsAfisat || "", corect: corectText || "", comentariu: r.comentariu || "", text_suport: tema ? tema.cerinta || "" : "" }, "Explicația nu a putut fi generată.");
    } catch (e) { delete S.explic[cheie]; toast(e.message); }
    render();
  } }, "Explică-mi greșeala"));
  if (E.busy) return h("div", { class: "row muted small" }, h("span", { class: "spin" }), "Profesorul AI scrie explicația…");
  return h("div", { class: "explicatie" },
    h("p", null, E.explicatie),
    E.regula ? h("p", null, h("b", null, "De reținut: "), E.regula) : null,
    E.exemplu ? h("p", null, h("b", null, "Exemplu: "), E.exemplu) : null,
    E.exercitiu ? h("p", null, h("b", null, "Încearcă: "), E.exercitiu) : null,
    E.demo ? h("p", { class: "muted small" }, "(explicație simulată în demonstrație)") : null);
}

/* =====================================================================
   ELEV · CALENDAR: săptămâna, export .ics
   ===================================================================== */
function unelteCalendar(teme) {
  return h("div", { class: "row", style: "justify-content:space-between" },
    h("div", { class: "seg", role: "group", "aria-label": "Cum afișez calendarul" }, [["luna", "Lună"], ["sapt", "Săptămână"], ["agenda", "Agendă"]].map(([k, n]) =>
      h("button", { type: "button", class: (S.calVedere || "luna") === k ? "on" : "", "aria-pressed": (S.calVedere || "luna") === k ? "true" : "false", onclick: () => { S.calVedere = k; draw(); } }, n))),
    h("button", { type: "button", class: "btn ghost", onclick: () => exportaIcs(teme) }, "Adaugă în Google Calendar (.ics)"));
}
function exportaIcs(teme) {
  const cu = (teme || []).filter(t => t.termen);
  if (!cu.length) { toast("Nicio temă cu termen de exportat."); return; }
  const esc = s => String(s).replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ev = cu.map(t => {
    const d = t.termen.replace(/-/g, ""), urm = ziISO(new Date(t.termen + "T12:00:00").getTime() + 864e5).replace(/-/g, "");
    return ["BEGIN:VEVENT", `UID:${t.id}@caietul-de-teme`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${urm}`, `SUMMARY:${esc("Termen: " + t.titlu)}`, "END:VEVENT"].join("\r\n");
  });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Caietul de teme//RO", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n");
  const a = h("a", { href: URL.createObjectURL(new Blob([ics], { type: "text/calendar" })), download: "termene-teme.ics" });
  document.body.append(a); a.click(); a.remove();
  toast("Fișierul cu termenele a fost descărcat. Deschide-l ca să le adaugi în calendar.");
}
function calendarSaptamana(rol, teme) {
  const off = S.calSapt || 0;
  const luni = luniSaptamanii(Date.now() + off * 7 * 864e5), azi = ziISO(Date.now());
  const zile = Array.from({ length: 7 }, (_, i) => new Date(luni.getTime() + i * 864e5));
  const titlu = `${zile[0].toLocaleDateString("ro-RO", { day: "numeric", month: "short" })} – ${zile[6].toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}`;
  const predata = id => rol === "profesor" ? S.predari.filter(p => p.tema_id === id).length : S.predariElev.some(p => p.tema_id === id);
  return [unelteCalendar(teme), h("section", { class: "sheet stack calendar", style: "--acc:var(--c4)" },
    h("div", { class: "row", style: "justify-content:space-between" },
      h("button", { type: "button", class: "btn ghost", "aria-label": "Săptămâna trecută", onclick: () => { S.calSapt = off - 1; draw(); } }, "‹"),
      h("h2", null, titlu),
      h("button", { type: "button", class: "btn ghost", "aria-label": "Săptămâna viitoare", onclick: () => { S.calSapt = off + 1; draw(); } }, "›")),
    h("div", { class: "saptamana" }, zile.map(z => {
      const k = ziISO(z), lista = teme.filter(t => t.termen === k);
      return h("div", { class: "zi-sapt" + (k === azi ? " azi" : "") },
        h("div", { class: "cap-zi" }, z.toLocaleDateString("ro-RO", { weekday: "short" }), h("b", null, z.getDate())),
        lista.length ? lista.map(t => { const n = predata(t.id); const st = rol === "profesor" ? (n >= Math.max(1, S.membri.length) ? "ok" : k < azi ? "err" : "wait") : (n ? "ok" : k < azi ? "err" : "wait");
          return h("button", { type: "button", class: "ev " + st, onclick: () => mergi("tema", t.id) }, t.titlu + (rol === "profesor" ? ` (${n}/${S.membri.length})` : "")); })
          : h("span", { class: "muted small" }, "—"));
    })),
    off ? h("div", null, h("button", { type: "button", class: "link-btn", onclick: () => { S.calSapt = 0; draw(); } }, "Înapoi la săptămâna aceasta")) : null)];
}

/* =====================================================================
   ELEV · PROFIL: insigne noi, statistici pe tipuri de exerciții, setările contului
   ===================================================================== */
function insigneExtraView() {
  const citite = Object.values(citesteJSON(cheieElev("citite"), {})).filter(x => x && x.citit).length;
  const ant = citesteJSON("antrenamente", []), sim = ant.filter(x => x.bac).length;
  const flash = citesteJSON(cheieElev("flash"), {}), stap = Object.values(flash).filter(c => c >= 4).length;
  const duel = Number(citesteLocal(cheieElev("duel-record"), "0")) || 0, serie = serieZile();
  const gram = Number(citesteLocal(cheieElev("gram-corecte"), "0")) || 0;
  const lista = [
    ["Cititor", "📚", citite >= 5, `${citite}/5 opere citite`], ["Prima simulare", "🎯", sim >= 1, `${sim}/1 simulări BAC`],
    ["Maratonist BAC", "🏃", sim >= 10, `${sim}/10 simulări`], ["Teoretician", "🧠", stap >= 10, `${stap}/10 termeni stăpâniți`],
    ["Duelist", "⚔", duel >= 10, `record ${duel}/10`], ["7 zile la rând", "🔥", serie >= 7, `serie ${serie}/7`],
    ["Gramatician", "✒", gram >= 30, `${gram}/30 răspunsuri corecte`], ["Antrenat", "💪", ant.length >= 5, `${ant.length}/5 antrenamente`]];
  return h("section", { class: "sheet stack", style: "--acc:var(--c2)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Mai multe insigne"), h("span", { class: "muted small" }, `${lista.filter(x => x[2]).length}/${lista.length} obținute`)),
    h("div", { class: "grila-insigne" }, lista.map(([n, i, ok, prog]) => h("div", { class: "insigna-mare" + (ok ? "" : " blocata") },
      h("span", { class: "ic", "aria-hidden": "true" }, i), h("b", null, n), h("span", { class: "muted small" }, ok ? "Obținută" : prog)))));
}
const NUME_TIPURI = { grila: "Grilă", text: "Răspuns scurt", numar: "Număr", liber: "Răspuns liber (compuneri)" };
function statisticiTipuriView() {
  const agg = {};
  for (const p of S.predariElev) {
    const t = S.temeElev.find(x => x.id === p.tema_id); if (!t) continue;
    for (const ex of t.exercitii || []) { const r = (p.rezultate || {})[ex.id]; if (!r || typeof r.puncte !== "number") continue;
      const a = agg[ex.tip] || (agg[ex.tip] = [0, 0]); a[0] += r.puncte; a[1] += Number(ex.puncte); }
  }
  const randuri = Object.entries(agg).filter(([, [, m]]) => m > 0).map(([k, [p, m]]) => [k, Math.round(p / m * 100)]).sort((a, b) => a[1] - b[1]);
  return h("section", { class: "sheet stack", style: "--acc:var(--c4)" }, h("h3", null, "La ce greșești cel mai des"),
    randuri.length ? h("div", { class: "stack", style: "gap:10px" }, randuri.map(([k, v], i) => h("div", { class: "stack", style: "gap:4px" },
      h("div", { class: "row small", style: "justify-content:space-between" }, h("span", null, NUME_TIPURI[k] || k, i === 0 && randuri.length > 1 ? h("span", { class: "chip wait", style: "margin-left:8px" }, "de exersat") : null), h("b", null, v + "%")),
      h("div", { class: "xp" + (v < 50 ? " slab" : "") }, h("span", { style: `width:${v}%` }))))) : h("p", { class: "muted small" }, "Apare după primele teme corectate."));
}
function setariContView() {
  const d = S.drafts.cont || (S.drafts.cont = { nume: S.profil.nume || "", p1: "", p2: "" });
  return h("section", { class: "sheet stack", style: "--acc:var(--c5)" }, h("h3", null, "Setările contului"),
    h("form", { class: "row", onsubmit: async e => {
        e.preventDefault(); const n = d.nume.trim();
        if (n.length < 2) { toast("Scrie numele întreg."); return; }
        if (!S.demo) { const { error } = await S.sb.from("profiles").update({ nume: n }).eq("id", S.user.id); if (error) { toast("Numele nu a putut fi schimbat."); return; } }
        S.profil.nume = n; toast("Numele a fost schimbat."); draw();
      } },
      h("label", { class: "f", for: "cont-nume", style: "flex:1;min-width:200px" }, "Numele afișat", h("input", { type: "text", id: "cont-nume", value: d.nume, autocomplete: "name", oninput: e => d.nume = e.target.value })),
      h("button", { class: "btn ghost", type: "submit", style: "align-self:flex-end" }, "Salvează numele")),
    h("form", { class: "stack", onsubmit: async e => {
        e.preventDefault();
        if (d.p1.length < 6) { toast("Parola trebuie să aibă cel puțin 6 caractere."); return; }
        if (d.p1 !== d.p2) { toast("Cele două parole nu sunt la fel."); return; }
        if (S.demo) { toast("În demonstrație nu se schimbă nicio parolă."); return; }
        const { error } = await S.sb.auth.updateUser({ password: d.p1 });
        if (error) { toast(eroareDb(error, "Parola nu a putut fi schimbată.")); return; }
        d.p1 = d.p2 = ""; toast("Parola a fost schimbată."); draw();
      } },
      h("div", { class: "grid2" },
        h("label", { class: "f", for: "cont-p1" }, "Parolă nouă", h("input", { type: "password", id: "cont-p1", autocomplete: "new-password", minlength: "6", value: d.p1, oninput: e => d.p1 = e.target.value })),
        h("label", { class: "f", for: "cont-p2" }, "Scrie-o din nou", h("input", { type: "password", id: "cont-p2", autocomplete: "new-password", minlength: "6", value: d.p2, oninput: e => d.p2 = e.target.value }))),
      h("div", null, h("button", { class: "btn ghost", type: "submit" }, "Schimbă parola"))));
}

/* =====================================================================
   ELEV · BAC: barem explicat, statistici pe tipuri de cerințe
   ===================================================================== */
function baremPeRanduri(text) {
  return String(text || "").split(/\n|;\s*|(?<=\.)\s+(?=[A-ZĂÂÎȘȚ])/).map(s => s.trim()).filter(Boolean).map(s => "• " + s).join("\n");
}
function procentePeTip(exercitii, rez) {
  const a = {};
  for (const ex of exercitii || []) { const r = (rez || []).find(x => x.id === ex.id); const x = a[ex.tip] || (a[ex.tip] = [0, 0]); x[0] += r ? r.puncte : 0; x[1] += Number(ex.puncte); }
  return Object.fromEntries(Object.entries(a).map(([k, [p, m]]) => [k, m ? Math.round(p / m * 100) : 0]));
}
function statisticiAntrView(sub, rez) {
  const acum = procentePeTip(sub.exercitii, rez);
  const ist = citesteJSON("antrenamente", []).filter(x => x.tipuri);
  const medii = {};
  for (const x of ist) for (const [k, v] of Object.entries(x.tipuri)) (medii[k] || (medii[k] = [])).push(v);
  const randuri = Object.entries(medii).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)]).sort((a, b) => a[1] - b[1]);
  return h("div", { class: "stack", style: "gap:8px;padding:12px;border:1px dashed var(--edge);border-radius:14px" },
    h("div", { class: "label" }, "Pe tipuri de cerințe, la acest antrenament"),
    h("div", { class: "files" }, Object.entries(acum).map(([k, v]) => h("span", { class: "chip " + (v >= 70 ? "ok" : v >= 40 ? "wait" : "err") }, `${NUME_TIPURI[k] || k}: ${v}%`))),
    randuri.length > 0 && ist.length > 1 ? h("div", { class: "stack", style: "gap:6px" }, h("div", { class: "label" }, `Media pe ${ist.length} antrenamente: unde pierzi puncte`),
      randuri.map(([k, v]) => h("div", { class: "row small", style: "gap:10px;flex-wrap:nowrap" }, h("span", { style: "width:170px;flex:none" }, NUME_TIPURI[k] || k),
        h("div", { class: "xp" + (v < 50 ? " slab" : ""), style: "flex:1" }, h("span", { style: `width:${v}%` })), h("b", { style: "width:44px;text-align:right" }, v + "%")))) : null);
}

/* =====================================================================
   OPERE: filtre, opere noi, harta personajelor, test rapid
   ===================================================================== */
OPERE.push(
  { id: "lapusneanul", autor: "Costache Negruzzi", titlu: "Alexandru Lăpușneanul", an: 1840, gen: "epic", specie: "nuvelă istorică romantică", curent: "romantism (pașoptism)", clasa: "a X-a / a XI-a",
    tema: "Lupta pentru putere și portretul unui domnitor tiran, la a doua domnie.",
    idei: ["Lăpușneanul revine pe tronul Moldovei și se răzbună pe boierii care l-au trădat.", "Teroarea culminează cu uciderea a 47 de boieri și „piramida de capete”.", "Finalul: domnitorul bolnav se călugărește și e otrăvit, cu acordul doamnei Ruxanda."],
    elemente: ["Patru capitole, fiecare cu un moto.", "Personaje construite în antiteză (Lăpușneanul – Ruxanda); caracterizare directă și indirectă.", "Scene dramatice, dialog, culoare de epocă."],
    citate: ["„Dacă voi nu mă vreți, eu vă vreu…”"] },
  { id: "scrisoarea1", autor: "Mihai Eminescu", titlu: "Scrisoarea I", an: 1881, gen: "liric", specie: "satiră și poem filozofic", curent: "romantism", clasa: "a XI-a",
    tema: "Condiția omului de geniu într-o lume supusă timpului și uitării.",
    idei: ["Bătrânul dascăl, imagine a savantului care caută adevărul universal.", "Cosmogonia: nașterea și stingerea universului.", "Antiteza dintre geniu și lumea meschină care nu-l înțelege."],
    elemente: ["Cinci tablouri (cadrul nocturn, dascălul, cosmogonia, viața și moartea savantului, finalul).", "Simetria primului și ultimului tablou (motivul lunii).", "Antiteza, ironia, imaginile cosmice."], citate: [] },
  { id: "aci-sosi", autor: "Ion Pillat", titlu: "Aci sosi pe vremuri", an: 1923, gen: "liric", specie: "poezie tradiționalistă (elegie)", curent: "tradiționalism", clasa: "a XI-a / a XII-a",
    tema: "Trecerea timpului și repetarea iubirii de la o generație la alta.",
    idei: ["Casa bunicilor păstrează amintirea iubirii bunicilor.", "Povestea tânărului cuplu de azi repetă povestea de odinioară.", "Nostalgia trecutului și sentimentul trecerii ireversibile a timpului."],
    elemente: ["Două planuri temporale: trecutul bunicilor și prezentul eului liric.", "Motive: casa, ceasul, portretul, cartea „Sburătorul”.", "Ton elegiac, imagini vizuale și auditive."], citate: [] },
  { id: "la-tiganci", autor: "Mircea Eliade", titlu: "La țigănci", an: 1959, gen: "epic", specie: "nuvelă fantastică", curent: "modernism", clasa: "a XII-a",
    tema: "Trecerea omului obișnuit din timpul istoric în timpul mitic, al morții.",
    idei: ["Gavrilescu, profesor de pian, intră la „țigănci” și își pierde reperele timpului.", "Proba celor trei fete (o țigancă, o grecoaică, o evreică) pe care nu o trece.", "Finalul ambiguu: plecarea cu Hildegard, ca într-un vis, spre moarte."],
    elemente: ["Ambiguitatea dintre real și fantastic.", "Simboluri: căldura, birjarul, labirintul, numărul trei.", "Timpul trăit diferit în bordei și în lumea reală."], citate: [] },
  { id: "amintiri", autor: "Ion Creangă", titlu: "Amintiri din copilărie", an: 1892, gen: "epic", specie: "roman al copilăriei (memorialistic)", curent: "realism (junimist)", clasa: "a IX-a",
    tema: "Copilăria ca vârstă a jocului, a năzbâtiilor și a descoperirii lumii.",
    idei: ["Nică, copilul din Humulești, trăiește întâmplări hazlii: cireșele, pupăza, scăldatul.", "Satul tradițional, familia și școala, văzute cu nostalgie.", "Universalitatea copilăriei: „așa eram eu la vârsta cea fericită”."],
    elemente: ["Narator-personaj: adultul își amintește copilăria.", "Umorul, oralitatea, zicătorile.", "Episoade aproape independente, legate prin personajul Nică."], citate: [] });

const PERSONAJE = {
  "harap-alb": { p: [["Harap-Alb", "fiul cel mic al craiului, eroul care se maturizează"], ["Spânul", "antagonistul, dar și inițiatorul eroului"], ["Sfânta Duminică", "sfătuitoarea, ajutorul"], ["Craiul", "tatăl eroului"], ["Împăratul Roș", "pune probe grele"], ["Fata Împăratului Roș", "răsplata eroului"], ["Gerilă, Flămânzilă, Setilă, Ochilă, Păsări-Lăți-Lungilă", "tovarășii năzdrăvani"], ["Calul", "năzdrăvan, ajutor de nădejde"]],
    r: [["Spânul", "îl face slugă pe", "Harap-Alb"], ["Sfânta Duminică", "îl ajută pe", "Harap-Alb"], ["Harap-Alb", "o cere de soție pe", "Fata Împăratului Roș"], ["Tovarășii", "îl ajută la probe pe", "Harap-Alb"]] },
  moara: { p: [["Ghiță", "cizmar ajuns cârciumar, se schimbă din lăcomie"], ["Ana", "soția lui Ghiță"], ["Lică Sămădăul", "șeful porcarilor, antagonistul"], ["Bătrâna", "soacra lui Ghiță, glasul înțelepciunii"], ["Pintea", "jandarmul, fost tovarăș al lui Lică"]],
    r: [["Lică", "îl atrage în afaceri necurate pe", "Ghiță"], ["Ghiță", "se îndepărtează de", "Ana"], ["Pintea", "îl urmărește pe", "Lică"], ["Ghiță", "colaborează cu", "Pintea"]] },
  scrisoarea: { p: [["Ștefan Tipătescu", "prefectul județului"], ["Zoe Trahanache", "soția lui Trahanache, iubita prefectului"], ["Zaharia Trahanache", "prezidentul comitetelor"], ["Nae Cațavencu", "avocat, directorul ziarului „Răcnetul Carpaților”"], ["Agamemnon Dandanache", "candidatul trimis de la centru"], ["Cetățeanul turmentat", "găsește și pierde scrisoarea"], ["Farfuridi și Brânzovenescu", "membri ai partidului, temători"]],
    r: [["Cațavencu", "îi șantajează pe", "Tipătescu și Zoe"], ["Zoe", "îl susține pe", "Cațavencu (din frică)"], ["Dandanache", "câștigă candidatura în locul lui", "Cațavencu"], ["Trahanache", "își apără onoarea în fața lui", "Cațavencu"]] },
  ion: { p: [["Ion", "fiul lui Alexandru Glanetașu, dornic de pământ"], ["Ana", "fiica lui Vasile Baciu"], ["Florica", "iubita lui Ion"], ["Vasile Baciu", "țăran bogat, tatăl Anei"], ["George Bulbuc", "rivalul lui Ion"], ["Familia Herdelea", "învățătorul și familia lui"], ["Preotul Belciug", "preotul satului"]],
    r: [["Ion", "se căsătorește pentru pământ cu", "Ana"], ["Ion", "o iubește pe", "Florica"], ["George", "se căsătorește cu", "Florica"], ["Vasile Baciu", "îi dă pământul lui", "Ion"]] },
  otilia: { p: [["Felix Sima", "orfan, nepotul lui moș Costache"], ["Otilia Mărculescu", "fiica vitregă a lui Costache"], ["Costache Giurgiuveanu", "bătrânul avar"], ["Aglae Tulea", "sora lui Costache, „baba absolută”"], ["Leonida Pascalopol", "moșier, protectorul Otiliei"], ["Stănică Rațiu", "soțul Olimpiei, arivist"], ["Aurica, Simion, Titi, Olimpia", "familia Tulea"]],
    r: [["Felix", "o iubește pe", "Otilia"], ["Otilia", "se căsătorește cu", "Pascalopol"], ["Stănică", "îi fură banii lui", "Costache"], ["Aglae", "vrea moștenirea lui", "Costache"]] },
  morometii: { p: [["Ilie Moromete", "capul familiei, țăran ironic și contemplativ"], ["Catrina", "soția lui Moromete"], ["Paraschiv, Nilă, Achim", "fiii din prima căsătorie"], ["Niculae", "fiul cel mic, vrea să învețe"], ["Tita și Ilinca", "fiicele"], ["Guica", "sora lui Moromete"], ["Țugurlan", "țăran revoltat"]],
    r: [["Paraschiv, Nilă, Achim", "pleacă la București împotriva lui", "Moromete"], ["Guica", "îi întoarce pe fii împotriva lui", "Moromete"], ["Niculae", "se îndepărtează de", "Moromete"]] },
  baltagul: { p: [["Vitoria Lipan", "soția care pleacă să afle adevărul"], ["Nechifor Lipan", "oierul ucis"], ["Gheorghiță", "fiul, inițiat pe drum"], ["Calistrat Bogza și Ilie Cuțui", "ucigașii"], ["Minodora", "fiica"]],
    r: [["Vitoria", "îl caută pe", "Nechifor"], ["Gheorghiță", "o însoțește pe", "Vitoria"], ["Bogza și Cuțui", "l-au ucis pe", "Nechifor"]] },
  "ultima-noapte": { p: [["Ștefan Gheorghidiu", "student la filozofie, apoi ofițer pe front"], ["Ela", "soția lui"], ["Tache", "unchiul bogat"], ["Nae Gheorghidiu", "unchiul politician"], ["Domnul G.", "bănuit de Ștefan"]],
    r: [["Ștefan", "e gelos pe", "Ela"], ["Ștefan", "îl bănuiește pe", "Domnul G."], ["Tache", "îi lasă moștenire lui", "Ștefan"]] },
  luceafarul: { p: [["Hyperion (Luceafărul)", "geniul, ființa nemuritoare"], ["Cătălina", "fata de împărat"], ["Cătălin", "pajul, omul obișnuit"], ["Demiurgul", "creatorul"]],
    r: [["Cătălina", "îl cheamă pe", "Hyperion"], ["Cătălin", "o cucerește pe", "Cătălina"], ["Hyperion", "cere dezlegarea de nemurire de la", "Demiurgul"]] },
  riga: { p: [["Riga Crypto", "craiul-ciupercă, lumea umbrei"], ["Enigel", "lapona, care caută soarele"], ["Menestrelul", "cel care spune povestea"]], r: [["Riga Crypto", "o cere de soție pe", "Enigel"], ["Enigel", "îl refuză pe", "Riga Crypto"]] },
  lapusneanul: { p: [["Alexandru Lăpușneanul", "domnitorul tiran"], ["Doamna Ruxanda", "soția lui"], ["Moțoc", "boierul trădător"], ["Spancioc și Stroici", "boierii care fug și se răzbună"], ["Veveriță", "boier"]],
    r: [["Lăpușneanul", "îl dă mulțimii pe", "Moțoc"], ["Ruxanda", "acceptă otrăvirea lui", "Lăpușneanul"], ["Spancioc și Stroici", "se răzbună pe", "Lăpușneanul"]] },
  "la-tiganci": { p: [["Gavrilescu", "profesor de pian"], ["Baba", "paznica bordeiului"], ["Cele trei fete", "țiganca, grecoaica, evreica"], ["Hildegard", "iubita din tinerețe"], ["Birjarul", "îl duce spre final"]],
    r: [["Fetele", "îi cer să ghicească pe", "Gavrilescu"], ["Gavrilescu", "pleacă la final cu", "Hildegard"]] },
};
for (const o of OPERE) if (PERSONAJE[o.id]) { o.personaje = PERSONAJE[o.id].p; o.relatii = PERSONAJE[o.id].r; }

function filtreOpere() {
  return h("div", { class: "row" }, campCautare("caut-opere", "cautOpere", "Caută opera, autorul sau curentul…"),
    selectSimplu("curent-opere", "Curentul literar", [["", "Toate curentele"], ...["romantism", "realism", "simbolism", "modernism", "tradiționalism", "neomodernism"].map(c => [c, c])], S.curentOpere, v => { S.curentOpere = v; draw(); }),
    selectSimplu("clasa-opere", "Clasa", [["", "Toate clasele"], ["a IX-a", "a IX-a"], ["a X-a", "a X-a"], ["a XI-a", "a XI-a"], ["a XII-a", "a XII-a"]], S.clasaOpere, v => { S.clasaOpere = v; draw(); }));
}
function hartaPersonaje(o) {
  return h("div", null, h("div", { class: "label" }, "Harta personajelor"),
    h("div", { class: "harta-pers" }, o.personaje.map(([n, d], i) => h("div", { class: "pers", style: "--ic:" + CULORI[i % 5] }, h("b", null, n), h("span", { class: "muted small" }, d)))),
    (o.relatii || []).length ? h("div", { class: "stack", style: "gap:6px;margin-top:10px" }, o.relatii.map(([a, rel, b]) =>
      h("div", { class: "relatie" }, h("b", null, a), h("span", { class: "sageata-rel" }, rel, " →"), h("b", null, b)))) : null);
}
function intrebariOpera(o) {
  const alte = OPERE.filter(x => x.id !== o.id);
  const q = (enunt, corect, dinAlte) => {
    const v = [...new Set(amestec(alte.map(dinAlte)).filter(x => x && x !== corect))].slice(0, 3);
    return { enunt, corect, variante: amestec([corect, ...v]) };
  };
  return [q(`Cine a scris „${o.titlu}”?`, o.autor, x => x.autor), q(`În ce an a apărut „${o.titlu}”?`, String(o.an), x => String(x.an)),
    q(`Cărui curent literar îi aparține „${o.titlu}”?`, o.curent, x => x.curent), q(`Ce specie literară este „${o.titlu}”?`, o.specie, x => x.specie),
    q(`Care este tema operei „${o.titlu}”?`, o.tema, x => x.tema)];
}
function testOpera(o) {
  const T = (S.testOp || (S.testOp = {}))[o.id];
  if (!T) return h("div", null, h("button", { class: "btn ghost", type: "button", onclick: () => { S.testOp[o.id] = { q: intrebariOpera(o), i: 0, scor: 0, ales: null }; render(); } }, "Test rapid: 5 întrebări"));
  if (T.i >= T.q.length) {
    return h("div", { class: "test-opera" }, h("b", null, `Ai răspuns corect la ${T.scor} din ${T.q.length}.`), " ", T.scor === T.q.length ? "Excelent!" : "Recitește fișa și mai încearcă.",
      h("div", { style: "margin-top:8px" }, h("button", { class: "btn ghost", type: "button", onclick: () => { S.testOp[o.id] = null; render(); } }, "Încă o dată")));
  }
  const q = T.q[T.i];
  return h("div", { class: "test-opera stack", style: "gap:8px" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("b", null, q.enunt), h("span", { class: "muted small" }, `${T.i + 1}/${T.q.length}`)),
    h("div", { class: "stack", style: "gap:6px" }, q.variante.map(v => h("button", { type: "button", disabled: T.ales != null,
      class: "btn ghost doom-opt" + (T.ales != null && v === q.corect ? " bine" : T.ales === v ? " rau" : ""), style: "text-align:left",
      onclick: () => { T.ales = v; if (v === q.corect) { T.scor++; canta([660, 880]); } else canta([300], "sine"); render(); } }, v))),
    T.ales != null ? h("div", null, h("button", { class: "btn", type: "button", onclick: () => { T.i++; T.ales = null; if (T.i >= T.q.length && T.scor === T.q.length) confetti(); render(); } }, T.i + 1 < T.q.length ? "Următoarea" : "Vezi rezultatul")) : null);
}

/* =====================================================================
   LIMBĂ: punctuație, acord, pleonasme (revin mai des cele greșite)
   ===================================================================== */
const GRAMATICA = [
  ["punctuatie", "Alege varianta corect punctuată:", ["Ion, vino aici!", "Ion vino aici!"], 0, "Substantivul în vocativ se desparte prin virgulă de restul propoziției."],
  ["punctuatie", "Alege varianta corect punctuată:", ["Am învățat, dar n-am luat nota dorită.", "Am învățat dar n-am luat nota dorită."], 0, "Înaintea conjuncțiilor adversative (dar, însă, ci) se pune virgulă."],
  ["punctuatie", "Alege varianta corect punctuată:", ["Elevul care a câștigat, a primit o diplomă.", "Elevul care a câștigat a primit o diplomă."], 1, "Nu se pune virgulă între subiect și predicat, chiar dacă subiectul are o atributivă."],
  ["punctuatie", "Alege varianta corect punctuată:", ["Mi-a spus, că vine.", "Mi-a spus că vine."], 1, "Completiva directă introdusă prin „că” nu se desparte prin virgulă de regentă."],
  ["punctuatie", "Alege varianta corect punctuată:", ["Am cumpărat mere, pere și prune.", "Am cumpărat mere, pere, și prune."], 0, "Înaintea lui „și” copulativ (care leagă ultimul termen al unei enumerații) nu se pune virgulă."],
  ["punctuatie", "Alege varianta corect punctuată:", ["Desigur, voi veni.", "Desigur voi veni."], 0, "Cuvintele incidente de la început („desigur”, „bineînțeles”) se despart prin virgulă."],
  ["punctuatie", "Alege varianta corect punctuată:", ["Dacă plouă, rămânem acasă.", "Dacă plouă rămânem acasă."], 0, "Subordonata condițională așezată înaintea regentei se desparte prin virgulă."],
  ["acord", "Completează: Fiecare dintre elevi ___ o carte.", ["are", "au"], 0, "Pronumele „fiecare” cere verbul la singular."],
  ["acord", "Completează: Nici Ion, nici Maria nu ___ venit.", ["au", "a"], 0, "Subiectul multiplu cere, de regulă, predicatul la plural."],
  ["acord", "Completează: Cartea și caietul ___ pe masă.", ["sunt", "este"], 0, "Două subiecte legate prin „și” cer predicatul la plural."],
  ["acord", "Completează: ___ trimit părinților o scrisoare.", ["Le", "Îi"], 0, "„Părinților” e la plural, deci pronumele în dativ este „le”."],
  ["acord", "Completează: Cărțile ___ le-am citit sunt pe raft.", ["pe care", "care"], 0, "Relativul cu funcție de complement direct se construiește cu „pe”: „pe care”."],
  ["acord", "Completează: Cei care ___ terminat pot pleca.", ["au", "a"], 0, "„Cei care” e plural, deci și verbul este la plural."],
  ["acord", "Completează: I-am dat colegei ___ caietul.", ["mele", "mei"], 0, "Posesivul se acordă cu „colegei” (feminin, dativ): „colegei mele”."],
  ["pleonasm", "Care formulare e corectă (fără pleonasm)?", ["Mă întorc înapoi acasă.", "Mă întorc acasă."], 1, "„A se întoarce” conține deja ideea de „înapoi”."],
  ["pleonasm", "Care formulare e corectă (fără pleonasm)?", ["Avansăm înainte.", "Avansăm."], 1, "„A avansa” înseamnă deja „a merge înainte”."],
  ["pleonasm", "Care formulare e corectă (fără pleonasm)?", ["Cel mai optim plan", "Planul optim"], 1, "„Optim” înseamnă „cel mai bun”; nu se folosește cu „cel mai”."],
  ["pleonasm", "Care formulare e corectă (fără pleonasm)?", ["Colaborăm împreună la proiect.", "Colaborăm la proiect."], 1, "„A colabora” înseamnă deja „a lucra împreună”."],
  ["pleonasm", "Care formulare e corectă (fără pleonasm)?", ["Premiera filmului", "Prima premieră a filmului"], 0, "„Premieră” înseamnă „prima reprezentație”."],
  ["pleonasm", "Care formulare e corectă (fără pleonasm)?", ["Coboară jos!", "Coboară!"], 1, "„A coborî” arată deja direcția „în jos”."],
  ["pleonasm", "Care formulare e corectă (fără pleonasm)?", ["Dar însă nu știu.", "Însă nu știu."], 1, "„Dar” și „însă” au același sens; se folosește doar una."],
  ["pleonasm", "Care formulare e corectă (fără pleonasm)?", ["A decedat.", "A decedat din viață."], 0, "„A deceda” înseamnă „a muri”; „din viață” e de prisos."],
];
const CAT_GRAM = { punctuatie: "punctuație", acord: "acord și pronume", pleonasm: "pleonasme" };
function alegeGram() {
  const g = citesteJSON(cheieElev("gram-greseli"), {});
  const pond = GRAMATICA.map(x => 1 + 3 * (g[x[0]] || 0));
  let r = Math.random() * pond.reduce((a, b) => a + b, 0);
  for (let i = 0; i < GRAMATICA.length; i++) { r -= pond[i]; if (r <= 0) return i; }
  return 0;
}
function gramaticaView() {
  const G = S.gram || (S.gram = { i: alegeGram(), ales: null, scor: 0, total: 0 });
  if (!G.ord) G.ord = amestec(GRAMATICA[G.i][2].map((_, k) => k));
  const [cat, enunt, variante, ok, expl] = GRAMATICA[G.i];
  const gres = citesteJSON(cheieElev("gram-greseli"), {});
  const slabe = Object.entries(gres).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return h("section", { class: "sheet stack", style: "--acc:var(--c4)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h2", null, "Punctuație, acord, pleonasme"), h("span", { class: "muted small" }, `Corecte: ${G.scor}/${G.total}`)),
    h("p", { class: "muted small" }, "Alege varianta corectă. Categoriile la care greșești revin mai des."),
    h("div", { class: "label" }, CAT_GRAM[cat]), h("b", { style: "font-size:17px" }, enunt),
    h("div", { class: "stack", style: "gap:8px" }, G.ord.map(k => h("button", { type: "button", disabled: G.ales != null, style: "text-align:left",
      class: "btn ghost doom-opt" + (G.ales != null && k === ok ? " bine" : G.ales === k ? " rau" : ""),
      onclick: () => {
        G.ales = k; G.total++;
        const g = citesteJSON(cheieElev("gram-greseli"), {});
        if (k === ok) { G.scor++; g[cat] = Math.max(0, (g[cat] || 0) - 1); canta([660, 880]); scrieLocal(cheieElev("gram-corecte"), String((Number(citesteLocal(cheieElev("gram-corecte"), "0")) || 0) + 1)); }
        else { g[cat] = (g[cat] || 0) + 1; canta([300], "sine"); }
        scrieLocal(cheieElev("gram-greseli"), JSON.stringify(g)); render();
      } }, variante[k]))),
    G.ales != null ? h("div", { class: "stack", style: "gap:8px" }, h("p", { class: "small", style: "margin:0" }, h("span", { class: G.ales === ok ? "chip ok" : "chip err" }, G.ales === ok ? "Corect!" : "Greșit"), " ", expl),
      h("div", null, h("button", { class: "btn", type: "button", onclick: () => { S.gram = { scor: G.scor, total: G.total, i: alegeGram(), ales: null }; render(); } }, "Următorul"))) : null,
    slabe.length ? h("div", { class: "small muted" }, "De exersat: ", slabe.map(([c]) => CAT_GRAM[c]).join(", ")) : null);
}

/* =====================================================================
   JOCURI: autori și citate
   ===================================================================== */
function intrebareAutori() {
  const cuCitat = OPERE.filter(o => o.citate.length);
  const tip = Math.floor(Math.random() * 3);
  if (tip === 0 && cuCitat.length >= 4) {
    const o = cuCitat[Math.floor(Math.random() * cuCitat.length)];
    return { enunt: "Din ce operă este citatul?", citat: o.citate[0], corect: `${o.titlu} (${o.autor})`, variante: amestec([o, ...amestec(OPERE.filter(x => x.id !== o.id)).slice(0, 3)]).map(x => `${x.titlu} (${x.autor})`) };
  }
  const o = OPERE[Math.floor(Math.random() * OPERE.length)];
  if (tip === 1) {
    const alti = amestec([...new Set(OPERE.map(x => x.autor))].filter(a => a !== o.autor)).slice(0, 3);
    return { enunt: `Cine a scris „${o.titlu}”?`, corect: o.autor, variante: amestec([o.autor, ...alti]) };
  }
  const alte = amestec(OPERE.filter(x => !x.curent.includes(o.curent.split(" ")[0]))).slice(0, 3);
  return { enunt: `Care dintre aceste opere aparține curentului: ${o.curent.split(" (")[0]}?`, corect: o.titlu, variante: amestec([o.titlu, ...alte.map(x => x.titlu)]) };
}
function autoriView() {
  const A = S.autori || (S.autori = { q: intrebareAutori(), ales: null, scor: 0, serie: 0 });
  const q = A.q;
  return h("section", { class: "sheet stack", style: "--acc:var(--c5)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h2", null, "Autori și citate"), h("span", { class: "muted small" }, `Scor ${A.scor} · serie ${A.serie}`)),
    h("b", { style: "font-size:17px" }, q.enunt), q.citat ? h("blockquote", { class: "citat mare" }, q.citat) : null,
    h("div", { class: "grid2" }, q.variante.map(v => h("button", { type: "button", disabled: A.ales != null,
      class: "btn ghost doom-opt" + (A.ales != null && v === q.corect ? " bine" : A.ales === v ? " rau" : ""),
      onclick: () => { A.ales = v; if (v === q.corect) { A.scor++; A.serie++; canta([523, 659, 784]); if (A.serie % 5 === 0) confetti(); } else { A.serie = 0; canta([330], "sine"); } render(); } }, v))),
    A.ales != null ? h("div", null, h("button", { class: "btn", type: "button", onclick: () => { A.q = intrebareAutori(); A.ales = null; render(); } }, "Următoarea")) : null);
}

/* =====================================================================
   PROFESOR · CLASA: anunț, elevi rămași în urmă, evoluția mediei
   ===================================================================== */
function anuntProfView(clasa) {
  const k = "anunt-" + clasa.id;
  if (S.drafts[k] == null) S.drafts[k] = clasa.anunt || "";
  return h("section", { class: "sheet stack", style: "--acc:var(--c2)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Anunț pentru clasă"),
      clasa.anunt ? h("span", { class: "muted small" }, "Publicat " + (clasa.anunt_la ? fmtData(clasa.anunt_la) : "")) : h("span", { class: "muted small" }, "Elevii îl văd pe pagina Acasă")),
    h("textarea", { id: "txt-" + k, value: S.drafts[k], maxlength: "1000", style: "min-height:70px", placeholder: "Ex.: Mâine avem lucrare din „Moara cu noroc”. Recitiți capitolele 1–5.", oninput: e => S.drafts[k] = e.target.value }),
    h("div", { class: "row" },
      h("button", { class: "btn", type: "button", onclick: () => salveazaAnunt(clasa, S.drafts[k].trim() || null) }, clasa.anunt ? "Actualizează anunțul" : "Publică anunțul"),
      clasa.anunt ? h("button", { class: "btn danger", type: "button", onclick: () => { S.drafts[k] = ""; salveazaAnunt(clasa, null); } }, "Șterge anunțul") : null));
}
async function salveazaAnunt(clasa, text) {
  const la = text ? new Date().toISOString() : null;
  if (!S.demo) { const { error } = await S.sb.from("clase").update({ anunt: text, anunt_la: la }).eq("id", clasa.id); if (error) { toast("Anunțul nu a putut fi salvat."); return; } }
  clasa.anunt = text; clasa.anunt_la = la; toast(text ? "Anunțul a fost publicat. Elevii îl văd pe pagina Acasă." : "Anunțul a fost șters."); draw();
}
function situatieElevi() {
  const azi = ziISO(Date.now());
  const cuTermen = [...S.teme].filter(t => t.termen && t.termen < azi && !t.ciorna).sort((a, b) => a.termen.localeCompare(b.termen));
  const cron = [...S.teme].sort((a, b) => String(a.creat_la).localeCompare(String(b.creat_la)));
  return S.membri.map(m => {
    const lipsa = cuTermen.filter(t => (!t.grupa || t.grupa === m.grupa) && !S.predari.some(p => p.tema_id === t.id && p.elev_id === m.elev_id));
    const ultimeleDouaLipsa = cuTermen.slice(-2).length === 2 && cuTermen.slice(-2).every(t => lipsa.includes(t));
    const note = cron.map(t => notaFinala(S.predari.find(p => p.tema_id === t.id && p.elev_id === m.elev_id))).filter(n => n != null);
    const motive = [];
    if (ultimeleDouaLipsa) motive.push("n-a trimis ultimele 2 teme");
    else if (lipsa.length) motive.push(`${lipsa.length} ${lipsa.length === 1 ? "temă netrimisă" : "teme netrimise"}`);
    if (note.length >= 2 && note[note.length - 1] < 5 && note[note.length - 2] < 5) motive.push("două note sub 5 la rând");
    else if (note.length >= 2 && note[note.length - 2] - note[note.length - 1] >= 2) motive.push(`nota a scăzut (${fmtNota(note[note.length - 2])} → ${fmtNota(note[note.length - 1])})`);
    return { m, motive, grav: ultimeleDouaLipsa || motive.length > 1 };
  });
}
function alertaEleviView() {
  const lista = situatieElevi().filter(x => x.motive.length).sort((a, b) => b.grav - a.grav);
  if (!lista.length) return null;
  return h("section", { class: "sheet stack alerta", style: "--acc:var(--c1)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, `Elevi care au nevoie de atenție (${lista.length})`), h("span", { class: "muted small" }, "Apasă ca să vezi fișa elevului")),
    h("div", { class: "stack", style: "gap:8px" }, lista.map(({ m, motive, grav }) =>
      h("a", { class: "rand-verif", href: "#/elev/" + encodeURIComponent(m.elev_id) },
        avatar(m.profiles && m.profiles.avatar, m.profiles && m.profiles.nume, 28), h("span", { class: "nume" }, (m.profiles && m.profiles.nume) || "Elev"),
        h("span", { style: "flex:1" }), motive.map(x => h("span", { class: "chip " + (grav ? "err" : "wait") }, x))))));
}
function graficMediiView() {
  const cron = [...S.teme].sort((a, b) => String(a.creat_la).localeCompare(String(b.creat_la)));
  const puncte = cron.map(t => { const n = S.predari.filter(p => p.tema_id === t.id).map(notaFinala).filter(x => x != null); return { t, m: n.length ? n.reduce((a, b) => a + b, 0) / n.length : null }; }).filter(x => x.m != null);
  if (puncte.length < 2) return null;
  const W = 600, H = 170, px = 34, py = 18, step = (W - 2 * px) / (puncte.length - 1);
  const y = v => py + (10 - v) / 9 * (H - 2 * py);
  const d = puncte.map((p, i) => `${i ? "L" : "M"}${(px + i * step).toFixed(1)},${y(p.m).toFixed(1)}`).join(" ");
  const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "grafic-medii"); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Media clasei pe teme: " + puncte.map(p => `${p.t.titlu} ${fmtNota(p.m)}`).join(", "));
  svg.innerHTML = [10, 7.5, 5, 2.5].map(v => `<line x1="${px}" x2="${W - px}" y1="${y(v)}" y2="${y(v)}" class="grila-g"/><text x="${px - 8}" y="${y(v) + 4}" text-anchor="end" class="eticheta-g">${String(v).replace(".", ",")}</text>`).join("")
    + `<line x1="${px}" x2="${W - px}" y1="${y(5)}" y2="${y(5)}" class="prag-g"/>`
    + `<path d="${d} L${(px + (puncte.length - 1) * step).toFixed(1)},${H - py} L${px},${H - py} Z" class="arie-g"/><path d="${d}" class="linie-g"/>`
    + puncte.map((p, i) => `<circle cx="${(px + i * step).toFixed(1)}" cy="${y(p.m).toFixed(1)}" r="5" class="punct-g${p.m < 5 ? " slab" : ""}"><title>${p.t.titlu.replace(/[<&]/g, "")}: ${fmtNota(p.m)}</title></circle>`).join("");
  const ultim = puncte[puncte.length - 1].m, pen = puncte[puncte.length - 2].m;
  return h("section", { class: "sheet stack", style: "--acc:var(--c4)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Media clasei, de la o temă la alta"),
      h("span", { class: "chip " + (ultim >= pen ? "ok" : "wait") }, ultim >= pen ? `în creștere (${fmtNota(ultim)})` : `în scădere (${fmtNota(ultim)})`)), svg);
}

/* clasamentul pentru profesor: total, luna aceasta, progres */
function clasamentProfView() {
  const v = S.vedereClas || "total";
  const nume = m => (m.profiles && m.profiles.nume) || "Elev";
  let corp;
  if (v === "total") corp = clasamentView(S.clasament, "Clasamentul clasei");
  else {
    const luna = new Date().toISOString().slice(0, 7);
    const cron = [...S.teme].sort((a, b) => String(a.creat_la).localeCompare(String(b.creat_la)));
    const rand = S.membri.map(m => {
      const ale = cron.map(t => S.predari.find(p => p.tema_id === t.id && p.elev_id === m.elev_id)).filter(p => p && notaFinala(p) != null);
      if (v === "luna") { const n = ale.filter(p => String(p.trimis_la).slice(0, 7) === luna).map(notaFinala); return { m, val: n.length ? n.reduce((a, b) => a + b, 0) / n.length : null, extra: `${n.length} teme luna aceasta` }; }
      const n = ale.map(notaFinala); if (n.length < 2) return { m, val: null, extra: "prea puține note" };
      const k = Math.max(1, Math.floor(n.length / 2)), inc = n.slice(0, k), sf = n.slice(-k);
      const dif = sf.reduce((a, b) => a + b, 0) / sf.length - inc.reduce((a, b) => a + b, 0) / inc.length;
      return { m, val: dif, extra: `de la ${fmtNota(inc.reduce((a, b) => a + b, 0) / inc.length)} la ${fmtNota(sf.reduce((a, b) => a + b, 0) / sf.length)}` };
    }).sort((a, b) => (b.val ?? -99) - (a.val ?? -99));
    corp = h("section", { class: "sheet stack", style: "--acc:var(--c3)" }, h("h3", null, v === "luna" ? "Media pe luna aceasta" : "Cel mai mare progres"),
      h("ol", { class: "lista-clas" }, rand.map((r, i) => h("li", { class: i < 3 && r.val != null ? "podium" : "" },
        avatar(r.m.profiles && r.m.profiles.avatar, nume(r.m), 30), h("span", { class: "nume", style: "flex:1" }, nume(r.m)), h("span", { class: "muted small" }, r.extra),
        h("b", { class: "nota" }, r.val == null ? "–" : v === "luna" ? fmtNota(r.val) : (r.val >= 0 ? "+" : "") + fmtNota(r.val))))));
  }
  return h("div", { class: "stack" }, h("div", { class: "seg sub-file" }, [["total", "Total (XP)"], ["luna", "Luna aceasta"], ["progres", "Progres"]].map(([k, n]) =>
    h("button", { type: "button", class: v === k ? "on" : "", onclick: () => { S.vedereClas = k; draw(); } }, n))), corp);
}

/* fișa elevului: vezi elevi.js */

/* =====================================================================
   PROFESOR · TEME: publicare (ciornă, programată, timp limită), duplicare, termene suprapuse
   ===================================================================== */
function termenOcupat(termen) { return termen && S.profil && S.profil.rol === "profesor" ? (S.teme || []).find(t => t.termen === termen) : null; }
function avertizareTermen(v) { const t = termenOcupat(v); if (t) toast(`Atenție: în ${fmtZi(v)} are termen și „${t.titlu}”.`); render(); }
function optiuniPublicare(d) {
  d.mod = d.mod || "acum";
  return h("div", { class: "sheet stack", style: "padding:14px;--acc:var(--c4)" },
    h("div", { class: "label" }, "Publicare"),
    h("div", { class: "seg", style: "align-self:flex-start;flex-wrap:wrap" }, [["acum", "Publică acum"], ["prog", "Programează"], ["ciorna", "Ciornă (nu o văd elevii)"]].map(([k, n]) =>
      h("button", { type: "button", class: d.mod === k ? "on" : "", onclick: () => { d.mod = k; d.ciorna = k === "ciorna"; d.programata = k === "prog"; render(); } }, n))),
    h("div", { class: "grid2" },
      d.mod === "prog" ? h("label", { class: "f", for: "t-cand" }, "Apare pentru elevi la", h("input", { type: "datetime-local", id: "t-cand", value: d.cand || "", oninput: e => d.cand = e.target.value })) : h("div"),
      h("label", { class: "f", for: "t-minute" }, "Timp de lucru în minute (opțional, pentru teste)",
        h("input", { type: "number", id: "t-minute", min: "1", max: "600", step: "1", value: d.minute || "", placeholder: "Ex.: 45", oninput: e => d.minute = e.target.value }))));
}
function extraPublicare(d) {
  const min = Number(d.minute);
  return { ciorna: d.mod === "ciorna", publicata_la: d.mod === "prog" && d.cand ? new Date(d.cand).toISOString() : null, minute: min > 0 ? Math.min(600, Math.round(min)) : null };
}
function stareTemaView(t) {
  const viitor = t.publicata_la && new Date(t.publicata_la) > new Date();
  if (!t.ciorna && !viitor && !t.minute) return null;
  return h("div", { class: "files" },
    t.ciorna ? h("span", { class: "chip none" }, "Ciornă: elevii n-o văd încă") : null,
    viitor ? h("span", { class: "chip wait" }, "Apare pentru elevi pe " + fmtData(t.publicata_la)) : null,
    t.minute ? h("span", { class: "chip none" }, `Timp de lucru: ${minuteText(t.minute)}`) : null);
}
async function publicaAcum(t) {
  if (!S.demo) { const { error } = await S.sb.from("teme").update({ ciorna: false, publicata_la: null }).eq("id", t.id); if (error) { toast("Tema nu a putut fi publicată."); return; } }
  t.ciorna = false; t.publicata_la = null; toast("Tema a fost publicată. Elevii o văd acum."); draw();
}
async function duplicaTema(t) {
  if (S.demo) {
    const nou = { ...t, id: "dup" + Date.now(), titlu: t.titlu + " (copie)", creat_la: new Date().toISOString(), ciorna: true };
    S.teme.unshift(nou); S.exercitii.push(...S.exercitii.filter(e => e.tema_id === t.id).map(e => ({ ...e, id: e.id + "-c" + Date.now(), tema_id: nou.id })));
    toast("Am făcut o copie, ca ciornă. Editeaz-o și publică-o când vrei."); mergi("tema", nou.id); return;
  }
  const { data, error } = await S.sb.rpc("copiaza_tema", { p_tema: t.id, p_clasa: t.clasa_id });
  if (error) { toast(eroareDb(error, "Tema nu a putut fi duplicată.")); return; }
  if (typeof data === "string") await S.sb.from("teme").update({ titlu: t.titlu + " (copie)", ciorna: true }).eq("id", data);
  toast("Am făcut o copie, ca ciornă. Editeaz-o și publică-o când vrei."); await reincarca();
  if (typeof data === "string") mergi("tema", data); else mergi("teme");
}

/* =====================================================================
   PROFESOR · LUCRĂRI: următoarea/anterioara, comentarii gata scrise, asemănări între lucrări
   ===================================================================== */
function navLucrari(p, t) {
  const rows = S.predari.filter(x => x.tema_id === t.id).sort((a, b) => (notaFinala(b) ?? -1) - (notaFinala(a) ?? -1));
  const i = rows.findIndex(x => x.id === p.id);
  if (rows.length < 2) return null;
  const sari = q => { S.open = { [q.id]: true }; render(); setTimeout(() => document.getElementById("lucrare-" + q.id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };
  return h("div", { class: "row nav-lucrari", style: "justify-content:space-between" },
    h("button", { type: "button", class: "btn ghost", disabled: i <= 0, onclick: () => sari(rows[i - 1]) }, "‹ Lucrarea anterioară"),
    h("span", { class: "muted small" }, `Lucrarea ${i + 1} din ${rows.length}`),
    h("button", { type: "button", class: "btn ghost", disabled: i >= rows.length - 1, onclick: () => sari(rows[i + 1]) }, "Următoarea ›"));
}
const COMENTARII_GATA = ["Foarte bine! Ai înțeles textul și ai argumentat clar.", "Atenție la ortograme (s-a / sa, i-a / ia).", "Pune virgulă înainte de „dar”, „însă”, „ci”.",
  "Ai rezumat în loc să comentezi: explică ce sugerează cuvintele.", "Folosește citate scurte din text ca argumente.", "Respectă numărul minim de cuvinte.", "Folosește a doua încercare: corectează greșelile marcate."];
function comentariiRapide(ta, cid) {
  const ale = citesteJSON("comentarii-mele", []);
  const adauga = txt => { const v = (S.drafts[cid] ?? ta.value); ta.value = (v ? v.trim() + " " : "") + txt; S.drafts[cid] = ta.value; };
  return h("div", { class: "stack", style: "gap:6px" },
    h("div", { class: "files coment-gata" }, [...COMENTARII_GATA, ...ale].map(c => h("button", { type: "button", class: "chip none", title: "Adaugă în comentariu", onclick: () => adauga(c) }, "+ " + (c.length > 46 ? c.slice(0, 44) + "…" : c)))),
    h("div", null, h("button", { type: "button", class: "link-btn small", onclick: () => {
      const v = String(S.drafts[cid] ?? ta.value).trim(); if (!v) { toast("Scrie întâi comentariul pe care vrei să-l păstrezi."); return; }
      const l = citesteJSON("comentarii-mele", []); if (!l.includes(v)) l.push(v); scrieLocal("comentarii-mele", JSON.stringify(l.slice(-20))); toast("Comentariul a fost păstrat. Îl găsești printre cele gata scrise."); render();
    } }, "Păstrează acest comentariu pentru altă dată")));
}
function trigrame(text) {
  const c = normalizeaza(text).replace(/[^a-z0-9 ]/g, " ").split(" ").filter(Boolean), s = new Set();
  for (let i = 0; i + 2 < c.length; i++) s.add(c[i] + " " + c[i + 1] + " " + c[i + 2]);
  return { s, n: c.length };
}
function asemanariView(t, rows, exercitii) {
  const libere = exercitii.filter(e => e.tip === "liber");
  if (!libere.length || rows.length < 2) return null;
  const rez = (S.asem || (S.asem = {}))[t.id];
  const nume = id => ((S.membri.find(m => m.elev_id === id) || {}).profiles || {}).nume || "Elev";
  if (!rez) return h("div", null, h("button", { type: "button", class: "btn ghost", onclick: () => {
    const perechi = [];
    for (const ex of libere) {
      const txt = rows.map(p => ({ p, ...trigrame((p.rezultate || {})[ex.id]?.raspuns || "") })).filter(x => x.n >= 25);
      for (let i = 0; i < txt.length; i++) for (let j = i + 1; j < txt.length; j++) {
        const a = txt[i], b = txt[j]; let com = 0; for (const g of a.s) if (b.s.has(g)) com++;
        const proc = Math.round(100 * com / Math.max(1, Math.min(a.s.size, b.s.size)));
        if (proc >= 40) perechi.push({ a: a.p, b: b.p, ex, proc });
      }
    }
    S.asem[t.id] = perechi.sort((x, y) => y.proc - x.proc); render();
  } }, "Verifică asemănările dintre lucrări"));
  return h("div", { class: "stack", style: "gap:8px;padding:12px;border:1px dashed var(--edge);border-radius:14px" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("b", null, "Asemănări între răspunsurile libere"), h("button", { type: "button", class: "link-btn small", onclick: () => { S.asem[t.id] = null; render(); } }, "Închide")),
    rez.length ? rez.map(x => h("div", { class: "row small" }, h("span", { class: "chip " + (x.proc >= 70 ? "err" : "wait") }, x.proc + "% la fel"),
      h("b", null, nume(x.a.elev_id)), "și", h("b", null, nume(x.b.elev_id)), h("span", { class: "muted" }, `· exercițiul ${x.ex.ordine}`)))
      : h("p", { class: "muted small", style: "margin:0" }, "Nu am găsit răspunsuri libere care să semene prea mult între ele."),
    h("p", { class: "muted small", style: "margin:0" }, "Verificarea compară grupuri de câte trei cuvinte. Un procent mare e doar un semnal: citește lucrările înainte să tragi o concluzie."));
}

/* =====================================================================
   PROFESOR · PLAN ȘI BANCĂ: unități predate, etichete și căutare
   ===================================================================== */
function bifaUnitate(u) {
  const k = "predate-" + S.clasaSel, l = citesteJSON(k, {});
  return h("label", { class: "row small", style: "gap:6px;cursor:pointer" },
    h("input", { type: "checkbox", checked: !!l[u], onchange: e => { const x = citesteJSON(k, {}); x[u] = e.target.checked; scrieLocal(k, JSON.stringify(x)); draw(); } }),
    l[u] ? h("span", { class: "chip ok" }, "Predată") : "Predată");
}
function cautareBanca() {
  const toate = [...new Set((S.banca || []).flatMap(s => (s.continut && s.continut.etichete) || []))].sort();
  return h("div", { class: "stack", style: "gap:8px" },
    h("div", { class: "row" }, campCautare("caut-banca", "cautBanca", "Caută după titlu sau etichetă…")),
    toate.length ? h("div", { class: "files" }, toate.map(e => h("button", { type: "button", class: "chip " + (S.tagBanca === e ? "ok" : "none"), onclick: () => { S.tagBanca = S.tagBanca === e ? null : e; draw(); } }, "#" + e))) : null);
}
function filtreazaBanca(B) {
  const q = normalizeaza(S.cautBanca || "");
  return B.filter(s => { const et = (s.continut && s.continut.etichete) || [];
    return (!S.tagBanca || et.includes(S.tagBanca)) && (!q || normalizeaza(s.titlu + " " + et.join(" ")).includes(q)); });
}
function eticheteBanca(s) {
  const et = (s.continut && s.continut.etichete) || [];
  const salveaza = async lista => {
    const continut = { ...s.continut, etichete: lista };
    if (!S.demo) { const { error } = await S.sb.from("banca").update({ continut }).eq("id", s.id); if (error) { toast("Etichetele nu au putut fi salvate."); return; } }
    s.continut = continut; draw();
  };
  return h("div", { class: "row", style: "gap:6px;margin-top:8px" },
    et.map(e => h("span", { class: "chip none" }, "#" + e, h("button", { type: "button", class: "x-eticheta", "aria-label": "Scoate eticheta " + e, onclick: () => salveaza(et.filter(x => x !== e)) }, "×"))),
    h("input", { type: "text", style: "width:150px;padding:6px 10px", placeholder: "+ etichetă (Enter)", "aria-label": "Adaugă o etichetă",
      onkeydown: e => { if (e.key !== "Enter") return; e.preventDefault(); const v = e.target.value.trim().replace(/^#/, "").slice(0, 30); if (v && !et.includes(v)) salveaza([...et, v]); } }));
}

/* =====================================================================
   PESTE TOT: clopoțelul cu notificări, ecranul de încărcare, modul fără internet
   ===================================================================== */
function notificariClopotel() {
  if (!S.profil) return [];
  const l = [];
  if (S.profil.rol === "elev") {
    for (const m of firePrimiteElev()) { const t = S.temeElev.find(x => x.id === m.tema_id); l.push({ t: `Răspuns de la profesor${t ? ` la „${t.titlu}”` : ""}`, href: "#/tema/" + encodeURIComponent(m.tema_id), c: "var(--c4)" }); }
    const vaz = citesteJSON(cheieElev("anunturi"), {});
    for (const c of S.claseElev || []) if (c.anunt && vaz[c.id] !== String(c.anunt_la || c.anunt)) l.push({ t: `Anunț nou în ${c.nume}`, href: "#/acasa", c: "var(--c2)" });
    for (const t of S.temeElev || []) {
      if (S.predariElev.some(p => p.tema_id === t.id) || !t.termen) continue;
      const z = zileRamase(t.termen); if (z != null && z >= 0 && z <= 2) l.push({ t: `„${t.titlu}”: termen ${z === 0 ? "azi" : z === 1 ? "mâine" : "poimâine"}`, href: "#/tema/" + encodeURIComponent(t.id), c: "var(--c1)" });
    }
    for (const t of S.notifNoi || []) l.push({ t: `Temă nouă: „${t.titlu}”`, href: "#/tema/" + encodeURIComponent(t.id), c: "var(--c3)" });
  } else {
    const v = deVerificatLista(); if (v.length) l.push({ t: `${v.length} ${v.length === 1 ? "lucrare de verificat" : "lucrări de verificat"}`, href: "#/acasa", c: "var(--c2)" });
    const fire = {}; for (const m of S.mesaje || []) { const k = m.tema_id + "|" + m.elev_id; if (!fire[k] || String(fire[k].creat_la) < String(m.creat_la)) fire[k] = m; }
    for (const m of Object.values(fire).filter(m => m.autor_id === m.elev_id)) {
      const n = ((S.membri.find(x => x.elev_id === m.elev_id) || {}).profiles || {}).nume || "Un elev";
      l.push({ t: `${n} ți-a scris`, href: "#/tema/" + encodeURIComponent(m.tema_id), c: "var(--c4)" });
    }
    const al = situatieElevi().filter(x => x.grav).length; if (al) l.push({ t: `${al} ${al === 1 ? "elev are" : "elevi au"} nevoie de atenție`, href: "#/acasa", c: "var(--c1)" });
  }
  return l;
}
function clopotel() {
  const l = notificariClopotel();
  return h("div", { class: "clopot-wrap" },
    h("button", { type: "button", class: "btn ghost clopot", "aria-label": `Notificări (${l.length})`, "aria-expanded": S.clopotelDeschis ? "true" : "false",
      onclick: () => { S.clopotelDeschis = !S.clopotelDeschis; drawRole(); } }, "🔔", l.length ? h("span", { class: "nav-badge" }, l.length) : null),
    S.clopotelDeschis ? h("div", { class: "clopot-panou" }, h("div", { class: "nav-titlu" }, "Notificări"),
      l.length ? l.map(x => h("a", { href: x.href, class: "clopot-item", style: "--ic:" + x.c, onclick: () => { S.clopotelDeschis = false; setTimeout(drawRole, 0); } }, h("span", { class: "punct-clopot" }), x.t))
        : h("p", { class: "muted small", style: "margin:4px 8px" }, "Nimic nou. Ești la zi!")) : null);
}
document.addEventListener("click", e => { if (S && S.clopotelDeschis && e.target.closest && !e.target.closest(".clopot-wrap")) { S.clopotelDeschis = false; drawRole(); } });
document.addEventListener("keydown", e => { if (e.key === "Escape" && S && S.clopotelDeschis) { S.clopotelDeschis = false; drawRole(); } });

function scheletIncarcare() {
  return h("div", { class: "cadru schelet", "aria-busy": "true", "aria-label": "Se încarcă" },
    h("div", { class: "sidenav schelet-meniu" }, Array.from({ length: 7 }, () => h("span", { class: "bloc", style: "height:34px" }))),
    h("div", { class: "stack" }, h("span", { class: "bloc", style: "height:38px;width:40%" }), h("span", { class: "bloc", style: "height:120px" }),
      h("div", { class: "grid-acasa" }, h("span", { class: "bloc", style: "height:180px" }), h("span", { class: "bloc", style: "height:180px" }))));
}

/* fără internet: rămân Opere, Limbă și Jocuri, cu progresul ultimului cont folosit */
function pornesteOffline() {
  const ult = citesteJSON("ultim-profil", null);
  S.offline = true; S.loading = false;
  S.user = { id: (ult && ult.id) || "anonim" }; S.profil = { rol: "elev", nume: (ult && ult.nume) || "Cititor", avatar: ult && ult.avatar };
  S.claseElev = []; S.temeElev = []; S.predariElev = []; S.clasamente = {}; S.mesaje = [];
  if (!["opere", "limba", "jocuri"].includes(S.pag)) S.pag = "opere";
  ascundeIncarcare(); draw();
  addEventListener("online", () => toast("Ai din nou internet. Reîncarcă pagina ca să intri în cont."), { once: true });
  return true;
}
function drawOffline() {
  const pagini = PAGINI_ELEV.filter(p => ["opere", "limba", "jocuri"].includes(p.k));
  if (!["opere", "limba", "jocuri"].includes(S.pag)) S.pag = "opere";
  const c = S.pag === "limba" ? [capPagina("Limba română"), subFile([["doom", "DOOM"], ["gram", "Punctuație și gramatică"], ["fc", "Fișe de memorat"]], "subLimba"), S.subLimba === "fc" ? flashcardsView() : S.subLimba === "gram" ? gramaticaView() : doomView()]
    : S.pag === "jocuri" ? [capPagina("Jocuri"), subFile([["fig", "Ghicește figura"], ["autori", "Autori și citate"]], "subJocuri"), S.subJocuri === "autori" ? autoriView() : figuriView()]
    : [capPagina("Opere"), subFile([["bib", "Biblioteca"], ["cur", "Curente literare"]], "subOpere"), ...(S.subOpere === "cur" ? [curenteView()] : opereView().slice(0, 2))];
  return cadru(pagini, ["opere", "limba", "jocuri"], [h("div", { class: "note" }, "Ești fără internet. Poți recapitula operele și exersa limba; temele și notele apar când revine conexiunea."), ...c]);
}
function tinMinteProfil() {
  if (S.profil && S.user && !S.demo) scrieLocal("ultim-profil", JSON.stringify({ id: S.user.id, nume: S.profil.nume, avatar: S.profil.avatar, rol: S.profil.rol }));
}

/* date în plus pentru demonstrație */
function demoExtra(rol) {
  if (rol === "profesor") {
    S.clase[0].anunt = "Joi avem lucrare din „Plumb”. Recitiți poezia și fișa simbolismului."; S.clase[0].anunt_la = "2026-11-12T08:00:00Z";
    S.teme.push({ id: "tc", clasa_id: "c1", titlu: "Recapitulare: romantismul", cerinta: "", termen: null, elevii_vad: true, creat_la: "2026-11-12T09:00:00Z", ciorna: true });
    S.exercitii.push({ id: "c1x", tema_id: "tc", ordine: 1, enunt: "Numește două trăsături ale romantismului.", tip: "liber", variante: [], puncte: 2 });
    // o temă cu termenul trecut, netrimisă de unii elevi (pentru restanțe)
    S.teme.push({ id: "tr", clasa_id: "c1", titlu: "Fișă de lectură: „Ion”", cerinta: "", termen: ziISO(Date.now() - 3 * 864e5), elevii_vad: true, creat_la: "2026-11-08T09:00:00Z" });
    S.exercitii.push({ id: "r1x", tema_id: "tr", ordine: 1, enunt: "Cine este Vasile Baciu?", tip: "text", variante: [], puncte: 1 });
    for (const [e, n] of [["e0", 10], ["e2", 8]]) S.predari.push({ id: "r-" + e, tema_id: "tr", elev_id: e, status: "corectat", nota: n, punctaj: n / 10, punctaj_max: 1, procent: n * 10, trimis_la: ziISO(Date.now() - 4 * 864e5) + "T10:00:00Z", rezultate: {} });
  } else {
    S.claseElev[0].anunt = "Joi avem lucrare din „Plumb”. Recitiți poezia și fișa simbolismului."; S.claseElev[0].anunt_la = "2026-11-12T08:00:00Z";
    S.temeElev.push({ id: "t3", clasa_id: "c1", titlu: "Mini-test: figuri de stil", cerinta: "", termen: ziISO(Date.now() + 864e5), minute: 10, creat_la: "2026-11-11T08:00:00Z",
      exercitii: [{ id: "w1", tema_id: "t3", ordine: 1, enunt: "„Vântul plângea printre crengi” conține:", tip: "grila", variante: ["personificare", "comparație", "epitet"], puncte: 1 },
        { id: "w2", tema_id: "t3", ordine: 2, enunt: "Scrie un epitet pentru „noapte”.", tip: "text", variante: [], puncte: 1 }] });
    DEMO_CORECTE.w1 = "0"; DEMO_CORECTE.w2 = "tăcută";
  }
}
