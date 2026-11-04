// =====================================================================
//  MAIN — State, story runner, input, render loop
// =====================================================================
const $ = (id) => document.getElementById(id);
const ui = {
  hub: $('hub'), levels: $('levels'), confirm: $('confirm'), settings: $('settings'),
  combatUI: $('combat-ui'),
  card: $('card'), cardTitle: document.querySelector('.c-title'),
  cardSub: document.querySelector('.c-sub'), box: $('box'), name: $('name'),
  text: $('text'), next: $('next'),
};

const G = {
  mode: 'hub', idx: 0, s: {}, actors: {},
  shakeUntil: 0, flash: null, fade: 0, fadeAnim: null,
  typing: null, waiting: null, skip: false,
  hubView: 'main',
  hubTab: 'ventana',
  hubNavSel: 0,
  mapSel: 0,
  mapModeSel: 0,
  scene: null,
  steps: [],
  pendingScene: null,
};

function isSceneUnlocked(sc) {
  if (!sc.requires) return true;
  return SAVE.get('done_' + sc.requires, false);
}

function isSceneDone(sc) { return SAVE.get('done_' + sc.id, false); }

// Init hub (hub.js defines showHub)
showHub();

// ---------- Story runner ----------
function run() {
  while (G.idx < G.steps.length) {
    const st = G.steps[G.idx++];
    if (handle(st)) return;
  }
  finishScene();
}

function finishScene() {
  hideBox();
  const sc = G.scene;
  SAVE.save({ ['done_' + sc.id]: true, current_scene: null });
  const nextIdx = SCENES.indexOf(sc) + 1;
  const next = nextIdx < SCENES.length && SCENES[nextIdx].ep === sc.ep ? SCENES[nextIdx] : null;
  if (next) {
    ui.cardTitle.textContent = `ESCENA ${sc.num} COMPLETADA`;
    ui.cardSub.textContent = 'Siguiente: ' + next.title;
  } else {
    ui.cardTitle.textContent = 'FIN DEL EPISODIO ' + sc.ep;
    ui.cardSub.textContent = 'Continuará...';
  }
  ui.card.classList.remove('hidden');
  G.mode = 'end'; G.waiting = 'card';
  G._nextScene = next;
}

function later(ms, fn) { setTimeout(fn, G.skip ? Math.min(ms, 60) : ms); }

function handle(st) {
  const now = performance.now();
  if (st.card) {
    hideBox();
    ui.cardTitle.textContent = st.card; ui.cardSub.textContent = st.sub || '';
    ui.card.classList.remove('hidden');
    G.waiting = 'card'; G.mode = 'card';
    if (G.skip) later(300, advance);
    return true;
  }
  if (st.bg) { G.s.bg = st.bg; return false; }
  if (st.set) {
    for (const k in st.set) {
      const v = st.set[k];
      G.s[k] = (v && typeof v === 'object' && !Array.isArray(v) && k === 'offline') ? { ...(G.s[k] || {}), ...v } : v;
    }
    return false;
  }
  if (st.actors) {
    for (const k in st.actors) {
      if (st.actors[k] === null) delete G.actors[k]; else G.actors[k] = st.actors[k];
    }
    return false;
  }
  if (st.sfx) { SFX.play(st.sfx); return false; }
  if (st.fx === 'shake') { G.shakeUntil = now + st.ms; return false; }
  if (st.fx === 'flash') { G.flash = { color: st.color, start: now, ms: st.ms }; return false; }
  if (st.fade) {
    hideBox();
    const to = st.fade === 'out' ? 1 : 0;
    G.fadeAnim = { from: G.fade, to, start: now, ms: G.skip ? 60 : st.ms };
    G.waiting = 'timer';
    later(st.ms, () => { G.fade = to; G.fadeAnim = null; G.waiting = null; run(); });
    return true;
  }
  if (st.wait) {
    G.waiting = 'timer';
    later(st.wait, () => { G.waiting = null; run(); });
    return true;
  }
  if (st.say || st.narr || st.scream) { showText(st); return true; }
  return false;
}

function showText(st) {
  ui.box.classList.remove('hidden');
  ui.name.textContent = st.say || (st.scream ? '¿¿??' : '');
  ui.text.className = st.narr ? 'narr' : st.scream ? 'scream' : '';
  ui.next.classList.remove('on');
  const full = st.say ? st.text : (st.narr || st.scream);
  const who = st.who || (st.scream ? '¿¿??' : null);
  G.s.speaker = who; G.s.typing = true;
  G.waiting = 'text';
  G.typing = { full, shown: 0, who, cut: st.cut };
  ui.text.textContent = '';
  tick();
}

