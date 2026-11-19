/* Caietul de teme — obiecte 3D adevărate pentru capitolele cărții (three.js, randare live în pagină).
   Modelele sunt construite în cod: pergament cu pană, calendar cu inele, tocă de absolvent, teanc de cărți.
   Plutesc, se rotesc lent și se înclină spre mouse. Dacă browserul nu are 3D (WebGL), rămân imaginile.
   Biblioteca se încarcă doar când pagina principală are nevoie de ea. */
"use strict";

const TREI_D = { lib: null, scene: {}, bucla: 0, vizibile: new Set() };
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
    s.onerror = () => nu(new Error("three"));
    document.head.append(s);
  });
}

/* apelat după fiecare desen: pune pânzele 3D (create o singură dată) în locurile din carte */
function monteaza3D() {
  const locuri = document.querySelectorAll(".cap-ilustr[data-model]");
  if (!locuri.length || !estePoveste() || !areWebGL()) return;
  incarcaThree().then(THREE => {
    for (const loc of document.querySelectorAll(".cap-ilustr[data-model]")) {
      const k = loc.dataset.model;
      const sc = TREI_D.scene[k] || (TREI_D.scene[k] = creeazaScena(THREE, k));
      if (!sc) continue;
      if (sc.canvas.parentNode !== loc) { loc.append(sc.canvas); loc.classList.add("are-3d"); }
      dimensioneaza(sc, loc);
      observa(sc);
    }
    pornesteBucla();
  }).catch(() => { /* fără 3D: rămân imaginile */ });
}

function dimensioneaza(sc, loc) {
  const w = Math.max(60, loc.clientWidth), hh = Math.max(50, loc.clientHeight);
  if (sc.w === w && sc.h === hh) return;
  sc.w = w; sc.h = hh;
  sc.renderer.setSize(w, hh, false); sc.canvas.style.width = w + "px"; sc.canvas.style.height = hh + "px";
  sc.camera.aspect = w / hh; sc.camera.updateProjectionMatrix();
}
let observator = null;
function observa(sc) {
  if (!observator) observator = new IntersectionObserver(intrari => {
    for (const i of intrari) { const s = Object.values(TREI_D.scene).find(x => x && x.canvas === i.target); if (s) i.isIntersecting ? TREI_D.vizibile.add(s) : TREI_D.vizibile.delete(s); }
    pornesteBucla(); // bucla repornește imediat ce știm ce se vede
  });
  if (!sc.observat) { observator.observe(sc.canvas); sc.observat = true; }
  // un prim cadru imediat, ca obiectul să apară chiar înainte de animație
  sc.grup.rotation.set(sc.baza.x, sc.baza.y, sc.baza.z); sc.renderer.render(sc.scena, sc.camera);
}

/* o singură buclă de animație pentru toate obiectele; se oprește când nu se vede nimic */
function pornesteBucla() {
  if (TREI_D.bucla) return;
  const pas = t => {
    TREI_D.bucla = 0;
    const active = [...TREI_D.vizibile].filter(s => s.canvas.isConnected);
    if (!active.length || document.hidden) return;
    const static_ = MISCARE_REDUSA();
    for (const s of active) {
      const tt = t / 1000 + s.faza;
      // înclinarea spre mouse, cu inerție
      s.rx += ((s.tintaX || 0) - s.rx) * .08; s.ry += ((s.tintaY || 0) - s.ry) * .08;
      if (static_) { s.grup.position.y = 0; s.grup.rotation.set(s.baza.x, s.baza.y, s.baza.z); }
      else {
        s.grup.position.y = Math.sin(tt * 1.3) * .09;
        s.grup.rotation.x = s.baza.x + Math.sin(tt * .9) * .05 + s.rx;
        s.grup.rotation.y = s.baza.y + Math.sin(tt * .55) * .45 + s.ry;
        s.grup.rotation.z = s.baza.z + Math.sin(tt * .7) * .03;
        s.umbra.scale.setScalar(1 - Math.sin(tt * 1.3) * .12); s.umbra.material.opacity = .32 - Math.sin(tt * 1.3) * .08;
      }
      s.renderer.render(s.scena, s.camera);
    }
    if (!static_) TREI_D.bucla = requestAnimationFrame(pas);
  };
  TREI_D.bucla = requestAnimationFrame(pas);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) pornesteBucla(); });
addEventListener("resize", () => { for (const s of Object.values(TREI_D.scene)) if (s && s.canvas.parentNode) dimensioneaza(s, s.canvas.parentNode); pornesteBucla(); });

/* mouse-ul de pe capitol înclină obiectul (apelat din poveste.js) */
function inclinaObiect3D(k, x, y, hover) {
  const s = TREI_D.scene[k]; if (!s) return;
  s.tintaY = x * .9; s.tintaX = y * .5; s.hover = hover; pornesteBucla();
}

