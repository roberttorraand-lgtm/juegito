// =====================================================================
//  THEME — Limbus Company-style interface layer.
//
//  Dark, warm panels with thin gold hairlines, slanted shapes, corner
//  brackets and red accents. The functions below replace the plain
//  versions defined in hub.js / combat.js (same names, same hit areas),
//  so every screen picks the style up. Characters are not touched.
// =====================================================================

const LB = {
  ink: '#0a0908', panel: '#141110', panel2: '#1d1816', line: '#4e3f2d', gold: '#c9a35a', goldHi: '#f1d79a',
  red: '#a8182a', redHi: '#e8364a', text: '#ece4d2', mute: '#8c8070', dim: '#4a4038',
};

// ---------------------------------------------------------------------
//  Kit
// ---------------------------------------------------------------------
// parallelogram leaning right by `sk` pixels
function lbSkew(x, y, w, h, fill, stroke, sk = 4) {
  const P = [[x + sk, y], [x + w, y], [x + w - sk, y + h], [x, y + h]];
  if (fill) poly(P, fill);
  if (stroke) for (let i = 0; i < 4; i++) line(...P[i], ...P[(i + 1) % 4], stroke);
}
// gold corner brackets
function lbCorners(x, y, w, h, col = LB.gold, n = 5) {
  rect(x, y, n, 1, col); rect(x, y, 1, n, col);
  rect(x + w - n, y, n, 1, col); rect(x + w - 1, y, 1, n, col);
  rect(x, y + h - 1, n, 1, col); rect(x, y + h - n, 1, n, col);
  rect(x + w - n, y + h - 1, n, 1, col); rect(x + w - 1, y + h - n, 1, n, col);
}
// faint diagonal hatching
function lbHatch(x, y, w, h, col = '#ffffff', a = 0.035, step = 4) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.globalAlpha = a;
  for (let i = -h; i < w; i += step) line(x + i, y + h, x + i + h, y, col);
  ctx.restore();
}
function lbDiamond(x, y, r, col) { poly([[x, y - r], [x + r, y], [x, y + r], [x - r, y]], col); }
// panel: dark body, hairline, one cut corner and a gold accent tick
function lbPanel(x, y, w, h, o = {}) {
  const c = o.cut ?? 6;
  poly([[x, y], [x + w - c, y], [x + w, y + c], [x + w, y + h], [x, y + h]], o.fill || LB.panel);
  if (o.hatch !== false) lbHatch(x, y, w, h);
  const s = o.stroke || LB.line;
  line(x, y, x + w - c, y, s); line(x + w - c, y, x + w, y + c, s); line(x + w, y + c, x + w, y + h, s);
  line(x, y + h, x + w, y + h, s); line(x, y, x, y + h, s);
  rect(x, y, Math.min(18, w / 4), 1, o.accent || LB.gold);
}
// section title with spaced letters and an underline ending in a diamond
function lbTitle(s, x, y, size = 10, col = LB.text, w = 0) {
  ctx.font = `${size}px VT323, monospace`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1);
  ctx.fillStyle = col; ctx.fillText(s, x, y);
  const tw = ctx.measureText(s).width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  if (w) { rect(x, y + 3, w, 1, LB.line); rect(x, y + 3, Math.min(w, tw + 4), 1, LB.gold); lbDiamond(x + w, y + 3, 2, LB.gold); }
}
// bar with notches every `seg` units (Limbus HP bars)
function lbBar(x, y, w, h, v, max, col, back = '#2a1416', seg = 10) {
  rect(x - 1, y - 1, w + 2, h + 2, '#000');
  rect(x, y, w, h, back);
  rect(x, y, Math.round(w * Math.max(0, v) / max), h, col);
  rect(x, y, Math.round(w * Math.max(0, v) / max), 1, 'rgba(255,255,255,0.35)');
  for (let k = seg; k < max; k += seg) rect(x + Math.round(w * k / max), y, 1, h, 'rgba(0,0,0,0.55)');
}
// outlined number
function lbNum(s, x, y, col, size = 10, align = 'left') {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) txt(s, x + dx, y + dy, '#000', size, align);
  txt(s, x, y, col, size, align);
}

