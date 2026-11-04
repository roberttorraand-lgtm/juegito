// =====================================================================
//  COMBAT — Library of Ruina dice with a Limbus Company layout.
//
//  Pages: each ally draws pages from a Limbus-style rotation bag (Skill
//  I/II/III held 3/2/1 times). The hand starts with 2 pages; 1 page is
//  drawn per turn, 2 from turn 4 and 3 from turn 8. Pages cost Light.
//  Light: starts at 3, capacity +1 every 2 turns (up to 6). +1 Light for
//  the side that deals more damage in a page clash.
//  Dice: each die rolls within its range and is compared one by one.
//    attack vs attack → higher roll hits for its value
//    block            → a shield equal to the roll that soaks damage
//                       until the clash ends
//    evade            → if it ties or beats the attack, no damage at all
//    counter          → takes the hit, then strikes back unopposed
//  Stagger damage is 25% of the HP damage dealt, rounded up.
// =====================================================================
const DIE = {
  slash:   { col: '#e85a3a', off: true,  name: 'Corte' },
  pierce:  { col: '#e8a03a', off: true,  name: 'Perforación' },
  blunt:   { col: '#d8506e', off: true,  name: 'Contundente' },
  block:   { col: '#4a8ad8', off: false, name: 'Bloqueo' },
  evade:   { col: '#4ac08a', off: false, name: 'Esquiva' },
  counter: { col: '#c060e0', off: true,  name: 'Contraataque' },
};
const DIE_ICON = {
  slash:   ['....#', '...#.', '..#..', '.#...', '#....'],
  pierce:  ['..#..', '...#.', '#####', '...#.', '..#..'],
  blunt:   ['####.', '####.', '..#..', '..#..', '..#..'],
  block:   ['#####', '#####', '#####', '.###.', '..#..'],
  evade:   ['..#.#', '.#.#.', '#.#..', '.#.#.', '..#.#'],
  counter: ['..#..', '.##..', '#####', '.##.#', '..#.#'],
};
const kindOf = (t) => (t === 'block' || t === 'evade' || t === 'counter' ? t : 'off');

const SKILL_POOL = { 1: 3, 2: 2, 3: 1 };
const HAND_START = 2, HAND_MAX = 8;
const LIGHT_START = 3, LIGHT_CAP = 6;
const ST_RATIO = 0.25;
const drawsForTurn = (turn) => 1 + Math.min(2, Math.floor(turn / 4));
const lightCapForTurn = (turn) => Math.min(LIGHT_CAP, LIGHT_START + Math.floor((turn - 1) / 2));
const TIER = {
  0: { label: 'DEF', col: '#4a8ad8', cost: 0 },
  1: { label: 'I', col: '#d8b040', cost: 1 },
  2: { label: 'II', col: '#e87a30', cost: 2 },
  3: { label: 'III', col: '#e03040', cost: 3 },
  P: { label: '+', col: '#ffb040', cost: 0 },
};
const costOf = (page) => (TIER[page.tier] ? TIER[page.tier].cost : 0);

// Enemies with `pattern` play those page indexes in order, one row per turn;
// enemies without it pick their pages at random.
const COMBAT_UNITS = {
  lobelto: {
    id: 'lobelto', name: 'LOBELTO', team: 'ally', maxHp: 60, maxSt: 14, speed: [2, 6], nDice: 2,
    hat: 'headset', armless: true, bandaged: true, bx: 44, by: 102, scale: 0.85,
    pages: [
      { name: 'Puñetazo desesperado', tier: 1, dice: [['blunt', 3, 6], ['blunt', 2, 5]] },
      { name: 'Cabezazo táctico', tier: 2, dice: [['blunt', 5, 8], ['blunt', 3, 5]] },
      { name: 'Ataque a ciegas', tier: 3, dice: [['blunt', 6, 9], ['blunt', 4, 7]] },
    ],
    defense: { name: 'Esquivar y gritar', tier: 0, dice: [['evade', 3, 7], ['counter', 2, 5]] },
  },
  gonza: {
    id: 'gonza', name: 'GONZA', team: 'ally', maxHp: 65, maxSt: 16, speed: [3, 7], nDice: 1,
    hat: 'cap', bx: 92, by: 114, scale: 0.85,
    pages: [
      { name: 'Patada lateral', tier: 1, dice: [['blunt', 3, 6], ['blunt', 3, 5]] },
      { name: 'Combo callejero', tier: 2, dice: [['blunt', 3, 5], ['blunt', 3, 5], ['blunt', 3, 5]] },
      { name: 'Furia callejera', tier: 3, dice: [['blunt', 6, 10], ['blunt', 5, 8]] },
    ],
    defense: { name: 'Guardia firme', tier: 0, dice: [['block', 4, 8], ['counter', 3, 5]] },
  },
  // Distortion boss: three pages a turn, no pattern at all
  corrupted: {
    id: 'corrupted', name: 'EMPLEADO', tag: 'DIST.', tagCol: '#8a2030', team: 'enemy', maxHp: 80, maxSt: 22, speed: [1, 5], nDice: 3,
    kind: 'corrupted', bg: 'arena', height: 72, bx: 258, by: 106, scale: 0.58,
    defeat: 'El empleado distorsionado ha caído.',
    pages: [
      { name: 'Tajo dentado', dice: [['slash', 4, 8], ['slash', 3, 7]] },
      { name: 'Embestida ciega', dice: [['blunt', 7, 11]] },
      { name: 'Grito distorsionado', dice: [['pierce', 2, 5], ['pierce', 2, 5], ['pierce', 2, 5]] },
      { name: 'Coraza E.G.O.', dice: [['block', 5, 9], ['counter', 4, 7]] },
    ],
  },
  // ZAYIN: two pages a turn on a fixed cycle; its conveyor sometimes hands out a "forgotten piece"
  machine: {
    id: 'machine', name: 'E.G.O EXTRACTION MACHINE', tag: 'ZAYIN', tagCol: '#2a7a3a', team: 'enemy', maxHp: 80, maxSt: 18, speed: [1, 4], nDice: 2,
    kind: 'machine', bg: 'cell', height: 86, bx: 258, by: 106, scale: 0.58, givesPieces: 0.4,
    pattern: [[0, 1], [2, 3], [0, 2], [1, 3]],
    defeat: 'E.G.O Extraction Machine se apaga con un último chirrido.',
    pages: [
      { name: 'Prensa hidráulica', dice: [['blunt', 5, 9]] },
      { name: 'Cinta transportadora', dice: [['blunt', 2, 4], ['blunt', 2, 4], ['blunt', 2, 4]] },
      { name: 'Expulsar componente', dice: [['pierce', 3, 6], ['pierce', 2, 5]] },
      { name: 'Carcasa reforzada', dice: [['block', 5, 8], ['counter', 3, 5]] },
    ],
  },
  // TETH: four pages a turn on a fixed cycle; every 3rd turn it reboots and does nothing
  operator: {
    id: 'operator', name: 'THE DISCONNECTED OPERATOR', tag: 'TETH', tagCol: '#2a5aa0', team: 'enemy', maxHp: 110, maxSt: 26, speed: [3, 7], nDice: 4,
    kind: 'operator', bg: 'cell', height: 84, bx: 258, by: 106, scale: 0.58, reboot: 3,
    pattern: [[0, 2, 0, 1], [3, 0, 2, 0], [1, 3, 0, 2]],
    defeat: 'La pantalla de The Disconnected Operator se apaga para siempre.',
    pages: [
      { name: 'Latigazo de cable', dice: [['slash', 4, 7], ['slash', 3, 6]] },
      { name: 'Descarga', dice: [['pierce', 6, 10]] },
      { name: 'Enredo', dice: [['slash', 3, 5], ['slash', 3, 5], ['slash', 3, 5]] },
      { name: 'Sobrecarga', dice: [['pierce', 5, 9], ['counter', 4, 7]] },
    ],
  },
};
const FORGOTTEN_PIECE = { name: 'Pieza olvidada', tier: 'P', dice: [['pierce', 4, 8], ['pierce', 2, 5]] };

const CB = {
  active: false, turn: 0, phase: 'select',
  allies: [], enemies: [], all: [], dice: [],
  sel: null, view: null, hits: [], mouse: null,
  animating: false, anims: [], fx: [], parts: [], instant: false,
};

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const alive = (u) => u.hp > 0;
const canAct = (u) => u.hp > 0 && !u.staggered;
const allyDice = () => CB.dice.filter(d => d.unit.team === 'ally');
const enemyDice = () => CB.dice.filter(d => d.unit.team === 'enemy');
const diceOf = (u) => CB.dice.filter(d => d.unit === u);
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function makeUnit(t) {
  const u = { ...t, hp: t.maxHp, st: t.maxSt, staggered: false, staggerTurns: 0, shield: 0 };
  if (t.team === 'ally') {
    u.pool = [];
    u.hand = [];
    u.light = LIGHT_START;
    u.maxLight = LIGHT_START;
    u.defTurn = 0;
    drawPages(u, HAND_START);
  }
  return u;
}

