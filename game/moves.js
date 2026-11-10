// =====================================================================
//  MOVES — Limbus-style skill animations.
//
//  Every coin (die) of a page plays a short sequence of snapped keyframes
//  (30-90 ms each): wind-up, a smeared strike with afterimages, the impact
//  with hit-stop and sparks, then a follow-through. Pages and E.G.O weapons
//  have their own moves; anything else falls back to a set per die type,
//  cycled by coin so consecutive hits never look the same.
// =====================================================================

// ---------------------------------------------------------------------
//  New effects
// ---------------------------------------------------------------------
const TAU = Math.PI * 2;
Object.assign(FX_DRAW, {
  // thick crescent cut: sweeps in fast, its tail eats it, white edge
  arc(f, k) {
    const sweep = Math.min(1, k / 0.22);
    const fade = k < 0.22 ? 1 : 1 - (k - 0.22) / 0.78;
    const a0 = f.a0, a1 = f.a0 + (f.a1 - f.a0) * sweep;
    const tail = a0 + (a1 - a0) * Math.min(0.95, Math.max(0, (k - 0.22) * 1.4));
    const n = 22, R = f.r, sy = f.sy || 1;
    const P = (ang, rad) => [f.x + Math.cos(ang) * rad * f.dir, f.y + Math.sin(ang) * rad * sy];
    const band = (thMul, off) => {
      const out = [], inn = [];
      for (let i = 0; i <= n; i++) {
        const q = i / n, ang = tail + (a1 - tail) * q;
        const w = f.th * thMul * Math.pow(q, 0.8);
        out.push(P(ang, R + off + w / 2)); inn.push(P(ang, R + off - w / 2));
      }
      return out.concat(inn.reverse());
    };
    ctx.globalAlpha = Math.max(0, fade) * 0.95;
    poly(band(1, 0), f.col);
    ctx.globalAlpha = Math.max(0, fade);
    poly(band(0.4, f.th * 0.3), '#ffffff');
    const [hx, hy] = P(a1, R);
    if (sweep < 1) light(hx, hy, 8, 8, '#ffffff', 0.5, 2);
    ctx.globalAlpha = 1;
  },
  // straight stab: a tapered streak that shoots out and a ring at the tip
  streak(f, k) {
    const ext = Math.min(1, k / 0.18), fade = 1 - Math.max(0, (k - 0.18) / 0.82);
    const x1 = f.x0 + (f.x1 - f.x0) * ext, y1 = f.y0 + (f.y1 - f.y0) * ext;
    const ang = Math.atan2(y1 - f.y0, x1 - f.x0), nx = -Math.sin(ang), ny = Math.cos(ang);
    const w = f.w * (0.5 + 0.5 * fade);
    ctx.globalAlpha = fade;
    poly([[f.x0, f.y0], [x1 - Math.cos(ang) * 6 + nx * w, y1 - Math.sin(ang) * 6 + ny * w], [x1, y1], [x1 - Math.cos(ang) * 6 - nx * w, y1 - Math.sin(ang) * 6 - ny * w]], f.col);
    line(f.x0, f.y0, x1, y1, '#ffffff', 1);
    if (ext >= 1) {
      const r = 3 + (k - 0.18) * 30;
      for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; px(x1 + Math.cos(a) * r * 0.5, y1 + Math.sin(a) * r, '#ffffff'); }
    }
    ctx.globalAlpha = 1;
  },
  // spiky impact burst
  star(f, k) {
    const grow = k < 0.12 ? k / 0.12 : 1, fade = 1 - Math.max(0, (k - 0.12) / 0.88);
    const R = f.r * (0.5 + 0.7 * grow) * (1 - 0.3 * (1 - fade));
    const spikes = (r, inner) => Array.from({ length: f.n * 2 }, (_, i) => {
      const a = f.rot + i / (f.n * 2) * TAU, rr = i % 2 ? r * inner : r * (i % 4 ? 0.8 : 1);
      return [f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr];
    });
    ctx.globalAlpha = fade;
    light(f.x, f.y, R * 1.6, R * 1.6, f.col, 0.45, 3);
    poly(spikes(R, 0.35), f.col);
    poly(spikes(R * 0.6, 0.4), '#ffffff');
    ctx.globalAlpha = 1;
  },
  // expanding pixel ring (ground: flattened)
  ring2(f, k) {
    const r = f.r * (0.3 + k), fade = 1 - k;
    ctx.globalAlpha = fade;
    const n = Math.max(16, Math.round(r * 3));
    for (let i = 0; i < n; i++) { const a = i / n * TAU; rect(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * (f.sy || 1), 2, 1, i % 3 ? f.col : '#ffffff'); }
    ctx.globalAlpha = 1;
  },
  // ground cracks that linger a moment
  crack(f, k) {
    ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
    for (let i = 0; i < 6; i++) {
      let x = f.x, y = f.y;
      const a = (i / 6) * Math.PI + (hash(i + f.seed) - 0.5) * 0.4;
      for (let s = 0; s < 4; s++) {
        const nx = x + Math.cos(a) * (3 + hash(i * 7 + s + f.seed) * 4) * (i % 2 ? -1 : 1), ny = y + Math.sin(a) * 1.2 * (s + 1) * 0.4;
        line(x, y, nx, ny, '#14100c', 1); x = nx; y = ny;
      }
    }
    ctx.globalAlpha = 1;
  },
  // ---- screen-space
  // manga focus lines closing in on the action
  focus(f, k) {
    const fade = k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.6) / 0.4);
    const fr = Math.floor(performance.now() / 45);
    ctx.globalAlpha = fade * 0.75;
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * TAU + hash(fr * 3 + i) * 0.1;
      const r0 = 120 + hash(i + fr) * 30, r1 = 70 + hash(i * 3 + fr) * 30;
      const cx = 160, cy = f.cy || 64;
      ctx.lineWidth = 1 + (i % 3 === 0);
      line(cx + Math.cos(a) * r0 * 1.8, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1 * 1.8, cy + Math.sin(a) * r1, i % 4 ? '#ffffff' : f.col || '#ffd060');
    }
    ctx.globalAlpha = 1;
  },
  // streaming speed lines behind a dash
  speed(f, k) {
    const fade = 1 - k;
    ctx.globalAlpha = fade * 0.5;
    for (let i = 0; i < 18; i++) {
      const y = 10 + hash(i + f.seed) * 104, len = 20 + hash(i * 5 + f.seed) * 50;
      const x = ((hash(i * 3) * VW + k * 600 * -f.dir) % VW + VW) % VW - OX;
      rect(x, y, len, 1, '#ffffff');
    }
    ctx.globalAlpha = 1;
  },
  // impact frame: the scene flips to its negative for a few frames
  invert(f, k) {
    if (!CFG.impactFrames) return;
    const op = ctx.globalCompositeOperation;
    if (k < 0.55) {
      ctx.globalCompositeOperation = 'difference';
      rect(-OX, 0, VW, 124, '#ffffff');
    } else {
      ctx.globalAlpha = 0.6 * (1 - k);
      rect(-OX, 0, VW, 124, f.col || '#ffffff');
    }
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = 1;
  },
});
FX_SCREEN.add('focus'); FX_SCREEN.add('speed'); FX_SCREEN.add('invert');

