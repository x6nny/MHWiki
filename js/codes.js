/* =========================================================
   Codes page
   Data: window.MH_CODES (js/codes-data.js)
   ========================================================= */
(() => {
  const D = window.MH_CODES;
  const BASE = window.MH_IMG_BASE;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (p, size = 96) => p ? `${BASE}${p}/revision/latest/scale-to-width-down/${size}` : null;
  const ITEM_LINK = n => "item-index.html#item=" + encodeURIComponent(n);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parseDate = s => new Date(s + "T12:00:00Z");
  const fmt = s => { const d = parseDate(s); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  const fmtLong = s => { const d = parseDate(s); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
  const TODAY = new Date();
  const days = (a, b) => Math.max(1, Math.round(((b ? parseDate(b) : TODAY) - parseDate(a)) / 864e5));
  const plural = (n, w) => `${n.toLocaleString("en-US")} ${w}${n === 1 ? "" : "s"}`;
  const lifeText = n => n >= 365 ? (n / 365 >= 1.95 ? `${(n / 365).toFixed(1).replace(/\.0$/, "")} years` : `${Math.round(n / 30.4)} months`) : n >= 60 ? `${Math.round(n / 30.4)} months` : plural(n, "day");

  const TIER = Object.assign({}, D.tiers, { Exotic: "#00e5ff" });
  const BOX_COLOR = {
    regular: "#ffb347", unreal: "#c56bff", inferno: "#ff6a1a", luxury: "#f0d77a", "red-banded": "#ff2e4e", spectral: "#5ad1ff",
    magnificent: "#7ab8ff", heavenly: "#d59cff", pumpkin: "#ff8a1c", festive: "#ff4d6d", birthday: "#ff9ccc", twitch: "#9146ff",
    easter: "#6fe0a8", "cake-raffle": "#c88bff",
  };
  const ICON = {
    uc: "../assets/items/uc-icon.webp", cash: "../assets/codes/cash.webp", candy: "../assets/codes/candy.webp",
    goldclover: "../assets/codes/goldclover.webp", shiny: "../assets/codes/shinycharm.webp", twitch: "../assets/boxes/twitch-coin.webp",
    luckyclover: "../assets/boxes/new-lucky-clover.webp", magicclover: "../assets/boxes/new-lucky-clover.webp", banhammer: "../assets/codes/banhammer.webp",
  };
  const KCOLOR = { uc: "#ec54d0", cash: "#40d565", candy: "#ff8a4c", goldclover: "#ffbf00", shiny: "#b4efff", twitch: "#a970ff", luckyclover: "#7cff6b", magicclover: "#4de0c9", gear: "#9fb4ff" };
  const NAME = { uc: "uC", cash: "Cash", candy: "Candy", goldclover: "Golden Clovers", twitch: "Twitch Coins", luckyclover: "Lucky Clover", magicclover: "Magic Clovers" };
  const SHIELD = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  const WRENCH = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L4 16.7 7.3 20l5.3-5.3a4 4 0 0 0 5.1-5.4l-2.5 2.5-2.6-.6-.6-2.6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

  const qtyLabel = r => r.q && r.q !== "1" ? r.q : "";

  /* One reward chip */
  function rewardHTML(r) {
    if (r.k === "item") {
      const c = TIER[r.tier] || "#ccb490";
      const src = img(r.img, 96);
      return `<a class="rw" href="${ITEM_LINK(r.n)}" style="--c:${c}" title="Open ${esc(r.n)} in the Item Index">
        ${src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
        <span>${esc(r.n)}${r.tier ? ` <small>${esc(r.tier)}</small>` : ""}</span>${r.q !== "1" ? `<span class="q">×${esc(r.q)}</span>` : ""}</a>`;
    }
    if (r.k === "box") {
      const c = BOX_COLOR[r.slug] || "#9aa6c4";
      const name = r.random ? "Random " + r.n : r.n + (r.q !== "1" ? "es" : "");
      return `<a class="rw" href="mystery-boxes.html#${esc(r.slug)}-box" style="--c:${c}" title="${esc(r.n)} on the Mystery Boxes page">
        <img src="../assets/boxes/${esc(r.slug)}-box.webp" alt="" loading="lazy" /><span>${esc(name)}</span>${r.q !== "1" ? `<span class="q">×${esc(r.q)}</span>` : ""}</a>`;
    }
    if (r.k === "gear") {
      const icon = r.img ? `<img src="${ICON[r.img]}" alt="" loading="lazy" />` : `<span class="gly">${SHIELD}</span>`;
      return `<span class="rw" style="--c:${KCOLOR.gear}">${icon}<span>${esc(r.n)}${r.note ? ` <small>${esc(r.note)}</small>` : ""}</span></span>`;
    }
    if (r.k === "shiny") return `<span class="rw" style="--c:${KCOLOR.shiny}"><img src="${ICON.shiny}" alt="" loading="lazy" /><span>Shiny Guarantee</span>${r.q !== "1" ? `<span class="q">×${esc(r.q)}</span>` : ""}</span>`;
    // currencies and clovers: amount first
    const amount = r.k === "cash" ? "$" + r.q : r.q;
    return `<span class="rw ${r.k === "magicclover" ? "magic" : ""}" style="--c:${KCOLOR[r.k] || "#9aa6c4"}"><img src="${ICON[r.k]}" alt="" loading="lazy" /><span class="q">${esc(amount)}</span><span>${esc(NAME[r.k] || r.k)}</span></span>`;
  }
  const rewardsHTML = (c, extra = "") => {
    if (c.util) return `<div class="rws ${extra}"><span class="rw util"><span class="gly">${WRENCH}</span><span>${esc(c.util)}</span></span></div>`;
    let h = `<div class="rws ${extra}">${c.rewards.map(rewardHTML).join("")}</div>`;
    if (c.alt) h += `<p class="ac-note" style="margin-top:6px">Loot-box-banned countries: ${c.alt.map(a => a.k === "uc" ? a.q + " uC" : a.q).join(", ")}</p>`;
    return h;
  };
  const rewardText = c => c.util ? c.util : c.rewards.map(r => {
    if (r.k === "item") return `${r.q !== "1" ? r.q + "× " : ""}${r.n}`;
    if (r.k === "box") return `${r.q !== "1" ? r.q + "× " : ""}${r.random ? "Random " : ""}${r.n}`;
    if (r.k === "cash") return `$${r.q} cash`;
    if (r.k === "gear" || r.k === "shiny") return r.n;
    return `${r.q} ${NAME[r.k] || r.k}`;
  }).join(", ");

  /* ---------- Data slices ---------- */
  const all = D.codes;
  const active = all.filter(c => c.active);
  const limited = all.filter(c => c.limited);
  const expired = all.filter(c => !c.active && !c.limited);
  const ucNum = q => { const m = String(q).replace(/,/g, "").match(/^(\d+)(k)?/i); return m ? +m[1] * (m[2] ? 1000 : 1) : 0; };
  const ucOf = c => c.rewards.filter(r => r.k === "uc").reduce((s, r) => s + ucNum(r.q), 0);
  const totalUc = all.reduce((s, c) => s + ucOf(c), 0);
  const firstYear = Math.min(...all.map(c => +c.added.slice(0, 4)));
  const lastYear = TODAY.getFullYear();

  /* ---------- Hero ---------- */
  $("#lede").innerHTML = `Free uC, boxes and items from the developers. There are <b>${active.length} codes</b> working right now, plus an archive of all <b>${expired.length + limited.length}</b> that have expired since ${fmt(all[all.length - 1].added)}.`;
  const stats = [["#stActive", active.length], ["#stTotal", all.length], ["#stUc", totalUc], ["#stYears", lastYear - firstYear]];
  setTimeout(() => stats.forEach(([s, n]) => MH.countUp($(s), n)), 500);
  $("#updated").textContent = fmtLong(D.updated);

  /* ---------- Copy helper ---------- */
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch {}
      ta.remove(); return ok;
    }
  }
  function sparks(x, y, colors) {
    if (MH.reduceMotion) return;
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("i");
      s.className = "spark";
      s.style.left = x + "px"; s.style.top = y + "px";
      s.style.background = colors[i % colors.length];
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
      s.animate([
        { transform: "translate(-50%,-50%) scale(1) rotate(0)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 30}px)) scale(.2) rotate(${Math.random() * 540}deg)`, opacity: 0 },
      ], { duration: 700 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => s.remove();
    }
  }

  /* ---------- Active tickets ---------- */
  const PALETTE = [["#ec54d0", "#38d9ff"], ["#ffbf00", "#ff6b9a"], ["#34f5a4", "#38d9ff"], ["#a77bff", "#ff6bb5"], ["#38d9ff", "#7cff6b"], ["#ff8a4c", "#ffd16b"]];
  const heroArt = c => {
    const r = c.rewards[0]; if (!r) return "";
    if (r.k === "item") return img(r.img, 160);
    if (r.k === "box") return `../assets/boxes/${r.slug}-box.webp`;
    return ICON[r.k] || ICON[r.img] || null;
  };
  const artColor = c => {
    const r = c.rewards[0]; if (!r) return null;
    if (r.k === "item") return TIER[r.tier];
    if (r.k === "box") return BOX_COLOR[r.slug];
    return KCOLOR[r.k];
  };
  $("#tickets").innerHTML = active.map((c, i) => {
    const [c1, c2] = PALETTE[i % PALETTE.length];
    const art = heroArt(c);
    const isNew = days(c.added) <= 45;
    const span = days(c.added);
    return `<article class="ticket reveal ${isNew ? "is-new" : ""}" data-code="${esc(c.code)}" style="--c:${artColor(c) || c1};--c2:${c2};--sd:${-i * .8}s">
      ${isNew ? `<span class="new-badge">NEW</span>` : ""}
      <span class="stamp">Copied</span>
      <div class="tk-body">
        <div class="tk-top">
          <span class="tk-glow"></span>
          <div class="tk-code"><small>CODE</small><code>${esc(c.code)}</code></div>
          <button class="tk-copy" aria-label="Copy ${esc(c.code)}">
            <svg viewBox="0 0 24 24" width="15" height="15"><rect x="8" y="8" width="12" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>
            <span>Copy</span>
          </button>
        </div>
        <div class="tk-bottom">
          <div class="tk-items">
            ${art ? `<div class="tk-art"><img src="${esc(art)}" alt="" referrerpolicy="no-referrer" /></div>` : ""}
            ${rewardsHTML(c)}
          </div>
          ${c.note ? `<p class="tk-note">${esc(c.note)}</p>` : ""}
          <div class="tk-meta"><span>Listed since <b>${fmt(c.added)}</b></span><span>Working for <b>${lifeText(span)}</b></span></div>
        </div>
      </div>
    </article>`;
  }).join("");
  document.querySelectorAll("#tickets .ticket").forEach(MH.reveal);

  $("#tickets").addEventListener("click", async e => {
    const t = e.target.closest(".ticket");
    if (!t || e.target.closest("a")) return;
    const code = t.dataset.code;
    if (await copy(code)) {
      t.classList.remove("copied"); void t.offsetWidth; t.classList.add("copied");
      const b = t.querySelector(".tk-copy").getBoundingClientRect();
      sparks(b.left + b.width / 2, b.top + b.height / 2, [getComputedStyle(t).getPropertyValue("--c"), "#ffd76b", "#7cff6b", "#7ad7ff"]);
      t.querySelector(".tk-copy span").textContent = "Copied!";
      MH.toast(`Copied “${code}”. Paste it into the codes box in-game.`);
      clearTimeout(t._t);
      t._t = setTimeout(() => { t.classList.remove("copied"); t.querySelector(".tk-copy span").textContent = "Copy"; }, 2200);
    } else MH.toast("Couldn't copy. Select the code and copy it by hand.");
  });
  $("#copyAll").addEventListener("click", async () => {
    const btn = $("#copyAll");
    if (await copy(active.map(c => c.code).join("\n"))) {
      btn.classList.add("done"); btn.querySelector("span").textContent = `Copied ${active.length} codes`;
      const b = btn.getBoundingClientRect(); sparks(b.left + b.width / 2, b.top + b.height / 2, ["#34f5a4", "#ffd76b", "#ec54d0"]);
      MH.toast("All active codes copied, one per line.");
      setTimeout(() => { btn.classList.remove("done"); btn.querySelector("span").textContent = "Copy all codes"; }, 2400);
    }
  });

  /* ---------- How codes work ---------- */
  $("#introText").textContent = D.intro.join(" ");
  const RULE_ICON = [
    ["#38d9ff", `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 18L9 6l5 12M5.8 14h6.4M15 18v-5.5a2.5 2.5 0 0 1 5 0V18m0-3h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`],
    ["#34f5a4", `<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12.5l2.7 2.7L16.5 9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`],
    ["#ffb347", `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 3h10M7 21h10M8 3v4l4 5-4 5v4M16 3v4l-4 5 4 5v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`],
    ["#ec54d0", `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 4h11l3 3v13H5z M8 4v5h7V4 M8 20v-6h8v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`],
  ];
  $("#rules").innerHTML = D.rules.map(([h, p], i) => `<div class="rule glass reveal" style="--c:${RULE_ICON[i][0]}"><div class="ri">${RULE_ICON[i][1]}</div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join("");
  $("#sources").innerHTML = D.sources.map(s => `<div class="src glass reveal"><img src="../assets/codes/${s.k}.webp" alt="${esc(s.label)}" /><div><span>New codes are posted on ${esc(s.label)}</span>${s.links.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join("")}</div></div>`).join("");
  document.querySelectorAll("#rules .reveal, #sources .reveal").forEach(MH.reveal);

  /* ---------- Years chart + facts ---------- */
  const byYear = {};
  for (let y = firstYear; y <= lastYear; y++) byYear[y] = 0;
  all.forEach(c => byYear[+c.added.slice(0, 4)]++);
  const maxY = Math.max(...Object.values(byYear));
  const chart = $("#chart");
  chart.innerHTML = Object.entries(byYear).map(([y, n], i) => `<div class="bar" role="button" tabindex="0" data-year="${y}" style="--i:${i}" aria-label="${y}: ${plural(n, "code")}. Show in archive."><b>${n}</b><div class="col" style="--h:${Math.max(4, n / maxY * 100)}%"></div><span>${y}</span></div>`).join("");
  const goYear = y => { resetFilters(); yearSel.value = y; render(); $("#archive").scrollIntoView({ behavior: MH.reduceMotion ? "auto" : "smooth" }); };
  chart.addEventListener("click", e => { const b = e.target.closest(".bar"); if (b) goYear(b.dataset.year); });
  chart.addEventListener("keydown", e => { const b = e.target.closest(".bar"); if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); goYear(b.dataset.year); } });

  const finished = all.filter(c => c.removed);
  const longest = [...all].filter(c => !c.limited && !c.util).sort((a, b) => days(b.added, b.removed) - days(a.added, a.removed))[0];
  const richest = [...all].sort((a, b) => ucOf(b) - ucOf(a))[0];
  const first = all[all.length - 1];
  const busiest = Object.entries(byYear).sort((a, b) => b[1] - a[1])[0];
  const shortest = finished.filter(c => !c.limited).sort((a, b) => days(a.added, a.removed) - days(b.added, b.removed))[0];
  const facts = [
    ["#38d9ff", "First code on the wiki", first.code, `Listed ${fmtLong(first.added)}. ${first.util || rewardText(first)}`],
    ["#34f5a4", "Longest-lasting reward", longest.code, `${rewardText(longest)}. Worked for about ${lifeText(days(longest.added, longest.removed))}${longest.active ? " and still going" : ""}.`],
    ["#ec54d0", "Most uC in one code", richest.code, `${ucOf(richest).toLocaleString("en-US")} uC${richest.alt ? " (in countries where loot boxes are banned)" : ""}, ${fmt(richest.added)}.`],
    ["#ffd16b", "Busiest year", busiest[0], `${plural(busiest[1], "new code")}. The shortest stay on the wiki was ${shortest.code}: taken off after ${plural(days(shortest.added, shortest.removed), "day")}.`],
  ];
  // uC from loot-box-banned alt rewards counts too for "most uC"
  const altRich = all.filter(c => c.alt).map(c => [c, c.alt.filter(a => a.k === "uc").reduce((s, a) => s + ucNum(a.q), 0)]).sort((a, b) => b[1] - a[1])[0];
  if (altRich && altRich[1] > ucOf(richest)) facts[2] = ["#ec54d0", "Most uC in one code", altRich[0].code, `${altRich[1].toLocaleString("en-US")} uC in countries where loot boxes are banned (${fmt(altRich[0].added)}). Elsewhere it gave boxes. The most uC for everyone was ${richest.code} with ${ucOf(richest)} uC.`];
  $("#facts").innerHTML = facts.map(([c, h, code, p]) => `<div class="fact glass reveal" style="--c:${c}"><span>${esc(h)}</span><code>${esc(code)}</code><p>${esc(p)}</p></div>`).join("");
  document.querySelectorAll("#facts .reveal").forEach(MH.reveal);
  MH.reveal(chart);

  /* ---------- Archive ---------- */
  const KINDS = [
    ["uc", "uC", ICON.uc, "#ec54d0", r => r.k === "uc"],
    ["box", "Boxes", "../assets/boxes/regular-box.webp", "#ffb347", r => r.k === "box"],
    ["item", "Items", "../assets/items/swag-iron-mine.webp", "#ccb490", r => r.k === "item"],
    ["twitch", "Twitch Coins", ICON.twitch, "#a970ff", r => r.k === "twitch"],
    ["clover", "Clovers", ICON.luckyclover, "#7cff6b", r => /clover/.test(r.k)],
    ["other", "Other", ICON.cash, "#40d565", r => ["cash", "candy", "shiny", "gear"].includes(r.k)],
  ];
  const kindOn = new Set();
  $("#kinds").innerHTML = KINDS.map(([k, label, ic, c]) => `<button class="kind" data-k="${k}" style="--c:${c}" aria-pressed="false"><img src="${ic}" alt="" />${label}</button>`).join("");
  $("#kinds").addEventListener("click", e => {
    const b = e.target.closest(".kind"); if (!b) return;
    const k = b.dataset.k;
    kindOn.has(k) ? kindOn.delete(k) : kindOn.add(k);
    b.classList.toggle("on", kindOn.has(k)); b.setAttribute("aria-pressed", kindOn.has(k));
    render();
  });
  const yearSel = $("#year"), sortSel = $("#sort"), q = $("#q");
  const expByYear = {};
  expired.forEach(c => { const y = c.added.slice(0, 4); expByYear[y] = (expByYear[y] || 0) + 1; });
  yearSel.innerHTML = `<option value="">All years</option>` + Object.keys(expByYear).sort().reverse().map(y => `<option value="${y}">${y} (${expByYear[y]})</option>`).join("");
  const maxLife = Math.max(...expired.map(c => days(c.added, c.removed)));
  const lifeW = n => `${Math.max(3, Math.sqrt(n / maxLife) * 100)}%`;
  const hay = c => (c.code + " " + rewardText(c) + " " + (c.note || "")).toLowerCase();

  function acHTML(c, i) {
    const life = days(c.added, c.removed);
    return `<article class="ac glass" style="--i:${i}">
      <div class="ac-top"><button class="ac-code" data-code="${esc(c.code)}" title="Copy (it won't work any more)">${hl(c.code)}</button><span class="ac-tag">EXPIRED</span></div>
      ${rewardsHTML(c)}
      ${c.note ? `<p class="ac-note">${esc(c.note)}</p>` : ""}
      <div class="ac-life"><span>${fmt(c.added)} → ${fmt(c.removed)}</span><span class="track"><i style="--w:${lifeW(life)}"></i></span><span>${lifeText(life)}</span></div>
    </article>`;
  }
  let term = "";
  const hl = s => {
    const e = esc(s);
    if (!term) return e;
    const i = s.toLowerCase().indexOf(term);
    return i < 0 ? e : esc(s.slice(0, i)) + "<mark>" + esc(s.slice(i, i + term.length)) + "</mark>" + esc(s.slice(i + term.length));
  };
  let yio;
  function render() {
    term = q.value.trim().toLowerCase();
    const y = yearSel.value, sort = sortSel.value;
    let list = expired.filter(c =>
      (!y || c.added.startsWith(y)) &&
      (!term || hay(c).includes(term)) &&
      (!kindOn.size || [...kindOn].some(k => c.rewards.some(KINDS.find(x => x[0] === k)[4]))));
    if (sort === "old") list.reverse();
    if (sort === "long") list.sort((a, b) => days(b.added, b.removed) - days(a.added, a.removed));
    if (sort === "az") list.sort((a, b) => a.code.localeCompare(b.code, "en", { sensitivity: "base" }));
    $("#count").innerHTML = `Showing <b>${list.length}</b> of ${expired.length} expired codes`;
    $("#empty").hidden = list.length > 0;
    let groups;
    if (sort === "new" || sort === "old") {
      groups = [];
      list.forEach(c => { const yr = c.added.slice(0, 4); let g = groups[groups.length - 1]; if (!g || g.y !== yr) groups.push(g = { y: yr, items: [] }); g.items.push(c); });
    } else groups = list.length ? [{ y: sort === "long" ? "Longest-lasting" : "A to Z", items: list }] : [];
    const el = $("#archiveList");
    el.innerHTML = groups.map(g => `<section class="yr"><div class="yr-head"><h3>${esc(g.y)}</h3><span>${plural(g.items.length, "code")}</span><i></i></div><div class="ac-grid">${g.items.map(acHTML).join("")}</div></section>`).join("");
    if (yio) yio.disconnect();
    yio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); yio.unobserve(e.target); } }), { threshold: 0, rootMargin: "0px 0px -60px 0px" });
    el.querySelectorAll(".yr").forEach(s => yio.observe(s));
  }
  let qt;
  q.addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(render, 120); });
  yearSel.addEventListener("change", render);
  sortSel.addEventListener("change", render);
  function resetFilters() {
    q.value = ""; yearSel.value = ""; sortSel.value = "new"; kindOn.clear();
    document.querySelectorAll(".kind").forEach(b => { b.classList.remove("on"); b.setAttribute("aria-pressed", "false"); });
  }
  $("#clear").addEventListener("click", () => { resetFilters(); render(); });
  $("#archiveList").addEventListener("click", async e => {
    const b = e.target.closest(".ac-code"); if (!b) return;
    if (await copy(b.dataset.code)) MH.toast(`Copied “${b.dataset.code}”. Heads up: this code has expired.`);
  });
  render();

  /* ---------- Limited ---------- */
  const LOCK = `<svg viewBox="0 0 24 24" width="18" height="18"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  $("#limGrid").innerHTML = limited.sort((a, b) => a.added.localeCompare(b.added)).map(c => `<article class="lim glass reveal">
    <code>${esc(c.code)}</code>
    ${rewardsHTML(c)}
    <div class="lock">${LOCK}<span>${esc(c.access)}</span></div>
    <div class="ac-life"><span>On the wiki ${fmt(c.added)} → ${fmt(c.removed)}</span></div>
  </article>`).join("");
  document.querySelectorAll("#limGrid .reveal").forEach(MH.reveal);

  /* ---------- Code checker ---------- */
  const input = $("#ckInput"), field = input.closest(".ck-field"), ghost = $("#ckGhost"), out = $("#ckResult");
  const norm = s => s.trim().toLowerCase().replace(/\s+/g, " ");
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 9;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function check(raw) {
    const v = norm(raw);
    if (!v) { out.innerHTML = ""; return; }
    const hits = all.filter(c => norm(c.code) === v).sort((a, b) => (b.active - a.active) || b.added.localeCompare(a.added));
    if (!hits.length) {
      const near = all.map(c => [c, lev(v, norm(c.code))]).filter(([, d]) => d <= 2).sort((a, b) => (b[0].active - a[0].active) || a[1] - b[1])[0];
      out.innerHTML = `<div class="ck-card bad"><div class="ck-top"><span class="ck-badge">Not found</span><code>${esc(raw.trim())}</code></div>
        <p>This code has never been listed on the wiki. Check the spelling, or it might be fake.</p>
        ${near ? `<p>Did you mean <button class="linkish" data-try="${esc(near[0].code)}">${esc(near[0].code)}</button>${near[0].active ? " (active)" : ""}?</p>` : ""}</div>`;
      return;
    }
    const c = hits[0];
    const others = hits.slice(1);
    if (c.active) {
      out.innerHTML = `<div class="ck-card"><div class="ck-top"><span class="ck-badge">✓ Active</span><code>${esc(c.code)}</code></div>
        <p>This code works. Redeem it for:</p>${rewardsHTML(c)}</div>`;
      const r = out.getBoundingClientRect(); sparks(r.left + 60, r.top + 20, ["#34f5a4", "#7cff6b", "#ffd76b"]);
    } else if (c.limited) {
      out.innerHTML = `<div class="ck-card lim"><div class="ck-top"><span class="ck-badge">Limited</span><code>${esc(c.code)}</code></div>
        <p>Only worked for players ${esc(c.access.charAt(0).toLowerCase() + c.access.slice(1))}. Removed from the wiki in <b>${fmt(c.removed)}</b>.</p>${rewardsHTML(c)}</div>`;
    } else {
      out.innerHTML = `<div class="ck-card old"><div class="ck-top"><span class="ck-badge">Expired</span><code>${esc(c.code)}</code></div>
        <p>Worked from <b>${fmt(c.added)}</b> to <b>${fmt(c.removed)}</b>. It used to give:</p>${rewardsHTML(c)}
        ${others.length ? `<p>The same code was also used in ${others.map(o => o.added.slice(0, 4)).join(", ")}.</p>` : ""}</div>`;
    }
  }
  $("#ckForm").addEventListener("submit", e => { e.preventDefault(); check(input.value); });
  out.addEventListener("click", e => { const b = e.target.closest("[data-try]"); if (b) { input.value = b.dataset.try; field.classList.add("typed"); check(b.dataset.try); } });
  input.addEventListener("input", () => { field.classList.toggle("typed", input.value.length > 0); if (!input.value) out.innerHTML = ""; });

  // typewriter placeholder cycling through active codes
  const samples = active.map(c => c.code);
  let si = 0, ci = 0, del = false;
  (function type() {
    const word = samples[si % samples.length];
    if (!del) { ci++; if (ci >= word.length) { del = true; ghost.textContent = word; return setTimeout(type, 1600); } }
    else { ci--; if (ci <= 0) { del = false; si++; } }
    ghost.textContent = word.slice(0, ci);
    setTimeout(type, del ? 40 : 85);
  })();

  /* ---------- Back to top ---------- */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));
})();
