// =====================================================================
//  RENDERER — PixiJS WebGL + offscreen 2D canvas
// =====================================================================
const W = 320, H = 180;
const cv = document.getElementById('cv');

const offCv = document.createElement('canvas');
offCv.width = W;
offCv.height = H;
const ctx = offCv.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, W, H);

const pixiApp = new PIXI.Application({
  view: cv,
  width: 640,
  height: 360,
  backgroundColor: 0x000000,
  antialias: false,
  resolution: 1,
  autoDensity: false,
});

const gameBaseTexture = new PIXI.BaseTexture(offCv, {
  scaleMode: PIXI.SCALE_MODES.NEAREST,
  mipmap: PIXI.MIPMAP_MODES.OFF,
});
const gameTexture = new PIXI.Texture(gameBaseTexture);
const gameSprite = new PIXI.Sprite(gameTexture);
gameSprite.width = 640;
gameSprite.height = 360;
pixiApp.stage.addChild(gameSprite);

function updateGameTexture() { gameBaseTexture.update(); }

pixiApp.ticker.autoStart = false;
pixiApp.ticker.stop();
function pixiRender() { pixiApp.render(); }
