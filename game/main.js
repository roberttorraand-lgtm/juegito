// =====================================================================
//  Bucle principal: pantalla de título, reproductor de la historia y efectos.
// =====================================================================
const $ = (id) => document.getElementById(id);
const ui = {
  title: $('title'), card: $('card'), cardTitle: document.querySelector('.c-title'),
  cardSub: document.querySelector('.c-sub'), box: $('box'), name: $('name'), text: $('text'), next: $('next'),
};

const G = {
  mode: 'title',          // title | play | card | end
  idx: 0,
  s: {},                  // estado del escenario
  actors: {},
  shakeUntil: 0,
  flash: null,            // { color, start, ms }
  fade: 1,                // 0 = visible, 1 = negro
  fadeAnim: null,         // { from, to, start, ms }
  typing: null,           // { full, shown, who, timer }
  waiting: null,          // 'text' | 'card' | 'timer'
  skip: false,
};

// ---------- Reproductor ----------
function startStory() {
  G.mode = 'play'; G.idx = 0; G.s = { bg: 'black' }; G.actors = {}; G.fade = 1;
  ui.title.classList.add('hidden');
  run();
}

function run() {
  while (G.idx < STORY.length) {
    const st = STORY[G.idx++];
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
  if (st.say || st.narr || st.scream) {
    showText(st);
    return true;
  }
  if (st.end) {
    hideBox();
    ui.cardTitle.textContent = 'FIN DEL EPISODIO 1';
    ui.cardSub.textContent = 'Continuará...';
    ui.card.classList.remove('hidden');
    G.mode = 'end'; G.waiting = 'card';
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
  if (ty.cut) later(120, advance);           // frase cortada: sigue sola
  else if (G.skip) later(70, advance);
}

function hideBox() { ui.box.classList.add('hidden'); G.s.typing = false; }

function advance() {
  SFX.init();
  if (G.mode === 'title') return;
  if (G.waiting === 'text') {
    if (G.typing && !G.typing.done) return finishTyping();
    G.typing = null; G.waiting = null; G.s.speaker = null;
    return run();
  }
  if (G.waiting === 'card') {
    ui.card.classList.add('hidden');
    G.waiting = null;
    if (G.mode === 'end') return toTitle();
    G.mode = 'play';
    return run();
  }
}

function toTitle() {
  G.mode = 'title'; G.s = { bg: 'black' }; G.actors = {}; G.fade = 0;
  ui.card.classList.add('hidden'); hideBox();
  ui.title.classList.remove('hidden');
}

// ---------- Entrada ----------
const menuBtns = [...document.querySelectorAll('.menu button')];
let menuSel = 0;
function menuAct(act) {
  SFX.init(); SFX.play('select');
  if (act === 'start') startStory();
  else if (act === 'quit') window.close();
}
menuBtns.forEach((b, i) => {
  b.addEventListener('mouseenter', () => { menuSel = i; menuBtns.forEach((x, j) => x.classList.toggle('sel', j === i)); });
  b.addEventListener('click', (e) => { e.stopPropagation(); menuAct(b.dataset.act); });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'F11') { e.preventDefault(); document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); return; }
  if (e.key === 'm' || e.key === 'M') { SFX.muted = !SFX.muted; return; }
  if (e.key === 'Control') { if (!G.skip) { G.skip = true; if (G.waiting === 'text' || G.waiting === 'card') advance(); } return; }
  if (G.mode === 'title') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      menuSel = (menuSel + (e.key === 'ArrowDown' ? 1 : menuBtns.length - 1)) % menuBtns.length;
      menuBtns.forEach((x, j) => x.classList.toggle('sel', j === menuSel)); SFX.init(); SFX.play('select');
    } else if (e.key === 'Enter' || e.key === ' ') menuAct(menuBtns[menuSel].dataset.act);
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) advance(); }
});
document.addEventListener('keyup', (e) => { if (e.key === 'Control') G.skip = false; });
window.addEventListener('blur', () => { G.skip = false; });
$('game').addEventListener('click', advance);

// ---------- Render ----------
function render(t) {
  const now = performance.now();
  ctx.save();
  if (now < G.shakeUntil) ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 4));

  if (G.mode === 'title') drawTitle(t);
  else {
    (BG[G.s.bg] || BG.black)(G.s, t);
    // Personajes, de atrás hacia delante
    const order = ['corrupted', 'gonza', 'lobelto'];
    for (const id of order) {
      const a = G.actors[id];
      if (!a) continue;
      const talk = G.s.typing && G.s.speaker === id;
      if (a.kind === 'corrupted') corrupted(a.x, a.y, a, t);
      else figure(a.x, a.y, { ...a, talk }, t);
    }
    // Brecha
    const r = G.s.rift;
    if (r) { r.w += (r.target - r.w) * 0.04; rift(r.x, r.y, r.w, r.h + r.w * 0.6, t); }
  }
  ctx.restore();

  // Destello
  if (G.flash) {
    const k = 1 - (now - G.flash.start) / G.flash.ms;
    if (k <= 0) G.flash = null;
    else { ctx.globalAlpha = Math.min(1, k * 1.2); rect(0, 0, W, H, G.flash.color); ctx.globalAlpha = 1; }
  }
  // Fundido
  if (G.fadeAnim) {
    const k = Math.min(1, (now - G.fadeAnim.start) / G.fadeAnim.ms);
    G.fade = G.fadeAnim.from + (G.fadeAnim.to - G.fadeAnim.from) * k;
  }
  if (G.fade > 0 && G.mode !== 'title') {
    // Fundido en escalones para que se sienta "pixel"
    ctx.globalAlpha = Math.round(G.fade * 6) / 6; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  }
  // Líneas de escaneo suaves
  ctx.globalAlpha = 0.08;
  for (let y = 0; y < H; y += 2) rect(0, y, W, 1, '#000');
  ctx.globalAlpha = 1;

  requestAnimationFrame(render);
}

function drawTitle(t) {
  rect(0, 0, W, H, '#050407');
  for (let i = 0; i < 40; i++) {
    const k = Math.floor(t / 200) * 40 + i;
    if (hash(k) > 0.8) rect(hash(k + 1) * W, hash(k + 2) * H, 1 + hash(k + 3) * 12, 1, '#1a0a12');
  }
  rift(266, 120, 18 + Math.sin(t / 500) * 3, 100, t);
  corrupted(250, 176, {}, t);
  ctx.globalAlpha = 0.55; rect(0, 0, W, H, '#050407'); ctx.globalAlpha = 1;
  // silueta de los dos protagonistas
  figure(40, 176, { hat: 'headset', face: 1 }, t);
  figure(58, 176, { hat: 'cap', face: 1 }, t);
}

requestAnimationFrame(render);
