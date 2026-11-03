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

// ---- Sprite drawing utility ----
function drawSprite(ox, oy, data, pal, flipX) {
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      const dx = flipX ? ox + row.length - 1 - c : ox + c;
      ctx.fillStyle = col;
      ctx.fillRect(dx, oy + r, 1, 1);
    }
  }
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

// ---- Character heads as sprite data ----
const HEAD_LOB = [
  '...oooo...',
  '..oHHHHo..',
  '.oHHHHHHo.',
  'oHHHHHHHHo',
  'oHHssssHHo',
  'oHsFFFsFHo',
  '.oFFeFeF..',
  '.oFFnFFF..',
  '..oFmFo...',
  '...ooo....',
];
const HEAD_LOB_PAL = {
  o: PAL.outline, H: PAL.hair.lob,
  s: PAL.skin.s, F: PAL.skin.b, e: '#1a1828',
  n: PAL.skin.s, m: PAL.skin.d,
};

const HEAD_GON = [
  '..CCCCCC..',
  '.CCCCCCCc.',
  'CCCCCCCCCc',
  '.oHHHHHo..',
  'oHHssssHo.',
  'oHsFFFsFo.',
  '.oFFeFeF..',
  '.oFFnFFF..',
  '..oFmFo...',
  '...ooo....',
];
const HEAD_GON_PAL = {
  o: PAL.outline, H: PAL.hair.gon,
  C: PAL.cap.b, c: PAL.cap.s,
  s: PAL.skin.s, F: PAL.skin.b, e: '#1a1828',
  n: PAL.skin.s, m: PAL.skin.d,
};

// ---- Detailed figure drawing ----
const FIG = { body: '#10101a', edge: '#4a4660', eye: '#f0ecdc' };

