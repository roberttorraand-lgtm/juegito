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
  G.hubNavSel = 0; G.hubTab = 'ventana'; G.mapSel = 0; G.mapModeSel = 0;
  hideAllOverlays();
  ui.hub.classList.add('hidden');
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
    <div class="cf-title">Escena ${sc.num}: ${sc.title}</div>
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
  showLevels();
}

function startScene(sc) {
  G.mode = 'play'; G.scene = sc; G.steps = sc.steps; G.idx = 0;
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
function showSettings() {
  G.hubView = 'settings';
  const speedChip = (id, label) =>
    `<button class="st-chip${CFG.textSpeed === id ? ' on' : ''}" data-speed="${id}">${label}</button>`;
  ui.settings.innerHTML = `
    <div class="st-side">
      <div class="st-side-title">— AJUSTES —</div>
      <button class="st-tab sel" data-stab="audio">Audio</button>
      <button class="st-tab" data-stab="juego">Juego</button>
      <button class="st-tab" data-stab="video">Video</button>
      <button class="st-tab" data-stab="datos">Datos</button>
      <button class="st-back" data-hub="back">← Volver</button>
      <div class="st-version">v0.1 — Episodio I</div>
    </div>
    <div class="st-main">
      <div class="st-panel" data-panel="audio">
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
          <div class="st-label">Silenciar (M)</div>
          <div class="st-toggle" data-toggle="mute">
            <div class="st-toggle-box${SFX.muted ? ' on' : ''}"><div class="st-toggle-knob"></div></div>
            <div class="st-toggle-label">${SFX.muted ? 'Silenciado' : 'Activo'}</div>
          </div>
        </div>
      </div>
      <div class="st-panel hidden" data-panel="juego">
        <div class="st-group">
          <div class="st-label">Velocidad de texto</div>
          <div class="st-chips">
            ${speedChip('normal', 'Normal')}
            ${speedChip('rapido', 'Rápido')}
            ${speedChip('muyrapido', 'Muy rápido')}
          </div>
          <div class="st-hint">Cambia la velocidad del texto letra por letra</div>
        </div>
      </div>
      <div class="st-panel hidden" data-panel="video">
        <div class="st-group">
          <div class="st-label">Líneas de escaneo (CRT)</div>
          <div class="st-toggle" data-toggle="scanlines">
            <div class="st-toggle-box${CFG.scanlines ? ' on' : ''}"><div class="st-toggle-knob"></div></div>
            <div class="st-toggle-label">${CFG.scanlines ? 'Activado' : 'Desactivado'}</div>
          </div>
          <div class="st-hint">Efecto retro de monitor CRT sobre el juego</div>
        </div>
        <div class="st-group">
          <div class="st-label">Pantalla completa</div>
          <button class="st-chip" data-act="fullscreen">Activar pantalla completa</button>
          <div class="st-hint">También puedes usar F11</div>
        </div>
      </div>
      <div class="st-panel hidden" data-panel="datos">
        <div class="st-group">
          <div class="st-label">Borrar datos guardados</div>
          <div class="st-hint">Elimina todo el progreso y ajustes. Esta acción no se puede deshacer.</div>
          <button class="st-danger-btn" data-act="cleardata">Borrar todo</button>
        </div>
      </div>
    </div>`;
  ui.settings.classList.remove('hidden');
  bindSettingsEvents();
  refreshHubBtns();
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
      panels.forEach(p => p.classList.toggle('hidden', p.dataset.panel !== tab.dataset.stab));
      SFX.play('select');
    });
  });

  const slider = ui.settings.querySelector('[data-slider="sfxVol"]');
  if (slider) {
    const setVol = (e) => {
      const r = slider.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100)));
      CFG.persist('sfxVol', pct);
      slider.querySelector('.st-slider-fill').style.width = pct + '%';
      slider.closest('.st-group').querySelector('.st-slider-val').textContent = pct + '%';
      SFX.play('select');
    };
    let dragging = false;
    slider.addEventListener('pointerdown', (e) => { e.stopPropagation(); dragging = true; slider.setPointerCapture(e.pointerId); setVol(e); });
    slider.addEventListener('pointermove', (e) => { if (dragging) setVol(e); });
    slider.addEventListener('pointerup', () => { dragging = false; });
  }

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

  const slToggle = ui.settings.querySelector('[data-toggle="scanlines"]');
  if (slToggle) slToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    CFG.persist('scanlines', !CFG.scanlines);
    setCRTEnabled(CFG.scanlines);
    const box = slToggle.querySelector('.st-toggle-box');
    box.classList.toggle('on', CFG.scanlines);
    slToggle.querySelector('.st-toggle-label').textContent = CFG.scanlines ? 'Activado' : 'Desactivado';
    SFX.play('select');
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
        CFG.sfxVol = 80; CFG.textSpeed = 'normal'; CFG.scanlines = true;
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
  { id: 'pecadores', label: 'Pecadores', icon: '☻', enabled: false },
  { id: 'mapa', label: 'Mapa', icon: '◈', enabled: true },
  { id: 'teatro', label: 'Teatro', icon: '♠', enabled: false },
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
  rect(0, NAV_Y, W, NAV_H, '#1a1018');
  rect(0, NAV_Y, W, 1, '#4a3018');
  rect(0, NAV_Y + 1, W, 1, '#8a6030');

  rect(2, NAV_Y + 3, 52, 15, '#0e0c14');
  rect(2, NAV_Y + 3, 52, 1, '#4a3018');
  ctx.font = '8px VT323, monospace';
  ctx.fillStyle = '#c09050'; ctx.fillText('LV', 5, NAV_Y + 10);
  ctx.font = '13px VT323, monospace';
  ctx.fillStyle = '#e8e4dc'; ctx.fillText('001', 14, NAV_Y + 11);
  rect(34, NAV_Y + 6, 16, 3, '#2a1810');
  rect(34, NAV_Y + 6, 6, 3, '#3fbf6a');
  ctx.font = '7px VT323, monospace';
  ctx.fillStyle = '#8a6030'; ctx.fillText('EP.1', 34, NAV_Y + 15);

  const btnW = 38, gap = 4;
  const totalW = HUB_NAV.length * btnW + (HUB_NAV.length - 1) * gap;
  const startX = 66 + (W - 66 - totalW) / 2;

  HUB_NAV.forEach((nav, i) => {
    const bx = startX + i * (btnW + gap);
    const sel = G.hubNavSel === i;
    const active = (G.hubTab === nav.id);

    if (!nav.enabled) {
      rect(bx, NAV_Y + 4, btnW, 14, '#0e0c14');
      ctx.font = '8px VT323, monospace';
      ctx.fillStyle = '#2a2620';
      ctx.fillText(nav.label, bx + btnW / 2 - nav.label.length * 1.5, NAV_Y + 13);
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
      ctx.fillText(nav.icon, bx + 4, NAV_Y + 13);
      ctx.font = '8px VT323, monospace';
      ctx.fillText(nav.label, bx + 12, NAV_Y + 13);
    }
  });
}

