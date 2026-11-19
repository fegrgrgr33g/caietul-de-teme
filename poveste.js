/* Caietul de teme — „Povestea Cunoașterii”.
   Lumea ilustrată (scena de fundal, decorurile), cartea interactivă cu capitole, panourile de sub carte și pagina Rezultate.
   Ilustrațiile sunt desene vectoriale (SVG) făcute în cod, separate pe straturi; textele, butoanele și datele sunt HTML real.
   Se încarcă înainte de app.js; nu schimbă logica aplicației. */
"use strict";

function estePoveste() { return document.documentElement.dataset.tema === "poveste"; }

/* =====================================================================
   SCENA DE FUNDAL (o singură dată, în afara #app, deci nu se redesenează la fiecare clic)
   ===================================================================== */
function asiguraScena() {
  if (!estePoveste() || document.getElementById("scena")) return;
  const s = document.createElement("div");
  s.id = "scena"; s.setAttribute("aria-hidden", "true");
  // pod cu arcade (apeduct) și căsuțe cu ferestre luminate, generate în buclă
  let arcade = "", case_ = "";
  for (let i = 0; i < 7; i++) {
    const x = i * 58;
    arcade += `<rect x="${x}" y="20" width="14" height="62" fill="#4d3560"/><path d="M${x + 14} 82 V48 a22 22 0 0 1 44 0 V82" fill="none" stroke="#4d3560" stroke-width="3"/>`;
  }
  [[1210, 640, 46, 34], [1268, 628, 40, 40], [1322, 648, 52, 30], [1392, 622, 44, 44], [1450, 640, 50, 34], [1515, 630, 42, 40], [1160, 660, 40, 30]].forEach(([x, y, w, hh], k) => {
    case_ += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="#3a2648"/><path d="M${x - 4} ${y} L${x + w / 2} ${y - 22} L${x + w + 4} ${y} Z" fill="#2c1c3a"/>`
      + `<rect class="fereastra f${k % 3}" x="${x + w / 2 - 5}" y="${y + 10}" width="9" height="10" rx="1.5" fill="#ffcf7a"/>`;
  });
  s.innerHTML = `
  <div class="scena-ilustratie"></div>
  <svg class="scena-fundal" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sc-cer" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a1844"/><stop offset=".32" stop-color="#57336e"/><stop offset=".58" stop-color="#b0608a"/>
        <stop offset=".74" stop-color="#e8937f"/><stop offset="1" stop-color="#f5c28c"/></linearGradient>
      <radialGradient id="sc-soare" cx=".74" cy=".62" r=".42"><stop offset="0" stop-color="#ffe2a6" stop-opacity=".95"/><stop offset=".35" stop-color="#ffc58a" stop-opacity=".35"/><stop offset="1" stop-color="#ffc58a" stop-opacity="0"/></radialGradient>
      <linearGradient id="sc-m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6c9c"/><stop offset="1" stop-color="#c4849a"/></linearGradient>
      <linearGradient id="sc-m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4a80"/><stop offset="1" stop-color="#7d5687"/></linearGradient>
      <linearGradient id="sc-deal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3060"/><stop offset="1" stop-color="#2a1a3a"/></linearGradient>
      <linearGradient id="sc-rau" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6c99a" stop-opacity="0"/><stop offset=".5" stop-color="#f8d3a4" stop-opacity=".75"/><stop offset="1" stop-color="#f6c99a" stop-opacity="0"/></linearGradient>
      <linearGradient id="sc-podea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4658"/><stop offset="1" stop-color="#2a1824"/></linearGradient>
      <pattern id="sc-balustri" width="44" height="64" patternUnits="userSpaceOnUse">
        <path d="M15 0h14v7c-5 4-6 10-4 17 3 9 7 14 7 24 0 7-4 12-4 16h-12c0-4-4-9-4-16 0-10 4-15 7-24 2-7 1-13-4-17z" fill="#8c6a80"/>
        <path d="M15 0h7v7c-3 4-4 10-2 17 2 9 4 14 4 24 0 7-2 12-2 16h-6c0-4-4-9-4-16 0-10 4-15 7-24 2-7 1-13-4-17z" fill="#a8869a" opacity=".55"/></pattern>
    </defs>
    <rect width="1600" height="900" fill="url(#sc-cer)"/>
    <rect width="1600" height="900" fill="url(#sc-soare)"/>
    <g class="nori" fill="#f7c0c8" opacity=".32">
      <ellipse cx="420" cy="210" rx="170" ry="22"/><ellipse cx="560" cy="190" rx="110" ry="16"/><ellipse cx="1040" cy="150" rx="200" ry="20"/><ellipse cx="1300" cy="250" rx="150" ry="14"/></g>
    <path d="M0 560 L140 500 280 540 420 470 560 520 700 455 860 515 1000 470 1160 505 1320 450 1480 500 1600 478 V900 H0Z" fill="url(#sc-m1)" opacity=".75"/>
    <path d="M0 610 Q200 556 380 596 T760 588 T1120 600 T1600 566 V900 H0Z" fill="url(#sc-m2)" opacity=".92"/>
    <path d="M300 650 Q620 600 980 632 T1600 610 V900 H300Z" fill="#5a3d6c" opacity=".55"/>
    <path d="M520 640 C760 618 980 650 1180 630" stroke="url(#sc-rau)" stroke-width="10" fill="none" stroke-linecap="round"/>
    <g transform="translate(700,548)" opacity=".9">${arcade}<rect x="0" y="14" width="410" height="9" fill="#5c4170"/></g>
    <path d="M980 700 Q1080 470 1230 420 Q1360 380 1460 430 Q1560 480 1600 500 V900 H980Z" fill="url(#sc-deal)"/>
    <g class="castel" transform="translate(1175,186)">
      <rect x="62" y="96" width="120" height="150" fill="#3a2850"/><rect x="18" y="64" width="44" height="182" fill="#33234a"/>
      <rect x="182" y="44" width="46" height="202" fill="#33234a"/><rect x="108" y="14" width="32" height="96" fill="#2f2045"/>
      <path d="M14 66 L40 12 L66 66Z M178 46 L205 -10 L232 46Z M104 16 L124 -46 L144 16Z" fill="#251836"/>
      <path d="M62 96 h120 v-10 h-12 v6 h-12 v-6 h-12 v6 h-12 v-6 h-12 v6 h-12 v-6 h-12 v6 h-12 v-6 h-12 v6 h-12 v-6 h-12 z" fill="#3a2850"/>
      <path d="M124 -46 v-22 l18 7 -18 7" fill="#c66a7e" class="steag"/>
      <rect class="fereastra f0" x="32" y="104" width="10" height="14" rx="5" fill="#ffd27a"/><rect class="fereastra f1" x="32" y="150" width="10" height="14" rx="5" fill="#ffd27a"/>
      <rect class="fereastra f2" x="198" y="84" width="11" height="15" rx="5" fill="#ffd27a"/><rect class="fereastra f0" x="198" y="138" width="11" height="15" rx="5" fill="#ffd27a"/>
      <rect class="fereastra f1" x="118" y="40" width="10" height="14" rx="5" fill="#ffd27a"/><rect class="fereastra f2" x="88" y="140" width="12" height="18" rx="6" fill="#ffd27a"/>
      <rect class="fereastra f0" x="144" y="140" width="12" height="18" rx="6" fill="#ffd27a"/><rect class="fereastra f1" x="116" y="190" width="14" height="22" rx="7" fill="#ffd27a"/></g>
    <g class="sat">${case_}</g>
    <rect y="736" width="1600" height="164" fill="url(#sc-podea)"/>
    <rect y="676" width="1600" height="12" fill="#a1808f"/><rect y="688" width="1600" height="64" fill="url(#sc-balustri)"/><rect y="748" width="1600" height="10" fill="#7b5b6d"/>
    <g fill="#f3c69a" opacity=".07"><path d="M300 900 L620 760 H700 L560 900Z"/><path d="M900 900 L1000 760 H1090 L1200 900Z"/></g>
  </svg>
  <div class="voal"></div>
  <svg class="decor glicina" viewBox="0 0 260 300">${ciorchini()}</svg>
  <svg class="decor flori" viewBox="0 0 320 220">${flori()}</svg>
  <div class="decor felinar"><span class="halou"></span>${felinarSvg()}</div>
  <div class="particule">${Array.from({ length: 14 }, (_, i) => `<i style="--x:${(i * 37 + 11) % 96}%;--y:${(i * 53 + 7) % 88}%;--d:${9 + (i % 5) * 2.2}s;--w:${-(i * 1.7)}s;--s:${2 + (i % 3)}px"></i>`).join("")}</div>`;
  adaugaStraturi(s);
  document.body.prepend(s);
  texturaHartie();
}

/* straturi în plus: atmosfera fiecărei pagini și viața din peisaj (se văd doar unde au sens, din CSS) */
function adaugaStraturi(s) {
  const strat = (cls, html) => { const d = document.createElement("div"); d.className = "strat " + cls; d.innerHTML = html; s.append(d); };
  // rama bibliotecii: arcadă gotică, coloane de lemn cu rafturi și felinare; prin ea se vede peisajul
  let rafturi = "";
  const cotoare = (x0, w) => { let o = "", x = x0; const cul = ["#7a2e44", "#3e3a6e", "#2f5e4c", "#8a5a2c", "#5a3a6e", "#a0763a"]; for (let r = 0; r < 7; r++) { x = x0 + 6; const y = 150 + r * 104; while (x < x0 + w - 12) { const bw = 8 + ((x * 7 + r * 13) % 9), bh = 70 + ((x * 3 + r * 5) % 22); o += `<rect x="${x}" y="${y + 86 - bh}" width="${bw}" height="${bh}" fill="${cul[(x + r) % 6]}" opacity=".9"/>`; x += bw + 2; } o += `<rect x="${x0}" y="${y + 86}" width="${w}" height="10" fill="#4a2e22"/>`; } return o; };
  rafturi = cotoare(0, 130) + cotoare(1470, 130);
  strat("rama-biblioteca", `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="rb-lemn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a1a16"/><stop offset=".5" stop-color="#4a2e22"/><stop offset="1" stop-color="#2a1a16"/></linearGradient></defs>
    <path fill-rule="evenodd" fill="#1c1220" d="M0 0 H1600 V900 H0 Z M140 900 V330 C140 140 470 40 800 26 C1130 40 1460 140 1460 330 V900 Z"/>
    <path d="M140 900 V330 C140 140 470 40 800 26 C1130 40 1460 140 1460 330 V900" fill="none" stroke="#c9a062" stroke-width="5" opacity=".75"/>
    <path d="M160 900 V336 C160 156 480 60 800 46 C1120 60 1440 156 1440 336 V900" fill="none" stroke="#c9a062" stroke-width="1.5" opacity=".4"/>
    <rect x="0" y="0" width="140" height="900" fill="url(#rb-lemn)"/><rect x="1460" y="0" width="140" height="900" fill="url(#rb-lemn)"/>
    ${rafturi}
    <g class="felinar-arc"><path d="M520 60 v70" stroke="#2c1f1a" stroke-width="2"/><rect x="512" y="128" width="16" height="24" rx="3" fill="#ffc768" class="lumina-arc"/><circle cx="520" cy="146" r="22" fill="#ffc768" opacity=".12" class="lumina-arc"/></g>
    <g class="felinar-arc"><path d="M1080 60 v90" stroke="#2c1f1a" stroke-width="2"/><rect x="1072" y="148" width="16" height="24" rx="3" fill="#ffc768" class="lumina-arc"/><circle cx="1080" cy="166" r="22" fill="#ffc768" opacity=".12" class="lumina-arc"/></g></svg>`);
  // păsări care trec rar pe cer
  strat("pasari", `<svg viewBox="0 0 60 20"><path d="M2 12 q8 -8 14 0 q6 -8 14 0" fill="none" stroke="#3a2448" stroke-width="2.2" stroke-linecap="round"/><path d="M34 6 q5 -5 9 0 q4 -5 9 0" fill="none" stroke="#3a2448" stroke-width="1.8" stroke-linecap="round"/></svg>`);
  // ceață care alunecă peste dealuri
  strat("ceata", "");
  // licurici lângă flori (doar pe pagina principală)
  strat("licurici", Array.from({ length: 8 }, (_, i) => `<i style="--x:${68 + (i * 7) % 30}%;--y:${70 + (i * 11) % 24}%;--d:${5 + i % 4}s;--w:${-i * .9}s"></i>`).join(""));
  // noapte cu lună și stele (Pregătire BAC: „marea încercare” se dă sub stele)
  strat("noapte", `<svg viewBox="0 0 1600 500" preserveAspectRatio="xMidYMin slice"><defs><radialGradient id="lu-h"><stop offset="0" stop-color="#fff6d8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient></defs>
    <circle cx="1240" cy="110" r="90" fill="url(#lu-h)"/><circle cx="1240" cy="110" r="34" fill="#fbf1d0"/><circle cx="1228" cy="100" r="6" fill="#efe1b8"/><circle cx="1252" cy="122" r="4" fill="#efe1b8"/>
    ${Array.from({ length: 46 }, (_, i) => `<circle class="st s${i % 3}" cx="${(i * 137) % 1600}" cy="${(i * 71) % 420}" r="${1 + (i % 3) * .5}" fill="#fff8e1"/>`).join("")}
    <path class="cazatoare" d="M300 60 l120 40" stroke="#fff8e1" stroke-width="2" stroke-linecap="round"/></svg>`);
  // raze de dimineață (Rezultate: „răsăritul” progresului)
  strat("zori", "");
  // cărți care plutesc (Bibliotecă)
  strat("carti-zboara", [0, 1, 2].map(i => `<svg class="cz c${i}" viewBox="0 0 80 50"><path d="M40 12 C30 4 14 4 4 8 v34 c10 -4 26 -4 36 4 c10 -8 26 -8 36 -4 V8 C66 4 50 4 40 12Z" fill="${["#f3e3c0", "#efdcb4", "#f6e8c8"][i]}" stroke="#a7834f" stroke-width="2"/><path d="M40 12 v34" stroke="#a7834f" stroke-width="2"/><path d="M10 16 h22 M10 22 h20 M48 16 h22 M48 22 h18" stroke="#c4a77a" stroke-width="1.6"/></svg>`).join(""));
  // ghirlandă de lampioane (Calendar: „planul aventurii”, ca la un târg de seară)
  strat("lampioane", `<svg viewBox="0 0 1600 140" preserveAspectRatio="none"><path d="M0 20 Q400 120 800 40 T1600 30" fill="none" stroke="#3a2a22" stroke-width="2"/>
    ${Array.from({ length: 12 }, (_, i) => { const x = 60 + i * 130, y = 30 + Math.sin(i * .8) * 26 + (i % 2) * 18; return `<g class="lp l${i % 3}"><line x1="${x}" y1="${y - 14}" x2="${x}" y2="${y}" stroke="#3a2a22"/><ellipse cx="${x}" cy="${y + 10}" rx="9" ry="12" fill="${["#f6b85c", "#e8806f", "#f1d07c"][i % 3]}"/></g>`; }).join("")}</svg>`);
}

/* textura de hârtie: generată o singură dată într-o imagine mică (mult mai rapidă decât un filtru SVG redesenat pe fiecare card) */
function texturaHartie() {
  try {
    const c = document.createElement("canvas"); c.width = c.height = 120;
    const x = c.getContext("2d"), img = x.createImageData(120, 120);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random(); img.data[i] = 115; img.data[i + 1] = 82; img.data[i + 2] = 46; img.data[i + 3] = v < .5 ? 0 : Math.round((v - .5) * 34); }
    x.putImageData(img, 0, 0);
    document.documentElement.style.setProperty("--hartie", `url(${c.toDataURL("image/png")})`);
  } catch { /* rămâne textura implicită */ }
}

/* la fiecare desen: scena știe pe ce pagină suntem (pentru atmosfera ei) */
function actualizeazaScena() {
  const s = document.getElementById("scena"); if (!s) return;
  s.dataset.pag = (S.profil && S.pag) || "intrare";
  s.dataset.rol = (S.profil && S.profil.rol) || "";
}

/* o mică emblemă ilustrată lângă titlul fiecărei pagini */
const EMBLEME = {
  teme: `<path d="M30 52 C32 34 40 18 54 8 C50 26 42 40 32 54Z" fill="#e9cf9a" stroke="#6b4a6e" stroke-width="2"/><path d="M32 54 L50 14" stroke="#6b4a6e" stroke-width="1.5"/><rect x="10" y="44" width="22" height="16" rx="4" fill="#3a2a5c"/><rect x="14" y="40" width="14" height="6" rx="2" fill="#2a1d44"/>`,
  calendar: `<circle cx="32" cy="32" r="24" fill="#f4e4c1" stroke="#a7783e" stroke-width="2.5"/><path d="M32 12 l5 20 -5 20 -5 -20z" fill="#8a2f45"/><path d="M12 32 l20 -4 20 4 -20 4z" fill="#a7783e" opacity=".8"/><circle cx="32" cy="32" r="3" fill="#3a2a22"/>`,
  bac: `<path d="M10 54 h44 v-26 l-6 -6 v-10 h-6 v6 h-6 v-6 h-6 v6 h-6 v-6 h-6 v10 l-8 6z" fill="#3a2a5c"/><rect x="28" y="38" width="8" height="16" rx="4" fill="#ffd27a"/><path d="M32 6 v-4 l10 3 -10 3" fill="#c66a7e"/>`,
  opere: `<rect x="8" y="14" width="10" height="40" fill="#8a2f45"/><rect x="20" y="10" width="9" height="44" fill="#3d3a6e"/><rect x="31" y="18" width="11" height="36" fill="#2f5e4c"/><rect x="44" y="12" width="8" height="42" fill="#a8742f" transform="rotate(8 48 34)"/><rect x="4" y="54" width="56" height="5" fill="#6a4630"/>`,
  rezultate: `<path d="M32 8 l7 14 15 2 -11 10 3 15 -14 -7 -14 7 3 -15 -11 -10 15 -2z" fill="#e8bf5c" stroke="#a7783e" stroke-width="1.5"/><path d="M12 50 c-6 -8 -6 -18 0 -24 M52 50 c6 -8 6 -18 0 -24" stroke="#5f8a54" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  profil: `<circle cx="32" cy="24" r="12" fill="#f3e3c0" stroke="#a7783e" stroke-width="2"/><path d="M12 56 c2 -14 12 -20 20 -20 s18 6 20 20z" fill="#7a52a8"/><path d="M40 10 l8 -6" stroke="#c49a52" stroke-width="2"/>`,
  clasament: `<path d="M20 10 h24 v12 a12 12 0 0 1 -24 0z" fill="#e8bf5c" stroke="#a7783e" stroke-width="2"/><path d="M20 14 h-8 a8 8 0 0 0 8 10 M44 14 h8 a8 8 0 0 1 -8 10" stroke="#a7783e" stroke-width="2" fill="none"/><rect x="28" y="34" width="8" height="10" fill="#a7783e"/><rect x="18" y="44" width="28" height="8" rx="2" fill="#3a2a5c"/>`,
  limba: `<rect x="10" y="10" width="44" height="44" rx="6" fill="#f4e4c1" stroke="#a7783e" stroke-width="2"/><text x="32" y="44" text-anchor="middle" font-family="Georgia" font-size="30" fill="#8a2f45">Ă</text>`,
  jocuri: `<rect x="12" y="12" width="40" height="40" rx="8" fill="#f4e4c1" stroke="#a7783e" stroke-width="2" transform="rotate(-8 32 32)"/><circle cx="24" cy="24" r="3.5" fill="#3a2a5c"/><circle cx="40" cy="40" r="3.5" fill="#3a2a5c"/><circle cx="32" cy="32" r="3.5" fill="#8a2f45"/>`,
};
function emblemaPagina() {
  if (!estePoveste() || !S.profil || S.profil.rol !== "elev") return null;
  const d = EMBLEME[S.pag]; if (!d) return null;
  const s = h("span", { class: "emblema-pagina", "aria-hidden": "true" });
  s.innerHTML = `<svg viewBox="0 0 64 64">${d}</svg>`;
  return s;
}
function ciorchini() {
  // ramuri de glicină care atârnă din colțul de sus, cu frunze și flori în ciorchine
  let out = `<path d="M0 6 C70 30 150 10 260 22" stroke="#4b3328" stroke-width="5" fill="none"/>`;
  [[30, 18, 130], [78, 26, 175], [126, 22, 150], [170, 18, 200], [214, 22, 140]].forEach(([x, y, L], k) => {
    out += `<g class="ciorchine c${k % 3}" style="transform-origin:${x}px ${y}px">`;
    out += `<path d="M${x} ${y} q-3 ${L / 2} 2 ${L}" stroke="#56402f" stroke-width="2" fill="none"/>`;
    for (let j = 0; j < 9; j++) {
      const yy = y + 12 + j * (L / 10), r = 9 - j * .6, dx = (j % 2 ? 5 : -5) * (1 - j / 12);
      const cul = ["#b48fd8", "#9d75c9", "#c9a7e6", "#8a62b8"][(j + k) % 4];
      out += `<circle cx="${x + dx}" cy="${yy}" r="${r}" fill="${cul}"/><circle cx="${x - dx}" cy="${yy + 4}" r="${r * .8}" fill="${cul}" opacity=".85"/>`;
    }
    out += `<ellipse cx="${x + 14}" cy="${y + 8}" rx="12" ry="5" fill="#5f8a54" transform="rotate(25 ${x + 14} ${y + 8})"/><ellipse cx="${x - 13}" cy="${y + 10}" rx="11" ry="4.5" fill="#4f7a4a" transform="rotate(-30 ${x - 13} ${y + 10})"/></g>`;
  });
  return out;
}
function flori() {
  let out = `<path d="M0 220 C60 150 150 140 320 170 V220Z" fill="#3c2a45"/>`;
  const frunze = [[40, 170, -30], [90, 150, 20], [150, 160, -15], [210, 150, 25], [270, 165, -20], [120, 185, 10], [240, 190, -10]];
  frunze.forEach(([x, y, r]) => { out += `<ellipse cx="${x}" cy="${y}" rx="26" ry="9" fill="#4e7a4c" transform="rotate(${r} ${x} ${y})"/>`; });
  [[60, 140, 1], [110, 118, .9], [170, 132, 1.1], [228, 112, .95], [280, 138, .85], [140, 160, .8], [205, 158, .9]].forEach(([x, y, s], k) => {
    out += `<g class="floare f${k % 3}" transform="translate(${x} ${y}) scale(${s})">`;
    for (let p = 0; p < 5; p++) out += `<ellipse cx="0" cy="-9" rx="7" ry="10" fill="${["#b48fd8", "#9a72c8", "#c7a4e8"][k % 3]}" transform="rotate(${p * 72})"/>`;
    out += `<circle r="4.5" fill="#f3d58c"/></g>`;
  });
  return out;
}
function felinarSvg() {
  return `<svg viewBox="0 0 80 150" class="felinar-svg"><defs><radialGradient id="fl-sticla" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#fff2c4"/><stop offset=".55" stop-color="#ffc768"/><stop offset="1" stop-color="#d98a3a"/></radialGradient></defs>
    <path d="M40 2 v14" stroke="#2c1f1a" stroke-width="3"/><circle cx="40" cy="20" r="7" fill="none" stroke="#3a2a22" stroke-width="3"/>
    <path d="M18 34 h44 l-6 -8 h-32z" fill="#3a2a22"/><rect x="20" y="34" width="40" height="70" rx="3" fill="url(#fl-sticla)" class="flacara-sticla"/>
    <path d="M20 34 v70 M60 34 v70 M40 34 v70 M20 69 h40" stroke="#3a2a22" stroke-width="3" fill="none"/>
    <path d="M14 104 h52 l-6 10 h-40z" fill="#3a2a22"/><ellipse cx="40" cy="78" rx="5" ry="9" fill="#fffbe6" class="flacara"/></svg>`;
}
function pisicaSvg() {
  return `<svg viewBox="0 0 200 130" class="pisica-svg" role="img" aria-label="O pisică albă doarme pe un teanc de cărți">
    <rect x="8" y="92" width="184" height="18" rx="3" fill="#6d2c3f"/><rect x="8" y="96" width="184" height="3" fill="#c9a062"/>
    <rect x="18" y="108" width="168" height="18" rx="3" fill="#3f3266"/><rect x="18" y="112" width="168" height="3" fill="#c9a062"/>
    <rect x="186" y="94" width="5" height="14" fill="#efe2c7"/><rect x="182" y="110" width="5" height="14" fill="#efe2c7"/>
    <g class="respira">
      <path d="M150 88 C182 84 192 64 170 60" stroke="#efe9e4" stroke-width="12" fill="none" stroke-linecap="round"/>
      <ellipse cx="102" cy="70" rx="64" ry="26" fill="#f8f4ef"/><ellipse cx="108" cy="80" rx="54" ry="13" fill="#e9e0d8"/>
      <circle cx="48" cy="66" r="22" fill="#faf6f1"/>
      <path d="M32 52 L30 30 L46 46Z M58 46 L68 28 L68 52Z" fill="#faf6f1"/><path d="M34 48 L33 36 L42 45Z M60 46 L66 35 L66 50Z" fill="#f0c3c8"/>
      <path d="M38 66 q5 4 10 0 M54 66 q5 4 10 0" stroke="#8b7a80" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M49 73 l2 2 2 -2z" fill="#e59aa6"/><path d="M28 72 h-12 M28 76 h-11 M70 72 h12 M70 76 h11" stroke="#d8cfd0" stroke-width="1.2"/>
      <ellipse cx="66" cy="88" rx="14" ry="6" fill="#f8f4ef"/></g></svg>`;
}

