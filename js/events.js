/* =========================================================
   Events page
   Data: window.MH_EVENTS (js/events-data.js)
   ========================================================= */
(() => {
  const D = window.MH_EVENTS;
  const BASE = window.MH_IMG_BASE;
  const ICON = "../assets/icons/";
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (p, size = 80) => p ? `${BASE}${p}/revision/latest/scale-to-width-down/${size}` : null;
  const ITEM_LINK = n => "item-index.html#item=" + encodeURIComponent(n);
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const plural = (n, w) => `${n.toLocaleString("en-US")} ${w}${n === 1 ? "" : "s"}`;
  const S = Object.fromEntries(D.series.map(s => [s.k, s]));
  const EV = D.events;
  const TIER = D.tiers;

  const countBy = k => EV.filter(e => e.kind === k).length;
  const itemsBy = k => new Set(EV.filter(e => e.kind === k).flatMap(e => e.items.map(i => i[0]))).size;
  const years = EV.map(e => e.year);
  const minY = Math.min(...years), maxY = Math.max(...years);

  /* ---------- Hero ---------- */
  const firstEv = [...EV].reverse().find(e => e.kind === "halloween");
  $("#lede").innerHTML = `Miner's Haven has held <b>${EV.length} events</b> since ${minY}, starting with the ${esc(firstEv.year)} Spooky Update. Each one brings limited items you can only get while it's on.`;
  setTimeout(() => {
    MH.countUp($("#stEvents"), EV.length);
    MH.countUp($("#stItems"), D.itemCount);
    MH.countUp($("#stSeries"), D.series.length);
    MH.countUp($("#stYears"), maxY - minY + 1);
  }, 500);

  /* ---------- Season wheel ---------- */
  const ANCHOR = { valentines: 1.95, stpatricks: 2.85, spring: 3.75, easter: 4.65, birthday: 5.9, summer: 7, halloween: 10, blackfriday: 11, winter: 12.1 };
  const wheel = $("#wheel");
  const R = () => parseFloat(getComputedStyle(wheel).getPropertyValue("--R")) || 190;
  $("#wMonths").innerHTML = MONTHS.map((m, i) => `<span style="--a:${(i + .5) * 30}deg" data-m="${i + 1}">${m.slice(0, 3)}</span>`).join("");
  const now = new Date();
  const month = now.getMonth() + 1;
  const dim = new Date(now.getFullYear(), month, 0).getDate();
  const handA = ((month - 1) + (now.getDate() - 1) / dim) * 30;
  $("#wHand").style.setProperty("--a", handA + "deg");
  $(`#wMonths span[data-m="${month}"]`).classList.add("now");

  const cur = D.series.filter(s => s.months.includes(month));
  let next = null, nextMonth = null;
  for (let d = 1; d <= 12 && !next; d++) {
    const m = (month + d - 1) % 12 + 1;
    const hit = D.series.find(s => ANCHOR[s.k] && s.months.includes(m) && !cur.includes(s));
    if (hit) { next = hit; nextMonth = m; }
  }
  function placeIcons() {
    const r = R() * .68;
    $("#wIcons").innerHTML = Object.entries(ANCHOR).map(([k, m], i) => {
      const s = S[k];
      return `<button class="w-ico ${cur.includes(s) ? "now" : ""}" data-k="${k}" style="--a:${(m - .5) * 30}deg;--r:${r}px;--c:${s.color};--i:${i};--dl:${-i * .45}s" aria-label="${esc(s.name)}"><img src="${ICON + s.icon}" alt="" /><span class="tip">${esc(s.name)}</span></button>`;
    }).join("");
  }
  placeIcons();
  let lastR = R();
  window.addEventListener("resize", () => { if (R() !== lastR) { lastR = R(); placeIcons(); wheel.classList.add("ready"); } });
  $("#wCore").innerHTML = `<small>${MONTHS[month - 1]}</small>
    <b>${cur.length ? esc(cur.map(s => s.name.replace(" & New Year", "")).join(" + ")) : "Quiet month"}</b>
    ${next ? `<span class="nx"><img src="${ICON + next.icon}" alt="" /><span>Next up: <em>${esc(next.name.replace(" & New Year", ""))}</em><br />in ${MONTHS[nextMonth - 1]}</span></span>` : ""}`;
  requestAnimationFrame(() => setTimeout(() => wheel.classList.add("ready"), 250));
  $("#wIcons").addEventListener("click", e => { const b = e.target.closest(".w-ico"); if (b) pickSeries(b.dataset.k, true); });

  /* ---------- Series cards ---------- */
  const span = maxY - minY + 1;
  $("#seriesGrid").innerHTML = D.series.map((s, i) => {
    const ys = new Set(EV.filter(e => e.kind === s.k).map(e => e.year));
    const when = s.months.length ? s.months.map(m => MONTHS[m - 1].slice(0, 3)).join(" · ") : "Any time";
    return `<button class="sc glass reveal" data-k="${s.k}" style="--c:${s.color};--dl:${-i * .5}s">
      <div class="sc-top"><img src="${ICON + s.icon}" alt="" /><span class="sc-when">${when}</span></div>
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.desc)}</p>
      <div class="sc-stats"><span><b>${countBy(s.k)}</b>${countBy(s.k) === 1 ? "event" : "events"}</span><span><b>${itemsBy(s.k)}</b>event items</span></div>
      <div class="sc-years" style="--n:${span}" title="Years it ran">${Array.from({ length: span }, (_, j) => `<i class="${ys.has(minY + j) ? "on" : ""}" style="--j:${j}" title="${minY + j}"></i>`).join("")}</div>
      <div class="sc-yl"><span>${minY}</span><span>${maxY}</span></div>
      <span class="sc-go">See every year <i>→</i></span>
    </button>`;
  }).join("");
  document.querySelectorAll("#seriesGrid .reveal").forEach(MH.reveal);
  $("#seriesGrid").addEventListener("click", e => { const c = e.target.closest(".sc"); if (c) pickSeries(c.dataset.k, true); });

  /* ---------- Timeline ---------- */
  const state = { k: "all", q: "", old: false, open: new Set() };
  const chips = $("#chips");
  chips.innerHTML = `<button class="chip-ev on" data-k="all"><span>All</span><em>${EV.length}</em></button>` +
    D.series.map(s => `<button class="chip-ev" data-k="${s.k}" style="--c:${s.color}"><img src="${ICON + s.icon}" alt="" /><span>${esc(s.name)}</span><em>${countBy(s.k)}</em></button>`).join("");
  chips.addEventListener("click", e => { const b = e.target.closest(".chip-ev"); if (b) pickSeries(b.dataset.k, false); });

  function pickSeries(k, scroll) {
    state.k = k;
    chips.querySelectorAll(".chip-ev").forEach(b => b.classList.toggle("on", b.dataset.k === k));
    render();
    if (scroll) $("#history").scrollIntoView({ behavior: MH.reduceMotion ? "auto" : "smooth" });
    history.replaceState(null, "", k === "all" ? location.pathname : "#" + k);
  }

  const term = () => state.q.trim().toLowerCase();
  const hl = s => {
    const t = term(), e = esc(s);
    if (!t) return e;
    const re = new RegExp("(" + esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
    return e.replace(re, "<mark>$1</mark>");
  };
  const SHOW = 12;
  function itemsHTML(e) {
    const t = term();
    let list = e.items;
    const open = state.open.has(e.id) || (t && list.some(i => i[0].toLowerCase().includes(t)));
    const shown = open ? list : list.slice(0, SHOW);
    let h = shown.map(([n, p, tier], k) => {
      const c = TIER[tier] || "#ccb490";
      const src = img(p, 80);
      const match = t && n.toLowerCase().includes(t);
      return `<a class="it" href="${ITEM_LINK(n)}" style="--t:${c};--k:${k}${match ? ";box-shadow:0 0 0 2px #ffd60a" : ""}" aria-label="${esc(n)}">
        ${src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>${esc(n[0])}</span>'" />` : `<span class="ph">${esc(n[0])}</span>`}
        <span class="nm">${esc(n)}<small>${esc(tier)}</small></span></a>`;
    }).join("");
    if (list.length > SHOW) h += `<button class="it-more" data-id="${e.id}">${open ? "Show fewer" : `+${list.length - SHOW} more`}</button>`;
    return h;
  }
  function evHTML(e) {
    const s = S[e.kind];
    const date = e.dateLabel || e.year;
    return `<article class="ev glass reveal" id="ev-${e.id}" style="--c:${s.color}">
      <span class="ev-dot"></span>
      <div class="ev-top">
        <div class="ev-ico"><img src="${ICON + s.icon}" alt="" /></div>
        <div class="ev-title">
          <h4>${hl(e.name)}</h4>
          <div class="ev-meta"><span class="ev-kind">${esc(s.name)}</span><span>${esc(date)}</span>${e.items.length ? `<span>${plural(e.items.length, "event item")}</span>` : ""}</div>
        </div>
      </div>
      ${e.summary ? `<p class="ev-sum">${hl(e.summary)}</p>` : `<p class="ev-sum none">The wiki doesn't have details for this one yet.</p>`}
      ${e.items.length ? `<div class="ev-items" data-id="${e.id}">${itemsHTML(e)}</div>` : ""}
      <div class="ev-foot">${e.empty ? "" : `<a href="update-log.html#${encodeURIComponent(e.id)}">Read the patch notes <i>→</i></a>`}</div>
    </article>`;
  }
  function render() {
    const t = term();
    let list = EV.filter(e => (state.k === "all" || e.kind === state.k) &&
      (!t || (e.name + " " + e.summary + " " + S[e.kind].name).toLowerCase().includes(t) || e.items.some(i => i[0].toLowerCase().includes(t))));
    if (state.old) list = [...list].reverse();
    const groups = [];
    list.forEach(e => { let g = groups[groups.length - 1]; if (!g || g.y !== e.year) groups.push(g = { y: e.year, items: [] }); g.items.push(e); });
    $("#evList").innerHTML = groups.map(g => `<div class="ev-year"><h3>${g.y}</h3><span>${plural(g.items.length, "event")}</span></div>${g.items.map(evHTML).join("")}`).join("");
    $("#evList").querySelectorAll(".reveal").forEach(MH.reveal);
    $("#empty").hidden = list.length > 0;
    $("#timeline").hidden = !list.length;
    const label = state.k === "all" ? "events" : `${S[state.k].name} events`;
    $("#count").innerHTML = `Showing <b>${list.length}</b> ${esc(label)}${t ? ` matching “${esc(state.q.trim())}”` : ""}`;
    updateRail();
  }
  $("#evList").addEventListener("click", e => {
    const b = e.target.closest(".it-more"); if (!b) return;
    const id = b.dataset.id;
    state.open.has(id) ? state.open.delete(id) : state.open.add(id);
    const ev = EV.find(x => x.id === id);
    const box = b.closest(".ev-items");
    box.innerHTML = itemsHTML(ev);
    if (!state.open.has(id)) box.closest(".ev").scrollIntoView({ block: "nearest", behavior: MH.reduceMotion ? "auto" : "smooth" });
  });
  let qt;
  $("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value; render(); }, 140); });
  $("#sort").addEventListener("click", () => {
    state.old = !state.old;
    $("#sort").classList.toggle("old", state.old);
    $("#sort span").textContent = state.old ? "Oldest first" : "Newest first";
    render();
  });
  $("#clear").addEventListener("click", () => { $("#q").value = ""; state.q = ""; pickSeries("all", false); });

  /* Rail fill follows scroll */
  const fill = $("#railFill");
  function updateRail() {
    const tl = $("#timeline");
    const r = tl.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * .6 - r.top) / r.height));
    fill.style.setProperty("--p", p);
  }
  window.addEventListener("scroll", updateRail, { passive: true });

  const h = location.hash.slice(1);
  if (S[h]) { state.k = h; chips.querySelectorAll(".chip-ev").forEach(b => b.classList.toggle("on", b.dataset.k === h)); }
  render();
  if (S[h]) setTimeout(() => $("#history").scrollIntoView(), 300);

  /* ---------- Back to top ---------- */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));
})();
