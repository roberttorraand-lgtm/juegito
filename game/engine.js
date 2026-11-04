// =====================================================================
//  ENGINE — Canvas primitives, detailed pixel-art characters, BGs, SFX
//  Uses globals from renderer.js: ctx, cv, W, H
// =====================================================================

// ---- Drawing primitives ----
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
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc))
        xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
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

// ---- Color palettes ----
const PAL = {
  skin:   { b: '#d4be8c', h: '#e8d4a8', s: '#b09868', d: '#8a7048' },
  lobCloth: { b: '#282448', h: '#3a3460', s: '#1a1834', o: '#0e0c1e' },
  gonCloth: { b: '#3e1824', h: '#52283a', s: '#2a0e16', o: '#180810' },
  hair:   { lob: '#14142a', gon: '#2a1810' },
  outline: '#0a0a14',
  shoe:   { b: '#2a2838', h: '#3a3848', s: '#1a1828' },
  headset: { b: '#5a5870', h: '#7a788a', s: '#3a3850', mic: '#8a889a' },
  cap:    { b: '#34324a', h: '#444260', s: '#242240', logo: '#8a4a4a' },
  eye:    '#f0ecdc',
  ego:    { body: '#180e1a', coat: '#24142a', glow: '#ff3a50', blade: '#2a1c3a', energy: '#c8a8ff', mask: '#d8d0c0', crack: '#100a10' },
};

// ---- Lobelto & Gonza: black stickmen ----
const FIG = { body: '#10101a', edge: '#4a4660', eye: '#f0ecdc' };

const HAIR = {
  lob: { c: '#2a1d16', h: '#4a3426' },
  gon: { c: '#2e2018', h: '#4e3828' },
};
const GLASSES = '#a8a8c0';

