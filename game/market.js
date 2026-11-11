// =====================================================================
//  MARKET — E.G.O weapons, the two currencies, the black market gacha
//  and the Mejoras tab where each character equips one weapon.
//
//  Enkephalina: earned by finishing an episode; pays for extractions.
//  Ahn: earned by selling E.G.O weapons or exchanging Enkephalina; pays
//  for future features (the shop is gone for now).
//  An equipped E.G.O weapon is a one-use-per-fight ultimate that costs
//  Light (more for higher risk levels).
// =====================================================================

// Features opened by the story: the E.G.O extraction (gacha) once the
// machine is used in the story, the workshop further on. A story step
// { unlock: 'gacha' } opens one. Ajustes > Datos has a test switch.
const unlocked = (k) => !!(SAVE.get('unlock_' + k) || CFG.devUnlock);
const LOCK_TEXT = {
  gacha: 'Bloqueado: se desbloquea al usar la máquina E.G.O en la historia',
  taller: 'Bloqueado: el Workshop se desbloquea al avanzar en la historia',
};

// Risk levels double as gacha rarities.
const RISK = {
  ZAYIN: { col: '#2a9a4a', light: 2, sell: 200, rate: 0.45 },
  TETH:  { col: '#3a7ad8', light: 3, sell: 500, rate: 0.30 },
  HE:    { col: '#d8a830', light: 4, sell: 1200, rate: 0.17 },
  WAW:   { col: '#9a3ad8', light: 5, sell: 3000, rate: 0.065 },
  ALEPH: { col: '#e03040', light: 6, sell: 8000, rate: 0.015 },
};
const RISK_ORDER = ['ZAYIN', 'TETH', 'HE', 'WAW', 'ALEPH'];
const PULL_COST = 100, ENK_PER_EPISODE = 1000, ENK_TO_AHN = 10, PITY = 80;

// First batch, made up to test the gacha; replace freely.
const EGO_WEAPONS = [
  { id: 'taza', name: 'Taza Rota', risk: 'ZAYIN', kind: 'mug',
    desc: 'La taza que Lobelto estampó en la cara de aquella cosa. Ahora pesa más de lo que debería.',
    dice: [['blunt', 6, 10], ['blunt', 5, 8]] },
  { id: 'pieza', name: 'Pieza Olvidada', risk: 'ZAYIN', kind: 'hammer',
    desc: 'Nadie recuerda haberla fabricado, pero encaja en la mano como si fuera tuya.',
    dice: [['blunt', 5, 9], ['blunt', 5, 9]] },
  { id: 'cable', name: 'Cable Pelado', risk: 'TETH', kind: 'whip',
    desc: 'Aún chisporrotea. A veces se mueve solo cuando nadie lo mira.',
    dice: [['slash', 4, 7], ['slash', 4, 7], ['slash', 4, 7]] },
  { id: 'pantalla', name: 'Pantalla Azul', risk: 'TETH', kind: 'monitor',
    desc: 'Un monitor reventado atado a un palo. Se reinicia en el peor momento.',
    dice: [['blunt', 7, 11], ['blunt', 6, 10]] },
  { id: 'prensa', name: 'Prensa', risk: 'HE', kind: 'hammer',
    desc: 'Un trozo de la prensa hidráulica de la máquina ZAYIN. Golpea como una cadena de montaje.',
    dice: [['blunt', 10, 15], ['blunt', 8, 12]] },
  { id: 'llamada', name: 'Llamada Perdida', risk: 'HE', kind: 'spear',
    desc: 'Una lanza fina que suena con un tono de llamada cada vez que atraviesa algo.',
    dice: [['pierce', 6, 10], ['pierce', 6, 10], ['pierce', 6, 10]] },
  { id: 'dentada', name: 'Hoja Dentada', risk: 'WAW', kind: 'blade',
    desc: 'El arma que se fundió al brazo de aquel empleado. Todavía está caliente.',
    dice: [['slash', 12, 18], ['slash', 10, 15]] },
  { id: 'gudbais', name: 'Gud Bais', risk: 'WAW', kind: 'gun',
    desc: 'Por fin un E.G.O gud bais. Gonza sabrá lo que prometió.',
    dice: [['pierce', 9, 14], ['pierce', 9, 14], ['pierce', 9, 14]] },
  { id: 'cantox', name: 'Canto X', risk: 'ALEPH', kind: 'scythe',
    desc: 'Lobelto lo dijo: «si o si en el canto 10 sacan un E.G.O Aleph». Tenía razón.',
    dice: [['slash', 16, 24], ['slash', 14, 20], ['slash', 12, 18]] },
];
const EGO_BY_ID = Object.fromEntries(EGO_WEAPONS.map(w => [w.id, w]));
const egoCol = (w) => RISK[w.risk].col;
// the combat page of a weapon's ultimate
const egoPage = (w) => ({ name: w.name, tier: 'E', ego: w, dice: w.dice });

