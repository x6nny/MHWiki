/* =========================================================
   Update Log page
   Data: window.UPDATE_LOG (js/update-log-data.js), newest first.
   ========================================================= */
(() => {
  const DATA = window.UPDATE_LOG || [];
  const ICON = "../assets/icons/";
  const KINDS = {
    update:      { label: "Game updates",  icon: "rebirth.png",       color: "#38d9ff" },
    lol:         { label: "Labor of Love", icon: "craftsman.png",     color: "#7ee0a1" },
    halloween:   { label: "Halloween",     icon: "halloween.png",     color: "#ff9f1c" },
    winter:      { label: "Winter",        icon: "winter.png",        color: "#8fd8ff" },
    valentines:  { label: "Valentine's",   icon: "valentines.png",    color: "#ff5c7a" },
    stpatricks:  { label: "St. Patrick's", icon: "st-patty.png",      color: "#5cdb6b" },
    easter:      { label: "Easter",        icon: "easter.png",        color: "#ffd166" },
    birthday:    { label: "Anniversary",   icon: "birthday.png",            color: "#ff7aa2" },
    blackfriday: { label: "Black Friday",  icon: "money.png",         color: "#9dff6b" },
    spring:      { label: "Spring",        icon: "spring.png",        color: "#ffc93c" },
    summer:      { label: "Summer",        icon: "summer.png",        color: "#ffa62b" },
  };

  const $ = s => document.querySelector(s);
  const timeline = $("#timeline");
  const yearsEl = $("#years");
  const kindsEl = $("#kinds");
  const qEl = $("#q");
  const state = { q: "", kind: "all", allOpen: false };

  /* ---------- helpers ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tokens = () => state.q.toLowerCase().split(/\s+/).filter(Boolean);
  function hl(text) {
    const safe = esc(text);
    const t = tokens();
    if (!t.length) return safe;
    const re = new RegExp("(" + t.map(x => esc(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return safe.replace(re, "<mark>$1</mark>");
  }
  function flatten(items, out = []) {
    items.forEach(it => {
      if (Array.isArray(it)) { out.push(it[0]); flatten(it[1], out); } else out.push(it);
    });
    return out;
  }
  const blockText = b => b[0] === "ul" ? flatten(b[1]).join(" ") : b[0] === "t" ? b[1].map(r => r.join(" ")).join(" ") : b[1];

  // Search index
  DATA.forEach(e => {
    e._index = [e.name, e.kindLabel, e.year, e.dateLabel || "", ...e.blocks.map(blockText)].join(" ").toLowerCase();
    e._head = [e.name, e.kindLabel, e.year, e.dateLabel || "", e.summary].join(" ").toLowerCase();
  });

  /* ---------- notes renderer ---------- */
  const DATE_ONLY = /^(released\b|\(?\d{1,2}(st|nd|rd|th)?,? ?(of )?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,? ?\d{0,4}\.?\)?$)/i;
  function renderList(items) {
    return "<ul>" + items.map(it => Array.isArray(it)
      ? `<li>${hl(it[0])}${renderList(it[1])}</li>`
      : `<li>${hl(it)}</li>`).join("") + "</ul>";
  }
  function renderBlocks(blocks) {
    let i = 0;
    return blocks.map(b => {
      const style = `style="--i:${Math.min(i++, 18)}"`;
      switch (b[0]) {
        case "h2": return `<h4 class="nb-h2" ${style}>${hl(b[1])}</h4>`;
        case "h3": return `<h5 class="nb-h3" ${style}>${hl(b[1])}</h5>`;
        case "h4": case "h5": return `<h6 class="nb-h4" ${style}>${hl(b[1])}</h6>`;
        case "p":
          if (b[1].length < 60 && DATE_ONLY.test(b[1].trim()))
            return `<p class="rel-date" ${style}><span>${hl(b[1].replace(/\.$/, ""))}</span></p>`;
          return `<p ${style}>${hl(b[1])}</p>`;
        case "ul": return `<div class="nb-list" ${style}>${renderList(b[1])}</div>`;
        case "t": {
          const [head, ...rows] = b[1];
          return `<div class="nb-table" ${style}><table><thead><tr>${head.map(c => `<th>${hl(c)}</th>`).join("")}</tr></thead>` +
            `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${hl(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
        }
        default: return "";
      }
    }).join("");
  }

  /* ---------- build timeline ---------- */
  const years = [...new Set(DATA.map(e => e.year))].sort((a, b) => b - a);
  const groups = {};
  const cards = new Map();

  years.forEach(y => {
    const g = document.createElement("section");
    g.className = "year-group";
    g.id = `y${y}`;
    g.innerHTML = `<header class="year-head reveal"><span class="year-num">${y}</span><span class="year-count"></span></header>`;
    timeline.appendChild(g);
    groups[y] = g;
  });

  DATA.forEach((e, idx) => {
    const k = KINDS[e.kind] || KINDS.update;
    const el = document.createElement("article");
    el.className = "entry reveal" + (e.empty ? " empty" : "") + (idx === 0 ? " latest" : "");
    el.id = e.id;
    el.style.setProperty("--c", k.color);
    el.innerHTML = `
      <span class="node" aria-hidden="true"></span>
      <div class="entry-card glass">
        <button class="entry-head" ${e.empty ? "disabled" : ""} aria-expanded="false" aria-controls="${e.id}-notes">
          <span class="entry-icon"><img src="${ICON + k.icon}" alt="" loading="lazy" /></span>
          <span class="entry-main">
            <span class="entry-meta">
              <span class="kind-chip">${esc(k.label)}</span>
              <time>${esc(e.dateLabel || e.year)}</time>
              ${e.changes ? `<span class="changes">${e.changes.toLocaleString("en-US")} change${e.changes === 1 ? "" : "s"}</span>` : ""}
              ${idx === 0 ? `<span class="latest-badge"><span class="pulse-dot"></span>Latest</span>` : ""}
              <span class="body-hit" hidden></span>
            </span>
            <span class="entry-title"></span>
            <span class="entry-sum"></span>
          </span>
          ${e.empty ? "" : `<span class="chev" aria-hidden="true"></span>`}
        </button>
        <div class="entry-body" id="${e.id}-notes" role="region" aria-label="${esc(e.name)} patch notes">
          <div class="entry-body-inner"></div>
        </div>
      </div>`;
    groups[e.year].appendChild(el);
    cards.set(e.id, { e, el, rendered: false });
    paintHead(cards.get(e.id));
    if (!e.empty) el.querySelector(".entry-head").addEventListener("click", () => toggle(e.id));
  });

  function paintHead(c) {
    const { e, el } = c;
    el.querySelector(".entry-title").innerHTML = hl(e.name);
    el.querySelector(".entry-sum").innerHTML = e.empty
      ? "The wiki doesn't have patch notes for this update yet."
      : e.kind === "lol" && !e.summary ? "Quality-of-life and bug-fix patch." : hl(e.summary);
  }

  function renderBody(c) {
    const { e, el } = c;
    const inner = el.querySelector(".entry-body-inner");
    const series = e.kind === "lol"
      ? `<p class="series-note">Part of the <b>Labor of Love</b> series: fortnightly back-end and quality-of-life patches released between events.</p>` : "";
    inner.innerHTML = series + renderBlocks(e.blocks) + `
      <div class="notes-foot">
        ${e.source ? `<a href="${e.source}" target="_blank" rel="noopener" class="src-link">View on the Fandom wiki ↗</a>` : ""}
        <button class="copy-link" data-id="${e.id}">Copy link to this update</button>
      </div>`;
    inner.querySelector(".copy-link").addEventListener("click", async ev => {
      ev.stopPropagation();
      const url = location.href.split("#")[0] + "#" + e.id;
      try { await navigator.clipboard.writeText(url); } catch {}
      history.replaceState(null, "", "#" + e.id);
      MH.toast("Link copied");
    });
    c.rendered = true;
    c.renderedQ = state.q;
  }

  function open(id, on) {
    const c = cards.get(id);
    if (!c || c.e.empty) return;
    if (on && (!c.rendered || c.renderedQ !== state.q)) renderBody(c);
    c.el.classList.toggle("open", on);
    c.el.querySelector(".entry-head").setAttribute("aria-expanded", on);
  }
  const toggle = id => open(id, !cards.get(id).el.classList.contains("open"));

  /* ---------- kind filter chips ---------- */
  const counts = DATA.reduce((m, e) => (m[e.kind] = (m[e.kind] || 0) + 1, m), {});
  kindsEl.innerHTML = `<button class="kind active" data-kind="all"><span>All</span><em>${DATA.length}</em></button>` +
    Object.entries(KINDS).filter(([k]) => counts[k]).map(([k, v]) =>
      `<button class="kind" data-kind="${k}" style="--c:${v.color}"><img src="${ICON + v.icon}" alt="" /><span>${v.label}</span><em>${counts[k]}</em></button>`
    ).join("");
  kindsEl.addEventListener("click", ev => {
    const b = ev.target.closest(".kind");
    if (!b) return;
    state.kind = b.dataset.kind;
    kindsEl.querySelectorAll(".kind").forEach(x => x.classList.toggle("active", x === b));
    b.scrollIntoView({ block: "nearest", inline: "center", behavior: MH.reduceMotion ? "auto" : "smooth" });
    apply();
  });

  /* ---------- year rail ---------- */
  function buildYears(visibleByYear) {
    yearsEl.innerHTML = `<p class="years-title">Jump to</p>` + years.map(y =>
      `<a href="#y${y}" data-year="${y}" class="${visibleByYear[y] ? "" : "off"}"><span>${y}</span><em>${visibleByYear[y] || 0}</em></a>`
    ).join("");
  }
  yearsEl.addEventListener("click", ev => {
    const a = ev.target.closest("a[data-year]");
    if (!a) return;
    ev.preventDefault();
    const g = groups[a.dataset.year];
    if (g && !g.hidden) window.scrollTo({ top: g.getBoundingClientRect().top + scrollY - 190, behavior: MH.reduceMotion ? "auto" : "smooth" });
  });

  /* ---------- filtering ---------- */
  function apply() {
    const t = tokens();
    let shown = 0;
    const byYear = {};
    const matches = [];
    cards.forEach(c => {
      const { e, el } = c;
      const kindOk = state.kind === "all" || e.kind === state.kind;
      const qOk = !t.length || t.every(x => e._index.includes(x));
      const vis = kindOk && qOk;
      el.hidden = !vis;
      paintHead(c);
      const hit = el.querySelector(".body-hit");
      const bodyOnly = vis && t.length && !t.every(x => e._head.includes(x));
      hit.hidden = !bodyOnly;
      if (bodyOnly) hit.textContent = "Match in patch notes";
      if (c.rendered && c.renderedQ !== state.q) {
        if (el.classList.contains("open")) renderBody(c); else c.rendered = false;
      }
      if (vis) { shown++; byYear[e.year] = (byYear[e.year] || 0) + 1; matches.push(c); }
    });
    years.forEach(y => {
      groups[y].hidden = !byYear[y];
      groups[y].querySelector(".year-count").textContent = byYear[y] ? `${byYear[y]} update${byYear[y] === 1 ? "" : "s"}` : "";
    });
    // A small result set from a search: open the matches so the highlights are visible
    if (t.length && matches.length <= 4) matches.forEach(c => open(c.e.id, true));
    $("#resultCount").textContent = (t.length || state.kind !== "all") ? `${shown} of ${DATA.length}` : "";
    $("#noResults").hidden = shown > 0;
    buildYears(byYear);
    spy();
    updateRail();
  }
  let qTimer;
  qEl.addEventListener("input", () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = qEl.value.trim(); apply(); }, 160);
  });
  $("#clearSearch").addEventListener("click", () => {
    qEl.value = ""; state.q = ""; state.kind = "all";
    kindsEl.querySelectorAll(".kind").forEach(x => x.classList.toggle("active", x.dataset.kind === "all"));
    apply(); qEl.focus();
  });
  document.addEventListener("keydown", ev => {
    if (ev.key === "/" && document.activeElement !== qEl) { ev.preventDefault(); qEl.focus(); }
    if (ev.key === "Escape" && document.activeElement === qEl && qEl.value) { qEl.value = ""; state.q = ""; apply(); }
  });

  /* ---------- expand / collapse all ---------- */
  const toggleAllBtn = $("#toggleAll");
  toggleAllBtn.addEventListener("click", () => {
    state.allOpen = !state.allOpen;
    cards.forEach(c => { if (!c.el.hidden) open(c.e.id, state.allOpen); });
    toggleAllBtn.textContent = state.allOpen ? "Collapse all" : "Expand all";
    toggleAllBtn.setAttribute("aria-pressed", state.allOpen);
  });

  /* ---------- scrollspy, rail progress, back-to-top ---------- */
  function spy() {
    let current = null;
    for (const y of years) {
      const g = groups[y];
      if (g.hidden) continue;
      if (g.getBoundingClientRect().top - 220 <= 0) current = y; else if (current === null) { current = y; break; } else break;
    }
    yearsEl.querySelectorAll("a").forEach(a => a.classList.toggle("active", +a.dataset.year === current));
  }
  const railFill = $("#railFill");
  function updateRail() {
    const r = timeline.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
    railFill.style.transform = `scaleY(${p})`;
  }
  const toTop = $("#toTop");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      spy(); updateRail();
      toTop.classList.toggle("show", scrollY > 900);
      ticking = false;
    });
  }, { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));

  /* ---------- stats ---------- */
  const totalChanges = DATA.reduce((s, e) => s + e.changes, 0);
  setTimeout(() => {
    MH.countUp($("#statUpdates"), DATA.length);
    MH.countUp($("#statChanges"), totalChanges);
    MH.countUp($("#statYears"), years.length, 900);
  }, 500);
  $("#statLatest").textContent = DATA[0] ? (DATA[0].dateLabel || DATA[0].year).replace(/ \d{4}$/, "") : "–";
  $("#statLatest").title = DATA[0] ? DATA[0].name : "";

  /* ---------- init ---------- */
  document.querySelectorAll(".entry, .year-head").forEach(MH.reveal);
  apply();
  const target = location.hash.slice(1);
  if (target && cards.has(target)) {
    open(target, true);
    setTimeout(() => {
      const el = cards.get(target).el;
      el.classList.add("in", "flash");
      window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 200 });
    }, 200);
  } else if (DATA[0]) {
    open(DATA[0].id, true);
  }
})();