/* =====================================================================
   DASHBOARDUL ELEVULUI: titlul, cartea cu capitole, panourile
   ===================================================================== */
function acasaPoveste() {
  const lucrari = S.predariElev;
  const deFacut = S.temeElev.filter(t => !lucrari.some(p => p.tema_id === t.id))
    .sort((a, b) => String(a.termen || "9999").localeCompare(String(b.termen || "9999")));
  notificariElev(); // termene și teme noi: notificările browserului + lista din „Noutăți”
  const t = deFacut[0];
  const continua = t ? ["#/tema/" + encodeURIComponent(t.id), "Continuă cu " + inGhilimele(t.titlu)] : ["#/bac", "Ai trimis toate temele: urmează o simulare BAC"];
  return [
    h("section", { class: "erou-poveste", "aria-labelledby": "titlu-poveste" },
      h("h1", { id: "titlu-poveste", class: "titlu-poveste" }, "Povestea Cunoașterii"),
      h("p", null, "Aici, temele, lecturile și provocările devin capitolele unei călătorii în lumea literaturii."),
      h("a", { class: "buton-calatorie", href: continua[0], title: continua[1], "aria-label": "Continuă călătoria: " + continua[1] },
        "Continuă călătoria", h("span", { "aria-hidden": "true" }, "→"))),
    h("div", { class: "masa-cartii" }, h("div", { class: "decor pisica" }, (() => { const d = h("div"); d.innerHTML = pisicaSvg(); return d.firstChild; })()), carteCapitole()),
    h("div", { class: "panouri-poveste" }, panouProvocari(deFacut), panouProgres(), panouInsigna()),
    h("div", { class: "rand-poveste" }, panouRezultateRecente(), panouRecomandare(deFacut)),
    noutatiElev()];
}