// ---------------------------------------------------------------------
//  Wallet and inventory (all in SAVE)
// ---------------------------------------------------------------------
const W$ = {
  enk: () => SAVE.get('enk', 0),
  ahn: () => SAVE.get('ahn', 0),
  add(enk = 0, ahn = 0) { SAVE.save({ enk: W$.enk() + enk, ahn: W$.ahn() + ahn }); },
  owned: () => SAVE.get('ego_owned', {}),
  equip: () => SAVE.get('ego_eq', {}),
  count: (id) => W$.owned()[id] || 0,
  give(id, n = 1) { const o = { ...W$.owned() }; o[id] = (o[id] || 0) + n; SAVE.save({ ego_owned: o }); },
  // copies that are not equipped by anyone
  free(id) { const eq = W$.equip(); return W$.count(id) - Object.values(eq).filter(x => x === id).length; },
};

// Enkephalina for every finished episode, once (also for episodes finished
// before the market existed).
function awardEpisodes() {
  const got = [];
  for (const e of EPISODES) {
    const scenes = episodeScenes(e);
    if (e.wip || !scenes.length || !scenes.every(isSceneDone) || SAVE.get('enk_ep' + e.ep)) continue;
    SAVE.save({ ['enk_ep' + e.ep]: true });
    W$.add(ENK_PER_EPISODE);
    got.push(e);
  }
  return got;
}

// ---------------------------------------------------------------------
//  Extraction (gacha)
// ---------------------------------------------------------------------
function rollRisk(forceHigh) {
  if (forceHigh) return Math.random() < 0.2 ? 'ALEPH' : 'WAW';
  let r = Math.random();
  for (const k of [...RISK_ORDER].reverse()) { if (r < RISK[k].rate) return k; r -= RISK[k].rate; }
  return 'ZAYIN';
}

function extract(n) {
  if (W$.enk() < PULL_COST * n) { SFX.play('error'); return; }
  W$.add(-PULL_COST * n);
  let pity = SAVE.get('pity', 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    pity++;
    let risk = rollRisk(pity >= PITY);
    // a 10-extraction always holds at least one HE or better
    if (n === 10 && i === n - 1 && !out.some(r => RISK_ORDER.indexOf(r.w.risk) >= 2) && RISK_ORDER.indexOf(risk) < 2) risk = 'HE';
    if (risk === 'WAW' || risk === 'ALEPH') pity = 0;
    const pool = EGO_WEAPONS.filter(w => w.risk === risk);
    const w = pool[Math.floor(Math.random() * pool.length)];
    const isNew = W$.count(w.id) === 0;
    W$.give(w.id);
    out.push({ w, isNew });
  }
  const log = [...out.map(r => ({ id: r.w.id, at: Date.now() })).reverse(), ...SAVE.get('pull_log', [])].slice(0, 60);
  SAVE.save({ pity, pulls: SAVE.get('pulls', 0) + n, pull_log: log });
  const best = out.reduce((b, r) => Math.max(b, RISK_ORDER.indexOf(r.w.risk)), 0);
  G.pull = { out, start: performance.now(), best: RISK_ORDER[best], shown: 0 };
  SFX.play('gacha');
  MK.say(best >= 3 ? 'big' : 'pull');
}

