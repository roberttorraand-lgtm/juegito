// =====================================================================
//  COMBAT SYSTEM (Limbus Company-style)
// =====================================================================
const SIN_COLORS = {
  ira:     '#e03030',
  lujuria: '#e88020',
  pereza:  '#60a0d0',
  gula:    '#d0a020',
  melancolia: '#5060b0',
  orgullo: '#20b060',
  envidia: '#a040c0',
};
const SIN_NAMES = {
  ira: 'Ira', lujuria: 'Lujuria', pereza: 'Pereza', gula: 'Gula',
  melancolia: 'Melancolía', orgullo: 'Orgullo', envidia: 'Envidia',
};

function makeUnit(template) {
  return {
    ...template,
    hp: template.maxHp,
    staggerHp: template.maxStagger,
    staggered: false,
    staggerTurns: 0,
    selectedSkill: null,
    speed: 0,
  };
}

const COMBAT_UNITS = {
  lobelto: {
    id: 'lobelto', name: 'LOBELTO', team: 'ally',
    maxHp: 80, maxStagger: 40,
    speedRange: [3, 7],
    hat: 'headset', armless: true, bandaged: true,
    skills: [
      { name: 'Puñetazo desesperado', sin: 'ira', coins: 2, base: 4, coinPow: 3, desc: 'Golpe torpe pero con rabia' },
      { name: 'Cabezazo táctico', sin: 'orgullo', coins: 1, base: 8, coinPow: 6, desc: 'Todo o nada con la cabeza' },
      { name: 'Esquivar y gritar', sin: 'pereza', coins: 3, base: 2, coinPow: 2, desc: 'Evade mientras insulta' },
      { name: 'Cubrirse', sin: 'pereza', coins: 2, base: 3, coinPow: 4, type: 'evade', desc: 'Se agacha — puede esquivar el ataque' },
    ],
  },
  gonza: {
    id: 'gonza', name: 'GONZA', team: 'ally',
    maxHp: 90, maxStagger: 50,
    speedRange: [2, 6],
    hat: 'cap',
    skills: [
      { name: 'Patada lateral', sin: 'lujuria', coins: 2, base: 5, coinPow: 3, desc: 'Patada con estilo' },
      { name: 'Golpe con tubo', sin: 'gula', coins: 1, base: 7, coinPow: 7, desc: 'Encontró un tubo oxidado' },
      { name: 'Combo callejero', sin: 'ira', coins: 3, base: 3, coinPow: 2, desc: 'Serie rápida de golpes' },
      { name: 'Guardia firme', sin: 'orgullo', coins: 2, base: 4, coinPow: 3, type: 'guard', desc: 'Bloquea con los brazos — reduce daño recibido' },
    ],
  },
  corrupted: {
    id: 'corrupted', name: 'EMPLEADO E.G.O.', team: 'enemy',
    maxHp: 120, maxStagger: 55,
    speedRange: [1, 5],
    kind: 'corrupted',
    skills: [
      { name: 'Tajo dentado', sin: 'melancolia', coins: 2, base: 6, coinPow: 4, desc: 'Corte con arma fundida' },
      { name: 'Embestida ciega', sin: 'ira', coins: 1, base: 10, coinPow: 5, desc: 'Carga brutal' },
      { name: 'Grito distorsionado', sin: 'envidia', coins: 3, base: 2, coinPow: 3, desc: 'Ondas que desorientan' },
      { name: 'Coraza E.G.O.', sin: 'melancolia', coins: 2, base: 5, coinPow: 4, type: 'guard', desc: 'El traje absorbe parte del golpe' },
    ],
  },
};

const CB = {
  active: false,
  turn: 0,
  phase: 'select',
  allies: [],
  enemies: [],
  all: [],
  lanes: [],
  pickedSkill: null,
  log: [],
  animating: false,
  anims: [],
};

