// =====================================================================
//  MEJORAS — cyberpunk body-mod screen (ripperdoc style).
//
//  Each character shows as a holographic wireframe with its body slots
//  around it, wired to the part they modify:
//    Gonza:   bone structure, skin, a weapon, an E.G.O weapon, legs
//    Lobelto: bone structure, arm prosthesis, an E.G.O weapon,
//             an E.G.O gift, the healthy arm
//  Only the E.G.O weapon slot has items so far; the rest show what is
//  installed now and wait for their upgrades.
// =====================================================================

const CY = { cyan: '#3af0ff', mag: '#ff2a8a', yel: '#f0e040', dim: '#16303a', bg: '#05060c', ink: '#0a1018' };

// anchor: point on the hologram in figure units (x toward the character's
// facing side, y up from the feet); side: where the slot box goes
const MOD_SLOTS = {
  gonza: [
    { id: 'hueso', label: 'ESTRUCTURA ÓSEA', side: 'L', anchor: [0, -18], part: 'spine',
      stock: 'Original', desc: 'Refuerzo del esqueleto: más vida y más aguante antes de quedar aturdido.' },
    { id: 'piel', label: 'PIEL', side: 'L', anchor: [-3, -22], part: 'torso',
      stock: 'Original', desc: 'Recubrimiento dérmico: resistencia a cortes y perforaciones.' },
    { id: 'piernas', label: 'PIERNAS', side: 'L', anchor: [-3, -5], part: 'legs',
      stock: 'Original', desc: 'Piernas reforzadas: más velocidad y patadas más fuertes.' },
    { id: 'arma', label: 'ARMA', side: 'R', anchor: [7, -12], part: 'handF',
      stock: 'Pistola de bajo calibre', desc: 'El arma de mano. Los dados con bala gastan munición.' },
    { id: 'ego', label: 'ARMA E.G.O', side: 'R', anchor: [-6, -12], part: 'handB', ego: true,
      desc: 'Ultimate de un solo uso por combate. Cuesta Luz según su nivel de riesgo.' },
  ],
  lobelto: [
    { id: 'regalo', label: 'REGALO E.G.O', side: 'L', anchor: [0, -29], part: 'head',
      stock: null, desc: 'Un regalo de una anormalidad: efectos pasivos y un detalle en tu aspecto.' },
    { id: 'hueso', label: 'ESTRUCTURA ÓSEA', side: 'L', anchor: [0, -18], part: 'spine',
      stock: 'Original', desc: 'Refuerzo del esqueleto: más vida y más aguante antes de quedar aturdido.' },
    { id: 'brazo', label: 'BRAZO SANO', side: 'L', anchor: [-5, -15], part: 'armB',
      stock: 'Original', desc: 'El brazo que le queda. Golpea con todo lo que tiene.' },
    { id: 'protesis', label: 'PRÓTESIS', side: 'R', anchor: [3, -17], part: 'stump',
      stock: 'Ninguna · muñón vendado', desc: 'Sustituye el brazo perdido por un implante. Abre nuevos ataques.' },
    { id: 'ego', label: 'ARMA E.G.O', side: 'R', anchor: [-6, -12], part: 'handB', ego: true,
      desc: 'Ultimate de un solo uso por combate. Cuesta Luz según su nivel de riesgo.' },
  ],
};

const PEC = { sel: 'lobelto', slot: 'ego', hover: null, hoverSlot: null, at: 0 };

// ---------------------------------------------------------------------
//  Cyberpunk drawing helpers
// ---------------------------------------------------------------------
// panel with cut corners and a neon edge
function cyPanel(x, y, w, h, col = CY.cyan, fill = CY.ink, cut = 5) {
  poly([[x + cut, y], [x + w, y], [x + w, y + h - cut], [x + w - cut, y + h], [x, y + h], [x, y + cut]], fill);
  const c = col;
  line(x + cut, y, x + w, y, c); line(x + w, y, x + w, y + h - cut, c);
  line(x + w, y + h - cut, x + w - cut, y + h, c); line(x + w - cut, y + h, x, y + h, c);
  line(x, y + h, x, y + cut, c); line(x, y + cut, x + cut, y, c);
}
// text with a chromatic split that glitches now and then
function cyText(s, x, y, col, size = 8, align = 'left', t = 0, seed = 0) {
  const g = hash(Math.floor(t / 90) + seed) > 0.93 ? 1 + Math.round(hash(seed + Math.floor(t / 90)) * 2) : 0;
  if (g) { txt(s, x - g, y, CY.mag, size, align); txt(s, x + g, y, CY.cyan, size, align); }
  txt(s, x, y, col, size, align);
}

