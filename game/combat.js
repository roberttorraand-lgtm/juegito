// =====================================================================
//  COMBAT — Library of Ruina dice rules with a Limbus Company layout.
//  Every die on a page is its own move: it rolls within its range and
//  is compared one by one against the opposing page's dice.
// =====================================================================
const DIE = {
  slash:  { col: '#e85a3a', off: true,  name: 'Corte' },
  pierce: { col: '#e8a03a', off: true,  name: 'Perforación' },
  blunt:  { col: '#d8506e', off: true,  name: 'Contundente' },
  block:  { col: '#4a8ad8', off: false, name: 'Bloqueo' },
  evade:  { col: '#4ac08a', off: false, name: 'Esquiva' },
};
const DIE_ICON = {
  slash:  ['....#', '...#.', '..#..', '.#...', '#....'],
  pierce: ['..#..', '...#.', '#####', '...#.', '..#..'],
  blunt:  ['####.', '####.', '..#..', '..#..', '..#..'],
  block:  ['#####', '#####', '#####', '.###.', '..#..'],
  evade:  ['..#.#', '.#.#.', '#.#..', '.#.#.', '..#.#'],
};

const COMBAT_UNITS = {
  lobelto: {
    id: 'lobelto', name: 'LOBELTO', team: 'ally', maxHp: 60, maxSt: 32, speed: [2, 6], nDice: 1,
    hat: 'headset', armless: true, bandaged: true, bx: 62, by: 96, scale: 1.3,
    pages: [
      { name: 'Puñetazo desesperado', dice: [['blunt', 4, 7], ['blunt', 3, 6]] },
      { name: 'Cabezazo táctico', dice: [['blunt', 5, 9]] },
      { name: 'Esquivar y gritar', dice: [['evade', 3, 6], ['blunt', 2, 4]] },
      { name: 'Cubrirse', dice: [['block', 4, 7], ['block', 3, 5]] },
    ],
  },
  gonza: {
    id: 'gonza', name: 'GONZA', team: 'ally', maxHp: 65, maxSt: 34, speed: [3, 7], nDice: 1,
    hat: 'cap', bx: 104, by: 110, scale: 1.3,
    pages: [
      { name: 'Patada lateral', dice: [['blunt', 4, 7], ['blunt', 3, 6]] },
      { name: 'Golpe con tubo', dice: [['blunt', 6, 10]] },
      { name: 'Combo callejero', dice: [['blunt', 3, 5], ['blunt', 3, 5], ['blunt', 3, 6]] },
      { name: 'Guardia firme', dice: [['block', 5, 8], ['blunt', 3, 5]] },
    ],
  },
  corrupted: {
    id: 'corrupted', name: 'EMPLEADO', team: 'enemy', maxHp: 55, maxSt: 28, speed: [1, 5], nDice: 2,
    kind: 'corrupted', bx: 248, by: 106, scale: 1,
    pages: [
      { name: 'Tajo dentado', dice: [['slash', 4, 8], ['slash', 3, 7]] },
      { name: 'Embestida ciega', dice: [['blunt', 7, 11]] },
      { name: 'Grito distorsionado', dice: [['pierce', 2, 5], ['pierce', 2, 5], ['pierce', 2, 5]] },
      { name: 'Coraza E.G.O.', dice: [['block', 5, 9], ['slash', 4, 7]] },
    ],
  },
};

const CB = {
  active: false, turn: 0, phase: 'select',
  allies: [], enemies: [], all: [], dice: [],
  sel: null, view: null, hits: [], mouse: null,
  animating: false, anims: [],
};

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const alive = (u) => u.hp > 0;
const canAct = (u) => u.hp > 0 && !u.staggered;
const allyDice = () => CB.dice.filter(d => d.unit.team === 'ally');
const enemyDice = () => CB.dice.filter(d => d.unit.team === 'enemy');
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function makeUnit(t) { return { ...t, hp: t.maxHp, st: t.maxSt, staggered: false, staggerTurns: 0 }; }

// ---------------------------------------------------------------------
//  Turn flow
// ---------------------------------------------------------------------
function startCombatTest() {
  G.mode = 'combat';
  ui.hub.classList.add('hidden');
  hideAllOverlays();
  G.s = { bg: 'arena' }; G.actors = {}; G.fade = 0;
  CB.active = true; CB.turn = 0; CB.anims = []; CB.view = null; CB.animating = false;
  CB.allies = [makeUnit(COMBAT_UNITS.lobelto), makeUnit(COMBAT_UNITS.gonza)];
  CB.enemies = [makeUnit(COMBAT_UNITS.corrupted)];
  CB.all = [...CB.allies, ...CB.enemies];
  for (const u of CB.all) {
    G.actors[u.id] = {
      x: u.bx, y: u.by, face: u.team === 'ally' ? 1 : -1, scale: u.scale,
      hat: u.hat, armless: u.armless, bandaged: u.bandaged, kind: u.kind,
    };
  }
  ui.combatUI.classList.remove('hidden');
  newTurn();
  renderCombatUI();
  SFX.play('select');
}

