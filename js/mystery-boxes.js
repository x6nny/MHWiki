/* =========================================================
   Mystery Boxes page
   Data: window.MH_BOXES (js/mb-data.js)
   ========================================================= */
(() => {
  const D = window.MH_BOXES;
  const BASE = window.MH_IMG_BASE;
  const ICON = "../assets/boxes/";
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (p, size = 120) => p ? `${BASE}${p}/revision/latest/scale-to-width-down/${size}` : null;
  const ITEM_LINK = n => "item-index.html#item=" + encodeURIComponent(n);

  const BOX_COLOR = {
    "regular-box": "#ffb347", "unreal-box": "#c56bff", "inferno-box": "#ff6a1a", "luxury-box": "#f0d77a", "red-banded-box": "#ff2e4e",
    "spectral-box": "#5ad1ff", "magnificent-box": "#7ab8ff", "heavenly-box": "#d59cff", "pumpkin-box": "#ff8a1c", "festive-box": "#ff4d6d",
    "birthday-box": "#ff9ccc", "twitch-box": "#9146ff", "easter-box": "#6fe0a8", "cake-raffle-box": "#c88bff",
  };
  const TIER_COLOR = {
    Premium: "#ff4b87", Shop: "#9aa6c4", Luxury: "#b8efff", Vintage: "#32ff96", Exotic: "#00e5ff", Contraband: "#5b63ff", Relic: "#3f8cff",
    Halloween: "#ff8c00", Holiday: "#ff4d6d", Birthday: "#ff7aa2", Easter: "#00d178", Twitch: "#9146ff", Cake: "#ffb3d9",
  };
  const RARE = new Set(["Vintage", "Exotic", "Relic", "Contraband"]);

  /* ---------- Hero ---------- */
  $("#lede").textContent = "Boxes hold exclusive items that you win at random. You get them from falling Research Crates, codes, daily gifts and Spook McDooks' shop. "
    + "There are " + D.boxes.length + " kinds, and " + D.boxes.filter(b => b.group === "limited").length + " of them only show up during events.";
  const heroBoxes = ["spectral-box", "inferno-box", "heavenly-box", "red-banded-box", "pumpkin-box", "magnificent-box"];
  const spots = [[8, 46, 1.1], [40, 8, 1.25], [64, 44, 1.05], [30, 58, .95], [76, 6, .85], [2, 4, .8]];
  $("#heroStack").innerHTML = heroBoxes.map((s, i) => `<img src="${ICON + s}.webp" alt="" style="left:${spots[i][0]}%;top:${spots[i][1]}%;transform:scale(${spots[i][2]});--g:${BOX_COLOR[s]}88;--t:${4 + i * .6}s;--dl:${-i * .9}s;--r0:${-6 + i * 2}deg;--r1:${5 - i}deg" />`).join("");
  setTimeout(() => {
    MH.countUp($("#stBoxes"), D.boxes.length, 900);
    MH.countUp($("#stLimited"), D.boxes.filter(b => b.group === "limited").length, 900);
    MH.countUp($("#stRelics"), (D.circulation.Relics || []).filter(x => x.n).length, 900);
    MH.countUp($("#stExotics"), (D.circulation.Exotics || []).filter(x => x.n).length, 900);
  }, 500);

  /* ---------- Box cards ---------- */
  const cheapest = b => {
    const m = b.sources.map(s => s.match(/\((\d+) uC\)/)).filter(Boolean).map(x => +x[1]);
    return m.length ? Math.min(...m) : null;
  };
  function boxCard(b) {
    const c = BOX_COLOR[b.slug] || "#fff";
    const price = cheapest(b);
    const tags = [];
    if (price) tags.push(`<span class="b-tag">${price} uC</span>`);
    if (b.notes.some(n => /always lucky/i.test(n))) tags.push(`<span class="b-tag lucky">Always lucky</span>`);
    if (b.relics.length) tags.push(`<span class="b-tag relic">Has relics</span>`);
    const total = b.odds.reduce((s, o) => s + o[0], 0);
    const bar = b.odds.map(([p, t], i) => `<span style="--c:${TIER_COLOR[t] || "#999"};--w:${p / total * 100}%;--dl:${i * 120}ms" title="${p}% ${esc(t)}"></span>`).join("");
    const legend = b.odds.map(([p, t]) => `<span style="--c:${TIER_COLOR[t] || "#999"}"><i></i>${esc(t)} <b>${p}%</b></span>`).join("");
    const relics = b.relics.map(r => r.in
      ? `<a class="ichip" href="${ITEM_LINK(r.n)}"><img src="${esc(img(r.img, 64))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'" />${esc(r.n)}</a>`
      : `<span class="ichip">${esc(r.n)}</span>`).join("");
    return `<article class="bcard glass reveal" id="${b.slug}" style="--c:${c}">
      <div class="b-top">
        <div class="b-icon"><img src="${ICON + b.slug}.webp" alt="${esc(b.name)}" /></div>
        <div class="b-title"><h3>${esc(b.name)}</h3><div class="b-tags">${tags.join("")}</div></div>
      </div>
      <div class="odds"><div class="odds-bar">${bar}</div><div class="odds-legend">${legend}</div></div>
      ${b.notes.filter(n => !/always lucky/i.test(n)).map(n => `<p class="m-note" style="margin:0 0 6px;color:var(--faint);font-size:13px">${esc(n)}</p>`).join("")}
      <div class="b-sec"><span>Where to get it</span><ul class="b-src">${b.sources.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>
      ${relics ? `<div class="b-sec"><span>Relics</span><div class="relics">${relics}</div></div>` : ""}
      <div class="b-foot"><button class="b-try" data-try="${b.slug}">Open this box ↑</button></div>
    </article>`;
  }
  $("#normalBoxes").innerHTML = D.boxes.filter(b => b.group === "normal").map(boxCard).join("");
  $("#limitedBoxes").innerHTML = D.boxes.filter(b => b.group === "limited").map(boxCard).join("");
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-try]");
    if (!t) return;
    selectBox(t.dataset.try);
    window.scrollTo({ top: $("#opener").getBoundingClientRect().top + scrollY - 110, behavior: MH.reduceMotion ? "auto" : "smooth" });
  });

  /* ---------- Opener ---------- */
  let current = D.boxes[0], spinning = false;
  const tally = {};
  $("#picker").innerHTML = D.boxes.map((b, i) => `<button class="pick ${i === 0 ? "on" : ""}" role="option" data-box="${b.slug}" style="--c:${BOX_COLOR[b.slug]}"><img src="${ICON + b.slug}.webp" alt="" /><span>${esc(b.name.replace(" Box", ""))}</span></button>`).join("");
  $("#picker").addEventListener("click", e => { const p = e.target.closest(".pick"); if (p && !spinning) selectBox(p.dataset.box); });
  function selectBox(slug) {
    const b = D.boxes.find(x => x.slug === slug); if (!b) return;
    current = b;
    document.querySelectorAll(".pick").forEach(p => p.classList.toggle("on", p.dataset.box === slug));
    $(`.pick[data-box="${slug}"]`).scrollIntoView({ block: "nearest", inline: "center", behavior: MH.reduceMotion ? "auto" : "smooth" });
    $("#openIcon").src = ICON + slug + ".webp";
    $("#openName").textContent = b.name;
    const lucky = b.notes.some(n => /always lucky/i.test(n));
    $("#clover").disabled = lucky;
    if (lucky) $("#clover").checked = true;
    idleReel();
  }

  function pickWeighted(odds) {
    const total = odds.reduce((s, o) => s + o[0], 0);
    let r = Math.random() * total;
    for (const [p, t] of odds) { if ((r -= p) <= 0) return t; }
    return odds[0][1];
  }
  function poolFor(box, tier) {
    if (tier === "Relic") return box.relics.map(r => [r.n, r.img]);
    return D.pools[tier] || D.pools.Premium;
  }
  function rollOne(box) {
    const tier = pickWeighted(box.odds);
    let pool = poolFor(box, tier);
    if (!pool || !pool.length) pool = D.pools.Premium;
    const [n, p] = pool[Math.floor(Math.random() * pool.length)];
    return { n, p, tier };
  }
  function tileHTML(r, extra = "") {
    const c = TIER_COLOR[r.tier] || "#9aa6c4";
    return `<div class="tile ${extra}" style="--c:${c}">${r.p ? `<img src="${esc(img(r.p, 120))}" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>${esc(r.n[0])}</span>'" />` : `<span class="ph">${esc(r.n[0])}</span>`}<b>${esc(r.n)}</b><small>${esc(r.tier)}</small></div>`;
  }
  const reel = $("#reel");
  function idleReel() {
    reel.getAnimations().forEach(a => a.cancel());
    reel.style.transform = "translateX(0)";
    reel.innerHTML = Array.from({ length: 14 }, () => tileHTML(rollOne(current))).join("");
    $("#announce").innerHTML = "";
  }

  const ANN = {
    Premium: ["", "Wow! ", "Woah!! ", "OMG!! "], Shop: [""], Halloween: ["", "Wow! ", "Woah!! "], Holiday: ["", "Wow! ", "Woah!! "], Birthday: ["", "Wow! "], Easter: ["", "Wow! "], Twitch: ["Wow! "], Cake: ["Woah!! "],
    Luxury: ["My word! "], Vintage: ["AAHHHHHH!!! "], Exotic: [""], Contraband: ["Shhh! "], Relic: ["WOW! "],
  };
  function announce(win, copies) {
    const c = TIER_COLOR[win.tier] || "#fff";
    const pre = (ANN[win.tier] || [""])[Math.floor(Math.random() * (ANN[win.tier] || [""]).length)];
    const a = $("#announce");
    a.style.setProperty("--c", c);
    a.innerHTML = `${esc(pre)}You unlocked a ${esc(current.name)} and won <b>x${copies} ${esc(win.n)}</b>!${copies > 1 ? `<em>Lucky Clover x${copies}</em>` : ""}`;
  }
  function confetti(color) {
    if (MH.reduceMotion) return;
    const stage = $(".op-stage");
    for (let i = 0; i < 40; i++) {
      const p = document.createElement("i");
      p.className = "confetti";
      p.style.background = i % 3 ? color : ["#ffd76b", "#ff6bb5", "#7cff6b", "#7ad7ff"][i % 4];
      p.style.setProperty("--x", (Math.random() * 600 - 300).toFixed(0) + "px");
      p.style.setProperty("--y", (Math.random() * -220 - 40).toFixed(0) + "px");
      p.style.setProperty("--r", (Math.random() * 720 - 360).toFixed(0) + "deg");
      stage.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  }
  function updateTally(tier) {
    tally[tier] = (tally[tier] || 0) + 1;
    $("#tally").innerHTML = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<span style="--c:${TIER_COLOR[t] || "#999"}">${esc(t)} ×${n}</span>`).join("");
  }

  $("#openBtn").addEventListener("click", () => {
    if (spinning) return;
    spinning = true;
    const btn = $("#openBtn");
    btn.disabled = true; btn.classList.add("shake");
    $("#announce").innerHTML = "";
    const WIN = 46, N = 54;
    const rolls = Array.from({ length: N }, () => rollOne(current));
    const win = rolls[WIN];
    reel.getAnimations().forEach(a => a.cancel());
    reel.style.transform = "translateX(0)";
    reel.innerHTML = rolls.map(r => tileHTML(r)).join("");
    const tileW = reel.children[0].getBoundingClientRect().width + 10;
    const center = reel.parentElement.getBoundingClientRect().width / 2;
    const jitter = (Math.random() - .5) * (tileW - 30);
    const end = -(WIN * tileW + tileW / 2 - 5 - center + jitter);
    const anim = reel.animate([{ transform: "translateX(0)" }, { transform: `translateX(${end}px)` }],
      { duration: MH.reduceMotion ? 10 : 5200, easing: "cubic-bezier(.08,.6,.12,1)", fill: "forwards" });
    anim.onfinish = () => {
      const tile = reel.children[WIN];
      tile.classList.add("win");
      const lucky = $("#clover").checked;
      const copies = lucky ? 1 + Math.floor(Math.random() * 3) : 1;
      announce(win, copies);
      updateTally(win.tier);
      if (RARE.has(win.tier)) confetti(TIER_COLOR[win.tier]);
      spinning = false; btn.disabled = false; btn.classList.remove("shake");
    };
  });
  idleReel();

  /* ---------- Clovers ---------- */
  $("#cloverText").innerHTML = (D.clovers || []).map(p => `<p>${esc(p)}</p>`).join("");

  /* ---------- Items in circulation ---------- */
  const CIRC_COLOR = { Exotics: "#00e5ff", Vintages: "#32ff96", Luxuries: "#b8efff", Contrabands: "#5b63ff", Relics: "#3f8cff" };
  const tabs = Object.keys(D.circulation);
  const seg = $("#circTabs"), ind = seg.querySelector(".seg-ind");
  seg.insertAdjacentHTML("beforeend", tabs.map((t, i) => `<button data-tab="${t}" class="${i === 0 ? "active" : ""}">${t}<em>${D.circulation[t].filter(x => x.n).length}</em></button>`).join(""));
  const SEC_ICON = { Spring: "spring.png", Summer: "summer.png", Autumn: "halloween.png", Winter: "winter.png" };
  function boxIconFor(name) {
    const b = D.boxes.find(x => x.name === name);
    return b ? `${ICON + b.slug}.webp` : `${ICON}mysteryboxes.gif`;
  }
  function renderCirc(tab) {
    const c = CIRC_COLOR[tab] || "#fff";
    let html = "", grid = [], i = 0;
    const flush = () => { if (grid.length) { html += `<div class="c-grid">${grid.join("")}</div>`; grid = []; } };
    D.circulation[tab].forEach(x => {
      if (x.section) {
        flush();
        const ico = !x.major && SEC_ICON[x.section] ? `<img src="../assets/icons/${SEC_ICON[x.section]}" alt="" />` : "";
        html += `<div class="c-sec ${x.major ? "major" : ""}">${ico}${esc(x.section)}</div>`;
        return;
      }
      const from = x.unbox_from ? `<span class="from"><img src="${boxIconFor(x.unbox_from)}" alt="" />${esc(x.unbox_from)}</span>` : "";
      const life = x.life_required ? `<span class="life">Life ${esc(x.life_required)}</span>` : "";
      const inner = `<span class="ci">${x.img ? `<img src="${esc(img(x.img, 160))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'" />` : ""}</span>
        <b>${esc(x.n)}</b>${from}${life}${x.date_added ? `<small>Added ${esc(x.date_added)}</small>` : ""}`;
      grid.push(x.in ? `<a class="ctile" href="${ITEM_LINK(x.n)}" style="--c:${c};--i:${i++}">${inner}</a>` : `<div class="ctile" style="--c:${c};--i:${i++}">${inner}</div>`);
    });
    flush();
    $("#circBody").innerHTML = html;
  }
  function moveInd() {
    const b = seg.querySelector("button.active"); if (!b) return;
    ind.style.width = b.offsetWidth + "px"; ind.style.transform = `translateX(${b.offsetLeft - 4}px)`;
    const c = CIRC_COLOR[b.dataset.tab];
    seg.style.setProperty("--sc", `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 60%, white))`);
  }
  seg.addEventListener("click", e => {
    const b = e.target.closest("button[data-tab]"); if (!b) return;
    seg.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    moveInd(); renderCirc(b.dataset.tab);
  });
  window.addEventListener("resize", moveInd);
  window.addEventListener("load", moveInd);
  document.fonts && document.fonts.ready.then(moveInd);
  renderCirc(tabs[0]);

  /* ---------- Announcements ---------- */
  const HL = { "White Highlight": "#ffffff", "Green Highlight": "#7cff6b", "Yellow Highlight": "#ffe14d", "Light Red Highlight": "#ff8a8a", "Blue Highlight": "#4f8bff",
    "Sky Blue Highlight with a Giant Token": "#7ad7ff", "Crimson Highlight with Masked Man's Mask": "#ff2e5b", "Really Red Highlight": "#ff1a1a" };
  const ANN_IMG = n => n ? ICON + n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".webp" : "";
  $("#annList").innerHTML = D.announcements.map(a => {
    const c = HL[a.highlight] || (a.tier === "Luxury" ? "#eef3ff" : "#fff");
    const msg = a.text && a.text !== "N/A" ? a.text.split(/(?<=!)\s+(?=Cool!)/)[0] : "(No chat message. A giant token appears instead.)";
    return `<div class="ann reveal" style="--c:${c}">
      ${a.img ? `<img src="${ANN_IMG(a.img)}" alt="${esc(a.tier)} example" loading="lazy" onerror="this.style.visibility='hidden'" />` : "<span></span>"}
      <div><div class="a-msg">${esc(msg)}</div><div class="a-meta"><span>${esc(a.highlight)}</span>${a.not_in ? `<span>Not shown for: ${esc(a.not_in)}</span>` : ""}</div></div>
      <div class="a-tier">${esc(a.tier)}</div>
    </div>`;
  }).join("");

  /* ---------- Discontinued ---------- */
  $("#discGrid").innerHTML = `
    <article class="dcard glass reveal">
      <span class="stamp">Removed</span>
      <h3><img src="${ICON}regular-box.webp" alt="" style="filter:grayscale(1)" />Un-Rigged Box</h3>
      <img class="shot" src="${ICON}rigged-box.webp" alt="An Un-Rigged Box being opened" loading="lazy" />
      ${D.unrigged.map(p => `<p>${esc(p)}</p>`).join("")}
    </article>
    <article class="dcard glass reveal">
      <span class="stamp">Converted</span>
      <h3><img src="${ICON}twitch-coin.webp" alt="" />Twitch Coins</h3>
      ${D.twitch.map(p => `<p>${esc(p)}</p>`).join("")}
      <p><a class="ichip" href="#twitch-box"><img src="${ICON}twitch-box.webp" alt="" />See the Twitch Box</a></p>
    </article>`;

  /* ---------- Trivia ---------- */
  $("#trivia").innerHTML = (D.trivia || []).map(t => `<li>${esc(t)}</li>`).join("");

  /* ---------- Reveal + back to top ---------- */
  document.querySelectorAll("main .reveal").forEach(MH.reveal);
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));

  const h = location.hash.slice(1);
  if (h && D.boxes.some(b => b.slug === h)) setTimeout(() => document.getElementById(h).scrollIntoView({ block: "center" }), 300);
})();
