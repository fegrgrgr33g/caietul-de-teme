/* Caietul de teme — „Atelier viu”: interacțiunile designului (indicatorul din meniu, dialoguri de confirmare,
   confirmarea animată după trimitere, personalitatea fiecărei pagini). Nu schimbă logica aplicației.
   Se încarcă înainte de app.js; funcțiile se apelează la desen. */
"use strict";

const MISCARE_REDUSA = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* apelat la finalul fiecărui draw() */
function dupaDesen() {
  if (typeof asiguraScena === "function") asiguraScena();
  const app = document.getElementById("app");
  if (app && S.profil) { app.dataset.pag = S.pag || "acasa"; app.dataset.rol = S.profil.rol; }
  else if (app) { delete app.dataset.pag; delete app.dataset.rol; }
  pozitioneazaIndicator();
}

/* ---------- meniul lateral: un indicator care alunecă spre secțiunea activă ---------- */
let indicatorTop = null;
function pozitioneazaIndicator() {
  const nav = document.querySelector(".sidenav"); if (!nav) return;
  const activ = nav.querySelector(".nav-item.on"); let ind = nav.querySelector(".nav-indicator");
  if (!ind) { ind = document.createElement("span"); ind.className = "nav-indicator"; ind.setAttribute("aria-hidden", "true"); nav.append(ind); }
  if (!activ) { ind.style.opacity = "0"; return; }
  const sus = activ.offsetTop, inalt = activ.offsetHeight;
  if (indicatorTop == null || MISCARE_REDUSA()) { ind.style.transition = "none"; ind.style.transform = `translateY(${sus}px)`; }
  else {
    // pornește de unde era înainte de re-desenare, apoi alunecă la noua poziție
    ind.style.transition = "none"; ind.style.transform = `translateY(${indicatorTop}px)`;
    void ind.offsetWidth;
    ind.style.transition = ""; ind.style.transform = `translateY(${sus}px)`;
  }
  ind.style.height = inalt + "px"; ind.style.opacity = "1";
  indicatorTop = sus;
}

// fonturile se încarcă după primul desen și schimbă înălțimea rândurilor: indicatorul se reașază
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { indicatorTop = null; pozitioneazaIndicator(); });
addEventListener("resize", () => { indicatorTop = null; pozitioneazaIndicator(); });

/* ---------- dialog modern de confirmare (înlocuiește „apasă de două ori”) ---------- */
function confirmDialog({ titlu, text, da = "Confirmă", nu = "Renunță", pericol = false }) {
  return new Promise(rezolva => {
    const d = document.createElement("dialog");
    d.className = "dialog-viu" + (pericol ? " pericol" : "");
    d.setAttribute("aria-labelledby", "dlg-titlu");
    const inchide = v => { d.classList.add("iese"); setTimeout(() => { d.close(); d.remove(); rezolva(v); }, MISCARE_REDUSA() ? 0 : 160); };
    d.append(
      h("div", { class: "dlg-ic", "aria-hidden": "true" }, pericol ? "!" : "?"),
      h("h2", { id: "dlg-titlu" }, titlu),
      text ? h("p", null, text) : null,
      h("div", { class: "dlg-butoane" },
        h("button", { type: "button", class: "btn ghost", onclick: () => inchide(false) }, nu),
        h("button", { type: "button", class: "btn" + (pericol ? " pericol" : ""), onclick: () => inchide(true) }, da)));
    d.addEventListener("cancel", e => { e.preventDefault(); inchide(false); });
    d.addEventListener("click", e => { if (e.target === d) inchide(false); });
    document.body.append(d); d.showModal();
    d.querySelector(".btn.ghost").focus();
  });
}

/* ---------- confirmare animată după ce o temă a fost trimisă ---------- */
function confirmareTrimitere(nota) {
  document.querySelector(".confirmare-viu")?.remove();
  const bine = nota != null && nota >= 5;
  const el = h("div", { class: "confirmare-viu", role: "status", "aria-live": "polite" },
    h("div", { class: "conf-card" },
      h("div", { class: "conf-sigiliu", "aria-hidden": "true" },
        (() => { const s = h("span"); s.innerHTML = `<svg viewBox="0 0 52 52" width="64" height="64"><circle cx="26" cy="26" r="23" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; return s; })()),
      h("h2", null, "Tema a fost trimisă"),
      h("p", null, nota == null ? "Răspunsurile libere se corectează acum. Nota apare imediat ce e gata." : bine ? `Nota ta: ${fmtNota(nota)}. Felicitări!` : `Nota ta: ${fmtNota(nota)}. Uită-te la corecturi: poți învăța mult din ele.`),
      h("button", { type: "button", class: "btn", onclick: () => el.remove() }, "Vezi corectura")));
  el.addEventListener("click", e => { if (e.target === el) el.remove(); });
  document.body.append(el);
  el.querySelector(".btn").focus({ preventScroll: true });
  setTimeout(() => el.isConnected && el.classList.add("pleaca"), 3600);
  setTimeout(() => el.remove(), 4000);
}

/* ---------- eticheta mică de deasupra titlului, diferită pe fiecare pagină ---------- */
const SUPRATITLURI = {
  elev: { acasa: "Spațiul tău de învățare", teme: "Caietul cu teme", tema: "La masa de lucru", calendar: "Agenda termenelor", clasament: "Clasa ta", bac: "Sala de examen",
    opere: "Biblioteca digitală", limba: "Atelier de limbă", jocuri: "Pauză activă", profil: "Profilul tău", rezultate: "Jurnalul progresului" },
  profesor: { acasa: "Catedra", teme: "Temele clasei", tema: "Lucrările elevilor", "tema-noua": "Pregătește o temă", elevi: "Catalogul clasei", elev: "Fișa elevului",
    calendar: "Agenda clasei", plan: "Planificare", banca: "Arhiva de subiecte", clase: "Clasele tale" },
};
function supratitlu() { const r = S.profil && SUPRATITLURI[S.profil.rol]; return (r && r[S.pag]) || ""; }

/* ---------- meniul „Mai mult” de pe telefon: se închide cu Esc, focusul intră în el ---------- */
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && typeof S !== "undefined" && S.meniuMai) { S.meniuMai = false; draw(); document.querySelector(".bottomnav .nav-item:last-child")?.focus(); }
});
