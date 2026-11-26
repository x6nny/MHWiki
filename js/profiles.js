/* =========================================================
   Profiles: look up wiki accounts (needs accounts set up)
   Shows each account's picture, bio and banner, plus their Shiny Checklist, current rebirth
   and daily gift streak, from the trackers they save while signed in.
   Your own profile has an "Edit profile" window (picture, bio, banner colour).
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
    out.innerHTML = `<div class="pr-msg glass"><b>Profiles aren't switched on yet</b><p>They need wiki accounts. Set them up with the <b>Accounts</b> steps in the project's <code>README.md</code>, then come back here.</p></div>`;
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
        ? cur.map((u, i) => `<li role="option" data-u="${esc(u.username)}" class="${i === 0 ? "on" : ""}">${A.avatar(u, "pr-av sm")}<b>${esc(u.username)}</b>${u.admin ? `<em>Admin</em>` : ""}</li>`).join("")
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
    history.replaceState(null, "", "#u=" + encodeURIComponent(name) + (/[#&]edit=1/.test(location.hash) ? "&edit=1" : ""));
    out.innerHTML = `<div class="pr-loading glass"><span class="pr-orb"></span><b>Opening ${esc(name)}'s profile…</b></div>`;
    try {
      const r = await A.api("profiles.get", { username: name });
      if (my !== pTok) return;
      shown = r;
      render(r);
      if (r.self && /[#&]edit=1/.test(location.hash)) editor(r);
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
    const u = r.user, mine = r.self, me = A.state.user;
    const mod = !mine && me && me.admin;   // admins can take down someone's picture or bio
    const head = `
      <div class="pr-head glass" data-banner="${esc(BANNERS[u.banner] ? u.banner : "emerald")}">
        <div class="pr-banner" aria-hidden="true"></div>
        <div class="pr-head-row">
          ${A.avatar(u, "pr-av")}
          <div class="pr-who">
            <h2>${esc(u.username)}${u.admin ? ` <em class="pr-adm">Admin</em>` : ""}${mine ? ` <em class="pr-you">You</em>` : ""}</h2>
            <p>Joined ${fmtDay(u.joined)}${mine && u.hidden ? ` · <b class="pr-hid">Hidden from others</b>` : ""}</p>
          </div>
          <div class="pr-acts">
            ${mine ? `<button type="button" class="pr-btn pri" id="prEdit">Edit profile</button><button type="button" class="pr-btn" id="prVis">${u.hidden ? "Show my profile" : "Hide my profile"}</button>` : ""}
            <button type="button" class="pr-btn" id="prLink">Copy link</button>
            ${mod && u.avatar ? `<button type="button" class="pr-btn warn" data-clear="avatar">Remove picture</button>` : ""}
            ${mod && u.bio ? `<button type="button" class="pr-btn warn" data-clear="bio">Remove bio</button>` : ""}
          </div>
        </div>
        ${u.bio ? `<p class="pr-bio">${esc(u.bio)}</p>` : mine && !r.private ? `<p class="pr-bio empty"><button type="button" class="pr-link" id="prAddBio">Add a bio</button> so people know who you are.</p>` : ""}
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
    $("#prEdit")?.addEventListener("click", () => editor(r));
    $("#prAddBio")?.addEventListener("click", () => editor(r, "bio"));
    out.querySelectorAll("[data-clear]").forEach(b => b.addEventListener("click", async () => {
      const what = b.dataset.clear;
      if (!confirm(`Remove ${r.user.username}'s ${what === "avatar" ? "profile picture" : "bio"}?`)) return;
      b.disabled = true;
      try {
        await A.api("admin.clearProfile", { username: r.user.username, what });
        MH.toast(what === "avatar" ? "Picture removed" : "Bio removed");
        open(r.user.username);
      } catch (e) { MH.toast(e.message); b.disabled = false; }
    }));
  }

  /* ---------- edit your profile ---------- */
  const BANNERS = { emerald: "Emerald", ocean: "Ocean", violet: "Violet", sunset: "Sunset", rose: "Rose", gold: "Gold", ice: "Ice", mono: "Steel" };
  const BIO_MAX = 200, BIO_LINES = 6, PIC = 128, CROP = 240;
  let itemsP = null;   // wiki items, loaded the first time someone opens the item picker
  const loadItems = () => itemsP || (itemsP = fetch(A.root + "data/Items.json").then(x => x.json()).then(d => (Array.isArray(d) ? d : d.items || [])
    .filter(it => it && it.n && /^assets\/wiki\/[A-Za-z0-9._-]+\.(webp|png|jpe?g|gif)$/.test(it.img || ""))
    .map(it => ({ n: it.n, img: it.img, tier: it.tier || "" })))
    .catch(e => { itemsP = null; throw e; }));

  function editor(r, focus) {
    const u = r.user, was = { bio: u.bio || "", avatar: u.avatar || "", banner: BANNERS[u.banner] ? u.banner : "" };
    const v = { ...was };
    let crop = null, busy = false;
    const back = document.createElement("div");
    back.className = "pe-back";
    back.innerHTML = `
      <div class="pe glass" role="dialog" aria-modal="true" aria-labelledby="peT">
        <div class="pe-top"><h3 id="peT">Edit profile</h3><button type="button" class="pe-x" data-close aria-label="Close">×</button></div>
        <div class="pe-body">
          <div class="pe-prev pr-head glass" aria-label="Preview">
            <div class="pr-banner"></div>
            <div class="pr-head-row"><span class="pe-av"></span><div class="pr-who"><h2>${esc(u.username)}</h2><p>Preview</p></div></div>
            <p class="pr-bio"></p>
          </div>
          <section class="pe-sec">
            <h4>Profile picture</h4>
            <div class="pe-opts">
              <label class="pr-btn pe-up">Upload a picture<input type="file" id="peFile" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
              <button type="button" class="pr-btn" id="peItem">Use a wiki item</button>
              <button type="button" class="pr-btn" id="peNone">Use my initial</button>
            </div>
            <div class="pe-crop" id="peCrop" hidden>
              <canvas width="${CROP}" height="${CROP}" aria-label="Drag to move the picture"></canvas>
              <div class="pe-crop-side">
                <label>Zoom<input type="range" id="peZoom" min="1" max="4" step="0.01" value="1" /></label>
                <p>Drag the picture to choose what shows in the frame.</p>
              </div>
            </div>
            <div class="pe-items" id="peItems" hidden>
              <input type="search" id="peItemQ" placeholder="Search 1,400+ items…" aria-label="Search wiki items" autocomplete="off" />
              <ul id="peItemList" class="pe-item-list"></ul>
            </div>
            <p class="pe-hint">Pictures are public, so keep them friendly. Admins can remove ones that break the rules.</p>
          </section>
          <section class="pe-sec">
            <h4><label for="peBio">Bio</label> <span class="pe-cnt" id="peCnt"></span></h4>
            <textarea id="peBio" rows="4" maxlength="${BIO_MAX}" placeholder="Your favourite setup, how far you've got, what you're grinding for…"></textarea>
          </section>
          <section class="pe-sec">
            <h4>Banner colour</h4>
            <div class="pe-sw" role="radiogroup" aria-label="Banner colour">${Object.entries(BANNERS).map(([k, n]) => `<button type="button" role="radio" data-b="${k}" data-banner="${k}" title="${n}" aria-label="${n}"><i></i></button>`).join("")}</div>
          </section>
        </div>
        <div class="pe-foot"><span class="pe-err" id="peErr" role="alert"></span><button type="button" class="pr-btn" data-close>Cancel</button><button type="button" class="pr-btn pri" id="peSave">Save</button></div>
      </div>`;
    document.body.appendChild(back);
    document.documentElement.classList.add("pe-open");
    const P = s => back.querySelector(s);
    const bio = P("#peBio"), err = P("#peErr");
    bio.value = v.bio;

    const dirty = () => v.bio !== was.bio || v.avatar !== was.avatar || v.banner !== was.banner;
    function preview() {
      P(".pe-prev").dataset.banner = v.banner || "emerald";
      P(".pe-av").innerHTML = A.avatar({ username: u.username, avatar: v.avatar }, "pr-av");
      P(".pe-prev .pr-bio").textContent = v.bio || "Your bio shows here.";
      P(".pe-prev .pr-bio").classList.toggle("empty", !v.bio);
      back.querySelectorAll(".pe-sw button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.b === (v.banner || "emerald"))));
      const n = bio.value.length, lines = bio.value.split("\n").length;
      P("#peCnt").textContent = `${n} / ${BIO_MAX}`;
      P("#peCnt").classList.toggle("over", n > BIO_MAX || lines > BIO_LINES);
      P("#peSave").disabled = busy || !dirty();
    }
    function close() {
      if (dirty() && !busy && !confirm("Close without saving your changes?")) return;
      back.remove(); document.documentElement.classList.remove("pe-open");
      document.removeEventListener("keydown", onKey);
      if (location.hash.includes("edit=1")) history.replaceState(null, "", "#u=" + encodeURIComponent(u.username));
    }
    const onKey = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    back.addEventListener("click", e => { if (e.target === back || e.target.closest("[data-close]")) close(); });

    bio.addEventListener("input", () => { v.bio = bio.value.replace(/\n{3,}/g, "\n\n"); preview(); });
    P(".pe-sw").addEventListener("click", e => { const b = e.target.closest("[data-b]"); if (!b) return; v.banner = b.dataset.b === "emerald" ? "" : b.dataset.b; preview(); });
    P("#peNone").addEventListener("click", () => { v.avatar = ""; crop = null; P("#peCrop").hidden = true; P("#peItems").hidden = true; preview(); });

    /* upload + crop: the picture is cut to a square and shrunk to 128×128 here, before it's sent */
    P("#peFile").addEventListener("change", async e => {
      const f = e.target.files[0]; e.target.value = "";
      if (!f) return;
      err.textContent = "";
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) { err.textContent = "Pick a PNG, JPG, WebP or GIF picture."; return; }
      if (f.size > 15e6) { err.textContent = "That picture is over 15 MB. Try a smaller one."; return; }
      let img;
      try { img = await loadImage(f); } catch { err.textContent = "That picture couldn't be opened."; return; }
      P("#peItems").hidden = true; P("#peCrop").hidden = false;
      crop = { img, z: 1, x: 0, y: 0 };
      P("#peZoom").value = 1;
      drawCrop(); bake();
    });
    const cv = P("#peCrop canvas"), cx = cv.getContext("2d");
    function geom() {
      const { img, z } = crop, base = Math.max(CROP / img.width, CROP / img.height), s = base * z;
      const w = img.width * s, h = img.height * s;
      crop.x = Math.min(0, Math.max(CROP - w, crop.x)); crop.y = Math.min(0, Math.max(CROP - h, crop.y));
      return { w, h };
    }
    function drawCrop() {
      if (!crop) return;
      const { w, h } = geom();
      cx.fillStyle = "#0b1020"; cx.fillRect(0, 0, CROP, CROP);
      cx.drawImage(crop.img, crop.x, crop.y, w, h);
    }
    let bakeT = 0;
    function bake() {
      clearTimeout(bakeT);
      bakeT = setTimeout(() => {
        if (!crop) return;
        const out = document.createElement("canvas"); out.width = out.height = PIC;
        const o = out.getContext("2d"), k = PIC / CROP, { w, h } = geom();
        o.fillStyle = "#0b1020"; o.fillRect(0, 0, PIC, PIC);
        o.imageSmoothingQuality = "high";
        o.drawImage(crop.img, crop.x * k, crop.y * k, w * k, h * k);
        let q = .88, url = out.toDataURL("image/jpeg", q);
        while (url.length > 38000 && q > .4) { q -= .12; url = out.toDataURL("image/jpeg", q); }
        v.avatar = url; preview();
      }, 90);
    }
    P("#peZoom").addEventListener("input", e => {
      if (!crop) return;
      const old = crop.z, nz = +e.target.value, c = CROP / 2;
      crop.x = c - (c - crop.x) * nz / old; crop.y = c - (c - crop.y) * nz / old; crop.z = nz;
      drawCrop(); bake();
    });
    let drag = null;
    cv.addEventListener("pointerdown", e => { if (!crop) return; drag = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", e => { if (!drag) return; const k = CROP / cv.getBoundingClientRect().width; crop.x = drag.x + (e.clientX - drag.px) * k; crop.y = drag.y + (e.clientY - drag.py) * k; drawCrop(); });
    const endDrag = () => { if (drag) { drag = null; bake(); } };
    cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);
    cv.addEventListener("wheel", e => {
      if (!crop) return; e.preventDefault();
      const z = P("#peZoom"); z.value = Math.min(4, Math.max(1, +z.value - e.deltaY * .002)); z.dispatchEvent(new Event("input"));
    }, { passive: false });

    /* wiki item picker */
    P("#peItem").addEventListener("click", async () => {
      const box = P("#peItems"), list = P("#peItemList"), iq = P("#peItemQ");
      P("#peCrop").hidden = true; box.hidden = false; crop = null;
      list.innerHTML = `<li class="pe-wait">Loading items…</li>`;
      let all;
      try { all = await loadItems(); } catch { list.innerHTML = `<li class="pe-wait">Items couldn't load. Try again.</li>`; return; }
      const draw = () => {
        const t = iq.value.trim().toLowerCase();
        const arr = (t ? all.filter(it => it.n.toLowerCase().includes(t)) : all).slice(0, 60);
        list.innerHTML = arr.map(it => `<li><button type="button" data-img="${esc(it.img)}" title="${esc(it.n)}" aria-pressed="${it.img === v.avatar}"><img src="${esc(A.root + it.img)}" alt="" loading="lazy" /><span>${esc(it.n)}</span></button></li>`).join("")
          || `<li class="pe-wait">No items match “${esc(iq.value.trim())}”.</li>`;
      };
      iq.oninput = draw; draw(); iq.focus();
      list.onclick = e => {
        const b = e.target.closest("[data-img]"); if (!b) return;
        v.avatar = b.dataset.img;
        list.querySelectorAll("[data-img]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        preview();
      };
    });

    P("#peSave").addEventListener("click", async () => {
      const patch = {};
      ["bio", "avatar", "banner"].forEach(k => { if (v[k] !== was[k]) patch[k] = v[k]; });
      if (patch.bio != null && (patch.bio.length > BIO_MAX || patch.bio.split("\n").length > BIO_LINES)) { err.textContent = `Bios can be up to ${BIO_MAX} characters and ${BIO_LINES} lines.`; return; }
      busy = true; err.textContent = ""; P("#peSave").textContent = "Saving…"; preview();
      try {
        const { profile } = await A.api("profiles.update", patch);
        Object.assign(was, profile); Object.assign(v, profile);
        A.updateUser({ avatar: profile.avatar });
        busy = false; close();
        MH.toast("Profile saved");
        Object.assign(r.user, profile); render(r);
      } catch (e) {
        busy = false; err.textContent = e.message; P("#peSave").textContent = "Save"; preview();
      }
    });

    preview();
    (focus === "bio" ? bio : P(".pe-x")).focus();
  }
  function loadImage(file) {
    return new Promise((ok, no) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); im.width && im.height ? ok(im) : no(); };
      im.onerror = () => { URL.revokeObjectURL(url); no(); };
      im.src = url;
    });
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
  window.addEventListener("hashchange", () => {
    const u = new URLSearchParams(location.hash.slice(1)).get("u");
    if (u && (!shown || shown.user.username.toLowerCase() !== u.toLowerCase())) open(u);
    else if (shown && shown.self && /[#&]edit=1/.test(location.hash) && !document.querySelector(".pe-back")) editor(shown);   // "Edit profile" in the account menu
  });
})();