function figure(x, y, o, t) {
  const kid = o.hat === 'cap';
  const sc = (o.scale || 1) * (kid ? 0.86 : 1);
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
  // mirrored helpers: dx is measured toward the facing direction
  const mpx = (dx, dy, c) => px(hx + dx * f, hy + dy, c);
  const mrect = (dx, dy, w, h, c) => rect(f > 0 ? hx + dx : hx - dx - w + 1, hy + dy, w, h, c);
  if (o.hat === 'headset') {
    // fluffy, messy hair — volume to the back and top
    const H = HAIR.lob;
    for (const [dx, dy, r] of [[-3, -4, 3], [0, -5, 3], [3, -5, 2], [-5, -1, 3], [-4, 1, 2]]) disc(hx + dx * f, hy + dy, r, H.c);
    for (const [dx, dy] of [[-6, -4], [-2, -9], [2, -8], [5, -6], [-5, -7], [-7, 0], [-6, 3], [4, -3]]) mpx(dx, dy, H.c);
    for (const [dx, dy] of [[-2, -6], [1, -7], [-4, -3], [-5, 1]]) mpx(dx, dy, H.h);
    // rectangular glasses
    mrect(0, -2, 5, 1, GLASSES); mrect(0, 0, 5, 1, GLASSES);
    mpx(0, -1, GLASSES); mpx(2, -1, GLASSES); mpx(4, -1, GLASSES);
    mrect(-3, -1, 3, 1, GLASSES);
  } else if (kid) {
    // messy hair with a fringe falling to the eyes
    const H = HAIR.gon;
    for (const [dx, dy, r] of [[-2, -5, 3], [2, -5, 3], [-4, -2, 2], [0, -7, 2]]) disc(hx + dx * f, hy + dy, r, H.c);
    for (const [dx, dy] of [[-3, -8], [1, -9], [4, -7], [-5, -5], [5, -4], [-6, -2], [0, -2], [2, -2], [4, -2]]) mpx(dx, dy, H.c);
    for (const [dx, dy] of [[-1, -6], [2, -6], [-3, -3]]) mpx(dx, dy, H.h);
  }

  mpx(1, -1, FIG.eye); mpx(3, -1, FIG.eye);
  if (o.pain) { mpx(1, -2, FIG.eye); mpx(3, 0, FIG.eye); }
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
  const lob = hat === 'headset';
  const H = lob ? HAIR.lob : HAIR.gon;
  const hc = dim ? '#1e1814' : H.c, hh = dim ? '#2a221c' : H.h;
  disc(cx, cy + 22, 16, dim ? '#1b1a22' : '#14131a');
  disc(cx, cy, 11, dim ? '#24222c' : '#3a3646');
  disc(cx, cy, 10, '#0b0a10');

  if (lob) {
    for (const [dx, dy, r] of [[-5, -8, 6], [2, -10, 6], [9, -9, 4], [-10, -2, 5], [-9, 4, 4], [11, -3, 3]]) disc(cx + dx, cy + dy, r, hc);
    for (const [dx, dy] of [[-12, -9], [-7, -15], [-1, -17], [5, -17], [10, -14], [13, -9], [-14, -4], [-14, 3], [-12, 8], [14, -5]]) rect(cx + dx, cy + dy, 2, 2, hc);
    for (const [dx, dy] of [[-4, -11], [1, -13], [6, -11], [-9, -5], [-8, 2]]) rect(cx + dx, cy + dy, 2, 1, hh);
  } else {
    for (const [dx, dy, r] of [[-4, -9, 6], [4, -9, 6], [-9, -4, 4], [0, -12, 4]]) disc(cx + dx, cy + dy, r, hc);
    for (const [dx, dy] of [[-8, -14], [-2, -16], [4, -15], [9, -12], [-12, -8], [12, -7]]) rect(cx + dx, cy + dy, 2, 2, hc);
    for (const fx of [-2, 1, 4, 8]) rect(cx + fx, cy - 5, 1, 2 + ((fx + 8) % 2), hc);
    for (const [dx, dy] of [[-5, -11], [2, -12], [-8, -6]]) rect(cx + dx, cy + dy, 2, 1, hh);
  }

  if (dim) {
    rect(cx + 1, cy - 1, 3, 1, '#4a4656'); rect(cx + 5, cy - 1, 3, 1, '#4a4656');
  } else {
    rect(cx + 2, cy - 2, 2, 2, FIG.eye); rect(cx + 6, cy - 2, 2, 2, FIG.eye);
  }

  if (lob) {
    const g = dim ? '#4a4656' : GLASSES;
    for (const gx of [cx + 1, cx + 5]) {
      rect(gx, cy - 3, 4, 1, g); rect(gx, cy, 4, 1, g);
      rect(gx, cy - 3, 1, 4, g); rect(gx + 3, cy - 3, 1, 4, g);
    }
    rect(cx - 8, cy - 2, 9, 1, g);
  }
}