function tick() {
  const ty = G.typing;
  if (!ty) return;
  if (G.skip) ty.shown = ty.full.length;
  else ty.shown++;
  ui.text.textContent = ty.full.slice(0, ty.shown);
  const ch = ty.full[ty.shown - 1];
  if (ch && ch !== ' ' && ty.shown % 2 && ty.who) SFX.blip(ty.who);
  if (ty.shown >= ty.full.length) return finishTyping();
  const spd = CFG.textSpeed === 'muyrapido' ? 0.3 : CFG.textSpeed === 'rapido' ? 0.6 : 1;
  const pause = (/[.,!?]/.test(ch) ? 90 : 28) * spd;
  ty.timer = setTimeout(tick, pause);
}

function finishTyping() {
  const ty = G.typing;
  clearTimeout(ty.timer);
  ui.text.textContent = ty.full;
  G.s.typing = false;
  ui.next.classList.add('on');
  G.typing = { ...ty, done: true };
  if (ty.cut) later(120, advance);
  else if (G.skip) later(70, advance);
}

function hideBox() { ui.box.classList.add('hidden'); G.s.typing = false; }

function advance() {
  SFX.init();
  if (G.mode === 'hub') return;
  if (G.waiting === 'text') {
    if (G.typing && !G.typing.done) return finishTyping();
    G.typing = null; G.waiting = null; G.s.speaker = null;
    return run();
  }
  if (G.waiting === 'card') {
    ui.card.classList.add('hidden');
    G.waiting = null;
    if (G.mode === 'end') {
      if (G._nextScene) { startScene(G._nextScene); G._nextScene = null; }
      else showHub();
      return;
    }
    G.mode = 'play';
    return run();
  }
}

// ---------- Keyboard ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') { SFX.muted = !SFX.muted; return; }
  if (e.key === 'h' || e.key === 'H') { ui.box.classList.toggle('dim'); return; }
  if (e.key === 'Control') { if (!G.skip) { G.skip = true; if (G.waiting === 'text' || G.waiting === 'card') advance(); } return; }
  if (G.mode === 'hub') {
    if (G.hubView === 'main') {
      const enabled = getEnabledNavIndices();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const cur = enabled.indexOf(G.hubNavSel);
        const next = cur >= 0
          ? enabled[(cur + (e.key === 'ArrowRight' ? 1 : enabled.length - 1)) % enabled.length]
          : enabled[0];
        G.hubNavSel = next;
        SFX.init(); SFX.play('select');
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (G.hubTab === 'mapa') {
          const ep1 = SCENES.filter(s => s.ep === 1);
          const unlocked = ep1.filter(s => isSceneUnlocked(s));
          if (unlocked.length > 0) {
            G.mapSel = (G.mapSel + (e.key === 'ArrowDown' ? 1 : unlocked.length - 1)) % unlocked.length;
            SFX.init(); SFX.play('select');
          }
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (G.hubTab === 'mapa' && G.mapSel >= 0) {
          const ep1 = SCENES.filter(s => s.ep === 1);
          const sc = ep1[G.mapSel];
          if (sc && isSceneUnlocked(sc)) { SFX.play('select'); showConfirm(sc); }
        } else {
          activateNavBtn(HUB_NAV[G.hubNavSel].id);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (G.hubTab === 'mapa') {
          G.mapModeSel = (G.mapModeSel + 1) % MAP_MODES.length;
          SFX.play('select');
        }
      }
    } else if (G.hubView === 'confirm' || G.hubView === 'levels' || G.hubView === 'settings') {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (hubBtns.length > 1) {
          hubSel = (hubSel + (e.key === 'ArrowDown' ? 1 : hubBtns.length - 1)) % hubBtns.length;
          hubBtns.forEach((x, j) => x.classList.toggle('sel', j === hubSel));
          SFX.init(); SFX.play('select');
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); hubAct(hubBtns[hubSel]);
      }
    }
    if (e.key === 'Escape') {
      if (G.hubView === 'confirm') hideConfirm();
      else if (G.hubView === 'levels') hideLevels();
      else if (G.hubView === 'settings') hideSettings();
      else if (G.hubTab === 'mapa') { G.hubTab = 'ventana'; SFX.play('select'); }
    }
    return;
  }
  if (G.mode === 'combat') {
    if (e.key === 'Escape' && !CB.animating) endCombat();
    if (e.key === 'Enter') combatExecute();
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) advance(); }
  if (e.key === 'Escape') showHub();
});
document.addEventListener('keyup', (e) => { if (e.key === 'Control') G.skip = false; });
window.addEventListener('blur', () => { G.skip = false; });
document.getElementById('game').addEventListener('click', (e) => {
  if (G.mode !== 'hub' && G.mode !== 'combat') advance();
});

