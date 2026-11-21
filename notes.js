'use strict';
// Sweet Notes 💌 (free): share your link, your people send you anonymous Christmas notes.
// Kept kind on purpose: senders pick a vibe (sweet, funny, wish, thank you, crush), links and phone
// numbers are blocked, insults are filtered, senders are rate-limited, and the owner can hide or report
// any note and pause their link. Reported notes show in admin.
const crypto = require('crypto');

module.exports = function notes(app, d) {
  const { one, all, run, db, auth, admin, now, logEvent, notify, ipOf } = d;
  db.exec(`CREATE TABLE IF NOT EXISTS note_links(user_id INTEGER PRIMARY KEY, code TEXT UNIQUE, open INTEGER DEFAULT 1, created_at INTEGER);
  CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY, to_id INTEGER, body TEXT, vibe TEXT, sender TEXT, created_at INTEGER, seen INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0, reported INTEGER DEFAULT 0);
  CREATE INDEX IF NOT EXISTS notes_to ON notes(to_id, created_at);`);
  const VIBES = { sweet: '💖', funny: '😂', wish: '🎄', thanks: '🙏', crush: '🤭' };
  const SALT = process.env.NOTES_SALT || crypto.randomBytes(16).toString('hex');
  const who = (req) => crypto.createHash('sha256').update(SALT + (ipOf ? ipOf(req) : req.ip || '') + (req.headers['user-agent'] || '')).digest('hex').slice(0, 16);
  // Words that turn a sweet note into bullying. Kept short on purpose; extend with NOTES_BLOCKLIST="word1,word2".
  const BAD = ['idiot', 'stupid', 'ugly', 'fool', 'mumu', 'olodo', 'werey', 'ashawo', 'bastard', 'useless', 'kill yourself', 'kys', 'fuck', 'shit', 'bitch', 'slut', 'whore', 'dick', 'pussy', 'nigga', 'retard', 'olosho', 'oloriburuku', 'mad person', 'onye ara', 'yeye', 'dunce', ...String(process.env.NOTES_BLOCKLIST || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)];
  const badRe = new RegExp(`(^|[^a-z])(${BAD.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})([^a-z]|$)`, 'i');
  const linkRe = /(https?:\/\/|www\.|\.com\b|\.ng\b|@\w{3,}|wa\.me|t\.me)/i, phoneRe = /(\+?\d[\d\s-]{8,}\d)/;
  const codeFor = (uid) => {
    let r = one(`SELECT * FROM note_links WHERE user_id=?`, uid); if (r) return r;
    for (let i = 0; i < 5; i++) { const code = crypto.randomBytes(4).toString('base64url').replace(/[-_]/g, '').slice(0, 6).toLowerCase(); try { run(`INSERT INTO note_links(user_id,code,open,created_at) VALUES(?,?,1,?)`, uid, code, now()); break; } catch {} }
    return one(`SELECT * FROM note_links WHERE user_id=?`, uid);
  };
  const recent = new Map(); // sender -> timestamps

  app.get('/api/notes', auth, (req, res) => {
    const l = codeFor(req.user.id);
    const list = all(`SELECT id, body, vibe, created_at at, seen FROM notes WHERE to_id=? AND hidden=0 ORDER BY id DESC LIMIT 100`, req.user.id);
    run(`UPDATE notes SET seen=1 WHERE to_id=? AND seen=0`, req.user.id);
    res.json({ code: l.code, open: !!l.open, notes: list, unseen: list.filter(n => !n.seen).length, vibes: VIBES });
  });
  app.get('/api/notes/unseen', auth, (req, res) => res.json({ n: one(`SELECT COUNT(*) n FROM notes WHERE to_id=? AND seen=0 AND hidden=0`, req.user.id).n }));
  app.post('/api/notes/open', auth, (req, res) => { codeFor(req.user.id); run(`UPDATE note_links SET open=? WHERE user_id=?`, req.body.open ? 1 : 0, req.user.id); res.json({ open: !!req.body.open }); });
  app.post('/api/notes/:id/hide', auth, (req, res) => { run(`UPDATE notes SET hidden=1 WHERE id=? AND to_id=?`, parseInt(req.params.id, 10), req.user.id); res.json({ ok: true }); });
  app.post('/api/notes/:id/report', auth, (req, res) => {
    run(`UPDATE notes SET hidden=1, reported=1 WHERE id=? AND to_id=?`, parseInt(req.params.id, 10), req.user.id);
    logEvent(req.user.id, 'note_report', { id: parseInt(req.params.id, 10) }, req.ipaddr); res.json({ ok: true });
  });

  // public: anyone with the link (no account needed)
  app.get('/api/notes/to/:code', (req, res) => {
    const l = one(`SELECT l.open, u.nickname n FROM note_links l JOIN users u ON u.id=l.user_id WHERE l.code=?`, String(req.params.code).toLowerCase());
    if (!l) return res.status(404).json({ error: 'This Sweet Notes link no exist.' });
    res.json({ name: l.n, open: !!l.open, vibes: VIBES });
  });
  app.post('/api/notes/to/:code', (req, res) => {
    const l = one(`SELECT * FROM note_links WHERE code=?`, String(req.params.code).toLowerCase());
    if (!l) return res.status(404).json({ error: 'This Sweet Notes link no exist.' });
    if (!l.open) return res.status(403).json({ error: 'They are not taking notes right now.' });
    const body = String(req.body.body || '').replace(/\s+/g, ' ').trim(), vibe = VIBES[req.body.vibe] ? req.body.vibe : 'sweet';
    if (body.length < 3) return res.status(400).json({ error: 'Write a little more 🙂' });
    if (body.length > 280) return res.status(400).json({ error: 'Keep it under 280 letters.' });
    if (linkRe.test(body) || phoneRe.test(body)) return res.status(400).json({ error: 'No links, handles or phone numbers. Keep it sweet 💌' });
    if (badRe.test(body)) return res.status(400).json({ error: "That one no sweet 😅 Sweet Notes na for kind words only." });
    const s = who(req), t = now(), mine = (recent.get(s) || []).filter(x => t - x < 3600000);
    if (mine.length >= 12) return res.status(429).json({ error: 'You don send plenty notes. Rest small and come back 🙂' });
    if (one(`SELECT COUNT(*) n FROM notes WHERE to_id=? AND sender=? AND created_at>?`, l.user_id, s, t - 86400000).n >= 5) return res.status(429).json({ error: 'You don send this person 5 notes today. Save some for tomorrow 💌' });
    mine.push(t); recent.set(s, mine);
    run(`INSERT INTO notes(to_id,body,vibe,sender,created_at) VALUES(?,?,?,?,?)`, l.user_id, body, vibe, s, t);
    if (notify) notify(l.user_id, 'note', `💌 Somebody sent you a ${VIBES[vibe]} Sweet Note!`, 'notes');
    res.json({ ok: true });
  });

  app.get('/api/admin/notes', admin, (req, res) => res.json({
    total: one(`SELECT COUNT(*) n FROM notes`).n, links: one(`SELECT COUNT(*) n FROM note_links`).n,
    reported: all(`SELECT n.id, n.body, n.vibe, n.sender, n.created_at at, u.nickname tn FROM notes n JOIN users u ON u.id=n.to_id WHERE n.reported=1 ORDER BY n.id DESC LIMIT 100`),
  }));
};