// ---------------------------------------------------------------------
//  Hub
// ---------------------------------------------------------------------
metalRect = function (x, y, w, h) {
  poly([[x, y], [x + w - 4, y], [x + w, y + 4], [x + w, y + h], [x, y + h]], LB.panel2);
  lbHatch(x, y, w, h);
  line(x, y, x + w - 4, y, LB.line); line(x + w - 4, y, x + w, y + 4, LB.line);
  line(x + w, y + 4, x + w, y + h, '#2a221a'); line(x, y + h, x + w, y + h, '#2a221a'); line(x, y, x, y + h, LB.line);
  rect(x, y, 8, 1, LB.gold);
};
metalFrame = function (x, y, w, h) {
  rect(x, y, w, 1, LB.line); rect(x, y + h - 1, w, 1, LB.line);
  rect(x, y, 1, h, LB.line); rect(x + w - 1, y, 1, h, LB.line);
  lbCorners(x - 1, y - 1, w + 2, h + 2, LB.gold, 7);
  // header strip with a red tick, like Limbus' menu frames
  rect(x + 1, y + 1, w - 2, 1, '#2a2018');
  rect(x + 10, y - 1, 24, 2, LB.red);
};

drawNavBar = function (t) {
  rect(-OX, NAV_Y, VW, NAV_H, '#0c0a09');
  lbHatch(-OX, NAV_Y, VW, NAV_H, '#ffffff', 0.03);
  rect(-OX, NAV_Y, VW, 1, LB.line);
  rect(-OX, NAV_Y + 1, VW, 1, '#000');
  HUB_NAV.forEach((nav, i) => {
    const { x: bx, w: bw } = getNavBtnBounds()[i];
    const sel = G.hubNavSel === i, active = G.hubTab === nav.id || (G.hubTab === 'pecadores' && nav.id === 'pecadores');
    const locked = nav.lock && !unlocked(nav.lock);
    const y = NAV_Y + 4, h = 13;
    if (active) {
      lbSkew(bx, y, bw, h, LB.red, LB.redHi, 4);
      lbHatch(bx, y, bw, h, '#ffffff', 0.06);
    } else lbSkew(bx, y, bw, h, sel ? '#2a1a16' : '#16120f', sel ? LB.gold : LB.line, 4);
    if (sel && !active) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t / 200); rect(bx + 4, y + h, bw - 8, 1, LB.gold); ctx.globalAlpha = 1; }
    const col = locked ? '#4a4038' : active ? '#ffffff' : sel ? LB.goldHi : LB.mute;
    if (locked) {
      const lx = bx + 7, ly = y + 3;
      rect(lx + 1, ly, 3, 1, col); rect(lx, ly + 1, 1, 3, col); rect(lx + 4, ly + 1, 1, 3, col);
      rect(lx - 1, ly + 4, 7, 5, col);
    } else txt(nav.icon, bx + 9, y + 10, col, 10, 'center');
    txt(nav.label, bx + 16, y + 10, col, 8);
  });
};

// ---------------------------------------------------------------------
//  Combat HUD
// ---------------------------------------------------------------------
topBar = function () {
  lbSkew(1, 3, 52, 12, '#0c0a09', LB.line, 4);
  rect(5, 3, 12, 1, LB.red);
  lbNum(`TURNO ${CB.turn}`, 27, 12, LB.goldHi, 9, 'center');
  if (CB.phase !== 'select') return;
  const x = W + OX - 16, hv = hitArea(x, 3, 13, 12, () => { CB.help = !CB.help; SFX.play('select'); });
  lbSkew(x, 3, 13, 12, hv || CB.help ? LB.red : '#0c0a09', LB.line, 3);
  txt('?', x + 6.5, 12, LB.goldHi, 9, 'center');
};

