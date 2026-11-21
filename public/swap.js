// Christmas Drip Booth: put yourself in a Christmas outfit, in a December location.
// Studio engine: everything is drawn on the phone (the selfie never leaves it).
// Realistic engine: premium, server proxies to an AI image model when SWAP_API_URL is set (see swap.js).
const W = 1080, H = 1350, CX = 540;
const HEAD = { x: 540, y: 455, w: 300, h: 384 }, DY = 48; // DY: head + headwear sit this much lower than the drawn coordinates      // where the face goes in the final picture
const FW = 480, FH = 614;                              // face crop size (same shape as HEAD)
const SW = 400, SH = 500, OV = { x: 200, y: 215, w: 210, h: 268.8 }; // camera/adjust stage and its face oval

// ---------- small helpers ----------
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; };
const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgba = (c, a = 1) => { const v = Array.isArray(c) ? c : hex(c); return `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`; };
const shade = (c, k) => { const v = Array.isArray(c) ? c : hex(c); return rgba(v.map(x => k < 0 ? x * (1 + k) : x + (255 - x) * k)); };
const lin = (c, x0, y0, x1, y1, st) => { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, k]) => g.addColorStop(o, k)); return g; };
const rad = (c, x, y, r0, r1, st) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, k]) => g.addColorStop(o, k)); return g; };
const glow = (c, x, y, r, col, a = 1) => { c.fillStyle = rad(c, x, y, 0, r, [[0, rgba(col, a)], [.35, rgba(col, a * .45)], [1, rgba(col, 0)]]); c.fillRect(x - r, y - r, r * 2, r * 2); };
const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
const FONT = "'Bricolage Grotesque', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const CAN_FILTER = (() => { try { const c = mk(2, 2).getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch { return false; } })();
function blurInto(src, px) {
  const out = mk(src.width, src.height), o = out.getContext('2d');
  if (CAN_FILTER) { const m = px * 3; o.filter = `blur(${px}px)`; o.drawImage(src, -m, -m, src.width + m * 2, src.height + m * 2); o.filter = 'none'; return out; }
  let cur = src; for (let k = 0; k < 2; k++) { const n = mk(cur.width / 2, cur.height / 2); const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, n.width, n.height); cur = n; }
  o.imageSmoothingQuality = 'high'; o.drawImage(cur, 0, 0, out.width, out.height); return out;
}
function bokeh(c, r, n, cols, y0 = 0, y1 = H, rr = [16, 60], a = [.18, .5]) {
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = y0 + r() * (y1 - y0), s = rr[0] + r() * (rr[1] - rr[0]), al = a[0] + r() * (a[1] - a[0]), col = pick(cols, r);
    c.fillStyle = rad(c, x, y, s * .55, s, [[0, rgba(col, al)], [.85, rgba(col, al * .9)], [1, rgba(col, 0)]]); c.beginPath(); c.arc(x, y, s, 0, 7); c.fill();
  }
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// ---------- locations (drawn sharp, then blurred like a portrait-mode photo) ----------
function palm(c, bx, by, tx, ty, s, col) {
  c.strokeStyle = col; c.lineCap = 'round';
  for (let k = 0; k < 4; k++) { c.lineWidth = (30 - k * 6) * s; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + (tx - bx) * .15, by + (ty - by) * .55, tx, ty); c.stroke(); }
  c.fillStyle = col;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * .95 + i * Math.PI * .24 + (i % 2 ? .08 : -.05), L = (190 + (i % 3) * 40) * s;
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * .55 + L * .35, mx = tx + Math.cos(a) * L * .55, my = ty + Math.sin(a) * L * .45 - 30 * s;
    c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(mx, my - 24 * s, ex, ey); c.quadraticCurveTo(mx, my + 26 * s, tx, ty); c.fill();
  }
}
const LOC = {
  tree: { tint: '#ffb35c', draw(c, r) {
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#050b22'], [.55, '#141a42'], [1, '#2a1330']]); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) glow(c, r() * W, 640 + r() * 360, 12 + r() * 34, pick(['#ffcc66', '#ff7a59', '#9fd0ff', '#ffe9b0'], r), .55);
    const tx = 540, top = 120, base = 1160, tiers = 6, w = (k) => 70 + 420 * k / tiers, y = (k) => top + (base - top) * k / tiers;
    c.fillStyle = lin(c, 0, top, 0, base, [[0, '#2a8a57'], [1, '#0b3d26']]);
    c.beginPath(); c.moveTo(tx, top);
    for (let k = 1; k <= tiers; k++) { c.lineTo(tx + w(k), y(k)); if (k < tiers) c.lineTo(tx + w(k) * .58, y(k)); }
    for (let k = tiers; k >= 1; k--) { if (k < tiers) c.lineTo(tx - w(k) * .58, y(k)); c.lineTo(tx - w(k), y(k)); }
    c.closePath(); c.fill();
    for (let i = 0; i < 360; i++) { const yy = top + 50 + r() * (base - top - 60), ww = 60 + 420 * (yy - top) / (base - top), x = tx + (r() * 2 - 1) * ww * .8, col = pick(['#ffd34d', '#ff4d5e', '#66e08a', '#7fc4ff', '#fff2c2'], r); glow(c, x, yy, 14, col, .9); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, yy, 3, 0, 7); c.fill(); }
    c.fillStyle = '#0a0a18'; c.fillRect(0, 1160, W, H - 1160); c.fillStyle = lin(c, 0, 1160, 0, H, [[0, 'rgba(255,190,90,.25)'], [1, 'rgba(255,190,90,0)']]); c.fillRect(0, 1160, W, H - 1160);
    [['#d7263d', 300, 90], ['#f5b83d', 760, 110], ['#1e7a5a', 380, 70], ['#7fc4ff', 690, 80]].forEach(([col, x, s]) => { c.fillStyle = col; c.fillRect(x - s / 2, 1160 - s, s, s); c.fillStyle = '#fff6e5'; c.fillRect(x - 7, 1160 - s, 14, s); c.fillRect(x - s / 2, 1160 - s * .55, s, 12); });
    glow(c, tx, top, 120, '#ffe9a0', .9);
  }, after(c, r) { bokeh(c, r, 26, ['#ffd34d', '#ff7a59', '#fff2c2', '#66e08a'], 0, 1100); } },

  studio: { tint: '#ffd27a', draw(c, r) {
    c.fillStyle = rad(c, 540, 560, 40, 980, [[0, '#2fa877'], [.45, '#155c45'], [1, '#04170f']]); c.fillRect(0, 0, W, H);
    c.save(); c.fillStyle = 'rgba(255,255,255,.06)'; c.textAlign = 'center'; c.font = `900 250px ${FONT}`; c.fillText('DETTY', 540, 420); c.font = `900 150px ${FONT}`; c.fillText('DECEMBER', 540, 580); c.restore();
    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(245,184,61,.07)'; c.save(); c.translate(r() * W, 0); c.rotate(.35); c.fillRect(0, -200, 50 + r() * 90, H + 400); c.restore(); }
  }, after(c, r) {
    bokeh(c, r, 30, ['#f5b83d', '#ffe39a', '#ffffff'], 0, H, [10, 46]);
    for (let i = 0; i < 70; i++) { c.save(); c.translate(r() * W, r() * H); c.rotate(r() * 6); c.fillStyle = pick(['#f5b83d', '#d7263d', '#ffffff', '#2e9b72'], r); c.globalAlpha = .55 + r() * .4; c.fillRect(-9, -4, 18, 8); c.restore(); }
  } },

  lagos: { tint: '#7f86ff', draw(c, r) {
    c.fillStyle = lin(c, 0, 0, 0, 790, [[0, '#060a20'], [.65, '#1c1849'], [1, '#55306a']]); c.fillRect(0, 0, W, 790);
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${.3 + r() * .6})`; c.fillRect(r() * W, r() * 500, 2, 2); }
    glow(c, 860, 170, 130, '#fff3d6', .55); c.fillStyle = '#fff6e2'; c.beginPath(); c.arc(860, 170, 42, 0, 7); c.fill();
    let x = -20; while (x < W) { const bw = 40 + r() * 80, bh = 90 + r() * (x > 300 && x < 760 ? 420 : 280); c.fillStyle = pick(['#0d1030', '#121640', '#0a0c26'], r); c.fillRect(x, 790 - bh, bw, bh);
      for (let wy = 790 - bh + 14; wy < 780; wy += 18) for (let wx = x + 7; wx < x + bw - 8; wx += 14) if (r() < .45) { c.fillStyle = rgba(pick(['#ffd27a', '#fff1c9', '#9fd0ff'], r), .55 + r() * .4); c.fillRect(wx, wy, 6, 8); }
      if (bh > 380) { c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(x + bw / 2, 790 - bh - 14, 5, 0, 7); c.fill(); c.fillStyle = '#0d1030'; c.fillRect(x + bw / 2 - 2, 790 - bh - 14, 4, 14); }
      x += bw + 4 + r() * 10; }
    c.fillStyle = lin(c, 0, 790, 0, H, [[0, '#121a44'], [1, '#03050e']]); c.fillRect(0, 790, W, H - 790);
    c.fillStyle = '#1a1d33'; c.fillRect(0, 806, W, 22); for (let px = 30; px < W; px += 96) c.fillRect(px, 828, 14, 60);
    for (let lx = 10; lx < W; lx += 46) { glow(c, lx, 800, 30, '#ffcf70', .9); c.fillStyle = '#fff3c4'; c.fillRect(lx - 3, 797, 6, 6);
      for (let ry = 840; ry < H; ry += 16 + r() * 18) { c.fillStyle = `rgba(255,200,110,${.35 * (1 - (ry - 840) / 520) * (.4 + r() * .6)})`; c.fillRect(lx - 6 - r() * 8, ry, 12 + r() * 16, 4); } }
  }, after(c, r) { bokeh(c, r, 18, ['#ffcf70', '#9fb4ff', '#ff8a7a'], 650, 1000, [14, 40]); } },

  beach: { tint: '#ff9a4a', draw(c, r) {
    c.fillStyle = lin(c, 0, 0, 0, 770, [[0, '#3a1d62'], [.38, '#c4467b'], [.68, '#ff8b3d'], [1, '#ffcb72']]); c.fillRect(0, 0, W, 770);
    glow(c, 330, 690, 360, '#ffd38a', .8); c.fillStyle = '#fff3c9'; c.beginPath(); c.arc(330, 700, 74, 0, 7); c.fill();
    c.fillStyle = lin(c, 0, 760, 0, 1040, [[0, '#f0a060'], [.25, '#7a5a7a'], [1, '#12405a']]); c.fillRect(0, 760, W, 290);
    for (let y = 770; y < 1030; y += 9) { const w = 60 + r() * 160 * (1 - (y - 770) / 400); c.fillStyle = `rgba(255,220,150,${.55 * (1 - (y - 770) / 300)})`; c.fillRect(330 - w / 2 + (r() - .5) * 40, y, w, 3); }
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 6; for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 0; x <= W; x += 30) c.lineTo(x, 1015 + k * 16 + Math.sin(x / 70 + k) * 6); c.stroke(); }
    c.fillStyle = lin(c, 0, 1040, 0, H, [[0, '#ebc790'], [1, '#c2915a']]); c.fillRect(0, 1040, W, H - 1040);
    palm(c, 70, 1320, 210, 380, 1, '#2a1630'); palm(c, 1040, 1340, 900, 470, .9, '#2a1630'); palm(c, 990, 1340, 1010, 620, .6, '#3a1d3a');
  }, after(c, r) { bokeh(c, r, 14, ['#ffd38a', '#ffb06b'], 600, 1000, [14, 44]); } },

  owambe: { tint: '#ffc06a', draw(c, r) {
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#2e1508'], [.45, '#7a4a1f'], [1, '#1d0d05']]); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { const x = 40 + r() * 1000; for (let y = 180; y < 940; y += 34) { glow(c, x + Math.sin(y / 60) * 6, y, 10, '#ffe0a0', .8); } }
    for (let i = 0; i < 7; i++) { const x0 = i * 180 - 40, x1 = x0 + 200; c.fillStyle = lin(c, 0, 0, 0, 190, [[0, i % 2 ? '#f6e7c9' : '#d6a24a'], [1, i % 2 ? '#b89b6a' : '#7a5418']]); c.beginPath(); c.moveTo(x0, 0); c.lineTo(x1, 0); c.quadraticCurveTo((x0 + x1) / 2, 260, x0, 0); c.fill(); }
    [[0, 130], [950, 130]].forEach(([x, w]) => { for (let k = 0; k < w; k += 18) { c.fillStyle = k % 36 ? '#e9d3a8' : '#b98a3e'; c.fillRect(x + k, 0, 18, H); } c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x, 0, w, H); });
    [[290, 240], [800, 260]].forEach(([x, y]) => { glow(c, x, y, 260, '#ffd889', .8); for (let k = 0; k < 4; k++) for (let a = 0; a < 18; a++) { const ang = a / 18 * 6.283, rx = 40 + k * 26, px = x + Math.cos(ang) * rx, py = y + k * 30 + Math.sin(ang) * rx * .25; glow(c, px, py, 9, '#ffffff', 1); } });
    for (let i = 0; i < 6; i++) { const x = 90 + i * 185 + r() * 40, y = 1010 + (i % 2) * 70, s = .8 + (i % 2) * .25;
      for (let k = -2; k <= 2; k++) { c.strokeStyle = '#c9a24a'; c.lineWidth = 7; rr(c, x + k * 48 * s - 18, y - 120 * s, 36 * s, 90 * s, 14); c.stroke(); }
      c.fillStyle = '#f7f0e2'; c.beginPath(); c.ellipse(x, y, 110 * s, 30 * s, 0, 0, 7); c.fill(); c.fillStyle = lin(c, 0, y, 0, y + 110 * s, [[0, '#efe5d1'], [1, '#bfae8e']]); c.fillRect(x - 110 * s, y, 220 * s, 110 * s); glow(c, x, y - 30 * s, 40, '#ffd36b', .9); }
    c.fillStyle = lin(c, 0, 1180, 0, H, [[0, '#2a160a'], [1, '#0d0603']]); c.fillRect(0, 1180, W, H - 1180);
  }, after(c, r) { bokeh(c, r, 36, ['#ffd889', '#fff1cc', '#ffb35c'], 0, 1150, [12, 50]); } },

  village: { tint: '#ffd08a', draw(c, r) {
    c.fillStyle = lin(c, 0, 0, 0, 780, [[0, '#6faee3'], [.7, '#cfe0ea'], [1, '#f7d6a2']]); c.fillRect(0, 0, W, 780);
    glow(c, 920, 230, 260, '#fff2c8', .8);
    c.fillStyle = '#3f6b33'; for (let x = 0; x < W; x += 40) { c.beginPath(); c.arc(x, 780, 40 + r() * 40, 0, 7); c.fill(); }
    c.fillStyle = lin(c, 0, 790, 0, H, [[0, '#c4672f'], [1, '#8a3f1f']]); c.fillRect(0, 790, W, H - 790);
    c.fillStyle = lin(c, 280, 0, 900, 0, [[0, '#e8cfa5'], [1, '#f3e1bf']]); c.fillRect(280, 540, 620, 320);
    c.fillStyle = '#7d848b'; c.beginPath(); c.moveTo(240, 560); c.lineTo(350, 420); c.lineTo(830, 420); c.lineTo(940, 560); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 3; for (let x = 260; x < 930; x += 20) { c.beginPath(); c.moveTo(x, 560); c.lineTo(350 + (x - 240) * 480 / 700, 420); c.stroke(); }
    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(160,98,58,.45)'; c.fillRect(330 + r() * 500, 430 + r() * 110, 40 + r() * 70, 18); }
    c.fillStyle = '#6b3d1e'; c.fillRect(545, 660, 90, 200); [[360, 640], [740, 640]].forEach(([x, y]) => { c.fillStyle = '#2a6fb0'; c.fillRect(x, y, 100, 110); c.fillStyle = '#1b4f82'; for (let k = 8; k < 110; k += 14) c.fillRect(x + 6, y + k, 88, 6); });
    c.fillStyle = '#e0c9a0'; [300, 880].forEach(x => c.fillRect(x, 560, 22, 300));
    c.fillStyle = '#4a2c17'; c.fillRect(100, 560, 40, 330);
    for (let i = 0; i < 70; i++) { const a = r() * 6.283, d = r() * 230; c.fillStyle = pick(['#1f4d22', '#2b6a2c', '#173d1a'], r); c.beginPath(); c.arc(130 + Math.cos(a) * d, 470 + Math.sin(a) * d * .6, 50 + r() * 40, 0, 7); c.fill(); }
    palm(c, 1050, 900, 990, 470, .75, '#2b5a28');
    c.strokeStyle = '#3b2b1b'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 150); c.quadraticCurveTo(540, 260, 1080, 130); c.stroke();
    for (let i = 0; i < 18; i++) { const t = (i + .5) / 18, x = t * 1080, y = (1 - t) * (1 - t) * 150 + 2 * (1 - t) * t * 260 + t * t * 130; c.fillStyle = ['#d7263d', '#1e7a5a', '#f5b83d', '#ffffff'][i % 4]; c.beginPath(); c.moveTo(x - 24, y); c.lineTo(x + 24, y); c.lineTo(x, y + 52); c.fill(); }
    c.fillStyle = '#f2efe6'; c.beginPath(); c.ellipse(880, 930, 70, 40, 0, 0, 7); c.fill(); c.fillRect(825, 950, 12, 55); c.fillRect(915, 950, 12, 55); c.beginPath(); c.ellipse(955, 895, 26, 20, -.5, 0, 7); c.fill(); c.strokeStyle = '#7b6a55'; c.lineWidth = 6; c.beginPath(); c.moveTo(950, 878); c.quadraticCurveTo(940, 850, 925, 855); c.stroke();
  }, after(c, r) { bokeh(c, r, 10, ['#fff2c8', '#ffd38a'], 0, 600, [16, 50], [.12, .3]); } },

  airport: { tint: '#cfe4ff', draw(c, r) {
    c.fillStyle = '#d6dce4'; c.fillRect(0, 0, W, 190); for (let x = 40; x < W; x += 200) { c.fillStyle = '#ffffff'; c.fillRect(x, 60, 120, 18); glow(c, x + 60, 70, 80, '#ffffff', .7); }
    c.fillStyle = lin(c, 0, 190, 0, 700, [[0, '#8fc0ea'], [1, '#e2eef7']]); c.fillRect(0, 190, W, 520);
    c.fillStyle = '#6a7077'; c.fillRect(0, 700, W, 170); c.fillStyle = '#f5d33d'; for (let x = 0; x < W; x += 90) c.fillRect(x, 790, 50, 6);
    c.fillStyle = '#f7f9fb'; c.beginPath(); c.ellipse(560, 640, 400, 52, 0, 0, 7); c.fill();
    c.fillStyle = '#1e7a5a'; c.beginPath(); c.moveTo(860, 620); c.lineTo(960, 470); c.lineTo(1000, 470); c.lineTo(950, 630); c.fill();
    c.fillStyle = '#d6dde4'; c.beginPath(); c.moveTo(480, 655); c.lineTo(300, 760); c.lineTo(370, 760); c.lineTo(620, 660); c.fill(); c.fillStyle = '#b9c2cb'; c.beginPath(); c.ellipse(420, 715, 46, 22, 0, 0, 7); c.fill();
    c.fillStyle = '#2a3a55'; for (let x = 260; x < 860; x += 30) c.fillRect(x, 630, 12, 14); c.fillStyle = '#1e7a5a'; c.font = `900 40px ${FONT}`; c.fillText('DETTY AIR', 300, 690);
    c.fillStyle = '#3b4048'; for (let x = 0; x <= W; x += 180) c.fillRect(x - 7, 190, 14, 680); c.fillRect(0, 520, W, 12); c.fillRect(0, 862, W, 16);
    c.fillStyle = lin(c, 0, 870, 0, H, [[0, '#c7ccd4'], [1, '#868c95']]); c.fillRect(0, 870, W, H - 870);
    for (let x = 0; x < W; x += 180) { c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x + 20, 880, 140, 400); }
    c.fillStyle = '#1e7a5a'; rr(c, 50, 225, 460, 120, 16); c.fill(); c.fillStyle = '#fff'; c.font = `900 62px ${FONT}`; c.fillText('WELCOME HOME', 76, 300); c.font = `700 26px ${FONT}`; c.fillText('ARRIVALS  ›', 80, 334);
  }, after(c, r) { bokeh(c, r, 14, ['#ffffff', '#e2f0ff'], 0, 260, [14, 40], [.15, .35]); } },

  snow: { tint: '#a9bcff', draw(c, r) {
    c.fillStyle = lin(c, 0, 0, 0, 760, [[0, '#1a1f4a'], [.6, '#4d4580'], [1, '#c79fb7']]); c.fillRect(0, 0, W, 760);
    let x = -30; while (x < W) { const bw = 120 + r() * 120, bh = 260 + r() * 300; c.fillStyle = pick(['#2a2440', '#352b4d', '#241f38'], r); c.fillRect(x, 900 - bh, bw, bh); c.fillStyle = '#e9eef8'; c.fillRect(x - 6, 900 - bh - 10, bw + 12, 16);
      for (let wy = 900 - bh + 30; wy < 860; wy += 60) for (let wx = x + 18; wx < x + bw - 30; wx += 44) { const on = r() < .6; c.fillStyle = on ? '#ffcf7a' : '#3d3556'; c.fillRect(wx, wy, 24, 34); if (on) glow(c, wx + 12, wy + 17, 30, '#ffcf7a', .4); }
      x += bw + 8; }
    c.fillStyle = lin(c, 0, 900, 0, H, [[0, '#dfe7f5'], [1, '#a9b7d4']]); c.fillRect(0, 900, W, H - 900);
    c.strokeStyle = 'rgba(120,135,170,.35)'; c.lineWidth = 10; [[420, 1350, 500, 900], [660, 1350, 580, 900]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); });
    [[170, .9], [900, .8]].forEach(([lx, s]) => { c.fillStyle = '#15131f'; c.fillRect(lx - 7, 520, 14, 480 * s); glow(c, lx, 510, 160, '#ffd38a', .8); c.fillStyle = '#fff1c8'; c.beginPath(); c.arc(lx, 510, 20, 0, 7); c.fill(); });
  }, after(c, r) {
    for (let i = 0; i < 170; i++) { const s = 2 + r() * 6; c.fillStyle = `rgba(255,255,255,${.55 + r() * .45})`; c.beginPath(); c.arc(r() * W, r() * H, s, 0, 7); c.fill(); }
    bokeh(c, r, 18, ['#ffffff', '#ffe2b0'], 0, H, [16, 46], [.15, .35]);
  } },
};
const BG = new Map();
function background(id, s) {
  const key = id + '@' + s; if (BG.has(key)) return BG.get(key);
  const L = LOC[id] || LOC.studio, raw = mk(W * s, H * s), c = raw.getContext('2d'); c.scale(s, s); L.draw(c, seeded(id.length * 977 + 11));
  const out = blurInto(raw, Math.max(2, 7 * s)), o = out.getContext('2d'); o.scale(s, s); if (L.after) L.after(o, seeded(id.length * 131 + 7));
  if (BG.size > 12) BG.delete(BG.keys().next().value); BG.set(key, out); return out;
}

// ---------- fabric patterns ----------
const PAT = {};
function pattern(c, name) {
  if (!PAT[name]) {
    let t;
    if (name === 'knit') { t = mk(22, 22); const x = t.getContext('2d'); x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 3; x.beginPath(); x.moveTo(2, 2); x.lineTo(11, 19); x.lineTo(20, 2); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 2; x.beginPath(); x.moveTo(5, 1); x.lineTo(11, 13); x.lineTo(17, 1); x.stroke(); }
    else if (name === 'lace') { t = mk(72, 72); const x = t.getContext('2d'); x.strokeStyle = 'rgba(255,240,225,.55)'; x.lineWidth = 2.5; for (const [cx, cy] of [[36, 36], [0, 0], [72, 0], [0, 72], [72, 72]]) { for (let a = 0; a < 6; a++) { x.beginPath(); x.ellipse(cx + Math.cos(a * 1.047) * 11, cy + Math.sin(a * 1.047) * 11, 9, 5, a * 1.047, 0, 7); x.stroke(); } x.beginPath(); x.arc(cx, cy, 4, 0, 7); x.stroke(); } x.fillStyle = 'rgba(255,240,225,.35)'; for (const [cx, cy] of [[36, 0], [0, 36], [72, 36], [36, 72]]) { x.beginPath(); x.arc(cx, cy, 3, 0, 7); x.fill(); } }
    else if (name === 'mesh') { t = mk(10, 10); const x = t.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.14)'; x.beginPath(); x.arc(5, 5, 1.8, 0, 7); x.fill(); }
    else { // ankara prints: name = 'ankara:#bg,#a,#b,#c'
      const [bg, a, b, d] = name.split(':')[1].split(','); t = mk(160, 160); const x = t.getContext('2d');
      x.fillStyle = bg; x.fillRect(0, 0, 160, 160);
      for (const [cx, cy] of [[80, 80], [0, 0], [160, 0], [0, 160], [160, 160]]) { [[56, a], [44, b], [32, d], [20, a], [9, bg]].forEach(([rr_, col]) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, rr_, 0, 7); x.fill(); }); }
      x.fillStyle = d; for (const [cx, cy] of [[80, 0], [0, 80], [160, 80], [80, 160]]) { x.save(); x.translate(cx, cy); x.rotate(.785); x.fillRect(-13, -13, 26, 26); x.restore(); }
      x.fillStyle = b; for (const [cx, cy] of [[40, 40], [120, 40], [40, 120], [120, 120]]) { x.beginPath(); x.arc(cx, cy, 6, 0, 7); x.fill(); }
    }
    PAT[name] = t;
  }
  return c.createPattern(PAT[name], 'repeat');
}

// ---------- body + cloth helpers ----------
function torso(c, sw = 330, top = 770, nw = 80) {
  c.beginPath(); c.moveTo(CX - nw, top - 40);
  c.bezierCurveTo(CX - nw - 60, top - 12, CX - sw + 70, top - 8, CX - sw, top + 40);
  c.bezierCurveTo(CX - sw - 50, top + 90, CX - sw - 70, top + 320, CX - sw - 60, H + 10);
  c.lineTo(CX + sw + 60, H + 10);
  c.bezierCurveTo(CX + sw + 70, top + 320, CX + sw + 50, top + 90, CX + sw, top + 40);
  c.bezierCurveTo(CX + sw - 70, top - 8, CX + nw + 60, top - 12, CX + nw, top - 40);
  c.closePath();
}
const across = (c, cols) => lin(c, 120, 0, 960, 0, cols.map((k, i) => [i / (cols.length - 1), k]));
function cut(c, fn) { c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.beginPath(); fn(); c.fill(); c.restore(); }
function shadeCloth(c) {
  c.save(); c.globalCompositeOperation = 'source-atop';
  c.fillStyle = lin(c, 100, 0, 980, 0, [[0, 'rgba(0,0,0,.45)'], [.2, 'rgba(0,0,0,.1)'], [.42, 'rgba(255,255,255,.08)'], [.7, 'rgba(0,0,0,.05)'], [1, 'rgba(0,0,0,.48)']]); c.fillRect(0, 0, W, H);
  c.fillStyle = lin(c, 0, 700, 0, H, [[0, 'rgba(255,255,255,.05)'], [1, 'rgba(0,0,0,.28)']]); c.fillRect(0, 0, W, H);
  c.fillStyle = rad(c, CX, 730, 0, 230, [[0, 'rgba(0,0,0,.4)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
  c.lineCap = 'round';
  for (const sx of [-1, 1]) for (const [lw, a] of [[28, .08], [12, .16]]) { c.strokeStyle = `rgba(0,0,0,${a})`; c.lineWidth = lw; c.beginPath(); c.moveTo(CX + sx * 262, 870); c.quadraticCurveTo(CX + sx * 248, 1100, CX + sx * 255, H); c.stroke(); }
  c.restore();
}
function fur(c, pts, w, r) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = '#e9e9e9'; c.lineWidth = w; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
  for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
    for (let d = 0; d < L; d += 5) { const t = d / L, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      for (let k = 0; k < 2; k++) { const ox = (r() - .5) * w, oy = (r() - .5) * w, rr_ = w * (.1 + r() * .14); c.fillStyle = pick(['#ffffff', '#f4f4f4', '#dcdcdc', '#cfcfcf'], r); c.beginPath(); c.arc(x + ox, y + oy, rr_, 0, 7); c.fill(); } } }
  c.restore();
}
const arc = (cx, cy, rx, ry, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
function emb(c, x0, y0, x1, y1, col = '#f2c94c') {
  const L = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  c.strokeStyle = col; c.lineWidth = 9; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.lineWidth = 3; for (const o of [-15, 15]) { c.beginPath(); c.moveTo(x0 + nx * o, y0 + ny * o); c.lineTo(x1 + nx * o, y1 + ny * o); c.stroke(); }
  c.fillStyle = col; for (let d = 12; d < L; d += 26) { const x = x0 + (x1 - x0) * d / L, y = y0 + (y1 - y0) * d / L; for (const o of [-26, 26]) { c.save(); c.translate(x + nx * o, y + ny * o); c.rotate(.785); c.fillRect(-4, -4, 8, 8); c.restore(); } }
}
function rosette(c, x, y, s, col = '#f2c94c') {
  c.strokeStyle = col; c.lineWidth = 4;
  for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc(x, y, 18 * k * s, 0, 7); c.stroke(); }
  for (let a = 0; a < 12; a++) { const ang = a * .5236; c.beginPath(); c.ellipse(x + Math.cos(ang) * 74 * s, y + Math.sin(ang) * 74 * s, 16 * s, 7 * s, ang, 0, 7); c.stroke(); }
  c.fillStyle = col; c.beginPath(); c.arc(x, y, 8 * s, 0, 7); c.fill();
}
function sequins(c, r, n, cols) { for (let i = 0; i < n; i++) { const x = 150 + r() * 780, y = 760 + r() * 600, s = 1.5 + r() * 3.5; c.fillStyle = pick(cols, r); c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); if (r() < .12) { c.fillRect(x - s * 3, y - .8, s * 6, 1.6); c.fillRect(x - .8, y - s * 3, 1.6, s * 6); } } }
function snowflake(c, x, y, s) { c.save(); c.translate(x, y); c.lineWidth = 6; c.lineCap = 'round'; for (let a = 0; a < 6; a++) { c.rotate(1.047); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s); c.moveTo(0, -s * .55); c.lineTo(-s * .25, -s * .78); c.moveTo(0, -s * .55); c.lineTo(s * .25, -s * .78); c.stroke(); } c.restore(); }
function zig(c, y, amp, col, lw = 10) { c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = 'miter'; c.beginPath(); for (let x = 0, k = 0; x <= W + 40; x += 34, k++) c.lineTo(x, y + (k % 2 ? amp : -amp)); c.stroke(); }

// ---------- outfits: back (behind face), body (cloth layer, shaded), front (over face) ----------
const HT = HEAD.y - HEAD.h / 2; // top of the head oval
const OUT = {
  sweater: { body(c, r) {
    torso(c); c.fillStyle = '#b8121c'; c.fill();
    c.save(); torso(c); c.clip();
    c.fillStyle = '#f7f1e8'; c.strokeStyle = '#f7f1e8'; zig(c, 880, 16, '#f7f1e8'); for (let x = 70; x < W; x += 116) snowflake(c, x, 955, 30); zig(c, 1032, 16, '#f7f1e8');
    c.fillStyle = '#1e7a5a'; c.fillRect(0, 1060, W, 14); c.fillStyle = '#f7f1e8'; c.font = `900 112px ${FONT}`; c.textAlign = 'center'; c.fillText("DETTY '26", CX, 1196);
    c.fillStyle = '#1e7a5a'; c.fillRect(0, 1226, W, 14); for (let x = 20; x < W; x += 60) { c.fillStyle = '#f7f1e8'; c.save(); c.translate(x, 1290); c.rotate(.785); c.fillRect(-12, -12, 24, 24); c.restore(); }
    c.fillStyle = pattern(c, 'knit'); c.fillRect(0, 600, W, H); c.restore();
    cut(c, () => c.ellipse(CX, 728, 78, 30, 0, 0, 7));
    c.lineWidth = 34; c.strokeStyle = '#8e0d15'; c.beginPath(); c.ellipse(CX, 730, 96, 44, 0, .05, Math.PI - .05); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3; for (let a = .15; a < Math.PI - .1; a += .12) { const x = CX + Math.cos(a) * 96, y = 730 + Math.sin(a) * 44; c.beginPath(); c.moveTo(x - Math.cos(a) * 15, y - Math.sin(a) * 15); c.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); c.stroke(); }
  } },
  santa: { body(c, r) {
    torso(c, 335); c.fillStyle = across(c, ['#6d0810', '#c11b28', '#e3343f', '#c11b28', '#6d0810']); c.fill();
    c.save(); torso(c, 335); c.clip();
    for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(255,255,255,.05)'; c.beginPath(); c.ellipse(200 + r() * 680, 900 + r() * 400, 30, 160, (r() - .5) * .4, 0, 7); c.fill(); }
    c.fillStyle = '#141414'; c.fillRect(0, 1235, W, 74); c.strokeStyle = '#e9b949'; c.lineWidth = 16; c.strokeRect(CX - 62, 1222, 124, 100); c.fillStyle = '#d4a23a'; c.fillRect(CX - 8, 1250, 16, 44);
    c.restore();
    cut(c, () => c.ellipse(CX, 728, 78, 30, 0, 0, 7));
    fur(c, [[CX, 770], [CX, H + 20]], 92, r);
    fur(c, arc(CX, 738, 128, 60, .02, Math.PI - .02), 66, r);
  } },
  agbada: { body(c, r) {
    c.beginPath(); c.moveTo(CX - 80, 730); c.bezierCurveTo(CX - 300, 750, CX - 430, 790, CX - 480, 910); c.lineTo(CX - 560, H + 10); c.lineTo(CX + 560, H + 10); c.lineTo(CX + 480, 910); c.bezierCurveTo(CX + 430, 790, CX + 300, 750, CX + 80, 730); c.closePath();
    c.fillStyle = across(c, ['#0c1f5a', '#1f42a8', '#3460d1', '#1f42a8', '#0c1f5a']); c.fill();
    c.lineCap = 'round'; for (const [x0, x1, a] of [[-330, -470, .22], [-200, -280, .16], [210, 300, .16], [340, 480, .22]]) { c.strokeStyle = `rgba(0,0,0,${a})`; c.lineWidth = 22; c.beginPath(); c.moveTo(CX + x0, 820); c.quadraticCurveTo(CX + (x0 + x1) / 2 + 30, 1080, CX + x1, H); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 10; c.beginPath(); c.moveTo(CX + x0 + 26, 830); c.quadraticCurveTo(CX + (x0 + x1) / 2 + 56, 1080, CX + x1 + 26, H); c.stroke(); }
    c.fillStyle = '#3b66d8'; c.beginPath(); c.moveTo(CX - 100, 732); c.lineTo(CX, 1090); c.lineTo(CX + 100, 732); c.closePath(); c.fill();
    cut(c, () => c.ellipse(CX, 728, 74, 28, 0, 0, 7));
    c.strokeStyle = '#f2c94c'; c.lineWidth = 8; c.beginPath(); c.ellipse(CX, 732, 82, 34, 0, .1, Math.PI - .1); c.stroke();
    emb(c, CX - 104, 740, CX - 4, 1090); emb(c, CX + 104, 740, CX + 4, 1090);
    rosette(c, CX - 250, 960, 1); rosette(c, CX + 250, 960, .7);
    c.fillStyle = '#f2c94c'; for (let y = 1110; y < H; y += 30) { c.beginPath(); c.arc(CX, y, 5, 0, 7); c.fill(); }
  }, front(c, r) {
    c.save(); c.translate(CX, 0); c.rotate(-.05);
    c.beginPath(); c.moveTo(-162, 352); c.lineTo(-170, 214); c.quadraticCurveTo(-176, 156, -110, 150); c.lineTo(132, 172); c.quadraticCurveTo(172, 178, 166, 226); c.lineTo(160, 350); c.quadraticCurveTo(0, 372, -162, 352); c.closePath();
    c.fillStyle = lin(c, -170, 0, 170, 0, [[0, '#0c1f5a'], [.45, '#3460d1'], [1, '#13307e']]); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 8; c.beginPath(); c.moveTo(-120, 168); c.quadraticCurveTo(-20, 230, 120, 190); c.stroke();
    c.strokeStyle = '#f2c94c'; c.lineWidth = 10; c.beginPath(); c.moveTo(-160, 326); c.quadraticCurveTo(0, 346, 160, 324); c.stroke();
    c.fillStyle = '#f2c94c'; for (let x = -140; x <= 140; x += 28) { c.beginPath(); c.arc(x, 306 + Math.abs(x) * .02, 4, 0, 7); c.fill(); }
    c.restore();
  } },
  asoebi: { back(c, r) {
    const px = CX + 10, py = HT + 70;
    for (let i = -6; i <= 6; i++) { const a = -Math.PI / 2 + i * .25, L = 250 - Math.abs(i) * 11, ex = px + Math.cos(a) * L, ey = py + Math.sin(a) * L, nx = -Math.sin(a), ny = Math.cos(a);
      c.fillStyle = lin(c, px, py, ex, ey, [[0, '#a8700e'], [.6, i % 2 ? '#f7d774' : '#e2b23a'], [1, '#c8901c']]);
      c.beginPath(); c.moveTo(px - nx * 30, py - ny * 30); c.quadraticCurveTo(ex - nx * 46 + Math.cos(a) * 30, ey - ny * 46 + Math.sin(a) * 30, ex, ey); c.quadraticCurveTo(ex + nx * 46 + Math.cos(a) * 30, ey + ny * 46 + Math.sin(a) * 30, px + nx * 30, py + ny * 30); c.fill();
      c.strokeStyle = 'rgba(120,70,0,.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(ex, ey); c.stroke(); }
  }, body(c, r) {
    torso(c, 322); c.fillStyle = across(c, ['#9c3a2e', '#e2705a', '#f6a184', '#e2705a', '#9c3a2e']); c.fill();
    c.save(); torso(c, 322); c.clip(); c.fillStyle = pattern(c, 'lace'); c.fillRect(0, 600, W, H); sequins(c, r, 420, ['#fff7e0', '#ffe08a', '#ffffff', '#ffd1b8']); c.restore();
    cut(c, () => c.ellipse(CX, 740, 150, 72, 0, 0, 7));
    c.fillStyle = '#f2c94c'; for (let a = .1; a < Math.PI - .05; a += .07) { c.beginPath(); c.arc(CX + Math.cos(a) * 156, 740 + Math.sin(a) * 78, 5, 0, 7); c.fill(); }
  }, front(c, r) {
    c.beginPath(); c.moveTo(CX - 176, 372); c.quadraticCurveTo(CX, 270, CX + 176, 360); c.lineTo(CX + 170, 300); c.quadraticCurveTo(CX, 200, CX - 172, 312); c.closePath();
    c.fillStyle = lin(c, CX - 180, 0, CX + 180, 0, [[0, '#b07812'], [.5, '#f7d774'], [1, '#c8901c']]); c.fill();
    c.strokeStyle = 'rgba(120,70,0,.35)'; c.lineWidth = 4; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(CX - 170, 318 + k * 14); c.quadraticCurveTo(CX, 222 + k * 22, CX + 170, 308 + k * 14); c.stroke(); }
    for (let i = 0; i < 4; i++) { const a = -1.2 + i * .5; c.fillStyle = i % 2 ? '#f7d774' : '#d9a82e'; c.beginPath(); c.ellipse(CX + 175 + Math.cos(a) * 36, 300 + Math.sin(a) * 36, 58, 24, a, 0, 7); c.fill(); c.strokeStyle = 'rgba(120,70,0,.35)'; c.stroke(); }
  } },
  ankara: { body(c, r) {
    torso(c); c.fillStyle = pattern(c, 'ankara:#f07b1d,#1d8a8a,#ffd23f,#1b2a5a'); c.fill();
    c.fillStyle = lin(c, CX - 120, 0, CX + 120, 0, [[0, '#d9dde3'], [.5, '#ffffff'], [1, '#d4d8de']]); c.beginPath(); c.moveTo(CX - 112, 735); c.lineTo(CX, 1150); c.lineTo(CX + 112, 735); c.closePath(); c.fill();
    cut(c, () => c.ellipse(CX, 726, 70, 24, 0, 0, 7));
    c.fillStyle = '#f4f5f7'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(CX + s * 72, 724); c.lineTo(CX + s * 8, 790); c.lineTo(CX + s * 100, 796); c.closePath(); c.fill(); }
    for (const s of [-1, 1]) { c.fillStyle = lin(c, CX + s * 200, 0, CX, 0, [[0, '#0d0d0f'], [1, '#3a3a40']]); c.beginPath(); c.moveTo(CX + s * 112, 735); c.lineTo(CX + s * 14, 1146); c.lineTo(CX + s * 150, 930); c.lineTo(CX + s * 186, 836); c.lineTo(CX + s * 150, 820); c.closePath(); c.fill(); }
    c.fillStyle = '#121214'; c.beginPath(); c.moveTo(CX, 780); c.lineTo(CX - 58, 752); c.lineTo(CX - 58, 812); c.closePath(); c.fill(); c.beginPath(); c.moveTo(CX, 780); c.lineTo(CX + 58, 752); c.lineTo(CX + 58, 812); c.closePath(); c.fill(); c.fillStyle = '#2a2a30'; rr(c, CX - 14, 766, 28, 28, 6); c.fill();
    for (const y of [1196, 1290]) { c.fillStyle = '#1b1b1f'; c.beginPath(); c.arc(CX, y, 14, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(CX - 4, y - 4, 4, 0, 7); c.fill(); }
    c.fillStyle = '#fff6dd'; c.beginPath(); c.moveTo(CX + 170, 940); c.lineTo(CX + 196, 900); c.lineTo(CX + 222, 940); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 5; c.beginPath(); c.moveTo(CX + 150, 942); c.lineTo(CX + 270, 942); c.stroke();
  } },
  senator: { body(c, r) {
    torso(c, 326); c.fillStyle = across(c, ['#040404', '#1a1a1a', '#2c2c2c', '#1a1a1a', '#040404']); c.fill();
    cut(c, () => c.ellipse(CX, 712, 68, 24, 0, 0, 7));
    c.lineWidth = 30; c.strokeStyle = '#121212'; c.beginPath(); c.ellipse(CX, 714, 84, 36, 0, .05, Math.PI - .05); c.stroke();
    c.strokeStyle = '#e2b84a'; c.lineWidth = 3; c.beginPath(); c.ellipse(CX, 714, 99, 51, 0, .08, Math.PI - .08); c.stroke();
    c.strokeStyle = '#e2b84a'; c.lineWidth = 3; c.beginPath(); c.moveTo(CX + 26, 762); c.lineTo(CX + 26, H); c.stroke();
    c.fillStyle = '#e2b84a'; for (let y = 790; y < H; y += 34) { c.save(); c.translate(CX - 8, y); c.rotate(.785); c.strokeStyle = '#e2b84a'; c.lineWidth = 3; c.strokeRect(-8, -8, 16, 16); c.restore(); c.beginPath(); c.arc(CX - 8, y + 17, 2.5, 0, 7); c.fill(); }
    c.lineWidth = 3; c.beginPath(); c.moveTo(CX + 150, 930); c.lineTo(CX + 262, 930); c.stroke();
    for (let i = 0; i < 4; i++) { c.fillStyle = `rgba(255,255,255,${.03 + i * .01})`; c.beginPath(); c.ellipse(CX - 160 + i * 110, 1050, 18, 200, .05, 0, 7); c.fill(); }
  } },
  gown: { body(c, r) {
    c.beginPath(); c.moveTo(CX - 335, 905); c.quadraticCurveTo(CX - 170, 862, CX, 912); c.quadraticCurveTo(CX + 170, 862, CX + 335, 905); c.lineTo(CX + 410, H + 10); c.lineTo(CX - 410, H + 10); c.closePath();
    c.fillStyle = pattern(c, 'ankara:#b0186a,#f5b83d,#17845a,#2b0f3a'); c.fill();
    c.strokeStyle = '#f5b83d'; c.lineWidth = 8; c.beginPath(); c.moveTo(CX - 335, 905); c.quadraticCurveTo(CX - 170, 862, CX, 912); c.quadraticCurveTo(CX + 170, 862, CX + 335, 905); c.stroke();
    for (const s of [-1, 1]) { const x = CX + s * 318, y = 930;
      c.fillStyle = pattern(c, 'ankara:#b0186a,#f5b83d,#17845a,#2b0f3a'); c.beginPath(); c.ellipse(x, y, 132, 112, s * .2, 0, 7); c.fill();
      c.fillStyle = rad(c, x - s * 30, y - 40, 10, 150, [[0, 'rgba(255,255,255,.18)'], [1, 'rgba(0,0,0,.35)']]); c.beginPath(); c.ellipse(x, y, 132, 112, s * .2, 0, 7); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 5; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * 40, y - 100 + Math.abs(k) * 12); c.quadraticCurveTo(x + k * 52, y, x + k * 40, y + 100 - Math.abs(k) * 12); c.stroke(); } }
  } },
  jersey: { body(c, r) {
    torso(c); c.fillStyle = across(c, ['#05522f', '#0b8a4f', '#12a560', '#0b8a4f', '#05522f']); c.fill();
    c.save(); torso(c); c.clip();
    c.fillStyle = '#f4f7f5'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(CX + s * 150, 700); c.lineTo(CX + s * 420, 760); c.lineTo(CX + s * 470, H); c.lineTo(CX + s * 300, H); c.quadraticCurveTo(CX + s * 270, 900, CX + s * 210, 800); c.closePath(); c.fill(); }
    c.strokeStyle = '#0b8a4f'; c.lineWidth = 10; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(CX + s * 300, H); c.quadraticCurveTo(CX + s * 270, 900, CX + s * 210, 800); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 24; for (const y of [990, 1050]) { c.beginPath(); c.moveTo(CX - 260, y - 70); c.lineTo(CX, y); c.lineTo(CX + 260, y - 70); c.stroke(); }
    c.fillStyle = pattern(c, 'mesh'); c.fillRect(0, 600, W, H); c.restore();
    cut(c, () => { c.moveTo(CX - 74, 726); c.lineTo(CX, 826); c.lineTo(CX + 74, 726); c.closePath(); });
    c.strokeStyle = '#ffffff'; c.lineWidth = 16; c.beginPath(); c.moveTo(CX - 82, 724); c.lineTo(CX, 836); c.lineTo(CX + 82, 724); c.stroke();
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.font = `900 150px ${FONT}`; c.fillText('26', CX, 1250); c.font = `900 40px ${FONT}`; c.fillText('NAIJA', CX - 170, 905);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(CX + 150, 862); c.lineTo(CX + 214, 862); c.lineTo(CX + 214, 902); c.quadraticCurveTo(CX + 182, 940, CX + 150, 902); c.closePath(); c.fill(); c.fillStyle = '#0b8a4f'; c.fillRect(CX + 172, 862, 20, 62);
  } },
};
function hatSanta(c, r) {
  c.beginPath(); c.moveTo(CX - 168, 330); c.quadraticCurveTo(CX - 120, 120, CX + 120, 74); c.quadraticCurveTo(CX + 260, 60, CX + 296, 240); c.lineTo(CX + 250, 250); c.quadraticCurveTo(CX + 220, 150, CX + 150, 170); c.quadraticCurveTo(CX + 170, 250, CX + 168, 326); c.closePath();
  c.fillStyle = lin(c, CX - 170, 0, CX + 290, 0, [[0, '#7a0a12'], [.45, '#d32735'], [1, '#8a0d16']]); c.fill();
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.moveTo(CX + 120, 74); c.quadraticCurveTo(CX + 40, 200, CX + 60, 320); c.lineTo(CX + 168, 326); c.quadraticCurveTo(CX + 170, 250, CX + 150, 170); c.closePath(); c.fill();
  fur(c, arc(CX, 410, 190, 92, Math.PI + .5, Math.PI * 2 - .5, 18), 74, r);
  fur(c, [[CX + 286, 252], [CX + 288, 254]], 96, r);
}
OUT.santa.front = hatSanta;

// ---------- the person ----------
function drawSkin(c, skin, bare) {
  const d = shade(skin, -.3), m = shade(skin, 0), l = shade(skin, .06);
  if (bare) { torso(c, 330); c.fillStyle = across(c, [shade(skin, -.4), d, l, d, shade(skin, -.42)]); c.fill();
    c.strokeStyle = shade(skin, -.22); c.lineWidth = 5; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(CX + s * 30, 805); c.quadraticCurveTo(CX + s * 110, 790, CX + s * 190, 800); c.stroke(); } }
  else { c.fillStyle = across(c, [d, d, m, d, d]); c.beginPath(); c.moveTo(CX - 170, 790); c.lineTo(CX + 170, 790); c.lineTo(CX + 60, 1180); c.lineTo(CX - 60, 1180); c.closePath(); c.fill(); }
  c.fillStyle = lin(c, CX - 80, 0, CX + 80, 0, [[0, d], [.5, m], [1, d]]);
  c.beginPath(); c.moveTo(CX - 66, 585); c.lineTo(CX + 66, 585); c.bezierCurveTo(CX + 68, 700, CX + 92, 742, CX + 160, 795); c.lineTo(CX - 160, 795); c.bezierCurveTo(CX - 92, 742, CX - 68, 700, CX - 66, 585); c.closePath(); c.fill();
  c.fillStyle = rad(c, CX, 625 + DY, 0, 110, [[0, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(CX - 140, 560, 280, 200);
}
// Fades out the wall behind the face: samples the colour at the edge of the oval and makes similar
// pixels near the edge transparent (the middle of the face is never touched).
function keyBackground(c) {
  let img; try { img = c.getImageData(0, 0, FW, FH); } catch { return; }
  const d = img.data, ring = [];
  for (let a = 0; a < 6.283; a += .05) { const x = Math.round(FW / 2 + Math.cos(a) * FW * .46), y = Math.round(FH / 2 + Math.sin(a) * FH * .46); if (y > FH * .78) continue; const i = (y * FW + x) * 4; if (d[i + 3] > 200) ring.push([d[i], d[i + 1], d[i + 2]]); }
  if (ring.length < 40) return; // transparent or tiny: nothing to key
  const mean = [0, 1, 2].map(k => ring.reduce((s, p) => s + p[k], 0) / ring.length);
  const spread = Math.sqrt(ring.reduce((s, p) => s + (p[0] - mean[0]) ** 2 + (p[1] - mean[1]) ** 2 + (p[2] - mean[2]) ** 2, 0) / ring.length);
  if (spread > 60) return; // busy background: keying would eat the face, the feather is enough
  const lo = 22 + spread * .8, hi = lo + 34;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const nx = (x - FW / 2) / (FW / 2), ny = (y - FH / 2) / (FH / 2), r = Math.sqrt(nx * nx + ny * ny); if (r < .5 || ny > .62) continue;
    const i = (y * FW + x) * 4, dist = Math.sqrt((d[i] - mean[0]) ** 2 + (d[i + 1] - mean[1]) ** 2 + (d[i + 2] - mean[2]) ** 2);
    const keep = Math.min(1, Math.max(0, (dist - lo) / (hi - lo))), edge = Math.min(1, (r - .5) / .18);
    d[i + 3] = d[i + 3] * (1 - (1 - keep) * edge);
  }
  c.putImageData(img, 0, 0);
}
export function featherFace(face) {
  const f = mk(FW, FH), c = f.getContext('2d'); c.drawImage(face, 0, 0, FW, FH); keyBackground(c);
  c.save(); c.globalCompositeOperation = 'destination-in'; c.translate(FW / 2, FH / 2); c.scale(1, FH / FW);
  c.fillStyle = rad(c, 0, 0, FW * .5 * .74, FW * .5, [[0, '#000'], [1, 'rgba(0,0,0,0)']]); c.fillRect(-FW, -FW, FW * 2, FW * 2); c.restore();
  return f;
}
function sampleSkin(face) {
  try {
    const c = face.getContext('2d'), d = c.getImageData(FW * .3 | 0, FH * .48 | 0, FW * .4 | 0, FH * .26 | 0).data, px = [];
    for (let i = 0; i < d.length; i += 16) px.push([d[i], d[i + 1], d[i + 2]]);
    px.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    const mid = px.slice(px.length * .3 | 0, px.length * .7 | 0), avg = [0, 1, 2].map(k => mid.reduce((s, p) => s + p[k], 0) / Math.max(1, mid.length));
    return avg.map(v => v * .9);
  } catch { return hex('#7d5034'); }
}
const LAYERS = new Map();
function layer(key, w, h) { const k = key + w; let c = LAYERS.get(k); if (!c) { c = mk(w, h); LAYERS.set(k, c); } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h); return c; }

// st: { face (feathered, FW×FH), skin [r,g,b], outfit, location, mark: bool, locked: bool, label }
export function compose(out, st) {
  const s = out.width / W, c = out.getContext('2d'), r = seeded(7), O = OUT[st.outfit] || OUT.sweater, L = LOC[st.location] || LOC.studio;
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(background(st.location, s), 0, 0, out.width, out.height);
  const P = layer('p', out.width, out.height), p = P.getContext('2d'); p.setTransform(s, 0, 0, s, 0, 0);
  drawSkin(p, st.skin, st.outfit === 'gown');
  if (O.back) { p.save(); p.translate(0, DY + (st.outfit === 'asoebi' ? 22 : 0)); O.back(p, r); p.restore(); }
  const C = layer('c', out.width, out.height), k = C.getContext('2d'); k.setTransform(s, 0, 0, s, 0, 0); O.body(k, r); shadeCloth(k);
  p.save(); p.setTransform(1, 0, 0, 1, 0, 0); p.drawImage(C, 0, 0); p.restore();
  p.drawImage(st.face, HEAD.x - HEAD.w / 2, HEAD.y - HEAD.h / 2 + DY, HEAD.w, HEAD.h);
  if (O.front) { p.save(); p.translate(0, DY + (st.outfit === 'asoebi' ? 22 : 0)); O.front(p, r); p.restore(); }
  p.save(); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-atop'; p.globalAlpha = .13; p.fillStyle = L.tint; p.fillRect(0, 0, P.width, P.height);
  p.globalAlpha = .22; p.fillStyle = lin(p, 0, 0, P.width, 0, [[0, 'rgba(0,0,0,0)'], [.8, 'rgba(0,0,0,0)'], [1, rgba(L.tint, 1)]]); p.fillRect(0, 0, P.width, P.height); p.restore();
  c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 50 * s; c.shadowOffsetY = 12 * s; c.drawImage(P, 0, 0); c.restore();
  finishFrame(out, st, .42);
}
// vignette, location label, Detty mark and preview watermark. Used for Studio and for AI pictures.
export function finishFrame(out, st, vig = .3) {
  const s = out.width / W, c = out.getContext('2d');
  c.setTransform(s, 0, 0, s, 0, 0);
  c.fillStyle = rad(c, CX, 620, 420, 1000, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${vig})`]]); c.fillRect(0, 0, W, H);
  c.fillStyle = lin(c, 0, 1120, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.6)']]); c.fillRect(0, 1120, W, H - 1120);
  if (st.label) { c.font = `800 32px ${FONT}`; const t = st.label, tw = c.measureText(t).width; c.fillStyle = 'rgba(0,0,0,.45)'; rr(c, 40, 1252, tw + 44, 58, 29); c.fill(); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(t, 62, 1292); }
  if (st.mark) { c.textAlign = 'right'; c.fillStyle = '#F5B83D'; c.font = `900 40px ${FONT}`; c.fillText('Detty December', W - 44, 1278); c.fillStyle = 'rgba(255,255,255,.85)'; c.font = `700 23px ${FONT}`; c.fillText("Christmas Drip Booth · '26", W - 44, 1310); }
  if (st.locked) { c.save(); c.translate(CX, H / 2); c.rotate(-.42); c.textAlign = 'center'; c.font = `900 92px ${FONT}`; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.35)'; c.fillStyle = 'rgba(255,255,255,.5)';
    for (const y of [-420, 0, 420]) { c.strokeText('PREMIUM PREVIEW', 0, y); c.fillText('PREMIUM PREVIEW', 0, y); } c.restore(); }
  c.setTransform(1, 0, 0, 1, 0, 0);
}

