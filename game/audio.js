// =====================================================================
//  AUDIO — sound effects, voice barks, text blips and music.
//
//  Every sound has a synthesized version. When a recorded file for it is
//  listed in SOUND_FILES / MUSIC_FILES (files live in game/audio/), the
//  file plays instead. HTMLAudio elements are used for files so they also
//  work from file:// in the desktop build.
// =====================================================================

// Original sounds made with tools/sound_studio.py (no third-party audio).
const CAN_OGG = (() => { try { return !!new Audio().canPlayType('audio/ogg; codecs="vorbis"'); } catch (e) { return false; } })();
const ogg = names => CAN_OGG ? Object.fromEntries(names.map(n => [n, n + '.ogg'])) : {};
// key → file name in game/audio/. Without a file the synth recipe plays.
const SOUND_FILES = {
  ...ogg(['clash', 'slash', 'pierce', 'blunt', 'block', 'shield', 'evade', 'counter', 'dice', 'tie',
    'stagger', 'ko', 'light', 'turn', 'reboot', 'victory', 'defeat',
    'select', 'confirm', 'error', 'alert',
    'scream', 'thud', 'rift', 'gacha', 'disconnect',
    'blip_lobelto', 'blip_gonza', 'blip_narr']),
  ...(CAN_OGG ? { hit: 'blunt.ogg', 'blip_¿¿??': 'blip_monster.ogg' } : {}),
};
// key → file name in game/audio/music/
const MUSIC_FILES = ogg(['hub', 'call', 'room', 'branch', 'battle_zayin', 'battle_teth', 'boss_distortion']);
// which music key each place uses
const MUSIC_FOR = {
  hub: 'hub', call: 'call', share: 'call', room: 'room', branch: 'branch',
  corrupted: 'boss_distortion', machine: 'battle_zayin', operator: 'battle_teth',
};

// Short combat barks, shown in a speech bubble. A file named
// `voice_<who>_<kind><n>` (e.g. voice_gonza_attack2) replaces the synthesized grunt.
const VOICE_LINES = {
  lobelto: {
    attack: ['¡Toma!', '¡Ahí va!', '¡Ven aquí, cabrón!'],
    hurt: ['¡Agh!', '¡Mi brazo no!'],
    stagger: ['No puedo más...'],
    evade: ['¡Por los pelos!'],
    block: ['¡Aguanta!'],
    win: ['¡Rial no feik!'],
  },
  gonza: {
    attack: ['¡Fuera!', '¡Te reviento!', '¡Toma tubo!'],
    hurt: ['¡Ay!', '¡Joder!'],
    stagger: ['Me mareo...'],
    evade: ['¡Casi!'],
    block: ['¡Ni de coña!'],
    win: ['¡GG EZ!'],
  },
  corrupted: { attack: ['GRRAAAH', 'S-SANGRE...'], hurt: ['GRK'], stagger: ['...'] },
  machine: { attack: ['*CLANK*', '*FSSHH*'], hurt: ['*CRACK*'], stagger: ['*bzzz...*'] },
  operator: { attack: ['ERR0R', '*bzzt*', 'D-DESCONECTA2'], hurt: ['#!?'], stagger: ['REINICIANDO'] },
};

// Synth voices: pitch and formant settings per character
const VOICE = {
  lobelto: { pitch: 128, type: 'sawtooth' },
  gonza: { pitch: 232, type: 'sawtooth' },
  corrupted: { pitch: 62, type: 'sawtooth', growl: true },
  machine: { pitch: 90, type: 'square', robot: true },
  operator: { pitch: 180, type: 'square', robot: true },
};
const VOWEL = { a: [760, 1300], e: [460, 1900], i: [300, 2300], o: [500, 900], u: [330, 780] };

// Deltarune-style text blips: one short tone per two letters, a voice per speaker
const BLIP = {
  lobelto: { type: 'square', f: 150, dur: 0.055, vol: 0.05, oct: 0.3 },
  gonza: { type: 'square', f: 247, dur: 0.045, vol: 0.045, oct: 0.2 },
  '¿¿??': { type: 'sawtooth', f: 78, dur: 0.08, vol: 0.06, noise: true },
  narr: { type: 'triangle', f: 392, dur: 0.035, vol: 0.035 },
};