// ---------------------------------------------------------------------
//  Selling
// ---------------------------------------------------------------------
function sellWeapon(id) {
  const w = EGO_BY_ID[id];
  if (!w || W$.free(id) <= 0) { SFX.play('error'); return; }
  const o = { ...W$.owned() };
  o[id]--; if (!o[id]) delete o[id];
  SAVE.save({ ego_owned: o });
  W$.add(0, RISK[w.risk].sell);
  SFX.play('coins');
  MK.say('sell');
}
function exchangeEnk() {
  if (W$.enk() < PULL_COST) { SFX.play('error'); return; }
  W$.add(-PULL_COST, PULL_COST * ENK_TO_AHN);
  SFX.play('coins');
  MK.say('sell');
}
// ---------------------------------------------------------------------
//  Shared drawing
// ---------------------------------------------------------------------
// E.G.O weapon icon, centred at (cx, cy), roughly 12*s pixels tall
function egoIcon(kind, cx, cy, s, col) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy)); ctx.scale(s, s);
  const D = '#16121a', M = '#8a8a96', H = '#d8d8e0';
  if (kind === 'mug') {
    rect(-4, -3, 7, 8, '#e8e0d0'); rect(-4, -3, 7, 1, '#ffffff'); rect(3, -1, 2, 1, '#e8e0d0'); rect(4, -1, 1, 4, '#e8e0d0'); rect(3, 2, 2, 1, '#e8e0d0');
    line(-2, -3, 0, 1, D); line(0, 1, -1, 4, D); rect(-4, 4, 7, 1, col);
  } else if (kind === 'hammer') {
    line(0, 6, 0, -2, '#6a4a30', 2); rect(-5, -6, 10, 5, M); rect(-5, -6, 10, 1, H); rect(-5, -2, 10, 1, col);
  } else if (kind === 'whip') {
    line(-5, 6, -3, 3, '#2a3050', 2);
    let px0 = -3, py0 = 3;
    for (let k = 1; k <= 6; k++) { const x = -3 + k * 1.5, y = 3 - k * 1.6 + (k % 2 ? 1.5 : -1.5); line(px0, py0, x, y, col, 1); px0 = x; py0 = y; }
    px(px0 + 1, py0, '#ffffff');
  } else if (kind === 'monitor') {
    line(0, 6, 0, 0, '#6a4a30', 2); rect(-5, -7, 10, 8, '#3a3a42'); rect(-4, -6, 8, 6, col); rect(-3, -4, 4, 1, '#ffffff'); rect(-3, -2, 2, 1, '#ffffff');
  } else if (kind === 'spear') {
    line(-5, 6, 4, -5, '#7a6a5a', 1); poly([[4, -5], [6, -8], [3, -6]], H); px(5, -7, col); px(-1, 1, col);
  } else if (kind === 'blade') {
    rect(-1, 3, 2, 4, '#3a2a20'); rect(-3, 2, 6, 1, M);
    poly([[-1, 2], [1, 2], [2, -7], [0, -9], [-2, -7]], H);
    for (let y = -6; y < 2; y += 2) px(2, y, col);
  } else if (kind === 'gun') {
    rect(-5, -2, 10, 3, M); rect(-5, -2, 10, 1, H); rect(-2, 1, 3, 5, '#3a3a42'); rect(5, -1, 2, 1, col); px(-4, 0, col);
  } else if (kind === 'scythe') {
    line(-3, 7, 2, -6, '#4a3a4a', 1);
    poly([[2, -6], [-5, -8], [-7, -5], [-2, -6]], H); rect(-6, -6, 2, 1, col); px(2, -6, col); px(-1, 1, col);
  }
  ctx.restore();
}

function riskChip(risk, x, y, w = 24) {
  rrect(x, y, w, 7, RISK[risk].col, 2);
  txt(risk, x + w / 2, y + 6, '#ffffff', 7, 'center');
}

// Enkephalina (a glowing PE box) and Ahn (a coin) with their amounts
function drawWallet(x, y) {
  rect(x, y, 4, 4, '#5ae0c0'); rect(x, y, 4, 1, '#c8fff0'); px(x + 4, y + 1, '#2a8a70');
  txt(String(W$.enk()), x + 7, y + 5, '#c8fff0', 8);
  ctx.font = '8px VT323, monospace';
  const ex = x + 12 + Math.ceil(ctx.measureText(String(W$.enk())).width);
  disc(ex + 2, y + 2, 2, '#e8c060'); px(ex + 2, y + 2, '#8a6020');
  txt(`${W$.ahn()} Ahn`, ex + 7, y + 5, '#ffe8b0', 8);
}

// generic clickable areas for the market and Pecadores screens
function hubHit(x, y, w, h, fn, hoverKey) {
  G.hubHits.push({ x, y, w, h, fn });
  const m = G.hubMouse;
  return !!m && m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
}
function hubButton(x, y, w, h, label, fn, on = true, col = '#c0283a') {
  const hv = on && hubHit(x, y, w, h, on ? fn : () => SFX.play('error'));
  if (!on) hubHit(x, y, w, h, () => SFX.play('error'));
  rect(x, y, w, h, !on ? '#1a1620' : hv ? col : '#3a1820');
  rect(x, y, w, 1, on ? '#ff8a90' : '#2a2630');
  txt(label, x + w / 2, y + h - 3, on ? '#fff' : '#5a5660', 8, 'center');
  return hv;
}

