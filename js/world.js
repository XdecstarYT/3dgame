'use strict';

const RENDER_DIST = 6;
const SEA_LEVEL = 62;
const WORLD_SEED = Math.random() * 10000 | 0;

class World {
  constructor(scene, material, waterMaterial) {
    this.scene = scene;
    this.material = material;
    this.waterMaterial = waterMaterial;
    this.chunks = new Map();
    this.pendingMesh = [];

    this.heightNoise = new SimplexNoise(WORLD_SEED);
    this.biomeNoise = new SimplexNoise(WORLD_SEED + 1);
    this.caveNoise = new SimplexNoise(WORLD_SEED + 2);
    this.detailNoise = new SimplexNoise(WORLD_SEED + 3);
    this.treeNoise = new SimplexNoise(WORLD_SEED + 4);
  }

  key(cx, cz) { return `${cx},${cz}`; }

  getChunk(cx, cz) { return this.chunks.get(this.key(cx, cz)); }

  getOrCreateChunk(cx, cz) {
    const k = this.key(cx, cz);
    if (!this.chunks.has(k)) {
      const chunk = new Chunk(cx, cz, this);
      this.generateChunk(chunk);
      this.chunks.set(k, chunk);
    }
    return this.chunks.get(k);
  }

  getBiome(wx, wz) {
    const t = (this.biomeNoise.noise2(wx * 0.003, wz * 0.003) + 1) / 2;
    const h = (this.biomeNoise.noise2(wx * 0.003 + 100, wz * 0.003 + 100) + 1) / 2;
    if (t < 0.25) return 'snow';
    if (t > 0.75 && h < 0.4) return 'desert';
    if (h > 0.7) return 'mountains';
    if (t > 0.55) return 'forest';
    return 'plains';
  }

  getHeight(wx, wz, biome) {
    let scale = 0.003, amplitude = 30, base = SEA_LEVEL;
    switch (biome) {
      case 'mountains': scale = 0.004; amplitude = 60; base = SEA_LEVEL - 5; break;
      case 'desert':    scale = 0.002; amplitude = 10; base = SEA_LEVEL + 2; break;
      case 'plains':    scale = 0.002; amplitude = 12; base = SEA_LEVEL + 1; break;
      case 'forest':    scale = 0.003; amplitude = 20; base = SEA_LEVEL; break;
      case 'snow':      scale = 0.003; amplitude = 25; base = SEA_LEVEL - 2; break;
    }
    const fbm = this.heightNoise.fbm2(wx * scale, wz * scale, 6, 0.5, 2.0);
    const detail = this.detailNoise.noise2(wx * 0.01, wz * 0.01) * 3;
    return Math.floor(base + fbm * amplitude + detail);
  }

  isCave(wx, wy, wz) {
    const n = this.caveNoise.noise3(wx * 0.05, wy * 0.05, wz * 0.05);
    const n2 = this.caveNoise.noise3(wx * 0.05 + 100, wy * 0.08 + 100, wz * 0.05 + 100);
    return Math.abs(n) < 0.1 && Math.abs(n2) < 0.1;
  }