function figure(x, y, o, t) {
  const sc = o.scale || 1;
  if (sc !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y); }

  const f = o.face || 1;
  let bob = Math.round(Math.sin(t / 420 + x) * 0.6);
  if (o.talk) bob -= Math.round(Math.abs(Math.sin(t / 90)));
  if (o.shake) x += Math.round(Math.sin(t / 25) * 1.2);
  y += bob;

  const isLob = o.hat === 'headset';
  const cloth = isLob ? PAL.lobCloth : PAL.gonCloth;
  const hairC = isLob ? PAL.hair.lob : PAL.hair.gon;
  const OL = PAL.outline;
  const sk = PAL.skin;

  const hx = x, hy = y - 34;
  const neckY = y - 26;
  const shoulderY = y - 24;
  const hipY = y - 12;
  const feetY = y;

  // -- Shadow under feet --
  ctx.globalAlpha = 0.25;
  disc(x, feetY + 1, 6, '#000');
  ctx.globalAlpha = 1;

  // -- Back arm --
  const backArmX = x - f * 5;
  if ((!o.armless || f > 0)) {
    const isBackArmMissing = o.armless && f < 0;
    if (!isBackArmMissing) {
      const bax = o.lifted ? backArmX - f * 3 : backArmX;
      const bay = o.lifted ? shoulderY - 6 : y - 6;
      line(x - f * 4, shoulderY + 2, bax, bay, OL, 5);
      line(x - f * 4, shoulderY + 2, bax, bay, cloth.s, 4);
      line(x - f * 4, shoulderY + 2, bax, bay, cloth.b, 3);
      if (!o.lifted) {
        rect(bax - 1, bay - 1, 3, 3, OL);
        rect(bax, bay, 2, 2, sk.b);
      }
    }
  }

  // -- Legs --
  const legSpread = o.sitting ? 8 : 4;
  const legLen = o.sitting ? 6 : 12;
  for (let leg = -1; leg <= 1; leg += 2) {
    const lx = x + leg * legSpread / 2;
    const ly = o.sitting ? feetY : feetY;
    // Thigh
    rect(lx - 2, hipY, 5, OL === OL ? 1 : 0, OL);
    poly([[lx - 2, hipY], [lx + 3, hipY], [lx + 2, hipY + legLen], [lx - 1, hipY + legLen]], OL);
    poly([[lx - 1, hipY + 1], [lx + 2, hipY + 1], [lx + 1, hipY + legLen - 1], [lx, hipY + legLen - 1]], '#1a1a2e');
    // Highlight
    rect(lx - 1, hipY + 1, 1, legLen - 2, '#242440');
    // Shoe
    if (!o.sitting) {
      const sx = lx + (leg < 0 ? -2 : -1);
      rect(sx - 1, feetY - 2, 5, 3, OL);
      rect(sx, feetY - 1, 3, 2, PAL.shoe.b);
      px(sx, feetY - 1, PAL.shoe.h);
    }
  }

  // -- Torso --
  const tw = 10;
  poly([[x - tw / 2, shoulderY], [x + tw / 2, shoulderY], [x + tw / 2 - 1, hipY], [x - tw / 2 + 1, hipY]], OL);
  poly([[x - tw / 2 + 1, shoulderY + 1], [x + tw / 2 - 1, shoulderY + 1],
        [x + tw / 2 - 2, hipY - 1], [x - tw / 2 + 2, hipY - 1]], cloth.b);
  // Shading
  rect(x - tw / 2 + 1, shoulderY + 1, 2, hipY - shoulderY - 2, cloth.h);
  rect(x + tw / 2 - 3, shoulderY + 1, 2, hipY - shoulderY - 2, cloth.s);
  // Center detail (zipper/seam)
  for (let zy = shoulderY + 3; zy < hipY - 2; zy += 2) px(x, zy, cloth.s);
  // Collar
  rect(x - 3, shoulderY - 1, 6, 2, cloth.s);
  rect(x - 2, shoulderY - 1, 4, 1, cloth.h);
  // Belt line
  rect(x - tw / 2 + 2, hipY - 2, tw - 4, 1, cloth.s);

  // Hoodie pocket (Lobelto) / jacket detail (Gonza)
  if (isLob) {
    rect(x - 3, hipY - 6, 6, 3, cloth.s);
    rect(x - 2, hipY - 5, 4, 1, cloth.b);
  } else {
    // Jacket lapels
    line(x - 1, shoulderY + 1, x - 3, hipY - 3, cloth.h);
    line(x + 1, shoulderY + 1, x + 3, hipY - 3, cloth.h);
  }

  // -- Front arm --
  const frontArmX = x + f * 5;
  const isFrontArmMissing = o.armless && f > 0;
  if (!isFrontArmMissing) {
    const fax = o.lifted ? frontArmX + f * 3 : frontArmX;
    const fay = o.lifted ? shoulderY - 6 : y - 6;
    line(x + f * 4, shoulderY + 2, fax, fay, OL, 5);
    line(x + f * 4, shoulderY + 2, fax, fay, cloth.b, 4);
    line(x + f * 4, shoulderY + 2, fax, fay, cloth.h, 3);
    if (!o.lifted) {
      rect(fax - 1, fay - 1, 3, 3, OL);
      rect(fax, fay, 2, 2, sk.h);
      px(fax + 1, fay + 1, sk.s);
    }
  }

  // -- Armless stump --
  if (o.armless) {
    const stumpSide = f > 0 ? -1 : 1;
    const stx = x + stumpSide * 5;
    const sty = shoulderY + 6;
    line(x + stumpSide * 4, shoulderY + 2, stx, sty, OL, 5);
    line(x + stumpSide * 4, shoulderY + 2, stx, sty, cloth.b, 3);
    if (o.bandaged) {
      rect(stx - 2, sty - 1, 4, 4, OL);
      rect(stx - 1, sty, 3, 3, '#d8d0c0');
      px(stx, sty, '#c0b8a0');
      px(stx - 1, sty + 1, '#b0a890');
      line(stx - 1, sty - 1, stx + 1, sty + 2, '#a09878');
    } else {
      rect(stx - 2, sty - 1, 4, 4, '#cfc6b4');
      px(stx - 1, sty + 2, '#7a1018');
      px(stx, sty + 3, '#5a0810');
    }
  }

  // -- Neck --
  rect(x - 1, neckY, 3, 3, OL);
  rect(x, neckY + 1, 2, 2, sk.b);

  // -- Head --
  const headData = isLob ? HEAD_LOB : HEAD_GON;
  const headPal = isLob ? HEAD_LOB_PAL : HEAD_GON_PAL;
  const headW = headData[0].length;
  const headH = headData.length;
  drawSprite(hx - Math.floor(headW / 2), hy - Math.floor(headH / 2), headData, headPal, f < 0);

  // -- Face expressions override --
  const faceX = hx - Math.floor(headW / 2);
  const faceY = hy - Math.floor(headH / 2);
  if (o.pain) {
    // Furrowed brows
    const brow1x = f > 0 ? faceX + 4 : faceX + headW - 5;
    const brow2x = f > 0 ? faceX + 6 : faceX + headW - 7;
    px(brow1x, faceY + 4, OL);
    px(brow2x, faceY + 4, OL);
    // Grimace
    const mx = f > 0 ? faceX + 4 : faceX + headW - 6;
    rect(mx, faceY + 8, 3, 1, '#5a2020');
  }
  if (o.talk) {
    const mx = f > 0 ? faceX + 4 : faceX + headW - 6;
    const openH = Math.abs(Math.sin(t / 80)) > 0.5 ? 2 : 1;
    rect(mx, faceY + 8, 2, openH, '#4a2018');
  }

  // -- Headset (Lobelto) drawn over head --
  if (isLob) {
    // Band
    line(hx - 6, hy - 1, hx - 5, hy - 6, PAL.headset.s);
    line(hx - 5, hy - 6, hx + 5, hy - 6, PAL.headset.h);
    line(hx + 5, hy - 6, hx + 6, hy - 1, PAL.headset.s);
    // Ear cups
    rect(hx - 8, hy - 3, 3, 6, PAL.headset.s);
    rect(hx - 8, hy - 2, 3, 4, PAL.headset.b);
    px(hx - 7, hy - 1, PAL.headset.h);
    rect(hx + 6, hy - 3, 3, 6, PAL.headset.s);
    rect(hx + 6, hy - 2, 3, 4, PAL.headset.b);
    px(hx + 7, hy - 1, PAL.headset.h);
    // Mic arm
    line(hx - 7, hy + 2, hx - 4, hy + 5, PAL.headset.s);
    rect(hx - 5, hy + 4, 2, 2, PAL.headset.mic);
    px(hx - 5, hy + 4, PAL.headset.h);
  }

  if (sc !== 1) ctx.restore();
}

