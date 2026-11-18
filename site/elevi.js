/* Caietul de teme: pagina „Elevi” a profesorului (căutare, filtre, sortare, restanțe) și fișa elevului pe secțiuni.
   Folosește funcțiile din app.js, nav.js și plus.js; se încarcă înainte de app.js. */
"use strict";

/* teme care contează pentru un elev: publicate, cu termenul trecut, pentru grupa lui */
function temeRestante(m) {
  const azi = ziISO(Date.now());
  return (S.teme || []).filter(t => t.termen && t.termen < azi && !t.ciorna && !(t.publicata_la && new Date(t.publicata_la) > new Date())
    && (!t.grupa || t.grupa === m.grupa) && !S.predari.some(p => p.tema_id === t.id && p.elev_id === m.elev_id));
}
function temeAleElevului(m) {
  return [...(S.teme || [])].filter(t => !t.ciorna && !(t.publicata_la && new Date(t.publicata_la) > new Date()) && (!t.grupa || t.grupa === m.grupa))
    .sort((a, b) => String(a.creat_la).localeCompare(String(b.creat_la)));
}
function rezumatElev(m) {
  const teme = temeAleElevului(m);
  const note = teme.map(t => notaFinala(S.predari.find(p => p.tema_id === t.id && p.elev_id === m.elev_id)));
  const ok = note.filter(n => n != null);
  return { m, nume: (m.profiles && m.profiles.nume) || "Elev", teme, note, trimise: ok.length,
    media: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null, restante: temeRestante(m) };
}