/* ---------- ultimele rezultate (doar note reale) ---------- */
function panouRezultateRecente() {
  const corectate = S.predariElev.filter(p => notaFinala(p) != null).sort((a, b) => String(b.trimis_la).localeCompare(String(a.trimis_la))).slice(0, 3);
  return h("section", { class: "panou-poveste mic", "aria-labelledby": "pr-titlu" },
    h("h2", { id: "pr-titlu", class: "panou-titlu" }, "Ultimele rezultate"),
    corectate.length ? h("ul", { class: "lista-rezultate" }, corectate.map(p => { const t = S.temeElev.find(x => x.id === p.tema_id), n = notaFinala(p);
      return h("li", null, h("a", { href: "#/tema/" + encodeURIComponent(p.tema_id) }, h("span", { class: "rez-titlu" }, t ? t.titlu : "Temă"),
        h("span", { class: "muted small" }, fmtData(p.trimis_la)), h("b", { class: "nota-medalion" + (n < 5 ? " fail" : "") }, fmtNota(n)))); }))
      : h("p", { class: "muted small" }, "Notele apar aici după ce primele teme sunt corectate."),
    h("a", { class: "link-btn small", href: "#/rezultate" }, "Cronica progresului →"));
}
/* ---------- activitatea recomandată: din termene și din greșelile reale ---------- */
function panouRecomandare(deFacut) {
  const urgenta = deFacut.find(t => { const z = zileRamase(t.termen); return z != null && z <= 1; });
  let titlu, text, buton;
  if (urgenta) { titlu = "Termină " + inGhilimele(urgenta.titlu); text = zileRamase(urgenta.termen) < 0 ? "Termenul a trecut; trimite-o cât poți de repede." : "Are termen foarte curând."; buton = ["Deschide tema", "#/tema/" + encodeURIComponent(urgenta.id)]; }
  else {
    const r = typeof recomandariBac === "function" ? recomandariBac()[0] : null;
    if (r) { titlu = r.titlu; text = r.text; buton = [r.act[0][0], null, r.act[0][1]]; }
    else if (deFacut[0]) { titlu = "Începe " + inGhilimele(deFacut[0].titlu); text = "E următoarea temă din listă."; buton = ["Deschide tema", "#/tema/" + encodeURIComponent(deFacut[0].id)]; }
    else { titlu = "Recapitulează o operă"; text = "Fișele din bibliotecă te ajută să-ți împrospătezi lecturile pentru BAC."; buton = ["Deschide biblioteca", "#/opere"]; }
  }
  return h("section", { class: "panou-poveste mic recomandat", "aria-labelledby": "ra-titlu" },
    h("h2", { id: "ra-titlu", class: "panou-titlu" }, h("span", { class: "stea-mica", "aria-hidden": "true" }, "✦ "), "Activitatea recomandată"),
    h("b", { class: "rec-titlu" }, titlu), h("p", { class: "small" }, text),
    buton[1] ? h("a", { class: "btn mic", href: buton[1] }, buton[0], " →") : h("button", { type: "button", class: "btn mic", onclick: buton[2] }, buton[0], " →"));
}

