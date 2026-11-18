/* Caietul de teme: aplicația din browser (elev + profesor), pe Supabase.
   Exercițiile cu răspuns fix se corectează automat în baza de date;
   cele cu răspuns liber, de AI (dacă e pornit) sau de profesor. */
"use strict";

const S = {
  sb: null, user: null, profil: null,
  authMode: "intra", authRol: "elev", authBusy: false,
  // profesor
  clase: [], clasaSel: null, teme: [], membri: [], predari: [], exercitii: [], corecte: [],
  // elev
  claseElev: [], temeElev: [], predariElev: [],
  drafts: {}, raspunsuri: {}, busy: {}, open: {}, confirm: null, newTema: false, loading: true, fatal: "",
};

const TIPURI = {
  liber: "Răspuns liber (compunere, analiză, explicație)",
  text: "Cuvânt / text scurt",
  grila: "Grilă (alegere din variante)",
  numar: "Număr (ex. numărul de silabe)",
};

/* ---------------- utilitare ---------------- */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "value") el.value = v;
    else if (k === "checked") el.checked = !!v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; el.append(c instanceof Node ? c : String(c)); }
  return el;
}
const fmtNr = n => n == null ? "–" : (Math.round(Number(n) * 100) / 100).toString().replace(".", ",");
const fmtNota = n => n == null ? "–" : (Math.round(n * 10) / 10).toFixed(1).replace(".0", "").replace(".", ",");
const fmtData = t => t ? new Date(t).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const fmtZi = d => d ? new Date(d + "T12:00:00").toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }) : "";
const notaFinala = p => p == null ? null : (p.nota_profesor != null ? Number(p.nota_profesor) : (p.nota != null ? Number(p.nota) : null));
function toast(msg) {
  if (S.demo && /nu a putut|nu au putut|Nu am putut|nu a reușit/i.test(msg)) msg = "Aceasta e o demonstrație: nimic nu se salvează.";
  const t = document.getElementById("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 5000); }
function eroareDb(e, implicit) {
  const m = (e && e.message) || "";
  if (/Invalid login credentials/i.test(m)) return "Email sau parolă greșită.";
  if (/already registered/i.test(m)) return "Există deja un cont cu acest email. Intră în cont.";
  if (/Password should be at least/i.test(m)) return "Parola trebuie să aibă cel puțin 6 caractere.";
  if (/Email not confirmed/i.test(m)) return "Confirmă întâi adresa de email (verifică inboxul).";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Nu există conexiune la server. Verifică internetul.";
  // mesajele scrise de noi în baza de date sunt deja în română
  if (/[ăâîșț]/i.test(m) && m.length < 200) return m;
  return implicit;
}

/* Banda brodată: un motiv de ie (romb cu „ochi” negru și cruciulițe), desenat punct cu punct, ca la cusătura în cruce. */
function deseneazaIe(id, pas) {
  const svg = document.getElementById(id);
  if (!svg) return;
  const L = 24, H = 11, rosu = [], negru = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
    const d = Math.abs(x - 11) + Math.abs(y - 5);
    if (d === 5 || d === 3) rosu.push([x, y]);
    else if (d <= 1) negru.push([x, y]);
    else if ((x === 23 && Math.abs(y - 5) <= 1) || (x === 22 && y === 5) || (x === 0 && y === 5)) negru.push([x, y]);
    else if ((y === 0 || y === 10) && x % 4 === 1 && Math.abs(x - 11) > 5) rosu.push([x, y]);
  }
  const p = pas, cel = ([x, y]) => `<rect x="${x * p + p * 0.1}" y="${y * p + p * 0.1}" width="${p * 0.8}" height="${p * 0.8}"/>`;
  const W = L * p, Ht = H * p, sus = (svg.getBoundingClientRect().height || Ht + 3 * p) / 2 - Ht / 2;
  svg.innerHTML = `<defs><pattern id="${id}-m" width="${W}" height="${Ht}" patternUnits="userSpaceOnUse" y="${sus}">
      <g fill="currentColor">${rosu.map(cel).join("")}</g><g style="fill:var(--thread)">${negru.map(cel).join("")}</g></pattern></defs>
    <line x1="0" x2="100%" y1="1" y2="1" stroke="currentColor" stroke-width="1.5" stroke-dasharray="${p} ${p}"/>
    <rect x="0" y="${sus}" width="100%" height="${Ht}" fill="url(#${id}-m)"/>
    <line x1="0" x2="100%" y1="${sus * 2 + Ht - 1}" y2="${sus * 2 + Ht - 1}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="${p} ${p}"/>`;
}

/* Ecranul de încărcare rămâne cel puțin cât să se deschidă caietul și să se întoarcă o pagină. */
const T0 = performance.now();
let incarcareAscunsa = false;

const MISCARE = !matchMedia("(prefers-reduced-motion: reduce)").matches;
const CULORI = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];

/* Literele românești Ă Â Î Ș Ț orbitează în 3D în jurul stelei: cele din față sunt mai mari și trec peste stea,
   cele din spate sunt mai mici și trec prin spatele ei. */
