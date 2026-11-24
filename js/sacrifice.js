/* =========================================================
   Sacrifice page
   Data: window.MH_SAC (data/Sacrifice.json)
   ========================================================= */
(() => {
  const D = window.MH_SAC;
    const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (p, size = 120) => p ? MH_SRC(p) : null;
  const ITEM_LINK = n => "item-index.html#item=" + encodeURIComponent(n);
  const seg = s => typeof s === "string" ? esc(s)
    : s && s.i ? `<a class="ilink" href="${ITEM_LINK(s.i)}">${s.img ? `<img src="${esc(img(s.img, 40))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : ""}${esc(s.i)}</a>` : "";
  const html = arr => (arr || []).map(seg).join("");
  const text = arr => (arr || []).map(s => typeof s === "string" ? s : (s.i || "")).join("");
  const pic = (p, size, name) => p ? `<img src="${esc(img(p, size))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=ph>${esc((name || "?")[0])}</span>'" />` : `<span class="ph">${esc((name || "?")[0])}</span>`;

  /* ---------- Hero ---------- */
  $("#lede").innerHTML = `Give up almost everything for new mechanics and items, and start again from life 1. You need to be <b>life 1,000</b> or higher, and it can only be done once per save.`;
  $("#warnText").textContent = D.warning;
  setTimeout(() => {
    MH.countUp($("#stSac"), D.sacrifices.filter(s => s.status === "released").length);
    MH.countUp($("#stLife"), 1000);
    MH.countUp($("#stCat"), D.catalysts.length);
  }, 500);
  $("#stBase").textContent = "62×62";

  $("#runes").innerHTML = "ᛋᚨᚲᚱᛁᚠᛁᚲᛖ·ᛋᚨᚲᚱᛁᚠᛁᚲᛖ·".split("").map((c, i, a) => `<i style="--a:${i * 360 / a.length}deg">${c}</i>`).join("");

  /* Three-button confirmation demo */
  const btns = [...document.querySelectorAll(".cfb")];
  const LINES = ["Try the three-button confirmation. Nothing happens to your real save.", "This is permanent. Click again to confirm.", "Last chance! Your items will be gone forever."];
  const PREFIX = ["s-", "S+", "z-"];
  let round = 0;
  btns.forEach((b, i) => b.addEventListener("click", () => {
    b.classList.add("done"); b.disabled = true;
    if (i < 2) { btns[i + 1].disabled = false; btns[i + 1].focus(); $("#confirmText").textContent = LINES[i + 1]; return; }
    const altar = $("#altar");
    altar.classList.remove("boom"); void altar.offsetWidth; altar.classList.add("boom");
    shatter();
    const life = $("#altarLife");
    const pf = PREFIX[round % 3]; round++;
    life.textContent = pf + "1"; life.classList.remove("tick"); void life.offsetWidth; life.classList.add("tick");
    $("#confirmText").textContent = pf === "z-" ? "The Forbidden Sacrifice isn't out yet, but here's how it'd look." : `Sacrificed! You're back at life ${pf}1. Click again to go further.`;
    setTimeout(() => { btns.forEach((x, j) => { x.classList.remove("done"); x.disabled = j > 0; }); }, 1400);
    setTimeout(() => { life.textContent = pf + "1,000"; }, 3200);
  }));
  function shatter() {
    if (MH.reduceMotion) return;
    const s = $("#shatter");
    s.classList.remove("flash"); void s.offsetWidth; s.classList.add("flash");
    const r = $("#altar").getBoundingClientRect();
    for (let i = 0; i < 34; i++) {
      const p = document.createElement("i");
      p.style.left = r.left + r.width / 2 + "px"; p.style.top = r.top + r.height / 2 + "px";
      p.style.background = ["#ff3b5c", "#b06bff", "#ff8a3d", "#fff"][i % 4];
      s.appendChild(p);
      const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 220;
      p.animate([{ transform: "translate(-50%,-50%) scale(1) rotate(0)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 80}px)) scale(.4) rotate(${Math.random() * 720}deg)`, opacity: 0 }],
        { duration: 900 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => p.remove();
    }
  }

  /* ---------- Journey ---------- */
  const NODES = [
    ["#7ad7ff", "Life 1", "Start", "Basic Iron Mine, Basic Furnace and 10 conveyors."],
    ["#7ad7ff", "1,000", "Ready", "The earliest you can sacrifice."],
    ["#ff3b5c", "s-1", "Ultimate Sacrifice", "Get The Ultimate Sacrifice and 10 Ultimate Conveyors.", "badge-ultimate"],
    ["#ff3b5c", "s-100", "Escrow returns", "Exotics, Collectibles and other held items come back."],
    ["#ff3b5c", "s-1,000", "Ready again", "You can do the Second Sacrifice."],
    ["#ffb347", "S+1", "Second Sacrifice", "The Ultimate Sacrifice becomes the Statue of Sacrifice.", "badge-hero"],
    ["#ffb347", "S+10", "Final Upgrader", "The Final Upgrader arrives."],
    ["#ffb347", "S+1,000", "True Book", "Draedon gives you the True Book of Knowledge. Catalysts unlock from here."],
    ["#b06bff", "z-1", "Forbidden Sacrifice", "Not out yet. Needs The Forbidden Tome.", "badge-forbidden", true],
    ["#b06bff", "Z+", "Defeat Solumn", "Your prefix becomes Z+.", null, true],
  ];
  $("#road").innerHTML = `<div class="road"><span class="road-fill"></span>${NODES.map(([c, pf, tt, ds, badge, soon], i) =>
    `<div class="node ${badge ? "big" : ""} ${soon ? "soon" : ""}" style="--c:${c};--i:${i}"><span class="pin">${badge ? `<img src="../assets/sacrifice/${badge}.webp" alt="" />` : ""}</span><span class="pf">${pf}</span><span class="tt">${tt}</span><span class="ds">${ds}</span></div>`).join("")}</div>`;
  MH.reveal($("#road"));

  /* ---------- Keep / gain / lose ---------- */
  const li = (arr) => arr.map((x, i) => `<li style="--i:${i}">${html(x)}</li>`).join("");
  $("#keepList").innerHTML = li(D.kept);
  $("#gainList").innerHTML = li(D.gained);
  $("#loseList").innerHTML = li(D.lost);
  document.querySelectorAll(".kgl .col").forEach(MH.reveal);

  /* ---------- Three sacrifices ---------- */
  const tabs = $("#sacTabs"), ind = tabs.querySelector(".seg-ind");
  const COLORS = { ultimate: "linear-gradient(135deg,#ff3b5c,#b0123a)", second: "linear-gradient(135deg,#ffb347,#ff7a1a)", third: "linear-gradient(135deg,#b06bff,#6b3bd1)" };
  tabs.insertAdjacentHTML("beforeend", D.sacrifices.map((s, i) => `<button data-k="${s.k}" class="${i === 0 ? "active" : ""}" role="tab"><img src="../assets/sacrifice/${s.badge}.webp" alt="" />${esc(s.name)}</button>`).join(""));
  function showSac(k) {
    const s = D.sacrifices.find(x => x.k === k);
    tabs.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.k === k));
    const b = tabs.querySelector("button.active");
    ind.style.width = b.offsetWidth + "px"; ind.style.transform = `translateX(${b.offsetLeft - 4}px)`; tabs.style.setProperty("--sc", COLORS[k]);
    $("#sacPanel").innerHTML = `<article class="sac glass ${k}">
      <div class="sac-side">
        <img class="bdg" src="../assets/sacrifice/${s.badge}.webp" alt="${esc(s.badgeName)} badge" />
        <span class="bname">${esc(s.badgeName)} badge</span>
        <div class="sac-meta">
          <div><small>Prefix</small><b>${esc(s.prefix)}</b></div>
          <div><small>Requires</small><b style="font-size:13px">${esc(s.need)}</b></div>
          <div class="base"><small>Base size</small><b>${esc(s.base[0])} → ${esc(s.base[1])}</b><div class="grow-box"><i></i><span>➜</span><i></i></div></div>
        </div>
      </div>
      <div class="sac-main">
        <h3>${esc(s.name)} <span class="status ${s.status}">${s.status === "released" ? "Released" : "In development"}</span></h3>
        <p class="when">${s.status === "released" ? `Released ${esc(s.released)} · ${esc(s.update)}` : "Not released yet. Some of this is speculation."}</p>
        <p class="blurb">${esc(s.blurb)}</p>
        ${s.item ? `<a class="sac-item" href="${ITEM_LINK(s.item.i)}">${pic(s.item.img, 120, s.item.i)}<span><small>Sacrifice item</small><b>${esc(s.item.i)}</b></span></a>` : ""}
        <div class="gl2">
          <div><h4>You get</h4><ul>${s.gain.map(g => `<li>${html(g)}</li>`).join("")}</ul></div>
          <div class="ls"><h4>You lose</h4><ul>${s.lose.map(g => `<li>${html(g)}</li>`).join("")}</ul></div>
        </div>
        <p class="esc-note">${k === "third" ? `Escrowed items come back after you finish the <b>${esc(s.escrow)}</b>. Gamepass items and The Forbidden Tome come back straight away.` : `Escrowed items come back at life <b>${esc(s.escrow)}</b>.`}</p>
      </div>
    </article>`;
  }
  tabs.addEventListener("click", e => { const b = e.target.closest("button"); if (b) showSac(b.dataset.k); });
  showSac("ultimate");
  window.addEventListener("resize", () => { const b = tabs.querySelector("button.active"); ind.style.width = b.offsetWidth + "px"; ind.style.transform = `translateX(${b.offsetLeft - 4}px)`; });
  document.fonts && document.fonts.ready.then(() => showSac(tabs.querySelector("button.active").dataset.k));

  /* ---------- Escrow ---------- */
  $("#escList").innerHTML = D.escrow.map(x => `<li><span>${html(x)}</span></li>`).join("");
  $("#goneText").textContent = D.gone;

  /* ---------- Ultimate items ---------- */
  const UC = ["#ff3b5c", "#ffb347", "#b18cff"];
  $("#ultGrid").innerHTML = D.ultItems.map((u, i) => `<article class="ui glass reveal" style="--c:${UC[i]};--dl:${-i * 1.2}s">
    <a class="art" href="${ITEM_LINK(u.item.i)}">${pic(u.item.img, 300, u.item.i)}</a>
    <span class="tier">${esc(u.item.tier)}</span>
    <h3><a href="${ITEM_LINK(u.item.i)}">${esc(u.item.i)}</a></h3>
    <blockquote>${esc(u.quote)}</blockquote>
    <ul>${u.fx.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
    <p class="nt">${esc(u.note)}</p>
  </article>`).join("");
  document.querySelectorAll("#ultGrid .reveal").forEach(MH.reveal);

  /* ---------- Catalysts ---------- */
  $("#catInfo").textContent = D.catalystInfo;
  const EL = { Aether: "#c9b6ff", Earth: "#8fd16b", Entropy: "#b06bff", Fire: "#ff7a3d", Order: "#ffd166", Water: "#5ad1ff" };
  $("#book").innerHTML = `<div class="bk">
      <a href="${ITEM_LINK(D.book.i)}" title="${esc(D.book.i)}">${pic(D.book.img, 160, D.book.i)}</a>
      <a href="${ITEM_LINK(D.tome.i)}" title="${esc(D.tome.i)}">${pic(D.tome.img, 160, D.tome.i)}</a>
    </div>
    <div><h3>Balance six elements</h3><p>Draedon gives you the <b>${esc(D.book.i)}</b> at S+1,000. <b>${esc(D.tome.i)}</b> will unlock even stronger Superstitious items.</p>
      <div class="elements">${D.elements.map((e, i) => `<span class="el" style="--c:${EL[e]};--i:${i}"><i></i>${e}</span>`).join("")}</div></div>`;
  const lifes = [...new Set(D.catalysts.map(c => c.lifeN))].sort((a, b) => a - b);
  const st = { life: 0, q: "" };
  $("#lifeChips").innerHTML = `<button class="lc on" data-l="0">All</button>` + lifes.map(l => `<button class="lc" data-l="${l}">S+${l.toLocaleString("en-US")}</button>`).join("");
  $("#lifeChips").addEventListener("click", e => { const b = e.target.closest(".lc"); if (!b) return; st.life = +b.dataset.l; document.querySelectorAll(".lc").forEach(x => x.classList.toggle("on", x === b)); renderCats(); });
  const CC = ["#b06bff", "#ff3b5c", "#5ad1ff", "#ffb347", "#34f5a4", "#ff6bb5"];
  let cio;
  function renderCats() {
    const t = st.q.trim().toLowerCase();
    const list = D.catalysts.filter(c => (!st.life || c.lifeN === st.life) &&
      (!t || (c.n + " " + c.crafts.map(x => x.n + " " + x.type + " " + x.fx).join(" ") + " " + c.req.map(r => r.n).join(" ")).toLowerCase().includes(t)));
    $("#count").innerHTML = `Showing <b>${list.length}</b> of ${D.catalysts.length} Catalysts`;
    $("#catGrid").innerHTML = list.map((c, i) => {
      const cr = c.crafts[0];
      return `<article class="cat glass" style="--c:${CC[D.catalysts.indexOf(c) % CC.length]};--i:${i};--dl:${-i * .6}s">
        <div class="cat-top">${pic(c.img, 100, c.n)}<div><h3>${esc(c.n)}</h3><div class="lf">S+${c.lifeN.toLocaleString("en-US")}+<span>${esc(c.added)}</span></div></div></div>
        ${cr ? `<a class="craft" href="${ITEM_LINK(cr.n)}">${pic(cr.img, 120, cr.n)}<div><small>Crafts · ${esc(cr.type)}</small><b>${esc(cr.n)}</b><p>${esc(cr.fx)}</p></div></a>` : ""}
        <div class="req"><small>Rebirth with these on your base</small><div class="req-row">${c.req.map(r => `<a class="rq" href="${ITEM_LINK(r.n)}" aria-label="${esc(r.n)}">${pic(r.img, 80, r.n)}<span class="nm">${esc(r.n)}</span></a>`).join("")}</div></div>
        ${c.quote ? `<blockquote>“${esc(c.quote)}”</blockquote>` : ""}
      </article>`;
    }).join("");
    if (cio) cio.disconnect();
    cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); cio.unobserve(e.target); } }), { rootMargin: "0px 0px -40px 0px" });
    $("#catGrid").querySelectorAll(".cat").forEach(x => cio.observe(x));
  }
  let qt;
  $("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { st.q = e.target.value; renderCats(); }, 130); });
  renderCats();

  /* ---------- Third ---------- */
  $("#thirdList").innerHTML = D.third.map(t => `<li>${esc(t)}</li>`).join("");

  /* ---------- Back to top ---------- */
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: MH.reduceMotion ? "auto" : "smooth" }));
})();
