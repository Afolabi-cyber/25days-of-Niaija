/* Detty December: player app */
(() => {
'use strict';
const PRIZE_TEXT = 'Top 10 players every day win airtime';
const LIGHTS = (n = 16) => `<div class="lights" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="--x:${(i + .5) * (100 / n)}%;--y:${i % 2 ? 9 : 4}px;--c:${['#ff4d5e', '#ffd166', '#5ee08c', '#fff6d5', '#6ec6ff'][i % 5]};--d:${(i % 4) * .45}s"></i>`).join('')}</div>`;
const $ = (s, el = document) => el.querySelector(s);
const root = $('#root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get: (k, d) => { try { const v = localStorage.getItem('n25_' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('n25_' + k, JSON.stringify(v)); } catch {} } };

const S = { token: ls.get('token', null), me: null, tab: 'home', board: 'today', squad: null, lang: ls.get('lang', 'en'), sound: ls.get('sound', true), skew: 0, installEvt: null };

// ---------- words ----------
const W = {
  en: {
    play: 'Home', trip: 'Journey', party: 'Party', market: 'Market', ranks: 'Ranks', squads: 'Friends', me: 'Me',
    dayOpen: 'Gift box {d} is open', dayOpenSub: '7 Naija questions, 10 seconds each. The Ask Mummy one is worth double.', playDay: 'Open gift box {d} 🎁',
    opensIn: 'Gift box {d} opens in', preTitle: 'Detty December is loading', preSub: 'The first gift box opens on 1 December at 7pm. Warm up now, send gifts and bring your people.',
    playedTitle: 'You scored {c}/7 today', playedSub: 'Day {n} opens tomorrow at 7pm. Keep your streak alive.', lastPlayed: 'Crossover round opens 31 December at 7pm.',
    wrapTitle: "That's a wrap for December", wrapSub: 'Thank you for playing. See you next December.',
    shareWa: 'Share on WhatsApp', shareImg: 'Post to status', invite: 'Invite friends',
    inviteTitle: 'Bring your people, protect your streak', inviteSub: 'Every friend who joins with your link and plays a round gives you +200 points, +200 coins and a streak saver.',
    calendar: 'Your gift boxes', calendarSub: 'A new box at 7pm', warmTitle: 'Warm-up round', warmSub: 'Practise anytime. No points, just vibes.',
    ahead: '{a} is ahead of {b} today', correct: 'Correct!', wrong: 'Not this one', timeout: "Time's up", pct: '{p}% of players got this',
    mummyNote: 'Ask Mummy bonus: 20 seconds and double points. You can shout for help at home.',
    v7: 'Perfect round!', v5: 'Very good!', v3: 'Not bad at all', v0: 'Tomorrow will be better',
    practice: 'Practice round. Points only count on the day.', reminders: 'Remind me on WhatsApp at 7pm', pidgin: 'Pidgin mode', sound: 'Sound effects',
    start: 'Start playing', crossover: 'New Year Crossover', crossSub: '31 Dec, 7pm', streak: 'day streak',
  },
  pg: {
    play: 'Home', trip: 'Journey', party: 'Party', market: 'Market', ranks: 'Ranks', squads: 'Padi', me: 'Me',
    dayOpen: 'Gift box {d} don open', dayOpenSub: '7 Naija questions, 10 seconds each. The Ask Mummy one dey carry double points.', playDay: 'Open gift box {d} 🎁',
    opensIn: 'Gift box {d} go open in', preTitle: 'Detty December dey load', preSub: 'The first gift box go open 1 December by 7pm. Warm up now, carry your people come.',
    playedTitle: 'You score {c}/7 today', playedSub: 'Day {n} go open tomorrow by 7pm. No let your streak die.', lastPlayed: 'Crossover round go open 31 December by 7pm.',
    wrapTitle: 'December don finish o', wrapSub: 'Thank you for playing. We go see next December.',
    shareWa: 'Share for WhatsApp', shareImg: 'Post am for status', invite: 'Invite your people',
    inviteTitle: 'Carry your people come, protect your streak', inviteSub: 'Every friend wey join with your link come play go give you +200 points and one streak saver.',
    calendar: 'Your gift boxes', calendarSub: 'New box every 7pm', warmTitle: 'Warm-up round', warmSub: 'Practise anytime. No points, na just vibes.',
    ahead: '{a} dey lead {b} today', correct: 'You sabi!', wrong: 'E no be am', timeout: 'Time don go', pct: '{p}% of players get am',
    mummyNote: 'Ask Mummy bonus: 20 seconds and double points. Call Mummy make she help you.',
    v7: 'You too sabi!', v5: 'You try well well!', v3: 'E no bad', v0: 'Tomorrow go better',
    practice: 'Na practice. Points dey count only on the day.', reminders: 'Remind me for WhatsApp by 7pm', pidgin: 'Pidgin mode', sound: 'Sound effects',
    start: 'Make we start', crossover: 'New Year Crossover', crossSub: '31 Dec, 7pm', streak: 'day streak',
  },
};
const t = (k, v = {}) => (W[S.lang][k] || W.en[k] || k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');

const STATES = ['Lagos', 'Oyo', 'Ogun', 'Osun', 'Ondo', 'Ekiti', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'Outside Nigeria'];
const SCHOOLS = ['UI Ibadan', 'OAU Ile-Ife', 'UNILAG', 'LASU', 'FUTA', 'OOU Ago-Iwoye', 'LAUTECH', 'UNIOSUN', 'FUNAAB', 'EKSU', 'AAUA', 'Covenant University', 'Babcock University', 'Bowen University', "Redeemer's University", 'Lead City University', 'Yabatech', 'LASUSTECH', 'The Polytechnic Ibadan', 'Federal Poly Ilaro', 'UNILORIN', 'UNIBEN', 'UNN', 'ABU Zaria', 'UNIPORT', 'Other university or poly', 'Secondary school', 'Not in school'];


// Photos: young Nigerians from Pexels (free licence) and landmarks from Wikimedia Commons (credited in the Photo credits sheet).
// Run `node scripts/fetch-photos.js` once to self-host them in /public/photos.
const PHOTOS = [
  { f: 'connect-highfive.jpg', u: 'https://unsplash.com/photos/AB04SBsdHjY/download?w=640', alt: 'Two young women high-fiving and smiling at a cafe table in Lagos', tag: '7/7! High five', by: 'Ninthgrid, Unsplash', src: 'https://unsplash.com/photos/AB04SBsdHjY' },
  { f: 'connect-phone.jpg', u: 'https://unsplash.com/photos/TRkyQgyb4c0/download?w=640', alt: 'A young woman on a couch in Lagos smiling at her phone', tag: 'Day 9 is open', by: 'Ninthgrid, Unsplash', src: 'https://unsplash.com/photos/TRkyQgyb4c0' },
  { f: 'connect-couch.jpg', u: 'https://unsplash.com/photos/pMxig9KfxsM/download?w=640', alt: 'Two young women sitting together on a white couch in Lagos', tag: 'Who sabi pass?', by: 'Ninthgrid, Unsplash', src: 'https://unsplash.com/photos/pMxig9KfxsM' },
  { f: 'connect-squad.jpg', u: 'https://unsplash.com/photos/d6-bg-lCvZY/download?w=640', alt: 'A group of young people around a table in Lagos', tag: 'Squad vs squad', by: 'Ninthgrid, Unsplash', src: 'https://unsplash.com/photos/d6-bg-lCvZY' },
  { f: 'connect-owambe.jpg', u: 'https://unsplash.com/photos/pw2mnwI1V9s/download?w=640', alt: 'Two young men in suits smiling at each other at a Nigerian wedding', tag: 'Detty December', by: 'Tope A. Asokere, Unsplash', src: 'https://unsplash.com/photos/pw2mnwI1V9s' },
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
// While a game is on screen we keep the player's eyes on the game: toasts shrink to a small
// strip at the very top edge, can be tapped away, and celebration emojis stay out of the middle.
const PLAY_SEL = '#game, #duel, .drive:not(.attract), .j3d, .lvov, .party, .overlay.tq, .overlay.km';
const playing = () => !!document.querySelector(PLAY_SEL);
let toastT;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.toggle('quiet', playing()); el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), playing() ? 1800 : 2600);
}
document.addEventListener('click', (e) => { if (e.target.id === 'toast') { e.target.classList.remove('show'); clearTimeout(toastT); } });
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
  const cols = ['#F5B83D', '#17A35B', '#ffffff', '#E5483C', '#2E9B72'];
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
  const d = document.createElement('div'); d.className = 'bigmoji' + (playing() ? ' corner' : ''); d.textContent = e; document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
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
  party: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 9 7l8 8-13 5z"/><path d="M14 4c.5 1.5 0 3-1.5 3.5M19 9c-1.5-.5-3 0-3.5 1.5M18 3l.5 1.5M21 6l-1.5.5M15 2v1"/></svg>',
  market: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M2 9h20M12 9v12M12 9c-1.5-4-6-5-6-2s4 2 6 2c2 0 6 1 6-2s-4.5-2-6 2"/></svg>',
  trip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M12 14.2V21M9.9 11.4 3.4 9.6M14.1 11.4l6.5-1.8"/></svg>',
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
if (params.get('drive')) ls.set('pendingDrive', 1);
if (params.get('know')) ls.set('pendingKnow', String(params.get('know')).slice(0, 12));
if (params.toString()) history.replaceState(null, '', '/');

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });
window.addEventListener('appinstalled', () => track('installed'));
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

let FUN = null;
const loadFun = async () => (FUN = FUN || await import('/fun.js'));
const funCtx = () => ({ api, toast, track, beep, confetti, sheet, me: S.me && S.me.user });
let LOVE = null;
const loadLove = async () => (LOVE = LOVE || await import('/love.js'));
const loveCtx = () => ({ api, toast, track, beep, confetti, sheet, me: S.me && S.me.user, refLink: S.me ? `${location.origin}/?ref=${S.me.user.refCode}` : location.origin, onClose: refresh });
async function openLove(start) { try { (await loadLove()).openLove(loveCtx(), start); } catch (e) { console.error(e); toast('Love Corner no fit open. Try again.'); } }
async function handlePendingRoom() { const pr = ls.get('pendingRoom', null); if (pr) { ls.set('pendingRoom', null); setTimeout(() => openLove({ room: pr }), 700); } }
async function openNotes() { try { (await loadFun()).openNotes({ ...funCtx(), onClose: refresh }); } catch (e) { console.error(e); toast('Sweet Notes no fit open. Try again.'); } }
async function openTitle() { try { (await loadFun()).openTitle(funCtx()); } catch (e) { console.error(e); toast('Try again.'); } }
async function boot() {
  try { const c = await fetch('/api/config').then(r => r.json()); S.skew = c.now - Date.now(); S.cfg = c; } catch {}
  const nm = location.pathname.match(/^\/n\/([a-z0-9]{4,12})\/?$/i); // a friend's Sweet Notes link: works without an account
  if (nm) { try { return (await loadFun()).noteSendPage(root, nm[1], { api, toast }); } catch (e) { console.error(e); } }
  const bm = location.pathname.match(/^\/b\/([a-z0-9]{4,12})\/?$/i); // a "Be my boo" ask: works without an account
  if (bm) { try { return (await loadLove()).booPage(root, bm[1], { api, toast }); } catch (e) { console.error(e); } }
  const rm = location.pathname.match(/^\/r\/([a-z0-9]{4,12})\/?$/i); // a Gist Room invite: join after sign-in
  if (rm) { ls.set('pendingRoom', rm[1].toLowerCase()); history.replaceState(null, '', '/'); }
  if (!S.token) { renderOnboarding(); setTimeout(() => rocketShow('🎆 Welcome to Detty December!'), 500); return; }
  try {
    await loadMe();
    const pend = ls.get('pendingSquad', null);
    if (pend) { ls.set('pendingSquad', null); try { const r = await api('/api/squad/join', { code: pend }); toast(`You joined ${r.name}`); S.squad = r.code; await loadMe(); } catch (e) { toast(e.message); } }
    track('app_open', { standalone: matchMedia('(display-mode: standalone)').matches });
    renderApp();
    { const y = S.cfg ? S.cfg.year : 2026, n = srvNow(); if (n >= Date.UTC(y, 11, 31, 23) && n < Date.UTC(y + 1, 0, 2) && !ls.get('ny' + y, false)) { ls.set('ny' + y, true); setTimeout(() => { fireworks(10); toast(`Happy New Year ${y + 1}! 🎆🥂`); }, 800); }
      else { setTimeout(() => rocketShow(`🎆 Welcome back, ${S.me.user.nickname}!`), 450);
        if (n >= Date.UTC(y, 11, 24, 23) && n < Date.UTC(y, 11, 26) && !ls.get('xm' + y, false)) { ls.set('xm' + y, true); setTimeout(() => { rain(['🎄', '🎅🏾', '🎁', '✨'], 26); toast('Merry Christmas! 🎄 Send your people a gift'); }, 800); } } }
    const pd = ls.get('pendingDuel', null);
    if (pd) { ls.set('pendingDuel', null); try { await api('/api/duel/join', { code: pd }); duelLobby(pd); } catch (e) { toast(e.message); } }
    handlePendingRoom();
    const pk = ls.get('pendingKnow', null); if (pk) { ls.set('pendingKnow', null); setTimeout(() => takeKnowMe(pk), 600); }
    if (ls.get('pendingDrive', null)) { ls.set('pendingDrive', null); S.tab = 'trip'; renderApp(); setTimeout(() => toast('🚗 Your friend dared you. Beat their time on today\'s road!'), 900); }
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

// ---------- onboarding ----------
async function renderOnboarding() {
  const ref = ls.get('ref', null), sq = ls.get('pendingSquad', null), dl = ls.get('pendingDuel', null);
  let invited = null;
  if (ref || sq || dl) { try { invited = await fetch(`/api/ref/${ref || '-'}?squad=${sq || ''}&duel=${dl || ''}`).then(r => r.json()); } catch {} }
  const P = PHOTOS;
  root.innerHTML = `
  <div class="onb">
    <div class="onb-top"><div class="wordmark"><b>🎄</b><span>Detty December</span></div></div>
    ${LIGHTS(14)}
    <div class="mosaic">
      <div class="mcol">${photoTile(P[1])}${photoTile(P[4])}</div>
      <div class="mcol mid"><div class="mdoor live"><span>1</span>Dec · 7pm</div>${photoTile(P[0], 'tall')}</div>
      <div class="mcol">${photoTile(P[2])}${photoTile(P[3])}</div>
      <div class="fchip f1" aria-hidden="true">⚔️ Ada challenged you</div>
      <div class="fchip f2" aria-hidden="true">🍗 Tobi sent you Christmas chicken</div>
      <div class="fchip f3" aria-hidden="true">🚐 Bayo carried you to Lekki</div>
    </div>
    <div class="onb-hero">
      <h1><span class="n25">Detty</span>December</h1>
      <p class="lede">Nigeria's fun place for Christmas and New Year. Open a gift box quiz every evening, send Christmas gifts, drive to Detty December spots and challenge your people live.</p>
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
      <div><span class="e">🎁</span><span><b>Send Christmas gifts</b>Christmas chicken, hampers, aso ebi and Santa hats for your people.</span></div>
      <div><span class="e">🏆</span><span><b>Win airtime</b>${PRIZE_TEXT}.</span></div>
      <div><span class="e">🤝</span><span><b>Battle your people</b>Squads, states and schools fight for the top spot.</span></div>
    </div>
    <div class="strip-head"><h2>From Lasgidi to Abuja</h2><span>Swipe</span></div>
    <div class="strip">${P.slice(5).map(p => photoTile(p, 'wide')).join('')}</div>
    <p class="foot">Free to play. Made in Nigeria for Detty December. <a href="#" id="credits">Photo credits</a></p>
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
      handlePendingRoom();
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
    <div class="wordmark"><b>🎄</b><span>Detty December</span></div>
    <span class="pill ${u.streak ? 'flame' : 'cold'}" title="Streak">🔥 ${u.streak}</span>
    <span class="pill" title="Points">⭐ ${u.points.toLocaleString()}</span>
    <span class="pill coin" title="Coins to spend on trips, gifts and power-ups">🪙 ${(u.coins || 0).toLocaleString()}</span>
    <button class="avbtn ${S.tab === 'me' ? 'on' : ''}" data-tab="me" aria-label="Me">${u.hat ? '🎅🏾' : esc((u.nickname || '?')[0].toUpperCase())}</button>
  </header>
  ${LIGHTS()}
  <main id="view"></main>
  <nav class="tabbar">
    ${['home', 'trip', 'party', 'market', 'squads'].map(k => `<button data-tab="${k}" class="${S.tab === k || (k === 'squads' && S.tab === 'ranks') ? 'on' : ''}" aria-label="${t(k === 'home' ? 'play' : k)}">${IC[k === 'home' ? 'play' : k]}${t(k === 'home' ? 'play' : k)}${k === 'home' && live && S.tab !== 'home' ? '<span class="dot"></span>' : ''}${k === 'trip' && S.tab !== 'trip' && ((S.me.journey && S.me.journey.unlocked && !S.me.journey.arrived) || (!S.me.journey) || (S.me.drive && !S.me.drive.done)) ? '<span class="dot new">GO</span>' : ''}${k === 'party' && S.me.show && ['lobby', 'ask', 'reveal'].includes(S.me.show.phase) && S.tab !== 'party' ? '<span class="dot new islive">LIVE</span>' : ''}</button>`).join('')}
  </nav>`;
  root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; beep('tap'); track('tab', { tab: S.tab }); renderApp(); scrollTo(0, 0); });
  ({ home: viewHome, trip: viewTrip, party: viewParty, market: viewMarket, ranks: viewRanks, squads: viewSquads, me: viewMe })[S.tab]();
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
      ${d.day === 25 ? '<span class="star">🎅🏾</span>' : ''}<span class="num">${d.day}</span>${sub ? `<span class="sub">${sub}</span>` : d.status === 'locked' ? `<span class="sub">${IC.lock}</span>` : ''}</button>`;
  }).join('');
  const x = days[26];
  const savers = m.user.savers;
  $('#view').innerHTML = `
  <div class="wrap">
    ${m.show && ['lobby', 'ask', 'reveal'].includes(m.show.phase) ? liveCard(m) : ''}
    ${(m.inbox || []).length ? `<section class="inbox"><div class="ib-head"><b>🔔 For you</b><button id="ibSeen">Clear</button></div>${m.inbox.slice(0, 3).map(i => `<div class="ib-row"><span>${esc(i.text)}</span>${i.link === 'notes' ? `<button class="btn btn-gold ib-go" data-notes>Read</button>` : i.link === 'love' ? `<button class="btn btn-gold ib-go" data-love-go>Open</button>` : i.link === 'drive' || i.link === 'journey' ? `<button class="btn btn-gold ib-go" data-tab-go="trip">${i.link === 'drive' ? 'Drive' : 'See map'}</button>` : i.link ? `<button class="btn btn-gold ib-go" data-duel="${esc(i.link)}">Open</button>` : ''}</div>`).join('')}</section>` : ''}
    ${m.user.giftsNew ? `<button class="lbcard" id="newGifts" style="background:linear-gradient(90deg,#D7263D,#A51C2E);color:#fff"><span>🎁</span><span>You have ${m.user.giftsNew} new gift${m.user.giftsNew > 1 ? 's' : ''}!<small>Tap to open</small></span></button>` : ''}
    <section class="hero">${hero}</section>
    ${m.show && ['lobby', 'ask', 'reveal'].includes(m.show.phase) ? '' : liveCard(m)}
    ${journeyCard(m)}
    ${m.stocking && m.stocking.open ? `<button class="stock" id="stockBtn"><span class="stock-ic">🧦</span><span><b>Your Christmas stocking is full!</b><small>Tap to open. Something different inside every day${m.stocking.streak ? ` · Day ${m.stocking.streak + 1} of 7 for the jackpot` : ''}</small></span><span class="stock-dots">${[0, 1, 2, 3, 4, 5, 6].map(i => `<i class="${i < (m.stocking.streak % 7) ? 'on' : ''}"></i>`).join('')}</span></button>` : ''}
    ${driveCard()}
    ${(() => { const y = S.cfg ? S.cfg.year : 2026, xm = Date.UTC(y, 11, 24, 23), ny = Date.UTC(y, 11, 31, 23), n = srvNow(); return `<div class="cds"><div class="cdp xm"><small>🎄 Christmas in</small><b ${xm > n ? `data-cd="${xm}" data-plain="1">${cdText(xm - n)}` : '>Merry Christmas!'}</b></div><div class="cdp ny"><small>🎆 New Year in</small><b ${ny > n ? `data-cd="${ny}" data-plain="1">${cdText(ny - n)}` : `>Happy ${y + 1}!`}</b></div></div>`; })()}
    ${m.rivalry ? `<div class="rival"><span class="vs">⚔️</span><span>${t('ahead', { a: `<strong>${esc(m.rivalry.leader)}</strong>`, b: `<strong>${esc(m.rivalry.chaser)}</strong>` })}${m.user.state && m.user.state !== m.rivalry.leader ? `. Help ${esc(m.user.state)} climb!` : ''}</span></div>` : ''}
    <div class="section-title"><h2>${t('calendar')}</h2><span>${t('calendarSub')}</span></div>
    <div class="doors">${doors}</div>
    <button class="crossover ${x.status}" data-door="26"><span>🥂 ${t('crossover')}<br><span class="sub">${x.status === 'played' ? `${x.correct}/7` : x.status === 'live' ? 'Play now' : t('crossSub')}</span></span><span>${x.status === 'locked' ? IC.lock : '›'}</span></button>
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
  if ($('#newGifts')) $('#newGifts').onclick = () => { S.tab = 'market'; renderApp(); };
  if ($('#dhHome')) { $('#dhHome').onclick = () => { beep('tap'); S.tab = 'trip'; renderApp(); scrollTo(0, 0); }; startPreview($('#dhMini'), { vehicle: m.drive.daily.vehicle, seed: m.drive.daily.seed, to: m.drive.daily.to, km: 18, homeCity: m.drive.daily.city }); }
  if ($('#stockBtn')) $('#stockBtn').onclick = openStocking;
  if ($('#liveBtn')) $('#liveBtn').onclick = openLive;
  document.querySelectorAll('[data-duel]').forEach(b => b.onclick = () => duelLobby(b.dataset.duel));
  document.querySelectorAll('[data-notes]').forEach(b => b.onclick = openNotes);
  document.querySelectorAll('[data-love-go]').forEach(b => b.onclick = () => openLove());
  if ($('#ibSeen')) $('#ibSeen').onclick = async () => { await api('/api/inbox/seen', {}).catch(() => {}); S.me.inbox = []; renderApp(); };
  $('#howLink').onclick = (e) => { e.preventDefault(); howTo(); };
}
async function openStocking() {
  const b = $('#stockBtn'); if (b) b.disabled = true;
  const ov = document.createElement('div'); ov.className = 'stock-ov'; ov.innerHTML = `<div class="stock-big" id="sbig">🧦</div><p class="stock-tap">Shaking it… 🎄</p>`; document.body.appendChild(ov);
  beep('tap'); buzz([30, 40, 30]);
  try {
    const [r] = await Promise.all([api('/api/stocking', {}), new Promise(res => setTimeout(res, 1300))]);
    if (r.coins != null) coinsTo(r.coins);
    const big = r.n >= 250 || r.kind === 'hat';
    ov.innerHTML = `<div class="stock-card"><button class="sheet-x" aria-label="Close">✕</button><div class="stock-prize">${r.kind === 'coins' ? '🪙' : r.kind === 'hat' ? '🎅🏾' : r.kind === 'gift' ? '🍗' : '⭐'}</div><h3>${esc(r.label)}</h3><p>${r.streak % 7 === 0 ? 'You opened 7 days in a row. Na you be the real Father Christmas!' : `Day ${r.streak} streak · ${7 - (r.streak % 7)} more day${7 - (r.streak % 7) === 1 ? '' : 's'} to the jackpot stocking`}</p><p class="stock-next">A new stocking appears tomorrow. Don't break the chain 🔗</p><button class="btn btn-gold" id="sDone">Oya, thank you!</button></div>`;
    big ? (confetti(200), rain(['🪙', '🎉', '🤑', '🎄'], 30)) : rain(['🪙', '✨', '🎄'], 14); beep('win');
    ov.querySelector('#sDone').onclick = ov.querySelector('.sheet-x').onclick = () => { ov.remove(); refresh(); };
  } catch (e) { ov.remove(); toast(e.message); refresh(); }
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
  const next = S.me.nextAt && S.me.next ? `<div class="next-hook">${S.me.next === 26 ? 'New Year Crossover' : `Gift box ${S.me.next}`} opens in <b data-cd="${S.me.nextAt}" data-plain="1">${cdText(S.me.nextAt - srvNow())}</b></div>` : '';
  ov.innerHTML = `<div class="inner">
    <div class="g-top"><button class="g-close" aria-label="Close">✕</button><span style="font-weight:800">${s.day === 0 ? 'Warm-up' : s.day === 26 ? 'New Year Crossover 🥂' : s.day === 25 ? 'Christmas box 🎅🏾' : `Gift box ${s.day} 🎁`}${s.official ? '' : ' · practice'}</span></div>
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
      <div class="btn-row"><button class="btn btn-ghost" id="shInv">🤝 Challenge</button><button class="btn btn-ghost" id="shGift">🎁 Send a gift</button><button class="btn btn-ghost" id="shTxt">💬 Text</button></div>
      ${S.me.drive ? `<button class="res-drive" id="shDrive"><span>${VEMO[S.me.drive.daily.vehicle]}</span><span><b>${S.me.drive.done ? 'Defend your Drive of the Day time' : 'Next: drive today\'s road'}</b><small>${esc(S.me.drive.daily.from)} → ${esc(S.me.drive.daily.to.name)}${S.me.drive.done ? '' : ' · +50 🪙 when you finish'}</small></span><span class="go">›</span></button>` : ''}
    </div></div>`;
  ov.querySelector('.g-close').onclick = () => { ov.remove(); document.body.style.overflow = ''; refresh(); };
  $('#shWa').onclick = () => shareImage(s);
  $('#shTxt').onclick = () => shareResult(s, 'whatsapp_text');
  $('#shGift').onclick = () => { ov.remove(); document.body.style.overflow = ''; S.tab = 'market'; refresh(); renderApp(); };
  $('#shInv').onclick = () => inviteSheet();
  if ($('#shDrive')) $('#shDrive').onclick = () => { ov.remove(); document.body.style.overflow = ''; S.tab = 'trip'; renderApp(); scrollTo(0, 0); };
  track('result_view', { day: s.day, revisit: !!revisit });
  if (!revisit) {
    if (s.day === 26) { fireworks(9); rain(['🎆', '🥂', '🎉', '✨'], 24); beep('win'); }
    else if (s.correct === 7) { confetti(180); beep('win'); rain(['🎉', '👑', '💯', '🔥', '🎄']); }
    else if (s.correct >= 5) { beep('win'); rain(['👍🏾', '👏🏾', '🔥', '😎'], 16); }
    else if ((s.newBadges || []).length) beep('win');
  }
}
const myLink = () => `${location.origin}/?ref=${S.me.user.refCode}`;
function shareText(s) {
  const grid = s.grid.map(g => g ? '🟩' : '🟥').join('');
  const label = s.day === 0 ? 'Warm-up' : s.day === 26 ? 'New Year Crossover 🥂' : `Gift box ${s.day} 🎁`;
  return `Detty December 🎄 ${label}\n${grid}\n${s.correct}/7${s.official && s.streak ? ` · 🔥 ${s.streak}-day streak` : ''}\nCan you beat me? ${myLink()}`;
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
function drawLights(x, w, y) {
  x.strokeStyle = '#123D30'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, y); for (let i = 120; i <= w + 120; i += 120) x.quadraticCurveTo(i - 60, y + 40, i, y); x.stroke();
  const cols = ['#ff4d5e', '#ffd166', '#5ee08c', '#fff6d5', '#6ec6ff'];
  for (let i = 0; i < 18; i++) { const bx = 30 + i * (w - 60) / 17, by = y + 14 + (i % 2) * 10; x.shadowColor = cols[i % 5]; x.shadowBlur = 24; x.fillStyle = cols[i % 5]; x.beginPath(); x.ellipse(bx, by, 11, 16, 0, 0, 7); x.fill(); }
  x.shadowBlur = 0;
}
async function drawCard(s) {
  try { await document.fonts.load('800 100px "Bricolage Grotesque"'); } catch {}
  const W2 = 1080, H = 1920, c = document.createElement('canvas'); c.width = W2; c.height = H; const x = c.getContext('2d');
  const F = (w, z) => `${w} ${z}px "Bricolage Grotesque", system-ui, sans-serif`;
  x.fillStyle = '#0B2A21'; x.fillRect(0, 0, W2, H);
  const g = x.createRadialGradient(W2 / 2, 0, 50, W2 / 2, 0, 1100); g.addColorStop(0, '#1E7A5A'); g.addColorStop(1, 'rgba(11,42,33,0)'); x.fillStyle = g; x.fillRect(0, 0, W2, H);
  x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 4;
  for (let yy = 40; yy < H; yy += 80) for (let xx = 40; xx < W2; xx += 80) { x.beginPath(); x.arc(xx, yy, 14, 0, 7); x.stroke(); }
  const rr = (X, Y, w, h, r, col) => { x.fillStyle = col; x.beginPath(); x.roundRect(X, Y, w, h, r); x.fill(); };
  drawLights(x, W2, 40);
  rr(90, 150, 120, 120, 32, '#D7263D'); x.font = '72px serif'; x.textAlign = 'center'; x.fillText('🎄', 150, 236);
  x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = F(800, 64); x.fillText('Detty December', 240, 232);
  x.fillStyle = '#CFE8DC'; x.font = F(700, 60); x.fillText(s.day === 0 ? 'Warm-up round' : s.day === 26 ? 'New Year Crossover 🥂' : s.day === 25 ? 'Christmas Day box 🎅🏾' : `Gift box ${s.day} of 25 🎁`, 90, 470);
  x.fillStyle = '#F5B83D'; x.font = F(800, 380); x.fillText(String(s.correct), 70, 820);
  const wNum = x.measureText(String(s.correct)).width; x.fillStyle = '#fff'; x.font = F(800, 160); x.fillText('/7', 80 + wNum, 820);
  x.font = F(800, 72); x.fillText(verdict(s.correct), 90, 950);
  const sz = 116, gap = 20, startX = (W2 - (7 * sz + 6 * gap)) / 2;
  s.grid.forEach((ok, i) => { rr(startX + i * (sz + gap), 1040, sz, sz, 28, ok ? '#17A35B' : '#E5483C'); });
  x.font = F(700, 54); x.fillStyle = '#fff'; let yL = 1330;
  if (s.official && s.streak) { x.fillText(`🔥 ${s.streak}-day streak`, 90, yL); yL += 90; }
  if (s.official && s.dayRank) { x.fillText(`🏆 #${s.dayRank} of ${Number(s.dayPlayers).toLocaleString()} today`, 90, yL); yL += 90; }
  if (S.me.user.state) x.fillText(`📍 Playing for ${S.me.user.state}`, 90, yL);
  rr(90, 1630, 900, 170, 40, '#F5B83D'); x.fillStyle = '#0B2A21'; x.font = F(800, 62); x.fillText('Can you beat me?', 140, 1708);
  x.font = F(600, 40); x.fillText(location.host + '  ·  code ' + S.me.user.refCode, 140, 1768);
  return new Promise(res => c.toBlob(res, 'image/png'));
}

