/* =========================================================
   Rebirth page
   Data: window.MH_REBIRTH (js/rebirth-data.js), suffixes from window.MH_SUFFIX
   ========================================================= */
(() => {
  const D = window.MH_REBIRTH;
  const SUF = window.MH_SUFFIX.suffixes;
  const BASE = window.MH_IMG_BASE;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (p, size = 120) => p ? `${BASE}${p}/revision/latest/scale-to-width-down/${size}` : null;
  const ITEM_LINK = n => "item-index.html#item=" + encodeURIComponent(n);
  const ITEMS = D.items;
  const CAP = 241; // log10 of $10NVSPTGNTL
  const KINDS = {
    reborn: { label: "Reborn", color: "#4498ff" },
    advanced: { label: "Advanced Reborn", color: "#3dccb9" },
    decimal: { label: "Decimal Rarity", color: "#ffd166" },
    ultimate: { label: "Ultimate", color: "#ff4b5c" },
    slipstream: { label: "Slipstream", color: "#9b9cff" },
  };

  /* inline wiki segments */
  const seg = s => typeof s === "string" ? esc(s)
    : s.i ? `<a class="ilink" href="${ITEM_LINK(s.i)}">${s.img ? `<img src="${esc(img(s.img, 40))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : ""}${esc(s.l || s.i)}</a>` : "";
  const html = arr => (arr || []).map(seg).join("");
  const text = arr => (arr || []).map(s => typeof s === "string" ? s : (s.l || s.i || "")).join("");

  /* ---------- Big numbers in log10 ---------- */
  const trim = (x, dp) => { let s = x.toFixed(dp); return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s; };
  function fmtLog(L) {
    if (!isFinite(L)) return "$inf";
    if (L < 3) return "$" + Math.round(Math.pow(10, L)).toLocaleString("en-US");
    const e = Math.floor(L + 1e-9);
    const k = Math.min(Math.floor(e / 3), SUF.length);
    const s = SUF[k - 1];
    const n = Math.pow(10, L - s.e);
    return "$" + (n >= 100 ? trim(n, 0) : n >= 10 ? trim(n, 1) : trim(n, 2)) + s.ab;
  }
  const bySuf = Object.fromEntries(SUF.map(s => [s.ab, s]));
  const byLower = {}; SUF.forEach(s => { (byLower[s.ab.toLowerCase()] ||= []).push(s); });
  const byName = Object.fromEntries(SUF.map(s => [s.name.toLowerCase(), s]));
  function parseCash(raw) {
    const t = String(raw).trim().replace(/^\$/, "").replace(/[,_\s]/g, "");
    if (!t) return null;
    let m;
    if (/^inf$/i.test(t)) return Infinity;
    if ((m = t.match(/^(\d*\.?\d+)[eE]\+?(-?\d+)$/))) return Math.log10(parseFloat(m[1])) + parseInt(m[2], 10);
    if ((m = t.match(/^(\d+)(\.\d+)?$/))) { const int = m[1].replace(/^0+/, "") || "0"; return int === "0" ? -Infinity : Math.log10(parseFloat(int.slice(0, 1) + "." + int.slice(1, 16))) + int.length - 1; }
    if ((m = t.match(/^(\d*\.?\d+)?([A-Za-z]+)$/))) {
      const s = bySuf[m[2]] || byName[m[2].toLowerCase()] || (byLower[m[2].toLowerCase()] || [])[0];
      if (!s) return null;
      return Math.log10(m[1] ? parseFloat(m[1]) : 1) + s.e;
    }
    return null;
  }
  /* Rebirth price, from the wiki's formula. Returns log10(price) for rebirthing out of `life`. */
  function priceLog(life) {
    const x = life - 1;
    if (life <= 40) return Math.log10(2.5e19 * (x + 1));
    const base = Math.log10(1e19 * (5 * Math.floor(x / 5) + 2.5) * (100 * Math.floor(x / 25) + 1) * (1000 * Math.floor(x / 500) + 1));
    const ex = life <= 5000 ? 0.00024 * x + 1 : 0.00024 * Math.floor(10 * Math.pow(12500 * Math.pow(x, 4), 1 / 7)) + 1;
    return Math.min(base * ex, CAP);
  }

  /* ---------- Hero ---------- */
  const maxLife = Math.max(...ITEMS.filter(i => i.life != null).map(i => i.life));
  $("#lede").innerHTML = `Start a new life for a chance at powerful Reborn items. Your base gets wiped, but each rebirth brings rarer items, and <b>every item is unlocked by life ${maxLife.toLocaleString("en-US")}</b>.`;
  setTimeout(() => {
    MH.countUp($("#stItems"), ITEMS.length);
    MH.countUp($("#stSkip"), 20);
    MH.countUp($("#stAll"), maxLife);
    MH.countUp($("#stCap"), 80351);
  }, 500);

  // Orbiting items + click-to-rebirth
  const orbitPool = ITEMS.filter(i => i.img && (i.k === "advanced" || i.k === "decimal" || i.k === "ultimate"));
  const orbit = $("#orbit");
  let lifeN = 1;
  function fillOrbit(cls = "") {
    const pick = [...orbitPool].sort(() => Math.random() - .5).slice(0, 8);
    orbit.innerHTML = pick.map((it, i) => `<img class="${cls}" src="${esc(img(it.img, 80))}" alt="" referrerpolicy="no-referrer" style="--a:${i * 45}deg;animation-delay:${i * 50}ms" onerror="this.remove()" />`).join("");
  }
  fillOrbit();
  const notes = { 2: "Bonus Inferno Box!", 3: "Bonus Inferno Box!", 5: "More items unlocked", 10: "More items unlocked", 100: "Bonus Inferno Box!", 500: "Advanced Reborns unlocked" };
  let busy = false;
  $("#portal").addEventListener("click", e => {
    if (busy) return; busy = true;
    const skip = Math.random() < .35 ? 1 + Math.floor(Math.random() * 20) : 0;
    const flash = $("#flash");
    flash.style.setProperty("--x", e.clientX + "px"); flash.style.setProperty("--y", e.clientY + "px");
    if (!MH.reduceMotion) { flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go"); }
    orbit.querySelectorAll("img").forEach(i => { i.classList.remove("pop"); i.classList.add("burst"); });
    setTimeout(() => {
      const from = lifeN; lifeN += 1 + skip;
      const b = $("#lifeNum"); b.textContent = lifeN.toLocaleString("en-US"); b.classList.remove("tick"); void b.offsetWidth; b.classList.add("tick");
      const hit = Object.keys(notes).map(Number).find(n => n > from && n <= lifeN);
      $("#lifeNote").textContent = skip ? `Skipped ${skip} ${skip === 1 ? "life" : "lives"}! +${Math.ceil(skip / 2)} Shards of Life` : hit ? notes[hit] : "New Reborn item!";
      fillOrbit("pop");
      busy = false;
    }, MH.reduceMotion ? 0 : 650);
  });

  /* ---------- How it works ---------- */
  $("#introText").textContent = D.intro.join(" ");
  const STEPS = [
    ["#40d565", `<img src="../assets/codes/cash.webp" alt="" />`, "Reach the price", "Your first rebirth costs $25Qn. Every life after that costs more."],
    ["#4498ff", `<svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`, "Rebirth in Settings", "Open Settings and rebirth. With life skipping on, extra cash skips extra lives."],
    ["#ff6b9a", `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`, "Your base is wiped", "Everything that isn't Reborn-proof or soulbound is deleted. Check the Item Index to see what's Reborn-proof."],
    ["#a77bff", `<img src="../assets/icons/rebirth.png" alt="" />`, "Get Reborn items", "You get at least one Reborn item, sometimes more, plus Inferno Boxes on lives 2, 3, 100, 500 and 1,000."],
  ];
  $("#steps").innerHTML = STEPS.map(([c, ic, h, p], i) => `<li class="step glass reveal" style="--c:${c}"><span class="num">0${i + 1}</span><div class="ic">${ic}</div><h3>${h}</h3><p>${p}</p></li>`).join("");
  document.querySelectorAll("#steps .reveal").forEach(MH.reveal);

  /* ---------- Calculator ---------- */
  const SKIP = D.skip;
  const skipOdds = s => SKIP[s <= 1 ? 0 : s <= 5 ? 1 : s <= 8 ? 2 : s <= 13 ? 3 : s <= 16 ? 4 : 5];
  const lifeItems = ITEMS.filter(i => i.life != null);
  function calc() {
    const life = Math.max(1, Math.min(200000, parseInt($("#cLife").value, 10) || 1));
    const cash = parseCash($("#cCash").value);
    const pL = priceLog(life);
    const out = $("#calcOut");
    if (cash === null) { out.innerHTML = `<div class="co"><div class="co-card bad wide"><small>Hmm</small><b>?</b><span>That cash amount doesn't look right. Try something like 25Qn, 1.5e+45 or 3 septillion.</span></div></div>`; return; }
    const price = `<div class="co-card"><small>Price to rebirth</small><b>${esc(fmtLog(pL))}</b><span>Out of life ${life.toLocaleString("en-US")}${pL >= CAP ? " (the max price)" : ""}</span></div>`;
    if (cash < pL - 1e-9) {
      const gap = pL - cash;
      out.innerHTML = `<div class="co">${price}<div class="co-card bad wide"><small>Not enough yet</small><b>${esc(fmtLog(cash))}</b><span>You need about <b style="display:inline;font-size:inherit">${gap < 3 ? (Math.pow(10, gap)).toFixed(1) + "×" : fmtLog(gap + 0).replace("$", "") + " times"}</b> more cash to rebirth.</span></div>
        <div class="co-card"><small>Next unlock</small>${nextUnlock(life)}</div></div>`;
      return;
    }
    const skip = Math.min(20, Math.max(0, Math.floor((cash - pL) / 3 + 1e-9)));
    const newLife = life + 1 + skip;
    const shards = Math.ceil(skip / 2);
    const [, c1, c2, c3] = skipOdds(skip);
    const newly = lifeItems.filter(i => i.life > life && i.life <= newLife && i.k !== "ultimate");
    const infernos = D.inferno.filter(n => n > life && n <= newLife);
    out.innerHTML = `<div class="co">
      ${price}
      <div class="co-card"><small>Lives skipped</small><b>${skip}</b><div class="skipbar">${Array.from({ length: 20 }, (_, j) => `<i class="${j < skip ? "on" : ""}" style="--j:${j}"></i>`).join("")}</div><span>${skip < 20 ? `Skip one more with ${esc(fmtLog(pL + (skip + 1) * 3))}` : "That's the most you can skip"}</span></div>
      <div class="co-card" style="--c:#a77bff"><small>New life</small><b>${newLife.toLocaleString("en-US")}</b><span>${infernos.length ? `Bonus Inferno Box for reaching life ${infernos.join(", ")}` : "Up from " + life.toLocaleString("en-US")}</span></div>
      <div class="co-card" style="--c:#ff6bb5"><small>Shards of Life</small><b>${shards}</b><span>${shards ? `Half of ${skip} skipped, rounded up` : "Skip lives to earn shards"}</span></div>
      <div class="co-card wide" style="--c:#7ad7ff"><small>Items this rebirth</small>
        <div class="chances"><i class="c1" style="--w:${c1}%"></i><i class="c2" style="--w:${c2}%"></i><i class="c3" style="--w:${c3}%"></i></div>
        <div class="chance-l"><span><i class="c1"></i>1 item ${c1}%</span><span><i class="c2"></i>2 items ${c2}%</span><span><i class="c3"></i>3 items ${c3}%</span></div></div>
      <div class="co-card wide" style="--c:#3dccb9"><small>${newly.length ? `Newly unlocked (${newly.length})` : "Next unlock"}</small>${newly.length ? `<div class="unlocks">${newly.slice(0, 10).map(chip).join("")}${newly.length > 10 ? `<span class="chip-it">+${newly.length - 10} more</span>` : ""}</div>` : nextUnlock(newLife)}</div>
    </div>`;
  }
  const chip = i => `<a class="chip-it" href="${ITEM_LINK(i.n)}">${i.img ? `<img src="${esc(img(i.img, 48))}" alt="" referrerpolicy="no-referrer" onerror="this.remove()" />` : ""}${esc(i.n)} <em>${i.life.toLocaleString("en-US")}+</em></a>`;
  function nextUnlock(life) {
    const nx = lifeItems.filter(i => i.life > life && i.k !== "ultimate").sort((a, b) => a.life - b.life);
    if (!nx.length) return `<b>All done</b><span>Every rebirth item is unlocked at your life.</span>`;
    const at = nx[0].life, group = nx.filter(i => i.life === at);
    return `<b>Life ${at.toLocaleString("en-US")}</b><div class="unlocks">${group.slice(0, 6).map(chip).join("")}</div>`;
  }
  $("#calcForm").addEventListener("submit", e => { e.preventDefault(); calc(); });
  calc();

  /* ---------- Price curve ---------- */
  (function curve() {
    const W = 1000, H = 340, L = 64, R = 24, T = 20, B = 36;
    const MAXL = 90000;
    const X = l => L + (l / MAXL) * (W - L - R);
    const Y = p => T + (1 - (p - 19) / (CAP + 4 - 19)) * (H - T - B);
    let d = "";
    for (let l = 1; l <= MAXL; l += (l < 1000 ? 10 : 150)) d += (d ? " L " : "M ") + X(l).toFixed(1) + " " + Y(priceLog(l)).toFixed(1);
    const area = d + ` L ${X(MAXL)} ${Y(19)} L ${X(1)} ${Y(19)} Z`;
    const MK = [[1000, "Life 1,000", 10, 18, "start"], [5000, "Life 5,000", 10, 18, "start"], [10000, "Life 10,000", -10, -10, "end"], [13941, "True Overlord", 10, 18, "start"], [47531, "Old max price", 0, -14, "middle"], [80351, "Max price (life 80,351)", -10, 20, "end"]];
    const yt = [19, 60, 100, 140, 180, 220];
    const xt = [0, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000];
    const c = $("#curve");
    c.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chart of rebirth price rising with life">
      <defs><linearGradient id="cvGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4498ff" stop-opacity=".5"/><stop offset="1" stop-color="#4498ff" stop-opacity="0"/></linearGradient>
      <linearGradient id="cvStroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3dccb9"/><stop offset=".5" stop-color="#4498ff"/><stop offset="1" stop-color="#a77bff"/></linearGradient></defs>
      <g class="grid">${yt.map(p => `<line x1="${L}" x2="${W - R}" y1="${Y(p)}" y2="${Y(p)}" />`).join("")}</g>
      <g class="axis">${yt.map(p => `<text x="${L - 8}" y="${Y(p) + 4}" text-anchor="end">1e+${p}</text>`).join("")}${xt.map(l => `<text x="${X(l)}" y="${H - 10}" text-anchor="middle">${l ? l / 1000 + "k" : "0"}</text>`).join("")}</g>
      <path class="area" d="${area}" /><path class="line" d="${d}" />
      ${MK.map(([l, t, dx, dy, an], i) => `<g class="mk" style="--i:${i}"><circle cx="${X(l)}" cy="${Y(priceLog(l))}" r="5" /><text x="${X(l) + dx}" y="${Y(priceLog(l)) + dy}" text-anchor="${an}">${t}</text></g>`).join("")}
      <g class="hair"><line id="hx" y1="${T}" y2="${H - B}" /><circle id="hc" r="5" /></g>
    </svg><div class="cv-tip" id="cvTip"></div>`;
    MH.reveal(c);
    const svg = c.querySelector("svg"), tip = $("#cvTip");
    function move(e) {
      const r = svg.getBoundingClientRect();
      const px = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * W;
      const life = Math.max(1, Math.min(MAXL, Math.round((px - L) / (W - L - R) * MAXL)));
      const p = priceLog(life), x = X(life), y = Y(p);
      svg.querySelector("#hx").setAttribute("x1", x); svg.querySelector("#hx").setAttribute("x2", x);
      svg.querySelector("#hc").setAttribute("cx", x); svg.querySelector("#hc").setAttribute("cy", y);
      tip.innerHTML = `Life ${life.toLocaleString("en-US")}<b>${esc(fmtLog(p))}</b>`;
      tip.style.left = (x / W * r.width + 18) + "px"; tip.style.top = (y / H * r.height + 18) + "px";
      c.classList.add("hover");
    }
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerleave", () => c.classList.remove("hover"));

    const noted = D.prices.filter(p => p.note);
    $("#mileRow").innerHTML = noted.map(p => `<div class="mr glass reveal"><div class="lf">Life ${p.life.toLocaleString("en-US")}</div><div class="pr">$${esc(p.price)}</div><p>${esc(p.note)}</p></div>`).join("");
    document.querySelectorAll("#mileRow .reveal").forEach(MH.reveal);
    $("#ptBody").innerHTML = D.prices.map(p => `<tr><td>${p.life.toLocaleString("en-US")}</td><td>$${esc(p.price)}</td><td>${esc(p.note)}</td></tr>`).join("");
  })();

  /* ---------- Life skipping ---------- */
  $("#skBars").innerHTML = SKIP.map(([r, a, b, c], i) => `<div class="sk-row"><span>${r}</span><div class="sk-bar">
    ${a ? `<i class="c1" style="--w:${a}%;--r:${i}">${Math.round(a)}%</i>` : ""}${b ? `<i class="c2" style="--w:${b}%;--r:${i}">${Math.round(b)}%</i>` : ""}${c ? `<i class="c3" style="--w:${c}%;--r:${i}">${Math.round(c)}%</i>` : ""}</div></div>`).join("");
  document.querySelectorAll(".skip-card").forEach(MH.reveal);
  const sl = $("#slSkip");
  function shardsUI() {
    const s = +sl.value, sh = Math.ceil(s / 2);
    $("#slVal").textContent = s;
    $("#slOut").innerHTML = `<div><small>Lives gained</small><b>+${s + 1}</b></div><div><small>Shards</small><b><img src="../assets/rebirth/shards.webp" alt="" />${sh}</b></div>
      <div style="flex-basis:100%"><small>Cash you need</small><b style="font-size:16px">${s ? `1 ${esc(SUF[s - 1].name.toLowerCase())} times the price` : "Just the price"}</b><div class="shard-rain">${Array.from({ length: sh }, (_, k) => `<img src="../assets/rebirth/shards.webp" alt="" style="--k:${k}" />`).join("")}</div></div>`;
  }
  sl.addEventListener("input", shardsUI);
  shardsUI();

  /* ---------- Items ---------- */
  const state = { k: "reborn", q: "", type: "", sort: "life", my: null };
  const tabs = $("#tabs"), ind = tabs.querySelector(".seg-ind");
  tabs.insertAdjacentHTML("beforeend", Object.entries(KINDS).map(([k, v]) => `<button data-k="${k}" class="${k === state.k ? "active" : ""}" role="tab">${v.label}<em>${ITEMS.filter(i => i.k === k).length}</em></button>`).join(""));
  function moveInd() {
    const b = tabs.querySelector("button.active");
    ind.style.width = b.offsetWidth + "px"; ind.style.transform = `translateX(${b.offsetLeft - 4}px)`;
    tabs.style.setProperty("--sc", KINDS[state.k].color);
  }
  tabs.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    state.k = b.dataset.k;
    tabs.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    moveInd(); render();
  });
  window.addEventListener("resize", moveInd);
  const typeOk = (i, t) => !t || (t === "other" ? !/Upgrader|Furnace|Dropper/.test(i.type) : i.type.includes(t));
  let io;
  function card(i, n) {
    const K = KINDS[i.k];
    const locked = state.my != null && i.life != null && i.life > state.my;
    const src = img(i.img, 160);
    const rar = i.rar != null ? `<span class="tg2 rar" title="Lower is rarer">Rarity ${i.rar}${i.k !== "decimal" ? ` <span class="rar-dots">${Array.from({ length: 5 }, (_, j) => `<i class="${j < Math.max(1, Math.round((19 - i.rar) / 3.6)) ? "on" : ""}"></i>`).join("")}</span>` : ""}</span>` : "";
    const tags = [
      i.life != null ? `<span class="tg2 life">Life ${i.life.toLocaleString("en-US")}+</span>` : "",
      rar,
      i.k === "slipstream" ? `<span class="tg2 vanish">Vanishes on next rebirth</span>` : "",
      i.added ? `<span class="tg2">${esc(i.added)}</span>` : "",
    ].join("");
    const evo = i.evo ? `<a class="evo" href="${ITEM_LINK(i.evo.n)}"><span class="arrow">➜</span>${i.evo.img ? `<img src="${esc(img(i.evo.img, 80))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : ""}<span>Evolves into<br /><b>${esc(i.evo.n)}</b></span></a>` : "";
    return `<article class="ri glass ${locked ? "locked" : ""}" style="--c:${K.color};--i:${n}">
      <div class="ri-top">
        <a class="ri-img" href="${ITEM_LINK(i.n)}" aria-label="${esc(i.n)}">${src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>${esc(i.n[0])}</span>'" />` : `<span class="ph">${esc(i.n[0])}</span>`}</a>
        <div><h3><a href="${ITEM_LINK(i.n)}">${esc(i.n)}</a></h3><div class="ty">${esc(i.type || K.label)}${locked ? " · locked at your life" : ""}</div></div>
      </div>
      ${tags ? `<div class="tags2">${tags}</div>` : ""}
      ${i.src ? `<p class="src"><b>How to get it:</b> ${html(i.src)}</p>` : ""}
      <p class="ri-fx">${html(i.fx)}</p>
      ${evo}
    </article>`;
  }
  function render() {
    const t = state.q.trim().toLowerCase();
    let list = ITEMS.filter(i => i.k === state.k && typeOk(i, state.type) &&
      (!t || (i.n + " " + i.type + " " + text(i.fx) + " " + (i.evo ? i.evo.n : "") + " " + text(i.src)).toLowerCase().includes(t)));
    const s = state.sort;
    list.sort((a, b) => s === "az" ? a.n.localeCompare(b.n) : s === "rar" ? ((a.rar ?? 99) - (b.rar ?? 99) || (a.life ?? 0) - (b.life ?? 0)) : ((a.life ?? 0) - (b.life ?? 0) || (a.rar ?? 99) - (b.rar ?? 99)));
    const have = state.my != null ? list.filter(i => i.life == null || i.life <= state.my).length : null;
    $("#count").innerHTML = `Showing <b>${list.length}</b> ${esc(KINDS[state.k].label)} items${have != null ? ` · <b>${have}</b> unlocked at life ${state.my.toLocaleString("en-US")}` : ""}`;
    $("#grid").innerHTML = list.map(card).join("");
    $("#empty").hidden = list.length > 0;
    if (io) io.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -40px 0px" });
    $("#grid").querySelectorAll(".ri").forEach(x => io.observe(x));
  }
  let qt;
  $("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value; render(); }, 130); });
  $("#type").addEventListener("change", e => { state.type = e.target.value; render(); });
  $("#sort").addEventListener("change", e => { state.sort = e.target.value; render(); });
  $("#myLife").addEventListener("input", e => { const v = parseInt(e.target.value, 10); state.my = isNaN(v) ? null : v; render(); });
  $("#clear").addEventListener("click", () => { $("#q").value = ""; state.q = ""; $("#type").value = ""; state.type = ""; render(); });
  render();
  requestAnimationFrame(moveInd);
  document.fonts && document.fonts.ready.then(moveInd);

  /* ---------- Trivia ---------- */
  $("#trivia").innerHTML = D.trivia.filter(t => !/Discord Account/.test(text(t))).map(t => `<li>${html(t)}</li>`).join("");

  /* ---------- Back to top ---------- */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));
})();
