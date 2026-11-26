/* =========================================================
   Profiles: look up wiki accounts (needs accounts set up)
   Shows each account's Shiny Checklist, current rebirth and daily gift streak,
   from the trackers they save while signed in.
   Data: window.MH_SHINY (data/Shinies.json) for shiny names and pictures.
   ========================================================= */
(() => {
  const D = window.MH_SHINY, A = window.MH_ACCOUNT;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const RM = MH.reduceMotion;
  const out = $("#prOut"), form = $("#prForm"), q = $("#prQ"), hits = $("#prHits");

  if (!A || !A.ready) {
    form.hidden = true;
    out.innerHTML = `<div class="pr-msg glass"><b>Profiles aren't switched on yet</b><p>They need wiki accounts. Set them up with <code>GOOGLE-SHEETS-SETUP.md</code> in the project folder, then come back here.</p></div>`;
    return;
  }

  /* ---------- shinies (same keys as the Shiny Checklist) ---------- */
  const SH = [];
  D.items.forEach(it => it.sh.forEach((s, j) => SH.push({
    key: it.n + "|" + (s.nm || s.k + j), item: it.n, tier: it.t, kind: s.k, ev: s.ev || "", u: s.u || it.img,
    name: (s.nm ? s.nm + " " : s.k === "L" ? "Limited Shiny " : "Shiny ") + it.n.replace(/ \(Renegade\)$/, "") + (/ \(Renegade\)$/.test(it.n) ? " (Renegade)" : ""),
  })));
  const SHK = Object.fromEntries(SH.map(s => [s.key, s]));
  Object.entries(D.renamed || {}).forEach(([o, n]) => { if (SHK[n]) SHK[o] = SHK[n]; });   // old names still count

  /* ---------- search ---------- */
  let qTimer = 0, qTok = 0, cur = [];
  q.addEventListener("input", () => {
    clearTimeout(qTimer);
    const v = q.value.trim();
    if (!v) { hits.hidden = true; form.classList.remove("busy"); return; }
    qTimer = setTimeout(() => find(v), 300);
  });
  async function find(v) {
    const my = ++qTok;
    form.classList.add("busy");
    try {
      const r = await A.api("profiles.search", { q: v });
      if (my !== qTok) return;
      cur = r.users;
      hits.innerHTML = cur.length
        ? cur.map((u, i) => `<li role="option" data-u="${esc(u.username)}" class="${i === 0 ? "on" : ""}"><span class="pr-av sm">${esc(u.username[0].toUpperCase())}</span><b>${esc(u.username)}</b>${u.admin ? `<em>Admin</em>` : ""}</li>`).join("")
        : `<li class="none">No accounts match “${esc(v)}”</li>`;
      hits.hidden = false;
    } catch (e) {
      if (my !== qTok) return;
      hits.innerHTML = `<li class="none">${esc(e.message)}</li>`; hits.hidden = false;
    } finally { if (my === qTok) form.classList.remove("busy"); }
  }
  hits.addEventListener("click", e => { const li = e.target.closest("li[data-u]"); if (li) open(li.dataset.u); });
  q.addEventListener("keydown", e => {
    if (hits.hidden || !["ArrowDown", "ArrowUp"].includes(e.key)) return;
    const items = [...hits.querySelectorAll("li[data-u]")]; if (!items.length) return;
    e.preventDefault();
    let i = items.findIndex(x => x.classList.contains("on"));
    i = (i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
    items.forEach((x, j) => x.classList.toggle("on", j === i));
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const sel = hits.hidden ? null : hits.querySelector("li.on[data-u]");
    const v = sel ? sel.dataset.u : q.value.trim();
    if (v) open(v);
  });
  document.addEventListener("click", e => { if (!form.contains(e.target)) hits.hidden = true; });

  /* ---------- open a profile ---------- */
  let pTok = 0, shown = null;
  async function open(name) {
    const my = ++pTok;
    hits.hidden = true; q.value = name; q.blur();
    history.replaceState(null, "", "#u=" + encodeURIComponent(name));
    out.innerHTML = `<div class="pr-loading glass"><span class="pr-orb"></span><b>Opening ${esc(name)}'s profile…</b></div>`;
    try {
      const r = await A.api("profiles.get", { username: name });
      if (my !== pTok) return;
      shown = r;
      render(r);
    } catch (e) {
      if (my !== pTok) return;
      out.innerHTML = e.code === "notfound"
        ? `<div class="pr-msg glass"><b>No account called “${esc(name)}”</b><p>Check the spelling, or search above to find them.</p></div>`
        : `<div class="pr-msg glass err"><b>Couldn't open that profile</b><p>${esc(e.message)}</p><button type="button" class="pr-btn" id="prRetry">Try again</button></div>`;
      $("#prRetry")?.addEventListener("click", () => open(name));
    }
  }

  /* ---------- render ---------- */
  const fmtDay = iso => new Date(iso + (iso.length === 10 ? "T12:00:00Z" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const since = iso => {
    const d = (Date.now() - Date.parse(iso)) / 864e5;
    return d < 1 / 24 ? "just now" : d < 1 ? `${Math.round(d * 24)}h ago` : d < 60 ? `${Math.round(d)}d ago` : fmtDay(iso);
  };
  const pic = (u, n) => `<img src="${esc(MH_SRC(u))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:${esc(JSON.stringify((n || '?')[0]))}}))" />`;
  const RING = 2 * Math.PI * 52;

  function render(r) {
    const u = r.user, mine = r.self;
    const head = `
      <div class="pr-head glass">
        <span class="pr-av">${esc(u.username[0].toUpperCase())}</span>
        <div class="pr-who">
          <h2>${esc(u.username)}${u.admin ? ` <em class="pr-adm">Admin</em>` : ""}${mine ? ` <em class="pr-you">You</em>` : ""}</h2>
          <p>Joined ${fmtDay(u.joined)}${mine && u.hidden ? ` · <b class="pr-hid">Hidden from others</b>` : ""}</p>
        </div>
        <div class="pr-acts">
          ${mine ? `<button type="button" class="pr-btn" id="prVis">${u.hidden ? "Show my profile" : "Hide my profile"}</button>` : ""}
          <button type="button" class="pr-btn" id="prLink">Copy link</button>
        </div>
      </div>`;
    if (r.private) {
      out.innerHTML = head + `<div class="pr-msg glass"><b>This profile is private</b><p>${esc(u.username)} has chosen to hide their profile.</p></div>`;
      bindHead(r); return;
    }
    const sh = r.shiny, rb = r.rebirth, st = r.streak;
    const owned = sh ? sh.owned.map(k => SHK[k]).filter(Boolean) : [];
    const uniq = [...new Map(owned.map(s => [s.key, s])).values()];
    const total = SH.length, pct = total ? uniq.length / total : 0;
    const lim = uniq.filter(s => s.kind === "L").length;

    // streak status, in the wiki's 00:00 UTC days
    let stTxt = "", stCls = "";
    if (st) {
      const today = MH.dailyReset().key;
      const gap = st.last ? Math.round((Date.parse(today + "T12:00:00Z") - Date.parse(st.last + "T12:00:00Z")) / 864e5) : null;
      if (gap === 0) { stTxt = "Claimed today"; stCls = "ok"; }
      else if (gap === 1) { stTxt = "Claimed yesterday · today's gift is waiting"; stCls = "wait"; }
      else if (gap != null && gap > 1) { stTxt = `Last claimed ${fmtDay(st.last)} · the streak may have reset`; stCls = "old"; }
      else stTxt = "No claims logged yet";
    }
    const lifeTxt = rb ? (rb.s ? "S+" : "") + fmt(rb.life) : "";
    const goalPct = rb && rb.goal > 0 ? Math.min(1, rb.life / rb.goal) : 0;

    out.innerHTML = head + `
      <div class="pr-cards">
        <article class="pr-card pr-sh glass" style="--d:0">
          <h3><img src="../assets/icons/shiny.png" alt="" /> Shiny Checklist</h3>
          ${sh ? `<div class="pr-ring">
              <svg viewBox="0 0 120 120"><circle class="t" cx="60" cy="60" r="52"/><circle class="a" cx="60" cy="60" r="52" style="stroke-dasharray:${RING};stroke-dashoffset:${RING}" data-off="${RING * (1 - pct)}"/></svg>
              <div><b data-count="${uniq.length}">0</b><small>of ${fmt(total)}</small></div>
            </div>
            <p class="pr-sub"><b>${(pct * 100).toFixed(pct > 0 && pct < .01 ? 1 : 0)}%</b> collected · <b>${lim}</b> Limited</p>
            <p class="pr-upd">Updated ${since(sh.updated_at)}</p>`
          : `<p class="pr-none">${esc(u.username)} hasn't saved a Shiny Checklist yet.</p>`}
        </article>
        <article class="pr-card pr-rb glass" style="--d:1">
          <h3><img src="../assets/icons/rebirth.png" alt="" /> Current Rebirth</h3>
          ${rb ? `<div class="pr-big"><small>Life</small><b>${esc(lifeTxt)}</b></div>
            ${rb.s ? `<p class="pr-sub">After the Second Sacrifice</p>` : `<p class="pr-sub">&nbsp;</p>`}
            ${rb.goal > rb.life ? `<div class="pr-goal"><span>Goal ${rb.s ? "S+" : ""}${fmt(rb.goal)}</span><span class="bar"><i data-w="${goalPct * 100}"></i></span><span>${(goalPct * 100).toFixed(0)}%</span></div>` : ""}
            <p class="pr-upd">Updated ${since(rb.updated_at)}</p>`
          : `<p class="pr-none">${esc(u.username)} hasn't saved the Rebirth Tracker yet.</p>`}
        </article>
        <article class="pr-card pr-st glass" style="--d:2">
          <h3><img src="../assets/icons/uc.png" alt="" /> Daily Streak</h3>
          ${st ? `<div class="pr-big"><small>Day</small><b data-count="${st.streak}">0</b></div>
            <p class="pr-sub pr-stat ${stCls}">${esc(stTxt)}</p>
            <div class="pr-week" aria-label="Day ${((Math.max(st.streak, 1) - 1) % 7) + 1} of the 7-day cycle">${Array.from({ length: 7 }, (_, i) => `<i class="${st.streak > 0 && i < ((st.streak - 1) % 7) + 1 ? "on" : ""}"></i>`).join("")}</div>
            <p class="pr-upd">Updated ${since(st.updated_at)}</p>`
          : `<p class="pr-none">${esc(u.username)} hasn't saved a daily streak yet.</p>`}
        </article>
      </div>
      ${uniq.length ? `<section class="pr-show glass">
        <div class="pr-show-head">
          <h3>Shinies ${esc(u.username)} owns <span>${fmt(uniq.length)}</span></h3>
          <div class="pr-show-tools">
            <div class="pr-chips" id="prKind"><button type="button" data-k="all" class="on">All</button><button type="button" data-k="S">Shiny</button><button type="button" data-k="L">Limited</button></div>
            <label class="pr-filter"><input id="prShQ" type="search" placeholder="Filter…" aria-label="Filter shinies" /></label>
          </div>
        </div>
        <ul class="pr-grid" id="prGrid"></ul>
        <button type="button" class="pr-more" id="prMore" hidden>Show more</button>
      </section>` : ""}`;
    bindHead(r);
    animate();
    if (uniq.length) grid(uniq);
  }

  function animate() {
    requestAnimationFrame(() => {
      out.querySelectorAll(".pr-ring .a").forEach(a => { a.style.strokeDashoffset = a.dataset.off; });
      out.querySelectorAll(".pr-goal i").forEach(i => { i.style.width = i.dataset.w + "%"; });
      out.querySelectorAll("[data-count]").forEach(el => {
        const to = +el.dataset.count;
        if (RM || !to) { el.textContent = fmt(to); return; }
        const t0 = performance.now(), dur = 900;
        (function s(now) { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(s); })(t0);
      });
    });
  }

  function grid(list) {
    const g = $("#prGrid"), more = $("#prMore"), fq = $("#prShQ");
    let kind = "all", n = 48;
    const draw = () => {
      const t = fq.value.trim().toLowerCase();
      const arr = list.filter(s => (kind === "all" || s.kind === kind) && (!t || (s.name + " " + s.ev + " " + s.tier).toLowerCase().includes(t)))
        .sort((a, b) => (b.kind === "L") - (a.kind === "L") || a.name.localeCompare(b.name));
      g.innerHTML = arr.slice(0, n).map((s, i) => `<li class="pr-sh-it${s.kind === "L" ? " lim" : ""}" style="--i:${Math.min(i, 20)}" title="${esc(s.name)}${s.ev ? " · " + esc(s.ev) : ""}">
          <a href="item-index.html#item=${encodeURIComponent(s.item)}"><span class="pic">${pic(s.u, s.item)}</span><b>${esc(s.name)}</b>${s.kind === "L" ? `<em>Limited${s.ev ? " · " + esc(s.ev) : ""}</em>` : `<em>${esc(s.tier)}</em>`}</a>
        </li>`).join("") || `<li class="pr-none">No shinies match.</li>`;
      more.hidden = arr.length <= n;
      more.textContent = `Show ${fmt(arr.length - n)} more`;
    };
    $("#prKind").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; kind = b.dataset.k; $("#prKind").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); n = 48; draw(); });
    fq.addEventListener("input", () => { n = 48; draw(); });
    more.addEventListener("click", () => { n += 96; draw(); });
    draw();
  }

  function bindHead(r) {
    $("#prLink").addEventListener("click", async () => {
      const url = location.origin + location.pathname + "#u=" + encodeURIComponent(r.user.username);
      try { await navigator.clipboard.writeText(url); MH.toast("Profile link copied"); } catch { prompt("Copy this link:", url); }
    });
    $("#prVis")?.addEventListener("click", () => A.setVisibility(!r.user.hidden));
  }
  // re-open your own profile after hiding/showing it
  window.addEventListener("mh-profile-visibility", () => { if (shown && shown.self) open(shown.user.username); });

  /* ---------- start ---------- */
  const start = new URLSearchParams(location.hash.slice(1)).get("u");
  if (start) open(start);
  else {
    const me = A.state.user;
    out.innerHTML = `<div class="pr-msg glass pr-intro"><b>Find a player</b><p>Type a wiki username above. ${me ? `Or <button type="button" class="pr-link" id="prMine">open your own profile</button>.` : `Players show up once they've made a wiki account.`}</p></div>`;
    $("#prMine")?.addEventListener("click", () => open(me.username));
  }
  window.addEventListener("hashchange", () => { const u = new URLSearchParams(location.hash.slice(1)).get("u"); if (u && (!shown || shown.user.username.toLowerCase() !== u.toLowerCase())) open(u); });
})();
