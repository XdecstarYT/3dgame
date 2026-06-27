'use strict';

const UI = (() => {
  let hotbarEl, crosshairEl, healthEl, hungerEl, debugEl, inventoryEl;
  let overlayEl, pauseEl, deathEl;
  let craftingEl, craftSlotsEl, craftResultEl;
  let recipe_listEl;
  let chatEl, chatInputEl;
  let breakOverlayEl;
  let timeEl;

  function init(inventory) {
    hotbarEl = document.getElementById('hotbar');
    crosshairEl = document.getElementById('crosshair');
    healthEl = document.getElementById('health-bar');
    hungerEl = document.getElementById('hunger-bar');
    debugEl = document.getElementById('debug');
    inventoryEl = document.getElementById('inventory');
    overlayEl = document.getElementById('overlay');
    pauseEl = document.getElementById('pause-menu');
    deathEl = document.getElementById('death-screen');
    craftingEl = document.getElementById('crafting-grid');
    craftSlotsEl = document.getElementById('craft-slots');
    craftResultEl = document.getElementById('craft-result');
    recipe_listEl = document.getElementById('recipe-list');
    chatEl = document.getElementById('chat');
    chatInputEl = document.getElementById('chat-input');
    breakOverlayEl = document.getElementById('break-overlay');
    timeEl = document.getElementById('time-display');

    buildHotbar(inventory);
    buildInventoryGrid(inventory);
    buildCraftingGrid(inventory);
    updateHotbar(inventory);
    setupInventoryEvents(inventory);
  }

  function buildHotbar(inv) {
    hotbarEl.innerHTML = '';
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';
      slot.dataset.index = i;
      slot.innerHTML = `<canvas class="item-icon" width="32" height="32"></canvas><span class="item-count"></span>`;
      hotbarEl.appendChild(slot);
    }
  }

  function buildInventoryGrid(inv) {
    const grid = document.getElementById('inv-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < INV_ROWS * INV_COLS; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.dataset.index = i;
      slot.dataset.type = 'inv';
      slot.innerHTML = `<canvas class="item-icon" width="32" height="32"></canvas><span class="item-count"></span>`;
      grid.appendChild(slot);
    }
  }

  function buildCraftingGrid(inv) {
    if (!craftSlotsEl) return;
    craftSlotsEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot craft-slot';
      slot.dataset.index = i;
      slot.dataset.type = 'craft';
      slot.innerHTML = `<canvas class="item-icon" width="32" height="32"></canvas><span class="item-count"></span>`;
      craftSlotsEl.appendChild(slot);
    }
  }

  function setupInventoryEvents(inv) {
    // Click on inventory/crafting slots
    document.addEventListener('click', e => {
      const slot = e.target.closest('[data-type]');
      if (!slot || !inv.open) return;
      const type = slot.dataset.type;
      const idx = parseInt(slot.dataset.index);

      if (type === 'craft') {
        const item = inv.craftSlots[idx];
        if (inv.dragItem) {
          inv.craftSlots[idx] = { ...inv.dragItem };
          inv.dragItem = null;
        } else if (item && item.id !== BLOCK.AIR) {
          inv.dragItem = { ...item };
          inv.craftSlots[idx] = { id: BLOCK.AIR, count: 0 };
        }
        inv.updateCraftResult();
        updateInventory(inv);
      } else if (type === 'craft-result') {
        if (inv.craftResult && inv.craftResult.id !== BLOCK.AIR) {
          inv.addItem(inv.craftResult.id, inv.craftResult.count);
          // consume craft inputs
          for (const s of inv.craftSlots) { if (s.count > 0) { s.count--; if (s.count === 0) s.id = BLOCK.AIR; } }
          inv.updateCraftResult();
          updateInventory(inv);
          AudioManager.playSound('item_pickup');
        }
      } else if (type === 'inv') {
        const item = inv.slots[idx];
        if (inv.dragItem) {
          const tmp = { ...item };
          inv.slots[idx] = { ...inv.dragItem };
          inv.dragItem = (tmp.id !== BLOCK.AIR) ? tmp : null;
        } else if (item && item.id !== BLOCK.AIR) {
          inv.dragItem = { ...item };
          inv.slots[idx] = { id: BLOCK.AIR, count: 0 };
        }
        updateInventory(inv);
      } else if (type === 'hotbar-slot') {
        const item = inv.hotbar[idx];
        if (inv.dragItem) {
          const tmp = { ...item };
          inv.hotbar[idx] = { ...inv.dragItem };
          inv.dragItem = (tmp.id !== BLOCK.AIR) ? tmp : null;
        } else if (item && item.id !== BLOCK.AIR) {
          inv.dragItem = { ...item };
          inv.hotbar[idx] = { id: BLOCK.AIR, count: 0 };
        }
        updateHotbar(inv);
        updateInventory(inv);
      }
    });

    // Escape to close
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyE') {
        inv.toggleOpen();
        AudioManager.playSound(inv.open ? 'ui_open' : 'ui_click');
      }
      if (e.code === 'Escape') {
        if (inv.open) { inv.toggleOpen(); return; }
        togglePause();
      }
      if (e.code === 'KeyT') {
        // Chat
        if (!inv.open) {
          chatInputEl.style.display = 'block';
          chatInputEl.focus();
        }
      }
    });

    chatInputEl && chatInputEl.addEventListener('keydown', e => {
      if (e.code === 'Enter') {
        const msg = chatInputEl.value.trim();
        if (msg) addChatMessage(msg, 'You');
        chatInputEl.value = '';
        chatInputEl.style.display = 'none';
        document.getElementById('canvas').requestPointerLock();
        handleCommand(msg);
        e.stopPropagation();
      }
      if (e.code === 'Escape') {
        chatInputEl.style.display = 'none';
        document.getElementById('canvas').requestPointerLock();
        e.stopPropagation();
      }
    });
  }

  function drawItemIcon(canvas, id) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    if (!id || id === BLOCK.AIR) return;

    const def = BLOCK_DEF[id];
    if (!def) return;

    // Draw the top texture as icon
    const tileIdx = def.textures[0] || def.textures[2] || 0;
    if (!tileIdx) return;

    const atlas = window._atlasCanvas;
    if (!atlas) return;

    const TS = TextureAtlas.TILE;
    const AC = TextureAtlas.COLS;
    const col = tileIdx % AC;
    const row = Math.floor(tileIdx / AC);
    const sx = col * TS, sy = row * TS;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, sx, sy, TS, TS, 0, 0, 32, 32);

    // Slight 3D effect
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, 32, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, 28, 32, 4);
  }

  function updateHotbar(inv) {
    const slots = hotbarEl.querySelectorAll('.hotbar-slot');
    slots.forEach((slotEl, i) => {
      const item = inv.hotbar[i];
      slotEl.classList.toggle('selected', i === inv.selectedSlot);
      const canvas = slotEl.querySelector('.item-icon');
      const countEl = slotEl.querySelector('.item-count');
      if (item && item.id !== BLOCK.AIR) {
        drawItemIcon(canvas, item.id);
        countEl.textContent = item.count > 1 ? item.count : '';
      } else {
        if (canvas) { const c = canvas.getContext('2d'); c.clearRect(0,0,32,32); }
        countEl.textContent = '';
      }
    });
  }

  function updateInventory(inv) {
    if (!inv.open) return;
    // Inventory slots
    const invGrid = document.getElementById('inv-grid');
    if (invGrid) {
      const slotEls = invGrid.querySelectorAll('.inv-slot');
      slotEls.forEach((slotEl, i) => {
        const item = inv.slots[i];
        const canvas = slotEl.querySelector('.item-icon');
        const countEl = slotEl.querySelector('.item-count');
        if (item && item.id !== BLOCK.AIR) {
          drawItemIcon(canvas, item.id);
          countEl.textContent = item.count > 1 ? item.count : '';
        } else {
          if (canvas) { const c = canvas.getContext('2d'); c.clearRect(0,0,32,32); }
          countEl.textContent = '';
        }
      });
    }

    // Hotbar in inventory
    updateHotbar(inv);

    // Craft slots
    updateCrafting(inv);
  }

  function updateCrafting(inv) {
    if (!craftSlotsEl) return;
    const slotEls = craftSlotsEl.querySelectorAll('.craft-slot');
    slotEls.forEach((slotEl, i) => {
      const item = inv.craftSlots[i];
      const canvas = slotEl.querySelector('.item-icon');
      const countEl = slotEl.querySelector('.item-count');
      if (item && item.id !== BLOCK.AIR) {
        drawItemIcon(canvas, item.id);
        countEl.textContent = item.count > 1 ? item.count : '';
      } else {
        if (canvas) { const c = canvas.getContext('2d'); c.clearRect(0,0,32,32); }
        countEl.textContent = '';
      }
    });
    // Craft result
    if (craftResultEl) {
      const canvas = craftResultEl.querySelector('.item-icon');
      const countEl = craftResultEl.querySelector('.item-count');
      if (inv.craftResult && inv.craftResult.id !== BLOCK.AIR) {
        drawItemIcon(canvas, inv.craftResult.id);
        countEl.textContent = inv.craftResult.count > 1 ? inv.craftResult.count : '';
      } else {
        if (canvas) { const c = canvas.getContext('2d'); c.clearRect(0,0,32,32); }
        countEl.textContent = '';
      }
    }
  }

  function toggleInventory(inv) {
    inventoryEl.style.display = inv.open ? 'flex' : 'none';
    if (inv.open) updateInventory(inv);
  }

  function updateHealth(health, maxHealth) {
    if (!healthEl) return;
    healthEl.innerHTML = '';
    for (let i = 0; i < Math.ceil(maxHealth / 2); i++) {
      const heart = document.createElement('span');
      const full = health >= (i + 1) * 2;
      const half = !full && health > i * 2;
      heart.className = `heart ${full ? 'full' : half ? 'half' : 'empty'}`;
      heart.textContent = full ? '❤' : half ? '❤' : '♡';
      healthEl.appendChild(heart);
    }
  }

  function updateHunger(hunger, maxHunger) {
    if (!hungerEl) return;
    hungerEl.innerHTML = '';
    for (let i = 0; i < Math.ceil(maxHunger / 2); i++) {
      const drum = document.createElement('span');
      const full = hunger >= (i + 1) * 2;
      drum.className = `hunger-icon ${full ? 'full' : 'empty'}`;
      drum.textContent = full ? '🍗' : '○';
      hungerEl.appendChild(drum);
    }
  }

  function updateDebug(player, world, fps) {
    if (!debugEl || debugEl.style.display === 'none') return;
    const pos = player.position;
    const { cx, cz } = player.getChunkPos();
    const id = world.getBlock(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
    const biome = world.getBiome(pos.x, pos.z);
    debugEl.innerHTML = `
      <b>Minecraft Clone</b><br>
      FPS: ${fps.toFixed(1)}<br>
      XYZ: ${pos.x.toFixed(2)} / ${pos.y.toFixed(2)} / ${pos.z.toFixed(2)}<br>
      Chunk: ${cx}, ${cz}<br>
      Block: ${getBlockName(id) || 'Air'} (${id})<br>
      Biome: ${biome}<br>
      Chunks loaded: ${world.chunks.size}<br>
      Flying: ${player.flying}<br>
      On Ground: ${player.onGround}<br>
      Mode: ${player.creative ? 'Creative' : 'Survival'}
    `;
  }

  function updateBreakOverlay(percent) {
    if (!breakOverlayEl) return;
    if (percent <= 0) { breakOverlayEl.style.display = 'none'; return; }
    breakOverlayEl.style.display = 'block';
    const bars = breakOverlayEl.querySelectorAll('.break-stage');
    bars.forEach((b, i) => {
      b.classList.toggle('active', i < Math.floor(percent * 10));
    });
  }

  function updateTime(timeOfDay) {
    if (!timeEl) return;
    const hours = Math.floor(timeOfDay * 24);
    const minutes = Math.floor((timeOfDay * 24 * 60) % 60);
    const period = hours < 12 ? 'AM' : 'PM';
    const h12 = hours % 12 || 12;
    timeEl.textContent = `${h12}:${minutes.toString().padStart(2,'0')} ${period}`;
  }

  function togglePause() {
    if (!pauseEl) return;
    const isPaused = pauseEl.style.display !== 'none';
    pauseEl.style.display = isPaused ? 'none' : 'flex';
    if (isPaused) {
      document.getElementById('canvas').requestPointerLock();
    } else {
      document.exitPointerLock();
    }
  }

  function showDeath() {
    if (deathEl) deathEl.style.display = 'flex';
  }

  function hideDeath() {
    if (deathEl) deathEl.style.display = 'none';
  }

  function addChatMessage(msg, sender = 'System') {
    if (!chatEl) return;
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = `<span class="chat-sender">&lt;${sender}&gt;</span> ${msg}`;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
    // Auto-hide after 8s
    setTimeout(() => div.style.opacity = '0', 8000);
    setTimeout(() => div.remove(), 9000);
  }

  function handleCommand(msg) {
    if (!msg.startsWith('/')) return;
    const parts = msg.slice(1).split(' ');
    const cmd = parts[0].toLowerCase();
    switch (cmd) {
      case 'fly': window._game.player.flying = !window._game.player.flying; addChatMessage(`Flying: ${window._game.player.flying}`); break;
      case 'creative': window._game.player.creative = !window._game.player.creative; addChatMessage(`Mode: ${window._game.player.creative ? 'Creative' : 'Survival'}`); break;
      case 'tp':
        if (parts[3]) {
          window._game.player.position.set(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
          addChatMessage(`Teleported to ${parts[1]} ${parts[2]} ${parts[3]}`);
        }
        break;
      case 'give':
        const blockName = parts[1]?.toUpperCase();
        const blockId = BLOCK[blockName];
        if (blockId !== undefined) {
          window._game.inventory.addItem(blockId, parseInt(parts[2]) || 64);
          addChatMessage(`Given ${parts[2] || 64}x ${getBlockName(blockId)}`);
        }
        break;
      case 'time':
        if (parts[1] === 'day') window._game.timeOfDay = 0.25;
        else if (parts[1] === 'night') window._game.timeOfDay = 0.75;
        break;
      case 'help':
        addChatMessage('/fly /creative /tp x y z /give BLOCK count /time day|night');
        break;
    }
  }

  return {
    init, updateHotbar, updateInventory, toggleInventory,
    updateHealth, updateHunger, updateDebug, updateBreakOverlay,
    updateTime, togglePause, showDeath, hideDeath, addChatMessage,
    drawItemIcon, updateCrafting
  };
})();