function pornesteOrbita(el) {
  if (!el || el.dataset.pornit) return;
  el.dataset.pornit = "1";
  const litere = ["Ă", "Â", "Î", "Ș", "Ț", "A", "Z"].map((l, i) => {
    const d = h("span", { class: "lit" }, l);
    d.style.setProperty("--lc", CULORI[i % 5]);
    el.append(d);
    return { d, unghi: i / 7 * Math.PI * 2, raza: [120, 144, 168][i % 3], inclin: [0, 28, -28][i % 3] * Math.PI / 180, viteza: [0.55, 0.42, 0.33][i % 3] };
  });
  let t0 = performance.now();
  (function cadru(t) {
    if (!el.isConnected) return;
    const dt = MISCARE ? (t - t0) / 1000 : 0;
    for (const L of litere) {
      const a = L.unghi + dt * L.viteza;
      const x0 = Math.cos(a) * L.raza, y0 = Math.sin(a) * L.raza * 0.31, z = Math.sin(a);
      const x = x0 * Math.cos(L.inclin) - y0 * Math.sin(L.inclin), y = x0 * Math.sin(L.inclin) + y0 * Math.cos(L.inclin);
      L.d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.72 + 0.38 * (z + 1) / 2).toFixed(3)})`;
      L.d.style.zIndex = z > 0 ? 3 : 0;
      L.d.style.opacity = (0.45 + 0.55 * (z + 1) / 2).toFixed(2);
    }
    if (MISCARE) requestAnimationFrame(cadru);
  })(t0);
}
/* Cartea e singurul ecran de încărcare la prima vizită: faza 1 (deschiderea) durează ~6,4 s,
   apoi cartea așteaptă până e gata site-ul și abia atunci intrăm în pagină. */
const INTRO = { activ: false, faza1: false, gata: false, iesit: false };
(function intro() {
  const el = document.getElementById("intro");
  if (!el) return;
  if (!document.documentElement.classList.contains("cu-intro")) { el.remove(); return; }
  try { sessionStorage.setItem("intro", "1"); } catch { /* fără stocare */ }
  INTRO.activ = true;
  // praful din lumina spotului (puține particule, ca să nu încetinească)
  const praf = document.getElementById("praf");
  for (let i = 0; i < 22; i++) {
    const p = document.createElement("i");
    const x = 50 + (Math.random() - 0.5) * 46 * (0.4 + Math.random());   // mai des în mijlocul conului
    p.style.cssText = `left:${x}vw;top:${25 + Math.random() * 65}vh;--m:${(1 + Math.random() * 2.2).toFixed(1)}px;--d:${(6 + Math.random() * 8).toFixed(1)}s;` +
      `--i:-${(Math.random() * 10).toFixed(1)}s;--dx:${((Math.random() - 0.5) * 8).toFixed(1)}vw;--o:${(0.25 + Math.random() * 0.6).toFixed(2)}`;
    praf.append(p);
  }
  const iesi = () => {
    if (INTRO.iesit) return; INTRO.iesit = true;
    el.classList.add("iesire");
    setTimeout(() => { el.remove(); INTRO.activ = false; }, 1700);
  };
  INTRO.incearca = () => { if (INTRO.faza1 && INTRO.gata) iesi(); };
  setTimeout(() => { INTRO.faza1 = true; INTRO.incearca(); }, 6700);
  document.getElementById("sari-intro").addEventListener("click", iesi);
  setTimeout(iesi, 20000);   // oricum, nu ținem pe nimeni mai mult de 20 de secunde
})();

/* Cerul cu stele: sclipesc încet și se mișcă puțin după mouse. */
(function stele() {
  const cv = document.getElementById("stele");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  let W, H, puncte = [], mx = 0, my = 0;
  // mai puține stele, desenate de ~20 de ori pe secundă și deloc când pagina nu se vede (fără lag)
  const marime = () => {
    const r = Math.min(devicePixelRatio || 1, 1.5);
    W = cv.width = innerWidth * r; H = cv.height = innerHeight * r;
    puncte = Array.from({ length: Math.min(160, Math.round(innerWidth * innerHeight / 11000)) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.2 + 0.4) * r, f: Math.random() * 6.28, adanc: Math.random() * 0.8 + 0.2 }));
  };
  let timerRedim; marime(); addEventListener("resize", () => { clearTimeout(timerRedim); timerRedim = setTimeout(marime, 200); });
  addEventListener("pointermove", e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  let ultim = 0;
  (function deseneaza(t) {
    if (MISCARE) requestAnimationFrame(deseneaza);
    if (document.hidden || (t - ultim < 50 && t)) return;
    ultim = t;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#e9ecff";
    for (const s of puncte) {
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.f + t / 1400 * s.adanc));
      ctx.fillRect(s.x - mx * 30 * s.adanc, s.y - my * 30 * s.adanc, s.r * 1.6, s.r * 1.6);
    }
  })(0);
})();

/* Confetti colorat, când elevul ia o notă mare. */
function confetti() {
  if (!MISCARE) return;
  for (let i = 0; i < 90; i++) {
    const c = h("span", { class: "confetti" });
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = CULORI[i % 5];
    c.style.setProperty("--dx", (Math.random() * 200 - 100).toFixed(0) + "px");
    c.style.setProperty("--r", (Math.random() * 900 - 450).toFixed(0) + "deg");
    c.style.animationDuration = (1.8 + Math.random() * 1.6).toFixed(2) + "s";
    c.style.animationDelay = (Math.random() * 0.4).toFixed(2) + "s";
    document.body.append(c);
    setTimeout(() => c.remove(), 4200);
  }
}
/* ---------------- preferințe salvate în browser ---------------- */
function citesteLocal(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } }
function scrieLocal(k, v) { try { localStorage.setItem(k, v); } catch { /* fără stocare: rămâne doar pentru acum */ } }

/* ---------------- palete de culori ---------------- */
const PALETE = { galaxie: "Galaxie", aurora: "Aurora", apus: "Apus" };
function aplicaPaleta(p) { if (!PALETE[p]) p = "galaxie"; document.documentElement.dataset.paleta = p; scrieLocal("paleta", p); }
aplicaPaleta(citesteLocal("paleta", "galaxie"));

/* ---------------- sunete (scurte, generate în browser) ---------------- */
let sunet = citesteLocal("sunet", "da") === "da";
let actx = null;
function canta(note, tip) {
  if (!sunet) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    note.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), s = t + i * 0.09;
      o.type = tip || "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.13, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.4);
      o.connect(g).connect(actx.destination); o.start(s); o.stop(s + 0.45);
    });
  } catch { /* fără sunet în acest browser */ }
}
function sunetNota(n) { if (n >= 9) canta([523, 659, 784, 1047]); else if (n >= 5) canta([440, 554, 659]); else canta([392, 330], "sine"); }
function sunetClic() { canta([880], "sine"); }

/* ---------------- avatare ---------------- */
const AV_FOND = [
  "conic-gradient(from 200deg, #ff6b7a, #ffb547, #ff6b7a)", "conic-gradient(from 90deg, #3ddc97, #4cc9f0, #3ddc97)",
  "conic-gradient(from 0deg, #a77bff, #4cc9f0, #a77bff)", "radial-gradient(circle at 30% 30%, #ffd68a, #ff6b7a)",
  "radial-gradient(circle at 70% 25%, #9ff3d0, #1f8f80)", "linear-gradient(135deg, #a77bff, #ff6b7a)",
  "linear-gradient(135deg, #ffb547, #3ddc97)", "linear-gradient(135deg, #4cc9f0, #3046c9)"];
const AV_FORMA = ["50%", "30%", "50% 50% 50% 14%", "38% 62% 55% 45% / 45% 40% 60% 55%"];
function initiale(n) { return String(n || "?").replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase() || "?"; }
function avatar(cod, nume, m) {
  m = m || 36;
  let i = /^a[1-8]$/.test(cod || "") ? Number(cod.slice(1)) - 1 : [...String(nume || "")].reduce((s, c) => s + c.charCodeAt(0), 0) % 8;
  return h("span", { class: "av", "aria-hidden": "true",
    style: `width:${m}px;height:${m}px;font-size:${Math.round(m * 0.38)}px;background:${AV_FOND[i]};border-radius:${AV_FORMA[i % 4]}` }, initiale(nume));
}

/* ---------------- clasament ---------------- */
function clasamentView(lista, titlu, extra) {
  if (!lista) return null;
  const max = Math.max(1, ...lista.map(r => r.xp));
  return h("div", { class: "sheet clasament" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, titlu), extra || h("span", { class: "muted small" }, "după puncte XP")),
    lista.length ? h("ol", { class: "top" }, lista.slice(0, 10).map((r, i) =>
      h("li", { class: "loc" + (r.eu ? " eu" : "") + (i < 3 ? " p" + (i + 1) : "") },
        h("span", { class: "poz" }, i + 1), avatar(r.avatar, r.nume, 34),
        h("div", { class: "loc-info" },
          h("div", { class: "row", style: "justify-content:space-between;gap:8px" },
            h("span", { class: "nume" }, r.nume, r.eu ? h("span", { class: "tu" }, "tu") : null),
            h("span", { class: "xp-val" }, `${r.xp} XP`)),
          h("div", { class: "bara-loc" }, h("span", { style: `width:${Math.round(r.xp / max * 100)}%` })),
          h("div", { class: "muted small" }, `${r.teme} teme` + (r.media != null ? ` · media ${fmtNota(Number(r.media))}` : ""))))))
      : h("p", { class: "muted small" }, "Clasamentul apare după primele teme trimise."));
}

/* ---------------- grafic mic cu evoluția notelor ---------------- */
function sparkline(valori) {
  const W = 130, H = 34, puncte = valori.map((v, i) => v == null ? null : [valori.length === 1 ? W / 2 : 4 + i * (W - 8) / (valori.length - 1), H - 4 - (v - 1) / 9 * (H - 8)]);
  const pe = puncte.filter(Boolean);
  if (!pe.length) return h("span", { class: "muted small" }, "–");
  const s = h("span", { class: "spark" });
  const ultim = pe[pe.length - 1], nota = valori.filter(v => v != null).slice(-1)[0];
  s.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-label="Evoluția notelor">
    <line x1="0" x2="${W}" y1="${H - 4 - 4 / 9 * (H - 8)}" y2="${H - 4 - 4 / 9 * (H - 8)}" stroke="rgba(255,255,255,.15)" stroke-dasharray="3 3"/>
    <polyline points="${pe.map(p => p.join(",")).join(" ")}" fill="none" stroke="var(--c4)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${pe.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.2" fill="var(--c4)"/>`).join("")}
    <circle cx="${ultim[0]}" cy="${ultim[1]}" r="4" fill="${nota >= 5 ? "var(--c3)" : "var(--c1)"}"/></svg>`;
  return s;
}

/* ---------------- export note pentru Excel ---------------- */
function exportaNote(clasa) {
  const teme = [...S.teme].sort((a, b) => String(a.creat_la).localeCompare(String(b.creat_la)));
  const cel = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rand = [["Elev", ...teme.map(t => t.titlu), "Media"].map(cel).join(";")];
  for (const m of S.membri) {
    const note = teme.map(t => notaFinala(S.predari.find(p => p.tema_id === t.id && p.elev_id === m.elev_id)));
    const ok = note.filter(n => n != null);
    rand.push([(m.profiles && m.profiles.nume) || "Elev", ...note.map(n => n == null ? "" : String(n).replace(".", ",")),
      ok.length ? (ok.reduce((a, b) => a + b, 0) / ok.length).toFixed(2).replace(".", ",") : ""].map(cel).join(";"));
  }
  const blob = new Blob(["﻿" + rand.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `note-${clasa.nume.replace(/[^\p{L}\p{N}]+/gu, "-")}.csv` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast("Notele au fost descărcate. Fișierul se deschide în Excel.");
}

function ascundeIncarcare() {
  if (incarcareAscunsa) return;
  incarcareAscunsa = true;
  if (INTRO.activ) { INTRO.gata = true; INTRO.incearca(); return; }
  const rapid = matchMedia("(prefers-reduced-motion: reduce)").matches;
  void rapid; // fără ecran de încărcare separat: site-ul apare direct
}

/* Scena de pe pagina de intrare: aceeași orbită de litere. */
function erou() {
  return h("div", { class: "erou" },
    h("div", { class: "coperta-erou", "aria-hidden": "true" },
      h("span", { class: "ce-cotor" }), h("span", { class: "ce-emblema" }, "Ș"),
      h("span", { class: "ce-nume" }, "Caietul", h("br"), "de teme"), h("span", { class: "ce-sub" }, "Limba și literatura română"),
      h("span", { class: "ce-panglica" })),
    h("div", { class: "erou-text" },
      h("h2", null, "Temele de română, ", h("em", null, "corectate pe loc")),
      h("p", null, "Profesorul scrie exercițiile și baremul. Elevii răspund, iar caietul pune nota, explică greșelile și arată cum a mers toată clasa.")));
}

/* Foile se înclină ușor după mouse, ca o pagină ridicată de pe bancă. */
(function inclinare() {
  if (!matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
  let activ = null;
  document.addEventListener("pointermove", e => {
    const foaie = e.target.closest && e.target.closest("#app section.sheet");
    if (activ && activ !== foaie) { activ.style.transform = ""; activ.classList.remove("inclinat"); activ = null; }
    if (!foaie || foaie.matches(":focus-within")) return;
    const r = foaie.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    const grad = Math.min(1, 500 / r.height); // foile lungi se înclină mai puțin
    foaie.style.transform = `perspective(1400px) rotateX(${(-y * 3 * grad).toFixed(2)}deg) rotateY(${(x * 3.5 * grad).toFixed(2)}deg) translateZ(6px)`;
    foaie.classList.add("inclinat"); activ = foaie;
  });
  document.addEventListener("pointerleave", () => { if (activ) { activ.style.transform = ""; activ.classList.remove("inclinat"); activ = null; } });
})();

/* Textul suport (poezie, fragment), cu versurile numerotate ca în manual. */
function textSuport(s) {
  let n = 0;
  return h("div", { class: "text-suport" }, String(s).replace(/\r/g, "").split("\n").map(r =>
    r.trim() ? h("div", { class: "vers" }, h("span", { class: "nr" }, ++n % 5 === 0 || n === 1 ? n : ""), r)
             : h("div", { class: "vers gol" })));
}

/* Nota, într-un inel colorat care se umple după procentul obținut. */
let inelId = 0;
function inel(copil, procent) {
  const id = "gr" + (++inelId), L = 251.3, p = Math.max(0, Math.min(100, procent ?? 0));
  const w = h("span", { class: "inel" });
  w.innerHTML = `<svg viewBox="0 0 92 92" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p >= 50 ? "#3ddc97" : "#ffb547"}"/><stop offset=".5" stop-color="#4cc9f0"/><stop offset="1" stop-color="${p >= 50 ? "#a77bff" : "#ff6b7a"}"/></linearGradient></defs>
    <circle class="fond" cx="46" cy="46" r="40" fill="none" stroke-width="8"/>
    <circle class="arc" cx="46" cy="46" r="40" fill="none" stroke-width="8" stroke="url(#${id})" style="stroke-dashoffset:${(L * (1 - p / 100)).toFixed(1)}"/></svg>`;
  w.append(copil);
  return w;
}

/* Re-desenarea se amână cât timp utilizatorul scrie într-un câmp. */
let pending = false;
function render() {
  const a = document.activeElement;
  if (a && a.closest && a.closest("#app") && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.type !== "radio" && a.type !== "checkbox") { pending = true; return; }
  pending = false; draw();
}
document.addEventListener("focusout", () => setTimeout(() => { if (pending) render(); }, 0));

/* ---------------- demonstrație (fără internet, fără cont) ---------------- */
/* Date de exemplu, doar pentru a vedea cum arată site-ul. Nimic nu se salvează. */
const DEMO_POEZIE = "Dormeau adânc sicriele de plumb,\nȘi flori de plumb și funerar vestmânt —\nStam singur în cavou... și era vânt...\nȘi scârțâiau coroanele de plumb.\n\nDormea întors amorul meu de plumb\nPe flori de plumb, și-am început să-l strig —\nStam singur lângă mort... și era frig...\nȘi-i atârnau aripile de plumb.";
function pornesteDemo(rol) {
  const acum = new Date().toISOString();
  const eroare = { message: "Aceasta e o demonstrație: nimic nu se salvează." };
  const nimic = async () => ({ data: null, error: eroare });
  // orice lanț de forma S.sb.from(...).select(...).eq(...) răspunde cu „nu se salvează”
  const lant = () => new Proxy(function () {}, {
    get: (_, k) => k === "then" ? undefined : k === "data" ? null : k === "error" ? eroare : lant(),
    apply: () => lant() });
  S.sb = { from: lant, rpc: nimic, functions: { invoke: nimic }, auth: { signOut: () => { location.hash = ""; location.reload(); } } };
  S.demo = true; S.fatal = ""; S.loading = false;
  const ex = [
    { id: "x1", tema_id: "t1", ordine: 1, enunt: "Desparte în silabe cuvântul „sicriele”.", tip: "text", variante: [], puncte: 1 },
    { id: "x2", tema_id: "t1", ordine: 2, enunt: "Figura de stil din structura „flori de plumb” este:", tip: "grila", variante: ["epitet", "comparație", "metaforă", "personificare"], puncte: 1 },
    { id: "x3", tema_id: "t1", ordine: 3, enunt: "Câte strofe are textul?", tip: "numar", variante: [], puncte: 1 },
    { id: "x4", tema_id: "t1", ordine: 4, enunt: "Comentează prima strofă, în minimum 80 de cuvinte.", tip: "liber", variante: [], puncte: 3 }];
  const ex2 = [{ id: "y1", tema_id: "t2", ordine: 1, enunt: "Completează cu „s-a” sau „sa”: Ion ___ dus la școală.", tip: "text", variante: [], puncte: 1 },
    { id: "y2", tema_id: "t2", ordine: 2, enunt: "Completează: Maria și-a uitat cartea ___.", tip: "text", variante: [], puncte: 1 }];
  const rez = (a, b, c, d, com) => ({
    x1: { raspuns: a, corect: a === "si-cri-e-le", puncte: a === "si-cri-e-le" ? 1 : 0, max: 1, raspuns_corect: "si-cri-e-le" },
    x2: { raspuns: b, corect: b === "2", puncte: b === "2" ? 1 : 0, max: 1, raspuns_corect: "metaforă" },
    x3: { raspuns: c, corect: c === "2", puncte: c === "2" ? 1 : 0, max: 1, raspuns_corect: "2" },
    x4: { raspuns: "În prima strofă, eul liric este singur într-un cavou...", corect: d === 3, puncte: d, max: 3, comentariu: com } });
  const lucrare = (id, elev, r) => {
    const p = Object.values(r).reduce((s, x) => s + x.puncte, 0);
    return { id, tema_id: "t1", elev_id: elev, status: "corectat", rezultate: r, punctaj: p, punctaj_max: 6, procent: Math.round(p / 6 * 100),
      nota: Math.max(1, Math.round(p / 6 * 100) / 10), trimis_la: acum, feedback: { rezumat: "Ai înțeles atmosfera poeziei; lucrează la argumentare și la punctuație." } };
  };
  if (rol === "profesor") {
    S.user = { id: "demo-p" }; S.profil = { rol: "profesor", nume: "Prof. Popescu (exemplu)" };
    S.clase = [{ id: "c1", nume: "a X-a A — Română", cod: "K7M2QX" }, { id: "c2", nume: "a IX-a B — Română", cod: "QW3RT8" }]; S.clasaSel = "c1";
    S.membri = ["Ana", "Mihai", "Ioana", "David", "Elena"].map((n, i) => ({ elev_id: "e" + i, profiles: { nume: n + " (exemplu)", avatar: "a" + (i * 3 % 8 + 1) } }));
    S.teme = [{ id: "t1", clasa_id: "c1", titlu: "„Plumb” de George Bacovia", cerinta: DEMO_POEZIE, termen: "2026-11-20", elevii_vad: true, creat_la: acum },
      { id: "t0", clasa_id: "c1", titlu: "Ortograma „s-a / sa”", cerinta: "", termen: "2026-11-05", elevii_vad: true, creat_la: "2026-11-01T10:00:00Z" },
      { id: "tm", clasa_id: "c1", titlu: "Sinonime și antonime", cerinta: "", termen: "2026-10-28", elevii_vad: true, creat_la: "2026-10-20T10:00:00Z" }];
    S.exercitii = ex.concat([{ id: "y1", tema_id: "t0", ordine: 1, enunt: "Completează: Ion ___ dus.", tip: "text", variante: [], puncte: 1 },
      { id: "z1", tema_id: "tm", ordine: 1, enunt: "Un sinonim pentru „vestmânt”.", tip: "text", variante: [], puncte: 1 }]);
    const simpla = (id, tema, elev, nota) => ({ id, tema_id: tema, elev_id: elev, status: "corectat", nota, punctaj: nota / 10, punctaj_max: 1, procent: nota * 10, trimis_la: "2026-11-02T10:00:00Z", rezultate: {} });
    S.predariVechi = [simpla("o0", "t0", "e0", 9), simpla("o1", "t0", "e1", 6), simpla("o2", "t0", "e2", 7), simpla("o3", "t0", "e3", 4), simpla("o4", "t0", "e4", 8),
      simpla("m0", "tm", "e0", 8), simpla("m1", "tm", "e1", 5), simpla("m2", "tm", "e2", 9), simpla("m3", "tm", "e3", 3), simpla("m4", "tm", "e4", 10)];
    S.clasament = [["Ana", 0, 520], ["Ioana", 2, 440], ["Elena", 4, 390], ["Mihai", 1, 350], ["David", 3, 210]]
      .map(([n, i, xp]) => ({ elev_id: "e" + i, nume: n + " (exemplu)", avatar: "a" + (i * 3 % 8 + 1), xp, teme: 3, media: [9, 6.5, 7.3, 3.8, 9][i], eu: false }));
    S.corecte = [{ exercitiu_id: "x1", tema_id: "t1", raspuns: "si-cri-e-le" }, { exercitiu_id: "x2", tema_id: "t1", raspuns: "2" },
      { exercitiu_id: "x3", tema_id: "t1", raspuns: "2" }, { exercitiu_id: "x4", tema_id: "t1", raspuns: "Conținut 2p: tema morții, simbolul plumbului. Redactare 1p." }];
    S.predari = [
      lucrare("a", "e0", rez("si-cri-e-le", "2", "2", 3, "Foarte bine: ai explicat simbolul plumbului.")),
      Object.assign(lucrare("b", "e1", rez("sic-rie-le", "2", "2", 2, "Corect, dar scrie „s-a dus”, nu „sa dus”, și pune virgulă înainte de „dar”.")), { comentariu_profesor: "Ai idei bune. Lucrează la ortograme până data viitoare." }),
      lucrare("c", "e2", rez("si-cri-e-le", "0", "2", 1.5, "Ai rezumat strofa în loc s-o comentezi; spune ce sugerează cuvântul „plumb”.")),
      lucrare("d", "e3", rez("si-cri-e-le", "2", "8", 0.5, "Răspunsul e prea scurt (30 de cuvinte) și nu se referă la text."))].concat(S.predariVechi);
    S.predari.find(p => p.id === "c").rezultate.x4.sigur = false; // un exemplu pentru lista „De verificat”
    S.mesaje = [{ id: "m1", tema_id: "t1", elev_id: "e1", autor_id: "e1", text: "Doamna profesoară, la exercițiul 4 trebuie să comentez doar prima strofă sau toată poezia?", creat_la: "2026-11-12T15:20:00Z" }];
    S.open = { b: true };
  } else {
    S.user = { id: "demo-e" }; S.profil = { rol: "elev", nume: "Ana Ionescu (exemplu)", avatar: "a3" };
    S.mesaje = [{ id: "m1", tema_id: "t1", elev_id: "demo-e", autor_id: "demo-e", text: "La exercițiul 4 comentez doar prima strofă?", creat_la: "2026-11-12T15:20:00Z" },
      { id: "m2", tema_id: "t1", elev_id: "demo-e", autor_id: "demo-p", text: "Da, doar prima strofă, dar poți face legături cu restul poeziei.", creat_la: "2026-11-12T16:05:00Z" }];
    S.claseElev = [{ id: "c1", nume: "a X-a A — Română" }];
    S.clasamente = { c1: [["Ioana", 440, "a4"], ["Elena", 390, "a6"], ["Mihai", 350, "a2"], ["Ana Ionescu", 30, "a3", true], ["David", 210, "a8"]]
      .map(([n, xp, av, eu], i) => ({ elev_id: "e" + i, nume: n + " (exemplu)", avatar: av, xp, teme: eu ? 1 : 3, media: eu ? 5 : [8.7, 7.9, 6.4, 0, 5.2][i], eu: !!eu }))
      .sort((a, b) => b.xp - a.xp) };
    S.temeElev = [{ id: "t1", clasa_id: "c1", titlu: "„Plumb” de George Bacovia", cerinta: DEMO_POEZIE, termen: "2026-11-20", exercitii: ex, creat_la: acum },
      { id: "t2", clasa_id: "c1", titlu: "Ortograma „s-a / sa”", cerinta: "", exercitii: ex2, creat_la: acum }];
    S.predariElev = [{ id: "z", tema_id: "t2", status: "corectat", nota: 5, punctaj: 1, punctaj_max: 2, procent: 50, trimis_la: acum, incercare: 1,
      comentariu_profesor: "Bine la prima propoziție! La a doua, „sa” nu are cratimă: e adjectiv posesiv („cartea sa”). Folosește a doua încercare.",
      rezultate: { y1: { raspuns: "s-a", corect: true, puncte: 1, max: 1 }, y2: { raspuns: "s-a", corect: false, puncte: 0, max: 1, raspuns_corect: "sa" } } }];
  }
  demoExtra(rol);
  draw(); window.scrollTo(0, 0);
  toast("Demonstrație cu date de exemplu: poți apăsa peste tot, dar nimic nu se salvează.");
}

function demoBox() {
  return h("div", { class: "sheet stack auth-demo" },
    h("div", null, h("h3", null, "Vrei doar să vezi cum arată?"),
      h("p", { class: "muted small" }, "Deschide o demonstrație cu date de exemplu. Merge și fără internet, iar nimic nu se salvează.")),
    h("div", { class: "row" },
      h("button", { class: "btn ghost", type: "button", onclick: () => pornesteDemo("profesor") }, "Demonstrație: profesor"),
      h("button", { class: "btn ghost", type: "button", onclick: () => pornesteDemo("elev") }, "Demonstrație: elev")));
}

/* ---------------- pornire și autentificare ---------------- */
/* aplicația se poate instala pe telefon (funcționează pe https, de ex. pe Netlify) */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => { /* fără instalare */ }));
}

async function start() {
  const c = window.CONFIG || {};
  if (!navigator.onLine && !/^#demo/.test(location.hash) && !new URLSearchParams(location.search).get("parinte")) { pornesteOffline(); return; }
  if (!window.supabase || !c.SUPABASE_URL || /PROIECTUL-TAU/.test(c.SUPABASE_URL)) {
    S.fatal = "Site-ul nu e încă legat de baza de date. Completează config.js cu adresa și cheia publică a proiectului Supabase (vezi GHID.md)."; S.loading = false; draw(); return;
  }
  S.sb = S.sbReal = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_KEY);
  // pagina pentru părinți: ?parinte=<cod>, fără cont
  const parinte = new URLSearchParams(location.search).get("parinte");
  if (parinte) { S.loading = false; ascundeIncarcare(); document.getElementById("intro")?.remove(); paginaParinte(parinte); return; }
  if (location.hash === "#demo-profesor" || location.hash === "#demo-elev") { S.loading = false; pornesteDemo(location.hash.slice(6)); return; }
  const { data } = await S.sb.auth.getSession();
  await laSchimbareSesiune(data.session);
  S.sb.auth.onAuthStateChange((ev, session) => {
    if (ev === "PASSWORD_RECOVERY") { S.parolaNoua = true; setTimeout(() => render(), 0); }
    if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") setTimeout(() => laSchimbareSesiune(session), 0);
  });
  window.addEventListener("focus", () => { if (S.profil) reincarca(); });
}

async function laSchimbareSesiune(session) {
  const uid = session && session.user ? session.user.id : null;
  if (uid && S.user && S.user.id === uid && S.profil) return;
  S.user = session ? session.user : null; S.profil = null;
  if (S.user) {
    let { data } = await S.sb.from("profiles").select("*").eq("id", S.user.id).maybeSingle();
    if (!data) { await new Promise(r => setTimeout(r, 800)); ({ data } = await S.sb.from("profiles").select("*").eq("id", S.user.id).maybeSingle()); }
    S.profil = data;
    if (!data) S.fatal = "Profilul contului nu a fost găsit. Verifică dacă ai rulat schema.sql în Supabase.";
    else { tinMinteProfil(); await reincarca(); }
  }
  S.loading = false; render();
}

async function reincarca() {
  if (S.demo) { render(); return; }
  try {
    if (S.profil.rol === "profesor") await incarcaProfesor(); else await incarcaElev();
  } catch (e) { console.error(e); toast("Datele nu au putut fi încărcate. Încearcă din nou."); }
  render();
}

function drawAuth() {
  const d = S.drafts.auth || (S.drafts.auth = { nume: "", email: "", parola: "" });
  const nou = S.authMode === "nou";
  const inp = (k, attrs) => h("input", { ...attrs, value: d[k], oninput: e => d[k] = e.target.value });
  return h("form", { class: "sheet stack auth", onsubmit: async e => {
      e.preventDefault();
      if (S.authBusy) return;
      if (nou && !d.nume.trim()) { toast("Scrie-ți numele."); return; }
      S.authBusy = true; render();
      try {
        if (nou) {
          const { data, error } = await S.sb.auth.signUp({ email: d.email.trim(), password: d.parola, options: { data: { nume: d.nume.trim(), rol: S.authRol } } });
          if (error) throw error;
          if (!data.session) toast("Contul a fost creat. Confirmă adresa din emailul primit, apoi intră în cont.");
        } else {
          const { error } = await S.sb.auth.signInWithPassword({ email: d.email.trim(), password: d.parola });
          if (error) throw error;
        }
        S.drafts.auth = null;
      } catch (err) { toast(eroareDb(err, "Nu am putut intra în cont. Încearcă din nou.")); }
      finally { S.authBusy = false; render(); }
    } },
    h("div", { class: "seg" },
      h("button", { type: "button", class: !nou ? "on" : "", onclick: () => { S.authMode = "intra"; render(); } }, "Intră în cont"),
      h("button", { type: "button", class: nou ? "on" : "", onclick: () => { S.authMode = "nou"; render(); } }, "Cont nou")),
    nou ? h("label", { class: "f", for: "a-nume" }, "Nume și prenume", inp("nume", { type: "text", id: "a-nume", autocomplete: "name", placeholder: "Ex.: Ana Popescu" })) : null,
    h("label", { class: "f", for: "a-email" }, "Email", inp("email", { type: "email", id: "a-email", autocomplete: "email", required: true })),
    h("label", { class: "f", for: "a-parola" }, "Parolă", inp("parola", { type: "password", id: "a-parola", autocomplete: nou ? "new-password" : "current-password", required: true, minlength: "6" })),
    nou ? h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "label" }, "Sunt"),
      h("div", { class: "seg" },
        h("button", { type: "button", class: S.authRol === "elev" ? "on" : "", onclick: () => { S.authRol = "elev"; render(); } }, "Elev"),
        h("button", { type: "button", class: S.authRol === "profesor" ? "on" : "", onclick: () => { S.authRol = "profesor"; render(); } }, "Profesor"))) : null,
    h("button", { class: "btn", type: "submit", disabled: S.authBusy }, S.authBusy ? "Se încarcă…" : nou ? "Creează contul" : "Intră"),
    !nou ? h("button", { type: "button", class: "link-btn", onclick: () => { S.authMode = "reset"; render(); } }, "Ai uitat parola?") : null);
}

/* ---------------- parolă uitată ---------------- */
function formResetare() {
  const d = S.drafts.auth || (S.drafts.auth = { nume: "", email: "", parola: "" });
  return h("form", { class: "sheet stack auth", onsubmit: async e => {
      e.preventDefault();
      if (!d.email.trim()) { toast("Scrie adresa de email a contului."); return; }
      if (S.demo || !S.sb) { toast("Aceasta e o demonstrație: nu se trimite niciun email."); return; }
      S.authBusy = true; render();
      const { error } = await S.sb.auth.resetPasswordForEmail(d.email.trim(), { redirectTo: location.href.split("#")[0] });
      S.authBusy = false;
      toast(error ? eroareDb(error, "Emailul nu a putut fi trimis. Încearcă din nou peste câteva minute.") : "Ți-am trimis un email cu linkul pentru parola nouă.");
      if (!error) S.authMode = "intra";
      render();
    } },
    h("h3", null, "Parolă nouă"),
    h("p", { class: "muted small" }, "Scrie adresa contului. Primești un email cu un link; îl deschizi și alegi o parolă nouă."),
    h("label", { class: "f", for: "r-email" }, "Email", h("input", { type: "email", id: "r-email", value: d.email, required: true, oninput: e => d.email = e.target.value })),
    h("button", { class: "btn", type: "submit", disabled: S.authBusy }, S.authBusy ? "Se trimite…" : "Trimite linkul"),
    h("button", { type: "button", class: "link-btn", onclick: () => { S.authMode = "intra"; render(); } }, "Înapoi la intrare"));
}
function formParolaNoua() {
  const d = S.drafts.pn || (S.drafts.pn = { p1: "", p2: "" });
  return h("form", { class: "sheet stack auth", onsubmit: async e => {
      e.preventDefault();
      if (d.p1.length < 6) { toast("Parola trebuie să aibă cel puțin 6 caractere."); return; }
      if (d.p1 !== d.p2) { toast("Cele două parole nu sunt la fel."); return; }
      const { error } = await S.sb.auth.updateUser({ password: d.p1 });
      if (error) { toast(eroareDb(error, "Parola nu a putut fi schimbată.")); return; }
      S.parolaNoua = false; S.drafts.pn = null; toast("Parola a fost schimbată."); reincarca();
    } },
    h("h3", null, "Alege o parolă nouă"),
    h("label", { class: "f", for: "pn1" }, "Parola nouă", h("input", { type: "password", id: "pn1", autocomplete: "new-password", minlength: "6", value: d.p1, oninput: e => d.p1 = e.target.value })),
    h("label", { class: "f", for: "pn2" }, "Scrie-o din nou", h("input", { type: "password", id: "pn2", autocomplete: "new-password", minlength: "6", value: d.p2, oninput: e => d.p2 = e.target.value })),
    h("button", { class: "btn", type: "submit" }, "Salvează parola"));
}

function drawRole() {
  const r = document.getElementById("role"); r.replaceChildren();
  const pal = citesteLocal("paleta", "galaxie");
  r.append(
    h("div", { class: "palete", role: "group", "aria-label": "Culorile site-ului" }, Object.entries(PALETE).map(([k, v]) =>
      h("button", { class: "paleta-btn" + (k === (document.documentElement.dataset.paleta || pal) ? " on" : ""), "data-p": k, title: v, "aria-label": "Culori: " + v,
        onclick: () => { aplicaPaleta(k); sunetClic(); drawRole(); } }))),
    h("button", { class: "btn ghost sunet-btn", title: sunet ? "Oprește sunetele" : "Pornește sunetele", "aria-label": sunet ? "Oprește sunetele" : "Pornește sunetele",
      onclick: () => { sunet = !sunet; scrieLocal("sunet", sunet ? "da" : "nu"); if (sunet) sunetClic(); drawRole(); } }, sunet ? "♪" : "♪̸"));
  if (!S.profil) return;
  const prof = S.profil.rol === "profesor";
  if (S.demo) r.append(h("span", { class: "chip wait" }, "Demonstrație"));
  r.append(clopotel());
  r.append(avatar(S.profil.avatar, S.profil.nume, 30), h("span", { class: "muted small" }, S.profil.nume),
    h("span", { class: "badge" + (prof ? " prof" : "") }, prof ? "Profesor" : "Elev"),
    h("button", { class: "btn ghost", onclick: () => S.sb.auth.signOut() }, "Ieși"));
}

function draw() {
  drawRole();
  const app = document.getElementById("app");
  if (S.loading) { app.replaceChildren(scheletIncarcare()); return; }
  ascundeIncarcare();
  if (S.fatal) { app.replaceChildren(h("div", { class: "sheet empty" }, h("h2", null, "Caietul nu se poate deschide"), h("p", { class: "muted" }, S.fatal)), demoBox()); return; }
  if (S.parolaNoua) { app.replaceChildren(formParolaNoua()); return; }
  if (!S.user || !S.profil) {
    const scena = erou();
    app.replaceChildren(h("div", { class: "intrare" }, scena, h("div", { class: "stack" }, S.authMode === "reset" ? formResetare() : drawAuth(), demoBox())));
    return;
  }
  app.replaceChildren(...(S.profil.rol === "profesor" ? drawProfesor() : drawElev()));
  // tranziție când se schimbă pagina (alt rol sau altă clasă), nu la fiecare re-desenare
  const cheie = S.profil.rol + "|" + (S.clasaSel || "") + "|" + S.pag + "|" + (S.pagId || "");
  if (cheie !== S.ultimaCheie) { S.ultimaCheie = cheie; app.classList.remove("intra"); void app.offsetWidth; app.classList.add("intra"); }
}

/* ---------------- comun ---------------- */
function statusChip(p, busy) {
  if (busy) return h("span", { class: "chip wait" }, h("span", { class: "spin" }), "Se corectează");
  if (!p) return h("span", { class: "chip none" }, "Netrimisă");
  if (p.status === "partial") return h("span", { class: "chip wait" }, "Așteaptă corectarea răspunsurilor libere");
  if (p.status === "corectat") return h("span", { class: "chip ok" }, "Corectată");
  return h("span", { class: "chip none" }, "Trimisă");
}

function notaBox(p) {
  const fin = notaFinala(p);
  return h("div", { class: "row" },
    inel(h("span", { class: "nota" + (fin != null && fin < 5 ? " fail" : "") }, fin == null ? "…" : fmtNota(fin)), fin != null ? fin * 10 : p.procent),
    h("div", null,
      h("div", { class: "label" }, p.nota_profesor != null ? "Nota dată de profesor" : fin == null ? "Nota apare după corectarea tuturor exercițiilor" : "Nota calculată automat"),
      h("div", { class: "muted small" }, `Punctaj: ${fmtNr(p.punctaj)} din ${fmtNr(p.punctaj_max)}` + (p.procent != null ? ` (${p.procent}%)` : ""))));
}

/* Lista de exerciții cu rezultatul fiecăruia. `editabil` = profesorul poate schimba punctajul. */
function rezultateView(p, exercitii, editabil, corecte) {
  const rez = p.rezultate || {};
  const box = h("div", { class: "stack", style: "gap:10px" });
  if (p.feedback && p.feedback.rezumat) box.append(h("p", null, p.feedback.rezumat));
  if (p.eroare && p.status === "partial") box.append(h("div", { class: "note" }, p.eroare));
  exercitii.forEach((ex, i) => {
    const r = rez[ex.id] || {};
    const pts = typeof r.puncte === "number" ? r.puncte : null;
    const stare = pts == null ? h("span", { class: "chip wait" }, "Necorectat")
      : r.corect ? h("span", { class: "chip ok" }, "Corect") : pts > 0 ? h("span", { class: "chip wait" }, "Parțial") : h("span", { class: "chip err" }, "Greșit");
    let raspunsAfisat = r.raspuns || "";
    if (ex.tip === "grila" && raspunsAfisat !== "") raspunsAfisat = ex.variante[Number(raspunsAfisat)] ?? raspunsAfisat;
    const corect = corecte ? corecte.find(c => c.exercitiu_id === ex.id) : null;
    let corectText = r.raspuns_corect;
    if (corect && corect.raspuns) corectText = ex.tip === "grila" ? ex.variante[Number(corect.raspuns)] : corect.raspuns.split("|").join(" sau ");
    // efectul (strălucire / scuturare) se vede o singură dată pentru fiecare lucrare
    const efect = !(S.animate || (S.animate = new Set())).has(p.id) && pts != null ? (r.corect ? " efect bun" : pts === 0 ? " efect rau" : "") : "";
    const row = h("div", { class: "mistake" + efect, style: `border-left-color:var(${pts == null ? "--warn" : r.corect ? "--good" : "--bad"});animation-delay:${i * 0.12}s` },
      h("div", { class: "row", style: "justify-content:space-between" },
        h("strong", null, `${i + 1}. ${ex.enunt}`),
        h("div", { class: "row" }, stare, h("span", { class: "nota" }, `${pts == null ? "?" : fmtNr(pts)}/${fmtNr(ex.puncte)}p`))),
      h("div", { class: "small" }, h("span", { class: "muted" }, "Răspuns: "), raspunsAfisat ? h("span", { class: "pre" }, raspunsAfisat) : h("em", { class: "muted" }, "(gol)")),
      corectText && !r.corect ? h("div", { class: "small" }, h("span", { class: "muted" }, ex.tip === "liber" ? "Răspuns model: " : "Corect: "), h("span", { class: "pre" }, corectText)) : null,
      r.comentariu ? h("div", { class: "small", style: "margin-top:2px" }, r.comentariu) : null,
      Array.isArray(r.imagini) && r.imagini.length ? imaginiView(r.imagini) : null,
      Array.isArray(r.imagini_local) && r.imagini_local.length ? h("div", { class: "poze" }, r.imagini_local.map(u => h("img", { src: u, alt: "Pagină din caiet" }))) : null,
      editabil && r.sigur === false ? h("div", { class: "chip wait", style: "margin-top:6px" }, "AI-ul nu e sigur de punctaj: verifică") : null,
      !editabil && pts != null && !r.corect ? explicaView(p, ex, r, raspunsAfisat, corectText) : null);
    if (editabil) {
      const nid = `pt-${p.id}-${ex.id}`;
      const inp = h("input", { type: "number", id: nid, min: "0", max: String(ex.puncte), step: "0.25", style: "width:80px",
        value: S.drafts[nid] ?? (pts ?? ""), oninput: e => S.drafts[nid] = e.target.value });
      row.append(h("div", { class: "row small", style: "margin-top:6px" },
        h("label", { class: "row", for: nid }, "Punctaj:", inp),
        h("button", { class: "btn ghost", type: "button", onclick: async () => {
          const v = Number(String(S.drafts[nid] ?? inp.value).replace(",", "."));
          if (!isFinite(v) || v < 0) { toast("Scrie un punctaj valid."); return; }
          const { error } = await S.sb.rpc("seteaza_puncte", { p_predare: p.id, p_exercitiu: ex.id, p_puncte: v, p_comentariu: null });
          if (error) { toast(eroareDb(error, "Punctajul nu a putut fi salvat.")); return; }
          delete S.drafts[nid]; toast("Punctajul a fost salvat."); reincarca();
        } }, "Salvează")));
    }
    box.append(row);
  });
  S.animate.add(p.id);
  return box;
}

async function cereCorectareAI(predareId, refa) {
  const { error } = await S.sb.functions.invoke("corecteaza", { body: { predare_id: predareId, refa: !!refa } });
  if (error) {
    let mesaj = "Corectarea cu AI nu a reușit.";
    try { const j = await error.context.json(); if (j && j.eroare) mesaj = j.eroare; } catch { /* fără JSON */ }
    if (error.name === "FunctionsFetchError") mesaj = "Funcția de corectare nu răspunde. Răspunsurile libere le va corecta profesorul.";
    throw new Error(mesaj);
  }
}

/* ---------------- elev ---------------- */
async function incarcaElev() {
  const [m, t, p] = await Promise.all([
    S.sb.from("membri").select("clasa_id, grupa, clase(id, nume, anunt, anunt_la)").eq("elev_id", S.user.id),
    S.sb.from("teme").select("*, exercitii(*)").order("creat_la", { ascending: false }),
    S.sb.from("predari").select("*").eq("elev_id", S.user.id),
  ]);
  if (m.error || t.error || p.error) throw m.error || t.error || p.error;
  S.claseElev = (m.data || []).map(x => x.clase).filter(Boolean);
  // temele date doar unei grupe (de ex. „uman”) le văd doar elevii din grupa respectivă
  const grupaMea = Object.fromEntries((m.data || []).map(x => [x.clasa_id, x.grupa]));
  S.temeElev = (t.data || []).filter(x => !x.grupa || x.grupa === grupaMea[x.clasa_id])
    .map(x => ({ ...x, exercitii: (x.exercitii || []).sort((a, b) => a.ordine - b.ordine) }));
  S.predariElev = p.data || [];
  const ci = await S.sb.from("ciorne").select("tema_id, raspunsuri").eq("elev_id", S.user.id);
  S.ciorne = Object.fromEntries((ci.data || []).map(c => [c.tema_id, c.raspunsuri]));
  const ms = await S.sb.from("mesaje").select("*").eq("elev_id", S.user.id).order("creat_la");
  S.mesaje = ms.data || [];
  S.clasamente = {};
  await Promise.all(S.claseElev.map(async c => {
    const { data } = await S.sb.rpc("clasament", { p_clasa: c.id });
    S.clasamente[c.id] = data || [];
  }));
}

/* Gamificare: puncte XP din punctajele obținute, nivel și insigne. */
function profilElev() {
  const lucrari = S.predariElev;
  const corectate = lucrari.filter(p => notaFinala(p) != null);
  const xp = Math.round(lucrari.reduce((s, p) => s + Number(p.punctaj || 0), 0) * 10 + lucrari.length * 20);
  const PE_NIVEL = 100, nivel = Math.floor(xp / PE_NIVEL) + 1, inNivel = xp % PE_NIVEL;
  const note = corectate.map(notaFinala);
  const media = note.length ? note.reduce((a, b) => a + b, 0) / note.length : null;
  const libereFull = lucrari.some(p => Object.values(p.rezultate || {}).some(r => r.max >= 2 && r.puncte === r.max));
  const fara = lucrari.some(p => { const r = Object.values(p.rezultate || {}); return r.length && r.every(x => x.corect); });
  const insigne = [
    { n: "Prima temă", i: "1", ok: lucrari.length >= 1, c: CULORI[3] },
    { n: "Nota 10", i: "10", ok: note.some(n => n >= 10), c: CULORI[1] },
    { n: "Fără nicio greșeală", i: "✓", ok: fara, c: CULORI[2] },
    { n: "Condei de aur", i: "✎", ok: libereFull, c: CULORI[4] },
    { n: "5 teme", i: "5", ok: lucrari.length >= 5, c: CULORI[0] },
  ];
  const ramase = S.temeElev.filter(t => !lucrari.some(p => p.tema_id === t.id)).length;
  // locul în clasament (prima clasă) și seria de teme trimise la timp
  const lista = Object.values(S.clasamente || {})[0] || [];
  const loc = lista.findIndex(r => r.eu) + 1;
  const laTimp = [...S.temeElev].filter(t => t.termen).sort((a, b) => a.termen.localeCompare(b.termen))
    .reduce((serie, t) => { const p = lucrari.find(x => x.tema_id === t.id); return p && p.trimis_la.slice(0, 10) <= t.termen ? serie + 1 : (new Date(t.termen) < new Date() ? 0 : serie); }, 0);
  insigne.push({ n: `Serie la timp: ${laTimp}`, i: "⚡", ok: laTimp >= 2, c: CULORI[2] });
  const alegere = S.alegAvatar ? h("div", { class: "alege-avatar" }, ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"].map(cod =>
    h("button", { type: "button", class: "av-opt" + (S.profil.avatar === cod ? " on" : ""), "aria-label": "Alege avatarul " + cod.slice(1), onclick: async () => {
      const vechi = S.profil.avatar; S.profil.avatar = cod; S.alegAvatar = false; sunetClic(); render();
      if (!S.demo) {
        const { error } = await S.sb.from("profiles").update({ avatar: cod }).eq("id", S.user.id);
        if (error) { S.profil.avatar = vechi; toast("Avatarul nu a putut fi salvat."); render(); }
      }
    } }, avatar(cod, S.profil.nume, 44)))) : null;
  return h("div", { class: "sheet profil-elev" },
    h("div", { class: "stack", style: "gap:10px;align-items:center" },
      h("button", { type: "button", class: "av-mare", title: "Schimbă avatarul", "aria-label": "Schimbă avatarul", onclick: () => { S.alegAvatar = !S.alegAvatar; render(); } },
        avatar(S.profil.avatar, S.profil.nume, 72), h("span", { class: "nivel-mic" }, "Nv. " + nivel))),
    h("div", null,
      alegere,
      h("div", { class: "row", style: "justify-content:space-between" },
        h("h3", null, `Salut, ${(S.profil.nume || "").split(" ")[0] || "elevule"}!` + (loc ? ` Ești pe locul ${loc} din ${lista.length}.` : "")),
        h("span", { class: "muted small" }, `${xp} XP · încă ${PE_NIVEL - inNivel} XP până la nivelul ${nivel + 1}`)),
      h("div", { class: "xp", role: "progressbar", "aria-valuenow": inNivel, "aria-valuemin": 0, "aria-valuemax": PE_NIVEL },
        h("span", { style: `width:${inNivel}%` })),
      h("div", { class: "row small muted", style: "margin-top:8px;gap:16px" },
        h("span", null, `Media: `, h("b", { style: "color:var(--text)" }, media == null ? "–" : fmtNota(media))),
        h("span", null, `Teme trimise: `, h("b", { style: "color:var(--text)" }, lucrari.length)),
        h("span", null, `De făcut: `, h("b", { style: `color:${ramase ? "var(--c2)" : "var(--c3)"}` }, ramase))),
      h("div", { class: "insigne" }, insigne.map(b => {
        const el = h("span", { class: "insigna" + (b.ok ? "" : " blocata"), title: b.ok ? "Obținută" : "Încă neobținută" }, h("i", null, b.i), b.n);
        el.style.setProperty("--ic", b.c);
        return el;
      })),
      linkParintiView()));
}

function cardElev(t, p, clasa) {
  const busy = S.busy[t.id];
  const card = h("section", { class: "sheet stack" },
    h("div", { class: "tema-head" },
      h("div", null, h("h2", null, t.titlu),
        h("div", { class: "meta" }, h("span", null, clasa), t.termen ? h("span", null, "Termen: " + fmtZi(t.termen)) : null,
          h("span", null, `${t.exercitii.length} exerciții`), p ? h("span", null, "Trimisă " + fmtData(p.trimis_la)) : null)),
      statusChip(p, busy)),
    t.cerinta ? textSuport(t.cerinta) : null);

  if (busy) { card.append(h("div", { class: "row muted" }, h("span", { class: "spin" }), busy)); return card; }
  const reia = (S.reia || {})[t.id];
  if (p && !reia) {
    if (p.prima) card.append(h("div", { class: "note", style: "background:rgba(76,201,240,.1);color:var(--c4);border-color:rgba(76,201,240,.3)" },
      `A doua încercare. La prima ai luat ${fmtNota(p.prima.nota)}; ` + (notaFinala(p) != null ? (notaFinala(p) > p.prima.nota ? `acum ai urcat la ${fmtNota(notaFinala(p))}. Bravo!` : `acum ai ${fmtNota(notaFinala(p))}.`) : "se corectează.")));
    card.append(notaBox(p));
    if (p.comentariu_profesor) card.append(h("div", { class: "comentariu-prof" }, h("div", { class: "label" }, "Comentariul profesorului"), h("p", { class: "pre" }, p.comentariu_profesor)));
    card.append(rezultateView(p, t.exercitii, false, null));
    const areLibereNecorectate = t.exercitii.some(ex => ex.tip === "liber" && typeof (p.rezultate || {})[ex.id]?.puncte !== "number");
    const butoane = h("div", { class: "row" });
    if (areLibereNecorectate) butoane.append(h("button", { class: "btn ghost", onclick: () => corecteazaElev(t, p.id) }, "Încearcă din nou corectarea automată"));
    if (t.a_doua_incercare !== false && (p.incercare || 1) === 1 && notaFinala(p) != null && notaFinala(p) < 10)
      butoane.append(h("button", { class: "btn", onclick: () => {
        (S.reia || (S.reia = {}))[t.id] = true;
        // pornești de la răspunsurile tale, ca să le îmbunătățești
        const R = S.raspunsuri[t.id] = {};
        for (const ex of t.exercitii) R[ex.id] = (p.rezultate || {})[ex.id]?.raspuns ?? "";
        sunetClic(); render();
      } }, "Îmbunătățește lucrarea (a doua încercare)"));
    if (butoane.childNodes.length) card.append(butoane);
    return card;
  }
  if (reia) card.append(h("div", { class: "note", style: "background:rgba(76,201,240,.1);color:var(--c4);border-color:rgba(76,201,240,.3)" },
    "A doua încercare: pornești de la răspunsurile tale. Citește corecturile, îmbunătățește și trimite din nou. Rămâne nota nouă."));
  card.append(formularRaspunsuri(t));
  return card;
}

function formularRaspunsuri(t) {
  if (!S.raspunsuri[t.id]) {
    // ciorna salvată (din browser; cea din baza de date se încarcă odată cu temele)
    let ciorna = {};
    try { ciorna = JSON.parse(citesteLocal("ciorna-" + t.id, "") || "{}"); } catch { ciorna = {}; }
    S.raspunsuri[t.id] = { ...((S.ciorne || {})[t.id] || {}), ...ciorna };
  }
  const R = S.raspunsuri[t.id];
  const schimba = (k, v) => { R[k] = v; salveazaCiorna(t.id); };
  const items = t.exercitii.map((ex, i) => {
    const id = `r-${ex.id}`;
    let camp;
    if (ex.tip === "grila") {
      camp = h("div", { class: "stack", style: "gap:4px" }, ex.variante.map((v, k) =>
        h("label", { class: "row optiune", style: "gap:10px;cursor:pointer" },
          h("input", { type: "radio", name: id, value: String(k), checked: R[ex.id] === String(k), onchange: () => schimba(ex.id, String(k)) }),
          h("span", null, `${String.fromCharCode(97 + k)}) ${v}`))));
    } else if (ex.tip === "liber") {
      const cuvinte = s => (String(s || "").trim().match(/\S+/g) || []).length;
      const nr = h("span", { class: "muted small" }, `${cuvinte(R[ex.id])} cuvinte`);
      const poze = pozeDe(t.id, ex.id);
      const inp = h("input", { type: "file", accept: "image/*", capture: "environment", multiple: true, hidden: true,
        onchange: e => { adaugaPoze(t.id, ex.id, [...e.target.files]); e.target.value = ""; } });
      camp = h("div", { class: "stack", style: "gap:6px" },
        h("textarea", { id, value: R[ex.id] || "", style: "min-height:140px", maxlength: "20000", placeholder: "Scrie rezolvarea aici sau fotografiază pagina din caiet…",
          oninput: e => { schimba(ex.id, e.target.value); nr.textContent = `${cuvinte(e.target.value)} cuvinte`; } }),
        h("div", { class: "row", style: "justify-content:space-between" }, nr,
          h("button", { type: "button", class: "btn ghost", onclick: () => inp.click() }, poze.length ? `Adaugă încă o poză (${poze.length}/4)` : "Fotografiază caietul"), inp),
        poze.length ? h("div", { class: "poze" }, poze.map((p, k) => h("span", { class: "poza" },
          h("img", { src: p.url, alt: `Pagina ${k + 1} din caiet` }),
          h("button", { type: "button", "aria-label": "Scoate poza", onclick: () => { poze.splice(k, 1); render(); } }, "×")))) : null);
    } else {
      camp = h("input", { type: "text", id, value: R[ex.id] || "", inputmode: ex.tip === "numar" ? "decimal" : null,
        placeholder: ex.tip === "numar" ? "Răspunsul (număr)" : "Răspunsul", oninput: e => schimba(ex.id, e.target.value) });
    }
    return h("div", { class: "stack", style: "gap:6px" },
      h("label", { for: ex.tip === "grila" ? null : id, class: "row", style: "justify-content:space-between" },
        h("strong", { class: "pre" }, `${i + 1}. ${ex.enunt}`), h("span", { class: "muted small" }, `${fmtNr(ex.puncte)}p`)),
      camp);
  });
  return h("form", { class: "stack", onsubmit: e => { e.preventDefault(); trimite(t); } },
    items,
    h("div", { class: "row", style: "justify-content:space-between" },
      h("span", { class: "muted small", id: "ciorna-" + t.id }, (S.ciornaSalvata || {})[t.id] ? "Ciornă salvată" : "Ciorna se salvează singură cât scrii."),
      h("span", { class: "muted small" }, t.a_doua_incercare !== false && !(S.reia || {})[t.id] ? "După corectare, poți îmbunătăți lucrarea o dată." : "")),
    h("div", null, h("button", { class: "btn", type: "submit" }, "Trimite răspunsurile")));
}

/* ---------------- poze cu lucrarea scrisă de mână ---------------- */
async function micsoreaza(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, nu) => c.toBlob(b => b ? ok(b) : nu(new Error("imagine")), "image/jpeg", 0.85));
}
function pozeDe(temaId, exId) { const t = S.poze || (S.poze = {}); const a = t[temaId] || (t[temaId] = {}); return a[exId] || (a[exId] = []); }
async function adaugaPoze(temaId, exId, fisiere) {
  const lista = pozeDe(temaId, exId);
  for (const f of fisiere) {
    if (lista.length >= 4) { toast("Cel mult 4 poze pentru un exercițiu."); break; }
    try { const blob = await micsoreaza(f); lista.push({ blob, url: URL.createObjectURL(blob) }); }
    catch { toast(`„${f.name}” nu e o poză pe care s-o pot citi. Folosește JPG sau PNG.`); }
  }
  salveazaCiorna(temaId);
  render();
}
/* pozele deja încărcate (din lucrări), cu linkuri temporare semnate */
function imaginiView(paths) {
  const lipsa = paths.filter(p => !(S.urls || (S.urls = {}))[p]);
  if (lipsa.length && !S.demo && !imaginiView.cer) {
    imaginiView.cer = true;
    S.sb.storage.from("lucrari").createSignedUrls(lipsa, 3600).then(({ data }) => {
      for (const x of data || []) if (x.signedUrl) S.urls[x.path] = x.signedUrl;
      imaginiView.cer = false; render();
    }, () => { imaginiView.cer = false; });
  }
  return h("div", { class: "poze" }, paths.map(p => S.urls[p]
    ? h("a", { href: S.urls[p], target: "_blank", rel: "noopener" }, h("img", { src: S.urls[p], alt: "Pagină din caiet", loading: "lazy" }))
    : h("span", { class: "chip none" }, "Se încarcă poza…")));
}

/* ---------------- ciorna: se salvează singură cât scrie elevul ---------------- */
function salveazaCiorna(temaId) {
  clearTimeout(salveazaCiorna.t[temaId]);
  salveazaCiorna.t[temaId] = setTimeout(async () => {
    const R = S.raspunsuri[temaId] || {};
    scrieLocal("ciorna-" + temaId, JSON.stringify(R));
    if (!S.demo && S.user) await S.sb.from("ciorne").upsert({ tema_id: temaId, elev_id: S.user.id, raspunsuri: R, actualizat: new Date().toISOString() });
    S.ciornaSalvata = S.ciornaSalvata || {}; S.ciornaSalvata[temaId] = new Date();
    const el = document.getElementById("ciorna-" + temaId);
    if (el) el.textContent = "Ciornă salvată la " + S.ciornaSalvata[temaId].toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  }, 1200);
}
salveazaCiorna.t = {};

async function trimite(t) {
  const R = { ...(S.raspunsuri[t.id] || {}) };
  const areRaspuns = ex => String(R[ex.id] ?? "").trim() || pozeDe(t.id, ex.id).length;
  if (!t.exercitii.some(areRaspuns)) { toast("Nu ai răspuns la niciun exercițiu."); return; }
  if (S.demo) { trimiteDemo(t, R); return; }
  S.busy[t.id] = "Se trimit răspunsurile…"; render();
  try {
    for (const ex of t.exercitii) {
      const poze = pozeDe(t.id, ex.id);
      if (!poze.length) continue;
      S.busy[t.id] = "Se încarcă pozele…"; render();
      const cai = [];
      for (const [i, p] of poze.entries()) {
        const cale = `${S.user.id}/${t.id}/${Date.now()}-${ex.id.slice(0, 8)}-${i}.jpg`;
        const { error } = await S.sb.storage.from("lucrari").upload(cale, p.blob, { contentType: "image/jpeg" });
        if (error) throw new Error("Pozele nu au putut fi încărcate. Încearcă din nou.");
        cai.push(cale);
      }
      R["img:" + ex.id] = cai;
    }
    S.busy[t.id] = "Se trimit răspunsurile…"; render();
    const { data: predareId, error } = await S.sb.rpc("trimite_raspunsuri", { p_tema: t.id, p_raspunsuri: R });
    if (error) throw new Error(eroareDb(error, "Răspunsurile nu au putut fi trimise. Încearcă din nou."));
    delete S.raspunsuri[t.id]; if (S.poze) delete S.poze[t.id]; delete (S.reia || {})[t.id];
    scrieLocal("ciorna-" + t.id, "");
    if (t.exercitii.some(ex => ex.tip === "liber")) {
      S.busy[t.id] = "Se corectează răspunsurile libere… poate dura un minut."; render();
      try { await cereCorectareAI(predareId); } catch (e) { toast(e.message); }
    }
    toast("Tema a fost trimisă și corectată.");
  } catch (e) { toast(e.message); }
  finally {
    delete S.busy[t.id]; await reincarca();
    const p = S.predariElev.find(x => x.tema_id === t.id);
    if (p && notaFinala(p) != null) sunetNota(notaFinala(p));
    if (p && notaFinala(p) >= 9) confetti();
  }
}

/* În demonstrație, corectarea se simulează în browser (fără bază de date, fără AI). */
const DEMO_CORECTE = { x1: "si-cri-e-le", x2: "2", x3: "2", y1: "s-a", y2: "sa" };
function trimiteDemo(t, R) {
  S.busy[t.id] = "Se corectează…"; render();
  setTimeout(() => {
    const rezultate = {}; let pct = 0, max = 0;
    for (const ex of t.exercitii) {
      const ans = String(R[ex.id] ?? "").trim(); max += ex.puncte;
      if (ex.tip === "liber") {
        const cuv = (ans.match(/\S+/g) || []).length, poze = pozeDe(t.id, ex.id);
        const pts = poze.length ? Math.round(ex.puncte * 0.8 * 2) / 2 : cuv >= 80 ? ex.puncte : cuv >= 30 ? Math.round(ex.puncte * 0.66 * 2) / 2 : cuv ? 0.5 : 0;
        rezultate[ex.id] = { raspuns: ans, puncte: pts, max: ex.puncte, corect: pts >= ex.puncte, sigur: !poze.length,
          imagini_local: poze.map(p => p.url),
          comentariu: poze.length ? `Am citit ${poze.length} pagină(i) din caiet. Idei bune; atenție la „s-a dus”, nu „sa dus”. (corectare simulată în demonstrație)`
            : cuv >= 80 ? "Comentariu bogat și bine organizat. (corectare simulată în demonstrație)" : `Ai scris ${cuv} cuvinte; cerința cere minimum 80. Dezvoltă ideile și dă exemple din text. (corectare simulată în demonstrație)` };
        pct += pts;
      } else {
        const ok = ex.tip === "numar" ? Number(ans.replace(",", ".")) === Number(DEMO_CORECTE[ex.id]) : ex.tip === "grila" ? ans === DEMO_CORECTE[ex.id] : ans.toLowerCase() === String(DEMO_CORECTE[ex.id]).toLowerCase();
        rezultate[ex.id] = { raspuns: ans, corect: ok, puncte: ok ? ex.puncte : 0, max: ex.puncte,
          raspuns_corect: ex.tip === "grila" ? ex.variante[Number(DEMO_CORECTE[ex.id])] : DEMO_CORECTE[ex.id] };
        if (ok) pct += ex.puncte;
      }
    }
    const nota = Math.max(1, Math.round(pct / max * 100) / 10);
    const vechi = S.predariElev.find(p => p.tema_id === t.id);
    S.predariElev = S.predariElev.filter(p => p.tema_id !== t.id).concat([{ id: "demo-" + t.id + (vechi ? "-2" : ""), tema_id: t.id, status: "corectat", rezultate, punctaj: pct, punctaj_max: max,
      procent: Math.round(pct / max * 100), nota, trimis_la: new Date().toISOString(), incercare: vechi ? 2 : 1,
      prima: vechi ? { nota: notaFinala(vechi), punctaj: vechi.punctaj } : null,
      feedback: { rezumat: nota >= 9 ? "Excelent! Ai stăpânit tema." : "Ai făcut progrese; uită-te la greșelile de mai jos." } }]);
    delete S.busy[t.id]; delete S.raspunsuri[t.id]; delete (S.reia || {})[t.id]; render();
    toast(`Nota ta: ${fmtNota(nota)} (demonstrație)`);
    sunetNota(nota);
    if (nota >= 9) confetti();
    // în demonstrație, clasamentul se actualizează și el
    const eu = (S.clasamente.c1 || []).find(r => r.eu);
    if (eu) { eu.xp = Math.round(S.predariElev.reduce((s, p) => s + Number(p.punctaj || 0), 0) * 10 + S.predariElev.length * 20); eu.teme = S.predariElev.length; S.clasamente.c1.sort((a, b) => b.xp - a.xp); render(); }
  }, 900);
}

async function corecteazaElev(t, predareId) {
  S.busy[t.id] = "Se corectează răspunsurile libere…"; render();
  try { await cereCorectareAI(predareId); toast("Corectarea s-a terminat."); } catch (e) { toast(e.message); }
  finally { delete S.busy[t.id]; await reincarca(); }
}

/* ---------------- antrenament pentru examen (elev) ---------------- */
const MODELE_ANTR = { scurt: ["Fișă rapidă", 20], argumentativ: ["BAC, Subiectul I B: text argumentativ", 30], bac_real: ["Simulare BAC completă, real-tehnic", 180], bac_uman: ["Simulare BAC completă, uman", 180], en: ["Evaluarea Națională, clasa a VIII-a", 120] };
// la simulările complete de BAC se adaugă cele 10 puncte din oficiu (90 + 10)
function notaAntr(pct, max, model) {
  if (/^bac_/.test(model)) return Math.max(1, Math.round((pct / max * 90 + 10)) / 10);
  return Math.max(1, Math.round(pct / max * 100) / 10);
}
const DEMO_ANTR = {
  titlu: "Fișă rapidă: „Somnoroase păsărele” de Mihai Eminescu",
  text_suport: "Somnoroase păsărele\nPe la cuiburi se adună,\nSe ascund în rămurele –\nNoapte bună!\n\nMihai Eminescu, „Somnoroase păsărele”",
  exercitii: [
    { id: "a1", enunt: "Scrie un sinonim potrivit pentru cuvântul „se adună”.", tip: "text", puncte: 2, raspuns: "se strâng|se adună laolaltă", variante: [] },
    { id: "a2", enunt: "Figura de stil din structura „Somnoroase păsărele” este:", tip: "grila", puncte: 2, raspuns: "0", variante: ["epitet", "comparație", "enumerație"] },
    { id: "a3", enunt: "Câte versuri are strofa?", tip: "numar", puncte: 2, raspuns: "4", variante: [] },
    { id: "a4", enunt: "Prezintă, în minimum 80 de cuvinte, atmosfera creată în strofă.", tip: "liber", puncte: 4, raspuns: "Conținut 3p: atmosfera de liniște, seara, imaginea păsărilor. Redactare 1p.", variante: [] }],
};

let ceasAntr = null;
function pornesteCeas() {
  clearInterval(ceasAntr);
  ceasAntr = setInterval(() => {
    const A = S.antr, el = document.getElementById("ceas-antr");
    if (!A || !A.sub || A.rez || !el) return;
    const ramas = Math.max(0, A.start + MODELE_ANTR[A.model][1] * 60000 - Date.now());
    const m = Math.floor(ramas / 60000), s = Math.floor(ramas / 1000) % 60;
    el.textContent = `${String(Math.floor(m / 60)).padStart(1, "0")}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    el.classList.toggle("putin", ramas < 5 * 60000);
    if (!ramas && !A.expirat) { A.expirat = true; toast("Timpul s-a terminat! Predă lucrarea ca să vezi nota."); canta([660, 520, 440], "sine"); }
  }, 1000);
}

