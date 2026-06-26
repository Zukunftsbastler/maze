'use strict';

// ────────────────────────────────────────────────────────────────────────────────
// panoptikum.js  –  Meta-Progression Hub + Global Persistent UI
// ────────────────────────────────────────────────────────────────────────────────

(function injectPanoStyles() {
  if (document.getElementById('pano-styles')) return;
  const s = document.createElement('style');
  s.id = 'pano-styles';
  s.textContent = `
    /* ── Panoptikum hub container ──────────────────────────────────────────── */
    #panoptikum-hub {
      position: fixed; inset: 0; z-index: 500;
      background: #06060f;
      display: none; flex-direction: column;
      font-family: 'Courier New', monospace; color: #c8d6e5;
      overflow: hidden;
    }

    /* ── Tutorial transition (dirty panoptikum) ────────────────────────────── */
    #pano-transition {
      position: absolute; inset: 0; z-index: 5;
      display: none; align-items: center; justify-content: center;
    }
    #pano-dirty-img {
      position: absolute; inset: 0;
      width: 100%; height: 100%; object-fit: cover;
      z-index: 1;
    }
    #pano-transition-panel {
      position: relative; z-index: 2;
      max-width: 520px; width: 90%;
      background: rgba(6,6,15,0.86); backdrop-filter: blur(8px);
      border: 1px solid rgba(184,153,114,0.38);
      border-radius: 10px; padding: 26px 28px;
      display: flex; flex-direction: column; gap: 20px; align-items: center;
    }
    #pano-transition-panel .lore-text {
      border: none; background: none; padding: 0; margin: 0;
      font-size: 0.88rem; text-align: left;
    }
    #btn-claim-sanctuary { width: 100%; }

    /* ── Main views wrapper ────────────────────────────────────────────────── */
    #pano-views {
      position: absolute; inset: 0;
    }

    /* ── Panoptikum hub view (z-index layer stack per spec) ────────────────── */
    #pano-view-hub {
      position: absolute; inset: 0;
      display: flex; align-items: flex-end;
    }
    #pano-bg {
      position: absolute; inset: 0; z-index: 1;
      background-image: url('ASSETS/PANOPTICUM/Panopticum.png');
      background-size: cover; background-position: center;
    }
    #artifact-layer {
      position: absolute; inset: 0; z-index: 10;
      pointer-events: none;
    }
    #crowd-foreground {
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 22%; z-index: 20; overflow: hidden;
      pointer-events: none;
    }

    /* ── Fade screen for smooth view transitions ───────────────────────────── */
    #pano-fade-screen {
      position: fixed; inset: 0; z-index: 1050;
      background: #06060f; opacity: 0;
      pointer-events: none; transition: opacity 0.20s ease;
    }
    #pano-fade-screen.fading { opacity: 1; pointer-events: all; }

    /* ── Global persistent UI bar ──────────────────────────────────────────── */
    #global-ui {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1100;
      height: 50px; display: none;
      align-items: center; justify-content: space-between;
      padding: 0 18px;
      background: rgba(6,6,15,0.90); backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(74,158,255,0.18);
      font-family: 'Courier New', monospace;
    }

    /* Left panel */
    #global-left { display: flex; align-items: center; gap: 20px; }
    #global-score-block { display: flex; flex-direction: column; line-height: 1.15; }
    #global-score-label {
      font-size: 0.54rem; letter-spacing: 0.14em; color: #4a9eff;
      text-transform: uppercase;
    }
    #global-score-val {
      font-size: 1.05rem; font-weight: bold; color: #ffd23f;
      text-shadow: 0 0 8px rgba(255,210,63,0.35);
    }
    #global-stats-placeholder {
      font-size: 0.60rem; color: #1e2e3e; letter-spacing: 0.06em;
      /* reserved for future statistics */
    }

    /* Right panel — navigation */
    #global-right { display: flex; gap: 6px; }
    .global-nav-btn {
      background: transparent;
      border: 1px solid rgba(74,158,255,0.25); color: #445566;
      border-radius: 5px; padding: 5px 13px;
      font-family: inherit; font-size: 0.70rem; letter-spacing: 0.09em;
      cursor: pointer; text-transform: uppercase;
      transition: background 0.14s, color 0.14s, border-color 0.14s,
                  box-shadow 0.14s;
      white-space: nowrap;
    }
    .global-nav-btn:hover {
      background: rgba(74,158,255,0.10); color: #4a9eff;
      border-color: rgba(74,158,255,0.55);
    }
    .global-nav-btn.active {
      background: rgba(74,158,255,0.14); color: #4a9eff;
      border-color: #4a9eff;
      box-shadow: 0 0 8px rgba(74,158,255,0.25);
    }

    /* ── Offset expedition overlay below global bar ────────────────────────── */
    body.pano-ui-active #expedition-overlay { top: 50px; }
    body.pano-ui-active #expedition-overlay #exp-title-bar { display: none; }

    /* ── Reset progress button (in global left panel) ──────────────────────── */
    #btn-reset-progress {
      background: transparent;
      border: 1px solid rgba(255,68,102,0.22); color: #3a2030;
      border-radius: 4px; padding: 3px 9px;
      font-family: inherit; font-size: 0.62rem; letter-spacing: 0.09em;
      cursor: pointer; text-transform: uppercase;
      transition: background 0.14s, color 0.14s, border-color 0.14s;
      white-space: nowrap;
    }
    #btn-reset-progress:hover {
      background: rgba(255,68,102,0.10); color: #ff4466;
      border-color: rgba(255,68,102,0.55);
    }

    /* ── Confirmation modal ─────────────────────────────────────────────────── */
    #reset-confirm-overlay {
      position: fixed; inset: 0; z-index: 1200;
      background: rgba(6,6,15,0.80); backdrop-filter: blur(6px);
      display: none; align-items: center; justify-content: center;
    }
    #reset-confirm-overlay.visible { display: flex; }
    #reset-confirm-dialog {
      background: rgba(12,10,22,0.98);
      border: 1px solid rgba(255,68,102,0.40);
      border-radius: 10px; padding: 28px 30px;
      max-width: 420px; width: 90%;
      font-family: 'Courier New', monospace; color: #c8d6e5;
      text-align: center;
      box-shadow: 0 0 40px rgba(255,68,102,0.12);
    }
    #reset-confirm-title {
      font-size: 0.95rem; font-weight: bold; letter-spacing: 0.12em;
      text-transform: uppercase; color: #ff4466;
      text-shadow: 0 0 10px rgba(255,68,102,0.5);
      margin-bottom: 14px;
    }
    #reset-confirm-body {
      font-size: 0.78rem; color: #7a8899; line-height: 1.68;
      margin-bottom: 22px;
    }
    #reset-confirm-body strong { color: #c8d6e5; }
    #reset-confirm-btns {
      display: flex; gap: 10px; justify-content: center;
    }
    #btn-reset-cancel {
      flex: 1; padding: 9px 0;
      background: transparent; border: 1.5px solid #334455; color: #556677;
      border-radius: 6px; font-family: inherit; font-size: 0.80rem;
      letter-spacing: 0.08em; cursor: pointer; text-transform: uppercase;
      transition: background 0.14s, color 0.14s, border-color 0.14s;
    }
    #btn-reset-cancel:hover {
      background: rgba(74,158,255,0.08); color: #4a9eff;
      border-color: rgba(74,158,255,0.4);
    }
    #btn-reset-confirm {
      flex: 1; padding: 9px 0;
      background: rgba(255,68,102,0.10); border: 1.5px solid #ff4466;
      color: #ff4466; border-radius: 6px; font-family: inherit;
      font-size: 0.80rem; font-weight: bold; letter-spacing: 0.08em;
      cursor: pointer; text-transform: uppercase;
      transition: background 0.14s, box-shadow 0.14s;
    }
    #btn-reset-confirm:hover {
      background: rgba(255,68,102,0.20);
      box-shadow: 0 0 14px rgba(255,68,102,0.35);
    }
  `;
  document.head.appendChild(s);
})();

// ── PanoArcManager — flying currency particle arcs ────────────────────────────
// Renders on a fixed transparent canvas (z-index 1090, above views, below nav).
// Gold arcs: small glowing coin circles.
// Research arcs: green radial-gradient circles; area scales with size parameter.

class PanoArcManager {
  constructor() {
    this._arcs     = [];
    this._raf      = null;
    this._lastTime = 0;
    this._ctx      = null;
    this._w = this._h = 0;
    this._buildCanvas();
    window.addEventListener('resize', () => this._resize());
  }

  _buildCanvas() {
    const c = document.createElement('canvas');
    c.id = 'pano-arc-canvas';
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1090;';
    document.body.appendChild(c);
    this._ctx = c.getContext('2d');
    this._resize();
  }

  _resize() {
    const c = this._ctx.canvas;
    this._w = c.width  = window.innerWidth;
    this._h = c.height = window.innerHeight;
  }

  // Spawn a gold coin arc from screen position (fx,fy) toward targetEl
  spawnGold(fx, fy, targetEl) {
    const r = targetEl?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    this._add({ type: 'gold', fx, fy,
      tx: r.left + r.width / 2, ty: r.top + r.height / 2, size: 1 });
  }

  // Spawn a research circle arc; size ≥ 1 scales circle area proportionally
  spawnResearch(fx, fy, targetEl, size = 1) {
    const r = targetEl?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    this._add({ type: 'research', fx, fy,
      tx: r.left + r.width / 2, ty: r.top + r.height / 2, size });
  }

  _add(arc) {
    // Bezier control point: pull upward and slightly toward the horizontal midpoint,
    // creating a smooth upward-then-inward curve regardless of source/target layout.
    const mx  = arc.fx + (arc.tx - arc.fx) * 0.15;
    const dy  = Math.abs(arc.fy - arc.ty);
    arc.cx    = mx;
    arc.cy    = Math.min(arc.fy, arc.ty) - Math.max(60, dy * 0.40);
    arc.t     = 0;
    arc.delay = Math.random() * 0.10; // slight stagger so simultaneous arcs fan out
    this._arcs.push(arc);
    if (!this._raf) {
      this._lastTime = performance.now();
      this._raf = requestAnimationFrame(t => this._tick(t));
    }
  }

  _tick(now) {
    const dt = Math.min(now - this._lastTime, 80) / 1000;
    this._lastTime = now;
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._w, this._h);

    const DURATION = 0.68;
    for (const arc of this._arcs) {
      if (arc.delay > 0) { arc.delay -= dt; continue; }
      arc.t = Math.min(1, arc.t + dt / DURATION);
      const t = arc.t;
      const x = (1-t)*(1-t)*arc.fx + 2*(1-t)*t*arc.cx + t*t*arc.tx;
      const y = (1-t)*(1-t)*arc.fy + 2*(1-t)*t*arc.cy + t*t*arc.ty;
      // Fade out in the last 25 % of travel
      const alpha = t > 0.75 ? Math.max(0, (1 - t) / 0.25) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (arc.type === 'gold') {
        ctx.shadowColor = 'rgba(255,210,63,0.90)';
        ctx.shadowBlur  = 12;
        ctx.fillStyle   = '#ffd23f';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = 'rgba(255,255,200,0.55)';
        ctx.beginPath();
        ctx.arc(x - 1.5, y - 1.5, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const radius = Math.max(5, 7 * Math.sqrt(Math.max(1, arc.size)));
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0,   'rgba(190,255,225,0.95)');
        g.addColorStop(0.45,'rgba(0,255,136,0.88)');
        g.addColorStop(1,   'rgba(0,80,45,0)');
        ctx.fillStyle   = g;
        ctx.shadowColor = 'rgba(0,255,136,0.70)';
        ctx.shadowBlur  = 14;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    this._arcs = this._arcs.filter(a => a.delay > 0 || a.t < 1);
    if (this._arcs.length > 0) {
      this._raf = requestAnimationFrame(t => this._tick(t));
    } else {
      this._raf = null;
      ctx.clearRect(0, 0, this._w, this._h);
    }
  }
}

// ── PanoptikumCollection — persistent artifact state + passive income ──────────

class PanoptikumCollection {
  static STORAGE_KEY      = 'hexmaze_collection';
  static LAB_STORAGE_KEY  = 'hexmaze_laboratory';
  static PEDESTAL_COUNT   = 5;
  static LAB_SLOT_COUNT   = 3;
  static INCOME_INTERVAL_MS = 1_000; // smooth 1-second tick

  // Research unlock costs per field
  static UNLOCK_COSTS = { lore: 10, traits: 15, origin: 20, arcaneResonance: 50 };
  static EQUIP_SLOT_TYPES = ['head', 'eyes', 'face', 'hands', 'tool', 'pouch', 'boots'];

