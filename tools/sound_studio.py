#!/usr/bin/env python3
"""
Sound studio for La Distorsión Externa.

Renders every sound effect, text blip and music loop of the game from
scratch (pure synthesis with numpy), so all audio is original and free of
third-party rights. Output: game/audio/*.ogg and game/audio/music/*.ogg.

    python3 tools/sound_studio.py            # render everything
    python3 tools/sound_studio.py sfx        # only sound effects
    python3 tools/sound_studio.py music hub  # only one music track

Needs numpy and ffmpeg (with libvorbis).
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

SR = 32000
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'audio')
RNG = np.random.default_rng(7)


# ---------------------------------------------------------------- basics
def n_of(d):
    return max(1, int(SR * d))


def tvec(d):
    return np.arange(n_of(d)) / SR


def phase_of(freq, d):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n_of(d),)) if np.ndim(freq) else np.full(n_of(d), float(freq))
    return np.cumsum(f) / SR


def sweep(f0, f1, d, curve='exp'):
    k = np.linspace(0, 1, n_of(d))
    return f0 * (f1 / f0) ** k if curve == 'exp' else f0 + (f1 - f0) * k


def osc(kind, freq, d, duty=0.5):
    p = phase_of(freq, d) % 1.0
    if kind == 'sine':
        return np.sin(2 * np.pi * p)
    if kind == 'square':
        return np.where(p < duty, 1.0, -1.0)
    if kind == 'tri':
        return 4 * np.abs(p - 0.5) - 1
    if kind == 'saw':
        return 2 * p - 1
    raise ValueError(kind)


def noise(d):
    return RNG.uniform(-1, 1, n_of(d))


def env_ad(d, a=0.003, curve=4.0):
    n = n_of(d)
    na = max(1, min(n - 1, int(a * SR)))
    e = np.ones(n)
    e[:na] = np.linspace(0, 1, na)
    e[na:] = np.exp(-curve * np.linspace(0, 1, n - na))
    return e


def adsr(d, a=0.01, dc=0.1, s=0.6, r=0.1):
    n = n_of(d)
    e = np.full(n, s)
    na, nd, nr = int(a * SR), int(dc * SR), int(r * SR)
    na = min(na, n); e[:na] = np.linspace(0, 1, na)
    nd = min(nd, n - na); e[na:na + nd] = np.linspace(1, s, nd)
    nr = min(nr, n); e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def fft_filter(x, kind, fc, q=1.0):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    if kind == 'lp':
        m = 1 / (1 + (f / fc) ** 4)
    elif kind == 'hp':
        m = 1 / (1 + (fc / np.maximum(f, 1)) ** 4)
    else:  # band
        bw = fc / q
        m = np.exp(-0.5 * ((f - fc) / bw) ** 2)
    return np.fft.irfft(X * m, len(x))


def swept(x, kind, f0, f1, q=1.0, steps=10):
    """Time-varying filter: crossfade between statically filtered copies."""
    cut = f0 * (f1 / f0) ** np.linspace(0, 1, steps)
    bank = np.stack([fft_filter(x, kind, c, q) for c in cut])
    pos = np.linspace(0, steps - 1, len(x))
    i = np.clip(pos.astype(int), 0, steps - 2)
    w = pos - i
    return bank[i, np.arange(len(x))] * (1 - w) + bank[i + 1, np.arange(len(x))] * w


def reverb(x, decay=1.0, mix=0.25, bright=4000):
    ir = noise(decay * 1.5) * np.exp(-np.linspace(0, 1.5, n_of(decay * 1.5)) * 6.9 / 1.5)
    ir = fft_filter(ir, 'lp', bright)
    ir[:int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    L = len(x) + len(ir)
    wet = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)
    out = np.zeros(L)
    out[:len(x)] += x * (1 - mix)
    out += wet * mix * 0.6
    return out


def pad_to(x, n):
    return np.pad(x, (0, max(0, n - len(x))))[:n] if len(x) != n else x


def mix(*parts):
    n = max(len(p[1]) + n_of(p[0]) for p in parts)
    out = np.zeros(n)
    for start, sig in parts:
        s = n_of(start) if start else 0
        out[s:s + len(sig)] += sig
    return out


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def fade_tail(x, ms=12):
    k = min(len(x), int(ms / 1000 * SR))
    x = x.copy()
    x[-k:] *= np.linspace(1, 0, k)
    return x


def save(name, x, sub='', q=4):
    x = np.clip(x, -1, 1)
    folder = os.path.join(ROOT, sub)
    os.makedirs(folder, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        path = tmp.name
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    out = os.path.join(folder, name + '.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-c:a', 'libvorbis', '-q:a', str(q), out], check=True)
    os.remove(path)
    print('  ', os.path.relpath(out, os.path.join(ROOT, '..')), f'{os.path.getsize(out) // 1024} KB')


# ---------------------------------------------------------------- sound effects
def metal(base, d, partials=(1, 1.51, 2.76, 4.22, 6.5, 8.9)):
    out = np.zeros(n_of(d))
    for i, r in enumerate(partials):
        out += osc('sine', base * r * (1 + RNG.uniform(-0.004, 0.004)), d) * env_ad(d, 0.001, 3 + i * 1.6) / (1 + i * 0.5)
    return out


def sfx_clash():
    d = 1.1
    ring = metal(310, d) + 0.6 * metal(447, d)
    crack = swept(noise(0.18), 'band', 4000, 900, 1.2) * env_ad(0.18, 0.001, 6)
    thump = osc('sine', sweep(110, 40, 0.3), 0.3) * env_ad(0.3, 0.002, 5)
    return norm(reverb(mix((0, ring * 0.7), (0, crack * 1.4), (0, thump)), 0.9, 0.3))


def sfx_slash():
    d = 0.32
    swish = swept(noise(d), 'band', 7500, 1400, 1.4) * env_ad(d, 0.02, 5)
    shing = osc('sine', sweep(2600, 1500, 0.22), 0.22) * env_ad(0.22, 0.001, 6) * 0.25
    return norm(reverb(mix((0, swish), (0.01, shing)), 0.4, 0.15))


def sfx_pierce():
    stab = fft_filter(noise(0.07), 'hp', 3500) * env_ad(0.07, 0.001, 7)
    ping = (osc('tri', sweep(2500, 3600, 0.3), 0.3) + 0.4 * osc('sine', 5200, 0.3)) * env_ad(0.3, 0.001, 7) * 0.4
    body = osc('sine', sweep(400, 150, 0.12), 0.12) * env_ad(0.12, 0.001, 5) * 0.5
    return norm(reverb(mix((0, stab), (0.015, ping), (0, body)), 0.4, 0.15))


def sfx_blunt():
    thump = osc('sine', sweep(160, 42, 0.4), 0.4) * env_ad(0.4, 0.002, 4)
    crunch = np.tanh(3 * fft_filter(noise(0.18), 'lp', 1400)) * env_ad(0.18, 0.001, 6) * 0.6
    snap = fft_filter(noise(0.03), 'hp', 2500) * env_ad(0.03, 0.0005, 5) * 0.5
    return norm(np.tanh(1.6 * mix((0, thump), (0, crunch), (0, snap))))


def sfx_block():
    clank = metal(560, 0.5, (1, 1.42, 2.2, 3.1, 4.7)) * 0.8
    hit = swept(noise(0.08), 'band', 3800, 2000, 2) * env_ad(0.08, 0.001, 6)
    body = osc('sine', sweep(240, 120, 0.15), 0.15) * env_ad(0.15, 0.001, 5) * 0.6
    return norm(reverb(mix((0, clank), (0, hit), (0, body)), 0.5, 0.2))


def sfx_shield():
    out = mix(*[(i * 0.045, osc('tri', f, 0.35) * env_ad(0.35, 0.005, 5) * 0.5) for i, f in enumerate([880, 1320, 1760, 2640])])
    shimmer = swept(noise(0.4), 'band', 3000, 7000, 4) * adsr(0.4, 0.1, 0.1, 0.5, 0.25) * 0.25
    return norm(reverb(mix((0, out), (0, shimmer)), 0.8, 0.3))


def sfx_evade():
    d = 0.3
    return norm(reverb(swept(noise(d), 'band', 450, 3200, 3) * adsr(d, 0.05, 0.05, 0.8, 0.15), 0.3, 0.12))


def sfx_counter():
    ting = (osc('sine', 2900, 0.6) + 0.5 * osc('sine', 4350, 0.6) + 0.25 * osc('sine', 7300, 0.6)) * env_ad(0.6, 0.001, 5) * 0.5
    return norm(reverb(mix((0, ting), (0.09, sfx_slash() * 0.9)), 0.6, 0.25))


def sfx_dice():
    return norm(mix((0, osc('square', 1500, 0.025, 0.3) * env_ad(0.025, 0.001, 5)), (0.03, osc('square', 2100, 0.02, 0.3) * env_ad(0.02, 0.001, 5) * 0.6)), 0.6)


def sfx_tie():
    return norm(reverb(metal(420, 0.4) * 0.8, 0.5, 0.2), 0.7)


def sfx_stagger():
    d = 0.8
    wob = osc('saw', sweep(480, 70, d) * (1 + 0.08 * np.sin(2 * np.pi * 9 * tvec(d))), d)
    wob = fft_filter(wob, 'lp', 2200) * env_ad(d, 0.01, 2.5)
    glitches = mix(*[(i * 0.08, swept(noise(0.05), 'band', 1500 + 600 * i, 700, 4) * env_ad(0.05, 0.001, 4)) for i in range(8)])
    birds = mix(*[(0.25 + i * 0.12, osc('sine', 1800 + 300 * (i % 3), 0.1) * env_ad(0.1, 0.005, 4) * 0.2) for i in range(4)])
    return norm(reverb(mix((0, wob * 0.8), (0, glitches * 0.6), (0, birds)), 0.6, 0.2))


def sfx_ko():
    boom = osc('sine', sweep(90, 28, 1.0), 1.0) * env_ad(1.0, 0.005, 3)
    rumble = fft_filter(noise(0.9), 'lp', 700) * env_ad(0.9, 0.01, 3) * 0.6
    tone = mix(*[(i * 0.18, osc('tri', f, 0.35) * env_ad(0.35, 0.005, 4) * 0.3) for i, f in enumerate([392, 311, 233])])
    return norm(reverb(mix((0, boom), (0, rumble), (0.05, tone)), 1.0, 0.25))


def sfx_light():
    notes = [1318, 1760, 2093, 2637]
    out = mix(*[(i * 0.05, (osc('sine', f, 0.5) + 0.3 * osc('sine', f * 2.01, 0.5)) * env_ad(0.5, 0.002, 5) * 0.5) for i, f in enumerate(notes)])
    return norm(reverb(out, 1.0, 0.35))


def sfx_turn():
    kick = osc('sine', sweep(170, 55, 0.25), 0.25) * env_ad(0.25, 0.002, 5)
    hat = fft_filter(noise(0.06), 'hp', 6000) * env_ad(0.06, 0.001, 6) * 0.4
    gong = metal(196, 0.8, (1, 2.0, 2.76, 4.1)) * 0.25
    return norm(reverb(mix((0, kick), (0, hat), (0.01, gong)), 0.8, 0.25))


def sfx_reboot():
    out = mix(*[(i * 0.14, osc('square', f, 0.12, 0.25) * env_ad(0.12, 0.002, 3) * 0.6) for i, f in enumerate([880, 660, 440, 220])])
    whine = osc('sine', sweep(3000, 200, 0.7), 0.7) * env_ad(0.7, 0.01, 2) * 0.25
    return norm(mix((0, out), (0, whine)))


def jingle(notes, step, wave_kind='square', bass=None, tail=0.6):
    parts = []
    for i, (m, length) in enumerate(notes):
        d = step * length + 0.05
        parts.append((sum(n[1] for n in notes[:i]) * step, osc(wave_kind, midi(m), d, 0.25) * adsr(d, 0.005, 0.05, 0.6, 0.05) * 0.35))
    if bass:
        for i, (m, length) in enumerate(bass):
            d = step * length
            parts.append((sum(n[1] for n in bass[:i]) * step, osc('tri', midi(m), d) * adsr(d, 0.005, 0.05, 0.8, 0.05) * 0.5))
    return norm(reverb(mix(*parts), tail, 0.25))


def sfx_victory():
    return jingle([(72, 1), (76, 1), (79, 1), (84, 2), (79, 1), (84, 4)], 0.1, bass=[(48, 2), (55, 2), (60, 6)], tail=1.0)


def sfx_defeat():
    return jingle([(67, 2), (63, 2), (60, 2), (55, 6)], 0.15, 'tri', bass=[(43, 4), (36, 8)], tail=1.2)


# UI — short and crisp, Deltarune-like
def sfx_select():
    return norm(mix((0, osc('square', 1046, 0.028, 0.25) * env_ad(0.028, 0.001, 3)), (0.018, osc('square', 1568, 0.03, 0.25) * env_ad(0.03, 0.001, 3) * 0.7)), 0.5)


def sfx_confirm():
    return norm(mix((0, osc('square', 784, 0.06, 0.25) * env_ad(0.06, 0.001, 2)), (0.055, osc('square', 1175, 0.12, 0.25) * env_ad(0.12, 0.001, 3))), 0.55)


def sfx_error():
    return norm(mix((0, osc('square', 233, 0.08, 0.5) * env_ad(0.08, 0.001, 1.5)), (0.085, osc('square', 196, 0.14, 0.5) * env_ad(0.14, 0.001, 2.5))), 0.5)


def sfx_alert():
    up = osc('square', sweep(700, 1400, 0.08), 0.08, 0.25) * env_ad(0.08, 0.001, 1.5)
    ding = osc('square', 1760, 0.12, 0.25) * env_ad(0.12, 0.001, 4) * 0.6
    return norm(mix((0, up), (0.06, ding)), 0.6)


# Cutscenes
def sfx_scream():
    d = 1.5
    t = tvec(d)
    pitch = sweep(300, 150, d) * (1 + 0.04 * np.sin(2 * np.pi * 6.5 * t) + 0.02 * RNG.standard_normal(len(t)).cumsum() / 400)
    src = osc('saw', pitch, d) + 0.5 * osc('saw', pitch * 1.98, d)
    voice = sum(fft_filter(src, 'band', f, 5) * g for f, g in [(760, 1), (1300, 0.7), (2600, 0.3)])
    rasp = swept(noise(d), 'band', 1500, 500, 1.5) * 0.4
    e = adsr(d, 0.05, 0.2, 0.8, 0.5)
    return norm(reverb(np.tanh(2 * (voice + rasp)) * e, 1.2, 0.3))


def sfx_thud():
    body = osc('sine', sweep(95, 32, 0.7), 0.7) * env_ad(0.7, 0.003, 3.5)
    floor = np.tanh(2 * fft_filter(noise(0.35), 'lp', 600)) * env_ad(0.35, 0.002, 5) * 0.6
    return norm(reverb(mix((0, body), (0, floor)), 0.7, 0.2))


def sfx_rift():
    d = 3.0
    rise = swept(noise(d), 'band', 150, 5000, 2) * adsr(d, 1.2, 0.5, 0.8, 0.8)
    drone = sum(fft_filter(osc('saw', sweep(f, f * 4, d), d), 'lp', 1800) for f in (55, 58, 82.5)) * adsr(d, 0.6, 0.5, 0.7, 0.8) * 0.4
    shine = osc('sine', sweep(1800, 3600, 1.0), 1.0) * adsr(1.0, 0.3, 0.2, 0.6, 0.4) * 0.2
    return norm(reverb(mix((0, rise), (0, drone), (1.8, shine)), 1.5, 0.35))


def sfx_gacha():
    notes = [72, 76, 79, 84, 88, 91, 96]
    run = mix(*[(i * 0.055, osc('square', midi(m), 0.18, 0.25) * env_ad(0.18, 0.002, 4) * 0.4) for i, m in enumerate(notes)])
    sparkle = mix(*[(0.4 + i * 0.07, osc('sine', midi(96 + (i % 3) * 4), 0.3) * env_ad(0.3, 0.002, 6) * 0.3) for i in range(6)])
    return norm(reverb(mix((0, run), (0, sparkle)), 1.2, 0.35))


def sfx_disconnect():
    a = osc('sine', sweep(660, 560, 0.14), 0.14) * env_ad(0.14, 0.005, 2)
    b = osc('sine', sweep(470, 330, 0.28), 0.28) * env_ad(0.28, 0.005, 3)
    return norm(mix((0, a), (0.15, b)), 0.6)


# Text blips (Deltarune style): very short, one per two letters
def blip(kind, f, d, duty=0.5, extra=None):
    x = osc(kind, sweep(f, f * 0.94, d), d, duty) * env_ad(d, 0.001, 3)
    if extra is not None:
        x = x + extra
    return fade_tail(norm(x, 0.55))


def sfx_door():
    # an old metal door dragged open: wobbling screech over a grinding rumble
    d = 2.2
    wob = 1 + 0.06 * np.sin(2 * np.pi * 7 * tvec(d)) + 0.03 * np.sin(2 * np.pi * 2.3 * tvec(d))
    f0 = sweep(340, 520, d, 'lin') * wob
    screech = fft_filter(osc('saw', f0, d) + 0.6 * osc('saw', f0 * 2.01, d), 'band', 1400, 1.2)
    screech *= adsr(d, 0.15, 0.4, 0.8, 0.4) * (0.7 + 0.3 * np.abs(np.sin(2 * np.pi * 3.1 * tvec(d))))
    grind = fft_filter(noise(d), 'lp', 400) * adsr(d, 0.05, 0.2, 0.7, 0.3) * 0.8
    clunk = metal(120, 0.8) * 0.6
    return norm(reverb(mix((0, screech * 0.6), (0, grind), (d - 0.3, clunk)), 1.2, 0.3))


def sfx_drip():
    plink = osc('sine', sweep(1900, 900, 0.12), 0.12) * env_ad(0.12, 0.001, 6)
    return norm(reverb(plink, 0.8, 0.35), 0.6)


def sfx_punch():
    slap = fft_filter(noise(0.06), 'band', 1800, 0.8) * env_ad(0.06, 0.0005, 5)
    body = osc('sine', sweep(180, 60, 0.18), 0.18) * env_ad(0.18, 0.001, 5)
    return norm(np.tanh(2 * mix((0, slap), (0, body * 0.9))))


def sfx_locker():
    bang = metal(260, 0.9, (1, 1.34, 2.1, 2.9, 4.4)) * 0.8
    rattle = sum(fft_filter(noise(0.05), 'band', 3000, 2) * env_ad(0.05, 0.001, 5) for _ in range(1))
    return norm(reverb(mix((0, bang), (0.12, rattle * 0.5), (0.2, rattle * 0.3)), 1.0, 0.3))


def sfx_item():
    return norm(mix((0, instrument('bell', 84, 0.5, 1)), (0.08, instrument('bell', 91, 0.6, 0.8)), (0.16, instrument('bell', 96, 0.7, 0.6))), 0.6)


# ---- emote stings for cutscene expressions (short, cartoony, quiet)
def emote_vein():
    pop = lambda f: osc('square', sweep(f, f * 0.7, 0.05), 0.05, 0.3) * env_ad(0.05, 0.001, 5)
    return norm(mix((0, pop(520)), (0.07, pop(440))), 0.55)


def emote_sweat():
    return norm(osc('sine', sweep(1400, 700, 0.22), 0.22) * env_ad(0.22, 0.005, 3) + 0.3 * osc('tri', sweep(2800, 1400, 0.22), 0.22) * env_ad(0.22, 0.005, 4), 0.45)


def emote_gloom():
    notes = [(0, 62), (0.16, 59), (0.32, 55)]
    return norm(mix(*[(st, instrument('tri', m, 0.22, 1)) for st, m in notes]), 0.45)


def emote_sparkle():
    return norm(mix((0, instrument('bell', 93, 0.25, 1)), (0.05, instrument('bell', 98, 0.25, 0.8)), (0.1, instrument('bell', 100, 0.35, 0.6))), 0.45)


def emote_question():
    return norm(osc('sine', sweep(380, 760, 0.18), 0.18) * env_ad(0.18, 0.005, 2) * (1 + 0.3 * osc('sine', 18, 0.18)), 0.45)


def emote_dots():
    tick = lambda: osc('square', 880, 0.025, 0.25) * env_ad(0.025, 0.001, 4)
    return norm(mix((0, tick()), (0.14, tick()), (0.28, tick())), 0.35)


def emote_shock():
    hit = osc('square', sweep(700, 1500, 0.08), 0.08, 0.25) * env_ad(0.08, 0.001, 2)
    ring_ = osc('sine', 1500, 0.3) * env_ad(0.3, 0.001, 5) * 0.4
    return norm(mix((0, hit), (0.06, ring_)), 0.5)


SFX = {
    'clash': sfx_clash, 'slash': sfx_slash, 'pierce': sfx_pierce, 'blunt': sfx_blunt, 'block': sfx_block,
    'shield': sfx_shield, 'evade': sfx_evade, 'counter': sfx_counter, 'dice': sfx_dice, 'tie': sfx_tie,
    'stagger': sfx_stagger, 'ko': sfx_ko, 'light': sfx_light, 'turn': sfx_turn, 'reboot': sfx_reboot,
    'victory': sfx_victory, 'defeat': sfx_defeat,
    'select': sfx_select, 'confirm': sfx_confirm, 'error': sfx_error, 'alert': sfx_alert,
    'scream': sfx_scream, 'thud': sfx_thud, 'rift': sfx_rift, 'gacha': sfx_gacha, 'disconnect': sfx_disconnect,
    'emote_vein': emote_vein, 'emote_sweat': emote_sweat, 'emote_gloom': emote_gloom, 'emote_sparkle': emote_sparkle,
    'emote_question': emote_question, 'emote_dots': emote_dots, 'emote_shock': emote_shock,
    'door': sfx_door, 'drip': sfx_drip, 'punch': sfx_punch, 'locker': sfx_locker, 'item': sfx_item,
    'blip_lobelto': lambda: blip('square', 150, 0.05, 0.5, 0.3 * osc('square', 300, 0.05, 0.25) * env_ad(0.05, 0.001, 4)),
    'blip_gonza': lambda: blip('square', 247, 0.042, 0.25),
    'blip_narr': lambda: blip('tri', 392, 0.035),
    'blip_monster': lambda: blip('saw', 78, 0.08, extra=0.6 * fft_filter(noise(0.08), 'band', 500, 2) * env_ad(0.08, 0.001, 3)),
}


# ---------------------------------------------------------------- music
def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


CHORDS = {
    'm': (0, 3, 7), 'M': (0, 4, 7), '7': (0, 4, 7, 10), 'm7': (0, 3, 7, 10), 'M7': (0, 4, 7, 11),
    'dim': (0, 3, 6), '7b9': (0, 4, 7, 10, 13), 'sus': (0, 5, 7),
}
NOTE = {'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11, 'C#': 1, 'G#': 8}


def chord(name):
    for q in ('7b9', 'M7', 'm7', 'dim', 'sus', '7', 'm', 'M'):
        if name.endswith(q) and name[:-len(q)] in NOTE:
            return NOTE[name[:-len(q)]], CHORDS[q]
    return NOTE[name], CHORDS['M']


def instrument(kind, m, d, vol):
    f = midi(m)
    if kind == 'sq':
        x = osc('square', f, d, 0.5) * adsr(d, 0.004, 0.06, 0.55, min(0.06, d / 3))
    elif kind == 'sq25':
        x = osc('square', f, d, 0.25) * adsr(d, 0.004, 0.08, 0.45, min(0.06, d / 3))
    elif kind == 'sq12':
        x = osc('square', f, d, 0.125) * adsr(d, 0.002, 0.05, 0.3, min(0.04, d / 3))
    elif kind == 'tri':
        x = osc('tri', f, d) * adsr(d, 0.004, 0.05, 0.8, min(0.05, d / 3))
    elif kind == 'bass':
        x = (osc('tri', f, d) + 0.35 * osc('square', f, d, 0.5)) * adsr(d, 0.003, 0.08, 0.7, min(0.04, d / 3))
    elif kind == 'saw':
        x = fft_filter(osc('saw', f, d) + osc('saw', f * 1.006, d), 'lp', 3200) * 0.6 * adsr(d, 0.005, 0.1, 0.6, min(0.06, d / 3))
    elif kind == 'dist':
        x = np.tanh(4 * (osc('saw', f, d) + osc('square', f * 0.5, d, 0.5))) * 0.5 * adsr(d, 0.003, 0.08, 0.7, min(0.04, d / 3))
    elif kind == 'bell':
        x = (osc('sine', f, d) + 0.4 * osc('sine', f * 2.76, d) + 0.2 * osc('sine', f * 5.4, d)) * env_ad(d, 0.002, 3.5)
    elif kind == 'pad':
        x = fft_filter(sum(osc('saw', f * r, d) for r in (1, 1.004, 0.996)), 'lp', 1400) * adsr(d, min(0.4, d / 3), 0.2, 0.8, min(0.4, d / 3)) * 0.35
    elif kind == 'drone':
        x = fft_filter(osc('saw', f, d) + osc('saw', f * 1.5, d) * 0.5, 'lp', 600) * adsr(d, 0.8, 0.1, 0.9, 0.8)
    elif kind == 'strings':
        fv = f * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * tvec(d)))
        x = sum(osc('saw', fv * r, d) for r in (1, 1.003, 0.997, 2.001))
        x = fft_filter(x, 'lp', 2200) * adsr(d, min(0.25, d / 3), 0.2, 0.85, min(0.3, d / 3)) * 0.3
    elif kind == 'cello':
        x = fft_filter(osc('saw', f, d) + osc('saw', f * 1.004, d), 'lp', 1100) * 0.5 + 0.3 * osc('sine', f, d)
        x = x * adsr(d, 0.012, 0.08, 0.6, min(0.05, d / 3))
    elif kind == 'brass':
        x = fft_filter(osc('saw', f, d) + osc('saw', f * 1.005, d), 'lp', 1300)
        x = np.tanh(1.5 * x) * adsr(d, 0.06, 0.15, 0.75, min(0.15, d / 3)) * 0.5
    elif kind == 'choir':
        fv = f * (1 + 0.006 * np.sin(2 * np.pi * 4.8 * tvec(d) + RNG.uniform(0, 6)))
        src = osc('saw', fv, d) + osc('saw', fv * 1.003, d)
        x = (fft_filter(src, 'band', 700, 3) + 0.6 * fft_filter(src, 'band', 1150, 4) + 0.3 * fft_filter(src, 'band', 2600, 6))
        x = x * adsr(d, min(0.35, d / 3), 0.2, 0.9, min(0.35, d / 3)) * 0.8
    else:
        raise ValueError(kind)
    return x * vol


def drum(kind, vol):
    if kind == 'k':
        return osc('sine', sweep(150, 45, 0.18), 0.18) * env_ad(0.18, 0.002, 5) * vol
    if kind == 'K':  # distorted kick
        return np.tanh(3 * osc('sine', sweep(180, 40, 0.2), 0.2)) * env_ad(0.2, 0.001, 5) * vol
    if kind == 's':
        return (fft_filter(noise(0.16), 'band', 2500, 0.8) * 0.9 + osc('tri', 190, 0.16) * 0.4) * env_ad(0.16, 0.001, 6) * vol
    if kind == 'h':
        return fft_filter(noise(0.04), 'hp', 7000) * env_ad(0.04, 0.001, 6) * vol
    if kind == 'o':
        return fft_filter(noise(0.18), 'hp', 6500) * env_ad(0.18, 0.001, 3) * vol
    if kind == 'c':
        return fft_filter(noise(1.0), 'hp', 4500) * env_ad(1.0, 0.002, 3) * vol
    if kind == 'g':  # glitch burst
        return swept(noise(0.06), 'band', 4000, 800, 4) * env_ad(0.06, 0.001, 3) * vol
    if kind == 'm':  # machine press clank
        return (metal(210, 0.45) * 0.6 + fft_filter(noise(0.45), 'band', 1500, 1.5) * env_ad(0.45, 0.001, 12)) * vol
    if kind == 'p':  # steam / piston hiss
        return fft_filter(noise(0.35), 'hp', 2500) * env_ad(0.35, 0.04, 3) * vol
    if kind == 'z':  # electric zap
        steps = RNG.choice([900, 1400, 2200, 3100], 16)
        f = np.repeat(steps, n_of(0.08) // 16 + 1)[:n_of(0.08)]
        return fft_filter(osc('square', f, 0.08, 0.3), 'band', 2000, 0.7) * env_ad(0.08, 0.001, 4) * vol
    if kind == 'r':  # clock tick
        return fft_filter(noise(0.02), 'band', 6000, 2) * env_ad(0.02, 0.0005, 6) * vol
    if kind == 't':  # low tom
        return (osc('sine', sweep(140, 72, 0.35), 0.35) * env_ad(0.35, 0.002, 4)
                + fft_filter(noise(0.35), 'band', 300, 1) * env_ad(0.35, 0.001, 20) * 0.4) * vol
    if kind == 'T':  # taiko
        return (np.tanh(2 * osc('sine', sweep(95, 46, 0.8), 0.8)) * env_ad(0.8, 0.002, 4.5)
                + fft_filter(noise(0.8), 'band', 180, 1) * env_ad(0.8, 0.001, 14) * 0.5) * vol
    if kind == 'l':  # funeral bell toll
        return metal(98, 3.5, (0.5, 1, 1.19, 1.5, 2, 2.52, 3, 4.2)) * vol
    if kind == 'b':  # heartbeat
        return osc('sine', sweep(70, 40, 0.25), 0.25) * env_ad(0.25, 0.01, 4) * vol
    return np.zeros(1)


def melody_line(rng, prog, scale, rhythm, low, high, rest=0.2):
    """Phrase-based melody: a 2-bar motif built on chord tones, repeated with variation."""
    notes = []
    motif = None
    for bi in range(0, len(prog), 2):
        root, q = chord(prog[bi])
        tones = [root + i for i in q]
        if motif is None or bi % 8 == 4 or rng.random() < 0.25:
            cur = low + 7
            motif = []
            for beat, length in rhythm:
                if rng.random() < rest:
                    motif.append((beat, length, None))
                    continue
                cand = [m for m in range(low, high) if (m % 12) in [s % 12 for s in scale]]
                weights = np.array([(3.0 if (m % 12) in [t % 12 for t in tones] else 1.0) / (1 + abs(m - cur)) ** 1.6 for m in cand])
                cur = cand[rng.choice(len(cand), p=weights / weights.sum())]
                motif.append((beat, length, cur - root))
        for beat, length, rel in motif:
            if rel is not None:
                notes.append((bi * 4 + beat, length, root + rel))
    return notes


def render_song(spec):
    rng = np.random.default_rng(spec['seed'])
    beat = 60 / spec['bpm']
    prog = spec['prog']
    bars = len(prog)
    total = bars * 4 * beat
    out = np.zeros(n_of(total + 3))

    def put(start_beats, sig):
        s = int(start_beats * beat * SR)
        e = min(len(out), s + len(sig))
        out[s:e] += sig[:e - s]

    for layer in spec['layers']:
        kind = layer['type']
        if kind == 'chords':
            for b, name in enumerate(prog):
                root, q = chord(name)
                for st, ln in layer.get('hits', [(0, 4)]):
                    for i in q[:4]:
                        put(b * 4 + st, instrument(layer['inst'], layer['oct'] + root + i, ln * beat, layer['vol']))
        elif kind == 'arp':
            step = layer['step']
            for b, name in enumerate(prog):
                root, q = chord(name)
                seq = [layer['oct'] + root + i for i in q] + [layer['oct'] + 12 + root]
                pattern = layer.get('order', [0, 1, 2, 3, 2, 1])
                for k in range(int(4 / step)):
                    put(b * 4 + k * step, instrument(layer['inst'], seq[pattern[k % len(pattern)] % len(seq)], step * beat * 0.95, layer['vol']))
        elif kind == 'bass':
            for b, name in enumerate(prog):
                root, q = chord(name)
                for st, ln, off in layer['pattern']:
                    put(b * 4 + st, instrument(layer['inst'], layer['oct'] + root + off, ln * beat * 0.95, layer['vol']))
        elif kind == 'melody':
            for st, ln, m in melody_line(rng, prog, spec['scale'], layer['rhythm'], layer['low'], layer['high'], layer.get('rest', 0.2)):
                if layer.get('from', 0) <= st / 4 < layer.get('to', bars):
                    put(st, instrument(layer['inst'], m, ln * beat * 0.92, layer['vol']))
        elif kind == 'drums':
            for b in range(bars):
                if b < layer.get('from', 0):
                    continue
                pat = layer['bars'][b % len(layer['bars'])]
                for i, ch in enumerate(pat):
                    if ch != '.':
                        put(b * 4 + i * 0.25, drum(ch, layer['vols'].get(ch, 0.5)))
        elif kind == 'drone':
            for b in range(0, bars, 2):
                root, _ = chord(prog[b])
                put(b * 4, instrument('drone', layer['oct'] + root, 8 * beat + 0.4, layer['vol']))
        elif kind == 'notes':  # hand-written phrase, repeated every `every` bars
            every = layer.get('every', bars)
            for rep in range(0, bars, every):
                for st, ln, m in layer['notes']:
                    put(rep * 4 + st, instrument(layer['inst'], m + layer.get('shift', 0), ln * beat * 0.97, layer['vol']))
        elif kind == 'hum':  # mains buzz with flicker and dropouts
            n = n_of(total)
            t = np.arange(n) / SR
            x = sum(osc('sine', 50 * k, total) / k * (1.4 if k % 2 else 0.6) for k in range(1, 14))
            x = fft_filter(x, 'lp', 900)
            cyc = max(1, round(total * 0.25))
            amp = 0.7 + 0.3 * np.sin(2 * np.pi * cyc * t / total)
            for _ in range(int(total / 4)):
                s0 = RNG.integers(0, n - n_of(0.4))
                amp[s0:s0 + n_of(RNG.uniform(0.05, 0.3))] *= 0.1
            out[:n] += x * amp * layer['vol']
        elif kind == 'wind':
            n = n_of(total)
            t = np.arange(n) / SR
            cyc = max(1, round(total / 9))
            out[:n] += fft_filter(noise(total), 'lp', 450) * (0.55 + 0.45 * np.sin(2 * np.pi * cyc * t / total)) * layer['vol']
        elif kind == 'rain':
            n = n_of(total)
            out[:n] += fft_filter(noise(total), 'band', 2500, 0.6) * layer['vol']
    # fold the reverb tail back to the start so the loop is seamless
    wet = reverb(out, spec.get('verb', 1.0), spec.get('mix', 0.25))
    n = n_of(total)
    loop = wet[:n].copy()
    tail = wet[n:n + n_of(3)]
    loop[:len(tail)] += tail
    loop = np.tanh(1.2 * norm(loop, 0.95)) / np.tanh(1.2)
    return norm(loop, 0.85)


MAJ = (0, 2, 4, 5, 7, 9, 11)
MIN = (0, 2, 3, 5, 7, 8, 10)
HARM = (0, 2, 3, 5, 7, 8, 11)


def scale_of(root, mode):
    return tuple((NOTE[root] + i) % 12 for i in mode)


SONGS = {
    # calm and mysterious menu theme
    'hub': {
        'bpm': 88, 'seed': 3, 'scale': scale_of('A', MIN), 'verb': 2.2, 'mix': 0.4,
        'prog': ['Am', 'Am', 'F', 'F', 'C', 'C', 'G', 'G', 'Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E'],
        'layers': [
            {'type': 'chords', 'inst': 'pad', 'oct': 48, 'vol': 0.25, 'hits': [(0, 4)]},
            {'type': 'arp', 'inst': 'sq12', 'oct': 60, 'step': 0.5, 'vol': 0.07, 'order': [0, 2, 1, 3, 2, 1, 0, 2]},
            {'type': 'bass', 'inst': 'tri', 'oct': 33, 'vol': 0.35, 'pattern': [(0, 2, 0), (2, 1.5, 7), (3.5, 0.5, 12)]},
            {'type': 'melody', 'inst': 'bell', 'low': 69, 'high': 84, 'vol': 0.18, 'from': 4, 'rest': 0.35,
             'rhythm': [(0, 1.5), (1.5, 0.5), (2, 2), (4, 1), (5, 1), (6, 2)]},
        ],
    },
    # relaxed late-night voice call
    'call': {
        'bpm': 92, 'seed': 11, 'scale': scale_of('C', MAJ), 'verb': 1.2, 'mix': 0.25,
        'prog': ['CM7', 'CM7', 'Am7', 'Am7', 'Dm7', 'Dm7', 'G7', 'G7'] * 2,
        'layers': [
            {'type': 'chords', 'inst': 'sq25', 'oct': 60, 'vol': 0.05, 'hits': [(0.5, 0.4), (1.5, 0.4), (2.5, 0.4), (3.5, 0.4)]},
            {'type': 'bass', 'inst': 'bass', 'oct': 36, 'vol': 0.33, 'pattern': [(0, 1, 0), (1.5, 0.5, 12), (2, 1, 7), (3, 1, 10)]},
            {'type': 'melody', 'inst': 'sq', 'low': 67, 'high': 84, 'vol': 0.09, 'from': 2, 'rest': 0.25,
             'rhythm': [(0, 0.5), (0.5, 0.5), (1, 1), (2.5, 0.5), (3, 1), (4, 1.5), (6, 0.5), (6.5, 1.5)]},
            {'type': 'drums', 'vols': {'k': 0.5, 's': 0.3, 'h': 0.12}, 'from': 0,
             'bars': ['k...s..kk...s...', 'k...s...k.k.s..h']},
        ],
    },
    # horror: drone, heartbeat, dissonant bells
    'room': {
        'bpm': 66, 'seed': 5, 'scale': scale_of('D', HARM), 'verb': 3.0, 'mix': 0.45,
        'prog': ['Dm', 'Dm', 'Bb', 'Bb', 'Dm', 'Dm', 'A7b9', 'A7b9'],
        'layers': [
            {'type': 'drone', 'oct': 26, 'vol': 0.4},
            {'type': 'drums', 'vols': {'b': 0.55}, 'bars': ['b..b............']},
            {'type': 'melody', 'inst': 'bell', 'low': 74, 'high': 90, 'vol': 0.12, 'rest': 0.55,
             'rhythm': [(0, 3), (3, 1), (5, 3)]},
            {'type': 'chords', 'inst': 'pad', 'oct': 50, 'vol': 0.12, 'hits': [(0, 4)]},
        ],
    },
    # uneasy rainy night outside the branch
    'branch': {
        'bpm': 76, 'seed': 21, 'scale': scale_of('E', MIN), 'verb': 2.5, 'mix': 0.4,
        'prog': ['Em', 'Em', 'C', 'C', 'Am', 'Am', 'B7', 'B7'] * 2,
        'layers': [
            {'type': 'rain', 'vol': 0.05},
            {'type': 'chords', 'inst': 'pad', 'oct': 52, 'vol': 0.2, 'hits': [(0, 4)]},
            {'type': 'arp', 'inst': 'tri', 'oct': 64, 'step': 0.5, 'vol': 0.1, 'order': [0, 1, 2, 3, 2, 1, 2, 1]},
            {'type': 'bass', 'inst': 'tri', 'oct': 28, 'vol': 0.35, 'pattern': [(0, 3.5, 0)]},
            {'type': 'melody', 'inst': 'bell', 'low': 71, 'high': 86, 'vol': 0.14, 'from': 4, 'rest': 0.3,
             'rhythm': [(0, 1), (1, 1), (2, 2), (4, 1.5), (5.5, 0.5), (6, 2)]},
            {'type': 'drums', 'vols': {'k': 0.3, 'h': 0.06}, 'from': 8, 'bars': ['k.......k.......']},
        ],
    },
    # Inside the abandoned L.Corp branch: cold drone, failing lights' hum,
    # water drops and a distant metallic groan. Mostly silence and tension.
    'lcorp': {
        'bpm': 60, 'seed': 77, 'scale': scale_of('B', MIN), 'verb': 3.2, 'mix': 0.5,
        'prog': ['Bm', 'Bm', 'G', 'G', 'Em', 'Em', 'F#', 'F#'] * 2,
        'layers': [
            {'type': 'drone', 'oct': 23, 'vol': 0.16},
            {'type': 'hum', 'vol': 0.02},
            {'type': 'chords', 'inst': 'strings', 'oct': 47, 'vol': 0.07, 'hits': [(0, 4)]},
            {'type': 'drums', 'vols': {'l': 0.06}, 'bars': ['l...............', '................', '................', '................', '................', '................', '................', '................']},
            {'type': 'notes', 'inst': 'bell', 'vol': 0.05, 'notes': [
                (b * 4 + st, 0.5, n) for b, st, n in [(0, 1.5, 95), (1, 3, 93), (2, 0.5, 98), (3, 2.5, 95), (5, 1, 97), (6, 3.5, 93),
                                                    (8, 2, 95), (9, 0.5, 98), (11, 1.5, 93), (12, 3, 97), (14, 0.5, 95), (15, 2, 98)]]},
            {'type': 'notes', 'inst': 'strings', 'vol': 0.12, 'notes': [
                (32, 4, 66), (36, 4, 67), (40, 4, 64), (44, 4, 65),
                (48, 4, 66), (52, 4, 62), (56, 4, 64), (60, 4, 65)]},
        ],
    },
    # ZAYIN — E.G.O Extraction Machine, inside a containment cell of the
    # abandoned L.Corp branch: slow mechanical pulse, press clanks and steam,
    # a cold music box and a lament on strings. Survival, not adventure.
    'battle_zayin': {
        'bpm': 92, 'seed': 31, 'scale': scale_of('D', MIN), 'verb': 2.0, 'mix': 0.35,
        'prog': ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A', 'Dm', 'Dm', 'Bb', 'Bb', 'Eb', 'Eb', 'A7b9', 'A7b9'],
        'layers': [
            {'type': 'drone', 'oct': 26, 'vol': 0.12},
            {'type': 'hum', 'vol': 0.025},
            {'type': 'bass', 'inst': 'cello', 'oct': 38, 'vol': 0.26,
             'pattern': [(k * 0.5, 0.45, o) for k, o in enumerate([0, 12, 0, 7, 0, 12, 0, 10])]},
            {'type': 'chords', 'inst': 'strings', 'oct': 50, 'vol': 0.12, 'hits': [(0, 4)]},
            {'type': 'drums', 'vols': {'k': 0.45, 'm': 0.3, 'r': 0.09, 'p': 0.08},
             'bars': ['k.r.m.r.k.r.m.r.', 'k.r.m.r.k.r.m.rp', 'k.r.m.r.k.r.m.r.', 'k.r.m.r.k.rkm.mp']},
            {'type': 'notes', 'inst': 'bell', 'vol': 0.08, 'every': 2,
             'notes': [(0, 1, 86), (1.5, 0.5, 81), (3, 1, 82), (5, 2, 81)]},
            {'type': 'notes', 'inst': 'strings', 'vol': 0.28, 'notes': [
                (32, 2, 69), (34, 1, 70), (35, 1, 69), (36, 3, 65), (39, 1, 64),
                (40, 2, 62), (42, 2, 65), (44, 4, 70),
                (48, 2, 70), (50, 1, 67), (51, 1, 70), (52, 3, 67), (55, 1, 70),
                (56, 2, 69), (58, 2, 70), (60, 4, 73)]},
        ],
    },
    # TETH — The Disconnected Operator, deeper in the branch among dead
    # monitors and cables: mains hum, nervous syncopated pulses, zaps,
    # tritone harmony and a short "reboot" beep motif.
    'battle_teth': {
        'bpm': 100, 'seed': 47, 'scale': scale_of('F#', MIN), 'verb': 1.8, 'mix': 0.3,
        'prog': ['F#m', 'F#m', 'G', 'G', 'F#m', 'F#m', 'C', 'C', 'Bm', 'Bm', 'G', 'G', 'D', 'D', 'C#7b9', 'C#7b9'],
        'layers': [
            {'type': 'hum', 'vol': 0.045},
            {'type': 'drone', 'oct': 30, 'vol': 0.1},
            {'type': 'bass', 'inst': 'cello', 'oct': 30, 'vol': 0.3,
             'pattern': [(0, 0.7, 0), (0.75, 0.7, 0), (1.5, 0.45, 0), (2, 0.7, 0), (2.75, 0.7, 0), (3.5, 0.45, 1)]},
            {'type': 'chords', 'inst': 'strings', 'oct': 54, 'vol': 0.1, 'hits': [(0, 4)]},
            {'type': 'arp', 'inst': 'sq12', 'oct': 73, 'step': 0.25, 'vol': 0.018, 'order': [0, 3, 1, 2, 0, 2, 3, 1]},
            {'type': 'drums', 'vols': {'k': 0.5, 't': 0.35, 'r': 0.1, 'z': 0.12},
             'bars': ['k..t..k.r.z.t...', 'k..t..k.r...t.z.', 'k..t..k.r.z.t...', 'k..t..k.t.t.tzz.']},
            {'type': 'notes', 'inst': 'sq25', 'vol': 0.06, 'every': 4,
             'notes': [(14, 0.25, 90), (14.5, 0.25, 90), (15, 0.75, 85)]},
            {'type': 'notes', 'inst': 'strings', 'vol': 0.28, 'notes': [
                (32, 3, 71), (35, 1, 74), (36, 4, 73),
                (40, 2, 74), (42, 2, 71), (44, 4, 67),
                (48, 2, 69), (50, 2, 66), (52, 4, 69),
                (56, 2, 68), (58, 2, 74), (60, 4, 73)]},
        ],
    },
    # Distortion — the consumed employee, in the rainy alleys of District D:
    # a funeral bell, taiko, a driving cello ostinato, a choir and a brass
    # lament. The heaviest track: losing here means dying.
    'boss_distortion': {
        'bpm': 84, 'seed': 66, 'scale': scale_of('C', HARM), 'verb': 2.6, 'mix': 0.35,
        'prog': ['Cm', 'Cm', 'Ab', 'Ab', 'Fm', 'Fm', 'G7b9', 'G7b9', 'Cm', 'Cm', 'Db', 'Db', 'Ab', 'Fm', 'G', 'G7b9'],
        'layers': [
            {'type': 'rain', 'vol': 0.035},
            {'type': 'wind', 'vol': 0.2},
            {'type': 'drone', 'oct': 24, 'vol': 0.14},
            {'type': 'chords', 'inst': 'strings', 'oct': 48, 'vol': 0.14, 'hits': [(0, 4)]},
            {'type': 'bass', 'inst': 'cello', 'oct': 36, 'vol': 0.26,
             'pattern': [(k * 0.5, 0.45, o) for k, o in enumerate([0, 0, 12, 0, 0, 0, 12, 7])]},
            {'type': 'drums', 'vols': {'T': 0.45, 't': 0.3, 'h': 0.05},
             'bars': ['T.....T.t...t.t.', 'T.....T.t.t.T...', 'T.....T.t...t.t.', 'T..T..T.t.t.tttt']},
            {'type': 'drums', 'vols': {'l': 0.22}, 'bars': ['l...............', '................', '................', '................']},
            {'type': 'notes', 'inst': 'choir', 'vol': 0.09, 'notes': [
                (32 + b * 4, 4, 60 + chord(c)[0] + i) for b, c in enumerate(['Cm', 'Cm', 'Db', 'Db', 'Ab', 'Fm', 'G', 'G7b9'])
                for i in chord(c)[1][:3]]},
            {'type': 'notes', 'inst': 'brass', 'vol': 0.24, 'notes': [
                (32, 2, 67), (34, 1, 68), (35, 1, 67), (36, 2, 63), (38, 2, 60),
                (40, 3, 65), (43, 1, 68), (44, 4, 68),
                (48, 2, 72), (50, 2, 70), (52, 2, 68), (54, 2, 65),
                (56, 3, 67), (59, 1, 68), (60, 4, 71)]},
            {'type': 'notes', 'inst': 'strings', 'vol': 0.1, 'shift': 12, 'notes': [
                (32, 2, 67), (34, 1, 68), (35, 1, 67), (36, 2, 63), (38, 2, 60),
                (40, 3, 65), (43, 1, 68), (44, 4, 68),
                (48, 2, 72), (50, 2, 70), (52, 2, 68), (54, 2, 65),
                (56, 3, 67), (59, 1, 68), (60, 4, 71)]},
        ],
    },
}


def main(args):
    what = args[0] if args else 'all'
    only = args[1:] if len(args) > 1 else None
    if what in ('all', 'sfx'):
        print('Sound effects:')
        for name, fn in SFX.items():
            if not only or name in only:
                save(name, fade_tail(fn()), '', 5)
    if what in ('all', 'music'):
        print('Music:')
        for name, spec in SONGS.items():
            if not only or name in only:
                save(name, render_song(spec), 'music', 3)


if __name__ == '__main__':
    main(sys.argv[1:])
