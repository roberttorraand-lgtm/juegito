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
  0: '### #.# #.# #.# ###', 1: '.#. ##. .#. .#. ###', 2: '##. ..# .#. #.. ###', 3: '##. ..# .#. ..# ##.',
  4: '#.# #.# ### ..# ..#', 5: '### #.. ##. ..# ##.', 6: '.## #.. ### #.# ###', 7: '### ..# .#. .#. .#.',
  8: '### #.# ### #.# ###', 9: '### #.# ### ..# ##.', '-': '... ... ### ... ...',
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
    const ex = s.exprs && s.exprs[p.id];
    avatarHead(p.x + 68, 56, p.hat, t, off, ex && ex.expr);
    ctx.restore();
    if (ex && ex.emote && ex.expr && !off) drawEmoteAt(ex.emote, p.x + 68, 64, 2.4, 1, t);

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
//  OLD L.CORP BRANCH — Episode 2 interiors
// =====================================================================
// A skeleton whose bones are not quite human: teal crystal growths and an
// extra joint. pose 'sit' leans against something, 'lie' lies on the floor.
function skeleton(x, y, pose, flip = 1) {
  const B = '#b8b49a', S = '#7a7664', D = '#0c0c0e', C = '#5a9a8c', V = '#8a6aa0';
  const L = (x0, y0, x1, y1, c = B) => line(x + x0 * flip, y + y0, x + x1 * flip, y + y1, c);
  if (pose === 'sit') {
    disc(x + 2 * flip, y - 22, 4, B); px(x + 1 * flip, y - 23, D); px(x + 3 * flip, y - 23, D); rect(x + (flip > 0 ? 0 : -3), y - 19, 4, 1, S);
    L(0, -18, 0, -4, S);
    for (let k = 0; k < 4; k++) { L(0, -16 + k * 2, -4, -14 + k * 2); L(0, -16 + k * 2, 4, -14 + k * 2); }
    rect(x - 3, y - 4, 7, 3, B);
    L(0, -2, 10, -1); L(10, -1, 16, 1); L(1, -2, 8, -6); L(8, -6, 13, 0);
    L(-1, -16, -5, -8); L(-5, -8, -7, -2); L(-7, -2, -6, 0, S);
    // growths
    px(x + 5 * flip, y - 15, C); px(x + 6 * flip, y - 16, C); px(x + 6 * flip, y - 14, C); px(x - 4 * flip, y - 10, V);
    px(x + 10 * flip, y - 2, C); px(x + 11 * flip, y - 3, C);
  } else {
    disc(x - 18 * flip, y - 3, 4, B); px(x - 19 * flip, y - 4, D); px(x - 17 * flip, y - 2, D);
    L(-14, -2, 2, -2, S);
    for (let k = 0; k < 4; k++) { L(-12 + k * 2, -2, -10 + k * 2, -6); L(-12 + k * 2, -2, -10 + k * 2, 1); }
    rect(x + 1, y - 4, 4, 5, B);
    L(4, -2, 12, -1); L(12, -1, 19, 0); L(4, 0, 10, 2); L(10, 2, 16, 4);
    L(-12, -3, -8, -9); L(-8, -9, -2, -10); L(-2, -10, 0, -9, S);
    px(x - 7 * flip, y - 7, C); px(x - 6 * flip, y - 8, C); px(x - 6 * flip, y - 6, V); px(x + 13 * flip, y - 2, C);
  }
}

// perspective room shell: back wall, side walls, tiled floor
function roomShell(o) {
  const { bx0, bx1, by0, by1 } = o;
  rect(0, 0, W, H, o.base);
  vgrad(0, 0, W, by0, [o.ceil[0], o.ceil[1]]);
  vgrad(bx0, by0, bx1 - bx0, by1 - by0, o.wall);
  poly([[0, 0], [bx0, by0], [bx0, by1], [0, by1 + 46]], o.left);
  poly([[W, 0], [bx1, by0], [bx1, by1], [W, by1 + 46]], o.right);
  line(bx0, by0, bx0, by1, o.edge); line(bx1, by0, bx1, by1, '#0c0c0e');
  poly([[0, by1 + 46], [bx0, by1], [bx1, by1], [W, by1 + 46], [W, H], [0, H]], o.floor);
  const rows = [3, 8, 15, 25, 38, 55];
  for (const r of rows) rect(0, by1 + r, W, 1, o.grout);
  for (let i = -9; i <= 9; i++) line(160 + i * 18, by1, 160 + i * 58, H, o.grout);
  rect(bx0, by1, bx1 - bx0, 1, o.edge);
  dither(bx0, by1 + 1, bx1 - bx0, 3, '#000', 0.35);
}

