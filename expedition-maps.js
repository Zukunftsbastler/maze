'use strict';

// ────────────────────────────────────────────────────────────────────────────────
// expedition-maps.js  –  Two-tier Expedition Selection System
// ────────────────────────────────────────────────────────────────────────────────

// ── CSS (injected once) ───────────────────────────────────────────────────────

(function injectExpeditionStyles() {
  if (document.getElementById('exp-styles')) return;
  const s = document.createElement('style');
  s.id = 'exp-styles';
  s.textContent = `
    #expedition-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(6,6,15,0.97); backdrop-filter: blur(8px);
      display: none; flex-direction: column;
      font-family: 'Courier New', monospace; color: #c8d6e5;
      overflow: hidden;
    }

    /* ── Title bar ─────────────────────────────────────────────────────────── */
    #exp-title-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 20px; flex-shrink: 0;
      border-bottom: 1px solid rgba(74,158,255,0.2);
    }
    #exp-title {
      font-size: 1.0rem; letter-spacing: 0.16em; text-transform: uppercase;
      color: #4a9eff; text-shadow: 0 0 12px rgba(74,158,255,0.5); margin: 0;
    }
    #btn-exp-close, #btn-exp-back { font-size: 0.76rem; padding: 6px 14px; }

    /* ── Main container ────────────────────────────────────────────────────── */
    #exp-main { flex: 1 1 auto; min-height: 0; display: flex; overflow: hidden; }

    /* ── View A: Macro map ─────────────────────────────────────────────────── */
    #exp-macro-view {
      flex: 1 1 auto; display: flex;
      align-items: center; justify-content: center;
      gap: 24px; padding: 16px 24px; overflow: hidden;
    }
    #exp-macro-svg {
      flex-shrink: 0;
      height: min(calc(100vh - 62px), 100%);
      width: auto; max-width: 300px;
    }
    #exp-macro-right {
      flex: 1 1 auto; max-width: 420px; align-self: center;
      display: flex; flex-direction: column; gap: 14px;
    }
    #exp-global-score-box {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(74,158,255,0.18);
      border-radius: 8px; padding: 10px 16px;
      display: flex; align-items: center; justify-content: space-between;
      font-size: 0.80rem;
    }
    #exp-global-score-label { color: #4a9eff; letter-spacing: 0.1em; text-transform: uppercase; font-size: 0.64rem; }
    #exp-global-score-val   { color: #ffd23f; font-weight: bold; font-size: 1.0rem; }
    #exp-lore-panel {
      opacity: 0; transition: opacity 0.22s;
      padding: 20px 18px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(74,158,255,0.18);
      border-radius: 10px;
      font-size: 0.82rem; line-height: 1.70; color: #7a8899;
      pointer-events: none;
    }
    .exp-lore-title {
      font-size: 0.88rem; color: #4a9eff; letter-spacing: 0.1em;
      text-transform: uppercase; margin-bottom: 10px; font-weight: bold;
    }
    .exp-lore-hint {
      margin-top: 12px; font-size: 0.70rem; color: #445566; letter-spacing: 0.08em;
    }

    /* ── View B: Micro map ─────────────────────────────────────────────────── */
    #exp-micro-view { flex: 1 1 auto; overflow: hidden; }
    #exp-micro-map-wrap {
      flex: 1 1 auto; min-width: 0;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; padding: 10px;
    }
    #exp-micro-svg { max-width: 100%; max-height: 100%; display: block; }
    #exp-expedition-panel {
      flex: 0 0 275px;
      padding: 16px 15px 16px 16px;
      border-left: 1px solid rgba(74,158,255,0.2);
      display: flex; flex-direction: column; gap: 10px;
      overflow-y: auto;
    }
    #exp-micro-panel-top {
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid rgba(74,158,255,0.12); padding-bottom: 8px; margin-bottom: 2px;
    }
    #exp-panel-label {
      font-size: 0.60rem; letter-spacing: 0.14em; color: #334455;
      text-transform: uppercase;
    }
    #btn-exp-to-macro { font-size: 0.68rem; padding: 4px 10px; }
    #exp-micro-score-box {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(74,158,255,0.15);
      border-radius: 6px; padding: 8px 12px;
      display: flex; align-items: center; justify-content: space-between;
    }
    #exp-micro-score-label { color: #4a9eff; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.62rem; }
    #exp-micro-score-val   { color: #ffd23f; font-weight: bold; }
    #exp-panel-placeholder { color: #3a4a55; font-size: 0.76rem; line-height: 1.65; margin-top: 4px; }
    #exp-panel-content     { display: none; flex-direction: column; gap: 10px; }
    #exp-zone-name {
      font-size: 0.94rem; color: #ffd23f; letter-spacing: 0.05em;
      font-weight: bold; line-height: 1.35;
    }
    .exp-kv { display: flex; flex-direction: column; gap: 3px; }
    .exp-key {
      font-size: 0.61rem; letter-spacing: 0.13em; color: #4a9eff;
      text-transform: uppercase;
    }
    .exp-val          { font-size: 0.86rem; color: #c8d6e5; font-weight: bold; }
    .exp-val.exp-gold { color: #ffd23f; }
    .exp-val.exp-italic { color: #7a8899; font-size: 0.78rem; font-weight: normal; font-style: italic; }
    .exp-val.exp-cyan   { color: #00ff88; }
    #exp-zone-status {
      font-size: 0.70rem; font-style: italic; letter-spacing: 0.04em;
      padding: 5px 10px; border-radius: 5px; line-height: 1.4;
    }
    #exp-zone-status.status-aborted  {
      color: #ff8844; background: rgba(255,136,68,0.10);
      border: 1px solid rgba(255,136,68,0.35);
    }
    #exp-zone-status.status-completed {
      color: #00ff88; background: rgba(0,255,136,0.08);
      border: 1px solid rgba(0,255,136,0.30);
    }
    #btn-start-expedition { width: 100%; margin-top: 4px; }
    #btn-start-expedition:disabled {
      opacity: 0.35 !important; cursor: not-allowed; pointer-events: none;
    }

    /* ── Responsive ────────────────────────────────────────────────────────── */
    @media (max-width: 640px) {
      #exp-macro-view { flex-direction: column; gap: 12px; padding: 10px 12px; }
      #exp-macro-svg  { max-width: 240px; max-height: 50vh; }
      #exp-micro-view { flex-direction: column; }
      #exp-micro-map-wrap { padding: 6px; }
      #exp-expedition-panel {
        flex: 0 0 auto; max-height: 200px;
        border-left: none; border-top: 1px solid rgba(74,158,255,0.2);
      }
    }
  `;
  document.head.appendChild(s);
})();

