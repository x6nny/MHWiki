/* =========================================================
   Crafting page: Enchanted (The Craftsman) + Superstitious (Draedon)
   Data: window.MH_CRAFT (data/Crafting.json)
   ========================================================= */
(() => {
  const C = window.MH_CRAFT;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (p, size = 120) => p ? MH_SRC(p) : "";
  const pic = (p, size, name) => p
    ? `<img src="${esc(img(p, size))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>${esc((name || "?")[0])}</span>'" />`
    : `<span class="ph">${esc((name || "?")[0])}</span>`;
  const ITEM = n => "item-index.html#item=" + encodeURIComponent(n);
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const RM = MH.reduceMotion;
  const EL = C.elements;
  const tierCol = t => (C.tiers[t] || ["#666", "#fff"]);
  const lifeTxt = l => !l ? "" : /^\d[\d,]*$/.test(l) ? l + "+" : l;
  const lifeN = l => { if (!l) return 0; const n = +String(l).replace(/[^\d]/g, "") || 0; return /^s/i.test(l) ? 100000 + n : n; };
  const norm = s => s.toLowerCase().normalize("NFKD").replace(/[^\w ]/g, "");
  const hit = (q, ...xs) => !q || xs.some(x => norm(x).includes(q));
  const pool = Object.fromEntries(C.pool.map(p => [p.n, p]));
  const tierDot = t => { const [a, b] = tierCol(t); return `<i class="td" style="--a:${a};--b:${b}" title="${esc(t)}"></i>`; };
  const elIcon = (e, s = 40) => `<img class="eli" src="${esc(img(e.img, s))}" alt="${e.k}" title="${e.k}" referrerpolicy="no-referrer" onerror="this.outerHTML='<i class=eld style=--c:${e.c}></i>'" />`;
  const recTotal = r => r.items.reduce((a, [, c]) => a + c, 0);
  const sumEl = list => EL.map((_, j) => list.reduce((a, [n, c]) => a + pool[n].el[j] * c, 0));

  function tween(el, to, f = fmt, dur = 450) {
    const from = +el.dataset.v || 0; el.dataset.v = to;
    if (RM || from === to) { el.textContent = f(to); return; }
    const t0 = performance.now(); cancelAnimationFrame(el._r);
    (function s(now) { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = f(from + (to - from) * e); if (p < 1) el._r = requestAnimationFrame(s); })(t0);
  }

  /* ================= Hero ================= */
  setTimeout(() => {
    MH.countUp($("#stEn"), C.ench.length, 900);
    MH.countUp($("#stSu"), C.sup.length, 1100);
    MH.countUp($("#stPool"), C.pool.length, 1400);
  }, 300);

  (function orb() {
    const els = $("#orbEls");
    els.innerHTML = EL.map((e, i) => `<span class="oe" style="--i:${i};--c:${e.c}">${elIcon(e, 60)}</span>`).join("");
    const list = [...C.sup.map(s => ({ n: s.n, img: s.img, k: "su" })), ...C.ench.map(e => ({ n: e.n, img: e.img, k: "en" }))]
      .sort(() => Math.random() - .5);
    let i = 0;
    const im = $("#orbImg"), nm = $("#orbName"), core = $("#orb");
    function show() {
      const it = list[i++ % list.length];
      core.classList.remove("swap"); void core.offsetWidth; core.classList.add("swap");
      core.dataset.k = it.k;
      im.src = img(it.img, 220);
      im.onerror = () => { im.removeAttribute("src"); };
      nm.innerHTML = `<b>${esc(it.n)}</b><small>${it.k === "su" ? "Superstitious" : "Enchanted"}</small>`;
    }
    show();
    if (!RM) setInterval(show, 3600);
    core.addEventListener("click", show);
  })();

  /* ================= Enchanted ================= */
  const picked = new Set();
  (function ench() {
    const grid = $("#enGrid"), q = $("#enQ"), sortEl = $("#enSort");
    const SHOW = 5;
    const data = C.ench.map(e => ({ ...e, count: e.reqs.reduce((a, r) => a + r.x, 0), ln: lifeN(e.life) }));
    grid.innerHTML = data.map((e, k) => {
      const rows = e.reqs.map((r, i) => `<a class="ing${i >= SHOW ? " extra" : ""}" href="${ITEM(r.n)}">
          <span class="ing-pic">${pic(r.img, 60, r.n)}</span>
          <span class="ing-n">${esc(r.n)}<small>${tierDot(r.t)}${esc(r.t)}</small></span>
          <em>×${fmt(r.x)}</em></a>`).join("")
        + e.other.map(o => `<div class="ing tx extra"><span class="ing-n">${esc(o)}</span></div>`).join("");
      const hidden = Math.max(0, e.reqs.length - SHOW) + e.other.length;
      return `<article class="rc en glass reveal" data-k="${k}">
        <div class="rc-top">
          <a class="rc-pic" href="${ITEM(e.n)}">${pic(e.img, 160, e.n)}</a>
          <div class="rc-id"><a class="rc-nm" href="${ITEM(e.n)}">${esc(e.n)}</a>
            <div class="rc-tags"><span class="tier-tag" style="--a:${tierCol("Enchanted")[0]};--b:${tierCol("Enchanted")[1]}">Enchanted</span><span>${esc(e.type || "Item")}</span>${e.life ? `<span class="lf">Life ${esc(lifeTxt(e.life))}</span>` : ""}</div></div>
          <button class="rc-add" type="button" aria-pressed="false" title="Add to crafting list"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>
        </div>
        <p class="rc-eff">${esc(e.eff)}</p>
        <div class="rc-sum"><span>${fmt(e.count)} item${e.count === 1 ? "" : "s"} · ${e.reqs.length} kind${e.reqs.length === 1 ? "" : "s"}</span><b class="cost">${fmt(e.shards)} Shards of Life</b></div>
        <div class="ing-list">${rows}</div>
        ${hidden ? `<button class="rc-more" type="button">+ ${hidden} more</button>` : ""}
      </article>`;
    }).join("");
    grid.querySelectorAll(".reveal").forEach(MH.reveal);
    const cards = [...grid.children];

    function draw() {
      const s = norm(q.value.trim()), how = sortEl.value;
      const order = data.map((e, k) => k).sort((a, b) => {
        const A = data[a], B = data[b];
        return how === "shards" ? A.shards - B.shards || A.n.localeCompare(B.n)
          : how === "shards-d" ? B.shards - A.shards || A.n.localeCompare(B.n)
          : how === "life" ? A.ln - B.ln || A.shards - B.shards
          : how === "items" ? A.count - B.count
          : A.n.localeCompare(B.n);
      });
      let n = 0;
      order.forEach(k => {
        const e = data[k], ok = hit(s, e.n, e.type || "", e.eff, ...e.reqs.map(r => r.n), ...e.other);
        cards[k].hidden = !ok; if (ok) n++;
        grid.appendChild(cards[k]);
      });
      $("#enCount").textContent = s ? `${n} of ${data.length} recipes` : `${data.length} recipes`;
    }
    q.addEventListener("input", draw);
    sortEl.addEventListener("change", draw);
    draw();

    grid.addEventListener("click", ev => {
      const more = ev.target.closest(".rc-more");
      if (more) {
        const c = more.closest(".rc"), open = c.classList.toggle("open");
        more.textContent = open ? "Show less" : `+ ${c.querySelectorAll(".ing.extra").length} more`;
        return;
      }
      const add = ev.target.closest(".rc-add");
      if (add) {
        const c = add.closest(".rc"), k = +c.dataset.k;
        picked.has(k) ? picked.delete(k) : picked.add(k);
        const on = picked.has(k);
        c.classList.toggle("picked", on); add.setAttribute("aria-pressed", on);
        add.classList.remove("pop"); void add.offsetWidth; add.classList.add("pop");
        MH.toast(on ? `Added ${data[k].n} to your list` : `Removed ${data[k].n}`);
        list();
      }
    });

    // Shopping list
    const box = $("#enList");
    function totals() {
      const items = new Map(); let shards = 0; const other = [];
      picked.forEach(k => {
        const e = data[k]; shards += e.shards; other.push(...e.other);
        e.reqs.forEach(r => { const m = items.get(r.n) || { ...r, x: 0, for: [] }; m.x += r.x; m.for.push(e.n); items.set(r.n, m); });
      });
      return { items: [...items.values()].sort((a, b) => b.x - a.x || a.n.localeCompare(b.n)), shards, other };
    }
    function list() {
      box.hidden = !picked.size;
      if (!picked.size) return;
      const t = totals(), names = [...picked].map(k => data[k].n);
      $("#clSub").innerHTML = `${names.length} recipe${names.length > 1 ? "s" : ""}: ${names.map(esc).join(", ")}`;
      $("#clBody").innerHTML = `<div class="cl-shards"><small>Total shards</small><b class="cost">${fmt(t.shards)} Shards of Life</b></div>`
        + t.items.map(r => `<a class="ing" href="${ITEM(r.n)}" title="For ${esc(r.for.join(", "))}"><span class="ing-pic">${pic(r.img, 60, r.n)}</span><span class="ing-n">${esc(r.n)}<small>${tierDot(r.t)}${esc(r.t)}${r.for.length > 1 ? ` · ${r.for.length} recipes` : ""}</small></span><em>×${fmt(r.x)}</em></a>`).join("")
        + t.other.map(o => `<div class="ing tx"><span class="ing-n">${esc(o)}</span></div>`).join("");
    }
    $("#clTog").addEventListener("click", () => {
      const min = box.classList.toggle("min");
      $("#clTog").setAttribute("aria-expanded", !min); $("#clTog").setAttribute("aria-label", min ? "Expand list" : "Collapse list");
    });
    if (matchMedia("(max-width: 680px)").matches) box.classList.add("min"), $("#clTog").setAttribute("aria-expanded", "false");
    $("#clClear").addEventListener("click", () => {
      picked.clear();
      cards.forEach(c => { c.classList.remove("picked"); c.querySelector(".rc-add").setAttribute("aria-pressed", "false"); });
      list();
    });
    $("#clCopy").addEventListener("click", () => {
      const t = totals();
      const txt = [`Crafting list (${[...picked].map(k => data[k].n).join(", ")})`, `${fmt(t.shards)} Shards of Life`, ...t.items.map(r => `${r.x}x ${r.n}`), ...t.other].join("\n");
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => MH.toast("Copied your crafting list"), () => MH.toast("Couldn't copy, select the list instead"));
    });
  })();

  /* ================= Superstitious ================= */
  let fg; // forge planner API, set below
  (function sup() {
    const grid = $("#suGrid"), q = $("#suQ"), sortEl = $("#suSort");
    const wikiN = C.sup.reduce((a, s) => a + s.recipes.filter(r => r.src === "wiki").length, 0);
    $("#suNote").innerHTML = `Element targets and every Reborn item's elements come from the wiki. The <b>Fewest items</b> and <b>Common Reborns</b> recipes are worked out from those numbers (common = rarity 10 or higher). Wiki recipes are only listed when they still add up (${wikiN} do). Shiny items count towards Catalysts but can't be fed to Draedon.`;
    const data = C.sup.map(s => ({ ...s, ln: lifeN(s.life), best: Math.min(...s.recipes.map(recTotal)) }));

    const meters = s => `<div class="els">${EL.map((e, j) => {
      const v = s.el[j], mx = Math.max(...s.el.map(Math.abs)) || 1;
      return `<div class="el${v === 0 ? " zero" : ""}${v < 0 ? " neg" : ""}" style="--c:${e.c};--p:${Math.abs(v) / mx * 100}%">${elIcon(e)}<span class="el-k">${e.k}</span><span class="el-bar"><i></i></span><b>${v === 0 ? "any" : fmt(v)}</b></div>`;
    }).join("")}</div>`;
    const recHTML = (r, show) => `<div class="rec${show ? " on" : ""}">${r.items.map(([n, c]) => {
      const p = pool[n];
      return `<a class="ing sm" href="${ITEM(n)}"><span class="ing-pic">${pic(p.img, 50, n)}</span><span class="ing-n">${esc(n)}<small>${tierDot(p.t)}${p.r ? `Rarity ${p.r}` : esc(p.t)}</small></span><em>×${c}</em></a>`;
    }).join("")}</div>`;

    grid.innerHTML = data.map((s, k) => `<article class="rc su glass reveal" data-k="${k}">
        <div class="rc-top">
          <a class="rc-pic" href="${ITEM(s.n)}">${pic(s.img, 160, s.n)}</a>
          <div class="rc-id"><a class="rc-nm" href="${ITEM(s.n)}">${esc(s.n)}</a>
            <div class="rc-tags"><span class="tier-tag" style="--a:${tierCol("Superstitious")[0]};--b:${tierCol("Superstitious")[1]}">Superstitious</span><span>${esc(s.type || "Item")}</span>${s.life ? `<span class="lf">Life ${esc(lifeTxt(s.life))}</span>` : ""}</div></div>
          <button class="rc-forge" type="button" title="Open in the forge planner"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M13 3L4 14h7l-1 7 9-11h-7z" fill="currentColor"/></svg></button>
        </div>
        <p class="rc-eff">${esc(s.eff || s.quote)}</p>
        ${s.cat ? `<div class="cat">
          <a class="cat-main" href="${ITEM(s.cat.n)}"><span class="cat-pic">${pic(s.cat.img, 80, s.cat.n)}</span><span><small>Step 1 · Catalyst</small><b>${esc(s.cat.n)}</b></span></a>
          <div class="cat-items">${s.cat.items.map(r => `<a class="ci" href="${ITEM(r.n)}" title="${esc(r.n)} (${esc(r.t)})" style="--a:${tierCol(r.t)[0]}">${pic(r.img, 60, r.n)}<span>${esc(r.n)}</span></a>`).join("")}</div>
          <p class="cat-tip">Place all six, then rebirth. About a 1 in 3 chance each time.</p>
        </div>` : ""}
        <div class="rc-sub"><small>Step 2 · Elements to reach</small></div>
        ${meters(s)}
        <div class="rc-sub"><small>Step 3 · Reborn items to add</small>
          <div class="rec-tabs" role="tablist">${s.recipes.map((r, i) => `<button type="button" class="${i ? "" : "on"}" data-i="${i}">${esc(r.label.replace("Wiki recipe ", "Wiki #"))}<em>${recTotal(r)}</em></button>`).join("")}</div>
        </div>
        <div class="recs">${s.recipes.map((r, i) => recHTML(r, !i)).join("")}</div>
      </article>`).join("");
    grid.querySelectorAll(".reveal").forEach(MH.reveal);
    const cards = [...grid.children];

    function draw() {
      const s = norm(q.value.trim()), how = sortEl.value;
      const order = data.map((x, k) => k).sort((a, b) => {
        const A = data[a], B = data[b];
        return how === "life" ? A.ln - B.ln || A.best - B.best : how === "total" ? A.best - B.best : A.n.localeCompare(B.n);
      });
      let n = 0;
      order.forEach(k => {
        const x = data[k];
        const ok = hit(s, x.n, x.type || "", x.eff, x.cat ? x.cat.n : "", ...(x.cat ? x.cat.items.map(i => i.n) : []), ...x.recipes.flatMap(r => r.items.map(i => i[0])));
        cards[k].hidden = !ok; if (ok) n++;
        grid.appendChild(cards[k]);
      });
      $("#suCount").textContent = s ? `${n} of ${data.length} items` : `${data.length} items`;
    }
    q.addEventListener("input", draw);
    sortEl.addEventListener("change", draw);
    draw();

    grid.addEventListener("click", ev => {
      const tab = ev.target.closest(".rec-tabs button");
      if (tab) {
        const c = tab.closest(".rc"), i = +tab.dataset.i;
        c.querySelectorAll(".rec-tabs button").forEach(b => b.classList.toggle("on", b === tab));
        c.querySelectorAll(".rec").forEach((r, j) => r.classList.toggle("on", j === i));
        return;
      }
      const f = ev.target.closest(".rc-forge");
      if (f) {
        const c = f.closest(".rc"), x = data[+c.dataset.k];
        const ti = [...c.querySelectorAll(".rec-tabs button")].findIndex(b => b.classList.contains("on"));
        fg.load(x.n, x.recipes[Math.max(0, ti)]);
        $("#forge").scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
      }
    });
  })();

  /* ================= Forge planner ================= */
  (function forge() {
    const sel = $("#fgSel"), poolEl = $("#fgPool"), q = $("#fgQ"), elSel = $("#fgEl");
    const bag = new Map();
    let cur = C.sup[0], tier = "Reborn", wasReady = false;
    const bySup = Object.fromEntries(C.sup.map(s => [s.n, s]));
    sel.innerHTML = C.sup.map(s => `<option value="${esc(s.n)}">${esc(s.n)}</option>`).join("");
    elSel.innerHTML += EL.map((e, j) => `<option value="${j}">Most ${e.k}</option>`).join("");

    $("#fgMeters").innerHTML = EL.map((e, j) => `<div class="fm" data-j="${j}" style="--c:${e.c}">
        <div class="fm-h">${elIcon(e)}<span>${e.k}</span><b><span class="fm-v">0</span><small class="fm-t"></small></b></div>
        <div class="fm-bar"><i></i></div></div>`).join("");
    const mEls = [...$("#fgMeters").children];

    const elMini = p => `<span class="pm">${EL.map((e, j) => p.el[j] ? `<i style="--c:${e.c}" title="${e.k}">${p.el[j] > 0 ? "+" : ""}${p.el[j]}</i>` : "").join("")}</span>`;
    function drawPool() {
      const s = norm(q.value.trim()), j = elSel.value;
      let list = C.pool.filter(p => p.t === tier && hit(s, p.n));
      list.sort((a, b) => j === "" ? a.n.localeCompare(b.n) : b.el[j] - a.el[j] || a.n.localeCompare(b.n));
      poolEl.innerHTML = list.map(p => `<button type="button" class="pi${bag.get(p.n) ? " has" : ""}" data-n="${esc(p.n)}" title="${esc(p.n)}${p.r ? ` · rarity ${p.r}` : ""}${p.life ? ` · life ${esc(p.life)}` : ""}">
          <span class="pi-pic">${pic(p.img, 70, p.n)}<em class="pi-c">${bag.get(p.n) || ""}</em></span>
          <span class="pi-n">${esc(p.n)}</span>${elMini(p)}
          <span class="pi-minus" role="button" aria-label="Remove one">−</span></button>`).join("") || `<p class="fg-empty">No items match.</p>`;
    }
    function update(pulse) {
      const list = [...bag.entries()].filter(([, c]) => c > 0);
      const sum = sumEl(list), t = cur.el;
      let ready = list.length > 0;
      mEls.forEach((m, j) => {
        const need = t[j], v = sum[j], zero = need === 0, met = zero || v >= need;
        if (!met) ready = false;
        m.classList.toggle("zero", zero); m.classList.toggle("met", !zero && met); m.classList.toggle("low", v < 0);
        tween(m.querySelector(".fm-v"), v);
        m.querySelector(".fm-t").textContent = zero ? " · any" : ` / ${fmt(need)}`;
        const p = zero ? 0 : Math.max(0, Math.min(100, v / need * 100));
        m.querySelector(".fm-bar i").style.setProperty("--p", p + "%");
      });
      const total = list.reduce((a, [, c]) => a + c, 0);
      $("#fgTotal").textContent = `${fmt(total)} item${total === 1 ? "" : "s"}`;
      $("#fgUsed").innerHTML = list.length ? list.sort((a, b) => b[1] - a[1]).map(([n, c]) => `<button type="button" class="fu" data-n="${esc(n)}" title="Remove one ${esc(n)}">${pic(pool[n].img, 40, n)}<span>${esc(n)}</span><em>×${c}</em></button>`).join("") : `<p class="fg-empty">Nothing added yet. Pick items on the right, or fill a recipe.</p>`;
      const missing = t.map((need, j) => need !== 0 && sum[j] < need ? `${fmt(need - sum[j])} ${EL[j].k}` : "").filter(Boolean);
      const st = $("#fgState");
      st.classList.toggle("ready", ready);
      st.innerHTML = ready
        ? `<b>Ready to forge</b><span>Every element is at its target with ${fmt(total)} Reborn items.</span>`
        : list.length ? `<b>Still need</b><span>${missing.join(" · ")}</span>` : `<b>${esc(cur.n)}</b><span>Needs ${t.map((v, j) => v ? `${fmt(v)} ${EL[j].k}` : "").filter(Boolean).join(" · ")}</span>`;
      const fgBox = $("#fg");
      if (ready && !wasReady && pulse) { fgBox.classList.remove("forged"); void fgBox.offsetWidth; fgBox.classList.add("forged"); }
      wasReady = ready;
      poolEl.querySelectorAll(".pi").forEach(b => { const c = bag.get(b.dataset.n) || 0; b.classList.toggle("has", c > 0); b.querySelector(".pi-c").textContent = c || ""; });
    }
    function setTarget(n) {
      cur = bySup[n]; sel.value = n;
      $("#fgPic").innerHTML = `<a href="${ITEM(cur.n)}">${pic(cur.img, 200, cur.n)}</a>`;
      wasReady = false;
    }
    function fill(r) {
      bag.clear();
      if (r) r.items.forEach(([n, c]) => bag.set(n, c));
      const tiers = new Set(r ? r.items.map(([n]) => pool[n].t) : []);
      if (r && !tiers.has(tier)) { tier = [...tiers][0]; $("#fgTier").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.t === tier)); drawPool(); }
      update(true);
    }
    function add(n, d) {
      const c = Math.max(0, (bag.get(n) || 0) + d);
      c ? bag.set(n, c) : bag.delete(n);
      update(true);
    }

    sel.addEventListener("change", () => { setTarget(sel.value); update(true); });
    q.addEventListener("input", drawPool);
    elSel.addEventListener("change", drawPool);
    $("#fgTier").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; tier = b.dataset.t; $("#fgTier").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); drawPool(); });
    poolEl.addEventListener("click", e => {
      const b = e.target.closest(".pi"); if (!b) return;
      const minus = e.target.closest(".pi-minus");
      add(b.dataset.n, minus ? -1 : e.shiftKey ? 5 : 1);
      if (!minus) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
    });
    poolEl.addEventListener("contextmenu", e => { const b = e.target.closest(".pi"); if (!b) return; e.preventDefault(); add(b.dataset.n, -1); });
    $("#fgUsed").addEventListener("click", e => { const b = e.target.closest(".fu"); if (b) add(b.dataset.n, -1); });
    $("#fgAuto").addEventListener("click", () => fill(cur.recipes.find(r => r.label === "Fewest items")));
    $("#fgCommon").addEventListener("click", () => fill(cur.recipes.find(r => r.label === "Common Reborns") || cur.recipes[0]));
    $("#fgClear").addEventListener("click", () => fill(null));

    fg = { load(n, r) { setTarget(n); fill(r); } };
    const h = decodeURIComponent(location.hash.slice(1));
    setTarget(bySup[h] ? h : C.sup[0].n);
    drawPool(); update(false);
    if (bySup[h]) setTimeout(() => $("#forge").scrollIntoView(), 50);
  })();

  /* Back to top */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }));
})();
