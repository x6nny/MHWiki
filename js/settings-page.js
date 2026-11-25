/* =========================================================
   Settings page
   Uses window.MH_SETTINGS from js/settings.js
   ========================================================= */
(() => {
  const ST = window.MH_SETTINGS;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Themes ---------- */
  const THEMES = [
    { id: "haven", name: "Haven", desc: "The original emerald and violet glow", bg: "#06080f", bd: ["#142046", "#0d2a2a"], c: ["#34f5a4", "#38d9ff", "#a77bff", "#ffc857"] },
    { id: "midnight", name: "Midnight", desc: "Deep navy with cool blue light", bg: "#04060d", bd: ["#12205a", "#0a1838"], c: ["#5ea8ff", "#7cc4ff", "#7b7bff", "#ffd27a"] },
    { id: "inferno", name: "Inferno", desc: "Embers, lava and molten orange", bg: "#0b0505", bd: ["#3d0f0a", "#2e1405"], c: ["#ff8a3d", "#ffb547", "#ff4d6d", "#ffd166"] },
    { id: "spectral", name: "Spectral", desc: "Ghostly purple and pink", bg: "#07040d", bd: ["#2c104c", "#10183c"], c: ["#c77dff", "#7ad7ff", "#ff7ad9", "#ffd36b"] },
    { id: "toxic", name: "Toxic", desc: "Radioactive green and lime", bg: "#040904", bd: ["#12361a", "#1f3a0a"], c: ["#7cff6b", "#c6ff4d", "#2bd9a5", "#e8ff5a"] },
    { id: "frost", name: "Frost", desc: "Icy blues for winter grinding", bg: "#050a10", bd: ["#143450", "#0e2c3c"], c: ["#9fe8ff", "#d2f5ff", "#8fb4ff", "#fff1b8"] },
    { id: "gilded", name: "Gilded", desc: "Gold and amber, Masked Man approved", bg: "#0a0805", bd: ["#3c2a0c", "#2c1d0a"], c: ["#ffd36b", "#ffe9a8", "#e0a64a", "#ff8f6b"] },
    { id: "oled", name: "OLED Black", desc: "Pure black, easy on OLED screens", bg: "#000", bd: ["transparent", "transparent"], c: ["#34f5a4", "#38d9ff", "#a77bff", "#ffc857"] },
  ];
  const tg = $("#themes");
  tg.innerHTML = THEMES.map((t, i) => `
    <button type="button" class="th glass reveal" role="radio" data-theme="${t.id}" style="--i:${i}">
      <span class="th-prev" style="background:radial-gradient(120% 90% at 85% -10%, ${t.bd[0]}, transparent 60%), radial-gradient(90% 80% at -10% 40%, ${t.bd[1]}, transparent 60%), ${t.bg}">
        <i class="tb1" style="background:${t.c[0]}"></i><i class="tb2" style="background:${t.c[2]}"></i><i class="tb3" style="background:${t.c[1]}"></i>
        <span class="th-card"><span style="background:linear-gradient(90deg, ${t.c[0]}, ${t.c[1]})"></span><span></span><span></span></span>
        <span class="th-check" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      </span>
      <span class="th-info"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></span>
      <span class="th-sw">${t.c.map(c => `<i style="background:${c}"></i>`).join("")}</span>
    </button>`).join("");
  tg.querySelectorAll(".reveal").forEach(MH.reveal);
  tg.addEventListener("click", e => {
    const b = e.target.closest(".th"); if (!b) return;
    if (ST.get().theme === b.dataset.theme) return;
    ST.set({ theme: b.dataset.theme });
    MH.toast(`${THEMES.find(t => t.id === b.dataset.theme).name} theme on`);
  });

  /* ---------- Segmented options + switches ---------- */
  const DESC = {
    motion: {
      full: "Everything moves: page transitions, hover effects and floating ores.",
      reduced: "Small transitions only. Nothing loops and the background stays still.",
      off: "No animations or transitions at all.",
    },
    bg: {
      animated: "Drifting glow and floating ores behind every page.",
      still: "The same glow, frozen in place. No floating ores.",
      plain: "Just the dark gradient: no glow, grid or ores.",
    },
  };
  document.querySelectorAll(".st-seg").forEach(seg => seg.addEventListener("click", e => {
    const b = e.target.closest("button[data-v]"); if (!b) return;
    ST.set({ [seg.dataset.key]: b.dataset.v });
  }));
  document.querySelectorAll(".st-switch input").forEach(inp => inp.addEventListener("change", () => {
    ST.set({ [inp.dataset.key]: inp.checked });
    if (inp.dataset.key === "cur" && inp.checked) MH.curify(document.body);
  }));

  function draw() {
    const s = ST.get();
    tg.querySelectorAll(".th").forEach(b => { const on = b.dataset.theme === s.theme; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
    document.querySelectorAll(".st-seg").forEach(seg => seg.querySelectorAll("button").forEach(b => {
      const on = s[seg.dataset.key] === b.dataset.v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
    }));
    document.querySelectorAll(".st-switch input").forEach(inp => { inp.checked = !!s[inp.dataset.key]; });
    $("#motionDesc").textContent = DESC.motion[s.motion];
    $("#bgDesc").textContent = DESC.bg[s.bg];
    $("#curDemo").innerHTML = s.cur ? `<img src="../assets/icons/uc.png" alt="" />10` : "10 uC";
  }
  $("#osNote").hidden = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.addEventListener("mh-settings", () => { draw(); drawData(); });
  draw();

  /* ---------- Saved data ---------- */
  const KNOWN = {
    "mh-shiny-checklist-v1": ["Shiny Checklist", "Shinies you've found, with life, date, copies and notes"],
    "mh-rebirth-tracker-v1": ["Rebirth Tracker", "Your plan and milestone log"],
    "mh-task-tracker-v1": ["Daily Tasks tracker", "Tasks you're working on and your task history"],
    "mh-gift-streak-v1": ["Daily Gift streak", "Your login streak and what you own"],
    "mh-ut-cache-v1": ["User Tracker cache", "Staff and badge lists, refreshed every few hours"],
    "mh-settings-v1": ["Settings", "Theme, animations and the options on this page"],
  };
  const mine = () => { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("mh-")) out.push(k); } } catch (e) {} return out.sort((a, b) => (KNOWN[a] ? 0 : 1) - (KNOWN[b] ? 0 : 1) || a.localeCompare(b)); };
  const size = n => n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  function drawData() {
    const keys = mine();
    $("#dataList").innerHTML = keys.length ? keys.map(k => {
      const [n, d] = KNOWN[k] || [k, "Saved by the wiki"];
      const v = localStorage.getItem(k) || "";
      return `<div class="sd"><span class="sd-dot"></span><div><b>${esc(n)}</b><small>${esc(d)}</small></div><em>${size(new Blob([v]).size)}</em></div>`;
    }).join("") : `<p class="sd-empty">Nothing saved yet. Your checklists and trackers will show up here once you use them.</p>`;
    $("#dlAll").disabled = !keys.length;
  }
  drawData();

  const download = (name, text) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  $("#dlAll").addEventListener("click", () => {
    const data = {}; mine().forEach(k => { const v = localStorage.getItem(k); try { data[k] = JSON.parse(v); } catch (e) { data[k] = v; } });
    download(`haven-wiki-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "HavenWiki backup", exported: new Date().toISOString(), data }, null, 2));
    MH.toast("Backup downloaded");
  });
  $("#upAll").addEventListener("change", e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const j = JSON.parse(t);
      // a full backup from this page, or a single Shiny Checklist / Rebirth Tracker backup
      let entries;
      if (j && j.data && typeof j.data === "object") entries = Object.entries(j.data).filter(([k]) => k.startsWith("mh-"));
      else if (j && j.items && typeof j.items === "object") entries = [["mh-shiny-checklist-v1", { v: 1, items: j.items }]];
      else if (j && (j.plan || j.log)) entries = [["mh-rebirth-tracker-v1", { plan: j.plan, log: j.log }]];
      if (!entries || !entries.length) throw new Error("not a backup");
      entries.forEach(([k, v]) => localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)));
      MH.toast(`Loaded ${entries.length} saved item${entries.length === 1 ? "" : "s"}`);
      if (entries.some(([k]) => k === ST.KEY)) setTimeout(() => location.reload(), 700);
      drawData();
    }).catch(() => MH.toast("That file isn't a HavenWiki backup"));
    e.target.value = "";
  });
  $("#resetSettings").addEventListener("click", () => { ST.reset(); MH.toast("Settings reset"); });
  const clr = $("#clearAll"); let armed = 0;
  clr.addEventListener("click", () => {
    if (Date.now() > armed) {
      armed = Date.now() + 4000; clr.textContent = "Click again to delete everything";
      setTimeout(() => { if (Date.now() > armed) clr.textContent = "Clear all saved data"; }, 4100);
      return;
    }
    armed = 0; mine().forEach(k => localStorage.removeItem(k));
    clr.textContent = "Clear all saved data"; ST.reset(); drawData(); MH.toast("All saved data cleared");
  });

  /* Back to top */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));
})();
