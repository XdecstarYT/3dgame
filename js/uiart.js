'use strict';

// Generates Minecraft-style pixel-art UI icons (hearts, hunger, dirt bg) as
// data URLs so the HUD matches the look of the real game without external assets.
const UIArt = (() => {
  function render(bitmap, w, h, palette) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = bitmap[y * w + x];
      if (!v) continue;
      ctx.fillStyle = palette[v];
      ctx.fillRect(x, y, 1, 1);
    }
    return c.toDataURL();
  }

  // 9x9 heart
  const HEART = [
    0,1,1,0,0,0,1,1,0,
    1,2,2,1,0,1,2,2,1,
    1,2,2,2,1,2,2,2,1,
    1,2,2,2,2,2,2,2,1,
    1,2,2,2,2,2,2,2,1,
    0,1,2,2,2,2,2,1,0,
    0,0,1,2,2,2,1,0,0,
    0,0,0,1,2,1,0,0,0,
    0,0,0,0,1,0,0,0,0,
  ];
  // add a highlight pixel set (value 3)
  const HEART_HL = HEART.slice();
  HEART_HL[9 * 1 + 1] = 3; HEART_HL[9 * 1 + 2] = 3; HEART_HL[9 * 2 + 1] = 3;

  function heart(kind) {
    const pal = kind === 'empty'
      ? { 1: '#1d1d1d', 2: '#4a4a4a', 3: '#5a5a5a' }
      : { 1: '#4a0606', 2: '#ff2b2b', 3: '#ff6d6d' };
    if (kind === 'half') {
      // left red, right dark
      const bm = HEART_HL.slice();
      const pal2 = { 1: '#4a0606', 2: '#ff2b2b', 3: '#ff6d6d' };
      const c = document.createElement('canvas'); c.width = 9; c.height = 9;
      const ctx = c.getContext('2d');
      for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
        const v = bm[y * 9 + x]; if (!v) continue;
        const left = x <= 4;
        ctx.fillStyle = left ? pal2[v] : ({ 1: '#1d1d1d', 2: '#4a4a4a', 3: '#5a5a5a' })[v];
        ctx.fillRect(x, y, 1, 1);
      }
      return c.toDataURL();
    }
    return render(HEART_HL, 9, 9, pal);
  }

  // 9x9 drumstick
  const FOOD = [
    0,0,0,0,0,0,1,1,0,
    0,0,0,0,0,1,3,3,1,
    0,0,0,0,1,3,3,3,1,
    0,0,0,1,3,2,2,3,1,
    0,0,1,3,2,2,2,1,0,
    0,1,3,2,2,2,1,0,0,
    1,4,3,2,2,1,0,0,0,
    1,4,4,1,1,0,0,0,0,
    0,1,1,0,0,0,0,0,0,
  ];
  function food(kind) {
    const pal = kind === 'empty'
      ? { 1: '#1d1d1d', 2: '#3a3a3a', 3: '#4a4a4a', 4: '#5a5a5a' }
      : { 1: '#2a1a0a', 2: '#8a4f22', 3: '#b5733a', 4: '#ede3c8' };
    if (kind === 'half') {
      const c = document.createElement('canvas'); c.width = 9; c.height = 9;
      const ctx = c.getContext('2d');
      const full = { 1: '#2a1a0a', 2: '#8a4f22', 3: '#b5733a', 4: '#ede3c8' };
      const dark = { 1: '#1d1d1d', 2: '#3a3a3a', 3: '#4a4a4a', 4: '#5a5a5a' };
      for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
        const v = FOOD[y * 9 + x]; if (!v) continue;
        ctx.fillStyle = (x >= 4 ? full : dark)[v];
        ctx.fillRect(x, y, 1, 1);
      }
      return c.toDataURL();
    }
    return render(FOOD, 9, 9, pal);
  }

  // 16x16 dirt tile for the title/menu background
  function dirt() {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const ctx = c.getContext('2d');
    let s = 1234;
    const rnd = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff); };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = (rnd() - 0.5) * 26;
      ctx.fillStyle = `rgb(${134 + v | 0},${96 + v | 0},${67 + v | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
    return c.toDataURL();
  }

  let cache = null;
  function get() {
    if (cache) return cache;
    cache = {
      heartFull: heart('full'), heartHalf: heart('half'), heartEmpty: heart('empty'),
      foodFull: food('full'), foodHalf: food('half'), foodEmpty: food('empty'),
      dirt: dirt(),
    };
    return cache;
  }

  // Inject CSS using the generated art (called once on load)
  function injectCss() {
    const a = get();
    const css = `
      .heart{background-image:url(${a.heartEmpty});}
      .heart.full{background-image:url(${a.heartFull});}
      .heart.half{background-image:url(${a.heartHalf});}
      .hunger-icon{background-image:url(${a.foodEmpty});}
      .hunger-icon.full{background-image:url(${a.foodFull});}
      .hunger-icon.half{background-image:url(${a.foodHalf});}
      #overlay, #pause-menu, #death-screen, #loading{
        background-image:url(${a.dirt}); background-size:64px 64px; image-rendering:pixelated;
      }
      #overlay::before,#pause-menu::before,#death-screen::before,#loading::before{
        content:'';position:absolute;inset:0;background:rgba(0,0,0,0.55);z-index:-1;
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  return { get, injectCss };
})();