/* ---------- cartea deschisă: patru capitole, fiecare un link real ---------- */
const CAPITOLE = [
  { k: "teme", titlu: "Temele mele", sub: "Primele provocări", pata: "#d9c4ee", ilustr: "pergament" },
  { k: "calendar", titlu: "Calendar", sub: "Planul aventurii", pata: "#cfe5cf", ilustr: "calendar" },
  { k: "bac", titlu: "Pregătire BAC", sub: "Marea încercare", pata: "#f5ddb8", ilustr: "toca" },
  { k: "opere", titlu: "Bibliotecă", sub: "Lumea operelor", pata: "#f1c9d3", ilustr: "carti" }];
/* Obiectele celor patru capitole, desenate cu volum: lumina vine din stânga-sus, fiecare obiect are fețe laterale,
   umbră proprie pe hârtie și detalii de material (hârtie, lemn, metal, pânză). */
const ILUSTRATII = {
  pergament: `<svg viewBox="0 0 140 110"><defs>
      <linearGradient id="pg-hartie" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf0d6"/><stop offset=".6" stop-color="#efdcb0"/><stop offset="1" stop-color="#dcc08a"/></linearGradient>
      <linearGradient id="pg-sul" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98a4c"/><stop offset=".28" stop-color="#f6e2b4"/><stop offset=".55" stop-color="#e0bf83"/><stop offset="1" stop-color="#94672e"/></linearGradient>
      <radialGradient id="pg-capat" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#9a6a3a"/><stop offset="1" stop-color="#4f3018"/></radialGradient>
      <linearGradient id="pg-pana" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffdf8"/><stop offset=".55" stop-color="#ece4f2"/><stop offset="1" stop-color="#b8a4cf"/></linearGradient>
      <linearGradient id="pg-penita" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dfa6"/><stop offset=".5" stop-color="#b8893a"/><stop offset="1" stop-color="#6e4c1c"/></linearGradient>
      <radialGradient id="pg-ceara" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#c4566e"/><stop offset=".7" stop-color="#8d2f47"/><stop offset="1" stop-color="#5e1c2e"/></radialGradient>
      <filter id="pg-umbra" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="2" dy="5" stdDeviation="3" flood-color="#5a3a1a" flood-opacity=".35"/></filter></defs>
    <ellipse cx="66" cy="99" rx="48" ry="6" fill="#6b4a26" opacity=".22"/>
    <g filter="url(#pg-umbra)">
      <path d="M26 30 C46 27 74 28 98 30 L97 80 C74 82 46 81 25 83 Z" fill="url(#pg-hartie)"/>
      <path d="M26 30 C46 27 74 28 98 30 L98 36 C74 34 46 33 26 36 Z" fill="#c9a66a" opacity=".35"/>
      <path d="M34 45 C52 43.5 70 44 88 45 M34 53 C50 51.6 66 52 82 52.8 M34 61 C52 59.6 70 60 88 61 M34 69 C46 68 58 68.2 70 68.8" stroke="#8a6a44" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".75"/>
      <rect x="18" y="20" width="88" height="13" rx="6.5" fill="url(#pg-sul)"/><ellipse cx="18" cy="26.5" rx="5" ry="6.5" fill="url(#pg-capat)"/><ellipse cx="106" cy="26.5" rx="5" ry="6.5" fill="url(#pg-capat)"/>
      <rect x="22" y="22.5" width="78" height="2.4" rx="1.2" fill="#fff8e2" opacity=".75"/>
      <rect x="17" y="78" width="90" height="13" rx="6.5" fill="url(#pg-sul)"/><ellipse cx="17" cy="84.5" rx="5" ry="6.5" fill="url(#pg-capat)"/><ellipse cx="107" cy="84.5" rx="5" ry="6.5" fill="url(#pg-capat)"/>
      <rect x="21" y="80.5" width="80" height="2.4" rx="1.2" fill="#fff8e2" opacity=".75"/>
      <circle cx="84" cy="70" r="8.5" fill="url(#pg-ceara)"/><path d="M80 70 l3 3 6 -7" stroke="#f2c9d1" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".85"/>
      <path d="M77 66 c-2 -3 -1 -6 2 -7" stroke="#e98aa0" stroke-width="1.2" fill="none" opacity=".5"/></g>
    <g filter="url(#pg-umbra)" transform="rotate(-8 108 50)">
      <path d="M96 76 C99 56 108 30 128 10 C130 30 120 58 100 78 Z" fill="url(#pg-pana)"/>
      <path d="M99 74 C103 60 112 38 126 14" stroke="#7d6a94" stroke-width="1.3" fill="none"/>
      <path d="M104 62 l8 -3 M107 54 l9 -4 M110 46 l9 -5 M114 38 l8 -6 M101 70 l6 -1" stroke="#a796c0" stroke-width=".9" fill="none" opacity=".8"/>
      <path d="M96 76 L92 90 L99 79 Z" fill="url(#pg-penita)"/><path d="M95.5 80 l-1.6 6" stroke="#4a3312" stroke-width=".8"/></g></svg>`,
  calendar: `<svg viewBox="0 0 140 110"><defs>
      <linearGradient id="cl-fata" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#efe2c8"/></linearGradient>
      <linearGradient id="cl-lateral" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9c6a0"/><stop offset="1" stop-color="#b9a27a"/></linearGradient>
      <linearGradient id="cl-cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b4566f"/><stop offset=".5" stop-color="#8a3550"/><stop offset="1" stop-color="#6a2238"/></linearGradient>
      <linearGradient id="cl-inel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b6b73"/><stop offset=".45" stop-color="#f2f2f5"/><stop offset="1" stop-color="#55555c"/></linearGradient>
      <linearGradient id="cl-bifa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fbf83"/><stop offset="1" stop-color="#257a4a"/></linearGradient>
      <filter id="cl-umbra" x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="3" dy="5" stdDeviation="3" flood-color="#5a3a1a" flood-opacity=".33"/></filter></defs>
    <ellipse cx="70" cy="100" rx="44" ry="6" fill="#6b4a26" opacity=".22"/>
    <g filter="url(#cl-umbra)">
      <path d="M100 24 L108 30 L108 92 L100 88 Z" fill="url(#cl-lateral)"/>
      <path d="M36 88 L100 88 L108 92 L44 92 Z" fill="#c9b48c"/>
      <path d="M38 89.5 h62 M40 91 h64" stroke="#fff6e2" stroke-width=".7" opacity=".8"/>
      <rect x="36" y="24" width="64" height="64" rx="4" fill="url(#cl-fata)"/>
      <path d="M36 28 a4 4 0 0 1 4 -4 h56 a4 4 0 0 1 4 4 v14 h-64 z" fill="url(#cl-cap)"/>
      <rect x="40" y="27" width="56" height="2" rx="1" fill="#e9a5b6" opacity=".55"/>
      ${[48, 62, 76, 90].map(x => `<rect x="${x - 3}" y="14" width="6" height="18" rx="3" fill="url(#cl-inel)"/><ellipse cx="${x}" cy="33" rx="3.6" ry="1.6" fill="#3a1220" opacity=".55"/>`).join("")}
      <g>${[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${42 + c * 11}" y="${48 + r * 9.5}" width="8" height="6.5" rx="1.4" fill="#ead9b6"/><rect x="${42 + c * 11}" y="${48 + r * 9.5}" width="8" height="1.4" rx=".7" fill="#c9b28a" opacity=".6"/>`).join("")).join("")}</g>
      <rect x="64" y="57.5" width="8" height="6.5" rx="1.4" fill="#f6c6d2"/>
      <path d="M93 88 L100 81 L100 88 Z" fill="#d8c19a"/><path d="M93 88 L100 81" stroke="#fff6e2" stroke-width=".8"/></g>
    <g filter="url(#cl-umbra)"><path d="M58 70 l9 9 22 -26" stroke="#1d5a36" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".35" transform="translate(1.5 2)"/>
      <path d="M58 70 l9 9 22 -26" stroke="url(#cl-bifa)" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M60 69 l7 7 20 -23" stroke="#bdf0cf" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/></g></svg>`,
  toca: `<svg viewBox="0 0 140 110"><defs>
      <linearGradient id="tc-sus" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6e5c9e"/><stop offset=".5" stop-color="#4a3a74"/><stop offset="1" stop-color="#2e2350"/></linearGradient>
      <linearGradient id="tc-muchie" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2048"/><stop offset="1" stop-color="#171128"/></linearGradient>
      <linearGradient id="tc-corp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2c2148"/><stop offset=".35" stop-color="#4b3b72"/><stop offset=".7" stop-color="#2f2450"/><stop offset="1" stop-color="#1c142f"/></linearGradient>
      <linearGradient id="tc-aur" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe3a2"/><stop offset=".5" stop-color="#d4a34a"/><stop offset="1" stop-color="#8f6420"/></linearGradient>
      <radialGradient id="tc-buton" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff0c4"/><stop offset="1" stop-color="#b8862f"/></radialGradient>
      <filter id="tc-umbra" x="-20%" y="-20%" width="150%" height="170%"><feDropShadow dx="2" dy="6" stdDeviation="3.2" flood-color="#2a1a3a" flood-opacity=".38"/></filter></defs>
    <ellipse cx="70" cy="100" rx="46" ry="6" fill="#4a3060" opacity=".22"/>
    <g filter="url(#tc-umbra)">
      <path d="M42 54 L42 74 C52 86 88 86 98 74 L98 54 Z" fill="url(#tc-corp)"/>
      <path d="M46 74 C58 82 82 82 94 74" stroke="#6a5a94" stroke-width="1.5" fill="none" opacity=".55"/>
      <path d="M70 18 L126 40 L70 62 L14 40 Z" fill="url(#tc-sus)"/>
      <path d="M14 40 L70 62 L70 66 L14 44 Z" fill="url(#tc-muchie)"/><path d="M126 40 L70 62 L70 66 L126 44 Z" fill="#231a3c"/>
      <path d="M70 21 L120 40 L70 24.5 L20 40 Z" fill="#8f7cc0" opacity=".35"/>
      <path d="M70 40 C86 44 104 46 110 50 L110 76" stroke="url(#tc-aur)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M106 76 h8 l2 16 c-4 3 -8 3 -12 0 z" fill="url(#tc-aur)"/>
      <path d="M107.5 80 v12 M110 80 v13 M112.5 80 v12" stroke="#8f6420" stroke-width=".8" opacity=".7"/>
      <rect x="105" y="72" width="10" height="5" rx="2" fill="url(#tc-aur)"/>
      <ellipse cx="70" cy="40" rx="5" ry="3" fill="url(#tc-buton)"/><ellipse cx="68.5" cy="39" rx="1.6" ry=".9" fill="#fff8e0" opacity=".9"/></g></svg>`,
  carti: `<svg viewBox="0 0 140 110"><defs>
      <linearGradient id="ct-pagini" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf2dc"/><stop offset="1" stop-color="#e2cfa4"/></linearGradient>
      <linearGradient id="ct-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8405c"/><stop offset=".5" stop-color="#7d2a43"/><stop offset="1" stop-color="#561a2d"/></linearGradient>
      <linearGradient id="ct-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a5296"/><stop offset=".5" stop-color="#3e3870"/><stop offset="1" stop-color="#28234c"/></linearGradient>
      <linearGradient id="ct-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8a6c"/><stop offset=".5" stop-color="#2f6049"/><stop offset="1" stop-color="#1d4031"/></linearGradient>
      <linearGradient id="ct-aur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f6420"/><stop offset=".5" stop-color="#f3d58e"/><stop offset="1" stop-color="#8f6420"/></linearGradient>
      <filter id="ct-umbra" x="-20%" y="-20%" width="150%" height="170%"><feDropShadow dx="2" dy="4" stdDeviation="2.4" flood-color="#3a2410" flood-opacity=".35"/></filter></defs>
    <ellipse cx="70" cy="101" rx="50" ry="6" fill="#6b4a26" opacity=".22"/>
    ${[["ct-r", 22, 74, 96, 0], ["ct-v", 28, 54, 86, -3], ["ct-g", 34, 34, 74, 4]].map(([g, x, y, w, rot]) => `<g filter="url(#ct-umbra)" transform="rotate(${rot} ${x + w / 2} ${y + 9})">
      <path d="M${x + 6} ${y - 6} h${w} l-6 6 h-${w} z" fill="url(#${g})" opacity=".85"/><path d="M${x + 7} ${y - 5} h${w - 2}" stroke="#fff" stroke-width=".8" opacity=".25"/>
      <rect x="${x}" y="${y}" width="${w}" height="18" rx="2.5" fill="url(#${g})"/>
      <path d="M${x + w} ${y} l6 -6 v18 l-6 6 z" fill="url(#ct-pagini)"/>
      <path d="M${x + w + 1.5} ${y + 2} l3 -3 M${x + w + 1.5} ${y + 6} l3 -3 M${x + w + 1.5} ${y + 10} l3 -3 M${x + w + 1.5} ${y + 14} l3 -3" stroke="#c4a87a" stroke-width=".6"/>
      <rect x="${x + 10}" y="${y + 3}" width="${w - 20}" height="1.6" fill="url(#ct-aur)"/><rect x="${x + 10}" y="${y + 13.4}" width="${w - 20}" height="1.6" fill="url(#ct-aur)"/>
      <rect x="${x + w / 2 - 10}" y="${y + 7}" width="20" height="4" rx="1" fill="url(#ct-aur)" opacity=".85"/>
      <rect x="${x + 2}" y="${y + 1.2}" width="${w - 4}" height="1.4" rx=".7" fill="#fff" opacity=".18"/></g>`).join("")}
    <path d="M90 34 v-14 l4 3 4 -3 v14" fill="#b03a56" filter="url(#ct-umbra)"/><path d="M91 21 v12" stroke="#e48aa0" stroke-width=".8" opacity=".6"/></svg>`,
};
const ORNAMENT_COLT = `<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M4 56 C4 30 14 14 40 6 M4 56 C14 40 26 34 44 34 M14 46 c6 -2 10 -8 10 -14 M30 20 c4 2 8 2 12 -2" fill="none" stroke="#c49a52" stroke-width="2" stroke-linecap="round"/><circle cx="40" cy="6" r="3" fill="#c49a52"/><circle cx="44" cy="34" r="2.5" fill="#c49a52"/><path d="M20 30 c-4 -6 -2 -12 4 -14 c0 6 -2 10 -4 14z" fill="#b58fd0" opacity=".8"/></svg>`;

