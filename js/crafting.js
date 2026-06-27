'use strict';

// 3x3 shaped-recipe crafting. Patterns are 9 entries (row-major); 0 = empty.
const CraftingSystem = (() => {
  const A = BLOCK.AIR;
  const S = ITEM.STICK;

  const recipes = [
    // Wood / basics
    { pattern: [BLOCK.LOG,A,A, A,A,A, A,A,A], output: { id: BLOCK.PLANKS, count: 4 } },
    { pattern: [BLOCK.PLANKS,A,A, BLOCK.PLANKS,A,A, A,A,A], output: { id: ITEM.STICK, count: 4 } },
    { pattern: [BLOCK.PLANKS,BLOCK.PLANKS,A, BLOCK.PLANKS,BLOCK.PLANKS,A, A,A,A], output: { id: BLOCK.CRAFTING_TABLE, count: 1 } },
    { pattern: [BLOCK.COBBLESTONE,BLOCK.COBBLESTONE,BLOCK.COBBLESTONE,
                BLOCK.COBBLESTONE,A,BLOCK.COBBLESTONE,
                BLOCK.COBBLESTONE,BLOCK.COBBLESTONE,BLOCK.COBBLESTONE], output: { id: BLOCK.FURNACE, count: 1 } },
    { pattern: [BLOCK.PLANKS,BLOCK.PLANKS,BLOCK.PLANKS, BLOCK.PLANKS,BLOCK.PLANKS,BLOCK.PLANKS, BLOCK.PLANKS,BLOCK.PLANKS,BLOCK.PLANKS], output: { id: BLOCK.BOOKSHELF, count: 1 } },

    // Torch: coal over stick
    { pattern: [A,ITEM.COAL,A, A,ITEM.STICK,A, A,A,A], output: { id: BLOCK.TORCH, count: 4 } },

    // Decorative / building
    { pattern: [BLOCK.SAND,BLOCK.SAND,A, BLOCK.SAND,BLOCK.SAND,A, A,A,A], output: { id: BLOCK.SANDSTONE, count: 1 } },
    { pattern: [BLOCK.STONE,BLOCK.STONE,A, BLOCK.STONE,BLOCK.STONE,A, A,A,A], output: { id: BLOCK.BRICK, count: 4 } },
    { pattern: [BLOCK.COBBLESTONE,BLOCK.LEAVES,A, A,A,A, A,A,A], output: { id: BLOCK.MOSSY_COBBLESTONE, count: 1 } },
    { pattern: [BLOCK.SAND,BLOCK.GRAVEL,BLOCK.SAND, BLOCK.GRAVEL,BLOCK.SAND,BLOCK.GRAVEL, BLOCK.SAND,BLOCK.GRAVEL,BLOCK.SAND], output: { id: BLOCK.TNT, count: 1 } },

    // Food
    { pattern: [BLOCK.PLANKS,A,A, A,A,A, A,A,A], output: { id: BLOCK.PLANKS, count: 1 }, _disabled: true }, // placeholder removed by filter
  ].filter(r => !r._disabled);

  // Tool recipes for every material tier
  const MATERIALS = [
    { m: BLOCK.PLANKS,      pick: ITEM.WOOD_PICKAXE,   axe: ITEM.WOOD_AXE,   shovel: ITEM.WOOD_SHOVEL,   sword: ITEM.WOOD_SWORD },
    { m: BLOCK.COBBLESTONE, pick: ITEM.STONE_PICKAXE,  axe: ITEM.STONE_AXE,  shovel: ITEM.STONE_SHOVEL,  sword: ITEM.STONE_SWORD },
    { m: ITEM.IRON_INGOT,   pick: ITEM.IRON_PICKAXE,   axe: ITEM.IRON_AXE,   shovel: ITEM.IRON_SHOVEL,   sword: ITEM.IRON_SWORD },
    { m: ITEM.DIAMOND,      pick: ITEM.DIAMOND_PICKAXE,axe: ITEM.DIAMOND_AXE,shovel: ITEM.DIAMOND_SHOVEL,sword: ITEM.DIAMOND_SWORD },
  ];
  for (const mat of MATERIALS) {
    const M = mat.m;
    recipes.push({ pattern: [M,M,M, A,S,A, A,S,A], output: { id: mat.pick, count: 1 } });
    recipes.push({ pattern: [M,M,A, M,S,A, A,S,A], output: { id: mat.axe, count: 1 } });
    recipes.push({ pattern: [M,A,A, S,A,A, S,A,A], output: { id: mat.shovel, count: 1 } });
    recipes.push({ pattern: [M,A,A, M,A,A, S,A,A], output: { id: mat.sword, count: 1 } });
  }

  function normalizePattern(slots) {
    const grid = [];
    for (let r = 0; r < 3; r++) grid.push([slots[r*3].id || 0, slots[r*3+1].id || 0, slots[r*3+2].id || 0]);

    let minR = 3, maxR = -1, minC = 3, maxC = -1;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (grid[r][c] !== BLOCK.AIR) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
    }
    if (maxR < 0) return null;

    const subgrid = [];
    for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) subgrid.push(grid[r][c]);
    return { subgrid, width: maxC - minC + 1, height: maxR - minR + 1 };
  }

  function findRecipe(slots) {
    const norm = normalizePattern(slots);
    if (!norm) return null;
    for (const recipe of recipes) {
      const recNorm = normalizePattern(recipe.pattern.map(id => ({ id })));
      if (!recNorm) continue;
      if (recNorm.width !== norm.width || recNorm.height !== norm.height) continue;
      let match = true;
      for (let i = 0; i < norm.subgrid.length; i++) {
        if (norm.subgrid[i] !== recNorm.subgrid[i]) { match = false; break; }
      }
      if (match) return { ...recipe.output };
    }
    return null;
  }

  function getCraftingList() { return recipes.map(r => ({ output: r.output, pattern: r.pattern })); }

  return { findRecipe, getCraftingList };
})();