// ── SVG helper ────────────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// ── Macro Map Data ─────────────────────────────────────────────────────────────
// Levels.png: 1536 × 2752  — 5 equal horizontal depth bands (~550 px each)

const MACRO_DEPTHS = [
  {
    id: 'depth1', y: 0, h: 550, status: 'available',
    name: 'Depth I — The Outer Vaults',
    lore: 'The uppermost chambers of the Labyrinth, once used by merchants to store surplus spice and grain. The air smells of dried herbs and mold. Strange markings on the walls hint that others have passed through — recently.',
    microMap: 'ASSETS/LEVEL_MAPS/Level01.png',
  },
  {
    id: 'depth2', y: 550, h: 550, status: 'locked',
    name: 'Depth II — The Brackish Halls',
    lore: 'Ancient cisterns half-flooded with stagnant water the colour of rust. The locals refuse to speak of what dwells in the brackish dark. Only those who have mastered the Outer Vaults dare descend.',
  },
  {
    id: 'depth3', y: 1100, h: 550, status: 'locked',
    name: 'Depth III — The Amber Warrens',
    lore: 'Tunnels coated in resinous amber — the hardened breath of some ancient creature. Fossils of unknown forms are embedded in the walls. Time moves differently here.',
  },
  {
    id: 'depth4', y: 1650, h: 550, status: 'locked',
    name: 'Depth IV — The Smoldering Deep',
    lore: 'The rock itself radiates heat. Veins of molten material pulse through cracks in the stone. Whatever lies at the centre of this place has been burning for a very long time.',
  },
  {
    id: 'depth5', y: 2200, h: 552, status: 'locked',
    name: 'Depth V — The Null Core',
    lore: 'No cartographer has returned from the lowest depth. Expedition logs stop mid-sentence. The Null Core does not appear on any official map. You are on your own.',
  },
];

// ── Micro Map Data ─────────────────────────────────────────────────────────────
// Level01.png: 2816 × 1536  — 12 isometric expedition zones.
//
// Visual order: top-left → top-right, then middle row, then bottom row.
// Only z01 (Gargoyle's Overlook) starts available; all others locked.
// Unlock chain: each completed zone unlocks the next in sequence.
// Points are diamond placeholders — swap with precise SVG polygon traces later.

