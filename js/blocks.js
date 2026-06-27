'use strict';

const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  LOG: 6,
  LEAVES: 7,
  COBBLESTONE: 8,
  PLANKS: 9,
  GLASS: 10,
  COAL_ORE: 11,
  IRON_ORE: 12,
  GOLD_ORE: 13,
  DIAMOND_ORE: 14,
  BEDROCK: 15,
  GRAVEL: 16,
  GLOWSTONE: 17,
  OBSIDIAN: 18,
  SANDSTONE: 19,
  SNOW: 20,
  ICE: 21,
  CRAFTING_TABLE: 22,
  FURNACE: 23,
  TORCH: 24,
  RED_FLOWER: 25,
  YELLOW_FLOWER: 26,
  TALL_GRASS: 27,
  NETHERRACK: 28,
  BOOKSHELF: 29,
  BRICK: 30,
  MOSSY_COBBLESTONE: 31,
  TNT: 32,
};

// Face indices: 0=top, 1=bottom, 2=north(-z), 3=south(+z), 4=west(-x), 5=east(+x)
const BLOCK_DEF = {
  [BLOCK.AIR]:              { solid: false, transparent: true,  name: 'Air',             textures: [0,0,0,0,0,0],          stackSize: 0 },
  [BLOCK.GRASS]:            { solid: true,  transparent: false, name: 'Grass Block',      textures: [1,2,3,3,3,3],          stackSize: 64, drops: BLOCK.DIRT },
  [BLOCK.DIRT]:             { solid: true,  transparent: false, name: 'Dirt',             textures: [2,2,2,2,2,2],          stackSize: 64 },
  [BLOCK.STONE]:            { solid: true,  transparent: false, name: 'Stone',            textures: [4,4,4,4,4,4],          stackSize: 64, drops: BLOCK.COBBLESTONE },
  [BLOCK.SAND]:             { solid: true,  transparent: false, name: 'Sand',             textures: [5,5,5,5,5,5],          stackSize: 64 },
  [BLOCK.WATER]:            { solid: false, transparent: true,  liquid: true, name: 'Water', textures: [6,6,6,6,6,6],       stackSize: 0 },
  [BLOCK.LOG]:              { solid: true,  transparent: false, name: 'Oak Log',          textures: [7,7,8,8,8,8],          stackSize: 64 },
  [BLOCK.LEAVES]:           { solid: true,  transparent: true,  name: 'Oak Leaves',       textures: [9,9,9,9,9,9],          stackSize: 64 },
  [BLOCK.COBBLESTONE]:      { solid: true,  transparent: false, name: 'Cobblestone',      textures: [10,10,10,10,10,10],    stackSize: 64 },
  [BLOCK.PLANKS]:           { solid: true,  transparent: false, name: 'Oak Planks',       textures: [11,11,11,11,11,11],    stackSize: 64 },
  [BLOCK.GLASS]:            { solid: true,  transparent: true,  name: 'Glass',            textures: [12,12,12,12,12,12],    stackSize: 64 },
  [BLOCK.COAL_ORE]:         { solid: true,  transparent: false, name: 'Coal Ore',         textures: [13,13,13,13,13,13],    stackSize: 64 },
  [BLOCK.IRON_ORE]:         { solid: true,  transparent: false, name: 'Iron Ore',         textures: [14,14,14,14,14,14],    stackSize: 64 },
  [BLOCK.GOLD_ORE]:         { solid: true,  transparent: false, name: 'Gold Ore',         textures: [15,15,15,15,15,15],    stackSize: 64 },
  [BLOCK.DIAMOND_ORE]:      { solid: true,  transparent: false, name: 'Diamond Ore',      textures: [16,16,16,16,16,16],    stackSize: 64 },
  [BLOCK.BEDROCK]:          { solid: true,  transparent: false, name: 'Bedrock',          textures: [17,17,17,17,17,17],    stackSize: 0 },
  [BLOCK.GRAVEL]:           { solid: true,  transparent: false, name: 'Gravel',           textures: [18,18,18,18,18,18],    stackSize: 64 },
  [BLOCK.GLOWSTONE]:        { solid: true,  transparent: false, name: 'Glowstone',        textures: [19,19,19,19,19,19],    stackSize: 64, emitsLight: true },
  [BLOCK.OBSIDIAN]:         { solid: true,  transparent: false, name: 'Obsidian',         textures: [20,20,20,20,20,20],    stackSize: 64, hardness: 50 },
  [BLOCK.SANDSTONE]:        { solid: true,  transparent: false, name: 'Sandstone',        textures: [21,22,23,23,23,23],    stackSize: 64 },
  [BLOCK.SNOW]:             { solid: true,  transparent: false, name: 'Snow',             textures: [24,24,24,24,24,24],    stackSize: 64 },
  [BLOCK.ICE]:              { solid: true,  transparent: true,  name: 'Ice',              textures: [25,25,25,25,25,25],    stackSize: 64 },
  [BLOCK.CRAFTING_TABLE]:   { solid: true,  transparent: false, name: 'Crafting Table',   textures: [26,11,27,27,27,27],    stackSize: 64 },
  [BLOCK.FURNACE]:          { solid: true,  transparent: false, name: 'Furnace',          textures: [4,4,28,4,4,4],         stackSize: 64 },
  [BLOCK.TORCH]:            { solid: false, transparent: true,  name: 'Torch',            textures: [29,29,29,29,29,29],    stackSize: 64, emitsLight: true, crossModel: true },
  [BLOCK.RED_FLOWER]:       { solid: false, transparent: true,  name: 'Rose',             textures: [30,30,30,30,30,30],    stackSize: 64, crossModel: true },
  [BLOCK.YELLOW_FLOWER]:    { solid: false, transparent: true,  name: 'Dandelion',        textures: [31,31,31,31,31,31],    stackSize: 64, crossModel: true },
  [BLOCK.TALL_GRASS]:       { solid: false, transparent: true,  name: 'Tall Grass',       textures: [32,32,32,32,32,32],    stackSize: 64, crossModel: true },
  [BLOCK.NETHERRACK]:       { solid: true,  transparent: false, name: 'Netherrack',       textures: [33,33,33,33,33,33],    stackSize: 64 },
  [BLOCK.BOOKSHELF]:        { solid: true,  transparent: false, name: 'Bookshelf',        textures: [11,11,34,34,34,34],    stackSize: 64 },
  [BLOCK.BRICK]:            { solid: true,  transparent: false, name: 'Bricks',           textures: [35,35,35,35,35,35],    stackSize: 64 },
  [BLOCK.MOSSY_COBBLESTONE]:{ solid: true,  transparent: false, name: 'Mossy Cobblestone',textures: [36,36,36,36,36,36],    stackSize: 64 },
  [BLOCK.TNT]:              { solid: true,  transparent: false, name: 'TNT',              textures: [37,38,39,39,39,39],    stackSize: 64 },
};