const SFX = {
  ac: null, master: null, muted: false, noiseBuf: null, pool: {},

  init() {
    if (this.ac) return;
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      const comp = this.ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master = this.ac.createGain();
      this.master.connect(comp).connect(this.ac.destination);
      const len = this.ac.sampleRate * 2;
      this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ac = null; }
    for (const k in SOUND_FILES) this.pool[k] = [0, 1, 2].map(() => { const a = new Audio('audio/' + SOUND_FILES[k]); a.preload = 'auto'; return a; });
    Music.resume();
  },

  vol() { return this.muted ? 0 : CFG.sfxVol / 100; },

  // ---- synth building blocks ----
  osc(type, f0, t, dur, vol, f1, attack = 0.003) {
    const ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
    return o;
  },
  noise(t, dur, vol, ftype = 'bandpass', fA = 2000, fB = 2000, q = 1) {
    const ac = this.ac, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = this.noiseBuf;
    f.type = ftype; f.Q.value = q;
    f.frequency.setValueAtTime(fA, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, fB), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
  },
  // metallic hit: inharmonic partials decaying at different speeds
  metal(t, base, dur, vol) {
    [1, 1.51, 2.76, 4.22, 6.5].forEach((r, i) => this.osc(i % 2 ? 'triangle' : 'square', base * r, t, dur / (1 + i * 0.4), vol / (1 + i)));
  },
  // formant voice: a buzzy source through two vowel filters
  formant(t, pitch, type, v0, v1, dur, vol, glide = 1) {
    const ac = this.ac, src = ac.createOscillator(), out = ac.createGain();
    src.type = type;
    src.frequency.setValueAtTime(pitch, t);
    src.frequency.exponentialRampToValueAtTime(pitch * glide, t + dur);
    const vib = ac.createOscillator(), vg = ac.createGain();
    vib.frequency.value = 7; vg.gain.value = pitch * 0.03;
    vib.connect(vg).connect(src.frequency);
    [0, 1].forEach((k) => {
      const f = ac.createBiquadFilter();
      f.type = 'bandpass'; f.Q.value = 9;
      f.frequency.setValueAtTime(VOWEL[v0][k], t);
      f.frequency.linearRampToValueAtTime(VOWEL[v1][k], t + dur);
      const g = ac.createGain(); g.gain.value = k ? 0.6 : 1;
      src.connect(f).connect(g).connect(out);
    });
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    out.gain.setValueAtTime(vol, t + dur * 0.6);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(this.master);
    src.start(t); vib.start(t); src.stop(t + dur + 0.02); vib.stop(t + dur + 0.02);
  },

  // ---- playback ----
  playFile(key, rate = 1, vol = 1) {
    const list = this.pool[key];
    if (!list) return false;
    const a = list.find(x => x.paused || x.ended) || list[0];
    try {
      a.currentTime = 0;
      a.volume = Math.min(1, this.vol() * vol);
      a.preservesPitch = false;
      a.playbackRate = rate;
      a.play().catch(() => {});
    } catch (e) {}
    return true;
  },

  play(name, opts = {}) {
    if (!this.vol()) return;
    if (this.playFile(name, opts.rate || 0.96 + Math.random() * 0.08)) return;
    if (!this.ac) return;
    const r = RECIPES[name];
    if (!r) return;
    this.master.gain.value = this.vol();
    try { r(this, this.ac.currentTime + 0.005, opts); } catch (e) {}
  },

  tone(freq, dur, type = 'square', vol = 0.04, slide = 0) {
    if (!this.ac || !this.vol()) return;
    this.master.gain.value = this.vol();
    const t = this.ac.currentTime;
    try { this.osc(type, freq, t, dur, vol, slide ? freq + slide : 0); } catch (e) {}
  },

  blip(who) {
    if (!this.vol()) return;
    if (this.playFile('blip_' + who, 0.97 + Math.random() * 0.06, 0.8)) return;
    if (!this.ac) return;
    const b = BLIP[who] || BLIP.narr, t = this.ac.currentTime;
    this.master.gain.value = this.vol();
    const f = b.f * (0.96 + Math.random() * 0.08);
    try {
      this.osc(b.type, f, t, b.dur, b.vol, f * 0.92);
      if (b.oct) this.osc('square', f * 2, t, b.dur * 0.7, b.vol * b.oct);
      if (b.noise) this.noise(t, b.dur, b.vol * 0.8, 'bandpass', 600, 300, 2);
    } catch (e) {}
  },

  // Combat bark: returns the line so the caller can show it in a speech bubble
  voice(who, kind) {
    const lines = VOICE_LINES[who] && VOICE_LINES[who][kind];
    if (!lines) return null;
    const n = Math.floor(Math.random() * lines.length);
    if (!this.vol()) return lines[n];
    if (this.playFile(`voice_${who}_${kind}${n + 1}`, 1, 1)) return lines[n];
    if (!this.ac) return lines[n];
    const v = VOICE[who], t = this.ac.currentTime;
    this.master.gain.value = this.vol();
    try {
      if (v.robot) {
        [0, 0.07, 0.14].forEach((d, i) => this.osc('square', v.pitch * [1.5, 1, 2][i] * (kind === 'hurt' ? 0.7 : 1), t + d, 0.06, 0.05));
        this.noise(t, 0.2, 0.08, 'highpass', 3000, 6000, 1);
      } else {
        const shape = {
          attack: ['a', 'a', 0.16, 1.18], hurt: ['a', 'u', 0.22, 0.72], stagger: ['o', 'u', 0.45, 0.6],
          evade: ['o', 'e', 0.14, 1.25], block: ['e', 'o', 0.16, 0.95], win: ['e', 'i', 0.32, 1.35],
        }[kind];
        this.formant(t, v.pitch * (0.95 + Math.random() * 0.1), v.type, shape[0], shape[1], shape[2], 0.22, shape[3]);
        if (v.growl) this.noise(t, shape[2], 0.12, 'bandpass', 300, 200, 2);
      }
    } catch (e) {}
    return lines[n];
  },
};

