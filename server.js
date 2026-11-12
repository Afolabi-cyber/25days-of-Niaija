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
CREATE TABLE IF NOT EXISTS inbox(id INTEGER PRIMARY KEY, user_id INTEGER, kind TEXT, text TEXT, link TEXT, created_at INTEGER, seen INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS visits(user_id INTEGER, place TEXT, mode TEXT, first_at INTEGER, correct INTEGER, PRIMARY KEY(user_id, place));
`);
for (const [col, def] of [['coins', 'INTEGER DEFAULT 300'], ['loc', 'TEXT'], ['trip', 'TEXT'], ['drive', 'INTEGER DEFAULT 0'], ['home_lat', 'REAL'], ['home_lon', 'REAL']]) {
  try { db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`); } catch {}
}
db.exec(`CREATE TABLE IF NOT EXISTS lifts(id INTEGER PRIMARY KEY, rider INTEGER, driver INTEGER, status TEXT DEFAULT 'wait', place TEXT, created_at INTEGER, done_at INTEGER);
CREATE INDEX IF NOT EXISTS lifts_d ON lifts(driver, status);`);
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
app.use(express.json({ limit: '50kb' }));

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
      points: u.total_points, coins: u.coins, streak: effectiveStreak(u), bestStreak: u.best_streak, savers: u.savers, rank: rankOf(u), refs, timeSpent: u.time_spent },
    stats: { rounds: stats.rounds, accuracy: stats.rounds ? Math.round(100 * stats.correct / (stats.rounds * 7)) : 0 },
    badges, allBadges: BADGES, squads, days: dayStatus(u), now: now(), live, next: nextDay(), nextAt: nextDay() ? unlockAt(nextDay()) : null,
    inbox: all(`SELECT id, kind, text, link, created_at FROM inbox WHERE user_id=? AND seen=0 ORDER BY id DESC LIMIT 5`, u.id),
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
    const perms = QUESTIONS[d].map(() => shuffle([0, 1, 2, 3]));
    const r = run(`INSERT INTO plays(user_id,day,official,state,started_at) VALUES(?,?,?,?,?)`, u.id, d, inWindow ? 1 : 0, JSON.stringify({ perms, i: 0, servedAt: null, log: [] }), t);
    play = one(`SELECT * FROM plays WHERE id=?`, Number(r.lastInsertRowid));
    logEvent(u.id, 'round_start', { day: d, official: inWindow, minsAfterUnlock: d ? Math.round((t - unlockAt(d)) / 60000) : null }, req.ipaddr);
  }
  res.json({ playId: play.id, day: d, official: !!play.official, total: QUESTIONS[d].length, index: JSON.parse(play.state).i });
});

app.post('/api/round/next', auth, (req, res) => {
  const play = one(`SELECT * FROM plays WHERE id=? AND user_id=?`, req.body.playId, req.user.id);
  if (!play || play.finished_at) return res.status(400).json({ error: 'Round not active.' });
  const st = JSON.parse(play.state);
  const qd = QUESTIONS[play.day][st.i];
  if (!st.servedAt) { st.servedAt = now(); run(`UPDATE plays SET state=? WHERE id=?`, JSON.stringify(st), play.id); }
  const limit = limitFor(st.i) + ((st.extra || {})[st.i] || 0);
  res.json({ index: st.i, used: st.used || {}, coins: req.user.coins, total: QUESTIONS[play.day].length, category: qd.c, question: qd.q, options: st.perms[st.i].map(k => qd.o[k]),
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
  run(`INSERT INTO answers(play_id,user_id,day,qidx,official,correct,ms,points,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, play.id, u.id, play.day, i, play.official, correct ? 1 : 0, ms, pts, now());
  st.log.push({ c: correct ? 1 : 0, ms, pts });
  const agg = one(`SELECT COUNT(*) n, SUM(correct) c FROM answers WHERE day=? AND qidx=? AND official=?`, play.day, i, play.day === 0 ? 0 : 1);
  const pct = agg.n ? Math.round(100 * agg.c / agg.n) : 100;
  const out = { correct, timedOut, correctIndex: perm.indexOf(0), points: pts, pct, index: i };
  st.i += 1; st.servedAt = null;
  if (st.i >= QUESTIONS[play.day].length) {
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

const SHOP = { water: 5, gala: 10, chips: 10, bread: 15, fuel: 20 };
app.post('/api/trip/buy', auth, (req, res) => {
  const cost = SHOP[req.body.item];
  const u = one(`SELECT coins, drive FROM users WHERE id=?`, req.user.id);
  if (!cost) return res.status(400).json({ error: 'Unknown item.' });
  if (!u.drive) return res.status(400).json({ error: 'You can only buy while driving.' });
  if (u.coins < cost) return res.status(400).json({ error: `You need ${cost} coins.` });
  run(`UPDATE users SET coins=coins-? WHERE id=?`, cost, req.user.id);
  logEvent(req.user.id, 'drive_buy', { item: req.body.item, cost }, req.ipaddr);
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
  res.json({ bonus, coins: u.coins + bonus });
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
    const rows = all(`SELECT id, nickname n, state s, total_points v, streak k FROM users WHERE total_points>0 ORDER BY total_points DESC, created_at ASC LIMIT 50`);
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
const EVENT_TYPES = new Set(['app_open', 'tab', 'trip_view', 'contacts_pick', 'reaction', 'duel_share', 'share', 'invite', 'install_prompt', 'installed', 'lang', 'sound', 'board', 'squad_view', 'result_view', 'how_to', 'error', 'copy_link']);
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
      drives: one(`SELECT COUNT(*) n FROM events WHERE type='drive_end'`).n,
      hawkerBuys: one(`SELECT COUNT(*) n FROM events WHERE type='drive_buy'`).n,
      duels: one(`SELECT COUNT(*) n FROM duels`).n,
      duelPlays: one(`SELECT COUNT(*) n FROM events WHERE type='duel_done'`).n,
      d1: base ? Math.round(100 * ret / base) : null,
    },
    funnel: [['Signed up', totalUsers], ['Started a round', started], ['Finished a round', finished], ['Shared a score', sharers], ['Invited a friend who joined', inviters]],
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
  const stats = all(`SELECT day, qidx, COUNT(*) n, SUM(correct) c, AVG(ms) ms FROM answers GROUP BY day, qidx`);
  const out = [];
  for (const [d, qs] of Object.entries(QUESTIONS)) qs.forEach((qq, i) => {
    const s = stats.find(x => x.day === +d && x.qidx === i);
    out.push({ day: +d, i, cat: qq.c, q: qq.q, answer: qq.o[0], n: s ? s.n : 0, pct: s && s.n ? Math.round(100 * s.c / s.n) : null, ms: s ? Math.round(s.ms) : null });
  });
  res.json({ rows: out });
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

// ---------- static ----------
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', setHeaders: (res, p) => { if (p.endsWith('sw.js') || p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`25 Days of Naija running on http://localhost:${PORT}  (admin: /admin)`));
