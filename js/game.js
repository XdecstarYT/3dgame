'use strict';

class Game {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.world = null;
    this.player = null;
    this.inventory = null;
    this.sky = null;
    this.entities = null;

    this.timeOfDay = 0.3; // Start at morning
    this.dayDuration = 600; // 10 minutes per day
    this.paused = false;

    this.health = 20;
    this.maxHealth = 20;
    this.hunger = 20;
    this.maxHunger = 20;
    this.hungerTimer = 0;
    this.naturalRegenTimer = 0;
    this._invuln = 0;
    this._autosave = 0;
    this._loaded = false;
    this.level = 0;
    this.xp = 0;

    this.material = null;
    this.waterMaterial = null;

    this.particles = null;
    this.handView = null;
    this.baseFOV = 75;
    this.targetFOV = 75;

    this.lastTime = 0;
    this.fps = 60;
    this.fpsSmooth = 60;
    this.frameCount = 0;
    this.debugMode = false;

    window._game = this;
  }

  async init() {
    this._setupRenderer();
    this._setupScene();
    await this._setupTextures();
    this._setupWorld();
    this._setupPlayer();
    this._setupUI();
    this._setupEvents();

    // Auto-detect & init touch controls
    if (typeof MobileControls !== 'undefined') MobileControls.init();

    // Continue from a saved world if one exists
    if (typeof SaveManager !== 'undefined' && SaveManager.has()) {
      this._loaded = SaveManager.load(this);
      if (this._loaded) UI.addChatMessage('Loaded saved world', 'System');
    }

    // Pre-generate chunks around spawn
    this._pregenerate();

    // Autosave on tab close
    window.addEventListener('beforeunload', () => { try { SaveManager.save(this); } catch (e) {} });

    // Start game loop
    requestAnimationFrame(t => this._loop(t));
  }

  _setupRenderer() {
    const canvas = document.getElementById('canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, RENDER_DIST * CHUNK_W * 0.9);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  }

  async _setupTextures() {
    const { canvas: atlasCanvas } = TextureAtlas.generateAtlas();
    window._atlasCanvas = atlasCanvas;

    const texture = new THREE.CanvasTexture(atlasCanvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.flipY = false;          // match our row-from-top atlas UV convention
    texture.generateMipmaps = false;

    // Custom voxel shader with baked sky/block light + AO (see shaders.js).
    // alphaTest-style cutout handled in the fragment shader for leaves/plants/glass.
    this.material = Shaders.makeTerrain(texture);
    this.waterMaterial = Shaders.makeWater(texture);

    // Texture for dropped items
    const dropTex = new THREE.CanvasTexture(atlasCanvas);
    dropTex.magFilter = THREE.NearestFilter;
    dropTex.minFilter = THREE.NearestFilter;
    dropTex.flipY = false;
    window._dropTexture = dropTex;
  }

  _setupWorld() {
    this.world = new World(this.scene, this.material, this.waterMaterial);
    this.sky = new Sky(this.scene);
    this.entities = new EntityManager(this.scene, this.world);
  }

  _setupPlayer() {
    this.inventory = new Inventory();
    this.player = new Player(this.world, this.camera);
    this.scene.add(this.player.highlightMesh);

    // Particles + dropped items
    this.particles = new ParticleSystem(this.scene);

    // First-person hand / held item + view bobbing
    this.scene.add(this.camera); // camera must be in graph for its child hand mesh to render
    this.handView = new HandView(this.camera, this.scene);

    // Spawn at a good location
    this.player.respawn();
  }

  _setupUI() {
    UI.init(this.inventory);
    UI.updateHealth(this.health, this.maxHealth);
    UI.updateHunger(this.hunger, this.maxHunger);
    UI.updateXP(this.level, this._xpFrac());
  }

  _xpNeed() { return 10 + this.level * 4; }
  _xpFrac() { return this.xp / this._xpNeed(); }
  addXp(n) {
    this.xp += n;
    let need = this._xpNeed();
    while (this.xp >= need) { this.xp -= need; this.level++; need = this._xpNeed(); AudioManager.playSound('item_pickup'); }
    UI.updateXP(this.level, this.xp / need);
  }

  _setupEvents() {
    // Pointer lock
    const canvas = document.getElementById('canvas');

    const isMobile = () => typeof MobileControls !== 'undefined' && MobileControls.state.enabled;

    canvas.addEventListener('click', () => {
      if (isMobile()) return; // touch controls don't use pointer lock
      if (!this.inventory.open) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      if (isMobile()) { document.getElementById('overlay').style.display = 'none'; return; }
      const locked = !!document.pointerLockElement;
      // Only re-show the click-to-play overlay if not in a menu
      const inMenu = this.inventory.open ||
        document.getElementById('pause-menu').style.display === 'flex' ||
        document.getElementById('death-screen').style.display === 'flex';
      document.getElementById('overlay').style.display = (locked || inMenu) ? 'none' : 'flex';
    });

    // Debug overlay toggle
    document.addEventListener('keydown', e => {
      if (e.code === 'F3') {
        this.debugMode = !this.debugMode;
        document.getElementById('debug').style.display = this.debugMode ? 'block' : 'none';
      }
      if (e.code === 'F1') {
        document.getElementById('hud').style.display =
          document.getElementById('hud').style.display === 'none' ? 'block' : 'none';
      }
      if (e.code === 'F5') {
        // Third person toggle (simplified: just move camera back)
        this._thirdPerson = !this._thirdPerson;
      }
    });

    // Mouse wheel for hotbar already in inventory.js

    // Pause button clicks
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      document.getElementById('pause-menu').style.display = 'none';
      canvas.requestPointerLock();
    });

    document.getElementById('btn-options')?.addEventListener('click', () => {
      UI.addChatMessage('Options not yet implemented', 'System');
    });

    document.getElementById('btn-quit')?.addEventListener('click', () => {
      if (confirm('Quit to title?')) { SaveManager.save(this); location.reload(); }
    });

    document.getElementById('btn-save')?.addEventListener('click', () => {
      const ok = SaveManager.save(this);
      UI.addChatMessage(ok ? 'World saved' : 'Save failed', 'System');
    });

    document.getElementById('btn-newworld')?.addEventListener('click', () => {
      if (confirm('Delete the saved world and start a NEW one?')) { SaveManager.clear(); location.reload(); }
    });

    document.getElementById('btn-respawn')?.addEventListener('click', () => {
      this.health = this.maxHealth;
      this.hunger = this.maxHunger;
      this.player.respawn();
      UI.hideDeath();
      UI.updateHealth(this.health, this.maxHealth);
      canvas.requestPointerLock();
    });

    // Right-click to place (mousedown fires before contextmenu)
    canvas.addEventListener('mousedown', e => {
      if (e.button === 2 && document.pointerLockElement) {
        this.player.mouseButtons[2] = true;
      }
    });
    canvas.addEventListener('mouseup', e => {
      if (e.button === 2) this.player.mouseButtons[2] = false;
    });
  }

  _pregenerate() {
    const cx = Math.floor(this.player.position.x / CHUNK_W);
    const cz = Math.floor(this.player.position.z / CHUNK_D);
    const preR = 3;
    for (let dx = -preR; dx <= preR; dx++) {
      for (let dz = -preR; dz <= preR; dz++) {
        this.world.getOrCreateChunk(cx + dx, cz + dz);
      }
    }
    // Ensure player is above terrain (unless we loaded a saved position)
    if (!this._loaded) this.player.respawn();
  }

  _loop(timestamp) {
    requestAnimationFrame(t => this._loop(t));

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (this.paused) return;

    // FPS calculation
    this.fpsSmooth += (1 / dt - this.fpsSmooth) * 0.05;

    this._update(dt);
    this._render();
  }

  _update(dt) {
    // Time of day
    this.timeOfDay = (this.timeOfDay + dt / this.dayDuration) % 1;

    // Update world (chunk loading)
    this.world.update(this.player.position.x, this.player.position.z);

    // Combat targeting: which mob is under the crosshair (so break defers to melee)
    this.player.meleeTarget = this.entities ? this.entities.getTargetMob(this.player) : null;

    // Update player
    if (this.player.active()) {
      this.player.update(dt, this.world, this.inventory);
    }

    // Execute melee attacks
    if (this._invuln > 0) this._invuln -= dt;
    this._updateCombat(dt);

    // Held item in hand + swing/bob (after camera is positioned by player)
    if (this.handView) {
      const sel = this.inventory.getSelectedItem();
      this.handView.setHeld(sel ? sel.id : BLOCK.AIR);
      this.handView.update(dt, this.player);
    }

    // Particles & dropped items
    if (this.particles) this.particles.update(dt, this.player, this.inventory);

    // Sprint FOV (Minecraft-style)
    this.targetFOV = this.baseFOV + (this.player.sprinting && !this.player.flying ? 8 : 0) + (this.player.flying ? 12 : 0);
    if (Math.abs(this.camera.fov - this.targetFOV) > 0.1) {
      this.camera.fov += (this.targetFOV - this.camera.fov) * Math.min(1, dt * 8);
      this.camera.updateProjectionMatrix();
    }

    // Survival mechanics
    if (!this.player.creative) {
      this._updateSurvival(dt);
    }

    // Autosave roughly every 30s
    this._autosave += dt;
    if (this._autosave > 30) { this._autosave = 0; if (typeof SaveManager !== 'undefined') SaveManager.save(this); }

    // Update sky
    const fogColor = this.sky.update(this.timeOfDay, this.player.position);
    this.scene.fog.color.copy(fogColor);
    this.renderer.setClearColor(fogColor, 1);

    // Drive the voxel shader's day/night + fog (no mesh rebuilds needed)
    const sunY = Math.sin(this.timeOfDay * Math.PI * 2);
    const day = sunY > 0 ? 0.18 + 0.82 * Math.min(1, sunY * 1.4) : 0.12;
    Shaders.update(day, fogColor, this.scene.fog.near, this.scene.fog.far);

    // Update entities
    this.entities.update(dt, this.player);

    // UI updates
    UI.updateDebug(this.player, this.world, this.fpsSmooth);
    UI.updateBreakOverlay(this.player.getBreakPercent());
    UI.updateTime(this.timeOfDay);

    // Audio
    AudioManager.updateAmbient(dt, this.player, this.timeOfDay);
    AudioManager.updateFootsteps(dt, this.player);

    // Water overlay tint
    const eyeBlock = this.world.getBlock(
      Math.floor(this.player.position.x),
      Math.floor(this.player.position.y + PLAYER_EYE),
      Math.floor(this.player.position.z)
    );
    const waterOverlay = document.getElementById('water-overlay');
    if (waterOverlay) {
      waterOverlay.style.display = isLiquid(eyeBlock) ? 'block' : 'none';
    }

    // Third person camera offset
    if (this._thirdPerson) {
      const back = this.player.getLookDir().multiplyScalar(-5);
      this.camera.position.add(back);
    }
  }

  _updateCombat(dt) {
    if (this.player.attackCd > 0) this.player.attackCd -= dt;
    const m = (typeof MobileControls !== 'undefined') ? MobileControls.state : null;
    const wantAttack = this.player.mouseButtons[0] || (m && m.enabled && m.flags.breaking);
    const target = this.player.meleeTarget;
    if (wantAttack && target && !target.dead && this.player.attackCd <= 0) {
      this.player.attackCd = 0.5;
      const held = (this.inventory.getSelectedItem() || {}).id || 0;
      target.takeDamage(getAttackDamage(held), this.player.position);
      if (this.handView) this.handView.triggerSwing();
    }
  }

  eat(amount) {
    if (this.hunger >= this.maxHunger && this.health >= this.maxHealth) return false;
    this.hunger = Math.min(this.maxHunger, this.hunger + amount);
    if (this.health < this.maxHealth) this.health = Math.min(this.maxHealth, this.health + 2);
    UI.updateHunger(this.hunger, this.maxHunger);
    UI.updateHealth(this.health, this.maxHealth);
    return true;
  }

  hurtPlayer(amount, fromPos) {
    if (this.player.creative || amount <= 0 || this._invuln > 0 || this.health <= 0) return;
    this.health -= amount;
    this._invuln = 0.5;
    AudioManager.playSound('player_hurt');
    UI.updateHealth(this.health, this.maxHealth);
    if (fromPos) {
      const dx = this.player.position.x - fromPos.x, dz = this.player.position.z - fromPos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.player.velocity.x += (dx / d) * 6;
      this.player.velocity.z += (dz / d) * 6;
      this.player.velocity.y = Math.max(this.player.velocity.y, 4);
    }
    const o = document.getElementById('damage-overlay');
    if (o) { o.style.opacity = '0.45'; setTimeout(() => { o.style.opacity = '0'; }, 150); }
    if (this.health <= 0) { this.health = 0; document.exitPointerLock(); UI.showDeath(); }
  }

  _updateSurvival(dt) {
    // Hunger drains slowly
    this.hungerTimer += dt;
    if (this.hungerTimer >= 30) {
      this.hungerTimer = 0;
      if (this.hunger > 0) this.hunger--;
      else {
        this.health -= 1;
        AudioManager.playSound('player_hurt');
      }
      UI.updateHunger(this.hunger, this.maxHunger);
    }

    // Natural regen when hunger > 18
    if (this.hunger >= 18 && this.health < this.maxHealth) {
      this.naturalRegenTimer += dt;
      if (this.naturalRegenTimer >= 1) {
        this.naturalRegenTimer = 0;
        this.health = Math.min(this.maxHealth, this.health + 1);
        UI.updateHealth(this.health, this.maxHealth);
      }
    }

    // Fall damage
    if (this.player.onGround && this.player.velocity.y < -10) {
      const damage = Math.floor((-this.player.velocity.y - 10) * 0.5);
      if (damage > 0) {
        this.health -= damage;
        AudioManager.playSound('player_hurt');
        UI.updateHealth(this.health, this.maxHealth);
        UI.addChatMessage(`Ouch! -${damage} fall damage`, 'System');
      }
    }

    // Death
    if (this.health <= 0) {
      this.health = 0;
      document.exitPointerLock();
      UI.showDeath();
    }
  }

  _render() {
    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game when window loads
window.addEventListener('load', () => {
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('btn-start');

  startBtn.addEventListener('click', async () => {
    overlay.style.display = 'none';
    document.getElementById('loading').style.display = 'flex';

    // Small delay to show loading screen
    setTimeout(async () => {
      const game = new Game();
      await game.init();
      document.getElementById('loading').style.display = 'none';
    }, 100);
  });
});
