/* =========================================================
   Shiny Checklist page
   Data: window.MH_SHINY (js/shiny-data.js)
   Progress is saved in localStorage ("mh-shiny-checklist-v1") and can be
   downloaded / loaded as a JSON backup.
   ========================================================= */
(() => {
  const D = window.MH_SHINY, BASE = window.MH_IMG_BASE;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const RM = MH.reduceMotion;
  const img = (u, s = 120) => u ? `${BASE}${u}/revision/latest/scale-to-width-down/${s}` : "";
  const ITEM = n => "item-index.html#item=" + encodeURIComponent(n);
  const KEY = "mh-shiny-checklist-v1";
  const tierCol = t => D.tiers[t] || ["#666", "#fff"];

  /* ---------- Flatten: one entry per shiny variant ---------- */
  const E = [];
  D.items.forEach(it => it.sh.forEach((s, j) => E.push({
    key: it.n + "|" + (s.nm || s.k + j), item: it.n, tier: it.t, type: it.ty, rank: it.r,
    name: (s.nm ? s.nm + " " : s.k === "L" ? "Limited Shiny " : "Shiny ") + it.n, nm: s.nm, kind: s.k, ev: s.ev || "", u: s.u, base: it.img
  })));
  E.forEach((e, i) => { e.i = i; e._t = (e.name + " " + e.item + " " + e.tier + " " + e.ev).toLowerCase(); });
  const byKey = Object.fromEntries(E.map(e => [e.key, e]));

  /* ---------- Saved state ---------- */
  let S = { v: 1, items: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.items) S = s; } catch (e) {}
  const rec = k => S.items[k] || (S.items[k] = {});
  const got = k => !!(S.items[k] && S.items[k].got);
  let saveOk = true;
  function save() {
    // drop empty records so the backup stays tidy
    Object.keys(S.items).forEach(k => { const r = S.items[k]; if (!r.got && !r.life && !r.date && !r.n && !r.note && !r.how) delete S.items[k]; });
    S.saved = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; } catch (e) { saveOk = false; }
    savedNote();
  }
  function savedNote() {
    const el = $("#savedNote");
    el.classList.toggle("bad", !saveOk);
    el.textContent = !saveOk ? "This browser isn't saving. Download a backup!" : S.saved ? "Saved " + new Date(S.saved).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Saved in this browser";
  }
  savedNote();
  const lifeN = l => { if (!l) return Infinity; const n = +String(l).replace(/[^\d]/g, "") || 0; return /s/i.test(l) ? 1e7 + n : n; };

  /* ---------- Filters ---------- */
  const st = { q: "", status: "all", kind: "all", tier: "", sort: "tier" };
  const tiers = [...new Set(E.map(e => e.tier))].sort((a, b) => E.find(e => e.tier === a).rank - E.find(e => e.tier === b).rank);
  $("#fTier").innerHTML += tiers.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  function seg(el, k) { el.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; el.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); st[k] = b.dataset.v; draw(); }); }
  seg($("#fStatus"), "status"); seg($("#fKind"), "kind");
  $("#fTier").addEventListener("change", e => { st.tier = e.target.value; draw(); });
  $("#fSort").addEventListener("change", e => { st.sort = e.target.value; draw(); });
  let qt; $("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { st.q = e.target.value.trim().toLowerCase(); draw(); }, 150); });

  /* ---------- Cards ---------- */
  const grid = $("#grid");
  function card(e) {
    const r = S.items[e.key] || {}, [bg, fg] = tierCol(e.tier);
    const meta = [r.life ? `Life ${esc(r.life)}` : "", r.n > 1 ? `×${fmt(r.n)}` : "", r.date ? esc(new Date(r.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : ""].filter(Boolean);
    return `<div class="sc${r.got ? " got" : ""}${e.kind === "L" ? " lim" : ""}" data-k="${esc(e.key)}" style="--tb:${bg};--tf:${fg}">
      <button type="button" class="sc-tick" aria-pressed="${!!r.got}" aria-label="${r.got ? "Unmark" : "Mark"} ${esc(e.name)} as found"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button type="button" class="sc-edit" aria-label="Details for ${esc(e.name)}"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <div class="sc-img"><img src="${esc(img(e.u, 160))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>${esc(e.item[0])}</span>'" /><i class="sc-glint" aria-hidden="true"></i></div>
      <b class="sc-name">${esc(e.name)}</b>
      <div class="sc-tags"><span class="tp">${esc(e.tier)}</span><span class="kd ${e.kind}">${e.kind === "L" ? "Limited" + (e.ev ? " · " + esc(e.ev) : "") : "Shiny"}</span></div>
      <div class="sc-meta">${meta.length ? meta.map(m => `<span>${m}</span>`).join("") : `<span class="add">${r.got ? "Add life, date…" : "Not found yet"}</span>`}</div>
    </div>`;
  }
  let list = [], shown = 0;
  const PAGE = 60;
  function draw() {
    const q = st.q.split(/\s+/).filter(Boolean);
    list = E.filter(e => (st.status === "all" || (st.status === "got") === got(e.key)) && (st.kind === "all" || e.kind === st.kind) && (!st.tier || e.tier === st.tier) && q.every(t => e._t.includes(t)));
    const byName = (a, b) => a.name.localeCompare(b.name);
    const R = k => S.items[k] || {};
    if (st.sort === "name") list.sort(byName);
    else if (st.sort === "recent") list.sort((a, b) => (R(b.key).at || 0) - (R(a.key).at || 0) || byName(a, b));
    else if (st.sort === "life") list.sort((a, b) => lifeN(R(a.key).life) - lifeN(R(b.key).life) || byName(a, b));
    else if (st.sort === "copies") list.sort((a, b) => (R(b.key).n || 0) - (R(a.key).n || 0) || byName(a, b));
    else list.sort((a, b) => a.rank - b.rank || a.item.localeCompare(b.item) || (a.kind > b.kind ? 1 : -1));
    $("#count").textContent = `${fmt(list.length)} shin${list.length === 1 ? "y" : "ies"}`;
    $("#empty").hidden = list.length > 0;
    grid.innerHTML = ""; shown = 0; more();
  }
  function more() {
    if (shown >= list.length) return;
    grid.insertAdjacentHTML("beforeend", list.slice(shown, shown + PAGE).map(card).join(""));
    [...grid.children].slice(shown).forEach((c, i) => c.style.setProperty("--i", i));
    shown = Math.min(list.length, shown + PAGE);
  }
  const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) more(); }, { rootMargin: "600px" });
  const sentinel = document.createElement("div"); sentinel.className = "sc-sentinel"; grid.after(sentinel); io.observe(sentinel);

  function refreshCard(k) {
    const old = grid.querySelector(`.sc[data-k="${CSS.escape(k)}"]`); if (!old) return;
    const t = document.createElement("div"); t.innerHTML = card(byKey[k]);
    const nu = t.firstElementChild; nu.style.setProperty("--i", 0); nu.classList.add("upd");
    old.replaceWith(nu);
  }
  function toggle(k, el) {
    const r = rec(k); r.got = !r.got;
    if (r.got) { r.at = Date.now(); if (!r.n) r.n = 1; if (!r.date) r.date = new Date().toISOString().slice(0, 10); }
    save(); stats();
    if (st.status !== "all") { const c = grid.querySelector(`.sc[data-k="${CSS.escape(k)}"]`); if (c) { c.classList.add("out"); setTimeout(() => c.remove(), RM ? 0 : 260); } }
    else refreshCard(k);
    if (r.got) { burst(el); MH.toast(`Found ${byKey[k].name}!`); }
  }
  grid.addEventListener("click", e => {
    const c = e.target.closest(".sc"); if (!c) return;
    const k = c.dataset.k;
    if (e.target.closest(".sc-edit")) return openEd(k);
    toggle(k, c);
  });
  function burst(el) {
    if (RM || !el) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("i"); s.className = "sc-spark";
      s.style.left = r.left + r.width / 2 + "px"; s.style.top = r.top + r.height * .4 + "px";
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
      s.style.setProperty("--x", Math.cos(a) * d + "px"); s.style.setProperty("--y", Math.sin(a) * d + "px");
      s.style.setProperty("--c", ["#ffd76b", "#ff7ad9", "#7ad7ff", "#b7ffb0"][i % 4]);
      document.body.appendChild(s); setTimeout(() => s.remove(), 900);
    }
  }

  /* ---------- Stats ---------- */
  function stats() {
    const has = E.filter(e => got(e.key)), lim = E.filter(e => e.kind === "L"), sh = E.filter(e => e.kind === "S");
    const hs = has.filter(e => e.kind === "S").length, hl = has.filter(e => e.kind === "L").length;
    const copies = has.reduce((a, e) => a + (+S.items[e.key].n || 1), 0);
    MH.countUp($("#sGot"), has.length, 600); MH.countUp($("#sTotal"), E.length, 600); MH.countUp($("#sLim"), hl, 600); MH.countUp($("#sCopies"), copies, 600);
    const p = E.length ? has.length / E.length : 0, C = 2 * Math.PI * 100;
    const arc = $("#ringArc"); arc.style.strokeDasharray = C; arc.style.strokeDashoffset = C * (1 - p);
    $("#ringPct").textContent = (p * 100).toFixed(p > 0 && p < .1 ? 1 : 0) + "%";
    $("#ringTxt").textContent = `${fmt(has.length)} of ${fmt(E.length)} found`;
    $("#ringS").textContent = `${hs}/${sh.length}`; $("#ringL").textContent = `${hl}/${lim.length}`;
    $("#ring").classList.toggle("full", has.length === E.length);
    // per-tier progress
    $("#tierProg").innerHTML = tiers.map(t => {
      const all = E.filter(e => e.tier === t), n = all.filter(e => got(e.key)).length, [bg] = tierCol(t);
      return `<button type="button" class="tpg${st.tier === t ? " on" : ""}${n === all.length ? " done" : ""}" data-t="${esc(t)}" style="--c:${bg}"><span>${esc(t)}</span><b>${n}/${all.length}</b><i style="width:${n / all.length * 100}%"></i></button>`;
    }).join("");
  }
  $("#tierProg").addEventListener("click", e => { const b = e.target.closest(".tpg"); if (!b) return; st.tier = st.tier === b.dataset.t ? "" : b.dataset.t; $("#fTier").value = st.tier; stats(); draw(); });

  /* ---------- Edit panel ---------- */
  const W = $("#edWrap"); let edKey = null, lastFocus = null;
  function openEd(k) {
    edKey = k; lastFocus = document.activeElement;
    const e = byKey[k], r = S.items[k] || {};
    $("#edPic").innerHTML = `<img src="${esc(img(e.u, 200))}" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>${esc(e.item[0])}</span>'" />`;
    $("#edKind").textContent = `${e.kind === "L" ? "Limited Shiny" + (e.ev ? " · " + e.ev : "") : "Shiny"} · ${e.tier}`;
    $("#edName").textContent = e.name;
    $("#edLink").href = ITEM(e.item);
    $("#edGot").checked = !!r.got; $("#edLife").value = r.life || ""; $("#edDate").value = r.date || "";
    $("#edCopies").value = r.n || ""; $("#edHow").value = r.how || ""; $("#edNote").value = r.note || "";
    W.hidden = false; requestAnimationFrame(() => W.classList.add("open"));
    $("#edDate").max = new Date().toISOString().slice(0, 10);
    setTimeout(() => $("#edLife").focus(), 50);
  }
  function closeEd() {
    W.classList.remove("open"); setTimeout(() => { W.hidden = true; }, RM ? 0 : 250);
    if (edKey) { refreshCard(edKey); stats(); }
    edKey = null; lastFocus && lastFocus.focus && lastFocus.focus();
  }
  function edSave() {
    if (!edKey) return;
    const r = rec(edKey), was = !!r.got;
    r.got = $("#edGot").checked; r.life = $("#edLife").value.trim(); r.date = $("#edDate").value;
    r.n = Math.max(0, parseInt($("#edCopies").value, 10) || 0); r.how = $("#edHow").value; r.note = $("#edNote").value.trim();
    // filling in details implies you have it
    if (!r.got && (r.life || r.n > 0)) { r.got = true; $("#edGot").checked = true; }
    if (r.got && !was) r.at = Date.now();
    save();
  }
  ["edGot", "edLife", "edDate", "edCopies", "edHow", "edNote"].forEach(id => $("#" + id).addEventListener(id === "edGot" || id === "edHow" || id === "edDate" ? "change" : "input", edSave));
  W.querySelector(".ef-num").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const i = $("#edCopies"); i.value = Math.max(0, (parseInt(i.value, 10) || 0) + +b.dataset.d); edSave(); });
  $("#edClear").addEventListener("click", () => { ["edLife", "edDate", "edCopies", "edNote"].forEach(id => $("#" + id).value = ""); $("#edHow").value = ""; edSave(); });
  $("#edDone").addEventListener("click", closeEd); $("#edClose").addEventListener("click", closeEd);
  W.addEventListener("click", e => { if (e.target === W) closeEd(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !W.hidden) closeEd(); });

  /* ---------- Backup ---------- */
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  $("#dlJson").addEventListener("click", () => {
    save();
    download(`shiny-checklist-${stamp()}.json`, JSON.stringify({ app: "MinersHavenWiki shiny checklist", ...S, exported: new Date().toISOString() }, null, 2), "application/json");
    MH.toast("Backup downloaded");
  });
  $("#dlCsv").addEventListener("click", () => {
    const qv = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = ["shiny,item,tier,kind,event,found,life,date,copies,how,notes", ...E.map(e => { const r = S.items[e.key] || {}; return [qv(e.name), qv(e.item), qv(e.tier), e.kind === "L" ? "Limited Shiny" : "Shiny", qv(e.ev), r.got ? "yes" : "no", qv(r.life), r.date || "", r.n || "", qv(r.how), qv(r.note)].join(","); })];
    download(`shiny-checklist-${stamp()}.csv`, rows.join("\n"), "text/csv");
  });
  $("#upJson").addEventListener("change", e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t);
      if (!d || typeof d.items !== "object") throw 0;
      const items = {}; let n = 0, skipped = 0;
      Object.entries(d.items).forEach(([k, r]) => {
        if (!byKey[k]) { skipped++; return; }
        items[k] = { got: !!r.got, life: String(r.life || "").slice(0, 20), date: /^\d{4}-\d{2}-\d{2}$/.test(r.date || "") ? r.date : "", n: Math.max(0, parseInt(r.n, 10) || 0), how: String(r.how || "").slice(0, 40), note: String(r.note || "").slice(0, 200), at: +r.at || 0 };
        if (items[k].got) n++;
      });
      S = { v: 1, items }; save(); stats(); draw();
      MH.toast(`Loaded backup: ${n} shinies found${skipped ? `, ${skipped} unknown skipped` : ""}`);
    }).catch(() => MH.toast("That file isn't a shiny checklist backup"));
    e.target.value = "";
  });

  /* ---------- Boot ---------- */
  $("#sparks").innerHTML = [[12, 18], [86, 14], [92, 60], [8, 66], [50, 4], [24, 88], [78, 86]].map(([x, y], i) => `<i style="left:${x}%;top:${y}%;animation-delay:${i * .45}s"></i>`).join("");
  stats(); draw();
  // keep tabs in sync if the checklist is open twice
  window.addEventListener("storage", e => { if (e.key !== KEY) return; try { S = JSON.parse(e.newValue) || S; } catch (er) {} stats(); draw(); });

  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }));
})();
