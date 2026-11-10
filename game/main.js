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
  alerts: [],
  emotes: [],
  runId: 0,
};

function isSceneUnlocked(sc) {
  if (!sc.requires) return true;
  return SAVE.get('done_' + sc.requires, false);
}

function isSceneDone(sc) { return SAVE.get('done_' + sc.id, false); }

// Init hub (hub.js defines showHub). Episodes finished before the market
// existed still pay their Enkephalina once.
showHub();
{
  const got = awardEpisodes();
  if (got.length) G.notice = { text: `+${ENK_PER_EPISODE * got.length} Enkephalina por los episodios terminados`, start: performance.now() };
}

// ---------- Story runner ----------
function run() {
  if (!G.scene || G.mode === 'hub') return;
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
  } else if (sc.partial) {
    ui.cardTitle.textContent = 'CONTINUARÁ...';
    ui.cardSub.textContent = `Episodio ${sc.ep} en desarrollo`;
  } else {
    ui.cardTitle.textContent = 'FIN DEL EPISODIO ' + sc.ep;
    const got = awardEpisodes();
    ui.cardSub.textContent = got.length ? `+${ENK_PER_EPISODE * got.length} Enkephalina · Continuará...` : 'Continuará...';
  }
  ui.card.classList.remove('hidden');
  G.mode = 'end'; G.waiting = 'card';
  G._nextScene = next;
}

// Timers belong to the scene run that set them: leaving or restarting a scene
// bumps G.runId, so a stale fade, wait or walk can never drive the new one.
function later(ms, fn) {
  const id = G.runId;
  setTimeout(() => { if (id === G.runId) fn(); }, G.skip ? Math.min(ms, 60) : ms);
}

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
  if (st.bg) { G.s.bg = st.bg; Music.play(MUSIC_FOR[st.bg]); return false; }
  if (st.fx === 'alert') { G.alerts.push({ who: st.who, start: now }); SFX.play('alert'); return false; }
  if (st.set) {
    for (const k in st.set) {
      const v = st.set[k];
      G.s[k] = (v && typeof v === 'object' && !Array.isArray(v) && k === 'offline') ? { ...(G.s[k] || {}), ...v } : v;
    }
    return false;
  }
  if (st.actors) {
    for (const k in st.actors) {
      if (st.actors[k] === null) { delete G.actors[k]; continue; }
      // copy, so walking never edits the scene data (replays start in place),
      // and keep the pose blend so limbs glide into the new pose
      const prev = G.actors[k], next = { ...st.actors[k] };
      if (prev) for (const f of ['_pNow', '_pName', '_pFrom', '_pStart', '_pMs', 'flashUntil']) next[f] = prev[f];
      G.actors[k] = next;
    }
    return false;
  }
  if (st.sfx) { SFX.play(st.sfx); return false; }
  if (st.save) { SAVE.save(st.save); return false; }
  if (st.hit) { const a = G.actors[st.hit]; if (a) a.flashUntil = now + 140; return false; }
  if (st.voice) { SFX.voice(st.voice, st.kind || 'hurt'); return false; }
  if ('doc' in st) {
    // an abnormality file shown full screen; a click puts it away
    G.s.doc = st.doc ? { id: st.doc, start: now } : null;
    if (!st.doc) return false;
    hideBox(); SFX.play('item');
    G.waiting = 'doc';
    return true;
  }
  if (st.combat) {
    // a fight inside the story: the scene waits here and resumes on victory
    hideBox();
    G.storySave = { s: G.s, actors: G.actors };
    startCombat({ id: st.combat, ...COMBAT_SETS[st.combat], story: true, ammo: SAVE.get('ammo', AMMO_MAX) });
    return true;
  }
  if (st.exprs) { for (const k in st.exprs) setExpr(k, st.exprs[k]); return false; }
  if (st.walk) return walkActors(st);
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

