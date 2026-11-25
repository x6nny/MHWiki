/* =========================================================
   Status Effects page
   Data: window.MH_STATUS (data/StatusEffects.json)
   ========================================================= */
(() => {
  const D = window.MH_STATUS;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ITEM_LINK = n => "item-index.html#item=" + encodeURIComponent(n);

  // Accent colour + which text style each effect uses
  const STYLE = {
    "fire": ["#ff7a1a"], "frostbite": ["#8fdcff"], "radioactive": ["#b6ff2e"], "sparkles": ["#ffe58a"], "poison": ["#3ee36b"],
    "smoking": ["#a9b1bd"], "wet": ["#3ba7ff"], "anti-gravity": ["#c58cff"], "fireproof": ["#ff9a5a"],
    "poison-immunity": ["#3ee36b", "immune"], "radioactive-immunity": ["#b6ff2e", "immune"], "frostbite-immunity": ["#8fdcff", "immune"],
    "plague-immunity": ["#c7d36a", "immune"], "hydrophobic": ["#ffcc4d"], "education": ["#4dff88"], "draedon": ["#3d7bff"],
    "void": ["#8b5cff"], "shield": ["#5ad1ff"], "gaia-s-blessing": ["#5ee07a"], "chaotic-fire": ["#39ff6a"],
    "replicator-banned": ["#ff4d6d", "banned"], "teleporter-banned": ["#ff6b3d", "banned"], "don-banned": ["#c8326b", "banned"],
    "nova": ["#ffe58a"], "nova-schro": ["#9ef0ff"], "golden": ["#ffd34d"], "plague": ["#a5b83a"], "swag-factor": ["#ff5ce1"],
    "stasis": ["#6ef0ff"], "eternal-flame": ["#6fb8ff"],
  };
  // Particle recipes: [class, count, extra-setup]
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PARTICLES = {
    "fire": ["ember", 9], "chaotic-fire": ["ember", 12], "eternal-flame": ["ember", 7], "fireproof": ["ember", 6],
    "frostbite": ["flake", 7], "radioactive": ["rad", 8], "sparkles": ["star", 8], "golden": ["star", 6],
    "poison": ["bubble", 7, "drip", 3], "smoking": ["puff", 6], "wet": ["drop", 6], "hydrophobic": ["drop", 6],
    "education": ["tri", 5], "draedon": ["poly", 7], "gaia-s-blessing": ["leaf", 7],
    "poison-immunity": ["hit", 5], "radioactive-immunity": ["hit", 5], "frostbite-immunity": ["hit", 5], "plague-immunity": ["hit", 5],
  };

  /* ---------- Build an animated effect name ---------- */
  function fxName(e) {
    const [color, family] = STYLE[e.slug] || ["#fff"];
    const el = document.createElement("span");
    el.className = `sfx fx-${e.slug}` + (family ? ` fx-${family}` : "") + (e.name.length > 17 ? " xlong" : e.name.length > 12 ? " long" : "");
    el.style.setProperty("--c", color);
    el.setAttribute("aria-label", e.name);
    const letters = [...e.name];
    const mid = (letters.length - 1) / 2;
    const w = document.createElement("span");
    w.className = "w";
    w.setAttribute("aria-hidden", "true");
    letters.forEach((ch, i) => {
      if (ch === " ") { const s = document.createElement("span"); s.className = "sp"; w.appendChild(s); return; }
      const l = document.createElement("span");
      l.className = "l";
      l.textContent = ch;
      l.style.setProperty("--i", i);
      l.style.setProperty("--toc", Math.round((mid - i) * 14)); // distance to centre, for Void
      w.appendChild(l);
    });
    el.appendChild(w);
    if (family === "banned") {
      const st = document.createElement("span"); st.className = "strike"; el.appendChild(st);
      if (e.slug === "replicator-banned") { const g = document.createElement("span"); g.className = "ghost"; g.textContent = e.name; g.setAttribute("aria-hidden", "true"); el.appendChild(g); }
      if (e.slug === "don-banned") { const r = document.createElement("span"); r.className = "pulse-ring"; el.appendChild(r); }
    }
    if (e.slug === "nova-schro") {
      ["g1", "g2"].forEach(c => { const g = document.createElement("span"); g.className = "ghost " + c; g.textContent = e.name; g.setAttribute("aria-hidden", "true"); el.appendChild(g); });
    }
    const recipe = PARTICLES[e.slug];
    if (recipe && !MH.reduceMotion) {
      const layer = document.createElement("span");
      layer.className = "fxp";
      layer.setAttribute("aria-hidden", "true");
      for (let r = 0; r < recipe.length; r += 2) {
        const cls = recipe[r], n = recipe[r + 1];
        for (let k = 0; k < n; k++) {
          const p = document.createElement("i");
          p.className = cls;
          p.style.left = rnd(8, 92) + "%";
          if (["star", "rad", "tri", "poly"].includes(cls)) p.style.top = rnd(5, 85) + "%";
          p.style.animationDelay = (-rnd(0, 3)).toFixed(2) + "s";
          p.style.setProperty("--dx", rnd(-18, 18).toFixed(0) + "px");
          p.style.setProperty("--dy", rnd(-30, 30).toFixed(0) + "px");
          p.style.setProperty("--s", rnd(5, 10).toFixed(0) + "px");
          if (cls === "hit") {
            const a = rnd(0, Math.PI * 2);
            p.style.left = "50%"; p.style.top = "45%";
            p.style.setProperty("--sx", (Math.cos(a) * 60).toFixed(0) + "px");
            p.style.setProperty("--sy", (Math.sin(a) * 30).toFixed(0) + "px");
          }
          layer.appendChild(p);
        }
      }
      el.appendChild(layer);
    }
    return el;
  }

  /* ---------- Cards ---------- */
  const GROUPS = {
    common: ["Common status effects", "The ones you'll run into most."],
    immunity: ["Immunities", "Effects that stop other effects from sticking."],
    other: ["Other status effects", "Special effects from specific items."],
  };
  const state = { g: "all", q: "", bad: false };
  const tokens = () => state.q.toLowerCase().split(/\s+/).filter(Boolean);
  function hl(t) {
    const safe = esc(t), tk = tokens();
    if (!tk.length) return safe;
    return safe.replace(new RegExp("(" + tk.map(x => esc(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi"), "<mark>$1</mark>");
  }
  const chip = it => it && it.in
    ? `<a class="ichip" href="${ITEM_LINK(it.n)}" title="Open ${esc(it.n)} in the Item Index">${it.img ? `<img src="${esc(MH_SRC(it.img))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'" />` : ""}${hl(it.n)}</a>`
    : it ? `<span class="ichip">${hl(it.n)}</span>` : "";
  const itemsByName = {};
  D.effects.forEach(e => { if (e.ex) itemsByName[e.ex.n] = e.ex; });

  D.effects.forEach(e => {
    e._text = [e.name, e.group, ...(e.lines || []), e.ex ? e.ex.n : "", ...(e.removers || []).map(r => r.n)].join(" ").toLowerCase();
  });

  function cardHTML(e, i) {
    const [color] = STYLE[e.slug] || ["#fff"];
    const badges = [];
    if (e.group === "immunity") badges.push(`<span class="badge imm">Immunity</span>`);
    else if (e.destructive === true) badges.push(`<span class="badge bad">Destroys ore</span>`);
    else if (e.destructive === false) badges.push(`<span class="badge safe">Doesn't destroy ore</span>`);
    badges.push(`<span class="badge grp">${GROUPS[e.group][0].replace(/ status effects$/, "")}</span>`);
    const lines = (e.lines || []).map(l => `<li class="${/^\(|^Not to be confused/i.test(l) ? "note" : ""}">${hl(l)}</li>`).join("");
    const rem = (e.removers || []).map(chip).join("");
    return `<article class="ecard glass reveal" id="${e.slug}" data-slug="${e.slug}" style="--c:${color}; --i:${i}">
      <div class="e-top">
        <div class="e-name" data-fx="${e.slug}"></div>
        ${e.img ? `<span class="e-part" title="In-game appearance"><img src="${esc(MH_SRC(e.img))}" alt="${esc(e.name)} particle" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()" /></span>` : ""}
      </div>
      <div class="e-badges">${badges.join("")}</div>
      <ul class="e-lines">${lines}</ul>
      <div class="e-foot">
        ${rem ? `<div class="e-row"><span>Removed by</span>${rem}</div>` : ""}
        ${e.ex ? `<div class="e-row"><span>Example</span>${chip(e.ex)}</div>` : ""}
      </div>
    </article>`;
  }

  function render() {
    const tk = tokens();
    const root = $("#effects");
    let html = "", shown = 0;
    Object.entries(GROUPS).forEach(([g, [title, sub]]) => {
      if (state.g !== "all" && state.g !== g) return;
      const list = D.effects.filter(e => e.group === g && (!state.bad || e.destructive === true) && tk.every(t => e._text.includes(t)));
      if (!list.length) return;
      shown += list.length;
      html += `<section class="group" id="group-${g}"><div class="group-head"><h2>${title}</h2><p>${sub} · ${list.length}</p></div><div class="fx-grid">${list.map(cardHTML).join("")}</div></section>`;
    });
    root.innerHTML = html;
    root.querySelectorAll("[data-fx]").forEach(slot => slot.appendChild(fxName(D.effects.find(e => e.slug === slot.dataset.fx))));
    root.querySelectorAll(".reveal").forEach(MH.reveal);
    root.querySelectorAll(".ecard").forEach(c => pauser.observe(c));
    $("#noResults").hidden = shown > 0;
  }

  // Pause effect animations for cards that are off-screen
  const pauser = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle("paused", !en.isIntersecting)), { rootMargin: "200px 0px" });

  /* ---------- Toolbar ---------- */
  const seg = $("#groups"), ind = seg.querySelector(".seg-ind");
  const moveInd = () => { const b = seg.querySelector("button.active"); ind.style.width = b.offsetWidth + "px"; ind.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  seg.addEventListener("click", e => {
    const b = e.target.closest("button[data-g]"); if (!b) return;
    state.g = b.dataset.g;
    seg.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    moveInd(); render();
  });
  window.addEventListener("resize", moveInd);
  if (document.readyState === "complete") requestAnimationFrame(moveInd); else window.addEventListener("load", moveInd);
  document.fonts && document.fonts.ready.then(moveInd);
  let qt;
  $("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 140); });
  $("#onlyBad").addEventListener("change", e => { state.bad = e.target.checked; render(); });
  $("#clearAll").addEventListener("click", () => {
    Object.assign(state, { g: "all", q: "", bad: false }); $("#q").value = ""; $("#onlyBad").checked = false;
    seg.querySelectorAll("button").forEach(x => x.classList.toggle("active", x.dataset.g === "all")); moveInd(); render();
  });
  document.addEventListener("keydown", e => { if (e.key === "/" && document.activeElement !== $("#q")) { e.preventDefault(); $("#q").focus(); } });

  /* ---------- Hero showcase: cycles through the effects ---------- */
  const order = D.effects.filter(e => !/banned|immunity/.test(e.slug) || e.slug === "replicator-banned");
  let sIdx = 0, sTimer;
  const showcase = $("#showcase");
  function showNext() {
    const e = order[sIdx % order.length];
    const [color] = STYLE[e.slug] || ["#fff"];
    showcase.style.setProperty("--c", color);
    showcase.dataset.slug = e.slug;
    const slot = $("#scName");
    slot.innerHTML = "";
    const n = fxName(e);
    n.classList.add("enter");
    slot.appendChild(n);
    const ore = $("#scOre");
    ore.style.boxShadow = `inset -8px -8px 18px rgba(0,0,0,.45), inset 6px 6px 14px rgba(255,255,255,.35), 0 0 46px ${color}`;
    ore.style.background = e.slug === "golden" ? "linear-gradient(135deg,#fff3b0,#ffd34d 55%,#a87400)"
      : e.slug === "frostbite" ? "linear-gradient(135deg,#e9fbff,#8fdcff 55%,#3d8bff)"
      : `linear-gradient(135deg, #c9d0e0, color-mix(in srgb, ${color} 45%, #6b7590) 55%, #2c3246)`;
    sIdx++;
  }
  showNext();
  if (!MH.reduceMotion) sTimer = setInterval(showNext, 2600);
  showcase.addEventListener("mouseenter", () => clearInterval(sTimer));
  showcase.addEventListener("mouseleave", () => { if (!MH.reduceMotion) { clearInterval(sTimer); sTimer = setInterval(showNext, 2600); } });
  showcase.addEventListener("click", () => jumpTo(showcase.dataset.slug));

  function jumpTo(slug) {
    let card = document.getElementById(slug);
    if (!card) { $("#clearAll").click(); card = document.getElementById(slug); }
    if (!card) return;
    card.classList.add("in");
    window.scrollTo({ top: card.getBoundingClientRect().top + scrollY - (118 + MH_STICK()), behavior: MH.reduceMotion ? "auto" : "smooth" });
    card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
    history.replaceState(null, "", "#" + slug);
  }

  /* ---------- Reactions ---------- */
  const slugOf = name => {
    const n = name.toLowerCase();
    const e = D.effects.find(x => x.name.toLowerCase() === n);
    if (e) return e.slug;
    if (/fireproof or wet/.test(n)) return "wet";
    if (/education or draedon/.test(n)) return "education";
    return null;
  };
  const rchip = name => {
    const s = slugOf(name);
    const c = s ? STYLE[s][0] : (/blazing/i.test(name) ? "#ff5a1f" : "#9aa6c4");
    const it = itemsByName[name] || (/blazing annihilator/i.test(name) ? { n: "Blazing Annihilator", in: true } : null);
    return it && it.in ? `<a class="rchip" style="--c:${c}" href="${ITEM_LINK(it.n)}">${esc(name)}</a>` : `<span class="rchip" style="--c:${c}">${esc(name)}</span>`;
  };
  $("#reactionList").innerHTML = D.reactions.map(([a, b, res], i) => `
    <div class="rx glass" style="--i:${i}">
      ${rchip(a)}<span class="op">+</span>${rchip(b)}<span class="op eq">=</span>
      <div class="res">${res.map(r => /^EXCEPTION/i.test(r) ? `<span class="exc">${esc(r)}</span>` : esc(r)).join(" ")}</div>
    </div>`).join("");

  /* ---------- Materials & properties ---------- */
  const intros = D.intro || [];
  $("#matIntro").textContent = intros.find(p => /ore materials are used/i.test(p)) || "";
  $("#propIntro").textContent = intros.find(p => /do not retain|do not pertain/i.test(p)) || "";
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  $("#matGrid").innerHTML = D.materials.map(m => `
    <div class="mcard glass reveal" id="mat-${slug(m.name)}">
      <span class="mname m-${slug(m.name)}">${esc(m.name === "CrackedLava" ? "Cracked Lava" : m.name)}</span>
      <ul>${m.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
      ${m.ex ? `<div class="e-row"><span>Example</span>${chip(m.ex)}</div>` : ""}
    </div>`).join("");
  $("#propGrid").innerHTML = D.properties.map(p => `
    <div class="mcard glass reveal">
      <span class="pname p-${slug(p.name)}">${esc(p.name)}</span>
      <ul>${p.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
      ${p.ex ? `<div class="e-row"><span>Related item</span>${chip(p.ex)}</div>` : ""}
    </div>`).join("");
  document.querySelectorAll("#matGrid .reveal, #propGrid .reveal").forEach(MH.reveal);

  /* ---------- Stats ---------- */
  setTimeout(() => {
    MH.countUp($("#stTotal"), D.effects.length, 900);
    MH.countUp($("#stBad"), D.effects.filter(e => e.destructive === true).length, 900);
    MH.countUp($("#stImm"), D.effects.filter(e => e.group === "immunity").length, 900);
    MH.countUp($("#stMat"), D.materials.length, 900);
  }, 500);

  /* ---------- Back to top ---------- */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));

  /* ---------- Init ---------- */
  render();
  const h = location.hash.slice(1);
  if (h && D.effects.some(e => e.slug === h)) setTimeout(() => jumpTo(h), 400);
  else if (h === "materials" || /^mat-/.test(h)) setTimeout(() => {
    const el = document.getElementById(h) || document.getElementById("materials");
    if (!el) return;
    el.classList.add("in");
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - (48 + MH_STICK()), behavior: MH.reduceMotion ? "auto" : "smooth" });
    if (el.classList.contains("mcard")) { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
  }, 400);
})();
