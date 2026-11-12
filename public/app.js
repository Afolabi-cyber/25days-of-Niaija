/* 25 Days of Naija: player app */
(() => {
'use strict';
const PRIZE_TEXT = 'Top 10 players every day win airtime';
const $ = (s, el = document) => el.querySelector(s);
const root = $('#root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get: (k, d) => { try { const v = localStorage.getItem('n25_' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('n25_' + k, JSON.stringify(v)); } catch {} } };

const S = { token: ls.get('token', null), me: null, tab: 'home', board: 'today', squad: null, lang: ls.get('lang', 'en'), sound: ls.get('sound', true), skew: 0, installEvt: null };

// ---------- words ----------
const W = {
  en: {
    play: 'Play', trip: 'Trip', ranks: 'Ranks', squads: 'Friends', me: 'Me',
    dayOpen: 'Day {d} is open', dayOpenSub: '7 questions, 10 seconds each. The Ask Mummy question is worth double.', playDay: 'Play Day {d}',
    opensIn: 'Day {d} opens in', preTitle: 'December is loading', preSub: 'Day 1 drops on 1 December at 7pm. Warm up now and bring your people.',
    playedTitle: 'You scored {c}/7 today', playedSub: 'Day {n} opens tomorrow at 7pm. Keep your streak alive.', lastPlayed: 'Crossover round opens 31 December at 7pm.',
    wrapTitle: "That's a wrap for December", wrapSub: 'Thank you for playing. See you next December.',
    shareWa: 'Share on WhatsApp', shareImg: 'Post to status', invite: 'Invite friends',
    inviteTitle: 'Bring your people, protect your streak', inviteSub: 'Every friend who joins with your link and plays a round gives you +200 points, +200 coins and a streak saver.',
    calendar: 'Your December', calendarSub: 'New door at 7pm daily', warmTitle: 'Warm-up round', warmSub: 'Practise anytime. No points, just vibes.',
    ahead: '{a} is ahead of {b} today', correct: 'Correct!', wrong: 'Not this one', timeout: "Time's up", pct: '{p}% of players got this',
    mummyNote: 'Ask Mummy bonus: 20 seconds and double points. You can shout for help at home.',
    v7: 'Perfect round!', v5: 'Very good!', v3: 'Not bad at all', v0: 'Tomorrow will be better',
    practice: 'Practice round. Points only count on the day.', reminders: 'Remind me on WhatsApp at 7pm', pidgin: 'Pidgin mode', sound: 'Sound effects',
    start: 'Start playing', crossover: 'Crossover round', crossSub: '31 Dec, 7pm', streak: 'day streak',
  },
  pg: {
    play: 'Play', trip: 'Japa', ranks: 'Ranks', squads: 'Padi', me: 'Me',
    dayOpen: 'Day {d} don open', dayOpenSub: '7 questions, 10 seconds each. The Ask Mummy one dey carry double points.', playDay: 'Play Day {d}',
    opensIn: 'Day {d} go open in', preTitle: 'December dey load', preSub: 'Day 1 go drop 1 December by 7pm. Warm up now, carry your people come.',
    playedTitle: 'You score {c}/7 today', playedSub: 'Day {n} go open tomorrow by 7pm. No let your streak die.', lastPlayed: 'Crossover round go open 31 December by 7pm.',
    wrapTitle: 'December don finish o', wrapSub: 'Thank you for playing. We go see next December.',
    shareWa: 'Share for WhatsApp', shareImg: 'Post am for status', invite: 'Invite your people',
    inviteTitle: 'Carry your people come, protect your streak', inviteSub: 'Every friend wey join with your link come play go give you +200 points and one streak saver.',
    calendar: 'Your December', calendarSub: 'New door every 7pm', warmTitle: 'Warm-up round', warmSub: 'Practise anytime. No points, na just vibes.',
    ahead: '{a} dey lead {b} today', correct: 'You sabi!', wrong: 'E no be am', timeout: 'Time don go', pct: '{p}% of players get am',
    mummyNote: 'Ask Mummy bonus: 20 seconds and double points. Call Mummy make she help you.',
    v7: 'You too sabi!', v5: 'You try well well!', v3: 'E no bad', v0: 'Tomorrow go better',
    practice: 'Na practice. Points dey count only on the day.', reminders: 'Remind me for WhatsApp by 7pm', pidgin: 'Pidgin mode', sound: 'Sound effects',
    start: 'Make we start', crossover: 'Crossover round', crossSub: '31 Dec, 7pm', streak: 'day streak',
  },
};
const t = (k, v = {}) => (W[S.lang][k] || W.en[k] || k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');

const STATES = ['Lagos', 'Oyo', 'Ogun', 'Osun', 'Ondo', 'Ekiti', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'Outside Nigeria'];
const SCHOOLS = ['UI Ibadan', 'OAU Ile-Ife', 'UNILAG', 'LASU', 'FUTA', 'OOU Ago-Iwoye', 'LAUTECH', 'UNIOSUN', 'FUNAAB', 'EKSU', 'AAUA', 'Covenant University', 'Babcock University', 'Bowen University', "Redeemer's University", 'Lead City University', 'Yabatech', 'LASUSTECH', 'The Polytechnic Ibadan', 'Federal Poly Ilaro', 'UNILORIN', 'UNIBEN', 'UNN', 'ABU Zaria', 'UNIPORT', 'Other university or poly', 'Secondary school', 'Not in school'];


// Photos: young Nigerians from Pexels (free licence) and landmarks from Wikimedia Commons (credited in the Photo credits sheet).
// Run `node scripts/fetch-photos.js` once to self-host them in /public/photos.
const PHOTOS = [
  { f: 'youth-glasses.jpg', u: 'https://images.pexels.com/photos/37364189/pexels-photo-37364189.jpeg?auto=compress&cs=tinysrgb&w=520', alt: 'A smiling young man in glasses and a green outfit', tag: 'Smile o', by: 'Zeus the Creator, Pexels', src: 'https://www.pexels.com/@zeusdcreator/' },
  { f: 'youth-attire.jpg', u: 'https://images.pexels.com/photos/38686548/pexels-photo-38686548.jpeg?auto=compress&cs=tinysrgb&w=520', alt: 'A cheerful young couple in vibrant African attire', tag: 'Owambe ready', by: 'Zeus the Creator, Pexels', src: 'https://www.pexels.com/@zeusdcreator/' },
  { f: 'youth-suit.jpg', u: 'https://images.pexels.com/photos/38977106/pexels-photo-38977106.jpeg?auto=compress&cs=tinysrgb&w=520', alt: 'A smiling young man in a suit and blue tie', tag: 'Sharp guy', by: 'Ansey Photography, Pexels', src: 'https://www.pexels.com/@ansey/' },
  { f: 'youth-grad.jpg', u: 'https://images.pexels.com/photos/38977107/pexels-photo-38977107.jpeg?auto=compress&cs=tinysrgb&w=520', alt: 'A smiling young female graduate in a helmet', tag: 'Big future', by: 'Ansey Photography, Pexels', src: 'https://www.pexels.com/@ansey/' },
  { f: 'youth-abuja.jpg', u: 'https://images.pexels.com/photos/38644212/pexels-photo-38644212.jpeg?auto=compress&cs=tinysrgb&w=520', alt: 'A stylish young couple in a garden in Abuja', tag: 'Abuja love', by: 'Zeus the Creator, Pexels', src: 'https://www.pexels.com/@zeusdcreator/' },
  { f: 'lekki-bridge.jpg', u: 'https://en.wikipedia.org/wiki/Special:FilePath/Lekki_link_bridge_at_night.jpg?width=720', alt: 'The Lekki-Ikoyi Link Bridge in Lagos at night', tag: 'Lekki-Ikoyi Bridge, Lagos', by: 'Wikimedia Commons', src: 'https://commons.wikimedia.org/wiki/File:Lekki_link_bridge_at_night.jpg' },
  { f: 'abuja-gate.jpg', u: 'https://en.wikipedia.org/wiki/Special:FilePath/Abuja_gate.jpg?width=720', alt: 'The Abuja City Gate', tag: 'City Gate, Abuja', by: 'Chippla, public domain', src: 'https://en.wikipedia.org/wiki/File:Abuja_gate.jpg' },
  { f: 'zuma-rock.jpg', u: 'https://en.wikipedia.org/wiki/Special:FilePath/Zuma_Rock.jpg?width=720', alt: 'Zuma Rock near Abuja', tag: 'Zuma Rock', by: 'Wikimedia Commons', src: 'https://commons.wikimedia.org/wiki/File:Zuma_Rock.jpg' },
  { f: 'olumo-rock.jpg', u: 'https://en.wikipedia.org/wiki/Special:FilePath/Entrance_to_Olumo_Rock.jpg?width=720', alt: 'The entrance to Olumo Rock in Abeokuta', tag: 'Olumo Rock, Abeokuta', by: 'Wikimedia Commons', src: 'https://commons.wikimedia.org/wiki/File:Entrance_to_Olumo_Rock.jpg' },
  { f: 'national-theatre.jpg', u: 'https://en.wikipedia.org/wiki/Special:FilePath/National_Theater_in_Lagos_State-Nigeria.jpg?width=720', alt: 'The National Theatre in Iganmu, Lagos', tag: 'National Theatre, Lagos', by: 'Wikimedia Commons', src: 'https://commons.wikimedia.org/wiki/File:National_Theater_in_Lagos_State-Nigeria.jpg' },
];
function photoTile(p, cls = '') {
  return `<figure class="ph ${cls}"><img src="/photos/${p.f}" data-remote="${p.u}" alt="${esc(p.alt)}" loading="lazy" decoding="async" onerror="if(this.dataset.remote&&this.src!==this.dataset.remote){this.src=this.dataset.remote}else{this.parentNode.classList.add('nophoto');this.remove()}"><figcaption>${esc(p.tag)}</figcaption></figure>`;
}

// ---------- api ----------
async function api(path, body, method) {
  const res = await fetch(path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && S.token) { S.token = null; ls.set('token', null); renderOnboarding(); throw new Error('auth'); }
  if (!res.ok) throw new Error(data.error || 'Network error. Check your data and try again.');
  return data;
}
const track = (type, meta) => { if (S.token) api('/api/event', { type, meta }).catch(() => {}); };
const srvNow = () => Date.now() + S.skew;

// ---------- feedback: toast, sound, haptics, confetti ----------
let toastT;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }
let actx;
function beep(type) {
  if (!S.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ok: [[660, 0], [880, .09], [1320, .18]], no: [[220, 0], [160, .12]], tick: [[1000, 0]], win: [[523, 0], [659, .1], [784, .2], [1047, .3]], tap: [[500, 0]] }[type];
    notes.forEach(([f, d]) => {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = type === 'no' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      const st = actx.currentTime + d, len = type === 'tick' || type === 'tap' ? .05 : .16;
      g.gain.setValueAtTime(.0001, st); g.gain.exponentialRampToValueAtTime(type === 'no' ? .06 : .14, st + .01); g.gain.exponentialRampToValueAtTime(.0001, st + len);
      o.connect(g).connect(actx.destination); o.start(st); o.stop(st + len + .02);
    });
  } catch {}
}
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
function confetti(n = 140) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('#confetti'), x = c.getContext('2d'); c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  const cols = ['#F5B83D', '#17A35B', '#ffffff', '#E5483C', '#3A55C4'];
  const P = Array.from({ length: n }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height * .4, r: (4 + Math.random() * 6) * devicePixelRatio, c: cols[Math.random() * 5 | 0], vy: (2 + Math.random() * 4) * devicePixelRatio, vx: (Math.random() - .5) * 3 * devicePixelRatio, a: Math.random() * 6, va: (Math.random() - .5) * .3 }));
  let f = 0;
  (function loop() {
    x.clearRect(0, 0, c.width, c.height);
    P.forEach(p => { p.y += p.vy; p.x += p.vx; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
    if (++f < 200) requestAnimationFrame(loop); else x.clearRect(0, 0, c.width, c.height);
  })();
}

// ---------- emoji reactions ----------
const RX = { ok: ['😎', '🔥', '👏🏾', '🙌🏾', '💯', '🤩', '👍🏾', '🥳'], no: ['😩', '🤦🏾', '😬', '🙈', '💔'], late: ['⏰', '🐢'] };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function popEmoji(e) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const d = document.createElement('div'); d.className = 'bigmoji'; d.textContent = e; document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
}
function rain(list, n = 22) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < n; i++) {
    const d = document.createElement('span'); d.className = 'rainmoji'; d.textContent = pick(list);
    d.style.left = Math.random() * 96 + 'vw'; d.style.animationDelay = Math.random() * .9 + 's'; d.style.fontSize = 22 + Math.random() * 18 + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 3400);
  }
}
function coinsTo(n) { if (S.me) S.me.user.coins = n; document.querySelectorAll('.pill.coin').forEach(el => { el.textContent = '🪙 ' + Number(n).toLocaleString(); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }); }

// ---------- time helpers ----------
const pad = (n) => String(n).padStart(2, '0');
function cd(ms) {
  ms = Math.max(0, ms); const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
  return d > 0 ? `${d}<small>d</small>${pad(h)}<small>h</small>${pad(m)}<small>m</small>` : `${pad(h)}<small>h</small>${pad(m)}<small>m</small>${pad(s)}<small>s</small>`;
}
const cdText = (ms) => cd(ms).replace(/<small>(\w)<\/small>/g, '$1 ').trim();
setInterval(() => {
  document.querySelectorAll('[data-cd]').forEach(el => {
    const left = +el.dataset.cd - srvNow();
    if (left <= 0 && !el.dataset.fired) { el.dataset.fired = 1; setTimeout(() => refresh(), 1200); }
    el.innerHTML = el.dataset.plain ? cdText(left) : cd(left);
  });
}, 1000);

// ---------- icons ----------
const IC = {
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18M9 3v18"/></svg>',
  ranks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 21V11M16 21V7M12 21V3M4 21h16"/></svg>',
  squads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M15.5 14.6c2.6.2 4.5 1.9 5.2 4.9"/></svg>',
  trip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.2 4.2-6.5 8-6.5s7 2.3 8 6.5"/></svg>',
  wa: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};

