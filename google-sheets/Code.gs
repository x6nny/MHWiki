/* =====================================================================
   HavenWiki accounts — Google Apps Script backend
   ---------------------------------------------------------------------
   Lives inside the private Google Sheet (Extensions > Apps Script) and is
   deployed as a web app: "Execute as: Me", "Who has access: Anyone".
   The sheet itself is never shared; only this script reads/writes it.

   Tabs it uses (created by "HavenWiki > Set up the sheet"):
     Users     accounts (passwords are scrambled, never stored as typed)
     Sessions  sign-ins (only a scrambled copy of each sign-in key)
     Trackers  synced Shiny Checklist / Rebirth Tracker / Daily Tasks / gift streak / settings
     Comments  page and item comments

   Admins: tick the "admin" box next to a user in the Users tab.
   See GOOGLE-SHEETS-SETUP.md for the full setup.
   ===================================================================== */

var CFG = {
  SESSION_DAYS: 30,
  ITERATIONS: 2500,              // password scrambling rounds (stored per user, so it can be raised later)
  KEYS: ['mh-shiny-checklist-v1', 'mh-rebirth-tracker-v1', 'mh-task-tracker-v1', 'mh-gift-streak-v1', 'mh-settings-v1'],
  TRACKER_MAX: 400000,           // characters per tracker
  CHUNK: 40000,                  // a sheet cell holds 50,000 characters; long trackers spread over several cells
  COMMENT_MAX: 1000,
  COMMENTS_PER_MINUTE: 3,
  LOGIN_FAILS: 8,                // wrong passwords in a row before a 15 minute lock
  SIGNUPS_PER_HOUR: 60,
  BIO_MAX: 200,                  // characters in a profile bio
  BIO_LINES: 6,
  AVATAR_MAX: 40000,             // an uploaded picture is resized in the browser first; this caps what's stored
  PROFILE_EDITS_PER_HOUR: 40,
  ROBLOX_LOOKUPS_PER_HOUR: 15,    // "Link" presses (each one asks Roblox who the username is)
  ROBLOX_CHECKS_PER_HOUR: 30,     // "Verify" presses
  ROBLOX_CODE_MINUTES: 30,        // how long a verification code stays valid
  BANNERS: ['emerald', 'ocean', 'violet', 'sunset', 'rose', 'gold', 'ice', 'mono'],
  GITHUB_REPO: 'x6nny/MHWiki',
  GITHUB_BRANCH: 'main',
};

var TABS = {
  Users:    ['id', 'username', 'username_lower', 'password_hash', 'salt', 'iterations', 'admin', 'banned', 'created_at', 'last_login', 'profile_hidden'],
  Sessions: ['token_hash', 'user_id', 'created_at', 'expires_at'],
  Trackers: ['user_id', 'key', 'updated_at', 'value'],
  Comments: ['id', 'thread', 'user_id', 'author', 'body', 'created_at'],
  Profiles: ['user_id', 'bio', 'avatar', 'banner', 'updated_at', 'roblox_id', 'roblox_name', 'roblox_linked_at'],
};
// Text written by users is stored with a one-letter prefix so Google Sheets never
// treats it as a formula, number or date. It's removed again when read.
var TXT = 't';

/* ============================== web app ============================== */

function doGet() {
  return json_({ ok: true, service: 'HavenWiki accounts', time: Date.now() });
}

function doPost(e) {
  var req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'Bad request.' }); }
  try {
    var fn = ACTIONS[req.action];
    if (!fn) return json_({ ok: false, error: 'Unknown action.' });
    var out = fn(req) || {};
    out.ok = true;
    return json_(out);
  } catch (err) {
    var msg = err && err.userMessage ? err.userMessage : 'Something went wrong. Please try again.';
    if (!(err && err.userMessage)) console.error(err && err.stack || err);
    return json_({ ok: false, error: msg, code: err && err.code || null });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function fail_(msg, code) { var e = new Error(msg); e.userMessage = msg; e.code = code || null; throw e; }

var ACTIONS = {
  register: register_,
  login: login_,
  logout: logout_,
  me: function (r) { var u = auth_(r); return { user: withLook_(publicUser_(u)) }; },
  changePassword: changePassword_,
  deleteAccount: deleteAccount_,

  'trackers.get': trackersGet_,
  'trackers.put': trackersPut_,
  'trackers.delete': trackersDelete_,

  'profiles.search': profilesSearch_,
  'profiles.get': profilesGet_,
  'profiles.visibility': profilesVisibility_,
  'profiles.update': profilesUpdate_,
  'roblox.start': robloxStart_,
  'roblox.verify': robloxVerify_,
  'roblox.unlink': robloxUnlink_,

  'comments.list': commentsList_,
  'comments.add': commentsAdd_,
  'comments.delete': commentsDelete_,

  'admin.ban': adminBan_,
  'admin.unban': adminUnban_,
  'admin.resetPassword': adminResetPassword_,
  'admin.clearProfile': adminClearProfile_,
  'admin.files': adminFiles_,
  'admin.read': adminRead_,
  'admin.save': adminSave_,
};

/* ============================== sheet helpers ============================== */

function ss_() {
  var s = SpreadsheetApp.getActiveSpreadsheet();
  if (s) return s;
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');   // saved by setupSheet()
  if (!id) fail_('The sheet isn\'t set up yet. Run setupSheet in Apps Script first.');
  return SpreadsheetApp.openById(id);
}
function tab_(name) {
  var s = ss_().getSheetByName(name);
  if (!s) s = makeTab_(name);
  return s;
}
function makeTab_(name) {
  var s;
  try { s = ss_().insertSheet(name); }
  catch (e) { s = ss_().getSheetByName(name); if (s) return s; throw e; }   // another request made it a moment ago
  var head = TABS[name];
  s.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
  s.setFrozenRows(1);
  if (name === 'Users') s.getRange('B:C').setNumberFormat('@');   // usernames always stay plain text
  return s;
}
// All data rows as arrays (row 2 onwards). Each row gets its sheet row number in ._r
function rows_(name) {
  var s = tab_(name), n = s.getLastRow(), w = Math.max(s.getLastColumn(), TABS[name].length);
  if (n < 2) return [];
  var v = s.getRange(2, 1, n - 1, w).getValues();
  for (var i = 0; i < v.length; i++) v[i]._r = i + 2;
  return v;
}
function writeRow_(name, rowNum, values) {
  var s = tab_(name), w = s.getLastColumn();
  s.getRange(rowNum, 1, 1, values.length).setValues([values]);
  if (w > values.length) s.getRange(rowNum, values.length + 1, 1, w - values.length).clearContent();
}
function appendRow_(name, values) {
  var s = tab_(name), r = Math.max(s.getLastRow(), 1) + 1;
  s.getRange(r, 1, 1, values.length).setValues([values]);
  return r;
}
function deleteRows_(name, rowNums) {
  var s = tab_(name);
  rowNums.sort(function (a, b) { return b - a; }).forEach(function (r) { s.deleteRow(r); });
}
var txt_ = function (s) { return TXT + String(s); };
var untxt_ = function (v) { v = String(v == null ? '' : v); return v.charAt(0) === TXT ? v.slice(1) : v; };

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function randomId_(prefix) { return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 16); }
function secret_() {
  var p = PropertiesService.getScriptProperties();
  var s = p.getProperty('PEPPER');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('PEPPER', s); }
  return s;
}