function drawReception() {
  const bx0 = 36, bx1 = 284, by0 = 12, by1 = 122;
  roomShell({ bx0, bx1, by0, by1, base: '#0e1012', ceil: ['#060708', '#0c0e10'], wall: ['#1e2428', '#22292c', '#1c2124'],
    left: '#161a1d', right: '#181d20', edge: '#2e383c', floor: '#1a1d1e', grout: '#121415' });
  // wall seams, water stains and cracks
  for (let x = bx0 + 31; x < bx1; x += 31) rect(x, by0, 1, by1 - by0, '#181d20');
  rect(bx0, 74, bx1 - bx0, 1, '#181d20'); rect(bx0, 75, bx1 - bx0, 1, '#283034');
  for (let i = 0; i < 9; i++) {
    const sx = bx0 + 8 + hash(i + 11) * (bx1 - bx0 - 16), sw = 3 + hash(i + 12) * 7;
    dither(sx, by0, sw, 20 + hash(i + 13) * 60, '#101416', 0.5);
  }
  for (let i = 0; i < 4; i++) {
    let cx = bx0 + 20 + hash(i + 40) * 200, cy = by0 + 6;
    for (let k = 0; k < 8; k++) { const nx = cx + (hash(i * 9 + k) - 0.5) * 8, ny = cy + 4 + hash(i * 7 + k) * 5; line(cx, cy, nx, ny, '#111517'); cx = nx; cy = ny; }
  }
  // company emblem and name, faded and chipped
  ring(160, 38, 16, '#3c4a46', 2); ring(160, 38, 11, '#2c3634', 1);
  line(160, 30, 160, 47, '#3c4a46', 2); line(160, 36, 154, 31, '#3c4a46'); line(160, 36, 166, 31, '#3c4a46');
  line(160, 41, 155, 37, '#3c4a46'); line(160, 41, 165, 37, '#3c4a46');
  pixText('LOBOTOMY CORPORATION', 120, 60, '#3a4644');
  for (let i = 0; i < 14; i++) rect(118 + hash(i + 70) * 84, 58 + hash(i + 71) * 8, 2, 2, '#1f2529');
  // hanging cables and a fallen ceiling panel
  for (const [cx, len] of [[70, 26], [214, 18], [252, 30]]) {
    for (let k = 0; k < len; k++) px(cx + Math.round(Math.sin(k / 6) * 2), by0 - 10 + k, '#0a0a0c');
  }
  // lockers against the back wall (the 3rd one is the one Gonza opens)
  for (let i = 0; i < 4; i++) {
    const lx = 212 + i * 17;
    rect(lx, 64, 16, 58, '#2a363c'); rect(lx, 64, 16, 1, '#41525a'); rect(lx, 64, 1, 58, '#3a4a52'); rect(lx + 15, 64, 1, 58, '#1a2226');
    for (let v = 0; v < 3; v++) rect(lx + 4, 70 + v * 3, 8, 1, '#1a2226');
    rect(lx + 12, 92, 2, 5, '#6a7a80');
    if (i === 0) {
      rect(lx + 1, 65, 14, 56, '#0c0f10');
      poly([[lx - 1, 65], [lx - 9, 69], [lx - 9, 119], [lx - 1, 121]], '#33424a');
      for (let v = 0; v < 3; v++) line(lx - 7, 74 + v * 3, lx - 3, 72 + v * 3, '#1a2226');
    }
    if (i === 3) { rect(lx + 3, 104, 9, 6, '#20292d'); }
  }
  // reception desk
  rect(66, 102, 114, 5, '#3a2e26'); rect(66, 102, 114, 1, '#5a4636');
  rect(68, 107, 110, 31, '#261e19');
  for (let x = 68; x < 178; x += 22) rect(x, 107, 1, 31, '#1a1410');
  rect(68, 137, 110, 1, '#120e0c');
  rect(96, 92, 16, 11, '#2a2a28'); rect(97, 93, 14, 8, '#0e1110'); line(98, 94, 108, 100, '#3a4a44');
  rect(102, 103, 4, 1, '#2a2a28');
  poly([[140, 101], [151, 97], [153, 99], [142, 103]], '#4a3a20');
  for (let i = 0; i < 6; i++) rect(124 + i * 7, 101 - (i % 2), 5, 1, '#8a8678');
  // floor: puddles, papers, debris and the bodies
  ellipse(232, 150, 26, 4, '#121619'); shimmer(214, 148, 36, 4, '#3a4a54', 0.3);
  ellipse(60, 168, 18, 3, '#121619');
  for (let i = 0; i < 12; i++) {
    const x = 20 + hash(i + 300) * 280, y = 128 + hash(i + 301) * 48;
    rect(x, y, 4, 2, i % 3 ? '#6a685e' : '#8a8678');
  }
  for (let i = 0; i < 24; i++) px(bx0 + hash(i + 500) * (bx1 - bx0), by1 + 2 + hash(i + 501) * 6, '#2a2e30');
  poly([[180, 156], [214, 150], [222, 156], [190, 164]], '#22282a'); line(180, 156, 214, 150, '#30383a');
  skeleton(122, 140, 'sit');
  skeleton(44, 160, 'lie', -1);
}