function antrenamentView() {
  const A = S.antr || (S.antr = { model: "scurt", tema: "", busy: "", sub: null, R: {}, start: 0, rez: null });
  let istoric = [];
  try { istoric = JSON.parse(citesteLocal("antrenamente", "[]")); } catch { istoric = []; }
  const card = h("section", { class: "sheet stack antrenament", style: "--acc:var(--c2)" },
    h("div", { class: "tema-head" },
      h("div", null, h("h2", null, "Antrenament pentru examen"),
        h("div", { class: "meta" }, h("span", null, "Subiecte noi, generate de AI după modelul oficial. Nu intră în catalog."))),
      A.sub && !A.rez ? h("div", { class: "ceas" }, h("span", { class: "label" }, "Timp rămas"), h("b", { id: "ceas-antr" }, "…")) : null));
  if (A.busy) { card.append(h("div", { class: "row muted" }, h("span", { class: "spin" }), A.busy)); return card; }
  if (!A.sub) {
    card.append(h("div", { class: "grid2" },
      h("label", { class: "f", for: "antr-model" }, "Ce exersezi",
        h("select", { id: "antr-model", onchange: e => { A.model = e.target.value; } },
          Object.entries(MODELE_ANTR).map(([k, [n, min]]) => { const o = h("option", { value: k }, `${n} (${min >= 60 ? min / 60 + " ore" : min + " min"})`); o.selected = A.model === k; return o; }))),
      h("label", { class: "f", for: "antr-tema" }, "Autor sau temă (opțional)",
        h("input", { type: "text", id: "antr-tema", value: A.tema, placeholder: "Ex.: Eminescu, basmul cult, textul argumentativ", oninput: e => A.tema = e.target.value }))),
      h("div", null, h("button", { class: "btn", type: "button", onclick: async () => {
        A.busy = "AI-ul pregătește un subiect nou… durează până la un minut."; render();
        try {
          let sub;
          if (S.demo) { await new Promise(r => setTimeout(r, 1200)); sub = DEMO_ANTR; }
          else {
            const { data, error } = await S.sb.functions.invoke("corecteaza", { body: { actiune: "antrenament", model: A.model, tema: A.tema } });
            if (error) { let m = "Subiectul nu a putut fi generat."; try { const j = await error.context.json(); if (j && j.eroare) m = j.eroare; } catch { /* */ } throw new Error(m); }
            sub = data;
          }
          Object.assign(A, { sub, R: {}, rez: null, start: Date.now(), expirat: false });
          sunetClic(); pornesteCeas();
        } catch (e) { toast(e.message); }
        finally { A.busy = ""; render(); }
      } }, "Generează un subiect")),
      istoric.length ? h("div", null, h("div", { class: "label" }, "Antrenamentele tale"),
        h("div", { class: "files", style: "margin-top:8px" }, istoric.slice(-8).reverse().map(x =>
          h("span", { class: "chip " + (x.nota >= 5 ? "ok" : "err") }, `${fmtNota(x.nota)} · ${x.titlu.slice(0, 32)} · ${new Date(x.data).toLocaleDateString("ro-RO")}`)))) : null);
    return card;
  }
  const sub = A.sub;
  if (sub.text_suport) card.append(textSuport(sub.text_suport));
  if (A.rez) {
    const max = sub.exercitii.reduce((s, e) => s + e.puncte, 0), pct = A.rez.reduce((s, r) => s + r.puncte, 0);
    const nota = notaAntr(pct, max, A.model);
    card.append(h("div", { class: "row" }, inel(h("span", { class: "nota" + (nota < 5 ? " fail" : "") }, fmtNota(nota)), nota * 10),
      h("div", null, h("div", { class: "label" }, /^bac_/.test(A.model) ? "Nota la simulare (cu 10 puncte din oficiu)" : "Nota la antrenament"), h("div", { class: "muted small" }, `Punctaj: ${fmtNr(pct)} din ${fmtNr(max)}` + (sub.titlu ? ` · ${sub.titlu}` : "")))));
    if (A.general) card.append(h("p", null, A.general));
    sub.exercitii.forEach((ex, i) => {
      const r = A.rez.find(x => x.id === ex.id) || { puncte: 0 };
      card.append(h("div", { class: "mistake", style: `border-left-color:var(${r.puncte >= ex.puncte ? "--good" : r.puncte > 0 ? "--warn" : "--bad"})` },
        h("div", { class: "row", style: "justify-content:space-between" }, h("strong", null, `${i + 1}. ${ex.enunt}`), h("span", { class: "nota" }, `${fmtNr(r.puncte)}/${fmtNr(ex.puncte)}p`)),
        h("div", { class: "small" }, h("span", { class: "muted" }, "Răspuns: "), h("span", { class: "pre" }, ex.tip === "grila" ? (ex.variante[Number(A.R[ex.id])] ?? "(gol)") : (A.R[ex.id] || "(gol)"))),
        r.comentariu ? h("div", { class: "small" }, r.comentariu) : null,
        ex.raspuns && r.puncte < ex.puncte ? h("details", { class: "barem" }, h("summary", null, ex.tip === "liber" ? "Baremul, punct cu punct" : "Răspunsul corect"),
          h("div", { class: "small pre", style: "margin-top:6px" }, ex.tip === "grila" ? (ex.variante[Number(ex.raspuns)] ?? ex.raspuns) : ex.tip === "liber" ? baremPeRanduri(ex.raspuns) : ex.raspuns.split("|").join(" sau "))) : null));
    });
    card.append(statisticiAntrView(sub, A.rez));
    card.append(h("div", null, h("button", { class: "btn", type: "button", onclick: () => { A.sub = null; A.rez = null; render(); } }, "Antrenament nou")));
    return card;
  }
  card.append(h("form", { class: "stack", onsubmit: async e => {
      e.preventDefault();
      if (!sub.exercitii.some(ex => String(A.R[ex.id] ?? "").trim())) { toast("Nu ai răspuns la niciun exercițiu."); return; }
      A.busy = "Se corectează antrenamentul…"; render();
      try {
        if (S.demo) {
          await new Promise(r => setTimeout(r, 1000));
          A.rez = sub.exercitii.map(ex => {
            const a = String(A.R[ex.id] ?? "").trim();
            if (ex.tip === "liber") { const c = (a.match(/\S+/g) || []).length; const p = c >= 80 ? ex.puncte : c >= 30 ? ex.puncte / 2 : 0; return { id: ex.id, puncte: p, comentariu: `Ai scris ${c} cuvinte. (corectare simulată în demonstrație)` }; }
            const ok = ex.tip === "numar" ? Number(a.replace(",", ".")) === Number(ex.raspuns) : ex.raspuns.split("|").some(v => v.trim().toLowerCase() === a.toLowerCase());
            return { id: ex.id, puncte: ok ? ex.puncte : 0, comentariu: ok ? "Corect." : `Răspuns corect: ${ex.tip === "grila" ? ex.variante[Number(ex.raspuns)] : ex.raspuns.split("|")[0]}.` };
          });
          A.general = "Antrenament simulat în demonstrație.";
        } else {
          const { data, error } = await S.sb.functions.invoke("corecteaza", { body: { actiune: "evalueaza", text_suport: sub.text_suport, exercitii: sub.exercitii, raspunsuri: A.R } });
          if (error) { let m = "Antrenamentul nu a putut fi corectat."; try { const j = await error.context.json(); if (j && j.eroare) m = j.eroare; } catch { /* */ } throw new Error(m); }
          A.rez = sub.exercitii.map(ex => { const x = (data.exercitii || []).find(y => y.id === ex.id); return { id: ex.id, puncte: x ? Math.min(ex.puncte, Math.max(0, Number(x.puncte) || 0)) : 0, comentariu: x ? x.comentariu : "" }; });
          A.general = data.comentariu_general || "";
        }
        const max = sub.exercitii.reduce((s, x) => s + x.puncte, 0), pct = A.rez.reduce((s, r) => s + r.puncte, 0), nota = notaAntr(pct, max, A.model);
        let ist = []; try { ist = JSON.parse(citesteLocal("antrenamente", "[]")); } catch { ist = []; }
        ist.push({ titlu: sub.titlu, nota, data: Date.now(), bac: /^bac_/.test(A.model), tipuri: procentePeTip(sub.exercitii, A.rez) }); scrieLocal("antrenamente", JSON.stringify(ist.slice(-30)));
        sunetNota(nota); if (nota >= 9) confetti();
      } catch (err) { toast(err.message); }
      finally { A.busy = ""; render(); }
    } },
    sub.exercitii.map((ex, i) => {
      const id = "antr-" + ex.id;
      let camp;
      if (ex.tip === "grila") camp = h("div", { class: "stack", style: "gap:4px" }, ex.variante.map((v, k) => h("label", { class: "row optiune", style: "gap:10px;cursor:pointer" },
        h("input", { type: "radio", name: id, checked: A.R[ex.id] === String(k), onchange: () => { A.R[ex.id] = String(k); } }), h("span", null, `${String.fromCharCode(97 + k)}) ${v}`))));
      else if (ex.tip === "liber") camp = h("textarea", { id, value: A.R[ex.id] || "", style: "min-height:130px", placeholder: "Scrie rezolvarea…", oninput: e => A.R[ex.id] = e.target.value });
      else camp = h("input", { type: "text", id, value: A.R[ex.id] || "", oninput: e => A.R[ex.id] = e.target.value });
      return h("div", { class: "stack", style: "gap:6px" },
        h("label", { for: ex.tip === "grila" ? null : id, class: "row", style: "justify-content:space-between" }, h("strong", { class: "pre" }, `${i + 1}. ${ex.enunt}`), h("span", { class: "muted small" }, `${fmtNr(ex.puncte)}p`)),
        camp);
    }),
    h("div", { class: "row" }, h("button", { class: "btn", type: "submit" }, "Predă lucrarea"),
      h("button", { class: "btn ghost", type: "button", onclick: () => { A.sub = null; render(); } }, "Renunță"))));
  pornesteCeas();
  return card;
}