// a drawn sample face for demos (never a real person)
export function sampleFace() {
  const f = mk(FW, FH), c = f.getContext('2d'), sk = '#8a5a3c';
  c.fillStyle = '#1b120e'; for (let i = 0; i < 60; i++) { const a = Math.PI + (i / 60) * Math.PI, x = 240 + Math.cos(a) * 160, y = 250 + Math.sin(a) * 150; c.beginPath(); c.arc(x, y, 46, 0, 7); c.fill(); }
  c.beginPath(); c.ellipse(240, 200, 168, 120, 0, 0, 7); c.fill();
  c.fillStyle = shade(sk, -.1); for (const x of [78, 402]) { c.beginPath(); c.ellipse(x, 330, 26, 42, 0, 0, 7); c.fill(); }
  c.fillStyle = rad(c, 220, 280, 40, 230, [[0, shade(sk, .12)], [1, shade(sk, -.18)]]); c.beginPath(); c.ellipse(240, 335, 162, 212, 0, 0, 7); c.fill();
  c.fillStyle = '#1b120e'; c.beginPath(); c.ellipse(240, 150, 170, 62, 0, Math.PI, 0); c.fill();
  c.strokeStyle = '#1b120e'; c.lineWidth = 11; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(240 + s * 40, 252); c.quadraticCurveTo(240 + s * 80, 236, 240 + s * 120, 252); c.stroke(); }
  for (const s of [-1, 1]) { const x = 240 + s * 78; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, 300, 30, 17, 0, 0, 7); c.fill(); c.fillStyle = '#2a170c'; c.beginPath(); c.arc(x + s * 2, 301, 13, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + s * 2 - 5, 296, 4, 0, 7); c.fill(); c.strokeStyle = '#2a170c'; c.lineWidth = 4; c.beginPath(); c.ellipse(x, 300, 31, 18, 0, Math.PI + .2, -.2); c.stroke(); }
  c.fillStyle = shade(sk, -.22); c.beginPath(); c.moveTo(232, 310); c.quadraticCurveTo(222, 370, 206, 382); c.quadraticCurveTo(240, 398, 274, 382); c.quadraticCurveTo(258, 370, 248, 310); c.fill();
  c.fillStyle = '#5a2e22'; c.beginPath(); c.moveTo(172, 432); c.quadraticCurveTo(240, 512, 308, 432); c.quadraticCurveTo(240, 456, 172, 432); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(186, 438); c.quadraticCurveTo(240, 462, 294, 438); c.quadraticCurveTo(240, 478, 186, 438); c.fill();
  c.fillStyle = 'rgba(214,90,90,.16)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(240 + s * 102, 392, 34, 20, 0, 0, 7); c.fill(); }
  return f;
}