// ---------- boot ----------
const params = new URLSearchParams(location.search);
if (params.get('ref')) ls.set('ref', params.get('ref').toUpperCase());
if (params.get('squad')) ls.set('pendingSquad', params.get('squad').toUpperCase());
if (params.get('src')) ls.set('src', params.get('src'));
if (params.get('duel')) ls.set('pendingDuel', params.get('duel').toUpperCase());
if (params.toString()) history.replaceState(null, '', '/');

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });
window.addEventListener('appinstalled', () => track('installed'));
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

async function boot() {
  try { const c = await fetch('/api/config').then(r => r.json()); S.skew = c.now - Date.now(); S.cfg = c; } catch {}
  if (!S.token) return renderOnboarding();
  try {
    await loadMe();
    const pend = ls.get('pendingSquad', null);
    if (pend) { ls.set('pendingSquad', null); try { const r = await api('/api/squad/join', { code: pend }); toast(`You joined ${r.name}`); S.squad = r.code; await loadMe(); } catch (e) { toast(e.message); } }
    track('app_open', { standalone: matchMedia('(display-mode: standalone)').matches });
    renderApp();
    const pd = ls.get('pendingDuel', null);
    if (pd) { ls.set('pendingDuel', null); try { await api('/api/duel/join', { code: pd }); duelLobby(pd); } catch (e) { toast(e.message); } }
  } catch (e) { if (e.message !== 'auth') root.innerHTML = `<div class="wrap"><div class="card"><h3>Can't connect</h3><p>${esc(e.message)}</p><button class="btn btn-gold" onclick="location.reload()">Try again</button></div></div>`; }
}
async function loadMe() { S.me = await api('/api/me'); S.skew = S.me.now - Date.now(); if (S.me.user.lang && S.me.user.lang !== S.lang) { S.lang = S.me.user.lang; ls.set('lang', S.lang); } }
async function refresh() { if (!S.token) return; try { await loadMe(); if (!$('.overlay')) renderApp(); } catch {} }

// heartbeat for time-spent analytics
let lastBeat = Date.now();
setInterval(() => { if (S.token && !document.hidden) { api('/api/hb', { secs: 15 }).catch(() => {}); lastBeat = Date.now(); } }, 15000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.token) { const secs = Math.round((Date.now() - lastBeat) / 1000); if (secs > 2) api('/api/hb', { secs: Math.min(secs, 15) }).catch(() => {}); }
  else if (S.token) { lastBeat = Date.now(); refresh(); }
});

// ---------- landing illustration: Lagos lagoon on a Detty December night (pure SVG, no photos) ----------
function lagosNight() {
  const BLD = [[0, 26, 70], [24, 18, 96], [40, 30, 62], [68, 22, 122], [88, 34, 86], [120, 16, 142], [134, 28, 100], [160, 40, 72], [198, 20, 112], [216, 30, 156], [244, 24, 92], [266, 36, 126], [300, 20, 82], [318, 30, 106], [346, 22, 136], [366, 36, 76]];
  const base = 236;
  const blds = BLD.map(([x, w, h], i) => `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="#151E52"/><rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="url(#ln-win${i % 3})"/>${i % 4 === 1 ? `<rect x="${x + w * .2}" y="${base - h - 6}" width="${w * .6}" height="6" fill="#151E52"/>` : ''}`).join('');
  // bunting along a sagging rope
  const flags = Array.from({ length: 17 }, (_, i) => { const t = (i + .5) / 17, x = -10 + 420 * t, y = 6 + 2 * t * (1 - t) * 52; return `<path d="M${(x - 9).toFixed(1)} ${y.toFixed(1)} L${(x + 9).toFixed(1)} ${(y + .5).toFixed(1)} L${x.toFixed(1)} ${(y + 17).toFixed(1)}Z" fill="${i % 2 ? '#fff' : '#008751'}"/>`; }).join('');
  const stars = Array.from({ length: 34 }, (_, i) => `<circle class="ln-star" style="animation-delay:${(i * .37) % 3}s" cx="${(i * 97) % 400}" cy="${18 + (i * 53) % 120}" r="${i % 5 ? .9 : 1.5}" fill="#fff"/>`).join('');
  const burst = (cx, cy, col, d, r = 22) => `<g class="ln-fw" style="animation-delay:${d}s;transform-origin:${cx}px ${cy}px">${Array.from({ length: 14 }, (_, k) => { const a = k / 14 * Math.PI * 2; return `<line x1="${cx + Math.cos(a) * r * .35}" y1="${cy + Math.sin(a) * r * .35}" x2="${cx + Math.cos(a) * r}" y2="${cy + Math.sin(a) * r}" stroke="${col}" stroke-width="2" stroke-linecap="round"/><circle cx="${cx + Math.cos(a) * (r + 4)}" cy="${cy + Math.sin(a) * (r + 4)}" r="1.4" fill="${col}"/>`; }).join('')}</g>`;
  const cables = [150, 175, 200, 225, 250, 270, 330, 350, 375, 400, 425].map((x, i) => `<line x1="300" y1="${126 + i * 2}" x2="${x}" y2="229" stroke="#DCE3F5" stroke-width=".7" opacity=".75"/>`).join('');
  const bulbs = Array.from({ length: 41 }, (_, i) => `<circle class="ln-bulb" style="animation-delay:${(i % 6) * .25}s" cx="${i * 10}" cy="227" r="1.3" fill="${i % 3 ? '#F5B83D' : '#7CF0B0'}"/>`).join('');
  const piers = Array.from({ length: 11 }, (_, i) => `<rect x="${i * 40 + 14}" y="235" width="6" height="12" fill="#2A3570"/>`).join('');
  const palmUnused = (x, s, flip) => `<g transform="translate(${x} 320) scale(${flip ? -s : s} ${s})" fill="#070C26"><path d="M0 0 C 4 -40 6 -80 14 -112 L 20 -110 C 13 -78 10 -40 8 0Z"/>${[[-60, -96], [-40, -128], [10, -140], [55, -122], [70, -92], [30, -80], [-20, -78]].map(([dx, dy]) => `<path d="M16 -112 Q ${16 + dx * .5} ${-112 + (dy + 112) * .2 - 18} ${16 + dx} ${dy - 0}" stroke="#070C26" stroke-width="7" fill="none" stroke-linecap="round"/>`).join('')}</g>`;
  return `<div class="scene" role="img" aria-label="Illustration: Lagos lagoon at night with fireworks, a lit bridge and a yellow danfo crossing it">
    <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="ln-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070D33"/><stop offset=".55" stop-color="#1B2A78"/><stop offset="1" stop-color="#5B3A86"/></linearGradient>
        <radialGradient id="ln-glow" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#F59B4B" stop-opacity=".55"/><stop offset="1" stop-color="#F59B4B" stop-opacity="0"/></radialGradient>
        <linearGradient id="ln-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A2A6E"/><stop offset="1" stop-color="#070C2B"/></linearGradient>
        ${[[1, .7], [2, .3], [3, .5]].map(([n, o], i) => `<pattern id="ln-win${i}" width="${6 + i}" height="9" patternUnits="userSpaceOnUse"><rect x="1.5" y="2" width="2.4" height="3.2" fill="#FFD97A" opacity="${o}"/></pattern>`).join('')}
        <clipPath id="ln-wclip"><rect x="0" y="238" width="400" height="82"/></clipPath>
      </defs>
      <rect width="400" height="240" fill="url(#ln-sky)"/>
      <rect y="120" width="400" height="120" fill="url(#ln-glow)"/>
      ${stars}
      <circle cx="352" cy="44" r="13" fill="#FFF3CF"/><circle cx="358" cy="39" r="12" fill="#0D1747"/>
      ${burst(84, 92, '#F5B83D', 0)}${burst(318, 98, '#7CF0B0', 1.1, 18)}${burst(205, 74, '#FFFFFF', 2, 26)}${burst(140, 128, '#FF7A59', 2.8, 14)}
      <path d="M-10 6 Q200 58 410 6" stroke="rgba(255,255,255,.55)" stroke-width="1" fill="none"/>${flags}
      <g>${blds}<line x1="231" y1="${base - 156}" x2="231" y2="${base - 176}" stroke="#151E52" stroke-width="2"/><circle class="ln-blink" cx="231" cy="${base - 177}" r="2" fill="#FF3B30"/></g>
      <rect y="236" width="400" height="84" fill="url(#ln-water)"/>
      <g clip-path="url(#ln-wclip)" opacity=".22"><g transform="translate(0 474) scale(1 -1)">${blds}</g></g>
      ${[[30, 262, 60], [150, 276, 44], [250, 258, 70], [90, 296, 50], [300, 290, 56]].map(([x, y, w], i) => `<rect class="ln-shim" style="animation-delay:${i * .6}s" x="${x}" y="${y}" width="${w}" height="1.6" rx=".8" fill="#F5B83D"/>`).join('')}
      <path d="M296 236 L298 120 L302 120 L304 236Z" fill="#DCE3F5"/><rect x="295" y="116" width="10" height="6" rx="1" fill="#DCE3F5"/>
      ${cables}
      ${piers}<rect x="0" y="229" width="400" height="6" fill="#C9D1E8"/><rect x="0" y="234" width="400" height="2" fill="#7C88B5"/>
      ${bulbs}
      <g class="ln-canoe"><path d="M150 288 Q175 296 214 288 L208 294 Q178 299 156 294Z" fill="#05091F"/><path d="M176 287 L178 271 L184 271 L186 287Z" fill="#05091F"/><circle cx="181" cy="267" r="4" fill="#05091F"/><path d="M174 264 L188 264 L181 259Z" fill="#05091F"/><line x1="190" y1="270" x2="206" y2="300" stroke="#05091F" stroke-width="1.6"/><path d="M150 300 Q182 304 214 300" stroke="#F5B83D" stroke-width=".8" opacity=".35" fill="none"/></g>
      <g class="ln-bus"><rect x="0" y="-15" width="40" height="13" rx="3" fill="#1F4FA8"/><rect x="3" y="-13" width="34" height="5" rx="1" fill="#FFE7A6" opacity=".85"/><rect x="0" y="-6" width="40" height="2" fill="#E5483C"/><circle cx="8" cy="-1.5" r="2.6" fill="#111"/><circle cx="32" cy="-1.5" r="2.6" fill="#111"/><circle cx="1" cy="-4" r="1.6" fill="#FF3B30"/></g>
      <g class="ln-danfo"><rect x="0" y="-16" width="34" height="14" rx="3" fill="#F2B705"/><rect x="4" y="-14" width="22" height="5" rx="1" fill="#1d2433"/><rect x="0" y="-8" width="34" height="1.6" fill="#111"/><rect x="0" y="-5" width="34" height="1.6" fill="#111"/><rect x="28" y="-14" width="5" height="6" rx="1" fill="#1d2433"/><circle cx="7" cy="-1.5" r="2.6" fill="#111"/><circle cx="27" cy="-1.5" r="2.6" fill="#111"/><circle cx="34" cy="-6" r="1.8" fill="#FFF6C8"/><path d="M35 -6 L60 -11 L60 -1Z" fill="#FFF6C8" opacity=".25"/></g>
    </svg>
    <div class="scene-door"><span>1</span>Dec · 7pm</div>
    <span class="scene-chip c1">🍚 Jollof wars</span><span class="scene-chip c2">🎶 Afrobeats</span><span class="scene-chip c3">🎬 Nollywood</span><span class="scene-chip c4">🗣️ Pidgin &amp; slang</span>
  </div>`;
}