/* ---------------- texturi desenate pe canvas ---------------- */
function textura(THREE, w, hh, deseneaza) {
  const c = document.createElement("canvas"); c.width = w; c.height = hh;
  deseneaza(c.getContext("2d"), w, hh);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; return t;
}

/* ---------------- scena unui capitol ---------------- */
function creeazaScena(THREE, k) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  const canvas = renderer.domElement; canvas.className = "panza-3d"; canvas.setAttribute("aria-hidden", "true");
  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1.3, .1, 50); camera.position.set(0, .5, 3.55); camera.lookAt(0, 0, 0);
  // lumina: caldă din stânga-sus, umplere violet, contur auriu din spate
  scena.add(new THREE.HemisphereLight(0xfff1dc, 0x3a2a55, .55));
  const soare = new THREE.DirectionalLight(0xffe2b0, 1.25); soare.position.set(-2.5, 3.5, 3); scena.add(soare);
  const contur = new THREE.DirectionalLight(0xd8ae75, .55); contur.position.set(2.5, 1.5, -3); scena.add(contur);
  const grup = new THREE.Group(); scena.add(grup);
  const constructori = { pergament: modelPergament, calendar: modelCalendar, toca: modelToca, carti: modelCarti };
  const baza = (constructori[k] || modelCarti)(THREE, grup) || { x: 0, y: 0, z: 0 };
  // umbra moale de pe pagină
  const umbraTex = textura(THREE, 128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, "rgba(70,40,20,.9)"); g.addColorStop(1, "rgba(70,40,20,0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const umbra = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: umbraTex, transparent: true, opacity: .32, depthWrite: false }));
  umbra.rotation.x = -Math.PI / 2; umbra.position.y = -.82; scena.add(umbra);
  return { renderer, canvas, scena, camera, grup, umbra, baza, rx: 0, ry: 0, faza: Math.random() * 6 };
}
// culorile sunt scrise în sRGB; le convertim în spațiul liniar al luminii, altfel apar spălate
const mat = (THREE, culoare, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: culoare, roughness: o.r ?? .7, metalness: o.m ?? 0, map: o.map || null }); m.color.convertSRGBToLinear(); return m; };

/* pergament rulat, cu suluri de lemn și o pană */
function modelPergament(THREE, g) {
  const hartie = textura(THREE, 256, 256, (x, w, hh) => {
    const gr = x.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, "#fbefd2"); gr.addColorStop(1, "#e7cf9d"); x.fillStyle = gr; x.fillRect(0, 0, w, hh);
    x.strokeStyle = "rgba(110,80,50,.65)"; x.lineWidth = 6; x.lineCap = "round";
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(42, 50 + i * 30); x.lineTo(i === 5 ? 140 : 214, 50 + i * 30); x.stroke(); }
    x.fillStyle = "#8d2f47"; x.beginPath(); x.arc(190, 210, 18, 0, 7); x.fill();
  });
  const foaie = new THREE.PlaneGeometry(1.5, 1.3, 20, 8);
  const p = foaie.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getY(i) + .65) / 1.3 * Math.PI) * .07); foaie.computeVertexNormals();
  const f = new THREE.Mesh(foaie, new THREE.MeshStandardMaterial({ map: hartie, roughness: .9, side: THREE.DoubleSide })); g.add(f);
  const lemn = mat(THREE, 0xc89a5a, { r: .55 }), capat = mat(THREE, 0x5a3418, { r: .5 });
  for (const y of [.68, -.68]) {
    const sul = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, 1.62, 24), lemn); sul.rotation.z = Math.PI / 2; sul.position.set(0, y, .02); g.add(sul);
    for (const xx of [-.86, .86]) { const b = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), capat); b.position.set(xx, y, .02); g.add(b); }
  }
  // pana: o lamă subțire, cu nervură și peniță aurie
  const pana = new THREE.Group();
  const lama = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 12), mat(THREE, 0xf2ebf6, { r: .8 })); lama.scale.set(.2, 1.15, .035); lama.position.y = .25; pana.add(lama);
  const tija = new THREE.Mesh(new THREE.CylinderGeometry(.012, .018, 1.4, 8), mat(THREE, 0x7d6a94)); tija.position.y = .1; pana.add(tija);
  const penita = new THREE.Mesh(new THREE.ConeGeometry(.035, .18, 12), mat(THREE, 0xd9a94e, { m: .8, r: .3 })); penita.position.y = -.65; penita.rotation.z = Math.PI; pana.add(penita);
  pana.position.set(.62, .05, .32); pana.rotation.set(.2, -.3, -.55); g.add(pana);
  return { x: -.12, y: -.25, z: .05 };
}

