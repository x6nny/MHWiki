/* =========================================================
   Data loader
   Every page's data lives in the data/ folder, one JSON file per category
   (data/Items.json, data/MaskedMan.json, ...). Edit those files to change
   what the site shows. Images live in assets/wiki/.

   Usage on a page:
     <script src="../js/data.js?v=N" data-load="Items:MH_ITEMS, Tiers:MH_TIERS"
             data-run="fx.js, item-index.js"></script>
   data-load  JSON file name (without .json) : the global it is stored in
   data-run   page scripts (in js/) to run once the data has loaded, in order
   ========================================================= */
(() => {
  const me = document.currentScript;
  const ROOT = new URL("../", me.src).href;            // site root (this file is in js/)
  const ver = (me.src.match(/[?&]v=([^&#]+)/) || [])[1];
  const q = ver ? "?v=" + ver : "";

  window.MH_ROOT = ROOT;
  // Turn a path from the data files (e.g. "assets/wiki/lunar-refiner.webp") into a usable URL.
  window.MH_SRC = p => !p ? "" : /^(?:[a-z]+:|\/|\.\.?\/)/i.test(p) ? p : ROOT + p;

  /* Images not downloaded yet: fall back to the wiki copy listed in data/ImageSources.json.
     Run tools/download-images.bat to save every image into assets/wiki. */
  let sources = null;
  const loadSources = () => sources || (sources = fetch(ROOT + "data/ImageSources.json" + q).then(r => r.ok ? r.json() : {}).catch(() => ({})));
  window.addEventListener("error", e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.wikiFallback) return;
    const at = img.src.indexOf("/assets/wiki/");
    if (at < 0) return;
    const key = decodeURIComponent(img.src.slice(at + 1).split(/[?#]/)[0]);
    e.stopImmediatePropagation(); e.stopPropagation(); // keep the image's own onerror until the fallback has been tried
    img.dataset.wikiFallback = "1";
    loadSources().then(map => {
      if (map[key]) { img.referrerPolicy = "no-referrer"; img.src = map[key]; }
      else img.dispatchEvent(new Event("error"));
    });
  }, true);

  const pairs = (me.dataset.load || "").split(",").map(s => s.trim()).filter(Boolean).map(s => s.split(":").map(x => x.trim()));
  const run = (me.dataset.run || "").split(",").map(s => s.trim()).filter(Boolean);

  const fail = err => {
    console.error(err);
    const box = document.createElement("div");
    box.className = "data-error glass";
    box.innerHTML = `<b>Couldn't load the wiki data.</b><span>${location.protocol === "file:"
      ? "Browsers block loading data files from a page opened straight from your computer. Open the site through a web server instead (for example the live GitHub Pages site, or run <code>python -m http.server</code> in the project folder and visit <code>http://localhost:8000</code>)."
      : /JSON error/.test(err.message) ? `${String(err.message).replace(/[<>&]/g, "")}. Check that file for a missing comma, quote or bracket.` : "Please refresh the page. If it keeps happening, a file in the data folder may be missing."}</span>`;
    box.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:999;max-width:min(560px,92vw);padding:16px 20px;border-radius:16px;display:flex;flex-direction:column;gap:6px;font-size:14px;line-height:1.45;background:rgba(40,12,20,.92);border:1px solid rgba(255,90,120,.5);color:#fff;box-shadow:0 20px 50px -20px #000";
    document.body.appendChild(box);
  };

  const getJSON = ([file, name]) => fetch(ROOT + "data/" + file + ".json" + q)
    .then(r => { if (!r.ok) throw new Error(`data/${file}.json: HTTP ${r.status}`); return r.text(); })
    .then(t => { try { window[name || file] = JSON.parse(t); } catch (err) { throw new Error(`data/${file}.json has a JSON error: ${err.message}`); } });

  window.MH_DATA = Promise.all(pairs.map(getJSON)).then(() => {
    run.forEach(src => {
      const s = document.createElement("script");
      s.src = new URL(src, me.src).href.split("?")[0] + q;
      s.async = false; // run in the order listed
      document.body.appendChild(s);
    });
  }).catch(fail);
})();
