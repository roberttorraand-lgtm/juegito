// =====================================================================
//  CINEMA — E.G.O finishers.
//
//  An E.G.O page clashes without dealing damage (combat.js, egoClashLoop):
//  each exchange breaks the loser's coin. If the E.G.O page ends the clash
//  with coins left (or hits unopposed) the weapon's own finisher plays:
//  letterbox bars, a darkened stage tinted with the risk colour, a close
//  camera and a sequence unique to each weapon. All the damage happens
//  here: the remaining coins land at the finisher's hit marks.
// =====================================================================

// ---------------------------------------------------------------------
//  Overlay and backdrop
// ---------------------------------------------------------------------
function cineBackdrop(t) {
  const C = CB.cine;
  const k = Math.min(1, (performance.now() - C.start) / 220) * (C.out ? Math.max(0, 1 - (performance.now() - C.out) / 260) : 1);
  ctx.globalAlpha = k * (C.dark ?? 0.62);
  rect(-OX, 0, VW, H, '#06040a');
  ctx.globalAlpha = k;
  light(C.cx || 160, C.cy || 80, 130, 60, C.col, 0.13, 6);
  ctx.globalAlpha = 1;
}
function drawCineOverlay(t) {
  const C = CB.cine;
  const now = performance.now();
  const k = Math.min(1, (now - C.start) / 220) * (C.out ? Math.max(0, 1 - (now - C.out) / 260) : 1);
  const bar = Math.round(24 * k);
  rect(-OX, 0, VW, bar, '#000');
  rect(-OX, H - bar - 22 * k, VW, bar + 22 * k, '#000');
  rect(-OX, bar, VW, 1, C.col);
  rect(-OX, H - bar - 22 * k - 1, VW, 1, C.col);
  if (k > 0.6) {
    ctx.globalAlpha = (k - 0.6) / 0.4;
    txt('E.G.O', -OX + 10, H - 18, C.col, 8);
    txt(C.w.name.toUpperCase(), -OX + 40, H - 17, '#ffffff', 10);
    riskChip(C.w.risk, W + OX - 40, H - 25, 30);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------
//  Finisher effects
// ---------------------------------------------------------------------
Object.assign(FX_DRAW, {
  // a weapon thrown across the stage, spinning
  proj(f, k) {
    const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * (f.arc || 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(k * (f.spin || 12));
    egoIcon(f.kind, 0, 0, f.s || 1, f.col);
    ctx.restore();
    for (let i = 1; i < 4; i++) { ctx.globalAlpha = 0.25 / i; const q = Math.max(0, k - i * 0.05); egoIcon(f.kind, f.x0 + (f.x1 - f.x0) * q, f.y0 + (f.y1 - f.y0) * q, (f.s || 1) * 0.9, f.col); }
    ctx.globalAlpha = 1;
  },
  // big comic-style sound word
  onoma(f, k) {
    const pop = k < 0.12 ? 0.6 + k / 0.12 * 0.7 : k < 0.2 ? 1.3 - (k - 0.12) * 3.7 : 1;
    ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    ctx.save(); ctx.translate(f.x, f.y - k * 6); ctx.rotate(f.rot || -0.12); ctx.scale(pop, pop);
    ctx.font = `${f.size || 16}px VT323, monospace`; ctx.textAlign = 'center';
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2]]) { ctx.fillStyle = '#000'; ctx.fillText(f.text, dx, dy); }
    ctx.fillStyle = f.col; ctx.fillText(f.text, 0, 0);
    ctx.restore(); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  },
  // a cable from the hand coiled round the target, wobbling
  tether(f, k) {
    const a = f.get();
    ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
    let px0 = a.x0, py0 = a.y0;
    for (let i = 1; i <= 12; i++) {
      const q = i / 12, x = a.x0 + (a.x1 - a.x0) * q, y = a.y0 + (a.y1 - a.y0) * q + Math.sin(q * 9 + k * 30) * 2 * (1 - q);
      line(px0, py0, x, y, '#2a3050', 2); px(x, y - 1, f.col); px0 = x; py0 = y;
    }
    for (let r = 0; r < 3; r++) {
      const cy = a.y1 - 8 + r * 7;
      for (let i = 0; i < 18; i++) { const an = i / 18 * TAU; px(a.x1 + Math.cos(an) * 8, cy + Math.sin(an) * 2, i % 3 ? '#2a3050' : f.col); }
    }
    ctx.globalAlpha = 1;
  },
  // jagged lightning bolt
  bolt(f, k) {
    if (Math.floor(k * 8) % 2) return;
    let x = f.x0, y = f.y0;
    const n = 7;
    for (let i = 1; i <= n; i++) {
      const q = i / n, nx = f.x0 + (f.x1 - f.x0) * q + (Math.random() - 0.5) * 10, ny = f.y0 + (f.y1 - f.y0) * q + (Math.random() - 0.5) * 10;
      line(x, y, nx, ny, f.col, 2); line(x, y, nx, ny, '#ffffff', 1); x = nx; y = ny;
    }
    light(f.x1, f.y1, 14, 14, f.col, 0.4, 2);
  },
  // the hydraulic press of the extraction machine dropping from above
  press(f, k) {
    const drop = k < 0.18 ? (k / 0.18) ** 2 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    const y = -60 + (f.y - -60) * drop;
    rect(f.x - 4, -60, 8, y + 60 - 20, '#3e4a50'); rect(f.x - 4, -60, 2, y + 40, '#6a7a80');
    rect(f.x - 26, y - 20, 52, 20, '#3a3a42'); rect(f.x - 26, y - 20, 52, 2, '#7a7a86');
    rect(f.x - 28, y - 3, 56, 3, f.col);
    for (let i = 0; i < 5; i++) rect(f.x - 22 + i * 10, y - 16, 6, 3, '#24242a');
    pixText('ZAYIN', f.x - 10, y - 11, '#c8c0a0');
  },
  // blue screen of death across the screen (screen space)
  bsod(f, k) {
    if (k > 0.85 && Math.floor(k * 40) % 2) return;
    ctx.globalAlpha = k < 0.08 ? k / 0.08 : 0.92;
    rect(-OX, 24, VW, 110, '#1a46c8');
    ctx.globalAlpha = 1;
    txt(':(', 60, 60, '#ffffff', 24);
    txt('Tu enemigo ha tenido un problema', 60, 78, '#ffffff', 9);
    txt('y necesita reiniciarse.', 60, 88, '#ffffff', 9);
    txt(`${Math.min(100, Math.floor(k * 140))}% completado`, 60, 104, '#ffffff', 8);
    for (let i = 0; i < 4; i++) { const y = 30 + hash(Math.floor(k * 30) + i) * 100; rect(-OX, y, VW, 2, i % 2 ? '#ff4a8a' : '#4affe0'); }
  },
  // a quality-control stamp slapped on the target
  stamp(f, k) {
    const s = k < 0.1 ? 2 - k / 0.1 : 1;
    ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(-0.18); ctx.scale(s, s);
    rect(-24, -9, 48, 18, f.col); rect(-22, -7, 44, 14, '#120e14');
    ctx.font = '8px VT323, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = f.col;
    ctx.fillText('PIEZA Nº ??', 0, -1); ctx.fillText('APROBADA', 0, 6);
    ctx.restore(); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  },
  // a long jagged tear that opens a beat after the cut
  tear(f, k) {
    const open = k < 0.3 ? 0 : Math.min(1, (k - 0.3) / 0.15);
    ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    const pts = [];
    for (let i = 0; i <= 10; i++) { const q = i / 10; pts.push([f.x0 + (f.x1 - f.x0) * q + (i % 2 ? 3 : -3), f.y0 + (f.y1 - f.y0) * q + (i % 2 ? -2 : 2)]); }
    for (let i = 1; i < pts.length; i++) line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], open ? '#ffffff' : f.col, open ? 1 + open * 2 : 1);
    if (open) light((f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, 30 * open, 12 * open, f.col, 0.5, 3);
    ctx.globalAlpha = 1;
  },
  // golden beam from the barrel
  beam(f, k) {
    const w = (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8) * f.w;
    if (w <= 0) return;
    rect(Math.min(f.x0, f.x1), f.y - w / 2, Math.abs(f.x1 - f.x0), w, f.col);
    rect(Math.min(f.x0, f.x1), f.y - w / 4, Math.abs(f.x1 - f.x0), Math.max(1, w / 2), '#ffffff');
    light(f.x1, f.y, w * 3, w * 3, f.col, 0.5, 3);
  },
  // musical notes and ringing arcs
  ringtone(f, k) {
    ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 3; i++) {
      const r = 6 + k * 30 + i * 6;
      for (let a = -0.8; a <= 0.8; a += 0.1) px(f.x + Math.cos(a) * r * f.dir, f.y + Math.sin(a) * r, f.col);
    }
    txt('♪', f.x + 8 * f.dir, f.y - 10 - k * 14, '#ffffff', 10, 'center');
    ctx.globalAlpha = 1;
  },
  // ALEPH: a huge X carved across the whole screen (screen space)
  bigX(f, k) {
    const draw = (sx0, sy0, sx1, sy1, q) => {
      const ex = sx0 + (sx1 - sx0) * q, ey = sy0 + (sy1 - sy0) * q;
      line(sx0, sy0, ex, ey, f.col, 9); line(sx0, sy0, ex, ey, '#ffffff', 3);
    };
    const q1 = Math.min(1, k / 0.15), q2 = Math.max(0, Math.min(1, (k - 0.25) / 0.15));
    ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
    draw(40, 26, 280, 124, q1);
    if (q2 > 0) draw(280, 26, 40, 124, q2);
    ctx.globalAlpha = 1;
  },
});
// same word, fixed on screen (for titles the camera must not push out of view)
FX_DRAW.title = FX_DRAW.onoma;
// a clash coin snapping in two
FX_DRAW.coinBreak = (f, k) => {
  const d = k * 10, a = Math.max(0, 1 - k);
  ctx.globalAlpha = a;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.beginPath(); ctx.rect(s < 0 ? f.x - 8 + s * d : f.x + s * d, f.y - 8, 8, 16); ctx.clip();
    ctx.translate(s * d, k * 6);
    disc(f.x, f.y, 5, f.col); disc(f.x, f.y, 3, '#16121a'); px(f.x, f.y, f.col);
    ctx.restore();
  }
  if (k < 0.2) light(f.x, f.y, 10, 10, '#ffffff', 0.6, 2);
  ctx.globalAlpha = 1;
};
FX_SCREEN.add('bsod'); FX_SCREEN.add('bigX'); FX_SCREEN.add('title');

