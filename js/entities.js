'use strict';

// Mob system: multi-part animated models + simple AI + combat.
class EntityManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.entities = [];
    this.spawnTimer = 0;
  }

  spawnMob(type, x, y, z) {
    const mob = new Mob(type, x, y, z, this.scene, this.world);
    this.entities.push(mob);
    return mob;
  }

  update(dt, player) {
    // Periodic spawning near the player (cap total)
    this.spawnTimer += dt;
    if (this.spawnTimer > 4 && this.entities.length < 16) {
      this.spawnTimer = 0;
      const { x, z } = player.position;
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 14;
      const mx = Math.floor(x + Math.cos(angle) * dist);
      const mz = Math.floor(z + Math.sin(angle) * dist);
      let my = -1;
      for (let y = CHUNK_H - 1; y > 1; y--) {
        if (isSolid(this.world.getBlock(mx, y, mz))) { my = y + 1; break; }
      }
      if (my > 0 && my < CHUNK_H - 5) {
        const night = window._game && (window._game.timeOfDay > 0.5);
        const passive = ['pig', 'cow', 'sheep'];
        const hostile = ['zombie', 'creeper', 'skeleton'];
        // hostiles mostly at night, passives during day
        const pool = night ? (Math.random() < 0.7 ? hostile : passive) : (Math.random() < 0.7 ? passive : hostile);
        const type = pool[Math.floor(Math.random() * pool.length)];
        this.spawnMob(type, mx + 0.5, my, mz + 0.5);
      }
    }

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const mob = this.entities[i];
      mob.update(dt, player);
      const dx = mob.position.x - player.position.x;
      const dz = mob.position.z - player.position.z;
      if (dx*dx + dz*dz > 70*70 || mob.dead) {
        if (mob.dead) {
          mob.dropLoot();
          if (window._game && !player.creative) window._game.addXp(5);
        }
        mob.dispose(this.scene);
        this.entities.splice(i, 1);
      }
    }
  }

  // Nearest mob the player is looking at, within melee range
  getTargetMob(player) {
    const eye = player.camera.position;
    const look = player.getLookDir();
    let best = null, bestDist = 3.8;
    for (const mob of this.entities) {
      if (mob.dead) continue;
      const cx = mob.position.x - eye.x;
      const cy = (mob.position.y + mob.height * 0.5) - eye.y;
      const cz = mob.position.z - eye.z;
      const d = Math.sqrt(cx*cx + cy*cy + cz*cz);
      if (d > 3.8) continue;
      const dot = (cx*look.x + cy*look.y + cz*look.z) / (d || 1);
      if (dot > 0.65 && d < bestDist) { bestDist = d; best = mob; }
    }
    return best;
  }

  dispose() {
    for (const mob of this.entities) mob.dispose(this.scene);
    this.entities = [];
  }
}

const MOB_INFO = {
  zombie:   { hp: 20, speed: 2.6, hostile: true,  dmg: 3, color: 0x3a8a3a, skin: 0x4a7a4a, family: 'humanoid' },
  skeleton: { hp: 20, speed: 2.8, hostile: true,  dmg: 2, color: 0xdadad0, skin: 0xc8c8be, family: 'humanoid' },
  creeper:  { hp: 20, speed: 2.4, hostile: true,  dmg: 0, color: 0x4fd14f, skin: 0x3fa83f, family: 'creeper' },
  pig:      { hp: 10, speed: 1.6, hostile: false, dmg: 0, color: 0xf0a8b8, skin: 0xe090a0, family: 'quad' },
  cow:      { hp: 10, speed: 1.5, hostile: false, dmg: 0, color: 0x5a4632, skin: 0x3a2c1e, family: 'quad' },
  sheep:    { hp: 8,  speed: 1.6, hostile: false, dmg: 0, color: 0xeeeae0, skin: 0xd8d2c4, family: 'quad' },
};

class Mob {
  constructor(type, x, y, z, scene, world) {
    this.type = type;
    this.info = MOB_INFO[type] || MOB_INFO.pig;
    this.world = world;
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = Math.random() * Math.PI * 2;
    this.dead = false;
    this.health = this.info.hp;
    this.aiTimer = Math.random() * 2;
    this.onGround = false;
    this.walkPhase = 0;
    this.attackCd = 0;
    this.hurtFlash = 0;

    const [w, h] = this._size();
    this.width = w; this.height = h;

    this.group = new THREE.Group();
    this.legs = [];
    this._buildModel();
    this.group.position.set(x, y, z);
    scene.add(this.group);
  }