function getNavBtnBounds() {
  const btnW = 38, gap = 4;
  const totalW = HUB_NAV.length * btnW + (HUB_NAV.length - 1) * gap;
  const startX = 66 + (W - 66 - totalW) / 2;
  return HUB_NAV.map((nav, i) => ({
    x: startX + i * (btnW + gap), y: NAV_Y + 4, w: btnW, h: 14, nav, idx: i
  }));
}

function drawHub(t) {
  rect(0, 0, W, H, '#050407');

  if (G.hubTab === 'mapa') {
    drawMap(t);
  } else {
    drawVentana(t);
  }

  drawNavBar(t);
}

function drawVentana(t) {
  drawHubBackdrop(t);

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
  if (nextScene) {
    ctx.fillStyle = '#c09050'; ctx.fillText('Próximo:', cx + 10, cy + 70);
    ctx.fillStyle = '#e8e4dc'; ctx.fillText(`Esc.${nextScene.num}: ${nextScene.title}`, cx + 48, cy + 70);
  } else if (lastScene) {
    ctx.fillStyle = '#3fbf6a'; ctx.fillText('✓ Episodio 1 completado', cx + 10, cy + 70);
  }
  ctx.fillStyle = '#5d5850';
  const doneCount = SCENES.filter(s => isSceneDone(s)).length;
  ctx.fillText(`${doneCount}/${SCENES.length} escenas`, cx + 10, cy + 82);

  rect(cx + cw - 50, cy + 50, 46, 48, '#16141e');
  rect(cx + cw - 50, cy + 50, 46, 2, '#2a2638');
  for (let x2 = cx + cw - 44; x2 < cx + cw - 8; x2 += 12) for (let y2 = cy + 56; y2 < cy + 84; y2 += 10) {
    rect(x2, y2, 6, 5, '#0c0a16');
    if (hash(x2 + y2 * 7) > 0.85) px(x2 + 2, y2 + 2, '#c08a3a');
  }

  const rx = 260, ry = 14, rw = 52, rh = 46;
  metalRect(rx, ry, rw, rh);
  ctx.font = '7px VT323, monospace';
  ctx.fillStyle = '#8a6030'; ctx.fillText('EPISODIO I', rx + 6, ry + 12);
  ctx.font = '8px VT323, monospace';
  ctx.fillStyle = '#e8e4dc'; ctx.fillText('La Distorsión', rx + 4, ry + 22);
  ctx.fillStyle = '#c09050'; ctx.fillText('Externa', rx + 14, ry + 30);
  rect(rx + 4, ry + 34, rw - 8, 3, '#2a1810');
  rect(rx + 4, ry + 34, Math.round((rw - 8) * doneCount / Math.max(1, SCENES.length)), 3, '#c0283a');
  ctx.font = '7px VT323, monospace';
  ctx.fillStyle = '#5d5850'; ctx.fillText(`${doneCount}/${SCENES.length}`, rx + 4, ry + 43);

  metalRect(rx, ry + rh + 6, rw, 82);
  const previewY = ry + rh + 10;
  figure(rx + 14, previewY + 56, { hat: 'headset', face: 1, scale: 1.5 }, t);
  figure(rx + 36, previewY + 56, { hat: 'cap', face: -1, scale: 1.5 }, t);
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
  ctx.fillText('v0.1', 22, 133);
  ctx.fillText('EP.I', 22, 141);

  for (let i = 0; i < 8; i++) {
    const k = Math.floor(t / 300) * 8 + i;
    if (hash(k) > 0.5) {
      const px2 = 70 + hash(k + 1) * 180, py = 20 + hash(k + 2) * 90;
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t / 300 + i); disc(px2, py, 1, '#d0b0ff'); ctx.globalAlpha = 1;
    }
  }
}

