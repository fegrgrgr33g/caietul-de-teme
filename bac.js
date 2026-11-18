/* Caietul de teme: pagina BAC organizată pe file (Simulare · Plan de eseu · Corector · Progres),
   cu istoricul ușor de citit și recomandări din greșelile elevului. Se încarcă înainte de app.js. */
"use strict";

function istoricAntrenamente() {
  const ist = citesteJSON("antrenamente", []);
  if (ist.length || !S.demo) return ist;
  // în demonstrație: câteva rezultate de exemplu, ca să se vadă cum arată progresul
  const zi = 864e5, acum = Date.now();
  return [
    { titlu: "Fișă rapidă: „Somnoroase păsărele”", nota: 6.5, data: acum - 20 * zi, bac: false, tipuri: { grila: 100, text: 50, liber: 45 } },
    { titlu: "Simulare BAC, uman", nota: 6.8, data: acum - 14 * zi, bac: true, tipuri: { grila: 80, text: 60, liber: 50 } },
    { titlu: "Text argumentativ", nota: 7.4, data: acum - 9 * zi, bac: false, tipuri: { liber: 62 } },
    { titlu: "Simulare BAC, uman", nota: 7.9, data: acum - 3 * zi, bac: true, tipuri: { grila: 90, text: 75, liber: 58 } }];
}

function paginaBac() {
  const sub = S.subBac || "sim";
  const corp = sub === "plan" ? [planEseuView()] : sub === "corector" ? [corectorView()] : sub === "progres" ? progresBac()
    : [recomandareScurta(), antrenamentView()].filter(Boolean);
  return [capPagina("Pregătire pentru BAC", {
      sim: "Simulări și antrenamente cu subiecte noi, în stilul modelului oficial, corectate după barem.",
      plan: "Primești structura eseului pe cerințele de la BAC. Eseul îl scrii tu.",
      corector: "Lipește un text scris de tine și află ce să corectezi înainte să-l predai.",
      progres: "Cum evoluează notele tale și ce merită exersat mai departe." }[sub] || ""),
    subFile([["sim", "Simulare"], ["plan", "Plan de eseu"], ["corector", "Corector"], ["progres", "Progres"]], "subBac"), ...corp];
}