// Tool types
const TOOL = { HAND: 0, PICKAXE: 1, AXE: 2, SHOVEL: 3, HOE: 4, SWORD: 5 };

// Hardness values (seconds to break by hand)
const HARDNESS = {
  [BLOCK.GRASS]: 0.6,
  [BLOCK.DIRT]: 0.5,
  [BLOCK.STONE]: 7.5,
  [BLOCK.SAND]: 0.5,
  [BLOCK.LOG]: 2.0,
  [BLOCK.LEAVES]: 0.2,
  [BLOCK.COBBLESTONE]: 10.0,
  [BLOCK.PLANKS]: 2.0,
  [BLOCK.GLASS]: 0.3,
  [BLOCK.COAL_ORE]: 15.0,
  [BLOCK.IRON_ORE]: 15.0,
  [BLOCK.GOLD_ORE]: 15.0,
  [BLOCK.DIAMOND_ORE]: 15.0,
  [BLOCK.BEDROCK]: Infinity,
  [BLOCK.GRAVEL]: 0.6,
  [BLOCK.GLOWSTONE]: 0.3,
  [BLOCK.OBSIDIAN]: 50.0,
  [BLOCK.SANDSTONE]: 4.0,
  [BLOCK.SNOW]: 0.2,
  [BLOCK.ICE]: 0.5,
  [BLOCK.CRAFTING_TABLE]: 2.5,
  [BLOCK.FURNACE]: 17.5,
  [BLOCK.NETHERRACK]: 0.4,
  [BLOCK.BOOKSHELF]: 1.5,
  [BLOCK.BRICK]: 10.0,
  [BLOCK.MOSSY_COBBLESTONE]: 10.0,
  [BLOCK.TNT]: 0.0,
};

function getHardness(id) { return HARDNESS[id] || 0.5; }

function isSolid(id) {
  const def = BLOCK_DEF[id];
  return def ? def.solid : false;
}

function isTransparent(id) {
  const def = BLOCK_DEF[id];
  return def ? def.transparent : true;
}

function isLiquid(id) {
  const def = BLOCK_DEF[id];
  return def ? !!def.liquid : false;
}

function isCrossModel(id) {
  const def = BLOCK_DEF[id];
  return def ? !!def.crossModel : false;
}

function getTexture(id, face) {
  const def = BLOCK_DEF[id];
  return def ? def.textures[face] : 0;
}

function getBlockName(id) {
  const def = BLOCK_DEF[id];
  return def ? def.name : 'Unknown';
}

function getDrop(id) {
  const def = BLOCK_DEF[id];
  if (!def) return null;
  if (def.drops !== undefined) return def.drops;
  return id;
}
