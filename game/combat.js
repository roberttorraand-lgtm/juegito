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
//  Hands hold at most 4 pages (the free defensive page does not count).
//  Gonza's gun dice ([type, min, max, 'gun']) spend one of his 12 bullets;
//  with none left they still clash but deal no damage.
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
// HAND_MAX counts normal pages only; the free defensive page never takes a slot
const HAND_START = 2, HAND_MAX = 4;
const AMMO_MAX = 12;
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
  E: { label: 'E.G.O', col: '#e03040', cost: 0 },
};
const costOf = (page) => (page.ego ? RISK[page.ego.risk].light : TIER[page.tier] ? TIER[page.tier].cost : 0);
const handCount = (u) => u.hand.filter(c => c.page !== u.defense).length;
// a die written as [type, min, max, 'gun'] fires a bullet
const isGun = (die) => die[3] === 'gun';
const pageShots = (page) => page.dice.filter(isGun).length;

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
    defense: { name: 'Esquivar y gritar', tier: 0, dice: [['evade', 3, 6], ['counter', 2, 5]] },
  },
  gonza: {
    id: 'gonza', name: 'GONZA', team: 'ally', maxHp: 65, maxSt: 16, speed: [3, 7], nDice: 1,
    hat: 'cap', bx: 92, by: 114, scale: 0.85,
    pages: [
      { name: 'Patada lateral', tier: 1, dice: [['blunt', 3, 6], ['blunt', 3, 5]] },
      { name: 'Disparo nervioso', tier: 1, dice: [['pierce', 4, 8, 'gun']] },
      { name: 'Combo callejero', tier: 2, dice: [['blunt', 3, 5], ['blunt', 3, 5], ['blunt', 3, 5]] },
      { name: 'Ráfaga temblorosa', tier: 3, dice: [['pierce', 4, 7, 'gun'], ['pierce', 4, 7, 'gun'], ['blunt', 4, 7]] },
    ],
    defense: { name: 'Guardia firme', tier: 0, dice: [['block', 4, 7], ['counter', 3, 5]] },
    gun: true,
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
  // Episode 2: corpses moved by the Disconnected Operator's cables
  skel: {
    id: 'skel', name: 'ESQUELETO CABLEADO', tag: 'TETH?', tagCol: '#2a5aa0', team: 'enemy', maxHp: 30, maxSt: 11, speed: [2, 5], nDice: 1,
    kind: 'cableskel', bg: 'corridor', height: 44, bx: 250, by: 108, scale: 0.9,
    pages: [
      { name: 'Golpe de hueso', dice: [['blunt', 3, 6], ['blunt', 2, 4]] },
      { name: 'Latigazo de cable', dice: [['slash', 3, 6]] },
      { name: 'Chispazo', dice: [['pierce', 3, 6]] },
      { name: 'Costillar', dice: [['block', 3, 6], ['blunt', 2, 4]] },
    ],
  },
};
// What each fight puts on stage. Story fights use these through { combat: id }.
const COMBAT_SETS = {
  corrupted: { enemies: ['corrupted'] },
  machine: { enemies: ['machine'] },
  operator: { enemies: ['operator'] },
  tut_skeletons: {
    name: 'Esqueletos cableados', enemies: ['skel', 'skel'], bg: 'corridor', music: 'battle_teth', tutorial: true,
    defeat: 'Los cables chisporrotean, se sueltan y los huesos caen al suelo.',
  },
};
const FORGOTTEN_PIECE = { name: 'Pieza olvidada', tier: 'P', dice: [['pierce', 4, 8], ['pierce', 2, 5]] };

const CB = {
  active: false, turn: 0, phase: 'select',
  allies: [], enemies: [], all: [], dice: [],
  sel: null, view: null, hits: [], mouse: null,
  animating: false, anims: [], fx: [], parts: [], instant: false,
  cam: { z: 1, x: 160, y: 100 },
};
const CAM_HOME = { z: 1, x: 160, y: 100 };
const camTo = (to, ms = 300) => tween(CB.cam, to, ms, easeInOut);
// frame a zoomed shot low enough that the ally's health plate stays above the panel
const camY = (...us) => Math.max(...us.filter(u => u.team === 'ally').map(u => u.by)) - 4;

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

// Difficulty (Ajustes > Juego): enemy health and the damage allies take
const DIFFICULTY = {
  facil: { hp: 0.75, taken: 0.75 },
  normal: { hp: 1, taken: 1 },
  dificil: { hp: 1.25, taken: 1.2 },
};
const diff = () => DIFFICULTY[CFG.difficulty] || DIFFICULTY.normal;

