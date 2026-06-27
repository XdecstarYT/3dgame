'use strict';

// Pattern string: 9 chars, row by row left to right, space=empty, letter=block
const CraftingSystem = (() => {
  const A = BLOCK.AIR;

  const recipes = [
    // Planks from log (1x1 any)
    { pattern: [BLOCK.LOG,A,A, A,A,A, A,A,A], output: { id: BLOCK.PLANKS, count: 4 } },

    // Sticks (2 planks vertical)
    { pattern: [A, BLOCK.PLANKS, A, A, BLOCK.PLANKS, A, A,A,A], output: { id: 40, count: 4 } }, // id 40 = sticks (virtual item)

    // Crafting table
    { pattern: [BLOCK.PLANKS,BLOCK.PLANKS,A, BLOCK.PLANKS,BLOCK.PLANKS,A, A,A,A], output: { id: BLOCK.CRAFTING_TABLE, count: 1 } },

    // Furnace
    { pattern: [BLOCK.COBBLESTONE,BLOCK.COBBLESTONE,BLOCK.COBBLESTONE,
                BLOCK.COBBLESTONE,A,BLOCK.COBBLESTONE,
                BLOCK.COBBLESTONE,BLOCK.COBBLESTONE,BLOCK.COBBLESTONE], output: { id: BLOCK.FURNACE, count: 1 } },

    // Glass pane -> glass (just glass for simplicity)
    { pattern: [BLOCK.SAND,BLOCK.SAND,BLOCK.SAND, A,A,A, A,A,A], output: { id: BLOCK.GLASS, count: 1 } },

    // Stone -> cobblestone via smelting (crafting: just stone->cobble)
    // Bookshelf
    { pattern: [BLOCK.PLANKS,BLOCK.PLANKS,BLOCK.PLANKS, BLOCK.PLANKS,BLOCK.PLANKS,BLOCK.PLANKS, BLOCK.PLANKS,BLOCK.PLANKS,BLOCK.PLANKS], output: { id: BLOCK.BOOKSHELF, count: 1 } },

    // TNT (gunpowder + sand, simplified: just sand pattern)
    { pattern: [BLOCK.SAND,BLOCK.GRAVEL,BLOCK.SAND, BLOCK.GRAVEL,BLOCK.SAND,BLOCK.GRAVEL, BLOCK.SAND,BLOCK.GRAVEL,BLOCK.SAND], output: { id: BLOCK.TNT, count: 1 } },

    // Sandstone (4 sand)
    { pattern: [BLOCK.SAND,BLOCK.SAND,A, BLOCK.SAND,BLOCK.SAND,A, A,A,A], output: { id: BLOCK.SANDSTONE, count: 4 } },

    // Brick block (4 bricks)
    { pattern: [BLOCK.GRAVEL,BLOCK.GRAVEL,A, BLOCK.GRAVEL,BLOCK.GRAVEL,A, A,A,A], output: { id: BLOCK.BRICK, count: 1 } },

    // Chest - planks ring
    { pattern: [BLOCK.PLANKS,BLOCK.PLANKS,BLOCK.PLANKS, BLOCK.PLANKS,A,BLOCK.PLANKS, BLOCK.PLANKS,BLOCK.PLANKS,BLOCK.PLANKS], output: { id: BLOCK.CRAFTING_TABLE, count: 1 } }, // reuse crafting table icon

    // Torch (coal ore + anything vertical - simplified)
    { pattern: [A,BLOCK.COAL_ORE,A, A,BLOCK.PLANKS,A, A,A,A], output: { id: BLOCK.TORCH, count: 4 } },

    // 4 cobble -> stone (simplified crafting)
    { pattern: [BLOCK.COBBLESTONE,BLOCK.COBBLESTONE,A, BLOCK.COBBLESTONE,BLOCK.COBBLESTONE,A, A,A,A], output: { id: BLOCK.STONE, count: 4 } },

    // Mossy cobblestone
    { pattern: [BLOCK.COBBLESTONE,BLOCK.LEAVES,A, A,A,A, A,A,A], output: { id: BLOCK.MOSSY_COBBLESTONE, count: 1 } },
  ];

  function normalizePattern(slots) {
    // Remove trailing empty rows/cols and center the pattern
    const grid = [];
    for (let r = 0; r < 3; r++) {
      grid.push([slots[r*3].id || 0, slots[r*3+1].id || 0, slots[r*3+2].id || 0]);
    }

    // Find bounding box
    let minR = 3, maxR = -1, minC = 3, maxC = -1;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[r][c] !== BLOCK.AIR) {
          minR = Math.min(minR, r); maxR = Math.max(maxR, r);
          minC = Math.min(minC, c); maxC = Math.max(maxC, c);
        }
      }
    }
    if (maxR < 0) return null;

    const subgrid = [];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        subgrid.push(grid[r][c]);
      }
    }
    return { subgrid, width: maxC - minC + 1, height: maxR - minR + 1 };
  }

  function findRecipe(slots) {
    const norm = normalizePattern(slots);
    if (!norm) return null;

    for (const recipe of recipes) {
      // Try matching with the recipe pattern (also normalized)
      const recSlots = recipe.pattern.map(id => ({ id }));
      const recNorm = normalizePattern(recSlots);
      if (!recNorm) continue;

      if (recNorm.width !== norm.width || recNorm.height !== norm.height) continue;
      if (recNorm.subgrid.length !== norm.subgrid.length) continue;

      let match = true;
      for (let i = 0; i < norm.subgrid.length; i++) {
        if (norm.subgrid[i] !== recNorm.subgrid[i]) { match = false; break; }
      }
      if (match) return { ...recipe.output };
    }
    return null;
  }

  function getCraftingList() {
    return recipes.map(r => ({
      output: r.output,
      pattern: r.pattern
    }));
  }

  return { findRecipe, getCraftingList };
})();
