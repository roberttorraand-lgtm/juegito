// =====================================================================
//  BACKGROUNDS — cached, layered, lit pixel-art scenes
//  Static detail is drawn once into offscreen layers; only lights,
//  rain and UI state are drawn per frame.
// =====================================================================
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const _layers = {};

function layer(key, fn) {
  if (_layers[key]) return _layers[key];
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const prev = ctx;
  ctx = c.getContext('2d');
  try { fn(); } finally { ctx = prev; }
  return (_layers[key] = c);
}
function blit(c) { ctx.drawImage(c, 0, 0); }

// Ordered-dither vertical gradient between palette stops
function vgrad(x, y, w, h, stops) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  const n = stops.length - 1;
  for (let j = 0; j < h; j++) {
    const tt = (j / Math.max(1, h - 1)) * n;
    const i = Math.min(n - 1, Math.floor(tt));
    const th = (tt - i) * 16;
    const a = stops[i], b = stops[i + 1];
    let start = 0, cur = null;
    for (let k = 0; k <= w; k++) {
      const col = k === w ? null : (BAYER[((y + j) & 3) * 4 + ((x + k) & 3)] < th ? b : a);
      if (col !== cur) {
        if (cur) rect(x + start, y + j, k - start, 1, cur);
        start = k; cur = col;
      }
    }
  }
}

function dither(x, y, w, h, c, a) {
  ctx.globalAlpha = a;
  rect(x, y, w, h, c);
  ctx.globalAlpha = 1;
}

// Wet-ground reflection: broken horizontal streaks that narrow with distance
function shimmer(x, y, w, h, c, a) {
  ctx.globalAlpha = a;
  ctx.fillStyle = c;
  for (let j = 0; j < h; j += 2) {
    const ww = Math.max(1, Math.round(w * (1 - j / h)));
    ctx.fillRect(Math.round(x + (w - ww) / 2 + (hash(x * 3 + j) - 0.5) * 2), y + j, ww, 1);
  }
  ctx.globalAlpha = 1;
}

function ellipse(cx, cy, rx, ry, c) {
  if (c) ctx.fillStyle = c;
  const R = Math.max(1, Math.round(ry));
  for (let y = -R; y <= R; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (R * R))));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

function ring(cx, cy, r, c, th = 1) {
  ctx.fillStyle = c;
  const ri = r - th;
  for (let y = -r; y <= r; y++) {
    const xo = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
    const xi = Math.abs(y) <= ri ? Math.round(Math.sqrt(ri * ri - y * y)) : -1;
    ctx.fillRect(cx - xo, cy + y, xo - xi, 1);
    ctx.fillRect(cx + xi + 1, cy + y, xo - xi, 1);
  }
}

// Banded additive light — stepped falloff keeps the pixel-art look
function light(cx, cy, rx, ry, c, a, steps = 4) {
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a / steps;
  for (let s = 0; s < steps; s++) {
    const k = 1 - s / steps;
    ellipse(cx, cy, rx * k, ry * k, c);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = op;
}

function cone(x, y, topW, botW, h, c, a, steps = 3) {
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a / steps;
  for (let s = 0; s < steps; s++) {
    const k = 1 - (s / steps) * 0.6;
    poly([[x - topW / 2 * k, y], [x + topW / 2 * k, y], [x + botW / 2 * k, y + h], [x - botW / 2 * k, y + h]], c);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = op;
}

function rrect(x, y, w, h, c, r = 2) {
  rect(x + r, y, w - r * 2, h, c);
  rect(x, y + r, w, h - r * 2, c);
  if (r > 1) rect(x + 1, y + 1, w - 2, h - 2, c);
}

function rain(t, n, x0, y0, w, h, col, a, speed, len, seed = 0) {
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  n = Math.round(n * CFG.particles);
  for (let i = 0; i < n; i++) {
    const k = i + seed * 1000;
    const sp = speed * (0.8 + hash(k + 3) * 0.4);
    const y = (hash(k + 40) * h + t * sp) % h;
    const x = (hash(k) * w + t * sp * 0.15) % w;
    ctx.fillRect((x0 + x) | 0, (y0 + y) | 0, 1, len);
    ctx.fillRect((x0 + x + 1) | 0, (y0 + y + len) | 0, 1, Math.max(1, len >> 1));
  }
  ctx.globalAlpha = 1;
}

function splashes(t, n, x0, y0, w, h, col, seed = 0) {
  const f = Math.floor(t / 110), ph = (t / 110) % 1;
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.55 * (1 - ph);
  n = Math.round(n * CFG.particles);
  for (let i = 0; i < n; i++) {
    const k = f * 131 + i * 17 + seed;
    const x = (x0 + hash(k) * w) | 0, y = (y0 + hash(k + 1) * h) | 0;
    if (ph < 0.5) { ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x - 1, y - 2, 1, 1); ctx.fillRect(x + 1, y - 2, 1, 1); }
    else { ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); }
  }
  ctx.globalAlpha = 1;
}

function ripples(t, x, y, rx, col, seed = 0) {
  const ph = ((t / 900) + hash(seed)) % 1;
  ctx.globalAlpha = 0.5 * (1 - ph);
  const r = 1 + ph * rx;
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x - r), y, 1, 1);
  ctx.fillRect(Math.round(x + r), y, 1, 1);
  ctx.fillRect(Math.round(x - r * 0.6), y - 1, Math.round(r * 1.2) + 1, 1);
  ctx.globalAlpha = 1;
}

function buildings(o) {
  let x = o.x0;
  for (let i = 0; i < o.n; i++) {
    const s = o.seed * 31 + i;
    const w = Math.round(o.wMin + hash(s) * (o.wMax - o.wMin));
    const h = Math.round(o.hMin + hash(s + 1) * (o.hMax - o.hMin));
    const top = o.y - h;
    rect(x, top, w, h, o.body);
    if (hash(s + 2) > 0.6 && w > 10) {
      const sw = Math.round(w * 0.6), sx = x + Math.round((w - sw) / 2), sh = Math.round(4 + hash(s + 3) * 10);
      rect(sx, top - sh, sw, sh, o.body);
      rect(sx, top - sh, 1, sh, o.rim);
      rect(sx, top - sh, sw, 1, o.rim);
    }
    if (hash(s + 4) > 0.72) {
      const ax = x + Math.round(w / 2), ah = 6 + Math.round(hash(s + 5) * 10);
      rect(ax, top - ah, 1, ah, o.body);
    }
    rect(x, top, 1, h, o.rim);
    rect(x, top, w, 1, o.rim);
    for (let wy = top + 3; wy < o.y - 3; wy += o.gapY)
      for (let wx = x + 2; wx + o.winW <= x + w - 2; wx += o.gapX) {
        const r = hash(wx * 7.3 + wy * 13.1 + o.seed);
        if (r < o.lit) rect(wx, wy, o.winW, o.winH, o.win2 && r < o.lit * 0.3 ? o.win2 : o.win);
        else if (o.winDim && r < o.lit + 0.2) rect(wx, wy, o.winW, o.winH, o.winDim);
      }
    x += w + Math.round(hash(s + 6) * o.step);
  }
}