  constructor() {
    this._incomeTimer = null;
    this._onTickCb    = null;
    this.state    = this._load();
    this.labState = this._loadLab();
    while (this.state.pedestals.length < PanoptikumCollection.PEDESTAL_COUNT) {
      this.state.pedestals.push(null);
    }
    while (this.labState.slots.length < PanoptikumCollection.LAB_SLOT_COUNT) {
      this.labState.slots.push(null);
    }
    if (!this.labState.equipped) {
      this.labState.equipped = Object.fromEntries(
        PanoptikumCollection.EQUIP_SLOT_TYPES.map(s => [s, null])
      );
    }
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  _load() {
    try {
      const raw = localStorage.getItem(PanoptikumCollection.STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      inventory:           [],
      pedestals:           new Array(PanoptikumCollection.PEDESTAL_COUNT).fill(null),
      panoptikumGold:      0,
      lastIncomeTimestamp: Date.now(),
    };
  }

  _save() {
    try {
      localStorage.setItem(PanoptikumCollection.STORAGE_KEY, JSON.stringify(this.state));
    } catch (_) {}
  }

  // ── Artifact management ───────────────────────────────────────────────────────

  addArtifact(typeId, tier = 1) {
    const instance = ArtifactRegistry.createInstance(typeId, tier);
    this.state.inventory.push(instance);
    this._save();
    return instance;
  }

  getItem(instanceId) {
    return this.state.inventory.find(i => i.instanceId === instanceId) ?? null;
  }

  // Locate an item anywhere (inventory / pedestals / lab slots) and pull it out
  _findAndRemoveItem(instanceId) {
    // Check inventory
    let item = this.state.inventory.find(i => i.instanceId === instanceId);
    if (item) {
      this.state.inventory = this.state.inventory.filter(i => i.instanceId !== instanceId);
      return item;
    }
    // Check pedestals
    for (let p = 0; p < this.state.pedestals.length; p++) {
      if (this.state.pedestals[p]?.instanceId === instanceId) {
        item = this.state.pedestals[p];
        this.state.pedestals[p] = null;
        item.state = 'inventory'; item.pedestalIndex = null;
        return item;
      }
    }
    // Check lab slots
    for (let l = 0; l < this.labState.slots.length; l++) {
      if (this.labState.slots[l]?.instanceId === instanceId) {
        item = this.labState.slots[l];
        this.labState.slots[l] = null;
        item.state = 'inventory'; item.labSlotIndex = null;
        return item;
      }
    }
    // Check equipment slots
    for (const slotType of PanoptikumCollection.EQUIP_SLOT_TYPES) {
      if (this.labState.equipped[slotType]?.instanceId === instanceId) {
        item = this.labState.equipped[slotType];
        this.labState.equipped[slotType] = null;
        item.state = 'inventory'; item.equipSlot = null;
        return item;
      }
    }
    return null;
  }

  // ── Equipment management ──────────────────────────────────────────────────────

  equipArtifact(instanceId, slotType) {
    const def = ArtifactRegistry.getById(this._resolveTypeId(instanceId));
    if (!def || def.equipSlot !== slotType) return false;
    const item = this._findAndRemoveItem(instanceId);
    if (!item) return false;
    const existing = this.labState.equipped[slotType];
    if (existing) {
      existing.state = 'inventory'; existing.equipSlot = null;
      if (!this.state.inventory.find(i => i.instanceId === existing.instanceId))
        this.state.inventory.push(existing);
    }
    item.state = 'equipped'; item.equipSlot = slotType;
    this.labState.equipped[slotType] = item;
    this._save(); this._saveLab();
    return true;
  }

  unequipSlot(slotType) {
    const item = this.labState.equipped[slotType];
    if (!item) return;
    item.state = 'inventory'; item.equipSlot = null;
    this.labState.equipped[slotType] = null;
    this.state.inventory.push(item);
    this._save(); this._saveLab();
  }

  getEquippedItems() { return { ...this.labState.equipped }; }

  _resolveTypeId(instanceId) {
    let item = this.state.inventory.find(i => i.instanceId === instanceId);
    if (!item) item = this.state.pedestals.find(s => s?.instanceId === instanceId);
    if (!item) item = this.labState.slots.find(s => s?.instanceId === instanceId);
    if (!item) {
      for (const t of PanoptikumCollection.EQUIP_SLOT_TYPES) {
        if (this.labState.equipped[t]?.instanceId === instanceId) { item = this.labState.equipped[t]; break; }
      }
    }
    return item?.typeId ?? null;
  }

  // Build unlockedFields map keyed by typeId (used by ArtifactRegistry)
  getUnlockedByTypeId() { return this.labState.unlockedFields; }

  exhibit(instanceId, pedestalIndex) {
    const item = this._findAndRemoveItem(instanceId);
    if (!item) return;
    // Return whatever was on that pedestal to inventory
    const existing = this.state.pedestals[pedestalIndex];
    if (existing) {
      existing.state = 'inventory'; existing.pedestalIndex = null;
      if (!this.state.inventory.find(i => i.instanceId === existing.instanceId))
        this.state.inventory.push(existing);
    }
    item.state = 'exhibited'; item.pedestalIndex = pedestalIndex;
    this.state.pedestals[pedestalIndex] = item;
    this._save(); this._saveLab();
  }

  unexhibit(pedestalIndex) {
    const item = this.state.pedestals[pedestalIndex];
    if (!item) return;
    item.state = 'inventory'; item.pedestalIndex = null;
    this.state.pedestals[pedestalIndex] = null;
    this.state.inventory.push(item);
    this._save();
  }

  // ── Merge: 3 identical (typeId+tier) → 1 at tier+1 ─────────────────────────

  checkMerge() {
    const result = ArtifactRegistry.tryMerge(this.state.inventory);
    if (!result) return null;
    this.state.inventory = this.state.inventory.filter(i => !result.remove.includes(i.instanceId));
    this.state.inventory.push(result.add);
    this._save();
    return { newTier: result.add.tier, typeId: result.add.typeId };
  }

  // ── Passive income ─────────────────────────────────────────────────────────

  awardOfflineIncome() {
    const now     = Date.now();
    const elapsed = (now - (this.state.lastIncomeTimestamp ?? now)) / 1000;
    const gpm     = ArtifactRegistry.calculatePassiveGPM(this.state.pedestals, this.getUnlockedByTypeId());
    const earned  = (gpm / 60) * elapsed;
    if (earned > 0) {
      this.state.panoptikumGold      += earned;
      this.state.lastIncomeTimestamp  = now;
      this._save();
    }
  }

  startIncomeTicker(onTick) {
    this._onTickCb = onTick;
    this._incomeTimer = setInterval(() => {
      const gpm          = ArtifactRegistry.calculatePassiveGPM(this.state.pedestals, this.getUnlockedByTypeId());
      const goldEarned   = (gpm / 60) * (PanoptikumCollection.INCOME_INTERVAL_MS / 1000);
      if (goldEarned > 0) {
        this.state.panoptikumGold     += goldEarned;
        this.state.lastIncomeTimestamp = Date.now();
        this._save();
      }
      const researchEarned = this.tickResearch();
      if (this._onTickCb) this._onTickCb({ goldEarned, researchEarned });
    }, PanoptikumCollection.INCOME_INTERVAL_MS);
  }

  stopIncomeTicker() {
    if (this._incomeTimer) { clearInterval(this._incomeTimer); this._incomeTimer = null; }
  }

  // ── Lab persistence ───────────────────────────────────────────────────────────

  _loadLab() {
    try {
      const raw = localStorage.getItem(PanoptikumCollection.LAB_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      purchased:             false,
      research:              0,
      slots:                 new Array(PanoptikumCollection.LAB_SLOT_COUNT).fill(null),
      lastResearchTimestamp: Date.now(),
      unlockedFields:        {},
      equipped:              Object.fromEntries(PanoptikumCollection.EQUIP_SLOT_TYPES.map(s => [s, null])),
    };
  }

  _saveLab() {
    try {
      localStorage.setItem(PanoptikumCollection.LAB_STORAGE_KEY, JSON.stringify(this.labState));
    } catch (_) {}
  }

  // ── Lab artifact management ───────────────────────────────────────────────────

  placeInLab(instanceId, slotIndex) {
    const item = this._findAndRemoveItem(instanceId);
    if (!item) return false;
    // Return whatever was in that lab slot to inventory
    const existing = this.labState.slots[slotIndex];
    if (existing) {
      existing.state = 'inventory'; existing.labSlotIndex = null;
      if (!this.state.inventory.find(i => i.instanceId === existing.instanceId))
        this.state.inventory.push(existing);
    }
    item.state = 'in_lab'; item.labSlotIndex = slotIndex;
    this.labState.slots[slotIndex] = item;
    this._save(); this._saveLab();
    return true;
  }

  removeFromLab(slotIndex) {
    const item = this.labState.slots[slotIndex];
    if (!item) return;
    item.state        = 'inventory';
    item.labSlotIndex = null;
    this.labState.slots[slotIndex] = null;
    this.state.inventory.push(item);
    this._save();
    this._saveLab();
  }

  // ── Research generation (called from income ticker) ───────────────────────────

  tickResearch() {
    const now     = Date.now();
    const elapsed = (now - (this.labState.lastResearchTimestamp ?? now)) / 1000;
    let tierPoints = 0;
    for (const s of this.labState.slots) { if (s) tierPoints += s.tier; }
    const rpm    = tierPoints;
    const earned = (rpm / 60) * elapsed;
    if (earned > 0) {
      this.labState.research              += earned;
      this.labState.lastResearchTimestamp  = now;
      this._saveLab();
    }
    return earned; // callers use this to drive arc animations
  }

  // ── Field unlock ──────────────────────────────────────────────────────────────

  unlockField(instanceId, field) {
    const cost = PanoptikumCollection.UNLOCK_COSTS[field];
    if (!cost || this.labState.research < cost) return false;
    const typeId = this._resolveTypeId(instanceId) ?? instanceId;
    this.labState.research -= cost;
    if (!this.labState.unlockedFields[typeId])
      this.labState.unlockedFields[typeId] = [];
    if (!this.labState.unlockedFields[typeId].includes(field))
      this.labState.unlockedFields[typeId].push(field);
    this._saveLab();
    return true;
  }

  isFieldUnlocked(instanceId, field) {
    const typeId = this._resolveTypeId(instanceId) ?? instanceId;
    return (this.labState.unlockedFields[typeId] || []).includes(field);
  }
}

// ── PanoptikumHub ──────────────────────────────────────────────────────────────

class PanoptikumHub {
  /**
   * @param {ExpeditionMaps} expeditionMaps
   */
  constructor(expeditionMaps) {
    this._exp         = expeditionMaps;
    this._startExpCb  = null;
    this._onAfterClaim = null;
    this._buildDOM();
    this._syncScore();
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Show the dirty-panoptikum transition screen (called once after tutorial).
   * onAfterClaim() fires when the player clicks "Restore & Claim Sanctuary".
   */
  showTransition(onAfterClaim) {
    this._onAfterClaim = onAfterClaim;
    this._hideGlobalUI();
    this._hub().style.display = 'flex';
    this._el('pano-transition').style.display = 'flex';
    this._el('pano-views').style.display      = 'none';
  }

  /**
   * Show the restored Panoptikum hub (main menu).
   * startCb(zone) is called when the player starts an expedition.
   */
  showHub(startCb) {
    if (startCb) this._startExpCb = startCb;
    this._exp.hide();
    this._hub().style.display = 'flex';
    this._el('pano-transition').style.display = 'none';
    this._el('pano-views').style.display      = '';
    this._el('pano-view-hub').style.display   = '';
    this._el('pano-view-hub').classList.add('active');
    this._el('pano-view-lab')?.classList.remove('active');
    this._el('pano-view-equip')?.classList.remove('active');
    this._showGlobalUI();
    this._setNavActive('panoptikum');
    this._updateLabNavButton();
    this._syncScore();
    if (this._collection) {
      this._collection.awardOfflineIncome();
      this._collection.tickResearch();
      this._syncCollectionUI();
      this._startHubVisitors();
    }
  }

  /**
   * Show View A (macro map) via the expedition overlay.
   * startCb(zone) is called when an expedition is started from the overlay.
   */
  showViewA(startCb) {
    if (startCb) this._startExpCb = startCb;
    this._fadeTransition(() => {
      this._hub().style.display = 'none';
      this._exp.show(zone => { if (this._startExpCb) this._startExpCb(zone); });
      this._showGlobalUI();
      this._setNavActive('view-a');
      this._syncScore();
    });
  }

  /**
   * Show View B (micro map) via the expedition overlay.
   */
  showViewB(startCb) {
    if (startCb) this._startExpCb = startCb;
    this._fadeTransition(() => {
      this._hub().style.display = 'none';
      this._exp.showAtMicro(zone => { if (this._startExpCb) this._startExpCb(zone); });
      this._showGlobalUI();
      this._setNavActive('view-b');
      this._syncScore();
    });
  }

  /** Call before entering play mode — hides hub + global UI. */
  enterPlayMode() {
    this._exp.hide();
    this._hub().style.display = 'none';
    this._hideGlobalUI();
    this._stopVisitorAnimation();
  }

  /** Refresh the global score display from expedition state. */
  syncScore() { this._syncScore(); }

  // ── DOM construction ──────────────────────────────────────────────────────────

  _buildDOM() {
    // ── Fade screen (sits above everything except the very top) ──────────────
    const fade = document.createElement('div');
    fade.id = 'pano-fade-screen';
    document.body.appendChild(fade);

    // ── Hub container ─────────────────────────────────────────────────────────
    const hub = document.createElement('div');
    hub.id = 'panoptikum-hub';
    hub.innerHTML = `
      <!-- Transition: dirty panoptikum -->
      <div id="pano-transition">
        <img id="pano-dirty-img"
             src="ASSETS/PANOPTICUM/Panopticum_dirty.png"
             alt="The Panoptikum — ruined">
        <div id="pano-transition-panel">
          <p class="lore-text">I have finally reached the legendary Panoptikum. It is covered in cobwebs, moss, and centuries of decay. If I can clean this place up, it will serve as the perfect sanctuary and exhibition hall for my discoveries.</p>
          <button class="primary accent" id="btn-claim-sanctuary">Restore &amp; Claim Sanctuary</button>
        </div>
      </div>

      <!-- Main views (shown after transition) -->
      <div id="pano-views">
        <!-- View: Restored Panoptikum hub -->
        <div id="pano-view-hub">
          <div id="pano-bg"></div>
          <div id="artifact-layer"></div>
          <div id="crowd-foreground"></div>
        </div>
        <!-- View: Laboratory -->
        <div id="pano-view-lab">
          <div id="lab-header">
            <span id="lab-header-title">⚗ The Laboratory</span>
          </div>
          <div id="lab-stats-bar">
            <div class="lab-stat-chip">
              <span class="lab-stat-label">Research</span>
              <span class="lab-stat-value" id="lab-research-val">0</span>
            </div>
            <div class="lab-stat-chip">
              <span class="lab-stat-label">Research / min</span>
              <span class="lab-stat-value green" id="lab-research-rate">0</span>
            </div>
          </div>
          <div id="lab-content-row">
            <div id="lab-slots-col">
              <div class="lab-col-title">Research Slots</div>
              <div id="lab-slots-area"></div>
              <div id="lab-help-text">
                Artifacts placed here generate Research over time (1 ⬡/min per tier).<br>
                Click any artifact to open its dossier and spend Research to unlock hidden properties.
              </div>
            </div>
            <div id="lab-inv-col">
              <div class="lab-col-title">Cabinet of Curiosities</div>
              <div id="lab-inv-grid"></div>
            </div>
          </div>
        </div>
        <!-- View: Equipment / Loadout -->
        <div id="pano-view-equip">
          <div id="equip-header">
            <span id="equip-header-title">⚔ Antiquarian's Loadout</span>
            <span id="equip-header-sub">Equipped items grant effects during expeditions.</span>
          </div>
          <div id="equip-content-row">
            <div id="equip-slots-col">
              <div class="equip-slots-grid" id="equip-slots-area"></div>
            </div>
            <div id="equip-figure-col">
              <img id="equip-antiquarian-img" src="ASSETS/ANTIQUARIANS/the_rugged_explorer_full.png" alt="Antiquarian">
            </div>
            <div id="equip-inv-col">
              <div class="lab-col-title">Cabinet of Curiosities</div>
              <div id="equip-inv-grid"></div>
            </div>
          </div>
        </div>
        <!-- Views A & B are rendered by the expedition overlay (z-1000) above this -->
      </div>
    `;
    document.body.appendChild(hub);

    hub.querySelector('#btn-claim-sanctuary').addEventListener('click', () => {
      localStorage.setItem('hexmaze_panoptikum_restored', '1');
      this._fadeTransition(() => {
        if (this._onAfterClaim) this._onAfterClaim();
        else this.showHub();
      });
    });

    // ── Global UI bar ─────────────────────────────────────────────────────────
    const ui = document.createElement('div');
    ui.id = 'global-ui';
    ui.innerHTML = `
      <div id="global-left">
        <div id="global-score-block">
          <span id="global-score-label">Total Score</span>
          <span id="global-score-val">0</span>
        </div>
        <div id="global-stats-placeholder"></div>
        <button id="btn-reset-progress">↺ Reset</button>
      </div>
      <div id="global-right">
        <button id="btn-nav-panoptikum"  class="global-nav-btn active">⌂ Panoptikum</button>
        <button id="btn-nav-laboratory"  class="global-nav-btn lab-locked">⚗ Laboratory</button>
        <button id="btn-nav-equipment"   class="global-nav-btn">⚔ Loadout</button>
        <button id="btn-nav-view-a"      class="global-nav-btn">⬡ World Map</button>
        <button id="btn-nav-view-b"      class="global-nav-btn">⚔ Expeditions</button>
      </div>
    `;
    document.body.appendChild(ui);

    ui.querySelector('#btn-nav-panoptikum').addEventListener('click', () => {
      this._fadeTransition(() => this.showHub());
    });
    ui.querySelector('#btn-nav-laboratory').addEventListener('click', () => {
      this._onLabNavClick();
    });
    ui.querySelector('#btn-nav-equipment').addEventListener('click', () => {
      this._fadeTransition(() => this.showEquip());
    });
    ui.querySelector('#btn-nav-view-a').addEventListener('click', () => {
      this.showViewA();
    });
    ui.querySelector('#btn-nav-view-b').addEventListener('click', () => {
      this.showViewB();
    });
    ui.querySelector('#btn-reset-progress').addEventListener('click', () => {
      this._el('reset-confirm-overlay').classList.add('visible');
    });

    // ── Lab purchase modal ────────────────────────────────────────────────────
    const labModal = document.createElement('div');
    labModal.id = 'lab-purchase-overlay';
    labModal.innerHTML = `
      <div id="lab-purchase-dialog">
        <div id="lab-purchase-title">⚗ Establish the Laboratory</div>
        <div id="lab-purchase-body">
          The ruins of an ancient alchemical laboratory lie beneath the Panoptikum.<br><br>
          Excavating and restoring the chambers will allow you to conduct structured
          research on your artifacts — unlocking hidden lore, origins, and arcane
          properties that cannot be discerned through exhibition alone.<br><br>
          <strong>One-time cost: 600 Pano-Gold</strong>
        </div>
        <div id="lab-purchase-gold-display"></div>
        <div id="lab-purchase-btns">
          <button id="btn-lab-cancel">Cancel</button>
          <button id="btn-lab-confirm">Excavate &amp; Restore (600 ⬡)</button>
        </div>
      </div>
    `;
    document.body.appendChild(labModal);
    labModal.querySelector('#btn-lab-cancel').addEventListener('click', () => {
      labModal.classList.remove('visible');
    });
    labModal.addEventListener('click', e => {
      if (e.target === labModal) labModal.classList.remove('visible');
    });
    labModal.querySelector('#btn-lab-confirm').addEventListener('click', () => {
      const gold = Math.floor(this._collection.state.panoptikumGold);
      if (gold < 600) return;
      this._collection.state.panoptikumGold -= 600;
      this._collection._save();
      this._collection.labState.purchased = true;
      this._collection._saveLab();
      labModal.classList.remove('visible');
      this._updateLabNavButton();
      this._fadeTransition(() => this.showLab());
    });

    // ── Confirmation modal ────────────────────────────────────────────────────
    const modal = document.createElement('div');
    modal.id = 'reset-confirm-overlay';
    modal.innerHTML = `
      <div id="reset-confirm-dialog">
        <div id="reset-confirm-title">Reset All Progress?</div>
        <div id="reset-confirm-body">
          This will permanently erase:<br>
          <strong>Tutorial completion · Panoptikum restoration<br>
          All expedition progress · Total score</strong><br><br>
          You will restart from the very beginning.
          This cannot be undone.
        </div>
        <div id="reset-confirm-btns">
          <button id="btn-reset-cancel">Cancel</button>
          <button id="btn-reset-confirm">Yes, Reset Everything</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#btn-reset-cancel').addEventListener('click', () => {
      modal.classList.remove('visible');
    });
    modal.addEventListener('click', e => {
      // Close when clicking the dark backdrop (outside the dialog)
      if (e.target === modal) modal.classList.remove('visible');
    });
    modal.querySelector('#btn-reset-confirm').addEventListener('click', () => {
      [
        'hexmaze_tutorial_done',
        'hexmaze_panoptikum_restored',
        'hexmaze_expedition_state',
        'hexmaze_totalscore',
        'hexmaze_collection',
        'hexmaze_laboratory',
        'hexmaze_first_visitor_seen',
      ].forEach(k => localStorage.removeItem(k));
      window.location.reload();
    });

    // ── Arc animation manager ─────────────────────────────────────────────────
    this._arcManager = new PanoArcManager();

    // ── Inventory + pedestal system ───────────────────────────────────────────
    this._collection = new PanoptikumCollection();
    this._buildInventoryDOM();
    this._collection.startIncomeTicker(data => this._onIncomeTick(data));

    // Listen for in-game artifact pickups
    document.addEventListener('artifact:collected', e => {
      const instance = this._collection.addArtifact(e.detail.typeId);
      this._syncCollectionUI();
      this._showArtifactToast(instance);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  _hub()       { return document.getElementById('panoptikum-hub'); }
  _el(id)      { return document.getElementById(id); }

  _showGlobalUI() {
    document.body.classList.add('pano-ui-active');
    this._el('global-ui').style.display = 'flex';
  }

  _hideGlobalUI() {
    document.body.classList.remove('pano-ui-active');
    this._el('global-ui').style.display = 'none';
  }

  _setNavActive(key) {
    const map = {
      panoptikum: '#btn-nav-panoptikum',
      laboratory: '#btn-nav-laboratory',
      equipment:  '#btn-nav-equipment',
      'view-a':   '#btn-nav-view-a',
      'view-b':   '#btn-nav-view-b',
    };
    document.querySelectorAll('.global-nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(map[key]);
    if (btn) btn.classList.add('active');
  }

  /** Cross-fade to black, run callback, then fade back. */
  _fadeTransition(callback) {
    const fs = document.getElementById('pano-fade-screen');
    fs.classList.add('fading');
    setTimeout(() => {
      callback();
      setTimeout(() => fs.classList.remove('fading'), 40);
    }, 210);
  }

  _syncScore() {
    try {
      const state = JSON.parse(
        localStorage.getItem('hexmaze_expedition_state') || '{}'
      );
      const score = state.globalScore || 0;
      const el = document.getElementById('global-score-val');
      if (el) el.textContent = score;
    } catch (_) {}
  }

  // ── Inventory DOM ─────────────────────────────────────────────────────────────

  _buildInventoryDOM() {
    // ── Extra styles ──────────────────────────────────────────────────────────
    if (!document.getElementById('pano-inv-styles')) {
      const s = document.createElement('style');
      s.id = 'pano-inv-styles';
      s.textContent = `
        /* ── Pedestal drop zones ── */
        .pano-pedestal {
          position: absolute;
          width: 72px; height: 72px;
          border-radius: 50%;
          border: 2px dashed rgba(184,153,114,0.45);
          background: rgba(6,6,15,0.35);
          display: flex; align-items: center; justify-content: center;
          transform: translate(-50%, -50%);
          cursor: grab;
          pointer-events: auto;
          user-select: none; -webkit-user-select: none;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
          z-index: 12;
        }
        .pano-pedestal:hover, .pano-pedestal.drag-over {
          border-color: #ffd23f;
          background: rgba(255,210,63,0.12);
          box-shadow: 0 0 18px rgba(255,210,63,0.30);
        }
        .pano-pedestal.occupied {
          border-color: rgba(200,160,255,0.55);
          background: rgba(136,68,255,0.10);
        }
        .pano-pedestal-img {
          width: 52px; height: 52px;
          object-fit: contain; pointer-events: none;
          filter: drop-shadow(0 0 6px rgba(200,160,255,0.50));
        }
        .pano-pedestal-empty-icon {
          font-size: 1.4rem; color: rgba(184,153,114,0.30); pointer-events: none;
        }
        .pano-pedestal-badge {
          position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
          font-size: 0.58rem; letter-spacing: 0.08em; color: #c880ff;
          background: rgba(6,6,15,0.85); border: 1px solid rgba(200,160,255,0.35);
          border-radius: 4px; padding: 1px 5px; white-space: nowrap;
          pointer-events: none;
        }

        /* ── Hub stats bar (income / visitors / pano-gold) ── */
        #pano-stats-bar {
          position: absolute; top: 8px; right: 14px; z-index: 15;
          display: none;
          flex-direction: column; gap: 5px; align-items: flex-end;
          font-family: 'Courier New', monospace;
        }
        #pano-view-hub.active #pano-stats-bar { display: flex; }
        .pano-stat-chip {
          background: rgba(6,6,15,0.85); border: 1px solid rgba(74,158,255,0.22);
          border-radius: 6px; padding: 4px 10px;
          font-size: 0.68rem; letter-spacing: 0.07em;
          display: flex; align-items: center; gap: 7px;
        }
        .pano-stat-label { color: #4a9eff; text-transform: uppercase; }
        .pano-stat-value { color: #ffd23f; font-weight: bold; }
        .pano-stat-value.purple { color: #c880ff; }
        .pano-stat-value.green  { color: #00ff88; }

        /* ── Inventory drawer ── */
        #pano-inventory-drawer {
          position: absolute; bottom: 0; left: 0; right: 0;
          z-index: 25;
          background: rgba(6,6,15,0.96); backdrop-filter: blur(8px);
          border-top: 1px solid rgba(74,158,255,0.22);
          transform: translateY(100%);
          transition: transform 0.30s cubic-bezier(0.22, 1, 0.36, 1);
          max-height: 42vh; display: flex; flex-direction: column;
        }
        #pano-inventory-drawer.open { transform: translateY(0); }
        #pano-inv-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px 8px; border-bottom: 1px solid rgba(74,158,255,0.12);
          flex-shrink: 0;
        }
        #pano-inv-title {
          font-family: 'Courier New', monospace;
          font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
          color: #4a9eff;
        }
        #btn-close-inventory {
          background: transparent; border: none; color: #556677;
          font-size: 1.0rem; cursor: pointer; line-height: 1; padding: 0 4px;
          transition: color 0.14s;
        }
        #btn-close-inventory:hover { color: #4a9eff; }
        #pano-inv-grid {
          flex: 1 1 auto; overflow-y: auto; padding: 12px 14px;
          display: flex; flex-wrap: wrap; gap: 10px; align-content: flex-start;
        }
        #pano-inv-grid::-webkit-scrollbar { width: 3px; }
        #pano-inv-grid::-webkit-scrollbar-thumb { background: rgba(74,158,255,0.25); border-radius: 2px; }
        #pano-inv-empty {
          font-family: 'Courier New', monospace; font-size: 0.76rem;
          color: #334455; text-align: center; width: 100%; padding: 20px 0;
          font-style: italic;
        }

        /* ── Individual artifact card ── */
        .artifact-card {
          width: 68px; position: relative; cursor: grab;
          user-select: none; -webkit-user-select: none;
          transition: transform 0.14s, box-shadow 0.14s;
        }
        .artifact-card:hover { transform: translateY(-3px); }
        .artifact-card.dragging { opacity: 0.35; cursor: grabbing; }
        .artifact-card-img-wrap {
          width: 68px; height: 68px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(74,158,255,0.20);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .artifact-card-img {
          width: 54px; height: 54px; object-fit: contain;
          pointer-events: none;
        }
        .artifact-card-tier {
          position: absolute; top: -5px; right: -5px;
          background: #8844ff; color: #fff;
          font-size: 0.58rem; font-weight: bold; letter-spacing: 0.06em;
          border-radius: 3px; padding: 1px 4px;
        }
        .artifact-card-name {
          font-family: 'Courier New', monospace;
          font-size: 0.56rem; color: #8899aa; text-align: center;
          margin-top: 3px; line-height: 1.3;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          width: 68px;
        }

        /* ── Drag ghost ── */
        #artifact-drag-ghost {
          position: fixed; pointer-events: none; z-index: 9999;
          width: 68px; height: 68px;
          border-radius: 8px; overflow: hidden;
          border: 2px solid #c880ff;
          box-shadow: 0 0 18px rgba(200,128,255,0.55);
          transform: translate(-50%, -50%);
          background: rgba(6,6,15,0.90);
          display: flex; align-items: center; justify-content: center;
        }
        #artifact-drag-ghost img {
          width: 52px; height: 52px; object-fit: contain;
        }

        /* ── Inventory toggle button ── */
        #btn-open-inventory {
          position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
          z-index: 20; font-family: 'Courier New', monospace;
          background: rgba(6,6,15,0.88); border: 1px solid rgba(74,158,255,0.35);
          color: #4a9eff; border-radius: 6px; padding: 7px 22px;
          font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase;
          cursor: pointer; transition: background 0.14s, border-color 0.14s;
          white-space: nowrap;
        }
        #btn-open-inventory:hover {
          background: rgba(74,158,255,0.10); border-color: #4a9eff;
        }