  generateChunk(chunk) {
    const { cx, cz } = chunk;
    const data = chunk.data;

    for (let lx = 0; lx < CHUNK_W; lx++) {
      for (let lz = 0; lz < CHUNK_D; lz++) {
        const wx = cx * CHUNK_W + lx;
        const wz = cz * CHUNK_D + lz;
        const biome = this.getBiome(wx, wz);
        const height = Math.max(1, Math.min(CHUNK_H - 2, this.getHeight(wx, wz, biome)));

        for (let y = 0; y < CHUNK_H; y++) {
          const idx = chunk.blockIndex(lx, y, lz);

          if (y === 0) { data[idx] = BLOCK.BEDROCK; continue; }

          if (y <= height) {
            if (y === height) {
              // Surface block by biome
              switch (biome) {
                case 'desert':  data[idx] = BLOCK.SAND; break;
                case 'snow':    data[idx] = (y > SEA_LEVEL + 2) ? BLOCK.SNOW : BLOCK.GRASS; break;
                case 'mountains': data[idx] = (y > SEA_LEVEL + 20) ? BLOCK.STONE : BLOCK.GRASS; break;
                default:        data[idx] = BLOCK.GRASS; break;
              }
            } else if (y >= height - 3) {
              switch (biome) {
                case 'desert': data[idx] = BLOCK.SAND; break;
                default:       data[idx] = BLOCK.DIRT; break;
              }
            } else {
              data[idx] = BLOCK.STONE;

              // Ore generation
              const oreRng = this.treeNoise.noise3(wx * 0.1, y * 0.1, wz * 0.1);
              if (y < 16 && oreRng > 0.85)       data[idx] = BLOCK.DIAMOND_ORE;
              else if (y < 32 && oreRng > 0.80)  data[idx] = BLOCK.GOLD_ORE;
              else if (y < 64 && oreRng > 0.75)  data[idx] = BLOCK.IRON_ORE;
              else if (y < 80 && oreRng > 0.72)  data[idx] = BLOCK.COAL_ORE;

              // Gravel veins deep underground
              const gravelN = this.detailNoise.noise3(wx * 0.15, y * 0.15, wz * 0.15);
              if (gravelN > 0.85 && y < 40)      data[idx] = BLOCK.GRAVEL;
            }

            // Cave carving
            if (y > 5 && y < height - 1 && this.isCave(wx, y, wz)) {
              data[idx] = BLOCK.AIR;
            }
          } else if (y <= SEA_LEVEL && biome !== 'desert') {
            // Fill with water below sea level
            data[idx] = BLOCK.WATER;
          } else {
            data[idx] = BLOCK.AIR;
          }
        }
      }
    }

    // Second pass: surface features (trees, plants, etc.)
    this.generateFeatures(chunk);
    chunk.generated = true;
  }

  generateFeatures(chunk) {
    const { cx, cz } = chunk;
    const treeRng = new SimplexNoise(WORLD_SEED + cx * 1000 + cz);

    for (let lx = 0; lx < CHUNK_W; lx++) {
      for (let lz = 0; lz < CHUNK_D; lz++) {
        const wx = cx * CHUNK_W + lx;
        const wz = cz * CHUNK_D + lz;
        const biome = this.getBiome(wx, wz);

        // Find surface
        let surfaceY = 0;
        for (let y = CHUNK_H - 1; y >= 0; y--) {
          const id = chunk.getBlock(lx, y, lz);
          if (id !== BLOCK.AIR && id !== BLOCK.WATER) { surfaceY = y; break; }
        }

        if (surfaceY <= 0) continue;
        const surfaceBlock = chunk.getBlock(lx, surfaceY, lz);

        const rngVal = treeRng.noise2(wx * 0.3, wz * 0.3);
        const rngVal2 = treeRng.noise2(wx * 0.5 + 50, wz * 0.5 + 50);

        if (biome === 'desert') {
          // Sandstone structures and cacti (simplified: just sandstone)
          if (rngVal > 0.85 && surfaceBlock === BLOCK.SAND) {
            for (let sy = 1; sy <= 3; sy++) chunk.setBlock(lx, surfaceY + sy, lz, BLOCK.SANDSTONE);
          }
        } else if (biome !== 'snow' && surfaceBlock === BLOCK.GRASS) {
          // Trees
          const treeThresh = biome === 'forest' ? 0.7 : 0.82;
          if (rngVal > treeThresh && lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13) {
            this.placeTree(chunk, lx, surfaceY + 1, lz, rngVal2);
          } else if (rngVal > 0.5 && rngVal < 0.6) {
            // Tall grass
            chunk.setBlock(lx, surfaceY + 1, lz, BLOCK.TALL_GRASS);
          } else if (rngVal > 0.4 && rngVal < 0.42) {
            chunk.setBlock(lx, surfaceY + 1, lz, BLOCK.RED_FLOWER);
          } else if (rngVal > 0.38 && rngVal < 0.4) {
            chunk.setBlock(lx, surfaceY + 1, lz, BLOCK.YELLOW_FLOWER);
          }
        }
      }
    }
  }

