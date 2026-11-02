// =====================================================================
//  Bucle principal: hub, reproductor de la historia y efectos.
// =====================================================================
const $ = (id) => document.getElementById(id);
const ui = {
  hub: $('hub'), chapters: $('chapters'),
  card: $('card'), cardTitle: document.querySelector('.c-title'),
  cardSub: document.querySelector('.c-sub'), box: $('box'), name: $('name'),
  text: $('text'), next: $('next'),
  ch1status: $('ch1-status'),
};

const G = {
  mode: 'hub', idx: 0, s: {}, actors: {},
  shakeUntil: 0, flash: null, fade: 0, fadeAnim: null,
  typing: null, waiting: null, skip: false,
  hubView: 'main',
};

// ---- Hub menu ----
function showHub() {
  G.mode = 'hub'; G.hubView = 'main'; G.s = {}; G.actors = {}; G.fade = 0;
  ui.card.classList.add('hidden'); hideBox();
  ui.hub.classList.remove('hidden');
  ui.chapters.classList.add('hidden');
  updateChapterStatus();
  refreshHubBtns();
}

function updateChapterStatus() {
  const done = SAVE.get('ep1_completed', false);
  if (ui.ch1status) ui.ch1status.textContent = done ? '✓ Completado' : '● Nuevo';
}

function showChapters() {
  G.hubView = 'chapters';
  ui.chapters.classList.remove('hidden');
  refreshHubBtns();
  SFX.play('select');
}

function hideChapters() {
  G.hubView = 'main';
  ui.chapters.classList.add('hidden');
  refreshHubBtns();
  SFX.play('select');
}

function startStory() {
  G.mode = 'play'; G.idx = 0; G.s = { bg: 'black' }; G.actors = {}; G.fade = 1;
  ui.hub.classList.add('hidden');
  ui.chapters.classList.add('hidden');
  SAVE.save({ current_idx: 0 });
  run();
}

showHub();

// ---------- Reproductor ----------
function run() {
  while (G.idx < STORY.length) {
    const st = STORY[G.idx++];
    if (st.card) SAVE.save({ current_idx: G.idx - 1 });
    if (handle(st)) return;
  }
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
  if (st.end) {
    hideBox();
    ui.cardTitle.textContent = 'FIN DEL EPISODIO 1';
    ui.cardSub.textContent = 'Continuará...';
    ui.card.classList.remove('hidden');
    G.mode = 'end'; G.waiting = 'card';
    SAVE.save({ ep1_completed: true, current_idx: null });
    return true;
  }
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
  const pause = /[.,!?]/.test(ch) ? 90 : 28;
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
    if (G.mode === 'end') return showHub();
    G.mode = 'play';
    return run();
  }
}

// ---------- Hub Input ----------
let hubBtns = [];
let hubSel = 0;

function refreshHubBtns() {
  if (G.hubView === 'chapters') {
    hubBtns = [...ui.chapters.querySelectorAll('.ch-card:not([data-locked]), .ch-back')];
  } else {
    hubBtns = [...document.querySelectorAll('#hub-side .hub-btn:not([disabled])')];
  }
  hubSel = 0;
  hubBtns.forEach((x, j) => x.classList.toggle('sel', j === 0));
}

function hubAct(btn) {
  if (!btn) return;
  SFX.init();
  const hub = btn.dataset.hub;
  const ch = btn.dataset.ch;
  if (hub === 'historia') showChapters();
  else if (hub === 'back') hideChapters();
  else if (ch === '1') { SFX.play('select'); startStory(); }
}

document.querySelectorAll('.hub-btn').forEach(b => {
  b.addEventListener('mouseenter', () => {
    if (b.disabled || G.hubView !== 'main') return;
    const idx = hubBtns.indexOf(b);
    if (idx >= 0) { hubSel = idx; hubBtns.forEach((x, j) => x.classList.toggle('sel', j === idx)); }
  });
  b.addEventListener('click', (e) => { e.stopPropagation(); if (!b.disabled) hubAct(b); });
});

document.querySelectorAll('.ch-card, .ch-back').forEach(b => {
  b.addEventListener('mouseenter', () => {
    if (b.dataset.locked !== undefined || G.hubView !== 'chapters') return;
    const idx = hubBtns.indexOf(b);
    if (idx >= 0) { hubSel = idx; hubBtns.forEach((x, j) => x.classList.toggle('sel', j === idx)); }
  });
  b.addEventListener('click', (e) => { e.stopPropagation(); if (b.dataset.locked === undefined) hubAct(b); });
});

// ---------- Keyboard ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') { SFX.muted = !SFX.muted; return; }
  if (e.key === 'h' || e.key === 'H') { ui.box.classList.toggle('dim'); return; }
  if (e.key === 'Control') { if (!G.skip) { G.skip = true; if (G.waiting === 'text' || G.waiting === 'card') advance(); } return; }
  if (G.mode === 'hub') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (hubBtns.length > 1) {
        hubSel = (hubSel + (e.key === 'ArrowDown' ? 1 : hubBtns.length - 1)) % hubBtns.length;
        hubBtns.forEach((x, j) => x.classList.toggle('sel', j === hubSel));
        SFX.init(); SFX.play('select');
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); hubAct(hubBtns[hubSel]);
    } else if (e.key === 'Escape' && G.hubView === 'chapters') {
      hideChapters();
    }
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) advance(); }
  if (e.key === 'Escape') showHub();
});
document.addEventListener('keyup', (e) => { if (e.key === 'Control') G.skip = false; });
window.addEventListener('blur', () => { G.skip = false; });
document.getElementById('game').addEventListener('click', (e) => {
  if (G.mode !== 'hub') advance();
});

