'use strict';

const PLAYER_HEIGHT = 1.8;
const PLAYER_WIDTH = 0.6;
const PLAYER_EYE = 1.62;
const GRAVITY = -28;
const JUMP_SPEED = 8.5;
const WALK_SPEED = 5.0;
const SPRINT_SPEED = 7.5;
const FLY_SPEED = 12.0;
const REACH = 5.5;

class Player {
  constructor(world, camera) {
    this.world = world;
    this.camera = camera;

    // Position of feet
    this.position = new THREE.Vector3(8, SEA_LEVEL + 10, 8);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.yaw = 0;
    this.pitch = 0;

    this.onGround = false;
    this.inWater = false;
    this.flying = false;
    this.sprinting = false;
    this.sneaking = false;

    // Creative / survival mode
    this.creative = true;

    this.keys = {};
    this.mouseButtons = {};
    this.mouseDX = 0;
    this.mouseDY = 0;

    // Breaking
    this.breakProgress = 0;
    this.breakTarget = null;

    // Highlight
    this.highlightMesh = this._createHighlight();

    this._setupControls();
  }

  _createHighlight() {
    const geo = new THREE.BoxGeometry(1.001, 1.001, 1.001);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2, transparent: true, opacity: 0.6 });
    const mesh = new THREE.LineSegments(edges, mat);
    mesh.visible = false;
    return mesh;
  }

  _setupControls() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && this.onGround && !this.flying) {
        this.velocity.y = JUMP_SPEED;
        this.onGround = false;
      }
      if (e.code === 'Space' && this.flying) this.velocity.y = FLY_SPEED;
      if (e.code === 'ShiftLeft') this.sneaking = true;
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') this.sprinting = true;
      if (e.code === 'KeyF') {
        if (this.creative) { this.flying = !this.flying; this.velocity.y = 0; }
      }
    });

    document.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.code === 'ShiftLeft') this.sneaking = false;
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') this.sprinting = false;
    });

    document.addEventListener('mousemove', e => {
      if (!document.pointerLockElement) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });

    document.addEventListener('mousedown', e => {
      if (!document.pointerLockElement) return;
      this.mouseButtons[e.button] = true;
    });

    document.addEventListener('mouseup', e => {
      this.mouseButtons[e.button] = false;
      if (e.button === 0) { this.breakProgress = 0; this.breakTarget = null; }
    });

    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  updateCamera() {
    const sensitivity = 0.0015;
    this.yaw -= this.mouseDX * sensitivity;
    this.pitch -= this.mouseDY * sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    this.mouseDX = 0;
    this.mouseDY = 0;

    // Eye position
    const eyeY = this.position.y + PLAYER_EYE;
    this.camera.position.set(this.position.x, eyeY, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  getForwardDir() {
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    return fwd;
  }

  getRightDir() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  getLookDir() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }

  update(dt, world, inventory) {
    this.updateCamera();
    this.updateMovement(dt);
    this.updateInteraction(dt, world, inventory);

    // Find and highlight target block
    const dir = this.getLookDir();
    const eye = this.camera.position.clone();
    const result = world.raycast(eye, dir, REACH);

    if (result.hit) {
      this.highlightMesh.visible = true;
      this.highlightMesh.position.set(result.block.x + 0.5, result.block.y + 0.5, result.block.z + 0.5);
      this.currentTarget = result;
    } else {
      this.highlightMesh.visible = false;
      this.currentTarget = null;
    }
  }

  updateMovement(dt) {
    const speed = this.flying ? FLY_SPEED : (this.sprinting ? SPRINT_SPEED : WALK_SPEED);
    const fwd = this.getForwardDir();
    const right = this.getRightDir();

    let mx = 0, mz = 0;
    if (this.keys['KeyW']) { mx += fwd.x; mz += fwd.z; }
    if (this.keys['KeyS']) { mx -= fwd.x; mz -= fwd.z; }
    if (this.keys['KeyA']) { mx -= right.x; mz -= right.z; }
    if (this.keys['KeyD']) { mx += right.x; mz += right.z; }

    const len = Math.sqrt(mx*mx + mz*mz);
    if (len > 0) { mx /= len; mz /= len; }

    this.velocity.x = mx * speed;
    this.velocity.z = mz * speed;

    if (this.flying) {
      if (this.keys['Space']) this.velocity.y = FLY_SPEED;
      else if (this.keys['ShiftLeft']) this.velocity.y = -FLY_SPEED;
      else this.velocity.y *= 0.8;
    } else {
      // Gravity
      const gravity = this.inWater ? GRAVITY * 0.3 : GRAVITY;
      this.velocity.y += gravity * dt;
      if (this.inWater && this.velocity.y < -2) this.velocity.y = -2;

      // Water swimming up
      if (this.inWater && this.keys['Space']) this.velocity.y = 3;
    }

    this.applyCollision(dt);
  }

  applyCollision(dt) {
    const pos = this.position;
    const vel = this.velocity;
    const hw = PLAYER_WIDTH / 2;

    // Move X
    pos.x += vel.x * dt;
    if (this.checkCollision(pos, hw)) {
      pos.x -= vel.x * dt;
      vel.x = 0;
    }

    // Move Z
    pos.z += vel.z * dt;
    if (this.checkCollision(pos, hw)) {
      pos.z -= vel.z * dt;
      vel.z = 0;
    }

    // Move Y
    pos.y += vel.y * dt;
    if (this.checkCollision(pos, hw)) {
      if (vel.y < 0) {
        pos.y -= vel.y * dt;
        // Snap to ground
        pos.y = Math.ceil(pos.y - 0.001);
        this.onGround = true;
      } else {
        pos.y -= vel.y * dt;
      }
      vel.y = 0;
    } else {
      this.onGround = false;
    }

    // Check if in water
    const headBlock = this.world.getBlock(Math.floor(pos.x), Math.floor(pos.y + PLAYER_EYE), Math.floor(pos.z));
    const feetBlock = this.world.getBlock(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
    this.inWater = isLiquid(feetBlock) || isLiquid(headBlock);

    // Friction
    if (this.onGround) {
      this.velocity.x *= 0.85;
      this.velocity.z *= 0.85;
    }
  }

  checkCollision(pos, hw) {
    const world = this.world;
    const checks = [
      [pos.x - hw, pos.y, pos.z - hw],
      [pos.x + hw, pos.y, pos.z - hw],
      [pos.x - hw, pos.y, pos.z + hw],
      [pos.x + hw, pos.y, pos.z + hw],
      [pos.x - hw, pos.y + PLAYER_HEIGHT - 0.01, pos.z - hw],
      [pos.x + hw, pos.y + PLAYER_HEIGHT - 0.01, pos.z - hw],
      [pos.x - hw, pos.y + PLAYER_HEIGHT - 0.01, pos.z + hw],
      [pos.x + hw, pos.y + PLAYER_HEIGHT - 0.01, pos.z + hw],
    ];
    for (const [cx, cy, cz] of checks) {
      const id = world.getBlock(Math.floor(cx), Math.floor(cy), Math.floor(cz));
      if (isSolid(id)) return true;
    }
    return false;
  }

  updateInteraction(dt, world, inventory) {
    if (!document.pointerLockElement) return;

    const dir = this.getLookDir();
    const eye = this.camera.position.clone();
    const result = world.raycast(eye, dir, REACH);

    // Right click: place block
    if (this.mouseButtons[2] && result.hit) {
      this.mouseButtons[2] = false;
      const slot = inventory.getSelectedItem();
      if (slot && slot.id !== BLOCK.AIR && slot.count > 0) {
        const { x, y, z } = result.face;
        // Don't place inside player
        const px = Math.floor(this.position.x), py = Math.floor(this.position.y), pz = Math.floor(this.position.z);
        const pEye = Math.floor(this.position.y + PLAYER_EYE);
        if ((x === px && (y === py || y === pEye) && z === pz)) return;

        const existing = world.getBlock(x, y, z);
        if (existing === BLOCK.AIR || isLiquid(existing)) {
          world.setBlock(x, y, z, slot.id);
          if (!this.creative) inventory.consumeSelected();
          AudioManager.playBlockPlace(slot.id);
        }
      }
    }

    // Left click: break block
    if (this.mouseButtons[0] && result.hit) {
      const { x, y, z, id } = result.block;
      const sameTarget = this.breakTarget &&
        this.breakTarget.x === x && this.breakTarget.y === y && this.breakTarget.z === z;

      if (!sameTarget) {
        this.breakProgress = 0;
        this.breakTarget = { x, y, z };
      }

      const hardness = getHardness(id);
      if (hardness === Infinity) return;

      const breakTime = this.creative ? 0 : hardness * 0.2;
      this.breakProgress += dt;

      if (this.breakProgress >= breakTime) {
        const drop = getDrop(id);
        if (drop !== null && !this.creative) {
          inventory.addItem(drop, 1);
        }
        world.setBlock(x, y, z, BLOCK.AIR);
        AudioManager.playBlockBreak(id);
        this.breakProgress = 0;
        this.breakTarget = null;
      }
    } else {
      this.breakProgress = 0;
      this.breakTarget = null;
    }
  }

  getBreakPercent() {
    if (!this.breakTarget || !this.currentTarget) return 0;
    const id = this.world.getBlock(this.breakTarget.x, this.breakTarget.y, this.breakTarget.z);
    const hardness = getHardness(id);
    if (hardness === 0 || this.creative) return 0;
    return Math.min(1, this.breakProgress / (hardness * 0.2));
  }

  // Respawn player at a safe location
  respawn() {
    const wx = 8, wz = 8;
    let y = CHUNK_H - 1;
    for (; y >= 0; y--) {
      if (this.world.getBlock(wx, y, wz) !== BLOCK.AIR) { y++; break; }
    }
    this.position.set(wx, y + 2, wz);
    this.velocity.set(0, 0, 0);
  }

  getChunkPos() {
    return {
      cx: Math.floor(this.position.x / CHUNK_W),
      cz: Math.floor(this.position.z / CHUNK_D)
    };
  }
}
