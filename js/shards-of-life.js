/* =========================================================
   Shards of Life page
   Data: window.MH_SOL (data/ShardsOfLife.json) + window.MH_SOL_GEN (data/ShardsOfLifeItems.json)
   ========================================================= */
(() => {
  const D = window.MH_SOL, G = window.MH_SOL_GEN;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (p, size = 120) => p ? MH_SRC(p) : "";
  const pic = (p, size, name) => p
    ? `<img src="${esc(img(p, size))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>${esc((name || "?")[0])}</span>'" />`
    : `<span class="ph">${esc((name || "?")[0])}</span>`;
  const ITEM = n => "item-index.html#item=" + encodeURIComponent(n);
  const SHARD = `<img src="../assets/sol/shard.webp" alt="" />`;
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const RM = MH.reduceMotion;
  const shardsFor = skips => Math.ceil(skips / 2);
  const misc = Object.fromEntries(G.misc.map(m => [m.n, m]));

  function tween(el, to, f = fmt, dur = 600) {
    const from = +el.dataset.v || 0; el.dataset.v = to;
    if (RM || from === to) { el.textContent = f(to); return; }
    const t0 = performance.now(); cancelAnimationFrame(el._r);
    (function s(now) { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = f(from + (to - from) * e); if (p < 1) el._r = requestAnimationFrame(s); })(t0);
  }
  function bump(el) { el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick"); }

  /* ================= Hero stats ================= */
  setTimeout(() => {
    MH.countUp($("#stMax"), 10, 900);
    MH.countUp($("#stShop"), G.reborn.length, 1200);
    MH.countUp($("#stEnch"), G.ench.length, 1000);
    MH.countUp($("#stTop"), Math.max(...G.ench.map(e => e.shards || 0)), 1500);
  }, 500);

  /* ================= Life-skip simulator ================= */
  (function sim() {
    const over = $("#simOver"), pips = $("#pips");
    pips.innerHTML = Array.from({ length: 20 }, () => "<i></i>").join("");
    const pipEls = [...pips.children];
    let life = 100, bank = 0;
    const lifeEl = $("#simLife"), bankEl = $("#simBank span");
    lifeEl.dataset.v = life;
    function read() {
      const o = +over.value, skip = Math.min(20, o);
      $("#simOverTxt").textContent = o === 0 ? "Just enough" : `${o} suffix${o > 1 ? "es" : ""}${o > 20 ? " (cap 20)" : ""}`;
      $("#simSkip").textContent = skip;
      $("#simGain").textContent = "+" + (skip + 1);
      $("#simShards").textContent = shardsFor(skip);
      pipEls.forEach((p, i) => p.classList.toggle("on", i < skip));
      document.querySelectorAll(".scb").forEach((b, i) => b.classList.toggle("on", i === skip));
      return skip;
    }
    over.addEventListener("input", read);
    read();
    function burst(n) {
      if (RM || !n) return;
      const host = $("#burst"), from = $("#crystal").getBoundingClientRect(), to = $("#simBank").getBoundingClientRect();
      const fx = from.left + from.width / 2, fy = from.top + from.height / 2;
      for (let i = 0; i < Math.min(n * 2, 24); i++) {
        const s = document.createElement("i");
        s.style.left = fx + "px"; s.style.top = fy + "px";
        host.appendChild(s);
        const ang = Math.random() * Math.PI * 2, r = 50 + Math.random() * 70;
        s.animate([
          { transform: "translate(-50%,-50%) scale(.4) rotate(0deg)", opacity: 0 },
          { transform: `translate(calc(-50% + ${Math.cos(ang) * r}px), calc(-50% + ${Math.sin(ang) * r}px)) scale(1) rotate(${ang * 90}deg)`, opacity: 1, offset: .35 },
          { transform: `translate(calc(-50% + ${to.left + to.width - 18 - fx}px), calc(-50% + ${to.top + to.height / 2 - fy}px)) scale(.5) rotate(360deg)`, opacity: .9 },
        ], { duration: 900 + i * 25, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" }).onfinish = () => s.remove();
      }
    }
    function rebirth() {
      const skip = read(), sh = shardsFor(skip);
      life += skip + 1; bank += sh;
      const c = $("#crystal"); c.classList.remove("pulse"); void c.offsetWidth; c.classList.add("pulse");
      burst(sh);
      tween(lifeEl, life); bump(lifeEl);
      setTimeout(() => { tween(bankEl, bank); bump($("#simBank")); }, RM ? 0 : 700);
      MH.toast(skip ? `Skipped ${skip} li${skip > 1 ? "ves" : "fe"}: +${sh} shard${sh === 1 ? "" : "s"}` : "No lives skipped, so no shards this time");
    }
    $("#simBtn").addEventListener("click", rebirth);
    $("#crystal").addEventListener("click", rebirth);
  })();

  /* ================= Sources ================= */
  $("#sources").innerHTML = D.sources.map(s => {
    const icon = s.gen ? img(misc[s.gen].img, 160) : MH_SRC(s.img);
    return `<article class="src glass reveal">
      <div class="src-top"><img src="${esc(icon)}" alt="" referrerpolicy="no-referrer" /><div><em>${esc(s.tag)}</em><h3>${esc(s.title)}</h3></div></div>
      <p>${esc(s.text)}</p>
      ${s.link ? `<a class="more" href="${s.link}">Meet The Craftsman →</a>` : ""}
      <code>${esc(s.formula)}</code>
    </article>`;
  }).join("");

  // Skip chart: 0..20 lives skipped
  $("#scBars").innerHTML = Array.from({ length: 21 }, (_, k) => {
    const sh = shardsFor(k);
    return `<div class="scb" data-k="${k}" title="${k} lives skipped → ${sh} shard${sh === 1 ? "" : "s"}" style="--h1:${(k / 20) * 100}%;--h2:${(sh / 10) * 100}%;--dl:${k * 45}ms"><span class="sk"></span><span class="sd"></span><b>${sh}</b></div>`;
  }).join("");
  $("#scBars").addEventListener("click", e => {
    const b = e.target.closest(".scb"); if (!b) return;
    $("#simOver").value = b.dataset.k; $("#simOver").dispatchEvent(new Event("input"));
    MH.toast(`${b.dataset.k} lives skipped = ${shardsFor(+b.dataset.k)} shards`);
  });
  document.querySelectorAll(".scb").forEach((b, i) => b.classList.toggle("on", i === Math.min(20, +$("#simOver").value)));

  /* ================= Uses & warnings ================= */
  $("#uses").innerHTML = D.uses.map(u => `
    <a class="use glass reveal" href="${u.jump}">
      <span class="rng">${SHARD}${esc(u.range)}</span>
      <h3>${esc(u.title)}</h3><p>${esc(u.text)}</p><span class="go">Jump there →</span>
    </a>`).join("");
  const OK = `<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3Z M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  const BAD = `<svg viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19L12 3Z M12 10v4.5 M12 17.5v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  $("#warns").innerHTML = D.warnings.map((w, i) => `<div class="wr ${i ? "bad" : "ok"}">${i ? BAD : OK}<span>${esc(w)}</span></div>`).join("");

  /* ================= Reborn shop: rarity formula ================= */
  (function rarity() {
    $("#shopNote").textContent = D.shop.note;
    $("#quirk").textContent = D.shop.quirks;
    const seg = $("#rarSeg"), range = $("#rarRange"), svg = $("#rarChart");
    let t = "R";
    const W = 520, H = 260, P = { l: 40, r: 14, t: 14, b: 28 };
    const buyR = x => 25 * (19 - x) + 150, buyA = x => 30 * (3 - x) + 660, sell = x => 27 - x;
    const X = r => P.l + ((r - 1) / 18) * (W - P.l - P.r);
    const Y = v => H - P.b - (v / 760) * (H - P.t - P.b);
    const Ys = v => H - P.b - (v / 30) * (H - P.t - P.b);
    function draw() {
      const grid = [0, 200, 400, 600].map(v => `<line class="gl" x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="lab" x="${P.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join("")
        + [1, 5, 10, 15, 19].map(r => `<text class="lab" x="${X(r)}" y="${H - 8}" text-anchor="middle">${r}</text>`).join("");
      const pr = Array.from({ length: 19 }, (_, i) => `${X(i + 1)},${Y(buyR(i + 1))}`).join(" ");
      const pa = [1, 2, 3].map(r => `${X(r)},${Y(buyA(r))}`).join(" ");
      const ps = Array.from({ length: 19 }, (_, i) => `${X(i + 1)},${Ys(sell(i + 1))}`).join(" ");
      svg.innerHTML = grid
        + `<polyline class="ln buy ${t === "A" ? "dim" : ""}" points="${pr}"/>`
        + `<polyline class="ln buy ${t === "R" ? "dim" : ""}" points="${pa}" style="stroke:#3dccb9"/>`
        + `<polyline class="ln sell" points="${ps}"/>`
        + `<line class="cursor" id="rc" y1="${P.t}" y2="${H - P.b}" x1="0" x2="0"/>`
        + `<circle class="dot" id="rdB" r="7" fill="#fff" stroke="${t === "A" ? "#3dccb9" : "#6cb8ff"}" stroke-width="4"/>`
        + `<circle class="dot" id="rdS" r="6" fill="#fff" stroke="#ffc857" stroke-width="4"/>`
        + `<text class="lab" x="${W - P.r}" y="${P.t + 4}" text-anchor="end" style="fill:#6cb8ff">Buy price</text>`
        + `<text class="lab" x="${W - P.r}" y="${P.t + 20}" text-anchor="end" style="fill:#ffc857">Salvage (×25 scale)</text>`;
    }
    function upd() {
      const max = t === "A" ? 3 : 19;
      range.max = max; if (+range.value > max) range.value = max;
      const r = +range.value, b = t === "A" ? buyA(r) : buyR(r), s = sell(r);
      $("#rarVal").textContent = r;
      tween($("#rarBuy"), b, fmt, 400); tween($("#rarSell"), s, fmt, 400);
      $("#rarF").textContent = `${t === "A" ? D.shop.advFormula : D.shop.rebornFormula} = ${b} · salvage 27 − ${r} = ${s}`;
      const c = $("#rc"), db = $("#rdB"), ds = $("#rdS");
      c.setAttribute("x1", X(r)); c.setAttribute("x2", X(r));
      db.setAttribute("cx", X(r)); db.setAttribute("cy", Y(b));
      ds.setAttribute("cx", X(r)); ds.setAttribute("cy", Ys(s));
    }
    seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      t = b.dataset.t; seg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      if (t === "A") range.value = Math.min(+range.value, 3);
      const wasIn = svg.closest(".rar").classList.contains("in");
      draw(); upd();
      if (wasIn) svg.querySelectorAll(".ln").forEach(l => { l.style.transition = "none"; l.style.strokeDashoffset = 0; });
    });
    range.addEventListener("input", upd);
    draw(); upd();
  })();

  /* ================= Reborn shop: browser ================= */
  (function shop() {
    const grid = $("#rsGrid"), q = $("#rsQ"), sortEl = $("#rsSort"), more = $("#rsMore"), tierEl = $("#rsTier");
    let tier = "all", shown = 24;
    function list() {
      const term = q.value.trim().toLowerCase();
      let a = G.reborn.filter(r => (tier === "all" || r.t === tier) && (!term || r.n.toLowerCase().includes(term)));
      const s = sortEl.value;
      a.sort(s === "cost-asc" ? (x, y) => x.cost - y.cost || x.n.localeCompare(y.n)
        : s === "sell-desc" ? (x, y) => (y.sell || 0) - (x.sell || 0) || x.n.localeCompare(y.n)
        : s === "name" ? (x, y) => x.n.localeCompare(y.n)
        : (x, y) => y.cost - x.cost || x.n.localeCompare(y.n));
      return a;
    }
    function draw(reset) {
      if (reset) shown = 24;
      const a = list();
      $("#rsCount").textContent = `${a.length} item${a.length === 1 ? "" : "s"}${a.length ? ` · ${fmt(Math.min(...a.map(r => r.cost)))}–${fmt(Math.max(...a.map(r => r.cost)))} shards` : ""}`;
      grid.innerHTML = a.length ? a.slice(0, shown).map((r, i) => `
        <div class="ri" style="--i:${(i % 24) * 25}ms">
          <div class="pic">${pic(r.img, 120, r.n)}</div>
          <div>
            <a class="nm" href="${ITEM(r.n)}" title="${esc(r.n)}">${esc(r.n)}</a>
            <div class="meta"><span class="${r.t}">${r.t === "A" ? "Adv. Reborn" : "Reborn"}</span>${r.r != null ? `<span>Rarity ${r.r}</span>` : ""}${r.life ? `<span>Life ${esc(r.life)}</span>` : ""}</div>
            <div class="px"><span>Buy <b>${SHARD}${fmt(r.cost)}</b></span>${r.sell != null ? `<span>Salvage <b class="s">${fmt(r.sell)}</b></span>` : ""}</div>
          </div>
        </div>`).join("") : `<div class="rs-empty">No Reborn items match that.</div>`;
      more.hidden = a.length <= shown;
      more.textContent = `Show more (${a.length - shown} left)`;
    }
    q.addEventListener("input", () => draw(true));
    sortEl.addEventListener("change", () => draw(true));
    tierEl.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; tier = b.dataset.t; tierEl.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); draw(true); });
    more.addEventListener("click", () => { shown += 24; draw(); });
    draw(true);
  })();

  /* ================= Enchanted ================= */
  (function ench() {
    const grid = $("#enGrid"), range = $("#haveRange");
    const SHOW = 4;
    grid.innerHTML = G.ench.map(e => {
      const eff = e.eff || e.quote;
      const chips = e.reqs.map((r, i) => `<a class="rq${i >= SHOW ? " extra" : ""}" href="${ITEM(r.n)}" title="${esc(r.n)}">${r.img ? `<img src="${esc(img(r.img, 60))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : ""}<em>×${fmt(r.x)}</em>${esc(r.n)}</a>`).join("")
        + e.other.map(o => `<span class="rq tx extra">${esc(o)}</span>`).join("");
      const hidden = Math.max(0, e.reqs.length - SHOW) + e.other.length;
      return `<article class="en glass reveal" data-cost="${e.shards || 0}">
        <div class="en-top">
          <div class="pic">${pic(e.img, 140, e.n)}</div>
          <div><a class="nm" href="${ITEM(e.n)}">${esc(e.n)}</a>
            <small><span>${esc(e.type || "Item")}</span>${e.life ? `<span class="lf">Life ${esc(e.life)}</span>` : ""}</small></div>
          <div class="en-cost"><b>${SHARD}${fmt(e.shards || 0)}</b><small>shards</small></div>
        </div>
        <div class="en-bar"><i></i></div>
        <p class="en-eff">${esc(eff)}</p>
        <div class="en-req">${chips}</div>
        ${hidden ? `<button class="en-more" type="button">+ ${hidden} more requirement${hidden > 1 ? "s" : ""}</button>` : ""}
      </article>`;
    }).join("");
    grid.querySelectorAll(".reveal").forEach(MH.reveal);
    grid.addEventListener("click", e => {
      const b = e.target.closest(".en-more"); if (!b) return;
      const card = b.closest(".en"), open = card.classList.toggle("open");
      const n = card.querySelectorAll(".rq.extra").length;
      b.textContent = open ? "Show less" : `+ ${n} more requirement${n > 1 ? "s" : ""}`;
    });
    function upd() {
      const have = +range.value;
      tween($("#haveVal"), have, fmt, 250);
      let ok = 0;
      grid.querySelectorAll(".en").forEach(c => {
        const cost = +c.dataset.cost, yes = have >= cost;
        c.classList.toggle("ok", yes); if (yes) ok++;
        c.querySelector(".en-bar i").style.setProperty("--p", Math.min(100, cost ? (have / cost) * 100 : 100) + "%");
      });
      const next = G.ench.find(e => (e.shards || 0) > have);
      $("#haveSum").innerHTML = `Enough shards for <b>${ok} of ${G.ench.length}</b> recipes.` + (next ? ` Next up: <b>${esc(next.n)}</b> at ${fmt(next.shards)} (${fmt(next.shards - have)} to go). You still need the items too.` : " You still need the items too.");
    }
    range.addEventListener("input", upd);
    upd();
  })();

  /* ================= Platforms ================= */
  (function plats() {
    const extra = [misc["Unstable Conveyor"]];
    $("#plGrid").innerHTML = G.plat.map(p => {
      const d = D.platforms[p.n] || {};
      const price = d.uc ? `<span class="price uc">${esc(d.uc)}</span>` : `<span class="price">${SHARD}${fmt(d.start)}<small style="font:700 12px var(--font-body);color:var(--faint)">&nbsp;to start</small></span>`;
      return `<article class="pl glass reveal">
        <div class="pic">${pic(p.img, 300, p.n)}</div>
        <a class="nm" href="${ITEM(p.n)}">${esc(p.n)}</a>
        ${price}<span class="rise">${esc(d.rise || "")}</span>
        <p>${esc(d.note || p.quote || "")}</p>
        <div class="tagz"><span>${esc((p.size || "").split(" ·")[0])}</span><span>${esc(p.src || "")}</span>${p.sac === "Yes" ? `<span class="good">Sacrifice-Proof</span>` : ""}</div>
      </article>`;
    }).join("") + extra.map(p => `
      <article class="pl glass reveal">
        <div class="pic">${pic(p.img, 300, p.n)}</div>
        <a class="nm" href="${ITEM(p.n)}">${esc(p.n)}</a>
        <span class="price">${SHARD}1</span><span class="rise">Sold by The Masked Man</span>
        <p>${esc(p.quote || "")}</p>
        <div class="tagz"><span>Contraband</span><span>The Masked Man</span></div>
      </article>`).join("");
    document.querySelectorAll("#plGrid .reveal").forEach(MH.reveal);
    // Grid becomes 5 cards: let it wrap nicely
    $("#plGrid").style.gridTemplateColumns = "";

    const range = $("#hydRange"), stack = $("#stack");
    const price = i => 100 + 150 * i;
    let prev = 0;
    function upd() {
      const n = +range.value;
      $("#hydN").textContent = n;
      const tot = Array.from({ length: n }, (_, i) => price(i)).reduce((a, b) => a + b, 0);
      tween($("#hydLast"), price(n - 1), fmt, 400); tween($("#hydTot"), tot, fmt, 500);
      if (n > prev) for (let i = prev; i < n; i++) { const s = document.createElement("div"); s.className = "srow"; s.innerHTML = `<span class="slab"></span><b>${fmt(price(i))}</b>`; s.style.setProperty("--dl", ((i - prev) * 70) + "ms"); stack.appendChild(s); }
      else while (stack.children.length > n) stack.lastElementChild.remove();
      prev = n;
    }
    range.addEventListener("input", upd);
    upd();
  })();

  /* ================= Shard Park & City ================= */
  (function park() {
    const P = misc["Shard Park"], C = misc["Shard City"];
    $("#parkItems").innerHTML = `
      <div class="pk"><div class="pic">${pic(P.img, 160, P.n)}</div><div><a class="nm" href="${ITEM(P.n)}">Shard Park</a><em class="R">Reborn</em><p>${esc(D.park.parkText)}</p></div></div>
      <div class="pk"><div class="pic">${pic(C.img, 160, C.n)}</div><div><a class="nm" href="${ITEM(C.n)}">Shard City</a><em class="E">Evolved</em><p>${esc(D.park.cityText)}</p></div></div>
      <p class="pk-q">"${esc(D.park.parkQuote)}"</p>`;
    const parkM = s => s <= 0 ? 1 : Math.min(10, 1 + 0.25 * s);
    const cityM = s => Math.min(16, s / 4);
    const svg = $("#pkChart"), range = $("#pkRange");
    const W = 520, H = 220, pd = { l: 34, r: 12, t: 12, b: 26 }, MAXS = 80;
    const X = s => pd.l + (s / MAXS) * (W - pd.l - pd.r), Y = m => H - pd.b - (m / 16) * (H - pd.t - pd.b);
    const line = f => Array.from({ length: MAXS + 1 }, (_, s) => `${X(s)},${Y(f(s))}`).join(" ");
    svg.innerHTML = [0, 4, 8, 12, 16].map(m => `<line class="gl" x1="${pd.l}" x2="${W - pd.r}" y1="${Y(m)}" y2="${Y(m)}"/><text class="lab" x="${pd.l - 6}" y="${Y(m) + 4}" text-anchor="end">${m}x</text>`).join("")
      + [0, 20, 36, 64, 80].map(s => `<text class="lab" x="${X(s)}" y="${H - 7}" text-anchor="middle">${s}</text>`).join("")
      + `<line x1="${pd.l}" x2="${W - pd.r}" y1="${Y(1)}" y2="${Y(1)}" stroke="rgba(255,93,115,.35)" stroke-dasharray="3 5"/>`
      + `<polyline class="ln p" points="${line(parkM)}"/><polyline class="ln c" points="${line(cityM)}"/>`
      + `<line class="cur" id="pkCur" y1="${pd.t}" y2="${H - pd.b}"/>`
      + `<circle id="pkDp" r="6.5" fill="#fff" stroke="#6aaeff" stroke-width="4"/><circle id="pkDc" r="6.5" fill="#fff" stroke="#7ce08a" stroke-width="4"/>`;
    const fx = m => (Number.isInteger(m) ? m : m.toFixed(2).replace(/0$/, "")) + "x";
    function upd() {
      const s = +range.value, p = parkM(s), c = cityM(s);
      $("#pkN").textContent = s;
      $("#pkPark").textContent = fx(p); $("#pkCity").textContent = fx(c);
      $("#pkCity").classList.toggle("bad", c < 1);
      $("#pkParkBar").style.width = (p / 10) * 100 + "%"; $("#pkCityBar").style.width = (c / 16) * 100 + "%";
      $("#pkCur").setAttribute("x1", X(s)); $("#pkCur").setAttribute("x2", X(s));
      $("#pkDp").setAttribute("cx", X(s)); $("#pkDp").setAttribute("cy", Y(p));
      $("#pkDc").setAttribute("cx", X(s)); $("#pkDc").setAttribute("cy", Y(c));
      $("#pkTip").innerHTML = s === 0 ? "<b>No shards:</b> Shard Park does nothing and Shard City wipes ore value to 0x."
        : c < 1 ? `<b>Below 4 shards</b> Shard City actually lowers your ore value. Shard Park is the better pick here.`
        : s < 36 ? `Shard Park maxes out at <b>36 shards</b>. ${36 - s} more to go.`
        : s < 64 ? `Shard Park is maxed. Shard City keeps climbing until <b>64 shards</b> (${64 - s} more).`
        : `Both are maxed: <b>10x</b> and <b>16x</b>. Extra shards won't add anything here.`;
    }
    range.addEventListener("input", upd);
    upd();
  })();

  /* ================= History & trivia ================= */
  $("#tl").innerHTML = `<span class="tfill"></span>` + D.history.map((h, i) => `
    <div class="ts2" style="--k:${i}"><span class="d"></span><time>${esc(h.date)}</time><h4>${esc(h.title)}</h4><p>${esc(h.text)}</p></div>`).join("");
  $("#trivia").innerHTML = D.trivia.map(t => `<li>${esc(t)}</li>`).join("");

  document.querySelectorAll("#sources .reveal, #uses .reveal").forEach(MH.reveal);

  /* Back to top */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }));
})();
