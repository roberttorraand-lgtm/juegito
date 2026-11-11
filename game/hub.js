// =====================================================================
//  HUB — Menus, settings, canvas hub, map, navigation
// =====================================================================
let hubBtns = [];
let hubSel = 0;

// ---- Hub menu ----
function hideAllOverlays() {
  ui.levels.classList.add('hidden');
  ui.confirm.classList.add('hidden');
  ui.settings.classList.add('hidden');
  ui.combatUI.classList.add('hidden');
  ui.card.classList.add('hidden');
  hideBox();
}

function showHub() {
  G.mode = 'hub'; G.hubView = 'main'; G.s = {}; G.actors = {}; G.fade = 0;
  G.scene = null; G.steps = []; G.pendingScene = null;
  G.runId++; G.waiting = null; G.skip = false; G.fadeAnim = null; G.storySave = null;
  if (typeof toggleBacklog === 'function' && !$('backlog').classList.contains('hidden')) $('backlog').classList.add('hidden');
  const sk = document.querySelector('[data-box="skip"]'); if (sk) sk.classList.remove('on');
  if (G.typing) { clearTimeout(G.typing.timer); G.typing = null; }
  G.hubNavSel = 0; G.hubTab = 'ventana'; G.mapSel = 0; G.mapModeSel = 0; G.chapter = null; G.epSel = null; G.mapHover = null;
  hideAllOverlays();
  ui.hub.classList.add('hidden');
  Music.play(MUSIC_FOR.hub);
}

function showLevels() {
  G.hubView = 'levels';
  const ep1 = SCENES.filter(s => s.ep === 1);
  let html = '<div class="lv-head">— EPISODIO I —</div>';
  html += '<div class="lv-sub">La Distorsión Externa</div>';
  ep1.forEach((sc, i) => {
    const unlocked = isSceneUnlocked(sc);
    const done = isSceneDone(sc);
    const lock = unlocked ? '' : ' data-locked';
    const sel = i === 0 && unlocked ? ' sel' : '';
    const status = !unlocked ? '<div class="lv-status locked">Bloqueado</div>'
      : done ? '<div class="lv-status">✓ Completado</div>'
      : '<div class="lv-status">● Nuevo</div>';
    html += `<div class="lv-card${sel}" data-scene="${sc.id}"${lock}>
      <div class="lv-num">${sc.num}</div>
      <div class="lv-info"><div class="lv-name">${sc.title}</div>
      <div class="lv-desc">${sc.desc}</div>${status}</div></div>`;
  });
  html += '<button class="lv-back" data-hub="back">← Volver</button>';
  ui.levels.innerHTML = html;
  ui.levels.classList.remove('hidden');
  bindLevelCards();
  refreshHubBtns();
  SFX.play('select');
}

function bindLevelCards() {
  ui.levels.querySelectorAll('.lv-card, .lv-back').forEach(b => {
    b.addEventListener('mouseenter', () => {
      if (b.dataset.locked !== undefined || G.hubView !== 'levels') return;
      const idx = hubBtns.indexOf(b);
      if (idx >= 0) { hubSel = idx; hubBtns.forEach((x, j) => x.classList.toggle('sel', j === idx)); }
    });
    b.addEventListener('click', (e) => { e.stopPropagation(); if (b.dataset.locked === undefined) hubAct(b); });
  });
}

function hideLevels() {
  G.hubView = 'main';
  ui.levels.classList.add('hidden');
  refreshHubBtns();
  SFX.play('select');
}

function showConfirm(sc) {
  G.hubView = 'confirm'; G.pendingScene = sc;
  const done = isSceneDone(sc);
  const status = done ? '<div class="cf-status">✓ Ya completado — Rejugar</div>' : '<div class="cf-status">● Nuevo</div>';
  ui.confirm.innerHTML = `
    <div class="cf-title">Episodio ${['I', 'II', 'III'][sc.ep - 1] || sc.ep} · Escena ${sc.num}: ${sc.title}</div>
    <div class="cf-desc">${sc.sub}</div>
    ${status}
    <div class="cf-btns">
      <button class="cf-btn go sel" data-act="enter">Entrar</button>
      <button class="cf-btn" data-act="cancel">Volver</button>
    </div>`;
  ui.confirm.classList.remove('hidden');
  ui.levels.classList.add('hidden');
  bindConfirmBtns();
  refreshHubBtns();
  SFX.play('select');
}

function bindConfirmBtns() {
  ui.confirm.querySelectorAll('.cf-btn').forEach(b => {
    b.addEventListener('mouseenter', () => {
      if (G.hubView !== 'confirm') return;
      const idx = hubBtns.indexOf(b);
      if (idx >= 0) { hubSel = idx; hubBtns.forEach((x, j) => x.classList.toggle('sel', j === idx)); }
    });
    b.addEventListener('click', (e) => { e.stopPropagation(); hubAct(b); });
  });
}

function hideConfirm() {
  G.pendingScene = null;
  ui.confirm.classList.add('hidden');
  if (G.confirmFrom === 'map') { G.confirmFrom = null; G.hubView = 'main'; refreshHubBtns(); SFX.play('select'); }
  else showLevels();
}

function startScene(sc) {
  G.runId++; G.fadeAnim = null; G.log = [];
  if (G.typing) { clearTimeout(G.typing.timer); G.typing = null; }
  G.mode = 'play'; G.scene = sc; G.steps = sc.steps; G.idx = 0; G.waiting = null;
  G.s = { bg: 'black' }; G.actors = {}; G.fade = 1;
  ui.hub.classList.add('hidden');
  hideAllOverlays();
  SAVE.save({ current_scene: sc.id });
  run();
}

function refreshHubBtns() {
  if (G.hubView === 'levels') {
    hubBtns = [...ui.levels.querySelectorAll('.lv-card:not([data-locked]), .lv-back')];
  } else if (G.hubView === 'confirm') {
    hubBtns = [...ui.confirm.querySelectorAll('.cf-btn')];
  } else if (G.hubView === 'settings') {
    hubBtns = [...ui.settings.querySelectorAll('.st-tab, .st-back')];
  } else {
    hubBtns = [];
  }
  hubSel = 0;
  hubBtns.forEach((x, j) => x.classList.toggle('sel', j === 0));
}

