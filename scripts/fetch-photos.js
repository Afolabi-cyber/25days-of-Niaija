// Downloads the sign-up page photos into public/photos so the app serves them itself.
// Run once on your machine or server:  node scripts/fetch-photos.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const re = /f: '([^']+)', u: '([^']+)'/g;
const out = path.join(__dirname, '..', 'public', 'photos');
fs.mkdirSync(out, { recursive: true });
const places = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'places.json'), 'utf8')).places;
const list = [];
let m; while ((m = re.exec(src))) list.push([m[1], m[2]]);
for (const p of places) if (!list.find(x => x[0] === p.photo.f)) list.push([p.photo.f, p.photo.u]);
(async () => {
  for (const [file, url] of list) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'naija25-photo-fetch/1.0 (self-hosting credited photos)' }, redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.writeFileSync(path.join(out, file), Buffer.from(await r.arrayBuffer()));
      console.log('saved', file);
    } catch (e) { console.log('failed', file, e.message, '(the page will load it from the web instead)'); }
  }
  console.log('Done. Open the app and check each photo looks right before launch.');
})();