// Synthesized recipes. Each gets (SFX, start time, options).
const RECIPES = {
  // ---- menus ----
  select(S, t) { S.osc('square', 1046, t, 0.03, 0.04); S.osc('square', 1568, t + 0.015, 0.03, 0.025); },
  confirm(S, t) { S.osc('square', 784, t, 0.05, 0.05); S.osc('square', 1175, t + 0.05, 0.08, 0.05); },
  error(S, t) { S.osc('square', 220, t, 0.08, 0.05); S.osc('square', 196, t + 0.08, 0.1, 0.05); },
  alert(S, t) { S.osc('square', 880, t, 0.07, 0.06, 1320); S.osc('square', 1760, t + 0.03, 0.05, 0.02); },

  // ---- combat: dice ----
  slash(S, t) { S.noise(t, 0.16, 0.5, 'bandpass', 7000, 1800, 1.2); S.osc('sine', 2200, t, 0.12, 0.05, 1300); },
  pierce(S, t) { S.noise(t, 0.06, 0.45, 'highpass', 5000, 3000, 1); S.osc('triangle', 2600, t + 0.02, 0.18, 0.07, 3400); },
  blunt(S, t) { S.osc('sine', 140, t, 0.28, 0.5, 45); S.noise(t, 0.16, 0.45, 'lowpass', 1200, 200, 1); S.osc('square', 85, t, 0.06, 0.12, 60); },
  hit(S, t) { RECIPES.blunt(S, t); },
  block(S, t) { S.metal(t, 540, 0.32, 0.12); S.noise(t, 0.05, 0.3, 'bandpass', 3500, 2500, 2); },
  shield(S, t) { [880, 1320, 1760].forEach((f, i) => S.osc('triangle', f, t + i * 0.035, 0.18, 0.05)); },
  evade(S, t) { S.noise(t, 0.22, 0.35, 'bandpass', 500, 3000, 3); },
  counter(S, t) { S.osc('sine', 2900, t, 0.35, 0.09); S.osc('sine', 4350, t, 0.2, 0.04); RECIPES.slash(S, t + 0.08); },
  clash(S, t) {
    S.metal(t, 310, 0.6, 0.16);
    S.noise(t, 0.14, 0.6, 'bandpass', 3000, 1200, 1);
    S.osc('sine', 95, t, 0.25, 0.35, 50);
  },
  dice(S, t, o) { S.osc('square', 900 + (o.roll || 5) * 70, t, 0.035, 0.035); },
  tie(S, t) { S.metal(t, 420, 0.25, 0.07); },
  light(S, t) { [1320, 1760, 2640].forEach((f, i) => S.osc('sine', f, t + i * 0.05, 0.25, 0.06)); },
  stagger(S, t) {
    S.osc('sawtooth', 420, t, 0.55, 0.12, 70);
    for (let i = 0; i < 6; i++) S.noise(t + i * 0.07, 0.04, 0.2, 'bandpass', 2000 + Math.random() * 3000, 800, 3);
  },
  ko(S, t) { S.osc('sine', 80, t, 0.8, 0.5, 30); S.noise(t, 0.5, 0.3, 'lowpass', 900, 100, 1); },
  turn(S, t) { S.osc('sine', 160, t, 0.16, 0.3, 60); S.noise(t, 0.05, 0.15, 'highpass', 6000, 8000, 1); },
  reboot(S, t) { [660, 440, 220].forEach((f, i) => S.osc('square', f, t + i * 0.12, 0.1, 0.05)); },
  victory(S, t) {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => S.osc('square', f, t + i * 0.1, i === 5 ? 0.5 : 0.12, 0.06));
    [131, 196, 262].forEach((f, i) => S.osc('triangle', f, t + i * 0.2, 0.3, 0.1));
  },
  defeat(S, t) { [392, 311, 262, 196].forEach((f, i) => S.osc('triangle', f, t + i * 0.22, 0.4, 0.1)); },

  // ---- cutscenes ----
  scream(S, t) {
    S.formant(t, 260, 'sawtooth', 'a', 'u', 1.3, 0.2, 0.55);
    S.formant(t + 0.02, 520, 'sawtooth', 'a', 'o', 1.2, 0.08, 0.6);
    S.noise(t, 1.4, 0.25, 'bandpass', 1200, 300, 1.5);
  },
  thud(S, t) { S.osc('sine', 90, t, 0.5, 0.6, 35); S.noise(t, 0.3, 0.35, 'lowpass', 600, 80, 1); },
  rift(S, t) {
    S.noise(t, 2.4, 0.3, 'bandpass', 150, 4000, 2);
    [55, 58, 82.5].forEach(f => S.osc('sawtooth', f, t, 2.4, 0.06, f * 4));
    S.osc('sine', 1800, t + 1.6, 0.8, 0.05, 3600);
  },
  gacha(S, t) {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => S.osc('square', f, t + i * 0.06, 0.15, 0.045));
    S.osc('sine', 2093, t + 0.4, 0.6, 0.06);
  },
  disconnect(S, t) { S.osc('sine', 620, t, 0.12, 0.08, 520); S.osc('sine', 420, t + 0.13, 0.25, 0.08, 300); },
};

// ---------------------------------------------------------------------
//  Music: one looping track at a time, crossfaded. Only plays when a file
//  for the key is listed in MUSIC_FILES.
// ---------------------------------------------------------------------
const Music = {
  cur: null, key: null, wanted: null,
  play(key) {
    this.wanted = key;
    if (key === this.key) return;
    const old = this.cur;
    this.key = key;
    this.cur = null;
    if (old) this.fade(old, 0, 600, () => old.pause());
    const file = key && MUSIC_FILES[key];
    if (!file) return;
    const a = new Audio('audio/music/' + file);
    a.loop = true;
    a.volume = 0;
    this.cur = a;
    a.play().then(() => this.fade(a, this.target(), 800)).catch(() => {});
  },
  target() { return SFX.muted ? 0 : CFG.musicVol / 100; },
  fade(a, to, ms, done) {
    const from = a.volume, start = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    };
    step();
  },
  setVolume() { if (this.cur) this.cur.volume = this.target(); },
  // browsers only allow audio after a user gesture
  resume() { if (this.cur && this.cur.paused) this.cur.play().then(() => this.fade(this.cur, this.target(), 600)).catch(() => {}); },
};