// ---- Settings panel ----
function showSettings(tab = 'audio', quiet = false) {
  G.hubView = 'settings';
  ui.settings.dataset.tab = tab;
  const speedChip = (id, label) =>
    `<button class="st-chip${CFG.textSpeed === id ? ' on' : ''}" data-speed="${id}">${label}</button>`;
  const tabBtn = (id, label) => `<button class="st-tab${tab === id ? ' sel' : ''}" data-stab="${id}">${label}</button>`;
  const panel = (id) => `class="st-panel${tab === id ? '' : ' hidden'}" data-panel="${id}"`;
  const hint = (h) => (h ? `<div class="st-hint">${h}</div>` : '');
  const toggle = (key, label, h) => `
    <div class="st-group">
      <div class="st-label">${label}</div>
      <div class="st-toggle" data-cfg="${key}">
        <div class="st-toggle-box${CFG[key] ? ' on' : ''}"><div class="st-toggle-knob"></div></div>
        <div class="st-toggle-label">${CFG[key] ? 'Activado' : 'Desactivado'}</div>
      </div>${hint(h)}
    </div>`;
  const chips = (key, label, opts, h) => `
    <div class="st-group">
      <div class="st-label">${label}</div>
      <div class="st-chips">${opts.map(([v, l]) =>
        `<button class="st-chip${CFG[key] === v ? ' on' : ''}" data-cfg-chip="${key}" data-val="${v}">${l}</button>`).join('')}</div>${hint(h)}
    </div>`;
  ui.settings.innerHTML = `
    <div class="st-side">
      <div class="st-side-title">— AJUSTES —</div>
      ${tabBtn('audio', 'Audio')}
      ${tabBtn('juego', 'Juego')}
      ${tabBtn('video', 'Video')}
      ${tabBtn('datos', 'Datos')}
      <button class="st-back" data-hub="back">← Volver</button>
      <div class="st-version">v0.2 — Episodios I y II</div>
    </div>
    <div class="st-main">
      <div ${panel('audio')}>
        <div class="st-group">
          <div class="st-label">Volumen SFX</div>
          <div class="st-slider-row">
            <div class="st-slider-track" data-slider="sfxVol">
              <div class="st-slider-fill" style="width:${CFG.sfxVol}%"></div>
            </div>
            <div class="st-slider-val">${CFG.sfxVol}%</div>
          </div>
          <div class="st-hint">Arrastra la barra o haz clic para ajustar</div>
        </div>
        <div class="st-group">
          <div class="st-label">Volumen música</div>
          <div class="st-slider-row">
            <div class="st-slider-track" data-slider="musicVol">
              <div class="st-slider-fill" style="width:${CFG.musicVol}%"></div>
            </div>
            <div class="st-slider-val">${CFG.musicVol}%</div>
          </div>
        </div>
        <div class="st-group">
          <div class="st-label">Silenciar (M)</div>
          <div class="st-toggle" data-toggle="mute">
            <div class="st-toggle-box${SFX.muted ? ' on' : ''}"><div class="st-toggle-knob"></div></div>
            <div class="st-toggle-label">${SFX.muted ? 'Silenciado' : 'Activo'}</div>
          </div>
        </div>
      </div>
      <div ${panel('juego')}>
        <div class="st-group">
          <div class="st-label">Velocidad de texto</div>
          <div class="st-chips">
            ${speedChip('normal', 'Normal')}
            ${speedChip('rapido', 'Rápido')}
            ${speedChip('muyrapido', 'Muy rápido')}
          </div>
          <div class="st-hint">Cambia la velocidad del texto letra por letra</div>
        </div>
        ${chips('textSize', 'Tamaño del texto', [['normal', 'Normal'], ['grande', 'Grande']], 'Letra más grande en los diálogos')}
        ${chips('difficulty', 'Dificultad', [['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']], 'Fácil: enemigos con menos vida y menos daño recibido. Se aplica al empezar un combate.')}
        ${chips('combatSpeed', 'Velocidad de combate', [[1, 'x1'], [1.5, 'x1.5'], [2, 'x2']], 'Acelera las animaciones del combate')}
        ${toggle('clashOdds', 'Probabilidad de choque', 'Muestra en cada flecha la probabilidad de ganar el choque')}
        ${toggle('shakeFx', 'Temblor de pantalla', 'Sacudidas de la cámara en golpes y escenas')}
      </div>
      <div ${panel('video')}>
        ${chips('quality', 'Calidad gráfica', [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra'], ['custom', 'Personalizada']],
          'Ultra se ve mejor pero exige más al PC o al móvil')}
        ${toggle('fill', 'Ocupar toda la pantalla', 'Sin bordes negros: el escenario se extiende hasta los lados de la pantalla')}
        ${toggle('integer', 'Píxeles nítidos (escalado entero)', 'Cada píxel del juego ocupa un bloque exacto de tu pantalla: todos iguales y bien marcados. Puede dejar bordes negros.')}
        ${toggle('pixelGrid', 'Rejilla de píxeles', 'Marca el borde de cada píxel como una pantalla de consola. Necesita píxeles nítidos.')}
        ${chips('bloom', 'Resplandor de luces (bloom)', [[0, 'No'], [1, 'Suave'], [2, 'Intenso']], 'Neones, farolas y pantallas brillan con halo')}
        ${toggle('shadows', 'Sombras dinámicas', 'Los personajes proyectan su sombra en el suelo')}
        ${chips('particles', 'Partículas', [[1, 'Normal'], [2, 'x2'], [3, 'x3']], 'Más lluvia, salpicaduras y brasas')}
        ${toggle('grade', 'Corrección de color', 'Más contraste y saturación, estilo cine')}
        ${toggle('grain', 'Grano de película')}
        ${toggle('scanlines', 'Líneas de escaneo (CRT)', 'Efecto retro de monitor antiguo')}
        ${toggle('impactFrames', 'Fotogramas de impacto', 'En los golpes más fuertes la imagen se invierte un instante, como en Limbus. Desactívalo si te molestan los destellos.')}
        ${chips('fpsCap', 'Límite de FPS', [[0, 'Máximo'], [30, '30'], [60, '60'], [120, '120']], 'Máximo: tantos como dé tu pantalla (90, 120, 144 Hz...). Bájalo para ahorrar batería.')}
        ${toggle('fps', 'Mostrar FPS', 'Contador de imágenes por segundo en la esquina')}
        <div class="st-group">
          <div class="st-label">Pantalla completa</div>
          <button class="st-chip" data-act="fullscreen">Activar pantalla completa</button>
          <div class="st-hint">También puedes usar F11</div>
        </div>
      </div>
      <div ${panel('datos')}>
        <div class="st-group">
          <div class="st-label">Borrar datos guardados</div>
          <div class="st-hint">Elimina todo el progreso y ajustes. Esta acción no se puede deshacer.</div>
          <button class="st-danger-btn" data-act="cleardata">Borrar todo</button>
        </div>
      </div>
    </div>`;
  ui.settings.classList.remove('hidden');
  ui.settings.classList.toggle('see-through', tab === 'video');
  bindSettingsEvents();
  refreshHubBtns();
  const cur = hubBtns.findIndex(b => b.dataset.stab === tab);
  if (cur >= 0) { hubSel = cur; hubBtns.forEach((x, j) => x.classList.toggle('sel', j === cur)); }
  if (!quiet) SFX.play('select');
}

// Re-render the video tab in place, keeping the scroll position
function refreshVideoSettings() {
  const main = ui.settings.querySelector('.st-main');
  const scroll = main ? main.scrollTop : 0;
  showSettings(ui.settings.dataset.tab || 'video', true);
  ui.settings.querySelector('.st-main').scrollTop = scroll;
  SFX.play('select');
}

