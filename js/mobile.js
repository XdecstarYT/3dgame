'use strict';

// Auto-detecting touch controls that emulate Minecraft Pocket Edition layout.
const MobileControls = (() => {
  const state = {
    enabled: false,
    move: { x: 0, y: 0 },          // normalized joystick (-1..1), y forward+
    look: { dx: 0, dy: 0 },        // accumulated look delta, consumed per frame
    flags: { jump: false, sneak: false, breaking: false, placing: false, justPlaced: false },
  };

  let joyBase, joyKnob, lookZone;
  let joyTouchId = null, lookTouchId = null;
  let joyOrigin = { x: 0, y: 0 };
  const JOY_RADIUS = 60;

  function detect() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const ua = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);
    return touch && (coarse || ua);
  }

  function init() {
    state.enabled = detect();
    const root = document.getElementById('mobile-controls');
    if (!root) return state.enabled;

    if (!state.enabled) { root.style.display = 'none'; return false; }
    root.style.display = 'block';
    document.body.classList.add('is-mobile');

    joyBase = document.getElementById('joy-base');
    joyKnob = document.getElementById('joy-knob');
    lookZone = document.getElementById('look-zone');

    _bindJoystick();
    _bindLook();
    _bindButtons();
    _bindHotbar();
    // Prevent page scroll / pinch zoom / double-tap zoom
    document.addEventListener('touchmove', e => { if (e.touches.length) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());
    return true;
  }

  function _bindJoystick() {
    const zone = document.getElementById('joy-zone');
    zone.addEventListener('touchstart', e => {
      e.preventDefault();
      if (joyTouchId !== null) return;
      const t = e.changedTouches[0];
      joyTouchId = t.identifier;
      joyOrigin = { x: t.clientX, y: t.clientY };
      joyBase.style.left = (t.clientX - JOY_RADIUS) + 'px';
      joyBase.style.top = (t.clientY - JOY_RADIUS) + 'px';
      joyBase.style.display = 'block';
      _moveKnob(t.clientX, t.clientY);
    }, { passive: false });

    zone.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) { e.preventDefault(); _moveKnob(t.clientX, t.clientY); }
      }
    }, { passive: false });

    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) {
          joyTouchId = null;
          state.move.x = 0; state.move.y = 0;
          joyBase.style.display = 'none';
        }
      }
    };
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);
  }

  function _moveKnob(cx, cy) {
    let dx = cx - joyOrigin.x, dy = cy - joyOrigin.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, JOY_RADIUS);
    const ang = Math.atan2(dy, dx);
    const kx = Math.cos(ang) * clamped, ky = Math.sin(ang) * clamped;
    joyKnob.style.transform = `translate(${kx}px, ${ky}px)`;
    state.move.x = kx / JOY_RADIUS;
    state.move.y = -ky / JOY_RADIUS; // up = forward
  }

  function _bindLook() {
    lookZone.addEventListener('touchstart', e => {
      e.preventDefault();
      if (lookTouchId !== null) return;
      lookTouchId = e.changedTouches[0].identifier;
      _lastLook = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      _lookStart = performance.now();
      _lookMoved = 0;
    }, { passive: false });

    lookZone.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === lookTouchId) {
          e.preventDefault();
          const dx = t.clientX - _lastLook.x, dy = t.clientY - _lastLook.y;
          state.look.dx += dx; state.look.dy += dy;
          _lookMoved += Math.hypot(dx, dy);
          _lastLook = { x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: false });

    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === lookTouchId) {
          lookTouchId = null;
          // Quick tap on look zone = place block (like MCPE tap-to-place)
          if (performance.now() - _lookStart < 200 && _lookMoved < 10) {
            state.flags.justPlaced = true;
          }
        }
      }
    };
    lookZone.addEventListener('touchend', end);
    lookZone.addEventListener('touchcancel', end);
  }
  let _lastLook = { x: 0, y: 0 }, _lookStart = 0, _lookMoved = 0;

  function _holdButton(id, flag) {
    const el = document.getElementById(id);
    if (!el) return;
    const on = e => { e.preventDefault(); state.flags[flag] = true; el.classList.add('pressed'); };
    const off = e => { e.preventDefault(); state.flags[flag] = false; el.classList.remove('pressed'); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
  }

  function _tapButton(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); el.classList.add('pressed'); fn(); }, { passive: false });
    el.addEventListener('touchend', e => { e.preventDefault(); el.classList.remove('pressed'); }, { passive: false });
  }

  function _bindButtons() {
    _holdButton('btn-jump', 'jump');
    _holdButton('btn-break', 'breaking');
    _tapButton('btn-place', () => { state.flags.justPlaced = true; });
    _tapButton('btn-sneak', () => { state.flags.sneak = !state.flags.sneak; document.getElementById('btn-sneak').classList.toggle('active', state.flags.sneak); });
    _tapButton('btn-fly', () => {
      const p = window._game && window._game.player;
      if (p && p.creative) { p.flying = !p.flying; p.velocity.y = 0; }
    });
    _tapButton('btn-inv', () => { if (window._game) window._game.inventory.toggleOpen(); });
    _tapButton('btn-fly-up', () => { const p = window._game && window._game.player; if (p && p.flying) p.velocity.y = 9; });
  }

  function _bindHotbar() {
    const hb = document.getElementById('hotbar');
    if (!hb) return;
    hb.addEventListener('touchstart', e => {
      const slot = e.target.closest('.hotbar-slot');
      if (!slot) return;
      e.preventDefault();
      const g = window._game;
      if (g) { g.inventory.selectedSlot = parseInt(slot.dataset.index); UI.updateHotbar(g.inventory); }
    }, { passive: false });
  }

  // consume one-shot place flag
  function consumePlace() {
    if (state.flags.justPlaced) { state.flags.justPlaced = false; return true; }
    return false;
  }

  return { state, init, detect, consumePlace };
})();