function rollSpeed(unit) {
  const [lo, hi] = unit.speedRange;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function flipCoin() { return Math.random() < 0.5; }

function rollSkill(skill) {
  let total = skill.base;
  const flips = [];
  for (let i = 0; i < skill.coins; i++) {
    const heads = flipCoin();
    flips.push(heads);
    if (heads) total += skill.coinPow;
  }
  return { total, flips };
}

function startCombatTest() {
  G.mode = 'combat';
  ui.hub.classList.add('hidden');
  hideAllOverlays();
  G.s = { bg: 'arena' }; G.actors = {}; G.fade = 0;

  CB.active = true; CB.turn = 1;
  CB.allies = [makeUnit(COMBAT_UNITS.lobelto), makeUnit(COMBAT_UNITS.gonza)];
  CB.enemies = [makeUnit(COMBAT_UNITS.corrupted)];
  CB.all = [...CB.allies, ...CB.enemies];
  CB.log = []; CB.anims = [];
  CB.phase = 'select';
  CB.pickedSkill = null;

  buildLanes();
  updateCombatActors();
  renderCombatUI();
  ui.combatUI.classList.remove('hidden');
  SFX.play('select');
}

function buildLanes() {
  CB.lanes = [];
  CB.enemies.filter(u => u.hp > 0 && !u.staggered).forEach(enemy => {
    const numSlots = enemy.hp > enemy.maxHp * 0.5 ? 2 : 1;
    const offensive = enemy.skills.map((s, i) => (!s.type ? i : -1)).filter(i => i >= 0);
    for (let n = 0; n < numSlots; n++) {
      const si = offensive[Math.floor(Math.random() * offensive.length)];
      CB.lanes.push({ enemy, skillIdx: si, matched: null });
    }
  });
}

function updateCombatActors() {
  G.actors = {};
  const aliveAllies = CB.allies.filter(u => u.hp > 0);
  const aliveEnemies = CB.enemies.filter(u => u.hp > 0);
  aliveAllies.forEach((u, i) => {
    const x = 55 + i * 55;
    G.actors[u.id] = {
      ...u, x, y: 148, face: 1, scale: 1.5,
      hat: u.hat, armless: u.armless, bandaged: u.bandaged,
      shake: u.staggered, pain: u.staggered,
    };
  });
  aliveEnemies.forEach((u, i) => {
    const x = 250 - i * 55;
    G.actors[u.id] = {
      ...u, x, y: 148, face: -1, scale: 1.7,
      kind: u.kind, rage: u.hp < u.maxHp * 0.3,
      shake: u.staggered, blind: u.staggered,
    };
  });
}

function isSkillAssigned(unitId, skillIdx) {
  return CB.lanes.some(l => l.matched && l.matched.unit.id === unitId && l.matched.skillIdx === skillIdx);
}

function isUnitFullyAssigned(unit) {
  const assigned = CB.lanes.filter(l => l.matched && l.matched.unit.id === unit.id).length;
  const selfDef = unit._selfDefense != null;
  return assigned + (selfDef ? 1 : 0) > 0;
}

function renderCombatUI() {
  if (!CB.active) return;
  let html = '';

  html += '<div class="cb-top"><div class="cb-bars">';
  const barHtml = (u) => {
    const hpPct = Math.max(0, u.hp / u.maxHp * 100);
    const stPct = Math.max(0, u.staggerHp / u.maxStagger * 100);
    const low = hpPct < 30 ? ' low' : '';
    return `<div class="cb-bar">
      <div class="cb-bar-name">${u.name}</div>
      <div class="cb-bar-track"><div class="cb-bar-fill hp${low}" style="width:${hpPct}%"></div></div>
      <div class="cb-bar-val">HP ${u.hp}/${u.maxHp}</div>
      <div class="cb-bar-track"><div class="cb-bar-fill stagger" style="width:${stPct}%"></div></div>
      <div class="cb-bar-val">SP ${u.staggerHp}/${u.maxStagger}</div>
      ${u.staggered ? '<div class="cb-bar-staggered">STAGGER</div>' : ''}
    </div>`;
  };
  CB.allies.forEach(u => { html += barHtml(u); });
  html += '</div><div class="cb-bars">';
  CB.enemies.forEach(u => { html += barHtml(u); });
  html += '</div></div>';

  html += `<div style="text-align:center"><span class="cb-turn">Turno ${CB.turn}</span> <span class="cb-phase">— ${phaseLabel()}</span></div>`;

  if (CB.phase === 'select') {
    html += '<div class="cb-board">';
    html += '<div class="cb-lanes-head"><span class="cb-lanes-label">ATAQUES ENEMIGOS</span><span class="cb-lanes-label">TU RESPUESTA</span></div>';
    CB.lanes.forEach((lane, li) => {
      const sk = lane.enemy.skills[lane.skillIdx];
      const sinCol = SIN_COLORS[sk.sin];
      const eMin = sk.base, eMax = sk.base + sk.coins * sk.coinPow;
      const matched = lane.matched;
      const cls = matched ? ' matched' : (CB.pickedSkill ? ' targeted' : '');
      html += `<div class="cb-lane${cls}" data-lane="${li}">`;
      html += `<div class="cb-lane-enemy" style="border-left:.4cqw solid ${sinCol}">
        <span class="cb-lane-name">${lane.enemy.name}</span>
        <span class="cb-lane-skill">${sk.name}</span>
        <span class="cb-lane-pow">${eMin}~${eMax}</span>
        <span class="cb-lane-coins">${'●'.repeat(sk.coins)}</span></div>`;
      html += '<span class="cb-lane-vs">⚔</span>';
      if (matched) {
        const ask = matched.unit.skills[matched.skillIdx];
        const asinCol = SIN_COLORS[ask.sin];
        const aMin = ask.base, aMax = ask.base + ask.coins * ask.coinPow;
        html += `<div class="cb-lane-ally" style="border-left:.4cqw solid ${asinCol}">
          <span class="cb-lane-name">${matched.unit.name}</span>
          <span class="cb-lane-aname">${ask.name}</span>
          <span class="cb-lane-pow">${aMin}~${aMax}</span>
          <button class="cb-lane-clear" data-clear="${li}">✕</button></div>`;
      } else {
        html += '<div class="cb-lane-ally empty">Asignar habilidad</div>';
      }
      html += '</div>';
    });

    CB.allies.filter(u => u.hp > 0 && !u.staggered).forEach(u => {
      html += '<div class="cb-dash">';
      html += `<span class="cb-dash-unit">${u.name}:</span>`;
      u.skills.forEach((sk, si) => {
        const assigned = isSkillAssigned(u.id, si);
        const selfDef = u._selfDefense === si;
        const isPicked = CB.pickedSkill && CB.pickedSkill.unit.id === u.id && CB.pickedSkill.skillIdx === si;
        const isDef = sk.type === 'guard' || sk.type === 'evade';
        const sinCol = SIN_COLORS[sk.sin];
        let cls = isDef ? ' def' : '';
        if (assigned || selfDef) cls += ' assigned';
        else if (isPicked) cls += ' picked';
        const icon = sk.type === 'guard' ? '🛡' : sk.type === 'evade' ? '↺' : '';
        const minPow = sk.base, maxPow = sk.base + sk.coins * sk.coinPow;
        html += `<button class="cb-skill${cls}" data-unit="${u.id}" data-skill="${si}" style="border-left:.4cqw solid ${sinCol}">
          ${icon}<span class="cb-sk-name">${sk.name}</span>
          <span class="cb-sk-range">${minPow}~${maxPow}</span>
          <span class="cb-coins">${'●'.repeat(sk.coins)}</span>
        </button>`;
      });
      html += '</div>';
    });

    const anyAssigned = CB.lanes.some(l => l.matched) || CB.allies.some(u => u._selfDefense != null);
    html += `<button class="cb-go" ${anyAssigned ? '' : 'disabled'} data-act="combat-go">Combatir</button>`;
    html += '</div>';
  }

  if (CB.log.length > 0 && CB.phase !== 'select') {
    html += '<div class="cb-log">';
    CB.log.slice(-6).forEach(l => {
      html += `<div class="cb-log-line ${l.type}">${l.text}</div>`;
    });
    html += '</div>';
  }

  if (CB.phase === 'done') {
    const won = CB.enemies.every(u => u.hp <= 0);
    const borderCol = won ? 'var(--gold)' : '#ff3b4a';
    html += `<div class="cb-result" style="border-color:${borderCol}">
      <div class="cb-result-title ${won ? 'win' : 'lose'}">${won ? 'VICTORIA' : 'DERROTA'}</div>
      <div class="cb-result-sub">${won ? 'El empleado distorsionado ha caído.' : 'Tu equipo ha sido derrotado...'}</div>
      <div class="cb-result-stats">Turnos: ${CB.turn}</div>
      <div class="cb-result-stats">${CB.allies.map(u => `${u.name}: ${u.hp}/${u.maxHp} HP`).join(' · ')}</div>
      <button class="cb-result-btn" data-act="combat-exit">Volver al Hub</button>
      <button class="cb-result-btn" data-act="combat-retry">Reintentar</button>
    </div>`;
  }

  ui.combatUI.innerHTML = html;
  bindCombatEvents();
}

function phaseLabel() {
  if (CB.phase === 'select') return 'Selecciona habilidades';
  if (CB.phase === 'speed') return 'Velocidad...';
  if (CB.phase === 'clash') return 'Clash';
  if (CB.phase === 'resolve') return 'Resolución';
  if (CB.phase === 'done') return 'Fin';
  return '';
}

function bindCombatEvents() {
  ui.combatUI.querySelectorAll('.cb-skill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.classList.contains('assigned')) return;
      const uid = btn.dataset.unit;
      const si = parseInt(btn.dataset.skill);
      const u = CB.allies.find(a => a.id === uid);
      if (!u) return;
      const sk = u.skills[si];
      if (sk.type === 'guard' || sk.type === 'evade') {
        if (u._selfDefense === si) { delete u._selfDefense; }
        else { u._selfDefense = si; }
        CB.pickedSkill = null;
        renderCombatUI(); SFX.play('select');
        return;
      }
      if (CB.pickedSkill && CB.pickedSkill.unit.id === uid && CB.pickedSkill.skillIdx === si) {
        CB.pickedSkill = null;
      } else {
        CB.pickedSkill = { unit: u, skillIdx: si };
      }
      renderCombatUI(); SFX.play('select');
    });
  });

  ui.combatUI.querySelectorAll('.cb-lane').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const li = parseInt(el.dataset.lane);
      const lane = CB.lanes[li];
      if (!lane || !CB.pickedSkill) return;
      if (lane.matched) return;
      lane.matched = { unit: CB.pickedSkill.unit, skillIdx: CB.pickedSkill.skillIdx };
      CB.pickedSkill = null;
      renderCombatUI(); SFX.play('select');
    });
  });

  ui.combatUI.querySelectorAll('.cb-lane-clear').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const li = parseInt(btn.dataset.clear);
      if (CB.lanes[li]) { CB.lanes[li].matched = null; renderCombatUI(); SFX.play('select'); }
    });
  });

  const goBtn = ui.combatUI.querySelector('[data-act="combat-go"]');
  if (goBtn && !goBtn.disabled) goBtn.addEventListener('click', (e) => { e.stopPropagation(); combatExecute(); });

  const exitBtn = ui.combatUI.querySelector('[data-act="combat-exit"]');
  if (exitBtn) exitBtn.addEventListener('click', (e) => { e.stopPropagation(); endCombat(); });

  const retryBtn = ui.combatUI.querySelector('[data-act="combat-retry"]');
  if (retryBtn) retryBtn.addEventListener('click', (e) => { e.stopPropagation(); startCombatTest(); });
}