// streak particles flying out in a cone toward dir
function sparks(x, y, n, cols, dir, speed = 2.5) {
  for (let i = 0; i < n * CFG.particles; i++) {
    const a = (Math.random() - 0.5) * 1.9 + (dir < 0 ? Math.PI : 0), v = speed * (0.5 + Math.random());
    CB.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, g: 0.06, life: 14 + (i % 6), max: 20, col: cols[i % cols.length], len: 2.2 });
  }
}

// ---------------------------------------------------------------------
//  Effect builders for move frames: each returns (c) => { ... }
//  c = { U, T, a, dir, col, kind, c: target chest, h: attacker hand, f: target feet, power }
// ---------------------------------------------------------------------
const cut = (o = {}) => (c) => fx('arc', c.c.x + c.dir * (o.dx || 0), c.c.y + (o.dy || 0), o.ms || 240, {
  dir: c.dir, r: (o.r || 11) * (c.T.kind ? 1.3 : 1), a0: o.a0 ?? -2.4, a1: o.a1 ?? 0.9, th: o.th || 5, sy: o.sy || 1, col: o.col || c.col,
});
const stab = (o = {}) => (c) => fx('streak', 0, 0, o.ms || 220, {
  x0: c.h.x - c.dir * (o.back || 4), y0: c.h.y + (o.dy || 0), x1: c.c.x + c.dir * (o.over || 16), y1: c.c.y + (o.dy || 0), w: o.w || 3, col: o.col || c.col,
});
function impactAt(c, power, o = {}) {
  const x = c.c.x + c.dir * (o.dx || -2), y = c.c.y + (o.dy || 0);
  fx('star', x, y, 160 + power * 50, { r: 6 + power * 3, col: c.col, rot: Math.random() * TAU, n: 6 + power * 2 });
  fx('ring2', x, y, 240, { r: 10 + power * 5, col: c.col });
  sparks(x, y, 4 + power * 3, [c.col, '#ffffff', '#ffe8b0'], c.dir, 2 + power * 0.8);
  if (!o.quiet) SFX.play(o.sfx || c.kind);
  shake(60 + power * 60);
  if (!CB.instant) {
    const z = CB.cam.z;
    tween(CB.cam, { z: z + 0.025 * power }, 40).then(() => tween(CB.cam, { z }, 180));
  }
  if (power >= 2) G.flash = { color: '#ffffff', start: performance.now(), ms: 50 + power * 10, a: 0.35 };
  if (power >= 3) fx('invert', 160, 0, 110, { col: c.col });
}
const hitFx = (power, o) => (c) => impactAt(c, (o && o.power) || Math.max(power, c.power), o);
// a cosmetic hit inside a combo: sparks and a sound, no shake
const tapFx = (o = {}) => (c) => {
  const x = c.c.x + c.dir * (o.dx || -2), y = c.c.y + (o.dy || 0);
  fx('star', x, y, 140, { r: 5, col: c.col, rot: Math.random() * TAU, n: 6 });
  sparks(x, y, 4, [c.col, '#ffffff'], c.dir, 2);
  SFX.play(o.sfx || c.kind);
};
const both = (...fs) => (c) => fs.forEach(fn => fn && fn(c));
const slam = () => (c) => {
  fx('shock', c.c.x, c.f.y, 420, { col: c.col });
  fx('crack', c.c.x, c.f.y, 900, { seed: Math.floor(Math.random() * 99) });
  fx('ring2', c.c.x, c.f.y, 300, { r: 26, col: '#ffffff', sy: 0.3 });
  particles(c.c.x, c.f.y - 2, 10, ['#8a8090', '#5a5060', '#c8c0b0'], 1.4, 0.14);
  dust(c.U, 6);
};
const muzzle = () => (c) => {
  const a = c.a, s = (c.U.scale || 1) * (c.U.hat === 'cap' ? 0.86 : 1);
  const hx = a.x + (a.ox || 0) + c.dir * 14 * s, hy = a.y + (a.oy || 0) - 21 * s;
  fx('muzzle', hx, hy, 110, { dir: c.dir });
  fx('tracer', 0, 0, 150, { x0: hx, y0: hy, x1: c.c.x, y1: c.c.y });
  particles(hx, hy, 4, ['#fff6c0', '#ffd060'], 1.2, 0.02, 10);
  CB.parts.push({ x: hx - c.dir * 4, y: hy - 2, vx: -c.dir * 0.8, vy: -1.6, g: 0.12, life: 26, max: 26, col: '#e8c060' }); // casing
  SFX.play('gunshot');
  G.flash = { color: '#fff4d0', start: performance.now(), ms: 45, a: 0.3 };
};
const parryFx = () => (c) => { const p = chest(c.U); fx('parry', p.x, p.y - 14, 480); SFX.play('counter'); };