/* ============================== passwords ============================== */

// PBKDF2-HMAC-SHA256 with a per-user salt, plus a secret "pepper" kept in the
// script's private settings, so a copy of the sheet alone isn't enough to guess passwords.
function hashPassword_(password, saltB64, iterations) {
  var P = Utilities.newBlob(secret_() + '\u0000' + password).getBytes();
  var salt = Utilities.base64Decode(saltB64);
  var u = Utilities.computeHmacSha256Signature(salt.concat([0, 0, 0, 1]), P);
  var out = u.slice();
  for (var i = 1; i < iterations; i++) {
    u = Utilities.computeHmacSha256Signature(u, P);
    for (var j = 0; j < out.length; j++) out[j] ^= u[j];
  }
  return Utilities.base64Encode(out);
}
function checkPw_(u, pw) {
  return !!u && hashPassword_(pw, untxt_(u[U.salt]), Number(u[U.iter]) || CFG.ITERATIONS) === untxt_(u[U.hash]);
}
function newSalt_() {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now() + Math.random()).slice(0, 16));
}
function sha_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }

function checkUsername_(name) {
  name = String(name || '').trim();
  if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(name)) fail_('Usernames are 3 to 20 letters, numbers or _ and start with a letter.');
  if (/^(true|false)$/i.test(name)) fail_('Please pick a different username.');
  return name;
}
function checkPassword_(pw) {
  pw = String(pw || '');
  if (pw.length < 8) fail_('Passwords need at least 8 characters.');
  if (pw.length > 100) fail_('That password is too long (100 characters max).');
  return pw;
}

/* ============================== users & sessions ============================== */

var U = { id: 0, username: 1, lower: 2, hash: 3, salt: 4, iter: 5, admin: 6, banned: 7, created: 8, last: 9, hidden: 10 };
function users_() { return rows_('Users'); }
function findUser_(list, pred) { for (var i = 0; i < list.length; i++) if (pred(list[i])) return list[i]; return null; }
// True if this Users row has the given (lowercase) name. Checks both the username and username_lower
// columns, so a row typed or edited by hand in the sheet still counts and can't be signed up again.
function nameIs_(r, lower) {
  return String(r[U.lower] == null ? '' : r[U.lower]).trim().toLowerCase() === lower ||
         String(r[U.username] == null ? '' : r[U.username]).trim().toLowerCase() === lower;
}
function publicUser_(u) { return { id: u[U.id], username: u[U.username], admin: u[U.admin] === true, banned: u[U.banned] === true, hidden: u[U.hidden] === true }; }

function newSession_(userId) {
  var token = Utilities.getUuid() + '.' + Utilities.getUuid();
  var now = Date.now();
  appendRow_('Sessions', [txt_(sha_(token)), userId, now, now + CFG.SESSION_DAYS * 864e5]);
  return token;
}
// Who is calling? Returns the user's row or stops with "please sign in".
function auth_(req) {
  var token = String(req.token || '');
  if (!token) fail_('Please sign in.', 'auth');
  var th = sha_(token), cache = CacheService.getScriptCache();
  var uid = cache.get('s:' + th);
  if (!uid) {
    var s = findUser_(rows_('Sessions'), function (r) { return untxt_(r[0]) === th; });
    if (!s || Number(s[3]) < Date.now()) fail_('Your sign-in has expired. Please sign in again.', 'auth');
    uid = s[1];
    cache.put('s:' + th, uid, 600);
  }
  var u = findUser_(users_(), function (r) { return r[U.id] === uid; });
  if (!u) { cache.remove('s:' + th); fail_('Please sign in.', 'auth'); }
  u._token = th;
  return u;
}
function requireAdmin_(req) {
  var u = auth_(req);
  if (u[U.admin] !== true) fail_('Admins only.', 'forbidden');
  return u;
}
function endSessions_(userId, exceptHash) {
  var cache = CacheService.getScriptCache(), del = [];
  rows_('Sessions').forEach(function (r) {
    var h = untxt_(r[0]);
    if (r[1] === userId && h !== exceptHash) { del.push(r._r); cache.remove('s:' + h); }
  });
  deleteRows_('Sessions', del);
}