function bricks(x, y, w, h, base, mortar, hi, seed) {
  rect(x, y, w, h, base);
  for (let r = 0; r * 4 < h; r++) {
    const yy = y + r * 4;
    if (yy + 3 < y + h) rect(x, yy + 3, w, 1, mortar);
    const off = (r & 1) * 4;
    for (let xx = x - off; xx < x + w; xx += 8) {
      if (xx + 7 >= x && xx + 7 < x + w) rect(xx + 7, yy, 1, Math.min(3, y + h - yy), mortar);
      if (xx < x || xx + 7 > x + w || yy + 3 > y + h) continue;
      const hv = hash(seed + r * 37 + xx * 1.7);
      if (hv > 0.8) rect(xx, yy, 7, 1, hi);
      else if (hv < 0.08) rect(xx, yy, 7, 3, mortar);
    }
  }
}

// 3x5 pixel font for in-world signage
const PXF = {
  A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##', D: '##. #.# #.# #.# ##.',
  E: '### #.. ##. #.. ###', F: '### #.. ##. #.. #..', G: '.## #.. #.# #.# .##', H: '#.# #.# ### #.# #.#',
  I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# .#.', K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###',
  M: '#.# ### ### #.# #.#', N: '##. #.# #.# #.# #.#', O: '.#. #.# #.# #.# .#.', P: '##. #.# ##. #.. #..',
  Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#', S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.',
  U: '#.# #.# #.# #.# ###', V: '#.# #.# #.# #.# .#.', W: '#.# #.# ### ### #.#', X: '#.# #.# .#. #.# #.#',
  Y: '#.# #.# .#. .#. .#.', Z: '### ..# .#. #.. ###', '?': '##. ..# .#. ... .#.', '.': '... ... ... ... .#.',
  '!': '.#. .#. .#. ... .#.',
};
for (const k in PXF) PXF[k] = PXF[k].split(' ');

function pixText(str, x, y, c, sc = 1) {
  ctx.fillStyle = c;
  let cx = x | 0;
  for (const ch of str.toUpperCase()) {
    const g = PXF[ch];
    if (g) for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++)
      if (g[r][k] === '#') ctx.fillRect(cx + k * sc, (y | 0) + r * sc, sc, sc);
    cx += 4 * sc;
  }
}

function vignette() {
  return layer('vignette', () => {
    const id = ctx.createImageData(W, H), d = id.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
      const r = Math.sqrt(dx * dx * 0.7 + dy * dy);
      const k = Math.min(1, Math.max(0, (r - 0.65) / 0.55));
      d[(y * W + x) * 4 + 3] = (Math.floor(k * 5) / 5) * 0.6 * 255;
    }
    ctx.putImageData(id, 0, 0);
  });
}

// =====================================================================
//  HUB WINDOW — city skyline behind the menu frame
// =====================================================================
function drawHubBackdrop(t) {
  blit(layer('hub', () => {
    rect(0, 0, W, H, '#08060e');
    vgrad(0, 0, W, 140, ['#07051a', '#0d0a24', '#160f30', '#24133a', '#3c1840', '#62203f', '#8a2c3c']);
    buildings({ seed: 1, y: 132, n: 30, x0: -6, step: 2, wMin: 10, wMax: 22, hMin: 40, hMax: 100,
      body: '#1c1432', rim: '#2c1e46', win: '#5a3f7a', lit: 0.08, winW: 1, winH: 1, gapX: 3, gapY: 4 });
    dither(0, 70, W, 62, '#4a1a40', 0.18);
    buildings({ seed: 2, y: 140, n: 26, x0: -10, step: 4, wMin: 12, wMax: 26, hMin: 20, hMax: 70,
      body: '#100b1c', rim: '#3a1a36', win: '#d89040', win2: '#ffd890', winDim: '#2a1a24', lit: 0.16, winW: 2, winH: 1, gapX: 4, gapY: 4 });
    rect(0, 140, W, 20, '#08060e');
    rect(0, 140, W, 1, '#2a1830');
    dither(0, 141, W, 4, '#3a1a36', 0.4);
  }));
  rain(t, 50, 0, 0, W, 156, '#a8a8e0', 0.22, 0.35, 3, 1);
  for (let i = 0; i < 4; i++)
    if (Math.sin(t / 500 + i * 2) > 0.6) px(40 + i * 77, 30 + hash(i) * 20, '#ff4050');
}

// =====================================================================
//  ARENA — rainy backstreet
// =====================================================================
const BG = {};
BG.black = () => rect(0, 0, W, H, '#000');

