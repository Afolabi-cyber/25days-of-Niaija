/* Journey Home 3D: drive one real Nigerian highway leg in low-poly 3D (Three.js).
   startLeg(o) -> Promise<{ secs, crashes, fines, quit }>
   o: { from:{name,state,lat}, to:{name,state,lat}, road, km, leg, legs, seed, vehicle, garage:{colHex,plate},
        sound, coach, api, beep, toast, onCoins } */
import * as THREE from './vendor/three.module.min.js';

const SEG = 4;                       // metres between road samples
const LANES = { fast: 2.8, slow: 6.4 }; // Nigeria drives on the right; the fast lane is beside the median
const SLOGAN = { Lagos: 'Centre of Excellence', Ogun: 'Gateway State', Oyo: 'Pace Setter State', Ondo: 'Sunshine State', Edo: 'Heartbeat of the Nation', Delta: 'The Big Heart',
  Anambra: 'Light of the Nation', Enugu: 'Coal City State', Imo: 'Eastern Heartland', Abia: "God's Own State", Rivers: 'Treasure Base of the Nation', 'Akwa Ibom': 'Land of Promise',
  'Cross River': "The People's Paradise", Osun: 'State of the Living Spring', Kwara: 'State of Harmony', Kogi: 'Confluence State', FCT: 'Centre of Unity', Kaduna: 'Centre of Learning',
  Kano: 'Centre of Commerce', Nasarawa: 'Home of Solid Minerals', Plateau: 'Home of Peace and Tourism' };
const SHOPS = ['MAMA NKECHI PROVISIONS', 'BLESSED HANDS SALON', "GOD'S TIME CHEMIST", 'ALHAJI SANI & SONS', 'IYA BASIRAT BUKA', 'NO WAHALA SPARE PARTS', 'VULCANIZER', 'POS · CASH OUT HERE',
  'AMALA SPOT', 'SUYA JOINT', 'PURE WATER DEPOT', 'JESUS IS LORD BAKERY', 'CHRIST GLORY ASSEMBLY', 'MERCY TAILORING', 'EXCEL GSM REPAIRS', 'CHOPS & DRINKS'];
const BOARDS = [['SPEED THRILLS BUT KILLS', 'Arrive alive · Road Safety', '#1F4FA8', '#fff'], ['DETTY DECEMBER', 'Drive safe, enjoy well 🎄', '#D7263D', '#fff'], ['WELCOME HOME IJGB', 'Your people dey wait 🇳🇬', '#155C45', '#fff'],
  ['MERRY CHRISTMAS', 'Compliments of the season', '#0F3A2D', '#F5B83D'], ['JOLLOF FESTIVAL', '26 Dec · Free entry', '#F2C200', '#121A3A'], ['DON\'T DRINK AND DRIVE', 'This Christmas, arrive alive', '#C0392B', '#fff'], ['CROSSOVER NIGHT', '31 Dec · Come with family', '#121A3A', '#F5B83D']];
const HAWK = [['water', '💧', 'Pure water', 5], ['gala', '🌭', 'Gala', 10], ['chinchin', '🥨', 'Chin chin', 15], ['puff', '🍩', 'Puff-puff', 10], ['chicken', '🍗', 'Christmas chicken', 80], ['tree', '🎄', 'Mini Christmas tree', 50]];

