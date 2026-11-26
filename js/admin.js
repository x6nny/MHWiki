/* =========================================================
   Admin area: edit the wiki's data/*.json files and publish
   the changes to GitHub (through the admin-commit Supabase function).
   Only admins listed in the database can load or save anything;
   the page itself only hides the editor from everyone else.
   ========================================================= */
(() => {
  const A = window.MH_ACCOUNT;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = m => (A && A.toast ? A.toast(m) : console.log(m));
  const gate = $("#adGate"), app = $("#adApp");

  const showGate = (title, text, btn) => {
    app.hidden = true; gate.hidden = false;
    gate.innerHTML = `<h2>${esc(title)}</h2><p>${text}</p>${btn ? `<button type="button" class="acct-btn primary" id="adGateBtn">${esc(btn)}</button>` : ""}`;
    if (btn) $("#adGateBtn").addEventListener("click", () => A.openSignIn("signin"));
  };

  if (!A || !A.ready) {
    showGate("Accounts aren't set up yet", "Paste your Apps Script web app address into <code>js/account-config.js</code> by following <b>GOOGLE-SHEETS-SETUP.md</b> in the project folder.");
    return;
  }

  /* ---------- the same JSON layout as the files in data/ (short lists stay on one line) ---------- */
  const prim = x => x === null || typeof x !== "object";
  function pretty(v, ind = "") {
    const ni = ind + "  ";
    if (prim(v)) return JSON.stringify(v);
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      if (v.every(prim)) {
        const one = "[" + v.map(x => JSON.stringify(x)).join(", ") + "]";
        if (one.length <= 110 || v.every(x => typeof x === "number")) return one;
        return "[\n" + v.map(x => ni + JSON.stringify(x)).join(",\n") + "\n" + ind + "]";
      }
      return "[\n" + v.map(x => ni + pretty(x, ni)).join(",\n") + "\n" + ind + "]";
    }
    const e = Object.entries(v);
    if (!e.length) return "{}";
    return "{\n" + e.map(([k, x]) => ni + JSON.stringify(k) + ": " + pretty(x, ni)).join(",\n") + "\n" + ind + "}";
  }
  const clone = v => JSON.parse(JSON.stringify(v));
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";

  /* ---------- server calls (through the Google Sheet's script) ---------- */
  const ACT = { list: "admin.files", read: "admin.read", save: "admin.save" };
  async function call(body) {
    const { action, ...rest } = body;
    try { return await A.api(ACT[action], rest); }
    catch (e) { if (e.code === "conflict") e.status = 409; throw e; }
  }

  /* ---------- state ---------- */
  let files = [], file = null;   // file = { path, name, sha, original (string), doc, dirty }
  let path = [];                 // where we are inside the document
  let mode = "form", query = "";

  /* ---------- access ---------- */
  let started = false;
  A.onChange(async s => {
    if (s.status === "loading") { showGate("Checking your sign-in…", "One moment."); return; }
    if (s.status !== "signed-in") { started = false; showGate("Admins only", "Sign in with an admin account to open the admin area.", "Sign in"); return; }
    if (!s.user?.admin) { started = false; showGate("You don't have access", `You're signed in as <b>${esc(s.user?.username)}</b>, which isn't an admin account. The sheet's owner can make you an admin by ticking the <b>admin</b> box next to your name in the Users tab.`); return; }
    if (started) return;
    started = true;
    gate.hidden = true; app.hidden = false;
    $("#adWho").textContent = s.user.username;
    loadList();
  });

  async function loadList() {
    const box = $("#adFiles");
    box.innerHTML = `<p class="ad-dim">Loading files…</p>`;
    try {
      const r = await call({ action: "list" });
      files = r.files || [];
      $("#adRepo").textContent = `${r.repo} · ${r.branch}`;
      drawFiles();
    } catch (e) {
      box.innerHTML = `<p class="ad-err">${esc(e.message)}</p><button type="button" class="ad-btn" id="adRetry">Try again</button>`;
      $("#adRetry").addEventListener("click", loadList);
    }
  }
  function drawFiles() {
    const q = $("#adFileQ").value.trim().toLowerCase();
    $("#adFiles").innerHTML = files.filter(f => !q || f.name.toLowerCase().includes(q)).map(f =>
      `<button type="button" class="ad-file${file && file.path === f.path ? " on" : ""}" data-path="${esc(f.path)}"><b>${esc(f.name.replace(/\.json$/, ""))}</b><small>${kb(f.size)}</small>${file && file.path === f.path && file.dirty ? `<i title="Unsaved changes"></i>` : ""}</button>`
    ).join("") || `<p class="ad-dim">No files match.</p>`;
  }
  $("#adFileQ").addEventListener("input", drawFiles);
  $("#adFiles").addEventListener("click", e => {
    const b = e.target.closest(".ad-file");
    if (!b || (file && b.dataset.path === file.path)) return;
    if (file && file.dirty && !confirmLeave()) return;
    openFile(b.dataset.path);
  });
  const confirmLeave = () => window.confirm(`You have unsaved changes in ${file.name}. Throw them away?`);
  window.addEventListener("beforeunload", e => { if (file && file.dirty) { e.preventDefault(); e.returnValue = ""; } });

  async function openFile(p) {
    const ed = $("#adEditor");
    ed.innerHTML = `<p class="ad-dim">Opening ${esc(p)}…</p>`;
    $("#adMain").hidden = false;
    try {
      const r = await call({ action: "read", path: p });
      file = { path: p, name: p.split("/").pop(), sha: r.sha, original: r.content, doc: JSON.parse(r.content), dirty: false };
      path = []; query = ""; mode = "form";
      $("#adFileInfo").textContent = `Editing ${file.name}`;
      $("#adDone").hidden = true;
      drawFiles(); draw();
    } catch (e) {
      ed.innerHTML = `<p class="ad-err">${esc(e.message)}</p>`;
    }
  }

  /* ---------- navigating inside the document ---------- */
  const at = (p = path) => p.reduce((o, k) => o[k], file.doc);
  const LABEL_KEYS = ["n", "name", "title", "code", "id", "key", "label", "date", "t", "k"];
  const labelOf = (v, i) => {
    if (prim(v)) return String(v);
    if (Array.isArray(v)) return `List of ${v.length}`;
    for (const k of LABEL_KEYS) if (typeof v[k] === "string" && v[k].trim()) return v[k];
    const s = Object.values(v).find(x => typeof x === "string" && x.trim());
    return s ? s.slice(0, 60) : `Entry ${i + 1}`;
  };
  const summary = v => prim(v) ? "" : Array.isArray(v) ? `${v.length} item${v.length === 1 ? "" : "s"}` : `${Object.keys(v).length} field${Object.keys(v).length === 1 ? "" : "s"}`;
  function crumbName(i) {
    const parent = at(path.slice(0, i)), k = path[i];
    return Array.isArray(parent) ? labelOf(parent[k], k) : k;
  }
  function changed() {
    file.dirty = pretty(file.doc) + "\n" !== file.original && pretty(file.doc) !== file.original.trimEnd();
    drawBar(); drawFiles();
  }

  /* ---------- drawing ---------- */
  const imgish = (k, v) => typeof v === "string" && /\.(webp|png|jpe?g|gif|svg)$/i.test(v) && !/^https?:/.test(v);
  function field(k, v, i) {
    const id = `f_${i}`;
    let input;
    if (typeof v === "boolean") input = `<label class="ad-sw"><input type="checkbox" id="${id}" data-k="${esc(k)}" data-t="bool" ${v ? "checked" : ""} /><span>${v ? "Yes" : "No"}</span></label>`;
    else if (typeof v === "number") input = `<input type="number" step="any" id="${id}" data-k="${esc(k)}" data-t="num" value="${v}" />`;
    else if (v === null) input = `<input type="text" id="${id}" data-k="${esc(k)}" data-t="null" value="" placeholder="(empty)" />`;
    else if (typeof v === "string") {
      input = v.length > 70 || v.includes("\n")
        ? `<textarea id="${id}" data-k="${esc(k)}" data-t="str" rows="${Math.min(10, Math.max(2, Math.ceil(v.length / 70) + (v.match(/\n/g) || []).length))}">${esc(v)}</textarea>`
        : `<input type="text" id="${id}" data-k="${esc(k)}" data-t="str" value="${esc(v)}" />`;
      if (imgish(k, v)) input = `<div class="ad-imgrow"><img src="../${esc(v)}" alt="" onerror="this.style.visibility='hidden'" />${input}</div>`;
    } else if (Array.isArray(v) && v.every(prim) && v.every(x => typeof x === "string")) {
      input = `<textarea id="${id}" data-k="${esc(k)}" data-t="strlist" rows="${Math.min(8, Math.max(2, v.length))}" placeholder="One per line">${esc(v.join("\n"))}</textarea><small class="ad-hint">One per line</small>`;
    } else {
      input = `<button type="button" class="ad-open" data-open="${esc(k)}"><span>${Array.isArray(v) ? "List" : "Group"}</span><b>${summary(v)}</b><em>Open ›</em></button>`;
    }
    return `<div class="ad-field"><label for="${id}">${esc(k)}</label><div>${input}</div><button type="button" class="ad-x" data-delkey="${esc(k)}" title="Remove field ${esc(k)}" aria-label="Remove field ${esc(k)}">×</button></div>`;
  }

  function draw() {
    if (!file) return;
    const node = at();
    const ed = $("#adEditor");
    const crumbs = [`<button type="button" data-crumb="0">${esc(file.name)}</button>`]
      .concat(path.map((_, i) => `<span>›</span><button type="button" data-crumb="${i + 1}">${esc(String(crumbName(i)).slice(0, 40))}</button>`)).join("");
    let body = "";
    if (mode === "raw") {
      body = `<div class="ad-raw"><textarea id="adRaw" spellcheck="false">${esc(pretty(file.doc))}</textarea>
        <div class="ad-rawbar"><span id="adRawMsg" class="ad-dim">Edit the whole file as JSON, then apply.</span><button type="button" class="ad-btn primary" id="adRawApply">Apply</button></div></div>`;
    } else if (Array.isArray(node)) {
      const objs = !node.every(prim);
      const q = query.trim().toLowerCase();
      const rows = node.map((v, i) => [v, i]).filter(([v]) => !q || JSON.stringify(v).toLowerCase().includes(q));
      const shown = rows.slice(0, 150);
      body = `<div class="ad-tools">
          <input type="search" id="adQ" placeholder="Search ${node.length} entries…" value="${esc(query)}" />
          <button type="button" class="ad-btn" data-add="${objs ? "obj" : "str"}">+ Add ${objs ? "entry" : "item"}</button>
        </div>
        <ol class="ad-list">${shown.map(([v, i]) => objs || !prim(v)
          ? `<li><button type="button" class="ad-row" data-open="${i}"><span class="ad-i">${i + 1}</span><b>${esc(String(labelOf(v, i)).slice(0, 80))}</b><small>${summary(v)}</small></button>
               <span class="ad-ops"><button type="button" data-up="${i}" title="Move up" aria-label="Move up">↑</button><button type="button" data-dup="${i}" title="Duplicate" aria-label="Duplicate">⧉</button><button type="button" data-del="${i}" title="Delete" aria-label="Delete" class="danger">×</button></span></li>`
          : `<li class="ad-prim"><span class="ad-i">${i + 1}</span><input type="text" data-idx="${i}" data-t="${typeof v === "number" ? "num" : "str"}" value="${esc(v)}" /><span class="ad-ops"><button type="button" data-del="${i}" class="danger" aria-label="Delete">×</button></span></li>`).join("")}</ol>
        ${rows.length > shown.length ? `<p class="ad-dim">Showing the first ${shown.length} of ${rows.length}. Search to narrow it down.</p>` : ""}
        ${!rows.length ? `<p class="ad-dim">Nothing matches.</p>` : ""}`;
    } else {
      const keys = Object.keys(node);
      body = `<div class="ad-fields">${keys.map((k, i) => field(k, node[k], i)).join("")}</div>
        <div class="ad-addf"><input type="text" id="adNewKey" placeholder="New field name" /><select id="adNewType"><option value="str">Text</option><option value="num">Number</option><option value="bool">Yes / No</option><option value="list">List</option><option value="obj">Group</option></select><button type="button" class="ad-btn" id="adAddField">Add field</button></div>`;
    }
    ed.innerHTML = `
      <div class="ad-edhead">
        <nav class="ad-crumbs" aria-label="Location in file">${crumbs}</nav>
        <div class="ad-modes" role="tablist"><button type="button" data-mode="form" class="${mode === "form" ? "on" : ""}">Form</button><button type="button" data-mode="raw" class="${mode === "raw" ? "on" : ""}">Raw JSON</button></div>
      </div>
      ${path.length && mode === "form" ? `<button type="button" class="ad-back" data-crumb="${path.length - 1}">‹ Back</button>` : ""}
      ${body}`;
    if (mode === "raw") bindRaw();
    const qi = $("#adQ");
    if (qi && document.activeElement?.id !== "adQ" && query) { qi.focus(); qi.setSelectionRange(query.length, query.length); }
    drawBar();
  }

  /* ---------- editing ---------- */
  const ed = $("#adEditor");
  ed.addEventListener("click", e => {
    const t = e.target.closest("button");
    if (!t || !file) return;
    const node = at();
    if (t.dataset.mode) { if (t.dataset.mode === mode) return; mode = t.dataset.mode; draw(); return; }
    if (t.dataset.crumb !== undefined) { path = path.slice(0, +t.dataset.crumb); query = ""; draw(); return; }
    if (t.dataset.open !== undefined) { const k = Array.isArray(node) ? +t.dataset.open : t.dataset.open; path = [...path, k]; query = ""; draw(); $("#adMain").scrollIntoView({ block: "start", behavior: "smooth" }); return; }
    if (t.dataset.add) {
      if (t.dataset.add === "str") node.push("");
      else {
        const tmpl = node.find(x => x && typeof x === "object" && !Array.isArray(x));
        const blank = v => typeof v === "string" ? "" : typeof v === "number" ? 0 : typeof v === "boolean" ? false : Array.isArray(v) ? [] : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).map(k => [k, blank(v[k])])) : null;
        node.push(tmpl ? blank(tmpl) : {});
      }
      changed();
      if (t.dataset.add === "obj") { path = [...path, node.length - 1]; query = ""; }
      draw(); return;
    }
    if (t.dataset.dup !== undefined) { const i = +t.dataset.dup; node.splice(i + 1, 0, clone(node[i])); changed(); draw(); return; }
    if (t.dataset.up !== undefined) { const i = +t.dataset.up; if (i > 0) { [node[i - 1], node[i]] = [node[i], node[i - 1]]; changed(); draw(); } return; }
    if (t.dataset.del !== undefined) {
      const i = +t.dataset.del;
      if (!t.dataset.sure) { t.dataset.sure = "1"; t.textContent = "Delete?"; t.classList.add("sure"); setTimeout(() => { if (t.isConnected) { delete t.dataset.sure; t.textContent = "×"; t.classList.remove("sure"); } }, 3500); return; }
      node.splice(i, 1); changed(); draw(); return;
    }
    if (t.dataset.delkey !== undefined) {
      if (!t.dataset.sure) { t.dataset.sure = "1"; t.textContent = "Remove?"; t.classList.add("sure"); setTimeout(() => { if (t.isConnected) { delete t.dataset.sure; t.textContent = "×"; t.classList.remove("sure"); } }, 3500); return; }
      delete node[t.dataset.delkey]; changed(); draw(); return;
    }
    if (t.id === "adAddField") {
      const k = $("#adNewKey").value.trim();
      if (!k) { $("#adNewKey").focus(); return; }
      if (Object.prototype.hasOwnProperty.call(node, k)) { toast(`There's already a field called "${k}".`); return; }
      node[k] = { str: "", num: 0, bool: false, list: [], obj: {} }[$("#adNewType").value];
      changed(); draw(); return;
    }
  });
  ed.addEventListener("input", e => {
    const el = e.target;
    if (!file) return;
    if (el.id === "adQ") { query = el.value; const pos = el.selectionStart; draw(); const q = $("#adQ"); q.focus(); q.setSelectionRange(pos, pos); return; }
    const node = at();
    if (el.dataset.idx !== undefined) {
      node[+el.dataset.idx] = el.dataset.t === "num" && el.value.trim() !== "" && !isNaN(+el.value) ? +el.value : el.value;
      changed(); return;
    }
    const k = el.dataset.k;
    if (k === undefined) return;
    const t = el.dataset.t;
    if (t === "bool") { node[k] = el.checked; el.nextElementSibling.textContent = el.checked ? "Yes" : "No"; }
    else if (t === "num") { if (el.value.trim() === "" || isNaN(+el.value)) { el.classList.add("bad"); return; } el.classList.remove("bad"); node[k] = +el.value; }
    else if (t === "null") { if (el.value !== "") { node[k] = el.value; el.dataset.t = "str"; } }
    else if (t === "strlist") node[k] = el.value.split("\n").map(s => s.trim()).filter(Boolean);
    else node[k] = el.value;
    changed();
  });
  ed.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.t === "bool") e.target.dispatchEvent(new Event("input", { bubbles: true })); });

  function bindRaw() {
    const ta = $("#adRaw"), msg = $("#adRawMsg");
    const check = () => {
      try { JSON.parse(ta.value); msg.textContent = "Looks good. Apply to use these changes."; msg.className = "ad-ok"; return true; }
      catch (err) { msg.textContent = "Not valid JSON: " + err.message; msg.className = "ad-err"; return false; }
    };
    ta.addEventListener("input", check);
    $("#adRawApply").addEventListener("click", () => {
      if (!check()) return;
      file.doc = JSON.parse(ta.value); path = []; changed(); mode = "form"; draw(); toast("Applied. Publish to save it to GitHub.");
    });
  }

  /* ---------- save bar ---------- */
  function drawBar() {
    const bar = $("#adBar");
    if (!file || !file.dirty) { bar.hidden = true; return; }
    bar.hidden = false;
    $("#adBarTxt").innerHTML = `Unsaved changes in <b>${esc(file.name)}</b>`;
  }
  $("#adDiscard").addEventListener("click", () => {
    if (!file || !window.confirm(`Throw away your changes to ${file.name}?`)) return;
    file.doc = JSON.parse(file.original); file.dirty = false; path = []; draw(); drawFiles();
  });
  $("#adPublish").addEventListener("click", async () => {
    if (!file || !file.dirty) return;
    const btn = $("#adPublish");
    btn.disabled = true; btn.textContent = "Publishing…";
    const content = pretty(file.doc) + "\n";
    try {
      const r = await call({ action: "save", path: file.path, content, sha: file.sha, message: $("#adMsg").value });
      file.sha = r.sha; file.original = content; file.dirty = false; $("#adMsg").value = "";
      const f = files.find(x => x.path === file.path); if (f) { f.size = new Blob([content]).size; f.sha = r.sha; }
      drawBar(); drawFiles();
      $("#adDone").hidden = false;
      $("#adDone").innerHTML = `Published to GitHub. The live site updates in about a minute.${r.commit ? ` <a href="${esc(r.commit)}" target="_blank" rel="noopener">See the change ›</a>` : ""}`;
      toast("Published!");
    } catch (e) {
      toast(e.message);
      if (e.status === 409) $("#adDone").hidden = false, $("#adDone").innerHTML = `<span class="ad-err">${esc(e.message)}</span>`;
    } finally { btn.disabled = false; btn.textContent = "Publish to GitHub"; }
  });
  /* ---------- users: reset a password, unban, clear a profile ---------- */
  $("#adUserForm").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = e.submitter, name = $("#adUserName").value.trim(), out = $("#adUserMsg");
    if (!name) { $("#adUserName").focus(); return; }
    out.className = "ad-dim"; out.textContent = "One moment…";
    try {
      if (btn && btn.dataset.do === "clearprofile") {
        const r = await A.api("admin.clearProfile", { username: name, what: "all" });
        out.className = "ad-ok"; out.textContent = `${r.username}'s picture, bio and banner were removed.`;
      } else if (btn && btn.dataset.do === "unban") {
        const r = await A.api("admin.unban", { username: name });
        out.className = "ad-ok"; out.textContent = `${r.username} can comment again.`;
      } else {
        const pw = $("#adUserPw").value;
        if (pw.length < 8) throw new Error("The new password needs at least 8 characters.");
        const r = await A.api("admin.resetPassword", { username: name, newPassword: pw });
        out.className = "ad-ok"; out.textContent = `Done. Give ${r.username} the new password; they've been signed out everywhere.`;
        $("#adUserPw").value = "";
      }
    } catch (x) { out.className = "ad-err"; out.textContent = x.message; }
  });

  $("#adReload").addEventListener("click", () => { if (!file) return; if (file.dirty && !confirmLeave()) return; openFile(file.path); });
  $("#adDownload").addEventListener("click", () => {
    if (!file) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([pretty(file.doc) + "\n"], { type: "application/json" }));
    a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
})();