// ---------------------------------------------------------------------
//  Move library. A move is a list of frames; the frame with `hit` is the
//  impact (damage lands right after it), later frames are follow-through.
//  Frame fields: pose, x (forward px from the start), y, tilt (forward),
//  sq, ms (hold), move (travel ms), blend (pose snap ms), ghost (afterimages),
//  fx(c), sfx, stop (hit-stop ms).
// ---------------------------------------------------------------------
const W_ = 'whoosh';
const MOVES = {
  // -------- generic, by die type (cycled by coin)
  slash: [
    [{ pose: 'cock', x: -3, y: -2, tilt: -0.14, ms: 75, sfx: W_ },
     { pose: 'slashDown', x: 16, y: 0, tilt: 0.16, ms: 30, ghost: 3, hit: 1, fx: both(cut({ a0: -2.5, a1: 1.0 }), hitFx(1)) },
     { ms: 90 }],
    [{ pose: 'coil', x: -4, tilt: -0.06, ms: 65 },
     { pose: 'slashUp', x: 14, y: -6, tilt: -0.1, ms: 30, ghost: 3, hit: 1, sfx: W_, fx: both(cut({ a0: 2.3, a1: -1.1 }), hitFx(1)) },
     { pose: 'air', y: -9, ms: 60 }, { pose: 'land', y: 0, ms: 70, fx: (c) => dust(c.U, 4) }],
    [{ pose: 'spin', x: 4, ms: 50, ghost: 2, sfx: W_ },
     { pose: 'sweep', x: 16, ms: 30, ghost: 3, hit: 1, fx: both(cut({ a0: -2.9, a1: 1.1, sy: 0.35, r: 15, th: 6 }), hitFx(1)) },
     { ms: 90 }],
  ],
  pierce: [
    [{ pose: 'coil', x: -6, tilt: -0.1, sq: 0.06, ms: 80 },
     { pose: 'lunge', x: 22, tilt: 0.1, sq: -0.04, ms: 30, ghost: 3, hit: 1, sfx: W_, fx: both(stab(), hitFx(1)) },
     { ms: 90 }],
    [{ pose: 'jab', x: 8, ms: 45, ghost: 1, fx: both(stab({ over: 4, w: 2 }), tapFx()) },
     { pose: 'coil', x: 2, ms: 45 },
     { pose: 'lunge', x: 20, ms: 30, ghost: 3, hit: 1, fx: both(stab({ w: 4 }), hitFx(1)) },
     { ms: 80 }],
    [{ pose: 'coil', x: -2, sq: 0.1, ms: 55 },
     { pose: 'air', x: 8, y: -14, tilt: -0.1, ms: 70, ghost: 2, sfx: W_ },
     { pose: 'lunge', x: 20, y: 0, tilt: 0.18, ms: 30, ghost: 3, hit: 1, fx: both(stab({ dy: -2 }), hitFx(1)) },
     { pose: 'land', ms: 80, fx: (c) => dust(c.U, 5) }],
  ],
  blunt: [
    [{ pose: 'coil', x: -3, ms: 55 },
     { pose: 'jab', x: 10, ms: 45, ghost: 1, fx: tapFx() },
     { pose: 'cock', x: 7, tilt: -0.08, ms: 40 },
     { pose: 'cross', x: 17, tilt: 0.14, ms: 30, ghost: 3, hit: 1, fx: hitFx(1) },
     { ms: 90 }],
    [{ pose: 'coil', x: -2, sq: 0.12, ms: 60 },
     { pose: 'overhead', x: 6, y: -16, tilt: -0.1, sq: -0.08, ms: 90, ghost: 2, sfx: W_ },
     { pose: 'smash', x: 13, y: 0, tilt: 0.12, sq: 0.14, ms: 30, ghost: 2, hit: 1, fx: both(hitFx(1), slam()) },
     { sq: 0, ms: 100 }],
    [{ pose: 'coil', x: 0, sq: 0.1, ms: 60 },
     { pose: 'uppercut', x: 12, y: -8, tilt: -0.08, ms: 30, ghost: 3, hit: 1, sfx: W_, fx: hitFx(1, { dy: -4 }) },
     { pose: 'air', y: -10, ms: 55 }, { pose: 'land', y: 0, ms: 70, fx: (c) => dust(c.U, 4) }],
  ],
  counter: [
    [{ pose: 'parry', x: -3, sq: 0.06, ms: 110, fx: parryFx() },
     { pose: 'cross', x: 16, tilt: 0.12, ms: 30, ghost: 3, hit: 1, fx: both(cut({ a0: -1.6, a1: 1.4, col: DIE.counter.col }), hitFx(1)) },
     { ms: 90 }],
  ],
  gun: [
    [{ pose: 'aim', x: 0, tilt: -0.03, ms: 110 },
     { pose: 'kickback', x: -4, tilt: -0.12, ms: 40, hit: 1, fx: both(muzzle(), hitFx(1, { quiet: 1 })) },
     { pose: 'aim', x: -2, ms: 80 }],
    [{ pose: 'hipfire', x: 0, ms: 70, fx: muzzle() },
     { pose: 'aim', x: -2, ms: 60 },
     { pose: 'kickback', x: -5, tilt: -0.12, ms: 40, hit: 1, fx: both(muzzle(), hitFx(1, { quiet: 1 })) },
     { ms: 70 }],
  ],
  dry: [
    [{ pose: 'aim', ms: 110 },
     { pose: 'aim', x: -1, ms: 60, hit: 1, sfx: 'gun_click' },
     { pose: 'kickback', x: -1, ms: 90 }],
  ],

  // -------- Lobelto (one arm, blunt and stubborn)
  'Puñetazo desesperado': [
    [{ pose: 'cock', x: -2, tilt: -0.1, ms: 60 },
     { pose: 'jab', x: 9, ms: 40, ghost: 1, fx: tapFx() },
     { pose: 'cock', x: 5, ms: 35 },
     { pose: 'jab', x: 13, ms: 40, ghost: 1, fx: tapFx() },
     { pose: 'coil', x: 6, ms: 40 },
     { pose: 'cross', x: 18, tilt: 0.14, ms: 30, ghost: 3, hit: 1, fx: hitFx(1) },
     { ms: 80 }],
    [{ pose: 'cock', x: -2, tilt: -0.14, ms: 70, sfx: W_ },
     { pose: 'hook', x: 15, tilt: 0.2, ms: 30, ghost: 3, hit: 1, fx: both(cut({ a0: -2.6, a1: 0.3, sy: 0.6, col: '#ffffff', th: 3 }), hitFx(1)) },
     { pose: 'cross', ms: 90 }],
  ],
  'Cabezazo táctico': [
    [{ pose: 'butWind', x: -4, tilt: -0.22, ms: 120, sfx: W_ },
     { pose: 'butt', x: 18, tilt: 0.3, ms: 30, ghost: 4, hit: 1, fx: hitFx(2, { dy: -8 }) },
     { pose: 'butt', x: 16, tilt: 0.2, ms: 110, fx: (c) => { const p = headPos(c.U); CB.parts.push(...[0, 1, 2].map(i => ({ x: p.x, y: p.y - 6, vx: (i - 1) * 0.6, vy: -1.2, g: 0.03, life: 30, max: 30, col: '#ffe060' }))); } }],
    [{ pose: 'coil', x: 2, sq: 0.12, ms: 60 },
     { pose: 'uppercut', x: 13, y: -10, tilt: -0.1, ms: 30, ghost: 3, hit: 1, sfx: W_, fx: hitFx(1, { dy: -4 }) },
     { pose: 'air', y: -12, ms: 60 }, { pose: 'land', y: 0, ms: 70, fx: (c) => dust(c.U, 5) }],
  ],
  'Ataque a ciegas': [
    [{ pose: 'flail', x: 4, ms: 45, ghost: 1, sfx: W_ },
     { pose: 'flail2', x: 9, ms: 40, ghost: 1, fx: tapFx() },
     { pose: 'flail', x: 12, tilt: 0.06, ms: 40, ghost: 1, fx: tapFx({ dy: -6 }) },
     { pose: 'flail2', x: 14, ms: 40, ghost: 1, fx: tapFx({ dy: 4 }) },
     { pose: 'cross', x: 18, tilt: 0.14, ms: 30, ghost: 3, hit: 1, fx: hitFx(1) },
     { ms: 70 }],
    [{ pose: 'coil', x: 0, sq: 0.14, ms: 70 },
     { pose: 'overhead', x: 8, y: -20, tilt: -0.14, sq: -0.1, ms: 110, ghost: 2, sfx: W_ },
     { pose: 'smash', x: 15, y: 0, tilt: 0.16, sq: 0.18, ms: 30, ghost: 3, hit: 1, stop: 120, fx: both(hitFx(3), slam()) },
     { sq: 0, ms: 110 }],
  ],
  'Esquivar y gritar': null, // evade + counter: generic counter

  // -------- Gonza (kicks and a shaky pistol)
  'Patada lateral': [
    [{ pose: 'knee', x: 0, ms: 70 },
     { pose: 'sidekick', x: 14, tilt: -0.08, ms: 30, ghost: 3, hit: 1, sfx: W_, fx: hitFx(1) },
     { pose: 'sidekick', x: 13, ms: 80 }, { pose: 'land', x: 10, ms: 60 }],
    [{ pose: 'spin', x: 2, tilt: 0.05, ms: 50, ghost: 2, sfx: W_ },
     { pose: 'knee', x: 6, ms: 40 },
     { pose: 'roundhouse', x: 14, tilt: -0.14, ms: 30, ghost: 3, hit: 1, fx: both(cut({ a0: 2.4, a1: -0.8, col: '#ffffff', th: 3, r: 10 }), hitFx(1, { dy: -6 })) },
     { ms: 90 }],
  ],
  'Disparo nervioso': [
    [{ pose: 'aim', x: 0, ms: 70 },
     { pose: 'aim', x: 1, tilt: 0.03, ms: 45 },
     { pose: 'aim', x: -1, tilt: -0.03, ms: 45 },
     { pose: 'aim', x: 0, ms: 60 },
     { pose: 'kickback', x: -6, tilt: -0.16, ms: 40, hit: 1, fx: both(muzzle(), hitFx(1, { quiet: 1 })) },
     { pose: 'aim', x: -3, ms: 90 }],
  ],
  'Combo callejero': [
    [{ pose: 'coil', ms: 45 }, { pose: 'jab', x: 12, ms: 30, ghost: 2, hit: 1, fx: hitFx(1) }, { ms: 50 }],
    [{ pose: 'cock', x: 8, ms: 40 }, { pose: 'cross', x: 16, tilt: 0.14, ms: 30, ghost: 2, hit: 1, fx: hitFx(1) }, { ms: 50 }],
    [{ pose: 'spin', x: 8, ms: 45, ghost: 2, sfx: W_ }, { pose: 'knee', x: 10, ms: 35 },
     { pose: 'roundhouse', x: 16, tilt: -0.16, ms: 30, ghost: 3, hit: 1, stop: 110, fx: both(cut({ a0: 2.5, a1: -0.9, col: '#ffffff', th: 4, r: 11 }), hitFx(2, { dy: -6 })) },
     { pose: 'land', ms: 80, fx: (c) => dust(c.U, 4) }],
  ],
  'Ráfaga temblorosa': [
    [{ pose: 'hipfire', x: 0, ms: 60 }, { pose: 'kickback', x: -3, ms: 30, hit: 1, fx: both(muzzle(), hitFx(1, { quiet: 1 })) }, { pose: 'hipfire', ms: 40 }],
    [{ pose: 'aim', x: -2, ms: 50 }, { pose: 'kickback', x: -6, tilt: -0.14, ms: 30, hit: 1, fx: both(muzzle(), hitFx(1, { quiet: 1 })) }, { pose: 'aim', ms: 50 }],
    [{ pose: 'knee', x: 4, ms: 55 },
     { pose: 'sidekick', x: 16, tilt: -0.08, ms: 30, ghost: 3, hit: 1, sfx: W_, fx: hitFx(2) },
     { pose: 'land', x: 12, ms: 80 }],
  ],
};

