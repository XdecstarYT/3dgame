'use strict';

const PLAYER_HEIGHT = 1.8;
const PLAYER_WIDTH = 0.6;
const PLAYER_HALF = PLAYER_WIDTH / 2;
const PLAYER_EYE = 1.62;
const SNEAK_EYE = 1.42;

// Minecraft-accurate movement (blocks/second)
const GRAVITY = -30;
const JUMP_SPEED = 8.6;
const WALK_SPEED = 4.317;
const SPRINT_SPEED = 5.612;
const SNEAK_SPEED = 1.295;
const FLY_SPEED = 11.0;
const FLY_SPRINT = 22.0;
const REACH = 5.0;
const EPS = 0.001;

class Player {
  constructor(world, camera) {
    this.world = world;
    this.camera = camera;

    this.position = new THREE.Vector3(8, SEA_LEVEL + 10, 8);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.yaw = 0;
    this.pitch = 0;

    this.onGround = false;
    this.inWater = false;
    this.flying = false;
    this.sprinting = false;
    this.sneaking = false;
    this.creative = true;

    this.keys = {};
    this.mouseButtons = {};
    this.mouseDX = 0;
    this.mouseDY = 0;

    this.breakProgress = 0;
    this.breakTarget = null;
    this.lastBreakParticle = 0;
    this.placeCooldown = 0;
    this.eatTimer = 0;

    this.currentTarget = null;
    this.meleeTarget = null;
    this.attackCd = 0;
    this.highlightMesh = this._createHighlight();

    this._setupControls();
  }

  _createHighlight() {
    const geo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
    const mesh = new THREE.LineSegments(edges, mat);
    mesh.visible = false;
    return mesh;
  }