// The character as a hologram: wireframe body, visible bones, scanline sweep.
// Returns a function that maps figure units to screen points.
function holoBody(who, cx, fy, s, t, hot) {
  const P = (dx, dy) => [cx + dx * s, fy + dy * s];
  const kid = who === 'gonza';
  const k = kid ? 0.86 : 1;
  const Q = (dx, dy) => P(dx * k, dy * k);
  const pulse = 0.75 + 0.25 * Math.sin(t / 300);
  const col = (part) => (hot === part ? CY.mag : CY.cyan);
  const L = (a, b, part, w = 1) => { ctx.globalAlpha = hot === part ? 1 : 0.85 * pulse; line(...Q(...a), ...Q(...b), col(part), w); };
  // base ring on the floor
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU + t / 2000; px(cx + Math.cos(a) * 26, fy + 2 + Math.sin(a) * 4, i % 4 ? CY.dim : CY.cyan); }
  light(cx, fy, 30, 6, CY.cyan, 0.18, 3);
  // body outline
  const head = Q(0, -27);
  ctx.globalAlpha = (hot === 'head' ? 1 : 0.85) * pulse;
  ring(Math.round(head[0]), Math.round(head[1]), Math.round(5 * s * k), col('head'), 1);
  if (kid) { ctx.globalAlpha = 0.8; line(...Q(-5, -32), ...Q(6, -32), col('head'), 2); line(...Q(2, -31), ...Q(9, -31), col('head'), 1); }
  else {
    // Lobelto's rectangular frames
    ctx.globalAlpha = 0.95;
    for (const gx of [0.5, 3.2]) {
      const [x0, y0] = Q(gx, -28.2);
      const gw = Math.round(2.2 * s), gh = Math.round(1.6 * s);
      rect(x0, y0, gw, 1, col('head')); rect(x0, y0 + gh, gw, 1, col('head'));
      rect(x0, y0, 1, gh + 1, col('head')); rect(x0 + gw - 1, y0, 1, gh + 1, col('head'));
    }
  }
  // eyes
  ctx.globalAlpha = 1;
  for (const ex of kid ? [1.2, 3.4] : [1.4, 4.1]) { const [x0, y0] = Q(ex, -27.6); rect(x0, y0, 2, 2, '#ffffff'); }
  // spine and ribs (bone structure)
  L([0, -22], [0, -10], 'spine', 2);
  for (let i = 0; i < 4; i++) { L([0, -21 + i * 2.4], [-4, -19.5 + i * 2.4], 'spine'); L([0, -21 + i * 2.4], [4, -19.5 + i * 2.4], 'spine'); }
  L([-3, -10], [3, -10], 'spine', 2);
  // skin: a faint outline around the torso
  if (kid) { ctx.globalAlpha = (hot === 'torso' ? 0.9 : 0.25) * pulse; L([-6, -22], [-5, -10], 'torso'); L([6, -22], [5, -10], 'torso'); L([-6, -22], [6, -22], 'torso'); }
  // arms
  L([0, -20], [-6, -11], kid ? 'handB' : 'armB', 2);                // back arm (Lobelto's healthy one)
  if (kid) L([0, -20], [7, -12], 'handF', 2);
  else {
    L([0, -20], [3, -17], 'stump', 2);                               // the stump
    const st = Q(3, -17);
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t / 150);
    rect(st[0] - 2, st[1] - 2, 4, 4, hot === 'stump' ? CY.mag : CY.yel);
    // the missing part, as a dashed outline
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 6; i++) { const a = Q(3 + i * 0.6, -17 + i * 0.9); px(a[0], a[1], CY.yel); }
  }
  // legs
  L([0, -10], [-4, 0], 'legs', 2); L([0, -10], [4, 0], 'legs', 2);
  for (const j of [[-2, -5], [2, -5]]) { const q = Q(...j); ctx.globalAlpha = 0.9; rect(q[0] - 1, q[1] - 1, 2, 2, col('legs')); }
  // joints
  ctx.globalAlpha = 0.9;
  for (const j of [[0, -20], [0, -10], [-6, -11]]) { const q = Q(...j); rect(q[0] - 1, q[1] - 1, 2, 2, '#ffffff'); }
  // scan line sweeping down the body
  const sy = fy - ((t / 12) % (36 * s * k));
  ctx.globalAlpha = 0.5;
  rect(cx - 22, sy, 44, 1, CY.cyan);
  ctx.globalAlpha = 0.12;
  rect(cx - 22, sy, 44, 6, CY.cyan);
  ctx.globalAlpha = 1;
  return Q;
}