function carteCapitole() {
  // obiectul se înclină ușor după mouse, ca un obiect real pus pe pagină (nu și cu animațiile oprite)
  const inclina = e => {
    if (MISCARE_REDUSA() || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    e.currentTarget.style.setProperty("--ry", (x * 18).toFixed(1) + "deg"); e.currentTarget.style.setProperty("--rx", (-y * 14).toFixed(1) + "deg");
  };
  const reseteaza = e => { e.currentTarget.style.removeProperty("--rx"); e.currentTarget.style.removeProperty("--ry"); };
  const capitol = (c, nr) => h("a", { class: "capitol", href: "#/" + c.k, style: "--pata:" + c.pata, "data-ch": nr,
      onpointermove: inclina, onpointerleave: reseteaza,
      onclick: e => intoarcePagina(e, c.k, nr > 2 ? "dr" : "st") },
    h("span", { class: "cap-ilustr", "aria-hidden": "true" }, (() => { const s = h("span"); s.innerHTML = ILUSTRATII[c.ilustr]; return s.firstChild; })()),
    h("span", { class: "cap-titlu" }, c.titlu), h("span", { class: "cap-sub" }, c.sub),
    h("span", { class: "cap-sageata", "aria-hidden": "true" }, "→"));
  const colt = cls => { const d = h("span", { class: "colt " + cls, "aria-hidden": "true" }); d.innerHTML = ORNAMENT_COLT; return d; };
  return h("nav", { class: "carte-poveste", "aria-label": "Capitolele tale" },
    h("div", { class: "carte-umbra", "aria-hidden": "true" }),
    h("div", { class: "carte-corp" },
      h("div", { class: "pagina-carte st" }, colt("ss"), colt("js"), capitol(CAPITOLE[0], 1), capitol(CAPITOLE[1], 2)),
      h("div", { class: "cotor", "aria-hidden": "true" }),
      h("div", { class: "pagina-carte dr" }, colt("sd"), colt("jd"), capitol(CAPITOLE[2], 3), capitol(CAPITOLE[3], 4)),
      h("div", { class: "foaie-intoarsa", "aria-hidden": "true" }, h("span", { class: "umbra-foaie" })),
      // trei foi care se răsfoiesc când se deschide cartea
      [1, 2, 3].map(i => h("div", { class: "foaie-deschidere d" + i, "aria-hidden": "true" }))),
    h("h2", { class: "carte-titlu" }, h("span", { "aria-hidden": "true" }, "✦ "), "Capitolele tale", h("span", { "aria-hidden": "true" }, " ✦")),
    h("span", { class: "semn-carte", "aria-hidden": "true" }));
}
/* la alegerea unui capitol, o foaie se întoarce scurt, apoi se deschide pagina (fără animație dacă utilizatorul a cerut mișcare redusă) */
function intoarcePagina(e, pag, parte) {
  if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || MISCARE_REDUSA()) return;
  e.preventDefault();
  const carte = e.currentTarget.closest(".carte-poveste");
  carte.classList.add("intoarce", "intoarce-" + parte);
  setTimeout(() => mergi(pag), 480);
}

