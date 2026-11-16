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
  const c = {
    U, T, a, ta, w, col, dir, mc,
    f: (fr) => playFrame(U, a, fr, base, mc),
    wait,
    // distance from the attacker's start to the target
    // (big monsters count as closer, so nobody ends up inside them)
    gap: () => Math.abs((ta.x + (ta.ox || 0)) - (a.x + base)) - (T.kind && T.kind !== 'cableskel' ? 12 : 0),
    // knock the target back (or toward) by px
    push: (px, ms = 140) => tween(ta, { ox: (ta.ox || 0) + dir * px }, ms),
    // tween the held weapon (rot) or the holder's depth
    weapon: (to, ms = 80) => tween(a.ego, to, ms),
    // a hit mark: lands its share of the damage with an impact of its power
    hit(o = {}) {
      if (hitN >= marks.length) return;
      refresh();
      const p = marks[hitN++];
      cum += p;
      const upTo = Math.round(total * cum / sum), roll = upTo - dealtSoFar;
      dealtSoFar = upTo;
      impactAt(mc, Math.min(4, p), o);
      if (roll > 0) {
        const dealt = resolveHit(T, roll, stats, U);
        dealtTotal += dealt || 0;
        if (dealt && alive(T)) recoilAnim(T, U, dealt);
      } else if (alive(T)) { ta.flashUntil = performance.now() + 70; }
    },
    title(text, o = {}) { fx('title', o.x || 160, o.y || 48, o.ms || 1200, { text, col: o.col || col, size: o.size || 20, rot: o.rot || 0 }); },
    word(text, o = {}) { refresh(); fx('onoma', mc.c.x + (o.dx || 0) * dir, mc.c.y - 18 + (o.dy || 0), o.ms || 700, { text, col: o.col || col, size: o.size || 16, rot: o.rot }); },
    cam: (z, ms = 200) => camTo({ z, x: (a.x + (a.ox || 0) + ta.x + (ta.ox || 0)) / 2, y: camY(U, T) }, ms),
  };
  refresh();
  const t0 = performance.now();
  CB.cine = { w, col, stage: w.id, start: t0, cx: (a.x + ta.x) / 2, cy: mc.c.y, ids: [U.id, T.id] };
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
  // 3) the closing card, held so the whole finisher lasts at least 7 seconds
  CB.slowUntil = performance.now() + 700;
  fx('finale', 160, 0, 1700, { text: script.name || w.name.toUpperCase(), col, dmg: dealtTotal });
  SFX.play('rare');
  await wait(Math.max(1500, 7000 - 280 - (performance.now() - t0)));
  CB.cine.out = performance.now();
  if (ta.ox) tween(ta, { ox: 0 }, 260);
  if (a.y !== y0) tween(a, { y: y0 }, 200);
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

// ---- helpers shared by the finishers
const SODA = ['#4ad8ff', '#c8f8ff', '#ffffff', '#7af0c0'];
const ELEC = '#8ae8ff', CRT = '#5affb0';
function sodaSplash(c, big) {
  refreshC(c);
  const { x, y } = c.mc.c;
  particles(x, y, big ? 22 : 10, SODA, big ? 2.4 : 1.6, 0.1, 30);
  fx('ring2', x, y, 300, { r: big ? 22 : 12, col: '#4ad8ff' });
  for (let i = 0; i < (big ? 6 : 3); i++) CB.parts.push({ x, y, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 1.5, g: -0.02, life: 40, max: 40, col: '#c8f8ff' });
}
function zap(c, n, reach = 18) {
  refreshC(c);
  const { x, y } = c.mc.c;
  for (let i = 0; i < n; i++) {
    const an = Math.random() * TAU, r = reach * (0.6 + Math.random() * 0.6);
    fx('bolt', 0, 0, 160 + i * 25, { x0: x, y0: y, x1: x + Math.cos(an) * r, y1: y + Math.sin(an) * r * 0.8, col: ELEC });
  }
  sparks(x, y, 4 + n, [ELEC, '#ffffff'], c.dir, 2.4);
  light(x, y, 20 + n * 2, 20 + n * 2, ELEC, 0.35, 3);
  SFX.play('spark');
}
const handNow = (c) => handOf(c.U, c.dir);
// a charge-up beat before the action: the weapon comes alive in the hand
async function chargeUp(c, style, ms = 900, pose = 'coil') {
  await c.f({ pose, tilt: -0.08, ms: 160 });
  const end = performance.now() + ms;
  let i = 0;
  while (performance.now() < end) {
    const h = handNow(c);
    if (style === 'soda') {
      CB.parts.push({ x: h.x + (Math.random() - 0.5) * 6, y: h.y - 4, vx: (Math.random() - 0.5) * 0.6, vy: -0.8 - Math.random(), g: -0.01, life: 34, max: 34, col: SODA[i % 4] });
      if (i % 4 === 0) fx('ring2', h.x, h.y - 4, 260, { r: 8, col: '#4ad8ff' });
      if (i % 6 === 0) SFX.play('whoosh');
    } else if (style === 'elec') {
      fx('bolt', 0, 0, 120, { x0: h.x, y0: h.y - 4, x1: h.x + (Math.random() - 0.5) * 22, y1: h.y + 6 + Math.random() * 10, col: ELEC });
      if (i % 3 === 0) SFX.play('spark');
    } else {
      sparks(h.x, h.y - 8, 2, [CRT, '#ffffff'], -c.dir, 1.2);
      if (i % 4 === 0) fx('ring2', h.x, h.y - 8, 300, { r: 10, col: CRT });
      if (i % 5 === 0) SFX.play('scrape');
    }
    c.a.sq = i % 2 ? 0.03 : -0.02;
    i++;
    await c.wait(70);
  }
  c.a.sq = 0;
  light(handNow(c).x, handNow(c).y, 30, 30, c.col, 0.5, 3);
}

