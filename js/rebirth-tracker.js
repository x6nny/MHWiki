/* =========================================================
   Rebirth Tracker page
   Data: window.MH_REBIRTH (js/rebirth-data.js) for item unlocks
   Saved in localStorage ("mh-rebirth-tracker-v1")
   ========================================================= */
(() => {
  const RB = window.MH_REBIRTH || { items: [] }, BASE = window.MH_IMG_BASE;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const RM = MH.reduceMotion;
  const img = (p, size = 80) => p ? `${BASE}${p}/revision/latest/scale-to-width-down/${size}` : "";
  const ITEM = n => "item-index.html#item=" + encodeURIComponent(n);
  const KEY = "mh-rebirth-tracker-v1";
  const DAY = 864e5;
  let logReady = false;

  /* ---------- Game milestones (life → note) ---------- */
  const GAME = [
    { life: 100, t: "Escrowed items come back", d: "Items held in Escrow after a sacrifice return when you rebirth into life 100." },
    { life: 1000, t: "Sacrifices unlock", d: "Life 1,000 is the minimum for the Ultimate Sacrifice and the Second Sacrifice.", link: "sacrifice.html" },
    { life: 1401, t: "Rebirth price hits $1DD", d: "The cash you need for an Overlord Device (one per day)." },
    { life: 5000, t: "Prices grow slower", d: "After life 5,000 rebirth prices rise more slowly than before." },
    { life: 10000, t: "Every Reborn item unlocked", d: "By life 10,000 every rebirth item can drop.", link: "rebirth.html" },
    { life: 13941, t: "Rebirth price hits $1tsTG", d: "The cash you need for a True Overlord Device." },
    { life: 47531, t: "Old maximum price", d: "The previous highest rebirth price, 25NQQGNT." },
    { life: 80351, t: "Maximum rebirth price", d: "From here the rebirth price stops going up: 10NVSPTGNTL." }
  ];
  const UNLOCKS = (RB.items || []).filter(i => i.life > 0 && ["reborn", "advanced", "decimal"].includes(i.k)).sort((a, b) => a.life - b.life);
  const KIND = { reborn: "Reborn", advanced: "Advanced Reborn", decimal: "Decimal" };

  /* ---------- State ---------- */
  const DEF = { life: 1, goal: 1000, min: 1, sec: 30, skip: 0, hours: 3, days: 7, s: false };
  let st = { plan: { ...DEF }, log: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) st = { plan: { ...DEF, ...(s.plan || {}) }, log: Array.isArray(s.log) ? s.log : [] }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const P = st.plan;

  /* ---------- Helpers ---------- */
  const L = n => (P.s ? "S+" : "") + fmt(n);
  const pad = n => String(n).padStart(2, "0");
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const fmtDate = (d, year) => d.toLocaleDateString("en-US", { weekday: year ? undefined : "short", month: "short", day: "numeric", year: year ? "numeric" : undefined });
  function dur(h) {
    if (!isFinite(h)) return "never";
    if (h < 1 / 60) return "under a minute";
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h < 48) { const H = Math.floor(h), M = Math.round((h - H) * 60); return M ? `${H} h ${M} min` : `${H} h`; }
    const d = Math.floor(h / 24), H = Math.round(h % 24); return H ? `${fmt(d)} d ${H} h` : `${fmt(d)} d`;
  }
  function days(n) {
    if (!isFinite(n)) return "never";
    if (n < 1) return n * 24 < 1 ? "today" : `${Math.max(1, Math.round(n * 24))} h`;
    if (n < 60) return `${Math.round(n)} day${Math.round(n) === 1 ? "" : "s"}`;
    if (n < 730) return `${(n / 30.44).toFixed(1).replace(/\.0$/, "")} months`;
    return `${(n / 365.25).toFixed(1).replace(/\.0$/, "")} years`;
  }
  function calc(p = P) {
    const secs = Math.max(1, (+p.min || 0) * 60 + (+p.sec || 0));
    const perReb = 1 + (+p.skip || 0);
    const lph = 3600 / secs * perReb;                         // lives per grind hour
    const lpd = lph * p.hours * p.days / 7;                     // lives per calendar day (average)
    const togo = Math.max(0, p.goal - p.life);
    const rebs = Math.ceil(togo / perReb);
    const grindH = rebs * secs / 3600;
    const calDays = grindH / (p.hours * p.days / 7);
    return { secs, perReb, lph, lpd, togo, rebs, grindH, calDays, shards: rebs * Math.ceil((+p.skip || 0) / 2) };
  }
  const etaFor = (life, c) => { const n = Math.max(0, life - P.life); const r = Math.ceil(n / c.perReb); const gh = r * c.secs / 3600; return { gh, cd: gh / (P.hours * P.days / 7) }; };
  function tween(el, to, f = fmt, d = 500) {
    const from = +el.dataset.v || 0; el.dataset.v = to;
    if (RM || from === to || !isFinite(to)) { el.textContent = f(to); return; }
    const t0 = performance.now(); cancelAnimationFrame(el._r);
    (function s(now) { const p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = f(from + (to - from) * e); if (p < 1) el._r = requestAnimationFrame(s); })(t0);
  }

  /* ================= Plan form ================= */
  const F = { life: $("#inLife"), goal: $("#inGoal"), min: $("#inMin"), sec: $("#inSec"), skip: $("#inSkip"), hours: $("#inHours"), days: $("#inDays") };
  Object.entries(F).forEach(([k, el]) => el.value = P[k]);
  const sBtn = $("#sToggle");
  sBtn.setAttribute("aria-pressed", P.s); sBtn.classList.toggle("on", P.s);
  sBtn.addEventListener("click", () => { P.s = !P.s; sBtn.setAttribute("aria-pressed", P.s); sBtn.classList.toggle("on", P.s); save(); render(); });

  function goalChips() {
    const n = Math.max(1, P.life), mag = Math.pow(10, Math.floor(Math.log10(n)));
    const up = step => { step = Math.max(100, step); return Math.floor(n / step) * step + step; };
    const opts = [...new Set([1000, 5000, 10000, 25000, 50000, 100000, 1000000, up(mag / 10), up(mag / 2), up(mag), up(mag * 2), up(mag * 5), up(mag * 10)])]
      .filter(g => g > n).sort((a, b) => a - b);
    // the next round number, then a few bigger jumps
    const pick = [];
    opts.forEach(g => { if (pick.length < 4 && (!pick.length || g >= pick[pick.length - 1] * 1.25)) pick.push(g); });
    $("#goalChips").innerHTML = `<span>Quick goals</span>` + pick.map(g => `<button type="button" data-g="${g}"${g === P.goal ? ' class="on"' : ""}>${L(g)}</button>`).join("");
  }
  $("#goalChips").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; P.goal = +b.dataset.g; F.goal.value = P.goal; save(); render(); });

  Object.entries(F).forEach(([k, el]) => el.addEventListener("input", () => {
    let v = parseFloat(el.value);
    if (!isFinite(v)) return;
    if (k === "sec") v = Math.min(59, Math.max(0, v));
    if (k === "life" || k === "goal") v = Math.max(1, Math.round(v));
    P[k] = v; save(); render();
  }));
  let lifeBefore = P.life;
  F.life.addEventListener("focus", () => { lifeBefore = P.life; });
  F.life.addEventListener("change", () => { F.life.value = P.life; if (lifeBefore < P.goal && P.life >= P.goal && lifeBefore >= P.goal * .5) celebrate(); lifeBefore = P.life; });

  /* ================= Goal ring ticks ================= */
  $("#grTicks").innerHTML = Array.from({ length: 60 }, (_, i) => {
    const a = i / 60 * Math.PI * 2 - Math.PI / 2, r1 = i % 5 ? 112 : 108, r2 = 116;
    return `<line x1="${120 + r1 * Math.cos(a)}" y1="${120 + r1 * Math.sin(a)}" x2="${120 + r2 * Math.cos(a)}" y2="${120 + r2 * Math.sin(a)}" />`;
  }).join("");

  /* ================= Render plan ================= */
  function render() {
    const c = calc(), done = P.goal <= P.life;
    // hero
    tween($("#hsLife"), P.life, L); tween($("#hsGoal"), P.goal, L); tween($("#hsRate"), c.lph, v => v >= 100 ? fmt(v) : (+v.toFixed(1)).toString());
    $("#hsDays").textContent = done ? "Done!" : days(c.calDays);
    tween($("#grLife"), P.life, L, 700);
    const pct = Math.min(1, P.life / Math.max(1, P.goal));
    $("#grPct").textContent = done ? "Goal reached!" : `${(pct * 100).toFixed(pct < .1 ? 1 : 0)}% of goal`;
    const C = 2 * Math.PI * 100, arc = $("#grArc");
    arc.style.strokeDasharray = C; arc.style.strokeDashoffset = C * (1 - pct);
    $("#goalCard").classList.toggle("done", done);
    $("#grGoal").textContent = L(P.goal);
    const etaDate = new Date(Date.now() + c.calDays * DAY);
    $("#grEta").textContent = done ? "Reached" : isFinite(c.calDays) ? fmtDate(etaDate, c.calDays > 300) : "-";

    // plan outputs
    $("#vSkip").textContent = P.skip; $("#vHours").textContent = P.hours; $("#vDays").textContent = P.days;
    [F.skip, F.hours, F.days].forEach(i => i.style.setProperty("--p", (i.value - i.min) / (i.max - i.min) * 100 + "%"));
    $("#skipHelp").textContent = P.skip ? `${c.perReb} lives per rebirth, +${Math.ceil(P.skip / 2)} Shards of Life each time` : "Turn on life skipping in Settings and rebirth with extra cash to skip up to 20 lives";
    $("#rph").textContent = `${(3600 / c.secs) >= 10 ? fmt(3600 / c.secs) : (3600 / c.secs).toFixed(1)} rebirths / hour`;
    $("#eta").innerHTML = done
      ? `<small>Goal reached</small><b>You're at ${esc(L(P.life))}</b><span>Set a new goal to keep tracking.</span>`
      : `<small>You reach ${esc(L(P.goal))}</small><b>${esc(fmtDate(etaDate, true))}</b><span>in ${esc(days(c.calDays))} at ${esc(String(P.hours))} h/day, ${P.days} day${P.days == 1 ? "" : "s"}/week · ${esc(dur(c.grindH))} of grinding</span>`;
    const cards = [
      ["Lives to go", fmt(c.togo)], ["Rebirths needed", fmt(c.rebs)], ["Grind time", dur(c.grindH)],
      ["Lives / hour", c.lph >= 100 ? fmt(c.lph) : (+c.lph.toFixed(1)).toString()], ["Lives / day", c.lpd >= 100 ? fmt(c.lpd) : (+c.lpd.toFixed(1)).toString()], ["Shards earned", `${fmt(c.shards)} Shards of Life`]
    ];
    $("#planCards").innerHTML = cards.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join("");
    const after = P.life + Math.floor(P.hours * 3600 / c.secs) * c.perReb;
    $("#session").innerHTML = `<span class="sess-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l3 2M9 2h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
      <p>A <b>${esc(String(P.hours))} h</b> session today takes you from <b>${esc(L(P.life))}</b> to <b>${esc(L(after))}</b>${after >= P.goal && !done ? `, past your goal` : ""}.</p>`;
    // track bar with markers
    const hi = Math.max(P.goal, P.life, 1);
    const marks = GAME.filter(g => g.life < hi).map(g => `<i class="mk${g.life <= P.life ? " past" : ""}" style="left:${g.life / hi * 100}%" title="${esc(L(g.life))}: ${esc(g.t)}"></i>`).join("");
    $("#track").innerHTML = `<div class="trk-bar"><i class="trk-fill" style="width:${Math.min(100, P.life / hi * 100)}%"></i>${marks}<span class="trk-you" style="left:${Math.min(100, P.life / hi * 100)}%">You</span></div><div class="trk-lbl"><span>Life 1</span><span>Goal ${esc(L(P.goal))}</span></div>`;
    goalChips();
    way(c);
    $("#lgLife").placeholder = fmt(P.life);
    MH.curify($("#planCards"));
    if (logReady) { logRender(); chart(); }
  }
  function celebrate() {
    if (RM) return;
    const card = $("#goalCard");
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("i"); s.className = "cf";
      s.style.setProperty("--x", (Math.random() * 2 - 1) * 180 + "px"); s.style.setProperty("--y", -(80 + Math.random() * 180) + "px");
      s.style.setProperty("--r", Math.random() * 720 + "deg"); s.style.setProperty("--c", ["#5ad8ff", "#a77bff", "#ffd36b", "#7cff6b", "#ff6bb5"][i % 5]);
      card.appendChild(s); setTimeout(() => s.remove(), 1400);
    }
    MH.toast("Goal reached! Time to set a new one.");
  }

  /* ================= On the way ================= */
  function way(c) {
    const lo = P.life, hi = P.goal;
    const list = $("#wayList");
    if (hi <= lo) { $("#wayIntro").textContent = "Set a goal above your current life to see what's ahead."; list.innerHTML = ""; return; }
    const g = GAME.filter(x => x.life > lo && x.life <= hi).map(x => ({ ...x, kind: "game" }));
    const groups = {};
    UNLOCKS.filter(i => i.life > lo && i.life <= hi).forEach(i => (groups[i.life] = groups[i.life] || []).push(i));
    const u = Object.entries(groups).map(([life, items]) => ({ life: +life, kind: "items", items }));
    const all = [...g, ...u].sort((a, b) => a.life - b.life || (a.kind === "game" ? -1 : 1));
    const nItems = u.reduce((a, x) => a + x.items.length, 0);
    $("#wayIntro").textContent = all.length
      ? `Between ${L(lo)} and ${L(hi)} you'll unlock ${nItems} new rebirth item${nItems === 1 ? "" : "s"}${g.length ? ` and pass ${g.length} game milestone${g.length === 1 ? "" : "s"}` : ""}. Dates use your plan above.`
      : `No new rebirth items or game milestones between ${L(lo)} and ${L(hi)}.`;
    const SHOW = 14;
    list.innerHTML = all.map((x, i) => {
      const e = etaFor(x.life, c), when = isFinite(e.cd) ? `${days(e.cd)} · ${fmtDate(new Date(Date.now() + e.cd * DAY), e.cd > 300)}` : "never";
      const body = x.kind === "game"
        ? `<div class="wy-g"><b>${esc(x.t)}</b><p>${esc(x.d)}${x.link ? ` <a class="xlink" href="${x.link}">More</a>` : ""}</p></div>`
        : `<div class="wy-items">${x.items.map(it => `<a class="wi" href="${ITEM(it.n)}" title="${esc(it.n)} · ${esc(KIND[it.k])}"><span class="wi-pic"><img src="${esc(img(it.img, 70))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>${esc(it.n[0])}</span>'" /></span><span class="wi-n">${esc(it.n)}<small class="k-${it.k}">${esc(KIND[it.k])}</small></span></a>`).join("")}</div>`;
      return `<div class="wy ${x.kind}${i >= SHOW ? " extra" : ""}" style="--i:${Math.min(i, 10)}">
        <div class="wy-life"><small>Life</small><b>${esc(L(x.life))}</b><span>${esc(when)}</span></div>
        <span class="wy-dot" aria-hidden="true"></span>
        ${body}</div>`;
    }).join("") + (all.length > SHOW ? `<button type="button" class="wy-more" id="wyMore">Show all ${all.length}</button>` : "");
    const more = $("#wyMore");
    if (more) more.addEventListener("click", () => { list.classList.toggle("open"); more.textContent = list.classList.contains("open") ? "Show less" : `Show all ${all.length}`; });
  }

  /* ================= Milestone log ================= */
  const lf = { life: $("#lgLife"), date: $("#lgDate"), note: $("#lgNote") };
  lf.date.value = iso(new Date()); lf.date.max = iso(new Date());
  let editing = null;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const sorted = () => st.log.slice().sort((a, b) => a.date.localeCompare(b.date) || a.life - b.life);

  $("#logForm").addEventListener("submit", e => {
    e.preventDefault();
    const life = Math.round(+lf.life.value), date = lf.date.value;
    if (!(life >= 1) || !date) { MH.toast("Enter a life and a date"); return; }
    if (editing) { Object.assign(st.log.find(x => x.id === editing), { life, date, note: lf.note.value.trim() }); MH.toast("Milestone updated"); }
    else { st.log.push({ id: uid(), life, date, note: lf.note.value.trim() }); MH.toast(`Logged ${L(life)} on ${fmtDate(parseISO(date), true)}`); }
    if (life > P.life && date === iso(new Date())) { const was = P.life; P.life = life; F.life.value = life; if (was < P.goal && life >= P.goal) setTimeout(celebrate, 300); }
    endEdit(); save(); logRender(true); render();
  });
  function endEdit() { editing = null; lf.life.value = ""; lf.note.value = ""; lf.date.value = iso(new Date()); $("#lgSave").textContent = "Add milestone"; $("#lgCancel").hidden = true; }
  $("#lgCancel").addEventListener("click", endEdit);
  $("#lgNow").addEventListener("click", () => {
    const d = iso(new Date()), ex = st.log.find(x => x.date === d && x.life === P.life);
    if (ex) { MH.toast("Already logged today at that life"); return; }
    st.log.push({ id: uid(), life: P.life, date: d, note: "" }); save(); logRender(true); chart(); MH.toast(`Logged ${L(P.life)} today`);
  });

  function stats() {
    const s = sorted();
    if (!s.length) return null;
    const first = s[0], last = s[s.length - 1];
    const span = (parseISO(last.date) - parseISO(first.date)) / DAY;
    const gained = last.life - first.life;
    let best = null;
    for (let i = 1; i < s.length; i++) {
      const dd = (parseISO(s[i].date) - parseISO(s[i - 1].date)) / DAY, g = s[i].life - s[i - 1].life;
      if (dd > 0 && g > 0) { const r = g / dd; if (!best || r > best.r) best = { r, from: s[i - 1], to: s[i] }; }
    }
    return { s, first, last, span, gained, pace: span > 0 ? gained / span : null, best };
  }
  function logRender(flashNew) {
    const S = stats(), box = $("#lgStats"), list = $("#lgList");
    if (!S) {
      box.innerHTML = "";
      list.innerHTML = `<div class="lg-empty"><img src="../assets/icons/rebirth.png" alt="" /><b>No milestones yet</b><p>Add your first one above, or press <em>Load example</em> to see how the graph works.</p></div>`;
      return;
    }
    const c = calc(), goalLeft = P.goal - S.last.life;
    const paceEta = S.pace > 0 && goalLeft > 0 ? goalLeft / S.pace : null;
    const items = [
      ["Milestones", fmt(S.s.length)],
      ["Lives gained", "+" + fmt(S.gained)],
      ["Over", S.span ? days(S.span) : "1 day"],
      ["Your pace", S.pace ? `${S.pace >= 100 ? fmt(S.pace) : S.pace.toFixed(1)} / day` : "-"],
      ["Plan pace", `${c.lpd >= 100 ? fmt(c.lpd) : c.lpd.toFixed(1)} / day`],
      ["Goal at your pace", goalLeft <= 0 ? "Reached" : paceEta != null ? fmtDate(new Date(parseISO(S.last.date).getTime() + paceEta * DAY), true) : "-"]
    ];
    box.innerHTML = items.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join("")
      + (S.best ? `<p class="lg-best">Best stretch: <b>${esc(S.best.r >= 100 ? fmt(S.best.r) : S.best.r.toFixed(1))} lives/day</b> from ${esc(fmtDate(parseISO(S.best.from.date), true))} to ${esc(fmtDate(parseISO(S.best.to.date), true))}.</p>` : "");
    const rows = S.s.slice().reverse();
    list.innerHTML = `<div class="lr head"><span>Date</span><span>Life</span><span>Change</span><span>Note</span><span></span></div>` + rows.map((x, i) => {
      const prev = rows[i + 1], ch = prev ? x.life - prev.life : null;
      const dd = prev ? (parseISO(x.date) - parseISO(prev.date)) / DAY : 0;
      return `<div class="lr${flashNew && i === 0 ? "" : ""}" data-id="${x.id}">
        <span class="lr-d">${esc(fmtDate(parseISO(x.date), true))}</span>
        <span class="lr-l">${esc(L(x.life))}</span>
        <span class="lr-c ${ch > 0 ? "up" : ch < 0 ? "down" : ""}">${ch == null ? "Start" : `${ch > 0 ? "+" : ""}${fmt(ch)}${dd > 0 ? `<small> in ${days(dd)}</small>` : ""}`}</span>
        <span class="lr-n">${esc(x.note || "")}</span>
        <span class="lr-a"><button type="button" class="ed" aria-label="Edit">✎</button><button type="button" class="rm" aria-label="Delete">×</button></span>
      </div>`;
    }).join("");
  }
  $("#lgList").addEventListener("click", e => {
    const r = e.target.closest(".lr[data-id]"); if (!r) return;
    const x = st.log.find(v => v.id === r.dataset.id);
    if (e.target.closest(".rm")) {
      st.log = st.log.filter(v => v.id !== x.id); save(); r.classList.add("out");
      setTimeout(() => { logRender(); chart(); }, RM ? 0 : 250); MH.toast("Milestone deleted"); return;
    }
    if (e.target.closest(".ed")) {
      editing = x.id; lf.life.value = x.life; lf.date.value = x.date; lf.note.value = x.note || "";
      $("#lgSave").textContent = "Save changes"; $("#lgCancel").hidden = false; lf.life.focus();
      $("#logForm").scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "center" });
    }
  });

  // Export / import
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $("#lgCsv").addEventListener("click", () => {
    if (!st.log.length) { MH.toast("Nothing to export yet"); return; }
    const q = s => `"${String(s).replace(/"/g, '""')}"`;
    download("rebirth-milestones.csv", ["date,life,note", ...sorted().map(x => `${x.date},${x.life},${q(x.note || "")}`)].join("\n"), "text/csv");
  });
  $("#lgBackup").addEventListener("click", () => download("rebirth-tracker-backup.json", JSON.stringify({ app: "MinersHavenWiki rebirth tracker", v: 1, ...st }, null, 2), "application/json"));
  $("#lgImport").addEventListener("change", e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t);
      const log = (d.log || []).filter(x => x && x.life >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(x.date)).map(x => ({ id: x.id || uid(), life: Math.round(x.life), date: x.date, note: String(x.note || "").slice(0, 80) }));
      if (!log.length && !d.plan) throw 0;
      st.log = log;
      if (d.plan) { Object.assign(P, DEF, d.plan); Object.entries(F).forEach(([k, el]) => el.value = P[k]); sBtn.classList.toggle("on", P.s); sBtn.setAttribute("aria-pressed", P.s); }
      save(); logRender(); render(); MH.toast(`Imported ${log.length} milestone${log.length === 1 ? "" : "s"}`);
    }).catch(() => MH.toast("That file isn't a tracker backup"));
    e.target.value = "";
  });
  $("#lgExample").addEventListener("click", () => {
    if (st.log.length && !confirmTwice($("#lgExample"), "Replace your log?")) return;
    const now = new Date(), c = calc();
    // Ends at your current life, climbing at roughly 60% of your plan's pace (with some wobble)
    const end = Math.max(P.life, 60), dayOffs = [-27, -24, -20, -16, -13, -9, -6, -3, 0];
    const w = dayOffs.map((d, i) => i ? (d - dayOffs[i - 1]) * (.7 + ((i * 37) % 7) / 10) : 0);
    const wSum = w.reduce((a, b) => a + b, 0), total = Math.min(Math.max(2, c.lpd * .6) * 27, end - 1);
    let acc = 0;
    st.log = dayOffs.map((d, i) => { acc += w[i] / wSum * total; return { id: uid(), life: Math.round(end - total + acc), date: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)), note: i === 0 ? "Example: start" : i === 4 ? "Example: new setup" : "" }; });
    save(); logRender(); render(); MH.toast("Loaded example milestones");
  });
  const armed = new WeakMap();
  function confirmTwice(btn, msg) {
    if (armed.get(btn)) { clearTimeout(armed.get(btn).t); armed.delete(btn); btn.textContent = btn.dataset.txt; btn.classList.remove("arm"); return true; }
    btn.dataset.txt = btn.textContent; btn.textContent = msg; btn.classList.add("arm");
    armed.set(btn, { t: setTimeout(() => { armed.delete(btn); btn.textContent = btn.dataset.txt; btn.classList.remove("arm"); }, 3000) });
    return false;
  }
  $("#lgClear").addEventListener("click", () => {
    if (!st.log.length) { MH.toast("Your log is already empty"); return; }
    if (!confirmTwice($("#lgClear"), "Click again to clear")) return;
    st.log = []; save(); logRender(); chart(); MH.toast("Log cleared");
  });

  /* ================= Chart ================= */
  const chartEl = $("#chart");
  let drawnOnce = false;
  function niceStep(range, n) {
    const raw = range / n, mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / mag;
    return (f >= 5 ? 10 : f >= 2 ? 5 : f >= 1 ? 2 : 1) * mag;
  }
  function chart() {
    const S = stats();
    const W = Math.max(300, chartEl.clientWidth), H = W < 560 ? 260 : 340;
    const m = { l: W < 560 ? 46 : 62, r: 18, t: 18, b: 34 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    if (!S) {
      chartEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="ch-svg empty"><text x="${W / 2}" y="${H / 2}" text-anchor="middle">Your graph appears here once you log a milestone</text></svg>`;
      return;
    }
    const c = calc(), proj = $("#chProj").checked, gl = $("#chGoal").checked;
    const pts = S.s.map(x => ({ t: parseISO(x.date).getTime(), v: x.life, x }));
    const last = pts[pts.length - 1];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // projection lines
    const lines = [];
    if (proj && P.goal > last.v) {
      if (c.lpd > 0) lines.push({ cls: "plan", t0: last.t, v0: last.v, t1: last.t + (P.goal - last.v) / c.lpd * DAY, v1: P.goal });
      if (S.pace > 0) lines.push({ cls: "pace", t0: last.t, v0: last.v, t1: last.t + (P.goal - last.v) / S.pace * DAY, v1: P.goal });
    }
    let tMin = pts[0].t, tMax = Math.max(last.t, today.getTime());
    const span = Math.max(DAY * 6, tMax - tMin);
    lines.forEach(l => { l.t1 = Math.min(l.t1, tMax + span * 3); if (l.t1 < l.t0 + DAY * .3) l.t1 = l.t0 + DAY * .3; tMax = Math.max(tMax, l.t1); });
    if (tMax - tMin < DAY * 6) tMax = tMin + DAY * 6;
    let vMin = Math.min(...pts.map(p => p.v)), vMax = Math.max(...pts.map(p => p.v));
    if (gl || lines.length) vMax = Math.max(vMax, P.goal);
    lines.forEach(l => { l.v1 = l.v0 + (l.v1 - l.v0) * ((l.t1 - l.t0) / ((P.goal - l.v0) / ((l.cls === "plan" ? c.lpd : S.pace)) * DAY)); vMax = Math.max(vMax, l.v1); });
    const vr = Math.max(10, vMax - vMin);
    const step = niceStep(vr, 5);
    let y0 = Math.max(0, Math.floor((vMin - vr * .08) / step) * step), y1 = Math.ceil((vMax + vr * .06) / step) * step;
    const X = t => m.l + (t - tMin) / (tMax - tMin) * iw, Y = v => m.t + ih - (v - y0) / (y1 - y0) * ih;
    // grid
    let g = "";
    for (let v = y0; v <= y1 + 1e-6; v += step) g += `<line class="gy" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ty" x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${y1 >= 10000 ? (v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "k" : fmt(v)}</text>`;
    const spanD = (tMax - tMin) / DAY, nT = W < 560 ? 4 : 7;
    const dStep = [1, 2, 7, 14, 30.44, 61, 91, 182, 365].find(d => spanD / d <= nT) || 365;
    let t = new Date(tMin); t.setHours(0, 0, 0, 0);
    if (dStep >= 30) t.setDate(1);
    for (let k = 0; k < 40 && t.getTime() <= tMax; k++) {
      const x = X(t.getTime());
      if (x >= m.l - 1) g += `<line class="gx" x1="${x}" x2="${x}" y1="${m.t}" y2="${m.t + ih}"/><text class="tx" x="${x}" y="${H - 10}" text-anchor="middle">${t.toLocaleDateString("en-US", dStep >= 182 ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" })}</text>`;
      if (dStep >= 30) t.setMonth(t.getMonth() + Math.round(dStep / 30.44)); else t.setDate(t.getDate() + dStep);
    }
    // today line
    const tx = X(today.getTime());
    if (tx > m.l && tx < W - m.r) g += `<line class="today" x1="${tx}" x2="${tx}" y1="${m.t}" y2="${m.t + ih}"/><text class="today-t" x="${tx + 4}" y="${m.t + 12}">Today</text>`;
    // goal
    if (gl) g += `<line class="goal" x1="${m.l}" x2="${W - m.r}" y1="${Y(P.goal)}" y2="${Y(P.goal)}"/><text class="goal-t" x="${W - m.r - 4}" y="${Y(P.goal) - 6}" text-anchor="end">Goal ${L(P.goal)}</text>`;
    // data path
    const d = pts.map((p, i) => `${i ? "L" : "M"}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ");
    const area = `${d} L${X(last.t).toFixed(1)} ${m.t + ih} L${X(pts[0].t).toFixed(1)} ${m.t + ih} Z`;
    const pl = lines.map(l => `<line class="pj ${l.cls}" x1="${X(l.t0)}" y1="${Y(l.v0)}" x2="${X(l.t1)}" y2="${Y(l.v1)}"/>` + (l.v1 >= P.goal - .5 ? `<circle class="pj-end ${l.cls}" cx="${X(l.t1)}" cy="${Y(l.v1)}" r="4.5"/>` : "")).join("");
    const dots = pts.map((p, i) => `<circle class="pt${p.x.note ? " noted" : ""}" cx="${X(p.t)}" cy="${Y(p.v)}" r="${p.x.note ? 6 : 4.5}" data-i="${i}" style="--i:${i}"/>`).join("");
    chartEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="ch-svg${drawnOnce ? "" : " intro-draw"}" role="img" aria-label="Life over time">
      <defs><linearGradient id="chArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4498ff" stop-opacity=".35"/><stop offset="1" stop-color="#4498ff" stop-opacity="0"/></linearGradient>
      <linearGradient id="chLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5ad8ff"/><stop offset="1" stop-color="#a77bff"/></linearGradient></defs>
      ${g}<path class="area" d="${area}"/>${pl}<path class="ln" d="${d}" pathLength="1"/>${dots}
      <line class="hover-x" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>
    </svg><div class="ch-tip" id="chTip" hidden></div>`;
    drawnOnce = true;
    // hover
    const svg = chartEl.querySelector("svg"), tip = $("#chTip"), hx = svg.querySelector(".hover-x");
    const near = ev => {
      const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W;
      let bi = 0, bd = Infinity; pts.forEach((p, i) => { const dd = Math.abs(X(p.t) - x); if (dd < bd) { bd = dd; bi = i; } });
      return { i: bi, r };
    };
    svg.addEventListener("pointermove", ev => {
      const { i, r } = near(ev), p = pts[i], prev = pts[i - 1];
      svg.querySelectorAll(".pt").forEach((c2, j) => c2.classList.toggle("on", j === i));
      hx.setAttribute("x1", X(p.t)); hx.setAttribute("x2", X(p.t)); hx.setAttribute("visibility", "visible");
      tip.hidden = false;
      tip.innerHTML = `<small>${esc(fmtDate(new Date(p.t), true))}</small><b>Life ${esc(L(p.v))}</b>${prev ? `<span>${p.v - prev.v >= 0 ? "+" : ""}${fmt(p.v - prev.v)} since last</span>` : ""}${p.x.note ? `<em>${esc(p.x.note)}</em>` : ""}`;
      const px = X(p.t) / W * r.width, py = Y(p.v) / H * r.height;
      tip.style.left = Math.min(r.width - 170, Math.max(0, px - 80)) + "px"; tip.style.top = Math.max(0, py - 78) + "px";
    });
    svg.addEventListener("pointerleave", () => { tip.hidden = true; hx.setAttribute("visibility", "hidden"); svg.querySelectorAll(".pt.on").forEach(c2 => c2.classList.remove("on")); });
  }
  $("#chProj").addEventListener("change", chart);
  $("#chGoal").addEventListener("change", chart);
  let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(chart, 150); });

  logReady = true;
  render();

  /* Back to top */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }));
})();
