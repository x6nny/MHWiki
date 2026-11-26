/* =========================================================
   MPU Calculator  (MPU = multiplier ^ (1 / length))
   Data: window.MH_MPU (data/MPU.json)
     items: upgraders  { n, img, kind, tier, len, mult, varies?, note?, wikiMpu? }
     mines: special mines { ..., uses, maxUses, usesLabel }
   Setup is saved in this browser (mh-mpu-v1) and can be shared as a link.
   ========================================================= */
(() => {
  const D = window.MH_MPU;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const RM = MH.reduceMotion;
  const ITEM = n => "item-index.html#item=" + encodeURIComponent(n);
  const pic = (p, n) => p
    ? `<img src="${esc(MH_SRC(p))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:${esc(JSON.stringify((n || '?')[0]))}}))" />`
    : `<span class="ph">${esc((n || "?")[0])}</span>`;

  const ALL = [...D.items, ...D.mines].map(o => ({ ...o, id: o.kind + ":" + o.n }));
  const BY = Object.fromEntries(ALL.map(o => [o.id, o]));
  const isMine = o => o.kind === "Mine";
  // An item's own MPU with its default settings (mines: all default hits on their own length)
  const ownMpu = o => o.mult > 0 ? Math.pow(o.mult, (isMine(o) ? o.uses || 1 : 1) / Math.max(o.len, 0.1)) : 0;
  ALL.forEach(o => { o.mpu = ownMpu(o); o.search = (o.n + " " + o.tier + " " + (o.note || "")).toLowerCase(); });

  /* ---------- number formatting ---------- */
  const trim = (n, d) => Number(n.toFixed(d)).toLocaleString("en-US", { maximumFractionDigits: d });
  function fmtMult(log10) {   // total multiplier from its log10 (totals can get huge)
    if (!isFinite(log10)) return "x0";
    if (log10 < 6) return "x" + trim(Math.pow(10, log10), log10 < 1 ? 3 : log10 < 3 ? 2 : 1);
    const e = Math.floor(log10), m = Math.pow(10, log10 - e);
    return `x${m.toFixed(2)}e${e}`;
  }
  const fmtMpu = v => !isFinite(v) || v <= 0 ? "–" : v >= 1000 ? trim(v, 0) : v.toFixed(4);
  const fmtNum = v => trim(v, 3);

  /* ---------- state ---------- */
  const KEY = "mh-mpu-v1";
  let rows = [], manualLen = null;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ rows: rows.map(r => ({ id: r.id, mult: r.mult, uses: r.uses, len: r.len })), len: manualLen })); } catch {}
  }
  function restore(obj) {
    rows = (obj.rows || []).filter(r => BY[r.id]).map(r => ({ id: r.id, mult: +r.mult || 0, uses: Math.max(1, Math.round(+r.uses || 1)), len: +r.len > 0 ? +r.len : BY[r.id].len }));
    manualLen = +obj.len > 0 ? +obj.len : null;
  }
  try {
    const h = new URLSearchParams(location.hash.slice(1)).get("s");
    if (h) {
      restore(JSON.parse(decodeURIComponent(escape(atob(h)))));
      history.replaceState(null, "", location.pathname);
      setTimeout(() => MH.toast("Loaded a shared setup"), 400);
      save();
    } else restore(JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch { rows = []; manualLen = null; }

  const autoLen = () => rows.reduce((s, r) => s + r.len * (isMine(BY[r.id]) ? 1 : r.uses), 0);
  const lenNow = () => manualLen ?? autoLen();
  const logTotal = () => rows.reduce((s, r) => s + (r.mult > 0 ? r.uses * Math.log10(r.mult) : -Infinity), 0);

  /* ---------- picker ---------- */
  const list = $("#list"), more = $("#more"), q = $("#q"), sortEl = $("#sort");
  let kind = "all", shown = 40;
  function filtered() {
    const t = q.value.trim().toLowerCase();
    let arr = ALL.filter(o => (kind === "all" || o.kind === kind) && (!t || o.search.includes(t)));
    const s = sortEl.value;
    const known = (a, b) => (b.mult > 0) - (a.mult > 0);
    if (s === "mpu") arr.sort((a, b) => known(a, b) || b.mpu - a.mpu);
    else if (s === "mult") arr.sort((a, b) => known(a, b) || Math.pow(b.mult, isMine(b) ? b.uses : 1) - Math.pow(a.mult, isMine(a) ? a.uses : 1));
    else if (s === "len") arr.sort((a, b) => a.len - b.len || b.mpu - a.mpu);
    else arr.sort((a, b) => a.n.localeCompare(b.n));
    return arr;
  }
  function card(o, i) {
    const inSetup = rows.find(r => r.id === o.id);
    const multTxt = o.mult > 0 ? (isMine(o) ? `x${fmtNum(o.mult)} × ${o.uses}` : `x${fmtNum(o.mult)}`) : "Set it";
    return `<li class="mpu-it${inSetup ? " in" : ""}${isMine(o) ? " mine" : ""}" style="--i:${Math.min(i, 14)}">
      <a class="mpu-it-pic" href="${ITEM(o.n)}" title="Open ${esc(o.n)} in the Item Index">${pic(o.img, o.n)}</a>
      <div class="mpu-it-id">
        <b title="${esc(o.n)}">${esc(o.n)}</b>
        <span class="mpu-tags"><em class="k">${isMine(o) ? "Mine" : esc(o.tier)}</em>${o.varies ? `<em class="var" title="${esc(o.note || "")}">varies</em>` : ""}</span>
        ${o.note ? `<small title="${esc(o.note)}">${esc(o.note)}</small>` : ""}
      </div>
      <div class="mpu-it-nums">
        <span class="m${o.mult > 0 ? "" : " unk"}">${multTxt}</span>
        <span class="l">${fmtNum(o.len)} long</span>
        <span class="p">${o.mpu > 0 ? "MPU " + fmtMpu(o.mpu) : "MPU ?"}</span>
      </div>
      <button type="button" class="mpu-add" data-id="${esc(o.id)}" aria-label="Add ${esc(o.n)}" title="${inSetup ? "Add another" : "Add to setup"}">${inSetup ? `<span>${inSetup.uses}</span>` : "+"}</button>
    </li>`;
  }
  function drawList() {
    const arr = filtered();
    $("#count").textContent = `${arr.length.toLocaleString("en-US")} item${arr.length === 1 ? "" : "s"}`;
    list.innerHTML = arr.length ? arr.slice(0, shown).map(card).join("") : `<li class="mpu-none">Nothing matches. Try another name.</li>`;
    more.hidden = arr.length <= shown;
    more.textContent = `Show more (${(arr.length - shown).toLocaleString("en-US")} left)`;
  }
  q.addEventListener("input", () => { shown = 40; drawList(); });
  sortEl.addEventListener("change", () => { shown = 40; drawList(); });
  $("#kind").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    kind = b.dataset.k;
    $("#kind").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    shown = 40; drawList();
  });
  more.addEventListener("click", () => { shown += 60; drawList(); });
  list.addEventListener("click", e => {
    const b = e.target.closest(".mpu-add"); if (!b) return;
    add(b.dataset.id);
    const r = b.getBoundingClientRect();
    flyTo(r.left + r.width / 2, r.top + r.height / 2);
  });

  function add(id) {
    const o = BY[id], r = rows.find(x => x.id === id);
    if (r) {
      const max = isMine(o) ? o.maxUses || 99 : 99;
      if (r.uses >= max) { MH.toast(`${o.n} can only apply ${max} time${max === 1 ? "" : "s"}`); return; }
      r.uses++;
    } else rows.push({ id, mult: o.mult > 0 ? o.mult : 1, uses: isMine(o) ? o.uses || 1 : 1, len: o.len, fresh: true });
    if (!(o.mult > 0)) MH.toast(`Type ${o.n}'s multiplier in your setup`);
    changed(true);
  }
  // a small dot that flies from the + button to the setup panel
  function flyTo(x, y) {
    if (RM) return;
    const t = $("#setup").getBoundingClientRect();
    const dot = document.createElement("span");
    dot.className = "mpu-fly";
    dot.style.left = x + "px"; dot.style.top = y + "px";
    document.body.appendChild(dot);
    const tx = t.left + Math.min(t.width / 2, 120), ty = Math.max(t.top + 40, 40);
    dot.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: `translate(${tx - x}px, ${ty - y}px) translate(-50%,-50%) scale(.4)`, opacity: .2 }], { duration: 520, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = () => dot.remove();
  }

  /* ---------- setup rows ---------- */
  const rowsEl = $("#rows");
  function rowHtml(r) {
    const o = BY[r.id], mine = isMine(o);
    const own = r.mult > 0 ? Math.pow(r.mult, mine ? r.uses / r.len : 1 / r.len) : 0;
    const max = mine ? o.maxUses || 99 : 99;
    return `<li class="mpu-row${r.fresh ? " fresh" : ""}${r.mult > 0 ? "" : " need"}" data-id="${esc(r.id)}">
      <div class="mpu-row-top">
        <span class="mpu-row-pic">${pic(o.img, o.n)}</span>
        <div class="mpu-row-id">
          <b title="${esc(o.n)}">${esc(o.n)}</b>
          <small>${mine ? "Mine" : esc(o.tier)}${o.varies ? ` · <em class="var">varies</em>` : ""} · own MPU <span class="own">${fmtMpu(own)}</span></small>
        </div>
      </div>
      <label class="mpu-f f-mult"><span>Multiplier</span><span class="mpu-x"><i>x</i><input type="number" data-f="mult" min="0" step="any" inputmode="decimal" value="${r.mult}" /></span></label>
      <div class="mpu-f f-uses"><span>${mine ? esc(o.usesLabel || "Uses") : "Copies"}</span>
        <span class="mpu-stepper"><button type="button" data-step="-1" aria-label="Fewer">−</button><input type="number" data-f="uses" min="1" max="${max}" step="1" value="${r.uses}" aria-label="${mine ? esc(o.usesLabel || "Uses") : "Copies"}" /><button type="button" data-step="1" aria-label="More">+</button></span>
      </div>
      <label class="mpu-f f-len"><span>Length</span><input type="number" data-f="len" min="0.1" step="any" inputmode="decimal" value="${r.len}" /></label>
      <button type="button" class="mpu-del" aria-label="Remove ${esc(o.n)}" title="Remove">×</button>
    </li>`;
  }
  function drawRows() {
    rowsEl.innerHTML = rows.map(rowHtml).join("");
    rows.forEach(r => delete r.fresh);
    $("#empty").hidden = rows.length > 0;
  }
  rowsEl.addEventListener("input", e => {
    const li = e.target.closest(".mpu-row"), f = e.target.dataset.f;
    if (!li || !f) return;
    const r = rows.find(x => x.id === li.dataset.id), o = BY[r.id];
    const v = parseFloat(e.target.value);
    if (f === "mult") { r.mult = v > 0 ? v : 0; li.classList.toggle("need", !(v > 0)); }
    else if (f === "uses") { if (!(v >= 1)) return; r.uses = Math.min(Math.round(v), isMine(o) ? o.maxUses || 99 : 99); }
    else if (f === "len") { if (!(v > 0)) return; r.len = v; }
    const own = r.mult > 0 ? Math.pow(r.mult, isMine(o) ? r.uses / r.len : 1 / r.len) : 0;
    li.querySelector(".own").textContent = fmtMpu(own);
    changed(false);
  });
  rowsEl.addEventListener("change", e => { if (e.target.dataset.f === "uses") { drawRows(); changed(false); } });
  rowsEl.addEventListener("click", e => {
    const li = e.target.closest(".mpu-row"); if (!li) return;
    const r = rows.find(x => x.id === li.dataset.id), o = BY[r.id];
    const st = e.target.closest("[data-step]");
    if (st) {
      const max = isMine(o) ? o.maxUses || 99 : 99;
      r.uses = Math.max(1, Math.min(max, r.uses + +st.dataset.step));
      li.querySelector('[data-f="uses"]').value = r.uses;
      const own = r.mult > 0 ? Math.pow(r.mult, isMine(o) ? r.uses / r.len : 1 / r.len) : 0;
      li.querySelector(".own").textContent = fmtMpu(own);
      changed(false); return;
    }
    if (e.target.closest(".mpu-del")) {
      li.classList.add("bye");
      setTimeout(() => { rows = rows.filter(x => x !== r); drawRows(); changed(false); }, RM ? 0 : 220);
    }
  });

  /* ---------- length ---------- */
  const lenEl = $("#len");
  lenEl.addEventListener("input", () => {
    const v = parseFloat(lenEl.value);
    manualLen = v > 0 ? v : null;
    calc(); save(); noteLen();
  });
  document.querySelectorAll("[data-len]").forEach(b => b.addEventListener("click", () => {
    manualLen = Math.max(1, Math.round((lenNow() || 0) + +b.dataset.len));
    lenEl.value = manualLen; calc(); save(); noteLen();
  }));
  function noteLen() {
    const a = autoLen(), n = $("#lenNote");
    if (!rows.length) { n.innerHTML = ""; return; }
    if (manualLen == null) n.innerHTML = `Using the items' lengths added up (<b>${fmtNum(a)}</b>). Type a shorter length if items share space.`;
    else n.innerHTML = `Items added up would be <b>${fmtNum(a)}</b> long. <button type="button" id="lenReset">Use that</button>`;
    $("#lenReset")?.addEventListener("click", () => { manualLen = null; lenEl.value = fmtInput(autoLen()); calc(); save(); noteLen(); });
  }
  const fmtInput = v => v ? +v.toFixed(3) : "";

  /* ---------- result ---------- */
  function tween(el, to, f, dur = 500) {
    const from = +el.dataset.v; el.dataset.v = to;
    if (RM || !isFinite(from) || !isFinite(to) || from === to) { el.textContent = f(to); return; }
    const t0 = performance.now(); cancelAnimationFrame(el._r);
    (function s(now) { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = f(from + (to - from) * e); if (p < 1) el._r = requestAnimationFrame(s); })(t0);
  }
  const ARC = 2 * Math.PI * 86;
  function calc() {
    const L = lenNow(), lt = logTotal();
    const mpu = rows.length && L > 0 && isFinite(lt) ? Math.pow(10, lt / L) : NaN;
    tween($("#rMpu"), isFinite(mpu) ? mpu : NaN, fmtMpu);
    $("#rTotal").textContent = rows.length ? fmtMult(lt) : "x1";
    $("#rLen").textContent = fmtNum(L || 0);
    $("#rCount").textContent = rows.reduce((s, r) => s + (isMine(BY[r.id]) ? 1 : r.uses), 0);
    const need = rows.some(r => !(r.mult > 0));
    $("#rEq").innerHTML = !rows.length ? "Add items below to start."
      : need ? "Type a multiplier for the highlighted item."
      : `${esc(fmtMult(lt))}<sup>1 ÷ ${esc(fmtNum(L))}</sup> = <b>${esc(fmtMpu(mpu))}</b>`;
    // ring: MPU 1 → empty, 2.5+ → full
    const frac = isFinite(mpu) ? Math.max(0, Math.min(1, (mpu - 1) / 1.5)) : 0;
    const arc = $("#ringArc");
    arc.style.strokeDasharray = ARC;
    arc.style.strokeDashoffset = ARC * (1 - frac);
    $("#result").style.setProperty("--hue", String(150 - frac * 110));
    $("#result").classList.toggle("has", isFinite(mpu));
  }
  function changed(redrawRows) {
    if (redrawRows) drawRows();
    if (manualLen == null) lenEl.value = fmtInput(autoLen());
    calc(); noteLen(); save(); drawList();
  }

  /* ---------- share & clear ---------- */
  $("#share").addEventListener("click", async () => {
    if (!rows.length) { MH.toast("Add some items first"); return; }
    const data = btoa(unescape(encodeURIComponent(JSON.stringify({ rows: rows.map(r => ({ id: r.id, mult: r.mult, uses: r.uses, len: r.len })), len: manualLen }))));
    const url = location.origin + location.pathname + "#s=" + data;
    try { await navigator.clipboard.writeText(url); MH.toast("Link copied. Anyone who opens it sees this setup."); }
    catch { prompt("Copy this link:", url); }
  });
  const clearBtn = $("#clear");
  clearBtn.addEventListener("click", () => {
    if (!rows.length) return;
    if (!clearBtn.dataset.sure) { clearBtn.dataset.sure = "1"; clearBtn.textContent = "Sure?"; setTimeout(() => { delete clearBtn.dataset.sure; clearBtn.textContent = "Clear"; }, 3000); return; }
    delete clearBtn.dataset.sure; clearBtn.textContent = "Clear";
    rows = []; manualLen = null; changed(true);
  });

  /* ---------- start ---------- */
  drawRows();
  if (manualLen != null) lenEl.value = manualLen; else lenEl.value = fmtInput(autoLen());
  calc(); noteLen(); drawList();
})();
