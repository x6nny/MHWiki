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

  return { reduceMotion, toast, reveal, countUp };
})();