// ---- Corrupted E.G.O. employee (detailed) ----
function corrupted(x, y, o, t) {
  const sc = o.scale || 1;
  if (sc !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y); }

  const jit = o.rage ? Math.round((hash(Math.floor(t / 40)) - 0.5) * 4) : 0;
  x += jit;

  const E = PAL.ego;
  const sway = Math.round(Math.sin(t / 600) * 1.5);

  // -- Shadow --
  ctx.globalAlpha = 0.3;
  disc(x, y + 2, 10, '#000');
  ctx.globalAlpha = 1;

  // -- Coat/body (large trapezoidal shape) --
  const coat = [
    [x - 14, y - 50], [x + 12, y - 52], [x + 16, y - 20], [x + 13, y],
    [x + 8, y - 6], [x + 4, y + 1], [x - 1, y - 7],
    [x - 6, y + 1], [x - 10, y - 5], [x - 16, y - 1], [x - 18, y - 22],
  ];
  // Outer glow edge
  poly(coat.map(([a, b]) => [a - 1, b - 1]), E.glow);
  ctx.globalAlpha = 0.3;
  poly(coat.map(([a, b]) => [a - 2, b - 2]), E.glow);
  ctx.globalAlpha = 1;
  // Body fill
  poly(coat, E.body);
  // Inner coat layer
  poly(coat.map(([a, b]) => [a + 1, b + 1]), E.coat);
  // Coat seams (glowing lines on the suit)
  const seamGlow = Math.sin(t / 200) > 0 ? E.glow : '#5a1020';
  line(x - 8, y - 48, x - 6, y - 10, seamGlow);
  line(x + 6, y - 48, x + 8, y - 10, seamGlow);
  line(x - 10, y - 30, x + 10, y - 30, E.coat);
  // Chest plate detail
  rect(x - 4, y - 44, 8, 10, '#120a14');
  rect(x - 3, y - 43, 6, 8, '#1e1228');
  // Chest emblem
  px(x - 1, y - 40, seamGlow);
  px(x + 1, y - 40, seamGlow);
  px(x, y - 39, seamGlow);
  px(x, y - 41, seamGlow);
  // Belt
  rect(x - 10, y - 20, 22, 2, '#2a1828');
  rect(x - 2, y - 21, 4, 4, '#3a2030');
  px(x, y - 20, seamGlow);

  // -- Head --
  const hx = x - 4 + sway, hy = y - 60;
  disc(hx, hy, 10, PAL.outline);
  disc(hx, hy, 9, E.body);
  // Mask
  poly([[hx - 7, hy - 6], [hx + 8, hy - 8], [hx + 7, hy + 6], [hx - 6, hy + 7]], E.mask);
  // Mask cracks
  line(hx - 3, hy - 7, hx, hy + 2, E.crack);
  line(hx, hy + 2, hx - 2, hy + 7, E.crack);
  line(hx, hy + 2, hx + 6, hy + 4, E.crack);
  line(hx + 2, hy - 5, hx + 4, hy, E.crack);
  // Eye
  if (!o.blind) {
    disc(hx + 3, hy - 1, 3, E.glow);
    disc(hx + 3, hy - 1, 2, '#ff8070');
    px(hx + 3, hy - 1, '#fff2c0');
    // Eye glow effect
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t / 150);
    disc(hx + 3, hy - 1, 5, E.glow);
    ctx.globalAlpha = 1;
  } else {
    line(hx + 1, hy - 2, hx + 5, hy, '#5a0a14');
    rect(hx - 2, hy + 3, 4, 1, '#8a8070');
  }
  // Other eye (dark/dead)
  px(hx - 3, hy, '#3a0a14');
  px(hx - 2, hy - 1, '#2a0814');

  // -- Left arm --
  line(x - 12, y - 46, x - 24, y - 34, PAL.outline, 5);
  line(x - 12, y - 46, x - 24, y - 34, E.body, 4);
  line(x - 12, y - 46, x - 24, y - 34, E.coat, 3);
  line(x - 24, y - 34, x - 28, y - 44, E.coat, 3);
  // Left hand claws
  for (let i = 0; i < 3; i++) {
    const cx2 = x - 28 - i * 2, cy2 = y - 44 - i;
    px(cx2, cy2, E.glow);
    px(cx2 - 1, cy2 - 1, '#5a1020');
  }

  // -- Right arm + blade --
  line(x + 10, y - 46, x + 20, y - 34, PAL.outline, 5);
  line(x + 10, y - 46, x + 20, y - 34, E.body, 4);
  line(x + 10, y - 46, x + 20, y - 34, E.coat, 3);

  // Blade weapon
  const bx = x + 20, by = y - 34;
  const blade = [
    [bx, by - 3], [bx + 32, by + 22], [bx + 28, by + 24], [bx + 24, by + 18],
    [bx + 20, by + 19], [bx + 16, by + 13], [bx + 12, by + 13], [bx - 2, by + 4],
  ];
  // Blade glow
  ctx.globalAlpha = 0.2;
  poly(blade.map(([a, b]) => [a - 1, b - 1]), E.energy);
  ctx.globalAlpha = 1;
  poly(blade, E.blade);
  // Blade edge highlight
  const pulse = 0.5 + 0.5 * Math.sin(t / 200);
  line(bx, by - 3, bx + 32, by + 22, pulse > 0.5 ? E.energy : '#6a4a98');
  // Serrated edge
  for (let i = 0; i < 6; i++) {
    const tp = i / 5;
    const tx = bx + tp * 30, ty = by - 2 + tp * 24;
    px(Math.round(tx) + 1, Math.round(ty) - 1, E.energy);
  }
  // Blade energy particles
  for (let i = 0; i < 4; i++) {
    const k = Math.floor(t / 100) + i * 7;
    const bpx = bx + hash(k) * 28, bpy = by + hash(k + 1) * 20;
    px(Math.round(bpx), Math.round(bpy), hash(k + 2) > 0.5 ? E.energy : E.glow);
  }

  // -- Glowing veins on suit --
  const g = Math.sin(t / 180) > -0.3 ? E.glow : '#8a1020';
  line(x - 6, y - 44, x - 2, y - 34, g);
  line(x - 2, y - 34, x - 7, y - 24, g);
  line(x + 4, y - 40, x + 9, y - 28, g);
  line(x + 9, y - 28, x + 6, y - 16, g);
  line(x - 9, y - 18, x - 4, y - 10, g);
  // Extra veins
  line(x - 2, y - 48, x + 2, y - 42, g);
  line(x + 8, y - 44, x + 6, y - 38, g);

  // -- Floating particles --
  for (let i = 0; i < 14; i++) {
    const k = Math.floor(t / 100) * 14 + i;
    if (hash(k) > 0.45) {
      const ppx = x - 26 + hash(k + 1) * 60;
      const ppy = y - 72 + hash(k + 2) * 74;
      const pcol = hash(k + 3) > 0.5 ? E.glow : E.energy;
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t / 200 + i);
      px(Math.round(ppx), Math.round(ppy), pcol);
      ctx.globalAlpha = 1;
    }
  }

  if (sc !== 1) ctx.restore();
}

