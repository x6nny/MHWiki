# Site data

Everything the wiki shows comes from the JSON files in this folder, one file per category.
Edit a file, save it, and the page that uses it shows the change on the next refresh.
Nothing is loaded from the Fandom wiki while the site runs.

| File | Used by | What's in it |
| --- | --- | --- |
| `Items.json` | Item Index | Every item: name (`n`), tier, type, overview, stats (`f`), image (`img`) and image variants (`v`) |
| `Tiers.json` | Item Index | Tier colours and order |
| `Shinies.json` | Shiny Checklist | Items with shiny variants, each variant's name, kind (`S` Shiny / `L` Limited) and event |
| `MaskedMan.json` | NPCs | The Masked Man's stock: item (`n`), tab (`g`), full price (`p`) and season (`s`) |
| `NPCs.json` | NPCs | Characters, where and when to find them, descriptions |
| `Codes.json` | Codes | Codes, their rewards and the redeem rules |
| `Crafting.json` | Crafting | Enchanted and Superstitious recipes and the forge item pool |
| `Events.json` | Events | Event series, each year's event and its items |
| `MysteryBoxes.json` | Mystery Boxes | Boxes, odds, contents and Lucky Clovers |
| `Rebirth.json` | Rebirth, Rebirth Tracker | Reborn items, rebirth prices and life skipping |
| `ResearchPoints.json` | Research Points | RP crates, furnaces, mines and what RP is used for |
| `Sacrifice.json` | Sacrifice | Each sacrifice, what you keep and lose, and the catalysts |
| `ShardsOfLife.json` | Shards of Life | Where shards come from, the Reborn Shop, platforms and Shard Park |
| `ShardsOfLifeItems.json` | Shards of Life | Reborn, Enchanted and platform items bought with shards |
| `StatusEffects.json` | Status Effects | Ore effects, how they react and ore materials |
| `CashSuffixes.json` | Cash Suffixes, Rebirth | Money suffixes, cash milestones and the cash cap |
| `DailyTasks.json` | Daily Tasks | Daily and weekly tasks, rewards and Daily Gifts |
| `UserTracker.json` | User Tracker | Badge list, Eggxotic items, staff snapshot and item creators |
| `UpdateLog.json` | Update Log | Every update's patch notes |
| `Gamepasses.json` | Gamepasses | Gamepasses, prices and perks |
| `CCUHistory.json` | Game Tracker | Player count history (from Rolimons), packed to keep it small |
| `ImageSources.json` | Image downloader | Where each picture in `assets/wiki` came from on the wiki |

## Images

Pictures are stored in `assets/wiki/` and referenced from the data as paths like
`"assets/wiki/lunar-refiner.webp"`. To use a new picture, put the file in `assets/wiki/`
(or anywhere in `assets/`) and write its path in the data. A full `https://` address also works.

Double-click `tools/download-images.bat` (Windows) to download any picture listed in
`ImageSources.json` that isn't saved yet. Until a picture is saved, the site shows the wiki's copy.

## Editing tips

* JSON needs double quotes around names and text, and a comma between entries but not after the last one.
* If a page shows "Couldn't load the wiki data", the message names the file with the mistake.
* Opening a page straight from your computer (a `file://` address) can't load the data. Use the live
  site, or run `python -m http.server` in the project folder and open `http://localhost:8000`.