// ---------- the booth UI ----------
const store = { get(k, d) { try { const v = localStorage.getItem('n25_sw_' + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('n25_sw_' + k, JSON.stringify(v)); return true; } catch { return false; } } };
const buzz = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
const escH = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = {
  close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  cam: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="4"/></svg>',
  img: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  flip: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a8 8 0 0114-3l2 2M20 15a8 8 0 01-14 3l-2-2"/><path d="M20 4v4h-4M4 20v-4h4"/></svg>',
  timer: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
  dl: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  share: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M7 8l5-5 5 5M5 13v7h14v-7"/></svg>',
  dice: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M7 10V8a5 5 0 0110 0v2h1v11H6V10zm2 0h6V8a3 3 0 00-6 0z"/></svg>',
  spark: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2l2.2 6.3L20 10l-5.8 1.7L12 18l-2.2-6.3L4 10l5.8-1.7zM19 15l1 2.6 2.6 1-2.6 1L19 22l-1-2.4-2.6-1 2.6-1z"/></svg>',
};

// ---------- real photo spots ----------
let SPOTS_P = null;
const loadSpots = () => (SPOTS_P = SPOTS_P || fetch('/api/spots').then(r => r.json()).catch(() => ({ spots: [], outfitImgs: {} })));
const IMG = new Map();
function loadImg(src) { if (!IMG.has(src)) IMG.set(src, new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = src; })); return IMG.get(src); }
const BGS = new Map();
// background canvas for a spot at a size: the real photo (cover, light depth blur) or the drawn fallback
async function spotBg(spot, w, h) {
  const key = spot.id + (spot.img || '') + '@' + w;
  if (BGS.has(key)) return BGS.get(key);
  let c;
  if (spot.img) {
    try { const im = await loadImg(spot.img); c = mk(w, h); const g = c.getContext('2d'), k = Math.max(w / im.width, h / im.height); g.drawImage(im, (w - im.width * k) / 2, (h - im.height * k) / 2, im.width * k, im.height * k); c = blurInto(c, Math.max(1, w / 540)); }
    catch { c = null; }
  }
  if (!c) { c = mk(w, h); c.getContext('2d').drawImage(background(spot.fallback || 'studio', w / W), 0, 0, w, h); }
  const g = c.getContext('2d'), d = g.getImageData(0, Math.round(h * .3), w, Math.round(h * .5)).data; let r = 0, gg = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 64) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
  c.stats = { rgb: [r / n, gg / n, b / n], lum: (r * .3 + gg * .59 + b * .11) / n };
  if (BGS.size > 30) BGS.delete(BGS.keys().next().value); BGS.set(key, c); return c;
}

