'use strict';

const CHUNK_W = 16;
const CHUNK_H = 128;
const CHUNK_D = 16;

// Face directions: top, bottom, north(-z), south(+z), west(-x), east(+x)
const FACES = [
  { dir: [0,1,0],  normal: [0,1,0],  corners: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]], shade: 1.0 },  // top
  { dir: [0,-1,0], normal: [0,-1,0], corners: [[1,0,0],[0,0,0],[0,0,1],[1,0,1]], shade: 0.5 },  // bottom
  { dir: [0,0,-1], normal: [0,0,-1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], shade: 0.8 },  // north
  { dir: [0,0,1],  normal: [0,0,1],  corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], shade: 0.8 },  // south
  { dir: [-1,0,0], normal: [-1,0,0], corners: [[0,0,1],[0,0,0],[0,1,0],[0,1,1]], shade: 0.6 },  // west
  { dir: [1,0,0],  normal: [1,0,0],  corners: [[1,0,0],[1,0,1],[1,1,1],[1,1,0]], shade: 0.6 },  // east
];

// Cross model quads for plants/torches
const CROSS_FACES = [
  { corners: [[0.15,0,0.85],[0.85,0,0.15],[0.85,1,0.15],[0.15,1,0.85]] },
  { corners: [[0.85,0,0.85],[0.15,0,0.15],[0.15,1,0.15],[0.85,1,0.85]] },
];

const AO_MULT = [0.45, 0.62, 0.81, 1.0];

// Does light pass through this block?
function lightPasses(id) {
  const d = BLOCK_DEF[id];
  if (!d) return true;
  return d.transparent || !d.solid;
}
// Does this block occlude for ambient occlusion? (opaque solids only)
function aoOccludes(id) {
  const d = BLOCK_DEF[id];
  return d ? (d.solid && !d.transparent) : false;
}

class Chunk {
  constructor(cx, cz, world) {
    this.cx = cx;
    this.cz = cz;
    this.world = world;
    this.data = new Uint8Array(CHUNK_W * CHUNK_H * CHUNK_D);
    this.skyLight = null;
    this.blockLight = null;
    this.mesh = null;
    this.waterMesh = null;
    this.dirty = true;
    this.generated = false;
    this.modified = false; // has the player edited this chunk? (for saving)
  }

  blockIndex(x, y, z) {
    return x + z * CHUNK_W + y * CHUNK_W * CHUNK_D;
  }

  getBlock(x, y, z) {
    if (x < 0 || x >= CHUNK_W || z < 0 || z >= CHUNK_D || y < 0 || y >= CHUNK_H) return 0;
    return this.data[this.blockIndex(x, y, z)];
  }

  setBlock(x, y, z, id) {
    if (x < 0 || x >= CHUNK_W || z < 0 || z >= CHUNK_D || y < 0 || y >= CHUNK_H) return;
    this.data[this.blockIndex(x, y, z)] = id;
    this.dirty = true;
  }