// ---------- Map / Drive view ----------
const CITY_DISTRICTS = [
  { id: 'nido', name: 'Nido', x: 140, y: 65, r: 12, col: '#c09050' },
  { id: 'd1', name: 'D.1', x: 100, y: 40, r: 5, col: '#6a5040' },
  { id: 'd2', name: 'D.2', x: 170, y: 35, r: 5, col: '#6a5040' },
  { id: 'd3', name: 'D.3', x: 190, y: 60, r: 5, col: '#6a5040' },
  { id: 'd4', name: 'D.4', x: 185, y: 90, r: 6, col: '#8a5040' },
  { id: 'd5', name: 'D.5', x: 155, y: 100, r: 5, col: '#6a5040' },
  { id: 'd6', name: 'D.6', x: 120, y: 95, r: 5, col: '#6a5040' },
  { id: 'd7', name: 'D.7', x: 95, y: 75, r: 5, col: '#6a5040' },
  { id: 'd8', name: 'D.8', x: 105, y: 55, r: 4, col: '#5a4030' },
  { id: 'd12', name: 'D.12', x: 210, y: 45, r: 4, col: '#5a4030' },
  { id: 'd20', name: 'D.20', x: 75, y: 55, r: 4, col: '#5a4030' },
  { id: 'd23', name: 'D.23', x: 80, y: 90, r: 4, col: '#5a4030' },
  { id: 'ext', name: 'Exteriores', x: 60, y: 110, r: 6, col: '#3a2020' },
];
const CITY_CONNECTIONS = [
  ['nido','d1'],['nido','d2'],['nido','d3'],['nido','d4'],['nido','d5'],['nido','d6'],['nido','d7'],
  ['d1','d8'],['d1','d2'],['d2','d12'],['d3','d12'],['d3','d4'],['d4','d5'],['d5','d6'],['d6','d7'],
  ['d7','d8'],['d7','d20'],['d6','d23'],['d23','ext'],['d20','ext'],
];

const MAP_MODES = [
  { id: 'historia', label: 'Historia', icon: '▶', enabled: true },
  { id: 'combate', label: 'Test Combate', icon: '⚔', enabled: true },
];