BG.reception = (s, t) => {
  blit(layer('reception', drawReception));
  if (s.lockerOpen) {
    const lx = 212 + 2 * 17;
    rect(lx + 1, 65, 14, 56, '#0a0c0d');
    rect(lx + 2, 88, 12, 1, '#2a3236');
    poly([[lx + 16, 65], [lx + 24, 69], [lx + 24, 119], [lx + 16, 121]], '#33424a');
  }
  // the hanging lamp sparks now and then
  const k = Math.floor(t / 80);
  const sp = hash(k) > 0.93;
  line(252, 0, 252, 18, '#0a0a0c');
  rect(248, 18, 9, 3, '#2a2a28');
  if (sp) { rect(249, 21, 7, 1, '#fff0c0'); px(250 + hash(k + 1) * 6, 23 + hash(k + 2) * 3, '#ffd060'); }
  s._lamp = sp;
  for (let i = 0; i < 14 * CFG.particles; i++) {
    const kk = i * 31;
    const mx = (hash(kk) * W + t * 0.003 * (1 + hash(kk + 1))) % W, my = 14 + ((hash(kk + 2) * 120 + t * 0.002) % 120);
    ctx.globalAlpha = 0.3; px(mx, my, '#b8b8a8'); ctx.globalAlpha = 1;
  }
};

// One-point corridor: d = 0 at the near edge, 1 at the far end
const HALL = { vx0: 136, vx1: 184, vy0: 56, vy1: 92 };
const hallL = (d, v) => [HALL.vx0 * d, v === 'top' ? HALL.vy0 * d : H - (H - HALL.vy1) * d];
const hallR = (d, v) => [W - (W - HALL.vx1) * d, v === 'top' ? HALL.vy0 * d : H - (H - HALL.vy1) * d];