// ---------- sheets ----------
// Every sheet gets a ✕ in the corner, closes on a tap outside, on Escape and on the phone's back button.
// opts.onClose runs however it was closed (button, ✕, outside tap, Escape or back).
function sheet(html, opts = {}) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><button class="sheet-x" aria-label="Close">✕</button>${html}</div>`;
  const remove = bg.remove.bind(bg); let closed = false;
  bg.remove = () => { if (closed) return; closed = true; remove(); if (opts.onClose) opts.onClose(); };
  bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
  bg.querySelector('.sheet-x').onclick = () => bg.remove();
  document.body.appendChild(bg); return bg;
}
// Escape closes the top-most sheet or card.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const sheets = document.querySelectorAll('.sheet-bg'); if (sheets.length) return sheets[sheets.length - 1].remove();
  const x = document.querySelector('.stock-ov .sheet-x, .flight .sheet-x, .d-dlg:not(.hidden) .sheet-x'); if (x) x.click();
});
const intlPhone = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '234' + d.slice(1); if (d.length === 10) d = '234' + d; return d; };
async function drawInvite() {
  try { await document.fonts.load('800 100px "Bricolage Grotesque"'); } catch {}
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const F = (w, z) => `${w} ${z}px "Bricolage Grotesque", system-ui, sans-serif`;
  x.fillStyle = '#0B2A21'; x.fillRect(0, 0, 1080, 1350);
  x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 4; for (let yy = 40; yy < 1350; yy += 80) for (let xx = 40; xx < 1080; xx += 80) { x.beginPath(); x.arc(xx, yy, 14, 0, 7); x.stroke(); }
  const rr = (X, Y, w, h, r, col) => { x.fillStyle = col; x.beginPath(); x.roundRect(X, Y, w, h, r); x.fill(); };
  drawLights(x, 1080, 30);
  const wraps = [['#D7263D', '#F5B83D'], ['#1E7A5A', '#F4D06F'], ['#E0A526', '#D7263D']];
  for (let i = 0; i < 10; i++) { const X = 90 + (i % 5) * 186, Y = 130 + Math.floor(i / 5) * 186, [c, r] = wraps[i % 3]; rr(X, Y, 160, 160, 26, c); x.fillStyle = r; x.fillRect(X + 68, Y, 24, 160); x.fillRect(X, Y + 68, 160, 24); rr(X + 50, Y + 52, 60, 56, 12, '#fff'); x.fillStyle = '#0B2A21'; x.font = F(800, 44); x.textAlign = 'center'; x.fillText(String(i + 1), X + 80, Y + 96); }
  x.textAlign = 'left'; x.fillStyle = '#CFE8DC'; x.font = F(700, 52); x.fillText(`${S.me.user.nickname} is challenging you`, 90, 620);
  x.textAlign = 'left'; x.fillStyle = '#F5B83D'; x.font = F(800, 150); x.fillText('Detty', 80, 780); x.fillStyle = '#fff'; x.fillText('December', 80, 920);
  x.font = F(600, 44); x.fillStyle = '#CFE8DC'; x.fillText('Gift box quizzes, road trips, Christmas gifts', 90, 1010); x.fillText('and live challenges. Who sabi pass? 🎄', 90, 1070);
  rr(90, 1140, 900, 150, 40, '#F5B83D'); x.fillStyle = '#0B2A21'; x.font = F(800, 56); x.fillText(`Join with code ${S.me.user.refCode}`, 140, 1212); x.font = F(600, 38); x.fillText(location.host, 140, 1262);
  return new Promise(res => c.toBlob(res, 'image/png'));
}
function inviteSheet() {
  const link = myLink();
  const text = `Join me on Detty December 🎄 A quick Naija quiz drops every evening in December, plus road trips and challenges. Sign up with my link and you get 100 bonus coins: ${link}`;
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
  sheet(`<h3>How Detty December works</h3><p>A new gift box quiz opens every evening from 1 to 25 December, plus the New Year Crossover on 31 December. In between: road trips, Christmas gifts and challenges with your people.</p>
    <div class="rules">
      <div><span class="e">⏰</span><span><b>New door at 7pm</b><span>Each day's round stays open until the next one drops. Miss it and you can only practise.</span></span></div>
      <div><span class="e">⚡</span><span><b>100 points per right answer</b><span>Plus up to 50 for speed. Answer fast, earn more.</span></span></div>
      <div><span class="e">👵🏾</span><span><b>Ask Mummy question</b><span>The 7th question is old-school Naija. 20 seconds, double points.</span></span></div>
      <div><span class="e">🔥</span><span><b>Streak bonus</b><span>Each day in a row adds 5% to your points, up to 50%.</span></span></div>
      <div><span class="e">💯</span><span><b>Perfect round</b><span>Get all 7 right for +150 bonus points.</span></span></div>
      <div><span class="e">🛟</span><span><b>Streak savers</b><span>If you miss a day, a saver protects your streak. Earn them by inviting friends.</span></span></div>
      <div><span class="e">🎁</span><span><b>Coins buy fun</b><span>Spend coins on Christmas gifts for friends, road trips and power-ups. Your points on the leaderboard never go down.</span></span></div>
      <div><span class="e">🏆</span><span><b>Prizes</b><span>${PRIZE_TEXT}. Prizes go to the number you signed up with.</span></span></div>
    </div><button class="btn btn-gold" onclick="this.closest('.sheet-bg').remove()">Got it</button>`);
}

// ---------- Christmas Market ----------
async function viewMarket() {
  $('#view').innerHTML = `<div class="wrap"><div class="card"><p>Opening the market…</p></div></div>`;
  let M; try { M = await api('/api/market'); } catch (e) { $('#view').innerHTML = `<div class="wrap"><div class="card">${esc(e.message)}</div></div>`; return; }
  S.market = M; coinsTo(M.coins); track('market_view');
  const unopened = M.received.filter(g => !g.opened), itemOf = (id) => M.items.find(i => i.id === id);
  $('#view').innerHTML = `<div class="wrap">
    <section class="mk-hero"><h2>Christmas Market</h2><p>Buy gifts with coins and send them to your people. They get the gift and half its value in coins.</p></section>
    ${unopened.length ? `<button class="lbcard" id="openAll" style="background:linear-gradient(90deg,#D7263D,#A51C2E);color:#fff"><span>🎁</span><span>${unopened.length} gift${unopened.length > 1 ? 's' : ''} waiting for you<small>Tap to open</small></span></button>` : ''}
    ${M.bag.length ? `<div class="section-title"><h2>Your gift bag</h2><span>Bought on the road</span></div><div class="shelf">${M.bag.map(b => { const it = itemOf(b.item); return `<button class="gift" data-bag="${b.item}"><span class="em">${it.emoji}</span><b>×${b.qty}</b><small>${esc(it.name)}<br>Send free</small></button>`; }).join('')}</div>` : ''}
    <div class="section-title"><h2>Gifts</h2><span>🪙 ${M.coins.toLocaleString()}</span></div>
    <div class="mk-grid">${M.items.map(i => `<button class="mk-item ${i.price > M.coins ? 'poor' : ''}" data-item="${i.id}">${i.id === 'hat' && M.hat ? '<span class="own">Wearing</span>' : ''}<span class="em">${i.emoji}</span><b>${esc(i.name)}</b><small>${esc(i.note)}</small><span class="pr">${i.price} 🪙</span></button>`).join('')}</div>
    <div class="section-title"><h2>Gifts you received</h2><span>${M.received.length}</span></div>
    ${M.received.length ? `<div class="shelf">${M.received.map(g => { const it = itemOf(g.item); return `<div class="gift" title="${esc(g.msg || '')}"><span class="em">${it ? it.emoji : '🎁'}</span><small>${it ? esc(it.name) : 'Gift'}<br>from ${esc(g.n)}</small></div>`; }).join('')}</div>` : `<div class="card"><p style="margin:0">No gifts yet. Send one first, Christmas spirit is contagious 😉</p></div>`}
    <p class="foot">You've sent ${M.sent} gift${M.sent === 1 ? '' : 's'}. Send 5 to earn the Father Christmas badge 🎅🏾</p>
  </div>`;
  document.querySelectorAll('[data-item]').forEach(b => b.onclick = () => giftSheet(itemOf(b.dataset.item), false));
  document.querySelectorAll('[data-bag]').forEach(b => b.onclick = () => giftSheet(itemOf(b.dataset.bag), true, M.bag.find(x => x.item === b.dataset.bag).qty));
  if ($('#openAll')) $('#openAll').onclick = () => openGifts(unopened, itemOf);
  if (S.giftTo) { const pre = S.giftTo; S.giftTo = null; setTimeout(() => toast('Tap a gift to send it 🎁'), 300); S.preGift = pre; }
}
function openGifts(list, itemOf) {
  let i = 0;
  const show = () => {
    const g = list[i], it = itemOf(g.item) || { emoji: '🎁', name: 'Gift' };
    const bg = sheet(`<div class="giftpop"><span class="box">${it.emoji}</span><h3>${esc(g.n)} sent you ${esc(it.name)}!</h3>${g.msg ? `<p>"${esc(g.msg)}"</p>` : ''}<p>You also got <b>+${Math.round(((S.market.items.find(x => x.id === g.item) || {}).price || 0) / 2)} coins</b> 🪙</p>
      <button class="btn btn-gold" id="gNext">${i < list.length - 1 ? 'Open next gift 🎁' : 'Merry Christmas! 🎄'}</button></div>`,
      // closing with ✕ / outside tap = "I've seen my gifts", so they don't pop up again next time
      { onClose: () => { if (!next) api('/api/market/opened', {}).then(() => { refresh(); viewMarket(); }).catch(() => {}); } });
    let next = false; confetti(90); beep('win');
    bg.querySelector('#gNext').onclick = () => { i++; next = i < list.length; bg.remove(); if (next) show(); };
  };
  show();
}
async function giftSheet(it, fromBag, qty) {
  if (it.id === 'hat' && !fromBag) {
    const choice = sheet(`<div class="giftpop"><span class="box">🎅🏾</span><h3>Santa hat</h3><p>Wear it yourself or send it to someone.</p><div style="display:grid;gap:10px"><button class="btn btn-gold" id="hMe">${S.market.hat ? 'Take off my hat' : 'Wear it myself · 40 🪙'}</button><button class="btn btn-line" id="hSend">Send to a friend</button></div></div>`);
    choice.querySelector('#hMe').onclick = async () => { try { const r = await api('/api/market/wear', {}); coinsTo(r.coins); S.me.user.hat = r.hat; choice.remove(); if (r.hat) { popEmoji('🎅🏾'); beep('win'); } viewMarket(); } catch (e) { toast(e.message); } };
    choice.querySelector('#hSend').onclick = () => { choice.remove(); giftSheet(it, false, null, true); };
    if (arguments[3] !== true) return;
  }
  let F; try { F = await api('/api/friends'); } catch { F = { rows: [] }; }
  const pickd = new Set(S.preGift ? [S.preGift] : []); S.preGift = null;
  const bg = sheet(`<div class="gsend"><div class="giftpop"><span class="box" style="font-size:72px">${it.emoji}</span></div><h3>Send ${esc(it.name)}</h3>
    <p>${fromBag ? `From your gift bag (${qty} left). Free to send.` : `${it.price} 🪙 each. They get ${Math.round(it.price / 2)} coins too.`}</p>
    ${F.rows.length ? `<div class="frl">${F.rows.map(f => `<button data-to="${f.id}" class="${pickd.has(f.id) ? 'on' : ''}"><span>${f.online ? '🟢' : '⚪'}</span><span style="flex:1">${esc(f.n)}</span><span class="tk2">${pickd.has(f.id) ? '✓' : ''}</span></button>`).join('')}</div>
    <textarea id="gmsg" maxlength="140" placeholder="Add a Christmas message (optional)"></textarea>
    <button class="btn btn-gold" id="gGo" style="margin-top:12px" ${pickd.size ? '' : 'disabled'}>Pick who gets it</button>` :
    `<div class="card light"><p style="margin:0">Your friends list is empty. Invite people first, then send them gifts.</p></div><button class="btn btn-wa" id="gInv" style="margin-top:12px">${IC.wa}Invite friends</button>`}</div>`);
  const label = () => { const go = bg.querySelector('#gGo'); if (!go) return; const n = pickd.size; go.disabled = !n || (fromBag && n > qty); go.textContent = !n ? 'Pick who gets it' : fromBag ? (n > qty ? `Only ${qty} in your bag` : `🎁 Send to ${n} ${n > 1 ? 'people' : 'person'}`) : `🎁 Send to ${n} for ${it.price * n} coins`; };
  label();
  bg.querySelectorAll('[data-to]').forEach(b => b.onclick = () => { const id = +b.dataset.to; pickd.has(id) ? pickd.delete(id) : pickd.add(id); b.classList.toggle('on', pickd.has(id)); b.querySelector('.tk2').textContent = pickd.has(id) ? '✓' : ''; beep('tap'); label(); });
  if (bg.querySelector('#gInv')) bg.querySelector('#gInv').onclick = () => { bg.remove(); inviteSheet(); };
  if (bg.querySelector('#gGo')) bg.querySelector('#gGo').onclick = async () => {
    const go = bg.querySelector('#gGo'); go.disabled = true; go.textContent = 'Wrapping your gift…';
    try {
      const r = await api('/api/market/send', { item: it.id, to: [...pickd], msg: bg.querySelector('#gmsg').value, fromBag: !!fromBag });
      coinsTo(r.coins); bg.remove(); popEmoji(it.emoji); rain(['🎁', '🎄', '✨', it.emoji], 20); beep('win');
      toast(`${it.emoji} Sent to ${r.sent} ${r.sent > 1 ? 'people' : 'person'}! +${r.sent * 10} points for being generous`);
      if (r.newBadges && r.newBadges.length) setTimeout(() => toast('New badge: Father Christmas 🎅🏾'), 2600);
      viewMarket();
    } catch (e) { toast(e.message); label(); }
  };
}
// Welcome show: firework rockets + a few 🚀 when someone opens the app (once per visit, never blocks taps).
function rocketShow(greet) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { if (sessionStorage.getItem('n25_rockets')) return; sessionStorage.setItem('n25_rockets', '1'); } catch {}
  const c = $('#confetti'); if (!c) return;
  const D = Math.min(2, devicePixelRatio || 1), Wd = innerWidth * D, Hd = innerHeight * D, x = c.getContext('2d'); c.width = Wd; c.height = Hd;
  const cols = ['#ffd166', '#ff4d5e', '#5ee08c', '#6ec6ff', '#fff6d5', '#c77dff', '#ff9a3c'], kinds = ['peony', 'ring', 'willow', 'heart', 'crackle', 'peony', 'ring'];
  const shells = [], parts = [], rockets = [], R = Math.random, T0 = performance.now();
  // firework shells: launch from the bottom at staggered times
  for (let i = 0; i < 9; i++) shells.push({ at: i * 300 + R() * 160, x: (.12 + R() * .76) * Wd, y: Hd + 10, vx: (R() - .5) * 1.4 * D, vy: -(10.5 + R() * 3.2) * D, ty: (.12 + R() * .32) * Hd, col: cols[i % cols.length], kind: kinds[i % kinds.length], live: false, done: false });
  // cartoon rockets zooming across
  for (let i = 0; i < 3; i++) { const left = i % 2 === 0; rockets.push({ at: 250 + i * 650, x: left ? -40 * D : Wd + 40 * D, y: Hd * (.75 + R() * .2), vx: (left ? 1 : -1) * (6 + R() * 2) * D, vy: -(7.5 + R() * 2) * D, live: false, done: false }); }
  const add = (p) => parts.push(Object.assign({ drag: .985, grav: .045 * D, size: 2.2 * D, flick: false }, p));
  function burst(s) {
    beep('tick');
    const n = s.kind === 'willow' ? 70 : s.kind === 'crackle' ? 50 : 80;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 2 * i / n + R() * .05; let sp = (s.kind === 'ring' ? 4.2 : 2 + R() * 3.4) * D, vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
      if (s.kind === 'heart') { const t = a, hx = 16 * Math.sin(t) ** 3, hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); vx = hx * .26 * D; vy = hy * .26 * D; }
      add({ x: s.x, y: s.y, vx, vy, life: s.kind === 'willow' ? 120 + R() * 40 : 70 + R() * 25, max: 140, col: s.kind === 'willow' ? '#ffd27a' : s.kind === 'crackle' ? '#fff6d5' : (R() < .25 ? '#ffffff' : s.col), drag: s.kind === 'willow' ? .97 : .985, grav: (s.kind === 'willow' ? .06 : .045) * D, flick: s.kind === 'crackle' || R() < .15, size: (s.kind === 'willow' ? 1.8 : 2.4) * D });
    }
    add({ x: s.x, y: s.y, vx: 0, vy: 0, life: 10, max: 10, col: '#ffffff', size: 26 * D, grav: 0, flash: true });
  }
  if (greet) { const g = document.createElement('div'); g.className = 'rk-greet'; g.textContent = greet; document.body.appendChild(g); setTimeout(() => g.remove(), 3800); }
  (function loop(now) {
    const t = now - T0; x.clearRect(0, 0, Wd, Hd); x.globalCompositeOperation = 'lighter';
    for (const s of shells) {
      if (s.done || t < s.at) continue; s.live = true;
      s.x += s.vx; s.y += s.vy; s.vy += .12 * D;
      add({ x: s.x + (R() - .5) * 2 * D, y: s.y + 6 * D, vx: (R() - .5) * .6 * D, vy: R() * 1.2 * D, life: 18 + R() * 10, max: 28, col: '#ffcf8a', size: 1.6 * D, grav: .02 * D });
      x.fillStyle = '#fff6d5'; x.beginPath(); x.arc(s.x, s.y, 3 * D, 0, 7); x.fill();
      if (s.y <= s.ty || s.vy >= -1 * D) { s.done = true; burst(s); }
    }
    for (const r of rockets) {
      if (r.done || t < r.at) continue; r.live = true; r.x += r.vx; r.y += r.vy; r.vy += .05 * D;
      const ang = Math.atan2(r.vy, r.vx);
      for (let k = 0; k < 3; k++) add({ x: r.x - Math.cos(ang) * 18 * D, y: r.y - Math.sin(ang) * 18 * D, vx: -Math.cos(ang) * (1 + R() * 2) * D + (R() - .5) * D, vy: -Math.sin(ang) * (1 + R() * 2) * D + (R() - .5) * D, life: 22 + R() * 14, max: 36, col: k ? '#ffb347' : '#ff5a36', size: (2.5 + R() * 2) * D, grav: -.01 * D, drag: .95 });
      x.save(); x.globalCompositeOperation = 'source-over'; x.translate(r.x, r.y); x.rotate(ang + Math.PI / 4); x.font = `${34 * D}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🚀', 0, 0); x.restore();
      if (r.y < -60 * D || r.x < -80 * D || r.x > Wd + 80 * D) r.done = true;
    }
    for (const p of parts) {
      if (p.life <= 0) continue; p.x += p.vx; p.y += p.vy; p.vx *= p.drag; p.vy = p.vy * p.drag + p.grav; p.life--;
      let a = Math.min(1, p.life / (p.max * .5)); if (p.flick && R() < .35) a *= .2;
      if (p.flash) { x.globalAlpha = p.life / 10 * .5; const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6); continue; }
      x.globalAlpha = a; x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, p.size, 0, 7); x.fill();
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    if (parts.length > 1800) { const live = parts.filter(p => p.life > 0); parts.length = 0; parts.push(...live); }
    const busy = shells.some(s => !s.done) || rockets.some(r => !r.done) || parts.some(p => p.life > 0);
    if (busy && t < 7000) requestAnimationFrame(loop); else x.clearRect(0, 0, Wd, Hd);
  })(T0);
}
function fireworks(bursts = 7) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('#confetti'), x = c.getContext('2d'), D = devicePixelRatio; c.width = innerWidth * D; c.height = innerHeight * D;
  const cols = ['#ffd166', '#ff4d5e', '#5ee08c', '#6ec6ff', '#fff6d5', '#c77dff'], P = [];
  for (let b = 0; b < bursts; b++) setTimeout(() => { const cx = (.15 + Math.random() * .7) * c.width, cy = (.15 + Math.random() * .4) * c.height, col = cols[b % cols.length]; for (let i = 0; i < 60; i++) { const a = Math.PI * 2 * i / 60, sp = (2 + Math.random() * 3) * D; P.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 70 + Math.random() * 20, col }); } beep('tick'); }, b * 380);
  let f = 0;
  (function loop() {
    x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, c.width, c.height);
    for (const p of P) { if (p.life <= 0) continue; p.x += p.vx; p.y += p.vy; p.vy += .04 * D; p.vx *= .985; p.life--; x.globalAlpha = Math.max(0, p.life / 80); x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, 2.4 * D, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    if (++f < 60 * (bursts * .4 + 2)) requestAnimationFrame(loop); else x.clearRect(0, 0, c.width, c.height);
  })();
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
  const txt = `⚔️ ${S.me.user.nickname} don challenge you: "${v.title}" on Detty December 🎄 Tap to accept and play. New players get 100 bonus coins: ${duelLink(v.code)}`;
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
    <polygon points="${poly}" fill="#155C45" stroke="#2E9B72" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="${poly}" fill="url(#adp)"/>
    <path d="${line(NIGER)}" fill="none" stroke="#4FB6E0" stroke-width="3" stroke-linecap="round" opacity=".7"/><path d="${line(BENUE)}" fill="none" stroke="#4FB6E0" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    ${CITIES.map(([n, lo, la]) => `<g opacity=".55"><circle cx="${MX(lo)}" cy="${MY(la)}" r="2.5" fill="#CFE8DC"/><text x="${MX(lo) + 5}" y="${MY(la) - 5}" class="mapcity">${n}</text></g>`).join('')}
    ${extra}
    ${places.map(p => { const [dx, dy] = PIN_NUDGE[p.id] || [0, 0]; const x = MX(p.lon) + dx, y = MY(p.lat) + dy; return `<g class="pin ${p.visited ? 'seen' : ''}" data-place="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)}"><circle cx="${x}" cy="${y}" r="15"/><text x="${x}" y="${y + 5.5}" text-anchor="middle" class="pinmoji">${p.emoji}</text>${p.visited ? `<circle cx="${x + 11}" cy="${y - 11}" r="6.5" class="tick"/><text x="${x + 11}" y="${y - 8}" text-anchor="middle" class="tickt">✓</text>` : ''}</g>`; }).join('')}
    ${here ? `<g class="you"><circle cx="${MX(here.lon)}" cy="${MY(here.lat)}" r="9" class="youring"/><circle cx="${MX(here.lon)}" cy="${MY(here.lat)}" r="6" class="youdot"/></g>` : ''}
  </svg>`;
}
const imgTag = (ph, alt, cls = '') => `<img class="${cls}" src="/photos/${ph.f}" data-remote="${ph.u}" alt="${esc(alt)}" loading="lazy" onerror="if(this.dataset.remote&&this.src!==this.dataset.remote){this.src=this.dataset.remote}else{this.classList.add('nophoto')}">`;
// ---------- Detty Drive: the Drive tab (Drive of the Day, free rides, garage, road trips) ----------
const fmtT = (s, dec) => { s = Math.max(0, +s || 0); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${(dec ? r.toFixed(1) : Math.floor(r).toString()).padStart(dec ? 4 : 2, '0')}`; };
const VEMO = { okada: '🛵', keke: '🛺', ride: '🚗', danfo: '🚐' }, VNAME = { okada: 'Okada', keke: 'Keke', ride: 'Car', danfo: 'Danfo' };
function garageOpts(g) {
  g = g || (S.drive && S.drive.garage) || (S.me && S.me.drive && S.me.drive.garage) || {};
  const shop = S.drive && S.drive.shop;
  const hex = shop && shop.colors[g.col] ? shop.colors[g.col][0] : ({ white: '#E8EDF5', black: '#1E1E1E', silver: '#AAB3BD', red: '#C0392B', blue: '#2B59C3', green: '#1E8449', gold: '#D4A017', xmas: '#D7263D', purple: '#6C3483', naija: '#008751' })[g.col] || '#E8EDF5';
  return { colHex: hex, plate: g.plate, sticker: g.sticker, horn: g.horn };
}
function startPreview(el, o = {}) { if (!el || !window.NaijaDrive || !NaijaDrive.preview) return; requestAnimationFrame(() => NaijaDrive.preview(el, { garage: garageOpts(), ...o })); }
function driveCard() {
  const d = S.me.drive; if (!d) return '';
  const dl = d.daily, lead = d.lead;
  return `<button class="dh-home" id="dhHome" aria-label="Open Detty Drive">
    <div class="dh-mini" id="dhMini"><span class="dh-live"><i></i>Live road</span></div>
    <div class="dh-home-t"><small>🚗 Drive of the Day</small>
      <b>${d.done ? 'You drove today. Defend your time!' : `${VEMO[dl.vehicle]} ${esc(dl.from)} to ${esc(dl.to.name)}`}</b>
      <span>${lead ? `👑 ${esc(lead.n)} leads with ${fmtT(lead.total)}` : 'Nobody has driven it yet. Be the first!'}</span></div>
    <span class="dh-home-go">${d.done ? 'Beat it' : 'Drive'}</span></button>`;
}
async function viewTrip() {
  $('#view').innerHTML = `<div class="wrap"><div class="dh-screen dh-skel"></div><div class="card"><p>Starting the engine…</p></div></div>`;
  let T, D, J;
  try { [T, D, J] = await Promise.all([api('/api/trip'), api('/api/drive'), api('/api/journey')]); } catch (e) { $('#view').innerHTML = `<div class="wrap"><div class="card">${esc(e.message)}</div></div>`; return; }
  S.trip = T; S.drive = D; coinsTo(T.coins); track('drive_hub');
  const d = D.daily, mine = d.mine, ghost = d.ghost, me = S.me.user.nickname;
  const board = (d.friends.length > 1 ? d.friends : d.top).slice(0, 8);
  const here = T.here, seen = T.places.filter(p => p.visited).length;
  const cheapest = (p) => p.quote ? Math.min(...p.quote.modes.filter(m => m.ok).map(m => m.cost)) : null;
  S.journey = J;
  $('#view').innerHTML = `<div class="wrap">
    ${journeySection(J)}
    ${flightCard()}
    <div class="section-title" style="margin-top:22px"><h2>Detty Drive</h2><span>Daily challenge, free rides, garage</span></div>
    <section class="dh">
      <div class="dh-screen" id="dhScreen">
        <span class="dh-live"><i></i>Live road</span>
        <span class="dh-cd">New road in <b data-cd="${d.endsAt}" data-plain="1">${cdText(d.endsAt - srvNow())}</b></span>
        <div class="dh-cap"><small>🏆 Drive of the Day</small><h2>${esc(d.title)}</h2><p>${esc(d.from)} → ${esc(d.to.name)} · ${VEMO[d.vehicle]} ${d.vname}</p></div>
      </div>
      <div class="dh-body">
        <div class="dh-stats">
          <div><small>Your best</small><b>${mine ? fmtT(mine.total, 1) : '—'}</b></div>
          <div><small>Rank today</small><b>${d.rank ? '#' + d.rank : '—'}</b><em>${d.count} driver${d.count === 1 ? '' : 's'}</em></div>
          <div><small>${ghost ? (ghost.friend ? 'Friend to beat' : 'Fastest in Naija') : 'To beat'}</small><b>${ghost ? fmtT(ghost.total, 1) : '—'}</b><em>${ghost ? '👻 ' + esc(ghost.n) : 'No ghost yet'}</em></div>
        </div>
        <button class="btn btn-gold dh-go" id="dhGo">${mine ? '🔁 Beat your time' : '🔑 Start engine'}</button>
        <p class="dh-note">${mine ? 'Beat your best for +20 🪙. Your friends get a notification when you pass them.' : 'Free to play. Finish today\'s road once for +50 🪙. Same road and same traffic for everybody in Nigeria.'}</p>
      </div>
    </section>

    <div class="section-title"><h2>${d.friends.length > 1 ? 'You and your people today' : 'Fastest drivers today'}</h2><span>${d.count} on the road</span></div>
    <div class="card dh-board">
      ${board.length ? board.map((r, i) => `<div class="dh-row ${r.n === me ? 'me' : ''}"><span class="dh-pos">${i === 0 ? '👑' : i + 1}</span><span class="dh-n">${esc(r.n)}${r.n === me ? ' (you)' : ''}</span><span class="dh-c">${r.crashes ? `💥${r.crashes}` : '😎'}</span><b>${fmtT(r.total, 1)}</b></div>`).join('') : '<p class="dh-empty">The road is empty. Drive first and set the time everybody must beat.</p>'}
      <button class="btn btn-wa" id="dhDare">${IC.wa}Dare your friends to beat ${mine ? fmtT(mine.total) : 'you'}</button>
    </div>

    <div class="dh-modes">
      <button data-dm="free"><span class="dm-i">🛣️</span><b>Free ride</b><small>Any ride, any road, day or night. No timer.</small></button>
      <button data-dm="race"><span class="dm-i">🏁</span><b>Race a friend</b><small>Same road at the same time. See them on your bar.</small></button>
      <button data-dm="garage" class="dm-garage"><canvas id="dmCar" width="220" height="130" aria-hidden="true"></canvas><b>Garage</b><small>Colour, plate number, sticker, horn</small></button>
      <button data-dm="trips"><span class="dm-i">🗺️</span><b>Road trips</b><small>Drive to landmarks, collect stamps</small></button>
    </div>
    ${D.tomorrow ? `<div class="dh-tmr"><span class="dh-lock">🔒</span><span><small>Tomorrow's road · opens at midnight</small><b>${esc(D.tomorrow.title)}</b><em>${esc(D.tomorrow.from)} → ${esc(D.tomorrow.to)} · ${VEMO[D.tomorrow.vehicle]} ${D.tomorrow.vname}</em></span></div>` : ''}
    ${D.totals.n ? `<p class="dh-totals">Your driving so far: <b>${D.totals.n}</b> drive${D.totals.n > 1 ? 's' : ''} · <b>${D.totals.fares}</b> passengers · <b>${Math.round(D.totals.secs / 60)}</b> min on Naija roads</p>` : ''}

    <div id="trips"></div>
    <div class="section-title" style="margin-top:22px"><h2>Detty December road trips</h2><span>${seen}/${T.places.length} stamps</span></div>
    <p class="tripsub">Spend your coins on a real trip. Drive by okada, keke, car or danfo, pick up friends at bus stops, buy Christmas gifts from hawkers in go-slow, or fly to far places.</p>
    <div class="here"><span class="hp">📍</span><span><small>You're in</small><b>${here.id === 'home' ? (here.geo ? `Your location, near ${esc(here.city)}` : `Home, ${esc(here.city)}`) : esc(here.name)}</b></span><span class="pill coin">🪙 ${T.coins.toLocaleString()}</span></div>
    ${'geolocation' in navigator && !T.pending && !(here.id === 'home' && here.geo) ? `<button class="btn btn-ghost" id="locBtn" style="margin:8px 0 0">📍 ${here.id === 'home' ? 'Start from my real location' : 'Go back to my location'}</button>` : ''}
    ${T.pending ? `<button class="card light pend" id="pend">🧐 You haven't answered the question at your stop. <b>Answer now</b></button>` : ''}
    <div class="mapwrap">${mapSvg(T.places, here)}</div>
    <p class="maphint">Tap a pin or a place, pick a ride, press <b>Go</b>.</p>
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
    <p class="foot">Drive of the Day and free rides cost nothing. Road trips cost coins. Points on the leaderboard never go down when you spend coins.</p>
  </div>`;
  bindJourney(J);
  if ($('#flOpen')) $('#flOpen').onclick = () => flightSheet(J);
  startPreview($('#dhScreen'), { vehicle: d.vehicle, to: d.to, from: d.from, km: Math.min(d.km, 30), seed: d.seed, homeCity: d.city });
  paintMyCar($('#dmCar'), d.vehicle === 'danfo' ? 'ride' : d.vehicle);
  $('#dhGo').onclick = () => startDrive('daily');
  $('#dhDare').onclick = () => dareDrive();
  document.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => {
    beep('tap'); const m = b.dataset.dm;
    if (m === 'free') freeRideSheet(); else if (m === 'race') newDuel('drive'); else if (m === 'garage') garageSheet(); else $('#trips').scrollIntoView({ behavior: 'smooth' });
  });
  document.querySelectorAll('[data-place]').forEach(el => { el.onclick = () => placeSheet(el.dataset.place); el.onkeydown = (e) => { if (e.key === 'Enter') placeSheet(el.dataset.place); }; });
  if (T.pending) $('#pend').onclick = () => { const p = T.places.find(x => x.id === T.pending.place); postcard({ to: p, quiz: T.pending, coins: T.coins }); };
  if ($('#locBtn')) $('#locBtn').onclick = () => useMyLocation(true);
  $('#askLift').onclick = askLift;
  document.querySelectorAll('[data-lx]').forEach(b => b.onclick = async () => { try { await api('/api/trip/lift/cancel', { id: +b.dataset.lx }); viewTrip(); } catch (e) { toast(e.message); } });
  tickCountdowns();
  if (!T.geo && !T.pending && here.id === 'home' && !S.geoAsked && S.wantTrips) { S.geoAsked = true; useMyLocation(false); }
}
function paintMyCar(cv, vehicle = 'ride', g) { if (!cv || !window.NaijaDrive || !NaijaDrive.paintCar) return; const o = garageOpts(g); NaijaDrive.paintCar(cv, { vehicle, col: o.colHex, plate: o.plate, sticker: o.sticker }); }
function tickCountdowns() { document.querySelectorAll('[data-cd]').forEach(el => { el.textContent = el.dataset.plain ? cdText(+el.dataset.cd - srvNow()) : cd(+el.dataset.cd - srvNow()); }); }

async function startDrive(kind, opt = {}) {
  if (!window.NaijaDrive) return toast('Driving game not loaded');
  beep('tap');
  try {
    if (!S.drive) S.drive = await api('/api/drive');
    const d = S.drive.daily;
    const cfg = kind === 'daily' ? { to: d.to, from: d.from, homeCity: d.city, vehicle: d.vehicle, km: d.km, seed: d.seed, ghost: d.ghost } : opt;
    await api('/api/drive/start', { kind, vehicle: cfg.vehicle });
    track('drive_start', { kind, vehicle: cfg.vehicle });
    const res = await NaijaDrive.start({ ...cfg, mode: kind, garage: garageOpts(), sound: S.sound, coach: !ls.get('coached', false), api, beep, toast, onCoins: coinsTo });
    S.drive = null;
    if (res.quit) { toast('No wahala. The road go still dey 🚗'); return refresh(); }
    driveResult(res, kind, cfg);
  } catch (e) { toast(e.message); }
}
function driveResult(r, kind, cfg) {
  const sv = r.server || {}, daily = kind === 'daily', badges = S.me.allBadges;
  const ov = document.createElement('div'); ov.className = 'overlay dres'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const pen = (r.crashes * 3) + (r.fines * 5) - Math.min(r.fares, 10);
  const total = sv.total != null ? sv.total : r.secs + pen;
  const line = !daily ? 'Free ride. No timer pressure, just Naija roads 😎'
    : sv.error ? esc(sv.error)
    : sv.prev == null ? `Your first run today. <b>+${sv.reward} 🪙</b>`
    : sv.improved ? `New personal best! You were ${fmtT(sv.prev, 1)}. <b>+${sv.reward} 🪙</b>` : `Your best is still <b>${fmtT(sv.prev, 1)}</b>. Try again, you fit do am.`;
  ov.innerHTML = `<div class="inner">
    <div class="dres-shot">${r.snap ? `<img src="${r.snap}" alt="Your car arriving at ${esc(r.to.name)}">` : ''}<div class="dres-stars">${'⭐'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div><button class="g-close" aria-label="Close">✕</button></div>
    <h2 class="dres-h">You don reach ${esc(r.to.name)}! 🎉</h2>
    <div class="dres-time"><small>${daily ? 'Your time today' : 'Time on the road'}</small><b>${fmtT(daily ? total : r.secs, 1)}</b>${daily && sv.rank ? `<span>#${sv.rank} of ${sv.count} drivers in Naija today</span>` : ''}</div>
    <div class="d-sum dres-sum"><span>⏱ Drive <b>${fmtT(r.secs, 1)}</b></span>${r.crashes ? `<span>💥 ${r.crashes} crash${r.crashes > 1 ? 'es' : ''} <b>+${r.crashes * 3}s</b></span>` : '<span>😎 No crash</span>'}${r.fines ? `<span>🚨 ${r.fines} fine${r.fines > 1 ? 's' : ''} <b>+${r.fines * 5}s</b></span>` : ''}${r.fares ? `<span>🧍 ${r.fares} passengers <b>−${Math.min(r.fares, 10)}s</b></span>` : ''}${r.style ? `<span>🔥 Style <b>${r.style}</b></span>` : ''}</div>
    <p class="dres-line">${line}</p>
    ${(sv.newBadges || []).map(b => badges[b] ? `<div class="newbadge"><span class="e">${badges[b][0]}</span><span><b>New badge: ${badges[b][1]}</b><small>${badges[b][2]}</small></span></div>` : '').join('')}
    <div class="res-actions">
      <button class="btn btn-wa" id="drShare">${IC.wa}${daily ? 'Share my time' : 'Share my drive'}</button>
      <div class="btn-row"><button class="btn btn-ghost" id="drAgain">🔁 Drive again</button><button class="btn btn-ghost" id="drDone">Done</button></div>
    </div></div>`;
  const close = () => { ov.remove(); document.body.style.overflow = ''; refresh(); };
  ov.querySelector('.g-close').onclick = close; $('#drDone').onclick = close;
  $('#drAgain').onclick = () => { ov.remove(); document.body.style.overflow = ''; startDrive(kind, cfg); };
  $('#drShare').onclick = async () => { const blob = await drawDriveCard(r, daily ? total : r.secs, daily, sv); const txt = `I drove ${r.from} → ${r.to.name} by ${VNAME[r.vehicle]} in ${fmtT(daily ? total : r.secs, 1)} ${r.crashes ? '🚗' : 'with no scratch 😎'}${daily ? ' on the Detty December Drive of the Day' : ''}. Can you beat me? ${location.origin}/?drive=1&ref=${S.me.user.refCode}`; shareFile(blob, 'detty-drive.png', txt, 'drive', { kind }); track('drive_share', { kind }); };
  if (r.stars === 3 || sv.improved) { confetti(140); beep('win'); }
}
async function drawDriveCard(r, time, daily, sv) {
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d');
  x.fillStyle = '#0B2A21'; x.fillRect(0, 0, 1080, 1350);
  if (r.snap) { const im = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = r.snap; }); if (im) { const sc = Math.max(1080 / im.width, 760 / im.height); x.drawImage(im, (1080 - im.width * sc) / 2, (760 - im.height * sc) / 2, im.width * sc, im.height * sc); } }
  const g = x.createLinearGradient(0, 520, 0, 780); g.addColorStop(0, 'rgba(11,42,33,0)'); g.addColorStop(1, '#0B2A21'); x.fillStyle = g; x.fillRect(0, 520, 1080, 260);
  drawLights(x, 1080, 26);
  x.textAlign = 'left'; x.fillStyle = '#F5B83D'; x.font = '800 40px "Bricolage Grotesque", system-ui, sans-serif'; x.fillText(daily ? '🏆 DETTY DRIVE · DRIVE OF THE DAY' : '🚗 DETTY DRIVE', 70, 830);
  x.fillStyle = '#fff'; x.font = '800 64px "Bricolage Grotesque", system-ui, sans-serif'; x.fillText(`${r.from} → ${r.to.name}`.slice(0, 30), 70, 910);
  x.fillStyle = '#CFE8DC'; x.font = '700 40px "Bricolage Grotesque", system-ui, sans-serif'; x.fillText(`${VEMO[r.vehicle]} ${VNAME[r.vehicle]} · ${'⭐'.repeat(r.stars)}${r.crashes ? ` · ${r.crashes} crash${r.crashes > 1 ? 'es' : ''}` : ' · no scratch'}`, 70, 970);
  x.fillStyle = '#F5B83D'; x.font = '800 200px "Bricolage Grotesque", system-ui, sans-serif'; x.fillText(fmtT(time, 1), 62, 1170);
  if (daily && sv && sv.rank) { x.fillStyle = '#fff'; x.font = '800 44px "Bricolage Grotesque", system-ui, sans-serif'; x.fillText(`#${sv.rank} in Naija today`, 70, 1235); }
  x.fillStyle = '#D7263D'; x.beginPath(); x.roundRect ? x.roundRect(620, 1190, 400, 96, 48) : x.rect(620, 1190, 400, 96); x.fill();
  x.fillStyle = '#fff'; x.font = '800 40px "Bricolage Grotesque", system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('Can you beat me?', 820, 1252);
  x.textAlign = 'left'; x.fillStyle = 'rgba(255,255,255,.7)'; x.font = '700 30px "Bricolage Grotesque", system-ui, sans-serif'; x.fillText(location.host, 70, 1310);
  return new Promise(res => cv.toBlob(res, 'image/png'));
}
async function dareDrive() {
  const d = (S.drive && S.drive.daily) || S.me.drive.daily, mine = S.drive && S.drive.daily.mine;
  const txt = `🚗 Detty Drive: today's road is ${d.from} → ${d.to.name} by ${d.vname}. ${mine ? `I did it in ${fmtT(mine.total, 1)}.` : 'Everybody gets the same road and the same traffic.'} Beat me if you sabi drive 😤 ${location.origin}/?drive=1&ref=${S.me.user.refCode}`;
  track('drive_share', { kind: 'dare' });
  if (navigator.share) { try { await navigator.share({ text: txt }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}
const FREE_ROUTES = [
  { id: 'lekki', name: 'Lekki-Ikoyi Link Bridge', from: 'Ojuelegba', km: 18, city: 'Lagos', e: '🌉' },
  { id: 'theatre', name: 'National Theatre', from: 'Yaba', km: 10, city: 'Lagos', e: '🎭' },
  { id: 'citygate', name: 'Abuja City Gate', from: 'Kubwa', km: 30, city: 'FCT Abuja', e: '🏛️' },
  { id: 'zuma', name: 'Zuma Rock', from: 'Gwagwalada', km: 40, city: 'FCT Abuja', e: '🪨' },
  { id: 'olumo', name: 'Olumo Rock', from: 'Ojota', km: 75, city: 'Lagos', e: '⛰️' },
  { id: 'osun', name: 'Osun Grove', from: 'Ibadan', km: 90, city: 'Oyo', e: '🌳' },
];
function freeRideSheet() {
  let v = 'ride', rt = FREE_ROUTES[0], when = 'now';
  const bg = sheet(`<h3>🛣️ Free ride</h3><p>No timer, no coins needed. Pick your ride, your road and the time of day.</p>
    <div class="fr-lbl">Your ride</div><div class="fr-chips" id="frV">${Object.keys(VEMO).map(k => `<button data-v="${k}" class="${k === v ? 'on' : ''}"><span>${VEMO[k]}</span>${VNAME[k]}</button>`).join('')}</div>
    <div class="fr-lbl">Where to?</div><div class="fr-routes" id="frR">${FREE_ROUTES.map((r, i) => `<button data-r="${i}" class="${i === 0 ? 'on' : ''}"><span>${r.e}</span><b>${r.name}</b><small>from ${r.from}</small></button>`).join('')}</div>
    <div class="fr-lbl">When?</div><div class="fr-chips" id="frW"><button data-w="now" class="on"><span>🕐</span>Right now</button><button data-w="night"><span>🌃</span>Christmas night</button><button data-w="haze"><span>🌫️</span>Harmattan morning</button></div>
    <button class="btn btn-gold" id="frGo">🔑 Start engine</button>`);
  const pick = (sel, attr, fn) => bg.querySelectorAll(`${sel} [data-${attr}]`).forEach(b => b.onclick = () => { bg.querySelectorAll(`${sel} button`).forEach(x => x.classList.remove('on')); b.classList.add('on'); fn(b.dataset[attr]); beep('tap'); });
  pick('#frV', 'v', x => v = x); pick('#frR', 'r', x => rt = FREE_ROUTES[+x]); pick('#frW', 'w', x => when = x);
  bg.querySelector('#frGo').onclick = () => { bg.remove(); startDrive('free', { to: { id: rt.id, name: rt.name }, from: rt.from, homeCity: rt.city, vehicle: v, km: rt.km, phase: when === 'night' ? 'night' : when === 'haze' ? 'day' : undefined, haze: when === 'haze' ? true : when === 'night' ? false : undefined }); };
}
async function garageSheet() {
  let D = S.drive; try { if (!D) D = S.drive = await api('/api/drive'); } catch (e) { return toast(e.message); }
  const shop = D.shop, g = { ...D.garage }, owned = new Set(D.garage.owned || []);
  let veh = 'ride';
  const price = (kind, id) => { const p = (kind === 'c' ? shop.colors : shop.horns)[id][1]; return p && !owned.has(kind + ':' + id) ? p : 0; };
  const bg = sheet(`<h3>🔧 Garage</h3><p>Make the ride your own. Your colour, plate and sticker show on every drive and on your share card.</p>
    <canvas id="gCar" class="g-car" width="640" height="360" aria-label="Your car"></canvas>
    <div class="fr-chips g-veh" id="gV">${Object.keys(VEMO).map(k => `<button data-v="${k}" class="${k === veh ? 'on' : ''}"><span>${VEMO[k]}</span>${VNAME[k]}</button>`).join('')}</div>
    <div class="fr-lbl">Paint</div><div class="g-cols" id="gC">${Object.entries(shop.colors).map(([id, [hex]]) => `<button data-c="${id}" class="${id === g.col ? 'on' : ''}" style="--sw:${hex}" aria-label="${id}">${price('c', id) ? `<em>${price('c', id)}🪙</em>` : ''}</button>`).join('')}</div>
    <div class="fr-lbl">Plate number</div><label class="g-plate"><span>LAGOS</span><input id="gP" maxlength="7" value="${esc(g.plate)}" autocomplete="off" spellcheck="false"><small>CENTRE OF EXCELLENCE</small></label>
    <div class="fr-lbl">Sticker <small>(danfo back glass)</small></div><div class="g-stk" id="gS">${shop.stickers.map(st => `<button data-s="${esc(st)}" class="${st === g.sticker ? 'on' : ''}">${esc(st)}</button>`).join('')}</div>
    <div class="fr-lbl">Horn</div><div class="fr-chips" id="gH">${Object.entries(shop.horns).map(([id, [nm]]) => `<button data-h="${id}" class="${id === g.horn ? 'on' : ''}"><span>📯</span>${nm}${price('h', id) ? ` · ${price('h', id)}🪙` : ''}</button>`).join('')}</div>
    <p class="g-cost" id="gCost"></p>
    <button class="btn btn-gold" id="gSave">Save my ride</button>`);
  const cost = () => price('c', g.col) + price('h', g.horn);
  const draw = () => { paintMyCar(bg.querySelector('#gCar'), veh, { ...g, plate: (bg.querySelector('#gP').value || g.plate) }); const c2 = cost(); bg.querySelector('#gCost').textContent = c2 ? `This costs ${c2} 🪙 · you have ${(S.me.user.coins || 0).toLocaleString()} 🪙` : ''; bg.querySelector('#gSave').textContent = c2 ? `Buy and save · ${c2} 🪙` : 'Save my ride'; };
  const pick = (sel, attr, fn) => bg.querySelectorAll(`${sel} [data-${attr}]`).forEach(b => b.onclick = () => { bg.querySelectorAll(`${sel} button`).forEach(x => x.classList.remove('on')); b.classList.add('on'); fn(b.dataset[attr]); beep('tap'); draw(); });
  pick('#gV', 'v', x => veh = x); pick('#gC', 'c', x => g.col = x); pick('#gS', 's', x => g.sticker = x);
  pick('#gH', 'h', x => { g.horn = x; hornPreview(x); });
  bg.querySelector('#gP').oninput = (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); draw(); };
  bg.querySelector('#gSave').onclick = async () => {
    const plate = bg.querySelector('#gP').value;
    try { const r = await api('/api/garage', { col: g.col, horn: g.horn, sticker: g.sticker, plate }); coinsTo(r.coins); S.drive.garage = r.garage; if (S.me.drive) S.me.drive.garage = r.garage; bg.remove(); toast(r.spent ? `New look unlocked for ${r.spent} 🪙 😎` : 'Your ride is ready 😎'); beep('ok'); if (S.tab === 'trip') viewTrip(); }
    catch (e) { toast(e.message); }
  };
  draw();
}
function hornPreview(id) {
  if (!S.sound) return;
  try { const a = hornPreview.a = hornPreview.a || new (window.AudioContext || window.webkitAudioContext)();
    const seq = { pam: [[415, .14], [415, .14]], danfo: [[392, .09], [392, .09], [392, .09]], trumpet: [[196, .32], [147, .32]], jingle: [[659, .1], [659, .1], [659, .2], [0, .05], [659, .1], [659, .1], [659, .2], [0, .05], [659, .1], [784, .1], [523, .1], [587, .1], [659, .3]] }[id] || [];
    let t = a.currentTime; seq.forEach(([f, d]) => { if (f) { const o = a.createOscillator(), g = a.createGain(); o.type = id === 'trumpet' ? 'sawtooth' : id === 'jingle' ? 'triangle' : 'square'; o.frequency.value = f; g.gain.value = .05; o.connect(g).connect(a.destination); o.start(t); o.stop(t + d); } t += d + .04; });
  } catch {}
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
      vehicle: r.mode.id, garage: garageOpts(), sound: S.sound, coach: !ls.get('coached', false), api, beep, toast, onCoins: coinsTo })
      .then((res) => { coinsTo(S.me.user.coins); if (res && res.newBadges && res.newBadges.length) toast(`New badge: ${S.me.allBadges[res.newBadges[0]][1]} ${S.me.allBadges[res.newBadges[0]][0]}`); postcard(r); });
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
  ov.querySelector('#pcShare').onclick = async () => { const blob = await drawPostcard(p); shareFile(blob, `naija25-${p.id}.png`, `I just visited ${p.name} on Naija Trip 🧳🇳🇬 Play Detty December: ${myLink()}`, 'postcard', { place: p.id }); };
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
  x.fillStyle = '#0B2A21'; x.fillRect(0, 0, 1080, 1350);
  const im = await loadImg(p.photo);
  x.save(); x.beginPath(); x.roundRect(50, 50, 980, 820, 40); x.clip();
  if (im) { const s = Math.max(980 / im.width, 820 / im.height), w = im.width * s, h = im.height * s; x.drawImage(im, 50 + (980 - w) / 2, 50 + (820 - h) / 2, w, h); }
  else { x.fillStyle = '#155C45'; x.fillRect(50, 50, 980, 820); x.font = '300px serif'; x.textAlign = 'center'; x.fillText(p.emoji, 540, 560); x.textAlign = 'left'; }
  x.restore();
  x.save(); x.translate(880, 780); x.rotate(-.18); x.fillStyle = '#F5B83D'; x.beginPath(); x.arc(0, 0, 120, 0, 7); x.fill(); x.strokeStyle = '#0B2A21'; x.lineWidth = 6; x.setLineDash([14, 10]); x.beginPath(); x.arc(0, 0, 100, 0, 7); x.stroke();
  x.fillStyle = '#0B2A21'; x.textAlign = 'center'; x.font = F(800, 34); x.fillText('VISITED', 0, -10); x.font = F(700, 30); x.fillText(p.city, 0, 32); x.restore();
  x.fillStyle = '#CFE8DC'; x.font = F(700, 46); x.fillText(`${S.me.user.nickname} just visited`, 70, 960);
  x.fillStyle = '#fff'; x.font = F(800, 84); x.fillText(p.name.length > 20 ? p.name.slice(0, 19) + '…' : p.name, 70, 1060);
  x.fillStyle = '#F5B83D'; x.beginPath(); x.roundRect(70, 1130, 940, 150, 40); x.fill();
  x.fillStyle = '#0B2A21'; x.font = F(800, 52); x.fillText('Detty December road trip 🎄', 120, 1200); x.font = F(600, 36); x.fillText(location.host + '  ·  code ' + S.me.user.refCode, 120, 1252);
  return new Promise(res => c.toBlob(res, 'image/png'));
}

// ---------- ranks ----------
async function viewRanks() {
  const tabs = [['today', 'Today'], ['overall', 'All time'], ['states', 'States'], ['schools', 'Schools']];
  $('#view').innerHTML = `<div class="wrap"><button class="btn btn-ghost" id="lbBack" style="width:auto;padding:8px 14px;font-size:15px;margin-top:6px">‹ Friends</button><div class="section-title" style="margin-top:8px"><h2>Leaderboard</h2><span id="lbsub"></span></div>
    <div class="seg">${tabs.map(([k, l]) => `<button data-b="${k}" class="${S.board === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="lb"><div class="board"><div class="empty">Loading…</div></div></div></div>`;
  document.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { S.board = b.dataset.b; track('board', { board: S.board }); viewRanks(); });
  $('#lbBack').onclick = () => { S.tab = 'squads'; renderApp(); };
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
    <button class="lbcard" id="toRanks"><span>🏆</span><span>Leaderboard<small>Today, all time, states and schools</small></span></button>
    <div class="section-title"><h2>Challenge your people</h2><span>Live scores</span></div>
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
  $('#toRanks').onclick = () => { S.tab = 'ranks'; renderApp(); };
  api('/api/duels').then(d => { const el = $('#myduels'); if (!el || !d.rows.length) return; el.innerHTML = `<div class="section-title"><h2>Your challenges</h2></div><div class="board">${d.rows.map(x => { const me = x.players.find(p => p.me), lead = x.type === 'drive' ? x.players.filter(p => p.done).sort((a, b) => (a.secs + 3 * a.crashes) - (b.secs + 3 * b.crashes))[0] : x.players.slice().sort((a, b) => b.score - a.score)[0]; return `<div class="lb dl" data-duel="${x.code}"><span class="pos">${x.type === 'drive' ? '🏎️' : x.type === 'abuja' ? '🏛️' : '🌉'}</span><span class="who"><b>${esc(x.title)}</b><small>${x.players.length} player${x.players.length > 1 ? 's' : ''} · ${me && me.done ? (x.allDone ? `${lead ? esc(lead.n) + ' won' : 'Finished'}` : 'Waiting for others') : 'Your turn'}</small></span><span class="val">›</span></div>`; }).join('')}</div>`; el.querySelectorAll('[data-duel]').forEach(r => r.onclick = () => duelLobby(r.dataset.duel)); }).catch(() => {});
  api('/api/friends').then(f => { const el = $('#friends'); if (!el) return; $('#frc').textContent = f.rows.length ? `${f.rows.length} people` : ''; el.innerHTML = f.rows.length ? f.rows.map(x => `<div class="lb"><span class="pos">${x.online ? '🟢' : '⚪'}</span><span class="who"><b>${esc(x.n)}</b><small>${esc(x.s || '')} · ${x.v.toLocaleString()} pts</small></span><button class="btn btn-ghost mini-btn" data-gift="${x.id}">🎁</button><button class="btn btn-ghost mini-btn" data-chal="${x.id}">⚔️</button></div>`).join('') : `<div class="empty"><b>No friends yet</b>Invite people with your link, join a squad, or send a challenge. They show up here.</div><div style="padding:0 16px 16px"><button class="btn btn-wa" id="frInv">${IC.wa}Invite friends</button></div>`; el.querySelectorAll('[data-chal]').forEach(b => b.onclick = () => pickChallenge([+b.dataset.chal])); el.querySelectorAll('[data-gift]').forEach(b => b.onclick = () => { S.giftTo = +b.dataset.gift; S.tab = 'market'; renderApp(); toast('Pick a gift for your person 🎁'); }); const fi = $('#frInv'); if (fi) fi.onclick = inviteSheet; }).catch(() => {});
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
        const msg = r.day && notYet.length ? `${r.name} on Detty December 🎄\nDay ${r.day} is open! Still waiting for: ${notYet.join(', ')} 👀\nPlay now: ${location.origin}/?squad=${r.code}` : `${r.name} leaderboard on Detty December 🎄\n${r.rows.slice(0, 5).map((x, i) => `${i + 1}. ${x.n}: ${x.v}`).join('\n')}\nJoin us: ${location.origin}/?squad=${r.code}`;
        track('share', { channel: 'squad_nudge', squad: r.code }); window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
      };
      $('#sqLeave').onclick = async (e) => { e.preventDefault(); if (!confirm(`Leave ${r.name}?`)) return; await api('/api/squad/leave', { code: r.code }); S.squad = null; await loadMe(); renderApp(); };
    } catch (e) { $('#sqb').innerHTML = `<div class="card">${esc(e.message)}</div>`; }
  }
}
function squadShare(code, name) {
  const link = `${location.origin}/?squad=${code}&ref=${S.me.user.refCode}`;
  const text = `Join our squad "${name}" on Detty December 🎄 One quick Naija quiz every evening in December. Let's see who's the smartest in this group! ${link}`;
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
    <div class="profile"><div class="avatar" style="position:relative">${esc(u.nickname[0].toUpperCase())}${u.hat ? '<span style="position:absolute;top:-22px;left:8px;font-size:36px;transform:rotate(-14deg)">🎅🏾</span>' : ''}</div><div><h2>${esc(u.nickname)}</h2><small>${esc(u.state || '')}${u.school ? ' · ' + esc(u.school) : ''} · ${esc(u.phone)}</small></div></div>
    <div class="stats4">
      <div><b>${u.points.toLocaleString()}</b><span>Points${u.rank ? ` · #${u.rank}` : ''}</span></div>
      <div><b>🔥 ${u.streak}</b><span>Streak · best ${u.bestStreak}</span></div>
      <div><b>${m.stats.accuracy}%</b><span>Accuracy · ${m.stats.rounds} rounds</span></div>
      <div><b>${u.refs}</b><span>Friends invited</span></div>
    </div>
    <div class="section-title"><h2>Badges</h2><span>${have.size} of ${Object.keys(m.allBadges).length}</span></div>
    <div class="badges">${Object.entries(m.allBadges).map(([k, b]) => `<div class="badge ${have.has(k) ? 'on' : ''}" title="${esc(b[2])}" data-badge="${k}"><span class="e">${b[0]}</span><b>${esc(b[1])}</b></div>`).join('')}</div>
    <div class="card" style="margin-top:18px">
      <div class="toggle-row"><span><b>🎅🏾 Santa hat</b><small>${u.hat ? 'Showing on your profile and the leaderboard' : 'Wear one for 40 coins (free if someone gifted you)'}</small></span><button class="switch ${u.hat ? 'on' : ''}" id="tHat"></button></div>
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
  $('#tHat').onclick = async () => { try { const r = await api('/api/market/wear', {}); coinsTo(r.coins); S.me.user.hat = r.hat; if (r.hat) { popEmoji('🎅🏾'); beep('win'); } viewMe(); } catch (e) { toast(e.message); } };
  $('#out').onclick = (e) => { e.preventDefault(); if (!confirm('Sign out? Sign back in with the same number and nickname.')) return; S.token = null; ls.set('token', null); renderOnboarding(); };
}