// ---------------------------------------------------------------------
//  Black market screen
// ---------------------------------------------------------------------
// Placeholder trader: a silhouette in the shadows with a few sample lines,
// until the real character is designed.
const MK = {
  tab: 'extraer',
  line: '¿Buscas algo... especial?',
  lineAt: 0,
  LINES: {
    hello: ['¿Buscas algo... especial?', 'Todo legal. Más o menos.', 'La Enkephalina habla, chaval.', 'No preguntes de dónde sale.'],
    pull: ['Veamos qué escupe hoy la máquina.', 'Cruza los dedos.', 'Ni yo sé lo que hay dentro.'],
    big: ['...Vaya. Eso no lo veo todos los días.', 'Cuidado con eso. Muerde.'],
    sell: ['Un placer hacer negocios.', 'Te lo pago bien. Para lo que es.'],
    buy: ['Buena elección.', 'Sin devoluciones.'],
    broke: ['Sin Enkephalina no hay trato.'],
  },
  say(kind) { const l = MK.LINES[kind]; MK.line = l[Math.floor(Math.random() * l.length)]; MK.lineAt = performance.now(); },
};

function openMarket() {
  G.hubTab = 'mercado'; G.pull = null; MK.tab = 'extraer'; MK.say('hello');
  G.hubNavSel = HUB_NAV.findIndex(n => n.id === 'mercado');
  SFX.play('confirm');
  Music.play('market');
}

function drawMarket(t) {
  G.hubHits = [];
  drawWide(() => drawHubBackdrop(t), 'hub');
  ctx.globalAlpha = 0.88; rect(-OX, 0, VW, NAV_Y, '#07050c'); ctx.globalAlpha = 1;
  metalFrame(4, 4, W - 8, NAV_Y - 8);

  // ---- the stall
  const sx = 8, sy = 10, sw = 116, sh = 140;
  rect(sx, sy, sw, sh, '#0a0810');
  rect(sx, sy, sw, 1, '#4a3018');
  const neon = hash(Math.floor(t / 90)) > 0.06;
  pixText('MERCADO', sx + 31, sy + 8, neon ? '#ff5ac0' : '#4a1838');
  pixText('NEGRO', sx + 39, sy + 15, neon ? '#ff5ac0' : '#4a1838');
  if (neon) light(sx + 58, sy + 14, 40, 10, '#ff3aa0', 0.18, 3);
  // trader (placeholder silhouette): hat, coat, glowing eyes
  const tx = sx + 58, ty = sy + 98, bob = Math.round(Math.sin(t / 700));
  ellipse(tx, ty - 26 + bob, 15, 22, '#040306');
  rect(tx - 13, ty - 52 + bob, 26, 3, '#040306'); rect(tx - 8, ty - 60 + bob, 16, 9, '#040306');
  disc(tx, ty - 42 + bob, 7, '#040306');
  if (Math.floor(t / 90) % 60) { rect(tx - 4, ty - 43 + bob, 2, 1, '#ffd060'); rect(tx + 2, ty - 43 + bob, 2, 1, '#ffd060'); }
  light(tx, ty - 42, 10, 4, '#ffb030', 0.12, 2);
  // counter with goods
  rect(sx + 4, ty - 6, sw - 8, 4, '#3a2a20'); rect(sx + 4, ty - 6, sw - 8, 1, '#6a4a30');
  rect(sx + 6, ty - 2, sw - 12, 22, '#1e1612');
  egoIcon('gun', sx + 20, ty - 10, 0.8, '#5ae0c0'); egoIcon('mug', sx + 96, ty - 10, 0.8, '#5ae0c0');
  rect(sx + 30, ty - 12, 8, 6, '#5ae0c0'); rect(sx + 30, ty - 12, 8, 1, '#c8fff0');
  // speech bubble
  const bl = wrap(MK.line, sw - 16, 8);
  const by = sy + 22, bh = 4 + bl.length * 8;
  const k = Math.min(1, (performance.now() - MK.lineAt) / 150);
  ctx.globalAlpha = k;
  rrect(sx + 6, by, sw - 12, bh, '#e8e0d0', 2);
  poly([[tx - 3, by + bh], [tx + 3, by + bh], [tx, by + bh + 4]], '#e8e0d0');
  bl.forEach((ln, i) => txt(ln, sx + 10, by + 9 + i * 8, '#16121a', 8));
  ctx.globalAlpha = 1;
  txt('(traficante provisional)', sx + sw / 2, sy + sh - 4, '#4a4450', 6, 'center');

  // ---- right side: tabs and wallet
  const rx = 130, ry = 10, rw = 182, rh = 140;
  rect(rx, ry, rw, rh, '#0e0c14');
  rect(rx, ry, rw, 1, '#4a3018');
  [['extraer', 'EXTRACCIÓN'], ['vender', 'VENDER'], ['historial', 'HISTORIAL']].forEach(([id, label], i) => {
    const bx = rx + 2 + i * 45, on = MK.tab === id;
    const hv = hubHit(bx, ry + 2, 44, 11, () => { MK.tab = id; SFX.play('select'); });
    rect(bx, ry + 2, 44, 11, on ? '#3a1820' : hv ? '#241820' : '#16121a');
    if (on) rect(bx, ry + 12, 44, 1, '#c0283a');
    txt(label, bx + 22, ry + 10, on ? '#fff' : '#a09080', 7, 'center');
  });
  drawWallet(rx + 141, ry + 4);
  const body = { x: rx + 4, y: ry + 17, w: rw - 8, h: rh - 21 };
  if (MK.tab === 'extraer') drawExtractTab(body, t);
  else if (MK.tab === 'historial') drawHistoryTab(body, t);
  else drawSellTab(body, t);

  if (G.pull) drawPull(t);
}

