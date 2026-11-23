/* =========================================================
   Miner's Haven Wiki: landing page interactions
   ========================================================= */

/* Section registry. Flip `ready` to true as each page in /pages is built. */
const SECTIONS = [
  { id: "item-index",     name: "Item Index",     icon: "assets/icons/money.png",         desc: "Droppers, upgraders, furnaces & utilities", cat: "items",       keys: "items mines droppers upgraders furnaces utility tiers shop", ready: true },
  { id: "rebirth",        name: "Rebirth",        icon: "assets/icons/rebirth.png",       desc: "New lives & Reborn items",                   cat: "progression", keys: "reborn life slipstream shiny advanced evolved fusion rebirth price life skipping shards of life decimal rarity ultimate", ready: true },
  { id: "sacrifice",      name: "Sacrifice",      icon: "assets/icons/draedon.png",       desc: "Ultimate & Second Sacrifice, escrow",        cat: "progression", keys: "ultimate second third forbidden escrow soulbound reset catalyst superstitious final upgrader", ready: true },
  { id: "research-points", name: "Research Points", icon: "assets/icons/rp.png",           desc: "Crates, RP furnaces & shop tier unlocks",     cat: "economy",     keys: "rp research points crates diamond crate golden crate shadow crate research center industrial scarab blueprint farm afk", ready: true },
  { id: "shards-of-life", name: "Shards of Life", icon: "assets/sol/shard.webp",          desc: "Life skipping, Reborn Shop & Enchanted costs",  cat: "progression", keys: "shards of life sol life skip skipping salvage craftsman reborn shop enchanted platforms shard park shard city gift of life", ready: true },
  { id: "crafting",       name: "Crafting",       icon: "assets/icons/draedon.png",       desc: "Enchanted & Superstitious recipes, forge planner", cat: "progression", keys: "crafting craft recipes enchanted superstitious craftsman draedon catalyst catalysts elements aether water earth fire order entropy true book of knowledge forge", ready: true },
  { id: "gamepasses",     name: "Gamepasses",     icon: "assets/icons/robux.png",         desc: "Robux passes and their perks",               cat: "economy",     keys: "vip premium executive dark knight robux perks shiny charm",  ready: true },
  { id: "status-effects", name: "Status Effects", icon: null,                             desc: "Fire, frostbite, radioactive, poison…",      cat: "items",       keys: "ore properties fire frostbite radioactive poison sparkles wet anti-gravity shield", ready: true },
  { id: "update-log",     name: "Update Log",     icon: "assets/icons/halloween.png",     desc: "Patch notes, newest first",                  cat: "news",        keys: "updates patch notes changelog halloween 2026",               ready: true },
  { id: "events",         name: "Events",         icon: "assets/icons/winter.png",        desc: "Seasonal events since 2015",                 cat: "news",        keys: "valentines st patricks spring easter birthday summer halloween black friday winter christmas", ready: true },
  { id: "mystery-boxes",  name: "Mystery Boxes",  icon: "assets/icons/spook-mcdooks.png", desc: "Box types, odds & Lucky Clovers",            cat: "economy",     keys: "boxes crates inferno lucky clover spook mcdooks unreal magnificent", ready: true },
  { id: "codes",          name: "Codes",          icon: "assets/icons/uc.png",            desc: "Active codes for uC, boxes & items",         cat: "economy",     keys: "redeem codes uc unobtainium crystals free",                  ready: true },
  { id: "cash-suffixes",  name: "Cash Suffixes",  icon: "assets/icons/money.png",         desc: "Every suffix from k to UNCENT, plus a converter", cat: "economy", keys: "cash suffix suffixes money k m b t qn sx centillion uncent scientific notation converter cap inf", ready: true },
  { id: "npcs",           name: "NPCs",           icon: "assets/icons/craftsman.png",     desc: "Masked Man, Craftsman, Draedon & more",      cat: "world",       keys: "npc masked man craftsman spook mcdooks draedon daegel fargield john doe zalgo characters guardians santa leprechaun", ready: true },
];
const byId = Object.fromEntries(SECTIONS.map(s => [s.id, s]));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Toast ---------- */
const toastEl = document.getElementById("toast");
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

/* ---------- Navigation to section pages ---------- */
function openSection(id) {
  const s = byId[id];
  if (!s) return;
  if (s.ready) {
    document.body.classList.add("leaving");
    window.location.href = `pages/${id}.html`;
  } else {
    toast(`${s.name} page is coming soon`);
  }
}

