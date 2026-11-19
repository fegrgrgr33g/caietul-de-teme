/* Caietul de teme — cartea veche, în 3D adevărat (three.js, randare live în pagină).
   O carte legată în piele stă deschisă pe un pupitru de lemn, lângă o lumânare aprinsă. Cele patru capitole
   sunt scrise și gravate pe pagini. La intrarea pe pagina principală camera se apropie, coperta se deschide
   pe cotor și câteva foi se răsfoiesc. Lumânarea pâlpâie, semnul de carte se mișcă, praful plutește în lumină.
   Un clic pe un capitol întoarce o foaie și deschide pagina. Fără WebGL rămâne cartea desenată în pagină.
   Biblioteca se încarcă doar când pagina principală are nevoie de ea. */
"use strict";

const TREI_D = { lib: null, carte: null };
const URL_THREE = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

function areWebGL() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch { return false; }
}
function incarcaThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (TREI_D.lib) return TREI_D.lib;
  return TREI_D.lib = new Promise((ok, nu) => {
    const s = document.createElement("script"); s.src = URL_THREE; s.async = true;
    s.onload = () => window.THREE ? ok(window.THREE) : nu(new Error("three"));
    s.onerror = () => { TREI_D.lib = null; nu(new Error("three")); };
    document.head.append(s);
  });
}

/* apelat după fiecare desen (din viu.js): pune cartea (creată o singură dată) în locul ei de pe pagina principală */
function monteaza3D() {
  const loc = document.querySelector(".carte-3d-loc");
  if (!loc || !estePoveste() || !areWebGL()) return;
  const intrare = !!document.querySelector("#app.intra .carte-3d-loc") && !MISCARE_REDUSA();
  const info = typeof infoCapitole === "function" ? infoCapitole() : [];
  incarcaThree().then(THREE => {
    if (!loc.isConnected) return;
    const c = TREI_D.carte || (TREI_D.carte = creeazaCarte(THREE));
    if (!c) return;
    if (c.canvas.parentNode !== loc) loc.append(c.canvas);
    loc.closest(".masa-cartii")?.classList.add("cu-3d");
    c.info(info);
    c.dimensioneaza(loc);
    if (intrare) c.deschide(); else if (!c.pornita) c.deschisa();
    c.observa();
  }).catch(() => { /* fără 3D: rămâne cartea desenată */ });
}
/* capitolul de sub mouse / din lista de sub carte se luminează pe pagină */
function evidentiaza3D(i) { TREI_D.carte?.evidentiaza(i); }
/* clic pe un capitol: foaia se întoarce, apoi se deschide pagina; întoarce false dacă nu se ocupă cartea */
function intoarceCapitol3D(i, href, e) {
  const c = TREI_D.carte;
  if (!c || !c.canvas.isConnected || MISCARE_REDUSA() || (e && (e.button || e.ctrlKey || e.metaKey || e.shiftKey))) return false;
  c.intoarce(i, href); return true;
}

/* ---------------- unelte ---------------- */
const mat = (THREE, culoare, o = {}) => {
  const m = new THREE.MeshStandardMaterial({ color: culoare, roughness: o.r ?? .7, metalness: o.m ?? 0, map: o.map || null });
  m.color.convertSRGBToLinear(); return m;
};
function panza(w, hh) { const c = document.createElement("canvas"); c.width = w; c.height = hh; return c; }
function texturaDin(THREE, c, rep) {
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.encoding = THREE.sRGBEncoding;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function aleator(samanta) { let s = samanta % 2147483647 || 1; return () => (s = s * 16807 % 2147483647) / 2147483647; }
const usor = {
  iesire: p => 1 - Math.pow(1 - p, 3),
  inOut: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  pas: (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); },
};
const clamp01 = x => Math.min(1, Math.max(0, x));