// Rotation bag: Skill I/II/III held 3/2/1 times, rebuilt and reshuffled when empty.
function drawPages(u, n) {
  let drawn = 0;
  while (drawn < n && u.hand.length < HAND_MAX) {
    if (!u.pool.length) u.pool = shuffle(u.pages.flatMap(p => Array.from({ length: SKILL_POOL[p.tier] }, () => ({ page: p }))));
    u.hand.push(u.pool.pop());
    drawn++;
  }
  return drawn;
}

// ---------------------------------------------------------------------
//  Turn flow
// ---------------------------------------------------------------------
function startCombatTest(enemyId = 'corrupted') {
  G.mode = 'combat';
  ui.hub.classList.add('hidden');
  hideAllOverlays();
  G.s = { bg: COMBAT_UNITS[enemyId].bg }; G.actors = {}; G.fade = 0;
  CB.active = true; CB.turn = 0; CB.anims = []; CB.fx = []; CB.parts = []; CB.view = null; CB.animating = false;
  Music.play(MUSIC_FOR[enemyId]);
  CB.enemyId = enemyId;
  CB.allies = [makeUnit(COMBAT_UNITS.lobelto), makeUnit(COMBAT_UNITS.gonza)];
  CB.enemies = [makeUnit(COMBAT_UNITS[enemyId])];
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
  if (CB.turn > 1) {
    for (const u of CB.allies) {
      if (!alive(u)) continue;
      const p = headPos(u);
      const cap = lightCapForTurn(CB.turn);
      if (cap > u.maxLight) {
        u.maxLight = cap;
        u.light = Math.min(u.maxLight, u.light + 1);
        spawnAnim('text', p.x, p.y - 24, 'Luz máx. +1', '#ffe08a', 1400);
      }
      const n = drawPages(u, drawsForTurn(CB.turn));
      if (n) spawnAnim('text', p.x, p.y - 14, `+${n} página${n > 1 ? 's' : ''}`, '#e8d8b0', 1200);
    }
  }
  for (const u of CB.all) {
    if (!alive(u)) continue;
    for (let k = 0; k < u.nDice; k++)
      CB.dice.push({ unit: u, k, speed: u.staggered ? 0 : rnd(...u.speed), page: null, card: null, target: null, used: false });
  }
  for (const u of CB.enemies) {
    u.rebooting = !!(u.reboot && canAct(u) && CB.turn % u.reboot === 0);
    if (u.rebooting) {
      const p = headPos(u);
      spawnAnim('text', p.x, p.y - 4, 'REINICIANDO...', '#9ac0ff', 1600, { big: true });
      SFX.play('reboot');
    }
  }
  const targets = allyDice().filter(d => alive(d.unit));
  for (const d of enemyDice()) {
    const u = d.unit;
    if (!canAct(u) || u.rebooting) continue;
    const row = u.pattern && u.pattern[(CB.turn - 1) % u.pattern.length];
    d.page = u.pages[row ? row[d.k % row.length] : rnd(0, u.pages.length - 1)];
    d.target = targets[rnd(0, targets.length - 1)] || null;
  }
  CB.sel = allyDice().find(d => canAct(d.unit)) || null;
  spawnAnim('text', 160, 72, `TURNO ${CB.turn}`, '#e8c060', 1200, { big: true });
  SFX.play('turn');
}

function selectDie(d) {
  if (CB.phase !== 'select' || !canAct(d.unit)) return;
  CB.sel = d;
  SFX.play('select');
}

function unassign(d) {
  if (d.card) d.unit.light += costOf(d.card.page);
  d.card = null;
  d.page = null;
}

function canAfford(d, card) {
  return costOf(card.page) <= d.unit.light + (d.card ? costOf(d.card.page) : 0);
}

function autoTarget(d) {
  if (d.target) return;
  const foes = enemyDice().filter(e => canAct(e.unit));
  d.target = foes.find(e => e.target === d)
    || foes.find(e => !allyDice().some(a => a.target === e))
    || foes[0] || null;
}

function assignCard(d, card) {
  const other = diceOf(d.unit).find(x => x !== d && x.card === card);
  if (other) unassign(other);
  unassign(d);
  d.unit.light -= costOf(card.page);
  d.card = card;
  d.page = card.page;
  autoTarget(d);
}

// Clicking the page already on the selected die takes it back and refunds its Light.
function toggleCard(card) {
  const d = CB.sel;
  if (!d) return;
  if (d.card === card) { unassign(d); SFX.play('select'); return; }
  if (!canAfford(d, card)) { SFX.play('error'); return; }
  assignCard(d, card);
  const next = allyDice().find(a => canAct(a.unit) && !a.page);
  if (next) CB.sel = next;
  SFX.play('select');
}

// The portrait's defense button: once per turn it adds a free defensive page
// to the hand and puts it on a free die; pressing again takes it back off.
function defenseButton(u) {
  if (CB.phase !== 'select' || !canAct(u)) return;
  const onDie = diceOf(u).find(x => x.card && x.card.page === u.defense);
  if (onDie) { unassign(onDie); SFX.play('select'); return; }
  let card = u.hand.find(c => c.page === u.defense);
  if (!card) {
    if (u.defTurn === CB.turn || u.hand.length >= HAND_MAX) { SFX.play('error'); return; }
    card = { page: u.defense };
    u.hand.push(card);
    u.defTurn = CB.turn;
    const p = headPos(u);
    spawnAnim('text', p.x, p.y - 14, '+ página defensiva', '#9ac0ff', 1200);
  }
  const d = (CB.sel && CB.sel.unit === u && !CB.sel.card) ? CB.sel : diceOf(u).find(x => !x.card) || null;
  if (d) { CB.sel = d; assignCard(d, card); }
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
  SFX.play('confirm');

  for (const d of allyDice()) {
    if (d.card) d.unit.hand = d.unit.hand.filter(c => c !== d.card);
  }

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
    u.shield = 0;
    if (!u.staggered || !alive(u)) continue;
    if (--u.staggerTurns <= 0) {
      u.staggered = false;
      u.st = u.maxSt;
      const p = headPos(u);
      spawnAnim('text', p.x, p.y - 8, 'Recuperado', '#4ac08a', 1000);
    }
  }
  for (const e of CB.enemies) {
    e.rebooting = false;
    if (!e.givesPieces || !alive(e) || Math.random() >= e.givesPieces) continue;
    const takers = CB.allies.filter(u => alive(u) && u.hand.length < HAND_MAX);
    if (!takers.length) continue;
    const u = takers[rnd(0, takers.length - 1)];
    u.hand.push({ page: FORGOTTEN_PIECE });
    const pe = headPos(e), pu = headPos(u);
    spawnAnim('text', pe.x, pe.y - 4, '*clac*', '#ffb040', 1200);
    spawnAnim('text', pu.x, pu.y - 22, '+ Pieza olvidada', '#ffb040', 1600);
  }
  if (checkEnd()) {
    CB.phase = 'done';
    const won = CB.enemies.every(u => !alive(u));
    SFX.play(won ? 'victory' : 'defeat');
    if (won) { const u = CB.allies.find(alive); if (u) bark(u, 'win'); }
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
// Pure rules for one die against another. Returns the shields each side
// raises, the hits in order ({ to: 'a'|'b', dmg }), which side evaded and
// which die stays for the next comparison (a successful evade is reused).
function pairEffects(ta, ra, tb, rb) {
  const ka = kindOf(ta), kb = kindOf(tb);
  const fx = { shieldA: ka === 'block' ? ra : 0, shieldB: kb === 'block' ? rb : 0, hits: [], evade: null, stayA: false, stayB: false, tie: false };
  const attacks = (k) => k === 'off' || k === 'counter';
  if (ka === 'off' && kb === 'off') {
    if (ra > rb) fx.hits.push({ to: 'b', dmg: ra });
    else if (rb > ra) fx.hits.push({ to: 'a', dmg: rb });
    else fx.tie = true;
    return fx;
  }
  // evade against anything that attacks
  if (ka === 'evade' && attacks(kb)) {
    if (ra >= rb) { fx.evade = 'a'; fx.stayA = true; } else fx.hits.push({ to: 'a', dmg: rb });
    return fx;
  }
  if (kb === 'evade' && attacks(ka)) {
    if (rb >= ra) { fx.evade = 'b'; fx.stayB = true; } else fx.hits.push({ to: 'b', dmg: ra });
    return fx;
  }
  // a counter takes the incoming blow first, then strikes back unopposed
  if (ka === 'counter' && kb === 'counter') { fx.hits.push({ to: 'a', dmg: rb }, { to: 'b', dmg: ra }); return fx; }
  if (ka === 'counter') { if (kb === 'off') fx.hits.push({ to: 'a', dmg: rb }); fx.hits.push({ to: 'b', dmg: ra }); return fx; }
  if (kb === 'counter') { if (ka === 'off') fx.hits.push({ to: 'b', dmg: ra }); fx.hits.push({ to: 'a', dmg: rb }); return fx; }
  // attack into a block: the shield soaks it
  if (ka === 'off') fx.hits.push({ to: 'b', dmg: ra });
  if (kb === 'off') fx.hits.push({ to: 'a', dmg: rb });
  return fx;
}

function headPos(u) {
  const a = G.actors[u.id] || { x: u.bx, y: u.by };
  const s = u.scale * (u.hat === 'cap' ? 0.86 : 1);
  return { x: a.x, y: a.y - (u.kind ? u.height : 42) * s };
}

// ---------------------------------------------------------------------
//  Animation helpers: tweens on actor offsets, effects and particles
// ---------------------------------------------------------------------
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const easeIn = (k) => k * k;

// Animates numeric fields of `obj` (ox, oy, tilt, sq...) toward `to`.
function tween(obj, to, ms, ease = easeOut) {
  if (!obj) return Promise.resolve();
  const from = {};
  for (const k in to) from[k] = obj[k] || 0;
  if (CB.instant || ms <= 0) { Object.assign(obj, to); return Promise.resolve(); }
  const start = performance.now();
  return new Promise(res => {
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / ms), e = ease(k);
      for (const p in to) obj[p] = from[p] + (to[p] - from[p]) * e;
      if (k < 1) requestAnimationFrame(step); else res();
    };
    step();
  });
}
const wait = (ms) => (CB.instant ? Promise.resolve() : delay(ms));
const actorOf = (u) => G.actors[u.id];
const dirTo = (A, B) => (Math.sign((actorOf(B) || B).x - (actorOf(A) || A).x) || 1);
function chest(u) {
  const a = actorOf(u) || { x: u.bx, y: u.by };
  const s = u.scale * (u.hat === 'cap' ? 0.86 : 1);
  return { x: a.x + (a.ox || 0), y: a.y + (a.oy || 0) - (u.kind ? u.height * 0.6 : 22) * s };
}
const feet = (u) => { const a = actorOf(u) || { x: u.bx, y: u.by }; return { x: a.x + (a.ox || 0), y: a.y }; };
function dust(u, n = 6, dir = 0) {
  const f = feet(u);
  for (let i = 0; i < n * CFG.particles; i++) {
    CB.parts.push({ x: f.x + (Math.random() - 0.5) * 8, y: f.y - 1, vx: (Math.random() - 0.5) * 0.8 - dir * 0.6, vy: -Math.random() * 0.5,
      g: -0.005, life: 22, max: 22, col: i % 2 ? '#8a8070' : '#5a5048' });
  }
}

