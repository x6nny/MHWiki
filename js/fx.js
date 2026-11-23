/* =========================================================
   Shared animated text for status effects and ore materials.
   Used by the Item Index to show and link an item's ore effects.
   (Same styles as the Status Effects page; CSS in css/fx.css)
   ========================================================= */
window.MH_FX = (() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MH = { reduceMotion };
  // Accent colour + which text style each effect uses
  const STYLE = {
    "fire": ["#ff7a1a"], "frostbite": ["#8fdcff"], "radioactive": ["#b6ff2e"], "sparkles": ["#ffe58a"], "poison": ["#3ee36b"],
    "smoking": ["#a9b1bd"], "wet": ["#3ba7ff"], "anti-gravity": ["#c58cff"], "fireproof": ["#ff9a5a"],
    "poison-immunity": ["#3ee36b", "immune"], "radioactive-immunity": ["#b6ff2e", "immune"], "frostbite-immunity": ["#8fdcff", "immune"],
    "plague-immunity": ["#c7d36a", "immune"], "hydrophobic": ["#ffcc4d"], "education": ["#4dff88"], "draedon": ["#3d7bff"],
    "void": ["#8b5cff"], "shield": ["#5ad1ff"], "gaia-s-blessing": ["#5ee07a"], "chaotic-fire": ["#39ff6a"],
    "replicator-banned": ["#ff4d6d", "banned"], "teleporter-banned": ["#ff6b3d", "banned"], "don-banned": ["#c8326b", "banned"],
    "nova": ["#ffe58a"], "nova-schro": ["#9ef0ff"], "golden": ["#ffd34d"], "plague": ["#a5b83a"], "swag-factor": ["#ff5ce1"],
    "stasis": ["#6ef0ff"], "eternal-flame": ["#6fb8ff"],
  };
  // Particle recipes: [class, count, extra-setup]
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PARTICLES = {
    "fire": ["ember", 9], "chaotic-fire": ["ember", 12], "eternal-flame": ["ember", 7], "fireproof": ["ember", 6],
    "frostbite": ["flake", 7], "radioactive": ["rad", 8], "sparkles": ["star", 8], "golden": ["star", 6],
    "poison": ["bubble", 7, "drip", 3], "smoking": ["puff", 6], "wet": ["drop", 6], "hydrophobic": ["drop", 6],
    "education": ["tri", 5], "draedon": ["poly", 7], "gaia-s-blessing": ["leaf", 7],
    "poison-immunity": ["hit", 5], "radioactive-immunity": ["hit", 5], "frostbite-immunity": ["hit", 5], "plague-immunity": ["hit", 5],
  };

  /* ---------- Build an animated effect name ---------- */
  function fxName(e) {
    const [color, family] = STYLE[e.slug] || ["#fff"];
    const el = document.createElement("span");
    el.className = `sfx fx-${e.slug}` + (family ? ` fx-${family}` : "") + (e.name.length > 17 ? " xlong" : e.name.length > 12 ? " long" : "");
    el.style.setProperty("--c", color);
    el.setAttribute("aria-label", e.name);
    const letters = [...e.name];
    const mid = (letters.length - 1) / 2;
    const w = document.createElement("span");
    w.className = "w";
    w.setAttribute("aria-hidden", "true");
    letters.forEach((ch, i) => {
      if (ch === " ") { const s = document.createElement("span"); s.className = "sp"; w.appendChild(s); return; }
      const l = document.createElement("span");
      l.className = "l";
      l.textContent = ch;
      l.style.setProperty("--i", i);
      l.style.setProperty("--toc", Math.round((mid - i) * 14)); // distance to centre, for Void
      w.appendChild(l);
    });
    el.appendChild(w);
    if (family === "banned") {
      const st = document.createElement("span"); st.className = "strike"; el.appendChild(st);
      if (e.slug === "replicator-banned") { const g = document.createElement("span"); g.className = "ghost"; g.textContent = e.name; g.setAttribute("aria-hidden", "true"); el.appendChild(g); }
      if (e.slug === "don-banned") { const r = document.createElement("span"); r.className = "pulse-ring"; el.appendChild(r); }
    }
    if (e.slug === "nova-schro") {
      ["g1", "g2"].forEach(c => { const g = document.createElement("span"); g.className = "ghost " + c; g.textContent = e.name; g.setAttribute("aria-hidden", "true"); el.appendChild(g); });
    }
    const recipe = PARTICLES[e.slug];
    if (recipe && !MH.reduceMotion) {
      const layer = document.createElement("span");
      layer.className = "fxp";
      layer.setAttribute("aria-hidden", "true");
      for (let r = 0; r < recipe.length; r += 2) {
        const cls = recipe[r], n = recipe[r + 1];
        for (let k = 0; k < n; k++) {
          const p = document.createElement("i");
          p.className = cls;
          p.style.left = rnd(8, 92) + "%";
          if (["star", "rad", "tri", "poly"].includes(cls)) p.style.top = rnd(5, 85) + "%";
          p.style.animationDelay = (-rnd(0, 3)).toFixed(2) + "s";
          p.style.setProperty("--dx", rnd(-18, 18).toFixed(0) + "px");
          p.style.setProperty("--dy", rnd(-30, 30).toFixed(0) + "px");
          p.style.setProperty("--s", rnd(5, 10).toFixed(0) + "px");
          if (cls === "hit") {
            const a = rnd(0, Math.PI * 2);
            p.style.left = "50%"; p.style.top = "45%";
            p.style.setProperty("--sx", (Math.cos(a) * 60).toFixed(0) + "px");
            p.style.setProperty("--sy", (Math.sin(a) * 30).toFixed(0) + "px");
          }
          layer.appendChild(p);
        }
      }
      el.appendChild(layer);
    }
    return el;
  }

  /* ---------- Status effects and how items describe them ---------- */
  const EFFECTS = [
    { slug: "fireproof", name: "Fireproof", re: /fire[- ]?proof|fire immunity|immun\w* (to|from|against) fire/ },
    { slug: "chaotic-fire", name: "Chaotic Fire", re: /chaotic fire|green fire/ },
    { slug: "eternal-flame", name: "Eternal Flame", re: /eternal flame|blue fire|blue flame/ },
    { slug: "fire", name: "Fire", re: /\b(on fire|ignit(e|es|ed|ing)\b|flaming|flames?\b|ablaze|aflame|burning|fire\b(?! ?(rate|proof|immun|work|s? ?mine|crystal|fly)))/ },
    { slug: "frostbite-immunity", name: "Frostbite Immunity", re: /frostbite immunity|immun\w* (to|from|against) frost/ },
    { slug: "frostbite", name: "Frostbite", re: /frostbite|frozen|freez\w*/ },
    { slug: "radioactive-immunity", name: "Radioactive Immunity", re: /radioactiv\w* immunity|radiation immunity|immun\w* (to|from|against) radi/ },
    { slug: "radioactive", name: "Radioactive", re: /radioactiv\w*|radiation|irradiat\w*/ },
    { slug: "sparkles", name: "Sparkles", re: /sparkl\w*/ },
    { slug: "poison-immunity", name: "Poison Immunity", re: /poison immunity|immun\w* (to|from|against) poison/ },
    { slug: "poison", name: "Poison", re: /poison\w*/ },
    { slug: "smoking", name: "Smoking", re: /smok(ing|e|es|ed)\b/ },
    { slug: "hydrophobic", name: "Hydrophobic", re: /hydrophobic/ },
    { slug: "wet", name: "Wet", re: /\bwet\b|\bsoak\w*/ },
    { slug: "anti-gravity", name: "Anti-Gravity", re: /anti-?gravity/ },
    { slug: "education", name: "Education", re: /educat\w*/ },
    { slug: "void", name: "Void", re: /\bvoided\b|\bvoid (status|effect)/ },
    { slug: "shield", name: "Shield", re: /\bshields?\b/ },
    { slug: "gaia-s-blessing", name: "Gaia's Blessing", re: /gaia/ },
    { slug: "replicator-banned", name: "Replicator Banned", re: /replicator[- ]banned/ },
    { slug: "teleporter-banned", name: "Teleporter Banned", re: /teleporter[- ]banned/ },
    { slug: "don-banned", name: "DON Banned", re: /\bdon[- ]banned/ },
    { slug: "nova-schro", name: "Nova-Schro", re: /schr[oö]/ },
    { slug: "nova", name: "Nova", re: /\bnova (star )?(effect|status)|\bnova-?ed\b/ },
    { slug: "golden", name: "Golden", re: /\b(turns?|makes?) (the )?ores? golden|golden (status|effect)/ },
    { slug: "plague-immunity", name: "Plague Immunity", re: /plague immunity|immun\w* (to|from|against) (the )?plague/ },
    { slug: "plague", name: "Plague", re: /plague/ },
    { slug: "swag-factor", name: "Swag Factor", re: /swag/ },
    { slug: "stasis", name: "Stasis", re: /stasis/ },
  ];
  // An immunity also mentions the base word ("fire immunity"), so drop the base effect
  // when the only mentions of it are inside the immunity phrase.
  const PAIRS = { "fireproof": "fire", "frostbite-immunity": "frostbite", "radioactive-immunity": "radioactive", "poison-immunity": "poison", "plague-immunity": "plague", "chaotic-fire": "fire", "eternal-flame": "fire" };

  // Items the Status Effects page lists as an example (ex) or remover (rm) of an effect
  const KNOWN = {"Portable Flamethrower":{"fire":"ex"},"Freon Sprayer":{"fire":"rm"},"Wild Spore":{"fire":"rm"},"Father of Freon":{"frostbite":"ex"},"Radioactive Refiner":{"radioactive":"ex"},"Angel's Blessing":{"sparkles":"ex"},"Fractured Reality":{"sparkles":"rm"},"The Death Cap":{"sparkles":"rm"},"Soul Blossom":{"sparkles":"rm"},"Chemical Refiner":{"poison":"ex"},"Robotic Enhancer":{"smoking":"ex"},"Maintenance Supporter":{"smoking":"rm"},"Atlantic Monolith":{"wet":"ex"},"Anti-Gravity Device":{"anti-gravity":"ex"},"Gravity Normalizer":{"anti-gravity":"rm"},"Freon Bombarder":{"fireproof":"ex"},"Blazing Annihilator":{"fireproof":"rm"},"Havium Mine":{"poison-immunity":"ex","radioactive-immunity":"ex","frostbite-immunity":"ex"},"Ghosdeeri's Antidote":{"plague-immunity":"ex","plague":"rm"},"Honeycomb Cake":{"hydrophobic":"ex"},"Skydance Serenade":{"hydrophobic":"rm"},"Ore Illuminator":{"education":"ex"},"Draedon's Gauntlet":{"draedon":"ex"},"Void Drive":{"void":"ex","don-banned":"ex"},"Illusions of Void":{"shield":"ex"},"Garden of Gaia":{"gaia-s-blessing":"ex"},"The Chaosrealm":{"chaotic-fire":"ex"},"Methuselah's Mask":{"replicator-banned":"ex"},"Leggendary Black Hole":{"teleporter-banned":"ex"},"Nova Star":{"nova":"ex"},"Nova Evaluator":{"nova-schro":"ex"},"King Gold Mine":{"golden":"ex"},"Bubonic Plague":{"plague":"ex"},"Lucky Hat":{"swag-factor":"ex"},"Eggscream Refiner":{"stasis":"ex"},"Solar Apocalypse":{"eternal-flame":"ex"}};
  // Items the Status Effects page lists as the example for an ore material
  const KNOWN_MAT = {"Behemoth Snowflake": "Ice", "Vaporwave Vibe Visualizer": "Neon", "Molten Forge": "Diamond Plate", "The Death Cap": "Pebble", "Helium Blaster": "Forcefield", "Shiny Red Upgrader": "Glass", "Witch's Cauldron": "Granite", "Doom Incarnate": "CrackedLava", "Chocolate Cupcake": "Sand"};
  // Mentions that aren't about ore (e.g. a player shield)
  const EXCLUDE = { "Shield Generator": ["shield"] };
  const NAME = Object.fromEntries(EFFECTS.map(e => [e.slug, e.name]));

  // What the item does with the effect, judged from the line that mentions it
  function role(slug, line) {
    if (/immunity|fireproof|hydrophobic/.test(slug)) return "Grants";
    if (/except/.test(line)) return "Mentions";
    if (slug === "shield") return /remov|lose|strip|destroys? (all )?shields/.test(line) ? "Removes" : "Applies";
    if (/remov|extinguish|clear|cure|cleans|revert|reset|negat|immun|protect|prevent|cannot be|can't be|won't/.test(line)) return "Removes";
    if (/requir|needs?\b|only (accepts|upgrades|works)|must be|if (the )?ores? (is|are|has)|bonus|instead|for (flaming|frozen|radioactive|wet|poisoned|sparkling)|(flaming|frozen|radioactive|wet|poisoned|sparkling) ores? (are|is|get)|processes (normal|flaming|radioactive)/.test(line)) return "Uses";
    return "Applies";
  }
  function detect(text, itemName) {
    const lines = String(text || "").replace(/⟦[^⟧]*⟧/g, " ").toLowerCase().split(/\n|•/);
    const found = new Map();
    for (const e of EFFECTS) {
      for (let k = 0; k < lines.length; k++) {
        const g = new RegExp(e.re.source, "g");
        if (!g.test(lines[k])) continue;
        if (!found.has(e.slug)) found.set(e.slug, role(e.slug, lines[k]));
        // blank out what matched so a later, broader rule doesn't count it again
        lines[k] = lines[k].replace(new RegExp(e.re.source, "g"), m => " ".repeat(m.length));
      }
    }
    (EXCLUDE[itemName] || []).forEach(sl => found.delete(sl));
    const known = KNOWN[itemName] || {};
    for (const [slug, how] of Object.entries(known)) {
      if (!found.has(slug) || how === "rm") found.set(slug, how === "rm" ? "Removes" : found.get(slug) || "Applies");
    }
    return [...found].map(([slug, r]) => ({ slug, name: NAME[slug] || slug, role: r }));
  }

  /* ---------- Ore materials ---------- */
  // On the Status Effects page (linked to their card) plus other common materials (linked to the section)
  const MATERIALS = [
    ["Diamond Plate", "diamond-plate", true], ["Corroded Metal", "corroded-metal"], ["Smooth Plastic", "smooth-plastic"],
    ["Cracked Lava", "crackedlava", true], ["CrackedLava", "crackedlava", true], ["Forcefield", "forcefield", true],
    ["Neon", "neon", true], ["Glass", "glass", true], ["Granite", "granite", true], ["Sandstone", "sandstone"], ["Sand", "sand", true],
    ["Pebble", "pebble", true], ["Ice", "ice", true], ["Foil", "foil"], ["Plastic", "plastic"], ["Slate", "slate"], ["Concrete", "concrete"],
    ["Marble", "marble"], ["Fabric", "fabric"], ["Metal", "metal"], ["Cobblestone", "cobblestone"], ["Grass", "grass"],
  ];
  const matRe = new RegExp("\\b(" + MATERIALS.map(m => m[0]).join("|") + ")\\b", "gi");
  const matBy = Object.fromEntries(MATERIALS.map(m => [m[0].toLowerCase(), m]));

  return { STYLE, fxName, detect, EFFECTS, MATERIALS, matRe, matBy, KNOWN_MAT, reduceMotion };
})();
