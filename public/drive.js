/* Naija Drive v2: a driver's-eye road trip on real Nigerian roads.
   NaijaDrive.start({ to, from, fromId, homeCity, vehicle, km, pickups, seed, race, api, beep, toast, onCoins })
     -> Promise<{ fares, checks, fines, friends, crashes, stars, secs, bonus }>      (race -> { secs, crashes, view })
   Pseudo-3D segment road (the classic arcade-racer technique). Every sprite is drawn with canvas paths: no images. */
(() => {
'use strict';

// ================= world =================
const SEG = 200, CAM_H = 1000, DRAW = 140, DEPTH = 1 / Math.tan(50 * Math.PI / 180), PZ = CAM_H * DEPTH, U = 100;
const RT = {
  park:       { lanes: 1, two: false, div: false, w: 1500, lim: 20,  g: 'dirt',     kerb: null,   urban: true, icon: '🅿️', label: 'Motor park' },
  estate:     { lanes: 2, two: true,  div: false, w: 1500, lim: 40,  g: 'laterite', kerb: 'yb',   urban: true, gutter: true, icon: '🏘️', label: 'Street' },
  arterial:   { lanes: 3, two: false, div: true,  w: 2100, lim: 60,  g: 'urban',    kerb: 'yb',   urban: true, gutter: true, icon: '🛣️', label: 'City road' },
  expressway: { lanes: 3, two: false, div: true,  w: 2200, lim: 100, g: 'grass',    kerb: 'rw',   icon: '🛣️', label: 'Expressway' },
  bridge:     { lanes: 3, two: false, div: true,  w: 2100, lim: 80,  g: 'water',    kerb: 'rail', icon: '🌉', label: 'Bridge' },
  highway:    { lanes: 2, two: true,  div: false, w: 1700, lim: 100, g: 'bush',     kerb: null,   icon: '🌴', label: 'Highway' },
};
const laneXs = (rt) => rt.two ? [-0.5, 0.5] : Array.from({ length: rt.lanes }, (_, i) => -1 + (2 * i + 1) / rt.lanes);
const VEH = {
  okada: { name: 'Okada', max: 80,  acc: 24, w: 240, cap: 1,  fuel: .7,  gear: 'helmet',   draw: 'okada', emoji: '🛵' },
  keke:  { name: 'Keke',  max: 55,  acc: 17, w: 480, cap: 3,  fuel: .8,  gear: null,       draw: 'keke',  emoji: '🛺' },
  ride:  { name: 'Car',   max: 120, acc: 22, w: 620, cap: 3,  fuel: 1,   gear: 'seat belt', draw: 'car',  emoji: '🚗' },
  danfo: { name: 'Danfo', max: 90,  acc: 14, w: 700, cap: 14, fuel: 1.15, gear: 'seat belt', draw: 'danfo', emoji: '🚐' },
};
const TYPE = { car: { w: 620, f: .85 }, danfo: { w: 700, f: .8 }, brt: { w: 860, f: .7 }, bus: { w: 860, f: .85 }, truck: { w: 860, f: .6 }, tipper: { w: 820, f: .62 }, tanker: { w: 840, f: .58 }, keke: { w: 480, f: .7 }, okada: { w: 240, f: .92 } };
const MIX = {
  park: [['danfo', 1]],
  estate: [['okada', .3], ['keke', .25], ['car', .35], ['danfo', .1]],
  arterial: [['danfo', .32], ['car', .27], ['keke', .1], ['okada', .12], ['brt', .07], ['truck', .05], ['tipper', .07]],
  expressway: [['car', .35], ['danfo', .22], ['bus', .12], ['truck', .12], ['tanker', .1], ['tipper', .09]],
  bridge: [['car', .45], ['danfo', .3], ['brt', .1], ['bus', .05], ['tipper', .1]],
  highway: [['car', .28], ['bus', .2], ['truck', .2], ['tanker', .14], ['danfo', .12], ['tipper', .06]],
};
const DENSITY = { park: 4, estate: 7, arterial: 20, expressway: 16, bridge: 15, highway: 9 };
const CARCOL = ['#E8EDF5', '#1E1E1E', '#7F8C8D', '#2B59C3', '#C0392B', '#BDC3C7', '#1E8449', '#8E7A5A', '#F5F5F5', '#34495E'];

// ================= real places =================
const STREETS = {
  Lagos: { arterial: ['Ikorodu Road', 'Herbert Macaulay Way', 'Agege Motor Road', 'Funsho Williams Avenue', 'Apapa–Oshodi Expressway'], estate: ['Bode Thomas Street', 'Adeniran Ogunsanya Street', 'Allen Avenue', 'Opebi Road', 'Ogunlana Drive', 'Toyin Street'], stops: ['Ojuelegba', 'Fadeyi', 'Onipanu', 'Obanikoro', 'Yaba', 'Jibowu', 'Maryland', 'Anthony', 'Oshodi', 'Ikeja Along', 'Costain', 'Iponri', 'Mile 12', 'Ketu'] },
  Oyo: { arterial: ['Ring Road', 'Iwo Road', 'Challenge–Felele Road', 'Oyo Road'], estate: ['Bodija Market Road', 'Akobo Road', 'Ososami Road'], stops: ['Challenge', 'Dugbe', 'Mokola', 'Sango', 'Bodija', 'Iwo Road', 'Agodi Gate'] },
  'FCT Abuja': { arterial: ['Ahmadu Bello Way', 'Shehu Shagari Way', 'Nnamdi Azikiwe Expressway', 'Murtala Mohammed Expressway'], estate: ['Aminu Kano Crescent', 'Adetokunbo Ademola Crescent', 'Gimbiya Street'], stops: ['Wuse Market', 'Berger Roundabout', 'Area 1', 'Utako', 'Jabi', 'Garki', 'Kubwa Village'] },
  Rivers: { arterial: ['Aba Road', 'Ikwerre Road', 'East–West Road'], estate: ['Rumuola Road', 'Trans-Amadi Road', 'Woji Road'], stops: ['Garrison', 'Rumuola', 'Mile 1', 'Rumuokoro', 'Waterlines', 'Eleme Junction'] },
  Kano: { arterial: ['Murtala Mohammed Way', 'Zaria Road', 'Ahmadu Bello Way'], estate: ['Bompai Road', 'Club Road', 'Audu Bako Way'], stops: ['Sabon Gari', 'Kofar Mata', 'Gidan Murtala', 'Bata', 'Kantin Kwari'] },
  Enugu: { arterial: ['Ogui Road', 'Agbani Road', 'Zik Avenue'], estate: ['Chime Avenue', 'Abakaliki Road', 'Bisalla Road'], stops: ['Holy Ghost', 'Okpara Square', 'Old Park', 'Garriki', 'Abakpa'] },
  Ogun: { arterial: ['Lafenwa Road', 'Oke-Ilewo Road', 'Ibara Road'], estate: ['Quarry Road', 'Ita Eko Road'], stops: ['Kuto', 'Panseke', 'Lafenwa', 'Itoku', 'Adatan', 'Sapon'] },
  Osun: { arterial: ['Gbongan Road', 'Station Road', 'Old Garage Road'], estate: ['Oke Fia Road', 'Alekuwodo Road'], stops: ['Old Garage', 'Olaiya', 'Oja Oba', 'Alekuwodo', 'Ota Efun'] },
  _: { arterial: ['Old Market Road', 'Stadium Road', 'Hospital Road', 'Ring Road'], estate: ['Church Street', 'Market Street', 'School Road'], stops: ['Junction', 'Roundabout', 'Main Market', 'Post Office', 'Stadium', 'General Hospital'] },
};
const PARKS = { Lagos: ['Oshodi Motor Park', 'Ojota New Garage', 'Jibowu Park', 'Obalende Park', 'Mile 2 Park'], Oyo: ['Iwo Road Park', 'Challenge Park'], 'FCT Abuja': ['Jabi Motor Park', 'Utako Motor Park'], Rivers: ['Mile 1 Park', 'Waterlines Park'], Kano: ['Kano Line Motor Park', 'Unguwa Uku Park'], Enugu: ['Holy Ghost Park', 'Old Park'], Ogun: ['Kuto Motor Park', 'Lafenwa Park'], Osun: ['Old Garage, Osogbo'] };
const CITYKEY = { Abeokuta: 'Ogun', Osogbo: 'Osun', Madalla: 'FCT Abuja', Abuja: 'FCT Abuja', Ibadan: 'Oyo', Niger: 'FCT Abuja', 'Port Harcourt': 'Rivers' };
const DEST = {
  lekki: { city: 'Lekki', legs: [
    { name: 'Lagos–Ibadan Expressway', type: 'expressway', far: true, stops: ['Mowe', 'Ibafo', 'Magboro', 'Berger'] },
    { name: 'Third Mainland Bridge', type: 'bridge' },
    { name: 'Ozumba Mbadiwe Avenue', type: 'arterial', stops: ['Falomo', 'Bar Beach', 'Mobil'] },
    { name: 'Lekki–Ikoyi Link Bridge', type: 'bridge', final: true }] },
  theatre: { city: 'Iganmu', legs: [
    { name: 'Lagos–Ibadan Expressway', type: 'expressway', far: true, stops: ['Mowe', 'Ibafo', 'Magboro', 'Berger'] },
    { name: 'Western Avenue', type: 'expressway', stops: ['Barracks', 'Ojuelegba', 'Alaka'] },
    { name: 'National Theatre Road, Iganmu', type: 'arterial', stops: ['Iganmu', 'Costain'], final: true }] },
  olumo: { city: 'Abeokuta', legs: [
    { name: 'Lagos–Abeokuta Expressway', type: 'highway', far: true, stops: ['Sango-Ota', 'Itori', 'Ewekoro', 'Olorunda'] },
    { name: 'Lafenwa Road', type: 'arterial', stops: ['Lafenwa', 'Ago-Oko'] },
    { name: 'Ikija Road, Itoku', type: 'estate', stops: ['Itoku Market'], final: true }] },
  osun: { city: 'Osogbo', legs: [
    { name: 'Lagos–Ibadan Expressway', type: 'expressway', far: true, stops: ['Berger', 'Magboro', 'Ibafo', 'Mowe'] },
    { name: 'Ibadan–Ife Expressway', type: 'highway', far: true, stops: ['Iwo Road', 'Egbeda', 'Ikire'] },
    { name: 'Gbongan–Osogbo Road', type: 'highway', stops: ['Gbongan', 'Ede Junction'] },
    { name: 'Grove Road, Osogbo', type: 'estate', stops: ['Oja Oba'], final: true }] },
  zuma: { city: 'Madalla', legs: [
    { name: 'Lokoja–Abuja Highway', type: 'highway', far: true, stops: ['Lokoja', 'Koton Karfe', 'Abaji'] },
    { name: 'Kubwa Expressway', type: 'expressway', stops: ['Gwagwalada', 'Zuba'] },
    { name: 'Madalla Road', type: 'arterial', stops: ['Madalla Market'], final: true }] },
  citygate: { city: 'Abuja', legs: [
    { name: 'Lokoja–Abuja Highway', type: 'highway', far: true, stops: ['Lokoja', 'Abaji', 'Gwagwalada'] },
    { name: 'Airport Road', type: 'expressway', stops: ['Lugbe', 'Kuchigoro'] },
    { name: "Umaru Musa Yar'Adua Expressway", type: 'expressway', final: true }] },
};
const SIGNS = ['MAMA PUT', 'VULCANIZER', 'POS HERE', 'RECHARGE CARD', 'BARBING SALON', 'CHOPS & DRINKS', 'TAILOR', 'SUYA SPOT', 'PHARMACY', 'MAMA NKECHI STORE', 'GOD DEY', 'FASHION HOUSE', 'PROVISIONS', 'BUKA', 'SHAWARMA', 'GEN REPAIRS', 'PURE WATER', 'CHEMIST', 'PHOTOCOPY', 'NO PARKING O', 'AMALA JOINT', 'PHONE REPAIRS'];
const BILLS = [['DETTY DECEMBER', 'Enjoy, but drive safe', '#E5483C', '#fff'], ['JOLLOF FESTIVAL', 'Saturday · Free entry', '#F2C200', '#121A3A'], ['SAY NO TO DRUNK DRIVING', 'Road Safety', '#1F4FA8', '#fff'], ['OWAMBE SEASON', 'Aso-ebi on sale', '#8E44AD', '#fff'], ['PAY YOUR TAX', 'Build your state', '#1E8449', '#fff'], ['BUY NAIJA', 'Grow the naira', '#0B6B3A', '#fff'], ['CROSSOVER CONCERT', '31 Dec · Live band', '#121A3A', '#F5B83D'], ['SPEED THRILLS BUT KILLS', 'Arrive alive', '#C0392B', '#fff']];
const BANNERS = ['CROSSOVER NIGHT · 31 DEC', 'CHRISTMAS CAROL · ALL WELCOME', 'HOLY GHOST NIGHT', 'THANKSGIVING SERVICE'];
const STICKERS = ['NO KING AS GOD', 'NO FOOD FOR LAZY MAN', "GOD'S TIME IS THE BEST", 'EXCUSE ME DIVINE', 'NO CONDITION IS PERMANENT', 'SHINE YOUR EYE'];
const ITEMS = { water: ['💧', 'Pure water', 5], gala: ['🌭', 'Gala', 10], chips: ['🍌', 'Plantain chips', 10], bread: ['🥖', 'Agege bread', 15] };
const CRASH = ['Ah! Who taught you to drive? 😂', 'Danfo driver don vex 😤', 'Na so you wan reach? Slow down o 🙏🏾', 'Your insurance no go like this 😬', 'Bros, eyes on the road 👀', 'Mechanic go happy today 😅'];
const CHECK = {
  police:  { who: 'Police', em: '👮🏾‍♂️', sign: 'POLICE CHECKPOINT', uni: { top: '#1B1B1B', bot: '#1B1B1B', head: 'beret', hc: '#1B1B1B' }, van: ['#22324F', '#fff', 'POLICE'],
    line: 'Good evening. Where you dey go this night?', replies: [(d) => `Going to ${d}, officer. Compliments of the season! 🎄`, () => 'Na Detty December, I wan go enjoy 😁'], ok: 'No wahala. Drive safe and no speed o.' },
  vio:     { who: 'VIO', em: '📋', sign: 'VIO · VEHICLE INSPECTION', uni: { top: '#7FB3E0', bot: '#1F2A44', head: 'cap', hc: '#F5F5F5' }, van: ['#F5F5F5', '#1F4FA8', 'VIO'],
    line: 'Particulars! Vehicle licence, roadworthiness, insurance.', replies: [() => '📄 Show all the papers', () => '📱 Show the e-copy on my phone'], ok: 'Everything correct. You fit go. Merry Christmas!' },
  frsc:    { who: 'FRSC', em: '🦺', sign: 'FRSC · ROAD SAFETY CHECK', uni: { top: '#9AA4AE', bot: '#1F2A44', head: 'cap', hc: '#1F2A44', vest: true }, van: ['#F5F5F5', '#1F2A44', 'FRSC'] },
  customs: { who: 'Customs', em: '🛃', sign: 'CUSTOMS CHECKPOINT', uni: { top: '#6B6B3A', bot: '#6B6B3A', head: 'beret', hc: '#3E3E1E' }, van: ['#2E5E3A', '#fff', 'CUSTOMS'],
    line: 'Wetin dey your boot? Any foreign rice?', replies: [() => '🎒 Na only my Christmas bag', () => '🍚 Na local rice, Ofada!'], ok: 'Ehen! Local rice is better. Go and enjoy.' },
  radar:   { who: 'FRSC speed check', em: '📸', sign: 'SPEED CHECK AHEAD', uni: { top: '#9AA4AE', bot: '#1F2A44', head: 'cap', hc: '#1F2A44', vest: true }, van: ['#F5F5F5', '#1F2A44', 'FRSC'] },
};
const CPKINDS = { highway: ['police', 'customs', 'frsc'], expressway: ['frsc', 'radar', 'police', 'vio'], arterial: ['vio', 'police', 'frsc'], estate: ['police'] };

// ================= helpers =================
function rng(seed) {
  let a = (seed >>> 0) || 1;
  const nx = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  return { f: (x = 0, y = 1) => x + nx() * (y - x), i: (x, y) => Math.floor(x + nx() * (y - x + 1)), pick: (arr) => arr[Math.floor(nx() * arr.length)], chance: (p) => nx() < p,
    shuffle: (arr) => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(nx() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
    weighted: (list) => { let r = nx(), s = 0; for (const [k, w] of list) { s += w; if (r < s) return k; } return list[list.length - 1][0]; } };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = { in: (a, b, p) => a + (b - a) * p * p, io: (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + .5) };
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.round((n >> 16 & 255) * f)},${Math.round((n >> 8 & 255) * f)},${Math.round((n & 255) * f)})`; }
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// drawing primitives (module-level context, set per frame)
let c = null, N = false, TIME = 0;
const SKIN = ['#5A3825', '#6B4226', '#4A2C1D', '#7A4E2D'];
const CLOTH = ['#E5483C', '#F2C200', '#1E8449', '#2B59C3', '#8E44AD', '#E67E22', '#16A085', '#C0392B', '#F5F5F5', '#D35400', '#1ABC9C'];
const WALLS = ['#E8D9B5', '#C9E4CA', '#F4C7AB', '#BFD7EA', '#F2E3A0', '#D9C3E8', '#E6B8A2', '#F5F0E6', '#A9D6C2'];
const ROOFS = ['#8B4A2B', '#5B6B7A', '#A0522D', '#3E5C76', '#7A2E2E', '#9AA0A6'];
function rect(x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function rrect(x, y, w, h, r, col) { c.fillStyle = col; c.beginPath(); if (c.roundRect && w > 0 && h > 0) c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else c.rect(x, y, w, h); c.fill(); }
function poly(col, p) { c.fillStyle = col; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); }
function circ(x, y, r, col) { if (r <= 0) return; c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }
function ell(x, y, rx, ry, col) { if (rx <= 0 || ry <= 0) return; c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.2832); c.fill(); }
function text(t, x, y, size, col, weight = 800) { if (size < 5) return; c.fillStyle = col; c.font = `${weight} ${size}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x, y); }
function fit(t, x, y, maxW, size, col, weight = 800) { if (size < 5 || maxW < 10) return; c.font = `${weight} ${size}px system-ui, sans-serif`; const m = c.measureText(t).width; if (m > maxW) size *= maxW / m; text(t, x, y, size, col, weight); }
function glow(x, y, r, col) { if (r < 2) return; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }

