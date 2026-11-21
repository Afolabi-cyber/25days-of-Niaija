// Free fun features: 💌 Sweet Notes (anonymous Christmas notes) and 👑 Owambe Title (your December title).
const FONT = "'Bricolage Grotesque', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const buzz = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
const VIBE = {
  sweet: { e: '💖', n: 'Sweet', g: ['#ff7eb3', '#b8326a'] }, funny: { e: '😂', n: 'Funny', g: ['#ffd23f', '#e0861c'] },
  wish: { e: '🎄', n: 'Christmas wish', g: ['#2e9b72', '#0b3d26'] }, thanks: { e: '🙏', n: 'Thank you', g: ['#7fc4ff', '#2a5ab8'] },
  crush: { e: '🤭', n: 'Small crush', g: ['#c28bff', '#5b2a9e'] },
};
const PROMPTS = {
  sweet: ['One thing I love about you is…', 'You made my 2026 better because…', 'The nicest thing you ever did for me…'],
  funny: ['The funniest thing you did this year…', 'If you were a Christmas food, you would be…', 'Your owambe dance looks like…'],
  wish: ['My Christmas wish for you is…', 'In 2027, I pray you…', 'This December, I hope you…'],
  thanks: ['Thank you for…', 'I never told you, but you helped me when…', 'I appreciate you because…'],
  crush: ['Something I have never said to you…', 'You have a smile that…', 'If I could take you anywhere this December…'],
};
function wrap(c, text, maxW) { const words = text.split(' '), lines = []; let l = ''; for (const w of words) { const t = l ? l + ' ' + w : w; if (c.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t; } if (l) lines.push(l); return lines; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
async function fontsReady() { try { await document.fonts.load(`900 80px ${FONT}`); } catch {} }
async function shareCanvas(cv, name, text, toast, track, kind) {
  const b = await new Promise(z => cv.toBlob(z, 'image/jpeg', .92)); const f = new File([b], name, { type: 'image/jpeg' });
  if (track) track(kind);
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], text }); } catch {} return; }
  const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  toast('Picture saved. Post it on your status 📲'); if (text) window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}
function storyBg(c, g0, g1) {
  c.fillStyle = (() => { const g = c.createLinearGradient(0, 0, 1080, 1920); g.addColorStop(0, g0); g.addColorStop(1, g1); return g; })(); c.fillRect(0, 0, 1080, 1920);
  let s = 7; const r = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let i = 0; i < 40; i++) { const x = r() * 1080, y = r() * 1920, rad = 10 + r() * 50; const gr = c.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
}

