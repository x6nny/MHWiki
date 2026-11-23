/* Daily & weekly Tasks + Daily Gifts. From the Miner's Haven Fandom wiki
   ("Task", "Daily Gifts", Labor of Love and Halloween 2026 update notes), CC BY-SA. */
window.MH_TASKS = {
  reward: { daily: 10, weekly: 50 },
  tasks: [
    { id: "regular", verb: "Collect", noun: "Regular Research Crates", unit: "crates", crate: "basic", sub: "Basic Crates, the most common kind on the map", daily: 20, weekly: 100, link: "research-points.html#earn" },
    { id: "golden",  verb: "Collect", noun: "Golden Research Crates",  unit: "crates", crate: "golden", sub: "Bigger, rarer and glowing", daily: 10, weekly: 50, link: "research-points.html#earn" },
    { id: "shadow",  verb: "Collect", noun: "Shadow Research Crates",  unit: "crates", crate: "shadow", sub: "Black, see-through, and only at night", daily: 5, weekly: 25, link: "research-points.html#earn" },
    { id: "crystal", verb: "Collect", noun: "Crystal Research Crates", unit: "crates", crate: "uc", sub: "The purple Unobtainium Crystal Crates", daily: 3, weekly: 15, link: "research-points.html#earn" },
    { id: "diamond", verb: "Collect", noun: "Diamond Research Crates", unit: "crates", crate: "diamond", sub: "Very rare, announced in chat when one spawns", daily: 1, weekly: 3, link: "research-points.html#earn" },
    { id: "any",     verb: "Collect", noun: "Research Crates of any kind", unit: "crates", crate: "any", sub: "Any crate type counts", daily: 25, weekly: 125, link: "research-points.html#earn" },
    { id: "process", verb: "Process", noun: "Ores", unit: "ores", icon: "process", sub: "Ores your furnaces process", daily: 100, weekly: 500, link: "item-index.html" },
    { id: "upgrade", verb: "Upgrade", noun: "Ores", unit: "ores", icon: "upgrade", sub: "Ores your upgraders upgrade", daily: 100, weekly: 500, link: "item-index.html" },
    { id: "rebirth", verb: "Rebirth", noun: "Times", unit: "rebirths", icon: "rebirth", sub: "Rebirth this many times", daily: 10, weekly: 50, link: "rebirth.html" }
  ],
  facts: [
    "Tasks are objectives you complete while playing for uC (Unobtainium Crystals).",
    "There are two kinds: daily and weekly. Each has its own reward.",
    "Every player gets a random set of tasks, so yours may differ from a friend's.",
    "Every daily task pays 10 uC and every weekly task pays 50 uC, whatever the task."
  ],
  history: [
    { date: "1 Jul 2026", name: "Labor of Love [6]", text: "A new Task system is added to the game files, marked as coming in a future patch." },
    { date: "3 Aug 2026", name: "Labor of Love [7]", text: "The Task system goes live." },
    { date: "29 Oct 2026", name: "Halloween 2026", text: "Daily Gifts and Tasks get separate menus, combined with achievements. Finished achievements now show as complete instead of hiding in the Tasks menu." }
  ],
  // uC prices at Spook McDooks / the Box UI (from the Mystery Boxes page)
  boxes: [
    { n: "Regular Box", slug: "regular-box", uc: 15 },
    { n: "Unreal Box", slug: "unreal-box", uc: 40 },
    { n: "Inferno Box", slug: "inferno-box", uc: 50 },
    { n: "Luxury Box", slug: "luxury-box", uc: 80 },
    { n: "Red-Banded Box", slug: "red-banded-box", uc: 100 },
    { n: "Spectral Box", slug: "spectral-box", uc: 200 }
  ],
  gifts: {
    intro: "A free gift every day you log in. It gives copies of a shop item, cash based on how much money you have, a Gift Crate with RP and sometimes Mystery Boxes. You can buy a second daily gift for R$20.",
    reset: "Daily Gifts reset at 8:00 PM New York time ({local} your time), so you can claim one just before the reset and another right after it.",
    streak: [
      { day: 3, box: "Unreal Box", slug: "unreal-box" },
      { day: 5, box: "Inferno Box", slug: "inferno-box" },
      { day: 7, box: "Spectral Box", slug: "spectral-box" }
    ],
    streakNote: "Buying a second Daily Gift, or opening one again after a server restart, doesn't add to your streak. A long streak also improves what Spook McDooks gives you.",
    boosters: [
      { n: "VIP", kind: "Gamepass", text: "A blue VIP gift with better luck, and a chance of a wooden or diamond crate." },
      { n: "Premium Mining", kind: "Gamepass", text: "+10 uC in every Daily Gift." },
      { n: "Executive", kind: "Gamepass", text: "A red Executive Gift with an Executive Crate (a random weapon for one life) and an Inferno Box or Lucky Clover. Up to +6 uC." },
      { n: "Berezaa Games group", kind: "Free", text: "Join the group for +2 uC and a Regular Box in your gift." },
      { n: "Miner's Haven Shirt", kind: "Retired", text: "The 2015 T-shirt adds +1 uC." },
      { n: "Shoddy Crate", kind: "Black Friday 2015", text: "Adds 1 to 3 wooden crates." },
      { n: "Gambler's Dice", kind: "Black Friday 2015", text: "Changes your gift's uC by −3 to +6." },
      { n: "Super Snowflake", kind: "Black Friday 2015", text: "+10 walk speed until you die or leave." },
      { n: "Giant Crate", kind: "Black Friday 2016", text: "A Giant Crate with lots of RP, a guaranteed Mystery Box and a chance of Unreal and Inferno Boxes." },
      { n: "Circus Tent", kind: "Black Friday 2017", text: "A free Megaphone every three days in a row." },
      { n: "Corrupt Pearl", kind: "Black Friday 2017", text: "A Cursed Crate with lots of RP and a chance of a Red-Banded Box." },
      { n: "UY Scuti", kind: "Black Friday 2019", text: "A Blazing Crate: 2.5k RP, an Inferno Box and a chance of a Spectral Box." }
    ]
  }
};
