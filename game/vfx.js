// =====================================================================
//  VFX — rendered polish on top of the effects: additive glow on cuts and
//  stabs, cinematic encounter and turn banners, and a wipe between hub tabs.
// =====================================================================

// ---- glow under cuts and stabs
{
  const arc0 = FX_DRAW.arc;
  FX_DRAW.arc = (f, k) => {
    const sweep = Math.min(1, k / 0.22), fade = k < 0.22 ? 1 : 1 - (k - 0.22) / 0.78;
    const a1 = f.a0 + (f.a1 - f.a0) * sweep;
    for (let i = 0; i <= 5; i++) {
      const ang = f.a0 + (a1 - f.a0) * (i / 5);
      light(f.x + Math.cos(ang) * f.r * f.dir, f.y + Math.sin(ang) * f.r * (f.sy || 1), f.th * 2.4, f.th * 2.4, f.col, 0.2 * fade, 2);
    }
    arc0(f, k);
  };
  const streak0 = FX_DRAW.streak;
  FX_DRAW.streak = (f, k) => {
    const ext = Math.min(1, k / 0.18), fade = 1 - Math.max(0, (k - 0.18) / 0.82);
    for (let i = 1; i <= 4; i++) {
      const q = ext * i / 4;
      light(f.x0 + (f.x1 - f.x0) * q, f.y0 + (f.y1 - f.y0) * q, f.w * 3, f.w * 2.2, f.col, 0.18 * fade, 2);
    }
    streak0(f, k);
  };
}

// ---- encounter card when a fight starts
FX_DRAW.encounter = (f, k) => {
  const e = k < 0.18 ? easeOut(k / 0.18) : k > 0.82 ? 1 - easeIn((k - 0.82) / 0.18) : 1;
  ctx.globalAlpha = 0.8 * e; rect(-OX, 0, VW, H, '#000'); ctx.globalAlpha = 1;
  rect(-OX, 0, VW, 26 * e, '#000'); rect(-OX, H - 26 * e, VW, 26 * e, '#000');
  // slanted band sweeping in from the right
  const x = -OX - 14 + (1 - e) * (VW + 40);
  lbSkew(x, 68, VW + 28, 40, '#0c0908', null, 14);
  lbSkew(x, 68, VW + 28, 3, LB.red, null, 2);
  lbSkew(x + 14, 105, VW + 28, 3, LB.gold, null, 2);
  lbHatch(-OX, 71, VW, 34, '#ffffff', 0.04 * e);
  if (e > 0.5) {
    ctx.globalAlpha = (e - 0.5) * 2;
    const slide = (1 - e) * 60;
    lbTitle('ENCUENTRO', 34 + slide, 80, 8, LB.gold);
    lbSkew(34 + slide, 86, 30, 9, f.tagCol, null, 3);
    txt(f.tag, 49 + slide, 93, '#ffffff', 8, 'center');
    ctx.font = '16px VT323, monospace';
    for (const [dx, dy] of [[1, 1], [-1, 0]]) txtFit(f.name, 70 + slide + dx, 97 + dy, '#000', 16, 220);
    txtFit(f.name, 70 + slide, 97, '#ffffff', 16, 220);
    ctx.globalAlpha = 1;
  }
};
FX_SCREEN.add('encounter'); FX_TOP.add('encounter');

// ---- turn banner: a gold hairline opens from the centre under the number
FX_DRAW.turnBanner = (f, k) => {
  const e = k < 0.15 ? easeOut(k / 0.15) : k > 0.75 ? 1 - easeIn((k - 0.75) / 0.25) : 1;
  ctx.globalAlpha = 0.5 * e; rect(-OX, 50, VW, 30, '#000'); ctx.globalAlpha = e;
  const w = 150 * e;
  rect(160 - w / 2, 51, w, 1, LB.line); rect(160 - w / 2, 79, w, 1, LB.line);
  rect(160 - w / 4, 79, w / 2, 1, LB.gold);
  lbDiamond(160 - w / 2, 65, 2, LB.gold); lbDiamond(160 + w / 2, 65, 2, LB.gold);
  ctx.save(); ctx.translate(160, 70); ctx.scale(1 + (1 - e) * 0.6, 1);
  lbNum(`TURNO ${f.n}`, 0, 0, LB.goldHi, 20, 'center');
  ctx.restore();
  ctx.globalAlpha = 1;
};
FX_SCREEN.add('turnBanner'); FX_TOP.add('turnBanner');

// Shows the banners for the new turn; returns how long the first one delays it.
function turnBanner() {
  if (CB.instant) return 0;
  const now = performance.now();
  let wait = 0;
  if (CB.turn === 1) {
    wait = 1500;
    const e = CB.enemies[0];
    CB.fx.push({ type: 'encounter', x: 0, y: 0, start: now, ms: wait,
      name: (CB.cfg && CB.cfg.name) || COMBAT_UNITS[e.id.replace(/_\d+$/, '')].name, tag: e.tag || '???', tagCol: e.tagCol || LB.red });
  }
  CB.fx.push({ type: 'turnBanner', x: 0, y: 0, start: now + wait, ms: 1200, n: CB.turn });
  return wait;
}

// ---- hub: a slanted curtain sweeps away when the tab changes
{
  const hub0 = drawHub;
  let last = null, at = 0;
  drawHub = function (t) {
    hub0(t);
    if (G.hubTab !== last) { if (last !== null) at = performance.now(); last = G.hubTab; }
    const k = (performance.now() - at) / 280;
    if (k < 1) {
      const x = -OX - 50 + easeOut(k) * (VW + 110);
      poly([[x, 0], [W + OX, 0], [W + OX, NAV_Y], [x - 40, NAV_Y]], '#0a0808');
      line(x, 0, x - 40, NAV_Y, LB.gold); line(x - 3, 0, x - 43, NAV_Y, LB.red);
    }
  };
}

// ---- K.O. burst: shock rings and rays
FX_DRAW.koBurst = (f, k) => {
  const e = easeOut(Math.min(1, k * 1.4));
  ctx.globalAlpha = 1 - k;
  for (let r = 0; r < 3; r++) ring(Math.round(f.x), Math.round(f.y), Math.round(6 + e * (26 + r * 12)), r ? f.col : '#ffffff', 1);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.2, r0 = 4 + e * 10, r1 = 10 + e * 40;
    line(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0, f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1, i % 2 ? f.col : '#ffffff');
  }
  light(f.x, f.y, 30 * (1 - k) + 6, 30 * (1 - k) + 6, f.col, 0.5 * (1 - k), 3);
  ctx.globalAlpha = 1;
};

// ---- story: background changes get a quick slanted wipe instead of a cut
{
  const handle0 = handle;
  handle = function (st) {
    if (st.bg && G.s.bg && G.s.bg !== st.bg && G.fade < 0.5) G.bgWipe = performance.now();
    return handle0(st);
  };
  const post0 = postFX;
  postFX = function (s, t) {
    post0(s, t);
    const k = G.bgWipe ? (performance.now() - G.bgWipe) / 380 : 1;
    if (k < 1 && G.mode !== 'combat') {
      const x = -OX - 60 + easeOut(k) * (VW + 120);
      poly([[x, 0], [W + OX, 0], [W + OX, H], [x - 50, H]], '#000');
      line(x, 0, x - 50, H, '#c9a35a');
    }
  };
}
