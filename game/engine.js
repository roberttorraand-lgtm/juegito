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

const GLASSES = '#62627a';

// Combat poses, in facing-relative offsets (front/back hand from the shoulder, feet from the ground point)
const FIG_POSES = {
  windup: { front: [-7, -4], back: [-6, 8], legs: [[-6, 0], [3, 0]] },
  strike: { front: [11, -1], back: [-5, 7], legs: [[-7, 0], [6, 0]] },
  slam:   { front: [3, -10], back: [-3, -10], legs: [[-4, 0], [4, 0]] },
  guard:  { front: [6, 0], back: [5, 4], legs: [[-5, 0], [5, 0]] },
  hurt:   { front: [-6, 5], back: [-8, 3], legs: [[-5, 0], [2, 0]] },
  run:    { front: [5, 6], back: [-8, 4], legs: [[-8, -1], [7, 0]] },
  brace:  { front: [7, 2], back: [-6, 6], legs: [[-8, 0], [7, 0]] },
  follow: { front: [7, 10], back: [-7, 4], legs: [[-7, 0], [7, 0]] },
  hold:   { front: [7, 1], back: [-5, 8], legs: [[-4, 0], [4, 0]] },
  search: { front: [8, -4], back: [6, 2], legs: [[-4, 0], [5, 0]] },
  ready:  { front: [7, 3], back: [4, 7], legs: [[-5, 0], [5, 0]] },
  aim:    { front: [13, -1], back: [-4, 8], legs: [[-6, 0], [5, 0]] },
  kick:   { front: [-6, 2], back: [5, 4], legs: [[-4, 0], [11, -7]] },
  peek:   { front: [6, -2], back: [-5, 7], legs: [[-3, 0], [6, 0]] },
  slump:  { front: [3, 13], back: [-2, 13], legs: [[-6, 0], [3, 0]] },
  // ---- combat keyframes (Limbus-style snapped poses). lean: upper body
  // forward (+) or back (-) in px; crouch: how far the body drops.
  coil:      { front: [-9, 3], back: [-7, 6], legs: [[-8, 0], [6, 0]], lean: -3, crouch: 3 },
  cock:      { front: [-6, -9], back: [-8, 2], legs: [[-6, 0], [5, 0]], lean: -2 },
  jab:       { front: [13, -2], back: [2, 4], legs: [[-6, 0], [7, 0]], lean: 2 },
  cross:     { front: [14, 0], back: [-8, 4], legs: [[-9, 0], [8, 0]], lean: 5, crouch: 1 },
  hook:      { front: [9, -6], back: [-6, 6], legs: [[-7, 0], [6, 0]], lean: 3 },
  uppercut:  { front: [8, -14], back: [-6, 5], legs: [[-4, 0], [6, -2]], lean: 2 },
  overhead:  { front: [0, -15], back: [-3, -14], legs: [[-5, 0], [5, 0]], lean: -3 },
  smash:     { front: [11, 11], back: [9, 11], legs: [[-9, 0], [9, 0]], lean: 6, crouch: 6 },
  slashUp:   { front: [9, -13], back: [-7, 4], legs: [[-7, 0], [7, 0]], lean: 2 },
  slashDown: { front: [10, 11], back: [-7, 2], legs: [[-9, 0], [9, 0]], lean: 5, crouch: 4 },
  sweep:     { front: [14, 2], back: [-9, 0], legs: [[-9, 0], [9, 0]], lean: 3, crouch: 2 },
  spin:      { front: [-13, 0], back: [11, 0], legs: [[-5, 0], [5, 0]], lean: 0 },
  lunge:     { front: [15, 0], back: [-10, -2], legs: [[-12, 0], [10, 0]], lean: 7, crouch: 4 },
  air:       { front: [5, -9], back: [-7, -6], legs: [[-3, -5], [6, -3]] },
  land:      { front: [8, 6], back: [-7, 6], legs: [[-9, 0], [9, 0]], lean: 2, crouch: 6 },
  butWind:   { front: [-6, 7], back: [-8, 5], legs: [[-5, 0], [7, 0]], lean: -5 },
  butt:      { front: [-7, 7], back: [-9, 4], legs: [[-10, 0], [6, 0]], lean: 8, crouch: 2 },
  knee:      { front: [4, 2], back: [-7, 4], legs: [[-4, 0], [4, -8]], lean: -2 },
  sidekick:  { front: [-6, 0], back: [6, 3], legs: [[-5, 0], [14, -9]], lean: -5 },
  roundhouse:{ front: [-7, -3], back: [6, 0], legs: [[-3, 0], [12, -15]], lean: -6 },
  hipfire:   { front: [12, 4], back: [-4, 8], legs: [[-6, 0], [6, 0]], lean: 1 },
  kickback:  { front: [9, -7], back: [-5, 7], legs: [[-7, 0], [5, 0]], lean: -3 },
  parry:     { front: [8, -8], back: [5, -2], legs: [[-7, 0], [5, 0]], lean: -2, crouch: 2 },
  flail:     { front: [-11, -10], back: [9, 6], legs: [[-6, 0], [7, 0]], lean: 1 },
  flail2:    { front: [12, -9], back: [-9, 7], legs: [[-7, 0], [6, 0]], lean: 2 },
};
// arms hanging, feet together: what "no pose" looks like, so poses can blend from it
const FIG_NEUTRAL = { front: [6, 9], back: [-6, 9], legs: [[-4, 0], [4, 0]] };
const lerpPose = (A, B, k) => ({
  lean: (A.lean || 0) + ((B.lean || 0) - (A.lean || 0)) * k,
  crouch: (A.crouch || 0) + ((B.crouch || 0) - (A.crouch || 0)) * k,
  front: [A.front[0] + (B.front[0] - A.front[0]) * k, A.front[1] + (B.front[1] - A.front[1]) * k],
  back: [A.back[0] + (B.back[0] - A.back[0]) * k, A.back[1] + (B.back[1] - A.back[1]) * k],
  legs: A.legs.map((l, i) => [l[0] + (B.legs[i][0] - l[0]) * k, l[1] + (B.legs[i][1] - l[1]) * k]),
});