/* ---------------- texturile: lemn, piele, hârtie veche, gravuri ---------------- */
function desenLemn(w, hh, baza, inchis, samanta) {
  const c = panza(w, hh), x = c.getContext("2d"), r = aleator(samanta);
  x.fillStyle = baza; x.fillRect(0, 0, w, hh);
  for (let i = 0; i < 90; i++) {
    const y0 = r() * hh, a = 2 + r() * 8, f = .004 + r() * .01, faza = r() * 6;
    x.strokeStyle = r() < .5 ? inchis : "rgba(255,220,170,.06)"; x.globalAlpha = .12 + r() * .25; x.lineWidth = .6 + r() * 2.4;
    x.beginPath(); for (let px = 0; px <= w; px += 8) { const py = y0 + Math.sin(px * f + faza) * a + Math.sin(px * f * 3.1) * a * .3; px ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
  }
  x.globalAlpha = 1;
  for (let i = 0; i < 3; i++) { // noduri
    const cx = r() * w, cy = r() * hh;
    for (let k = 0; k < 6; k++) { x.strokeStyle = inchis; x.globalAlpha = .25; x.lineWidth = 1.2; x.beginPath(); x.ellipse(cx, cy, 6 + k * 5, 2 + k * 2, 0, 0, 7); x.stroke(); }
  }
  x.globalAlpha = 1;
  return c;
}
function desenPanouri(c) { // panourile în relief de pe fața pupitrului
  const x = c.getContext("2d"), w = c.width, hh = c.height;
  const panou = (x0, y0, pw, ph) => {
    x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(x0, y0, pw, ph);
    x.strokeStyle = "rgba(255,214,160,.22)"; x.lineWidth = 6; x.beginPath(); x.moveTo(x0, y0 + ph); x.lineTo(x0, y0); x.lineTo(x0 + pw, y0); x.stroke();
    x.strokeStyle = "rgba(20,8,0,.55)"; x.beginPath(); x.moveTo(x0 + pw, y0); x.lineTo(x0 + pw, y0 + ph); x.lineTo(x0, y0 + ph); x.stroke();
    x.strokeStyle = "rgba(255,214,160,.12)"; x.lineWidth = 2; x.strokeRect(x0 + 18, y0 + 18, pw - 36, ph - 36);
  };
  panou(w * .07, hh * .08, w * .38, hh * .84); panou(w * .55, hh * .08, w * .38, hh * .84);
  return c;
}
function desenPiele(w, hh, samanta, coperta) {
  const c = panza(w, hh), x = c.getContext("2d"), r = aleator(samanta);
  const g = x.createRadialGradient(w * .45, hh * .4, 20, w / 2, hh / 2, Math.max(w, hh) * .75);
  g.addColorStop(0, "#6e2a2c"); g.addColorStop(.6, "#4f1a1e"); g.addColorStop(1, "#2c0d10");
  x.fillStyle = g; x.fillRect(0, 0, w, hh);
  for (let i = 0; i < w * hh / 90; i++) { x.fillStyle = r() < .5 ? "rgba(0,0,0,.12)" : "rgba(255,200,170,.05)"; x.fillRect(r() * w, r() * hh, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 26; i++) { x.strokeStyle = "rgba(0,0,0,.14)"; x.lineWidth = 1; x.beginPath(); const px = r() * w, py = r() * hh; x.moveTo(px, py); x.bezierCurveTo(px + r() * 60 - 30, py + r() * 40, px + r() * 80 - 40, py + r() * 60, px + r() * 90 - 45, py + r() * 80); x.stroke(); }
  if (!coperta) return c;
  // coperta: chenar auriu dublu, colțuri ornamentale, medalion cu lauri și titlul
  const aur = x.createLinearGradient(0, 0, w, hh); aur.addColorStop(0, "#f6dc95"); aur.addColorStop(.5, "#b98a35"); aur.addColorStop(1, "#f0cf80");
  x.strokeStyle = aur; x.fillStyle = aur;
  x.lineWidth = 7; x.strokeRect(54, 54, w - 108, hh - 108); x.lineWidth = 2.5; x.strokeRect(78, 78, w - 156, hh - 156);
  for (const [cx, cy, sx, sy] of [[78, 78, 1, 1], [w - 78, 78, -1, 1], [78, hh - 78, 1, -1], [w - 78, hh - 78, -1, -1]]) {
    x.save(); x.translate(cx, cy); x.scale(sx, sy); x.lineWidth = 3.5;
    x.beginPath(); x.moveTo(0, 120); x.bezierCurveTo(10, 50, 50, 10, 120, 0); x.stroke();
    x.beginPath(); x.moveTo(20, 70); x.bezierCurveTo(40, 66, 66, 40, 70, 20); x.stroke();
    x.beginPath(); x.arc(46, 46, 9, 0, 7); x.fill(); x.restore();
  }
  x.save(); x.translate(w / 2, hh * .42);
  x.lineWidth = 4; x.beginPath(); x.ellipse(0, 0, 230, 290, 0, 0, 7); x.stroke(); x.lineWidth = 1.6; x.beginPath(); x.ellipse(0, 0, 214, 274, 0, 0, 7); x.stroke();
  x.lineWidth = 3; ramuraLaur(x, 0, 30, 165, -1, 3); ramuraLaur(x, 0, 30, 165, 1, 3);
  // cartea deschisă din medalion
  x.lineWidth = 5; x.beginPath(); x.moveTo(-95, -40); x.quadraticCurveTo(-45, -62, 0, -38); x.quadraticCurveTo(45, -62, 95, -40); x.lineTo(95, 40); x.quadraticCurveTo(45, 18, 0, 42); x.quadraticCurveTo(-45, 18, -95, 40); x.closePath(); x.stroke();
  x.beginPath(); x.moveTo(0, -38); x.lineTo(0, 42); x.stroke();
  x.lineWidth = 2; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-80, -22 + i * 15); x.quadraticCurveTo(-40, -40 + i * 15, -14, -22 + i * 15); x.stroke(); x.beginPath(); x.moveTo(14, -22 + i * 15); x.quadraticCurveTo(40, -40 + i * 15, 80, -22 + i * 15); x.stroke(); }
  x.restore();
  x.textAlign = "center"; x.shadowColor = "rgba(0,0,0,.5)"; x.shadowBlur = 6; x.shadowOffsetY = 3;
  x.font = '700 92px "Cormorant Garamond", Georgia, serif'; x.fillText("Caietul de teme", w / 2, hh * .78);
  x.font = 'italic 600 48px "Cormorant Garamond", Georgia, serif'; x.fillText("Povestea Cunoașterii", w / 2, hh * .845);
  return c;
}
function desenMuchii(vertical) { // marginile foilor, văzute din lateral
  const c = panza(256, 256), x = c.getContext("2d"), r = aleator(7);
  x.fillStyle = "#e8d6ae"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 2 + Math.floor(r() * 3)) {
    x.fillStyle = `rgba(${120 + r() * 40},${90 + r() * 30},${50},${.18 + r() * .3})`;
    vertical ? x.fillRect(i, 0, 1, 256) : x.fillRect(0, i, 256, 1);
  }
  return c;
}
function ramuraLaur(x, cx, cy, raza, parte, gros) {
  x.beginPath(); for (let a = 0; a <= 1; a += .02) { const u = Math.PI * (.62 + a * .74), px = cx + parte * Math.cos(u) * raza * -1, py = cy - Math.sin(u) * raza * -1; a ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
  for (let i = 0; i < 9; i++) {
    const a = .06 + i * .105, u = Math.PI * (.62 + a * .74), px = cx - parte * Math.cos(u) * raza, py = cy + Math.sin(u) * raza;
    const tan = Math.atan2(Math.cos(u), parte * Math.sin(u));
    for (const s of [-1, 1]) {
      x.save(); x.translate(px, py); x.rotate(tan + s * .7 * parte); x.beginPath(); x.ellipse(0, -14, 6.5, 15, 0, 0, 7);
      gros > 2 ? x.fill() : x.stroke(); x.restore();
    }
  }
}

/* gravurile din pagini: linii sepia cu hașuri, ca în cărțile vechi */
function hasura(x, pas, unghi, w) {
  x.save(); x.rotate(unghi); x.beginPath(); for (let i = -w; i < w; i += pas) { x.moveTo(i, -w); x.lineTo(i, w); } x.stroke(); x.restore();
}
function cuDecupare(x, traseu, desen) { x.save(); x.beginPath(); traseu(); x.clip(); desen(); x.restore(); }
const GRAVURI = {
  teme(x) { // foaie scrisă, călimară și pană
    x.save(); x.rotate(-.08);
    x.fillStyle = "rgba(255,250,235,.55)"; x.fillRect(-140, -40, 150, 120); x.strokeRect(-140, -40, 150, 120);
    x.lineWidth = 1.4; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(-126, -20 + i * 17); x.lineTo(-10 - (i === 5 ? 60 : (i * 13) % 30), -20 + i * 17); x.stroke(); }
    x.restore(); x.lineWidth = 2.6;
    const corp = () => { x.moveTo(30, 90); x.lineTo(120, 90); x.quadraticCurveTo(128, 40, 102, 22); x.lineTo(92, 14); x.lineTo(58, 14); x.lineTo(48, 22); x.quadraticCurveTo(22, 40, 30, 90); x.closePath(); };
    x.beginPath(); corp(); x.stroke();
    cuDecupare(x, corp, () => { x.lineWidth = 1.1; x.save(); x.translate(100, 50); hasura(x, 5, .35, 80); x.restore(); });
    x.lineWidth = 2.6; x.strokeRect(60, 2, 30, 12); x.beginPath(); x.ellipse(75, 2, 15, 4, 0, 0, 7); x.stroke();
    x.beginPath(); x.ellipse(75, 92, 54, 6, 0, 0, 7); x.stroke();
    // pana: un tub curbat cu barbe pe ambele părți
    const P = t => [75 - 185 * t + 30 * Math.sin(t * 3), 2 - 150 * t + 20 * t * t];
    x.lineWidth = 2.4; x.beginPath(); for (let t = 0; t <= 1.001; t += .05) { const [px, py] = P(t); t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    x.lineWidth = 1.2;
    for (let t = .14; t < 1; t += .03) {
      const [px, py] = P(t), [qx, qy] = P(t + .01), a = Math.atan2(qy - py, qx - px), l = 34 * Math.sin(Math.PI * Math.min(1, (t - .1) / .9)) + 4;
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + s * 1.2) * l * .6, py + Math.sin(a + s * 1.2) * l * .6, px + Math.cos(a + s * .7) * l, py + Math.sin(a + s * .7) * l); x.stroke(); }
    }
  },
  calendar(x) { // clepsidra
    x.lineWidth = 2.6;
    for (const y of [-100, 84]) { x.strokeRect(-80, y, 160, 16); cuDecupare(x, () => x.rect(-80, y, 160, 16), () => { x.lineWidth = 1; hasura(x, 4, .8, 200); }); x.lineWidth = 2.6; }
    for (const px of [-66, 66]) { x.beginPath(); x.moveTo(px, -84); x.lineTo(px, 84); x.stroke(); for (const y of [-60, 0, 60]) { x.beginPath(); x.ellipse(px, y, 5, 8, 0, 0, 7); x.stroke(); } }
    const sticla = s => { x.moveTo(-46, s * 84); x.bezierCurveTo(-48, s * 30, -6, s * 18, -5, 0); x.lineTo(5, 0); x.bezierCurveTo(6, s * 18, 48, s * 30, 46, s * 84); };
    x.beginPath(); sticla(-1); x.stroke(); x.beginPath(); sticla(1); x.stroke();
    // nisipul: puțin sus, o grămadă jos și firul care curge
    const sus = () => { x.moveTo(-30, -36); x.bezierCurveTo(-20, -24, -8, -14, 0, -4); x.bezierCurveTo(8, -14, 20, -24, 30, -36); x.quadraticCurveTo(0, -30, -30, -36); };
    const jos = () => { x.moveTo(-44, 84); x.quadraticCurveTo(-30, 50, 0, 40); x.quadraticCurveTo(30, 50, 44, 84); x.closePath(); };
    for (const f of [sus, jos]) cuDecupare(x, f, () => { x.lineWidth = 1; hasura(x, 3.5, -.6, 200); });
    x.lineWidth = 1.4; x.beginPath(); x.moveTo(0, -2); x.lineTo(0, 40); x.stroke();
    x.lineWidth = 1; x.beginPath(); x.moveTo(-30, -60); x.quadraticCurveTo(-36, -40, -24, -30); x.stroke(); x.beginPath(); x.moveTo(-34, 60); x.quadraticCurveTo(-38, 70, -34, 78); x.stroke();
  },
  bac(x) { // coroana de lauri și toca de absolvent
    x.lineWidth = 2.2; x.fillStyle = x.strokeStyle; ramuraLaur(x, 0, 12, 108, -1, 2); ramuraLaur(x, 0, 12, 108, 1, 2);
    x.beginPath(); x.moveTo(-14, 116); x.quadraticCurveTo(0, 104, 14, 116); x.moveTo(-6, 112); x.lineTo(-26, 132); x.moveTo(6, 112); x.lineTo(26, 132); x.stroke();
    x.lineWidth = 2.6;
    const capac = () => { x.moveTo(0, -48); x.lineTo(84, -18); x.lineTo(0, 12); x.lineTo(-84, -18); x.closePath(); };
    const corp = () => { x.moveTo(-48, -4); x.lineTo(-48, 34); x.quadraticCurveTo(0, 58, 48, 34); x.lineTo(48, -4); x.lineTo(0, 12); x.closePath(); };
    x.beginPath(); corp(); x.stroke(); cuDecupare(x, corp, () => { x.lineWidth = 1; hasura(x, 4, 0, 120); });
    x.lineWidth = 2.6; x.beginPath(); capac(); x.stroke(); cuDecupare(x, capac, () => { x.lineWidth = .9; hasura(x, 5, 1.2, 120); });
    x.lineWidth = 2; x.beginPath(); x.moveTo(0, -18); x.quadraticCurveTo(46, -10, 62, 2); x.lineTo(62, 44); x.stroke();
    x.beginPath(); x.moveTo(56, 44); x.lineTo(68, 44); x.lineTo(72, 66); x.lineTo(52, 66); x.closePath(); x.stroke();
    x.beginPath(); x.ellipse(0, -18, 6, 3.5, 0, 0, 7); x.fill();
  },
  opere(x) { // teanc de cărți cu semn
    const carte = (x0, y0, w, hh) => {
      x.lineWidth = 2.4; x.strokeRect(x0, y0, w, hh);
      x.lineWidth = 1.2; for (let i = 3; i < hh - 1; i += 3) { x.beginPath(); x.moveTo(x0 + w, y0 + i); x.lineTo(x0 + w + 12, y0 + i - 6); x.stroke(); }
      x.lineWidth = 2.4; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + 12, y0 - 7); x.lineTo(x0 + w + 12, y0 - 7); x.lineTo(x0 + w + 12, y0 + hh - 7); x.lineTo(x0 + w, y0 + hh); x.moveTo(x0 + w, y0); x.lineTo(x0 + w + 12, y0 - 7); x.stroke();
      x.lineWidth = 1.6; for (const f of [.16, .84]) { x.beginPath(); x.moveTo(x0 + w * f, y0 + 3); x.lineTo(x0 + w * f, y0 + hh - 3); x.stroke(); }
      x.strokeRect(x0 + w * .36, y0 + hh * .3, w * .28, hh * .4);
      cuDecupare(x, () => x.rect(x0, y0, w, hh), () => { x.lineWidth = .8; x.save(); x.translate(x0, y0); hasura(x, 4, .9, 300); x.restore(); });
    };
    carte(-110, 52, 200, 38); carte(-90, 12, 180, 34); carte(-120, -24, 196, 30);
    x.lineWidth = 2.2; x.beginPath(); x.moveTo(30, -31); x.lineTo(30, -60); x.lineTo(38, -52); x.lineTo(46, -60); x.lineTo(46, -31); x.stroke();
    // o pană culcată pe teanc
    x.lineWidth = 1.6; x.beginPath(); x.moveTo(-100, -40); x.quadraticCurveTo(-20, -70, 70, -56); x.stroke();
    x.lineWidth = 1; for (let t = .1; t < .95; t += .05) { const px = -100 + 170 * t, py = -40 - 22 * Math.sin(t * Math.PI) - t * 12; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 12, py - 14 * Math.sin(t * Math.PI) - 4); x.stroke(); }
  },
};
const CAP_3D = [
  { k: "teme", titlu: "Temele mele", sub: "Primele provocări", nr: "I" },
  { k: "calendar", titlu: "Calendar", sub: "Planul aventurii", nr: "II" },
  { k: "bac", titlu: "Pregătire BAC", sub: "Marea încercare", nr: "III" },
  { k: "opere", titlu: "Bibliotecă", sub: "Lumea operelor", nr: "IV" }];

