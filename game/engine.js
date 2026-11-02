// =====================================================================
//  ENGINE — Canvas primitives, characters, backgrounds, SFX
// =====================================================================
const S = 2;
const W = 320, H = 180;
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }
function px(x, y, c) { rect(x, y, 1, 1, c); }

function line(x0, y0, x1, y1, c, t = 1) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const o = Math.floor(t / 2);
  ctx.fillStyle = c;
  for (;;) {
    ctx.fillRect(x0 - o, y0 - o, t, t);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function disc(cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
    ctx.fillRect((cx - w) | 0, (cy + y) | 0, w * 2 + 1, 1);
  }
}

function poly(pts, c) {
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  ctx.fillStyle = c;
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs = [];
    const yc = y + 0.5;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
        xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.round(xs[i]), b = Math.round(xs[i + 1]);
      if (b > a) ctx.fillRect(a, y, b - a, 1);
    }
  }
}

function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

function star(cx, cy, c) {
  px(cx, cy - 2, c); rect(cx - 1, cy - 1, 3, 1, c);
  rect(cx - 2, cy, 5, 1, c); rect(cx - 1, cy + 1, 3, 1, c);
  px(cx - 1, cy + 2, c); px(cx + 1, cy + 2, c);
}

const FIG = { body: '#10101a', edge: '#4a4660', eye: '#f0ecdc' };

function figure(x, y, o, t) {
  const sc = o.scale || 1;
  if (sc !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y); }
  const f = o.face || 1;
  let bob = Math.round(Math.sin(t / 420 + x) * 0.6);
  if (o.talk) bob -= Math.round(Math.abs(Math.sin(t / 90)));
  if (o.shake) x += Math.round(Math.sin(t / 25) * 1.2);
  y += bob;
  const hx = x, hy = y - 27;
  const sh = y - 20, hip = y - 10;
  const legs = o.lifted
    ? [[x - 2, y + 1], [x + 3, y + 2]]
    : o.sitting ? [[x - 8, y], [x + 8, y]] : [[x - 4, y], [x + 4, y]];
  const armL = o.lifted ? [x - 7, sh - 6] : [x - 6, y - 11];
  const armR = o.armless ? [x + 3, sh + 4] : o.lifted ? [x + 7, sh - 6] : [x + 6, y - 11];
  for (const [col, extra] of [[FIG.edge, 1], [FIG.body, 0]]) {
    const th = 2 + extra * 2;
    disc(hx, hy, 5 + extra, col);
    line(x, hy + 4, x, hip, col, th);
    line(x, sh, armL[0], armL[1], col, th);
    line(x, sh, armR[0], armR[1], col, th);
    for (const l of legs) line(x, hip, l[0], l[1], col, th);
  }
  px(hx + f * 1, hy - 1, FIG.eye); px(hx + f * 3, hy - 1, FIG.eye);
  if (o.pain) { px(hx + f * 1, hy - 2, FIG.eye); px(hx + f * 3, hy, FIG.eye); }
  if (o.hat === 'headset') {
    line(hx - 5, hy - 1, hx - 4, hy - 5, '#7a7890');
    line(hx - 4, hy - 5, hx + 4, hy - 5, '#7a7890');
    line(hx + 4, hy - 5, hx + 5, hy - 1, '#7a7890');
    rect(hx - 7, hy - 2, 2, 4, '#9a96b0'); rect(hx + 6, hy - 2, 2, 4, '#9a96b0');
  } else if (o.hat === 'cap') {
    rect(hx - 5, hy - 6, 11, 3, '#3a384e');
    rect(hx + (f > 0 ? 2 : -9), hy - 4, 8, 2, '#3a384e');
    px(hx - 1, hy - 5, '#8a4a4a');
  }
  if (o.armless) {
    if (o.bandaged) {
      rect(armR[0] - 1, armR[1] - 1, 3, 3, '#d8d0c0');
      px(armR[0], armR[1] - 1, '#b0a890');
      px(armR[0] - 1, armR[1], '#b0a890');
    } else {
      rect(armR[0] - 1, armR[1] - 1, 3, 3, '#cfc6b4');
      px(armR[0], armR[1] + 2, '#7a1018');
    }
  }
  if (sc !== 1) ctx.restore();
}

