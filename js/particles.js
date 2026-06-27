'use strict';

// Approximate solid colors per block for particles / drops tint fallback.
const BLOCK_PARTICLE_COLOR = {
  [BLOCK.GRASS]: 0x6a9a3a, [BLOCK.DIRT]: 0x866043, [BLOCK.STONE]: 0x808080,
  [BLOCK.SAND]: 0xdbc482, [BLOCK.LOG]: 0x6e4a28, [BLOCK.LEAVES]: 0x3a8a2d,
  [BLOCK.COBBLESTONE]: 0x787878, [BLOCK.PLANKS]: 0xa5734b, [BLOCK.GLASS]: 0xa0d2f0,
  [BLOCK.COAL_ORE]: 0x4a4a4a, [BLOCK.IRON_ORE]: 0x9a8a7a, [BLOCK.GOLD_ORE]: 0xb0a040,
  [BLOCK.DIAMOND_ORE]: 0x5ab0c0, [BLOCK.GRAVEL]: 0x786e68, [BLOCK.SANDSTONE]: 0xc8b478,
  [BLOCK.SNOW]: 0xf0f2f8, [BLOCK.ICE]: 0x90c0e0,
};
function particleColor(id) { return BLOCK_PARTICLE_COLOR[id] || 0x888888; }

class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.drops = [];
    this._sharedGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  }

  spawnBreak(bx, by, bz, id) {
    const color = particleColor(id);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshLambertMaterial({ color });
      const m = new THREE.Mesh(this._sharedGeo, mat);
      m.position.set(bx + Math.random(), by + Math.random(), bz + Math.random());
      m.scale.setScalar(0.6 + Math.random() * 0.8);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3((Math.random()-0.5)*4, Math.random()*4+1, (Math.random()-0.5)*4),
        life: 0.6 + Math.random() * 0.4, age: 0,
      });
    }
  }

  spawnDrop(bx, by, bz, id, world) {
    const def = BLOCK_DEF[id];
    if (!def) return;
    const mat = new THREE.MeshLambertMaterial({ color: particleColor(id) });
    // try to use atlas texture if available for nicer drops
    if (window._dropTexture) mat.map = window._dropTexture;
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(bx + 0.5, by + 0.4, bz + 0.5);
    m.castShadow = true;
    this.scene.add(m);
    this.drops.push({
      mesh: m, geo, id, count: 1,
      vel: new THREE.Vector3((Math.random()-0.5)*1.5, 2, (Math.random()-0.5)*1.5),
      age: 0, world,
    });
  }

  update(dt, player, inventory) {
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.scene.remove(p.mesh); p.mesh.material.dispose();
        this.particles.splice(i, 1); continue;
      }
      p.vel.y -= 18 * dt;
      p.mesh.position.x += p.vel.x * dt;
      p.mesh.position.y += p.vel.y * dt;
      p.mesh.position.z += p.vel.z * dt;
      const s = Math.max(0.01, 1 - p.age / p.life);
      p.mesh.scale.setScalar(s);
    }

    // Drops: gravity, settle, bob, spin, pickup
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      d.vel.y -= 18 * dt;
      const np = d.mesh.position.clone();
      np.y += d.vel.y * dt;
      np.x += d.vel.x * dt;
      np.z += d.vel.z * dt;
      // ground collision
      const below = d.world.getBlock(Math.floor(np.x), Math.floor(np.y - 0.15), Math.floor(np.z));
      if (isSolid(below) && d.vel.y < 0) {
        np.y = Math.floor(np.y - 0.15) + 1 + 0.2;
        d.vel.set(0, 0, 0);
      }
      d.mesh.position.copy(np);
      d.mesh.rotation.y += dt * 2;
      d.mesh.position.y += Math.sin(d.age * 3) * 0.0015;

      // pickup
      const dx = player.position.x - d.mesh.position.x;
      const dy = (player.position.y + 0.9) - d.mesh.position.y;
      const dz = player.position.z - d.mesh.position.z;
      if (d.age > 0.5 && dx*dx + dy*dy + dz*dz < 1.6*1.6) {
        inventory.addItem(d.id, d.count);
        AudioManager.playSound('item_pickup');
        this.scene.remove(d.mesh); d.geo.dispose(); d.mesh.material.dispose();
        this.drops.splice(i, 1);
        continue;
      }
      if (d.age > 300) { this.scene.remove(d.mesh); d.geo.dispose(); d.mesh.material.dispose(); this.drops.splice(i, 1); }
    }
  }
}