// { walk: { id: x, ... }, ms, async } — actors walk to new x positions,
// turning to face where they go unless keepFace is set.
function walkActors(st) {
  const ms = G.skip ? 60 : (st.ms || 1000);
  const from = {}, to = st.walk;
  for (const k in to) {
    const a = G.actors[k];
    if (!a) continue;
    from[k] = a.x;
    a.walking = st.run ? 'run' : true;
    if (!st.keepFace && to[k] !== a.x) a.face = Math.sign(to[k] - a.x);
  }
  const start = performance.now(), runId = G.runId;
  const done = () => {
    if (runId !== G.runId) return;
    for (const k in from) { const a = G.actors[k]; if (a) { a.x = to[k]; a.walking = false; } }
    if (!st.async) { G.waiting = null; run(); }
  };
  const step = () => {
    if (runId !== G.runId) return;
    const k = Math.min(1, (performance.now() - start) / ms);
    for (const id in from) { const a = G.actors[id]; if (a) a.x = from[id] + (to[id] - from[id]) * k; }
    if (k < 1) requestAnimationFrame(step); else done();
  };
  if (st.async) { step(); return false; }
  G.waiting = 'timer';
  step();
  return true;
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
  // shouted lines (screams, or written in capitals) shake letter by letter, Deltarune style
  const shout = !!st.scream || (/[A-ZÁÉÍÓÚÑ]{4}/.test(full) && full === full.toUpperCase());
  if (who && 'expr' in st) setExpr(who, st.expr);
  if (st.exprs) for (const k in st.exprs) setExpr(k, st.exprs[k]);
  // the voice follows the mood: explicit expression, else shouting, a question or silence
  const mood = st.expr || (shout ? 'shout' : /^[\s.]+$/.test(full) ? 'blank' : /\?\s*$/.test(full) ? 'ask' : null);
  G.typing = { full, shown: 0, who, cut: st.cut, shout, mood };
  ui.text.textContent = '';
  tick();
}

function setBoxText(ty, n) {
  const s = ty.full.slice(0, n);
  if (!ty.shout) { ui.text.textContent = s; return; }
  ui.text.innerHTML = [...s].map((c, i) => (c === ' ' ? ' '
    : `<span class="sh" style="animation-delay:-${(i * 53) % 240}ms">${c.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))}</span>`)).join('');
}

function tick() {
  const ty = G.typing;
  if (!ty || G.mode === 'hub') return;
  if (G.skip) ty.shown = ty.full.length;
  else ty.shown++;
  setBoxText(ty, ty.shown);
  const ch = ty.full[ty.shown - 1];
  if (ch && ch !== ' ' && ty.shown % 2) SFX.blip(ty.who || 'narr', ty.mood, ty.shown / ty.full.length);
  if (ty.shown >= ty.full.length) return finishTyping();
  const spd = CFG.textSpeed === 'muyrapido' ? 0.3 : CFG.textSpeed === 'rapido' ? 0.6 : 1;
  const pace = MOOD_PACE[ty.mood] || 1;
  const pause = (/[.,!?]/.test(ch) ? 90 : 28) * spd * pace;
  ty.timer = setTimeout(tick, pause);
}

function finishTyping() {
  const ty = G.typing;
  clearTimeout(ty.timer);
  setBoxText(ty, ty.full.length);
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
  if (G.waiting === 'doc') {
    G.s.doc = null; G.waiting = null;
    SFX.play('select');
    return run();
  }
  if (G.waiting === 'card') {
    ui.card.classList.add('hidden');
    G.waiting = null;
    if (G.mode === 'end') {
      if (G._nextScene) { startScene(G._nextScene); G._nextScene = null; }
      else showChapterOf(G.scene);
      return;
    }
    G.mode = 'play';
    return run();
  }
}