// ---------------------------------------------------------------------
//  Screen
// ---------------------------------------------------------------------
function modState(who, slot) {
  if (slot.ego) {
    const w = EGO_BY_ID[W$.equip()[who]];
    return w ? { name: w.name, col: egoCol(w), risk: w.risk } : null;
  }
  return slot.stock ? { name: slot.stock, col: '#a8b8c0' } : null;
}

function drawPecadores(t) {
  G.hubHits = [];
  const now = performance.now();
  // ---- backdrop: dark, a perspective grid and drifting scan bands
  rect(-OX, 0, VW, NAV_Y, CY.bg);
  ctx.globalAlpha = 0.18;
  for (let x = -OX - 8; x < W + OX; x += 16) line(x, 0, x, NAV_Y, CY.dim);
  for (let y = 4; y < NAV_Y; y += 12) line(-OX, y, W + OX, y, CY.dim);
  ctx.globalAlpha = 0.05;
  rect(-OX, (t / 20) % NAV_Y, VW, 10, CY.cyan);
  ctx.globalAlpha = 1;
  light(143, 96, 80, 60, CY.cyan, 0.06, 4);

  // ---- header
  cyText('// MEJORAS', 8, 13, CY.cyan, 10, 'left', t, 1);
  txt('CLÍNICA CLANDESTINA · DISTRITO D', 72, 12, '#4a7a88', 7);
  drawWallet(240, 6);
  rect(8, 17, W - 16, 1, CY.dim);

  // ---- character select
  [['lobelto', 'LOBELTO', 'headset'], ['gonza', 'GONZA', 'cap']].forEach(([id, name, hat], i) => {
    const x = 8, y = 24 + i * 46, on = PEC.sel === id;
    const hv = hubHit(x, y, 58, 40, () => { if (PEC.sel !== id) { PEC.sel = id; PEC.slot = 'ego'; PEC.at = performance.now(); SFX.play('select'); } });
    cyPanel(x, y, 58, 40, on ? CY.mag : hv ? CY.cyan : CY.dim, on ? '#160a14' : CY.ink);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, 26, 36); ctx.clip();
    ctx.translate(x + 15, y + 22); ctx.scale(0.75, 0.75); ctx.translate(-(x + 15), -(y + 22));
    avatarHead(x + 15, y + 22, hat, t, !on);
    ctx.restore();
    txt(name, x + 30, y + 15, on ? '#ffffff' : '#7aa8b8', 8);
    txt(id === 'gonza' ? 'Ser. 13' : 'Ser. 19', x + 30, y + 24, '#4a7a88', 7);
    if (on) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t / 200); rect(x + 30, y + 30, 22, 2, CY.mag); ctx.globalAlpha = 1; }
  });
  txt('SUJETOS', 8, 124, '#4a7a88', 7);
  txt(`${MOD_SLOTS[PEC.sel].filter(s => modState(PEC.sel, s)).length}/5 RANURAS`, 8, 133, CY.cyan, 7);

  // ---- hologram and slots
  const slots = MOD_SLOTS[PEC.sel];
  const hot = PEC.hoverSlot || PEC.slot;
  const hotPart = (slots.find(s => s.id === hot) || {}).part;
  // a glitch when switching character
  const sw = Math.max(0, 1 - (now - PEC.at) / 300);
  if (sw > 0) { ctx.globalAlpha = sw; for (let i = 0; i < 6; i++) rect(118 + hash(i + Math.floor(now / 40)) * 40, 30 + i * 18, 20, 2, i % 2 ? CY.mag : CY.cyan); ctx.globalAlpha = 1; }
  const Q = holoBody(PEC.sel, 143, 146, 3.4, t, hotPart);
  PEC.hoverSlot = null;
  const per = { L: 0, R: 0 };
  slots.forEach((sl) => {
    const i = per[sl.side]++;
    const bx = sl.side === 'L' ? 72 : 168, by = 26 + i * (sl.side === 'L' ? 40 : 52), bw = 44, bh = 26;
    const st = modState(PEC.sel, sl);
    const sel = PEC.slot === sl.id;
    const hv = hubHit(bx, by, bw, bh, () => { PEC.slot = sl.id; SFX.play('select'); });
    if (hv) PEC.hoverSlot = sl.id;
    const on = sel || hv;
    // leader line from the box to its part
    const [ax, ay] = Q(...sl.anchor);
    const ex = sl.side === 'L' ? bx + bw : bx, ey = by + bh / 2;
    const mx = sl.side === 'L' ? ex + 6 : ex - 6;
    ctx.globalAlpha = on ? 1 : 0.5;
    line(ex, ey, mx, ey, on ? CY.mag : CY.cyan); line(mx, ey, ax, ay, on ? CY.mag : CY.cyan);
    rect(ax - 1, ay - 1, 3, 3, on ? CY.mag : CY.cyan);
    ctx.globalAlpha = 1;
    cyPanel(bx, by, bw, bh, on ? CY.mag : st ? CY.cyan : CY.dim, sel ? '#160a14' : CY.ink, 4);
    txtFit(sl.label, bx + 3, by + 8, on ? '#ffffff' : '#7aa8b8', 7, bw - 6);
    if (st) {
      if (st.risk) riskChip(st.risk, bx + 3, by + 10, 22);
      txtFit(st.name, bx + 3, by + (st.risk ? 23 : 18), st.col, 7, bw - 6);
    } else txt('— VACÍO —', bx + bw / 2, by + 19, '#3a5a66', 7, 'center');
  });

  // ---- details of the selected slot
  drawModDetail(slots.find(s => s.id === PEC.slot) || slots[0], t);
}

