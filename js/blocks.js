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

// Items (non-placeable). IDs start at 100 so they never collide with blocks.
const ITEM = {
  STICK: 100,
  COAL: 101,
  IRON_INGOT: 102,
  GOLD_INGOT: 103,
  DIAMOND: 104,
  APPLE: 105,
  BREAD: 106,
  WOOD_PICKAXE: 110, STONE_PICKAXE: 111, IRON_PICKAXE: 112, DIAMOND_PICKAXE: 113,
  WOOD_AXE: 114, STONE_AXE: 115, IRON_AXE: 116, DIAMOND_AXE: 117,
  WOOD_SHOVEL: 118, STONE_SHOVEL: 119, IRON_SHOVEL: 120, DIAMOND_SHOVEL: 121,
  WOOD_SWORD: 122, STONE_SWORD: 123, IRON_SWORD: 124, DIAMOND_SWORD: 125,
};

// Face indices: 0=top, 1=bottom, 2=north(-z), 3=south(+z), 4=west(-x), 5=east(+x)
const BLOCK_DEF = {
  [BLOCK.AIR]:              { solid: false, transparent: true,  name: 'Air',             textures: [0,0,0,0,0,0],          stackSize: 0 },
  [BLOCK.GRASS]:            { solid: true,  transparent: false, name: 'Grass Block',      textures: [1,2,3,3,3,3],          stackSize: 64, drops: BLOCK.DIRT, material: 'shovel' },
  [BLOCK.DIRT]:             { solid: true,  transparent: false, name: 'Dirt',             textures: [2,2,2,2,2,2],          stackSize: 64, material: 'shovel' },
  [BLOCK.STONE]:            { solid: true,  transparent: false, name: 'Stone',            textures: [4,4,4,4,4,4],          stackSize: 64, drops: BLOCK.COBBLESTONE, material: 'pickaxe', requiresTool: true },
  [BLOCK.SAND]:             { solid: true,  transparent: false, name: 'Sand',             textures: [5,5,5,5,5,5],          stackSize: 64, material: 'shovel', gravity: true },
  [BLOCK.WATER]:            { solid: false, transparent: true,  liquid: true, name: 'Water', textures: [6,6,6,6,6,6],       stackSize: 0 },
  [BLOCK.LOG]:              { solid: true,  transparent: false, name: 'Oak Log',          textures: [7,7,8,8,8,8],          stackSize: 64, material: 'axe' },
  [BLOCK.LEAVES]:           { solid: true,  transparent: true,  name: 'Oak Leaves',       textures: [9,9,9,9,9,9],          stackSize: 64 },
  [BLOCK.COBBLESTONE]:      { solid: true,  transparent: false, name: 'Cobblestone',      textures: [10,10,10,10,10,10],    stackSize: 64, material: 'pickaxe', requiresTool: true },
  [BLOCK.PLANKS]:           { solid: true,  transparent: false, name: 'Oak Planks',       textures: [11,11,11,11,11,11],    stackSize: 64, material: 'axe' },
  [BLOCK.GLASS]:            { solid: true,  transparent: true,  name: 'Glass',            textures: [12,12,12,12,12,12],    stackSize: 64 },
  [BLOCK.COAL_ORE]:         { solid: true,  transparent: false, name: 'Coal Ore',         textures: [13,13,13,13,13,13],    stackSize: 64, material: 'pickaxe', requiresTool: true, dropItem: ITEM.COAL },
  [BLOCK.IRON_ORE]:         { solid: true,  transparent: false, name: 'Iron Ore',         textures: [14,14,14,14,14,14],    stackSize: 64, material: 'pickaxe', requiresTool: true, dropItem: ITEM.IRON_INGOT },
  [BLOCK.GOLD_ORE]:         { solid: true,  transparent: false, name: 'Gold Ore',         textures: [15,15,15,15,15,15],    stackSize: 64, material: 'pickaxe', requiresTool: true, dropItem: ITEM.GOLD_INGOT },
  [BLOCK.DIAMOND_ORE]:      { solid: true,  transparent: false, name: 'Diamond Ore',      textures: [16,16,16,16,16,16],    stackSize: 64, material: 'pickaxe', requiresTool: true, dropItem: ITEM.DIAMOND },
  [BLOCK.BEDROCK]:          { solid: true,  transparent: false, name: 'Bedrock',          textures: [17,17,17,17,17,17],    stackSize: 0 },
  [BLOCK.GRAVEL]:           { solid: true,  transparent: false, name: 'Gravel',           textures: [18,18,18,18,18,18],    stackSize: 64, material: 'shovel', gravity: true },
  [BLOCK.GLOWSTONE]:        { solid: true,  transparent: false, name: 'Glowstone',        textures: [19,19,19,19,19,19],    stackSize: 64, emitsLight: true, lightLevel: 15 },
  [BLOCK.OBSIDIAN]:         { solid: true,  transparent: false, name: 'Obsidian',         textures: [20,20,20,20,20,20],    stackSize: 64, material: 'pickaxe', requiresTool: true },
  [BLOCK.SANDSTONE]:        { solid: true,  transparent: false, name: 'Sandstone',        textures: [21,22,23,23,23,23],    stackSize: 64, material: 'pickaxe', requiresTool: true },
  [BLOCK.SNOW]:             { solid: true,  transparent: false, name: 'Snow',             textures: [24,24,24,24,24,24],    stackSize: 64, material: 'shovel' },
  [BLOCK.ICE]:              { solid: true,  transparent: true,  name: 'Ice',              textures: [25,25,25,25,25,25],    stackSize: 64, material: 'pickaxe' },
  [BLOCK.CRAFTING_TABLE]:   { solid: true,  transparent: false, name: 'Crafting Table',   textures: [26,11,27,27,27,27],    stackSize: 64, material: 'axe' },
  [BLOCK.FURNACE]:          { solid: true,  transparent: false, name: 'Furnace',          textures: [4,4,28,4,4,4],         stackSize: 64, material: 'pickaxe', requiresTool: true },
  [BLOCK.TORCH]:            { solid: false, transparent: true,  name: 'Torch',            textures: [29,29,29,29,29,29],    stackSize: 64, emitsLight: true, lightLevel: 14, crossModel: true },
  [BLOCK.RED_FLOWER]:       { solid: false, transparent: true,  name: 'Rose',             textures: [30,30,30,30,30,30],    stackSize: 64, crossModel: true },
  [BLOCK.YELLOW_FLOWER]:    { solid: false, transparent: true,  name: 'Dandelion',        textures: [31,31,31,31,31,31],    stackSize: 64, crossModel: true },
  [BLOCK.TALL_GRASS]:       { solid: false, transparent: true,  name: 'Tall Grass',       textures: [32,32,32,32,32,32],    stackSize: 64, crossModel: true },
  [BLOCK.NETHERRACK]:       { solid: true,  transparent: false, name: 'Netherrack',       textures: [33,33,33,33,33,33],    stackSize: 64, material: 'pickaxe' },
  [BLOCK.BOOKSHELF]:        { solid: true,  transparent: false, name: 'Bookshelf',        textures: [11,11,34,34,34,34],    stackSize: 64, material: 'axe' },
  [BLOCK.BRICK]:            { solid: true,  transparent: false, name: 'Bricks',           textures: [35,35,35,35,35,35],    stackSize: 64, material: 'pickaxe', requiresTool: true },
  [BLOCK.MOSSY_COBBLESTONE]:{ solid: true,  transparent: false, name: 'Mossy Cobblestone',textures: [36,36,36,36,36,36],    stackSize: 64, material: 'pickaxe', requiresTool: true },
  [BLOCK.TNT]:              { solid: true,  transparent: false, name: 'TNT',              textures: [37,38,39,39,39,39],    stackSize: 64 },
};