function combatLog(text, type = 'info') {
  CB.log.push({ text, type });
  renderCombatUI();
}

function endCombat() {
  CB.active = false;
  ui.combatUI.classList.add('hidden');
  G.actors = {};
  showHub();
}

function drawCombatBars() {
  if (!CB.active) return;
  CB.all.forEach(u => {
    const a = G.actors[u.id];
    if (!a || u.hp <= 0) return;
    const bx = a.x - 16, by = a.y - 46;
    ctx.font = '5px VT323, monospace';
    ctx.fillStyle = '#c9c2b6';
    ctx.fillText(u.name, bx, by - 2);
    rect(bx, by, 32, 3, '#1a1624');
    const hpPct = u.hp / u.maxHp;
    const hpCol = hpPct < 0.3 ? '#c0283a' : '#3fbf6a';
    rect(bx, by, Math.round(32 * hpPct), 3, hpCol);
    rect(bx, by + 4, 32, 2, '#1a1624');
    const stPct = u.staggerHp / u.maxStagger;
    rect(bx, by + 4, Math.round(32 * stPct), 2, '#d8a840');
    ctx.font = '4px VT323, monospace';
    ctx.fillStyle = '#9c97a8';
    ctx.fillText(`${u.hp}/${u.maxHp}`, bx + 33, by + 3);
    if (u.staggered) {
      const blink = Math.floor(performance.now() / 400) % 2;
      if (blink) { ctx.fillStyle = '#ff3b4a'; ctx.font = '5px VT323, monospace'; ctx.fillText('STAGGER', bx, by + 14); }
    }
  });
}