function bindSettingsEvents() {
  const tabs = ui.settings.querySelectorAll('.st-tab');
  const panels = ui.settings.querySelectorAll('.st-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      tabs.forEach(t => t.classList.remove('sel'));
      tab.classList.add('sel');
      ui.settings.dataset.tab = tab.dataset.stab;
      panels.forEach(p => p.classList.toggle('hidden', p.dataset.panel !== tab.dataset.stab));
      ui.settings.classList.toggle('see-through', tab.dataset.stab === 'video');
      SFX.play('select');
    });
  });

  ui.settings.querySelectorAll('[data-slider]').forEach(slider => {
    const key = slider.dataset.slider;
    const setVol = (e) => {
      const r = slider.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100)));
      CFG.persist(key, pct);
      slider.querySelector('.st-slider-fill').style.width = pct + '%';
      slider.closest('.st-group').querySelector('.st-slider-val').textContent = pct + '%';
      if (key === 'musicVol') Music.setVolume(); else SFX.play('select');
    };
    let dragging = false;
    slider.addEventListener('pointerdown', (e) => { e.stopPropagation(); dragging = true; slider.setPointerCapture(e.pointerId); setVol(e); });
    slider.addEventListener('pointermove', (e) => { if (dragging) setVol(e); });
    slider.addEventListener('pointerup', () => { dragging = false; });
  });

  const muteToggle = ui.settings.querySelector('[data-toggle="mute"]');
  if (muteToggle) muteToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    SFX.muted = !SFX.muted;
    const box = muteToggle.querySelector('.st-toggle-box');
    box.classList.toggle('on', SFX.muted);
    muteToggle.querySelector('.st-toggle-label').textContent = SFX.muted ? 'Silenciado' : 'Activo';
  });

  ui.settings.querySelectorAll('[data-speed]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      CFG.persist('textSpeed', chip.dataset.speed);
      ui.settings.querySelectorAll('[data-speed]').forEach(c => c.classList.toggle('on', c.dataset.speed === chip.dataset.speed));
      SFX.play('select');
    });
  });

  const PRESET_KEYS = Object.keys(QUALITY.alta);
  const changed = (key) => {
    if (PRESET_KEYS.includes(key)) CFG.persist('quality', 'custom');
    if (key === 'integer' || key === 'fill') resizeCanvas();
    if (key === 'textSize') applyTextSize();
    refreshVideoSettings();
  };
  ui.settings.querySelectorAll('[data-cfg]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = el.dataset.cfg;
      CFG.persist(key, !CFG[key]);
      changed(key);
    });
  });
  ui.settings.querySelectorAll('[data-cfg-chip]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = el.dataset.cfgChip, raw = el.dataset.val;
      if (key === 'quality') {
        if (raw === 'custom') return;
        CFG.applyQuality(raw);
        resizeCanvas();
        refreshVideoSettings();
        return;
      }
      CFG.persist(key, typeof CFG[key] === 'number' ? Number(raw) : raw);
      changed(key);
    });
  });

  const fsBtn = ui.settings.querySelector('[data-act="fullscreen"]');
  if (fsBtn) fsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  });

  const clearBtn = ui.settings.querySelector('[data-act="cleardata"]');
  if (clearBtn) {
    let armed = false;
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!armed) {
        armed = true;
        clearBtn.textContent = '¿Estás seguro? Pulsa de nuevo';
        clearBtn.classList.add('confirm');
        setTimeout(() => { armed = false; clearBtn.textContent = 'Borrar todo'; clearBtn.classList.remove('confirm'); }, 3000);
      } else {
        try { localStorage.removeItem(SAVE._key); } catch(e) {}
        SAVE._data = {}; SAVE.load();
        CFG.reset();
        resizeCanvas();
        SFX.muted = false;
        clearBtn.textContent = '✓ Datos borrados';
        clearBtn.classList.remove('confirm');
        setTimeout(() => hideSettings(), 800);
      }
    });
  }

  const back = ui.settings.querySelector('.st-back');
  if (back) back.addEventListener('click', (e) => { e.stopPropagation(); hideSettings(); });
}

function hideSettings() {
  G.hubView = 'main';
  ui.settings.classList.add('hidden');
  refreshHubBtns();
  SFX.play('select');
}

function hubAct(btn) {
  if (!btn) return;
  SFX.init();
  const hub = btn.dataset.hub;
  const sceneId = btn.dataset.scene;
  const act = btn.dataset.act;
  if (hub === 'historia') showLevels();
  else if (hub === 'ajustes') showSettings();
  else if (hub === 'combate') startCombatTest();
  else if (hub === 'back') {
    if (G.hubView === 'levels') hideLevels();
    else if (G.hubView === 'confirm') hideConfirm();
    else if (G.hubView === 'settings') hideSettings();
  }
  else if (sceneId) {
    const sc = SCENES.find(s => s.id === sceneId);
    if (sc && isSceneUnlocked(sc)) showConfirm(sc);
  }
  else if (act === 'enter' && G.pendingScene) { SFX.play('select'); startScene(G.pendingScene); }
  else if (act === 'cancel') hideConfirm();
}

// Hub side buttons
document.querySelectorAll('.hub-btn').forEach(b => {
  b.addEventListener('mouseenter', () => {
    if (b.disabled || G.hubView !== 'main') return;
    const idx = hubBtns.indexOf(b);
    if (idx >= 0) { hubSel = idx; hubBtns.forEach((x, j) => x.classList.toggle('sel', j === idx)); }
  });
  b.addEventListener('click', (e) => { e.stopPropagation(); if (!b.disabled) hubAct(b); });
});

// ---------- Hub: Limbus-style metallic frame ----------
const HUB_NAV = [
  { id: 'ventana', label: 'Ventana', icon: '◫', enabled: true },
  { id: 'pecadores', label: 'Mejoras', icon: '▲', enabled: true },
  { id: 'mapa', label: 'Mapa', icon: '◈', enabled: true },
  { id: 'mercado', label: 'Gacha', icon: '✦', enabled: true },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙', enabled: true },
];
const NAV_Y = 160, NAV_H = 20;

function metalRect(x, y, w, h) {
  rect(x, y, w, h, '#2a1810');
  rect(x + 1, y + 1, w - 2, h - 2, '#4a3018');
  rect(x + 1, y + 1, w - 2, 1, '#8a6030');
  rect(x + 1, y + 1, 1, h - 2, '#7a5828');
  rect(x + w - 2, y + 1, 1, h - 2, '#3a2010');
  rect(x + 1, y + h - 2, w - 2, 1, '#3a2010');
  rect(x + 2, y + 2, w - 4, h - 4, '#1a1018');
}

function metalFrame(x, y, w, h) {
  rect(x, y, w, 2, '#8a6030');
  rect(x, y + h - 2, w, 2, '#4a3018');
  rect(x, y, 2, h, '#7a5828');
  rect(x + w - 2, y, 2, h, '#3a2010');
  rect(x + 2, y + 2, w - 4, 1, '#c09050');
  rect(x + 2, y + 2, 1, h - 4, '#c09050');
  disc(x + 4, y + 4, 2, '#8a6030'); px(x + 3, y + 3, '#c09050');
  disc(x + w - 5, y + 4, 2, '#8a6030'); px(x + w - 4, y + 3, '#c09050');
  disc(x + 4, y + h - 5, 2, '#8a6030'); px(x + 3, y + h - 4, '#c09050');
  disc(x + w - 5, y + h - 5, 2, '#8a6030'); px(x + w - 4, y + h - 4, '#c09050');
}