// ---------- Keyboard ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') { SFX.muted = !SFX.muted; Music.setVolume(); return; }
  if (e.key === 'h' || e.key === 'H') { ui.box.classList.toggle('dim'); return; }
  if (e.key === 'Control') { if (!G.skip) { G.skip = true; if (G.waiting === 'text' || G.waiting === 'card' || G.waiting === 'doc') advance(); } return; }
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
        if (G.hubTab === 'mapa' && G.chapter) {
          const eps = EPISODES.filter(x => x.chapter === G.chapter);
          const i = eps.findIndex(x => x.ep === G.epSel);
          G.epSel = eps[(i + (e.key === 'ArrowDown' ? 1 : eps.length - 1) + (i < 0 ? 1 : 0)) % eps.length].ep;
          SFX.init(); SFX.play('select');
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (G.pull) pullClick();
        else if (G.hubTab === 'mercado' || G.hubTab === 'pecadores') { /* mouse / touch only */ }
        else if (G.hubTab === 'mapa' && !G.chapter) openChapter(CHAPTERS[0].num);
        else if (G.hubTab === 'mapa' && G.epSel) playEpisode(G.epSel);
        else if (G.hubTab !== 'mapa') {
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
      else if (G.pull) pullClick();
      else if (G.hubTab === 'mercado') { activateNavBtn('ventana'); }
      else if (G.hubTab === 'pecadores') { activateNavBtn('ventana'); }
      else if (G.hubTab === 'mapa' && G.chapter) closeChapter();
      else if (G.hubTab === 'mapa') { G.hubTab = 'ventana'; SFX.play('select'); }
    }
    return;
  }
  if (G.mode === 'combat') {
    if (e.key === 'Escape' && !CB.animating) endCombat();
    if (e.key === 'Enter') { if (tutBlocking()) advanceTut(); else combatExecute(); }
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) advance(); }
  if (e.key === 'Escape') showHub();
});
document.addEventListener('keyup', (e) => { if (e.key === 'Control') G.skip = false; });
// switching window while holding Ctrl never delivers the keyup: stop skipping
window.addEventListener('blur', () => { G.skip = false; });
window.addEventListener('blur', () => { G.skip = false; });
document.getElementById('game').addEventListener('click', (e) => {
  if (G.mode !== 'hub' && G.mode !== 'combat') advance();
});

// Deltarune-style "!" that pops over a character's head
// Expressions: eyes/brows on the figure plus an anime-style emote over the head.
const MOOD_PACE = { shout: 0.8, angry: 0.85, happy: 0.9, shock: 0.85, sad: 1.35, blank: 1.6, nervous: 1.1 };
const EMOTE_FOR = { angry: 'vein', sad: 'gloom', nervous: 'sweat', shock: 'shock', happy: 'sparkle', confused: 'question', blank: 'dots', smug: 'sparkle' };
function setExpr(id, e) {
  const a = G.actors[id];
  // during the Discord call they are profile pictures, not figures on stage
  const onCall = !a && G.s.bg === 'call';
  if (!a && !onCall) return;
  const cur = a ? a.expr : G.s.exprs && G.s.exprs[id] && G.s.exprs[id].expr;
  if (cur === (e || null)) return;
  const em = EMOTE_FOR[e];
  const emote = em ? { type: em, start: performance.now() } : null;
  if (a) { a.expr = e || null; a.emote = emote; }
  else G.s.exprs = { ...(G.s.exprs || {}), [id]: { expr: e || null, emote } };
  if (em) SFX.play('emote_' + em);
}

function drawEmotes(t) {
  for (const id in G.actors) {
    const a = G.actors[id];
    if (!a || !a.emote || !a.expr || a.kind !== 'fig') continue;
    const s = (a.scale || 1) * (a.hat === 'cap' ? 0.86 : 1);
    drawEmoteAt(a.emote, a.x + (a.ox || 0), a.y - 27 * s, s, a.face || 1, t);
  }
}

