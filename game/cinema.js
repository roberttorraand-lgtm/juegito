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
  const now = performance.now();
  const k = Math.min(1, (now - C.start) / 220) * (C.out ? Math.max(0, 1 - (now - C.out) / 260) : 1);
  const stage = STAGES[C.stage];
  if (stage) {
    ctx.globalAlpha = k * 0.94;
    stage(now - C.start, C);
  } else {
    ctx.globalAlpha = k * (C.dark ?? 0.62);
    rect(-OX, 0, VW, H, '#06040a');
  }
  ctx.globalAlpha = k;
  light(C.cx || 160, C.cy || 80, 130, 60, C.col, 0.13, 6);
  ctx.globalAlpha = 1;
  drawDecals(now);
}

// Each weapon's finisher plays on its own stage (drawn over the arena).
// ms: time since the finisher started.
const STAGES = {
  // fizzy soda: deep teal water, light shafts, giant WellCheers cans and rising bubbles
  soda(ms) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#031a24'); g.addColorStop(0.55, '#0a4658'); g.addColorStop(1, '#04202a');
    ctx.fillStyle = g; ctx.fillRect(-OX, 0, VW, H);
    const a0 = ctx.globalAlpha;
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = a0 * 0.08;
      const x = -OX + i * 80 + Math.sin(ms / 900 + i) * 10;
      poly([[x, 0], [x + 26, 0], [x + 70, 120], [x + 30, 120]], '#c8f8ff');
    }
    // giant cans in the back
    for (let i = 0; i < 4; i++) {
      const x = -OX + 20 + i * 92 + (i % 2) * 14, y = 36 + (i % 2) * 10;
      ctx.globalAlpha = a0 * 0.3;
      rect(x, y, 26, 48, '#2a7a8a'); rect(x, y + 14, 26, 10, '#a02a3a'); rect(x + 2, y, 3, 48, '#8ad8e8');
      rect(x + 4, y - 3, 18, 3, '#6aa0aa'); txt('W', x + 13, y + 22, '#ffe8e8', 8, 'center');
    }
    // floor
    ctx.globalAlpha = a0;
    rect(-OX, 112, VW, H - 112, '#021218'); rect(-OX, 112, VW, 1, '#4ad8ff');
    for (let i = 0; i < 12; i++) line(-OX + i * 34, 113, -OX + i * 34 - 30, H, '#0a3440', 1);
    // bubbles
    for (let i = 0; i < 46; i++) {
      const sp = 0.012 + hash(i) * 0.03, r = 0.8 + (i % 3) * 0.8;
      const y = 120 - ((ms * sp + hash(i * 3) * 130) % 130);
      const x = -OX + hash(i * 7) * VW + Math.sin(ms / 300 + i) * 2;
      ctx.globalAlpha = a0 * (0.35 + (i % 3) * 0.2);
      ctx.strokeStyle = '#c8f8ff'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      if (r > 1.5) px(x - 1, y - 1, '#ffffff');
    }
    ctx.globalAlpha = a0;
  },
  // electric: a dark room of hanging cables, sparks running along them, distant lightning
  latigo(ms) {
    rect(-OX, 0, VW, H, '#05060e');
    const a0 = ctx.globalAlpha;
    const flashN = Math.floor(ms / 110);
    if (hash(flashN * 13) > 0.86) { ctx.globalAlpha = a0 * 0.18; rect(-OX, 0, VW, 112, '#8ae8ff'); ctx.globalAlpha = a0; }
    for (let i = 0; i < 9; i++) {
      const x0 = -OX + 10 + i * 42, len = 40 + hash(i * 5) * 50, sw = Math.sin(ms / 600 + i * 1.7) * 5;
      let px0 = x0, py0 = 0;
      for (let j = 1; j <= 10; j++) {
        const q = j / 10, x = x0 + sw * q * q, y = len * q;
        line(px0, py0, x, y, '#1a2038', 1); px0 = x; py0 = y;
      }
      // the spark crawling down the cable
      const q = ((ms / 700 + hash(i)) % 1);
      const sx = x0 + sw * q * q, sy = len * q;
      light(sx, sy, 5, 5, '#8ae8ff', 0.5, 2); px(sx, sy, '#ffffff');
      if (hash(i + flashN) > 0.8) for (let k = 0; k < 3; k++) px(px0 + (hash(k + flashN) - 0.5) * 6, py0 + hash(k * 3 + flashN) * 4, '#8ae8ff');
    }
    rect(-OX, 112, VW, H - 112, '#03040a'); rect(-OX, 112, VW, 1, '#3a5aa0');
    for (let i = 0; i < 14; i++) rect(-OX + i * 28, 116 + (i % 2) * 6, 14, 1, '#141a30');
  },
  // CRT: a green phosphor grid, a rolling bar, old monitors in the dark and NO SIGNAL
  hacha(ms) {
    rect(-OX, 0, VW, H, '#020a06');
    const a0 = ctx.globalAlpha;
    ctx.globalAlpha = a0 * 0.5;
    for (let x = -OX - ((ms / 40) % 16); x < VW - OX; x += 16) rect(x, 0, 1, 112, '#0f3a24');
    for (let y = 4; y < 112; y += 16) rect(-OX, y, VW, 1, '#0f3a24');
    ctx.globalAlpha = a0 * 0.85;
    for (let i = 0; i < 5; i++) {
      const x = -OX + 18 + i * 76, y = 26 + (i % 2) * 18;
      rect(x, y, 44, 34, '#16181c'); rect(x + 3, y + 3, 38, 26, '#04160c');
      if (hash(i + Math.floor(ms / 160)) > 0.35) txt('NO SIGNAL', x + 22, y + 19, '#5affb0', 7, 'center');
      rect(x + 18, y + 34, 8, 4, '#16181c');
    }
    // rolling bar and scanlines
    const by = (ms / 6) % 140 - 20;
    ctx.globalAlpha = a0 * 0.12; rect(-OX, by, VW, 12, '#5affb0');
    ctx.globalAlpha = a0 * 0.25;
    for (let y = 0; y < 112; y += 2) rect(-OX, y, VW, 1, '#000000');
    ctx.globalAlpha = a0;
    rect(-OX, 112, VW, H - 112, '#010603'); rect(-OX, 112, VW, 1, '#5affb0');
    for (let i = 0; i < 20; i++) px(-OX + hash(i + Math.floor(ms / 50)) * VW, 114 + hash(i * 9) * 40, '#1a5a3a');
  },
};
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
  // a whip lashing out from the hand: it unrolls, snaps straight and falls slack
  lash(f, k) {
    const a = f.get();
    const out = k < 0.3 ? easeOut(k / 0.3) : 1;
    const tx = a.x0 + (a.x1 - a.x0) * out, ty = a.y0 + (a.y1 - a.y0) * out;
    const mx = (a.x0 + tx) / 2, my = (a.y0 + ty) / 2 - 14 * (1 - out) + (k > 0.5 ? (k - 0.5) * 30 : 0);
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    let px0 = a.x0, py0 = a.y0;
    for (let i = 1; i <= 14; i++) {
      const q = i / 14, u = 1 - q;
      const x = u * u * a.x0 + 2 * u * q * mx + q * q * tx, y = u * u * a.y0 + 2 * u * q * my + q * q * ty;
      line(px0, py0, x, y, i < 3 ? '#2a2a30' : '#2a3050', 2);
      if (i >= 3 && (i + Math.floor(k * 20)) % 2) px(x, y - 1, f.col);
      px0 = x; py0 = y;
    }
    if (out >= 1 && k < 0.5) light(tx, ty, 10, 10, f.col, 0.5, 2);
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

// Limbus-style cut-in: a slanted band slides across with the character
// holding the weapon, the weapon itself huge, and its name
FX_DRAW.cutin = (f, k) => {
  const now = performance.now();
  const inK = Math.min(1, k / 0.14), outK = k > 0.84 ? (k - 0.84) / 0.16 : 0;
  const slide = (1 - easeOut(inK)) * -VW + easeIn(outK) * VW;
  const y0 = 46, h = 62, sk = 18;
  ctx.save();
  ctx.translate(slide, 0);
  // the band, with a lighter edge and hatching moving along it
  const band = () => { ctx.beginPath(); ctx.moveTo(-OX - 20, y0 + sk); ctx.lineTo(W + OX + 20, y0); ctx.lineTo(W + OX + 20, y0 + h); ctx.lineTo(-OX - 20, y0 + h + sk); ctx.closePath(); };
  ctx.globalAlpha = 0.55; ctx.fillStyle = '#000'; ctx.fillRect(-OX - 20, 0, VW + 40, H); ctx.globalAlpha = 1;
  band(); const g = ctx.createLinearGradient(0, y0, 0, y0 + h + sk);
  g.addColorStop(0, '#0c0a12'); g.addColorStop(0.5, f.col2 || '#16202a'); g.addColorStop(1, '#08060c');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); band(); ctx.clip();
  ctx.globalAlpha = 0.18;
  for (let i = -4; i < 30; i++) { const x = -OX + i * 14 - ((now / 12) % 14); line(x, y0 + h + sk, x + 30, y0, f.col, 4); }
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 16; i++) { const y = y0 + 4 + hash(i) * (h + sk - 8), x = (-OX + ((hash(i * 3) * VW - now * 0.5 * (1 + hash(i))) % VW + VW) % VW); rect(x, y, 12 + hash(i * 5) * 30, 1, '#ffffff'); }
  ctx.globalAlpha = 1;
  // the weapon, huge, slowly turning, behind the text
  ctx.save(); ctx.translate(W - 70, y0 + h / 2 + 4); ctx.rotate(-0.35 + Math.sin(now / 500) * 0.05);
  light(0, 0, 40, 40, f.col, 0.35, 4);
  egoIcon(f.kind, 0, 0, 4.2, f.col);
  ctx.restore();
  // the character close-up, holding the weapon
  const fx0 = 56, fy0 = y0 + h + sk + 24;
  light(fx0, fy0 - 40, 30, 36, f.col, 0.3, 4);
  figure(fx0, fy0, { ...f.look, scale: 2.1, face: 1, pose: 'ready', poseData: FIG_POSES[f.pose || 'ready'], ego: { kind: f.kind, col: f.col, s: 1.15, rot: f.rot || 0 } }, now / 16);
  ctx.restore();
  // edges
  line(-OX - 20, y0 + sk, W + OX + 20, y0, f.col, 2); line(-OX - 20, y0 + h + sk, W + OX + 20, y0 + h, f.col, 2);
  // texts
  const tk = Math.min(1, Math.max(0, (k - 0.1) / 0.12));
  ctx.globalAlpha = tk;
  txt('E.G.O', 104, y0 + 18, f.col, 10);
  txt(f.risk, 136, y0 + 18, '#ffffff', 8);
  ctx.font = '22px VT323, monospace';
  const ns = Math.max(12, Math.min(22, Math.floor(22 * (W + OX - 112) / ctx.measureText(f.name).width)));
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [1, 1], [2, 2]]) txt(f.name, 104 + dx, y0 + 38 + dy, '#000', ns);
  txt(f.name, 104, y0 + 38, '#ffffff', ns);
  txt(f.who, 104, y0 + 52, f.col, 10);
  if (f.abno) txt(`— ${f.abno}`, 104 + 4 + f.who.length * 5, y0 + 52, '#a8b0b8', 8);
  ctx.globalAlpha = 1;
  ctx.restore();
};
// closing card: the finisher's name stamped in and the total damage
FX_DRAW.finale = (f, k) => {
  const inK = Math.min(1, k / 0.12), out = k > 0.85 ? (k - 0.85) / 0.15 : 0;
  ctx.globalAlpha = 1 - out;
  const s = 1 + (1 - easeOut(inK)) * 0.8;
  ctx.save(); ctx.translate(160, 50); ctx.scale(s, s); ctx.rotate(-0.05);
  ctx.globalAlpha = (1 - out) * 0.85;
  poly([[-120, -16], [124, -20], [120, 14], [-124, 18]], '#05040a');
  ctx.globalAlpha = 1 - out;
  line(-120, -16, 124, -20, f.col, 2); line(-124, 18, 120, 14, f.col, 2);
  ctx.textAlign = 'center';
  for (const [dx, dy] of [[1, 1], [2, 2]]) txt(f.text, dx, 6 + dy, '#000', 22, 'center');
  txt(f.text, 0, 6, '#ffffff', 22, 'center');
  ctx.restore();
  if (f.dmg) {
    const dk = Math.min(1, Math.max(0, (k - 0.2) / 0.1));
    ctx.globalAlpha = dk * (1 - out) * 0.85;
    rect(118, 70, 84, 14, '#05040a'); rect(118, 70, 84, 1, f.col); rect(118, 83, 84, 1, f.col);
    ctx.globalAlpha = dk * (1 - out);
    txt(`DAÑO TOTAL  ${f.dmg}`, 160, 80, '#ffffff', 10, 'center');
  }
  ctx.textAlign = 'left'; ctx.globalAlpha = 1;
};
FX_SCREEN.add('cutin'); FX_TOP.add('cutin'); FX_SCREEN.add('finale'); FX_TOP.add('finale');

