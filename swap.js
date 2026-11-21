'use strict';
// Christmas Drip Booth (premium): put yourself in a Christmas outfit, in a December location.
//
// Two engines:
//   1. Studio (always on): the phone composes the picture itself (public/swap.js). The selfie never
//      leaves the phone. Free players get 2 outfits + 2 locations with a watermark; premium gets all.
//   2. Realistic AI (premium, 10 a day):
//      - OpenAI (recommended): set OPENAI_API_KEY. Uses the Images edit endpoint with gpt-image-1
//        (change with OPENAI_IMAGE_MODEL), quality "medium" (OPENAI_IMAGE_QUALITY: low|medium|high)
//        and input_fidelity "high" so the face stays the player's own.
//      - Or your own service: set SWAP_API_URL (+ SWAP_API_KEY). The server POSTs
//          { image: "<base64>", mime, outfit: { id, name, prompt }, location: { id, name, prompt },
//            prompt, width: 1024, height: 1536, format: "jpeg" }
//        and accepts image bytes back, or JSON { image: "<base64>" } / { url }.
//      Photos are passed straight through and never stored on this server.
const fs = require('fs');
const path = require('path');
const express = require('express');

module.exports = function swap(app, d) {
  const { one, all, run, db, auth, admin, now, watDate, logEvent, isPremium } = d;
  const CAT = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'swap.json'), 'utf8'));
  const O = Object.fromEntries(CAT.outfits.map(x => [x.id, x])), L = Object.fromEntries(CAT.locations.map(x => [x.id, x]));
  const AI_DAILY = 10;
  db.exec(`CREATE TABLE IF NOT EXISTS swap_log(id INTEGER PRIMARY KEY, user_id INTEGER, date TEXT, outfit TEXT, location TEXT, mode TEXT, created_at INTEGER);
  CREATE INDEX IF NOT EXISTS swap_log_u ON swap_log(user_id, date);`);
  // OpenAI first (OPENAI_API_KEY); a custom image service (SWAP_API_URL) also works.
  const engine = () => process.env.OPENAI_API_KEY ? 'openai' : process.env.SWAP_API_URL ? 'custom' : null;
  const aiReady = () => !!engine();
  const pub = (x) => ({ id: x.id, name: x.name, emoji: x.emoji, free: !!x.free, blurb: x.blurb });
  const aiUsed = (uid) => one(`SELECT COUNT(*) n FROM swap_log WHERE user_id=? AND date=? AND mode='ai'`, uid, watDate()).n;

  app.get('/api/swap/config', auth, (req, res) => {
    const u = one(`SELECT premium_until FROM users WHERE id=?`, req.user.id), prem = isPremium(u);
    res.json({ outfits: CAT.outfits.map(pub), locations: CAT.locations.map(pub), premium: prem, ai: aiReady(), engine: engine(),
      aiLeft: prem ? Math.max(0, AI_DAILY - aiUsed(req.user.id)) : 0, aiDaily: AI_DAILY,
      made: one(`SELECT COUNT(*) n FROM swap_log WHERE user_id=?`, req.user.id).n });
  });

  // The phone made a picture (Studio mode). Logged for stats; free players are limited to the free items.
  app.post('/api/swap/save', auth, (req, res) => {
    const o = O[req.body.outfit], l = L[req.body.location]; if (!o || !l) return res.status(400).json({ error: 'Pick an outfit and a location.' });
    const u = one(`SELECT premium_until FROM users WHERE id=?`, req.user.id), prem = isPremium(u);
    if (!prem && (!o.free || !l.free)) return res.status(402).json({ error: `${!o.free ? o.name : l.name} na premium.`, premium: true });
    run(`INSERT INTO swap_log(user_id,date,outfit,location,mode,created_at) VALUES(?,?,?,?,?,?)`, req.user.id, watDate(), o.id, l.id, 'studio', now());
    logEvent(req.user.id, 'swap', { outfit: o.id, location: l.id, mode: 'studio', premium: prem, how: String(req.body.how || '').slice(0, 12) }, req.ipaddr);
    res.json({ ok: true });
  });

  // ---------- Realistic AI render (premium) ----------
  // OpenAI: the selfie + outfit + location go to the Images "edit" endpoint, which redraws the person
  // photo-real in the outfit and the place, keeping their face (input_fidelity: high).
  const busy = new Set(); // one render at a time per player, so a double tap never pays twice
  function prompt(o, l) {
    return `Create a photorealistic, high-end portrait photograph of the exact same person shown in the input photo.
Identity is the top priority: keep their face, facial features, skin tone, hairline, hair, age and expression exactly the same, so friends instantly recognise them. Do not beautify, slim, lighten or change their skin tone or face shape.
Outfit: dress them in ${o.prompt}. The clothes must fit naturally on their body with real fabric texture, folds and stitching.
Location: ${l.prompt}.
Framing: vertical portrait, waist-up, person centred and looking at the camera with a natural, confident, festive pose.
Photography: professional 85mm portrait look, soft flattering light that matches the location, gentle rim light, shallow depth of field with the background softly blurred, rich warm Christmas and December mood, magazine quality.
Do not add text, logos, watermarks, borders or extra people.`;
  }
  async function renderOpenAI(img, mime, o, l) {
    const fd = new FormData();
    fd.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
    fd.append('image', new Blob([img], { type: mime }), 'selfie.' + (mime.split('/')[1] || 'jpg'));
    fd.append('prompt', prompt(o, l));
    fd.append('size', '1024x1536');
    fd.append('quality', process.env.OPENAI_IMAGE_QUALITY || 'medium');
    fd.append('input_fidelity', 'high');
    fd.append('output_format', 'jpeg');
    fd.append('n', '1');
    const r = await fetch((process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/images/edits', { method: 'POST', headers: { authorization: 'Bearer ' + process.env.OPENAI_API_KEY }, body: fd, signal: AbortSignal.timeout(170000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j.error && j.error.message) || 'OpenAI said ' + r.status); e.code = (j.error && j.error.code) || ''; e.status = r.status; throw e; }
    const b64 = j.data && j.data[0] && j.data[0].b64_json; if (!b64) throw new Error('no image in OpenAI reply');
    return { buf: Buffer.from(b64, 'base64'), type: 'image/jpeg' };
  }
  async function renderCustom(b64, mime, o, l) {
    const r = await fetch(process.env.SWAP_API_URL, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.SWAP_API_KEY ? { authorization: 'Bearer ' + process.env.SWAP_API_KEY } : {}) },
      body: JSON.stringify({ image: b64, mime, outfit: { id: o.id, name: o.name, prompt: o.prompt }, location: { id: l.id, name: l.name, prompt: l.prompt }, prompt: prompt(o, l), width: 1024, height: 1536, format: 'jpeg' }),
      signal: AbortSignal.timeout(170000) });
    if (!r.ok) throw new Error('image service said ' + r.status);
    let type = r.headers.get('content-type') || '', buf;
    if (/json/.test(type)) {
      const j = await r.json();
      if (j.image) { buf = Buffer.from(String(j.image).replace(/^data:[^,]+,/, ''), 'base64'); type = 'image/jpeg'; }
      else if (j.url) { const g = await fetch(j.url, { signal: AbortSignal.timeout(60000) }); if (!g.ok) throw new Error('could not fetch result'); type = g.headers.get('content-type') || 'image/jpeg'; buf = Buffer.from(await g.arrayBuffer()); }
      else throw new Error('no image in reply');
    } else buf = Buffer.from(await r.arrayBuffer());
    return { buf, type: /^image\//.test(type) ? type : 'image/jpeg' };
  }
  app.post('/api/swap/render', auth, express.json({ limit: '6mb' }), async (req, res) => {
    const u = one(`SELECT premium_until FROM users WHERE id=?`, req.user.id);
    if (!isPremium(u)) return res.status(402).json({ error: 'Realistic swap na for premium.', premium: true });
    if (!aiReady()) return res.status(503).json({ error: 'Realistic AI swap is coming soon.', comingSoon: true });
    const o = O[req.body.outfit], l = L[req.body.location]; if (!o || !l) return res.status(400).json({ error: 'Pick an outfit and a location.' });
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.photo || ''));
    if (!m) return res.status(400).json({ error: 'Send a photo first.' });
    if (aiUsed(req.user.id) >= AI_DAILY) return res.status(429).json({ error: `You don make ${AI_DAILY} realistic pictures today. Come back tomorrow!` });
    if (busy.has(req.user.id)) return res.status(429).json({ error: 'Your last picture is still cooking. Give it a moment 🍳' });
    busy.add(req.user.id); const t0 = now();
    try {
      const out = engine() === 'openai' ? await renderOpenAI(Buffer.from(m[2], 'base64'), m[1], o, l) : await renderCustom(m[2], m[1], o, l);
      run(`INSERT INTO swap_log(user_id,date,outfit,location,mode,created_at) VALUES(?,?,?,?,?,?)`, req.user.id, watDate(), o.id, l.id, 'ai', now());
      logEvent(req.user.id, 'swap', { outfit: o.id, location: l.id, mode: 'ai', engine: engine(), ms: now() - t0, premium: true }, req.ipaddr);
      res.set('content-type', out.type); res.set('cache-control', 'private, no-store'); res.send(out.buf);
    } catch (e) {
      console.error('swap ai:', e.status || '', e.code || '', e.message);
      if (e.code === 'moderation_blocked' || /safety|moderation/i.test(e.message)) return res.status(422).json({ error: 'The AI no fit use this photo. Try a clear, well-lit selfie of just you, facing the camera.' });
      if (e.name === 'TimeoutError' || e.name === 'AbortError') return res.status(504).json({ error: 'The AI took too long this time. Try again, it no go count.' });
      if (e.status === 429) return res.status(503).json({ error: 'Plenty people dey make pictures now. Try again in a minute.' });
      res.status(502).json({ error: 'The realistic swap no work this time. Try again, it no go count.' });
    } finally { busy.delete(req.user.id); }
  });

  app.get('/api/admin/swap', admin, (req, res) => res.json({
    ai: aiReady(), engine: engine(),
    total: one(`SELECT COUNT(*) n FROM swap_log`).n,
    today: one(`SELECT COUNT(*) n FROM swap_log WHERE date=?`, watDate()).n,
    outfits: all(`SELECT outfit k, COUNT(*) n FROM swap_log GROUP BY outfit ORDER BY n DESC`),
    locations: all(`SELECT location k, COUNT(*) n FROM swap_log GROUP BY location ORDER BY n DESC`),
  }));
};