function drawHallway() {
  const { vx0, vx1, vy0, vy1 } = HALL;
  rect(0, 0, W, H, '#0c0e10');
  poly([[0, 0], [W, 0], [vx1, vy0], [vx0, vy0]], '#121617');
  poly([[0, 0], [vx0, vy0], [vx0, vy1], [0, H]], '#1a2023');
  poly([[W, 0], [vx1, vy0], [vx1, vy1], [W, H]], '#1c2225');
  poly([[0, H], [vx0, vy1], [vx1, vy1], [W, H]], '#181b1c');
  rect(vx0, vy0, vx1 - vx0, vy1 - vy0, '#07080a');
  light(160, 86, 14, 4, '#802020', 0.25, 2);
  // wall panels, rust runs and a waist rail
  for (const d of [0.12, 0.28, 0.44, 0.6, 0.74, 0.86, 0.95]) {
    line(...hallL(d, 'top'), ...hallL(d, 'bot'), '#11161a');
    line(...hallR(d, 'top'), ...hallR(d, 'bot'), '#13181b');
  }
  for (const side of [hallL, hallR]) {
    const r0 = side(0, 'top'), r1 = side(1, 'top'), b0 = side(0, 'bot'), b1 = side(1, 'bot');
    line(b0[0], b0[1] - 70, b1[0], b1[1] - 14, '#2a3236', 2);
    for (let i = 0; i < 6; i++) {
      const d = 0.08 + hash(i + (side === hallL ? 10 : 20)) * 0.75;
      const [x, y] = side(d, 'top');
      dither(x - 1, y + 4, 3, 26 - d * 18, '#4a2a18', 0.35);
    }
  }
  // ceiling pipes converging
  for (const [nx, fx2, c] of [[20, 140, '#2e3a3e'], [60, 150, '#283236'], [290, 178, '#2e3a3e'], [250, 170, '#263034']]) {
    line(nx, 0, fx2, vy0 + 1, c, 3); line(nx + 1, 0, fx2, vy0, '#4a5a60');
  }
  // floor grating and puddles
  for (const d of [0.08, 0.18, 0.3, 0.44, 0.6, 0.76, 0.9]) {
    const y = H - (H - vy1) * d;
    rect(hallL(d, 'bot')[0], Math.round(y), hallR(d, 'bot')[0] - hallL(d, 'bot')[0], 1, '#101314');
  }
  for (let i = -6; i <= 6; i++) line(160 + i * 4, vy1, 160 + i * 34, H, '#121516');
  for (const [px2, py, rx] of [[110, 150, 26], [214, 166, 30], [170, 118, 14]]) {
    ellipse(px2, py, rx, Math.max(2, rx / 7), '#0e1214');
    shimmer(px2 - rx * 0.6, py - 2, rx * 1.2, 4, '#3a4a58', 0.25);
  }
  // door to the break room on the right wall, with its sign
  const d0 = 0.24, d1 = 0.4;
  const [x0, yb0] = hallR(d0, 'bot'), [x1, yb1] = hallR(d1, 'bot');
  const [, yt0] = hallR(d0, 'top'), [, yt1] = hallR(d1, 'top');
  const top0 = yb0 - (yb0 - yt0) * 0.6, top1 = yb1 - (yb1 - yt1) * 0.6;
  poly([[x0 + 2, top0 - 2], [x1 - 2, top1 - 2], [x1 - 2, yb1], [x0 + 2, yb0]], '#3e4a50');
  poly([[x0, top0], [x1, top1], [x1, yb1], [x0, yb0]], '#2a3236');
  line(x0 - 4, (top0 + yb0) / 2, x0 - 4, (top0 + yb0) / 2 + 6, '#7a8a90', 2);
  rect(254, 26, 40, 16, '#1a2a22'); rect(254, 26, 40, 1, '#3a5a4a');
  pixText('SALA DE', 260, 28, '#8ac0a0'); pixText('DESCANSO', 258, 35, '#8ac0a0');
  // emergency lamps
  for (const [x, y] of [[40, 34], [104, 50], [262, 60]]) { rect(x, y, 6, 4, '#2a1a14'); }
}