function drawNavBar(t) {
  rect(-OX, NAV_Y, VW, NAV_H, '#1a1018');
  rect(-OX, NAV_Y, VW, 1, '#4a3018');
  rect(-OX, NAV_Y + 1, VW, 1, '#8a6030');

  HUB_NAV.forEach((nav, i) => {
    const { x: bx, w: btnW } = getNavBtnBounds()[i];
    const sel = G.hubNavSel === i;
    const active = G.hubTab === nav.id;

    if (!nav.enabled) {
      rect(bx, NAV_Y + 4, btnW, 14, '#0e0c14');
      ctx.font = '8px VT323, monospace';
      ctx.fillStyle = '#2a2620';
      ctx.textAlign = 'center';
      ctx.fillText(nav.label, bx + btnW / 2, NAV_Y + 13);
      ctx.textAlign = 'left';
    } else {
      rect(bx, NAV_Y + 4, btnW, 14, sel ? '#3a1820' : '#18141e');
      rect(bx, NAV_Y + 4, btnW, 1, sel ? '#c0283a' : '#4a3018');
      if (active) rect(bx, NAV_Y + 17, btnW, 1, '#c0283a');
      if (sel) {
        const pulse = 0.7 + 0.3 * Math.sin(t / 200);
        ctx.globalAlpha = pulse;
        rect(bx + 1, NAV_Y + 5, btnW - 2, 12, 'rgba(192,40,58,0.15)');
        ctx.globalAlpha = 1;
      }
      ctx.font = '10px VT323, monospace';
      ctx.fillStyle = sel ? '#fff' : (active ? '#c09050' : '#8a8070');
      ctx.fillText(nav.icon, bx + 7, NAV_Y + 13);
      ctx.font = '8px VT323, monospace';
      ctx.fillText(nav.label, bx + 17, NAV_Y + 13);
    }
  });
}

function getNavBtnBounds() {
  const btnW = 52, gap = 6;
  const totalW = HUB_NAV.length * btnW + (HUB_NAV.length - 1) * gap;
  const startX = Math.round((W - totalW) / 2);
  return HUB_NAV.map((nav, i) => ({
    x: startX + i * (btnW + gap), y: NAV_Y + 4, w: btnW, h: 14, nav, idx: i
  }));
}

function drawHub(t) {
  rect(-OX, 0, VW, H, '#050407');

  if (G.hubTab === 'mapa') drawMap(t);
  else if (G.hubTab === 'mercado') drawMarket(t);
  else if (G.hubTab === 'pecadores') drawPecadores(t);
  else drawVentana(t);

  if (!G.pull) drawNavBar(t);
  drawHubNotice(t);
}

const CONTINUE_BTN = { x: 80, y: 99, w: 56, h: 11 };
function continueStory() {
  const sc = SCENES.find(s => !isSceneDone(s) && isSceneUnlocked(s));
  if (!sc) return false;
  SFX.play('select');
  G.confirmFrom = 'map';
  showConfirm(sc);
  return true;
}

function drawVentana(t) {
  drawWide(() => drawHubBackdrop(t), 'hub');

  metalFrame(4, 4, W - 8, NAV_Y - 8);

  const cx = 70, cy = 14, cw = 180, ch = 100;
  rect(cx, cy, cw, ch, '#0c0a14');
  rect(cx, cy, cw, 1, '#4a3018');
  rect(cx, cy + ch - 1, cw, 1, '#2a1810');

  ctx.font = '8px VT323, monospace';
  ctx.fillStyle = '#8a6030'; ctx.fillText('PROJECT MOON FAN GAME', cx + 28, cy + 14);
  ctx.font = '16px VT323, monospace';
  ctx.fillStyle = '#e8e4dc'; ctx.fillText('LA DISTORSIÓN', cx + 30, cy + 30);
  ctx.fillText('EXTERNA', cx + 58, cy + 42);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#c0283a'; ctx.fillText('LA DISTORSIÓN', cx + 31, cy + 30);
  ctx.fillStyle = '#1d3a6a'; ctx.fillText('LA DISTORSIÓN', cx + 29, cy + 30);
  ctx.fillStyle = '#c0283a'; ctx.fillText('EXTERNA', cx + 59, cy + 42);
  ctx.fillStyle = '#1d3a6a'; ctx.fillText('EXTERNA', cx + 57, cy + 42);
  ctx.globalAlpha = 1;

  rect(cx + 30, cy + 46, 120, 1, '#4a3018');
  rect(cx + 30, cy + 47, 120, 1, '#2a1810');

  const lastScene = SCENES.filter(s => isSceneDone(s)).pop();
  const nextScene = SCENES.find(s => !isSceneDone(s) && isSceneUnlocked(s));
  ctx.font = '8px VT323, monospace';
  ctx.fillStyle = '#8a8070'; ctx.fillText('PROGRESO ACTUAL', cx + 10, cy + 60);
  ctx.font = '10px VT323, monospace';
  // the episode shown is the one the player is in: the next scene's, else the last one played
  const curEp = EPISODES.find(e => e.ep === (nextScene || lastScene || SCENES[0]).ep) || EPISODES[0];
  if (nextScene) {
    ctx.fillStyle = '#c09050'; ctx.fillText('Próximo:', cx + 10, cy + 70);
    ctx.fillStyle = '#e8e4dc'; ctx.fillText(`Ep.${curEp.roman} · Esc.${nextScene.num}: ${nextScene.title}`, cx + 48, cy + 70, cw - 106);
  } else if (lastScene) {
    ctx.fillStyle = '#3fbf6a';
    ctx.fillText(curEp.wip ? '✓ Al día · continuará...' : `✓ Episodio ${curEp.roman} completado`, cx + 10, cy + 70);
  }
  ctx.fillStyle = '#5d5850';
  const doneCount = SCENES.filter(s => isSceneDone(s)).length;
  ctx.fillText(`${doneCount}/${SCENES.length} escenas en total`, cx + 10, cy + 82);
  const epScenes = episodeScenes(curEp), epDone = epScenes.filter(isSceneDone).length;
  rect(cx, cy + ch + 4, cw, 12, '#0c0a14'); rect(cx, cy + ch + 4, cw, 1, '#2a1810');
  drawWallet(cx + 6, cy + ch + 7);
  if (nextScene) {
    // quick way back into the story without going through the map
    const hv = G.ventHover;
    rect(CONTINUE_BTN.x, CONTINUE_BTN.y, CONTINUE_BTN.w, CONTINUE_BTN.h, hv ? '#c0283a' : '#5a1a24');
    rect(CONTINUE_BTN.x, CONTINUE_BTN.y, CONTINUE_BTN.w, 1, '#ff6a78');
    ctx.font = '8px VT323, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText('▶ CONTINUAR', CONTINUE_BTN.x + CONTINUE_BTN.w / 2, CONTINUE_BTN.y + 8);
    ctx.textAlign = 'left';
  }

  rect(cx + cw - 50, cy + 50, 46, 48, '#16141e');
  rect(cx + cw - 50, cy + 50, 46, 2, '#2a2638');
  for (let x2 = cx + cw - 44; x2 < cx + cw - 8; x2 += 12) for (let y2 = cy + 56; y2 < cy + 84; y2 += 10) {
    rect(x2, y2, 6, 5, '#0c0a16');
    if (hash(x2 + y2 * 7) > 0.85) px(x2 + 2, y2 + 2, '#c08a3a');
  }

  const rx = 260, ry = 14, rw = 52, rh = 46;
  metalRect(rx, ry, rw, rh);
  ctx.font = '7px VT323, monospace';
  ctx.fillStyle = '#8a6030'; ctx.fillText(`EPISODIO ${curEp.roman}`, rx + 6, ry + 12);
  ctx.font = '8px VT323, monospace';
  wrap(curEp.title, rw - 8, 8).slice(0, 2).forEach((ln, i) => {
    ctx.fillStyle = i ? '#c09050' : '#e8e4dc';
    ctx.textAlign = 'center'; ctx.fillText(ln, rx + rw / 2, ry + 22 + i * 8); ctx.textAlign = 'left';
  });
  rect(rx + 4, ry + 34, rw - 8, 3, '#2a1810');
  rect(rx + 4, ry + 34, Math.round((rw - 8) * epDone / Math.max(1, epScenes.length)), 3, '#c0283a');
  ctx.font = '7px VT323, monospace';
  ctx.fillStyle = '#5d5850'; ctx.fillText(`${epDone}/${epScenes.length}${curEp.wip ? ' · en desarrollo' : ''}`, rx + 4, ry + 43, rw - 8);

  metalRect(rx, ry + rh + 6, rw, 82);
  const previewY = ry + rh + 10;
  figure(rx + 13, previewY + 56, { hat: 'headset', face: 1, scale: 1.3 }, t);
  figure(rx + 39, previewY + 56, { hat: 'cap', face: -1, scale: 1.3 }, t);
  ctx.font = '7px VT323, monospace';
  ctx.fillStyle = '#5d5850'; ctx.fillText('LOBELTO', rx + 4, previewY + 68);
  ctx.fillText('GONZA', rx + 28, previewY + 68);

  rect(8, 16, 54, 136, '#0e0c14');
  rect(8, 16, 54, 1, '#4a3018');
  for (let y = 20; y < 50; y += 4) {
    rect(12, y, 46, 2, '#18141e');
    rect(12, y, 46, 1, '#2a2430');
  }
  const gx = 35, gy = 70;
  const gAngle = t / 1000;
  for (let i = 0; i < 8; i++) {
    const a = gAngle + (i / 8) * Math.PI * 2;
    const ex = gx + Math.cos(a) * 14, ey = gy + Math.sin(a) * 14;
    line(gx, gy, Math.round(ex), Math.round(ey), '#3a2820', 2);
  }
  disc(gx, gy, 8, '#2a1810');
  disc(gx, gy, 6, '#4a3018');
  disc(gx, gy, 3, '#1a1018');
  const light1 = Math.sin(t / 400) > 0 ? '#c0283a' : '#3a1018';
  const light2 = Math.sin(t / 600 + 1) > 0 ? '#3fbf6a' : '#183a18';
  disc(16, 100, 3, light1);
  disc(16, 110, 3, light2);
  ctx.font = '7px VT323, monospace';
  ctx.fillStyle = '#4a3018'; ctx.fillText('DIST.EXT', 12, 125);
  ctx.fillText('v0.2', 22, 133);
  ctx.fillText('EP.I-II', 18, 141);

  for (let i = 0; i < 8; i++) {
    const k = Math.floor(t / 300) * 8 + i;
    if (hash(k) > 0.5) {
      const px2 = 70 + hash(k + 1) * 180, py = 20 + hash(k + 2) * 90;
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t / 300 + i); disc(px2, py, 1, '#d0b0ff'); ctx.globalAlpha = 1;
    }
  }
}

