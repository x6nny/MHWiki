/* =========================================================
   Site settings (theme, motion, background, glass, currency icons)
   Loaded in <head> on every page so the saved look applies before the page draws.
   The Settings page (pages/settings.html) changes these with MH_SETTINGS.set().
   ========================================================= */
(() => {
  const KEY = "mh-settings-v1";
  const DEFAULTS = { theme: "haven", motion: "full", bg: "animated", blur: true, cur: true };
  const THEMES = ["haven", "midnight", "inferno", "spectral", "toxic", "frost", "gilded", "oled"];
  let S = { ...DEFAULTS };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  if (!THEMES.includes(S.theme)) S.theme = DEFAULTS.theme;

  const html = document.documentElement;
  const osReduce = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function apply() {
    if (S.theme === "haven") html.removeAttribute("data-theme"); else html.dataset.theme = S.theme;
    html.classList.toggle("calm", S.motion === "reduced");
    html.classList.toggle("no-motion", S.motion === "off");
    html.classList.toggle("bg-still", S.bg === "still");
    html.classList.toggle("bg-plain", S.bg === "plain");
    html.classList.toggle("no-blur", !S.blur);
    html.classList.toggle("no-cur", !S.cur);
  }
  apply();
  // height of the phone top bar (0 on desktop, where the menu is a sidebar)
  window.MH_STICK = () => parseFloat(getComputedStyle(html).getPropertyValue("--stick")) || 0;
  // sidebar shrunk to icons (saved by js/sidebar.js)
  try { if ((JSON.parse(localStorage.getItem("mh-sidebar-v1") || "{}")).mini) html.classList.add("sb-mini"); } catch (e) {}

  const changed = () => window.dispatchEvent(new CustomEvent("mh-settings", { detail: { ...S } }));
  window.MH_SETTINGS = {
    KEY, DEFAULTS, THEMES,
    get: () => ({ ...S }),
    set(patch) {
      S = { ...S, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
      apply(); changed();
    },
    reset() {
      S = { ...DEFAULTS };
      try { localStorage.removeItem(KEY); } catch (e) {}
      apply(); changed();
    },
    // true when animations should be skipped (setting or the device's reduce-motion option)
    reduceMotion: () => S.motion !== "full" || osReduce(),
    stillBackground: () => S.bg !== "animated" || S.motion !== "full" || osReduce(),
  };
  // keep other open tabs in step
  window.addEventListener("storage", e => {
    if (e.key !== KEY) return;
    S = { ...DEFAULTS };
    try { Object.assign(S, JSON.parse(e.newValue || "{}")); } catch (er) {}
    apply(); changed();
  });
})();