const HALL_DRIPS = [[96, 0.2], [188, 0.45], [232, 0.12]];
BG.hallway = (s, t) => {
  blit(layer('hallway', drawHallway));
  if (s.doorOpen) {
    const d0 = 0.24, d1 = 0.4;
    const [x0, yb0] = hallR(d0, 'bot'), [x1, yb1] = hallR(d1, 'bot');
    const [, yt0] = hallR(d0, 'top'), [, yt1] = hallR(d1, 'top');
    const top0 = yb0 - (yb0 - yt0) * 0.6, top1 = yb1 - (yb1 - yt1) * 0.6;
    poly([[x0, top0], [x1, top1], [x1, yb1], [x0, yb0]], '#08090a');
    poly([[x0, top0], [x0 + 10, top0 + 6], [x0 + 10, yb0 + 4], [x0, yb0]], '#2a3236');
  }
  s._lamps = [];
  for (const [x, y, k] of [[40, 34, 1], [104, 50, 2], [262, 60, 3]]) {
    const on = hash(Math.floor(t / 110) + k * 77) > 0.12;
    rect(x + 1, y + 1, 4, 2, on ? '#ff7a3a' : '#4a2010');
    if (on) { light(x + 3, y + 6, 18, 12, '#ff6a30', 0.12, 3); s._lamps.push([x + 3, y + 8]); }
  }
  // water dripping from the ceiling pipes
  for (const [x, d] of HALL_DRIPS) {
    const yTop = HALL.vy0 * d + 4, yFloor = H - (H - HALL.vy1) * d - 6;
    const period = 1700 + x * 3, ph = (t + x * 41) % period;
    const fall = ph / 520;
    if (fall < 1) { rect(x, yTop + (yFloor - yTop) * fall * fall, 1, 2, '#8ab4d0'); }
    else if (fall < 1.8) {
      const k = (fall - 1) / 0.8, r = 1 + k * 7;
      ctx.globalAlpha = 0.6 * (1 - k);
      rect(x - r, yFloor + 1, 2, 1, '#7a9ab0'); rect(x + r - 1, yFloor + 1, 2, 1, '#7a9ab0');
      rect(x - r * 0.5, yFloor, r, 1, '#5a7a90');
      ctx.globalAlpha = 1;
    }
  }
};

function drawBreakroom() {
  const bx0 = 30, bx1 = 290, by0 = 14, by1 = 120;
  roomShell({ bx0, bx1, by0, by1, base: '#121012', ceil: ['#08070a', '#100e10'], wall: ['#2a2622', '#2e2a25', '#26221e'],
    left: '#1e1b18', right: '#211d1a', edge: '#3a352e', floor: '#221f1c', grout: '#191715' });
  rect(bx0, 84, bx1 - bx0, 36, '#211d19'); rect(bx0, 84, bx1 - bx0, 1, '#3a342c');
  for (let i = 0; i < 7; i++) dither(bx0 + hash(i + 80) * 250, by0, 4 + hash(i + 81) * 6, 30 + hash(i + 82) * 40, '#1a1714', 0.45);
  // stopped clock and faded posters
  ring(160, 34, 7, '#4a443a', 1); disc(160, 34, 6, '#d8d0b8'); line(160, 34, 160, 30, '#2a2620'); line(160, 34, 163, 36, '#2a2620');
  rect(206, 26, 22, 30, '#3a3630'); rect(207, 27, 20, 28, '#5a5448'); rect(210, 31, 14, 2, '#2a2620'); rect(210, 36, 10, 1, '#3a3630'); rect(210, 39, 12, 1, '#3a3630');
  rect(96, 28, 18, 24, '#3a3630'); rect(97, 29, 16, 22, '#4e3a32'); disc(105, 37, 4, '#7a5a40');
  // cabinet with numbered folders
  rect(38, 48, 46, 72, '#2a241e'); rect(38, 48, 46, 1, '#4a4036');
  for (let r = 0; r < 3; r++) {
    const sy = 52 + r * 22;
    rect(40, sy + 18, 42, 2, '#3a3228');
    for (let k = 0; k < 7; k++) {
      if (r === 2 && k > 4) continue;
      const cols = ['#6a3a2a', '#2a4a5a', '#5a5a2a', '#3a2a4a'];
      rect(41 + k * 6, sy + 2 + (k % 3 === 2 ? 2 : 0), 5, 16 - (k % 3 === 2 ? 2 : 0), cols[(k + r) % 4]);
      px(43 + k * 6, sy + 6, '#d8d0b8');
    }
  }
  pixText('ARCHIVO', 47, 42, '#6a6050');
  // vending machine, broken
  rect(250, 50, 32, 70, '#3a1a1a'); rect(250, 50, 32, 1, '#6a2a2a');
  rect(254, 56, 18, 40, '#0e0c0e');
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) rect(256 + k * 6, 59 + r * 9, 4, 6, ['#6a5a3a', '#3a5a6a', '#6a3a3a'][(r + k) % 3]);
  line(256, 58, 270, 90, '#5a6a70'); line(262, 56, 258, 72, '#5a6a70');
  rect(274, 62, 6, 12, '#1a0e0e'); rect(256, 102, 16, 8, '#140a0a');
  // table with old computers and reports
  rect(100, 110, 132, 5, '#3a3228'); rect(100, 110, 132, 1, '#5a4a38');
  rect(104, 115, 3, 25, '#2a241e'); rect(225, 115, 3, 25, '#2a241e');
  rect(140, 115, 2, 18, '#2a241e'); rect(190, 115, 2, 18, '#2a241e');
  for (const mx of [112, 152, 192]) {
    rect(mx, 92, 24, 18, '#4a4a42'); rect(mx, 92, 24, 1, '#6a6a60'); rect(mx + 3, 95, 18, 12, '#0c100e');
    rect(mx + 8, 108, 8, 3, '#3a3a34'); rect(mx - 2, 111, 28, 1, '#3a3a34');
  }
  for (let i = 0; i < 5; i++) rect(176 + i * 3, 108 - i, 8, 2, i % 2 ? '#c8c0a8' : '#a8a088');
  rect(214, 106, 12, 4, '#6a3a2a'); rect(214, 106, 12, 1, '#8a5a3a');
  // chairs
  for (const cx of [126, 206]) { rect(cx, 116, 12, 3, '#2e2822'); rect(cx + 1, 104, 2, 12, '#2e2822'); rect(cx + 1, 119, 2, 12, '#241e1a'); rect(cx + 9, 119, 2, 12, '#241e1a'); }
  for (let i = 0; i < 8; i++) rect(30 + hash(i + 600) * 260, 128 + hash(i + 601) * 46, 4, 2, '#8a8270');
}

