/* =========================================================
   Daily Tasks page
   Data: window.MH_TASKS (js/tasks-data.js)
   ========================================================= */
(() => {
  const D = window.MH_TASKS, R = D.reward;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const RM = MH.reduceMotion;
  const byId = Object.fromEntries(D.tasks.map(t => [t.id, t]));
  const BOX = s => `../assets/boxes/${s}.webp`;
  const UC = n => `${fmt(n)} uC`;

  /* ---------- Icons ---------- */
  const CRATE = {
    basic:   { t: "#d3d7df", l: "#a3aab6", r: "#7a8190", e: "#4a505c", d: "#3a3f4a" },
    uc:      { t: "#d7a6ff", l: "#a766f0", r: "#7c45c4", e: "#40206f", d: "#3a1966" },
    shadow:  { t: "#4a4466", l: "#2c2740", r: "#1b1828", e: "#0a0910", d: "#c9b8ff", op: .8 },
    golden:  { t: "#fff0a6", l: "#ffc93d", r: "#e0a116", e: "#8a5a00", d: "#7a4b00" },
    diamond: { t: "#e2f9ff", l: "#8fdfff", r: "#4fb3e6", e: "#1d6e9a", d: "#16577b" },
  };
  function crate(id) {
    const c = CRATE[id] || CRATE.basic;
    const decal = `<rect x="9" y="9" width="82" height="82" rx="8" fill="none" stroke="${c.e}" stroke-width="7" opacity=".55"/><circle cx="50" cy="52" r="25" fill="#fff"/><path d="M27 52a23 23 0 0 1 46 0Z" fill="${c.d}"/><path d="M50 33l3.2 8.6 9 .4-7 5.6 2.4 8.7L50 51.3l-7.6 5 2.4-8.7-7-5.6 9-.4Z" fill="#fff"/>`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true"${c.op ? ` opacity="${c.op}"` : ""}><polygon points="50,6 92,25 50,44 8,25" fill="${c.t}"/><polygon points="8,25 50,44 50,95 8,76" fill="${c.l}"/><polygon points="50,44 92,25 92,76 50,95" fill="${c.r}"/><g transform="matrix(.42 .19 0 .51 8 25)">${decal}</g><g transform="matrix(.42 -.19 0 .51 50 44)">${decal}</g><polygon points="50,6 92,25 50,44 8,25" fill="none" stroke="${c.e}" stroke-width="2.4" stroke-linejoin="round" opacity=".7"/><path d="M8 25v51l42 19 42-19V25M50 44v51" fill="none" stroke="${c.e}" stroke-width="2.4" stroke-linejoin="round" opacity=".7"/></svg>`;
  }
  const ICONS = {
    process: `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff4d1a"/><stop offset=".6" stop-color="#ffb020"/><stop offset="1" stop-color="#fff2a8"/></linearGradient></defs><rect x="14" y="54" width="72" height="34" rx="8" fill="#3a3f4a"/><rect x="14" y="54" width="72" height="10" rx="5" fill="#5a6070"/><rect x="26" y="68" width="48" height="14" rx="4" fill="#1b1d24"/><path class="flk" d="M50 14c8 12 18 18 18 32a18 18 0 0 1-36 0c0-8 5-12 8-17 2 6 5 8 8 8-2-9 0-16 2-23Z" fill="url(#fl)"/><circle cx="34" cy="40" r="5" fill="#ffd36b"/><circle cx="66" cy="36" r="4" fill="#7cff6b"/></svg>`,
    upgrade: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="70" width="80" height="14" rx="7" fill="#3a3f4a"/><path d="M20 77h60" stroke="#6b7280" stroke-width="3" stroke-dasharray="6 6"/><path class="up1" d="M50 18 72 40H58v18H42V40H28Z" fill="#38d9ff"/><path class="up2" d="M30 52l8-8 8 8" fill="none" stroke="#7cff6b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path class="up2" d="M54 52l8-8 8 8" fill="none" stroke="#a77bff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    rebirth: `<img src="../assets/icons/rebirth.png" alt="" />`,
  };
  const icon = t => t.crate === "any"
    ? `<span class="any">${crate("basic")}${crate("golden")}${crate("diamond")}</span>`
    : t.crate ? crate(t.crate) : ICONS[t.icon];
  const label = (t, kind) => `${t.verb} <b>${fmt(t[kind])}</b> ${esc(t.noun)}`;
  const plain = (t, kind) => `${t.verb} ${fmt(t[kind])} ${t.noun}`;

  /* ---------- Reset clock (00:00 UTC) ---------- */
  const todayUTC = () => new Date().toISOString().slice(0, 10);
  function untilReset() {
    const now = new Date(), next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    return next - now.getTime();
  }
  const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(v => String(v).padStart(2, "0")).join(":"); };

  /* ================= Hero ================= */
  setTimeout(() => {
    MH.countUp($("#stTasks"), D.tasks.length, 900);
    MH.countUp($("#stDaily"), R.daily, 1000);
    MH.countUp($("#stWeekly"), R.weekly, 1300);
  }, 300);

  (function board() {
    const rows = $("#boardRows"), ucEl = $("#boardUc"), foot = $("#boardFoot");
    let total = 0, round = 0;
    function deal() {
      const kind = round++ % 3 === 2 ? "weekly" : "daily";
      const pick = D.tasks.slice().sort(() => Math.random() - .5).slice(0, 3);
      foot.textContent = kind === "daily" ? `Daily tasks · ${R.daily} uC each` : `Weekly tasks · ${R.weekly} uC each`;
      rows.innerHTML = pick.map((t, i) => `<div class="br" style="--i:${i}">
          <span class="br-ic">${icon(t)}</span>
          <div class="br-m"><span>${label(t, kind)}</span><div class="br-bar"><i></i></div></div>
          <span class="br-n">0/${fmt(t[kind])}</span>
          <em class="br-pop">+${R[kind]}</em></div>`).join("");
      if (RM) { rows.querySelectorAll(".br").forEach(r => r.classList.add("done")); return; }
      [...rows.children].forEach((r, i) => {
        const t = pick[i], goal = t[kind], t0 = 700 + i * 1500, dur = 1200;
        setTimeout(() => {
          const s = performance.now(), n = r.querySelector(".br-n"), bar = r.querySelector(".br-bar i");
          (function step(now) {
            const p = Math.min(1, (now - s) / dur), e = 1 - Math.pow(1 - p, 2);
            bar.style.width = e * 100 + "%"; n.textContent = `${fmt(Math.round(goal * e))}/${fmt(goal)}`;
            if (p < 1) return requestAnimationFrame(step);
            r.classList.add("done"); total += R[kind];
            ucEl.textContent = fmt(total); ucEl.parentElement.classList.remove("tick"); void ucEl.offsetWidth; ucEl.parentElement.classList.add("tick");
          })(s);
        }, t0);
      });
      setTimeout(deal, 700 + 3 * 1500 + 2200);
    }
    deal();
  })();

  /* ================= All tasks ================= */
  let mode = "daily";
  $("#facts").innerHTML = D.facts.map(f => `<li>${esc(f)}</li>`).join("");
  function seg(el, attr, cb) {
    const pill = el.querySelector(".seg-pill");
    const place = () => { const b = el.querySelector("button.on"); pill.style.width = b.offsetWidth + "px"; pill.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
    el.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      el.querySelectorAll("button").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
      place(); cb(b.dataset[attr]);
    });
    requestAnimationFrame(place); window.addEventListener("resize", place);
    document.fonts && document.fonts.ready.then(place);
  }
  const grid = $("#taskGrid");
  grid.innerHTML = D.tasks.map((t, i) => `<article class="tk glass reveal" data-id="${t.id}" style="--i:${i}">
      <div class="tk-ic">${icon(t)}</div>
      <div class="tk-body">
        <h3 class="tk-t"><span class="tk-d">${label(t, "daily")}</span><span class="tk-w">${label(t, "weekly")}</span></h3>
        <p>${esc(t.sub)}</p>
        <div class="tk-meta">
          <span class="tk-rw"><span class="tk-d">${UC(R.daily)}</span><span class="tk-w">${UC(R.weekly)}</span></span>
          <span class="tk-alt"><span class="tk-d">Weekly: ${fmt(t.weekly)} for ${UC(R.weekly)}</span><span class="tk-w">Daily: ${fmt(t.daily)} for ${UC(R.daily)}</span></span>
        </div>
      </div>
      <button class="tk-track" type="button">Track</button>
    </article>`).join("");
  grid.querySelectorAll(".reveal").forEach(MH.reveal);
  function setMode(m) {
    mode = m;
    grid.classList.toggle("weekly", m === "weekly");
    grid.querySelectorAll(".tk").forEach(c => { c.classList.remove("flip"); void c.offsetWidth; c.classList.add("flip"); });
    $("#totalLine").innerHTML = m === "daily"
      ? `All ${D.tasks.length} daily tasks together: <b>${UC(D.tasks.length * R.daily)}</b>`
      : `All ${D.tasks.length} weekly tasks together: <b>${UC(D.tasks.length * R.weekly)}</b>`;
    MH.curify($("#totalLine"));
  }
  seg($("#mode"), "m", setMode);
  setMode("daily");
  grid.addEventListener("click", e => {
    const b = e.target.closest(".tk-track"); if (!b) return;
    const id = b.closest(".tk").dataset.id;
    track.add(id, mode, true);
  });

  /* ================= Tracker ================= */
  const KEY = "mh-task-tracker-v1";
  const track = (() => {
    let st = { date: todayUTC(), items: [] };
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && Array.isArray(s.items)) st = s; } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
    function rollover() {
      const d = todayUTC();
      if (st.date !== d) { st.items = st.items.filter(i => i.kind === "weekly"); st.date = d; save(); return true; }
      return false;
    }
    rollover();
    let kind = "daily";
    const list = $("#trList"), pick = $("#trPick");
    pick.innerHTML = D.tasks.map(t => `<option value="${t.id}">${esc(t.verb + " " + t.noun)}</option>`).join("");
    seg($("#trKind"), "k", k => { kind = k; });

    const stepFor = goal => goal >= 100 ? 10 : goal >= 20 ? 5 : 1;
    function row(it) {
      const t = byId[it.id], goal = t[it.kind], done = it.n >= goal, step = stepFor(goal);
      return `<div class="ti${done ? " done" : ""}" data-key="${it.id}:${it.kind}">
        <span class="ti-ic">${icon(t)}</span>
        <div class="ti-m">
          <div class="ti-top"><span class="ti-k ${it.kind}">${it.kind === "daily" ? "Daily" : "Weekly"}</span><span class="ti-t">${label(t, it.kind)}</span></div>
          <div class="ti-bar"><i style="width:${Math.min(100, it.n / goal * 100)}%"></i></div>
        </div>
        <div class="ti-c">
          <button type="button" data-d="-${step}" aria-label="Minus ${step}">−</button>
          <input type="number" min="0" max="${goal}" value="${it.n}" aria-label="Progress" inputmode="numeric" />
          <span>/ ${fmt(goal)}</span>
          <button type="button" data-d="${step}" aria-label="Plus ${step}">+${step}</button>
          <button type="button" class="ti-full" data-d="all" aria-label="Mark done"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
        <span class="ti-rw">${UC(R[it.kind])}</span>
        <button type="button" class="ti-x" aria-label="Remove task">×</button>
      </div>`;
    }
    function draw() {
      const items = st.items.slice().sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "daily" ? -1 : 1));
      list.innerHTML = items.length ? items.map(row).join("")
        : `<div class="tr-empty"><img src="../assets/icons/uc.png" alt="" /><b>No tasks yet</b><p>Press <em>Track</em> on a task above, or add one on the left.</p></div>`;
      MH.curify(list);
      sum();
    }
    function sum() {
      let earned = 0, possible = 0, done = 0;
      st.items.forEach(it => { const g = byId[it.id][it.kind]; possible += R[it.kind]; if (it.n >= g) { earned += R[it.kind]; done++; } });
      const el = $("#trEarned"), prev = +el.dataset.v || 0; el.dataset.v = earned;
      if (earned > prev && !RM) { $("#trRing").classList.remove("pop"); void $("#trRing").offsetWidth; $("#trRing").classList.add("pop"); }
      el.textContent = fmt(earned);
      const C = 2 * Math.PI * 52, p = possible ? earned / possible : 0;
      const arc = $("#trArc"); arc.style.strokeDasharray = C; arc.style.strokeDashoffset = C * (1 - p);
      const dl = st.items.filter(i => i.kind === "daily"), wl = st.items.filter(i => i.kind === "weekly");
      const dd = dl.filter(i => i.n >= byId[i.id].daily).length, wd = wl.filter(i => i.n >= byId[i.id].weekly).length;
      $("#trSum").innerHTML = st.items.length
        ? `<div><b>${dd}/${dl.length}</b><small>daily done</small></div><div><b>${wd}/${wl.length}</b><small>weekly done</small></div><div><b>${UC(possible - earned)}</b><small>still to earn</small></div>`
        : `<p>Track tasks to see what you've earned.</p>`;
      MH.curify($("#trSum"));
    }
    function find(key) { const [id, k] = key.split(":"); return st.items.find(i => i.id === id && i.kind === k); }
    function set(key, n) {
      const it = find(key); if (!it) return;
      const goal = byId[it.id][it.kind], was = it.n >= goal;
      it.n = Math.max(0, Math.min(goal, Math.round(n) || 0)); save();
      const el = list.querySelector(`[data-key="${key}"]`);
      el.querySelector(".ti-bar i").style.width = it.n / goal * 100 + "%";
      const inp = el.querySelector("input"); if (document.activeElement !== inp) inp.value = it.n;
      const now = it.n >= goal; el.classList.toggle("done", now);
      if (now && !was) { el.classList.remove("cheer"); void el.offsetWidth; el.classList.add("cheer"); MH.toast(`Task done! +${R[it.kind]} uC`); }
      sum();
    }
    list.addEventListener("click", e => {
      const ti = e.target.closest(".ti"); if (!ti) return;
      const key = ti.dataset.key;
      if (e.target.closest(".ti-x")) {
        st.items = st.items.filter(i => `${i.id}:${i.kind}` !== key); save();
        ti.classList.add("out"); setTimeout(draw, RM ? 0 : 260); return;
      }
      const b = e.target.closest("button[data-d]"); if (!b) return;
      const it = find(key), goal = byId[it.id][it.kind];
      set(key, b.dataset.d === "all" ? goal : it.n + +b.dataset.d);
    });
    list.addEventListener("input", e => { if (e.target.matches("input")) set(e.target.closest(".ti").dataset.key, +e.target.value); });
    list.addEventListener("change", e => { if (e.target.matches("input")) { const it = find(e.target.closest(".ti").dataset.key); e.target.value = it.n; } });
    $("#trAdd").addEventListener("click", () => add(pick.value, kind, false));
    $("#trClearD").addEventListener("click", () => { st.items = st.items.filter(i => i.kind !== "daily"); save(); draw(); MH.toast("Cleared your daily tasks"); });
    $("#trClearW").addEventListener("click", () => { st.items = st.items.filter(i => i.kind !== "weekly"); save(); draw(); MH.toast("Cleared your weekly tasks"); });
    setInterval(() => { if (rollover()) { draw(); MH.toast("New day: your daily tasks were cleared"); } }, 30000);

    function add(id, k, jump) {
      const t = byId[id];
      if (st.items.some(i => i.id === id && i.kind === k)) { MH.toast(`Already tracking that ${k} task`); }
      else { st.items.push({ id, kind: k, n: 0 }); save(); draw(); MH.toast(`Tracking: ${plain(t, k)}`); }
      const el = list.querySelector(`[data-key="${id}:${k}"]`);
      if (el) { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
      if (jump) $("#tracker").scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
    }
    draw();
    return { add };
  })();

  /* ================= Calculator ================= */
  (function calc() {
    const inD = $("#inD"), inDays = $("#inDays"), inW = $("#inW");
    inD.max = D.tasks.length; inW.max = D.tasks.length;
    $("#ccBoxes").innerHTML = D.boxes.map(b => `<a class="cb" href="mystery-boxes.html" data-uc="${b.uc}" title="${esc(b.n)}: ${b.uc} uC">
        <img src="${BOX(b.slug)}" alt="" /><b>0</b><span>${esc(b.n.replace(" Box", ""))}</span><small>${b.uc} uC</small></a>`).join("");
    const tw = (el, v) => {
      const from = +el.dataset.v || 0; el.dataset.v = v;
      if (RM) { el.textContent = fmt(v); return; }
      const t0 = performance.now(); cancelAnimationFrame(el._r);
      (function s(now) { const p = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (v - from) * e); if (p < 1) el._r = requestAnimationFrame(s); })(t0);
    };
    function upd() {
      const d = +inD.value, days = +inDays.value, w = +inW.value;
      $("#vD").textContent = d; $("#vDays").textContent = days; $("#vW").textContent = w;
      [inD, inDays, inW].forEach(i => i.style.setProperty("--p", (i.value - i.min) / (i.max - i.min) * 100 + "%"));
      const dw = d * days * R.daily, ww = w * R.weekly, week = dw + ww;
      tw($("#outWeek"), week); tw($("#outMonth"), week * 30 / 7); tw($("#outYear"), week * 52);
      tw($("#outDw"), dw); tw($("#outWw"), ww);
      const sp = $("#ccSplit"); sp.style.setProperty("--d", week ? dw / week * 100 + "%" : "50%"); sp.classList.toggle("zero", !week);
      $("#ccBoxes").querySelectorAll(".cb").forEach(c => { const n = Math.floor(week / +c.dataset.uc); tw(c.querySelector("b"), n); c.classList.toggle("none", n === 0); });
    }
    [inD, inDays, inW].forEach(i => i.addEventListener("input", upd));
    upd();
  })();

  /* ================= Daily Gifts ================= */
  (function gifts() {
    const G = D.gifts;
    $("#giftIntro").textContent = G.intro;
    $("#gfReset").textContent = G.reset;
    $("#streakNote").textContent = G.streakNote;
    const by = Object.fromEntries(G.streak.map(s => [s.day, s]));
    $("#gfDays").innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = i + 1, s = by[d];
      return `<div class="gd${s ? " prize" : ""}" style="--i:${i}"><small>Day ${d}</small>${s ? `<img src="${BOX(s.slug)}" alt="" /><b>${esc(s.box)}</b>` : `<span class="gd-dot"></span><b>Gift</b>`}</div>`;
    }).join("");
    $("#gfBoost").innerHTML = G.boosters.map(b => `<div class="gb glass reveal"><div class="gb-top"><b>${esc(b.n)}</b><span class="gb-k ${b.kind === "Gamepass" ? "gp" : b.kind === "Free" ? "free" : b.kind === "Retired" ? "old" : "bf"}">${esc(b.kind)}</span></div><p>${esc(b.text)}</p></div>`).join("");
    $("#gfBoost").querySelectorAll(".reveal").forEach(MH.reveal);
    const clock = $("#gfClock"), stat = $("#stReset"), bar = $("#gfBar");
    function tick() {
      const ms = untilReset(), t = hms(ms);
      clock.textContent = t; stat.textContent = t.slice(0, 5).replace(":", "h ") + "m";
      bar.style.width = (1 - ms / 864e5) * 100 + "%";
    }
    tick(); setInterval(tick, 1000);
  })();

  /* ================= History ================= */
  $("#timeline").innerHTML = D.history.map(h => `<li class="reveal"><span class="tl-dot"></span><small>${esc(h.date)}</small><b>${esc(h.name)}</b><p>${esc(h.text)}</p></li>`).join("");
  $("#timeline").querySelectorAll(".reveal").forEach(MH.reveal);

  /* Back to top */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }));
})();
