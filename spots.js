'use strict';
// Christmas Photo Spots: real photos of popular Nigerian places decorated for Christmas, plus real-looking
// outfit photos for the Drip Booth picker.
//
// Where photos come from (per spot / outfit):
//   1. Uploaded in admin → Settings → Photo spots (your own real photos: best).
//   2. "Generate with AI" in the same place (OpenAI, needs OPENAI_API_KEY). Generated once, then kept.
// Photos live in a "spots" folder next to the database (so on Render they sit on the persistent disk).
const fs = require('fs');
const path = require('path');
const express = require('express');

module.exports = function spots(app, d) {
  const { admin, logEvent, dbPath, outfits } = d;
  const CAT = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'spots.json'), 'utf8'));
  const DIR = path.join(path.dirname(dbPath), 'spots');
  fs.mkdirSync(DIR, { recursive: true });
  const S = Object.fromEntries(CAT.spots.map(x => [x.id, x]));
  const O = Object.fromEntries(outfits.map(x => [x.id, x]));
  const file = (kind, id) => path.join(DIR, `${kind === 'outfit' ? 'outfit-' : ''}${id}.jpg`);
  const has = (kind, id) => fs.existsSync(file(kind, id));
  const url = (kind, id) => { try { return `/spots/${kind === 'outfit' ? 'outfit-' : ''}${id}.jpg?v=${Math.round(fs.statSync(file(kind, id)).mtimeMs)}`; } catch { return null; } };
  const pub = (x) => ({ id: x.id, name: x.name, city: x.city, emoji: x.emoji, fallback: x.fallback, tint: x.tint, img: url('spot', x.id) });

  app.use('/spots', express.static(DIR, { maxAge: '7d' }));
  app.get('/api/spots', (req, res) => res.json({ spots: CAT.spots.map(pub), outfitImgs: Object.fromEntries(outfits.map(o => [o.id, url('outfit', o.id)])) }));

  // ---------- admin: upload or generate ----------
  app.get('/api/admin/spots', admin, (req, res) => res.json({
    ai: !!process.env.OPENAI_API_KEY,
    spots: CAT.spots.map(x => ({ ...pub(x), prompt: x.prompt })),
    outfits: outfits.map(o => ({ id: o.id, name: o.name, emoji: o.emoji, img: url('outfit', o.id) })),
  }));
  app.post('/api/admin/spots/upload', admin, express.json({ limit: '8mb' }), (req, res) => {
    const kind = req.body.kind === 'outfit' ? 'outfit' : 'spot', id = String(req.body.id || '');
    if (!(kind === 'spot' ? S[id] : O[id])) return res.status(404).json({ error: 'Unknown ' + kind });
    const m = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.photo || ''));
    if (!m) return res.status(400).json({ error: 'Send a JPG, PNG or WEBP photo.' });
    fs.writeFileSync(file(kind, id), Buffer.from(m[1], 'base64'));
    res.json({ img: url(kind, id) });
  });
  app.delete('/api/admin/spots/:kind/:id', admin, (req, res) => { try { fs.unlinkSync(file(req.params.kind, req.params.id)); } catch {} res.json({ ok: true }); });

  async function generate(prompt) {
    const r = await fetch((process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/images/generations', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1', prompt, size: '1024x1536', quality: 'high', output_format: 'jpeg', n: 1 }),
      signal: AbortSignal.timeout(180000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || 'OpenAI said ' + r.status);
    const b64 = j.data && j.data[0] && j.data[0].b64_json; if (!b64) throw new Error('No image came back.');
    return Buffer.from(b64, 'base64');
  }
  const spotPrompt = (x) => `A real, photorealistic vertical photograph of ${x.prompt}. Shot on a professional full-frame camera at eye level, natural colours, sharp details, authentic Nigerian setting, joyful Christmas season atmosphere. There are NO people in the foreground: keep a clear open space in the centre-bottom of the frame where a person will later be placed. No text overlays, no watermarks.`;
  const outfitPrompt = (o) => `A real, photorealistic fashion catalogue photo of ${o.prompt}, displayed on an invisible ghost mannequin (no person, no face, no skin), centred, full outfit visible from shoulders to waist, against a deep emerald green studio backdrop with soft gold rim light. No text, no logos.`;
  app.post('/api/admin/spots/generate', admin, async (req, res) => {
    if (!process.env.OPENAI_API_KEY) return res.status(400).json({ error: 'Set OPENAI_API_KEY on the server first.' });
    const kind = req.body.kind === 'outfit' ? 'outfit' : 'spot', id = String(req.body.id || ''), x = kind === 'spot' ? S[id] : O[id];
    if (!x) return res.status(404).json({ error: 'Unknown ' + kind });
    try { fs.writeFileSync(file(kind, id), await generate(kind === 'spot' ? spotPrompt(x) : outfitPrompt(x))); res.json({ img: url(kind, id) }); }
    catch (e) { console.error('spot gen:', e.message); res.status(502).json({ error: e.message }); }
  });

  return { spot: (id) => S[id], spotFile: (id) => (has('spot', id) ? file('spot', id) : null), SPOTS: CAT.spots };
};
