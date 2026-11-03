// =====================================================================
//  RENDERER — Direct Canvas 2D (pixel-perfect, no WebGL)
// =====================================================================
const W = 320, H = 180;
const cv = document.getElementById('cv');
cv.width = W;
cv.height = H;
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
