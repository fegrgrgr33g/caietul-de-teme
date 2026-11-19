/* Caietul de teme — „Povestea Cunoașterii 2.0”: decorul comun al lumii.
   La capătul fiecărei pagini (doar pe ecrane mari): o pisică albă care doarme pe două cărți,
   iar în dreapta călimara cu pană, o ceașcă de ceai care aburește și un felinar aprins.
   Sunt desene vectoriale originale, decorative (aria-hidden), care nu primesc clicuri și stau sub dialoguri.
   Se apelează după fiecare desen (din viu.js). */
"use strict";

const LUME_PISICA = `<svg viewBox="0 0 240 160" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="lj-blana" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf8"/><stop offset=".65" stop-color="#f6ece0"/><stop offset="1" stop-color="#e2cdb8"/></linearGradient>
    <radialGradient id="lj-umbra-blana" cx=".5" cy=".9" r=".7"><stop offset="0" stop-color="#d9bfa6" stop-opacity=".7"/><stop offset="1" stop-color="#d9bfa6" stop-opacity="0"/></radialGradient>
    <linearGradient id="lj-carte1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e2f45"/><stop offset="1" stop-color="#561a29"/></linearGradient>
    <linearGradient id="lj-carte2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4a2a"/><stop offset="1" stop-color="#4a2b16"/></linearGradient>
    <linearGradient id="lj-foi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf1da"/><stop offset="1" stop-color="#e2cda2"/></linearGradient>
  </defs>
  <!-- cărțile -->
  <path d="M14 132 h200 l10 -8 v20 l-10 8 h-200 z" fill="url(#lj-carte2)"/>
  <path d="M214 132 l10 -8 v20 l-10 8 z" fill="url(#lj-foi)"/>
  <path d="M30 136 h20 M190 136 h-20" stroke="#d6a957" stroke-width="3"/>
  <path d="M26 110 h180 l10 -8 v22 l-10 8 h-180 z" fill="url(#lj-carte1)"/>
  <path d="M206 110 l10 -8 v22 l-10 8 z" fill="url(#lj-foi)"/>
  <path d="M207 113 l8 -6 M207 117 l8 -6 M207 121 l8 -6 M207 125 l8 -6" stroke="#c9ad7c" stroke-width=".8"/>
  <path d="M42 113 v18 M58 113 v18 M174 113 v18 M190 113 v18" stroke="#e0b35c" stroke-width="2.2"/>
  <path d="M96 116 h40" stroke="#e0b35c" stroke-width="2"/><path d="M26 110 h180" stroke="#b04a62" stroke-width="1.2"/>
  <!-- pisica -->
  <g class="respira">
    <ellipse cx="124" cy="104" rx="78" ry="10" fill="url(#lj-umbra-blana)"/>
    <path d="M58 96 C52 66 92 46 132 48 C176 50 204 66 202 92 C200 106 180 110 150 110 L80 110 C66 110 60 104 58 96 Z" fill="url(#lj-blana)"/>
    <path d="M150 58 C176 60 196 72 198 90" fill="none" stroke="#e8d6c2" stroke-width="5" stroke-linecap="round" opacity=".7"/>
    <path d="M168 70 c8 6 12 14 12 22" fill="none" stroke="#e2cdb8" stroke-width="2" opacity=".6"/>
    <!-- coada se înfășoară pe dinainte -->
    <path class="coada" d="M196 96 C206 110 182 118 140 116 C112 115 92 112 86 106" fill="none" stroke="url(#lj-blana)" stroke-width="15" stroke-linecap="round"/>
    <path d="M196 96 C206 110 182 118 140 116" fill="none" stroke="#e6d2bd" stroke-width="2" opacity=".55"/>
    <!-- labele din față, sub cap -->
    <ellipse cx="74" cy="106" rx="16" ry="7" fill="#fbf4ea"/><path d="M66 106 v3 M72 107 v3 M78 107 v3" stroke="#dcc6b0" stroke-width="1.2" stroke-linecap="round"/>
    <!-- capul, culcat pe labe -->
    <g>
      <path class="ureche" d="M48 66 L52 40 L70 58 Z" fill="#f8efe4"/><path d="M53 60 L55 46 L65 57 Z" fill="#f2b9c1"/>
      <path d="M84 56 L98 38 L102 64 Z" fill="#f8efe4"/><path d="M90 58 L98 46 L99 62 Z" fill="#f2b9c1"/>
      <ellipse cx="74" cy="80" rx="32" ry="26" fill="url(#lj-blana)"/>
      <ellipse cx="74" cy="90" rx="17" ry="11" fill="#fffdf9"/>
      <path d="M58 79 q6 5 12 0 M80 79 q6 5 12 0" fill="none" stroke="#6d5560" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M72 86 l3 3 3 -3 z" fill="#e9909e"/><path d="M75 89 q-3 4 -7 3 M75 89 q3 4 7 3" fill="none" stroke="#b98d93" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M50 88 h-14 M51 92 h-13 M98 88 h14 M97 92 h13" stroke="#dccbbb" stroke-width="1" stroke-linecap="round"/>
      <ellipse cx="60" cy="88" rx="5" ry="3" fill="#f6c9cf" opacity=".55"/><ellipse cx="90" cy="88" rx="5" ry="3" fill="#f6c9cf" opacity=".55"/>
    </g>
  </g>
</svg>`;

