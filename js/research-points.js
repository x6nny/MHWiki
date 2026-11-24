/* =========================================================
   Research Points page
   Data: window.MH_RP (data/ResearchPoints.json)
   ========================================================= */
(() => {
  const D = window.MH_RP;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const A = n => `../assets/rp/${n}.webp`;
  const ITEM = n => "item-index.html#item=" + encodeURIComponent(n);
  const RM = MH.reduceMotion;

  /* Isometric research crate as inline SVG */
  const CRATE_COLORS = {
    basic:     { t: "#d3d7df", l: "#a3aab6", r: "#7a8190", e: "#4a505c", d: "#3a3f4a" },
    uc:        { t: "#d7a6ff", l: "#a766f0", r: "#7c45c4", e: "#40206f", d: "#3a1966" },
    "giant-uc":{ t: "#d7a6ff", l: "#a766f0", r: "#7c45c4", e: "#40206f", d: "#3a1966" },
    shadow:    { t: "#4a4466", l: "#2c2740", r: "#1b1828", e: "#0a0910", d: "#c9b8ff", op: .72 },
    golden:    { t: "#fff0a6", l: "#ffc93d", r: "#e0a116", e: "#8a5a00", d: "#7a4b00" },
    lucky:     { t: "#a9ffb4", l: "#45dc63", r: "#259f42", e: "#0f5a20", d: "#0d4a1b" },
    diamond:   { t: "#e2f9ff", l: "#8fdfff", r: "#4fb3e6", e: "#1d6e9a", d: "#16577b" },
  };
  function crateSVG(id) {
    const c = CRATE_COLORS[id] || CRATE_COLORS.basic;
    const decal = `<rect x="9" y="9" width="82" height="82" rx="8" fill="none" stroke="${c.e}" stroke-width="7" opacity=".55"/>`
      + `<circle cx="50" cy="52" r="25" fill="#fff"/><path d="M27 52a23 23 0 0 1 46 0Z" fill="${c.d}"/>`
      + `<path d="M50 33l3.2 8.6 9 .4-7 5.6 2.4 8.7L50 51.3l-7.6 5 2.4-8.7-7-5.6 9-.4Z" fill="#fff"/>`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true"${c.op ? ` opacity="${c.op}"` : ""}>`
      + `<polygon points="50,6 92,25 50,44 8,25" fill="${c.t}"/>`
      + `<polygon points="8,25 50,44 50,95 8,76" fill="${c.l}"/>`
      + `<polygon points="50,44 92,25 92,76 50,95" fill="${c.r}"/>`
      + `<g transform="matrix(.42 .19 0 .51 8 25)">${decal}</g>`
      + `<g transform="matrix(.42 -.19 0 .51 50 44)">${decal}</g>`
      + `<polygon points="50,6 92,25 50,44 8,25" fill="none" stroke="${c.e}" stroke-width="2.4" stroke-linejoin="round" opacity=".7"/>`
      + `<path d="M8 25v51l42 19 42-19V25M50 44v51" fill="none" stroke="${c.e}" stroke-width="2.4" stroke-linejoin="round" opacity=".7"/>`
      + `<path d="M14 27.5l36 16.2 36-16.2" fill="none" stroke="#fff" stroke-width="1.4" opacity=".35"/>`
      + `</svg>`;
  }
  const crateArt = c => c.group === "natural" ? crateSVG(c.id) : `<img src="${A(c.img)}" alt="" loading="lazy" draggable="false" />`;

  /* Number formatting: 1,234 / 12.5k / 1.25M */
  function short(n) {
    if (n == null || !isFinite(n)) return "–";
    const a = Math.abs(n);
    const f = (v, s) => (v >= 100 ? Math.round(v) : v >= 10 ? +v.toFixed(1) : +v.toFixed(2)) + s;
    if (a >= 1e9) return f(n / 1e9, "B");
    if (a >= 1e6) return f(n / 1e6, "M");
    if (a >= 1e4) return f(n / 1e3, "k");
    return Math.round(n).toLocaleString("en-US");
  }
  const full = n => Math.round(n).toLocaleString("en-US");
  function parseRp(str) {
    const m = String(str).trim().toLowerCase().replace(/[, _]/g, "").match(/^(\d*\.?\d+)\s*(k|m|b)?$/);
    if (!m) return null;
    return parseFloat(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]] || 1);
  }
  /* Tween a number shown in an element */
  function tween(el, to, fmt = short, dur = 700) {
    const from = +el.dataset.v || 0;
    el.dataset.v = to;
    if (RM || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    cancelAnimationFrame(el._raf);
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) el._raf = requestAnimationFrame(step);
    })(t0);
  }
  const rate = f => f.rp / f.per;
  const FZ = D.furnaces.map(f => ({ ...f, r: rate(f) })).sort((a, b) => b.r - a.r);
  FZ.forEach((f, i) => f.rank = i + 1);
  const TOP = FZ[0].r;
  const natural = D.crates.filter(c => c.group === "natural");

  /* ================= Hero ================= */
  $("#lede").innerHTML = `Research Points (<b>RP</b>) unlock the higher shop tiers, buy items from The Masked Man and pay for The Craftsman's blueprints. They've been in the game since it launched on <b>June 12, 2015</b>.`;
  setTimeout(() => {
    MH.countUp($("#stCrates"), natural.length, 900);
    tween($("#stTop"), TOP, v => v.toFixed(1), 1400);
    tween($("#stAlmighty"), 400000, short, 1500);
    tween($("#stBp"), 1e6, short, 1600);
  }, 500);

  /* ================= Crate catcher ================= */
  (function catcher() {
    const box = $("#catch"), field = $("#field");
    const hudRp = $("#hudRp"), timeBtn = $("#hudTime");
    const goalText = $("#goalText"), goalNum = $("#goalNum"), goalFill = $("#goalFill"), goalBox = document.querySelector(".catch-goal");
    const hint = $("#catchHint");
    const SIZE = { basic: 54, uc: 52, shadow: 50, "giant-uc": 74, golden: 64, lucky: 58, diamond: 72 };
    const LIFE = { basic: 6500, uc: 6500, shadow: 7000, "giant-uc": 7000, golden: 6500, lucky: 7500, diamond: 9000 };
    const GLOW = { golden: "rgba(255,214,92,.6)", lucky: "rgba(124,255,107,.55)", diamond: "rgba(120,220,255,.7)", "giant-uc": "rgba(190,120,255,.5)" };
    const GOALS = [...D.tiers.map(t => ({ name: t.name + " tier", rp: t.rp })), { name: "the priciest blueprint", rp: 1e6 }];
    let total = 0, night = false, live = new Set(), timer = null, visible = true, cycleT = null, clicked = false;

    function goal() {
      const next = GOALS.find(g => g.rp > total);
      if (!next) { goalText.textContent = "You could afford any blueprint!"; goalNum.textContent = full(total); goalFill.style.width = "100%"; return; }
      const prev = [...GOALS].reverse().find(g => g.rp <= total);
      const base = prev ? prev.rp : 0;
      goalText.textContent = `Next unlock: ${next.name}`;
      goalNum.textContent = `${short(total)} / ${short(next.rp)}`;
      goalFill.style.width = `${((total - base) / (next.rp - base)) * 100}%`;
    }
    function pick() {
      const pool = natural.filter(c => night || !c.night);
      const sum = pool.reduce((s, c) => s + c.weight, 0);
      let r = Math.random() * sum;
      for (const c of pool) { if ((r -= c.weight) < 0) return c; }
      return pool[0];
    }
    function announce(msg) {
      const a = document.createElement("div");
      a.className = "announce"; a.textContent = msg;
      box.appendChild(a); setTimeout(() => a.remove(), 2900);
    }
    function spawn(force) {
      if (!visible || document.hidden || live.size >= 6) return;
      const c = force || pick();
      const W = field.clientWidth, H = field.clientHeight, s = SIZE[c.id] || 56;
      const x = 12 + Math.random() * (W - s - 24);
      const y = H - s - 34 - Math.random() * 46;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "crate" + (GLOW[c.id] ? " shine" : "") + (c.night ? " shadowy" : "");
      b.style.cssText = `--x:${x}px;--y:${y}px;--s:${s}px;--fd:${(1.1 + Math.random() * .6).toFixed(2)}s;${GLOW[c.id] ? `--glow:${GLOW[c.id]}` : ""}`;
      b.setAttribute("aria-label", `${c.name}, ${c.rp} RP`);
      b.innerHTML = crateSVG(c.id);
      b._c = c;
      if (RM) b.classList.add("landed");
      else b.addEventListener("animationend", e => { if (e.animationName === "fall") b.classList.add("landed"); }, { once: false });
      b.addEventListener("pointerdown", e => { e.preventDefault(); collect(b); });
      b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); collect(b); } });
      field.appendChild(b); live.add(b);
      if (c.announce) announce(c.announce);
      b._t = setTimeout(() => despawn(b), LIFE[c.id] || 6500);
    }
    function despawn(b) {
      if (!live.has(b)) return;
      live.delete(b); clearTimeout(b._t);
      b.classList.add("fade"); setTimeout(() => b.remove(), 650);
    }
    function collect(b) {
      if (!live.has(b)) return;
      live.delete(b); clearTimeout(b._t);
      const c = b._c;
      if (!b.classList.contains("landed")) {
        // Freeze the crate where it is mid-fall
        const m = new DOMMatrix(getComputedStyle(b).transform);
        b.style.setProperty("--y", m.m42 + "px"); b.classList.add("landed");
      }
      b.classList.add("got");
      setTimeout(() => b.remove(), 500);
      const before = total;
      total += c.rp;
      tween(hudRp, total, full, 500);
      hudRp.classList.remove("bump"); void hudRp.offsetWidth; hudRp.classList.add("bump");
      const p = document.createElement("div");
      p.className = "pop";
      p.style.left = (parseFloat(b.style.getPropertyValue("--x")) + (SIZE[c.id] || 56) / 2) + "px";
      p.style.top = (parseFloat(b.style.getPropertyValue("--y")) - 18) + "px";
      p.innerHTML = `+${short(c.rp)} RP<small>${esc(c.name)}</small>`;
      field.appendChild(p); setTimeout(() => p.remove(), 1250);
      const crossed = GOALS.filter(g => g.rp > before && g.rp <= total);
      if (crossed.length) {
        const g = crossed[crossed.length - 1];
        MH.toast(g.rp === 1e6 ? "1M RP! That's enough for any Craftsman blueprint." : `${g.name.replace(" tier", "")} shop tier unlocked!`);
        goalBox.classList.remove("levelup"); void goalBox.offsetWidth; goalBox.classList.add("levelup");
      }
      goal();
      if (!clicked) { clicked = true; hint.classList.add("gone"); }
    }
    function setNight(v) {
      night = v;
      box.classList.toggle("night", night);
      $("#hudTimeIcon").textContent = night ? "☾" : "☀";
      $("#hudTimeText").textContent = night ? "Night" : "Day";
      if (night) { setTimeout(() => spawn(natural.find(c => c.night)), 900); }
      else { live.forEach(b => { if (b._c.night) despawn(b); }); }   // Shadow Crates vanish at sunrise
    }
    function loop() { clearInterval(cycleT); cycleT = setInterval(() => setNight(!night), 24000); }
    timeBtn.addEventListener("click", () => { setNight(!night); loop(); MH.toast(night ? "Night falls. Watch for Shadow Crates." : "The sun's up. Shadow Crates are gone."); });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: .15 }).observe(box);
    goal();
    setTimeout(() => { spawn(natural[0]); spawn(natural.find(c => c.id === "golden")); }, 700);
    timer = setInterval(() => spawn(), 1100);
    loop();
  })();

  /* ================= Crates ================= */
  (function crates() {
    const tabs = $("#crateTabs"), grid = $("#crateGrid");
    const groups = D.crateGroups;
    tabs.innerHTML = `<span class="ct-ind" id="ctInd"></span>` + groups.map((g, i) =>
      `<button class="ct${i ? "" : " on"}" type="button" role="tab" data-g="${g.id}" style="--c:${g.color}">${esc(g.name)}<i>${D.crates.filter(c => c.group === g.id).length}</i></button>`).join("");
    const ind = $("#ctInd");
    function moveInd() {
      const on = tabs.querySelector(".ct.on");
      ind.style.left = on.offsetLeft + "px"; ind.style.width = on.offsetWidth + "px";
      ind.style.top = on.offsetTop + "px"; ind.style.height = on.offsetHeight + "px";
      ind.style.setProperty("--c", on.style.getPropertyValue("--c"));
    }
    function rpLabel(c) {
      if (c.rp === "lots") return `<span class="cr-rp"><img src="${A("rp-icon")}" alt="" />Lots of RP</span>`;
      if (Array.isArray(c.rp)) return `<span class="cr-rp"><img src="${A("rp-icon")}" alt="" />${short(c.rp[0])} – ${short(c.rp[1])}</span>`;
      if (c.rp) return `<span class="cr-rp"><img src="${A("rp-icon")}" alt="" />${short(c.rp)}</span>`;
      return `<span class="cr-rp none">${c.price ? "Costs " + esc(c.price) : "No RP"}</span>`;
    }
    function show(gid) {
      const g = groups.find(x => x.id === gid);
      const list = D.crates.filter(c => c.group === gid);
      grid.innerHTML = list.map((c, i) => `
        <article class="cr glass" style="--c:${g.color};--i:${i * 60}ms">
          <div class="cr-top">
            <div class="cr-pic${c.group === "natural" ? " svg" : ""}">${crateArt(c)}</div>
            <div><h3>${esc(c.name)}</h3>${c.aka ? `<span class="cr-aka">aka ${esc(c.aka)}</span>` : ""}${rpLabel(c)}</div>
          </div>
          <p>${esc(c.info)}</p>
          <div class="cr-meta">
            <span>${esc(c.spawn)}</span>
            ${c.despawn ? `<span>⏱ Despawns: ${esc(c.despawn)}</span>` : ""}
            ${c.announce ? `<span class="ann">📣 Announced in chat</span>` : ""}
            ${c.night ? `<span class="nt">☾ Night only</span>` : ""}
          </div>
          <ul class="cr-box">${c.contents.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        </article>`).join("");
    }
    tabs.addEventListener("click", e => {
      const b = e.target.closest(".ct"); if (!b || b.classList.contains("on")) return;
      tabs.querySelectorAll(".ct").forEach(x => x.classList.toggle("on", x === b));
      moveInd(); show(b.dataset.g);
    });
    show(groups[0].id);
    requestAnimationFrame(moveInd);
    window.addEventListener("resize", moveInd);
    document.fonts && document.fonts.ready.then(moveInd);

    // Ladder of natural crate RP
    const max = Math.max(...natural.map(c => c.rp));
    $("#ladderRows").innerHTML = [...natural].sort((a, b) => a.rp - b.rp).map((c, i) => `
      <div class="lr"><span class="lr-ic">${crateSVG(c.id)}</span><span>${esc(c.name)}</span>
        <div class="lb"><i class="${c.night ? "night" : c.rp === max ? "top" : ""}" style="--w:${(c.rp / max) * 100}%;--dl:${i * 110}ms"></i></div><b>${short(c.rp)}</b></div>`).join("");
    MH.reveal($("#ladder"));
  })();

  /* ================= Spending ================= */
  const LOCK = `<svg class="cl" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
    <svg class="op" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  let myRp = 75000;
  const listeners = [];
  (function spend() {
    const steps = $("#tierSteps"), input = $("#myRp"), slider = $("#myRpSlider"), sum = $("#unlockSum");
    steps.innerHTML = D.tiers.map(t => `
      <div class="ts" style="--tc:${t.color}" data-rp="${t.rp}">
        <div class="lk">${LOCK}</div>
        <div><h4>${esc(t.name)}</h4><small>Shop items worth ${esc(t.cash)}${t.note ? ` · e.g. ${esc(t.note)}` : ""}</small></div>
        <div class="need">${short(t.rp)}<em>RP to unlock</em></div>
        <span class="prog"></span>
      </div>`).join("");

    const icons = {
      shop: `<svg viewBox="0 0 24 24"><path d="M4 9h16l-1.2 10.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 9Z M8 9V7a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
      mm: `<img src="../assets/icons/masked-man.png" alt="" />`,
      craft: `<img src="../assets/icons/craftsman.png" alt="" />`,
      lb: `<svg viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11 M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5 M12 14v3 M8 20h8 M9.5 17h5l.5 3h-6l.5-3Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
    };
    $("#uses").innerHTML = D.uses.map(u => `
      <article class="use glass reveal" data-u="${u.id}">
        <div class="ui">${icons[u.icon]}</div>
        <div><h3>${esc(u.title)} <em>${esc(u.range)}</em></h3><p>${esc(u.text)}</p>
        <span class="afford"></span>${u.link ? `<a class="more" href="${u.link}">See the NPC →</a>` : ""}</div>
      </article>`).join("");
    document.querySelectorAll("#uses .reveal").forEach(MH.reveal);

    const MAXS = 1.5e6;
    const toSlider = v => Math.round(1000 * Math.cbrt(Math.min(v, MAXS) / MAXS));
    const fromSlider = s => Math.round(MAXS * Math.pow(s / 1000, 3) / 100) * 100;
    let prevOpen = new Set();
    function update(v, from) {
      myRp = Math.max(0, v);
      if (from !== "input") input.value = short(myRp);
      if (from !== "slider") slider.value = toSlider(myRp);
      const open = new Set();
      steps.querySelectorAll(".ts").forEach(s => {
        const need = +s.dataset.rp, ok = myRp >= need;
        s.style.setProperty("--p", Math.min(100, (myRp / need) * 100) + "%");
        s.classList.toggle("open", ok);
        if (ok) open.add(need);
        if (ok && !prevOpen.has(need)) { s.classList.remove("just"); void s.offsetWidth; s.classList.add("just"); }
      });
      prevOpen = open;
      const next = D.tiers.find(t => t.rp > myRp);
      sum.innerHTML = next
        ? `You've unlocked <b>${open.size} of ${D.tiers.length}</b> RP-locked tiers. Next is <b>${esc(next.name)}</b>, <b>${short(next.rp - myRp)}</b> RP to go.`
        : `<b>Every shop tier is unlocked.</b> Common, Uncommon and Rare never needed RP in the first place.`;
      const aff = (id, t, yes) => { const el = document.querySelector(`[data-u="${id}"] .afford`); el.textContent = t; el.classList.toggle("yes", yes); };
      aff("shop", `${open.size}/${D.tiers.length} tiers open with ${short(myRp)} RP`, open.size === D.tiers.length);
      aff("mm", myRp >= 1.25e6 ? "Enough for anything he sells for RP" : myRp >= 18500 ? "Enough for his cheaper RP items" : `${short(18500 - myRp)} RP short of his cheapest RP item`, myRp >= 18500);
      aff("craft", myRp >= 1e6 ? "Enough for any blueprint" : myRp >= 50000 ? "Enough for the cheaper blueprints" : `${short(50000 - myRp)} RP short of the cheapest blueprint`, myRp >= 50000);
      aff("lb", "Every RP you earn counts", true);
      listeners.forEach(f => f());
    }
    input.addEventListener("input", () => { const v = parseRp(input.value); input.parentElement.style.borderColor = v == null && input.value ? "#ff5d73" : ""; if (v != null) update(v, "input"); });
    input.addEventListener("blur", () => { input.value = short(myRp); input.parentElement.style.borderColor = ""; });
    slider.addEventListener("input", () => update(fromSlider(+slider.value), "slider"));
    update(myRp);
  })();

  /* ================= Furnaces ================= */
  (function furnaces() {
    const list = $("#fzList"), chips = $("#fzChips");
    const SRC = [["all", "All"], ["shop", "Shop"], ["rebirth", "Rebirth"], ["event", "Event"], ["quest", "Quest"]];
    let src = "all", sort = "rate";
    chips.innerHTML = SRC.map(([k, n]) => `<button type="button" data-s="${k}" class="${k === "all" ? "on" : ""}">${n} <span>${k === "all" ? FZ.length : FZ.filter(f => f.src === k).length}</span></button>`).join("");
    function draw() {
      let arr = FZ.filter(f => src === "all" || f.src === src);
      if (sort === "name") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
      list.classList.remove("in");
      list.innerHTML = arr.length ? arr.map((f, i) => `
        <div class="fz${f.rank === 1 ? " best" : ""}" style="animation:crIn .5s var(--ease) both ${i * 40}ms">
          <span class="rk">${f.rank}</span>
          <div class="fp"><img src="${A(f.img)}" alt="" loading="lazy" /></div>
          <div class="fn"><a href="${ITEM(f.name)}">${esc(f.name)}</a>
            <small><span>${esc(f.tier)}</span>${f.life ? `<span class="life">${esc(f.life)}</span>` : ""}${f.tier === "Slipstream" ? `<span class="slip">Not reborn-proof</span>` : ""}${f.cost ? `<span>${esc(f.cost)}</span>` : ""}</small></div>
          <div class="fbar"><div class="b"><i style="--w:${(f.r / TOP) * 100}%;--dl:${i * 50}ms"></i></div><em><span class="m-only">${f.rp} RP / ${f.per} ore · </span>${esc(f.cond)} · ${esc(f.mult)}</em></div>
          <div class="rate"><b>${f.r.toFixed(2)}</b><small>${f.rp} RP / ${f.per} ore</small></div>
        </div>`).join("") : `<div class="fz-empty">No furnaces here.</div>`;
      requestAnimationFrame(() => requestAnimationFrame(() => { if (seen) list.classList.add("in"); }));
    }
    let seen = false;
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { seen = true; list.classList.add("in"); o.disconnect(); } }, { rootMargin: "0px 0px -60px 0px" }).observe(list);
    chips.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; src = b.dataset.s; chips.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); draw(); });
    $("#fzSort").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; sort = b.dataset.sort; $("#fzSort").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); draw(); });
    draw();
  })();

  /* ================= Calculator ================= */
  (function calc() {
    const sel = $("#cFurnace"), ops = $("#cOps"), hrs = $("#cH");
    sel.innerHTML = FZ.map((f, i) => `<option value="${i}">${esc(f.name)} · ${f.r.toFixed(2)} RP/ore</option>`).join("");
    const note = $("#cNote"), fill = $("#mFill");
    const C = 2 * Math.PI * 84;
    fill.style.strokeDasharray = C;
    const GOAL = [
      { n: "Super Rare", rp: 2500 }, { n: "Legendary", rp: 50000 }, { n: "Mythic", rp: 100000 },
      { n: "Divine", rp: 200000 }, { n: "Almighty", rp: 400000 }, { n: "Any blueprint", rp: 1e6 }, { n: "Masked Man's top price", rp: 1.25e6 },
    ];
    const dur = s => s < 60 ? `${Math.ceil(s)} sec` : s < 3600 ? `${Math.ceil(s / 60)} min` : s < 86400 ? `${(s / 3600).toFixed(s < 36000 ? 1 : 0)} h` : `${(s / 86400).toFixed(1)} days`;
    function run() {
      const f = FZ[+sel.value], o = +ops.value, h = +hrs.value;
      $("#cOpsVal").textContent = o; $("#cHVal").textContent = h + " h";
      const perSec = o * f.r, perH = perSec * 3600;
      tween($("#oHour"), perH); tween($("#oMin"), perSec * 60); tween($("#oSess"), perH * h); tween($("#oDay"), perH * 24);
      fill.style.strokeDashoffset = C * (1 - Math.min(1, perH / 1.2e6));
      note.innerHTML = `<b>${esc(f.name)}</b> pays <b>${f.rp} RP</b> every <b>${f.per}</b> ore. ${esc(f.cond)}.` +
        (f.name === "Industrial Scarab" ? ` A full base of Painite Mines teleported into one Scarab makes around <b>1M RP an hour</b>.` : "");
      const left = GOAL.filter(g => g.rp > myRp);
      $("#eta").innerHTML = (left.length ? left : GOAL.slice(-1)).map(g => `<div><small>${esc(g.n)} · ${short(g.rp)}</small><b>${g.rp > myRp ? dur((g.rp - myRp) / perSec) : "Done"}</b></div>`).join("") +
        `<div style="grid-column:1/-1;background:none;border:0;padding:2px 2px 0"><small>Times count from your ${short(myRp)} RP in the box above.</small></div>`;
    }
    sel.value = 0;
    $("#cPreset").addEventListener("click", () => {
      sel.value = FZ.findIndex(f => f.name === "Industrial Scarab"); ops.value = 90; run();
      MH.toast("Painite Mines into one Industrial Scarab: about 90 ore a second");
    });
    [sel, ops, hrs].forEach(el => el.addEventListener("input", run));
    listeners.push(run);
    run();
  })();

  /* ================= Guide ================= */
  const fzBy = n => FZ.find(f => f.name === n);
  $("#picks").innerHTML = D.picks.map(p => `
    <article class="pick glass reveal">
      <span class="pl">${esc(p.life)}</span>
      <div class="pimgs">${p.items.map(n => { const f = fzBy(n); return `<a href="${ITEM(n)}">${f ? `<img src="${A(f.img)}" alt="" loading="lazy" />` : ""}${p.items.length > 1 ? "" : esc(n)}</a>`; }).join("")}</div>
      ${p.items.length > 1 ? `<p style="margin-bottom:8px;color:var(--text);font-weight:800">${p.items.map(esc).join(" or ")}</p>` : ""}
      <p>${esc(p.text)}</p>
    </article>`).join("");
  $("#mineList").innerHTML = D.mines.map((m, i) => `<li style="--k:${i}"><div><a href="${ITEM(m.name)}">${esc(m.name)}</a>${m.note ? `<small>${esc(m.note)}</small>` : ""}</div><span class="spd"><i></i></span></li>`).join("");
  const K = { good: ["var(--rp)", "✓"], bad: ["#ff5d73", "✕"], warn: ["#ffc857", "!"] };
  $("#tips").innerHTML = D.tips.map(t => `<article class="tip glass reveal${t.hot ? " hot" : ""}" style="--tk:${K[t.k][0]}"><h4><i>${K[t.k][1]}</i>${esc(t.t)}</h4><p>${esc(t.d)}</p></article>`).join("");

  /* ================= History ================= */
  const HC = ["#3fe6d4", "#ff4d6d", "#8f7bff", "#ff8a3d", "#5ad8ff", "#7cff6b"];
  const DOT = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>`;
  $("#hist").innerHTML = `<span class="hfill"></span>` + D.history.map((h, i) => `
    <div class="hs" style="--hc:${HC[i % HC.length]};--k:${i}"><span class="dot">${DOT}</span><time>${esc(h.date)}</time><h4>${esc(h.title)}</h4><p>${esc(h.text)}</p></div>`).join("");
  $("#related").innerHTML = D.related.map(r => `
    <article class="rel glass reveal"><img src="${A(r.img)}" alt="" loading="lazy" />
      <div><h3><a href="${ITEM(r.name)}">${esc(r.name)}</a><em>${esc(r.tag)}</em></h3><p>${esc(r.text)}</p></div></article>`).join("");
  $("#trivia").innerHTML = D.trivia.map(t => `<li>${esc(t)}</li>`).join("");

  document.querySelectorAll("#picks .reveal, #tips .reveal, #related .reveal").forEach(MH.reveal);

  /* Back to top */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }));
})();