/* ---------- panoul „Următoarele provocări”: teme reale ---------- */
function panouProvocari(deFacut) {
  const azi = ziISO(Date.now());
  const trimiseRecent = S.temeElev.filter(t => S.predariElev.some(p => p.tema_id === t.id))
    .sort((a, b) => { const pa = S.predariElev.find(p => p.tema_id === a.id), pb = S.predariElev.find(p => p.tema_id === b.id); return String(pb.trimis_la).localeCompare(String(pa.trimis_la)); });
  const lista = [...deFacut.slice(0, 3), ...trimiseRecent.slice(0, Math.max(0, 3 - Math.min(3, deFacut.length)))].slice(0, 3);
  const zileTermen = t => { const z = zileRamase(t.termen); return z == null ? null : z; };
  const exersatAzi = !!citesteLocal(cheieElev("exersat-" + azi), "");
  return h("section", { class: "panou-poveste provocari", "aria-labelledby": "pp-titlu" },
    h("h2", { id: "pp-titlu", class: "panou-titlu" }, "Următoarele provocări"),
    lista.length ? h("ul", { class: "lista-provocari" }, lista.map(t => {
      const p = S.predariElev.find(x => x.tema_id === t.id), z = zileTermen(t);
      return h("li", { class: p ? "gata" : z != null && z < 0 ? "restanta" : z != null && z <= 1 ? "curand" : "" },
        h("a", { href: "#/tema/" + encodeURIComponent(t.id), "aria-label": `${t.titlu}${p ? ", trimisă" : ""}${t.termen ? ", termen " + fmtZi(t.termen) : ""}` },
          h("span", { class: "bifa-poveste", "aria-hidden": "true" }, p ? "✓" : ""),
          h("span", { class: "prov-titlu" }, t.titlu),
          t.termen ? h("span", { class: "prov-data" }, h("span", { "aria-hidden": "true" }, iconitaCalendar()), new Date(t.termen + "T12:00:00").toLocaleDateString("ro-RO", { day: "numeric", month: "short" })) : null));
    })) : h("p", { class: "muted small" }, "Nicio temă încă. Când profesorul publică una, apare aici."),
    h("a", { class: "prov-exercitiu" + (exersatAzi ? " gata" : ""), href: "#/limba", onclick: () => scrieLocal(cheieElev("exersat-" + azi), "1") },
      h("span", { class: "bifa-poveste", "aria-hidden": "true" }, exersatAzi ? "✓" : ""), h("span", null, h("b", null, "Exercițiul zilei"), " · 5 minute de DOOM și gramatică")),
    h("a", { class: "link-btn small", href: "#/teme" }, "Toate temele →"));
}
function iconitaCalendar() { const s = h("span", { class: "ic-cal" }); s.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>`; return s; }

/* ---------- panoul „Progresul călătoriei”: procente din date reale ---------- */
function panouProgres() {
  const total = S.temeElev.length, trimise = S.predariElev.length;
  const procent = total ? Math.round(trimise / total * 100) : 0;
  const ist = istoricAntrenamente(); // date reale (în demonstrație: exemplele din modul demo)
  const bac = ist.length ? Math.round(ist.reduce((s, x) => s + x.nota, 0) / ist.length * 10) : 0;
  const citite = Object.values(citesteJSON(cheieElev("citite"), {})).filter(x => x && x.citit).length;
  const lectura = Math.round(citite / OPERE.length * 100);
  const note = S.predariElev.filter(p => notaFinala(p) != null).sort((a, b) => String(a.trimis_la).localeCompare(String(b.trimis_la))).map(notaFinala);
  const L = 2 * Math.PI * 52;
  const inel = h("div", { class: "inel-poveste", role: "img", "aria-label": `${procent}% din teme trimise (${trimise} din ${total})` });
  inel.innerHTML = `<svg viewBox="0 0 132 132"><defs><linearGradient id="ip-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d5bc4"/><stop offset=".55" stop-color="#5e9aa8"/><stop offset="1" stop-color="#d9a94e"/></linearGradient></defs>
    <circle cx="66" cy="66" r="52" fill="none" stroke="#ece0c7" stroke-width="11"/>
    <circle class="arc-poveste" cx="66" cy="66" r="52" fill="none" stroke="url(#ip-g)" stroke-width="11" stroke-linecap="round" transform="rotate(-90 66 66)"
      stroke-dasharray="${L.toFixed(1)}" style="--plin:${(L * (1 - procent / 100)).toFixed(1)};--gol:${L.toFixed(1)}" stroke-dashoffset="${(L * (1 - procent / 100)).toFixed(1)}"/>
    <path d="M18 92 c-6 -10 -6 -22 0 -30 M14 82 c-8 0 -10 -6 -10 -10 M20 104 c-8 2 -12 -2 -14 -6 M114 92 c6 -10 6 -22 0 -30 M118 82 c8 0 10 -6 10 -10 M112 104 c8 2 12 -2 14 -6" stroke="#7d9a6a" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>
    <span class="inel-val">${procent}%</span>`;
  const bara = (eticheta, ic, v, cls, titlu) => h("div", { class: "bara-poveste " + cls, title: titlu },
    h("span", { class: "bp-ic", "aria-hidden": "true" }, ic), h("span", { class: "bp-et" }, eticheta),
    h("div", { class: "xp", role: "progressbar", "aria-label": eticheta, "aria-valuenow": v, "aria-valuemin": 0, "aria-valuemax": 100 }, h("span", { style: `width:${v}%` })));
  return h("section", { class: "panou-poveste progres", "aria-labelledby": "pg-titlu" },
    h("h2", { id: "pg-titlu", class: "panou-titlu" }, h("span", { class: "stea-mica", "aria-hidden": "true" }, "✦ "), "Progresul călătoriei"),
    h("div", { class: "progres-corp" }, inel,
      h("div", { class: "bare-poveste" },
        bara("Teme", "📖", procent, "teme", `${trimise} din ${total} teme trimise`),
        bara("BAC", "🎓", bac, "bac", ist.length ? `media antrenamentelor: ${fmtNota(bac / 10)}` : "nicio simulare încă"),
        bara("Lectură", "📚", lectura, "lectura", `${citite} din ${OPERE.length} opere citite`))),
    note.length > 1 ? h("div", { class: "evolutie-mica" }, h("span", { class: "muted small" }, "Evoluția notelor"), sparkline(note.slice(-8))) : null);
}

/* ---------- insignele: doar cele obținute cu adevărat ---------- */
function insigneObtinute() {
  const lucrari = S.predariElev || [], note = lucrari.map(notaFinala).filter(n => n != null);
  const citite = Object.values(citesteJSON(cheieElev("citite"), {})).filter(x => x && x.citit).length;
  const ant = citesteJSON("antrenamente", []), sim = ant.filter(x => x.bac).length;
  const stap = Object.values(citesteJSON(cheieElev("flash"), {})).filter(c => c >= 4).length;
  const libere = lucrari.some(p => Object.values(p.rezultate || {}).some(r => r.max >= 2 && r.puncte === r.max));
  const fara = lucrari.some(p => { const r = Object.values(p.rezultate || {}); return r.length && r.every(x => x.corect); });
  return [
    { n: "Primul pas", d: "Ai trimis prima temă.", ok: lucrari.length >= 1, ic: "pana" },
    { n: "Fără greșeală", d: "O temă rezolvată perfect.", ok: fara, ic: "stea" },
    { n: "Nota 10", d: "Ai obținut nota maximă.", ok: note.some(n => n >= 10), ic: "coroana" },
    { n: "Condei de aur", d: "Punctaj maxim la un răspuns liber.", ok: libere, ic: "pana" },
    { n: "Scriitor atent", d: "Ai finalizat 5 teme.", ok: lucrari.length >= 5, ic: "pana" },
    { n: "Cititor", d: "5 opere citite din programă.", ok: citite >= 5, ic: "carte" },
    { n: "Prima simulare", d: "Ai dat o simulare BAC completă.", ok: sim >= 1, ic: "toca" },
    { n: "Teoretician", d: "10 termeni literari stăpâniți.", ok: stap >= 10, ic: "stea" },
    { n: "Maratonist BAC", d: "10 simulări BAC.", ok: sim >= 10, ic: "toca" }];
}
function scutSvg(ic, blocat) {
  const simbol = { pana: `<path d="M58 30 C46 44 40 58 38 72 C50 62 60 48 64 34Z" fill="#f5e6c4"/><path d="M38 72 l-4 8" stroke="#f5e6c4" stroke-width="3" stroke-linecap="round"/>`,
    stea: `<path d="M50 30 l6 13 14 1 -11 9 4 14 -13 -8 -13 8 4 -14 -11 -9 14 -1z" fill="#f5e6c4"/>`,
    coroana: `<path d="M32 62 l4 -24 10 12 4 -16 4 16 10 -12 4 24z" fill="#f5e6c4"/>`,
    carte: `<path d="M30 40 c8 -4 14 -4 20 2 c6 -6 12 -6 20 -2 v28 c-8 -4 -14 -4 -20 2 c-6 -6 -12 -6 -20 -2z" fill="#f5e6c4"/><path d="M50 42 v28" stroke="#6b4a8e" stroke-width="2"/>`,
    toca: `<path d="M50 32 l24 10 -24 10 -24 -10z M36 48 v10 c8 6 20 6 28 0 v-10" fill="#f5e6c4"/>` }[ic];
  return `<svg viewBox="0 0 100 110" class="scut${blocat ? " blocat" : ""}"><defs><linearGradient id="sc-aur" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d68c"/><stop offset=".5" stop-color="#c9963f"/><stop offset="1" stop-color="#f0c96f"/></linearGradient>
    <linearGradient id="sc-vi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b55a8"/><stop offset="1" stop-color="#3f2864"/></linearGradient></defs>
    <path d="M50 6 L88 18 V52 C88 78 70 96 50 104 C30 96 12 78 12 52 V18Z" fill="url(#sc-aur)"/>
    <path d="M50 14 L80 24 V52 C80 72 66 87 50 94 C34 87 20 72 20 52 V24Z" fill="url(#sc-vi)"/>${simbol}
    <path d="M8 70 c-6 8 -4 18 4 24 M92 70 c6 8 4 18 -4 24" stroke="#c9963f" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
}
function panouInsigna() {
  const toate = insigneObtinute(), obt = toate.filter(x => x.ok);
  const ultima = obt[obt.length - 1];
  // animație și anunț doar când numărul insignelor a crescut față de ultima vizită (nicio insignă inventată)
  const cheie = cheieElev("insigne-vazute"), vazute = Number(citesteLocal(cheie, "-1"));
  const noua = vazute >= 0 && obt.length > vazute;
  if (obt.length !== vazute && !S.demo) scrieLocal(cheie, String(obt.length));
  if (noua && ultima) setTimeout(() => toast(`Insignă nouă: „${ultima.n}”. Felicitări!`), 600);
  return h("section", { class: "panou-poveste insigna" + (noua ? " noua" : ""), "aria-labelledby": "pi-titlu" },
    h("h2", { id: "pi-titlu", class: "panou-titlu" }, h("span", { "aria-hidden": "true" }, "✦ "), ultima ? "Insignă obținută" : "Prima insignă", h("span", { "aria-hidden": "true" }, " ✦")),
    h("div", { class: "insigna-scena" }, (() => { const d = h("div", { class: "scut-wrap" }); d.innerHTML = scutSvg(ultima ? ultima.ic : "pana", !ultima); return d; })()),
    ultima ? h("b", { class: "insigna-nume" }, ultima.n) : h("b", { class: "insigna-nume" }, "Te așteaptă"),
    h("span", { class: "insigna-desc" }, ultima ? ultima.d : "Trimite prima temă ca s-o obții."),
    h("a", { class: "insigna-link", href: "#/rezultate" }, `${obt.length} din ${toate.length} insigne →`));
}

