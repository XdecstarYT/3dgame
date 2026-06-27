'use strict';

// Procedural texture atlas drawn to closely resemble Minecraft's 16x16 block art.
const TextureAtlas = (() => {
  const TILE = 16;
  const COLS = 8;
  const TOTAL_TILES = 51;
  const ROWS = Math.ceil(TOTAL_TILES / COLS);
  const ATLAS_W = TILE * COLS;
  const ATLAS_H = TILE * ROWS;

  function seededRng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xFFFFFFFF; };
  }
  const ri = (rng, a, b) => Math.floor(rng() * (b - a + 1)) + a;
  const nv = (rng, base, range) => Math.max(0, Math.min(255, base + Math.floor((rng() - 0.5) * 2 * range)));

  function drawTile(ctx, tileIdx, fn) {
    const ox = (tileIdx % COLS) * TILE, oy = Math.floor(tileIdx / COLS) * TILE;
    ctx.save(); ctx.translate(ox, oy); fn(ctx, TILE); ctx.restore();
  }
  function px(ctx, x, y, r, g, b, a) { ctx.fillStyle = `rgba(${r},${g},${b},${a === undefined ? 1 : a})`; ctx.fillRect(x, y, 1, 1); }
  function noiseFill(ctx, s, r, g, b, range, seed) {
    const rng = seededRng(seed);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) px(ctx, x, y, nv(rng, r, range), nv(rng, g, range), nv(rng, b, range));
  }
  function clear(ctx, s) { ctx.clearRect(0, 0, s, s); }

  // ---------------- block textures ----------------
  function grassTop(ctx, s) {
    const rng = seededRng(11);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const v = (rng() - 0.5) * 22;
      px(ctx, x, y, 99 + v, 153 + v, 64 + v);
    }
    const r2 = seededRng(77);
    for (let i = 0; i < 14; i++) px(ctx, ri(r2, 0, 15), ri(r2, 0, 15), 80, 120, 45);
  }

  function grassSide(ctx, s) {
    // dirt base
    noiseFill(ctx, s, 134, 96, 67, 15, 20);
    // jagged green overlay on top
    const rng = seededRng(33);
    for (let x = 0; x < s; x++) {
      const gh = 3 + ri(rng, 0, 2);
      for (let y = 0; y < gh; y++) {
        const v = (rng() - 0.5) * 20;
        px(ctx, x, y, 99 + v, 153 + v, 64 + v);
      }
      // darker green fringe pixel
      px(ctx, x, gh, 70, 110, 45, 0.9);
    }
  }

  function dirt(ctx, s) {
    noiseFill(ctx, s, 134, 96, 67, 16, 3);
    const rng = seededRng(99);
    for (let i = 0; i < 5; i++) px(ctx, ri(rng, 0, 15), ri(rng, 0, 15), 110, 78, 52);
  }

  function stone(ctx, s) {
    noiseFill(ctx, s, 127, 127, 127, 14, 4);
    const rng = seededRng(40);
    for (let i = 0; i < 6; i++) px(ctx, ri(rng, 1, 14), ri(rng, 1, 14), 95, 95, 95);
    for (let i = 0; i < 4; i++) px(ctx, ri(rng, 1, 14), ri(rng, 1, 14), 150, 150, 150);
  }

  function sand(ctx, s) {
    noiseFill(ctx, s, 219, 203, 150, 11, 5);
    const rng = seededRng(55);
    for (let i = 0; i < 5; i++) px(ctx, ri(rng, 0, 15), ri(rng, 0, 15), 200, 182, 130);
  }

  function water(ctx, s) {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const w = Math.sin(x * 0.7 + y * 0.4) * 12;
      px(ctx, x, y, 40, 90 + w, 200 + w * 0.5);
    }
  }

  function logSide(ctx, s) {
    noiseFill(ctx, s, 102, 76, 46, 8, 7);
    // vertical bark streaks
    const rng = seededRng(71);
    for (let x = 0; x < s; x++) {
      if (rng() < 0.35) for (let y = 0; y < s; y++) px(ctx, x, y, 84, 60, 34, 0.5);
    }
    // edge rim
    for (let y = 0; y < s; y++) { px(ctx, 0, y, 70, 50, 28); px(ctx, 15, y, 70, 50, 28); }
    // couple knots
    px(ctx, 5, 6, 60, 42, 24); px(ctx, 10, 11, 60, 42, 24);
  }

  function logTop(ctx, s) {
    const rng = seededRng(8);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const dx = x - 7.5, dy = y - 7.5, r = Math.sqrt(dx*dx + dy*dy);
      const ring = (r % 2.4 < 1.1) ? -16 : 0;
      px(ctx, x, y, nv(rng, 150 + ring, 8), nv(rng, 112 + ring, 6), nv(rng, 70 + ring, 6));
    }
    px(ctx, 7, 7, 120, 88, 52); px(ctx, 8, 8, 120, 88, 52);
  }

  function leaves(ctx, s) {
    const rng = seededRng(9);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      if (rng() < 0.12) { continue; } // transparent gaps
      const v = (rng() - 0.5) * 36;
      px(ctx, x, y, 48 + v, 110 + v, 40 + v);
    }
    const r2 = seededRng(90);
    for (let i = 0; i < 10; i++) px(ctx, ri(r2, 0, 15), ri(r2, 0, 15), 35, 80, 28);
  }

  function cobblestone(ctx, s) {
    noiseFill(ctx, s, 79, 79, 79, 6, 10); // mortar base
    const stones = [
      [0,0,7,6],[8,0,7,6],
      [0,7,4,4],[5,7,5,4],[11,7,5,4],
      [0,12,7,4],[8,12,7,4],
    ];
    let seed = 200;
    for (const [x, y, w, h] of stones) {
      const rng = seededRng(seed++);
      const g = ri(rng, 100, 150);
      for (let yy = y; yy < y + h && yy < 16; yy++) for (let xx = x; xx < x + w && xx < 16; xx++) {
        px(ctx, xx, yy, nv(rng, g, 12), nv(rng, g, 12), nv(rng, g, 12));
      }
      // light top edge, dark bottom edge
      for (let xx = x; xx < x + w && xx < 16; xx++) { px(ctx, xx, y, g + 28, g + 28, g + 28, 0.6); px(ctx, xx, y + h - 1, 55, 55, 55, 0.6); }
      for (let yy = y; yy < y + h && yy < 16; yy++) px(ctx, x, yy, g + 20, g + 20, g + 20, 0.4);
    }
  }

  function planks(ctx, s) {
    const rng = seededRng(11);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const v = (rng() - 0.5) * 18;
      px(ctx, x, y, 178 + v, 134 + v, 78 + v);
    }
    // plank seams
    for (const y of [3, 7, 11, 15]) for (let x = 0; x < s; x++) px(ctx, x, y, 120, 86, 46, 0.8);
    // grain lines
    const r2 = seededRng(22);
    for (let row = 0; row < 4; row++) for (let i = 0; i < 3; i++) {
      const y = row * 4 + ri(r2, 0, 2), x0 = ri(r2, 0, 8);
      for (let x = x0; x < x0 + ri(r2, 3, 6) && x < 16; x++) px(ctx, x, y, 150, 110, 62, 0.5);
    }
    // staggered vertical end seams
    px(ctx, 8, 0, 120, 86, 46); px(ctx, 8, 1, 120, 86, 46); px(ctx, 8, 2, 120, 86, 46);
    px(ctx, 4, 4, 120, 86, 46); px(ctx, 4, 5, 120, 86, 46); px(ctx, 12, 8, 120, 86, 46); px(ctx, 12, 9, 120, 86, 46);
  }

  function glass(ctx, s) {
    clear(ctx, s);
    // frame
    for (let i = 0; i < s; i++) { px(ctx, i, 0, 220, 235, 245, 0.95); px(ctx, i, 15, 200, 220, 235, 0.95); px(ctx, 0, i, 215, 232, 244, 0.95); px(ctx, 15, i, 200, 220, 235, 0.95); }
    // light diagonal streaks
    for (let i = 2; i < 9; i++) px(ctx, i, i, 235, 245, 255, 0.5);
    px(ctx, 11, 4, 235, 245, 255, 0.5); px(ctx, 12, 5, 235, 245, 255, 0.4);
  }

  function ore(ctx, s, blobColor, drawSeed) {
    stone(ctx, s);
    const [r, g, b] = blobColor;
    const rng = seededRng(drawSeed);
    const blobs = 4 + ri(rng, 0, 2);
    for (let i = 0; i < blobs; i++) {
      const bx = ri(rng, 2, 12), by = ri(rng, 2, 12), w = ri(rng, 2, 3), h = ri(rng, 2, 3);
      for (let yy = by; yy < by + h; yy++) for (let xx = bx; xx < bx + w; xx++) {
        const v = (rng() - 0.5) * 30;
        px(ctx, xx, yy, r + v, g + v, b + v);
      }
      // dark outline
      for (let xx = bx - 1; xx <= bx + w; xx++) { px(ctx, xx, by - 1, r*0.4, g*0.4, b*0.4, 0.5); px(ctx, xx, by + h, r*0.4, g*0.4, b*0.4, 0.5); }
    }
  }

  function bedrock(ctx, s) {
    const rng = seededRng(15);
    for (let y = 0; y < s; y += 2) for (let x = 0; x < s; x += 2) {
      const g = ri(rng, 35, 95);
      for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) px(ctx, x + xx, y + yy, g, g, g);
    }
  }

  function gravel(ctx, s) {
    noiseFill(ctx, s, 122, 112, 105, 24, 16);
    const rng = seededRng(61);
    for (let i = 0; i < 8; i++) { const x = ri(rng, 0, 14), y = ri(rng, 0, 14); px(ctx, x, y, 80, 74, 70); px(ctx, x + 1, y, 150, 144, 138); }
  }

  function glowstone(ctx, s) {
    noiseFill(ctx, s, 200, 158, 70, 16, 17);
    const rng = seededRng(33);
    for (let i = 0; i < 12; i++) px(ctx, ri(rng, 0, 15), ri(rng, 0, 15), 255, 224, 120);
  }

  function obsidian(ctx, s) {
    noiseFill(ctx, s, 22, 18, 32, 8, 18);
    const rng = seededRng(18);
    for (let i = 0; i < 8; i++) px(ctx, ri(rng, 0, 15), ri(rng, 0, 15), 74, 44, 106);
    for (let i = 0; i < 4; i++) px(ctx, ri(rng, 0, 15), ri(rng, 0, 15), 110, 80, 150, 0.7);
  }

  function sandstoneTop(ctx, s) { noiseFill(ctx, s, 222, 206, 152, 8, 21); for (let i=0;i<s;i++){px(ctx,i,0,200,184,130,0.5);px(ctx,i,15,200,184,130,0.5);} }
  function sandstoneSide(ctx, s) {
    noiseFill(ctx, s, 216, 200, 146, 8, 22);
    for (const y of [4, 9, 13]) for (let x = 0; x < s; x++) px(ctx, x, y, 188, 168, 110, 0.7);
    // top cap band
    for (let x = 0; x < s; x++) { px(ctx, x, 0, 228, 214, 162); px(ctx, x, 1, 224, 210, 158); }
  }

  function snow(ctx, s) { noiseFill(ctx, s, 242, 244, 250, 6, 23); }

  function ice(ctx, s) {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const w = Math.sin(x * 0.5) * 8 + Math.cos(y * 0.5) * 8;
      px(ctx, x, y, 150 + w, 192 + w, 226 + w, 0.92);
    }
    px(ctx, 3, 4, 210, 232, 250, 0.7); px(ctx, 10, 9, 210, 232, 250, 0.7); px(ctx, 6, 12, 200, 226, 248, 0.6);
  }

  function craftingTop(ctx, s) {
    planks(ctx, s);
    ctx.fillStyle = 'rgba(70,46,18,0.85)'; ctx.fillRect(1, 1, 14, 14);
    // 3x3 grid
    ctx.fillStyle = '#a87a32';
    for (let i = 0; i <= 3; i++) { ctx.fillRect(2 + i * 4, 2, 1, 12); ctx.fillRect(2, 2 + i * 4, 12, 1); }
  }
  function craftingSide(ctx, s) { planks(ctx, s); for (let y=0;y<s;y++){px(ctx,0,y,120,86,46);px(ctx,15,y,120,86,46);} px(ctx,3,3,90,60,30);px(ctx,11,7,90,60,30); }

  function furnaceFront(ctx, s) {
    stone(ctx, s);
    // frame
    for (let i=0;i<s;i++){px(ctx,i,0,90,90,90);px(ctx,i,15,90,90,90);px(ctx,0,i,90,90,90);px(ctx,15,i,90,90,90);}
    // opening
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(4, 4, 8, 6);
    ctx.fillStyle = '#ff7a18'; ctx.fillRect(5, 6, 6, 3);
    ctx.fillStyle = '#ffd24a'; ctx.fillRect(6, 7, 4, 1);
    // bottom slot
    ctx.fillStyle = '#5a5a5a'; ctx.fillRect(5, 12, 6, 2);
  }

  function torch(ctx, s) {
    clear(ctx, s);
    ctx.fillStyle = '#8a6a2a'; ctx.fillRect(7, 6, 2, 9);
    ctx.fillStyle = '#a07c34'; ctx.fillRect(7, 10, 1, 5);
    ctx.fillStyle = '#ffd24a'; ctx.fillRect(6, 3, 4, 3);
    ctx.fillStyle = '#fff2a0'; ctx.fillRect(7, 2, 2, 2);
    ctx.fillStyle = 'rgba(255,180,40,0.5)'; ctx.fillRect(6, 1, 4, 1);
  }

  function flower(ctx, s, petal) {
    clear(ctx, s);
    ctx.fillStyle = '#2f7d1e'; ctx.fillRect(7, 8, 2, 8);
    ctx.fillStyle = '#3f9d2a'; ctx.fillRect(5, 11, 2, 2); ctx.fillRect(9, 13, 2, 2);
    ctx.fillStyle = petal;
    ctx.fillRect(6, 3, 4, 4); ctx.fillRect(5, 4, 6, 2); ctx.fillRect(7, 2, 2, 6);
    ctx.fillStyle = '#ffe23a'; ctx.fillRect(7, 4, 2, 2);
  }

  function tallGrass(ctx, s) {
    clear(ctx, s);
    const rng = seededRng(27);
    const cols = ['#4f9a28', '#5fae30', '#3f8a20'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i % 3];
      const x = ri(rng, 2, 13);
      for (let y = 15; y > ri(rng, 5, 9); y--) ctx.fillRect(x + Math.round(Math.sin(y * 0.5) * 1.3), y, 1, 1);
    }
  }

  function netherrack(ctx, s) {
    noiseFill(ctx, s, 110, 38, 38, 18, 28);
    const rng = seededRng(28);
    for (let i = 0; i < 8; i++) px(ctx, ri(rng, 0, 15), ri(rng, 0, 15), 70, 20, 20);
  }

  function bookshelf(ctx, s) {
    planks(ctx, s);
    // top & bottom plank frame
    ctx.fillStyle = '#b4863f'; ctx.fillRect(0, 0, 16, 2); ctx.fillRect(0, 14, 16, 2);
    const palette = ['#b23636', '#2f6fbf', '#2f9f4f', '#b58a2a', '#8a3fbf', '#c05a2a'];
    let p = 0;
    for (const y of [2, 8]) {
      let x = 1;
      while (x < 15) {
        const w = 1 + (p % 2);
        ctx.fillStyle = palette[p % palette.length];
        ctx.fillRect(x, y, w, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + w, y, 1, 5);
        x += w + 1; p++;
      }
    }
  }

  function brick(ctx, s) {
    // mortar background
    noiseFill(ctx, s, 168, 160, 150, 6, 30);
    const rng = seededRng(31);
    const rows = [[0, 0], [1, 4], [0, 8], [1, 12]]; // [offset, y]
    for (const [off, y] of rows) {
      let x = off ? -4 : 0;
      while (x < 16) {
        for (let yy = y; yy < y + 3 && yy < 16; yy++) for (let xx = x; xx < x + 7 && xx < 16; xx++) {
          if (xx < 0) continue;
          const v = (rng() - 0.5) * 18;
          px(ctx, xx, yy, 154 + v, 74 + v, 58 + v);
        }
        x += 8;
      }
    }
  }

  function mossyCobble(ctx, s) {
    cobblestone(ctx, s);
    const rng = seededRng(36);
    for (let i = 0; i < 26; i++) px(ctx, ri(rng, 0, 15), ri(rng, 0, 15), 60, 120, 45, 0.65);
  }

  function tntTop(ctx, s) { noiseFill(ctx, s, 196, 196, 196, 10, 70); ctx.fillStyle = '#b03030'; ctx.fillRect(2, 2, 12, 12); ctx.fillStyle = '#e8e8e8'; ctx.font = 'bold 6px monospace'; ctx.fillText('TNT', 2, 10); }
  function tntBottom(ctx, s) { noiseFill(ctx, s, 120, 120, 120, 10, 72); }
  function tntSide(ctx, s) {
    noiseFill(ctx, s, 178, 50, 44, 10, 71);
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 5, 16, 5);
    ctx.fillStyle = '#b03030'; ctx.font = 'bold 6px monospace'; ctx.fillText('TNT', 1, 10);
    ctx.fillStyle = 'rgba(60,40,20,0.5)'; for (let x=0;x<16;x++){px(ctx,x,4,90,70,40,0.4);px(ctx,x,11,90,70,40,0.4);}
  }

  // ---------------- item icons ----------------
  function clearI(ctx, s) { ctx.clearRect(0, 0, s, s); }
  function iStick(ctx) { clearI(ctx, 16); ctx.fillStyle = '#7a5230'; for (let i = 0; i < 9; i++) ctx.fillRect(10 - i, 3 + i, 2, 2); }
  function iCoal(ctx) { clearI(ctx, 16); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(4, 5, 8, 7); ctx.fillRect(5, 4, 6, 1); ctx.fillRect(3, 7, 1, 3); ctx.fillStyle = '#3a3a3a'; ctx.fillRect(6, 6, 2, 2); ctx.fillRect(9, 8, 2, 2); }
  function iIngot(ctx, r, g, b) { clearI(ctx, 16); ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.beginPath(); ctx.moveTo(4, 11); ctx.lineTo(6, 5); ctx.lineTo(12, 5); ctx.lineTo(11, 11); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(6, 6, 5, 1); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(5, 10, 6, 1); }
  function iDiamond(ctx) { clearI(ctx, 16); ctx.fillStyle = '#3fe0e0'; ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(13, 7); ctx.lineTo(8, 13); ctx.lineTo(3, 7); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(7, 5, 2, 2); ctx.fillStyle = 'rgba(0,80,120,0.4)'; ctx.fillRect(6, 9, 4, 2); }
  function iApple(ctx) { clearI(ctx, 16); ctx.fillStyle = '#cc2222'; ctx.beginPath(); ctx.arc(8, 9, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7a4a10'; ctx.fillRect(8, 3, 1, 3); ctx.fillStyle = '#2a8a2a'; ctx.fillRect(9, 4, 3, 2); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(6, 7, 2, 2); }
  function iBread(ctx) { clearI(ctx, 16); ctx.fillStyle = '#c08a40'; ctx.beginPath(); ctx.ellipse(8, 8, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#a06a28'; ctx.fillRect(5, 7, 1, 2); ctx.fillRect(8, 6, 1, 2); ctx.fillRect(11, 7, 1, 2); }
  function handle(ctx) { ctx.fillStyle = '#7a5230'; for (let i = 0; i < 8; i++) ctx.fillRect(5 + i, 12 - i, 2, 2); }
  function iPick(ctx) { clearI(ctx, 16); handle(ctx); ctx.fillStyle = '#9aa0a6'; ctx.fillRect(3, 3, 10, 2); ctx.fillRect(3, 3, 2, 2); ctx.fillRect(11, 3, 2, 2); ctx.fillRect(2, 4, 2, 2); ctx.fillRect(12, 4, 2, 2); }
  function iAxe(ctx) { clearI(ctx, 16); handle(ctx); ctx.fillStyle = '#9aa0a6'; ctx.fillRect(8, 3, 4, 6); ctx.fillRect(6, 4, 2, 4); }
  function iShovel(ctx) { clearI(ctx, 16); handle(ctx); ctx.fillStyle = '#9aa0a6'; ctx.fillRect(9, 3, 4, 4); ctx.fillRect(10, 7, 2, 1); }
  function iSword(ctx) { clearI(ctx, 16); ctx.fillStyle = '#7a5230'; ctx.fillRect(4, 11, 4, 2); ctx.fillRect(6, 9, 3, 3); ctx.fillStyle = '#caa030'; ctx.fillRect(7, 8, 4, 2); ctx.fillStyle = '#d8dde2'; for (let i = 0; i < 7; i++) ctx.fillRect(9 + i, 7 - i, 2, 2); }

  function generateAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_W; canvas.height = ATLAS_H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    drawTile(ctx, 1, grassTop);
    drawTile(ctx, 2, dirt);
    drawTile(ctx, 3, grassSide);
    drawTile(ctx, 4, stone);
    drawTile(ctx, 5, sand);
    drawTile(ctx, 6, water);
    drawTile(ctx, 7, logSide);
    drawTile(ctx, 8, logTop);
    drawTile(ctx, 9, leaves);
    drawTile(ctx, 10, cobblestone);
    drawTile(ctx, 11, planks);
    drawTile(ctx, 12, glass);
    drawTile(ctx, 13, (c, s) => ore(c, s, [40, 40, 40], 130));
    drawTile(ctx, 14, (c, s) => ore(c, s, [196, 150, 120], 140));
    drawTile(ctx, 15, (c, s) => ore(c, s, [230, 196, 70], 150));
    drawTile(ctx, 16, (c, s) => ore(c, s, [90, 210, 220], 160));
    drawTile(ctx, 17, bedrock);
    drawTile(ctx, 18, gravel);
    drawTile(ctx, 19, glowstone);
    drawTile(ctx, 20, obsidian);
    drawTile(ctx, 21, sandstoneTop);
    drawTile(ctx, 22, sandstoneSide);
    drawTile(ctx, 23, sandstoneTop);
    drawTile(ctx, 24, snow);
    drawTile(ctx, 25, ice);
    drawTile(ctx, 26, craftingTop);
    drawTile(ctx, 27, craftingSide);
    drawTile(ctx, 28, furnaceFront);
    drawTile(ctx, 29, torch);
    drawTile(ctx, 30, (c, s) => flower(c, s, '#d83030'));
    drawTile(ctx, 31, (c, s) => flower(c, s, '#ffe23a'));
    drawTile(ctx, 32, tallGrass);
    drawTile(ctx, 33, netherrack);
    drawTile(ctx, 34, bookshelf);
    drawTile(ctx, 35, brick);
    drawTile(ctx, 36, mossyCobble);
    drawTile(ctx, 37, tntTop);
    drawTile(ctx, 38, tntBottom);
    drawTile(ctx, 39, tntSide);

    drawTile(ctx, 40, iStick);
    drawTile(ctx, 41, iCoal);
    drawTile(ctx, 42, (c) => iIngot(c, 214, 214, 220));
    drawTile(ctx, 43, (c) => iIngot(c, 236, 206, 64));
    drawTile(ctx, 44, iDiamond);
    drawTile(ctx, 45, iApple);
    drawTile(ctx, 46, iBread);
    drawTile(ctx, 47, iPick);
    drawTile(ctx, 48, iAxe);
    drawTile(ctx, 49, iShovel);
    drawTile(ctx, 50, iSword);

    return { canvas, TILE, COLS, ROWS, ATLAS_W, ATLAS_H };
  }

  function tileUV(tileIdx) {
    if (!tileIdx) return [0, 0, 0, 0];
    const col = tileIdx % COLS, row = Math.floor(tileIdx / COLS);
    return [col / COLS, row / ROWS, (col + 1) / COLS, (row + 1) / ROWS];
  }

  return { generateAtlas, tileUV, TILE, COLS, ROWS, ATLAS_W, ATLAS_H, TOTAL_TILES };
})();