function desenPagina(c, parte, info, aprins) {
  const x = c.getContext("2d"), w = c.width, hh = c.height, r = aleator(parte ? 91 : 37);
  // hârtia îngălbenită, mai închisă spre margini și spre cotor
  x.fillStyle = "#ecdcb6"; x.fillRect(0, 0, w, hh);
  let g = x.createRadialGradient(w / 2, hh / 2, w * .2, w / 2, hh / 2, w * .95); g.addColorStop(0, "rgba(255,248,226,.55)"); g.addColorStop(1, "rgba(150,100,40,.35)");
  x.fillStyle = g; x.fillRect(0, 0, w, hh);
  for (let i = 0; i < 9000; i++) { x.fillStyle = r() < .5 ? "rgba(120,80,30,.07)" : "rgba(255,255,240,.08)"; x.fillRect(r() * w, r() * hh, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 14; i++) { const px = r() * w, py = r() * hh, rr = 4 + r() * 18; g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, "rgba(140,90,30,.16)"); g.addColorStop(1, "rgba(140,90,30,0)"); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  const cotorX = parte ? 0 : w;
  g = x.createLinearGradient(cotorX, 0, parte ? 150 : w - 150, 0); g.addColorStop(0, "rgba(90,55,20,.45)"); g.addColorStop(.35, "rgba(90,55,20,.12)"); g.addColorStop(1, "rgba(90,55,20,0)");
  x.fillStyle = g; x.fillRect(0, 0, w, hh);
  // chenarul și colțurile
  const cer = "#4b2f17"; x.strokeStyle = cer; x.fillStyle = cer;
  const m = 64; x.lineWidth = 3; x.strokeRect(m, m, w - 2 * m, hh - 2 * m); x.lineWidth = 1.2; x.strokeRect(m + 12, m + 12, w - 2 * m - 24, hh - 2 * m - 24);
  for (const [cx, cy, sx, sy] of [[m + 12, m + 12, 1, 1], [w - m - 12, m + 12, -1, 1], [m + 12, hh - m - 12, 1, -1], [w - m - 12, hh - m - 12, -1, -1]]) {
    x.save(); x.translate(cx, cy); x.scale(sx, sy); x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, 70); x.bezierCurveTo(4, 30, 30, 4, 70, 0); x.stroke();
    x.beginPath(); x.moveTo(14, 40); x.bezierCurveTo(24, 36, 36, 24, 40, 14); x.stroke();
    x.beginPath(); x.arc(26, 26, 5, 0, 7); x.fill(); x.restore();
  }
  const cx = w / 2 + (parte ? 14 : -14);
  for (let k = 0; k < 2; k++) {
    const i = parte * 2 + k, cap = CAP_3D[i], y0 = 110 + k * 590;
    if (aprins === i) { // capitolul de sub mouse: o lumină caldă și un chenar auriu
      g = x.createRadialGradient(cx, y0 + 270, 40, cx, y0 + 270, 420); g.addColorStop(0, "rgba(255,214,130,.55)"); g.addColorStop(1, "rgba(255,214,130,0)");
      x.fillStyle = g; x.fillRect(m + 14, y0 - 10, w - 2 * m - 28, 580);
      x.strokeStyle = "#b5852f"; x.lineWidth = 3; x.setLineDash([2, 8]); x.lineCap = "round"; x.strokeRect(m + 34, y0 + 4, w - 2 * m - 68, 548); x.setLineDash([]); x.lineCap = "butt";
      x.strokeStyle = cer; x.fillStyle = cer;
    }
    x.textAlign = "center";
    x.font = '600 30px "Cormorant Garamond", Georgia, serif'; x.fillStyle = "#7a2c3a";
    x.fillText(("Capitolul " + cap.nr).toUpperCase().split("").join(String.fromCharCode(8202)), cx, y0 + 58);
    x.save(); x.translate(cx, y0 + 200); x.strokeStyle = cer; x.fillStyle = cer; x.lineCap = "round"; x.lineJoin = "round";
    if (aprins === i) x.scale(1.06, 1.06);
    GRAVURI[cap.k](x); x.restore();
    x.fillStyle = "#3a2210"; x.font = '700 76px "Cormorant Garamond", Georgia, serif'; x.fillText(cap.titlu, cx, y0 + 392);
    x.fillStyle = "#5b3b1f"; x.font = 'italic 500 40px "Cormorant Garamond", Georgia, serif'; x.fillText(cap.sub, cx, y0 + 440);
    x.strokeStyle = "#8a6232"; x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx - 120, y0 + 466); x.lineTo(cx - 14, y0 + 466); x.moveTo(cx + 14, y0 + 466); x.lineTo(cx + 120, y0 + 466); x.stroke();
    x.save(); x.translate(cx, y0 + 466); x.rotate(Math.PI / 4); x.strokeRect(-6, -6, 12, 12); x.restore();
    if (info[i]) { x.fillStyle = "#7a2c3a"; x.font = '600 34px "Cormorant Garamond", Georgia, serif'; x.fillText(info[i], cx, y0 + 512); }
    x.fillStyle = aprins === i ? "#7a4a12" : "rgba(90,60,30,.55)"; x.font = 'italic 600 30px "Cormorant Garamond", Georgia, serif'; x.fillText("Deschide capitolul ›", cx, y0 + 552);
  }
  x.fillStyle = "#6b4a28"; x.font = '600 52px "Cormorant Garamond", Georgia, serif'; x.fillText("❦", cx, 700 + 16);
  x.font = 'italic 500 30px "Cormorant Garamond", Georgia, serif'; x.fillText(parte ? "13" : "12", cx, hh - 92);
}
function desenSemn() { // semnul de carte: catifea vișinie, borduri aurii, emblema, capătul în coadă de rândunică
  const w = 256, hh = 1024, c = panza(w, hh), x = c.getContext("2d");
  x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, hh); x.lineTo(w / 2, hh - 110); x.lineTo(0, hh); x.closePath(); x.clip();
  const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#5a0f1c"); g.addColorStop(.5, "#9b2236"); g.addColorStop(1, "#5a0f1c");
  x.fillStyle = g; x.fillRect(0, 0, w, hh);
  for (let y = 0; y < hh; y += 3) { x.fillStyle = "rgba(0,0,0,.07)"; x.fillRect(0, y, w, 1); }
  x.strokeStyle = "#d9b25e"; x.lineWidth = 7; x.beginPath(); x.moveTo(20, 0); x.lineTo(20, hh - 70); x.moveTo(w - 20, 0); x.lineTo(w - 20, hh - 70); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.moveTo(34, 0); x.lineTo(34, hh - 80); x.moveTo(w - 34, 0); x.lineTo(w - 34, hh - 80); x.stroke();
  x.save(); x.translate(w / 2, hh - 300); x.strokeStyle = x.fillStyle = "#e3bd6a"; x.lineWidth = 3;
  ramuraLaur(x, 0, 6, 70, -1, 3); ramuraLaur(x, 0, 6, 70, 1, 3);
  x.lineWidth = 4; x.beginPath(); x.moveTo(-40, -14); x.quadraticCurveTo(-18, -26, 0, -14); x.quadraticCurveTo(18, -26, 40, -14); x.lineTo(40, 22); x.quadraticCurveTo(18, 10, 0, 22); x.quadraticCurveTo(-18, 10, -40, 22); x.closePath(); x.stroke();
  x.beginPath(); x.moveTo(0, -14); x.lineTo(0, 22); x.stroke(); x.restore();
  return c;
}
function desenPata(w, hh, stopuri) { // sprite-uri moi: flacără, halou, praf
  const c = panza(w, hh), x = c.getContext("2d"), g = x.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, Math.min(w, hh) / 2);
  for (const [o, col] of stopuri) g.addColorStop(o, col);
  x.fillStyle = g; x.fillRect(0, 0, w, hh); return c;
}
function desenFlacara() {
  const c = panza(64, 128), x = c.getContext("2d");
  x.save(); x.translate(32, 92); x.scale(1, 2.4);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 26); g.addColorStop(0, "rgba(255,255,235,1)"); g.addColorStop(.35, "rgba(255,214,120,.95)"); g.addColorStop(.7, "rgba(255,130,40,.55)"); g.addColorStop(1, "rgba(255,90,20,0)");
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, 26, 0, 7); x.fill(); x.restore();
  return c;
}
function desenRaza() {
  const c = panza(128, 512), x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, "rgba(255,226,170,0)"); g.addColorStop(.5, "rgba(255,226,170,1)"); g.addColorStop(1, "rgba(255,226,170,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 512);
  x.globalCompositeOperation = "destination-in"; const v = x.createLinearGradient(0, 0, 0, 512); v.addColorStop(0, "rgba(0,0,0,.9)"); v.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = v; x.fillRect(0, 0, 128, 512); return c;
}