// ---------- Render ----------
const hintEl = $('hint');
function render(t) {
  const now = performance.now();
  const hintOn = G.mode !== 'hub' && G.mode !== 'combat';
  if (hintOn !== G._hintOn) { G._hintOn = hintOn; hintEl.classList.toggle('hidden', !hintOn); }
  ctx.save();
  ctx.scale(SCALE, SCALE);
  ctx.translate(OX, 0);
  if (now < G.shakeUntil) ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 4));

  if (G.mode === 'hub') {
    drawHub(t);
  } else {
    drawWide(() => (BG[G.s.bg] || BG.black)(G.s, t), G.s.bg);
    const order = G.mode === 'combat'
      ? Object.keys(G.actors).sort((a, b) => G.actors[a].y - G.actors[b].y)
      : ['corrupted', 'gonza', 'lobelto'];
    for (const id of order) {
      const a = G.actors[id];
      if (!a) continue;
      const talk = G.s.typing && G.s.speaker === id;
      const enemyDraw = { corrupted, machine: egoMachine, operator }[a.kind];
      const draw = () => (enemyDraw ? enemyDraw(a.x, a.y, a, t) : figure(a.x, a.y, { ...a, talk }, t));
      if (CFG.shadows && !a.lifted) drawActorShadow(a, draw);
      draw();
    }
    const r = G.s.rift;
    if (r) { r.w += (r.target - r.w) * 0.04; rift(r.x, r.y, r.w, r.h + r.w * 0.6, t); }
    postFX(G.s, t);
    if (G.mode === 'combat') drawCombatHUD(t);
  }
  if (G.flash) {
    const k = 1 - (now - G.flash.start) / G.flash.ms;
    if (k <= 0) G.flash = null;
    else { ctx.globalAlpha = Math.min(1, k * 1.2); rect(-OX, 0, VW, H, G.flash.color); ctx.globalAlpha = 1; }
  }

  if (CB.active && CB.anims.length > 0) {
    CB.anims = CB.anims.filter(a => {
      const elapsed = now - a.start;
      if (elapsed > a.ms) return false;
      const progress = elapsed / a.ms;
      const alpha = progress < 0.15 ? progress / 0.15 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
      ctx.globalAlpha = Math.max(0, alpha);
      if (a.type === 'impact') {
        const rad = 2 + progress * 18;
        ctx.strokeStyle = a.color; ctx.lineWidth = 2 - progress * 1.5;
        ctx.beginPath(); ctx.arc(a.x, a.y, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; return true;
      }
      ctx.textAlign = 'center';
      if (a.type === 'dmg') {
        const bounce = progress < 0.15 ? progress / 0.15 * -8 : -8 + (progress - 0.15) * 12;
        ctx.font = a.big ? '18px VT323, monospace' : '16px VT323, monospace';
        ctx.fillStyle = '#200';
        ctx.fillText(a.text, (a.x + 1) | 0, (a.y + bounce + 1) | 0);
        ctx.fillStyle = a.color;
        ctx.fillText(a.text, a.x | 0, (a.y + bounce) | 0);
      } else {
        ctx.font = `${a.big ? 16 : 11}px VT323, monospace`;
        const yOff = -progress * 6;
        ctx.fillStyle = '#000';
        ctx.fillText(a.text, (a.x + 1) | 0, (a.y + yOff + 1) | 0);
        ctx.fillStyle = a.color;
        ctx.fillText(a.text, a.x | 0, (a.y + yOff) | 0);
      }
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      return true;
    });
  }

  if (G.fadeAnim) {
    const k = Math.min(1, (now - G.fadeAnim.start) / G.fadeAnim.ms);
    G.fade = G.fadeAnim.from + (G.fadeAnim.to - G.fadeAnim.from) * k;
  }
  if (G.fade > 0 && G.mode !== 'hub') {
    ctx.globalAlpha = Math.round(G.fade * 6) / 6; rect(-OX, 0, VW, H, '#000'); ctx.globalAlpha = 1;
  }
  drawScanlines();
  ctx.restore();
  present(t);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
