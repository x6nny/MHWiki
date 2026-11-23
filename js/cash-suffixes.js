/* =========================================================
   Cash Suffixes page
   Data: window.MH_SUFFIX (js/suffix-data.js)
   ========================================================= */
(() => {
  const D = window.MH_SUFFIX;
  const BASE = window.MH_IMG_BASE;
  const SUF = D.suffixes;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (p, size = 60) => p ? `${BASE}${p}/revision/latest/scale-to-width-down/${size}` : null;
  const ITEM_LINK = n => "item-index.html#item=" + encodeURIComponent(n);
  const CAP_E = Math.log10(1.7976931348623157e308); // ≈ 308.25
  const MAX_SUF = SUF[SUF.length - 1];

  /* wiki inline segments -> HTML */
  const seg = s => typeof s === "string" ? esc(s)
    : s.i ? `<a class="ilink" href="${ITEM_LINK(s.i)}">${s.img ? `<img src="${esc(img(s.img, 40))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : ""}${esc(s.l || s.i)}</a>`
    : s.a ? `<a class="plink" href="${esc(s.href)}">${esc(s.a)}</a>` : "";
  const html = arr => (arr || []).map(seg).join("");
  const text = arr => (arr || []).map(s => typeof s === "string" ? s : (s.l || s.i || s.a || "")).join("");

  /* ---------- Number model: { m: 1 ≤ m < 10, e: integer } ---------- */
  function norm(m, e) {
    if (!isFinite(m) || m <= 0) return null;
    const k = Math.floor(Math.log10(m));
    m = m / Math.pow(10, k); e += k;
    if (m >= 9.9999999) { m = 1; e += 1; }
    return { m, e };
  }
  const trimNum = (x, dp = 3) => {
    let s = x.toFixed(dp);
    if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s;
  };
  const bySuffixExact = Object.fromEntries(SUF.map(s => [s.ab, s]));
  const byLower = {};
  SUF.forEach(s => { (byLower[s.ab.toLowerCase()] ||= []).push(s); });
  const byName = Object.fromEntries(SUF.map(s => [s.name.toLowerCase(), s]));
  byName["quintillion"] = SUF.find(s => s.ab === "Qn");
  byName["octovigintillion"] = SUF.find(s => s.ab === "OVG");

  function findSuffix(w) {
    if (!w) return null;
    if (bySuffixExact[w]) return { s: bySuffixExact[w] };
    const lw = w.toLowerCase();
    if (byName[lw]) return { s: byName[lw] };
    if (byLower[lw]) return { s: byLower[lw][0], guess: byLower[lw].length > 1 ? byLower[lw] : null, caseFix: true };
    return null;
  }
  function parse(raw) {
    let t = String(raw).trim().replace(/^\$/, "").replace(/[,_]/g, "").replace(/\s+/g, " ");
    if (!t) return { err: "Type an amount to convert." };
    if (/^(inf|infinity|\$?inf)$/i.test(t)) return { inf: true };
    let m;
    if ((m = t.match(/^(\d*\.?\d+)\s*[eE]\s*\+?(-?\d+)$/))) {
      const v = norm(parseFloat(m[1]), parseInt(m[2], 10));
      return v ? { v } : { err: "That's zero." };
    }
    if ((m = t.match(/^(\d+)(\.\d+)?$/))) {
      const int = m[1].replace(/^0+/, "") || "0";
      if (int === "0") { const v = norm(parseFloat(t), 0); return v ? { v } : { err: "That's zero." }; }
      const lead = parseFloat(int.slice(0, 1) + "." + int.slice(1, 16) + (m[2] && int.length < 16 ? m[2].slice(1) : ""));
      return { v: norm(lead, int.length - 1) };
    }
    if ((m = t.match(/^(\d*\.?\d+)?\s*([A-Za-z]+)$/))) {
      const num = m[1] ? parseFloat(m[1]) : 1;
      const f = findSuffix(m[2]);
      if (!f) return { err: `“${m[2]}” isn't a cash suffix in Miner's Haven.` };
      const v = norm(num, f.s.e);
      return v ? { v, from: f } : { err: "That's zero." };
    }
    return { err: "Try something like 25Qn, 1.5e+45, 3 septillion or 1000000." };
  }
  function suffixFor(v) {
    if (v.e < 3) return null;
    return SUF[Math.min(Math.floor(v.e / 3), SUF.length) - 1];
  }
  function fmt(v) {
    if (!v) return { num: "0", suf: "", name: "" };
    if (v.e < 3) {
      const n = v.m * Math.pow(10, v.e);
      return { num: n >= 1 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : trimNum(n, 4), suf: "", name: "" };
    }
    const s = suffixFor(v);
    const n = v.m * Math.pow(10, v.e - s.e);
    const num = n >= 100 ? trimNum(n, 1) : n >= 10 ? trimNum(n, 2) : trimNum(n, 3);
    return { num, suf: s.ab, name: s.name, s };
  }
  const sci = v => `${trimNum(v.m, 4)}e+${v.e}`;
  const money = v => { const f = fmt(v); return `$${f.num}${f.suf}`; };
  const gt = (a, b) => a.e !== b.e ? a.e > b.e : a.m >= b.m - 1e-9;
  const ratio = (a, b) => norm(a.m / b.m, a.e - b.e); // a ÷ b
  function ratioText(r) {
    if (!r) return "1";
    if (r.e < 6) return Math.round(r.m * Math.pow(10, r.e)).toLocaleString("en-US");
    const f = fmt(r); return `${f.num} ${f.name.toLowerCase()}`;
  }
  const MILES = D.milestones.map(x => ({ ...x, v: norm(x.m, x.e) }));

  /* ---------- Hero ---------- */
  $("#lede").innerHTML = `Miner's Haven has some of the highest cash limits of any Roblox game, topping out around <b>$179${esc(MAX_SUF.ab)}</b> before it turns into $inf. Here's every suffix from <b>k</b> to <b>${esc(MAX_SUF.ab)}</b>, what they mean, and the milestones along the way.`;
  setTimeout(() => {
    MH.countUp($("#stCount"), SUF.length);
    MH.countUp($("#stDigits"), 309);
    MH.countUp($("#stMiles"), SUF.reduce((n, s) => n + s.notes.length, 0));
    MH.countUp($("#stGlitch"), D.abnormal.length);
  }, 500);

  /* Money counter: climbs from $300 to the cap, then breaks */
  const cnNum = $("#cnNum"), cnSuf = $("#cnSuf"), cnName = $("#cnName"), cnFill = $("#cnFill"), cnSci = $("#cnSci"), cnLife = $("#cnLife"), rain = $("#cnRain");
  const START = Math.log10(300), DUR = 16000, HOLD = 2600;
  let t0 = performance.now(), lastSuf = null;
  function frame(now) {
    let t = (now - t0) / DUR;
    if (t > 1 + HOLD / DUR) { t0 = now; t = 0; lastSuf = null; }
    const p = Math.min(1, t);
    const ease = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const le = START + (CAP_E - START) * ease;
    if (t > 1 + HOLD * .55 / DUR) {
      cnNum.textContent = "inf"; cnSuf.textContent = ""; cnName.textContent = "Past the cap: the game shows $inf";
      cnFill.parentElement.style.setProperty("--p", 1); cnSci.textContent = "∞"; cnLife.textContent = "Broken!";
    } else {
      const v = norm(Math.pow(10, le - Math.floor(le)), Math.floor(le));
      const f = fmt(v);
      cnNum.textContent = f.num;
      if (f.suf !== lastSuf) { cnSuf.textContent = f.suf; cnSuf.classList.remove("pop"); void cnSuf.offsetWidth; cnSuf.classList.add("pop"); lastSuf = f.suf; }
      cnName.textContent = f.name ? `${f.num} ${f.name}` : "Starting cash";
      cnFill.style.setProperty("--p", le / CAP_E);
      cnSci.textContent = sci(v);
      const reached = MILES.filter(x => gt(v, x.v)).pop();
      cnLife.textContent = reached ? reached.label : "Life 1";
    }
    requestAnimationFrame(frame);
  }
  if (!MH.reduceMotion) {
    requestAnimationFrame(frame);
    setInterval(() => {
      if (document.hidden) return;
      const c = document.createElement("img");
      c.src = "../assets/codes/cash.webp"; c.alt = "";
      c.style.left = Math.random() * 92 + "%";
      c.style.setProperty("--rot", (Math.random() * 360 - 180) + "deg");
      c.style.animationDuration = 2.4 + Math.random() * 2 + "s";
      rain.appendChild(c);
      setTimeout(() => c.remove(), 4600);
    }, 420);
  } else {
    cnNum.textContent = "179"; cnSuf.textContent = MAX_SUF.ab; cnName.textContent = "179 " + MAX_SUF.name; cnFill.style.setProperty("--p", 1); cnSci.textContent = "1.79e+308";
  }

  /* ---------- Converter ---------- */
  const PRESET_ITEMS = Object.fromEntries(MILES.filter(m => m.img).map(m => [m.label, m.img]));
  $("#presets").innerHTML = MILES.map(m => `<button class="preset" data-v="${m.m}e+${m.e}">${m.img ? `<img src="${esc(img(m.img, 40))}" alt="" referrerpolicy="no-referrer" onerror="this.remove()" />` : ""}${esc(m.label)} <b>${esc(money(m.v))}</b></button>`).join("");
  $("#presets").addEventListener("click", e => { const b = e.target.closest(".preset"); if (b) { const v = norm(...b.dataset.v.split("e+").map(Number)); convIn.value = money(v).slice(1); convert(); } });
  const convIn = $("#convIn"), out = $("#convOut");

  function convert() {
    const r = parse(convIn.value);
    if (r.err) { out.innerHTML = `<div class="res"><div class="res-main warn"><div class="big">?</div><div class="nm">${esc(r.err)}</div></div></div>`; return; }
    if (r.inf) {
      out.innerHTML = `<div class="res"><div class="res-main warn"><div class="big">$inf</div><div class="nm">Infinity</div><div class="alt"><span>Anything past <b>$179${esc(MAX_SUF.ab)}</b> shows as $inf. It still counts towards Overlord's Telamonster when you rebirth. It used to break save data.</span></div></div></div>`;
      return;
    }
    const v = r.v, f = fmt(v);
    const over = v.e > 308 || (v.e === 308 && v.m > 1.7976931348623157);
    const notes = [];
    if (r.from && r.from.caseFix) notes.push(`Matched <b>${esc(r.from.s.ab)}</b>. Suffixes are case-sensitive in-game, so watch the capitals.`);
    if (r.from && r.from.guess) notes.push(`Also could be: ${r.from.guess.slice(1).map(s => `<b>${esc(s.ab)}</b> (${esc(s.name)})`).join(", ")}.`);
    const digits = v.e + 1;
    const pos = Math.min(100, Math.max(0, v.e + Math.log10(v.m)) / CAP_E * 100);
    // milestone comparison
    const above = MILES.filter(m => gt(v, m.v));
    const below = MILES.filter(m => !gt(v, m.v));
    const show = [...above.slice(-2), ...below.slice(0, 2)];
    const near = show.map(m => {
      const ok = gt(v, m.v);
      const ico = m.img ? `<img src="${esc(img(m.img, 40))}" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ico>$</span>'" />` : `<span class="ico">$</span>`;
      return ok
        ? `<div>${ico}<span><span class="ok">✓ Enough</span> for <b>${esc(m.label)}</b> (${esc(money(m.v))})</span></div>`
        : `<div>${ico}<span><span class="no">${esc(ratioText(ratio(m.v, v)))} times more</span> to reach <b>${esc(m.label)}</b> (${esc(money(m.v))})</span></div>`;
    }).join("");
    out.innerHTML = `<div class="res">
      <div class="res-main ${over ? "warn" : ""}">
        <div class="big">$${esc(f.num)}<span>${esc(f.suf)}</span></div>
        <div class="nm">${f.name ? `${esc(f.num)} ${esc(f.name)}` : "No suffix needed"}</div>
        <div class="alt">
          <span>Scientific notation: <b>${esc(sci(v))}</b></span>
          <span>Written out: <b>${digits.toLocaleString("en-US")} digits</b>${v.m === 1 ? ` (a 1 followed by ${v.e.toLocaleString("en-US")} zeros)` : ""}</span>
          ${f.s ? `<span>Suffix #${f.s.n} of ${SUF.length}: <b>${esc(f.s.ab)}</b> = 1e+${f.s.e}</span>` : ""}
          ${over ? `<span>That's past the cash cap of $179${esc(MAX_SUF.ab)}. In-game this would show as <b>$inf</b>.</span>` : ""}
          ${notes.map(n => `<span>${n}</span>`).join("")}
        </div>
      </div>
      <div class="res-side">
        <div class="meter"><i style="--w:${pos}%"></i>${MILES.map(m => `<span class="tick" style="left:${(m.e + Math.log10(m.m)) / CAP_E * 100}%" title="${esc(m.label)}"></span>`).join("")}<span class="you" style="left:${pos}%">you</span></div>
        <div class="meter-l"><span>$1</span><span>$1e+100</span><span>$1e+200</span><span>cap</span></div>
        <div class="near">${near}</div>
      </div>
    </div>`;
  }
  $("#convForm").addEventListener("submit", e => { e.preventDefault(); convert(); });
  convert();

  /* ---------- Scale with milestones ---------- */
  $("#scaleMarks").innerHTML = MILES.map((m, i) => {
    const x = (m.e + Math.log10(m.m)) / CAP_E * 100;
    const align = x < 8 ? "align-items:flex-start;transform:none" : x > 90 ? "align-items:flex-end;transform:translateX(-100%)" : "";
    return `<div class="mk" style="left:${x}%;--i:${i};--lv:${[1, 2, 3, 0, 1, 2, 0, 1][i] ?? i % 3};${align}"><span class="mk-l">${esc(m.label)}<b>${esc(money(m.v))}</b></span></div>`;
  }).join("");
  $("#scale").insertAdjacentHTML("beforeend", `<div class="sc-axis"><span>$1</span><span>1e+100</span><span>1e+200</span><span>1e+300</span></div>`);
  MH.reveal($("#scale"));

  /* ---------- Ladder ---------- */
  const groups = [];
  SUF.forEach(s => { let g = groups[groups.length - 1]; if (!g || g.name !== s.g) groups.push(g = { name: s.g, list: [] }); g.list.push(s); });
  const q = $("#q"), only = $("#onlyNotes");
  const hay = s => (s.ab + " " + s.name + " " + s.notes.map(text).join(" ")).toLowerCase();
  let gio;
  function renderLadder() {
    const t = q.value.trim().toLowerCase();
    let shown = 0;
    const out = groups.map((g, gi) => {
      const list = g.list.filter(s => (!only.checked || s.notes.length) && (!t || hay(s).includes(t) || s.ab.toLowerCase() === t));
      if (!list.length) return "";
      shown += list.length;
      const h = (140 + gi * 23) % 360;
      const title = g.name.replace(/\s*\(.*\)\s*/, "");
      const first = g.list[0], last = g.list[g.list.length - 1];
      const tiles = list.map((s, i) => `<button class="tile" data-ab="${esc(s.ab)}" style="--i:${i}" title="Open $1${esc(s.ab)} in the converter">
          <span class="no">#${s.n}</span><span class="ab ${s.ab.length > 7 ? "long" : ""}">${esc(s.ab)}</span><span class="nm">${esc(s.name)}</span><span class="ex">1e+${s.e}</span>${s.notes.length ? `<span class="dot" title="Has milestones"></span>` : ""}
        </button>`).join("");
      const miles = list.filter(s => s.notes.length).flatMap(s => s.notes.map(n => `<div class="mile"><span class="tag">${esc(s.ab)}</span><span>${html(n)}</span></div>`)).join("");
      return `<section class="grp glass" style="--h:${h}">
        <div class="grp-head"><h3>${esc(title)}</h3><span class="rng">${esc(first.ab)} → ${esc(last.ab)}</span><span>1e+${first.e} to 1e+${last.e}</span></div>
        <div class="tiles">${tiles}</div>
        ${miles ? `<div class="miles">${miles}</div>` : ""}
      </section>`;
    }).join("");
    $("#groups").innerHTML = out;
    $("#count").innerHTML = `Showing <b>${shown}</b> of ${SUF.length} suffixes`;
    $("#empty").hidden = shown > 0;
    if (gio) gio.disconnect();
    gio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); gio.unobserve(e.target); } }), { rootMargin: "0px 0px -60px 0px" });
    document.querySelectorAll(".grp").forEach(g => gio.observe(g));
  }
  let qt;
  q.addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(renderLadder, 120); });
  only.addEventListener("change", renderLadder);
  $("#clear").addEventListener("click", () => { q.value = ""; only.checked = false; renderLadder(); });
  $("#groups").addEventListener("click", e => {
    const b = e.target.closest(".tile"); if (!b) return;
    convIn.value = "1" + b.dataset.ab; convert();
    $("#convert").scrollIntoView({ behavior: MH.reduceMotion ? "auto" : "smooth", block: "start" });
  });
  renderLadder();

  /* ---------- Cap staircase ---------- */
  (function stairs() {
    const W = 1000, H = 330, L = 64, R = 20, T = 24, B = 34;
    const t = d => new Date(d + "T00:00:00Z").getTime();
    const x0 = t("2015-06-01"), x1 = Date.now();
    const X = d => L + (t(d) - x0) / (x1 - x0) * (W - L - R);
    const Y = e => T + (1 - e / 320) * (H - T - B);
    const caps = D.caps;
    let d = `M ${X(caps[0].date)} ${Y(caps[0].e)}`;
    for (let i = 1; i < caps.length; i++) d += ` H ${X(caps[i].date)} V ${Y(caps[i].e)}`;
    const endX = W - R;
    d += ` H ${endX}`;
    const area = d + ` V ${Y(0)} H ${X(caps[0].date)} Z`;
    const years = [];
    for (let y = 2016; y <= new Date().getFullYear(); y++) years.push(y);
    const len = 4000;
    $("#stairs").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chart of the cash cap rising from Sextillion in 2015 to Uncentillion">
      <defs>
        <linearGradient id="stairGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#40d565" stop-opacity=".55"/><stop offset="1" stop-color="#40d565" stop-opacity="0"/></linearGradient>
        <linearGradient id="stairStroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#40d565"/><stop offset=".6" stop-color="#b6ff6b"/><stop offset="1" stop-color="#ffd16b"/></linearGradient>
      </defs>
      <g class="grid">${[0, 100, 200, 300].map(e => `<line x1="${L}" x2="${W - R}" y1="${Y(e)}" y2="${Y(e)}" />`).join("")}</g>
      <g class="axis">${[0, 100, 200, 300].map(e => `<text x="${L - 10}" y="${Y(e) + 4}" text-anchor="end">1e+${e}</text>`).join("")}
        ${years.map(y => `<text x="${X(y + "-01-01")}" y="${H - 8}" text-anchor="middle">${y}</text>`).join("")}</g>
      <path class="area" d="${area}" />
      <path class="line" d="${d}" style="--len:${len}" />
      ${caps.map((c, i) => `<g class="pt" style="--i:${i}"><title>${esc(c.label)}: ${esc(c.ab)} (1e+${c.e})</title><circle cx="${X(c.date)}" cy="${Y(c.e)}" r="6" /><text x="${X(c.date) + (i === caps.length - 1 ? -10 : 10)}" y="${i === 2 ? Y(c.e) + 22 : Y(c.e) - 10}" text-anchor="${i === caps.length - 1 ? "end" : "start"}">${i < 2 ? "" : i === 2 ? "sx → N → DD" : esc(c.ab)}</text></g>`).join("")}
    </svg>`;
    MH.reveal($("#stairs"));
    $("#capList").innerHTML = caps.map(c => `<li class="glass reveal"><div class="when">${esc(c.label)}</div><div class="what">${esc(c.ab)} <small style="font-size:12px;color:var(--faint)">1e+${c.e}</small></div><p>${esc(c.text)}</p></li>`).join("");
    document.querySelectorAll("#capList .reveal").forEach(MH.reveal);
    $("#timeline").innerHTML = D.timeline.map(x => `<li>${html(x)}</li>`).join("");
  })();

  /* ---------- Glitched ---------- */
  const cats = [];
  D.abnormal.forEach(a => { let c = cats[cats.length - 1]; if (!c || c.name !== a.cat) cats.push(c = { name: a.cat, list: [] }); c.list.push(a); });
  const CLS = n => /regular/i.test(n) ? "normal" : /patched/i.test(n) ? "patched" : "";
  const LAB = n => /regular/i.test(n) ? "Normal gameplay" : /patched/i.test(n) ? "Patched" : "Glitch, still possible";
  $("#glitchList").innerHTML = cats.map(c => `<h3 class="gl-cat reveal">${esc(c.name)}</h3><div class="gl-grid">${c.list.map(a => `
    <article class="gl glass reveal ${CLS(c.name)}">
      <span class="lab">${LAB(c.name)}</span><br />
      <span class="glitch" data-t="${esc(a.name)}">${esc(a.name)}</span>
      <p><b style="color:var(--text)">Cause:</b> ${html(a.cause)}</p>
      ${a.notes.length ? `<p>${html(a.notes)}</p>` : ""}
    </article>`).join("")}</div>`).join("");
  document.querySelectorAll("#glitchList .reveal").forEach(MH.reveal);

  /* ---------- Notation demo + trivia ---------- */
  const demo = $("#sciDemo");
  const samples = [[1.23, 4, "12,300"], [2.5, 19, "$25Qn"], [1, 39, "$1DD"], [4.56, -2, "0.0456"], [1, 303, "$1CENT"], [1.79, 308, `$179${MAX_SUF.ab}`]];
  let si = 0;
  function showDemo() {
    const [m, e, label] = samples[si++ % samples.length];
    demo.innerHTML = `<span class="d">${esc(label)}</span><span class="arrow">→</span><span class="e">${m}e${e < 0 ? e : "+" + e}</span>`;
    demo.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 400, easing: "ease-out" });
  }
  showDemo();
  if (!MH.reduceMotion) setInterval(showDemo, 2600);
  $("#trivia").innerHTML = D.trivia.map(x => `<li>${html(x[0])}${x.length > 1 ? `<ul>${x.slice(1).map(y => `<li>${html(y)}</li>`).join("")}</ul>` : ""}</li>`).join("")
    + `<li>Rebirthing with $inf still counts towards Overlord's Telamonster.</li><li>TalonMidnight once tested numbers as high as 1e+6603, with a prototype that could reach 1e+200,000.</li>`;

  /* ---------- Back to top ---------- */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));
})();
