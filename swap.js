'use strict';
// Christmas Drip Booth: real photos of you at popular Nigerian spots decorated for Christmas.
//
//   1. Photo Spot (free, instant, on the phone): the selfie is cut out on the device (MediaPipe) and placed
//      into a real spot photo (spots.js) with matched light and Christmas decor. The photo never leaves the phone.
//   2. Make it real (AI): the selfie + the real spot photo go to OpenAI (gpt-image-1, Images edit, two input
//      images, input_fidelity "high"), which redraws the person photo-real at that spot, in a new outfit or in
//      their own clothes. Free players get FREE_AI_DAILY a day (default 1, watermarked); premium gets 10 a day.
//      AI_GLOBAL_DAILY (default 500) caps the whole app's AI pictures per day, to protect your OpenAI bill.
//      Model: OPENAI_IMAGE_MODEL (gpt-image-1). Quality: OPENAI_IMAGE_QUALITY (low|medium|high, default medium).
//      Or use your own service with SWAP_API_URL (+ SWAP_API_KEY); it receives
//        { image, mime, scene (base64 spot photo or null), outfit, spot, prompt, width, height, format }
//      and returns image bytes, or JSON { image: base64 } / { url }.
//   Photos are passed straight through and never stored on this server.
const fs = require('fs');
const path = require('path');
const express = require('express');