// ---------- Map / Drive view ----------
// Two levels: the District D map shows the chapters; opening a chapter shows
// a map of its episodes. Hovering (or tapping) an episode shows a summary.
const CITY_DISTRICTS = [
  { id: 'nido', name: 'Nido', x: 160, y: 68, r: 12, col: '#c09050' },
  { id: 'd1', name: 'D.1', x: 124, y: 32, r: 5, col: '#6a5040' },
  { id: 'd2', name: 'D.2', x: 186, y: 28, r: 5, col: '#6a5040' },
  { id: 'd3', name: 'D.3', x: 204, y: 62, r: 5, col: '#6a5040' },
  { id: 'd4', name: 'D.4', x: 198, y: 100, r: 5, col: '#6a5040' },
  { id: 'd5', name: 'D.5', x: 168, y: 112, r: 5, col: '#6a5040' },
  { id: 'd6', name: 'D.6', x: 136, y: 104, r: 5, col: '#6a5040' },
  { id: 'd7', name: 'D.7', x: 114, y: 78, r: 5, col: '#6a5040' },
  { id: 'd8', name: 'D.8', x: 130, y: 52, r: 4, col: '#5a4030' },
  { id: 'd12', name: 'D.12', x: 216, y: 38, r: 4, col: '#5a4030' },
  { id: 'd20', name: 'D.20', x: 96, y: 52, r: 4, col: '#5a4030' },
  { id: 'd23', name: 'D.23', x: 100, y: 104, r: 4, col: '#5a4030' },
  { id: 'ext', name: 'Exteriores', x: 104, y: 132, r: 6, col: '#6a2a30' },
];
const CITY_CONNECTIONS = [
  ['nido','d1'],['nido','d2'],['nido','d3'],['nido','d4'],['nido','d5'],['nido','d6'],['nido','d7'],
  ['d1','d8'],['d1','d2'],['d2','d12'],['d3','d12'],['d3','d4'],['d4','d5'],['d5','d6'],['d6','d7'],
  ['d7','d8'],['d7','d20'],['d6','d23'],['d23','ext'],['d20','ext'],
];

// Chapters live at a district node; episodes sit on the chapter's own map.
const CHAPTERS = [
  { num: 1, roman: 'I', place: 'Exteriores', node: 'ext', name: 'Exteriores' },
];
const EPISODES = [
  { ep: 1, chapter: 1, roman: 'I', title: 'La Distorsión Externa', desc: 'Una noche en Discord termina al otro lado de una brecha, frente a una vieja sucursal.', x: 104, y: 112 },
  { ep: 2, chapter: 1, roman: 'II', wip: true, title: 'Entrada y documentos', desc: 'Dentro de la vieja sucursal de Lobotomy Corp., Lobelto y Gonza buscan algo con lo que sobrevivir.', x: 156, y: 66 },
  { ep: 3, chapter: 1, roman: 'III', title: '???', desc: 'Próximamente.', x: 206, y: 104 },
];
const MAP_PANEL = { x: 78, y: 10, w: 152, h: 140 };