        /* ── Artifact toast notification ── */
        #artifact-toast {
          position: fixed; top: 70px; right: 18px; z-index: 1150;
          background: rgba(6,6,15,0.94); border: 1px solid rgba(200,128,255,0.55);
          border-radius: 10px; padding: 12px 16px;
          font-family: 'Courier New', monospace;
          max-width: 260px;
          display: flex; gap: 12px; align-items: center;
          transform: translateX(120%); transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 0 24px rgba(200,128,255,0.20);
        }
        #artifact-toast.visible { transform: translateX(0); }
        #artifact-toast-img { width: 44px; height: 44px; object-fit: contain; flex-shrink: 0; }
        #artifact-toast-body { flex: 1; }
        #artifact-toast-label {
          font-size: 0.58rem; letter-spacing: 0.14em; text-transform: uppercase;
          color: #c880ff; margin-bottom: 3px;
        }
        #artifact-toast-name { font-size: 0.78rem; color: #c8d6e5; font-weight: bold; }
        #artifact-toast-tier { font-size: 0.64rem; color: #8844ff; margin-top: 2px; }

        /* ── Merge flash ── */
        #merge-flash {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          z-index: 1200; pointer-events: none;
          font-family: 'Courier New', monospace;
          font-size: 1.1rem; font-weight: bold; letter-spacing: 0.10em;
          color: #c880ff; text-shadow: 0 0 20px #c880ff;
          opacity: 0; transition: opacity 0.4s;
        }
        #merge-flash.visible { opacity: 1; }

        /* ── Visitor sprites ── */
        .crowd-visitor {
          position: absolute; bottom: 0;
          height: 80%; width: auto;
          object-fit: contain;
          image-rendering: auto;
          pointer-events: none;
          transform-origin: bottom center;
          transition: none;
        }

        /* ── First-visitor notification ── */
        #visitor-notification {
          position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(30px);
          z-index: 1150; opacity: 0;
          transition: opacity 0.5s, transform 0.5s;
          background: rgba(6,6,15,0.96); border: 1px solid rgba(255,210,63,0.55);
          border-radius: 10px; padding: 16px 22px; max-width: 420px; width: 90%;
          font-family: 'Courier New', monospace; color: #c8d6e5;
          text-align: center; pointer-events: none;
          box-shadow: 0 0 30px rgba(255,210,63,0.12);
        }
        #visitor-notification.visible {
          opacity: 1; transform: translateX(-50%) translateY(0);
        }
        #visitor-notification-title {
          font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
          color: #ffd23f; margin-bottom: 8px;
        }
        #visitor-notification-body {
          font-size: 0.76rem; color: #8899aa; line-height: 1.65;
        }

        /* ── Artifact dossier overlay ── */
        #artifact-dossier {
          position: fixed; inset: 0; z-index: 1300;
          background: rgba(4,4,12,0.92); backdrop-filter: blur(10px);
          display: none; align-items: center; justify-content: center;
        }
        #artifact-dossier.visible { display: flex; }
        #dossier-panel {
          background: rgba(10,8,20,0.98);
          border: 1px solid rgba(200,128,255,0.35);
          border-radius: 14px; padding: 28px 30px;
          max-width: 720px; width: 94%; max-height: 88vh;
          display: flex; gap: 28px; overflow: hidden;
          box-shadow: 0 0 60px rgba(200,128,255,0.10);
          font-family: 'Courier New', monospace; color: #c8d6e5;
        }
        #dossier-img-col {
          flex: 0 0 180px; display: flex; flex-direction: column;
          align-items: center; gap: 14px;
        }
        #dossier-full-img {
          width: 160px; height: 160px; object-fit: contain;
          border: 1px solid rgba(200,128,255,0.25);
          border-radius: 10px; background: rgba(255,255,255,0.03);
          filter: drop-shadow(0 0 14px rgba(200,128,255,0.30));
        }
        #dossier-tier-badge {
          font-size: 0.74rem; letter-spacing: 0.10em;
          color: #c880ff; text-transform: uppercase;
        }
        #dossier-info-col {
          flex: 1 1 0; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;
        }
        #dossier-info-col::-webkit-scrollbar { width: 3px; }
        #dossier-info-col::-webkit-scrollbar-thumb { background: rgba(200,128,255,0.25); border-radius: 2px; }
        #dossier-name {
          font-size: 1.05rem; font-weight: bold; color: #e8d8ff;
          letter-spacing: 0.06em; border-bottom: 1px solid rgba(200,128,255,0.20);
          padding-bottom: 10px;
        }
        .dossier-section-title {
          font-size: 0.60rem; letter-spacing: 0.18em; text-transform: uppercase;
          color: #4a9eff; margin-bottom: 6px;
        }
        .dossier-lore {
          font-size: 0.76rem; color: #8899aa; line-height: 1.70; font-style: italic;
        }
        .dossier-lore.locked { color: #2a3a4a; filter: blur(3px); user-select: none; }
        .dossier-meta-table {
          display: grid; grid-template-columns: 1fr 1fr; gap: 5px 18px;
        }
        .dossier-meta-row { display: contents; }
        .dossier-meta-key {
          font-size: 0.62rem; color: #4a9eff; text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .dossier-meta-val {
          font-size: 0.72rem; color: #c8d6e5;
        }
        .dossier-meta-val.locked {
          color: #334455; letter-spacing: 0.20em;
        }
        .dossier-trait {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(74,158,255,0.12);
          border-radius: 6px; padding: 8px 12px; font-size: 0.72rem;
          color: #8899aa; line-height: 1.55;
        }
        .dossier-trait.positive { border-color: rgba(0,255,136,0.18); }
        .dossier-trait.negative { border-color: rgba(255,68,102,0.18); }
        .dossier-trait-name {
          font-weight: bold; color: #c8d6e5; margin-bottom: 3px;
        }
        .dossier-trait.positive .dossier-trait-name { color: #00ff88; }
        .dossier-trait.negative .dossier-trait-name { color: #ff4466; }
        #dossier-unlock-row {
          display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;
        }
        .dossier-unlock-btn {
          background: transparent;
          border: 1px solid rgba(255,210,63,0.35); color: #ffd23f;
          border-radius: 5px; padding: 4px 12px;
          font-family: inherit; font-size: 0.64rem; letter-spacing: 0.08em;
          cursor: pointer; text-transform: uppercase;
          transition: background 0.14s, border-color 0.14s;
        }
        .dossier-unlock-btn:hover {
          background: rgba(255,210,63,0.10); border-color: #ffd23f;
        }
        .dossier-unlock-btn:disabled {
          opacity: 0.35; cursor: not-allowed;
        }
        #btn-close-dossier {
          align-self: flex-end; margin-top: auto;
          background: transparent; border: 1px solid rgba(74,158,255,0.25);
          color: #4a9eff; border-radius: 5px; padding: 6px 20px;
          font-family: inherit; font-size: 0.72rem; letter-spacing: 0.08em;
          cursor: pointer; text-transform: uppercase;
          transition: background 0.14s;
        }
        #btn-close-dossier:hover { background: rgba(74,158,255,0.10); }

        /* ── Laboratory nav button locked state ── */
        .global-nav-btn.lab-locked {
          color: #2a3a4a; border-color: rgba(74,158,255,0.10);
          cursor: pointer; opacity: 0.8;
        }
        .global-nav-btn.lab-locked:hover {
          color: #4a9eff; border-color: rgba(74,158,255,0.35);
          background: rgba(74,158,255,0.06);
        }

        /* ── Lab purchase modal ── */
        #lab-purchase-overlay {
          position: fixed; inset: 0; z-index: 1200;
          background: rgba(6,6,15,0.80); backdrop-filter: blur(6px);
          display: none; align-items: center; justify-content: center;
        }
        #lab-purchase-overlay.visible { display: flex; }
        #lab-purchase-dialog {
          background: rgba(12,10,22,0.98);
          border: 1px solid rgba(255,210,63,0.35);
          border-radius: 10px; padding: 28px 30px;
          max-width: 440px; width: 92%;
          font-family: 'Courier New', monospace; color: #c8d6e5;
          box-shadow: 0 0 40px rgba(255,210,63,0.08);
        }
        #lab-purchase-title {
          font-size: 0.95rem; font-weight: bold; letter-spacing: 0.12em;
          text-transform: uppercase; color: #ffd23f;
          text-shadow: 0 0 10px rgba(255,210,63,0.4);
          margin-bottom: 14px;
        }
        #lab-purchase-body {
          font-size: 0.76rem; color: #7a8899; line-height: 1.68;
          margin-bottom: 14px;
        }
        #lab-purchase-body strong { color: #c8d6e5; }
        #lab-purchase-gold-display {
          font-size: 0.72rem; color: #ffd23f;
          margin-bottom: 18px; text-align: right;
        }
        #lab-purchase-btns {
          display: flex; gap: 10px; justify-content: flex-end;
        }
        #btn-lab-cancel {
          padding: 8px 18px;
          background: transparent; border: 1.5px solid #334455; color: #556677;
          border-radius: 6px; font-family: inherit; font-size: 0.78rem;
          letter-spacing: 0.08em; cursor: pointer; text-transform: uppercase;
          transition: background 0.14s, color 0.14s;
        }
        #btn-lab-cancel:hover { background: rgba(74,158,255,0.08); color: #4a9eff; }
        #btn-lab-confirm {
          padding: 8px 18px;
          background: rgba(255,210,63,0.08); border: 1.5px solid #ffd23f;
          color: #ffd23f; border-radius: 6px; font-family: inherit;
          font-size: 0.78rem; font-weight: bold; letter-spacing: 0.08em;
          cursor: pointer; text-transform: uppercase;
          transition: background 0.14s, box-shadow 0.14s;
        }
        #btn-lab-confirm:hover {
          background: rgba(255,210,63,0.16);
          box-shadow: 0 0 14px rgba(255,210,63,0.25);
        }
        #btn-lab-confirm:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ── Laboratory view ── */
        #pano-view-lab {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 30% 60%, #0d1a0e 0%, #050a14 60%, #06060f 100%);
          display: none; flex-direction: column; align-items: stretch;
          overflow: hidden;
        }
        #pano-view-lab.active { display: flex; }
        #lab-header {
          padding: 14px 22px 10px;
          border-bottom: 1px solid rgba(74,158,255,0.15);
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        #lab-header-title {
          font-family: 'Courier New', monospace;
          font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase;
          color: #4a9eff;
        }
        #lab-stats-bar {
          position: absolute; top: 58px; right: 14px; z-index: 15;
          display: flex; flex-direction: column; gap: 5px; align-items: flex-end;
          font-family: 'Courier New', monospace;
        }
        .lab-stat-chip {
          background: rgba(6,6,15,0.85); border: 1px solid rgba(0,255,136,0.22);
          border-radius: 6px; padding: 4px 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .lab-stat-label {
          color: #4a9eff; text-transform: uppercase;
          font-size: 0.54rem; letter-spacing: 0.12em;
        }
        .lab-stat-value { color: #00ff88; font-weight: bold; font-size: 0.90rem; }
        .lab-stat-value.green { color: #00cc66; font-size: 0.78rem; }

        /* ── Equipment / Loadout view ──────────────────────────────────────── */
        #pano-view-equip {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 70% 40%, #0e0d1a 0%, #060611 60%, #06060f 100%);
          display: none; flex-direction: column; align-items: stretch; overflow: hidden;
        }
        #pano-view-equip.active { display: flex; }
        #equip-header {
          padding: 14px 22px 10px;
          border-bottom: 1px solid rgba(255,160,80,0.18);
          display: flex; align-items: center; gap: 18px; flex-shrink: 0;
        }
        #equip-header-title {
          font-family: 'Courier New', monospace; font-size: 0.78rem;
          letter-spacing: 0.18em; text-transform: uppercase; color: #ffb060;
        }
        #equip-header-sub { font-size: 0.68rem; color: #7a8a9a; }
        #equip-content-row {
          flex: 1; display: flex; flex-direction: row; gap: 0; overflow: hidden;
        }
        #equip-slots-col {
          width: 260px; min-width: 200px; padding: 20px 16px;
          border-right: 1px solid rgba(255,160,80,0.12);
          display: flex; flex-direction: column; gap: 10px; overflow-y: auto;
        }
        #equip-figure-col {
          flex: 0 0 180px; display: flex; align-items: flex-end; justify-content: center;
          padding: 10px 0; overflow: hidden;
        }
        #equip-antiquarian-img {
          max-height: 94%; object-fit: contain;
          filter: drop-shadow(0 0 20px rgba(255,160,80,0.22));
        }
        #equip-inv-col {
          flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 10px; overflow: hidden;
        }
        #equip-inv-grid {
          flex: 1; display: flex; flex-direction: column; gap: 6px; overflow-y: auto;
          padding-right: 4px;
        }
        #equip-inv-grid::-webkit-scrollbar { width: 3px; }
        #equip-inv-grid::-webkit-scrollbar-thumb { background: rgba(255,160,80,0.20); border-radius: 2px; }
        .equip-slots-grid { display: flex; flex-direction: column; gap: 8px; }
        .equip-slot {
          border: 1px solid rgba(255,160,80,0.25); border-radius: 8px;
          padding: 8px 10px; cursor: grab;
          transition: border-color 0.15s, background 0.15s;
          display: flex; flex-direction: column; gap: 4px;
          min-height: 60px;
        }
        .equip-slot.drag-over {
          border-color: rgba(255,180,80,0.80); background: rgba(255,160,80,0.10);
        }
        .equip-slot.occupied { border-color: rgba(255,160,80,0.50); background: rgba(255,160,80,0.06); }
        .equip-slot-label {
          font-size: 0.58rem; letter-spacing: 0.12em; text-transform: uppercase;
          color: #ffb060; opacity: 0.7;
        }
        .equip-slot-inner { display: flex; align-items: center; gap: 8px; flex: 1; }
        .equip-slot-img { width: 36px; height: 36px; object-fit: contain; }
        .equip-slot-name { font-size: 0.70rem; color: #c8d6e5; }
        .equip-slot-empty { font-size: 0.65rem; color: #3a4a5a; font-style: italic; }
        .inv-card-slot-tag {
          font-size: 0.58rem; color: #ffb060; opacity: 0.75;
          background: rgba(255,160,80,0.08); border-radius: 4px; padding: 1px 5px;
        }
        #lab-slots-area {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: 30px; padding: 30px;
        }
        .lab-slot {
          width: 130px; height: 130px;
          border: 2px dashed rgba(0,255,136,0.25);
          border-radius: 12px;
          background: rgba(0,255,136,0.04);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 8px; position: relative; cursor: pointer;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
        }
        .lab-slot:hover, .lab-slot.drag-over {
          border-color: #00ff88;
          background: rgba(0,255,136,0.10);
          box-shadow: 0 0 20px rgba(0,255,136,0.15);
        }
        .lab-slot.occupied {
          border-color: rgba(0,200,100,0.50);
          background: rgba(0,100,50,0.12);
        }
        .lab-slot-img {
          width: 72px; height: 72px; object-fit: contain;
          filter: drop-shadow(0 0 8px rgba(0,255,136,0.35));
          pointer-events: none;
        }
        .lab-slot-empty-icon {
          font-size: 2.2rem; color: rgba(0,255,136,0.20); pointer-events: none;
        }
        .lab-slot-name {
          font-family: 'Courier New', monospace;
          font-size: 0.60rem; color: #00cc66;
          text-align: center; line-height: 1.3;
          max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          pointer-events: none;
        }
        .lab-slot-research-rate {
          position: absolute; top: -8px; right: -8px;
          background: rgba(0,20,10,0.95); border: 1px solid rgba(0,255,136,0.35);
          border-radius: 4px; padding: 2px 6px;
          font-family: 'Courier New', monospace; font-size: 0.58rem;
          color: #00ff88; white-space: nowrap;
          pointer-events: none;
        }
        #lab-help-text {
          font-family: 'Courier New', monospace; font-size: 0.68rem;
          color: #2a4a3a; line-height: 1.60; margin-top: 16px;
          text-align: center;
        }

        /* ── Lab content two-column layout ── */
        #lab-content-row {
          flex: 1; display: flex; overflow: hidden;
        }
        #lab-slots-col {
          flex: 0 0 auto; display: flex; flex-direction: column;
          align-items: center; padding: 16px 20px 20px;
          border-right: 1px solid rgba(0,255,136,0.10);
          min-width: 320px;
        }
        #lab-inv-col {
          flex: 1 1 0; display: flex; flex-direction: column;
          padding: 16px 18px 20px; overflow: hidden;
        }
        .lab-col-title {
          font-family: 'Courier New', monospace;
          font-size: 0.60rem; letter-spacing: 0.18em; text-transform: uppercase;
          color: #4a9eff; margin-bottom: 12px; align-self: flex-start;
        }

        /* ── Lab embedded inventory grid ── */
        #lab-inv-grid {
          flex: 1 1 auto; overflow-y: auto;
          display: flex; flex-wrap: wrap; gap: 10px; align-content: flex-start;
        }
        #lab-inv-grid::-webkit-scrollbar { width: 3px; }
        #lab-inv-grid::-webkit-scrollbar-thumb { background: rgba(0,255,136,0.20); border-radius: 2px; }
        #lab-inv-empty {
          font-family: 'Courier New', monospace; font-size: 0.76rem;
          color: #1a3a2a; text-align: center; width: 100%;
          padding: 20px 0; font-style: italic;
        }
      `;
      document.head.appendChild(s);
    }

    // ── Stats bar (income / visitors / gold) ─────────────────────────────────
    const statsBar = document.createElement('div');
    statsBar.id = 'pano-stats-bar';
    statsBar.innerHTML = `
      <div class="pano-stat-chip">
        <span class="pano-stat-label">Gold / min</span>
        <span class="pano-stat-value green" id="pano-gpm-val">0</span>
      </div>
      <div class="pano-stat-chip">
        <span class="pano-stat-label">Visitors</span>
        <span class="pano-stat-value" id="pano-visitors-val">0</span>
      </div>
      <div class="pano-stat-chip">
        <span class="pano-stat-label">Pano-Gold</span>
        <span class="pano-stat-value purple" id="pano-gold-val">0</span>
      </div>
    `;
    document.getElementById('pano-view-hub').appendChild(statsBar);

    // ── Pedestal drop zones (5 positions across the background) ──────────────
    const PEDESTAL_POSITIONS = [
      { left: '16%', top: '64%' },
      { left: '31%', top: '70%' },
      { left: '50%', top: '72%' },
      { left: '69%', top: '70%' },
      { left: '84%', top: '64%' },
    ];
    const artifactLayer = document.getElementById('artifact-layer');
    this._pedestalEls = PEDESTAL_POSITIONS.map((pos, i) => {
      const el = document.createElement('div');
      el.className   = 'pano-pedestal';
      el.style.left  = pos.left;
      el.style.top   = pos.top;
      el.dataset.pedestalIndex = i;
      el.innerHTML   = `<span class="pano-pedestal-empty-icon">⬡</span>`;
      artifactLayer.appendChild(el);
      this._bindPedestalEvents(el, i);
      return el;
    });

    // ── Inventory toggle button ───────────────────────────────────────────────
    const invBtn = document.createElement('button');
    invBtn.id = 'btn-open-inventory';
    invBtn.textContent = '⊞ Cabinet of Curiosities';
    document.getElementById('pano-view-hub').appendChild(invBtn);
    invBtn.addEventListener('click', () => this._toggleInventory());

    // ── Inventory drawer ──────────────────────────────────────────────────────
    const drawer = document.createElement('div');
    drawer.id = 'pano-inventory-drawer';
    drawer.innerHTML = `
      <div id="pano-inv-header">
        <span id="pano-inv-title">⊞ Cabinet of Curiosities</span>
        <button id="btn-close-inventory">✕</button>
      </div>
      <div id="pano-inv-grid"></div>
    `;
    document.getElementById('pano-view-hub').appendChild(drawer);
    drawer.querySelector('#btn-close-inventory').addEventListener('click', () => this._closeInventory());

    // ── Artifact toast ────────────────────────────────────────────────────────
    const toast = document.createElement('div');
    toast.id = 'artifact-toast';
    toast.innerHTML = `
      <img id="artifact-toast-img" src="" alt="">
      <div id="artifact-toast-body">
        <div id="artifact-toast-label">Artifact Recovered!</div>
        <div id="artifact-toast-name"></div>
        <div id="artifact-toast-tier"></div>
      </div>
    `;
    document.body.appendChild(toast);

    // ── Drag ghost ────────────────────────────────────────────────────────────
    const ghost = document.createElement('div');
    ghost.id = 'artifact-drag-ghost';
    ghost.style.display = 'none';
    document.body.appendChild(ghost);

    // ── Merge flash ───────────────────────────────────────────────────────────
    const mf = document.createElement('div');
    mf.id = 'merge-flash';
    document.body.appendChild(mf);

    // ── First-visitor notification ─────────────────────────────────────────────
    const vnotif = document.createElement('div');
    vnotif.id = 'visitor-notification';
    vnotif.innerHTML = `
      <div id="visitor-notification-title">⚑ An Audience Has Gathered</div>
      <div id="visitor-notification-body">Your exhibition has drawn significant attention. The public is now paying for admission to the Panoptikum, generating a continuous passive income — as long as you keep attractive artifacts on display.</div>
    `;
    document.body.appendChild(vnotif);

    // ── Artifact dossier overlay ───────────────────────────────────────────────
    const dossier = document.createElement('div');
    dossier.id = 'artifact-dossier';
    dossier.innerHTML = `
      <div id="dossier-panel">
        <div id="dossier-img-col">
          <img id="dossier-full-img" src="" alt="">
          <div id="dossier-tier-badge"></div>
        </div>
        <div id="dossier-info-col">
          <div id="dossier-name"></div>
          <div>
            <div class="dossier-section-title">Lore</div>
            <div id="dossier-lore" class="dossier-lore"></div>
          </div>
          <div>
            <div class="dossier-section-title">Catalogue Entry</div>
            <div id="dossier-meta" class="dossier-meta-table"></div>
          </div>
          <div id="dossier-traits-section">
            <div class="dossier-section-title">Known Properties</div>
            <div id="dossier-traits"></div>
          </div>
          <div id="dossier-unlock-row"></div>
          <button id="btn-close-dossier">Close Dossier</button>
        </div>
      </div>
    `;
    document.body.appendChild(dossier);
    dossier.querySelector('#btn-close-dossier').addEventListener('click', () => this._closeDossier());
    dossier.addEventListener('click', e => { if (e.target === dossier) this._closeDossier(); });

    // ── Lab drop zones ─────────────────────────────────────────────────────────
    this._buildLabSlots();

    // Drag + click + visitor tracking
    this._dragState       = null;
    this._pendingClick    = null;
    this._visitorEntities = [];
    this._visitorRAF      = null;
    document.addEventListener('mousemove', e => this._onDragMove(e));
    document.addEventListener('mouseup',   e => this._onDragEnd(e));
    document.addEventListener('touchmove', e => { if (this._dragState) { e.preventDefault(); this._onDragMove(e.touches[0]); } }, { passive: false });
    document.addEventListener('touchend',  e => { if (this._dragState) this._onDragEnd(e.changedTouches[0]); });

    this._syncCollectionUI();
  }

  // ── Inventory open/close ──────────────────────────────────────────────────────

  _toggleInventory() {
    const d = document.getElementById('pano-inventory-drawer');
    if (d?.classList.contains('open')) this._closeInventory();
    else this._openInventory();
  }
  _openInventory()  { document.getElementById('pano-inventory-drawer')?.classList.add('open'); }
  _closeInventory() { document.getElementById('pano-inventory-drawer')?.classList.remove('open'); }

  // ── Income tick handler: update UI + spawn currency arcs ────────────────────

  _onIncomeTick({ goldEarned = 0, researchEarned = 0 } = {}) {
    this._syncCollectionUI();

    // ── Gold arcs ─────────────────────────────────────────────────────────────
    // Accumulate fractions; only spawn when a whole unit is ready.
    // This ensures arcs fire at the correct rate (e.g. once per 20s at 3 gold/min).
    this._goldArcAccum = (this._goldArcAccum ?? 0) + goldEarned;
    if (this._goldArcAccum >= 1 && this._el('pano-view-hub')?.classList.contains('active')) {
      this._goldArcAccum -= 1; // consume exactly 1 unit; remainder carries forward
      this._spawnGoldArc();
    }

    // ── Research arcs ─────────────────────────────────────────────────────────
    // Same accumulator logic. When threshold is crossed, fire one arc per
    // occupied slot simultaneously. Size = whole units earned (area scales > 1).
    this._researchArcAccum = (this._researchArcAccum ?? 0) + researchEarned;
    if (this._researchArcAccum >= 1 && this._el('pano-view-lab')?.classList.contains('active')) {
      const units = Math.floor(this._researchArcAccum);
      this._researchArcAccum -= units;
      this._spawnResearchArcs(Math.max(1, units));
    }
  }

  _spawnGoldArc() {
    const targetEl = document.getElementById('pano-gold-val');
    const crowd    = document.getElementById('crowd-foreground');
    if (!targetEl || !crowd) return;

    const visitors = Array.from(crowd.children).filter(v => {
      const r = v.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!visitors.length) return;

    // Pick randomly but never the same index twice in a row
    let idx;
    if (visitors.length === 1) {
      idx = 0;
    } else {
      do { idx = Math.floor(Math.random() * visitors.length); }
      while (idx === (this._lastVisitorIdx ?? -1));
    }
    this._lastVisitorIdx = idx;

    const r = visitors[idx].getBoundingClientRect();
    this._arcManager.spawnGold(r.left + r.width / 2, r.top, targetEl);
  }

  _spawnResearchArcs(size = 1) {
    const targetEl = document.getElementById('lab-research-val');
    const slots    = this._collection.labState.slots;
    const labEls   = this._labSlotEls || [];
    if (!targetEl) return;

    // Collect occupied slots with valid screen positions
    const occupied = labEls
      .map((el, i) => ({ el, i }))
      .filter(({ el, i }) => {
        if (!slots[i]) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0;
      });
    if (!occupied.length) return;

    // Pick randomly, never the same slot twice in a row
    let pick;
    if (occupied.length === 1) {
      pick = occupied[0];
    } else {
      do { pick = occupied[Math.floor(Math.random() * occupied.length)]; }
      while (pick.i === (this._lastResearchSlotIdx ?? -1));
    }
    this._lastResearchSlotIdx = pick.i;

    const r = pick.el.getBoundingClientRect();
    this._arcManager.spawnResearch(r.left + r.width / 2, r.top + r.height / 2, targetEl, size);
  }

  // ── Sync UI from collection state ─────────────────────────────────────────────

  _syncCollectionUI() {
    this._syncPedestals();
    this._syncInventoryGrid();
    this._syncStatsBar();
    this._syncLabUI();
    const unlockedByTypeId = this._collection.getUnlockedByTypeId();
    const gpm      = ArtifactRegistry.calculatePassiveGPM(this._collection.state.pedestals, unlockedByTypeId);
    const visitors = ArtifactRegistry.calculateVisitorCount(gpm);
    this._updateVisitors(visitors);
    this._checkFirstVisitor(visitors);
  }

  _syncPedestals() {
    const pedestals = this._collection.state.pedestals;
    (this._pedestalEls || []).forEach((el, i) => {
      const slot = pedestals[i];
      el.innerHTML = '';
      // Remove old drag listener by cloning the element shell
      const fresh = el.cloneNode(false);
      el.replaceWith(fresh);
      this._pedestalEls[i] = fresh;
      this._bindPedestalEvents(fresh, i);

      if (slot) {
        const def = ArtifactRegistry.getById(slot.typeId);
        fresh.classList.add('occupied');
        const img = document.createElement('img');
        img.className = 'pano-pedestal-img';
        img.src = def?.spriteFull || def?.sprite || '';
        img.alt = def?.name || '';
        img.draggable = false;
        fresh.appendChild(img);
        const badge = document.createElement('div');
        badge.className = 'pano-pedestal-badge';
        badge.textContent = `T${slot.tier} ${TIER_NAMES[slot.tier] || ''}`;
        fresh.appendChild(badge);
        fresh.title = `${ArtifactRegistry.getDisplayName(slot)} — drag to move · right-click to remove`;
        // Block browser-native image/element drag so our custom drag takes over
        fresh.addEventListener('dragstart', e => e.preventDefault());
        // Drag FROM pedestal
        fresh.addEventListener('mousedown', e => {
          if (e.button !== 0) return;
          e.preventDefault();
          this._pendingClick = { instanceId: slot.instanceId, x: e.clientX, y: e.clientY, cardEl: fresh, sourceType: 'pedestal', sourceIndex: i };
        });
        fresh.addEventListener('touchstart', e => {
          e.preventDefault();
          const t = e.touches[0];
          this._pendingClick = { instanceId: slot.instanceId, x: t.clientX, y: t.clientY, cardEl: fresh, sourceType: 'pedestal', sourceIndex: i };
        }, { passive: false });
      } else {
        fresh.classList.remove('occupied');
        fresh.innerHTML = `<span class="pano-pedestal-empty-icon">⬡</span>`;
        fresh.title = 'Drop an artifact here to exhibit it';
      }
    });
  }

  _syncInventoryGrid() {
    this._renderInventoryInto(document.getElementById('pano-inv-grid'), 'pano-inv-empty');
    this._renderInventoryInto(document.getElementById('lab-inv-grid'),  'lab-inv-empty');
  }

  _renderInventoryInto(grid, emptyId) {
    if (!grid) return;
    const items = this._collection.state.inventory;
    if (items.length === 0) {
      grid.innerHTML = `<div id="${emptyId}">No artifacts in Cabinet yet.</div>`;
      return;
    }
    grid.innerHTML = '';
    for (const item of items) {
      const def = ArtifactRegistry.getById(item.typeId);
      if (!def) continue;
      const card = document.createElement('div');
      card.className      = 'artifact-card';
      card.dataset.instId = item.instanceId;
      card.title          = ArtifactRegistry.getDisplayName(item);
      card.innerHTML = `
        <div class="artifact-card-img-wrap">
          <img class="artifact-card-img" src="${def.spriteFull || def.sprite}" alt="${def.name}">
        </div>
        <div class="artifact-card-tier">T${item.tier}</div>
        <div class="artifact-card-name">${TIER_NAMES[item.tier]} ${def.name}</div>
      `;
      card.addEventListener('dragstart',   e => e.preventDefault());
      card.addEventListener('mousedown',  e => { e.preventDefault(); this._pendingClick = { instanceId: item.instanceId, x: e.clientX, y: e.clientY, cardEl: card, sourceType: 'inventory' }; });
      card.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; this._pendingClick = { instanceId: item.instanceId, x: t.clientX, y: t.clientY, cardEl: card, sourceType: 'inventory' }; }, { passive: false });
      grid.appendChild(card);
    }
  }

  _syncStatsBar() {
    const pedestals    = this._collection.state.pedestals;
    const unlockedByTypeId = this._collection.getUnlockedByTypeId();
    const gpm          = ArtifactRegistry.calculatePassiveGPM(pedestals, unlockedByTypeId);
    const visitors     = ArtifactRegistry.calculateVisitorCount(gpm);
    const gold         = Math.floor(this._collection.state.panoptikumGold);
    const gpmEl        = document.getElementById('pano-gpm-val');
    const visitorsEl   = document.getElementById('pano-visitors-val');
    const goldEl       = document.getElementById('pano-gold-val');
    if (gpmEl)      gpmEl.textContent      = gpm.toFixed(1);
    if (visitorsEl) visitorsEl.textContent = visitors;
    if (goldEl)     goldEl.textContent     = gold.toLocaleString();
  }

  // ── Pedestal event binding ────────────────────────────────────────────────────

  _bindPedestalEvents(el, index) {
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      this._collection.unexhibit(index);
      this._syncCollectionUI();
    });
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────────

  _startDrag(e, instanceId, cardEl, sourceType = 'inventory', sourceIndex = -1) {
    // Locate item in any location (inventory, pedestal, lab)
    let item = this._collection.getItem(instanceId);
    if (!item) {
      for (const s of this._collection.state.pedestals)  { if (s?.instanceId === instanceId) { item = s; break; } }
    }
    if (!item) {
      for (const s of this._collection.labState.slots)   { if (s?.instanceId === instanceId) { item = s; break; } }
    }
    const def   = ArtifactRegistry.getById(item?.typeId);
    const ghost = document.getElementById('artifact-drag-ghost');
    ghost.innerHTML      = `<img src="${def?.spriteFull || def?.sprite || ''}" alt="">`;
    ghost.style.display  = 'flex';
    ghost.style.left     = `${e.clientX}px`;
    ghost.style.top      = `${e.clientY}px`;
    if (cardEl?.classList) cardEl.classList.add('dragging');
    this._dragState = { instanceId, cardEl, sourceType, sourceIndex };
  }

  _onDragMove(e) {
    // Convert pending click to drag after 5px movement
    if (this._pendingClick && !this._dragState) {
      const dx = e.clientX - this._pendingClick.x;
      const dy = e.clientY - this._pendingClick.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        const { instanceId, cardEl, sourceType, sourceIndex } = this._pendingClick;
        this._pendingClick = null;
        this._startDrag(e, instanceId, cardEl, sourceType, sourceIndex);
      }
      return;
    }
    if (!this._dragState) return;
    const ghost = document.getElementById('artifact-drag-ghost');
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top  = `${e.clientY}px`;
    // Highlight drop zones under cursor
    const draggedTypeId = this._dragState ? this._collection._resolveTypeId(this._dragState.instanceId) : null;
    const draggedEquipSlot = draggedTypeId ? ArtifactRegistry.getById(draggedTypeId)?.equipSlot : null;
    const allDropZones = [
      ...(this._pedestalEls || []),
      ...(this._labSlotEls  || []),
      ...Object.values(this._equipSlotEls || {}),
    ];
    allDropZones.forEach(el => {
      const r = el.getBoundingClientRect();
      const over = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top  && e.clientY <= r.bottom;
      // Only highlight equip slots if the dragged item fits
      if (el.dataset.slotType) {
        el.classList.toggle('drag-over', over && el.dataset.slotType === draggedEquipSlot);
      } else {
        el.classList.toggle('drag-over', over);
      }
    });
  }

  _onDragEnd(e) {
    // If no drag was started (short click), open dossier
    if (this._pendingClick && !this._dragState) {
      const id = this._pendingClick.instanceId;
      this._pendingClick = null;
      this._openDossier(id);
      return;
    }
    this._pendingClick = null;
    if (!this._dragState) return;

    const { instanceId, cardEl, sourceType, sourceIndex } = this._dragState;
    this._dragState = null;
    document.getElementById('artifact-drag-ghost').style.display = 'none';
    if (cardEl && typeof cardEl.classList !== 'undefined') cardEl.classList.remove('dragging');
    const allDropZones = [
      ...(this._pedestalEls || []),
      ...(this._labSlotEls  || []),
      ...Object.values(this._equipSlotEls || {}),
    ];
    allDropZones.forEach(el => el.classList.remove('drag-over'));

    // Check if dropped on a pedestal
    let droppedOnPedestal = -1;
    (this._pedestalEls || []).forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top  && e.clientY <= r.bottom) {
        droppedOnPedestal = i;
      }
    });

    if (droppedOnPedestal >= 0) {
      this._collection.exhibit(instanceId, droppedOnPedestal);
      const merge = this._collection.checkMerge();
      if (merge) this._showMergeFlash(merge.newTier, merge.typeId);
      this._syncCollectionUI();
      return;
    }

    // Check if dropped on a lab slot
    let droppedOnLab = -1;
    (this._labSlotEls || []).forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top  && e.clientY <= r.bottom) {
        droppedOnLab = i;
      }
    });

    if (droppedOnLab >= 0) {
      this._collection.placeInLab(instanceId, droppedOnLab);
      this._syncCollectionUI();
      this._syncLabUI();
      return;
    }

    // Check if dropped on an equipment slot
    let droppedOnEquip = null;
    for (const [slotType, el] of Object.entries(this._equipSlotEls || {})) {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top  && e.clientY <= r.bottom) {
        droppedOnEquip = slotType;
      }
    }
    if (droppedOnEquip) {
      const ok = this._collection.equipArtifact(instanceId, droppedOnEquip);
      if (ok) { this._syncEquipUI(); this._syncCollectionUI(); }
      return;
    }

    // Dropped on empty space → return source item to inventory
    if (sourceType === 'pedestal' && sourceIndex >= 0) {
      this._collection.unexhibit(sourceIndex);
      this._syncCollectionUI();
    } else if (sourceType === 'lab' && sourceIndex >= 0) {
      this._collection.removeFromLab(sourceIndex);
      this._syncCollectionUI();
      this._syncLabUI();
    } else if (sourceType === 'equip') {
      this._collection.unequipSlot(sourceIndex);
      this._syncEquipUI();
      this._syncCollectionUI();
    }
    // sourceType === 'inventory' → item stays in inventory, nothing to do
  }

  // ── Artifact toast notification ───────────────────────────────────────────────

  _showArtifactToast(instance) {
    const def  = ArtifactRegistry.getById(instance.typeId);
    const toast = document.getElementById('artifact-toast');
    if (!toast || !def) return;
    document.getElementById('artifact-toast-img').src         = def.spriteFull || def.sprite || '';
    document.getElementById('artifact-toast-name').textContent = def.name;
    document.getElementById('artifact-toast-tier').textContent = `${TIER_NAMES[instance.tier]} (Tier ${instance.tier})`;
    toast.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('visible'), 4200);
  }

  // ── Merge flash ───────────────────────────────────────────────────────────────

  _showMergeFlash(newTier, typeId) {
    const def = ArtifactRegistry.getById(typeId);
    const el  = document.getElementById('merge-flash');
    if (!el) return;
    el.textContent = `✦ MERGED → ${TIER_NAMES[newTier]} ${def?.name ?? 'Artifact'} ✦`;
    el.classList.add('visible');
    clearTimeout(this._mergeFlashTimer);
    this._mergeFlashTimer = setTimeout(() => el.classList.remove('visible'), 2500);
  }

  // ── Laboratory nav + purchase ─────────────────────────────────────────────────

  _onLabNavClick() {
    if (this._collection.labState.purchased) {
      this._fadeTransition(() => this.showLab());
    } else {
      // Show purchase modal with current gold
      const gold = Math.floor(this._collection.state.panoptikumGold);
      const display = this._el('lab-purchase-gold-display');
      if (display) display.textContent = `Your Pano-Gold: ${gold.toLocaleString()} ⬡`;
      const confirmBtn = document.getElementById('btn-lab-confirm');
      if (confirmBtn) confirmBtn.disabled = gold < 600;
      this._el('lab-purchase-overlay')?.classList.add('visible');
    }
  }

  _updateLabNavButton() {
    const btn = document.getElementById('btn-nav-laboratory');
    if (!btn) return;
    if (this._collection.labState.purchased) {
      btn.classList.remove('lab-locked');
    } else {
      btn.classList.add('lab-locked');
    }
  }

  showLab() {
    this._exp.hide();
    this._hub().style.display = 'flex';
    this._el('pano-transition').style.display = 'none';
    this._el('pano-views').style.display      = '';
    this._el('pano-view-hub').style.display   = 'none';
    this._el('pano-view-hub').classList.remove('active');
    this._el('pano-view-equip')?.classList.remove('active');
    this._el('pano-view-lab').classList.add('active');
    this._showGlobalUI();
    this._setNavActive('laboratory');
    this._stopVisitorAnimation();
    this._syncLabUI();
  }

  showEquip() {
    this._exp.hide();
    this._hub().style.display = 'flex';
    this._el('pano-transition').style.display   = 'none';
    this._el('pano-views').style.display        = '';
    this._el('pano-view-hub').style.display     = 'none';
    this._el('pano-view-hub').classList.remove('active');
    this._el('pano-view-lab').classList.remove('active');
    this._el('pano-view-equip').classList.add('active');
    this._showGlobalUI();
    this._setNavActive('equipment');
    this._stopVisitorAnimation();
    this._buildEquipSlots();
    this._syncEquipUI();
  }

  _buildEquipSlots() {
    const area = document.getElementById('equip-slots-area');
    if (!area) return;
    area.innerHTML = '';
    this._equipSlotEls = {};
    for (const slotType of PanoptikumCollection.EQUIP_SLOT_TYPES) {
      const info  = (typeof EQUIP_SLOTS !== 'undefined' && EQUIP_SLOTS[slotType]) || { label: slotType, icon: '▪' };
      const el    = document.createElement('div');
      el.className       = 'equip-slot';
      el.dataset.slotType = slotType;
      el.innerHTML = `<div class="equip-slot-label">${info.icon} ${info.label}</div><div class="equip-slot-inner"></div>`;
      area.appendChild(el);
      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._collection.unequipSlot(slotType);
        this._syncEquipUI();
      });
      this._equipSlotEls[slotType] = el;
    }
  }

  _syncEquipUI() {
    if (!this._equipSlotEls) return;
    const equipped = this._collection.getEquippedItems();

    // Refresh equip slot elements — clone to clear stale listeners (same pattern as _syncLabUI)
    for (const slotType of PanoptikumCollection.EQUIP_SLOT_TYPES) {
      const el = this._equipSlotEls[slotType];
      if (!el) continue;

      const fresh = el.cloneNode(false); // no children — we rebuild completely
      el.replaceWith(fresh);
      this._equipSlotEls[slotType] = fresh;
      fresh.dataset.slotType = slotType;

      // Always re-attach contextmenu (right-click to unequip)
      fresh.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._collection.unequipSlot(slotType);
        this._syncEquipUI();
        this._syncCollectionUI();
      });

      const info  = (typeof EQUIP_SLOTS !== 'undefined' && EQUIP_SLOTS[slotType]) || { label: slotType, icon: '▪', desc: slotType };
      const labelEl = document.createElement('div');
      labelEl.className   = 'equip-slot-label';
      labelEl.textContent = `${info.icon} ${info.label}`;
      fresh.appendChild(labelEl);

      const inner = document.createElement('div');
      inner.className = 'equip-slot-inner';
      fresh.appendChild(inner);

      const slot = equipped[slotType];
      if (slot) {
        fresh.classList.add('occupied');
        const def = ArtifactRegistry.getById(slot.typeId);
        const img = document.createElement('img');
        img.src       = def?.sprite || '';
        img.alt       = def?.name  || '';
        img.className = 'equip-slot-img';
        img.draggable = false;
        img.addEventListener('dragstart', e => e.preventDefault());
        inner.appendChild(img);
        const nameEl = document.createElement('div');
        nameEl.className   = 'equip-slot-name';
        nameEl.textContent = `${TIER_NAMES[slot.tier] || ''} ${def?.name || slot.typeId}`;
        inner.appendChild(nameEl);
        // Drag from equip slot back to inventory
        fresh.addEventListener('mousedown', ev => {
          if (ev.button !== 0) return;
          ev.preventDefault();
          this._pendingClick = { instanceId: slot.instanceId, x: ev.clientX, y: ev.clientY, cardEl: fresh, sourceType: 'equip', sourceIndex: slotType };
        });
        fresh.title = `${ArtifactRegistry.getDisplayName(slot)} — drag to move · right-click to unequip`;
      } else {
        fresh.classList.remove('occupied');
        inner.innerHTML = `<span class="equip-slot-empty">${info.desc || slotType}</span>`;
        fresh.title = `Drop a ${info.label} artifact here`;
      }
    }

    // Populate Cabinet grid — show ALL inventory items that have an equipSlot
    const grid = document.getElementById('equip-inv-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const items = this._collection.state.inventory.filter(item => {
      const def = ArtifactRegistry.getById(item.typeId);
      return def?.equipSlot != null;
    });
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className   = 'lab-inv-empty';
      empty.textContent = 'No equippable artifacts in Cabinet.';
      grid.appendChild(empty);
      return;
    }
    for (const item of items) {
      const def      = ArtifactRegistry.getById(item.typeId);
      const slotInfo = (typeof EQUIP_SLOTS !== 'undefined' && EQUIP_SLOTS[def.equipSlot]) || { icon: '', label: def.equipSlot };
      const card = document.createElement('div');
      card.className = 'inv-card';
      card.draggable = false;
      card.addEventListener('dragstart', e => e.preventDefault());

      const img = document.createElement('img');
      img.src = def?.sprite || '';
      img.alt = def?.name  || '';
      img.draggable = false;
      img.addEventListener('dragstart', e => e.preventDefault());

      const label = document.createElement('span');
      label.className   = 'inv-card-label';
      label.textContent = `${TIER_NAMES[item.tier] || ''} ${def?.name || item.typeId}`;

      const slotTag = document.createElement('span');
      slotTag.className   = 'inv-card-slot-tag';
      slotTag.textContent = `${slotInfo.icon} ${slotInfo.label}`;

      card.appendChild(img);
      card.appendChild(label);
      card.appendChild(slotTag);
      card.addEventListener('mousedown', ev => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        this._pendingClick = { instanceId: item.instanceId, x: ev.clientX, y: ev.clientY, cardEl: card, sourceType: 'inventory' };
      });
      grid.appendChild(card);
    }
  }

  // ── Lab slots DOM ─────────────────────────────────────────────────────────────

  _buildLabSlots() {
    const area = document.getElementById('lab-slots-area');
    if (!area) return;
    area.innerHTML = '';
    this._labSlotEls = [];
    for (let i = 0; i < PanoptikumCollection.LAB_SLOT_COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'lab-slot';
      el.dataset.labSlotIndex = i;
      el.innerHTML = `<span class="lab-slot-empty-icon">⚗</span>`;
      area.appendChild(el);
      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._collection.removeFromLab(i);
        this._syncCollectionUI();
        this._syncLabUI();
      });
      this._labSlotEls.push(el);
    }
  }

  _addLabSlotDragStart(el, slotIndex, instanceId) {
    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      this._pendingClick = { instanceId, x: e.clientX, y: e.clientY, cardEl: el, sourceType: 'lab', sourceIndex: slotIndex };
    });
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      this._pendingClick = { instanceId, x: t.clientX, y: t.clientY, cardEl: el, sourceType: 'lab', sourceIndex: slotIndex };
    }, { passive: false });
  }

  _syncLabUI() {
    // Update lab button state
    this._updateLabNavButton();

    const resEl  = document.getElementById('lab-research-val');
    if (resEl) resEl.textContent = Math.floor(this._collection.labState.research).toLocaleString();
    const rateEl = document.getElementById('lab-research-rate');
    if (rateEl) {
      const rpm = ArtifactRegistry.calculateResearchRPM(this._collection.labState.slots);
      rateEl.textContent = rpm > 0 ? `+${rpm}` : '0';
    }

    const slots = this._collection.labState.slots;
    (this._labSlotEls || []).forEach((el, i) => {
      const slot = slots[i];
      // Clone to clear old event listeners
      const fresh = el.cloneNode(false);
      el.replaceWith(fresh);
      this._labSlotEls[i] = fresh;
      fresh.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._collection.removeFromLab(i);
        this._syncCollectionUI();
        this._syncLabUI();
      });

      fresh.innerHTML = '';
      if (slot) {
        const def = ArtifactRegistry.getById(slot.typeId);
        fresh.classList.add('occupied');
        const img = document.createElement('img');
        img.className = 'lab-slot-img';
        img.src = def?.sprite || '';
        img.alt = def?.name || '';
        fresh.appendChild(img);
        const nameEl = document.createElement('div');
        nameEl.className = 'lab-slot-name';
        nameEl.textContent = def?.name || slot.typeId;
        fresh.appendChild(nameEl);
        const rateEl = document.createElement('div');
        rateEl.className = 'lab-slot-research-rate';
        rateEl.textContent = `+${slot.tier} ⬡/min`;
        fresh.appendChild(rateEl);
        fresh.title = `${ArtifactRegistry.getDisplayName(slot)} — drag to move · right-click to remove`;
        this._addLabSlotDragStart(fresh, i, slot.instanceId);
        // Click to open dossier (if no drag)
        fresh.addEventListener('click', () => this._openDossier(slot.instanceId));
      } else {
        fresh.classList.remove('occupied');
        fresh.innerHTML = `<span class="lab-slot-empty-icon">⚗</span>`;
        fresh.title = 'Drag an artifact here to research it';
      }
    });
  }

  // ── Visitor animation ─────────────────────────────────────────────────────────

  static VISITOR_SPRITES = [
    'bald_scholar', 'burly_sailor', 'crazy_alchemist', 'dreadlocked_traveler',
    'elegant_updo', 'ghostly_visitor', 'high_priest', 'hooded_figure',
    'little_girl', 'nobleman', 'old_woman', 'resting_knight',
    'street_urchin', 'tall_top_hat', 'young_boy',
  ];

  _startVisitorAnimation() {
    if (this._visitorRAF) return;
    this._visitorLastTime = performance.now();
    const loop = (now) => {
      const dt = Math.min(now - this._visitorLastTime, 50);
      this._visitorLastTime = now;
      this._tickVisitors(dt);
      this._visitorRAF = requestAnimationFrame(loop);
    };
    this._visitorRAF = requestAnimationFrame(loop);
  }

  _stopVisitorAnimation() {
    if (this._visitorRAF) { cancelAnimationFrame(this._visitorRAF); this._visitorRAF = null; }
  }

  _tickVisitors(dt) {
    const container = document.getElementById('crowd-foreground');
    if (!container) return;
    const w = container.clientWidth || window.innerWidth;
    const now = Date.now();

    for (const v of (this._visitorEntities || [])) {
      const margin = 30; // px from edges
      const maxPx = w - margin * 2;

      if (v.pauseEnd > now) {
        // Bob in place while paused
        v.bobPhase += dt * 0.003;
        v.el.style.transform = `translateY(${Math.sin(v.bobPhase) * 1.5}px)`;
        continue;
      }

      const dx = v.targetPx - v.xPx;
      const dist = Math.abs(dx);
      if (dist < 2) {
        v.xPx = v.targetPx;
        v.pauseEnd = now + 800 + Math.random() * 2500;
        v.targetPx = margin + Math.random() * maxPx;
      } else {
        const step = v.speedPxMs * dt;
        v.xPx += dx > 0 ? Math.min(step, dist) : -Math.min(step, dist);
        v.bobPhase += dt * 0.007;
        const bob    = Math.sin(v.bobPhase) * 3;
        const flip   = dx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
        v.el.style.transform = `translateY(${bob}px) ${flip}`;
      }
      v.el.style.left = `${v.xPx}px`;
    }
  }

  _updateVisitors(count) {
    if (!this._visitorEntities) this._visitorEntities = [];
    const container = document.getElementById('crowd-foreground');
    if (!container) return;

    // Remove excess
    while (this._visitorEntities.length > count) {
      const v = this._visitorEntities.pop();
      v.el.remove();
    }

    // Add new
    const w = container.clientWidth || window.innerWidth;
    const sprites = PanoptikumHub.VISITOR_SPRITES;
    while (this._visitorEntities.length < count) {
      const idx    = this._visitorEntities.length % sprites.length;
      const el     = document.createElement('img');
      el.className = 'crowd-visitor';
      el.src       = `ASSETS/VISITORS/${sprites[idx]}_full.png`;
      el.alt       = '';
      container.appendChild(el);
      const margin  = 30;
      const startPx = margin + Math.random() * Math.max(1, w - margin * 2);
      this._visitorEntities.push({
        el,
        xPx:       startPx,
        targetPx:  margin + Math.random() * Math.max(1, w - margin * 2),
        speedPxMs: 0.025 + Math.random() * 0.020,
        pauseEnd:  Date.now() + Math.random() * 1500,
        bobPhase:  Math.random() * Math.PI * 2,
      });
      el.style.left = `${startPx}px`;
    }
  }

  _checkFirstVisitor(visitors) {
    if (visitors < 1) return;
    if (localStorage.getItem('hexmaze_first_visitor_seen')) return;
    localStorage.setItem('hexmaze_first_visitor_seen', '1');
    const el = document.getElementById('visitor-notification');
    if (!el) return;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 7000);
  }

  // ── Artifact dossier ──────────────────────────────────────────────────────────

  _openDossier(instanceId) {
    // Look in both inventory and pedestals and lab slots
    let item = this._collection.getItem(instanceId);
    if (!item) {
      for (const s of this._collection.state.pedestals) {
        if (s?.instanceId === instanceId) { item = s; break; }
      }
    }
    if (!item) {
      for (const s of this._collection.labState.slots) {
        if (s?.instanceId === instanceId) { item = s; break; }
      }
    }
    if (!item) return;

    const def  = ArtifactRegistry.getById(item.typeId);
    if (!def) return;

    const unlockedByTypeId = this._collection.getUnlockedByTypeId();
    const unlocked = unlockedByTypeId[item.typeId] || [];
    const research = Math.floor(this._collection.labState.research);

    // Populate dossier
    this._el('dossier-full-img').src = def.spriteFull || def.sprite || '';
    this._el('dossier-tier-badge').textContent =
      `${TIER_NAMES[item.tier] || ''} — Tier ${item.tier}`;
    this._el('dossier-name').textContent = def.name;

    // Lore
    const loreEl = this._el('dossier-lore');
    if (unlocked.includes('lore') || !def.description) {
      loreEl.textContent = def.description || '—';
      loreEl.classList.remove('locked');
    } else {
      loreEl.textContent = def.description; // show it blurred via CSS
      loreEl.classList.add('locked');
    }

    // Metadata
    const meta = def.metadata || {};
    const META_FIELDS = [
      ['material',       'Material',        false],
      ['type',           'Type',            false],
      ['size',           'Size',            false],
      ['weight',         'Weight (kg)',      false],
      ['origin',         'Origin',          'origin'],
      ['arcaneResonance','Arcane Resonance', 'arcaneResonance'],
    ];
    const metaEl = this._el('dossier-meta');
    metaEl.innerHTML = '';
    for (const [key, label, lockField] of META_FIELDS) {
      const isLocked = lockField && !unlocked.includes(lockField);
      const keyEl = document.createElement('div');
      keyEl.className   = 'dossier-meta-key';
      keyEl.textContent = label;
      const valEl = document.createElement('div');
      valEl.className   = `dossier-meta-val${isLocked ? ' locked' : ''}`;
      valEl.textContent = isLocked ? '???' : (meta[key] ?? '—');
      metaEl.appendChild(keyEl);
      metaEl.appendChild(valEl);
    }

    // Traits — hidden until 'traits' field is researched
    const traitsEl = this._el('dossier-traits');
    const traitsSectionEl = this._el('dossier-traits-section');
    traitsEl.innerHTML = '';
    if (unlocked.includes('traits') && (def.traits || []).length > 0) {
      for (const trait of def.traits) {
        const d = document.createElement('div');
        d.className = `dossier-trait ${trait.type}`;
        const desc = typeof trait.description === 'function'
          ? trait.description(item.tier) : (trait.description || '');
        d.innerHTML = `<div class="dossier-trait-name">${trait.name}</div><div>${desc}</div>`;
        traitsEl.appendChild(d);
      }
      if (traitsSectionEl) traitsSectionEl.style.display = '';
    } else if ((def.traits || []).length > 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'dossier-trait';
      placeholder.style.cssText = 'color:#2a3a4a; font-style:italic;';
      placeholder.textContent = 'Properties unknown — conduct research in the Laboratory to reveal.';
      traitsEl.appendChild(placeholder);
      if (traitsSectionEl) traitsSectionEl.style.display = '';
    } else {
      if (traitsSectionEl) traitsSectionEl.style.display = 'none';
    }

    // Unlock buttons
    const unlockRow = this._el('dossier-unlock-row');
    unlockRow.innerHTML = '';
    const UNLOCK_LABELS = {
      lore:           `Unlock Lore (${PanoptikumCollection.UNLOCK_COSTS.lore} ⬡)`,
      traits:         `Reveal Properties (${PanoptikumCollection.UNLOCK_COSTS.traits} ⬡)`,
      origin:         `Unlock Origin (${PanoptikumCollection.UNLOCK_COSTS.origin} ⬡)`,
      arcaneResonance:`Unlock Arcane Resonance (${PanoptikumCollection.UNLOCK_COSTS.arcaneResonance} ⬡)`,
    };
    for (const [field, label] of Object.entries(UNLOCK_LABELS)) {
      if (unlocked.includes(field)) continue;
      const btn = document.createElement('button');
      btn.className   = 'dossier-unlock-btn';
      btn.textContent = label;
      btn.disabled    = research < PanoptikumCollection.UNLOCK_COSTS[field];
      btn.addEventListener('click', () => {
        if (this._collection.unlockField(instanceId, field)) {
          this._openDossier(instanceId);
        }
      });
      unlockRow.appendChild(btn);
    }

    this._el('artifact-dossier').classList.add('visible');
    this._currentDossierInstanceId = instanceId;
  }

  _closeDossier() {
    this._el('artifact-dossier')?.classList.remove('visible');
    this._currentDossierInstanceId = null;
  }

  // ── Override showHub / enterPlayMode for visitor management ──────────────────

  _startHubVisitors() {
    const unlockedByTypeId = this._collection.getUnlockedByTypeId();
    const gpm      = ArtifactRegistry.calculatePassiveGPM(this._collection.state.pedestals, unlockedByTypeId);
    const visitors = ArtifactRegistry.calculateVisitorCount(gpm);
    this._updateVisitors(visitors);
    this._checkFirstVisitor(visitors);
    this._startVisitorAnimation();
  }
}