function newTurn() {
  CB.turn++;
  CB.phase = 'select';
  CB.dice = [];
  for (const u of CB.all) {
    if (!alive(u)) continue;
    for (let k = 0; k < u.nDice; k++)
      CB.dice.push({ unit: u, k, speed: u.staggered ? 0 : rnd(...u.speed), page: null, target: null, used: false });
  }
  const targets = allyDice().filter(d => alive(d.unit));
  for (const d of enemyDice()) {
    if (!canAct(d.unit)) continue;
    d.page = d.unit.pages[rnd(0, d.unit.pages.length - 1)];
    d.target = targets[rnd(0, targets.length - 1)] || null;
  }
  CB.sel = allyDice().find(d => canAct(d.unit)) || null;
  spawnAnim('text', 160, 72, `TURNO ${CB.turn}`, '#e8c060', 1200, { big: true });
}

function selectDie(d) {
  if (CB.phase !== 'select' || !canAct(d.unit)) return;
  CB.sel = d;
  SFX.play('select');
}

function assignPage(page) {
  const d = CB.sel;
  if (!d) return;
  d.page = page;
  if (!d.target) {
    const foes = enemyDice().filter(e => canAct(e.unit));
    d.target = foes.find(e => e.target === d)
      || foes.find(e => !allyDice().some(a => a.target === e))
      || foes[0] || null;
  }
  const next = allyDice().find(a => canAct(a.unit) && !a.page);
  if (next) CB.sel = next;
  SFX.play('select');
}

function targetDie(e) {
  const d = CB.sel;
  if (!d || !canAct(e.unit)) return;
  d.target = e;
  SFX.play('select');
}

function checkEnd() {
  return CB.enemies.every(u => !alive(u)) || CB.allies.every(u => !alive(u));
}

async function combatExecute() {
  if (CB.animating || CB.phase !== 'select') return;
  CB.animating = true;
  CB.phase = 'resolve';
  SFX.play('select');

  const acts = CB.dice
    .filter(d => d.page && canAct(d.unit))
    .sort((a, b) => b.speed - a.speed || (a.unit.team === 'ally' ? -1 : 1));

  for (const d of acts) {
    if (d.used || !canAct(d.unit)) continue;
    d.used = true;
    if (d.unit.team === 'ally') {
      const e = d.target;
      if (e && !e.used && e.page && canAct(e.unit)) { e.used = true; await doClash(d, e); }
      else {
        const foe = (e && alive(e.unit)) ? e.unit : CB.enemies.find(alive);
        if (foe) await doOneSided(d, foe);
      }
    } else {
      // an ally that targeted this die always clashes with it, even if slower
      const opp = CB.dice.find(a => a.unit.team === 'ally' && a.target === d && !a.used && a.page && canAct(a.unit));
      if (opp) { opp.used = true; await doClash(opp, d); }
      else {
        const tu = d.target && alive(d.target.unit) ? d.target.unit : CB.allies.find(alive);
        if (tu) await doOneSided(d, tu);
      }
    }
    if (checkEnd()) break;
    await delay(250);
  }
  CB.view = null;
  endTurn();
}

function endTurn() {
  for (const u of CB.all) {
    if (!u.staggered || !alive(u)) continue;
    if (--u.staggerTurns <= 0) {
      u.staggered = false;
      u.st = u.maxSt;
      const p = headPos(u);
      spawnAnim('text', p.x, p.y - 8, 'Recuperado', '#4ac08a', 1000);
    }
  }
  if (checkEnd()) {
    CB.phase = 'done';
    SFX.play(CB.enemies.every(u => !alive(u)) ? 'gacha' : 'disconnect');
    renderCombatUI();
  } else {
    newTurn();
  }
  CB.animating = false;
}

function endCombat() {
  CB.active = false;
  ui.combatUI.classList.add('hidden');
  ui.combatUI.innerHTML = '';
  cv.style.cursor = 'default';
  G.actors = {};
  showHub();
}

