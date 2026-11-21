'use strict';
process.removeAllListeners('warning');
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// ---------- config ----------
const PORT = process.env.PORT || 3000;
const YEAR = parseInt(process.env.GAME_YEAR || '2026', 10);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-now';
const SECRET = process.env.SECRET || crypto.createHash('sha256').update(ADMIN_PASSWORD + 'naija25').digest('hex');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'game.db');
const QUESTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'questions.json'), 'utf8')).days;
const JOURNEY = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'journey.json'), 'utf8'));
const BANK = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'bank.json'), 'utf8')).questions;
const PLACES = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'places.json'), 'utf8')).places;
const CITY = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'city.json'), 'utf8'));

const BASE_MS = 10000, MUMMY_MS = 20000, GRACE_MS = 1500;
const REF_POINTS = 200, SHARE_POINTS = 25, PERFECT_BONUS = 150, MAX_SAVERS = 3, MAX_REF_REWARDS = 20;

// ---------- db ----------
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, phone TEXT UNIQUE, nickname TEXT, nick_lower TEXT UNIQUE, state TEXT, school TEXT,
  ref_code TEXT UNIQUE, referred_by INTEGER, ref_rewarded INTEGER DEFAULT 0,
  ip_signup TEXT, ip_last TEXT, ua TEXT, lang TEXT DEFAULT 'en', wa_optin INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0, streak INTEGER DEFAULT 0, best_streak INTEGER DEFAULT 0,
  last_played_day INTEGER, savers INTEGER DEFAULT 1, time_spent INTEGER DEFAULT 0,
  created_at INTEGER, last_seen INTEGER);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER, created_at INTEGER);
CREATE TABLE IF NOT EXISTS plays(
  id INTEGER PRIMARY KEY, user_id INTEGER, day INTEGER, official INTEGER, state TEXT,
  started_at INTEGER, finished_at INTEGER, correct INTEGER DEFAULT 0, points INTEGER DEFAULT 0, avg_ms INTEGER);
CREATE INDEX IF NOT EXISTS plays_ud ON plays(user_id, day);
CREATE INDEX IF NOT EXISTS plays_day ON plays(day, official, finished_at);
CREATE TABLE IF NOT EXISTS answers(
  id INTEGER PRIMARY KEY, play_id INTEGER, user_id INTEGER, day INTEGER, qidx INTEGER, official INTEGER,
  correct INTEGER, ms INTEGER, points INTEGER, created_at INTEGER);
CREATE INDEX IF NOT EXISTS answers_q ON answers(day, qidx, official);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, user_id INTEGER, type TEXT, meta TEXT, ip TEXT, created_at INTEGER);
CREATE INDEX IF NOT EXISTS events_t ON events(created_at);
CREATE INDEX IF NOT EXISTS events_u ON events(user_id);
CREATE TABLE IF NOT EXISTS activity(user_id INTEGER, date TEXT, secs INTEGER DEFAULT 0, hits INTEGER DEFAULT 0, PRIMARY KEY(user_id, date));
CREATE TABLE IF NOT EXISTS squads(id INTEGER PRIMARY KEY, code TEXT UNIQUE, name TEXT, owner_id INTEGER, created_at INTEGER);
CREATE TABLE IF NOT EXISTS squad_members(squad_id INTEGER, user_id INTEGER, joined_at INTEGER, PRIMARY KEY(squad_id, user_id));
CREATE TABLE IF NOT EXISTS badges(user_id INTEGER, badge TEXT, awarded_at INTEGER, PRIMARY KEY(user_id, badge));
CREATE TABLE IF NOT EXISTS shares(user_id INTEGER, date TEXT, PRIMARY KEY(user_id, date));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS duels(id INTEGER PRIMARY KEY, code TEXT UNIQUE, type TEXT, creator INTEGER, created_at INTEGER, seed INTEGER, qset TEXT, rewarded INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS duel_players(duel_id INTEGER, user_id INTEGER, state TEXT, score INTEGER DEFAULT 0, correct INTEGER DEFAULT 0, answered INTEGER DEFAULT 0, progress REAL DEFAULT 0, crashes INTEGER DEFAULT 0, secs REAL, done_at INTEGER, live_at INTEGER, joined_at INTEGER, PRIMARY KEY(duel_id, user_id));
CREATE TABLE IF NOT EXISTS gifts(id INTEGER PRIMARY KEY, from_id INTEGER, to_id INTEGER, item TEXT, msg TEXT, created_at INTEGER, opened INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS bag(user_id INTEGER, item TEXT, qty INTEGER DEFAULT 0, PRIMARY KEY(user_id, item));
CREATE TABLE IF NOT EXISTS inbox(id INTEGER PRIMARY KEY, user_id INTEGER, kind TEXT, text TEXT, link TEXT, created_at INTEGER, seen INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS visits(user_id INTEGER, place TEXT, mode TEXT, first_at INTEGER, correct INTEGER, PRIMARY KEY(user_id, place));
`);
for (const [col, def] of [['coins', 'INTEGER DEFAULT 300'], ['loc', 'TEXT'], ['trip', 'TEXT'], ['drive', 'INTEGER DEFAULT 0'], ['hat', 'INTEGER DEFAULT 0'], ['home_lat', 'REAL'], ['home_lon', 'REAL'], ['garage', 'TEXT']]) {
  try { db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`); } catch {}
}
db.exec(`CREATE TABLE IF NOT EXISTS lifts(id INTEGER PRIMARY KEY, rider INTEGER, driver INTEGER, status TEXT DEFAULT 'wait', place TEXT, created_at INTEGER, done_at INTEGER);
CREATE INDEX IF NOT EXISTS lifts_d ON lifts(driver, status);`);
db.exec(`CREATE TABLE IF NOT EXISTS drive_runs(user_id INTEGER, date TEXT, secs REAL, crashes INTEGER, fines INTEGER, fares INTEGER, total REAL, path TEXT, plays INTEGER DEFAULT 1, created_at INTEGER, PRIMARY KEY(user_id, date));
CREATE TABLE IF NOT EXISTS drive_log(id INTEGER PRIMARY KEY, user_id INTEGER, kind TEXT, vehicle TEXT, secs REAL, crashes INTEGER, fares INTEGER, stars INTEGER, created_at INTEGER);`);
db.exec(`CREATE TABLE IF NOT EXISTS stockings(user_id INTEGER, date TEXT, reward TEXT, created_at INTEGER, PRIMARY KEY(user_id, date));
CREATE TABLE IF NOT EXISTS road_boxes(user_id INTEGER, date TEXT, n INTEGER DEFAULT 0, PRIMARY KEY(user_id, date));`);
db.exec(`CREATE TABLE IF NOT EXISTS seen(user_id INTEGER, qid TEXT, PRIMARY KEY(user_id, qid));
CREATE TABLE IF NOT EXISTS qbank(id INTEGER PRIMARY KEY, c TEXT, q TEXT, o TEXT, source TEXT, by_user INTEGER, status TEXT DEFAULT 'pending', note TEXT, created_at INTEGER);`);
try { db.exec(`ALTER TABLE answers ADD COLUMN qid TEXT`); } catch {}
db.exec(`CREATE TABLE IF NOT EXISTS journeys(user_id INTEGER PRIMARY KEY, origin TEXT, home TEXT, path TEXT, leg INTEGER DEFAULT 0, last_date TEXT, extra_date TEXT, abroad TEXT, pending TEXT, started_at INTEGER, arrived_at INTEGER);
CREATE TABLE IF NOT EXISTS journey_legs(user_id INTEGER, leg INTEGER, a TEXT, b TEXT, secs REAL, crashes INTEGER, correct INTEGER, date TEXT, created_at INTEGER);`);
db.exec(`CREATE TABLE IF NOT EXISTS show_players(date TEXT, user_id INTEGER, lives INTEGER DEFAULT 0, joined_at INTEGER, won INTEGER DEFAULT 0, PRIMARY KEY(date, user_id));
CREATE TABLE IF NOT EXISTS show_answers(date TEXT, user_id INTEGER, i INTEGER, choice INTEGER, correct INTEGER, ms INTEGER, PRIMARY KEY(date, user_id, i));`);
db.exec(`CREATE TABLE IF NOT EXISTS knowme(user_id INTEGER PRIMARY KEY, code TEXT UNIQUE, items TEXT, created_at INTEGER);
CREATE TABLE IF NOT EXISTS knowme_tries(owner INTEGER, user_id INTEGER, score INTEGER, answers TEXT, created_at INTEGER, PRIMARY KEY(owner, user_id));`);
const q = (sql) => db.prepare(sql);
const one = (sql, ...a) => q(sql).get(...a);
const all = (sql, ...a) => q(sql).all(...a);
const run = (sql, ...a) => q(sql).run(...a);

// ---------- time (WAT = UTC+1, admin can shift the clock for testing) ----------
function clockOffset() { const r = one(`SELECT value FROM settings WHERE key='clock_offset'`); return r ? parseInt(r.value, 10) : 0; }
let OFFSET = clockOffset();
const now = () => Date.now() + OFFSET;
const watDate = (t = now()) => new Date(t + 3600000).toISOString().slice(0, 10);
const watHour = (t) => new Date(t + 3600000).getUTCHours();
function unlockAt(d) {
  if (d === 0) return 0;
  if (d === 26) return Date.UTC(YEAR, 11, 31, 18);
  return Date.UTC(YEAR, 11, d, 18); // 7pm WAT
}
function windowEnd(d) {
  if (d === 0) return Infinity;
  if (d === 26) return Date.UTC(YEAR + 1, 0, 1, 22, 59);
  if (d === 25) return Date.UTC(YEAR, 11, 27, 18);
  return unlockAt(d + 1);
}
const DAYS = Array.from({ length: 26 }, (_, i) => i + 1);
function liveDay(t = now()) { return DAYS.find(d => t >= unlockAt(d) && t < windowEnd(d)) || null; }
function nextDay(t = now()) { return DAYS.find(d => unlockAt(d) > t) || null; }
function latestOpened(t = now()) { let x = null; for (const d of DAYS) if (unlockAt(d) <= t) x = d; return x; }
const prevDay = (d) => (d === 1 ? null : d - 1);
const isMummy = (i) => i === 6;
const limitFor = (i) => (isMummy(i) ? MUMMY_MS : BASE_MS);

// streak as of right now, accounting for missed days and savers
function effectiveStreak(u) {
  if (!u.last_played_day) return 0;
  const t = now(); let mustHave = null;
  for (const d of DAYS) if (windowEnd(d) <= t) mustHave = d; // latest closed day
  if (mustHave === null || u.last_played_day >= mustHave) return u.streak;
  const missed = (u.last_played_day === 25 && mustHave === 25) ? 0 : mustHave - u.last_played_day;
  return missed <= u.savers ? u.streak : 0;
}

// ---------- badges ----------
const BADGES = {
  first: ['🎉', 'First timer', 'Finish your first December round'],
  perfect: ['💯', 'Perfect 7', 'Get all 7 right in a round'],
  streak3: ['🔥', 'On fire', 'Play 3 days in a row'],
  streak7: ['⚡', 'Unstoppable', 'Play 7 days in a row'],
  streak14: ['🏅', 'Two weeks strong', 'Play 14 days in a row'],
  streak25: ['👑', 'All of December', 'Play all 25 days'],
  speed: ['🏎️', 'Sharp sharp', 'Answer 5+ right with under 3s average'],
  mummy5: ['👵🏾', "Mummy's favourite", 'Get 5 Ask Mummy questions right'],
  ontime: ['⏰', 'On the dot', 'Play within 15 minutes of 7pm'],
  night: ['🌙', 'Night crawler', 'Finish a round between midnight and 4am'],
  inviter3: ['📣', 'Crowd puller', '3 friends joined with your link'],
  inviter10: ['🏆', 'Area champion', '10 friends joined with your link'],
  squad: ['🤝', 'Squad up', 'Create or join a squad'],
  sharer: ['📢', 'Town crier', 'Share your score on 5 different days'],
  traveller: ['🧳', 'Gidi to Abuja', 'Visit 3 places on Naija Trip'],
  explorer: ['🗺️', 'Naija explorer', 'Visit every place on Naija Trip'],
  santa: ['🎅🏾', 'Father Christmas', 'Send 5 gifts to your people'],
  loved: ['💝', 'Well loved', 'Receive 3 gifts from friends'],
  driver: ['🚗', 'Licence collected', 'Finish your first drive'],
  correct: ['😎', 'Correct driver', 'Finish a drive with 3 stars'],
  daily7: ['🛣️', 'Road master', 'Finish the Drive of the Day on 7 different days'],
  topdriver: ['🏁', 'Agbero no fit you', 'Finish top 3 in a Drive of the Day'],
  conductor: ['🗣️', 'Oshodi conductor', 'Carry 50 passengers in total'],
  home: ['🏠', 'I don reach home', 'Finish your Journey Home'],
  early: ['🥇', 'Early bird', 'Be one of the first 100 people in Nigeria to reach home'],
  live: ['🎤', 'Owambe champion', 'Survive every question at Owambe Night Live'],
  knowme: ['🫶🏾', 'Open book', 'Get 5 friends to take your "How well do you know me?" quiz'],
  party: ['🪩', 'Life of the party', 'Host 3 Party Mode games'],
};
function award(uid, b) {
  const r = run(`INSERT OR IGNORE INTO badges(user_id,badge,awarded_at) VALUES(?,?,?)`, uid, b, now());
  return r.changes ? b : null;
}