/* ---------------- notificări (în site și, dacă elevul vrea, ale browserului) ---------------- */
function notificariElev() {
  if (!S.notifNoi) {
    let vazute = null;
    try { vazute = JSON.parse(citesteLocal("teme-vazute", "null")); } catch { vazute = null; }
    // la prima vizită nu considerăm totul „nou”
    S.notifNoi = vazute ? S.temeElev.filter(t => !vazute.includes(t.id) && !S.predariElev.some(p => p.tema_id === t.id)) : [];
  }
  const noi = S.notifNoi;
  const azi = new Date(); azi.setHours(0, 0, 0, 0);
  const curand = S.temeElev.filter(t => t.termen && !S.predariElev.some(p => p.tema_id === t.id))
    .map(t => ({ t, zile: Math.round((new Date(t.termen + "T00:00:00") - azi) / 86400000) })).filter(x => x.zile >= 0 && x.zile <= 2);
  // marchează ca văzute pentru data viitoare
  scrieLocal("teme-vazute", JSON.stringify(S.temeElev.map(t => t.id)));
  // notificare de browser, o dată pe zi pentru fiecare termen apropiat
  if ("Notification" in window && Notification.permission === "granted") {
    for (const { t, zile } of curand) {
      const cheie = "notif-" + t.id + "-" + new Date().toDateString();
      if (citesteLocal(cheie, "")) continue;
      scrieLocal(cheie, "1");
      try { new Notification("Caietul de teme", { body: `„${t.titlu}” are termen ${zile === 0 ? "azi" : zile === 1 ? "mâine" : "poimâine"}.` }); } catch { /* unele browsere cer service worker */ }
    }
  }
  if (!noi.length && !curand.length && !("Notification" in window && Notification.permission === "default")) return null;
  return h("div", { class: "sheet notificari" },
    noi.length ? h("div", { class: "row" }, h("span", { class: "punct-nou" }), h("b", null, noi.length === 1 ? "O temă nouă: " : `${noi.length} teme noi: `), h("span", null, noi.map(t => t.titlu).join(", "))) : null,
    curand.map(({ t, zile }) => h("div", { class: "row" }, h("span", { class: "chip wait" }, zile === 0 ? "Azi" : zile === 1 ? "Mâine" : "Poimâine"), `Termen pentru „${t.titlu}”`)),
    "Notification" in window && Notification.permission === "default" ? h("div", null, h("button", { class: "btn ghost", type: "button", onclick: async () => {
      const r = await Notification.requestPermission(); toast(r === "granted" ? "Vei primi notificări pentru termenele apropiate." : "Notificările au rămas oprite."); render();
    } }, "Primește notificări pentru termene")) : null);
}

