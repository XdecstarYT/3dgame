'use strict';

// Procedural texture generation - creates a texture atlas resembling Minecraft's pixel art
const TextureAtlas = (() => {
  const TILE = 16;       // pixels per tile
  const COLS = 8;        // tiles per row in atlas
  const TOTAL_TILES = 40;
  const ROWS = Math.ceil(TOTAL_TILES / COLS);
  const ATLAS_W = TILE * COLS;
  const ATLAS_H = TILE * ROWS;

  // Seeded RNG for deterministic patterns
  function seededRng(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF; };
  }

  // Random int in [min, max]
  function ri(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }

  // Noise-based pixel variation
  function noiseVariant(rng, base, range) {
    return Math.max(0, Math.min(255, base + Math.floor((rng() - 0.5) * 2 * range)));
  }

  function rgba(r, g, b, a = 255) { return [r, g, b, a]; }

  // Draw to canvas at tile slot [col, row]
  function drawTile(ctx, tileIdx, drawFn) {
    const col = tileIdx % COLS;
    const row = Math.floor(tileIdx / COLS);
    const ox = col * TILE, oy = row * TILE;
    ctx.save();
    ctx.translate(ox, oy);
    drawFn(ctx, TILE);
    ctx.restore();
  }

  function fillPixels(ctx, pixels) {
    // pixels: array of {x, y, r, g, b, a}
    pixels.forEach(({ x, y, r, g, b, a = 255 }) => {
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      ctx.fillRect(x, y, 1, 1);
    });
  }

  function solidColor(ctx, size, r, g, b, seed = 0, variation = 10) {
    const rng = seededRng(seed);
    const pixels = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        pixels.push({
          x, y,
          r: noiseVariant(rng, r, variation),
          g: noiseVariant(rng, g, variation),
          b: noiseVariant(rng, b, variation),
        });
      }
    }
    fillPixels(ctx, pixels);
  }

  function drawGrassTop(ctx, size) {
    const rng = seededRng(1);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = noiseVariant(rng, 0, 20);
        ctx.fillStyle = `rgb(${95+v},${148+v},${65+v})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // small grass blades
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#5a9010';
      ctx.fillRect(ri(seededRng(i*7), 1, 14), 0, 1, ri(seededRng(i*13), 1, 3));
    }
  }

  function drawGrassSide(ctx, size) {
    const rng = seededRng(2);
    // top 3 pixels: green
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < size; x++) {
        const v = noiseVariant(rng, 0, 15);
        ctx.fillStyle = `rgb(${95+v},${148+v},${65+v})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // rest: dirt
    const drng = seededRng(20);
    for (let y = 3; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(drng, 134, 15)},${noiseVariant(drng, 96, 12)},${noiseVariant(drng, 67, 10)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawDirt(ctx, size) {
    const rng = seededRng(3);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,134,18)},${noiseVariant(rng,96,14)},${noiseVariant(rng,67,12)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // pebbles
    const pr = seededRng(99);
    for (let i = 0; i < 3; i++) {
      const px = ri(pr, 1, 13), py = ri(pr, 1, 13);
      ctx.fillStyle = 'rgba(80,60,40,0.4)';
      ctx.fillRect(px, py, 2, 1);
    }
  }

  function drawStone(ctx, size) {
    const rng = seededRng(4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,128,20)},${noiseVariant(rng,128,20)},${noiseVariant(rng,128,20)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // cracks
    ctx.fillStyle = 'rgba(60,60,60,0.5)';
    ctx.fillRect(2, 5, 4, 1); ctx.fillRect(10, 10, 3, 1); ctx.fillRect(6, 2, 1, 3);
  }

  function drawSand(ctx, size) {
    const rng = seededRng(5);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,219,15)},${noiseVariant(rng,196,12)},${noiseVariant(rng,130,10)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawWater(ctx, size) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const wave = Math.sin(x * 0.8 + y * 0.5) * 10;
        ctx.fillStyle = `rgba(${30},${80 + wave | 0},${190 + wave | 0},0.85)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // shimmer
    ctx.fillStyle = 'rgba(150,210,255,0.4)';
    ctx.fillRect(2, 3, 4, 1); ctx.fillRect(10, 8, 3, 1);
  }

  function drawLogSide(ctx, size) {
    const rng = seededRng(7);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const edge = (x === 0 || x === size-1) ? -20 : 0;
        ctx.fillStyle = `rgb(${noiseVariant(rng,100+edge,10)},${noiseVariant(rng,70+edge,8)},${noiseVariant(rng,40+edge,8)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // bark lines
    ctx.fillStyle = 'rgba(60,40,20,0.3)';
    for (let y = 2; y < size; y += 4) ctx.fillRect(0, y, size, 1);
  }

  function drawLogTop(ctx, size) {
    const rng = seededRng(8);
    // rings
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - 7.5, dy = y - 7.5;
        const r = Math.sqrt(dx*dx + dy*dy);
        const ring = (r % 2.5 < 1) ? -15 : 0;
        ctx.fillStyle = `rgb(${noiseVariant(rng,130+ring,8)},${noiseVariant(rng,95+ring,6)},${noiseVariant(rng,60+ring,6)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawLeaves(ctx, size) {
    const rng = seededRng(9);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (rng() < 0.15) { ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(x,y,1,1); continue; }
        ctx.fillStyle = `rgb(${noiseVariant(rng,55,15)},${noiseVariant(rng,130,20)},${noiseVariant(rng,45,15)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawCobblestone(ctx, size) {
    const rng = seededRng(10);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,100,25)},${noiseVariant(rng,100,25)},${noiseVariant(rng,100,25)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // mortar lines defining cobble shapes
    ctx.fillStyle = 'rgba(60,60,60,0.6)';
    ctx.fillRect(0, 0, size, 1); ctx.fillRect(0, 7, size, 1); ctx.fillRect(0, 11, size, 1);
    ctx.fillRect(0, 0, 1, 7); ctx.fillRect(5, 0, 1, 7); ctx.fillRect(10, 0, 1, 7);
    ctx.fillRect(3, 7, 1, 4); ctx.fillRect(8, 7, 1, 4); ctx.fillRect(13, 7, 1, 4);
    ctx.fillRect(0, 11, 1, 5); ctx.fillRect(7, 11, 1, 5); ctx.fillRect(12, 11, 1, 5);
  }

  function drawPlanks(ctx, size) {
    const rng = seededRng(11);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const plankRow = Math.floor(y / 4);
        const plankOff = (plankRow % 2) * 8;
        ctx.fillStyle = `rgb(${noiseVariant(rng,165,15)},${noiseVariant(rng,115,12)},${noiseVariant(rng,65,10)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // plank dividers
    ctx.fillStyle = 'rgba(100,70,35,0.5)';
    ctx.fillRect(0, 3, size, 1); ctx.fillRect(0, 7, size, 1); ctx.fillRect(0, 11, size, 1);
    ctx.fillRect(7, 0, 1, 4); ctx.fillRect(3, 4, 1, 4); ctx.fillRect(11, 8, 1, 4);
  }

  function drawGlass(ctx, size) {
    // Mostly transparent with edge frame
    ctx.fillStyle = 'rgba(160,210,240,0.3)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(0, 0, size, 1); ctx.fillRect(0, size-1, size, 1);
    ctx.fillRect(0, 0, 1, size); ctx.fillRect(size-1, 0, 1, size);
    ctx.fillStyle = 'rgba(200,235,255,0.4)';
    ctx.fillRect(2, 2, 5, 5); ctx.fillRect(9, 9, 5, 5);
  }

  function drawOre(ctx, size, sr, sg, sb, seed) {
    drawStone(ctx, size);
    const rng = seededRng(seed);
    ctx.fillStyle = `rgb(${sr},${sg},${sb})`;
    for (let i = 0; i < 6; i++) {
      const x = ri(rng, 1, 13), y = ri(rng, 1, 13);
      ctx.fillRect(x, y, ri(rng, 1, 2), ri(rng, 1, 2));
    }
  }

  function drawBedrock(ctx, size) {
    const rng = seededRng(15);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,50,20)},${noiseVariant(rng,50,20)},${noiseVariant(rng,50,20)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawGravel(ctx, size) {
    const rng = seededRng(16);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,120,30)},${noiseVariant(rng,110,28)},${noiseVariant(rng,105,25)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawGlowstone(ctx, size) {
    const rng = seededRng(17);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const glow = Math.sin(x*0.7)*10 + Math.cos(y*0.9)*10;
        ctx.fillStyle = `rgb(${noiseVariant(rng, 220+glow|0, 15)},${noiseVariant(rng,170,12)},${noiseVariant(rng,50,10)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawObsidian(ctx, size) {
    const rng = seededRng(18);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,20,10)},${noiseVariant(rng,15,8)},${noiseVariant(rng,30,12)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // purple sheen
    ctx.fillStyle = 'rgba(80,0,120,0.3)';
    ctx.fillRect(3, 3, 4, 4); ctx.fillRect(9, 9, 5, 5);
  }

  function drawSandstoneTop(ctx, size) { drawSand(ctx, size); ctx.fillStyle = 'rgba(160,140,90,0.3)'; ctx.fillRect(0,0,size,1); ctx.fillRect(0,size-1,size,1); }
  function drawSandstoneSide(ctx, size) {
    const rng = seededRng(22);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,200,10)},${noiseVariant(rng,175,10)},${noiseVariant(rng,100,8)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = 'rgba(150,120,60,0.4)';
    ctx.fillRect(0,4,size,1); ctx.fillRect(0,9,size,1); ctx.fillRect(0,13,size,1);
    // hieroglyph-like marks
    ctx.fillStyle = 'rgba(140,110,50,0.5)';
    ctx.fillRect(3,6,2,2); ctx.fillRect(10,10,3,1);
  }
  function drawSandstoneBottom(ctx, size) { drawSand(ctx, size); }

  function drawSnow(ctx, size) {
    const rng = seededRng(23);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,240,8)},${noiseVariant(rng,242,8)},${noiseVariant(rng,248,6)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawIce(ctx, size) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = Math.sin(x*0.5)*8 + Math.cos(y*0.5)*8;
        ctx.fillStyle = `rgba(${140+v|0},${185+v|0},${220+v|0},0.88)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = 'rgba(200,230,255,0.4)';
    ctx.fillRect(2,2,3,1); ctx.fillRect(10,10,4,1);
  }

  function drawCraftingTop(ctx, size) {
    drawPlanks(ctx, size);
    ctx.fillStyle = 'rgba(80,50,20,0.7)';
    ctx.fillRect(1,1,14,14);
    ctx.fillStyle = '#a0600a';
    ctx.fillRect(4,4,8,1); ctx.fillRect(4,4,1,8); ctx.fillRect(4,11,8,1); ctx.fillRect(11,4,1,8);
    ctx.fillRect(7,1,1,14); ctx.fillRect(1,7,14,1);
  }

  function drawCraftingSide(ctx, size) {
    drawPlanks(ctx, size);
    ctx.fillStyle = 'rgba(80,50,20,0.4)';
    ctx.fillRect(0,0,1,size); ctx.fillRect(size-1,0,1,size);
  }

  function drawFurnaceFront(ctx, size) {
    solidColor(ctx, size, 100, 100, 100, 100, 20);
    ctx.fillStyle = '#222';
    ctx.fillRect(4, 4, 8, 5);
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(5, 5, 6, 3);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(6, 6, 4, 1);
    // furnace door handle
    ctx.fillStyle = '#888';
    ctx.fillRect(5, 11, 6, 2); ctx.fillRect(7, 10, 2, 1);
  }

  function drawTorch(ctx, size) {
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,size,size);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(7, 4, 2, 12);
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(6, 2, 4, 4);
    ctx.fillStyle = '#ffdd00';
    ctx.fillRect(7, 1, 2, 2);
    ctx.fillStyle = 'rgba(255,220,0,0.5)';
    ctx.fillRect(6, 0, 4, 2);
  }

  function drawFlower(ctx, size, color) {
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,size,size);
    // stem
    ctx.fillStyle = '#3a7a10'; ctx.fillRect(7, 8, 2, 8);
    ctx.fillStyle = color;
    ctx.fillRect(5, 4, 6, 2); ctx.fillRect(4, 6, 8, 2);
    ctx.fillRect(6, 2, 4, 2); ctx.fillRect(5, 8, 6, 2);
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(6, 5, 4, 2);
  }

  function drawTallGrass(ctx, size) {
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,size,size);
    const rng = seededRng(27);
    const colors = ['#4a8a20','#5a9a28','#3a7a18'];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = colors[i % 3];
      const x = ri(rng, 2, 12);
      for (let y = 16; y > ri(rng, 4, 8); y--) {
        ctx.fillRect(x + Math.floor(Math.sin(y * 0.5) * 1.5), y, 1, 1);
      }
    }
  }

  function drawNetherrack(ctx, size) {
    const rng = seededRng(28);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,100,20)},${noiseVariant(rng,20,10)},${noiseVariant(rng,20,10)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawBookshelf(ctx, size) {
    drawPlanks(ctx, size);
    ctx.fillStyle = '#cc2222'; for (let i=0;i<3;i++) ctx.fillRect(1+i*5, 2, 4, 5);
    ctx.fillStyle = '#2222cc'; for (let i=0;i<2;i++) ctx.fillRect(3+i*6, 9, 4, 5);
    ctx.fillStyle = '#118811'; ctx.fillRect(10, 3, 3, 4);
  }

  function drawBrick(ctx, size) {
    const rng = seededRng(30);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = `rgb(${noiseVariant(rng,160,20)},${noiseVariant(rng,60,15)},${noiseVariant(rng,55,15)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = 'rgba(100,80,80,0.6)';
    ctx.fillRect(0,0,size,1); ctx.fillRect(0,4,size,1); ctx.fillRect(0,8,size,1); ctx.fillRect(0,12,size,1);
    ctx.fillRect(7,0,1,4); ctx.fillRect(3,4,1,4); ctx.fillRect(11,4,1,4); ctx.fillRect(7,8,1,4); ctx.fillRect(3,12,1,4); ctx.fillRect(11,12,1,4);
  }

  function drawMossyCobble(ctx, size) {
    drawCobblestone(ctx, size);
    // moss patches
    ctx.fillStyle = 'rgba(50,140,30,0.5)';
    ctx.fillRect(2,2,3,2); ctx.fillRect(9,5,4,3); ctx.fillRect(1,11,5,3); ctx.fillRect(11,12,4,3);
  }

  function drawTNTTop(ctx, size) {
    solidColor(ctx, size, 200, 200, 200, 70, 20);
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(3,3,10,10);
    ctx.fillStyle = '#ffffff';
    ctx.font = '5px sans-serif';
    ctx.fillText('TNT', 2, 10);
  }

  function drawTNTSide(ctx, size) {
    solidColor(ctx, size, 180, 30, 30, 71, 15);
    // rope pattern
    ctx.fillStyle = 'rgba(100,70,30,0.6)';
    ctx.fillRect(0,5,size,1); ctx.fillRect(0,10,size,1);
    ctx.fillRect(3,0,1,size); ctx.fillRect(12,0,1,size);
  }

  function drawTNTBottom(ctx, size) { solidColor(ctx, size, 200, 200, 200, 72, 20); }

  function generateAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_W;
    canvas.height = ATLAS_H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // tile 0: empty/transparent
    // tile 1: grass top
    drawTile(ctx, 1, drawGrassTop);
    // tile 2: dirt
    drawTile(ctx, 2, drawDirt);
    // tile 3: grass side
    drawTile(ctx, 3, drawGrassSide);
    // tile 4: stone
    drawTile(ctx, 4, drawStone);
    // tile 5: sand
    drawTile(ctx, 5, drawSand);
    // tile 6: water
    drawTile(ctx, 6, drawWater);
    // tile 7: log side
    drawTile(ctx, 7, drawLogSide);
    // tile 8: log top
    drawTile(ctx, 8, drawLogTop);
    // tile 9: leaves
    drawTile(ctx, 9, drawLeaves);
    // tile 10: cobblestone
    drawTile(ctx, 10, drawCobblestone);
    // tile 11: planks
    drawTile(ctx, 11, drawPlanks);
    // tile 12: glass
    drawTile(ctx, 12, drawGlass);
    // tile 13: coal ore
    drawTile(ctx, 13, (ctx, s) => drawOre(ctx, s, 30, 30, 30, 130));
    // tile 14: iron ore
    drawTile(ctx, 14, (ctx, s) => drawOre(ctx, s, 200, 150, 100, 140));
    // tile 15: gold ore
    drawTile(ctx, 15, (ctx, s) => drawOre(ctx, s, 220, 200, 30, 150));
    // tile 16: diamond ore
    drawTile(ctx, 16, (ctx, s) => drawOre(ctx, s, 30, 200, 220, 160));
    // tile 17: bedrock
    drawTile(ctx, 17, drawBedrock);
    // tile 18: gravel
    drawTile(ctx, 18, drawGravel);
    // tile 19: glowstone
    drawTile(ctx, 19, drawGlowstone);
    // tile 20: obsidian
    drawTile(ctx, 20, drawObsidian);
    // tile 21: sandstone top
    drawTile(ctx, 21, drawSandstoneTop);
    // tile 22: sandstone side
    drawTile(ctx, 22, drawSandstoneSide);
    // tile 23: sandstone bottom
    drawTile(ctx, 23, drawSandstoneBottom);
    // tile 24: snow
    drawTile(ctx, 24, drawSnow);
    // tile 25: ice
    drawTile(ctx, 25, drawIce);
    // tile 26: crafting table top
    drawTile(ctx, 26, drawCraftingTop);
    // tile 27: crafting table side
    drawTile(ctx, 27, drawCraftingSide);
    // tile 28: furnace front
    drawTile(ctx, 28, drawFurnaceFront);
    // tile 29: torch
    drawTile(ctx, 29, drawTorch);
    // tile 30: red flower
    drawTile(ctx, 30, (ctx, s) => drawFlower(ctx, s, '#dd2222'));
    // tile 31: yellow flower
    drawTile(ctx, 31, (ctx, s) => drawFlower(ctx, s, '#eeee22'));
    // tile 32: tall grass
    drawTile(ctx, 32, drawTallGrass);
    // tile 33: netherrack
    drawTile(ctx, 33, drawNetherrack);
    // tile 34: bookshelf side
    drawTile(ctx, 34, drawBookshelf);
    // tile 35: brick
    drawTile(ctx, 35, drawBrick);
    // tile 36: mossy cobblestone
    drawTile(ctx, 36, drawMossyCobble);
    // tile 37: tnt top
    drawTile(ctx, 37, drawTNTTop);
    // tile 38: tnt bottom
    drawTile(ctx, 38, drawTNTBottom);
    // tile 39: tnt side
    drawTile(ctx, 39, drawTNTSide);

    return { canvas, TILE, COLS, ROWS, ATLAS_W, ATLAS_H };
  }

  // Compute UV coordinates for a given tile index and face UV offset [0..1]
  function tileUV(tileIdx) {
    if (!tileIdx) return [0, 0, 0, 0]; // transparent
    const col = tileIdx % COLS;
    const row = Math.floor(tileIdx / COLS);
    const u0 = col / COLS;
    const v0 = row / ROWS;
    const u1 = (col + 1) / COLS;
    const v1 = (row + 1) / ROWS;
    return [u0, v0, u1, v1];
  }

  return { generateAtlas, tileUV, TILE, COLS, ROWS, ATLAS_W, ATLAS_H, TOTAL_TILES };
})();