// ---------- onboarding ----------
async function renderOnboarding() {
  const ref = ls.get('ref', null), sq = ls.get('pendingSquad', null), dl = ls.get('pendingDuel', null);
  let invited = null;
  if (ref || sq || dl) { try { invited = await fetch(`/api/ref/${ref || '-'}?squad=${sq || ''}&duel=${dl || ''}`).then(r => r.json()); } catch {} }
  const P = PHOTOS;
  root.innerHTML = `
  <div class="onb">
    <div class="onb-top"><div class="wordmark"><b>25</b><span>Days of Naija</span></div></div>
    ${lagosNight()}
    <div class="onb-hero">
      <h1><span class="n25">25</span>Days of Naija</h1>
      <p class="lede">A new quiz drops every evening at 7pm from 1 to 25 December. Music, food, Nollywood, slang, and the questions only your mummy can answer.</p>
    </div>
    <form class="form" id="reg" novalidate>
      ${invited && (invited.inviter || invited.squad || invited.duel) ? `<div class="invited">${invited.duel ? '⚔️' : '🎉'} <span>${invited.duel ? `<b>${esc(invited.duel.by)}</b> challenged you to <b>${invited.duel.type === 'drive' ? 'a Lagos drive race' : invited.duel.type === 'abuja' ? 'Do you know Abuja?' : 'Do you know Lagos?'}</b> Sign up to accept.` : invited.squad ? `You've been invited to the squad <b>${esc(invited.squad)}</b>` : `<b>${esc(invited.inviter)}</b> invited you. Beat their score!`}${invited.inviter ? ' You get <b>+100 bonus coins</b>.' : ''}</span></div>` : ''}
      <div class="err hidden" id="err"></div>
      <div class="f"><label for="phone">Phone number</label>
        <div class="phone-wrap"><span>🇳🇬</span><input id="phone" inputmode="tel" autocomplete="tel" placeholder="0803 123 4567" maxlength="16" required></div></div>
      <div class="f"><label for="nick">Nickname</label><input id="nick" maxlength="18" autocomplete="nickname" placeholder="What should the leaderboard call you?" required></div>
      <div class="f"><label for="state">Your state</label><select id="state" required><option value="">Pick your state</option>${STATES.map(s => `<option>${s}</option>`).join('')}</select></div>
      <div class="f"><label for="school">School or alumni (optional)</label><select id="school"><option value="">Skip</option>${SCHOOLS.map(s => `<option>${s}</option>`).join('')}</select>
        <div class="hint">Your school battles other schools on the leaderboard.</div></div>
      <button class="btn btn-gold" id="go" type="submit">${t('start')}</button>
      <div class="hint" style="text-align:center;margin-top:12px">No password. Your number is your login and where we send airtime prizes. Already playing? Use the same number and nickname.</div>
    </form>
    <div class="how">
      <div><span class="e">🔥</span><span><b>Keep your streak</b>Play every day. Miss one and your streak resets, unless you have a saver.</span></div>
      <div><span class="e">🏆</span><span><b>Win airtime</b>${PRIZE_TEXT}.</span></div>
      <div><span class="e">🤝</span><span><b>Battle your people</b>Squads, states and schools fight for the top spot.</span></div>
    </div>
    <div class="strip-head"><h2>From Lasgidi to Abuja</h2><span>Swipe</span></div>
    <div class="strip">${P.slice(5).map(p => photoTile(p, 'wide')).join('')}</div>
    <p class="foot">Free to play. Made in Nigeria. <a href="#" id="credits">Photo credits</a></p>
  </div>`;
  $('#credits').onclick = (e) => { e.preventDefault(); sheet(`<h3>Photo credits</h3><p>Thank you to these photographers.</p><div class="rules">${PHOTOS.map(p => `<div><span class="e">📷</span><span><b>${esc(p.tag)}</b><span><a href="${p.src}" target="_blank" rel="noopener">${esc(p.by)}</a></span></span></div>`).join('')}</div><p>Landmark photos come from Wikimedia Commons under their stated licences (Creative Commons or public domain). Tap a credit to see the original.</p><button class="btn btn-gold" onclick="this.closest('.sheet-bg').remove()">Close</button>`); };
  $('#reg').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#err'), btn = $('#go'); err.classList.add('hidden');
    const body = { phone: $('#phone').value, nickname: $('#nick').value, state: $('#state').value, school: $('#school').value, ref: ls.get('ref', null), squad: ls.get('pendingSquad', null), duel: ls.get('pendingDuel', null), src: ls.get('src', null), lang: S.lang };
    if (!body.state) { err.textContent = 'Pick your state so you can battle for it.'; err.classList.remove('hidden'); return; }
    btn.disabled = true; btn.textContent = 'One moment…';
    try {
      const r = await api('/api/register', body);
      S.token = r.token; ls.set('token', r.token); ls.set('pendingSquad', null);
      await loadMe(); beep('win'); renderApp(); scrollTo(0, 0);
      const pd = ls.get('pendingDuel', null); if (pd) { ls.set('pendingDuel', null); try { await api('/api/duel/join', { code: pd }); setTimeout(() => duelLobby(pd), 600); } catch {} }
      toast(r.returning ? `Welcome back, ${S.me.user.nickname}` : `Welcome, ${S.me.user.nickname}! 🎉`);
      if (!r.returning && !ls.get('pendingDuel', null)) setTimeout(howTo, 700);
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); btn.disabled = false; btn.textContent = t('start'); }
  });
}

// ---------- app shell ----------
function renderApp() {
  const u = S.me.user;
  const live = S.me.days.find(d => d.status === 'live');
  root.innerHTML = `
  <header class="top">
    <div class="wordmark"><b>25</b><span>Days of Naija</span></div>
    <span class="pill ${u.streak ? 'flame' : 'cold'}" title="Streak">🔥 ${u.streak}</span>
    <span class="pill" title="Points">⭐ ${u.points.toLocaleString()}</span>
    <span class="pill coin" title="Coins to spend on trips and power-ups">🪙 ${(u.coins || 0).toLocaleString()}</span>
  </header>
  <main id="view"></main>
  <nav class="tabbar">
    ${['home', 'trip', 'ranks', 'squads', 'me'].map(k => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}" aria-label="${t(k === 'home' ? 'play' : k)}">${IC[k === 'home' ? 'play' : k]}${t(k === 'home' ? 'play' : k)}${k === 'home' && live && S.tab !== 'home' ? '<span class="dot"></span>' : ''}</button>`).join('')}
  </nav>`;
  root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; beep('tap'); track('tab', { tab: S.tab }); renderApp(); scrollTo(0, 0); });
  ({ home: viewHome, trip: viewTrip, ranks: viewRanks, squads: viewSquads, me: viewMe })[S.tab]();
}

// ---------- home ----------
function viewHome() {
  const m = S.me, days = m.days, live = days.find(d => d.status === 'live');
  const liveDay = m.live, todayPlayed = liveDay && days[liveDay].status === 'played';
  let hero;
  if (live) {
    hero = `<span class="daytag">${live.day === 26 ? t('crossover') : (live.day === 25 ? 'Christmas Day' : `December ${live.day}`)}</span>
      <h1>${t('dayOpen', { d: live.day === 26 ? '26' : live.day })}</h1><p>${t('dayOpenSub')}</p>
      <button class="btn btn-gold" data-play="${live.day}">${t('playDay', { d: live.day })}</button>`;
  } else if (todayPlayed) {
    const d = days[liveDay];
    hero = `<span class="daytag">Day ${liveDay} done</span><h1>${t('playedTitle', { c: d.correct })}</h1>
      ${m.next ? `<div class="count" data-cd="${m.nextAt}">${cd(m.nextAt - srvNow())}</div><p>${m.next === 26 ? t('lastPlayed') : t('playedSub', { n: m.next })}</p>` : `<p>${t('wrapSub')}</p>`}
      <div class="btn-row"><button class="btn btn-wa" data-result="${liveDay}">${IC.wa}${t('shareWa')}</button></div>`;
  } else if (m.next) {
    const pre = m.next === 1;
    hero = `<span class="daytag">${pre ? 'Starts 1 December' : `Day ${m.next} loading`}</span>
      <h1>${pre ? t('preTitle') : t('opensIn', { d: m.next })}</h1>
      <div class="count" data-cd="${m.nextAt}">${cd(m.nextAt - srvNow())}</div>
      <p>${pre ? t('preSub') : 'A new door opens at 7pm. Set a reminder so you never break your streak.'}</p>
      <button class="btn btn-gold" data-play="0">Play the warm-up</button>`;
  } else {
    hero = `<span class="daytag">Season over</span><h1>${t('wrapTitle')}</h1><p>You finished with ${m.user.points.toLocaleString()} points${m.user.rank ? ` and ranked #${m.user.rank}` : ''}. ${t('wrapSub')}</p>
      <button class="btn btn-gold" data-tab-go="ranks">See final ranks</button>`;
  }
  const doors = days.slice(1, 26).map(d => {
    const sub = d.status === 'live' ? 'Play' : d.status === 'played' ? `${d.correct}/7` : d.status === 'missed' ? 'Missed' : d.status === 'practiced' ? `${d.correct}/7` : '';
    return `<button class="door ${d.status} ${d.status === 'played' && d.correct === 7 ? 'perfect' : ''}" data-door="${d.day}" aria-label="Day ${d.day}, ${d.status}">
      ${d.day === 25 ? '<span class="star">⭐</span>' : ''}<span class="num">${d.day}</span>${sub ? `<span class="sub">${sub}</span>` : d.status === 'locked' ? `<span class="sub">${IC.lock}</span>` : ''}</button>`;
  }).join('');
  const x = days[26];
  const savers = m.user.savers;
  $('#view').innerHTML = `
  <div class="wrap">
    ${(m.inbox || []).length ? `<section class="inbox"><div class="ib-head"><b>🔔 For you</b><button id="ibSeen">Clear</button></div>${m.inbox.map(i => `<div class="ib-row"><span>${esc(i.text)}</span>${i.link ? `<button class="btn btn-gold ib-go" data-duel="${esc(i.link)}">Open</button>` : ''}</div>`).join('')}</section>` : ''}
    <section class="hero">${hero}</section>
    ${m.rivalry ? `<div class="rival"><span class="vs">⚔️</span><span>${t('ahead', { a: `<strong>${esc(m.rivalry.leader)}</strong>`, b: `<strong>${esc(m.rivalry.chaser)}</strong>` })}${m.user.state && m.user.state !== m.rivalry.leader ? `. Help ${esc(m.user.state)} climb!` : ''}</span></div>` : ''}
    <div class="section-title"><h2>${t('calendar')}</h2><span>${t('calendarSub')}</span></div>
    <div class="doors">${doors}</div>
    <button class="crossover ${x.status}" data-door="26"><span>🎆 ${t('crossover')}<br><span class="sub">${x.status === 'played' ? `${x.correct}/7` : x.status === 'live' ? 'Play now' : t('crossSub')}</span></span><span>${x.status === 'locked' ? IC.lock : '›'}</span></button>
    <button class="warmup" data-play="0"><span class="ico">🎯</span><span><b>${t('warmTitle')}</b><span>${days[0].status === 'done' ? `Best: ${days[0].correct}/7. ` : ''}${t('warmSub')}</span></span></button>
    <section class="card invite">
      <h3>${t('inviteTitle')}</h3><p>${t('inviteSub')}</p>
      <div class="savers" title="Streak savers">${[0, 1, 2].map(i => `<i class="${i < savers ? 'on' : ''}">🛟</i>`).join('')}<span style="align-self:center;font-weight:700;font-size:14px;margin-left:4px">${savers}/3 streak savers</span></div>
      <button class="btn btn-wa" id="invWa">${IC.wa}${t('invite')}</button>
    </section>
    ${remindCard()}
    <p class="foot"><a href="#" id="howLink">How points work</a></p>
  </div>`;
  bindCommon();
  $('#invWa').onclick = () => inviteSheet();
  document.querySelectorAll('[data-duel]').forEach(b => b.onclick = () => duelLobby(b.dataset.duel));
  if ($('#ibSeen')) $('#ibSeen').onclick = async () => { await api('/api/inbox/seen', {}).catch(() => {}); S.me.inbox = []; renderApp(); };
  $('#howLink').onclick = (e) => { e.preventDefault(); howTo(); };
}
function remindCard() {
  const u = S.me.user; const standalone = matchMedia('(display-mode: standalone)').matches;
  if (u.waOptin && (standalone || !S.installEvt)) return '';
  return `<section class="card">
    ${!u.waOptin ? `<div class="toggle-row"><span><b>${t('reminders')}</b><small>So you never break your streak</small></span><button class="switch" data-wa aria-label="WhatsApp reminders"></button></div>` : ''}
    ${S.installEvt && !standalone ? `<div class="toggle-row"><span><b>Add to home screen</b><small>Opens like an app, uses little data</small></span><button class="btn btn-ink" style="width:auto;padding:10px 14px;font-size:15px" data-install>Add</button></div>` : ''}
  </section>`;
}
function bindCommon() {
  document.querySelectorAll('[data-play]').forEach(b => b.onclick = () => startRound(+b.dataset.play));
  document.querySelectorAll('[data-result]').forEach(b => b.onclick = () => openResult(+b.dataset.result));
  document.querySelectorAll('[data-tab-go]').forEach(b => b.onclick = () => { S.tab = b.dataset.tabGo; renderApp(); });
  document.querySelectorAll('[data-door]').forEach(b => b.onclick = () => {
    const d = S.me.days[+b.dataset.door];
    if (d.status === 'locked') { buzz(30); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return toast(`Day ${d.day} opens ${new Date(d.unlockAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} at 7pm`); }
    if (d.status === 'live') return startRound(d.day);
    if (d.status === 'played') return openResult(d.day);
    toast(t('practice')); startRound(d.day);
  });
  document.querySelectorAll('[data-wa]').forEach(b => b.onclick = async () => {
    const on = !b.classList.contains('on'); b.classList.toggle('on', on);
    await api('/api/settings', { waOptin: on }).catch(() => {}); S.me.user.waOptin = on; toast(on ? "Done. We'll message you at 7pm." : 'Reminders off');
  });
  document.querySelectorAll('[data-install]').forEach(b => b.onclick = async () => {
    if (!S.installEvt) return toast('Use your browser menu and tap "Add to Home screen"');
    track('install_prompt'); S.installEvt.prompt(); await S.installEvt.userChoice.catch(() => {}); S.installEvt = null; renderApp();
  });
}

// ---------- game ----------
let G = null;
async function startRound(day) {
  beep('tap');
  try {
    const r = await api('/api/round/start', { day });
    if (r.alreadyPlayed) return openResult(day);
    G = { playId: r.playId, day, official: r.official, total: r.total, results: [], index: r.index, combo: 0 };
    for (let i = 0; i < r.index; i++) G.results.push(null);
    const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'game';
    ov.innerHTML = `<div class="inner"><div class="g-top"><button class="g-close" aria-label="Close">✕</button><div class="g-prog">${Array.from({ length: r.total }, () => '<i></i>').join('')}</div></div><div class="ticker" id="tick"></div><div id="qbox"></div></div>`;
    if (r.official) { const live = async () => { if (!G || G.playId !== r.playId) return; try { const l = await api('/api/live/' + day); const el = $('#tick'); if (el) el.innerHTML = l.rows.length ? l.rows.map(f => `<span class="tk">${esc(f.n)} <b>${f.correct}/${f.answered}</b>${f.done ? ' 🏁' : ''}</span>`).join('') : ''; } catch {} setTimeout(live, 3500); }; live(); }
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    ov.querySelector('.g-close').onclick = () => { if (confirm('Leave this round? The timer keeps running on unanswered questions.')) closeGame(); };
    nextQ();
  } catch (e) { toast(e.message); }
}
function closeGame() { clearTimers(); $('#game')?.remove(); document.body.style.overflow = ''; G = null; refresh(); }
function clearTimers() { if (!G) return; clearTimeout(G.to); clearInterval(G.iv); }
function paintProg() { document.querySelectorAll('.g-prog i').forEach((el, i) => { el.className = G.results[i] === true ? 'ok' : G.results[i] === false ? 'no' : i === G.results.length ? 'cur' : ''; }); }
async function nextQ() {
  try {
    const q = await api('/api/round/next', { playId: G.playId });
    G.q = q; G.answered = false; paintProg();
    $('#qbox').innerHTML = `
      ${!G.official ? `<div class="mummy-note" style="background:rgba(255,255,255,.08);color:var(--mist)">${t('practice')}</div>` : ''}
      <div class="g-meta"><span class="chip ${q.mummy ? 'mummy' : ''}">${q.mummy ? '👵🏾 Ask Mummy · x2' : catIcon(q.category) + ' ' + esc(q.category)}</span><span class="timer" id="tm">${Math.ceil(q.remainingMs / 1000)}</span></div>
      <div class="tbar"><i id="tb"></i></div>
      <div class="powers" id="pw"></div>
      ${q.mummy ? `<div class="mummy-note">${t('mummyNote')}</div>` : ''}
      <div class="question">${esc(q.question)}</div>
      <div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div class="feedback" id="fb"></div>`;
    G.limit = q.limitMs; G.end = Date.now() + q.remainingMs; startTimer();
    const coins = S.me.user.coins || 0;
    $('#pw').innerHTML = [['fifty', '✂️', '50/50', 80], ['time', '⏱️', '+5 sec', 50]].map(([k, e, l, c]) => `<button class="pw" data-pw="${k}" ${q.used[k] || coins < c ? 'disabled' : ''}><span>${e}</span>${l}<small>${q.used[k] ? 'Used' : c + ' 🪙'}</small></button>`).join('');
    document.querySelectorAll('[data-pw]').forEach(b => b.onclick = () => powerUp(b.dataset.pw, b));
    document.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.i));
  } catch (e) { toast(e.message); closeGame(); }
}
function startTimer() {
  clearTimeout(G.to); clearInterval(G.iv);
  const tb = $('#tb'), left = Math.max(0, G.end - Date.now());
  tb.style.transition = 'none'; tb.style.transform = `scaleX(${left / G.limit})`;
  requestAnimationFrame(() => requestAnimationFrame(() => { tb.style.transition = `transform ${left}ms linear`; tb.style.transform = 'scaleX(0)'; }));
  const tick = () => { const s = Math.ceil((G.end - Date.now()) / 1000); const el = $('#tm'); if (!el) return; el.textContent = Math.max(0, s); el.classList.toggle('hot', s <= 3); return s; };
  tick();
  G.iv = setInterval(() => { const s = tick(); if (s <= 3 && s > 0) beep('tick'); }, 1000);
  G.to = setTimeout(() => answer(-1), left);
}
async function powerUp(kind, btn) {
  if (!G || G.answered) return;
  btn.disabled = true;
  try {
    const r = await api('/api/round/lifeline', { playId: G.playId, kind });
    coinsTo(r.coins); beep('ok'); track('reaction', { kind: 'powerup_' + kind });
    btn.querySelector('small').textContent = 'Used';
    if (r.hide) { r.hide.forEach(i => { const o = document.querySelector(`.opt[data-i="${i}"]`); o.classList.add('gone'); o.disabled = true; }); popEmoji('✂️'); }
    if (r.addMs) { G.end += r.addMs; G.limit += r.addMs; startTimer(); popEmoji('⏱️'); }
  } catch (e) { toast(e.message); btn.disabled = false; }
}
function catIcon(c) { return { Music: '🎵', Slang: '🗣️', Food: '🍲', Nollywood: '🎬', Naija: '🇳🇬', Sports: '⚽' }[c] || '❓'; }
async function answer(i) {
  if (!G || G.answered) return; G.answered = true; clearTimers();
  const btns = document.querySelectorAll('.opt'); btns.forEach(b => b.disabled = true);
  if (i >= 0) btns[i].style.transform = 'scale(.98)';
  const tb = $('#tb'); if (tb) { const cs = getComputedStyle(tb).transform; tb.style.transition = 'none'; tb.style.transform = cs; }
  try {
    const r = await api('/api/round/answer', { playId: G.playId, choice: i });
    G.results.push(r.correct); paintProg();
    btns.forEach((b, k) => { if (k === r.correctIndex) b.classList.add('right'); else if (k === i) b.classList.add('wrong'); else b.classList.add('dim'); });
    const fb = $('#fb');
    G.combo = r.correct ? G.combo + 1 : 0;
    const combo = G.combo >= 5 ? 'Unstoppable! ⚡⚡' : G.combo >= 3 ? `${G.combo} in a row, you're on fire 🔥🔥` : G.combo === 2 ? '2 in a row 🔥' : '';
    const crowd = r.pct >= 80 ? 'Everybody knew this one 😅' : r.pct <= 30 ? (r.correct ? 'Only real ones got this 👑' : 'This one was tough for everyone 😮‍💨') : '';
    if (r.correct) { beep('ok'); buzz(25); popEmoji(G.combo >= 3 ? '🔥' : pick(RX.ok)); fb.innerHTML = `<div class="big">${t('correct')} ${r.points ? `<span class="pop">+${r.points}</span>` : ''}</div>${combo ? `<div class="combo">${combo}</div>` : ''}<div class="pct">${t('pct', { p: r.pct })}${crowd ? ' · ' + crowd : ''}</div>`; }
    else { beep('no'); buzz([40, 40, 40]); popEmoji(r.timedOut ? pick(RX.late) : pick(RX.no)); $('.opts').classList.add('shake'); fb.innerHTML = `<div class="big">${r.timedOut ? t('timeout') : t('wrong')}</div><div class="pct">${t('pct', { p: r.pct })}${crowd ? ' · ' + crowd : ''}</div>`; }
    setTimeout(() => { if (!G) return; if (r.done) showResult(r.summary); else nextQ(); }, r.correct ? 1300 : 1900);
  } catch (e) { toast(e.message); G.answered = false; }
}

