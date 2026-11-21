'use strict';
// Love Corner + Gist Rooms (all free):
//   🎭 Gist Rooms   anonymous group chats with festive mask names, polls, reactions, opt-in unmasking
//   💘 Pick One     positive-only anonymous picks among your friends ("Who has the best Christmas smile?")
//   💞 Secret Crush pick up to 3 friends; revealed only when it's mutual
//   💌 Be My Boo    an ask-out link with a runaway "No" button; the sender learns the answer
// Kept kind: positive questions only, links/phones/insults blocked, rate limits, report + remove.
const crypto = require('crypto');

module.exports = function love(app, d) {
  const { one, all, run, db, auth, admin, now, logEvent, notify, friendsOf, ipOf } = d;
  db.exec(`
  CREATE TABLE IF NOT EXISTS rooms(id INTEGER PRIMARY KEY, code TEXT UNIQUE, name TEXT, emoji TEXT, owner_id INTEGER, locked INTEGER DEFAULT 0, created_at INTEGER);
  CREATE TABLE IF NOT EXISTS room_members(room_id INTEGER, user_id INTEGER, alias TEXT, color TEXT, revealed INTEGER DEFAULT 0, last_read INTEGER DEFAULT 0, joined_at INTEGER, PRIMARY KEY(room_id, user_id));
  CREATE TABLE IF NOT EXISTS room_msgs(id INTEGER PRIMARY KEY, room_id INTEGER, user_id INTEGER, kind TEXT, body TEXT, poll TEXT, created_at INTEGER, hidden INTEGER DEFAULT 0, reports INTEGER DEFAULT 0);
  CREATE INDEX IF NOT EXISTS room_msgs_r ON room_msgs(room_id, id);
  CREATE TABLE IF NOT EXISTS room_votes(msg_id INTEGER, user_id INTEGER, choice INTEGER, PRIMARY KEY(msg_id, user_id));
  CREATE TABLE IF NOT EXISTS room_reacts(msg_id INTEGER, user_id INTEGER, emoji TEXT, PRIMARY KEY(msg_id, user_id));
  CREATE TABLE IF NOT EXISTS room_reports(msg_id INTEGER, user_id INTEGER, PRIMARY KEY(msg_id, user_id));
  CREATE TABLE IF NOT EXISTS picks(id INTEGER PRIMARY KEY, from_id INTEGER, to_id INTEGER, q TEXT, emoji TEXT, created_at INTEGER, seen INTEGER DEFAULT 0);
  CREATE INDEX IF NOT EXISTS picks_to ON picks(to_id, id);
  CREATE TABLE IF NOT EXISTS crushes(from_id INTEGER, to_id INTEGER, created_at INTEGER, PRIMARY KEY(from_id, to_id));
  CREATE TABLE IF NOT EXISTS boo_asks(id INTEGER PRIMARY KEY, code TEXT UNIQUE, from_id INTEGER, to_name TEXT, msg TEXT, answer TEXT, tries INTEGER DEFAULT 0, opens INTEGER DEFAULT 0, created_at INTEGER, answered_at INTEGER);`);

  // ---------- shared guards ----------
  const BAD = ['idiot', 'stupid', 'ugly', 'fool', 'mumu', 'olodo', 'werey', 'ashawo', 'bastard', 'useless', 'kill yourself', 'kys', 'fuck', 'shit', 'bitch', 'slut', 'whore', 'dick', 'pussy', 'nigga', 'retard', 'olosho', 'oloriburuku', 'mad person', 'onye ara', 'yeye', 'dunce', 'nude', 'nudes', 'sex', ...String(process.env.NOTES_BLOCKLIST || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)];
  const badRe = new RegExp(`(^|[^a-z])(${BAD.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})([^a-z]|$)`, 'i');
  const linkRe = /(https?:\/\/|www\.|\.com\b|\.ng\b|wa\.me|t\.me)/i, phoneRe = /(\+?\d[\d\s-]{8,}\d)/;
  const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
  function check(text, { links = true } = {}) {
    if (links && (linkRe.test(text) || phoneRe.test(text))) return 'No links or phone numbers here. Keep it fun 🙂';
    if (badRe.test(text)) return 'That one no sweet 😅 Keep it kind.';
    return null;
  }
  const hits = new Map(); // simple per-user rate limits: key -> timestamps
  function limited(key, max, ms) { const t = now(), a = (hits.get(key) || []).filter(x => t - x < ms); if (a.length >= max) return true; a.push(t); hits.set(key, a); return false; }
  const code6 = () => crypto.randomBytes(5).toString('base64url').replace(/[-_]/g, '').slice(0, 6).toLowerCase();
  const nick = (id) => (one(`SELECT nickname FROM users WHERE id=?`, id) || {}).nickname || 'Someone';
  // friends + people you share a Gist Room with
  function circle(uid) {
    const m = new Map(friendsOf(uid).map(f => [f.id, { id: f.id, nickname: f.nickname, last_seen: f.last_seen }]));
    for (const r of all(`SELECT DISTINCT u.id, u.nickname, u.last_seen FROM room_members a JOIN room_members b ON a.room_id=b.room_id JOIN users u ON u.id=b.user_id WHERE a.user_id=? AND b.user_id!=? LIMIT 150`, uid, uid)) if (!m.has(r.id)) m.set(r.id, r);
    return [...m.values()];
  }

  // ======================= 🎭 Gist Rooms =======================
  const ADJ = ['Masked', 'Secret', 'Sneaky', 'Shy', 'Spicy', 'Sweet', 'Smooth', 'Sharp', 'Quiet', 'Loud', 'Fresh', 'Hungry', 'Sleepy', 'Fine', 'Bold', 'Lucky'];
  const NOUN = [['Jollof', '🍛'], ['Zobo', '🍷'], ['Suya', '🍢'], ['Puff-Puff', '🍩'], ['Chin-Chin', '🥨'], ['Agbada', '👘'], ['Gele', '👑'], ['Danfo', '🚌'], ['Okada', '🏍️'], ['Moi-Moi', '🫔'], ['Asun', '🐐'], ['Dodo', '🍌'], ['Small Chops', '🥟'], ['Pepper Soup', '🍲'], ['Palm Wine', '🥥'], ['Garri', '🥣']];
  const COLORS = ['#ff7eb3', '#ffd23f', '#5ee08c', '#6ec6ff', '#c77dff', '#ff9a3c', '#ff5c7a', '#3fd0c9', '#f5b83d', '#a0e86f'];
  const ROOM_EMOJI = ['🎭', '🏡', '🎓', '💼', '⛪', '🍾', '🎄', '💃🏾', '⚽', '🎶'];
  const MAX_MEMBERS = 60;
  function newAlias(roomId) {
    const used = new Set(all(`SELECT alias FROM room_members WHERE room_id=?`, roomId).map(r => r.alias));
    for (let i = 0; i < 200; i++) { const n = NOUN[crypto.randomInt(NOUN.length)], a = `${ADJ[crypto.randomInt(ADJ.length)]} ${n[0]} ${n[1]}`; if (!used.has(a)) return a; }
    return `Mystery Guest ${crypto.randomInt(1000)} 🎭`;
  }
  const roomOf = (code) => one(`SELECT * FROM rooms WHERE code=?`, String(code || '').toLowerCase());
  const memberOf = (roomId, uid) => one(`SELECT * FROM room_members WHERE room_id=? AND user_id=?`, roomId, uid);
  function join(room, uid) {
    if (memberOf(room.id, uid)) return;
    run(`INSERT INTO room_members(room_id,user_id,alias,color,joined_at) VALUES(?,?,?,?,?)`, room.id, uid, newAlias(room.id), COLORS[crypto.randomInt(COLORS.length)], now());
    run(`INSERT INTO room_msgs(room_id,user_id,kind,body,created_at) VALUES(?,?,?,?,?)`, room.id, 0, 'system', `${memberOf(room.id, uid).alias} joined the room`, now());
  }
  const shape = (room, uid) => {
    const me = memberOf(room.id, uid), n = one(`SELECT COUNT(*) n FROM room_members WHERE room_id=?`, room.id).n;
    return { code: room.code, name: room.name, emoji: room.emoji, owner: room.owner_id === uid, locked: !!room.locked, members: n, me: me ? { alias: me.alias, color: me.color, revealed: !!me.revealed } : null };
  };
  function msgsOut(roomId, uid, after) {
    const rows = all(`SELECT m.id, m.user_id, m.kind, m.body, m.poll, m.created_at at, rm.alias, rm.color, rm.revealed, u.nickname FROM room_msgs m LEFT JOIN room_members rm ON rm.room_id=m.room_id AND rm.user_id=m.user_id LEFT JOIN users u ON u.id=m.user_id WHERE m.room_id=? AND m.id>? AND m.hidden=0 ORDER BY m.id DESC LIMIT 80`, roomId, after).reverse();
    if (!rows.length) return [];
    const ids = rows.map(r => r.id), q = ids.map(() => '?').join(',');
    const reacts = all(`SELECT msg_id, emoji, COUNT(*) n, SUM(user_id=?) mine FROM room_reacts WHERE msg_id IN (${q}) GROUP BY msg_id, emoji`, uid, ...ids);
    const votes = all(`SELECT msg_id, choice, COUNT(*) n, SUM(user_id=?) mine FROM room_votes WHERE msg_id IN (${q}) GROUP BY msg_id, choice`, uid, ...ids);
    return rows.map(r => ({
      id: r.id, kind: r.kind, body: r.body, at: r.at, mine: r.user_id === uid,
      who: r.kind === 'system' ? null : { alias: r.alias || 'Someone who left 👋', color: r.color || '#888', name: r.revealed ? r.nickname : null },
      reacts: reacts.filter(x => x.msg_id === r.id).map(x => ({ e: x.emoji, n: x.n, mine: !!x.mine })),
      poll: r.poll ? (() => { const p = JSON.parse(r.poll), v = votes.filter(x => x.msg_id === r.id); return { q: p.q, options: p.options, counts: p.options.map((_, i) => (v.find(x => x.choice === i) || { n: 0 }).n), mine: (v.find(x => x.mine) || { choice: null }).choice }; })() : null,
    }));
  }

  app.get('/api/rooms', auth, (req, res) => {
    const list = all(`SELECT r.*, m.last_read, (SELECT COUNT(*) FROM room_members x WHERE x.room_id=r.id) members,
      (SELECT COUNT(*) FROM room_msgs z WHERE z.room_id=r.id AND z.id>m.last_read AND z.hidden=0 AND z.user_id!=?) unread,
      (SELECT body FROM room_msgs z WHERE z.room_id=r.id AND z.hidden=0 AND z.kind!='system' ORDER BY z.id DESC LIMIT 1) last,
      (SELECT created_at FROM room_msgs z WHERE z.room_id=r.id ORDER BY z.id DESC LIMIT 1) lastAt
      FROM rooms r JOIN room_members m ON m.room_id=r.id WHERE m.user_id=? ORDER BY lastAt DESC`, req.user.id, req.user.id);
    res.json({ rooms: list.map(r => ({ code: r.code, name: r.name, emoji: r.emoji, members: r.members, unread: r.unread, last: r.last, lastAt: r.lastAt, owner: r.owner_id === req.user.id })), emojis: ROOM_EMOJI });
  });
  app.post('/api/rooms', auth, (req, res) => {
    const name = clean(req.body.name, 40), emoji = ROOM_EMOJI.includes(req.body.emoji) ? req.body.emoji : '🎭';
    if (name.length < 2) return res.status(400).json({ error: 'Give your room a name.' });
    const bad = check(name); if (bad) return res.status(400).json({ error: bad });
    if (one(`SELECT COUNT(*) n FROM rooms WHERE owner_id=?`, req.user.id).n >= 8) return res.status(400).json({ error: 'You can own 8 rooms. Delete one first.' });
    let code; for (let i = 0; i < 6; i++) { code = code6(); if (!roomOf(code)) break; }
    run(`INSERT INTO rooms(code,name,emoji,owner_id,created_at) VALUES(?,?,?,?,?)`, code, name, emoji, req.user.id, now());
    const room = roomOf(code); join(room, req.user.id);
    run(`INSERT INTO room_msgs(room_id,user_id,kind,body,created_at) VALUES(?,?,?,?,?)`, room.id, 0, 'system', 'Welcome! Everyone here is masked 🎭 Nobody knows who said what. Keep it fun and kind.', now());
    logEvent(req.user.id, 'room_create', { code }, req.ipaddr);
    res.json(shape(room, req.user.id));
  });
  app.get('/api/rooms/peek/:code', auth, (req, res) => {
    const room = roomOf(req.params.code); if (!room) return res.status(404).json({ error: 'This room no exist.' });
    res.json({ ...shape(room, req.user.id), joined: !!memberOf(room.id, req.user.id) });
  });
  app.post('/api/rooms/:code/join', auth, (req, res) => {
    const room = roomOf(req.params.code); if (!room) return res.status(404).json({ error: 'This room no exist.' });
    if (!memberOf(room.id, req.user.id)) {
      if (room.locked) return res.status(403).json({ error: 'This room is locked. Ask the owner to open it.' });
      if (one(`SELECT COUNT(*) n FROM room_members WHERE room_id=?`, room.id).n >= MAX_MEMBERS) return res.status(403).json({ error: 'This room is full.' });
      join(room, req.user.id); logEvent(req.user.id, 'room_join', { code: room.code }, req.ipaddr);
    }
    res.json(shape(room, req.user.id));
  });
  app.get('/api/rooms/:code', auth, (req, res) => {
    const room = roomOf(req.params.code), me = room && memberOf(room.id, req.user.id);
    if (!room || !me) return res.status(404).json({ error: 'You are not in this room.' });
    const msgs = msgsOut(room.id, req.user.id, Math.max(0, parseInt(req.query.after, 10) || 0));
    const top = one(`SELECT MAX(id) id FROM room_msgs WHERE room_id=?`, room.id).id || 0;
    run(`UPDATE room_members SET last_read=? WHERE room_id=? AND user_id=?`, top, room.id, req.user.id);
    // reacts and votes change on old messages too: send fresh counts for the latest 80 when asked
    res.json({ room: shape(room, req.user.id), msgs, refresh: req.query.full ? msgsOut(room.id, req.user.id, 0) : undefined });
  });
  app.post('/api/rooms/:code/msg', auth, (req, res) => {
    const room = roomOf(req.params.code), me = room && memberOf(room.id, req.user.id); if (!me) return res.status(404).json({ error: 'You are not in this room.' });
    const body = clean(req.body.body, 500); if (!body) return res.status(400).json({ error: 'Type something 🙂' });
    const bad = check(body); if (bad) return res.status(400).json({ error: bad });
    if (limited('msg' + req.user.id, 20, 60000)) return res.status(429).json({ error: 'Slow down small 😅' });
    run(`INSERT INTO room_msgs(room_id,user_id,kind,body,created_at) VALUES(?,?,?,?,?)`, room.id, req.user.id, 'msg', body, now());
    res.json({ ok: true });
  });
  app.post('/api/rooms/:code/poll', auth, (req, res) => {
    const room = roomOf(req.params.code), me = room && memberOf(room.id, req.user.id); if (!me) return res.status(404).json({ error: 'You are not in this room.' });
    const q = clean(req.body.q, 140), options = (Array.isArray(req.body.options) ? req.body.options : []).map(o => clean(o, 60)).filter(Boolean).slice(0, 4);
    if (q.length < 3 || options.length < 2) return res.status(400).json({ error: 'A poll needs a question and at least 2 options.' });
    const bad = check([q, ...options].join(' | ')); if (bad) return res.status(400).json({ error: bad });
    if (limited('poll' + req.user.id, 6, 600000)) return res.status(429).json({ error: 'Plenty polls! Try again later.' });
    run(`INSERT INTO room_msgs(room_id,user_id,kind,body,poll,created_at) VALUES(?,?,?,?,?,?)`, room.id, req.user.id, 'poll', q, JSON.stringify({ q, options }), now());
    res.json({ ok: true });
  });
  app.post('/api/rooms/:code/vote', auth, (req, res) => {
    const room = roomOf(req.params.code); if (!room || !memberOf(room.id, req.user.id)) return res.status(404).json({ error: 'Not in this room.' });
    const m = one(`SELECT * FROM room_msgs WHERE id=? AND room_id=? AND kind='poll'`, parseInt(req.body.id, 10), room.id); if (!m) return res.status(404).json({ error: 'Poll not found.' });
    const choice = parseInt(req.body.choice, 10); if (!(choice >= 0 && choice < JSON.parse(m.poll).options.length)) return res.status(400).json({ error: 'Pick an option.' });
    run(`INSERT INTO room_votes VALUES(?,?,?) ON CONFLICT(msg_id,user_id) DO UPDATE SET choice=excluded.choice`, m.id, req.user.id, choice);
    res.json({ ok: true });
  });
  const REACTS = ['❤️', '😂', '🔥', '😮', '👏', '🙏'];
  app.post('/api/rooms/:code/react', auth, (req, res) => {
    const room = roomOf(req.params.code); if (!room || !memberOf(room.id, req.user.id)) return res.status(404).json({ error: 'Not in this room.' });
    const id = parseInt(req.body.id, 10), e = REACTS.includes(req.body.emoji) ? req.body.emoji : null;
    if (!one(`SELECT 1 x FROM room_msgs WHERE id=? AND room_id=?`, id, room.id)) return res.status(404).json({ error: 'Message not found.' });
    const cur = one(`SELECT emoji FROM room_reacts WHERE msg_id=? AND user_id=?`, id, req.user.id);
    if (!e || (cur && cur.emoji === e)) run(`DELETE FROM room_reacts WHERE msg_id=? AND user_id=?`, id, req.user.id);
    else run(`INSERT INTO room_reacts VALUES(?,?,?) ON CONFLICT(msg_id,user_id) DO UPDATE SET emoji=excluded.emoji`, id, req.user.id, e);
    res.json({ ok: true });
  });
  app.post('/api/rooms/:code/report', auth, (req, res) => {
    const room = roomOf(req.params.code); if (!room || !memberOf(room.id, req.user.id)) return res.status(404).json({ error: 'Not in this room.' });
    const id = parseInt(req.body.id, 10), m = one(`SELECT * FROM room_msgs WHERE id=? AND room_id=?`, id, room.id); if (!m) return res.status(404).json({ error: 'Message not found.' });
    run(`INSERT OR IGNORE INTO room_reports VALUES(?,?)`, id, req.user.id);
    const n = one(`SELECT COUNT(*) n FROM room_reports WHERE msg_id=?`, id).n;
    run(`UPDATE room_msgs SET reports=?, hidden=CASE WHEN ?>=2 OR ?=1 THEN 1 ELSE hidden END WHERE id=?`, n, n, room.owner_id === req.user.id ? 1 : 0, id);
    logEvent(req.user.id, 'room_report', { code: room.code, id }, req.ipaddr);
    res.json({ ok: true, hidden: n >= 2 || room.owner_id === req.user.id });
  });
  app.post('/api/rooms/:code/kick', auth, (req, res) => { // owner removes the author of a message, without learning who it is
    const room = roomOf(req.params.code); if (!room || room.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the room owner can do this.' });
    const m = one(`SELECT * FROM room_msgs WHERE id=? AND room_id=?`, parseInt(req.body.id, 10), room.id); if (!m || !m.user_id || m.user_id === req.user.id) return res.status(400).json({ error: 'Cannot remove this one.' });
    const who = memberOf(room.id, m.user_id); if (!who) return res.json({ ok: true });
    run(`DELETE FROM room_members WHERE room_id=? AND user_id=?`, room.id, m.user_id); run(`UPDATE room_msgs SET hidden=1 WHERE room_id=? AND user_id=?`, room.id, m.user_id);
    run(`INSERT INTO room_msgs(room_id,user_id,kind,body,created_at) VALUES(?,?,?,?,?)`, room.id, 0, 'system', `${who.alias} was removed by the owner`, now());
    res.json({ ok: true });
  });
  app.post('/api/rooms/:code/reveal', auth, (req, res) => {
    const room = roomOf(req.params.code), me = room && memberOf(room.id, req.user.id); if (!me) return res.status(404).json({ error: 'Not in this room.' });
    if (!me.revealed) { run(`UPDATE room_members SET revealed=1 WHERE room_id=? AND user_id=?`, room.id, req.user.id); run(`INSERT INTO room_msgs(room_id,user_id,kind,body,created_at) VALUES(?,?,?,?,?)`, room.id, 0, 'system', `🎭 Unmasked! ${me.alias} is ${nick(req.user.id)}`, now()); }
    res.json({ ok: true });
  });
  app.post('/api/rooms/:code/lock', auth, (req, res) => {
    const room = roomOf(req.params.code); if (!room || room.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the room owner can do this.' });
    run(`UPDATE rooms SET locked=? WHERE id=?`, req.body.locked ? 1 : 0, room.id); res.json({ locked: !!req.body.locked });
  });
  app.post('/api/rooms/:code/leave', auth, (req, res) => {
    const room = roomOf(req.params.code), me = room && memberOf(room.id, req.user.id); if (!me) return res.json({ ok: true });
    if (room.owner_id === req.user.id) { for (const t of ['room_members', 'room_msgs']) run(`DELETE FROM ${t} WHERE room_id=?`, room.id); run(`DELETE FROM rooms WHERE id=?`, room.id); return res.json({ ok: true, deleted: true }); }
    run(`DELETE FROM room_members WHERE room_id=? AND user_id=?`, room.id, req.user.id);
    run(`INSERT INTO room_msgs(room_id,user_id,kind,body,created_at) VALUES(?,?,?,?,?)`, room.id, 0, 'system', `${me.alias} left the room`, now());
    res.json({ ok: true });
  });

  // ======================= 💘 Pick One =======================
  const PICK_Q = [
    ['Best Christmas smile', '😁'], ['Would look best in agbada or gele', '👑'], ['Gives the warmest hugs', '🤗'], ['Most likely to find love this December', '💘'],
    ['Best dancer at an owambe', '💃🏾'], ['Would make the best December boo', '🥰'], ['Most likely to cook the best jollof', '🍛'], ['Has the best laugh', '😂'],
    ['Most likely to light up any room', '✨'], ['Would plan the best Detty December trip', '✈️'], ['Kindest person I know', '🫶🏾'], ['Most likely to become a millionaire', '💰'],
    ['Best fashion sense this December', '🕶️'], ['Would be the best wedding guest', '🥂'], ['Most likely to make me laugh on a bad day', '🌞'], ['Best person to gist with all night', '🗣️'],
    ['Cutest couple energy', '💑'], ['Most likely to text back first', '📱'], ['Most likely to be the life of the Crossover', '🎆'], ['Has the best voice', '🎤'],
    ['Most romantic', '🌹'], ['Most loyal friend', '🤝🏾'], ['Best at giving advice', '🧠'], ['Most likely to be a famous Nollywood star', '🎬'],
    ['Most likely to remember my birthday', '🎂'], ['Would win a jollof cook-off', '🏆'], ['Best person to take to meet my parents', '👨🏾‍👩🏾‍👧🏾'], ['Most likely to sing at Christmas service', '⛪'],
  ];
  const offers = new Map(); // uid -> { q, ids } the round we showed, so a pick must come from it
  const PICKS_DAY = 15;
  app.get('/api/picks/next', auth, (req, res) => {
    const people = circle(req.user.id); if (people.length < 2) return res.json({ need: true, have: people.length });
    const usedToday = one(`SELECT COUNT(*) n FROM picks WHERE from_id=? AND created_at>?`, req.user.id, now() - 86400000).n;
    if (usedToday >= PICKS_DAY) return res.json({ done: true, left: 0, resetIn: 86400000 - (now() - one(`SELECT MIN(created_at) t FROM picks WHERE from_id=? AND created_at>?`, req.user.id, now() - 86400000).t) });
    const [q, emoji] = PICK_Q[crypto.randomInt(PICK_Q.length)], pool = people.slice().sort(() => Math.random() - .5).slice(0, 4);
    offers.set(req.user.id, { q, emoji, ids: pool.map(p => p.id) });
    res.json({ q, emoji, options: pool.map(p => ({ id: p.id, nickname: p.nickname })), left: PICKS_DAY - usedToday, total: PICKS_DAY });
  });
  app.post('/api/picks', auth, (req, res) => {
    const o = offers.get(req.user.id), to = parseInt(req.body.to, 10);
    if (!o || !o.ids.includes(to)) return res.status(400).json({ error: 'Pick from the options shown.' });
    offers.delete(req.user.id);
    run(`INSERT INTO picks(from_id,to_id,q,emoji,created_at) VALUES(?,?,?,?,?)`, req.user.id, to, o.q, o.emoji, now());
    run(`UPDATE users SET coins=coins+2 WHERE id=?`, req.user.id);
    notify(to, 'pick', `${o.emoji} Somebody picked you for "${o.q}"!`, 'love');
    logEvent(req.user.id, 'pick', { q: o.q }, req.ipaddr);
    res.json({ ok: true, coins: 2 });
  });
  app.get('/api/picks/mine', auth, (req, res) => {
    const list = all(`SELECT id, q, emoji, created_at at, seen FROM picks WHERE to_id=? ORDER BY id DESC LIMIT 60`, req.user.id);
    run(`UPDATE picks SET seen=1 WHERE to_id=? AND seen=0`, req.user.id);
    const top = all(`SELECT q, emoji, COUNT(*) n FROM picks WHERE to_id=? GROUP BY q ORDER BY n DESC LIMIT 3`, req.user.id);
    res.json({ picks: list, total: one(`SELECT COUNT(*) n FROM picks WHERE to_id=?`, req.user.id).n, top });
  });

  // ======================= 💞 Secret Crush =======================
  const CRUSH_MAX = 3;
  app.get('/api/crush', auth, (req, res) => {
    const uid = req.user.id, mine = all(`SELECT c.to_id id, u.nickname, EXISTS(SELECT 1 FROM crushes x WHERE x.from_id=c.to_id AND x.to_id=c.from_id) mutual FROM crushes c JOIN users u ON u.id=c.to_id WHERE c.from_id=?`, uid);
    res.json({ mine: mine.map(m => ({ ...m, mutual: !!m.mutual })), admirers: one(`SELECT COUNT(*) n FROM crushes WHERE to_id=?`, uid).n, max: CRUSH_MAX, people: circle(uid).map(p => ({ id: p.id, nickname: p.nickname })) });
  });
  app.post('/api/crush', auth, (req, res) => {
    const uid = req.user.id, to = parseInt(req.body.to, 10);
    if (!circle(uid).some(p => p.id === to)) return res.status(400).json({ error: 'You can only crush on your friends here 😉' });
    if (one(`SELECT COUNT(*) n FROM crushes WHERE from_id=?`, uid).n >= CRUSH_MAX) return res.status(400).json({ error: `You can have ${CRUSH_MAX} secret crushes. Remove one first.` });
    run(`INSERT OR IGNORE INTO crushes VALUES(?,?,?)`, uid, to, now());
    const mutual = !!one(`SELECT 1 x FROM crushes WHERE from_id=? AND to_id=?`, to, uid);
    if (mutual) { notify(uid, 'crush', `💞 It's a match! You and ${nick(to)} have a crush on each other!`, 'love'); notify(to, 'crush', `💞 It's a match! You and ${nick(uid)} have a crush on each other!`, 'love'); }
    else notify(to, 'crush', '👀 Somebody has a secret crush on you. Add your crushes in the Love Corner: if it is mutual, you will both know!', 'love');
    logEvent(uid, 'crush', { mutual }, req.ipaddr);
    res.json({ ok: true, mutual, name: mutual ? nick(to) : null });
  });
  app.delete('/api/crush/:to', auth, (req, res) => { run(`DELETE FROM crushes WHERE from_id=? AND to_id=?`, req.user.id, parseInt(req.params.to, 10)); res.json({ ok: true }); });

  // ======================= 💌 Be My Boo =======================
  app.post('/api/boo', auth, (req, res) => {
    const to = clean(req.body.to, 24), msg = clean(req.body.msg, 160);
    if (to.length < 2) return res.status(400).json({ error: "Who are you asking? Type their name." });
    const bad = check(to + ' ' + msg); if (bad) return res.status(400).json({ error: bad });
    if (limited('boo' + req.user.id, 10, 86400000)) return res.status(429).json({ error: 'You don ask 10 people today 😂 Rest small.' });
    let code; for (let i = 0; i < 6; i++) { code = code6(); if (!one(`SELECT 1 x FROM boo_asks WHERE code=?`, code)) break; }
    run(`INSERT INTO boo_asks(code,from_id,to_name,msg,created_at) VALUES(?,?,?,?,?)`, code, req.user.id, to, msg, now());
    logEvent(req.user.id, 'boo_create', null, req.ipaddr);
    res.json({ code });
  });
  app.get('/api/boo', auth, (req, res) => res.json({ asks: all(`SELECT code, to_name, msg, answer, tries, opens, created_at at, answered_at FROM boo_asks WHERE from_id=? ORDER BY id DESC LIMIT 30`, req.user.id) }));
  app.get('/api/boo/:code', (req, res) => {
    const a = one(`SELECT * FROM boo_asks WHERE code=?`, String(req.params.code).toLowerCase()); if (!a) return res.status(404).json({ error: 'This link no exist.' });
    run(`UPDATE boo_asks SET opens=opens+1 WHERE id=?`, a.id);
    if (a.opens === 0) notify(a.from_id, 'boo', `👀 ${a.to_name} just opened your "Be my boo" link…`, 'love');
    res.json({ from: nick(a.from_id), to: a.to_name, msg: a.msg, answer: a.answer });
  });
  app.post('/api/boo/:code/answer', (req, res) => {
    const a = one(`SELECT * FROM boo_asks WHERE code=?`, String(req.params.code).toLowerCase()); if (!a) return res.status(404).json({ error: 'This link no exist.' });
    if (a.answer) return res.json({ answer: a.answer, already: true });
    const ans = req.body.answer === 'yes' ? 'yes' : 'no', tries = Math.max(0, Math.min(99, parseInt(req.body.tries, 10) || 0));
    if (limited('booans' + (ipOf ? ipOf(req) : ''), 20, 3600000)) return res.status(429).json({ error: 'Try again later.' });
    run(`UPDATE boo_asks SET answer=?, tries=?, answered_at=? WHERE id=?`, ans, tries, now(), a.id);
    notify(a.from_id, 'boo', ans === 'yes' ? `💘 ${a.to_name} said YES to being your December boo!${tries ? ` (after chasing the No button ${tries} time${tries > 1 ? 's' : ''} 😂)` : ''}` : `💔 ${a.to_name} said no this time. Their loss! Your Detty December is still loading 🎆`, 'love');
    res.json({ answer: ans });
  });

  // ---------- Love Corner summary (badges) ----------
  app.get('/api/love', auth, (req, res) => {
    const uid = req.user.id;
    res.json({
      picksNew: one(`SELECT COUNT(*) n FROM picks WHERE to_id=? AND seen=0`, uid).n, picksTotal: one(`SELECT COUNT(*) n FROM picks WHERE to_id=?`, uid).n,
      admirers: one(`SELECT COUNT(*) n FROM crushes WHERE to_id=?`, uid).n,
      matches: one(`SELECT COUNT(*) n FROM crushes c WHERE c.from_id=? AND EXISTS(SELECT 1 FROM crushes x WHERE x.from_id=c.to_id AND x.to_id=c.from_id)`, uid).n,
      booYes: one(`SELECT COUNT(*) n FROM boo_asks WHERE from_id=? AND answer='yes'`, uid).n,
      circle: circle(uid).length,
      roomsUnread: one(`SELECT COALESCE(SUM((SELECT COUNT(*) FROM room_msgs z WHERE z.room_id=m.room_id AND z.id>m.last_read AND z.hidden=0 AND z.user_id!=?)),0) n FROM room_members m WHERE m.user_id=?`, uid, uid).n,
    });
  });

  app.get('/api/admin/love', admin, (req, res) => res.json({
    rooms: one(`SELECT COUNT(*) n FROM rooms`).n, msgs: one(`SELECT COUNT(*) n FROM room_msgs WHERE kind!='system'`).n, picks: one(`SELECT COUNT(*) n FROM picks`).n,
    crushes: one(`SELECT COUNT(*) n FROM crushes`).n, boos: one(`SELECT COUNT(*) n FROM boo_asks`).n, booYes: one(`SELECT COUNT(*) n FROM boo_asks WHERE answer='yes'`).n,
    reported: all(`SELECT m.id, m.body, r.name room, m.reports, m.created_at at FROM room_msgs m JOIN rooms r ON r.id=m.room_id WHERE m.reports>0 ORDER BY m.id DESC LIMIT 100`),
  }));
};