/* ---------- recomandări din greșeli ---------- */
function recomandariBac() {
  const ist = istoricAntrenamente(), rec = [];
  const medii = {};
  for (const x of ist) for (const [k, v] of Object.entries(x.tipuri || {})) (medii[k] || (medii[k] = [])).push(v);
  const media = k => medii[k] ? Math.round(medii[k].reduce((a, b) => a + b, 0) / medii[k].length) : null;
  const deschide = (pag, cheie, val) => () => { if (cheie) S[cheie] = val; if (pag === S.pag) draw(); else mergi(pag); };
  const liber = media("liber"), scurt = [media("text"), media("grila"), media("numar")].filter(v => v != null);
  if (liber != null && liber < 65) rec.push({ ic: "✎", c: "var(--c1)", titlu: "Lucrează la eseu și la textul argumentativ",
    text: `La cerințele cu răspuns liber obții în medie ${liber}% din punctaj. Pornește de la un plan clar (introducere, două argumente cu exemple, încheiere), apoi trece textul prin corector.`,
    act: [["Fă un plan de eseu", deschide("bac", "subBac", "plan")], ["Deschide corectorul", deschide("bac", "subBac", "corector")]] });
  if (scurt.length && Math.min(...scurt) < 70) rec.push({ ic: "◎", c: "var(--c4)", titlu: "Citește cerința și textul mai atent",
    text: `La cerințele scurte (grilă, răspuns scurt) ai în medie ${Math.min(...scurt)}%. Recitește fișele operelor și exersează figurile de stil: sunt puncte sigure la Subiectul I.`,
    act: [["Recunoaște figurile de stil", deschide("jocuri", "subJocuri", "fig")], ["Fișele operelor", deschide("opere", "subOpere", "bib")]] });
  const doom = Object.entries(citesteJSON(cheieElev("doom-greseli"), {})).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (doom.length) rec.push({ ic: "Ă", c: "var(--c3)", titlu: "Ortografie: " + doom.slice(0, 3).map(([k]) => DOOM_CATEGORII[k] || k).join(", "),
    text: "Acestea sunt formele la care ai greșit cel mai des. La BAC, greșelile de ortografie scad punctajul de redactare.", act: [["Exersează DOOM", deschide("limba", "subLimba", "doom")]] });
  const gram = Object.entries(citesteJSON(cheieElev("gram-greseli"), {})).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (gram.length) rec.push({ ic: "✒", c: "var(--c2)", titlu: "Punctuație și exprimare: " + gram.slice(0, 2).map(([k]) => CAT_GRAM[k] || k).join(", "),
    text: "Revin exact categoriile la care ai greșit.", act: [["Exersează", deschide("limba", "subLimba", "gram")]] });
  const sim = ist.filter(x => x.bac), ultima = sim.length ? Math.max(...sim.map(x => x.data)) : 0;
  if (!sim.length || Date.now() - ultima > 14 * 864e5) rec.push({ ic: "⏱", c: "var(--c5)", titlu: sim.length ? "Fă o nouă simulare completă" : "Fă prima simulare completă",
    text: sim.length ? "Ultima simulare a fost acum mai bine de două săptămâni. O simulare la două săptămâni te obișnuiește cu timpul de 3 ore." : "O simulare de 3 ore îți arată de unde pornești și ce merită exersat.",
    act: [["Începe o simulare", deschide("bac", "subBac", "sim")]] });
  const citite = Object.values(citesteJSON(cheieElev("citite"), {})).filter(x => x && x.citit).length;
  if (citite < 8) rec.push({ ic: "❦", c: "var(--c1)", titlu: "Cercul de lectură", text: `Ai bifat ${citite} din ${OPERE.length} opere din programă ca citite. Fișele te ajută să le recapitulezi repede.`,
    act: [["Biblioteca", deschide("opere", "subOpere", "bib")]] });
  return rec;
}
function cardRecomandare(r) {
  return h("div", { class: "recomandare", style: "--ic:" + r.c },
    h("span", { class: "rec-ic", "aria-hidden": "true" }, r.ic),
    h("div", { class: "stack", style: "gap:6px;flex:1;min-width:0" }, h("b", null, r.titlu), h("p", { class: "small muted" }, r.text),
      h("div", { class: "row", style: "gap:8px" }, r.act.map(([n, f], i) => h("button", { type: "button", class: i ? "btn ghost mic" : "btn mic", onclick: f }, n)))));
}
function recomandareScurta() {
  const r = recomandariBac()[0];
  if (!r) return null;
  return h("section", { class: "sheet stack", style: "--acc:var(--c2)" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Recomandat pentru tine"),
      h("button", { type: "button", class: "link-btn small", onclick: () => { S.subBac = "progres"; draw(); } }, "Toate recomandările și progresul ›")),
    cardRecomandare(r));
}