const LUME_BIROU = `<svg viewBox="0 0 260 190" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="lb-halou" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".75"/><stop offset=".45" stop-color="#ffb04a" stop-opacity=".22"/><stop offset="1" stop-color="#ffb04a" stop-opacity="0"/></radialGradient>
    <linearGradient id="lb-sticla" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c6"/><stop offset=".55" stop-color="#ffc86a"/><stop offset="1" stop-color="#e08a2c"/></linearGradient>
    <linearGradient id="lb-bronz" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2614"/><stop offset=".5" stop-color="#8a6230"/><stop offset="1" stop-color="#2e1d0f"/></linearGradient>
    <linearGradient id="lb-cerneala" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#14101e"/><stop offset=".45" stop-color="#3a3150"/><stop offset="1" stop-color="#0e0b16"/></linearGradient>
    <linearGradient id="lb-portelan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9e0d6"/></linearGradient>
    <linearGradient id="lb-pana" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#ddd0bd"/></linearGradient>
  </defs>
  <!-- felinarul -->
  <circle class="halou-felinar" cx="206" cy="92" r="64" fill="url(#lb-halou)"/>
  <path d="M206 22 a8 8 0 1 1 0.1 0" fill="none" stroke="#6b4a24" stroke-width="3"/>
  <path d="M190 40 h32 l-6 -10 h-20 z" fill="url(#lb-bronz)"/>
  <rect x="186" y="40" width="40" height="8" rx="2" fill="#5a3c1c"/>
  <rect x="188" y="48" width="36" height="78" rx="3" fill="url(#lb-sticla)" opacity=".9"/>
  <path class="flacara-felinar" d="M206 70 c-8 12 -8 24 0 30 c8 -6 8 -18 0 -30 z" fill="#fff6d6"/>
  <path d="M188 48 v78 M224 48 v78 M206 48 v78" stroke="#4a3018" stroke-width="3"/>
  <path d="M188 78 h36" stroke="#4a3018" stroke-width="2" opacity=".6"/>
  <rect x="182" y="126" width="48" height="10" rx="3" fill="url(#lb-bronz)"/>
  <path d="M188 136 l-4 30 h44 l-4 -30 z" fill="#3e2a15"/><rect x="178" y="164" width="56" height="8" rx="3" fill="#5a3c1c"/>
  <!-- călimara cu pana -->
  <path d="M80 168 c-6 -30 -2 -42 10 -46 h18 c12 4 16 16 10 46 z" fill="url(#lb-cerneala)"/>
  <rect x="88" y="112" width="22" height="12" rx="2" fill="#2a2238"/><rect x="86" y="108" width="26" height="6" rx="2" fill="#c9963c"/>
  <path d="M88 146 h22 v12 h-22 z" fill="#c9963c" opacity=".85"/><path d="M95 150 l4 4 4 -4" stroke="#5e1d2b" stroke-width="1.6" fill="none"/>
  <path d="M86 128 c4 -2 8 -2 10 0" stroke="#7a6f96" stroke-width="2" fill="none" opacity=".7"/>
  <path d="M100 110 C108 70 132 34 170 8 C160 46 134 80 104 112 Z" fill="url(#lb-pana)"/>
  <path d="M101 112 C114 80 136 46 168 12" stroke="#a69780" stroke-width="1.4" fill="none"/>
  <path d="M112 90 l12 -4 M118 78 l13 -5 M126 66 l12 -6 M134 54 l12 -7 M144 42 l11 -7" stroke="#cfc0aa" stroke-width="1" fill="none"/>
  <!-- ceașca de ceai cu farfurie și abur -->
  <g class="abur" fill="none" stroke="#fff6ea" stroke-width="2.4" stroke-linecap="round" opacity=".8">
    <path d="M26 118 c-6 -8 6 -12 0 -22 c-5 -8 4 -12 2 -18"/><path d="M38 118 c-6 -8 6 -12 0 -22 c-5 -8 4 -12 2 -18"/><path d="M50 118 c-6 -8 6 -12 0 -22"/>
  </g>
  <ellipse cx="38" cy="168" rx="38" ry="7" fill="url(#lb-portelan)"/><ellipse cx="38" cy="166" rx="26" ry="4" fill="#e3d7c9"/>
  <path d="M12 128 h52 c0 22 -10 36 -26 38 c-16 -2 -26 -16 -26 -38 z" fill="url(#lb-portelan)"/>
  <ellipse cx="38" cy="128" rx="26" ry="5" fill="#7a4a2a"/><ellipse cx="38" cy="128" rx="26" ry="5" fill="none" stroke="#d6a957" stroke-width="1.6"/>
  <path d="M64 134 c12 -2 14 16 -2 18" fill="none" stroke="#efe6da" stroke-width="5"/>
  <circle cx="30" cy="146" r="4" fill="#d9879c"/><circle cx="44" cy="150" r="3" fill="#d9879c"/><path d="M33 150 q4 -4 8 -1" stroke="#7d9a6c" stroke-width="1.6" fill="none"/>
</svg>`;

const LUME_CACHE = {};
function asiguraLumea() {
  const b = document.body;
  const activ = typeof estePoveste === "function" && estePoveste() && typeof S !== "undefined" && !!S.profil;
  b.classList.toggle("cu-lume", activ);
  b.classList.toggle("pagina-parinte", !!new URLSearchParams(location.search).get("parinte"));
  if (typeof S !== "undefined") b.dataset.pag = S.pag || "acasa";
  // decorul se pune la capătul paginii curente (pagina se redesenează, așa că îl mutăm de fiecare dată)
  const pagina = document.querySelector(".cadru .pagina");
  if (!activ || !pagina) { document.querySelectorAll(".lume-jos").forEach(x => x.remove()); return; }
  for (const [cls, svg] of [["st", LUME_PISICA], ["dr", LUME_BIROU]]) {
    let el = LUME_CACHE[cls];
    if (!el) { el = LUME_CACHE[cls] = document.createElement("div"); el.className = "lume-jos " + cls; el.setAttribute("aria-hidden", "true"); el.innerHTML = svg; }
    if (el.parentNode !== pagina) pagina.append(el);
  }
}