// ---------- result ----------
async function openResult(day) {
  try { const r = await api('/api/round/result?day=' + day); showResult(r.summary, true); } catch (e) { toast(e.message); }
}
function faceFor(c) { return c === 7 ? '🤩' : c >= 5 ? '😎' : c >= 3 ? '🙂' : '😅'; }
function verdict(c) { return c === 7 ? t('v7') : c >= 5 ? t('v5') : c >= 3 ? t('v3') : t('v0'); }
function showResult(s, revisit) {
  clearTimers(); $('#game')?.remove();
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'result';
  document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const badges = S.me.allBadges;
  const next = S.me.nextAt && S.me.next ? `<div class="next-hook">Day ${S.me.next} opens in <b data-cd="${S.me.nextAt}" data-plain="1">${cdText(S.me.nextAt - srvNow())}</b></div>` : '';
  ov.innerHTML = `<div class="inner">
    <div class="g-top"><button class="g-close" aria-label="Close">✕</button><span style="font-weight:800">${s.day === 0 ? 'Warm-up' : s.day === 26 ? 'Crossover round' : `Day ${s.day}`}${s.official ? '' : ' · practice'}</span></div>
    <div class="face" aria-hidden="true">${faceFor(s.correct)}<span>${s.correct >= 3 ? '👍🏾' : '🤝🏾'}</span></div>
    <div class="res-score"><div class="num">${s.correct}<small>/${s.total}</small></div><div class="verdict">${verdict(s.correct)}</div></div>
    <div class="res-grid">${s.grid.map((g, i) => `<i class="${g ? '' : 'x'}">${i === 6 ? '👵🏾' : ''}</i>`).join('')}</div>
    ${s.official ? `<div class="res-stats">
      <div><b>+${s.points}</b><span>points${s.perfectBonus ? ' incl. perfect bonus' : ''}</span></div>
      <div><b>🔥 ${s.streak}</b><span>${t('streak')}</span></div>
      <div><b>#${s.dayRank || '–'}</b><span>of ${s.dayPlayers || 1} today</span></div></div>` : `<p style="text-align:center;color:var(--mist);margin:0 0 16px">${t('practice')}</p>`}
    ${(s.newBadges || []).map(b => `<div class="newbadge"><span class="e">${badges[b][0]}</span><span><b>New badge: ${badges[b][1]}</b><small>${badges[b][2]}</small></span></div>`).join('')}
    ${s.saversUsed ? `<div class="newbadge"><span class="e">🛟</span><span><b>Streak saved!</b><small>You used ${s.saversUsed} streak saver${s.saversUsed > 1 ? 's' : ''}.</small></span></div>` : ''}
    ${next}
    <div class="res-actions">
      <button class="btn btn-wa" id="shWa">${IC.wa}${t('shareWa')}${S.me.sharedToday ? '' : ' · +25 🪙'}</button>
      <div class="btn-row"><button class="btn btn-ghost" id="shInv">🤝 Challenge friends</button><button class="btn btn-ghost" id="shTxt">💬 Send as text</button></div>
    </div></div>`;
  ov.querySelector('.g-close').onclick = () => { ov.remove(); document.body.style.overflow = ''; refresh(); };
  $('#shWa').onclick = () => shareImage(s);
  $('#shTxt').onclick = () => shareResult(s, 'whatsapp_text');
  $('#shInv').onclick = () => inviteSheet();
  track('result_view', { day: s.day, revisit: !!revisit });
  if (!revisit) {
    if (s.correct === 7) { confetti(180); beep('win'); rain(['🎉', '👑', '💯', '🔥', '🇳🇬']); }
    else if (s.correct >= 5) { beep('win'); rain(['👍🏾', '👏🏾', '🔥', '😎'], 16); }
    else if ((s.newBadges || []).length) beep('win');
  }
}
const myLink = () => `${location.origin}/?ref=${S.me.user.refCode}`;
function shareText(s) {
  const grid = s.grid.map(g => g ? '🟩' : '🟥').join('');
  const label = s.day === 0 ? 'Warm-up' : s.day === 26 ? 'Crossover round' : `Day ${s.day}`;
  return `25 Days of Naija 🇳🇬 ${label}\n${grid}\n${s.correct}/7${s.official && s.streak ? ` · 🔥 ${s.streak}-day streak` : ''}\nCan you beat me? ${myLink()}`;
}
async function shareResult(s, ch) {
  track('share', { channel: ch, day: s.day, correct: s.correct }); bonusCheck();
  window.open('https://wa.me/?text=' + encodeURIComponent(shareText(s)), '_blank');
}
async function bonusCheck() {
  if (S.me.sharedToday) return; S.me.sharedToday = true;
  setTimeout(async () => { await loadMe().catch(() => {}); toast('+25 points for sharing today 🙌'); }, 900);
}
async function shareFile(blob, name, text, channel, meta) {
  const file = new File([blob], name, { type: 'image/png' });
  track('share', { channel, ...meta });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  toast('Image saved. Opening WhatsApp, attach the image from your gallery 📎');
  setTimeout(() => window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'), 900);
  return true;
}
async function shareImage(s) {
  const blob = await drawCard(s);
  if (await shareFile(blob, `naija25-day${s.day}.png`, shareText(s), 'image', { day: s.day, correct: s.correct })) bonusCheck();
}
async function drawCard(s) {
  try { await document.fonts.load('800 100px "Bricolage Grotesque"'); } catch {}
  const W2 = 1080, H = 1920, c = document.createElement('canvas'); c.width = W2; c.height = H; const x = c.getContext('2d');
  const F = (w, z) => `${w} ${z}px "Bricolage Grotesque", system-ui, sans-serif`;
  x.fillStyle = '#101C4A'; x.fillRect(0, 0, W2, H);
  const g = x.createRadialGradient(W2 / 2, 0, 50, W2 / 2, 0, 1100); g.addColorStop(0, '#2C44A0'); g.addColorStop(1, 'rgba(16,28,74,0)'); x.fillStyle = g; x.fillRect(0, 0, W2, H);
  x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 4;
  for (let yy = 40; yy < H; yy += 80) for (let xx = 40; xx < W2; xx += 80) { x.beginPath(); x.arc(xx, yy, 14, 0, 7); x.stroke(); }
  const rr = (X, Y, w, h, r, col) => { x.fillStyle = col; x.beginPath(); x.roundRect(X, Y, w, h, r); x.fill(); };
  rr(90, 140, 120, 120, 32, '#F5B83D'); x.fillStyle = '#101C4A'; x.font = F(800, 64); x.textAlign = 'center'; x.fillText('25', 150, 222);
  x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = F(800, 64); x.fillText('Days of Naija', 240, 222);
  x.fillStyle = '#B9C6F2'; x.font = F(700, 60); x.fillText(s.day === 0 ? 'Warm-up round' : s.day === 26 ? 'Crossover round' : `Day ${s.day} of 25`, 90, 470);
  x.fillStyle = '#F5B83D'; x.font = F(800, 380); x.fillText(String(s.correct), 70, 820);
  const wNum = x.measureText(String(s.correct)).width; x.fillStyle = '#fff'; x.font = F(800, 160); x.fillText('/7', 80 + wNum, 820);
  x.font = F(800, 72); x.fillText(verdict(s.correct), 90, 950);
  const sz = 116, gap = 20, startX = (W2 - (7 * sz + 6 * gap)) / 2;
  s.grid.forEach((ok, i) => { rr(startX + i * (sz + gap), 1040, sz, sz, 28, ok ? '#17A35B' : '#E5483C'); });
  x.font = F(700, 54); x.fillStyle = '#fff'; let yL = 1330;
  if (s.official && s.streak) { x.fillText(`🔥 ${s.streak}-day streak`, 90, yL); yL += 90; }
  if (s.official && s.dayRank) { x.fillText(`🏆 #${s.dayRank} of ${Number(s.dayPlayers).toLocaleString()} today`, 90, yL); yL += 90; }
  if (S.me.user.state) x.fillText(`📍 Playing for ${S.me.user.state}`, 90, yL);
  rr(90, 1630, 900, 170, 40, '#F5B83D'); x.fillStyle = '#101C4A'; x.font = F(800, 62); x.fillText('Can you beat me?', 140, 1708);
  x.font = F(600, 40); x.fillText(location.host + '  ·  code ' + S.me.user.refCode, 140, 1768);
  return new Promise(res => c.toBlob(res, 'image/png'));
}