  _setupControls() {
    document.addEventListener('keydown', e => {
      if (e.target && e.target.tagName === 'INPUT') return;
      this.keys[e.code] = true;
      if (e.code === 'ShiftLeft') this.sneaking = true;
      if (e.code === 'KeyF') { if (this.creative) { this.flying = !this.flying; this.velocity.y = 0; } }
    });

    document.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.code === 'ShiftLeft') this.sneaking = false;
    });

    // Sprint via double-tap W
    let lastW = 0;
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyW') {
        const now = performance.now();
        if (now - lastW < 250) this.sprinting = true;
        lastW = now;
      }
      if (e.code === 'ControlLeft') this.sprinting = true;
    });
    document.addEventListener('keyup', e => { if (e.code === 'KeyW') this.sprinting = false; });

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

  _mobile() { return typeof MobileControls !== 'undefined' ? MobileControls.state : null; }

  active() { return !!document.pointerLockElement || (this._mobile() && this._mobile().enabled); }

  updateCamera() {
    const sensitivity = 0.0022;
    const m = this._mobile();
    if (m && m.enabled) {
      this.mouseDX += m.look.dx * 1.1;
      this.mouseDY += m.look.dy * 1.1;
      m.look.dx = 0; m.look.dy = 0;
    }
    this.yaw -= this.mouseDX * sensitivity;
    this.pitch -= this.mouseDY * sensitivity;
    this.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.pitch));
    this.mouseDX = 0; this.mouseDY = 0;

    const eye = this.sneaking ? SNEAK_EYE : PLAYER_EYE;
    this.camera.position.set(this.position.x, this.position.y + eye, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  getForwardDir() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  getRightDir() { return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }
  getLookDir() { const d = new THREE.Vector3(); this.camera.getWorldDirection(d); return d; }

  update(dt, world, inventory) {
    if (this.placeCooldown > 0) this.placeCooldown -= dt;
    this.updateCamera();
    this.updateMovement(dt);
    this.updateInteraction(dt, world, inventory);

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
    const m = this._mobile();
    const fwd = this.getForwardDir();
    const right = this.getRightDir();

    let mx = 0, mz = 0;
    if (this.keys['KeyW']) { mx += fwd.x; mz += fwd.z; }
    if (this.keys['KeyS']) { mx -= fwd.x; mz -= fwd.z; }
    if (this.keys['KeyA']) { mx -= right.x; mz -= right.z; }
    if (this.keys['KeyD']) { mx += right.x; mz += right.z; }
    if (m && m.enabled) {
      mx += fwd.x * m.move.y + right.x * m.move.x;
      mz += fwd.z * m.move.y + right.z * m.move.x;
      this.sneaking = m.flags.sneak;
      this.sprinting = Math.hypot(m.move.x, m.move.y) > 0.92;
    }

    const len = Math.hypot(mx, mz);
    if (len > 0) { mx /= len; mz /= len; }
    if (len < 0.01) this.sprinting = false;

    let speed = this.sneaking ? SNEAK_SPEED : (this.sprinting ? SPRINT_SPEED : WALK_SPEED);
    if (this.flying) speed = this.sprinting ? FLY_SPRINT : FLY_SPEED;
    if (this.inWater && !this.flying) speed *= 0.5;

    this.velocity.x = mx * speed;
    this.velocity.z = mz * speed;

    const wantJump = this.keys['Space'] || (m && m.enabled && m.flags.jump);

    if (this.flying) {
      if (wantJump) this.velocity.y = FLY_SPEED;
      else if (this.keys['ShiftLeft']) this.velocity.y = -FLY_SPEED;
      else this.velocity.y *= 0.6;
    } else {
      const g = this.inWater ? GRAVITY * 0.35 : GRAVITY;
      this.velocity.y += g * dt;
      if (this.inWater) {
        if (this.velocity.y < -3) this.velocity.y = -3;
        if (wantJump) this.velocity.y = 4;
      } else if (wantJump && this.onGround) {
        this.velocity.y = JUMP_SPEED;
        this.onGround = false;
      }
    }

    this._moveAndCollide(dt);
    this._updateEnvironment();
  }

  _moveAndCollide(dt) {
    if (this.flying) {
      // still collide while flying
    }
    this._collideAxis('x', this.velocity.x * dt);
    this._collideAxis('z', this.velocity.z * dt);
    const prevVy = this.velocity.y;
    this.onGround = false;
    this._collideAxis('y', this.velocity.y * dt);
    // Landing sound
    if (this.onGround && prevVy < -8) AudioManager.playSound('land');
  }

  _solidAt(x, y, z) { return isSolid(this.world.getBlock(x, y, z)); }

  _collideAxis(axis, amount) {
    if (amount === 0) return;
    this.position[axis] += amount;

    const minX = Math.floor(this.position.x - PLAYER_HALF);
    const maxX = Math.floor(this.position.x + PLAYER_HALF);
    const minY = Math.floor(this.position.y);
    const maxY = Math.floor(this.position.y + PLAYER_HEIGHT - EPS);
    const minZ = Math.floor(this.position.z - PLAYER_HALF);
    const maxZ = Math.floor(this.position.z + PLAYER_HALF);

    let hit = false, bound = 0;
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (!this._solidAt(x, y, z)) continue;
          if (axis === 'x') {
            const b = amount > 0 ? x - PLAYER_HALF - EPS : x + 1 + PLAYER_HALF + EPS;
            bound = !hit ? b : (amount > 0 ? Math.min(bound, b) : Math.max(bound, b));
          } else if (axis === 'z') {
            const b = amount > 0 ? z - PLAYER_HALF - EPS : z + 1 + PLAYER_HALF + EPS;
            bound = !hit ? b : (amount > 0 ? Math.min(bound, b) : Math.max(bound, b));
          } else {
            const b = amount > 0 ? y - PLAYER_HEIGHT - EPS : y + 1 + EPS;
            bound = !hit ? b : (amount > 0 ? Math.min(bound, b) : Math.max(bound, b));
          }
          hit = true;
        }
      }
    }

    if (hit) {
      this.position[axis] = bound;
      if (axis === 'y') {
        if (amount < 0) this.onGround = true;
        this.velocity.y = 0;
      } else {
        this.velocity[axis] = 0;
      }
    }
  }

  _updateEnvironment() {
    const fx = Math.floor(this.position.x), fz = Math.floor(this.position.z);
    const feet = this.world.getBlock(fx, Math.floor(this.position.y + 0.1), fz);
    const head = this.world.getBlock(fx, Math.floor(this.position.y + PLAYER_EYE), fz);
    const wasWater = this.inWater;
    this.inWater = isLiquid(feet) || isLiquid(head);
    if (this.inWater && !wasWater && this.velocity.y < -4) AudioManager.playSound('splash');
    if (this.position.y < -10) { this.respawn(); }
  }

  updateInteraction(dt, world, inventory) {
    if (!this.active()) return;
    const m = this._mobile();

    const dir = this.getLookDir();
    const eye = this.camera.position.clone();
    const result = world.raycast(eye, dir, REACH);

    // Right-click intent (resolved once; mobile tap is a one-shot)
    let wantPlace = this.mouseButtons[2];
    if (m && m.enabled && typeof MobileControls.consumePlace === 'function' && MobileControls.consumePlace()) wantPlace = true;

    const sel = inventory.getSelectedItem();
    const selDef = (sel && sel.id) ? getDef(sel.id) : null;

    // EAT food on right-click (hold on desktop, tap on mobile)
    if (selDef && selDef.food) {
      if (wantPlace) {
        if (m && m.enabled) { this._eat(sel, inventory, selDef); }
        else { this.eatTimer += dt; if (this.eatTimer >= 1.0) { this.eatTimer = 0; this._eat(sel, inventory, selDef); } }
      } else this.eatTimer = 0;
      wantPlace = false;
    }

    // PLACE
    if (wantPlace && result.hit && this.placeCooldown <= 0) {
      this.mouseButtons[2] = false;
      this.placeCooldown = 0.18;
      const slot = sel;
      if (slot && slot.id !== BLOCK.AIR && slot.count > 0 && BLOCK_DEF[slot.id] && BLOCK_DEF[slot.id].stackSize > 0) {
        const { x, y, z } = result.face;
        if (!this._intersectsPlayer(x, y, z)) {
          const existing = world.getBlock(x, y, z);
          if (existing === BLOCK.AIR || isLiquid(existing)) {
            world.setBlock(x, y, z, slot.id);
            if (world.onBlockPlaced) world.onBlockPlaced(x, y, z, slot.id);
            if (!this.creative) inventory.consumeSelected();
            AudioManager.playBlockPlace(slot.id);
            if (window._game && window._game.handView) window._game.handView.triggerSwing();
          }
        }
      }
    }

    // BREAK (skipped while a mob is targeted so left-click does melee instead)
    let wantBreak = (this.mouseButtons[0] || (m && m.enabled && m.flags.breaking)) && !this.meleeTarget;
    if (wantBreak && result.hit) {
      const { x, y, z, id } = result.block;
      const heldId = (inventory.getSelectedItem() || {}).id || 0;
      const same = this.breakTarget && this.breakTarget.x === x && this.breakTarget.y === y && this.breakTarget.z === z;
      if (!same) { this.breakProgress = 0; this.breakTarget = { x, y, z }; }

      if (window._game && window._game.handView) {
        if (!this._lastSwingT || performance.now() - this._lastSwingT > 250) {
          window._game.handView.triggerSwing(); this._lastSwingT = performance.now();
        }
      }

      const hardness = getHardness(id);
      if (hardness === Infinity) return;
      const mult = getMiningMultiplier(id, heldId);
      const breakTime = this.creative ? 0 : Math.max(0.05, (hardness * 0.45) / mult);
      this.breakProgress += dt;

      // break particles trickle
      this.lastBreakParticle += dt;
      if (window._game && window._game.particles && this.lastBreakParticle > 0.12) {
        this.lastBreakParticle = 0;
        if (Math.random() < 0.6) window._game.particles.spawnBreak(x + 0.3, y + 0.3, z + 0.3, id);
      }

      if (this.breakProgress >= breakTime) {
        if (window._game && window._game.particles) {
          window._game.particles.spawnBreak(x, y, z, id);
          if (!this.creative) {
            const drop = getDrop(id);
            if (drop !== null && drop !== BLOCK.AIR && blockWillDrop(id, heldId)) {
              window._game.particles.spawnDrop(x, y, z, drop, world);
            }
          }
        }
        world.setBlock(x, y, z, BLOCK.AIR);
        if (world.settleGravity) world.settleGravity(x, y, z);
        AudioManager.playBlockBreak(id);
        if (!this.creative && window._game &&
            (id === BLOCK.COAL_ORE || id === BLOCK.IRON_ORE || id === BLOCK.GOLD_ORE || id === BLOCK.DIAMOND_ORE)) {
          window._game.addXp(2 + Math.floor(Math.random() * 3));
        }
        this.breakProgress = 0; this.breakTarget = null;
      }
    } else {
      this.breakProgress = 0; this.breakTarget = null;
    }
  }

  _eat(sel, inventory, def) {
    const g = window._game;
    if (!g || typeof g.eat !== 'function') return;
    if (g.eat(def.food)) {
      AudioManager.playSound('eat');
      if (!this.creative) inventory.consumeSelected();
    }
  }

  _intersectsPlayer(x, y, z) {
    const minX = Math.floor(this.position.x - PLAYER_HALF);
    const maxX = Math.floor(this.position.x + PLAYER_HALF);
    const minY = Math.floor(this.position.y);
    const maxY = Math.floor(this.position.y + PLAYER_HEIGHT - EPS);
    const minZ = Math.floor(this.position.z - PLAYER_HALF);
    const maxZ = Math.floor(this.position.z + PLAYER_HALF);
    return x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ;
  }

  getBreakPercent() {
    if (!this.breakTarget) return 0;
    const id = this.world.getBlock(this.breakTarget.x, this.breakTarget.y, this.breakTarget.z);
    const hardness = getHardness(id);
    if (hardness === 0 || this.creative) return 0;
    return Math.min(1, this.breakProgress / Math.max(0.05, hardness * 0.3));
  }

  respawn() {
    const wx = 8, wz = 8;
    let y = CHUNK_H - 1;
    for (; y >= 0; y--) {
      if (isSolid(this.world.getBlock(wx, y, wz))) { break; }
    }
    this.position.set(wx + 0.5, y + 1.2, wz + 0.5);
    this.velocity.set(0, 0, 0);
  }

  getChunkPos() {
    return { cx: Math.floor(this.position.x / CHUNK_W), cz: Math.floor(this.position.z / CHUNK_D) };
  }
}