// ---------- Hub background ----------
function drawHub(t) {
  rect(0, 0, W, H, '#050407');
  for (let i = 0; i < 28; i++) {
    const bw = 8 + hash(i) * 16, bh = 14 + hash(i + 3) * 60, bx = i * 12 - 4;
    rect(bx, 130 - bh, bw, bh + 50, '#0a0812');
    for (let k = 0; k < 4; k++) if (hash(i * 7 + k) > 0.6) px(bx + 2 + hash(i + k) * (bw - 4), 132 - bh + hash(k + i * 3) * bh, '#6a4a28');
  }
  for (let y = 0; y < 50; y++) {
    const a = 0.03 * (1 - y / 50);
    ctx.globalAlpha = a; rect(0, y, W, 1, '#4a1a3a'); ctx.globalAlpha = 1;
  }
  for (let y = 90; y < 130; y++) {
    const a = 0.06 * Math.sin(((y - 90) / 40) * Math.PI);
    ctx.globalAlpha = a; rect(0, y, W, 1, '#c0283a'); ctx.globalAlpha = 1;
  }
  rect(170, 60, 120, 80, '#0e0c14');
  rect(170, 60, 120, 2, '#1a1624');
  for (let x = 180; x < 280; x += 20) for (let y = 68; y < 110; y += 14) {
    rect(x, y, 10, 7, '#080610');
    if (hash(x + y * 7) > 0.88) px(x + 3, y + 3, '#6a4a28');
  }
  rect(220, 104, 30, 36, '#080610');
  rect(222, 106, 12, 34, '#12101a'); rect(236, 106, 12, 34, '#12101a');
  rect(234, 106, 2, 34, '#080610');
  rect(300, 66, 1, 74, '#0e0c14');
  if (hash(Math.floor(t / 90)) > 0.1) {
    rect(294, 65, 8, 2, '#f0d890');
    poly([[290, 67], [306, 67], [312, 140], [284, 140]], 'rgba(240,216,144,0.04)');
  }
  rect(0, 140, W, 40, '#0a0812');
  rect(0, 140, W, 1, '#1a1624');
  figure(150, 156, { hat: 'headset', face: 1 }, t);
  figure(136, 156, { hat: 'cap', face: 1 }, t);
  for (let i = 0; i < 40; i++) {
    const rx = (hash(i) * W + t * 0.04) % W, ry = (hash(i + 40) * H + t * 0.35) % H;
    rect(rx, ry, 1, 2, 'rgba(140,140,180,0.12)');
  }
  for (let i = 0; i < 6; i++) {
    const k = Math.floor(t / 300) * 6 + i;
    if (hash(k) > 0.4) {
      const px2 = hash(k + 1) * W, py = 60 + hash(k + 2) * 60;
      const a2 = 0.15 + 0.1 * Math.sin(t / 400 + i);
      ctx.globalAlpha = a2; disc(px2, py, 1, '#c8a8ff'); ctx.globalAlpha = 1;
    }
  }
  ctx.globalAlpha = 0.5; rect(0, 0, 90, H, '#050407'); ctx.globalAlpha = 1;
  ctx.globalAlpha = 0.06;
  for (let y = 0; y < H; y += 2) rect(0, y, W, 1, '#000');
  ctx.globalAlpha = 1;
}

// ---------- Render ----------
function render(t) {
  const now = performance.now();
  ctx.save();
  if (now < G.shakeUntil) ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 4));

  if (G.mode === 'hub') {
    drawHub(t);
  } else {
    (BG[G.s.bg] || BG.black)(G.s, t);
    const order = ['corrupted', 'gonza', 'lobelto'];
    for (const id of order) {
      const a = G.actors[id];
      if (!a) continue;
      const talk = G.s.typing && G.s.speaker === id;
      if (a.kind === 'corrupted') corrupted(a.x, a.y, a, t);
      else figure(a.x, a.y, { ...a, talk }, t);
    }
    const r = G.s.rift;
    if (r) { r.w += (r.target - r.w) * 0.04; rift(r.x, r.y, r.w, r.h + r.w * 0.6, t); }
  }
  ctx.restore();

  if (G.flash) {
    const k = 1 - (now - G.flash.start) / G.flash.ms;
    if (k <= 0) G.flash = null;
    else { ctx.globalAlpha = Math.min(1, k * 1.2); rect(0, 0, W, H, G.flash.color); ctx.globalAlpha = 1; }
  }
  if (G.fadeAnim) {
    const k = Math.min(1, (now - G.fadeAnim.start) / G.fadeAnim.ms);
    G.fade = G.fadeAnim.from + (G.fadeAnim.to - G.fadeAnim.from) * k;
  }
  if (G.fade > 0 && G.mode !== 'hub') {
    ctx.globalAlpha = Math.round(G.fade * 6) / 6; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  }

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
