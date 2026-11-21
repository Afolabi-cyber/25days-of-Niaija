'use strict';
// Gist Partner: a premium character who gists you about what is really happening on the app
// (your streak, friends who passed you, tonight's show, your journey home...).
//
// How the gist is written:
//   1. facts(): real numbers pulled from the database for this player, right now.
//   2. If ANTHROPIC_API_KEY is set, the persona's personality + those facts go to Claude, which writes
//      the gist in that character's voice (never inventing facts). Otherwise a built-in writer mixes the
//      persona's openers, reactions and closers around the same facts.
//
// How the voice plugs in (when the Pidgin TTS model is ready):
//   Set PIDGIN_TTS_URL (and optionally PIDGIN_TTS_KEY). The app POSTs
//     { text, voice: { voiceId, gender, age, pace, pitch, accent, style }, persona, format: "mp3" }
//   to that URL with "Authorization: Bearer <PIDGIN_TTS_KEY>" and expects audio bytes back
//   (audio/mpeg, audio/wav or audio/ogg). Nothing else needs to change: the player app already
//   shows the play buttons and auto-plays lines for premium players once /api/gist/config says voice: true.
const fs = require('fs');
const path = require('path');

module.exports = function gist(app, d) {
  const { one, all, run, db, auth, admin, now, watDate, liveDay, latestOpened, effectiveStreak, rankOf, friendsOf, journeyView, townName, showStart, SHOW_POT, logEvent } = d;
  const CAST = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'gist.json'), 'utf8'));
  const P = Object.fromEntries(CAST.personas.map(p => [p.id, p]));
  const FREE_LINES = 3, PREMIUM_DAILY_CAP = 40;

  for (const [col, def] of [['premium_until', 'INTEGER DEFAULT 0'], ['premium_plan', 'TEXT']]) { try { db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`); } catch {} }
  db.exec(`CREATE TABLE IF NOT EXISTS gist_log(id INTEGER PRIMARY KEY, user_id INTEGER, date TEXT, persona TEXT, lines INTEGER, ai INTEGER, created_at INTEGER);
  CREATE INDEX IF NOT EXISTS gist_log_u ON gist_log(user_id, date);
  CREATE TABLE IF NOT EXISTS premium_interest(user_id INTEGER, plan TEXT, created_at INTEGER, PRIMARY KEY(user_id, plan));`);

  const isPremium = (u) => !!u && (u.premium_until || 0) > now();
  const voiceReady = () => !!process.env.PIDGIN_TTS_URL;
  const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
  // small seeded random so a gist session reads the same if re-fetched
  const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const publicPersona = (p) => ({ id: p.id, name: p.name, emoji: p.emoji, color: p.color, free: !!p.free, tagline: p.tagline, bio: p.bio, origin: p.origin, age: p.age, traits: p.traits, topics: p.topics, energy: p.energy, pidgin: p.pidgin, voice: { gender: p.voice.gender, age: p.voice.age, accent: p.voice.accent, style: p.voice.style } });

  // ---------- real facts about this player, right now ----------
  function facts(uid) {
    const u = one(`SELECT * FROM users WHERE id=?`, uid), out = [], add = (k, mood, text, w = 1) => out.push({ k, mood, text, w });
    const day = liveDay() || latestOpened(), date = watDate();
    const fr = friendsOf(uid), frIds = fr.map(f => f.id);
    const streak = effectiveStreak(u);
    if (streak >= 3) add('streak', 'hype', `You don play ${streak} days straight. Your streak dey shine.`, 2);
    else if (u.last_played_day && streak === 0) add('streak', 'tease', `Your streak don break o. You fit start fresh today.`, 2);
    else if (streak > 0) add('streak', 'info', `Your streak na ${streak} day${streak > 1 ? 's' : ''}. Keep am alive.`);
    if (u.savers > 0 && streak >= 2) add('savers', 'info', `You get ${u.savers} streak saver${u.savers > 1 ? 's' : ''} for back pocket, in case wahala burst.`);
    if (day) {
      const mine = one(`SELECT points, correct, finished_at FROM plays WHERE user_id=? AND day=? AND official=1 AND finished_at IS NOT NULL`, uid, day);
      const players = one(`SELECT COUNT(*) n FROM plays WHERE day=? AND official=1 AND finished_at IS NOT NULL`, day).n;
      if (mine) {
        const rank = one(`SELECT COUNT(*) n FROM plays WHERE day=? AND official=1 AND finished_at IS NOT NULL AND (points>? OR (points=? AND finished_at<?))`, day, mine.points, mine.points, mine.finished_at).n + 1;
        add('today', mine.correct >= 5 ? 'hype' : 'tease', `For today gift box you score ${mine.correct} out of 7, ${mine.points} points. You be number ${rank} out of ${players} players.`, 3);
        if (frIds.length) {
          const fp = all(`SELECT u.nickname n, p.points v FROM plays p JOIN users u ON u.id=p.user_id WHERE p.day=? AND p.official=1 AND p.finished_at IS NOT NULL AND p.user_id IN (${frIds.map(() => '?').join(',')}) ORDER BY p.points DESC`, day, ...frIds);
          const ahead = fp.filter(x => x.v > mine.points), behind = fp.filter(x => x.v < mine.points);
          if (ahead.length) { const a = ahead[ahead.length - 1]; add('rival', 'tease', `${a.n} don pass you today with ${a.v - mine.points} points. ${a.v} to your ${mine.points}.`, 3); }
          if (behind.length) add('beat', 'hype', `You don beat ${behind.slice(0, 3).map(x => x.n).join(', ')}${behind.length > 3 ? ` and ${behind.length - 3} more` : ''} today.`, 2);
          const notYet = fr.filter(f => !fp.find(x => x.n === f.nickname)).slice(0, 2);
          if (notYet.length && !ahead.length) add('lazy', 'info', `${notYet.map(f => f.nickname).join(' and ')} never even open today box. Dem dey sleep!`);
        }
      } else if (liveDay()) add('notplayed', 'tease', `Gift box ${day} don open and you never play am. ${players} people don play already.`, 3);
      const top = one(`SELECT u.nickname n, u.state s, p.points v FROM plays p JOIN users u ON u.id=p.user_id WHERE p.day=? AND p.official=1 AND p.finished_at IS NOT NULL ORDER BY p.points DESC, p.finished_at ASC LIMIT 1`, day);
      if (top) add('top', 'info', `Number one for the whole country today na ${top.n}${top.s ? ` from ${top.s}` : ''} with ${top.v} points.`);
    }
    const rk = rankOf(u); if (rk && u.total_points > 0) add('rank', rk <= 50 ? 'hype' : 'info', `For the overall board you dey number ${rk} with ${u.total_points.toLocaleString()} points.`);
    const run_ = one(`SELECT total FROM drive_runs WHERE user_id=? AND date=?`, uid, date);
    const lead = one(`SELECT u2.nickname n, r.total FROM drive_runs r JOIN users u2 ON u2.id=r.user_id WHERE r.date=? ORDER BY r.total ASC LIMIT 1`, date);
    if (run_ && lead) add('drive', lead.n === u.nickname ? 'hype' : 'info', lead.n === u.nickname ? `You get the fastest Drive of the Day for the whole country right now: ${run_.total.toFixed(1)} seconds!` : `Your Drive of the Day time na ${run_.total.toFixed(1)}s. ${lead.n} dey lead with ${lead.total.toFixed(1)}s.`, 2);
    else if (lead) add('drive', 'tease', `${lead.n} dey lead today's road with ${lead.total.toFixed(1)}s and you never drive am.`);
    const j = journeyView(uid);
    if (j && j.arrived) add('journey', 'hype', `You don reach home for ${townName(j.home)}. December don land for your side!`);
    else if (j && j.next) add('journey', j.unlocked ? 'tease' : 'info', j.unlocked ? `Your next road from ${townName(j.at)} to ${townName(j.next)} don open. Your people dey wait for you for ${townName(j.home)}.` : `You dey ${townName(j.at)} for your journey home. Next stop na ${townName(j.next)}.`, 2);
    const ss = showStart(date), tNow = now();
    if (ss > tNow && ss - tNow < 12 * 3600000) { const h = new Date(ss + 3600000), hh = h.getUTCHours(), mm = String(h.getUTCMinutes()).padStart(2, '0'); add('show', 'info', `Owambe Night Live go start by ${((hh + 11) % 12) + 1}:${mm}${hh >= 12 ? 'pm' : 'am'}. ${SHOW_POT.toLocaleString()} coins dey the pot for survivors.`, 2); }
    const gifts = one(`SELECT COUNT(*) n FROM gifts WHERE to_id=? AND opened=0`, uid).n;
    if (gifts) { const g = one(`SELECT u.nickname n FROM gifts g JOIN users u ON u.id=g.from_id WHERE g.to_id=? AND g.opened=0 ORDER BY g.id DESC LIMIT 1`, uid); add('gifts', 'hype', `Somebody send you gift! ${g.n}${gifts > 1 ? ` and ${gifts - 1} other person` : ''}. Go open am for the Market.`, 3); }
    if (u.coins >= 500) add('coins', 'hype', `You get ${u.coins.toLocaleString()} coins for pocket. You fit buy gift for your people.`);
    const sq = one(`SELECT s.name, (SELECT COUNT(*) FROM squad_members m2 WHERE m2.squad_id=s.id) n FROM squads s JOIN squad_members m ON m.squad_id=s.id WHERE m.user_id=? LIMIT 1`, uid);
    if (sq) { const best = one(`SELECT u.nickname n, u.total_points v FROM squad_members m JOIN users u ON u.id=m.user_id JOIN squads s ON s.id=m.squad_id WHERE s.name=? ORDER BY u.total_points DESC LIMIT 1`, sq.name); if (best) add('squad', best.n === u.nickname ? 'hype' : 'info', best.n === u.nickname ? `For your squad ${sq.name}, na you dey carry first.` : `For your squad ${sq.name}, ${best.n} dey carry first with ${best.v.toLocaleString()} points.`); }
    const km = one(`SELECT u.nickname n, t.score FROM knowme_tries t JOIN users u ON u.id=t.user_id WHERE t.owner=? ORDER BY t.score DESC, t.created_at ASC LIMIT 1`, uid);
    if (km) add('knowme', 'info', `For your "How well do you know me" quiz, ${km.n} know you pass everybody: ${km.score} out of 5.`);
    const online = fr.filter(f => tNow - f.last_seen < 120000).slice(0, 3);
    if (online.length) add('online', 'info', `${online.map(f => f.nickname).join(', ')} dey online now now. Send them challenge!`);
    if (!fr.length) add('nofriends', 'tease', `You never get any padi for here. Invite your people, na dem dey make December sweet.`);
    const fresh = one(`SELECT COUNT(*) n FROM users WHERE created_at > ?`, tNow - 86400000).n;
    if (fresh > 5) add('new', 'info', `${fresh} new people join the app for the last 24 hours.`);
    return { user: u, list: out.sort((a, b) => b.w - a.w) };
  }

  // ---------- built-in writer (no AI key needed) ----------
  function writeLocal(p, f, r) {
    const lines = [{ t: pick(p.openers, r) }];
    for (const x of f) {
      let t = x.text;
      if (x.mood === 'hype' && r() < .6) t += ' ' + pick(p.hype, r);
      else if (x.mood === 'tease' && r() < .6) t += ' ' + pick(p.tease, r);
      else if (r() < .25) t = pick(p.fillers, r) + ' ' + t;
      lines.push({ t });
    }
    lines.push({ t: pick(p.closers, r) });
    return lines;
  }

  // ---------- AI writer (optional, uses ANTHROPIC_API_KEY) ----------
  async function writeAI(p, f, nickname) {
    const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
    const prompt = `You are ${p.name}, a character in a Nigerian December game app, gisting with a player called "${nickname}".
Character: ${p.bio} From ${p.origin}, ${p.age}. Traits: ${p.traits.join(', ')}. Energy ${p.energy}/5. Pidgin level ${p.pidgin}/5 (5 = full Naija pidgin, 1 = mostly English).
Typical openers: ${p.openers.join(' | ')}. Typical closers: ${p.closers.join(' | ')}.

Here are the ONLY facts you may gist about (all true, from the app right now):
${f.map(x => '- ' + x.text).join('\n')}

Write the gist as ${Math.min(9, f.length + 2)} short spoken lines (each under 30 words), like a voice note: open in character, gist the facts in an entertaining way, react like the character would, close in character.
Rules: never invent numbers, names or events that are not in the facts. Playful teasing is fine, never insults, never anything about religion, politics, tribe, looks, money troubles, relationships or anyone's private life. Keep it warm. The lines will be read aloud by a Pidgin text-to-speech voice, so no emojis, no hashtags, write numbers as digits.
Reply with only JSON: ["line 1", "line 2", ...]`;
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-sonnet-5-5', max_tokens: 900, messages: [{ role: 'user', content: prompt }] }) });
      const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'AI request failed');
      const text = (j.content || []).map(x => x.text || '').join('');
      const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
      const lines = arr.filter(x => typeof x === 'string' && x.trim()).slice(0, 10).map(x => ({ t: x.trim().slice(0, 240) }));
      return lines.length >= 2 ? lines : null;
    } catch (e) { console.error('gist ai:', e.message); return null; }
  }

  // ---------- routes ----------
  app.get('/api/gist/config', auth, (req, res) => {
    const u = one(`SELECT premium_until, premium_plan FROM users WHERE id=?`, req.user.id), prem = isPremium(u), date = watDate();
    const usedToday = one(`SELECT COUNT(*) n FROM gist_log WHERE user_id=? AND date=?`, req.user.id, date).n;
    res.json({ personas: CAST.personas.map(publicPersona), replies: CAST.replies, plans: CAST.plans,
      premium: { active: prem, until: prem ? u.premium_until : null, plan: prem ? u.premium_plan : null },
      freeLeft: prem ? null : Math.max(0, 1 - usedToday), freeLines: FREE_LINES, voice: voiceReady(), ai: !!process.env.ANTHROPIC_API_KEY,
      interested: all(`SELECT plan FROM premium_interest WHERE user_id=?`, req.user.id).map(x => x.plan) });
  });

  // body: { persona, more }  more = number of facts already gisted in this session (for "Ehen?! Tell me more")
  app.post('/api/gist/session', auth, async (req, res) => {
    const p = P[req.body.persona]; if (!p) return res.status(400).json({ error: 'Pick a gist partner.' });
    const { user: u, list } = facts(req.user.id), prem = isPremium(u), date = watDate();
    const usedToday = one(`SELECT COUNT(*) n FROM gist_log WHERE user_id=? AND date=?`, u.id, date).n;
    if (!prem && !p.free) return res.status(402).json({ error: `${p.name} na premium partner.`, premium: true });
    if (!prem && usedToday >= 1) return res.status(402).json({ error: 'You don use your free gist for today. Premium partners dey gist all day.', premium: true });
    if (prem && usedToday >= PREMIUM_DAILY_CAP) return res.status(429).json({ error: 'Una don gist tire for today 😅 Come back tomorrow.' });
    const skip = Math.max(0, parseInt(req.body.more, 10) || 0);
    if (skip && !prem) return res.status(402).json({ error: 'More gist na for premium.', premium: true });
    const batch = list.slice(skip, skip + (skip ? 4 : 6));
    const r = rng(u.id * 7919 + date.split('-').join('') * 1 + skip * 31 + p.id.length);
    let lines = null, ai = false;
    if (!batch.length) lines = [{ t: pick(p.fillers, r) + ' I don tell you everything wey I know for now. Go play, make I get fresh gist for you!' }];
    else if (prem) { lines = await writeAI(p, batch, u.nickname); ai = !!lines; }
    if (!lines) lines = writeLocal(p, batch, r);
    if (skip && lines.length > 1) lines = lines.slice(1); // no second "hello" when continuing
    const locked = !prem && lines.length > FREE_LINES ? lines.length - FREE_LINES : 0;
    if (locked) lines = lines.slice(0, FREE_LINES);
    run(`INSERT INTO gist_log(user_id,date,persona,lines,ai,created_at) VALUES(?,?,?,?,?,?)`, u.id, date, p.id, lines.length, ai ? 1 : 0, now());
    logEvent(u.id, 'gist', { persona: p.id, more: skip, ai, premium: prem }, req.ipaddr);
    res.json({ persona: p.id, lines, used: skip + batch.length, hasMore: prem && list.length > skip + batch.length, locked, premium: prem, voice: prem && voiceReady() });
  });

  // Pidgin TTS hook. Premium only. Streams audio straight back from your TTS service.
  app.post('/api/gist/tts', auth, async (req, res) => {
    const u = one(`SELECT premium_until FROM users WHERE id=?`, req.user.id);
    if (!isPremium(u)) return res.status(402).json({ error: 'Voice gist na for premium.', premium: true });
    const p = P[req.body.persona], text = String(req.body.text || '').slice(0, 400);
    if (!p || !text) return res.status(400).json({ error: 'Missing text.' });
    if (!voiceReady()) return res.status(503).json({ error: 'Voice is coming soon.', comingSoon: true });
    try {
      const r = await fetch(process.env.PIDGIN_TTS_URL, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.PIDGIN_TTS_KEY ? { authorization: 'Bearer ' + process.env.PIDGIN_TTS_KEY } : {}) },
        body: JSON.stringify({ text, voice: p.voice, persona: p.id, format: 'mp3' }) });
      if (!r.ok) throw new Error('TTS service said ' + r.status);
      res.set('content-type', r.headers.get('content-type') || 'audio/mpeg'); res.set('cache-control', 'private, max-age=86400');
      res.send(Buffer.from(await r.arrayBuffer()));
    } catch (e) { console.error('tts:', e.message); res.status(502).json({ error: 'Voice no work this time. Try again.' }); }
  });

  // Payment is not wired yet: this records who wants which plan so you can launch to a waiting list.
  // When you add Paystack/Flutterwave, call grantPremium(userId, plan) from the payment webhook.
  app.post('/api/premium/interest', auth, (req, res) => {
    const plan = CAST.plans.find(x => x.id === req.body.plan); if (!plan) return res.status(400).json({ error: 'Pick a plan.' });
    run(`INSERT OR IGNORE INTO premium_interest VALUES(?,?,?)`, req.user.id, plan.id, now());
    logEvent(req.user.id, 'premium_interest', { plan: plan.id }, req.ipaddr);
    res.json({ ok: true, comingSoon: true });
  });

  function grantPremium(uid, planId, days) {
    const plan = CAST.plans.find(x => x.id === planId) || { id: planId || 'gift', days: days || 7 };
    const u = one(`SELECT premium_until FROM users WHERE id=?`, uid); if (!u) return null;
    const until = Math.max(now(), u.premium_until || 0) + (days || plan.days) * 86400000;
    run(`UPDATE users SET premium_until=?, premium_plan=? WHERE id=?`, until, plan.id, uid);
    return until;
  }
  app.post('/api/admin/premium', admin, (req, res) => {
    const id = parseInt(req.body.id, 10), days = parseInt(req.body.days, 10);
    if (days === 0) { run(`UPDATE users SET premium_until=0 WHERE id=?`, id); return res.json({ until: 0 }); }
    const until = grantPremium(id, 'gift', Math.max(1, Math.min(365, days || 7)));
    if (!until) return res.status(404).json({ error: 'No such player.' });
    res.json({ until });
  });
  // ---------- premium unlock codes (testing, gifts, promos) ----------
  // Codes come from PREMIUM_CODES ("CODE" or "CODE:days", comma-separated; unlimited uses) or are made in admin.
  db.exec(`CREATE TABLE IF NOT EXISTS premium_codes(code TEXT PRIMARY KEY, days INTEGER, max_uses INTEGER DEFAULT 0, uses INTEGER DEFAULT 0, note TEXT, created_at INTEGER);
  CREATE TABLE IF NOT EXISTS premium_redeems(code TEXT, user_id INTEGER, at INTEGER, PRIMARY KEY(code, user_id));`);
  const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40);
  for (const part of String(process.env.PREMIUM_CODES || '').split(',')) {
    const [c, d] = part.trim().split(':'), code = normCode(c); if (code.length < 6) continue;
    run(`INSERT INTO premium_codes(code,days,max_uses,uses,note,created_at) VALUES(?,?,0,0,'from PREMIUM_CODES',?) ON CONFLICT(code) DO UPDATE SET days=excluded.days, max_uses=0`, code, Math.max(1, Math.min(365, parseInt(d, 10) || 30)), now());
  }
  const tries = new Map(); // user id -> recent failed attempts (stops guessing)
  app.post('/api/premium/redeem', auth, (req, res) => {
    const uid = req.user.id, t = now(), recent = (tries.get(uid) || []).filter(x => t - x < 3600000);
    if (recent.length >= 8) return res.status(429).json({ error: 'Too many wrong codes. Try again in an hour.' });
    const code = normCode(req.body.code), row = code && one(`SELECT * FROM premium_codes WHERE code=?`, code);
    if (!row) { recent.push(t); tries.set(uid, recent); return res.status(404).json({ error: "That code no correct. Check it and try again." }); }
    if (one(`SELECT 1 x FROM premium_redeems WHERE code=? AND user_id=?`, code, uid)) return res.status(409).json({ error: 'You don already use this code.' });
    if (row.max_uses && row.uses >= row.max_uses) return res.status(410).json({ error: 'This code don finish. Ask for a new one.' });
    const until = grantPremium(uid, 'code', row.days);
    run(`INSERT INTO premium_redeems VALUES(?,?,?)`, code, uid, t); run(`UPDATE premium_codes SET uses=uses+1 WHERE code=?`, code);
    logEvent(uid, 'premium_code', { code, days: row.days }, req.ipaddr);
    res.json({ ok: true, until, days: row.days });
  });
  app.get('/api/admin/premium/codes', admin, (req, res) => res.json({ codes: all(`SELECT * FROM premium_codes ORDER BY created_at DESC`) }));
  app.post('/api/admin/premium/codes', admin, (req, res) => {
    const days = Math.max(1, Math.min(365, parseInt(req.body.days, 10) || 30)), max = Math.max(0, parseInt(req.body.uses, 10) || 0);
    const code = normCode(req.body.code) || ('DETTY-' + require('crypto').randomBytes(4).toString('hex').toUpperCase());
    if (code.length < 6) return res.status(400).json({ error: 'Code must be at least 6 letters or numbers.' });
    try { run(`INSERT INTO premium_codes(code,days,max_uses,uses,note,created_at) VALUES(?,?,?,0,?,?)`, code, days, max, String(req.body.note || '').slice(0, 80), now()); }
    catch { return res.status(409).json({ error: 'That code already exists.' }); }
    res.json({ code, days, max_uses: max });
  });
  app.delete('/api/admin/premium/codes/:code', admin, (req, res) => { run(`DELETE FROM premium_codes WHERE code=?`, normCode(req.params.code)); res.json({ ok: true }); });

  app.get('/api/admin/premium', admin, (req, res) => {
    res.json({
      active: all(`SELECT id, nickname, premium_plan plan, premium_until until FROM users WHERE premium_until > ? ORDER BY premium_until DESC`, now()),
      interest: all(`SELECT plan, COUNT(*) n FROM premium_interest GROUP BY plan`),
      gists: all(`SELECT persona, COUNT(*) n, SUM(ai) ai FROM gist_log GROUP BY persona ORDER BY n DESC`),
      voice: voiceReady(), ai: !!process.env.ANTHROPIC_API_KEY,
    });
  });

  return { isPremium, grantPremium };
};
