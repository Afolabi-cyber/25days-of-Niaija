/* Detty Air: fly home in 3D. Walk around the cabin as your own character, from the cockpit to the toilets.
   startFlight(o) -> Promise<{ quit, did: string[], coins }>
   o: { from, to, sound, nickname, api, beep, toast } */
import * as THREE from './vendor/three.module.min.js';

// ---------- small helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const SPH = (r, a = 10, b = 8) => new THREE.SphereGeometry(r, a, b);
function part(geo, color, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z);
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
function merge(parts, uv) {
  let n = 0; parts.forEach(p => { n += p.attributes.position.count; });
  const names = uv ? ['position', 'normal', 'uv'] : ['position', 'normal', 'color'], out = {};
  names.forEach(k => { out[k] = new Float32Array(n * (k === 'uv' ? 2 : 3)); });
  let o = 0; parts.forEach(p => { names.forEach(k => out[k].set(p.attributes[k].array, o * (k === 'uv' ? 2 : 3))); o += p.attributes.position.count; p.dispose(); });
  const g = new THREE.BufferGeometry(); names.forEach(k => g.setAttribute(k, new THREE.BufferAttribute(out[k], k === 'uv' ? 2 : 3)));
  g.computeBoundingSphere(); return g;
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texOf(cv, wrap) { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; if (wrap) { t.wrapS = THREE.RepeatWrapping; } return t; }
const FONT = (w, s) => `${w} ${s}px "Bricolage Grotesque", system-ui, sans-serif`;

// ---------- cabin layout (metres). The nose points to -z. ----------
const HW = 1.95;               // half width of the cabin
const WALL = 1.75, CEIL = 2.25;
const ECO0 = 7.2, PITCH = .86, ROWS = 14, ROW1 = 10;   // economy rows 10..23
const BUS = [4.0, 5.5];                                 // business rows 1..2
const ECOX = [-1.45, -.97, -.5, .5, .97, 1.45];          // seats A B C | D E F
const BUSX = [-1.3, -.62, .62, 1.3];
const MY_ROW = 14, MY_SEAT = 0;                          // 14A, window
const rowZ = (r) => ECO0 + (r - ROW1) * PITCH;
const MYZ = rowZ(MY_ROW), MYX = ECOX[MY_SEAT];
const LETTERS = 'ABCDEF';

const SKIN = ['#3E2618', '#5A3825', '#7B4A2E', '#8D5A3B', '#A06A45'];
const CLOTH = ['#D7263D', '#F5B83D', '#1E7A5A', '#1F4FA8', '#6C3483', '#E0A526', '#2E9B72', '#C0392B', '#F2F2F2', '#2B2B2B', '#E86A92', '#0F3A2D', '#8E5BD6', '#FF8C42'];
const OUTFITS = {
  agbada: { name: 'Agbada', e: '👘', top: '#EADFC6', bottom: '#EADFC6', robe: true, hat: '#7A1F2B' },
  ankara: { name: 'Ankara', e: '🌺', top: '#E0A526', trim: '#D7263D', bottom: '#22223A' },
  hoodie: { name: 'IJGB hoodie', e: '🎧', top: '#5B6270', bottom: '#1D2A44', phones: true },
  suit: { name: 'Owambe suit', e: '🤵🏾', top: '#1E2A55', bottom: '#1E2A55', tie: '#F5B83D' },
};

// people you can gist with (name, seat, look, lines)
const PEOPLE = [
  { id: 'emeka', name: 'Uncle Emeka', row: 11, seat: 2, sleep: true, top: '#7B2D26', lines: ['Zzz… *snores* … ehn? We don land? No? Make I sleep back.', 'My guy, wake me up when dem bring food.', 'Last December I sleep for 9 hours for this flight. Record!'] },
  { id: 'tobi', name: 'Mama Tobi', row: 12, seat: 3, baby: true, top: '#E86A92', gele: '#E86A92', lines: ['Tobi, keep quiet! Sorry o, na im first flight.', 'Na Lagos we dey go. My mother never see her grandson!', 'You get pikin? E no easy, I tell you.'] },
  { id: 'kola', name: 'Kola (IJGB)', row: 13, seat: 2, phones: true, top: '#5B6270', lines: ["Bro, I've not been home in 6 years. I'm actually shaking.", 'First thing when I land? Suya. Second thing? More suya.', 'My cousins think I am rich. Please help me.'] },
  { id: 'zainab', name: 'Zainab', row: 14, seat: 1, top: '#1E7A5A', scarf: '#1E7A5A', lines: ['I just finished exams. I need jollof and sleep. In that order.', 'Have you tried the Zobo? E sweet die.', 'My mum said she cooked 3 pots of stew. For only me.'] },
  { id: 'bisi', name: 'Aunty Bisi', row: 16, seat: 3, gele: '#F5B83D', top: '#F5B83D', lines: ['You see my gele? Na for my sister wedding on the 27th!', 'You look like somebody I know. Whose child are you?', 'After landing, abeg help me carry my Ghana-must-go.'] },
  { id: 'tunji', name: 'Pastor Tunji', row: 18, seat: 2, top: '#F2F2F2', lines: ['This flight go land safely. Somebody say amen!', 'December na season of blessing, my pikin.', 'I travel 40 times. Never once did I miss jollof.'] },
  { id: 'dayo', name: 'Dayo the footballer', row: 20, seat: 3, top: '#1F4FA8', lines: ['I play for one small club for Portugal. My village think say na Barcelona.', 'Who you support? Talk true!', 'I don pack 30 jerseys. Everybody for my street go collect.'] },
];
const CREW = {
  funke: { name: 'Aunty Funke', role: 'Cabin crew', lines: ['Welcome aboard, darling! You look fresh for December.', 'Anything you need, just shout "Aunty Funke!"', 'Na 15 years I dey fly. Every December, the plane full of happiness.'] },
  femi: { name: 'Bros Femi', role: 'Cabin crew', lines: ['Hungry? I get jollof wey go make you call your mama.', 'Na me be the jollof police for this plane.', 'Last flight one uncle chop 4 plates. Respect.'] },
  captain: { name: 'Captain Adaeze', role: 'Captain', lines: ['Welcome to the office! Autopilot dey work, me I dey drink tea.', 'Na 20 years I dey fly. December flights na my favourite: everybody dey happy.', 'You see that screen? Na our route home. Small time we go reach.'] },
  musa: { name: 'First Officer Musa', role: 'First officer', lines: ['Sannu! Don\'t touch any button o 😅', 'From up here, Nigeria at night is beautiful. Wait and see.', 'My mama for Kano don dey call me since morning.'] },
};
const FOOD = [['jollof', '🍛', 'Jollof rice & chicken', "Correct choice! Party jollof, smoky bottom pot. Enjoy!"], ['fried', '🍤', 'Fried rice & beef', 'Fried rice with plenty liver. Enjoy, my person!'], ['dodo', '🍌', 'Plantain & stew', 'Dodo and stew, sweet and simple. Enjoy!']];
const DRINKS = [['chapman', '🍹', 'Chapman', 'One cold Chapman, with cucumber on top 😎'], ['malt', '🥤', 'Malt', 'Cold malt! Shake am before you open.'], ['zobo', '🌺', 'Zobo', 'Zobo with ginger. E go clear your eye.'], ['water', '💧', 'Water', 'Water na life. Drink well, harmattan dey wait you.']];
const TODO = [
  ['seat', '🪑', 'Find your seat, 14A'], ['cockpit', '🧑🏾‍✈️', 'Visit the cockpit'], ['drink', '🍹', 'Get a drink from Aunty Funke'], ['food', '🍛', 'Get jollof from the back galley'],
  ['window', '🪟', 'Look out the window'], ['movie', '🎬', 'Watch a Nollywood movie'], ['gist', '💬', 'Gist with 3 people'], ['toilet', '🚻', 'Use the toilet'], ['clap', '👏', 'Clap when the plane lands'],
];

// ---------- the flight: phases (seconds are game seconds; sleeping runs time 10x faster) ----------
function makePhases(to) {
  return [
    { id: 'board', label: 'Boarding · find seat 14A', belt: true, needSeat: true, dur: 2, sky: 'gate', speed: 0, mood: 'warm' },
    { id: 'taxi', label: 'Taxiing to the runway', belt: true, needSeat: true, dur: 9, sky: 'runway', speed: .05, mood: 'warm' },
    { id: 'takeoff', label: 'Take-off!', belt: true, needSeat: true, dur: 10, sky: 'runway', speed: .9, mood: 'warm', shake: .02 },
    { id: 'climb', label: 'Climbing', belt: true, dur: 9, sky: 'day', speed: .08, mood: 'warm', tilt: .05 },
    { id: 'cruise', label: 'Cruising at 37,000 ft', belt: false, dur: 75, sky: 'day', speed: .025, mood: 'day' },
    { id: 'turb', label: 'Small turbulence', belt: true, dur: 12, sky: 'day', speed: .03, mood: 'day', shake: .035 },
    { id: 'sunset', label: 'Sunset over the Sahara', belt: false, dur: 55, sky: 'sunset', speed: .025, mood: 'sunset' },
    { id: 'night', label: 'Night flight', belt: false, dur: 60, sky: 'night', speed: .02, mood: 'night' },
    { id: 'descent', label: `Descending into ${to}`, belt: true, needSeat: true, dur: 16, sky: 'approach', speed: .05, mood: 'night', tilt: -.04 },
    { id: 'land', label: 'Landing', belt: true, needSeat: true, dur: 9, sky: 'landed', speed: .7, mood: 'night', shake: .025 },
    { id: 'arrived', label: `Welcome to ${to}!`, belt: false, dur: Infinity, sky: 'landed', speed: 0, mood: 'warm' },
  ];
}

// ---------- the sky outside the windows (tileable panoramas) ----------
function drawSky(cv, kind, to) {
  const x = cv.getContext('2d'), w = 1024, h = 256, hz = h * .56; x.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0);  // drawn at 1024x256, stored sharper
  const wrap = (fn, X) => { fn(X); fn(X - w); fn(X + w); };
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const grad = (stops, y0 = 0, y1 = h) => { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const clouds = (y0, y1, col, n, big = 1) => { x.fillStyle = col; for (let i = 0; i < n; i++) { const X = rnd() * w, Y = lerp(y0, y1, rnd()), r = (8 + rnd() * 22) * big; wrap(X2 => { x.beginPath(); x.ellipse(X2, Y, r * 2.2, r, 0, 0, 7); x.fill(); }, X); } };
  const stars = (n, y1) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(255,255,255,${.3 + rnd() * .7})`; x.fillRect(rnd() * w, rnd() * y1, 1.5, 1.5); } };
  const lights = (y0, y1, n, cols, size = 2) => { for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; const Y = lerp(y0, y1, Math.pow(rnd(), .7)), s = size * (.5 + (Y - y0) / (y1 - y0)); x.fillRect(rnd() * w, Y, s, s); } };
  if (kind === 'gate' || kind === 'runway') {
    x.fillStyle = grad([[0, '#3f97df'], [1, '#d6eefc']], 0, hz); x.fillRect(0, 0, w, hz);
    clouds(20, hz * .6, 'rgba(255,255,255,.85)', 10);
    x.fillStyle = '#5c8f3c'; x.fillRect(0, hz, w, h - hz);
    if (kind === 'gate') {
      for (let i = 0; i < 8; i++) { const X = i * 128 + 10; x.fillStyle = '#c9ced6'; x.fillRect(X, hz - 70, 110, 70); x.fillStyle = '#6f8fb0'; for (let k = 0; k < 6; k++) x.fillRect(X + 6 + k * 17, hz - 58, 12, 26); }
      x.fillStyle = '#7a7f87'; x.fillRect(0, hz, w, h - hz); x.fillStyle = '#F2C200'; for (let i = 0; i < w; i += 64) x.fillRect(i, hz + 50, 40, 5);
      x.fillStyle = '#fff'; x.font = FONT(800, 22); x.fillText('DETTY AIR ✈ GATE 12', 30, hz - 80);
    } else {
      x.fillStyle = '#2f6d2a'; for (let i = 0; i < w; i += 18) { x.beginPath(); x.arc(i, hz + 2, 10 + (i * 7 % 9), Math.PI, 0); x.fill(); }
      x.fillStyle = '#55595f'; x.fillRect(0, hz + 40, w, 60); x.fillStyle = '#fff'; for (let i = 0; i < w; i += 80) x.fillRect(i, hz + 68, 44, 5);
      x.fillStyle = '#ffd34d'; for (let i = 0; i < w; i += 32) { x.fillRect(i, hz + 38, 4, 4); x.fillRect(i + 16, hz + 100, 5, 5); }
    }
  } else if (kind === 'day') {
    x.fillStyle = grad([[0, '#1d63c4'], [.55, '#7fc0f2'], [1, '#eaf6ff']]); x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.95)'; x.fillRect(0, hz + 20, w, h); clouds(hz, h, '#ffffff', 90, 1.4); clouds(hz + 10, h, 'rgba(220,232,245,.9)', 50, 1.2);
    clouds(10, hz * .5, 'rgba(255,255,255,.5)', 8, .7);
    x.fillStyle = 'rgba(255,250,220,.9)'; x.beginPath(); x.arc(w * .7, 40, 16, 0, 7); x.fill();
  } else if (kind === 'sunset') {
    x.fillStyle = grad([[0, '#2b2d6e'], [.45, '#b4507a'], [.62, '#f08a4b'], [1, '#ffcf7a']]); x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffdc8a'; x.beginPath(); x.arc(w * .35, hz + 6, 26, 0, 7); x.fill();
    clouds(hz + 8, h, 'rgba(255,170,140,.95)', 80, 1.4); clouds(hz + 20, h, 'rgba(190,110,140,.9)', 50, 1.1);
  } else if (kind === 'night') {
    x.fillStyle = grad([[0, '#040818'], [.6, '#12204a'], [1, '#0a0f1e']]); x.fillRect(0, 0, w, h); stars(260, hz);
    x.fillStyle = '#f4f1dc'; x.beginPath(); x.arc(w * .2, 46, 14, 0, 7); x.fill(); x.fillStyle = '#12204a'; x.beginPath(); x.arc(w * .2 + 6, 42, 12, 0, 7); x.fill();
    x.fillStyle = '#1a1712'; x.fillRect(0, hz + 10, w, h); lights(hz + 14, h, 40, ['#ffb347', '#fff2c4'], 1.6);
  } else if (kind === 'approach' || kind === 'landed') {
    x.fillStyle = grad([[0, '#040818'], [1, '#1d2752']], 0, hz); x.fillRect(0, 0, w, hz); stars(120, hz * .7);
    x.fillStyle = '#0d0f17'; x.fillRect(0, hz, w, h);
    if (kind === 'approach') {
      x.strokeStyle = 'rgba(255,190,90,.75)'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { x.beginPath(); const y0 = hz + 10 + i * 13; x.moveTo(0, y0); x.bezierCurveTo(w * .3, y0 + 12, w * .6, y0 - 12, w, y0); x.stroke(); }
      lights(hz + 4, h, 900, ['#ffb347', '#ffd98a', '#ffffff', '#ff8c42'], 2.4);

    } else {
      x.fillStyle = '#2a2d36'; x.fillRect(0, hz + 30, w, 70); x.fillStyle = '#4da3ff'; for (let i = 0; i < w; i += 28) x.fillRect(i, hz + 28, 4, 4);
      for (let i = 0; i < 6; i++) { const X = i * 170 + 20; x.fillStyle = '#3a3f4a'; x.fillRect(X, hz - 60, 150, 60); x.fillStyle = '#ffd98a'; for (let k = 0; k < 8; k++) x.fillRect(X + 8 + k * 18, hz - 48, 10, 18); }
      x.fillStyle = '#1E7A3A'; x.fillRect(30, hz - 104, 380, 36); x.fillStyle = '#fff'; x.font = FONT(800, 22); x.fillText(`WELCOME TO ${to.toUpperCase()} 🇳🇬`, 42, hz - 78);
      x.fillStyle = '#F2C200'; for (let i = 0; i < w; i += 64) x.fillRect(i, hz + 64, 36, 4);
    }
  }
}

// ---------- people ----------
const MATS = new Map();
const lam = (c) => { if (!MATS.has(c)) MATS.set(c, new THREE.MeshLambertMaterial({ color: c })); return MATS.get(c); };
function person(o) {
  const g = new THREE.Group(), add = (geo, c, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, lam(c)); m.position.set(x, y, z); parent.add(m); return m; };
  const HIP = .82;
  const legs = [-.09, .09].map(x => { const l = new THREE.Group(); l.position.set(x, HIP, 0); g.add(l); add(B(.14, .76, .15), o.bottom, 0, -.38, 0, l); add(B(.15, .08, .25), o.shoe || '#1d1d1d', 0, -.78, .05, l); return l; });
  const body = new THREE.Group(); body.position.y = HIP; g.add(body);
  add(B(.38, .54, .23), o.top, 0, .27, 0, body);
  if (o.robe) { add(B(.5, .62, .27), o.top, 0, .14, 0, body); add(B(.46, .5, .25), o.top, 0, -.25, 0, body); }
  if (o.trim) add(B(.39, .06, .24), o.trim, 0, .42, 0, body);
  if (o.tie) add(B(.06, .3, .02), o.tie, 0, .32, .125, body);
  if (o.uniform) { add(B(.39, .08, .24), '#F5B83D', 0, .5, 0, body); add(B(.1, .1, .02), '#fff', -.1, .4, .12, body); }
  const head = new THREE.Group(); head.position.y = .6; body.add(head);
  add(SPH(.135, 12, 10), o.skin, 0, .09, 0, head);
  add(B(.035, .035, .01), '#111', -.048, .11, .13, head); add(B(.035, .035, .01), '#111', .048, .11, .13, head);
  add(B(.07, .015, .01), '#5a1d1d', 0, .03, .13, head);
  if (o.gele) { add(B(.34, .14, .3), o.gele, 0, .23, -.02, head); add(B(.26, .1, .24), o.gele, .05, .32, -.02, head, 0); }
  else if (o.hat) add(B(.26, .12, .26), o.hat, 0, .22, 0, head);
  else if (o.pilot) { add(B(.3, .07, .3), '#1E2A55', 0, .22, .02, head); add(B(.3, .02, .12), '#111', 0, .19, .17, head); add(B(.08, .04, .01), '#F5B83D', 0, .25, .17, head); }
  else if (o.scarf) add(SPH(.155, 12, 8), o.scarf, 0, .1, -.02, head);
  else add(SPH(.14, 10, 6), o.hair || '#151010', 0, .13, -.02, head);
  if (o.phones) { add(B(.32, .04, .05), '#111', 0, .24, 0, head); add(B(.05, .1, .09), '#111', -.15, .1, 0, head); add(B(.05, .1, .09), '#111', .15, .1, 0, head); }
  const arms = [-.24, .24].map(x => { const a = new THREE.Group(); a.position.set(x, .5, 0); body.add(a); add(B(.1, .5, .11), o.top, 0, -.25, 0, a); add(SPH(.055, 8, 6), o.skin, 0, -.53, 0, a); return a; });
  return { g, legs, arms, body, head };
}
function poseWalk(p, t, k) { const s = Math.sin(t * 9) * .55 * k; p.legs[0].rotation.x = s; p.legs[1].rotation.x = -s; p.arms[0].rotation.x = -s * .8; p.arms[1].rotation.x = s * .8; p.body.position.y = .82 + Math.abs(Math.cos(t * 9)) * .025 * k; }
function poseSit(p) { p.legs.forEach(l => { l.rotation.x = -1.35; }); p.arms.forEach(a => { a.rotation.x = -.7; }); p.g.position.y = -.3; }
function poseStand(p) { p.legs.forEach(l => { l.rotation.x = 0; }); p.arms.forEach(a => { a.rotation.x = 0; a.rotation.z = 0; }); p.g.position.y = 0; }

// a seated passenger as merged parts (static, cheap)
function seatedParts(P, x, z, o) {
  const sy = .5, c = o.top, sk = o.skin, lean = o.sleep ? .12 : 0;
  P.push(part(B(.36, .5, .22), c, x, sy + .3, z + .06));                         // torso
  P.push(part(B(.15, .14, .5), o.bottom, x - .09, sy + .06, z - .18), part(B(.15, .14, .5), o.bottom, x + .09, sy + .06, z - .18)); // thighs
  P.push(part(B(.14, .44, .14), o.bottom, x - .09, sy - .17, z - .4), part(B(.14, .44, .14), o.bottom, x + .09, sy - .17, z - .4)); // shins
  P.push(part(B(.1, .42, .11), c, x - .24, sy + .3, z), part(B(.1, .42, .11), c, x + .24, sy + .3, z));
  const hx = x + (o.sleep ? lean : 0), hy = sy + (o.sleep ? .71 : .76), hz = z + .05;
  P.push(part(SPH(.13, 10, 8), sk, hx, hy, hz));
  if (o.gele) { P.push(part(B(.34, .14, .3), o.gele, hx, hy + .14, hz), part(B(.24, .1, .22), o.gele, hx + .04, hy + .22, hz)); }
  else if (o.scarf) P.push(part(SPH(.15, 10, 8), o.scarf, hx, hy + .01, hz + .02));
  else P.push(part(SPH(.135, 8, 6), o.hair || '#151010', hx, hy + .04, hz + .02));
  if (o.phones) P.push(part(B(.3, .04, .05), '#111', hx, hy + .14, hz), part(B(.05, .1, .09), '#111', hx - .14, hy, hz), part(B(.05, .1, .09), '#111', hx + .14, hy, hz));
  if (o.baby) P.push(part(B(.22, .16, .16), '#FFE08A', x, sy + .26, z - .14), part(SPH(.08, 8, 6), sk, x, sy + .4, z - .14));
  if (!o.sleep) P.push(part(B(.03, .03, .01), '#111', hx - .045, hy + .02, hz - .13), part(B(.03, .03, .01), '#111', hx + .045, hy + .02, hz - .13));
}

// ---------- the game ----------
export function startFlight(o) {
  return new Promise((resolve, reject) => {
    const FROM = o.from || 'London', TO = o.to || 'Lagos';
    const FLIGHT = 'DD ' + (2400 + Math.floor(Math.random() * 99));
    const PH = makePhases(TO);
    const flightDur = PH.slice(1, -1).reduce((a, p) => a + p.dur, 0);
    let saved = {}; try { saved = JSON.parse(localStorage.getItem('n25_flightlook') || '{}'); } catch {}
    const S = { t: 0, pi: 0, pt: 0, seated: false, view: 'seat', busy: false, sleep: false, did: new Set(), talked: new Set(), food: null, started: false, done: false,
      x: -1.25, z: 1.55, h: 0, yaw: 0, pitch: -.12, walkT: 0, outfit: saved.outfit || 'ankara', skin: saved.skin || SKIN[2], shake: 0, paT: 0, ambT: 6, nextQuip: 0 };

    // ---------- DOM ----------
    const ov = document.createElement('div'); ov.className = 'fl3d'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' }); }
    catch (e) { ov.remove(); document.body.style.overflow = ''; return reject(e); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    ov.appendChild(renderer.domElement);
    ov.insertAdjacentHTML('beforeend', `
      <div class="fl-top"><button class="fl-x" aria-label="Leave the flight">✕</button>
        <div class="fl-info"><b>${FLIGHT} · ${esc(FROM)} → ${esc(TO)}</b><span id="flph">Boarding</span><div class="fl-bar"><i id="flpb"></i><em id="flpl">✈️</em></div></div>
        <span class="fl-belt" id="flbelt" title="Seatbelt sign">💺</span><button class="fl-list" id="fllist">📋 <b id="flcount">0</b>/${TODO.length}</button></div>
      <div class="fl-pa" id="flpa"></div>
      <div id="flbub"></div>
      <div class="fl-joy" id="fljoy" aria-label="Walk"><i id="fljk"></i></div>
      <div class="fl-acts" id="flacts"></div>
      <div class="fl-hint hidden" id="flhint"></div>
      <div class="fl-fade" id="flfade"></div>
      <div class="fl-card hidden" id="flcard"></div>
      <div class="fl-start" id="flstart"></div>`);
    const $ = (s) => ov.querySelector(s);

    // ---------- scene ----------
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0f1a');
    const cam = new THREE.PerspectiveCamera(72, 1, .05, 80);
    const hemi = new THREE.HemisphereLight('#fff4e0', '#5a4a3a', 1.15); scene.add(hemi);
    const dir = new THREE.DirectionalLight('#ffffff', .55); dir.position.set(2, 5, 3); scene.add(dir);
    const VC = new THREE.MeshLambertMaterial({ vertexColors: true }), GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
    const P = [], G = [];   // static lit parts, static glowing parts

    // floor (carpet) + aisle path lights
    const carpet = canvas(256, 256); { const x = carpet.getContext('2d'); x.fillStyle = '#1b2a4a'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(245,184,61,.25)'; x.lineWidth = 3; for (let i = 0; i < 256; i += 32) for (let k = 0; k < 256; k += 32) { x.beginPath(); x.moveTo(i + 16, k + 4); x.lineTo(i + 28, k + 16); x.lineTo(i + 16, k + 28); x.lineTo(i + 4, k + 16); x.closePath(); x.stroke(); } }
    const ct = texOf(carpet); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(2, 14);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 27.4), new THREE.MeshLambertMaterial({ map: ct })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 10.3); scene.add(floor);
    for (let z = 3.6; z < 19.4; z += .55) { G.push(part(B(.04, .01, .18), '#9fd4ff', -.36, .006, z), part(B(.04, .01, .18), '#9fd4ff', .36, .006, z)); }
    // walls, ceiling, bins, light strips
    const WALLC = '#EDE6D8', BIN = '#E4E1DA', TRIM = '#C9C2B4';
    P.push(part(B(.08, WALL, 23.4), WALLC, -HW - .02, WALL / 2, 11.2), part(B(.08, WALL, 23.4), WALLC, HW + .02, WALL / 2, 11.2));
    P.push(part(B(2.2, .06, 23.4), '#F4F1EA', 0, CEIL, 11.2));
    P.push(part(B(1.05, .06, 23.4), '#EFEAE0', -1.48, 2.0, 11.2, 0, 0, .52), part(B(1.05, .06, 23.4), '#EFEAE0', 1.48, 2.0, 11.2, 0, 0, -.52));
    for (let z = 3.3; z < 19.3; z += 1.3) { [-1, 1].forEach(s => { P.push(part(B(.82, .36, 1.26), BIN, s * 1.52, 1.93, z + .65)); P.push(part(B(.02, .3, 1.2), TRIM, s * 1.1, 1.93, z + .65)); }); }
    const strip = merge([part(B(.05, .03, 16), '#ffffff', -1.08, 2.13, 11.3), part(B(.05, .03, 16), '#ffffff', 1.08, 2.13, 11.3), part(B(.02, .02, 16), '#ffffff', 0, 2.22, 11.3)]);
    const stripMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#ffe9c2' }); scene.add(new THREE.Mesh(strip, stripMat));
    // seatbelt signs: one tiny sign per row block
    const beltGeo = []; for (let z = 3.8; z < 19.3; z += 1.72) beltGeo.push(part(B(.16, .05, .1), '#ffffff', 0, 2.2, z));
    const beltMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#ffb300' }); scene.add(new THREE.Mesh(merge(beltGeo), beltMat));
    // bulkheads: cockpit wall with doorway, business/economy divider, toilet wall
    P.push(part(B(1.55, CEIL, .1), WALLC, -1.2, CEIL / 2, 0), part(B(1.55, CEIL, .1), WALLC, 1.2, CEIL / 2, 0), part(B(.9, .25, .1), WALLC, 0, 2.12, 0));
    P.push(part(B(.06, 1.9, .82), '#cfc6b4', -.42, .95, -.4, 0));    // cockpit door, swung open
    P.push(part(B(1.45, 1.55, .06), '#155C45', -1.2, .78, 6.75), part(B(1.45, 1.55, .06), '#155C45', 1.2, .78, 6.75));
    P.push(part(B(1.2, .1, .07), '#F5B83D', -1.2, 1.2, 6.79), part(B(1.2, .1, .07), '#F5B83D', 1.2, 1.2, 6.79));
    P.push(part(B(HW * 2, CEIL, .1), WALLC, 0, CEIL / 2, 22.6), part(B(HW * 2, CEIL, .1), WALLC, 0, CEIL / 2, 23.9));
    [-.62, .62].forEach((x, i) => { P.push(part(B(.68, 1.9, .04), '#d8d0c0', x, .95, 22.55)); G.push(part(B(.16, .06, .02), i === 0 ? '#ff4d4d' : '#3ddc84', x, 1.98, 22.52)); P.push(part(B(.04, .14, .05), '#888', x + .22, 1.0, 22.52)); });
    // boarding door (left, front galley) and EXIT signs
    P.push(part(B(.04, 1.95, 1.0), '#d9d2c4', -HW + .02, .98, 1.6), part(B(.05, .08, .3), '#999', -HW + .05, 1.0, 1.9));
    G.push(part(B(.3, .1, .03), '#2ecc71', -1.3, 2.05, .07), part(B(.3, .1, .03), '#2ecc71', 0, 2.05, 22.5), part(B(.3, .1, .03), '#2ecc71', 0, 2.05, 6.82));
    // galleys
    P.push(part(B(.9, 1.0, 2.6), '#B7BCC4', 1.45, .5, 1.6), part(B(.9, .05, 2.6), '#8B9099', 1.45, 1.02, 1.6));
    for (let i = 0; i < 4; i++) P.push(part(B(.02, .34, .5), '#6d737c', 1.0, .55, .55 + i * .65));
    P.push(part(B(.85, 1.0, 2.6), '#B7BCC4', -1.47, .5, 21.0), part(B(.85, 1.0, 2.6), '#B7BCC4', 1.47, .5, 21.0), part(B(.85, .9, 2.6), '#C9CDD3', 1.47, 1.65, 21.0));
    P.push(part(B(.4, .9, .7), '#9aa3ad', -.78, .45, 22.1), part(B(.42, .05, .72), '#7d8690', -.78, .92, 22.1));   // trolley
    P.push(part(SPH(.1, 8, 6), '#D7263D', -.85, 1.0, 22.0), part(SPH(.1, 8, 6), '#F5B83D', -.7, 1.0, 22.2));    // food warmers
    // cockpit
    P.push(part(B(.06, 2.0, 3.2), '#2c3340', -1.1, 1.0, -1.6), part(B(.06, 2.0, 3.2), '#2c3340', 1.1, 1.0, -1.6), part(B(2.2, .06, 3.2), '#2c3340', 0, 2.05, -1.6));
    P.push(part(B(2.2, .9, .6), '#1f242c', 0, .45, -2.85));
    P.push(part(B(.3, .35, .5), '#2a2f38', 0, .62, -2.2));
    [-.5, .5].forEach(x => { P.push(part(B(.55, .1, .55), '#3a3f48', x, .5, -1.75), part(B(.55, .8, .1), '#3a3f48', x, .95, -1.48)); });
    P.push(part(B(2.2, .25, .6), '#232831', 0, 1.95, -2.4));
    for (let i = 0; i < 18; i++) G.push(part(B(.04, .03, .02), pick(['#3ddc84', '#ffb300', '#ff4d4d', '#ffffff']), -.8 + i * .095, 1.86, -2.12));
    // windows (frames in the wall, sky behind)
    const frameCv = canvas(128, 160); { const x = frameCv.getContext('2d'); x.fillStyle = '#F2EEE6'; x.fillRect(0, 0, 128, 160); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.roundRect(24, 24, 80, 112, 38); x.fill(); x.globalCompositeOperation = 'source-over'; x.strokeStyle = '#c9c2b4'; x.lineWidth = 5; x.beginPath(); x.roundRect(22, 22, 84, 116, 40); x.stroke(); }
    const frameT = texOf(frameCv), frameMat = new THREE.MeshLambertMaterial({ map: frameT, transparent: true, alphaTest: .5, side: THREE.DoubleSide });
    const skyCv = canvas(2048, 512), skyL = texOf(skyCv, true), skyR = texOf(skyCv, true);
    const winMatL = new THREE.MeshBasicMaterial({ map: skyL }), winMatR = new THREE.MeshBasicMaterial({ map: skyR });
    const winZ = []; for (let r = 0; r < ROWS; r++) winZ.push(rowZ(ROW1 + r) - .05); BUS.forEach(z => winZ.push(z - .1)); winZ.push(2.6, 20.3, 21.4);
    const WL = [], WR = [], FR = [], K = .32;
    winZ.forEach(z => {
      [-1, 1].forEach(s => {
        const g = new THREE.PlaneGeometry(.3, .4); g.rotateY(s < 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(s * (HW - .04), 1.22, z);
        const uv = g.attributes.uv, pos = g.attributes.position;
        for (let i = 0; i < uv.count; i++) { const pz = pos.getZ(i), py = pos.getY(i); uv.setXY(i, s < 0 ? -pz * K : pz * K, .2 + (py - 1.02) / .4 * .55); }
        (s < 0 ? WL : WR).push(g.toNonIndexed());
        const f = new THREE.PlaneGeometry(.46, .58); f.rotateY(s < 0 ? Math.PI / 2 : -Math.PI / 2); f.translate(s * (HW - .055), 1.22, z); FR.push(f.toNonIndexed());
      });
    });
    scene.add(new THREE.Mesh(merge(WL, true), winMatL), new THREE.Mesh(merge(WR, true), winMatR), new THREE.Mesh(merge(FR, true), frameMat));
    // cockpit windshield
    const frontT = texOf(skyCv, true); frontT.repeat.set(.45, 1);
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.1, .75), new THREE.MeshBasicMaterial({ map: frontT })); ws.position.set(0, 1.42, -3.1); ws.rotation.x = -.35; scene.add(ws);
    P.push(part(B(.06, .8, .06), '#1f242c', 0, 1.42, -3.08), part(B(2.2, .08, .1), '#1f242c', 0, 1.06, -3.0));
    // instrument displays (live)
    const instCv = canvas(512, 128), instT = texOf(instCv);
    const inst = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .42), new THREE.MeshBasicMaterial({ map: instT })); inst.position.set(0, .82, -2.54); inst.rotation.x = -.5; scene.add(inst);

    // seats + passengers
    const SEAT = '#155C45', SEAT2 = '#0F3A2D', HEAD = '#F2EEE6', BSEAT = '#7A1F2B';
    const Q = [], screens = [];
    const seat = (x, z, w, col, biz) => {
      P.push(part(B(w, .12, .5), col, x, .44, z + .02), part(B(w, .74, .1), col, x, .82, z + .27), part(B(w * .9, .2, .06), HEAD, x, 1.1, z + .25));
      P.push(part(B(.05, .2, .44), SEAT2, x - w / 2 - .02, .55, z + .02), part(B(.05, .2, .44), SEAT2, x + w / 2 + .02, .55, z + .02), part(B(w * .8, .32, .06), '#222', x, .2, z + .1));
      if (!biz) screens.push(part(B(.2, .13, .01), '#10204a', x, .98, z + .325));
      if (biz) P.push(part(B(w, .05, .1), '#F5B83D', x, 1.2, z + .27));
    };
    const empty = new Set(['15E', '17B', '19F', '21A', '22E', '12F', '2B', '23C', '23D', '18E']);
    const special = new Map(PEOPLE.map(p => [p.row + LETTERS[p.seat], p]));
    for (let r = 0; r < ROWS; r++) ECOX.forEach((x, i) => {
      const row = ROW1 + r, z = rowZ(row), id = row + LETTERS[i]; seat(x, z, .44, SEAT);
      if (row === MY_ROW && i === MY_SEAT) return;
      if (empty.has(id)) return;
      const sp = special.get(id), look = sp ? { top: sp.top, bottom: '#2b2b33', skin: pick(SKIN), gele: sp.gele, scarf: sp.scarf, phones: sp.phones, sleep: sp.sleep, baby: sp.baby }
        : { top: pick(CLOTH), bottom: pick(['#2b2b33', '#1D2A44', '#3b2f2f', '#EADFC6']), skin: pick(SKIN), sleep: Math.random() < .25, gele: Math.random() < .12 ? pick(CLOTH) : null, phones: Math.random() < .1 };
      seatedParts(Q, x, z, look);
    });
    BUS.forEach((z, r) => BUSX.forEach((x, i) => { seat(x, z, .62, BSEAT, true); if (!empty.has((r + 1) + LETTERS[i])) seatedParts(Q, x, z, { top: pick(CLOTH), bottom: '#1D2A44', skin: pick(SKIN), sleep: Math.random() < .4 }); }));
    // my seat-back screen (row in front) plays a movie; the rest just glow
    const movieCv = canvas(320, 200), movieT = texOf(movieCv);
    const myScreen = new THREE.Mesh(new THREE.PlaneGeometry(.2, .13), new THREE.MeshBasicMaterial({ map: movieT })); myScreen.position.set(MYX, .98, rowZ(MY_ROW - 1) + .332); scene.add(myScreen);
    // tray table with food (shown after you get food)
    const tray = new THREE.Group(); tray.add(new THREE.Mesh(B(.36, .02, .26), lam('#d9d4c8')));
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.09, .08, .02, 16), lam('#ffffff')); plate.position.y = .02; tray.add(plate);
    const rice = new THREE.Mesh(SPH(.06, 10, 6), lam('#E0702A')); rice.scale.y = .5; rice.position.set(-.02, .04, 0); tray.add(rice);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.03, .025, .08, 10), lam('#C0392B')); cup.position.set(.13, .05, -.06); tray.add(cup);
    tray.position.set(MYX, .72, MYZ - .28); tray.visible = false; scene.add(tray);
    // my seat marker
    const markCv = canvas(128, 64); { const x = markCv.getContext('2d'); x.fillStyle = '#F5B83D'; x.beginPath(); x.roundRect(4, 4, 120, 56, 18); x.fill(); x.fillStyle = '#0B2A21'; x.font = FONT(900, 34); x.textAlign = 'center'; x.fillText('14A', 64, 45); }
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(markCv), depthTest: false })); marker.scale.set(.42, .21, 1); marker.position.set(MYX + .3, 1.55, MYZ); scene.add(marker);

    scene.add(new THREE.Mesh(merge(P), VC), new THREE.Mesh(merge(G), GLOW), new THREE.Mesh(merge(Q), VC), new THREE.Mesh(merge(screens), GLOW));

    // crew + pilots + me
    const crew = {
      funke: person({ top: '#1E7A5A', bottom: '#1E7A5A', skin: SKIN[2], uniform: true, scarf: '#F5B83D' }),
      femi: person({ top: '#1E7A5A', bottom: '#1D2A44', skin: SKIN[1], uniform: true }),
      captain: person({ top: '#F2F2F2', bottom: '#1E2A55', skin: SKIN[3], pilot: true }),
      musa: person({ top: '#F2F2F2', bottom: '#1E2A55', skin: SKIN[0], pilot: true }),
    };
    crew.funke.g.position.set(.55, 0, 1.9); crew.funke.g.rotation.y = -Math.PI / 2;
    crew.femi.g.position.set(.2, 0, 21.7); crew.femi.g.rotation.y = Math.PI;
    crew.captain.g.position.set(-.5, .18, -1.85); crew.captain.g.rotation.y = Math.PI; poseSit(crew.captain); crew.captain.g.position.y = -.12;
    crew.musa.g.position.set(.5, .18, -1.85); crew.musa.g.rotation.y = Math.PI; poseSit(crew.musa); crew.musa.g.position.y = -.12;
    crew.captain.arms.forEach(a => { a.rotation.x = -1.2; }); crew.musa.arms.forEach(a => { a.rotation.x = -1.1; });
    Object.values(crew).forEach(c => scene.add(c.g));
    let me = null;
    function buildMe() {
      if (me) scene.remove(me.g);
      const f = OUTFITS[S.outfit]; me = person({ ...f, skin: S.skin, hat: f.hat });
      scene.add(me.g);
    }
    buildMe();

    // ---------- audio ----------
    let actx = null, engine = null;
    const AC = () => { if (!o.sound) return null; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch { return null; } };
    function startEngine() {
      const a = AC(); if (!a || engine) return;
      const len = a.sampleRate * 2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0); let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
      const src = a.createBufferSource(); src.buffer = buf; src.loop = true; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const g = a.createGain(); g.gain.value = .0;
      src.connect(f).connect(g).connect(a.destination); src.start(); engine = { g, f };
    }
    const tone = (fs, dur = .25, type = 'sine', vol = .08) => { const a = AC(); if (!a) return; fs.forEach((f, i) => { const os = a.createOscillator(), g = a.createGain(); os.type = type; os.frequency.value = f; const st = a.currentTime + i * (dur * .9); g.gain.setValueAtTime(.0001, st); g.gain.exponentialRampToValueAtTime(vol, st + .02); g.gain.exponentialRampToValueAtTime(.0001, st + dur); os.connect(g).connect(a.destination); os.start(st); os.stop(st + dur + .05); }); };
    const chime = () => tone([880, 660], .5, 'sine', .07);
    const noiseBurst = (n, spread, vol, hp) => { const a = AC(); if (!a) return; for (let k = 0; k < n; k++) { const len = a.sampleRate * .05, b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4); const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.buffer = b; g.gain.value = vol * (.5 + Math.random() * .5); s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + Math.random() * spread); } };
    const applause = (n = 90) => noiseBurst(n, 3.2, .18, 1200);
    const flush = () => { const a = AC(); if (!a) return; const len = a.sampleRate * 1.6, b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len) * .6; const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'bandpass'; f.frequency.value = 700; g.gain.value = .35; s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start(); };

    // ---------- HUD helpers ----------
    const done = (id) => { if (S.did.has(id)) return; S.did.add(id); $('#flcount').textContent = S.did.size; const t = TODO.find(x => x[0] === id); o.beep && o.beep('ok'); pa(`${t[1]} Done: ${t[2]}`, '✅', 2200); };
    let paTimer; function pa(text, who = '📢', ms = 4200) { const el = $('#flpa'); el.innerHTML = `<span>${who}</span> ${esc(text)}`; el.classList.add('on'); clearTimeout(paTimer); paTimer = setTimeout(() => el.classList.remove('on'), ms); }
    const bubbles = [];
    function say(pos, text, ms = 3600, cls = '') {
      const el = document.createElement('div'); el.className = 'fl-bub ' + cls; el.textContent = text; $('#flbub').appendChild(el);
      const b = { el, pos: pos.clone(), until: S.t + ms / 1000 }; bubbles.push(b); while (bubbles.length > 3) { const x = bubbles.shift(); x.el.remove(); }
      return b;
    }
    function card(html, onClose) {
      const c = $('#flcard'); c.innerHTML = `<div class="fl-cin"><button class="sheet-x" aria-label="Close">✕</button>${html}</div>`; c.classList.remove('hidden'); S.busy = true;
      const close = () => { c.classList.add('hidden'); c.innerHTML = ''; S.busy = false; if (onClose) onClose(); };
      c.querySelector('.sheet-x').onclick = close; c.onclick = (e) => { if (e.target === c) close(); };
      return { el: c, close };
    }
    function checklist() {
      card(`<h3>📋 Your flight bucket list</h3><p>Things to do before we land. Each one pays 10 🪙 when you land (once a day).</p>
        <div class="fl-todo">${TODO.map(([id, e, t]) => `<div class="${S.did.has(id) ? 'ok' : ''}"><span>${S.did.has(id) ? '✅' : e}</span>${esc(t)}${id === 'gist' ? ` <small>(${Math.min(3, S.talked.size)}/3)</small>` : ''}</div>`).join('')}</div>
        ${S.pi >= 3 && S.pi < 8 ? '<button class="btn btn-line" id="flskip">⏩ Skip to landing</button>' : ''}`);
      const sk = $('#flskip'); if (sk) sk.onclick = () => { $('#flcard').querySelector('.sheet-x').click(); S.pi = 7; S.pt = PH[7].dur - .1; };
    }
    $('#fllist').onclick = checklist;
    $('.fl-x').onclick = () => {
      const c = card(`<h3>Leave the flight?</h3><p>${S.started ? `You'll skip straight to ${esc(TO)}.` : 'You can board again any time from the Journey tab.'}</p><div class="fl-row"><button class="btn btn-gold" id="flstay">Keep flying ✈️</button><button class="btn btn-line" id="flleave">Leave</button></div>`);
      $('#flstay').onclick = c.close; $('#flleave').onclick = () => finish(true);
    };

    // ---------- start: pick your travel fit ----------
    function startCard() {
      const st = $('#flstart');
      st.innerHTML = `<div class="fl-scard"><button class="sheet-x" aria-label="Close" id="flsx">✕</button><small>✈️ Detty Air · ${FLIGHT}</small><h2>${esc(FROM)} → ${esc(TO)}</h2>
        <p>Board the plane, find your seat, chop jollof, visit the captain and land home for December.</p>
        <div class="fl-lbl">Your travel fit</div><div class="fl-fits">${Object.entries(OUTFITS).map(([k, f]) => `<button data-fit="${k}" class="${k === S.outfit ? 'on' : ''}"><span>${f.e}</span>${f.name}</button>`).join('')}</div>
        <div class="fl-lbl">Skin tone</div><div class="fl-skins">${SKIN.map(c => `<button data-skin="${c}" style="background:${c}" class="${c === S.skin ? 'on' : ''}" aria-label="Skin tone"></button>`).join('')}</div>
        <button class="btn btn-gold" id="flgo">🎫 Board the plane</button><small class="fl-how">Walk with the left stick (or WASD). Drag anywhere else to look around.</small></div>`;
      st.querySelectorAll('[data-fit]').forEach(b => b.onclick = () => { S.outfit = b.dataset.fit; st.querySelectorAll('[data-fit]').forEach(x => x.classList.toggle('on', x === b)); buildMe(); });
      st.querySelectorAll('[data-skin]').forEach(b => b.onclick = () => { S.skin = b.dataset.skin; st.querySelectorAll('[data-skin]').forEach(x => x.classList.toggle('on', x === b)); buildMe(); });
      $('#flsx').onclick = () => finish(true, true);
      $('#flgo').onclick = () => {
        try { localStorage.setItem('n25_flightlook', JSON.stringify({ outfit: S.outfit, skin: S.skin })); } catch {}
        st.remove(); S.started = true; startEngine(); chime();
        pa(`Welcome aboard Detty Air ${FLIGHT} from ${FROM} to ${TO}! Find your seat, 14A, by the window. Your people dey wait for you 🇳🇬`, '👩🏾‍✈️', 6500);
        hint('👈 Walk with the stick · drag to look around');
        say(crew.funke.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .35, 0)), 'Welcome, darling! 14A is down the aisle 👉🏾');
      };
    }
    let hintT; function hint(t) { const h = $('#flhint'); h.textContent = t; h.classList.remove('hidden'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.add('hidden'), 6000); }

    // ---------- input: joystick, look-drag, keyboard ----------
    const joy = { x: 0, y: 0, id: null }, look = { id: null, x: 0, y: 0 }, keys = {};
    const jEl = $('#fljoy'), jk = $('#fljk');
    jEl.addEventListener('pointerdown', (e) => { e.preventDefault(); joy.id = e.pointerId; jEl.setPointerCapture(e.pointerId); moveJoy(e); });
    jEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) moveJoy(e); });
    const endJoy = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; jk.style.transform = ''; };
    jEl.addEventListener('pointerup', endJoy); jEl.addEventListener('pointercancel', endJoy);
    function moveJoy(e) { const r = jEl.getBoundingClientRect(), R = r.width / 2; let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const m = Math.hypot(dx, dy); if (m > R * .8) { dx *= R * .8 / m; dy *= R * .8 / m; } joy.x = dx / (R * .8); joy.y = -dy / (R * .8); jk.style.transform = `translate(${dx}px,${dy}px)`; $('#flhint').classList.add('hidden'); }
    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', (e) => { S.yawT = null; look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (e.pointerId !== look.id) return; S.yaw -= (e.clientX - look.x) * .006; S.pitch = clamp(S.pitch - (e.clientY - look.y) * .004, -.7, .5); look.x = e.clientX; look.y = e.clientY; });
    const endLook = (e) => { if (e.pointerId === look.id) look.id = null; };
    cv.addEventListener('pointerup', endLook); cv.addEventListener('pointercancel', endLook);
    const kd = (e) => { if (/^(Arrow|Key[WASDQE]|Space|Enter)/.test(e.code)) { keys[e.code] = true; if (e.code === 'Space' || e.code === 'Enter') { const b = $('#flacts .fl-act'); if (b && !S.busy) b.click(); } } };
    const ku = (e) => { keys[e.code] = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);

    // ---------- walking and collisions ----------
    function free(x, z) {
      if (z < -2.15 || z > 22.35) return false;
      if (z < -.12) return Math.abs(x) < .82 && !(z < -1.4 && Math.abs(x) > .2);  // cockpit (pilot seats at the sides)
      if (z < .12) return Math.abs(x) < .36;                                         // cockpit doorway
      if (z < 3.25) return x > -1.6 && x < .95;                                      // front galley
      if (z < 6.62) return Math.abs(x) < .4;                                         // business aisle
      if (z < 19.55) return Math.abs(x) < .28;                                       // economy aisle
      return Math.abs(x) < 1.0;                                                      // back galley
    }
    function walk(dt) {
      let jx = joy.x, jy = joy.y;
      if (keys.KeyW || keys.ArrowUp) jy = 1; if (keys.KeyS || keys.ArrowDown) jy = -1; if (keys.KeyA || keys.ArrowLeft) jx = -1; if (keys.KeyD || keys.ArrowRight) jx = 1;
      if (keys.KeyQ) S.yaw += dt * 2; if (keys.KeyE) S.yaw -= dt * 2;
      const m = Math.min(1, Math.hypot(jx, jy));
      if (m < .12) { S.walkT = 0; S.downT = 0; S.flip = false; poseWalk(me, 0, 0); return; }
      // Walking toward the camera: after a moment the camera swings round behind you, and the stick keeps
      // meaning the same direction until you let go, so you keep walking where you were going.
      if (!S.flip && jy < -.5 && Math.abs(jx) < .7) { S.downT = (S.downT || 0) + dt; if (S.downT > .35) { S.flip = true; S.yawT = S.yaw + Math.PI; } } else if (!S.flip) S.downT = 0;
      if (S.flip) { jx = -jx; jy = -jy; }
      const by = S.flip && S.yawT != null ? S.yawT : S.yaw;   // while the camera swings, steer by where it is going
      const fx = Math.sin(by), fz = Math.cos(by), rx = -Math.cos(by), rz = Math.sin(by);
      let vx = fx * jy + rx * jx, vz = fz * jy + rz * jx; const vm = Math.hypot(vx, vz) || 1; vx /= vm; vz /= vm;
      const sp = 1.7 * m * dt, nx = S.x + vx * sp, nz = S.z + vz * sp;
      if (free(nx, nz)) { S.x = nx; S.z = nz; } else if (free(nx, S.z)) S.x = nx; else if (free(S.x, nz)) S.z = nz;
      else { // nudge toward the aisle centre so corners don't trap you
        const cx = S.x * .8; if (free(cx, nz)) { S.x = cx; S.z = nz; }
      }
      const th = Math.atan2(vx, vz); let d = th - S.h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; S.h += d * Math.min(1, dt * 12);
      S.walkT += dt * m; poseWalk(me, S.walkT, m);
      // the camera slowly follows the way you walk
      if (jy > .3 && S.yawT == null) { let dy = th - S.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; S.yaw += dy * Math.min(1, dt * 1.5); }
    }

    // ---------- sitting ----------
    function sit() {
      S.seated = true; S.view = 'seat'; poseSit(me); me.g.position.set(MYX, -.3 + .0, MYZ + .05); me.g.rotation.y = Math.PI; S.yaw = Math.PI; S.pitch = -.05;
      marker.visible = false; done('seat'); joyShow(false);
      say(new THREE.Vector3(ECOX[1], 1.45, MYZ), pick(['Hello neighbour! 👋🏾', 'Ah, you be my seat mate? Welcome!', 'You fit pass me the armrest? Joking 😅']), 3000);
      S.talkedTo = 'zainab';
    }
    function stand() {
      if (PH[S.pi].needSeat && PH[S.pi].id !== 'board') return pa('Seatbelt sign is on 🔒 Wait small, we dey ' + PH[S.pi].label.toLowerCase(), '👩🏾‍✈️', 3000);
      S.seated = false; S.sleep = false; $('#flfade').classList.remove('sleep'); poseStand(me); S.x = 0; S.z = MYZ; S.yaw = 0; S.pitch = -.12; joyShow(true);
    }
    function joyShow(on) { jEl.classList.toggle('hidden', !on); }

    // ---------- interactions ----------
    const near = (x, z, r) => Math.hypot(S.x - x, S.z - z) < r;
    const headOf = (x, z) => new THREE.Vector3(x, 1.5, z);
    const talkSpots = PEOPLE.filter(p => p.id !== 'zainab').map(p => ({ p, x: ECOX[p.seat] < 0 ? -.22 : .22, z: rowZ(p.row), hx: ECOX[p.seat], hz: rowZ(p.row), i: 0 }));
    function gist(name, id, pos, lines) {
      const k = (S.lineIdx = S.lineIdx || {})[id] = ((S.lineIdx[id] ?? -1) + 1) % lines.length;
      say(pos, `${name}: ${lines[k]}`, 4200); o.beep && o.beep('tap');
      if (!['funke', 'femi', 'captain', 'musa'].includes(id)) { S.talked.add(id); if (S.talked.size >= 3) done('gist'); }
    }
    function actions() {
      if (!S.started || S.busy || S.done) return [];
      const ph = PH[S.pi], out = [];
      if (S.seated) {
        if (ph.id === 'arrived') out.push(['🧳 Collect my bags', arrive]);
        if (ph.id === 'land' || ph.id === 'arrived') out.push(['👏 Clap!', clap]);
        if (S.view !== 'seat') out.push(['💺 Sit back', () => { S.view = 'seat'; S.yaw = Math.PI; S.pitch = -.05; }]);
        if (S.view !== 'window') out.push(['🪟 Window', () => { S.view = 'window'; S.yaw = -Math.PI / 2; S.pitch = 0; S.winT = S.t; }]);
        if (S.view !== 'movie' && ph.id !== 'arrived') out.push(['🎬 Movie', () => { S.view = 'movie'; S.yaw = Math.PI; S.pitch = -.12; S.movT = S.t; }]);
        if (S.food && !S.ate) out.push([`${S.food[1]} Eat`, eat]);
        out.push(['💬 Zainab', () => gist('Zainab', 'zainab', new THREE.Vector3(ECOX[1], 1.45, MYZ), PEOPLE.find(p => p.id === 'zainab').lines)]);
        if (['cruise', 'sunset', 'night'].includes(ph.id)) out.push([S.sleep ? '⏰ Wake up' : '😴 Sleep', toggleSleep]);
        if (ph.id !== 'arrived') out.push(['🚶 Stand up', stand]);
        return out;
      }
      if (ph.id === 'arrived') out.push(['🧳 Collect my bags', arrive]);
      if (near(0, MYZ, .75)) out.push(['🪑 Sit in 14A', sit]);
      if (near(.3, 1.9, 1.0)) out.push(['💁🏾‍♀️ Talk to Aunty Funke', () => crewMenu('funke')]);
      if (near(.1, 21.3, 1.1)) out.push(['🍛 Talk to Bros Femi', () => crewMenu('femi')]);
      if (near(-.3, -1.3, .9)) out.push(['🧑🏾‍✈️ Gist with the Captain', () => gist('Captain Adaeze', 'captain', new THREE.Vector3(-.5, 1.45, -1.9), [...CREW.captain.lines, `We go land for ${TO} in about ${Math.max(1, Math.round(remaining() / flightDur * 360))} minutes.`])]);
      if (near(.3, -1.3, .9)) out.push(['👨🏾‍✈️ Gist with First Officer Musa', () => gist('First Officer Musa', 'musa', new THREE.Vector3(.5, 1.45, -1.9), CREW.musa.lines)]);
      if (near(0, 22.2, .8)) out.push(['🚻 Use the toilet', toilet]);
      for (const s of talkSpots) if (near(s.x, s.z, .55)) { out.push([`💬 Gist with ${s.p.name}`, () => gist(s.p.name, s.p.id, headOf(s.hx, s.hz), s.p.lines)]); break; }
      return out;
    }
    let lastActs = '';
    function paintActs() {
      const list = actions(), key = list.map(a => a[0]).join('|'); if (key === lastActs) return; lastActs = key;
      const el = $('#flacts'); el.innerHTML = list.map((a, i) => `<button class="fl-act ${i ? 'sm' : ''}" data-a="${i}">${a[0]}</button>`).join('');
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const a = actions()[+b.dataset.a]; if (a) { a[1](); lastActs = ''; } });
    }
    function crewMenu(id) {
      const isF = id === 'funke', list = isF ? DRINKS : FOOD, c = CREW[id];
      if (['board', 'taxi', 'takeoff', 'climb', 'descent', 'land'].includes(PH[S.pi].id)) return say(isF ? new THREE.Vector3(.55, 1.6, 1.9) : new THREE.Vector3(.2, 1.6, 21.7), `${c.name}: ${isF ? 'Wait till we dey cruise, darling. Go sit down first 😊' : 'Kitchen go open when we reach cruise. Go sit down!'}`);
      const m = card(`<div class="fl-crew"><span>${isF ? '💁🏾‍♀️' : '🧑🏾‍🍳'}</span><div><b>${c.name}</b><small>${c.role}</small></div></div><p>"${esc(pick(c.lines))}"</p>
        <div class="fl-lbl">${isF ? 'Wetin you go drink?' : 'Chicken or beef? Or…'}</div><div class="fl-menu">${list.map(([k, e, n]) => `<button data-k="${k}"><span>${e}</span>${esc(n)}</button>`).join('')}</div>`);
      m.el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const it = list.find(x => x[0] === b.dataset.k); m.close();
        say(isF ? new THREE.Vector3(.55, 1.6, 1.9) : new THREE.Vector3(.2, 1.6, 21.7), `${c.name}: ${it[3]}`);
        if (isF) { done('drink'); cup.material = lam(it[0] === 'water' ? '#9fd4ff' : it[0] === 'zobo' ? '#7a1f2b' : it[0] === 'malt' ? '#3b2412' : '#d9482b'); }
        else { S.food = it; done('food'); tray.visible = true; rice.material = lam(it[0] === 'jollof' ? '#E0702A' : it[0] === 'fried' ? '#E8C26A' : '#F2B33D'); pa(`${it[1]} Your food dey wait for you for seat 14A. Go chop am!`, '🧑🏾‍🍳', 3500); }
      });
    }
    function eat() { S.ate = true; o.beep && o.beep('win'); say(new THREE.Vector3(MYX, 1.5, MYZ), pick(['Mmm! This jollof get ginger 😋', 'Omo, e sweet die! 😋', 'Who cook this one? Give am award 😋']), 3200); setTimeout(() => { rice.visible = false; }, 2500); }
    function toilet() {
      if (!S.toiletTries) { S.toiletTries = 1; say(new THREE.Vector3(-.62, 1.8, 22.5), 'Occupied! 🙈 Somebody don dey inside since Sahara', 3000); return; }
      S.busy = true; const f = $('#flfade'); f.classList.add('on'); f.innerHTML = '<span>🚻 …</span>';
      setTimeout(() => { flush(); f.innerHTML = '<span>🚽 Whoosh! 💨</span>'; }, 1200);
      setTimeout(() => { f.classList.remove('on'); f.innerHTML = ''; S.busy = false; done('toilet'); S.z = 21.9; }, 2600);
    }
    function toggleSleep() { S.sleep = !S.sleep; $('#flfade').classList.toggle('sleep', S.sleep); if (S.sleep) pa('😴 Sleeping… time goes 10× faster. We go wake you before landing.', '💤', 3000); }
    function clap() { done('clap'); applause(40); o.beep && o.beep('win'); say(new THREE.Vector3(MYX, 1.5, MYZ), '👏🏾👏🏾👏🏾 Thank you Jesus! Thank you Captain!', 2600); }
    const remaining = () => { let r = 0; for (let i = Math.max(1, S.pi); i < PH.length - 1; i++) r += i === S.pi ? PH[i].dur - S.pt : PH[i].dur; return Math.max(0, r); };

    // ---------- phases ----------
    function enterPhase(i) {
      const ph = PH[i]; S.pi = i; S.pt = 0;
      drawSky(skyCv, ph.sky, TO); skyL.needsUpdate = skyR.needsUpdate = frontT.needsUpdate = true;
      beltMat.color.set(ph.belt ? '#ffb300' : '#3a3a3a'); $('#flbelt').classList.toggle('on', ph.belt);
      const mood = { warm: ['#ffe9c2', '#fff4e0', 1.15], day: ['#ffffff', '#ffffff', 1.2], sunset: ['#ffb27a', '#ffe1c8', 1.0], night: ['#8f6bff', '#b9a8ff', .72] }[ph.mood];
      stripMat.color.set(mood[0]); hemi.color.set(mood[1]); hemi.intensity = mood[2];
      if (ph.belt && i > 0) chime();
      const lines = {
        taxi: ['Cabin crew, arm doors and cross-check. Abeg fasten your seatbelt, we dey go!', '👨🏾‍✈️'],
        takeoff: ['We are cleared for take-off! Hold your chin chin tight 🛫', '👨🏾‍✈️'],
        cruise: [`Captain Adaeze here. We don reach 37,000 feet. Seatbelt sign don off, you fit waka. Drinks dey front, jollof dey back. The cockpit door is open, come greet us!`, '👩🏾‍✈️'],
        turb: ['Small shake-shake 🫨 No panic. If you dey waka, hold something or go sit down.', '👩🏾‍✈️'],
        sunset: ['Look outside your window: sunset over the Sahara. E fine die 🌅', '👩🏾‍✈️'],
        night: [`Lights don dim. Rest small, watch movie. We go land ${TO} by night 🌙`, '💁🏾‍♀️'],
        descent: [`We don start to descend into ${TO}! Return to seat 14A and fasten your seatbelt. December don land! 🎄`, '👩🏾‍✈️'],
        land: ['Cabin crew, prepare for landing 🛬', '👩🏾‍✈️'],
        arrived: [`Welcome to ${TO}! Local temperature 29 degrees. Merry Christmas, and welcome home! 🇳🇬`, '👩🏾‍✈️'],
      }[ph.id];
      if (lines) pa(lines[0], lines[1], 6500);
      if (ph.id === 'descent' && S.sleep) toggleSleep();
      if (ph.id === 'arrived') {
        applause(140); [[-1.45, 11], [.97, 12], [-.5, 13], [1.45, 15], [-.97, 16], [.5, 18], [-1.45, 19]].forEach(([x, r], k) => setTimeout(() => say(new THREE.Vector3(x, 1.45, rowZ(r)), pick(['👏🏾👏🏾👏🏾', 'Thank you Jesus! 🙌🏾', 'Captain, you try! 👏🏾', 'Naija we hail thee! 🇳🇬', 'Home sweet home! 🏠']), 3000, 'clap'), k * 350));
        if (!S.seated) hint('Everybody dey clap! 👏🏾 Collect your bags when you ready');
      }
      lastActs = '';
    }
    function tickPhase(dt) {
      const ph = PH[S.pi];
      if (ph.needSeat && !S.seated) {
        if (S.t - S.paT > 14) { S.paT = S.t; if (S.pi > 0) pa(`Seatbelt sign is on 💺 Abeg go back to seat 14A so we can ${ph.id === 'land' || ph.id === 'descent' ? 'land' : 'move'}.`, '💁🏾‍♀️', 4500); }
        marker.visible = true; return;
      }
      S.pt += dt * (S.sleep ? 10 : 1);
      if (S.pt >= ph.dur && S.pi < PH.length - 1) enterPhase(S.pi + 1);
    }

    // ---------- live textures ----------
    const MOVIE = [['BLOOD OF JOLLOF', 'Part 2 · A Detty Air Original'], ['Chioma', 'You did WHAT with my jollof?!'], ['Emeka', 'Mama, I can explain!'], ['Chioma', 'Explain to God!'], ['', '*dramatic music* 🎻'], ['Emeka', 'The money… it was for December!'], ['Chioma', 'Eeeeeh! Ritualist!'], ['Pastor', 'Fire! Fire! FIRE!'], ['', 'TO BE CONTINUED… in Part 3']];
    function drawMovie() {
      const x = movieCv.getContext('2d'), w = 320, h = 200, k = Math.floor(S.t / 2.6) % MOVIE.length, [who, line] = MOVIE[k], f = S.t;
      x.fillStyle = k === 0 || k === MOVIE.length - 1 ? '#120a0a' : '#5b3a29'; x.fillRect(0, 0, w, h);
      if (k && k < MOVIE.length - 1) {
        x.fillStyle = '#7d5a43'; x.fillRect(0, 120, w, 80); x.fillStyle = '#2f6d9a'; x.fillRect(220, 30, 70, 60); x.fillStyle = '#E0A526'; x.fillRect(30, 90, 50, 40);
        const zoom = 1 + .05 * Math.sin(f * 3);
        [[110, '#D7263D', who === 'Chioma'], [200, '#1E2A55', who === 'Emeka' || who === 'Pastor']].forEach(([cx, col, talk]) => { x.fillStyle = col; x.fillRect(cx - 22, 92, 44, 70); x.fillStyle = '#7B4A2E'; x.beginPath(); x.arc(cx, 76 - (talk ? Math.abs(Math.sin(f * 8)) * 3 : 0), 20 * (talk ? zoom : 1), 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(cx - 8, 72, 5, 5); x.fillRect(cx + 3, 72, 5, 5); });
      }
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, 150, w, 50); x.fillStyle = '#fff'; x.textAlign = 'center';
      if (k === 0) { x.fillStyle = '#F5B83D'; x.font = FONT(900, 34); x.fillText(who, w / 2, 90); x.fillStyle = '#fff'; x.font = FONT(700, 16); x.fillText(line, w / 2, 120); }
      else { x.font = FONT(800, 17); x.fillText(who ? `${who}: ${line}` : line, w / 2, 182); }
      movieT.needsUpdate = true;
    }
    function drawInst() {
      const x = instCv.getContext('2d'), w = 512, h = 128, ph = PH[S.pi], prog = progress();
      x.fillStyle = '#05080d'; x.fillRect(0, 0, w, h);
      // attitude
      x.save(); x.beginPath(); x.rect(8, 8, 150, 112); x.clip(); const tilt = (ph.tilt || 0) * 400 + Math.sin(S.t) * 2; x.fillStyle = '#2f7fd6'; x.fillRect(0, 0, 170, 64 + tilt); x.fillStyle = '#8a5a2b'; x.fillRect(0, 64 + tilt, 170, 80); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(8, 64 + tilt); x.lineTo(158, 64 + tilt); x.stroke(); x.restore();
      x.strokeStyle = '#F5B83D'; x.lineWidth = 4; x.beginPath(); x.moveTo(50, 64); x.lineTo(73, 64); x.moveTo(93, 64); x.lineTo(116, 64); x.stroke();
      const alt = { board: 0, taxi: 0, takeoff: 800, climb: 18000, cruise: 37000, turb: 37000, sunset: 38000, night: 38000, descent: 9000, land: 300, arrived: 0 }[ph.id], spd = { board: 0, taxi: 18, takeoff: 160, climb: 290, descent: 250, land: 140, arrived: 0 }[ph.id] ?? 480;
      x.fillStyle = '#3ddc84'; x.font = FONT(800, 14); x.textAlign = 'left'; x.fillText(`ALT ${alt.toLocaleString()}`, 12, 22); x.fillText(`SPD ${spd} kt`, 12, 116);
      // map
      x.fillStyle = '#0b1220'; x.fillRect(170, 8, 334, 112); x.strokeStyle = '#ff4fd8'; x.lineWidth = 2; x.setLineDash([6, 5]); x.beginPath(); x.moveTo(190, 30); x.quadraticCurveTo(340, 20, 484, 100); x.stroke(); x.setLineDash([]);
      const t = prog, px = (1 - t) * (1 - t) * 190 + 2 * (1 - t) * t * 340 + t * t * 484, py = (1 - t) * (1 - t) * 30 + 2 * (1 - t) * t * 20 + t * t * 100;
      x.fillStyle = '#fff'; x.font = FONT(700, 12); x.fillText(FROM.toUpperCase(), 180, 22); x.textAlign = 'right'; x.fillText(TO.toUpperCase(), 500, 116); x.textAlign = 'left';
      x.fillStyle = '#F5B83D'; x.beginPath(); x.arc(px, py, 6, 0, 7); x.fill();
      instT.needsUpdate = true;
    }
    const progress = () => { if (S.pi === 0) return 0; if (S.pi >= PH.length - 1) return 1; let d = 0; for (let i = 1; i < S.pi; i++) d += PH[i].dur; return clamp((d + S.pt) / flightDur, 0, 1); };

    // ---------- camera ----------
    const camPos = new THREE.Vector3(S.x, 1.9, S.z - 2), camLook = new THREE.Vector3();
    function updateCam(dt) {
      const ph = PH[S.pi]; let px, py, pz, lx, ly, lz;
      if (S.seated) {
        const eye = new THREE.Vector3(MYX + .02, 1.32, MYZ + .1);
        if (S.view === 'window') { eye.set(MYX + .05, 1.25, MYZ - .02); if (S.t - (S.winT || 0) > 3) done('window'); }
        if (S.view === 'movie') { eye.set(MYX, 1.06, MYZ - .2); if (S.t - (S.movT || 0) > 8) done('movie'); }
        px = eye.x; py = eye.y; pz = eye.z;
        lx = px + Math.sin(S.yaw) * Math.cos(S.pitch); ly = py + Math.sin(S.pitch); lz = pz + Math.cos(S.yaw) * Math.cos(S.pitch);
        if (S.view === 'movie') { lx = myScreen.position.x; ly = myScreen.position.y; lz = myScreen.position.z; }
        camPos.set(px, py, pz);
      } else {
        me.g.position.set(S.x, 0, S.z); me.g.rotation.y = S.h;
        const inCock = S.z < .3, dist = inCock ? .05 : 2.3, hgt = inCock ? 1.6 : 1.95;
        const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw);
        px = S.x - fx * dist; pz = S.z - fz * dist; py = hgt + (inCock ? 0 : -S.pitch * .8);
        // keep the camera inside the plane
        px = clamp(px, -HW + .25, HW - .25); pz = clamp(pz, inCock ? -2.6 : .25, 23.3);
        if (!inCock && pz > 6.62 && pz < 19.55 && Math.abs(px) > .35) py = Math.max(py, 1.95);
        lx = S.x + fx * 1.6; lz = S.z + fz * 1.6; ly = 1.15 + S.pitch * 1.6;
        if (inCock) { me.g.visible = false; lx = S.x + fx; lz = S.z + fz; ly = 1.6 + S.pitch; } else me.g.visible = true;
        camPos.lerp(new THREE.Vector3(px, py, pz), Math.min(1, dt * (inCock ? 20 : 8)));
      }
      cam.position.copy(camPos); camLook.set(lx, ly, lz);
      const sh = (ph.shake || 0) * (matchMedia('(prefers-reduced-motion: reduce)').matches ? .3 : 1);
      if (sh) { cam.position.x += (Math.random() - .5) * sh; cam.position.y += (Math.random() - .5) * sh; }
      cam.lookAt(camLook);
    }

    // ---------- ambient life ----------
    function ambient() {
      if (S.t < S.ambT || S.busy) return; S.ambT = S.t + 9 + Math.random() * 6;
      const ph = PH[S.pi].id; if (ph === 'arrived' || ph === 'board') return;
      const cand = [
        ['emeka', 'Zzzz… 😴', 11, 2], ['tobi', 'Waaaa 😭 (baby Tobi)', 12, 3], ['kola', '🎧 *humming Burna Boy*', 13, 2], ['bisi', 'Who get chin chin? 👀', 16, 3], ['tunji', '🙏🏾 Journey mercies!', 18, 2], ['dayo', '⚽ Goaaal! (watching replay)', 20, 3],
      ].filter(c => Math.abs(rowZ(c[2]) - (S.seated ? MYZ : S.z)) < 4.5);
      if (!cand.length) return; const c = pick(cand); say(new THREE.Vector3(ECOX[c[3]], 1.45, rowZ(c[2])), c[1], 2800, 'amb');
    }

    // ---------- loop ----------
    const proj = new THREE.Vector3(); let raf = 0, last = performance.now(), instT0 = 0, movT0 = 0, cockSaid = false;
    function size() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h); cam.aspect = w / h; cam.fov = w < h ? 82 : 68; cam.updateProjectionMatrix(); }
    size(); addEventListener('resize', size);
    enterPhase(0); drawMovie(); drawInst();
    function loop(now) {
      raf = requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now; S.t += dt;
      if (S.yawT != null) { S.yaw += (S.yawT - S.yaw) * Math.min(1, dt * 5); if (Math.abs(S.yawT - S.yaw) < .01) { S.yaw = S.yawT; S.yawT = null; } }
      const ph = PH[S.pi];
      if (S.started && !S.done) {
        tickPhase(dt);
        if (!S.seated && !S.busy) walk(dt);
        if (!cockSaid && S.z < -.6) { cockSaid = true; done('cockpit'); { let d = Math.PI - S.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; S.yawT = S.yaw + d; } say(new THREE.Vector3(-.5, 1.45, -1.9), `Captain Adaeze: Welcome to the office, ${o.nickname || 'my person'}! Take a look 😎`, 4000); }
        ambient(); paintActs();
      }
      // engine sound follows the phase
      if (engine) { const v = { board: .05, taxi: .09, takeoff: .22, climb: .16, land: .18, arrived: .04 }[ph.id] ?? .1; engine.g.gain.value = lerp(engine.g.gain.value, S.sleep ? v * .5 : v, dt * 2); engine.f.frequency.value = ph.id === 'takeoff' ? 700 : 380; }
      // sky moves past the windows
      const sp = ph.speed * (S.sleep ? 4 : 1) * (ph.id === 'takeoff' ? clamp(S.pt / ph.dur * 1.4, .1, 1.4) : ph.id === 'land' ? clamp(1 - S.pt / ph.dur, .05, 1) : 1);
      skyL.offset.x += sp * dt; skyR.offset.x -= sp * dt; frontT.offset.x += sp * dt * .1;
      // crew idle and look at you
      const bob = Math.sin(S.t * 1.6) * .01; crew.funke.body.position.y = .82 + bob; crew.femi.body.position.y = .82 - bob;
      if (!S.seated) { [['funke', .55, 1.9], ['femi', .2, 21.7]].forEach(([k, x, z]) => { if (near(x, z, 2.6)) { const a = Math.atan2(S.x - x, S.z - z); crew[k].g.rotation.y = lerp(crew[k].g.rotation.y, a, dt * 4); } }); }
      marker.position.y = 1.55 + Math.sin(S.t * 3) * .05; if (S.seated) marker.visible = false;
      if (S.t - instT0 > .5) { instT0 = S.t; drawInst(); }
      if (S.seated && S.t - movT0 > .15) { movT0 = S.t; drawMovie(); }
      // HUD
      const pr = progress(); $('#flpb').style.width = (pr * 100) + '%'; $('#flpl').style.left = (pr * 100) + '%';
      $('#flph').textContent = ph.needSeat && !S.seated && S.started ? `${ph.label} · 💺 go to 14A` : ph.label + (S.sleep ? ' · 💤' : '');
      updateCam(dt);
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]; if (S.t > b.until) { b.el.remove(); bubbles.splice(i, 1); continue; }
        proj.copy(b.pos).project(cam); const vis = proj.z < 1 && Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1;
        b.el.style.display = vis ? '' : 'none'; if (vis) b.el.style.transform = `translate(${(proj.x * .5 + .5) * innerWidth}px,${(-proj.y * .5 + .5) * innerHeight}px) translate(-50%,-100%)`;
      }
      renderer.render(scene, cam);
    }
    raf = requestAnimationFrame(loop);
    startCard();

    // ---------- the end ----------
    async function arrive() {
      if (S.done) return; S.done = true; $('#flacts').innerHTML = '';
      const did = [...S.did]; let coins = 0;
      try { const r = await o.api('/api/flight/done', { did }); coins = r.earned || 0; if (r.coins != null && o.onCoins) o.onCoins(r.coins); } catch {}
      const c = card(`<div class="fl-arr"><span class="fl-flag">🎉</span><h3>Welcome home to ${esc(TO)}!</h3><p>You did ${did.length} of ${TODO.length} flight things${coins ? ` · <b>+${coins} 🪙</b>` : ''}</p>
        <div class="fl-todo">${TODO.map(([id, e, t]) => `<div class="${S.did.has(id) ? 'ok' : ''}"><span>${S.did.has(id) ? '✅' : '⬜'}</span>${esc(t)}</div>`).join('')}</div>
        <button class="btn btn-gold" id="flbags">🧳 Collect my bags</button></div>`, () => finish(false));
      applause(60); $('#flbags').onclick = () => c.close();
    }
    function finish(quit, beforeStart) {
      S.done = true; cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      try { if (actx) actx.close(); } catch {}
      bubbles.forEach(b => b.el.remove()); renderer.dispose(); ov.remove(); document.body.style.overflow = '';
      resolve({ quit, cancelled: !!beforeStart, did: [...S.did] });
    }
  });
}
