'use strict';

// panoptikum-collection.js — PanoArcManager + PanoptikumCollection
// Loaded before panoptikum-ui.js

'use strict';

// ────────────────────────────────────────────────────────────────────────────────
// panoptikum.js  –  Meta-Progression Hub + Global Persistent UI
// ────────────────────────────────────────────────────────────────────────────────



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
  static STORAGE_KEY        = 'hexmaze_collection';
  static LAB_STORAGE_KEY    = 'hexmaze_laboratory';
  static MARKET_STORAGE_KEY = 'hexmaze_market';
  static PEDESTAL_COUNT     = 5;
  static LAB_SLOT_COUNT     = 3;
  static INCOME_INTERVAL_MS = 1_000; // smooth 1-second tick

  // Research unlock costs per field
  static UNLOCK_COSTS = { lore: 10, traits: 15, origin: 20, arcaneResonance: 50 };
  static EQUIP_SLOT_TYPES = ['head', 'eyes', 'face', 'hands', 'tool', 'pouch', 'boots'];

  // Merge cost: Gold = 50×tier, Research = 5×tier
  static MERGE_BASE_GOLD     = 50;
  static MERGE_BASE_RESEARCH = 5;

  // Market upgrade definitions (static design data)
  static MARKET_UPGRADES = [
    { id: 'velvetLining',  name: 'Velvet Display Lining',   cost: 400,   effect: '+15% final payout'          },
    { id: 'gazetteAds',    name: 'Bourgeois Gazette Ads',   cost: 1200,  effect: 'Sale time −25%'              },
    { id: 'stockroomI',    name: 'Expanded Stockroom I',    cost: 2500,  effect: '+1 market sale slot'         },
    { id: 'artOfDeal',     name: '"The Art of the Deal"',   cost: 6000,  effect: '10% chance: 2× payout'      },
    { id: 'smugglersDoor', name: "Smuggler's Backdoor",     cost: 18000, effect: 'Sell Cursed items freely'    },
  ];

  // Crucible timer: tierSeconds × tier = total seconds
  static CRUCIBLE_SECONDS_PER_TIER = 300; // 5 min per tier

  // Audience Insight upgrade cost (gold) per tier: 100, 200, 400, 800, …
  static AUDIENCE_INSIGHT_BASE_COST = 100;

  constructor() {
    this._incomeTimer = null;
    this._onTickCb    = null;
    this.state       = this._load();
    this.labState    = this._loadLab();
    this.marketState = this._loadMarket();
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
    if (!this.labState.crucible) {
      this.labState.crucible = { artifact: null, startedAt: null, totalDuration: null };
    }
    if (!this.labState.unlockedKnowledge) {
      this.labState.unlockedKnowledge = {};
    }
    if (!this.labState.audienceInsight) {
      this.labState.audienceInsight = {};
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

  // Remove an artifact from wherever it currently lives and save state.
  // Used by the run-rollback system to undo artifacts gained on a failed run.
  removeByInstanceId(instanceId) {
    const item = this._findAndRemoveItem(instanceId);
    if (!item) return false;
    this._save();
    this._saveLab();
    return true;
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

  _currentGPM() {
    // GlobalGameStats is the authoritative source once StatsManager is running.
    // Fall back to direct calculation (with full unlockedKnowledge) before init.
    if (window.GlobalGameStats) return window.GlobalGameStats.gpm;
    return ArtifactRegistry.calculatePassiveGPM(
      this.state.pedestals,
      this.getUnlockedByTypeId(),
      this.labState.unlockedKnowledge || {},
    );
  }

  awardOfflineIncome() {
    const now     = Date.now();
    const elapsed = (now - (this.state.lastIncomeTimestamp ?? now)) / 1000;
    const earned  = (this._currentGPM() / 60) * elapsed;
    if (earned > 0) {
      this.state.panoptikumGold      += earned;
      this.state.lastIncomeTimestamp  = now;
      this._save();
    }
  }

  startIncomeTicker(onTick) {
    this._onTickCb = onTick;
    if (this._incomeTimer) { clearInterval(this._incomeTimer); this._incomeTimer = null; }
    this._incomeTimer = setInterval(() => {
      const goldEarned = (this._currentGPM() / 60) * (PanoptikumCollection.INCOME_INTERVAL_MS / 1000);
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
      unlockedKnowledge:     {},
      equipped:              Object.fromEntries(PanoptikumCollection.EQUIP_SLOT_TYPES.map(s => [s, null])),
      crucible:              { artifact: null, startedAt: null, totalDuration: null },
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

  // ── Market persistence ────────────────────────────────────────────────────────

  _loadMarket() {
    try {
      const raw = localStorage.getItem(PanoptikumCollection.MARKET_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      slots: [null, null],
      upgrades: {
        velvetLining: false, gazetteAds: false, stockroomI: false,
        artOfDeal: false, smugglersDoor: false,
      },
    };
  }

  _saveMarket() {
    try {
      localStorage.setItem(PanoptikumCollection.MARKET_STORAGE_KEY, JSON.stringify(this.marketState));
    } catch (_) {}
  }

  // ── Market operations ─────────────────────────────────────────────────────────

  getMarketSaleTime(item) {
    const def = ArtifactRegistry.getById(item.typeId);
    const baseValue = def?.baseValue || 10;
    const tierSecs  = item.tier * 60; // 1 min per tier at T1
    const speedMod  = this.marketState.upgrades.gazetteAds ? 0.75 : 1.0;
    return Math.max(10, tierSecs * speedMod) * 1000; // → ms
  }

  getMarketPayout(item) {
    const def       = ArtifactRegistry.getById(item.typeId);
    const base      = def?.baseValue || 10;
    const tierMult  = Math.pow(1.4, item.tier - 1);
    const demandMod = this.marketState.upgrades.velvetLining ? 1.15 : 1.0;
    const bidding   = (this.marketState.upgrades.artOfDeal && Math.random() < 0.10) ? 2.0 : 1.0;
    return Math.round(base * tierMult * demandMod * bidding);
  }

  listForSale(instanceId, slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.marketState.slots.length) return false;
    if (this.marketState.slots[slotIndex] !== null) return false;
    const item = this._findAndRemoveItem(instanceId);
    if (!item) return false;
    const saleTime = this.getMarketSaleTime(item);
    this.marketState.slots[slotIndex] = { artifact: item, listedAt: Date.now(), totalSaleTime: saleTime };
    this._save(); this._saveMarket();
    return true;
  }

  cancelSale(slotIndex) {
    const slot = this.marketState.slots[slotIndex];
    if (!slot) return;
    slot.artifact.state = 'inventory';
    this.state.inventory.push(slot.artifact);
    this.marketState.slots[slotIndex] = null;
    this._save(); this._saveMarket();
  }

  // Returns array of { payout, artifact } for all completed sales, clearing those slots.
  checkCompletedSales() {
    const completed = [];
    const now = Date.now();
    for (let i = 0; i < this.marketState.slots.length; i++) {
      const slot = this.marketState.slots[i];
      if (!slot) continue;
      if (now - slot.listedAt >= slot.totalSaleTime) {
        const payout = this.getMarketPayout(slot.artifact);
        this.state.panoptikumGold += payout;
        completed.push({ payout, artifact: slot.artifact, slotIndex: i });
        this.marketState.slots[i] = null;
      }
    }
    if (completed.length) { this._save(); this._saveMarket(); }
    return completed;
  }

  purchaseMarketUpgrade(upgradeId) {
    const def = PanoptikumCollection.MARKET_UPGRADES.find(u => u.id === upgradeId);
    if (!def || this.marketState.upgrades[upgradeId]) return false;
    if (this.state.panoptikumGold < def.cost) return false;
    this.state.panoptikumGold -= def.cost;
    this.marketState.upgrades[upgradeId] = true;
    // Expanded Stockroom I: add a new null slot
    if (upgradeId === 'stockroomI') this.marketState.slots.push(null);
    this._save(); this._saveMarket();
    return true;
  }

  // ── Crucible operations ───────────────────────────────────────────────────────

  startCrucible(instanceId) {
    if (this.labState.crucible.artifact) return false; // already in use
    const item = this._findAndRemoveItem(instanceId);
    if (!item) return false;
    const duration = item.tier * PanoptikumCollection.CRUCIBLE_SECONDS_PER_TIER * 1000;
    item.state = 'crucible';
    this.labState.crucible = { artifact: item, startedAt: Date.now(), totalDuration: duration };
    this._save(); this._saveLab();
    return true;
  }

  cancelCrucible() {
    const { artifact } = this.labState.crucible;
    if (!artifact) return;
    artifact.state = 'inventory';
    this.state.inventory.push(artifact);
    this.labState.crucible = { artifact: null, startedAt: null, totalDuration: null };
    this._save(); this._saveLab();
  }

  // Returns the discovery config if complete, null otherwise.
  // Permanently destroys the artifact and records the discovery.
  checkCrucibleComplete() {
    const { artifact, startedAt, totalDuration } = this.labState.crucible;
    if (!artifact || !startedAt) return null;
    if (Date.now() - startedAt < totalDuration) return null;
    // Complete — look up discovery
    const discovery = ArtifactRegistry.getCrucibleDiscovery(artifact.typeId);
    // Record discovery in unlockedKnowledge
    if (discovery) {
      if (!this.labState.unlockedKnowledge[discovery.appliesTo])
        this.labState.unlockedKnowledge[discovery.appliesTo] = [];
      if (!this.labState.unlockedKnowledge[discovery.appliesTo].includes(discovery.id))
        this.labState.unlockedKnowledge[discovery.appliesTo].push(discovery.id);
    }
    // Destroy artifact (do not return to inventory)
    this.labState.crucible = { artifact: null, startedAt: null, totalDuration: null };
    this._saveLab();
    return discovery || { id: 'unknown', name: 'Residual Knowledge', loreText: 'Something was learned.', appliesTo: null };
  }

  // ── Gated Merge ───────────────────────────────────────────────────────────────

  // Detect a merge candidate without executing. Returns { typeId, tier, cost } or null.
  detectMerge() {
    const candidate = ArtifactRegistry.tryMerge(this.state.inventory);
    if (!candidate) return null;
    const tier = candidate.add.tier;
    return {
      typeId:     candidate.add.typeId,
      tier,
      cost: {
        gold:     PanoptikumCollection.MERGE_BASE_GOLD     * tier,
        research: PanoptikumCollection.MERGE_BASE_RESEARCH * tier,
      },
    };
  }

  // ── Audience Insight upgrades ────────────────────────────────────────────────
  // Tier-specific gold purchases that reveal exhibitGPM in the artifact dossier.

  audienceInsightCost(tier) {
    return PanoptikumCollection.AUDIENCE_INSIGHT_BASE_COST * Math.pow(2, tier - 1);
  }

  hasAudienceInsight(tier) {
    return !!this.labState.audienceInsight?.[tier];
  }

  /**
   * Purchase audience insight for `tier`.
   * @param {number} tier - artifact tier (1–10)
   * @returns {boolean} true if purchase succeeded
   */
  purchaseAudienceInsight(tier) {
    if (this.hasAudienceInsight(tier)) return false;
    const cost = this.audienceInsightCost(tier);
    if (this.state.panoptikumGold < cost) return false;
    this.state.panoptikumGold -= cost;
    this.labState.audienceInsight[tier] = true;
    this._save(); this._saveLab();
    return true;
  }

  /**
   * Returns the highest tier present anywhere in the collection
   * (inventory + pedestals + lab slots + equipped).
   * Used to determine which audience insight buttons to show.
   *
   * @returns {number} max tier, or 0 if collection is empty
   */
  getMaxCollectionTier() {
    const allItems = [
      ...this.state.inventory,
      ...this.state.pedestals.filter(Boolean),
      ...this.labState.slots.filter(Boolean),
      ...Object.values(this.labState.equipped || {}).filter(Boolean),
    ];
    return allItems.reduce((max, i) => Math.max(max, i.tier || 0), 0);
  }

  // Execute the merge, deducting costs. Returns the new instance or null on failure.
  executeMerge(typeId, tier) {
    const cost = {
      gold:     PanoptikumCollection.MERGE_BASE_GOLD     * tier,
      research: PanoptikumCollection.MERGE_BASE_RESEARCH * tier,
    };
    if (this.state.panoptikumGold  < cost.gold)     return null;
    if (this.labState.research      < cost.research)  return null;
    const result = ArtifactRegistry.tryMerge(this.state.inventory);
    if (!result || result.add.typeId !== typeId || result.add.tier !== tier) return null;
    this.state.panoptikumGold  -= cost.gold;
    this.labState.research     -= cost.research;
    this.state.inventory = this.state.inventory.filter(i => !result.remove.includes(i.instanceId));
    this.state.inventory.push(result.add);
    this._save(); this._saveLab();
    return result.add;
  }
}

