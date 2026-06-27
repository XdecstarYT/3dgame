'use strict';

const AudioManager = (() => {
  let ctx = null;
  const sounds = {};

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function playTone(freq, duration, type = 'square', volume = 0.1, detune = 0) {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      gain.gain.setValueAtTime(volume, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + duration);
    } catch(e) {}
  }

  function playNoise(duration, volume = 0.15, lowpass = 800) {
    try {
      const ac = getCtx();
      const bufSize = ac.sampleRate * duration;
      const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(volume, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      src.connect(filter); filter.connect(gain); gain.connect(ac.destination);
      src.start();
    } catch(e) {}
  }

  function playBlockBreak(id) {
    switch (id) {
      case BLOCK.STONE: case BLOCK.COBBLESTONE: case BLOCK.BEDROCK:
        playNoise(0.15, 0.3, 400);
        setTimeout(() => playNoise(0.1, 0.2, 300), 50);
        break;
      case BLOCK.GRASS: case BLOCK.DIRT:
        playNoise(0.1, 0.25, 1200);
        playTone(120, 0.1, 'triangle', 0.05);
        break;
      case BLOCK.WOOD: case BLOCK.LOG: case BLOCK.PLANKS:
        playTone(180, 0.08, 'square', 0.08);
        playNoise(0.12, 0.15, 600);
        break;
      case BLOCK.GLASS:
        playTone(1200, 0.05, 'sine', 0.12);
        playTone(900, 0.08, 'sine', 0.08, -100);
        playNoise(0.1, 0.1, 3000);
        break;
      case BLOCK.SAND: case BLOCK.GRAVEL:
        playNoise(0.12, 0.2, 1500);
        break;
      case BLOCK.LEAVES:
        playNoise(0.08, 0.12, 2000);
        playTone(400, 0.06, 'triangle', 0.04);
        break;
      default:
        playNoise(0.1, 0.2, 600);
    }
  }

  function playBlockPlace(id) {
    switch (id) {
      case BLOCK.STONE: case BLOCK.COBBLESTONE:
        playNoise(0.08, 0.25, 350);
        break;
      case BLOCK.GRASS: case BLOCK.DIRT:
        playNoise(0.06, 0.2, 1000);
        break;
      case BLOCK.WOOD: case BLOCK.LOG: case BLOCK.PLANKS:
        playTone(200, 0.06, 'square', 0.07);
        playNoise(0.06, 0.1, 700);
        break;
      case BLOCK.GLASS:
        playTone(800, 0.04, 'sine', 0.08);
        break;
      case BLOCK.SAND:
        playNoise(0.05, 0.15, 1200);
        break;
      default:
        playNoise(0.06, 0.15, 500);
    }
  }

  function playFootstep(id) {
    const vol = 0.06;
    switch (id) {
      case BLOCK.GRASS:   playNoise(0.05, vol, 1500); break;
      case BLOCK.STONE: case BLOCK.COBBLESTONE: playNoise(0.05, vol, 400); break;
      case BLOCK.SAND:    playNoise(0.05, vol, 2000); break;
      case BLOCK.WOOD: case BLOCK.PLANKS: playTone(180, 0.04, 'square', vol * 0.8); break;
      case BLOCK.SNOW:    playNoise(0.04, vol * 0.5, 2500); break;
      default:            playNoise(0.04, vol * 0.8, 600);
    }
  }

  function playSound(name) {
    switch (name) {
      case 'jump':
        playTone(200, 0.1, 'sine', 0.08);
        break;
      case 'land':
        playNoise(0.1, 0.2, 800);
        break;
      case 'explode':
        playNoise(0.5, 0.6, 200);
        playTone(80, 0.4, 'sawtooth', 0.3);
        setTimeout(() => playNoise(0.3, 0.4, 150), 100);
        break;
      case 'mob_hurt':
        playTone(300, 0.1, 'sawtooth', 0.1);
        playTone(200, 0.1, 'sawtooth', 0.08, -200);
        break;
      case 'mob_die':
        playTone(200, 0.2, 'sawtooth', 0.12);
        setTimeout(() => playTone(150, 0.15, 'sawtooth', 0.1), 100);
        break;
      case 'item_pickup':
        playTone(600, 0.05, 'sine', 0.08);
        setTimeout(() => playTone(800, 0.05, 'sine', 0.06), 50);
        break;
      case 'ui_click':
        playTone(400, 0.04, 'sine', 0.06);
        break;
      case 'ui_open':
        playTone(500, 0.06, 'sine', 0.07);
        setTimeout(() => playTone(650, 0.05, 'sine', 0.05), 60);
        break;
      case 'eat':
        for (let i = 0; i < 4; i++) {
          setTimeout(() => playNoise(0.04, 0.08, 1800), i * 80);
        }
        break;
      case 'player_hurt':
        playTone(180, 0.15, 'sawtooth', 0.15);
        break;
      case 'splash':
        playNoise(0.2, 0.3, 2000);
        playTone(200, 0.15, 'sine', 0.1);
        break;
      case 'ambient_day':
        // Bird chirp
        playTone(800 + Math.random() * 200, 0.08, 'sine', 0.03);
        setTimeout(() => playTone(900 + Math.random() * 200, 0.06, 'sine', 0.025), 100);
        break;
      case 'ambient_night':
        // Zombie groan
        playTone(100 + Math.random() * 40, 0.4, 'sawtooth', 0.04);
        break;
    }
  }

  // Ambient sound timer
  let ambientTimer = 0;
  function updateAmbient(dt, player, timeOfDay) {
    ambientTimer += dt;
    if (ambientTimer > 8 + Math.random() * 12) {
      ambientTimer = 0;
      const isDay = timeOfDay > 0.2 && timeOfDay < 0.8;
      if (isDay && Math.random() < 0.6) playSound('ambient_day');
      else if (!isDay && Math.random() < 0.3) playSound('ambient_night');
    }
  }

  // Footstep timer
  let stepTimer = 0;
  function updateFootsteps(dt, player) {
    const moving = player.onGround &&
      (Math.abs(player.velocity.x) > 0.5 || Math.abs(player.velocity.z) > 0.5);
    if (!moving) { stepTimer = 0; return; }

    const stepInterval = player.sprinting ? 0.33 : 0.5;
    stepTimer += dt;
    if (stepTimer >= stepInterval) {
      stepTimer = 0;
      const bx = Math.floor(player.position.x);
      const by = Math.floor(player.position.y - 0.1);
      const bz = Math.floor(player.position.z);
      // Get block player is standing on
      const blockBelow = player.world.getBlock(bx, by, bz);
      if (blockBelow !== BLOCK.AIR) playFootstep(blockBelow);
    }
  }

  return { playBlockBreak, playBlockPlace, playFootstep, playSound, updateAmbient, updateFootsteps };
})();
