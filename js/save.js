'use strict';

// World persistence via localStorage. Only player-modified chunks are stored,
// plus the seed so untouched terrain regenerates identically.
const SaveManager = (() => {
  const KEY = 'mc_clone_save_v1';

  function u8ToB64(u8) {
    let s = '';
    const CH = 0x8000;
    for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return btoa(s);
  }
  function b64ToU8(b64) {
    const s = atob(b64);
    const u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }
  function copyInto(target, src) {
    for (let i = 0; i < target.length; i++) {
      if (src && src[i]) { target[i].id = src[i].id; target[i].count = src[i].count; }
      else { target[i].id = BLOCK.AIR; target[i].count = 0; }
    }
  }

  function has() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }

  function save(game) {
    try {
      const data = {
        v: 1,
        seed: game.world.seed,
        time: game.timeOfDay,
        player: {
          x: game.player.position.x, y: game.player.position.y, z: game.player.position.z,
          yaw: game.player.yaw, pitch: game.player.pitch, creative: game.player.creative,
        },
        health: game.health, hunger: game.hunger,
        hotbar: game.inventory.hotbar.map(s => ({ id: s.id, count: s.count })),
        slots: game.inventory.slots.map(s => ({ id: s.id, count: s.count })),
        chunks: [],
      };
      for (const [k, ch] of game.world.chunks) {
        if (ch.modified) data.chunks.push({ k, b: u8ToB64(ch.data) });
      }
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) { console.warn('save failed', e); return false; }
  }

  function load(game) {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);

      game.world.setSeed(data.seed);
      game.timeOfDay = data.time ?? 0.3;
      game.health = data.health ?? 20;
      game.hunger = data.hunger ?? 20;

      const p = data.player || {};
      game.player.creative = !!p.creative;
      game.player.position.set(p.x ?? 8, p.y ?? 70, p.z ?? 8);
      game.player.yaw = p.yaw ?? 0;
      game.player.pitch = p.pitch ?? 0;
      game.player.velocity.set(0, 0, 0);

      copyInto(game.inventory.hotbar, data.hotbar);
      copyInto(game.inventory.slots, data.slots);

      for (const c of (data.chunks || [])) {
        const [cx, cz] = c.k.split(',').map(Number);
        const ch = game.world.getOrCreateChunk(cx, cz);
        const u8 = b64ToU8(c.b);
        if (u8.length === ch.data.length) ch.data.set(u8);
        ch.modified = true;
        ch.dirty = true;
      }

      UI.updateHealth(game.health, game.maxHealth);
      UI.updateHunger(game.hunger, game.maxHunger);
      UI.updateHotbar(game.inventory);
      return true;
    } catch (e) { console.warn('load failed', e); return false; }
  }

  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  return { has, save, load, clear };
})();