// ---------------------------------------------------------------------
//  Finisher runner
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
//  Cinematic physics: real hand and weapon positions, a simulated whip,
//  weapon smears, debris that bounces on the floor and marks left on it.
// ---------------------------------------------------------------------
const CP = { parts: [], decals: [], trail: [], rope: null, last: 0, floor: 106, trailOn: null };
function cineReset() { Object.assign(CP, { parts: [], decals: [], trail: [], rope: null, last: performance.now(), trailOn: null }); }

// a point in the actor's own (untilted) space, in world coordinates
function toWorld(a, lx, ly) {
  const t = a.tilt || 0, q = a.sq || 0, sx = lx * (1 + q), sy = ly * (1 - q);
  return { x: a.x + (a.ox || 0) + sx * Math.cos(t) - sy * Math.sin(t), y: a.y + (a.oy || 0) + sx * Math.sin(t) + sy * Math.cos(t) };
}
const handW = (a) => (a._hand ? toWorld(a, a._hand.x, a._hand.y) : { x: a.x + (a.ox || 0), y: a.y - 18 });
const backW = (a) => (a._back ? toWorld(a, a._back.x, a._back.y) : handW(a));
// a point of the held weapon's icon (icon coordinates), in world coordinates
function wpnW(a, px, py) {
  const h = a._hand;
  if (!h || !a.ego) return handW(a);
  const r = a.ego.rot || 0, s = (a.ego.s || 0.75) * h.sc, f = h.f;
  const lx = h.x + f * 3 * h.sc + f * s * (px * Math.cos(r) - py * Math.sin(r));
  const ly = h.y - 3 * h.sc + s * (px * Math.sin(r) + py * Math.cos(r));
  return toWorld(a, lx, ly);
}
// the part of each weapon that touches: blade edge, muzzle, butt
const WP = { axeHead: [5, -6], axeEdge: [7, -6], muzzle: [7, -1], butt: [-1, 5] };

// ---- debris
function debris(type, x, y, n, o = {}) {
  for (let i = 0; i < n * (CFG.particles || 1); i++) {
    const an = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? 2.2);
    const v = (o.speed ?? 2) * (0.45 + Math.random() * 0.9);
    CP.parts.push({ type, x: x + (Math.random() - 0.5) * (o.jx || 0), y: y + (Math.random() - 0.5) * (o.jy || 0),
      vx: Math.cos(an) * v, vy: Math.sin(an) * v, g: o.g ?? 0.13, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.6,
      life: 0, max: (o.life ?? 60) * (0.7 + Math.random() * 0.6), col: o.cols ? o.cols[i % o.cols.length] : (o.col || '#ffffff'),
      size: (o.size ?? 2) * (0.6 + Math.random() * 0.8), floor: (o.floor ?? CP.floor) + Math.random() * 3, bounce: o.bounce ?? 0.35 });
  }
}
// the direction "away from the attacker, a bit upward"
const away = (c, up = 0.5) => (c.dir > 0 ? -up : Math.PI + up);
function decal(type, x, y, o = {}) { CP.decals.push({ type, x, y, t0: performance.now(), ...o }); if (CP.decals.length > 90) CP.decals.shift(); }