function avatarHead(cx, cy, hat, t, dim) {
  disc(cx, cy + 22, 16, dim ? '#1b1a22' : '#14131a');
  disc(cx, cy, 11, dim ? '#24222c' : '#3a3646');
  disc(cx, cy, 10, '#0b0a10');
  if (!dim) { rect(cx + 2, cy - 2, 2, 2, FIG.eye); rect(cx + 6, cy - 2, 2, 2, FIG.eye); }
  else { rect(cx + 1, cy - 1, 3, 1, '#4a4656'); rect(cx + 5, cy - 1, 3, 1, '#4a4656'); }
  if (hat === 'headset') {
    rect(cx - 9, cy - 11, 18, 2, '#5a5668');
    rect(cx - 13, cy - 4, 4, 8, '#7a7690'); rect(cx + 9, cy - 4, 4, 8, '#7a7690');
  } else {
    rect(cx - 10, cy - 12, 21, 5, '#2c2a3a'); rect(cx + 4, cy - 8, 14, 3, '#2c2a3a');
  }
}

function corrupted(x, y, o, t) {
  const sc = o.scale || 1;
  if (sc !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y); }
  const jit = o.rage ? Math.round((hash(Math.floor(t / 40)) - 0.5) * 4) : 0;
  x += jit;
  const body = '#180e18', edge = '#6a2438', glow = '#ff3a50';
  const sway = Math.round(Math.sin(t / 600) * 1.5);
  const coat = [[x - 14, y - 50], [x + 12, y - 52], [x + 16, y - 20], [x + 13, y],
    [x + 8, y - 6], [x + 4, y + 1], [x - 1, y - 7], [x - 6, y + 1], [x - 10, y - 5], [x - 16, y - 1], [x - 18, y - 22]];
  poly(coat.map(([a, b]) => [a - 1, b - 1]), edge);
  poly(coat, body);
  const hx = x - 4 + sway, hy = y - 60;
  disc(hx, hy, 9, edge); disc(hx, hy, 8, body);
  poly([[hx - 6, hy - 5], [hx + 7, hy - 7], [hx + 6, hy + 5], [hx - 5, hy + 6]], '#d8d0c0');
  line(hx - 2, hy - 6, hx + 1, hy + 1, '#100a10'); line(hx + 1, hy + 1, hx - 1, hy + 6, '#100a10');
  line(hx + 1, hy + 1, hx + 6, hy + 3, '#100a10');
  if (!o.blind) { disc(hx + 3, hy - 1, 2, glow); px(hx + 3, hy - 1, '#fff2c0'); }
  else { line(hx + 1, hy - 2, hx + 5, hy, '#5a0a14'); rect(hx - 2, hy + 3, 4, 1, '#8a8070'); }
  line(x - 12, y - 46, x - 24, y - 34, edge, 4); line(x - 12, y - 46, x - 24, y - 34, body, 3);
  line(x - 24, y - 34, x - 28, y - 44, body, 3);
  line(x + 10, y - 46, x + 20, y - 34, body, 4);
  const bx = x + 20, by = y - 34;
  const blade = [[bx, by - 2], [bx + 30, by + 22], [bx + 27, by + 23], [bx + 24, by + 18],
    [bx + 20, by + 19], [bx + 16, by + 13], [bx + 12, by + 13], [bx - 2, by + 3]];
  poly(blade, '#2a1c3a');
  const pulse = 0.5 + 0.5 * Math.sin(t / 200);
  line(bx, by - 2, bx + 30, by + 22, pulse > 0.5 ? '#c8a8ff' : '#8a6ad8');
  const g = Math.sin(t / 180) > -0.3 ? glow : '#8a1020';
  line(x - 6, y - 44, x - 2, y - 34, g); line(x - 2, y - 34, x - 7, y - 24, g);
  line(x + 4, y - 40, x + 9, y - 28, g); line(x + 9, y - 28, x + 6, y - 16, g);
  line(x - 9, y - 18, x - 4, y - 10, g);
  for (let i = 0; i < 10; i++) {
    const k = Math.floor(t / 120) * 10 + i;
    if (hash(k) > 0.55) px(x - 22 + hash(k + 1) * 50, y - 70 + hash(k + 2) * 70, hash(k + 3) > 0.5 ? glow : '#c8a8ff');
  }
  if (sc !== 1) ctx.restore();
}