/* ---------------- profesor: lista „De verificat” ---------------- */
function deVerificatView() {
  const nume = id => { const m = S.membri.find(x => x.elev_id === id); return (m && m.profiles && m.profiles.nume) || "Elev"; };
  const lista = deVerificatLista();
  if (!lista.length) return h("div", { class: "sheet de-verificat gol" }, h("h3", null, "De verificat"), h("p", { class: "muted small" }, "Nimic de verificat acum. Lucrările la care AI-ul nu e sigur sau notele sub 5 apar aici."));
  return h("div", { class: "sheet de-verificat" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, `De verificat (${lista.length})`), h("span", { class: "muted small" }, "Apasă ca să deschizi lucrarea")),
    h("div", { class: "stack", style: "gap:8px;margin-top:10px" }, lista.slice(0, 12).map(({ p, t, motive }) =>
      h("button", { type: "button", class: "rand-verif", onclick: () => deschideLucrarea(t.id, p.id) },
        avatar((S.membri.find(m => m.elev_id === p.elev_id)?.profiles || {}).avatar, nume(p.elev_id), 28),
        h("span", { class: "nume" }, nume(p.elev_id)), h("span", { class: "muted small", style: "flex:1;text-align:left" }, t.titlu),
        motive.map(m => h("span", { class: "chip wait" }, m))))));
}

