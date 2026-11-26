/* =========================================================
   Accounts: username & password sign-in (backed by a private Google Sheet
   through Apps Script), tracker sync between devices, and the admin flag.
   Does nothing until js/account-config.js has the web app address.

   window.MH_ACCOUNT = {
     ready, state: { status, user: {id, username, admin, banned}, sync },
     onChange(fn), api(action, data), openSignIn(mode), signOut(), syncNow(), toast(msg),
     avatarSrc(value), avatar(user, className), updateUser(patch)
   }
   ========================================================= */
(() => {
  const C = window.MH_ACCOUNT_CONFIG || {};
  const API = String(C.api || "").trim();
  const READY = /^https:\/\/script\.google(usercontent)?\.com\//.test(API) || /^http:\/\/localhost[:/]/.test(API);
  const ROOT = (document.querySelector('script[src*="js/account.js"]')?.getAttribute("src") || "").replace(/js\/account\.js.*$/, "");

  /* Trackers that follow you between devices (must match CFG.KEYS in Code.gs) */
  const SYNC = {
    "mh-shiny-checklist-v1": "Shiny Checklist",
    "mh-rebirth-tracker-v1": "Rebirth Tracker",
    "mh-task-tracker-v1": "Daily Tasks",
    "mh-gift-streak-v1": "Daily Gift streak",
    "mh-settings-v1": "Settings",
  };
  const KEYS = Object.keys(SYNC);
  const META = "mh-sync-meta-v1", SESSION = "mh-session-v1";

  const state = { status: READY ? "loading" : "off", user: null, sync: "idle" };
  const subs = new Set();
  const emit = () => { subs.forEach(f => { try { f(state); } catch (e) { console.error(e); } }); window.dispatchEvent(new CustomEvent("mh-account", { detail: state })); };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Use the site's toast when the page has it (js/common.js), otherwise a small one of our own.
  const toast = m => {
    if (typeof MH !== "undefined" && MH && MH.toast) return MH.toast(m);
    const t = document.createElement("div");
    t.className = "acct-toast"; t.setAttribute("role", "status"); t.textContent = m;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("in"));
    setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, 3200);
  };

  /* ---------------- talking to the Google Sheet ---------------- */
  const raw = window.localStorage;
  const rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
  let session = null;
  try { session = JSON.parse(raw.getItem(SESSION) || "null"); } catch {}
  const saveSession = s => { session = s; try { s ? rawSet.call(raw, SESSION, JSON.stringify(s)) : rawRemove.call(raw, SESSION); } catch {} };

  async function api(action, data = {}) {
    if (!READY) throw new Error("Accounts aren't set up.");
    let res;
    try {
      // text/plain keeps this a "simple" request, which Apps Script can answer from any site.
      res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, token: session?.token || undefined, ...data }) });
    } catch { throw Object.assign(new Error("Couldn't reach the wiki's account server. Check your connection."), { code: "network" }); }
    let j;
    try { j = await res.json(); } catch { throw Object.assign(new Error("The account server sent a bad reply. Try again in a moment."), { code: "network" }); }
    if (!j.ok) {
      if (j.code === "auth" && session) { saveSession(null); setSignedOut(); }
      throw Object.assign(new Error(j.error || "Something went wrong."), { code: j.code });
    }
    return j;
  }

  /* Profile pictures: "" (show the first letter), a small uploaded picture (data:image/…),
     or a wiki item picture (assets/wiki/…). Anything else is ignored, so it can never run code. */
  const AV_DATA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
  const AV_ITEM = /^assets\/wiki\/[A-Za-z0-9._-]{1,120}\.(webp|png|jpe?g|gif)$/;
  const avatarSrc = v => {
    v = String(v || "");
    if (AV_DATA.test(v)) return v;
    if (AV_ITEM.test(v) && !v.includes("..")) return ROOT + v;
    return "";
  };
  const avatar = (u, cls = "") => {
    const name = (u && u.username) || "?", src = avatarSrc(u && u.avatar), letter = esc(name[0].toUpperCase());
    return src
      ? `<span class="mh-av has-pic${src.startsWith("data:") ? "" : " is-item"} ${cls}" data-l="${letter}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove('has-pic');this.parentNode.textContent=this.parentNode.dataset.l" /></span>`
      : `<span class="mh-av ${cls}">${letter}</span>`;
  };

  window.MH_ACCOUNT = {
    ready: READY, root: ROOT, state, SYNC, toast, api, avatarSrc, avatar,
    updateUser: p => updateUser(p),
    onChange(fn) { subs.add(fn); fn(state); return () => subs.delete(fn); },
    openSignIn: mode => openDialog(mode || "signin"),
    signOut, syncNow: () => sync(true),
    setVisibility: h => setVisibility(h),
  };
  if (!READY) return;

  /* ---------------- local bookkeeping for sync ---------------- */
  let meta = {};
  try { meta = JSON.parse(raw.getItem(META) || "{}") || {}; } catch { meta = {}; }
  const saveMeta = () => { try { rawSet.call(raw, META, JSON.stringify(meta)); } catch {} };
  let applying = false;
  // Watch the trackers' own saves so changes get uploaded.
  Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === raw && !applying && SYNC[k]) touched(k); };
  Storage.prototype.removeItem = function (k) { rawRemove.call(this, k); if (this === raw && !applying && SYNC[k]) touched(k); };
  function touched(k) {
    meta[k] = { ...(meta[k] || {}), dirty: true, edited: Date.now() };
    saveMeta();
    if (state.status === "signed-in") schedulePush();
  }
  const canon = v => v === null || typeof v !== "object" ? JSON.stringify(v)
    : Array.isArray(v) ? "[" + v.map(canon).join(",") + "]"
    : "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  const parse = s => { try { return JSON.parse(s); } catch { return undefined; } };
  const same = (localStr, serverVal) => localStr != null && canon(parse(localStr)) === canon(serverVal);
  function applyLocal(k, val) {
    applying = true;
    try { val === null ? rawRemove.call(raw, k) : rawSet.call(raw, k, JSON.stringify(val)); } finally { applying = false; }
  }

  /* ---------------- tracker sync ---------------- */
  let pushTimer = 0, pushing = false;
  const setSync = s => { if (state.sync !== s) { state.sync = s; emit(); } };
  function schedulePush() { clearTimeout(pushTimer); setSync("saving"); pushTimer = setTimeout(push, 1500); }

  async function push() {
    if (state.status !== "signed-in") return;
    if (pushing) { schedulePush(); return; }
    pushing = true;
    let failed = false;
    for (const k of KEYS) {
      const m = meta[k];
      if (!m || !m.dirty) continue;
      const local = raw.getItem(k);
      try {
        if (local == null) { await api("trackers.delete", { key: k }); meta[k] = { dirty: false, at: null }; }
        else {
          const value = parse(local);
          if (value === undefined) { meta[k].dirty = false; continue; }
          const r = await api("trackers.put", { key: k, value });
          meta[k] = { dirty: false, at: r.updated_at, edited: m.edited };
        }
      } catch (e) { failed = true; console.warn("sync", k, e); if (e.code === "auth") break; }
    }
    saveMeta();
    pushing = false;
    if (state.status !== "signed-in") return;
    setSync(failed ? "error" : "synced");
    if (failed) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 30000); }
  }

  async function pull() {
    const { items } = await api("trackers.get");
    const server = Object.fromEntries((items || []).map(r => [r.key, r]));
    const conflicts = [];
    let changed = false;
    for (const k of KEYS) {
      const r = server[k], local = raw.getItem(k), m = meta[k] || {};
      if (!r) { if (local != null) meta[k] = { ...m, dirty: true, edited: m.edited || Date.now() }; continue; }
      if (local == null) { applyLocal(k, r.value); meta[k] = { dirty: false, at: r.updated_at }; changed = true; continue; }
      if (same(local, r.value)) { meta[k] = { dirty: false, at: r.updated_at }; continue; }
      const serverMoved = !m.at || r.updated_at > m.at;
      if (!serverMoved) { meta[k] = { ...m, dirty: true }; continue; }                                                    // only this browser changed it
      if (m.at && !m.dirty) { applyLocal(k, r.value); meta[k] = { dirty: false, at: r.updated_at }; changed = true; continue; } // only the account changed
      if (m.at) {                                                                                                           // both changed: newest edit wins
        if ((m.edited || 0) >= Date.parse(r.updated_at)) meta[k] = { ...m, dirty: true };
        else { applyLocal(k, r.value); meta[k] = { dirty: false, at: r.updated_at }; changed = true; }
        continue;
      }
      conflicts.push(r);                                                                                                    // first sign-in here and both have data
    }
    saveMeta();
    if (conflicts.length) changed = (await resolveConflicts(conflicts)) || changed;
    return changed;
  }

  function resolveConflicts(rows) {
    return new Promise(done => {
      const names = rows.map(r => SYNC[r.key]);
      const list = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names.slice(-1) : names[0];
      const box = modal(`<h3 id="acctDlgT">Which progress should we keep?</h3>
          <p>Your account and this browser both have saved <b>${esc(list)}</b> data, and they're different. Pick which one to keep. The other one will be replaced.</p>
          <div class="acct-dlg-btns">
            <button type="button" class="acct-btn primary" data-pick="account">Use my account's data</button>
            <button type="button" class="acct-btn" data-pick="local">Keep this browser's data</button>
          </div>`, { closable: false });
      box.querySelector("[data-pick=account]").focus();
      box.addEventListener("click", e => {
        const b = e.target.closest("[data-pick]");
        if (!b) return;
        let changed = false;
        rows.forEach(r => {
          if (b.dataset.pick === "account") { applyLocal(r.key, r.value); meta[r.key] = { dirty: false, at: r.updated_at }; changed = true; }
          else meta[r.key] = { dirty: true, at: r.updated_at, edited: Date.now() };
        });
        saveMeta(); closeModal(box); done(changed);
      });
    });
  }

  let syncing = null;
  function sync(manual) {
    if (syncing) return syncing;
    syncing = (async () => {
      setSync("saving");
      try {
        const changed = await pull();
        await push();
        if (changed) reloadOnce();
        else if (manual) toast("Your trackers are synced.");
      } catch (e) {
        console.warn("sync", e);
        if (state.status === "signed-in") setSync("error");
        if (manual) toast(e.message || "Couldn't sync right now.");
      } finally { syncing = null; }
    })();
    return syncing;
  }
  function reloadOnce() {
    // The page already drew itself from the old data, so reload to show what came from the account.
    try {
      const last = +sessionStorage.getItem("mh-sync-reload") || 0;
      if (Date.now() - last < 15000) return;
      sessionStorage.setItem("mh-sync-reload", String(Date.now()));
    } catch {}
    location.reload();
  }

  /* ---------------- signing in and out ---------------- */
  function setSignedIn(user, fresh) {
    Object.assign(state, { status: "signed-in", user });
    saveSession({ token: session.token, user });
    emit();
    if (fresh) toast(`Signed in as ${user.username}`);
    sync(false);
  }
  function setSignedOut() {
    Object.assign(state, { status: "signed-out", user: null, sync: "idle" });
    emit();
  }
  async function signOut() {
    const s = session;
    saveSession(null); setSignedOut();
    toast("Signed out. Your trackers stay saved in this browser.");
    if (s && s.token) { try { await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "logout", token: s.token }) }); } catch {} }
  }

  /* ---------------- dialogs ---------------- */
  let lastFocus = null;
  function modal(html, { closable = true } = {}) {
    lastFocus = document.activeElement;
    const box = document.createElement("div");
    box.className = "acct-modal";
    box.innerHTML = `<div class="acct-dlg glass" role="dialog" aria-modal="true" aria-labelledby="acctDlgT">${closable ? `<button type="button" class="acct-x" data-close aria-label="Close">×</button>` : ""}${html}</div>`;
    document.body.appendChild(box);
    requestAnimationFrame(() => box.classList.add("in"));
    if (closable) {
      box.addEventListener("click", e => { if (e.target === box || e.target.closest("[data-close]")) closeModal(box); });
      box.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(box); });
    }
    // keep keyboard focus inside the dialog
    box.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const f = [...box.querySelectorAll("button, input, a[href]")].filter(x => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    return box;
  }
  function closeModal(box) {
    box.classList.remove("in");
    setTimeout(() => box.remove(), 250);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  const EYE = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const pwField = (id, label, auto) => `<label class="acct-f"><span>${label}</span><span class="acct-pw"><input id="${id}" type="password" autocomplete="${auto}" required minlength="${auto === "current-password" ? 1 : 8}" maxlength="100" /><button type="button" class="acct-eye" data-eye="${id}" aria-label="Show password">${EYE}</button></span></label>`;
  function bindForm(box, onSubmit) {
    const form = box.querySelector("form"), err = box.querySelector(".acct-err"), btn = form.querySelector("[type=submit]");
    box.querySelectorAll("[data-eye]").forEach(b => b.addEventListener("click", () => {
      const i = box.querySelector("#" + b.dataset.eye); i.type = i.type === "password" ? "text" : "password";
      b.setAttribute("aria-label", i.type === "password" ? "Show password" : "Hide password");
    }));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      err.textContent = ""; btn.disabled = true; const label = btn.textContent; btn.textContent = "One moment…";
      try { await onSubmit(form); }
      catch (x) { err.textContent = x.message || "Something went wrong."; }
      finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = label; } }
    });
    setTimeout(() => form.querySelector("input")?.focus(), 60);
  }

  function openDialog(mode) {
    const signup = mode === "signup";
    const box = modal(`
      <h3 id="acctDlgT">${signup ? "Create an account" : "Sign in"}</h3>
      <p class="acct-sub">${signup ? "Save your trackers to an account and join the comments." : "Welcome back! Your trackers will sync to this device."}</p>
      <form class="acct-form" novalidate>
        <label class="acct-f"><span>Username</span><input id="acU" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="20" required /></label>
        ${pwField("acP", "Password", signup ? "new-password" : "current-password")}
        ${signup ? pwField("acP2", "Type the password again", "new-password") : ""}
        ${signup ? `<p class="acct-note"><b>Don't use your Roblox password.</b> Pick a new one just for this wiki. There's no email, so if you forget it, ask an admin in our Discord to reset it.</p>` : ""}
        <p class="acct-err" role="alert"></p>
        <button type="submit" class="acct-btn primary wide">${signup ? "Create account" : "Sign in"}</button>
      </form>
      <p class="acct-switch">${signup ? `Already have an account? <button type="button" data-mode="signin">Sign in</button>` : `New here? <button type="button" data-mode="signup">Create an account</button>`}</p>`);
    box.querySelector("[data-mode]").addEventListener("click", e => { closeModal(box); setTimeout(() => openDialog(e.target.dataset.mode), 120); });
    bindForm(box, async f => {
      const username = f.querySelector("#acU").value.trim(), password = f.querySelector("#acP").value;
      if (signup) {
        if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(username)) throw new Error("Usernames are 3 to 20 letters, numbers or _ and start with a letter.");
        if (password.length < 8) throw new Error("Passwords need at least 8 characters.");
        if (password !== f.querySelector("#acP2").value) throw new Error("The two passwords don't match.");
      } else if (!username || !password) throw new Error("Enter your username and password.");
      const r = await api(signup ? "register" : "login", { username, password });
      saveSession({ token: r.token, user: r.user });
      closeModal(box);
      setSignedIn(r.user, true);
    });
  }

  // e.g. after changing your profile picture, so the sidebar shows it straight away
  function updateUser(patch) {
    if (!session || !state.user) return;
    state.user = { ...state.user, ...patch };
    saveSession({ token: session.token, user: state.user });
    emit();
  }

  async function setVisibility(hidden) {
    try {
      const r = await api("profiles.visibility", { hidden });
      state.user = { ...state.user, hidden: r.hidden };
      saveSession({ token: session.token, user: state.user });
      emit();
      window.dispatchEvent(new CustomEvent("mh-profile-visibility", { detail: r.hidden }));
      toast(r.hidden ? "Your profile is hidden. Only you can see it." : "Your profile is public again.");
    } catch (e) { toast(e.message); }
  }

  function openChangePassword() {
    const box = modal(`
      <h3 id="acctDlgT">Change password</h3>
      <p class="acct-sub">You'll stay signed in here. Other devices will be signed out.</p>
      <form class="acct-form" novalidate>
        ${pwField("cpOld", "Current password", "current-password")}
        ${pwField("cpNew", "New password", "new-password")}
        ${pwField("cpNew2", "Type the new password again", "new-password")}
        <p class="acct-err" role="alert"></p>
        <button type="submit" class="acct-btn primary wide">Change password</button>
      </form>`);
    bindForm(box, async f => {
      const n = f.querySelector("#cpNew").value;
      if (n.length < 8) throw new Error("Passwords need at least 8 characters.");
      if (n !== f.querySelector("#cpNew2").value) throw new Error("The two new passwords don't match.");
      await api("changePassword", { oldPassword: f.querySelector("#cpOld").value, newPassword: n });
      closeModal(box); toast("Password changed.");
    });
  }

  function openDeleteAccount() {
    const box = modal(`
      <h3 id="acctDlgT">Delete your account?</h3>
      <p class="acct-sub">This removes your account, your saved trackers and your comments from the wiki. Your trackers stay in this browser. This can't be undone.</p>
      <form class="acct-form" novalidate>
        ${pwField("daP", "Your password", "current-password")}
        <p class="acct-err" role="alert"></p>
        <button type="submit" class="acct-btn danger wide">Delete my account</button>
      </form>`);
    bindForm(box, async f => {
      await api("deleteAccount", { password: f.querySelector("#daP").value });
      closeModal(box); saveSession(null); setSignedOut(); toast("Your account was deleted.");
    });
  }

  /* ---------------- sidebar UI ---------------- */
  const ICON_USER = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M4 20c1.4-4 4.4-6 8-6s6.6 2 8 6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`;
  const SYNC_TXT = { idle: "Signed in", saving: "Saving…", synced: "Trackers synced", error: "Sync paused, retrying" };
  let menuOpen = false;
  function renderSidebar() {
    const foot = document.querySelector(".sb-foot");
    if (!foot) return;
    let box = document.getElementById("sbAcct");
    if (!box) {
      box = document.createElement("div");
      box.className = "sb-acct"; box.id = "sbAcct";
      foot.insertBefore(box, foot.firstChild);
      box.addEventListener("click", onSidebarClick);
      document.addEventListener("click", e => { if (menuOpen && !box.contains(e.target)) toggleMenu(false); });
      document.addEventListener("keydown", e => { if (menuOpen && e.key === "Escape") { toggleMenu(false); box.querySelector(".sb-me")?.focus(); } });
    }
    if (state.status === "loading") { box.innerHTML = `<div class="sb-link sb-acct-wait" aria-hidden="true"><span class="sb-ic"></span><span class="sb-t"><i></i></span></div>`; return; }
    if (state.status !== "signed-in") {
      box.innerHTML = `<button type="button" class="sb-link sb-signin" data-act="signin" title="Sign in"><span class="sb-ic">${ICON_USER}</span><span class="sb-t">Sign in<small>Save trackers &amp; comment</small></span></button>`;
      return;
    }
    const u = state.user || {};
    box.innerHTML = `
      <button type="button" class="sb-link sb-me${u.admin ? " is-admin" : ""}" data-act="menu" aria-haspopup="true" aria-expanded="${menuOpen}" title="${esc(u.username)}">
        <span class="sb-ic sb-ava">${avatar(u, "sb-pic")}<i class="sb-dot ${state.sync}"></i></span>
        <span class="sb-t">${esc(u.username)}<small>${u.admin ? "Admin · " : ""}${SYNC_TXT[state.sync] || ""}</small></span>
      </button>
      <div class="sb-menu glass" role="menu" ${menuOpen ? "" : "hidden"}>
        <div class="sb-menu-who"><b>${esc(u.username)}</b><span>${u.admin ? `<em>Admin</em>` : "Signed in"}</span></div>
        <a role="menuitem" href="${ROOT}pages/profiles.html#u=${encodeURIComponent(u.username)}">My profile</a>
        <a role="menuitem" href="${ROOT}pages/profiles.html#u=${encodeURIComponent(u.username)}&edit=1">Edit profile</a>
        ${u.admin ? `<a role="menuitem" href="${ROOT}pages/admin.html">Admin area</a>` : ""}
        <button role="menuitem" type="button" data-act="visibility">${u.hidden ? "Show my profile" : "Hide my profile"}</button>
        <button role="menuitem" type="button" data-act="sync">Sync trackers now</button>
        <button role="menuitem" type="button" data-act="password">Change password</button>
        <button role="menuitem" type="button" data-act="signout">Sign out</button>
        <button role="menuitem" type="button" data-act="delete" class="danger">Delete account</button>
      </div>`;
  }
  function toggleMenu(on) {
    menuOpen = on;
    const box = document.getElementById("sbAcct");
    box?.querySelector(".sb-menu")?.toggleAttribute("hidden", !on);
    box?.querySelector(".sb-me")?.setAttribute("aria-expanded", String(on));
  }
  function onSidebarClick(e) {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "menu") { toggleMenu(!menuOpen); return; }
    toggleMenu(false);
    if (act === "signin") openDialog("signin");
    else if (act === "sync") sync(true);
    else if (act === "password") openChangePassword();
    else if (act === "signout") signOut();
    else if (act === "delete") openDeleteAccount();
    else if (act === "visibility") setVisibility(!state.user.hidden);
  }
  subs.add(renderSidebar);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderSidebar); else renderSidebar();

  /* ---------------- start ---------------- */
  if (session && session.token && session.user) {
    // Show the saved sign-in straight away, then check it with the server.
    Object.assign(state, { status: "signed-in", user: session.user });
    api("me").then(r => setSignedIn(r.user, false)).catch(e => { if (e.code !== "auth") { setSync("error"); emit(); } });
  } else {
    state.status = "signed-out";
  }
  emit();

  // Upload pending changes when the tab is hidden or closed
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && Object.values(meta).some(m => m && m.dirty)) push(); });
})();