function drawModDetail(sl, t) {
  const x = 218, y = 22, w = 94, h = 132;
  cyPanel(x, y, w, h, CY.cyan, CY.ink, 6);
  cyText(sl.label, x + 5, y + 10, CY.yel, 8, 'left', t, 7);
  rect(x + 5, y + 13, w - 10, 1, CY.dim);
  let yy = y + 21;
  wrap(sl.desc, w - 10, 7).slice(0, 4).forEach(ln => { txt(ln, x + 5, yy, '#8ab0bc', 7); yy += 7; });
  yy += 3;
  const st = modState(PEC.sel, sl);
  txt('INSTALADO', x + 5, yy, '#4a7a88', 7); yy += 8;
  txtFit(st ? st.name : 'Nada', x + 5, yy, st ? st.col : '#3a5a66', 8, w - 10); yy += 6;
  if (sl.id === 'arma' && PEC.sel === 'gonza') { txt(`Balas: ${SAVE.get('ammo', AMMO_MAX)}/${AMMO_MAX}`, x + 5, yy + 6, CY.yel, 7); yy += 8; }
  yy += 6;
  rect(x + 5, yy - 4, w - 10, 1, CY.dim);
  if (sl.ego) {
    // owned E.G.O weapons: click to equip / unequip
    const eq = W$.equip();
    const owned = EGO_WEAPONS.filter(wp => W$.count(wp.id));
    if (!owned.length) {
      ['No tienes armas E.G.O.', unlocked('gacha') ? 'Consíguelas en el Gacha.' : 'Llegarán con la historia.'].forEach((l, i) => txt(l, x + w / 2, yy + 8 + i * 8, '#4a7a88', 7, 'center'));
      return;
    }
    owned.slice(0, 7).forEach((wp, i) => {
      const ry = yy + i * 10;
      const mine = eq[PEC.sel] === wp.id;
      const holder = Object.keys(eq).find(k => eq[k] === wp.id && k !== PEC.sel);
      const hv = hubHit(x + 3, ry, w - 6, 9, () => equipWeapon(PEC.sel, mine ? null : wp.id));
      rect(x + 3, ry, w - 6, 9, mine ? '#2a0a1e' : hv ? '#0e2028' : '#0a141c');
      rect(x + 3, ry, 2, 9, egoCol(wp));
      txtFit(wp.name, x + 8, ry + 7, mine ? '#ffffff' : '#c8dce4', 7, w - 34);
      txt(mine ? 'ON' : holder && W$.free(wp.id) <= 0 ? (holder === 'gonza' ? 'GON' : 'LOB') : `x${W$.count(wp.id)}`, x + w - 5, ry + 7, mine ? CY.mag : '#4a7a88', 7, 'right');
    });
    if (owned.length > 7) txt(`+${owned.length - 7} más`, x + w / 2, yy + 76, '#4a7a88', 7, 'center');
  } else {
    txt('MEJORAS DISPONIBLES', x + 5, yy + 2, '#4a7a88', 7);
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t / 400);
    cyPanel(x + 6, yy + 8, w - 12, 22, CY.dim, '#070b10', 4);
    ctx.globalAlpha = 1;
    txt('SIN STOCK', x + w / 2, yy + 18, '#3a5a66', 8, 'center');
    txt('próximamente', x + w / 2, yy + 26, '#2a4a56', 7, 'center');
  }
}
