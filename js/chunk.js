'use strict';

const CHUNK_W = 16;
const CHUNK_H = 128;
const CHUNK_D = 16;

// Face directions: top, bottom, north(-z), south(+z), west(-x), east(+x)
const FACES = [
  { dir: [0,1,0],  normal: [0,1,0],  corners: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]] },  // top
  { dir: [0,-1,0], normal: [0,-1,0], corners: [[1,0,0],[0,0,0],[0,0,1],[1,0,1]] },  // bottom
  { dir: [0,0,-1], normal: [0,0,-1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] },  // north
  { dir: [0,0,1],  normal: [0,0,1],  corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },  // south
  { dir: [-1,0,0], normal: [-1,0,0], corners: [[0,0,1],[0,0,0],[0,1,0],[0,1,1]] },  // west
  { dir: [1,0,0],  normal: [1,0,0],  corners: [[1,0,0],[1,0,1],[1,1,1],[1,1,0]] },  // east
];

// Cross model quads for plants/torches
const CROSS_FACES = [
  { corners: [[0.15,0,0.85],[0.85,0,0.15],[0.85,1,0.15],[0.15,1,0.85]] },
  { corners: [[0.85,0,0.85],[0.15,0,0.15],[0.15,1,0.15],[0.85,1,0.85]] },
];

class Chunk {
  constructor(cx, cz, world) {
    this.cx = cx;
    this.cz = cz;
    this.world = world;
    this.data = new Uint8Array(CHUNK_W * CHUNK_H * CHUNK_D);
    this.mesh = null;
    this.waterMesh = null;
    this.dirty = true;
    this.generated = false;
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

  // Get block considering neighbor chunks too
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

  buildMesh(scene, material, waterMaterial) {
    if (this.mesh) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh = null; }
    if (this.waterMesh) { scene.remove(this.waterMesh); this.waterMesh.geometry.dispose(); this.waterMesh = null; }

    const positions = [], normals = [], uvs = [], indices = [];
    const wPositions = [], wNormals = [], wUvs = [], wIndices = [];
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
            // Draw X cross for plants
            const tileIdx = def.textures[0];
            const col = tileIdx % atlasCols;
            const row = Math.floor(tileIdx / atlasCols);
            const u0 = col / atlasCols, v0 = row / atlasRows;
            const u1 = (col + 1) / atlasCols, v1 = (row + 1) / atlasRows;

            for (const cf of CROSS_FACES) {
              const faceUvs = [[u0,v1],[u1,v1],[u1,v0],[u0,v0]];
              for (let i = 0; i < 4; i++) {
                const [cx2, cy2, cz2] = cf.corners[i];
                positions.push(wx + cx2, y + cy2, wz + cz2);
                normals.push(0, 1, 0);
                uvs.push(faceUvs[i][0], faceUvs[i][1]);
              }
              indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
              vi += 4;
            }
            continue;
          }

          // Standard block faces
          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const [dx, dy, dz] = face.dir;
            const nx2 = x + dx, ny2 = y + dy, nz2 = z + dz;
            const neighbor = this.getBlockWorld(nx2, ny2, nz2);
            const neighborDef = BLOCK_DEF[neighbor];

            // Show face if neighbor is transparent (or air), but don't show water-water faces
            let showFace = false;
            if (neighbor === BLOCK.AIR) {
              showFace = true;
            } else if (neighborDef && neighborDef.transparent && neighbor !== id) {
              showFace = true;
            } else if (def.liquid && neighbor !== id && neighborDef && neighborDef.transparent) {
              showFace = true;
            }

            if (!showFace) continue;

            const tileIdx = def.textures[f];
            const col = tileIdx % atlasCols;
            const row = Math.floor(tileIdx / atlasCols);
            const u0 = col / atlasCols, v0 = row / atlasRows;
            const u1 = (col + 1) / atlasCols, v1 = (row + 1) / atlasRows;

            const faceUvs = [[u0,v1],[u1,v1],[u1,v0],[u0,v0]];

            // Ambient occlusion per vertex
            const aoFactor = f === 0 ? 1.0 : f === 1 ? 0.6 : 0.8;

            const targetPos = def.liquid ? wPositions : positions;
            const targetNorm = def.liquid ? wNormals : normals;
            const targetUvs = def.liquid ? wUvs : uvs;
            const targetIdx = def.liquid ? wIndices : indices;
            const targetVi = def.liquid ? { v: wvi } : { v: vi };

            const corners = face.corners;
            for (let i = 0; i < 4; i++) {
              const [cx2, cy2, cz2] = corners[i];
              const py2 = def.liquid ? (cy2 === 1 ? 0.88 : 0) : cy2; // water slightly lower
              targetPos.push(wx + cx2, y + py2, wz + cz2);
              targetNorm.push(...face.normal);
              targetUvs.push(faceUvs[i][0], faceUvs[i][1]);
            }

            const baseVi = def.liquid ? wvi : vi;
            targetIdx.push(baseVi, baseVi+1, baseVi+2, baseVi, baseVi+2, baseVi+3);

            if (def.liquid) wvi += 4;
            else vi += 4;
          }
        }
      }
    }

    if (positions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeBoundingSphere();
      this.mesh = new THREE.Mesh(geo, material);
      this.mesh.receiveShadow = true;
      this.mesh.castShadow = false;
      scene.add(this.mesh);
    }

    if (wPositions.length > 0) {
      const wgeo = new THREE.BufferGeometry();
      wgeo.setAttribute('position', new THREE.Float32BufferAttribute(wPositions, 3));
      wgeo.setAttribute('normal', new THREE.Float32BufferAttribute(wNormals, 3));
      wgeo.setAttribute('uv', new THREE.Float32BufferAttribute(wUvs, 2));
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