/* ---------- Nav shrink on scroll ---------- */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Floating ore particles ---------- */
(function oreField() {
  const canvas = document.getElementById("ore-field");
  if (!canvas || reduceMotion) return;
  const ctx = canvas.getContext("2d");
  const colors = ["#34f5a4", "#38d9ff", "#a77bff", "#ffc857", "#ff6b9a"];
  let w, h, dpr, ores = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(60, (w * h) / 26000));
    ores = Array.from({ length: count }, () => spawn(true));
  }
  function spawn(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 20,
      s: 2 + Math.random() * 5,
      v: 0.15 + Math.random() * 0.45,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.02,
      sway: Math.random() * Math.PI * 2,
      c: colors[(Math.random() * colors.length) | 0],
      a: 0.25 + Math.random() * 0.5,
    };
  }
  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < ores.length; i++) {
      const o = ores[i];
      o.y -= o.v; o.r += o.vr; o.sway += 0.01;
      const x = o.x + Math.sin(o.sway) * 12;
      if (o.y < -20) ores[i] = spawn(false);
      ctx.save();
      ctx.translate(x, o.y); ctx.rotate(o.r);
      ctx.globalAlpha = o.a;
      ctx.shadowColor = o.c; ctx.shadowBlur = 12;
      ctx.fillStyle = o.c;
      ctx.fillRect(-o.s / 2, -o.s / 2, o.s, o.s);
      ctx.restore();
    }
    requestAnimationFrame(tick);
  }
  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(tick);
})();

/* ---------- Count-up stats ---------- */
function countUp(el) {
  const target = +el.dataset.count;
  const dur = reduceMotion ? 0 : 1600;
  const start = performance.now();
  const fmt = n => n.toLocaleString("en-US");
  function step(now) {
    const p = dur ? Math.min(1, (now - start) / dur) : 1;
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = fmt(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
setTimeout(() => document.querySelectorAll("[data-count]").forEach(countUp), 700);

/* ---------- Typewriter in hero search ---------- */
(function typer() {
  const el = document.getElementById("typer");
  if (!el || reduceMotion) return;
  const phrases = ["Search items, NPCs, codes…", "Try “Rebirth”", "Try “Mystery Boxes”", "Try “Codes”", "Try “Status Effects”", "Try “The Craftsman”"];
  let p = 0, i = phrases[0].length, deleting = true;
  setTimeout(function loop() {
    const text = phrases[p];
    if (deleting) {
      i--;
      if (i <= 0) { deleting = false; p = (p + 1) % phrases.length; }
    } else {
      i++;
      if (i >= phrases[p].length) { deleting = true; el.textContent = phrases[p]; return setTimeout(loop, 2200); }
    }
    el.textContent = (deleting ? text : phrases[p]).slice(0, Math.max(0, i));
    setTimeout(loop, deleting ? 35 : 70);
  }, 3200);
})();

/* ---------- Scroll reveal (staggered) ---------- */
(function reveal() {
  const items = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting);
    visible.forEach((e, idx) => {
      const el = e.target;
      el.style.setProperty("--rd", `${idx * 80}ms`);
      el.classList.add("in");
      io.unobserve(el);
      if (el.classList.contains("card")) {
        // Hand transform control to the tilt effect once the reveal finishes
        setTimeout(() => el.classList.add("ready"), 950 + idx * 80);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  items.forEach(el => io.observe(el));
})();

/* ---------- Card tilt, spotlight, click, ripple ---------- */
document.querySelectorAll(".card").forEach(card => {
  card.setAttribute("tabindex", "0");
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", byId[card.dataset.page]?.name || "Section");

  card.addEventListener("pointermove", e => {
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
    if (!reduceMotion && e.pointerType === "mouse") {
      const max = card.classList.contains("span-2x2") ? 4 : 7;
      card.style.setProperty("--ry", `${((x / r.width) - 0.5) * max}deg`);
      card.style.setProperty("--rx", `${-((y / r.height) - 0.5) * max}deg`);
    }
  });
  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  });

  card.addEventListener("click", e => {
    if (e.target.closest(".code")) return;
    e.preventDefault();
    const r = card.getBoundingClientRect();
    const size = Math.max(r.width, r.height) / 2;
    const rip = document.createElement("span");
    rip.className = "ripple";
    rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    card.appendChild(rip);
    setTimeout(() => rip.remove(), 700);
    openSection(card.dataset.page);
  });
  card.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); openSection(card.dataset.page); }
  });
});

/* Other links that point at section pages */
document.querySelectorAll("a[data-page]").forEach(a => {
  a.addEventListener("click", e => { e.preventDefault(); openSection(a.dataset.page); });
});