// ================= sprite painters =================
// each: (x = left, by = bottom, w, h, s) in screen px
function person(x, by, h, d) {
  if (h < 5) return;
  const w = h * .34, sk = d.skin || SKIN[0];
  rect(x - w * .32, by - h * .44, w * .26, h * .44, d.bot); rect(x + w * .06, by - h * .44, w * .26, h * .44, d.bot);
  if (d.dress) poly(d.top, [x - w * .55, by - h * .22, x + w * .55, by - h * .22, x + w * .4, by - h * .8, x - w * .4, by - h * .8]);
  rrect(x - w / 2, by - h * .8, w, h * .4, w * .25, d.top);
  if (d.vest) { rect(x - w / 2, by - h * .78, w, h * .36, '#F5C400'); rect(x - w / 2, by - h * .66, w, h * .05, '#E8ECEF'); rect(x - w / 2, by - h * .54, w, h * .05, '#E8ECEF'); }
  if (d.wave) { rect(x + w * .44, by - h * 1.04, w * .2, h * .38, sk); rect(x - w * .66, by - h * .78, w * .18, h * .32, d.top); }
  else { rect(x - w * .66, by - h * .78, w * .18, h * .34, d.top); rect(x + w * .48, by - h * .78, w * .18, h * .34, d.top); }
  circ(x, by - h * .88, w * .34, sk);
  if (d.head === 'gele') poly(d.hc || d.top, [x - w * .58, by - h * .9, x + w * .58, by - h * .93, x + w * .38, by - h * 1.14, x - w * .22, by - h * 1.1]);
  else if (d.head === 'cap') { rect(x - w * .36, by - h * 1.0, w * .72, h * .08, d.hc || '#222'); rect(x - w * .1, by - h * .95, w * .55, h * .03, d.hc || '#222'); }
  else if (d.head === 'beret') ell(x - w * .05, by - h * .99, w * .42, h * .06, d.hc || '#111');
  else if (d.head === 'hijab') { circ(x, by - h * .87, w * .42, d.hc || '#2B59C3'); circ(x, by - h * .86, w * .25, sk); }
  else if (d.head === 'helmet') circ(x, by - h * .9, w * .4, d.hc || '#C0392B');
  else ell(x, by - h * .97, w * .3, h * .045, '#111');
  if (d.tray) { rect(x - w * .95, by - h * 1.06, w * 1.9, h * .06, '#C49A6C'); text(d.tray, x, by - h * 1.17, h * .24, '#000', 400); }
  if (d.radar) { rect(x + w * .5, by - h * .74, w * .5, h * .07, '#222'); }
}
function randPerson(R) { return { top: R.pick(CLOTH), bot: R.pick(['#2C3E50', '#1B1B1B', '#34495E', '#7F6A4D', ...CLOTH]), skin: R.pick(SKIN), head: R.pick(['gele', 'cap', 'hair', 'hair', 'hijab']), dress: R.chance(.4), hc: R.pick(CLOTH) }; }

const VH = { car: .82, van: .92, danfo: 1.1, brt: 1.08, bus: 1.15, truck: 1.45, tipper: 1.15, tanker: 1.1, keke: 1.12, okada: 2.4 };
function veh(t, cx, by, w, d = {}) {
  if (w < 3) return;
  const h = w * (VH[t] || 1), x = cx - w / 2, y = by - h, onc = d.onc;
  ell(cx, by - h * .01, w * .56, h * .06, 'rgba(0,0,0,.3)');
  const tail = (lx, ly, lw, lh) => { if (onc) { rect(lx, ly, lw, lh, '#FFF6C8'); if (N) glow(lx + lw / 2, ly + lh / 2, w * .35, 'rgba(255,240,180,.55)'); } else { rect(lx, ly, lw, lh, d.brake ? '#FF3B30' : '#B3261E'); if (N || d.brake) glow(lx + lw / 2, ly + lh / 2, w * .22, 'rgba(255,40,30,.5)'); } };
  const wheels = () => { rect(x + w * .05, by - h * .14, w * .17, h * .14, '#111'); rect(x + w * .78, by - h * .14, w * .17, h * .14, '#111'); };
  if (t === 'okada') {
    rrect(cx - w * .14, by - h * .3, w * .28, h * .3, w * .1, '#111');
    rect(cx - w * .3, by - h * .44, w * .6, h * .16, d.col || '#9B2C22');
    person(cx, by - h * .38, h * .62, { top: d.shirt || '#2B59C3', bot: '#222', skin: SKIN[1], head: d.helmet ? 'helmet' : 'hair', hc: '#C0392B' });
    if (d.pass) person(cx, by - h * .3, h * .5, { top: '#E67E22', bot: '#333', skin: SKIN[2], head: 'gele', hc: '#8E44AD' });
    tail(cx - w * .12, by - h * .36, w * .24, h * .04);
    return;
  }
  if (t === 'keke') {
    rrect(x + w * .04, y, w * .92, h * .12, w * .06, '#F2C200');
    rect(x + w * .1, y + h * .1, w * .05, h * .4, '#333'); rect(x + w * .85, y + h * .1, w * .05, h * .4, '#333');
    rect(x + w * .12, y + h * .12, w * .76, h * .34, onc ? '#1d2433' : '#1E8449');
    if (!onc) fit('KEKE NAPEP', cx, y + h * .3, w * .6, h * .07, '#F2C200');
    rrect(x, y + h * .46, w, h * .4, w * .1, '#F2C200'); rect(x, y + h * .6, w, h * .06, '#1E8449');
    rect(x - w * .02, by - h * .16, w * .16, h * .16, '#111'); rect(x + w * .86, by - h * .16, w * .16, h * .16, '#111');
    tail(x + w * .08, y + h * .5, w * .12, h * .06); tail(x + w * .8, y + h * .5, w * .12, h * .06);
    return;
  }
  wheels();
  if (t === 'car' || t === 'van') {
    const col = d.col || '#E8EDF5';
    rrect(x, y + h * .38, w, h * .5, w * .08, col);
    poly(col, [x + w * .1, y + h * .42, x + w * .9, y + h * .42, x + w * .78, y + h * .02, x + w * .22, y + h * .02]);
    poly(N ? '#0b0f18' : '#1d2433', [x + w * .16, y + h * .4, x + w * .84, y + h * .4, x + w * .75, y + h * .08, x + w * .25, y + h * .08]);
    tail(x + w * .04, y + h * .5, w * .17, h * .1); tail(x + w * .79, y + h * .5, w * .17, h * .1);
    rect(cx - w * .13, y + h * .66, w * .26, h * .1, '#F4F4F4'); rect(cx - w * .13, y + h * .66, w * .26, h * .025, '#1E8449');
    if (d.label) { rect(x, y + h * .78, w, h * .1, d.lc2 || '#C0392B'); fit(d.label, cx, y + h * .26, w * .5, h * .12, d.lc || '#fff'); }
    if (d.siren) { const on = (TIME * 4 | 0) % 2; rect(cx - w * .22, y - h * .05, w * .2, h * .06, on ? '#2E6BFF' : '#11265E'); rect(cx + w * .02, y - h * .05, w * .2, h * .06, on ? '#5A0F0F' : '#FF2D2D'); if (N) glow(cx, y, w * .4, on ? 'rgba(46,107,255,.5)' : 'rgba(255,45,45,.5)'); }
    return;
  }
  if (t === 'danfo') {
    rrect(x, y + h * .04, w, h * .84, w * .06, '#F2B705');
    if (d.rack) { rect(x + w * .1, y - h * .02, w * .8, h * .05, '#555'); rrect(x + w * .14, y - h * .12, w * .3, h * .11, 3, '#2B59C3'); rrect(x + w * .5, y - h * .1, w * .32, h * .09, 3, '#8B5A2B'); }
    rect(x + w * .07, y + h * .1, w * .86, h * .3, onc ? '#1d2433' : N ? '#0b0f18' : '#25303f');
    if (!onc && w > 50) { person(x + w * .3, y + h * .4, h * .24, { top: '#E5483C', bot: '#000', skin: SKIN[0] }); person(x + w * .62, y + h * .4, h * .22, { top: '#1E8449', bot: '#000', skin: SKIN[2], head: 'gele', hc: '#F2C200' }); }
    rect(x, y + h * .46, w, h * .05, '#111'); rect(x, y + h * .64, w, h * .05, '#111');
    if (!onc) fit(d.sticker || 'NO KING AS GOD', cx, y + h * .575, w * .8, h * .075, '#111');
    tail(x + w * .03, y + h * .72, w * .12, h * .1); tail(x + w * .85, y + h * .72, w * .12, h * .1);
    rect(cx - w * .12, y + h * .74, w * .24, h * .08, '#F4F4F4');
    if (d.cond && !onc) person(x + w * 1.03, by - h * .1, h * .62, { top: '#F5F5F5', bot: '#2C3E50', skin: SKIN[1], wave: true });
    return;
  }
  if (t === 'brt' || t === 'bus') {
    const body = t === 'brt' ? '#1F4FA8' : '#F2F2F2';
    rrect(x, y, w, h * .9, w * .05, body);
    rect(x + w * .06, y + h * .06, w * .88, h * .36, onc ? '#1d2433' : N ? '#203040' : '#2C3E50');
    if (N && !onc) for (let i = 0; i < 4; i++) rect(x + w * (.1 + i * .21), y + h * .1, w * .15, h * .28, 'rgba(255,230,160,.35)');
    rect(x, y + h * .5, w, h * .07, t === 'brt' ? '#E5483C' : '#1E8449');
    if (!onc) fit(t === 'brt' ? 'BRT' : 'NAIJA LUXURY', cx, y + h * .67, w * .6, h * .1, t === 'brt' ? '#fff' : '#1E8449');
    tail(x + w * .03, y + h * .74, w * .1, h * .1); tail(x + w * .87, y + h * .74, w * .1, h * .1);
    return;
  }
  if (t === 'truck' || t === 'tipper') {
    if (t === 'truck') { rrect(x, y, w, h * .86, w * .03, d.col || '#B03A2E'); c.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 1; i < 8; i++) c.fillRect(x + w * i / 8, y, Math.max(1, w * .015), h * .86); rect(cx - w * .01, y, Math.max(1, w * .02), h * .86, 'rgba(0,0,0,.35)'); if (!onc && w > 60) fit('HORN PLEASE', cx, y + h * .72, w * .6, h * .06, '#fff'); }
    else { rrect(x, y + h * .2, w, h * .66, w * .04, '#E67E22'); ell(cx, y + h * .22, w * .46, h * .14, '#C9A26B'); }
    tail(x + w * .03, y + h * .78, w * .1, h * .06); tail(x + w * .87, y + h * .78, w * .1, h * .06);
    return;
  }
  if (t === 'tanker') {
    rrect(x + w * .04, y + h * .1, w * .92, h * .66, w * .3, '#C9CED6');
    rect(x + w * .04, y + h * .4, w * .92, h * .1, '#C0392B');
    if (!onc) fit('INFLAMMABLE', cx, y + h * .45, w * .7, h * .07, '#fff');
    rect(cx - w * .03, y + h * .1, w * .06, h * .66, '#8E959E');
    tail(x + w * .05, y + h * .78, w * .1, h * .06); tail(x + w * .85, y + h * .78, w * .1, h * .06);
  }
}

