/* =========================================================
   NPCs page
   Data: window.MH_NPCS (js/npc-data.js)
   ========================================================= */
(() => {
  const D = window.MH_NPCS;
  const ALL = D.npcs;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const IMG = n => `../assets/npcs/${n.img}`;
  const byId = Object.fromEntries(ALL.map(n => [n.id, n]));
  const GROUPS = {
    map: { label: "On the map", color: "#38d9ff" },
    event: { label: "Event visitors", color: "#ff8a3d" },
    guard: { label: "Guardians", color: "#34f5a4" },
    other: { label: "Lore & others", color: "#b18cff" },
  };
  const ST_COLOR = { Active: "#34f5a4", Alive: "#34f5a4", Seasonal: "#ffd166", Inactive: "#9aa6c4", Retired: "#9aa6c4", Deceased: "#ff5d73", Banished: "#b18cff", Upcoming: "#7ad7ff", Unreleased: "#7ad7ff" };
  const GONE = new Set(["Inactive", "Retired", "Deceased", "Banished"]);
  const count = g => ALL.filter(n => n.g === g).length;

  /* ---------- Hero ---------- */
  $("#lede").textContent = D.intro + " Here's everyone, from The Masked Man and his daily deals to the gods of the Void and Thunder.";
  setTimeout(() => {
    MH.countUp($("#stAll"), ALL.length);
    MH.countUp($("#stMap"), count("map"));
    MH.countUp($("#stEvent"), count("event"));
    MH.countUp($("#stGuard"), count("guard"));
  }, 500);
  const carIds = ["the-masked-man", "the-craftsman", "spook-mcdooks", "draedon", "daegel", "fargield", "john-doe", "headless-baron", "pirate-santa", "the-leprechaun", "jak-uhfdor", "zalgo"];
  $("#carousel").innerHTML = carIds.map((id, i) => {
    const n = byId[id];
    return `<button class="car-card" data-id="${id}" style="--a:${i * 360 / carIds.length}deg;--c:${GROUPS[n.g].color}" aria-label="${esc(n.name)}"><img src="${IMG(n)}" alt="" /><span>${esc(n.name)}</span></button>`;
  }).join("");
  $("#carousel").addEventListener("click", e => { const b = e.target.closest(".car-card"); if (b) open(b.dataset.id, ALL); });

  /* ---------- Schedule ---------- */
  function fmtLeft(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    return (d ? `${d}<small>d</small>` : "") + `${h}<small>h</small>${String(m).padStart(2, "0")}<small>m</small>${d ? "" : String(sec).padStart(2, "0") + "<small>s</small>"}`;
  }
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function nextSeason(now) {
    const m = now.getUTCMonth() + 1;
    const entries = Object.entries(D.seasons);
    const cur = entries.find(([, ms]) => ms.includes(m));
    for (let k = 1; k <= 12; k++) {
      const mm = (m - 1 + k) % 12 + 1;
      const hit = entries.find(([s, ms]) => ms[0] === mm && (!cur || s !== cur[0]));
      if (hit) return { cur: cur && cur[0], next: hit[0], month: mm };
    }
  }
  const seasonOf = n => n.g === "event" ? n.where.replace("Valentine's Day", "Valentines") : n.id === "trick-or-treaters" ? "Halloween" : null;
  function schedule() {
    const now = new Date();
    const card = (ids, title, here, cd, text, pct, c) => `<button class="sc glass ${here ? "here" : "away"}" data-id="${ids[0]}" style="--c:${c}">
      <div class="sc-top"><span class="faces">${ids.map(id => `<img src="${IMG(byId[id])}" alt="" />`).join("")}</span><div><h3>${title}</h3><span class="st"><i></i>${here ? (ids[0] === "john-doe" ? "Open now" : "Here now") : "Away"}</span></div></div>
      ${cd ? `<div class="cd" data-cd>${cd}</div>` : ""}
      <p>${text}</p>
      ${pct != null ? `<div class="bar"><i style="--w:${Math.round(Math.min(1, Math.max(0, pct)) * 100)}%"></i></div>` : ""}
    </button>`;
    const s = nextSeason(now), dr = MH.dailyReset();
    const curIds = s.cur ? ALL.filter(n => seasonOf(n) === s.cur).map(n => n.id).slice(0, 3) : [];
    const nextIds = ALL.filter(n => seasonOf(n) === s.next).map(n => n.id).slice(0, 3);
    $("#sched").innerHTML =
      card(["the-masked-man"], "The Masked Man", true, fmtLeft(dr.left),
        `Always here with his whole stock of Contraband items. A few items are discounted each day, and the discounts change at the daily reset (${dr.local} your time). Bigger discounts on weekends.`, 1 - dr.left / (dr.next - dr.prev), "#ff6b9a") +
      card(["john-doe"], "John Doe's Coliseum", true, "",
        "Always open. Take on the zombie survival gauntlet whenever you like for rewards.", null, "#ffb347") +
      card(["fargield", "spook-mcdooks"], "Daily gifts", true, fmtLeft(dr.left),
        `Fargield and Spook McDooks each give you something free every day, and Spook McDooks hands out a free Mystery Box. Both reset at 12:00 AM UTC (${dr.local} your time).`, 1 - dr.left / (dr.next - dr.prev), "#34f5a4") +
      card(nextIds.length ? nextIds : curIds, `${esc(s.next)} visitors`, false, "",
        `${s.cur ? `${esc(s.cur)} visitors may still be around. ` : ""}Next up: ${esc(s.next)} characters, usually from ${MONTHS[s.month - 1]}.`, null, "#ff8a3d");
  }
  let schedKey = "";
  function tick() {
    const now = new Date(), dr = MH.dailyReset();
    const key = nextSeason(now).next + "|" + dr.key;
    if (key !== schedKey) { schedKey = key; schedule(); return; }
    document.querySelectorAll("#sched [data-cd]").forEach(el => { el.innerHTML = fmtLeft(dr.left); });
    document.querySelectorAll("#sched .bar i").forEach(el => el.style.setProperty("--w", Math.round(Math.min(1, Math.max(0, 1 - dr.left / (dr.next - dr.prev))) * 100) + "%"));
  }
  tick();
  setInterval(() => { if (!document.hidden) tick(); }, 1000);
  $("#sched").addEventListener("click", e => { const b = e.target.closest(".sc"); if (b) open(b.dataset.id, ALL); });

  /* ---------- Cast ---------- */
  $("#castIntro").textContent = "Hover a character to hear what they say, or click one for the full story. " + D.guardIntro;
  const state = { g: "all", q: "" };
  const tabs = $("#tabs"), ind = tabs.querySelector(".seg-ind");
  tabs.insertAdjacentHTML("beforeend", `<button data-g="all" class="active">Everyone<em>${ALL.length}</em></button>` +
    Object.entries(GROUPS).map(([g, v]) => `<button data-g="${g}">${v.label}<em>${count(g)}</em></button>`).join(""));
  function moveInd() {
    const b = tabs.querySelector("button.active");
    ind.style.width = b.offsetWidth + "px"; ind.style.transform = `translateX(${b.offsetLeft - 4}px)`;
    tabs.style.setProperty("--sc", state.g === "all" ? "linear-gradient(135deg,#7af5ff,#b18cff)" : GROUPS[state.g].color);
  }
  tabs.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    state.g = b.dataset.g; tabs.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    moveInd(); render();
  });
  window.addEventListener("resize", moveInd);
  const PIN = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.5" fill="currentColor"/></svg>`;
  const CAL = `<svg viewBox="0 0 24 24" width="14" height="14"><rect x="4" y="5" width="16" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10h16M9 3v4M15 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  let current = ALL;
  function card(n, i) {
    const loc = n.g === "map" && n.where ? `${PIN}${esc(n.where)}` : n.g === "event" ? `${CAL}${esc(n.where)}` : n.tier ? `${esc(n.tier)} item` : n.added ? `${CAL}Added ${esc(n.added)}` : "";
    return `<button class="npc glass ${n.g} ${GONE.has(n.status) ? "gone" : ""}" data-id="${n.id}" style="--i:${i}">
      <span class="portrait"><img src="${IMG(n)}" alt="" loading="lazy" />${n.quote ? `<span class="bubble">${esc(n.quote)}</span>` : ""}${n.status ? `<span class="chip-st" style="--sc:${ST_COLOR[n.status] || "#9aa6c4"}"><i></i>${esc(n.status)}</span>` : ""}</span>
      <h3>${esc(n.name)}</h3>
      <span class="role">${esc(n.role)}</span>
      ${loc ? `<span class="loc">${loc}</span>` : ""}
    </button>`;
  }
  let io;
  function render() {
    const t = state.q.trim().toLowerCase();
    const list = ALL.filter(n => (state.g === "all" || n.g === state.g) &&
      (!t || (n.name + " " + n.role + " " + n.where + " " + n.quote + " " + n.desc + " " + (n.tier || "")).toLowerCase().includes(t)));
    current = list;
    $("#count").innerHTML = `Showing <b>${list.length}</b> of ${ALL.length} characters`;
    $("#empty").hidden = list.length > 0;
    let html = "", i = 0;
    for (const [g, v] of Object.entries(GROUPS)) {
      const part = list.filter(n => n.g === g);
      if (!part.length) continue;
      if (state.g === "all") html += `<div class="np-group"><h3 style="color:${v.color}">${v.label}</h3><span>${part.length}</span><i></i></div>`;
      html += `<div class="np-grid-inner">${part.map(n => card(n, i++)).join("")}</div>`;
    }
    $("#grid").innerHTML = html;
    if (io) io.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -40px 0px" });
    $("#grid").querySelectorAll(".npc").forEach(x => io.observe(x));
  }
  let qt;
  $("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value; render(); }, 120); });
  $("#clear").addEventListener("click", () => { $("#q").value = ""; state.q = ""; render(); });
  $("#grid").addEventListener("click", e => { const b = e.target.closest(".npc"); if (b) open(b.dataset.id, current); });
  render();
  requestAnimationFrame(moveInd);
  document.fonts && document.fonts.ready.then(moveInd);

  /* ---------- Modal ---------- */
  const overlay = $("#overlay"), modal = $("#modal");
  let list = ALL, idx = 0, typer, lastFocus;
  function fill(dir = 0) {
    const n = list[idx];
    const G = GROUPS[n.g];
    modal.style.setProperty("--c", G.color);
    const facts = [
      n.status && ["Status", n.status],
      n.g === "map" && n.where && ["Where", n.where],
      n.g === "event" && n.where && ["Event", n.where],
      n.when && ["When", n.when],
      n.added && ["Added", n.added],
      n.tier && ["Tier", n.tier],
    ].filter(Boolean);
    const wiki = "https://minershaven.fandom.com/wiki/" + encodeURIComponent((n.id === "the-leprechaun" ? "Category:The Leprechaun" : n.page).replace(/ /g, "_"));
    $("#mBody").innerHTML = `<div class="md" style="--dx:${dir * 30}px">
      <div class="pic"><img src="${IMG(n)}" alt="${esc(n.name)}" /></div>
      <div>
        <span class="grp">${G.label}</span>
        <h2 id="mName">${esc(n.name)}</h2>
        <div class="role">${esc(n.role)}</div>
        ${facts.length ? `<div class="facts">${facts.map(([k, v]) => `<span><small>${k}</small>${esc(v)}</span>`).join("")}</div>` : ""}
        ${n.quote ? `<blockquote><span class="tw" id="tw"></span></blockquote>` : ""}
        <p class="desc">${esc(n.desc)}</p>
        ${n.more && n.more !== n.desc ? `<p class="desc">${esc(n.more)}</p>` : ""}
        <div class="links">
          ${n.item ? `<a href="item-index.html#item=${encodeURIComponent(n.item)}">Open in the Item Index →</a>` : ""}
          <a href="${wiki}" target="_blank" rel="noopener">Read more on the wiki ↗</a>
        </div>
      </div>
      ${n.id === "the-masked-man" && window.MH_MM_STOCK ? stockHtml() : ""}
    </div>`;
    if (n.id === "the-masked-man") wireStock();
    clearInterval(typer);
    if (n.quote) {
      const el = $("#tw"); let k = 0;
      if (MH.reduceMotion) { el.textContent = n.quote; el.classList.add("done"); }
      else typer = setInterval(() => { k += 2; el.textContent = n.quote.slice(0, k); if (k >= n.quote.length) { clearInterval(typer); el.classList.add("done"); } }, 22);
    }
    history.replaceState(null, "", "#npc=" + n.id);
  }
  /* ---------- The Masked Man's stock ---------- */
  const MMS = window.MH_MM_STOCK;
  const MM_IMG = u => u ? `https://static.wikia.nocookie.net/the-miners-haven-project/images/${u}/revision/latest/scale-to-width-down/96` : "";
  const MM_GROUPS = ["Contraband", "Exotic", "Collectible", "Other"];
  let mmTab = "all";
  function stockRows() {
    const rows = MMS.items.filter(x => mmTab === "all" || x.g === mmTab);
    const row = x => `<a class="mm-row${x.s ? " seas" : ""}" href="item-index.html#item=${encodeURIComponent(x.n)}">
        <span class="mm-pic">${x.img ? `<img src="${MM_IMG(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : ""}</span>
        <span class="mm-name"><b>${esc(x.n)}</b><small>${esc(x.tier || x.g)}${x.s ? ` · <em>${esc(x.s)} only</em>` : ""}</small></span>
        <span class="mm-price" data-cur-money>${esc(x.p)}${x.range ? `<i title="Old price range from the wiki">?</i>` : ""}</span>
      </a>`;
    const SO = ["Summer", "Autumn", "Halloween", "Winter"];
    const now = rows.filter(x => !x.s), seas = rows.filter(x => x.s).sort((a, b) => SO.indexOf(a.s) - SO.indexOf(b.s));
    return (now.length ? `<div class="mm-sub">Always in stock <em>${now.length}</em></div>` + now.map(row).join("") : "") +
      (seas.length ? `<div class="mm-sub">Seasonal <em>${seas.length}</em><span>Only sold while its season is on. Prices with a ? are the old ranges from the wiki.</span></div>` + seas.map(row).join("") : "");
  }
  function stockHtml() {
    const cnt = g => MMS.items.filter(x => g === "all" || x.g === g).length;
    return `<section class="mm-stock">
      <div class="mm-head"><h3>His stock</h3><p>Everything The Masked Man sells, at full price. A few items are discounted each day and the discounts change at the daily reset, so the in-game price may be lower.</p></div>
      <div class="mm-tabs" role="tablist">${["all", ...MM_GROUPS].map(g => `<button type="button" data-g="${g}" class="${mmTab === g ? "on" : ""}">${g === "all" ? "All" : g}<em>${cnt(g)}</em></button>`).join("")}</div>
      <div class="mm-list" id="mmList">${stockRows()}</div>
    </section>`;
  }
  function wireStock() {
    const t = modal.querySelector(".mm-tabs"); if (!t) return;
    t.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      mmTab = b.dataset.g; t.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      const l = $("#mmList"); l.innerHTML = stockRows(); l.classList.remove("swap"); void l.offsetWidth; l.classList.add("swap");
    });
  }

  function open(id, from) {
    list = from && from.some(n => n.id === id) ? from : ALL;
    idx = Math.max(0, list.findIndex(n => n.id === id));
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("show"));
    document.body.style.overflow = "hidden";
    fill();
    $("#mClose").focus();
  }
  function close() {
    overlay.classList.remove("show");
    clearInterval(typer);
    document.body.style.overflow = "";
    setTimeout(() => { overlay.hidden = true; }, 300);
    history.replaceState(null, "", location.pathname);
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  const step = d => { idx = (idx + d + list.length) % list.length; fill(d); };
  $("#mClose").addEventListener("click", close);
  $("#mPrev").addEventListener("click", () => step(-1));
  $("#mNext").addEventListener("click", () => step(1));
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", e => {
    if (overlay.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  const h = decodeURIComponent(location.hash.replace(/^#npc=/, ""));
  if (byId[h]) setTimeout(() => open(h, ALL), 400);

  /* ---------- Back to top ---------- */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));
})();