  getBlockWorld(lx, ly, lz) {
    if (ly < 0 || ly >= CHUNK_H) return 0;
    if (lx >= 0 && lx < CHUNK_W && lz >= 0 && lz < CHUNK_D) {
      return this.data[this.blockIndex(lx, ly, lz)];
    }
    const wcx = this.cx + Math.floor(lx / CHUNK_W);
    const wcz = this.cz + Math.floor(lz / CHUNK_D);
    const nx = ((lx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const nz = ((lz % CHUNK_D) + CHUNK_D) % CHUNK_D;
    const neighbor = this.world.getChunk(wcx, wcz);
    if (!neighbor) return 0;
    return neighbor.data[neighbor.blockIndex(nx, ly, nz)];
  }

  // ---- Lighting: flood-fill skylight (top-down) + block light from emitters ----
  computeLight() {
    const W = CHUNK_W, H = CHUNK_H, D = CHUNK_D, N = W * H * D;
    const sky = new Uint8Array(N);
    const blk = new Uint8Array(N);
    const data = this.data;
    const idx = (x, y, z) => x + z * W + y * W * D;

    // Skylight: each column lit 15 from the top down until first opaque block
    const q = new Int32Array(N);
    let qn = 0;
    for (let x = 0; x < W; x++) {
      for (let z = 0; z < D; z++) {
        let y = H - 1;
        while (y >= 0 && lightPasses(data[idx(x, y, z)])) { sky[idx(x, y, z)] = 15; y--; }
      }
    }
    for (let i = 0; i < N; i++) if (sky[i] === 15) q[qn++] = i;

    let head = 0;
    while (head < qn) {
      const i = q[head++];
      const l = sky[i];
      const y = (i / (W * D)) | 0;
      const rem = i - y * W * D;
      const z = (rem / W) | 0;
      const x = rem - z * W;
      // down keeps full level; others lose 1
      if (y > 0) { const j = idx(x, y - 1, z); if (lightPasses(data[j]) && sky[j] < l) { sky[j] = l; if (qn < N) q[qn++] = j; } }
      const nl = l - 1;
      if (nl > 0) {
        if (y < H - 1) { const j = idx(x, y + 1, z); if (lightPasses(data[j]) && sky[j] < nl) { sky[j] = nl; if (qn < N) q[qn++] = j; } }
        if (x > 0)     { const j = idx(x - 1, y, z); if (lightPasses(data[j]) && sky[j] < nl) { sky[j] = nl; if (qn < N) q[qn++] = j; } }
        if (x < W - 1) { const j = idx(x + 1, y, z); if (lightPasses(data[j]) && sky[j] < nl) { sky[j] = nl; if (qn < N) q[qn++] = j; } }
        if (z > 0)     { const j = idx(x, y, z - 1); if (lightPasses(data[j]) && sky[j] < nl) { sky[j] = nl; if (qn < N) q[qn++] = j; } }
        if (z < D - 1) { const j = idx(x, y, z + 1); if (lightPasses(data[j]) && sky[j] < nl) { sky[j] = nl; if (qn < N) q[qn++] = j; } }
      }
    }

    // Block light from emitters
    const q2 = [];
    for (let i = 0; i < N; i++) {
      const d = BLOCK_DEF[data[i]];
      if (d && d.emitsLight) { blk[i] = d.lightLevel || 14; q2.push(i); }
    }
    head = 0;
    while (head < q2.length) {
      const i = q2[head++];
      const nl = blk[i] - 1;
      if (nl <= 0) continue;
      const y = (i / (W * D)) | 0;
      const rem = i - y * W * D;
      const z = (rem / W) | 0;
      const x = rem - z * W;
      const spread = (j) => { if (lightPasses(data[j]) && blk[j] < nl) { blk[j] = nl; q2.push(j); } };
      if (y > 0) spread(idx(x, y - 1, z));
      if (y < H - 1) spread(idx(x, y + 1, z));
      if (x > 0) spread(idx(x - 1, y, z));
      if (x < W - 1) spread(idx(x + 1, y, z));
      if (z > 0) spread(idx(x, y, z - 1));
      if (z < D - 1) spread(idx(x, y, z + 1));
    }

    this.skyLight = sky;
    this.blockLight = blk;
  }

  // Light at local coords (may reach into neighbors / out of world)
  getLightLocal(x, y, z) {
    if (y < 0) return SAMPLE_DARK;
    if (y >= CHUNK_H) return SAMPLE_SKY;
    if (x >= 0 && x < CHUNK_W && z >= 0 && z < CHUNK_D) {
      const i = this.blockIndex(x, y, z);
      return [this.skyLight ? this.skyLight[i] : 15, this.blockLight ? this.blockLight[i] : 0];
    }
    return this.world.getLightWorld(this.cx * CHUNK_W + x, y, this.cz * CHUNK_D + z);
  }

  buildMesh(scene, material, waterMaterial) {
    this.computeLight();

    if (this.mesh) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh = null; }
    if (this.waterMesh) { scene.remove(this.waterMesh); this.waterMesh.geometry.dispose(); this.waterMesh = null; }

    const positions = [], uvs = [], lights = [], indices = [];
    const wPositions = [], wUvs = [], wLights = [], wIndices = [];
    let vi = 0, wvi = 0;

    const atlasCols = TextureAtlas.COLS;
    const atlasRows = TextureAtlas.ROWS;

    for (let y = 0; y < CHUNK_H; y++) {
      for (let z = 0; z < CHUNK_D; z++) {
        for (let x = 0; x < CHUNK_W; x++) {
          const id = this.data[this.blockIndex(x, y, z)];
          if (id === BLOCK.AIR) continue;
          const def = BLOCK_DEF[id];
          if (!def) continue;

          const wx = this.cx * CHUNK_W + x;
          const wz = this.cz * CHUNK_D + z;

          if (def.crossModel) {
            const tileIdx = def.textures[0];
            const col = tileIdx % atlasCols, row = Math.floor(tileIdx / atlasCols);
            const u0 = col / atlasCols, v0 = row / atlasRows;
            const u1 = (col + 1) / atlasCols, v1 = (row + 1) / atlasRows;
            const [sk, bl] = this.getLightLocal(x, y, z);
            const ls = sk / 15, lb = bl / 15;
            for (const cf of CROSS_FACES) {
              const faceUvs = [[u0,v1],[u1,v1],[u1,v0],[u0,v0]];
              for (let i = 0; i < 4; i++) {
                const [cx2, cy2, cz2] = cf.corners[i];
                positions.push(wx + cx2, y + cy2, wz + cz2);
                uvs.push(faceUvs[i][0], faceUvs[i][1]);
                lights.push(ls, lb, 1.0);
              }
              indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
              vi += 4;
            }
            continue;
          }

          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const [dx, dy, dz] = face.dir;
            const neighbor = this.getBlockWorld(x + dx, y + dy, z + dz);
            const neighborDef = BLOCK_DEF[neighbor];

            let showFace = false;
            if (neighbor === BLOCK.AIR) showFace = true;
            else if (neighborDef && neighborDef.transparent && neighbor !== id) showFace = true;

            if (!showFace) continue;

            const tileIdx = def.textures[f];
            const col = tileIdx % atlasCols, row = Math.floor(tileIdx / atlasCols);
            const u0 = col / atlasCols, v0 = row / atlasRows;
            const u1 = (col + 1) / atlasCols, v1 = (row + 1) / atlasRows;
            const faceUvs = [[u0,v1],[u1,v1],[u1,v0],[u0,v0]];

            // light sampled from the air cell this face looks into
            const [sk, bl] = this.getLightLocal(x + dx, y + dy, z + dz);
            const ls = sk / 15, lb = bl / 15;

            // AO per corner in the P-layer (block + normal)
            const nax = [], aWhich = [];
            for (let a = 0; a < 3; a++) if (face.normal[a] === 0) aWhich.push(a);

            const isLiquid2 = !!def.liquid;
            const tPos = isLiquid2 ? wPositions : positions;
            const tUvs = isLiquid2 ? wUvs : uvs;
            const tLight = isLiquid2 ? wLights : lights;
            const tIdx = isLiquid2 ? wIndices : indices;
            const baseVi = isLiquid2 ? wvi : vi;

            for (let i = 0; i < 4; i++) {
              const c = face.corners[i];
              const sA = c[aWhich[0]] === 1 ? 1 : -1;
              const sB = c[aWhich[1]] === 1 ? 1 : -1;
              const o1 = [0,0,0], o2 = [0,0,0], oc = [0,0,0];
              o1[aWhich[0]] = sA;
              o2[aWhich[1]] = sB;
              oc[aWhich[0]] = sA; oc[aWhich[1]] = sB;
              const px = x + dx, py = y + dy, pz = z + dz;
              const s1 = aoOccludes(this.getBlockWorld(px + o1[0], py + o1[1], pz + o1[2]));
              const s2 = aoOccludes(this.getBlockWorld(px + o2[0], py + o2[1], pz + o2[2]));
              const cc = aoOccludes(this.getBlockWorld(px + oc[0], py + oc[1], pz + oc[2]));
              let aoLvl;
              if (s1 && s2) aoLvl = 0; else aoLvl = 3 - ((s1?1:0) + (s2?1:0) + (cc?1:0));
              const ao = AO_MULT[aoLvl] * face.shade;

              const cy2 = isLiquid2 ? (c[1] === 1 ? 0.88 : 0) : c[1];
              tPos.push(wx + c[0], y + cy2, wz + c[2]);
              tUvs.push(faceUvs[i][0], faceUvs[i][1]);
              tLight.push(ls, lb, ao);
            }
            tIdx.push(baseVi, baseVi+1, baseVi+2, baseVi, baseVi+2, baseVi+3);
            if (isLiquid2) wvi += 4; else vi += 4;
          }
        }
      }
    }

    if (positions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('aLight', new THREE.Float32BufferAttribute(lights, 3));
      geo.setIndex(indices);
      geo.computeBoundingSphere();
      this.mesh = new THREE.Mesh(geo, material);
      scene.add(this.mesh);
    }

    if (wPositions.length > 0) {
      const wgeo = new THREE.BufferGeometry();
      wgeo.setAttribute('position', new THREE.Float32BufferAttribute(wPositions, 3));
      wgeo.setAttribute('uv', new THREE.Float32BufferAttribute(wUvs, 2));
      wgeo.setAttribute('aLight', new THREE.Float32BufferAttribute(wLights, 3));
      wgeo.setIndex(wIndices);
      wgeo.computeBoundingSphere();
      this.waterMesh = new THREE.Mesh(wgeo, waterMaterial);
      scene.add(this.waterMesh);
    }

    this.dirty = false;
  }

  dispose(scene) {
    if (this.mesh) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh = null; }
    if (this.waterMesh) { scene.remove(this.waterMesh); this.waterMesh.geometry.dispose(); this.waterMesh = null; }
  }
}

const SAMPLE_SKY = [15, 0];
const SAMPLE_DARK = [0, 0];