/* ---------------- profesor: raportul greșelilor frecvente ---------------- */
const DEMO_RAPORT = { probleme: [
  { titlu: "„s-a” / „sa”", explicatie: "Trei elevi scriu „sa dus” în loc de „s-a dus”.", elevi: 3, exercitiu: "Dictare cu 10 propoziții care conțin „s-a / sa / s-au / sau”." },
  { titlu: "Virgula înainte de „dar”", explicatie: "Lipsește virgula înaintea conjuncțiilor adversative.", elevi: 2, exercitiu: "Exerciții de punctuație pe fraze cu „dar, însă, iar”." },
  { titlu: "Rezumă în loc să comenteze", explicatie: "La comentariul strofei, unii elevi povestesc versurile fără să explice sensul.", elevi: 2, exercitiu: "Model de comentariu: idee – citat – explicație – efect." }],
  recomandare: "Reluați ortogramele la începutul orei viitoare (10 minute), apoi un comentariu ghidat pe o strofă." };
function raportView() {
  const R = S.raport;
  if (!R) return null;
  if (R.busy) return h("div", { class: "sheet" }, h("div", { class: "row muted" }, h("span", { class: "spin" }), "AI-ul citește corecturile clasei…"));
  return h("div", { class: "sheet raport" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Greșelile frecvente din clasă"),
      h("button", { class: "btn ghost", type: "button", onclick: () => { S.raport = null; render(); } }, "Închide")),
    R.probleme.length ? h("ol", { class: "lista-raport" }, R.probleme.map(x => h("li", null,
      h("div", { class: "row", style: "justify-content:space-between" }, h("strong", null, x.titlu), h("span", { class: "chip wait" }, `${x.elevi} elevi`)),
      h("p", { class: "small" }, x.explicatie), h("p", { class: "small muted" }, "La oră: " + x.exercitiu)))) : null,
    R.recomandare ? h("p", { class: "note", style: "background:rgba(61,220,151,.1);color:var(--good);border-color:rgba(61,220,151,.3)" }, R.recomandare) : null);
}
async function cereRaport() {
  S.raport = { busy: true }; render();
  try {
    if (S.demo) { await new Promise(r => setTimeout(r, 1200)); S.raport = DEMO_RAPORT; }
    else {
      const { data, error } = await S.sb.functions.invoke("corecteaza", { body: { actiune: "raport", clasa_id: S.clasaSel } });
      if (error) { let m = "Raportul nu a putut fi făcut."; try { const j = await error.context.json(); if (j && j.eroare) m = j.eroare; } catch { /* */ } throw new Error(m); }
      S.raport = { probleme: data.probleme || [], recomandare: data.recomandare || "" };
    }
  } catch (e) { S.raport = null; toast(e.message); }
  render();
}

/* ---------------- dictare (pentru comentariile profesorului) ---------------- */
function dicteaza(textarea, laFinal) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("Browserul tău nu are dictare. Încearcă în Chrome."); return; }
  const r = new SR(); r.lang = "ro-RO"; r.interimResults = false;
  r.onresult = e => { const t = [...e.results].map(x => x[0].transcript).join(" "); textarea.value = (textarea.value ? textarea.value + " " : "") + t; laFinal(textarea.value); };
  r.onerror = () => toast("Dictarea nu a mers. Verifică microfonul.");
  r.start(); toast("Vorbește acum…");
}

/* ---------------- profesor ---------------- */
async function incarcaProfesor() {
  const { data, error } = await S.sb.from("clase").select("*").eq("profesor_id", S.user.id).order("creat_la");
  if (error) throw error;
  const b = await S.sb.from("banca").select("*").order("creat_la", { ascending: false });
  S.banca = b.data || [];
  S.clase = data || [];
  if (!S.clase.find(c => c.id === S.clasaSel)) S.clasaSel = S.clase.length ? S.clase[0].id : null;
  await incarcaClasa();
}

async function incarcaClasa() {
  S.teme = []; S.membri = []; S.predari = []; S.exercitii = []; S.corecte = [];
  if (!S.clasaSel) return;
  const [t, m] = await Promise.all([
    S.sb.from("teme").select("*").eq("clasa_id", S.clasaSel).order("creat_la", { ascending: false }),
    S.sb.from("membri").select("elev_id, intrat_la, grupa, profiles(nume, avatar)").eq("clasa_id", S.clasaSel),
  ]);
  if (t.error || m.error) throw t.error || m.error;
  S.teme = t.data || []; S.membri = m.data || [];
  const cl = await S.sb.rpc("clasament", { p_clasa: S.clasaSel });
  S.clasament = cl.data || [];
  if (S.teme.length) {
    const ids = S.teme.map(x => x.id);
    const [p, e, c] = await Promise.all([
      S.sb.from("predari").select("*").in("tema_id", ids),
      S.sb.from("exercitii").select("*").in("tema_id", ids).order("ordine"),
      S.sb.from("raspunsuri_corecte").select("*").in("tema_id", ids),
    ]);
    if (p.error || e.error || c.error) throw p.error || e.error || c.error;
    S.predari = p.data || []; S.exercitii = e.data || []; S.corecte = c.data || [];
    const ms = await S.sb.from("mesaje").select("*").in("tema_id", ids).order("creat_la");
    S.mesaje = ms.data || [];
  }
}

function codNou() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), x => a[x % a.length]).join("");
}

/* drawProfesor și drawElev sunt în nav.js (paginile) */

/* Elevii clasei, fiecare cu media și un grafic mic al notelor, în ordinea temelor. */
function eleviView(deschis) {
  const teme = [...S.teme].sort((a, b) => String(a.creat_la).localeCompare(String(b.creat_la)));
  const randuri = S.membri.map(m => {
    const note = teme.map(t => notaFinala(S.predari.find(p => p.tema_id === t.id && p.elev_id === m.elev_id)));
    const ok = note.filter(n => n != null);
    return { m, note, media: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null, trimise: ok.length };
  }).sort((a, b) => (b.media ?? -1) - (a.media ?? -1));
  return h("details", { class: "sheet", open: deschis || S.eleviDeschis || null, ontoggle: e => { S.eleviDeschis = e.target.open; } },
    h("summary", null, `Elevii clasei și evoluția lor (${S.membri.length})`),
    h("div", { class: "tbl-wrap", style: "margin-top:12px" }, h("table", null,
      h("thead", null, h("tr", null, h("th", null, "Elev"), h("th", null, "Media"), h("th", null, "Teme"), h("th", null, "Grupa"), h("th", null, "Evoluția notelor"))),
      h("tbody", null, randuri.map(r => h("tr", null,
        h("td", null, h("a", { class: "row link-elev", href: "#/elev/" + encodeURIComponent(r.m.elev_id), style: "gap:10px;flex-wrap:nowrap" }, avatar(r.m.profiles && r.m.profiles.avatar, r.m.profiles && r.m.profiles.nume, 30),
          h("span", null, (r.m.profiles && r.m.profiles.nume) || "Elev"))),
        h("td", null, r.media == null ? h("span", { class: "muted" }, "–") : h("span", { class: "nota" + (r.media < 5 ? " fail" : "") }, fmtNota(r.media))),
        h("td", { class: "small" }, `${r.trimise}/${teme.length}`),
        h("td", null, h("select", { "aria-label": "Grupa elevului", style: "width:auto;padding:6px 8px", onchange: async e => {
          const v = e.target.value || null, vechi = r.m.grupa; r.m.grupa = v;
          if (S.demo) { toast("Grupa a fost schimbată (demonstrație)."); return; }
          const { error } = await S.sb.from("membri").update({ grupa: v }).eq("clasa_id", S.clasaSel).eq("elev_id", r.m.elev_id);
          if (error) { r.m.grupa = vechi; toast("Grupa nu a putut fi schimbată."); render(); } else toast("Grupa a fost salvată.");
        } }, [["", "—"], ["uman", "uman"], ["real", "real"]].map(([v, n]) => { const o = h("option", { value: v }, n); o.selected = (r.m.grupa || "") === v; return o; }))),
        h("td", null, sparkline(r.note))))))));
}

/* Editarea unei teme publicate (titlu, text, termen) și copierea ei în altă clasă. */
function unelteTema(t) {
  const alte = S.clase.filter(c => c.id !== t.clasa_id);
  const box = h("div", { class: "row" },
    h("button", { class: "btn ghost", type: "button", onclick: () => { S.editTema = S.editTema === t.id ? null : t.id; S.drafts["ed-" + t.id] = { titlu: t.titlu, cerinta: t.cerinta || "", termen: t.termen || "", unitate: t.unitate || "" }; render(); } },
      S.editTema === t.id ? "Închide editarea" : "Editează"));
  box.append(h("button", { class: "btn ghost", type: "button", onclick: () => duplicaTema(t) }, "Duplică"));
  if (t.ciorna || (t.publicata_la && new Date(t.publicata_la) > new Date()))
    box.append(h("button", { class: "btn", type: "button", onclick: () => publicaAcum(t) }, "Publică acum"));
  if (alte.length) {
    const sel = h("select", { id: "cp-" + t.id, style: "width:auto", "aria-label": "Clasa în care copiezi tema" }, alte.map(c => h("option", { value: c.id }, c.nume)));
    box.append(h("div", { class: "row", style: "gap:6px" }, sel,
      h("button", { class: "btn ghost", type: "button", onclick: async () => {
        const { error } = await S.sb.rpc("copiaza_tema", { p_tema: t.id, p_clasa: sel.value });
        toast(error ? eroareDb(error, "Tema nu a putut fi copiată.") : "Tema a fost copiată în " + sel.selectedOptions[0].textContent + ".");
      } }, "Copiază")));
  }
  return box;
}