/* ---------------- scena: pupitrul, cartea, lumânarea ---------------- */
const CARTE = { W: 1, D: 1.36, cop: .028, panta: .3 };
function blocSus(d) { // înălțimea foilor la distanța d de cotor: coboară în cotor, se arcuiește spre margine
  return .022 + .058 * (1 - Math.exp(-d / .07)) + .022 * Math.sin(Math.PI * Math.min(1, d / CARTE.W) * .92);
}

function creeazaCarte(THREE) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement; canvas.className = "carte-3d"; canvas.setAttribute("aria-hidden", "true");
  const { W, D, cop } = CARTE;
  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1.6, .1, 60);
  const tinta = new THREE.Vector3(0, -.12, .12);

  // lumini: soare cald din fereastra din dreapta-sus, umplere violet slabă, lumânarea din stânga
  scena.add(new THREE.HemisphereLight(0xffe9cc, 0x2a1838, .5));
  const soare = new THREE.DirectionalLight(0xffdcae, 1.15); soare.position.set(2.6, 4.2, 2.2); soare.castShadow = true;
  soare.shadow.mapSize.set(1536, 1536); Object.assign(soare.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: .5, far: 12 });
  soare.shadow.bias = -.0006; soare.shadow.normalBias = .02; scena.add(soare);
  const umplere = new THREE.DirectionalLight(0x9d86ff, .22); umplere.position.set(-3, 1.5, 1); scena.add(umplere);
  const flacaraLumina = new THREE.PointLight(0xff9a48, 1.4, 6, 2); scena.add(flacaraLumina);

  // ---- pupitrul ----
  const lemnTex = texturaDin(THREE, desenLemn(512, 512, "#6a3d20", "#2a1206", 3), [1.6, 1]);
  const lemnInchisTex = texturaDin(THREE, desenPanouri(desenLemn(512, 512, "#4a2814", "#1c0a03", 11)));
  const lemn = new THREE.MeshStandardMaterial({ map: lemnTex, roughness: .55, metalness: .05 });
  const lemnInchis = new THREE.MeshStandardMaterial({ map: lemnInchisTex, roughness: .6 });
  const lemnSimplu = new THREE.MeshStandardMaterial({ map: texturaDin(THREE, desenLemn(256, 256, "#4a2814", "#1c0a03", 5)), roughness: .6 });
  const inclinat = new THREE.Group(); inclinat.rotation.x = CARTE.panta; scena.add(inclinat);
  const tabla = new THREE.Mesh(new THREE.BoxGeometry(2.62, .07, 1.86), lemn); tabla.position.y = -.035; tabla.receiveShadow = true; tabla.castShadow = true; inclinat.add(tabla);
  const buza = new THREE.Mesh(new THREE.BoxGeometry(2.62, .1, .07), lemn); buza.position.set(0, .015, .93); buza.castShadow = buza.receiveShadow = true; inclinat.add(buza);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.07, .05, 1.86), lemn); m.position.set(s * 1.31, -.01, 0); inclinat.add(m); }
  const corp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 1.0), [lemnSimplu, lemnSimplu, lemnSimplu, lemnSimplu, lemnInchis, lemnSimplu]);
  corp.position.set(0, -1.32, -.05); corp.receiveShadow = true; scena.add(corp);
  const corniza = new THREE.Mesh(new THREE.BoxGeometry(2.2, .09, 1.16), lemn); corniza.position.set(0, -.42, -.05); corniza.receiveShadow = true; scena.add(corniza);
  const sprijin = new THREE.Mesh(new THREE.BoxGeometry(1.9, .5, .6), lemnSimplu); sprijin.position.set(0, -.2, -.38); scena.add(sprijin);

  // ---- raftul mic cu lumânarea, în stânga ----
  const raft = new THREE.Group(); raft.position.set(1.2, -.46, 1.24); scena.add(raft);
  const blat = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .06, 40), lemn); blat.receiveShadow = true; raft.add(blat);
  const picior = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 1.6, 16), lemnSimplu); picior.position.y = -.83; raft.add(picior);
  const pieleTex = texturaDin(THREE, desenPiele(256, 256, 5));
  const teanc = [[.5, .09, .38, 0x4d2a5e, .05], [.45, .08, .34, 0x6b2228, -.12]];
  let yT = .03;
  for (const [lw, lh, ld, col, rot] of teanc) {
    const gr = new THREE.Group(); gr.position.y = yT + lh / 2; gr.rotation.y = rot; raft.add(gr);
    const coperta = mat(THREE, col, { r: .55, map: pieleTex });
    const b = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, ld), coperta); b.castShadow = b.receiveShadow = true; gr.add(b);
    const foi = new THREE.Mesh(new THREE.BoxGeometry(lw - .03, lh - .025, ld + .002), mat(THREE, 0xe9d7ae, { r: .9 })); foi.position.x = .016; gr.add(foi);
    for (const s of [-1, 1]) { const banda = new THREE.Mesh(new THREE.BoxGeometry(.02, lh + .004, ld + .004), mat(THREE, 0xd4a64a, { r: .3, m: .8 })); banda.position.x = -lw / 2 + .06 + (s + 1) * .05; gr.add(banda); }
    yT += lh;
  }
  const alama = mat(THREE, 0xc9963c, { r: .28, m: .9 });
  const farfurie = new THREE.Mesh(new THREE.CylinderGeometry(.15, .17, .025, 32), alama); farfurie.position.y = yT + .012; farfurie.castShadow = true; raft.add(farfurie);
  const sfesnic = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, .09, 20), alama); sfesnic.position.y = yT + .07; raft.add(sfesnic);
  const toarta = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 8, 20, Math.PI * 1.4), alama); toarta.position.set(.17, yT + .04, 0); toarta.rotation.z = -.6; raft.add(toarta);
  const ceara = new THREE.Mesh(new THREE.CylinderGeometry(.042, .045, .36, 24), new THREE.MeshStandardMaterial({ color: 0xf3e7cc, roughness: .5, emissive: 0x6a3a10, emissiveIntensity: .25 }));
  ceara.position.y = yT + .29; ceara.castShadow = true; raft.add(ceara);
  const fitil = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .03, 6), mat(THREE, 0x1a1008)); fitil.position.y = yT + .485; raft.add(fitil);
  const varf = yT + .5;
  const spr = (c, opac, add = true) => new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaDin(THREE, c), transparent: true, opacity: opac, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  const flacara = spr(desenFlacara(), 1); flacara.scale.set(.07, .14, 1); flacara.position.y = varf + .04; raft.add(flacara);
  const halou = spr(desenPata(128, 128, [[0, "rgba(255,190,110,.55)"], [.4, "rgba(255,150,60,.16)"], [1, "rgba(255,120,40,0)"]]), .9); halou.scale.set(.9, .9, 1); halou.position.y = varf + .04; raft.add(halou);
  raft.updateMatrixWorld(true); flacaraLumina.position.copy(raft.localToWorld(new THREE.Vector3(0, varf + .08, 0)));

  // ---- cartea ----
  const carte = new THREE.Group(); carte.position.set(0, 0, .18); inclinat.add(carte);
  const H = cop + blocSus(W) + .006; // înălțimea balamalei când cartea e închisă
  const pielePlan = mat(THREE, 0xffffff, { r: .6, map: texturaDin(THREE, desenPiele(512, 512, 9)) });
  const copertaTex = texturaDin(THREE, desenPiele(1024, 1400, 21, true));
  copertaTex.center.set(.5, .5); copertaTex.rotation = Math.PI; // fața de jos a copertei stângi devine, închisă, fața cărții
  const copertaMat = new THREE.MeshStandardMaterial({ map: copertaTex, roughness: .55, metalness: .1 });
  const muchieCap = new THREE.MeshStandardMaterial({ map: texturaDin(THREE, desenMuchii(false), [1, 5]), roughness: .95 });
  const muchieLat = new THREE.MeshStandardMaterial({ map: texturaDin(THREE, desenMuchii(true), [5, 1]), roughness: .95 });
  const paginaPanza = [panza(1024, 1392), panza(1024, 1392)];
  const paginaTex = paginaPanza.map(c => texturaDin(THREE, c));
  const paginaDos = paginaTex.map(t => { const d = t.clone(); d.wrapS = THREE.RepeatWrapping; d.repeat.x = -1; d.offset.x = 1; d.needsUpdate = true; return d; });

  function jumatate(parte) { // parte: -1 stânga, 1 dreapta; pivotul e pe cotor, la înălțimea H
    const pivot = new THREE.Group(); pivot.position.y = H; carte.add(pivot);
    const g = new THREE.Group(); g.position.y = -H; pivot.add(g);
    const cw = W + .045;
    const mats = [pielePlan, pielePlan, pielePlan, parte < 0 ? copertaMat : pielePlan, pielePlan, pielePlan];
    const cop_ = new THREE.Mesh(new THREE.BoxGeometry(cw, cop, D + .07), mats); cop_.position.set(parte * cw / 2, cop / 2, 0); cop_.castShadow = cop_.receiveShadow = true; g.add(cop_);
    // blocul foilor: profilul (cotor coborât, margine arcuită) extrudat pe adâncimea cărții
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(parte * W, 0);
    for (let i = 40; i >= 0; i--) { const d = W * i / 40; sh.lineTo(parte * d, blocSus(d) - .002); }
    const bg = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 1 }); bg.translate(0, cop, -D / 2);
    const bloc = new THREE.Mesh(bg, [muchieCap, muchieLat]); bloc.castShadow = true; bloc.receiveShadow = true; g.add(bloc);
    // pagina de sus, cu textul capitolelor
    const pg = new THREE.PlaneGeometry(W, D, 48, 1); pg.rotateX(-Math.PI / 2); pg.translate(parte * W / 2, 0, 0);
    const pos = pg.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, cop + blocSus(Math.abs(pos.getX(i))));
    pg.computeVertexNormals();
    const pagina = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ map: paginaTex[parte < 0 ? 0 : 1], roughness: .92 }));
    pagina.receiveShadow = true; pagina.userData.parte = parte < 0 ? 0 : 1; g.add(pagina);
    return { pivot, pagina };
  }
  const st = jumatate(-1), dr = jumatate(1);
  // cotorul rotunjit, sub mijloc
  const cotor = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, D + .07, 20, 1, false, Math.PI / 2, Math.PI), pielePlan);
  cotor.rotation.x = Math.PI / 2; cotor.rotation.y = Math.PI; cotor.scale.set(1, 1, .5); cotor.position.y = .01; carte.add(cotor);

  // foile care se răsfoiesc: au pe față pagina din dreapta, pe dos pagina din stânga, ca să nu „sară” când se așază
  const N = 32;
  function foaie() {
    const geo = new THREE.PlaneGeometry(W, D, N, 1); geo.rotateX(-Math.PI / 2); geo.translate(W / 2, 0, 0);
    const baza = Float32Array.from(geo.attributes.position.array);
    const fata = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: paginaTex[1], roughness: .92, side: THREE.FrontSide }));
    const dos = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: paginaDos[0], roughness: .92, side: THREE.BackSide }));
    fata.castShadow = true; const g = new THREE.Group(); g.add(fata, dos); g.visible = false; carte.add(g);
    return { g, geo, baza, theta: 0 };
  }
  const foi = [foaie(), foaie(), foaie()];
  const px = new Float32Array(N + 1), py = new Float32Array(N + 1);
  function asazaFoaia(f, theta, sens, ridicare) { // sens 1: dreapta→stânga; -1: invers
    const seg = W / N, c = .95 * Math.sin(theta), y0 = cop + blocSus(0);
    px[0] = 0; py[0] = 0;
    for (let i = 0; i < N; i++) { const a = theta - sens * c * Math.pow(i / N, 1.3); px[i + 1] = px[i] + Math.cos(a) * seg; py[i + 1] = py[i] + Math.sin(a) * seg; }
    const k = usor.pas(0, .55, theta) * usor.pas(0, .55, Math.PI - theta), stanga = theta > Math.PI / 2;
    const pos = f.geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const d = f.baza[v * 3], i = Math.round(d / W * N), z = f.baza[v * 3 + 2];
      const rx = stanga ? -d : d, ry = cop + blocSus(d) + .003;
      pos.setXYZ(v, rx + (px[i] - rx) * k, ry + (y0 + py[i] + .003 + ridicare - ry) * k, z);
    }
    pos.needsUpdate = true; f.geo.computeVertexNormals();
  }

  // ---- semnul de carte care atârnă peste marginea pupitrului ----
  const semnGeo = new THREE.PlaneGeometry(.2, 1, 1, 28);
  const semn = new THREE.Mesh(semnGeo, new THREE.MeshStandardMaterial({ map: texturaDin(THREE, desenSemn()), side: THREE.DoubleSide, alphaTest: .5, roughness: .75 }));
  semn.castShadow = true; scena.add(semn);
  const vA = new THREE.Vector3(), vB = new THREE.Vector3();
  function asazaSemnul(t) {
    carte.updateMatrixWorld(true);
    vA.set(.03, cop + blocSus(.03) + .004, D / 2 - .05); carte.localToWorld(vA);
    vB.set(.03, .07, .97); inclinat.localToWorld(vB);
    const ab = vA.distanceTo(vB), L = 1.25, pos = semnGeo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const rand = Math.floor(v / 2), s = rand / 28, lat = (v % 2 ? .1 : -.1), l = s * L;
      let X, Y, Z;
      if (l <= ab) { const q = l / ab; X = vA.x + (vB.x - vA.x) * q; Y = vA.y + (vB.y - vA.y) * q + .004; Z = vA.z + (vB.z - vA.z) * q; }
      else {
        const j = l - ab, und = Math.sin(t * 1.25 + j * 3.2) * .035 * j + Math.sin(t * .7) * .02 * j;
        X = vB.x + und; Y = vB.y - j; Z = vB.z + .02 + j * .06 + Math.sin(t * .9 + j * 2) * .02 * j;
      }
      pos.setXYZ(v, X + lat * Math.cos(und2(t, l, ab)), Y, Z + lat * Math.sin(und2(t, l, ab)));
    }
    pos.needsUpdate = true; semnGeo.computeVertexNormals();
  }
  const und2 = (t, l, ab) => l > ab ? Math.sin(t * 1.1 + l * 2) * .25 * (l - ab) : 0;

  // ---- praful din raza de lumină și raza însăși ----
  const NP = 140, pp = new Float32Array(NP * 3), rp = aleator(5);
  for (let i = 0; i < NP; i++) { pp[i * 3] = rp() * 3.4 - 1.4; pp[i * 3 + 1] = rp() * 2 - .1; pp[i * 3 + 2] = rp() * 1.8 - .7; }
  const prafGeo = new THREE.BufferGeometry(); prafGeo.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  const praf = new THREE.Points(prafGeo, new THREE.PointsMaterial({ size: .022, map: texturaDin(THREE, desenPata(32, 32, [[0, "rgba(255,236,200,1)"], [1, "rgba(255,236,200,0)"]])), transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe2b0 }));
  scena.add(praf);
  const raza = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 4.6), new THREE.MeshBasicMaterial({ map: texturaDin(THREE, desenRaza()), transparent: true, opacity: .12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  raza.position.set(1.1, 1.6, -.2); raza.rotation.set(0, -.3, .55); scena.add(raza);
  // scânteile aurii care ies din cotor când se deschide cartea
  const NS = 46, sp = new Float32Array(NS * 3), sv = [];
  for (let i = 0; i < NS; i++) sv.push([(rp() - .5) * 1.2, .6 + rp() * 1.2, (rp() - .5) * .8, rp() * .25]);
  const scanteiGeo = new THREE.BufferGeometry(); scanteiGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const scantei = new THREE.Points(scanteiGeo, new THREE.PointsMaterial({ size: .045, map: praf.material.map, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd27a }));
  carte.add(scantei);

  // ---- starea și animația ----
  const S3 = { pornita: false, start: 0, intoarce: null, aprins: -1, info: [], mx: 0, my: 0, cmx: 0, cmy: 0, w: 0, h: 0, vizibil: false, bucla: 0, departe: 1 };
  function deseneazaPaginile() {
    desenPagina(paginaPanza[0], 0, S3.info, S3.aprins); desenPagina(paginaPanza[1], 1, S3.info, S3.aprins);
    for (const t of paginaTex) t.needsUpdate = true; for (const t of paginaDos) t.needsUpdate = true;
  }
  deseneazaPaginile();
  // titlurile folosesc Cormorant Garamond: se redesenează când fontul e gata
  if (document.fonts) Promise.all(['700 76px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"', '600 30px "Cormorant Garamond"'].map(f => document.fonts.load(f).catch(() => null)))
    .then(() => { deseneazaPaginile(); const c = copertaTex.image; const nou = desenPiele(1024, 1400, 21, true); c.getContext("2d").drawImage(nou, 0, 0); copertaTex.needsUpdate = true; randeaza(); });

  function stare(t) { // t: ms de la începutul deschiderii (Infinity = deschisă)
    const cam = usor.iesire(clamp01(t / 1900));
    const cop_ = usor.inOut(clamp01((t - 450) / 1250));
    st.pivot.rotation.z = -Math.PI * (1 - cop_);
    st.pivot.position.y = H + Math.sin(cop_ * Math.PI) * .05;
    foi.forEach((f, i) => {
      if (S3.intoarce) return;
      const p = clamp01((t - 1450 - i * 230) / 820);
      f.g.visible = p > 0 && p < 1;
      if (f.g.visible) asazaFoaia(f, Math.PI * usor.inOut(p), 1, Math.sin(p * Math.PI) * .06);
    });
    const ps = clamp01((t - 1150) / 1500); scantei.material.opacity = ps > 0 && ps < 1 ? (1 - ps) * .95 : 0;
    if (ps > 0 && ps < 1) for (let i = 0; i < NS; i++) { const [vx, vy, vz, w] = sv[i], q = clamp01(ps - w) * 1.25; sp[i * 3] = vx * q; sp[i * 3 + 1] = .1 + vy * q - q * q * .5; sp[i * 3 + 2] = vz * q; }
    scanteiGeo.attributes.position.needsUpdate = true;
    return cam;
  }
  function pozitioneazaCamera(apropiere, tt) {
    const k = S3.departe, ax = S3.cmx * .22, ay = S3.cmy * .12;
    const x0 = .22 + ax, y0 = 1.62 * k, z0 = 3.12 * k;
    const x1 = -.6, y1 = 3.6 * k, z1 = 4.4 * k;
    camera.position.set(x1 + (x0 - x1) * apropiere, y1 + (y0 - y1) * apropiere + ay + Math.sin(tt * .35) * .015, z1 + (z0 - z1) * apropiere);
    camera.lookAt(tinta.x + .24 * apropiere + ax * .3, tinta.y - .05 * apropiere, tinta.z);
  }
  function randeaza() { renderer.render(scena, camera); }
  function cadru(now) {
    S3.bucla = 0;
    if (!canvas.isConnected) return;
    const t = S3.start ? now - S3.start : Infinity, tt = now / 1000, static_ = MISCARE_REDUSA();
    S3.cmx += (S3.mx - S3.cmx) * .05; S3.cmy += (S3.my - S3.cmy) * .05;
    const apropiere = static_ ? 1 : stare(t);
    if (static_) stare(Infinity);
    pozitioneazaCamera(apropiere, static_ ? 0 : tt);
    // întoarcerea unei foi la clic
    if (S3.intoarce) {
      const q = S3.intoarce, p = clamp01((now - q.t0) / 720), f = foi[0];
      f.g.visible = true; asazaFoaia(f, q.sens > 0 ? Math.PI * usor.inOut(p) : Math.PI * (1 - usor.inOut(p)), q.sens, Math.sin(p * Math.PI) * .08);
      if (p >= 1 && !q.gata) { q.gata = true; location.hash = q.href; }
    }
    // lumânarea pâlpâie, semnul se leagănă, praful plutește
    const pl = static_ ? 0 : Math.sin(tt * 9.3) * .5 + Math.sin(tt * 23.7) * .3 + Math.sin(tt * 3.1) * .4;
    flacara.scale.set(.07 + pl * .004, .14 + pl * .014, 1); flacara.position.x = static_ ? 0 : Math.sin(tt * 2.2) * .004;
    flacaraLumina.intensity = 1.35 + pl * .14; halou.material.opacity = .82 + pl * .06;
    asazaSemnul(static_ ? 0 : tt);
    if (!static_) {
      for (let i = 0; i < NP; i++) { pp[i * 3 + 1] += .0009 + Math.sin(tt + i) * .0004; pp[i * 3] += Math.sin(tt * .3 + i * 1.7) * .0006; if (pp[i * 3 + 1] > 1.9) pp[i * 3 + 1] = -.1; }
      prafGeo.attributes.position.needsUpdate = true;
      praf.material.opacity = .55 + Math.sin(tt * .8) * .15;
      raza.material.opacity = .1 + Math.sin(tt * .4) * .025;
    }
    randeaza();
    if (!static_ && S3.vizibil && !document.hidden) S3.bucla = requestAnimationFrame(cadru);
  }
  function porneste() { if (!S3.bucla && canvas.isConnected) S3.bucla = requestAnimationFrame(cadru); }

  // ---- mouse-ul: ce capitol e sub cursor, parallax ușor ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function capitolSub(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([st.pagina, dr.pagina])[0];
    if (!hit || !hit.uv) return -1;
    return hit.object.userData.parte * 2 + (hit.uv.y > .5 ? 0 : 1);
  }
  function evidentiaza(i) {
    if (i === S3.aprins) return; S3.aprins = i; deseneazaPaginile();
    canvas.style.cursor = i >= 0 ? "pointer" : "";
    document.querySelectorAll(".capitole-3d .cap-3d").forEach((a, k) => a.classList.toggle("aprins", k === i));
    if (MISCARE_REDUSA()) requestAnimationFrame(cadru);
  }
  canvas.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect(); S3.mx = (e.clientX - r.left) / r.width - .5; S3.my = (e.clientY - r.top) / r.height - .5;
    if (e.pointerType !== "touch") evidentiaza(capitolSub(e));
  });
  canvas.addEventListener("pointerleave", () => { S3.mx = S3.my = 0; evidentiaza(-1); });
  canvas.addEventListener("click", e => {
    const i = capitolSub(e); if (i < 0) return;
    const href = "#/" + CAP_3D[i].k;
    if (!intoarceCapitol3D(i, href, e)) location.hash = href;
  });

  let observator = null;
  return {
    canvas,
    get pornita() { return S3.pornita; },
    info(v) { const s = JSON.stringify(v); if (s !== JSON.stringify(S3.info)) { S3.info = v; deseneazaPaginile(); } },
    dimensioneaza(loc) {
      const w = Math.max(200, loc.clientWidth), hh = Math.max(200, loc.clientHeight);
      if (w === S3.w && hh === S3.h) return; S3.w = w; S3.h = hh;
      renderer.setSize(w, hh, false); canvas.style.width = "100%"; canvas.style.height = "100%";
      camera.aspect = w / hh; camera.fov = w / hh < 1 ? 40 : 34;
      S3.departe = Math.max(1, 1.62 / (w / hh)); camera.updateProjectionMatrix();
      randeaza(); porneste();
    },
    deschide() { S3.pornita = true; S3.start = performance.now(); S3.intoarce = null; stare(0); pozitioneazaCamera(0, 0); randeaza(); porneste(); },
    deschisa() { S3.pornita = true; S3.start = 0; stare(Infinity); pozitioneazaCamera(1, 0); randeaza(); porneste(); },
    evidentiaza,
    intoarce(i, href) {
      const sens = i >= 2 ? 1 : -1;
      S3.intoarce = { t0: performance.now(), sens, href, gata: false }; S3.start = 0; porneste();
      setTimeout(() => { S3.intoarce = null; foi.forEach(x => (x.g.visible = false)); }, 1200);
    },
    observa() {
      if (!observator) observator = new IntersectionObserver(x => { S3.vizibil = x[0].isIntersecting; if (S3.vizibil) porneste(); });
      observator.disconnect(); observator.observe(canvas); S3.vizibil = true; porneste();
    },
  };
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && TREI_D.carte) TREI_D.carte.observa(); });
addEventListener("resize", () => { const c = TREI_D.carte; if (c && c.canvas.parentNode) c.dimensioneaza(c.canvas.parentNode); });