// ---------- sheets ----------
function sheet(html) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
  document.body.appendChild(bg); return bg;
}
const intlPhone = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '234' + d.slice(1); if (d.length === 10) d = '234' + d; return d; };
async function drawInvite() {
  try { await document.fonts.load('800 100px "Bricolage Grotesque"'); } catch {}
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const F = (w, z) => `${w} ${z}px "Bricolage Grotesque", system-ui, sans-serif`;
  x.fillStyle = '#101C4A'; x.fillRect(0, 0, 1080, 1350);
  x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 4; for (let yy = 40; yy < 1350; yy += 80) for (let xx = 40; xx < 1080; xx += 80) { x.beginPath(); x.arc(xx, yy, 14, 0, 7); x.stroke(); }
  const rr = (X, Y, w, h, r, col) => { x.fillStyle = col; x.beginPath(); x.roundRect(X, Y, w, h, r); x.fill(); };
  for (let i = 0; i < 10; i++) rr(90 + (i % 5) * 186, 120 + Math.floor(i / 5) * 186, 160, 160, 30, i === 0 ? '#F5B83D' : '#22378A');
  x.fillStyle = '#101C4A'; x.font = F(800, 90); x.textAlign = 'center'; x.fillText('1', 170, 232);
  x.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 1; i < 10; i++) x.fillText(String(i + 1), 170 + (i % 5) * 186, 232 + Math.floor(i / 5) * 186);
  x.textAlign = 'left'; x.fillStyle = '#B9C6F2'; x.font = F(700, 52); x.fillText(`${S.me.user.nickname} is challenging you`, 90, 620);
  x.fillStyle = '#F5B83D'; x.font = F(800, 150); x.fillText('25 Days', 80, 780); x.fillStyle = '#fff'; x.fillText('of Naija', 80, 920);
  x.font = F(600, 44); x.fillStyle = '#B9C6F2'; x.fillText('One quick Naija quiz every evening in December.', 90, 1010); x.fillText('Music, food, Nollywood, slang. Who sabi pass?', 90, 1070);
  rr(90, 1140, 900, 150, 40, '#F5B83D'); x.fillStyle = '#101C4A'; x.font = F(800, 56); x.fillText(`Join with code ${S.me.user.refCode}`, 140, 1212); x.font = F(600, 38); x.fillText(location.host, 140, 1262);
  return new Promise(res => c.toBlob(res, 'image/png'));
}
function inviteSheet() {
  const link = myLink();
  const text = `Join me on 25 Days of Naija 🇳🇬 A quick Naija quiz drops every evening in December, plus road trips and challenges. Sign up with my link and you get 100 bonus coins: ${link}`;
  const canPick = 'contacts' in navigator && 'select' in navigator.contacts;
  const bg = sheet(`<h3>Bring your people</h3><p>Every friend who joins with your link and plays gives you <b>+200 points</b>, <b>+200 coins</b> and <b>1 streak saver</b>. ${S.me.user.refs} joined so far.</p>
    <div style="display:grid;gap:10px">
      ${canPick ? `<button class="btn btn-wa" id="iPick">📇 Pick friends from my contacts</button>` : ''}
      <button class="btn ${canPick ? 'btn-gold' : 'btn-wa'}" id="iCard">🖼️ Send invite card on WhatsApp</button>
      <div class="btn-row"><button class="btn btn-line" id="iWa">💬 Text invite</button><button class="btn btn-line" id="iCopy">🔗 Copy link</button></div>
    </div><div id="cList"></div>
    ${canPick ? '' : `<p style="margin-top:12px;font-size:14px">On Android Chrome you can also pick friends straight from your contacts.</p>`}`);
  bg.querySelector('#iWa').onclick = () => { track('invite', { channel: 'whatsapp_text' }); window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); };
  bg.querySelector('#iCopy').onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Link copied'); } catch { toast(link); } track('invite', { channel: 'copy' }); };
  bg.querySelector('#iCard').onclick = async () => { const blob = await drawInvite(); shareFile(blob, 'naija25-invite.png', text, 'invite_card', {}); };
  if (canPick) bg.querySelector('#iPick').onclick = async () => {
    try {
      const people = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      track('contacts_pick', { count: people.length });
      const rows = people.filter(p => p.tel && p.tel.length).map((p, i) => ({ name: (p.name && p.name[0]) || 'Friend', tel: intlPhone(p.tel[0]), i }));
      bg.querySelector('#cList').innerHTML = rows.length ? `<div class="clist">${rows.map(r => `<div class="crow"><span class="cav">${esc(r.name[0] || '?')}</span><span class="cname"><b>${esc(r.name)}</b><small>+${esc(r.tel)}</small></span><button class="btn btn-wa csend" data-c="${r.i}">${IC.wa}Invite</button></div>`).join('')}</div>` : '<p>No phone numbers in those contacts.</p>';
      bg.querySelectorAll('[data-c]').forEach(btn => btn.onclick = () => {
        const r = rows.find(x => x.i === +btn.dataset.c), first = r.name.split(' ')[0];
        track('invite', { channel: 'contact' });
        window.open(`https://wa.me/${r.tel}?text=` + encodeURIComponent(`${first}! ${text}`), '_blank');
        btn.innerHTML = '✓ Sent'; btn.classList.replace('btn-wa', 'btn-line');
      });
    } catch (e) { if (e.name !== 'AbortError') toast('Could not open contacts.'); }
  };
}
function howTo() {
  track('how_to');
  sheet(`<h3>How it works</h3><p>One round a day, every day from 1 to 25 December, plus a Crossover round on 31 December.</p>
    <div class="rules">
      <div><span class="e">⏰</span><span><b>New door at 7pm</b><span>Each day's round stays open until the next one drops. Miss it and you can only practise.</span></span></div>
      <div><span class="e">⚡</span><span><b>100 points per right answer</b><span>Plus up to 50 for speed. Answer fast, earn more.</span></span></div>
      <div><span class="e">👵🏾</span><span><b>Ask Mummy question</b><span>The 7th question is old-school Naija. 20 seconds, double points.</span></span></div>
      <div><span class="e">🔥</span><span><b>Streak bonus</b><span>Each day in a row adds 5% to your points, up to 50%.</span></span></div>
      <div><span class="e">💯</span><span><b>Perfect round</b><span>Get all 7 right for +150 bonus points.</span></span></div>
      <div><span class="e">🛟</span><span><b>Streak savers</b><span>If you miss a day, a saver protects your streak. Earn them by inviting friends.</span></span></div>
      <div><span class="e">🏆</span><span><b>Prizes</b><span>${PRIZE_TEXT}. Prizes go to the number you signed up with.</span></span></div>
    </div><button class="btn btn-gold" onclick="this.closest('.sheet-bg').remove()">Got it</button>`);
}

// ---------- challenges ----------
const DTITLE = { lagos: 'Do you know Lagos?', abuja: 'Do you know Abuja?', drive: 'Lagos drive race' };
function pickChallenge(invite) {
  const bg = sheet(`<h3>Pick a challenge</h3><p>They get it in their notifications. You can also send the link on WhatsApp.</p><div style="display:grid;gap:10px">${Object.entries(DTITLE).map(([k, t]) => `<button class="btn btn-line" data-pc="${k}">${k === 'drive' ? '🏎️' : k === 'abuja' ? '🏛️' : '🌉'} ${t}</button>`).join('')}</div>`);
  bg.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => { bg.remove(); newDuel(b.dataset.pc, invite); });
}
async function newDuel(type, invite = []) {
  try { const d = await api('/api/duel/create', { type, invite }); beep('win'); duelLobby(d.code, true); } catch (e) { toast(e.message); }
}
const duelLink = (code) => `${location.origin}/?duel=${code}&ref=${S.me.user.refCode}`;
function shareDuel(v) {
  const txt = `⚔️ ${S.me.user.nickname} don challenge you: "${v.title}" on 25 Days of Naija 🇳🇬 Tap to accept and play. New players get 100 bonus coins: ${duelLink(v.code)}`;
  track('duel_share', { code: v.code }); window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}