// last extractions, newest first, plus how much of the collection is owned
function drawHistoryTab(b, t) {
  const log = SAVE.get('pull_log', []);
  const owned = EGO_WEAPONS.filter(w => W$.count(w.id)).length;
  txt(`Colección: ${owned}/${EGO_WEAPONS.length} armas · ${SAVE.get('pulls', 0)} extracciones`, b.x + 2, b.y + 7, '#c8b0e8', 7);
  rect(b.x + 2, b.y + 9, b.w - 4, 2, '#2a1830'); rect(b.x + 2, b.y + 9, Math.round((b.w - 4) * owned / EGO_WEAPONS.length), 2, RISK.WAW.col);
  if (!log.length) { txt('Aún no has extraído nada.', b.x + b.w / 2, b.y + 50, '#6a6070', 8, 'center'); return; }
  log.slice(0, 20).forEach((e, i) => {
    const w = EGO_BY_ID[e.id];
    if (!w) return;
    const col = i % 2, row = Math.floor(i / 2);
    const x = b.x + col * (b.w / 2), y = b.y + 14 + row * 10;
    rect(x, y, b.w / 2 - 2, 9, row % 2 ? '#14101a' : '#18141e');
    rect(x, y, 2, 9, egoCol(w));
    txtFit(w.name, x + 5, y + 7, RISK_ORDER.indexOf(w.risk) >= 3 ? egoCol(w) : '#e8e4dc', 7, b.w / 2 - 30);
    txt(w.risk, x + b.w / 2 - 4, y + 7, egoCol(w), 6, 'right');
  });
}

function drawExtractTab(b, t) {
  rect(b.x, b.y, b.w, 46, '#1a0e1a');
  // banner art: the extraction machine's press glowing
  for (let i = 0; i < 6; i++) light(b.x + 20 + i * 26, b.y + 23, 14, 18, RISK[RISK_ORDER[i % 5]].col, 0.06, 2);
  txt('EXTRACCIÓN E.G.O', b.x + 6, b.y + 10, '#ffe8b0', 9);
  txt('Armas E.G.O de una sucursal abandonada.', b.x + 6, b.y + 19, '#a09080', 7);
  txt('Equípalas en Mejoras: son tu ultimate.', b.x + 6, b.y + 27, '#a09080', 7);
  egoIcon('scythe', b.x + b.w - 18, b.y + 24, 1.6, RISK.ALEPH.col);
  // rates
  RISK_ORDER.forEach((k, i) => {
    const x = b.x + 4 + i * 34;
    riskChip(k, x, b.y + 34, 30);
    txt(`${(RISK[k].rate * 100).toFixed(1).replace('.0', '')}%`, x + 15, b.y + 45, '#d8d0c0', 7, 'center');
  });
  const pity = SAVE.get('pity', 0);
  txt(`Garantía WAW o ALEPH: ${pity}/${PITY}`, b.x + 4, b.y + 58, '#c8b0e8', 8);
  rect(b.x + 4, b.y + 61, b.w - 8, 2, '#2a1830'); rect(b.x + 4, b.y + 61, Math.round((b.w - 8) * pity / PITY), 2, RISK.WAW.col);
  txt('Cada 10 extracciones: mínimo un HE.', b.x + 4, b.y + 72, '#8a8070', 7);
  const e = W$.enk();
  hubButton(b.x + 4, b.y + 80, 82, 16, '', () => extract(1), e >= PULL_COST);
  hubButton(b.x + 92, b.y + 80, 82, 16, '', () => extract(10), e >= PULL_COST * 10, '#d8a830');
  for (const [x, n] of [[b.x + 4, 1], [b.x + 92, 10]]) {
    txt(`EXTRAER x${n}`, x + 41, b.y + 88, e >= PULL_COST * n ? '#fff' : '#5a5660', 8, 'center');
    rect(x + 27, b.y + 90, 3, 3, '#5ae0c0');
    txt(String(PULL_COST * n), x + 33, b.y + 94, '#c8fff0', 7);
  }
  if (e < PULL_COST) txt('Termina episodios para ganar Enkephalina.', b.x + b.w / 2, b.y + 107, '#8a6070', 7, 'center');
}

