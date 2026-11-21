// 💘 Love Corner (Pick One, Secret Crush, Be My Boo, Love Meter) and 🎭 Gist Rooms (anonymous group chats).
const FONT = "'Bricolage Grotesque', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const buzz = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'now' : m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };
function wrap(c, text, maxW) { const words = String(text).split(' '), lines = []; let l = ''; for (const w of words) { const t = l ? l + ' ' + w : w; if (c.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t; } if (l) lines.push(l); return lines; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
async function shareCanvas(cv, name, text, toast) {
  const b = await new Promise(z => cv.toBlob(z, 'image/jpeg', .92)), f = new File([b], name, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], text }); } catch {} return; }
  const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  toast('Picture saved. Post it on your status 📲');
}
const wa = (text) => window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
async function copy(text, toast) { try { await navigator.clipboard.writeText(text); toast('Link copied 💘'); } catch { prompt('Copy this link', text); } }
function hearts(n = 24) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < n; i++) { const d = document.createElement('span'); d.className = 'lv-heart'; d.textContent = ['💘', '💖', '💕', '❤️', '💞'][i % 5]; d.style.left = 2 + Math.random() * 80 + 'vw'; d.style.animationDelay = Math.random() * .8 + 's'; d.style.fontSize = 18 + Math.random() * 22 + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 3600); }
}

// ======================= ❤️ Love Meter =======================
const VERDICT = [
  [90, 'Wedding bells this December 💍', 'Aunty don start to collect aso-ebi money. Una two na correct match!'],
  [75, 'Correct match! 🔥', 'Una go carry first at every owambe this December 💃🏾🕺🏾'],
  [55, 'Something dey there 👀', 'Small jollof, big potential. Shoot your shot before the Crossover 🍛'],
  [35, 'Friendzone with small chops 😅', 'Una fit still share puff-puff, but take am slow.'],
  [0, 'Fire and water 🔥💧', 'Maybe just Christmas friends. Love go still find you this December 🎄'],
];
function meter(a, b) {
  const [x, y] = [a, b].map(s => s.toLowerCase().replace(/[^a-z]/g, '')).sort();
  if (x && x === y) return 100;
  let h = 2166136261; for (const ch of x + '💘' + y) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return 22 + (h % 78);
}
const ship = (a, b) => { const A = a.trim().split(/\s+/)[0], B = b.trim().split(/\s+/)[0]; return (A.slice(0, Math.ceil(A.length / 2)) + B.slice(Math.floor(B.length / 2)).toLowerCase()).replace(/^./, c => c.toUpperCase()); };
async function meterCard(a, b, pct, v) {
  try { await document.fonts.load(`900 80px ${FONT}`); } catch {}
  const cv = mk(1080, 1350), c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, '#ff6fa8'); g.addColorStop(1, '#7b1f5c'); c.fillStyle = g; c.fillRect(0, 0, 1080, 1350);
  for (let i = 0; i < 40; i++) { c.globalAlpha = .12 + Math.random() * .2; c.font = `${30 + Math.random() * 60}px serif`; c.fillText('💖', Math.random() * 1080, Math.random() * 1350); } c.globalAlpha = 1;
  c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = `800 40px ${FONT}`; c.fillText('DETTY DECEMBER LOVE METER', 540, 150);
  c.font = `900 76px ${FONT}`; const names = `${a}  💘  ${b}`; wrap(c, names, 940).slice(0, 2).forEach((l, i) => c.fillText(l, 540, 290 + i * 86));
  c.save(); c.translate(540, 650); c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(0, 0, 200, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 26; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, 200, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct / 100); c.stroke();
  c.fillStyle = '#fff'; c.font = `900 150px ${FONT}`; c.fillText(pct + '%', 0, 50); c.restore();
  c.fillStyle = '#FFE7A3'; c.font = `900 58px ${FONT}`; c.fillText(v[1], 540, 960);
  c.fillStyle = '#fff'; c.font = `700 36px ${FONT}`; wrap(c, v[2], 880).slice(0, 2).forEach((l, i) => c.fillText(l, 540, 1030 + i * 48));
  c.font = `800 38px ${FONT}`; c.fillText(`Ship name: ${ship(a, b)}`, 540, 1170);
  c.globalAlpha = .85; c.font = `700 30px ${FONT}`; c.fillText('Check your own love meter on Detty December 💘', 540, 1280);
  return cv;
}
export function openMeter(x) {
  const { sheet, toast, track, me, confetti, beep } = x;
  const bg = sheet(`<div class="lvm lv"><span class="lvm-ic">❤️</span><h3>Love Meter</h3><p>Type two names. The Detty December love gods will decide 😌</p>
    <div class="lvm-names"><input id="lmA" maxlength="20" placeholder="Your name" value="${esc((me && me.nickname) || '')}"><span>💘</span><input id="lmB" maxlength="20" placeholder="Their name"></div>
    <button class="btn btn-gold" id="lmGo">Calculate our love 💘</button><div id="lmOut"></div></div>`);
  const out = bg.querySelector('#lmOut');
  bg.querySelector('#lmGo').onclick = async () => {
    const a = bg.querySelector('#lmA').value.trim(), b = bg.querySelector('#lmB').value.trim();
    if (!a || !b) return toast('Type both names 💘');
    const pct = meter(a, b), v = VERDICT.find(z => pct >= z[0]); track('meter_make');
    out.innerHTML = `<div class="lvm-dial"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="t"/><circle cx="60" cy="60" r="50" class="f" id="lmArc"/></svg><b id="lmPct">0%</b></div>`;
    const arc = out.querySelector('#lmArc'), num = out.querySelector('#lmPct'), L = 2 * Math.PI * 50; arc.style.strokeDasharray = L; arc.style.strokeDashoffset = L;
    buzz(); let t0 = performance.now();
    await new Promise(done => { (function f(t) { const k = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - k, 3), p = Math.round(pct * e); num.textContent = p + '%'; arc.style.strokeDashoffset = L * (1 - p / 100); if (k < 1) requestAnimationFrame(f); else done(); })(t0); });
    beep && beep('win'); buzz(30); if (pct >= 75) { hearts(26); } else confetti && confetti(40);
    const cv = await meterCard(a, b, pct, v); cv.className = 'lvm-card';
    out.insertAdjacentHTML('beforeend', `<div class="lvm-v"><b>${esc(v[1])}</b><p>${esc(v[2])}</p><small>Ship name: <b>${esc(ship(a, b))}</b></small></div>`);
    out.appendChild(cv);
    const act = document.createElement('div'); act.className = 'lvm-acts'; act.innerHTML = `<button class="btn btn-wa">📲 Post to my status</button><button class="btn btn-line">Try another name</button>`; out.appendChild(act);
    act.children[0].onclick = () => { track('meter_share'); shareCanvas(cv, 'love-meter.jpg', `Our love meter says ${pct}% 💘 ${v[1]} Check yours on Detty December: ${location.origin}`, toast); };
    act.children[1].onclick = () => { out.innerHTML = ''; bg.querySelector('#lmB').value = ''; bg.querySelector('#lmB').focus(); };
  };
}