async function duelLobby(code, fresh) {
  let v; try { v = await api('/api/duel/' + code); } catch (e) { return toast(e.message); }
  if (!v.mine) { try { await api('/api/duel/join', { code }); v = await api('/api/duel/' + code); } catch (e) { return toast(e.message); } }
  const me = v.players.find(p => p.me);
  const bg = sheet(`<div class="lobby"><span class="lob-ic">${v.type === 'drive' ? '🏎️' : v.type === 'abuja' ? '🏛️' : '🌉'}</span><h3>${esc(v.title)}</h3>
    <p>${v.type === 'drive' ? 'Everyone drives the same road from Ojuelegba to Lekki. Fastest time wins, crashes add 3 seconds.' : '7 questions, 10 seconds each. Everyone sees the scores move live.'} Winner gets <b>+100 coins</b>.</p>
    <div class="lob-pl" id="lobpl"></div>
    <div style="display:grid;gap:10px;margin-top:14px">
      ${me && !me.done ? `<button class="btn btn-gold" id="lobGo">${v.type === 'drive' ? '🔑 Start racing' : '▶️ Start playing'}</button>` : `<button class="btn btn-line" id="lobRe">🔁 Rematch</button>`}
      <button class="btn btn-wa" id="lobWa">${IC.wa}Send challenge on WhatsApp</button>
    </div></div>`);
  const paint = (v) => { const el = bg.querySelector('#lobpl'); if (!el) return; el.innerHTML = standings(v); };
  paint(v);
  let alive = true; const poll = async () => { if (!alive || !document.body.contains(bg)) return; try { paint(await api('/api/duel/' + code)); } catch {} setTimeout(poll, 2500); }; setTimeout(poll, 2500);
  bg.querySelector('#lobWa').onclick = () => shareDuel(v);
  if (bg.querySelector('#lobGo')) bg.querySelector('#lobGo').onclick = () => { alive = false; bg.remove(); v.type === 'drive' ? raceDuel(v) : playDuel(v); };
  if (bg.querySelector('#lobRe')) bg.querySelector('#lobRe').onclick = () => { alive = false; bg.remove(); newDuel(v.type); };
  if (fresh) toast('Challenge ready! Send it to your people 👇🏾');
}
function standings(v) {
  const ps = v.type === 'drive' ? v.players.slice().sort((a, b) => (a.done ? a.secs + 3 * a.crashes : 9e9) - (b.done ? b.secs + 3 * b.crashes : 9e9)) : v.players.slice().sort((a, b) => b.score - a.score);
  return ps.map((p, i) => `<div class="stand ${p.me ? 'me' : ''}"><span class="sp">${p.done ? ['🥇', '🥈', '🥉'][i] || i + 1 : i + 1}</span><span class="sn"><b>${esc(p.n)}${p.me ? ' (you)' : ''}</b><small>${p.live && !p.done ? '<i class="live"></i>playing now' : p.done ? 'finished' : p.answered || p.progress ? 'in progress' : 'not started'}</small></span>
    <span class="sv">${v.type === 'drive' ? (p.done ? `${p.secs}s${p.crashes ? ` +${p.crashes * 3}` : ''}` : `${Math.round(p.progress * 100)}%`) : `${p.score}<small> · ${p.correct}/${p.answered}</small>`}</span></div>`).join('');
}
async function playDuel(v) {
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'duel'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  ov.innerHTML = `<div class="inner"><div class="g-top"><button class="g-close" aria-label="Close">✕</button><b class="dtitle">${esc(v.title)}</b></div><div class="dboard" id="dboard"></div><div id="dq"></div></div>`;
  const D = { combo: 0, alive: true };
  const board = (x) => { const el = ov.querySelector('#dboard'); if (!el) return; const max = Math.max(1, ...x.players.map(p => p.score)); el.innerHTML = x.players.slice().sort((a, b) => b.score - a.score).map(p => `<div class="dbp ${p.me ? 'me' : ''}"><span class="dbn">${p.live && !p.me ? '<i class="live"></i>' : ''}${esc(p.n)}${p.done ? ' 🏁' : ''}</span><span class="dbbar"><i style="width:${(p.score / max) * 100}%"></i></span><span class="dbs">${p.score}</span></div>`).join(''); };
  board(v);
  const poll = async () => { if (!D.alive) return; try { board(await api('/api/duel/' + v.code)); } catch {} setTimeout(poll, 1300); }; poll();
  const close = () => { D.alive = false; clearTimeout(D.to); clearInterval(D.iv); ov.remove(); document.body.style.overflow = ''; refresh(); };
  ov.querySelector('.g-close').onclick = () => { if (confirm('Leave the challenge? You can continue later from the Friends tab.')) close(); };
  const next = async () => {
    let q; try { q = await api(`/api/duel/${v.code}/next`, {}); } catch (e) { toast(e.message); return close(); }
    if (q.done) return finish();
    ov.querySelector('#dq').innerHTML = `<div class="g-meta"><span class="chip">Question ${q.index + 1} of ${q.total}</span><span class="timer" id="dtm">${Math.ceil(q.remainingMs / 1000)}</span></div>
      <div class="tbar"><i id="dtb"></i></div>
      ${q.photo ? `<div class="dphoto">${imgTag(q.photo, 'Photo for this question')}</div>` : ''}
      <div class="question ${q.photo ? 'withph' : ''}">${esc(q.question)}</div>
      <div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div><div class="feedback" id="dfb"></div>`;
    const tb = ov.querySelector('#dtb'), left = q.remainingMs, end = Date.now() + left;
    tb.style.transform = `scaleX(${left / q.limitMs})`; requestAnimationFrame(() => requestAnimationFrame(() => { tb.style.transition = `transform ${left}ms linear`; tb.style.transform = 'scaleX(0)'; }));
    D.iv = setInterval(() => { const s = Math.ceil((end - Date.now()) / 1000), el = ov.querySelector('#dtm'); if (el) { el.textContent = Math.max(0, s); el.classList.toggle('hot', s <= 3); } if (s <= 3 && s > 0) beep('tick'); }, 1000);
    let answered = false;
    const answer = async (i) => {
      if (answered) return; answered = true; clearTimeout(D.to); clearInterval(D.iv);
      const btns = ov.querySelectorAll('.opt'); btns.forEach(b => b.disabled = true);
      try {
        const r = await api(`/api/duel/${v.code}/answer`, { choice: i });
        btns.forEach((b, k) => b.classList.add(k === r.correctIndex ? 'right' : k === i ? 'wrong' : 'dim'));
        D.combo = r.correct ? D.combo + 1 : 0;
        if (r.correct) { beep('ok'); popEmoji(D.combo >= 3 ? '🔥' : pick(RX.ok)); } else { beep('no'); popEmoji(i < 0 ? '⏰' : pick(RX.no)); }
        ov.querySelector('#dfb').innerHTML = `<div class="big">${r.correct ? t('correct') + ` <span class="pop">+${r.points}</span>` : i < 0 ? t('timeout') : t('wrong')}</div>${D.combo >= 2 ? `<div class="combo">${D.combo} in a row 🔥</div>` : ''}`;
        setTimeout(() => r.done ? finish() : next(), 1400);
      } catch (e) { toast(e.message); }
    };
    D.to = setTimeout(() => answer(-1), left);
    ov.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.i));
  };
  const finish = async () => {
    const x = await api('/api/duel/' + v.code).catch(() => v); const me = x.players.find(p => p.me);
    const ps = x.players.slice().sort((a, b) => b.score - a.score), rank = ps.findIndex(p => p.me) + 1;
    ov.querySelector('#dq').innerHTML = `<div class="face">${rank === 1 ? '🤩' : rank === 2 ? '😎' : '😅'}<span>${rank === 1 ? '👑' : '👍🏾'}</span></div>
      <div class="res-score"><div class="num" style="font-size:90px">${me.score}</div><div class="verdict">${x.allDone ? (rank === 1 ? 'You won! +100 🪙' : `You came #${rank}`) : rank === 1 ? 'You dey lead! Waiting for others…' : `You're #${rank} for now`}</div></div>
      <div class="lob-pl">${standings(x)}</div>
      <div class="res-actions" style="margin-top:16px"><button class="btn btn-wa" id="dsh">${IC.wa}Dare more friends</button><button class="btn btn-ghost" id="dre">🔁 New challenge</button></div>`;
    if (rank === 1) { confetti(120); rain(['👑', '🔥', '🏆']); beep('win'); }
    ov.querySelector('#dsh').onclick = () => shareDuel(x);
    ov.querySelector('#dre').onclick = () => { close(); newDuel(x.type); };
  };
  next();
}
async function raceDuel(v) {
  if (!window.NaijaDrive) return toast('Driving game not loaded');
  const res = await window.NaijaDrive.start({ to: { id: 'lekki', name: 'Lekki-Ikoyi Bridge' }, from: 'Ojuelegba', vehicle: 'ride', seed: v.seed, api, beep, toast, onCoins: coinsTo,
    race: { report: (p, crashes) => api(`/api/duel/${v.code}/progress`, { p, crashes }), done: (secs, crashes) => api(`/api/duel/${v.code}/drive-done`, { secs, crashes }) } });
  const x = res.view || await api('/api/duel/' + v.code).catch(() => v);
  const bg = sheet(`<div class="lobby"><span class="lob-ic">🏁</span><h3>${res.secs}s${res.crashes ? ` + ${res.crashes * 3}s for crashes` : ', no crash 😎'}</h3><p>${x.allDone ? 'Everybody don finish. Here are the results:' : 'Others are still racing. Results update live.'}</p><div class="lob-pl" id="rpl">${standings(x)}</div>
    <div style="display:grid;gap:10px;margin-top:14px"><button class="btn btn-wa" id="rsh">${IC.wa}Dare more friends</button><button class="btn btn-line" id="rre">🔁 Race again</button></div></div>`);
  const poll = async () => { if (!document.body.contains(bg)) return; try { bg.querySelector('#rpl').innerHTML = standings(await api('/api/duel/' + v.code)); } catch {} setTimeout(poll, 2500); }; setTimeout(poll, 2500);
  bg.querySelector('#rsh').onclick = () => shareDuel(x); bg.querySelector('#rre').onclick = () => { bg.remove(); newDuel('drive'); };
  coinsTo((S.me.user.coins || 0) + 30); refresh();
}

// ---------- Naija Trip ----------
const NG = [[2.69,6.36],[3.4,6.42],[4.2,6.25],[4.85,6.0],[5.2,5.6],[5.6,5.25],[5.95,4.5],[6.1,4.28],[6.6,4.33],[7.0,4.42],[7.5,4.45],[8.0,4.5],[8.5,4.75],[8.7,5.1],[8.85,5.8],[9.5,6.4],[10.2,7.0],[11.0,6.65],[11.6,7.2],[11.95,7.95],[12.25,8.5],[12.8,8.8],[13.2,9.55],[13.4,10.2],[13.7,10.8],[14.2,11.35],[14.6,11.9],[14.55,12.35],[14.15,12.8],[14.05,13.08],[13.6,13.65],[13.25,13.6],[12.4,13.1],[11.4,13.35],[10.7,13.3],[10.0,13.2],[9.0,12.85],[8.2,13.3],[7.2,13.05],[6.6,13.45],[6.0,13.65],[5.3,13.75],[4.5,13.6],[4.1,13.45],[3.65,12.55],[3.6,11.7],[3.5,11.25],[2.85,10.4],[2.75,9.75],[2.7,9.05],[2.75,8.5],[2.7,7.8],[2.75,7.1]];
const NIGER = [[3.6,11.7],[4.3,10.6],[4.8,9.1],[5.6,8.6],[6.74,7.8],[6.75,7.0],[6.4,5.9],[6.1,4.6]], BENUE = [[12.5,9.25],[11.2,9.0],[9.8,8.2],[8.5,7.73],[7.6,7.85],[6.74,7.8]];
const CITIES = [['Lagos', 3.38, 6.52], ['Ibadan', 3.9, 7.38], ['Abuja', 7.49, 9.06], ['Kano', 8.52, 12.0], ['PH', 7.03, 4.82], ['Enugu', 7.5, 6.45]];
const PIN_NUDGE = { lekki: [12, 10], theatre: [-12, -10], zuma: [-14, -4], citygate: [10, 10] };
const MX = (lon) => (lon - 2.4) * 40, MY = (lat) => (14.1 - lat) * 40;
function mapSvg(places, here, extra = '') {
  const poly = NG.map(([lo, la]) => `${MX(lo).toFixed(1)},${MY(la).toFixed(1)}`).join(' ');
  const line = (pts) => pts.map(([lo, la], i) => `${i ? 'L' : 'M'}${MX(lo).toFixed(1)} ${MY(la).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 500 400" class="ngmap" role="img" aria-label="Map of Nigeria with places to visit">
    <defs><pattern id="adp" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="3" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.4"/></pattern></defs>
    <polygon points="${poly}" fill="#22378A" stroke="#3A55C4" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="${poly}" fill="url(#adp)"/>
    <path d="${line(NIGER)}" fill="none" stroke="#5c7be0" stroke-width="3" stroke-linecap="round" opacity=".7"/><path d="${line(BENUE)}" fill="none" stroke="#5c7be0" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    ${CITIES.map(([n, lo, la]) => `<g opacity=".55"><circle cx="${MX(lo)}" cy="${MY(la)}" r="2.5" fill="#B9C6F2"/><text x="${MX(lo) + 5}" y="${MY(la) - 5}" class="mapcity">${n}</text></g>`).join('')}
    ${extra}
    ${places.map(p => { const [dx, dy] = PIN_NUDGE[p.id] || [0, 0]; const x = MX(p.lon) + dx, y = MY(p.lat) + dy; return `<g class="pin ${p.visited ? 'seen' : ''}" data-place="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)}"><circle cx="${x}" cy="${y}" r="15"/><text x="${x}" y="${y + 5.5}" text-anchor="middle" class="pinmoji">${p.emoji}</text>${p.visited ? `<circle cx="${x + 11}" cy="${y - 11}" r="6.5" class="tick"/><text x="${x + 11}" y="${y - 8}" text-anchor="middle" class="tickt">✓</text>` : ''}</g>`; }).join('')}
    ${here ? `<g class="you"><circle cx="${MX(here.lon)}" cy="${MY(here.lat)}" r="9" class="youring"/><circle cx="${MX(here.lon)}" cy="${MY(here.lat)}" r="6" class="youdot"/></g>` : ''}
  </svg>`;
}
const imgTag = (ph, alt, cls = '') => `<img class="${cls}" src="/photos/${ph.f}" data-remote="${ph.u}" alt="${esc(alt)}" loading="lazy" onerror="if(this.dataset.remote&&this.src!==this.dataset.remote){this.src=this.dataset.remote}else{this.classList.add('nophoto')}">`;
async function viewTrip() {
  $('#view').innerHTML = `<div class="wrap"><div class="card"><p>Loading your map…</p></div></div>`;
  let T; try { T = await api('/api/trip'); } catch (e) { $('#view').innerHTML = `<div class="wrap"><div class="card">${esc(e.message)}</div></div>`; return; }
  S.trip = T; coinsTo(T.coins); track('trip_view');
  const here = T.here, seen = T.places.filter(p => p.visited).length;
  const cheapest = (p) => p.quote ? Math.min(...p.quote.modes.filter(m => m.ok).map(m => m.cost)) : null;
  $('#view').innerHTML = `<div class="wrap">
    <div class="section-title" style="margin-top:8px"><h2>Naija Trip</h2><span>${seen}/${T.places.length} stamps</span></div>
    <p class="tripsub">Detty December road trips. Drive yourself through Lagos traffic by okada, car or danfo, or take the train or a flight for far places.</p>
    <div class="here"><span class="hp">📍</span><span><small>You're in</small><b>${here.id === 'home' ? (here.geo ? `Your location, near ${esc(here.city)}` : `Home, ${esc(here.city)}`) : esc(here.name)}</b></span><span class="pill coin">🪙 ${T.coins.toLocaleString()}</span></div>
    ${'geolocation' in navigator && !T.pending && !(here.id === 'home' && here.geo) ? `<button class="btn btn-ghost" id="locBtn" style="margin:8px 0 0">📍 ${here.id === 'home' ? 'Start from my real location' : 'Go back to my location'}</button>` : ''}
    ${T.pending ? `<button class="card light pend" id="pend">🧐 You haven't answered the question at your stop. <b>Answer now</b></button>` : ''}
    <div class="mapwrap">${mapSvg(T.places, here)}</div>
    <p class="maphint">To start a trip: tap a pin or a place below, pick a ride, then press <b>Go</b>. Okada, keke, car and danfo trips let you drive yourself.</p>
    <div class="card lifts">
      <div class="lifts-h"><b>🙋🏾 Lifts</b><button class="btn btn-line btn-sm" id="askLift">Ask a friend for a lift</button></div>
      ${T.lifts && T.lifts.incoming.length ? T.lifts.incoming.map(l => `<div class="lift">🙋🏾 <span><b>${esc(l.n)}</b> wants a lift. They'll wait at a bus stop on your next road trip.</span><button class="lift-x" data-lx="${l.id}" aria-label="Decline">✕</button></div>`).join('') : ''}
      ${T.lifts && T.lifts.outgoing.length ? T.lifts.outgoing.map(l => `<div class="lift out">⏳ <span>Waiting for <b>${esc(l.n)}</b> to pick you up</span><button class="lift-x" data-lx="${l.id}" aria-label="Cancel">✕</button></div>`).join('') : ''}
      ${T.lifts && !T.lifts.incoming.length && !T.lifts.outgoing.length ? '<p class="lift-empty">Ask a friend to carry you. When they drive, you wait at a bus stop on their road and get the passport stamp too.</p>' : ''}
    </div>
    <div class="dests">${T.places.map(p => `<button class="dest" data-place="${p.id}">
      <span class="dimg">${imgTag(p.photo, p.name)}${p.visited ? '<span class="stamp">✓</span>' : ''}</span>
      <span class="dtxt"><b>${p.emoji} ${esc(p.name)}</b><small>${esc(p.city)}${p.quote ? ` · ${p.quote.km} km` : ' · You are here'}</small></span>
      <span class="dcost">${p.quote ? `from<br><b>${cheapest(p)} 🪙</b>` : '📍'}</span></button>`).join('')}</div>
    <div class="section-title"><h2>Passport</h2><span>Collect every stamp</span></div>
    <div class="passport">${T.places.map(p => `<div class="pstamp ${p.visited ? 'on' : ''}"><span>${p.visited ? p.emoji : '?'}</span><small>${p.visited ? esc(p.city) : 'Locked'}</small></div>`).join('')}</div>
    <p class="foot">Coins come from your round points, invites and sharing. Points on the leaderboard never go down when you spend coins.</p>
  </div>`;
  document.querySelectorAll('[data-place]').forEach(el => { el.onclick = () => placeSheet(el.dataset.place); el.onkeydown = (e) => { if (e.key === 'Enter') placeSheet(el.dataset.place); }; });
  if (T.pending) $('#pend').onclick = () => { const p = T.places.find(x => x.id === T.pending.place); postcard({ to: p, quiz: T.pending, coins: T.coins }); };
  if ($('#locBtn')) $('#locBtn').onclick = () => useMyLocation(true);
  $('#askLift').onclick = askLift;
  document.querySelectorAll('[data-lx]').forEach(b => b.onclick = async () => { try { await api('/api/trip/lift/cancel', { id: +b.dataset.lx }); viewTrip(); } catch (e) { toast(e.message); } });
  // First visit to the map with no saved location: ask the browser once per session.
  if (!T.geo && !T.pending && here.id === 'home' && !S.geoAsked) { S.geoAsked = true; useMyLocation(false); }
}
async function askLift() {
  const bg = sheet(`<h3>🙋🏾 Ask for a lift</h3><p>Pick a friend. Next time they drive an okada, keke, car or danfo, you'll be waiting at a bus stop on their road. If they stop for you, you both win coins and you get the passport stamp.</p><div class="paxlist" id="liftlist"><span class="paxload">Loading friends…</span></div>`);
  try {
    const f = await api('/api/friends'), el = bg.querySelector('#liftlist');
    el.innerHTML = f.rows.length ? f.rows.slice(0, 20).map(x => `<button class="paxc" data-lf="${x.id}">${x.online ? '<i></i>' : ''}${esc(x.n)}</button>`).join('') : '<span class="paxload">Invite friends or join a squad first.</span>';
    el.querySelectorAll('[data-lf]').forEach(b => b.onclick = async () => { try { await api('/api/trip/lift', { driver: +b.dataset.lf }); bg.remove(); toast(`🙋🏾 Asked ${b.textContent.trim()} for a lift`); viewTrip(); } catch (e) { toast(e.message); } });
  } catch (e) { toast(e.message); }
}
function useMyLocation(manual) {
  if (!('geolocation' in navigator)) return manual && toast('Your browser cannot share location.');
  if (!window.isSecureContext) return manual && toast('Location needs https (or localhost). Starting from your state.');
  const b = $('#locBtn'); if (b) { b.disabled = true; b.textContent = '📍 Finding you…'; }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try { await api('/api/trip/locate', { lat: pos.coords.latitude, lon: pos.coords.longitude }); toast('📍 Trips now start from where you are'); }
    catch (e) { toast(e.message); }
    if (S.tab === 'trip') viewTrip();
  }, (err) => {
    if (b) { b.disabled = false; b.textContent = '📍 Start from my real location'; }
    if (manual || err.code !== err.PERMISSION_DENIED) toast(err.code === err.PERMISSION_DENIED ? 'Location blocked. Allow it in your browser settings to start from where you are.' : 'Could not get your location. Try again.');
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
}
function placeSheet(id) {
  const T = S.trip, p = T.places.find(x => x.id === id);
  if (!p.quote) return toast(`You're already at ${p.name} 📍`);
  if (T.pending) return toast('Answer the question at your current stop first 🧐');
  beep('tap');
  const bg = sheet(`<div class="psheet-img">${imgTag(p.photo, p.name)}</div>
    <h3>${p.emoji} ${esc(p.name)}</h3><p>${esc(p.city)} · ${p.quote.km} km from you${p.visited ? ' · Visited ✓' : ''}</p>
    ${p.fact ? `<p class="fact">💡 ${esc(p.fact)}</p>` : `<p class="fact">🧐 Arrive and answer a question about this place to win <b>+100 coins</b> and a passport stamp.</p>`}
    <div class="pax" id="pax"><small>Bring your people along (+25 🪙 a seat). They get the stamp too.</small><div class="paxlist" id="paxlist"><span class="paxload">Loading friends…</span></div></div>
    <div class="modes">${p.quote.modes.map(m => `<button class="mode" data-mode="${m.id}" ${!m.ok || m.cost > T.coins ? 'disabled' : ''}>
      <span class="me">${m.emoji}</span><span class="mt"><b>${m.name}</b><small>${!m.ok ? (m.id === 'flight' || m.id === 'train' ? 'Too close for this' : 'Too far for this') : m.cost > T.coins ? 'Not enough coins' : m.note}</small></span><span class="mc">${m.cost} 🪙</span></button>`).join('')}</div>
    <button class="btn btn-gold" id="goBtn" disabled>Pick a ride</button>`);
  let mode = null; const pax = new Set();
  const label = () => { if (!mode) return; const m = p.quote.modes.find(x => x.id === mode), cost = m.cost + pax.size * 25, go = bg.querySelector('#goBtn'); go.disabled = cost > T.coins; go.textContent = cost > T.coins ? 'Not enough coins' : `${m.emoji} Go for ${cost} coins${pax.size ? ` with ${pax.size} ${pax.size > 1 ? 'people' : 'person'}` : ''}`; };
  bg.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { bg.querySelectorAll('.mode').forEach(x => x.classList.remove('on')); b.classList.add('on'); mode = b.dataset.mode; beep('tap'); label(); });
  api('/api/friends').then(f => { const el = bg.querySelector('#paxlist'); if (!el) return; el.innerHTML = f.rows.length ? f.rows.slice(0, 12).map(x => `<button class="paxc" data-pax="${x.id}">${x.online ? '<i></i>' : ''}${esc(x.n)}</button>`).join('') : '<span class="paxload">Invite friends or join a squad to carry people along.</span>'; el.querySelectorAll('[data-pax]').forEach(c => c.onclick = () => { const id = +c.dataset.pax; if (pax.has(id)) pax.delete(id); else { if (pax.size >= 4) return toast('Max 4 passengers'); pax.add(id); } c.classList.toggle('on', pax.has(id)); beep('tap'); label(); }); }).catch(() => {});
  bg.querySelector('#goBtn').onclick = async () => {
    const go = bg.querySelector('#goBtn'); go.disabled = true; go.textContent = 'Booking your ride…';
    try { const r = await api('/api/trip/go', { to: id, mode, passengers: [...pax] }); bg.remove(); if (r.passengers && r.passengers.length) toast(`🚐 ${r.passengers.join(', ')} ${r.passengers.length > 1 ? 'are' : 'is'} coming along!`); journey(r); } catch (e) { toast(e.message); go.disabled = false; go.textContent = 'Try again'; }
  };
}
function journey(r) {
  if (['okada', 'keke', 'ride', 'danfo'].includes(r.mode.id) && window.NaijaDrive) {
    return window.NaijaDrive.start({ to: r.to, from: r.from.id === 'home' ? 'Home' : r.from.name, fromId: r.from.id, homeCity: r.from.city, km: r.km, pickups: r.pickups || [],
      vehicle: r.mode.id, api, beep, toast, onCoins: coinsTo })
      .then(() => { coinsTo(S.me.user.coins); postcard(r); });
  }
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'journey'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const x1 = MX(r.from.lon), y1 = MY(r.from.lat), x2 = MX(r.to.lon) + ((PIN_NUDGE[r.to.id] || [0, 0])[0]), y2 = MY(r.to.lat) + ((PIN_NUDGE[r.to.id] || [0, 0])[1]);
  const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 40 - Math.hypot(x2 - x1, y2 - y1) * .15;
  const route = `<path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" class="route" id="route"/><text id="veh" class="veh" text-anchor="middle">${r.mode.emoji}</text>`;
  ov.innerHTML = `<div class="inner"><div class="j-head"><small>${esc(r.from.id === 'home' ? 'Home' : r.from.name)}</small><b>→ ${esc(r.to.name)}</b><span>${r.mode.emoji} ${r.mode.name} · ${r.km} km · −${r.cost} 🪙</span></div>
    <div class="mapwrap j">${mapSvg([{ ...r.to, visited: false }], null, route)}</div>
    <div class="jbar"><i id="jb"></i></div><div class="jevent" id="jev">${r.mode.id === 'flight' ? 'Boarding… ✈️' : 'On the road… 🛣️'}</div></div>`;
  const path = ov.querySelector('#route'), veh = ov.querySelector('#veh'), L = path.getTotalLength(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 600 : r.mode.ms + 1200;
  const t0 = performance.now(); let shown = false;
  beep('tap');
  (function step(t) {
    const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, pt = path.getPointAtLength(L * e);
    veh.setAttribute('x', pt.x); veh.setAttribute('y', pt.y + 7);
    ov.querySelector('#jb').style.width = (k * 100) + '%';
    if (k > .45 && !shown) { shown = true; const ev = ov.querySelector('#jev'); ev.innerHTML = `${esc(r.event.text)}${r.event.delta ? ` <b>${r.event.delta > 0 ? '+' : ''}${r.event.delta} 🪙</b>` : ''}`; ev.classList.add('pop'); beep(r.event.delta < 0 ? 'no' : 'ok'); }
    if (k < 1) requestAnimationFrame(step); else setTimeout(() => { ov.remove(); coinsTo(r.coins); postcard(r); }, 500);
  })(t0);
}
function postcard(r) {
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'postcard'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const p = r.to;
  ov.innerHTML = `<div class="inner pc">
    <div class="pc-img">${imgTag(p.photo, p.name)}<div class="pc-stamp">${p.emoji}<small>${esc(p.city)}</small></div><button class="g-close" aria-label="Close" id="pcx">✕</button></div>
    <div class="pc-body"><small class="pc-k">You've arrived 🎉</small><h2>${esc(p.name)}</h2>
    ${r.quiz ? `<p class="pc-q">🧐 ${esc(r.quiz.q)}</p><div class="opts">${r.quiz.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>` : `<p class="fact">💡 ${esc(p.fact || '')}</p>`}
    <div id="pcres"></div>
    <div class="btn-row pc-act ${r.quiz ? 'hidden' : ''}"><button class="btn btn-wa" id="pcShare">${IC.wa}Share postcard</button><button class="btn btn-ghost" id="pcBack">🗺️ Back to map</button></div></div></div>`;
  popEmoji('📍'); beep('win');
  const close = () => { ov.remove(); document.body.style.overflow = ''; loadMe().then(() => { if (S.tab === 'trip') renderApp(); }).catch(() => {}); };
  ov.querySelector('#pcx').onclick = close; ov.querySelector('#pcBack').onclick = close;
  ov.querySelector('#pcShare').onclick = async () => { const blob = await drawPostcard(p); shareFile(blob, `naija25-${p.id}.png`, `I just visited ${p.name} on Naija Trip 🧳🇳🇬 Play 25 Days of Naija: ${myLink()}`, 'postcard', { place: p.id }); };
  ov.querySelectorAll('.opt').forEach(b => b.onclick = async () => {
    ov.querySelectorAll('.opt').forEach(x => x.disabled = true);
    try {
      const a = await api('/api/trip/answer', { choice: +b.dataset.i });
      ov.querySelectorAll('.opt').forEach((x, k) => x.classList.add(k === a.correctIndex ? 'right' : k === +b.dataset.i ? 'wrong' : 'dim'));
      if (a.correct) { popEmoji(pick(RX.ok)); beep('ok'); rain(['🪙', '✨', '🎉'], 14); } else { popEmoji(pick(RX.no)); beep('no'); }
      p.fact = a.fact; coinsTo(a.coins);
      ov.querySelector('#pcres').innerHTML = `<div class="pc-rew">${a.correct ? `You sabi! <b>+${a.reward.coins} 🪙 +${a.reward.points} pts</b>` : 'Not this time, but the stamp is yours 🛂'}</div><p class="fact">💡 ${esc(a.fact)}</p>
        ${(a.newBadges || []).map(k => `<div class="newbadge"><span class="e">${S.me.allBadges[k][0]}</span><span><b>New badge: ${S.me.allBadges[k][1]}</b><small>${S.me.allBadges[k][2]}</small></span></div>`).join('')}`;
      ov.querySelector('.pc-act').classList.remove('hidden');
    } catch (e) { toast(e.message); }
  });
}
function loadImg(ph) {
  return new Promise((res) => {
    const tryUrl = (u, next) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => next ? tryUrl(next) : res(null); im.src = u; };
    tryUrl('/photos/' + ph.f, ph.u);
  });
}
async function drawPostcard(p) {
  try { await document.fonts.load('800 100px "Bricolage Grotesque"'); } catch {}
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const F = (w, z) => `${w} ${z}px "Bricolage Grotesque", system-ui, sans-serif`;
  x.fillStyle = '#101C4A'; x.fillRect(0, 0, 1080, 1350);
  const im = await loadImg(p.photo);
  x.save(); x.beginPath(); x.roundRect(50, 50, 980, 820, 40); x.clip();
  if (im) { const s = Math.max(980 / im.width, 820 / im.height), w = im.width * s, h = im.height * s; x.drawImage(im, 50 + (980 - w) / 2, 50 + (820 - h) / 2, w, h); }
  else { x.fillStyle = '#22378A'; x.fillRect(50, 50, 980, 820); x.font = '300px serif'; x.textAlign = 'center'; x.fillText(p.emoji, 540, 560); x.textAlign = 'left'; }
  x.restore();
  x.save(); x.translate(880, 780); x.rotate(-.18); x.fillStyle = '#F5B83D'; x.beginPath(); x.arc(0, 0, 120, 0, 7); x.fill(); x.strokeStyle = '#101C4A'; x.lineWidth = 6; x.setLineDash([14, 10]); x.beginPath(); x.arc(0, 0, 100, 0, 7); x.stroke();
  x.fillStyle = '#101C4A'; x.textAlign = 'center'; x.font = F(800, 34); x.fillText('VISITED', 0, -10); x.font = F(700, 30); x.fillText(p.city, 0, 32); x.restore();
  x.fillStyle = '#B9C6F2'; x.font = F(700, 46); x.fillText(`${S.me.user.nickname} just visited`, 70, 960);
  x.fillStyle = '#fff'; x.font = F(800, 84); x.fillText(p.name.length > 20 ? p.name.slice(0, 19) + '…' : p.name, 70, 1060);
  x.fillStyle = '#F5B83D'; x.beginPath(); x.roundRect(70, 1130, 940, 150, 40); x.fill();
  x.fillStyle = '#101C4A'; x.font = F(800, 52); x.fillText('Naija Trip on 25 Days of Naija', 120, 1200); x.font = F(600, 36); x.fillText(location.host + '  ·  code ' + S.me.user.refCode, 120, 1252);
  return new Promise(res => c.toBlob(res, 'image/png'));
}

// ---------- ranks ----------
async function viewRanks() {
  const tabs = [['today', 'Today'], ['overall', 'All time'], ['states', 'States'], ['schools', 'Schools']];
  $('#view').innerHTML = `<div class="wrap"><div class="section-title" style="margin-top:8px"><h2>Leaderboard</h2><span id="lbsub"></span></div>
    <div class="seg">${tabs.map(([k, l]) => `<button data-b="${k}" class="${S.board === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="lb"><div class="board"><div class="empty">Loading…</div></div></div></div>`;
  document.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { S.board = b.dataset.b; track('board', { board: S.board }); viewRanks(); });
  try {
    const r = await api('/api/leaderboard?type=' + S.board);
    const group = S.board === 'states' || S.board === 'schools';
    if (S.board === 'today') $('#lbsub').textContent = r.day ? (r.day === 26 ? 'Crossover round' : `Day ${r.day}`) : '';
    if (group) $('#lbsub').textContent = 'Average points per player';
    if (!r.rows.length) { $('#lb').innerHTML = `<div class="board"><div class="empty"><b>No scores yet</b>${S.board === 'today' ? 'Be the first on the board today.' : 'Play a December round to get on the board.'}</div></div>`; return; }
    const medals = ['🥇', '🥈', '🥉'];
    const top = r.rows.slice(0, 3);
    const pod = top.length === 3 ? `<div class="podium">${[1, 0, 2].map(i => `<div><span class="medal">${medals[i]}</span><b>${esc(top[i].n)}</b><span>${top[i].v.toLocaleString()}${group ? ' avg' : ''}</span></div>`).join('')}</div>` : '';
    const list = r.rows.map((x, i) => `<div class="lb ${x.me ? 'me' : ''}"><span class="pos ${i < 3 ? 'p' + (i + 1) : ''}">${i + 1}</span><span class="who"><b>${esc(x.n)}${x.me ? ' (you)' : ''}</b><small>${group ? `${x.k} player${x.k > 1 ? 's' : ''}` : esc(x.s || '')}${S.board === 'today' && x.c != null ? ` · ${x.c}/7` : ''}</small></span><span class="val">${x.v.toLocaleString()}</span></div>`).join('');
    const mine = r.me && r.me.rank ? `<div class="mybar"><span>Your position</span><span>#${r.me.rank} · ${r.me.v.toLocaleString()} pts</span></div>` : '';
    $('#lb').innerHTML = pod + mine + `<div class="board">${list}</div>`;
  } catch (e) { $('#lb').innerHTML = `<div class="board"><div class="empty">${esc(e.message)}</div></div>`; }
}