BG.breakroom = (s, t) => {
  blit(layer('breakroom', drawBreakroom));
  const tube = hash(Math.floor(t / 70)) > 0.15;
  rect(140, 6, 40, 3, tube ? '#d8e8e0' : '#4a504c');
  if (tube) light(160, 30, 90, 30, '#c8e0d8', 0.08, 3);
  s._tube = tube;
  // the middle computer still glows faintly
  const g = 0.7 + 0.3 * Math.sin(t / 300);
  ctx.globalAlpha = g; rect(155, 95, 18, 12, '#1a3a26'); ctx.globalAlpha = 1;
  for (let y = 96; y < 107; y += 2) rect(155, y, 18, 1, '#13281c');
  if (hash(Math.floor(t / 400)) > 0.3) rect(157, 97, 6, 1, '#6ae08a');
};

// Side view of the same corridor, for fights: wall, pipes, the break room
// door, the Operator's cables along the ceiling and a wet metal floor.
function drawCorridor() {
  const fy = 96;
  rect(0, 0, W, H, '#0e1012');
  vgrad(0, 0, W, 14, ['#060708', '#0c0e10']);
  vgrad(0, 14, W, fy - 14, ['#1a2023', '#1e2528', '#192023']);
  for (let x = 8; x < W; x += 38) { rect(x, 14, 1, fy - 14, '#141a1c'); rect(x + 1, 14, 1, fy - 14, '#262e32'); }
  rect(0, 58, W, 2, '#283034'); rect(0, 60, W, 1, '#121618');
  for (let i = 0; i < 10; i++) dither(hash(i + 70) * W, 14, 4 + hash(i + 71) * 8, 20 + hash(i + 72) * 50, '#3a2414', 0.25);
  // ceiling pipes
  rect(0, 14, W, 5, '#2e3a3e'); rect(0, 14, W, 1, '#4a5a60'); rect(0, 18, W, 1, '#1a2226');
  rect(0, 22, W, 3, '#283236'); rect(0, 22, W, 1, '#3e4a50');
  for (let x = 20; x < W; x += 54) rect(x, 13, 3, 7, '#1c2428');
  // break room door with its sign
  rect(196, 38, 34, 58, '#3e4a50'); rect(198, 40, 30, 56, '#2a3236');
  rect(198, 40, 30, 1, '#4e5c62'); rect(223, 66, 2, 6, '#7a8a90');
  rect(194, 26, 38, 10, '#1a2a22'); rect(194, 26, 38, 1, '#3a5a4a');
  pixText('DESCANSO', 197, 29, '#8ac0a0');
  // a dead monitor bolted to the wall, its cable torn out
  rect(70, 32, 22, 16, '#2a2a30'); rect(72, 34, 18, 12, '#0c100e'); line(81, 48, 84, 60, '#1c1c2a', 2);
  // floor: grated metal, wet
  rect(0, fy, W, H - fy, '#16191a');
  rect(0, fy, W, 1, '#2e383c'); dither(0, fy + 1, W, 3, '#000', 0.4);
  for (const y of [fy + 6, fy + 13, fy + 22, fy + 33, fy + 47, fy + 64]) rect(0, y, W, 1, '#101314');
  for (let x = -40; x < W + 40; x += 22) line(x, fy, x - 30, H, '#121516');
  for (const [px2, py, rx] of [[54, 128, 30], [180, 140, 40], [280, 118, 22]]) { ellipse(px2, py, rx, 3, '#101418'); shimmer(px2 - rx * 0.6, py - 2, rx * 1.2, 3, '#3a4a58', 0.22); }
  // emergency lamps
  for (const x of [40, 150, 284]) { rect(x, 30, 8, 5, '#2a1a14'); }
}