// ---------------------------------------------------------------------
//  Dice resolution
// ---------------------------------------------------------------------
// 1 = A wins, -1 = B wins, 0 = draw. An evade that ties an attack wins.
function diceWinner(ta, ra, tb, rb) {
  if (ra > rb) return 1;
  if (rb > ra) return -1;
  if (ta === 'evade' && DIE[tb].off) return 1;
  if (tb === 'evade' && DIE[ta].off) return -1;
  return 0;
}

function resolveDice(A, ta, ra, B, tb, rb) {
  const stay = { a: false, b: false };
  const w = diceWinner(ta, ra, tb, rb);
  if (w === 0) {
    const pa = headPos(A), pb = headPos(B);
    spawnAnim('text', (pa.x + pb.x) / 2, Math.min(pa.y, pb.y) - 12, 'EMPATE', '#a39c90', 700);
    SFX.play('hit');
    return stay;
  }
  const [Wn, L, tw, tl, rw, rl] = w > 0 ? [A, B, ta, tb, ra, rb] : [B, A, tb, ta, rb, ra];
  const diff = rw - rl;
  if (DIE[tw].off) {
    const dmg = tl === 'block' ? diff : rw;
    dealDamage(L, dmg, dmg);
  } else if (tw === 'block') {
    dealDamage(L, 0, diff);
  } else {
    recoverSt(Wn, rw);
    if (w > 0) stay.a = true; else stay.b = true;
  }
  return stay;
}

function headPos(u) {
  const a = G.actors[u.id] || { x: u.bx, y: u.by };
  const s = u.scale * (u.hat === 'cap' ? 0.86 : 1);
  return { x: a.x, y: a.y - (u.kind ? 72 : 42) * s };
}

function dealDamage(u, hpD, stD) {
  if (!alive(u)) return;
  if (u.staggered) hpD *= 2;
  u.hp = Math.max(0, u.hp - hpD);
  if (!u.staggered && stD > 0) u.st = Math.max(0, u.st - stD);
  const p = headPos(u);
  if (hpD > 0) spawnAnim('dmg', p.x, p.y, `-${hpD}`, '#ff4a5a', 1100, { big: hpD >= 10 });
  if (stD > 0 && !u.staggered) spawnAnim('text', p.x + 10, p.y + 10, `-${stD}`, '#ffd060', 900);
  spawnAnim('impact', p.x, p.y + 16, '', hpD > 0 ? '#ffffff' : '#ffd060', 350);
  SFX.play(hpD > 0 ? 'slash' : 'hit');
  u._hurt = performance.now() + 300;
  if (hpD > 0) G.flash = { color: u.team === 'ally' ? '#ff2a3c' : '#ffffff', start: performance.now(), ms: 160 };
  if (u.hp <= 0) {
    spawnAnim('text', p.x, p.y - 10, 'K.O.', '#ff4a5a', 1400, { big: true });
  } else if (!u.staggered && u.st <= 0) {
    u.staggered = true;
    u.staggerTurns = 2;
    spawnAnim('text', p.x, p.y - 10, 'STAGGER', '#ff4a5a', 1400, { big: true });
    SFX.play('scream');
    G.shakeUntil = performance.now() + 400;
  }
}

function recoverSt(u, v) {
  u.st = Math.min(u.maxSt, u.st + v);
  const p = headPos(u);
  spawnAnim('text', p.x, p.y - 4, 'ESQUIVA', '#4ac08a', 800);
  spawnAnim('text', p.x + 10, p.y + 8, `+${v}`, '#4ac08a', 800);
  SFX.tone(880, 0.08, 'triangle', 0.04);
}

function rollFx(u, type, r) {
  const p = headPos(u);
  spawnAnim('text', p.x, p.y - 14, String(r), DIE[type].col, 800, { big: true });
  SFX.tone(500 + r * 40, 0.05, 'square', 0.02);
}

function side(d) { return { unit: d.unit, page: d.page, i: 0, roll: null }; }

async function doClash(ad, ed) {
  const A = ad.unit, E = ed.unit;
  const sa = side(ad), se = side(ed);
  CB.view = { left: sa, right: se };
  await Promise.all([animateSlide(A.id, 136, 280), animateSlide(E.id, 196, 280)]);
  spawnAnim('text', 166, 44, '¡CHOQUE!', '#ffd060', 800, { big: true });
  SFX.play('hit');
  await delay(400);

  const qa = ad.page.dice, qe = ed.page.dice;
  while (sa.i < qa.length && se.i < qe.length && canAct(A) && canAct(E)) {
    const [ta, a1, a2] = qa[sa.i], [te, e1, e2] = qe[se.i];
    sa.roll = rnd(a1, a2); se.roll = rnd(e1, e2);
    rollFx(A, ta, sa.roll); rollFx(E, te, se.roll);
    await delay(500);
    const stay = resolveDice(A, ta, sa.roll, E, te, se.roll);
    await delay(500);
    if (!stay.a) sa.i++;
    if (!stay.b) se.i++;
    sa.roll = null; se.roll = null;
  }
  await leftovers(sa, E);
  await leftovers(se, A);
  await Promise.all([animateSlide(A.id, A.bx, 250), animateSlide(E.id, E.bx, 250)]);
}