/* calendar de birou cu inele metalice */
function modelCalendar(THREE, g) {
  const fata = textura(THREE, 256, 256, (x, w, hh) => {
    x.fillStyle = "#fffaf0"; x.fillRect(0, 0, w, hh);
    const r = x.createLinearGradient(0, 0, 0, 60); r.addColorStop(0, "#b4566f"); r.addColorStop(1, "#7a2a44"); x.fillStyle = r; x.fillRect(0, 0, w, 60);
    x.fillStyle = "#fff3f6"; x.font = "bold 30px Georgia"; x.textAlign = "center"; x.fillText("NOIEMBRIE", w / 2, 42);
    for (let rr = 0; rr < 4; rr++) for (let c = 0; c < 5; c++) { x.fillStyle = rr === 1 && c === 2 ? "#e8b9c6" : "#ead9b6"; x.fillRect(22 + c * 44, 80 + rr * 42, 34, 32); }
    x.strokeStyle = "#2f8a55"; x.lineWidth = 14; x.lineCap = "round"; x.lineJoin = "round"; x.beginPath(); x.moveTo(98, 170); x.lineTo(122, 196); x.lineTo(176, 132); x.stroke();
  });
  const corp = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.3, .16), [mat(THREE, 0xd8c4a0), mat(THREE, 0xd8c4a0), mat(THREE, 0xe9dcc0), mat(THREE, 0xc9b48c),
    new THREE.MeshStandardMaterial({ map: fata, roughness: .85 }), mat(THREE, 0x7a2a44)]);
  g.add(corp);
  const inel = mat(THREE, 0xd8d8de, { m: .9, r: .25 });
  for (const xx of [-.42, -.14, .14, .42]) { const t = new THREE.Mesh(new THREE.TorusGeometry(.08, .018, 10, 24), inel); t.position.set(xx, .65, .02); t.rotation.y = Math.PI / 2; g.add(t); }
  return { x: -.05, y: -.35, z: .04 };
}

/* toca de absolvent: placă, calotă, nasture și ciucure auriu */
function modelToca(THREE, g) {
  const stofa = mat(THREE, 0x3d2f66, { r: .85 }), aur = mat(THREE, 0xd9a94e, { m: .75, r: .35 });
  const placa = new THREE.Mesh(new THREE.BoxGeometry(1.55, .07, 1.55), stofa); placa.rotation.y = Math.PI / 4; placa.position.y = .22; g.add(placa);
  const calota = new THREE.Mesh(new THREE.CylinderGeometry(.5, .56, .48, 32, 1, true), mat(THREE, 0x2c2148, { r: .85 })); calota.position.y = -.04; g.add(calota);
  const fund = new THREE.Mesh(new THREE.CircleGeometry(.56, 32), mat(THREE, 0x1c142f)); fund.rotation.x = Math.PI / 2; fund.position.y = -.28; g.add(fund);
  const nasture = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), aur); nasture.position.y = .28; g.add(nasture);
  const snur = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .78, 8), aur); snur.rotation.z = Math.PI / 2.2; snur.position.set(.36, .3, 0); g.add(snur);
  const atarna = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .4, 8), aur); atarna.position.set(.72, .1, 0); g.add(atarna);
  const ciucure = new THREE.Mesh(new THREE.ConeGeometry(.07, .26, 16), aur); ciucure.position.set(.72, -.18, 0); ciucure.rotation.x = Math.PI; g.add(ciucure);
  return { x: .38, y: -.3, z: 0 };
}

/* teanc de trei cărți, cu pagini, cotoare și benzi aurii */
function modelCarti(THREE, g) {
  const pagini = textura(THREE, 128, 64, (x, w, hh) => { x.fillStyle = "#f6ead0"; x.fillRect(0, 0, w, hh); x.strokeStyle = "rgba(160,130,90,.45)"; for (let i = 3; i < hh; i += 4) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } });
  const cotor = c => textura(THREE, 256, 64, (x, w, hh) => { x.fillStyle = c; x.fillRect(0, 0, w, hh); x.fillStyle = "#e3bf72"; x.fillRect(0, 10, w, 5); x.fillRect(0, hh - 15, w, 5); x.fillRect(w / 2 - 34, hh / 2 - 7, 68, 14); });
  const carti = [[0x7d2a43, "#7d2a43", 1.5, .3, -.36, .0], [0x3e3870, "#3e3870", 1.36, .27, -.07, .18], [0x2f6049, "#2f6049", 1.22, .25, .19, -.12]];
  for (const [c, hex, w, hh, y, rot] of carti) {
    const pag = new THREE.MeshStandardMaterial({ map: pagini, roughness: .9 }), cop = mat(THREE, c, { r: .6 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, .95), [pag, new THREE.MeshStandardMaterial({ map: cotor(hex), roughness: .55 }), cop, cop, pag, pag]);
    m.position.y = y; m.rotation.y = rot; g.add(m);
  }
  const semn = new THREE.Mesh(new THREE.BoxGeometry(.06, .5, .01), mat(THREE, 0xb03a56)); semn.position.set(.1, .5, .3); g.add(semn);
  return { x: .32, y: -.55, z: 0 };
}