module.exports = function swap(app, d) {
  const { one, all, run, db, auth, admin, now, watDate, logEvent, isPremium, spots } = d;
  const CAT = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'swap.json'), 'utf8'));
  const O = Object.fromEntries(CAT.outfits.map(x => [x.id, x]));
  const OWN = { id: 'own', name: 'My own clothes', emoji: '👕', prompt: null };
  const outfitOf = (id) => id === 'own' ? OWN : O[id];
  const AI_DAILY = 10;
  const FREE_AI = Math.max(0, parseInt(process.env.FREE_AI_DAILY ?? '1', 10) || 0);
  const GLOBAL_AI = Math.max(1, parseInt(process.env.AI_GLOBAL_DAILY || '500', 10));
  db.exec(`CREATE TABLE IF NOT EXISTS swap_log(id INTEGER PRIMARY KEY, user_id INTEGER, date TEXT, outfit TEXT, location TEXT, mode TEXT, created_at INTEGER);
  CREATE INDEX IF NOT EXISTS swap_log_u ON swap_log(user_id, date);`);
  const engine = () => process.env.OPENAI_API_KEY ? 'openai' : process.env.SWAP_API_URL ? 'custom' : null;
  const aiReady = () => !!engine();
  const pub = (x) => ({ id: x.id, name: x.name, emoji: x.emoji, blurb: x.blurb });
  const aiUsed = (uid) => one(`SELECT COUNT(*) n FROM swap_log WHERE user_id=? AND date=? AND mode='ai'`, uid, watDate()).n;
  const aiToday = () => one(`SELECT COUNT(*) n FROM swap_log WHERE date=? AND mode='ai'`, watDate()).n;
  const allowance = (prem) => prem ? AI_DAILY : FREE_AI;

  app.get('/api/swap/config', auth, (req, res) => {
    const u = one(`SELECT premium_until FROM users WHERE id=?`, req.user.id), prem = isPremium(u), daily = allowance(prem);
    res.json({ outfits: CAT.outfits.map(pub), premium: prem, ai: aiReady(), engine: engine(),
      aiLeft: Math.max(0, daily - aiUsed(req.user.id)), aiDaily: daily, aiPremiumDaily: AI_DAILY, aiFreeDaily: FREE_AI,
      made: one(`SELECT COUNT(*) n FROM swap_log WHERE user_id=?`, req.user.id).n });
  });

  // A picture was saved or shared (stats only).
  app.post('/api/swap/save', auth, (req, res) => {
    const o = outfitOf(req.body.outfit), s = spots.spot(req.body.spot); if (!o || !s) return res.status(400).json({ error: 'Pick a spot first.' });
    run(`INSERT INTO swap_log(user_id,date,outfit,location,mode,created_at) VALUES(?,?,?,?,?,?)`, req.user.id, watDate(), o.id, s.id, req.body.ai ? 'ai_save' : 'spot', now());
    logEvent(req.user.id, 'swap', { outfit: o.id, spot: s.id, mode: req.body.ai ? 'ai' : 'spot', how: String(req.body.how || '').slice(0, 12) }, req.ipaddr);
    res.json({ ok: true });
  });

  // ---------- Make it real (AI) ----------
  const busy = new Set(); // one render at a time per player, so a double tap never pays twice
  function prompt(o, s, hasScene) {
    const where = hasScene ? `Place them naturally into the scene shown in the SECOND image (${s.name}, ${s.city}): keep that exact place, its Christmas decorations and its lighting.` : `Setting: ${s.prompt}.`;
    const wear = o.prompt ? `Dress them in ${o.prompt}. The clothes must fit their body naturally with real fabric texture, folds and stitching.` : `Keep the clothes they are wearing in the FIRST image, exactly as they are.`;
    return `Create a real-looking photograph of the exact same person shown in the FIRST image.
Identity is the top priority: keep their face, facial features, skin tone, hairline, hair, age, body shape and expression exactly the same, so friends instantly recognise them. Do not beautify, slim, lighten or change their skin tone or face shape.
${wear}
${where}
Framing: vertical photo, person from about the knees or waist up, standing in the centre foreground, looking at the camera with a natural, happy, confident pose, like a friend took the picture with a good phone camera.
Light: match the person's lighting, colour and shadows to the scene so it looks like one real photo, with a soft natural background blur.
Do not add text, logos, watermarks, borders or extra people.`;
  }
  const base = () => (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  async function renderOpenAI(img, mime, scene, o, s) {
    const fd = new FormData();
    fd.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
    fd.append('image[]', new Blob([img], { type: mime }), 'selfie.' + (mime.split('/')[1] || 'jpg'));
    if (scene) fd.append('image[]', new Blob([scene], { type: 'image/jpeg' }), 'scene.jpg');
    fd.append('prompt', prompt(o, s, !!scene));
    fd.append('size', '1024x1536');
    fd.append('quality', process.env.OPENAI_IMAGE_QUALITY || 'medium');
    fd.append('input_fidelity', 'high');
    fd.append('output_format', 'jpeg');
    fd.append('n', '1');
    const r = await fetch(base() + '/images/edits', { method: 'POST', headers: { authorization: 'Bearer ' + process.env.OPENAI_API_KEY }, body: fd, signal: AbortSignal.timeout(170000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j.error && j.error.message) || 'OpenAI said ' + r.status); e.code = (j.error && j.error.code) || ''; e.status = r.status; throw e; }
    const b64 = j.data && j.data[0] && j.data[0].b64_json; if (!b64) throw new Error('no image in OpenAI reply');
    return { buf: Buffer.from(b64, 'base64'), type: 'image/jpeg' };
  }
  async function renderCustom(b64, mime, scene, o, s) {
    const r = await fetch(process.env.SWAP_API_URL, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.SWAP_API_KEY ? { authorization: 'Bearer ' + process.env.SWAP_API_KEY } : {}) },
      body: JSON.stringify({ image: b64, mime, scene: scene ? scene.toString('base64') : null, outfit: { id: o.id, name: o.name, prompt: o.prompt }, spot: { id: s.id, name: s.name, city: s.city, prompt: s.prompt }, prompt: prompt(o, s, !!scene), width: 1024, height: 1536, format: 'jpeg' }),
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
    const u = one(`SELECT premium_until FROM users WHERE id=?`, req.user.id), prem = isPremium(u);
    if (!aiReady()) return res.status(503).json({ error: 'Make it real is coming soon.', comingSoon: true });
    const o = outfitOf(req.body.outfit), s = spots.spot(req.body.spot); if (!o || !s) return res.status(400).json({ error: 'Pick a spot first.' });
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.photo || ''));
    if (!m) return res.status(400).json({ error: 'Send a photo first.' });
    const daily = allowance(prem);
    if (aiUsed(req.user.id) >= daily) return res.status(prem ? 429 : 402).json({ error: prem ? `You don make ${AI_DAILY} real pictures today. Come back tomorrow!` : `You don use your free real picture${FREE_AI === 1 ? '' : 's'} for today. Premium gets ${AI_DAILY} a day.`, premium: !prem });
    if (aiToday() >= GLOBAL_AI) return res.status(503).json({ error: 'Plenty people don make real pictures today 🔥 Try again tomorrow, or use Photo Spot for now.' });
    if (busy.has(req.user.id)) return res.status(429).json({ error: 'Your last picture is still cooking. Give it a moment 🍳' });
    busy.add(req.user.id); const t0 = now();
    try {
      const sf = spots.spotFile(s.id), scene = sf ? fs.readFileSync(sf) : null;
      const out = engine() === 'openai' ? await renderOpenAI(Buffer.from(m[2], 'base64'), m[1], scene, o, s) : await renderCustom(m[2], m[1], scene, o, s);
      run(`INSERT INTO swap_log(user_id,date,outfit,location,mode,created_at) VALUES(?,?,?,?,?,?)`, req.user.id, watDate(), o.id, s.id, 'ai', now());
      logEvent(req.user.id, 'swap', { outfit: o.id, spot: s.id, mode: 'ai', engine: engine(), scene: !!scene, ms: now() - t0, premium: prem }, req.ipaddr);
      res.set('content-type', out.type); res.set('cache-control', 'private, no-store'); res.send(out.buf);
    } catch (e) {
      console.error('swap ai:', e.status || '', e.code || '', e.message);
      if (e.code === 'moderation_blocked' || /safety|moderation/i.test(e.message)) return res.status(422).json({ error: 'The AI no fit use this photo. Try a clear, well-lit selfie of just you, facing the camera.' });
      if (e.name === 'TimeoutError' || e.name === 'AbortError') return res.status(504).json({ error: 'The AI took too long this time. Try again, it no go count.' });
      if (e.status === 429) return res.status(503).json({ error: 'Plenty people dey make pictures now. Try again in a minute.' });
      res.status(502).json({ error: 'Make it real no work this time. Try again, it no go count.' });
    } finally { busy.delete(req.user.id); }
  });

  app.get('/api/admin/swap', admin, (req, res) => res.json({
    ai: aiReady(), engine: engine(), freeDaily: FREE_AI, globalDaily: GLOBAL_AI, aiToday: aiToday(),
    total: one(`SELECT COUNT(*) n FROM swap_log`).n,
    today: one(`SELECT COUNT(*) n FROM swap_log WHERE date=?`, watDate()).n,
    outfits: all(`SELECT outfit k, COUNT(*) n FROM swap_log GROUP BY outfit ORDER BY n DESC`),
    spots: all(`SELECT location k, COUNT(*) n FROM swap_log GROUP BY location ORDER BY n DESC`),
  }));
  return { outfits: CAT.outfits };
};
