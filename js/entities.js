'use strict';

// Simple mob system with basic AI
class EntityManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.entities = [];
    this.time = 0;
  }

  spawnMob(type, x, y, z) {
    const mob = new Mob(type, x, y, z, this.scene, this.world);
    this.entities.push(mob);
    return mob;
  }

  update(dt, player) {
    this.time += dt;

    // Spawn mobs near player periodically
    if (this.time % 8 < dt && this.entities.length < 20) {
      const { x, z } = player.position;
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 15;
      const mx = x + Math.cos(angle) * dist;
      const mz = z + Math.sin(angle) * dist;
      // Find surface
      let my = SEA_LEVEL + 5;
      for (let y = CHUNK_H - 1; y > 0; y--) {
        if (isSolid(this.world.getBlock(Math.floor(mx), y, Math.floor(mz)))) { my = y + 1; break; }
      }
      if (my > 0 && my < CHUNK_H - 5) {
        const types = ['zombie', 'creeper', 'skeleton', 'pig', 'cow', 'sheep'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.spawnMob(type, mx, my, mz);
      }
    }

    // Update all mobs
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const mob = this.entities[i];
      mob.update(dt, player);

      // Remove if too far
      const dx = mob.position.x - player.position.x;
      const dz = mob.position.z - player.position.z;
      if (dx*dx + dz*dz > 80*80 || mob.dead) {
        mob.dispose(this.scene);
        this.entities.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const mob of this.entities) mob.dispose(this.scene);
    this.entities = [];
  }
}

const MOB_COLORS = {
  zombie:   0x2d6a2d,
  creeper:  0x2ecc40,
  skeleton: 0xddddbb,
  pig:      0xf4a0b0,
  cow:      0x884422,
  sheep:    0xeeddcc,
};

const MOB_SIZE = {
  zombie:   [0.6, 1.8],
  creeper:  [0.6, 1.7],
  skeleton: [0.6, 1.8],
  pig:      [0.9, 0.9],
  cow:      [0.9, 1.4],
  sheep:    [0.9, 1.3],
};

class Mob {
  constructor(type, x, y, z, scene, world) {
    this.type = type;
    this.world = world;
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = Math.random() * Math.PI * 2;
    this.dead = false;
    this.health = this._getMaxHealth();
    this.aiTimer = 0;
    this.onGround = false;

    const [w, h] = MOB_SIZE[type] || [0.6, 1.8];
    this.width = w; this.height = h;

    // Create simple box mesh
    const geo = new THREE.BoxGeometry(w, h, w);
    const mat = new THREE.MeshLambertMaterial({ color: MOB_COLORS[type] || 0x888888 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y + h / 2, z);
    this.mesh.castShadow = true;

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.2, 0.1, 0.05);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, h * 0.4, -w / 2 - 0.01);
    rightEye.position.set(0.12, h * 0.4, -w / 2 - 0.01);
    const pupilGeo = new THREE.BoxGeometry(0.08, 0.08, 0.06);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const lp = new THREE.Mesh(pupilGeo, pupilMat);
    const rp = new THREE.Mesh(pupilGeo, pupilMat);
    lp.position.copy(leftEye.position); lp.position.z -= 0.02;
    rp.position.copy(rightEye.position); rp.position.z -= 0.02;

    this.mesh.add(leftEye); this.mesh.add(rightEye);
    this.mesh.add(lp); this.mesh.add(rp);
    scene.add(this.mesh);
  }

  _getMaxHealth() {
    switch (this.type) {
      case 'zombie': case 'skeleton': return 20;
      case 'creeper': return 20;
      case 'pig': case 'sheep': return 10;
      case 'cow': return 10;
      default: return 20;
    }
  }

  update(dt, player) {
    this.aiTimer += dt;

    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);

    const isHostile = ['zombie', 'creeper', 'skeleton'].includes(this.type);
    const isPassive = ['pig', 'cow', 'sheep'].includes(this.type);

    // AI behavior
    if (this.aiTimer > 2.0) {
      this.aiTimer = 0;
      if (isHostile && dist < 20) {
        // Chase player
        this.yaw = Math.atan2(dx, dz);
      } else if (isPassive) {
        // Random wander
        this.yaw += (Math.random() - 0.5) * 1.5;
      }
    }

    const speed = isHostile ? 2.5 : 1.5;
    this.velocity.x = Math.sin(this.yaw) * speed;
    this.velocity.z = Math.cos(this.yaw) * speed;

    // Gravity
    this.velocity.y += -20 * dt;

    // Simple collision
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    const bx = Math.floor(this.position.x), bz = Math.floor(this.position.z);
    const front = this.world.getBlock(bx, Math.floor(this.position.y), bz);
    if (isSolid(front)) {
      this.position.x -= this.velocity.x * dt;
      this.position.z -= this.velocity.z * dt;
      this.velocity.x = 0; this.velocity.z = 0;
      // Try to jump over obstacle
      if (this.onGround) this.velocity.y = 6;
    }

    this.position.y += this.velocity.y * dt;
    const below = this.world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y - 0.1), Math.floor(this.position.z));
    if (isSolid(below)) {
      this.position.y = Math.ceil(this.position.y - 0.05);
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Clamp to world
    this.position.y = Math.max(1, Math.min(CHUNK_H - 2, this.position.y));

    // Update mesh
    this.mesh.position.set(this.position.x, this.position.y + this.height / 2, this.position.z);
    this.mesh.rotation.y = this.yaw;

    // Bob animation
    if (this.onGround && (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1)) {
      this.mesh.position.y += Math.abs(Math.sin(Date.now() * 0.01)) * 0.05;
    }

    // Creeper explosion
    if (this.type === 'creeper' && dist < 2.5) {
      this._explode(player);
    }
  }

  _explode(player) {
    if (this.dead) return;
    this.dead = true;
    AudioManager.playSound('explode');
    // Destroy nearby blocks
    const r = 4;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx*dx + dy*dy + dz*dz <= r*r) {
            const bx = Math.floor(this.position.x) + dx;
            const by = Math.floor(this.position.y) + dy;
            const bz = Math.floor(this.position.z) + dz;
            if (this.world.getBlock(bx, by, bz) !== BLOCK.BEDROCK) {
              this.world.setBlock(bx, by, bz, BLOCK.AIR);
            }
          }
        }
      }
    }
    // Knockback player
    const ddx = player.position.x - this.position.x;
    const ddz = player.position.z - this.position.z;
    const ddist = Math.sqrt(ddx*ddx + ddz*ddz) || 1;
    if (ddist < 6) {
      const force = (6 - ddist) * 3;
      player.velocity.x += (ddx / ddist) * force;
      player.velocity.z += (ddz / ddist) * force;
      player.velocity.y += force * 0.5;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.dead = true;
      // Drop loot
      AudioManager.playSound('mob_die');
    } else {
      // Flash red
      const origColor = this.mesh.material.color.getHex();
      this.mesh.material.color.setHex(0xff0000);
      setTimeout(() => {
        if (!this.dead) this.mesh.material.color.setHex(origColor);
      }, 200);
      AudioManager.playSound('mob_hurt');
    }
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