allyPlate = function (u, t) {
  const a = G.actors[u.id];
  if (!a) return;
  const x = Math.round(a.x), y = u.by + 3;
  const low = u.hp / u.maxHp < 0.3;
  lbBar(x - 15, y + 1, 30, 3, u.hp, u.maxHp, low ? (Math.floor(t / 300) % 2 ? '#e03040' : '#a01828') : '#d8443a', '#2a1416', 10);
  lbBar(x - 15, y + 6, 30, 1, u.staggered ? 0 : u.st, u.maxSt, '#e8c040', '#2a2410', 99);
  lbNum(String(u.hp), x - 18, y + 7, low ? '#ff6a6a' : LB.text, 10, 'right');
  if (u.gun) ammoBadge(x + 18, y + 14, u.ammo);
  if (u.staggered) lbNum(`ATURD. ${u.staggerTurns - 1}T`, x + 18, y + 7, Math.floor(t / 400) % 2 ? '#ff4a5a' : '#8a2030', 8);
  else txt(`${u.st}`, x + 18, y + 8, '#e8c040', 8);
  shieldBar(x - 15, y - 3, u.shield);
};

enemyPlate = function (u, t) {
  if (CB.enemies.length > 1) return enemyMiniPlate(u, t);
  const x0 = 196, y0 = 106, w = 112;
  lbSkew(x0, y0, w, 18, 'rgba(10,8,8,0.88)', LB.line, 5);
  lbSkew(x0 + 4, y0 + 2, 26, 7, u.tagCol, null, 3);
  txt(u.tag, x0 + 17, y0 + 8, '#ffffff', 7, 'center');
  txtFit(u.name, x0 + 33, y0 + 8, LB.text, 7, w - 38);
  lbBar(x0 + 6, y0 + 11, 74, 3, u.hp, u.maxHp, '#d8443a', '#2a1416', 10);
  lbBar(x0 + 6, y0 + 15, 74, 1, u.staggered ? 0 : u.st, u.maxSt, '#e8c040', '#2a2410', 99);
  lbNum(String(u.hp), x0 + w - 6, y0 + 16, LB.text, 10, 'right');
  txt(u.staggered ? `${u.staggerTurns - 1}T` : `${u.st}`, x0 + 84, y0 + 17, u.staggered ? '#ff4a5a' : '#e8c040', 7);
  if (u.staggered && Math.floor(t / 400) % 2) lbNum('ATURDIDO', x0 + w / 2, y0 - 3, '#ff4a5a', 9, 'center');
  else if (u.rebooting && Math.floor(t / 400) % 2) lbNum('REINICIANDO · DAÑO x1.5', x0 + w / 2, y0 - 3, '#9ac0ff', 8, 'center');
  shieldBar(x0 + 6, y0 - 5, u.shield);
};