function fx(type, x, y, ms, extra) { CB.fx.push({ type, x, y, start: performance.now(), ms, ...extra }); }
function particles(x, y, n, cols, speed = 1.6, grav = 0.08, life = 26) {
  for (let i = 0; i < n * CFG.particles; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
    CB.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, g: grav, life, max: life, col: cols[i % cols.length] });
  }
}
function shake(ms) { G.shakeUntil = Math.max(G.shakeUntil, performance.now() + ms); }

// Speech bubble over a unit with a short voiced line
function bark(u, kind, chance = 1) {
  if (CB.instant || Math.random() > chance || !alive(u) && kind !== 'stagger') return;
  const line = SFX.voice(u.id, kind);
  if (!line) return;
  const p = headPos(u);
  CB.fx = CB.fx.filter(f => !(f.type === 'bubble' && f.who === u.id));
  fx('bubble', p.x, p.y - 30, 1500, { text: line, who: u.id, enemy: u.team === 'enemy' });
}

const FX_DRAW = {
  // crescent swipe that sweeps in, then fades
  slash(f, k) {
    const sweep = Math.min(1, k * 3.5), n = 26, R = f.r || 10;
    for (let i = 0; i <= n * sweep; i++) {
      const s = i / n, a = (-2.3 + s * 3.2) * f.dir, th = Math.sin(s * Math.PI) * 3 + 1;
      const x = f.x + Math.cos(a) * R * f.dir, y = f.y + Math.sin(a) * R;
      ctx.globalAlpha = Math.max(0, 1 - k) * (0.5 + s * 0.5);
      rect(x - th / 2, y - th / 2, th, th, s > 0.7 ? '#ffffff' : f.col);
    }
    ctx.globalAlpha = 1;
  },
  // straight thrust line with a glint at the tip
  pierce(f, k) {
    const ext = Math.min(1, k * 4), x1 = f.x0 + (f.x1 - f.x0) * ext, y1 = f.y0 + (f.y1 - f.y0) * ext;
    ctx.globalAlpha = Math.max(0, 1 - k);
    line(f.x0, f.y0, x1, y1, f.col, 3);
    line(f.x0, f.y0, x1, y1, '#ffffff', 1);
    star(Math.round(x1), Math.round(y1), '#ffffff');
    ctx.globalAlpha = 1;
  },
  // ground shockwave ring
  shock(f, k) {
    const r = 3 + k * 22;
    ctx.globalAlpha = Math.max(0, 1 - k);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      rect(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.3, 2, 1, i % 2 ? f.col : '#ffffff');
    }
    ctx.globalAlpha = 1;
  },
  // star burst where two pages collide
  clash(f, k) {
    const len = 4 + k * 16;
    ctx.globalAlpha = Math.max(0, 1 - k);
    light(f.x, f.y, 18 * (1 - k) + 4, 18 * (1 - k) + 4, '#ffe080', 0.6, 3);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      line(f.x + Math.cos(a) * 3, f.y + Math.sin(a) * 3, f.x + Math.cos(a) * len, f.y + Math.sin(a) * len, i % 2 ? '#ffd060' : '#ffffff');
    }
    if (k < 0.25) disc(f.x, f.y, Math.round(6 * (1 - k * 4)) + 1, '#ffffff');
    ctx.globalAlpha = 1;
  },
  // hexagonal guard in front of a blocker
  hexShield(f, k) {
    const pulse = 1 + Math.sin(k * Math.PI * 6) * 0.06;
    ctx.globalAlpha = (k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1) * 0.5;
    poly(hexPath(f.x, f.y, (f.r || 11) * pulse), '#4a8ad8');
    ctx.globalAlpha *= 1.8;
    const pts = hexPath(f.x, f.y, (f.r || 11) * pulse);
    pts.forEach(([x, y], i) => { const [nx, ny] = pts[(i + 1) % 6]; line(x, y, nx, ny, '#c8e0ff'); });
    ctx.globalAlpha = 1;
  },
  // counter "!" with a parry star
  parry(f, k) {
    const s = k < 0.2 ? 0.6 + k * 4 : 1.4;
    ctx.globalAlpha = Math.max(0, 1 - k);
    star(Math.round(f.x + 6), Math.round(f.y - 4), '#ffffff');
    ctx.font = `${Math.round(12 * s)}px VT323, monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000'; ctx.fillText('!', f.x + 1, f.y + 1);
    ctx.fillStyle = DIE.counter.col; ctx.fillText('!', f.x, f.y);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  },
  // horizontal speed lines behind a dashing unit
  dash(f, k) {
    ctx.globalAlpha = Math.max(0, 0.6 * (1 - k));
    for (let i = 0; i < 5; i++) rect(f.x - f.dir * (6 + i * 3 + k * 10), f.y - 14 + i * 6, 8, 1, '#ffffff');
    ctx.globalAlpha = 1;
  },
  bubble(f, k) {
    const a = k < 0.08 ? k / 0.08 : k > 0.85 ? (1 - k) / 0.15 : 1;
    ctx.globalAlpha = a;
    ctx.font = '8px VT323, monospace';
    const w = Math.ceil(ctx.measureText(f.text).width) + 6;
    const x = Math.round(Math.max(-OX + 2, Math.min(W + OX - w - 2, f.x - w / 2))), y = Math.round(f.y - (k < 0.08 ? (1 - k / 0.08) * 3 : 0));
    rrect(x - 1, y - 1, w + 2, 12, '#000', 2);
    rrect(x, y, w, 10, f.enemy ? '#2a0e14' : '#f0ece0', 2);
    poly([[f.x - 2, y + 9], [f.x + 2, y + 9], [f.x, y + 13]], f.enemy ? '#2a0e14' : '#f0ece0');
    txt(f.text, x + 3, y + 8, f.enemy ? '#ff6a78' : '#16121a', 8);
    ctx.globalAlpha = 1;
  },
};

function drawFx() {
  const now = performance.now();
  CB.fx = CB.fx.filter(f => {
    const k = (now - f.start) / f.ms;
    if (k >= 1) return false;
    if (k >= 0) FX_DRAW[f.type](f, k);
    return true;
  });
  CB.parts = CB.parts.filter(p => {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.97;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    rect(p.x, p.y, 1, 1, p.col);
    return --p.life > 0;
  });
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------
//  Move animations
// ---------------------------------------------------------------------
// Run to x leaning forward with afterimages and dust; `back` = return to place.
async function dashTo(u, x, ms, back) {
  const a = actorOf(u);
  if (!a || Math.abs(a.x - x) < 1) return;
  const dir = Math.sign(x - a.x);
  if (CB.instant) { a.x = x; return; }
  a.pose = back ? null : 'run';
  dust(u, 5, dir);
  const lean = tween(a, { tilt: (back ? -0.06 : 0.14) * dir * (a.face || 1) * (a.face || 1) }, 90);
  const trail = setInterval(() => {
    a.ghosts = [{ dx: -dir * 7, a: 0.3 }, { dx: -dir * 14, a: 0.14 }];
  }, 30);
  await Promise.all([lean, animateSlide(u.id, x, ms)]);
  clearInterval(trail);
  a.ghosts = null;
  dust(u, back ? 3 : 7, -dir);
  if (!back) { a.pose = 'brace'; await tween(a, { tilt: -0.05 * dir, sq: 0.06 }, 70); }
  await tween(a, { tilt: 0, sq: 0 }, 110);
  a.pose = null;
}

const trail = (a, dir, n = 2) => { a.ghosts = Array.from({ length: n }, (_, i) => ({ dx: -dir * (6 + i * 6), a: 0.32 - i * 0.12 })); };

// The attacker's swing for one die, ending at the moment of impact.
async function strikeAnim(U, T, type) {
  const a = actorOf(U), dir = dirTo(U, T), c = chest(T);
  if (!a) return;
  a.atk = true;
  const k = kindOf(type) === 'counter' ? 'counter' : type;
  const r = T.kind ? 12 : 9;
  if (k === 'counter') {
    // parry stance, then a fast riposte
    const p = chest(U);
    a.pose = 'guard';
    fx('parry', p.x, p.y - 14, 500);
    SFX.play('counter');
    await tween(a, { ox: (a.ox || 0) - dir * 3, sq: 0.06 }, 90);
    a.pose = 'strike';
    trail(a, dir);
    await tween(a, { ox: (a.ox || 0) + dir * 14, sq: 0, tilt: 0.1 * dir }, 60, easeIn);
    a.ghosts = null;
    fx('slash', c.x, c.y, 280, { dir, col: DIE.counter.col, r });
    a.pose = 'follow';
  } else if (k === 'blunt') {
    // crouch, leap forward, slam down
    a.pose = 'windup';
    await tween(a, { sq: 0.12, ox: (a.ox || 0) - dir * 2 }, 80);
    a.pose = 'slam';
    await tween(a, { oy: -16, sq: -0.1, ox: (a.ox || 0) + dir * 6, tilt: -0.08 * dir }, 140);
    a.pose = 'strike';
    trail(a, dir);
    await tween(a, { oy: 0, sq: 0.14, ox: (a.ox || 0) + dir * 6, tilt: 0.12 * dir }, 70, easeIn);
    a.ghosts = null;
    fx('shock', c.x, feet(T).y, 450, { col: DIE.blunt.col });
    particles(c.x, c.y + 6, 8, ['#8a8090', '#5a5060', '#c8c0b0'], 1.2, 0.12);
    dust(U, 6);
    SFX.play('blunt');
    shake(220);
    tween(a, { sq: 0 }, 140);
  } else if (k === 'pierce') {
    // coil back low, then a long lunge with afterimages
    a.pose = 'windup';
    await tween(a, { ox: (a.ox || 0) - dir * 6, tilt: -0.1 * dir, sq: 0.08 }, 110);
    a.pose = 'strike';
    const p = chest(U);
    trail(a, dir, 3);
    fx('dash', p.x, p.y + 4, 200, { dir });
    await tween(a, { ox: (a.ox || 0) + dir * 22, tilt: 0.1 * dir, sq: -0.04 }, 60, easeIn);
    a.ghosts = null;
    fx('pierce', 0, 0, 260, { x0: p.x + dir * 6, y0: p.y, x1: c.x + dir * 12, y1: c.y, col: DIE.pierce.col });
    SFX.play('pierce');
    dust(U, 4, dir);
  } else {
    // slash: small hop and raise, fast diagonal swing, follow-through
    a.pose = 'windup';
    await tween(a, { ox: (a.ox || 0) - dir * 4, oy: -3, tilt: -0.14 * dir }, 100);
    a.pose = 'strike';
    trail(a, dir);
    await tween(a, { ox: (a.ox || 0) + dir * 14, oy: 0, tilt: 0.12 * dir }, 60, easeIn);
    a.ghosts = null;
    fx('slash', c.x, c.y, 280, { dir, col: DIE[type] ? DIE[type].col : '#ffffff', r });
    SFX.play('slash');
    a.pose = 'follow';
  }
}

// Return to the neutral stance after a move
function settle(u) {
  const a = actorOf(u);
  if (!a) return Promise.resolve();
  a.atk = false;
  a.pose = null;
  a.ghosts = null;
  return tween(a, { ox: 0, oy: 0, tilt: 0, sq: 0 }, 160);
}

async function recoilAnim(T, from, dmg = 0) {
  const a = actorOf(T);
  if (!a) return;
  const dir = -dirTo(T, from), heavy = dmg >= 8;
  a.pose = 'hurt';
  await tween(a, { ox: dir * (heavy ? 12 : 7), oy: heavy ? -4 : -1, tilt: -(heavy ? 0.24 : 0.14) * dir }, 70);
  await tween(a, { oy: 0 }, 70, easeIn);
  if (heavy) dust(T, 5, -dir);
  await tween(a, { ox: 0, tilt: 0 }, 200);
  a.pose = null;
}

async function dodgeAnim(u, from) {
  const a = actorOf(u);
  if (!a) return;
  const dir = -dirTo(u, from);
  SFX.play('evade');
  a.pose = 'run';
  a.ghosts = [{ dx: 0, a: 0.4 }];
  await tween(a, { ox: dir * 16, oy: -5, tilt: 0.2 * dir }, 100);
  a.ghosts = [{ dx: -dir * 9, a: 0.35 }, { dx: -dir * 4, a: 0.2 }];
  await tween(a, { oy: 0 }, 80, easeIn);
  dust(u, 4, dir);
  await wait(100);
  a.ghosts = null;
  a.pose = null;
  await tween(a, { ox: 0, tilt: 0 }, 180);
}

async function guardAnim(u, from) {
  const a = actorOf(u), c = chest(u);
  if (!a) return;
  a.pose = 'guard';
  tween(a, { sq: 0.06, ox: (a.ox || 0) - dirTo(u, from) * 2 }, 80).then(() => tween(a, { sq: 0 }, 160));
  fx('hexShield', c.x + dirTo(u, from) * 10, c.y, 900, { r: u.kind ? 11 : 8 });
  SFX.play('block');
}

async function clashCollide(A, E) {
  const a = actorOf(A), e = actorOf(E);
  if (a) a.pose = 'strike';
  const pa = chest(A), pe = chest(E);
  await Promise.all([tween(a, { ox: 7, tilt: 0.08 }, 70, easeIn), tween(e, { ox: -7, tilt: -0.08 }, 70, easeIn)]);
  const mx = (pa.x + pe.x) / 2, my = Math.min(pa.y, pe.y) - 2;
  fx('clash', mx, my, 380);
  particles(mx, my, 14, ['#ffd060', '#ffffff', '#ffb040'], 2);
  SFX.play('clash');
  shake(120);
  G.flash = { color: '#ffffff', start: performance.now(), ms: 70 };
  await wait(90); // hit-stop
  await Promise.all([tween(a, { ox: -5, tilt: -0.06 }, 120), tween(e, { ox: 5, tilt: 0.06 }, 120)]);
  dust(A, 3, 1); dust(E, 3, -1);
}

// A defeated unit topples over and fades out.
async function koAnim(u, a) {
  const dir = u.team === 'ally' ? -1 : 1;
  a.pose = 'hurt';
  await tween(a, { tilt: 0.5 * dir, ox: (a.ox || 0) + dir * 6, oy: -4 }, 160);
  await tween(a, { tilt: 1.45 * dir, oy: 0 }, 260, easeIn);
  dust(u, 8);
  await wait(500);
  await tween(a, { alpha: 0 }, 400);
  delete G.actors[u.id];
}

// Applies HP damage with stagger at 25% of it (rounded up). Returns the HP damage dealt.
function dealDamage(u, hpD) {
  if (!alive(u) || hpD <= 0) return 0;
  if (u.staggered) hpD *= 2;
  if (u.rebooting) hpD = Math.ceil(hpD * 1.5);
  hpD = Math.min(hpD, u.hp);
  u.hp -= hpD;
  const stD = u.staggered ? 0 : Math.ceil(hpD * ST_RATIO);
  if (stD) u.st = Math.max(0, u.st - stD);
  const p = headPos(u), c = chest(u);
  spawnAnim('dmg', p.x, p.y, `-${hpD}`, '#ff4a5a', 1100, { big: hpD >= 10 });
  if (stD) spawnAnim('text', p.x + 12, p.y + 10, `-${stD}`, '#ffd060', 900);
  particles(c.x, c.y, Math.min(14, 4 + hpD), u.team === 'ally' ? ['#ff4a5a', '#ffffff'] : ['#ff6a3a', '#ffd060', '#ffffff'], 1.8);
  u._hurt = performance.now() + 300;
  G.flash = { color: u.team === 'ally' ? '#ff2a3c' : '#ffffff', start: performance.now(), ms: 120 };
  if (u.hp <= 0) {
    spawnAnim('text', p.x, p.y - 10, 'K.O.', '#ff4a5a', 1400, { big: true });
    SFX.play('ko');
    shake(500);
  } else if (!u.staggered && u.st <= 0) {
    u.staggered = true;
    u.staggerTurns = 2;
    spawnAnim('text', p.x, p.y - 10, 'ATURDIDO', '#ff4a5a', 1400, { big: true });
    SFX.play('stagger');
    bark(u, 'stagger');
    shake(400);
  } else if (hpD >= 4) {
    bark(u, 'hurt', 0.35);
  }
  return hpD;
}

// A hit is soaked by the target's shield first; what is left reaches HP.
async function applyHit(T, dmg, stats, from, type) {
  if (!alive(T)) return;
  await strikeAnim(from, T, type);
  const p = headPos(T);
  const soaked = Math.min(T.shield, dmg);
  if (soaked) {
    T.shield -= soaked;
    spawnAnim('text', p.x + 14, p.y + 10, `-${soaked}`, '#9ac0ff', 900);
    particles(chest(T).x + dirTo(T, from) * 12, chest(T).y, 6, ['#9ac0ff', '#ffffff'], 1.4);
    SFX.play('block');
  }
  const dealt = dealDamage(T, dmg - soaked);
  if (!dealt && soaked) { spawnAnim('text', p.x, p.y - 4, 'BLOQUEADO', '#9ac0ff', 800); bark(T, 'block', 0.5); }
  if (stats) stats[from.team] += dealt;
  await wait(70);
  await Promise.all([settle(from), dealt && alive(T) ? recoilAnim(T, from, dealt) : Promise.resolve()]);
}

function addShield(u, v, from) {
  u.shield += v;
  const p = headPos(u);
  spawnAnim('text', p.x, p.y - 26, `ESCUDO +${v}`, '#9ac0ff', 1100);
  guardAnim(u, from);
  SFX.play('shield');
}

async function evadeFx(u, roll, from) {
  const v = Math.ceil(roll * ST_RATIO);
  u.st = Math.min(u.maxSt, u.st + v);
  const p = headPos(u);
  spawnAnim('text', p.x, p.y - 4, 'ESQUIVA', '#4ac08a', 800);
  spawnAnim('text', p.x + 12, p.y + 8, `+${v}`, '#4ac08a', 800);
  bark(u, 'evade', 0.5);
  await Promise.all([dodgeAnim(u, from), from ? strikeAnim(from, u, 'slash').then(() => settle(from)) : null]);
}

function rollFx(u, type, r) {
  const p = headPos(u);
  spawnAnim('text', p.x, p.y - 14, String(r), DIE[type].col, 800, { big: true });
  SFX.play('dice', { roll: r });
}

function side(d) { return { unit: d.unit, page: d.page, i: 0, roll: null }; }

async function doClash(ad, ed) {
  const A = ad.unit, E = ed.unit;
  const sa = side(ad), se = side(ed);
  const stats = { ally: 0, enemy: 0 };
  CB.view = { left: sa, right: se };
  await Promise.all([dashTo(A, 150, 300), dashTo(E, 182, 300)]);
  spawnAnim('text', 166, 44, '¡CHOQUE!', '#ffd060', 800, { big: true });
  bark(A, 'attack', 0.6);
  bark(E, 'attack', 0.4);
  await wait(250);

  const qa = ad.page.dice, qe = ed.page.dice;
  while (sa.i < qa.length && se.i < qe.length && canAct(A) && canAct(E)) {
    const [ta, a1, a2] = qa[sa.i], [te, e1, e2] = qe[se.i];
    sa.roll = rnd(a1, a2); se.roll = rnd(e1, e2);
    rollFx(A, ta, sa.roll); rollFx(E, te, se.roll);
    await wait(380);
    const f = pairEffects(ta, sa.roll, te, se.roll);
    // both pages meet in the middle unless one side is only defending
    if (kindOf(ta) !== 'evade' && kindOf(te) !== 'evade' && (DIE[ta].off || DIE[te].off)) await clashCollide(A, E);
    if (f.shieldA) addShield(A, f.shieldA, E);
    if (f.shieldB) addShield(E, f.shieldB, A);
    if ((f.shieldA || f.shieldB) && f.hits.length) await wait(380);
    if (f.tie) {
      const pa = headPos(A), pb = headPos(E);
      spawnAnim('text', (pa.x + pb.x) / 2, Math.min(pa.y, pb.y) - 12, 'EMPATE', '#a39c90', 700);
      SFX.play('tie');
    }
    if (f.evade === 'a') await evadeFx(A, sa.roll, E);
    if (f.evade === 'b') await evadeFx(E, se.roll, A);
    for (const h of f.hits) {
      const [T, from, die] = h.to === 'a' ? [A, E, te] : [E, A, ta];
      if (kindOf(die) === 'counter') spawnAnim('text', headPos(from).x, headPos(from).y - 22, 'CONTRAATAQUE', DIE.counter.col, 900);
      await applyHit(T, h.dmg, stats, from, die);
    }
    const aa = actorOf(A), ae = actorOf(E);
    if (aa) aa.pose = null;
    if (ae) ae.pose = null;
    await Promise.all([settle(A), settle(E)]);
    await wait(250);
    if (!f.stayA) sa.i++;
    if (!f.stayB) se.i++;
    sa.roll = null; se.roll = null;
  }
  await leftovers(sa, E, stats);
  await leftovers(se, A, stats);

  // Light goes to the ally if their side dealt more damage in this clash
  if (alive(A) && stats.ally > stats.enemy && A.light < A.maxLight) {
    A.light++;
    const p = headPos(A);
    spawnAnim('text', p.x, p.y - 26, '+1 LUZ', '#ffe08a', 1200, { big: true });
    particles(p.x, p.y - 20, 10, ['#ffe08a', '#ffffff'], 1.2, -0.02);
    SFX.play('light');
  }
  A.shield = 0;
  E.shield = 0;
  await Promise.all([dashTo(A, A.bx, 280, true), dashTo(E, E.bx, 280, true)]);
}

async function doOneSided(d, T) {
  const s = side(d);
  const def = { unit: T, page: null, i: 0, roll: null };
  CB.view = d.unit.team === 'ally' ? { left: s, right: def } : { left: def, right: s };
  const tx = T.team === 'ally' ? T.bx + (d.unit.kind ? 30 : 20) : T.bx - (T.kind ? 30 : 20);
  await dashTo(d.unit, tx, 300);
  bark(d.unit, 'attack', 0.5);
  await wait(150);
  await leftovers(s, T, null);
  await dashTo(d.unit, d.unit.bx, 280, true);
}

// Remaining attack and counter dice hit unopposed; block and evade leftovers are discarded.
async function leftovers(s, T, stats) {
  const U = s.unit;
  while (s.i < s.page.dice.length && canAct(U) && alive(T)) {
    const [ty, a, b] = s.page.dice[s.i];
    if (DIE[ty].off) {
      s.roll = rnd(a, b);
      rollFx(U, ty, s.roll);
      await wait(300);
      await applyHit(T, s.roll, stats, U, ty);
      await wait(200);
    }
    s.roll = null;
    s.i++;
  }
}

// ---------------------------------------------------------------------
//  Auto assignment (the "Ganar" / "Daño" buttons)
// ---------------------------------------------------------------------
// Rough simulation of one page clash with the same rules: returns damage dealt by each side.
function simClash(pa, pb) {
  let ia = 0, ib = 0, shA = 0, shB = 0, dA = 0, dB = 0;
  const hit = (to, dmg) => {
    if (to === 'a') { const s = Math.min(shA, dmg); shA -= s; dB += dmg - s; }
    else { const s = Math.min(shB, dmg); shB -= s; dA += dmg - s; }
  };
  while (ia < pa.dice.length && ib < pb.dice.length) {
    const [ta, a1, a2] = pa.dice[ia], [tb, b1, b2] = pb.dice[ib];
    const fx = pairEffects(ta, rnd(a1, a2), tb, rnd(b1, b2));
    shA += fx.shieldA; shB += fx.shieldB;
    for (const h of fx.hits) hit(h.to, h.dmg);
    if (!fx.stayA) ia++;
    if (!fx.stayB) ib++;
  }
  for (; ia < pa.dice.length; ia++) { const [t, x, y] = pa.dice[ia]; if (DIE[t].off) hit('b', rnd(x, y)); }
  for (; ib < pb.dice.length; ib++) { const [t, x, y] = pb.dice[ib]; if (DIE[t].off) hit('a', rnd(x, y)); }
  return [dA, dB];
}

function clashScore(pa, pb, n = 120) {
  let win = 0, net = 0;
  for (let k = 0; k < n; k++) {
    const [a, b] = simClash(pa, pb);
    if (a > b) win++;
    net += a - b;
  }
  return { win: win / n, net: net / n };
}

function expDamage(pg) {
  return pg.dice.reduce((s, [t, a, b]) => s + (DIE[t].off ? (a + b) / 2 : 0), 0);
}

function autoAssign(mode) {
  if (CB.phase !== 'select') return;
  const used = new Set();
  const foes = enemyDice().filter(e => canAct(e.unit));
  for (const d of allyDice()) unassign(d);
  for (const d of allyDice()) {
    const u = d.unit;
    if (!canAct(u) || !foes.length) continue;
    const taken = diceOf(u).filter(x => x.card).map(x => x.card);
    const options = u.hand.filter(c => !taken.includes(c));
    const defFree = u.defTurn !== CB.turn && !u.hand.some(c => c.page === u.defense) && u.hand.length < HAND_MAX;
    if (defFree) options.push({ page: u.defense, virtual: true });
    let best = null, bestScore = -Infinity;
    for (const card of options) {
      if (costOf(card.page) > u.light) continue;
      for (const e of foes) {
        let score;
        if (!e.page) score = expDamage(card.page) / 10;
        else {
          const r = clashScore(card.page, e.page);
          score = mode === 'win' ? r.win + r.net / 30 : r.net / 4 + expDamage(card.page) / 10;
        }
        score -= costOf(card.page) * 0.08;
        if (used.has(e)) score -= mode === 'win' ? 0.5 : 3;
        if (e.target === d) score += 0.05;
        if (score > bestScore) { bestScore = score; best = [card, e]; }
      }
    }
    if (!best) continue;
    let [card, e] = best;
    if (card.virtual) { card = { page: u.defense }; u.hand.push(card); u.defTurn = CB.turn; }
    assignCard(d, card);
    d.target = e;
    used.add(e);
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

// Left-aligned text squeezed horizontally when it is wider than maxW.
function txtFit(s, x, y, col, size, maxW) {
  ctx.font = `${size}px VT323, monospace`;
  const w = ctx.measureText(s).width;
  if (w <= maxW) return txt(s, x, y, col, size);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(maxW / w, 1);
  txt(s, 0, 0, col, size);
  ctx.restore();
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

// Speed-die tokens sit in a row above each unit's head.
const TOKEN_R = 7;
function tokenPos(d) {
  const u = d.unit;
  if (u.team === 'enemy') return { x: u.bx - 6 + (d.k - (u.nDice - 1) / 2) * 30, y: Math.round(u.by - u.height * u.scale - 19) };
  const s = u.scale * (u.hat === 'cap' ? 0.86 : 1);
  return { x: u.bx + (d.k - (u.nDice - 1) / 2) * 30, y: Math.round(u.by - 40 * s - 12) };
}

// What the pointer is on: a single speed die ({die}) or a whole unit
// ({unit}: its body or its plate).
function focusUnit() {
  const m = CB.mouse;
  if (!m) return null;
  for (const u of CB.all) {
    const a = G.actors[u.id];
    if (!a || !alive(u)) continue;
    const s = u.scale * (u.hat === 'cap' ? 0.86 : 1);
    const h = (u.kind ? u.height : 34) * s, hw = u.kind ? 24 : 9;
    if (m.x >= a.x - hw && m.x <= a.x + hw && m.y >= u.by - h - 4 && m.y <= u.by + 2) return { unit: u };
    if (u.team === 'ally' && m.x >= a.x - 16 && m.x < a.x + 16 && m.y >= u.by + 2 && m.y < u.by + 11) return { unit: u };
    if (u.team === 'enemy' && m.x >= 200 && m.x < 304 && m.y >= 104 && m.y < 124) return { unit: u };
  }
  return null;
}

// Hovered token, for the targeting preview.
function tokenAt(m) {
  if (!m) return null;
  return CB.dice.find(d => alive(d.unit) && !d.unit.staggered && (p => Math.abs(m.x - p.x) <= TOKEN_R + 2 && Math.abs(m.y - p.y) <= TOKEN_R + 2)(tokenPos(d))) || null;
}

function arrowHead([x, y], [qx, qy], col) {
  const a = Math.atan2(y - qy, x - qx);
  poly([
    [x + Math.cos(a) * 3, y + Math.sin(a) * 3],
    [x + Math.cos(a + 2.5) * 4, y + Math.sin(a + 2.5) * 4],
    [x + Math.cos(a - 2.5) * 4, y + Math.sin(a - 2.5) * 4],
  ], col);
}

// Quadratic arrow from (x0,y0) to (x1,y1) whose highest point is at `top`,
// so arrows given different tops never share a path.
function arc(x0, y0, x1, y1, col, t, both, top) {
  if (top == null) top = Math.min(y0, y1) - 14;
  const mx = (x0 + x1) / 2, my = 2 * top - (y0 + y1) / 2;
  const P = (s) => [
    (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * mx + s * s * x1,
    (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * my + s * s * y1,
  ];
  const len = Math.hypot(x1 - x0, y1 - y0) + Math.abs(my - y0);
  // trim by real distance so the arrow touches the token edge at both ends
  const gapAt = (from, dir) => {
    const [ax, ay] = P(from);
    let s = from;
    while (Math.abs(s - from) < 0.4) {
      s += dir * 0.004;
      const [bx, by] = P(s);
      if (Math.hypot(bx - ax, by - ay) >= TOKEN_R - 1) break;
    }
    return s;
  };
  const s0 = gapAt(0, 1), s1 = gapAt(1, -1);
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

// Arrows are only drawn for the unit under the pointer: its own attacks and
// the attacks aimed at it. Returns the dice involved so the rest can be dimmed.
function drawArrows(t, focus) {
  const lit = new Set();
  if (!focus) return lit;
  const show = (a, b) => a.unit === focus.unit || b.unit === focus.unit;
  const list = [];
  for (const e of enemyDice()) {
    if (!e.page || !e.target || !canAct(e.unit) || !show(e, e.target)) continue;
    if (e.target.target === e && e.target.page) continue;
    list.push({ a: e, b: e.target, col: '#ff4050' });
  }
  for (const d of allyDice()) {
    if (!d.page || !d.target || !canAct(d.unit) || !show(d, d.target)) continue;
    list.push({ a: d, b: d.target, col: '#ffd060', both: d.target.target === d, clash: true });
  }
  // Every arrow gets its own lane over the top: shorter arrows stay low,
  // longer ones go higher, so they nest instead of crossing. Arrows sharing
  // a token leave from spread-out points along its top edge.
  list.sort((r1, r2) => Math.abs(tokenPos(r1.a).x - tokenPos(r1.b).x) - Math.abs(tokenPos(r2.a).x - tokenPos(r2.b).x));
  const ends = new Map(), used = new Map();
  for (const r of list) for (const d of [r.a, r.b]) ends.set(d, (ends.get(d) || 0) + 1);
  const point = (d) => {
    const n = ends.get(d), k = used.get(d) || 0;
    used.set(d, k + 1);
    const p = tokenPos(d);
    return { x: p.x + (k - (n - 1) / 2) * Math.min(5, 10 / Math.max(1, n - 1)), y: p.y - 4 };
  };
  const roof = Math.min(...list.map(r => Math.min(tokenPos(r.a).y, tokenPos(r.b).y))) - 12;
  const gap = Math.max(4, Math.min(9, (roof - 5) / Math.max(1, list.length - 1)));
  list.forEach((r, i) => {
    const p0 = point(r.a), p1 = point(r.b);
    const m = arc(p0.x, p0.y, p1.x, p1.y, r.col, t, r.both, Math.max(4, roof - i * gap));
    if (r.clash) clashMark(m[0], m[1], t);
    lit.add(r.a); lit.add(r.b);
  });
  for (const d of CB.dice) if (d.unit === focus.unit) lit.add(d);
  return lit;
}

function drawToken(d, t, dim) {
  const u = d.unit;
  if (!alive(u)) return;
  ctx.globalAlpha = dim ? 0.4 : 1;
  drawTokenBody(d, t);
  ctx.globalAlpha = 1;
}

function drawTokenBody(d, t) {
  const u = d.unit;
  const { x, y } = tokenPos(d);
  const blink = Math.floor(t / 400) % 2;
  if (u.staggered) { if (d.k === 0) txt('ATURDIDO', x, y + 3, blink ? '#ff4a5a' : '#8a2030', 9, 'center'); return; }
  const enemy = u.team === 'enemy';
  const sel = CB.sel === d && CB.phase === 'select';
  const R = TOKEN_R;
  const hov = hitArea(x - R - 2, y - R - 2, 2 * R + 4, 2 * R + 4, () => (enemy ? targetDie(d) : selectDie(d)), { page: d.page });
  if (sel || hov) {
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * (0.5 + 0.3 * Math.sin(t / 150));
    hex(x, y, R + 3, sel ? '#ffd060' : '#ffffff');
    ctx.globalAlpha = a;
  }
  hex(x, y, R, d.page ? '#1e1418' : '#121016', enemy ? '#c0283a' : sel ? '#ffd060' : '#8a6030');
  // range label: right of enemy tokens (arrows arrive from the left), left of
  // an ally's first token and right of Lobelto's second one
  const rightLabel = !enemy && d.k > 0;
  const lx = enemy ? x : rightLabel ? x + R + 3 : x - R - 3, al = enemy ? 'center' : rightLabel ? 'left' : 'right';
  const ly = enemy ? y + R + 8 : y + 3;
  if (d.page) {
    dieIcon(d.page.dice[0][0], x - 2, y - 5);
    const n = d.page.dice.length;
    d.page.dice.forEach(([ty], k) => rect(x - n + k * 2, y + 2, 1, 2, DIE[ty].col));
    const [, a, b] = d.page.dice[0];
    tag(`${a}-${b}`, lx, ly, '#ffd060', al);
  } else if (u.rebooting) {
    txt('...', x, y + 2, '#9ac0ff', 10, 'center');
    tag('REINICIO', lx, ly, '#9ac0ff', al);
  } else {
    txt('?', x, y + 3, '#6a6070', 10, 'center');
  }
  speedBadge(x + R + 1, y - R + 1, d.speed);
}

// Small label on a dark backing so arrows never make it unreadable.
function tag(s, x, y, col, align) {
  ctx.font = '8px VT323, monospace';
  const w = Math.ceil(ctx.measureText(s).width) + 2;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * 0.75;
  rect(align === 'right' ? x - w + 1 : align === 'center' ? x - w / 2 : x - 1, y - 6, w, 8, '#08060c');
  ctx.globalAlpha = a;
  txt(s, x, y, col, 8, align);
}

function shieldBar(x, y, v) {
  if (!v) return;
  const w = Math.min(30, v * 3);
  rect(x - 1, y - 1, w + 2, 4, '#0a1020');
  rect(x, y, w, 2, '#4a8ad8');
  rect(x, y, w, 1, '#9ac0ff');
  txt(String(v), x + w + 3, y + 3, '#9ac0ff', 8);
}

function allyPlate(u, t) {
  const a = G.actors[u.id];
  if (!a) return;
  const x = Math.round(a.x), y = u.by;
  rect(x - 16, y + 3, 32, 7, '#0a080e');
  const hp = u.hp / u.maxHp;
  rect(x - 15, y + 4, 30, 2, '#2a1418');
  rect(x - 15, y + 4, Math.round(30 * hp), 2, hp < 0.3 ? '#e03040' : '#3fbf6a');
  rect(x - 15, y + 7, 30, 2, '#2a2410');
  rect(x - 15, y + 7, Math.round(30 * u.st / u.maxSt), 2, '#e8c040');
  txt(String(u.hp), x - 18, y + 10, '#ff8a3a', 10, 'right');
  if (u.staggered) txt(`ATURD. ${u.staggerTurns - 1}T`, x + 18, y + 10, Math.floor(t / 400) % 2 ? '#ff4a5a' : '#8a2030', 8);
  else txt(`${u.st}/${u.maxSt}`, x + 18, y + 10, '#e8c040', 8);
  shieldBar(x - 15, y - 1, u.shield);
}

function enemyPlate(u, t) {
  const x0 = 200, y0 = 108, w = 104, bw = 62;
  rect(x0, y0, w, 15, '#0a080e');
  rect(x0, y0, w, 1, '#5a1a24');
  rect(x0 + 2, y0 + 2, 22, 5, u.tagCol);
  txt(u.tag, x0 + 13, y0 + 7, '#ffe0e0', 7, 'center');
  txtFit(u.name, x0 + 27, y0 + 7, '#d8d0c0', 7, w - 29);
  const hp = u.hp / u.maxHp;
  rect(x0 + 2, y0 + 9, bw, 2, '#2a1418');
  rect(x0 + 2, y0 + 9, Math.round(bw * hp), 2, '#e03040');
  rect(x0 + 2, y0 + 12, bw, 2, '#2a2410');
  rect(x0 + 2, y0 + 12, Math.round(bw * u.st / u.maxSt), 2, '#e8c040');
  txt(u.staggered ? `${u.staggerTurns - 1}T` : `${u.st}/${u.maxSt}`, x0 + bw + 5, y0 + 15, u.staggered ? '#ff4a5a' : '#e8c040', 8);
  txt(String(u.hp), x0 + w - 2, y0 + 14, '#ff8a3a', 10, 'right');
  if (u.staggered && Math.floor(t / 400) % 2) txt('ATURDIDO', x0 + w / 2, y0 - 3, '#ff4a5a', 9, 'center');
  else if (u.rebooting && Math.floor(t / 400) % 2) txt('REINICIANDO · DAÑO x1.5', x0 + w / 2, y0 - 3, '#9ac0ff', 8, 'center');
  shieldBar(x0 + 2, y0 - 5, u.shield);
}

// Bottom panel: one column per ally (Light, page slots for each die, portrait),
// the hand of the selected ally, and the start / auto-assign buttons.
function selectPanel(t) {
  const py = 124;
  rect(-OX, py, VW, H - py, '#0c0a10');
  rect(-OX, py, VW, 1, '#8a6030');
  rect(-OX, py + 1, VW, 1, '#3a2418');

  CB.allies.forEach((u, i) => {
    if (!alive(u)) return;
    const cx = 22 + i * 38, ok = canAct(u), dice = diceOf(u);
    const sel = CB.sel && CB.sel.unit === u;
    const pcy = 162, pr = 14;
    const defOn = dice.some(x => x.card && x.card.page === u.defense);
    for (let k = 0; k < u.maxLight; k++)
      disc(cx - (u.maxLight - 1) * 3 + k * 6, 128, 2, k < u.light ? '#ffe08a' : '#3a3020');
    dice.forEach((d, k) => {
      const sx = cx + (k - (dice.length - 1) / 2) * 17, here = CB.sel === d;
      if (ok) hitArea(sx - 8, 132, 16, 15, () => selectDie(d), d.page ? { page: d.page } : null);
      hex(sx, 140, 7, d.page ? '#1e1418' : '#121016', here ? '#ffd060' : '#5a4030');
      if (d.page) dieIcon(d.page.dice[0][0], sx - 2, 136);
      else txt('+', sx, 143, '#5a5060', 9, 'center');
    });
    if (ok) hitArea(cx - 15, 148, 30, 31, () => defenseButton(u), { page: u.defense });
    if (sel) {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t / 150);
      hex(cx, pcy, pr + 2, '#ffd060');
      ctx.globalAlpha = 1;
    }
    hex(cx, pcy, pr, defOn ? '#14203a' : '#1a1622', defOn ? '#4a8ad8' : sel ? '#ffd060' : ok ? '#8a6030' : '#3a3030');
    ctx.save();
    ctx.beginPath();
    hexPath(cx, pcy, pr).forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    ctx.translate(cx, pcy + 2); ctx.scale(0.6, 0.6); ctx.translate(-cx, -(pcy + 2));
    avatarHead(cx, pcy + 2, u.hat, t, !ok);
    ctx.restore();
    if (defOn) {
      light(cx, pcy, pr + 4, pr + 4, '#4a8ad8', 0.3 + 0.1 * Math.sin(t / 200), 3);
      disc(cx - 10, pcy - 9, 5, '#4a8ad8');
      dieIcon(u.defense.dice[0][0], cx - 12, pcy - 11, '#ffffff');
    } else if (ok) {
      const spent = u.defTurn === CB.turn && !u.hand.some(c => c.page === u.defense);
      rrect(cx - 15, pcy - 13, 15, 7, spent ? '#2a2a34' : '#2a4a7a', 2);
      txt('DEF', cx - 7.5, pcy - 7.5, spent ? '#5a5a6a' : '#c8dcff', 7, 'center');
    }
    txt(String(u.hp), cx - 9, 179, '#ff8a3a', 9, 'center');
    if (dice[0]) speedBadge(cx + 11, 173, dice[0].speed);
  });

  const d = CB.sel;
  if (d) {
    const u = d.unit;
    let bx = 90;
    txt('BOLSA', bx, 131, '#8a8070', 7);
    bx += 22;
    for (const tier of [1, 2, 3]) {
      const left = u.pool.filter(c => c.page.tier === tier).length;
      const lw = TIER[tier].label.length * 4;
      rrect(bx, 125, lw + 3, 8, left ? TIER[tier].col : '#3a3434', 2);
      txt(TIER[tier].label, bx + 1.5 + lw / 2, 131, '#16121a', 7, 'center');
      txt(String(left), bx + lw + 5, 131, left ? '#e8e4dc' : '#5a5050', 8);
      bx += lw + 14;
    }
    txt(`ROBA ${drawsForTurn(CB.turn + 1)}/T`, 248, 131, '#8a8070', 7, 'right');
    // the hand fans out when it holds more than 4 pages; the hovered page comes to the front
    const n = u.hand.length, cw = 37;
    const step = n <= 4 ? 39 : (158 - cw) / (n - 1);
    const rects = u.hand.map((card, i) => ({ card, x: Math.round(90 + i * step), y: 137, w: cw, h: 41 }));
    let hov = -1;
    for (let i = n - 1; i >= 0; i--) if (hot(rects[i].x, rects[i].y, rects[i].w, rects[i].h)) { hov = i; break; }
    const order = rects.map((_, i) => i).filter(i => i !== hov);
    if (hov >= 0) order.push(hov);
    for (const i of order) drawHandCard(rects[i], i === hov, d);
    if (!n) txt('Mano vacía · pulsa el retrato para defender', 168, 158, '#6a6070', 8, 'center');
  }

  rect(252, 127, 36, 9, '#2a1810');
  rect(252, 127, 36, 1, '#8a6030');
  txt('INICIAR', 270, 134, '#ffd8a0', 8, 'center');
  const gh = hitArea(255, 140, 30, 32, combatExecute);
  gear(270, 156, 13, t, gh);
  smallBtn(290, 140, 28, 11, 'Ganar', () => autoAssign('win'));
  smallBtn(290, 156, 28, 11, 'Daño', () => autoAssign('dmg'));
}

function drawHandCard(r, hv, d) {
  const pg = r.card.page, tier = TIER[pg.tier];
  const holder = diceOf(d.unit).find(x => x.card === r.card);
  const on = holder === d, elsewhere = holder && holder !== d;
  hitArea(r.x, r.y, r.w, r.h, () => toggleCard(r.card), { page: pg });
  const x = r.x, w = r.w, h = r.h, y = r.y - (hv ? 3 : 0) - (on || elsewhere ? 2 : 0);
  rrect(x, y, w, h, on ? '#ffd060' : elsewhere ? '#a08040' : hv ? '#8a6a50' : '#3a2a24', 2);
  rect(x + 1, y + 1, w - 2, h - 2, '#16121a');
  rect(x + 1, y + 1, w - 2, 2, DIE[pg.dice[0][0]].col);
  wrap(pg.name, w - 4, 8).slice(0, 2).forEach((ln, k) => {
    ctx.font = '8px VT323, monospace';
    txt(ln, x + 2, y + 9 + k * 6, '#e8e4dc', ctx.measureText(ln).width > w - 4 ? 7 : 8);
  });
  const afford = holder || canAfford(d, r.card);
  const bw = tier.label.length * 4 + 4;
  rrect(x + w - bw - 2, y - 4, bw, 8, tier.col, 2);
  txt(tier.label, x + w - 2 - bw / 2, y + 2, '#16121a', 8, 'center');
  disc(x + w - 6, y + h - 6, 4, afford ? '#ffe08a' : '#5a5040');
  txt(String(costOf(pg)), x + w - 5.5, y + h - 3, '#2a1a00', 9, 'center');
  pg.dice.forEach(([ty, a, b], k) => {
    const ry = y + h - 8 - (pg.dice.length - 1 - k) * 7;
    dieIcon(ty, x + 3, ry - 3);
    txt(`${a}-${b}`, x + 10, ry + 2, '#d8d0c0', 8);
  });
  if (!afford || elsewhere) { ctx.globalAlpha = 0.55; rect(x, y, w, h, '#000'); ctx.globalAlpha = 1; }
  if (elsewhere) { rrect(x + 3, y + h / 2 - 5, w - 6, 9, '#2a2010', 2); txt('EN USO', x + w / 2, y + h / 2 + 2, '#ffd060', 8, 'center'); }
}

function pageCard(s, x, y, w, enemyTeam) {
  const tc = enemyTeam ? '#ff5a6a' : '#ffd060';
  rect(x, y, w, 50, '#16121a');
  rect(x, y, w, 1, tc);
  txtFit(s.unit.name, x + 4, y + 9, tc, 8, s.unit.shield ? w - 48 : w - 8);
  if (s.unit.shield) txt(`ESCUDO ${s.unit.shield}`, x + w - 4, y + 9, '#9ac0ff', 8, 'right');
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
  rect(-OX, py, VW, H - py, '#0c0a10');
  rect(-OX, py, VW, 1, '#8a6030');
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
}

function tooltip() {
  let h = null;
  for (let i = CB.hits.length - 1; i >= 0 && !h; i--) if (CB.hits[i].hot && CB.hits[i].data && CB.hits[i].data.page) h = CB.hits[i];
  if (!h) return;
  const pg = h.data.page;
  const bw = 116, bh = 14 + pg.dice.length * 9;
  const m = CB.mouse;
  const x = Math.round(Math.max(2 - OX, Math.min(W + OX - bw - 2, m.x + 8)));
  let y = Math.round(m.y - bh - 6);
  if (y < 16) y = Math.round(m.y + 10);
  y = Math.min(y, H - bh - 2);
  rect(x, y, bw, bh, '#0c0a10');
  rect(x, y, bw, 1, '#8a6030');
  rect(x, y + bh - 1, bw, 1, '#3a2418');
  txt(pg.name, x + 4, y + 9, '#ffd060', 9);
  if (pg.tier != null) {
    const tl = { 0: 'Defensa', P: 'Extra' }[pg.tier] || `Hab. ${TIER[pg.tier].label}`;
    txt(`${tl} · Luz ${costOf(pg)}`, x + bw - 4, y + 9, TIER[pg.tier].col, 8, 'right');
  }
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
    if (!alive(u)) { if (!a.dying) { a.dying = true; a.alpha = 1; koAnim(u, a); } continue; }
    a.shake = u.staggered || (u._hurt || 0) > now;
    a.pain = u.staggered;
    a.blind = u.staggered;
    a.rage = u.hp < u.maxHp * 0.3;
    a.rebooting = u.rebooting;
  }
}

function drawCombatHUD(t) {
  if (!CB.active) return;
  refreshActors();
  drawFx();
  CB.hits = [];
  for (const u of CB.allies) if (alive(u)) allyPlate(u, t);
  for (const u of CB.enemies) if (alive(u)) enemyPlate(u, t);
  if (CB.phase === 'select') {
    const focus = focusUnit();
    const lit = drawArrows(t, focus);
    for (const d of CB.dice) drawToken(d, t, focus && !lit.has(d));
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
    <div class="cb-result-sub">${won ? CB.enemies[0].defeat : 'Tu equipo ha sido derrotado...'}</div>
    <div class="cb-result-stats">Turnos: ${CB.turn}</div>
    <div class="cb-result-stats">${CB.allies.map(u => `${u.name}: ${u.hp}/${u.maxHp} HP`).join(' · ')}</div>
    <button class="cb-result-btn" data-act="combat-exit">Volver al Hub</button>
    <button class="cb-result-btn" data-act="combat-retry">Reintentar</button>
  </div>`;
  ui.combatUI.querySelector('[data-act="combat-exit"]').addEventListener('click', (e) => { e.stopPropagation(); endCombat(); });
  ui.combatUI.querySelector('[data-act="combat-retry"]').addEventListener('click', (e) => { e.stopPropagation(); startCombatTest(CB.enemyId); });
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