function drawSellTab(b, t) {
  txt('Vende armas E.G.O por Ahn (las equipadas no).', b.x + 2, b.y + 7, '#a09080', 7);
  const owned = EGO_WEAPONS.filter(w => W$.count(w.id));
  if (!owned.length) txt('No tienes armas E.G.O.', b.x + b.w / 2, b.y + 40, '#6a6070', 8, 'center');
  owned.forEach((w, i) => {
    const y = b.y + 11 + i * 10;
    rect(b.x, y, b.w, 9, i % 2 ? '#14101a' : '#18141e');
    riskChip(w.risk, b.x + 2, y + 1, 26);
    txt(w.name, b.x + 32, y + 7, '#e8e4dc', 8);
    txt(`x${W$.count(w.id)}`, b.x + 100, y + 7, '#a09080', 7);
    const ok = W$.free(w.id) > 0;
    hubButton(b.x + b.w - 54, y + 1, 52, 8, ok ? `+${RISK[w.risk].sell}` : 'EQUIPADA', () => sellWeapon(w.id), ok, '#a08030');
  });
  const y = b.y + b.h - 15;
  rect(b.x, y - 3, b.w, 1, '#3a2418');
  txt(`Cambiar ${PULL_COST} Enkephalina`, b.x + 2, y + 6, '#c8fff0', 8);
  txt(`→ ${PULL_COST * ENK_TO_AHN} Ahn`, b.x + 2, y + 13, '#ffe8b0', 7);
  hubButton(b.x + b.w - 54, y, 52, 12, 'CAMBIAR', exchangeEnk, W$.enk() >= PULL_COST, '#a08030');
}

