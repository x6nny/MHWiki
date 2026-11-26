# Setting up accounts with Google Sheets

This turns on:

- **Sign in / Create account** in the sidebar (username + password)
- **Synced trackers**: Shiny Checklist, Rebirth Tracker, Daily Tasks, Daily Gift streak and Settings follow people between devices
- **Comments** at the bottom of every page and inside each item in the Item Index
- **Admin area** (`pages/admin.html`): edit the files in `data/` and publish them straight to GitHub, reset passwords, unban people

Everything is stored in **your own private Google Sheet**. Nobody else can open the sheet; the website only talks to a small script inside it.

Until you paste the web app address into `js/account-config.js` (step 4), the site works exactly as before.

It takes about 15 minutes and it's free.

---

## 1. Make the sheet

1. Go to **https://sheets.new** (signed in to the Google account that should own everything).
2. Name it something like `HavenWiki accounts`.
3. **Don't share it** with anyone and **don't use File → Share → Publish to web.** The site doesn't need either.

## 2. Add the script

1. In the sheet, open **Extensions → Apps Script**.
2. Delete the sample code, then copy everything from `google-sheets/Code.gs` in this folder and paste it in.
3. Click **Save** (the disk icon). Name the project `HavenWiki`.
4. In the function dropdown at the top, pick **setupSheet**, then click **Run**.
5. Google asks for permission:
   - Click **Review permissions** and choose your account.
   - You'll see "Google hasn't verified this app." That's normal for your own scripts. Click **Advanced**, then **Go to HavenWiki (unsafe)**, then **Allow**.
6. Back in the sheet you'll now have four tabs: **Users**, **Sessions**, **Trackers** and **Comments**.
   - Reload the sheet and a **HavenWiki** menu appears at the top. You'll use it later.

## 3. Publish the script as a web app

1. In Apps Script, click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set:
   - **Description**: `HavenWiki`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**
4. Click **Deploy**, then copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy.../exec`.

> "Anyone" means anyone can *talk to the script*, the same way anyone can load your website. They still can't open the sheet. The script only hands back what it's written to: someone's own trackers, public comments, and so on.

## 4. Turn it on in the site

Open `js/account-config.js` and paste the address between the quotes:

```js
api: "https://script.google.com/macros/s/AKfy.../exec",
```

Commit and push. Once GitHub Pages updates (about a minute), the sidebar shows **Sign in**.

## 5. Make yourself admin

1. On the live site, click **Sign in → Create an account** and make the account **rrotss**.
2. Open the sheet's **Users** tab. Tick the **admin** box on the rrotss row.
3. Refresh the site. The sidebar account menu now has **Admin area**, and an **Admin** badge shows on your comments.

To make anyone else an admin later, tick their **admin** box too. Only you (the sheet's owner) can do this.

## 6. Let the admin area publish to GitHub

The admin area saves edits as commits to the repo, so it needs a GitHub token that can only touch this one repo.

1. GitHub → your profile picture → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name: `HavenWiki admin`. Expiration: up to a year (set a reminder to renew it).
3. **Repository access → Only select repositories → `x6nny/MHWiki`**.
4. **Permissions → Repository permissions → Contents: Read and write.** Leave everything else at "No access".
5. Generate it and copy the token.
6. In the sheet: **HavenWiki → Set the GitHub token…** and paste it.

The token is saved in the script's private settings, not in the sheet and never on the website.

If GitHub Pages publishes from a branch other than `main`, open Apps Script → **Project Settings → Script Properties** and add `GITHUB_BRANCH` with your branch name.

---

## Everyday admin jobs

| Job | How |
|---|---|
| Someone forgot their password | Admin area → **Users** → type their username and a new password → **Reset password**. Or in the sheet: **HavenWiki → Reset a user's password…**. Give them the new password (in Discord, say). They can change it from their account menu. |
| Remove a comment | On the site, click **Remove** next to it (admins see this on every comment). |
| Stop someone commenting | Click **Ban** next to one of their comments. This removes all their comments. Undo it with **Unban** in the admin area's Users box. |
| Make someone an admin | Tick their **admin** box in the Users tab. |
| Delete an account | Users can do it themselves from their account menu. Or delete their row in the Users tab. |
| Sign everyone out | **HavenWiki → Sign everyone out** |

## Updating the script later

If I send you a new `Code.gs`:

1. Paste it over the old code in Apps Script and click **Save**.
2. Go to **Deploy → Manage deployments**, click the pencil, set **Version** to **New version**, and click **Deploy**.

This keeps the same web app address, so you don't need to change the site.

## Good to know

- **Passwords** are scrambled with a secret key before they're saved. Even you can't read them in the sheet. The secret key lives in the script's private settings (`PEPPER` in Script Properties).
  - **Don't delete it, and don't create a new Apps Script project.** If you do, every password stops working and everyone would need a reset.
- **Don't edit** the `password_hash`, `salt` or `iterations` columns, or the Sessions tab, by hand.
- **Speed**: each sign-in, save or comment takes about 1–2 seconds. That's how fast Google's script service answers.
- **Capacity**: Google's free limits are plenty for a community wiki, and nothing pauses or expires.
- **Protection built in**:
  - 8 wrong passwords lock that username for 15 minutes.
  - Up to 60 new accounts an hour.
  - 3 comments a minute per person.
  - Comments are limited to 1,000 characters.

## What each file is

| File | What it does |
|---|---|
| `google-sheets/Code.gs` | The script that lives in your sheet (paste it into Apps Script) |
| `js/account-config.js` | The web app address. Empty = accounts off. |
| `js/account.js` | Sign in/out, the sidebar account button, tracker syncing |
| `js/comments.js` | Comment threads on pages and items |
| `js/admin.js`, `pages/admin.html`, `css/admin.css` | The admin area |