/* ---------- progresul: rezumat, grafic, pe tipuri de cerințe, istoric ---------- */
function progresBac() {
  const ist = istoricAntrenamente().slice().sort((a, b) => a.data - b.data);
  const rec = recomandariBac();
  if (!ist.length) return [gol("Încă nu ai niciun antrenament", "După primul antrenament sau prima simulare, aici vezi cum evoluează nota și ce să exersezi.",
    h("button", { class: "btn", type: "button", onclick: () => { S.subBac = "sim"; draw(); } }, "Începe un antrenament")),
    rec.length ? h("section", { class: "sheet stack", style: "--acc:var(--c2)" }, h("h3", null, "Recomandări"), rec.map(cardRecomandare)) : null].filter(Boolean);
  const note = ist.map(x => x.nota), sim = ist.filter(x => x.bac);
  const med = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const ult = note.slice(-3), ant = note.slice(-6, -3);
  const tendinta = ant.length ? med(ult) - med(ant) : null;
  const medii = {};
  for (const x of ist) for (const [k, v] of Object.entries(x.tipuri || {})) (medii[k] || (medii[k] = [])).push(v);
  const tipuri = Object.entries(medii).map(([k, v]) => [k, Math.round(med(v))]).sort((a, b) => a[1] - b[1]);
  return [
    h("div", { class: "cifre" },
      cifra("Antrenamente", ist.length, `${sim.length} ${sim.length === 1 ? "simulare completă" : "simulări complete"}`, "▤", "var(--c4)"),
      cifra("Media", fmtNota(med(note)), sim.length ? `la simulări: ${fmtNota(med(sim.map(x => x.nota)))}` : "toate antrenamentele", "✓", "var(--c3)"),
      cifra("Cea mai bună notă", fmtNota(Math.max(...note)), ist.find(x => x.nota === Math.max(...note)).titlu.slice(0, 34), "★", "var(--c2)"),
      cifra("Tendința", tendinta == null ? "–" : (tendinta >= 0 ? "+" : "") + fmtNota(tendinta), tendinta == null ? "apare după 4 antrenamente" : tendinta >= 0 ? "ultimele 3 față de cele dinainte" : "ultimele 3 sunt mai slabe", tendinta != null && tendinta < 0 ? "↘" : "↗", tendinta != null && tendinta < 0 ? "var(--c1)" : "var(--c3)")),
    ist.length > 1 ? h("section", { class: "sheet stack", style: "--acc:var(--c4)" }, h("h3", null, "Evoluția notei"), graficNote(ist)) : null,
    rec.length ? h("section", { class: "sheet stack", style: "--acc:var(--c2)" }, h("h3", null, "Ce să exersezi mai departe"), h("div", { class: "stack", style: "gap:10px" }, rec.map(cardRecomandare))) : null,
    tipuri.length ? h("section", { class: "sheet stack", style: "--acc:var(--c5)" }, h("h3", null, "Pe tipuri de cerințe"),
      h("p", { class: "muted small" }, "Cât la sută din punctaj obții, în medie, la fiecare tip de cerință."),
      tipuri.map(([k, v]) => h("div", { class: "row small", style: "gap:10px;flex-wrap:nowrap" }, h("span", { style: "width:190px;flex:none" }, NUME_TIPURI[k] || k),
        h("div", { class: "xp" + (v < 50 ? " slab" : ""), style: "flex:1;margin:0" }, h("span", { style: `width:${v}%` })), h("b", { style: "width:44px;text-align:right" }, v + "%")))) : null,
    h("section", { class: "sheet stack", style: "--acc:var(--c3)" }, h("h3", null, "Istoric"),
      h("div", { class: "tbl-wrap" }, h("table", { class: "tabel-carduri" },
        h("thead", null, h("tr", null, h("th", null, "Data"), h("th", null, "Antrenament"), h("th", null, "Tip"), h("th", null, "Nota"))),
        h("tbody", null, ist.slice().reverse().map(x => h("tr", null,
          h("td", { "data-label": "Data", class: "small" }, new Date(x.data).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })),
          h("td", { "data-label": "Antrenament" }, x.titlu),
          h("td", { "data-label": "Tip" }, h("span", { class: "chip " + (x.bac ? "wait" : "none") }, x.bac ? "Simulare BAC" : "Antrenament")),
          h("td", { "data-label": "Nota" }, h("span", { class: "nota" + (x.nota < 5 ? " fail" : "") }, fmtNota(x.nota)))))))),
      S.demo && !citesteJSON("antrenamente", []).length ? h("p", { class: "muted small" }, "(rezultate de exemplu, în demonstrație)") : null)].filter(Boolean);
}
function graficNote(ist) {
  const W = 600, H = 170, px = 34, py = 18, n = ist.length, step = (W - 2 * px) / Math.max(1, n - 1);
  const y = v => py + (10 - v) / 9 * (H - 2 * py);
  const d = ist.map((x, i) => `${i ? "L" : "M"}${(px + i * step).toFixed(1)},${y(x.nota).toFixed(1)}`).join(" ");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "grafic-medii"); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Notele la antrenamente, în ordine: " + ist.map(x => fmtNota(x.nota)).join(", "));
  const esc = s => String(s).replace(/[<&"]/g, "");
  svg.innerHTML = [10, 7.5, 5, 2.5].map(v => `<line x1="${px}" x2="${W - px}" y1="${y(v)}" y2="${y(v)}" class="grila-g"/><text x="${px - 8}" y="${y(v) + 4}" text-anchor="end" class="eticheta-g">${String(v).replace(".", ",")}</text>`).join("")
    + `<path d="${d} L${(px + (n - 1) * step).toFixed(1)},${H - py} L${px},${H - py} Z" class="arie-g"/><path d="${d}" class="linie-g"/>`
    + ist.map((x, i) => `<circle cx="${(px + i * step).toFixed(1)}" cy="${y(x.nota).toFixed(1)}" r="${x.bac ? 6 : 4.5}" class="punct-g${x.nota < 5 ? " slab" : ""}"><title>${esc(x.titlu)}: ${fmtNota(x.nota)}</title></circle>`).join("");
  return h("div", null, svg, h("p", { class: "muted small" }, "Punctele mari sunt simulările complete de BAC."));
}