function makeUnit(t) {
  const hp = t.team === 'enemy' ? Math.round(t.maxHp * diff().hp) : t.maxHp;
  const u = { ...t, maxHp: hp, hp, st: t.maxSt, staggered: false, staggerTurns: 0, shield: 0 };
  if (t.team === 'ally') {
    if (t.gun) u.ammo = AMMO_MAX;
    // the equipped E.G.O weapon: a one-use ultimate
    const eq = typeof W$ !== 'undefined' && EGO_BY_ID[W$.equip()[t.id]];
    u.ego = eq ? egoPage(eq) : null;
    u.egoUsed = false;
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
  while (drawn < n && handCount(u) < HAND_MAX) {
    if (!u.pool.length) u.pool = shuffle(u.pages.flatMap(p => Array.from({ length: SKILL_POOL[p.tier] }, () => ({ page: p }))));
    u.hand.push(u.pool.pop());
    drawn++;
  }
  return drawn;
}

// ---------------------------------------------------------------------
//  Turn flow
// ---------------------------------------------------------------------
function startCombatTest(id = 'corrupted') { startCombat({ id, ...COMBAT_SETS[id] }); }

// cfg: { id, enemies: [unit ids], bg, music, defeat, tutorial, story, ammo }
function startCombat(cfg) {
  G.mode = 'combat';
  ui.hub.classList.add('hidden');
  hideAllOverlays();
  const first = COMBAT_UNITS[cfg.enemies[0]];
  G.s = { bg: cfg.bg || first.bg }; G.actors = {}; G.fade = 0;
  CB.active = true; CB.turn = 0; CB.anims = []; CB.fx = []; CB.parts = []; CB.view = null; CB.animating = false;
  CB.cam = { ...CAM_HOME };
  CB.cfg = cfg;
  CB.enemyId = cfg.id;
  CB.tips = {};
  CB.stats = { dealt: 0, taken: 0, maxHit: 0, clashWon: 0, clashLost: 0 };
  Music.play(cfg.music || MUSIC_FOR[cfg.enemies[0]]);
  CB.allies = [makeUnit(COMBAT_UNITS.lobelto), makeUnit(COMBAT_UNITS.gonza)];
  const gonza = CB.allies[1];
  if (cfg.ammo != null) gonza.ammo = cfg.ammo;
  // several copies of one enemy get their own ids, names and places
  const n = cfg.enemies.length;
  CB.enemies = cfg.enemies.map((eid, i) => {
    const u = makeUnit(COMBAT_UNITS[eid]);
    if (n > 1) {
      u.id = `${eid}_${i}`;
      u.name = `${u.name} ${'ABCD'[i]}`;
      u.bx = 300 - (n - i) * 52 + 6;
      u.by = u.by + (i % 2 ? 6 : -2);
    }
    return u;
  });
  CB.all = [...CB.allies, ...CB.enemies];
  for (const u of CB.all) {
    G.actors[u.id] = {
      x: u.bx, y: u.by, face: u.team === 'ally' ? 1 : -1, scale: u.scale, combat: true,
      hat: u.hat, armless: u.armless, bandaged: u.bandaged, kind: u.kind, item: u.gun ? 'pistol' : null, seed: CB.all.indexOf(u),
    };
  }
  CB.tut = cfg.tutorial ? { i: 0 } : null;
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
  CB.turnStart = performance.now();
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
    if (u.defTurn === CB.turn) { SFX.play('error'); return; }
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

// The portrait's E.G.O button: puts the ultimate on a die (the selected one
// if it is this character's, else a free one); pressing again takes it off.
function egoButton(u) {
  if (CB.phase !== 'select' || !canAct(u) || !u.ego) return;
  const onDie = diceOf(u).find(x => x.card && x.card.page === u.ego);
  if (onDie) { unassign(onDie); SFX.play('select'); return; }
  if (u.egoUsed) { SFX.play('error'); return; }
  const d = (CB.sel && CB.sel.unit === u) ? CB.sel : diceOf(u).find(x => !x.card) || diceOf(u)[0];
  if (!d) return;
  const card = { page: u.ego };
  if (!canAfford(d, card)) {
    SFX.play('error');
    const p = headPos(u);
    spawnAnim('text', p.x, p.y - 20, `Luz insuficiente (${costOf(u.ego)})`, '#ffe08a', 1000);
    return;
  }
  CB.sel = d;
  assignCard(d, card);
  SFX.play('light');
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
  if (tutBlocking()) return;
  const ts = tutStep();
  if (ts && ts.start) advanceTut();
  CB.animating = true;
  CB.phase = 'resolve';
  SFX.play('confirm');

  for (const d of allyDice()) {
    if (d.card) d.unit.hand = d.unit.hand.filter(c => c !== d.card);
    if (d.page && d.page.ego) d.unit.egoUsed = true;
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
    await wait(250);
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
    const takers = CB.allies.filter(u => alive(u) && handCount(u) < HAND_MAX);
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
    if (won && CB.cfg && CB.cfg.raid && !CB.instant) { W$.add(CB.cfg.raid); SAVE.save({ raid_wins: SAVE.get('raid_wins', 0) + 1 }); }
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
  const raid = CB.cfg && CB.cfg.raid;
  showHub();
  // back to the raid list after a raid fight
  if (raid) { G.hubTab = 'mapa'; G.hubNavSel = HUB_NAV.findIndex(n => n.id === 'mapa'); G.mapModeSel = MAP_MODES.findIndex(m => m.id === 'raid'); }
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
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
// overshoots a little and settles: gives landings and returns some elasticity
const easeOutBack = (k) => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

// Animates numeric fields of `obj` (ox, oy, tilt, sq...) toward `to`.
// A newer tween on the same field takes it over, so overlapping moves
// (a recoil still settling while the next coin hits) never fight.
let _tweenId = 0;
function tween(obj, to, ms, ease = easeOut) {
  if (!obj) return Promise.resolve();
  const from = {}, id = ++_tweenId;
  const own = obj._tw || (obj._tw = {});
  for (const k in to) { from[k] = obj[k] || 0; own[k] = id; }
  if (CB.instant || ms <= 0) { Object.assign(obj, to); return Promise.resolve(); }
  ms /= cspd();
  const start = performance.now();
  return new Promise(res => {
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / ms), e = ease(k);
      let mine = 0;
      for (const p in to) if (own[p] === id) { obj[p] = from[p] + (to[p] - from[p]) * e; mine++; }
      if (k < 1 && mine) requestAnimationFrame(step); else res();
    };
    step();
  });
}
// combat speed (Ajustes > Juego): every animation and pause is scaled by it
const cspd = () => (G.mode === 'combat' ? CFG.combatSpeed || 1 : 1);
const wait = (ms) => (CB.instant ? Promise.resolve() : delay(ms / cspd()));
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
  // E.G.O ultimate name card across the screen
  egoBanner(f, k) {
    const a = k < 0.12 ? k / 0.12 : k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.globalAlpha = a * 0.85;
    rect(-OX, f.y - 11, VW, 22, '#08060c');
    ctx.globalAlpha = a;
    rect(-OX, f.y - 11, VW, 1, f.col); rect(-OX, f.y + 10, VW, 1, f.col);
    const slide = (1 - Math.min(1, k * 5)) * 40;
    txt('E.G.O', f.x - 60 - slide, f.y + 3, f.col, 9, 'center');
    txt(f.name.toUpperCase(), f.x + 10 + slide, f.y + 4, '#ffffff', 12, 'center');
    ctx.globalAlpha = 1;
  },
  // pistol flash at the muzzle
  muzzle(f, k) {
    ctx.globalAlpha = Math.max(0, 1 - k);
    light(f.x, f.y, 10 * (1 - k) + 2, 6 * (1 - k) + 2, '#ffe08a', 0.8, 3);
    star(Math.round(f.x + f.dir * 2), Math.round(f.y), '#ffffff');
    rect(f.x + f.dir * 2, f.y, f.dir * 6 * (1 - k), 1, '#ffffff');
    ctx.globalAlpha = 1;
  },
  // bullet trail to the target
  tracer(f, k) {
    ctx.globalAlpha = Math.max(0, 1 - k * 1.2);
    line(f.x0, f.y0, f.x1, f.y1, '#ffe08a');
    const m = Math.min(1, k * 3);
    disc(f.x0 + (f.x1 - f.x0) * m, f.y0 + (f.y1 - f.y0) * m, 1, '#ffffff');
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

// screen-space effects are drawn outside the camera (fixed on screen)
const FX_SCREEN = new Set(['egoBanner']);
function drawScreenFx() {
  const now = performance.now();
  for (const f of CB.fx) if (FX_SCREEN.has(f.type)) { const k = (now - f.start) / f.ms; if (k >= 0 && k < 1) FX_DRAW[f.type](f, k); }
}
function drawFx() {
  const now = performance.now();
  CB.fx = CB.fx.filter(f => {
    const k = (now - f.start) / f.ms;
    if (k >= 1) return false;
    if (k >= 0 && !FX_SCREEN.has(f.type)) FX_DRAW[f.type](f, k);
    return true;
  });
  CB.parts = CB.parts.filter(p => {
    const dt = FRAME_DT;
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= Math.pow(0.97, dt);
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    if (p.len) line(p.x, p.y, p.x - p.vx * p.len, p.y - p.vy * p.len, p.col);
    else rect(p.x, p.y, 1, 1, p.col);
    return (p.life -= dt) > 0;
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
  a.walking = 'run';
  dust(u, 5, dir);
  const lean = tween(a, { tilt: (back ? -0.06 : 0.14) * dir * (a.face || 1) * (a.face || 1) }, 90);
  const trail = setInterval(() => {
    a.ghosts = [{ dx: -dir * 7, a: 0.3 }, { dx: -dir * 14, a: 0.14 }];
  }, 30);
  await Promise.all([lean, animateSlide(u.id, x, ms)]);
  clearInterval(trail);
  a.ghosts = null;
  a.walking = false;
  dust(u, back ? 3 : 7, -dir);
  if (!back) { a.pose = 'brace'; await tween(a, { tilt: -0.07 * dir, sq: 0.08 }, 60); }
  await tween(a, { tilt: 0, sq: 0 }, back ? 200 : 110, easeOutBack);
  a.pose = null;
}

const trail = (a, dir, n = 2) => { a.ghosts = Array.from({ length: n }, (_, i) => ({ dx: -dir * (6 + i * 6), a: 0.32 - i * 0.12 })); };

// The attacker's swing for one die, ending at the moment of impact.
// The attacker's move for one coin, ending at the moment of impact (moves.js).
async function strikeAnim(U, T, type, gun, dry) { return skillAnim(U, T, type, gun, dry); }

// Return to the neutral stance after a move
function settle(u, chain) { return settleMove(u, chain); }

async function recoilAnim(T, from, dmg = 0) {
  const a = actorOf(T);
  if (!a) return;
  const dir = -dirTo(T, from), heavy = dmg >= 8;
  a.poseMs = 20;
  a.pose = T.kind ? null : 'hurt';
  a.flashUntil = performance.now() + 90;
  await tween(a, { ox: dir * (heavy ? 12 : 7), oy: heavy ? -4 : -1, tilt: -(heavy ? 0.24 : 0.14) * dir, sq: -0.06 }, 70);
  await tween(a, { oy: 0, sq: 0.08 }, 80, easeIn);
  if (heavy) { dust(T, 5, -dir); if (!T.kind) { a.pose = 'land'; await wait(60); } }
  a.poseMs = null;
  a.pose = null;
  await tween(a, { ox: 0, tilt: 0, sq: 0 }, 320, easeOutBack);
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
  for (const [x, u] of [[a, A], [e, E]]) if (x) { x.poseMs = 20; x.pose = u.kind ? null : 'cock'; x.atk = true; }
  await Promise.all([tween(a, { ox: -3, tilt: -0.08 }, 50), tween(e, { ox: 3, tilt: 0.08 }, 50)]);
  for (const [x, u] of [[a, A], [e, E]]) if (x) { x.pose = u.kind ? (u.kind === 'cableskel' ? 'punch' : null) : 'cross'; }
  trail(a, 1, 2); trail(e, -1, 2);
  await Promise.all([tween(a, { ox: 9, tilt: 0.12 }, 45, easeIn), tween(e, { ox: -9, tilt: -0.12 }, 45, easeIn)]);
  const pa = chest(A), pe = chest(E);
  const mx = (pa.x + pe.x) / 2, my = Math.min(pa.y, pe.y) - 2;
  fx('clash', mx, my, 380);
  fx('star', mx, my, 260, { r: 12, col: '#ffd060', rot: Math.random() * TAU, n: 10 });
  fx('ring2', mx, my, 300, { r: 22, col: '#ffe8b0' });
  sparks(mx, my, 8, ['#ffd060', '#ffffff', '#ffb040'], 1, 3);
  sparks(mx, my, 8, ['#ffd060', '#ffffff', '#ffb040'], -1, 3);
  SFX.play('clash');
  shake(150);
  G.flash = { color: '#ffffff', start: performance.now(), ms: 60, a: 0.4 };
  await wait(110); // hit-stop
  a && (a.ghosts = null); e && (e.ghosts = null);
  await Promise.all([tween(a, { ox: -6, tilt: -0.06 }, 130, easeOutBack), tween(e, { ox: 6, tilt: 0.06 }, 130, easeOutBack)]);
  dust(A, 3, 1); dust(E, 3, -1);
  for (const x of [a, e]) if (x) { x.atk = false; x.pose = null; }
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
  // a retry may already have put a fresh actor under this id
  if (G.actors[u.id] === a) delete G.actors[u.id];
}

// Applies HP damage with stagger at 25% of it (rounded up). Returns the HP damage dealt.
function dealDamage(u, hpD) {
  if (!alive(u) || hpD <= 0) return 0;
  if (u.team === 'ally') hpD = Math.max(1, Math.round(hpD * diff().taken));
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
  G.flash = { color: u.team === 'ally' ? '#ff2a3c' : '#ffffff', start: performance.now(), ms: 110, a: u.team === 'ally' ? 0.45 : 0.25 };
  if (u.hp <= 0) {
    spawnAnim('text', p.x, p.y - 10, 'K.O.', '#ff4a5a', 1400, { big: true });
    SFX.play('ko');
    shake(500);
  } else if (!u.staggered && u.st <= 0) {
    u.staggered = true;
    u.staggerTurns = 2;
    if (u.team === 'enemy') tip('stagger');
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
async function applyHit(T, dmg, stats, from, type, gun, dry, chain) {
  if (!alive(T)) return;
  await strikeAnim(from, T, type, gun, dry);
  const dealt = resolveHit(T, dmg, stats, from);
  await wait(40);
  // the target keeps reeling while the attacker already moves on
  if (dealt && alive(T)) recoilAnim(T, from, dealt);
  await settle(from, chain && alive(T));
}

// The damage part of a hit: the shield soaks first, the rest reaches HP.
function resolveHit(T, dmg, stats, from) {
  if (!alive(T)) return 0;
  const p = headPos(T);
  const soaked = Math.min(T.shield, dmg);
  if (soaked) {
    T.shield -= soaked;
    spawnAnim('text', p.x + 14, p.y + 10, `-${soaked}`, '#9ac0ff', 900);
    particles(chest(T).x + dirTo(T, from) * 12, chest(T).y, 6, ['#9ac0ff', '#ffffff'], 1.4);
    SFX.play('block');
  }
  const dealt = dealDamage(T, dmg - soaked);
  if (dealt >= 8 && !CB.instant) {
    // heavy hit: the camera kicks in a touch and eases back
    const z = CB.cam.z;
    tween(CB.cam, { z: z + 0.06 }, 50).then(() => tween(CB.cam, { z }, 220));
  }
  if (!dealt && soaked) { spawnAnim('text', p.x, p.y - 4, 'BLOQUEADO', '#9ac0ff', 800); bark(T, 'block', 0.5); }
  if (stats) stats[from.team] += dealt;
  if (CB.stats) {
    if (from.team === 'ally') { CB.stats.dealt += dealt; CB.stats.maxHit = Math.max(CB.stats.maxHit, dealt); }
    else CB.stats.taken += dealt;
  }
  return dealt;
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

function side(d) { return { unit: d.unit, page: d.page, i: 0, roll: null, dry: false }; }

// A gun die spends one bullet when rolled; with the magazine empty it still
// rolls (so it can win or lose the clash) but deals no damage.
function fire(sd, die) {
  sd.dry = false;
  if (!isGun(die)) return;
  const U = sd.unit;
  if (U.ammo > 0) { U.ammo--; if (!U.ammo) tip('noammo'); return; }
  sd.dry = true;
  const p = headPos(U);
  spawnAnim('text', p.x, p.y - 30, 'SIN BALAS', '#a0a0b0', 1000);
}

async function doClash(ad, ed) {
  const A = ad.unit, E = ed.unit;
  const sa = side(ad), se = side(ed);
  const stats = { ally: 0, enemy: 0 };
  CB.view = { left: sa, right: se };
  if (ad.page.ego) await egoFlair(A, ad.page.ego);
  await Promise.all([dashTo(A, 150, 300), dashTo(E, 182, 300),
    camTo({ z: 1.55, x: 166, y: camY(A, E) }, 340)]);
  spawnAnim('text', 166, 44, '¡CHOQUE!', '#ffd060', 800, { big: true });
  bark(A, 'attack', 0.6);
  bark(E, 'attack', 0.4);
  await wait(160);

  const qa = ad.page.dice, qe = ed.page.dice;
  if (ad.page.ego) {
    // E.G.O: a pure clash with no damage; only a win plays the finisher,
    // which deals all the damage. A loss lets the enemy's coins hit.
    await egoClashLoop(A, E, sa, se);
    if (sa.i < qa.length && canAct(A) && alive(E)) await egoCinematic(sa, E, stats);
    else if (alive(A)) { const p = headPos(A); spawnAnim('text', p.x, p.y - 24, 'E.G.O ROTO', '#ff4a5a', 1100, { big: true }); SFX.play('stagger'); }
    await leftovers(se, A, stats);
  } else {
    while (sa.i < qa.length && se.i < qe.length && canAct(A) && canAct(E)) {
      const [ta, a1, a2] = qa[sa.i], [te, e1, e2] = qe[se.i];
      sa.roll = rnd(a1, a2); se.roll = rnd(e1, e2);
      fire(sa, qa[sa.i]); fire(se, qe[se.i]);
      rollFx(A, ta, sa.roll); rollFx(E, te, se.roll);
      await wait(230);
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
      if (f.evade === 'a') { E._move = { page: se.page, i: se.i }; await evadeFx(A, sa.roll, E); }
      if (f.evade === 'b') { A._move = { page: sa.page, i: sa.i }; await evadeFx(E, se.roll, A); }
      for (const h of f.hits) {
        const [T, from, die, sd, raw] = h.to === 'a' ? [A, E, te, se, qe[se.i]] : [E, A, ta, sa, qa[sa.i]];
        if (kindOf(die) === 'counter') spawnAnim('text', headPos(from).x, headPos(from).y - 22, 'CONTRAATAQUE', DIE.counter.col, 900);
        const gun = raw && isGun(raw) && kindOf(die) === 'off';
        from._move = { page: sd.page, i: sd.i };
        await applyHit(T, gun && sd.dry ? 0 : h.dmg, stats, from, die, gun, gun && sd.dry);
      }
      const aa = actorOf(A), ae = actorOf(E);
      if (aa) aa.pose = null;
      if (ae) ae.pose = null;
      await Promise.all([settle(A), settle(E)]);
      await wait(110);
      if (!f.stayA) sa.i++;
      if (!f.stayB) se.i++;
      sa.roll = null; se.roll = null;
    }
    await leftovers(sa, E, stats);
    await leftovers(se, A, stats);
  }

  // Light goes to the ally if their side dealt more damage in this clash
  if (CB.stats && stats.ally !== stats.enemy) CB.stats[stats.ally > stats.enemy ? 'clashWon' : 'clashLost']++;
  if (alive(A) && stats.ally > stats.enemy && A.light < A.maxLight) {
    A.light++;
    tip('light');
    const p = headPos(A);
    spawnAnim('text', p.x, p.y - 26, '+1 LUZ', '#ffe08a', 1200, { big: true });
    particles(p.x, p.y - 20, 10, ['#ffe08a', '#ffffff'], 1.2, -0.02);
    SFX.play('light');
  }
  A.shield = 0;
  E.shield = 0;
  await Promise.all([dashTo(A, A.bx, 280, true), dashTo(E, E.bx, 280, true), camTo(CAM_HOME, 320)]);
  egoDone(A);
}

// E.G.O pages clash like Limbus skills: every exchange compares the two
// rolls and breaks the loser's coin while the winner's coin stays for the
// next one; nobody takes damage. Ties are rerolled (twice at most).
async function egoClashLoop(A, E, sa, se) {
  const qa = sa.page.dice, qe = se.page.dice;
  let ties = 0;
  while (sa.i < qa.length && se.i < qe.length && canAct(A) && canAct(E)) {
    const [ta, a1, a2] = qa[sa.i], [te, e1, e2] = qe[se.i];
    sa.roll = rnd(a1, a2); se.roll = rnd(e1, e2);
    rollFx(A, ta, sa.roll); rollFx(E, te, se.roll);
    await wait(200);
    await clashCollide(A, E);
    if (sa.roll === se.roll) {
      const pa = headPos(A), pb = headPos(E);
      spawnAnim('text', (pa.x + pb.x) / 2, Math.min(pa.y, pb.y) - 12, 'EMPATE', '#a39c90', 700);
      SFX.play('tie');
      if (++ties > 2) { sa.i++; se.i++; ties = 0; }
    } else {
      ties = 0;
      const [L, W, ls] = sa.roll > se.roll ? [E, A, se] : [A, E, sa];
      const p = headPos(L), la = actorOf(L);
      fx('coinBreak', p.x, p.y - 14, 600, { col: L === A ? egoCol(sa.page.ego) : '#c0283a' });
      spawnAnim('text', p.x, p.y - 26, 'MONEDA ROTA', L === A ? '#ff4a5a' : '#ffd060', 800);
      SFX.play('stagger');
      if (la) tween(la, { ox: (la.ox || 0) - dirTo(L, W) * 6, tilt: -0.1 * dirTo(L, W) }, 70).then(() => tween(la, { tilt: 0 }, 160));
      ls.i++;
    }
    await Promise.all([settle(A), settle(E)]);
    await wait(120);
    sa.roll = null; se.roll = null;
  }
}

async function doOneSided(d, T) {
  const s = side(d);
  const def = { unit: T, page: null, i: 0, roll: null };
  CB.view = d.unit.team === 'ally' ? { left: s, right: def } : { left: def, right: s };
  if (d.page.ego) await egoFlair(d.unit, d.page.ego);
  const tx = T.team === 'ally' ? T.bx + (d.unit.kind ? 30 : 20) : T.bx - (T.kind ? 30 : 20);
  await Promise.all([dashTo(d.unit, tx, 300), camTo({ z: 1.5, x: (tx + T.bx) / 2, y: camY(d.unit, T) }, 340)]);
  bark(d.unit, 'attack', 0.5);
  await wait(70);
  if (d.page.ego && d.unit.team === 'ally') await egoCinematic(s, T, null);
  else await leftovers(s, T, null);
  await Promise.all([dashTo(d.unit, d.unit.bx, 280, true), camTo(CAM_HOME, 320)]);
  egoDone(d.unit);
}

// The ultimate's entrance: the camera closes in, the screen takes the
// weapon's risk colour, its name is announced and the weapon appears in hand.
async function egoFlair(U, w) {
  const a = actorOf(U);
  if (!a || CB.instant) return;
  const col = egoCol(w), p = headPos(U);
  a.egoSave = a.item; a.item = null;
  a.ego = { kind: w.kind, col };
  a.pose = 'hold';
  SFX.play(w.risk === 'ALEPH' ? 'aleph' : 'rare');
  await camTo({ z: 1.45, x: a.x + 30, y: p.y + 16 }, 260);
  G.flash = { color: col, start: performance.now(), ms: 320, a: 0.6 };
  fx('egoBanner', 160, 52, 1300, { name: w.name, risk: w.risk, col });
  fx('focus', 160, 0, 1200, { col, cy: 52 });
  if (RISK_ORDER.indexOf(w.risk) >= 2 && CFG.impactFrames) fx('invert', 160, 0, 90, { col });
  particles(chest(U).x, chest(U).y, 18, [col, '#ffffff'], 1.6, -0.02, 30);
  if (RISK_ORDER.indexOf(w.risk) >= 3) shake(350);
  bark(U, 'attack');
  await wait(900);
}
function egoDone(U) {
  const a = actorOf(U);
  if (!a || !a.ego) return;
  a.ego = null; a.item = a.egoSave || null; a.pose = null;
}

// Remaining attack and counter dice hit unopposed; block and evade leftovers are discarded.
async function leftovers(s, T, stats) {
  const U = s.unit;
  while (s.i < s.page.dice.length && canAct(U) && alive(T)) {
    const [ty, a, b] = s.page.dice[s.i];
    if (DIE[ty].off) {
      s.roll = rnd(a, b);
      fire(s, s.page.dice[s.i]);
      rollFx(U, ty, s.roll);
      await wait(150);
      const gun = isGun(s.page.dice[s.i]);
      U._move = { page: s.page, i: s.i };
      const more = s.page.dice.slice(s.i + 1).some(([t]) => DIE[t].off);
      await applyHit(T, s.dry ? 0 : s.roll, stats, U, ty, gun, s.dry, more);
      if (!more) await wait(60);
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
    const defFree = u.defTurn !== CB.turn && !u.hand.some(c => c.page === u.defense);
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
    if (u.team === 'enemy' && CB.enemies.length === 1 && m.x >= 200 && m.x < 304 && m.y >= 104 && m.y < 124) return { unit: u };
    if (u.team === 'enemy' && CB.enemies.length > 1 && m.x >= a.x - 18 && m.x < a.x + 18 && m.y >= u.by && m.y < u.by + 12) return { unit: u };
  }
  return null;
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

function clashMark(x, y, t, odds) {
  light(x, y, 7, 7, '#ffd060', 0.35 + 0.15 * Math.sin(t / 150), 3);
  line(x - 3, y - 3, x + 3, y + 3, '#fff');
  line(x + 3, y - 3, x - 3, y + 3, '#fff');
  if (odds == null || !CFG.clashOdds) return;
  // chance to win this clash, like Limbus' clash preview
  const pc = Math.round(odds * 100), col = pc >= 60 ? '#3fbf6a' : pc >= 40 ? '#e8c040' : '#ff4a5a';
  const s = `${pc}%`;
  ctx.font = '8px VT323, monospace';
  const w = Math.ceil(ctx.measureText(s).width) + 4;
  rrect(x - w / 2, y + 4, w, 9, '#08060c', 2);
  rect(x - w / 2, y + 4, w, 1, col);
  txt(s, x, y + 11, col, 8, 'center');
}

// Win chance of an ally page against an enemy page (cached: it only
// changes when the pages do). E.G.O pages use their own clash rule.
const _odds = new Map();
function clashOdds(pa, pb) {
  const key = JSON.stringify([pa.dice, pb.dice, !!pa.ego]);
  if (_odds.has(key)) return _odds.get(key);
  let win = 0;
  const n = 300;
  for (let k = 0; k < n; k++) {
    if (pa.ego) {
      // coins break one by one; win if the E.G.O page still has coins at the end
      let ia = 0, ib = 0, guard = 0;
      while (ia < pa.dice.length && ib < pb.dice.length && guard++ < 50) {
        const ra = rnd(pa.dice[ia][1], pa.dice[ia][2]), rb = rnd(pb.dice[ib][1], pb.dice[ib][2]);
        if (ra > rb) ib++; else if (rb > ra) ia++;
      }
      if (ia < pa.dice.length) win++;
    } else {
      const [a, b] = simClash(pa, pb);
      win += a > b ? 1 : a === b ? 0.5 : 0;   // [damage dealt by A, by B]
    }
  }
  const p = win / n;
  if (_odds.size > 400) _odds.clear();
  _odds.set(key, p);
  return p;
}

// Every attack shows its arrow. Each arrow gets its own lane over the top,
// as far apart as the space allows, so every clash can be told apart.
// Hovering (or tapping) a character brings its arrows forward and fades the rest.
function drawArrows(t, focus) {
  const lit = new Set();
  const list = [];
  for (const e of enemyDice()) {
    if (!e.page || !e.target || !canAct(e.unit)) continue;
    if (e.target.target === e && e.target.page) continue;
    list.push({ a: e, b: e.target, col: '#ff4050' });
  }
  for (const d of allyDice()) {
    if (!d.page || !d.target || !canAct(d.unit)) continue;
    list.push({ a: d, b: d.target, col: '#ffd060', both: d.target.target === d, clash: true });
  }
  if (!list.length) return lit;
  const mine = (r) => !focus || r.a.unit === focus.unit || r.b.unit === focus.unit;
  // shorter arrows stay low, longer ones go higher, so they nest instead of crossing
  list.sort((r1, r2) => Math.abs(tokenPos(r1.a).x - tokenPos(r1.b).x) - Math.abs(tokenPos(r2.a).x - tokenPos(r2.b).x));
  const ends = new Map(), used = new Map();
  for (const r of list) for (const d of [r.a, r.b]) ends.set(d, (ends.get(d) || 0) + 1);
  const point = (d) => {
    const n = ends.get(d), k = used.get(d) || 0;
    used.set(d, k + 1);
    const p = tokenPos(d);
    return { x: p.x + (k - (n - 1) / 2) * Math.min(6, 12 / Math.max(1, n - 1)), y: p.y - 4 };
  };
  const roof = Math.min(...list.map(r => Math.min(tokenPos(r.a).y, tokenPos(r.b).y))) - 10;
  const gap = Math.max(6, Math.min(14, (roof - 3) / Math.max(1, list.length - 1)));
  const drawn = list.map((r, i) => ({ r, top: Math.max(4, roof - i * gap), p0: point(r.a), p1: point(r.b) }));
  // faded ones first, highlighted ones on top
  drawn.sort((x, y) => mine(x.r) - mine(y.r));
  for (const { r, top, p0, p1 } of drawn) {
    const on = mine(r);
    ctx.globalAlpha = on ? 1 : 0.22;
    const m = arc(p0.x, p0.y, p1.x, p1.y, r.col, t, r.both, Math.max(9, top));
    if (r.clash && on) clashMark(m[0], m[1], t, r.b.page && r.a.page ? clashOdds(r.a.page, r.b.page) : null);
    ctx.globalAlpha = 1;
    if (on && focus) { lit.add(r.a); lit.add(r.b); }
  }
  if (focus) for (const d of CB.dice) if (d.unit === focus.unit) lit.add(d);
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

// bullets left: a small cartridge and the count
function ammoBadge(x, y, n) {
  const col = n ? '#e8c060' : '#6a6070';
  rect(x, y - 4, 2, 4, col); rect(x, y - 5, 2, 1, n ? '#b08030' : '#4a4450');
  txt(`${n}`, x + 4, y, n ? '#f0e0b0' : '#ff6a78', 8);
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
  if (u.gun) ammoBadge(x + 18, y + 13, u.ammo);
  if (u.staggered) txt(`ATURD. ${u.staggerTurns - 1}T`, x + 18, y + 10, Math.floor(t / 400) % 2 ? '#ff4a5a' : '#8a2030', 8);
  else txt(`${u.st}/${u.maxSt}`, x + 18, y + 10, '#e8c040', 8);
  shieldBar(x - 15, y - 1, u.shield);
}

// compact plate under an enemy when several share the stage
function enemyMiniPlate(u, t) {
  const a = G.actors[u.id];
  if (!a) return;
  const x = Math.round(a.x), y = u.by;
  rect(x - 17, y + 2, 34, 9, '#0a080e');
  rect(x - 17, y + 2, 34, 1, '#5a1a24');
  const hp = u.hp / u.maxHp;
  rect(x - 16, y + 4, 32, 2, '#2a1418');
  rect(x - 16, y + 4, Math.round(32 * hp), 2, '#e03040');
  rect(x - 16, y + 7, 32, 2, '#2a2410');
  rect(x - 16, y + 7, Math.round(32 * u.st / u.maxSt), 2, '#e8c040');
  txt(String(u.hp), x + 19, y + 9, '#ff8a3a', 9);
  txt(u.staggered ? `ATURD.` : `${u.st}`, x - 19, y + 9, u.staggered ? '#ff4a5a' : '#e8c040', 8, 'right');
  shieldBar(x - 16, y - 2, u.shield);
}

function enemyPlate(u, t) {
  if (CB.enemies.length > 1) return enemyMiniPlate(u, t);
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
    if (u.gun) ammoBadge(cx + 6, 131, u.ammo);
    if (u.ego && ok) {
      const on = dice.some(x => x.card && x.card.page === u.ego), w = u.ego.ego;
      const col = u.egoUsed ? '#2a2a34' : on ? '#ffffff' : egoCol(w);
      hitArea(cx + 1, pcy - 14, 16, 9, () => egoButton(u), { page: u.ego });
      if (on || (!u.egoUsed && u.light >= costOf(u.ego))) light(cx + 9, pcy - 10, 10, 6, egoCol(w), 0.25 + 0.1 * Math.sin(t / 180), 2);
      rrect(cx + 1, pcy - 13, 16, 7, col, 2);
      txt(u.egoUsed ? 'USADO' : 'EGO', cx + 9, pcy - 7.5, u.egoUsed ? '#5a5a6a' : on ? '#16121a' : '#ffffff', 7, 'center');
    }
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
  // automatic page picking: favour winning clashes, or raw damage
  txt('AUTO', 304, 137, '#8a8070', 7, 'center');
  smallBtn(290, 140, 28, 11, 'Choque', () => autoAssign('win'));
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
  pg.dice.forEach((die, k) => {
    const [ty, a, b] = die;
    const ry = y + h - 8 - (pg.dice.length - 1 - k) * 7;
    dieIcon(ty, x + 3, ry - 3);
    txt(`${a}-${b}`, x + 10, ry + 2, '#d8d0c0', 8);
    if (isGun(die)) { rect(x + 25, ry - 3, 2, 4, d.unit.ammo ? '#e8c060' : '#6a6070'); rect(x + 25, ry - 4, 2, 1, '#b08030'); }
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
    const tl = pg.ego ? `E.G.O ${pg.ego.risk}` : { 0: 'Defensa', P: 'Extra' }[pg.tier] || `Hab. ${TIER[pg.tier].label}`;
    txt(`${tl} · Luz ${costOf(pg)}`, x + bw - 4, y + 9, pg.ego ? egoCol(pg.ego) : TIER[pg.tier].col, 8, 'right');
  }
  pg.dice.forEach(([ty, a, b], k) => {
    dieIcon(ty, x + 4, y + 12 + k * 9);
    txt(`${a}-${b}  ${DIE[ty].name}${pg.dice[k][3] === 'gun' ? ' · 1 bala' : ''}`, x + 12, y + 17 + k * 9, '#e8e4dc', 8);
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
    a.stag = u.staggered;
  }
}

function drawCombatHUD(t) {
  if (!CB.active) return;
  refreshActors();
  const cam = camOn();          // effects and ally plates live in the world, so they follow the camera
  drawFx();
  CB.hits = [];
  if (!CB.cine) for (const u of CB.allies) if (alive(u)) allyPlate(u, t);
  if (cam) ctx.restore();
  drawScreenFx();
  // during an E.G.O finisher the HUD steps aside for letterbox bars
  if (CB.cine) { drawCineOverlay(t); return; }
  for (const u of CB.enemies) if (alive(u)) enemyPlate(u, t);
  if (CB.phase === 'select') {
    const focus = focusUnit();
    const lit = drawArrows(t, focus);
    for (const d of CB.dice) drawToken(d, t, focus && !lit.has(d));
  }
  topBar();
  if (CB.phase === 'select') selectPanel(t); else clashPanel();
  tooltip();
  drawTutorial(t);
  cv.style.cursor = CB.hits.some(h => h.hot) ? 'pointer' : 'default';
}

// ---------------------------------------------------------------------
//  Keyboard: 1-4 pages, Tab next speed die, Q defense, E E.G.O, A auto
// ---------------------------------------------------------------------
function combatKey(e) {
  if (CB.phase !== 'select' || tutBlocking()) return;
  const d = CB.sel, u = d && d.unit;
  if (/^[1-8]$/.test(e.key) && u) { const c = u.hand[+e.key - 1]; if (c) toggleCard(c); }
  else if (e.key === 'Tab') {
    e.preventDefault();
    const ds = allyDice().filter(x => canAct(x.unit));
    if (ds.length) selectDie(ds[(ds.indexOf(d) + 1) % ds.length]);
  } else if ((e.key === 'q' || e.key === 'Q') && u) defenseButton(u);
  else if ((e.key === 'e' || e.key === 'E') && u) egoButton(u);
  else if (e.key === 'a' || e.key === 'A') autoAssign('win');
}

// ---------------------------------------------------------------------
//  Tutorial: guided steps for the first fight, plus one-time tips
// ---------------------------------------------------------------------
const bbox = (pts, pad = 0) => {
  if (!pts.length) return null;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
  return { x: x0, y: y0, w: Math.max(...xs) + pad - x0, h: Math.max(...ys) + pad - y0 };
};
const TUT_FOCUS = {
  allyTokens: () => bbox(allyDice().map(tokenPos), 13),
  enemyTokens: () => { const b = bbox(enemyDice().map(tokenPos), 12); return b && { ...b, h: b.h + 12 }; },
  hand: () => ({ x: 87, y: 123, w: 164, h: 57 }),
  light: () => ({ x: 2, y: 123, w: 80, h: 10 }),
  arrows: () => ({ x: 20, y: 2, w: 280, h: 60 }),
  gonza: () => ({ x: 41, y: 123, w: 40, h: 57 }),
  portraits: () => ({ x: 4, y: 145, w: 76, h: 35 }),
  gear: () => ({ x: 250, y: 124, w: 40, h: 56 }),
  enemyPlates: () => bbox(CB.enemies.filter(alive).flatMap(u => [{ x: u.bx - 18, y: u.by }, { x: u.bx + 26, y: u.by + 12 }]), 2),
};
const TUT = [
  { text: '¡Primer combate! Te enseño lo básico.' },
  { focus: 'allyTokens', text: 'Estos hexágonos son las FICHAS DE VELOCIDAD. El número es la velocidad: quien tiene más, actúa antes. Lobelto tiene 2 fichas y Gonza 1.' },
  { focus: 'enemyTokens', text: 'Los enemigos también tienen fichas. Debajo de cada una ves el rango de daño del ataque que preparan.' },
  { focus: 'hand', text: 'Abajo está la MANO del personaje elegido. Cada PÁGINA tiene dados (corte, perforación, contundente...) y cuesta LUZ. Como mucho tendrás 4.' },
  { focus: 'light', text: 'Los puntos amarillos son tu LUZ. Cada pocos turnos puedes guardar más, y ganar un choque te da +1.' },
  { focus: 'hand', text: 'Toca una página para ponerla en la ficha marcada en amarillo.', until: () => allyDice().some(d => d.page) },
  { focus: 'arrows', text: 'Las FLECHAS muestran quién ataca a quién. Si tu ficha y la del enemigo se apuntan entre sí, hay CHOQUE: los dos tiráis dados y gana el más alto.' },
  { focus: 'enemyTokens', text: 'Toca una ficha enemiga para elegir a quién apuntas. Pasa el ratón (o toca) por un personaje para resaltar sus flechas.' },
  { focus: 'gonza', text: () => `Gonza lleva una PISTOLA: cada dado con bala gasta 1 y le quedan ${CB.allies[1].ammo} de ${AMMO_MAX}. Sin balas, ese dado choca igual pero no hace daño.` },
  { focus: 'portraits', text: 'El RETRATO es tu defensa: una vez por turno añade gratis una página para esquivar o bloquear.' },
  { focus: 'gear', text: 'Cuando quieras, pulsa INICIAR (el engranaje) para resolver el turno.', start: true },
  { turn: 2, focus: 'enemyPlates', text: 'Los golpes también bajan la barra amarilla. Si llega a 0, el enemigo queda ATURDIDO: no actúa y recibe el doble de daño.' },
  { turn: 2, text: 'Cada turno robas páginas nuevas. ¡Ahora te toca a ti: acaba con ellos!' },
];
const TIPS = {
  noammo: '¡Gonza se ha quedado sin balas! Sus disparos chocarán igual, pero sin hacer daño.',
  stagger: '¡Enemigo ATURDIDO! Este turno no actúa y recibe el doble de daño.',
  light: '+1 LUZ: la ganas al hacer más daño que el rival en un choque.',
};
// the current step, if it is showing right now
function tutStep() {
  if (!CB.tut || CB.phase !== 'select') return null;
  const st = TUT[CB.tut.i];
  if (!st) { CB.tut = null; return null; }
  if (CB.turn < (st.turn || 1)) return null;
  // let the "TURNO n" banner play out before a new turn's first message
  if (CB.turnStart && performance.now() - CB.turnStart < 1100 && (CB.tut.i === 0 || st.turn)) return null;
  return st;
}
// steps without a task wait for a click/Enter and block the board meanwhile
const tutBlocking = () => { const st = tutStep(); return !!st && !st.until && !st.start; };
function advanceTut() { if (CB.tut) { CB.tut.i++; CB.tut.at = performance.now(); SFX.play('select'); } }
function tip(key) {
  if (!CB.cfg || !(CB.cfg.tutorial || CB.cfg.tips) || CB.tips[key] || CB.instant) return;
  CB.tips[key] = true;
  CB.toast = { text: TIPS[key], start: performance.now() };
}

function drawTutorial(t) {
  const st = tutStep();
  if (st && st.until && st.until()) { advanceTut(); return; }
  if (st) {
    const f = st.focus && TUT_FOCUS[st.focus]();
    // dim everything but the focus
    ctx.globalAlpha = 0.55;
    if (f) {
      rect(-OX, 0, VW, f.y, '#000'); rect(-OX, f.y + f.h, VW, H - f.y - f.h, '#000');
      rect(-OX, f.y, f.x + OX, f.h, '#000'); rect(f.x + f.w, f.y, VW - f.x - f.w, f.h, '#000');
    } else rect(-OX, 0, VW, H, '#000');
    ctx.globalAlpha = 1;
    if (f) {
      const pulse = Math.floor(t / 250) % 2;
      const c = pulse ? '#ffd060' : '#c09040';
      rect(f.x - 1, f.y - 1, f.w + 2, 1, c); rect(f.x - 1, f.y + f.h, f.w + 2, 1, c);
      rect(f.x - 1, f.y - 1, 1, f.h + 2, c); rect(f.x + f.w, f.y - 1, 1, f.h + 2, c);
    }
    const lines = wrap(typeof st.text === 'function' ? st.text() : st.text, 236, 8);
    const bh = 12 + lines.length * 8;
    // explaining the stage → box over the bottom panel; explaining the panel → box at the top
    const by = !f ? 60 : f.y >= 100 ? 6 : H - bh - 3;
    rrect(36, by, 248, bh, '#100c14', 2);
    rect(36, by, 248, 1, '#ffd060');
    lines.forEach((ln, i) => txt(ln, 42, by + 9 + i * 8, '#f0e8d8', 8));
    const hint = st.until || st.start ? '' : (IS_TOUCH ? 'Toca para seguir ▸' : 'Clic / Intro para seguir ▸');
    if (hint) txt(hint, 280, by + bh - 3, Math.floor(t / 400) % 2 ? '#ffd060' : '#a08040', 7, 'right');
    txt(`${CB.tut.i + 1}/${TUT.length}`, 40, by + bh - 3, '#6a6070', 7);
  }
  // one-time tips slide in at the top for a few seconds
  const ts = CB.toast;
  if (ts) {
    const k = (performance.now() - ts.start) / 4200;
    if (k >= 1) { CB.toast = null; return; }
    const lines = wrap(ts.text, 220, 8), bh = 8 + lines.length * 8;
    const y = 16 - (k < 0.06 ? (1 - k / 0.06) * 20 : k > 0.9 ? (k - 0.9) / 0.1 * 20 : 0);
    ctx.globalAlpha = k > 0.9 ? (1 - k) / 0.1 : 1;
    rrect(44, y, 232, bh, '#1a1408', 2); rect(44, y, 232, 1, '#ffd060');
    lines.forEach((ln, i) => txt(ln, 50, y + 8 + i * 8, '#ffe8b0', 8));
    ctx.globalAlpha = 1;
  }
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
  if (tutBlocking()) { advanceTut(); return; }
  for (let i = CB.hits.length - 1; i >= 0; i--) {
    const r = CB.hits[i];
    if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) { SFX.init(); r.fn(); return; }
  }
});

// a grade for the fight: fewer turns and more health left score higher
function combatRank() {
  const hp = CB.allies.reduce((s, u) => s + Math.max(0, u.hp), 0) / CB.allies.reduce((s, u) => s + u.maxHp, 0);
  const score = hp * 60 + Math.max(0, 40 - (CB.turn - 3) * 6);
  const [rank, col] = score >= 85 ? ['S', '#ffd060'] : score >= 65 ? ['A', '#ff8a3a'] : score >= 45 ? ['B', '#5ab0ff'] : ['C', '#a39c90'];
  return { rank, col };
}

function renderCombatUI() {
  if (CB.phase !== 'done') { ui.combatUI.innerHTML = ''; return; }
  const won = CB.enemies.every(u => !alive(u));
  const story = CB.cfg && CB.cfg.story;
  const defeatText = (CB.cfg && CB.cfg.defeat) || CB.enemies[0].defeat || 'Los enemigos han caído.';
  const gonza = CB.allies.find(u => u.gun);
  const btns = story
    ? (won ? '<button class="cb-result-btn" data-act="combat-continue">Continuar</button>'
      : '<button class="cb-result-btn" data-act="combat-retry">Reintentar</button><button class="cb-result-btn" data-act="combat-exit">Salir al menú</button>')
    : '<button class="cb-result-btn" data-act="combat-exit">Volver al Hub</button><button class="cb-result-btn" data-act="combat-retry">Reintentar</button>';
  ui.combatUI.innerHTML = `<div class="cb-result" style="border-color:${won ? 'var(--gold)' : '#ff3b4a'}">
    <div class="cb-result-title ${won ? 'win' : 'lose'}">${won ? 'VICTORIA' : 'DERROTA'}</div>
    <div class="cb-result-sub">${won ? defeatText : 'Tu equipo ha sido derrotado...'}</div>
    <div class="cb-result-stats">Turnos: ${CB.turn}${gonza ? ` · Balas: ${gonza.ammo}/${AMMO_MAX}` : ''}</div>
    ${won && CB.cfg && CB.cfg.raid ? `<div class="cb-result-stats" style="color:#5ae0c0">+${CB.cfg.raid} Enkephalina</div>` : ''}
    <div class="cb-result-stats">${CB.allies.map(u => `${u.name}: ${u.hp}/${u.maxHp} HP`).join(' · ')}</div>
    ${CB.stats ? `<div class="cb-result-grid">
      <div><b>${CB.stats.dealt}</b>daño hecho</div><div><b>${CB.stats.taken}</b>daño recibido</div>
      <div><b>${CB.stats.maxHit}</b>golpe máximo</div><div><b>${CB.stats.clashWon}/${CB.stats.clashWon + CB.stats.clashLost}</b>choques ganados</div>
    </div>` : ''}
    ${won ? (() => { const r = combatRank(); return `<div class="cb-rank" style="color:${r.col}">${r.rank}</div>`; })() : ''}
    ${btns}
  </div>`;
  const on = (act, fn) => { const b = ui.combatUI.querySelector(`[data-act="${act}"]`); if (b) b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); };
  on('combat-exit', endCombat);
  on('combat-retry', () => startCombat({ ...CB.cfg, tutorial: false, tips: CB.cfg.tutorial || CB.cfg.tips }));
  on('combat-continue', () => { if (typeof storyAfterCombat === 'function') storyAfterCombat(); });
}

function spawnAnim(type, x, y, text, color, ms, extra) {
  CB.anims.push({ type, x, y, text, color, start: performance.now(), ms, ...extra });
}

async function animateSlide(unitId, toX, durMs) {
  const actor = G.actors[unitId];
  if (!actor) return;
  durMs /= cspd();
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