function _diamond(cx, cy, w, h) {
  return `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
}

function _aggregateRadii(startRadius, mazeCount) {
  return mazeCount * startRadius + (mazeCount * (mazeCount - 1)) / 2;
}

function _difficultyScore(zone) {
  const { startRadius, mazeCount, mapPreviewTime = 2, generosityFactor = 4, sightRange = 4 } = zone;
  let base = 0;
  for (let i = 0; i < mazeCount; i++) base += (startRadius + i) * 10;
  const peekMult = mapPreviewTime === 0 ? 2.0 : mapPreviewTime <= 1 ? 1.5 : 1.0;
  const genMult  = generosityFactor <= 1.0 ? 2.5 : generosityFactor <= 2.0 ? 1.5 : 1.0;
  const fowMult  = 1.0 + Math.max(0, 4 - sightRange) * (1 / 3);
  return Math.round(base * peekMult * genMult * fowMult);
}

// Linear unlock chain — completing zone N unlocks zone N+1.
const EXPEDITION_UNLOCK_CHAIN = [
  'z01','z02','z03','z04','z05','z06','z07','z08','z09','z10','z11','z12',
];

const EXPEDITION_ZONES = [
  // ── Top row (named per visual map, left → right) ──────────────────────────────

  // Top-left: gargoyle statue
  {
    id: 'z01', status: 'locked',
    name: "Gargoyle's Overlook",
    points: _diamond(340, 270, 200, 120),
    mazeCount: 1, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A carved obsidian eye — the pupil follows sources of light.',
  },
  // Top-left-center: bookshelves and scattered tomes
  {
    id: 'z02', status: 'locked',
    name: 'The Ruined Archive',
    points: _diamond(900, 250, 210, 125),
    mazeCount: 2, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A water-damaged ledger — one page is written in tomorrow\'s date.',
  },
  // Top-center-right: crushed under broken wooden support beam
  {
    id: 'z03', status: 'locked',
    name: 'The Splintered Niche',
    points: _diamond(1555, 262, 205, 122),
    mazeCount: 2, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A splinter of load-bearing timber — still warm, as if recently alive.',
  },

  // ── Bottom row (named per visual map, left → right) ───────────────────────────

  // Bottom-left: barrels of spice
  {
    id: 'z04', status: 'locked',
    name: "Spice Merchant's Cellar",
    points: _diamond(400, 1248, 200, 120),
    mazeCount: 3, startRadius: 4,
    mapPreviewTime: 2, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'A sealed ceramic jar — its contents shift and whisper in the dark.',
  },
  // Bottom-center: glowing green sewer pipe
  {
    id: 'z05', status: 'locked',
    name: 'The Green Drain',
    points: _diamond(1165, 1262, 215, 128),
    mazeCount: 3, startRadius: 5,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'Alchemical residue crystallised into an iridescent lens.',
  },
  // Bottom-right: iron cell gate
  {
    id: 'z06', status: 'locked',
    name: 'The Rusted Gate',
    points: _diamond(1960, 1248, 210, 125),
    mazeCount: 3, startRadius: 5,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'An iron key wound with rune-wire, teeth filed to an unknown lock.',
  },

  // ── Middle row (placeholder rubble zones, left → right) ──────────────────────

  {
    id: 'z07', status: 'locked',
    name: 'The Dusty Anteroom',
    points: _diamond(175, 720, 148, 90),
    mazeCount: 4, startRadius: 5,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A brass monocle that lets you see through one wall per use.',
  },
  {
    id: 'z08', status: 'locked',
    name: 'The Collapsed Vault',
    points: _diamond(750, 712, 215, 128),
    mazeCount: 4, startRadius: 6,
    mapPreviewTime: 0, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'Corroded coin stamped with a monarch whose name was erased from history.',
  },
  {
    id: 'z09', status: 'locked',
    name: 'The Amber Passage',
    points: _diamond(1395, 728, 218, 130),
    mazeCount: 5, startRadius: 5,
    mapPreviewTime: 1, generosityFactor: 1, sightRange: 3,
    expectedArtifact: 'Salt crystal containing a perfectly preserved living flame.',
  },
  {
    id: 'z10', status: 'locked',
    name: 'The Crumbling Study',
    points: _diamond(2025, 712, 210, 125),
    mazeCount: 5, startRadius: 6,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'A bone flute that plays a different song each time — never the same twice.',
  },

  // ── Far edges (hardest zones) ─────────────────────────────────────────────────

  {
    id: 'z11', status: 'locked',
    name: 'The Forgotten Wing',
    points: _diamond(2195, 252, 200, 120),
    mazeCount: 5, startRadius: 6,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 1,
    expectedArtifact: 'Dried spore cluster that glows faintly and hums a single note.',
  },
  {
    id: 'z12', status: 'locked',
    name: 'The Flooded Cellars',
    points: _diamond(2645, 724, 148, 90),
    mazeCount: 6, startRadius: 6,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 1,
    expectedArtifact: 'A perfectly spherical void — it absorbs light and makes no sound.',
  },
];

// Attach computed fields
for (const z of EXPEDITION_ZONES) {
  z.aggregateRadii  = _aggregateRadii(z.startRadius, z.mazeCount);
  z.difficultyScore = _difficultyScore(z);
}

// ── Rectangular zone positions on Level01.png (2816 × 1536) ──────────────────
// Zones are laid out in a 3-row visual grid matching the image content.
// Each entry: { x, y, w, h } in image-pixel coordinates.
// These are placeholder rectangles — swap for precise values after visual inspection.
//
// Row 1 (top, y 0–512):   z01 z02 z03 z11
// Row 2 (middle, y 512–1024): z07 z08 z09 z10 z12
// Row 3 (bottom, y 1024–1536): z04 z05 z06

const ZONE_RECTS = {
  z01:  { x: 0,    y: 0,    w: 704, h: 512 },   // Gargoyle's Overlook   — top-left statue
  z02:  { x: 704,  y: 0,    w: 704, h: 512 },   // The Ruined Archive     — bookshelves
  z03:  { x: 1408, y: 0,    w: 704, h: 512 },   // The Splintered Niche   — broken beam
  z11:  { x: 2112, y: 0,    w: 704, h: 512 },   // The Forgotten Wing     — far top-right
  z07:  { x: 0,    y: 512,  w: 560, h: 512 },   // The Dusty Anteroom
  z08:  { x: 560,  y: 512,  w: 560, h: 512 },   // The Collapsed Vault
  z09:  { x: 1120, y: 512,  w: 560, h: 512 },   // The Amber Passage
  z10:  { x: 1680, y: 512,  w: 560, h: 512 },   // The Crumbling Study
  z12:  { x: 2240, y: 512,  w: 576, h: 512 },   // The Flooded Cellars   — far middle-right
  z04:  { x: 0,    y: 1024, w: 938, h: 512 },   // Spice Merchant's Cellar — bottom-left barrels
  z05:  { x: 938,  y: 1024, w: 940, h: 512 },   // The Green Drain         — bottom-center sewer
  z06:  { x: 1878, y: 1024, w: 938, h: 512 },   // The Rusted Gate         — bottom-right gate
};

// ── ExpeditionMaps ─────────────────────────────────────────────────────────────

class ExpeditionMaps {
  constructor() {
    this._onStart    = null;
    this._activeZone = null;
    this._overlay    = null;
    this._state      = this._loadState();
    this._applyState();
    this._buildDOM();
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /** Show overlay starting at View A. onStart(zone) called when expedition begins. */
  show(onStart) {
    this._onStart    = onStart;
    this._activeZone = null;
    this._overlay.style.display = 'flex';
    this._goMacro();
  }

  /** Show overlay starting at View B (micro map of depth1). */
  showAtMicro(onStart) {
    this._onStart    = onStart;
    this._activeZone = null;
    this._overlay.style.display = 'flex';
    const depth = MACRO_DEPTHS.find(d => d.id === 'depth1');
    if (depth) this._goMicro(depth);
    else this._goMacro();
  }

  hide() {
    this._overlay.style.display = 'none';
    this._activeZone = null;
  }

  /**
   * Called when an expedition run finishes successfully.
   * Updates zone state, unlocks next expedition, adds score to global total.
   */
  onExpeditionComplete(zoneId, expeditionScore) {
    const zone = EXPEDITION_ZONES.find(z => z.id === zoneId);
    if (!zone) return;

    // Mark zone completed (re-play is allowed; completed stays accessible)
    zone.status = 'completed';
    if (!this._state.completedIds.includes(zoneId)) {
      this._state.completedIds.push(zoneId);
    }

    // Unlock next zone in chain
    const idx = EXPEDITION_UNLOCK_CHAIN.indexOf(zoneId);
    if (idx !== -1 && idx + 1 < EXPEDITION_UNLOCK_CHAIN.length) {
      const nextId   = EXPEDITION_UNLOCK_CHAIN[idx + 1];
      const nextZone = EXPEDITION_ZONES.find(z => z.id === nextId);
      if (nextZone && nextZone.status === 'locked') {
        nextZone.status = 'available';
        if (!this._state.availableIds.includes(nextId)) {
          this._state.availableIds.push(nextId);
        }
      }
    }

    // Accumulate global score
    this._state.globalScore = (this._state.globalScore || 0) + expeditionScore;
    this._saveState();

    // Rebuild micro SVG to show updated statuses
    this._rebuildMicroSVG();
    this._updateScoreDisplays();
  }

  /**
   * Called when the player aborts an expedition mid-run.
   * Marks zone aborted (unless already completed), adds penalty score.
   */
  onExpeditionAborted(zoneId, penaltyScore) {
    const zone = EXPEDITION_ZONES.find(z => z.id === zoneId);
    if (!zone) return;

    // Don't downgrade a completed zone to aborted
    if (zone.status !== 'completed') {
      zone.status = 'aborted';
      if (!this._state.abortedIds) this._state.abortedIds = [];
      if (!this._state.abortedIds.includes(zoneId)) {
        this._state.abortedIds.push(zoneId);
      }
      // Remove from available (it remains accessible via aborted status)
      this._state.availableIds = (this._state.availableIds || []).filter(id => id !== zoneId);
    }

    this._state.globalScore = (this._state.globalScore || 0) + penaltyScore;
    this._saveState();
    this._rebuildMicroSVG();
    this._updateScoreDisplays();
  }

  // ── State persistence ─────────────────────────────────────────────────────────

  static STATE_KEY     = 'hexmaze_expedition_state';
  static STATE_VERSION = '4'; // incremented: added aborted state + rectangular zone rects

  _loadState() {
    try {
      const raw = localStorage.getItem(ExpeditionMaps.STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version === ExpeditionMaps.STATE_VERSION) return parsed;
      }
    } catch (_) {}
    // Fresh state: only z01 (Gargoyle's Overlook) is available
    return {
      version:      ExpeditionMaps.STATE_VERSION,
      completedIds: [],
      abortedIds:   [],
      availableIds: ['z01'],
      globalScore:  0,
    };
  }

  _saveState() {
    try {
      this._state.version = ExpeditionMaps.STATE_VERSION;
      localStorage.setItem(ExpeditionMaps.STATE_KEY, JSON.stringify(this._state));
    } catch (_) {}
  }

  /** Apply loaded state onto EXPEDITION_ZONES statuses. */
  _applyState() {
    const { completedIds = [], abortedIds = [], availableIds = [] } = this._state;
    for (const z of EXPEDITION_ZONES) {
      if (completedIds.includes(z.id)) { z.status = 'completed'; continue; }
      if (abortedIds.includes(z.id))   { z.status = 'aborted';   continue; }
      if (availableIds.includes(z.id)) { z.status = 'available'; continue; }
      z.status = 'locked';
    }
  }

  // ── DOM construction ──────────────────────────────────────────────────────────

  _buildDOM() {
    const ov = document.createElement('div');
    ov.id = 'expedition-overlay';
    ov.innerHTML = `
      <div id="exp-title-bar">
        <button id="btn-exp-close">✕ Close</button>
        <h2 id="exp-title">Select Depth</h2>
        <button id="btn-exp-back" style="visibility:hidden">← Back</button>
      </div>
      <div id="exp-main">

        <!-- View A: Macro map -->
        <div id="exp-macro-view">
          <svg id="exp-macro-svg"
               viewBox="0 0 1536 2752"
               preserveAspectRatio="xMidYMid meet"></svg>
          <div id="exp-macro-right">
            <div id="exp-global-score-box">
              <span id="exp-global-score-label">Total Score</span>
              <span id="exp-global-score-val">0</span>
            </div>
            <div id="exp-lore-panel"></div>
          </div>
        </div>

        <!-- View B: Micro map -->
        <div id="exp-micro-view" style="display:none">
          <div id="exp-micro-map-wrap">
            <svg id="exp-micro-svg"
                 viewBox="0 0 2816 1536"
                 preserveAspectRatio="xMidYMid meet"></svg>
          </div>
          <div id="exp-expedition-panel">
            <div id="exp-micro-panel-top">
              <span id="exp-panel-label">Expedition</span>
              <button id="btn-exp-to-macro">← World Map</button>
            </div>
            <div id="exp-micro-score-box">
              <span id="exp-micro-score-label">Total Score</span>
              <span id="exp-micro-score-val">0</span>
            </div>
            <div id="exp-panel-placeholder">Hover over an available zone to preview the expedition.</div>
            <div id="exp-panel-content">
              <div id="exp-zone-name"></div>
              <div class="exp-kv">
                <span class="exp-key">Labyrinths</span>
                <span class="exp-val exp-cyan" id="exp-mazecount-val">—</span>
              </div>
              <div class="exp-kv">
                <span class="exp-key">Starting Radius</span>
                <span class="exp-val" id="exp-startradius-val">—</span>
              </div>
              <div class="exp-kv">
                <span class="exp-key">Total Radii (all labs)</span>
                <span class="exp-val exp-gold" id="exp-aggradii-val">—</span>
              </div>
              <div class="exp-kv">
                <span class="exp-key">Est. Difficulty Score</span>
                <span class="exp-val exp-gold" id="exp-difficulty-val">—</span>
              </div>
              <div class="exp-kv">
                <span class="exp-key">Expected Artifact</span>
                <span class="exp-val exp-italic" id="exp-artifact-val">—</span>
              </div>
              <div id="exp-zone-status" style="display:none"></div>
              <button class="primary accent" id="btn-start-expedition" disabled>Start Expedition</button>
            </div>
          </div>
        </div>

      </div>`;

    document.body.appendChild(ov);
    this._overlay = ov;

    ov.querySelector('#btn-exp-close').addEventListener('click', () => this.hide());
    ov.querySelector('#btn-exp-back').addEventListener('click', () => this._goMacro());
    ov.querySelector('#btn-exp-to-macro').addEventListener('click', () => this._goMacro());

    ov.querySelector('#btn-start-expedition').addEventListener('click', () => {
      const btn = ov.querySelector('#btn-start-expedition');
      if (this._activeZone && !btn.disabled) {
        const zone = this._activeZone;   // capture before hide() nulls it
        this.hide();
        if (this._onStart) this._onStart(zone);
      }
    });

    this._buildMacroSVG();
    this._buildMicroSVG();
    this._updateScoreDisplays();
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  _goMacro() {
    document.getElementById('exp-macro-view').style.display = 'flex';
    document.getElementById('exp-micro-view').style.display = 'none';
    document.getElementById('exp-title').textContent         = 'Select Depth';
    document.getElementById('btn-exp-back').style.visibility = 'hidden';
    const lp = document.getElementById('exp-lore-panel');
    if (lp) lp.style.opacity = '0';
  }

  _goMicro(depth) {
    document.getElementById('exp-macro-view').style.display = 'none';
    document.getElementById('exp-micro-view').style.display = 'flex';
    document.getElementById('exp-title').textContent         = depth.name;
    document.getElementById('btn-exp-back').style.visibility = 'visible';
    document.getElementById('exp-panel-content').style.display     = 'none';
    document.getElementById('exp-panel-placeholder').style.display = '';
    this._activeZone = null;
    const btn = document.getElementById('btn-start-expedition');
    if (btn) btn.disabled = true;
  }

  // ── Score display ─────────────────────────────────────────────────────────────

  _updateScoreDisplays() {
    const score = this._state.globalScore || 0;
    const gv = document.getElementById('exp-global-score-val');
    const mv = document.getElementById('exp-micro-score-val');
    if (gv) gv.textContent = score;
    if (mv) mv.textContent = score;
  }

  // ── View A: Macro SVG (Levels.png — 1536 × 2752) ─────────────────────────────

  _buildMacroSVG() {
    const svg = document.getElementById('exp-macro-svg');
    const IW = 1536, IH = 2752;

    const completedRects = MACRO_DEPTHS
      .filter(d => d.status === 'completed')
      .map(d => `<rect x="0" y="${d.y}" width="${IW}" height="${d.h}"/>`)
      .join('') || '<rect x="0" y="0" width="0" height="0"/>';

    svg.innerHTML = `<defs>
      <filter id="mg-gray" color-interpolation-filters="sRGB">
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <filter id="mg-glow" x="-8%" y="-8%" width="116%" height="116%">
        <feGaussianBlur stdDeviation="10" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <clipPath id="mg-color-clip">${completedRects}</clipPath>
    </defs>`;

    svg.appendChild(svgEl('image', {
      href: 'ASSETS/LEVEL_MAPS/Levels.png',
      x: 0, y: 0, width: IW, height: IH, filter: 'url(#mg-gray)',
    }));
    const colorImg = svgEl('image', {
      href: 'ASSETS/LEVEL_MAPS/Levels.png',
      x: 0, y: 0, width: IW, height: IH,
    });
    colorImg.setAttribute('clip-path', 'url(#mg-color-clip)');
    svg.appendChild(colorImg);

    for (const depth of MACRO_DEPTHS) {
      const g = document.createElementNS(SVG_NS, 'g');

      if (depth.y > 0) {
        g.appendChild(svgEl('line', {
          x1: 0, x2: IW, y1: depth.y, y2: depth.y,
          stroke: 'rgba(74,158,255,0.25)', 'stroke-width': 2,
        }));
      }
      if (depth.status === 'locked') {
        g.appendChild(svgEl('rect', {
          x: 0, y: depth.y, width: IW, height: depth.h, fill: 'rgba(0,0,0,0.80)',
        }));
      }

      const labelColor = depth.status === 'locked'    ? 'rgba(50,70,90,0.65)'
                       : depth.status === 'available' ? 'rgba(74,158,255,0.88)'
                       : 'rgba(0,255,136,0.88)';
      const labelY = depth.y + depth.h / 2 + (depth.status === 'locked' ? -22 : 0);
      const nameLabel = svgEl('text', {
        x: IW / 2, y: labelY,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-family': 'Courier New, monospace',
        'font-size': 44, 'font-weight': 'bold', 'letter-spacing': 4,
        fill: labelColor,
      });
      nameLabel.textContent = depth.name.toUpperCase();
      g.appendChild(nameLabel);

      if (depth.status === 'locked') {
        const sub = svgEl('text', {
          x: IW / 2, y: depth.y + depth.h / 2 + 36,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
          'font-family': 'Courier New, monospace', 'font-size': 30,
          fill: 'rgba(50,70,90,0.55)',
        });
        sub.textContent = '— LOCKED —';
        g.appendChild(sub);
      } else if (depth.status === 'available') {
        const sub = svgEl('text', {
          x: IW / 2, y: depth.y + depth.h / 2 + 50,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
          'font-family': 'Courier New, monospace', 'font-size': 26,
          fill: 'rgba(74,158,255,0.55)',
        });
        sub.textContent = 'CLICK TO EXPLORE →';
        g.appendChild(sub);
      }

      const glowStroke = depth.status === 'completed' ? '#00ff88' : '#4a9eff';
      const hl = svgEl('rect', {
        x: 3, y: depth.y + 3, width: IW - 6, height: depth.h - 6,
        fill: 'none', rx: 3, stroke: glowStroke, 'stroke-width': 4,
        filter: 'url(#mg-glow)',
      });
      hl.style.opacity = '0'; hl.style.transition = 'opacity 0.18s';
      hl.style.pointerEvents = 'none';
      g.appendChild(hl);

      if (depth.status !== 'locked') {
        const hit = svgEl('rect', {
          x: 0, y: depth.y, width: IW, height: depth.h, fill: 'rgba(0,0,0,0)',
        });
        hit.setAttribute('pointer-events', 'all');
        hit.setAttribute('tabindex', '0');
        hit.style.cursor = 'pointer';

        hit.addEventListener('mouseenter', () => { hl.style.opacity = '1'; this._showLore(depth); });
        hit.addEventListener('mouseleave', () => { hl.style.opacity = '0'; this._hideLore(); });
        hit.addEventListener('focus',      () => { hl.style.opacity = '1'; this._showLore(depth); });
        hit.addEventListener('blur',       () => { hl.style.opacity = '0'; this._hideLore(); });
        hit.addEventListener('click', () => { if (depth.microMap) this._goMicro(depth); });
        hit.addEventListener('keydown', e => {
          if ((e.key === 'Enter' || e.key === ' ') && depth.microMap) {
            e.preventDefault(); this._goMicro(depth);
          }
        });
        g.appendChild(hit);
      }
      svg.appendChild(g);
    }
  }

  _showLore(depth) {
    const panel = document.getElementById('exp-lore-panel');
    if (!panel) return;
    panel.innerHTML = `<div class="exp-lore-title">${depth.name}</div>
      <div>${depth.lore}</div>
      ${depth.status !== 'locked' ? '<div class="exp-lore-hint">↵ Click to enter</div>' : ''}`;
    panel.style.opacity = '1';
  }

  _hideLore() {
    const panel = document.getElementById('exp-lore-panel');
    if (panel) panel.style.opacity = '0';
  }

  // ── View B: Micro SVG ─────────────────────────────────────────────────────────

  _buildMicroSVG() {
    const svg = document.getElementById('exp-micro-svg');
    if (!svg) return;
    const IW = 2816, IH = 1536;

    const revealedZones  = EXPEDITION_ZONES.filter(z => z.status === 'completed' || z.status === 'aborted');
    const completedZones = EXPEDITION_ZONES.filter(z => z.status === 'completed');

    // Per-zone torn-paper displacement filters (unique seed per zone)
    const tornFilters = EXPEDITION_ZONES.map((z, i) =>
      `<filter id="torn-${z.id}" x="-8%" y="-8%" width="116%" height="116%">
         <feTurbulence type="fractalNoise" baseFrequency="0.038 0.028"
                       numOctaves="4" seed="${(i + 1) * 7}" result="noise"/>
         <feDisplacementMap in="SourceGraphic" in2="noise" scale="26"
                            xChannelSelector="R" yChannelSelector="G"/>
       </filter>`
    ).join('');

    // Map-hole mask: white everywhere → black torn holes where zones are revealed
    const mapHoleRects = revealedZones.map(z => {
      const r = ZONE_RECTS[z.id]; if (!r) return '';
      return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"
                    fill="black" filter="url(#torn-${z.id})"/>`;
    }).join('');

    // Color-reveal mask: black everywhere → white torn windows for completed zones
    const colorRevealRects = completedZones.map(z => {
      const r = ZONE_RECTS[z.id]; if (!r) return '';
      return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"
                    fill="white" filter="url(#torn-${z.id})"/>`;
    }).join('');

    svg.innerHTML = `<defs>
      ${tornFilters}
      <filter id="mm-gray" color-interpolation-filters="sRGB">
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <filter id="mm-glow-avail" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="7" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="mm-glow-done" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="7" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="mm-glow-abort" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="7" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <mask id="map-hole-mask" maskContentUnits="userSpaceOnUse">
        <rect x="0" y="0" width="${IW}" height="${IH}" fill="white"/>
        ${mapHoleRects || ''}
      </mask>
      <mask id="color-reveal-mask" maskContentUnits="userSpaceOnUse">
        <rect x="0" y="0" width="${IW}" height="${IH}" fill="black"/>
        ${colorRevealRects || ''}
      </mask>
    </defs>`;

    // ── Layer 1: Grayscale photo (base — visible for aborted zones) ──────────
    svg.appendChild(svgEl('image', {
      href: 'ASSETS/LEVEL_MAPS/Level01.png',
      x: 0, y: 0, width: IW, height: IH,
      filter: 'url(#mm-gray)',
    }));

    // ── Layer 2: Full-color photo (masked to completed zones only) ───────────
    if (completedZones.length > 0) {
      const colorImg = svgEl('image', {
        href: 'ASSETS/LEVEL_MAPS/Level01.png',
        x: 0, y: 0, width: IW, height: IH,
      });
      colorImg.setAttribute('mask', 'url(#color-reveal-mask)');
      svg.appendChild(colorImg);
    }

    // ── Layer 3: Schematic map overlay (torn holes for revealed zones) ────────
    const mapImg = svgEl('image', {
      href: 'ASSETS/LEVEL_MAPS/Level01_map.png',
      x: 0, y: 0, width: IW, height: IH,
    });
    if (revealedZones.length > 0) mapImg.setAttribute('mask', 'url(#map-hole-mask)');
    svg.appendChild(mapImg);

    // ── Layers 4–6: Overlays, highlights, hit areas ────────────────────────
    for (const zone of EXPEDITION_ZONES) {
      const r = ZONE_RECTS[zone.id];
      if (!r) continue;
      const g  = document.createElementNS(SVG_NS, 'g');
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;

      if (zone.status === 'locked') {
        // Dark overlay on top of the map layer
        g.appendChild(svgEl('rect', {
          x: r.x, y: r.y, width: r.w, height: r.h, fill: 'rgba(0,0,0,0.82)',
        }));
        const dash = svgEl('text', {
          x: cx, y: cy,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
          'font-family': 'Courier New, monospace', 'font-size': 28,
          fill: 'rgba(60,85,105,0.60)',
        });
        dash.textContent = '—';
        g.appendChild(dash);
      } else {
        const isComp  = zone.status === 'completed';
        const isAbort = zone.status === 'aborted';
        const glowCol  = isComp ? '#00ff88' : isAbort ? '#ff8844' : '#ffd23f';
        const glowFilt = isComp ? 'url(#mm-glow-done)'
                       : isAbort ? 'url(#mm-glow-abort)' : 'url(#mm-glow-avail)';

        // Hover glow border (rectangular, sits on top)
        const hl = svgEl('rect', {
          x: r.x, y: r.y, width: r.w, height: r.h,
          fill: 'none', stroke: glowCol, 'stroke-width': 7,
          filter: glowFilt,
        });
        hl.style.opacity = '0'; hl.style.transition = 'opacity 0.18s';
        hl.style.pointerEvents = 'none';
        g.appendChild(hl);

        // Zone name (fades in on hover)
        const words = zone.name.split(' ');
        const mid   = Math.ceil(words.length / 2);
        const nameText = svgEl('text', {
          x: cx, y: cy,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
          'font-family': 'Courier New, monospace',
          'font-size': 22, 'font-weight': 'bold',
          fill: 'rgba(0,0,0,0)',
        });
        nameText.style.transition    = 'fill 0.18s';
        nameText.style.pointerEvents = 'none';
        if (words.length > 2) {
          const ts1 = document.createElementNS(SVG_NS, 'tspan');
          ts1.setAttribute('x', String(cx)); ts1.setAttribute('dy', '-13');
          ts1.textContent = words.slice(0, mid).join(' ');
          const ts2 = document.createElementNS(SVG_NS, 'tspan');
          ts2.setAttribute('x', String(cx)); ts2.setAttribute('dy', '28');
          ts2.textContent = words.slice(mid).join(' ');
          nameText.appendChild(ts1); nameText.appendChild(ts2);
        } else {
          nameText.textContent = zone.name;
        }
        g.appendChild(nameText);

        // Transparent hit area
        const hit = svgEl('rect', {
          x: r.x, y: r.y, width: r.w, height: r.h, fill: 'rgba(0,0,0,0)',
        });
        hit.setAttribute('pointer-events', 'all');
        hit.setAttribute('tabindex', '0');
        hit.style.cursor = 'pointer';

        const nameColor = isComp  ? 'rgba(0,255,136,0.95)'
                        : isAbort ? 'rgba(255,136,68,0.95)'
                        : 'rgba(255,210,63,0.95)';

        hit.addEventListener('mouseenter', () => {
          hl.style.opacity = '1';
          nameText.setAttribute('fill', nameColor);
          this._updateExpPanel(zone, false);
        });
        hit.addEventListener('mouseleave', () => {
          hl.style.opacity = '0';
          nameText.setAttribute('fill', 'rgba(0,0,0,0)');
          if (this._activeZone) this._updateExpPanel(this._activeZone, true);
          else {
            document.getElementById('exp-panel-content').style.display     = 'none';
            document.getElementById('exp-panel-placeholder').style.display = '';
          }
        });
        hit.addEventListener('focus',  () => { hl.style.opacity = '1'; this._updateExpPanel(zone, false); });
        hit.addEventListener('blur',   () => { hl.style.opacity = '0'; });
        hit.addEventListener('click',  () => { this._activeZone = zone; this._updateExpPanel(zone, true); });
        hit.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); this._activeZone = zone; this._updateExpPanel(zone, true);
          }
        });
        g.appendChild(hit);
      }
      svg.appendChild(g);
    }
  }

  /** Rebuild micro SVG in place (called after state changes). */
  _rebuildMicroSVG() {
    this._activeZone = null;
    this._buildMicroSVG();
    // Reset panel to placeholder
    const content = document.getElementById('exp-panel-content');
    const ph      = document.getElementById('exp-panel-placeholder');
    if (content) content.style.display = 'none';
    if (ph)      ph.style.display      = '';
    const btn = document.getElementById('btn-start-expedition');
    if (btn) btn.disabled = true;
  }

  // ── Expedition info panel ─────────────────────────────────────────────────────

  _updateExpPanel(zone, activate) {
    document.getElementById('exp-panel-placeholder').style.display = 'none';
    document.getElementById('exp-panel-content').style.display     = 'flex';

    document.getElementById('exp-zone-name').textContent        = zone.name;
    document.getElementById('exp-mazecount-val').textContent    = zone.mazeCount;
    document.getElementById('exp-startradius-val').textContent  = zone.startRadius;
    document.getElementById('exp-aggradii-val').textContent     = zone.aggregateRadii;
    document.getElementById('exp-difficulty-val').textContent   = zone.difficultyScore;
    document.getElementById('exp-artifact-val').textContent     = zone.expectedArtifact;

    // Status badge (aborted / completed)
    const statusEl = document.getElementById('exp-zone-status');
    if (statusEl) {
      statusEl.className = '';
      if (zone.status === 'aborted') {
        statusEl.style.display = '';
        statusEl.classList.add('status-aborted');
        statusEl.textContent = '⚠ Previously aborted — retry available';
      } else if (zone.status === 'completed') {
        statusEl.style.display = '';
        statusEl.classList.add('status-completed');
        statusEl.textContent = '✓ Completed — replay available';
      } else {
        statusEl.style.display = 'none';
      }
    }

    const btn      = document.getElementById('btn-start-expedition');
    // Aborted zones are retryable, just like available and completed
    const canStart = activate &&
      (zone.status === 'available' || zone.status === 'completed' || zone.status === 'aborted');
    btn.disabled      = !canStart;
    btn.style.opacity = canStart ? '1' : '0.38';
    if (activate) this._activeZone = zone;
  }

  // ── Utility ───────────────────────────────────────────────────────────────────

  _bbox(pointsStr) {
    const coords = pointsStr.trim().split(/\s+/).map(p => p.split(',').map(Number));
    const xs = coords.map(c => c[0]), ys = coords.map(c => c[1]);
    return {
      cx: (Math.min(...xs) + Math.max(...xs)) / 2,
      cy: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
  }
}