// ---- extraction reveal: the box shakes and glows in the colour of the best
// result, then the weapons flip in one by one
function drawPull(t) {
  const P = G.pull, now = performance.now(), el = now - P.start;
  const n = P.out.length, charge = 1100;
  ctx.globalAlpha = 0.9; rect(-OX, 0, VW, H, '#050308'); ctx.globalAlpha = 1;
  const bestCol = RISK[P.best].col;
  if (el < charge) {
    const k = el / charge, sh = Math.round((Math.random() - 0.5) * (2 + k * (P.best === 'ALEPH' ? 8 : 4)));
    light(160, 90, 30 + k * 60, 20 + k * 40, k > 0.5 ? bestCol : '#ffe8b0', 0.2 + k * 0.4, 4);
    rect(140 + sh, 74, 40, 32, '#2a2a30'); rect(140 + sh, 74, 40, 2, '#5a5a62'); rect(156 + sh, 86, 8, 6, bestCol);
    for (let i = 0; i < 4; i++) rect(144 + sh + i * 9, 78, 2, 24, '#1a1a1e');
    if (k > 0.85 && !P.flashed) { P.flashed = true; G.flash = { color: P.best === 'ALEPH' ? '#ff4050' : '#ffffff', start: now, ms: 260 }; if (RISK_ORDER.indexOf(P.best) >= 3) shake(400); }
    return;
  }
  const gap = n === 1 ? 0 : 130;
  const shown = Math.min(n, Math.floor((el - charge) / gap) + 1);
  while (P.shown < shown) {
    const r = P.out[P.shown++], lvl = RISK_ORDER.indexOf(r.w.risk);
    SFX.play(lvl >= 4 ? 'aleph' : lvl >= 2 ? 'rare' : 'dice');
  }
  const cw = n === 1 ? 70 : 52, ch = n === 1 ? 88 : 60;
  P.out.forEach((r, i) => {
    if (i >= shown) return;
    const col = i % 5, row = Math.floor(i / 5);
    const x = n === 1 ? 160 - cw / 2 : 160 - (5 * cw + 4 * 6) / 2 + col * (cw + 6);
    const y = n === 1 ? 36 : 22 + row * (ch + 8);
    const age = Math.min(1, (el - charge - i * gap) / 160);
    const w = r.w, c = egoCol(w), lvl = RISK_ORDER.indexOf(w.risk);
    ctx.save();
    ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(Math.max(0.05, age), 1); ctx.translate(-(x + cw / 2), -(y + ch / 2));
    if (lvl >= 2) light(x + cw / 2, y + ch / 2, cw * 0.7, ch * 0.6, c, 0.15 + 0.05 * Math.sin(t / 200), 3);
    rrect(x, y, cw, ch, c, 2);
    rect(x + 1, y + 1, cw - 2, ch - 2, '#100c14');
    rect(x + 1, y + 1, cw - 2, 2, c);
    egoIcon(w.kind, x + cw / 2, y + ch * 0.42, n === 1 ? 2.6 : 1.8, c);
    riskChip(w.risk, x + cw / 2 - 14, y + ch - 20, 28);
    const nl = wrap(w.name, cw - 4, 7);
    nl.slice(0, 2).forEach((ln, j) => txt(ln, x + cw / 2, y + ch - 9 + j * 6 - (nl.length > 1 ? 3 : 0), '#f0e8d8', 7, 'center'));
    if (r.isNew) { rrect(x + 2, y + 4, 22, 7, '#ffd060', 2); txt('NUEVO', x + 13, y + 10, '#16121a', 7, 'center'); }
    ctx.restore();
  });
  if (n === 1 && shown) {
    const w = P.out[0].w;
    wrap(w.desc, 200, 8).slice(0, 3).forEach((ln, i) => txt(ln, 160, 136 + i * 8, '#d8d0c0', 8, 'center'));
  }
  if (shown >= n && Math.floor(t / 450) % 2) txt(IS_TOUCH ? 'Toca para continuar' : 'Clic para continuar', 160, 174, '#ffd060', 8, 'center');
}
function pullClick() {
  const P = G.pull;
  if (!P) return;
  const el = performance.now() - P.start, gap = P.out.length === 1 ? 0 : 130;
  // first click skips to the full reveal, the next one closes it
  if (el < 1100 + (P.out.length - 1) * gap + 160) P.start = performance.now() - 1100 - P.out.length * gap - 200;
  else { G.pull = null; SFX.play('select'); }
}

// ---------------------------------------------------------------------
//  Mejoras: equipping (the screen itself lives in mejoras.js)
// ---------------------------------------------------------------------
function equipWeapon(who, id) {
  const eq = { ...W$.equip() };
  if (id && eq[who] !== id && W$.free(id) <= 0) {
    // the only copy is on the other one: move it over
    const other = Object.keys(eq).find(k => eq[k] === id);
    if (other) delete eq[other];
  }
  if (id) eq[who] = id; else delete eq[who];
  SAVE.save({ ego_eq: eq });
  SFX.play(id ? 'confirm' : 'select');
}