function stepCine(now) {
  const dt = Math.min(3, Math.max(0.2, (now - CP.last) / 16.7)) / slowMo();
  CP.last = now;
  for (const p of CP.parts) {
    p.life += dt;
    if (p.type === 'smoke' || p.type === 'foam') {
      p.vx *= 0.95; p.vy *= 0.95;
      p.x += (p.vx + (p.type === 'foam' ? Math.sin(p.life / 6 + p.rot) * 0.25 : 0)) * dt;
      p.y += (p.vy - (p.type === 'foam' ? 0.3 : 0.18)) * dt;
      continue;
    }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.y > p.floor) {
      p.y = p.floor;
      if (p.type === 'drop') { if (Math.random() < 0.45) decal('splat', p.x, p.floor, { col: p.col, r: 1 + p.size }); p.life = p.max; continue; }
      if (p.type === 'spark' && Math.random() < 0.3) decal('ember', p.x, p.floor, { col: p.col });
      p.vy *= -p.bounce; p.vx *= 0.55; p.vr *= 0.5;
      if (Math.abs(p.vy) < 0.35) p.vy = 0;
    }
  }
  CP.parts = CP.parts.filter(p => p.life < p.max);
  if (CP.parts.length > 500) CP.parts.splice(0, CP.parts.length - 500);
}
function drawParts() {
  for (const p of CP.parts) {
    const k = p.life / p.max;
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    const sp = Math.hypot(p.vx, p.vy) || 1;
    if (p.type === 'drop') {
      const l = Math.min(5, sp * 1.3 + 1);
      line(p.x, p.y, p.x - p.vx / sp * l, p.y - p.vy / sp * l, p.col, Math.max(1, p.size * 0.7));
      px(p.x, p.y, '#ffffff');
    } else if (p.type === 'shard') {
      const r = p.size + 1, c = Math.cos(p.rot), s = Math.sin(p.rot);
      poly([[p.x + c * r, p.y + s * r], [p.x - s * r * 0.6, p.y + c * r * 0.6], [p.x - c * r * 0.8, p.y - s * r * 0.8]], p.col);
      if (Math.sin(p.life * 0.6 + p.rot * 3) > 0.7) px(p.x, p.y, '#ffffff');
    } else if (p.type === 'px') {
      rect(p.x - p.size / 2, p.y - p.size / 2, Math.max(1, p.size), Math.max(1, p.size), p.col);
    } else if (p.type === 'spark') {
      const l = Math.min(4, sp * 1.6 + 0.5);
      line(p.x, p.y, p.x - p.vx / sp * l, p.y - p.vy / sp * l, p.col, 1); px(p.x, p.y, '#ffffff');
    } else if (p.type === 'smoke') {
      ctx.globalAlpha *= 0.35 * (1 - k);
      disc(p.x, p.y, p.size * (1 + k * 2.5), p.col);
    } else if (p.type === 'foam') {
      ctx.strokeStyle = p.col; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.8, 0, TAU); ctx.stroke();
      if (p.size > 1.6) px(p.x - 1, p.y - 1, '#ffffff');
    } else if (p.type === 'tab') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      rect(-2, -1, 4, 2, '#c8d0d8'); px(1, 0, '#6a7480'); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
function drawDecals(now) {
  for (const d of CP.decals) {
    const age = now - d.t0, g = Math.min(1, age / (d.grow || 160));
    if (d.type === 'splat') {
      ctx.globalAlpha = 0.6; ellipse(d.x, d.y + 1, d.r * (0.6 + g * 0.8), Math.max(0.5, d.r * 0.3), d.col);
    } else if (d.type === 'puddle') {
      ctx.globalAlpha = 0.55; ellipse(d.x, d.y + 1, d.r * g, d.r * 0.22 * g, d.col);
      ctx.globalAlpha = 0.5; ellipse(d.x - d.r * 0.3 * g, d.y, d.r * 0.3 * g, 0.6, '#c8f8ff');
      if (Math.floor(age / 300) % 3 === 0) { ctx.globalAlpha = 0.6; px(d.x + Math.sin(age / 200) * d.r * 0.5, d.y, '#ffffff'); }
    } else if (d.type === 'scorch') {
      ctx.globalAlpha = 0.6; ellipse(d.x, d.y + 1, d.r * g, d.r * 0.25 * g, '#050506');
      for (let i = 0; i < 6; i++) {
        const lit = age < 1800 && hash(i + Math.floor(age / 90)) > 0.45;
        if (lit) { ctx.globalAlpha = 1 - age / 1800; px(d.x + (hash(i * 3) - 0.5) * d.r * 1.6, d.y + (hash(i * 7) - 0.5) * 2, d.col || '#ffa040'); }
      }
    } else if (d.type === 'ember') {
      if (age < 900) { ctx.globalAlpha = 1 - age / 900; px(d.x, d.y, d.col); }
    } else if (d.type === 'gouge') {
      // a cut in the floor: dark jagged groove, glowing while it is fresh
      ctx.globalAlpha = 0.9;
      let x0 = d.x - d.r * g, y0 = d.y;
      for (let i = 1; i <= 8; i++) {
        const x1 = d.x - d.r * g + (2 * d.r * g) * i / 8, y1 = d.y + (hash(i * 5 + d.seed) - 0.5) * 2;
        line(x0, y0, x1, y1, '#060606', 2);
        if (age < 900) { ctx.globalAlpha = 1 - age / 900; line(x0, y0, x1, y1, d.col, 1); ctx.globalAlpha = 0.9; }
        x0 = x1; y0 = y1;
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ---- weapon smear: the swept area between the hand and the edge, fading fast
function sampleTrail(now) {
  const T = CP.trailOn;
  if (!T) return;
  const h = handW(T.a), e = wpnW(T.a, ...T.pt);
  CP.trail.push({ hx: h.x, hy: h.y, x: e.x, y: e.y, t: now });
}
function drawTrail(now) {
  const life = 150;
  CP.trail = CP.trail.filter(p => now - p.t < life);
  const P = CP.trail;
  if (P.length < 2) return;
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], k = 1 - (now - b.t) / life;
    ctx.globalAlpha = 0.45 * k;
    poly([[a.hx + (a.x - a.hx) * 0.35, a.hy + (a.y - a.hy) * 0.35], [a.x, a.y], [b.x, b.y], [b.hx + (b.x - b.hx) * 0.35, b.hy + (b.y - b.hy) * 0.35]], CP.trailCol || '#ffffff');
    ctx.globalAlpha = 0.9 * k;
    line(a.x, a.y, b.x, b.y, '#ffffff', 1);
  }
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = 1;
}

// ---- the whip: a chain of points with gravity and fixed lengths (verlet).
// ctrl drives it: 'lash' whips the tip out to a point and lets go, 'wrap'
// coils the end round a target, 'drag' lays it on the floor.
function ropeInit(a, n = 18, seg = 2.4) {
  const h = handW(a);
  const pts = Array.from({ length: n }, (_, i) => ({ x: h.x, y: h.y + i * seg, px: h.x, py: h.y + i * seg }));
  CP.rope = { a, n, seg, base: seg, pts, ctrl: null, charge: 0 };
}
function ropeAnchor(R) { const h = handW(R.a), f = (R.a._hand && R.a._hand.f) || 1; return { x: h.x + f * 2, y: h.y - 3 }; }
function stepRope(now) {
  const R = CP.rope;
  if (!R) return;
  const A = ropeAnchor(R), P = R.pts, n = R.n, C = R.ctrl;
  let target = R.base;
  if (C && C.mode === 'wrap') target = Math.max(R.base, Math.hypot(C.get().x - A.x, C.get().y - A.y) / (n * 0.5));
  R.seg += (target - R.seg) * 0.15;
  const steps = 2;
  for (let s = 0; s < steps; s++) {
    for (let i = 1; i < n; i++) {
      const p = P[i], vx = (p.x - p.px) * 0.97, vy = (p.y - p.py) * 0.97;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + 0.18;
      if (p.y > CP.floor + 1) { p.y = CP.floor + 1; p.px = p.x - vx * 0.5; }
    }
    if (C) {
      const k = (now - C.t0) / C.ms;
      if (C.mode === 'lash' && k <= 1) {
        const T = C.get(), ext = easeOut(Math.min(1, k * 1.25));
        const nx = -(T.y - A.y), ny = T.x - A.x, nl = Math.hypot(nx, ny) || 1;
        for (let i = 1; i < n; i++) {
          const q = i / (n - 1), wv = Math.sin(q * Math.PI * 1.6 - k * Math.PI * 3.2) * C.amp * (1 - k) * q;
          const dx = A.x + (T.x - A.x) * q * ext + nx / nl * wv, dy = A.y + (T.y - A.y) * q * ext + ny / nl * wv;
          P[i].x += (dx - P[i].x) * 0.5; P[i].y += (dy - P[i].y) * 0.5;
        }
      } else if (C.mode === 'wrap') {
        const T = C.get(), m = Math.floor(n * 0.5);
        for (let i = m; i < n; i++) {
          const j = i - m, an = C.phase + now / 90 * C.spin + j * 0.95;
          const dx = T.x + Math.cos(an) * C.rx, dy = T.y - C.h / 2 + (j / (n - m)) * C.h + Math.sin(an) * 1.5;
          P[i].x += (dx - P[i].x) * 0.6; P[i].y += (dy - P[i].y) * 0.6;
        }
      } else if (C.mode === 'lash' && k > 1) R.ctrl = null;
    }
    P[0].x = A.x; P[0].y = A.y; P[0].px = A.x; P[0].py = A.y;
    for (let it = 0; it < 6; it++) {
      for (let i = 1; i < n; i++) {
        const a = P[i - 1], b = P[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, diff = (d - R.seg) / d;
        if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
    }
  }
}
function drawRope(now) {
  const R = CP.rope;
  if (!R) return;
  const P = R.pts, h = handW(R.a), A = ropeAnchor(R);
  // insulated grip in the hand
  line(h.x, h.y + 1, A.x, A.y, '#1a1a1e', 3); px(A.x, A.y, '#5a5a66');
  // a soft electric glow, the dark cable and a bright live core
  ctx.globalAlpha = R.charge ? 0.35 : 0.18;
  for (let i = 1; i < P.length; i++) line(P[i - 1].x, P[i - 1].y, P[i].x, P[i].y, ELEC, 4);
  ctx.globalAlpha = 1;
  for (let i = 1; i < P.length; i++) line(P[i - 1].x, P[i - 1].y, P[i].x, P[i].y, '#24305a', 2);
  for (let i = 2; i < P.length; i++) line(P[i - 1].x, P[i - 1].y, P[i].x, P[i].y, R.charge ? '#c8f4ff' : '#6a80c0', 1);
  for (let i = 1; i < P.length; i++) if ((i + Math.floor(now / 40)) % 4 === 0) px(P[i].x, P[i].y, '#ffffff');
  if (R.charge) {
    const tip = P[P.length - 1];
    light(tip.x, tip.y, 8 + R.charge * 4, 8 + R.charge * 4, ELEC, 0.45, 2);
    for (let j = 0; j < R.charge * 2; j++) {
      const i = 1 + Math.floor(hash(j + Math.floor(now / 50)) * (P.length - 2));
      const p = P[i], q = P[i + 1] || p;
      line(p.x, p.y, (p.x + q.x) / 2 + (hash(j * 3 + now) - 0.5) * 6, (p.y + q.y) / 2 + (hash(j * 7 + now) - 0.5) * 6, '#ffffff', 1);
    }
  }
}
const ropeTip = () => { const P = CP.rope.pts; return P[P.length - 1]; };

// the cinematic layer, drawn over the actors every frame
FX_DRAW.cineLayer = () => {
  const now = performance.now();
  stepCine(now); stepRope(now); sampleTrail(now);
  drawTrail(now); drawRope(now); drawParts();
};

// ---- the target's body reacts to every blow: knocked back, bent, springing back
const springEase = (k) => 1 - Math.cos(k * Math.PI * 3) * Math.exp(-5 * k);
async function react(c, o = {}) {
  const ta = c.ta, d = c.dir, big = !!c.T.kind, m = big ? 0.55 : 1;
  const kb = (o.kb ?? 6) * m, up = (o.up ?? 0) * m, tilt = (o.tilt ?? 0.2) * m;
  ta.flashUntil = performance.now() + 55;
  ta.shake = true; setTimeout(() => { ta.shake = false; }, 90);
  if (!big) { ta.poseMs = 50; ta.pose = 'hurt'; }
  tween(ta, { sq: -0.1 * m }, 30).then(() => tween(ta, { sq: 0.07 * m }, 90).then(() => tween(ta, { sq: 0 }, 260, springEase)));
  await tween(ta, { ox: (ta.ox || 0) + d * kb, oy: -up, tilt: d * tilt }, 110 + kb * 4, easeOut);
  if (kb > 8) { dust(c.T, 4 + Math.floor(kb / 4), -d); }
  tween(ta, { oy: 0 }, 140 + up * 10, easeIn).then(() => { if (up > 4) { dust(c.T, 6); SFX.play('blunt'); } });
  await tween(ta, { tilt: 0 }, 520, springEase);
  if (!big && !o.keep) { ta.pose = null; ta.poseMs = null; }
}

async function egoCinematic(s, T, stats) {
  const U = s.unit, w = s.page.ego;
  // the damage: every offensive die of the weapon. The clash itself dealt none.
  const coins = w.dice.filter(d => DIE[d[0]].off).map(d => rnd(d[1], d[2]));
  if (!coins.length) coins.push(rnd(w.dice[0][1], w.dice[0][2]));
  s.i = s.page.dice.length;
  const total = coins.reduce((x, y) => x + y, 0);
  const a = actorOf(U), ta = actorOf(T);
  if (CB.instant || !a || !ta) { for (const r of coins) resolveHit(T, r, stats, U); return; }
  const script = FINISHERS[`${w.id}:${U.id}`] || FINISHERS[w.id] || FINISHERS._default;
  const col = script.col || egoCol(w), dir = dirTo(U, T);
  // each hit mark lands a share of the damage, in proportion to its power
  const marks = script.marks;
  const sum = marks.reduce((x, y) => x + y, 0);
  let hitN = 0, cum = 0, dealtSoFar = 0, dealtTotal = 0;
  const base = a.ox || 0, y0 = a.y;
  a.ego = { kind: w.kind, col, s: 1.15, rot: 0 };
  const mc = { U, T, a, dir, col, kind: kindOf(w.dice[0][0]) === 'off' ? w.dice[0][0] : 'slash', power: 2 };
  const refresh = () => { mc.c = chest(T); mc.h = handOf(U, dir); mc.f = feet(T); };
  const sc = (U.scale || 1) * (U.hat === 'cap' ? 0.86 : 1);
  const half = T.kind ? (T.kind === 'cableskel' ? 6 : 13) : 5;
  const c = {
    U, T, a, ta, w, col, dir, mc, half,
    f: (fr) => playFrame(U, a, fr, base, mc),
    wait,
    // distance from the attacker's start to the target's centre
    raw: () => Math.abs((ta.x + (ta.ox || 0)) - (a.x + base)),
    // the x (for c.f) at which this pose's leading hand, plus `reach` px of
    // weapon, just touches the front of the target
    at(pose, reach = 0) {
      const P = FIG_POSES[pose];
      const fwd = P ? (P.front[0] + Math.round((P.lean || 0) * 0.8)) * sc : 7 * sc;
      return c.raw() - half - reach - fwd;
    },
    // the target's front surface at a height (0 = feet, 1 = head)
    front(hk = 0.55) {
      const h = (T.kind ? (T.height || 60) * (T.scale || 1) : 30 * (T.scale || 1));
      return { x: ta.x + (ta.ox || 0) - dir * half, y: ta.y + (ta.oy || 0) - h * hk };
    },
    gap: () => c.raw() - (T.kind && T.kind !== 'cableskel' ? 12 : 0),
    push: (px, ms = 140) => tween(ta, { ox: (ta.ox || 0) + dir * px }, ms),
    weapon: (to, ms = 80, ease) => tween(a.ego, to, ms, ease),
    trail(pt, on = true) { CP.trailOn = on ? { a, pt } : null; CP.trailCol = col; },
    camKick(dx = 2, dy = 0) { const x = CB.cam.x, y = CB.cam.y; tween(CB.cam, { x: x + dx * dir, y: y + dy }, 40).then(() => tween(CB.cam, { x, y }, 220, easeOutBack)); },
    // a hit mark: lands its share of the damage with an impact of its power.
    // o.at: where the blow lands; o.react: how the body takes it.
    hit(o = {}) {
      if (hitN >= marks.length) return;
      refresh();
      if (o.at) mc.c = { x: o.at.x + dir * 2, y: o.at.y };
      const p = marks[hitN++];
      cum += p;
      const upTo = Math.round(total * cum / sum), roll = upTo - dealtSoFar;
      dealtSoFar = upTo;
      impactAt(mc, Math.min(4, p), o);
      c.camKick(1 + p * 0.6, o.camDy || 0);
      if (window._cineProbe) window._cineProbe.push({ w: w.id, u: U.id, n: hitN, at: Math.round((handW(a).x - c.front().x) * dir), tip: CP.trailOn ? Math.round((wpnW(a, ...CP.trailOn.pt).x - c.front().x) * dir) : null });
      if (roll > 0) {
        const dealt = resolveHit(T, roll, stats, U);
        dealtTotal += dealt || 0;
      }
      if (alive(T)) react(c, o.react || { kb: 3 + p * 2, tilt: 0.1 + p * 0.04 });
    },
    title(text, o = {}) { fx('title', o.x || 160, o.y || 48, o.ms || 1200, { text, col: o.col || col, size: o.size || 20, rot: o.rot || 0 }); },
    word(text, o = {}) { refresh(); fx('onoma', mc.c.x + (o.dx || 0) * dir, mc.c.y - 18 + (o.dy || 0), o.ms || 700, { text, col: o.col || col, size: o.size || 16, rot: o.rot }); },
    cam: (z, ms = 200, lead = 0) => camTo({ z, x: (a.x + (a.ox || 0) + ta.x + (ta.ox || 0)) / 2 + lead * dir, y: camY(U, T) }, ms),
  };
  refresh();
  const t0 = performance.now();
  cineReset();
  CP.floor = Math.max(a.y, ta.y) + 1;
  CB.cine = { w, col, stage: w.id, start: t0, cx: (a.x + ta.x) / 2, cy: mc.c.y, ids: [U.id, T.id] };
  fx('cineLayer', 0, 0, 60000);
  SFX.play(w.risk === 'ALEPH' ? 'aleph' : 'rare');
  // 1) the cut-in
  fx('cutin', 160, 0, 1900, { col, col2: script.band, kind: w.kind, name: w.name.toUpperCase(), risk: w.risk, abno: w.abno,
    who: U.name, look: { hat: U.hat, armless: U.armless, bandaged: U.bandaged }, pose: script.cutPose, rot: script.cutRot });
  c.cam(1.3, 300);
  await wait(1700);
  // 2) the action
  await c.cam(1.75, 300);
  await script.run(c);
  while (hitN < marks.length) c.hit({ quiet: 1 });   // never leave damage unlanded
  c.trail(null, false);
  // 3) the closing card, held so the whole finisher lasts at least 7 seconds
  CB.slowUntil = performance.now() + 700;
  fx('finale', 160, 0, 1700, { text: script.name || w.name.toUpperCase(), col, dmg: dealtTotal });
  SFX.play('rare');
  await wait(Math.max(1500, 7000 - 280 - (performance.now() - t0)));
  CB.cine.out = performance.now();
  tween(ta, { ox: 0, oy: 0, tilt: 0, sq: 0 }, 300, easeInOut);
  if (a.y !== y0) tween(a, { y: y0 }, 200);
  await wait(280);
  CB.cine = null;
  CB.fx = CB.fx.filter(f => f.type !== 'cineLayer');
  cineReset();
  ta.shake = false;
  if (!T.kind) { ta.pose = null; ta.poseMs = null; }
  a.ego = null;
  a.face = U.team === 'ally' ? 1 : -1;
  await settleMove(U);
}

// ---------------------------------------------------------------------
//  The finishers
// ---------------------------------------------------------------------
function refreshC(c) { c.mc.c = chest(c.T); c.mc.h = handOf(c.U, c.dir); c.mc.f = feet(c.T); }

const SODA = ['#4ad8ff', '#c8f8ff', '#ffffff', '#7af0c0'];
const ELEC = '#8ae8ff', CRT = '#5affb0';
const GLASS = ['#c8fff0', '#8ad8c0', '#ffffff', '#3a5a50'];
// soda bursting out of a hit point
function sodaBurst(c, at, big) {
  debris('drop', at.x, at.y, big ? 30 : 12, { angle: away(c, 0.7), spread: 1.8, speed: big ? 3.4 : 2.4, cols: SODA, size: 1.6, g: 0.16 });
  debris('foam', at.x, at.y, big ? 14 : 5, { angle: away(c, 1), spread: 2.4, speed: 0.9, cols: SODA, size: 1.6, life: 70, jx: 6, jy: 6 });
  fx('ring2', at.x, at.y, 300, { r: big ? 22 : 11, col: '#4ad8ff' });
  light(at.x, at.y, big ? 30 : 16, big ? 30 : 16, '#4ad8ff', 0.5, 3);
  if (big) decal('puddle', at.x + c.dir * 6, CP.floor, { col: '#2a9ac0', r: 16, grow: 500 });
}
// a soda-pressure muzzle blast: cone of spray and a ring of foam
function sodaMuzzle(c) {
  const m = wpnW(c.a, ...WP.muzzle);
  fx('muzzle', m.x, m.y, 110, { dir: c.dir });
  debris('drop', m.x, m.y, 8, { angle: c.dir > 0 ? 0 : Math.PI, spread: 0.6, speed: 3.6, cols: SODA, size: 1.2, g: 0.08, life: 30 });
  debris('foam', m.x, m.y, 4, { angle: c.dir > 0 ? -0.4 : Math.PI + 0.4, spread: 1, speed: 0.6, cols: SODA, size: 1.4, life: 50 });
  light(m.x, m.y, 14, 14, '#c8f8ff', 0.6, 2);
  SFX.play('gunshot');
  return m;
}
// electricity crawling over the target for a while
function crawl(c, ms, n = 2) {
  const end = performance.now() + ms;
  const tick = () => {
    if (performance.now() > end || !CB.cine) return;
    const f = c.front(0.2 + Math.random() * 0.7), x = c.ta.x + (c.ta.ox || 0) + (Math.random() - 0.5) * c.half * 1.6;
    for (let i = 0; i < n; i++) fx('bolt', 0, 0, 90, { x0: x, y0: f.y, x1: x + (Math.random() - 0.5) * 14, y1: f.y + (Math.random() - 0.5) * 12, col: ELEC });
    if (Math.random() < 0.4) debris('spark', x, f.y, 2, { spread: 3, speed: 1.6, col: ELEC, bounce: 0.5, life: 40 });
    setTimeout(tick, 60);
  };
  tick();
}
function zap(c, at, n, reach = 18) {
  for (let i = 0; i < n; i++) {
    const an = Math.random() * TAU, r = reach * (0.6 + Math.random() * 0.6);
    fx('bolt', 0, 0, 160 + i * 25, { x0: at.x, y0: at.y, x1: at.x + Math.cos(an) * r, y1: at.y + Math.sin(an) * r * 0.8, col: ELEC });
  }
  debris('spark', at.x, at.y, 4 + n, { angle: away(c, 0.8), spread: 2.6, speed: 2.6, cols: [ELEC, '#ffffff'], bounce: 0.5, life: 50 });
  light(at.x, at.y, 14 + n, 14 + n, ELEC, 0.22, 3);
  SFX.play('spark');
}
// a charge-up beat: the weapon comes alive in the hand
async function chargeUp(c, style, ms = 900, pose = 'coil') {
  await c.f({ pose, tilt: -0.08, ms: 160 });
  const end = performance.now() + ms;
  let i = 0;
  while (performance.now() < end) {
    const h = handW(c.a);
    if (style === 'soda') {
      c.a.ego.rot = Math.sin(i * 1.3) * 0.35;                       // shaking the soda gun
      const t = wpnW(c.a, -2, -6);
      debris('foam', t.x, t.y, 1, { angle: -Math.PI / 2, spread: 0.8, speed: 0.6, cols: SODA, size: 1.4, life: 60 });
      if (i % 5 === 0) SFX.play('whoosh');
    } else if (style === 'elec') {
      if (CP.rope) { CP.rope.charge = 1; const p = CP.rope.pts[Math.floor(Math.random() * CP.rope.n)]; if (i % 2 === 0) debris('spark', p.x, p.y, 1, { speed: 1, col: ELEC, bounce: 0.5, life: 30 }); }
      else fx('bolt', 0, 0, 120, { x0: h.x, y0: h.y - 4, x1: h.x + (Math.random() - 0.5) * 22, y1: h.y + 6 + Math.random() * 10, col: ELEC });
      if (i % 3 === 0) SFX.play('spark');
    } else {
      const e = wpnW(c.a, ...WP.axeHead);
      if (i % 2 === 0) debris('px', e.x, e.y, 1, { speed: 0.6, cols: [CRT, '#1a5a3a'], size: 1, life: 30, g: 0.05 });
      if (i % 4 === 0) fx('ring2', e.x, e.y, 300, { r: 8, col: CRT });
      if (i % 5 === 0) SFX.play('scrape');
    }
    c.a.sq = i % 2 ? 0.025 : -0.015;
    i++;
    await c.wait(70);
  }
  c.a.sq = 0;
}

// Finishers: FINISHERS['weapon:unit'] first, then FINISHERS[weapon], then _default.
// marks: the power of each hit mark run() calls; the damage is shared out in
// proportion to them, so a big blow deals more than a quick tap.
const FINISHERS = {
  // any other weapon: a strong three-hit combo
  _default: { marks: [2, 2, 3], async run(c) {
    await c.f({ pose: 'cock', x: c.at('cock', 10), tilt: -0.14, ms: 120, sfx: 'whoosh' });
    await c.f({ pose: 'cross', x: c.at('cross', 2), tilt: 0.14, ms: 30, ghost: 3, hit: true }); c.hit();
    await c.f({ pose: 'spin', x: c.at('spin', 6), ms: 60, ghost: 2 });
    await c.f({ pose: 'slashUp', x: c.at('slashUp', 2), y: -6, ms: 30, ghost: 3, hit: true }); c.hit();
    await c.f({ pose: 'smash', x: c.at('smash', 2), y: 0, sq: 0.14, ms: 30, ghost: 3, hit: true }); c.hit({ react: { kb: 14, tilt: 0.3 } });
    await c.wait(160);
  } },

  // ================= PISTOLA DE SODA =================
  // Lobelto: shakes the can-gun, walks in, a butt-strike knocks the enemy
  // back, the gun twirls round his finger, a long aim and one shot to the torso
  'soda:lobelto': { col: '#4ad8ff', band: '#0a3a4a', name: 'CULATAZO EFERVESCENTE', marks: [2, 4], async run(c) {
    const a = c.a;
    await chargeUp(c, 'soda', 700, 'hold');
    a.ego.rot = 0;
    // two determined steps in
    await c.f({ pose: 'run', x: c.at('butWind', 18) * 0.5, tilt: 0.1, ms: 110 }); dust(c.U, 3, c.dir);
    await c.f({ pose: 'run', x: c.at('butWind', 6), tilt: 0.12, ms: 100 }); dust(c.U, 3, c.dir);
    // wind back, butt turned forward
    c.weapon({ rot: -2.3 }, 160, easeInOut);
    await c.f({ pose: 'butWind', x: c.at('butWind', 8), tilt: -0.16, sq: -0.04, ms: 150, sfx: 'whoosh' });
    c.trail(WP.butt);
    c.weapon({ rot: -1.5 }, 60, easeIn);
    await c.f({ pose: 'butt', x: c.at('butt', 4), tilt: 0.2, sq: 0.05, ms: 30, ghost: 2, hit: true, stop: 100 });
    c.trail(null, false);
    { const at = wpnW(a, ...WP.butt);
      c.hit({ at, sfx: 'blunt', react: { kb: 26, up: 3, tilt: 0.34 } });
      debris('px', at.x, at.y, 8, { angle: away(c, 0.6), speed: 2.4, cols: ['#d8e4ec', '#9aaab8', '#ffffff'], size: 1.4, bounce: 0.45 });
      debris('foam', at.x, at.y, 6, { angle: away(c, 1), speed: 1, cols: SODA, size: 1.4, life: 60 }); }
    c.word('¡CLONK!', { size: 14 });
    // follow-through, a step back and the gun spun round the finger
    await c.f({ pose: 'follow', x: c.at('butt', 4) - 2, tilt: 0.04, ms: 90 });
    a.ego.rot = -1.5;
    tween(a.ego, { rot: Math.PI * 2 }, 360, easeOut).then(() => { a.ego.rot = 0; });
    SFX.play('whoosh');
    await c.f({ pose: 'hold', x: c.at('aim', 22), tilt: -0.05, ms: 150 }); dust(c.U, 2, -c.dir);
    // the aim: camera pushes in, foam drips from the nozzle, the trigger clicks
    await c.cam(2.05, 300, 6);
    fx('focus', 160, 0, 900, { cy: 60, col: '#4ad8ff' });
    await c.f({ pose: 'aim', x: c.at('aim', 22), tilt: 0, ms: 260 });
    for (let i = 0; i < 6; i++) { const m = wpnW(a, ...WP.muzzle); debris('drop', m.x, m.y, 1, { angle: Math.PI / 2, spread: 0.3, speed: 0.3, cols: SODA, size: 1, g: 0.12 }); await c.wait(60); }
    SFX.play('gun_click');
    await c.wait(180);
    // the shot: recoil kicks the barrel up, a jet of soda punches the torso
    c.weapon({ rot: -0.55 }, 40, easeOut).then(() => c.weapon({ rot: 0 }, 260, easeOutBack));
    const m = sodaMuzzle(c);
    const at = c.front(0.55);
    fx('beam', 0, 0, 380, { x0: m.x, x1: at.x, y: (m.y + at.y) / 2, w: 5, col: '#4ad8ff' });
    await c.f({ pose: 'kickback', x: c.at('aim', 22) - 6, tilt: -0.14, ms: 40, hit: true, stop: 120 });
    c.hit({ at, sfx: 'pierce', camDy: -1, react: { kb: 18, up: 2, tilt: 0.3 } });
    sodaBurst(c, at, true);
    debris('tab', at.x, at.y, 3, { angle: away(c, 1.2), speed: 2.6, bounce: 0.5, life: 120 });
    c.word('¡FSSSHH!', { size: 18, col: '#c8f8ff' });
    await c.f({ pose: 'aim', x: c.at('aim', 22) - 4, tilt: 0, ms: 200 });
    // lowers the gun; the nozzle keeps fizzing
    c.weapon({ rot: 0.5 }, 300, easeInOut);
    for (let i = 0; i < 8; i++) { const n = wpnW(a, ...WP.muzzle); debris('foam', n.x, n.y, 1, { speed: 0.4, cols: SODA, size: 1.2, life: 60 }); await c.wait(50); }
    await c.f({ pose: 'hold', x: c.at('aim', 22) - 4, ms: 160 });
  } },

  // Gonza: a back-flip away, shakes and racks the gun, a fizzing sight
  // settles on the torso, four quick shots, a twirl
  'soda:gonza': { col: '#4ad8ff', band: '#0a3a4a', name: 'CUATRO BURBUJAS', cutPose: 'aim', marks: [1, 1, 1, 2], async run(c) {
    const a = c.a;
    // back-flip out of range
    await c.f({ pose: 'coil', x: 2, ms: 80 });
    tween(a, { tilt: -c.dir * 6.28 }, 380, easeInOut).then(() => { a.tilt = 0; });
    await c.f({ pose: 'air', x: -22, y: -16, ms: 120, sfx: 'whoosh' });
    await c.f({ pose: 'air', x: -38, y: -6, ms: 90 });
    await c.f({ pose: 'land', x: -42, y: 0, sq: 0.12, ms: 60 }); dust(c.U, 7, -c.dir); SFX.play('blunt');
    a.tilt = 0;
    await c.f({ pose: 'hold', x: -42, sq: 0, ms: 100 });
    await chargeUp(c, 'soda', 600, 'hold');
    a.ego.rot = 0;
    SFX.play('gun_click');
    debris('tab', handW(a).x, handW(a).y - 4, 1, { angle: -Math.PI / 2 - c.dir * 0.5, speed: 1.8, bounce: 0.5, life: 120 });
    await c.cam(1.45, 260);
    await c.f({ pose: 'aim', x: -42, tilt: 0, ms: 200 });
    // the sight line settles on the torso
    const sightEnd = performance.now() + 700;
    fx('sight', 0, 0, 760, { col: '#4ad8ff', get: () => ({ m: wpnW(a, ...WP.muzzle), t: c.front(0.55) }) });
    while (performance.now() < sightEnd) await c.wait(50);
    fx('focus', 160, 0, 900, { cy: 60, col: '#4ad8ff' });
    for (let i = 0; i < 4; i++) {
      const last = i === 3, m = sodaMuzzle(c), at = c.front(0.5 + (i % 2 ? 0.08 : -0.04));
      fx('sodaShot', 0, 0, 70, { x0: m.x, y0: m.y, x1: at.x, y1: at.y });
      c.weapon({ rot: -0.4 }, 30, easeOut).then(() => c.weapon({ rot: 0 }, 120));
      debris('tab', m.x - c.dir * 6, m.y - 2, 1, { angle: -Math.PI / 2 - c.dir * 0.7, speed: 1.8, bounce: 0.5, life: 110 });
      await c.f({ pose: 'kickback', x: -44, tilt: -0.06, ms: last ? 34 : 22, hit: true, stop: last ? 90 : 26 });
      c.hit({ at, sfx: 'pierce', react: last ? { kb: 16, up: 2, tilt: 0.3 } : { kb: 5, tilt: 0.12 } });
      sodaBurst(c, at, last);
      c.word(['¡PAM!', '¡PAM!', '¡PAM!', '¡PAAM!'][i], { dx: (i - 1.5) * 6, dy: -i * 3, size: 12 + i * 2, ms: 500 });
      await c.f({ pose: 'aim', x: -42, ms: last ? 60 : 30 });
    }
    // twirl and lower
    tween(a.ego, { rot: Math.PI * 2 }, 420, easeOut).then(() => { a.ego.rot = 0; });
    SFX.play('whoosh');
    await c.f({ pose: 'hold', x: -42, ms: 260 });
    for (let i = 0; i < 5; i++) { const n = wpnW(a, ...WP.muzzle); debris('foam', n.x, n.y, 1, { speed: 0.4, cols: SODA, size: 1.2, life: 60 }); await c.wait(60); }
  } },

  // ================= LÁTIGO ELECTRIFICADO =================
  // Lobelto: one hand on the insulated grip; cracks it on the floor, then
  // three lashes, each landing a discharge, the last one overhead
  'latigo:lobelto': { col: ELEC, band: '#101a3a', name: 'AZOTE DE ALTO VOLTAJE', cutPose: 'flail', marks: [2, 2, 4], async run(c) {
    const a = c.a;
    a.ego.hidden = true;
    ropeInit(a);
    await chargeUp(c, 'elec', 700, 'hold');
    // a warning crack on the floor in front of him
    CP.rope.ctrl = { mode: 'lash', t0: performance.now(), ms: 240, amp: 8, get: () => ({ x: a.x + (a.ox || 0) + c.dir * 30, y: CP.floor }) };
    await c.f({ pose: 'flail2', tilt: 0.1, ms: 60, sfx: 'whoosh' });
    await c.wait(140);
    { const t = ropeTip(); zap(c, t, 3, 10); decal('scorch', t.x, CP.floor, { r: 7, col: ELEC }); SFX.play('stagger'); }
    await c.f({ pose: 'hold', tilt: 0, ms: 160 });
    const X = c.at('flail2', 30);
    await c.f({ pose: 'run', x: X * 0.6, tilt: 0.1, ms: 110 }); dust(c.U, 3, c.dir);
    await c.f({ pose: 'run', x: X, tilt: 0.1, ms: 100 }); dust(c.U, 3, c.dir);
    const heights = [0.62, 0.35, 0.8];
    for (let i = 0; i < 3; i++) {
      const last = i === 2;
      // wind: the rope trails behind by itself
      await c.f({ pose: last ? 'overhead' : 'flail', x: X - 3, tilt: -0.16, sq: -0.03, ms: last ? 170 : 110 - i * 15, sfx: 'whoosh' });
      const tgt = () => c.front(heights[i]);
      CP.rope.ctrl = { mode: 'lash', t0: performance.now(), ms: 230, amp: last ? 14 : 10, get: () => { const t = tgt(); return { x: t.x + c.dir * 4, y: t.y }; } };
      await c.f({ pose: last ? 'smash' : 'flail2', x: X + 2, tilt: 0.16, sq: 0.03, ms: 30, ghost: 2 });
      await c.wait(last ? 120 : 100);
      const at = tgt();
      c.hit({ at, sfx: 'slash', react: last ? { kb: 18, up: 3, tilt: 0.34 } : { kb: 6, tilt: 0.18 } });
      zap(c, at, last ? 8 : 3, last ? 26 : 14);
      crawl(c, last ? 700 : 260, last ? 3 : 1);
      if (last) { decal('scorch', at.x, CP.floor, { r: 14, col: ELEC }); debris('smoke', at.x, at.y, 6, { speed: 0.5, col: '#3a3a48', size: 3, life: 90 }); fx('focus', 160, 0, 420, { cy: 60, col: ELEC }); }
      c.word(['¡CHAS!', '¡ZZT!', '¡¡KRZZZT!!'][i], { dy: -i * 4, size: last ? 18 : 13, col: last ? '#ffffff' : ELEC });
      await c.wait(last ? 160 : 90);
    }
    // the whip falls slack, still crackling
    CP.rope.charge = 2;
    await c.f({ pose: 'hold', x: X - 6, tilt: -0.04, ms: 220 });
    CP.rope.charge = 1;
    await c.wait(260);
  } },

  // Gonza: two hands on the whip; throws it round the enemy, runs a full
  // circle round it winding it tight, pulls, and lets one discharge go
  'latigo:gonza': { col: ELEC, band: '#101a3a', name: 'JAULA ELÉCTRICA', marks: [5], async run(c) {
    const a = c.a, ta = c.ta, y0 = a.y;
    a.ego.hidden = true;
    ropeInit(a, 22);
    await chargeUp(c, 'elec', 600, 'ready');
    const ctr = () => { const f = c.front(0.5); return { x: ta.x + (ta.ox || 0), y: f.y }; };
    // the throw: the end lashes out and starts coiling round
    CP.rope.ctrl = { mode: 'lash', t0: performance.now(), ms: 220, amp: 10, get: () => c.front(0.5) };
    await c.f({ pose: 'flail2', x: 4, tilt: 0.14, ms: 40, sfx: 'whoosh' });
    await c.wait(160);
    const H = (c.T.kind ? (c.T.height || 60) * (c.T.scale || 1) : 30) * 0.8;
    CP.rope.ctrl = { mode: 'wrap', t0: performance.now(), ms: 1, phase: 0, spin: 1, rx: c.half + 3, h: H * 0.3, get: ctr };
    SFX.play('scrape');
    // a full lap round the enemy: behind it (drawn behind), then in front
    CB.cine.front = false;
    const cx = c.raw(), R = c.half + 22;
    const steps = 10;
    for (let k = 1; k <= steps; k++) {
      const th = Math.PI + (k / steps) * Math.PI * 2;          // starts on the near side
      const x = cx + Math.cos(th) * R, depth = Math.sin(th);
      a.face = (Math.sin(th) < 0 ? 1 : -1) * c.dir;              // facing the way it runs
      tween(a, { y: y0 + depth * 7 }, 70);
      await c.f({ pose: 'run', x, ms: 44, ghost: 2 });
      if (k % 2 === 0) dust(c.U, 2, a.face);
      CP.rope.ctrl.h = H * (0.3 + 0.7 * k / steps);              // the coil grows down the body
    }
    CB.cine.front = true;
    a.face = c.dir;
    tween(a, { y: y0 }, 120);
    // pull it tight: the coil squeezes the body
    CP.rope.ctrl.spin = 0.15;
    await c.f({ pose: 'brace', x: c.at('brace', 34), tilt: -0.2, sq: 0.05, ms: 160 });
    tween(ta, { sq: 0.08 }, 160);
    c.word('...', { size: 12, col: '#ffffff' });
    for (let i = 0; i < 3; i++) { CP.rope.charge = i + 1; const p = CP.rope.pts[3 + i * 5]; zap(c, p, 1, 8); await c.wait(140); }
    await c.cam(2.0, 160);
    fx('focus', 160, 0, 700, { cy: 60, col: ELEC });
    // the discharge
    CP.rope.charge = 4;
    await c.f({ pose: 'slam', x: c.at('brace', 34) - 2, tilt: -0.24, sq: 0.08, ms: 40, hit: true, stop: 120 });
    const at = ctr();
    c.hit({ at, sfx: 'spark', react: { kb: 4, up: 2, tilt: 0.12 } });
    zap(c, at, 14, 34);
    crawl(c, 900, 3);
    for (let i = 0; i < 5; i++) fx('bolt', 0, 0, 260, { x0: at.x + (i - 2) * 14, y0: 0, x1: at.x + (i - 2) * 3, y1: at.y, col: ELEC });
    G.flash = { color: ELEC, start: performance.now(), ms: 120, a: 0.28 };
    decal('scorch', at.x, CP.floor, { r: 18, col: ELEC });
    debris('smoke', at.x, at.y, 10, { speed: 0.6, col: '#3a3a48', size: 3, life: 110, jx: 10, jy: 16 });
    c.word('¡¡ZZZZAAP!!', { size: 20, col: '#ffffff' });
    await c.wait(380);
    // lets go: the whip unwinds and drops
    tween(ta, { sq: 0 }, 300, springEase);
    CP.rope.ctrl = null; CP.rope.charge = 1;
    await c.f({ pose: 'hold', x: c.at('brace', 34) - 6, tilt: 0, sq: 0, ms: 220 });
    await c.wait(200);
  } },

  // ================= HACHA DE BATALLA DE PANTALLA =================
  // Lobelto: the axe is so heavy he drags it, scraping sparks off the floor;
  // he heaves it overhead, jumps and splits the enemy with one vertical cut.
  // The axe sticks in the floor and he wrenches it free.
  'hacha:lobelto': { col: CRT, band: '#06261a', name: 'SEÑAL CORTADA', cutPose: 'overhead', marks: [6], async run(c) {
    const a = c.a;
    a.ego.rot = 2.5;                                            // head resting on the floor behind him
    await c.f({ pose: 'brace', tilt: 0.08, ms: 160 });
    const X = c.at('smash', 10);
    // dragging it: sparks and a groove behind every step
    for (let k = 1; k <= 3; k++) {
      await c.f({ pose: k % 2 ? 'run' : 'brace', x: X * (k / 3) - 8, tilt: 0.16, ms: 150 });
      const e = wpnW(a, ...WP.axeEdge);
      debris('spark', e.x, CP.floor, 6, { angle: c.dir > 0 ? Math.PI + 0.6 : -0.6, spread: 1.2, speed: 2, cols: ['#ffd060', '#ffffff', CRT], bounce: 0.5, life: 40 });
      decal('gouge', e.x - c.dir * 6, CP.floor, { r: 7, col: '#ffd060', seed: k * 7 });
      SFX.play('scrape');
    }
    // heaving it up: slow, with effort, the screen flickering
    c.weapon({ rot: -0.5 }, 520, easeInOut);
    await c.f({ pose: 'overhead', x: X - 10, tilt: -0.2, sq: -0.06, ms: 330 });
    await chargeUp(c, 'crt', 450, 'overhead');
    a.ego.rot = -0.5;
    await c.cam(2.1, 220, 4);
    // the jump
    await c.f({ pose: 'air', x: X - 6, y: -14, tilt: -0.1, ms: 100, sfx: 'whoosh' });
    CB.slowUntil = performance.now() + 160;
    // the chop
    c.trail(WP.axeEdge);
    c.weapon({ rot: 2.7 }, 70, easeIn);
    await c.f({ pose: 'smash', x: X, y: 0, sq: 0.22, tilt: 0.22, ms: 30, ghost: 4, hit: true, stop: 130 });
    c.trail(null, false);
    const at = c.front(0.5);
    fx('tear', 0, 0, 800, { x0: at.x + c.dir * 3, y0: at.y - 30, x1: at.x + c.dir * 5, y1: CP.floor + 2, col: CRT });
    slam()(c.mc);
    c.hit({ at, sfx: 'blunt', camDy: 3, react: { kb: 8, tilt: 0.12 } });
    tween(c.ta, { oy: 3, sq: 0.18 }, 50).then(() => tween(c.ta, { oy: 0, sq: 0 }, 420, springEase));
    debris('shard', at.x, at.y - 6, 14, { angle: -Math.PI / 2, spread: 2.6, speed: 2.8, cols: GLASS, size: 1.6, bounce: 0.4, life: 110 });
    debris('px', at.x, at.y, 12, { angle: away(c, 0.9), spread: 2, speed: 2.2, cols: [CRT, '#1a5a3a', '#ffffff'], size: 1.4, bounce: 0.4, life: 90 });
    decal('gouge', at.x, CP.floor, { r: 16, col: CRT, seed: 3 });
    c.word('¡¡KRAAK!!', { size: 20, col: '#ffffff', dy: -10 });
    fx('focus', 160, 0, 500, { cy: 60, col: CRT });
    // stuck in the floor, fizzing; wrenched free
    for (let i = 0; i < 6; i++) { const e = wpnW(a, ...WP.axeHead); debris('spark', e.x, e.y, 1, { speed: 1.2, cols: [CRT, '#ffffff'], bounce: 0.5, life: 30 }); await c.wait(60); }
    c.weapon({ rot: 2.4 }, 80);
    await c.f({ pose: 'brace', x: X - 4, tilt: -0.12, ms: 120 });
    { const e = wpnW(a, ...WP.axeEdge); debris('px', e.x, CP.floor, 6, { speed: 1.6, cols: ['#3a3a42', '#5a5a66'], size: 1.2 }); SFX.play('scrape'); }
    c.weapon({ rot: 0.8 }, 260, easeOutBack);
    await c.f({ pose: 'hold', x: X - 8, tilt: 0, ms: 180 });
  } },

  // Gonza: both hands on the haft; spins, faster every turn, the screen-head
  // biting on each pass; the last turn launches the enemy, then he wobbles
  'hacha:gonza': { col: CRT, band: '#06261a', name: 'TORBELLINO CATÓDICO', cutPose: 'spin', marks: [1, 1, 1, 2, 2, 4], async run(c) {
    const a = c.a;
    await chargeUp(c, 'crt', 600, 'brace');
    a.ego.rot = 1.2;
    const X = c.at('sweep', 12);
    await c.f({ pose: 'run', x: X - 4, tilt: 0.1, ms: 110 }); dust(c.U, 3, c.dir);
    c.trail(WP.axeEdge);
    let ms = 130;
    for (let i = 0; i < 6; i++) {
      const last = i === 5;
      // back half of the turn: axe swings behind
      a.face = -c.dir;
      c.weapon({ rot: -1.4 }, ms * 1.4, easeInOut);
      await c.f({ pose: 'spin', x: c.at('sweep', 9), ms, ghost: i > 1 ? 3 : 1, sfx: 'whoosh' });
      // front half: it comes round into the target
      a.face = c.dir;
      c.weapon({ rot: last ? -1.2 : 1.8 }, 40, easeIn);
      await c.f({ pose: last ? 'slashUp' : 'sweep', x: c.at(last ? 'slashUp' : 'sweep', 5), y: last ? -4 : 0, ms: Math.max(16, ms * 0.35), hit: true, stop: last ? 120 : 22 });
      const at = c.front(last ? 0.6 : 0.45 + (i % 2) * 0.1);
      c.hit({ at, sfx: 'slash', camDy: last ? -2 : 0, react: last ? { kb: 18, up: 12, tilt: 0.4 } : { kb: 4 + i, tilt: 0.12 } });
      debris('shard', at.x, at.y, last ? 10 : 3, { angle: away(c, last ? 1.2 : 0.4), speed: 2.4, cols: GLASS, size: 1.3, bounce: 0.4, life: 90 });
      debris('px', at.x, at.y, last ? 8 : 3, { angle: away(c, 0.6), speed: 2, cols: [CRT, '#ffffff'], size: 1.2, bounce: 0.4, life: 70 });
      fx('ring2', a.x + (a.ox || 0), CP.floor - 1, 220, { r: 12 + i * 2, col: CRT, sy: 0.3 });
      if (i >= 2) dust(c.U, 2 + i, -c.dir);
      if (i === 3) fx('speed', 160, 0, 700, { dir: c.dir, seed: 3 });
      ms *= 0.72;
    }
    c.trail(null, false);
    c.word('¡¡TORBELLINO!!', { size: 18, col: '#ffffff' });
    decal('gouge', a.x + (a.ox || 0), CP.floor, { r: 12, col: CRT, seed: 9 });
    // dizzy: he wobbles before finding his feet
    await c.f({ pose: 'hold', x: c.at('sweep', 14), ms: 120 });
    tween(a, { tilt: 0.25 }, 140).then(() => tween(a, { tilt: 0 }, 700, springEase));
    await c.wait(500);
  } },
};

// a dotted aiming line, fizzing (world)
FX_DRAW.sight = (f, k) => {
  const g = f.get(), n = 14;
  for (let i = 0; i < n; i++) {
    if ((i + Math.floor(k * 20)) % 2) continue;
    const q = i / n, x = g.m.x + (g.t.x - g.m.x) * q, y = g.m.y + (g.t.y - g.m.y) * q;
    px(x, y, f.col);
  }
  const r = 5 - Math.min(3, k * 6);
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = f.col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(g.t.x, g.t.y, r, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 1;
};
// a pressurized soda pellet in flight
FX_DRAW.sodaShot = (f, k) => {
  const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k;
  line(f.x0 + (f.x1 - f.x0) * Math.max(0, k - 0.3), f.y0 + (f.y1 - f.y0) * Math.max(0, k - 0.3), x, y, '#4ad8ff', 2);
  disc(x, y, 2, '#c8f8ff');
};