function drawArena() {
  rect(0, 0, W, H, '#0c0916');
  vgrad(0, 0, W, 66, ['#05040b', '#0a0716', '#120b22', '#1e0f2c', '#33142f', '#4a1a32']);
  buildings({ seed: 11, y: 64, n: 26, x0: 40, step: 1, wMin: 8, wMax: 18, hMin: 18, hMax: 46,
    body: '#150f24', rim: '#241838', win: '#7a5a9a', lit: 0.1, winW: 1, winH: 1, gapX: 3, gapY: 4 });
  dither(0, 44, W, 22, '#4a1a32', 0.22);
  buildings({ seed: 12, y: 72, n: 18, x0: 50, step: 3, wMin: 10, wMax: 20, hMin: 14, hMax: 34,
    body: '#0c0916', rim: '#2e1832', win: '#d08a3c', win2: '#ffcf80', lit: 0.14, winW: 2, winH: 1, gapX: 4, gapY: 4 });

  // wet asphalt
  vgrad(0, 72, W, 108, ['#1a1424', '#1e1728', '#18121f', '#120d18']);
  dither(0, 72, W, 3, '#000', 0.5);
  line(160, 74, 160, 180, '#100c16');
  for (let i = 0; i < 9; i++) {
    let cx = 70 + hash(i + 200) * 180, cy = 78 + hash(i + 210) * 26;
    for (let k = 0; k < 4; k++) {
      const nx = cx + (hash(i * 9 + k) - 0.5) * 10, ny = cy + hash(i * 7 + k) * 3;
      line(cx, cy, nx, ny, '#120e1a'); cx = nx; cy = ny;
    }
  }
  // drain grate
  rect(146, 96, 28, 6, '#0e0b14');
  for (let x = 148; x < 172; x += 3) rect(x, 97, 1, 4, '#26202e');
  rect(146, 96, 28, 1, '#2a2434');
  // puddles
  ellipse(104, 92, 26, 3, '#120e1c'); ellipse(104, 91, 24, 1, '#2a2140');
  ellipse(218, 98, 30, 4, '#120e1c'); ellipse(218, 96, 28, 1, '#2a2140');

  // left facade
  bricks(0, 0, 58, 86, '#1e1522', '#130d17', '#281c2c', 3);
  rect(57, 0, 1, 86, '#3a2440');
  rect(16, 50, 20, 36, '#0c0910');
  rect(18, 52, 16, 34, '#241a2c');
  rect(19, 54, 6, 12, '#1c1424'); rect(27, 54, 6, 12, '#1c1424');
  rect(19, 68, 6, 14, '#1c1424'); rect(27, 68, 6, 14, '#1c1424');
  rect(31, 70, 1, 4, '#8a8070');
  rect(22, 45, 8, 3, '#3a3040'); rect(24, 48, 4, 1, '#ffd890');
  rect(46, 0, 3, 86, '#2a2232'); rect(46, 0, 1, 86, '#3a3244');
  for (let y = 10; y < 86; y += 18) rect(45, y, 5, 2, '#1a1420');
  rect(6, 18, 18, 12, '#2c2836'); rect(6, 18, 18, 1, '#3c3848');
  for (let x = 8; x < 22; x += 2) rect(x, 21, 1, 7, '#1c1a24');
  rect(28, 32, 30, 2, '#2a2434');
  for (let x = 29; x < 58; x += 3) rect(x, 26, 1, 6, '#2a2434');
  rect(28, 26, 30, 1, '#2a2434');
  line(30, 34, 50, 50, '#241e2c', 2);
  dither(0, 86, 58, 5, '#000', 0.5);

  // right facade
  bricks(262, 0, 58, 86, '#1a1420', '#110b15', '#241a28', 7);
  rect(262, 0, 1, 86, '#3a2034');
  rect(268, 14, 44, 18, '#0e0a12'); rect(268, 14, 44, 1, '#2a2030'); rect(268, 31, 44, 1, '#2a2030');
  rect(272, 32, 1, 4, '#1a1420'); rect(306, 32, 1, 4, '#1a1420');
  rect(288, 42, 20, 16, '#0c0a10'); rect(289, 43, 18, 14, '#1c1626');
  for (let y = 44; y < 57; y += 2) rect(289, y, 18, 1, '#2a2030');
  rect(287, 58, 22, 2, '#2c2434');
  rect(266, 66, 44, 18, '#16221e');
  rect(264, 64, 48, 3, '#24362f'); rect(264, 64, 48, 1, '#2e4a3e');
  rect(268, 70, 40, 1, '#1e2e28'); rect(268, 76, 40, 1, '#1e2e28');
  rect(276, 72, 8, 4, '#3a2a1a');
  ellipse(304, 82, 6, 4, '#120e16'); ellipse(312, 83, 5, 3, '#0e0b12');
  px(302, 79, '#2a2430'); px(311, 81, '#2a2430');
  dither(262, 86, 58, 5, '#000', 0.5);

  // fog
  dither(0, 62, W, 14, '#5a2a5a', 0.12);
}

BG.arena = (s, t) => {
  blit(layer('arena', drawArena));
  const neonOn = hash(Math.floor(t / 70)) > 0.08;
  if (neonOn) {
    light(290, 23, 36, 18, '#ff3050', 0.3);
    light(290, 92, 44, 5, '#ff3050', 0.22);
    light(218, 96, 26, 2, '#ff3050', 0.3, 2);
    pixText('BAR', 280, 19, '#ff8a9a', 2);
  } else {
    pixText('BAR', 280, 19, '#4a1a24', 2);
  }
  const lamp = 0.85 + 0.15 * Math.sin(t / 60) * Math.sin(t / 23);
  light(26, 50, 22, 16, '#ffc070', 0.3 * lamp);
  light(28, 92, 32, 5, '#ffc070', 0.22 * lamp);
  light(104, 91, 20, 2, '#ffc070', 0.2 * lamp, 2);
  light(160, 96, 90, 12, '#6a5ac8', 0.16);
  rain(t, 60, 0, 0, W, 104, '#9a9ad0', 0.2, 0.3, 3, 2);
  rain(t, 30, 0, 0, W, 104, '#c8c8f0', 0.35, 0.55, 5, 3);
  splashes(t, 12, 0, 80, W, 24, '#b0b0e0');
  ripples(t, 104, 91, 18, '#8a7ab0', 1);
  ripples(t, 218, 97, 22, '#8a7ab0', 2);
  for (let i = 0; i < 10 * CFG.particles; i++) {
    const k = Math.floor(t / 140) * 30 + i;
    if (hash(k) < 0.5) continue;
    ctx.globalAlpha = 0.5;
    px(hash(k + 1) * W, 20 + hash(k + 2) * 70, hash(k + 3) > 0.5 ? '#ff3a50' : '#c8a8ff');
    ctx.globalAlpha = 1;
  }
};

// =====================================================================
//  VOICE CALL UI
// =====================================================================
const CALL_PANELS = [
  { id: 'lobelto', x: 16, hat: 'headset', name: 'LOBELTO', bg0: '#161a34', bg1: '#10132a', glow: '#3a4ab0' },
  { id: 'gonza', x: 168, hat: 'cap', name: 'GONZA', bg0: '#2a1420', bg1: '#1e0e18', glow: '#a03050' },
];

function iconMic(cx, cy, c) {
  rect(cx - 1, cy - 4, 3, 5, c);
  rect(cx - 3, cy - 1, 1, 2, c); rect(cx + 3, cy - 1, 1, 2, c);
  rect(cx - 2, cy + 1, 5, 1, c); rect(cx, cy + 2, 1, 2, c); rect(cx - 2, cy + 4, 5, 1, c);
}

function drawCallBase() {
  rect(0, 0, W, H, '#121218');
  dither(0, 15, W, H - 15, '#17171f', 0.25);
  rect(0, 0, W, 14, '#0b0b10');
  rect(0, 14, W, 1, '#1e1e28');
  // speaker icon
  rect(6, 5, 2, 4, '#9c97a8'); rect(8, 4, 1, 6, '#9c97a8'); rect(9, 3, 1, 8, '#9c97a8');
  px(11, 5, '#9c97a8'); px(11, 8, '#9c97a8'); px(12, 6, '#9c97a8'); px(12, 7, '#9c97a8');
  for (const p of CALL_PANELS) {
    rrect(p.x - 1, 21, 138, 98, '#08080c', 3);
    vgrad(p.x, 22, 136, 96, [p.bg0, p.bg1, '#0e0e14']);
    light(p.x + 68, 56, 50, 32, p.glow, 0.28, 5);
    rect(p.x, 22, 136, 1, '#ffffff10');
    dither(p.x, 22, 136, 96, '#000', 0.08);
  }
  // control pill
  rrect(97, 125, 126, 22, '#08080c', 3);
  rrect(98, 126, 124, 20, '#1a1a22', 3);
  rect(100, 126, 120, 1, '#2a2a34');
  disc(122, 136, 7, '#2a2a34'); iconMic(122, 136, '#d8d8e0');
  disc(146, 136, 7, '#2a2a34');
  rect(142, 134, 6, 5, '#d8d8e0'); rect(148, 135, 1, 3, '#d8d8e0'); rect(149, 134, 1, 5, '#d8d8e0');
  disc(170, 136, 7, '#2a2a34');
  rect(166, 132, 9, 1, '#d8d8e0'); rect(166, 138, 9, 1, '#d8d8e0');
  rect(166, 132, 1, 7, '#d8d8e0'); rect(174, 132, 1, 7, '#d8d8e0');
  px(170, 134, '#d8d8e0'); rect(169, 135, 3, 1, '#d8d8e0'); rect(170, 136, 1, 2, '#d8d8e0');
  rrect(186, 130, 28, 12, '#c8323e', 3);
  rect(188, 130, 24, 1, '#e85a64');
  rect(194, 135, 12, 2, '#fff'); rect(192, 136, 3, 2, '#fff'); rect(205, 136, 3, 2, '#fff');
}

