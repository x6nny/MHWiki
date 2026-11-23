/* =========================================================
   Miner's Haven Wiki: shared behaviour for section pages
   (animated backdrop, nav, toast, scroll reveal, count-up)
   ========================================================= */
const MH = (() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Nav shrink on scroll */
  const nav = document.getElementById("nav");
  const onScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 20);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Priority nav: move links that don't fit into a "More" menu */
  (function priorityNav() {
    const inner = document.querySelector(".subpage .nav-inner");
    const links = inner && inner.querySelector(".nav-links");
    if (!links) return;
    const all = [...links.querySelectorAll("a")];
    const more = document.createElement("div");
    more.className = "nav-more";
    more.innerHTML = `<button class="nav-more-btn" type="button" aria-haspopup="true" aria-expanded="false">More <svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="nav-more-menu glass" role="menu"></div>`;
    links.appendChild(more);
    const btn = more.firstElementChild, menu = more.lastElementChild;
    const over = () => inner.scrollWidth > inner.clientWidth + 1;
    // Move links one at a time until everything fits
    function fitStep() {
      all.forEach(a => links.insertBefore(a, more));
      more.classList.remove("has");
      if (getComputedStyle(links).display === "none" || !over()) return;
      more.classList.add("has");
      const queue = all.filter(a => !a.classList.contains("current")).reverse();
      while (over() && queue.length) {
        const a = queue.shift();
        const after = all.slice(all.indexOf(a) + 1).find(x => x.parentNode === menu);
        menu.insertBefore(a, after || null);
      }
      btn.classList.toggle("cur", !!menu.querySelector(".current"));
    }
    const close = () => { more.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", e => { e.stopPropagation(); const o = more.classList.toggle("open"); btn.setAttribute("aria-expanded", o); });
    document.addEventListener("click", e => { if (!more.contains(e.target)) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    let raf;
    window.addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { close(); fitStep(); }); });
    fitStep();
    document.fonts && document.fonts.ready.then(fitStep);
  })();

  /* Floating ore particles */
  (function oreField() {
    const canvas = document.getElementById("ore-field");
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    const colors = ["#34f5a4", "#38d9ff", "#a77bff", "#ffc857", "#ff6b9a"];
    let w, h, ores = [];
    const spawn = anywhere => ({
      x: Math.random() * w, y: anywhere ? Math.random() * h : h + 20,
      s: 2 + Math.random() * 5, v: 0.15 + Math.random() * 0.45,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.02, sway: Math.random() * 6.28,
      c: colors[(Math.random() * colors.length) | 0], a: 0.25 + Math.random() * 0.5,
    });
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ores = Array.from({ length: Math.round(Math.min(50, (w * h) / 30000)) }, () => spawn(true));
    }
    function tick() {
      ctx.clearRect(0, 0, w, h);
      ores.forEach((o, i) => {
        o.y -= o.v; o.r += o.vr; o.sway += 0.01;
        if (o.y < -20) ores[i] = spawn(false);
        ctx.save();
        ctx.translate(o.x + Math.sin(o.sway) * 12, o.y); ctx.rotate(o.r);
        ctx.globalAlpha = o.a; ctx.shadowColor = o.c; ctx.shadowBlur = 12; ctx.fillStyle = o.c;
        ctx.fillRect(-o.s / 2, -o.s / 2, o.s, o.s);
        ctx.restore();
      });
      requestAnimationFrame(tick);
    }
    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(tick);
  })();

  /* Toast */
  const toastEl = document.getElementById("toast");
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  /* Scroll reveal: staggered within each batch that becomes visible together */
  const io = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach((e, idx) => {
      e.target.style.setProperty("--rd", `${Math.min(idx, 6) * 70}ms`);
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { threshold: 0, rootMargin: "0px 0px -40px 0px" });
  const reveal = el => io.observe(el);
  document.querySelectorAll(".reveal").forEach(reveal);

  /* Count-up numbers */
  function countUp(el, target, dur = 1500) {
    if (reduceMotion) { el.textContent = target.toLocaleString("en-US"); return; }
    const start = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))).toLocaleString("en-US");
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }


  /* ---------- Currency icons ----------
     Wraps amounts like "500 Shards of Life", "35 Candy", "117 uC", "75k RP", "R$95",
     "350 Gold Clovers" and "10 Present Value" in an icon + number. Money ($) only gets an
     icon inside [data-cur-money] (price boxes), so prose and suffix tables stay clean.
     Runs on everything the page renders, now and later. Skip a block with [data-nocur]. */
  const ASSETS = (() => {
    const s = document.querySelector('script[src*="common.js"]');
    return s ? s.getAttribute("src").replace(/js\/common\.js.*$/, "") + "assets/" : "../assets/";
  })();
  const NUM = String.raw`(?<![\w$.,])\d[\d,]*(?:\.\d+)?(?:\s?[kKmMbB]\b)?`;
  const RANGE = `${NUM}(?:\\s?(?:to|-|–|&)\\s?${NUM})?`;
  const CUR = [
    { k: "shard", re: `(${RANGE})\\s?Shards? of Life\\b`, icon: "sol/shard.webp", name: "Shards of Life" },
    { k: "shard2", re: `(${RANGE})\\s?[Ss]hards?\\b(?! of Life)`, icon: "sol/shard.webp", name: "Shards of Life" },
    { k: "clover", re: `(${RANGE})\\s?Gold(?:en)? Clovers?\\b`, icon: "icons/st-patty.png", name: "Golden Clovers" },
    { k: "candy", re: `(${RANGE})\\s?Candy\\b`, icon: "icons/candy.png", name: "Candy" },
    { k: "present", re: `(${RANGE})\\s?Present Value\\b`, icon: "icons/winter.png", name: "Present Value" },
    { k: "uc", re: `(${RANGE})\\s?uC\\b`, icon: "icons/uc.png", name: "Unobtainium Crystals (uC)" },
    { k: "rp", re: `(${RANGE})\\s?RP\\b`, icon: "icons/rp.png", name: "Research Points" },
    { k: "robux", re: `R\\$\\s?(${RANGE})`, icon: "icons/robux.png", name: "Robux" },
    { k: "robux2", re: `(${RANGE})\\s?(?:R\\$|Robux)(?![\\w$])`, icon: "icons/robux.png", name: "Robux" },
    { k: "money", re: `(?<![R\\w])(\\$\\s?\\d[\\d,.]*\\s?[A-Za-z]{0,8}(?:\\s?(?:to|-|–)\\s?\\$\\s?\\d[\\d,.]*\\s?[A-Za-z]{0,8})?)`, icon: "icons/money.png", name: "Cash", money: true },
  ];
  const curRe = new RegExp(CUR.map(c => `(?<${c.k}>${c.re.replace(/\((?!\?)/g, "(?:")})`).join("|"), "g");
  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "CODE", "NOSCRIPT"]);
  function curNode(t) {
    const txt = t.nodeValue;
    if (!txt || txt.length < 2 || !/\d/.test(txt)) return;
    const host = t.parentElement;
    if (!host || SKIP.has(host.tagName) || host.closest("mh-cur, svg, [data-nocur], .nav, .footer, .toast, [contenteditable]")) return;
    const money = !!host.closest("[data-cur-money]");
    curRe.lastIndex = 0;
    let m, last = 0, frag = null;
    while ((m = curRe.exec(txt))) {
      const c = CUR.find(x => m.groups[x.k] !== undefined);
      if (!c || (c.money && !money)) continue;
      frag = frag || document.createDocumentFragment();
      if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
      const el = document.createElement("mh-cur");
      el.className = "cur-" + c.k.replace(/\d$/, "");
      el.title = c.name;
      const img = document.createElement("img");
      img.src = ASSETS + c.icon; img.alt = ""; img.decoding = "async";
      el.appendChild(img);
      // keep the number (and $ for cash); the icon stands in for the unit
      const inner = new RegExp(c.re).exec(m[0]);
      el.appendChild(document.createTextNode((c.money ? m[0] : (inner && inner[1] ? inner[1] : m[0])).replace(/\s+/g, " ").trim()));
      frag.appendChild(el);
      last = m.index + m[0].length;
    }
    if (!frag) return;
    if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
    t.replaceWith(frag);
  }
  function curify(root) {
    if (!root) return;
    if (root.nodeType === 3) { curNode(root); return; }
    if (root.nodeType !== 1 || SKIP.has(root.tagName) || root.tagName === "MH-CUR") return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(curNode);
  }
  let pending = new Set(), queued = false;
  const flush = () => { queued = false; const nodes = [...pending]; pending.clear(); nodes.forEach(n => n.isConnected && curify(n)); };
  new MutationObserver(muts => {
    for (const mu of muts) {
      if (mu.type === "characterData") pending.add(mu.target);
      else mu.addedNodes.forEach(n => { if (!(n.nodeType === 1 && n.tagName === "MH-CUR")) pending.add(n); });
    }
    if (!queued && pending.size) { queued = true; requestAnimationFrame(flush); }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  curify(document.body);


  /* Daily reset: Miner's Haven daily rewards (tasks, Daily Gifts, Fargield, Spook McDooks)
     refresh at 8:00 PM New York time (01:00 UTC in winter, 00:00 UTC in summer). */
  const RESET_TZ = "America/New_York", RESET_HOUR = 20;
  const tzParts = (t, tz) => { const o = {}; new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(t).forEach(p => o[p.type] = +p.value || p.value); return o; };
  const tzOffset = t => { const p = tzParts(t, RESET_TZ); return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(t / 1000) * 1000; };
  const nyTime = (y, m, d, h) => { let g = Date.UTC(y, m, d, h); for (let i = 0; i < 2; i++) g = Date.UTC(y, m, d, h) - tzOffset(g); return g; };
  function dailyReset(now = Date.now()) {
    const p = tzParts(now, RESET_TZ);
    let next = nyTime(p.year, p.month - 1, p.day, RESET_HOUR);
    if (next <= now) next = nyTime(p.year, p.month - 1, p.day + 1, RESET_HOUR);
    const q = tzParts(next - 30 * 36e5, RESET_TZ); // a time on the previous New York day
    const prev = nyTime(q.year, q.month - 1, q.day, RESET_HOUR);
    const k = tzParts(next - 12 * 36e5, RESET_TZ); // the day this reset period ends on
    const key = `${k.year}-${String(k.month).padStart(2, "0")}-${String(k.day).padStart(2, "0")}`;
    const local = new Date(next).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return { next, prev, key, left: next - now, local };
  }
  return { curify, reduceMotion, toast, reveal, countUp, dailyReset };
})();