function rng(seed) { let a = seed >>> 0 || 1; const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.f = (a1, b1) => a1 + r() * (b1 - a1); r.i = (a1, b1) => Math.floor(r.f(a1, b1 + 1)); r.pick = (arr) => arr[Math.floor(r() * arr.length)]; r.chance = (p) => r() < p; return r; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- geometry helpers: everything is merged into vertex-coloured meshes to keep draw calls low ----------
function part(geo, color, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z);
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
function merge(parts) {
  let n = 0; parts.forEach(p => { n += p.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  parts.forEach(p => { pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); col.set(p.attributes.color.array, o * 3); o += p.attributes.position.count; p.dispose(); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere(); return g;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function fitText(x, text, cx, cy, maxW, size, color, weight = 800) { let s = size; x.font = `${weight} ${s}px "Bricolage Grotesque", system-ui, sans-serif`; while (x.measureText(text).width > maxW && s > 8) { s -= 2; x.font = `${weight} ${s}px "Bricolage Grotesque", system-ui, sans-serif`; } x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, cx, cy); }

// ---------- vehicles (local +z is forward) ----------
function wheels(list, r, w, xs, zs) { xs.forEach(x => zs.forEach(z => list.push(part(C(r, r, w, 10), '#151515', x, r, z, 0, 0, Math.PI / 2)))); }
function vehicleGeo(type, color) {
  const p = [], L = [];
  if (type === 'car' || type === 'ride') {
    p.push(part(B(1.84, .62, 4.3), color, 0, .62, 0)); p.push(part(B(1.62, .58, 2.2), color, 0, 1.2, -.25));
    p.push(part(B(1.66, .46, 2.0), '#1d2733', 0, 1.2, -.25)); p.push(part(B(1.86, .2, .2), '#222', 0, .45, 2.15)); p.push(part(B(1.86, .2, .2), '#222', 0, .45, -2.15));
    wheels(p, .36, .26, [-.86, .86], [-1.35, 1.35]);
    L.push(part(B(.38, .14, .06), '#ff2a2a', -.66, .78, -2.17)); L.push(part(B(.38, .14, .06), '#ff2a2a', .66, .78, -2.17));
    L.push(part(B(.36, .14, .06), '#fff7d6', -.64, .74, 2.17)); L.push(part(B(.36, .14, .06), '#fff7d6', .64, .74, 2.17));
  } else if (type === 'danfo') {
    p.push(part(B(2.0, 1.55, 4.9), '#F2B705', 0, 1.18, 0)); p.push(part(B(2.02, .14, 4.92), '#151515', 0, .92, 0)); p.push(part(B(2.02, .14, 4.92), '#151515', 0, 1.3, 0));
    p.push(part(B(2.03, .5, 3.4), '#1d2733', 0, 1.62, -.4)); p.push(part(B(1.8, .5, .1), '#1d2733', 0, 1.6, 2.46)); p.push(part(B(1.7, .12, 3.6), '#5a5a5a', 0, 2.02, -.3));
    p.push(part(B(.5, .4, .7), '#8B5A2B', -.3, 2.28, -.6)); p.push(part(B(.6, .3, .6), '#2B59C3', .4, 2.24, .4));
    wheels(p, .38, .3, [-.92, .92], [-1.6, 1.6]);
    L.push(part(B(.3, .2, .06), '#ff2a2a', -.8, .8, -2.47)); L.push(part(B(.3, .2, .06), '#ff2a2a', .8, .8, -2.47)); L.push(part(B(.3, .16, .06), '#fff7d6', -.75, .8, 2.47)); L.push(part(B(.3, .16, .06), '#fff7d6', .75, .8, 2.47));
  } else if (type === 'trailer' || type === 'tanker') {
    p.push(part(B(2.4, 2.2, 2.4), color, 0, 1.75, 4.6)); p.push(part(B(2.3, .7, .1), '#1d2733', 0, 2.3, 5.82));
    if (type === 'tanker') { p.push(part(C(1.25, 1.25, 8.6, 12), '#E8E8E8', 0, 2.2, -.9, 0, Math.PI / 2)); p.push(part(B(2.6, .2, 8.6), '#E5483C', 0, 1.0, -.9)); }
    else p.push(part(B(2.5, 2.7, 9.6), color === '#C0392B' ? '#2E86C1' : '#7a7f86', 0, 2.25, -1.3));
    wheels(p, .5, .4, [-1.1, 1.1], [4.4, -1.5, -3.2, -4.6]);
    L.push(part(B(.3, .2, .06), '#ff2a2a', -1.0, .9, -6.12)); L.push(part(B(.3, .2, .06), '#ff2a2a', 1.0, .9, -6.12)); L.push(part(B(.34, .2, .06), '#fff7d6', -.9, 1.1, 5.82)); L.push(part(B(.34, .2, .06), '#fff7d6', .9, 1.1, 5.82));
  } else if (type === 'bus') {
    p.push(part(B(2.5, 2.6, 11), color, 0, 1.75, 0)); p.push(part(B(2.52, .8, 9.6), '#1d2733', 0, 2.3, -.3)); p.push(part(B(2.52, .25, 11), '#F5B83D', 0, 1.1, 0));
    wheels(p, .5, .34, [-1.08, 1.08], [-3.6, 3.6]);
    L.push(part(B(.34, .3, .06), '#ff2a2a', -1.0, 1.0, -5.52)); L.push(part(B(.34, .3, .06), '#ff2a2a', 1.0, 1.0, -5.52)); L.push(part(B(.36, .2, .06), '#fff7d6', -.9, .9, 5.52)); L.push(part(B(.36, .2, .06), '#fff7d6', .9, .9, 5.52));
  } else if (type === 'keke') {
    p.push(part(B(1.3, .9, 2.3), '#F2C200', 0, .85, 0)); p.push(part(B(1.36, .1, 2.0), '#1E8449', 0, 1.95, -.15)); p.push(part(B(.08, 1.0, .08), '#222', -.6, 1.45, .7)); p.push(part(B(.08, 1.0, .08), '#222', .6, 1.45, .7));
    p.push(part(B(.08, 1.0, .08), '#222', -.6, 1.45, -1.0)); p.push(part(B(.08, 1.0, .08), '#222', .6, 1.45, -1.0)); p.push(part(B(1.2, .6, .1), '#1d2733', 0, 1.5, .78));
    wheels(p, .28, .18, [-.55, .55], [-.8]); wheels(p, .28, .18, [0], [.95]);
    L.push(part(B(.25, .14, .06), '#ff2a2a', -.5, .7, -1.17)); L.push(part(B(.25, .14, .06), '#ff2a2a', .5, .7, -1.17)); L.push(part(B(.26, .18, .06), '#fff7d6', 0, 1.1, 1.17));
  } else { // okada
    p.push(part(B(.34, .55, 1.9), color, 0, .7, 0)); p.push(part(B(.5, .14, .8), '#111', 0, 1.02, -.25)); wheels(p, .32, .14, [0], [-.7, .75]);
    p.push(part(B(.5, .65, .36), '#1E5FA8', 0, 1.42, -.15)); p.push(part(new THREE.SphereGeometry(.2, 8, 6), '#C0392B', 0, 1.92, -.1)); p.push(part(B(.12, .4, .5), '#1E5FA8', -.28, 1.2, .2)); p.push(part(B(.12, .4, .5), '#1E5FA8', .28, 1.2, .2));
    L.push(part(B(.18, .1, .06), '#ff2a2a', 0, .9, -.97)); L.push(part(B(.22, .18, .06), '#fff7d6', 0, 1.0, .97));
  }
  return { body: merge(p), lights: merge(L) };
}
const GEO_CACHE = new Map();
function makeVehicle(type, color, mats) {
  const k = type + color; if (!GEO_CACHE.has(k)) GEO_CACHE.set(k, vehicleGeo(type, color));
  const g = GEO_CACHE.get(k), grp = new THREE.Group();
  grp.add(new THREE.Mesh(g.body, mats.vc)); grp.add(new THREE.Mesh(g.lights, mats.glow)); return grp;
}
const VDIM = { car: [1.9, 4.4], ride: [1.9, 4.4], danfo: [2.0, 5.0], trailer: [2.5, 12.2], tanker: [2.5, 12.2], bus: [2.5, 11], keke: [1.35, 2.4], okada: [.6, 2.0] };

export function startLeg(o) {
  return new Promise((resolve) => {
    const R = rng(o.seed || 1);
    const north = Math.max(o.from.lat || 0, o.to.lat || 0) > 8.3, bridgeLeg = /Niger Bridge/.test(o.road || '');
    const hour = new Date(Date.now() + 3600000).getUTCHours(), night = o.night != null ? o.night : (hour >= 19 || hour < 6);
    const haze = !night && (hour < 11 || north);
    const L = Math.round(clamp((o.km || 60) * 26, 1500, 3400)), N = Math.ceil((L + 700) / SEG);
    const playerType = o.vehicle === 'danfo' ? 'danfo' : o.vehicle === 'keke' ? 'keke' : o.vehicle === 'okada' ? 'okada' : 'car';
    const VMAX = { car: 36, danfo: 30, keke: 19, okada: 27 }[playerType];

    // ---------- the road: gentle curves and hills, a bridge if this is the Niger Bridge leg ----------
    const PX = new Float32Array(N), PZ = new Float32Array(N), PY = new Float32Array(N), PH = new Float32Array(N), CU = new Float32Array(N);
    const bz0 = bridgeLeg ? Math.round(L * .22) : -1, bz1 = bridgeLeg ? Math.round(L * .8) : -1;
    const ph = [R.f(0, 6), R.f(0, 6), R.f(0, 6)], amp = north ? .55 : 1;
    let h = 0, x = 0, z = 0;
    for (let i = 0; i < N; i++) {
      const s = i * SEG, inB = bridgeLeg && s > bz0 - 60 && s < bz1 + 60, nearEnd = s > L - 260 || s < 200;
      let cu = (Math.sin(s / 310 + ph[0]) * .0032 + Math.sin(s / 140 + ph[1]) * .0016) * amp; if (inB || nearEnd) cu *= .15;
      CU[i] = cu; h += cu * SEG; PH[i] = h; PX[i] = x; PZ[i] = z;
      let y = (Math.sin(s / 260 + ph[2]) * 4 + Math.sin(s / 97) * 1.2) * (north ? 1.3 : .8);
      if (bridgeLeg) { const up = clamp((s - (bz0 - 120)) / 120, 0, 1) * clamp(((bz1 + 120) - s) / 120, 0, 1); y = lerp(y, 9, up); }
      PY[i] = y; x += Math.sin(h) * SEG; z += Math.cos(h) * SEG;
    }
    const at = (s) => { const f = clamp(s / SEG, 0, N - 1.001), i = Math.floor(f), t = f - i; return { x: lerp(PX[i], PX[i + 1], t), z: lerp(PZ[i], PZ[i + 1], t), y: lerp(PY[i], PY[i + 1], t), h: lerp(PH[i], PH[i + 1], t), cu: CU[i] }; };
    const world = (s, lat, up = 0) => { const p = at(s); return new THREE.Vector3(p.x - Math.cos(p.h) * lat, p.y + up, p.z + Math.sin(p.h) * lat); };
    const isBridge = (s) => bridgeLeg && s > bz0 && s < bz1;

    // ---------- three.js setup ----------
    const ov = document.createElement('div'); ov.className = 'j3d'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    ov.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const skyTop = night ? '#050a22' : haze ? '#cdb991' : '#3f97df', skyBot = night ? '#1a2456' : haze ? '#e9dcc0' : '#cfeafa';
    scene.background = tex(2, 256, (x2, w, hh) => { const g = x2.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, skyTop); g.addColorStop(1, skyBot); x2.fillStyle = g; x2.fillRect(0, 0, w, hh); });
    scene.fog = new THREE.Fog(skyBot, haze ? 25 : 70, haze ? 230 : night ? 300 : 460);
    const cam = new THREE.PerspectiveCamera(62, 1, .3, 900);
    scene.add(new THREE.HemisphereLight(night ? '#5a6fa8' : '#ffffff', night ? '#1a2028' : '#6b5a3a', night ? .9 : 1.05));
    const sun = new THREE.DirectionalLight(night ? '#9fb3ff' : '#fff3dc', night ? .35 : 1.6); sun.position.set(60, 120, 40); scene.add(sun);
    const mats = { vc: new THREE.MeshLambertMaterial({ vertexColors: true }), glow: new THREE.MeshBasicMaterial({ vertexColors: true }) };
    if (night) { const stars = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 400; i++) { const a = Math.random() * 6.283, e = Math.random() * .6 + .15; sp.push(Math.cos(a) * 600 * Math.cos(e), Math.sin(e) * 600, Math.sin(a) * 600 * Math.cos(e)); } stars.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); const st = new THREE.Points(stars, new THREE.PointsMaterial({ color: '#fff', size: 1.4, fog: false, sizeAttenuation: false })); scene.add(st); ov.__stars = st; }

    // road, verges, median wall
    const roadTex = tex(512, 512, (x2, w, hh) => {
      x2.fillStyle = '#44474d'; x2.fillRect(0, 0, w, hh);
      for (let i = 0; i < 2500; i++) { x2.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .08})`; x2.fillRect(Math.random() * w, Math.random() * hh, 2, 2); }
      const X = (m) => (m + 9.5) / 19 * w;
      x2.fillStyle = '#6b6e72'; x2.fillRect(0, 0, X(-8.3), hh); x2.fillRect(X(8.3), 0, w - X(8.3), hh);
      x2.fillStyle = '#9a9a92'; x2.fillRect(X(-1), 0, X(1) - X(-1), hh);
      x2.fillStyle = '#F2C200'; x2.fillRect(X(-8.3), 0, 4, hh); x2.fillRect(X(8.3) - 4, 0, 4, hh); x2.fillRect(X(-1.1), 0, 3, hh); x2.fillRect(X(1.1) - 3, 0, 3, hh);
      x2.fillStyle = '#f2f2f2'; for (const m of [-4.6, 4.6]) { x2.fillRect(X(m) - 3, 0, 6, hh * .3); x2.fillRect(X(m) - 3, hh * .5, 6, hh * .3); }
    });
    roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    const grassTex = tex(128, 128, (x2, w, hh) => { x2.fillStyle = north ? '#a39352' : '#4f8a3a'; x2.fillRect(0, 0, w, hh); for (let i = 0; i < 900; i++) { x2.fillStyle = north ? `rgba(${120 + Math.random() * 60},${100 + Math.random() * 40},50,.5)` : `rgba(30,${90 + Math.random() * 70},30,.45)`; x2.fillRect(Math.random() * w, Math.random() * hh, 3, 3); } });
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    function ribbon(lats, ys, uScale, vScale, material, yfn) {
      const pos = [], uv = [], idx = [], cols = lats.length, rows = Math.ceil(N);
      for (let i = 0; i < rows; i++) { const s = i * SEG, p = at(s); for (let k = 0; k < cols; k++) { const lt = lats[k]; pos.push(p.x - Math.cos(p.h) * lt, (yfn ? yfn(s, lt, p.y) : p.y) + ys[k], p.z + Math.sin(p.h) * lt); uv.push(uScale ? (lt - lats[0]) / uScale : k / (cols - 1), s / vScale); } }
      for (let i = 0; i < rows - 1; i++) for (let k = 0; k < cols - 1; k++) { const a = i * cols + k, b2 = a + cols; idx.push(a, a + 1, b2, a + 1, b2 + 1, b2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, material); scene.add(m); return m;
    }
    ribbon([9.5, -9.5], [.02, .02], 0, 24, new THREE.MeshLambertMaterial({ map: roadTex, side: THREE.DoubleSide }));
    const gm = new THREE.MeshLambertMaterial({ map: grassTex, side: THREE.DoubleSide });
    const verge = (s, lt, y) => isBridge(s) ? -5 : y - Math.max(0, Math.abs(lt) - 10) * .03;
    ribbon([150, 40, 9.5], [-4.5, -.6, -.05], 12, 12, gm, verge); ribbon([-9.5, -40, -150], [-.05, -.6, -4.5], 12, 12, gm, verge);
    // median wall (low concrete barrier) and kerbs
    ribbon([-.32, -.2, .2, .32], [0, .82, .82, 0], 0, 50, new THREE.MeshLambertMaterial({ color: '#c9c9c2' }), (s, lt, y) => y);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ color: north ? '#9d8c4e' : '#477f35' })); far.rotation.x = -Math.PI / 2; far.position.set(PX[N >> 1], -6, PZ[N >> 1]); scene.add(far);
    if (bridgeLeg) {
      const mid = at((bz0 + bz1) / 2), w2 = (bz1 - bz0) + 400;
      const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, w2), new THREE.MeshLambertMaterial({ color: night ? '#0d2a3a' : '#2e7d8f', transparent: true, opacity: .95 }));
      water.rotation.x = -Math.PI / 2; water.rotation.z = -mid.h; water.position.set(mid.x, -2.5, mid.z); scene.add(water); ov.__water = water;
    }

    // ---------- scenery ----------
    const P = [], GLOW = [], signs = [];
    const place = (geo, color, s, lat, y = 0, rot = 0) => { const p = at(s), w = world(s, lat); P.push(part(geo, color, w.x, w.y + y, w.z, p.h + rot)); };
    const placeG = (geo, color, s, lat, y = 0, rot = 0) => { const p = at(s), w = world(s, lat); GLOW.push(part(geo, color, w.x, w.y + y, w.z, p.h + rot)); };
    function signPlane(text1, text2, bg, fg, s, lat, y, w, hh, face = 0, poles = true) {
      const t = tex(512, Math.round(512 * hh / w), (x2, cw, ch) => { x2.fillStyle = bg; x2.fillRect(0, 0, cw, ch); x2.strokeStyle = 'rgba(255,255,255,.6)'; x2.lineWidth = 6; x2.strokeRect(6, 6, cw - 12, ch - 12); fitText(x2, text1, cw / 2, text2 ? ch * .4 : ch / 2, cw * .9, ch * (text2 ? .36 : .5), fg); if (text2) fitText(x2, text2, cw / 2, ch * .76, cw * .88, ch * .2, fg, 600); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, emissive: night ? '#ffffff' : '#000000', emissiveMap: night ? t : null, emissiveIntensity: night ? .35 : 0 }));
      const p = at(s), ww = world(s, lat, y); m.position.copy(ww); m.rotation.y = p.h + Math.PI + face; scene.add(m); signs.push(m);
      if (poles) { place(B(.18, y, .18), '#555', s, lat - w * .4, y / 2); place(B(.18, y, .18), '#555', s, lat + w * .4, y / 2); }
      return m;
    }
    // palms, bush trees, electric poles (instanced)
    const trunkGeo = C(.18, .3, 7, 6); trunkGeo.translate(0, 3.5, 0);
    // palm crown: drooping fronds around the top of the trunk
    const crownGeo = merge(Array.from({ length: 8 }, (_, k) => { const g = B(.55, .07, 3.4); g.translate(0, 0, 1.7); return part(g, k % 2 ? '#2f7d32' : '#3a8f3a', 0, 7.1, 0, k * Math.PI / 4, .45); }).concat([part(new THREE.SphereGeometry(.45, 6, 4), '#6b4a2b', 0, 7.0, 0)]));
    const bushGeo = new THREE.IcosahedronGeometry(2.4, 0); bushGeo.translate(0, 2.6, 0);
    const trunks = [], bushes = [];
    for (let s = 0; s < L + 600; s += R.f(9, 22)) for (const side of [-1, 1]) { if (R.chance(.45)) continue; const lat = side * R.f(13, 55), w = world(s, lat); if (isBridge(s)) continue; (north ? R.chance(.75) : R.chance(.35)) ? bushes.push(w) : trunks.push(w); }
    const mtx = (list, sc) => list.map(w => { const d = new THREE.Object3D(); d.position.copy(w); const k = R.f(sc[0], sc[1]); d.scale.set(k, k, k); d.rotation.y = R.f(0, 6.28); d.updateMatrix(); return d.matrix.clone(); });
    const inst = (geo, mat, ms) => { const m = new THREE.InstancedMesh(geo, mat, ms.length); ms.forEach((mx, i) => m.setMatrixAt(i, mx)); scene.add(m); return m; };
    if (trunks.length) { const ms = mtx(trunks, [.9, 1.4]); inst(trunkGeo, new THREE.MeshLambertMaterial({ color: '#7a5a3a' }), ms); inst(crownGeo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), ms); }
    if (bushes.length) inst(bushGeo, new THREE.MeshLambertMaterial({ color: north ? '#6f7d34' : '#3c7a35', flatShading: true }), mtx(bushes, [.6, 1.3]));
    for (let s = 20; s < L + 500; s += 42) { if (isBridge(s)) continue; place(B(.22, 8, .22), '#6d5a45', s, 11.5, 4); place(B(1.6, .14, .14), '#6d5a45', s, 11.5, 7.6); }

    // towns: zinc-roof houses, shops with signboards, Christmas lights across the road
    const houseCols = ['#efe4cf', '#dfe9f2', '#f3d9c4', '#e6efd8', '#f1e3a6', '#d8d2e8', '#ffffff', '#cfe1d6'];
    const roofCols = ['#8a8f96', '#7b4b2a', '#9aa1a8', '#6a3e25', '#5f6870'];
    let shopN = 0;
    function house(s, side, big) {
      const lat = side * R.f(15, big ? 36 : 28), w = R.f(7, big ? 14 : 10), d = R.f(6, 10), hh = big && R.chance(.4) ? R.f(6, 10) : R.f(3, 3.8), col = R.pick(houseCols), p = at(s), wp = world(s, lat);
      P.push(part(B(d, hh, w), col, wp.x, wp.y + hh / 2, wp.z, p.h)); P.push(part(new THREE.ConeGeometry(Math.max(w, d) * .75, 1.6, 4), R.pick(roofCols), wp.x, wp.y + hh + .8, wp.z, p.h + Math.PI / 4));
      const face = side * -1; // windows on the wall facing the road
      for (let k = 0; k < Math.floor(w / 2.4); k++) for (let fl = 0; fl < Math.max(1, Math.floor(hh / 3)); fl++) { const off = -w / 2 + 1.4 + k * 2.4, wy = 1.6 + fl * 3; const q = world(s + off, lat + face * (d / 2 + .02), wy); GLOW.push(part(B(1.1, 1.1, .05), night ? (R.chance(.7) ? '#ffd27a' : '#2a2f3a') : '#2c3946', q.x, q.y, q.z, p.h + Math.PI / 2)); }
      const fr = side > 0 ? -Math.PI / 2 + .45 : Math.PI / 2 - .45; // face the road, turned a little toward oncoming drivers
      if (R.chance(.18)) signPlane('THIS HOUSE IS NOT FOR SALE', null, col, '#9b1b1b', s, lat + face * (d / 2 + .05), 1.9, Math.min(w * .8, 6), 1.1, fr, false);
      else if (R.chance(.55) && shopN < 22) { shopN++; const nm = SHOPS[(shopN * 7 + (o.seed || 1)) % SHOPS.length]; signPlane(nm, null, R.pick(['#1F4FA8', '#C0392B', '#1E8449', '#F2C200', '#8E44AD', '#0F3A2D']), '#fff', s, lat + face * (d / 2 + .1), hh + .2, Math.min(w, 7), 1.2, fr, false); if (nm === 'VULCANIZER') for (let t2 = 0; t2 < 3; t2++) place(new THREE.TorusGeometry(.42, .2, 6, 10), '#111', s - 2, lat + face * (d / 2 + 2), .45 + t2 * .38, Math.PI / 2); }
    }
    function lightsAcross(s) {
      const cols = ['#ff3b4e', '#ffd23f', '#3ddc84', '#4fc3f7', '#ff8a3d'];
      place(B(.16, 7, .16), '#4a4f57', s, -9.8, 3.5); place(B(.16, 7, .16), '#4a4f57', s, 9.8, 3.5);
      for (let k = 0; k <= 16; k++) { const t = k / 16, lt = lerp(-9.8, 9.8, t), sag = Math.sin(t * Math.PI) * 1.4; placeG(new THREE.SphereGeometry(.16, 6, 4), cols[k % cols.length], s, lt, 7 - sag); }
    }
    function townZone(s0, s1, label) {
      for (let s = s0; s < s1; s += R.f(12, 20)) { house(s, -1, true); house(s + R.f(0, 8), 1, true); }
      for (let s = s0 + 30; s < s1; s += 70) lightsAcross(s);
      for (let s = s0; s < s1; s += 36) { place(B(.16, 8, .16), '#666', s, 0, 4.4); placeG(B(1.2, .2, .5), night ? '#fff2c0' : '#d8d8d8', s, .5, 8.3); placeG(B(1.2, .2, .5), night ? '#fff2c0' : '#d8d8d8', s, -.5, 8.3); }
      if (label) signPlane(label, null, '#1E7A3A', '#fff', s0 + 10, 11, 4.2, 6, 1.6);
    }
    townZone(0, 230, null);
    townZone(L - 340, L + 260, null);
    // villages along the way, with market umbrellas
    const villages = [L * .3, L * .62].map(v => v + R.f(-80, 80));
    villages.forEach(v => { if (isBridge(v)) return; for (let s = v; s < v + 120; s += R.f(14, 24)) house(s, R.chance(.5) ? -1 : 1, false);
      for (let k = 0; k < 5; k++) { const s = v + 20 + k * 14, side = k % 2 ? 1 : -1; place(B(.08, 2.4, .08), '#444', s, side * 11.2, 1.2); place(new THREE.ConeGeometry(1.6, .7, 8), R.pick(['#C0392B', '#1F4FA8', '#F2C200', '#1E8449']), s, side * 11.2, 2.5); place(B(1.6, .8, 1), '#8B5A2B', s, side * 11.2, .4); } });
    // Niger Bridge trusses
    if (bridgeLeg) for (let s = bz0; s < bz1; s += 6) { for (const side of [-1, 1]) { place(B(.1, 1.1, 6), '#9aa0a6', s, side * 9.6, .55); if ((s - bz0) % 36 < 6) { place(B(.5, 7, .5), '#56606a', s, side * 9.9, 3.5); place(B(.3, .3, 36), '#56606a', s + 18, side * 9.9, 7); place(B(.25, 9, .25), '#56606a', s + 9, side * 9.9, 3.5, .0, 0); } } }
    // billboards and green distance signs
    let bi = 0;
    for (let s = 300; s < L - 400; s += R.f(260, 420)) { if (isBridge(s)) continue; const b2 = BOARDS[(bi++ + (o.seed || 0)) % BOARDS.length]; signPlane(b2[0], b2[1], b2[2], b2[3], s, (bi % 2 ? 1 : -1) * 16, 6.5, 9, 4.2); }
    [.25, .5, .75].forEach(f => { const s = L * f; if (isBridge(s)) return; const left = Math.max(1, Math.round((o.km || 60) * (1 - f))); signPlane(`${o.to.name.toUpperCase()}  ${left} km`, '⬆ ' + (o.road || ''), '#1E7A3A', '#fff', s - 40, 10.6, 4.6, 6.4, 2.2); });
    // state welcome arch at the border, town welcome arch near the end
    function arch(s, t1, t2, bg) { place(B(1.2, 9, 1.2), '#e8e2d0', s, -10.6, 4.5); place(B(1.2, 9, 1.2), '#e8e2d0', s, 10.6, 4.5); place(B(23, 1, 1.4), '#e8e2d0', s, 0, 9.4); signPlane(t1, t2, bg, '#fff', s, 0, 7.6, 18, 3.2, 0, false); }
    if (o.from.state !== o.to.state && !bridgeLeg) arch(L * .5, `WELCOME TO ${o.to.state.toUpperCase()}${o.to.state === 'FCT' ? '' : ' STATE'}`, SLOGAN[o.to.state] || '', '#155C45');
    arch(L - 110, `WELCOME TO ${o.to.name.toUpperCase()}`, o.to.state === 'FCT' ? 'Federal Capital Territory' : `${o.to.state} State · Merry Christmas 🎄`, '#D7263D');
    if (bridgeLeg) signPlane('NIGER BRIDGE', 'Asaba ⇄ Onitsha · River Niger', '#1F4FA8', '#fff', bz0 - 60, 11, 4.4, 7, 2.4);

    // police checkpoint: drums squeeze the road, slow down or pay
    const cpS = Math.round(L * R.f(.36, .44));
    for (let k = 0; k < 4; k++) { const drum = C(.42, .42, 1.0, 10); placeG(drum.clone(), k % 2 ? '#ff6a00' : '#ffffff', cpS + k * 2.2, 5.2 + k * .2, .5); }
    placeG(C(.42, .42, 1.0, 10), '#ff6a00', cpS + 10, 2.2, .5);
    signPlane('POLICE CHECKPOINT', 'Slow down · 30 km/h', '#121A3A', '#fff', cpS - 70, 10.5, 3.2, 4.4, 2);
    const people = [];
    function person(s, lat, top, cap) { const g = new THREE.Group(), body = new THREE.Mesh(C(.28, .3, 1.1, 7), new THREE.MeshLambertMaterial({ color: top })); body.position.y = 1.0; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), new THREE.MeshLambertMaterial({ color: '#5a3a24' })); head.position.y = 1.78; g.add(head);
      const legs = new THREE.Mesh(B(.36, .5, .2), new THREE.MeshLambertMaterial({ color: '#222' })); legs.position.y = .25; g.add(legs);
      if (cap) { const c2 = new THREE.Mesh(C(.22, .22, .12, 8), new THREE.MeshLambertMaterial({ color: cap })); c2.position.y = 1.96; g.add(c2); }
      const w = world(s, lat); g.position.copy(w); g.rotation.y = at(s).h; scene.add(g); people.push(g); return g; }
    person(cpS + 4, 8.9, '#1b2a4a', '#1b2a4a'); person(cpS + 7, 8.4, '#1b2a4a', '#1b2a4a');
    // potholes and mystery boxes on the road
    const holes = [], boxes = [];
    for (let k = 0; k < 7; k++) { const s = R.f(L * .15, L * .85); if (isBridge(s) || Math.abs(s - cpS) < 60) continue; const lat = R.pick([LANES.fast, LANES.slow]) + R.f(-.6, .6); const w = world(s, lat, .04); const m = new THREE.Mesh(new THREE.CircleGeometry(R.f(.7, 1.1), 9), new THREE.MeshLambertMaterial({ color: '#232427' })); m.rotation.x = -Math.PI / 2; m.position.copy(w); scene.add(m); holes.push({ s, lat, hit: false }); }
    const boxMat = new THREE.MeshLambertMaterial({ color: '#F5B83D', emissive: '#7a5200', emissiveIntensity: night ? .9 : .3 });
    for (let k = 0; k < 2; k++) { const s = L * (.3 + k * .35) + R.f(-60, 60), lat = R.pick([LANES.fast, LANES.slow]); const g = new THREE.Group(); const b2 = new THREE.Mesh(B(1.1, 1.1, 1.1), boxMat); const rb = new THREE.Mesh(B(1.14, .2, 1.14), new THREE.MeshLambertMaterial({ color: '#D7263D' })); const rb2 = new THREE.Mesh(B(.2, 1.14, 1.14), rb.material); g.add(b2, rb, rb2); g.position.copy(world(s, lat, 1.2)); scene.add(g); boxes.push({ s, lat, g, got: false }); }
    // cows crossing on northern roads
    const herd = north ? { s: L * R.f(.52, .6), x: -16, cows: [], on: false, done: false } : null;
    if (herd) { for (let k = 0; k < 5; k++) { const g = new THREE.Group(), col = R.pick(['#f2ede4', '#8b5a2b', '#e8dcc8', '#5d4037']); const bd = new THREE.Mesh(B(.9, .9, 1.9), new THREE.MeshLambertMaterial({ color: col })); bd.position.y = 1.1; const hd = new THREE.Mesh(B(.5, .5, .6), bd.material); hd.position.set(0, 1.5, 1.15); g.add(bd, hd); for (const lx of [-.3, .3]) for (const lz of [-.7, .7]) { const lg = new THREE.Mesh(B(.15, .7, .15), new THREE.MeshLambertMaterial({ color: '#3b2f25' })); lg.position.set(lx, .35, lz); g.add(lg); } scene.add(g); herd.cows.push({ g, dz: R.f(-4, 4), dx: -k * 2.2 }); } signPlane('CATTLE CROSSING', 'Slow down', '#F2C200', '#121A3A', herd.s - 120, 10.5, 3, 4, 2); }

    scene.add(new THREE.Mesh(merge(P), mats.vc)); if (GLOW.length) scene.add(new THREE.Mesh(merge(GLOW), mats.glow));

    // ---------- player and traffic ----------
    const me = makeVehicle(playerType, (o.garage && o.garage.colHex) || '#e8edf5', mats); scene.add(me);
    let plateM = null;
    if (o.garage && o.garage.plate && playerType !== 'okada') { const t = tex(256, 80, (x2, w, hh) => { x2.fillStyle = '#f7f7f7'; x2.fillRect(0, 0, w, hh); x2.fillStyle = '#1E8449'; x2.fillRect(0, 0, w, 14); fitText(x2, o.garage.plate, w / 2, hh * .6, w * .9, 44, '#1F2A44', 900); }); plateM = new THREE.Mesh(new THREE.PlaneGeometry(.62, .2), new THREE.MeshBasicMaterial({ map: t })); plateM.position.set(0, playerType === 'danfo' ? .75 : .6, -(VDIM[playerType === 'car' ? 'car' : playerType][1] / 2) - .04); plateM.rotation.y = Math.PI; me.add(plateM); }
    let head = null; if (night) { head = new THREE.SpotLight('#fff3d0', 60, 90, .5, .6, 1.2); head.position.set(0, 1.1, 1.5); me.add(head); const tg = new THREE.Object3D(); tg.position.set(0, 0, 25); me.add(tg); head.target = tg; }
    const cars = [];
    const TCOL = ['#E8EDF5', '#1E1E1E', '#AAB3BD', '#C0392B', '#2B59C3', '#1E8449', '#7a4e2d', '#E8EDF5', '#AAB3BD'];
    function spawn(dir, s, lane) {
      const r2 = Math.random(), type = r2 < .26 ? 'danfo' : r2 < .4 ? 'trailer' : r2 < .46 ? 'tanker' : r2 < .54 ? 'bus' : r2 < .62 && dir > 0 ? 'keke' : r2 < .7 ? 'okada' : 'car';
      const col = type === 'trailer' ? R.pick(['#C0392B', '#1F4FA8', '#E8EDF5']) : type === 'bus' ? R.pick(['#ffffff', '#2B59C3', '#C0392B']) : type === 'okada' ? R.pick(['#C0392B', '#1E1E1E', '#2B59C3']) : R.pick(TCOL);
      const slow = ['trailer', 'tanker', 'keke', 'bus'].includes(type);
      const k = { dir, s, lat: lane, tlat: lane, type, v: dir > 0 ? (slow ? R.f(14, 21) : R.f(19, 30)) : R.f(20, 30), g: makeVehicle(type, col, mats), len: VDIM[type][1], wid: VDIM[type][0], horn: 0 };
      if (dir > 0 && slow) k.lat = k.tlat = LANES.slow; if (dir < 0) k.lat = k.tlat = -lane;
      scene.add(k.g); cars.push(k); return k;
    }
    for (let k = 0; k < 9; k++) spawn(1, 60 + k * 55 + Math.random() * 30, Math.random() < .5 ? LANES.fast : LANES.slow);
    for (let k = 0; k < 7; k++) spawn(-1, 80 + k * 70, Math.random() < .5 ? LANES.fast : LANES.slow);
    // go-slow near the end of the leg, with hawkers walking between the cars
    const jam = { s0: L - 560, s1: L - 400, on: false };
    for (let k = 0; k < 8; k++) { const c2 = spawn(1, jam.s0 + k * 20, k % 2 ? LANES.fast : LANES.slow); c2.jam = true; c2.v = 0; }
    const hawkers = [];
    HAWK.forEach((hk, k) => { const s = jam.s0 + 10 + k * 24, lat = k % 2 ? 4.6 : 8.6; const g = person(s, lat, ['#2980B9', '#D35400', '#C0392B', '#E67E22', '#B9770E', '#1E8449'][k], '#F5B83D');
      const tray = new THREE.Mesh(B(.8, .12, .6), new THREE.MeshLambertMaterial({ color: '#8B5A2B' })); tray.position.y = 2.1; g.add(tray);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(128, 128, (x2) => { x2.font = '96px serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText(hk[1], 64, 70); }), depthTest: false })); sp.scale.set(1.3, 1.3, 1); sp.position.y = 2.9; g.add(sp);
      hawkers.push({ s, lat, g, sp, hk, sold: false, bob: Math.random() * 6 }); });

    // ---------- HUD ----------
    const esc = (t) => String(t ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    ov.insertAdjacentHTML('beforeend', `
      <div class="j-top"><button class="j-x" aria-label="Stop driving">✕</button>
        <div class="j-road"><b>${esc(o.road)}</b><span>${esc(o.from.name)} → ${esc(o.to.name)} · <i id="jleft">${o.km} km</i></span><div class="j-bar"><i id="jbar"></i></div></div>
        <div class="j-spd"><b id="jspd">0</b><small>km/h</small></div></div>
      <div class="j-msg" id="jmsg"></div><div class="j-flash" id="jflash"></div>
      <div class="j-ctl"><button class="j-l" id="jl" aria-label="Steer left">◀</button><button class="j-r" id="jr" aria-label="Steer right">▶</button></div>
      <div class="j-ctr"><button class="j-horn" id="jhorn" aria-label="Horn">📯</button><button class="j-brake" id="jbrake" aria-label="Brake">BRAKE</button></div>
      <div class="j-coach hidden" id="jcoach"></div>
      <div class="j-card" id="jcard"><div class="j-cardi">
        <small>Day ${o.leg} of ${o.legs} · Journey home to ${esc(o.home || o.to.name)}</small>
        <h2>${esc(o.from.name)} → ${esc(o.to.name)}</h2>
        <p class="j-sub">${esc(o.road)} · ${o.km} km${bridgeLeg ? ' · across the River Niger 🌊' : ''}${north ? ' · watch for cows 🐄' : ''}${haze ? ' · harmattan haze 🌫️' : ''}${night ? ' · night drive 🌙' : ''}</p>
        <ul class="j-tips"><li>Hold ◀ ▶ to steer (or arrow keys)</li><li>Slow down at the police checkpoint</li><li>Tap a hawker in go-slow to buy 🍗</li><li>Drive into the gold boxes 🎁</li></ul>
        <label class="j-tilt"><input type="checkbox" id="jtilt"> Steer by tilting my phone</label>
        <button class="btn btn-gold" id="jgo">🔑 Start the journey</button></div></div>`);
    const $ = (q) => ov.querySelector(q);
    let msgT = 0; const msg = (t, ms = 2200) => { const el = $('#jmsg'); el.textContent = t; el.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => el.classList.remove('on'), ms); };
    const flash = () => { const el = $('#jflash'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };

    // ---------- sound ----------
    let ac = null, eng = null, engG = null;
    const audio = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch {} return ac; };
    function tone(fs, d = .12, type = 'square', v = .06) { const a = audio(); if (!a || o.sound === false) return; let t = a.currentTime; fs.forEach(f => { const os = a.createOscillator(), g = a.createGain(); os.type = type; os.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); os.connect(g).connect(a.destination); os.start(t); os.stop(t + d); t += d * .9; }); }
    function bang() { const a = audio(); if (!a || o.sound === false) return; const b2 = a.createBuffer(1, a.sampleRate * .35, a.sampleRate), d = b2.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); const sN = a.createBufferSource(), g = a.createGain(); g.gain.value = .4; sN.buffer = b2; sN.connect(g).connect(a.destination); sN.start(); }
    function engineOn() { const a = audio(); if (!a || o.sound === false || eng) return; eng = a.createOscillator(); const f = a.createBiquadFilter(); engG = a.createGain(); eng.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 500; engG.gain.value = .025; eng.connect(f).connect(engG).connect(a.destination); eng.start(); }
    const vib = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

    // ---------- state ----------
    const S = { s: 2, x: LANES.slow, v: 0, steer: 0, t: 0, crashes: 0, fines: 0, inv: 0, shake: 0, started: false, done: false, paused: true, cp: false, boxes: 0, coachI: -1, coachT: 0, honk: false };
    const keys = {}; let hold = 0, tilt = null, useTilt = false;
    const hb = (el, v2) => { const on = (e) => { e.preventDefault(); hold = v2; }, off = (e) => { e.preventDefault(); if (hold === v2) hold = 0; }; el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off); };
    hb($('#jl'), -1); hb($('#jr'), 1);
    let braking = false; const br = $('#jbrake'); br.addEventListener('pointerdown', (e) => { e.preventDefault(); braking = true; }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => br.addEventListener(ev, () => { braking = false; }));
    const hornBtn = () => { tone([415, 415], .14); S.honk = true; cars.forEach(k => { if (k.dir > 0 && k.s > S.s && k.s - S.s < 40 && Math.abs(k.lat - S.x) < 1.8 && !k.jam) { k.tlat = k.lat < 4.6 ? LANES.slow : LANES.fast; } }); };
    $('#jhorn').onclick = hornBtn;
    const kd = (e) => { keys[e.key] = true; if (e.key === 'h') hornBtn(); }, ku = (e) => { keys[e.key] = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    const onTilt = (e) => { if (e.gamma == null) return; const land = Math.abs(window.orientation || 0) === 90 || innerWidth > innerHeight; const g = land ? (e.beta || 0) * (window.orientation === -90 ? -1 : 1) : e.gamma; tilt = clamp(g / 22, -1, 1); };
    // tap a hawker to buy
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    renderer.domElement.addEventListener('pointerdown', async (e) => {
      if (!S.started) return; const r = renderer.domElement.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, cam);
      const hit = ray.intersectObjects(hawkers.filter(h => !h.sold).map(h => h.sp))[0]; if (!hit) return;
      const hk = hawkers.find(h => h.sp === hit.object); if (!hk || Math.abs(hk.s - S.s) > 45) return msg('Get closer to buy 🙂', 1200);
      hk.sold = true; hk.sp.visible = false;
      try { const res = await o.api('/api/trip/buy', { item: hk.hk[0] }); o.onCoins && o.onCoins(res.coins); tone([660, 880], .08, 'triangle'); msg(`${hk.hk[1]} ${hk.hk[2]} −${hk.hk[3]} 🪙${hk.hk[3] >= 50 ? ' · in your gift bag 🎁' : ''}`, 2200); }
      catch (err) { hk.sold = false; hk.sp.visible = true; msg(err.message || 'Could not buy', 1600); }
    });

    function size() { const w = innerWidth, hh = innerHeight; renderer.setSize(w, hh); cam.aspect = w / hh; cam.fov = w < hh ? 74 : 60; cam.updateProjectionMatrix(); }
    size(); addEventListener('resize', size);
    const onVis = () => { if (document.hidden && S.started && !S.done) S.paused = true; else if (!document.hidden && S.started && !S.done && !$('#jcard:not(.gone)')) S.paused = false; };
    document.addEventListener('visibilitychange', onVis);

    $('#jgo').onclick = () => {
      useTilt = $('#jtilt').checked;
      if (useTilt && typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {});
      if (useTilt) addEventListener('deviceorientation', onTilt);
      audio(); engineOn(); $('#jcard').classList.add('gone'); o.beep && o.beep('tap');
      let n = 3; msg('3', 800); const cd = setInterval(() => { n--; if (n > 0) { msg(String(n), 800); tone([440], .1); } else { clearInterval(cd); msg('Oya go! 🚦', 1200); tone([660, 880], .12); S.paused = false; S.started = true; if (o.coach) { S.coachI = 0; coachShow(); } } }, 800);
    };
    const COACH = [['Hold ◀ ▶ to steer', () => Math.abs(S.steer) > .4], ['Hold BRAKE to slow down', () => braking || keys.ArrowDown], ['Tap 📯 and slow cars go comot from your lane', () => S.honk]];
    function coachShow() { const el = $('#jcoach'); const c2 = COACH[S.coachI]; if (!c2) { el.classList.add('hidden'); try { localStorage.setItem('n25_jcoached', '1'); } catch {} return; } el.textContent = c2[0]; el.className = 'j-coach c' + S.coachI; S.coachT = S.t; }
    $('.j-x').onclick = () => { if (S.done) return; S.paused = true; if (confirm('Stop this leg? You can drive it again today.')) finish(true); else if (S.started) S.paused = false; };

    // ---------- update ----------
    const tmp = new THREE.Vector3();
    function crash(t, big) { if (S.inv > 0) return; S.crashes++; S.v *= big ? .1 : .35; S.inv = 1.4; S.shake = .5; bang(); vib(big ? [80, 40, 80] : 60); flash(); msg(t, 2000); }
    function update(dt) {
      S.t += dt; if (S.inv > 0) S.inv -= dt; if (S.shake > 0) S.shake -= dt;
      let input = hold || (keys.ArrowLeft || keys.a ? -1 : 0) + (keys.ArrowRight || keys.d ? 1 : 0); if (useTilt && tilt != null && !hold) input = tilt;
      S.steer = lerp(S.steer, input, Math.min(1, dt * 8));
      const brk = braking || keys.ArrowDown || keys[' '];
      const offRoad = S.x > 8.6, vcap = offRoad ? 12 : VMAX;
      S.v = brk ? Math.max(0, S.v - 22 * dt) : S.v < vcap ? Math.min(vcap, S.v + (S.v < 10 ? 7 : 4) * dt) : Math.max(vcap, S.v - 9 * dt);
      const p = at(S.s);
      S.x += S.steer * dt * 6.5 * Math.min(1, S.v / 8) + p.cu * S.v * S.v * dt * .9;
      if (S.x < 1.35) { S.x = 1.45; if (S.v > 12) crash('You scratch the median barrier! 😬'); }
      if (S.x > 11) S.x = 11;
      if (offRoad && S.v > 14) { S.shake = Math.max(S.shake, .08); }
      S.s += S.v * dt;
      // traffic
      for (const k of cars) {
        if (k.dir > 0) {
          if (k.jam) { if (S.s > k.s - 70) k.v = lerp(k.v, S.s > jam.s0 + 70 ? 11 : 4.5, dt); }
          const ahead = cars.filter(c2 => c2 !== k && c2.dir > 0 && Math.abs(c2.lat - k.lat) < 1.8 && c2.s > k.s).sort((a, b2) => a.s - b2.s)[0];
          let tv = k.jam ? k.v : k.v0 || (k.v0 = k.v);
          if (ahead && ahead.s - k.s < 14 + k.len) tv = Math.min(tv, ahead.v);
          if (!k.jam) k.vNow = lerp(k.vNow || k.v, tv, dt * 2); else k.vNow = k.v;
          // danfo drama: a danfo cuts into your lane in front of you
          if (k.type === 'danfo' && !k.cut && !k.jam && k.s > S.s + 16 && k.s < S.s + 32 && Math.abs(k.lat - S.x) > 2.5 && Math.random() < dt * .6) { k.cut = true; k.tlat = S.x < 4.6 ? LANES.fast : LANES.slow; tone([392, 392, 392], .08); msg('Danfo don enter your lane anyhow! 🚐😤', 1800); }
          k.lat = lerp(k.lat, k.tlat, dt * (k.cut ? 1.6 : .9)); k.s += k.vNow * dt;
        } else k.s -= k.v * dt;
        // collisions
        if (S.inv <= 0 && Math.abs(k.lat - S.x) < (k.wid + VDIM[playerType === 'car' ? 'car' : playerType][0]) / 2 - .15 && Math.abs(k.s - S.s) < (k.len + VDIM[playerType === 'car' ? 'car' : playerType][1]) / 2 - .2) {
          crash(k.type === 'trailer' || k.type === 'tanker' ? 'You jam trailer! 😱 Thank God say you dey alive' : k.type === 'okada' ? 'You hit okada man! 🛵 Him don dey shout' : k.type === 'danfo' ? 'You and danfo don clash! 🚐 Conductor dey vex' : 'Gbam! You hit another car 💥', true);
          if (k.dir > 0) { k.s = Math.max(k.s, S.s + k.len / 2 + 3); }
        }
      }
      // recycle traffic around the player
      for (const k of cars) {
        if (k.jam) continue;
        if (k.dir > 0 && (k.s < S.s - 80 || k.s > S.s + 700)) { k.s = S.s + R.f(260, 520); k.lat = k.tlat = ['trailer', 'tanker', 'keke', 'bus'].includes(k.type) ? LANES.slow : R.pick([LANES.fast, LANES.slow]); k.cut = false; }
        if (k.dir < 0 && (k.s < S.s - 60)) { k.s = S.s + R.f(350, 650); }
      }
      if (S.s > jam.s0 - 120 && !jam.on) { jam.on = true; msg('Go-slow ahead! 🚗🚗🚗 Hawkers dey sell. Tap them to buy', 2800); }
      if (S.s > jam.s0 && S.s < jam.s1 && S.x > 8.7 && !jam.fined) { jam.fined = true; S.fines++; msg('FRSC catch you for driving on the shoulder! 🚨 +5s', 2400); tone([880, 660], .14); }
      // checkpoint
      if (!S.cp && S.s > cpS && S.s < cpS + 12) { S.cp = true; if (S.v * 3.6 > 32) { S.fines++; msg(`🚨 Police: "Oga, you no see checkpoint? Park well!" +5s`, 2600); tone([880, 660, 880], .12); vib([60, 40, 60]); } else msg('👮🏾 "Merry Christmas, safe journey!" Correct driver 👍🏾', 2200); }
      // potholes
      for (const hl of holes) if (!hl.hit && Math.abs(hl.s - S.s) < 1.2 && Math.abs(hl.lat - S.x) < 1.2) { hl.hit = true; S.shake = .35; vib(50); if (S.v > 20) { S.v *= .55; msg('Pothole! Your shock absorber don shout 😩', 1800); } else msg('Small pothole, you dodge am well 😎', 1400); }
      // mystery boxes
      for (const bx of boxes) { if (bx.got) continue; bx.g.rotation.y += dt * 2; if (Math.abs(bx.s - S.s) < 2 && Math.abs(bx.lat - S.x) < 1.6) { bx.got = true; bx.g.visible = false; S.boxes++; tone([784, 988, 1175, 1568], .07, 'triangle'); vib([20, 30, 20]);
        o.api('/api/drive/box', {}).then(r => { o.onCoins && r.coins != null && o.onCoins(r.coins); msg(r.label, 2200); }).catch(() => msg('🎁 Mystery box!', 1500)); } }
      // cows
      if (herd && !herd.done) {
        if (!herd.on && S.s > herd.s - 140) { herd.on = true; msg('🐄 Cows dey cross the road! BRAKE!', 2400); tone([330, 330], .2); }
        if (herd.on) { herd.x += dt * 2.1; if (herd.x > 32) herd.done = true; }
        herd.cows.forEach(cw => { const lat = herd.x + cw.dx, w = world(herd.s + cw.dz, lat); cw.g.position.copy(w); cw.g.rotation.y = at(herd.s).h - Math.PI / 2; if (herd.on && S.inv <= 0 && Math.abs(lat - S.x) < 1.4 && Math.abs(herd.s + cw.dz - S.s) < 2.6) crash('You jam cow! 🐄 Herdsman don vex', true); });
      }
      hawkers.forEach(hk => { hk.bob += dt * 3; hk.sp.position.y = 2.9 + Math.sin(hk.bob) * .12; });
      // coach
      if (S.coachI >= 0 && S.coachI < COACH.length && S.t - S.coachT > .7 && (COACH[S.coachI][1]() || S.t - S.coachT > 8)) { S.coachI++; coachShow(); }
      if (S.s >= L) finish(false);
    }

    // ---------- render ----------
    const camPos = new THREE.Vector3(), look = new THREE.Vector3(); let firstCam = true;
    function render(dt) {
      for (const k of cars) { const p = at(k.s), w = world(k.s, k.lat); k.g.position.copy(w); k.g.rotation.y = p.h + (k.dir < 0 ? Math.PI : 0) + (k.dir > 0 ? (k.tlat - k.lat) * -.05 : 0); }
      const p = at(S.s), w = world(S.s, S.x); me.position.copy(w); me.rotation.y = p.h - S.steer * .12 * Math.min(1, S.v / 10);
      if (playerType === 'okada') me.rotation.z = S.steer * -.25;
      const back = playerType === 'okada' || playerType === 'keke' ? 7.5 : 10.5, upY = playerType === 'danfo' ? 4.6 : 4.0;
      const pb = at(Math.max(0, S.s - back)), cpw = world(Math.max(0, S.s - back), S.x * .85);
      tmp.set(cpw.x, Math.max(cpw.y, pb.y) + upY, cpw.z);
      if (firstCam) { camPos.copy(tmp); firstCam = false; } else camPos.lerp(tmp, Math.min(1, dt * 6));
      cam.position.copy(camPos); if (S.shake > 0) { cam.position.x += (Math.random() - .5) * S.shake; cam.position.y += (Math.random() - .5) * S.shake; }
      const la = world(S.s + 22, S.x * .9, 1.0); look.lerp(la, firstCam ? 1 : Math.min(1, dt * 8)); cam.lookAt(look);
      if (ov.__stars) ov.__stars.position.copy(cam.position);
      renderer.render(scene, cam);
    }
    let last = performance.now(), raf, hudT = 0;
    look.copy(world(22, S.x, 1.0));
    function loop(now2) {
      raf = requestAnimationFrame(loop); const dt = Math.min(.05, (now2 - last) / 1000); last = now2;
      if (!S.paused && !S.done) update(dt);
      render(dt);
      if (S.snapNext) { S.snapNext = false; try { snap = renderer.domElement.toDataURL('image/jpeg', .8); } catch {} }
      if (eng && ac) { eng.frequency.setTargetAtTime(38 + S.v * 2.4, ac.currentTime, .1); engG.gain.setTargetAtTime(S.paused || S.done ? 0 : .02 + S.v / 1600, ac.currentTime, .1); }
      if (now2 - hudT > 120) { hudT = now2; $('#jspd').textContent = Math.round(S.v * 3.6); const f = clamp(S.s / L, 0, 1); $('#jbar').style.width = f * 100 + '%'; $('#jleft').textContent = `${Math.max(0, Math.round((o.km || 0) * (1 - f)))} km to ${o.to.name}`; }
    }
    raf = requestAnimationFrame(loop);
    window.__j3 = { S, L, cars, finishNow: () => { S.s = L - 30; }, jam, herd };

    function cleanup() {
      cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('deviceorientation', onTilt); document.removeEventListener('visibilitychange', onVis);
      try { if (eng) eng.stop(); } catch {}
      scene.traverse(obj => { if (obj.geometry && !GEO_CACHE_HAS(obj.geometry)) obj.geometry.dispose(); if (obj.material) { const ms = Array.isArray(obj.material) ? obj.material : [obj.material]; ms.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
      renderer.dispose(); ov.remove(); document.body.style.overflow = '';
    }
    function GEO_CACHE_HAS(g) { for (const v of GEO_CACHE.values()) if (v.body === g || v.lights === g) return true; return false; }
    let snap = null;
    function finish(quit) {
      if (S.done) return; S.done = true;
      if (quit) { cleanup(); return resolve({ quit: true }); }
      tone([523, 659, 784, 1047], .12, 'triangle'); vib([40, 30, 40]);
      S.snapNext = true;
      msg(`You don reach ${o.to.name}! 🎉`, 2500);
      setTimeout(() => { cleanup(); resolve({ secs: Math.round(S.t * 10) / 10 + S.fines * 5, crashes: S.crashes, fines: S.fines, boxes: S.boxes, snap }); }, 1600);
    }
  });
}