// ---- Dimensional rift ----
function rift(cx, cy, w, h, t) {
  if (w <= 0) return;
  const n = 14, L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const yy = cy - h / 2 + (h * i) / n;
    const k = Math.sin((i / n) * Math.PI);
    const j1 = (hash(i + Math.floor(t / 90) * 31) - 0.5) * 6;
    const j2 = (hash(i + 7 + Math.floor(t / 90) * 17) - 0.5) * 6;
    L.push([cx - w * k + j1 * k, yy]);
    R.unshift([cx + w * k + j2 * k, yy]);
  }
  const all = L.concat(R);
  // Outer glow
  ctx.globalAlpha = 0.3;
  poly(all.map(([a, b]) => [a + (a < cx ? -4 : 4), b]), '#c8a0ff');
  ctx.globalAlpha = 1;
  poly(all.map(([a, b]) => [a + (a < cx ? -2 : 2), b]), '#e0d0ff');
  poly(all, '#6a28a0');
  poly(all.map(([a, b]) => [cx + (a - cx) * 0.6, b]), '#1a0830');
  // Inner sparkles
  for (let i = 0; i < 12; i++) {
    const k = Math.floor(t / 60) + i * 13;
    const rpx = cx + (hash(k) - 0.5) * w;
    const rpy = cy + (hash(k + 5) - 0.5) * h * 0.8;
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t / 150 + i);
    px(Math.round(rpx), Math.round(rpy), hash(k + 3) > 0.5 ? '#d8b8ff' : '#fff');
    ctx.globalAlpha = 1;
  }
}

// ---- SFX ----
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