async function doOneSided(d, T) {
  const s = side(d);
  const def = { unit: T, page: null, i: 0, roll: null };
  CB.view = d.unit.team === 'ally' ? { left: s, right: def } : { left: def, right: s };
  const tx = T.team === 'ally' ? T.bx + 40 : T.bx - 40;
  await animateSlide(d.unit.id, tx, 300);
  await delay(250);
  await leftovers(s, T);
  await animateSlide(d.unit.id, d.unit.bx, 250);
}

// Remaining offensive dice hit unopposed; defensive leftovers are discarded.
async function leftovers(s, T) {
  const U = s.unit;
  while (s.i < s.page.dice.length && canAct(U) && alive(T)) {
    const [ty, a, b] = s.page.dice[s.i];
    if (DIE[ty].off) {
      s.roll = rnd(a, b);
      rollFx(U, ty, s.roll);
      await delay(400);
      dealDamage(T, s.roll, s.roll);
      await delay(450);
    }
    s.roll = null;
    s.i++;
  }
}

// ---------------------------------------------------------------------
//  Auto assignment (the "Ganar" / "Daño" buttons)
// ---------------------------------------------------------------------
function winRate(pa, pb, n = 200) {
  let wins = 0;
  for (let k = 0; k < n; k++) {
    let ia = 0, ib = 0, sa = 0, sb = 0;
    while (ia < pa.dice.length && ib < pb.dice.length) {
      const [ta, a1, a2] = pa.dice[ia], [tb, b1, b2] = pb.dice[ib];
      const w = diceWinner(ta, rnd(a1, a2), tb, rnd(b1, b2));
      if (w > 0) { sa++; if (ta === 'evade') { ib++; continue; } }
      if (w < 0) { sb++; if (tb === 'evade') { ia++; continue; } }
      ia++; ib++;
    }
    sa += pa.dice.slice(ia).filter(([t]) => DIE[t].off).length;
    sb += pb.dice.slice(ib).filter(([t]) => DIE[t].off).length;
    if (sa > sb) wins++;
  }
  return wins / n;
}

function expDamage(pg) {
  return pg.dice.reduce((s, [t, a, b]) => s + (DIE[t].off ? (a + b) / 2 : 0), 0);
}

function autoAssign(mode) {
  if (CB.phase !== 'select') return;
  const used = new Set();
  const foes = enemyDice().filter(e => canAct(e.unit) && e.page);
  for (const d of allyDice()) {
    if (!canAct(d.unit) || !foes.length) continue;
    let best = null, bestScore = -Infinity;
    for (const pg of d.unit.pages) for (const e of foes) {
      let score = mode === 'win' ? winRate(pg, e.page) : expDamage(pg);
      if (used.has(e)) score -= mode === 'win' ? 0.5 : 20;
      if (e.target === d) score += mode === 'win' ? 0.05 : 0.5;
      if (score > bestScore) { bestScore = score; best = [pg, e]; }
    }
    d.page = best[0]; d.target = best[1];
    used.add(best[1]);
  }
  SFX.play('select');
}

