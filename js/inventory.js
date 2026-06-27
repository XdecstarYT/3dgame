'use strict';

const HOTBAR_SIZE = 9;
const INV_ROWS = 3;
const INV_COLS = 9;

class Inventory {
  constructor() {
    this.hotbar = Array.from({ length: HOTBAR_SIZE }, () => ({ id: BLOCK.AIR, count: 0 }));
    this.slots = Array.from({ length: INV_ROWS * INV_COLS }, () => ({ id: BLOCK.AIR, count: 0 }));
    this.selectedSlot = 0;
    this.open = false;
    this.craftSlots = Array.from({ length: 9 }, () => ({ id: BLOCK.AIR, count: 0 })); // 3x3
    this.craftResult = { id: BLOCK.AIR, count: 0 };
    this.dragItem = null;

    // Fill creative hotbar with common blocks
    this._fillCreativeHotbar();
    this._setupWheelScroll();
  }

  _fillCreativeHotbar() {
    const creativeItems = [
      BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.PLANKS,
      BLOCK.LOG, BLOCK.COBBLESTONE, BLOCK.SAND, BLOCK.GLASS, BLOCK.TORCH
    ];
    creativeItems.forEach((id, i) => {
      this.hotbar[i] = { id, count: 64 };
    });
  }

  _setupWheelScroll() {
    document.addEventListener('wheel', e => {
      if (document.pointerLockElement) {
        const delta = e.deltaY > 0 ? 1 : -1;
        this.selectedSlot = (this.selectedSlot + delta + HOTBAR_SIZE) % HOTBAR_SIZE;
        UI.updateHotbar(this);
      }
    });

    document.addEventListener('keydown', e => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        this.selectedSlot = num - 1;
        UI.updateHotbar(this);
      }
    });
  }

  getSelectedItem() {
    return this.hotbar[this.selectedSlot];
  }

  consumeSelected() {
    const slot = this.hotbar[this.selectedSlot];
    if (slot.count > 0) {
      slot.count--;
      if (slot.count === 0) slot.id = BLOCK.AIR;
    }
  }

  addItem(id, count) {
    if (!id || id === BLOCK.AIR) return;
    const def = getDef(id);
    if (!def) return;
    const maxStack = getStackSize(id);

    // Try to stack in hotbar first
    for (const slot of this.hotbar) {
      if (slot.id === id && slot.count < maxStack) {
        const add = Math.min(count, maxStack - slot.count);
        slot.count += add; count -= add;
        if (count <= 0) { UI.updateHotbar(this); return; }
      }
    }
    // Then inventory
    for (const slot of this.slots) {
      if (slot.id === id && slot.count < maxStack) {
        const add = Math.min(count, maxStack - slot.count);
        slot.count += add; count -= add;
        if (count <= 0) return;
      }
    }
    // Find empty slot
    for (const slot of this.hotbar) {
      if (slot.id === BLOCK.AIR || slot.count === 0) {
        slot.id = id; slot.count = Math.min(count, maxStack);
        count -= slot.count;
        UI.updateHotbar(this);
        if (count <= 0) return;
      }
    }
    for (const slot of this.slots) {
      if (slot.id === BLOCK.AIR || slot.count === 0) {
        slot.id = id; slot.count = Math.min(count, maxStack);
        count -= slot.count;
        if (count <= 0) return;
      }
    }
  }

  toggleOpen() {
    this.open = !this.open;
    UI.toggleInventory(this);
    if (this.open) {
      document.exitPointerLock();
    } else {
      document.getElementById('canvas').requestPointerLock();
    }
  }

  updateCraftResult() {
    const result = CraftingSystem.findRecipe(this.craftSlots);
    this.craftResult = result || { id: BLOCK.AIR, count: 0 };
    UI.updateCrafting(this);
  }
}