// ======================= 💌 Be My Boo: the public page =======================
export async function booPage(root, code, x) {
  const { api, toast } = x; let A;
  try { A = await api('/api/boo/' + encodeURIComponent(code)); } catch (e) { root.innerHTML = `<div class="bb-page lv"><div class="bb-card"><span class="bb-big">🥲</span><h2>Link no work</h2><p>${esc(e.message)}</p><a class="btn btn-gold" href="/">Open Detty December</a></div></div>`; return; }
  const done = (ans) => {
    root.querySelector('.bb-card').innerHTML = ans === 'yes'
      ? `<span class="bb-big bb-pop">💘</span><h2>Yaaay! It's official!</h2><p>${esc(A.from)} is going to be SO happy. Your Detty December just got sweeter 🥰</p><p class="bb-small">Screenshot this and post it 📸</p><a class="bb-own" href="/?from=boo">💌 Send your own "Be my boo" link</a>`
      : `<span class="bb-big">🥺</span><h2>Okay… we'll tell ${esc(A.from)} gently.</h2><p>No wahala. Christmas is still for everybody 🎄</p><a class="bb-own" href="/?from=boo">✨ Make your own on Detty December</a>`;
    if (ans === 'yes') hearts(34);
  };
  root.innerHTML = `<div class="bb-page lv"><div class="bb-card">
    <span class="bb-big">💌</span><p class="bb-to">Hey ${esc(A.to)} 👋🏾</p><h2><b>${esc(A.from)}</b> wants to ask you something…</h2>
    ${A.msg ? `<blockquote>"${esc(A.msg)}"</blockquote>` : ''}
    <h1>Will you be my Detty December boo? 💘</h1>
    <div class="bb-arena" id="bbArena"><button class="bb-yes" id="bbYes">Yes 💘</button><button class="bb-no" id="bbNo">No</button></div>
    <p class="bb-small" id="bbHint">Choose wisely 😌</p></div></div>`;
  if (A.answer) return done(A.answer);
  const arena = root.querySelector('#bbArena'), no = root.querySelector('#bbNo'), yes = root.querySelector('#bbYes'), hint = root.querySelector('#bbHint');
  let tries = 0, scale = 1, settled = false, downAt = 0;
  const lines = ['Are you sure? 🥺', 'Think am again 😩', 'Jollof and small chops dey o 🍛', 'I go buy you suya every day 🍢', 'Please now 🙏🏾', 'Okay fine, you can press it 😔'];
  const run = (e) => {
    if (settled) return; if (e) { e.preventDefault(); e.stopPropagation(); }
    tries++; buzz(15); hint.textContent = lines[Math.min(lines.length - 1, tries - 1)];
    scale = Math.min(1.9, scale + .14); yes.style.transform = `scale(${scale})`;
    if (tries >= 6) { settled = true; no.classList.add('tired'); no.textContent = 'No 😔'; return; }
    const ar = arena.getBoundingClientRect(), bw = no.offsetWidth, bh = no.offsetHeight;
    no.style.left = Math.round(Math.random() * Math.max(0, ar.width - bw)) + 'px'; no.style.top = Math.round(Math.random() * Math.max(0, ar.height - bh)) + 'px'; no.classList.add('free');
  };
  no.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') run(e); });
  no.addEventListener('pointerdown', (e) => { downAt = Date.now(); run(e); });
  no.addEventListener('click', async (e) => { if (Date.now() - downAt < 600 && !(settled && no.dataset.ready)) { e.preventDefault(); if (settled) no.dataset.ready = '1'; return; } if (!settled) return run(e); try { await api(`/api/boo/${encodeURIComponent(code)}/answer`, { answer: 'no', tries }); } catch {} done('no'); });
  yes.onclick = async () => { yes.disabled = true; try { await api(`/api/boo/${encodeURIComponent(code)}/answer`, { answer: 'yes', tries }); done('yes'); } catch (e) { toast(e.message); yes.disabled = false; } };
}