/* Detty December season features: Journey Home, Owambe Night Live, Party Mode, "How well do you know me?", player questions.
   Loaded before app.js; everything here runs only when app.js calls it, so it can use app.js helpers (S, api, esc, sheet, toast…). */

// ---------- Journey Home ----------
const JM = { x: (lon) => (lon - 2.4) * 40, y: (lat) => (14.1 - lat) * 40 };
const REGIONS = [['South West', ['lagos', 'ibadan', 'abeokuta', 'ijebu', 'akure', 'osogbo', 'ore', 'sagamu']], ['South East', ['enugu', 'onitsha', 'awka', 'owerri', 'aba']],
  ['South South', ['benin', 'asaba', 'warri', 'ph', 'uyo', 'calabar', 'auchi']], ['North', ['abuja', 'ilorin', 'lokoja', 'okene', 'jos', 'akwanga', 'kaduna', 'kano']]];
function journeySvg(J) {
  const T = new Map(J.towns.map(t => [t.id, t])), me = J.me, route = me ? me.path : [];
  const poly = NG.map(([lo, la]) => `${JM.x(lo).toFixed(1)},${JM.y(la).toFixed(1)}`).join(' ');
  const seg = (a, b) => { const A = T.get(a), Bt = T.get(b); return `M${JM.x(A.lon).toFixed(1)} ${JM.y(A.lat).toFixed(1)}L${JM.x(Bt.lon).toFixed(1)} ${JM.y(Bt.lat).toFixed(1)}`; };
  const done = me ? route.slice(0, me.leg + 1) : [];
  const spots = new Map();
  const put = (id, html) => { if (!spots.has(id)) spots.set(id, []); spots.get(id).push(html); };
  (J.friends || []).forEach(f => put(f.arrived ? f.home : f.at, `<g class="jf"><title>${esc(f.n)}</title><circle r="9"/><text y="3.5" text-anchor="middle">${esc(f.n[0].toUpperCase())}</text></g>`));
  const friendsSvg = [...spots.entries()].map(([id, list]) => { const t = T.get(id); return list.map((h, i) => `<g transform="translate(${(JM.x(t.lon) + 12 + i * 13).toFixed(1)},${(JM.y(t.lat) - 12).toFixed(1)})">${h}</g>`).join(''); }).join('');
  const meT = me ? T.get(me.arrived ? me.home : me.at) : null, homeT = me ? T.get(me.home) : null;
  const labels = new Set(me ? [route[0], me.at, me.next, me.home].filter(Boolean) : ['lagos', 'abuja', 'ph', 'kano', 'enugu', 'ibadan']);
  return `<svg viewBox="0 0 500 400" class="ngmap jmap" role="img" aria-label="Map of your journey home">
    <polygon points="${poly}" fill="#155C45" stroke="#2E9B72" stroke-width="3" stroke-linejoin="round"/>
    <path d="${NIGER.map(([lo, la], i) => `${i ? 'L' : 'M'}${JM.x(lo).toFixed(1)} ${JM.y(la).toFixed(1)}`).join(' ')}" fill="none" stroke="#4FB6E0" stroke-width="3" opacity=".6"/>
    <path d="${BENUE.map(([lo, la], i) => `${i ? 'L' : 'M'}${JM.x(lo).toFixed(1)} ${JM.y(la).toFixed(1)}`).join(' ')}" fill="none" stroke="#4FB6E0" stroke-width="3" opacity=".6"/>
    ${J.roads.map(([a, b]) => `<path d="${seg(a, b)}" class="jroad"/>`).join('')}
    ${route.slice(0, -1).map((a, i) => `<path d="${seg(a, route[i + 1])}" class="jroute ${i < (me ? me.leg : 0) ? 'done' : ''}"/>`).join('')}
    ${J.towns.map(t => `<g class="jtown ${route.includes(t.id) ? 'on' : ''} ${done.includes(t.id) ? 'done' : ''}"><circle cx="${JM.x(t.lon).toFixed(1)}" cy="${JM.y(t.lat).toFixed(1)}" r="${route.includes(t.id) ? 4 : 2.4}"/>${labels.has(t.id) ? `<text x="${(JM.x(t.lon) + 6).toFixed(1)}" y="${(JM.y(t.lat) + 13).toFixed(1)}">${esc(t.name)}</text>` : ''}</g>`).join('')}
    ${homeT ? `<text x="${JM.x(homeT.lon).toFixed(1)}" y="${(JM.y(homeT.lat) - 8).toFixed(1)}" text-anchor="middle" class="jhome">🏠</text>` : ''}
    ${friendsSvg}
    ${meT ? `<g class="jme" transform="translate(${JM.x(meT.lon).toFixed(1)},${JM.y(meT.lat).toFixed(1)})"><circle r="15" class="jme-ring"/><circle r="12"/><text y="5" text-anchor="middle">${me.arrived ? '🏠' : '🚗'}</text></g>` : ''}
  </svg>`;
}
function journeySection(J) {
  const me = J.me, T = new Map(J.towns.map(t => [t.id, t]));
  const nm = (id) => T.get(id) ? T.get(id).name : id;
  const friends = (J.friends || []).slice().sort((a, b) => (b.arrived - a.arrived) || (b.leg / b.legs - a.leg / a.legs));
  if (!me) return `<section class="jhero">
      <div class="jhero-t"><small>🏠 Journey Home · December 2026</small><h2>Everybody dey go home for December. Where your own?</h2>
      <p>Pick your hometown and drive there in 3D, one real highway a day. Your friends travel too, and you see who don reach first.</p></div>
      ${journeySvg(J)}
      <button class="btn btn-gold" id="jStart">🧳 Start my journey home</button>
      <p class="jstat">${J.travellers ? `<b>${J.travellers.toLocaleString()}</b> people on the road · <b>${J.arrived.toLocaleString()}</b> don reach home` : 'Be the first person on the road this December 🚗'}</p>
    </section>`;
  const pct = me.kmAll ? Math.round(100 * me.kmDone / me.kmAll) : 0;
  return `<section class="jhero">
    <div class="jhero-t"><small>🏠 Journey Home${me.abroad ? ` · ✈️ IJGB from ${esc(me.abroad)}` : ''}</small>
      <h2>${me.arrived ? `You don reach ${esc(nm(me.home))}! 🎉` : `${esc(nm(me.at))} → ${esc(nm(me.home))}`}</h2>
      <div class="jprog"><i style="width:${me.arrived ? 100 : pct}%"></i></div>
      <p>${me.arrived ? 'Welcome home. Now enjoy December with your people 🥳' : `Day ${me.leg + 1} of ${me.legs} · ${me.kmDone} of ${me.kmAll} km`}</p></div>
    ${journeySvg(J)}
    ${me.arrived ? `<button class="btn btn-wa" id="jShare">${IC.wa}Tell everybody you don reach</button>`
      : me.unlocked ? `<div class="jnext"><span class="jnext-i">🛣️</span><span><small>Today's road</small><b>${esc(nm(me.at))} → ${esc(nm(me.next))}</b><em>${esc(me.road)} · ${me.km} km</em></span></div>
         <div class="jveh" id="jVeh">${[['ride', '🚗', 'Car'], ['danfo', '🚐', 'Danfo'], ['keke', '🛺', 'Keke'], ['okada', '🛵', 'Okada']].map(([k, e, n]) => `<button data-v="${k}" class="${ls.get('jveh', 'ride') === k ? 'on' : ''}">${e}<small>${n}</small></button>`).join('')}</div>
         <button class="btn btn-gold" id="jDrive">🔑 Drive today's leg in 3D</button>`
      : `<div class="jnext locked"><span class="jnext-i">🌙</span><span><small>Today's leg done. Next road opens in</small><b data-cd="${me.nextUnlock}" data-plain="1">${cdText(me.nextUnlock - srvNow())}</b><em>Next: ${esc(nm(me.at))} → ${esc(nm(me.next))} · ${esc(me.road)}</em></span></div>
         ${me.canExpress ? `<button class="btn btn-line" id="jExpress">⚡ Express ticket: drive one more leg today · 60 🪙</button>` : ''}`}
    <div class="jfriends">
      <div class="jf-h"><b>Who don reach where?</b><button class="btn btn-line btn-sm" id="jInvite">+ Invite</button></div>
      ${friends.length ? friends.map(f => `<div class="jf-row"><span class="jf-av">${esc(f.n[0].toUpperCase())}</span><span class="jf-n"><b>${esc(f.n)}</b>${f.ijgb ? ' ✈️' : ''}<small>${f.arrived ? `🏠 Don reach ${esc(nm(f.home))}` : `at ${esc(nm(f.at))} · going to ${esc(nm(f.home))}`}</small></span><span class="jf-p"><i style="width:${Math.round(100 * f.leg / Math.max(1, f.legs))}%"></i></span></div>`).join('')
        : '<p class="jf-empty">None of your friends is on the road yet. Invite them so you can see who reaches home first.</p>'}
    </div>
    <p class="jstat"><b>${J.travellers.toLocaleString()}</b> people on the road · <b>${J.arrived.toLocaleString()}</b> don reach home${J.homes && J.homes.length ? ` · most popular: ${J.homes.slice(0, 3).map(h => esc(nm(h.home))).join(', ')}` : ''}</p>
    ${me.leg === 0 ? '<button class="jchange" id="jChange">Change hometown</button>' : ''}
  </section>`;
}
function bindJourney(J) {
  const go = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  go('jStart', () => journeySetup(J)); go('jChange', () => journeySetup(J));
  go('jDrive', () => driveLeg());
  document.querySelectorAll('#jVeh [data-v]').forEach(b => b.onclick = () => { ls.set('jveh', b.dataset.v); document.querySelectorAll('#jVeh [data-v]').forEach(x => x.classList.toggle('on', x === b)); beep('tap'); });
  go('jInvite', () => inviteSheet());
  go('jShare', () => journeyShare(J));
  go('jExpress', async () => { try { const r = await api('/api/journey/express', {}); coinsTo(r.coins); toast('⚡ Express ticket! One more road today'); viewTrip(); } catch (e) { toast(e.message); } });
}
function journeySetup(J) {
  let origin = 'lagos', home = null;
  const T = new Map(J.towns.map(t => [t.id, t]));
  const bg = sheet(`<h3>🧳 Your journey home</h3><p>Where you dey travel from, and where be home this December?</p>
    <div class="fr-lbl">I'm travelling from</div>
    <div class="fr-chips" id="jsO">${Object.entries(J.origins).map(([id, n], i) => `<button data-o="${id}" class="${i === 0 ? 'on' : ''}"><span>${id === 'abroad' ? '✈️' : '🏙️'}</span>${esc(n)}</button>`).join('')}</div>
    <label class="jsfrom hidden" id="jsFromL">Which city abroad? <input id="jsFrom" maxlength="30" placeholder="London, Houston, Toronto…"></label>
    <div class="fr-lbl">Home for December is</div>
    <div class="jsh" id="jsH">${REGIONS.map(([r, ids]) => `<div class="jsh-r"><small>${r}</small><div>${ids.filter(i => T.get(i)).map(i => `<button data-h="${i}">${esc(T.get(i).name)}</button>`).join('')}</div></div>`).join('')}</div>
    <p class="jsnote" id="jsNote">Pick your hometown to see your route.</p>
    <button class="btn btn-gold" id="jsGo" disabled>Start my journey</button>`);
  const note = () => { const n = bg.querySelector('#jsNote'), b = bg.querySelector('#jsGo'); if (!home) return; const from = origin === 'abroad' ? 'the airport' : J.origins[origin]; const same = origin === home; n.textContent = same ? 'You are already there! Pick another hometown or where you are travelling from.' : `You'll drive from ${from} to ${T.get(home).name}, one highway each day. Reach home before Christmas Eve 🎄`; b.disabled = same; };
  bg.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { bg.querySelectorAll('[data-o]').forEach(x => x.classList.remove('on')); b.classList.add('on'); origin = b.dataset.o; bg.querySelector('#jsFromL').classList.toggle('hidden', origin !== 'abroad'); note(); beep('tap'); });
  bg.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { bg.querySelectorAll('[data-h]').forEach(x => x.classList.remove('on')); b.classList.add('on'); home = b.dataset.h; note(); beep('tap'); });
  bg.querySelector('#jsGo').onclick = async () => {
    try { const r = await api('/api/journey/start', { origin, home, from: bg.querySelector('#jsFrom').value || 'London', restart: true }); bg.remove(); track('journey_start', { origin, home });
      if (r.airport) await flightIntro(r.airport, bg.querySelector('#jsFrom').value || 'London');
      else { confetti(80); toast('🧳 Bags packed! Your first road is open'); }
      S.tab = 'trip'; renderApp(); scrollTo(0, 0);
    } catch (e) { toast(e.message); }
  };
}
// ---------- Detty Air: the 3D flight home ----------
let FL3D = null;
const airportCity = (a) => /Abuja/i.test(a || '') ? 'Abuja' : /Port Harcourt/i.test(a || '') ? 'Port Harcourt' : 'Lagos';
async function boardFlight(from, to) {
  try { FL3D = FL3D || await import('/flight3d.js'); } catch (e) { toast('3D could not load on this phone. Try Chrome, or update your browser.'); return null; }
  track('flight_start', { from, to });
  try { const r = await FL3D.startFlight({ from, to, sound: S.sound, nickname: S.me && S.me.user.nickname, api, beep, toast, onCoins: coinsTo }); refresh(); return r; }
  catch (e) { console.error(e); toast('The plane no fit start on this phone 😅'); return null; }
}
function flightSheet(J) {
  const ab = J && J.me && J.me.abroad, home = J && J.me ? airportCity((J.towns.find(t => t.id === J.me.path[0]) || {}).name) : 'Lagos';
  let from = ab || 'London', to = ab ? home : 'Lagos';
  const CITIES = ['London', 'Houston', 'Toronto', 'Dubai', 'Manchester', 'Atlanta', 'Johannesburg', 'Paris'];
  if (!CITIES.includes(from)) CITIES.unshift(from);
  const bg = sheet(`<h3>✈️ Detty Air</h3><p>Fly home in 3D. Walk the cabin, gist with passengers, visit the cockpit, chop jollof and land for December. Up to +90 🪙 a day.</p>
    <div class="fr-lbl">Flying from</div><div class="fr-chips" id="flF">${CITIES.map(c => `<button data-c="${esc(c)}" class="${c === from ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>
    <div class="fr-lbl">Landing in</div><div class="fr-chips" id="flT">${['Lagos', 'Abuja', 'Port Harcourt'].map(c => `<button data-c="${c}" class="${c === to ? 'on' : ''}">${c}</button>`).join('')}</div>
    <button class="btn btn-gold" id="flBoard">🎫 Board the plane</button>`);
  const chips = (sel, fn) => bg.querySelectorAll(`${sel} [data-c]`).forEach(b => b.onclick = () => { bg.querySelectorAll(`${sel} [data-c]`).forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset.c); beep('tap'); });
  chips('#flF', c => from = c); chips('#flT', c => to = c);
  bg.querySelector('#flBoard').onclick = () => { bg.remove(); boardFlight(from, to); };
}
function flightCard() {
  return `<button class="sq-card fl-card-btn" id="flOpen"><span>✈️</span><span><b>Detty Air: fly home in 3D</b><small>Walk the cabin, visit the captain, chop jollof at 37,000 ft, clap when we land · up to +90 🪙</small></span><span class="go">›</span></button>`;
}
async function flightIntro(airport, city) {
  const r = await boardFlight(city, airportCity(airport));
  if (r) return;
  return new Promise(res => {
    const ov = document.createElement('div'); ov.className = 'flight'; ov.innerHTML = `<div class="flight-sky"><span class="plane">✈️</span></div><div class="flight-t"><button class="sheet-x" aria-label="Close">✕</button><small>${esc(city)} → Naija</small><h2>Ladies and gentlemen, welcome to Nigeria 🇳🇬</h2><p>You just landed at ${esc(airport)}. IJGB status: activated 😎</p><button class="btn btn-gold" id="flGo">Collect my bags</button></div>`;
    document.body.appendChild(ov); beep('win'); ov.querySelector('#flGo').onclick = ov.querySelector('.sheet-x').onclick = () => { ov.remove(); res(); };
  });
}
let J3D = null;
async function driveLeg() {
  beep('tap');
  let leg; try { leg = await api('/api/journey/leg-start', {}); } catch (e) { return toast(e.message); }
  try { J3D = J3D || await import('/journey3d.js'); } catch (e) { return toast('3D could not load on this phone. Try Chrome, or update your browser.'); }
  track('leg_start', { a: leg.from.id, b: leg.to.id });
  const homeName = S.me.towns ? S.me.towns[S.me.journey && S.me.journey.home] : leg.to.name;
  let r;
  try { r = await J3D.startLeg({ ...leg, home: homeName, vehicle: ls.get('jveh', 'ride'), garage: garageOpts(), sound: S.sound, coach: !ls.get('jcoached', false), api, beep, toast, onCoins: coinsTo }); }
  catch (e) { console.error(e); return toast('3D drive stopped: ' + e.message); }
  if (r.quit) { toast('No wahala. The road go still dey 🚗'); return refresh(); }
  townQuestion(leg, r);
}
function townQuestion(leg, r) {
  const ov = document.createElement('div'); ov.className = 'overlay tq'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  ov.innerHTML = `<div class="inner">
    <button class="g-close tq-x" aria-label="Skip the question" title="Skip the question (counts as a wrong answer, the leg still counts)">✕</button>
    ${r.snap ? `<div class="dres-shot"><img src="${r.snap}" alt="Your car arriving at ${esc(leg.to.name)}"><div class="dres-stars">${r.crashes ? '' : '😎'}</div></div>` : ''}
    <h2 class="dres-h">Welcome to ${esc(leg.to.name)}! 🎉</h2>
    <p class="tq-sub">Before you rest, the gateman at ${esc(leg.to.name)} get one question for you 👀</p>
    <div class="card light tq-card"><b>${esc(leg.question.q)}</b><div class="tq-opts">${leg.question.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div></div></div>`;
  // ✕ skips the gateman's question: the leg is saved, the question counts as wrong.
  ov.querySelector('.tq-x').onclick = async () => {
    ov.querySelector('.tq-x').remove(); ov.querySelectorAll('[data-i]').forEach(x => x.disabled = true);
    try { const d = await api('/api/journey/leg-done', { secs: r.secs, crashes: r.crashes, choice: -1 }); coinsTo(d.coins); legResult(ov, leg, r, d); }
    catch (e) { toast(e.message); ov.remove(); document.body.style.overflow = ''; refresh(); }
  };
  ov.querySelectorAll('[data-i]').forEach(b => b.onclick = async () => {
    ov.querySelectorAll('[data-i]').forEach(x => x.disabled = true); const tx = ov.querySelector('.tq-x'); if (tx) tx.remove();
    let d; try { d = await api('/api/journey/leg-done', { secs: r.secs, crashes: r.crashes, choice: +b.dataset.i }); } catch (e) { toast(e.message); ov.remove(); document.body.style.overflow = ''; return refresh(); }
    coinsTo(d.coins);
    const right = leg.question.options.indexOf(d.correctAnswer);
    ov.querySelectorAll('[data-i]').forEach(x => { if (+x.dataset.i === right) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
    beep(d.correct ? 'ok' : 'no');
    setTimeout(() => legResult(ov, leg, r, d), 1100);
  });
}
function legResult(ov, leg, r, d) {
  const badges = S.me.allBadges;
  ov.querySelector('.inner').insertAdjacentHTML('beforeend', `<div class="tq-res">
    <p class="dres-line">${d.correct ? 'Correct! The gateman don open the gate 🙌🏾' : `Ehn ehn! The answer na <b>${esc(d.correctAnswer)}</b>.`}</p>
    <div class="d-sum dres-sum"><span>⏱ <b>${fmtT(r.secs)}</b></span>${r.crashes ? `<span>💥 ${r.crashes}</span>` : '<span>😎 No crash</span>'}<span>🪙 <b>+${d.earned}</b></span><span>⭐ <b>+${d.points}</b></span></div>
    ${d.arrived ? `<div class="arrive"><span>🏠</span><b>You don reach home!</b><small>${esc(d.town)} · ${d.me.legs} days on the road · +300 🪙</small></div>` : `<p class="tq-next">Next road opens at midnight: <b>${esc(S.me.towns[d.me.at])} → ${esc(S.me.towns[d.me.next])}</b></p>`}
    ${(d.newBadges || []).map(b => badges[b] ? `<div class="newbadge"><span class="e">${badges[b][0]}</span><span><b>New badge: ${badges[b][1]}</b><small>${badges[b][2]}</small></span></div>` : '').join('')}
    <div class="res-actions"><button class="btn btn-wa" id="tqShare">${IC.wa}${d.arrived ? 'Tell everybody you don reach' : `Share: I don reach ${esc(leg.to.name)}`}</button><button class="btn btn-ghost" id="tqDone">Done</button></div></div>`);
  if (d.arrived) { confetti(220); rain(['🏠', '🎉', '🎄', '🥳'], 30); beep('win'); }
  ov.querySelector('#tqDone').onclick = () => { ov.remove(); document.body.style.overflow = ''; refresh(); };
  ov.querySelector('#tqShare').onclick = async () => { const blob = await drawLegCard(leg, r, d); const txt = d.arrived ? `🏠 I don reach ${d.town} for December! ${d.me.legs} days on the road on Detty December. Where you dey? ${location.origin}/?ref=${S.me.user.refCode}` : `🚗 Day ${leg.leg} of my journey home: I don reach ${leg.to.name}! Come travel home with me on Detty December ${location.origin}/?ref=${S.me.user.refCode}`; shareFile(blob, 'journey-home.png', txt, 'journey', { leg: leg.leg }); };
}
async function drawLegCard(leg, r, d) {
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d');
  x.fillStyle = '#0B2A21'; x.fillRect(0, 0, 1080, 1350);
  if (r.snap) { const im = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = r.snap; }); if (im) { const sc = Math.max(1080 / im.width, 820 / im.height); x.drawImage(im, (1080 - im.width * sc) / 2, (820 - im.height * sc) / 2, im.width * sc, im.height * sc); } }
  const g = x.createLinearGradient(0, 560, 0, 840); g.addColorStop(0, 'rgba(11,42,33,0)'); g.addColorStop(1, '#0B2A21'); x.fillStyle = g; x.fillRect(0, 560, 1080, 280);
  drawLights(x, 1080, 26);
  const F = (w, s) => `${w} ${s}px "Bricolage Grotesque", system-ui, sans-serif`;
  x.textAlign = 'left'; x.fillStyle = '#F5B83D'; x.font = F(800, 40); x.fillText(d.arrived ? '🏠 JOURNEY HOME · DON REACH!' : `🚗 JOURNEY HOME · DAY ${leg.leg} OF ${leg.legs}`, 70, 880);
  x.fillStyle = '#fff'; x.font = F(800, d.arrived ? 96 : 76); x.fillText(d.arrived ? `Welcome to ${d.town}` : `I don reach ${leg.to.name}`, 70, 990);
  x.fillStyle = '#CFE8DC'; x.font = F(700, 40); x.fillText(`${leg.from.name} → ${leg.to.name} · ${leg.road}`.slice(0, 46), 70, 1060);
  x.fillStyle = '#fff'; x.font = F(700, 38); x.fillText(`${leg.km} km · ${r.crashes ? r.crashes + ' crash' + (r.crashes > 1 ? 'es' : '') : 'no scratch 😎'}`, 70, 1120);
  x.fillStyle = '#D7263D'; x.beginPath(); x.roundRect ? x.roundRect(70, 1180, 620, 96, 48) : x.rect(70, 1180, 620, 96); x.fill();
  x.fillStyle = '#fff'; x.font = F(800, 40); x.textAlign = 'center'; x.fillText('Where you dey travel go? 🧳', 380, 1242);
  x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,.7)'; x.font = F(700, 30); x.fillText(location.host, 1010, 1310);
  return new Promise(res => cv.toBlob(res, 'image/png'));
}
async function journeyShare(J) {
  const T = new Map(J.towns.map(t => [t.id, t])), me = J.me;
  const txt = `🏠 I don reach ${T.get(me.home).name} for December! Who else don reach home? Travel home with your people on Detty December ${location.origin}/?ref=${S.me.user.refCode}`;
  if (navigator.share) { try { await navigator.share({ text: txt }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}
function journeyCard(m) {
  const j = m.journey, T = m.towns || {};
  if (!j) return `<button class="jcard" data-tab-go="trip"><span class="jcard-i">🧳</span><span><small>Journey Home</small><b>Where be home this December?</b><em>Drive there in 3D, one highway a day. See which friend reaches first.</em></span><span class="go">›</span></button>`;
  if (j.arrived) return `<button class="jcard done" data-tab-go="trip"><span class="jcard-i">🏠</span><span><small>Journey Home</small><b>You don reach ${esc(T[j.home])}!</b><em>See which of your friends are still on the road</em></span><span class="go">›</span></button>`;
  return `<button class="jcard ${j.unlocked ? 'ready' : ''}" data-tab-go="trip"><span class="jcard-i">${j.unlocked ? '🚗' : '🌙'}</span><span><small>Journey Home · Day ${j.leg + 1} of ${j.legs}</small><b>${j.unlocked ? `Today: ${esc(T[j.at])} → ${esc(T[j.next])}` : `Resting in ${esc(T[j.at])} tonight`}</b><em>${j.unlocked ? `${esc(j.road)} · ${j.km} km · drive it now` : `Next road opens at midnight · ${esc(T[j.home])} is ${j.kmAll - j.kmDone} km away`}</em></span><span class="go">›</span></button>`;
}

// ---------- Owambe Night Live ----------
const HOST = { lobby: ['🎤 DJ Detty: "Ladies and gentlemen, the owambe is about to start!"', '🎤 "Abeg, make una sit down. Small chops dey come!"', '🎤 "Invite your people, the more the merrier!"', '🎤 "Tonight, only the sharpest go survive 10 questions!"'],
  ask: ['🎤 "Oya answer sharp sharp!"', '🎤 "No dulling o!"', '🎤 "Think am well!"', '🎤 "Time dey go!"'], reveal: ['🎤 "Who get am? 🙌🏾"', '🎤 "Some people don comot for party 😂"', '🎤 "Ehen! Make we see!"'] };
function liveCard(m) {
  const sh = m.show; if (!sh) return '';
  const t = sh.startsAt - srvNow(), live = sh.phase === 'ask' || sh.phase === 'reveal', lobby = sh.phase === 'lobby';
  if (sh.phase === 'done') return '';
  return `<button class="livecard ${live ? 'on' : lobby ? 'lobby' : ''}" id="liveBtn"><span class="lv-ic">🎤</span><span><small>${live ? '<i class="lv-dot"></i>LIVE NOW' : lobby ? '<i class="lv-dot"></i>Doors open' : 'Tonight at 8:30pm'}</small><b>Owambe Night Live</b><em>${live ? 'Questions dey fly! Jump in and watch' : `${(sh.pot).toLocaleString()} 🪙 shared by everyone who survives 10 questions`}</em></span><span class="lv-t">${live ? 'Watch' : `<b data-cd="${sh.startsAt}" data-plain="1">${cdText(t)}</b>`}</span></button>`;
}
function openLive() {
  const ov = document.createElement('div'); ov.className = 'lvov'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  ov.innerHTML = `<div class="lv-top"><button class="g-close lv-x" aria-label="Close">✕</button><span class="lv-brand">🎤 Owambe Night Live</span><span class="lv-ppl" id="lvP">👥 0</span></div>
    <div class="lv-stage" id="lvS"></div>
    <div class="lv-host" id="lvH"></div>
    <div class="lv-float" id="lvF"></div>
    <div class="lv-react">${['🔥', '😂', '😱', '👏🏾', '💃🏾', '🙏🏾'].map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>`;
  let st = null, timer = null, answered = {}, lastKey = '', hostT = 0;
  const close = () => { clearTimeout(timer); ov.remove(); document.body.style.overflow = ''; refresh(); };
  ov.querySelector('.lv-x').onclick = close;
  ov.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { floatEmoji(b.dataset.e, true); api('/api/show/react', { e: b.dataset.e }).catch(() => {}); buzz(10); });
  function floatEmoji(e, mine) { const f = document.createElement('span'); f.className = 'lv-fe'; f.textContent = e; f.style.left = (mine ? 70 + Math.random() * 25 : 5 + Math.random() * 90) + '%'; f.style.animationDuration = (2 + Math.random() * 1.5) + 's'; ov.querySelector('#lvF').appendChild(f); setTimeout(() => f.remove(), 3600); }
  function host(phase) { if (Date.now() - hostT < 5000) return; hostT = Date.now(); const list = HOST[phase] || HOST.lobby; ov.querySelector('#lvH').textContent = list[Math.floor(Math.random() * list.length)]; }
  async function poll() {
    if (!document.body.contains(ov)) return;
    try { st = await api('/api/show'); } catch { timer = setTimeout(poll, 2000); return; }
    S.skew = st.now - Date.now(); draw(); timer = setTimeout(poll, st.phase === 'soon' ? 5000 : 1000);
  }
  function draw() {
    ov.querySelector('#lvP').textContent = `👥 ${st.players.toLocaleString()}`;
    Object.entries(st.reacts || {}).forEach(([e, n]) => { for (let k = 0; k < Math.min(n, 4); k++) setTimeout(() => floatEmoji(e), k * 200); });
    const key = st.phase + (st.i ?? '');
    const stage = ov.querySelector('#lvS');
    if (st.phase === 'soon' || st.phase === 'lobby') {
      host('lobby');
      if (key !== lastKey || true) stage.innerHTML = `<div class="lv-lobby"><small>${st.phase === 'lobby' ? 'Doors are open' : 'Tonight\'s show starts in'}</small>
        <div class="lv-cd">${(() => { const ms = Math.max(0, st.startsAt - srvNow()), t = Math.floor(ms / 1000); return t < 3600 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : cdText(ms); })()}</div>
        <p class="lv-pot"><b>${st.pot.toLocaleString()} 🪙</b> shared by everybody who survives all ${st.total} questions</p>
        <ul class="lv-rules"><li>${st.total} questions, ${Math.round(st.askMs / 1000)} seconds each, same time for the whole country</li><li>Miss one and you comot for the party (you can still watch)</li><li>A spare life saves you once</li></ul>
        ${st.joined ? `<div class="lv-in">✅ You're in!${st.lives ? ' ❤️ Spare life ready' : ''}</div>${st.lives ? '' : '<button class="btn btn-line" id="lvLife">❤️ Buy a spare life · 100 🪙</button>'}` : '<button class="btn btn-gold" id="lvJoin">🎟️ Join tonight\'s show</button>'}
        <button class="btn btn-wa" id="lvInv">${IC.wa}Bring your people</button></div>`;
      const j = stage.querySelector('#lvJoin'); if (j) j.onclick = async () => { try { await api('/api/show/join', {}); beep('ok'); track('show_join'); poll(); } catch (e) { toast(e.message); } };
      const l = stage.querySelector('#lvLife'); if (l) l.onclick = async () => { try { const r = await api('/api/show/life', {}); coinsTo(r.coins); toast('❤️ Spare life ready'); poll(); } catch (e) { toast(e.message); } };
      stage.querySelector('#lvInv').onclick = () => { const txt = `🎤 Owambe Night Live tonight at 8:30pm on Detty December! ${st.pot.toLocaleString()} coins for whoever survives 10 questions. Come join me ${location.origin}/?ref=${S.me.user.refCode}`; navigator.share ? navigator.share({ text: txt }).catch(() => {}) : window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank'); };
    } else if (st.phase === 'ask') {
      host('ask');
      const can = st.joined && st.meAlive && st.myChoice == null && answered[st.i] == null;
      if (key !== lastKey) {
        stage.innerHTML = `<div class="lv-q"><div class="lv-qn">Question ${st.i + 1} of ${st.total} · ${esc(st.category)}</div>
          <div class="lv-ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="bg"/><circle cx="22" cy="22" r="19" class="fg" id="lvRing"/></svg><b id="lvSec"></b></div>
          <h2>${esc(st.question)}</h2>
          <div class="lv-opts">${st.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
          <p class="lv-alive" id="lvA"></p></div>`;
        stage.querySelectorAll('[data-i]').forEach(b => b.onclick = async () => { if (answered[st.i] != null) return; answered[st.i] = +b.dataset.i; b.classList.add('picked'); stage.querySelectorAll('[data-i]').forEach(x => x.disabled = true); beep('tap'); try { await api('/api/show/answer', { i: st.i, choice: +b.dataset.i }); } catch (e) { toast(e.message); } });
        beep('tick');
      }
      const sec = Math.max(0, Math.ceil(st.left / 1000)); stage.querySelector('#lvSec').textContent = sec;
      stage.querySelector('#lvRing').style.strokeDashoffset = String(119.4 * (1 - st.left / st.askMs));
      if (!can) stage.querySelectorAll('[data-i]').forEach(x => { x.disabled = true; if (+x.dataset.i === (answered[st.i] ?? st.myChoice)) x.classList.add('picked'); });
      stage.querySelector('#lvA').textContent = !st.joined ? '👀 You are watching tonight. Join tomorrow before 8:30pm to play!' : st.meAlive ? `💃🏾 ${st.alive.toLocaleString()} people still dey party` : `😭 You don comot. Keep watching, ${st.alive.toLocaleString()} still dey`;
    } else if (st.phase === 'reveal') {
      host('reveal');
      if (key !== lastKey) {
        const tot = st.counts.reduce((a, b) => a + b, 0) || 1, mine = answered[st.i] ?? st.myChoice;
        stage.innerHTML = `<div class="lv-q"><div class="lv-qn">Question ${st.i + 1} of ${st.total}</div><h2>${esc(st.question)}</h2>
          <div class="lv-opts">${st.options.map((o, i) => `<div class="lv-bar ${i === st.correct ? 'right' : ''} ${i === mine && i !== st.correct ? 'wrong' : ''}"><i style="width:${Math.round(100 * st.counts[i] / tot)}%"></i><span>${esc(o)}</span><b>${st.counts[i]}</b></div>`).join('')}</div>
          <div class="lv-verdict ${st.meAliveAfter ? 'ok' : st.meAlive ? 'out' : ''}">${!st.joined ? '👀 Watching' : st.usedLife ? '❤️ Your spare life save you! You still dey!' : st.meAliveAfter ? '🎉 You still dey!' : st.meAlive ? '😭 You don comot for the party' : `${st.aliveAfter.toLocaleString()} still standing`}</div>
          <p class="lv-alive">${st.aliveAfter.toLocaleString()} of ${st.players.toLocaleString()} still dey party</p></div>`;
        if (st.joined && st.meAlive) { if (st.meAliveAfter) { beep('ok'); buzz(30); } else { beep('no'); buzz([60, 40, 60]); } }
      }
    } else if (st.phase === 'done') {
      if (key !== lastKey) {
        stage.innerHTML = `<div class="lv-lobby"><small>Tonight's champions</small><h2 class="lv-done-h">${st.winners.length ? `${st.winners.length} ${st.winners.length === 1 ? 'person' : 'people'} survived all ${st.total}!` : 'Nobody survived tonight 😱'}</h2>
          ${st.meWon ? `<div class="lv-won">🏆 You won <b>${st.meWon.toLocaleString()} 🪙</b>!</div>` : ''}
          <div class="lv-wins">${st.winners.map(w => `<span>🏆 ${esc(w.n)}<small>${esc(w.s || '')}</small></span>`).join('') || '<p>The pot rolls on. Tomorrow fit be your turn.</p>'}</div>
          <p class="lv-next">Next show in <b>${cdText(st.nextAt - srvNow())}</b></p>
          <button class="btn btn-ghost" id="lvClose">Close</button></div>`;
        stage.querySelector('#lvClose').onclick = close;
        if (st.meWon) { confetti(220); beep('win'); }
      }
    }
    lastKey = key;
  }
  poll(); track('show_open');
}

// ---------- Party Mode: one phone, everybody in the room ----------
const AUNTY = ['When are you bringing someone home to meet the family? 💍', 'How much do you earn now? Be honest o 💰', 'Who was your first crush? 🙈', 'What is the most embarrassing thing you did in school?', 'Which relative do you hide from at family parties?',
  'If you had ₦1 million right now, what would you buy first?', 'What is the biggest lie you told your parents?', 'Who in this room owes you money? 👀', 'Which Nollywood character are you in real life?', 'What is your worst December memory?',
  'Describe your village in three words', 'What food will you never eat, even for ₦100k?', 'Who in your family cooks the best jollof?', 'What New Year resolution do you know you will not keep?', 'When last did you call your grandma?',
  'Which celebrity would you marry?', 'What is the most money you have spent in one day?', 'What is one thing you do when nobody is watching?', 'Who is your favourite person in this room, and why?', 'What would you do if NEPA brought light for 24 hours straight?',
  'What is your most used emoji, and why?', 'What is the longest you have stayed in traffic?', 'What was your nickname in secondary school?', 'Have you ever been flogged in front of the whole class? What happened?', 'Which of your exes would you invite to your wedding?',
  'What is your secret talent?', 'Tell us about your last Christmas party', 'If you could japa tomorrow, where would you go?', 'What is the most Nigerian thing about you?', 'Which family WhatsApp group message made you laugh the most?'];
const DARES = ['Do shaku shaku for 10 seconds 💃🏾', 'Call someone and sing "We wish you a merry Christmas" 📞', 'Speak only pidgin until your next turn', 'Do your best impression of an aunty at a wedding', 'Show the last photo in your gallery 📸',
  'Do the zanku (legwork) for 10 seconds', 'Shout a danfo conductor\'s route like you mean it: "Oshodi! Oshodi!"', 'Act a Nollywood crying scene for 10 seconds 😭', 'Hum a Christmas carol until someone guesses it', 'Sell "pure water" to everybody in the room like a hawker',
  'Give a 20-second wedding MC hype for the person on your left', 'Speak with an IJGB accent until your next turn', 'Let the room pick a song and you dance to it', 'Tell a joke. If nobody laughs, do another dare', 'Mimic your favourite teacher from secondary school'];
const ACTS = {
  'Naija life': ['Danfo conductor', 'Go-slow', 'NEPA taking light', 'Okada rider', 'Pure water', 'Mama put', 'Aso ebi', 'Owambe', 'Spraying money', 'Agbero', 'Japa', 'Small chops', 'Generator', 'Tying gele', 'Wedding MC', 'Market woman pricing', 'Keke Napep', 'Traffic warden', 'POS man', 'Suya spot', 'Lagos traffic', 'Village meeting', 'Pounding yam', 'Football viewing centre'],
  'Christmas & December': ['Father Christmas', 'Christmas tree', 'Crossover service', 'Fireworks', 'Knock-out banger', 'IJGB at the airport', 'Christmas chicken', 'Chin chin', 'Zobo', 'Carol service', 'Masquerade', 'Calabar Carnival', 'Harmattan', 'Christmas shopping', 'Boxing Day', 'Family photo', 'Aunty asking when you will marry', 'New Year resolution', 'Detty December party', 'Unwrapping a gift', 'Travelling home', 'Village party'],
  'Movies, music & dance': ['Living in Bondage', 'The Wedding Party', 'King of Boys', 'Jenifa', 'Osuofia in London', 'A Tribe Called Judah', 'Shaku shaku', 'Zanku', 'Afrobeats concert', 'Nollywood crying scene', 'Juju band', 'Talking drum', 'DJ at a party', 'Gospel choir', 'Big Brother house', 'Breaking news on TV', 'Football match', 'Boxing match'],
  'Food & animals': ['Jollof rice', 'Pounded yam', 'Suya', 'Puff-puff', 'Agama lizard', 'Goat', 'Chicken running away', 'Cow crossing the road', 'Snail', 'Pepper soup', 'Frying akara', 'Roasting plantain', 'Soaking garri', 'Mosquito at night', 'Cracking palm kernel', 'Peeling orange', 'Drinking palm wine', 'Chewing sugarcane'],
};
const WHO = ['japa first', 'finish the jollof before the guests arrive', 'be late to their own wedding', 'spray all their money at one owambe', 'fall asleep during the crossover service', 'become a Nollywood star', 'call their ex on Christmas Day',
  'argue with a danfo conductor over ₦50 change', 'forget everybody\'s birthday', 'cry while watching a Nollywood movie', 'win the lottery and tell nobody', 'get lost on the way back to the village', 'leave the party first',
  'come back from a two-week trip with a foreign accent', 'finish their data in one day', 'post every December party on their status', 'eat the meat from someone else\'s plate', 'become a billionaire', 'start a fight at the village meeting',
  'still be single next December', 'be the MC at the next family wedding', 'take 200 selfies at one party', 'sleep through the New Year countdown', 'get stopped at a checkpoint and talk their way out', 'cook for the whole family this Christmas',
  'buy aso ebi and not attend the party', 'be the loudest person at the party', 'bring home a surprise fiancé', 'forget their phone in a keke', 'become president one day'];
function partyHub() {
  const ov = document.createElement('div'); ov.className = 'party'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  let players = ls.get('partyPlayers', []);
  const close = () => { ov.remove(); document.body.style.overflow = ''; };
  function home() {
    ov.innerHTML = `<div class="pt-top"><button class="g-close" aria-label="Close">✕</button><b>🪩 Party Mode</b><span></span></div>
      <div class="pt-body"><p class="pt-lede">Everybody don gather? Put one phone in the middle and play. Works without data.</p>
      <div class="pt-players"><div class="fr-lbl">Who dey play? <small>(2 to 12 people)</small></div><div class="pt-chips" id="ptP">${players.map((p, i) => `<span>${esc(p)}<button data-x="${i}" aria-label="Remove ${esc(p)}">✕</button></span>`).join('')}</div>
        <form class="pt-add" id="ptAdd"><input id="ptName" maxlength="14" placeholder="Add a name" autocomplete="off"><button class="btn btn-line btn-sm">Add</button></form></div>
      <div class="pt-games">
        <button data-g="aunty"><span>👵🏾</span><b>Aunty Interrogation</b><small>The aunty asks, you must answer… or do a dare</small></button>
        <button data-g="act"><span>🎭</span><b>Act Am!</b><small>Phone on your head, your people act it out. 60 seconds</small></button>
        <button data-g="who"><span>👉🏾</span><b>Who Go Pass?</b><small>"Who is most likely to…" Count to 3 and point!</small></button>
      </div></div>`;
    ov.querySelector('.g-close').onclick = close;
    ov.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { players.splice(+b.dataset.x, 1); ls.set('partyPlayers', players); home(); });
    ov.querySelector('#ptAdd').onsubmit = (e) => { e.preventDefault(); const v = ov.querySelector('#ptName').value.trim(); if (v && players.length < 12 && !players.includes(v)) { players.push(v); ls.set('partyPlayers', players); beep('tap'); } home(); ov.querySelector('#ptName').focus(); };
    ov.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
      const g = b.dataset.g; if (g !== 'act' && players.length < 2) return toast('Add at least 2 names first 🙂');
      api('/api/party/hosted', { game: g, players: players.length }).catch(() => {}); beep('tap');
      ({ aunty, act, who })[g]();
    });
  }
  const deck = (arr) => { let d = []; return () => { if (!d.length) d = arr.slice().sort(() => Math.random() - .5); return d.pop(); }; };
  function aunty() {
    const nextQ = deck(AUNTY), nextD = deck(DARES), score = Object.fromEntries(players.map(p => [p, 0])); let last = null;
    function spin() {
      let p; do { p = players[Math.floor(Math.random() * players.length)]; } while (players.length > 1 && p === last); last = p;
      ov.innerHTML = `<div class="pt-top"><button class="pt-back">‹ Games</button><b>👵🏾 Aunty Interrogation</b><span></span></div><div class="pt-body pt-center">
        <div class="pt-spin" id="ptSp">${esc(players[0])}</div><div class="pt-aunty">👵🏾</div><div class="pt-card hidden" id="ptC"><small>Aunty dey ask <b>${esc(p)}</b>:</small><h2>${esc(nextQ())}</h2></div>
        <div class="pt-acts hidden" id="ptA"><button class="btn btn-gold" id="ptOk">😅 Answered</button><button class="btn btn-line" id="ptNo">🙈 I no fit, give me dare</button></div>
        <div class="pt-score">${players.map(x => `<span>${esc(x)} <b>${score[x]}</b></span>`).join('')}</div></div>`;
      ov.querySelector('.pt-back').onclick = home;
      let k = 0; const el = ov.querySelector('#ptSp'); const iv = setInterval(() => { el.textContent = players[k++ % players.length]; beep('tick'); }, 90);
      setTimeout(() => { clearInterval(iv); el.textContent = p; el.classList.add('hit'); buzz(40); ov.querySelector('#ptC').classList.remove('hidden'); ov.querySelector('#ptA').classList.remove('hidden'); }, 1400);
      ov.querySelector('#ptOk').onclick = () => { score[p]++; beep('ok'); spin(); };
      ov.querySelector('#ptNo').onclick = () => { ov.querySelector('#ptC').innerHTML = `<small>Dare for <b>${esc(p)}</b>:</small><h2>${esc(nextD())}</h2>`; ov.querySelector('#ptA').innerHTML = '<button class="btn btn-gold" id="ptDone">Done! Next person</button>'; ov.querySelector('#ptDone').onclick = spin; beep('no'); };
    }
    spin();
  }
  function act() {
    ov.innerHTML = `<div class="pt-top"><button class="pt-back">‹ Games</button><b>🎭 Act Am!</b><span></span></div><div class="pt-body"><p class="pt-lede">One person holds the phone on their forehead, screen facing the room. Everybody else acts it out, no talking the word! Tap ✓ when they guess, or ⏭ to pass.</p>
      <div class="pt-cats">${Object.keys(ACTS).map(c => `<button data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`;
    ov.querySelector('.pt-back').onclick = home;
    ov.querySelectorAll('[data-c]').forEach(b => b.onclick = () => round(b.dataset.c));
    function round(cat) {
      const next = deck(ACTS[cat]), got = [], passed = []; let word = next(), left = 60, n = 3;
      ov.innerHTML = `<div class="pt-act"><div class="pt-act-t" id="ptT">Get ready…</div><div class="pt-word" id="ptW">${n}</div><div class="pt-act-b"><button class="pt-pass" id="ptPs">⏭ Pass</button><button class="pt-got" id="ptG">✓ Got it</button></div></div>`;
      const W = ov.querySelector('#ptW'), Tt = ov.querySelector('#ptT');
      const cdI = setInterval(() => { n--; if (n > 0) { W.textContent = n; beep('tick'); } else { clearInterval(cdI); start(); } }, 800);
      let iv;
      function start() { W.textContent = word; Tt.textContent = '60'; beep('win'); iv = setInterval(() => { left--; Tt.textContent = left; if (left <= 5) beep('tick'); if (left <= 0) end(); }, 1000);
        ov.querySelector('#ptG').onclick = () => { got.push(word); word = next(); W.textContent = word; W.className = 'pt-word ok'; setTimeout(() => W.className = 'pt-word', 300); beep('ok'); buzz(30); };
        ov.querySelector('#ptPs').onclick = () => { passed.push(word); word = next(); W.textContent = word; beep('no'); }; }
      function end() { clearInterval(iv); beep('win'); confetti(got.length * 12);
        ov.innerHTML = `<div class="pt-top"><button class="pt-back">‹ Games</button><b>🎭 Time up!</b><span></span></div><div class="pt-body pt-center"><div class="pt-big">${got.length}</div><p>correct in 60 seconds</p>
          <div class="pt-list">${got.map(w => `<span class="ok">✓ ${esc(w)}</span>`).join('')}${passed.map(w => `<span>⏭ ${esc(w)}</span>`).join('')}</div>
          <button class="btn btn-gold" id="ptAg">Next person, same category</button></div>`;
        ov.querySelector('.pt-back').onclick = home; ov.querySelector('#ptAg').onclick = () => round(cat); }
    }
  }
  function who() {
    const next = deck(WHO);
    function card() {
      ov.innerHTML = `<div class="pt-top"><button class="pt-back">‹ Games</button><b>👉🏾 Who Go Pass?</b><span></span></div><div class="pt-body pt-center">
        <div class="pt-card"><small>Who in this room is most likely to…</small><h2>${esc(next())}?</h2></div>
        <div class="pt-count" id="ptN"></div><button class="btn btn-gold" id="ptGo">Count 3, 2, 1… point! 👉🏾</button></div>`;
      ov.querySelector('.pt-back').onclick = home;
      ov.querySelector('#ptGo').onclick = () => { const el = ov.querySelector('#ptN'), b = ov.querySelector('#ptGo'); b.disabled = true; let k = 3; el.textContent = k; beep('tick'); const iv = setInterval(() => { k--; if (k > 0) { el.textContent = k; beep('tick'); } else { clearInterval(iv); el.textContent = 'POINT! 👉🏾'; el.classList.add('go'); buzz([60, 30, 60]); beep('win'); b.disabled = false; b.textContent = 'Next card'; b.onclick = card; } }, 700); };
    }
    card();
  }
  home();
}

// ---------- "How well do you know me?" ----------
async function knowMeSheet() {
  let K; try { K = await api('/api/knowme'); } catch (e) { return toast(e.message); }
  const picked = {}; Object.keys(K.templates).slice(0, 5).forEach(t => { picked[t] = null; });
  const bg = sheet(`<h3>🫶🏾 How well do you know me?</h3><p>Pick 5 questions and your real answers. Your friends guess. You see who truly knows you.</p>
    ${K.mine ? `<div class="km-mine"><b>Your quiz is live</b><small>${K.board.length} friend${K.board.length === 1 ? '' : 's'} took it</small><button class="btn btn-wa" id="kmShare">${IC.wa}Share my quiz</button>${K.board.length ? `<div class="km-board">${K.board.map((b, i) => `<span>${i === 0 ? '👑' : i + 1}. ${esc(b.n)} <b>${b.score}/5</b></span>`).join('')}</div>` : ''}<p class="km-or">Or make a new one below (old scores will reset)</p></div>` : ''}
    <div class="km-qs">${Object.entries(K.templates).map(([id, t]) => `<div class="km-q" data-t="${id}"><label><input type="checkbox" ${id in picked ? 'checked' : ''}> <b>${esc(t.q)}</b></label><div class="km-o">${t.o.map((o, i) => `<button data-a="${i}">${esc(o)}</button>`).join('')}</div></div>`).join('')}</div>
    <p class="g-cost" id="kmN"></p><button class="btn btn-gold" id="kmGo">Create my quiz</button>`);
  const upd = () => { const n = Object.keys(picked).length, ready = Object.values(picked).filter(v => v != null).length; bg.querySelector('#kmN').textContent = `${n} picked · ${ready} answered${n !== 5 ? ' · pick exactly 5' : ''}`; bg.querySelectorAll('.km-q').forEach(q => q.classList.toggle('on', q.dataset.t in picked)); };
  bg.querySelectorAll('.km-q').forEach(q => { const t = q.dataset.t; q.querySelector('input').onchange = (e) => { if (e.target.checked) { if (Object.keys(picked).length >= 5) { e.target.checked = false; return toast('Only 5 questions'); } picked[t] = null; } else delete picked[t]; upd(); };
    q.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { if (!(t in picked)) { if (Object.keys(picked).length >= 5) return toast('Only 5 questions'); picked[t] = null; q.querySelector('input').checked = true; } q.querySelectorAll('[data-a]').forEach(x => x.classList.remove('on')); b.classList.add('on'); picked[t] = +b.dataset.a; upd(); beep('tap'); }); });
  upd();
  if (K.mine) bg.querySelector('#kmShare').onclick = () => knowShare(K.mine.code);
  bg.querySelector('#kmGo').onclick = async () => { const items = Object.entries(picked).map(([t, a]) => ({ t, a })); if (items.length !== 5 || items.some(x => x.a == null)) return toast('Pick 5 questions and answer all of them'); try { const r = await api('/api/knowme', { items }); bg.remove(); toast('Your quiz is ready 🫶🏾 Share am!'); knowShare(r.code); if (S.tab === 'party') viewParty(); } catch (e) { toast(e.message); } };
}
function knowShare(code) {
  const txt = `🫶🏾 How well do you know me? I made a December quiz about myself. Let's see if you be my real padi 👀 ${location.origin}/?know=${code}`;
  track('share', { channel: 'knowme' });
  if (navigator.share) { navigator.share({ text: txt }).catch(() => {}); return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}
async function takeKnowMe(code) {
  let Q; try { Q = await api('/api/knowme/' + code); } catch (e) { return toast(e.message); }
  if (Q.self) return knowMeSheet();
  const ov = document.createElement('div'); ov.className = 'overlay km'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const ans = []; let i = 0;
  const close = () => { ov.remove(); document.body.style.overflow = ''; refresh(); };
  function board(list) { return `<div class="km-board">${list.map((b, k) => `<span>${k === 0 ? '👑' : k + 1}. ${esc(b.n)} <b>${b.score}/${Q.total}</b></span>`).join('')}</div>`; }
  function result(score, correct, list, earned) {
    ov.innerHTML = `<div class="inner"><button class="g-close" aria-label="Close">✕</button><div class="km-score"><b>${score}/${Q.total}</b><span>${score === Q.total ? `You truly know ${esc(Q.owner)}! Real padi 🫶🏾` : score >= 3 ? `You sabi ${esc(Q.owner)} small 😎` : `You no know ${esc(Q.owner)} at all 😂`}</span></div>
      ${earned != null ? `<p class="dres-line">+${earned} 🪙</p>` : ''}
      <div class="km-review">${Q.items.map((it, k) => `<div><small>${esc(it.q)}</small><b class="${(Q.done ? Q.done.answers : ans)[k] === correct[k] ? 'ok' : 'no'}">${esc(it.o[correct[k]])}</b></div>`).join('')}</div>
      <h3 class="km-h">Who knows ${esc(Q.owner)} best</h3>${board(list)}
      <div class="res-actions"><button class="btn btn-gold" id="kmMake">🫶🏾 Make my own quiz</button><button class="btn btn-ghost" id="kmC">Done</button></div></div>`;
    ov.querySelector('.g-close').onclick = close; ov.querySelector('#kmC').onclick = close; ov.querySelector('#kmMake').onclick = () => { close(); knowMeSheet(); };
  }
  if (Q.done) return result(Q.done.score, Q.done.correct, Q.board);
  function step() {
    const it = Q.items[i];
    ov.innerHTML = `<div class="inner"><button class="g-close" aria-label="Close">✕</button><small class="km-k">How well do you know <b>${esc(Q.owner)}</b>? · ${i + 1} of ${Q.total}</small><h2 class="km-qh">${esc(it.q)}</h2><div class="tq-opts">${it.o.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}</div></div>`;
    ov.querySelector('.g-close').onclick = close;
    ov.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => { ans.push(+b.dataset.k); beep('tap'); i++; if (i < Q.items.length) return step();
      try { const r = await api(`/api/knowme/${code}/answer`, { answers: ans }); coinsTo((S.me.user.coins || 0) + r.earned); result(r.score, r.correct, r.board, r.earned); if (r.score === r.total) confetti(140); } catch (e) { toast(e.message); close(); } });
  }
  step();
}

// ---------- players send questions ----------
function submitQuestion() {
  const cats = ['Christmas', 'Travel', 'Naija', 'Food', 'Slang', 'Music', 'Nollywood', 'Sports', 'Ask Mummy'];
  const bg = sheet(`<h3>✍🏾 Send us a question</h3><p>Know something sweet about your hometown or December? Write a question. If we approve it, everybody in Nigeria gets it, with your name on it. +50 🪙</p>
    <div class="fr-lbl">Topic</div><div class="fr-chips" id="sqC">${cats.map((c, i) => `<button data-c="${c}" class="${i === 0 ? 'on' : ''}">${c}</button>`).join('')}</div>
    <label class="sq-l">Question<textarea id="sqQ" maxlength="220" rows="2" placeholder="Which town is famous for…?"></textarea></label>
    <label class="sq-l ok">✅ Right answer<input id="sqA" maxlength="80"></label>
    <label class="sq-l">❌ Wrong answer<input class="sqW" maxlength="80"></label><label class="sq-l">❌ Wrong answer<input class="sqW" maxlength="80"></label><label class="sq-l">❌ Wrong answer<input class="sqW" maxlength="80"></label>
    <button class="btn btn-gold" id="sqGo">Send my question</button>`);
  let c = cats[0]; bg.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { bg.querySelectorAll('[data-c]').forEach(x => x.classList.remove('on')); b.classList.add('on'); c = b.dataset.c; });
  bg.querySelector('#sqGo').onclick = async () => { try { await api('/api/questions/submit', { c, q: bg.querySelector('#sqQ').value, o: [bg.querySelector('#sqA').value, ...[...bg.querySelectorAll('.sqW')].map(x => x.value)] }); bg.remove(); toast('Sent! We go check am. You get +50 🪙 when it goes live 🙏🏾'); } catch (e) { toast(e.message); } };
}

// ---------- Gist Partner (premium) ----------
// Voice adapter: the Pidgin TTS model plugs in on the server (PIDGIN_TTS_URL). This plays what comes back,
// one line after another. window.GistVoice is exposed so a client-side TTS could replace speak() later.
const GistVoice = window.GistVoice = (() => {
  let queue = [], playing = null, onState = () => {};
  const cache = new Map();
  async function fetchAudio(persona, text) {
    const k = persona + '|' + text; if (cache.has(k)) return cache.get(k);
    const r = await fetch('/api/gist/tts', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token }, body: JSON.stringify({ persona, text }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw Object.assign(new Error(j.error || 'Voice failed'), j); }
    const url = URL.createObjectURL(await r.blob()); cache.set(k, url); return url;
  }
  async function next() {
    if (playing || !queue.length) return; const item = queue.shift(); onState(item.i, true);
    try { const url = await fetchAudio(item.persona, item.text); playing = new Audio(url); playing.onended = playing.onerror = () => { onState(item.i, false); playing = null; next(); }; await playing.play(); }
    catch (e) { onState(item.i, false); playing = null; queue = []; if (!e.comingSoon) toast(e.message); }
  }
  return {
    speak(persona, text, i) { queue.push({ persona, text, i }); next(); },
    stop() { queue = []; if (playing) { playing.pause(); playing = null; } },
    onState(fn) { onState = fn; },
  };
})();

let GC = null; // gist config cache
async function gistConfig(force) { if (!GC || force) GC = await api('/api/gist/config'); return GC; }
// ---------- Gist Partner demo: a looping, captioned "video" of how a gist plays out ----------
// Built from the real gist screens so it always matches the product. Sample player and friend names, clearly labelled.
const DEMO = [
  { at: 0, scene: 'pick' },
  { at: 1.6, tap: 'tunde' },
  { at: 2.6, scene: 'room' },
  { at: 3.0, typing: 1 },
  { at: 4.0, line: 'Oya oya oya, enter enter! I get gist for you, Tolu!', dur: 3.2 },
  { at: 7.6, typing: 1 },
  { at: 8.4, line: 'Chidi don pass you today with 40 points. 620 to your 580. Ehn, you dey sleep?', dur: 4.4 },
  { at: 13.2, chips: 1 },
  { at: 14.4, tapChip: 0, me: 'Ehen?! 👀' },
  { at: 15.2, typing: 1 },
  { at: 16.0, line: 'Your streak na 6 days. You never miss since Day 1. Correct person!', dur: 3.8 },
  { at: 20.2, typing: 1 },
  { at: 21.0, line: 'Owambe Night Live go start 8:30pm. 20,000 coins dey the pot. No late o!', dur: 3.8 },
  { at: 25.2, scene: 'end' },
  { at: 30.0, loop: 1 },
];
const DEMO_LEN = 30;
function demoPlayer(host, { compact = false } = {}) {
  host.innerHTML = `<div class="gd ${compact ? 'compact' : ''}" aria-label="Demo: how Gist Partner works">
    <div class="gd-bars">${[0, 1, 2, 3].map(() => '<i><b></b></i>').join('')}</div>
    <div class="gd-top"><span class="gd-badge">● DEMO</span><button class="gd-pp" aria-label="Pause demo">❚❚</button></div>
    <div class="gd-phone"><div class="gd-notch"></div><div class="gd-screen"></div><span class="gd-finger"></span></div>
    ${compact ? '' : '<div class="gd-cap" aria-live="off"></div>'}
    <p class="gd-note">Sample player. Your gist uses your real game.</p></div>`;
  const root = host.querySelector('.gd'), scr = root.querySelector('.gd-screen'), finger = root.querySelector('.gd-finger'), cap = root.querySelector('.gd-cap'), pp = root.querySelector('.gd-pp');
  const bars = [...root.querySelectorAll('.gd-bars b')], cuts = [0, 2.6, 13.2, 25.2, DEMO_LEN];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 0, i = 0, playing = !still, visible = true, raf = 0, last = performance.now(), speaking = null;
  const feed = () => scr.querySelector('.gd-feed');
  const scroll = () => { const f = feed(); if (f) f.scrollTop = f.scrollHeight; };
  const tapAt = (el) => { if (!el) return; const r = el.getBoundingClientRect(), p = root.getBoundingClientRect(); finger.style.left = (r.left - p.left + r.width * .6) + 'px'; finger.style.top = (r.top - p.top + r.height * .55) + 'px'; finger.classList.remove('tap'); void finger.offsetWidth; finger.classList.add('tap'); el.classList.add('pressed'); };
  function scene(n) {
    finger.classList.remove('tap');
    if (n === 'pick') scr.innerHTML = `<div class="gd-h"><b>🎙️ Gist Partner</b></div><div class="gd-list">${[['tunde', '🚐', 'Tunde Conductor', 'Knows everybody\'s business', '#F5B83D', 'FREE'], ['basira', '🍲', 'Iya Basira', 'Mama put queen', '#E5483C', ''], ['ngozi', '👒', 'Aunty Ngozi', 'Very concerned about your life', '#8E5BD6', '']].map(([id, e, n2, s, c, tag]) => `<div class="gd-row" data-id="${id}" style="--c:${c}"><span class="gd-av">${e}</span><span><b>${n2}${tag ? ' <em>FREE</em>' : ''}</b><small>${s}</small></span></div>`).join('')}</div>`;
    if (n === 'room') scr.innerHTML = `<div class="gd-h"><b>🚐 Tunde Conductor</b><span class="gd-live">● LIVE GIST</span></div><div class="gd-feed"></div><div class="gd-chips"></div>`;
    if (n === 'end') scr.innerHTML = `<div class="gd-end"><span>🎙️</span><b>Your gist. Your game.<br>Every day.</b><small>Real gist about your streak, your friends and tonight's show</small><em>6 partners · voice notes in Naija pidgin</em></div>`;
  }
  function apply(ev) {
    if (ev.scene) scene(ev.scene);
    if (ev.tap) tapAt(scr.querySelector(`[data-id="${ev.tap}"]`));
    if (ev.typing) { const d = document.createElement('div'); d.className = 'gd-b typing'; d.innerHTML = '<span class="gd-av">🚐</span><p><i></i><i></i><i></i></p>'; feed().appendChild(d); scroll(); }
    if (ev.line) {
      const ty = scr.querySelector('.gd-b.typing'); if (ty) ty.remove();
      const words = ev.line.split(' '), d = document.createElement('div'); d.className = 'gd-b on';
      d.innerHTML = `<span class="gd-av">🚐</span><div><p>${words.map(w => `<span>${esc(w)}</span>`).join(' ')}</p><span class="gd-vn"><span class="gd-play">▶</span><span class="gd-wave">${Array.from({ length: 18 }, (_, k) => `<i style="--h:${30 + ((k * 37) % 60)}%;--d:${(k % 6) * .08}s"></i>`).join('')}</span><small>0:0${Math.round(ev.dur)}</small></span></div>`;
      feed().appendChild(d); scroll();
      if (speaking) speaking.el.classList.remove('on');
      speaking = { el: d, words: [...d.querySelectorAll('p span')], from: ev.at, dur: ev.dur, text: ev.line };
      if (cap) cap.innerHTML = `<b>Tunde:</b> ${words.map(w => `<span>${esc(w)}</span>`).join(' ')}`;
    }
    if (ev.chips) { const c = scr.querySelector('.gd-chips'); c.innerHTML = ['Ehen?! 👀', 'Tell me more', 'Who else?'].map(x => `<span>${x}</span>`).join(''); }
    if (ev.tapChip != null) { const ch = scr.querySelectorAll('.gd-chips span')[ev.tapChip]; tapAt(ch); setTimeout(() => { if (!document.body.contains(root)) return; scr.querySelector('.gd-chips').innerHTML = ''; const m = document.createElement('div'); m.className = 'gd-b me'; m.textContent = ev.me; feed().appendChild(m); scroll(); }, 380); }
    if (ev.scene === 'end') { if (speaking) speaking.el.classList.remove('on'); speaking = null; if (cap) cap.innerHTML = ''; }
  }
  function reset() { t = 0; i = 0; speaking = null; if (cap) cap.innerHTML = ''; }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!document.body.contains(root)) { cancelAnimationFrame(raf); obs.disconnect(); return; }
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!playing || !visible) return;
    t += dt;
    while (i < DEMO.length && DEMO[i].at <= t) { const ev = DEMO[i++]; if (ev.loop) { reset(); scene('pick'); return; } apply(ev); }
    if (speaking) { const k = clamp01((t - speaking.from) / speaking.dur), n = Math.floor(k * speaking.words.length); speaking.words.forEach((w, j) => w.classList.toggle('said', j < n)); if (cap) cap.querySelectorAll('span').forEach((w, j) => w.classList.toggle('said', j < n)); if (k >= 1) { speaking.el.classList.remove('on'); speaking = null; } }
    bars.forEach((b, j) => { b.style.width = (clamp01((t - cuts[j]) / (cuts[j + 1] - cuts[j])) * 100) + '%'; });
  }
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const obs = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: .25 }); obs.observe(root);
  pp.onclick = (e) => { e.stopPropagation(); playing = !playing; pp.textContent = playing ? '❚❚' : '▶'; pp.setAttribute('aria-label', playing ? 'Pause demo' : 'Play demo'); root.classList.toggle('paused', !playing); if (playing) track('gist_demo_play'); };
  root.addEventListener('click', (e) => { if (!compact) { e.stopPropagation(); pp.click(); } });
  scene('pick');
  if (still) { // reduced motion: show one finished frame of the conversation, with a play button
    t = 21.5; while (i < DEMO.length && DEMO[i].at <= t) apply(DEMO[i++]); if (speaking) { speaking.words.forEach(w => w.classList.add('said')); speaking.el.classList.remove('on'); speaking = null; }
    pp.textContent = '▶'; root.classList.add('paused'); bars.forEach((b, j) => { b.style.width = (clamp01((t - cuts[j]) / (cuts[j + 1] - cuts[j])) * 100) + '%'; });
  }
  raf = requestAnimationFrame(frame);
}
function gistCard() {
  return `<section class="gist-hero" id="gistOpen" role="button" tabindex="0" aria-label="Open Gist Partner">
    <div class="gh-demo" id="ghDemo"></div>
    <div class="gh-copy"><small>🎙️ Gist Partner <em class="prem-tag">PREMIUM</em></small><h2>Who don pass you? Wetin happen today?</h2>
      <p>A Naija character gists you about your real game: who passed you, your streak, tonight's show. Like a voice note from your padi.</p>
      <ol class="gh-steps"><li><b>1</b>Pick your partner</li><li><b>2</b>They read your game</li><li><b>3</b>Hear the gist</li></ol>
      <span class="btn btn-gold">Hear today's gist</span><small class="gh-free">Tunde Conductor is free once a day</small></div></section>`;
}
async function gistHub() {
  let C; try { C = await gistConfig(true); } catch (e) { return toast(e.message); }
  const ov = document.createElement('div'); ov.className = 'overlay gist'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const close = () => { GistVoice.stop(); ov.remove(); document.body.style.overflow = ''; };
  track('gist_open');
  const dots = (n) => `<span class="gdots" aria-label="${n} out of 5">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  function home() {
    GistVoice.stop();
    ov.innerHTML = `<div class="inner"><div class="g-top"><button class="g-close" aria-label="Close">✕</button><b class="gist-title">🎙️ Gist Partner</b>${C.premium.active ? '<em class="prem-tag on">PREMIUM</em>' : '<button class="btn btn-gold btn-sm" id="gpUp">Go premium</button>'}</div>
      <div class="gist-demo-wrap" id="gpDemo"></div>
      <p class="gist-lede">Your partner gists you about what is really happening: who passed you, your streak, tonight's show, your journey home. ${C.premium.active ? 'Unlimited gist with everybody.' : C.freeLeft ? 'You get 1 free gist with Tunde today.' : 'Your free gist for today don finish. Come back tomorrow or go premium.'}</p>
      <div class="gist-trust"><span>✅ Never makes things up: every line comes from your real game</span><span>🔒 Only you hear your gist</span></div>
      <div class="section-title gp-h"><h2>Pick your partner</h2></div>
      <div class="gp-list">${C.personas.map(p => { const lock = !C.premium.active && !p.free; return `<button class="gp" data-p="${p.id}" style="--c:${p.color}">
        <span class="gp-av">${p.emoji}</span><span class="gp-main"><b>${esc(p.name)} ${p.free ? '<em class="free-tag">FREE</em>' : lock ? '<em class="prem-tag">🔒 PREMIUM</em>' : ''}</b><small>${esc(p.tagline)}</small>
        <span class="gp-traits">${p.traits.map(t => `<i>${esc(t)}</i>`).join('')}</span>
        <span class="gp-meta"><span>Energy <b>${dots(p.energy)}</b></span><span>Pidgin <b>${dots(p.pidgin)}</b></span><span>🗣️ ${esc(p.voice.accent)}</span></span></span></button>`; }).join('')}</div>
      <p class="gist-foot">${C.voice ? '🔊 Voice gist is live for premium.' : '🔊 Voice gist in real Naija pidgin is coming soon. Premium members get it first.'}</p></div>`;
    ov.querySelector('.g-close').onclick = close;
    demoPlayer(ov.querySelector('#gpDemo'));
    const up = ov.querySelector('#gpUp'); if (up) up.onclick = () => premiumSheet();
    ov.querySelectorAll('[data-p]').forEach(b => b.onclick = () => profile(C.personas.find(p => p.id === b.dataset.p)));
  }
  function profile(p) {
    const lock = !C.premium.active && !p.free, out = !C.premium.active && p.free && !C.freeLeft;
    const bg = sheet(`<div class="gpp" style="--c:${p.color}"><span class="gp-av big">${p.emoji}</span><h3>${esc(p.name)}</h3><small class="gpp-o">${esc(p.origin)} · ${esc(p.age)}</small>
      <p>${esc(p.bio)}</p>
      <div class="gpp-grid"><div><small>Personality</small><span class="gp-traits">${p.traits.map(t => `<i>${esc(t)}</i>`).join('')}</span></div>
      <div><small>Gists you about</small><span class="gp-traits">${p.topics.map(t => `<i>${esc(t)}</i>`).join('')}</span></div>
      <div><small>Voice</small><span>${esc(p.voice.gender)}, ${esc(p.voice.age)} · ${esc(p.voice.accent)} · ${p.voice.style.map(esc).join(', ')}</span></div>
      <div><small>Energy · Pidgin</small><span>${dots(p.energy)} · ${dots(p.pidgin)}</span></div></div>
      ${lock ? `<button class="btn btn-gold" id="gpGo">🔒 Unlock ${esc(p.name.split(' ')[0])} with premium</button>` : out ? `<button class="btn btn-gold" id="gpGo">Free gist used today · Go premium</button>` : `<button class="btn btn-gold" id="gpGo">🎙️ Gist me, ${esc(p.name.split(' ')[0])}!</button>`}</div>`);
    bg.querySelector('#gpGo').onclick = () => { bg.remove(); if (lock || out) premiumSheet(p); else room(p); };
  }
  async function room(p) {
    let used = 0, all = [];
    ov.innerHTML = `<div class="inner gr" style="--c:${p.color}"><div class="g-top"><button class="pt-back gr-back">‹ Partners</button><b class="gist-title">${p.emoji} ${esc(p.name)}</b><button class="g-close" aria-label="Close">✕</button></div>
      <div class="gr-feed" id="grFeed" aria-live="polite"></div><div class="gr-acts" id="grActs"></div></div>`;
    ov.querySelector('.g-close').onclick = close; ov.querySelector('.gr-back').onclick = home;
    const feed = ov.querySelector('#grFeed'), acts = ov.querySelector('#grActs');
    GistVoice.onState((i, on) => { const b = feed.querySelector(`[data-l="${i}"]`); if (b) b.classList.toggle('speaking', on); });
    const typing = () => { const d = document.createElement('div'); d.className = 'gr-b them typing'; d.innerHTML = `<span class="gr-av">${p.emoji}</span><span class="gr-t"><i></i><i></i><i></i></span>`; feed.appendChild(d); feed.scrollTop = feed.scrollHeight; return d; };
    const mine = (t) => { const d = document.createElement('div'); d.className = 'gr-b me'; d.textContent = t; feed.appendChild(d); feed.scrollTop = feed.scrollHeight; };
    async function load(more) {
      acts.innerHTML = ''; const ty = typing(); let r;
      try { [r] = await Promise.all([api('/api/gist/session', { persona: p.id, more: more ? used : 0 }), new Promise(x => setTimeout(x, 700))]); }
      catch (e) { ty.remove(); if (e.message && /premium/i.test(e.message)) return premiumSheet(p); toast(e.message); return replies(false); }
      ty.remove(); used = r.used; GC = null;
      for (const l of r.lines) {
        const i = all.length; all.push(l.t);
        const ty2 = typing(); await new Promise(x => setTimeout(x, Math.min(1400, 350 + l.t.length * 14))); ty2.remove();
        const d = document.createElement('div'); d.className = 'gr-b them'; d.dataset.l = i;
        d.innerHTML = `<span class="gr-av">${p.emoji}</span><span class="gr-t">${esc(l.t)}</span>${r.premium ? `<button class="gr-play" aria-label="Play this line" ${r.voice ? '' : 'disabled title="Voice coming soon"'}>🔊</button>` : ''}`;
        feed.appendChild(d); feed.scrollTop = feed.scrollHeight; beep('tap');
        const pb = d.querySelector('.gr-play'); if (pb && r.voice) pb.onclick = () => GistVoice.speak(p.id, l.t, i);
        if (r.voice && ls.get('gistAuto', true)) GistVoice.speak(p.id, l.t, i);
      }
      if (r.locked) { const d = document.createElement('div'); d.className = 'gr-lock'; d.innerHTML = `<b>🔒 ${p.emoji} ${esc(p.name.split(' ')[0])} still get ${r.locked} more gist for you…</b><small>Premium unlocks the full gist, every partner, and their voice.</small><button class="btn btn-gold btn-sm">See premium</button>`; d.querySelector('button').onclick = () => premiumSheet(p); feed.appendChild(d); feed.scrollTop = feed.scrollHeight; }
      replies(r.hasMore);
    }
    function replies(hasMore) {
      acts.innerHTML = hasMore ? C.replies.map(x => `<button class="gr-r">${esc(x)}</button>`).join('') : `<button class="gr-r" id="grShare">${IC.wa} Share this gist</button><button class="gr-r" id="grBack">‹ Other partners</button>`;
      acts.querySelectorAll('.gr-r:not([id])').forEach(b => b.onclick = () => { mine(b.textContent); load(true); });
      const sh = acts.querySelector('#grShare'); if (sh) sh.onclick = () => { const txt = `${p.emoji} ${p.name} just gisted me on Detty December 😂\n\n"${all.slice(1, 3).join(' ')}"\n\nCome hear your own gist: ${location.origin}/?ref=${S.me.user.refCode}`; track('share', { channel: 'gist', persona: p.id }); if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank'); };
      const bk = acts.querySelector('#grBack'); if (bk) bk.onclick = home;
    }
    load(false);
  }
  home();
}
// ---------- Christmas Drip Booth (premium clothe swap) ----------
let SWAP = null, SWAPCAT = null, swapDemoStop = null;
const loadSwap = async () => (SWAP = SWAP || await import('/swap.js'));
function swapCard() {
  return `<section class="gist-hero sw-hero" id="swOpen" role="button" tabindex="0" aria-label="Open Christmas Photo Booth">
    <div class="gh-demo" id="swDemo"></div>
    <div class="gh-copy"><small>📸 Photo Booth <em class="free-tag">FREE</em></small><h2>Snap yourself at Lekki Bridge. From your room.</h2>
      <p>Real photos of Naija's favourite spots, lit up for Christmas. Take a selfie and you're there. Change your outfit with AI.</p>
      <ol class="gh-steps"><li><b>1</b>Take a selfie</li><li><b>2</b>Pick a spot</li><li><b>3</b>Dress up and post</li></ol>
      <span class="btn btn-gold">Take my picture</span><small class="gh-free">12 spots · free · made on your phone</small></div></section>`;
}
async function swapCardInit() {
  const host = $('#swDemo'), card = $('#swOpen'); if (!card) return;
  const open = async () => { try { const m = await loadSwap(); m.openSwap({ api, toast, track, beep, confetti, sheet, premiumSheet, redeemSheet, token: S.token, refCode: S.me.user.refCode }); } catch (e) { console.error(e); toast('The Drip Booth no fit open on this phone 😅'); } };
  card.onclick = open; card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  try { const m = await loadSwap(); if (swapDemoStop) swapDemoStop(); if (host.isConnected) swapDemoStop = m.swapDemo(host); } catch (e) { console.error(e); }
}
// Premium unlock code (testing, gifts, promos). onDone runs after premium switches on.
function redeemSheet(onDone) {
  const bg = sheet(`<div class="swx-sh rd"><span class="swx-sh-ic">🎟️</span><h3>Have a code?</h3><p>Enter your premium code to unlock everything.</p>
    <input class="rd-in" id="rdIn" placeholder="DETTY-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40">
    <p class="rd-err" id="rdErr" hidden></p>
    <button class="btn btn-gold" id="rdGo">Unlock premium</button></div>`);
  const inp = bg.querySelector('#rdIn'), err = bg.querySelector('#rdErr'), go = bg.querySelector('#rdGo');
  setTimeout(() => inp.focus(), 250);
  const submit = async () => {
    const code = inp.value.trim(); if (!code) return inp.focus();
    go.disabled = true; go.textContent = 'Checking…'; err.hidden = true;
    try {
      const r = await api('/api/premium/redeem', { code }); GC = null; SWAPCAT = null; beep('win'); confetti(90);
      bg.querySelector('.rd').innerHTML = `<div class="swx-done"><span>👑</span><h3>You're Premium!</h3><p>${r.days} days of everything: every gist partner, every Drip Booth look in HD, and realistic AI when it's on.</p><button class="btn btn-gold" id="rdOk">Let's go</button></div>`;
      bg.querySelector('#rdOk').onclick = () => bg.remove();
      refresh(); if (onDone) onDone();
    } catch (e) { err.textContent = e.message; err.hidden = false; go.disabled = false; go.textContent = 'Unlock premium'; inp.select(); }
  };
  go.onclick = submit; inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
}
async function premiumSheet(p) {
  let C; try { C = await gistConfig(); } catch (e) { return toast(e.message); }
  const from = typeof p === 'string' ? p : p ? p.id : 'hub'; if (typeof p === 'string') p = null;
  track('premium_view', { from });
  const bg = sheet(`<div class="prem"><span class="prem-ic">${from === 'swap' ? '👗' : '🎙️'}</span><h3>Detty Premium</h3><p>${from === 'swap' ? 'Every outfit, every location, HD pictures with no watermark. Plus your own gist partner.' : `Your own gist partner for December. ${p ? `${esc(p.name)} is waiting for you.` : ''}`}</p>
    <ul class="prem-list"><li>🗣️ <b>All 6 gist partners</b><small>Iya Basira, Aunty Ngozi, Amaka IJGB, Mallam Sani, Chuks Cashout and Tunde</small></li>
    <li>♾️ <b>Unlimited gist, all day</b><small>Ask "Ehen?!" and they keep going</small></li>
    <li>🔊 <b>Voice notes in real Naija pidgin</b><small>${C.voice ? 'Live now' : 'Coming soon. Premium members get it first'}</small></li>
    <li>👗 <b>Christmas Drip Booth, all of it</b><small>All 8 outfits and 8 locations, HD, no watermark. Realistic AI swap first when it lands</small></li>
    <li>🧠 <b>Fresh gist every time</b><small>About your friends, your streak, your journey and tonight's show</small></li></ul>
    <div class="prem-plans">${C.plans.map(pl => `<button class="prem-plan ${pl.best ? 'best' : ''}" data-pl="${pl.id}">${pl.best ? '<em>BEST VALUE</em>' : ''}<b>${esc(pl.name)}</b><span>₦${pl.price.toLocaleString()}</span><small>${esc(pl.blurb)}</small>${C.interested.includes(pl.id) ? '<i>✓ You are on the list</i>' : ''}</button>`).join('')}</div>
    <p class="prem-note">Payments open soon. Tap a plan to join the waiting list and we'll tell you first.</p>
    <button class="rd-link" id="prCode">🎟️ Have a code? Enter it</button></div>`);
  bg.querySelector('#prCode').onclick = () => { bg.remove(); redeemSheet(() => { const g = document.querySelector('.overlay.gist'); if (g) { GistVoice.stop(); g.remove(); document.body.style.overflow = ''; gistHub(); } }); };
  bg.querySelectorAll('[data-pl]').forEach(b => b.onclick = async () => { try { await api('/api/premium/interest', { plan: b.dataset.pl }); GC = null; beep('win'); bg.remove(); toast("You're on the list! We'll tell you the moment premium opens 🎙️"); } catch (e) { toast(e.message); } });
}