// ---------------------------------------------------------------------
//  Finisher runner
// ---------------------------------------------------------------------
async function egoCinematic(s, T, stats) {
  const U = s.unit, w = s.page.ego;
  // the coins that still have to land
  const coins = [];
  for (; s.i < s.page.dice.length; s.i++) {
    const die = s.page.dice[s.i];
    if (DIE[die[0]].off) coins.push(rnd(die[1], die[2]));
  }
  if (!coins.length) {
    const last = [...s.page.dice].reverse().find(d => DIE[d[0]].off);
    if (last) coins.push(rnd(last[1], last[2]));
  }
  const a = actorOf(U), ta = actorOf(T);
  if (CB.instant || !a || !ta) { for (const r of coins) resolveHit(T, r, stats, U); return; }
  const script = FINISHERS[w.id] || FINISHERS._default;
  const col = egoCol(w), dir = dirTo(U, T);
  // which hit mark each coin lands on
  const marks = script.hits;
  const at = coins.map((_, j) => Math.max(0, Math.floor((j + 1) * marks / coins.length) - 1));
  let hitN = 0;
  const base = a.ox || 0;
  a.ego = { kind: w.kind, col, s: 1.15 };
  const mc = { U, T, a, dir, col, kind: kindOf(w.dice[0][0]) === 'off' ? w.dice[0][0] : 'slash', power: 2 };
  const refresh = () => { mc.c = chest(T); mc.h = handOf(U, dir); mc.f = feet(T); };
  const c = {
    U, T, a, ta, w, col, dir, mc,
    f: (fr) => playFrame(U, a, fr, base, mc),
    wait,
    // a hit mark: lands its coins (if any) with an impact of the given power
    hit(power = 2, o = {}) {
      refresh();
      const roll = coins.reduce((sum, r, j) => sum + (at[j] === hitN ? r : 0), 0);
      hitN++;
      impactAt(mc, power, o);
      if (roll) {
        const dealt = resolveHit(T, roll, stats, U);
        if (dealt && alive(T)) recoilAnim(T, U, dealt);
      } else if (alive(T)) { ta.flashUntil = performance.now() + 70; }
    },
    title(text, o = {}) { fx('title', o.x || 160, o.y || 48, o.ms || 1200, { text, col: o.col || col, size: o.size || 20, rot: o.rot || 0 }); },
    word(text, o = {}) { refresh(); fx('onoma', mc.c.x + (o.dx || 0) * dir, mc.c.y - 18 + (o.dy || 0), o.ms || 700, { text, col: o.col || col, size: o.size || 16, rot: o.rot }); },
    cam: (z, ms = 200) => camTo({ z, x: (a.x + (a.ox || 0) + ta.x) / 2, y: camY(U, T) }, ms),
  };
  refresh();
  CB.cine = { w, col, start: performance.now(), cx: (a.x + ta.x) / 2, cy: mc.c.y };
  SFX.play(w.risk === 'ALEPH' ? 'aleph' : 'rare');
  await c.cam(1.75, 260);
  await script.run(c);
  while (hitN < marks) c.hit(1, { quiet: 1 });   // never leave a coin unlanded
  CB.cine.out = performance.now();
  await wait(280);
  CB.cine = null;
  a.ego = null;
  a.face = U.team === 'ally' ? 1 : -1;
  await settleMove(U);
}