// skill card in hand: tier band, name, coins and power, Light cost in a gold diamond
drawHandCard = function (r, hv, d) {
  const pg = r.card.page, tier = TIER[pg.tier];
  const holder = diceOf(d.unit).find(x => x.card === r.card);
  const on = holder === d, elsewhere = holder && holder !== d;
  hitArea(r.x, r.y, r.w, r.h, () => toggleCard(r.card), { page: pg });
  const x = r.x, w = r.w, h = r.h, y = r.y - (hv ? 4 : 0) - (on || elsewhere ? 2 : 0);
  const main = DIE[pg.dice[0][0]].col;
  poly([[x, y], [x + w - 5, y], [x + w, y + 5], [x + w, y + h], [x, y + h]], '#100d0c');
  lbHatch(x, y, w, h, main, 0.05, 3);
  // colour band by the main die, darker toward the bottom
  rect(x + 1, y + 1, w - 2, 10, main); ctx.globalAlpha = 0.45; rect(x + 1, y + 6, w - 2, 5, '#000'); ctx.globalAlpha = 1;
  const edge = on ? LB.goldHi : elsewhere ? '#a08040' : hv ? LB.gold : LB.line;
  line(x, y, x + w - 5, y, edge); line(x + w - 5, y, x + w, y + 5, edge); line(x + w, y + 5, x + w, y + h, edge);
  line(x, y + h, x + w, y + h, edge); line(x, y, x, y + h, edge);
  if (on) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 160); line(x - 1, y - 1, x + w - 5, y - 1, LB.goldHi); ctx.globalAlpha = 1; }
  // name
  // as many name lines as the coins leave room for
  const room = Math.max(1, Math.floor((h - 14 - pg.dice.length * 7) / 7));
  const lines = wrap(pg.name, w - 6, 8);
  if (lines.length > room) { const ln = lines.slice(0, room); ln[room - 1] = lines.slice(room - 1).join(' '); lines.length = 0; lines.push(...ln); }
  lines.forEach((ln, k) => {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) txtFit(ln, x + 3 + dx, y + 19 + k * 7 + dy, '#000', 8, w - 6);
    txtFit(ln, x + 3, y + 19 + k * 7, LB.text, 8, w - 6);
  });
  // tier tag
  const lbl = pg.ego ? 'EGO' : tier.label;
  lbSkew(x + w - lbl.length * 4 - 9, y + 2, lbl.length * 4 + 7, 7, '#0c0a09', null, 2);
  txt(lbl, x + w - 6 - lbl.length * 2, y + 8, pg.ego ? egoCol(pg.ego) : tier.col, 7, 'center');
  // Light cost
  const afford = holder || canAfford(d, r.card);
  lbDiamond(x + 6, y + 6, 5, afford ? LB.goldHi : '#5a5040');
  lbDiamond(x + 6, y + 6, 4, afford ? '#ffe08a' : '#3a3428');
  txt(String(costOf(pg)), x + 6.5, y + 9, '#2a1a00', 8, 'center');
  // coins: one per die, coloured by type, with the range
  pg.dice.forEach((die, k) => {
    const [ty, a, b] = die;
    const ry = y + h - 7 - (pg.dice.length - 1 - k) * 7;
    disc(x + 5, ry - 1, 3, '#000'); disc(x + 5, ry - 1, 2, DIE[ty].col);
    txt(`${a}-${b}`, x + 10, ry + 2, '#d8d0c0', 7);
    if (isGun(die)) { rect(x + w - 6, ry - 3, 2, 4, d.unit.ammo ? '#e8c060' : '#6a6070'); rect(x + w - 6, ry - 4, 2, 1, '#b08030'); }
  });
  if (!afford || elsewhere) { ctx.globalAlpha = 0.6; rect(x, y, w + 1, h + 1, '#000'); ctx.globalAlpha = 1; }
  if (elsewhere) { lbSkew(x + 2, y + h / 2 - 5, w - 4, 9, '#2a2010', LB.gold, 2); txt('EN USO', x + w / 2, y + h / 2 + 2, LB.goldHi, 8, 'center'); }
};

// clash panel: two skill banners facing each other with their coins
pageCard = function (s, x, y, w, enemyTeam) {
  const tc = enemyTeam ? '#ff6a78' : LB.goldHi;
  const accent = enemyTeam ? LB.red : LB.gold;
  lbPanel(x, y, w, 48, { accent, fill: '#120f0e' });
  txtFit(s.unit.name, x + 5, y + 9, tc, 7, s.unit.shield ? w - 48 : w - 10);
  if (s.unit.shield) txt(`ESCUDO ${s.unit.shield}`, x + w - 5, y + 9, '#9ac0ff', 7, 'right');
  if (!s.page) { lbNum('Sin defensa', x + 5, y + 26, '#8a8090', 10); return; }
  lbNum(s.page.name, x + 5, y + 20, LB.text, 9);
  s.page.dice.forEach(([ty, a, b], k) => {
    const cx = x + 12 + k * 22, cy = y + 34;
    const cur = k === s.i, done = k < s.i;
    // the coin
    disc(cx, cy, 8, done ? '#1a1614' : '#000');
    disc(cx, cy, 7, done ? '#24201c' : cur ? DIE[ty].col : '#3a3028');
    disc(cx, cy, 5, done ? '#1a1614' : '#120f0e');
    dieIcon(ty, cx - 2, cy - 2, done ? '#3a3430' : cur ? '#ffffff' : DIE[ty].col);
    if (done) { line(cx - 5, cy - 5, cx + 5, cy + 5, '#5a2a2a'); }
    if (cur) { ctx.globalAlpha = 0.4 + 0.3 * Math.sin(performance.now() / 120); disc(cx, cy, 10, DIE[ty].col); ctx.globalAlpha = 1; disc(cx, cy, 7, DIE[ty].col); disc(cx, cy, 5, '#120f0e'); dieIcon(ty, cx - 2, cy - 2, '#ffffff'); }
    txt(`${a}-${b}`, cx, cy + 14, done ? '#3a3430' : LB.mute, 7, 'center');
  });
  // the roll, big, like Limbus' clash power
  if (s.roll != null) {
    const px0 = enemyTeam ? x + w - 22 : x + w - 22;
    lbNum(String(s.roll), px0, y + 38, '#ffffff', 22, 'center');
  }
};