// Tool material tiers and mining speed multipliers
const TIER = { WOOD: 1, STONE: 2, IRON: 3, DIAMOND: 4 };
const TIER_SPEED = { 1: 2, 2: 4, 3: 6, 4: 8 };
const TIER_ATTACK = { 1: 3, 2: 4, 3: 5, 4: 7 };

function mkTool(name, tool, tier, tile) {
  return { name, tool, tier, textures: [tile], stackSize: 1, isItem: true, attack: TIER_ATTACK[tier] + (tool === 'sword' ? 1 : 0) };
}

const ITEM_DEF = {
  [ITEM.STICK]:      { name: 'Stick',       textures: [40], stackSize: 64, isItem: true },
  [ITEM.COAL]:       { name: 'Coal',        textures: [41], stackSize: 64, isItem: true },
  [ITEM.IRON_INGOT]: { name: 'Iron Ingot',  textures: [42], stackSize: 64, isItem: true },
  [ITEM.GOLD_INGOT]: { name: 'Gold Ingot',  textures: [43], stackSize: 64, isItem: true },
  [ITEM.DIAMOND]:    { name: 'Diamond',     textures: [44], stackSize: 64, isItem: true },
  [ITEM.APPLE]:      { name: 'Apple',       textures: [45], stackSize: 64, isItem: true, food: 4 },
  [ITEM.BREAD]:      { name: 'Bread',       textures: [46], stackSize: 64, isItem: true, food: 5 },

  [ITEM.WOOD_PICKAXE]:    mkTool('Wooden Pickaxe', 'pickaxe', 1, 47),
  [ITEM.STONE_PICKAXE]:   mkTool('Stone Pickaxe',  'pickaxe', 2, 47),
  [ITEM.IRON_PICKAXE]:    mkTool('Iron Pickaxe',   'pickaxe', 3, 47),
  [ITEM.DIAMOND_PICKAXE]: mkTool('Diamond Pickaxe','pickaxe', 4, 47),
  [ITEM.WOOD_AXE]:        mkTool('Wooden Axe', 'axe', 1, 48),
  [ITEM.STONE_AXE]:       mkTool('Stone Axe',  'axe', 2, 48),
  [ITEM.IRON_AXE]:        mkTool('Iron Axe',   'axe', 3, 48),
  [ITEM.DIAMOND_AXE]:     mkTool('Diamond Axe','axe', 4, 48),
  [ITEM.WOOD_SHOVEL]:     mkTool('Wooden Shovel', 'shovel', 1, 49),
  [ITEM.STONE_SHOVEL]:    mkTool('Stone Shovel',  'shovel', 2, 49),
  [ITEM.IRON_SHOVEL]:     mkTool('Iron Shovel',   'shovel', 3, 49),
  [ITEM.DIAMOND_SHOVEL]:  mkTool('Diamond Shovel','shovel', 4, 49),
  [ITEM.WOOD_SWORD]:      mkTool('Wooden Sword', 'sword', 1, 50),
  [ITEM.STONE_SWORD]:     mkTool('Stone Sword',  'sword', 2, 50),
  [ITEM.IRON_SWORD]:      mkTool('Iron Sword',   'sword', 3, 50),
  [ITEM.DIAMOND_SWORD]:   mkTool('Diamond Sword','sword', 4, 50),
};