// ---------------------------------------------------------------------
//  HUD drawing (canvas)
// ---------------------------------------------------------------------
function txt(s, x, y, col, size = 8, align = 'left') {
  ctx.font = `${size}px VT323, monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}

function hexPath(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return p;
}
function hex(cx, cy, r, fill, border) {
  if (border) poly(hexPath(cx, cy, r + 1), border);
  poly(hexPath(cx, cy, r), fill);
}

function dieIcon(type, x, y, col) {
  const g = DIE_ICON[type];
  ctx.fillStyle = col || DIE[type].col;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++)
    if (g[r][c] === '#') ctx.fillRect((x | 0) + c, (y | 0) + r, 1, 1);
}

function speedBadge(x, y, v) {
  disc(x, y, 4, v ? '#d8d0c0' : '#8a2030');
  disc(x, y, 3, '#121018');
  txt(v ? String(v) : 'X', x + 0.5, y + 3, v ? '#fff' : '#ff4a5a', 8, 'center');
}

function hot(x, y, w, h) {
  const m = CB.mouse;
  return !!m && m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
}
function hitArea(x, y, w, h, fn, data) {
  const r = { x, y, w, h, fn, data, hot: hot(x, y, w, h) };
  CB.hits.push(r);
  return r.hot;
}

function wrap(s, maxW, size) {
  ctx.font = `${size}px VT323, monospace`;
  const lines = [];
  let cur = '';
  for (const w of s.split(' ')) {
    const test = cur ? cur + ' ' + w : w;
    if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function tokenPos(d) {
  const u = d.unit;
  if (u.team === 'enemy') return { x: 192, y: 44 + d.k * 26 };
  const s = u.scale * (u.hat === 'cap' ? 0.86 : 1);
  return { x: u.bx, y: Math.round(u.by - 40 * s - 11) };
}

function arrowHead([x, y], [qx, qy], col) {
  const a = Math.atan2(y - qy, x - qx);
  poly([
    [x + Math.cos(a) * 3, y + Math.sin(a) * 3],
    [x + Math.cos(a + 2.5) * 4, y + Math.sin(a + 2.5) * 4],
    [x + Math.cos(a - 2.5) * 4, y + Math.sin(a - 2.5) * 4],
  ], col);
}

function arc(x0, y0, x1, y1, col, t, both) {
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 14 - Math.abs(x1 - x0) * 0.12;
  const P = (s) => [
    (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * mx + s * s * x1,
    (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * my + s * s * y1,
  ];
  const len = Math.hypot(x1 - x0, y1 - y0) + Math.abs(my - y0);
  const s0 = Math.min(0.3, 12 / len), s1 = 1 - s0;
  const n = Math.max(24, Math.round(len * 1.4));
  for (let i = 0; i <= n; i++) {
    const s = s0 + (s1 - s0) * (i / n);
    const [x, y] = P(s);
    rect(x, y + 1, 1, 1, '#000');
    const flow = (((i - t / 25) % 9) + 9) % 9;
    rect(x, y, 1, 1, flow < 6 ? col : '#ffffff');
  }
  arrowHead(P(s1), P(s1 - 0.05), col);
  if (both) arrowHead(P(s0), P(s0 + 0.05), col);
  return P(0.5);
}

function clashMark(x, y, t) {
  light(x, y, 7, 7, '#ffd060', 0.35 + 0.15 * Math.sin(t / 150), 3);
  line(x - 3, y - 3, x + 3, y + 3, '#fff');
  line(x + 3, y - 3, x - 3, y + 3, '#fff');
}

function drawArrows(t) {
  for (const e of enemyDice()) {
    if (!e.page || !e.target || !canAct(e.unit)) continue;
    if (e.target.target === e && e.target.page) continue;
    const p0 = tokenPos(e), p1 = tokenPos(e.target);
    arc(p0.x, p0.y, p1.x, p1.y, '#ff4050', t);
  }
  for (const d of allyDice()) {
    if (!d.page || !d.target || !canAct(d.unit)) continue;
    const p0 = tokenPos(d), p1 = tokenPos(d.target);
    const m = arc(p0.x, p0.y, p1.x, p1.y, '#ffd060', t, d.target.target === d);
    clashMark(m[0], m[1], t);
  }
}

function drawToken(d, t) {
  const u = d.unit;
  if (!alive(u)) return;
  const { x, y } = tokenPos(d);
  const blink = Math.floor(t / 400) % 2;
  if (u.staggered) { txt('STAGGER', x, y + 3, blink ? '#ff4a5a' : '#8a2030', 9, 'center'); return; }
  const enemy = u.team === 'enemy';
  const sel = CB.sel === d && CB.phase === 'select';
  let hov = false;
  if (CB.phase === 'select') hov = hitArea(x - 10, y - 10, 20, 20, () => enemy ? targetDie(d) : selectDie(d), { page: d.page });
  if (sel || hov) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t / 150);
    hex(x, y, 12, sel ? '#ffd060' : '#ffffff');
    ctx.globalAlpha = 1;
  }
  hex(x, y, 9, d.page ? '#1e1418' : '#121016', enemy ? '#c0283a' : sel ? '#ffd060' : '#8a6030');
  if (d.page) {
    dieIcon(d.page.dice[0][0], x - 2, y - 5);
    const n = d.page.dice.length;
    d.page.dice.forEach(([ty], k) => rect(x - n + k * 2, y + 3, 1, 2, DIE[ty].col));
    const [, a, b] = d.page.dice[0];
    txt(`${a}-${b}`, x - 12, y + 3, '#ffd060', 9, 'right');
  } else {
    txt('?', x, y + 3, '#6a6070', 10, 'center');
  }
  speedBadge(x + 9, y - 7, d.speed);
}

function allyPlate(u) {
  const a = G.actors[u.id];
  if (!a) return;
  const x = Math.round(a.x), y = u.by;
  rect(x - 16, y + 3, 32, 6, '#0a080e');
  const hp = u.hp / u.maxHp;
  rect(x - 15, y + 4, 30, 2, '#2a1418');
  rect(x - 15, y + 4, Math.round(30 * hp), 2, hp < 0.3 ? '#e03040' : '#3fbf6a');
  rect(x - 15, y + 7, 30, 1, '#2a2410');
  rect(x - 15, y + 7, Math.round(30 * u.st / u.maxSt), 1, '#e8c040');
  txt(String(u.hp), x - 18, y + 10, '#ff8a3a', 10, 'right');
}

function enemyPlate(u, t) {
  const x0 = 210, y0 = 108, w = 86;
  rect(x0, y0, w, 14, '#0a080e');
  rect(x0, y0, w, 1, '#5a1a24');
  rect(x0 + 2, y0 + 2, 22, 5, '#8a2030');
  txt('E.G.O.', x0 + 13, y0 + 7, '#ffe0e0', 7, 'center');
  txt(u.name, x0 + 27, y0 + 7, '#d8d0c0', 7);
  const hp = u.hp / u.maxHp;
  rect(x0 + 2, y0 + 9, w - 24, 2, '#2a1418');
  rect(x0 + 2, y0 + 9, Math.round((w - 24) * hp), 2, '#e03040');
  rect(x0 + 2, y0 + 12, w - 24, 1, '#2a2410');
  rect(x0 + 2, y0 + 12, Math.round((w - 24) * u.st / u.maxSt), 1, '#e8c040');
  txt(String(u.hp), x0 + w - 2, y0 + 13, '#ff8a3a', 10, 'right');
  if (u.staggered && Math.floor(t / 400) % 2) txt('STAGGER', x0 + w / 2, y0 - 3, '#ff4a5a', 9, 'center');
}

function gear(cx, cy, r, t, hov) {
  const teeth = 10, rot = t / 3000;
  const col = hov ? '#ffa04a' : '#e8702a';
  for (let k = 0; k < teeth; k++) {
    const a = rot + (k / teeth) * Math.PI * 2, da = 0.13;
    poly([
      [cx + Math.cos(a - da) * (r - 2), cy + Math.sin(a - da) * (r - 2)],
      [cx + Math.cos(a - da) * (r + 3), cy + Math.sin(a - da) * (r + 3)],
      [cx + Math.cos(a + da) * (r + 3), cy + Math.sin(a + da) * (r + 3)],
      [cx + Math.cos(a + da) * (r - 2), cy + Math.sin(a + da) * (r - 2)],
    ], col);
  }
  disc(cx, cy, r, col);
  disc(cx, cy, r - 4, '#3a1810');
  disc(cx, cy, r - 6, col);
  disc(cx, cy, 4, '#3a1810');
  if (hov) light(cx, cy, r + 6, r + 6, '#ff8a3a', 0.3, 3);
}

function smallBtn(x, y, w, h, label, fn) {
  const hv = hitArea(x, y, w, h, fn);
  rect(x, y, w, h, hv ? '#5a1a24' : '#2a1018');
  rect(x, y, w, 1, '#c0283a');
  rect(x, y + h - 1, w, 1, '#1a0810');
  txt(label, x + w / 2, y + h - 3, hv ? '#fff' : '#e8d0c0', 8, 'center');
}

function selectPanel(t) {
  const py = 124;
  rect(0, py, W, H - py, '#0c0a10');
  rect(0, py, W, 1, '#8a6030');
  rect(0, py + 1, W, 1, '#3a2418');

  allyDice().forEach((d, i) => {
    const cx = 22 + i * 38, u = d.unit, ok = canAct(u), sel = CB.sel === d;
    const pcy = 162, pr = 14;
    if (ok) hitArea(cx - 16, 126, 32, 54, () => selectDie(d));
    hex(cx, 138, 9, d.page ? '#1e1418' : '#121016', sel ? '#ffd060' : '#5a4030');
    if (d.page) dieIcon(d.page.dice[0][0], cx - 2, 134);
    else txt('+', cx, 141, '#5a5060', 10, 'center');
    if (sel) {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t / 150);
      hex(cx, pcy, pr + 2, '#ffd060');
      ctx.globalAlpha = 1;
    }
    hex(cx, pcy, pr, '#1a1622', sel ? '#ffd060' : ok ? '#8a6030' : '#3a3030');
    ctx.save();
    ctx.beginPath();
    hexPath(cx, pcy, pr).forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    ctx.translate(cx, pcy + 2); ctx.scale(0.6, 0.6); ctx.translate(-cx, -(pcy + 2));
    avatarHead(cx, pcy + 2, u.hat, t, !ok);
    ctx.restore();
    txt(String(u.hp), cx - 9, 179, '#ff8a3a', 9, 'center');
    speedBadge(cx + 11, 173, d.speed);
  });

  const d = CB.sel;
  if (d) {
    d.unit.pages.forEach((pg, i) => {
      const x = 90 + i * 39, w = 37, h = 50;
      const hv = hitArea(x, 127, w, h, () => assignPage(pg), { page: pg });
      const y = 127 - (hv ? 2 : 0);
      rrect(x, y, w, h, d.page === pg ? '#ffd060' : hv ? '#8a6a50' : '#3a2a24', 2);
      rect(x + 1, y + 1, w - 2, h - 2, '#16121a');
      rect(x + 1, y + 1, w - 2, 2, DIE[pg.dice[0][0]].col);
      wrap(pg.name, w - 4, 8).slice(0, 3).forEach((ln, k) => {
        ctx.font = '8px VT323, monospace';
        const size = ctx.measureText(ln).width > w - 4 ? 7 : 8;
        txt(ln, x + 2, y + 10 + k * 7, '#e8e4dc', size);
      });
      pg.dice.forEach(([ty, a, b], k) => {
        const ry = y + h - 9 - (pg.dice.length - 1 - k) * 7;
        dieIcon(ty, x + 3, ry - 3);
        txt(`${a}-${b}`, x + 10, ry + 2, '#d8d0c0', 8);
      });
    });
  }

  rect(252, 127, 36, 9, '#2a1810');
  rect(252, 127, 36, 1, '#8a6030');
  txt('INICIAR', 270, 134, '#ffd8a0', 8, 'center');
  const gh = hitArea(255, 140, 30, 32, combatExecute);
  gear(270, 156, 13, t, gh);
  smallBtn(290, 140, 28, 11, 'Ganar', () => autoAssign('win'));
  smallBtn(290, 156, 28, 11, 'Daño', () => autoAssign('dmg'));
}

function pageCard(s, x, y, w, enemyTeam) {
  const tc = enemyTeam ? '#ff5a6a' : '#ffd060';
  rect(x, y, w, 50, '#16121a');
  rect(x, y, w, 1, tc);
  txt(s.unit.name, x + 4, y + 9, tc, 8);
  if (!s.page) { txt('Sin defensa', x + 4, y + 20, '#8a8090', 9); return; }
  txt(s.page.name, x + 4, y + 17, '#e8e4dc', 8);
  s.page.dice.forEach(([ty, a, b], k) => {
    const bx = x + 4 + k * 31, by = y + 22;
    const cur = k === s.i, done = k < s.i;
    rrect(bx, by, 28, 25, cur ? DIE[ty].col : '#3a3240', 2);
    rect(bx + 1, by + 1, 26, 23, '#0e0c12');
    dieIcon(ty, bx + 3, by + 3, done ? '#3a3640' : null);
    txt(`${a}-${b}`, bx + 26, by + 8, done ? '#3a3640' : '#a39c90', 7, 'right');
    if (cur && s.roll != null) txt(String(s.roll), bx + 14, by + 22, '#fff', 16, 'center');
  });
}

function clashPanel() {
  const py = 124;
  rect(0, py, W, H - py, '#0c0a10');
  rect(0, py, W, 1, '#8a6030');
  const v = CB.view;
  if (!v) return;
  pageCard(v.left, 6, 128, 140, false);
  pageCard(v.right, 174, 128, 140, true);
  txt('VS', 160, 158, '#ffd060', 14, 'center');
}

function topBar() {
  rect(3, 3, 46, 11, '#0a080e');
  rect(3, 3, 46, 1, '#8a6030');
  txt(`TURNO ${CB.turn}`, 26, 12, '#e8c060', 9, 'center');
  if (CB.phase === 'select') txt('Elige una página y luego a quién atacar', 160, 12, '#a39c90', 8, 'center');
}

function tooltip() {
  const h = CB.hits.find(r => r.hot && r.data && r.data.page);
  if (!h) return;
  const pg = h.data.page;
  const bw = 108, bh = 14 + pg.dice.length * 9;
  const m = CB.mouse;
  const x = Math.round(Math.max(2, Math.min(W - bw - 2, m.x + 8)));
  let y = Math.round(m.y - bh - 6);
  if (y < 16) y = Math.round(m.y + 10);
  y = Math.min(y, H - bh - 2);
  rect(x, y, bw, bh, '#0c0a10');
  rect(x, y, bw, 1, '#8a6030');
  rect(x, y + bh - 1, bw, 1, '#3a2418');
  txt(pg.name, x + 4, y + 9, '#ffd060', 9);
  pg.dice.forEach(([ty, a, b], k) => {
    dieIcon(ty, x + 4, y + 12 + k * 9);
    txt(`${a}-${b}  ${DIE[ty].name}`, x + 12, y + 17 + k * 9, '#e8e4dc', 8);
  });
}

function refreshActors() {
  const now = performance.now();
  for (const u of CB.all) {
    const a = G.actors[u.id];
    if (!a) continue;
    if (!alive(u)) { delete G.actors[u.id]; continue; }
    a.shake = u.staggered || (u._hurt || 0) > now;
    a.pain = u.staggered;
    a.blind = u.staggered;
    a.rage = u.hp < u.maxHp * 0.3;
  }
}

function drawCombatHUD(t) {
  if (!CB.active) return;
  refreshActors();
  CB.hits = [];
  for (const u of CB.allies) if (alive(u)) allyPlate(u);
  for (const u of CB.enemies) if (alive(u)) enemyPlate(u, t);
  if (CB.phase === 'select') {
    drawArrows(t);
    for (const d of CB.dice) drawToken(d, t);
  }
  topBar();
  if (CB.phase === 'select') selectPanel(t); else clashPanel();
  tooltip();
  cv.style.cursor = CB.hits.some(h => h.hot) ? 'pointer' : 'default';
}

// ---------------------------------------------------------------------
//  Input + result overlay
// ---------------------------------------------------------------------
cv.addEventListener('mousemove', (e) => {
  if (G.mode !== 'combat') return;
  CB.mouse = canvasToLogical(e.clientX, e.clientY);
});
cv.addEventListener('mouseleave', () => { CB.mouse = null; });
cv.addEventListener('click', (e) => {
  if (G.mode !== 'combat' || !CB.active || CB.phase !== 'select') return;
  const p = canvasToLogical(e.clientX, e.clientY);
  CB.mouse = p;
  for (let i = CB.hits.length - 1; i >= 0; i--) {
    const r = CB.hits[i];
    if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) { SFX.init(); r.fn(); return; }
  }
});

function renderCombatUI() {
  if (CB.phase !== 'done') { ui.combatUI.innerHTML = ''; return; }
  const won = CB.enemies.every(u => !alive(u));
  ui.combatUI.innerHTML = `<div class="cb-result" style="border-color:${won ? 'var(--gold)' : '#ff3b4a'}">
    <div class="cb-result-title ${won ? 'win' : 'lose'}">${won ? 'VICTORIA' : 'DERROTA'}</div>
    <div class="cb-result-sub">${won ? 'El empleado distorsionado ha caído.' : 'Tu equipo ha sido derrotado...'}</div>
    <div class="cb-result-stats">Turnos: ${CB.turn}</div>
    <div class="cb-result-stats">${CB.allies.map(u => `${u.name}: ${u.hp}/${u.maxHp} HP`).join(' · ')}</div>
    <button class="cb-result-btn" data-act="combat-exit">Volver al Hub</button>
    <button class="cb-result-btn" data-act="combat-retry">Reintentar</button>
  </div>`;
  ui.combatUI.querySelector('[data-act="combat-exit"]').addEventListener('click', (e) => { e.stopPropagation(); endCombat(); });
  ui.combatUI.querySelector('[data-act="combat-retry"]').addEventListener('click', (e) => { e.stopPropagation(); startCombatTest(); });
}

function spawnAnim(type, x, y, text, color, ms, extra) {
  CB.anims.push({ type, x, y, text, color, start: performance.now(), ms, ...extra });
}

async function animateSlide(unitId, toX, durMs) {
  const actor = G.actors[unitId];
  if (!actor) return;
  const fromX = actor.x;
  const start = performance.now();
  return new Promise(resolve => {
    function step() {
      const k = Math.min(1, (performance.now() - start) / durMs);
      const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      actor.x = Math.round(fromX + (toX - fromX) * ease);
      if (k < 1) requestAnimationFrame(step); else resolve();
    }
    step();
  });
}