function register_(req) {
  var name = checkUsername_(req.username), pw = checkPassword_(req.password);
  var cache = CacheService.getScriptCache(), hour = 'signup:' + Math.floor(Date.now() / 36e5);
  if (Number(cache.get(hour) || 0) >= CFG.SIGNUPS_PER_HOUR) fail_('Lots of people are signing up right now. Please try again in a little while.');
  return withLock_(function () {
    var list = users_(), lower = name.toLowerCase();
    if (findUser_(list, function (r) { return nameIs_(r, lower); })) fail_('That username is already taken. Please pick another one.');
    var salt = newSalt_(), id = randomId_('u'), now = Date.now();
    var r = appendRow_('Users', [id, name, lower, txt_(hashPassword_(pw, salt, CFG.ITERATIONS)), txt_(salt), CFG.ITERATIONS, false, false, now, now, false]);
    tab_('Users').getRange(r, U.admin + 1, 1, 2).insertCheckboxes();
    tab_('Users').getRange(r, U.hidden + 1).insertCheckboxes();
    cache.put(hour, String(Number(cache.get(hour) || 0) + 1), 3600);
    var token = newSession_(id);
    return { token: token, user: { id: id, username: name, admin: false, banned: false, hidden: false, avatar: '' } };
  });
}

function login_(req) {
  var name = String(req.username || '').trim(), pw = String(req.password || '');
  if (!name || !pw) fail_('Enter your username and password.');
  var lower = name.toLowerCase(), cache = CacheService.getScriptCache(), key = 'fail:' + lower;
  var fails = Number(cache.get(key) || 0);
  if (fails >= CFG.LOGIN_FAILS) fail_('Too many wrong passwords. Wait 15 minutes and try again.');
  var u = findUser_(users_(), function (r) { return nameIs_(r, lower); });
  var ok = u && checkPw_(u, pw);
  if (!ok) {
    cache.put(key, String(fails + 1), 900);
    fail_('Wrong username or password.');
  }
  cache.remove(key);
  return withLock_(function () {
    var cur = findUser_(users_(), function (r) { return r[U.id] === u[U.id]; });
    if (cur) tab_('Users').getRange(cur._r, U.last + 1).setValue(Date.now());
    // tidy up this user's expired sign-ins
    var now = Date.now(), old = rows_('Sessions').filter(function (r) { return r[1] === u[U.id] && Number(r[3]) < now; }).map(function (r) { return r._r; });
    deleteRows_('Sessions', old);
    return { token: newSession_(u[U.id]), user: withLook_(publicUser_(u)) };
  });
}

function logout_(req) {
  var token = String(req.token || '');
  if (!token) return {};
  var th = sha_(token);
  CacheService.getScriptCache().remove('s:' + th);
  withLock_(function () {
    deleteRows_('Sessions', rows_('Sessions').filter(function (r) { return untxt_(r[0]) === th; }).map(function (r) { return r._r; }));
  });
  return {};
}

function changePassword_(req) {
  var u = auth_(req), pw = checkPassword_(req.newPassword);
  if (!checkPw_(u, String(req.oldPassword || ''))) fail_('Your current password is wrong.');
  withLock_(function () {
    var salt = newSalt_();
    tab_('Users').getRange(u._r, U.hash + 1, 1, 3).setValues([[txt_(hashPassword_(pw, salt, CFG.ITERATIONS)), txt_(salt), CFG.ITERATIONS]]);
    endSessions_(u[U.id], u._token);   // sign out everywhere else
  });
  return {};
}

function deleteAccount_(req) {
  var u = auth_(req);
  if (!checkPw_(u, String(req.password || ''))) fail_('That password is wrong.');
  withLock_(function () {
    var id = u[U.id];
    endSessions_(id, null);
    deleteRows_('Trackers', rows_('Trackers').filter(function (r) { return r[0] === id; }).map(function (r) { return r._r; }));
    deleteRows_('Comments', rows_('Comments').filter(function (r) { return r[2] === id; }).map(function (r) { return r._r; }));
    deleteRows_('Profiles', rows_('Profiles').filter(function (r) { return r[0] === id; }).map(function (r) { return r._r; }));
    var cur = findUser_(users_(), function (r) { return r[U.id] === id; });
    if (cur) deleteRows_('Users', [cur._r]);
  });
  return {};
}

/* ============================== trackers ============================== */