function episodeScenes(e) { return SCENES.filter(s => s.ep === e.ep); }
function episodeEnemies(e) {
  const ids = new Set();
  for (const sc of episodeScenes(e)) for (const st of sc.steps) if (st.combat) ids.add(st.combat);
  return [...ids].map(id => (COMBAT_SETS[id] && COMBAT_SETS[id].name) || (COMBAT_UNITS[id] ? COMBAT_UNITS[id].name : id));
}
function episodeOpen(e) { const sc = episodeScenes(e); return sc.length > 0 && isSceneUnlocked(sc[0]); }
// The scene an episode starts from: the first unlocked one not done yet, else the first.
function episodeNextScene(e) {
  const sc = episodeScenes(e);
  return sc.find(s => isSceneUnlocked(s) && !isSceneDone(s)) || sc[0];
}

const MAP_MODES = [
  { id: 'historia', label: 'Historia', icon: '▶', enabled: true },
  { id: 'raid', label: 'Mini raid', icon: '⚔', enabled: true },
];

function drawMap(t) {
  drawWide(() => drawHubBackdrop(t), 'hub');
  ctx.globalAlpha = 0.85;
  rect(-OX, 0, VW, NAV_Y, '#08060e');
  ctx.globalAlpha = 1;

  metalFrame(4, 4, W - 8, NAV_Y - 8);

  const lx = 8, ly = 10, lw = 64, lh = 140;
  rect(lx, ly, lw, lh, '#0e0c14');
  rect(lx, ly, lw, 1, '#4a3018');

  MAP_MODES.forEach((mode, i) => {
    const my = ly + 6 + i * 30;
    const sel = G.mapModeSel === i;
    metalRect(lx + 4, my, lw - 8, 24);
    if (sel) {
      rect(lx + 6, my + 2, lw - 12, 20, '#3a1820');
      rect(lx + 4, my, 2, 24, '#c0283a');
      const pulse = 0.6 + 0.4 * Math.sin(t / 200);
      ctx.globalAlpha = pulse;
      rect(lx + 6, my + 2, lw - 12, 20, 'rgba(192,40,58,0.12)');
      ctx.globalAlpha = 1;
    }
    ctx.font = '11px VT323, monospace';
    ctx.fillStyle = sel ? '#fff' : '#8a8070';
    ctx.fillText(mode.icon, lx + 10, my + 11);
    ctx.font = '8px VT323, monospace';
    ctx.fillText(mode.label, lx + 10, my + 19, lw - 16);
  });

  ctx.font = '7px VT323, monospace';
  ctx.fillStyle = '#4a3018'; ctx.fillText('— MODOS —', lx + 8, ly + lh - 6);

  const { x: mx, y: my, w: mw, h: mh } = MAP_PANEL;
  rect(mx, my, mw, mh, '#0c0a14');
  rect(mx, my, mw, 1, '#4a3018');
  rect(mx, my, mw, 10, '#18141e');

  if (MAP_MODES[G.mapModeSel] && MAP_MODES[G.mapModeSel].id === 'raid') { drawRaidPanel(t); return; }

  ctx.save();
  ctx.beginPath(); ctx.rect(mx, my + 10, mw, mh - 10); ctx.clip();
  if (G.chapter) drawChapterMap(t); else drawDistrictMap(t);
  ctx.restore();

  ctx.font = '8px VT323, monospace';
  ctx.fillStyle = '#c09050'; ctx.textAlign = 'center';
  const ch = G.chapter && CHAPTERS.find(c => c.num === G.chapter);
  ctx.fillText(ch ? `CAPÍTULO ${ch.roman} · ${ch.place.toUpperCase()}` : 'DISTRITO D', mx + mw / 2, my + 7);
  ctx.textAlign = 'left';
  if (ch) {
    const hv = G.mapHover === 'back';
    rect(mx + 2, my + 1, 22, 8, hv ? '#3a1820' : '#0e0c14');
    ctx.font = '7px VT323, monospace';
    ctx.fillStyle = hv ? '#fff' : '#8a8070'; ctx.fillText('‹ VOLVER', mx + 3, my + 7, 20);
  }

  if (G.chapter) drawEpisodePanel(t); else drawChapterPanel(t);
}

function drawDistrictMap(t) {
  CITY_CONNECTIONS.forEach(([a, b]) => {
    const da = CITY_DISTRICTS.find(d => d.id === a), db = CITY_DISTRICTS.find(d => d.id === b);
    ctx.globalAlpha = 0.3;
    line(da.x, da.y, db.x, db.y, '#4a3828', 1);
    ctx.globalAlpha = 1;
  });
  CITY_DISTRICTS.forEach(d => {
    const chap = CHAPTERS.find(c => c.node === d.id);
    disc(d.x, d.y, d.r, d.col);
    disc(d.x, d.y, d.r - 1, chap ? '#2a1018' : '#1a1018');
    ctx.font = d.id === 'nido' ? '8px VT323, monospace' : '5px VT323, monospace';
    ctx.fillStyle = d.id === 'nido' ? '#c09050' : '#6a6050';
    ctx.textAlign = 'center';
    ctx.fillText(d.name, d.x, d.y + d.r + 6);
    ctx.textAlign = 'left';
  });
  // chapter markers: a pulsing ring on the district, fully inside the map
  for (const c of CHAPTERS) {
    const d = CITY_DISTRICTS.find(n => n.id === c.node);
    const hv = G.mapHover === 'chap' + c.num;
    const pulse = 0.5 + 0.5 * Math.sin(t / 300);
    ctx.globalAlpha = 0.25 + pulse * 0.35;
    disc(d.x, d.y, d.r + 3 + pulse * 2, '#c0283a');
    ctx.globalAlpha = 1;
    disc(d.x, d.y, 3, hv ? '#ffffff' : '#ff4a5a');
    const label = `CAP. ${c.roman}`;
    ctx.font = '7px VT323, monospace';
    const w = Math.ceil(ctx.measureText(label).width) + 4;
    rect(d.x + 9, d.y - 6, w, 8, hv ? '#c0283a' : '#3a1018');
    ctx.fillStyle = '#fff'; ctx.fillText(label, d.x + 11, d.y);
  }
}

function drawChapterPanel(t) {
  const rx = 236, ry = 10, rw = 78, rh = 140;
  rect(rx, ry, rw, rh, '#0e0c14');
  rect(rx, ry, rw, 1, '#4a3018');
  rect(rx, ry, rw, 14, '#18141e');
  ctx.font = '10px VT323, monospace';
  ctx.fillStyle = '#c09050'; ctx.fillText('CAPÍTULOS', rx + 14, ry + 10);
  CHAPTERS.forEach((c, i) => {
    const sy = ry + 18 + i * 34, hv = G.mapHover === 'chap' + c.num;
    const eps = EPISODES.filter(e => e.chapter === c.num);
    rect(rx + 3, sy, rw - 6, 30, hv ? '#2a1420' : '#18141e');
    rect(rx + 3, sy, 2, 30, '#c0283a');
    ctx.font = '7px VT323, monospace';
    ctx.fillStyle = '#8a6030'; ctx.fillText(`CAPÍTULO ${c.roman}`, rx + 8, sy + 7);
    ctx.font = '8px VT323, monospace';
    ctx.fillStyle = '#e8e4dc'; ctx.fillText(c.name, rx + 8, sy + 16, rw - 14);
    ctx.font = '6px VT323, monospace';
    ctx.fillStyle = '#8a8070'; ctx.fillText(`Distrito D · ${eps.length} episodios`, rx + 8, sy + 25, rw - 14);
  });
  ctx.font = '6px VT323, monospace';
  ctx.fillStyle = '#5d5850';
  ctx.fillText(IS_TOUCH ? 'Toca un capítulo' : 'Elige un capítulo', rx + 8, ry + rh - 6);
}