  _size() {
    switch (this.info.family) {
      case 'humanoid': return [0.6, 1.8];
      case 'creeper':  return [0.6, 1.7];
      default:         return [0.9, 1.3];
    }
  }

  _box(w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y, z);
    m.castShadow = true;
    this.group.add(m);
    return m;
  }

  _buildModel() {
    const c = this.info.color, sk = this.info.skin;
    if (this.info.family === 'humanoid') {
      this.body = this._box(0.5, 0.6, 0.28, c, 0, 1.05, 0);
      this.head = this._box(0.5, 0.5, 0.5, sk, 0, 1.6, 0);
      this._eyes(0.25);
      const armL = this._box(0.18, 0.6, 0.22, sk, -0.34, 1.05, 0);
      const armR = this._box(0.18, 0.6, 0.22, sk, 0.34, 1.05, 0);
      const legL = this._box(0.2, 0.6, 0.24, c, -0.13, 0.45, 0);
      const legR = this._box(0.2, 0.6, 0.24, c, 0.13, 0.45, 0);
      this.legs = [legL, legR, armR, armL]; // arms swing opposite
    } else if (this.info.family === 'creeper') {
      this.body = this._box(0.5, 0.85, 0.32, c, 0, 1.0, 0);
      this.head = this._box(0.5, 0.5, 0.5, c, 0, 1.55, 0);
      this._eyes(0.25, 0x101010);
      const fl = this._box(0.22, 0.35, 0.22, c, -0.14, 0.18, 0.18);
      const fr = this._box(0.22, 0.35, 0.22, c, 0.14, 0.18, 0.18);
      const bl = this._box(0.22, 0.35, 0.22, c, -0.14, 0.18, -0.18);
      const br = this._box(0.22, 0.35, 0.22, c, 0.14, 0.18, -0.18);
      this.legs = [fl, br, fr, bl];
    } else { // quadruped
      this.body = this._box(0.6, 0.55, 1.0, c, 0, 0.85, 0);
      this.head = this._box(0.45, 0.45, 0.45, sk, 0, 0.95, 0.6);
      this._eyes(0.95, 0x101010, 0.62, 0.23);
      if (this.type === 'sheep') this._box(0.7, 0.6, 1.05, 0xf4f0e8, 0, 0.9, -0.05); // wool
      const fl = this._box(0.2, 0.5, 0.2, sk, -0.2, 0.25, 0.32);
      const fr = this._box(0.2, 0.5, 0.2, sk, 0.2, 0.25, 0.32);
      const bl = this._box(0.2, 0.5, 0.2, sk, -0.2, 0.25, -0.32);
      const br = this._box(0.2, 0.5, 0.2, sk, 0.2, 0.25, -0.32);
      this.legs = [fl, br, fr, bl];
    }
  }

  _eyes(y, color = 0xffffff, z, spread = 0.12) {
    const ez = z !== undefined ? z : 0.26;
    const g = new THREE.BoxGeometry(0.1, 0.1, 0.05);
    const m = new THREE.MeshBasicMaterial({ color });
    const e1 = new THREE.Mesh(g, m), e2 = new THREE.Mesh(g, m);
    e1.position.set(-spread, y, ez); e2.position.set(spread, y, ez);
    this.group.add(e1); this.group.add(e2);
  }

  update(dt, player) {
    this.aiTimer += dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.hurtFlash > 0) { this.hurtFlash -= dt; if (this.hurtFlash <= 0) this._setTint(null); }

    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);

    if (this.info.hostile && dist < 22) {
      this.yaw = Math.atan2(dx, dz);
    } else if (this.aiTimer > 2.5) {
      this.aiTimer = 0;
      if (Math.random() < 0.5) this.yaw += (Math.random() - 0.5) * 2.5;
      this._wandering = Math.random() < 0.6;
    }

    const moving = this.info.hostile ? dist < 22 && dist > 1.1 : this._wandering;
    const speed = this.info.speed;
    if (moving) {
      this.velocity.x = Math.sin(this.yaw) * speed;
      this.velocity.z = Math.cos(this.yaw) * speed;
    } else {
      this.velocity.x = 0; this.velocity.z = 0;
    }

    this.velocity.y += -24 * dt;

    // horizontal move + step-up
    const oldX = this.position.x, oldZ = this.position.z;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    if (this._collidesAt(this.position.x, this.position.y, this.position.z)) {
      // try stepping up one block
      if (this.onGround && !this._collidesAt(oldX, this.position.y + 1, oldZ)) {
        this.velocity.y = 7;
      }
      this.position.x = oldX; this.position.z = oldZ;
    }

    // vertical
    this.position.y += this.velocity.y * dt;
    if (this._collidesAt(this.position.x, this.position.y, this.position.z)) {
      if (this.velocity.y < 0) { this.position.y = Math.ceil(this.position.y - 0.02); this.onGround = true; }
      this.velocity.y = 0;
    } else this.onGround = false;
    this.position.y = Math.max(1, Math.min(CHUNK_H - 2, this.position.y));

    // animation
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizSpeed > 0.1) {
      this.walkPhase += dt * 8;
      const sw = Math.sin(this.walkPhase) * 0.6;
      for (let i = 0; i < this.legs.length; i++) {
        this.legs[i].rotation.x = (i % 2 === 0) ? sw : -sw;
      }
    } else {
      for (const l of this.legs) l.rotation.x *= 0.8;
    }

    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.y = this.yaw;

    // Attack / explode
    if (this.info.hostile) {
      if (this.type === 'creeper') {
        if (dist < 2.2) this._explode(player);
      } else if (dist < 1.6 && this.attackCd <= 0) {
        this.attackCd = 1.0;
        if (window._game) window._game.hurtPlayer(this.info.dmg, this.position);
      }
    }
  }

  _collidesAt(x, y, z) {
    const hw = this.width / 2;
    const pts = [
      [x-hw, y, z-hw], [x+hw, y, z-hw], [x-hw, y, z+hw], [x+hw, y, z+hw],
      [x-hw, y+this.height-0.1, z-hw], [x+hw, y+this.height-0.1, z+hw],
    ];
    for (const [px, py, pz] of pts) if (isSolid(this.world.getBlock(Math.floor(px), Math.floor(py), Math.floor(pz)))) return true;
    return false;
  }

  _setTint(color) {
    this.group.traverse(o => {
      if (o.isMesh && o.material && o.material.emissive !== undefined) {
        o.material.emissive.setHex(color === null ? 0x000000 : color);
      }
    });
  }

  _explode(player) {
    if (this.dead) return;
    this.dead = true;
    AudioManager.playSound('explode');
    const r = 4, bx = Math.floor(this.position.x), by = Math.floor(this.position.y), bz = Math.floor(this.position.z);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      if (dx*dx + dy*dy + dz*dz <= r*r) {
        const id = this.world.getBlock(bx+dx, by+dy, bz+dz);
        if (id !== BLOCK.AIR && id !== BLOCK.BEDROCK) {
          this.world.setBlock(bx+dx, by+dy, bz+dz, BLOCK.AIR);
          if (window._game && window._game.particles && Math.random() < 0.3) window._game.particles.spawnBreak(bx+dx, by+dy, bz+dz, id);
        }
      }
    }
    const ddx = player.position.x - this.position.x, ddz = player.position.z - this.position.z;
    const dd = Math.sqrt(ddx*ddx + ddz*ddz) || 1;
    if (dd < 6 && window._game) {
      window._game.hurtPlayer(Math.floor((6 - dd) * 3), this.position);
      player.velocity.x += (ddx/dd) * (6-dd) * 3;
      player.velocity.z += (ddz/dd) * (6-dd) * 3;
      player.velocity.y += 6;
    }
  }

  takeDamage(amount, fromPos) {
    if (this.dead) return;
    this.health -= amount;
    this.hurtFlash = 0.25;
    this._setTint(0x661111);
    // knockback
    if (fromPos) {
      const kx = this.position.x - fromPos.x, kz = this.position.z - fromPos.z;
      const d = Math.hypot(kx, kz) || 1;
      this.velocity.x += (kx/d) * 6; this.velocity.z += (kz/d) * 6; this.velocity.y = 5;
    }
    if (this.health <= 0) { this.dead = true; AudioManager.playSound('mob_die'); }
    else AudioManager.playSound('mob_hurt');
  }

  dropLoot() {
    if (!window._game || !window._game.particles) return;
    const bx = Math.floor(this.position.x), by = Math.floor(this.position.y), bz = Math.floor(this.position.z);
    let drop = null;
    if (!this.info.hostile) drop = ITEM.APPLE; // passive mobs drop food
    else if (this.type === 'skeleton' && Math.random() < 0.6) drop = ITEM.STICK;
    if (drop !== null) window._game.particles.spawnDrop(bx, by, bz, drop, this.world);
  }

  dispose(scene) {
    scene.remove(this.group);
    this.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }
}