function trackerRow_(r) {
  var parts = [];
  for (var i = 3; i < r.length; i++) if (r[i] !== '' && r[i] != null) parts.push(untxt_(r[i]));
  return { key: r[1], updated_at: new Date(Number(r[2])).toISOString(), value: JSON.parse(parts.join('') || 'null') };
}
function trackersGet_(req) {
  var u = auth_(req);
  return { items: rows_('Trackers').filter(function (r) { return r[0] === u[U.id]; }).map(trackerRow_) };
}
function trackersPut_(req) {
  var u = auth_(req), key = String(req.key || '');
  if (CFG.KEYS.indexOf(key) < 0) fail_('That tracker can\'t be saved.');
  var text = JSON.stringify(req.value);
  if (text === undefined) fail_('Nothing to save.');
  if (text.length > CFG.TRACKER_MAX) fail_('That tracker is too big to save.');
  var chunks = [];
  for (var i = 0; i < text.length; i += CFG.CHUNK) chunks.push(txt_(text.slice(i, i + CFG.CHUNK)));
  var now = Date.now();
  withLock_(function () {
    var row = [u[U.id], key, now].concat(chunks);
    var cur = findUser_(rows_('Trackers'), function (r) { return r[0] === u[U.id] && r[1] === key; });
    if (cur) writeRow_('Trackers', cur._r, row); else appendRow_('Trackers', row);
  });
  return { updated_at: new Date(now).toISOString() };
}
function trackersDelete_(req) {
  var u = auth_(req), key = String(req.key || '');
  withLock_(function () {
    deleteRows_('Trackers', rows_('Trackers').filter(function (r) { return r[0] === u[U.id] && r[1] === key; }).map(function (r) { return r._r; }));
  });
  return {};
}

/* ============================== profiles ============================== */

// Who's signed in, if anyone (profiles work signed out too).
function optionalUser_(req) {
  if (!req.token) return null;
  try { return auth_(req); } catch (e) { return null; }
}
function profilesSearch_(req) {
  var q = String(req.q || '').trim().toLowerCase();
  if (q.length < 1) return { users: [] };
  var list = users_().filter(function (r) { return r[U.hidden] !== true && String(r[U.lower]).indexOf(q) >= 0; });
  list.sort(function (a, b) {
    var as = String(a[U.lower]).indexOf(q) === 0 ? 0 : 1, bs = String(b[U.lower]).indexOf(q) === 0 ? 0 : 1;
    return as - bs || String(a[U.lower]).localeCompare(String(b[U.lower]));
  });
  var looks = looks_();
  return { users: list.slice(0, 20).map(function (r) { return { username: r[U.username], admin: r[U.admin] === true, avatar: (looks[r[U.id]] || {}).avatar || '' }; }) };
}
// Only these parts of someone's trackers are ever shown on a profile.
function profilesGet_(req) {
  var name = String(req.username || '').trim().toLowerCase();
  var u = findUser_(users_(), function (r) { return nameIs_(r, name); });
  if (!u) fail_('There\'s no account called "' + String(req.username || '').trim() + '".', 'notfound');
  var me = optionalUser_(req), self = !!me && me[U.id] === u[U.id];
  var out = { user: { username: u[U.username], admin: u[U.admin] === true, joined: new Date(Number(u[U.created]) || 0).toISOString(), hidden: u[U.hidden] === true }, self: self };
  var look = looks_()[u[U.id]] || {};
  out.user.avatar = look.avatar || '';
  if (u[U.hidden] === true && !self) { out.private = true; return out; }
  out.user.bio = look.bio || '';
  out.user.banner = look.banner || '';
  if (look.roblox_id) out.user.roblox = { id: look.roblox_id, name: look.roblox_name };
  if (self) { var pend = robloxPending_(u[U.id]); if (pend) out.robloxPending = pend; }
  rows_('Trackers').forEach(function (r) {
    if (r[0] !== u[U.id]) return;
    var t;
    try { t = trackerRow_(r); } catch (e) { return; }
    var v = t.value || {};
    if (t.key === 'mh-shiny-checklist-v1' && v.items) {
      var owned = [];
      Object.keys(v.items).forEach(function (k) { if (v.items[k] && v.items[k].got) owned.push(k); });
      out.shiny = { owned: owned, updated_at: t.updated_at };
    } else if (t.key === 'mh-rebirth-tracker-v1' && v.plan) {
      out.rebirth = { life: Math.max(0, Math.floor(Number(v.plan.life) || 0)), s: v.plan.s === true, goal: Math.floor(Number(v.plan.goal) || 0), updated_at: t.updated_at };
    } else if (t.key === 'mh-gift-streak-v1' && typeof v.streak === 'number') {
      out.streak = { streak: Math.max(0, Math.floor(v.streak)), last: /^\d{4}-\d{2}-\d{2}$/.test(v.last || '') ? v.last : '', today: new Date().toISOString().slice(0, 10), updated_at: t.updated_at };
    }
  });
  return out;
}
function profilesVisibility_(req) {
  var u = auth_(req), hidden = req.hidden === true;
  withLock_(function () {
    var s = tab_('Users');
    if (s.getRange(1, U.hidden + 1).getValue() !== TABS.Users[U.hidden]) s.getRange(1, U.hidden + 1).setValue(TABS.Users[U.hidden]).setFontWeight('bold');   // sheets made before this column existed
    s.getRange(u._r, U.hidden + 1).insertCheckboxes().setValue(hidden);
  });
  return { hidden: hidden };
}

/* ============================== profile customization ============================== */
// Bio, picture and banner colour live in the Profiles tab, one row per account that has set any of them.
// avatar is either "" (first letter of the name), a small picture uploaded by the user
// ("data:image/jpeg;base64,…", already resized to 128×128 in their browser), or a wiki item picture ("assets/wiki/…").