// ---------- 💌 Sweet Notes: the story picture of one note ----------
async function noteStory(note) {
  await fontsReady(); const v = VIBE[note.vibe] || VIBE.sweet, cv = mk(1080, 1920), c = cv.getContext('2d');
  storyBg(c, v.g[0], v.g[1]);
  c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = `900 56px ${FONT}`; c.fillText('Somebody sent me this 💌', 540, 330);
  c.font = `700 34px ${FONT}`; c.globalAlpha = .85; c.fillText('anonymously, on Sweet Notes', 540, 390); c.globalAlpha = 1;
  c.font = `800 58px ${FONT}`; const lines = wrap(c, note.body, 780).slice(0, 9), h = 140 + lines.length * 76;
  c.save(); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 40; c.fillStyle = '#fff'; rr(c, 110, 960 - h / 2, 860, h, 48); c.fill(); c.restore();
  c.font = '110px serif'; c.fillText(v.e, 540, 960 - h / 2 + 20);
  c.fillStyle = '#1b1b2a'; c.font = `800 58px ${FONT}`; lines.forEach((l, i) => c.fillText(l, 540, 960 - h / 2 + 130 + i * 76));
  c.fillStyle = '#fff'; c.font = `900 44px ${FONT}`; c.fillText('Send me one too 👇🏾', 540, 1560); c.font = `700 32px ${FONT}`; c.globalAlpha = .9; c.fillText('Detty December · Sweet Notes', 540, 1760);
  return cv;
}
async function linkStory(name, link) {
  await fontsReady(); const cv = mk(1080, 1920), c = cv.getContext('2d'); storyBg(c, '#ff7eb3', '#5b2a9e');
  c.textAlign = 'center'; c.font = '200px serif'; c.fillText('💌', 540, 640);
  c.fillStyle = '#fff'; c.font = `900 84px ${FONT}`; ['Send me a sweet', 'Christmas note'].forEach((l, i) => c.fillText(l, 540, 820 + i * 100));
  c.font = `700 40px ${FONT}`; c.globalAlpha = .9; c.fillText("It's anonymous. I won't know it's you 🤫", 540, 1060); c.globalAlpha = 1;
  c.fillStyle = 'rgba(255,255,255,.95)'; rr(c, 120, 1180, 840, 130, 65); c.fill(); c.fillStyle = '#5b2a9e'; c.font = `800 40px ${FONT}`; c.fillText(link.replace(/^https?:\/\//, ''), 540, 1260);
  c.fillStyle = '#fff'; c.font = `700 32px ${FONT}`; c.fillText(`${name}'s Sweet Notes · Detty December`, 540, 1760);
  return cv;
}

// ---------- 💌 the public page a friend opens (no account needed) ----------
export async function noteSendPage(root, code, x) {
  const { api, toast } = x; let info;
  try { info = await api('/api/notes/to/' + encodeURIComponent(code)); } catch (e) { root.innerHTML = `<div class="sn-page"><div class="sn-card"><span class="sn-big">🥲</span><h2>Link no work</h2><p>${esc(e.message)}</p><a class="btn btn-gold" href="/">Open Detty December</a></div></div>`; return; }
  let vibe = 'sweet', pi = 0;
  const draw = () => {
    root.innerHTML = `<div class="sn-page"><div class="sn-card">
      <span class="sn-big">💌</span><h2>Send ${esc(info.name)} a sweet Christmas note</h2><p class="sn-sub">100% anonymous. They will never know it's you 🤫</p>
      ${info.open ? `<div class="sn-vibes">${Object.entries(VIBE).map(([k, v]) => `<button class="sn-vibe ${k === vibe ? 'on' : ''}" data-v="${k}" style="--g0:${v.g[0]};--g1:${v.g[1]}">${v.e}<small>${v.n}</small></button>`).join('')}</div>
      <div class="sn-box" style="--g0:${VIBE[vibe].g[0]};--g1:${VIBE[vibe].g[1]}"><textarea id="snTx" maxlength="280" placeholder="${esc(PROMPTS[vibe][pi % 3])}"></textarea><div class="sn-meta"><button id="snIdea" type="button">🎲 Give me an idea</button><span id="snCount">0/280</span></div></div>
      <button class="btn btn-gold sn-send" id="snGo">Send anonymously 💌</button><p class="sn-fine">Kind words only. Links, phone numbers and insults are blocked.</p>`
      : `<p class="sn-sub">${esc(info.name)} is not taking notes right now. Check back later!</p>`}
      <a class="sn-own" href="/?from=notes">✨ Get your own Sweet Notes link</a></div></div>`;
    root.querySelectorAll('.sn-vibe').forEach(b => b.onclick = () => { const t = root.querySelector('#snTx').value; vibe = b.dataset.v; pi = 0; buzz(); draw(); root.querySelector('#snTx').value = t; upd(); });
    const tx = root.querySelector('#snTx'); if (!tx) return;
    const upd = () => { root.querySelector('#snCount').textContent = `${tx.value.length}/280`; }; tx.oninput = upd;
    root.querySelector('#snIdea').onclick = () => { pi++; tx.placeholder = PROMPTS[vibe][pi % 3]; if (!tx.value) { tx.value = PROMPTS[vibe][pi % 3].replace('…', ' '); upd(); } tx.focus(); };
    root.querySelector('#snGo').onclick = async () => {
      const body = tx.value.trim(); if (body.length < 3) return toast('Write a little more 🙂');
      const g = root.querySelector('#snGo'); g.disabled = true; g.textContent = 'Sending…';
      try { await api('/api/notes/to/' + encodeURIComponent(code), { body, vibe }); buzz(30);
        root.querySelector('.sn-card').innerHTML = `<span class="sn-big sn-pop">💌</span><h2>Sent!</h2><p class="sn-sub">Your ${VIBE[vibe].e} note is on its way to ${esc(info.name)}. They'll never know it was you.</p>
          <button class="btn btn-gold" id="snMore">Send another</button><a class="sn-own big" href="/?from=notes">✨ Now get your own link. See what people say about you!</a>`;
        root.querySelector('#snMore').onclick = draw;
      } catch (e) { toast(e.message); g.disabled = false; g.textContent = 'Send anonymously 💌'; }
    };
  };
  draw();
}

// ---------- 💌 my Sweet Notes ----------
export async function openNotes(x) {
  const { api, toast, track, sheet, me } = x; let D;
  try { D = await api('/api/notes'); } catch (e) { return toast(e.message); }
  track('notes_open');
  const ov = document.createElement('div'); ov.className = 'overlay notes'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const close = () => { ov.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc_, true); x.onClose && x.onClose(); };
  const esc_ = (e) => { if (e.key === 'Escape' && !document.querySelector('.sheet-bg')) close(); }; document.addEventListener('keydown', esc_, true);
  const link = `${location.origin}/n/${D.code}`, ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
  const draw = () => {
    ov.innerHTML = `<div class="inner sn"><div class="g-top"><button class="g-close" aria-label="Close">✕</button><b class="gist-title">💌 Sweet Notes</b></div>
      <section class="sn-hero"><span>💌</span><h2>Get anonymous Christmas notes from your people</h2><p>Share your link. Friends send sweet, funny or kind notes. Nobody sees who sent what. Not even us.</p>
        <div class="sn-link"><code>${esc(link.replace(/^https?:\/\//, ''))}</code><button id="snCopy">Copy</button></div>
        <div class="sn-acts"><button class="btn btn-wa" id="snWa">Share on WhatsApp</button><button class="btn btn-gold" id="snStory">Post to my status</button></div>
        <label class="sn-open"><input type="checkbox" id="snOpen" ${D.open ? 'checked' : ''}><i></i><span>${D.open ? 'Taking notes' : 'Paused: nobody can send notes'}</span></label></section>
      <div class="section-title"><h2>Your notes</h2><span>${D.notes.length}${D.unseen ? ` · ${D.unseen} new` : ''}</span></div>
      ${D.notes.length ? `<div class="sn-list">${D.notes.map(n => { const v = VIBE[n.vibe] || VIBE.sweet; return `<article class="sn-note ${n.seen ? '' : 'new'}" style="--g0:${v.g[0]};--g1:${v.g[1]}"><header><span>${v.e} ${v.n}</span><small>${ago(n.at)}</small></header><p>${esc(n.body)}</p>
        <footer><button data-share="${n.id}">📲 Share</button><button data-hide="${n.id}">Hide</button><button data-report="${n.id}">🚩 Report</button></footer></article>`; }).join('')}</div>`
      : `<div class="sn-empty"><span>📭</span><b>No notes yet</b><p>Share your link on your status. The notes go start dey enter!</p></div>`}</div>`;
    ov.querySelector('.g-close').onclick = close;
    ov.querySelector('#snCopy').onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Link copied 💌'); } catch { prompt('Copy your link', link); } };
    ov.querySelector('#snWa').onclick = () => { track('notes_share', { via: 'wa' }); window.open('https://wa.me/?text=' + encodeURIComponent(`Send me an anonymous Christmas note 💌🤫 I won't know it's you:\n${link}`), '_blank'); };
    ov.querySelector('#snStory').onclick = async () => shareCanvas(await linkStory(me.nickname, link), 'sweet-notes-link.jpg', `Send me an anonymous Christmas note 💌 ${link}`, toast, track, 'notes_share');
    ov.querySelector('#snOpen').onchange = async (e) => { try { const r = await api('/api/notes/open', { open: e.target.checked }); D.open = r.open; draw(); } catch (er) { toast(er.message); } };
    ov.querySelectorAll('[data-share]').forEach(b => b.onclick = async () => { const n = D.notes.find(z => z.id === +b.dataset.share); shareCanvas(await noteStory(n), 'sweet-note.jpg', `Somebody sent me this 💌 Send me one: ${link}`, toast, track, 'note_story'); });
    ov.querySelectorAll('[data-hide]').forEach(b => b.onclick = async () => { await api(`/api/notes/${b.dataset.hide}/hide`, {}); D.notes = D.notes.filter(z => z.id !== +b.dataset.hide); draw(); });
    ov.querySelectorAll('[data-report]').forEach(b => b.onclick = () => {
      const bg = sheet(`<h3>🚩 Report this note?</h3><p>It will disappear from your notes and our team will review it. Sweet Notes is for kind words only.</p><div class="btn-row"><button class="btn btn-gold" id="rpYes">Report and hide</button><button class="btn btn-line" id="rpNo">Cancel</button></div>`);
      bg.querySelector('#rpNo').onclick = () => bg.remove();
      bg.querySelector('#rpYes').onclick = async () => { await api(`/api/notes/${b.dataset.report}/report`, {}); D.notes = D.notes.filter(z => z.id !== +b.dataset.report); bg.remove(); toast('Reported. Thank you for keeping it sweet 💌'); draw(); };
    });
  };
  draw();
}

// ---------- 👑 Owambe Title ----------
const T = {
  honor: ['Chief', 'High Chief', 'Otunba', 'Odogwu', 'Capo', 'Hon.', 'Barr.', 'Engr.', 'Prof.', 'Dr.', 'Oga', 'Big Aunty', 'Big Uncle', 'Ambassador'],
  nick: ['Jollof', 'Small Chops', 'Shine-Shine', 'Spray Money', 'Gele Master', 'Asun', 'Dodo', 'Zobo', 'Chin-Chin', 'Owambe', 'Vibes', 'Suya', 'Puff-Puff', 'Moi-Moi'],
  role: ['Duke of Third Mainland Bridge', 'Minister of Small Chops', 'Custodian of the Party Jollof', 'Grand Patron of Asun', 'Supreme Commander of the Dance Floor', 'Keeper of the Aso-ebi Purse', 'Chairman, Committee of Friends of Rice', 'Chief Spraying Officer', 'Governor of the Gele Republic', 'Director of Small Chops Distribution', 'Head of Department, Enjoyment', 'CEO of Chop Life Limited', 'Lord of the Lagos Traffic', 'Royal Guardian of the Cooler', 'Patron Saint of Suya', 'Speaker of the House of Owambe', 'Field Marshal of the Crossover Night', 'Inspector General of Party Rice'],
  power: ['can enter any owambe without an invite card', 'is allowed to collect two take-away packs', 'can dodge every aunty question with one smile', 'gets first spoon from the party jollof', 'can sleep through the Crossover service and still be blessed', 'is exempted from washing plates this Christmas', 'can request any song from the DJ', 'gets the chair closest to the small chops', 'can say "I am coming" and mean next week', 'is immune to "when are you getting married?"'],
  food: ['Party jollof with dodo', 'Pepper soup and agidi', 'Ofada rice and ayamase', 'Fried rice and chicken', 'Nkwobi and palm wine', 'Suya with extra yaji', 'Pounded yam and egusi', 'Moi-moi and custard', 'Puff-puff, hot', 'Peppered snail'],
};
function makeTitle(name, roll) {
  let h = 2166136261; for (const ch of name.toLowerCase().trim() + '#' + roll) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const r = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; }, p = (a) => a[Math.floor(r() * a.length)];
  const role = p(T.role), letters = role.split(/[^A-Za-z]+/).filter(w => w.length > 2 && /^[A-Z]/.test(w)).map(w => w[0]).join('').slice(0, 5);
  return { honor: p(T.honor), nick: p(T.nick), role, letters: 'G' + letters, power: p(T.power), food: p(T.food) };
}
async function titleCard(name, t) {
  await fontsReady(); const cv = mk(1080, 1350), c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, '#0F3A2D'); g.addColorStop(1, '#06150f'); c.fillStyle = g; c.fillRect(0, 0, 1080, 1350);
  c.strokeStyle = '#F5B83D'; c.lineWidth = 12; rr(c, 34, 34, 1012, 1282, 30); c.stroke(); c.strokeStyle = 'rgba(245,184,61,.5)'; c.lineWidth = 3; rr(c, 58, 58, 964, 1234, 22); c.stroke();
  c.textAlign = 'center'; c.fillStyle = '#FFE7A3'; c.font = `800 30px ${FONT}`; c.fillText('BY THE POWER OF DETTY DECEMBER', 540, 150);
  c.fillStyle = 'rgba(255,255,255,.8)'; c.font = `600 30px ${FONT}`; c.fillText('the elders hereby confer on', 540, 210);
  c.font = '120px serif'; c.fillText('👑', 540, 360);
  c.fillStyle = '#fff'; c.font = `900 72px ${FONT}`; wrap(c, `${t.honor} ${name} "${t.nick}"`, 920).forEach((l, i) => c.fillText(l, 540, 470 + i * 84));
  c.fillStyle = '#F5B83D'; c.font = `900 52px ${FONT}`; const rl = wrap(c, t.role, 900); rl.forEach((l, i) => c.fillText(l, 540, 650 + i * 62));
  c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `800 30px ${FONT}`; c.fillText(`(${t.letters}, Detty December 2026)`, 540, 650 + rl.length * 62 + 20);
  c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, 110, 860, 860, 280, 24); c.fill();
  c.fillStyle = '#FFE7A3'; c.font = `800 28px ${FONT}`; c.fillText('SPECIAL POWER', 540, 912); c.fillStyle = '#fff'; c.font = `700 36px ${FONT}`; wrap(c, `This person ${t.power}.`, 800).slice(0, 2).forEach((l, i) => c.fillText(l, 540, 962 + i * 46));
  c.fillStyle = '#FFE7A3'; c.font = `800 28px ${FONT}`; c.fillText('OFFICIAL CHRISTMAS FOOD', 540, 1068); c.fillStyle = '#fff'; c.font = `700 36px ${FONT}`; c.fillText(t.food, 540, 1112);
  c.fillStyle = 'rgba(255,255,255,.75)'; c.font = `700 28px ${FONT}`; c.fillText('Get your own title on Detty December 🎉', 540, 1240);
  return cv;
}
export function openTitle(x) {
  const { sheet, toast, track, me, confetti, beep } = x; let roll = 0, name = (me && me.nickname) || '';
  const bg = sheet(`<div class="ot"><span class="ot-ic">👑</span><h3>Your Owambe Title</h3><p>The elders will look at your name and give you the title you deserve this December.</p>
    <input class="ot-in" id="otN" maxlength="24" placeholder="Your name" value="${esc(name)}"><button class="btn btn-gold" id="otGo">🥁 Reveal my title</button><div id="otOut"></div></div>`);
  const out = bg.querySelector('#otOut');
  const reveal = async () => {
    name = bg.querySelector('#otN').value.trim().slice(0, 24); if (!name) return bg.querySelector('#otN').focus();
    out.innerHTML = `<div class="ot-drum">🥁 The elders are consulting…</div>`; buzz(); beep && beep('tap');
    await new Promise(z => setTimeout(z, 1100));
    const t = makeTitle(name, roll), cv = await titleCard(name, t); cv.className = 'ot-card'; track('title_make', { roll });
    out.innerHTML = ''; out.appendChild(cv);
    const acts = document.createElement('div'); acts.className = 'ot-acts';
    acts.innerHTML = `<button class="btn btn-wa" id="otShare">📲 Post to my status</button><button class="btn btn-line" id="otAgain">${roll < 2 ? '🙏🏾 Ask the elders again' : 'The elders have spoken 👑'}</button>`;
    out.appendChild(acts); confetti && confetti(60); beep && beep('win'); buzz(30);
    acts.querySelector('#otShare').onclick = () => shareCanvas(cv, 'owambe-title.jpg', `The elders have spoken 👑 I am now ${t.honor} ${name} "${t.nick}", ${t.role}. Get your own title on Detty December: ${location.origin}`, toast, track, 'title_share');
    const ag = acts.querySelector('#otAgain'); if (roll >= 2) ag.disabled = true; else ag.onclick = () => { roll++; reveal(); };
  };
  bg.querySelector('#otGo').onclick = () => { roll = 0; reveal(); };
}