/* ---------- Copy codes ---------- */
document.querySelectorAll(".code").forEach(btn => {
  btn.addEventListener("click", async e => {
    e.stopPropagation();
    const code = btn.dataset.code;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
    }
    btn.classList.add("copied");
    btn.querySelector("em").textContent = "Copied!";
    toast(`Copied “${code}”. Redeem it in-game.`);
    setTimeout(() => { btn.classList.remove("copied"); btn.querySelector("em").textContent = "Copy"; }, 1800);
  });
});

/* ---------- Filters with sliding indicator ---------- */
const filtersEl = document.querySelector(".filters");
const indicator = document.querySelector(".filter-indicator");
function moveIndicator(btn) {
  indicator.style.width = `${btn.offsetWidth}px`;
  indicator.style.transform = `translateX(${btn.offsetLeft}px)`;
}
function applyFilter(cat) {
  const btn = filtersEl.querySelector(`[data-filter="${cat}"]`);
  if (!btn) return;
  filtersEl.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b === btn));
  moveIndicator(btn);
  document.querySelectorAll(".card").forEach(c => {
    c.classList.toggle("dim", cat !== "all" && c.dataset.cat !== cat);
  });
}
filtersEl.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => applyFilter(b.dataset.filter)));
document.querySelectorAll("[data-filter-link]").forEach(a => a.addEventListener("click", () => applyFilter(a.dataset.filterLink)));
window.addEventListener("load", () => moveIndicator(filtersEl.querySelector(".filter.active")));
window.addEventListener("resize", () => moveIndicator(filtersEl.querySelector(".filter.active")));
document.fonts && document.fonts.ready.then(() => moveIndicator(filtersEl.querySelector(".filter.active")));

/* ---------- Command palette ---------- */
const palette = document.getElementById("palette");
const pInput = document.getElementById("paletteInput");
const pList = document.getElementById("paletteList");
let results = [], sel = 0;

function renderPalette() {
  const q = pInput.value.trim().toLowerCase();
  results = SECTIONS
    .map(s => {
      const hay = `${s.name} ${s.desc} ${s.keys}`.toLowerCase();
      let score = 0;
      if (!q) score = 1;
      else if (s.name.toLowerCase().startsWith(q)) score = 3;
      else if (s.name.toLowerCase().includes(q)) score = 2;
      else if (q.split(/\s+/).every(t => hay.includes(t))) score = 1;
      return { s, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.s);
  sel = Math.min(sel, Math.max(0, results.length - 1));
  if (!results.length) {
    pList.innerHTML = `<li class="palette-empty" style="--i:0">No sections match “${q.replace(/[<>&]/g, "")}”</li>`;
    return;
  }
  pList.innerHTML = results.map((s, i) => `
    <li data-id="${s.id}" class="${i === sel ? "sel" : ""}" style="--i:${i}">
      ${s.icon ? `<img src="${s.icon}" alt="">` : `<span class="fxdot"></span>`}
      <div><strong>${s.name}</strong><small>${s.desc}</small></div>
      <span class="go">↵ open</span>
    </li>`).join("");
}
function openPalette() {
  palette.classList.add("open");
  palette.setAttribute("aria-hidden", "false");
  pInput.value = ""; sel = 0; renderPalette();
  setTimeout(() => pInput.focus(), 50);
}
function closePalette() {
  palette.classList.remove("open");
  palette.setAttribute("aria-hidden", "true");
}
document.getElementById("openPalette").addEventListener("click", openPalette);
document.getElementById("heroSearch").addEventListener("click", openPalette);
palette.addEventListener("click", e => { if (e.target === palette) closePalette(); });
pInput.addEventListener("input", () => { sel = 0; renderPalette(); });
pList.addEventListener("click", e => {
  const li = e.target.closest("li[data-id]");
  if (li) { closePalette(); openSection(li.dataset.id); }
});
pList.addEventListener("mousemove", e => {
  const li = e.target.closest("li[data-id]");
  if (!li) return;
  const i = results.findIndex(s => s.id === li.dataset.id);
  if (i !== sel) { sel = i; pList.querySelectorAll("li").forEach((el, j) => el.classList.toggle("sel", j === sel)); }
});
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palette.classList.contains("open") ? closePalette() : openPalette(); return; }
  if (e.key === "/" && !palette.classList.contains("open") && document.activeElement.tagName !== "INPUT") { e.preventDefault(); openPalette(); return; }
  if (!palette.classList.contains("open")) return;
  if (e.key === "Escape") closePalette();
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!results.length) return;
    sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
    pList.querySelectorAll("li").forEach((el, j) => el.classList.toggle("sel", j === sel));
    pList.children[sel]?.scrollIntoView({ block: "nearest" });
  }
  else if (e.key === "Enter" && results[sel]) { closePalette(); openSection(results[sel].id); }
});