// Draws one emote around a head centred at (hx, hy); offsets are in head
// units of a scale-1 stickman (head radius 5) and scaled by s.
function drawEmoteAt(em, hx, hy, s, f, t) {
  const k = (performance.now() - em.start) / 1000;
  const pop = Math.min(1, k * 6);
  const lasting = em.type === 'vein' || em.type === 'sweat' || em.type === 'gloom';
  if (!lasting && k > 1.6) return;
  ctx.save();
  ctx.globalAlpha = lasting ? 1 : Math.min(1, (1.6 - k) / 0.3);
  ctx.translate(hx, hy); ctx.scale(s, s);
  if (em.type === 'vein') {
    // pulsing cross-shaped vein at the temple
    const b = Math.sin(t / 120) > 0.6 ? 1 : 0;
    const x = -f * 6, y = -7;
    rect(x - 1, y - 2 - b, 2, 2, '#ff3040'); rect(x + 1, y - 2 - b, 2, 2, '#ff3040');
    rect(x - 1, y + 1, 2, 2, '#ff3040'); rect(x + 1, y + 1, 2, 2, '#ff3040');
    rect(x - 2 - b, y - 1, 2, 2, '#ff3040'); rect(x + 2 + b, y - 1, 2, 2, '#ff3040');
  } else if (em.type === 'sweat') {
    const y = -6 + ((t / 60) % 8), x = -f * 7;
    px(x, y, '#cfeaff'); rect(x - 1, y + 1, 3, 2, '#8ac8ff'); px(x, y + 3, '#5aa0e0');
  } else if (em.type === 'gloom') {
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 4; i++) {
      const h = 4 + ((Math.floor(t / 160) + i) % 3);
      rect(-5 + i * 3, -12 - h, 1, h, '#6a7ab0');
    }
  } else if (em.type === 'sparkle') {
    for (const [dx, dy, ph] of [[7, -9, 0], [10, -4, 2], [4, -13, 4]]) {
      if ((Math.floor(t / 110) + ph) % 6 >= 4) continue;
      const x = dx * f, y = dy;
      px(x, y, '#fff6c0'); px(x - 1, y, '#ffd060'); px(x + 1, y, '#ffd060'); px(x, y - 1, '#ffd060'); px(x, y + 1, '#ffd060');
    }
  } else if (em.type === 'shock') {
    for (const [dx, dy, ex, ey] of [[-7, -6, -11, -9], [0, -9, 0, -14], [7, -6, 11, -9]]) line(dx, dy, dx + (ex - dx) * pop, dy + (ey - dy) * pop, '#ffffff');
  } else if (em.type === 'dots') {
    const by = -12 - pop * 3;
    rrect(-8, by - 7, 16, 9, '#f0ece0', 2);
    const n = Math.min(3, Math.floor(k * 4) + 1);
    for (let i = 0; i < n; i++) rect(-5 + i * 4, by - 3, 2, 2, '#16121a');
  } else if (em.type === 'question') {
    const by = -12 - pop * 3;
    ctx.font = '9px VT323, monospace'; ctx.textAlign = 'center';
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { ctx.fillStyle = '#000'; ctx.fillText('?', f * 7 + ox, by + oy); }
    ctx.fillStyle = '#ffd060'; ctx.fillText('?', f * 7, by);
    ctx.textAlign = 'left';
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawAlerts(t) {
  const now = performance.now();
  G.alerts = G.alerts.filter(al => now - al.start < 900);
  for (const al of G.alerts) {
    const a = G.actors[al.who];
    if (!a) continue;
    const k = (now - al.start) / 900;
    const s = (a.scale || 1) * (a.hat === 'cap' ? 0.86 : 1);
    const pop = k < 0.15 ? k / 0.15 * 1.3 : k < 0.25 ? 1.3 - (k - 0.15) * 3 : 1;
    const x = a.x + (a.ox || 0), y = a.y - 52 * s - 6;
    ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.font = `${Math.round(14 * pop)}px VT323, monospace`;
    ctx.textAlign = 'center';
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { ctx.fillStyle = '#000'; ctx.fillText('!', x + dx, y + dy); }
    ctx.fillStyle = '#ffffff';
    ctx.fillText('!', x, y);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

// Back from a story fight: keep Gonza's bullets, restore the scene and go on.
function storyAfterCombat() {
  const sv = G.storySave;
  if (!sv) { endCombat(); return; }
  const gonza = CB.allies.find(u => u.gun);
  if (gonza) SAVE.save({ ammo: gonza.ammo });
  CB.active = false;
  ui.combatUI.classList.add('hidden'); ui.combatUI.innerHTML = '';
  cv.style.cursor = 'default';
  G.mode = 'play'; G.s = sv.s; G.actors = sv.actors; G.storySave = null; G.fade = 0;
  Music.play(MUSIC_FOR[G.s.bg]);
  run();
}

// ---------- Abnormality documents ----------
const DOCS = {
  zayin: {
    code: 'O-05-08', risk: 'ZAYIN', col: '#2a7a3a', name: 'E.G.O EXTRACTION MACHINE', state: 'Contenida', draw: 'machine',
    text: 'Una máquina industrial de producción que transforma materiales en pequeños componentes de E.G.O. Parece inofensiva, aunque a veces la cinta transportadora entrega piezas que nadie recuerda haber fabricado.',
  },
  teth: {
    code: 'T-01-98', risk: 'TETH', col: '#2a5aa0', name: 'THE DISCONNECTED OPERATOR', state: '??????', draw: 'operator', worn: true,
    text: 'Una figura humanoide con una pantalla de ordenador por cabeza y extremidades hechas de cables. Ataca con latigazos y descargas, pero queda vulnerable cuando su sistema se reinicia.',
  },
};
// the worn file loses most of its words, always the same ones
const wornText = (s, keep) => s.split(' ').map((w, i) => (hash(i * 13 + 5) < keep ? w : '█'.repeat(Math.max(2, Math.min(7, w.length))))).join(' ');

function drawDoc(d, t) {
  const D = DOCS[d.id];
  if (!D) return;
  const k = Math.min(1, (performance.now() - d.start) / 260);
  ctx.globalAlpha = 0.65 * k; rect(-OX, 0, VW, H, '#000'); ctx.globalAlpha = 1;
  const px0 = 62, py0 = 12 + (1 - k) * 60, pw = 196, ph = 156;
  ctx.save();
  ctx.translate(160, py0 + ph / 2); ctx.rotate(D.worn ? 0.025 : -0.015); ctx.translate(-160, -(py0 + ph / 2));
  rect(px0 + 3, py0 + 3, pw, ph, '#00000088');
  rect(px0, py0, pw, ph, D.worn ? '#cfc4a2' : '#e8e0c8');
  rect(px0, py0, pw, 1, '#f6f0dc'); rect(px0, py0 + ph - 1, pw, 1, '#a89c78');
  // header
  rect(px0 + 6, py0 + 6, pw - 12, 14, '#2a2620');
  ctx.font = '7px VT323, monospace'; ctx.fillStyle = '#c8b890'; ctx.fillText('LOBOTOMY CORPORATION', px0 + 10, py0 + 12);
  ctx.fillStyle = '#e8dcc0'; ctx.fillText('REGISTRO DE ANORMALIDAD', px0 + 10, py0 + 18);
  ctx.textAlign = 'right'; ctx.fillStyle = '#c8b890'; ctx.fillText(D.worn ? 'Nº ?? - ??' : 'Nº 01-14', px0 + pw - 10, py0 + 15); ctx.textAlign = 'left';
  // portrait
  const fx = px0 + 8, fy = py0 + 26, fw = 62, fh = 66;
  rect(fx, fy, fw, fh, '#141416'); rect(fx, fy, fw, 1, '#3a3a40');
  ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
  if (D.draw === 'machine') egoMachine(fx + fw / 2, fy + fh - 4, { scale: 0.62 }, t);
  else operator(fx + fw / 2, fy + fh - 2, { scale: 0.66 }, t);
  if (D.worn) {
    // smeared, water-damaged photo
    for (let i = 0; i < 26; i++) { ctx.globalAlpha = 0.5; rect(fx + hash(i + 3) * fw, fy + hash(i + 9) * fh, 4 + hash(i + 1) * 14, 2 + hash(i + 2) * 5, i % 3 ? '#2a2620' : '#8a7c5a'); }
    ctx.globalAlpha = 0.35; rect(fx, fy, fw, fh, '#6a5a3a'); ctx.globalAlpha = 1;
  }
  ctx.restore();
  // data
  const rx = fx + fw + 8;
  const row = (label, val, y, col) => {
    ctx.font = '7px VT323, monospace'; ctx.fillStyle = '#6a5e44'; ctx.fillText(label, rx, y);
    ctx.font = '9px VT323, monospace'; ctx.fillStyle = col || '#2a2418'; ctx.fillText(val, rx, y + 9, pw - (rx - px0) - 8);
  };
  row('Código', D.code, py0 + 32);
  ctx.font = '7px VT323, monospace'; ctx.fillStyle = '#6a5e44'; ctx.fillText('Nivel de riesgo', rx, py0 + 52);
  rrect(rx, py0 + 54, 34, 10, D.col, 2);
  ctx.font = '8px VT323, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(D.risk, rx + 17, py0 + 62); ctx.textAlign = 'left';
  row('Nombre', D.worn ? wornText(D.name, 0.45) : D.name, py0 + 74);
  row('Estado', D.state, py0 + 94, D.worn ? '#7a3020' : '#2a5a2a');
  // description
  rect(px0 + 8, py0 + 108, pw - 16, 1, '#a89c78');
  ctx.font = '7px VT323, monospace'; ctx.fillStyle = '#6a5e44'; ctx.fillText('Descripción', px0 + 8, py0 + 116);
  const body = D.worn ? wornText(D.text, 0.42) : D.text;
  wrap(body, pw - 16, 8).slice(0, 4).forEach((ln, i) => {
    ctx.font = '8px VT323, monospace'; ctx.fillStyle = '#2a2418'; ctx.fillText(ln, px0 + 8, py0 + 125 + i * 8);
  });
  if (D.worn) {
    // stains and a torn corner
    for (const [sx, sy, r] of [[px0 + 150, py0 + 40, 18], [px0 + 40, py0 + 128, 14], [px0 + 120, py0 + 136, 10]]) {
      ctx.globalAlpha = 0.28; ellipse(sx, sy, r, r * 0.7, '#6a4a20'); ctx.globalAlpha = 0.15; ellipse(sx + 2, sy + 1, r * 0.6, r * 0.4, '#3a2410');
    }
    ctx.globalAlpha = 1;
    poly([[px0 + pw - 26, py0 + ph], [px0 + pw, py0 + ph - 22], [px0 + pw, py0 + ph]], '#000000');
  } else {
    // a stamp
    ctx.globalAlpha = 0.5; ring(px0 + pw - 30, py0 + 96, 12, '#2a7a3a', 1); ctx.globalAlpha = 1;
    ctx.font = '7px VT323, monospace'; ctx.fillStyle = '#2a7a3a88'; ctx.textAlign = 'center'; ctx.fillText('L.CORP', px0 + pw - 30, py0 + 98); ctx.textAlign = 'left';
  }
  ctx.restore();
  if (k >= 1 && Math.floor(t / 450) % 2) txt(IS_TOUCH ? 'Toca para continuar ▸' : 'Clic para continuar ▸', 314, 176, '#d8d0c0', 8, 'right');
}

// ---------- Pose blending ----------
// Limbs glide from the previous pose to the new one instead of snapping;
// fast moves (strikes) blend quickly, everything else eases in more softly.
// Combat figures stand in a breathing guard stance and slump when staggered.
const FAST_POSES = { strike: 45, slam: 60, follow: 70 };
function blendPose(a, now, t) {
  if (a.lifted || a.sitting) { a._pNow = null; return; }
  const want = a.pose || (a.combat ? (a.stag ? 'slump' : 'ready') : null);
  if (!want && !a._pNow) return;
  if (a._pName !== want) {
    a._pFrom = a._pNow || FIG_NEUTRAL;
    a._pName = want; a._pStart = now;
    // combat moves snap their keyframes in (poseMs), like Limbus sprite frames
    a._pMs = a.poseMs != null ? Math.max(1, a.poseMs) : FAST_POSES[want] || 120;
  }
  const k = Math.min(1, (now - a._pStart) / a._pMs);
  const e = 1 - Math.pow(1 - k, 3);
  const P = lerpPose(a._pFrom, FIG_POSES[want] || FIG_NEUTRAL, e);
  if (want === 'ready' || want === 'slump') {
    const br = Math.sin(t / 520 + a.x) * (want === 'slump' ? 1.2 : 0.8);
    P.front[1] += br; P.back[1] += br;
  }
  if (!want && k >= 1) { a._pNow = null; a._pName = null; return; }
  a._pNow = P;
}

// ---------- Combat camera ----------
// CB.cam = { z, x, y }: zoom z around world point (x, y), shown at screen (160, 100).
function camOn() {
  const c = CB.cam;
  if (!c || (c.z === 1 && c.x === 160 && c.y === 100)) return false;
  // keep the view inside the scene so nothing outside it is ever uncovered
  const z = Math.max(1, c.z);
  const x = Math.min(W + OX - (W + OX - 160) / z, Math.max(-OX + (160 + OX) / z, c.x));
  const y = Math.min(H - (H - 100) / z, Math.max(100 / z, c.y));
  ctx.save();
  ctx.translate(160, 100); ctx.scale(z, z); ctx.translate(-x, -y);
  return true;
}

// ---------- Render ----------
const hintEl = $('hint');
// Frame pacing: the loop runs at the display's own rate (60, 90, 120,
// 144 Hz...) unless a cap is set. FRAME_DT is the time step of this frame
// in 60 fps units, so per-frame motion keeps the same speed at any rate.
let _lastFrame = 0, FRAME_DT = 1;
function render(t) {
  if (CFG.fpsCap && _lastFrame && t - _lastFrame < 1000 / CFG.fpsCap - 1.5) { requestAnimationFrame(render); return; }
  FRAME_DT = _lastFrame ? Math.min(4, (t - _lastFrame) / (1000 / 60)) : 1;
  _lastFrame = t;
  const now = performance.now();
  const hintOn = G.mode !== 'hub' && G.mode !== 'combat' && !G.s.doc;
  if (hintOn !== G._hintOn) { G._hintOn = hintOn; hintEl.classList.toggle('hidden', !hintOn); }
  ctx.save();
  ctx.scale(SCALE, SCALE);
  ctx.translate(OX, 0);
  if (now < G.shakeUntil) ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 4));

  if (G.mode === 'hub') {
    drawHub(t);
  } else {
    const cam = G.mode === 'combat' && camOn();
    drawWide(() => (BG[G.s.bg] || BG.black)(G.s, t), G.s.bg);
    if (G.mode === 'combat' && CB.cine) cineBackdrop(t);
    // combat: back to front by depth; story: monsters behind, then Gonza, Lobelto in front
    const STORY_ORDER = ['corrupted', 'skel1', 'skel2', 'gonza', 'lobelto'];
    const order = G.mode === 'combat'
      ? Object.keys(G.actors).sort((a, b) => G.actors[a].y - G.actors[b].y)
      : [...STORY_ORDER, ...Object.keys(G.actors).filter(k => !STORY_ORDER.includes(k))];
    for (const id of order) {
      const a = G.actors[id];
      if (!a) continue;
      const talk = G.s.typing && G.s.speaker === id;
      const enemyDraw = { corrupted, machine: egoMachine, operator, cableskel: cableSkel }[a.kind];
      if (!enemyDraw) blendPose(a, now, t);
      const flash = (a.flashUntil || 0) > now;
      const base = () => (enemyDraw ? enemyDraw(a.x, a.y, a, t) : figure(a.x, a.y, { ...a, talk, flash, poseData: a._pNow }, t));
      // combat animation offsets: ox/oy move, tilt rotates and sq squashes around the feet
      const posed = () => {
        if (!a.ox && !a.oy && !a.tilt && !a.sq) return base();
        ctx.save();
        ctx.translate(a.x + (a.ox || 0), a.y + (a.oy || 0));
        if (a.tilt) ctx.rotate(a.tilt);
        if (a.sq) ctx.scale(1 + a.sq, 1 - a.sq);
        ctx.translate(-a.x, -a.y);
        base();
        ctx.restore();
      };
      if (CFG.shadows && !a.lifted && !a.dying) drawActorShadow(a, () => { ctx.save(); ctx.translate(a.ox || 0, 0); base(); ctx.restore(); });
      const fade = a.alpha == null ? 1 : a.alpha;
      for (const g of a.ghosts || []) {
        ctx.save(); ctx.globalAlpha = g.a * fade; ctx.translate(g.dx, 0); posed(); ctx.restore();
      }
      ctx.globalAlpha = fade;
      posed();
      if (flash && enemyDraw) {
        // brighten the enemy for a frame or two when it is hit
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.65; posed();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    }
    if (cam) ctx.restore();
    drawDarkness(G.s, t);
    drawEmotes(t);
    drawAlerts(t);
    const r = G.s.rift;
    if (r) { r.w += (r.target - r.w) * (1 - Math.pow(0.96, FRAME_DT)); rift(r.x, r.y, r.w, r.h + r.w * 0.6, t); }
    postFX(G.s, t);
    if (G.s.doc) drawDoc(G.s.doc, t);
    if (G.mode === 'combat') drawCombatHUD(t);
  }
  if (G.flash) {
    const k = 1 - (now - G.flash.start) / G.flash.ms;
    if (k <= 0) G.flash = null;
    else { ctx.globalAlpha = Math.min(1, k * 1.2) * (G.flash.a || 1); rect(-OX, 0, VW, H, G.flash.color); ctx.globalAlpha = 1; }
  }

  const animCam = CB.active && CB.anims.length > 0 && camOn();
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
  if (animCam) ctx.restore();

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
