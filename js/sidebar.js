/* =========================================================
   Sidebar menu: collapse to icons, phone drawer, page filter,
   collapsible groups. State is saved in "mh-sidebar-v1".
   ========================================================= */
(() => {
  const sb = document.getElementById("sidebar");
  if (!sb) return;
  const html = document.documentElement;
  const KEY = "mh-sidebar-v1";
  let st = { mini: false, closed: [] };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const phone = () => window.matchMedia("(max-width: 1180px)").matches;
  // laptop-size screens get a slim rail that opens over the page instead of pushing it
  const rail = () => window.matchMedia("(min-width: 1181px) and (max-width: 1559px)").matches;

  /* ---------- Collapse to icons (desktop) ---------- */
  const colBtn = document.getElementById("sbCollapse");
  const label = () => {
    const shut = rail() ? !html.classList.contains("sb-peek") : html.classList.contains("sb-mini");
    colBtn.setAttribute("aria-label", shut ? "Expand menu" : "Collapse menu");
    colBtn.title = shut ? "Expand menu" : "Collapse menu";
  };
  const setMini = on => { html.classList.toggle("sb-mini", on); label(); };
  setMini(!!st.mini);
  let peekTimer;
  const peek = on => { clearTimeout(peekTimer); html.classList.toggle("sb-peek", on); label(); };
  colBtn.addEventListener("click", () => {
    if (rail()) { peek(!html.classList.contains("sb-peek")); return; }
    st.mini = !html.classList.contains("sb-mini"); setMini(st.mini); save();
    window.dispatchEvent(new Event("resize")); // let charts and sliders re-measure
  });
  sb.addEventListener("mouseenter", () => { if (rail()) { clearTimeout(peekTimer); peekTimer = setTimeout(() => peek(true), 120); } });
  sb.addEventListener("mouseleave", () => { if (rail() && !sb.contains(document.activeElement)) { clearTimeout(peekTimer); peekTimer = setTimeout(() => peek(false), 250); } });
  sb.addEventListener("focusin", () => { if (rail()) peek(true); });
  sb.addEventListener("focusout", e => { if (rail() && !sb.contains(e.relatedTarget) && !sb.matches(":hover")) peek(false); });
  document.addEventListener("pointerdown", e => { if (rail() && html.classList.contains("sb-peek") && !sb.contains(e.target)) peek(false); });

  /* ---------- Phone drawer ---------- */
  const openBtn = document.getElementById("sbOpen"), scrim = document.getElementById("sbScrim");
  let lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    scrim.hidden = false;
    requestAnimationFrame(() => html.classList.add("sb-open"));
    openBtn.setAttribute("aria-expanded", "true");
    setTimeout(() => (sb.querySelector(".sb-link.current") || sb.querySelector(".sb-link")).focus({ preventScroll: true }), 60);
  }
  function closeDrawer() {
    if (!html.classList.contains("sb-open")) return;
    html.classList.remove("sb-open");
    openBtn.setAttribute("aria-expanded", "false");
    setTimeout(() => { scrim.hidden = true; }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  openBtn.addEventListener("click", openDrawer);
  document.getElementById("sbClose").addEventListener("click", closeDrawer);
  scrim.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && html.classList.contains("sb-open")) closeDrawer(); });
  // jump links on the same page (e.g. homepage sections) close the drawer
  sb.addEventListener("click", e => { if (e.target.closest("a") && phone()) setTimeout(closeDrawer, 50); });
  window.addEventListener("resize", () => { if (!phone()) closeDrawer(); if (!rail()) html.classList.remove("sb-peek"); label(); });

  /* ---------- Groups ---------- */
  sb.querySelectorAll(".sb-group").forEach(g => {
    const btn = g.querySelector(".sb-gh"), id = g.dataset.g;
    const set = open => { g.classList.toggle("shut", !open); btn.setAttribute("aria-expanded", open); };
    // the group holding the current page always starts open
    set(!st.closed.includes(id) || !!g.querySelector(".current"));
    btn.addEventListener("click", () => {
      const open = g.classList.contains("shut");
      set(open);
      st.closed = st.closed.filter(x => x !== id); if (!open) st.closed.push(id);
      save();
    });
  });

  /* ---------- Find a page ---------- */
  const find = document.getElementById("sbFind"), none = document.getElementById("sbNone");
  const links = [...sb.querySelectorAll(".sb-nav .sb-link")];
  find.addEventListener("input", () => {
    const q = find.value.trim().toLowerCase();
    sb.classList.toggle("finding", !!q);
    let shown = 0;
    links.forEach(a => { const hit = !q || a.textContent.toLowerCase().includes(q); a.hidden = !hit; if (hit) shown++; });
    sb.querySelectorAll(".sb-group").forEach(g => { g.hidden = !!q && !g.querySelector(".sb-link:not([hidden])"); });
    none.hidden = shown > 0;
  });
  find.addEventListener("keydown", e => {
    if (e.key === "Enter") { const a = links.find(x => !x.hidden); if (a) location.href = a.href; }
    if (e.key === "Escape") { find.value = ""; find.dispatchEvent(new Event("input")); find.blur(); }
  });
  // in icon-only mode, clicking the search icon opens the menu up again
  sb.querySelector(".sb-find").addEventListener("mousedown", () => {
    if (rail()) { peek(true); setTimeout(() => find.focus(), 50); }
    else if (html.classList.contains("sb-mini") && !phone()) { st.mini = false; setMini(false); save(); setTimeout(() => find.focus(), 50); }
  });
  // "/" focuses the finder (the homepage keeps "/" for its own search)
  document.addEventListener("keydown", e => {
    if (e.key !== "/" || document.getElementById("palette")) return;
    const t = document.activeElement;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    e.preventDefault();
    if (phone()) openDrawer();
    else if (rail()) peek(true);
    else if (html.classList.contains("sb-mini")) { st.mini = false; setMini(false); save(); }
    setTimeout(() => find.focus(), 60);
  });

  // keep the current page visible in a long menu
  const cur = sb.querySelector(".sb-nav .current");
  if (cur) { const nav = sb.querySelector(".sb-nav"); const r = cur.offsetTop - nav.clientHeight / 2; if (r > 0) nav.scrollTop = r; }
})();