// Eyes and brows carry the expression (no mouths: the stickmen stay simple).
// dx grows toward the facing side; the eyes sit at dx 1 and 3, row -1.
const EXPRS = {
  angry:    { eyes: [[1, -1], [3, -1]], brows: [[0, -3], [1, -2], [3, -2], [4, -3]] },
  sad:      { eyes: [[1, 0], [3, 0]], brows: [[0, -2], [1, -3], [3, -3], [4, -2]] },
  nervous:  { eyes: [[1, -1], [3, -1]], brows: [[0, -2], [1, -3], [3, -3], [4, -2]] },
  shock:    { eyes: [[1, -2], [1, -1], [3, -2], [3, -1]], brows: [[1, -4], [3, -4]] },
  happy:    { eyes: [[0, 0], [1, -1], [2, 0], [3, -1], [4, 0]] },
  confused: { eyes: [[1, -1], [3, -1]], brows: [[0, -3], [1, -3], [3, -2], [4, -2]] },
  blank:    { eyes: [[0, -1], [1, -1], [3, -1], [4, -1]] },
  smug:     { eyes: [[1, -1], [2, -1], [3, -1], [4, -1]], brows: [[3, -3], [4, -3]] },
};
function drawEyes(o, mpx, t) {
  const E = EXPRS[o.expr];
  // blink now and then unless an expression holds the eyes
  const blink = !E && !o.pain && (Math.floor(t / 90 + (o.hat === 'cap' ? 17 : 0)) % 48) === 0;
  if (o.pain) { mpx(1, -1, FIG.eye); mpx(3, -1, FIG.eye); mpx(1, -2, FIG.eye); mpx(3, 0, FIG.eye); return; }
  if (!E) {
    if (blink) { mpx(0, -1, FIG.eye); mpx(1, -1, FIG.eye); mpx(3, -1, FIG.eye); mpx(4, -1, FIG.eye); }
    else { mpx(1, -1, FIG.eye); mpx(3, -1, FIG.eye); }
    return;
  }
  for (const [dx, dy] of E.eyes) mpx(dx, dy, FIG.eye);
  const up = o.hat === 'headset' ? 1 : 0;   // clear Lobelto's glasses frame
  for (const [dx, dy] of E.brows || []) mpx(dx, dy - up, FIG.eye);
}

