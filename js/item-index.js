/* =========================================================
   Item Index page
   Data: window.MH_ITEMS, window.MH_TIERS (data/Items.json, data/Tiers.json)
   ========================================================= */
(() => {
  const ITEMS = window.MH_ITEMS || [];
  const TIERS = window.MH_TIERS || {};
  const WIKI = "https://minershaven.fandom.com/wiki/";
  const ICON = "../assets/icons/";
  const PAGE = 72;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const byName = new Map();
  ITEMS.forEach((it, i) => {
    it._i = i;
    byName.set(it.n.toLowerCase(), it);
    if (it.page) byName.set(it.page.toLowerCase(), it);
    it._text = [it.n, it.tier, it.type, it.event || "", it.f.effects || "", it.f.drawbacks || "", it.f.source || "", it.quote || ""].join(" ").toLowerCase().replace(/[⟦⟧]/g, "");
    it._date = parseDate(it.date);
    it._mpu = parseMpu(it.f.multiplier_length);
    const sz = String(it.f.item_size || "").match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i); // wiki order: Length x Width
    it._len = sz ? +sz[1] : null; it._wid = sz ? +sz[2] : null;
  });
  // MPU (multiplier per length): the highest value listed, e.g. "Min: x1.4\nMax: x1.6" -> 1.6
  function parseMpu(v) {
    const str = String(v || "").replace(/,/g, "");
    if (!str.trim()) return null;
    let best = null;
    const take = n => { if (n > 0 && n < 1e5 && (best == null || n > best)) best = n; };
    for (let line of str.split(/\n|\|/)) {
      const pct = line.match(/%\)?\s*-\s*x?\s*(\d+(?:\.\d+)?)\s*x?\s*$/); // "x4.2 (45%) - x1.432": MPU is after the dash
      if (pct) { take(+pct[1]); continue; }
      if (/[*/^]/.test(line)) continue; // formulas like x(90*1.02y)^1/7
      line = line.replace(/[a-z]-[\d.]+/gi, " "); // item names like SpookLord-95,000
      line = line.replace(/\([^)]*\)/g, " ");
      if (line.includes(":")) line = line.slice(line.lastIndexOf(":") + 1); // "With 10 upgrades: x1.956"
      line = line.replace(/\$[\d.]+\s*[a-z]*/gi, " ").replace(/\d+(st|nd|rd|th)\b/gi, " ").replace(/\d+(?:\.\d+)?\s*(?!x\b)[a-z]{2,}/gi, " ");
      for (const m of line.matchAll(/\d+(?:\.\d+)?/g)) take(+m[0]);
    }
    return best;
  }
  function parseDate(s) {
    if (!s) return 0;
    if (/initial release/i.test(s)) return Date.UTC(2015, 5, 12);
    const m = s.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*,?\s*([A-Za-z]+),?\s*(\d{4})/) || s.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/);
    if (!m) { const y = s.match(/(\d{4})/); return y ? Date.UTC(+y[1], 0, 1) : 0; }
    let d, mo, y;
    if (/^\d/.test(m[1])) { d = +m[1]; mo = m[2]; y = +m[3]; } else { mo = m[1]; d = +m[2]; y = +m[3]; }
    const idx = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(mo.slice(0, 3).toLowerCase());
    return idx < 0 ? Date.UTC(y, 0, 1) : Date.UTC(y, idx, d);
  }
  const tierColors = t => TIERS[t] || ["#666", "#fff"];
    const vUrl = (v, size) => MH_SRC(v.u);
  const hasShiny = it => !!(it.v && it.v.some(v => v.s));
  const imgUrl = (u, size) => u ? MH_SRC(u) : null;

  /* ---------- Types ---------- */
  const TYPES = [
    { id: "all",        label: "All items",   color: "#38d9ff" },
    { id: "Dropper",    label: "Droppers",    color: "#7cff6b", sample: "Basic Iron Mine" },
    { id: "Upgrader",   label: "Upgraders",   color: "#38d9ff", sample: "Ore Illuminator" },
    { id: "Furnace",    label: "Furnaces",    color: "#ff8a3d", sample: "Basic Furnace" },
    { id: "Conveyor",   label: "Conveyors",   color: "#ffc857", sample: "Basic Conveyor" },
    { id: "Utility",    label: "Utility",     color: "#a77bff", sample: "Blue Ore Teleporter" },
    { id: "Decoration", label: "Decoration",  color: "#ff6bb5", sample: "Firework Pile" },
    { id: "Weapon",     label: "Weapons",     color: "#ff4d6d", sample: "Illumina" },
    { id: "Other",      label: "Misc",        color: "#9aa6c4", sample: "Giant Dice" },
  ];
  const EVENT_ICON = { "Halloween": "halloween.png", "Holidays": "winter.png", "Birthday": "birthday.png", "St. Patrick's": "st-patty.png", "Easter": "easter.png", "Valentine's": "valentines.png", "Spring": "spring.png", "Summer": "summer.png" };

  const state = { type: "all", tier: "all", sort: "tier", q: "", rp: false, shiny: false, len: null, wid: null, swap: false };
  let list = [], shown = 0;

  /* ---------- Type tiles ---------- */
  const counts = ITEMS.reduce((m, it) => (m[it.type] = (m[it.type] || 0) + 1, m), {});
  $("#typeTiles").innerHTML = TYPES.map(t => {
    const s = t.sample && byName.get(t.sample.toLowerCase());
    const art = t.id === "all" ? `<span class="tt-all"><i></i><i></i><i></i><i></i></span>` : `<img src="${esc(imgUrl(s && s.img, 96))}" referrerpolicy="no-referrer" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />`;
    return `<button class="tt ${t.id === "all" ? "on" : ""}" data-type="${t.id}" style="--c:${t.color}">${art}<b>${t.label}</b><em>${(t.id === "all" ? ITEMS.length : counts[t.id] || 0).toLocaleString()}</em></button>`;
  }).join("");
  $("#typeTiles").addEventListener("click", e => {
    const b = e.target.closest(".tt"); if (!b) return;
    state.type = b.dataset.type; apply(true);
  });

  /* ---------- Dropdowns ---------- */
  function dropdown(root, onPick) {
    const btn = root.querySelector(".dd-btn"), menu = root.querySelector(".dd-menu");
    btn.addEventListener("click", e => { e.stopPropagation(); document.querySelectorAll(".dd.open").forEach(d => d !== root && d.classList.remove("open")); root.classList.toggle("open"); btn.setAttribute("aria-expanded", root.classList.contains("open")); });
    menu.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; onPick(b.dataset.v, b); root.classList.remove("open"); });
  }
  document.addEventListener("click", () => document.querySelectorAll(".dd.open").forEach(d => d.classList.remove("open")));

  const tierCounts = ITEMS.reduce((m, it) => (m[it.tier] = (m[it.tier] || 0) + 1, m), {});
  const tierOrder = Object.keys(tierCounts).sort((a, b) => (ITEMS.find(i => i.tier === a).rank - ITEMS.find(i => i.tier === b).rank) || a.localeCompare(b));
  $("#tierDD .dd-menu").innerHTML = `<button data-v="all" class="on"><span class="sw" style="background:conic-gradient(#4498ff,#a946ff,#ff4b87,#ffc857,#34f5a4,#4498ff)"></span>All tiers<em>${ITEMS.length}</em></button><div class="dd-sep"></div>` +
    tierOrder.map(t => `<button data-v="${esc(t)}"><span class="sw" style="background:${tierColors(t)[0]}"></span>${esc(t)}<em>${tierCounts[t]}</em></button>`).join("");
  dropdown($("#tierDD"), v => { state.tier = v; apply(true); });
  dropdown($("#sortDD"), (v, b) => { state.sort = v; $("#sortDD .dd-label").textContent = "Sort: " + b.textContent; $("#sortDD").querySelectorAll("button[data-v]").forEach(x => x.classList.toggle("on", x === b)); apply(true); });

  $("#rebornProof").addEventListener("change", e => { state.rp = e.target.checked; apply(true); });
  $("#hasShiny").addEventListener("change", e => { state.shiny = e.target.checked; apply(true); });
  let qt;
  $("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); apply(true); }, 150); });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !(e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) && !modalOpen()) { e.preventDefault(); $("#q").focus(); }
  });
  $("#clearAll").addEventListener("click", clearAll);
  function clearAll() {
    Object.assign(state, { type: "all", tier: "all", q: "", rp: false, shiny: false, len: null, wid: null });
    $("#q").value = ""; $("#rebornProof").checked = false; $("#hasShiny").checked = false; $("#fLen").value = ""; $("#fWid").value = ""; apply(true);
  }
  // Size search: exact Length × Width (wiki order). "Swap" also matches the item turned sideways.
  const sizeOk = it => {
    if (!state.len && !state.wid) return true;
    const m = (l, w) => (!state.len || l === state.len) && (!state.wid || w === state.wid);
    return it._len != null && (m(it._len, it._wid) || (state.swap && m(it._wid, it._len)));
  };
  let st2;
  ["fLen", "fWid"].forEach(id => $("#" + id).addEventListener("input", () => {
    clearTimeout(st2);
    st2 = setTimeout(() => {
      const num = el => { const v = parseFloat(el.value); return v > 0 ? v : null; };
      state.len = num($("#fLen")); state.wid = num($("#fWid")); apply(true);
    }, 200);
  }));
  $("#fSwap").addEventListener("click", e => {
    state.swap = !state.swap; e.currentTarget.classList.toggle("on", state.swap); e.currentTarget.setAttribute("aria-pressed", state.swap);
    if (state.len || state.wid) apply(true);
  });

  /* ---------- Filter / sort / render ---------- */
  // sort key -> [item field, direction]; items without a value always go last
  const SORTS = { "mpu-d": ["_mpu", -1], "mpu-a": ["_mpu", 1] };
  const fmtNum = n => (Math.round(n * 1000) / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });
  function apply(scrollUp) {
    const toks = state.q.split(/\s+/).filter(Boolean);
    list = ITEMS.filter(it =>
      (state.type === "all" || it.type === state.type) &&
      (state.tier === "all" || it.tier === state.tier) &&
      (!state.rp || it.f.reborn_proof === "Yes") &&
      (!state.shiny || hasShiny(it)) &&
      sizeOk(it) &&
      toks.every(t => it._text.includes(t)));
    const byName = (a, b) => a.n.localeCompare(b.n);
    if (state.sort === "name") list.sort(byName);
    else if (state.sort === "new") list.sort((a, b) => b._date - a._date || byName(a, b));
    else if (state.sort === "old") list.sort((a, b) => (a._date || 9e15) - (b._date || 9e15) || byName(a, b));
    else if (SORTS[state.sort]) { const [k, dir] = SORTS[state.sort]; list.sort((a, b) => (a[k] == null) - (b[k] == null) || (a[k] == null ? 0 : (a[k] - b[k]) * dir) || byName(a, b)); }
    else list.sort((a, b) => a.rank - b.rank || byName(a, b));
    $("#grid").dataset.stat = SORTS[state.sort] ? SORTS[state.sort][0] : "";
    $("#grid").dataset.size = state.len || state.wid ? "1" : "";
    $("#sizeF").classList.toggle("on", !!(state.len || state.wid));

    document.querySelectorAll(".tt").forEach(t => t.classList.toggle("on", t.dataset.type === state.type));
    $("#tierDD .dd-label").textContent = state.tier === "all" ? "All tiers" : state.tier;
    $("#tierDD .dd-dot").style.background = state.tier === "all" ? "" : tierColors(state.tier)[0];
    $("#tierDD").querySelectorAll("button[data-v]").forEach(b => b.classList.toggle("on", b.dataset.v === state.tier));
    $("#count").textContent = `${list.length.toLocaleString()} item${list.length === 1 ? "" : "s"}`;
    $("#noResults").hidden = list.length > 0;
    renderChips();

    $("#grid").innerHTML = "";
    shown = 0;
    more();
    if (scrollUp) {
      const top = $("#bar").getBoundingClientRect().top + scrollY - (20 + MH_STICK());
      if (scrollY > top + 10) window.scrollTo({ top, behavior: "auto" });
    }
  }
  function renderChips() {
    const chips = [];
    if (state.type !== "all") chips.push(["type", TYPES.find(t => t.id === state.type).label]);
    if (state.tier !== "all") chips.push(["tier", state.tier + " tier"]);
    if (state.rp) chips.push(["rp", "Reborn-proof"]);
    if (state.shiny) chips.push(["shiny", "Has shiny"]);
    if (state.len || state.wid) chips.push(["size", `Size ${state.len || "any"} × ${state.wid || "any"}${state.swap ? " (either way)" : ""}`]);
    if (state.q) chips.push(["q", `“${state.q}”`]);
    $("#activeFilters").innerHTML = chips.map(([k, l]) => `<span class="af">${esc(l)}<button data-k="${k}" aria-label="Remove filter">×</button></span>`).join("") +
      (chips.length > 1 ? `<span class="af"><b>Clear all</b><button data-k="all" aria-label="Clear all">×</button></span>` : "");
  }
  $("#activeFilters").addEventListener("click", e => {
    const b = e.target.closest("button[data-k]"); if (!b) return;
    const k = b.dataset.k;
    if (k === "all") return clearAll();
    if (k === "type") state.type = "all";
    if (k === "tier") state.tier = "all";
    if (k === "rp") { state.rp = false; $("#rebornProof").checked = false; }
    if (k === "shiny") { state.shiny = false; $("#hasShiny").checked = false; }
    if (k === "size") { state.len = state.wid = null; $("#fLen").value = ""; $("#fWid").value = ""; }
    if (k === "q") { state.q = ""; $("#q").value = ""; }
    apply(false);
  });

  function cardHTML(it, i) {
    const [bg, fg] = tierColors(it.tier);
    const ev = it.event ? (EVENT_ICON[it.event] ? `<img class="ev-badge" src="${ICON + EVENT_ICON[it.event]}" alt="${esc(it.event)}" title="${esc(it.event)} item" />` : `<span class="ev-text">${esc(it.event)}</span>`) : "";
    const type = (TYPES.find(t => t.id === it.type) || {}).label || it.type;
    const sh = hasShiny(it) ? `<span class="shiny-badge" title="Has a shiny variant"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" fill="currentColor"/></svg></span>` : "";
    return `<div class="icard ${sh ? "has-shiny" : ""}" role="button" tabindex="0" data-i="${it._i}" style="--tb:${bg};--tf:${fg};--i:${i % PAGE}">
      ${ev}${sh}
      <div class="ic-img">${it.img ? `<img src="${esc(MH_SRC(it.img))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />` : ""}<span class="ph" ${it.img ? "hidden" : ""}>${esc(it.n[0])}</span></div>
      <h3>${esc(it.n)}</h3>
      <span class="tier-pill">${esc(it.tier)}</span>
      <span class="ic-type">${esc(type.replace(/s$/, ""))}</span>
      ${it._mpu != null ? `<span class="ic-stat st-mpu" title="Multiplier per length (MPU)">MPU x${fmtNum(it._mpu)}</span>` : `<span class="ic-stat st-mpu none">No MPU</span>`}
      ${it._len != null ? `<span class="ic-stat st-size" title="Length × Width">${fmtNum(it._len)} × ${fmtNum(it._wid)}<small>L × W</small></span>` : `<span class="ic-stat st-size none">No size</span>`}
    </div>`;
  }
  function more() {
    if (shown >= list.length) return;
    const frag = document.createElement("div");
    frag.innerHTML = list.slice(shown, shown + PAGE).map((it, k) => cardHTML(it, shown + k)).join("");
    frag.querySelectorAll("img:not(.ev-badge)").forEach(img => {
      img.addEventListener("load", () => img.classList.add("ok"));
      img.addEventListener("error", () => { img.remove(); });
      if (img.complete && img.naturalWidth) img.classList.add("ok");
    });
    frag.querySelectorAll(".ic-img").forEach(box => {
      const img = box.querySelector("img");
      if (img) img.addEventListener("error", () => { box.querySelector(".ph").hidden = false; });
    });
    $("#grid").append(...frag.children);
    shown = Math.min(list.length, shown + PAGE);
  }
  new IntersectionObserver(es => { if (es[0].isIntersecting) more(); }, { rootMargin: "900px 0px" }).observe($("#sentinel"));

  $("#grid").addEventListener("click", e => { const c = e.target.closest(".icard"); if (c) openItem(+c.dataset.i, c); });
  $("#grid").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("icard")) { e.preventDefault(); openItem(+e.target.dataset.i, e.target); } });

  /* ---------- Modal ---------- */
  const wrap = $("#modal"), modal = wrap.querySelector(".modal"), body = $("#mBody");
  let cur = null, originEl = null;
  const modalOpen = () => wrap.classList.contains("open");

  const LABELS = {
    item_size: "Size", source: "Source", created_by: "Created by", cost: "Cost", sell: "Sell value", rp_needed: "RP to unlock",
    life_required: "Life required", rarity: "Rarity", reborn_proof: "Reborn-proof", sacrifice_proof: "Sacrifice-proof", soulbound: "Soulbound",
    drop_rate: "Drop rate", ore_worth: "Ore worth", ore_size: "Ore size", ore_material: "Ore material",
    upgrade_counter: "Upgrade counter", upgrade_limit: "Upgrade limit", multiplier_length: "Multiplier per length (MPU)", conveyor_speed: "Conveyor speed",
    conveyor_elevation: "Conveyor height", conveyor_wall: "Conveyor walls", cell_compatibility: "Cell furnace compatible", rp_yield: "RP yield",
    shiny: "Shiny variant", bok_multiplier: "Book of Knowledge", catalyst: "Catalyst", damage: "Damage", range: "Range", ammo: "Ammo", f_rate: "Fire rate",
    beam_size: "Beam size", item_vfx: "Visual effects", status: "Status", date_retired: "Retired on", retire_reason: "Why it was retired",
    date_removed: "Removed on", reason: "Reason", unwraps_into: "Unwraps into", special_ability: "Special ability", itemid: "Item ID",
  };
  const STAT_ORDER = ["drop_rate","ore_worth","ore_size","ore_material","multiplier_length","upgrade_counter","upgrade_limit","conveyor_speed","conveyor_elevation","conveyor_wall",
    "cell_compatibility","rp_yield","rp_needed","life_required","rarity","shiny","bok_multiplier","catalyst","damage","range","ammo","f_rate","beam_size","special_ability","item_vfx",
    "reborn_proof","sacrifice_proof","soulbound","unwraps_into","status","date_retired","retire_reason","date_removed","reason","itemid"];
  const EL_COLORS = { Aether: "#d9d9d9", Water: "#4f9bff", Earth: "#2fbf5b", Fire: "#ff6a2a", Order: "#fff3c4", Entropy: "#d1314f" };

  // "⟦Item⟧" markers become links to that item's popup when we have it
  function rich(text) {
    text = String(text ?? "").replace(/\b(Shards of Life|Research Points|Unobtainium Crystals) \1\b/g, "$1");
    return esc(text).replace(/⟦([^⟧]+)⟧/g, (_, n) => {
      const it = byName.get(n.toLowerCase().replace(/&amp;/g, "&").replace(/&#39;/g, "'"));
      return it ? `<button class="inl" data-goto="${it._i}">${n}</button>` : `<b>${n}</b>`;
    });
  }
  function irefs(names) {
    return `<div class="irefs">${names.map(n => {
      const it = byName.get(n.toLowerCase());
      return it
        ? `<button class="iref" data-goto="${it._i}"><img src="${esc(imgUrl(it.img, 64) || "")}" referrerpolicy="no-referrer" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />${esc(it.n)}</button>`
        : `<span class="iref nolink">${esc(n)}</span>`;
    }).join("")}</div>`;
  }
  /* Ore effects & materials: link to the Status Effects page with the same animated text */
  const FX = window.MH_FX;
  const SE = "status-effects.html";
  const matHref = d => `${SE}#${d[2] ? "mat-" + d[1] : "materials"}`;
  function matHTML(v) {
    if (!FX) return rich(v);
    return esc(v).replace(FX.matRe, m => {
      const d = FX.matBy[m.toLowerCase()];
      const label = d[1] === "crackedlava" ? "Cracked Lava" : m;
      return `<a class="matlink" href="${matHref(d)}" title="${d[2] ? "See " + esc(label) + " on the Status Effects page" : "See ore materials on the Status Effects page"}"><span class="mname m-${d[1]}">${esc(label)}</span></a>`;
    });
  }
  function oreFxHTML(it) {
    if (!FX) return "";
    const f = it.f;
    const effects = FX.detect([f.effects || "", f.drawbacks || ""].join("\n"), it.n);
    const mats = [];
    const seen = new Set();
    const addMat = (name, roleTxt) => {
      const d = FX.matBy[name.toLowerCase()]; if (!d || seen.has(d[1])) return; seen.add(d[1]);
      mats.push({ d, label: d[1] === "crackedlava" ? "Cracked Lava" : d[0], roleTxt });
    };
    if (f.ore_material) for (const m of String(f.ore_material).matchAll(FX.matRe)) addMat(m[1], "Ore material");
    if (FX.KNOWN_MAT[it.n]) addMat(FX.KNOWN_MAT[it.n], "Turns ore into");
    if (!effects.length && !mats.length) return "";
    let i = 0;
    return `<div class="m-fx">` +
      mats.map(m => `<a class="fxchip mat" style="--i:${i++}" href="${matHref(m.d)}"><span class="mname m-${m.d[1]}">${esc(m.label)}</span><small><em>${m.roleTxt}</em><i>Details →</i></small></a>`).join("") +
      effects.map(e => `<a class="fxchip" style="--i:${i++};--c:${(FX.STYLE[e.slug] || ["#fff"])[0]}" href="${SE}#${e.slug}" title="${esc(e.name)} on the Status Effects page"><span class="fxslot" data-slug="${e.slug}" data-name="${esc(e.name)}"></span><small><em>${e.role}</em><i>Details →</i></small></a>`).join("") +
      `</div>`;
  }

  /* Extra wiki sections: outcome/chance tables, ore value functionality, other details */
  const pctOf = s => {
    let m = String(s).match(/(\d+(?:\.\d+)?)\s?%/); if (m) return +m[1];
    m = String(s).match(/(\d+)\s?\/\s?(\d+)/); if (m) return +m[1] / +m[2] * 100;
    m = String(s).match(/(\d+)\s(?:in|out of)\s(\d+)/); if (m) return +m[1] / +m[2] * 100;
    return null;
  };
  const fmtPct = p => p >= 10 ? Math.round(p * 10) / 10 + "%" : p >= 1 ? Math.round(p * 100) / 100 + "%" : +p.toPrecision(2) + "%";
  function tableHTML(tb, chance) {
    const ch = chance ? tb.ch : -1;
    const cols = (tb.head.length ? tb.head : tb.rows[0]).map((_, i) => i);
    const order = ch >= 0 ? [...cols.filter(i => i !== ch), ch] : cols;   // chance column last
    const head = tb.head.length && tb.head.some(Boolean) ? `<thead><tr>${order.map(i => `<th>${rich(tb.head[i] || "")}</th>`).join("")}</tr></thead>` : "";
    const body = tb.rows.map((r, ri) => `<tr style="--r:${ri}">${order.map(i => {
      if (i !== ch) return `<td>${rich(r[i] || "")}</td>`;
      const p = pctOf(r[i]);
      const nothing = /^(nothing|none|no effect|nothing extra happens)/i.test(r[0] || "");
      return `<td class="pc-td"><div class="pc${nothing ? " none" : ""}"><i style="--w:${p == null ? 0 : Math.min(100, p)}%"></i><b>${rich(r[i] || "")}</b>${p != null && !/%/.test(r[i]) ? `<em>${fmtPct(p)}</em>` : ""}</div></td>`;
    }).join("")}</tr>`).join("");
    return `${tb.c ? `<p class="xt-cap">${rich(tb.c)}</p>` : ""}<div class="xt-wrap"><table class="xt${ch >= 0 ? " chance" : ""}">${head}<tbody>${body}</tbody></table></div>`;
  }
  function xBlock(s, chance) {
    return `${s.t ? `<p class="m-text">${rich(s.t)}</p>` : ""}${s.tb.map(tb => tableHTML(tb, chance)).join("")}`;
  }
  function chanceHTML(it) {
    const xs = (it.x || []).filter(s => s.k === "chance");
    if (!xs.length) return "";
    return xs.map(s => `<div class="xc">${s.h && s.h !== "Outcomes & chances" ? `<h5>${esc(s.h)}</h5>` : ""}${xBlock(s, true)}${s.auto ? `<p class="xt-note">Worked out from the item's description. Outcomes can overlap.</p>` : ""}</div>`).join("");
  }
  function oreFnHTML(it) {
    const xs = (it.x || []).filter(s => s.k === "ore");
    if (!xs.length) return "";
    return `<div class="ore-fn">${xs.map(s => `<div class="of-sec"><small>${/^ore value( functionality)?$/i.test(s.h) ? "How it's worked out" : esc(s.h)}</small>${xBlock(s, false)}</div>`).join("")}</div>`;
  }
  function infoHTML(it) {
    return (it.x || []).filter(s => s.k === "info").map(s => sec(esc(s.h), xBlock(s, false))).join("");
  }

  function sec(title, html) { return html ? `<section class="m-sec"><h4>${title}</h4>${html}</section>` : ""; }

  function buildModal(it) {
    const [bg, fg] = tierColors(it.tier);
    modal.style.setProperty("--tb", bg);
    modal.style.setProperty("--tf", fg);
    const f = it.f;
    const type = (TYPES.find(t => t.id === it.type) || {}).label || it.type;
    const ev = it.event ? `<span class="chip2">${EVENT_ICON[it.event] ? `<img src="${ICON + EVENT_ICON[it.event]}" alt="" />` : ""}${esc(it.event)}</span>` : "";
    const q = (k, l, wide) => f[k] || (k === "date" && it.date) ? `<div class="mq ${wide ? "wide" : ""}"><span>${l}</span><b>${rich(k === "date" ? it.date : f[k])}</b></div>` : "";

    const stats = STAT_ORDER.filter(k => f[k]).map((k, i) => {
      const v = f[k];
      const cls = /^yes\b/i.test(v) ? "yes" : /^no\b/i.test(v) ? "no" : "";
      const val = k === "ore_material" ? matHTML(v) : rich(v);
      const fn = k === "ore_worth" ? oreFnHTML(it) : "";
      return `<div class="ms${fn ? " wide" : ""}" style="--i:${i}"><span>${LABELS[k] || k}</span><b class="${cls}">${val}</b>${fn}</div>`;
    }).join("");

    let elements = "";
    if (f.elements) {
      const vals = Object.entries(f.elements).map(([k, v]) => [k, parseFloat(v) || 0, v]);
      const max = Math.max(1, ...vals.map(v => Math.abs(v[1])));
      elements = `<div class="elements">${vals.map(([k, n, raw]) =>
        `<div class="el" style="--ec:${EL_COLORS[k]}"><div class="bar"><i class="${n < 0 ? "neg" : ""}" style="--h:${Math.abs(n) / max * 100}%"></i></div><b>${esc(raw)}</b><span>${k}</span></div>`).join("")}</div>`;
    }
    const craft = [
      f.evolve_from && `<p class="m-text" style="margin-bottom:6px">Evolves from</p>${irefs(f.evolve_from)}`,
      f.evolution && `<p class="m-text" style="margin:10px 0 6px">Evolves into</p>${irefs(f.evolution)}`,
      f.fusion_between && `<p class="m-text" style="margin:10px 0 6px">Fusion of</p>${irefs(f.fusion_between)}`,
      f.fuse_into && `<p class="m-text" style="margin:10px 0 6px">Fuses into</p>${irefs(f.fuse_into)}`,
    ].filter(Boolean).join("");
    const sub = f.submission && f.submission.name
      ? `<div class="sub-card"><b>${esc(f.submission.name)}</b>${f.submission.date ? `<small>${esc(f.submission.date)}</small>` : ""}${f.submission.description ? `<p>${esc(f.submission.description)}</p>` : ""}${f.submission.effects ? `<p><b>Proposed effect:</b> ${esc(f.submission.effects)}</p>` : ""}</div>` : "";
    const cats = it.cats.filter(c => c !== it.tier && c !== it.type).slice(0, 18);

    body.innerHTML = `
      <aside class="m-side">
        <div class="m-img">${it.img ? `<img src="${esc(imgUrl(it.img, 400))}" referrerpolicy="no-referrer" alt="${esc(it.n)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'${esc(it.n[0])}'}))" />` : `<span class="ph">${esc(it.n[0])}</span>`}</div>
        ${variantsHTML(it)}
        <div class="m-chips"><span class="tier-pill" style="--tb:${bg};--tf:${fg}">${esc(it.tier)}</span><span class="chip2">${esc(type.replace(/s$/, ""))}</span>${ev}</div>
        <div class="m-quick" data-cur-money>
          ${q("cost", "Cost")}${q("sell", "Sells for")}${q("item_size", "Size")}${q("date", "Added")}${q("source", "Where to get it", true)}${q("created_by", "Created by", true)}
        </div>
        <div class="m-actions">
          <a href="${WIKI + encodeURIComponent((it.page || it.n).replace(/ /g, "_"))}" target="_blank" rel="noopener">Open on the Fandom wiki ↗</a>
          <button data-copy>Copy link to this item</button>
        </div>
      </aside>
      <div class="m-main">
        <h2 id="mName">${esc(it.n)}</h2>
        ${it.quote ? `<p class="m-quote">${rich(it.quote)}</p>` : ""}
        ${sec("Effects", f.effects && `<div class="m-effect">${rich(f.effects)}</div>`)}
        ${sec("Drawbacks", f.drawbacks && `<div class="m-effect bad">${rich(f.drawbacks)}</div>`)}
        ${sec("Ore effects", oreFxHTML(it))}
        ${sec("Outcomes & chances", chanceHTML(it))}
        ${sec("Requirements", f.requirements && `<div class="m-effect req">${rich(f.requirements)}</div>`)}
        ${sec("Stats", stats && `<div class="m-stats" data-cur-money>${stats}</div>`)}
        ${sec("Evolutions & fusions", craft)}
        ${sec("Elements", elements)}
        ${sec("Overview", it.overview && `<p class="m-text">${rich(it.overview)}</p>`)}
        ${infoHTML(it)}
        ${sec("Related items", f.related_items && irefs(f.related_items))}
        ${sec("Related", f.related_items_text && `<p class="m-text">${rich(f.related_items_text)}</p>`)}
        ${sec("Events", f.item_events && `<p class="m-text">${rich(f.item_events)}</p>`)}
        ${sec("Notes", f.other_notes && `<p class="m-text">${rich(f.other_notes)}</p>`)}
        ${sec("Original idea", sub)}
        ${sec("Categories", cats.length && `<div class="cat-chips">${cats.map(c => `<span>${esc(c)}</span>`).join("")}</div>`)}
      </div>`;
    if (FX) body.querySelectorAll(".fxslot").forEach(sl => sl.replaceWith(FX.fxName({ slug: sl.dataset.slug, name: sl.dataset.name })));
    body.querySelector(".m-main").scrollTop = 0;
    body.querySelector(".m-side").scrollTop = 0;
    body.querySelector("[data-copy]").addEventListener("click", async () => {
      const url = location.href.split("#")[0] + "#item=" + encodeURIComponent(it.n);
      try { await navigator.clipboard.writeText(url); } catch {}
      MH.toast("Link copied");
    });
    bindVariants(it);
    if (window.MH_ACCOUNT && MH_ACCOUNT.ready && window.MH_COMMENTS) {
      const slot = document.createElement("section");
      body.querySelector(".m-main").appendChild(slot);
      MH_COMMENTS.mount(slot, "item:" + it.n, { compact: true, title: "Comments", eager: true });
    }
    const pos = list.indexOf(it);
    $("#mPrev").disabled = pos <= 0;
    $("#mNext").disabled = pos < 0 || pos >= list.length - 1;
    history.replaceState(null, "", "#item=" + encodeURIComponent(it.n));
  }

  /* ---------- Image variants (normal / HD / shiny / limited shiny) ---------- */
  function startVariant(it) {
    if (!it.v) return -1;
    const base = (it.img || "").split("/revision/")[0];
    let k = it.v.findIndex(v => base && base.endsWith(v.u.split("/revision/")[0]));
    if (k < 0) k = it.v.findIndex(v => !v.s);
    return Math.max(0, k);
  }
  function variantsHTML(it) {
    if (!it.v || it.v.length < 2) return "";
    const k = startVariant(it);
    return `<div class="v-caption" id="vCaption"></div>
      <div class="variants" role="tablist" aria-label="Image variants">${it.v.map((v, i) => `
        <button class="vbtn ${v.s ? "shiny" : ""} ${i === k ? "on" : ""}" role="tab" aria-selected="${i === k}" data-v="${i}" title="${esc(v.nm ? v.nm + " " + it.n : v.l)}">
          <span class="vthumb"><img src="${esc(vUrl(v, 96))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'" /></span>
          <span class="vl">${v.s ? `<svg viewBox="0 0 24 24" width="11" height="11"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" fill="currentColor"/></svg>` : ""}${esc(v.l)}</span>
          ${v.ev && EVENT_ICON[v.ev] ? `<img class="vev" src="${ICON + EVENT_ICON[v.ev]}" alt="${esc(v.ev)}" />` : ""}
        </button>`).join("")}</div>`;
  }
  function caption(it, v) {
    const c = $("#vCaption");
    if (!c) return;
    c.innerHTML = v.s
      ? `<span class="vc-tag">${esc(v.l)}${v.ev ? " · " + esc(v.ev) : ""}</span><b>${esc(v.nm ? v.nm + " " + it.n : it.n)}</b>`
      : `<span class="vc-tag plain">${esc(v.l)}</span>`;
  }
  function bindVariants(it) {
    const wrapV = body.querySelector(".variants");
    if (!wrapV) { modal.classList.remove("shiny-on"); return; }
    const k = startVariant(it);
    caption(it, it.v[k]);
    modal.classList.toggle("shiny-on", !!it.v[k].s);
    wrapV.addEventListener("click", e => {
      const b = e.target.closest(".vbtn"); if (!b || b.classList.contains("on")) return;
      const v = it.v[+b.dataset.v];
      wrapV.querySelectorAll(".vbtn").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
      swapImage(vUrl(v, 400), it);
      caption(it, v);
      modal.classList.toggle("shiny-on", !!v.s);
      if (v.s) sparkle();
    });
  }
  function swapImage(src, it) {
    const box = body.querySelector(".m-img");
    const old = box.querySelector("img, .ph");
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.alt = it.n;
    img.className = "v-in";
    img.src = src;
    img.onerror = () => { img.replaceWith(Object.assign(document.createElement("span"), { className: "ph", textContent: it.n[0] })); };
    if (old) {
      old.classList.add("v-out");
      setTimeout(() => old.remove(), 260);
    }
    box.appendChild(img);
  }
  function sparkle() {
    if (MH.reduceMotion) return;
    const box = body.querySelector(".m-img");
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("i");
      s.className = "spk";
      const a = (i / 14) * Math.PI * 2 + Math.random() * .4;
      const d = 90 + Math.random() * 60;
      s.style.setProperty("--x", Math.cos(a) * d + "px");
      s.style.setProperty("--y", Math.sin(a) * d + "px");
      s.style.setProperty("--d", Math.random() * 120 + "ms");
      s.style.setProperty("--s", (.6 + Math.random() * .8).toFixed(2));
      box.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    }
  }

  function openItem(i, fromEl) {
    const it = ITEMS[i];
    const wasOpen = modalOpen();
    cur = it;
    originEl = fromEl || document.querySelector(`.icard[data-i="${i}"]`);
    buildModal(it);
    if (wasOpen) return;
    wrap.classList.add("open");
    wrap.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    const to = modal.getBoundingClientRect();
    let from = null;
    if (originEl && !MH.reduceMotion) {
      const r = originEl.getBoundingClientRect();
      from = `translate(${r.left + r.width / 2 - (to.left + to.width / 2)}px, ${r.top + r.height / 2 - (to.top + to.height / 2)}px) scale(${Math.max(.15, r.width / to.width)}, ${Math.max(.15, r.height / to.height)})`;
    }
    modal.animate([
      { transform: from || "translateY(30px) scale(.96)", opacity: 0, borderRadius: "24px" },
      { transform: "none", opacity: 1, borderRadius: "30px" },
    ], { duration: MH.reduceMotion ? 1 : 520, easing: "cubic-bezier(.2,.9,.25,1)", fill: "forwards" });
    setTimeout(() => wrap.querySelector(".m-close").focus({ preventScroll: true }), 60);
  }
  function closeModal() {
    if (!modalOpen()) return;
    const target = cur && document.querySelector(`.icard[data-i="${cur._i}"]`);
    const to = modal.getBoundingClientRect();
    let end = "translateY(24px) scale(.96)";
    if (target && !MH.reduceMotion) {
      const r = target.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight)
        end = `translate(${r.left + r.width / 2 - (to.left + to.width / 2)}px, ${r.top + r.height / 2 - (to.top + to.height / 2)}px) scale(${Math.max(.15, r.width / to.width)}, ${Math.max(.15, r.height / to.height)})`;
    }
    const a = modal.animate([{ transform: "none", opacity: 1 }, { transform: end, opacity: 0 }], { duration: MH.reduceMotion ? 1 : 380, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    wrap.classList.remove("open");
    a.onfinish = () => {
      wrap.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      if (target) target.focus({ preventScroll: true });
    };
    history.replaceState(null, "", location.pathname + location.search);
  }
  function step(d) {
    const pos = list.indexOf(cur);
    const next = list[pos + d];
    if (!next) return;
    while (shown <= pos + d + 1 && shown < list.length) more();
    buildModal(next);
    cur = next;
    body.classList.remove("swap-l", "swap-r"); void body.offsetWidth;
    body.classList.add(d < 0 ? "swap-l" : "swap-r");
  }
  wrap.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) return closeModal();
    const g = e.target.closest("[data-goto]");
    if (g) { const it = ITEMS[+g.dataset.goto]; cur = it; buildModal(it); body.classList.remove("swap-l", "swap-r"); void body.offsetWidth; body.classList.add("swap-r"); }
  });
  $("#mPrev").addEventListener("click", () => step(-1));
  $("#mNext").addEventListener("click", () => step(1));
  document.addEventListener("keydown", e => {
    if (!modalOpen()) return;
    if (e.key !== "Escape" && e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return; // typing a comment
    if (e.key === "Escape") closeModal();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  /* ---------- Back to top ---------- */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));

  /* ---------- Init ---------- */
  apply(false);
  const m = location.hash.match(/^#item=(.+)$/);
  if (m) { const it = byName.get(decodeURIComponent(m[1]).toLowerCase()); if (it) setTimeout(() => openItem(it._i, null), 300); }
})();
