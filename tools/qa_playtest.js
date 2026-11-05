// Automated playtest of the whole game (hub, settings, map, every scene, every
// combat, keyboard and touch). Serve game/ first:
//   cd game && python3 -m http.server 8765
// then:  node tools/qa_playtest.js <screenshot-dir> [desktop|mobile]
// Needs Playwright with Chromium. Prints every problem it finds.
// Full QA pass: drives every part of the game and reports problems.
const { chromium, devices } = require('playwright');
const OUT = process.argv[2];
const MODE = process.argv[3] || 'desktop';
const issues = [];
const note = (m) => { issues.push(m); console.log('ISSUE:', m); };
(async () => {
  const b = await chromium.launch();
  const ctx = MODE === 'mobile'
    ? await b.newContext({ ...devices['Pixel 7 landscape'] })
    : await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => note('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') note('console.' + m.type() + ': ' + m.text()); });
  p.on('response', r => { if (r.status() >= 400) note('HTTP ' + r.status() + ' ' + r.url()); });
  p.on('requestfailed', r => note('requestfailed ' + r.url()));
  await p.goto('http://localhost:8765/?v=' + Date.now());
  await p.waitForTimeout(1000);
  const ev = (f, a) => p.evaluate(f, a);
  const W = async (ms) => p.waitForTimeout(ms);
  const shot = (n) => p.screenshot({ path: `${OUT}/qa_${MODE}_${n}.png` });
  const toPx = async (lx, ly) => ev(([lx, ly]) => {
    const r = cv.getBoundingClientRect();
    return [r.left + (FRAME.x + (lx + OX) / VW * FRAME.w) / cv.width * r.width, r.top + (FRAME.y + ly / H * FRAME.h) / cv.height * r.height];
  }, [lx, ly]);
  const tap = async (lx, ly) => { const [x, y] = await toPx(lx, ly); if (MODE === 'mobile') await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); await W(250); };
  const sweep = async () => { for (let i = 0; i < 30; i++) { const [x, y] = await toPx(-10 + (i * 37) % 340, 8 + (i * 53) % 170); await p.mouse.move(x, y); await W(15); } };
  await ev(() => localStorage.clear());
  await p.reload(); await W(900);

  // ---------- hub + nav + keyboard ----------
  await tap(160, 170); // first interaction
  for (const id of ['ventana', 'mapa', 'ventana']) { await ev(id => activateNavBtn(id), id); await W(200); }
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'Enter', 'Escape', 'Tab']) { await p.keyboard.press(k); await W(120); }
  await sweep();
  await shot('hub');

  // ---------- settings: every tab and control ----------
  await ev(() => showSettings()); await W(300);
  const tabs = await ev(() => [...document.querySelectorAll('#settings [data-stab]')].map(b => b.dataset.stab));
  for (const tab of tabs) {
    await p.click(`#settings [data-stab="${tab}"]`); await W(150);
    const ctrls = await ev((tab) => [...document.querySelectorAll(`#settings [data-panel="${tab}"] [data-cfg], #settings [data-panel="${tab}"] [data-cfg-chip], #settings [data-panel="${tab}"] [data-speed], #settings [data-panel="${tab}"] [data-toggle], #settings [data-panel="${tab}"] [data-quality], #settings [data-panel="${tab}"] button`)].length, tab);
    for (let i = 0; i < ctrls; i++) {
      const el = (await p.$$(`#settings [data-panel="${tab}"] [data-cfg], #settings [data-panel="${tab}"] [data-cfg-chip], #settings [data-panel="${tab}"] [data-speed], #settings [data-panel="${tab}"] [data-toggle], #settings [data-panel="${tab}"] [data-quality], #settings [data-panel="${tab}"] button`))[i];
      if (!el) continue;
      if (!(await el.isVisible())) continue;
      await el.click().catch(e => note('click fail ' + tab + ' #' + i + ' ' + e.message.split('\n')[0]));
      await W(80);
    }
    for (const sl of await p.$$(`#settings [data-panel="${tab}"] [data-slider]`)) {
      const bb = await sl.boundingBox(); if (!bb) continue;
      await p.mouse.click(bb.x + bb.width * 0.3, bb.y + bb.height / 2); await W(60);
      await p.mouse.move(bb.x + bb.width * 0.7, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.9, bb.y + bb.height / 2, { steps: 4 }); await p.mouse.up();
    }
    await shot('settings_' + tab);
  }
  const cfg1 = await ev(() => JSON.stringify(CFG));
  await p.reload(); await W(900);
  const cfg2 = await ev(() => JSON.stringify(CFG));
  if (cfg1 !== cfg2) note('settings not persisted after reload: ' + cfg1 + ' vs ' + cfg2);
  // presets + display modes
  for (const q of ['baja', 'media', 'alta', 'ultra']) {
    await ev(q => { CFG.applyQuality(q); }, q);
    for (const [fill, integer] of [[false, false], [false, true], [true, false]]) {
      await ev(([f, i]) => { CFG.fill = f; CFG.integer = i; resizeCanvas(); }, [fill, integer]);
      await W(80);
    }
  }
  await ev(() => { CFG.reset ? CFG.reset() : null; resizeCanvas(); });
  if (MODE === 'desktop') { await p.setViewportSize({ width: 900, height: 900 }); await W(200); await p.setViewportSize({ width: 1920, height: 1080 }); await W(200); await p.setViewportSize({ width: 1280, height: 720 }); await W(200); }

  // ---------- map: district -> chapter -> episodes ----------
  await ev(() => { if (G.hubView === 'settings') hideSettings(); activateNavBtn('mapa'); }); await W(200);
  await tap(104, 132); // chapter node
  if (!(await ev(() => G.chapter === 1))) note('chapter did not open by tapping its node');
  await tap(156, 66); // ep2 (locked): should not start anything
  if (await ev(() => G.hubView === 'confirm')) note('locked episode 2 opened a confirm');
  if (MODE === 'mobile') { await tap(104, 112); }
  await tap(104, 112); // ep1 -> confirm
  if (!(await ev(() => G.hubView === 'confirm' && G.pendingScene && G.pendingScene.id === 'ep1_s1'))) note('episode 1 did not open the confirm for scene 1');
  await shot('confirm');
  await p.keyboard.press('Escape'); await W(200);
  if (!(await ev(() => G.hubView === 'main' && G.chapter === 1))) note('Escape from confirm did not return to the chapter map: ' + (await ev(() => G.hubView + ' ' + G.chapter)));
  await tap(30, 11); // back button area '‹ VOLVER' at (mx+2,my+1)
  await tap(90, 12);
  // ---------- story: play every scene through, normally and with skip ----------
  const playScene = async (id, skip) => {
    await ev((id) => startScene(SCENES.find(s => s.id === id)), id);
    const t0 = Date.now();
    if (skip) await p.keyboard.down('Control');
    let lastIdx = -1, stuck = 0;
    while (Date.now() - t0 < 240000) {
      const st = await ev(() => ({ mode: G.mode, w: G.waiting, idx: G.idx, sc: G.scene && G.scene.id }));
      if (st.mode === 'hub') break;
      if (st.mode === 'end' && st.w === 'card') { await shot('end_' + id); await p.keyboard.press('Enter'); await W(300); const s2 = await ev(() => ({ mode: G.mode, sc: G.scene && G.scene.id })); if (s2.mode !== 'end' && s2.sc !== id) { if (skip) await p.keyboard.up('Control'); return s2; } continue; }
      if (st.idx === lastIdx) { if (++stuck > 120) { note(`scene ${id} stuck at step ${st.idx} waiting=${st.w}`); break; } } else { stuck = 0; lastIdx = st.idx; }
      if (st.w === 'text' || st.w === 'card') { if (MODE === 'mobile') await tap(160, 90); else await p.keyboard.press('Enter'); }
      await W(skip ? 40 : 110);
    }
    if (skip) await p.keyboard.up('Control');
    return ev(() => ({ mode: G.mode, sc: G.scene && G.scene.id }));
  };
  let r = await playScene('ep1_s1', false);
  if (!(r.sc === 'ep1_s2')) note('after ep1_s1 the next scene did not start automatically: ' + JSON.stringify(r));
  r = await playScene('ep1_s2', true);
  if (r.mode !== 'hub') note('after ep1_s2 (end of episode 1) did not return to hub: ' + JSON.stringify(r));
  const unlocked = await ev(() => episodeOpen(EPISODES[1]));
  if (!unlocked) note('episode 2 not unlocked after finishing episode 1');
  r = await playScene('ep2_s1', false);
  r = await playScene('ep2_s1', true); // replay with skip
  // replay check: actors start where the script says
  await ev(() => startScene(SCENES.find(s => s.id === 'ep2_s1')));
  await W(400); await p.keyboard.press('Enter'); await W(1200);
  const pos = await ev(() => G.actors.lobelto && G.actors.lobelto.x);
  if (!(pos >= 70 && pos <= 150)) note('replay: Lobelto starts at x=' + pos + ' (expected 70 or walking to 150)');
  await p.keyboard.press('Escape'); await W(300);
  if (!(await ev(() => G.mode === 'hub'))) note('Escape mid-scene did not return to hub');
  // mid-scene escape should leave no dark layer / text box
  if (await ev(() => !document.getElementById('box').classList.contains('hidden'))) note('text box still visible in hub after Escape');

  // ---------- combat: full games against every enemy, UI driven ----------
  for (const en of ['corrupted', 'machine', 'operator']) {
    await ev(en => startCombatTest(en), en);
    await W(700);
    let turns = 0;
    while (turns < 25) {
      const ph = await ev(() => CB.phase);
      if (ph === 'done') break;
      if (ph !== 'select') { await W(200); continue; }
      turns++;
      await sweep();
      // play like a person: defense sometimes, then the best affordable pages, then a target
      await ev((turn) => {
        for (const u of CB.allies.filter(canAct)) {
          if (turn % 3 === 0) defenseButton(u);
          for (const d of diceOf(u)) {
            if (d.card) continue;
            CB.sel = d;
            const card = [...u.hand].sort((a, b) => costOf(b.page) - costOf(a.page)).find(c => canAfford(d, c) && !diceOf(u).some(x => x.card === c));
            if (card) toggleCard(card);
          }
        }
        const foes = enemyDice().filter(e => canAct(e.unit));
        allyDice().forEach((d, i) => { if (d.page && foes.length) { CB.sel = d; targetDie(foes[i % foes.length]); } });
      }, turns);
      // sanity: no negative light, hand within limits
      const bad = await ev(() => CB.allies.filter(u => u.light < 0 || u.hand.length > HAND_MAX || u.light > u.maxLight).map(u => `${u.id} light=${u.light}/${u.maxLight} hand=${u.hand.length}`));
      if (bad.length) note(`${en} turn ${turns}: bad state ${bad.join(', ')}`);
      if (turns === 2) await shot('combat_select_' + en);
      if (MODE === 'mobile') { await tap(270, 152); } else await p.keyboard.press('Enter');
      await W(400);
      if ((await ev(() => CB.phase)) === 'select' && turns > 0) {
        // Enter/tap did not start the turn: start it directly
        await ev(() => combatExecute());
      }
      const t0 = Date.now();
      while ((await ev(() => CB.phase)) === 'resolve' && Date.now() - t0 < 90000) await W(250);
      if ((await ev(() => CB.phase)) === 'resolve') { note(`${en}: turn ${turns} resolve did not finish in 90s`); break; }
      const st = await ev(() => ({ cam: CB.cam, hp: CB.all.map(u => u.hp) }));
      if (st.cam.z !== 1 || st.cam.x !== 160 || st.cam.y !== 100) note(`${en} turn ${turns}: camera not back home ${JSON.stringify(st.cam)}`);
      if (st.hp.some(h => h < 0 || Number.isNaN(h))) note(`${en}: bad hp ${st.hp}`);
    }
    const res = await ev(() => ({ phase: CB.phase, won: CB.enemies.every(u => !alive(u)), hp: CB.all.map(u => u.id + ':' + u.hp) }));
    console.log(en, JSON.stringify(res), 'turns', turns);
    if (res.phase !== 'done') note(`${en}: combat not finished after ${turns} turns ${JSON.stringify(res)}`);
    await shot('combat_end_' + en);
    // retry immediately (KO animation may still be running), then exit
    const retry = await p.$('[data-act="combat-retry"]');
    if (retry) { await retry.click(); await W(1800); const ok = await ev(() => Object.keys(G.actors).length); if (ok < 3) note(`${en}: after quick retry only ${ok} actors on stage`); }
    await ev(() => endCombat()); await W(300);
  }
  // escape during combat select returns to hub
  await ev(() => startCombatTest('machine')); await W(500);
  await p.keyboard.press('Escape'); await W(300);
  if (!(await ev(() => G.mode === 'hub'))) note('Escape in combat select did not return to hub');

  // ---------- perf ----------
  await ev(() => { CFG.applyQuality && CFG.applyQuality('ultra'); resizeCanvas(); startCombatTest('operator'); });
  const fps = await ev(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
  console.log('fps (ultra, headless):', fps);
  await ev(() => { CFG.reset && CFG.reset(); resizeCanvas(); endCombat(); });

  console.log('\n==== ' + issues.length + ' issues (' + MODE + ') ====');
  for (const i of [...new Set(issues)]) console.log(' -', i);
  await b.close();
})();