function figure(x, y, o, t) {
  const kid = o.hat === 'cap';
  const sc = (o.scale || 1) * (kid ? 0.86 : 1);
  if (sc !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y); }
  const f = o.face || 1;
  let bob = Math.round(Math.sin(t / 420 + x) * 0.6);
  if (o.talk) bob -= Math.round(Math.abs(Math.sin(t / 90)));
  if (o.shake) x += Math.round(Math.sin(t / 25) * 1.2);
  y += bob;
  const nod = o.nod ? Math.round(Math.abs(Math.sin(t / 70)) * 2) : 0;
  // a blended pose (combat) wins over a named one; both are facing-relative
  const P = o.poseData || FIG_POSES[o.pose];
  const lean = P ? Math.round(P.lean || 0) : 0, cr = P ? Math.round(P.crouch || 0) : 0;
  const hx = x + lean * f, hy = y - 27 + nod + cr;
  const sx = x + Math.round(lean * 0.8) * f;              // shoulder
  const sh = y - 20 + cr, hip = y - 10 + Math.round(cr * 0.7);
  let legs = o.lifted
    ? [[x - 2, y + 1], [x + 3, y + 2]]
    : o.sitting ? [[x - 8, y], [x + 8, y]] : [[x - 4, y], [x + 4, y]];
  let armL = o.lifted ? [x - 7, sh - 6] : [x - 6, y - 11];
  let armR = o.armless ? [sx + 3, sh + 4] : o.lifted ? [x + 7, sh - 6] : [x + 6, y - 11];
  if (P) {
    const fx = (dx) => x + dx * f;
    const front = [sx + P.front[0] * f, sh + P.front[1]], back = [sx + P.back[0] * f, sh + P.back[1]];
    // the arm on the facing side leads; with one arm missing, the other one does the move
    if (o.armless) armL = front;
    else if (f > 0) { armR = front; armL = back; } else { armL = front; armR = back; }
    legs = P.legs.map(([dx, dy]) => [fx(dx), y + dy]);
  }
  if (o.walking) {
    const sw = Math.round(Math.sin(t / (o.walking === 'run' ? 60 : 110)) * (o.walking === 'run' ? 5 : 4));
    legs = [[x - sw, y], [x + sw, y]];
  }
  // the hand that holds things: the leading arm in a pose, else the free one
  const hand = P ? (o.armless ? armL : f > 0 ? armR : armL) : o.armless ? armL : f > 0 ? armR : armL;
  for (const [col, extra] of o.flash ? [['#ffffff', 1], ['#ffd0d0', 0]] : o.tint ? [[o.tint, 0]] : [[FIG.edge, 1], [FIG.body, 0]]) {
    const th = 2 + extra * 2;
    disc(hx, hy, 5 + extra, col);
    line(hx, hy + 4, x, hip, col, th);
    line(sx, sh, armL[0], armL[1], col, th);
    line(sx, sh, armR[0], armR[1], col, th);
    for (const l of legs) line(x, hip, l[0], l[1], col, th);
  }
  // mirrored helpers: dx is measured toward the facing direction
  const mpx = (dx, dy, c) => px(hx + dx * f, hy + dy, c);
  const mrect = (dx, dy, w, h, c) => rect(f > 0 ? hx + dx : hx - dx - w + 1, hy + dy, w, h, c);
  if (o.hat === 'headset') {
    // simple rectangular frames, no lenses
    mrect(0, -2, 5, 1, GLASSES); mrect(0, 0, 5, 1, GLASSES);
    mpx(0, -1, GLASSES); mpx(2, -1, GLASSES); mpx(4, -1, GLASSES);
    mrect(-3, -1, 3, 1, GLASSES);
  } else if (kid) {
    rect(hx - 5, hy - 6, 11, 3, '#3a384e');
    rect(hx + (f > 0 ? 2 : -9), hy - 4, 8, 2, '#3a384e');
    px(hx - 1, hy - 5, '#8a4a4a');
  }

  drawEyes(o, mpx, t);
  if (o.cry) {
    // two streams of tears running down from the eyes
    const k = Math.floor(t / 120) % 4;
    for (const ex of [1, 3]) for (let j = 0; j < 3; j++) if ((j + k) % 4 !== 3) mpx(ex, j + 1, '#6ab4ff');
    if (k === 0) mpx(4, 4, '#6ab4ff');
  }
  if (o.phone) {
    // phone in hand, its flash pointing forward
    rect(hand[0] - 1, hand[1] - 3, 3, 4, '#2a2a38');
    px(hand[0] + (f > 0 ? 1 : -1), hand[1] - 3, '#f0f4ff');
  }
  if (o.ego && !o.ego.hidden) {
    // E.G.O weapon held out in the leading hand, with a faint glow
    const [gx, gy] = hand;
    light(gx + f * 3, gy - 3, 6, 6, o.ego.col, 0.18, 2);
    ctx.save(); ctx.translate(gx + f * 3, gy - 3); if (f < 0) ctx.scale(-1, 1);
    egoIcon(o.ego.kind, 0, 0, o.ego.s || 0.75, o.ego.col);
    ctx.restore();
  } else if (o.item === 'pistol') {
    // small low-calibre pistol held by the grip, barrel pointing forward
    const [gx, gy] = hand, d = f > 0 ? 1 : -1;
    rect(gx - (d > 0 ? 0 : 1), gy - 1, 2, 3, '#3a3a44');             // grip
    rect(d > 0 ? gx : gx - 5, gy - 3, 6, 2, '#5c5c68');              // slide / barrel
    px(gx + d * 5, gy - 3, '#9a9aa8');                                // muzzle glint
    px(gx + d, gy, '#1a1a20');                                         // trigger guard
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

// Expressions for the big call avatars: per-eye pixel offsets from the
// eye's top-left, written for the left eye (dx grows toward the nose).
const AV_EXPRS = {
  angry:    { brow: [[-1, -4], [0, -4], [1, -3], [2, -3]] },
  sad:      { brow: [[-1, -3], [0, -3], [1, -4], [2, -4]], low: 1 },
  nervous:  { brow: [[-1, -3], [0, -3], [1, -4], [2, -4]] },
  confused: { brow: [[-1, -4], [0, -4], [1, -4], [2, -4]], one: true },
  shock:    { eye: [[0, -1], [1, -1], [0, 0], [1, 0], [0, 1], [1, 1]], brow: [[0, -4], [1, -4]] },
  happy:    { eye: [[-1, 1], [0, 0], [1, 0], [2, 1]] },
  blank:    { eye: [[-1, 1], [0, 1], [1, 1], [2, 1]] },
  smug:     { eye: [[0, 1], [1, 1], [2, 1]], brow: [[0, -3], [1, -3]], one: true },
};

function avatarHead(cx, cy, hat, t, dim, expr) {
  const lob = hat === 'headset';
  disc(cx, cy + 22, 16, dim ? '#1b1a22' : '#14131a');
  disc(cx, cy, 11, dim ? '#24222c' : '#3a3646');
  disc(cx, cy, 10, '#0b0a10');

  if (lob) {
    // simple rectangular frames, no lenses
    const g = dim ? '#4a4656' : '#9a9ab4';
    for (const x0 of [cx - 1, cx + 5]) {
      rect(x0, cy - 4, 6, 1, g); rect(x0, cy + 1, 6, 1, g);
      rect(x0, cy - 4, 1, 6, g); rect(x0 + 5, cy - 4, 1, 6, g);
    }
    rect(cx - 9, cy - 3, 8, 1, g);
  } else {
    rect(cx - 10, cy - 12, 21, 5, dim ? '#24222c' : '#2c2a3a');
    rect(cx + 4, cy - 8, 14, 3, dim ? '#24222c' : '#2c2a3a');
    if (!dim) px(cx - 1, cy - 11, '#8a4a4a');
  }

  const [e1, e2] = lob ? [cx + 1, cx + 7] : [cx + 2, cx + 6];
  if (dim) {
    rect(e1 - 1, cy - 1, 3, 1, '#4a4656'); rect(e2 - 1, cy - 1, 3, 1, '#4a4656');
  } else if (AV_EXPRS[expr]) {
    const X = AV_EXPRS[expr], up = lob ? 2 : 0;
    [e1, e2].forEach((ex, i) => {
      // mirror the right eye so brows slant symmetrically
      const P = (dx, dy) => rect(i ? ex + 1 - dx : ex + dx, cy - 2 + dy, 1, 1, FIG.eye);
      if (X.eye) X.eye.forEach(([dx, dy]) => P(dx, dy + (X.low || 0)));
      else rect(ex, cy - 2 + (X.low || 0), 2, 2, FIG.eye);
      if (X.brow && (!X.one || i === 1)) X.brow.forEach(([dx, dy]) => P(dx, dy - up));
    });
  } else {
    // blink now and then
    const bl = Math.floor(t / 90 + (lob ? 0 : 23)) % 52 === 0;
    if (bl) { rect(e1 - 1, cy - 1, 3, 1, FIG.eye); rect(e2 - 1, cy - 1, 3, 1, FIG.eye); }
    else { rect(e1, cy - 2, 2, 2, FIG.eye); rect(e2, cy - 2, 2, 2, FIG.eye); }
  }
}

// ---- Cable skeleton: a corpse moved by the Disconnected Operator's cables ----
// o: { scale, face, lying, pose: 'punch', atk, sparks }
function cableSkel(x, y, o, t) {
  const sc = o.scale || 1, f = o.face || -1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(sc, sc);
  const B = '#cfc9ac', S = '#8a8670', D = '#121216';
  const C = '#2a3050', CH = '#5a6aa0', CG = '#7ab8ff';          // cable, its highlight, its glow
  const tw = Math.round((hash(Math.floor(t / 90) + (o.seed || 0)) - 0.5) * 1.4);   // twitchy puppet motion
  const punch = o.pose === 'punch' || o.atk;
  const L = (x0, y0, x1, y1, c = B, w = 1) => line(x0 * f, y0, x1 * f, y1, c, w);
  const cable = (pts, w = 2) => {
    for (let i = 1; i < pts.length; i++) {
      line(pts[i - 1][0] * f, pts[i - 1][1], pts[i][0] * f, pts[i][1], C, w);
      px(pts[i][0] * f, pts[i][1] - 1, CH);
    }
  };
  // two cables come down from the dark above and hold the body up like strings
  [[-4, -33, 0], [3, -20, 1]].forEach(([jx, jy, i]) => {
    const pts = [[jx, jy]];
    for (let k = 1; k <= 9; k++) pts.push([jx + Math.sin(t / 700 + i * 2.1 + k * 0.6) * (k * 0.45) + (i ? 1 : -1) * k * 0.5, jy - k * 10]);
    cable(pts);
  });
  // skull with a cold glow in the sockets
  const hx = f * 1 + tw, hy = -40;
  disc(hx, hy, 4, B);
  rect(hx - 1 + f, hy - 1, 1, 2, D); rect(hx + 2 * f, hy - 1, 1, 2, D);
  if (Math.floor(t / 300) % 7) { px(hx - 1 + f, hy - 1, '#7af0ff'); px(hx + 2 * f, hy - 1, '#7af0ff'); }
  rect(hx - 2, hy + 3, 5, 2, S); px(hx - 1, hy + 4, D); px(hx + 1, hy + 4, D);
  // spine, ribs and pelvis
  L(0, -36, 0 + tw * 0.3, -17, S, 2);
  for (let k = 0; k < 4; k++) { L(0, -33 + k * 3, -5, -31 + k * 3); L(0, -33 + k * 3, 5, -31 + k * 3); }
  rect(-3, -17, 7, 3, B); px(f > 0 ? -1 : 1, -16, D);
  // arms
  let hand;
  if (punch) { L(-4, -32, 7, -30); L(7, -30, 15, -29); rect(15 * f - 1, -30, 3, 3, B); hand = [15, -29]; }
  else { L(-4, -32, 6, -24); L(6, -24, 8, -16); hand = [8, -16]; }
  L(4, -32, -4, -24); L(-4, -24, -5, -16);
  // legs
  if (o.pose === 'kick') { L(-2, -15, -4, -8); L(-4, -8, -5, 0); L(2, -15, 8, -12); L(8, -12, 13, -10); }
  else { L(-2, -15, -3, -8); L(-3, -8, -4, 0); L(2, -15, 4, -8); L(4, -8, 4, 0); }
  rect(-6 * f - 1, -1, 3, 1, B); rect(4 * f - 1, -1, 3, 1, B);
  // cables wound round the bones: a zig-zag down the spine, coils on an arm and a thigh
  cable([[-3, -35], [3, -32], [-3, -28], [3, -24], [-2, -20], [1, -17]]);
  const arm = punch ? [[1, -31], [4, -30], [6, -31], [9, -30], [11, -30]] : [[1, -29], [4, -27], [3, -25], [6, -23], [5, -21]];
  cable(arm, 1);
  cable([[3, -13], [1, -11], [4, -10], [2, -8]], 1);
  // a loose cable end hangs from the wrist, its torn tip glowing and spitting sparks
  const sw = Math.sin(t / 500 + (o.seed || 0)) * 2;
  const end = [hand[0] + 2 + sw, hand[1] + 10];
  cable([hand, [hand[0] + 1 + sw * 0.4, hand[1] + 5], end], 1);
  const glow = Math.floor(t / 120 + (o.seed || 0)) % 5;
  px(end[0] * f, end[1], glow ? CG : '#ffffff');
  if (o.sparks !== false) {
    for (let i = 0; i < 3; i++) {
      const k = Math.floor(t / 70) * 3 + i * 11 + (o.seed || 0) * 7;
      if (hash(k) > 0.5) continue;
      const sx = end[0] * f + (hash(k + 2) - 0.5) * 6, sy = end[1] + (hash(k + 3) - 0.3) * 6;
      px(sx, sy, '#ffffff'); px(sx + 1, sy, CG); px(sx, sy - 1, '#ffe08a');
    }
    // and now and then a spark runs along the spine cable
    const k2 = Math.floor(t / 90) + (o.seed || 0) * 5;
    if (hash(k2) < 0.3) { const yy = -34 + hash(k2 + 1) * 16; px((hash(k2 + 2) - 0.5) * 5 * f, yy, '#ffffff'); px((hash(k2 + 2) - 0.5) * 5 * f + 1, yy, CG); }
  }
  ctx.restore();
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

// ---- E.G.O Extraction Machine (ZAYIN): hopper, glowing press, gauges, conveyor ----
function egoMachine(x, y, o, t) {
  const sc = o.scale || 1;
  if (sc !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y); }
  if (o.shake) x += Math.round(Math.sin(t / 25) * 1.5);
  const D = '#141416', B = '#2c2c30', M = '#3c3c42', HI = '#55555c', BOLT = '#7a6a48';
  const glow = o.blind ? '#5a3010' : '#ffa030', glowH = o.blind ? '#7a4a20' : '#ffe0a0';
  const pump = o.atk ? 1 : (Math.sin(t / 260) + 1) / 2;

  ctx.globalAlpha = 0.35; ellipse(x, y + 1, 32, 3, '#000'); ctx.globalAlpha = 1;

  // pipe arch over the top
  line(x - 5, y - 74, x - 5, y - 86, D, 5); line(x - 5, y - 86, x + 9, y - 86, D, 5); line(x + 9, y - 86, x + 9, y - 70, D, 5);
  line(x - 5, y - 74, x - 5, y - 86, M, 3); line(x - 5, y - 86, x + 9, y - 86, M, 3); line(x + 9, y - 86, x + 9, y - 70, M, 3);
  rect(x + 7, y - 80, 5, 3, '#7a2a1a');

  // hopper full of ore on the left
  poly([[x - 36, y - 66], [x - 15, y - 66], [x - 20, y - 54], [x - 31, y - 54]], D);
  poly([[x - 35, y - 65], [x - 16, y - 65], [x - 21, y - 55], [x - 30, y - 55]], B);
  for (let k = 0; k < 7; k++) {
    const rx = x - 34 + k * 3, ry = y - 68 - (k % 3);
    rect(rx, ry, 3, 3, k % 2 ? '#6a6a60' : '#8a8a7e'); px(rx, ry, '#a8a89a');
  }
  for (const vx of [x - 28, x - 26, x - 24]) rect(vx, y - 62, 1, 3, glow);
  rect(x - 28, y - 54, 8, 12, D); rect(x - 27, y - 54, 6, 12, B);

  // gear block between hopper and press
  rect(x - 30, y - 44, 16, 10, D); rect(x - 29, y - 43, 14, 8, B);
  for (const gx of [x - 26, x - 18]) {
    const a = t / 300;
    disc(gx, y - 39, 3, M); px(gx + Math.round(Math.cos(a) * 2), y - 39 + Math.round(Math.sin(a) * 2), HI);
  }

  // main press column with glowing chamber
  rect(x - 15, y - 76, 30, 70, D);
  rect(x - 14, y - 75, 28, 68, B);
  rect(x - 14, y - 75, 2, 68, M);
  rect(x - 12, y - 73, 24, 7, M);
  for (const vx of [x - 3, x, x + 3]) rect(vx, y - 72, 1, 4, glow);
  rect(x - 10, y - 62, 20, 26, '#0c0806');
  rect(x - 10, y - 40, 20, 4, '#3a1a08');
  if (!o.blind) light(x, y - 44, 16, 14, '#ff9a30', 0.45 + pump * 0.3, 4);
  rect(x - 9, y - 62, 2, 26, '#5a4a2a'); rect(x + 7, y - 62, 2, 26, '#5a4a2a');
  px(x - 8, y - 55, glowH); px(x + 8, y - 55, glowH);
  const pist = Math.round(4 + pump * 12);
  rect(x - 3, y - 62, 6, pist, '#8a8a92'); rect(x - 3, y - 62, 1, pist, '#b0b0b8');
  rect(x - 7, y - 62 + pist, 14, 3, '#c8a030');
  for (let k = 0; k < 4; k++) px(x - 6 + k * 4, y - 61 + pist, '#1a1814');
  for (let k = 0; k < 5; k++) {
    if (hash(Math.floor(t / 80) * 5 + k) > 0.4) px(x - 6 + k * 3, y - 37 - Math.round(hash(k + t) * 2), k % 2 ? glow : glowH);
  }
  for (const bx of [x - 13, x + 12]) for (const by of [y - 74, y - 10]) px(bx, by, BOLT);

  // gauge panel on the right
  rect(x + 15, y - 60, 13, 26, D); rect(x + 16, y - 59, 11, 24, B);
  for (const [gy, sp] of [[y - 53, 400], [y - 44, 260]]) {
    disc(x + 21, gy, 3, '#c8c0a0'); disc(x + 21, gy, 2, '#e0d8b8');
    const a = -2.2 + Math.sin(t / sp) * 1.4;
    line(x + 21, gy, x + 21 + Math.round(Math.cos(a) * 2), gy + Math.round(Math.sin(a) * 2), '#7a1a10');
  }
  disc(x + 21, y - 38, 1, Math.sin(t / 200) > 0 ? glow : '#5a3010');
  line(x + 27, y - 56, x + 30, y - 66, D, 3);

  // conveyor with a freshly made crystal
  rect(x - 20, y - 30, 40, 14, D);
  rect(x - 19, y - 29, 38, 12, M);
  rect(x - 17, y - 27, 34, 5, '#26262a');
  const shift = Math.floor(t / 90) % 4;
  for (let bx = x - 17 + shift; bx < x + 17; bx += 4) rect(bx, y - 27, 1, 5, '#3a3a40');
  for (const rx of [x - 12, x, x + 12]) { disc(rx, y - 18, 3, D); disc(rx, y - 18, 2, HI); px(rx, y - 18, D); }
  const cx = x - 2, cy = y - 31;
  if (!o.blind) light(cx, cy, 8, 6, '#ffb040', 0.4, 3);
  poly([[cx, cy - 6], [cx + 4, cy], [cx, cy + 3], [cx - 4, cy]], '#e89a30');
  poly([[cx, cy - 5], [cx + 2, cy], [cx, cy + 2]], glowH);
  if (Math.sin(t / 150) > 0.7) px(cx + 3, cy - 5, '#fff');

  // feet / base block with vents
  rect(x - 26, y - 8, 52, 8, D); rect(x - 25, y - 7, 50, 6, B);
  rect(x - 25, y - 7, 50, 1, HI);
  for (const vx of [x - 3, x, x + 3]) rect(vx, y - 6, 1, 3, glow);
  rect(x - 30, y - 3, 8, 3, D); rect(x + 22, y - 3, 8, 3, D);

  if (sc !== 1) ctx.restore();
}

// ---- The Disconnected Operator (TETH): cable body, scarf, CRT monitor head ----
function operator(x, y, o, t) {
  const sc = o.scale || 1;
  if (sc !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y); }
  if (o.shake) x += Math.round(Math.sin(t / 25) * 1.5);
  const C = ['#121216', '#1e1e26', '#2a2a34'], RIM = '#4a4660';
  const SC = '#2a3a8a', SCH = '#3e52b0';
  const sway = Math.sin(t / 600);

  ctx.globalAlpha = 0.35; ellipse(x, y + 1, 16, 3, '#000'); ctx.globalAlpha = 1;

  // cables spilling from the waist down to the floor
  for (let i = 0; i < 12; i++) {
    const x0 = x - 6 + i, xm = x - 7 + i * 1.3 + Math.sin(t / 500 + i) * 0.8;
    const x1 = x - 16 + i * 3 + Math.round(Math.sin(i * 1.7) * 2);
    const col = C[i % 3];
    line(x0, y - 36, Math.round(xm), y - 16, i % 4 ? col : RIM, 2);
    line(Math.round(xm), y - 16, x1, y, col, 2);
    if (i % 3 === 0) line(x1, y, x1 + (i < 6 ? -4 : 4), y + 1, col);
  }
  // torso of tightly wound cables
  rect(x - 7, y - 58, 14, 24, RIM);
  rect(x - 6, y - 58, 12, 24, C[0]);
  for (let k = 0; k < 5; k++) rect(x - 5 + k * 2, y - 57, 1, 22, C[1 + (k % 2)]);
  rect(x - 6, y - 40, 12, 1, '#8a6a30');

  // cable arms ending in plugs
  for (const side of [-1, 1]) {
    const sx = x + side * 6, sy = y - 55;
    const hx = x + side * 15 + Math.round(sway * side), hy = y - 22;
    for (let k = 0; k < 3; k++) {
      const mx = sx + side * (6 + k), my = y - 40 + k;
      line(sx, sy + k, mx, my, C[k], 2);
      line(mx, my, hx + k - 1, hy, C[k], 2);
    }
    line(hx - 2, hy, hx - 4, hy + 6, C[1]);
    rect(hx - 1, hy, 4, 4, '#3a3a42'); rect(hx - 1, hy, 4, 1, '#5a5a64');
    px(hx, hy + 4, '#9a9aa8'); px(hx + 2, hy + 4, '#9a9aa8');
  }

  // blue scarf: wrapped neck, diagonal across the chest, hanging tail
  rect(x - 8, y - 61, 16, 4, SC); rect(x - 8, y - 61, 16, 1, SCH);
  poly([[x - 8, y - 57], [x - 4, y - 57], [x + 8, y - 47], [x + 8, y - 43]], SC);
  line(x - 6, y - 57, x + 7, y - 46, SCH);
  line(x + 5, y - 58, x + 7, y - 44, SC, 2);
  rect(x + 3, y - 50, 3, 2, '#8a6a30');

  // neck cables and the monitor head
  line(x - 2, y - 61, x - 3, y - 66, C[1], 2); line(x + 2, y - 61, x + 2, y - 66, C[2], 2);
  const hx = x - 1 + Math.round(sway), hy = y - 82;
  rect(hx - 12, hy, 24, 18, '#0e0c08');
  rect(hx - 11, hy + 1, 22, 16, '#3a3428');
  rect(hx - 11, hy + 1, 22, 1, '#5a503c');
  rect(hx + 8, hy + 3, 3, 12, '#2a2418');
  rect(hx - 9, hy + 3, 16, 12, '#0c1014');
  if (o.rebooting) {
    rect(hx - 8, hy + 4, 14, 10, '#1a2a6a');
    const prog = Math.floor((t / 120) % 10);
    rect(hx - 6, hy + 10, 10, 2, '#0c1440');
    rect(hx - 6, hy + 10, prog + 1, 2, '#9ac0ff');
    px(hx - 6 + (Math.floor(t / 300) % 3) * 2, hy + 6, '#9ac0ff');
  } else if (o.blind) {
    line(hx - 6, hy + 5, hx + 4, hy + 12, '#c02030'); line(hx + 4, hy + 5, hx - 6, hy + 12, '#c02030');
  } else if (o.atk) {
    rect(hx - 8, hy + 4, 14, 10, '#e8ffff');
    rect(hx - 3, hy + 5, 2, 6, '#c02030'); rect(hx - 3, hy + 12, 2, 1, '#c02030');
    light(hx - 1, hy + 9, 20, 16, '#c8ffff', 0.4, 3);
  } else {
    for (let r = 0; r < 10; r++) {
      const k = Math.floor(t / 70) * 10 + r;
      const w = Math.round(hash(k) * 12);
      if (hash(k + 3) > 0.45) rect(hx - 8 + Math.round(hash(k + 1) * (14 - w)), hy + 4 + r, w, 1, hash(k + 2) > 0.6 ? '#d8e8e8' : '#7a9090');
    }
    light(hx - 1, hy + 9, 14, 10, '#9ad0d0', 0.18, 3);
  }
  line(hx + 11, hy + 8, x + 6, y - 58, C[1], 2);
  line(hx - 12, hy + 6, hx - 15, hy + 14, C[2], 2);
  line(hx - 15, hy + 14, x - 7, y - 56, C[2], 2);

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
