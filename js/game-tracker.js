/* =========================================================
   Game Tracker page: Miner's Haven CCU + history
   History: window.MH_CCU_HIST (js/ccu-history.js, Rolimon's snapshot)
   Newer:   ccu.json on this repo's "data" branch (written by .github/workflows/track-ccu.yml)
   Live:    games.roproxy.com (RoProxy mirror of Roblox's games API)
   ========================================================= */
(() => {
  const H = window.MH_CCU_HIST;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => n == null || !isFinite(n) ? "-" : Math.round(n).toLocaleString("en-US");
  const short = n => n == null ? "-" : n >= 1e9 ? +(n / 1e9).toFixed(2) + "B" : n >= 1e6 ? +(n / 1e6).toFixed(2) + "M" : n >= 1e4 ? +(n / 1e3).toFixed(1) + "k" : fmt(n);
  const RM = MH.reduceMotion;
  const DAY = 86400, UNIVERSE = 105689481;
  const GAME_API = "https://games.roproxy.com/v1/games";
  // Where the tracker workflow stores its data (owner/repo from the github.io address)
  const REPO = (() => {
    const h = location.hostname, seg = location.pathname.split("/").filter(Boolean)[0];
    return /\.github\.io$/.test(h) && seg ? `${h.split(".")[0]}/${seg}` : "x6nny/MHWiki";
  })();
  const DATA_URL = `https://raw.githubusercontent.com/${REPO}/data/ccu.json`;

  /* ---------- Decode the snapshot ---------- */
  const rows = [];
  (function decode() {
    let t = H.t0, v = 0, f = 0, u = 0, d = 0, i = 0;
    const ts = [t]; H.gaps.forEach(([g, c]) => { for (let k = 0; k < c; k++) ts.push(t += g); });
    for (; i < H.p.length; i++) {
      v += H.v[i]; f += H.f[i]; u += H.u[i]; d += H.d[i];
      rows.push({ t: ts[i], p: H.p[i], v, f, u, d, src: "r" });
    }
  })();
  const histEnd = rows[rows.length - 1].t;
  let tracked = { n: 0, updated: null, ok: null };

  /* ---------- Helpers ---------- */
  const nowS = () => Math.floor(Date.now() / 1000);
  const lastRow = () => rows[rows.length - 1];
  function idxAt(t) { let lo = 0, hi = rows.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (rows[m].t < t) lo = m + 1; else hi = m; } return lo; }
  function peak(from) { let best = null; for (let i = idxAt(from); i < rows.length; i++) if (rows[i].p != null && (!best || rows[i].p > best.p)) best = rows[i]; return best; }
  const dt = (t, o) => new Date(t * 1000).toLocaleString("en-US", o);
  const ago = t => { const s = nowS() - t; return s < 90 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 172800 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} days ago`; };
  function tween(el, to, f = fmt, dur = 700) {
    const from = +el.dataset.v || 0; el.dataset.v = to;
    if (RM || !isFinite(to)) { el.textContent = f(to); return; }
    const t0 = performance.now(); cancelAnimationFrame(el._r);
    (function s(n) { const p = Math.min(1, (n - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = f(from + (to - from) * e); if (p < 1) el._r = requestAnimationFrame(s); })(t0);
  }

  /* ---------- Stats ---------- */
  function stats() {
    const now = Math.max(nowS(), lastRow().t);
    const p24 = peak(now - DAY), p7 = peak(now - 7 * DAY), p30 = peak(now - 30 * DAY);
    const pAll = peak(0), rol = H.allTimePeak;
    const set = (id, r, extra) => { const el = $(id); tween(el, r ? r.p : NaN); el.parentElement.title = r ? `${fmt(r.p)} on ${dt(r.t, { dateStyle: "medium", timeStyle: "short" })}${extra || ""}` : ""; };
    set("#sPeak24", p24); set("#sPeak7", p7); set("#sPeak30", p30);
    const el = $("#sPeakAll");
    if (rol && (!pAll || rol.players >= pAll.p)) { tween(el, rol.players); el.parentElement.title = `${fmt(rol.players)} on ${new Date(rol.date + "T12:00:00Z").toLocaleDateString("en-US", { dateStyle: "medium" })} (Rolimon's)`; }
    else set("#sPeakAll", pAll);
  }

  /* ---------- Live ---------- */
  let live = null, liveTimer = null;
  async function pollLive() {
    try {
      const r = await fetch(`${GAME_API}?universeIds=${UNIVERSE}`);
      const b = await r.json(); const g = b && b.data && b.data[0];
      if (!g) throw 0;
      let up = null, down = null;
      try { const vr = await fetch(`${GAME_API}/votes?universeIds=${UNIVERSE}`); if (vr.ok) { const vb = await vr.json(); up = vb.data[0].upVotes; down = vb.data[0].downVotes; } } catch (e) {}
      const t = nowS(), L = lastRow();
      live = { t, p: g.playing, v: g.visits, f: g.favoritedCount, u: up ?? L.u, d: down ?? L.d };
      if (t - L.t >= 50) rows.push({ ...live, src: "l" });
      showLive(true);
    } catch (e) { showLive(false); }
  }
  function showLive(ok) {
    const el = $("#live");
    el.classList.toggle("off", !ok);
    if (!ok && !live) { $("#liveAgo").textContent = "can't reach Roblox"; return; }
    const L = live;
    tween($("#liveN"), L.p, fmt, 900);
    $("#liveAgo").textContent = ok ? "updated " + dt(L.t, { timeStyle: "short" }) : "offline · last " + ago(L.t);
    $("#lVisits").textContent = short(L.v); $("#lFavs").textContent = short(L.f);
    $("#lRating").textContent = L.u + L.d ? (L.u / (L.u + L.d) * 100).toFixed(1) + "%" : "-";
    const back = rows[Math.max(0, idxAt(L.t - DAY))];
    const diff = back && back.p ? (L.p - back.p) / back.p * 100 : null;
    const dl = $("#lDelta"); dl.textContent = diff == null ? "-" : `${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(0)}%`;
    dl.className = diff == null ? "" : diff >= 0 ? "up" : "down";
    el.classList.remove("ping"); void el.offsetWidth; el.classList.add("ping");
    spark(); stats(); if (range && range <= 7) draw();
  }
  function spark() {
    const from = nowS() - DAY, pts = rows.slice(idxAt(from)).filter(r => r.p != null);
    const svg = $("#spark"); if (pts.length < 2) { svg.innerHTML = ""; return; }
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t, mx = Math.max(...pts.map(r => r.p)) * 1.1 || 1;
    const X = t => (t - t0) / (t1 - t0 || 1) * 300, Y = p => 66 - p / mx * 60;
    const d = pts.map((r, i) => `${i ? "L" : "M"}${X(r.t).toFixed(1)} ${Y(r.p).toFixed(1)}`).join("");
    svg.innerHTML = `<defs><linearGradient id="spG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc857" stop-opacity=".45"/><stop offset="1" stop-color="#ffc857" stop-opacity="0"/></linearGradient></defs>
      <path d="${d}L300 70L0 70Z" fill="url(#spG)"/><path d="${d}" fill="none" stroke="#ffc857" stroke-width="2" vector-effect="non-scaling-stroke"/>
      <circle cx="${X(t1)}" cy="${Y(pts[pts.length - 1].p)}" r="3.5" fill="#fff" class="spk-dot"/>`;
  }

  /* ---------- Tracker data (data branch) ---------- */
  async function loadTracked() {
    try {
      const r = await fetch(DATA_URL + "?t=" + Math.floor(Date.now() / 60000), { cache: "no-store" });
      if (!r.ok) throw r.status;
      const db = await r.json();
      const add = (db.points || []).filter(p => p[0] > histEnd && p[1] != null).map(p => ({ t: p[0], p: p[1], v: p[2], f: p[3], u: p[4], d: p[5], src: "t" }));
      const liveRows = rows.filter(r => r.src === "l");
      rows.splice(idxAt(histEnd + 1));
      // carry forward counters if a point is missing them
      add.forEach(r => { const L = lastRow(); ["v", "f", "u", "d"].forEach(k => { if (r[k] == null) r[k] = L[k]; }); rows.push(r); });
      liveRows.filter(r => r.t > lastRow().t + 50).forEach(r => rows.push(r));
      tracked = { n: add.length, updated: db.updated || (add.length ? add[add.length - 1].t : null), ok: true };
    } catch (e) { tracked = { n: 0, updated: null, ok: false }; }
    sources(); stats(); spark(); draw(); heat(); months();
  }

  /* ================= Main chart ================= */
  let metric = "players", range = 30;
  const chEl = $("#chArea");
  const M = {
    players: { label: "Players", unit: "players", color: "#ffc857" },
    visits: { label: "New visits / day", unit: "visits/day", color: "#38d9ff", counter: "v" },
    favorites: { label: "New favorites / day", unit: "favorites/day", color: "#ff6bb5", counter: "f" },
    rating: { label: "Rating", unit: "%", color: "#7cff6b" }
  };
  function series(from, to, buckets) {
    const i0 = Math.max(0, idxAt(from) - 1), list = rows.slice(i0).filter(r => r.t <= to);
    if (!list.length) return [];
    const w = Math.max(1, (to - from) / buckets);
    const out = []; let cur = null;
    for (const r of list) {
      const k = Math.floor((r.t - from) / w);
      if (!cur || cur.k !== k) { cur && out.push(cur); cur = { k, t: r.t, n: 0, sum: 0, max: -Infinity, min: Infinity, maxT: r.t, last: r, first: r }; }
      if (r.p != null) { cur.n++; cur.sum += r.p; if (r.p > cur.max) { cur.max = r.p; cur.maxT = r.t; } cur.min = Math.min(cur.min, r.p); }
      cur.last = r;
    }
    cur && out.push(cur);
    out.forEach(b => b.t = b.n ? Math.round((b.first.t + b.last.t) / 2) : b.t);
    if (metric === "players") return out.filter(b => b.n && b.last.t >= from).map(b => ({ t: b.t, y: b.sum / b.n, hi: b.max, lo: b.min, hiT: b.maxT }));
    if (metric === "rating") return out.filter(b => b.last.t >= from).map(b => { const s = b.last.u + b.last.d; return { t: b.last.t, y: s ? b.last.u / s * 100 : null }; }).filter(x => x.y != null);
    const c = M[metric].counter, res = [];
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1].last, b = out[i].last, span = b.t - a.t;
      if (span <= 0 || b[c] == null || a[c] == null) continue;
      const rate = (b[c] - a[c]) / span * DAY;
      if (b.t >= from && rate >= 0) res.push({ t: Math.round((a.t + b.t) / 2), y: rate });
    }
    return res;
  }
  function niceStep(r, n) { const raw = r / n, mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / mag; return (f >= 5 ? 10 : f >= 2 ? 5 : f >= 1 ? 2 : 1) * mag; }
  let first = true;
  function draw() {
    const W = Math.max(320, chEl.clientWidth), Hh = W < 600 ? 280 : 400;
    const m = { l: W < 600 ? 44 : 58, r: 16, t: 16, b: 44 };
    const iw = W - m.l - m.r, ih = Hh - m.t - m.b;
    const to = Math.max(nowS(), lastRow().t), from = range ? to - range * DAY : rows[0].t;
    const S = series(from, to, Math.min(Math.floor(iw / 2.2), 700));
    const cfg = M[metric];
    if (S.length < 2) { chEl.innerHTML = `<div class="ch-empty">No data for this range yet.</div>`; $("#chSum").innerHTML = ""; return; }
    let yMin = metric === "rating" ? Math.min(...S.map(s => s.y)) : 0;
    let yMax = Math.max(...S.map(s => s.hi ?? s.y));
    if (metric === "rating") { const pad = Math.max(.5, (yMax - yMin) * .15); yMin = Math.max(0, yMin - pad); yMax = Math.min(100, yMax + pad); }
    const step = niceStep(yMax - yMin || 1, 5);
    yMin = Math.floor(yMin / step) * step; yMax = Math.ceil(yMax * 1.04 / step) * step;
    const t0 = S[0].t, t1 = Math.max(S[S.length - 1].t, t0 + 1);
    const X = t => m.l + (t - t0) / (t1 - t0) * iw, Y = v => m.t + ih - (v - yMin) / (yMax - yMin || 1) * ih;
    let g = "";
    for (let v = yMin; v <= yMax + 1e-9; v += step) g += `<line class="gy" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ty" x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${metric === "rating" ? v.toFixed(step < 1 ? 1 : 0) + "%" : short(v)}</text>`;
    // x ticks
    const spanD = (t1 - t0) / DAY, nT = W < 600 ? 4 : 8;
    const steps = [1 / 24, 3 / 24, 6 / 24, 12 / 24, 1, 2, 7, 14, 30.44, 91, 182.6, 365.25];
    const sd = steps.find(s => spanD / s <= nT) || 365.25;
    const opt = sd < 1 ? { hour: "numeric" } : sd < 28 ? { month: "short", day: "numeric" } : sd < 180 ? { month: "short", year: "2-digit" } : { year: "numeric" };
    let tt = new Date(t0 * 1000);
    if (sd >= 1) tt.setHours(0, 0, 0, 0); else tt.setMinutes(0, 0, 0);
    if (sd >= 28) tt.setDate(1);
    if (sd >= 180) tt.setMonth(0);
    for (let k = 0; k < 60; k++) {
      const ts = tt.getTime() / 1000;
      if (ts > t1) break;
      if (ts >= t0) g += `<line class="gx" x1="${X(ts)}" x2="${X(ts)}" y1="${m.t}" y2="${m.t + ih}"/><text class="tx" x="${X(ts)}" y="${Hh - m.b + 18}" text-anchor="middle">${tt.toLocaleString("en-US", opt)}</text>`;
      if (sd >= 365) tt.setFullYear(tt.getFullYear() + 1);
      else if (sd >= 28) tt.setMonth(tt.getMonth() + Math.round(sd / 30.44));
      else if (sd >= 1) tt.setDate(tt.getDate() + sd);
      else tt.setHours(tt.getHours() + Math.round(sd * 24));
    }
    const line = S.map((s, i) => `${i ? "L" : "M"}${X(s.t).toFixed(1)} ${Y(s.y).toFixed(1)}`).join("");
    const area = `${line}L${X(S[S.length - 1].t).toFixed(1)} ${m.t + ih}L${X(S[0].t).toFixed(1)} ${m.t + ih}Z`;
    const band = S[0].hi != null && S.some(s => s.hi !== s.lo)
      ? `<path class="band" d="${S.map((s, i) => `${i ? "L" : "M"}${X(s.t).toFixed(1)} ${Y(s.hi).toFixed(1)}`).join("")}${S.slice().reverse().map(s => `L${X(s.t).toFixed(1)} ${Y(s.lo).toFixed(1)}`).join("")}Z"/>` : "";
    // updates
    let upd = "";
    if ($("#showUpd").checked) {
      (H.updates || []).forEach(([d, n, k]) => {
        const ts = Date.parse(d + "T12:00:00Z") / 1000; if (ts < t0 || ts > t1) return;
        upd += `<g class="up up-${k}" data-n="${esc(n)}" data-d="${d}"><line x1="${X(ts)}" x2="${X(ts)}" y1="${m.t}" y2="${m.t + ih}"/><circle cx="${X(ts)}" cy="${m.t + ih + 4}" r="4.5"/></g>`;
      });
    }
    // peak marker
    let pk = "";
    if (metric === "players") { const b = S.reduce((a, s) => s.hi > a.hi ? s : a, S[0]); pk = `<g class="pk"><circle cx="${X(b.t)}" cy="${Y(b.hi)}" r="5"/><text x="${Math.min(W - m.r - 4, Math.max(m.l + 30, X(b.t)))}" y="${Y(b.hi) - 10}" text-anchor="middle">Peak ${fmt(b.hi)}</text></g>`; }
    const lastLive = live && live.t >= t0 ? `<circle class="lv" cx="${X(Math.min(live.t, t1))}" cy="${Y(metric === "players" ? live.p : S[S.length - 1].y)}" r="5"/>` : "";
    chEl.innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" class="ch-svg${first && !RM ? " draw" : ""}${!range || range > 90 ? " dense" : ""}" style="--c:${cfg.color}">
      <defs><linearGradient id="chA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cfg.color}" stop-opacity=".35"/><stop offset="1" stop-color="${cfg.color}" stop-opacity="0"/></linearGradient></defs>
      ${g}${band}<path class="area" d="${area}"/><path class="ln" d="${line}" pathLength="1"/>${upd}${pk}${lastLive}
      <line class="hx" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/><circle class="hd" r="5" visibility="hidden"/>
    </svg><div class="ch-tip" hidden></div>`;
    first = false;
    // summary
    const ys = S.map(s => s.y), avg = ys.reduce((a, b) => a + b, 0) / ys.length;
    const hiS = metric === "players" ? Math.max(...S.map(s => s.hi)) : Math.max(...ys), loS = metric === "players" ? Math.min(...S.map(s => s.lo)) : Math.min(...ys);
    const fm = v => metric === "rating" ? v.toFixed(2) + "%" : fmt(v);
    const change = ys[0] ? (ys[ys.length - 1] - ys[0]) / ys[0] * 100 : 0;
    $("#chSum").innerHTML = `<div><small>Average</small><b>${fm(avg)}</b></div><div><small>Highest</small><b>${fm(hiS)}</b></div><div><small>Lowest</small><b>${fm(loS)}</b></div><div><small>Change</small><b class="${change >= 0 ? "up" : "down"}">${change >= 0 ? "+" : ""}${metric === "rating" ? (ys[ys.length - 1] - ys[0]).toFixed(2) + " pts" : change.toFixed(0) + "%"}</b></div>`;
    $("#chNote").textContent = metric === "players" && range !== 1 && range !== 7 ? "Line = average, shaded band = lowest to highest in each step." : metric === "rating" ? "Upvotes ÷ (upvotes + downvotes)." : "";
    // hover
    const svg = chEl.querySelector("svg"), tip = chEl.querySelector(".ch-tip"), hx = svg.querySelector(".hx"), hd = svg.querySelector(".hd");
    svg.addEventListener("pointermove", ev => {
      const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W;
      const u = ev.target.closest(".up");
      let bi = 0, bd = Infinity; S.forEach((s, i) => { const d0 = Math.abs(X(s.t) - x); if (d0 < bd) { bd = d0; bi = i; } });
      const s = S[bi];
      hx.setAttribute("x1", X(s.t)); hx.setAttribute("x2", X(s.t)); hx.setAttribute("visibility", "visible");
      hd.setAttribute("cx", X(s.t)); hd.setAttribute("cy", Y(s.y)); hd.setAttribute("visibility", "visible");
      const when = dt(s.t, spanD > 3 ? { dateStyle: "medium" } : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      tip.hidden = false;
      tip.innerHTML = u ? `<small>${esc(new Date(u.dataset.d + "T12:00:00Z").toLocaleDateString("en-US", { dateStyle: "medium" }))}</small><b>${esc(u.dataset.n)}</b><span>Update</span>`
        : `<small>${esc(when)}</small><b>${fm(s.y)} <em>${metric === "players" && s.hi !== s.lo ? "avg" : cfg.unit}</em></b>${metric === "players" && s.hi !== s.lo ? `<span>Peak ${fmt(s.hi)} · low ${fmt(s.lo)}</span>` : ""}`;
      const px = X(s.t) / W * r.width;
      tip.style.left = Math.min(r.width - 190, Math.max(0, px - 95)) + "px";
      tip.style.top = Math.max(0, Y(s.y) / Hh * r.height - 84) + "px";
    });
    svg.addEventListener("pointerleave", () => { tip.hidden = true; hx.setAttribute("visibility", "hidden"); hd.setAttribute("visibility", "hidden"); });
  }
  function seg(el, attr, cb) {
    el.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; el.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); cb(b.dataset[attr]); });
  }
  seg($("#metric"), "m", v => { metric = v; first = true; draw(); });
  seg($("#range"), "r", v => { range = +v; first = true; draw(); });
  $("#showUpd").addEventListener("change", draw);
  let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { draw(); months(); }, 150); });

  $("#csv").addEventListener("click", () => {
    const lines = ["time_utc,players,visits,favorites,upvotes,downvotes,source"];
    const src = { r: "rolimons", t: "tracker", l: "live" };
    rows.forEach(r => lines.push(`${new Date(r.t * 1000).toISOString()},${r.p ?? ""},${r.v ?? ""},${r.f ?? ""},${r.u ?? ""},${r.d ?? ""},${src[r.src]}`));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = "miners-haven-ccu.csv";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  /* ================= Heatmap ================= */
  function heat() {
    const from = Math.max(nowS(), lastRow().t) - 30 * DAY;
    const sum = Array.from({ length: 7 }, () => new Array(24).fill(0)), cnt = Array.from({ length: 7 }, () => new Array(24).fill(0));
    rows.slice(idxAt(from)).forEach(r => { if (r.p == null) return; const d = new Date(r.t * 1000); sum[d.getDay()][d.getHours()] += r.p; cnt[d.getDay()][d.getHours()]++; });
    const avg = sum.map((row, d) => row.map((s, h) => cnt[d][h] ? s / cnt[d][h] : null));
    const vals = avg.flat().filter(v => v != null);
    if (!vals.length) { $("#heat").innerHTML = `<p class="ch-empty">Not enough recent data.</p>`; return; }
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], order = [1, 2, 3, 4, 5, 6, 0];
    const hr = h => new Date(2020, 0, 1, h).toLocaleTimeString("en-US", { hour: "numeric" });
    let best = null, worst = null;
    let html = `<span></span>` + Array.from({ length: 24 }, (_, h) => `<span class="hh">${h % 3 ? "" : hr(h).replace(" ", "")}</span>`).join("");
    order.forEach((d, ri) => {
      html += `<span class="hd-l">${days[d]}</span>`;
      for (let h = 0; h < 24; h++) {
        const v = avg[d][h], p = v == null ? 0 : (v - lo) / (hi - lo || 1);
        if (v != null && (!best || v > best.v)) best = { v, d, h };
        if (v != null && (!worst || v < worst.v)) worst = { v, d, h };
        html += `<i style="--p:${p.toFixed(3)};--d:${(ri * 24 + h) * 4}ms" title="${days[d]} ${hr(h)}: ${v == null ? "no data" : fmt(v) + " players on average"}"></i>`;
      }
    });
    $("#heat").innerHTML = html;
    $("#hmBest").innerHTML = `Busiest: <b>${days[best.d]} around ${hr(best.h)}</b> (${fmt(best.v)} avg) · Quietest: <b>${days[worst.d]} around ${hr(worst.h)}</b> (${fmt(worst.v)} avg)`;
  }

  /* ================= Monthly ================= */
  function months() {
    const map = new Map();
    rows.forEach(r => { if (r.p == null) return; const d = new Date(r.t * 1000), k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; const o = map.get(k) || { k, s: 0, n: 0, max: 0 }; o.s += r.p; o.n++; o.max = Math.max(o.max, r.p); map.set(k, o); });
    const list = [...map.values()].sort((a, b) => a.k.localeCompare(b.k)).map(o => ({ ...o, avg: o.s / o.n }));
    const mx = Math.max(...list.map(o => o.avg)), top = list.reduce((a, o) => o.avg > a.avg ? o : a, list[0]);
    const mName = k => new Date(k + "-15T00:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    $("#monthChart").innerHTML = list.map((o, i) => `<div class="mb${o === top ? " top" : ""}${o.k.endsWith("-01") ? " jan" : ""}" style="--h:${(o.avg / mx * 100).toFixed(1)}%;--i:${i}" tabindex="0" aria-label="${mName(o.k)}: ${fmt(o.avg)} average, peak ${fmt(o.max)}"><i></i><span class="mb-tip"><b>${mName(o.k)}</b>${fmt(o.avg)} average<br>Peak ${fmt(o.max)}</span></div>`).join("");
    const years = [...new Set(list.map(o => o.k.slice(0, 4)))];
    $("#yearRow").innerHTML = years.map(y => { const n = list.filter(o => o.k.startsWith(y)).length; return `<span style="flex:${n}" title="${y}">${n < 4 ? "’" + y.slice(2) : y}</span>`; }).join("");
  }

  /* ================= Sources ================= */
  function sources() {
    const histStart = dt(rows[0].t, { dateStyle: "medium" }), he = dt(histEnd, { dateStyle: "medium" });
    const trk = tracked.ok
      ? `<b class="ok">Running</b> · ${fmt(tracked.n)} points so far${tracked.updated ? `, last ${ago(tracked.updated)}` : ""}.`
      : tracked.ok === false ? `<b class="wait">Not running yet.</b> Once the tracker workflow is added to the GitHub repo, a new point is saved every 15 minutes and shows up here automatically.` : "Checking…";
    $("#sources").innerHTML = `
      <div class="ab glass"><span class="ab-n">1</span><h3>Rolimon's history</h3><p>${fmt(H.p.length)} data points from ${esc(histStart)} to ${esc(he)}: every 6 hours for the older years, then hourly and every 10 minutes for the most recent weeks. The all-time peak of ${fmt(H.allTimePeak.players)} players on 1 Jan 2020 is from Rolimon's too.</p><a class="xlink" href="https://www.rolimons.com/game/258258996" target="_blank" rel="noopener">Rolimon's game page</a></div>
      <div class="ab glass"><span class="ab-n">2</span><h3>This site's tracker</h3><p>${trk}</p><p class="ab-small">A scheduled GitHub Action asks Roblox for the player count, visits, favorites and votes, and saves them to <code>ccu.json</code> on the repo's <code>data</code> branch.</p></div>
      <div class="ab glass"><span class="ab-n">3</span><h3>Live count</h3><p>While this page is open it asks Roblox for the current player count every minute and adds it to the end of the graph. Those live points are only kept in your browser.</p></div>`;
  }

  /* ---------- Boot ---------- */
  sources(); stats(); spark(); draw(); heat(); months();
  loadTracked();
  pollLive(); liveTimer = setInterval(pollLive, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pollLive(); });

  /* Back to top */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }));
})();
