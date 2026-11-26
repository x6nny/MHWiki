/* =========================================================
   Comments (needs accounts set up in js/account-config.js)
   - A thread at the bottom of every page:  thread "page:<page>"
   - A thread inside each Item Index item:   thread "item:<item name>"
   window.MH_COMMENTS.mount(element, thread, { compact, title, eager })
   ========================================================= */
(() => {
  const A = window.MH_ACCOUNT;
  window.MH_COMMENTS = { mount() {} };
  if (!A || !A.ready) return;

  const MAX = 1000, PAGE = 20;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ago = iso => {
    const s = Math.max(1, (Date.now() - Date.parse(iso)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
    return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  };
  const ava = (name, admin) => `<span class="cm-ava${admin ? " adm" : ""}" aria-hidden="true">${esc((name || "?")[0].toUpperCase())}</span>`;

  function mount(el, thread, opt = {}) {
    if (!el || !thread) return;
    thread = String(thread).slice(0, 160);
    el.classList.add("cm");
    if (opt.compact) el.classList.add("compact");
    el.innerHTML = `
      <div class="cm-head"><h2>${esc(opt.title || "Comments")} <span class="cm-n"></span></h2><p>Be kind and stay on topic. Comments are public.</p></div>
      <div class="cm-box glass">
        <div class="cm-top"></div>
        <ul class="cm-list" aria-live="polite"></ul>
        <p class="cm-note" hidden></p>
        <button type="button" class="cm-more" hidden>Show older comments</button>
      </div>`;
    const top = el.querySelector(".cm-top"), list = el.querySelector(".cm-list"), note = el.querySelector(".cm-note"), more = el.querySelector(".cm-more"), nEl = el.querySelector(".cm-n");
    let total = 0, lastId = null, started = false, draft = "", items = [];

    function drawTop(s) {
      if (s.status === "loading") { top.innerHTML = `<div class="cm-gate">Checking your sign-in…</div>`; return; }
      if (s.status !== "signed-in") {
        top.innerHTML = `<div class="cm-gate"><span>Sign in to join the conversation.</span><div><button type="button" data-in="signin">Sign in</button><button type="button" class="alt" data-in="signup">Create account</button></div></div>`;
        top.querySelectorAll("[data-in]").forEach(b => b.addEventListener("click", () => A.openSignIn(b.dataset.in)));
        return;
      }
      const u = s.user || {};
      top.innerHTML = `
        <form class="cm-form">
          ${ava(u.username, u.admin)}
          <div class="cm-in">
            <textarea maxlength="${MAX + 50}" placeholder="Write a comment as ${esc(u.username)}…" aria-label="Write a comment"></textarea>
            <div class="cm-bar"><span class="cm-count">0 / ${MAX}</span><button class="cm-post" type="submit" disabled>Post</button></div>
          </div>
        </form>`;
      const form = top.querySelector("form"), ta = form.querySelector("textarea"), btn = form.querySelector(".cm-post"), cnt = form.querySelector(".cm-count");
      ta.value = draft;
      const upd = () => {
        draft = ta.value;
        cnt.textContent = `${ta.value.length} / ${MAX}`;
        cnt.classList.toggle("over", ta.value.length > MAX);
        btn.disabled = !ta.value.trim() || ta.value.length > MAX;
      };
      upd();
      ta.addEventListener("input", upd);
      ta.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });
      form.addEventListener("submit", async e => {
        e.preventDefault();
        if (btn.disabled) return;
        btn.disabled = true; btn.textContent = "Posting…";
        try {
          const { item } = await A.api("comments.add", { thread, body: ta.value.trim() });
          draft = ""; ta.value = "";
          items.unshift(item); total++;
          list.insertAdjacentHTML("afterbegin", row(item));
          nEl.textContent = total; note.hidden = true;
        } catch (x) { A.toast(x.message); }
        btn.textContent = "Post"; upd();
      });
    }

    function row(c) {
      const s = A.state, me = s.user;
      const mine = me && c.user_id === me.id;
      const canDel = mine || (me && me.admin);
      const canBan = me && me.admin && !mine && !c.admin;
      return `<li class="cm-item" data-id="${esc(c.id)}" data-uid="${esc(c.user_id)}">
        ${ava(c.author, c.admin)}
        <div>
          <div class="cm-meta">
            <b>${esc(c.author)}</b>
            ${c.admin ? `<span class="adm">Admin</span>` : ""}
            <time datetime="${esc(c.created_at)}" title="${esc(new Date(c.created_at).toLocaleString())}">${ago(c.created_at)}</time>
            ${canDel || canBan ? `<span class="cm-acts">${canDel ? `<button type="button" data-del>${mine ? "Delete" : "Remove"}</button>` : ""}${canBan ? `<button type="button" data-ban>Ban</button>` : ""}</span>` : ""}
          </div>
          <p class="cm-body">${esc(c.body)}</p>
        </div>
      </li>`;
    }
    function redraw() {
      list.innerHTML = items.map(row).join("");
      nEl.textContent = total || "";
      note.hidden = total > 0;
      if (!total) note.textContent = "No comments yet. Be the first!";
    }

    async function load(older) {
      try {
        const r = await A.api("comments.list", { thread, limit: PAGE, before: older ? lastId : undefined });
        total = r.total;
        items = older ? items.concat(r.items) : r.items;
        if (items.length) lastId = items[items.length - 1].id;
        redraw();
        more.hidden = items.length >= total || r.items.length < PAGE;
      } catch (e) {
        note.hidden = false; note.textContent = "Comments couldn't load right now.";
      }
    }

    list.addEventListener("click", async e => {
      const li = e.target.closest(".cm-item");
      const b = e.target.closest("[data-del], [data-ban]");
      if (!li || !b) return;
      const ban = b.hasAttribute("data-ban");
      if (!b.dataset.sure) {
        b.dataset.sure = "1"; b.dataset.was = b.textContent; b.textContent = ban ? "Ban & remove all?" : "Sure?";
        setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = b.dataset.was; } }, 4000);
        return;
      }
      b.disabled = true;
      try {
        if (ban) {
          const r = await A.api("admin.ban", { userId: li.dataset.uid });
          const before = items.length;
          items = items.filter(c => c.user_id !== li.dataset.uid);
          total = Math.max(0, total - (before - items.length));
          A.toast(`${r.username} was banned and their comments were removed.`);
        } else {
          await A.api("comments.delete", { id: li.dataset.id });
          items = items.filter(c => c.id !== li.dataset.id);
          total = Math.max(0, total - 1);
        }
        redraw();
      } catch (x) { A.toast(x.message); b.disabled = false; }
    });
    more.addEventListener("click", () => load(true));

    let who = null;
    const start = () => {
      if (started) return;
      started = true;
      A.onChange(s => {
        drawTop(s);
        const now = (s.user?.id || "") + (s.user?.admin ? "!" : "");
        if (now !== who && s.status !== "loading") { const first = who === null; who = now; if (!first) redraw(); }
      });
      load(false);
    };
    drawTop(A.state);
    if (opt.eager || !("IntersectionObserver" in window)) start();
    else new IntersectionObserver((es, o) => { if (es.some(x => x.isIntersecting)) { o.disconnect(); start(); } }, { rootMargin: "400px 0px" }).observe(el);
  }

  window.MH_COMMENTS = { mount };

  /* Page thread at the bottom of every wiki page */
  const SKIP = new Set(["settings", "admin"]);
  const slug = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  const add = () => {
    if (SKIP.has(slug) || document.body.dataset.comments === "off") return;
    const main = document.querySelector("main");
    if (!main) return;
    const sec = document.createElement("section");
    sec.id = "comments";
    main.appendChild(sec);
    const title = (document.querySelector("h1")?.textContent || "this page").trim().replace(/\s+/g, " ");
    mount(sec, "page:" + slug, { title: slug === "index" ? "Comments" : `Comments on ${title.length > 40 ? "this page" : title}` });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
})();