function paginaElevi(clasa) {
  const F = S.filtruElevi || (S.filtruElevi = { grupa: "", stare: "", sort: "nume" });
  const toti = S.membri.map(rezumatElev);
  const q = normalizeaza(S.cautElevi || "");
  const lista = toti.filter(r => (!q || normalizeaza(r.nume).includes(q))
      && (!F.grupa || (F.grupa === "-" ? !r.m.grupa : r.m.grupa === F.grupa))
      && (!F.stare || (F.stare === "restante" ? r.restante.length : !r.restante.length)))
    .sort((a, b) => F.sort === "medie" ? (b.media ?? -1) - (a.media ?? -1) || a.nume.localeCompare(b.nume, "ro")
      : F.sort === "trimise" ? b.trimise - a.trimise || a.nume.localeCompare(b.nume, "ro")
      : a.nume.localeCompare(b.nume, "ro"));
  const cuRestante = toti.filter(r => r.restante.length).length;
  const seteaza = (k, v) => { F[k] = v; draw(); };

  const unelte = h("div", { class: "sheet stack unelte-elevi" },
    h("div", { class: "row" }, campCautare("caut-elevi", "cautElevi", "Caută un elev după nume…")),
    h("div", { class: "filtre" },
      h("label", { class: "f mic", for: "f-grupa" }, "Grupa", selectSimplu("f-grupa", "Grupa", [["", "Toate grupele"], ["uman", "uman"], ["real", "real"], ["-", "Fără grupă"]], F.grupa, v => seteaza("grupa", v))),
      h("label", { class: "f mic", for: "f-stare" }, "Teme", selectSimplu("f-stare", "Teme restante", [["", "Toți elevii"], ["restante", "Cu teme restante"], ["la-zi", "La zi"]], F.stare, v => seteaza("stare", v))),
      h("label", { class: "f mic", for: "f-sort" }, "Ordonează", selectSimplu("f-sort", "Ordonează", [["nume", "După nume"], ["medie", "După medie"], ["trimise", "După teme trimise"]], F.sort, v => seteaza("sort", v)))),
    h("div", { class: "row small muted" }, `${lista.length} din ${toti.length} elevi`,
      cuRestante ? h("button", { type: "button", class: "chip wait", style: "cursor:pointer", onclick: () => seteaza("stare", F.stare === "restante" ? "" : "restante") }, `${cuRestante} cu teme restante`) : h("span", { class: "chip ok" }, "Toți sunt la zi"),
      (q || F.grupa || F.stare) ? h("button", { type: "button", class: "link-btn", onclick: () => { S.cautElevi = ""; Object.assign(F, { grupa: "", stare: "" }); draw(); } }, "Șterge filtrele") : null));

  const tabel = lista.length ? h("div", { class: "sheet tbl-wrap" }, h("table", { class: "tabel-carduri tabel-elevi" },
    h("thead", null, h("tr", null, h("th", null, "Elev"), h("th", null, "Media"), h("th", null, "Teme trimise"), h("th", null, "Restanțe"), h("th", null, "Grupa"), h("th", null, "Evoluția notelor"))),
    h("tbody", null, lista.map(r => h("tr", { class: r.restante.length ? "restant" : "" },
      h("td", { "data-label": "Elev" }, h("a", { class: "row link-elev", href: "#/elev/" + encodeURIComponent(r.m.elev_id), style: "gap:10px;flex-wrap:nowrap" },
        avatar(r.m.profiles && r.m.profiles.avatar, r.nume, 30), h("span", null, r.nume))),
      h("td", { "data-label": "Media" }, r.media == null ? h("span", { class: "muted" }, "–") : h("span", { class: "nota" + (r.media < 5 ? " fail" : "") }, fmtNota(r.media))),
      h("td", { "data-label": "Teme trimise", class: "small" }, `${r.trimise}/${r.teme.length}`),
      h("td", { "data-label": "Restanțe" }, r.restante.length ? h("span", { class: "chip wait", title: r.restante.map(t => t.titlu).join(", ") }, `${r.restante.length} ${r.restante.length === 1 ? "temă" : "teme"}`) : h("span", { class: "muted small" }, "—")),
      h("td", { "data-label": "Grupa" }, selectGrupa(r.m)),
      h("td", { "data-label": "Evoluție" }, sparkline(r.note))))))) : gol("Niciun elev găsit", "Schimbă căutarea sau filtrele.");
  return [capPagina("Elevii clasei", `${S.membri.length} elevi în ${clasa.nume}. Apasă pe un nume ca să vezi fișa elevului.`), unelte, tabel, clasamentProfView()];
}
function selectGrupa(m) {
  return h("select", { "aria-label": "Grupa elevului " + ((m.profiles && m.profiles.nume) || ""), style: "width:auto;padding:6px 8px", onchange: async e => {
    const v = e.target.value || null, vechi = m.grupa; m.grupa = v;
    if (S.demo) { toast("Grupa a fost schimbată (demonstrație)."); draw(); return; }
    const { error } = await S.sb.from("membri").update({ grupa: v }).eq("clasa_id", S.clasaSel).eq("elev_id", m.elev_id);
    if (error) { m.grupa = vechi; toast("Grupa nu a putut fi schimbată."); } else toast("Grupa a fost salvată.");
    draw();
  } }, [["", "—"], ["uman", "uman"], ["real", "real"]].map(([v, n]) => { const o = h("option", { value: v }, n); o.selected = (m.grupa || "") === v; return o; }));
}