function looks_() {
  var map = {};
  rows_('Profiles').forEach(function (r) {
    map[r[0]] = { bio: untxt_(r[1]), avatar: untxt_(r[2]), banner: untxt_(r[3]),
      roblox_id: String(untxt_(r[5]) || ''), roblox_name: untxt_(r[6]) || '', roblox_at: r[7] || '', _r: r._r };
  });
  return map;
}
function withLook_(pub) { pub.avatar = (looks_()[pub.id] || {}).avatar || ''; return pub; }

var AVATAR_DATA = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+\/]+={0,2})$/;
var AVATAR_ITEM = /^assets\/wiki\/[A-Za-z0-9._-]{1,120}\.(webp|png|jpe?g|gif)$/;
function checkAvatar_(v) {
  v = String(v == null ? '' : v).trim();
  if (!v) return '';
  if (AVATAR_ITEM.test(v) && v.indexOf('..') < 0) return v;
  var m = AVATAR_DATA.exec(v);
  if (!m) fail_('That picture can\'t be used. Try a JPG, PNG or WebP image.');
  if (v.length > CFG.AVATAR_MAX) fail_('That picture is too big. Try a smaller image.');
  // make sure the bytes really are the kind of image the label says
  var b = Utilities.base64Decode(m[2].slice(0, 24)), h = function (i) { return (b[i] + 256) % 256; };
  var real = h(0) === 0xFF && h(1) === 0xD8 && h(2) === 0xFF ? 'jpeg'
    : h(0) === 0x89 && h(1) === 0x50 && h(2) === 0x4E && h(3) === 0x47 ? 'png'
    : h(0) === 0x52 && h(1) === 0x49 && h(2) === 0x46 && h(3) === 0x46 && h(8) === 0x57 && h(9) === 0x45 && h(10) === 0x42 && h(11) === 0x50 ? 'webp' : '';
  if (real !== m[1]) fail_('That picture can\'t be used. Try a JPG, PNG or WebP image.');
  return v;
}
function checkBio_(v) {
  v = String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (v.length > CFG.BIO_MAX) fail_('Bios can be up to ' + CFG.BIO_MAX + ' characters.');
  if (v.split('\n').length > CFG.BIO_LINES) fail_('Bios can be up to ' + CFG.BIO_LINES + ' lines.');
  return v;
}
// Saves an account's profile row. Fields not given keep their current value; a row with nothing left is removed.
function saveLook_(userId, look) {
  var cur = looks_()[userId] || {}, v = {};
  ['bio', 'avatar', 'banner', 'roblox_id', 'roblox_name', 'roblox_at'].forEach(function (k) { v[k] = k in look ? look[k] : cur[k] || ''; });
  var row = [userId, txt_(v.bio), txt_(v.avatar), txt_(v.banner), Date.now(), txt_(v.roblox_id), txt_(v.roblox_name), v.roblox_at || ''];
  var empty = !v.bio && !v.avatar && !v.banner && !v.roblox_id;
  if (cur._r && empty) deleteRows_('Profiles', [cur._r]);
  else if (cur._r) { fixHeader_('Profiles'); tab_('Profiles').getRange(cur._r, 1, 1, row.length).setValues([row]); }
  else if (!empty) { fixHeader_('Profiles'); appendRow_('Profiles', row); }
}
// Sheets made before a column was added get the new column names in row 1.
function fixHeader_(name) {
  var want = TABS[name], sh = tab_(name);
  if (sh.getRange(1, want.length).getValue() !== want[want.length - 1]) sh.getRange(1, 1, 1, want.length).setValues([want]);
}

// Change any of bio, avatar, banner; fields left out stay as they are.
function profilesUpdate_(req) {
  var u = auth_(req);
  if (u[U.banned] === true) fail_('You can\'t change your profile on this wiki.');
  var patch = {};
  if ('bio' in req) patch.bio = checkBio_(req.bio);
  if ('avatar' in req) patch.avatar = checkAvatar_(req.avatar);
  if ('banner' in req) {
    patch.banner = String(req.banner || '');
    if (patch.banner && CFG.BANNERS.indexOf(patch.banner) < 0) fail_('Pick one of the banner colours.');
  }
  var cache = CacheService.getScriptCache(), key = 'pe:' + u[U.id] + ':' + Math.floor(Date.now() / 36e5);
  if (Number(cache.get(key) || 0) >= CFG.PROFILE_EDITS_PER_HOUR) fail_('You\'ve changed your profile a lot this hour. Try again later.');
  var out;
  withLock_(function () {
    var cur = looks_()[u[U.id]] || {};
    out = { bio: 'bio' in patch ? patch.bio : cur.bio || '', avatar: 'avatar' in patch ? patch.avatar : cur.avatar || '', banner: 'banner' in patch ? patch.banner : cur.banner || '' };
    saveLook_(u[U.id], out);
  });
  cache.put(key, String(Number(cache.get(key) || 0) + 1), 3600);
  return { profile: out };
}
// Admins: remove someone's picture and/or bio (what: "avatar", "bio" or "all").
function adminClearProfile_(req) {
  requireAdmin_(req);
  var t = userByName_(req.username), what = String(req.what || 'all');
  if (['avatar', 'bio', 'all'].indexOf(what) < 0) fail_('Bad request.');
  withLock_(function () {
    var cur = looks_()[t[U.id]] || {};
    var next = { bio: what === 'avatar' ? cur.bio || '' : '', avatar: what === 'bio' ? cur.avatar || '' : '', banner: what === 'all' ? '' : cur.banner || '' };
    saveLook_(t[U.id], next);
  });
  return { username: t[U.username], what: what };
}