function spawnAnim(type, x, y, text, color, ms, extra) {
  CB.anims.push({ type, x, y, text, color, start: performance.now(), ms, ...extra });
}

function getActorPos(unitId) {
  const a = G.actors[unitId];
  return a ? { x: a.x, y: a.y - 30 } : { x: 160, y: 90 };
}

async function animateSlide(unitId, toX, durMs) {
  const actor = G.actors[unitId];
  if (!actor) return;
  const fromX = actor.x;
  const start = performance.now();
  return new Promise(resolve => {
    function step() {
      const t = Math.min(1, (performance.now() - start) / durMs);
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      actor.x = Math.round(fromX + (toX - fromX) * ease);
      if (t < 1) requestAnimationFrame(step); else resolve();
    }
    step();
  });
}

async function animateCoins(flips, cx, cy, skill) {
  let running = skill.base;
  spawnAnim('text', cx - 10, cy - 26, `Base:${running}`, '#9c97a8', 1400);
  await delay(300);
  for (let i = 0; i < flips.length; i++) {
    const heads = flips[i];
    const add = heads ? skill.coinPow : 0;
    running += add;
    const coinX = cx + i * 14 - (flips.length * 7);
    spawnAnim('coin', coinX, cy - 8, heads ? '★' : '·', heads ? '#ffd700' : '#3a3630', 900);
    if (heads) spawnAnim('text', coinX, cy - 16, `+${add}`, '#ffd700', 700);
    SFX.tone(heads ? 800 : 300, 0.06, 'square', 0.02);
    await delay(220);
  }
  spawnAnim('text', cx, cy - 32, `${running}`, '#fff', 1200, { big: true });
  await delay(400);
  return running;
}