/* ---------------- fișa elevului: Progres · Teme · Feedback ---------------- */
function fisaElev(id) {
  const m = S.membri.find(x => x.elev_id === id);
  if (!m) return [capPagina("Elevul nu a fost găsit", "Poate e în altă clasă.", null, ["elevi", "Elevii clasei"])];
  const r = rezumatElev(m), clasa = S.clase.find(c => c.id === S.clasaSel);
  const azi = ziISO(Date.now());
  const rand = r.teme.map(t => ({ t, p: S.predari.find(p => p.tema_id === t.id && p.elev_id === id) }));
  const msg = (S.mesaje || []).filter(x => x.elev_id === id);
  const sit = situatieElevi().find(x => x.m.elev_id === id);
  const tipar = !!S.tiparFisa;
  const sec = tipar ? "toate" : (S.subFisa || "progres");

  const progres = () => {
    const agg = {};
    for (const { p } of rand) {
      if (!p) continue;
      for (const ex of S.exercitii.filter(e => e.tema_id === p.tema_id)) { const x = (p.rezultate || {})[ex.id]; if (!x || typeof x.puncte !== "number") continue;
        const a = agg[ex.tip] || (agg[ex.tip] = [0, 0]); a[0] += x.puncte; a[1] += Number(ex.puncte); }
    }
    const tipuri = Object.entries(agg).filter(([, [, mx]]) => mx).map(([k, [pp, mx]]) => [k, Math.round(pp / mx * 100)]).sort((a, b) => a[1] - b[1]);
    return h("section", { class: "sheet stack", style: "--acc:var(--c4)" }, h("h3", null, "Progres"),
      h("div", { class: "cifre" },
        cifra("Media", r.media == null ? "–" : fmtNota(r.media), r.trimise ? `din ${r.trimise} ${r.trimise === 1 ? "notă" : "note"}` : "nicio notă încă", "✓", "var(--c3)"),
        cifra("Teme trimise", `${r.trimise}/${r.teme.length}`, "teme publicate pentru elev", "▤", "var(--c4)"),
        cifra("Restanțe", r.restante.length, r.restante.length ? "teme cu termenul trecut" : "la zi", "!", r.restante.length ? "var(--c2)" : "var(--c3)"),
        cifra("Mesaje", msg.length, msg.length ? "în conversațiile la teme" : "niciun mesaj", "✉", "var(--c5)")),
      r.trimise > 1 ? h("div", null, h("div", { class: "label" }, "Evoluția notelor, în ordinea temelor"), sparkline(r.note)) : null,
      sit && sit.motive.length ? h("div", { class: "note" }, "De urmărit: " + sit.motive.join(", ") + ".") : null,
      tipuri.length ? h("div", { class: "stack", style: "gap:8px" }, h("div", { class: "label" }, "Pe tipuri de exerciții"),
        tipuri.map(([k, v]) => h("div", { class: "row small", style: "gap:10px;flex-wrap:nowrap" }, h("span", { style: "width:180px;flex:none" }, NUME_TIPURI[k] || k),
          h("div", { class: "xp" + (v < 50 ? " slab" : ""), style: "flex:1;margin:0" }, h("span", { style: `width:${v}%` })), h("b", { style: "width:44px;text-align:right" }, v + "%")))) : null);
  };
  const teme = () => h("section", { class: "sheet stack", style: "--acc:var(--c2)" }, h("h3", null, "Teme"),
    rand.length ? h("div", { class: "tbl-wrap" }, h("table", { class: "tabel-carduri" },
      h("thead", null, h("tr", null, h("th", null, "Tema"), h("th", null, "Termen"), h("th", null, "Stare"), h("th", null, "Nota"), h("th", { class: "nu-tipari" }, ""))),
      h("tbody", null, rand.map(({ t, p }) => { const n = p ? notaFinala(p) : null, intarziat = t.termen && (p ? String(p.trimis_la).slice(0, 10) > t.termen : t.termen < azi);
        return h("tr", { class: !p && t.termen && t.termen < azi ? "restant" : "" },
          h("td", { "data-label": "Tema" }, t.titlu), h("td", { "data-label": "Termen", class: "small" }, t.termen ? fmtZi(t.termen) : "–"),
          h("td", { "data-label": "Stare" }, p ? h("span", { class: "chip " + (intarziat ? "wait" : "ok") }, intarziat ? "trimisă cu întârziere" : "trimisă " + fmtData(p.trimis_la)) : h("span", { class: "chip " + (t.termen && t.termen < azi ? "err" : "none") }, t.termen && t.termen < azi ? "restantă" : "netrimisă")),
          h("td", { "data-label": "Nota" }, n == null ? "–" : h("span", null, h("span", { class: "nota" + (n < 5 ? " fail" : "") }, fmtNota(n)), p.nota_profesor != null ? h("span", { class: "sursa prof", style: "margin-left:6px" }, "profesor") : null)),
          h("td", { class: "nu-tipari", "data-label": "" }, p ? h("button", { class: "link-btn", type: "button", onclick: () => deschideLucrarea(t.id, p.id) }, "Deschide lucrarea") : null)); })))) : h("p", { class: "muted small" }, "Nicio temă publicată încă."));
  const feedback = () => {
    const com = rand.filter(x => x.p && x.p.comentariu_profesor);
    const ai = rand.filter(x => x.p && x.p.feedback && x.p.feedback.rezumat);
    return h("section", { class: "sheet stack", style: "--acc:var(--c5)" }, h("h3", null, "Feedback"),
      h("div", { class: "stack", style: "gap:8px" }, h("div", { class: "label" }, "Comentariile profesorului"),
        com.length ? com.map(x => h("div", { class: "feedback-general" }, h("b", null, x.t.titlu), h("p", { class: "small" }, x.p.comentariu_profesor))) : h("p", { class: "muted small" }, "Niciun comentariu scris încă.")),
      ai.length ? h("div", { class: "stack", style: "gap:8px" }, h("div", { class: "label" }, "Rezumatul corectării automate"),
        ai.map(x => h("p", { class: "small" }, h("b", null, x.t.titlu + ": "), x.p.feedback.rezumat, " ", h("span", { class: "sursa ai" }, "AI")))) : null,
      msg.length ? h("div", { class: "stack nu-tipari", style: "gap:8px" }, h("div", { class: "label" }, "Mesaje"),
        [...new Set(msg.map(x => x.tema_id))].map(tid => { const t = S.teme.find(x => x.id === tid), ult = msg.filter(x => x.tema_id === tid).sort((a, b) => String(b.creat_la).localeCompare(String(a.creat_la)))[0];
          return h("button", { type: "button", class: "rand-verif", onclick: () => { S.msgDeschis = "msg-" + tid + "-" + id; const p = S.predari.find(x => x.tema_id === tid && x.elev_id === id); if (p) deschideLucrarea(tid, p.id, "in-msg-" + tid + "-" + id); else mergi("tema", tid); } },
            h("span", { class: "nume" }, t ? t.titlu : "Temă"), h("span", { class: "small", style: "flex:1;text-align:left" }, "„" + ult.text.slice(0, 80) + (ult.text.length > 80 ? "…" : "") + "”"),
            h("span", { class: "muted small" }, ult.autor_id === id ? "de la elev" : "de la tine")); })) : null);
  };

  return [h("a", { href: "#/elevi", class: "inapoi nu-tipari" }, "‹ Elevii clasei"),
    h("section", { class: "sheet fisa-cap", style: "--acc:var(--c1)" },
      h("div", { class: "row", style: "gap:16px" }, avatar(m.profiles && m.profiles.avatar, r.nume, 60),
        h("div", { style: "flex:1;min-width:0" }, h("h2", { class: "titlu-pagina" }, r.nume), h("div", { class: "muted small" }, (clasa ? clasa.nume : "") + (m.grupa ? " · grupa " + m.grupa : ""))),
        h("button", { class: "btn nu-tipari", type: "button", onclick: tiparesteFisa }, "Raport pentru părinți"))),
    tipar ? null : h("div", { class: "nu-tipari" }, subFile([["progres", "Progres"], ["teme", "Teme"], ["feedback", "Feedback"]], "subFisa")),
    ...(sec === "toate" ? [progres(), teme(), feedback()] : sec === "teme" ? [teme()] : sec === "feedback" ? [feedback()] : [progres()]),
    h("p", { class: "muted small doar-tipar" }, `Raport generat de Caietul de teme, ${new Date().toLocaleDateString("ro-RO")}.`)];
}
/* raportul tipărit cuprinde toate secțiunile, nu doar fila deschisă */
function tiparesteFisa() {
  S.tiparFisa = true; draw();
  const gata = () => { S.tiparFisa = false; draw(); removeEventListener("afterprint", gata); };
  addEventListener("afterprint", gata);
  setTimeout(() => window.print(), 50);
}