// ======================= 💘 Love Corner hub =======================
export async function openLove(x, start) {
  const { api, toast, track, beep, confetti, sheet, me, refLink } = x;
  const ov = document.createElement('div'); ov.className = 'overlay lv lv-ov'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  const close = () => { stop(); ov.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', escK, true); x.onClose && x.onClose(); };
  const escK = (e) => { if (e.key === 'Escape' && !document.querySelector('.sheet-bg')) close(); }; document.addEventListener('keydown', escK, true);
  const top = (title, back) => `<div class="lv-top">${back ? `<button class="lv-ic lv-back" aria-label="Back"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>` : '<button class="lv-ic lv-x" aria-label="Close">✕</button>'}<b>${title}</b>${back ? '<button class="lv-ic lv-x" aria-label="Close">✕</button>' : ''}</div>`;
  const wire = (onBack) => { ov.querySelectorAll('.lv-x').forEach(b => b.onclick = close); const bk = ov.querySelector('.lv-back'); if (bk) bk.onclick = () => { stop(); onBack(); }; };
  const invite = () => { track('invite', { from: 'love' }); wa(`Come join me on Detty December 💘 Pick One, Secret Crush, Love Meter and anonymous Gist Rooms. Na here December dey happen: ${refLink}`); };
  const needFriends = (have) => `<div class="lv-empty"><span>🫶🏾</span><b>Bring your people first</b><p>This game uses your friends on Detty December (your squad, people you invited, people you duelled or share a Gist Room with). You have ${have}. Invite at least ${Math.max(1, 2 - have)} more.</p><button class="btn btn-wa" id="lvInv">Invite friends on WhatsApp</button></div>`;

  async function hub() {
    stop(); let L = {}; try { L = await api('/api/love'); } catch {}
    track('love_open');
    ov.innerHTML = `<div class="inner lv-in">${top('💘 Love Corner')}
      <section class="lv-hero"><span class="lv-hero-ic">💘</span><h2>Love dey the Detty air</h2><p>Compliments, secret crushes, ask-outs and love meters. All with your real friends, all kind.</p>
        <div class="lv-stats"><span><b>${L.picksTotal || 0}</b>picked you</span><span><b>${L.admirers || 0}</b>secret admirer${L.admirers === 1 ? '' : 's'}</span><span><b>${L.matches || 0}</b>match${L.matches === 1 ? '' : 'es'}</span></div></section>
      <div class="lv-tiles">
        <button class="lv-tile t-pick" data-go="pick">${L.picksNew ? `<em>${L.picksNew} new</em>` : ''}<span>💘</span><b>Pick One</b><small>Anonymous compliments for your friends</small></button>
        <button class="lv-tile t-crush" data-go="crush">${L.admirers ? `<em>👀 ${L.admirers}</em>` : ''}<span>💞</span><b>Secret Crush</b><small>Only revealed if it's mutual</small></button>
        <button class="lv-tile t-boo" data-go="boo">${L.booYes ? `<em>${L.booYes} yes!</em>` : ''}<span>💌</span><b>Be My Boo</b><small>Ask them out. The "No" button runs 😂</small></button>
        <button class="lv-tile t-meter" data-go="meter"><span>❤️</span><b>Love Meter</b><small>Two names, one percentage</small></button>
      </div>
      <button class="lv-wide" data-go="rooms">${L.roomsUnread ? `<em>${L.roomsUnread}</em>` : ''}<span>🎭</span><div><b>Gist Rooms</b><small>Anonymous group chats. Everybody wears a mask.</small></div><i>›</i></button>
      ${(L.circle || 0) < 4 ? `<button class="lv-wide lv-invite" id="lvInv2"><span>🫶🏾</span><div><b>Love Corner is sweeter with your people</b><small>Invite friends so you can pick them, crush on them and gist</small></div><i>›</i></button>` : ''}
      <p class="lv-fine">💚 Kind only: picks are compliments, crushes stay secret unless mutual, and anything rude gets blocked.</p></div>`;
    wire();
    ov.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { buzz(); const g = b.dataset.go; if (g === 'meter') return openMeter(x); if (g === 'rooms') return rooms(); ({ pick, crush, boo })[g](); });
    const iv = ov.querySelector('#lvInv2'); if (iv) iv.onclick = invite;
  }

  // ----- 💘 Pick One -----
  async function pick(tab = 'play') {
    stop(); track('picks_open');
    ov.innerHTML = `<div class="inner lv-in">${top('💘 Pick One', true)}<div class="lv-seg"><button data-t="play" class="${tab === 'play' ? 'on' : ''}">Play</button><button data-t="me" class="${tab === 'me' ? 'on' : ''}">Picked me</button></div><div id="lvBody"></div></div>`;
    wire(hub); ov.querySelectorAll('.lv-seg button').forEach(b => b.onclick = () => pick(b.dataset.t));
    const body = ov.querySelector('#lvBody');
    if (tab === 'me') {
      const P = await api('/api/picks/mine').catch(e => (toast(e.message), null)); if (!P) return;
      body.innerHTML = P.total ? `<div class="lv-top3">${P.top.map(t => `<div><span>${t.emoji}</span><b>${t.n}×</b><small>${esc(t.q)}</small></div>`).join('')}</div>
        <div class="lv-list">${P.picks.map(p => `<div class="lv-pickrow ${p.seen ? '' : 'new'}"><span>${p.emoji}</span><div><small>Someone picked you for</small><b>${esc(p.q)}</b></div><i>${ago(p.at)}</i></div>`).join('')}</div>`
        : `<div class="lv-empty"><span>💭</span><b>Nobody has picked you yet</b><p>Play Pick One for your friends. When they play, your name shows up too 😉</p><button class="btn btn-gold" id="lvPlay">Play now</button></div>`;
      const pl = body.querySelector('#lvPlay'); if (pl) pl.onclick = () => pick('play'); return;
    }
    const round = async () => {
      let R; try { R = await api('/api/picks/next'); } catch (e) { return toast(e.message); }
      if (R.need) { body.innerHTML = needFriends(R.have); body.querySelector('#lvInv').onclick = invite; return; }
      if (R.done) { body.innerHTML = `<div class="lv-empty"><span>😴</span><b>You've picked enough for today</b><p>Fresh questions in about ${Math.ceil(R.resetIn / 3600000)} hour${Math.ceil(R.resetIn / 3600000) === 1 ? '' : 's'}. Check who picked you meanwhile!</p><button class="btn btn-gold" id="lvMe">See who picked me</button></div>`; body.querySelector('#lvMe').onclick = () => pick('me'); return; }
      body.innerHTML = `<div class="lv-q"><div class="lv-qprog"><i style="width:${100 * (R.total - R.left) / R.total}%"></i></div><small>${R.total - R.left + 1} of ${R.total} today</small>
        <span class="lv-qe">${R.emoji}</span><h2>${esc(R.q)}</h2>
        <div class="lv-opts">${R.options.map((o, i) => `<button data-id="${o.id}" style="--c:${['#ff7eb3', '#ffd23f', '#5ee08c', '#6ec6ff'][i]}"><span>${esc(o.nickname[0] || '?').toUpperCase()}</span><b>${esc(o.nickname)}</b></button>`).join('')}</div>
        <button class="lv-skip" id="lvSkip">Shuffle 🔀</button><p class="lv-fine">They'll get an anonymous compliment. They will never see it was you.</p></div>`;
      body.querySelector('#lvSkip').onclick = () => { buzz(); round(); };
      body.querySelectorAll('.lv-opts button').forEach(b => b.onclick = async () => {
        body.querySelectorAll('.lv-opts button').forEach(z => { z.disabled = true; z.classList.toggle('chosen', z === b); z.classList.toggle('dim', z !== b); });
        try { await api('/api/picks', { to: +b.dataset.id }); buzz(25); beep && beep('tap'); b.insertAdjacentHTML('beforeend', '<i class="lv-plus">+2 🪙</i>'); } catch (e) { toast(e.message); }
        setTimeout(round, 900);
      });
    };
    round();
  }

  // ----- 💞 Secret Crush -----
  async function crush() {
    stop(); let C; try { C = await api('/api/crush'); } catch (e) { return toast(e.message); }
    const draw = (filter = '') => {
      const mine = new Set(C.mine.map(m => m.id)), people = C.people.filter(p => !mine.has(p.id) && p.nickname.toLowerCase().includes(filter.toLowerCase()));
      ov.innerHTML = `<div class="inner lv-in">${top('💞 Secret Crush', true)}
        <section class="lv-crush-hero"><span>💞</span><p>Pick up to ${C.max} friends you like. <b>Nobody will ever know</b>, unless they pick you too. Then you both get "It's a match!" 🥰</p>
          ${C.admirers ? `<div class="lv-admire">👀 <b>${C.admirers}</b> ${C.admirers === 1 ? 'person has' : 'people have'} a secret crush on you</div>` : ''}</section>
        <div class="lv-sec"><b>Your crushes</b><small>${C.mine.length} / ${C.max}</small></div>
        <div class="lv-crushes">${C.mine.length ? C.mine.map(m => `<div class="lv-crush ${m.mutual ? 'match' : ''}"><span>${m.mutual ? '💞' : '🤫'}</span><div><b>${esc(m.nickname)}</b><small>${m.mutual ? "It's a match!" : 'Waiting… secretly'}</small></div><button data-rm="${m.id}" aria-label="Remove">✕</button></div>`).join('') : '<p class="lv-muted">No crushes yet. Pick from your friends below 👇🏾</p>'}</div>
        ${C.people.length < 1 ? needFriends(0) : `<div class="lv-sec"><b>Your friends</b><small>${C.people.length}</small></div><input class="lv-search" id="lvQ" placeholder="Search a name" value="${esc(filter)}">
        <div class="lv-people">${people.map(p => `<div class="lv-person"><span>${esc(p.nickname[0] || '?').toUpperCase()}</span><b>${esc(p.nickname)}</b><button data-add="${p.id}" ${C.mine.length >= C.max ? 'disabled' : ''}>💘 Crush</button></div>`).join('') || '<p class="lv-muted">No one matches that name.</p>'}</div>`}</div>`;
      wire(hub);
      const iv = ov.querySelector('#lvInv'); if (iv) iv.onclick = invite;
      const q = ov.querySelector('#lvQ'); if (q) { q.oninput = () => { const v = q.value, pos = q.selectionStart; draw(v); const n = ov.querySelector('#lvQ'); n.focus(); n.setSelectionRange(pos, pos); }; }
      ov.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { await api('/api/crush/' + b.dataset.rm, null, 'DELETE').catch(() => {}); C.mine = C.mine.filter(m => m.id !== +b.dataset.rm); draw(filter); });
      ov.querySelectorAll('[data-add]').forEach(b => b.onclick = async () => {
        try { const r = await api('/api/crush', { to: +b.dataset.add }); const p = C.people.find(z => z.id === +b.dataset.add); C.mine.push({ id: p.id, nickname: p.nickname, mutual: r.mutual }); buzz(20);
          if (r.mutual) { hearts(36); beep && beep('win'); const s = sheet(`<div class="lv-match lv"><span>💞</span><h3>It's a match!</h3><p>You and <b>${esc(r.name)}</b> have a crush on each other 🥰 They've been told too.</p><button class="btn btn-gold" id="mOk">Aww, okay 🥹</button></div>`); s.querySelector('#mOk').onclick = () => s.remove(); }
          else toast('Added 🤫 If they pick you too, you\'ll both know!');
          draw(filter);
        } catch (e) { toast(e.message); }
      });
    };
    draw();
  }

  // ----- 💌 Be My Boo (create) -----
  async function boo() {
    stop(); let B = { asks: [] }; try { B = await api('/api/boo'); } catch {}
    const lines = ['You make my December brighter ✨', 'Owambe no go sweet without you 💃🏾', 'I go share my small chops with you 🥟', 'Let\'s enter 2027 together 🎆'];
    ov.innerHTML = `<div class="inner lv-in">${top('💌 Be My Boo', true)}
      <section class="lv-boo-hero"><span>💌</span><h2>Ask them out, Detty December style</h2><p>Make a link and send it. On their screen, the <b>No</b> button runs away 😂 and the <b>Yes</b> button keeps growing. You'll be told their answer.</p></section>
      <label class="lv-lbl">Their name<input id="bbTo" maxlength="24" placeholder="e.g. Tolu"></label>
      <label class="lv-lbl">A sweet line (optional)<textarea id="bbMsg" maxlength="160" rows="2" placeholder="Say something sweet"></textarea></label>
      <div class="lv-chips">${lines.map(l => `<button>${esc(l)}</button>`).join('')}</div>
      <button class="btn btn-gold" id="bbMake">Create my link 💌</button>
      ${B.asks.length ? `<div class="lv-sec"><b>Your asks</b><small>${B.asks.length}</small></div><div class="lv-list">${B.asks.map(a => `<div class="lv-ask ${a.answer || 'wait'}"><span>${a.answer === 'yes' ? '💘' : a.answer === 'no' ? '💔' : '👀'}</span><div><b>${esc(a.to_name)}</b><small>${a.answer === 'yes' ? `Said YES!${a.tries ? ` After chasing No ${a.tries}×` : ''}` : a.answer === 'no' ? 'Said no this time' : a.opens ? `Opened ${a.opens}× · no answer yet` : 'Not opened yet'}</small></div><button data-link="${a.code}">Share</button></div>`).join('')}</div>` : ''}</div>`;
    wire(hub);
    ov.querySelectorAll('.lv-chips button').forEach(b => b.onclick = () => { ov.querySelector('#bbMsg').value = b.textContent; });
    const shareAsk = (code, to) => { const link = `${location.origin}/b/${code}`; const s = sheet(`<div class="lv-match lv"><span>💌</span><h3>Your link is ready!</h3><p>Send it to <b>${esc(to)}</b>. We'll tell you the moment they answer.</p><div class="lv-link"><code>${esc(link.replace(/^https?:\/\//, ''))}</code><button id="lkC">Copy</button></div><button class="btn btn-wa" id="lkW">Send on WhatsApp</button></div>`);
      s.querySelector('#lkC').onclick = () => copy(link, toast); s.querySelector('#lkW').onclick = () => { track('boo_share'); wa(`${to} 👀 I have a question for you… 💌\n${link}`); }; };
    ov.querySelector('#bbMake').onclick = async () => {
      const to = ov.querySelector('#bbTo').value.trim(), msg = ov.querySelector('#bbMsg').value.trim(); if (!to) return toast('Type their name 💌');
      try { const r = await api('/api/boo', { to, msg }); buzz(20); beep && beep('win'); shareAsk(r.code, to); boo(); } catch (e) { toast(e.message); }
    };
    ov.querySelectorAll('[data-link]').forEach(b => b.onclick = () => shareAsk(b.dataset.link, B.asks.find(a => a.code === b.dataset.link).to_name));
  }

  // ======================= 🎭 Gist Rooms =======================
  async function rooms() {
    stop(); let R; try { R = await api('/api/rooms'); } catch (e) { return toast(e.message); }
    track('rooms_open');
    ov.innerHTML = `<div class="inner lv-in">${top('🎭 Gist Rooms', !start)}
      <section class="lv-rooms-hero"><span>🎭</span><h2>Anonymous group chats</h2><p>Make a room for your squad, family or office. Everybody gets a mask name, so nobody knows who said what 🤫</p>
        <div class="lv-2"><button class="btn btn-gold" id="rmNew">+ New room</button><button class="btn lv-ghost" id="rmJoin">Join with code</button></div></section>
      ${R.rooms.length ? `<div class="lv-list">${R.rooms.map(r => `<button class="lv-room" data-room="${r.code}"><span>${r.emoji}</span><div><b>${esc(r.name)}</b><small>${r.last ? esc(r.last) : `${r.members} member${r.members === 1 ? '' : 's'}`}</small></div>${r.unread ? `<em>${r.unread}</em>` : `<i>${r.lastAt ? ago(r.lastAt) : ''}</i>`}</button>`).join('')}</div>`
      : `<div class="lv-empty"><span>🫥</span><b>No rooms yet</b><p>Start one and share the link in your group chat. The gist go burst 🔥</p></div>`}</div>`;
    wire(hub);
    if (start) ov.querySelector('.lv-x').onclick = close;
    ov.querySelectorAll('[data-room]').forEach(b => b.onclick = () => room(b.dataset.room));
    ov.querySelector('#rmJoin').onclick = () => { const s = sheet(`<div class="lv lv-form"><h3>Join a room</h3><p>Paste the room link or type the code.</p><input id="jc" placeholder="e.g. abc123" maxlength="80"><button class="btn btn-gold" id="jg">Join</button></div>`);
      s.querySelector('#jg').onclick = async () => { const v = s.querySelector('#jc').value.trim(), c = (v.match(/([a-z0-9]{4,12})\/?$/i) || [])[1]; if (!c) return toast('Check the code'); try { await api(`/api/rooms/${c}/join`, {}); s.remove(); room(c.toLowerCase()); } catch (e) { toast(e.message); } }; };
    ov.querySelector('#rmNew').onclick = () => {
      let emoji = R.emojis[0];
      const s = sheet(`<div class="lv lv-form"><h3>New Gist Room</h3><p>Give it a name your people will recognise.</p><input id="rn" maxlength="40" placeholder="e.g. Yaba Squad, Cousins 2026"><div class="lv-emojis">${R.emojis.map((e, i) => `<button class="${i ? '' : 'on'}">${e}</button>`).join('')}</div><button class="btn btn-gold" id="rc">Create room</button></div>`);
      s.querySelectorAll('.lv-emojis button').forEach(b => b.onclick = () => { emoji = b.textContent; s.querySelectorAll('.lv-emojis button').forEach(z => z.classList.toggle('on', z === b)); });
      s.querySelector('#rc').onclick = async () => { try { const r = await api('/api/rooms', { name: s.querySelector('#rn').value, emoji }); s.remove(); await room(r.code); inviteSheet(r); } catch (e) { toast(e.message); } };
    };
  }
  function inviteSheet(r) {
    const link = `${location.origin}/r/${r.code}`;
    const s = sheet(`<div class="lv-match lv"><span>${r.emoji}</span><h3>Invite your people</h3><p>Share this link in your group chat. Everyone who joins gets a mask name.</p><div class="lv-link"><code>${esc(link.replace(/^https?:\/\//, ''))}</code><button id="ic">Copy</button></div><button class="btn btn-wa" id="iw">Share on WhatsApp</button></div>`);
    s.querySelector('#ic').onclick = () => copy(link, toast); s.querySelector('#iw').onclick = () => { track('room_share'); wa(`Join "${r.name}" on Detty December 🎭 It's anonymous, nobody go know who talk wetin 🤫\n${link}`); };
  }
  const ICEBREAK = ['Confess something you did last December 🤫', 'Who here go first collect "when are you getting married?" 😂', 'Best owambe food. Defend your answer 🍛', 'Rate your 2026 from 1 to 10 and why', 'Who for this group dey hide crush? 👀', 'What are you most excited for this December?', 'Worst Christmas gift you ever got 🎁', 'If this group had a Christmas party, who would be the DJ?'];
  async function room(code) {
    stop(); let D, last = '';
    try { D = await api(`/api/rooms/${code}?full=1`); } catch (e) { toast(e.message); return rooms(); }
    ov.innerHTML = `<div class="inner lv-in lv-chat">
      <div class="lv-top lv-chat-top"><button class="lv-ic lv-back" aria-label="Back"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="lv-rt"><b>${D.room.emoji} ${esc(D.room.name)}</b><small id="rmMeta"></small></div><button class="lv-ic" id="rmMenu" aria-label="Room menu">⋯</button></div>
      <div class="lv-msgs" id="rmMsgs" aria-live="polite"></div>
      <div class="lv-ice" id="rmIce" hidden>${ICEBREAK.map(i => `<button>${esc(i)}</button>`).join('')}</div>
      <form class="lv-compose" id="rmForm"><button type="button" class="lv-ic" id="rmIceB" aria-label="Icebreakers">💡</button><button type="button" class="lv-ic" id="rmPoll" aria-label="Make a poll">📊</button><input id="rmIn" maxlength="500" placeholder="Say something… anonymously" autocomplete="off"><button class="lv-send" aria-label="Send">➤</button></form></div>`;
    ov.querySelector('.lv-back').onclick = () => { stop(); rooms(); };
    const box = ov.querySelector('#rmMsgs'), inp = ov.querySelector('#rmIn');
    const render = (data) => {
      D = data; const key = JSON.stringify([data.refresh, data.room]); if (key === last) return; last = key;
      const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
      ov.querySelector('#rmMeta').innerHTML = `${data.room.members} member${data.room.members === 1 ? '' : 's'}${data.room.locked ? ' · 🔒 locked' : ''} · you are <span style="color:${data.room.me.color}">${esc(data.room.me.alias)}</span>`;
      box.innerHTML = (data.refresh || []).map(m => {
        if (m.kind === 'system') return `<div class="lv-sys">${esc(m.body)}</div>`;
        const who = m.mine ? `You · ${esc(m.who.alias)}` : `${esc(m.who.alias)}${m.who.name ? ` · <u>${esc(m.who.name)}</u>` : ''}`;
        const reacts = m.reacts.length ? `<div class="lv-reacts">${m.reacts.map(r => `<span class="${r.mine ? 'mine' : ''}">${r.e} ${r.n}</span>`).join('')}</div>` : '';
        const poll = m.poll ? (() => { const tot = m.poll.counts.reduce((a, b) => a + b, 0) || 0; return `<div class="lv-poll"><b>📊 ${esc(m.poll.q)}</b>${m.poll.options.map((o, i) => { const pct = tot ? Math.round(100 * m.poll.counts[i] / tot) : 0; return `<button data-vote="${m.id}" data-i="${i}" class="${m.poll.mine === i ? 'on' : ''}"><i style="width:${m.poll.mine == null ? 0 : pct}%"></i><span>${esc(o)}</span>${m.poll.mine == null ? '' : `<em>${pct}%</em>`}</button>`; }).join('')}<small>${tot} vote${tot === 1 ? '' : 's'}${m.poll.mine == null ? ' · tap to vote' : ''}</small></div>`; })() : '';
        return `<div class="lv-msg ${m.mine ? 'me' : ''}" data-msg="${m.id}"><small style="color:${m.who.color}">${who} · ${ago(m.at)}</small>${m.kind === 'poll' ? poll : `<p>${esc(m.body)}</p>`}${reacts}</div>`;
      }).join('') || '<div class="lv-sys">No gist yet. Break the ice 💡</div>';
      if (nearBottom) box.scrollTop = box.scrollHeight;
      box.querySelectorAll('[data-vote]').forEach(b => b.onclick = async (e) => { e.stopPropagation(); buzz(); await api(`/api/rooms/${code}/vote`, { id: +b.dataset.vote, choice: +b.dataset.i }).catch(er => toast(er.message)); poll(true); });
      box.querySelectorAll('[data-msg]').forEach(el => el.onclick = () => msgSheet(data.refresh.find(z => z.id === +el.dataset.msg)));
    };
    const poll = async (now) => { clearTimeout(timer); try { render(await api(`/api/rooms/${code}?full=1`)); } catch (e) { if (/not in this room/i.test(e.message)) { toast('You are no longer in this room.'); return rooms(); } } if (ov.isConnected && ov.querySelector('#rmMsgs')) timer = setTimeout(poll, document.hidden ? 8000 : 2500); };
    render(D); box.scrollTop = box.scrollHeight; timer = setTimeout(poll, 2500);
    ov.querySelector('#rmForm').onsubmit = async (e) => { e.preventDefault(); const body = inp.value.trim(); if (!body) return; inp.value = ''; buzz(); try { await api(`/api/rooms/${code}/msg`, { body }); box.scrollTop = box.scrollHeight; poll(true); setTimeout(() => { box.scrollTop = box.scrollHeight; }, 300); } catch (er) { inp.value = body; toast(er.message); } };
    ov.querySelector('#rmIceB').onclick = () => { const ice = ov.querySelector('#rmIce'); ice.hidden = !ice.hidden; };
    ov.querySelectorAll('#rmIce button').forEach(b => b.onclick = () => { inp.value = b.textContent; ov.querySelector('#rmIce').hidden = true; inp.focus(); });
    ov.querySelector('#rmPoll').onclick = () => {
      const s = sheet(`<div class="lv lv-form"><h3>📊 New poll</h3><input id="pq" maxlength="140" placeholder="Ask the room… e.g. Who go late to the party?"><input class="po" maxlength="60" placeholder="Option 1"><input class="po" maxlength="60" placeholder="Option 2"><input class="po" maxlength="60" placeholder="Option 3 (optional)"><input class="po" maxlength="60" placeholder="Option 4 (optional)"><button class="btn btn-gold" id="pg">Post poll</button></div>`);
      s.querySelector('#pg').onclick = async () => { try { await api(`/api/rooms/${code}/poll`, { q: s.querySelector('#pq').value, options: [...s.querySelectorAll('.po')].map(i => i.value) }); s.remove(); poll(true); setTimeout(() => { box.scrollTop = box.scrollHeight; }, 300); } catch (e) { toast(e.message); } };
    };
    function msgSheet(m) {
      if (!m || m.kind === 'system') return;
      const s = sheet(`<div class="lv lv-form"><h3>${m.mine ? 'Your message' : esc(m.who.alias)}</h3><div class="lv-rpick">${['❤️', '😂', '🔥', '😮', '👏', '🙏'].map(e => `<button>${e}</button>`).join('')}</div>
        ${m.mine ? '' : `<button class="btn btn-line" id="ms-r">🚩 Report this message</button>${D.room.owner ? '<button class="btn btn-line" id="ms-k">🚪 Remove this person from the room</button>' : ''}`}</div>`);
      s.querySelectorAll('.lv-rpick button').forEach(b => b.onclick = async () => { buzz(); await api(`/api/rooms/${code}/react`, { id: m.id, emoji: b.textContent }).catch(e => toast(e.message)); s.remove(); poll(true); });
      const r = s.querySelector('#ms-r'); if (r) r.onclick = async () => { const o = await api(`/api/rooms/${code}/report`, { id: m.id }).catch(e => toast(e.message)); s.remove(); toast(o && o.hidden ? 'Reported and hidden 🚩' : 'Reported. If someone else reports it, it disappears 🚩'); poll(true); };
      const k = s.querySelector('#ms-k'); if (k) k.onclick = async () => { await api(`/api/rooms/${code}/kick`, { id: m.id }).catch(e => toast(e.message)); s.remove(); toast('Removed. Their identity stays secret 🎭'); poll(true); };
    }
    ov.querySelector('#rmMenu').onclick = () => {
      const R = D.room, s = sheet(`<div class="lv lv-form"><h3>${R.emoji} ${esc(R.name)}</h3><p>You are <b style="color:${R.me.color}">${esc(R.me.alias)}</b>${R.me.revealed ? ' (unmasked)' : ''}.</p>
        <button class="btn btn-gold" id="mm-i">📨 Invite people</button>${R.me.revealed ? '' : '<button class="btn btn-line" id="mm-u">🎭 Unmask me (show my name)</button>'}
        ${R.owner ? `<button class="btn btn-line" id="mm-l">${R.locked ? '🔓 Open the room to new people' : '🔒 Lock the room (no new people)'}</button>` : ''}
        <button class="btn btn-line lv-danger" id="mm-x">${R.owner ? '🗑️ Delete this room' : '🚪 Leave this room'}</button>
        <p class="lv-fine">Rules: be kind, no links or phone numbers. Messages with 2 reports disappear. The owner can remove anyone without knowing who they are.</p></div>`);
      s.querySelector('#mm-i').onclick = () => { s.remove(); inviteSheet(R); };
      const u = s.querySelector('#mm-u'); if (u) u.onclick = async () => { if (!confirm(`Show your real name in "${R.name}"? Everyone will see that ${R.me.alias} is you. This can't be undone.`)) return; await api(`/api/rooms/${code}/reveal`, {}).catch(e => toast(e.message)); s.remove(); poll(true); };
      const l = s.querySelector('#mm-l'); if (l) l.onclick = async () => { await api(`/api/rooms/${code}/lock`, { locked: !R.locked }).catch(e => toast(e.message)); s.remove(); poll(true); };
      s.querySelector('#mm-x').onclick = async () => { if (!confirm(R.owner ? 'Delete this room and all its messages for everyone?' : 'Leave this room?')) return; await api(`/api/rooms/${code}/leave`, {}).catch(() => {}); s.remove(); rooms(); };
    };
  }

  if (start === 'rooms') rooms(); else if (start === 'pick' || start === 'crush' || start === 'boo') ({ pick, crush, boo })[start](); else if (start && start.room) { try { await api(`/api/rooms/${start.room}/join`, {}); room(start.room); } catch (e) { toast(e.message); rooms(); } } else hub();
}