/* =====================================================================
   PAGINA „REZULTATE”: jurnalul progresului (note, tipuri de exerciții, BAC, insigne)
   ===================================================================== */
function paginaRezultate() {
  const lucrari = S.predariElev || [];
  const corectate = lucrari.filter(p => notaFinala(p) != null).sort((a, b) => String(b.trimis_la).localeCompare(String(a.trimis_la)));
  const note = corectate.map(notaFinala), media = note.length ? note.reduce((a, b) => a + b, 0) / note.length : null;
  const ins = insigneObtinute(), ist = istoricAntrenamente();
  const bac = ist.length ? ist.reduce((s, x) => s + x.nota, 0) / ist.length : null;
  return [capPagina("Rezultate", "Notele, progresul pe tipuri de exerciții, antrenamentele BAC și insignele tale, într-un singur jurnal."),
    h("div", { class: "cifre" },
      cifra("Media", media == null ? "–" : fmtNota(media), note.length ? `din ${note.length} ${note.length === 1 ? "notă" : "note"}` : "nicio notă încă", "✓", "var(--c3)"),
      cifra("Teme trimise", `${lucrari.length}/${S.temeElev.length}`, "din temele publicate", "▤", "var(--c4)"),
      cifra("Insigne", `${ins.filter(x => x.ok).length}/${ins.length}`, "obținute", "★", "var(--c2)"),
      cifra("Antrenamente BAC", ist.length, bac == null ? "niciunul încă" : `media ${fmtNota(bac)}`, "◎", "var(--c5)", "#/bac")),
    h("section", { class: "sheet stack", style: "--acc:var(--c4)" }, h("h3", null, "Notele tale"),
      corectate.length ? h("div", { class: "tbl-wrap" }, h("table", { class: "tabel-carduri" },
        h("thead", null, h("tr", null, h("th", null, "Tema"), h("th", null, "Trimisă"), h("th", null, "Corectare"), h("th", null, "Nota"))),
        h("tbody", null, corectate.map(p => { const t = S.temeElev.find(x => x.id === p.tema_id), n = notaFinala(p);
          return h("tr", null, h("td", { "data-label": "Tema" }, t ? h("a", { href: "#/tema/" + encodeURIComponent(t.id), class: "link-btn" }, t.titlu) : "Temă"),
            h("td", { "data-label": "Trimisă", class: "small" }, fmtData(p.trimis_la)),
            h("td", { "data-label": "Corectare" }, p.nota_profesor != null ? h("span", { class: "sursa prof" }, "nota profesorului") : h("span", { class: "sursa auto" }, "calculată automat")),
            h("td", { "data-label": "Nota" }, h("span", { class: "nota" + (n < 5 ? " fail" : "") }, fmtNota(n)))); })))) : h("p", { class: "muted small" }, "Notele apar aici după ce temele sunt corectate."),
      note.length > 1 ? h("div", null, h("div", { class: "label" }, "Evoluția notelor (de la cea mai veche)"), sparkline(note.slice().reverse())) : null),
    typeof feedbackPrimit === "function" ? feedbackPrimit() : null,
    statisticiTipuriView(),
    ist.length > 1 ? h("section", { class: "sheet stack", style: "--acc:var(--c5)" }, h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Antrenamentele BAC"),
      h("button", { type: "button", class: "link-btn small", onclick: () => { S.subBac = "progres"; mergi("bac"); } }, "Progresul BAC complet →")), graficNote(ist.slice().sort((a, b) => a.data - b.data))) : null,
    h("section", { class: "sheet stack galerie-insigne", style: "--acc:var(--c2)" }, h("h3", null, "Insignele tale"),
      h("div", { class: "grila-insigne" }, ins.map(x => h("div", { class: "insigna-mare" + (x.ok ? "" : " blocata") },
        (() => { const d = h("div", { class: "scut-mic" }); d.innerHTML = scutSvg(x.ic, !x.ok); return d; })(), h("b", null, x.n), h("span", { class: "muted small" }, x.ok ? x.d : "Încă nu: " + x.d.charAt(0).toLowerCase() + x.d.slice(1)))))),
    insigneExtraView()];
}