// ---------- squads ----------
async function viewSquads() {
  const sq = S.me.squads;
  if (!S.squad && sq.length) S.squad = sq[0].code;
  $('#view').innerHTML = `<div class="wrap">
    <div class="section-title" style="margin-top:8px"><h2>Challenge your people</h2><span>Live scores</span></div>
    <div class="chal">
      <button class="chc c-lagos" data-new="lagos"><span class="cicon">🌉</span><b>Do you know Lagos?</b><small>7 photo and landmark questions. See your friends' scores live.</small></button>
      <button class="chc c-abuja" data-new="abuja"><span class="cicon">🏛️</span><b>Do you know Abuja?</b><small>Who sabi the capital pass?</small></button>
      <button class="chc c-drive" data-new="drive"><span class="cicon">🏎️</span><b>Lagos drive race</b><small>Same road, fastest driver wins. Watch them on your bar.</small></button>
    </div>
    <div id="myduels"></div>
    <div class="section-title"><h2>Your people</h2><span id="frc"></span></div>
    <div id="friends" class="board"><div class="empty">Loading…</div></div>
    <div class="section-title"><h2>Squads</h2><span>Family, friends, office, fellowship</span></div>
    ${sq.length ? `<div class="seg" style="overflow-x:auto">${sq.map(s => `<button data-sq="${s.code}" class="${S.squad === s.code ? 'on' : ''}">${esc(s.name)}</button>`).join('')}</div><div id="sqb"></div>` :
      `<div class="card light"><h3>Make a squad</h3><p>Create a squad for your family, WhatsApp group, office or church/mosque youth group. Everyone sees one private leaderboard.</p></div>`}
    <div class="card"><h3>Create a squad</h3><p>Give it a name, then share the link in your group chat.</p>
      <div class="row"><input id="sqName" maxlength="30" placeholder="e.g. Afolabi Family" style="flex:1;padding:13px 14px;border-radius:14px;border:0;background:#fff;color:var(--ink);font-size:16px"><button class="btn btn-gold" style="width:auto;padding:13px 16px;font-size:16px" id="sqCreate">Create</button></div></div>
    <div class="card"><h3>Join with a code</h3>
      <div class="row"><input id="sqCode" maxlength="6" placeholder="5-letter code" style="flex:1;padding:13px 14px;border-radius:14px;border:0;background:#fff;color:var(--ink);font-size:16px;text-transform:uppercase"><button class="btn btn-ghost" style="width:auto;padding:13px 16px;font-size:16px" id="sqJoin">Join</button></div></div>
  </div>`;
  document.querySelectorAll('[data-sq]').forEach(b => b.onclick = () => { S.squad = b.dataset.sq; viewSquads(); });
  document.querySelectorAll('[data-new]').forEach(b => b.onclick = () => newDuel(b.dataset.new));
  api('/api/duels').then(d => { const el = $('#myduels'); if (!el || !d.rows.length) return; el.innerHTML = `<div class="section-title"><h2>Your challenges</h2></div><div class="board">${d.rows.map(x => { const me = x.players.find(p => p.me), lead = x.type === 'drive' ? x.players.filter(p => p.done).sort((a, b) => (a.secs + 3 * a.crashes) - (b.secs + 3 * b.crashes))[0] : x.players.slice().sort((a, b) => b.score - a.score)[0]; return `<div class="lb dl" data-duel="${x.code}"><span class="pos">${x.type === 'drive' ? '🏎️' : x.type === 'abuja' ? '🏛️' : '🌉'}</span><span class="who"><b>${esc(x.title)}</b><small>${x.players.length} player${x.players.length > 1 ? 's' : ''} · ${me && me.done ? (x.allDone ? `${lead ? esc(lead.n) + ' won' : 'Finished'}` : 'Waiting for others') : 'Your turn'}</small></span><span class="val">›</span></div>`; }).join('')}</div>`; el.querySelectorAll('[data-duel]').forEach(r => r.onclick = () => duelLobby(r.dataset.duel)); }).catch(() => {});
  api('/api/friends').then(f => { const el = $('#friends'); if (!el) return; $('#frc').textContent = f.rows.length ? `${f.rows.length} people` : ''; el.innerHTML = f.rows.length ? f.rows.map(x => `<div class="lb"><span class="pos">${x.online ? '🟢' : '⚪'}</span><span class="who"><b>${esc(x.n)}</b><small>${esc(x.s || '')} · ${x.v.toLocaleString()} pts</small></span><button class="btn btn-ghost mini-btn" data-chal="${x.id}">⚔️</button></div>`).join('') : `<div class="empty"><b>No friends yet</b>Invite people with your link, join a squad, or send a challenge. They show up here.</div><div style="padding:0 16px 16px"><button class="btn btn-wa" id="frInv">${IC.wa}Invite friends</button></div>`; el.querySelectorAll('[data-chal]').forEach(b => b.onclick = () => pickChallenge([+b.dataset.chal])); const fi = $('#frInv'); if (fi) fi.onclick = inviteSheet; }).catch(() => {});
  $('#sqCreate').onclick = async () => { try { const r = await api('/api/squad/create', { name: $('#sqName').value }); S.squad = r.code; await loadMe(); renderApp(); squadShare(r.code, r.name); if (r.newBadges?.length) { confetti(80); toast('New badge: Squad up 🤝'); } } catch (e) { toast(e.message); } };
  $('#sqJoin').onclick = async () => { try { const r = await api('/api/squad/join', { code: $('#sqCode').value }); S.squad = r.code; await loadMe(); renderApp(); toast(`You joined ${r.name}`); } catch (e) { toast(e.message); } };
  if (S.squad && sq.length) {
    try {
      const r = await api('/api/squad/' + S.squad); track('squad_view', { code: r.code });
      const notYet = r.rows.filter(x => x.today == null).map(x => x.n);
      $('#sqb').innerHTML = `<div class="board">${r.rows.map((x, i) => `<div class="lb ${x.me ? 'me' : ''}"><span class="pos ${i < 3 ? 'p' + (i + 1) : ''}">${i + 1}</span><span class="who"><b>${esc(x.n)}${x.me ? ' (you)' : ''}</b><small>${r.day ? (x.today != null ? `Today: ${x.today}/7` : "Hasn't played today") : ''}</small></span><span class="val">${x.v.toLocaleString()}</span></div>`).join('')}</div>
        <div class="btn-row" style="margin-top:10px"><button class="btn btn-wa" id="sqNudge">${IC.wa}Nudge squad</button><button class="btn btn-ghost" id="sqInv">Add people</button></div>
        <p class="foot">Squad code <b style="color:#fff">${r.code}</b> · <a href="#" id="sqLeave">Leave squad</a></p>`;
      $('#sqInv').onclick = () => squadShare(r.code, r.name);
      $('#sqNudge').onclick = () => {
        const msg = r.day && notYet.length ? `${r.name} on 25 Days of Naija 🇳🇬\nDay ${r.day} is open! Still waiting for: ${notYet.join(', ')} 👀\nPlay now: ${location.origin}/?squad=${r.code}` : `${r.name} leaderboard on 25 Days of Naija 🇳🇬\n${r.rows.slice(0, 5).map((x, i) => `${i + 1}. ${x.n}: ${x.v}`).join('\n')}\nJoin us: ${location.origin}/?squad=${r.code}`;
        track('share', { channel: 'squad_nudge', squad: r.code }); window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
      };
      $('#sqLeave').onclick = async (e) => { e.preventDefault(); if (!confirm(`Leave ${r.name}?`)) return; await api('/api/squad/leave', { code: r.code }); S.squad = null; await loadMe(); renderApp(); };
    } catch (e) { $('#sqb').innerHTML = `<div class="card">${esc(e.message)}</div>`; }
  }
}
function squadShare(code, name) {
  const link = `${location.origin}/?squad=${code}&ref=${S.me.user.refCode}`;
  const text = `Join our squad "${name}" on 25 Days of Naija 🇳🇬 One quick Naija quiz every evening in December. Let's see who's the smartest in this group! ${link}`;
  const bg = sheet(`<h3>Share ${esc(name)}</h3><p>Drop this in your group chat. Anyone who opens it joins your squad.</p><div class="linkbox">🔗 <span>${esc(link)}</span></div>
    <div style="display:grid;gap:10px"><button class="btn btn-wa" id="sWa">${IC.wa}Send to WhatsApp group</button><button class="btn btn-line" id="sCopy">Copy link</button></div>`);
  bg.querySelector('#sWa').onclick = () => { track('invite', { channel: 'squad_whatsapp', squad: code }); window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); };
  bg.querySelector('#sCopy').onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Link copied'); } catch { toast(link); } track('invite', { channel: 'squad_copy', squad: code }); };
}