function bld(x, by, w, h, s) {
  const top = by - h, fl = s.fl, fh = h / fl;
  rect(x, top, w, h, N ? shade(s.wall, .45) : s.wall);
  for (let f = 0; f < fl; f++) {
    const y0 = top + f * fh;
    if (f > 0) rect(x, y0 - fh * .03, w, fh * .05, 'rgba(0,0,0,.14)');
    if (f === fl - 1 && s.shop) continue;
    for (let i = 0; i < 3; i++) {
      const wx = x + w * (.1 + i * .3), wy = y0 + fh * .22, ww = w * .2, wh = fh * .42;
      rect(wx, wy, ww, wh, N && s.lit[(f * 3 + i) % s.lit.length] ? '#FFD97A' : '#2B3440');
      if (w > 30) { c.fillStyle = 'rgba(25,25,25,.75)'; for (let b = 1; b < 4; b++) c.fillRect(wx + ww * b / 4, wy, Math.max(1, ww * .05), wh); }
    }
  }
  if (s.shop) {
    const y0 = by - fh;
    rect(x + w * .08, y0 + fh * .32, w * .84, fh * .68, s.open ? '#3A2E25' : '#9AA0A6');
    if (s.open) { for (let i = 0; i < 5; i++) rect(x + w * (.12 + i * .16), y0 + fh * .5, w * .1, fh * .2, CLOTH[(i + s.seed) % CLOTH.length]); if (N) glow(x + w / 2, y0 + fh * .6, w * .5, 'rgba(255,220,140,.35)'); }
    else { c.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 1; i < 6; i++) c.fillRect(x + w * .08, y0 + fh * (.32 + i * .11), w * .84, Math.max(1, fh * .015)); }
    if (w > 24) { rrect(x + w * .03, y0 + fh * .03, w * .94, fh * .26, 2, s.sbg); fit(s.sign, x + w / 2, y0 + fh * .16, w * .86, fh * .17, s.sfg); }
  }
  rect(x - w * .02, top - h * .03, w * 1.04, h * .04, s.roof);
  if (s.tank) { rrect(x + w * .64, top - h * .19, w * .17, h * .16, w * .03, '#151515'); rect(x + w * .64, top - h * .19, w * .17, h * .02, '#333'); }
  if (s.dish && w > 20) ell(x + w * .2, top - h * .07, w * .07, h * .05, '#DDD');
  if (s.gen && w > 30) { rrect(x + w * .86, by - h * .1, w * .16, h * .1, 2, '#F2C200'); rect(x + w * .88, by - h * .07, w * .12, h * .02, '#333'); }
}
function unfinished(x, by, w, h) {
  rect(x, by - h, w, h, N ? '#4c4e52' : '#A7A9AC');
  c.fillStyle = 'rgba(0,0,0,.12)'; for (let r = 1; r < 9; r++) c.fillRect(x, by - h + h * r / 9, w, Math.max(1, h * .006));
  for (let f = 0; f < 2; f++) for (let i = 0; i < 3; i++) rect(x + w * (.1 + i * .3), by - h + h * (.12 + f * .5), w * .2, h * .22, '#3a3a3a');
  for (let i = 0; i <= 6; i++) rect(x + w * i / 6.2, by - h - h * .12, Math.max(1, w * .012), h * .12, '#6B4A2B');
  if (w > 40) fit('THIS HOUSE IS NOT FOR SALE', x + w / 2, by - h * .3, w * .9, h * .08, '#C0392B');
}
function church(x, by, w, h, s) {
  rect(x, by - h * .68, w, h * .68, N ? '#6b6860' : '#F5F0E6');
  poly(N ? '#3d1818' : '#7A2E2E', [x - w * .04, by - h * .68, x + w * 1.04, by - h * .68, x + w / 2, by - h * .95]);
  rect(x + w / 2 - w * .015, by - h * 1.1, w * .03, h * .16, '#DDD'); rect(x + w / 2 - w * .06, by - h * 1.05, w * .12, h * .025, '#DDD');
  rrect(x + w * .42, by - h * .32, w * .16, h * .32, w * .08, '#4A3020');
  for (let i = 0; i < 4; i++) rect(x + w * (.08 + i * .25), by - h * .5, w * .08, h * .14, N ? '#FFD97A' : CLOTH[i]);
  if (w > 30) { rect(x + w * .05, by - h * .64, w * .9, h * .1, '#1F4FA8'); fit(s.banner, x + w / 2, by - h * .59, w * .86, h * .065, '#fff'); }
}
function mosque(x, by, w, h) {
  rect(x + w * .1, by - h * .5, w * .7, h * .5, N ? '#5f6b62' : '#EAF2EA');
  c.fillStyle = '#1E8449'; c.beginPath(); c.arc(x + w * .45, by - h * .5, w * .22, Math.PI, 0); c.fill();
  rect(x + w * .84, by - h * .95, w * .08, h * .95, N ? '#5f6b62' : '#EAF2EA'); c.beginPath(); c.arc(x + w * .88, by - h * .95, w * .06, Math.PI, 0); c.fill();
  text('☪', x + w * .45, by - h * .8, h * .1, '#F2C200');
  for (let i = 0; i < 3; i++) rrect(x + w * (.2 + i * .2), by - h * .4, w * .08, h * .18, w * .04, N ? '#FFD97A' : '#2B3440');
}
function kiosk(x, by, w, h, s) {
  const cx = x + w / 2;
  rect(x + w * .1, by - h * .5, w * .8, h * .5, s.col);
  rect(x + w * .15, by - h * .46, w * .7, h * .18, '#2B3440');
  for (let i = 0; i < 4; i++) rect(x + w * (.18 + i * .17), by - h * .25, w * .12, h * .1, CLOTH[(i + s.seed) % CLOTH.length]);
  rect(cx - w * .015, by - h * 1.0, Math.max(1, w * .03), h * .5, '#666');
  const cols = s.umb, R2 = w * .62, top = by - h * 1.02;
  for (let k = 0; k < 6; k++) { const a1 = Math.PI + k * Math.PI / 6, a2 = a1 + Math.PI / 6; poly(cols[k % 2], [cx, top, cx + Math.cos(a1) * R2, top + h * .2 + Math.sin(a1) * h * .02, cx + Math.cos(a2) * R2, top + h * .2 + Math.sin(a2) * h * .02]); }
  if (N) glow(cx, by - h * .4, w * .6, 'rgba(255,220,140,.4)');
  person(x + w * .9, by, h * .62, s.p);
}
function lamp(x, by, w, h, s) {
  const toRoad = s.x < 0 ? 1 : -1, px = s.x < 0 ? x + w * .12 : x + w * .88, pw = Math.max(1, w * .07);
  rect(px - pw / 2, by - h, pw, h, '#5E6670');
  const ax = px + toRoad * w * .72;
  c.strokeStyle = '#5E6670'; c.lineWidth = Math.max(1, pw * .7); c.beginPath(); c.moveTo(px, by - h * .98); c.quadraticCurveTo(px + toRoad * w * .3, by - h * 1.04, ax, by - h * .97); c.stroke();
  rrect(ax - w * .13, by - h * .985, w * .26, h * .03, 2, '#3B4048');
  if (s.solar) rect(px - w * .2, by - h * 1.07, w * .4, h * .05, '#1B3A6B');
  if (N) { glow(ax, by - h * .93, w * 1.1, 'rgba(255,214,120,.5)'); circ(ax, by - h * .95, Math.max(1, w * .08), '#FFF2C4'); }
}
function lamp2(x, by, w, h) {
  const cx = x + w / 2, pw = Math.max(1, w * .035);
  rect(cx - pw / 2, by - h, pw, h, '#5E6670');
  c.strokeStyle = '#5E6670'; c.lineWidth = Math.max(1, pw * .7); c.beginPath(); c.moveTo(x + w * .08, by - h * .97); c.quadraticCurveTo(cx, by - h * 1.06, x + w * .92, by - h * .97); c.stroke();
  rrect(x, by - h * .985, w * .14, h * .03, 2, '#3B4048'); rrect(x + w * .86, by - h * .985, w * .14, h * .03, 2, '#3B4048');
  rect(cx - w * .02, by - h * .3, w * .04, h * .3, '#C9CED6');
  if (N) { glow(x + w * .07, by - h * .93, w * .6, 'rgba(255,214,120,.5)'); glow(x + w * .93, by - h * .93, w * .6, 'rgba(255,214,120,.5)'); }
}
function palm(x, by, w, h, s) {
  const cx = x + w / 2, tx = cx + w * .15 * s.lean, ty = by - h * .86;
  c.strokeStyle = N ? '#3b2d18' : '#6B4F2A'; c.lineWidth = Math.max(1, w * .07); c.beginPath(); c.moveTo(cx, by); c.quadraticCurveTo(cx, by - h * .5, tx, ty); c.stroke();
  c.lineWidth = Math.max(1, w * .05);
  for (let k = 0; k < 8; k++) { const a = -Math.PI + k * Math.PI / 7 + .1; c.strokeStyle = N ? (k % 2 ? '#173f1b' : '#1d4a20') : (k % 2 ? '#2E7D32' : '#3C9A40'); c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * w * .35, ty - h * .12, tx + Math.cos(a) * w * .55, ty + h * .08 + Math.abs(Math.sin(a)) * h * .02); c.stroke(); }
}
function tree(x, by, w, h, s) {
  const cx = x + w / 2; rect(cx - w * .05, by - h * .45, w * .1, h * .45, N ? '#2e2214' : '#5D4325');
  const g = N ? ['#15361a', '#1a3f1f', '#122e16'] : s.dry ? ['#7A8B3A', '#6E7E32', '#8A9A44'] : ['#2F6B2F', '#3A7D35', '#275E28'];
  circ(cx - w * .2, by - h * .6, w * .3, g[0]); circ(cx + w * .2, by - h * .62, w * .3, g[1]); circ(cx, by - h * .8, w * .32, g[2]);
}
function bush(x, by, w, h) { const g = N ? ['#163a1a', '#1c4420'] : ['#3E7D2C', '#4C8F34']; ell(x + w * .3, by - h * .4, w * .3, h * .45, g[0]); ell(x + w * .65, by - h * .45, w * .35, h * .5, g[1]); ell(x + w * .5, by - h * .6, w * .25, h * .4, g[0]); }
function billboard(x, by, w, h, s) {
  rect(x + w * .2, by - h * .55, Math.max(1, w * .04), h * .55, '#555'); rect(x + w * .76, by - h * .55, Math.max(1, w * .04), h * .55, '#555');
  rect(x, by - h, w, h * .48, s.b[2]); c.strokeStyle = '#ddd'; c.lineWidth = Math.max(1, w * .01); c.strokeRect(x, by - h, w, h * .48);
  fit(s.b[0], x + w / 2, by - h * .82, w * .9, h * .15, s.b[3]); fit(s.b[1], x + w / 2, by - h * .64, w * .85, h * .09, s.b[3], 700);
  if (N) { glow(x + w * .3, by - h * 1.0, w * .3, 'rgba(255,240,200,.4)'); glow(x + w * .7, by - h * 1.0, w * .3, 'rgba(255,240,200,.4)'); }
}
function epole(x, by, w, h, s) { const cx = x + w / 2; rect(cx - w * .12, by - h, w * .24, h, '#6B4A2B'); rect(cx - w * 1.2, by - h * .94, w * 2.4, h * .03, '#6B4A2B'); if (s.tr) rrect(cx - w * .5, by - h * .8, w, h * .12, 2, '#7E8790'); }
function busstop(x, by, w, h, s) {
  const sx = x + w * .05, sw = w * .72;
  rect(sx, by - h * .72, sw, h * .07, '#1F4FA8'); rect(sx, by - h * .65, sw, h * .03, '#F2C200');
  rect(sx + sw * .04, by - h * .66, Math.max(1, w * .02), h * .66, '#777'); rect(sx + sw * .93, by - h * .66, Math.max(1, w * .02), h * .66, '#777');
  rect(sx + sw * .1, by - h * .24, sw * .8, h * .04, '#8B5A2B');
  const px = x + w * .9; rect(px, by - h, Math.max(1, w * .015), h, '#777');
  rrect(px - w * .11, by - h, w * .22, h * .17, 2, '#F2C200'); fit('BUS STOP', px, by - h * .95, w * .2, h * .055, '#111'); fit(s.name, px, by - h * .885, w * .2, h * .045, '#111', 700);
  if (N) glow(sx + sw / 2, by - h * .6, w * .5, 'rgba(255,230,160,.35)');
  for (let i = 0; i < s.n; i++) person(x + w * (.18 + i * .11), by, h * .5, s.ppl[i % s.ppl.length]);
  s.friends.forEach((f, i) => { if (f.taken) return; const fx = x + w * (.1 + i * .1); person(fx, by, h * .54, { top: '#F5B83D', bot: '#121A3A', skin: SKIN[1], head: 'cap', hc: '#121A3A', wave: true }); rrect(fx - w * .2, by - h * (1.0 + i * .16), w * .4, h * .14, 6, '#fff'); fit('🙋🏾 ' + f.n, fx, by - h * (.93 + i * .16), w * .37, h * .09, '#121A3A'); });
}
function signboard(x, by, w, h, bg, fg, lines, border = '#fff') {
  const bw = w, bh = h * .55;
  rect(x + w * .15, by - h * .5, Math.max(1, w * .03), h * .5, '#777'); rect(x + w * .82, by - h * .5, Math.max(1, w * .03), h * .5, '#777');
  rrect(x, by - h, bw, bh, 3, bg); c.strokeStyle = border; c.lineWidth = Math.max(1, w * .012); c.strokeRect(x + w * .03, by - h + bh * .05, bw * .94, bh * .9);
  lines.forEach((l, i) => fit(l, x + w / 2, by - h + bh * (.3 + i * .38 / Math.max(1, lines.length - 1)), w * .88, bh * (i ? .2 : .26), fg, i ? 700 : 800));
}
function speedsign(x, by, w, h, s) { const cx = x + w / 2; rect(cx - w * .03, by - h * .6, Math.max(1, w * .06), h * .6, '#777'); circ(cx, by - h * .78, w * .48, '#fff'); circ(cx, by - h * .78, w * .4, '#D62828'); circ(cx, by - h * .78, w * .31, '#fff'); text(String(s.lim), cx, by - h * .78, w * .32, '#111'); }
function tlight(x, by, w, h, s) {
  const cx = x + w / 2, st = s.j ? lightState(s.j) : 'g';
  rect(cx - w * .06, by - h, w * .12, h, '#3B4048'); rrect(cx - w * .36, by - h, w * .72, h * .36, 3, '#151515');
  [['r', '#FF3B30'], ['a', '#FFB000'], ['g', '#2ECC71']].forEach(([k, col], i) => { const on = st === k, yy = by - h + h * (.06 + i * .11); circ(cx, yy, w * .22, on ? col : '#2a2a2a'); if (on) glow(cx, yy, w * .9, col + '88'); });
}
function drum(x, by, w, h, s) { if (s.down) { ell(x + w / 2, by - h * .15, w * .7, h * .18, '#E8742C'); return; } rrect(x, by - h, w, h, w * .15, '#E8742C'); rect(x, by - h * .72, w, h * .12, '#F5F5F5'); rect(x, by - h * .4, w, h * .12, '#F5F5F5'); ell(x + w / 2, by - h, w / 2, h * .06, '#C65A1F'); }
function pothole(x, by, w, h) { ell(x + w / 2, by - h / 2, w / 2, h / 2, '#5c5650'); ell(x + w / 2, by - h * .4, w * .42, h * .38, '#1E1F22'); if (N) ell(x + w * .45, by - h * .45, w * .2, h * .12, 'rgba(120,140,170,.35)'); }
function leaves(x, by, w, h) { for (let i = 0; i < 5; i++) ell(x + w * (.15 + i * .18), by - h * .4, w * .14, h * .5, i % 2 ? '#2E7D32' : '#4C8F34'); }
function hut(x, by, w, h, s) { rect(x + w * .08, by - h * .6, w * .84, h * .6, N ? '#4a3220' : s.wall); poly(N ? '#3a3e44' : '#8E959E', [x - w * .04, by - h * .58, x + w * 1.04, by - h * .58, x + w * .85, by - h, x + w * .15, by - h]); rect(x + w * .42, by - h * .4, w * .16, h * .4, '#3A2414'); if (N && s.lit) glow(x + w * .5, by - h * .25, w * .4, 'rgba(255,200,120,.4)'); }
function stall(x, by, w, h, s) {
  rect(x + w * .05, by - h * .45, w * .9, h * .08, '#8B5A2B'); rect(x + w * .1, by - h * .37, Math.max(1, w * .04), h * .37, '#8B5A2B'); rect(x + w * .86, by - h * .37, Math.max(1, w * .04), h * .37, '#8B5A2B');
  for (let i = 0; i < 6; i++) circ(x + w * (.15 + i * .14), by - h * .5, w * .06, s.goods === 'yam' ? '#7A5230' : '#D62828');
  for (let i = 0; i < 4; i++) circ(x + w * (.22 + i * .16), by - h * .58, w * .06, s.goods === 'yam' ? '#6A4528' : '#E5483C');
  rect(x, by - h * .95, w, h * .2, '#1F4FA8'); fit(s.goods === 'yam' ? 'FRESH YAM' : 'TOMATOES', x + w / 2, by - h * .85, w * .9, h * .12, '#fff');
  person(x + w * .95, by, h * .7, s.p);
}
function fuelst(x, by, w, h) {
  const cy = by - h * .85;
  rect(x + w * .12, cy, Math.max(1, w * .02), h * .85, '#ccc'); rect(x + w * .86, cy, Math.max(1, w * .02), h * .85, '#ccc');
  rect(x, cy - h * .15, w, h * .15, '#C0392B'); rect(x, cy - h * .03, w, h * .03, '#F2C200'); fit('FILLING STATION', x + w / 2, cy - h * .085, w * .6, h * .08, '#fff');
  for (let p = 0; p < 3; p++) { rrect(x + w * (.24 + p * .22), by - h * .36, w * .08, h * .36, 2, '#F5F5F5'); rect(x + w * (.25 + p * .22), by - h * .32, w * .06, h * .06, '#1d2433'); }
  rrect(x + w * .9, by - h * .9, w * .12, h * .46, 2, '#121A3A'); fit('PMS', x + w * .96, by - h * .8, w * .1, h * .06, '#F2C200'); fit('₦', x + w * .96, by - h * .7, w * .1, h * .08, '#fff');
  if (N) glow(x + w / 2, by - h * .6, w * .55, 'rgba(255,255,230,.45)');
}
function canoe(x, by, w, h) { poly('#5D4325', [x, by - h * .5, x + w, by - h * .5, x + w * .85, by, x + w * .15, by]); person(x + w * .55, by - h * .45, h * 1.1, { top: '#E67E22', bot: '#333', skin: SKIN[2], head: 'cap', hc: '#C9A26B' }); c.strokeStyle = '#3a2a18'; c.lineWidth = Math.max(1, w * .02); c.beginPath(); c.moveTo(x + w * .7, by - h * 1.2); c.lineTo(x + w * .95, by + h * .2); c.stroke(); }
function wreck(x, by, w, h) { c.save(); c.translate(x + w / 2, by); c.rotate(.07); veh('truck', 0, 0, w, { col: '#7F8C8D' }); c.restore(); }
function officer(x, by, w, h, s) { const k = CHECK[s.kind]; person(x + w / 2, by, h, { ...k.uni, skin: SKIN[0], wave: s.kind !== 'radar', radar: s.kind === 'radar' }); }
function van(x, by, w, h, s) { const v = CHECK[s.kind].van; veh('van', x + w / 2, by, w, { col: v[0], lc: v[1], lc2: v[1], label: v[2], siren: s.kind === 'police' }); }
function parked(x, by, w, h, s) { veh('danfo', x + w / 2, by, w, { rack: s.rack, sticker: s.sticker }); }