// ---------- cut the person out of the selfie, on the phone (MediaPipe) ----------
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
const MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
let SEG = null;
function segmenter() {
  return (SEG = SEG || (async () => {
    const v = await import(/* @vite-ignore */ MP + '/vision_bundle.mjs');
    const files = await v.FilesetResolver.forVisionTasks(MP + '/wasm');
    return v.ImageSegmenter.createFromOptions(files, { baseOptions: { modelAssetPath: MP_MODEL, delegate: 'CPU' }, runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true });
  })().catch(e => { SEG = null; throw e; }));
}
export function warmCutout() { segmenter().catch(() => {}); }
async function cutout(img) {
  const seg = await segmenter(), res = seg.segment(img), m = res.confidenceMasks[0], w = m.width, h = m.height, conf = m.getAsFloat32Array();
  const mc = mk(w, h), mx = mc.getContext('2d'), id = mx.createImageData(w, h);
  let x0 = w, y0 = h, x1 = 0, y1 = 0, on = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, a = conf[i], t = Math.min(1, Math.max(0, (a - .3) / .45)); id.data[i * 4 + 3] = t * 255; if (a > .5) { on++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  try { res.close(); } catch {}
  mx.putImageData(id, 0, 0);
  const out = mk(img.width, img.height), o = out.getContext('2d'); o.drawImage(img, 0, 0);
  o.globalCompositeOperation = 'destination-in'; if (CAN_FILTER) o.filter = `blur(${Math.max(1, img.width / 700)}px)`; o.drawImage(mc, 0, 0, img.width, img.height); o.filter = 'none';
  const sx = img.width / w, sy = img.height / h, cover = on / (w * h);
  const box = { x: x0 * sx, y: y0 * sy, w: (x1 - x0 + 1) * sx, h: (y1 - y0 + 1) * sy, cut: y1 >= h - 3 };
  // the person's average colour and brightness, for light matching
  const sm = mk(48, 48 * img.height / img.width), sg = sm.getContext('2d'); sg.drawImage(out, 0, 0, sm.width, sm.height); const pd = sg.getImageData(0, 0, sm.width, sm.height).data; let L = 0, n = 0;
  for (let i = 0; i < pd.length; i += 4) if (pd[i + 3] > 200) { L += pd[i] * .3 + pd[i + 1] * .59 + pd[i + 2] * .11; n++; }
  return { canvas: out, box, cover, lum: n ? L / n : 128 };
}

// ---------- Christmas decor drawn over the real photo ----------
const DECOR = [
  { id: 'lights', name: 'Fairy lights', emoji: '💡' }, { id: 'sparkle', name: 'Gold sparkle', emoji: '✨' }, { id: 'snow', name: 'Snow', emoji: '❄️' },
  { id: 'frame', name: 'Merry frame', emoji: '🖼️' }, { id: 'confetti', name: 'Confetti', emoji: '🎉' }, { id: 'none', name: 'Clean', emoji: '🚫' },
];
function drawDecor(c, id, r) {
  if (id === 'lights') {
    for (const [y0, sag, off] of [[-10, 120, 0], [-30, 80, .5]]) {
      c.strokeStyle = '#1d2a22'; c.lineWidth = 4; c.beginPath(); c.moveTo(-20, y0); c.quadraticCurveTo(540, y0 + sag * 2, 1100, y0); c.stroke();
      for (let i = 0; i < 16; i++) { const t = (i + off + .5) / 16, x = -20 + t * 1120, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0 + 14, col = ['#ff4d5e', '#ffd34d', '#66e08a', '#7fc4ff', '#ff9a3c'][i % 5];
        glow(c, x, y + 12, 46, col, .55); c.fillStyle = col; c.beginPath(); c.ellipse(x, y + 14, 10, 15, 0, 0, 7); c.fill(); c.fillStyle = '#2b3b33'; c.fillRect(x - 6, y - 4, 12, 9); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x - 3, y + 9, 3, 0, 7); c.fill(); }
    }
  } else if (id === 'sparkle') {
    bokeh(c, r, 26, ['#ffe39a', '#f5b83d', '#ffffff'], 0, H, [8, 34], [.18, .45]);
    for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H * .7, s = 6 + r() * 14; c.fillStyle = `rgba(255,236,170,${.6 + r() * .4})`; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * .25, y - s * .25); c.lineTo(x + s, y); c.lineTo(x + s * .25, y + s * .25); c.lineTo(x, y + s); c.lineTo(x - s * .25, y + s * .25); c.lineTo(x - s, y); c.lineTo(x - s * .25, y - s * .25); c.fill(); }
  } else if (id === 'snow') {
    for (let i = 0; i < 220; i++) { const s = 2 + r() * 6; c.fillStyle = `rgba(255,255,255,${.5 + r() * .5})`; c.beginPath(); c.arc(r() * W, r() * H, s, 0, 7); c.fill(); }
    bokeh(c, r, 14, ['#ffffff'], 0, H, [14, 36], [.12, .3]);
  } else if (id === 'confetti') {
    for (let i = 0; i < 120; i++) { c.save(); c.translate(r() * W, r() * H * .75); c.rotate(r() * 6); c.fillStyle = pick(['#f5b83d', '#d7263d', '#ffffff', '#2e9b72', '#7fc4ff'], r); c.globalAlpha = .7 + r() * .3; c.fillRect(-10, -4, 20, 8); c.restore(); }
  } else if (id === 'frame') {
    c.strokeStyle = '#F5B83D'; c.lineWidth = 14; rr(c, 26, 26, W - 52, H - 52, 34); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; rr(c, 46, 46, W - 92, H - 92, 24); c.stroke();
    c.save(); c.textAlign = 'center'; c.font = `900 64px ${FONT}`; c.lineWidth = 10; c.strokeStyle = 'rgba(0,0,0,.35)'; c.strokeText('Merry Christmas', CX, 140); c.fillStyle = '#FFE7A3'; c.fillText('Merry Christmas', CX, 140); c.restore();
    for (const [x, y] of [[70, 70], [W - 70, 70]]) { c.fillStyle = '#d7263d'; c.beginPath(); c.arc(x, y + 30, 22, 0, 7); c.fill(); c.fillStyle = '#1e7a5a'; c.beginPath(); c.ellipse(x - 22, y + 4, 26, 12, -.5, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + 22, y + 4, 26, 12, .5, 0, 7); c.fill(); }
  }
}