  placeTree(chunk, x, y, z, variant) {
    const height = 4 + Math.floor(variant * 3);
    // Trunk
    for (let ty = 0; ty < height; ty++) {
      chunk.setBlock(x, y + ty, z, BLOCK.LOG);
    }
    // Leaves crown
    const leafStart = height - 2;
    for (let ty = leafStart; ty <= height + 1; ty++) {
      const radius = (ty <= height) ? 2 : 1;
      for (let lx = -radius; lx <= radius; lx++) {
        for (let lz = -radius; lz <= radius; lz++) {
          if (ty === height + 1 && Math.abs(lx) + Math.abs(lz) > 1) continue;
          if (lx === 0 && lz === 0 && ty <= height) continue;
          const bx = x + lx, bz = z + lz;
          if (bx >= 0 && bx < CHUNK_W && bz >= 0 && bz < CHUNK_D) {
            if (chunk.getBlock(bx, y + ty, bz) === BLOCK.AIR) {
              chunk.setBlock(bx, y + ty, bz, BLOCK.LEAVES);
            }
          }
        }
      }
    }
  }

  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= CHUNK_H) return 0;
    const cx = Math.floor(wx / CHUNK_W);
    const cz = Math.floor(wz / CHUNK_D);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0;
    const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const lz = ((wz % CHUNK_D) + CHUNK_D) % CHUNK_D;
    return chunk.getBlock(lx, wy, lz);
  }

  setBlock(wx, wy, wz, id) {
    if (wy < 0 || wy >= CHUNK_H) return;
    const cx = Math.floor(wx / CHUNK_W);
    const cz = Math.floor(wz / CHUNK_D);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return;
    const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const lz = ((wz % CHUNK_D) + CHUNK_D) % CHUNK_D;
    chunk.setBlock(lx, wy, lz, id);

    // Mark neighboring chunks dirty if on border
    if (lx === 0)        { const nc = this.getChunk(cx-1, cz); if (nc) nc.dirty = true; }
    if (lx === CHUNK_W-1){ const nc = this.getChunk(cx+1, cz); if (nc) nc.dirty = true; }
    if (lz === 0)        { const nc = this.getChunk(cx, cz-1); if (nc) nc.dirty = true; }
    if (lz === CHUNK_D-1){ const nc = this.getChunk(cx, cz+1); if (nc) nc.dirty = true; }
  }

  update(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_W);
    const pcz = Math.floor(playerZ / CHUNK_D);

    // Load nearby chunks
    for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++) {
      for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++) {
        if (dx*dx + dz*dz > RENDER_DIST * RENDER_DIST) continue;
        this.getOrCreateChunk(pcx + dx, pcz + dz);
      }
    }

    // Rebuild dirty chunks (limit per frame)
    let rebuilt = 0;
    for (const [, chunk] of this.chunks) {
      if (chunk.dirty && rebuilt < 2) {
        chunk.buildMesh(this.scene, this.material, this.waterMaterial);
        rebuilt++;
      }
    }

    // Unload distant chunks
    for (const [k, chunk] of this.chunks) {
      const [ccx, ccz] = k.split(',').map(Number);
      const dist = Math.max(Math.abs(ccx - pcx), Math.abs(ccz - pcz));
      if (dist > RENDER_DIST + 3) {
        chunk.dispose(this.scene);
        this.chunks.delete(k);
      }
    }
  }

  // Raycast from position in direction, returns { block, face, pos }
  raycast(origin, direction, maxDist = 6) {
    const step = 0.05;
    let x = origin.x, y = origin.y, z = origin.z;
    let prevX = x, prevY = y, prevZ = z;

    for (let d = 0; d < maxDist; d += step) {
      prevX = x; prevY = y; prevZ = z;
      x = origin.x + direction.x * d;
      y = origin.y + direction.y * d;
      z = origin.z + direction.z * d;

      const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
      const id = this.getBlock(bx, by, bz);

      if (id !== BLOCK.AIR && !isLiquid(id)) {
        const pbx = Math.floor(prevX), pby = Math.floor(prevY), pbz = Math.floor(prevZ);
        return {
          hit: true,
          block: { x: bx, y: by, z: bz, id },
          face: { x: pbx, y: pby, z: pbz },
          distance: d
        };
      }
    }
    return { hit: false };
  }
}