// ---------- helpers ----------
const rid = (n = 6) => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (const b of crypto.randomBytes(n)) s += c[b % c.length]; return s; };
function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('234')) d = '0' + d.slice(3);
  if (d.length === 10 && /^[789]/.test(d)) d = '0' + d;
  return /^0[789][01]\d{8}$/.test(d) ? d : null;
}
const maskPhone = (p) => p ? p.slice(0, 4) + '•••' + p.slice(-3) : '';
function ipOf(req) { return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || ''; }
function logEvent(uid, type, meta, ip) { run(`INSERT INTO events(user_id,type,meta,ip,created_at) VALUES(?,?,?,?,?)`, uid, type, meta ? JSON.stringify(meta).slice(0, 2000) : null, ip || null, now()); }
function touch(uid, ip, secs = 0) {
  run(`INSERT INTO activity(user_id,date,secs,hits) VALUES(?,?,?,1) ON CONFLICT(user_id,date) DO UPDATE SET secs=secs+excluded.secs, hits=hits+1`, uid, watDate(), secs);
  run(`UPDATE users SET last_seen=?, ip_last=?, time_spent=time_spent+? WHERE id=?`, now(), ip, secs, uid);
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- app ----------
const app = express();
app.set('trust proxy', true);
const json50 = express.json({ limit: '50kb' });
app.use((req, res, next) => req.path === '/api/swap/render' ? next() : json50(req, res, next)); // the AI swap photo route has its own 6mb limit

function auth(req, res, next) {
  const tok = (req.headers.authorization || '').replace('Bearer ', '');
  const s = tok && one(`SELECT user_id FROM sessions WHERE token=?`, tok);
  const u = s && one(`SELECT * FROM users WHERE id=?`, s.user_id);
  if (!u) return res.status(401).json({ error: 'Please sign in again.' });
  req.user = u; req.ipaddr = ipOf(req);
  touch(u.id, req.ipaddr);
  next();
}

app.get('/api/config', (req, res) => {
  res.json({ now: now(), year: YEAR, live: liveDay(), next: nextDay(), nextAt: nextDay() ? unlockAt(nextDay()) : null });
});

app.get('/api/ref/:code', (req, res) => {
  const u = one(`SELECT nickname FROM users WHERE ref_code=?`, String(req.params.code).toUpperCase());
  const s = req.query.squad ? one(`SELECT name FROM squads WHERE code=?`, String(req.query.squad).toUpperCase()) : null;
  const d = req.query.duel ? one(`SELECT d.type, u.nickname n FROM duels d JOIN users u ON u.id=d.creator WHERE d.code=?`, String(req.query.duel).toUpperCase()) : null;
  res.json({ inviter: u ? u.nickname : null, squad: s ? s.name : null, duel: d ? { type: d.type, by: d.n } : null });
});

app.post('/api/register', (req, res) => {
  const ip = ipOf(req);
  const phone = normPhone(req.body.phone);
  const nickname = String(req.body.nickname || '').trim().replace(/\s+/g, ' ');
  if (!phone) return res.status(400).json({ error: 'Enter a valid Nigerian number, like 0803 123 4567.' });
  const existing = one(`SELECT * FROM users WHERE phone=?`, phone);
  if (existing) {
    if (existing.nick_lower !== nickname.toLowerCase()) return res.status(409).json({ error: `This number already plays as another nickname. Type that nickname to continue.` });
    const token = crypto.randomBytes(24).toString('hex');
    run(`INSERT INTO sessions VALUES(?,?,?)`, token, existing.id, now());
    logEvent(existing.id, 'login', { ua: (req.headers['user-agent'] || '').slice(0, 160) }, ip);
    return res.json({ token, returning: true });
  }
  if (!/^[\p{L}\p{N} _.'-]{2,18}$/u.test(nickname)) return res.status(400).json({ error: 'Nickname should be 2 to 18 letters or numbers.' });
  if (one(`SELECT id FROM users WHERE nick_lower=?`, nickname.toLowerCase())) return res.status(409).json({ error: 'That nickname is taken. Try another one.' });
  const today = Date.now() - 86400000;
  const perIp = one(`SELECT COUNT(*) n FROM users WHERE ip_signup=? AND created_at>?`, ip, today).n;
  if (perIp >= 40) return res.status(429).json({ error: 'Too many sign-ups from this network today. Try again tomorrow.' });
  const state = String(req.body.state || '').slice(0, 40) || null;
  const school = String(req.body.school || '').slice(0, 80) || null;
  const ref = req.body.ref ? one(`SELECT id FROM users WHERE ref_code=?`, String(req.body.ref).toUpperCase()) : null;
  let code; do { code = rid(6); } while (one(`SELECT 1 FROM users WHERE ref_code=?`, code));
  const r = run(`INSERT INTO users(phone,nickname,nick_lower,state,school,ref_code,referred_by,ip_signup,ip_last,ua,created_at,last_seen,lang)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, phone, nickname, nickname.toLowerCase(), state, school, code, ref ? ref.id : null, ip, ip,
    (req.headers['user-agent'] || '').slice(0, 200), now(), now(), req.body.lang === 'pg' ? 'pg' : 'en');
  const uid = Number(r.lastInsertRowid);
  const token = crypto.randomBytes(24).toString('hex');
  run(`INSERT INTO sessions VALUES(?,?,?)`, token, uid, now());
  logEvent(uid, 'signup', { state, school, ref: req.body.ref || null, src: req.body.src || null }, ip);
  if (ref) { run(`UPDATE users SET coins=coins+100 WHERE id=?`, uid); notify(ref.id, 'friend', `🎉 ${nickname} joined with your link. You get +200 points and coins once they play a round.`); }
  if (req.body.duel) joinDuel(uid, String(req.body.duel).toUpperCase());
  if (req.body.squad) joinSquad(uid, String(req.body.squad).toUpperCase(), ip);
  touch(uid, ip);
  res.json({ token, returning: false });
});

function dayStatus(u) {
  const played = all(`SELECT day, official, correct, points, finished_at FROM plays WHERE user_id=? AND finished_at IS NOT NULL ORDER BY id`, u.id);
  const t = now();
  return [0, ...DAYS].map(d => {
    const off = played.find(p => p.day === d && p.official);
    const best = played.filter(p => p.day === d).sort((a, b) => b.correct - a.correct)[0];
    let status;
    if (d === 0) status = best ? 'done' : 'open';
    else if (t < unlockAt(d)) status = 'locked';
    else if (off) status = 'played';
    else if (t < windowEnd(d)) status = 'live';
    else status = best ? 'practiced' : 'missed';
    return { day: d, status, correct: off ? off.correct : (best ? best.correct : null), points: off ? off.points : 0, unlockAt: unlockAt(d) };
  });
}

function rankOf(u) {
  const better = one(`SELECT COUNT(*) n FROM users WHERE total_points>?`, u.total_points).n;
  return u.total_points > 0 ? better + 1 : null;
}

app.get('/api/me', auth, (req, res) => {
  const u = one(`SELECT * FROM users WHERE id=?`, req.user.id);
  const refs = one(`SELECT COUNT(*) n FROM users WHERE referred_by=?`, u.id).n;
  const badges = all(`SELECT badge, awarded_at FROM badges WHERE user_id=?`, u.id);
  const stats = one(`SELECT COUNT(*) rounds, COALESCE(SUM(correct),0) correct FROM plays WHERE user_id=? AND finished_at IS NOT NULL`, u.id);
  const squads = all(`SELECT s.code, s.name, (SELECT COUNT(*) FROM squad_members m2 WHERE m2.squad_id=s.id) members FROM squads s JOIN squad_members m ON m.squad_id=s.id WHERE m.user_id=?`, u.id);
  const live = liveDay();
  res.json({
    user: { nickname: u.nickname, phone: maskPhone(u.phone), state: u.state, school: u.school, refCode: u.ref_code, lang: u.lang, waOptin: !!u.wa_optin,
      points: u.total_points, coins: u.coins, hat: !!u.hat, giftsNew: one(`SELECT COUNT(*) n FROM gifts WHERE to_id=? AND opened=0`, u.id).n, streak: effectiveStreak(u), bestStreak: u.best_streak, savers: u.savers, rank: rankOf(u), refs, timeSpent: u.time_spent, premium: (u.premium_until || 0) > now() },
    stats: { rounds: stats.rounds, accuracy: stats.rounds ? Math.round(100 * stats.correct / (stats.rounds * 7)) : 0 },
    badges, allBadges: BADGES, squads, days: dayStatus(u), now: now(), live, next: nextDay(), nextAt: nextDay() ? unlockAt(nextDay()) : null,
    inbox: all(`SELECT id, kind, text, link, created_at FROM inbox WHERE user_id=? AND seen=0 ORDER BY id DESC LIMIT 5`, u.id),
    journey: (() => { const v = journeyView(u.id); return v ? { at: v.at, next: v.next, home: v.home, leg: v.leg, legs: v.legs, unlocked: v.unlocked, arrived: v.arrived, road: v.road, km: v.km, kmDone: v.kmDone, kmAll: v.kmAll } : null; })(),
    show: (() => { const d = watDate(), ph = showPhase(d); return { phase: ph.phase, startsAt: ph.T0, pot: SHOW_POT, players: one(`SELECT COUNT(*) n FROM show_players WHERE date=?`, d).n, joined: !!one(`SELECT 1 FROM show_players WHERE date=? AND user_id=?`, d, u.id) }; })(),
    towns: Object.fromEntries(JOURNEY.towns.map(t => [t.id, t.name])),
    stocking: { open: !one(`SELECT 1 FROM stockings WHERE user_id=? AND date=?`, u.id, watDate()), streak: stockingStreak(u.id) },
    drive: { done: !!one(`SELECT 1 FROM drive_runs WHERE user_id=? AND date=?`, u.id, watDate()), daily: dailyOf(), lead: one(`SELECT u2.nickname n, r.total FROM drive_runs r JOIN users u2 ON u2.id=r.user_id WHERE r.date=? ORDER BY r.total ASC LIMIT 1`, watDate()) || null, garage: garageOf(u) },
    rivalry: rivalry(live || latestOpened()), sharedToday: !!one(`SELECT 1 FROM shares WHERE user_id=? AND date=?`, u.id, watDate()),
  });
});

app.post('/api/settings', auth, (req, res) => {
  const b = req.body;
  if (b.lang) run(`UPDATE users SET lang=? WHERE id=?`, b.lang === 'pg' ? 'pg' : 'en', req.user.id);
  if (typeof b.waOptin === 'boolean') { run(`UPDATE users SET wa_optin=? WHERE id=?`, b.waOptin ? 1 : 0, req.user.id); logEvent(req.user.id, b.waOptin ? 'reminder_on' : 'reminder_off', null, req.ipaddr); }
  if (b.state) run(`UPDATE users SET state=? WHERE id=?`, String(b.state).slice(0, 40), req.user.id);
  if (typeof b.school === 'string') run(`UPDATE users SET school=? WHERE id=?`, b.school.slice(0, 80) || null, req.user.id);
  res.json({ ok: true });
});

// ---------- the question pool: curated days + rotating bank + approved player/AI questions ----------
// Every player gets a different mix each day, and nobody sees the same question twice until the pool runs dry.
let POOL = null;
function pool() {
  if (POOL) return POOL;
  const all2 = [];
  for (const [d, qs] of Object.entries(QUESTIONS)) qs.forEach((x, i) => all2.push({ id: `d${d}_${i}`, c: x.c, q: x.q, o: x.o, by: null }));
  BANK.forEach((x, i) => all2.push({ id: `b${i}`, c: x.c, q: x.q, o: x.o, by: null }));
  all(`SELECT k.id, k.c, k.q, k.o, u.nickname n, u.state st FROM qbank k LEFT JOIN users u ON u.id=k.by_user WHERE k.status='live'`).forEach(r => { try { all2.push({ id: `x${r.id}`, c: r.c, q: r.q, o: JSON.parse(r.o), by: r.n ? `${r.n}${r.st ? ' from ' + r.st : ''}` : null }); } catch {} });
  POOL = { all: all2, byId: new Map(all2.map(x => [x.id, x])), byCat: all2.reduce((m, x) => { (m[x.c] = m[x.c] || []).push(x); return m; }, {}) };
  return POOL;
}
const resetPool = () => { POOL = null; };
const pick = (a) => a[crypto.randomInt(a.length)];
function buildRound(uid, day) {
  const P = pool(), seen = new Set(all(`SELECT qid FROM seen WHERE user_id=?`, uid).map(r => r.qid));
  const base = QUESTIONS[day] || QUESTIONS[1];
  const cats = base.map(x => x.c);
  // December flavour: two slots become Christmas and Travel questions
  const swap = [day % 6, (day + 3) % 6];
  if (P.byCat.Christmas) cats[swap[0]] = 'Christmas';
  if (P.byCat.Travel) cats[swap[1]] = 'Travel';
  const used = new Set();
  return cats.map((cat, i) => {
    const cur = base[i] && `d${day}_${i}`;
    let cands = (P.byCat[cat] || P.all).filter(x => !seen.has(x.id) && !used.has(x.id));
    if (!cands.length) cands = (P.byCat[cat] || P.all).filter(x => !used.has(x.id));
    let x = cur && cats[i] === base[i].c && !seen.has(cur) && crypto.randomInt(100) < 35 ? P.byId.get(cur) : pick(cands);
    used.add(x.id);
    return { id: x.id, c: x.c, q: x.q, o: x.o, by: x.by };
  });
}
const qsOf = (play, st) => st.qs || QUESTIONS[play.day];

// ---------- rounds ----------
app.post('/api/round/start', auth, (req, res) => {
  const d = parseInt(req.body.day, 10), u = req.user, t = now();
  if (!(d >= 0 && d <= 26) || !QUESTIONS[d]) return res.status(400).json({ error: 'Unknown day.' });
  if (t < unlockAt(d)) return res.status(403).json({ error: 'This day is still locked.' });
  const inWindow = d > 0 && t < windowEnd(d);
  const off = one(`SELECT * FROM plays WHERE user_id=? AND day=? AND official=1`, u.id, d);
  if (inWindow && off && off.finished_at) return res.json({ alreadyPlayed: true });
  let play = inWindow ? off : one(`SELECT * FROM plays WHERE user_id=? AND day=? AND official=0 AND finished_at IS NULL ORDER BY id DESC`, u.id, d);
  if (!play) {
    const qs = buildRound(u.id, d), perms = qs.map(() => shuffle([0, 1, 2, 3]));
    const r = run(`INSERT INTO plays(user_id,day,official,state,started_at) VALUES(?,?,?,?,?)`, u.id, d, inWindow ? 1 : 0, JSON.stringify({ qs, perms, i: 0, servedAt: null, log: [] }), t);
    play = one(`SELECT * FROM plays WHERE id=?`, Number(r.lastInsertRowid));
    logEvent(u.id, 'round_start', { day: d, official: inWindow, minsAfterUnlock: d ? Math.round((t - unlockAt(d)) / 60000) : null }, req.ipaddr);
  }
  const st0 = JSON.parse(play.state);
  res.json({ playId: play.id, day: d, official: !!play.official, total: qsOf(play, st0).length, index: st0.i });
});

app.post('/api/round/next', auth, (req, res) => {
  const play = one(`SELECT * FROM plays WHERE id=? AND user_id=?`, req.body.playId, req.user.id);
  if (!play || play.finished_at) return res.status(400).json({ error: 'Round not active.' });
  const st = JSON.parse(play.state);
  const QS = qsOf(play, st), qd = QS[st.i];
  if (!st.servedAt) { st.servedAt = now(); run(`UPDATE plays SET state=? WHERE id=?`, JSON.stringify(st), play.id); if (qd.id) run(`INSERT OR IGNORE INTO seen(user_id,qid) VALUES(?,?)`, req.user.id, qd.id); }
  const limit = limitFor(st.i) + ((st.extra || {})[st.i] || 0);
  res.json({ index: st.i, used: st.used || {}, coins: req.user.coins, total: QS.length, category: qd.c, question: qd.q, by: qd.by || null, options: st.perms[st.i].map(k => qd.o[k]),
    limitMs: limit, remainingMs: Math.max(0, limit - (now() - st.servedAt)), mummy: isMummy(st.i) });
});

app.post('/api/round/answer', auth, (req, res) => {
  const u = req.user;
  const play = one(`SELECT * FROM plays WHERE id=? AND user_id=?`, req.body.playId, u.id);
  if (!play || play.finished_at) return res.status(400).json({ error: 'Round not active.' });
  const st = JSON.parse(play.state);
  if (!st.servedAt) return res.status(400).json({ error: 'Question not served.' });
  const i = st.i, limit = limitFor(i) + ((st.extra || {})[i] || 0), elapsed = now() - st.servedAt;
  const choice = parseInt(req.body.choice, 10);
  const perm = st.perms[i];
  const timedOut = elapsed > limit + GRACE_MS || !(choice >= 0 && choice <= 3);
  const correct = !timedOut && perm[choice] === 0;
  const ms = Math.min(elapsed, limit);
  const streakBefore = play.official ? effectiveStreak(u) : 0;
  let pts = 0;
  if (correct && play.official) {
    const base = isMummy(i) ? 200 : 100;
    const speed = Math.round(50 * Math.max(0, 1 - ms / limit));
    pts = Math.round((base + speed) * (1 + 0.05 * Math.min(streakBefore, 10)));
  }
  const QS = qsOf(play, st), qid = (QS[i] && QS[i].id) || `d${play.day}_${i}`;
  run(`INSERT INTO answers(play_id,user_id,day,qidx,official,correct,ms,points,created_at,qid) VALUES(?,?,?,?,?,?,?,?,?,?)`, play.id, u.id, play.day, i, play.official, correct ? 1 : 0, ms, pts, now(), qid);
  st.log.push({ c: correct ? 1 : 0, ms, pts });
  const agg = one(`SELECT COUNT(*) n, SUM(correct) c FROM answers WHERE qid=?`, qid);
  const pct = agg.n ? Math.round(100 * agg.c / agg.n) : 100;
  const out = { correct, timedOut, correctIndex: perm.indexOf(0), points: pts, pct, index: i };
  st.i += 1; st.servedAt = null;
  if (st.i >= QS.length) {
    Object.assign(out, finishRound(play, st, u, req.ipaddr));
  } else run(`UPDATE plays SET state=? WHERE id=?`, JSON.stringify(st), play.id);
  res.json(out);
});

function finishRound(play, st, u, ip) {
  const t = now();
  const nCorrect = st.log.reduce((a, x) => a + x.c, 0);
  const avgMs = Math.round(st.log.reduce((a, x) => a + x.ms, 0) / st.log.length);
  let pts = st.log.reduce((a, x) => a + x.pts, 0);
  const newBadges = [];
  let perfectBonus = 0, streak = u.streak, saversUsed = 0;
  if (play.official) {
    if (nCorrect === st.log.length) { perfectBonus = PERFECT_BONUS; pts += perfectBonus; }
    const pd = prevDay(play.day); let savers = u.savers;
    if (!u.last_played_day || pd === null) streak = 1;
    else if (u.last_played_day === pd) streak = u.streak + 1;
    else { const missed = pd - u.last_played_day; if (missed > 0 && missed <= savers) { savers -= missed; saversUsed = missed; streak = u.streak + 1; } else streak = 1; }
    run(`UPDATE users SET total_points=total_points+?, coins=coins+?, streak=?, best_streak=MAX(best_streak,?), last_played_day=?, savers=? WHERE id=?`, pts, pts, streak, streak, play.day, savers, u.id);
    newBadges.push(award(u.id, 'first'));
    if (nCorrect === 7) newBadges.push(award(u.id, 'perfect'));
    if (streak >= 3) newBadges.push(award(u.id, 'streak3'));
    if (streak >= 7) newBadges.push(award(u.id, 'streak7'));
    if (streak >= 14) newBadges.push(award(u.id, 'streak14'));
    if (streak >= 25) newBadges.push(award(u.id, 'streak25'));
    if (nCorrect >= 5 && avgMs < 3000) newBadges.push(award(u.id, 'speed'));
    if (play.started_at - unlockAt(play.day) < 15 * 60000) newBadges.push(award(u.id, 'ontime'));
    const mc = one(`SELECT COUNT(*) n FROM answers WHERE user_id=? AND qidx=6 AND correct=1 AND official=1`, u.id).n;
    if (mc >= 5) newBadges.push(award(u.id, 'mummy5'));
  }
  if (watHour(t) < 4) newBadges.push(award(u.id, 'night'));
  run(`UPDATE plays SET state=?, finished_at=?, correct=?, points=?, avg_ms=? WHERE id=?`, JSON.stringify(st), t, nCorrect, pts, avgMs, play.id);
  logEvent(u.id, 'round_complete', { day: play.day, official: !!play.official, correct: nCorrect, points: pts, avgMs }, ip);
  // referral reward: first completed round by an invited player
  if (u.referred_by && !u.ref_rewarded) {
    run(`UPDATE users SET ref_rewarded=1 WHERE id=?`, u.id);
    const refUser = one(`SELECT * FROM users WHERE id=?`, u.referred_by);
    const rewarded = one(`SELECT COUNT(*) n FROM users WHERE referred_by=? AND ref_rewarded=1`, refUser.id).n;
    if (rewarded <= MAX_REF_REWARDS) {
      run(`UPDATE users SET total_points=total_points+?, coins=coins+?, savers=MIN(?, savers+1) WHERE id=?`, REF_POINTS, REF_POINTS, MAX_SAVERS, refUser.id);
      logEvent(refUser.id, 'referral_reward', { friend: u.nickname }, null);
    }
    if (rewarded >= 3) award(refUser.id, 'inviter3');
    if (rewarded >= 10) award(refUser.id, 'inviter10');
  }
  const fresh = one(`SELECT * FROM users WHERE id=?`, u.id);
  const dayRank = play.official ? one(`SELECT COUNT(*) n FROM plays WHERE day=? AND official=1 AND finished_at IS NOT NULL AND (points>? OR (points=? AND finished_at<?))`, play.day, pts, pts, t).n + 1 : null;
  const dayPlayers = play.official ? one(`SELECT COUNT(*) n FROM plays WHERE day=? AND official=1 AND finished_at IS NOT NULL`, play.day).n : null;
  return { done: true, summary: { day: play.day, official: !!play.official, correct: nCorrect, total: st.log.length, grid: st.log.map(x => x.c), points: pts,
    perfectBonus, streak: play.official ? streak : effectiveStreak(fresh), saversUsed, totalPoints: fresh.total_points, dayRank, dayPlayers, rank: rankOf(fresh),
    newBadges: newBadges.filter(Boolean) } };
}

const LIFELINES = { fifty: 80, time: 50 };
app.post('/api/round/lifeline', auth, (req, res) => {
  const kind = req.body.kind, cost = LIFELINES[kind];
  if (!cost) return res.status(400).json({ error: 'Unknown power-up.' });
  const play = one(`SELECT * FROM plays WHERE id=? AND user_id=?`, req.body.playId, req.user.id);
  if (!play || play.finished_at) return res.status(400).json({ error: 'Round not active.' });
  const st = JSON.parse(play.state); st.used = st.used || {}; st.extra = st.extra || {};
  if (!st.servedAt) return res.status(400).json({ error: 'Wait for the question.' });
  if (st.used[kind]) return res.status(400).json({ error: 'You already used this power-up in this round.' });
  const u = one(`SELECT coins FROM users WHERE id=?`, req.user.id);
  if (u.coins < cost) return res.status(400).json({ error: `You need ${cost} coins for this.` });
  run(`UPDATE users SET coins=coins-? WHERE id=?`, cost, req.user.id);
  st.used[kind] = true;
  const out = { coins: u.coins - cost };
  if (kind === 'fifty') { const wrong = [0, 1, 2, 3].filter(k => st.perms[st.i][k] !== 0); shuffle(wrong); out.hide = wrong.slice(0, 2); }
  else { st.extra[st.i] = (st.extra[st.i] || 0) + 5000; out.addMs = 5000; }
  run(`UPDATE plays SET state=? WHERE id=?`, JSON.stringify(st), play.id);
  logEvent(req.user.id, 'powerup', { kind, day: play.day, q: st.i + 1 }, req.ipaddr);
  res.json(out);
});

// ---------- Naija Trip ----------
const HOMES = { Lagos: [6.52, 3.38], Oyo: [7.38, 3.90], Ogun: [7.15, 3.35], Osun: [7.77, 4.56], Ondo: [7.25, 5.19], Ekiti: [7.62, 5.22], 'FCT Abuja': [9.06, 7.49],
  Kwara: [8.50, 4.55], Rivers: [4.82, 7.03], Kano: [12.00, 8.52], Enugu: [6.45, 7.50], Delta: [6.20, 6.73], Edo: [6.34, 5.62], Kaduna: [10.52, 7.44], 'Cross River': [4.95, 8.32],
  Anambra: [6.21, 7.07], Imo: [5.48, 7.03], Plateau: [9.90, 8.86], 'Akwa Ibom': [5.03, 7.93], Benue: [7.73, 8.52], Kogi: [7.80, 6.74], Niger: [9.61, 6.55] };
const MODES = [
  { id: 'okada', name: 'Okada', emoji: '🛵', base: 20, perKm: 2, maxKm: 40, ms: 2200, note: 'Fast in traffic, hold your cap' },
  { id: 'keke', name: 'Keke', emoji: '🛺', base: 15, perKm: 1.5, maxKm: 30, ms: 2600, note: 'Starts from your door, fits any corner' },
  { id: 'ride', name: 'Ride-hail', emoji: '🚗', base: 80, perKm: 1.2, maxKm: 220, ms: 2800, note: 'AC and your own playlist' },
  { id: 'danfo', name: 'Danfo or bus', emoji: '🚐', base: 50, perKm: 0.6, maxKm: 1300, ms: 3800, note: 'Cheapest, plenty of gist' },
  { id: 'train', name: 'Train', emoji: '🚆', base: 120, perKm: 0.5, minKm: 50, ms: 3200, note: 'Smooth and steady' },
  { id: 'flight', name: 'Flight', emoji: '✈️', base: 400, perKm: 0.4, minKm: 250, ms: 2600, note: 'Fastest, costs the most' },
];
const DRIVEN = ['okada', 'keke', 'ride', 'danfo'];            // modes you drive yourself in Naija Drive
const CAPACITY = { okada: 1, keke: 3, ride: 3, danfo: 5 };   // friends you can pick up on the road
const LIFT_TTL = 48 * 3600000;
const FINES = { police: 30, vio: 20, frsc: 20, customs: 25, radar: 20, lastma: 25 };
const EVENTS = {
  okada: [['Shortcut through a back street 💨', 5], ['Rider was playing Asake at full volume 🎶', 0], ['Hold your cap! The wind almost took it 🧢', 0]],
  keke: [['Keke squeezed through a gap no car can enter 😎', 5], ['Another passenger sat on half your seat 😅', 0], ['Rain started, the side flaps came down ☔', 0]],
  ride: [['Surge pricing hit you 😩', -20], ["Driver's AC is working perfectly 🥶", 0], ['Driver gave you free gist about Lagos politics 🗣️', 0]],
  danfo: [['Conductor said "no change" 😤', -10], ['Go-slow on the expressway 🐢', 0], ['Driver played Fuji the whole way 🎶', 10], ['A passenger started preaching 🙏🏾', 0]],
  train: [['Smooth ride, you slept off 😴', 0], ['Bought puff-puff on board 🍩', -10], ['Scenery was too sweet 🌿', 5]],
  flight: [['Flight delayed 40 minutes ⏳', 0], ['Free drink on board 🥤', 10], ['Window seat with a clear view 🌤️', 5]],
};
function km(a, b) { const R = 6371, t = Math.PI / 180, dLa = (b[0] - a[0]) * t, dLo = (b[1] - a[1]) * t; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dLo / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.25); }
function whereIs(u) {
  const p = PLACES.find(x => x.id === u.loc);
  if (p) return { id: p.id, name: p.name, city: p.city, lat: p.lat, lon: p.lon };
  if (u.home_lat != null && u.home_lon != null) {
    // device location: label it with the nearest state we know
    let best = 'Lagos', bd = Infinity;
    for (const [s, c] of Object.entries(HOMES)) { const d = km([u.home_lat, u.home_lon], c); if (d < bd) { bd = d; best = s; } }
    return { id: 'home', name: 'Your location', city: best, lat: u.home_lat, lon: u.home_lon, geo: true };
  }
  const h = HOMES[u.state] || HOMES.Lagos;
  return { id: 'home', name: 'Home', city: u.state && HOMES[u.state] ? u.state : 'Lagos', lat: h[0], lon: h[1] };
}
function quotes(from, to) {
  const d = Math.max(3, km([from.lat, from.lon], [to.lat, to.lon]));
  return { km: d, modes: MODES.map(m => ({ id: m.id, name: m.name, emoji: m.emoji, note: m.note, ok: !(m.maxKm && d > m.maxKm) && !(m.minKm && d < m.minKm), cost: Math.round(m.base + m.perKm * d) })) };
}
// Save the browser's location as the player's start point and put them there.
app.post('/api/trip/locate', auth, (req, res) => {
  const lat = Number(req.body.lat), lon = Number(req.body.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'Could not read your location.' });
  if (lat < 4 || lat > 14 || lon < 2.6 || lon > 14.7) return res.status(400).json({ error: 'Your location looks like it is outside Nigeria, so we will start you from your state.', outside: true });
  const u = one(`SELECT trip FROM users WHERE id=?`, req.user.id);
  if (u.trip) return res.status(400).json({ error: 'Answer the question at your current stop first.' });
  run(`UPDATE users SET home_lat=?, home_lon=?, loc=NULL WHERE id=?`, Math.round(lat * 1e4) / 1e4, Math.round(lon * 1e4) / 1e4, req.user.id);
  logEvent(req.user.id, 'trip_locate', null, ipOf(req));
  res.json({ ok: true });
});
app.get('/api/trip', auth, (req, res) => {
  const u = one(`SELECT * FROM users WHERE id=?`, req.user.id), here = whereIs(u);
  const visits = all(`SELECT place, correct FROM visits WHERE user_id=?`, u.id);
  const pending = u.trip ? JSON.parse(u.trip) : null;
  const lifts = {
    incoming: all(`SELECT l.id, u2.nickname n, l.created_at at FROM lifts l JOIN users u2 ON u2.id=l.rider WHERE l.driver=? AND l.status='wait' AND l.created_at>? ORDER BY l.id DESC LIMIT 10`, u.id, now() - LIFT_TTL),
    outgoing: all(`SELECT l.id, u2.nickname n, l.created_at at FROM lifts l JOIN users u2 ON u2.id=l.driver WHERE l.rider=? AND l.status='wait' AND l.created_at>? ORDER BY l.id DESC LIMIT 10`, u.id, now() - LIFT_TTL),
  };
  res.json({ coins: u.coins, here, lifts, geo: u.home_lat != null, pending: pending ? { place: pending.place, q: pending.q, options: pending.options } : null,
    places: PLACES.map(p => { const v = visits.find(x => x.place === p.id); return { id: p.id, name: p.name, city: p.city, emoji: p.emoji, lat: p.lat, lon: p.lon, photo: p.photo, credit: p.credit, src: p.src,
      visited: !!v, correct: v ? v.correct : null, fact: v && v.correct !== null ? p.fact : null, quote: p.id === here.id ? null : quotes(here, p) }; }) });
});
app.post('/api/trip/go', auth, (req, res) => {
  const u = one(`SELECT * FROM users WHERE id=?`, req.user.id);
  if (u.trip) return res.status(400).json({ error: 'Answer the question at your current stop first.' });
  const to = PLACES.find(p => p.id === req.body.to), here = whereIs(u);
  if (!to || to.id === here.id) return res.status(400).json({ error: 'Pick somewhere new to go.' });
  const q = quotes(here, to), m = q.modes.find(x => x.id === req.body.mode);
  if (!m || !m.ok) return res.status(400).json({ error: 'That ride is not available for this distance.' });
  const myFriends = new Set(friendsOf(u.id).map(f => f.id));
  const pax = [...new Set((req.body.passengers || []).map(Number))].filter(id => myFriends.has(id)).slice(0, m.id === 'okada' ? 1 : 4);
  m.cost += pax.length * SEAT;
  if (u.coins < m.cost) return res.status(400).json({ error: `You need ${m.cost} coins for this ride. Play rounds to earn more.` });
  const evs = EVENTS[m.id], ev = evs[crypto.randomInt(evs.length)];
  const coins = Math.max(0, u.coins - m.cost + ev[1]);
  const first = !one(`SELECT 1 FROM visits WHERE user_id=? AND place=?`, u.id, to.id);
  let quiz = null;
  if (first) {
    const perm = shuffle([0, 1, 2, 3]);
    quiz = { place: to.id, perm, q: to.quiz.q, options: perm.map(k => to.quiz.o[k]) };
    run(`INSERT INTO visits(user_id,place,mode,first_at,correct) VALUES(?,?,?,?,NULL)`, u.id, to.id, m.id, now());
  }
  run(`UPDATE users SET coins=?, loc=?, trip=?, drive=? WHERE id=?`, coins, to.id, quiz ? JSON.stringify(quiz) : null, DRIVEN.includes(m.id) ? 1 : 0, u.id);
  for (const pid of pax) {
    run(`INSERT OR IGNORE INTO visits(user_id,place,mode,first_at,correct) VALUES(?,?,?,?,-1)`, pid, to.id, 'passenger', now());
    run(`UPDATE users SET coins=coins+20 WHERE id=?`, pid);
    notify(pid, 'ride', `${m.emoji} ${u.nickname} carried you along to ${to.name}! Stamp added to your passport and +20 coins.`);
  }
  logEvent(u.id, 'trip_go', { from: here.id, to: to.id, mode: m.id, km: q.km, cost: m.cost, passengers: pax.length }, req.ipaddr);
  // friends who asked this driver for a lift wait at bus stops on the road
  const pickups = DRIVEN.includes(m.id) ? all(`SELECT l.id, l.rider, u2.nickname n FROM lifts l JOIN users u2 ON u2.id=l.rider WHERE l.driver=? AND l.status='wait' AND l.created_at>? ORDER BY l.id LIMIT ?`,
    u.id, now() - LIFT_TTL, CAPACITY[m.id] || 1).filter(p => !pax.includes(p.rider)).map(p => ({ id: p.id, n: p.n })) : [];
  res.json({ pickups, from: here, to: { id: to.id, name: to.name, city: to.city, lat: to.lat, lon: to.lon, emoji: to.emoji, photo: to.photo, fact: first ? null : to.fact },
    km: q.km, mode: MODES.find(x => x.id === m.id), cost: m.cost, passengers: pax.map(id => one(`SELECT nickname FROM users WHERE id=?`, id).nickname), event: { text: ev[0], delta: ev[1] }, coins, quiz: quiz ? { q: quiz.q, options: quiz.options } : null });
});
// ---------- friends, inbox, challenges ----------
const SEAT = 25;
function notify(uid, kind, text, link) { run(`INSERT INTO inbox(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)`, uid, kind, text, link || null, now()); }
function friendsOf(uid) {
  return all(`SELECT DISTINCT u.id, u.nickname, u.state, u.total_points, u.last_seen FROM users u WHERE u.id!=? AND (
      u.id IN (SELECT m2.user_id FROM squad_members m1 JOIN squad_members m2 ON m1.squad_id=m2.squad_id WHERE m1.user_id=?)
      OR u.referred_by=? OR u.id=(SELECT referred_by FROM users WHERE id=?)
      OR u.id IN (SELECT p2.user_id FROM duel_players p1 JOIN duel_players p2 ON p1.duel_id=p2.duel_id WHERE p1.user_id=?))
    ORDER BY u.last_seen DESC LIMIT 60`, uid, uid, uid, uid, uid);
}
app.get('/api/friends', auth, (req, res) => {
  res.json({ rows: friendsOf(req.user.id).map(f => ({ id: f.id, n: f.nickname, s: f.state, v: f.total_points, online: now() - f.last_seen < 120000 })) });
});
app.post('/api/inbox/seen', auth, (req, res) => { run(`UPDATE inbox SET seen=1 WHERE user_id=?`, req.user.id); res.json({ ok: true }); });
app.get('/api/live/:day', auth, (req, res) => {
  const ids = friendsOf(req.user.id).map(f => f.id); if (!ids.length) return res.json({ rows: [] });
  const rows = all(`SELECT u.nickname n, p.state, p.finished_at, p.correct FROM plays p JOIN users u ON u.id=p.user_id WHERE p.day=? AND p.user_id IN (${ids.map(() => '?').join(',')}) ORDER BY p.id DESC`, parseInt(req.params.day, 10), ...ids);
  const seen = new Set(), out = [];
  for (const r of rows) { if (seen.has(r.n)) continue; seen.add(r.n); const st = JSON.parse(r.state); out.push({ n: r.n, answered: st.log.length, correct: st.log.reduce((a, x) => a + x.c, 0), done: !!r.finished_at }); }
  res.json({ rows: out.slice(0, 6) });
});
const DUEL_TYPES = { lagos: 'Do you know Lagos?', abuja: 'Do you know Abuja?', drive: 'Lagos drive race' };
function joinDuel(uid, code) {
  const d = one(`SELECT * FROM duels WHERE code=?`, code); if (!d) return { error: 'Challenge not found.' };
  const n = one(`SELECT COUNT(*) n FROM duel_players WHERE duel_id=?`, d.id).n;
  if (!one(`SELECT 1 FROM duel_players WHERE duel_id=? AND user_id=?`, d.id, uid)) {
    if (n >= 8) return { error: 'This challenge is full.' };
    run(`INSERT INTO duel_players(duel_id,user_id,joined_at) VALUES(?,?,?)`, d.id, uid, now());
    const me = one(`SELECT nickname FROM users WHERE id=?`, uid).nickname;
    if (d.creator !== uid) notify(d.creator, 'duel', `⚔️ ${me} accepted your "${DUEL_TYPES[d.type]}" challenge.`, d.code);
  }
  return { code: d.code };
}
app.post('/api/duel/create', auth, (req, res) => {
  const type = req.body.type; if (!DUEL_TYPES[type]) return res.status(400).json({ error: 'Unknown challenge.' });
  let code; do { code = rid(5); } while (one(`SELECT 1 FROM duels WHERE code=?`, code));
  const qset = type === 'drive' ? null : JSON.stringify(shuffle(CITY[type].map((_, i) => i)).slice(0, 7));
  run(`INSERT INTO duels(code,type,creator,created_at,seed,qset) VALUES(?,?,?,?,?,?)`, code, type, req.user.id, now(), crypto.randomInt(1, 2 ** 31), qset);
  joinDuel(req.user.id, code);
  for (const id of (req.body.invite || []).map(Number)) if (friendsOf(req.user.id).some(f => f.id === id)) notify(id, 'duel', `⚔️ ${req.user.nickname} challenged you: "${DUEL_TYPES[type]}". Tap to play.`, code);
  logEvent(req.user.id, 'duel_create', { code, type }, req.ipaddr);
  res.json({ code, type, title: DUEL_TYPES[type] });
});
app.post('/api/duel/join', auth, (req, res) => { const r = joinDuel(req.user.id, String(req.body.code || '').toUpperCase()); if (r.error) return res.status(400).json(r); logEvent(req.user.id, 'duel_join', r, req.ipaddr); res.json(r); });
function duelView(d, uid) {
  const ps = all(`SELECT p.*, u.nickname FROM duel_players p JOIN users u ON u.id=p.user_id WHERE p.duel_id=? ORDER BY p.joined_at`, d.id);
  const allDone = ps.length >= 2 && ps.every(p => p.done_at);
  if (allDone && !d.rewarded) {
    const best = d.type === 'drive' ? ps.slice().sort((a, b) => (a.secs + 3 * a.crashes) - (b.secs + 3 * b.crashes))[0] : ps.slice().sort((a, b) => b.score - a.score || a.done_at - b.done_at)[0];
    run(`UPDATE duels SET rewarded=1 WHERE id=?`, d.id); run(`UPDATE users SET coins=coins+100, total_points=total_points+50 WHERE id=?`, best.user_id);
    ps.forEach(p => { if (p.user_id !== best.user_id) notify(p.user_id, 'duel', `🏆 ${best.nickname} won "${DUEL_TYPES[d.type]}". Run it back?`, d.code); else notify(p.user_id, 'duel', `🏆 You won "${DUEL_TYPES[d.type]}"! +100 coins, +50 points.`, d.code); });
  }
  return { code: d.code, type: d.type, title: DUEL_TYPES[d.type], seed: d.seed, total: 7, allDone, mine: ps.some(p => p.user_id === uid),
    players: ps.map(p => ({ n: p.nickname, me: p.user_id === uid, score: p.score, correct: p.correct, answered: p.answered, progress: p.progress, crashes: p.crashes, secs: p.secs, done: !!p.done_at, live: now() - (p.live_at || 0) < 5000 })) };
}
app.get('/api/duel/:code', auth, (req, res) => {
  const d = one(`SELECT * FROM duels WHERE code=?`, String(req.params.code).toUpperCase()); if (!d) return res.status(404).json({ error: 'Challenge not found.' });
  res.json(duelView(d, req.user.id));
});
app.get('/api/duels', auth, (req, res) => {
  const ds = all(`SELECT d.* FROM duels d JOIN duel_players p ON p.duel_id=d.id WHERE p.user_id=? ORDER BY d.id DESC LIMIT 10`, req.user.id);
  res.json({ rows: ds.map(d => duelView(d, req.user.id)) });
});
function duelPlayer(req) {
  const d = one(`SELECT * FROM duels WHERE code=?`, String(req.params.code).toUpperCase());
  const p = d && one(`SELECT * FROM duel_players WHERE duel_id=? AND user_id=?`, d.id, req.user.id);
  return { d, p };
}
app.post('/api/duel/:code/next', auth, (req, res) => {
  const { d, p } = duelPlayer(req); if (!p || d.type === 'drive') return res.status(400).json({ error: 'Join the challenge first.' });
  if (p.done_at) return res.json({ done: true });
  const qs = JSON.parse(d.qset); let st = p.state ? JSON.parse(p.state) : { i: 0, servedAt: null, perms: qs.map(() => shuffle([0, 1, 2, 3])) };
  if (!st.servedAt) st.servedAt = now();
  run(`UPDATE duel_players SET state=?, live_at=? WHERE duel_id=? AND user_id=?`, JSON.stringify(st), now(), d.id, req.user.id);
  const qq = CITY[d.type][qs[st.i]];
  res.json({ index: st.i, total: qs.length, question: qq.q, photo: qq.photo || null, options: st.perms[st.i].map(k => qq.o[k]), limitMs: BASE_MS, remainingMs: Math.max(0, BASE_MS - (now() - st.servedAt)) });
});
app.post('/api/duel/:code/answer', auth, (req, res) => {
  const { d, p } = duelPlayer(req); if (!p || !p.state || p.done_at) return res.status(400).json({ error: 'Not active.' });
  const st = JSON.parse(p.state); if (!st.servedAt) return res.status(400).json({ error: 'Question not served.' });
  const el = now() - st.servedAt, choice = parseInt(req.body.choice, 10), perm = st.perms[st.i];
  const correct = el <= BASE_MS + GRACE_MS && choice >= 0 && choice <= 3 && perm[choice] === 0;
  const pts = correct ? 100 + Math.round(50 * Math.max(0, 1 - el / BASE_MS)) : 0;
  const idx = st.i; st.i += 1; st.servedAt = null;
  const done = st.i >= JSON.parse(d.qset).length;
  run(`UPDATE duel_players SET state=?, score=score+?, correct=correct+?, answered=answered+1, live_at=?, done_at=? WHERE duel_id=? AND user_id=?`, JSON.stringify(st), pts, correct ? 1 : 0, now(), done ? now() : null, d.id, req.user.id);
  if (done) { run(`UPDATE users SET coins=coins+30 WHERE id=?`, req.user.id); logEvent(req.user.id, 'duel_done', { code: d.code, type: d.type }, req.ipaddr); }
  res.json({ correct, correctIndex: perm.indexOf(0), points: pts, done, index: idx });
});
app.post('/api/duel/:code/progress', auth, (req, res) => {
  const { d, p } = duelPlayer(req); if (!p || p.done_at) return res.json({ ok: false });
  run(`UPDATE duel_players SET progress=?, crashes=?, live_at=? WHERE duel_id=? AND user_id=?`, Math.max(0, Math.min(1, +req.body.p || 0)), Math.max(0, parseInt(req.body.crashes, 10) || 0), now(), d.id, req.user.id);
  res.json(duelView(d, req.user.id));
});
app.post('/api/duel/:code/drive-done', auth, (req, res) => {
  const { d, p } = duelPlayer(req); if (!p || d.type !== 'drive') return res.status(400).json({ error: 'Not active.' });
  if (!p.done_at) {
    const secs = Math.max(20, Math.min(600, +req.body.secs || 600)), crashes = Math.max(0, parseInt(req.body.crashes, 10) || 0);
    run(`UPDATE duel_players SET progress=1, secs=?, crashes=?, done_at=?, live_at=? WHERE duel_id=? AND user_id=?`, secs, crashes, now(), now(), d.id, req.user.id);
    run(`UPDATE users SET coins=coins+30 WHERE id=?`, req.user.id); logEvent(req.user.id, 'duel_done', { code: d.code, type: 'drive', secs, crashes }, req.ipaddr);
  }
  res.json(duelView(d, req.user.id));
});

const GIFTS = {
  card: ['💌', 'Christmas card', 'A sweet note for your person', 20],
  hat: ['🎅🏾', 'Santa hat', 'They can wear it on their profile', 40],
  tree: ['🎄', 'Mini Christmas tree', 'For their parlour corner', 80],
  fireworks: ['🎆', 'Crossover fireworks', 'Light up their 31st night', 100],
  chicken: ['🍗', 'Christmas chicken', 'No Naija Christmas without it', 120],
  jollof: ['🍛', 'Party jollof cooler', 'The smoky one from the owambe', 150],
  asoebi: ['👗', 'Aso ebi', 'Matching outfit for the December wedding', 180],
  hamper: ['🧺', 'Christmas hamper', 'The big one with everything inside', 250],
};
const ROAD_GIFTS = { tree: 50, chicken: 80, hamper: 180 };
app.get('/api/market', auth, (req, res) => {
  const u = one(`SELECT coins, hat FROM users WHERE id=?`, req.user.id);
  res.json({ coins: u.coins, hat: !!u.hat, items: Object.entries(GIFTS).map(([id, g]) => ({ id, emoji: g[0], name: g[1], note: g[2], price: g[3] })),
    bag: all(`SELECT item, qty FROM bag WHERE user_id=? AND qty>0`, req.user.id),
    received: all(`SELECT g.id, g.item, g.msg, g.created_at, g.opened, u.nickname n FROM gifts g JOIN users u ON u.id=g.from_id WHERE g.to_id=? ORDER BY g.id DESC LIMIT 30`, req.user.id),
    sent: one(`SELECT COUNT(*) n FROM gifts WHERE from_id=?`, req.user.id).n });
});
app.post('/api/market/send', auth, (req, res) => {
  const g = GIFTS[req.body.item]; if (!g) return res.status(400).json({ error: 'Pick a gift.' });
  const friends = new Set(friendsOf(req.user.id).map(f => f.id));
  const to = [...new Set((req.body.to || []).map(Number))].filter(id => friends.has(id)).slice(0, 10);
  if (!to.length) return res.status(400).json({ error: 'Pick at least one friend.' });
  const msg = String(req.body.msg || '').trim().slice(0, 140);
  const u = one(`SELECT coins FROM users WHERE id=?`, req.user.id);
  let cost = 0;
  if (req.body.fromBag) {
    const b = one(`SELECT qty FROM bag WHERE user_id=? AND item=?`, req.user.id, req.body.item);
    if (!b || b.qty < to.length) return res.status(400).json({ error: 'Not enough of this gift in your bag.' });
    run(`UPDATE bag SET qty=qty-? WHERE user_id=? AND item=?`, to.length, req.user.id, req.body.item);
  } else {
    cost = g[3] * to.length;
    if (u.coins < cost) return res.status(400).json({ error: `You need ${cost} coins for this.` });
    run(`UPDATE users SET coins=coins-? WHERE id=?`, cost, req.user.id);
  }
  for (const id of to) {
    run(`INSERT INTO gifts(from_id,to_id,item,msg,created_at) VALUES(?,?,?,?,?)`, req.user.id, id, req.body.item, msg || null, now());
    run(`UPDATE users SET coins=coins+? WHERE id=?`, Math.round(g[3] / 2), id);
    if (req.body.item === 'hat') run(`UPDATE users SET hat=1 WHERE id=?`, id);
    notify(id, 'gift', `${g[0]} ${req.user.nickname} sent you ${g[1].toLowerCase().startsWith('a') ? '' : 'a '}${g[1]}!${msg ? ` "${msg}"` : ''} You got +${Math.round(g[3] / 2)} coins.`);
    if (one(`SELECT COUNT(*) n FROM gifts WHERE to_id=?`, id).n >= 3) award(id, 'loved');
  }
  run(`UPDATE users SET total_points=total_points+? WHERE id=?`, 10 * to.length, req.user.id);
  const newBadges = []; if (one(`SELECT COUNT(*) n FROM gifts WHERE from_id=?`, req.user.id).n >= 5) newBadges.push(award(req.user.id, 'santa'));
  logEvent(req.user.id, 'gift_send', { item: req.body.item, to: to.length, fromBag: !!req.body.fromBag, cost }, req.ipaddr);
  res.json({ coins: u.coins - cost, sent: to.length, newBadges: newBadges.filter(Boolean) });
});
app.post('/api/market/wear', auth, (req, res) => {
  const u = one(`SELECT coins, hat FROM users WHERE id=?`, req.user.id);
  if (u.hat) { run(`UPDATE users SET hat=0 WHERE id=?`, req.user.id); return res.json({ hat: false, coins: u.coins }); }
  const owned = one(`SELECT 1 FROM gifts WHERE to_id=? AND item='hat'`, req.user.id) || one(`SELECT 1 FROM settings WHERE key=?`, 'hat_' + req.user.id);
  if (!owned) { if (u.coins < 40) return res.status(400).json({ error: 'You need 40 coins for a Santa hat.' }); run(`UPDATE users SET coins=coins-40 WHERE id=?`, req.user.id); run(`INSERT OR IGNORE INTO settings(key,value) VALUES(?, '1')`, 'hat_' + req.user.id); }
  run(`UPDATE users SET hat=1 WHERE id=?`, req.user.id);
  logEvent(req.user.id, 'hat_on', null, req.ipaddr);
  res.json({ hat: true, coins: owned ? u.coins : u.coins - 40 });
});
app.post('/api/market/opened', auth, (req, res) => { run(`UPDATE gifts SET opened=1 WHERE to_id=?`, req.user.id); res.json({ ok: true }); });

const SHOP = { water: 5, gala: 10, chips: 10, bread: 15, fuel: 20, chinchin: 15, puff: 10, union: 10, toll: 10, ...ROAD_GIFTS };
app.post('/api/trip/buy', auth, (req, res) => {
  const cost = SHOP[req.body.item];
  const u = one(`SELECT coins, drive FROM users WHERE id=?`, req.user.id);
  if (!cost) return res.status(400).json({ error: 'Unknown item.' });
  if (!u.drive) return res.status(400).json({ error: 'You can only buy while driving.' });
  if (u.coins < cost) return res.status(400).json({ error: `You need ${cost} coins.` });
  run(`UPDATE users SET coins=coins-? WHERE id=?`, cost, req.user.id);
  logEvent(req.user.id, 'drive_buy', { item: req.body.item, cost }, req.ipaddr);
  if (ROAD_GIFTS[req.body.item]) run(`INSERT INTO bag(user_id,item,qty) VALUES(?,?,1) ON CONFLICT(user_id,item) DO UPDATE SET qty=qty+1`, req.user.id, req.body.item);
  res.json({ coins: u.coins - cost });
});
// ---- lifts: a friend asks you to pick them up on your next road trip
app.post('/api/trip/lift', auth, (req, res) => {
  const driver = parseInt(req.body.driver, 10);
  if (!friendsOf(req.user.id).some(f => f.id === driver)) return res.status(400).json({ error: 'You can only ask friends for a lift.' });
  const mine = all(`SELECT driver FROM lifts WHERE rider=? AND status='wait' AND created_at>?`, req.user.id, now() - LIFT_TTL);
  if (mine.some(l => l.driver === driver)) return res.status(400).json({ error: 'You already asked them. Wait small 🙏🏾' });
  if (mine.length >= 3) return res.status(400).json({ error: 'You have 3 lift requests waiting already.' });
  const r = run(`INSERT INTO lifts(rider,driver,created_at) VALUES(?,?,?)`, req.user.id, driver, now());
  notify(driver, 'lift', `🙋🏾 ${req.user.nickname} wants a lift! They will wait at a bus stop on your next road trip. Brake there to pick them up.`);
  logEvent(req.user.id, 'lift_ask', { driver }, req.ipaddr);
  res.json({ ok: true, id: Number(r.lastInsertRowid) });
});
app.post('/api/trip/lift/cancel', auth, (req, res) => {
  const l = one(`SELECT * FROM lifts WHERE id=? AND status='wait'`, parseInt(req.body.id, 10));
  if (!l || (l.rider !== req.user.id && l.driver !== req.user.id)) return res.status(400).json({ error: 'That request is gone.' });
  run(`UPDATE lifts SET status='cancel', done_at=? WHERE id=?`, now(), l.id);
  res.json({ ok: true });
});
app.post('/api/trip/pickup', auth, (req, res) => {
  const u = one(`SELECT id, nickname, coins, drive, loc FROM users WHERE id=?`, req.user.id);
  const l = one(`SELECT * FROM lifts WHERE id=? AND driver=? AND status='wait'`, parseInt(req.body.id, 10), u.id);
  if (!u.drive || !l) return res.status(400).json({ error: 'No friend waiting here.' });
  const place = PLACES.find(p => p.id === u.loc);
  run(`UPDATE lifts SET status='done', place=?, done_at=? WHERE id=?`, u.loc, now(), l.id);
  if (place) run(`INSERT OR IGNORE INTO visits(user_id,place,mode,first_at,correct) VALUES(?,?,?,?,-1)`, l.rider, place.id, 'lift', now());
  run(`UPDATE users SET coins=coins+20 WHERE id=?`, l.rider);
  run(`UPDATE users SET coins=coins+30 WHERE id=?`, u.id);
  notify(l.rider, 'ride', `🚗 ${u.nickname} picked you up${place ? ` on the way to ${place.name}! Stamp added to your passport and` : '! You got'} +20 coins.`);
  logEvent(u.id, 'lift_pickup', { rider: l.rider, place: u.loc }, req.ipaddr);
  res.json({ coins: u.coins + 30, reward: 30 });
});
app.post('/api/trip/fine', auth, (req, res) => {
  const amount = FINES[req.body.kind];
  const u = one(`SELECT coins, drive FROM users WHERE id=?`, req.user.id);
  if (!amount || !u.drive) return res.status(400).json({ error: 'No fine.' });
  const last = one(`SELECT MAX(created_at) t FROM events WHERE user_id=? AND type='trip_go'`, req.user.id).t || 0;
  if (one(`SELECT COUNT(*) n FROM events WHERE user_id=? AND type='drive_fine' AND created_at>?`, req.user.id, last).n >= 4) return res.json({ coins: u.coins, fined: 0 });
  const fined = Math.min(u.coins, amount);
  run(`UPDATE users SET coins=coins-? WHERE id=?`, fined, req.user.id);
  logEvent(req.user.id, 'drive_fine', { kind: req.body.kind, fined }, req.ipaddr);
  res.json({ coins: u.coins - fined, fined });
});
app.post('/api/trip/drive-end', auth, (req, res) => {
  const u = one(`SELECT coins, drive FROM users WHERE id=?`, req.user.id);
  if (!u.drive) return res.json({ bonus: 0, coins: u.coins });
  const picked = Math.max(0, Math.min(40, parseInt(req.body.picked, 10) || 0)), crashes = Math.max(0, parseInt(req.body.crashes, 10) || 0);
  const fares = Math.max(0, Math.min(20, parseInt(req.body.fares, 10) || 0)), checks = Math.max(0, Math.min(4, parseInt(req.body.checks, 10) || 0));
  const bonus = req.body.quit ? 0 : Math.min(150, picked * 3 + fares * 3 + checks * 10 + (crashes === 0 ? 20 : crashes <= 2 ? 10 : 0));
  run(`UPDATE users SET coins=coins+?, drive=0 WHERE id=?`, bonus, req.user.id);
  logEvent(req.user.id, 'drive_end', { picked, fares, checks, crashes, secs: req.body.secs, stars: req.body.stars, quit: !!req.body.quit, bonus }, req.ipaddr);
  const stars = Math.max(0, Math.min(3, parseInt(req.body.stars, 10) || 0));
  if (!req.body.quit) run(`INSERT INTO drive_log(user_id,kind,vehicle,secs,crashes,fares,stars,created_at) VALUES(?,?,?,?,?,?,?,?)`, req.user.id, 'trip', String(req.body.vehicle || '').slice(0, 8), Number(req.body.secs) || 0, crashes, fares, stars, now());
  res.json({ bonus, coins: u.coins + bonus, newBadges: req.body.quit ? [] : driveBadges(req.user.id, stars) });
});
app.post('/api/trip/answer', auth, (req, res) => {
  const u = one(`SELECT * FROM users WHERE id=?`, req.user.id);
  if (!u.trip) return res.status(400).json({ error: 'No question waiting.' });
  const quiz = JSON.parse(u.trip), place = PLACES.find(p => p.id === quiz.place);
  const choice = parseInt(req.body.choice, 10), correct = quiz.perm[choice] === 0;
  const reward = correct ? { coins: 100, points: 50 } : { coins: 0, points: 0 };
  run(`UPDATE users SET trip=NULL, coins=coins+?, total_points=total_points+? WHERE id=?`, reward.coins, reward.points, u.id);
  run(`UPDATE visits SET correct=? WHERE user_id=? AND place=?`, correct ? 1 : 0, u.id, place.id);
  const n = one(`SELECT COUNT(*) n FROM visits WHERE user_id=?`, u.id).n, newBadges = [];
  if (n >= 3) newBadges.push(award(u.id, 'traveller'));
  if (n >= PLACES.length) newBadges.push(award(u.id, 'explorer'));
  logEvent(u.id, 'trip_quiz', { place: place.id, correct }, ipOf(req));
  res.json({ correct, correctIndex: quiz.perm.indexOf(0), fact: place.fact, reward, coins: u.coins + reward.coins, newBadges: newBadges.filter(Boolean) });
});

app.get('/api/round/result', auth, (req, res) => {
  const d = parseInt(req.query.day, 10);
  const p = one(`SELECT * FROM plays WHERE user_id=? AND day=? AND finished_at IS NOT NULL ORDER BY official DESC, correct DESC LIMIT 1`, req.user.id, d);
  if (!p) return res.status(404).json({ error: 'No result yet.' });
  const st = JSON.parse(p.state);
  const dayRank = p.official ? one(`SELECT COUNT(*) n FROM plays WHERE day=? AND official=1 AND finished_at IS NOT NULL AND (points>? OR (points=? AND finished_at<?))`, d, p.points, p.points, p.finished_at).n + 1 : null;
  const dayPlayers = one(`SELECT COUNT(*) n FROM plays WHERE day=? AND official=1 AND finished_at IS NOT NULL`, d).n;
  res.json({ summary: { day: d, official: !!p.official, correct: p.correct, total: st.log.length, grid: st.log.map(x => x.c), points: p.points, streak: effectiveStreak(req.user),
    totalPoints: req.user.total_points, dayRank, dayPlayers, rank: rankOf(req.user), newBadges: [] } });
});


// ---------- Detty Drive: Drive of the Day, free rides, garage ----------
// Everybody in Nigeria drives the same road each day (same seed, same traffic). Fastest clean time wins.
const DAILY_ROUTES = [
  { from: 'Ojuelegba', to: 'lekki', vehicle: 'danfo', km: 18, city: 'Lagos', title: 'Danfo to the Island' },
  { from: 'Yaba', to: 'theatre', vehicle: 'okada', km: 9, city: 'Lagos', title: 'Okada dash to Iganmu' },
  { from: 'Kubwa', to: 'citygate', vehicle: 'ride', km: 30, city: 'FCT Abuja', title: 'Abuja night cruise' },
  { from: 'Ikeja', to: 'lekki', vehicle: 'ride', km: 25, city: 'Lagos', title: 'Third Mainland rush' },
  { from: 'Mile 12', to: 'theatre', vehicle: 'keke', km: 12, city: 'Lagos', title: 'Keke Napep hustle' },
  { from: 'Gwagwalada', to: 'zuma', vehicle: 'danfo', km: 40, city: 'FCT Abuja', title: 'Zuma Rock run' },
  { from: 'Sango-Ota', to: 'olumo', vehicle: 'ride', km: 70, city: 'Ogun', title: 'Owambe in Abeokuta' },
];
const VNAMES = { okada: 'Okada', keke: 'Keke', ride: 'Car', danfo: 'Danfo' };
function dailyOf(date = watDate()) {
  const n = Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000);
  const r = DAILY_ROUTES[((n % DAILY_ROUTES.length) + DAILY_ROUTES.length) % DAILY_ROUTES.length];
  const p = PLACES.find(x => x.id === r.to) || { name: r.to, city: '' };
  let seed = 0; for (const ch of 'detty' + date) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return { date, seed, from: r.from, to: { id: r.to, name: p.name, city: p.city, emoji: p.emoji }, vehicle: r.vehicle, vname: VNAMES[r.vehicle], km: r.km, city: r.city, title: r.title,
    endsAt: Date.parse(date + 'T23:00:00Z') };
}
const GARAGE = {
  colors: { white: ['#E8EDF5', 0], black: ['#1E1E1E', 0], silver: ['#AAB3BD', 0], red: ['#C0392B', 0], blue: ['#2B59C3', 0], green: ['#1E8449', 0],
    gold: ['#D4A017', 150], xmas: ['#D7263D', 120], purple: ['#6C3483', 100], naija: ['#008751', 80] },
  horns: { pam: ['Pam pam', 0], danfo: ['Danfo triple', 0], trumpet: ['Trailer horn', 60], jingle: ['Jingle Bells', 80] },
  stickers: ['NO KING AS GOD', 'NO FOOD FOR LAZY MAN', "GOD'S TIME IS THE BEST", 'EXCUSE ME DIVINE', 'NO CONDITION IS PERMANENT', 'SHINE YOUR EYE', 'DETTY DECEMBER', 'IJGB ON BOARD', 'ALL DIE NA DIE', 'MUMMY PRAYERS'],
};
function garageOf(u) {
  let g = {}; try { g = JSON.parse(u.garage || '{}') || {}; } catch {}
  const plate = String(g.plate || u.nickname || 'NAIJA').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7) || 'NAIJA';
  return { col: GARAGE.colors[g.col] ? g.col : 'white', horn: GARAGE.horns[g.horn] ? g.horn : 'pam', sticker: GARAGE.stickers.includes(g.sticker) ? g.sticker : GARAGE.stickers[0], plate, owned: Array.isArray(g.owned) ? g.owned : [] };
}
const fmtSecs = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function dailyBoard(date, uid) {
  const top = all(`SELECT r.user_id id, u.nickname n, u.state s, r.total, r.secs, r.crashes, r.fines, r.fares FROM drive_runs r JOIN users u ON u.id=r.user_id WHERE r.date=? ORDER BY r.total ASC, r.created_at ASC LIMIT 20`, date);
  const fr = new Set(friendsOf(uid).map(f => f.id)); fr.add(uid);
  const friends = all(`SELECT r.user_id id, u.nickname n, r.total, r.secs, r.crashes FROM drive_runs r JOIN users u ON u.id=r.user_id WHERE r.date=? ORDER BY r.total ASC LIMIT 400`, date).filter(r => fr.has(r.id)).slice(0, 15);
  const mine = one(`SELECT * FROM drive_runs WHERE user_id=? AND date=?`, uid, date);
  const rank = mine ? one(`SELECT COUNT(*) n FROM drive_runs WHERE date=? AND total<?`, date, mine.total).n + 1 : null;
  const count = one(`SELECT COUNT(*) n FROM drive_runs WHERE date=?`, date).n;
  return { top, friends, mine: mine ? { total: mine.total, secs: mine.secs, crashes: mine.crashes, fines: mine.fines, fares: mine.fares, plays: mine.plays } : null, rank, count };
}
function ghostFor(date, uid) {
  // the friend just ahead of you; else the fastest player in Nigeria today
  const b = dailyBoard(date, uid), mine = b.mine;
  const pool = b.friends.filter(r => r.id !== uid);
  let g = mine ? pool.filter(r => r.total < mine.total).pop() : pool[0];
  if (!g) g = b.top.find(r => r.id !== uid);
  if (!g) return null;
  const row = one(`SELECT path, total FROM drive_runs WHERE user_id=? AND date=?`, g.id, date);
  if (!row || !row.path) return null;
  return { n: g.n, total: row.total, path: JSON.parse(row.path), friend: pool.some(r => r.id === g.id) };
}
app.get('/api/drive', auth, (req, res) => {
  const u = one(`SELECT * FROM users WHERE id=?`, req.user.id);
  const d = dailyOf(), b = dailyBoard(d.date, u.id);
  const tot = one(`SELECT COUNT(*) n, COALESCE(SUM(fares),0) fares, COALESCE(SUM(secs),0) secs FROM drive_log WHERE user_id=?`, u.id);
  const tm = dailyOf(watDate(now() + 86400000));
  res.json({ tomorrow: { title: tm.title, vehicle: tm.vehicle, vname: tm.vname, to: tm.to.name, from: tm.from }, daily: { ...d, ...b, ghost: ghostFor(d.date, u.id) }, garage: garageOf(u), shop: GARAGE, coins: u.coins, totals: tot, now: now() });
});
app.post('/api/drive/start', auth, (req, res) => {
  const kind = ['daily', 'free'].includes(req.body.kind) ? req.body.kind : 'free';
  run(`UPDATE users SET drive=1 WHERE id=?`, req.user.id);
  logEvent(req.user.id, 'drive_start', { kind, vehicle: req.body.vehicle || null }, req.ipaddr);
  res.json({ ok: true });
});
function driveBadges(uid, stars) {
  const out = [award(uid, 'driver')];
  if (stars === 3) out.push(award(uid, 'correct'));
  if (one(`SELECT COALESCE(SUM(fares),0) n FROM drive_log WHERE user_id=?`, uid).n >= 50) out.push(award(uid, 'conductor'));
  return out.filter(Boolean);
}
app.post('/api/drive/done', auth, (req, res) => {
  // free rides and daily runs both land here; only the daily run is ranked and paid
  const b = req.body, kind = b.kind === 'daily' ? 'daily' : 'free';
  const secs = Math.max(0, Math.min(1800, Number(b.secs) || 0)), crashes = Math.max(0, Math.min(99, parseInt(b.crashes, 10) || 0));
  const fines = Math.max(0, Math.min(20, parseInt(b.fines, 10) || 0)), fares = Math.max(0, Math.min(40, parseInt(b.fares, 10) || 0)), stars = Math.max(0, Math.min(3, parseInt(b.stars, 10) || 0));
  const vehicle = VNAMES[b.vehicle] ? b.vehicle : 'ride';
  if (secs < 25 && !b.quit) return res.status(400).json({ error: 'That was too fast to be real 🤔' });
  run(`INSERT INTO drive_log(user_id,kind,vehicle,secs,crashes,fares,stars,created_at) VALUES(?,?,?,?,?,?,?,?)`, req.user.id, kind, vehicle, secs, crashes, fares, stars, now());
  logEvent(req.user.id, 'drive_done', { kind, vehicle, secs, crashes, fines, fares, stars, quit: !!b.quit }, req.ipaddr);
  run(`UPDATE users SET drive=0 WHERE id=?`, req.user.id);
  const u = one(`SELECT id, nickname, coins FROM users WHERE id=?`, req.user.id);
  const newBadges = b.quit ? [] : driveBadges(u.id, stars);
  if (kind !== 'daily' || b.quit) return res.json({ coins: u.coins, newBadges });
  const d = dailyOf(), total = Math.round((secs + crashes * 3 + fines * 5 - Math.min(fares, 10)) * 10) / 10;
  const prev = one(`SELECT * FROM drive_runs WHERE user_id=? AND date=?`, u.id, d.date);
  let path = null; try { const p = Array.isArray(b.path) ? b.path.slice(0, 1600).map(Number).map(v => Math.round(v * 1000) / 1000) : null; if (p && p.every(Number.isFinite)) path = JSON.stringify(p); } catch {}
  const beforeRanks = all(`SELECT user_id, total FROM drive_runs WHERE date=?`, d.date);
  let reward = 0, improved = false;
  if (!prev) { reward = 50; run(`INSERT INTO drive_runs(user_id,date,secs,crashes,fines,fares,total,path,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, u.id, d.date, secs, crashes, fines, fares, total, path, now()); improved = true; }
  else if (total < prev.total) { reward = 20; improved = true; run(`UPDATE drive_runs SET secs=?, crashes=?, fines=?, fares=?, total=?, path=?, plays=plays+1, created_at=? WHERE user_id=? AND date=?`, secs, crashes, fines, fares, total, path, now(), u.id, d.date); }
  else run(`UPDATE drive_runs SET plays=plays+1 WHERE user_id=? AND date=?`, u.id, d.date);
  if (reward) run(`UPDATE users SET coins=coins+?, total_points=total_points+? WHERE id=?`, reward, reward, u.id);
  if (improved) {
    // tell friends you just passed: the strongest come-back loop we have
    const fr = new Set(friendsOf(u.id).map(f => f.id)), was = prev ? prev.total : Infinity;
    beforeRanks.filter(r => fr.has(r.user_id) && r.total < was && r.total >= total).slice(0, 8)
      .forEach(r => notify(r.user_id, 'drive', `🚗 ${u.nickname} just beat your Drive of the Day time (${fmtSecs(total)} vs ${fmtSecs(r.total)}). Na to collect your crown back 😤`, 'drive'));
  }
  const days = one(`SELECT COUNT(*) n FROM drive_runs WHERE user_id=?`, u.id).n;
  if (days >= 7) { const x = award(u.id, 'daily7'); if (x) newBadges.push(x); }
  const board = dailyBoard(d.date, u.id);
  if (board.rank && board.rank <= 3 && board.count >= 5) { const x = award(u.id, 'topdriver'); if (x) newBadges.push(x); }
  res.json({ coins: u.coins + reward, reward, improved, total, prev: prev ? prev.total : null, ...board, newBadges });
});
app.post('/api/garage', auth, (req, res) => {
  const u = one(`SELECT id, nickname, coins, garage FROM users WHERE id=?`, req.user.id), g = garageOf(u), b = req.body;
  let cost = 0;
  if (b.col && GARAGE.colors[b.col]) { const price = GARAGE.colors[b.col][1]; if (price && !g.owned.includes('c:' + b.col)) { cost += price; g.owned.push('c:' + b.col); } g.col = b.col; }
  if (b.horn && GARAGE.horns[b.horn]) { const price = GARAGE.horns[b.horn][1]; if (price && !g.owned.includes('h:' + b.horn)) { cost += price; g.owned.push('h:' + b.horn); } g.horn = b.horn; }
  if (b.sticker && GARAGE.stickers.includes(b.sticker)) g.sticker = b.sticker;
  if (typeof b.plate === 'string') { const p = b.plate.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7); if (p.length >= 2) g.plate = p; }
  if (cost > u.coins) return res.status(400).json({ error: `You need ${cost} coins for this.` });
  run(`UPDATE users SET garage=?, coins=coins-? WHERE id=?`, JSON.stringify(g), cost, u.id);
  logEvent(u.id, 'garage', { col: g.col, horn: g.horn, cost }, req.ipaddr);
  res.json({ garage: g, coins: u.coins - cost, spent: cost });
});


// ---------- surprises: the daily Christmas stocking and mystery boxes on the road ----------
function stockingStreak(uid) {
  // consecutive days claimed, ending today or yesterday
  const rows = all(`SELECT date FROM stockings WHERE user_id=? ORDER BY date DESC LIMIT 14`, uid).map(r => r.date);
  let n = 0, d = watDate(); if (rows[0] !== d) d = watDate(now() - 86400000);
  for (const r of rows) { if (r === d) { n++; d = watDate(Date.parse(d + 'T12:00:00Z') - 86400000); } else break; }
  return n;
}
app.post('/api/stocking', auth, (req, res) => {
  const uid = req.user.id, date = watDate();
  if (one(`SELECT 1 FROM stockings WHERE user_id=? AND date=?`, uid, date)) return res.status(400).json({ error: 'You don open today\'s stocking. Come back tomorrow 🎄' });
  const streak = stockingStreak(uid) + 1, big = streak % 7 === 0;
  const u = one(`SELECT coins, hat FROM users WHERE id=?`, uid);
  const roll = Math.random();
  let r;
  if (big) r = { kind: 'coins', n: 300, label: '300 coins! Day 7 jackpot 🤑' };
  else if (roll < .03) r = { kind: 'coins', n: 250, label: 'JACKPOT! 250 coins 🤑' };
  else if (roll < .10 && !u.hat) r = { kind: 'hat', label: 'A Santa hat for your profile 🎅🏾' };
  else if (roll < .20) r = { kind: 'gift', item: 'chicken', label: 'A Christmas chicken in your gift bag 🍗 Send am to your person' };
  else if (roll < .32) r = { kind: 'points', n: 60, label: '+60 leaderboard points ⭐' };
  else if (roll < .55) r = { kind: 'coins', n: 50, label: '50 coins 🪙' };
  else r = { kind: 'coins', n: 20 + Math.floor(Math.random() * 3) * 5, label: null };
  if (r.kind === 'coins') { run(`UPDATE users SET coins=coins+? WHERE id=?`, r.n, uid); r.label = r.label || `${r.n} coins 🪙`; }
  if (r.kind === 'points') run(`UPDATE users SET total_points=total_points+? WHERE id=?`, r.n, uid);
  if (r.kind === 'hat') { run(`UPDATE users SET hat=1 WHERE id=?`, uid); run(`INSERT OR IGNORE INTO settings(key,value) VALUES(?, '1')`, 'hat_' + uid); }
  if (r.kind === 'gift') run(`INSERT INTO bag(user_id,item,qty) VALUES(?,?,1) ON CONFLICT(user_id,item) DO UPDATE SET qty=qty+1`, uid, r.item);
  run(`INSERT INTO stockings(user_id,date,reward,created_at) VALUES(?,?,?,?)`, uid, date, JSON.stringify(r), now());
  logEvent(uid, 'stocking', { ...r, streak }, req.ipaddr);
  res.json({ ...r, streak, coins: one(`SELECT coins FROM users WHERE id=?`, uid).coins });
});
app.post('/api/drive/box', auth, (req, res) => {
  const uid = req.user.id, date = watDate(), u = one(`SELECT coins, drive FROM users WHERE id=?`, uid);
  if (!u.drive) return res.status(400).json({ error: 'No box here.' });
  const b = one(`SELECT n FROM road_boxes WHERE user_id=? AND date=?`, uid, date);
  if (b && b.n >= 6) return res.json({ coins: u.coins, n: 0, label: 'Empty box 😅 You don collect all today\'s boxes. More tomorrow!' });
  run(`INSERT INTO road_boxes(user_id,date,n) VALUES(?,?,1) ON CONFLICT(user_id,date) DO UPDATE SET n=n+1`, uid, date);
  const roll = Math.random(), n = roll < .05 ? 100 : roll < .25 ? 30 : roll < .6 ? 15 : 8;
  run(`UPDATE users SET coins=coins+? WHERE id=?`, n, uid);
  logEvent(uid, 'road_box', { n }, req.ipaddr);
  res.json({ coins: u.coins + n, n, label: n >= 100 ? `JACKPOT BOX! +${n} 🪙 🤑` : `Mystery box! +${n} 🪙` });
});


// ---------- Journey Home: drive one real highway leg a day to your hometown ----------
const TOWN = new Map(JOURNEY.towns.map(t => [t.id, t]));
const ADJ = new Map(); JOURNEY.roads.forEach(([a, b, road, km]) => { for (const [x, y] of [[a, b], [b, a]]) { if (!ADJ.has(x)) ADJ.set(x, []); ADJ.get(x).push({ to: y, road, km }); } });
function routeOf(a, b) {
  // Dijkstra on km; the graph is tiny
  const dist = new Map([[a, 0]]), prev = new Map(), todo = new Set([a]);
  while (todo.size) {
    let u = null; for (const x of todo) if (u === null || dist.get(x) < dist.get(u)) u = x; todo.delete(u);
    if (u === b) break;
    for (const e of ADJ.get(u) || []) { const d = dist.get(u) + e.km; if (!dist.has(e.to) || d < dist.get(e.to)) { dist.set(e.to, d); prev.set(e.to, u); todo.add(e.to); } }
  }
  if (!dist.has(b)) return null;
  const pth = [b]; while (pth[0] !== a) pth.unshift(prev.get(pth[0]));
  return pth;
}
const legOf = (a, b) => (ADJ.get(a) || []).find(e => e.to === b);
const ORIGINS = { lagos: 'Lagos', abuja: 'Abuja', ph: 'Port Harcourt', abroad: 'Abroad (IJGB)' };
const AIRPORTS = { lagos: 'Murtala Muhammed International Airport, Lagos', abuja: 'Nnamdi Azikiwe International Airport, Abuja', ph: 'Port Harcourt International Airport' };
function journeyView(uid) {
  const j = one(`SELECT * FROM journeys WHERE user_id=?`, uid); if (!j) return null;
  const path = JSON.parse(j.path), today = watDate(), at = path[j.leg], next = path[j.leg + 1];
  const unlocked = next && (j.last_date !== today || j.extra_date === today && one(`SELECT COUNT(*) n FROM journey_legs WHERE user_id=? AND date=?`, uid, today).n < 2);
  const e = next ? legOf(at, next) : null;
  const kmDone = path.slice(0, j.leg).reduce((a, x, i) => a + legOf(x, path[i + 1]).km, 0), kmAll = path.slice(0, -1).reduce((a, x, i) => a + legOf(x, path[i + 1]).km, 0);
  return { origin: j.origin, home: j.home, abroad: j.abroad, path, leg: j.leg, legs: path.length - 1, at, next: next || null, arrived: !!j.arrived_at, arrivedAt: j.arrived_at,
    road: e ? e.road : null, km: e ? e.km : 0, kmDone, kmAll, unlocked: !!unlocked, canExpress: !!next && !unlocked && j.extra_date !== today, nextUnlock: Date.parse(watDate(now() + 86400000) + 'T00:00:00+01:00'),
    history: all(`SELECT leg, a, b, secs, crashes, correct, date FROM journey_legs WHERE user_id=? ORDER BY leg`, uid) };
}
app.get('/api/journey', auth, (req, res) => {
  const fr = friendsOf(req.user.id).map(f => f.id);
  const friends = fr.length ? all(`SELECT j.user_id id, u.nickname n, j.home, j.path, j.leg, j.arrived_at, j.abroad FROM journeys j JOIN users u ON u.id=j.user_id WHERE j.user_id IN (${fr.map(() => '?').join(',')})`, ...fr)
    .map(r => { const p = JSON.parse(r.path); return { n: r.n, home: r.home, at: p[r.leg], next: p[r.leg + 1] || null, leg: r.leg, legs: p.length - 1, arrived: !!r.arrived_at, ijgb: !!r.abroad }; }) : [];
  const travellers = one(`SELECT COUNT(*) n, SUM(arrived_at IS NOT NULL) a FROM journeys`);
  const homes = all(`SELECT home, COUNT(*) n FROM journeys GROUP BY home ORDER BY n DESC LIMIT 6`);
  res.json({ towns: JOURNEY.towns.map(t => ({ id: t.id, name: t.name, state: t.state, lat: t.lat, lon: t.lon })), roads: JOURNEY.roads.map(r => [r[0], r[1]]), origins: ORIGINS,
    me: journeyView(req.user.id), friends, travellers: travellers.n, arrived: travellers.a || 0, homes, coins: one(`SELECT coins FROM users WHERE id=?`, req.user.id).coins });
});
app.post('/api/journey/start', auth, (req, res) => {
  const b = req.body, home = TOWN.get(b.home) ? b.home : null, ori = ORIGINS[b.origin] ? b.origin : null;
  if (!home || !ori) return res.status(400).json({ error: 'Pick where you are coming from and your hometown.' });
  const prevJ = one(`SELECT * FROM journeys WHERE user_id=?`, req.user.id);
  if (prevJ && prevJ.leg > 0 && !b.restart) return res.status(400).json({ error: 'You are already on the road.' });
  let start = ori, abroad = null;
  if (ori === 'abroad') { const opts = ['lagos', 'abuja', 'ph'].map(a => ({ a, r: routeOf(a, home) })).filter(x => x.r).sort((x, y) => x.r.length - y.r.length); start = opts[0].a; abroad = String(b.from || 'London').slice(0, 30); }
  if (start === home) return res.status(400).json({ error: 'You are already home! Pick where you are travelling from.' });
  const path = routeOf(start, home); if (!path) return res.status(400).json({ error: 'No road found.' });
  run(`INSERT INTO journeys(user_id,origin,home,path,leg,abroad,started_at) VALUES(?,?,?,?,0,?,?) ON CONFLICT(user_id) DO UPDATE SET origin=excluded.origin, home=excluded.home, path=excluded.path, leg=0, last_date=NULL, extra_date=NULL, abroad=excluded.abroad, pending=NULL, started_at=excluded.started_at, arrived_at=NULL`, req.user.id, ori, home, JSON.stringify(path), abroad, now());
  run(`DELETE FROM journey_legs WHERE user_id=?`, req.user.id);
  logEvent(req.user.id, 'journey_start', { origin: ori, home, legs: path.length - 1, abroad }, req.ipaddr);
  const u = one(`SELECT nickname FROM users WHERE id=?`, req.user.id);
  friendsOf(req.user.id).slice(0, 30).forEach(f => notify(f.id, 'journey', abroad ? `✈️ ${u.nickname} is flying in from ${abroad} for December! Next stop: ${TOWN.get(home).name} 🏠` : `🚗 ${u.nickname} is travelling home to ${TOWN.get(home).name} for December. Who go reach first?`, 'journey'));
  res.json({ me: journeyView(req.user.id), airport: abroad ? AIRPORTS[start] : null });
});
app.post('/api/journey/express', auth, (req, res) => {
  const v = journeyView(req.user.id), u = one(`SELECT coins FROM users WHERE id=?`, req.user.id);
  if (!v || !v.canExpress) return res.status(400).json({ error: 'No express ticket needed now.' });
  if (u.coins < 60) return res.status(400).json({ error: 'You need 60 coins for an express ticket.' });
  run(`UPDATE users SET coins=coins-60 WHERE id=?`, req.user.id); run(`UPDATE journeys SET extra_date=? WHERE user_id=?`, watDate(), req.user.id);
  logEvent(req.user.id, 'journey_express', null, req.ipaddr);
  res.json({ me: journeyView(req.user.id), coins: u.coins - 60 });
});
app.post('/api/journey/leg-start', auth, (req, res) => {
  const v = journeyView(req.user.id);
  if (!v || !v.next) return res.status(400).json({ error: 'No journey to drive.' });
  if (!v.unlocked) return res.status(400).json({ error: 'Today\'s leg is done. The next road opens at midnight 🌙' });
  const t = TOWN.get(v.next), perm = shuffle([0, 1, 2, 3]);
  run(`UPDATE journeys SET pending=? WHERE user_id=?`, JSON.stringify({ leg: v.leg, perm, at: now() }), req.user.id);
  run(`UPDATE users SET drive=1 WHERE id=?`, req.user.id);
  let seed = 0; for (const ch of v.at + v.next + req.user.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  logEvent(req.user.id, 'leg_start', { a: v.at, b: v.next }, req.ipaddr);
  res.json({ leg: v.leg + 1, legs: v.legs, from: TOWN.get(v.at), to: { id: t.id, name: t.name, state: t.state, lat: t.lat, lon: t.lon }, road: v.road, km: v.km, seed,
    final: v.leg + 1 === v.legs, question: { q: t.q[0], options: perm.map(k => t.q[1 + k]) } });
});
app.post('/api/journey/leg-done', auth, (req, res) => {
  const j = one(`SELECT * FROM journeys WHERE user_id=?`, req.user.id); if (!j || !j.pending) return res.status(400).json({ error: 'No leg in progress.' });
  const pd = JSON.parse(j.pending), path = JSON.parse(j.path), a = path[pd.leg], b = path[pd.leg + 1];
  const secs = Math.max(0, Math.min(1800, Number(req.body.secs) || 0)), crashes = Math.max(0, Math.min(99, parseInt(req.body.crashes, 10) || 0));
  if (secs < 30) return res.status(400).json({ error: 'That was too fast to be real 🤔' });
  const choice = parseInt(req.body.choice, 10), correct = choice >= 0 && choice <= 3 && pd.perm[choice] === 0;
  const today = watDate(), arrived = pd.leg + 1 >= path.length - 1;
  run(`INSERT INTO journey_legs(user_id,leg,a,b,secs,crashes,correct,date,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, req.user.id, pd.leg + 1, a, b, secs, crashes, correct ? 1 : 0, today, now());
  run(`UPDATE journeys SET leg=leg+1, last_date=?, pending=NULL, arrived_at=? WHERE user_id=?`, today, arrived ? now() : null, req.user.id);
  run(`UPDATE users SET drive=0 WHERE id=?`, req.user.id);
  let coins = 40 + (correct ? 30 : 0) + (crashes === 0 ? 20 : 0), pts = correct ? 60 : 20;
  const newBadges = [award(req.user.id, 'driver')];
  if (arrived) {
    coins += 300; pts += 300; newBadges.push(award(req.user.id, 'home'));
    const u = one(`SELECT nickname FROM users WHERE id=?`, req.user.id), rank = one(`SELECT COUNT(*) n FROM journeys WHERE arrived_at IS NOT NULL`).n;
    friendsOf(req.user.id).slice(0, 40).forEach(f => notify(f.id, 'journey', `🏠 ${u.nickname} don reach ${TOWN.get(b).name}! Welcome home 🎉 Where you dey?`, 'journey'));
    if (rank <= 100) newBadges.push(award(req.user.id, 'early'));
  }
  run(`UPDATE users SET coins=coins+?, total_points=total_points+? WHERE id=?`, coins, pts, req.user.id);
  logEvent(req.user.id, 'leg_done', { a, b, secs, crashes, correct, arrived }, req.ipaddr);
  const t = TOWN.get(b);
  res.json({ correct, correctAnswer: t.q[1], coins: one(`SELECT coins FROM users WHERE id=?`, req.user.id).coins, earned: coins, points: pts, arrived, town: t.name, me: journeyView(req.user.id), newBadges: newBadges.filter(Boolean) });
});


// ---------- Owambe Night Live: one show, same questions, same time, for the whole country ----------
const SHOW_Q = 10, SHOW_ASK = 12000, SHOW_REVEAL = 6000, SHOW_STEP = SHOW_ASK + SHOW_REVEAL, SHOW_POT = parseInt(process.env.SHOW_POT || '20000', 10);
const SHOW_UTC = process.env.SHOW_UTC || '19:30'; // 8:30pm in Lagos
const getSet = (k) => { const r = one(`SELECT value FROM settings WHERE key=?`, k); return r ? r.value : null; };
const putSet = (k, v) => run(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, k, String(v));
function showStart(date) { const o = getSet('show_start_' + date); return o ? parseInt(o, 10) : Date.parse(`${date}T${SHOW_UTC}:00Z`); }
function showOf(date) {
  // the same 10 questions for everybody tonight, picked from the pool by the date
  const key = 'show_qs_' + date; let ids = getSet(key);
  const P = pool();
  if (!ids) { let sd = 0; for (const ch of 'owambe' + date) sd = (sd * 33 + ch.charCodeAt(0)) >>> 0; const r = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    const cats = ['Christmas', 'Naija', 'Food', 'Slang', 'Music', 'Travel', 'Nollywood', 'Christmas', 'Sports', 'Ask Mummy'];
    const used = new Set(); ids = cats.map(c => { const list = (P.byCat[c] || P.all).filter(x => !used.has(x.id)); const x = list[Math.floor(r() * list.length)]; used.add(x.id); return x.id; }).join(',');
    putSet(key, ids); }
  return ids.split(',').map((id, i) => { const x = P.byId.get(id) || P.all[i]; let sd = 7 + i; for (const ch of date) sd = (sd * 31 + ch.charCodeAt(0)) >>> 0; const perm = [0, 1, 2, 3].sort((a, b) => ((sd >> (a * 3)) & 7) - ((sd >> (b * 3)) & 7) || a - b); return { ...x, perm }; });
}
function showPhase(date, t = now()) {
  const T0 = showStart(date), end = T0 + SHOW_Q * SHOW_STEP;
  if (t < T0 - 30 * 60000) return { phase: 'soon', T0 };
  if (t < T0) return { phase: 'lobby', T0 };
  if (t >= end + 2000) return { phase: 'done', T0 };
  const k = Math.min(SHOW_Q - 1, Math.floor((t - T0) / SHOW_STEP)), into = t - T0 - k * SHOW_STEP;
  return into < SHOW_ASK ? { phase: 'ask', i: k, T0, left: SHOW_ASK - into } : { phase: 'reveal', i: k, T0, left: SHOW_STEP - into };
}
function showAlive(date, upto) {
  // alive after the first `upto` questions: wrong or missing answers beyond your spare lives knock you out
  const rows = all(`SELECT p.user_id id, p.lives, (SELECT COUNT(*) FROM show_answers a WHERE a.date=p.date AND a.user_id=p.user_id AND a.correct=1 AND a.i<?) c FROM show_players p WHERE p.date=?`, upto, date);
  return rows.filter(r => upto - r.c <= r.lives).map(r => r.id);
}
const REACTS = new Map();
function showPay(date) {
  if (getSet('show_paid_' + date)) return;
  putSet('show_paid_' + date, '1');
  const win = showAlive(date, SHOW_Q); if (!win.length) return;
  const each = Math.max(50, Math.min(5000, Math.floor(SHOW_POT / win.length)));
  win.forEach(id => { run(`UPDATE users SET coins=coins+?, total_points=total_points+200 WHERE id=?`, each, id); run(`UPDATE show_players SET won=? WHERE date=? AND user_id=?`, each, date, id); award(id, 'live'); notify(id, 'show', `🎤 You survived all ${SHOW_Q} questions at Owambe Night Live! +${each} 🪙 Champion!`, null); });
}
app.get('/api/show', auth, (req, res) => {
  const date = watDate(), ph = showPhase(date), uid = req.user.id;
  const me = one(`SELECT * FROM show_players WHERE date=? AND user_id=?`, date, uid);
  const players = one(`SELECT COUNT(*) n FROM show_players WHERE date=?`, date).n;
  const out = { phase: ph.phase, startsAt: ph.T0, now: now(), total: SHOW_Q, pot: SHOW_POT, players, joined: !!me, lives: me ? me.lives : 0, askMs: SHOW_ASK };
  const rx = (REACTS.get(date) || []).filter(r => r[0] > now() - 4000); REACTS.set(date, rx);
  out.reacts = rx.reduce((m, r) => { m[r[1]] = (m[r[1]] || 0) + 1; return m; }, {});
  if (ph.phase === 'ask' || ph.phase === 'reveal') {
    const qs = showOf(date), Q = qs[ph.i];
    out.i = ph.i; out.left = ph.left; out.category = Q.c; out.question = Q.q; out.options = Q.perm.map(k => Q.o[k]);
    const mine = me && one(`SELECT choice, correct FROM show_answers WHERE date=? AND user_id=? AND i=?`, date, uid, ph.i);
    out.myChoice = mine ? mine.choice : null;
    const aliveBefore = showAlive(date, ph.i); out.alive = aliveBefore.length; out.meAlive = !!me && aliveBefore.includes(uid);
    if (ph.phase === 'reveal') {
      out.correct = Q.perm.indexOf(0);
      const cnt = all(`SELECT choice, COUNT(*) n FROM show_answers WHERE date=? AND i=? GROUP BY choice`, date, ph.i); out.counts = [0, 1, 2, 3].map(k => (cnt.find(c => c.choice === k) || { n: 0 }).n);
      const after = showAlive(date, ph.i + 1); out.aliveAfter = after.length; out.meAliveAfter = !!me && after.includes(uid);
      out.usedLife = out.meAlive && out.meAliveAfter && (!mine || !mine.correct);
    }
  }
  if (ph.phase === 'done') {
    showPay(date);
    out.winners = all(`SELECT u.nickname n, u.state s, p.won FROM show_players p JOIN users u ON u.id=p.user_id WHERE p.date=? AND p.won>0 ORDER BY p.joined_at LIMIT 50`, date);
    out.meWon = me ? me.won : 0;
    out.nextAt = showStart(watDate(now() + 86400000));
  }
  res.json(out);
});
app.post('/api/show/join', auth, (req, res) => {
  const date = watDate(), ph = showPhase(date);
  if (!['lobby', 'soon'].includes(ph.phase) && !(ph.phase === 'ask' && ph.i === 0)) return res.status(400).json({ error: 'The show don start. You can watch, and join tomorrow early!' });
  run(`INSERT OR IGNORE INTO show_players(date,user_id,joined_at) VALUES(?,?,?)`, date, req.user.id, now());
  logEvent(req.user.id, 'show_join', null, req.ipaddr);
  res.json({ ok: true });
});
app.post('/api/show/life', auth, (req, res) => {
  const date = watDate(), me = one(`SELECT * FROM show_players WHERE date=? AND user_id=?`, date, req.user.id), u = one(`SELECT coins FROM users WHERE id=?`, req.user.id);
  if (!me) return res.status(400).json({ error: 'Join the show first.' });
  if (me.lives >= 1) return res.status(400).json({ error: 'You already have a spare life.' });
  if (!['lobby', 'soon'].includes(showPhase(date).phase)) return res.status(400).json({ error: 'Lives can only be bought before the show starts.' });
  if (u.coins < 100) return res.status(400).json({ error: 'A spare life costs 100 coins.' });
  run(`UPDATE users SET coins=coins-100 WHERE id=?`, req.user.id); run(`UPDATE show_players SET lives=1 WHERE date=? AND user_id=?`, date, req.user.id);
  logEvent(req.user.id, 'show_life', null, req.ipaddr);
  res.json({ coins: u.coins - 100, lives: 1 });
});
app.post('/api/show/answer', auth, (req, res) => {
  const date = watDate(), t = now(), T0 = showStart(date), i = parseInt(req.body.i, 10), choice = parseInt(req.body.choice, 10);
  const into = t - T0 - i * SHOW_STEP;
  if (!(i >= 0 && i < SHOW_Q) || into < 0 || into > SHOW_ASK + 1500) return res.status(400).json({ error: 'Too late for this one!' });
  if (!one(`SELECT 1 FROM show_players WHERE date=? AND user_id=?`, date, req.user.id)) return res.status(400).json({ error: 'You are watching tonight.' });
  if (!showAlive(date, i).includes(req.user.id)) return res.status(400).json({ error: 'You are out, but keep watching!' });
  const Q = showOf(date)[i], correct = choice >= 0 && choice <= 3 && Q.perm[choice] === 0 ? 1 : 0;
  run(`INSERT OR IGNORE INTO show_answers(date,user_id,i,choice,correct,ms) VALUES(?,?,?,?,?,?)`, date, req.user.id, i, choice, correct, into);
  res.json({ ok: true });
});
app.post('/api/show/react', auth, (req, res) => {
  const e = ['🔥', '😂', '😱', '👏🏾', '💃🏾', '🙏🏾'].includes(req.body.e) ? req.body.e : null; if (!e) return res.json({ ok: false });
  const date = watDate(), list = REACTS.get(date) || []; list.push([now(), e]); if (list.length > 5000) list.splice(0, 1000); REACTS.set(date, list);
  res.json({ ok: true });
});
app.post('/api/admin/show/start', admin, (req, res) => {
  const inSec = Math.max(5, Math.min(3600, parseInt(req.body.inSec, 10) || 60)), date = watDate();
  putSet('show_start_' + date, now() + inSec * 1000); run(`DELETE FROM settings WHERE key=?`, 'show_paid_' + date);
  res.json({ ok: true, startsAt: now() + inSec * 1000 });
});


// ---------- "How well do you know me?": players write the questions about themselves ----------
const KNOW = {
  food: ['My number one Christmas food?', ['Jollof rice and chicken', 'Fried rice and turkey', 'Pounded yam and egusi', 'Ofada rice and ayamase', 'Pepper soup', 'Abacha', 'Tuwo and miyan kuka', 'Banga and starch']],
  spend: ['Where I dey spend this Christmas?', ['In my village', 'Lagos', 'Abuja', 'Abroad', 'Port Harcourt', 'With my in-laws', 'Inside my room', 'Church crossover']],
  vibe: ['My Detty December vibe?', ['Owambe every weekend', 'Concerts', 'Chilling at home', 'Church programmes', 'Travelling', 'Beach', 'Clubbing', 'Family time']],
  drink: ['My Christmas drink?', ['Zobo', 'Chapman', 'Malt', 'Palm wine', 'Soft drink', 'Kunu', 'Water only', 'Wine']],
  aunty: ['The question aunty go ask me this year?', ['When are you marrying?', 'When you go born pikin?', 'How much you dey earn?', 'When you go japa?', 'You don add weight o!', 'Is it still that job?', 'Where is your partner?', 'Why you no come last year?']],
  song: ['Wetin I go play all December?', ['Afrobeats', 'Amapiano', 'Gospel', 'Highlife', 'Fuji', 'Hip hop', 'R&B', 'Old school']],
  wahala: ['My biggest December wahala?', ['Traffic', 'Sapa (money)', 'Family questions', 'No light', 'Fuel price', 'Too many invites', 'Travelling', 'Food finishing']],
  gift: ['Gift wey go make me happy pass?', ['Cash', 'New phone', 'Clothes', 'Hamper', 'Shoes', 'Perfume', 'Foodstuff', 'Surprise trip']],
  party: ['Wetin I sabi do pass at a party?', ['Dance', 'Eat', 'Gist', 'Cook', 'Spray money', 'DJ', 'Take pictures', 'Sleep']],
  region: ['Where my people come from?', ['South West', 'South East', 'South South', 'North Central', 'North West', 'North East', 'FCT', 'Diaspora']],
};
app.get('/api/knowme', auth, (req, res) => {
  const k = one(`SELECT * FROM knowme WHERE user_id=?`, req.user.id);
  const board = k ? all(`SELECT u.nickname n, t.score FROM knowme_tries t JOIN users u ON u.id=t.user_id WHERE t.owner=? ORDER BY t.score DESC, t.created_at ASC LIMIT 30`, req.user.id) : [];
  const friendsQ = all(`SELECT k.code, u.nickname n, (SELECT score FROM knowme_tries t WHERE t.owner=k.user_id AND t.user_id=?) mine FROM knowme k JOIN users u ON u.id=k.user_id WHERE k.user_id IN (${[0, ...friendsOf(req.user.id).map(f => f.id)].join(',')}) LIMIT 30`, req.user.id);
  res.json({ templates: Object.fromEntries(Object.entries(KNOW).map(([id, [q, o]]) => [id, { q, o }])), mine: k ? { code: k.code, items: JSON.parse(k.items).map(x => ({ t: x.t, q: KNOW[x.t][0], a: x.o[x.a] })) } : null, board, friends: friendsQ });
});
app.post('/api/knowme', auth, (req, res) => {
  const items = (Array.isArray(req.body.items) ? req.body.items : []).filter(x => x && KNOW[x.t] && Number.isInteger(x.a) && KNOW[x.t][1][x.a]).slice(0, 7);
  if (items.length < 5 || new Set(items.map(x => x.t)).size !== items.length) return res.status(400).json({ error: 'Pick 5 different questions and your answers.' });
  const built = items.map(x => { const ans = KNOW[x.t][1][x.a], others = shuffle(KNOW[x.t][1].filter(o => o !== ans)).slice(0, 3), o = shuffle([ans, ...others]); return { t: x.t, o, a: o.indexOf(ans) }; });
  const old = one(`SELECT code FROM knowme WHERE user_id=?`, req.user.id), code = old ? old.code : crypto.randomBytes(4).toString('hex').toUpperCase();
  run(`INSERT INTO knowme(user_id,code,items,created_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET items=excluded.items, created_at=excluded.created_at`, req.user.id, code, JSON.stringify(built), now());
  if (old) run(`DELETE FROM knowme_tries WHERE owner=?`, req.user.id);
  logEvent(req.user.id, 'knowme_make', null, req.ipaddr);
  res.json({ code });
});
app.get('/api/knowme/:code', auth, (req, res) => {
  const k = one(`SELECT k.*, u.nickname n FROM knowme k JOIN users u ON u.id=k.user_id WHERE k.code=?`, String(req.params.code).toUpperCase());
  if (!k) return res.status(404).json({ error: 'This quiz does not exist.' });
  const mine = one(`SELECT * FROM knowme_tries WHERE owner=? AND user_id=?`, k.user_id, req.user.id);
  const board = all(`SELECT u.nickname n, t.score FROM knowme_tries t JOIN users u ON u.id=t.user_id WHERE t.owner=? ORDER BY t.score DESC, t.created_at ASC LIMIT 30`, k.user_id);
  const items = JSON.parse(k.items);
  res.json({ owner: k.n, self: k.user_id === req.user.id, code: k.code, items: items.map(x => ({ q: KNOW[x.t][0], o: x.o })), done: mine ? { score: mine.score, answers: JSON.parse(mine.answers), correct: items.map(x => x.a) } : null, board, total: items.length });
});
app.post('/api/knowme/:code/answer', auth, (req, res) => {
  const k = one(`SELECT k.*, u.nickname n FROM knowme k JOIN users u ON u.id=k.user_id WHERE k.code=?`, String(req.params.code).toUpperCase());
  if (!k) return res.status(404).json({ error: 'This quiz does not exist.' });
  if (k.user_id === req.user.id) return res.status(400).json({ error: 'You can\'t take your own quiz 😂' });
  if (one(`SELECT 1 FROM knowme_tries WHERE owner=? AND user_id=?`, k.user_id, req.user.id)) return res.status(400).json({ error: 'You already took this quiz.' });
  const items = JSON.parse(k.items), ans = (Array.isArray(req.body.answers) ? req.body.answers : []).map(x => parseInt(x, 10));
  const score = items.reduce((a, x, i) => a + (ans[i] === x.a ? 1 : 0), 0);
  run(`INSERT INTO knowme_tries(owner,user_id,score,answers,created_at) VALUES(?,?,?,?,?)`, k.user_id, req.user.id, score, JSON.stringify(ans), now());
  run(`UPDATE users SET coins=coins+? WHERE id=?`, score * 10, req.user.id); run(`UPDATE users SET coins=coins+5 WHERE id=?`, k.user_id);
  const me = one(`SELECT nickname FROM users WHERE id=?`, req.user.id);
  notify(k.user_id, 'knowme', `🫶🏾 ${me.nickname} scored ${score}/${items.length} on "How well do you know me?"${score === items.length ? ' Na your real padi be that!' : score <= 1 ? ' 😂 Dem no know you at all!' : ''}`, null);
  const tries = one(`SELECT COUNT(*) n FROM knowme_tries WHERE owner=?`, k.user_id).n; if (tries >= 5) award(k.user_id, 'knowme');
  logEvent(req.user.id, 'knowme_take', { owner: k.user_id, score }, req.ipaddr);
  res.json({ score, total: items.length, correct: items.map(x => x.a), earned: score * 10, board: all(`SELECT u.nickname n, t.score FROM knowme_tries t JOIN users u ON u.id=t.user_id WHERE t.owner=? ORDER BY t.score DESC, t.created_at ASC LIMIT 30`, k.user_id) });
});
app.post('/api/party/hosted', auth, (req, res) => {
  logEvent(req.user.id, 'party_game', { game: String(req.body.game || '').slice(0, 20), players: parseInt(req.body.players, 10) || 0 }, req.ipaddr);
  if (one(`SELECT COUNT(*) n FROM events WHERE user_id=? AND type='party_game'`, req.user.id).n >= 3) award(req.user.id, 'party');
  res.json({ ok: true });
});

// ---------- leaderboards ----------
function rivalry(d) {
  if (!d) return null;
  const rows = all(`SELECT u.state s, AVG(p.points) a, COUNT(*) n FROM plays p JOIN users u ON u.id=p.user_id WHERE p.day=? AND p.official=1 AND p.finished_at IS NOT NULL AND u.state IS NOT NULL GROUP BY u.state HAVING n>=3 ORDER BY a DESC LIMIT 2`, d);
  return rows.length === 2 ? { leader: rows[0].s, chaser: rows[1].s, day: d } : null;
}
app.get('/api/leaderboard', auth, (req, res) => {
  const type = req.query.type || 'today', u = req.user;
  if (type === 'today') {
    const d = liveDay() || latestOpened();
    if (!d) return res.json({ rows: [], day: null });
    const rows = all(`SELECT u.id, u.nickname n, u.state s, p.points v, p.correct c FROM plays p JOIN users u ON u.id=p.user_id WHERE p.day=? AND p.official=1 AND p.finished_at IS NOT NULL ORDER BY p.points DESC, p.finished_at ASC LIMIT 50`, d);
    const mine = one(`SELECT points, finished_at FROM plays WHERE user_id=? AND day=? AND official=1 AND finished_at IS NOT NULL`, u.id, d);
    const myRank = mine ? one(`SELECT COUNT(*) n FROM plays WHERE day=? AND official=1 AND finished_at IS NOT NULL AND (points>? OR (points=? AND finished_at<?))`, d, mine.points, mine.points, mine.finished_at).n + 1 : null;
    return res.json({ day: d, rows: rows.map(r => ({ me: r.id === u.id, n: r.n, s: r.s, v: r.v, c: r.c })), me: mine ? { rank: myRank, v: mine.points } : null });
  }
  if (type === 'overall') {
    const rows = all(`SELECT id, nickname || CASE WHEN hat=1 THEN ' 🎅🏾' ELSE '' END n, state s, total_points v, streak k FROM users WHERE total_points>0 ORDER BY total_points DESC, created_at ASC LIMIT 50`);
    return res.json({ rows: rows.map(r => ({ me: r.id === u.id, n: r.n, s: r.s, v: r.v })), me: { rank: rankOf(u), v: u.total_points } });
  }
  if (type === 'states' || type === 'schools') {
    const col = type === 'states' ? 'state' : 'school';
    const rows = all(`SELECT ${col} n, ROUND(AVG(total_points)) v, COUNT(*) k, SUM(total_points) t FROM users WHERE ${col} IS NOT NULL AND ${col}!='' AND total_points>0 GROUP BY ${col} ORDER BY v DESC LIMIT 40`);
    return res.json({ rows: rows.map(r => ({ me: r.n === u[col], n: r.n, v: r.v, k: r.k })) });
  }
  res.status(400).json({ error: 'Unknown board.' });
});

// ---------- squads ----------
function joinSquad(uid, code, ip) {
  const s = one(`SELECT * FROM squads WHERE code=?`, code);
  if (!s) return { error: 'No squad with that code.' };
  const count = one(`SELECT COUNT(*) n FROM squad_members WHERE user_id=?`, uid).n;
  if (count >= 5) return { error: 'You can be in up to 5 squads.' };
  const r = run(`INSERT OR IGNORE INTO squad_members VALUES(?,?,?)`, s.id, uid, now());
  if (r.changes) logEvent(uid, 'squad_join', { code }, ip);
  award(uid, 'squad');
  return { code: s.code, name: s.name };
}
app.post('/api/squad/create', auth, (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 30);
  if (name.length < 2) return res.status(400).json({ error: 'Give your squad a name.' });
  if (one(`SELECT COUNT(*) n FROM squad_members WHERE user_id=?`, req.user.id).n >= 5) return res.status(400).json({ error: 'You can be in up to 5 squads.' });
  let code; do { code = rid(5); } while (one(`SELECT 1 FROM squads WHERE code=?`, code));
  const r = run(`INSERT INTO squads(code,name,owner_id,created_at) VALUES(?,?,?,?)`, code, name, req.user.id, now());
  run(`INSERT INTO squad_members VALUES(?,?,?)`, Number(r.lastInsertRowid), req.user.id, now());
  logEvent(req.user.id, 'squad_create', { code, name }, req.ipaddr);
  const b = award(req.user.id, 'squad');
  res.json({ code, name, newBadges: b ? [b] : [] });
});
app.post('/api/squad/join', auth, (req, res) => {
  const r = joinSquad(req.user.id, String(req.body.code || '').trim().toUpperCase(), req.ipaddr);
  if (r.error) return res.status(400).json(r);
  res.json(r);
});
app.post('/api/squad/leave', auth, (req, res) => {
  const s = one(`SELECT id FROM squads WHERE code=?`, String(req.body.code || '').toUpperCase());
  if (s) { run(`DELETE FROM squad_members WHERE squad_id=? AND user_id=?`, s.id, req.user.id); logEvent(req.user.id, 'squad_leave', { code: req.body.code }, req.ipaddr); }
  res.json({ ok: true });
});
app.get('/api/squad/:code', auth, (req, res) => {
  const s = one(`SELECT * FROM squads WHERE code=?`, String(req.params.code).toUpperCase());
  if (!s) return res.status(404).json({ error: 'Squad not found.' });
  const d = liveDay() || latestOpened();
  const rows = all(`SELECT u.id, u.nickname n, u.total_points v, u.streak k, u.last_played_day lp,
    (SELECT p.correct FROM plays p WHERE p.user_id=u.id AND p.day=? AND p.official=1 AND p.finished_at IS NOT NULL) today
    FROM squad_members m JOIN users u ON u.id=m.user_id WHERE m.squad_id=? ORDER BY u.total_points DESC`, d || -1, s.id);
  res.json({ code: s.code, name: s.name, day: d, rows: rows.map(r => ({ me: r.id === req.user.id, n: r.n, v: r.v, today: r.today })) });
});

// ---------- tracking ----------
const EVENT_TYPES = new Set(['journey_start', 'leg_start', 'show_join', 'show_open', 'drive_hub', 'drive_share', 'app_open', 'tab', 'market_view', 'trip_view', 'contacts_pick', 'reaction', 'duel_share', 'share', 'invite', 'install_prompt', 'installed', 'lang', 'sound', 'board', 'squad_view', 'result_view', 'how_to', 'error', 'copy_link', 'gist_open', 'premium_view', 'flight_start', 'gist_demo_play', 'swap_open', 'swap_photo', 'swap_share']);
app.post('/api/event', auth, (req, res) => {
  const type = String(req.body.type || '');
  if (!EVENT_TYPES.has(type)) return res.status(400).json({ error: 'bad event' });
  logEvent(req.user.id, type, req.body.meta || null, req.ipaddr);
  const out = { ok: true };
  if (type === 'share') {
    const r = run(`INSERT OR IGNORE INTO shares VALUES(?,?)`, req.user.id, watDate());
    if (r.changes) {
      run(`UPDATE users SET total_points=total_points+?, coins=coins+? WHERE id=?`, SHARE_POINTS, SHARE_POINTS, req.user.id);
      out.bonus = SHARE_POINTS;
      if (one(`SELECT COUNT(*) n FROM shares WHERE user_id=?`, req.user.id).n >= 5) { const b = award(req.user.id, 'sharer'); if (b) out.newBadges = [b]; }
    }
  }
  res.json(out);
});
app.post('/api/hb', auth, (req, res) => {
  const secs = Math.max(0, Math.min(30, parseInt(req.body.secs, 10) || 0));
  if (secs) touch(req.user.id, req.ipaddr, secs);
  res.json({ ok: true });
});

// ---------- admin ----------
const adminToken = () => { const exp = Date.now() + 7 * 86400000; return exp + '.' + crypto.createHmac('sha256', SECRET).update('admin' + exp).digest('hex'); };
function adminOk(tok) {
  if (!tok) return false; const [exp, sig] = String(tok).split('.');
  if (!exp || !sig || Date.now() > +exp) return false;
  const good = crypto.createHmac('sha256', SECRET).update('admin' + exp).digest('hex');
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
function admin(req, res, next) {
  const tok = (req.headers.authorization || '').replace('Bearer ', '') || req.query.t;
  if (!adminOk(tok)) return res.status(401).json({ error: 'Admin sign-in required.' });
  next();
}
app.post('/api/admin/login', (req, res) => {
  const a = Buffer.from(String(req.body.password || '')), b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Wrong password.' });
  res.json({ token: adminToken() });
});

app.get('/api/admin/overview', admin, (req, res) => {
  const today = watDate();
  const days = []; for (let i = 29; i >= 0; i--) days.push(watDate(now() - i * 86400000));
  const series = days.map(date => {
    const start = Date.parse(date + 'T00:00:00Z') - 3600000, end = start + 86400000;
    return {
      date,
      signups: one(`SELECT COUNT(*) n FROM users WHERE created_at>=? AND created_at<?`, start, end).n,
      active: one(`SELECT COUNT(*) n FROM activity WHERE date=?`, date).n,
      rounds: one(`SELECT COUNT(*) n FROM plays WHERE finished_at>=? AND finished_at<?`, start, end).n,
      minutes: Math.round((one(`SELECT COALESCE(SUM(secs),0) s FROM activity WHERE date=?`, date).s) / 60),
      shares: one(`SELECT COUNT(*) n FROM events WHERE type='share' AND created_at>=? AND created_at<?`, start, end).n,
    };
  });
  // D1 retention across all signup days with a following day already passed
  const cohorts = all(`SELECT u.id, a.date d FROM users u JOIN activity a ON a.user_id=u.id`);
  const firstDay = {}; const activeSet = new Set();
  for (const r of cohorts) { activeSet.add(r.id + '|' + r.d); if (!firstDay[r.id] || r.d < firstDay[r.id]) firstDay[r.id] = r.d; }
  let base = 0, ret = 0;
  for (const [id, d] of Object.entries(firstDay)) {
    const next = new Date(Date.parse(d) + 86400000).toISOString().slice(0, 10);
    if (next >= today) continue; base++; if (activeSet.has(id + '|' + next)) ret++;
  }
  const totalUsers = one(`SELECT COUNT(*) n FROM users`).n;
  const started = one(`SELECT COUNT(DISTINCT user_id) n FROM plays`).n;
  const finished = one(`SELECT COUNT(DISTINCT user_id) n FROM plays WHERE finished_at IS NOT NULL`).n;
  const sharers = one(`SELECT COUNT(DISTINCT user_id) n FROM events WHERE type='share'`).n;
  const inviters = one(`SELECT COUNT(DISTINCT referred_by) n FROM users WHERE referred_by IS NOT NULL`).n;
  const hours = Array(24).fill(0);
  for (const r of all(`SELECT created_at t FROM events WHERE created_at>?`, now() - 7 * 86400000)) hours[watHour(r.t)]++;
  res.json({
    now: now(), live: liveDay(), next: nextDay(), clockOffset: OFFSET,
    kpi: {
      users: totalUsers,
      newToday: series[29].signups,
      activeToday: series[29].active,
      roundsToday: series[29].rounds,
      roundsTotal: one(`SELECT COUNT(*) n FROM plays WHERE finished_at IS NOT NULL`).n,
      avgScore: (one(`SELECT AVG(correct) a FROM plays WHERE finished_at IS NOT NULL`).a || 0).toFixed(1),
      hoursTotal: Math.round(one(`SELECT COALESCE(SUM(time_spent),0) s FROM users`).s / 360) / 10,
      avgMinsPerUser: totalUsers ? Math.round(one(`SELECT COALESCE(SUM(time_spent),0) s FROM users`).s / totalUsers / 6) / 10 : 0,
      sharesTotal: one(`SELECT COUNT(*) n FROM events WHERE type='share'`).n,
      referred: one(`SELECT COUNT(*) n FROM users WHERE referred_by IS NOT NULL`).n,
      waOptins: one(`SELECT COUNT(*) n FROM users WHERE wa_optin=1`).n,
      squads: one(`SELECT COUNT(*) n FROM squads`).n,
      trips: one(`SELECT COUNT(*) n FROM events WHERE type='trip_go'`).n,
      powerups: one(`SELECT COUNT(*) n FROM events WHERE type='powerup'`).n,
      drives: one(`SELECT COUNT(*) n FROM drive_log`).n,
      dailyDrivers: one(`SELECT COUNT(*) n FROM drive_runs WHERE date=?`, today).n,
      driveMins: Math.round(one(`SELECT COALESCE(SUM(secs),0) s FROM drive_log`).s / 60),
      travellers: one(`SELECT COUNT(*) n FROM journeys`).n,
      arrivedHome: one(`SELECT COUNT(*) n FROM journeys WHERE arrived_at IS NOT NULL`).n,
      legsDriven: one(`SELECT COUNT(*) n FROM journey_legs`).n,
      showPlayers: one(`SELECT COUNT(*) n FROM show_players WHERE date=?`, today).n,
      knowmeTakes: one(`SELECT COUNT(*) n FROM knowme_tries`).n,
      partyGames: one(`SELECT COUNT(*) n FROM events WHERE type='party_game'`).n,
      qPending: one(`SELECT COUNT(*) n FROM qbank WHERE status='pending'`).n,
      stockings: one(`SELECT COUNT(*) n FROM stockings WHERE date=?`, today).n,
      roadBoxes: one(`SELECT COUNT(*) n FROM events WHERE type='road_box'`).n,
      garageBuys: one(`SELECT COUNT(*) n FROM events WHERE type='garage' AND json_extract(meta,'$.cost')>0`).n,
      hawkerBuys: one(`SELECT COUNT(*) n FROM events WHERE type='drive_buy'`).n,
      duels: one(`SELECT COUNT(*) n FROM duels`).n,
      duelPlays: one(`SELECT COUNT(*) n FROM events WHERE type='duel_done'`).n,
      giftsSent: one(`SELECT COUNT(*) n FROM gifts`).n,
      d1: base ? Math.round(100 * ret / base) : null,
    },
    funnel: [['Signed up', totalUsers], ['Started a round', started], ['Finished a round', finished], ['Shared a score', sharers], ['Drove at least once', one(`SELECT COUNT(DISTINCT user_id) n FROM drive_log`).n], ['Invited a friend who joined', inviters]],
    series, hours,
    states: all(`SELECT COALESCE(state,'Not set') k, COUNT(*) n FROM users GROUP BY state ORDER BY n DESC LIMIT 15`),
    schools: all(`SELECT school k, COUNT(*) n FROM users WHERE school IS NOT NULL GROUP BY school ORDER BY n DESC LIMIT 15`),
    events: all(`SELECT type k, COUNT(*) n FROM events GROUP BY type ORDER BY n DESC`),
    shareChannels: all(`SELECT json_extract(meta,'$.channel') k, COUNT(*) n FROM events WHERE type='share' GROUP BY k ORDER BY n DESC`),
  });
});

app.get('/api/admin/users', admin, (req, res) => {
  const s = '%' + String(req.query.q || '') + '%';
  const sorts = { points: 'total_points DESC', recent: 'last_seen DESC', time: 'time_spent DESC', new: 'created_at DESC', refs: 'refs DESC', streak: 'streak DESC' };
  const order = sorts[req.query.sort] || 'last_seen DESC';
  const rows = all(`SELECT u.id, u.nickname, u.phone, u.state, u.school, u.ip_signup, u.ip_last, u.total_points, u.coins, u.streak, u.best_streak, u.time_spent, u.created_at, u.last_seen, u.wa_optin, u.savers,
    (SELECT COUNT(*) FROM users r WHERE r.referred_by=u.id) refs, (SELECT COUNT(*) FROM plays p WHERE p.user_id=u.id AND p.finished_at IS NOT NULL) rounds
    FROM users u WHERE u.nickname LIKE ? OR u.phone LIKE ? OR u.ip_last LIKE ? OR u.state LIKE ? ORDER BY ${order} LIMIT 300`, s, s, s, s);
  res.json({ rows });
});

app.get('/api/admin/user/:id', admin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = one(`SELECT * FROM users WHERE id=?`, id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({
    user, plays: all(`SELECT day, official, correct, points, avg_ms, started_at, finished_at FROM plays WHERE user_id=? ORDER BY id DESC`, id),
    events: all(`SELECT type, meta, ip, created_at FROM events WHERE user_id=? ORDER BY id DESC LIMIT 300`, id),
    activity: all(`SELECT date, secs, hits FROM activity WHERE user_id=? ORDER BY date DESC LIMIT 60`, id),
    badges: all(`SELECT badge, awarded_at FROM badges WHERE user_id=?`, id),
    referrals: all(`SELECT nickname, created_at, ref_rewarded FROM users WHERE referred_by=? ORDER BY id DESC`, id),
    visits: all(`SELECT place, mode, correct, first_at FROM visits WHERE user_id=?`, id),
    sameIp: all(`SELECT id, nickname, phone FROM users WHERE (ip_signup=? OR ip_last=?) AND id!=? LIMIT 50`, user.ip_signup, user.ip_last, id),
  });
});

app.get('/api/admin/questions', admin, (req, res) => {
  const stats = new Map(all(`SELECT qid, COUNT(*) n, SUM(correct) c, AVG(ms) ms FROM answers WHERE qid IS NOT NULL GROUP BY qid`).map(r => [r.qid, r]));
  const rows = pool().all.map(x => { const st = stats.get(x.id); return { id: x.id, cat: x.c, q: x.q, answer: x.o[0], by: x.by, n: st ? st.n : 0, pct: st && st.n ? Math.round(100 * st.c / st.n) : null, ms: st ? Math.round(st.ms) : null }; });
  const queue = all(`SELECT k.*, u.nickname n FROM qbank k LEFT JOIN users u ON u.id=k.by_user WHERE k.status='pending' ORDER BY k.id DESC LIMIT 200`).map(r => ({ ...r, o: JSON.parse(r.o) }));
  res.json({ rows, queue, ai: !!process.env.ANTHROPIC_API_KEY, total: rows.length });
});
app.post('/api/admin/questions/review', admin, (req, res) => {
  const id = parseInt(req.body.id, 10), ok = req.body.approve === true;
  const r = one(`SELECT * FROM qbank WHERE id=?`, id); if (!r) return res.status(404).json({ error: 'Not found' });
  if (req.body.q || req.body.o) { // admin can fix wording before approving
    const qq = String(req.body.q || r.q).slice(0, 220), oo = Array.isArray(req.body.o) && req.body.o.length === 4 ? req.body.o.map(x => String(x).slice(0, 80)) : JSON.parse(r.o);
    run(`UPDATE qbank SET q=?, o=? WHERE id=?`, qq, JSON.stringify(oo), id);
  }
  run(`UPDATE qbank SET status=? WHERE id=?`, ok ? 'live' : 'rejected', id); resetPool();
  if (ok && r.by_user) { run(`UPDATE users SET coins=coins+50 WHERE id=?`, r.by_user); notify(r.by_user, 'qok', `🎉 Your question is now live in Detty December: "${r.q.slice(0, 60)}…" +50 🪙`, null); }
  res.json({ ok: true });
});
// Players submit questions about their hometown or December; the admin approves them.
app.post('/api/questions/submit', auth, (req, res) => {
  const b = req.body, qq = String(b.q || '').trim().slice(0, 220), o = (Array.isArray(b.o) ? b.o : []).map(x => String(x || '').trim().slice(0, 80));
  if (qq.length < 12 || o.length !== 4 || o.some(x => !x) || new Set(o.map(x => x.toLowerCase())).size !== 4) return res.status(400).json({ error: 'Write the question, the right answer and 3 different wrong answers.' });
  const cat = ['Christmas', 'Travel', 'Naija', 'Food', 'Slang', 'Music', 'Nollywood', 'Sports', 'Ask Mummy'].includes(b.c) ? b.c : 'Naija';
  const today = one(`SELECT COUNT(*) n FROM qbank WHERE by_user=? AND created_at>?`, req.user.id, now() - 86400000).n;
  if (today >= 5) return res.status(429).json({ error: 'You have sent 5 questions today. Send more tomorrow 🙏🏾' });
  run(`INSERT INTO qbank(c,q,o,source,by_user,created_at) VALUES(?,?,?,?,?,?)`, cat, qq, JSON.stringify(o), 'player', req.user.id, now());
  logEvent(req.user.id, 'q_submit', { c: cat }, req.ipaddr);
  res.json({ ok: true });
});
// Optional: with ANTHROPIC_API_KEY set, the admin can ask Claude to draft fresh questions. They wait in the queue for approval.
app.post('/api/admin/questions/ai', admin, async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return res.status(400).json({ error: 'Set ANTHROPIC_API_KEY on the server to use AI drafts.' });
  const topic = String(req.body.topic || 'Nigerian Detty December, Christmas at home, travel home, food, slang, owambe').slice(0, 200);
  const have = pool().all.map(x => x.q).slice(-300).join('\n');
  const prompt = `Write 10 multiple-choice trivia questions for a Nigerian December holiday game. Topic: ${topic}.
Rules: every fact must be well established and checkable; no rumours, no living people's private lives, no politics, no religion debates. Mix easy and medium. Use simple English, a little pidgin flavour is fine in the question only.
Each question has exactly 4 options; the FIRST option is the correct one; wrong options must be plausible. Category must be one of: Christmas, Travel, Naija, Food, Slang, Music, Nollywood, Sports, Ask Mummy.
Do not repeat any of these existing questions:\n${have}
Reply with only JSON: [{"c":"…","q":"…","o":["correct","wrong","wrong","wrong"],"note":"one-line source or reason it is true"}]`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-sonnet-5-5', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }) });
    const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'AI request failed');
    const text = (j.content || []).map(x => x.text || '').join(''); const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
    let n = 0;
    for (const x of arr) { if (!x || !x.q || !Array.isArray(x.o) || x.o.length !== 4) continue; run(`INSERT INTO qbank(c,q,o,source,note,created_at) VALUES(?,?,?,?,?,?)`, String(x.c || 'Naija'), String(x.q).slice(0, 220), JSON.stringify(x.o.map(v => String(v).slice(0, 80))), 'ai', String(x.note || '').slice(0, 200), now()); n++; }
    res.json({ added: n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/events', admin, (req, res) => {
  const after = parseInt(req.query.after, 10) || 0;
  res.json({ rows: all(`SELECT e.id, e.type, e.meta, e.ip, e.created_at, u.nickname, u.id uid FROM events e LEFT JOIN users u ON u.id=e.user_id WHERE e.id>? ORDER BY e.id DESC LIMIT 150`, after) });
});

app.get('/api/admin/winners', admin, (req, res) => {
  const d = parseInt(req.query.day, 10) || liveDay() || latestOpened() || 1;
  res.json({ day: d, rows: all(`SELECT u.id, u.nickname, u.phone, u.state, p.correct, p.points, p.avg_ms, p.finished_at FROM plays p JOIN users u ON u.id=p.user_id WHERE p.day=? AND p.official=1 AND p.finished_at IS NOT NULL ORDER BY p.points DESC, p.finished_at ASC LIMIT 50`, d) });
});

app.get('/api/admin/flags', admin, (req, res) => {
  res.json({
    ips: all(`SELECT ip_signup ip, COUNT(*) n, GROUP_CONCAT(nickname, ', ') names FROM users GROUP BY ip_signup HAVING n>=4 ORDER BY n DESC LIMIT 50`),
    referrers: all(`SELECT u.id, u.nickname, u.phone, COUNT(r.id) n FROM users u JOIN users r ON r.referred_by=u.id GROUP BY u.id HAVING n>=10 ORDER BY n DESC LIMIT 50`),
    fast: all(`SELECT u.id, u.nickname, p.day, p.correct, p.avg_ms FROM plays p JOIN users u ON u.id=p.user_id WHERE p.official=1 AND p.correct=7 AND p.avg_ms<1200 ORDER BY p.avg_ms LIMIT 50`),
  });
});

function csv(res, name, rows) {
  const cols = rows.length ? Object.keys(rows[0]) : ['empty'];
  const esc = (v) => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
  res.send([cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n'));
}
app.get('/api/admin/export/:type', admin, (req, res) => {
  const t = req.params.type;
  if (t === 'users') return csv(res, 'users', all(`SELECT id, nickname, phone, state, school, total_points, streak, best_streak, time_spent, ip_signup, ip_last, wa_optin, datetime(created_at/1000,'unixepoch','+1 hour') joined_wat, datetime(last_seen/1000,'unixepoch','+1 hour') last_seen_wat FROM users ORDER BY id`));
  if (t === 'reminders') return csv(res, 'whatsapp-reminders', all(`SELECT nickname, phone, state FROM users WHERE wa_optin=1 ORDER BY id`));
  if (t === 'winners') { const d = parseInt(req.query.day, 10) || 1; return csv(res, `winners-day-${d}`, all(`SELECT u.nickname, u.phone, u.state, p.correct, p.points, datetime(p.finished_at/1000,'unixepoch','+1 hour') finished_wat FROM plays p JOIN users u ON u.id=p.user_id WHERE p.day=? AND p.official=1 AND p.finished_at IS NOT NULL ORDER BY p.points DESC, p.finished_at LIMIT 50`, d)); }
  if (t === 'events') return csv(res, 'events', all(`SELECT e.id, u.nickname, e.type, e.meta, e.ip, datetime(e.created_at/1000,'unixepoch','+1 hour') at_wat FROM events e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.id DESC LIMIT 50000`));
  res.status(400).send('unknown');
});

app.post('/api/admin/clock', admin, (req, res) => {
  if (req.body.iso) { const target = Date.parse(req.body.iso); if (isNaN(target)) return res.status(400).json({ error: 'Bad date' }); OFFSET = target - Date.now(); }
  else OFFSET = 0;
  run(`INSERT INTO settings(key,value) VALUES('clock_offset',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, String(OFFSET));
  res.json({ ok: true, now: now(), offset: OFFSET });
});

// ---------- Detty Air (3D flight) ----------
// 10 coins for each bucket-list thing done on the flight, paid once per WAT day.
const FLIGHT_TODO = new Set(['seat', 'cockpit', 'drink', 'food', 'window', 'movie', 'gist', 'toilet', 'clap']);
db.exec(`CREATE TABLE IF NOT EXISTS flights(user_id INTEGER, date TEXT, did TEXT, earned INTEGER, created_at INTEGER, PRIMARY KEY(user_id, date))`);
app.post('/api/flight/done', auth, (req, res) => {
  const did = [...new Set((Array.isArray(req.body.did) ? req.body.did : []).map(String))].filter(x => FLIGHT_TODO.has(x));
  const date = watDate(), first = !one(`SELECT 1 FROM flights WHERE user_id=? AND date=?`, req.user.id, date);
  const earned = first ? did.length * 10 : 0;
  if (first) { run(`INSERT INTO flights VALUES(?,?,?,?,?)`, req.user.id, date, JSON.stringify(did), earned, now()); if (earned) run(`UPDATE users SET coins=coins+? WHERE id=?`, earned, req.user.id); }
  logEvent(req.user.id, 'flight_done', { did: did.length, earned }, req.ipaddr);
  res.json({ earned, coins: one(`SELECT coins FROM users WHERE id=?`, req.user.id).coins, already: !first });
});

// ---------- Gist Partner (premium) ----------
const GIST = require('./gist')(app, { one, all, run, db, auth, admin, now, watDate, liveDay, latestOpened, effectiveStreak, rankOf, friendsOf, journeyView, showStart, SHOW_POT, logEvent,
  townName: (id) => (JOURNEY.towns.find(t => t.id === id) || { name: id }).name });

// ---------- Christmas Drip Booth (premium clothe swap) ----------
require('./swap')(app, { one, all, run, db, auth, admin, now, watDate, logEvent, isPremium: GIST.isPremium });

// ---------- static ----------
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', setHeaders: (res, p) => { if (p.endsWith('sw.js') || p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Detty December running on http://localhost:${PORT}  (admin: /admin)`));