function formEditareTema(t) {
  const d = S.drafts["ed-" + t.id];
  const f = (k, el) => { el.addEventListener("input", e => d[k] = e.target.value); return el; };
  return h("form", { class: "stack", style: "padding:14px;border:1px dashed var(--edge);border-radius:16px", onsubmit: async e => {
      e.preventDefault();
      if (!d.titlu.trim()) { toast("Tema are nevoie de un titlu."); return; }
      const { error } = S.demo ? { error: null } : await S.sb.from("teme").update({ titlu: d.titlu.trim(), cerinta: d.cerinta, termen: d.termen || null, unitate: d.unitate || null }).eq("id", t.id);
      if (error) { toast("Modificările nu au putut fi salvate."); return; }
      Object.assign(t, { titlu: d.titlu.trim(), cerinta: d.cerinta, termen: d.termen || null, unitate: d.unitate || null });
      S.editTema = null; toast("Tema a fost actualizată."); reincarca();
    } },
    h("div", { class: "grid2" },
      h("label", { class: "f", for: "ed-t-" + t.id }, "Titlu", f("titlu", h("input", { type: "text", id: "ed-t-" + t.id, value: d.titlu }))),
      h("label", { class: "f", for: "ed-d-" + t.id }, "Termen", f("termen", h("input", { type: "date", id: "ed-d-" + t.id, value: d.termen })))),
    h("label", { class: "f", for: "ed-u-" + t.id }, "Unitatea din programă", f("unitate", h("input", { type: "text", id: "ed-u-" + t.id, list: "unitati", value: d.unitate || "" }))),
    h("label", { class: "f", for: "ed-c-" + t.id }, "Textul suport sau indicațiile", f("cerinta", h("textarea", { id: "ed-c-" + t.id, value: d.cerinta }))),
    h("p", { class: "muted small" }, "Exercițiile nu se pot schimba după ce elevii au început să trimită; pentru alte exerciții, creează o temă nouă."),
    h("div", null, h("button", { class: "btn", type: "submit" }, "Salvează modificările")));
}

function exNou() { return { enunt: "", tip: "liber", raspuns: "", variante: "", corect: "0", puncte: "1", exact: false }; }

/* ---------------- import: PDF sau text → exerciții (cu AI) ---------------- */
let pdfjsPromis = null;
function incarcaPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return pdfjsPromis || (pdfjsPromis = new Promise((ok, nu) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; ok(window.pdfjsLib); };
    s.onerror = () => { pdfjsPromis = null; nu(new Error("Cititorul de PDF nu s-a putut încărca. Verifică internetul sau lipește textul.")); };
    document.head.append(s);
  }));
}
async function textDinPdf(fisier) {
  const pdfjs = await incarcaPdfJs();
  const doc = await pdfjs.getDocument({ data: await fisier.arrayBuffer() }).promise;
  let text = "";
  for (let i = 1; i <= Math.min(doc.numPages, 20); i++) {
    const pag = await (await doc.getPage(i)).getTextContent();
    for (const it of pag.items) text += it.str + (it.hasEOL ? "\n" : "");
    text += "\n\n";
  }
  return text.replace(/[ \t]+\n/g, "\n").trim();
}

function importSubiect() {
  const st = S.import || (S.import = { text: "", nume: "", busy: "" });
  const inp = h("input", { type: "file", accept: "application/pdf,.pdf,.txt,text/plain", hidden: true, onchange: async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    st.busy = "Citesc fișierul…"; st.nume = f.name; render();
    try {
      st.text = /\.pdf$/i.test(f.name) || f.type === "application/pdf" ? await textDinPdf(f) : await f.text();
      if (st.text.length < 40) throw new Error("Nu am găsit text în fișier. Dacă e un PDF scanat, copiază textul și lipește-l.");
      st.busy = ""; await genereaza();
    } catch (err) { st.busy = ""; toast(err.message || "Fișierul nu a putut fi citit."); render(); }
  } });
  const inpBarem = h("input", { type: "file", accept: "application/pdf,.pdf,.txt,text/plain", hidden: true, onchange: async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    st.busy = "Citesc baremul…"; render();
    try {
      st.barem = /\.pdf$/i.test(f.name) || f.type === "application/pdf" ? await textDinPdf(f) : await f.text();
      st.baremNume = f.name; toast("Baremul a fost citit. Acum încarcă subiectul.");
    } catch (err) { toast(err.message || "Baremul nu a putut fi citit."); }
    st.busy = ""; render();
  } });
  async function genereaza() {
    if (S.demo) { st.busy = "AI-ul citește subiectul și scrie exercițiile…"; render(); setTimeout(() => { aplicaImport(DEMO_IMPORT); st.busy = ""; render(); }, 1600); return; }
    if ((st.text || "").trim().length < 40) { toast("Încarcă un PDF sau lipește textul subiectului."); return; }
    st.busy = "AI-ul citește subiectul și scrie exercițiile… durează până la un minut."; render();
    try {
      const { data, error } = await S.sb.functions.invoke("corecteaza", { body: { actiune: "genereaza", text: st.text, barem: st.barem || "" } });
      if (error) {
        let m = "Generarea nu a reușit. Încearcă din nou.";
        try { const j = await error.context.json(); if (j && j.eroare) m = j.eroare; } catch { /* fără JSON */ }
        throw new Error(m);
      }
      aplicaImport(data);
    } catch (err) { toast(err.message); }
    finally { st.busy = ""; render(); }
  }
  return h("div", { class: "import" },
    h("div", { class: "row", style: "justify-content:space-between" },
      h("div", null, h("h3", null, "Importă un subiect"),
        h("p", { class: "muted small" }, "Încarcă PDF-ul unui subiect (BAC, Evaluare Națională, fișă) sau lipește textul. AI-ul scoate textul suport, cerințele, punctajele și baremul, iar tu le verifici mai jos.")),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn ghost", disabled: !!st.busy, title: "Încarcă întâi baremul, dacă îl ai, apoi subiectul", onclick: () => inpBarem.click() }, st.baremNume ? "Barem încărcat ✓" : "1. Baremul (opțional)"),
        h("button", { type: "button", class: "btn ghost", disabled: !!st.busy, onclick: () => inp.click() }, "2. Subiectul (PDF)")), inp, inpBarem),
    st.nume || st.baremNume ? h("div", { class: "muted small" }, [st.baremNume ? "Barem: " + st.baremNume : "", st.nume ? "Subiect: " + st.nume : ""].filter(Boolean).join(" · ")) : null,
    h("details", null, h("summary", null, "sau lipește textul"),
      h("div", { class: "stack", style: "margin-top:10px;gap:10px" },
        h("textarea", { id: "import-text", value: st.text, placeholder: "Lipește aici tot textul subiectului…", style: "min-height:120px;font-family:var(--f-ui);font-size:14px", oninput: e => st.text = e.target.value }),
        h("div", null, h("button", { type: "button", class: "btn", disabled: !!st.busy, onclick: genereaza }, "Generează exercițiile")))),
    st.busy ? h("div", { class: "row muted" }, h("span", { class: "spin" }), st.busy) : null);
}

/* Rezultatul simulat al importului, pentru demonstrație: structura modelului de BAC 2027, profil real-tehnic. */
const DEMO_IMPORT = {
  titlu: "BAC 2027, model – Limba și literatura română (real-tehnic)",
  text_suport: "[Aici apare textul integral din PDF-ul încărcat: fragmentul din „Cititul și scrisul” de Nicolae Manolescu, cu notele de subsol.]\n\nÎn demonstrație nu se citește fișierul; cu cheia AI pornită, textul și cerințele se iau direct din PDF.",
  exercitii: [
    { enunt: "Subiectul I, A1. Indică sensul din text al cuvântului „obișnuit” și al secvenței „de ajuns”.", tip: "liber", puncte: 6, raspuns: "Câte 3 puncte pentru fiecare sens corect, potrivit contextului.", variante: [] },
    { enunt: "Subiectul I, A2. Menționează persoana de la care Nicolae Manolescu află detalii despre Paul Constant, utilizând informațiile din text.", tip: "liber", puncte: 6, raspuns: "6 puncte pentru menționarea corectă a persoanei, conform textului.", variante: [] },
    { enunt: "Subiectul I, A3. Precizează o atitudine a lui Nicolae Manolescu în timpul întâlnirii cu Paul Constant, justificându-ți răspunsul cu o secvență semnificativă din text.", tip: "liber", puncte: 6, raspuns: "3 puncte precizarea atitudinii; 3 puncte justificarea cu o secvență relevantă.", variante: [] },
    { enunt: "Subiectul I, A4. Explică un motiv pentru care Paul Constant nu se încadrează în tiparul scriitorului, în concepția lui Nicolae Manolescu.", tip: "liber", puncte: 6, raspuns: "2 puncte numirea motivului; 4 puncte explicarea lui adecvată.", variante: [] },
    { enunt: "Subiectul I, A5. Prezintă, în 30–50 de cuvinte, o reacție a celorlalți față de creațiile în proză ale lui Nicolae Manolescu, așa cum reiese din text.", tip: "liber", puncte: 6, raspuns: "4 puncte prezentarea reacției; 2 puncte încadrarea în 30–50 de cuvinte.", variante: [] },
    { enunt: "Subiectul I, B. Redactează un text de minimum 150 de cuvinte, în care să argumentezi dacă este important sau nu ca în cadrul școlii să se organizeze întâlniri cu oameni care au succes în diferite domenii, raportându-te la fragmentul din „Cititul și scrisul” și la experiența personală sau culturală.", tip: "liber", puncte: 20, raspuns: "Conținut 14p: formularea opiniei, două argumente adecvate dezvoltate, concluzie. Redactare 6p: conectori, limbă literară, ortografie și punctuație, așezare în pagină. Minimum 150 de cuvinte.", variante: [] },
    { enunt: "Subiectul al II-lea. Prezintă, în minimum 50 de cuvinte, perspectiva narativă din fragmentul de mai jos (Cella Serghi, „Pânza de păianjen”). [Fragmentul apare aici din PDF.]", tip: "liber", puncte: 10, raspuns: "Conținut 6p. Redactare 4p: limba literară 1p, logica ideilor 1p, ortografia 1p, punctuația 1p. Minimum 50 de cuvinte.", variante: [] },
    { enunt: "Subiectul al III-lea. Redactează un eseu de minimum 400 de cuvinte, în care să prezinți particularități ale unui text poetic studiat, aparținând lui Tudor Arghezi: încadrarea în perioadă/curent/orientare, două imagini sau idei poetice, două elemente de compoziție și de limbaj.", tip: "liber", puncte: 30, raspuns: "Conținut 18p (câte 6p pe cerință). Redactare 12p: structura 1p, logica ideilor 1p, analiză și argumentare 3p, limba literară 2p, ortografia 2p, punctuația 2p, așezare și lizibilitate 1p. Minimum 400 de cuvinte.", variante: [] },
  ],
};

function aplicaImport(r) {
  const d = S.drafts.tema;
  S.ultimImport = r;
  d.titlu = r.titlu || d.titlu;
  d.cerinta = r.text_suport || d.cerinta;
  d.ex = r.exercitii.map(e => ({
    enunt: e.enunt, tip: e.tip, puncte: String(e.puncte), exact: false,
    raspuns: e.tip === "grila" ? "" : e.raspuns || "",
    variante: e.tip === "grila" ? (e.variante || []).join("\n") : "",
    corect: e.tip === "grila" ? String(Number(e.raspuns) || 0) : "0" }));
  const total = d.ex.reduce((s, e) => s + Number(e.puncte || 0), 0);
  sunetClic();
  toast(`Am găsit ${d.ex.length} cerințe (${fmtNr(total)} puncte). Verifică-le, apoi apasă „Publică tema”.`);
}