function drawChapterMap(t) {
  const { x: mx, y: my, w: mw, h: mh } = MAP_PANEL;
  // street blocks of the outskirts
  for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) {
    const bx = mx + 6 + i * 17 + (j % 2) * 5, by = my + 16 + j * 22;
    if (hash(i * 7 + j * 13) < 0.35) continue;
    rect(bx, by, 11 + Math.round(hash(i + j * 9) * 3), 14, '#120f1a');
    rect(bx, by, 11, 1, '#1c1828');
  }
  // the episode path
  const eps = EPISODES.filter(e => e.chapter === G.chapter);
  for (let i = 0; i + 1 < eps.length; i++) {
    const a = eps[i], b = eps[i + 1];
    const n = Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 4);
    for (let k = 1; k < n; k++) {
      if (k % 2) continue;
      const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n;
      rect(x, y, 2, 1, episodeOpen(b) ? '#8a6030' : '#3a3030');
    }
  }
  for (const e of eps) {
    const open = episodeOpen(e), hv = G.mapHover === 'ep' + e.ep, sel = G.epSel === e.ep;
    const done = open && episodeScenes(e).every(isSceneDone);
    if (open) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 300);
      ctx.globalAlpha = (hv || sel ? 0.5 : 0.2) + pulse * 0.2;
      disc(e.x, e.y, 13, '#c0283a');
      ctx.globalAlpha = 1;
    }
    hex(e.x, e.y, 10, open ? '#2a1018' : '#141218', open ? (hv || sel ? '#ffd060' : '#c0283a') : '#3a3640');
    ctx.font = '9px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = open ? '#fff' : '#4a4650';
    ctx.fillText(e.roman, e.x, e.y + 3);
    ctx.font = '6px VT323, monospace';
    ctx.fillStyle = open ? '#c09050' : '#4a4650';
    ctx.fillText(`EPISODIO ${e.roman}`, e.x, e.y + 19);
    ctx.textAlign = 'left';
    if (done && !e.wip) { ctx.font = '8px VT323, monospace'; ctx.fillStyle = '#3fbf6a'; ctx.fillText('✓', e.x + 8, e.y - 7); }
    if (e.wip) {
      ctx.font = '6px VT323, monospace';
      const w = Math.ceil(ctx.measureText('EN DESARROLLO').width) + 4;
      rect(e.x - w / 2, e.y - 21, w, 7, '#5a4010');
      ctx.fillStyle = '#ffd060'; ctx.textAlign = 'center'; ctx.fillText('EN DESARROLLO', e.x, e.y - 16); ctx.textAlign = 'left';
    }
    if (!open) { ctx.font = '7px VT323, monospace'; ctx.fillStyle = '#5a5660'; ctx.fillText('🔒', e.x + 7, e.y - 6); }
  }
}

// Summary of the hovered (or last tapped) episode, with a play button.
function drawEpisodePanel(t) {
  const rx = 236, ry = 10, rw = 78, rh = 140;
  rect(rx, ry, rw, rh, '#0e0c14');
  rect(rx, ry, rw, 1, '#4a3018');
  const hvEp = /^ep\d/.test(G.mapHover || '') ? +G.mapHover.slice(2) : null;
  const e = EPISODES.find(x => x.ep === (hvEp || G.epSel));
  rect(rx, ry, rw, 14, '#18141e');
  ctx.font = '10px VT323, monospace';
  ctx.fillStyle = '#c09050';
  if (!e) {
    ctx.fillText('EPISODIOS', rx + 14, ry + 10);
    ctx.font = '7px VT323, monospace';
    ctx.fillStyle = '#8a8070';
    wrap(IS_TOUCH ? 'Toca un episodio para ver su resumen.' : 'Pasa el ratón por un episodio para ver su resumen.', rw - 12, 7)
      .forEach((ln, i) => ctx.fillText(ln, rx + 6, ry + 26 + i * 8));
    return;
  }
  ctx.fillText(`EPISODIO ${e.roman}`, rx + 6, ry + 10);
  const open = episodeOpen(e), scenes = episodeScenes(e), enemies = episodeEnemies(e);
  let y = ry + 24;
  ctx.font = '9px VT323, monospace';
  ctx.fillStyle = open ? '#e8e4dc' : '#6a6670';
  wrap(e.title, rw - 12, 9).slice(0, 2).forEach(ln => { ctx.fillText(ln, rx + 6, y); y += 8; });
  y += 1;
  ctx.font = '6px VT323, monospace';
  ctx.fillStyle = '#8a8070';
  wrap(e.desc, rw - 12, 6).slice(0, 4).forEach(ln => { ctx.fillText(ln, rx + 6, y); y += 7; });
  y += 4;
  const row = (label, value, col) => {
    rect(rx + 4, y - 6, rw - 8, 9, '#141018');
    ctx.font = '7px VT323, monospace';
    ctx.fillStyle = '#8a6030'; ctx.fillText(label, rx + 6, y);
    ctx.textAlign = 'right'; ctx.fillStyle = col; ctx.fillText(value, rx + rw - 6, y); ctx.textAlign = 'left';
    y += 11;
  };
  if (open) {
    row('Escenas', e.wip ? `${scenes.length} (de momento)` : String(scenes.length), '#e8e4dc');
    row('Enemigos', enemies.length ? `Sí (${enemies.length})` : 'No', enemies.length ? '#ff6a78' : '#3fbf6a');
    ctx.font = '6px VT323, monospace';
    for (const n of enemies.slice(0, 3)) { ctx.fillStyle = '#c08088'; ctx.fillText('· ' + n, rx + 8, y - 3, rw - 14); y += 7; }
    row('Completadas', `${scenes.filter(isSceneDone).length}/${scenes.length}`, '#c09050');
    if (e.wip) row('Estado', 'Incompleto', '#ffd060');
  } else {
    row('Estado', 'Bloqueado', '#6a6670');
  }
  // play button
  const by = ry + rh - 18, hv = G.mapHover === 'play';
  rect(rx + 6, by, rw - 12, 13, open ? (hv ? '#c0283a' : '#5a1a24') : '#18141e');
  rect(rx + 6, by, rw - 12, 1, open ? '#ff6a78' : '#2a2630');
  ctx.font = '8px VT323, monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = open ? '#fff' : '#4a4650';
  const all = open && scenes.every(isSceneDone);
  ctx.fillText(open ? (all ? 'REJUGAR' : 'JUGAR ▶') : 'PRÓXIMAMENTE', rx + rw / 2, by + 9);
  ctx.textAlign = 'left';
}