// ---------------------------------------------------------------------
//  Episode rewards notice on the hub
// ---------------------------------------------------------------------
function drawHubNotice(t) {
  const N = G.notice;
  if (!N) return;
  const k = (performance.now() - N.start) / 4000;
  if (k >= 1) { G.notice = null; return; }
  const y = 14 - (k < 0.06 ? (1 - k / 0.06) * 18 : 0);
  ctx.globalAlpha = k > 0.9 ? (1 - k) / 0.1 : 1;
  const col = N.locked ? '#ff6a78' : '#5ae0c0';
  ctx.font = '8px VT323, monospace';
  const w = Math.max(160, Math.ceil(ctx.measureText(N.text).width) + 20);
  rrect(160 - w / 2, y, w, 14, N.locked ? '#1a0a10' : '#0a1a16', 2); rect(160 - w / 2, y, w, 1, col);
  rect(160 - w / 2 + 6, y + 5, 4, 4, col);
  txt(N.text, 160 - w / 2 + 14, y + 10, N.locked ? '#ffc8d0' : '#c8fff0', 8);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------
//  Mini raid (testing): repeatable fights that pay Enkephalina
// ---------------------------------------------------------------------
const RAIDS = [
  { set: 'tut_skeletons', name: 'Esqueletos cableados', place: 'Pasillo de la sucursal', reward: 150, skulls: 1 },
  { set: 'machine', name: 'E.G.O Extraction Machine', place: 'Celda de contención', reward: 250, skulls: 2 },
  { set: 'corrupted', name: 'Empleado distorsionado', place: 'Callejón del Distrito D', reward: 400, skulls: 3 },
  { set: 'operator', name: 'The Disconnected Operator', place: 'Celda de contención', reward: 500, skulls: 4 },
];
function startRaid(r) {
  SFX.play('confirm');
  startCombat({ id: r.set, ...COMBAT_SETS[r.set], tutorial: false, raid: r.reward });
}
function drawRaidPanel(t) {
  G.hubHits = [];
  const { x: mx, y: my, w: mw, h: mh } = MAP_PANEL;
  const x = mx, w = 312 - mx;
  rect(x, my, w, mh, '#0c0a14'); rect(x, my, w, 1, '#4a3018');
  rect(x, my, w, 12, '#18141e');
  txt('MINI RAID · PRUEBAS', x + 6, my + 9, '#c09050', 9);
  drawWallet(x + w - 74, my + 3);
  txt('Combates repetibles que dan Enkephalina para el Gacha.', x + 6, my + 21, '#8a8070', 7);
  RAIDS.forEach((r, i) => {
    const y = my + 26 + i * 27, h = 24;
    const hv = hubHit(x + 4, y, w - 8, h, () => startRaid(r));
    rect(x + 4, y, w - 8, h, hv ? '#2a1420' : '#16121c');
    rect(x + 4, y, 2, h, hv ? '#ff6a78' : '#c0283a');
    txt(r.name, x + 10, y + 9, hv ? '#ffffff' : '#e8e4dc', 8);
    txt(r.place, x + 10, y + 18, '#6a6070', 7);
    for (let k = 0; k < 4; k++) txt('☠', x + 128 + k * 8, y + 15, k < r.skulls ? '#ff4a5a' : '#2a2430', 9, 'center');
    rect(x + w - 66, y + 7, 4, 4, '#5ae0c0');
    txt(`+${r.reward}`, x + w - 59, y + 12, '#c8fff0', 8);
    txt(hv ? 'LUCHAR ▶' : '', x + w - 10, y + 20, '#ffd060', 7, 'right');
  });
  txt(`Victorias: ${SAVE.get('raid_wins', 0)}`, x + 6, my + mh - 4, '#5d5850', 7);
}

// ---------------------------------------------------------------------
//  Workshop: unlocked by the story. What it will hold (designed later):
//  selling E.G.O weapons for Ahn, buying and upgrading equipment with Ahn,
//  and special bullets with effects for Gonza.
// ---------------------------------------------------------------------
const WORKSHOP_PLAN = [
  ['VENDER ARMAS E.G.O', 'Cambia las armas E.G.O que no uses por Ahn.'],
  ['EQUIPAMIENTO', 'Compra equipamiento para las ranuras de Mejoras.'],
  ['MEJORAR', 'Sube de nivel el equipamiento que ya tienes.'],
  ['BALAS ESPECIALES', 'Munición con efectos para la pistola de Gonza.'],
];
function drawTaller(t) {
  G.hubHits = [];
  drawWide(() => drawHubBackdrop(t), 'hub');
  ctx.globalAlpha = 0.88; rect(-OX, 0, VW, NAV_Y, '#07050c'); ctx.globalAlpha = 1;
  metalFrame(4, 4, W - 8, NAV_Y - 8);
  lbTitle('WORKSHOP', 14, 22, 12, LB.goldHi, 120);
  drawWallet(240, 14);
  WORKSHOP_PLAN.forEach(([title, desc], i) => {
    const x = 14 + (i % 2) * 150, y = 34 + Math.floor(i / 2) * 50;
    lbPanel(x, y, 142, 44, { accent: i % 2 ? LB.red : LB.gold });
    lbNum(title, x + 6, y + 13, LB.goldHi, 9);
    wrap(desc, 130, 7).forEach((ln, k) => txt(ln, x + 6, y + 23 + k * 7, LB.mute, 7));
    lbSkew(x + 84, y + 32, 54, 9, '#0c0a09', LB.line, 3);
    txt('PRÓXIMAMENTE', x + 111, y + 39, LB.dim, 7, 'center');
  });
  txt('Los Ahn se ganan vendiendo armas E.G.O.', 160, 142, LB.mute, 7, 'center');
}