function formularTema() {
  if (!S.newTema) return h("div", null, h("button", { class: "btn", onclick: () => { S.newTema = true; render(); } }, "+ Temă nouă"));
  const d = S.drafts.tema || (S.drafts.tema = { titlu: "", cerinta: "", termen: "", eleviiVad: true, ex: [exNou()] });
  const f = (obj, k, el) => { el.addEventListener("input", e => obj[k] = e.target.value); return el; };

  const exercitii = d.ex.map((x, i) => {
    const pre = `e${i}-`;
    let raspunsCamp;
    if (x.tip === "grila") {
      const variante = x.variante.split("\n").map(s => s.trim()).filter(Boolean);
      raspunsCamp = h("div", { class: "grid2" },
        h("label", { class: "f", for: pre + "var" }, "Variante (câte una pe rând)",
          h("textarea", { id: pre + "var", value: x.variante, style: "min-height:90px", placeholder: "epitet\ncomparație\nmetaforă\npersonificare",
            oninput: e => x.variante = e.target.value, onblur: () => render() })),
        h("div", { class: "f" }, h("span", null, "Varianta corectă"),
          variante.length ? h("div", { class: "stack", style: "gap:4px" }, variante.map((v, k) =>
            h("label", { class: "row small", style: "gap:8px;cursor:pointer" },
              h("input", { type: "radio", name: pre + "ok", checked: x.corect === String(k), onchange: () => { x.corect = String(k); } }),
              `${String.fromCharCode(97 + k)}) ${v}`)))
            : h("span", { class: "muted small" }, "Scrie întâi variantele.")));
    } else {
      const eticheta = { numar: "Răspunsul corect (număr)", text: "Răspunsul corect (mai multe variante acceptate se despart cu |, ex.: fru-mu-se-țe|fru-mu-se-te)", liber: "Barem sau răspuns model pentru corectare (recomandat)" }[x.tip];
      raspunsCamp = h("div", { class: "stack", style: "gap:8px" },
        h("label", { class: "f", for: pre + "rasp" }, eticheta,
          x.tip === "liber"
            ? f(x, "raspuns", h("textarea", { id: pre + "rasp", value: x.raspuns, style: "min-height:90px",
                placeholder: "Ex.: Conținut – 4p: precizează tema, două idei din text, o figură de stil explicată.\nRedactare – 2p: exprimare corectă, ortografie și punctuație.\nMinimum 150 de cuvinte." }))
            : f(x, "raspuns", h("input", { type: "text", id: pre + "rasp", value: x.raspuns, placeholder: x.tip === "numar" ? "Ex.: 4" : "Ex.: fru-mu-se-țe" }))),
        x.tip === "text" ? h("label", { class: "row small", style: "gap:8px;cursor:pointer" },
          h("input", { type: "checkbox", checked: x.exact, onchange: e => { x.exact = e.target.checked; } }),
          "Scriere exactă: contează diacriticele, majusculele și cratima (pentru exerciții de ortografie)") : null);
    }
    return h("div", { class: "sheet stack", style: "background:var(--paper);padding:14px" },
      h("div", { class: "row", style: "justify-content:space-between" }, h("strong", null, `Exercițiul ${i + 1}`),
        d.ex.length > 1 ? h("button", { type: "button", class: "btn danger", onclick: () => { d.ex.splice(i, 1); render(); } }, "Scoate") : null),
      h("label", { class: "f", for: pre + "enunt" }, "Enunțul", f(x, "enunt", h("textarea", { id: pre + "enunt", value: x.enunt, style: "min-height:60px", placeholder: "Ex.: Identifică figura de stil din versul „Ca un glas de durere” și explică rolul ei." }))),
      h("div", { class: "grid2" },
        h("label", { class: "f", for: pre + "tip" }, "Tipul răspunsului",
          h("select", { id: pre + "tip", style: "font:inherit;padding:9px;border-radius:8px;border:1px solid var(--line);background:var(--paper);color:var(--ink)",
            onchange: e => { x.tip = e.target.value; render(); } },
            Object.entries(TIPURI).map(([k, v]) => { const o = h("option", { value: k }, v); o.selected = x.tip === k; return o; }))),
        h("label", { class: "f", for: pre + "pct" }, "Puncte", f(x, "puncte", h("input", { type: "number", id: pre + "pct", min: "0.25", step: "0.25", value: x.puncte })))),
      raspunsCamp);
  });

  return h("form", { class: "sheet stack", onsubmit: async e => {
      e.preventDefault();
      if (!d.titlu.trim()) { toast("Completează titlul temei."); return; }
      const ex = [];
      for (const [i, x] of d.ex.entries()) {
        if (!x.enunt.trim()) { toast(`Scrie enunțul exercițiului ${i + 1}.`); return; }
        const puncte = Number(String(x.puncte).replace(",", "."));
        if (!(puncte > 0)) { toast(`Puncte invalide la exercițiul ${i + 1}.`); return; }
        const item = { enunt: x.enunt.trim(), tip: x.tip, puncte };
        if (x.tip === "grila") {
          const variante = x.variante.split("\n").map(s => s.trim()).filter(Boolean);
          if (variante.length < 2) { toast(`Exercițiul ${i + 1}: scrie cel puțin două variante.`); return; }
          if (Number(x.corect) >= variante.length) { toast(`Exercițiul ${i + 1}: alege varianta corectă.`); return; }
          item.variante = variante; item.raspuns = x.corect;
        } else {
          if (x.tip !== "liber" && !x.raspuns.trim()) { toast(`Exercițiul ${i + 1}: scrie răspunsul corect.`); return; }
          item.raspuns = x.raspuns.trim();
          if (x.tip === "text") item.exact = !!x.exact;
        }
        ex.push(item);
      }
      if (S.demo) {
        S.teme.unshift({ id: "nou" + Date.now(), clasa_id: S.clasaSel, titlu: d.titlu.trim(), cerinta: d.cerinta, termen: d.termen || null, unitate: d.unitate || null, grupa: d.grupa || null, creat_la: new Date().toISOString(), elevii_vad: d.eleviiVad, ...extraPublicare(d) });
        S.drafts.tema = null; S.newTema = false; toast("Tema a fost publicată (demonstrație)."); mergi("teme"); return;
      }
      const { data: temaId, error } = await S.sb.rpc("creeaza_tema", { p_clasa: S.clasaSel, p_titlu: d.titlu.trim(), p_cerinta: d.cerinta.trim(), p_termen: d.termen || null, p_elevii_vad: d.eleviiVad, p_exercitii: ex, p_a_doua: d.aDoua !== false });
      if (error) { toast(eroareDb(error, "Tema nu a putut fi salvată. Încearcă din nou.")); return; }
      const extra = extraPublicare(d);
      if (d.unitate || d.grupa || extra.ciorna || extra.publicata_la || extra.minute) {
        const { error: e2 } = await S.sb.from("teme").update({ unitate: d.unitate || null, grupa: d.grupa || null, ...extra }).eq("id", temaId);
        if (e2) toast("Tema a fost creată, dar setările de publicare nu s-au salvat. Încearcă din „Editează”.");
      }
      S.drafts.tema = null; S.newTema = false; toast("Tema a fost publicată pentru elevi."); await reincarca(); mergi("teme");
    } },
    h("h2", null, "Temă nouă"),
    importSubiect(),
    S.ultimImport ? h("div", { class: "row" }, h("span", { class: "muted small" }, `Subiect importat: ${S.ultimImport.titlu}`),
      h("button", { class: "btn ghost", type: "button", onclick: () => { salveazaInBanca(S.ultimImport); S.ultimImport = null; } }, "Salvează în banca de subiecte")) : null,
    h("div", { class: "grid2" },
      h("label", { class: "f", for: "t-unitate" }, "Unitatea din programă (opțional)",
        f(d, "unitate", h("input", { type: "text", id: "t-unitate", list: "unitati", value: d.unitate || "", placeholder: "Ex.: Basmul cult" })),
        h("datalist", { id: "unitati" }, Object.entries(UNITATI).flatMap(([cls, u]) => u.map(x => h("option", { value: x }, "clasa " + cls))))),
      h("label", { class: "f", for: "t-grupa" }, "Pentru",
        h("select", { id: "t-grupa", onchange: e => d.grupa = e.target.value }, [["", "Toată clasa"], ["uman", "Doar grupa uman"], ["real", "Doar grupa real"]].map(([v, n]) => { const o = h("option", { value: v }, n); o.selected = (d.grupa || "") === v; return o; })))),
    h("div", { class: "grid2" },
      h("label", { class: "f", for: "t-titlu" }, "Titlu", f(d, "titlu", h("input", { type: "text", id: "t-titlu", value: d.titlu, placeholder: "Ex.: „Plumb” de George Bacovia" }))),
      h("label", { class: "f", for: "t-termen" }, "Termen (opțional)", f(d, "termen", h("input", { type: "date", id: "t-termen", value: d.termen, onchange: e => avertizareTermen(e.target.value) })),
        termenOcupat(d.termen) ? h("span", { class: "small", style: "color:var(--warn)" }, "În ziua asta are termen și „" + termenOcupat(d.termen).titlu + "”.") : null)),
    optiuniPublicare(d),
    h("label", { class: "f", for: "t-cerinta" }, "Textul suport sau indicații pentru elevi (opțional)",
      f(d, "cerinta", h("textarea", { id: "t-cerinta", value: d.cerinta, style: "min-height:90px", placeholder: "Lipește aici poezia sau fragmentul pe care se bazează exercițiile." }))),
    exercitii,
    h("div", null, h("button", { type: "button", class: "btn ghost", onclick: () => { d.ex.push(exNou()); render(); } }, "+ Adaugă exercițiu")),
    h("label", { class: "row small", style: "gap:8px;cursor:pointer" },
      h("input", { type: "checkbox", checked: d.eleviiVad, onchange: e => d.eleviiVad = e.target.checked }),
      "După trimitere, elevii văd răspunsurile corecte"),
    h("label", { class: "row small", style: "gap:8px;cursor:pointer" },
      h("input", { type: "checkbox", checked: d.aDoua !== false, onchange: e => d.aDoua = e.target.checked }),
      "Elevii își pot îmbunătăți lucrarea o dată, după corectare (a doua încercare)"),
    h("div", { class: "row" }, h("button", { class: "btn", type: "submit" }, d.ciorna ? "Salvează ciorna" : d.programata ? "Programează tema" : "Publică tema"),
      h("button", { class: "btn ghost", type: "button", onclick: () => { S.newTema = false; mergi("teme"); } }, "Renunță")));
}

function cardProfesor(t) {
  const exercitii = S.exercitii.filter(e => e.tema_id === t.id);
  const corecte = S.corecte.filter(c => c.tema_id === t.id);
  const nume = id => { const m = S.membri.find(x => x.elev_id === id); return (m && m.profiles && m.profiles.nume) || "Elev"; };
  const rows = S.predari.filter(p => p.tema_id === t.id).sort((a, b) => (notaFinala(b) ?? -1) - (notaFinala(a) ?? -1));
  const note = rows.map(notaFinala).filter(n => n != null);
  const media = note.length ? note.reduce((a, b) => a + b, 0) / note.length : null;
  const hist = Array(10).fill(0); note.forEach(n => hist[Math.min(9, Math.max(0, Math.round(n) - 1))]++);
  const hmax = Math.max(1, ...hist);
  const sure = S.confirm === t.id;

  // cât de bine a mers fiecare exercițiu, pe toată clasa
  const perEx = exercitii.map(ex => {
    const pts = rows.map(p => (p.rezultate || {})[ex.id]).filter(r => r && typeof r.puncte === "number");
    const procent = pts.length ? Math.round(100 * pts.reduce((a, r) => a + r.puncte, 0) / (pts.length * ex.puncte)) : null;
    return { ex, procent };
  });

  const card = h("section", { class: "sheet stack" },
    h("div", { class: "tema-head" },
      h("div", null, h("h2", null, t.titlu),
        h("div", { class: "meta" }, h("span", null, "Publicată " + fmtData(t.creat_la)), t.termen ? h("span", null, "Termen: " + fmtZi(t.termen)) : null,
          h("span", null, `${exercitii.length} exerciții · ${fmtNr(exercitii.reduce((a, e) => a + Number(e.puncte), 0))}p`))),
      h("button", { class: "btn danger" + (sure ? " sure" : ""), onclick: async () => {
        if (!sure) { S.confirm = t.id; render(); setTimeout(() => { if (S.confirm === t.id) { S.confirm = null; render(); } }, 5000); return; }
        S.confirm = null;
        const { error } = await S.sb.from("teme").delete().eq("id", t.id);
        if (error) toast("Tema nu a putut fi ștearsă."); else { toast("Tema și lucrările ei au fost șterse."); await reincarca(); mergi("teme"); }
      } }, sure ? "Confirmă ștergerea" : "Șterge tema")),
    stareTemaView(t),
    unelteTema(t),
    S.editTema === t.id ? formEditareTema(t) : null,
    h("details", null, h("summary", null, t.cerinta ? "Textul suport, exercițiile și răspunsurile corecte" : "Exercițiile și răspunsurile corecte"),
      t.cerinta ? h("div", { style: "margin-top:10px" }, textSuport(t.cerinta)) : null,
      h("ol", { style: "margin:10px 0 0;padding-left:20px" }, exercitii.map(ex => {
        const c = corecte.find(x => x.exercitiu_id === ex.id);
        const ok = !c ? "" : ex.tip === "grila" ? ex.variante[Number(c.raspuns)] : c.raspuns.split("|").join(" sau ");
        return h("li", { style: "margin-bottom:6px" }, h("span", { class: "pre" }, ex.enunt), " ",
          h("span", { class: "muted small" }, `(${fmtNr(ex.puncte)}p, ${TIPURI[ex.tip].split(" (")[0].toLowerCase()})`),
          ok ? h("div", { class: "small" }, h("span", { class: "muted" }, ex.tip === "liber" ? "Model: " : "Corect: "), ok) : null);
      }))),
    h("div", { class: "stats" },
      h("div", { class: "stat" }, h("div", { class: "label" }, "Lucrări"), h("div", { class: "v" }, `${rows.length}/${S.membri.length}`)),
      h("div", { class: "stat" }, h("div", { class: "label" }, "Media"), h("div", { class: "v nota" }, fmtNota(media))),
      h("div", { class: "stat" }, h("div", { class: "label" }, "Promovați (≥5)"), h("div", { class: "v" }, note.length ? `${note.filter(n => n >= 5).length}/${note.length}` : "–")),
      note.length ? h("div", { class: "stat" }, h("div", { class: "label" }, "Distribuția notelor"),
        h("div", { class: "hist" }, hist.map((c, i) => h("div", { class: i < 4 ? "fail" : "", style: `height:${Math.round(c / hmax * 100)}%`, title: `Nota ${i + 1}: ${c} lucrări` }))),
        h("div", { class: "hist-lab" }, hist.map((_, i) => h("span", null, i + 1)))) : null),
    rows.length ? h("div", { class: "files" }, perEx.map(({ ex, procent }) =>
      h("span", { class: "chip " + (procent == null ? "none" : procent >= 70 ? "ok" : procent >= 40 ? "wait" : "err"), title: ex.enunt },
        `Ex. ${ex.ordine}: ${procent == null ? "–" : procent + "% corect"}`))) : null);

  if (!rows.length) { card.append(h("p", { class: "muted" }, "Niciun elev nu a trimis încă această temă.")); return card; }

  const tbody = h("tbody");
  for (const p of rows) {
    const fin = notaFinala(p);
    const toggle = () => { S.open[p.id] = !S.open[p.id]; render(); };
    tbody.append(h("tr", { class: "clk", id: "lucrare-" + p.id, tabindex: "0", onclick: toggle, onkeydown: e => { if (e.key === "Enter") toggle(); } },
      h("td", null, nume(p.elev_id)),
      h("td", null, fin == null ? h("span", { class: "muted" }, "–") : h("span", { class: "nota" + (fin < 5 ? " fail" : "") }, fmtNota(fin))),
      h("td", { class: "small" }, `${fmtNr(p.punctaj)}/${fmtNr(p.punctaj_max)}p`),
      h("td", null, statusChip(p, S.busy[p.id])),
      h("td", { class: "muted small" }, fmtData(p.trimis_la))));
    if (S.open[p.id]) tbody.append(h("tr", null, h("td", { class: "detail", colspan: "5" }, detaliuProfesor(p, t, exercitii, corecte))));
  }
  card.append(h("div", { class: "tbl-wrap" }, h("table", null,
    h("thead", null, h("tr", null, h("th", null, "Elev"), h("th", null, "Notă"), h("th", null, "Punctaj"), h("th", null, "Stare"), h("th", null, "Trimisă"))), tbody)),
    asemanariView(t, rows, exercitii));
  return card;
}

function detaliuProfesor(p, t, exercitii, corecte) {
  const box = h("div", { class: "stack" }, navLucrari(p, t), notaBox(p));
  if (p.prima) box.append(h("p", { class: "muted small" }, `A doua încercare. Prima: ${fmtNota(p.prima.nota)} (${fmtNr(p.prima.punctaj)}p).`));
  box.append(rezultateView(p, exercitii, true, corecte));
  const numeElev = ((S.membri.find(m => m.elev_id === p.elev_id) || {}).profiles || {}).nume;
  box.append(mesajeView(t.id, p.elev_id, numeElev));
  // comentariul profesorului (scris sau dictat), văzut de elev
  const cid = "cp-" + p.id;
  const ta = h("textarea", { id: cid, style: "min-height:80px", placeholder: "Un comentariu pentru elev (îl vede lângă notă)…",
    value: S.drafts[cid] ?? (p.comentariu_profesor || ""), oninput: e => S.drafts[cid] = e.target.value });
  box.append(h("div", { class: "stack", style: "gap:6px" },
    h("label", { class: "label", for: cid }, "Comentariul tău"), ta, comentariiRapide(ta, cid),
    h("div", { class: "row" },
      h("button", { class: "btn ghost", type: "button", onclick: async () => {
        const v = String(S.drafts[cid] ?? ta.value).trim();
        const { error } = await S.sb.from("predari").update({ comentariu_profesor: v || null }).eq("id", p.id);
        if (error) { toast(eroareDb(error, "Comentariul nu a putut fi salvat.")); return; }
        p.comentariu_profesor = v; delete S.drafts[cid]; toast("Comentariul a fost salvat. Elevul îl vede la temă.");
      } }, "Salvează comentariul"),
      (window.SpeechRecognition || window.webkitSpeechRecognition) ? h("button", { class: "btn ghost", type: "button", onclick: () => dicteaza(ta, v => S.drafts[cid] = v) }, "Dictează") : null)));
  const nid = "np-" + p.id;
  const inp = h("input", { type: "number", id: nid, min: "1", max: "10", step: "0.5", style: "width:96px",
    value: S.drafts[nid] ?? (p.nota_profesor != null ? p.nota_profesor : ""), oninput: e => S.drafts[nid] = e.target.value });
  const areLiber = exercitii.some(e => e.tip === "liber");
  const sureRetrim = S.confirm === "re-" + p.id;
  box.append(h("div", { class: "row" },
    h("label", { class: "row small", for: nid }, "Nota finală (opțional):", inp),
    h("button", { class: "btn ghost", onclick: async () => {
      const v = String(S.drafts[nid] ?? inp.value).trim().replace(",", ".");
      const n = v === "" ? null : Number(v);
      if (n !== null && (!isFinite(n) || n < 1 || n > 10)) { toast("Nota trebuie să fie între 1 și 10."); return; }
      const { error } = await S.sb.from("predari").update({ nota_profesor: n }).eq("id", p.id);
      if (error) { toast("Nota nu a putut fi salvată."); return; }
      delete S.drafts[nid]; toast(n === null ? "Rămâne nota calculată automat." : "Nota a fost salvată."); reincarca();
    } }, "Salvează nota"),
    areLiber ? h("button", { class: "btn ghost", disabled: !!S.busy[p.id], onclick: async () => {
      S.busy[p.id] = true; render();
      try { await cereCorectareAI(p.id, true); toast("Răspunsurile libere au fost corectate din nou."); } catch (e) { toast(e.message); }
      finally { delete S.busy[p.id]; reincarca(); }
    } }, "Corectează răspunsurile libere cu AI") : null,
    h("button", { class: "btn danger" + (sureRetrim ? " sure" : ""), onclick: async () => {
      if (!sureRetrim) { S.confirm = "re-" + p.id; render(); setTimeout(() => { if (S.confirm === "re-" + p.id) { S.confirm = null; render(); } }, 5000); return; }
      S.confirm = null;
      const { error } = await S.sb.from("predari").delete().eq("id", p.id);
      if (error) toast("Nu am putut șterge lucrarea."); else { toast("Lucrarea a fost ștearsă; elevul poate trimite din nou."); reincarca(); }
    } }, sureRetrim ? "Confirmă: șterge lucrarea" : "Permite retrimiterea")));
  return box;
}

start();