// E.G.O weapons (ultimates): bigger, longer, with focus lines and an impact frame
const EGO_MOVES = {
  blade: [
    [{ pose: 'cock', x: -4, tilt: -0.16, ms: 80, sfx: W_, fx: (c) => fx('focus', 160, 0, 900, { col: c.col }) },
     { pose: 'slashDown', x: 18, tilt: 0.18, ms: 30, ghost: 4, fx: both(cut({ a0: -2.6, a1: 1.1, th: 7, r: 14 }), tapFx()) },
     { pose: 'spin', x: 20, ms: 45, ghost: 3, sfx: W_ },
     { pose: 'slashUp', x: 22, y: -6, tilt: -0.12, ms: 30, ghost: 4, hit: 1, stop: 110, fx: both(cut({ a0: 2.4, a1: -1.2, th: 7, r: 14 }), hitFx(2)) },
     { pose: 'land', y: 0, ms: 90 }],
    [{ pose: 'coil', x: -2, sq: 0.12, ms: 60 },
     { pose: 'spin', x: 10, y: -10, ms: 40, ghost: 3, sfx: W_, fx: both(cut({ a0: 0, a1: 6.2, r: 15, th: 4, sy: 0.5 }), tapFx()) },
     { pose: 'spin', x: 14, y: -14, tilt: 0.3, ms: 40, ghost: 3, fx: tapFx({ dy: -6 }) },
     { pose: 'slashDown', x: 18, y: 0, tilt: 0.2, ms: 30, ghost: 4, hit: 1, stop: 120, fx: both(cut({ a0: -2.8, a1: 1.2, th: 8, r: 16 }), hitFx(2), slam()) },
     { pose: 'land', ms: 90 }],
    [{ pose: 'lunge', x: -10, tilt: -0.1, ms: 90, fx: (c) => fx('speed', 160, 0, 400, { dir: c.dir, seed: 7 }) },
     { pose: 'sweep', x: 34, ms: 30, ghost: 5, sfx: W_, fx: both(cut({ a0: -3.0, a1: 1.3, sy: 0.3, r: 22, th: 9 }), tapFx()) },
     { pose: 'spin', x: 30, ms: 60, ghost: 2 },
     { pose: 'slashUp', x: 26, y: -8, tilt: -0.14, ms: 30, ghost: 5, hit: 1, stop: 160, fx: both(cut({ a0: 2.6, a1: -1.4, th: 9, r: 18 }), hitFx(3)) },
     { pose: 'air', y: -12, ms: 70 }, { pose: 'land', y: 0, ms: 90, fx: (c) => dust(c.U, 6) }],
  ],
  heavy: [
    [{ pose: 'coil', sq: 0.14, ms: 80, fx: (c) => fx('focus', 160, 0, 900, { col: c.col }) },
     { pose: 'overhead', x: 8, y: -24, tilt: -0.16, sq: -0.1, ms: 130, ghost: 3, sfx: W_ },
     { pose: 'smash', x: 16, y: 0, tilt: 0.18, sq: 0.2, ms: 30, ghost: 4, hit: 1, stop: 140, fx: both(hitFx(3), slam(), (c) => fx('ring2', c.c.x, c.f.y, 380, { r: 40, col: c.col, sy: 0.3 })) },
     { sq: 0, ms: 120 }],
  ],
  whip: [
    [{ pose: 'cock', x: -2, tilt: -0.1, ms: 70, fx: (c) => fx('focus', 160, 0, 800, { col: c.col }) },
     { pose: 'sweep', x: 10, ms: 30, ghost: 2, sfx: W_, fx: both(cut({ a0: -2.9, a1: 1.3, sy: 0.4, r: 18, th: 3 }), tapFx()) },
     { pose: 'slashUp', x: 12, ms: 30, ghost: 2, sfx: W_, fx: both(cut({ a0: 2.4, a1: -1.3, r: 16, th: 3 }), tapFx()) },
     { pose: 'slashDown', x: 14, ms: 30, ghost: 3, hit: 1, stop: 100, fx: both(cut({ a0: -2.6, a1: 1.2, r: 18, th: 4 }), hitFx(2)) },
     { ms: 90 }],
  ],
  spear: [
    [{ pose: 'coil', x: -8, sq: 0.08, ms: 90, fx: (c) => fx('focus', 160, 0, 800, { col: c.col }) },
     { pose: 'lunge', x: 14, ms: 30, ghost: 2, fx: both(stab({ w: 3 }), tapFx()) },
     { pose: 'coil', x: 8, ms: 35 },
     { pose: 'lunge', x: 24, tilt: 0.14, ms: 30, ghost: 4, hit: 1, stop: 110, fx: both(stab({ w: 5, over: 24 }), hitFx(2), (c) => fx('speed', 160, 0, 300, { dir: c.dir, seed: 3 })) },
     { ms: 90 }],
  ],
  gun: [
    [{ pose: 'aim', ms: 80, fx: (c) => fx('focus', 160, 0, 900, { col: c.col }) },
     { pose: 'kickback', x: -3, ms: 35, fx: both(muzzle(), tapFx({ sfx: 'pierce' })) },
     { pose: 'aim', ms: 35 },
     { pose: 'kickback', x: -4, ms: 35, fx: both(muzzle(), tapFx({ sfx: 'pierce', dy: -4 })) },
     { pose: 'aim', ms: 35 },
     { pose: 'kickback', x: -7, tilt: -0.16, ms: 40, hit: 1, stop: 110, fx: both(muzzle(), hitFx(2, { quiet: 1 })) },
     { pose: 'aim', ms: 90 }],
  ],
};
const EGO_KIND = { blade: 'blade', scythe: 'blade', hammer: 'heavy', mug: 'heavy', monitor: 'heavy', whip: 'whip', spear: 'spear', gun: 'gun' };