// ---------------------------------------------------------------------
//  One finisher per weapon. `hits` is how many hit marks run() calls.
// ---------------------------------------------------------------------
function refreshC(c) { c.mc.c = chest(c.T); c.mc.h = handOf(c.U, c.dir); c.mc.f = feet(c.T); }

const FINISHERS = {
  // ZAYIN — the cup Lobelto smashed into that thing's face, thrown again
  taza: { hits: 3, async run(c) {
    await c.f({ pose: 'cock', x: -6, tilt: -0.22, ms: 200, sfx: 'whoosh' });
    await c.f({ pose: 'jab', x: 4, tilt: 0.16, ms: 40, ghost: 2 });
    c.a.ego.hidden = true;
    refreshC(c);
    fx('proj', 0, 0, 230, { kind: 'mug', col: c.col, x0: c.mc.h.x, y0: c.mc.h.y, x1: c.mc.c.x, y1: c.mc.c.y - 6, arc: 10, spin: 14, s: 1.4 });
    await c.wait(230);
    c.hit(2, { sfx: 'blunt' });
    c.word('¡CLONK!', { dy: -6 });
    refreshC(c);
    for (let i = 0; i < 16 * CFG.particles; i++) CB.parts.push({ x: c.mc.c.x, y: c.mc.c.y - 6, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, g: 0.15, life: 34, max: 34, col: i % 3 ? '#e8e0d0' : '#ffffff', len: 1.2 });
    await c.wait(220);
    await c.f({ pose: 'coil', x: 6, ms: 60 });
    await c.f({ pose: 'cross', x: 22, tilt: 0.16, ms: 30, ghost: 3 }); c.hit(2);
    await c.wait(110);
    await c.f({ pose: 'coil', x: 18, sq: 0.12, ms: 60 });
    await c.f({ pose: 'uppercut', x: 24, y: -12, tilt: -0.1, ms: 30, ghost: 3, sfx: 'whoosh' }); c.hit(3, { dy: -6 });
    await c.f({ pose: 'air', y: -14, ms: 140 });
    await c.f({ pose: 'land', y: 0, ms: 90, fx: (m) => dust(m.U, 6) });
  } },

  // ZAYIN — a forgotten part, stamped out on the assembly line
  pieza: { hits: 4, async run(c) {
    for (let i = 0; i < 3; i++) {
      await c.f({ pose: 'overhead', x: 6, y: -6, tilt: -0.1, ms: 90, sfx: i ? null : 'whoosh' });
      await c.f({ pose: 'smash', x: 14, y: 0, tilt: 0.14, sq: 0.12, ms: 30, ghost: 2 });
      c.hit(i === 2 ? 2 : 1, { sfx: 'blunt' });
      c.word(`${i + 1}/3`, { dx: -14, dy: -10, size: 10, col: '#c8c0a0' });
      refreshC(c);
      for (let g = 0; g < 4; g++) CB.parts.push({ x: c.mc.c.x, y: c.mc.c.y, vx: (Math.random() - 0.5) * 2.4, vy: -1.5 - Math.random() * 2, g: 0.14, life: 40, max: 40, col: g % 2 ? '#8a8a96' : '#e8c060' });
      await c.wait(150);
    }
    await c.f({ pose: 'coil', x: 4, sq: 0.14, ms: 90 });
    await c.f({ pose: 'overhead', x: 10, y: -20, tilt: -0.14, ms: 150, ghost: 2, sfx: 'whoosh' });
    await c.f({ pose: 'smash', x: 18, y: 0, tilt: 0.18, sq: 0.18, ms: 30, ghost: 3 });
    c.hit(3, { sfx: 'blunt' });
    refreshC(c);
    fx('stamp', c.mc.c.x, c.mc.c.y - 4, 1100, { col: c.col });
    SFX.play('item');
    await c.wait(500);
  } },

  // TETH — the live cable lashes, coils and electrocutes
  cable: { hits: 5, async run(c) {
    await c.f({ pose: 'cock', x: -4, tilt: -0.12, ms: 120, sfx: 'whoosh' });
    await c.f({ pose: 'sweep', x: 8, ms: 40, ghost: 2 });
    const get = () => { refreshC(c); return { x0: c.mc.h.x, y0: c.mc.h.y, x1: c.mc.c.x, y1: c.mc.c.y }; };
    fx('tether', 0, 0, 1500, { get, col: c.col });
    c.hit(1, { sfx: 'slash' });
    c.word('¡ZAS!', { dy: -8, size: 12 });
    await c.wait(200);
    SFX.play('spark');
    for (let i = 0; i < 3; i++) {
      refreshC(c);
      fx('bolt', 0, 0, 160, { x0: c.mc.h.x, y0: c.mc.h.y, x1: c.mc.c.x + (Math.random() - 0.5) * 8, y1: c.mc.c.y + (Math.random() - 0.5) * 10, col: '#7ab8ff' });
      fx('bolt', 0, 0, 160, { x0: c.mc.c.x - 10, y0: c.mc.c.y - 14, x1: c.mc.c.x + 10, y1: c.mc.c.y + 10, col: '#ffffff' });
      c.ta.shake = true;
      G.flash = { color: '#3a6aff', start: performance.now(), ms: 70, a: 0.3 };
      c.hit(1, { quiet: 1 });
      SFX.play('reboot');
      await c.wait(150);
    }
    c.ta.shake = false;
    await c.f({ pose: 'kickback', x: -10, tilt: -0.2, ms: 90, sfx: 'whoosh' });
    await tween(c.ta, { ox: (c.ta.ox || 0) - c.dir * 10 }, 80);
    await c.f({ pose: 'slashDown', x: 14, tilt: 0.2, ms: 30, ghost: 3 });
    c.hit(3, { sfx: 'blunt' });
    refreshC(c);
    fx('shock', c.mc.c.x, c.mc.f.y, 420, { col: c.col });
    await c.wait(200);
  } },

  // TETH — bonk with a crashed monitor: everything blue-screens
  pantalla: { hits: 3, async run(c) {
    await c.f({ pose: 'coil', sq: 0.12, ms: 80 });
    await c.f({ pose: 'overhead', x: 8, y: -16, tilt: -0.14, ms: 140, ghost: 2, sfx: 'whoosh' });
    await c.f({ pose: 'smash', x: 16, y: 0, tilt: 0.16, sq: 0.16, ms: 30, ghost: 3 });
    c.hit(2, { sfx: 'blunt' });
    fx('bsod', 160, 0, 700, {});
    SFX.play('reboot');
    await c.wait(700);
    c.word('ERROR', { dy: -10, col: '#4affe0', size: 12 });
    await c.f({ pose: 'cock', x: 12, tilt: -0.12, ms: 70 });
    await c.f({ pose: 'cross', x: 20, tilt: 0.14, ms: 30, ghost: 2 }); c.hit(2, { sfx: 'blunt' });
    await c.wait(120);
    await c.f({ pose: 'overhead', x: 14, y: -10, ms: 80 });
    await c.f({ pose: 'smash', x: 20, y: 0, sq: 0.16, ms: 30, ghost: 3 }); c.hit(3, { sfx: 'blunt' });
    await c.wait(160);
  } },

  // HE — calls the hydraulic press down on the target
  prensa: { hits: 3, async run(c) {
    await c.f({ pose: 'overhead', x: -2, y: -4, tilt: -0.1, ms: 200 });
    c.title('¡PRENSA!', { size: 18 });
    SFX.play('reboot');
    await c.wait(250);
    refreshC(c);
    const px = c.mc.c.x, py = c.mc.f.y - 6;
    fx('press', px, 0, 1300, { y: py, col: c.col });
    await c.wait(230);
    c.hit(3, { sfx: 'blunt' });
    fx('shock', px, c.mc.f.y, 500, { col: c.col });
    fx('crack', px, c.mc.f.y, 1200, { seed: 7 });
    for (let i = 0; i < 10 * CFG.particles; i++) CB.parts.push({ x: px + (Math.random() - 0.5) * 50, y: py, vx: (Math.random() - 0.5) * 1.2, vy: -0.6 - Math.random(), g: -0.01, life: 40, max: 40, col: '#c8c8d0' });
    shake(450);
    await c.wait(380);
    await c.f({ pose: 'smash', x: 4, sq: 0.1, ms: 30 }); c.hit(2, { sfx: 'blunt' });
    await c.wait(200);
    await c.f({ pose: 'smash', x: 6, sq: 0.14, ms: 30 }); c.hit(2, { sfx: 'blunt' });
    await c.wait(260);
  } },

  // HE — a flurry of stabs that rings like a missed call
  llamada: { hits: 8, async run(c) {
    await c.f({ pose: 'coil', x: -6, sq: 0.08, ms: 120 });
    for (let i = 0; i < 7; i++) {
      const dy = [-8, 2, -3, 6, -6, 0, -2][i];
      refreshC(c);
      fx('streak', 0, 0, 120, { x0: c.mc.h.x, y0: c.mc.h.y + dy, x1: c.mc.c.x + c.dir * 14, y1: c.mc.c.y + dy, w: 2, col: c.col });
      fx('ringtone', c.mc.c.x, c.mc.c.y + dy, 400, { col: c.col, dir: c.dir });
      await c.f({ pose: i % 2 ? 'jab' : 'lunge', x: 12 + (i % 2) * 4, ms: 45, ghost: 1 });
      c.hit(1, { quiet: i % 2, sfx: 'pierce' });
    }
    SFX.play('select');
    await c.f({ pose: 'coil', x: 2, sq: 0.1, ms: 120 });
    c.word('...¿Diga?', { dy: -14, size: 11, col: '#ffffff' });
    await c.f({ pose: 'lunge', x: 26, tilt: 0.14, ms: 30, ghost: 4 });
    refreshC(c);
    fx('streak', 0, 0, 260, { x0: c.mc.h.x - c.dir * 20, y0: c.mc.c.y, x1: c.mc.c.x + c.dir * 40, y1: c.mc.c.y, w: 5, col: c.col });
    fx('speed', 160, 0, 300, { dir: c.dir, seed: 11 });
    c.hit(3, { sfx: 'pierce' });
    await c.wait(220);
  } },

  // WAW — the jagged blade: an X cut, a dash through and the tear opens
  dentada: { hits: 4, async run(c) {
    CB.cine.dark = 0.75;
    await c.f({ pose: 'cock', x: -4, tilt: -0.18, ms: 140, sfx: 'whoosh' });
    await c.f({ pose: 'slashDown', x: 14, tilt: 0.18, ms: 30, ghost: 3, fx: cut({ a0: -2.6, a1: 1.0, th: 7, r: 15 }) });
    c.hit(2, { sfx: 'slash' });
    await c.wait(60);
    await c.f({ pose: 'slashUp', x: 16, tilt: -0.14, ms: 30, ghost: 3, fx: cut({ a0: 2.5, a1: -1.0, th: 7, r: 15 }) });
    c.hit(2, { sfx: 'slash' });
    await c.wait(160);
    // dash through to the other side
    refreshC(c);
    const x0 = c.mc.c.x;
    await c.f({ pose: 'lunge', x: 58, tilt: 0.1, ms: 70, move: 60, ghost: 5, sfx: 'whoosh' });
    fx('speed', 160, 0, 300, { dir: c.dir, seed: 5 });
    c.a.face = -c.dir;
    fx('tear', 0, 0, 900, { x0: x0 - 16, y0: c.mc.c.y - 18, x1: x0 + 16, y1: c.mc.c.y + 14, col: c.col });
    await c.f({ pose: 'land', x: 60, ms: 260 });
    c.hit(3, { sfx: 'slash' });
    c.word('...', { dy: -16, size: 12, col: '#ffffff' });
    fx('invert', 160, 0, 90, { col: c.col });
    await c.wait(260);
    c.hit(2, { quiet: 1 });
    await c.wait(120);
  } },

  // WAW — Gonza's promised gud bais: gun-kata and a golden beam
  gudbais: { hits: 6, async run(c) {
    c.title('GUD BAIS', { size: 22, col: '#ffe060', ms: 2000, y: 44 });
    const shot = async (pose, x, y, tilt) => {
      await c.f({ pose, x, y, tilt, ms: 70, ghost: 1, fx: muzzle() });
      c.hit(1, { quiet: 1 });
    };
    await shot('aim', 0, 0, 0);
    await c.f({ pose: 'spin', x: 4, y: -6, ms: 60, ghost: 2, sfx: 'whoosh' });
    await shot('hipfire', 6, -8, 0.1);
    await shot('aim', 8, -4, -0.1);
    await c.f({ pose: 'spin', x: 10, y: -10, ms: 60, ghost: 2, sfx: 'whoosh' });
    await shot('kickback', 6, -12, -0.2);
    await shot('aim', 4, 0, 0);
    await c.f({ pose: 'land', ms: 80 });
    for (let i = 0; i < 12 * CFG.particles; i++) CB.parts.push({ x: c.a.x + (Math.random() - 0.5) * 60, y: c.a.y - 60 + Math.random() * 30, vx: 0, vy: 0.4, g: 0.01, life: 50, max: 50, col: i % 2 ? '#ffe060' : '#ffffff' });
    await c.f({ pose: 'aim', x: -2, ms: 260 });
    refreshC(c);
    fx('beam', 0, 0, 420, { x0: c.mc.h.x, x1: c.mc.c.x + c.dir * 60, y: c.mc.h.y, w: 8, col: '#ffe060' });
    SFX.play('gunshot');
    await c.f({ pose: 'kickback', x: -10, tilt: -0.2, ms: 40 });
    c.hit(3, { quiet: 1 });
    await c.wait(260);
  } },

  // ALEPH — Canto X: the stage goes dark and an X is carved across everything
  cantox: { hits: 3, async run(c) {
    CB.cine.dark = 0.92;
    await c.f({ pose: 'coil', x: -4, sq: 0.1, ms: 220 });
    c.title('X', { size: 40, ms: 2400, y: 64 });
    await c.wait(200);
    await c.f({ pose: 'air', x: 10, y: -30, tilt: -0.2, ms: 120, ghost: 4, sfx: 'whoosh' });
    fx('bigX', 160, 0, 1500, { col: c.col });
    await c.f({ pose: 'slashDown', x: 30, y: -8, tilt: 0.3, ms: 40, ghost: 5 });
    c.hit(3, { sfx: 'slash' });
    await c.wait(330);
    await c.f({ pose: 'slashUp', x: 34, y: -18, tilt: -0.3, ms: 40, ghost: 5 });
    c.hit(3, { sfx: 'slash' });
    await c.f({ pose: 'land', x: 36, y: 0, ms: 520 });
    // the X shatters
    G.flash = { color: '#ffffff', start: performance.now(), ms: 220, a: 0.9 };
    fx('invert', 160, 0, 140, { col: c.col });
    SFX.play('aleph');
    refreshC(c);
    for (let i = 0; i < 30 * CFG.particles; i++) CB.parts.push({ x: 40 + Math.random() * 240, y: 26 + Math.random() * 98, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, g: 0.05, life: 40, max: 40, col: i % 3 ? c.col : '#ffffff', len: 1.5 });
    c.hit(3, { sfx: 'slash' });
    shake(600);
    await c.wait(400);
  } },

  // any other weapon: a strong three-hit combo
  _default: { hits: 3, async run(c) {
    await c.f({ pose: 'cock', x: -4, tilt: -0.14, ms: 120, sfx: 'whoosh' });
    await c.f({ pose: 'cross', x: 16, tilt: 0.14, ms: 30, ghost: 3 }); c.hit(2);
    await c.f({ pose: 'spin', x: 18, ms: 60, ghost: 2 });
    await c.f({ pose: 'slashUp', x: 20, y: -6, ms: 30, ghost: 3 }); c.hit(2);
    await c.f({ pose: 'smash', x: 22, y: 0, sq: 0.14, ms: 30, ghost: 3 }); c.hit(3);
    await c.wait(160);
  } },
};