// ---------- me ----------
function viewMe() {
  const m = S.me, u = m.user, have = new Set(m.badges.map(b => b.badge));
  const mins = Math.round(u.timeSpent / 60);
  $('#view').innerHTML = `<div class="wrap">
    <div class="profile"><div class="avatar">${esc(u.nickname[0].toUpperCase())}</div><div><h2>${esc(u.nickname)}</h2><small>${esc(u.state || '')}${u.school ? ' · ' + esc(u.school) : ''} · ${esc(u.phone)}</small></div></div>
    <div class="stats4">
      <div><b>${u.points.toLocaleString()}</b><span>Points${u.rank ? ` · #${u.rank}` : ''}</span></div>
      <div><b>🔥 ${u.streak}</b><span>Streak · best ${u.bestStreak}</span></div>
      <div><b>${m.stats.accuracy}%</b><span>Accuracy · ${m.stats.rounds} rounds</span></div>
      <div><b>${u.refs}</b><span>Friends invited</span></div>
    </div>
    <div class="section-title"><h2>Badges</h2><span>${have.size} of ${Object.keys(m.allBadges).length}</span></div>
    <div class="badges">${Object.entries(m.allBadges).map(([k, b]) => `<div class="badge ${have.has(k) ? 'on' : ''}" title="${esc(b[2])}" data-badge="${k}"><span class="e">${b[0]}</span><b>${esc(b[1])}</b></div>`).join('')}</div>
    <div class="card" style="margin-top:18px">
      <div class="toggle-row"><span><b>${t('pidgin')}</b><small>Switch the app to Pidgin</small></span><button class="switch ${S.lang === 'pg' ? 'on' : ''}" id="tLang"></button></div>
      <div class="toggle-row"><span><b>${t('sound')}</b><small>Ticks, dings and buzzes</small></span><button class="switch ${S.sound ? 'on' : ''}" id="tSound"></button></div>
      <div class="toggle-row"><span><b>${t('reminders')}</b><small>A message when each door opens</small></span><button class="switch ${u.waOptin ? 'on' : ''}" data-wa></button></div>
      ${S.installEvt ? `<div class="toggle-row"><span><b>Add to home screen</b><small>Opens like an app</small></span><button class="btn btn-ink" style="width:auto;padding:10px 14px;font-size:15px" data-install>Add</button></div>` : ''}
    </div>
    <div class="btn-row" style="margin-top:12px"><button class="btn btn-ghost" id="how">How it works</button><button class="btn btn-ghost" id="inv">Invite</button></div>
    <p class="foot">You've spent ${mins < 1 ? 'under a minute' : mins + ' min'} here. <a href="#" id="out">Sign out</a></p>
  </div>`;
  bindCommon();
  document.querySelectorAll('[data-badge]').forEach(b => b.onclick = () => { const x = m.allBadges[b.dataset.badge]; toast(`${x[0]} ${x[1]}: ${x[2]}`); });
  $('#tLang').onclick = async () => { S.lang = S.lang === 'pg' ? 'en' : 'pg'; ls.set('lang', S.lang); track('lang', { lang: S.lang }); api('/api/settings', { lang: S.lang }).catch(() => {}); renderApp(); };
  $('#tSound').onclick = () => { S.sound = !S.sound; ls.set('sound', S.sound); track('sound', { on: S.sound }); if (S.sound) beep('ok'); viewMe(); };
  $('#how').onclick = howTo; $('#inv').onclick = inviteSheet;
  $('#out').onclick = (e) => { e.preventDefault(); if (!confirm('Sign out? Sign back in with the same number and nickname.')) return; S.token = null; ls.set('token', null); renderOnboarding(); };
}

boot();
})();
