// Downloads the sign-up page photos into public/photos so the app serves them itself.
// Run once on your machine or server:  node scripts/fetch-photos.js
const fs = require('fs'), path = require('path');
// Sign-up photos live in public/app.js; the daily "Naija in pictures" photos live in server.js.
const src = ['public/app.js', 'server.js'].map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
const re = /f: '([^']+)', u: '([^']+)'/g;
const out = path.join(__dirname, '..', 'public', 'photos');
fs.mkdirSync(out, { recursive: true });
(async () => {
  let m;
  while ((m = re.exec(src))) {
    const [, file, url] = m;
    if (fs.existsSync(path.join(out, file)) && !process.argv.includes('--force')) { console.log('have', file); continue; }
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'naija25-photo-fetch/1.0 (self-hosting credited photos)' }, redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.writeFileSync(path.join(out, file), Buffer.from(await r.arrayBuffer()));
      console.log('saved', file);
    } catch (e) { console.log('failed', file, e.message, '(the page will load it from the web instead)'); }
  }
  console.log('Done. Open the app and check each photo looks right before launch.');
})();