// Finishers: FINISHERS['weapon:unit'] first, then FINISHERS[weapon], then _default.
// marks: the power of each hit mark run() calls; the damage is shared out in
// proportion to them, so a big blow deals more than a quick tap.
const FINISHERS = {
  // any other weapon: a strong three-hit combo
  _default: { marks: [2, 2, 3], async run(c) {
    await c.f({ pose: 'cock', x: -4, tilt: -0.14, ms: 120, sfx: 'whoosh' });
    await c.f({ pose: 'cross', x: 16, tilt: 0.14, ms: 30, ghost: 3, hit: true }); c.hit();
    await c.f({ pose: 'spin', x: 18, ms: 60, ghost: 2 });
    await c.f({ pose: 'slashUp', x: 20, y: -6, ms: 30, ghost: 3, hit: true }); c.hit();
    await c.f({ pose: 'smash', x: 22, y: 0, sq: 0.14, ms: 30, ghost: 3, hit: true }); c.hit();
    await c.wait(160);
  } },

  // ---------------- PISTOLA DE SODA ----------------
  // Lobelto: a pistol-whip with the butt knocks the enemy back, then one shot to the middle of the torso
  'soda:lobelto': { col: '#4ad8ff', band: '#0a3a4a', name: 'CULATAZO EFERVESCENTE', marks: [2, 4], async run(c) {
    const g = c.gap();
    await chargeUp(c, 'soda', 900);
    await c.f({ pose: 'run', x: g - 16, tilt: 0.12, ms: 90, ghost: 2, sfx: 'whoosh' });
    c.weapon({ rot: -1.2 }, 90);
    await c.f({ pose: 'butWind', x: g - 18, tilt: -0.12, ms: 130 });
    c.weapon({ rot: 1.6 }, 50);
    await c.f({ pose: 'butt', x: g - 11, tilt: 0.18, ms: 30, ghost: 3, hit: true, stop: 90 });
    c.hit({ sfx: 'blunt' }); c.word('¡CLONK!', { size: 14 });
    c.push(30, 220);
    c.weapon({ rot: 0 }, 120);
    // a step back to open the distance, the gun coming up to the middle of the torso
    await c.f({ pose: 'hold', x: g - 30, tilt: -0.06, ms: 120 });
    await c.cam(2.0, 220);
    fx('focus', 160, 0, 700, { cy: 60, col: '#4ad8ff' });
    await c.f({ pose: 'aim', x: g - 30, tilt: 0, ms: 300 });
    SFX.play('gun_click');
    await c.wait(260);
    await c.f({ pose: 'kickback', x: g - 35, tilt: -0.1, ms: 40, hit: true, stop: 110, fx: muzzle() });
    c.hit({ sfx: 'pierce' }); sodaSplash(c, true); c.word('¡FSSSHH!', { size: 18, col: '#c8f8ff' });
    refreshC(c); fx('beam', 0, 0, 360, { x0: handNow(c).x, x1: c.mc.c.x, y: c.mc.c.y, w: 4, col: '#4ad8ff' });
    await c.f({ pose: 'aim', x: g - 33, tilt: 0, ms: 160 });
    await c.wait(260);
  } },
  // Gonza: from a distance, four pulls of the trigger, four quick shots
  'soda:gonza': { col: '#4ad8ff', band: '#0a3a4a', name: 'CUATRO BURBUJAS', cutPose: 'aim', marks: [1, 1, 1, 2], async run(c) {
    await c.f({ pose: 'run', x: -34, tilt: -0.12, ms: 120, sfx: 'whoosh' });
    await c.cam(1.45, 220);
    await c.f({ pose: 'aim', x: -34, tilt: 0, ms: 220 });
    SFX.play('gun_click');
    // a fizzing sight line settles on the target's torso
    fx('lash', 0, 0, 900, { col: '#4ad8ff', get: () => { const h = handNow(c); const t = chest(c.T); return { x0: h.x + c.dir * 4, y0: h.y - 2, x1: t.x, y1: t.y }; } });
    for (let i = 0; i < 8; i++) { const h = handNow(c); CB.parts.push({ x: h.x, y: h.y - 4, vx: (Math.random() - 0.5) * 0.5, vy: -0.7, g: -0.01, life: 30, max: 30, col: SODA[i % 4] }); await c.wait(90); }
    fx('focus', 160, 0, 900, { cy: 60, col: '#4ad8ff' });
    for (let i = 0; i < 4; i++) {
      await c.f({ pose: 'kickback', x: -36, ms: i < 3 ? 24 : 34, hit: true, stop: 28, fx: muzzle() });
      c.hit({ sfx: 'pierce' }); sodaSplash(c, i === 3);
      c.word(['¡PAM!', '¡PAM!', '¡PAM!', '¡PAAM!'][i], { dx: (i - 1.5) * 6, dy: -i * 3, size: 12 + i * 2, ms: 500 });
      await c.f({ pose: 'aim', x: -34, ms: 34 - i * 4 });
    }
    await c.wait(300);
  } },

  // ---------------- LÁTIGO ELECTRIFICADO ----------------
  // Lobelto: one hand on the insulated grip, hard lashes, a discharge on every impact
  'latigo:lobelto': { col: ELEC, band: '#101a3a', name: 'AZOTE DE ALTO VOLTAJE', cutPose: 'flail', marks: [2, 2, 4], async run(c) {
    const g = c.gap();
    await chargeUp(c, 'elec', 900, 'flail');
    await c.f({ pose: 'run', x: g - 34, tilt: 0.1, ms: 100, sfx: 'whoosh' });
    for (let i = 0; i < 3; i++) {
      const last = i === 2;
      c.weapon({ rot: -1.4 }, 70);
      await c.f({ pose: 'flail', x: g - 36, tilt: -0.14, ms: last ? 150 : 90 - i * 15, sfx: 'whoosh' });
      c.weapon({ rot: 1.5 }, 40);
      fx('lash', 0, 0, 340, { col: ELEC, get: () => { const h = handNow(c); const t = chest(c.T); return { x0: h.x, y0: h.y - 4, x1: t.x, y1: t.y - 2 + i * 3 }; } });
      await c.f({ pose: 'flail2', x: g - 33, tilt: 0.14, ms: 30, ghost: 2, hit: true, stop: last ? 100 : 50 });
      c.hit({ sfx: 'slash' }); zap(c, last ? 7 : 3, last ? 26 : 16);
      c.word(['¡CHAS!', '¡ZZT!', '¡¡KRZZZT!!'][i], { dy: -i * 4, size: last ? 18 : 13, col: last ? '#ffffff' : ELEC });
      if (last) { c.push(14, 160); fx('focus', 160, 0, 380, { cy: 60, col: ELEC }); }
    }
    await c.wait(300);
  } },
  // Gonza: two hands on the whip, runs round the enemy to wrap it up, then one big discharge
  'latigo:gonza': { col: ELEC, band: '#101a3a', name: 'JAULA ELÉCTRICA', marks: [5], async run(c) {
    const g = c.gap(), a = c.a, ta = c.ta, y0 = a.y;
    await chargeUp(c, 'elec', 800, 'ready');
    await c.f({ pose: 'ready', x: 0, ms: 120 });
    fx('tether', 0, 0, 2300, { col: ELEC, get: () => { const h = handNow(c); const t = chest(c.T); return { x0: h.x, y0: h.y, x1: t.x, y1: t.y + 4 }; } });
    fx('speed', 160, 0, 900, { dir: c.dir, seed: 7 });
    // round the back of the enemy (drawn behind it), then round the front
    CB.cine.front = false;   // depth order decides who is in front while running round
    for (let lap = 0; lap < 2; lap++) {
      tween(a, { y: ta.y - 6 }, 120);
      await c.f({ pose: 'run', x: g + 24, y: -3, ms: 90 - lap * 20, ghost: 3, sfx: 'whoosh' });
      a.face = -c.dir;
      tween(a, { y: ta.y + 8 }, 120);
      await c.f({ pose: 'run', x: g - 22, y: 0, ms: 90 - lap * 20, ghost: 3 });
      a.face = c.dir;
      SFX.play('scrape');
    }
    CB.cine.front = true;
    tween(a, { y: y0 }, 140);
    await c.f({ pose: 'brace', x: g - 30, tilt: -0.16, ms: 140 });
    c.word('...', { size: 12, col: '#ffffff' });
    for (let i = 0; i < 4; i++) { zap(c, 1, 10); await c.wait(70); }
    await c.cam(2.0, 160);
    fx('focus', 160, 0, 600, { cy: 60, col: ELEC });
    await c.f({ pose: 'slam', x: g - 32, tilt: -0.22, sq: 0.1, ms: 40, hit: true, stop: 110 });
    c.hit({ sfx: 'spark' }); zap(c, 12, 34);
    for (let i = 0; i < 5; i++) fx('bolt', 0, 0, 260, { x0: chest(c.T).x + (i - 2) * 14, y0: 0, x1: chest(c.T).x + (i - 2) * 3, y1: chest(c.T).y, col: ELEC });
    G.flash = { color: ELEC, start: performance.now(), ms: 120, a: 0.3 };
    c.word('¡¡ZZZZAAP!!', { size: 20, col: '#ffffff' });
    await c.wait(420);
  } },

  // ---------------- HACHA DE BATALLA DE PANTALLA ----------------
  // Lobelto: holds it with all his strength, one crushing top-down vertical cut
  'hacha:lobelto': { col: CRT, band: '#06261a', name: 'SEÑAL CORTADA', cutPose: 'overhead', marks: [6], async run(c) {
    const g = c.gap();
    await chargeUp(c, 'crt', 800, 'brace');
    await c.f({ pose: 'run', x: g - 18, tilt: 0.12, ms: 100, ghost: 2, sfx: 'whoosh' });
    c.weapon({ rot: -0.6 }, 240);
    await c.f({ pose: 'overhead', x: g - 20, tilt: -0.14, sq: -0.06, ms: 280 });
    { const h = handNow(c); fx('star', h.x, h.y - 10, 260, { r: 9, col: CRT, rot: 0.3, n: 8 }); }
    SFX.play('scrape');
    await c.cam(2.05, 200);
    await c.f({ pose: 'air', x: g - 16, y: -12, tilt: -0.08, ms: 90 });
    c.weapon({ rot: 2.7 }, 60);
    await c.f({ pose: 'smash', x: g - 11, y: 0, sq: 0.2, tilt: 0.2, ms: 30, ghost: 4, hit: true, stop: 120 });
    refreshC(c);
    fx('tear', 0, 0, 700, { x0: c.mc.c.x, y0: c.mc.c.y - 34, x1: c.mc.c.x + c.dir * 2, y1: c.mc.f.y + 2, col: CRT });
    slam()(c.mc);
    c.hit({ sfx: 'blunt' });
    c.word('¡¡KRAAK!!', { size: 20, col: '#ffffff', dy: -10 });
    fx('focus', 160, 0, 500, { cy: 60, col: CRT });
    await c.wait(520);
  } },
  // Gonza: two hands, spins faster and faster, the axe biting the enemy on every turn
  'hacha:gonza': { col: CRT, band: '#06261a', name: 'TORBELLINO CATÓDICO', cutPose: 'spin', marks: [1, 1, 1, 2, 2, 4], async run(c) {
    const g = c.gap(), a = c.a;
    await chargeUp(c, 'crt', 800, 'brace');
    await c.f({ pose: 'run', x: g - 16, tilt: 0.1, ms: 100, sfx: 'whoosh' });
    let ms = 120;
    for (let i = 0; i < 6; i++) {
      const last = i === 5;
      a.face = -c.dir; c.weapon({ rot: -1.6 }, ms * 0.6);
      await c.f({ pose: 'spin', x: g - 16 + i, ms, ghost: i > 1 ? 3 : 1, sfx: 'whoosh' });
      a.face = c.dir; c.weapon({ rot: 1.7 }, 30);
      await c.f({ pose: 'sweep', x: g - 13 + i, ms: Math.max(18, ms * 0.35), hit: true, stop: last ? 120 : 20,
        fx: cut({ r: 13, a0: -2.6 + i * 0.1, a1: 0.9, th: 3 + i, col: CRT }) });
      c.hit({ sfx: 'slash' });
      if (i >= 2) fx('ring2', a.x + (a.ox || 0), a.y - 14, 200, { r: 16 + i * 2, col: CRT, sy: 0.35 });
      if (i === 3) fx('speed', 160, 0, 700, { dir: c.dir, seed: 3 });
      ms *= 0.7;
    }
    c.push(18, 160);
    c.word('¡¡TORBELLINO!!', { size: 18, col: '#ffffff' });
    await c.wait(380);
  } },
};