// Picks the move for one coin: E.G.O weapon → page → die type.
function pickMove(U, type, gun, dry, info) {
  const page = info && info.page, i = info ? info.i : 0;
  if (gun && dry) return MOVES.dry[0];
  if (page && page.ego) {
    // the weapon's own moves first, then the generic set for its die type
    const set = EGO_MOVES[EGO_KIND[page.ego.kind] || 'blade'];
    if (set[i]) return set[i];
    const gen = MOVES[DIE[type] && DIE[type].off ? type : 'blunt'];
    return gen[i % gen.length];
  }
  const own = page && MOVES[page.name];
  if (own && own[i] && (!gun || own[i].some(f => f.pose === 'kickback' || f.pose === 'hipfire'))) return own[i];
  const k = gun ? 'gun' : kindOf(type) === 'counter' ? 'counter' : (DIE[type] && DIE[type].off ? type : 'blunt');
  const set = MOVES[k] || MOVES.blunt;
  return set[(i + (U.team === 'enemy' ? 1 : 0)) % set.length];
}

// Plays frames on U against T. Returns after the impact frame; the
// follow-through is left on the actor for settle() to finish.
async function playMove(U, T, frames, c) {
  const a = actorOf(U);
  // inside a combo every coin is measured from where the first one started
  const base = a._chainBase != null ? a._chainBase : (a.ox || 0), dir = c.dir;
  a._chainBase = base;
  const hitAt = frames.findIndex(f => f.hit);
  const main = hitAt >= 0 ? frames.slice(0, hitAt + 1) : frames;
  a.after = hitAt >= 0 ? frames.slice(hitAt + 1) : [];
  a.afterBase = base;
  for (const fr of main) await playFrame(U, a, fr, base, c);
}
async function playFrame(U, a, fr, base, c) {
  if (fr.pose !== undefined) {
    a.poseMs = fr.blend ?? 26;
    // cable skeletons and other monsters only know a punch
    a.pose = U.kind ? (U.kind === 'cableskel' && fr.hit ? 'punch' : null) : fr.pose;
  }
  if (fr.ghost) trail(a, c.dir, fr.ghost);
  const to = {};
  if (fr.x != null) to.ox = base + c.dir * fr.x;
  if (fr.y != null) to.oy = fr.y;
  if (fr.tilt != null) to.tilt = c.dir * fr.tilt;
  if (fr.sq != null) to.sq = fr.sq;
  const ms = fr.ms ?? 60, mv = Math.min(ms, fr.move ?? 34);
  if (fr.sfx) SFX.play(fr.sfx);
  await tween(a, to, mv, easeOut);
  if (fr.fx) { c.c = chest(c.T); c.h = handOf(c.U, c.dir); c.f = feet(c.T); fr.fx(c); }
  if (fr.ghost) setTimeout(() => { if (a.ghosts) a.ghosts = null; }, 70);
  await wait(ms - mv);
  if (fr.hit) await wait(fr.stop ?? (50 + c.power * 20));   // hit-stop
}
function handOf(U, dir) {
  const a = actorOf(U), s = (U.scale || 1) * (U.hat === 'cap' ? 0.86 : 1);
  return { x: a.x + (a.ox || 0) + dir * 12 * s, y: a.y + (a.oy || 0) - (U.kind ? (U.height || 40) * 0.5 : 20) * s };
}