function rift(cx, cy, w, h, t) {
  if (w <= 0) return;
  const n = 14, L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const yy = cy - h / 2 + (h * i) / n;
    const k = Math.sin((i / n) * Math.PI);
    const j1 = (hash(i + Math.floor(t / 90) * 31) - 0.5) * 6;
    const j2 = (hash(i + 7 + Math.floor(t / 90) * 17) - 0.5) * 6;
    L.push([cx - w * k + j1 * k, yy]); R.unshift([cx + w * k + j2 * k, yy]);
  }
  const all = L.concat(R);
  poly(all.map(([a, b]) => [a + (a < cx ? -2 : 2), b]), '#e0d0ff');
  poly(all, '#6a28a0');
  poly(all.map(([a, b]) => [cx + (a - cx) * 0.6, b]), '#1a0830');
  for (let i = 0; i < 8; i++) {
    const k = Math.floor(t / 60) + i * 13;
    px(cx + (hash(k) - 0.5) * w, cy + (hash(k + 5) - 0.5) * h * 0.8, '#d8b8ff');
  }
}

const BG = {};
BG.black = () => rect(0, 0, W, H, '#000');

BG.arena = (s, t) => {
  rect(0, 0, W, H, '#0c0814');
  for (let y = 80; y < H; y++) {
    const k = (y - 80) / (H - 80);
    const r = Math.floor(14 + k * 22), g = Math.floor(10 + k * 14), b = Math.floor(24 + k * 28);
    rect(0, y, W, 1, `rgb(${r},${g},${b})`);
  }
  for (let i = -6; i <= 6; i++) {
    const sx = 160 + i * 28, ey = 180;
    const topX = 160 + i * 6, topY = 80;
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#8060c0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(sx, ey); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (let j = 0; j < 5; j++) {
    const y = 90 + j * 18;
    const spread = 0.3 + (y - 80) / 100 * 0.7;
    ctx.globalAlpha = 0.18; rect(160 - spread * 160, y, spread * 320, 1, '#a070e0'); ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = 0.15;
  for (let y = 0; y < 40; y++) rect(0, y, W, 1, '#e03050');
  ctx.globalAlpha = 0.18;
  for (let y = 40; y < 80; y++) {
    const a = Math.sin(((y - 40) / 40) * Math.PI) * 0.18;
    ctx.globalAlpha = a; rect(0, y, W, 1, '#8040c0');
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 20; i++) {
    const k = Math.floor(t / 120) * 20 + i;
    const px2 = (hash(k) * W + t * 0.02) % W;
    const py = 10 + hash(k + 1) * 70;
    const a2 = 0.4 + 0.3 * Math.sin(t / 300 + i);
    ctx.globalAlpha = a2;
    const col = hash(k + 2) > 0.5 ? '#ff3050' : '#b080ff';
    px(px2, py, col);
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = 0.3; rect(0, 0, 8, H, '#000'); rect(W - 8, 0, 8, H, '#000'); ctx.globalAlpha = 1;
};

BG.call = (s, t) => {
  rect(0, 0, W, H, '#16151c');
  rect(0, 0, W, 12, '#0e0d13');
  disc(8, 6, 2, '#3fbf6a');
  ctx.fillStyle = '#9c97a8'; ctx.font = '6px monospace';
  ctx.fillText('LLAMADA DE VOZ · PICHA BRAVA', 14, 8);
  const panels = [
    { id: 'lobelto', x: 16, hat: 'headset', name: 'LOBELTO' },
    { id: 'gonza', x: 168, hat: 'cap', name: 'GONZA' },
  ];
  for (const p of panels) {
    const off = s.offline && s.offline[p.id];
    const speaking = s.speaker === p.id && s.typing;
    rect(p.x, 22, 136, 96, '#0e0d13');
    if (speaking) { rect(p.x, 22, 136, 96, '#3fbf6a'); rect(p.x + 2, 24, 132, 92, '#0e0d13'); }
    if (s.glitch === p.id) {
      for (let i = 0; i < 12; i++) {
        const k = Math.floor(t / 50) * 12 + i;
        rect(p.x + hash(k) * 120, 24 + hash(k + 1) * 88, 6 + hash(k + 2) * 30, 2, hash(k + 3) > 0.5 ? '#ff2a3c' : '#2a2630');
      }
    }
    avatarHead(p.x + 68, 62, p.hat, t, off);
    ctx.fillStyle = off ? '#4a4656' : '#c9c2b6'; ctx.font = '7px monospace';
    ctx.fillText(p.name, p.x + 6, 118);
    if (off) { ctx.fillStyle = '#7a3a44'; ctx.fillText('DESCONECTADO', p.x + 34, 100); }
    else if (s.silent === p.id) { ctx.fillStyle = '#5d5868'; ctx.fillText('...', p.x + 64, 100); }
  }
  rect(120, 128, 80, 14, '#0e0d13');
  disc(136, 135, 4, '#3a3646'); disc(160, 135, 4, '#3a3646'); disc(184, 135, 4, '#a8323e');
};

BG.share = (s, t) => {
  BG.call(s, t);
  rect(24, 16, 272, 114, '#3fbf6a');
  rect(26, 18, 268, 110, '#08070c');
  ctx.fillStyle = '#3fbf6a'; ctx.font = '6px monospace';
  ctx.fillText('GONZA COMPARTE PANTALLA', 30, 26);
  const cards = [{ x: 46, gold: true }, { x: 128, gold: false }, { x: 210, gold: true }];
  cards.forEach((c, i) => {
    const glow = c.gold && Math.sin(t / 150 + i) > 0;
    const col = c.gold ? (glow ? '#ffe28a' : '#d8a840') : '#5d5868';
    rect(c.x - 2, 32, 68, 88, col);
    rect(c.x, 34, 64, 84, c.gold ? '#2a1c08' : '#16151c');
    disc(c.x + 32, 62, 8, c.gold ? '#4a3410' : '#24222c');
    poly([[c.x + 18, 100], [c.x + 46, 100], [c.x + 40, 72], [c.x + 24, 72]], c.gold ? '#4a3410' : '#24222c');
    if (c.gold) {
      star(c.x + 20, 110, col); star(c.x + 32, 110, col); star(c.x + 44, 110, col);
      if (glow) px(c.x + 4 + ((t / 30) % 56), 40, '#fff');
    } else { star(c.x + 32, 110, col); }
  });
};

BG.room = (s, t) => {
  rect(0, 0, W, H, '#14121e');
  for (let x = 0; x < W; x += 16) rect(x, 0, 1, 132, '#191626');
  rect(28, 22, 54, 44, '#2c2a3a'); rect(30, 24, 50, 40, '#0c1424');
  disc(64, 36, 6, '#d8d4c0'); disc(61, 34, 5, '#0c1424');
  rect(54, 24, 2, 40, '#2c2a3a'); rect(30, 43, 50, 2, '#2c2a3a');
  for (let i = 0; i < 6; i++) px(34 + hash(i) * 40, 27 + hash(i + 9) * 34, '#8a90a8');
  rect(250, 26, 30, 40, '#2a1c2a'); rect(253, 29, 24, 34, '#3a2234');
  star(265, 42, '#8a5a6a');
  rect(100, 92, 90, 6, '#2a2032'); rect(104, 98, 4, 34, '#2a2032'); rect(182, 98, 4, 34, '#2a2032');
  const flick = s.monitorOff ? '#0a0a10' : (Math.sin(t / 700) > 0.95 ? '#4a6aa8' : '#3a5a98');
  rect(124, 62, 42, 28, '#1a1824'); rect(126, 64, 38, 24, flick); rect(142, 90, 6, 2, '#1a1824');
  if (!s.monitorOff) { rect(129, 67, 14, 2, '#6a8ac8'); rect(129, 71, 22, 1, '#6a8ac8'); rect(129, 74, 18, 1, '#6a8ac8'); }
  rect(130, 88, 30, 3, '#24202c');
  if (!s.mugGone) { rect(172, 86, 6, 6, '#d8d0c0'); rect(178, 87, 2, 3, '#d8d0c0'); px(174, 84, '#5a5668'); }
  rect(0, 132, W, 48, '#1e1828');
  for (let x = 0; x < W; x += 24) rect(x, 132, 1, 48, '#241c30');
  rect(0, 132, W, 1, '#2c2438');
  if (!s.monitorOff) for (let i = 0; i < 40; i += 2) rect(110 + i, 134 + (i % 4), 40 - i, 1, 'rgba(70,110,180,0.2)');
};

BG.branch = (s, t) => {
  const bands = ['#0a0610', '#140816', '#1e0a18', '#2a0e1a', '#3a121c'];
  bands.forEach((c, i) => rect(0, i * 16, W, 16, c));
  for (let y = 0; y < 80; y++) for (let x = (y % 2); x < W; x += 2) if (y % 16 > 12) px(x, y, bands[Math.min(4, Math.floor(y / 16) + 1)]);
  for (let i = 0; i < 22; i++) {
    const bw = 10 + hash(i) * 18, bh = 20 + hash(i + 3) * 50, bx = i * 15 - 6;
    rect(bx, 96 - bh, bw, bh + 10, '#0c0a12');
    for (let k = 0; k < 6; k++) if (hash(i * 9 + k) > 0.6) px(bx + 2 + hash(i + k) * (bw - 4), 98 - bh + hash(k + i * 3) * bh, '#a8783a');
  }
  rect(70, 34, 180, 104, '#24222a'); rect(70, 34, 180, 3, '#34303c');
  for (let x = 82; x < 240; x += 26) for (let y = 46; y < 90; y += 18) {
    rect(x, y, 14, 9, '#121016');
    if (hash(x * y) > 0.85) rect(x, y, 14, 9, '#2a2418');
  }
  rect(130, 40, 60, 10, '#121016');
  const sign = Math.sin(t / 90) * Math.sin(t / 37) > 0.3 ? '#c84a3a' : '#3a1a1a';
  ctx.fillStyle = sign; ctx.font = '6px monospace'; ctx.fillText('SUCURSAL ???', 136, 48);
  rect(136, 96, 48, 42, '#121016'); rect(138, 98, 21, 40, '#2c2a34'); rect(161, 98, 21, 40, '#2c2a34');
  rect(158, 98, 4, 40, '#121016');
  for (let y = 104; y < 136; y += 6) { rect(140, y, 17, 1, '#24222a'); rect(163, y, 17, 1, '#24222a'); }
  rect(154, 114, 2, 6, '#8a8070'); rect(164, 114, 2, 6, '#8a8070');
  rect(274, 60, 2, 80, '#1a1820'); rect(266, 58, 12, 3, '#1a1820');
  const lampOn = hash(Math.floor(t / 80)) > 0.12;
  if (lampOn) {
    rect(266, 61, 8, 2, '#f0d890');
    poly([[262, 63], [278, 63], [292, 138], [248, 138]], 'rgba(240,216,144,0.15)');
  }
  rect(0, 138, W, 42, '#16141a');
  for (let x = 0; x < W; x += 20) rect(x, 150, 10, 1, '#24222a');
  for (let i = 0; i < 60; i++) {
    const rx = (hash(i) * W + t * 0.05) % W, ry = (hash(i + 40) * H + t * 0.4) % H;
    rect(rx, ry, 1, 3, 'rgba(190,190,230,0.4)');
  }
};

const SFX = {
  ac: null, muted: false,
  init() { if (!this.ac) try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} },
  tone(freq, dur, type = 'square', vol = 0.04, slide = 0) {
    if (this.muted || !this.ac) return;
    const v = vol * (CFG.sfxVol / 100);
    if (v <= 0) return;
    try {
      const o = this.ac.createOscillator(), g = this.ac.createGain(), n = this.ac.currentTime;
      o.type = type; o.frequency.setValueAtTime(freq, n);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), n + dur);
      g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(0.0001, n + dur);
      o.connect(g).connect(this.ac.destination); o.start(n); o.stop(n + dur);
    } catch(e){}
  },
  noise(dur, vol = 0.2, f0 = 2000, f1 = 200) {
    if (this.muted || !this.ac) return;
    vol = vol * (CFG.sfxVol / 100);
    if (vol <= 0) return;
    try {
      const n = this.ac.currentTime, len = Math.floor(this.ac.sampleRate * dur);
      const buf = this.ac.createBuffer(1, len, this.ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ac.createBufferSource(); src.buffer = buf;
      const f = this.ac.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.setValueAtTime(f0, n); f.frequency.exponentialRampToValueAtTime(f1, n + dur);
      const g = this.ac.createGain(); g.gain.setValueAtTime(vol, n); g.gain.exponentialRampToValueAtTime(0.0001, n + dur);
      src.connect(f).connect(g).connect(this.ac.destination); src.start(n);
    } catch(e){}
  },
  blip(speaker) {
    const base = { lobelto: 180, gonza: 240, '¿¿??': 70 }[speaker] || 130;
    this.tone(base + Math.random() * 30, 0.04, 'square', 0.025);
  },
  play(name) {
    switch (name) {
      case 'scream': this.noise(1.4, 0.35, 900, 120); this.tone(110, 1.2, 'sawtooth', 0.08, -60); break;
      case 'thud': this.tone(70, 0.35, 'sine', 0.3, -40); this.noise(0.2, 0.2, 400, 80); break;
      case 'hit': this.noise(0.15, 0.4, 3000, 800); this.tone(900, 0.1, 'triangle', 0.08, -600); break;
      case 'slash': this.noise(0.4, 0.3, 6000, 400); break;
      case 'rift': this.noise(2.2, 0.25, 200, 3000); this.tone(55, 2.2, 'sawtooth', 0.06, 200); break;
      case 'gacha': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.05), i * 90)); break;
      case 'disconnect': this.tone(440, 0.12, 'sine', 0.06); setTimeout(() => this.tone(330, 0.2, 'sine', 0.06), 120); break;
      case 'select': this.tone(660, 0.06, 'square', 0.03); break;
    }
  },
};
