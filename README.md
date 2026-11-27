# HavenWiki: a Miner's Haven wiki

A fast, modern wiki for the Roblox game **[Miner's Haven](https://www.roblox.com/games/258258996)**. It has every item, rebirth, event and code, plus calculators and trackers that save your progress.

**🌐 Live site: [x6nny.github.io/MHWiki](https://x6nny.github.io/MHWiki/)** · **💬 [Join the Discord](https://discord.gg/minershaven)**

It's a plain static site: HTML, CSS and JavaScript with no build step and no framework. All the game data is kept in JSON files in this repo, so the site never depends on another wiki staying online.

---

## What's on the site

### Info
| Page | What it covers |
| --- | --- |
| **Item Index** | All 1,400+ droppers, upgraders, furnaces and utilities, with search, filters, stats and image variants. Every item has its own comment thread. |
| **Sacrifice** | Ultimate and Second Sacrifice, what you keep and lose, escrow and catalysts. |
| **Crafting** | Enchanted and Superstitious recipes and a forge planner. |
| **Rebirth** | New lives, Reborn items, rebirth prices and life skipping. |
| **Research Points** | RP crates, furnaces, tier unlocks and every blueprint. |
| **Status Effects** | Fire, frostbite, radioactive, poison and the rest, and how they react with each other. |
| **Cash Suffixes** | Every suffix from k to UNCENT, with a converter. |
| **Codes** | Active codes and what they give. |
| **NPCs** | The Masked Man (with his stock), the Craftsman, Draedon and others. |
| **Mystery Boxes** | Box types, odds, contents and Lucky Clovers. |
| **Events** | Every seasonal event since 2015 and its items. |

### Calculators
| Page | What it does |
| --- | --- |
| **Rebirth Tracker** | ETA to your life goal, a grind planner and a milestone graph. |
| **Shards of Life** | Life-skipping costs, the Reborn Shop and Enchanted prices. |
| **MPU Calculator** | Multiplier per unit for an upgrader setup: `multiplier^(1/length) = MPU`. Pick several upgraders, or mines with special upgrades, and set your own length. |
| **Daily Tasks** | Daily and weekly tasks, uC rewards and a Daily Gift streak tracker. Resets at 00:00 UTC. |

### Inventory
| Page | What it does |
| --- | --- |
| **Shiny Checklist** | Tick off every Shiny and Limited Shiny you own (311 variants across 250 items). |
| **Gamepasses** | Every Robux pass, its price and its perks. |

### Stats
| Page | What it does |
| --- | --- |
| **Update Log** | Patch notes for every update, newest first. |
| **Game Tracker** | Live player count and CCU history going back to 2019. |
| **User Tracker** | Look up any Roblox player's Miner's Haven badges, Eggxotic eggs and staff roles. |
| **Profiles** | Look up wiki accounts to see their picture, bio, shiny progress, current rebirth and daily streak. |

Plus a **Settings** page for themes, animations, text and number display, and managing what's saved in your browser, and a search on the home page that finds any section.

---

## Accounts (optional)

People can create a wiki account with a username and password. With an account:

- **Trackers sync between devices.** This covers the Shiny Checklist, Rebirth Tracker, Daily Tasks, Daily Gift streak and Settings.
- **Comments** work at the bottom of every page and on each item in the Item Index.
- **Profiles** show other players your picture, bio and banner colour along with your shiny progress, rebirth and streak. Pick a picture by uploading one (it's cropped and shrunk to 128×128 in your browser) or by choosing any wiki item. You can hide your profile from the account menu.
- **Linking a Roblox account** shows it on your profile with a verified tick and a link to its badges in the User Tracker. It's only for show, not for signing in. To prove the account is theirs, the player pastes a short word code (e.g. `haven lava otter prism comet`) into their Roblox profile's About section. The Apps Script reads the profile from Roblox and links it when the code is there. Each Roblox account can only be linked to one wiki account.
- **Admins** get an admin area where they can edit the wiki's data files and publish the changes straight to this repo, reset passwords, unban people and remove profile pictures or bios that break the rules.

Accounts are stored in a **private Google Sheet**. The sheet is never shared or published. The site only talks to a small Apps Script web app inside it (`google-sheets/Code.gs`). Passwords are salted and hashed with PBKDF2 plus a secret pepper, so even the sheet's owner can't read them. The script also has rate limits for sign-in attempts, new accounts and comments.

If `api` in `js/account-config.js` is left empty, the whole account system is switched off and the site works normally, with trackers saved only in the browser.

<details>
<summary><b>Setting up accounts</b></summary>

1. **Make the sheet.** Go to [sheets.new](https://sheets.new) and name it (e.g. `HavenWiki accounts`). Don't share it and don't publish it to the web.
2. **Add the script.**
   - Open **Extensions → Apps Script** and paste in everything from `google-sheets/Code.gs`.
   - Save, pick **setupSheet** in the function menu and click **Run**.
   - Allow the permissions. On the "hasn't verified this app" screen, click **Advanced → Go to HavenWiki**.
   - This creates the **Users**, **Sessions**, **Trackers**, **Comments** and **Profiles** tabs and a **HavenWiki** menu.
3. **Publish it.**
   - Go to **Deploy → New deployment → Web app**.
   - Set **Execute as: Me** and **Who has access: Anyone**.
   - Copy the `…/exec` URL.
   - "Anyone" only lets people talk to the script, the same way anyone can load the website. Nobody can open the sheet.
4. **Turn it on.** Paste the URL into `js/account-config.js` as `api: "https://script.google.com/macros/s/…/exec"`, then commit and push.
5. **Make an admin.** Create the account on the live site, then tick its **admin** box in the Users tab.
6. **Let the admin area publish to GitHub.**
   - Create a fine-grained personal access token that only covers this repo, with **Contents: Read and write**.
   - Paste it in the sheet via **HavenWiki → Set the GitHub token…**.
   - The token is kept in the script's private properties and never reaches the website.
   - If Pages publishes from a branch other than `main`, add a `GITHUB_BRANCH` script property.

**Updating the script:**
1. Paste the new `Code.gs` and save.
2. Go to **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.

The URL stays the same.

**Don't** delete the `PEPPER` script property or move to a new Apps Script project. If you do, every existing password stops working.

</details>

---

## Editing the wiki

Everything the site shows comes from the JSON files in [`data/`](data/), one file per section. Edit a file, push it, and the page updates. [`data/README.md`](data/README.md) lists what each file holds and which page uses it.

- **Images** live in `assets/`. Item pictures live in `assets/wiki/` and are referenced by path, e.g. `"assets/wiki/lunar-refiner.webp"`.
- **Missing images:** run `tools/download-images.bat` on Windows to fetch any picture listed in `data/ImageSources.json` that isn't saved yet. Until a picture is saved, the site falls back to the wiki's copy.
- **Without Git:** admins can edit the data files from the site's admin area.
- **Checking JSON:** JSON needs double quotes and no trailing commas. If a page says *"Couldn't load the wiki data"*, the message names the file that has the mistake.

### Running it locally

Pages load their data with `fetch`, so opening the HTML files directly (`file://`) won't work. Serve the folder instead:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

### Updating CSS or JS

Stylesheets and scripts are linked with a version number (e.g. `style.css?v=56`). When you change one, bump its number in the pages that load it so browsers fetch the new file instead of an old cached copy.

---

## Automation

| Workflow | What it does |
| --- | --- |
| `.github/workflows/static.yml` | Deploys the site to GitHub Pages on every push to `main`. |
| `.github/workflows/track-ccu.yml` | Every 15 minutes, records Miner's Haven's player count, visits, favorites and votes into `ccu.json` on a separate `data` branch, which the Game Tracker reads. Points are kept for 14 days, then thinned to hourly, then to every 6 hours after a year. Older history comes from Rolimons (`data/CCUHistory.json`). |

---

## Project layout

```
index.html              Home page and section search
pages/                  One HTML page per section, plus admin.html
css/                    style.css (shared glass UI) + one stylesheet per page
js/
  data.js               Loads a page's JSON and then runs its script
  common.js             Shared helpers (toasts, count-ups, daily reset, …)
  main.js               Home page and section list
  account.js            Sign-in, tracker sync and the account menu
  account-config.js     Apps Script URL (empty = accounts off)
  comments.js           Comment threads
  <page>.js             Each page's own script
data/                   All wiki content as JSON (see data/README.md)
assets/                 Icons, item pictures and other images
google-sheets/Code.gs   The Apps Script backend for accounts
tools/                  Image downloader scripts
.github/workflows/      Pages deploy and player-count tracker
```

### External services
- **Roblox APIs via [RoProxy](https://roproxy.com):** the User Tracker uses it for live player lookups and badge ownership. Badge results are saved in the visitor's browser, so later lookups only ask Roblox about badges that failed or are new.
- **Google Apps Script:** accounts, comments and profiles (optional). It also reads Roblox profiles (users.roblox.com, with RoProxy as a backup) to check Roblox link codes.
- **Rolimons:** historical player counts.

---

## Credits

- Game content adapted from the **[Miner's Haven Fandom wiki](https://minershaven.fandom.com/wiki/Welcome_To_The_Miner%27s_Haven_Wikia!)** and its contributors.
- Miner's Haven is made by its developers on Roblox. This is a fan-made wiki and isn't affiliated with Roblox Corporation or the game's developers.