// Called by applyHit for every coin that lands (or is soaked / dodged).
async function skillAnim(U, T, type, gun, dry) {
  const a = actorOf(U);
  if (!a) return;
  const info = U._move;
  a.atk = true;
  const page = info && info.page;
  const last = page && info.i === page.dice.length - 1 && page.dice.length > 1;
  const col = page && page.ego ? egoCol(page.ego) : gun ? '#ffd060' : (DIE[type] ? DIE[type].col : '#ffffff');
  const kind = gun ? 'pierce' : kindOf(type) === 'counter' ? 'counter' : type;
  const c = { U, T, a, dir: dirTo(U, T), col, kind: DIE[kind] ? kind : 'blunt', power: page && page.ego ? 2 : last ? 2 : 1 };
  await playMove(U, T, pickMove(U, type, gun, dry, info), c);
}

// Finish the follow-through, then ease back to the guard stance.
// chain: more coins of the same page follow, so only a short beat is played
// and the attacker stays in place for the next one.
async function settleMove(u, chain) {
  const a = actorOf(u);
  if (!a) return;
  const after = a.after || [];
  a.after = null;
  if (chain) { await wait(30); return; }
  a._chainBase = null;
  if (after.length && !CB.instant) {
    const c = { U: u, T: u, a, dir: a.face || 1, col: '#ffffff', kind: 'blunt', power: 1 };
    for (const fr of after) await playFrame(u, a, fr, a.afterBase || 0, c);
  }
  a.atk = false;
  a.poseMs = null;
  a.pose = null;
  a.ghosts = null;
  await tween(a, { ox: 0, oy: 0, tilt: 0, sq: 0 }, 220, easeOutBack);
}