clashPanel = function () {
  const py = 124;
  rect(-OX, py, VW, H - py, '#0a0808');
  lbHatch(-OX, py, VW, H - py, '#ffffff', 0.025);
  rect(-OX, py, VW, 1, LB.line);
  const v = CB.view;
  if (!v) return;
  pageCard(v.left, 6, 128, 138, false);
  pageCard(v.right, 176, 128, 138, true);
  lbDiamond(160, 152, 11, LB.red); lbDiamond(160, 152, 9, '#0a0808');
  lbNum('VS', 160, 156, LB.goldHi, 11, 'center');
};

smallBtn = function (x, y, w, h, label, fn) {
  const hv = hitArea(x, y, w, h, fn);
  lbSkew(x, y, w, h, hv ? LB.red : '#16120f', hv ? LB.redHi : LB.line, 3);
  txt(label, x + w / 2, y + h - 3, hv ? '#fff' : LB.text, 8, 'center');
};

// ---------------------------------------------------------------------
//  Skill name banner: shows which page is being used, like Limbus
// ---------------------------------------------------------------------
FX_DRAW.skillName = (f, k) => {
  const inK = Math.min(1, k / 0.12), outK = k > 0.85 ? (1 - k) / 0.15 : 1;
  const left = f.side === 'L';
  const w = 120, h = 16, y = f.y;
  const x = left ? -OX - w + (w + OX + 6) * easeOut(inK) : W + OX - (w + OX + 6) * easeOut(inK);
  ctx.globalAlpha = outK;
  lbSkew(x, y, w, h, 'rgba(8,6,6,0.92)', f.col, 5);
  rect(left ? x + 5 : x + w - 25, y, 20, 2, f.col);
  txtFit(f.name, x + 10, y + 11, '#ffffff', 9, w - 50);
  f.dice.forEach((ty, i) => { const cx = x + w - 12 - (f.dice.length - 1 - i) * 7; disc(cx, y + 8, 3, '#000'); disc(cx, y + 8, 2, DIE[ty].col); });
  ctx.globalAlpha = 1;
};
FX_SCREEN.add('skillName');
function skillBanner(u, page, row = 0) {
  if (!page || CB.instant) return;
  const ally = u.team === 'ally';
  fx('skillName', 0, 0, 1400, { side: ally ? 'L' : 'R', y: 22 + row * 18, name: page.name, col: page.ego ? egoCol(page.ego) : ally ? LB.gold : LB.redHi, dice: page.dice.map(d => d[0]) });
}

// coin toss over a unit's head when a die is rolled
FX_DRAW.coinToss = (f, k) => {
  const up = Math.sin(Math.min(1, k * 1.2) * Math.PI) * 14;
  const squash = Math.abs(Math.cos(k * Math.PI * 7));
  const y = f.y - 8 - up;
  ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
  ctx.save(); ctx.translate(f.x, y); ctx.scale(1, Math.max(0.15, squash));
  disc(0, 0, 4, '#000'); disc(0, 0, 3, LB.goldHi); disc(0, 0, 2, f.col); px(-1, -1, '#ffffff');
  ctx.restore();
  ctx.globalAlpha = 1;
};

enemyMiniPlate = function (u, t) {
  const a = G.actors[u.id];
  if (!a) return;
  const x = Math.round(a.x), y = u.by + 3;
  lbSkew(x - 19, y, 38, 10, 'rgba(10,8,8,0.85)', LB.line, 3);
  lbBar(x - 15, y + 2, 30, 3, u.hp, u.maxHp, '#d8443a', '#2a1416', 10);
  lbBar(x - 15, y + 7, 30, 1, u.staggered ? 0 : u.st, u.maxSt, '#e8c040', '#2a2410', 99);
  lbNum(String(u.hp), x + 21, y + 8, LB.text, 9);
  txt(u.staggered ? 'ATURD.' : `${u.st}`, x - 21, y + 9, u.staggered ? '#ff4a5a' : '#e8c040', 7, 'right');
  shieldBar(x - 15, y - 4, u.shield);
};