// What the pointer is on in the map tab (for hover and clicks).
function mapHit(x, y) {
  const { x: mx, y: my } = MAP_PANEL;
  if (G.chapter) {
    if (hitTest(x, y, mx + 2, my + 1, 22, 8)) return 'back';
    for (const e of EPISODES.filter(e => e.chapter === G.chapter)) if (Math.hypot(x - e.x, y - e.y) <= 13) return 'ep' + e.ep;
    if (hitTest(x, y, 242, 132, 66, 13)) return 'play';
  } else {
    for (const c of CHAPTERS) {
      const d = CITY_DISTRICTS.find(n => n.id === c.node);
      if (Math.hypot(x - d.x, y - d.y) <= 10 || hitTest(x, y, d.x + 8, d.y - 7, 26, 10)) return 'chap' + c.num;
    }
    for (let i = 0; i < CHAPTERS.length; i++) if (hitTest(x, y, 239, 28 + i * 34, 72, 30)) return 'chap' + CHAPTERS[i].num;
  }
  return null;
}

// After an episode ends: back to the map of its chapter, with the next
// episode (or this one, if the next is not open yet) selected.
function showChapterOf(sc) {
  showHub();
  const e = sc && EPISODES.find(x => x.ep === sc.ep);
  if (!e) return;
  G.hubTab = 'mapa';
  G.hubNavSel = HUB_NAV.findIndex(n => n.id === 'mapa');
  G.chapter = e.chapter;
  const next = EPISODES.find(x => x.chapter === e.chapter && x.ep === e.ep + 1);
  G.epSel = next && episodeOpen(next) ? next.ep : e.ep;
}

function openChapter(num) { G.chapter = num; G.epSel = null; G.mapHover = null; SFX.play('confirm'); }
function closeChapter() { G.chapter = null; G.epSel = null; G.mapHover = null; SFX.play('select'); }
function playEpisode(ep) {
  const e = EPISODES.find(x => x.ep === ep);
  if (!e || !episodeOpen(e)) { SFX.play('error'); return; }
  G.confirmFrom = 'map';
  showConfirm(episodeNextScene(e));
}

function mapClick(x, y) {
  const h = mapHit(x, y);
  if (!h) return;
  if (h === 'back') closeChapter();
  else if (h.startsWith('chap')) openChapter(+h.slice(4));
  else if (h === 'play') { if (G.epSel) playEpisode(G.epSel); }
  else if (h.startsWith('ep')) {
    const ep = +h.slice(2);
    // touch: the first tap shows the summary, the second one plays
    if (IS_TOUCH && G.epSel !== ep) { G.epSel = ep; SFX.play('select'); }
    else { G.epSel = ep; playEpisode(ep); }
  }
}

// ---------- Hub canvas click handling (canvasToLogical lives in renderer.js) ----------
function hitTest(lx, ly, bx, by, bw, bh) {
  return lx >= bx && lx <= bx + bw && ly >= by && ly <= by + bh;
}

cv.addEventListener('click', (e) => {
  if (G.mode !== 'hub' || G.hubView !== 'main') return;
  const { x, y } = canvasToLogical(e.clientX, e.clientY);

  const bounds = getNavBtnBounds();
  for (const b of bounds) {
    if (!b.nav.enabled) continue;
    if (hitTest(x, y, b.x, b.y, b.w, b.h)) {
      G.hubNavSel = b.idx;
      activateNavBtn(b.nav.id);
      return;
    }
  }

  if (G.hubTab === 'mercado' || G.hubTab === 'pecadores') {
    if (G.pull) { pullClick(); return; }
    G.hubMouse = { x, y };
    const h = [...(G.hubHits || [])].reverse().find(r => hitTest(x, y, r.x, r.y, r.w - 0.01, r.h - 0.01));
    if (h) h.fn();
    return;
  }
  if (G.hubTab === 'ventana' && hitTest(x, y, CONTINUE_BTN.x, CONTINUE_BTN.y, CONTINUE_BTN.w, CONTINUE_BTN.h)) { continueStory(); return; }
  if (G.hubTab === 'mapa') {
    MAP_MODES.forEach((mode, i) => {
      const my = 16 + i * 30;
      if (hitTest(x, y, 12, my, 56, 24)) {
        G.mapModeSel = i;
        SFX.play('select');
      }
    });
    if (MAP_MODES[G.mapModeSel].id === 'raid') {
      const h = [...(G.hubHits || [])].reverse().find(r => hitTest(x, y, r.x, r.y, r.w - 0.01, r.h - 0.01));
      if (h) h.fn();
      return;
    }
    mapClick(x, y);
  }
});

cv.addEventListener('mousemove', (e) => {
  if (G.mode !== 'hub' || G.hubView !== 'main') return;
  const { x, y } = canvasToLogical(e.clientX, e.clientY);
  G.hubMouse = { x, y };
  if (G.hubTab === 'mercado' || G.hubTab === 'pecadores' || (G.hubTab === 'mapa' && MAP_MODES[G.mapModeSel].id === 'raid')) {
    cv.style.cursor = (G.hubHits || []).some(r => hitTest(x, y, r.x, r.y, r.w - 0.01, r.h - 0.01)) ? 'pointer' : 'default';
  }
  if (G.hubTab === 'ventana') {
    const hv = hitTest(x, y, CONTINUE_BTN.x, CONTINUE_BTN.y, CONTINUE_BTN.w, CONTINUE_BTN.h);
    if (hv && !G.ventHover) SFX.play('select');
    G.ventHover = hv;
    cv.style.cursor = hv ? 'pointer' : 'default';
  }
  if (G.hubTab === 'mapa') {
    const h = mapHit(x, y);
    if (h !== G.mapHover && h && h !== 'play') SFX.play('select');
    G.mapHover = h;
    // a tap also fires a mousemove: on touch screens selecting is left to the tap
    // itself, so the first tap shows the summary and only the second one plays
    if (h && h.startsWith('ep') && !IS_TOUCH) G.epSel = +h.slice(2);
    cv.style.cursor = h ? 'pointer' : 'default';
  }
  const bounds = getNavBtnBounds();
  for (const b of bounds) {
    if (!b.nav.enabled) continue;
    if (hitTest(x, y, b.x, b.y, b.w, b.h)) {
      if (G.hubNavSel !== b.idx) { G.hubNavSel = b.idx; SFX.play('select'); }
      return;
    }
  }
});

function activateNavBtn(id) {
  SFX.init(); SFX.play('select');
  if (G.hubTab === 'mercado' && id !== 'mercado') Music.play(MUSIC_FOR.hub);
  if (id === 'mercado') { if (G.hubTab !== 'mercado') openMarket(); return; }
  G.pull = null;
  const ni = HUB_NAV.findIndex(n => n.id === id);
  if (ni >= 0 && id !== 'ajustes') G.hubNavSel = ni;
  if (id === 'ventana') { G.hubTab = 'ventana'; }
  else if (id === 'mapa') { G.hubTab = 'mapa'; }
  else if (id === 'pecadores') { G.hubTab = 'pecadores'; }
  else if (id === 'ajustes') { showSettings(); }
}

function getEnabledNavIndices() {
  return HUB_NAV.map((n, i) => n.enabled ? i : -1).filter(i => i >= 0);
}

function applyTextSize() { document.body.classList.toggle('big-text', CFG.textSize === 'grande'); }
applyTextSize();