const HARDNESS = {
  [BLOCK.GRASS]: 0.6, [BLOCK.DIRT]: 0.5, [BLOCK.STONE]: 1.5, [BLOCK.SAND]: 0.5,
  [BLOCK.LOG]: 2.0, [BLOCK.LEAVES]: 0.2, [BLOCK.COBBLESTONE]: 2.0, [BLOCK.PLANKS]: 2.0,
  [BLOCK.GLASS]: 0.3, [BLOCK.COAL_ORE]: 3.0, [BLOCK.IRON_ORE]: 3.0, [BLOCK.GOLD_ORE]: 3.0,
  [BLOCK.DIAMOND_ORE]: 3.0, [BLOCK.BEDROCK]: Infinity, [BLOCK.GRAVEL]: 0.6, [BLOCK.GLOWSTONE]: 0.3,
  [BLOCK.OBSIDIAN]: 12.0, [BLOCK.SANDSTONE]: 0.8, [BLOCK.SNOW]: 0.2, [BLOCK.ICE]: 0.5,
  [BLOCK.CRAFTING_TABLE]: 2.5, [BLOCK.FURNACE]: 3.5, [BLOCK.NETHERRACK]: 0.4, [BLOCK.BOOKSHELF]: 1.5,
  [BLOCK.BRICK]: 2.0, [BLOCK.MOSSY_COBBLESTONE]: 2.0, [BLOCK.TNT]: 0.0, [BLOCK.TORCH]: 0.0,
  [BLOCK.RED_FLOWER]: 0.0, [BLOCK.YELLOW_FLOWER]: 0.0, [BLOCK.TALL_GRASS]: 0.0,
};

// ---- unified item/block helpers ----
function getDef(id) { return id >= 100 ? ITEM_DEF[id] : BLOCK_DEF[id]; }
function isItem(id) { return id >= 100; }
function isBlockId(id) { return id < 100 && BLOCK_DEF[id]; }
function getName(id) { const d = getDef(id); return d ? d.name : 'Unknown'; }
function getStackSize(id) { const d = getDef(id); return d ? (d.stackSize ?? 64) : 64; }
function getItemTile(id) {
  const d = getDef(id);
  if (!d) return 0;
  return d.textures[0];
}
function getToolInfo(id) { const d = ITEM_DEF[id]; return (d && d.tool) ? { tool: d.tool, tier: d.tier, attack: d.attack } : null; }
function getAttackDamage(id) { const t = getToolInfo(id); return t ? t.attack : 1; }

function getHardness(id) { return HARDNESS[id] !== undefined ? HARDNESS[id] : 0.5; }
function isSolid(id) { const d = BLOCK_DEF[id]; return d ? d.solid : false; }
function isTransparent(id) { const d = BLOCK_DEF[id]; return d ? d.transparent : true; }
function isLiquid(id) { const d = BLOCK_DEF[id]; return d ? !!d.liquid : false; }
function isCrossModel(id) { const d = BLOCK_DEF[id]; return d ? !!d.crossModel : false; }
function getTexture(id, face) { const d = BLOCK_DEF[id]; return d ? d.textures[face] : 0; }
function getBlockName(id) { return getName(id); }

// Returns the item id dropped when a block is broken (or null if nothing)
function getDrop(id) {
  const d = BLOCK_DEF[id];
  if (!d) return null;
  if (d.dropItem !== undefined) return d.dropItem;
  if (d.drops !== undefined) return d.drops;
  return id;
}

// Mining-speed multiplier for a tool on a block (1 = bare hand baseline)
function getMiningMultiplier(blockId, heldId) {
  const t = getToolInfo(heldId);
  const def = BLOCK_DEF[blockId];
  if (!t || !def) return 1;
  if (def.material === t.tool) return TIER_SPEED[t.tier];
  return 1;
}

// Will the block actually drop when broken with this held item?
function blockWillDrop(blockId, heldId) {
  const def = BLOCK_DEF[blockId];
  if (!def) return false;
  if (!def.requiresTool) return true;
  const t = getToolInfo(heldId);
  return !!(t && t.tool === def.material);
}