async function combatExecute() {
  if (CB.animating) return;
  CB.animating = true;
  CB.log = []; CB.anims = [];
  CB.phase = 'clash';
  renderCombatUI();

  CB.allies.filter(u => u.hp > 0 && u._selfDefense != null).forEach(u => {
    const sk = u.skills[u._selfDefense];
    const defRoll = rollSkill(sk);
    u._defending = { type: sk.type, power: defRoll.total, name: sk.name };
    const label = sk.type === 'guard' ? 'se pone en guardia' : 'se prepara para esquivar';
    combatLog(`${u.name} ${label}: ${sk.name} = ${defRoll.total}`, 'info');
    const pos = getActorPos(u.id);
    spawnAnim('text', pos.x, pos.y - 10, sk.type === 'guard' ? 'GUARD' : 'EVADE', '#60a0d0', 800);
  });
  if (CB.allies.some(u => u._selfDefense != null)) await delay(600);

  for (let li = 0; li < CB.lanes.length; li++) {
    const lane = CB.lanes[li];
    const enemy = lane.enemy;
    if (enemy.hp <= 0) continue;
    const enemySkill = enemy.skills[lane.skillIdx];

    const matched = lane.matched;
    if (matched && matched.unit.hp > 0) {
      const ally = matched.unit;
      const allySkill = ally.skills[matched.skillIdx];

      combatLog(`¡CLASH! ${ally.name} vs ${enemy.name}`, 'clash');
      const enemyActor = G.actors[enemy.id];
      const allyActor = G.actors[ally.id];
      const midX = 160;

      const eSave = enemyActor ? enemyActor.x : 240;
      const aSave = allyActor ? allyActor.x : 80;
      await Promise.all([
        animateSlide(enemy.id, midX + 20, 300),
        animateSlide(ally.id, midX - 20, 300),
      ]);
      spawnAnim('text', midX, 70, 'CLASH!', '#d8a840', 900);
      SFX.play('hit');
      await delay(400);

      const atkRoll = rollSkill(allySkill);
      const defRoll = rollSkill(enemySkill);
      await animateCoins(atkRoll.flips, midX - 30, 60, allySkill);
      await animateCoins(defRoll.flips, midX + 30, 60, enemySkill);
      await delay(200);

      if (atkRoll.total >= defRoll.total) {
        const dmg = Math.max(1, atkRoll.total - defRoll.total);
        applyDamage(enemy, dmg);
        combatLog(`${ally.name} gana — ${dmg} daño a ${enemy.name}`, 'dmg');
        SFX.play('slash');
        G.flash = { color: '#ffffff', start: performance.now(), ms: 200 };
        spawnAnim('impact', midX + 20, 80, '', '#fff', 400);
        spawnAnim('dmg', midX + 20, 55, `-${dmg}`, '#ff3b4a', 1200);
      } else {
        const dmg = Math.max(1, defRoll.total - atkRoll.total);
        applyDamage(ally, dmg);
        combatLog(`${enemy.name} gana — ${dmg} daño a ${ally.name}`, 'dmg');
        SFX.play('slash');
        G.flash = { color: '#ff2a3c', start: performance.now(), ms: 200 };
        spawnAnim('impact', midX - 20, 80, '', '#c0283a', 400);
        spawnAnim('dmg', midX - 20, 55, `-${dmg}`, '#ff3b4a', 1200);
      }

      await delay(300);
      await Promise.all([
        animateSlide(enemy.id, eSave, 250),
        animateSlide(ally.id, aSave, 250),
      ]);
    } else {
      const targets = CB.allies.filter(u => u.hp > 0);
      if (targets.length === 0) continue;
      const target = targets[Math.floor(Math.random() * targets.length)];

      combatLog(`${enemy.name} usa ${enemySkill.name}`, 'dmg');
      const eSave = G.actors[enemy.id] ? G.actors[enemy.id].x : 240;
      const targetPos = getActorPos(target.id);
      await animateSlide(enemy.id, targetPos.x + 30, 300);
      SFX.play('hit');

      const roll = rollSkill(enemySkill);
      await animateCoins(roll.flips, targetPos.x + 10, 50, enemySkill);

      let dmg = roll.total;
      const def = target._defending;
      if (def && def.type === 'evade') {
        if (def.power >= roll.total) {
          combatLog(`¡${target.name} esquiva!`, 'heal');
          spawnAnim('text', targetPos.x, 45, 'MISS', '#60a0d0', 800);
          SFX.play('select');
          await delay(400);
          await animateSlide(enemy.id, eSave, 250);
          updateCombatActors(); renderCombatUI(); continue;
        } else {
          dmg = Math.max(1, roll.total - def.power);
          combatLog(`${target.name} no esquiva del todo`, 'info');
        }
      } else if (def && def.type === 'guard') {
        const reduced = Math.max(1, dmg - def.power);
        combatLog(`${target.name} bloquea — ${dmg} → ${reduced}`, 'info');
        spawnAnim('text', targetPos.x, 45, 'BLOCK', '#60a0d0', 800);
        dmg = reduced;
      } else if (target.staggered) {
        dmg = Math.ceil(dmg * 1.5);
        combatLog(`¡STAGGER! Daño x1.5`, 'clash');
      }

      applyDamage(target, dmg);
      combatLog(`${dmg} daño a ${target.name}`, 'dmg');
      SFX.play('slash');
      G.flash = { color: '#ff2a3c', start: performance.now(), ms: 200 };
      spawnAnim('impact', targetPos.x, 80, '', '#c0283a', 400);
      spawnAnim('dmg', targetPos.x, 45, `-${dmg}`, '#ff3b4a', 1200);
      await delay(300);
      await animateSlide(enemy.id, eSave, 250);
    }

    updateCombatActors();
    renderCombatUI();
    await delay(500);
    if (CB.enemies.every(u => u.hp <= 0) || CB.allies.every(u => u.hp <= 0)) break;
  }

  CB.all.filter(u => u.hp > 0 && u.staggered).forEach(u => {
    u.staggerTurns--;
    if (u.staggerTurns <= 0) {
      u.staggered = false;
      u.staggerHp = Math.ceil(u.maxStagger * 0.5);
      combatLog(`${u.name} se recupera del stagger`, 'heal');
    }
  });

  if (CB.enemies.every(u => u.hp <= 0) || CB.allies.every(u => u.hp <= 0)) {
    CB.phase = 'done';
    SFX.play(CB.enemies.every(u => u.hp <= 0) ? 'select' : 'disconnect');
  } else {
    CB.turn++;
    CB.phase = 'select';
    CB.all.forEach(u => { u.selectedSkill = null; delete u._defending; delete u._selfDefense; });
    CB.pickedSkill = null;
    buildLanes();
  }

  updateCombatActors();
  renderCombatUI();
  CB.animating = false;
}

function applyDamage(unit, dmg) {
  unit.hp = Math.max(0, unit.hp - dmg);
  if (!unit.staggered) {
    unit.staggerHp = Math.max(0, unit.staggerHp - Math.ceil(dmg * 0.6));
    if (unit.staggerHp <= 0) {
      unit.staggered = true;
      unit.staggerTurns = 1;
      combatLog(`¡${unit.name} ha entrado en STAGGER!`, 'clash');
      SFX.play('scream');
      G.shakeUntil = performance.now() + 400;
    }
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