BG.corridor = (s, t) => {
  blit(layer('corridor', drawCorridor));
  for (const [x, k] of [[40, 1], [150, 2], [284, 3]]) {
    const on = hash(Math.floor(t / 120) + k * 31) > 0.1;
    rect(x + 1, 31, 6, 3, on ? '#ff7a3a' : '#4a2010');
    if (on) light(x + 4, 40, 34, 26, '#ff6a30', 0.13, 3);
  }
  // the Operator's cables crawl along the ceiling and sag between the pipes
  for (let i = 0; i < 4; i++) {
    let x0 = -10, y0 = 25 + i * 2;
    for (let x = 0; x <= W + 10; x += 10) {
      const y = 26 + i * 2 + Math.abs(Math.sin(x / 47 + i * 1.3)) * (6 + i * 3) + Math.sin(t / 900 + i + x / 30) * 1.2;
      line(x0, y0, x, y, '#14141e', 2); x0 = x; y0 = y;
    }
  }
  const k = Math.floor(t / 70);
  if (hash(k) < 0.2) { const sx = hash(k + 1) * W, sy = 28 + hash(k + 2) * 14; px(sx, sy, '#ffffff'); px(sx + 1, sy, '#7ab8ff'); px(sx, sy + 1, '#7ab8ff'); }
  // drips from the pipes
  for (const [x, ph] of [[64, 0], [232, 700], [126, 1300]]) {
    const q = ((t + ph) % 1900) / 520;
    if (q < 1) rect(x, 25 + q * q * 100, 1, 2, '#8ab4d0');
    else if (q < 1.7) { ctx.globalAlpha = 0.5 * (1.7 - q); rect(x - (q - 1) * 8, 126, (q - 1) * 16 + 1, 1, '#5a7a90'); ctx.globalAlpha = 1; }
  }
};

