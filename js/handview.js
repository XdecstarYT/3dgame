'use strict';

// First-person held item + arm swing + view bobbing.
class HandView {
  constructor(camera, scene) {
    this.camera = camera;
    this.group = new THREE.Group();
    camera.add(this.group);
    if (!camera.parent) scene.add(camera); // ensure camera in graph so children render

    this.heldId = -1;
    this.mesh = null;
    this.arm = this._buildArm();
    this.group.add(this.arm);

    this.swing = 0;          // 0..1 animation progress
    this.swinging = false;
    this.bobT = 0;
    this._texCache = {};

    this.group.position.set(0.55, -0.5, -0.8);
  }

  _buildArm() {
    const geo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    const mat = new THREE.MeshLambertMaterial({ color: 0xe0ac8a });
    const arm = new THREE.Mesh(geo, mat);
    arm.position.set(0.1, -0.15, 0.1);
    arm.rotation.z = 0.35;
    return arm;
  }

  _blockTexture(id) {
    if (this._texCache[id]) return this._texCache[id];
    const def = getDef(id);
    const tileIdx = def ? (def.isItem ? def.textures[0] : (def.textures[4] || def.textures[0])) : 0;
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const ctx = c.getContext('2d');
    if (window._atlasCanvas && tileIdx) {
      const TS = TextureAtlas.TILE, AC = TextureAtlas.COLS;
      const col = tileIdx % AC, row = Math.floor(tileIdx / AC);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(window._atlasCanvas, col*TS, row*TS, TS, TS, 0, 0, 16, 16);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    this._texCache[id] = tex;
    return tex;
  }

  setHeld(id) {
    if (id === this.heldId) return;
    this.heldId = id;
    if (this.mesh) { this.group.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh = null; }

    const def = getDef(id);
    if (id && id !== BLOCK.AIR && def) {
      const tex = this._blockTexture(id);
      if (def.isItem) {
        // Tools/items: held as an angled flat sprite
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        const geo = new THREE.PlaneGeometry(0.4, 0.4);
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(0.05, -0.05, 0);
        this.mesh.rotation.set(0, -0.4, -0.5);
      } else {
        const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: !!def.transparent, alphaTest: def.transparent ? 0.5 : 0 });
        const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(0.05, -0.1, 0);
        this.mesh.rotation.set(0.3, -0.6, 0);
      }
      this.group.add(this.mesh);
      this.arm.visible = false;
    } else {
      this.arm.visible = true;
    }
  }

  triggerSwing() { this.swinging = true; this.swing = 0; }

  update(dt, player) {
    // Swing animation
    if (this.swinging) {
      this.swing += dt * 6;
      if (this.swing >= 1) { this.swing = 0; this.swinging = false; }
    }
    const sw = this.swinging ? Math.sin(this.swing * Math.PI) : 0;
    const target = this.mesh || this.arm;
    if (target) {
      target.rotation.x = (this.mesh ? 0.3 : 0) - sw * 1.2;
      target.position.y = (this.mesh ? -0.1 : -0.15) - sw * 0.15;
    }

    // View bobbing applied to camera (player.updateCamera set base eye already)
    const moving = player.onGround && (Math.abs(player.velocity.x) > 0.6 || Math.abs(player.velocity.z) > 0.6);
    if (moving) {
      this.bobT += dt * (player.sprinting ? 13 : 9);
      const bx = Math.cos(this.bobT) * 0.035;
      const by = Math.abs(Math.sin(this.bobT)) * 0.045;
      // apply along camera right/up
      const right = player.getRightDir();
      this.camera.position.x += right.x * bx;
      this.camera.position.z += right.z * bx;
      this.camera.position.y -= by;
      // hand bob
      this.group.position.x = 0.55 + Math.cos(this.bobT) * 0.012;
      this.group.position.y = -0.5 + Math.abs(Math.sin(this.bobT)) * 0.015;
    } else {
      this.bobT = 0;
      this.group.position.x += (0.55 - this.group.position.x) * 0.2;
      this.group.position.y += (-0.5 - this.group.position.y) * 0.2;
    }
  }
}