// st: { bg (canvas), cut (cutout), P {x, y, h} (centre x, bottom y, height in picture units), decor, mark, label, ai (Image) }
async function composeSpot(out, spot, st) {
  const s = out.width / W, c = out.getContext('2d'), r = seeded(spot.id.length * 31 + (st.decor || '').length);
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (st.ai) { const im = st.ai, k = Math.max(out.width / im.width, out.height / im.height); c.drawImage(im, (out.width - im.width * k) / 2, (out.height - im.height * k) * .35, im.width * k, im.height * k); }
  else {
    const bg = await spotBg(spot, out.width, out.height); c.drawImage(bg, 0, 0);
    if (st.cut) {
      const cv = st.cut.canvas, b = st.cut.box, k = (st.P.h * s) / b.h, dw = cv.width * k, dh = cv.height * k, dx = st.P.x * s - (b.x + b.w / 2) * k, dy = st.P.y * s - (b.y + b.h) * k;
      const L = mk(out.width, out.height), l = L.getContext('2d');
      const bright = Math.max(.82, Math.min(1.18, Math.sqrt((bg.stats.lum + 30) / (st.cut.lum + 30))));
      if (CAN_FILTER) l.filter = `brightness(${bright.toFixed(3)}) saturate(1.04)`;
      l.drawImage(cv, dx, dy, dw, dh); l.filter = 'none';
      l.globalCompositeOperation = 'source-atop'; l.globalAlpha = .14; l.fillStyle = rgba(bg.stats.rgb, 1); l.fillRect(0, 0, L.width, L.height);
      l.globalAlpha = .22; l.fillStyle = lin(l, 0, 0, L.width, 0, [[0, rgba(spot.tint || '#ffd27a', 1)], [.25, 'rgba(0,0,0,0)'], [.75, 'rgba(0,0,0,0)'], [1, rgba(spot.tint || '#ffd27a', 1)]]); l.fillRect(0, 0, L.width, L.height);
      if (!b.cut) { c.save(); c.fillStyle = rad(c, st.P.x * s, st.P.y * s, 0, 120 * s, [[0, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,0)']]); c.setTransform(1, 0, 0, .22, 0, st.P.y * s * .78); c.fillRect(0, 0, out.width, out.height * 2); c.restore(); }
      c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 30 * s; c.shadowOffsetY = 8 * s; c.drawImage(L, 0, 0); c.restore();
    }
  }
  c.setTransform(s, 0, 0, s, 0, 0); if (st.decor && st.decor !== 'none') drawDecor(c, st.decor, r);
  finishFrame(out, { mark: st.mark, label: st.label }, .26);
}

// ---------- the Party card demo: real spots slideshow ----------
export function swapDemo(host) {
  if (!host) return () => {};
  host.innerHTML = `<div class="swd"><div class="swd-frame"><canvas class="swd-a"></canvas><canvas class="swd-b"></canvas><span class="swd-badge">📍 SPOTS</span><span class="swd-cap"></span></div></div>`;
  const a = host.querySelector('.swd-a'), b = host.querySelector('.swd-b'), cap = host.querySelector('.swd-cap');
  const px = Math.min(2, devicePixelRatio || 1), w = Math.max(270, Math.min(540, Math.round((host.clientWidth || 160) * px * 1.1)));
  [a, b].forEach(c => { c.width = w; c.height = Math.round(w * 1.25); });
  let i = 0, front = a, timer = null, alive = true, visible = true, list = [];
  const decor = ['lights', 'sparkle', 'snow', 'confetti'];
  const show = async () => {
    if (!alive || !list.length) return; const sp = list[i % list.length], back = front === a ? b : a;
    await composeSpot(back, sp, { decor: decor[i % decor.length], mark: false, label: '' });
    back.classList.add('on'); front.classList.remove('on'); front = back; cap.textContent = `${sp.emoji} ${sp.name} · ${sp.city}`; i++;
  };
  const loop = () => { clearTimeout(timer); if (!alive) return; if (visible && !document.hidden) show(); timer = setTimeout(loop, 2800); };
  loadSpots().then(d => { list = d.spots.slice().sort((x, y) => (y.img ? 1 : 0) - (x.img ? 1 : 0)); if (matchMedia('(prefers-reduced-motion: reduce)').matches) show(); else loop(); });
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }) : null; if (io) io.observe(host);
  return () => { alive = false; clearTimeout(timer); if (io) io.disconnect(); };
}

// ---------- the booth ----------
export async function openSwap(x) {
  const { api, toast, track, beep, confetti, sheet, premiumSheet, redeemSheet, token, refCode } = x;
  let C, SP; try { [C, SP] = await Promise.all([api('/api/swap/config'), loadSpots()]); } catch (e) { return toast(e.message); }
  if (!SP.spots.length) return toast('Photo spots no load. Check your data and try again.');
  track('swap_open'); warmCutout();
  const ov = document.createElement('div'); ov.className = 'overlay swap'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  let stream = null, stopDemo = () => {}, plans = null, screen = 'home';
  const st = { img: null, cut: null, P: null, spot: (SP.spots.find(z => z.img) || SP.spots[0]).id, outfit: 'own', decor: 'lights', mark: true, ai: null, aiFor: '', how: '', dirty: false };
  const SPOT = (id) => SP.spots.find(z => z.id === id), OUTF = (id) => id === 'own' ? { id: 'own', name: 'My own clothes', emoji: '👕' } : C.outfits.find(z => z.id === id);
  const stopCam = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };
  const destroy = () => { stopCam(); stopDemo(); ov.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc, true); };
  const close = () => { if (st.dirty && screen === 'studio') return confirmLeave(destroy); destroy(); };
  const esc = (e) => { if (e.key === 'Escape' && !document.querySelector('.sheet-bg')) close(); }; document.addEventListener('keydown', esc, true);
  const go = (fn) => { ov.classList.remove('swx-in'); void ov.offsetWidth; ov.classList.add('swx-in'); fn(); ov.scrollTop = 0; };
  async function upgraded() { try { C = await api('/api/swap/config'); } catch { return; } if (screen === 'studio') studio(); else if (screen === 'home') home(); }
  const bar = (title, back) => `<div class="swx-top">${back ? `<button class="swx-ic swx-back" aria-label="${escH(back)}">${ICON.back}</button>` : `<button class="swx-ic swx-x" aria-label="Close">${ICON.close}</button>`}
    <b class="swx-ttl">${title}</b>${C.premium ? '<em class="swx-crown">👑 PREMIUM</em>' : '<button class="swx-up">Go Premium</button>'}${back ? `<button class="swx-ic swx-x" aria-label="Close">${ICON.close}</button>` : ''}</div>`;
  const wire = (onBack) => { ov.querySelectorAll('.swx-x').forEach(b => b.onclick = close); const bk = ov.querySelector('.swx-back'); if (bk) bk.onclick = onBack; const up = ov.querySelector('.swx-up'); if (up) up.onclick = () => paywall('top'); };
  const aiLine = () => !C.ai ? 'Coming soon' : C.aiLeft ? `${C.aiLeft} of ${C.aiDaily} left today` : C.premium ? 'Used up today' : 'Free one used today';

  // ---------- popups ----------
  function confirmLeave(then) {
    const bg = sheet(`<div class="swx-sh"><span class="swx-sh-ic">🥺</span><h3>Leave without saving?</h3><p>Your Christmas picture is not saved yet. If you leave now, you go lose it.</p>
      <div class="swx-sh-acts"><button class="btn btn-gold" id="lvStay">Keep editing</button><button class="btn swx-ghost" id="lvGo">Leave anyway</button></div></div>`);
    bg.querySelector('#lvStay').onclick = () => bg.remove(); bg.querySelector('#lvGo').onclick = () => { bg.remove(); st.dirty = false; then(); };
  }
  function tipsThen(next) {
    if (store.get('tips2', false)) return next();
    const bg = sheet(`<div class="swx-sh"><span class="swx-sh-ic">📸</span><h3>3 tips for a real-looking picture</h3>
      <ul class="swx-tips"><li><i>☀️</i><span><b>Good light on your face</b><small>Daylight or a bright room. No dark corners.</small></span></li><li><i>🧍🏾</i><span><b>Show yourself from the waist up</b><small>Stand a little back. Just you in the picture.</small></span></li><li><i>🧱</i><span><b>Plain background helps</b><small>A wall behind you makes the cutout cleaner.</small></span></li></ul>
      <p class="swx-fine">🔒 We'll ask to use your camera. Photo Spot pictures are made on this phone. Nothing is uploaded.</p>
      <button class="btn btn-gold" id="tpGo">Got it, let's go</button></div>`, { onClose: () => store.set('tips2', true) });
    bg.querySelector('#tpGo').onclick = () => { bg.remove(); next(); };
  }
  function camBlocked() {
    const bg = sheet(`<div class="swx-sh"><span class="swx-sh-ic">🚫📷</span><h3>Camera is blocked</h3><p>Your browser didn't let us use the camera. To allow it:</p>
      <ol class="swx-steps"><li>Tap the <b>🔒</b> or <b>ⓘ</b> next to the web address</li><li>Set <b>Camera</b> to <b>Allow</b></li><li>Come back and tap <b>Try again</b></li></ol>
      <div class="swx-sh-acts"><button class="btn btn-gold" id="cbUp">${ICON.img} Upload a photo instead</button><button class="btn swx-ghost" id="cbTry">Try again</button></div></div>`);
    bg.querySelector('#cbUp').onclick = () => { bg.remove(); fileInput(false); }; bg.querySelector('#cbTry').onclick = () => { bg.remove(); camera(); };
  }
  function chooseSource() {
    const s = SPOT(st.spot);
    const bg = sheet(`<div class="swx-sh"><span class="swx-sh-ic">${s.emoji}</span><h3>Add yourself</h3><p>${escH(s.name)}, ${escH(s.city)} is lit up and waiting for you.</p>
      <div class="swx-src"><button id="srCam">${ICON.cam}<b>Take a selfie</b><small>Best results</small></button><button id="srUp">${ICON.img}<b>Upload a photo</b><small>From your gallery</small></button></div></div>`);
    bg.querySelector('#srCam').onclick = () => { bg.remove(); tipsThen(camera); }; bg.querySelector('#srUp').onclick = () => { bg.remove(); fileInput(false); };
  }
  function noPerson() {
    const bg = sheet(`<div class="swx-sh"><span class="swx-sh-ic">🔍</span><h3>We no see you well</h3><p>We couldn't find a person clearly in that photo. Try one where you're facing the camera, in good light, from the waist up.</p>
      <div class="swx-sh-acts"><button class="btn btn-gold" id="npCam">${ICON.cam} Take a new selfie</button><button class="btn swx-ghost" id="npUp">Upload another photo</button></div></div>`);
    bg.querySelector('#npCam').onclick = () => { bg.remove(); camera(); }; bg.querySelector('#npUp').onclick = () => { bg.remove(); fileInput(false); };
  }
  async function paywall(from, preview) {
    track('premium_view', { from: 'swap_' + from });
    if (!plans) { try { const g = await api('/api/gist/config'); plans = { list: g.plans, interested: g.interested }; } catch (e) { return premiumSheet('swap'); } }
    let pick = (plans.list.find(p => p.best) || plans.list[0]).id;
    const bg = sheet(`<div class="swx-pay">
      ${preview ? `<div class="swx-pay-pic"><img src="${preview}" alt=""><span>👑 Your picture</span></div>` : '<div class="swx-pay-ic">👑</div>'}
      <h3>Go <span class="swx-gold">Premium</span> for December</h3>
      <ul class="swx-feat"><li>${ICON.check}<span><b>${C.aiPremiumDaily} real AI pictures a day</b><small>New outfit, real spot, your own face${C.ai ? '' : ' (coming soon)'}</small></span></li>
        <li>${ICON.check}<span><b>HD pictures, no watermark</b><small>1080 × 1350, made for status and Instagram</small></span></li>
        <li>${ICON.check}<span><b>All 6 Gist Partners + voice</b><small>Your padi gists you about your real game</small></span></li>
        <li>${ICON.check}<span><b>Every Photo Spot stays free</b><small>Premium just makes it even better</small></span></li></ul>
      <div class="swx-plans">${plans.list.map(p => `<button class="swx-plan ${p.id === pick ? 'on' : ''}" data-pl="${p.id}">${p.best ? '<em>BEST VALUE</em>' : ''}<span class="swx-radio"></span><span class="swx-pl-main"><b>${escH(p.name)}</b><small>${escH(p.blurb)}</small></span><span class="swx-pl-price"><b>₦${p.price.toLocaleString()}</b><small>${p.days} days</small></span></button>`).join('')}</div>
      <button class="btn btn-gold swx-pay-go" id="pwGo">Reserve my spot</button>
      <p class="swx-fine">Payments open very soon. Reserve now and we'll tell you first. No charge today.</p>
      ${redeemSheet ? '<button class="rd-link" id="pwCode">🎟️ Have a code? Enter it</button>' : ''}</div>`);
    const pc = bg.querySelector('#pwCode'); if (pc) pc.onclick = () => { bg.remove(); redeemSheet(upgraded); };
    const sel = () => { bg.querySelectorAll('.swx-plan').forEach(b => b.classList.toggle('on', b.dataset.pl === pick)); const done = plans.interested.includes(pick); const g = bg.querySelector('#pwGo'); g.textContent = done ? '✓ You are on the list' : 'Reserve my spot'; g.disabled = done; };
    bg.querySelectorAll('.swx-plan').forEach(b => b.onclick = () => { pick = b.dataset.pl; buzz(); sel(); }); sel();
    bg.querySelector('#pwGo').onclick = async () => {
      try { await api('/api/premium/interest', { plan: pick }); plans.interested.push(pick); buzz(20); beep && beep('win');
        bg.querySelector('.swx-pay').innerHTML = `<div class="swx-done"><span>🎉</span><h3>You're on the list!</h3><p>The moment premium opens, you'll be the first to know.</p><button class="btn btn-gold" id="pwOk">Back to my picture</button></div>`;
        bg.querySelector('#pwOk').onclick = () => bg.remove(); confetti && confetti(70);
      } catch (e) { toast(e.message); }
    };
  }
  function aiSoon() {
    const bg = sheet(`<div class="swx-sh"><span class="swx-sh-ic swx-spark">${ICON.spark}</span><h3>Make it real is coming</h3>
      <p>Soon, one tap will redraw you at the spot as a real photo, in any outfit you pick: agbada, gele, senator, Father Christmas…</p>
      <button class="btn btn-gold" id="aiOk">Okay, can't wait</button></div>`);
    bg.querySelector('#aiOk').onclick = () => bg.remove();
  }
  function savedSheet(url, b, text) {
    const bg = sheet(`<div class="swx-sh swx-saved"><div class="swx-saved-pic"><img src="${url}" alt="Your picture"><span class="swx-burst">✓</span></div>
      <h3>Saved! Your picture is ready 🎉</h3><p>Check your downloads or gallery. Now make them jealous.</p>
      <div class="swx-sh-acts"><button class="btn btn-wa" id="svWa">${ICON.share} Post to WhatsApp status</button><button class="btn swx-ghost" id="svMore">Try another spot</button></div>
      ${C.premium ? '' : '<button class="swx-upsell" id="svUp">👑 <span><b>Remove the watermark, go HD</b><small>Plus 10 real AI pictures a day</small></span><i>›</i></button>'}</div>`);
    bg.querySelector('#svWa').onclick = () => shareBlob(b, text);
    bg.querySelector('#svMore').onclick = () => bg.remove();
    const up = bg.querySelector('#svUp'); if (up) up.onclick = () => { bg.remove(); paywall('saved'); };
  }
  function lookSheet(item) {
    const bg = sheet(`<div class="swx-sh swx-saved"><div class="swx-saved-pic"><img src="${item.t}" alt=""></div><h3>${escH(item.n)}</h3><p>${new Date(item.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · small keepsake. Make it again for the full picture.</p>
      <div class="swx-sh-acts"><button class="btn btn-gold" id="lkAgain">Take it again</button><button class="btn swx-ghost" id="lkDel">Remove</button></div></div>`);
    bg.querySelector('#lkAgain').onclick = () => { bg.remove(); if (SPOT(item.l)) st.spot = item.l; chooseSource(); };
    bg.querySelector('#lkDel').onclick = () => { store.set('looks', store.get('looks', []).filter(z => z.at !== item.at)); bg.remove(); home(); };
  }

  // ---------- photo in ----------
  const fileInput = (capture) => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; if (capture) i.capture = 'user'; i.onchange = () => { if (i.files && i.files[0]) loadFile(i.files[0], capture ? 'camera' : 'upload'); }; i.click(); };
  async function loadFile(file, how) {
    try {
      const url = URL.createObjectURL(file), im = new Image(); im.src = url; await im.decode();
      const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), cv = mk(im.naturalWidth * k, im.naturalHeight * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
      stopCam(); st.how = how; track('swap_photo', { how }); prepare(cv);
    } catch { toast('That photo no open. Try a JPG or PNG.'); }
  }
  async function prepare(img) {
    screen = 'cutting'; stopDemo(); st.img = img; st.ai = null;
    ov.innerHTML = `<div class="inner swx swx-cut">${bar('Getting you ready', 'Back')}
      <div class="swx-cutbox"><img src="${img.toDataURL('image/jpeg', .8)}" alt=""><div class="swx-scan"></div></div>
      <b class="swx-cut-t" id="cutT">Cutting you out…</b><small class="swx-cut-s">Made right here on your phone. First time takes a few seconds.</small></div>`;
    wire(() => go(home));
    try {
      const cut = await cutout(img); if (screen !== 'cutting') return;
      if (cut.cover < .03 || cut.box.h < img.height * .2) { go(home); return noPerson(); }
      st.cut = cut; const b = cut.box;
      st.P = { x: CX, y: b.cut ? H + 4 : H * .95, h: b.cut ? H * .64 * Math.min(1.25, img.height / b.h > 1.6 ? 1.1 : 1) : H * .78 };
      st.dirty = true; buzz(15); go(studio);
    } catch (e) { console.error(e); if (screen !== 'cutting') return; go(home); toast('The cutout tool no load. Check your data and try again.'); }
  }

  // ---------- home ----------
  function home() {
    screen = 'home'; stopCam(); stopDemo();
    const looks = store.get('looks', []);
    ov.innerHTML = `<div class="inner swx">${bar('Christmas Photo Booth')}
      <section class="swx-hero"><div id="swHomeDemo"></div></section>
      <h2 class="swx-h">Snap yourself at <span class="swx-gold">Lekki Bridge</span>,<br>without leaving your room.</h2>
      <p class="swx-lede">Real photos of Naija's favourite spots, dressed up for Christmas. Take a selfie and you're there. Free.</p>
      <div class="swx-how"><div><b>1</b><span>Snap</span></div><i></i><div><b>2</b><span>Pick a spot</span></div><i></i><div><b>3</b><span>Dress up</span></div><i></i><div><b>4</b><span>Post am</span></div></div>
      <div class="swx-sec"><h3>Popular spots</h3><small>${SP.spots.length} places · tap one</small></div>
      <div class="swx-trend" id="swSpots">${SP.spots.map(s => `<button class="swx-tc" data-s="${s.id}"><canvas width="240" height="300"></canvas><span class="swx-tc-tag">${s.emoji} ${escH(s.city)}</span><b>${escH(s.name)}</b><small>${s.img ? 'Real photo' : 'Photo coming soon'}</small></button>`).join('')}</div>
      ${looks.length ? `<div class="swx-sec"><h3>Your pictures</h3><small>${looks.length} saved on this phone</small></div><div class="swx-mine">${looks.map((z, i) => `<button data-look="${i}"><img src="${z.t}" alt="${escH(z.n)}"></button>`).join('')}</div>` : ''}
      <div class="swx-trust"><span>🔒<b>Private</b><small>Photo Spot is made on your phone</small></span><span>⚡<b>Instant</b><small>No waiting, no upload</small></span><span>✨<b>Make it real</b><small>${C.ai ? `AI outfits · ${C.aiFreeDaily ? C.aiFreeDaily + ' free a day' : 'premium'}` : 'AI outfits soon'}</small></span></div>
      <div class="swx-bar"><button class="btn btn-gold swx-main" id="swCam">${ICON.cam} Take a selfie</button><button class="swx-side" id="swUp" aria-label="Upload a photo">${ICON.img}<small>Upload</small></button></div></div>`;
    wire();
    stopDemo = swapDemo(ov.querySelector('#swHomeDemo'));
    ov.querySelector('#swCam').onclick = () => { buzz(); tipsThen(camera); }; ov.querySelector('#swUp').onclick = () => { buzz(); fileInput(false); };
    ov.querySelectorAll('.swx-tc').forEach(b => { const s = SPOT(b.dataset.s); composeSpot(b.querySelector('canvas'), s, { decor: 'lights', mark: false, label: '' });
      b.onclick = () => { buzz(); st.spot = s.id; if (st.cut) return go(studio); chooseSource(); }; });
    ov.querySelectorAll('[data-look]').forEach(b => b.onclick = () => lookSheet(looks[+b.dataset.look]));
  }

  // ---------- camera ----------
  async function camera() {
    screen = 'camera'; stopDemo();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return fileInput(true);
    let facing = 'user', timerOn = false;
    ov.innerHTML = `<div class="inner swx swx-cam">${bar('Selfie', 'Back')}
      <div class="sw-stage swx-stage"><video playsinline muted autoplay></video><div class="swx-guide"></div><span class="swx-chip-hint">Waist up, good light, just you</span><button class="swx-timer" id="swTimer" aria-label="3 second timer">${ICON.timer}<small>Off</small></button><div class="sw-count"></div><div class="sw-flash"></div><div class="swx-wait"><span></span>Opening camera…</div></div>
      <p class="swx-hint">Tip: use the timer, prop your phone up, and stand back a little.</p>
      <div class="swx-shoot"><button class="swx-round" id="swUp2" aria-label="Upload a photo">${ICON.img}</button><button class="sw-shutter swx-shutter" id="swSnap" aria-label="Take photo"></button><button class="swx-round" id="swFlip" aria-label="Switch camera">${ICON.flip}</button></div></div>`;
    wire(() => go(home)); ov.querySelector('#swUp2').onclick = () => fileInput(false);
    const v = ov.querySelector('video'), wait = ov.querySelector('.swx-wait');
    const start = async () => { stopCam(); wait.hidden = false; try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1600 } }, audio: false }); if (screen !== 'camera') return stopCam(); v.srcObject = stream; v.classList.toggle('mirror', facing === 'user'); await v.play().catch(() => {}); wait.hidden = true; }
      catch (e) { wait.hidden = true; go(home); if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) camBlocked(); else { toast('No camera found. Upload a photo instead.'); fileInput(false); } } };
    await start();
    ov.querySelector('#swFlip').onclick = () => { buzz(); facing = facing === 'user' ? 'environment' : 'user'; start(); };
    ov.querySelector('#swTimer').onclick = (e) => { buzz(); timerOn = !timerOn; const t = e.currentTarget; t.querySelector('small').textContent = timerOn ? '3s' : 'Off'; t.classList.toggle('on', timerOn); };
    ov.querySelector('#swSnap').onclick = async () => {
      if (!v.videoWidth) return toast('Camera still starting…');
      if (timerOn) { const ct = ov.querySelector('.sw-count'); for (let n = 3; n > 0; n--) { ct.textContent = n; ct.classList.remove('go'); void ct.offsetWidth; ct.classList.add('go'); beep && beep('tap'); await new Promise(z => setTimeout(z, 900)); if (!stream) return; } ct.textContent = ''; }
      buzz(25); const f = ov.querySelector('.sw-flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
      const cv = mk(v.videoWidth, v.videoHeight), g = cv.getContext('2d'); if (facing === 'user') { g.translate(cv.width, 0); g.scale(-1, 1); } g.drawImage(v, 0, 0);
      stopCam(); st.how = 'camera'; track('swap_photo', { how: 'camera' }); setTimeout(() => prepare(cv), 260);
    };
  }

  // ---------- studio ----------
  function studio() {
    screen = 'studio';
    let tab = 'spots', job = 0;
    ov.innerHTML = `<div class="inner swx swx-st">${bar('Your Christmas picture', 'New photo')}
      <div class="swx-prev"><canvas class="swx-main-cv" width="${W}" height="${H}"></canvas><canvas class="swx-before" hidden></canvas>
        <span class="swx-ai-tag" hidden>✨ Made real with AI</span><span class="swx-before-tag" hidden>Your photo</span><span class="swx-drag" id="swDrag">☝🏾 Drag to move · pinch to resize</span>
        <div class="swx-fab"><button id="swDice" aria-label="Surprise me">${ICON.dice}</button><button id="swCmp" aria-label="Hold to see your photo">${ICON.eye}</button></div>
        <div class="swx-want" id="swWant" hidden></div>
        <div class="sw-busy swx-cook" hidden><span></span><b id="swCookT">Making it real…</b><small id="swCookS">About 30 to 60 seconds. Keep the app open.</small><i class="swx-prog"><em id="swCookP"></em></i></div></div>
      <div class="swx-seg swx-seg3" role="tablist"><i class="swx-seg-ind"></i><button class="on" data-tab="spots">📍 Spot</button><button data-tab="outfits">👗 Outfit</button><button data-tab="decor">✨ Decor</button></div>
      <div class="swx-rail" id="swRail"></div>
      <button class="swx-ai" id="swAI"><span class="swx-ai-ic">${ICON.spark}</span><span><b id="swAIt">Make it real</b><small id="swAIs"></small></span><em>${C.ai ? 'AI' : 'SOON'}</em></button>
      ${C.premium ? `<label class="swx-toggle"><span><b>Detty December mark</b><small>Show the brand on your picture</small></span><input type="checkbox" id="swMark" ${st.mark ? 'checked' : ''}><i></i></label>` : ''}
      <div class="swx-bar"><button class="swx-side swx-share" id="swShare">${ICON.share}<small>Share</small></button><button class="btn btn-gold swx-main" id="swSave">${ICON.dl} Save picture</button></div></div>`;
    wire(() => go(home));
    const cv = ov.querySelector('.swx-main-cv'), aiTag = ov.querySelector('.swx-ai-tag'), rail = ov.querySelector('#swRail'), want = ov.querySelector('#swWant');
    const label = () => { const s = SPOT(st.spot); return `${s.emoji} ${s.name}, ${s.city}`; };
    const aiFresh = () => st.ai && st.aiFor === st.spot + '|' + st.outfit;
    let pend = 0;
    const render = () => { const my = ++pend; requestAnimationFrame(async () => {
      if (my !== pend) return;
      await composeSpot(cv, SPOT(st.spot), { cut: st.cut, P: st.P, decor: st.decor, mark: C.premium ? st.mark : true, label: label(), ai: aiFresh() ? st.ai : null });
      cv.classList.remove('pop'); void cv.offsetWidth; cv.classList.add('pop');
      aiTag.hidden = !aiFresh(); ov.querySelector('#swDrag').hidden = !!aiFresh();
      const O = OUTF(st.outfit), needAI = st.outfit !== 'own' && !aiFresh();
      want.hidden = !needAI; if (needAI) want.innerHTML = `${SP.outfitImgs[O.id] ? `<img src="${SP.outfitImgs[O.id]}" alt="">` : `<span>${O.emoji}</span>`}<b>${escH(O.name)}</b><small>Tap ✨ Make it real to wear it</small>`;
      ov.querySelector('#swAIt').textContent = st.outfit === 'own' ? 'Make it real' : `Wear ${O.name}`;
      ov.querySelector('#swAIs').textContent = C.ai ? `${st.outfit === 'own' ? 'AI blends you into the spot' : 'AI dresses you at the spot'} · ${aiLine()}` : 'AI outfits are coming soon';
      ov.querySelector('#swAI').classList.toggle('hot', needAI && C.ai);
    }); };
    function railHtml() {
      if (tab === 'spots') return SP.spots.map(s => `<button class="swx-th ${s.id === st.spot ? 'on' : ''}" data-id="${s.id}"><canvas width="144" height="180"></canvas><b>${escH(s.name)}</b></button>`).join('');
      if (tab === 'decor') return DECOR.map(d => `<button class="swx-th swx-chipd ${d.id === st.decor ? 'on' : ''}" data-id="${d.id}"><span>${d.emoji}</span><b>${d.name}</b></button>`).join('');
      return [{ id: 'own', name: 'My own clothes', emoji: '👕' }, ...C.outfits].map(o => { const img = o.id !== 'own' && SP.outfitImgs[o.id];
        return `<button class="swx-th swx-chipd ${o.id === st.outfit ? 'on' : ''}" data-id="${o.id}">${img ? `<img src="${img}" alt="">` : `<span>${o.emoji}</span>`}${o.id === 'own' ? '<span class="swx-free">FREE</span>' : '<span class="swx-aib">✨ AI</span>'}<b>${escH(o.name)}</b></button>`; }).join('');
    }
    function fillRail() {
      rail.innerHTML = railHtml(); const my = ++job;
      if (tab === 'spots') { const items = [...rail.querySelectorAll('.swx-th')]; (async () => { for (const b of items) { if (my !== job) return; await composeSpot(b.querySelector('canvas'), SPOT(b.dataset.id), { cut: st.cut, P: st.P, decor: 'none', mark: false, label: '' }); } })(); }
      const on = rail.querySelector('.on'); if (on) rail.scrollLeft = Math.max(0, on.offsetLeft - rail.clientWidth / 2 + on.clientWidth / 2);
      rail.querySelectorAll('.swx-th').forEach(b => b.onclick = () => {
        buzz(); beep && beep('tap');
        if (tab === 'spots') st.spot = b.dataset.id; else if (tab === 'decor') st.decor = b.dataset.id; else st.outfit = b.dataset.id;
        rail.querySelectorAll('.swx-th').forEach(z => z.classList.toggle('on', z === b)); st.dirty = true; render();
      });
    }
    ov.querySelectorAll('.swx-seg button').forEach((t, i) => t.onclick = () => { buzz(); tab = t.dataset.tab; ov.querySelector('.swx-seg').style.setProperty('--i', i); ov.querySelectorAll('.swx-seg button').forEach(z => z.classList.toggle('on', z === t)); fillRail(); });
    fillRail(); render();
    const mark = ov.querySelector('#swMark'); if (mark) mark.onchange = () => { st.mark = mark.checked; render(); };
    ov.querySelector('#swDice').onclick = () => { buzz(12); st.spot = SP.spots[Math.floor(Math.random() * SP.spots.length)].id; st.decor = DECOR[Math.floor(Math.random() * (DECOR.length - 1))].id; st.dirty = true; fillRail(); render(); };
    // move and resize yourself in the picture
    const pts = new Map(); let last = null;
    const pos = (e) => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * W / b.width, y: (e.clientY - b.top) * H / b.height }; };
    const scaleBy = (f) => { st.P.h = Math.max(H * .3, Math.min(H * 1.4, st.P.h * f)); };
    cv.onpointerdown = (e) => { if (aiFresh()) return; cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, pos(e)); last = null; ov.querySelector('#swDrag').classList.add('gone'); };
    cv.onpointermove = (e) => { if (!pts.has(e.pointerId)) return; const p = pos(e), prev = pts.get(e.pointerId); pts.set(e.pointerId, p);
      if (pts.size === 1) { st.P.x += p.x - prev.x; st.P.y += p.y - prev.y; } else { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (last) scaleBy(d / last); last = d; }
      st.dirty = true; render(); };
    cv.onpointerup = cv.onpointercancel = (e) => { pts.delete(e.pointerId); last = null; };
    cv.onwheel = (e) => { if (aiFresh()) return; e.preventDefault(); scaleBy(Math.exp(-e.deltaY * .0015)); render(); };
    cv.style.touchAction = 'none';
    // hold to see the original photo
    const before = ov.querySelector('.swx-before'), btag = ov.querySelector('.swx-before-tag'), cmp = ov.querySelector('#swCmp');
    const showBefore = (on) => { if (on) { before.width = 540; before.height = 675; const g = before.getContext('2d'), im = st.img, k = Math.max(540 / im.width, 675 / im.height); g.fillStyle = '#07130e'; g.fillRect(0, 0, 540, 675); g.drawImage(im, (540 - im.width * k) / 2, (675 - im.height * k) / 2, im.width * k, im.height * k); } before.hidden = btag.hidden = !on; };
    cmp.onpointerdown = (e) => { e.preventDefault(); buzz(); showBefore(true); }; cmp.onpointerup = cmp.onpointerleave = cmp.onpointercancel = () => showBefore(false);

    const fileName = () => `detty-christmas-${st.spot}.jpg`;
    const caption = () => { const s = SPOT(st.spot); return `📍 Christmas at ${s.name}, ${s.city} 🎄😎\nTake yours on Detty December: ${location.origin}/?ref=${refCode || ''}`; };
    async function blob() { let src = cv; if (!C.premium) { src = mk(720, 900); src.getContext('2d').drawImage(cv, 0, 0, 720, 900); } return new Promise(z => src.toBlob(z, 'image/jpeg', .92)); }
    function keep() { const s = mk(240, 300); s.getContext('2d').drawImage(cv, 0, 0, 240, 300); const t = s.toDataURL('image/jpeg', .72), looks = store.get('looks', []);
      looks.unshift({ t, l: st.spot, n: `${SPOT(st.spot).name}${aiFresh() && st.outfit !== 'own' ? ' · ' + OUTF(st.outfit).name : ''}`, at: Date.now() }); while (looks.length && !store.set('looks', looks.slice(0, 8))) looks.pop(); }
    async function out(how) {
      if (st.outfit !== 'own' && !aiFresh()) { toast(`Tap ✨ "Wear ${OUTF(st.outfit).name}" first, or pick "My own clothes"`); ov.querySelector('#swAI').classList.add('shake'); setTimeout(() => ov.querySelector('#swAI').classList.remove('shake'), 600); return; }
      const btn = ov.querySelector(how === 'share' ? '#swShare' : '#swSave'); btn.disabled = true;
      try {
        api('/api/swap/save', { outfit: aiFresh() ? st.outfit : 'own', spot: st.spot, how, ai: !!aiFresh() }).catch(() => {});
        const b = await blob(); if (!b) return toast('Could not make the picture. Try again.');
        keep(); st.dirty = false;
        if (how === 'share') return shareBlob(b, caption());
        download(b); confetti && confetti(70); beep && beep('win'); buzz(30);
        savedSheet(URL.createObjectURL(b), b, caption());
      } finally { btn.disabled = false; }
    }
    function download(b) { const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = fileName(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
    shareBlob = async (b, text) => {
      track('swap_share', { spot: st.spot });
      const f = new File([b], fileName(), { type: b.type || 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], text }); } catch {} return; }
      download(b); toast('Picture saved. Add it to your WhatsApp status from your gallery 📲'); window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    };
    ov.querySelector('#swSave').onclick = () => { buzz(); out('save'); };
    ov.querySelector('#swShare').onclick = () => { buzz(); out('share'); };
    const snap = () => { const s = mk(432, 540); s.getContext('2d').drawImage(cv, 0, 0, 432, 540); return s.toDataURL('image/jpeg', .8); };
    ov.querySelector('#swAI').onclick = () => {
      buzz();
      if (!C.ai) return aiSoon();
      if (aiFresh()) return toast('This one is already real ✨ Pick another outfit or spot to make a new one.');
      if (!C.aiLeft) return C.premium ? toast(`You've made ${C.aiDaily} real pictures today. Come back tomorrow!`) : paywall('ai_limit', snap());
      if (store.get('aiok2', false)) return realistic();
      const O = OUTF(st.outfit), s = SPOT(st.spot);
      const bg = sheet(`<div class="swx-sh"><span class="swx-sh-ic swx-spark">${ICON.spark}</span><h3>Make it real</h3>
        <p>Our AI will redraw you as a real photo at ${escH(s.name)}${st.outfit === 'own' ? ', in your own clothes' : `, wearing ${escH(O.name)}`}.</p>
        <ul class="swx-tips"><li><i>🤖</i><span><b>Your photo goes to OpenAI</b><small>Only for this picture, only when you tap. We never store it on our servers.</small></span></li><li><i>⏱️</i><span><b>Takes 30 to 60 seconds</b><small>Keep the app open while it cooks.</small></span></li><li><i>🎟️</i><span><b>${aiLine()}</b><small>If it fails, it doesn't count.</small></span></li></ul>
        <div class="swx-sh-acts"><button class="btn btn-gold" id="aiYes">✨ Make it real</button><button class="btn swx-ghost" id="aiNo">Not now</button></div></div>`);
      bg.querySelector('#aiYes').onclick = () => { store.set('aiok2', true); bg.remove(); realistic(); };
      bg.querySelector('#aiNo').onclick = () => bg.remove();
    };
    async function realistic() {
      const busy = ov.querySelector('.sw-busy'), T = ov.querySelector('#swCookT'), P = ov.querySelector('#swCookP'), O = OUTF(st.outfit), s = SPOT(st.spot), forKey = st.spot + '|' + st.outfit;
      const steps = ['Reading your face…', st.outfit === 'own' ? 'Keeping your outfit…' : `Tailoring your ${O.name}…`, `Taking you to ${s.name}…`, 'Matching the light…', 'Adding the Christmas magic…', 'Final touches…'];
      busy.hidden = false; ov.querySelector('#swAI').disabled = true; let t = 0;
      const tick = setInterval(() => { t++; T.textContent = steps[Math.min(steps.length - 1, Math.floor(t / 8))]; P.style.width = Math.min(94, 100 * (1 - Math.exp(-t / 28))) + '%'; }, 1000);
      T.textContent = steps[0]; P.style.width = '3%';
      try {
        const k = Math.min(1, 1024 / Math.max(st.img.width, st.img.height)), sc = mk(st.img.width * k, st.img.height * k); sc.getContext('2d').drawImage(st.img, 0, 0, sc.width, sc.height);
        const res = await fetch('/api/swap/render', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify({ photo: sc.toDataURL('image/jpeg', .9), outfit: st.outfit, spot: st.spot }) });
        if (!res.ok) { const j = await res.json().catch(() => ({})); if (res.status === 402) { C.aiLeft = 0; paywall('ai_limit', snap()); } throw new Error(j.error || 'Make it real no work this time.'); }
        const b = await res.blob(), url = URL.createObjectURL(b), im = new Image(); im.src = url; await im.decode();
        st.ai = im; st.aiFor = forKey; C.aiLeft = Math.max(0, C.aiLeft - 1); st.dirty = true;
        P.style.width = '100%'; beep && beep('win'); buzz(30); confetti && confetti(50); render();
      } catch (e) { toast(e.message); }
      finally { clearInterval(tick); setTimeout(() => { busy.hidden = true; }, 250); ov.querySelector('#swAI').disabled = false; }
    }
  }
  let shareBlob = async () => {};

  ov.classList.add('swx-in'); home();
}