function drawMap(t) {
  rect(0, 0, W, NAV_Y, '#08060e');

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
    ctx.fillText(mode.label, lx + 10, my + 19);
  });

  ctx.font = '7px VT323, monospace';
  ctx.fillStyle = '#4a3018'; ctx.fillText('— MODOS —', lx + 8, ly + lh - 6);

  const mx = 78, my = 10, mw = 152, mh = 140;
  rect(mx, my, mw, mh, '#0c0a14');
  rect(mx, my, mw, 1, '#4a3018');

  rect(mx, my, mw, 10, '#18141e');
  ctx.font = '8px VT323, monospace';
  ctx.fillStyle = '#c09050'; ctx.fillText('LA CIUDAD', mx + mw / 2 - 18, my + 7);

  CITY_CONNECTIONS.forEach(([a, b]) => {
    const da = CITY_DISTRICTS.find(d => d.id === a);
    const db = CITY_DISTRICTS.find(d => d.id === b);
    if (da && db) {
      ctx.globalAlpha = 0.3;
      line(da.x, da.y, db.x, db.y, '#4a3828', 1);
      ctx.globalAlpha = 1;
    }
  });

  CITY_DISTRICTS.forEach(d => {
    const isActive = d.id === 'ext' || d.id === 'd4';
    disc(d.x, d.y, d.r, d.col);
    disc(d.x, d.y, d.r - 1, isActive ? '#2a1018' : '#1a1018');
    if (isActive) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 300);
      ctx.globalAlpha = pulse * 0.4;
      disc(d.x, d.y, d.r + 2, '#c0283a');
      ctx.globalAlpha = 1;
    }
    ctx.font = d.id === 'nido' ? '8px VT323, monospace' : '5px VT323, monospace';
    ctx.fillStyle = d.id === 'nido' ? '#c09050' : '#6a6050';
    ctx.fillText(d.name, d.x - d.name.length * 1.2, d.y + d.r + 6);
  });

  const epMarker = (x, y, label, col) => {
    rect(x - 1, y - 1, 3, 3, col);
    ctx.font = '5px VT323, monospace';
    ctx.fillStyle = col; ctx.fillText(label, x + 4, y + 1);
  };
  epMarker(60, 112, 'Ep1.Esc2', '#c0283a');
  epMarker(140, 65, 'Inicio', '#c09050');

  const rx = 236, ry = 10, rw = 78, rh = 140;
  rect(rx, ry, rw, rh, '#0e0c14');
  rect(rx, ry, rw, 1, '#4a3018');

  rect(rx, ry, rw, 14, '#18141e');
  ctx.font = '10px VT323, monospace';
  ctx.fillStyle = '#c09050'; ctx.fillText('EPISODIO I', rx + 14, ry + 10);

  const ep1 = SCENES.filter(s => s.ep === 1);
  ep1.forEach((sc, i) => {
    const sy = ry + 18 + i * 28;
    const unlocked = isSceneUnlocked(sc);
    const done = isSceneDone(sc);
    const sel = G.mapSel === i;

    rect(rx + 3, sy, rw - 6, 24, unlocked ? '#18141e' : '#0e0c14');
    if (sel && unlocked) {
      rect(rx + 3, sy, 2, 24, '#c0283a');
      rect(rx + 3, sy, rw - 6, 24, 'rgba(192,40,58,0.12)');
      const pulse = 0.6 + 0.4 * Math.sin(t / 200);
      ctx.globalAlpha = pulse;
      rect(rx + 5, sy + 1, rw - 10, 22, 'rgba(192,40,58,0.08)');
      ctx.globalAlpha = 1;
    }

    ctx.font = '7px VT323, monospace';
    ctx.fillStyle = unlocked ? '#8a6030' : '#3a3020';
    ctx.fillText(`ESCENA ${sc.num}`, rx + 8, sy + 7);

    ctx.font = '8px VT323, monospace';
    ctx.fillStyle = unlocked ? '#e8e4dc' : '#3a3630';
    ctx.fillText(sc.title, rx + 8, sy + 15);

    if (done) { ctx.fillStyle = '#3fbf6a'; ctx.fillText('✓', rx + rw - 14, sy + 15); }
    else if (!unlocked) { ctx.fillStyle = '#3a3020'; ctx.fillText('🔒', rx + rw - 14, sy + 15); }

    ctx.font = '5px VT323, monospace';
    ctx.fillStyle = unlocked ? '#5d5850' : '#2a2620';
    const descShort = sc.desc.length > 28 ? sc.desc.slice(0, 26) + '..' : sc.desc;
    ctx.fillText(descShort, rx + 8, sy + 21);
  });
}

// ---------- Hub canvas click handling ----------
function canvasToLogical(clientX, clientY) {
  const r = cv.getBoundingClientRect();
  return {
    x: (clientX - r.left) / r.width * W,
    y: (clientY - r.top) / r.height * H,
  };
}

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

  if (G.hubTab === 'mapa') {
    MAP_MODES.forEach((mode, i) => {
      const my = 16 + i * 30;
      if (hitTest(x, y, 12, my, 56, 24)) {
        G.mapModeSel = i;
        SFX.play('select');
        if (mode.id === 'combate') startCombatTest();
      }
    });

    const ep1 = SCENES.filter(s => s.ep === 1);
    ep1.forEach((sc, i) => {
      const sy = 28 + i * 28;
      if (hitTest(x, y, 239, sy, 72, 24) && isSceneUnlocked(sc)) {
        G.mapSel = i;
        SFX.play('select');
        showConfirm(sc);
      }
    });
  }
});

cv.addEventListener('mousemove', (e) => {
  if (G.mode !== 'hub' || G.hubView !== 'main') return;
  const { x, y } = canvasToLogical(e.clientX, e.clientY);
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
  if (id === 'ventana') { G.hubTab = 'ventana'; }
  else if (id === 'mapa') { G.hubTab = 'mapa'; }
  else if (id === 'ajustes') { showSettings(); }
}

function getEnabledNavIndices() {
  return HUB_NAV.map((n, i) => n.enabled ? i : -1).filter(i => i >= 0);
}
