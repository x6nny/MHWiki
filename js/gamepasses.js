/* =========================================================
   Gamepasses page
   Data: window.GAMEPASSES (js/gamepasses-data.js)
   ========================================================= */
(() => {
  const G = window.GAMEPASSES;
  const PASS_IMG = "../assets/gamepasses/";
  const ITEM_IMG = "../assets/items/";
  const ROBUX = `<img src="${ITEM_IMG}robux.webp" alt="Robux" />`;
  const TABS = {
    current:   { key: "Gameplay Gamepasses",    label: "Gamepasses" },
    artifacts: { key: "Black Friday Artifacts", label: "Black Friday Artifacts" },
    retired:   { key: "Retired Gamepasses",     label: "Retired" },
  };
  const $ = s => document.querySelector(s);
  const grid = $("#grid");
  const state = { tab: "current", q: "", sort: "default" };

  // Normalise
  Object.entries(TABS).forEach(([id, t]) => {
    t.items = G.tabs[t.key].map((p, i) => ({
      ...p, tab: id, order: i,
      _text: [p.name, p.limited || "", p.year || "", ...p.perks.map(x => x.t)].join(" ").toLowerCase(),
    }));
  });
  const maxPrice = id => Math.max(...TABS[id].items.map(p => p.price));

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tokens = () => state.q.toLowerCase().split(/\s+/).filter(Boolean);
  function hl(text) {
    const safe = esc(text), t = tokens();
    if (!t.length) return safe;
    const re = new RegExp("(" + t.map(x => esc(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return safe.replace(re, "<mark>$1</mark>");
  }
  const matches = p => tokens().every(t => p._text.includes(t));
  const fmt = n => n.toLocaleString("en-US");

  /* ---------- Stats ---------- */
  const perm = TABS.current.items.filter(p => !p.limited);
  setTimeout(() => {
    MH.countUp($("#stPerm"), perm.length, 800);
    MH.countUp($("#stTotal"), perm.reduce((s, p) => s + p.price, 0));
    MH.countUp($("#stArt"), TABS.artifacts.items.length, 1000);
    MH.countUp($("#stRet"), TABS.retired.items.length, 800);
  }, 500);

  /* ---------- Price ladder ---------- */
  (function ladder() {
    const items = [...TABS.current.items].sort((a, b) => a.price - b.price);
    const max = maxPrice("current");
    $("#ladderRows").innerHTML = items.map((p, i) => `
      <div class="lrow ${p.limited ? "limited" : ""}" style="--c:${p.accent}" data-name="${esc(p.name)}" title="Jump to ${esc(p.name)}">
        <img src="${PASS_IMG + p.icon}" alt="" loading="lazy" />
        <span class="ln">${esc(p.name)}${p.limited ? `<small>${esc(p.limited)} only</small>` : ""}</span>
        <span class="lbar"><span style="--w:${Math.max(2, (p.price / max) * 100)}%; --dl:${i * 90}ms"></span></span>
        <span class="lp">${ROBUX}${fmt(p.price)}</span>
      </div>`).join("");
    $("#ladderRows").addEventListener("click", e => {
      const row = e.target.closest(".lrow");
      if (!row) return;
      const card = [...grid.querySelectorAll(".pass")].find(c => c.dataset.name === row.dataset.name);
      if (card) {
        window.scrollTo({ top: card.getBoundingClientRect().top + scrollY - 180, behavior: MH.reduceMotion ? "auto" : "smooth" });
        card.animate([{ boxShadow: `0 0 0 0 ${row.style.getPropertyValue("--c")}` }, { boxShadow: `0 0 0 4px ${row.style.getPropertyValue("--c")}` }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1400, delay: 350 });
      }
    });
    MH.reveal($("#ladder"));
  })();

  /* ---------- Cards ---------- */
  function perkHTML(k) {
    const icon = k.img ? `<img src="${ITEM_IMG + k.img}" alt="" loading="lazy" />` : `<i></i>`;
    let text = hl(k.t);
    if (k.link) text = `<a href="${esc(k.link)}" target="_blank" rel="noopener" title="Open on the Fandom wiki">${text}</a>`;
    if (k.removed) text = `<span><s>${text}</s><small>Removed</small></span>`;
    return `<li class="perk ${k.removed ? "removed" : ""}"><span class="pi">${icon}</span><span>${text}</span></li>`;
  }
  function cardHTML(p, i, max) {
    const tab = p.tab;
    const price = p.price === 0
      ? `<span class="price free">Free</span>`
      : `<span class="price">${ROBUX}${fmt(p.price)}</span>`;
    const tags = [price];
    if (p.limited) tags.push(`<span class="tag limited">${esc(p.limited)} only</span>`);
    if (p.year) tags.push(`<span class="tag">Black Friday ${p.year}</span>`);
    const footLabel = tab === "current" ? "Price vs. other passes" : tab === "artifacts" ? "Price vs. other artifacts" : "Price vs. other packs";
    return `
      <article class="pass glass ${tab === "artifacts" ? "compact" : ""} ${tab === "retired" ? "retired" : ""}"
               style="--c:${p.accent}; --i:${i}" data-name="${esc(p.name)}">
        ${tab === "retired" ? `<span class="stamp">Retired</span>` : ""}
        <div class="pass-top">
          <div class="pass-icon"><img src="${PASS_IMG + p.icon}" alt="${esc(p.name)} icon" loading="lazy" /></div>
          <div class="pass-title">
            <h3>${hl(p.name)}</h3>
            <div class="pass-tags">${tags.join("")}</div>
          </div>
        </div>
        <ul class="perks">${p.perks.map(perkHTML).join("")}</ul>
        <div class="pass-foot">
          <span class="meter"><span style="--w:${Math.max(3, (p.price / max) * 100)}%"></span></span>
          <small>${footLabel}</small>
        </div>
      </article>`;
  }

  function sorted(items) {
    const s = [...items];
    if (state.sort === "price-asc") s.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    else if (state.sort === "price-desc") s.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    else if (state.sort === "name") s.sort((a, b) => a.name.localeCompare(b.name));
    else if (state.tab === "artifacts") s.sort((a, b) => b.year - a.year || a.order - b.order); // newest first
    return s;
  }

  function render() {
    const t = TABS[state.tab];
    const max = maxPrice(state.tab);
    const list = sorted(t.items.filter(matches));
    let html = "", i = 0, lastYear = null;
    const byYear = state.tab === "artifacts" && state.sort === "default";
    list.forEach(p => {
      if (byYear && p.year !== lastYear) {
        const n = list.filter(x => x.year === p.year).length;
        html += `<div class="year-split" style="--i:${i}"><span>${p.year}</span><em>${n} artifact${n === 1 ? "" : "s"}</em></div>`;
        lastYear = p.year;
      }
      html += cardHTML(p, i++, max);
    });
    grid.innerHTML = html;
    $("#ladder").hidden = state.tab !== "current" || !!state.q;
    $("#noResults").hidden = list.length > 0;

    // Counts in tabs reflect the search
    Object.entries(TABS).forEach(([id, tb]) => {
      const n = tb.items.filter(matches).length;
      document.querySelector(`[data-tab="${id}"] em`).textContent = n;
    });
    // Hint when other tabs have matches
    const hint = $("#tabHint");
    const others = Object.entries(TABS).filter(([id]) => id !== state.tab).map(([id, tb]) => [id, tb.items.filter(matches).length]).filter(([, n]) => n);
    if (state.q && others.length) {
      hint.innerHTML = "Also found in " + others.map(([id, n]) => `<button data-go="${id}">${TABS[id].label} (${n})</button>`).join(" and ");
      hint.hidden = false;
    } else hint.hidden = true;

    bindTilt();
  }

  function bindTilt() {
    grid.querySelectorAll(".pass").forEach(card => {
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty("--mx", x + "px");
        card.style.setProperty("--my", y + "px");
        if (!MH.reduceMotion && e.pointerType === "mouse") {
          card.style.setProperty("--ry", ((x / r.width) - .5) * 6 + "deg");
          card.style.setProperty("--rx", -((y / r.height) - .5) * 6 + "deg");
        }
      });
      card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
    });
  }

  /* ---------- Tabs ---------- */
  const tabsEl = $("#tabs");
  const ind = tabsEl.querySelector(".seg-ind");
  function moveInd() {
    const b = tabsEl.querySelector("button.active");
    ind.style.width = b.offsetWidth + "px";
    ind.style.transform = `translateX(${b.offsetLeft - 4}px)`;
  }
  function setTab(id, push = true) {
    if (!TABS[id]) return;
    state.tab = id;
    tabsEl.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
    moveInd();
    render();
    if (push) {
      history.replaceState(null, "", id === "current" ? location.pathname : "#" + id);
      const bar = document.querySelector(".gp-bar");
      const top = bar.getBoundingClientRect().top + scrollY - 92;
      if (scrollY > top + 40) window.scrollTo({ top, behavior: MH.reduceMotion ? "auto" : "smooth" });
    }
  }
  tabsEl.addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) setTab(b.dataset.tab); });
  $("#tabHint").addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b) setTab(b.dataset.go); });
  window.addEventListener("resize", moveInd);
  document.fonts && document.fonts.ready.then(moveInd);

  /* ---------- Sort ---------- */
  $("#sort").addEventListener("click", e => {
    const b = e.target.closest("button[data-sort]");
    if (!b) return;
    state.sort = b.dataset.sort;
    $("#sort").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    render();
  });

  /* ---------- Search ---------- */
  const qEl = $("#q");
  let qt;
  qEl.addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(() => { state.q = qEl.value.trim(); render(); }, 140); });
  $("#clearSearch").addEventListener("click", () => { qEl.value = ""; state.q = ""; render(); qEl.focus(); });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== qEl) { e.preventDefault(); qEl.focus(); }
    if (e.key === "Escape" && document.activeElement === qEl) { qEl.value = ""; state.q = ""; render(); }
  });

  /* ---------- Trivia ---------- */
  $("#trivia").innerHTML = (G.trivia || []).map(t => `<li>${esc(t)}</li>`).join("");

  /* ---------- Back to top ---------- */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));

  /* ---------- Init ---------- */
  const initial = location.hash.slice(1);
  setTab(TABS[initial] ? initial : "current", false);
  window.addEventListener("load", moveInd);
})();