// span sprites cross the road: (cx = road centre, by, rw = road half width px, k = px per world unit)
function gantry(cx, by, rw, k, s) {
  const h = 2300 * k, bh = 650 * k, l = cx - rw * 1.14, r = cx + rw * 1.14, pw = Math.max(1, 90 * k);
  rect(l - pw / 2, by - h, pw, h, '#7E8790'); rect(r - pw / 2, by - h, pw, h, '#7E8790'); rect(l, by - h + bh * .25, r - l, Math.max(1, 50 * k), '#7E8790');
  const bw = (r - l) * .5;
  [[s.side === 'L' ? l + (r - l) * .03 : r - (r - l) * .03 - bw, s.t1, s.side === 'L' ? '⬅' : '➡'], [s.side === 'L' ? r - (r - l) * .03 - bw * .7 : l + (r - l) * .03, s.t2, '⬆']].forEach(([bx, t, ar], i) => {
    const ww = i ? bw * .7 : bw;
    rrect(bx, by - h - bh * .25, ww, bh, 3, '#0B6B3A'); c.strokeStyle = '#fff'; c.lineWidth = Math.max(1, 14 * k); c.strokeRect(bx + 20 * k, by - h - bh * .2, ww - 40 * k, bh * .9);
    fit(`${ar}  ${t}`, bx + ww / 2, by - h + bh * .25, ww * .88, bh * .34, '#fff');
  });
  if (N) glow(cx, by - h, rw * .6, 'rgba(255,255,230,.15)');
}
function footbridge(cx, by, rw, k, s) {
  const h = 1900 * k, l = cx - rw * 1.5, r = cx + rw * 1.5, t = 220 * k;
  rect(l, by - h, r - l, t, N ? '#4a4f57' : '#9AA3AD'); rect(l, by - h - t * 1.3, r - l, Math.max(1, 30 * k), '#5E6670');
  c.fillStyle = '#5E6670'; for (let i = 0; i <= 14; i++) c.fillRect(l + (r - l) * i / 14, by - h - t * 1.3, Math.max(1, 18 * k), t * 1.3);
  rect(l - 150 * k, by - h, 260 * k, h, N ? '#3d4249' : '#7E8790'); rect(r - 110 * k, by - h, 260 * k, h, N ? '#3d4249' : '#7E8790');
  for (let i = 0; i < s.n; i++) person(l + (r - l) * s.pp[i], by - h, 560 * k, s.ppl[i]);
}
function arch(cx, by, rw, k, s) {
  const h = 2500 * k, l = cx - rw * 1.25, r = cx + rw * 1.25, pw = 260 * k;
  rect(l - pw, by - h, pw, h, '#F5F5F5'); rect(r, by - h, pw, h, '#F5F5F5');
  rect(l - pw, by - h - 500 * k, r - l + pw * 2, 520 * k, s.bg || '#0B6B3A');
  rect(l - pw, by - h - 40 * k, r - l + pw * 2, 60 * k, '#F5F5F5');
  fit(s.label, cx, by - h - 250 * k, (r - l) * .95, 300 * k, '#fff');
  if (N) { glow(l, by - h, rw * .4, 'rgba(255,240,200,.35)'); glow(r, by - h, rw * .4, 'rgba(255,240,200,.35)'); }
}
const SPAN = { gantry, footbridge, arch };
const PAINT = { bld, unfinished, church, mosque, kiosk, lamp, lamp2, palm, tree, bush, billboard, epole, busstop, speedsign, tlight, drum, pothole, leaves, hut, stall, fuelst, canoe, wreck, officer, van, parked,
  person: (x, by, w, h, s) => person(x + w / 2, by, h, s.p),
  sign: (x, by, w, h, s) => signboard(x, by, w, h, s.bg, s.fg, s.lines) };

// traffic light cycle (green 5s, amber 1s, red 3s)
function lightState(j) { const p = (TIME + j.off) % 9; return p < 5 ? 'g' : p < 6 ? 'a' : 'r'; }

