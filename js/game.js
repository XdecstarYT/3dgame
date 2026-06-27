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

    this.material = null;
    this.waterMaterial = null;

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

    // Pre-generate chunks around spawn
    this._pregenerate();

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
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    this.material = new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.FrontSide,
    });

    // Water material (semi-transparent)
    const waterTexture = new THREE.CanvasTexture(atlasCanvas);
    waterTexture.magFilter = THREE.NearestFilter;
    waterTexture.minFilter = THREE.NearestFilter;

    this.waterMaterial = new THREE.MeshLambertMaterial({
      map: waterTexture,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
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

    // Spawn at a good location
    this.player.respawn();
  }

  _setupUI() {
    UI.init(this.inventory);
    UI.updateHealth(this.health, this.maxHealth);
    UI.updateHunger(this.hunger, this.maxHunger);
  }

  _setupEvents() {
    // Pointer lock
    const canvas = document.getElementById('canvas');

    canvas.addEventListener('click', () => {
      if (!this.inventory.open) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      const locked = !!document.pointerLockElement;
      document.getElementById('overlay').style.display = locked ? 'none' : 'flex';
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
      if (confirm('Quit to title?')) location.reload();
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
    // Ensure player is above terrain
    this.player.respawn();
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

    // Update player
    if (document.pointerLockElement) {
      this.player.update(dt, this.world, this.inventory);
    }

    // Survival mechanics
    if (!this.player.creative) {
      this._updateSurvival(dt);
    }

    // Update sky
    const fogColor = this.sky.update(this.timeOfDay, this.player.position);
    this.scene.fog.color.copy(fogColor);
    this.renderer.setClearColor(fogColor, 1);

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