// =====================================================================
//  DARKNESS — scenes with `dark` set are dimmed; the phone flashlight,
//  lamps and screens cut light into it.
// =====================================================================
const DARK_LIGHTS = {
  reception: (s) => (s._lamp ? [[252, 24, 34]] : []),
  hallway: (s) => (s._lamps || []).map(([x, y]) => [x, y, 26]),
  breakroom: (s) => [[164, 101, 30], ...(s._tube ? [[160, 12, 60]] : [])],
};
let _darkC = null;
function drawDarkness(s, t) {
  if (!s.dark) return;
  if (!_darkC || _darkC.width !== VW) { _darkC = document.createElement('canvas'); _darkC.width = VW; _darkC.height = H; }
  const g = _darkC.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, VW, H);
  g.fillStyle = `rgba(3,3,8,${s.dark})`;
  g.fillRect(0, 0, VW, H);
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  const hole = (x, y, r, a) => {
    for (let k = 3; k >= 1; k--) {
      g.globalAlpha = a / 3;
      g.beginPath(); g.arc(Math.round(x + OX), Math.round(y), r * k / 3, 0, Math.PI * 2); g.fill();
    }
  };
  const beams = [];
  for (const id in G.actors) {
    const a = G.actors[id];
    if (!a || (a.kind && a.kind !== 'fig')) continue;
    const sc = (a.scale || 1) * (a.hat === 'cap' ? 0.86 : 1);
    hole(a.x, a.y - 16 * sc, 13 * sc + 6, 0.45);   // keep the characters readable
    if (a.phone) beams.push([a.x + (a.face || 1) * 7 * sc, a.y - 19 * sc, a.face || 1, sc]);
  }
  for (const [x, y, r] of (DARK_LIGHTS[s.bg] ? DARK_LIGHTS[s.bg](s) : [])) hole(x, y, r, 0.75);
  const flick = 0.94 + 0.06 * Math.sin(t / 40) * Math.sin(t / 13);
  const tri = (hx, hy, ang, spread, len) => {
    g.beginPath();
    g.moveTo(hx + OX, hy);
    g.lineTo(hx + OX + Math.cos(ang - spread) * len, hy + Math.sin(ang - spread) * len);
    g.lineTo(hx + OX + Math.cos(ang + spread) * len, hy + Math.sin(ang + spread) * len);
    g.closePath(); g.fill();
  };
  // the beam fully clears the darkness in its core and softens towards the edges
  for (const [hx, hy, f] of beams) {
    const ang = f > 0 ? 0.06 : Math.PI - 0.06;
    for (const [len, spread, a] of [[240, 0.34, 0.25], [210, 0.24, 0.3], [180, 0.15, 0.4]]) { g.globalAlpha = a * flick; tri(hx, hy, ang, spread, len); }
  }
  g.globalAlpha = 1;
  ctx.drawImage(_darkC, -OX, 0, VW, H);
  // visible light: a cold tint in the beam, a hot spot where it lands,
  // dust floating inside it and the glare of the phone's flash
  const op = ctx.globalCompositeOperation;
  for (const [hx, hy, f, sc] of beams) {
    const ang = f > 0 ? 0.06 : Math.PI - 0.06;
    ctx.globalCompositeOperation = 'lighter';
    for (const [spread, al] of [[0.3, 0.03], [0.18, 0.035], [0.08, 0.04]]) {
      ctx.globalAlpha = al * flick;
      poly([[hx, hy], [hx + Math.cos(ang - spread) * 220, hy + Math.sin(ang - spread) * 220], [hx + Math.cos(ang + spread) * 220, hy + Math.sin(ang + spread) * 220]], '#e0ecff');
    }
    const spot = hx + f * 110;
    light(spot, hy + 8, 30, 22, '#e8f0ff', 0.07 * flick, 4);
    for (let i = 0; i < 18 * CFG.particles; i++) {
      const d = 14 + ((hash(i * 7 + 1) * 180 + t * 0.006 * (1 + hash(i))) % 180);
      const off = (hash(i * 7 + 2) - 0.5) * 2 * Math.tan(0.26) * d;
      const yy = hy + Math.sin(ang) * d + off + Math.sin(t / 900 + i) * 2;
      ctx.globalAlpha = 0.28 * (1 - d / 200);
      px(hx + f * d, yy, '#ffffff');
    }
    ctx.globalAlpha = 0.9;
    light(hx + f, hy - 1, 2 * sc, 1.6 * sc, '#ffffff', 0.35, 3);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = op;
  }
}

// =====================================================================
//  WIDE SCREENS — when the view is wider than 320 (fill mode), scenery
//  repeats into the side margins; UI-style screens get a flat colour.
// =====================================================================
const BG_EDGE = { call: '#121218', share: '#121218' };
function drawWide(fn, key) {
  if (OX > 0) {
    if (BG_EDGE[key]) rect(-OX, 0, VW, H, BG_EDGE[key]);
    else for (const off of [-W, W]) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(off < 0 ? -OX : W, 0, OX, H);
      ctx.clip();
      ctx.translate(off, 0);
      fn();
      ctx.restore();
    }
  }
  fn();
}

// =====================================================================
//  POST — drawn over actors
// =====================================================================
const blitVignette = () => ctx.drawImage(vignette(), -OX, 0, VW, H);
const POST = {
  arena: blitVignette,
  cell: blitVignette,
  room: blitVignette,
  reception: blitVignette,
  hallway: blitVignette,
  breakroom: blitVignette,
  corridor: blitVignette,
  branch: (s, t) => { rain(t, 24, -OX, 0, VW, H, '#d8d8f8', 0.45, 0.75, 6, 9); blitVignette(); },
};
function postFX(s, t) { const f = POST[s.bg]; if (f) f(s, t); }