// ---- Avatar head for call screens ----
function avatarHead(cx, cy, hat, t, dim) {
  disc(cx, cy + 22, 16, dim ? '#1b1a22' : '#14131a');
  disc(cx, cy, 12, dim ? '#24222c' : '#3a3646');
  disc(cx, cy, 11, '#0b0a10');

  if (hat === 'headset') {
    disc(cx, cy, 10, PAL.hair.lob);
  } else {
    disc(cx, cy, 10, PAL.hair.gon);
  }

  // Face
  disc(cx + 1, cy + 1, 7, dim ? '#1a182a' : PAL.skin.b);
  if (!dim) {
    rect(cx + 2, cy - 2, 2, 2, PAL.eye);
    rect(cx + 6, cy - 2, 2, 2, PAL.eye);
    px(cx + 3, cy - 1, PAL.outline);
    px(cx + 7, cy - 1, PAL.outline);
    px(cx + 4, cy + 1, PAL.skin.s);
    rect(cx + 3, cy + 3, 3, 1, PAL.skin.d);
  } else {
    rect(cx + 1, cy - 1, 3, 1, '#4a4656');
    rect(cx + 5, cy - 1, 3, 1, '#4a4656');
  }

  if (hat === 'headset') {
    rect(cx - 10, cy - 12, 20, 2, PAL.headset.b);
    rect(cx - 14, cy - 4, 5, 8, PAL.headset.b);
    rect(cx - 13, cy - 3, 3, 6, PAL.headset.h);
    rect(cx + 10, cy - 4, 5, 8, PAL.headset.b);
    rect(cx + 11, cy - 3, 3, 6, PAL.headset.h);
  } else {
    rect(cx - 11, cy - 13, 22, 5, PAL.cap.b);
    rect(cx - 10, cy - 12, 20, 3, PAL.cap.h);
    rect(cx + 4, cy - 9, 14, 3, PAL.cap.b);
    px(cx, cy - 11, PAL.cap.logo);
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

// ---- Backgrounds ----
const BG = {};
BG.black = () => rect(0, 0, W, H, '#000');

BG.arena = (s, t) => {
  // Dark purple gradient floor
  rect(0, 0, W, H, '#0c0814');
  for (let y = 80; y < H; y++) {
    const k = (y - 80) / (H - 80);
    const r = Math.floor(14 + k * 24), g = Math.floor(10 + k * 16), b = Math.floor(24 + k * 30);
    rect(0, y, W, 1, `rgb(${r},${g},${b})`);
  }
  // Grid lines (perspective)
  for (let i = -6; i <= 6; i++) {
    const sx = 160 + i * 28, topX = 160 + i * 6;
    ctx.globalAlpha = 0.2;
    line(topX, 80, sx, 180, '#6040a0');
    ctx.globalAlpha = 1;
  }
  for (let j = 0; j < 6; j++) {
    const y = 88 + j * 18;
    const spread = 0.3 + (y - 80) / 100 * 0.7;
    ctx.globalAlpha = 0.15;
    rect(160 - spread * 160, y, spread * 320, 1, '#8060c0');
    ctx.globalAlpha = 1;
  }
  // Sky glow
  ctx.globalAlpha = 0.12;
  for (let y = 0; y < 40; y++) rect(0, y, W, 1, '#e03050');
  for (let y = 40; y < 80; y++) {
    ctx.globalAlpha = Math.sin(((y - 40) / 40) * Math.PI) * 0.15;
    rect(0, y, W, 1, '#8040c0');
  }
  ctx.globalAlpha = 1;
  // Floating particles
  for (let i = 0; i < 24; i++) {
    const k = Math.floor(t / 120) * 24 + i;
    const ppx = (hash(k) * W + t * 0.02) % W;
    const ppy = 10 + hash(k + 1) * 70;
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t / 300 + i);
    px(Math.round(ppx), Math.round(ppy), hash(k + 2) > 0.5 ? '#ff3050' : '#b080ff');
    ctx.globalAlpha = 1;
  }
  // Side darkening
  ctx.globalAlpha = 0.35;
  for (let x = 0; x < 12; x++) {
    ctx.globalAlpha = 0.35 * (1 - x / 12);
    rect(x, 0, 1, H, '#000');
    rect(W - 1 - x, 0, 1, H, '#000');
  }
  ctx.globalAlpha = 1;
};

BG.call = (s, t) => {
  rect(0, 0, W, H, '#16151c');
  // Top bar
  rect(0, 0, W, 14, '#0e0d13');
  rect(0, 13, W, 1, '#1a1924');
  disc(9, 7, 3, '#3fbf6a');
  px(8, 6, '#7fffaa');
  ctx.fillStyle = '#9c97a8'; ctx.font = '10px VT323, monospace';
  ctx.fillText('LLAMADA DE VOZ · PICHA BRAVA', 16, 9);
  // Time indicator
  ctx.fillStyle = '#5d5868'; ctx.font = '8px VT323, monospace';
  const mins = Math.floor(t / 60000) % 60;
  const secs = Math.floor(t / 1000) % 60;
  ctx.fillText(`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`, 280, 9);

  const panels = [
    { id: 'lobelto', x: 16, hat: 'headset', name: 'LOBELTO' },
    { id: 'gonza', x: 168, hat: 'cap', name: 'GONZA' },
  ];
  for (const p of panels) {
    const off = s.offline && s.offline[p.id];
    const speaking = s.speaker === p.id && s.typing;
    // Panel bg
    rect(p.x, 22, 136, 96, '#0e0d13');
    rect(p.x + 1, 23, 134, 94, '#12111a');
    // Speaking indicator
    if (speaking) {
      rect(p.x, 22, 136, 1, '#3fbf6a');
      rect(p.x, 117, 136, 1, '#3fbf6a');
      rect(p.x, 22, 1, 96, '#3fbf6a');
      rect(p.x + 135, 22, 1, 96, '#3fbf6a');
    }
    // Glitch effect
    if (s.glitch === p.id) {
      for (let i = 0; i < 16; i++) {
        const k = Math.floor(t / 40) * 16 + i;
        const gy = 24 + hash(k + 1) * 88;
        const gw = 8 + hash(k + 2) * 40;
        rect(p.x + 2 + hash(k) * 120, gy, gw, 2, hash(k + 3) > 0.5 ? '#ff2a3c' : '#2a2630');
      }
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(p.x + 1, 23, 134, 94); ctx.clip();
    ctx.translate(p.x + 68, 56); ctx.scale(1.6, 1.6); ctx.translate(-(p.x + 68), -56);
    avatarHead(p.x + 68, 56, p.hat, t, off);
    ctx.restore();
    // Name
    ctx.fillStyle = off ? '#4a4656' : '#c9c2b6'; ctx.font = '11px VT323, monospace';
    ctx.fillText(p.name, p.x + 6, 118);
    // Status
    if (off) {
      ctx.fillStyle = '#7a3a44'; ctx.font = '8px VT323, monospace';
      ctx.fillText('DESCONECTADO', p.x + 34, 100);
      disc(p.x + 130, 118, 2, '#5a2030');
    } else if (s.silent === p.id) {
      ctx.fillStyle = '#5d5868'; ctx.font = '10px VT323, monospace';
      ctx.fillText('...', p.x + 64, 100);
    } else {
      disc(p.x + 130, 118, 2, speaking ? '#3fbf6a' : '#3a5a3a');
    }
  }
  // Bottom controls
  rect(100, 128, 120, 18, '#0e0d13');
  rect(100, 128, 120, 1, '#1a1924');
  disc(126, 137, 5, '#3a3646');
  disc(126, 137, 4, '#2a2636');
  px(126, 136, '#8a8698');
  disc(160, 137, 5, '#3a3646');
  disc(160, 137, 4, '#2a2636');
  px(160, 136, '#8a8698');
  disc(194, 137, 5, '#a8323e');
  disc(194, 137, 4, '#8a2030');
  px(194, 137, '#fff');
};

BG.share = (s, t) => {
  BG.call(s, t);
  // Screen share overlay
  rect(24, 16, 272, 114, '#3fbf6a');
  rect(26, 18, 268, 110, '#08070c');
  ctx.fillStyle = '#3fbf6a'; ctx.font = '10px VT323, monospace';
  ctx.fillText('GONZA COMPARTE PANTALLA', 30, 26);
  rect(296, 18, -18, 8, '#08070c');
  ctx.fillStyle = '#5d5868'; ctx.font = '7px VT323, monospace';
  ctx.fillText('EN VIVO', 282, 24);
  // Gacha cards
  const cards = [{ x: 46, gold: true }, { x: 128, gold: false }, { x: 210, gold: true }];
  cards.forEach((c, i) => {
    const glow = c.gold && Math.sin(t / 150 + i) > 0;
    const col = c.gold ? (glow ? '#ffe28a' : '#d8a840') : '#5d5868';
    // Card frame
    rect(c.x - 3, 31, 70, 90, col);
    rect(c.x - 2, 32, 68, 88, c.gold ? '#3a2a08' : '#1a1924');
    rect(c.x, 34, 64, 84, c.gold ? '#2a1c08' : '#16151c');
    // Character silhouette
    disc(c.x + 32, 60, 10, c.gold ? '#4a3410' : '#24222c');
    poly([[c.x + 18, 98], [c.x + 46, 98], [c.x + 40, 68], [c.x + 24, 68]], c.gold ? '#4a3410' : '#24222c');
    // Rarity stars
    if (c.gold) {
      star(c.x + 18, 108, col);
      star(c.x + 32, 108, col);
      star(c.x + 46, 108, col);
      // Shimmer
      if (glow) {
        const shimX = c.x + 4 + ((t / 25) % 56);
        px(Math.round(shimX), 38, '#fff');
        px(Math.round(shimX) + 1, 39, '#ffe28a');
      }
    } else {
      star(c.x + 32, 108, col);
    }
    // Card rarity label
    ctx.font = '7px VT323, monospace';
    ctx.fillStyle = col;
    ctx.fillText(c.gold ? '★★★' : '★', c.x + (c.gold ? 22 : 30), 116);
  });
};

BG.room = (s, t) => {
  // Gonza's gaming room
  rect(0, 0, W, H, '#14121e');
  // Wall texture
  for (let x = 0; x < W; x += 16) rect(x, 0, 1, 132, '#191626');
  for (let y = 0; y < 132; y += 32) rect(0, y, W, 1, '#191626');

  // Poster on wall
  rect(28, 20, 54, 46, '#2c2a3a');
  rect(29, 21, 52, 44, '#0c1424');
  // Moon in poster
  disc(64, 36, 7, '#d8d4c0');
  disc(62, 34, 6, '#0c1424');
  // Poster divider
  rect(54, 21, 2, 44, '#2c2a3a');
  rect(29, 42, 52, 2, '#2c2a3a');
  // Star details in poster
  for (let i = 0; i < 8; i++) px(Math.round(32 + hash(i) * 44), Math.round(25 + hash(i + 9) * 36), '#8a90a8');
  // Poster label
  ctx.font = '5px VT323, monospace'; ctx.fillStyle = '#6a6a80';
  ctx.fillText('LOBOTOMY', 33, 62);

  // Shelf decoration
  rect(250, 24, 32, 42, '#2a1c2a');
  rect(252, 26, 28, 38, '#3a2234');
  star(265, 40, '#8a5a6a');
  rect(256, 50, 8, 3, '#5a3a4a');
  rect(260, 42, 4, 6, '#4a2a3a');

  // Desk
  rect(96, 90, 98, 6, '#2a2032');
  rect(96, 90, 98, 1, '#3a2c42');
  rect(100, 96, 4, 36, '#2a2032');
  rect(186, 96, 4, 36, '#2a2032');
  // Desk edge highlight
  rect(96, 90, 98, 1, '#3a2c42');

  // Monitor
  rect(122, 58, 46, 30, '#1a1824');
  rect(122, 58, 46, 2, '#2a2636');
  const flick = s.monitorOff ? '#0a0a10' : (Math.sin(t / 700) > 0.95 ? '#4a6aa8' : '#3a5a98');
  rect(124, 60, 42, 26, flick);
  // Monitor content
  if (!s.monitorOff) {
    rect(127, 63, 16, 2, '#6a8ac8');
    rect(127, 67, 24, 1, '#5a7ab8');
    rect(127, 70, 20, 1, '#5a7ab8');
    rect(127, 73, 14, 1, '#5a7ab8');
    // Text cursor blink
    if (Math.floor(t / 500) % 2) rect(143, 73, 1, 3, '#6a8ac8');
  }
  // Monitor stand
  rect(142, 88, 6, 3, '#1a1824');
  rect(138, 90, 14, 2, '#24202c');
  // Keyboard
  rect(128, 86, 34, 4, '#24202c');
  rect(129, 87, 32, 2, '#2c2838');
  // Key details
  for (let kx = 130; kx < 160; kx += 3) rect(kx, 87, 2, 1, '#343040');

  // Mug
  if (!s.mugGone) {
    rect(172, 84, 7, 7, '#d8d0c0');
    rect(179, 85, 2, 4, '#d8d0c0');
    rect(173, 85, 5, 5, '#c0b8a0');
    // Steam
    if (Math.sin(t / 400) > 0) {
      ctx.globalAlpha = 0.3;
      px(174, 82, '#c0c0d0');
      px(175, 80, '#c0c0d0');
      ctx.globalAlpha = 1;
    }
  }

  // Chair (behind desk, partially visible)
  rect(140, 100, 20, 8, '#1e1828');
  rect(144, 108, 12, 24, '#1e1828');
  rect(143, 108, 14, 2, '#282234');

  // Floor
  rect(0, 132, W, 48, '#1e1828');
  for (let x = 0; x < W; x += 24) rect(x, 132, 1, 48, '#241c30');
  rect(0, 132, W, 1, '#2c2438');

  // Monitor glow on floor
  if (!s.monitorOff) {
    ctx.globalAlpha = 0.1;
    for (let y = 133; y < 145; y++) {
      const spread = (y - 132) * 2;
      rect(130 - spread, y, 30 + spread * 2, 1, '#4a6aa8');
    }
    ctx.globalAlpha = 1;
  }
};

BG.branch = (s, t) => {
  // Sky gradient
  const bands = ['#0a0610', '#120814', '#1a0a16', '#24101a', '#30141c'];
  bands.forEach((c, i) => rect(0, i * 16, W, 16, c));
  // Dithering between bands
  for (let y = 0; y < 80; y++) {
    if (y % 16 > 12) {
      for (let x = (y % 2); x < W; x += 2)
        px(x, y, bands[Math.min(4, Math.floor(y / 16) + 1)]);
    }
  }

  // Background buildings (far)
  for (let i = 0; i < 26; i++) {
    const bw = 8 + hash(i) * 20, bh = 18 + hash(i + 3) * 55, bx = i * 13 - 8;
    const shade = Math.floor(hash(i + 7) * 3);
    const cols = ['#0c0a12', '#100e18', '#0e0c16'];
    rect(bx, 96 - bh, bw, bh + 10, cols[shade]);
    // Windows
    for (let k = 0; k < 8; k++) {
      if (hash(i * 9 + k) > 0.55) {
        const wx = bx + 2 + hash(i + k) * (bw - 5);
        const wy = 98 - bh + hash(k + i * 3) * bh;
        const lit = hash(i * k + 3) > 0.7;
        px(Math.round(wx), Math.round(wy), lit ? '#c8a840' : '#4a3820');
        if (lit) px(Math.round(wx) + 1, Math.round(wy), '#a08030');
      }
    }
  }

  // Main building (L.Corp branch)
  rect(68, 32, 184, 108, '#24222a');
  rect(68, 32, 184, 3, '#34303c');
  rect(68, 32, 2, 108, '#2e2c36');
  rect(250, 32, 2, 108, '#1a1822');

  // Window grid
  for (let wx = 82; wx < 242; wx += 26) {
    for (let wy = 44; wy < 88; wy += 18) {
      rect(wx, wy, 16, 10, '#121016');
      rect(wx + 1, wy + 1, 14, 8, '#0e0c14');
      // Curtains / blinds
      if (hash(wx * wy) > 0.7) {
        for (let by = wy + 1; by < wy + 9; by += 2)
          rect(wx + 1, by, 14, 1, '#1a1420');
      }
      if (hash(wx + wy * 7) > 0.85) {
        rect(wx + 1, wy + 1, 14, 8, '#2a2418');
        px(wx + 4, wy + 4, '#a08030');
      }
    }
  }

  // Sign
  rect(128, 36, 64, 14, '#121016');
  rect(129, 37, 62, 12, '#0e0c14');
  const sign = Math.sin(t / 90) * Math.sin(t / 37) > 0.3 ? '#c84a3a' : '#3a1a1a';
  ctx.fillStyle = sign; ctx.font = '10px VT323, monospace'; ctx.fillText('SUCURSAL ???', 136, 46);
  // Sign border flicker
  if (Math.sin(t / 90) > 0.8) rect(128, 36, 64, 1, '#c84a3a');

  // Main entrance
  rect(134, 94, 52, 46, '#121016');
  rect(136, 96, 23, 44, '#2c2a34');
  rect(161, 96, 23, 44, '#2c2a34');
  rect(158, 96, 4, 44, '#121016');
  // Door panels
  for (let dy = 100; dy < 138; dy += 6) {
    rect(138, dy, 19, 1, '#24222a');
    rect(163, dy, 19, 1, '#24222a');
  }
  // Door handles
  rect(154, 112, 2, 8, '#8a8070');
  rect(164, 112, 2, 8, '#8a8070');
  px(155, 114, '#c0b8a0');
  px(164, 114, '#c0b8a0');
  // Steps
  rect(130, 138, 60, 3, '#2a2832');
  rect(126, 140, 68, 2, '#222028');

  // Street lamp
  rect(274, 58, 2, 82, '#1a1820');
  rect(266, 56, 14, 3, '#1a1820');
  const lampOn = hash(Math.floor(t / 80)) > 0.12;
  if (lampOn) {
    rect(268, 59, 10, 2, '#f0d890');
    px(270, 59, '#fff8c0');
    // Light cone
    ctx.globalAlpha = 0.1;
    poly([[264, 61], [282, 61], [296, 140], [250, 140]], '#f0d890');
    ctx.globalAlpha = 1;
  }

  // Ground
  rect(0, 138, W, 42, '#16141a');
  rect(0, 138, W, 1, '#1e1c24');
  for (let x = 0; x < W; x += 20) rect(x, 150, 12, 1, '#1e1c24');
  // Puddles
  rect(40, 146, 16, 1, '#1e1c28');
  rect(200, 152, 12, 1, '#1e1c28');

  // Rain
  for (let i = 0; i < 80; i++) {
    const rx = (hash(i) * W + t * 0.06) % W;
    const ry = (hash(i + 40) * H + t * 0.5) % H;
    ctx.globalAlpha = 0.35;
    rect(Math.round(rx), Math.round(ry), 1, 3, '#b0b0d0');
    ctx.globalAlpha = 1;
  }
};

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