BG.call = (s, t) => {
  blit(layer('call', drawCallBase));
  ctx.font = '9px VT323, monospace';
  ctx.fillStyle = '#c9c4d4';
  ctx.fillText('PICHA BRAVA  ·  canal de voz', 18, 10);
  ctx.fillStyle = '#6a6578';
  const secs = Math.floor(t / 1000);
  ctx.fillText(`${String(Math.floor(secs / 60) % 60).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, 290, 10);
  disc(282, 7, 2, '#3fbf6a');

  for (const p of CALL_PANELS) {
    const off = s.offline && s.offline[p.id];
    const speaking = s.speaker === p.id && s.typing;
    if (speaking) {
      light(p.x + 68, 56, 34, 34, '#3fbf6a', 0.3, 4);
      ring(p.x + 68, 56, 24, '#3fbf6a', 2);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(p.x, 22, 136, 96); ctx.clip();
    ctx.translate(p.x + 68, 56); ctx.scale(1.6, 1.6); ctx.translate(-(p.x + 68), -56);
    avatarHead(p.x + 68, 56, p.hat, t, off);
    ctx.restore();

    if (s.glitch === p.id) {
      for (let i = 0; i < 16; i++) {
        const k = Math.floor(t / 40) * 16 + i;
        rect(p.x + 2 + hash(k) * 110, 24 + hash(k + 1) * 88, 8 + hash(k + 2) * 40, 2, hash(k + 3) > 0.5 ? '#ff2a3c' : '#2a2630');
      }
    }
    if (off) {
      ctx.globalAlpha = 0.55; rect(p.x, 22, 136, 96, '#000'); ctx.globalAlpha = 1;
      rrect(p.x + 36, 84, 64, 12, '#3a1018', 2);
      ctx.font = '9px VT323, monospace'; ctx.fillStyle = '#ff6a78';
      ctx.fillText('DESCONECTADO', p.x + 42, 93);
    } else if (s.silent === p.id) {
      ctx.font = '12px VT323, monospace'; ctx.fillStyle = '#8a8598';
      ctx.fillText('...', p.x + 62, 96);
    }
    const tagW = 18 + p.name.length * 5;
    ctx.globalAlpha = 0.6; rrect(p.x + 5, 104, tagW, 11, '#000', 2); ctx.globalAlpha = 1;
    iconMic(p.x + 11, 109, off ? '#5a2030' : speaking ? '#3fbf6a' : '#9c97a8');
    ctx.font = '10px VT323, monospace';
    ctx.fillStyle = off ? '#5a5666' : '#e8e4f0';
    ctx.fillText(p.name, p.x + 17, 113);
    disc(p.x + 128, 30, 2, off ? '#5a2030' : speaking ? '#3fbf6a' : '#3a5a3a');
  }
};

// =====================================================================
//  SCREEN SHARE — gacha pull
// =====================================================================
const GACHA_CARDS = [{ x: 46, gold: true }, { x: 128, gold: false }, { x: 210, gold: true }];

function drawShare() {
  rrect(22, 15, 276, 117, '#000', 3);
  rrect(23, 16, 274, 115, '#1a1a22', 3);
  rect(24, 17, 272, 10, '#101016');
  const cx = 160, cy = 76;
  rect(26, 28, 268, 100, '#140a1e');
  ctx.save();
  ctx.beginPath(); ctx.rect(26, 28, 268, 100); ctx.clip();
  for (let i = 0; i < 18; i++) {
    const a0 = (i / 18) * Math.PI * 2, a1 = a0 + Math.PI / 18;
    poly([[cx, cy], [cx + Math.cos(a0) * 220, cy + Math.sin(a0) * 220], [cx + Math.cos(a1) * 220, cy + Math.sin(a1) * 220]], '#1e1030');
  }
  light(cx, cy, 130, 60, '#6a2a9a', 0.4, 5);
  dither(26, 28, 268, 100, '#000', 0.12);
  ctx.restore();

  for (const c of GACHA_CARDS) {
    const g = c.gold;
    const P = g
      ? { edge: '#5a3c10', frame: '#d8a840', hi: '#ffe28a', inner: '#7a5418', art: ['#2a1606', '#5a320c', '#a86a1e', '#e0a040'], sil: '#1a0c04', rim: '#ffe0a0', plate: '#2a1a06' }
      : { edge: '#24222c', frame: '#6a6878', hi: '#9a98a8', inner: '#2a2834', art: ['#0e0e16', '#16182a', '#22263c', '#323850'], sil: '#08080e', rim: '#8a90b0', plate: '#14141c' };
    rrect(c.x - 3, 31, 70, 90, P.edge, 2);
    rect(c.x - 2, 32, 68, 88, P.frame);
    rect(c.x - 2, 32, 68, 1, P.hi);
    rect(c.x - 1, 33, 66, 86, P.inner);
    vgrad(c.x + 1, 35, 62, 64, P.art);
    // character silhouette with rim light
    const sx = c.x + 32;
    disc(sx, 58, 9, P.sil);
    poly([[sx - 16, 99], [sx + 16, 99], [sx + 11, 70], [sx - 11, 70]], P.sil);
    rect(sx - 3, 66, 6, 5, P.sil);
    for (let y = 50; y < 66; y++) px(sx + Math.round(Math.sqrt(Math.max(0, 81 - (y - 58) ** 2))), y, P.rim);
    line(sx + 11, 70, sx + 16, 99, P.rim);
    rect(c.x + 1, 101, 62, 10, P.plate);
    rect(c.x + 1, 101, 62, 1, P.frame);
    rect(c.x + 8, 105, 48, 2, P.inner);
    for (const [gx, gy] of [[c.x - 1, 33], [c.x + 63, 33], [c.x - 1, 117], [c.x + 63, 117]]) {
      px(gx, gy, g ? '#ff7a6a' : '#7a8ab0');
    }
    if (g) { star(c.x + 18, 115, P.hi); star(c.x + 32, 115, P.hi); star(c.x + 46, 115, P.hi); }
    else star(c.x + 32, 115, P.hi);
  }
}

BG.share = (s, t) => {
  BG.call(s, t);
  blit(layer('share', drawShare));
  ctx.font = '9px VT323, monospace';
  ctx.fillStyle = '#c9c4d4';
  ctx.fillText('GONZA  ·  pantalla compartida', 30, 25);
  rrect(256, 18, 37, 8, '#d02838', 2);
  ctx.fillStyle = '#fff';
  ctx.fillText('EN VIVO', 260, 25);

  GACHA_CARDS.forEach((c, i) => {
    if (!c.gold) return;
    const pulse = 0.5 + 0.5 * Math.sin(t / 220 + i);
    light(c.x + 32, 76, 46, 56, '#ffb040', 0.12 + 0.12 * pulse, 4);
    ctx.save();
    ctx.beginPath(); ctx.rect(c.x + 1, 35, 62, 64); ctx.clip();
    const sx = c.x - 30 + ((t / 8 + i * 40) % 140);
    ctx.globalAlpha = 0.35;
    poly([[sx, 35], [sx + 8, 35], [sx - 20, 99], [sx - 28, 99]], '#fff6d0');
    ctx.globalAlpha = 1;
    ctx.restore();
    for (let k = 0; k < 4; k++) {
      const f = Math.floor(t / 180) + k * 7 + i * 13;
      if (hash(f) > 0.5) px(c.x + hash(f + 1) * 64, 34 + hash(f + 2) * 84, '#fff');
    }
  });
};

// =====================================================================
//  GONZA'S ROOM — night, monitor-lit
// =====================================================================
function drawRoom() {
  vgrad(0, 0, W, 126, ['#100e22', '#16132c', '#1a1632', '#1d1835']);
  for (let x = 4; x < W; x += 10) rect(x, 4, 1, 122, '#1b1734');
  rect(0, 0, W, 3, '#0c0a1a'); rect(0, 3, W, 1, '#221d3e');
  dither(0, 4, W, 6, '#0c0a1a', 0.4);
  rect(0, 126, W, 6, '#141024'); rect(0, 126, W, 1, '#2a2448');

  // floor planks
  rect(0, 132, W, 48, '#241a2a');
  for (let r = 0; r < 8; r++) {
    const y = 132 + r * 6;
    rect(0, y, W, 1, '#1a121e');
    const off = hash(r + 300) * 40;
    for (let x = off; x < W; x += 40 + hash(r * 3 + x) * 20) rect(x, y + 1, 1, 5, '#1a121e');
    for (let k = 0; k < 10; k++) rect(hash(r * 17 + k) * W, y + 2 + (k % 3), 4 + hash(k + r) * 6, 1, '#2a1f30');
  }
  dither(0, 132, W, 5, '#000', 0.4);

  // window
  rect(12, 12, 60, 52, '#2c2646');
  vgrad(14, 14, 56, 48, ['#0a1028', '#101a3c', '#18264c', '#22305a']);
  ctx.save();
  ctx.beginPath(); ctx.rect(14, 14, 56, 48); ctx.clip();
  disc(58, 23, 4, '#d8dcf0'); disc(56, 22, 3, '#101a3c');
  light(58, 23, 12, 12, '#6a7ac8', 0.2, 3);
  buildings({ seed: 21, y: 62, n: 14, x0: 12, step: 1, wMin: 5, wMax: 10, hMin: 10, hMax: 32,
    body: '#0a0e1e', rim: '#1a2440', win: '#c8a050', win2: '#ff8a6a', lit: 0.18, winW: 1, winH: 1, gapX: 2, gapY: 3 });
  ctx.restore();
  rect(41, 14, 2, 48, '#2c2646'); rect(14, 37, 56, 2, '#2c2646');
  ctx.globalAlpha = 0.25; line(18, 34, 30, 16, '#8a9ad8'); line(46, 60, 60, 42, '#8a9ad8'); ctx.globalAlpha = 1;
  rect(10, 64, 64, 3, '#3a3256'); rect(10, 64, 64, 1, '#4a4268');
  // curtains
  rect(2, 7, 80, 2, '#5a4a6a');
  for (const cx of [3, 71]) {
    rect(cx, 9, 10, 64, '#3a1e40');
    rect(cx + 2, 9, 2, 64, '#4a2a52'); rect(cx + 7, 9, 1, 64, '#2a1430');
    rect(cx, 72, 10, 2, '#2a1430');
  }
  // moonlight on floor
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.08;
  poly([[22, 136], [66, 136], [92, 178], [42, 178]], '#6a7ac8');
  poly([[28, 140], [60, 140], [80, 172], [46, 172]], '#6a7ac8');
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = op;

  // poster
  rect(84, 14, 36, 44, '#2a2440');
  vgrad(85, 15, 34, 42, ['#0e1830', '#142040', '#0a1226']);
  disc(102, 30, 9, '#c8c0a0'); disc(105, 28, 8, '#122040');
  for (let i = 0; i < 6; i++) px(88 + hash(i + 400) * 28, 17 + hash(i + 410) * 26, '#8a90a8');
  rect(85, 46, 34, 9, '#0a0e1a');
  pixText('LOBOTOMY', 86, 48, '#d8b860');

  // shelf
  for (const sy of [44, 62]) {
    rect(238, sy, 62, 2, '#3a2a3a'); rect(238, sy, 62, 1, '#4a3a4a'); dither(238, sy + 2, 62, 2, '#000', 0.4);
    let bx = 241;
    const books = ['#5a2a3a', '#2a3a5a', '#3a5a3a', '#6a5a2a', '#4a2a5a', '#2a4a4a'];
    for (let i = 0; i < 10 && bx < 280; i++) {
      const bh = 6 + Math.round(hash(sy + i) * 4), bw = 2 + Math.round(hash(sy + i + 50));
      rect(bx, sy - bh, bw, bh, books[(i + sy) % books.length]);
      rect(bx, sy - bh, 1, bh, '#ffffff18');
      bx += bw + (hash(sy * i) > 0.8 ? 2 : 0);
    }
  }
  rect(286, 34, 6, 10, '#3a3048'); disc(289, 32, 3, '#c8c0d8'); px(288, 32, '#1a1828'); px(290, 32, '#1a1828');
  rect(284, 56, 8, 6, '#5a3a2a'); rect(284, 56, 8, 1, '#7a5a3a');
  for (let i = 0; i < 6; i++) line(288, 56, 284 + i * 2, 48 + (i % 2) * 2, '#2a5a3a');

  // bed
  rect(306, 88, 14, 44, '#2a1e2e'); rect(306, 88, 14, 1, '#3a2e3e');
  rect(262, 112, 58, 20, '#2a1e2e');
  rect(262, 104, 46, 10, '#3a2a52'); rect(262, 104, 46, 1, '#4a3a62');
  for (let x = 268; x < 306; x += 9) rect(x, 106, 1, 8, '#2e2244');
  rect(292, 98, 16, 7, '#8a84a0'); rect(292, 98, 16, 2, '#c8c0d8');

  // desk lamp (off)
  rect(100, 86, 8, 2, '#2a2436'); line(104, 86, 100, 74, '#2a2436', 2); line(100, 74, 108, 70, '#2a2436', 2);
  poly([[106, 68], [114, 72], [110, 76], [104, 72]], '#342c44');

  // speakers
  rect(112, 74, 8, 16, '#1a1822'); rect(112, 74, 8, 1, '#2a2836');
  disc(116, 84, 2, '#2a2836'); px(116, 78, '#2a2836');
  rect(170, 74, 8, 16, '#1a1822'); rect(170, 74, 8, 1, '#2a2836');
  disc(174, 84, 2, '#2a2836'); px(174, 78, '#2a2836');

  // monitor
  rect(122, 56, 46, 32, '#16141e'); rect(122, 56, 46, 1, '#2a2636');
  rect(142, 88, 6, 2, '#16141e'); rect(136, 89, 18, 1, '#24202c');

  // desk
  rect(96, 90, 98, 4, '#3a2c3c'); rect(96, 90, 98, 1, '#54405a');
  rect(96, 94, 98, 3, '#2a1e2c');
  rect(166, 97, 26, 30, '#2a1e2c'); rect(166, 97, 1, 30, '#3a2c3c');
  rect(168, 106, 22, 1, '#1a121e'); rect(168, 116, 22, 1, '#1a121e');
  rect(177, 101, 4, 1, '#6a5a6a'); rect(177, 111, 4, 1, '#6a5a6a'); rect(177, 121, 4, 1, '#6a5a6a');
  rect(98, 97, 3, 35, '#241a28');
  dither(101, 97, 64, 35, '#000', 0.3);
  rect(128, 88, 32, 2, '#24202c'); rect(129, 88, 30, 1, '#3a3448');
  rect(164, 88, 3, 2, '#2a2636');

  // PC tower
  rect(198, 96, 16, 34, '#141220'); rect(198, 96, 16, 1, '#2a2638');
  rect(200, 99, 10, 27, '#0a0a14');
  rect(211, 99, 1, 27, '#2a2638');
  line(198, 120, 190, 100, '#0e0c14');

  // chair
  rect(138, 96, 24, 20, '#1e1828'); rect(138, 96, 24, 1, '#2e2638');
  rect(148, 96, 4, 20, '#5a1a2a');
  rect(136, 114, 28, 5, '#1a1424'); rect(136, 114, 28, 1, '#2a2234');
  rect(148, 119, 4, 9, '#141018');
  rect(138, 128, 24, 2, '#141018');
  px(138, 130, '#2a2430'); px(161, 130, '#2a2430'); px(150, 130, '#2a2430');

  // rug
  rect(104, 146, 96, 22, '#2e1828');
  rect(106, 148, 92, 18, '#3a1e30');
  dither(108, 150, 88, 14, '#2e1828', 0.3);
  rect(106, 148, 92, 1, '#5a2a40'); rect(106, 165, 92, 1, '#5a2a40');

  // clothes on floor
  ellipse(26, 156, 10, 3, '#3a3a5a'); ellipse(32, 154, 6, 2, '#4a4a6a');
  ellipse(40, 158, 7, 2, '#5a2a3a');
  rect(58, 164, 6, 3, '#d8d0c0'); rect(58, 166, 7, 1, '#3a3848');
}

BG.room = (s, t) => {
  blit(layer('room', drawRoom));
  ctx.save();
  ctx.beginPath(); ctx.rect(14, 14, 56, 48); ctx.clip();
  rain(t, 26, 14, 14, 56, 48, '#8a9ad8', 0.35, 0.35, 3, 4);
  ctx.restore();

  if (!s.monitorOff) {
    const flick = Math.sin(t / 700) > 0.95 ? 1.25 : 1;
    vgrad(124, 58, 42, 26, ['#1a2858', '#22346a', '#1a2a5a']);
    rect(126, 60, 14, 22, '#2a3c7a');
    for (let i = 0; i < 3; i++) {
      const cx = 144 + i * 7;
      rect(cx, 62, 6, 10, i === 1 ? '#5a5a7a' : '#d8a840');
      rect(cx + 1, 63, 4, 8, i === 1 ? '#2a2a3a' : '#5a3c10');
    }
    rect(127, 62, 10, 1, '#8aa0e0'); rect(127, 65, 8, 1, '#5a78c0'); rect(127, 68, 11, 1, '#5a78c0');
    rect(144, 76, 20, 4, '#c0283a'); rect(144, 76, 20, 1, '#ff5a6a');
    if (Math.floor(t / 500) % 2) rect(135, 68, 1, 3, '#8aa0e0');
    light(145, 72, 72, 46, '#3a6ad8', 0.22 * flick, 4);
    light(145, 91, 48, 4, '#5a8af0', 0.28 * flick, 3);
    light(145, 150, 76, 14, '#3a5ab8', 0.12 * flick, 3);
    for (let i = 0; i < 6; i++) {
      const k = i * 31;
      const mx = 120 + hash(k) * 50, my = 60 + ((hash(k + 1) * 60 + t * 0.004 * (1 + hash(k + 2))) % 60);
      ctx.globalAlpha = 0.4; px(mx, my, '#a8c0ff'); ctx.globalAlpha = 1;
    }
  } else {
    rect(124, 58, 42, 26, '#06060a');
    line(128, 82, 142, 60, '#12121a');
  }

  const hue = (t / 40) % 360;
  const led = `hsl(${hue | 0},85%,60%)`;
  rect(240, 64, 58, 1, led);
  light(269, 70, 40, 10, led, 0.25, 3);
  for (const fy of [106, 118]) { ring(205, fy, 4, led, 1); px(205, fy, led); }
  light(205, 112, 12, 18, led, 0.18, 3);

  if (!s.mugGone) {
    rect(178, 83, 7, 7, '#d8d0c0'); rect(185, 84, 2, 4, '#d8d0c0');
    rect(179, 84, 5, 1, '#3a2418'); rect(178, 89, 7, 1, '#a8a090');
    for (let i = 0; i < 3; i++) {
      const ph = ((t / 900) + i / 3) % 1;
      ctx.globalAlpha = 0.35 * (1 - ph);
      px(180 + i + Math.sin(t / 300 + i) * 1.5, 81 - ph * 10, '#c8c8d8');
      ctx.globalAlpha = 1;
    }
  }
};

// =====================================================================
//  L.CORP BRANCH — exterior, night, rain
// =====================================================================
function drawBranch() {
  rect(0, 0, W, H, '#0c0a14');
  vgrad(0, 0, W, 104, ['#04030a', '#080612', '#0e0a1a', '#160e22', '#201228', '#2e162c', '#3e1c30']);
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = 0.6;
    ellipse(hash(i + 50) * W, 10 + hash(i + 60) * 40, 30 + hash(i + 70) * 50, 2 + hash(i) * 3, '#1a1024');
    ctx.globalAlpha = 1;
  }
  buildings({ seed: 31, y: 104, n: 34, x0: -4, step: 1, wMin: 8, wMax: 16, hMin: 20, hMax: 60,
    body: '#100c1a', rim: '#1c1428', win: '#8a6a40', lit: 0.08, winW: 1, winH: 1, gapX: 3, gapY: 4 });
  dither(0, 80, W, 26, '#3e1c30', 0.25);
  const side = { y: 140, step: 2, wMin: 14, wMax: 24, hMin: 50, hMax: 92, body: '#0e0b16', rim: '#26182e',
    win: '#d09040', win2: '#9ad0c0', winDim: '#1a1420', lit: 0.2, winW: 2, winH: 1, gapX: 4, gapY: 5 };
  buildings({ ...side, seed: 32, n: 4, x0: -8 });
  buildings({ ...side, seed: 33, n: 4, x0: 252 });

  const bx = 70, bw = 180, top = 36;
  rect(bx, top, bw, 104, '#25222c');
  rect(bx - 2, top - 4, bw + 4, 5, '#2e2a36'); rect(bx - 2, top - 4, bw + 4, 1, '#403a4a');
  rect(bx + 12, top - 10, 14, 6, '#1a1822'); rect(bx + 12, top - 10, 14, 1, '#2a2832');
  for (let x = bx + 14; x < bx + 26; x += 2) rect(x, top - 8, 1, 3, '#24222c');
  rect(bx + 146, top - 16, 12, 12, '#1a1822'); rect(bx + 145, top - 17, 14, 2, '#24222c');
  rect(bx + 148, top - 4, 1, 4, '#1a1822'); rect(bx + 155, top - 4, 1, 4, '#1a1822');
  rect(232, top - 30, 1, 26, '#1a1822');
  rect(229, top - 22, 7, 1, '#1a1822'); rect(230, top - 14, 5, 1, '#1a1822');
  // sign backing
  rect(120, 19, 80, 14, '#121016'); rect(120, 19, 80, 1, '#2a2632'); rect(120, 32, 80, 1, '#2a2632');
  rect(128, 33, 1, 3, '#1a1822'); rect(191, 33, 1, 3, '#1a1822');

  const lit = [];
  for (let f = 0; f < 4; f++) {
    const wy = top + 6 + f * 16;
    for (let k = 0; k < 8; k++) {
      const wx = bx + 7 + k * 22;
      rect(wx - 1, wy - 1, 16, 12, '#15131a');
      const r = hash(k * 7 + f * 13 + 5);
      if (r > 0.8) {
        vgrad(wx, wy, 14, 10, ['#e8b868', '#a8702a']);
        for (let b = 1; b < 10; b += 2) rect(wx, wy + b, 14, 1, '#8a5a20');
        lit.push([wx, '#d8a050']);
      } else if (r > 0.68) {
        vgrad(wx, wy, 14, 10, ['#a8d8c0', '#6a9a88']);
        if (r > 0.76) { rect(wx + 5, wy + 3, 4, 7, '#1a2a24'); disc(wx + 7, wy + 3, 2, '#1a2a24'); }
        lit.push([wx, '#8ac8b0']);
      } else {
        vgrad(wx, wy, 14, 10, ['#141a2c', '#0c101c']);
        line(wx + 2, wy + 9, wx + 8, wy + 1, '#222c40');
      }
    }
    rect(bx, wy + 12, bw, 2, '#302c38'); rect(bx, wy + 12, bw, 1, '#3e3848'); rect(bx, wy + 14, bw, 1, '#1a1820');
  }
  for (let k = 0; k <= 8; k++) {
    const pxx = bx + 1 + k * 22;
    rect(pxx, top, 4, 66, '#2c2934'); rect(pxx, top, 1, 66, '#38343f'); rect(pxx + 3, top, 1, 66, '#1c1a24');
  }
  // ground floor
  rect(bx, 104, bw, 36, '#201d27');
  for (const gx of [bx + 8, bx + 126]) {
    rect(gx - 1, 108, 48, 28, '#15131a');
    vgrad(gx, 109, 46, 26, ['#10141e', '#0a0c14']);
    rect(gx + 15, 109, 1, 26, '#15131a'); rect(gx + 31, 109, 1, 26, '#15131a');
    line(gx + 3, 132, gx + 13, 112, '#1a2232');
  }
  rect(124, 102, 72, 5, '#3a3644'); rect(124, 102, 72, 1, '#4a4656'); rect(126, 107, 68, 1, '#c8e0d0');
  rect(134, 110, 52, 30, '#0c0e12');
  vgrad(136, 112, 48, 28, ['#1e3a32', '#16302a', '#12241e']);
  rect(159, 112, 2, 28, '#2a2832'); rect(134, 110, 52, 2, '#2a2832');
  rect(134, 110, 2, 30, '#2a2832'); rect(184, 110, 2, 30, '#2a2832');
  rect(155, 122, 1, 6, '#9a9aa0'); rect(164, 122, 1, 6, '#9a9aa0');
  rect(128, 140, 64, 2, '#2c2a32'); rect(128, 140, 64, 1, '#3a3842');
  rect(124, 142, 72, 2, '#26242c'); rect(124, 142, 72, 1, '#34323c');
  for (const ppx of [110, 196]) {
    rect(ppx, 128, 14, 12, '#2a2630'); rect(ppx, 128, 14, 1, '#3a3640');
    for (let i = 0; i < 5; i++) line(ppx + 7, 128, ppx + 2 + i * 2.5, 119 + (i % 2) * 3, '#2a3020');
  }

  // sidewalk, curb, road
  rect(0, 140, W, 20, '#1c1a22');
  for (let x = 0; x < W; x += 16) rect(x, 140, 1, 20, '#15131a');
  rect(0, 150, W, 1, '#17151d');
  dither(0, 140, W, 3, '#000', 0.4);
  rect(0, 160, W, 3, '#2e2c36'); rect(0, 160, W, 1, '#423e4c');
  rect(0, 163, W, 17, '#100e16');
  for (let x = 8; x < W; x += 32) rect(x, 172, 14, 1, '#3a3630');
  // wet reflections of lit windows
  for (const [wx, c] of lit) {
    shimmer(wx + 1, 144, 12, 15, c, 0.22);
    shimmer(wx + 3, 164, 8, 14, c, 0.14);
  }
  ellipse(60, 154, 18, 2, '#141220'); rect(44, 152, 32, 1, '#2a2638');
  ellipse(240, 169, 24, 3, '#0a0810'); rect(220, 166, 40, 1, '#24202e');

  // fence & bin
  rect(0, 120, 66, 1, '#24222c'); rect(0, 128, 66, 1, '#24222c');
  for (let x = 2; x < 66; x += 4) rect(x, 118, 1, 22, '#1a1820');
  rect(226, 128, 10, 12, '#1e2a26'); rect(225, 127, 12, 2, '#2a3a32');

  // street lamp
  rect(276, 58, 2, 82, '#1a1820'); rect(276, 58, 1, 82, '#26242c');
  rect(274, 136, 6, 4, '#1a1820');
  rect(268, 56, 10, 2, '#1a1820');
  rect(266, 58, 8, 3, '#24222c');
}

BG.branch = (s, t) => {
  blit(layer('branch', drawBranch));
  const signOn = Math.sin(t / 90) * Math.sin(t / 37) < 0.6;
  if (signOn) {
    light(160, 26, 52, 14, '#ff4a3a', 0.3);
    pixText('SUCURSAL ???', 137, 24, '#ff8a7a');
  } else {
    pixText('SUCURSAL ???', 137, 24, '#3a1a1a');
  }
  if (Math.sin(t / 400) > 0.5) { px(232, 5, '#ff3040'); light(232, 5, 5, 5, '#ff3040', 0.4, 2); }
  const door = hash(Math.floor(t / 120)) > 0.05 ? 1 : 0.3;
  light(160, 124, 40, 18, '#6ad0a8', 0.14 * door);
  light(160, 141, 34, 3, '#6ad0a8', 0.2 * door, 2);
  if (hash(Math.floor(t / 80)) > 0.1) {
    rect(268, 61, 6, 1, '#fff4c0');
    cone(271, 62, 8, 64, 78, '#f0d890', 0.16);
    light(271, 148, 36, 6, '#f0d890', 0.28);
    shimmer(262, 163, 18, 16, '#f0d890', 0.3);
  }
  rain(t, 70, 0, 0, W, H, '#a0a0d0', 0.22, 0.4, 3, 5);
  splashes(t, 16, 0, 142, W, 36, '#b8b8e0', 3);
  ripples(t, 60, 154, 14, '#8a8ab0', 3);
  ripples(t, 240, 169, 18, '#8a8ab0', 4);
};

// =====================================================================
//  CONTAINMENT CELL — concrete box, pipes, hazard band, floor grates
// =====================================================================
function drawCell() {
  const bx0 = 44, bx1 = 276, by0 = 14, by1 = 94, hz = 66;
  rect(0, 0, W, H, '#1a1c1a');
  vgrad(0, 0, W, by0, ['#0a0b0a', '#141614']);

  // back wall with panel seams and chamfered corners
  vgrad(bx0, by0, bx1 - bx0, by1 - by0, ['#2a2d29', '#31352f', '#2b2e2a']);
  for (let x = bx0 + 58; x < bx1; x += 58) { rect(x, by0, 1, by1 - by0, '#212420'); rect(x + 1, by0, 1, by1 - by0, '#3a3e37'); }
  rect(bx0, 40, bx1 - bx0, 1, '#212420'); rect(bx0, 41, bx1 - bx0, 1, '#3a3e37');
  poly([[bx0, by0], [bx0 + 12, by0], [bx0, by0 + 12]], '#1e211d');
  poly([[bx1, by0], [bx1 - 12, by0], [bx1, by0 + 12]], '#1e211d');
  for (let i = 0; i < 40; i++) px(bx0 + hash(i + 900) * (bx1 - bx0), by0 + hash(i + 950) * (by1 - by0), '#262925');

  // side walls in perspective
  poly([[0, 0], [bx0, by0], [bx0, by1], [0, by1 + 28]], '#222521');
  poly([[W, 0], [bx1, by0], [bx1, by1], [W, by1 + 28]], '#242723');
  line(bx0, by0, bx0, by1, '#3a3e37');
  line(bx1, by0, bx1, by1, '#181a17');

  // hazard band across the back wall and down the side walls
  ctx.save();
  ctx.beginPath(); ctx.rect(bx0, hz, bx1 - bx0, 7); ctx.clip();
  rect(bx0, hz, bx1 - bx0, 7, '#c8a030');
  for (let x = bx0 - 8; x < bx1; x += 8) poly([[x, hz + 7], [x + 4, hz + 7], [x + 11, hz], [x + 7, hz]], '#1a1814');
  ctx.restore();
  poly([[0, hz + 14], [bx0, hz], [bx0, hz + 7], [0, hz + 23]], '#a88828');
  poly([[W, hz + 14], [bx1, hz], [bx1, hz + 7], [W, hz + 23]], '#987820');

  // floor tiles in perspective
  poly([[0, by1 + 28], [bx0, by1], [bx1, by1], [W, by1 + 28], [W, H], [0, H]], '#1f211e');
  for (const fy of [97, 102, 109, 118, 130, 146, 166]) rect(0, fy, W, 1, '#181a17');
  for (let i = -7; i <= 7; i++) line(160 + i * 17, by1, 160 + i * 52, H, '#181a17');
  rect(bx0, by1, bx1 - bx0, 1, '#3a3e37');
  dither(bx0, by1 + 1, bx1 - bx0, 3, '#000', 0.3);
  for (const gx of [70, 196]) {
    rect(gx, 100, 54, 12, '#121411'); rect(gx, 100, 54, 1, '#2a2d29');
    for (let k = 0; k < 5; k++) rect(gx + 3, 102 + k * 2, 48, 1, '#262925');
  }

  // pipes: vertical on the left wall, along the top of the back wall, elbow on the right
  rect(16, 0, 6, 104, '#4a585e'); rect(16, 0, 2, 104, '#7a8a90'); rect(21, 0, 1, 104, '#2a3236');
  rect(14, 52, 10, 5, '#7a2a1a'); rect(14, 52, 10, 1, '#a84a30');
  rect(bx0, 18, bx1 - bx0 - 20, 4, '#3e4a50'); rect(bx0, 18, bx1 - bx0 - 20, 1, '#6a7a80');
  rect(bx1 - 22, 18, 4, 30, '#3e4a50'); rect(bx1 - 22, 18, 1, 30, '#6a7a80');
  for (let x = bx0 + 20; x < bx1 - 30; x += 46) rect(x, 17, 3, 6, '#2a3034');
  rect(58, 30, 14, 18, '#3a3e34'); rect(58, 30, 14, 1, '#4e5246'); rect(62, 48, 2, 18, '#3e4a50');

  // wall lamp cage
  rect(257, 38, 11, 14, '#2a2620'); rect(258, 39, 9, 12, '#1a1712');
}

BG.cell = (s, t) => {
  blit(layer('cell', drawCell));
  const on = hash(Math.floor(t / 90)) > 0.06;
  rect(259, 41, 7, 8, on ? '#ffd870' : '#6a5020');
  rect(259, 44, 7, 1, '#2a2620');
  if (on) {
    light(262, 45, 42, 34, '#ffc060', 0.22, 4);
    light(250, 106, 64, 9, '#ffc060', 0.14, 3);
  }
  light(160, 16, 130, 16, '#a8c0b0', 0.07, 3);
  for (let i = 0; i < 12 * CFG.particles; i++) {
    const k = i * 37;
    const mx = (hash(k) * W + t * 0.004 * (1 + hash(k + 1))) % W;
    const my = 20 + ((hash(k + 2) * 90 + t * 0.003) % 90);
    ctx.globalAlpha = 0.35; px(mx, my, '#c8c0a0'); ctx.globalAlpha = 1;
  }
};

// =====================================================================
//  POST — drawn over actors
// =====================================================================
const POST = {
  arena: () => blit(vignette()),
  cell: () => blit(vignette()),
  room: () => blit(vignette()),
  branch: (s, t) => { rain(t, 24, 0, 0, W, H, '#d8d8f8', 0.45, 0.75, 6, 9); blit(vignette()); },
};
function postFX(s, t) { const f = POST[s.bg]; if (f) f(s, t); }