/* ============================== Roblox account on a profile ============================== */
// Not a sign-in: it only shows "this is my Roblox account" on someone's profile.
// To prove the account is theirs, the player puts a short word code in their Roblox profile's About
// section; this script reads that profile from Roblox and links it when the code is there.

var RBX_WORDS = ('ore lava magma crystal quartz nebula tortoise lunar solar frost ember drill furnace conveyor ' +
  'shiny cobalt emerald sapphire ruby topaz onyx comet meteor aurora glacier volcano thunder prism pixel rocket ' +
  'galaxy phoenix maple cactus pebble canyon harbor beacon lantern compass anchor falcon otter panda koala mango ' +
  'peach waffle pickle noodle biscuit tulip cedar willow river meadow orbit rainbow marble velvet').split(' ');

function robloxFetch_(path, payload) {
  var hosts = ['https://users.roblox.com', 'https://users.roproxy.com'];   // roproxy is the backup when Roblox is busy
  for (var i = 0; i < hosts.length; i++) {
    try {
      var o = { method: payload ? 'post' : 'get', muteHttpExceptions: true, headers: { Accept: 'application/json' } };
      if (payload) { o.contentType = 'application/json'; o.payload = JSON.stringify(payload); }
      var res = UrlFetchApp.fetch(hosts[i] + path, o), code = res.getResponseCode();
      if (code === 200) return JSON.parse(res.getContentText());
      if (code === 404 || code === 400) return null;
    } catch (e) { /* try the next host */ }
  }
  fail_('Roblox isn\'t answering right now. Try again in a minute.');
}
function rbxNorm_(t) { return ' ' + String(t || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim() + ' '; }
function rbxLimit_(kind, u, max) {
  var cache = CacheService.getScriptCache(), key = 'rl:' + kind + ':' + u[U.id] + ':' + Math.floor(Date.now() / 36e5), n = Number(cache.get(key) || 0);
  if (n >= max) fail_('Too many tries this hour. Try again later.');
  cache.put(key, String(n + 1), 3600);
}
function robloxPending_(userId) {
  try { return JSON.parse(CacheService.getScriptCache().get('rbx:' + userId) || 'null'); } catch (e) { return null; }
}
function robloxOwner_(robloxId) {   // which wiki account already has this Roblox account, if any
  var looks = looks_();
  for (var id in looks) if (looks[id].roblox_id && looks[id].roblox_id === String(robloxId)) return id;
  return '';
}
// Step 1: look up the Roblox username and hand out a code to put in their About section.
function robloxStart_(req) {
  var u = auth_(req);
  if (u[U.banned] === true) fail_('You can\'t change your profile on this wiki.');
  var name = String(req.username || '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) fail_('That isn\'t a Roblox username. They\'re 3–20 letters, numbers or _.');
  rbxLimit_('rs', u, CFG.ROBLOX_LOOKUPS_PER_HOUR);
  var r = robloxFetch_('/v1/usernames/users', { usernames: [name], excludeBannedUsers: true });
  var hit = r && r.data && r.data[0];
  if (!hit || !hit.id) fail_('No Roblox account is called "' + name + '".', 'notfound');
  var owner = robloxOwner_(hit.id);
  if (owner && owner !== u[U.id]) fail_('That Roblox account is already linked to another wiki account.');
  var words = [];
  for (var i = 0; i < 4; i++) words.push(RBX_WORDS[Math.floor(Math.random() * RBX_WORDS.length)]);
  var pend = { id: String(hit.id), name: hit.name, displayName: hit.displayName || hit.name, code: 'haven ' + words.join(' ') };
  CacheService.getScriptCache().put('rbx:' + u[U.id], JSON.stringify(pend), CFG.ROBLOX_CODE_MINUTES * 60);
  return { pending: pend };
}
// Step 2: read their Roblox profile and link it if the code is in the About section.
function robloxVerify_(req) {
  var u = auth_(req);
  if (u[U.banned] === true) fail_('You can\'t change your profile on this wiki.');
  var pend = robloxPending_(u[U.id]);
  if (!pend) fail_('That code ran out. Press Link again to get a new one.', 'expired');
  rbxLimit_('rv', u, CFG.ROBLOX_CHECKS_PER_HOUR);
  var p = robloxFetch_('/v1/users/' + encodeURIComponent(pend.id));
  if (!p) fail_('That Roblox account can\'t be found any more.');
  if (rbxNorm_(p.description).indexOf(rbxNorm_(pend.code)) < 0)
    fail_('The code isn\'t in your About section yet. After saving it on Roblox, wait a few seconds and press Verify again.', 'notyet');
  var linked;
  withLock_(function () {
    var owner = robloxOwner_(pend.id);
    if (owner && owner !== u[U.id]) fail_('That Roblox account is already linked to another wiki account.');
    linked = { id: String(p.id || pend.id), name: p.name || pend.name };
    saveLook_(u[U.id], { roblox_id: linked.id, roblox_name: linked.name, roblox_at: Date.now() });
  });
  CacheService.getScriptCache().remove('rbx:' + u[U.id]);
  return { roblox: linked };
}
function robloxUnlink_(req) {
  var u = auth_(req);
  CacheService.getScriptCache().remove('rbx:' + u[U.id]);
  withLock_(function () { saveLook_(u[U.id], { roblox_id: '', roblox_name: '', roblox_at: '' }); });
  return { roblox: null };
}

/* ============================== comments ============================== */

function adminIds_() {
  var set = {};
  users_().forEach(function (r) { if (r[U.admin] === true) set[r[U.id]] = true; });
  return set;
}
function commentOut_(r, admins) {
  return { id: r[0], thread: r[1], user_id: r[2], author: r[3], body: untxt_(r[4]), created_at: new Date(Number(r[5])).toISOString(), admin: !!admins[r[2]] };
}
function commentsList_(req) {
  var thread = String(req.thread || ''), limit = Math.min(50, Number(req.limit) || 20);
  var all = rows_('Comments').filter(function (r) { return r[1] === thread; });
  all.sort(function (a, b) { return Number(b[5]) - Number(a[5]) || b._r - a._r; });   // newest first
  var admins = adminIds_();
  // "before" is the id of the last comment already shown, so "Show older" carries on after it
  var start = 0;
  if (req.before) { for (var i = 0; i < all.length; i++) if (all[i][0] === String(req.before)) { start = i + 1; break; } }
  var page = all.slice(start, start + limit), looks = looks_(), avatars = {};
  page.forEach(function (r) { var a = (looks[r[2]] || {}).avatar; if (a) avatars[r[2]] = a; });
  return { total: all.length, items: page.map(function (r) { return commentOut_(r, admins); }), avatars: avatars };
}
function commentsAdd_(req) {
  var u = auth_(req);
  if (u[U.banned] === true) fail_('You can\'t post comments on this wiki.');
  var thread = String(req.thread || '').slice(0, 160), body = String(req.body || '').trim();
  if (thread.length < 3) fail_('Bad request.');
  if (!body) fail_('Write something first.');
  if (body.length > CFG.COMMENT_MAX) fail_('Comments can be up to ' + CFG.COMMENT_MAX + ' characters.');
  var cache = CacheService.getScriptCache(), key = 'cm:' + u[U.id] + ':' + Math.floor(Date.now() / 60000);
  if (Number(cache.get(key) || 0) >= CFG.COMMENTS_PER_MINUTE) fail_('You\'re commenting too fast. Wait a minute and try again.');
  cache.put(key, String(Number(cache.get(key) || 0) + 1), 120);
  var row = [randomId_('c'), thread, u[U.id], u[U.username], txt_(body), Date.now()];
  withLock_(function () { appendRow_('Comments', row); });
  var admins = {}; if (u[U.admin] === true) admins[u[U.id]] = true;
  return { item: commentOut_(row, admins) };
}
function commentsDelete_(req) {
  var u = auth_(req), id = String(req.id || ''), removed = 0;
  withLock_(function () {
    var c = findUser_(rows_('Comments'), function (r) { return r[0] === id; });
    if (!c) return;
    if (c[2] !== u[U.id] && u[U.admin] !== true) fail_('You can only delete your own comments.');
    deleteRows_('Comments', [c._r]); removed = 1;
  });
  return { removed: removed };
}

/* ============================== admin ============================== */

function userByName_(name) {
  var lower = String(name || '').trim().toLowerCase();
  var u = findUser_(users_(), function (r) { return nameIs_(r, lower); });
  if (!u) fail_('There\'s no user called "' + String(name || '').trim() + '".');
  return u;
}
function adminBan_(req) {
  var me = requireAdmin_(req), target = null;
  withLock_(function () {
    target = findUser_(users_(), function (r) { return r[U.id] === String(req.userId || ''); });
    if (!target) fail_('That user doesn\'t exist any more.');
    if (target[U.admin] === true) fail_('Admins can\'t be banned.');
    tab_('Users').getRange(target._r, U.banned + 1).setValue(true);
    deleteRows_('Comments', rows_('Comments').filter(function (r) { return r[2] === target[U.id]; }).map(function (r) { return r._r; }));
    deleteRows_('Profiles', rows_('Profiles').filter(function (r) { return r[0] === target[U.id]; }).map(function (r) { return r._r; }));
  });
  return { username: target[U.username] };
}
function adminUnban_(req) {
  requireAdmin_(req);
  var t = userByName_(req.username);
  withLock_(function () { tab_('Users').getRange(t._r, U.banned + 1).setValue(false); });
  return { username: t[U.username] };
}
function adminResetPassword_(req) {
  requireAdmin_(req);
  var t = userByName_(req.username), pw = checkPassword_(req.newPassword);
  withLock_(function () {
    var salt = newSalt_();
    tab_('Users').getRange(t._r, U.hash + 1, 1, 3).setValues([[txt_(hashPassword_(pw, salt, CFG.ITERATIONS)), txt_(salt), CFG.ITERATIONS]]);
    endSessions_(t[U.id], null);
  });
  return { username: t[U.username] };
}

function gh_(path, opts) {
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('GITHUB_TOKEN');
  if (!token) fail_('The GitHub token isn\'t set yet. In the sheet, use HavenWiki > Set the GitHub token.');
  var repo = p.getProperty('GITHUB_REPO') || CFG.GITHUB_REPO;
  opts = opts || {};
  var headers = { Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28', Accept: opts.accept || 'application/vnd.github+json' };
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/' + path, {
    method: opts.method || 'get', headers: headers, muteHttpExceptions: true,
    contentType: opts.payload ? 'application/json' : undefined, payload: opts.payload ? JSON.stringify(opts.payload) : undefined,
  });
  return { status: res.getResponseCode(), text: res.getContentText('UTF-8') };
}
function branch_() { return PropertiesService.getScriptProperties().getProperty('GITHUB_BRANCH') || CFG.GITHUB_BRANCH; }
var PATH_OK = /^data\/[A-Za-z0-9_-]+\.json$/;
function dataDir_() {
  var r = gh_('contents/data?ref=' + encodeURIComponent(branch_()));
  if (r.status !== 200) fail_('GitHub said ' + r.status + '. Check the token and repo name.');
  return JSON.parse(r.text);
}
function adminFiles_(req) {
  var me = requireAdmin_(req);
  var files = dataDir_().filter(function (f) { return f.type === 'file' && /\.json$/.test(f.name); })
    .map(function (f) { return { path: f.path, name: f.name, size: f.size, sha: f.sha }; });
  return { files: files, repo: PropertiesService.getScriptProperties().getProperty('GITHUB_REPO') || CFG.GITHUB_REPO, branch: branch_(), you: me[U.username] };
}
function adminRead_(req) {
  requireAdmin_(req);
  var path = String(req.path || '');
  if (!PATH_OK.test(path)) fail_('Only files in data/ can be edited.');
  var r = gh_('contents/' + path + '?ref=' + encodeURIComponent(branch_()), { accept: 'application/vnd.github.raw+json' });
  if (r.status !== 200) fail_('Couldn\'t read ' + path + ' (GitHub ' + r.status + ').');
  var f = findUser_(dataDir_(), function (x) { return x.path === path; });
  return { path: path, content: r.text, sha: f ? f.sha : null };
}
function adminSave_(req) {
  var me = requireAdmin_(req);
  var path = String(req.path || ''), content = String(req.content || '');
  if (!PATH_OK.test(path)) fail_('Only files in data/ can be edited.');
  try { JSON.parse(content); } catch (err) { fail_('Not valid JSON: ' + err.message); }
  return withLock_(function () {
    var f = findUser_(dataDir_(), function (x) { return x.path === path; });
    var current = f ? f.sha : null;
    if (req.sha && current && req.sha !== current) fail_('Someone saved this file after you opened it. Reload it to get their changes, then make your edit again.', 'conflict');
    var note = String(req.message || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    var message = 'Admin edit: ' + path.slice(5) + (note ? ' (' + note + ')' : '') + ' by ' + me[U.username];
    var body = { message: message, content: Utilities.base64Encode(content, Utilities.Charset.UTF_8), branch: branch_() };
    if (current) body.sha = current;
    var r = gh_('contents/' + path, { method: 'put', payload: body });
    if (r.status === 409 || r.status === 422) fail_('GitHub rejected the save because the file changed. Reload it and try again.', 'conflict');
    if (r.status !== 200 && r.status !== 201) fail_('GitHub said ' + r.status + '. Check the token\'s permissions.');
    var out = JSON.parse(r.text);
    return { sha: out.content && out.content.sha, commit: out.commit && out.commit.html_url, message: message };
  });
}

/* ============================== sheet menu (for the owner) ============================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('HavenWiki')
    .addItem('Set up the sheet', 'setupSheet')
    .addItem('Reset a user\'s password…', 'menuResetPassword')
    .addItem('Set the GitHub token…', 'menuGithubToken')
    .addItem('Sign everyone out', 'menuSignOutAll')
    .addToUi();
}
function setupSheet() {
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', SpreadsheetApp.getActiveSpreadsheet().getId());
  Object.keys(TABS).forEach(function (name) {
    var t = tab_(name), head = TABS[name];
    t.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');   // adds any newer columns
  });
  secret_();
  var d = ss_().getSheetByName('Sheet1');
  if (d && d.getLastRow() === 0 && ss_().getSheets().length > 1) ss_().deleteSheet(d);
  try { SpreadsheetApp.getUi().alert('HavenWiki is set up. Next: Deploy > New deployment > Web app (see the setup guide).'); } catch (e) {}
}
function menuResetPassword() {
  var ui = SpreadsheetApp.getUi();
  var a = ui.prompt('Reset a password', 'Username:', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var b = ui.prompt('Reset a password', 'New password for ' + a.getResponseText() + ' (8+ characters):', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  try {
    var t = userByName_(a.getResponseText()), pw = checkPassword_(b.getResponseText()), salt = newSalt_();
    withLock_(function () {
      tab_('Users').getRange(t._r, U.hash + 1, 1, 3).setValues([[txt_(hashPassword_(pw, salt, CFG.ITERATIONS)), txt_(salt), CFG.ITERATIONS]]);
      endSessions_(t[U.id], null);
    });
    ui.alert('Done. ' + t[U.username] + ' can sign in with the new password.');
  } catch (e) { ui.alert(e.userMessage || String(e)); }
}
function menuGithubToken() {
  var ui = SpreadsheetApp.getUi(), p = PropertiesService.getScriptProperties();
  var a = ui.prompt('GitHub token', 'Paste the fine-grained token (Contents: read and write on ' + (p.getProperty('GITHUB_REPO') || CFG.GITHUB_REPO) + '):', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK || !a.getResponseText().trim()) return;
  p.setProperty('GITHUB_TOKEN', a.getResponseText().trim());
  ui.alert('Saved. The token is stored in the script\'s private settings, not in the sheet.');
}
function menuSignOutAll() {
  withLock_(function () {
    var s = tab_('Sessions'), n = s.getLastRow(), cache = CacheService.getScriptCache();
    rows_('Sessions').forEach(function (r) { cache.remove('s:' + untxt_(r[0])); });
    if (n > 1) s.deleteRows(2, n - 1);
  });
  try { SpreadsheetApp.getUi().alert('Everyone has been signed out.'); } catch (e) {}
}