// ---------- the Party tab ----------
async function viewParty() {
  const m = S.me;
  $('#view').innerHTML = `<div class="wrap">
    ${liveCard(m) || `<div class="livecard off"><span class="lv-ic">🎤</span><span><small>Every night at 8:30pm</small><b>Owambe Night Live</b><em>The show for today don end. Come back tomorrow, join early!</em></span></div>`}
    <section class="love-card" id="loveOpen" role="button" tabindex="0" aria-label="Open Love Corner"><div class="love-head"><span>💘</span><div><small>Love Corner <em class="free-tag">FREE</em></small><h2>Who's your December boo?</h2></div></div>
      <div class="love-mini"><button data-love="pick"><span>💘</span>Pick One</button><button data-love="crush"><span>💞</span>Secret Crush</button><button data-love="boo"><span>💌</span>Be My Boo</button><button data-love="meter"><span>❤️</span>Love Meter</button></div></section>
    <button class="rooms-card" id="roomsOpen"><span>🎭</span><div><b>Gist Rooms <em class="free-tag">FREE</em></b><small>Anonymous group chat for your squad. Nobody knows who said what 🤫</small></div><i>›</i></button>
    ${gistCard()}
    ${swapCard()}
    <div class="fun-row"><button class="fun-card fc-notes" id="snOpenBtn"><em class="free-tag">FREE</em><span>💌</span><b>Sweet Notes</b><small>Anonymous Christmas notes from your people</small></button><button class="fun-card fc-title" id="otOpenBtn"><em class="free-tag">FREE</em><span>👑</span><b>Owambe Title</b><small>The elders give you your December title</small></button></div>
    <section class="pt-hero"><div><small>🪩 Party Mode</small><h2>Everybody don gather for December?</h2><p>One phone, the whole room. Aunty Interrogation, Act Am! and Who Go Pass? Works without data.</p></div><button class="btn btn-gold" id="ptOpen">Start the party</button></section>
    <div class="section-title"><h2>How well do you know me?</h2><span>Your friends guess</span></div>
    <div class="card km-card" id="kmCard"><p>Loading…</p></div>
    <button class="sq-card" id="sqOpen"><span>✍🏾</span><span><b>Send us a question</b><small>About your hometown or December. If we approve it, all of Nigeria plays it, with your name on it · +50 🪙</small></span><span class="go">›</span></button>
  </div>`;
  if ($('#liveBtn')) $('#liveBtn').onclick = openLive;
  $('#ptOpen').onclick = partyHub; $('#sqOpen').onclick = submitQuestion;
  $('#loveOpen').onclick = (e) => { const b = e.target.closest('[data-love]'); if (b && b.dataset.love === 'meter') return loadLove().then(m => m.openMeter(loveCtx())); openLove(b ? b.dataset.love : undefined); }; $('#roomsOpen').onclick = () => openLove('rooms');
  swapCardInit(); $('#snOpenBtn').onclick = openNotes; $('#otOpenBtn').onclick = openTitle; $('#gistOpen').onclick = gistHub; demoPlayer($('#ghDemo'), { compact: true }); $('#gistOpen').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gistHub(); } };
  try {
    const K = await api('/api/knowme');
    const card = $('#kmCard'); if (!card) return;
    card.innerHTML = `${K.mine ? `<div class="km-mine"><b>Your quiz is live</b><small>${K.board.length} friend${K.board.length === 1 ? '' : 's'} took it${K.board[0] ? ` · 👑 ${esc(K.board[0].n)} knows you best (${K.board[0].score}/5)` : ''}</small></div><div class="btn-row"><button class="btn btn-wa" id="kmSh">${IC.wa}Share my quiz</button><button class="btn btn-line" id="kmEd">Edit</button></div>` : `<p>Make a 5-question quiz about yourself: your Christmas food, the question aunty go ask you, your December vibe. Send it to your friends and see who truly knows you.</p><button class="btn btn-gold" id="kmEd">🫶🏾 Make my quiz</button>`}
      ${K.friends.length ? `<div class="km-fr"><small>Your friends' quizzes</small>${K.friends.map(f => `<button data-know="${esc(f.code)}"><span>${esc(f.n)}</span><b>${f.mine != null ? `${f.mine}/5` : 'Take it ›'}</b></button>`).join('')}</div>` : ''}`;
    if ($('#kmSh')) $('#kmSh').onclick = () => knowShare(K.mine.code);
    $('#kmEd').onclick = knowMeSheet;
    document.querySelectorAll('[data-know]').forEach(b => b.onclick = () => takeKnowMe(b.dataset.know));
  } catch {}
}

boot();
})();