// ================= the game =================
function start(o) {
  return new Promise((resolve) => {
    const V = VEH[o.vehicle] || VEH.ride, race = !!o.race;
    const TR = rng(o.seed || (Math.random() * 1e9)), LR = race ? rng((o.seed || 1) + 7) : rng(Math.random() * 1e9);
    const hour = (new Date().getUTCHours() + 1) % 24, phase = hour >= 19 || hour < 6 ? 'night' : hour >= 17 ? 'dusk' : 'day';
    N = phase === 'night';
    const cityKey = CITYKEY[o.homeCity] || o.homeCity || 'Lagos', city = STREETS[cityKey] || STREETS._;
    const destCity = (DEST[o.to.id] && DEST[o.to.id].city) || o.to.city || o.to.name;
    const km = o.km || (race ? 12 : 20);

    // ---------- route ----------
    const legs = [];
    if (o.vehicle === 'danfo' && !race) legs.push({ name: TR.pick(PARKS[cityKey] || [`${o.homeCity || 'Central'} Motor Park`]), type: 'park', note: 'Danfo trips start from the motor park' });
    else if (race) legs.push({ name: `${o.from} Road`, type: 'estate' });
    else if (!o.fromId || o.fromId === 'home') legs.push({ name: TR.pick(city.estate), type: 'estate', note: 'Starting from your location', sub: 'Your street' });
    else legs.push({ name: `${o.from} exit road`, type: 'estate' });
    if (km > 8) legs.push({ name: TR.pick(city.arterial), type: 'arterial', stops: TR.shuffle(city.stops).slice(0, 3) });
    const dl = DEST[o.to.id] ? DEST[o.to.id].legs.filter(l => !l.far || km > 60) : [{ name: `${o.to.name} Road`, type: 'arterial', stops: ['Junction', 'Market'], final: true }];
    legs.push(...dl.map(l => ({ ...l })));
    for (let i = 0; i < legs.length - 1; i++) legs[i].turn = TR.chance(.5) ? 'L' : 'R';
    legs.forEach((l, i) => { l.i = i; if (i > 0) l.turnIn = legs[i - 1].turn; });

    // ---------- build segments ----------
    let segs = [];
    const fac = { okada: .9, keke: .7, ride: 1, danfo: .95 }[o.vehicle] || 1;
    const TOTAL = race ? 3400 : Math.round(clamp(2600 + km * 4, 2800, 4600) * fac);
    const WEIGHT = { park: 0, estate: .5, arterial: 1, expressway: 1.3, bridge: .8, highway: 1.5 };
    const fixed = legs.reduce((s, l, i) => s + (l.type === 'park' ? 150 : i === 0 ? 240 : 0), 0);
    const wsum = legs.reduce((s, l, i) => s + (l.type === 'park' || i === 0 ? 0 : WEIGHT[l.type]), 0) || 1;
    function mkSeg(i, y1, y2, curve, type, w, leg) { return { i, curve, type, w, leg, sprites: [], p1: { world: { y: y1, z: i * SEG }, camera: {}, screen: {} }, p2: { world: { y: y2, z: (i + 1) * SEG }, camera: {}, screen: {} }, clip: 0 }; }
    function builder(arr, y0, idx0) {
      let y = y0;
      const B = {
        add(curve, dy, type, leg, flags) { const s = mkSeg(idx0 + arr.length, y, y + dy, curve, type, RT[type].w, leg); y += dy; if (flags) Object.assign(s, flags); arr.push(s); return s; },
        piece(en, ho, le, curve, hill, type, leg) {
          const total = en + ho + le, ya = y, yb = y + hill * SEG;
          for (let n = 0; n < total; n++) {
            const cv = n < en ? ease.in(0, curve, n / en) : n < en + ho ? curve : ease.io(curve, 0, (n - en - ho) / le);
            B.add(cv, ease.io(ya, yb, (n + 1) / total) - ease.io(ya, yb, n / total), type, leg);
          }
        },
        get y() { return y; },
      };
      return B;
    }
    const B = builder(segs, 0, 0);
    const legRange = [];
    legs.forEach((leg, li) => {
      const rt = RT[leg.type], s0 = segs.length;
      let left = leg.type === 'park' ? 150 : li === 0 ? 240 : Math.round((TOTAL - fixed) * WEIGHT[leg.type] / wsum);
      leg.len = left;
      if (leg.turnIn) { const d = leg.turnIn === 'L' ? -1 : 1; B.piece(10, 12, 12, d * 6, 0, leg.type, li); left -= 34; }
      while (left > 0) {
        if (leg.type === 'park' || left < 40) { B.piece(0, left, 0, 0, 0, leg.type, li); left = 0; break; }
        const r = TR.f(); let len = Math.min(left, TR.i(40, 110));
        if (r < .35) B.piece(0, len, 0, 0, leg.type === 'highway' ? TR.f(-6, 6) : 0, leg.type, li);
        else if (r < .78) { const cv = TR.f(.8, leg.type === 'highway' ? 3.6 : 2.6) * (TR.chance(.5) ? -1 : 1), en = Math.round(len * .3), le = Math.round(len * .3); B.piece(en, len - en - le, le, cv, leg.type === 'highway' ? TR.f(-10, 10) : 0, leg.type, li); }
        else { const hill = leg.type === 'highway' ? TR.f(-28, 28) : leg.type === 'bridge' ? TR.f(-4, 8) : TR.f(-5, 5); B.piece(Math.round(len / 3), Math.round(len / 3), len - 2 * Math.round(len / 3), 0, hill, leg.type, li); }
        left -= len;
      }
      if (leg.turn) for (let n = 0; n < 8; n++) B.add(0, 0, leg.type, li, { cross: true, zebra: n === 0 });
      if (leg.final) for (let n = 0; n < 90; n++) B.add(0, 0, leg.type, li);
      // smooth the road width into the new type
      const prevW = s0 > 0 ? segs[s0 - 1].w : rt.w;
      for (let q = 0; q < 24 && s0 + q < segs.length; q++) segs[s0 + q].w = lerp(prevW, rt.w, q / 24);
      legRange.push([s0, segs.length - 1]);
    });

    // ---------- place things ----------
    const S = window.__nd = { stops: [], cps: [], juncs: [], fuels: [], jams: [], hawkers: [], cars: [], fares: 0, friends: 0, checks: 0, fines: 0, crashes: 0, pax: o.vehicle === 'danfo' ? 8 : 0,
      fuel: 100, t: 0, done: false, paused: true, ind: null, boost: 0, shake: 0, bgX: 0, msgs: {}, board: 0, lastHud: 0, wheelA: 0, steer: 0, brake: false };
    const reserved = [];
    const free = (a, b) => !reserved.some(([x, y]) => a < y && b > x);
    const reserve = (a, b) => reserved.push([a, b]);
    const sp = (i, t, x, ww, wh, extra) => { if (segs[i]) segs[i].sprites.push({ t, x, ww, wh, ...extra }); };
    const sideX = (base, R2) => (R2.chance(.5) ? -1 : 1) * base;
    function makeBld(R2) { const shop = R2.chance(.55), fl = R2.i(1, 3); return { t: 'bld', ww: R2.f(3000, 4200), wh: 1100 * fl + R2.f(300, 600), fl, shop, open: R2.chance(.6), wall: R2.pick(WALLS), roof: R2.pick(ROOFS), sign: R2.pick(SIGNS), sbg: R2.pick(['#fff', '#F2C200', '#1F4FA8', '#C0392B', '#1E8449']), sfg: '#121A3A', tank: R2.chance(.6), dish: R2.chance(.3), gen: R2.chance(.25), lit: Array.from({ length: 9 }, () => R2.chance(.45)), seed: R2.i(0, 9) }; }
    function urbanBuilding(i, side) {
      const r = TR.f(), x = side * TR.f(1.42, 1.75);
      if (r < .72) { const b = makeBld(TR); if (b.sign === 'GOD DEY' || b.sign === 'NO PARKING O') b.sfg = '#C0392B'; if (b.sbg === '#1F4FA8' || b.sbg === '#C0392B' || b.sbg === '#1E8449') b.sfg = '#fff'; sp(i, 'bld', x, b.ww, b.wh, b); }
      else if (r < .82) sp(i, 'unfinished', x, 3600, 2600, {});
      else if (r < .91) sp(i, 'church', x, 4000, 3300, { banner: TR.pick(BANNERS) });
      else sp(i, 'mosque', x, 3600, 3600, {});
    }
    legs.forEach((leg, li) => {
      const [s0, s1] = legRange[li], rt = RT[leg.type], J = leg.turn ? s1 - 7 : null;
      leg.J = J;
      // decoration
      for (let i = s0; i <= s1; i++) {
        const k = i - s0, sg = segs[i];
        if (sg.cross) continue;
        if (leg.type === 'park') {
          if (k % 5 === 0) { sp(i, 'parked', -TR.f(.95, 1.2), 700, 770, { rack: TR.chance(.6), sticker: TR.pick(STICKERS) }); sp(i, 'parked', TR.f(.95, 1.2), 700, 770, { rack: TR.chance(.6), sticker: TR.pick(STICKERS) }); }
          if (k % 7 === 3) sp(i, 'person', sideX(1.35, TR), 300, 620, { p: { ...randPerson(TR), wave: TR.chance(.5) } });
          if (k % 30 === 10) sp(i, 'sign', 1.6, 1500, 1500, { bg: '#121A3A', fg: '#F2C200', lines: [`LOADING: ${destCity.toUpperCase()}`, 'Enter with your change o'] });
          if (k % 12 === 0) urbanBuilding(i, -1), urbanBuilding(i, 1);
          continue;
        }
        if (rt.urban) {
          if (k % 7 === 0) { urbanBuilding(i, -1); urbanBuilding(i, 1); }
          if (k % 9 === 4) { if (rt.div) sp(i, 'lamp2', -1.09, 1500, 3200, { c: true }); else sp(i, 'lamp', (k % 18 === 4 ? -1 : 1) * 1.14, 800, 3200, { solar: TR.chance(.5) }); }
          if (TR.chance(.05)) sp(i, 'kiosk', sideX(1.27, TR), 900, 900, { col: TR.pick(['#1F4FA8', '#C0392B', '#F2C200', '#1E8449']), umb: TR.pick([['#E5483C', '#F2C200'], ['#1E8449', '#F5F5F5'], ['#2B59C3', '#F2C200']]), seed: TR.i(0, 9), p: randPerson(TR) });
          if (TR.chance(.05)) sp(i, 'person', sideX(1.2, TR), 300, 620, { p: { ...randPerson(TR), tray: TR.chance(.3) ? TR.pick(['🍞', '🥜', '🍌', '💧']) : null } });
          if (leg.type === 'estate' && k % 11 === 6) sp(i, 'epole', sideX(1.15, TR), 140, 2800, { tr: TR.chance(.2) });
          if (TR.chance(.03)) sp(i, 'palm', sideX(1.6, TR), 1400, 3400, { lean: TR.f(-1, 1) });
          if (TR.chance(.012)) sp(i, 'billboard', sideX(1.95, TR), 3400, 2800, { b: TR.pick(BILLS) });
          if (leg.type === 'estate' && TR.chance(.018) && Math.abs(J - i) > 30) sp(i, 'pothole', TR.f(-.6, .7), 520, 80, { c: true, hit: 'hole' });
        } else if (leg.type === 'expressway') {
          if (k % 10 === 0) sp(i, 'lamp2', -1.1, 1500, 3200, { c: true });
          if (TR.chance(.22)) sp(i, TR.chance(.5) ? 'bush' : 'tree', sideX(TR.f(1.4, 3), TR), 2000, TR.chance(.5) ? 800 : 2600, { dry: TR.chance(.3) });
          if (TR.chance(.05)) sp(i, 'palm', sideX(TR.f(1.4, 2.5), TR), 1400, 3400, { lean: TR.f(-1, 1) });
          if (TR.chance(.02)) sp(i, 'billboard', sideX(2, TR), 3400, 2800, { b: TR.pick(BILLS) });
          if (TR.chance(.035)) { const b = makeBld(TR); sp(i, 'bld', sideX(TR.f(2.4, 3.2), TR), b.ww, b.wh, b); }
        } else if (leg.type === 'bridge') {
          if (k % 10 === 0) { sp(i, 'lamp', 1.08, 800, 2600, {}); sp(i, 'lamp2', -1.08, 1500, 2600, { c: true }); }
          if (TR.chance(.02)) sp(i, 'canoe', sideX(TR.f(2, 5), TR), 1400, 420, {});
        } else if (leg.type === 'highway') {
          if (TR.chance(.08)) sp(i, 'palm', sideX(TR.f(1.3, 3), TR), 1400, 3400, { lean: TR.f(-1, 1) });
          if (TR.chance(.06)) sp(i, 'tree', sideX(TR.f(1.5, 3.4), TR), 2400, 2700, { dry: TR.chance(.4) });
          if (TR.chance(.14)) sp(i, 'bush', sideX(TR.f(1.2, 2.6), TR), 1600, 700, {});
          if (k % 240 === 120) for (let v = 0; v < 6; v++) { const ii = i + v * 4; sp(ii, 'hut', sideX(TR.f(1.6, 2.6), TR), 2200, 1300, { wall: TR.pick(['#A0522D', '#8B5A2B', '#B07040', '#C9A26B']), lit: TR.chance(.5) }); if (v % 2) sp(ii, 'stall', sideX(1.32, TR), 1200, 900, { goods: TR.chance(.5) ? 'yam' : 'tomato', p: randPerson(TR) }); }
          if (TR.chance(.006)) sp(i, 'sign', sideX(1.5, TR), 1400, 1500, { bg: '#fff', fg: '#C0392B', lines: ['JESUS IS LORD', 'Welcome'] });
          if (TR.chance(.012) && (!J || Math.abs(J - i) > 30)) sp(i, 'pothole', TR.f(-.6, .7), 560, 90, { c: true, hit: 'hole' });
        }
        if (k === 30) sp(i, 'speedsign', 1.3, 450, 1300, { lim: rt.lim });
        if ((leg.type === 'expressway' || leg.type === 'highway') && k === 70) sp(i, 'sign', 1.35, 1600, 1600, { bg: '#0B6B3A', fg: '#fff', lines: [destCity.toUpperCase(), `${Math.max(2, Math.round(km * (1 - i / segs.length)))} km`] });
      }
      // footbridges on expressways
      if (leg.type === 'expressway' || leg.type === 'arterial') for (let i = s0 + 200; i < (J || s1) - 120; i += 380) if (free(i - 10, i + 10)) { const n = TR.i(1, 4); sp(i, 'footbridge', 0, 0, 0, { span: true, n, pp: Array.from({ length: n }, () => TR.f(.15, .85)), ppl: Array.from({ length: n }, () => randPerson(TR)) }); reserve(i - 10, i + 10); }
      // breakdown on the highway: leaves on the road, then the broken truck
      if (leg.type === 'highway' && leg.len > 500) { const w0 = s0 + TR.i(150, leg.len - 200); if (free(w0 - 40, w0 + 10)) { sp(w0 - 30, 'leaves', .55, 700, 160, { c: true }); sp(w0 - 20, 'leaves', .55, 700, 160, { c: true }); sp(w0, 'wreck', .62, 860, 1250, { c: true, hit: 'crash' }); reserve(w0 - 40, w0 + 10); } }
      // junction
      if (J) {
        const next = legs[li + 1], gant = rt.div || leg.type === 'expressway';
        const other = TR.pick(city.stops);
        if (gant) sp(J - 70, 'gantry', 0, 0, 0, { span: true, side: leg.turn, t1: next.name, t2: other });
        else sp(J - 60, 'sign', 1.3, 1500, 1600, { bg: '#1F4FA8', fg: '#fff', lines: [`${leg.turn === 'L' ? '⬅' : '➡'} ${next.name}`, `⬆ ${other}`] });
        const j = { i: J, leg: li, turn: leg.turn, next: next.name, light: rt.urban, off: TR.f(0, 9), done: false };
        if (j.light) { sp(J - 1, 'tlight', 1.12, 320, 1700, { j }); sp(J - 1, 'tlight', -1.12, 320, 1700, { j }); }
        S.juncs.push(j); reserve(J - 80, J + 40);
      }
      // bus stops
      const names = leg.stops || [];
      const room = (J || s1 - 100) - (s0 + 90);
      const nStops = Math.min(names.length, Math.max(0, Math.floor(room / 230)));
      for (let q = 0; q < nStops; q++) {
        const b = Math.round(s0 + 90 + room * (q + .5) / nStops);
        if (!free(b - 20, b + 10)) continue;
        const ppl = Array.from({ length: 5 }, () => randPerson(TR));
        const st = { i: b, name: names[q], n: TR.i(o.vehicle === 'danfo' ? 3 : 1, o.vehicle === 'danfo' ? 5 : 2), ppl, friends: [], done: false, passed: false };
        sp(b, 'busstop', RT[leg.type].two ? 1.3 : 1.35, 2600, 1300, st);
        for (let q2 = b - 7; q2 <= b + 2; q2++) if (segs[q2]) segs[q2].layby = true;
        S.stops.push(st); reserve(b - 20, b + 10);
      }
      // filling station
      if (!race && leg.len > 450 && leg.type !== 'bridge' && leg.type !== 'park') {
        for (let tries = 0; tries < 12; tries++) { const f = s0 + TR.i(120, leg.len - 150); if (!free(f - 30, f + 10)) continue; sp(f, 'fuelst', 1.42, 4400, 1800, {}); sp(f - 28, 'sign', 1.3, 1300, 1500, { bg: '#C0392B', fg: '#fff', lines: ['FILLING STATION', 'Fuel dey · 200m'] }); for (let q2 = f - 7; q2 <= f + 2; q2++) if (segs[q2]) segs[q2].layby = true; S.fuels.push({ i: f, done: false }); reserve(f - 30, f + 10); break; }
      }
      // go-slow
      if ((leg.type === 'arterial' || leg.type === 'expressway' || leg.type === 'bridge') && leg.len > 300 && (TR.chance(.75) || !S.jams.length)) {
        for (let tries = 0; tries < 40; tries++) { const a = s0 + TR.i(60, Math.max(61, leg.len - 160)); if (!free(a - 10, a + 100)) continue; S.jams.push({ a, b: a + 90, state: 'idle', t: 0 }); reserve(a - 10, a + 100); break; }
      }
      if (leg.final) { const e = s1 - 70; sp(e, 'arch', 0, 0, 0, { span: true, label: `WELCOME TO ${o.to.name.toUpperCase()}` }); S.endI = e + 6; }
    });
    // checkpoints
    if (!race) {
      const want = TOTAL > 3600 ? 3 : 2, cand = legs.filter(l => CPKINDS[l.type] && l.len > 380);
      for (let n = 0, tries = 0; n < want && tries < 60 && cand.length; tries++) {
        const leg = TR.pick(cand), [s0] = legRange[leg.i], i = s0 + TR.i(130, leg.len - 120);
        if (!free(i - 90, i + 20)) continue;
        const kind = TR.pick(CPKINDS[leg.type]), cp = { i, kind, done: false, warned: false };
        sp(i - 75, 'sign', 1.32, 1500, 1500, { bg: kind === 'radar' ? '#fff' : '#F2C200', fg: '#121A3A', lines: [CHECK[kind].sign, kind === 'radar' ? `LIMIT ${RT[leg.type].lim} km/h` : 'SLOW DOWN · STOP WHEN FLAGGED'] });
        if (kind !== 'radar') { const lx = laneXs(RT[leg.type]); [i - 12, i - 7].forEach((zz, q) => (RT[leg.type].two ? [-0.15] : lx.slice(0, -1)).forEach((xx) => sp(zz, 'drum', xx + (q ? .12 : -.08), 280, 400, { c: true, hit: 'crash' }))); }
        sp(i, 'officer', 1.12, 320, 640, { kind }); sp(i + 4, 'van', 1.5, 820, 750, { kind });
        S.cps.push(cp); reserve(i - 90, i + 20); n++;
      }
    }
    const CLUTTER = new Set(['bld', 'unfinished', 'church', 'mosque', 'kiosk', 'person', 'palm', 'tree', 'bush', 'billboard', 'epole', 'hut', 'stall']);
    const clear = (i, a, b) => { for (let q = i - a; q <= i + b; q++) if (segs[q]) segs[q].sprites = segs[q].sprites.filter(s => !(CLUTTER.has(s.t) && s.x > 0)); };
    S.stops.forEach(st => clear(st.i, 16, 4)); S.fuels.forEach(fs2 => clear(fs2.i, 16, 6)); S.cps.forEach(cp => clear(cp.i, 10, 6));
    // friends who asked for a lift wait at bus stops
    const pk = race ? [] : (o.pickups || []);
    if (pk.length && !S.stops.length) { const leg = legs[legs.length > 1 ? 1 : 0], [s0, s1] = legRange[leg.i], b = Math.round((s0 + s1) / 2); const st = { i: b, name: TR.pick(city.stops), n: 1, ppl: [randPerson(TR)], friends: [], done: false }; sp(b, 'busstop', 1.35, 2600, 1300, st); for (let q = b - 7; q <= b + 2; q++) segs[q].layby = true; S.stops.push(st); }
    pk.forEach((f, i) => { const st = S.stops[Math.min(S.stops.length - 1, Math.floor((i + .5) * S.stops.length / pk.length))]; st.friends.push({ id: f.id, n: f.n, taken: false }); });
    S.stops.sort((a, b) => a.i - b.i);
    if (!S.endI) S.endI = segs.length - 20;
    let trackLen = segs.length * SEG;

    // ---------- DOM ----------
    const ov = document.createElement('div'); ov.className = 'drive'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const legLine = legs.map(l => `<span>${RT[l.type].icon} ${l.sub ? `${l.sub} (${l.name})` : l.name}</span>`).join('<i>→</i>');
    const friendLine = pk.length ? `<div class="d-friends">${S.stops.filter(s => s.friends.length).map(s => s.friends.map(f => `🙋🏾 <b>${f.n}</b> is waiting at <b>${s.name}</b> bus stop`).join('<br>')).join('<br>')}</div>` : '';
    ov.innerHTML = `
      <canvas id="dc"></canvas>
      <div class="d-hud">
        <div class="d-pbar"><i id="dpb"></i><span id="dme">${V.emoji}</span><div id="dghosts"></div></div>
        <div class="d-top"><button class="d-x" aria-label="Quit">✕</button>
          <div class="d-road"><b id="droad"></b><small id="dnext"></small></div>
          <div class="d-stats"><span class="d-spd"><b id="dspd">0</b><small>km/h</small></span><span class="d-lim" id="dlim">50</span>${race ? '' : '<span id="dfuel">⛽ <b>100</b></span>'}${race ? '' : '<span id="dpax">🧍 <b>0</b></span>'}</div></div>
        <div class="d-turn hidden" id="dturn"><button data-ind="L" aria-label="Indicate left">⬅</button><div id="dturnt"></div><button data-ind="R" aria-label="Indicate right">➡</button></div>
        <div class="d-banner hidden" id="dban"></div>
        <div class="d-msg" id="dmsg"></div>
        <div class="d-hint hidden" id="dhint"></div>
        <button class="d-buyfuel hidden" id="dfill">⛽ Buy jerrycan fuel · 20 🪙</button>
        <div class="d-ctl" id="dctl"></div>
      </div>
      <div class="d-dlg hidden" id="ddlg"></div>
      <div class="d-start" id="dstart"><div class="d-card">
        <small>${race ? '🏁 Race vs your friends' : `${V.emoji} ${V.name} · Detty December road trip`}</small>
        <h2>${race ? o.from : legs[0].sub || legs[0].name} → ${o.to.name}</h2>
        ${legs[0].note ? `<p class="d-note">📍 ${legs[0].note}: <b>${legs[0].name}</b></p>` : ''}
        <div class="d-route">${legLine}</div>${friendLine}
        <p class="d-tips">${race ? 'Same road for everybody. Fastest time wins, every crash adds 3 seconds.' : 'Keep right. Watch for the turn signs at each junction. Slow down for checkpoints, stop at bus stops to carry people, and refuel at filling stations.'}</p>
        <div class="d-ctlpick"><button data-c="wheel" class="on"><span>🎡</span>Wheel</button><button data-c="tilt"><span>📱</span>Tilt</button><button data-c="tap"><span>👆</span>Buttons</button></div>
        ${V.gear && !race ? `<label class="d-gear"><input type="checkbox" id="dgear"> ${V.gear === 'helmet' ? '⛑️ Wear helmet' : '🔒 Fasten seat belt'} <small>(Road Safety dey check o)</small></label>` : ''}
        <button class="btn btn-gold" id="dgo">🔑 Start engine</button>
        <small class="d-rothint">📱↻ Best played with your phone turned sideways</small></div></div>
      <div class="d-rot hidden" id="drot"><div><div class="d-rotic">📱</div><b>Turn your phone sideways</b><p>Steer with one thumb, brake with the other.</p><button class="btn btn-line" id="drotskip">Play upright instead</button></div></div>`;
    const $ = (s) => ov.querySelector(s);
    const cv = $('#dc'), ctx = cv.getContext('2d');
    let W = 0, H = 0, F = 0, HY = 0, DPR = Math.min(1.75, devicePixelRatio || 1), skyG = null;
    const size = () => {
      W = innerWidth; H = innerHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + 'px'; cv.style.height = H + 'px'; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const portrait = H > W; F = Math.min(H / 2, W * .62); HY = portrait ? H * .4 : H * .5;
      skyG = ctx.createLinearGradient(0, 0, 0, HY);
      const sky = phase === 'night' ? ['#050A22', '#1A2456'] : phase === 'dusk' ? ['#2B2D6E', '#F08A4B'] : ['#4FA9E8', '#CFEBFA'];
      skyG.addColorStop(0, sky[0]); skyG.addColorStop(1, sky[1]);
      if (!$('#drot').classList.contains('hidden') && W > H) rotDone();
    };
    size(); addEventListener('resize', size);
    const msg = (t, ms = 1900) => { const el = $('#dmsg'); el.textContent = t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(msg.t); msg.t = setTimeout(() => el.classList.remove('show'), ms); };
    const banner = (t, ms = 2200) => { const el = $('#dban'); el.textContent = t; el.classList.remove('hidden', 'in'); void el.offsetWidth; el.classList.add('in'); clearTimeout(banner.t); banner.t = setTimeout(() => el.classList.add('hidden'), ms); };
    const once = (key, fn) => { if (S.msgs[key]) return; S.msgs[key] = 1; fn(); };
    const vib = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
    let actx = null;
    const tone = (freqs, dur = .12, type = 'square', vol = .05) => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); freqs.forEach((f, i) => { const os = actx.createOscillator(), g = actx.createGain(); os.type = type; os.frequency.value = f; g.gain.value = vol; os.connect(g).connect(actx.destination); os.start(actx.currentTime + i * (dur + .04)); os.stop(actx.currentTime + i * (dur + .04) + dur); }); } catch {} };
    const horn = () => tone([415, 415], .14);
    const siren = () => tone([880, 660, 880, 660], .16, 'sawtooth', .035);

    // shared colour table for this trip
    const f = phase === 'night' ? .42 : phase === 'dusk' ? .75 : 1;
    const BASE = { road: ['#4B4E56', '#52555D'], dirt: ['#A57A4C', '#9C7346'], laterite: ['#B65A30', '#AC532B'], urban: ['#8F8573', '#877D6B'], grass: ['#4E8A2E', '#46802A'], bush: ['#557A29', '#4D7025'], water: ['#1E6391', '#1A5A86'], walk: ['#B9B3A6', '#ADA798'], yb: ['#F2C200', '#1A1A1A'], rw: ['#C0392B', '#F2F2F2'], rail: ['#9AA3AD', '#7E8790'] };
    const C = {}; for (const k in BASE) C[k] = BASE[k].map(h => shade(h, k === 'yb' || k === 'rw' ? Math.max(f, .6) : f));
    C.lit = ['#6E6750', '#746C55']; C.gutter = shade('#2A2522', f); C.line = shade('#F2F2F2', Math.max(f, .7)); C.yline = shade('#F2C200', Math.max(f, .7)); C.opp = shade('#43464D', f);
    if (N) for (const sg of segs) if (sg.sprites.some(s => s.t === 'lamp' || s.t === 'lamp2')) for (let d = -2; d <= 2; d++) if (segs[sg.i + d]) segs[sg.i + d].lit = true;
    const stars = Array.from({ length: 50 }, () => [Math.random(), Math.random() * .9, Math.random() * 1.4 + .3]);
    const skyline = Array.from({ length: 40 }, () => ({ w: 20 + Math.random() * 50, h: 20 + Math.random() * 90, win: Math.random() }));

    // ---------- controls ----------
    let control = 'wheel', tiltV = null, tiltSeen = false;
    ov.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { ov.querySelectorAll('[data-c]').forEach(x => x.classList.remove('on')); b.classList.add('on'); control = b.dataset.c; o.beep('tap'); });
    const keys = {};
    const kd = (e) => { keys[e.key] = true; if (e.key === 'h' || e.key === 'H') { horn(); hornPush(); } if (e.key === 'q' || e.key === ',') setInd('L'); if (e.key === 'e' || e.key === '.') setInd('R'); if (e.key === ' ') e.preventDefault(); };
    const ku = (e) => { keys[e.key] = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    function onTilt(e) {
      if (e.gamma == null) return; tiltSeen = true;
      const ang = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
      tiltV = clamp(ang === 90 ? e.beta / 20 : (ang === 270 || ang === -90) ? -e.beta / 20 : e.gamma / 22, -1, 1);
    }
    const ctl = $('#dctl');
    function setupControls() {
      const right = `<button class="d-ped horn" id="dhorn" aria-label="Horn">📯</button><button class="d-ped brake" id="dbrake" aria-label="Brake"><span>🛑</span><small>BRAKE</small></button>`;
      if (control === 'wheel') {
        ctl.innerHTML = `${right}<div class="d-wheel" id="dwheel"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#151515" stroke-width="11"/><circle cx="50" cy="50" r="44" fill="none" stroke="#3a3a3a" stroke-width="3"/><circle cx="50" cy="50" r="12" fill="#262626"/><path d="M50 38 V8 M38 55 L11 67 M62 55 L89 67" stroke="#262626" stroke-width="10" stroke-linecap="round"/><circle cx="50" cy="50" r="6" fill="#F5B83D"/><rect x="47" y="2" width="6" height="9" rx="2" fill="#F5B83D"/></svg></div>`;
        const wh = $('#dwheel'); let drag = null;
        const ang = (e) => { const r = wh.getBoundingClientRect(); return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI; };
        wh.onpointerdown = (e) => { wh.setPointerCapture(e.pointerId); S.wheelDrag = true; drag = ang(e) - S.wheelA; };
        wh.onpointermove = (e) => { if (drag == null) return; let a = ang(e) - drag; while (a > 180) a -= 360; while (a < -180) a += 360; S.wheelA = clamp(a, -135, 135); };
        wh.onpointerup = wh.onpointercancel = () => { drag = null; S.wheelDrag = false; };
      } else if (control === 'tilt') {
        ctl.innerHTML = `${right}<div class="d-tilt">📱<small>Tilt to steer</small></div>`;
        addEventListener('deviceorientation', onTilt);
        setTimeout(() => { if (!tiltSeen) { msg('Tilt not working here, switching to buttons 👆', 2500); control = 'tap'; setupControls(); } }, 2500);
      } else {
        ctl.innerHTML = `${right}<div class="d-taps"><button id="dl" aria-label="Steer left">◀</button><button id="dr" aria-label="Steer right">▶</button></div>`;
        const hold = (el, v) => { el.onpointerdown = (e) => { el.setPointerCapture(e.pointerId); S.tap = v; }; el.onpointerup = el.onpointercancel = () => { if (S.tap === v) S.tap = 0; }; };
        hold($('#dl'), -1); hold($('#dr'), 1);
      }
      const br = $('#dbrake');
      br.onpointerdown = (e) => { br.setPointerCapture(e.pointerId); S.brake = true; br.classList.add('on'); };
      br.onpointerup = br.onpointercancel = () => { S.brake = false; br.classList.remove('on'); };
      $('#dhorn').onclick = () => { horn(); hornPush(); };
    }
    function setInd(d) { S.ind = S.ind === d ? null : d; ov.querySelectorAll('[data-ind]').forEach(b => b.classList.toggle('on', b.dataset.ind === S.ind)); if (S.ind) tone([1200], .03, 'square', .02); }
    ov.querySelectorAll('[data-ind]').forEach(b => b.onclick = () => setInd(b.dataset.ind));
    function hornPush() {
      const pz = S.z + PZ, ahead = S.cars.filter(k => k.dir > 0 && !k.far && k.z > pz && k.z - pz < 2400 && Math.abs(k.x - S.x) < .35).sort((a, b) => a.z - b.z)[0];
      if (!ahead) return;
      if (ahead.t === 'danfo' && LR.chance(.4)) return msg('Danfo no send you 😂', 1200);
      const lanes = laneXs(RT[segAt(ahead.z).type]); const alt = lanes.filter(x => Math.abs(x - ahead.x) > .2);
      if (alt.length) { ahead.tx = LR.pick(alt); msg('Pam pam! 📯 They moved', 1100); }
    }
    // taps on hawkers
    cv.addEventListener('click', async (e) => {
      const hk = S.hawkers.find(h => h.rect && !h.sold && e.clientX > h.rect[0] && e.clientX < h.rect[0] + h.rect[2] && e.clientY > h.rect[1] && e.clientY < h.rect[1] + h.rect[3]);
      if (!hk) return;
      if (race) return msg('No time to buy, you are racing! 🏁');
      const [em, name, cost] = ITEMS[hk.item];
      try { const r = await o.api('/api/trip/buy', { item: hk.item }); o.onCoins(r.coins); hk.sold = true; o.beep('ok');
        if (hk.item === 'gala') { S.boost = 5; msg(`${em} ${name}! Turbo when the road frees 🚀`); } else { const add = hk.item === 'bread' ? 25 : hk.item === 'chips' ? 15 : 8; S.fuel = Math.min(100, S.fuel + add); msg(`${em} ${name} for ${cost} 🪙 · energy +${add} ⛽`); }
      } catch (err) { o.toast(err.message); }
    });
    $('#dfill').onclick = async () => { try { const r = await o.api('/api/trip/buy', { item: 'fuel' }); o.onCoins(r.coins); S.fuel = 60; $('#dfill').classList.add('hidden'); msg('Jerrycan fuel ⛽ Oya go!'); o.beep('ok'); } catch (err) { o.toast(err.message); } };
    $('.d-x').onclick = () => { S.paused = true; if (confirm('Leave the road? You will skip to arriving without bonus coins.')) finish(true); else S.paused = false; };
    const onVis = () => { if (document.hidden && !S.done && S.started) S.paused = true; else if (!document.hidden && S.started && !S.done && $('#ddlg').classList.contains('hidden')) S.paused = false; };
    document.addEventListener('visibilitychange', onVis);

    // landscape + fullscreen
    const coarse = matchMedia('(pointer: coarse)').matches;
    async function goLandscape() {
      if (!coarse) return;
      try { if (!document.fullscreenElement && ov.requestFullscreen) await ov.requestFullscreen({ navigationUI: 'hide' }); } catch {}
      try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch {}
    }
    let rotWait = null;
    function rotDone() { $('#drot').classList.add('hidden'); if (rotWait) { const f2 = rotWait; rotWait = null; f2(); } }
    $('#drotskip').onclick = rotDone;
    $('#dgo').onclick = async () => {
      if (control === 'tilt' && typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { try { await DeviceOrientationEvent.requestPermission(); } catch {} }
      S.gear = !!($('#dgear') && $('#dgear').checked) || !V.gear;
      await goLandscape();
      $('#dstart').remove(); setupControls();
      await new Promise(r => setTimeout(r, 350));
      if (coarse && innerHeight > innerWidth) { $('#drot').classList.remove('hidden'); await new Promise(r => { rotWait = r; }); }
      size();
      if (legs[0].type === 'park') msg(`Conductor: "${destCity}! ${destCity}! Enter with your change o!" 🗣️`, 3000);
      else if (legs[0].note) msg(`📍 ${legs[0].note}`, 2400);
      let n = 3; banner('3'); o.beep('tick');
      const cd = setInterval(() => { n--; if (n > 0) { banner(String(n)); o.beep('tick'); } else { clearInterval(cd); banner('GO! 🚦'); o.beep('win'); S.paused = false; S.started = true; } }, 800);
    };

    // ---------- traffic ----------
    let carId = 0;
    const segAt = (z) => segs[clamp(Math.floor(z / SEG), 0, segs.length - 1)];
    function spawnCar(z, opt = {}) {
      const sg = segAt(z), rt = RT[sg.type], lanes = laneXs(rt);
      let t = opt.t || LR.weighted(MIX[sg.type]);
      if (t === 'brt' && cityKey !== 'Lagos' && destCity !== 'Lekki' && destCity !== 'Iganmu') t = 'danfo';
      let dir = 1, x;
      if (opt.far) { dir = -1; x = -1.32 - LR.f(0, .8); }
      else if (rt.two && LR.chance(.45) && !opt.jam) { dir = -1; x = lanes[0]; }
      else x = rt.two ? lanes[1] : LR.pick(lanes);
      if (opt.x != null) x = opt.x;
      const pz = S.z + PZ;
      if (!opt.far && !opt.jam && S.cars.some(k => !k.far && Math.abs(k.x - x) < .3 && Math.abs(k.z - z) < 900)) return;
      if (!opt.far && Math.abs(z - pz) < 600 && Math.abs(x - S.x) < .4) return;
      const base = TYPE[t].f * LR.f(.75, 1.05);
      S.cars.push({ id: ++carId, z, x, tx: x, dir, t, w: TYPE[t].w, base, s: opt.jam ? 0 : rt.lim * base, col: LR.pick(CARCOL), far: !!opt.far, jam: opt.jam || null, crawl: LR.f(2, 6),
        rack: LR.chance(.45), cond: t === 'danfo' && LR.chance(.5), sticker: LR.pick(STICKERS), shirt: LR.pick(CLOTH), pass: LR.chance(.4), helmet: LR.chance(.3), lc: LR.f(3, 8) });
    }
    function nextJ(z) { for (const j of S.juncs) if (j.i * SEG >= z - SEG) return j; return null; }
    function updateCars(dt) {
      const pz = S.z + PZ, psg = segAt(pz), prt = RT[psg.type];
      // spawn
      const want = DENSITY[psg.type], live = S.cars.filter(k => !k.far && !k.jam).length;
      if (live < want && LR.chance(dt * 6)) { const z = pz + LR.f(DRAW * .55, DRAW * .95) * SEG; if (!S.jams.some(j => j.state !== 'over' && z > (j.a - 5) * SEG && z < (j.b + 5) * SEG)) spawnCar(z); }
      if (prt.div && S.cars.filter(k => k.far).length < 6 && LR.chance(dt * 3)) spawnCar(pz + LR.f(DRAW * .5, DRAW * .95) * SEG, { far: true });
      for (const k of S.cars) {
        const sg = segAt(k.z), rt = RT[sg.type];
        let tgt = rt.lim * k.base;
        if (k.jam) tgt = k.jam.state === 'over' ? tgt : k.jam.state === 'active' ? k.crawl : 0;
        if (k.dir > 0 && !k.far) {
          const j = nextJ(k.z); if (j && j.light && lightState(j) !== 'g' && j.i * SEG - k.z > 0 && j.i * SEG - k.z < 4 * SEG) tgt = 0;
          for (const q of S.cars) if (q !== k && q.dir > 0 && !q.far && Math.abs(q.x - k.x) < .3 && q.z > k.z && q.z - k.z < 900) { tgt = Math.min(tgt, q.s * (q.z - k.z < 500 ? .6 : .95)); if (q.z - k.z < 600 && !rt.two && !k.jam && k.lc < 1) { const alt = laneXs(rt).filter(x => Math.abs(x - k.x) > .2 && Math.abs(x - k.x) < .8); if (alt.length) { k.tx = LR.pick(alt); k.lc = LR.f(3, 7); } } }
          if (pz > k.z && pz - k.z < 800 && Math.abs(S.x - k.x) < .35) tgt = Math.min(tgt, S.s * .9);
          k.lc -= dt;
          if (k.lc < 0 && !k.jam && !rt.two) { k.lc = LR.f(3, 9); if (LR.chance(k.t === 'danfo' ? .55 : .2)) k.tx = LR.pick(laneXs(rt)); }
          if (k.t === 'danfo' && !k.jam && !rt.two && k.z > pz && k.z - pz < 1600 && k.z - pz > 500 && Math.abs(k.x - S.x) > .3 && LR.chance(dt * .25)) { k.tx = laneXs(rt).reduce((a, b) => Math.abs(b - S.x) < Math.abs(a - S.x) ? b : a); once('cut' + k.id, () => msg('Danfo don cut in front of you 😤', 1400)); }
        }
        k.s += clamp(tgt - k.s, -70 * dt, 16 * dt); k.s = Math.max(0, k.s);
        k.brake = tgt < k.s - 3;
        k.z += k.dir * k.s * U * dt;
        k.x += (k.tx - k.x) * Math.min(1, dt * 1.6);
      }
      S.cars = S.cars.filter(k => !k.gone && k.z > S.z - 4 * SEG && k.z < S.z + (DRAW + 30) * SEG && k.z < trackLen - SEG);
    }
    function updateJams(dt) {
      const pi = Math.floor((S.z + PZ) / SEG);
      for (const j of S.jams) {
        if (j.state === 'idle' && j.a - pi < DRAW * .9) {
          j.state = 'queued';
          S.cars = S.cars.filter(k => k.far || k.z < (j.a - 6) * SEG || k.z > (j.b + 6) * SEG);
          const rt = RT[segs[j.a].type];
          for (const x of laneXs(rt)) for (let z = j.a * SEG; z < j.b * SEG; z += LR.f(1000, 1400)) spawnCar(z, { x: x + LR.f(-.06, .06), jam: j, t: LR.weighted([['danfo', .4], ['car', .3], ['brt', .08], ['keke', .1], ['bus', .12]]) });
        }
        if (j.state === 'queued' && j.a - pi < 70) once('jam' + j.a, () => { banner('GO-SLOW AHEAD 😩'); o.beep('no'); });
        if (j.state === 'queued' && j.a - pi < 18) {
          j.state = 'active'; j.t = LR.f(9, 12); msg('Hold-up! Hawkers dey come… tap them to buy 🛒', 2600);
          const rt = RT[segs[j.a].type], bounds = Array.from({ length: rt.lanes - 1 }, (_, i) => -1 + 2 * (i + 1) / rt.lanes);
          Object.keys(ITEMS).forEach((it, i) => S.hawkers.push({ z: (pi + 5 + i * 3) * SEG, x: bounds[i % bounds.length] || .9, item: it, sold: false, bob: LR.f(0, 6) }));
        }
        if (j.state === 'active') { j.t -= dt; if (j.t <= 0) { j.state = 'over'; banner('Road don free! 🚗💨'); S.hawkers.forEach(h => h.leaving = true); } }
      }
      S.hawkers.forEach(h => { h.bob += dt * 5; if (h.leaving) h.x += (h.x < 0 ? -1 : 1) * dt * .6; });
      S.hawkers = S.hawkers.filter(h => h.z > S.z && Math.abs(h.x) < 1.6);
    }

    // ---------- events ----------
    function dialog(em, title, line, replies) {
      return new Promise((res) => {
        S.paused = true; const d = $('#ddlg');
        d.innerHTML = `<div class="d-dcard"><div class="d-dem">${em}</div><small>${title}</small><p>${line}</p><div class="d-dbtns">${replies.map((r, i) => `<button class="btn ${i ? 'btn-line' : 'btn-gold'}" data-r="${i}">${r}</button>`).join('')}</div></div>`;
        d.classList.remove('hidden');
        d.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { d.classList.add('hidden'); S.paused = false; res(+b.dataset.r); });
      });
    }
    async function fine(kind, why) {
      siren(); vib([80, 50, 80]); S.fines++;
      if (race) return msg(`🚨 ${why}`, 2400);
      try { const r = await o.api('/api/trip/fine', { kind }); o.onCoins(r.coins); msg(`🚨 ${why}${r.fined ? ` Fine −${r.fined} 🪙` : ''}`, 2800); } catch { msg(`🚨 ${why}`, 2400); }
    }
    async function checkpoint(cp) {
      cp.done = true;
      const k = CHECK[cp.kind], rt = RT[segs[cp.i].type];
      if (cp.kind === 'radar') {
        if (S.s > rt.lim + 5) return fine('radar', `Speed camera caught you at ${Math.round(S.s)} km/h!`);
        S.checks++; return msg(`📸 Speed check: ${Math.round(S.s)} km/h ✅ Correct driver`, 2200);
      }
      if ((cp.minS ?? S.s) > 15) return fine(cp.kind, `You no stop for ${k.who}! They don radio the next checkpoint.`);
      if (cp.kind === 'frsc') {
        if (S.gear || !V.gear) { await dialog(k.em, k.who, V.gear ? `${V.gear === 'helmet' ? 'Helmet' : 'Seat belt'} on? ✅ Fire extinguisher dey? ✅ Correct driver! Safe journey.` : 'Keke na three passengers only o. You dey alright. Safe journey!', ['🙏🏾 Thank you, officer']); S.checks++; o.beep('ok'); return; }
        await dialog(k.em, k.who, `Where your ${V.gear}?! Na offence be that o.`, [`😬 Sorry sir, I don wear am now`]); S.gear = true; return fine('frsc', `No ${V.gear}.`);
      }
      await dialog(k.em, k.who, k.line, k.replies.map(r => r(o.to.name)));
      await dialog(k.em, k.who, k.ok, ['🚗 Oya, thank you!']);
      S.checks++; o.beep('ok');
    }
    async function boardStop(st) {
      st.done = true;
      let n = 0;
      for (const fr of st.friends) {
        if (fr.taken) continue;
        try { const r = await o.api('/api/trip/pickup', { id: fr.id }); fr.taken = true; S.friends++; S.pax++; o.onCoins(r.coins); msg(`🙌🏾 ${fr.n} don enter! +${r.reward} 🪙 · they get the stamp too`, 2600); o.beep('win'); vib(60); }
        catch (e) { msg(e.message); }
      }
      if (o.vehicle === 'danfo' && S.pax > 2 && LR.chance(.7)) { const off = LR.i(1, Math.min(3, S.pax - S.friends)); S.pax -= off; msg(`"O wa o!" 🗣️ ${off} passenger${off > 1 ? 's' : ''} dropped`, 1600); }
      const room = V.cap - S.pax;
      if (room > 0 && st.n > 0) { n = Math.min(room, st.n); st.n -= n; S.pax += n; S.fares += n; setTimeout(() => msg(o.vehicle === 'danfo' ? `Conductor: "Owo da?" 💰 ${n} passenger${n > 1 ? 's' : ''} paid` : `🧍 ${n} passenger${n > 1 ? 's' : ''} entered · fare collected`, 2000), st.friends.length ? 2700 : 0); o.beep('ok'); }
      else if (!st.friends.length) msg(room <= 0 ? 'Motor don full! 🚐' : 'Nobody dey this stop', 1500);
    }
    async function refuel(fs) {
      fs.done = true;
      if (S.fuel > 90) return msg('Tank still full ⛽', 1400);
      try { const r = await o.api('/api/trip/buy', { item: 'fuel' }); o.onCoins(r.coins); S.fuel = 100; $('#dfill').classList.add('hidden'); msg('⛽ Attendant: "Oga, I don fill am!" Tank full', 2400); o.beep('ok'); } catch (err) { msg(err.message); }
    }
    function wrongTurn(j, ch) {
      banner(ch === 'S' ? 'You missed the turn! 😩' : 'Wrong road! 😩', 2400);
      msg('Find U-turn and come back. Na so Naija roads be 😅', 2600); o.beep('no');
      const at = j.i + 8, y0 = segs[at - 1].p2.world.y, tmp = [], DB = builder(tmp, y0, at);
      const li = legs.length; legs.push({ name: `${TR.pick(city.estate)}`, sub: 'Wrong road 😩', type: 'estate', i: li, detour: true });
      const d = ch === 'L' ? -1 : ch === 'R' ? 1 : 0;
      if (d) DB.piece(10, 12, 12, d * 6, 0, 'estate', li);
      DB.piece(0, 100, 0, 0, 0, 'estate', li);
      DB.piece(10, 20, 10, (d || 1) * -7, 0, 'estate', li);
      DB.piece(0, 12, 0, 0, 0, 'estate', li);
      const n = tmp.length;
      tmp.forEach((sg, q) => { if (q % 7 === 0) { const b1 = makeBld(TR), b2 = makeBld(TR); sg.sprites.push({ t: 'bld', x: -TR.f(1.42, 1.7), ww: b1.ww, wh: b1.wh, ...b1 }, { t: 'bld', x: TR.f(1.42, 1.7), ww: b2.ww, wh: b2.wh, ...b2 }); } });
      tmp[Math.min(n - 1, (d ? 34 : 0) + 80)].sprites.push({ t: 'sign', x: 1.3, ww: 1100, wh: 1500, bg: '#1F4FA8', fg: '#fff', lines: ['U-TURN ↶', 'Turn around here'] });
      segs.splice(at, 0, ...tmp);
      for (let q = at; q < segs.length; q++) { const sg = segs[q]; sg.i = q; sg.p1.world.z = q * SEG; sg.p2.world.z = (q + 1) * SEG; }
      for (let q = 0; q < 24; q++) { const sg = segs[at + n + q]; if (sg) sg.w = lerp(RT.estate.w, RT[sg.type].w, q / 24); }
      const sh = (v) => v >= at ? v + n : v;
      [S.stops, S.cps, S.juncs, S.fuels].forEach(list => list.forEach(e => { e.i = sh(e.i); }));
      S.jams.forEach(jm => { jm.a = sh(jm.a); jm.b = sh(jm.b); });
      S.endI = sh(S.endI);
      S.cars.forEach(k => { if (k.z >= at * SEG) k.z += n * SEG; });
      S.hawkers.forEach(h => { if (h.z >= at * SEG) h.z += n * SEG; });
      trackLen = segs.length * SEG;
      S.cars = S.cars.filter(k => k.far || k.z < at * SEG || k.z > (at + n) * SEG);
    }

    // ---------- main update ----------
    S.z = 0; S.x = legs[0].type === 'park' ? 0 : RT[legs[0].type].two ? .5 : .33; S.s = 0;
    for (let q = 0; q < 10; q++) spawnCar(PZ + LR.f(15, DRAW * .9) * SEG);
    let last = performance.now(), raf;
    function loop(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now; TIME = now / 1000;
      if (!S.paused && !S.done) update(dt);
      render(); raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    function update(dt) {
      S.t += dt;
      const pz = S.z + PZ, sg = segAt(pz), rt = RT[sg.type], pi = sg.i;
      // steering
      let input = control === 'wheel' ? S.wheelA / 100 : control === 'tilt' && tiltV != null ? tiltV : (S.tap || 0);
      if (keys.ArrowLeft || keys.a) input = -1; if (keys.ArrowRight || keys.d) input = 1;
      if (control === 'wheel' && !S.wheelDrag && S.wheelA) S.wheelA *= Math.pow(.02, dt);
      const whEl = $('#dwheel svg'); if (whEl) whEl.style.transform = `rotate(${S.wheelA}deg)`;
      S.steer += (clamp(input, -1, 1) - S.steer) * Math.min(1, dt * 8);
      const braking = S.brake || keys.ArrowDown || keys.s || keys[' '];
      // speed
      const off = Math.abs(S.x) > 1.02;
      let target = Math.min(V.max, rt.lim * 1.18);
      if (S.boost > 0 && !S.jamNear) target *= 1.3;
      if (off) target = Math.min(target, 28);
      if (!race && S.fuel <= 0) target = 6;
      if (braking) S.s = Math.max(0, S.s - 75 * dt);
      else if (S.s < target) S.s = Math.min(target, S.s + V.acc * dt * (S.s < 30 ? 1.3 : 1));
      else S.s = Math.max(target, S.s - 30 * dt);
      if (S.boost > 0) S.boost -= dt;
      // lateral
      S.x += S.steer * dt * 1.25 * clamp(S.s / 45, .35, 1.2) * (2000 / sg.w);
      S.x -= sg.curve * dt * Math.pow(S.s / 100, 2) * .35;
      if (rt.gutter && Math.abs(S.x) > 1.2 && !sg.cross) { crash('You don enter gutter! 😂 Area boys push you out', true); S.x = Math.sign(S.x) * .9; S.s = 0; }
      else if (rt.kerb === 'rail' && Math.abs(S.x) > 1.03) { crash('You scratch the bridge rail! 😬', S.s > 30); S.x = Math.sign(S.x) * .95; S.s *= .5; }
      S.x = clamp(S.x, -2.2, 2.2);
      if (off && S.s > 20) S.shake = Math.max(S.shake, .08);
      // move
      S.z = Math.min(trackLen - PZ - SEG, S.z + S.s * U * dt);
      const npz = S.z + PZ, ni = Math.floor(npz / SEG);
      S.bgX += sg.curve * S.s * dt * .002;
      // fuel
      if (!race) { S.fuel = Math.max(0, S.fuel - S.s * U * dt / SEG * (100 / (TOTAL * .95)) * V.fuel); if (S.fuel <= 0) once('nofuel' + Math.floor(S.t / 30), () => { msg('Fuel don finish! ⛽ Find filling station or buy jerrycan', 2800); $('#dfill').classList.remove('hidden'); o.beep('no'); }); if (S.fuel < 20 && S.fuel > 0) once('lowfuel', () => msg('Fuel low o! ⛽ Stop at the next filling station', 2400)); }
      if (S.shake > 0) S.shake -= dt; if (S.inv > 0) S.inv -= dt;
      updateCars(dt); updateJams(dt);
      S.jamNear = S.jams.some(j => j.state === 'active' && ni > j.a - 5 && ni < j.b + 5);
      // collisions with traffic
      if (!(S.inv > 0)) for (const k of S.cars) {
        if (k.far || k.gone) continue;
        const dz = k.z - npz, ov2 = Math.abs(k.x - S.x) < ((k.w + V.w) / 2 / segAt(k.z).w) * .85;
        if (!ov2) continue;
        if (k.dir > 0 && dz > 0 && dz < 320 && S.s > k.s) { const hit = S.s - k.s; S.s = k.s * .9; S.z = k.z - 330 - PZ; if (hit > 22) crash(LR.pick(CRASH)); else if (hit > 6) msg('Small kiss 😬 Mind the bumper', 1200); break; }
        if (k.dir < 0 && Math.abs(dz) < 320) { k.gone = true; crash('Head-on! 😱 Stay for your own lane o', true); S.s = 0; S.x = clamp(S.x + .5, -1, 1); break; }
      }
      // collisions with road objects
      for (const q of [segs[ni], segs[ni + 1]]) if (q) for (const s of q.sprites) if (s.hit && !s.done && Math.abs(s.x - S.x) < ((s.ww + V.w) / 2 / q.w) * .8) {
        s.done = true;
        if (s.hit === 'hole') { S.s *= .55; S.shake = .4; msg(LR.pick(['Pothole! 🕳️ Naija roads 😩', 'Ah! Pothole don shake your engine 😩', 'Who dig this hole?! 🕳️']), 1500); o.beep('no'); vib(80); }
        else { s.down = true; crash(s.t === 'wreck' ? 'You jam the broken-down truck! 😱 See the leaves na, na warning' : 'You knock the drum! 😬'); }
      }
      // junctions
      for (const j of S.juncs) {
        if (j.done) continue;
        const dist = j.i - ni;
        if (dist <= 0) {
          j.done = true;
          if (j.light && lightState(j) === 'r' && S.s > 12) fine('lastma', cityKey === 'Lagos' ? 'LASTMA caught you beating red light!' : 'Traffic warden caught you beating red light!');
          const ch = S.ind || (S.x < -.4 ? 'L' : S.x > .4 ? 'R' : 'S'); S.ind = null; ov.querySelectorAll('[data-ind]').forEach(b => b.classList.remove('on'));
          if (ch === j.turn) { banner(`${j.turn === 'L' ? '⬅' : '➡'} ${j.next}`); o.beep('ok'); } else wrongTurn(j, ch);
        }
        break;
      }
      // checkpoints
      for (const cp of S.cps) {
        if (cp.done) continue;
        const dist = cp.i - ni;
        if (dist < 90 && !cp.warned) { cp.warned = true; banner(`${CHECK[cp.kind].em} ${CHECK[cp.kind].who.toUpperCase()} AHEAD`); }
        if (dist <= 14 && cp.kind !== 'radar') cp.minS = Math.min(cp.minS ?? 999, S.s);
        if (dist <= 0 || (cp.kind !== 'radar' && dist <= 8 && S.s < 3)) checkpoint(cp);
        break;
      }
      // bus stops
      for (const st of S.stops) {
        if (st.done || st.passed) continue;
        const dist = st.i - ni;
        if (dist < -3) { st.passed = true; st.friends.filter(fr => !fr.taken).forEach(fr => msg(`You passed ${fr.n}! 😩 They go wait for your next trip`, 2400)); break; }
        const zone = dist <= 7 && dist >= -3, slow = S.s < 7, right = S.x > (rt.two ? .2 : .3);
        if (zone && slow && right && !race) { S.board += dt; if (S.board > .9) { S.board = 0; boardStop(st); } } else S.board = 0;
        break;
      }
      // filling stations
      for (const fs of S.fuels) { if (fs.done) continue; const dist = fs.i - ni; if (dist < -3) { fs.done = true; continue; } if (dist <= 7 && S.s < 7 && S.x > .3) refuel(fs); break; }
      // HUD
      if (S.t - S.lastHud > .12) hud(ni, rt);
      if (race && S.t - (S.lastRep || 0) > .8) { S.lastRep = S.t; o.race.report(Math.min(1, ni / S.endI), S.crashes).then(v => { if (!v || !v.players) return; $('#dghosts').innerHTML = v.players.filter(p => !p.me).map(p => `<span class="dghost" style="left:${Math.min(100, p.progress * 100)}%">${p.done ? '🏁' : '🚘'}<em>${p.n.slice(0, 8)}</em></span>`).join(''); }).catch(() => {}); }
      if (ni >= S.endI) finish(false);
    }
    function crash(t, big) { if (S.inv > 0) return; S.crashes++; S.shake = .6; S.inv = 1.2; S.s *= big ? 0 : .25; msg(t, 2000); o.beep('no'); vib([60, 40, 60]); }
    function hud(ni, rt) {
      S.lastHud = S.t;
      const leg = legs[segs[ni].leg];
      $('#droad').textContent = `${RT[leg.type].icon} ${leg.name}`;
      $('#dspd').textContent = Math.round(S.s);
      const lim = $('#dlim'); lim.textContent = rt.lim; lim.classList.toggle('over', S.s > rt.lim + 5);
      if (!race) { $('#dfuel b').textContent = Math.round(S.fuel); $('#dfuel').classList.toggle('low', S.fuel < 20); $('#dpax b').textContent = `${S.pax}/${V.cap}`; }
      const frac = clamp(ni / S.endI, 0, 1); $('#dpb').style.width = frac * 100 + '%'; $('#dme').style.left = frac * 100 + '%';
      // next instruction
      const j = S.juncs.find(x => !x.done), cp = S.cps.find(x => !x.done), st = S.stops.find(x => !x.done && !x.passed), fs = S.fuels.find(x => !x.done);
      let next = '', hint = '';
      const m = (d) => d > 40 ? `${Math.round(d * 5 / 50) * 50} m` : 'now';
      if (j && j.i - ni < 160) {
        next = `${j.turn === 'L' ? '⬅ Turn LEFT' : '➡ Turn RIGHT'} in ${m(j.i - ni)} → ${j.next}`;
        $('#dturn').classList.remove('hidden'); $('#dturnt').innerHTML = `<b>${j.turn === 'L' ? '⬅ LEFT' : 'RIGHT ➡'}</b><small>${j.next}</small>`;
        ov.querySelectorAll('[data-ind]').forEach(b => b.classList.toggle('want', b.dataset.ind === j.turn));
        if (j.light && j.i - ni < 30) { const ls = lightState(j); hint = ls === 'r' ? '🔴 Red light: brake and wait' : ls === 'a' ? '🟡 Amber: get ready to stop' : ''; }
      } else $('#dturn').classList.add('hidden');
      if (!next && cp && cp.i - ni < 120) next = `${CHECK[cp.kind].em} ${CHECK[cp.kind].who} in ${m(cp.i - ni)} · ${cp.kind === 'radar' ? `stay under ${RT[segs[cp.i].type].lim}` : 'slow down'}`;
      if (!next && st && st.i - ni < 260) next = `🚏 ${st.name} bus stop in ${m(st.i - ni)}${st.friends.some(f => !f.taken) ? ` · 🙋🏾 ${st.friends.filter(f => !f.taken).map(f => f.n).join(', ')} dey wait` : ''}`;
      if (!next && fs && fs.i - ni < 200 && S.fuel < 70) next = `⛽ Filling station in ${m(fs.i - ni)} · keep right and stop`;
      if (!next) { const nj = S.juncs.find(x => !x.done); next = leg.detour ? 'Wrong road 😩 Find the U-turn' : leg.sub ? leg.sub : nj ? `Next: ${nj.next}` : `Heading to ${o.to.name}`; }
      $('#dnext').textContent = next;
      if (!hint && st && st.i - ni <= 12 && st.i - ni >= -3 && !race) hint = S.board > 0 ? '⏳ Boarding… hold still' : st.friends.some(f => !f.taken) ? '🛑 Keep right and brake to pick up your friend' : (st.n > 0 && S.pax < V.cap ? '🛑 Keep right and brake to carry passengers' : '');
      if (!hint && fs && fs.i - ni <= 12 && fs.i - ni >= -3 && S.fuel < 90) hint = '⛽ Keep right and brake to buy fuel';
      if (!hint && cp && cp.i - ni < 40 && cp.kind !== 'radar') hint = (cp.minS ?? S.s) > 15 ? `🛑 Brake! ${CHECK[cp.kind].who} dey flag you down` : '👍🏾 Good, roll slowly to the officer';
      if (!hint && S.jamNear) hint = '🐢 Go-slow · tap the hawkers to buy';
      const he = $('#dhint'); he.textContent = hint; he.classList.toggle('hidden', !hint);
    }

    // ---------- render ----------
    function project(p, camX, camY, camZ, w) {
      p.camera.x = -camX; p.camera.y = p.world.y - camY; p.camera.z = p.world.z - camZ;
      const sc = p.screen.scale = DEPTH / p.camera.z;
      p.screen.x = W / 2 + sc * p.camera.x * F; p.screen.y = HY - sc * p.camera.y * F; p.screen.w = sc * w * F;
    }
    const quad = (col, x1, y1, w1a, w1b, x2, y2, w2a, w2b) => poly(col, [x1 + w1a, y1, x1 + w1b, y1, x2 + w2b, y2, x2 + w2a, y2]);
    function drawSeg(sg) {
      const rt = RT[sg.type], a = (sg.i >> 2) & 1, x1 = sg.p1.screen.x, y1 = sg.p1.screen.y, w1 = sg.p1.screen.w, x2 = sg.p2.screen.x, y2 = sg.p2.screen.y, w2 = sg.p2.screen.w;
      rect(0, y2, W, y1 - y2 + 1, C[rt.g][a]);
      if (rt.g === 'water' && (sg.i % 9 === 0)) rect(0, y2, W, Math.max(1, (y1 - y2) * .4), N ? 'rgba(255,220,150,.12)' : 'rgba(255,255,255,.12)');
      if (sg.cross) rect(0, y2, W, y1 - y2 + 1, C.road[a]);
      else {
        if (rt.div) quad(C.opp, x1, y1, -w1 * 2.4, -w1 * 1.12, x2, y2, -w2 * 2.4, -w2 * 1.12);
        if (rt.urban) { quad(C.walk[a], x1, y1, w1, w1 * 1.34, x2, y2, w2, w2 * 1.34); if (!rt.div) quad(C.walk[a], x1, y1, -w1 * 1.34, -w1, x2, y2, -w2 * 1.34, -w2); }
        if (rt.gutter) { quad(C.gutter, x1, y1, w1 * 1.17, w1 * 1.25, x2, y2, w2 * 1.17, w2 * 1.25); if (!rt.div) quad(C.gutter, x1, y1, -w1 * 1.25, -w1 * 1.17, x2, y2, -w2 * 1.25, -w2 * 1.17); }
        if (sg.layby) quad(C.road[a], x1, y1, w1, w1 * 1.32, x2, y2, w2, w2 * 1.32);
        if (rt.kerb) { const kc = C[rt.kerb][sg.i % 2]; if (!sg.layby) quad(kc, x1, y1, w1, w1 * 1.06, x2, y2, w2, w2 * 1.06); quad(rt.div ? C.rail[sg.i % 2] : kc, x1, y1, -w1 * (rt.div ? 1.12 : 1.06), -w1, x2, y2, -w2 * (rt.div ? 1.12 : 1.06), -w2); if (rt.div && rt.kerb === 'yb') quad(C.yb[sg.i % 2], x1, y1, -w1 * 1.12, -w1 * 1.09, x2, y2, -w2 * 1.12, -w2 * 1.09); }
      }
      quad(sg.lit ? C.lit[a] : C.road[a], x1, y1, -w1, w1, x2, y2, -w2, w2);
      if (!sg.cross) {
        const l1 = Math.max(1, w1 / 50), l2 = Math.max(1, w2 / 50);
        if (rt.two) { if (a) quad(C.line, x1, y1, -l1 / 2, l1 / 2, x2, y2, -l2 / 2, l2 / 2); if (sg.type === 'highway') { quad(C.line, x1, y1, w1 * .95, w1 * .95 + l1, x2, y2, w2 * .95, w2 * .95 + l2); quad(C.line, x1, y1, -w1 * .95 - l1, -w1 * .95, x2, y2, -w2 * .95 - l2, -w2 * .95); } }
        else if (rt.lanes > 1) {
          if (a) for (let k = 1; k < rt.lanes; k++) { const lx1 = -w1 + 2 * w1 * k / rt.lanes, lx2 = -w2 + 2 * w2 * k / rt.lanes; quad(C.line, x1, y1, lx1 - l1 / 2, lx1 + l1 / 2, x2, y2, lx2 - l2 / 2, lx2 + l2 / 2); }
          quad(C.yline, x1, y1, -w1 * .97, -w1 * .97 + l1, x2, y2, -w2 * .97, -w2 * .97 + l2);
          if (!sg.layby) quad(C.line, x1, y1, w1 * .97 - l1, w1 * .97, x2, y2, w2 * .97 - l2, w2 * .97);
        }
      }
      if (sg.zebra) for (let k = 0; k < 14; k += 2) quad(C.line, x1, y1, -w1 + 2 * w1 * k / 14, -w1 + 2 * w1 * (k + 1) / 14, x2, y2, -w2 + 2 * w2 * k / 14, -w2 + 2 * w2 * (k + 1) / 14);
    }
    function background(kind) {
      c.fillStyle = skyG; c.fillRect(0, 0, W, HY + 2);
      if (N) { for (const [sx, sy, r] of stars) circ(((sx * W - S.bgX * 20) % W + W) % W, sy * HY, r, 'rgba(255,255,255,.8)'); circ(W * .8, HY * .25, Math.min(W, H) * .035, '#FFF4D6'); }
      else if (phase === 'dusk') circ(W * .75, HY * .82, Math.min(W, H) * .06, '#FFB25C');
      else circ(W * .82, HY * .25, Math.min(W, H) * .045, '#FFF6D0');
      const off = S.bgX * 60;
      if (kind === 'country') {
        c.fillStyle = N ? '#0f2114' : '#3E6E3A'; c.beginPath(); c.moveTo(0, HY); for (let x = 0; x <= W; x += 20) c.lineTo(x, HY - 18 - Math.sin((x + off) * .006) * 16 - Math.sin((x + off) * .017) * 7); c.lineTo(W, HY); c.fill();
        c.fillStyle = N ? '#0b1a10' : '#2F5A2C'; c.beginPath(); c.moveTo(0, HY); for (let x = 0; x <= W; x += 16) c.lineTo(x, HY - 6 - Math.abs(Math.sin((x + off * 1.6) * .011)) * 12); c.lineTo(W, HY); c.fill();
      } else {
        let x = -((off % 1600) + 1600) % 1600 * .5;
        const sc = Math.min(1.4, H / 400);
        for (let k = 0; x < W; k++) { const b = skyline[k % skyline.length], bw = b.w * sc, bh = b.h * sc * (kind === 'lagoon' ? 1.3 : .8); rect(x, HY - bh, bw - 2, bh, N ? '#141A3A' : phase === 'dusk' ? '#4A3F6B' : '#8DA3C7'); if (N && bw > 10) for (let wy = HY - bh + 5; wy < HY - 4; wy += 7) for (let wx = x + 3; wx < x + bw - 5; wx += 6) if (((wx * 7 + wy * 13) | 0) % 5 < b.win * 3) rect(wx, wy, 2, 3, '#FFD97A'); x += bw; }
      }
    }
    function render() {
      c = ctx;
      c.save();
      if (S.shake > 0 && !reduced()) c.translate((Math.random() - .5) * 8, (Math.random() - .5) * 6);
      const base = segAt(S.z), bp = (S.z % SEG) / SEG, psg = segAt(S.z + PZ), pp = ((S.z + PZ) % SEG) / SEG;
      const py = lerp(psg.p1.world.y, psg.p2.world.y, pp), camY = py + CAM_H, camX = S.x * psg.w;
      background(psg.type === 'highway' ? 'country' : psg.type === 'bridge' ? 'lagoon' : 'city');
      rect(0, HY, W, H - HY, C[RT[psg.type].g][0]);
      let maxy = H, x = 0, dx = -(base.curve * bp);
      const drawn = [];
      for (let n = 0; n < DRAW; n++) {
        const sg = segs[base.i + n]; if (!sg) break;
        sg.clip = maxy;
        project(sg.p1, camX - x, camY, S.z, sg.w); project(sg.p2, camX - x - dx, camY, S.z, sg.w);
        x += dx; dx += sg.curve;
        drawn.push(sg);
        if (sg.p1.camera.z <= DEPTH || sg.p2.screen.y >= sg.p1.screen.y || sg.p2.screen.y >= maxy) continue;
        drawSeg(sg);
        maxy = sg.p2.screen.y;
      }
      // bucket cars & hawkers
      const bucket = new Map();
      for (const k of S.cars) { const i = Math.floor(k.z / SEG); if (!bucket.has(i)) bucket.set(i, []); bucket.get(i).push(k); }
      for (const h of S.hawkers) { h.rect = null; const i = Math.floor(h.z / SEG); if (!bucket.has(i)) bucket.set(i, []); bucket.get(i).push(h); }
      for (let n = drawn.length - 1; n > 0; n--) {
        const sg = drawn[n]; if (sg.p1.camera.z <= DEPTH) continue;
        const sc = sg.p1.screen.scale, k = sc * F, clipY = sg.clip;
        const needClip = sg.p1.screen.y > clipY;
        if (needClip) { c.save(); c.beginPath(); c.rect(0, 0, W, clipY); c.clip(); }
        for (const s of sg.sprites) {
          if (s.span) { SPAN[s.t](sg.p1.screen.x, sg.p1.screen.y, sg.p1.screen.w, k, s, sg); continue; }
          const w = s.ww * k, h = s.wh * k; if (w < 1.5 && h < 3) continue;
          const sx = sg.p1.screen.x + sc * s.x * sg.w * F, left = s.c ? sx - w / 2 : s.x < 0 ? sx - w : sx, by = sg.p1.screen.y;
          if (by - h > clipY) continue;
          PAINT[s.t](left, by, w, h, s);
        }
        const list = bucket.get(sg.i);
        if (list) for (const e of list) {
          const pct = (e.z % SEG) / SEG, s2 = lerp(sg.p1.screen.scale, sg.p2.screen.scale, pct), ex = lerp(sg.p1.screen.x, sg.p2.screen.x, pct) + s2 * e.x * sg.w * F, ey = lerp(sg.p1.screen.y, sg.p2.screen.y, pct);
          if (e.item) { const h = 640 * s2 * F; person(ex, ey + Math.sin(e.bob) * 1.5, h, { top: { water: '#2980B9', gala: '#D35400', chips: '#16A085', bread: '#8E44AD' }[e.item], bot: '#333', skin: SKIN[1], head: 'gele', hc: '#F2C200', tray: ITEMS[e.item][0] }); if (!e.sold && !e.leaving && h > 30) { rrect(ex - h * .4, ey - h * 1.5, h * .8, h * .22, 8, '#fff'); fit(`${ITEMS[e.item][2]}🪙 tap`, ex, ey - h * 1.39, h * .75, h * .14, '#121A3A'); } else if (e.sold) text('✅', ex + h * .3, ey - h * .9, h * .2, '#000', 400); e.rect = [ex - h * .5, ey - h * 1.55, h, h * 1.6]; continue; }
          veh(e.t, ex, ey, e.w * s2 * F, { onc: e.dir < 0, col: e.col, rack: e.rack, cond: e.cond, sticker: e.sticker, shirt: e.shirt, pass: e.pass, helmet: e.helmet, brake: e.brake });
        }
        if (needClip) c.restore();
      }
      // player
      const pw = V.w * F / CAM_H * .92, bounce = S.s > 2 ? Math.sin(S.t * 18) * Math.min(2, S.s / 40) : 0;
      if (!(S.inv > 0 && Math.floor(S.t * 12) % 2)) {
        c.save(); c.translate(W / 2, HY + F - 2 + bounce); c.rotate(S.steer * .04);
        veh(V.draw, 0, 0, pw, { col: '#E8EDF5', rack: o.vehicle === 'danfo', cond: false, sticker: 'NO KING AS GOD', shirt: '#F5B83D', helmet: S.gear, pass: S.pax > 0, brake: S.brake || keys.ArrowDown || keys[' '] });
        c.restore();
      }
      if (S.boost > 0 && !S.jamNear) text('🔥', W / 2, HY + F + 10, 20, '#000', 400);
      if (N) { const g = c.createRadialGradient(W / 2, HY + F * .6, F * .2, W / 2, HY + F * .6, Math.max(W, H) * .8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,20,.45)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
      c.restore();
    }

    // ---------- finish ----------
    function cleanup() {
      cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('deviceorientation', onTilt); document.removeEventListener('visibilitychange', onVis);
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch {}
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
      ov.remove(); document.body.style.overflow = '';
    }
    async function finish(quit) {
      if (S.done) return; S.done = true;
      const secs = Math.round(S.t);
      if (race) { const exact = Math.round(S.t * 10) / 10; let v = null; try { v = await o.race.done(quit ? 600 : exact, S.crashes); } catch {} cleanup(); return resolve({ secs: exact, crashes: S.crashes, view: v }); }
      const stars = quit ? 0 : S.crashes === 0 && S.fines === 0 ? 3 : S.crashes <= 2 ? 2 : 1;
      let bonus = 0;
      try { const r = await o.api('/api/trip/drive-end', { picked: 0, fares: quit ? 0 : S.fares, checks: quit ? 0 : S.checks, crashes: S.crashes, secs, stars, quit: !!quit }); bonus = r.bonus; o.onCoins(r.coins); } catch {}
      if (!quit) {
        const card = document.createElement('div'); card.className = 'd-start';
        card.innerHTML = `<div class="d-card"><div class="d-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><h2>You don reach ${o.to.name}! 🎉</h2>
          <p>${S.crashes === 0 && !S.fines ? 'Clean driving, no scratch, no wahala with any officer 😎' : S.crashes <= 2 ? `${S.crashes} small bash${S.crashes === 1 ? '' : 'es'}${S.fines ? ` and ${S.fines} fine${S.fines > 1 ? 's' : ''}` : ''}. Still a correct driver 👍🏾` : `${S.crashes} crashes 😂 Your mechanic is smiling`}</p>
          <div class="d-sum"><span>🧍 Passengers <b>${S.fares}</b></span>${S.friends ? `<span>🙋🏾 Friends <b>${S.friends}</b></span>` : ''}<span>👮🏾 Checks <b>${S.checks}</b></span>${S.fines ? `<span>🚨 Fines <b>${S.fines}</b></span>` : ''}<span>⏱️ <b>${secs}s</b></span><span>🎁 Bonus <b>+${bonus}</b></span></div>
          <button class="btn btn-gold" id="dend">See ${o.to.name} →</button></div>`;
        ov.appendChild(card); o.beep('win');
        await new Promise(res => card.querySelector('#dend').onclick = res);
      }
      cleanup();
      resolve({ fares: S.fares, checks: S.checks, fines: S.fines, friends: S.friends, crashes: S.crashes, stars, secs, bonus });
    }
  });
}
window.NaijaDrive = { start, _debug: () => window.__nd };
})();
