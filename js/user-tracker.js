/* =========================================================
   User Tracker page
   Live Roblox data through RoProxy (https://roproxy.com), which mirrors
   Roblox's web APIs with CORS headers so a static site can read them.
   Static data: window.MH_TRACKER (js/tracker-data.js)
   ========================================================= */
(() => {
  const T = window.MH_TRACKER || { creators: {}, eggItems: [] }, BASE = window.MH_IMG_BASE;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const short = n => n >= 1e9 ? +(n / 1e9).toFixed(1) + "B" : n >= 1e6 ? +(n / 1e6).toFixed(1) + "M" : n >= 1e4 ? +(n / 1e3).toFixed(1) + "k" : fmt(n);
  const RM = MH.reduceMotion;
  const wiki = (p, s = 80) => p ? `${BASE}${p}/revision/latest/scale-to-width-down/${s}` : "";
  const ITEM = n => "item-index.html#item=" + encodeURIComponent(n);

  const API = svc => `https://${svc}.roproxy.com`;
  const UNIVERSE = 105689481, PLACE = 258258996;
  const GROUPS = [
    { id: 1137635, name: "berezaa Games" },
    { id: 4242744, name: "Area S-51" }
  ];
  const CATS = [
    { k: "dev", label: "Developers", one: "Developer", re: /^(berezaa|admin|lead dev(eloper)?|developer|dev|jr\.? dev)$/i },
    { k: "mod", label: "Moderators", one: "Moderator", re: /^(moderator|community manager)$/i },
    { k: "con", label: "Contributors", one: "Contributor", re: /^(contributor|artist)$/i },
    { k: "test", label: "Testers", one: "Tester", re: /^tester$/i },
    { k: "sub", label: "Submitters", one: "Submitter" }
  ];
  const catOf = roleName => CATS.find(c => c.re && c.re.test(String(roleName).trim()));

  /* ---------- Network ---------- */
  async function req(url, opt = {}, tries = 5) {
    for (let a = 0; a < tries; a++) {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
      try {
        const r = await fetch(url, { ...opt, signal: ctl.signal });
        clearTimeout(to);
        // RoProxy answers bursts with 429; back off and try again
        if (r.status === 429 || r.status >= 500) { if (a < tries - 1) { await new Promise(res => setTimeout(res, 900 * (a + 1))); continue; } return { ok: false, status: r.status, body: null }; }
        const body = await r.json().catch(() => null);
        return { ok: r.ok, status: r.status, body };
      } catch (e) { clearTimeout(to); if (a === tries - 1) throw e; await new Promise(res => setTimeout(res, 700)); }
    }
    return { ok: false, status: 429, body: null };
  }
  const get = async url => { const r = await req(url); if (!r.ok) { const e = new Error("HTTP " + r.status); e.status = r.status; throw e; } return r.body; };
  async function pool(items, n, fn, onEach) {
    let i = 0, done = 0; const out = new Array(items.length);
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = e; } done++; onEach && onEach(done, items.length); }
    }));
    return out;
  }
  const CK = "mh-ut-cache-v1", TTL = 6 * 3600e3;
  const cache = (() => { try { return JSON.parse(localStorage.getItem(CK) || "{}"); } catch (e) { return {}; } })();
  const cget = k => cache[k] && Date.now() - cache[k].t < TTL ? cache[k].d : null;
  const cset = (k, d) => { cache[k] = { t: Date.now(), d }; try { localStorage.setItem(CK, JSON.stringify(cache)); } catch (e) {} };

  async function headshots(ids, size = 150) {
    const map = {};
    for (let i = 0; i < ids.length; i += 100) {
      const b = await get(`${API("thumbnails")}/v1/users/avatar-headshot?userIds=${ids.slice(i, i + 100).join(",")}&size=${size}x${size}&format=Png&isCircular=false`).catch(() => null);
      (b && b.data || []).forEach(x => { if (x.imageUrl) map[x.targetId] = x.imageUrl; });
    }
    return map;
  }

  /* ---------- Miner's Haven badges (cached) ---------- */
  const EGG_RE = /egg|legg|eggle|burgor|stormcrow|borker/i;
  // Ruby Crystallizer: own every egg except the Noob Egg, Eggield, Egg of Illusion and the rare eggs
  const RARE_EGGS = ["baby borker", "eggield", "leggacy", "stormcrow", "wisdom egg"];
  const RUBY_SKIP = ["noob egg", "eggield", "egg of illusion", "egg of illusions", ...RARE_EGGS];
  const eggKey = b => b.name.toLowerCase().replace(/\s+/g, " ").trim();
  const isRare = b => RARE_EGGS.includes(eggKey(b));
  const rubyNeeds = b => !RUBY_SKIP.includes(eggKey(b));
  const isEgg = b => EGG_RE.test(b.name) || /you (found|discovered)|egg'?s reward/i.test(b.desc);
  let badgeP = null;
  function loadBadges() {
    if (badgeP) return badgeP;
    const c = cget("badges"); if (c) return (badgeP = Promise.resolve(c));
    badgeP = (async () => {
      let all = []; let cur = "";
      try {
        for (let p = 0; p < 10; p++) {
          const b = await get(`${API("badges")}/v1/universes/${UNIVERSE}/badges?limit=100&sortOrder=Asc${cur ? "&cursor=" + encodeURIComponent(cur) : ""}`);
          all.push(...b.data); cur = b.nextPageCursor; if (!cur) break;
        }
      } catch (e) {
        // Fall back to the snapshot in tracker-data.js
        all = (T.badges || []).map(b => ({ id: b.id, name: b.name, description: b.desc, statistics: { awardedCount: b.awarded }, created: b.created }));
        if (!all.length) throw e;
      }
      const icons = {};
      for (let i = 0; i < all.length; i += 100) {
        const b = await get(`${API("thumbnails")}/v1/badges/icons?badgeIds=${all.slice(i, i + 100).map(x => x.id).join(",")}&size=150x150&format=Png`).catch(() => null);
        (b && b.data || []).forEach(x => { if (x.imageUrl) icons[x.targetId] = x.imageUrl; });
      }
      const list = all.filter(b => b.enabled !== false).map(b => ({
        id: b.id, name: String(b.displayName || b.name).trim(), desc: String(b.displayDescription || b.description || "").trim(),
        awarded: b.statistics ? b.statistics.awardedCount : 0, created: b.created, icon: icons[b.id] || ""
      }));
      if (list.some(b => b.icon)) cset("badges", list);
      return list;
    })().catch(e => { badgeP = null; throw e; });
    return badgeP;
  }
  const normName = s => String(s).toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
  const eggItem = b => {
    const m = b.desc.match(/grants access to (?:the )?(.+?)(?:[.!]|$)/i);
    const want = normName(m ? m[1] : b.name);
    if (!want) return null;
    return T.eggItems.find(([n]) => normName(n) === want) || T.eggItems.find(([n]) => { const k = normName(n); return k.length > 3 && (want.startsWith(k) || k.startsWith(want)); }) || null;
  };

  /* ---------- Staff directory (cached) ---------- */
  let staffP = null;
  async function liveStaff() {
    const people = {};
    for (const g of GROUPS) {
      const roles = (await get(`${API("groups")}/v1/groups/${g.id}/roles`)).roles || [];
      for (const r of roles) {
        const cat = catOf(r.name); if (!cat || !r.memberCount) continue;
        let cur = "";
        for (let p = 0; p < 5; p++) {
          const b = await get(`${API("groups")}/v1/groups/${g.id}/roles/${r.id}/users?limit=100&sortOrder=Asc${cur ? "&cursor=" + encodeURIComponent(cur) : ""}`);
          (b.data || []).forEach(u => {
            const p0 = people[u.userId] || (people[u.userId] = { id: u.userId, name: u.username, dn: u.displayName, roles: [] });
            p0.roles.push({ cat: cat.k, role: r.name.trim(), group: g.name, rank: r.rank });
          });
          cur = b.nextPageCursor; if (!cur) break;
        }
        await new Promise(res => setTimeout(res, 250)); // be gentle with the proxy
      }
    }
    return Object.values(people);
  }
  function loadStaff() {
    if (staffP) return staffP;
    staffP = (async () => {
      let list = cget("staff");
      if (!list) {
        try { list = await liveStaff(); if (!list.length) throw 0; }
        catch (e) { list = (T.staff && T.staff.people || []).map(p => ({ ...p, roles: p.roles.map(r => ({ ...r })) })); }
        const pics = await headshots(list.map(p => p.id)).catch(() => ({}));
        list.forEach(p => p.img = pics[p.id] || "");
        if (list.some(p => p.img)) cset("staff", list);
      }
      return list;
    })().catch(e => { staffP = null; throw e; });
    return staffP;
  }

  /* ---------- Search ---------- */
  const form = $("#searchForm"), input = $("#q"), result = $("#result");
  const RK = "mh-ut-recent";
  let recent = []; try { recent = JSON.parse(localStorage.getItem(RK) || "[]"); } catch (e) {}
  function drawRecent() {
    $("#recent").innerHTML = recent.length ? `<span>Recent</span>` + recent.map(n => `<button type="button" data-u="${esc(n)}">${esc(n)}</button>`).join("") + `<button type="button" class="clr" data-clear="1" aria-label="Clear recent searches">×</button>` : "";
  }
  $("#recent").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.clear) { recent = []; try { localStorage.removeItem(RK); } catch (er) {} drawRecent(); return; }
    input.value = b.dataset.u; search(b.dataset.u);
  });
  drawRecent();
  form.addEventListener("submit", e => { e.preventDefault(); const v = input.value.trim(); if (v) search(v); });

  let token = 0;
  async function search(q) {
    const my = ++token;
    form.classList.add("busy"); $("#go").disabled = true;
    result.hidden = false;
    result.innerHTML = `<div class="ut-loading glass"><span class="ld-orb"></span><b>Finding ${esc(q)}…</b></div>`;
    try {
      // 1. Resolve the player
      let user;
      if (/^\d{1,15}$/.test(q)) {
        const r = await req(`${API("users")}/v1/users/${q}`);
        if (r.ok) user = { id: r.body.id, name: r.body.name, displayName: r.body.displayName, hasVerifiedBadge: r.body.hasVerifiedBadge };
      }
      if (!user) {
        // No Content-Type header keeps this a "simple" request (no CORS preflight)
        const r = await req(`${API("users")}/v1/usernames/users`, { method: "POST", body: JSON.stringify({ usernames: [q], excludeBannedUsers: false }) });
        if (!r.ok) throw Object.assign(new Error("lookup"), { status: r.status });
        user = r.body && r.body.data && r.body.data[0];
      }
      if (my !== token) return;
      if (!user) { result.innerHTML = notFound(q); return; }
      history.replaceState(null, "", "#u=" + encodeURIComponent(user.name));
      recent = [user.name, ...recent.filter(n => n.toLowerCase() !== user.name.toLowerCase())].slice(0, 6);
      try { localStorage.setItem(RK, JSON.stringify(recent)); } catch (e) {}
      drawRecent();

      // 2. Everything public about them, in parallel
      const id = user.id;
      const [prof, pic, fr, fo, fi, view, groups, badges] = await Promise.all([
        get(`${API("users")}/v1/users/${id}`).catch(() => ({})),
        get(`${API("thumbnails")}/v1/users/avatar-headshot?userIds=${id}&size=420x420&format=Png&isCircular=false`).then(b => b.data && b.data[0] && b.data[0].imageUrl).catch(() => ""),
        get(`${API("friends")}/v1/users/${id}/friends/count`).then(b => b.count).catch(() => null),
        get(`${API("friends")}/v1/users/${id}/followers/count`).then(b => b.count).catch(() => null),
        get(`${API("friends")}/v1/users/${id}/followings/count`).then(b => b.count).catch(() => null),
        get(`${API("inventory")}/v1/users/${id}/can-view-inventory`).then(b => !!b.canView).catch(() => null),
        get(`${API("groups")}/v2/users/${id}/groups/roles`).then(b => b.data || []).catch(() => []),
        loadBadges()
      ]);
      if (my !== token) return;
      const P = { ...user, ...prof, pic, counts: { friends: fr, followers: fo, following: fi }, view, groups, badges };
      render(P);

      // 3. Badge ownership, one check per badge (only possible with a public inventory)
      if (view) {
        const SK = "mh-ut-own-" + id;
        let prev = null; try { prev = JSON.parse(sessionStorage.getItem(SK) || "null"); } catch (e) {}
        if (prev && Date.now() - prev.t < 15 * 60e3) { fillBadges(P, new Set(prev.own), new Set()); return; }
        const st = $("#bdgState");
        const res = await checkOwned(id, badges, (d, n) => {
          if (my !== token || !st) return;
          st.querySelector("b").textContent = `${d} / ${n}`; st.querySelector("i").style.width = d / n * 100 + "%";
        });
        if (my !== token) return;
        if (!res.unk.size) try { sessionStorage.setItem(SK, JSON.stringify({ t: Date.now(), own: [...res.own] })); } catch (e) {}
        fillBadges(P, res.own, res.unk);
      }
    } catch (e) {
      if (my !== token) return;
      result.innerHTML = `<div class="ut-msg glass err"><b>Couldn't reach Roblox right now</b><p>The lookup service didn't answer${e.status ? ` (error ${e.status})` : ""}. Wait a moment and try again.</p><button type="button" class="ut-btn" id="retry">Try again</button></div>`;
      $("#retry").addEventListener("click", () => search(q));
    } finally {
      if (my === token) { form.classList.remove("busy"); $("#go").disabled = false; }
    }
  }
  const notFound = q => `<div class="ut-msg glass"><img src="../assets/icons/masked-man.png" alt="" /><b>No player called “${esc(q)}”</b><p>Check the spelling. Usernames are the @name on a Roblox profile, not the display name.</p></div>`;

  // Ask Roblox about each badge. Checks that still fail after retries stay "unknown", never "missing".
  async function checkOwned(id, list, onEach) {
    const r = await pool(list, 4, b => get(`${API("inventory")}/v1/users/${id}/items/2/${b.id}/is-owned`), onEach);
    const own = new Set(), unk = new Set();
    list.forEach((b, i) => { if (r[i] === true) own.add(b.id); else if (r[i] !== false) unk.add(b.id); });
    return { own, unk };
  }

  /* ---------- Render ---------- */
  const fmtDate = d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  function age(d) {
    const days = (Date.now() - new Date(d)) / 864e5;
    if (days < 60) return `${Math.floor(days)} days`;
    if (days < 730) return `${Math.floor(days / 30.44)} months`;
    return `${(days / 365.25).toFixed(1).replace(/\.0$/, "")} years`;
  }
  function roleChips(P) {
    const chips = [];
    P.groups.forEach(g => {
      const grp = GROUPS.find(x => x.id === (g.group && g.group.id)); if (!grp) return;
      const cat = catOf(g.role.name);
      chips.push({ cat: cat ? cat.k : "member", text: g.role.name.trim(), group: grp.name });
    });
    const sub = T.creators[String(P.name).toLowerCase()];
    if (sub) chips.push({ cat: "sub", text: `Submitter · ${sub.items.length} item${sub.items.length === 1 ? "" : "s"}`, group: "Miner's Haven wiki" });
    return chips;
  }
  function render(P) {
    const chips = roleChips(P), sub = T.creators[String(P.name).toLowerCase()];
    const nonEgg = P.badges.filter(b => !isEgg(b)), eggs = P.badges.filter(isEgg);
    const cnt = (k, l) => P.counts[k] == null ? "" : `<div><b>${short(P.counts[k])}</b><small>${l}</small></div>`;
    const bio = String(P.description || "").trim();
    result.innerHTML = `
      <article class="pf glass">
        <div class="pf-av${P.pic ? "" : " none"}">${P.pic ? `<img src="${esc(P.pic)}" alt="" />` : esc((P.name || "?")[0])}<span class="pf-ring"></span></div>
        <div class="pf-main">
          <div class="pf-names"><h2>${esc(P.displayName || P.name)}${P.hasVerifiedBadge ? `<svg class="vf" viewBox="0 0 24 24" width="20" height="20" aria-label="Verified"><path d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1 3 1 3-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1-2.8-1.6 1-3-1-3 2.8-1.6.9-3.1 3.2.3Z" fill="#3c8cff"/><path d="M8 12.3l2.6 2.6L16.2 9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ""}</h2>
            <span>@${esc(P.name)} · ID ${esc(P.id)}</span></div>
          ${P.isBanned ? `<div class="pf-ban">This account is banned on Roblox</div>` : ""}
          <div class="pf-meta">
            ${P.created ? `<div><b>${esc(fmtDate(P.created))}</b><small>Joined Roblox · ${esc(age(P.created))} ago</small></div>` : ""}
            ${cnt("friends", "Friends")}${cnt("followers", "Followers")}${cnt("following", "Following")}
          </div>
          <div class="pf-roles">${chips.length ? chips.map(c => `<span class="rc-${c.cat}" title="${esc(c.group)}">${esc(c.text)}<small>${esc(c.group)}</small></span>`).join("") : `<span class="none">No staff roles found</span>`}</div>
          ${bio ? `<p class="pf-bio">${esc(bio.length > 220 ? bio.slice(0, 220) + "…" : bio)}</p>` : ""}
          <div class="pf-links"><a href="https://www.roblox.com/users/${P.id}/profile" target="_blank" rel="noopener">Roblox profile ↗</a><button type="button" id="copyLink">Copy link to this page</button></div>
        </div>
      </article>

      ${P.view === false ? `
      <div class="hidden-pf glass">
        <div class="hp-lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="40" height="40"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="15.5" r="1.6" fill="currentColor"/></svg></div>
        <div><h3>Hidden Profile</h3><p>${esc(P.displayName || P.name)}'s inventory is private, so their badges and Eggxotic eggs can't be seen. They can make it public in Roblox Settings → Privacy → "Who can see my inventory?".</p></div>
      </div>` : P.view == null ? `<div class="ut-msg glass"><b>Couldn't check badges</b><p>Roblox didn't say whether this inventory is public. Try again in a moment.</p></div>` : `
      <section class="rs-block" id="bdg">
        <div class="rs-head"><h3>Badges</h3><div class="rs-sum" id="bdgSum"><span class="bdg-state" id="bdgState">Checking badges <b>0 / ${P.badges.length}</b><span class="bar"><i></i></span></span></div></div>
        <div class="bd-tools"><div class="seg" id="bdFilter"><button type="button" class="on" data-f="all">All</button><button type="button" data-f="own">Owned</button><button type="button" data-f="miss">Missing</button></div>
          <p class="bd-note">Roblox only shares badge dates with logged-in accounts, so the date each badge was earned can't be shown.</p></div>
        <div class="bd-grid" id="bdGrid">${nonEgg.map(b => badgeCard(b)).join("")}</div>
      </section>
      <section class="rs-block egg-block" id="egg">
        <div class="rs-head"><h3>Eggxotic eggs</h3></div>
        <div class="egg-top">
          <div class="egg-ring" id="eggRing"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="eg-bg"/><circle cx="60" cy="60" r="52" class="eg-fg"/></svg><div><b>0</b><small>of ${eggs.length}</small></div></div>
          <div class="egg-txt"><p>Each egg found in the Egg Hunt grants an Eggxotic item at the Flea Bag. Glowing eggs are the ones ${esc(P.displayName || P.name)} has found.</p><div class="egg-bar"><i></i></div><span id="eggPct">Checking…</span></div>
        </div>
        ${rubyCard(eggs)}
        <div class="egg-grid" id="eggGrid">${eggs.map(b => eggCard(b)).join("")}</div>
      </section>`}

      <section class="rs-block">
        <div class="rs-head"><h3>Staff &amp; friends</h3></div>
        <div class="fr-box">
          <div class="fr-n"><b>${P.counts.friends == null ? "?" : fmt(P.counts.friends)}</b><small>friends</small></div>
          <p>Roblox now hides friend lists from anyone who isn't logged in, so this page can't list which developers, moderators, contributors, testers or submitters ${esc(P.displayName || P.name)} is friends with. ${chips.some(c => c.cat !== "member") ? `They do hold a role themselves (shown above).` : ""} The <a class="xlink" href="#staff">staff list below</a> shows everyone with a known role.</p>
        </div>
      </section>

      ${sub ? `<section class="rs-block">
        <div class="rs-head"><h3>Items ${esc(P.displayName || P.name)} made</h3><span class="rs-count">${sub.items.length} item${sub.items.length === 1 ? "" : "s"} credited on the wiki</span></div>
        <div class="mk-grid">${sub.items.slice(0, 60).map(([n, img, tier]) => `<a class="mk" href="${ITEM(n)}" title="${esc(n)} · ${esc(tier)}"><span class="mk-pic">${img ? `<img src="${esc(wiki(img, 80))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>${esc(n[0])}</span>'" />` : `<span class="ph">${esc(n[0])}</span>`}</span><span class="mk-n">${esc(n)}<small>${esc(tier)}</small></span></a>`).join("")}</div>
        ${sub.items.length > 60 ? `<p class="rs-more">Showing 60 of ${sub.items.length}.</p>` : ""}
      </section>` : ""}`;
    MH.curify(result);
    $("#copyLink").addEventListener("click", () => {
      const url = location.href.split("#")[0] + "#u=" + encodeURIComponent(P.name);
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => MH.toast("Link copied"), () => MH.toast(url));
    });
    const f = $("#bdFilter");
    if (f) f.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      f.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      $("#bdGrid").dataset.f = b.dataset.f;
    });
    if (!RM) result.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const badgeCard = b => `<div class="bd" data-id="${b.id}">
      <span class="bd-ic">${b.icon ? `<img src="${esc(b.icon)}" alt="" loading="lazy" />` : ""}</span>
      <div class="bd-m"><b>${esc(b.name)}</b><p>${esc(b.desc)}</p><small>${short(b.awarded)} players have it</small></div>
      <span class="bd-st" aria-hidden="true"></span></div>`;
  function rubyCard(eggs) {
    const it = T.eggItems.find(([n]) => /^ruby crystal/i.test(n)) || ["Ruby Crystallizer", ""];
    const need = eggs.filter(rubyNeeds).length;
    return `<div class="ruby" id="ruby">
      <a class="ruby-pic" href="${ITEM(it[0])}">${it[1] ? `<img src="${esc(wiki(it[1], 160))}" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>R</span>'" />` : `<span class="ph">R</span>`}<i class="ruby-shine" aria-hidden="true"></i></a>
      <div class="ruby-m">
        <small>Bonus Eggxotic</small>
        <a class="ruby-n" href="${ITEM(it[0])}">${esc(it[0])}</a>
        <p>Claimed at the Flea Bag once you have every egg except the Noob Egg, Eggield, Egg of Illusion and the rare eggs (Baby Borker, Leggacy, Stormcrow and Wisdom Egg).</p>
        <div class="ruby-bar"><i></i></div>
        <span class="ruby-st" id="rubySt">Checking 0 / ${need} eggs…</span>
        <div class="ruby-miss" id="rubyMiss"></div>
      </div>
    </div>`;
  }
  function eggCard(b) {
    const it = eggItem(b);
    return `<div class="eg${isRare(b) ? " rare" : ""}${rubyNeeds(b) ? "" : " noruby"}" data-id="${b.id}" title="${esc(b.name)}${it ? " → " + esc(it[0]) : ""}">${isRare(b) ? `<em class="eg-tag">Rare</em>` : ""}
      <span class="eg-ic">${b.icon ? `<img src="${esc(b.icon)}" alt="" loading="lazy" />` : ""}</span>
      <b>${esc(b.name)}</b>${it ? `<a href="${ITEM(it[0])}">${esc(it[0])}</a>` : /future/i.test(b.desc) ? `<small>Reward coming later</small>` : ""}</div>`;
  }
  function fillBadges(P, own, unk) {
    const nonEgg = P.badges.filter(b => !isEgg(b)), eggs = P.badges.filter(isEgg);
    const nOwn = nonEgg.filter(b => own.has(b.id)).length, eOwn = eggs.filter(b => own.has(b.id)).length;
    document.querySelectorAll(".bd, .eg").forEach((el, i) => {
      const bid = +el.dataset.id, st = own.has(bid) ? "own" : unk.has(bid) ? "unk" : "miss";
      el.classList.remove("own", "miss", "unk");
      setTimeout(() => el.classList.add(st), RM ? 0 : Math.min(i, 60) * 18);
    });
    const pct = nonEgg.length ? nOwn / nonEgg.length * 100 : 0;
    $("#bdgSum").innerHTML = `<span class="bdg-done"><b>${nOwn}</b> / ${nonEgg.length} badges · ${pct.toFixed(0)}%</span><span class="bar done"><i style="width:${pct}%"></i></span>`
      + (unk.size ? `<span class="unk-note">${unk.size} badge${unk.size === 1 ? "" : "s"} couldn't be checked (Roblox was busy) <button type="button" id="recheck">Check again</button></span>` : "");
    const ring = $("#eggRing"); if (ring) {
      const C = 2 * Math.PI * 52, p = eggs.length ? eOwn / eggs.length : 0;
      const fg = ring.querySelector(".eg-fg"); fg.style.strokeDasharray = C;
      requestAnimationFrame(() => requestAnimationFrame(() => { fg.style.strokeDashoffset = C * (1 - p); }));
      const b = ring.querySelector("b"); MH.countUp(b, eOwn, 900);
      $(".egg-bar i").style.width = p * 100 + "%";
      const eUnk = eggs.filter(x => unk.has(x.id)).length;
      $("#eggPct").textContent = eOwn === eggs.length ? "Every egg found! 🥚" : `${eOwn} found, ${eggs.length - eOwn - eUnk} to go${eUnk ? `, ${eUnk} unchecked` : ""} (${(p * 100).toFixed(0)}%)`;
    }
    // Ruby Crystallizer
    const req = eggs.filter(rubyNeeds), rOwn = req.filter(b => own.has(b.id)).length;
    const rUnk = req.filter(b => unk.has(b.id)), rMiss = req.filter(b => !own.has(b.id) && !unk.has(b.id));
    const rb = $("#ruby"); if (rb) {
      rb.classList.toggle("got", rOwn === req.length);
      rb.querySelector(".ruby-bar i").style.width = (req.length ? rOwn / req.length * 100 : 0) + "%";
      $("#rubySt").textContent = rOwn === req.length ? `Unlocked! All ${req.length} eggs found.`
        : rMiss.length ? `${rOwn} / ${req.length} eggs · ${rMiss.length} still needed${rUnk.length ? `, ${rUnk.length} unchecked` : ""}`
        : `${rOwn} / ${req.length} eggs · ${rUnk.length} couldn't be checked`;
      $("#rubyMiss").innerHTML = rMiss.length && rMiss.length <= 20 ? `<span>Still needed:</span>${rMiss.map(b => `<em>${esc(b.name)}</em>`).join("")}` : "";
    }
    const btn = $("#recheck");
    if (btn) btn.addEventListener("click", async () => {
      btn.disabled = true; btn.textContent = "Checking…";
      const list = P.badges.filter(b => unk.has(b.id));
      const r = await checkOwned(P.id, list);
      r.own.forEach(x => own.add(x));
      const still = new Set([...unk].filter(x => r.unk.has(x)));
      if (!still.size) try { sessionStorage.setItem("mh-ut-own-" + P.id, JSON.stringify({ t: Date.now(), own: [...own] })); } catch (e) {}
      fillBadges(P, own, still);
      MH.toast(still.size ? `${still.size} still couldn't be checked` : "All badges checked");
    });
  }

  /* ---------- Staff directory ---------- */
  let staffCat = "dev", staffList = null, subList = null;
  const tabs = $("#staffTabs"), sgrid = $("#staffGrid");
  tabs.innerHTML = CATS.map(c => `<button type="button" role="tab" data-c="${c.k}" class="${c.k === staffCat ? "on" : ""}">${c.label}<em></em></button>`).join("");
  tabs.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; staffCat = b.dataset.c; tabs.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); drawStaff(); });
  sgrid.addEventListener("click", e => { const c = e.target.closest("[data-u]"); if (!c) return; input.value = c.dataset.u; search(c.dataset.u); window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }); });
  const card = (name, dn, img, sub2, i) => `<button type="button" class="sc" data-u="${esc(name)}" style="--i:${Math.min(i, 24)}">
      <span class="sc-av">${img ? `<img src="${esc(img)}" alt="" loading="lazy" />` : `<span>${esc(name[0])}</span>`}</span>
      <span class="sc-n"><b>${esc(dn || name)}</b><small>@${esc(name)}</small><em>${sub2}</em></span></button>`;
  async function drawStaff() {
    if (staffCat === "sub") {
      if (!subList) {
        sgrid.innerHTML = `<div class="st-load">Loading submitters…</div>`;
        const top = Object.values(T.creators).sort((a, b) => b.items.length - a.items.length).slice(0, 48);
        let pics = {}, ids = {};
        try {
          const r = await req(`${API("users")}/v1/usernames/users`, { method: "POST", body: JSON.stringify({ usernames: top.map(c => c.n), excludeBannedUsers: false }) });
          (r.body && r.body.data || []).forEach(u => ids[u.requestedUsername.toLowerCase()] = u);
          pics = await headshots(Object.values(ids).map(u => u.id));
        } catch (e) {}
        subList = top.map(c => { const u = ids[c.n.toLowerCase()]; return { name: u ? u.name : c.n, dn: u ? u.displayName : c.n, img: u ? pics[u.id] : "", n: c.items.length }; });
      }
      if (staffCat !== "sub") return;
      sgrid.innerHTML = subList.map((s, i) => card(s.name, s.dn, s.img, `${s.n} item${s.n === 1 ? "" : "s"} on the wiki`, i)).join("");
      return;
    }
    if (!staffList) {
      sgrid.innerHTML = `<div class="st-load">Loading staff…</div>`;
      try { staffList = await loadStaff(); }
      catch (e) { sgrid.innerHTML = `<div class="st-load err">Couldn't load the staff list right now. <button type="button" class="ut-btn small" id="stRetry">Try again</button></div>`; $("#stRetry").addEventListener("click", drawStaff); return; }
      tabs.querySelectorAll("button").forEach(b => { const n = b.dataset.c === "sub" ? Object.keys(T.creators).length : staffList.filter(p => p.roles.some(r => r.cat === b.dataset.c)).length; b.querySelector("em").textContent = n; });
    }
    const list = staffList.filter(p => p.roles.some(r => r.cat === staffCat)).sort((a, b) => Math.max(...b.roles.map(r => r.rank)) - Math.max(...a.roles.map(r => r.rank)) || a.name.localeCompare(b.name));
    sgrid.innerHTML = list.length ? list.map((p, i) => card(p.name, p.dn, p.img, p.roles.filter(r => r.cat === staffCat).map(r => `${esc(r.role)} · ${esc(r.group)}`).join("<br>"), i)).join("") : `<div class="st-load">Nobody in this group right now.</div>`;
  }
  // Load the directory when it scrolls near
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); drawStaff(); } }, { rootMargin: "300px" });
  io.observe($("#staff"));

  /* ---------- Deep link ---------- */
  const m = location.hash.match(/^#u=(.+)$/);
  if (m) { const u = decodeURIComponent(m[1]); input.value = u; search(u); }
  loadBadges().catch(() => {});

  /* Back to top */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }));
})();
