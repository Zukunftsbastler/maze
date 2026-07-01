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
    microMap:    'ASSETS/LEVEL_MAPS/Level01.png',
    schematicMap:'ASSETS/LEVEL_MAPS/Level01_map.png',
    mapWidth: 2816, mapHeight: 1536,
  },
  {
    id: 'depth2', y: 550, h: 550, status: 'locked',
    name: 'Depth II — The Brackish Halls',
    lore: 'Ancient cisterns half-flooded with stagnant water the colour of rust. The locals refuse to speak of what dwells in the brackish dark. Only those who have mastered the Outer Vaults dare descend.',
    microMap:    'ASSETS/LEVEL_MAPS/Level02.png',
    schematicMap:'ASSETS/LEVEL_MAPS/Level02_map.png',
    mapWidth: 2752, mapHeight: 1536,
  },
  {
    id: 'depth3', y: 1100, h: 550, status: 'locked',
    name: 'Depth III — The Amber Warrens',
    lore: 'Tunnels coated in resinous amber — the hardened breath of some ancient creature. Fossils of unknown forms are embedded in the walls. Time moves differently here.',
    microMap:    'ASSETS/LEVEL_MAPS/Level03.png',
    schematicMap:'ASSETS/LEVEL_MAPS/Level03_map copy.png',
    mapWidth: 2816, mapHeight: 1536,
  },
  {
    id: 'depth4', y: 1650, h: 550, status: 'locked',
    name: 'Depth IV — The Smoldering Deep',
    lore: 'The rock itself radiates heat. Veins of molten material pulse through cracks in the stone. Whatever lies at the centre of this place has been burning for a very long time.',
    microMap:    'ASSETS/LEVEL_MAPS/Level04.png',
    schematicMap:'ASSETS/LEVEL_MAPS/Level04_map.png',
    mapWidth: 2816, mapHeight: 1536,
  },
  {
    id: 'depth5', y: 2200, h: 552, status: 'locked',
    name: 'Depth V — The Null Core',
    lore: 'No cartographer has returned from the lowest depth. Expedition logs stop mid-sentence. The Null Core does not appear on any official map. You are on your own.',
    microMap:    'ASSETS/LEVEL_MAPS/Level05.png',
    schematicMap:'ASSETS/LEVEL_MAPS/Level05_map.png',
    mapWidth: 2752, mapHeight: 1536,
  },
];

// ── Expedition Zone Data ───────────────────────────────────────────────────────
//
// 12 zones per depth (4 cols × 3 rows), each exactly 1/4 of image width × 1/3 of height.
// mapRect coords are in each depth's image pixel space:
//   2816-wide maps (L01,L03,L04): cols at 0,704,1408,2112; rows at 0,512,1024
//   2752-wide maps (L02,L05):     cols at 0,688,1376,2064; rows at 0,512,1024
//
// Unlock model (adjacency-based):
//   • Fresh start: only d1z01 is available.
//   • Completing or aborting zone Z unlocks all 4-directionally adjacent locked zones
//     within the same depth (the map is always fully visible; only selection is gated).
//   • First completion in depth N unlocks d{N+1}z01 (entry to next depth).

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

const EXPEDITION_ZONES = [

  // ── Depth I — The Outer Vaults  (Level01.png 2816×1536) ──────────────────────
  // Guild storage, collapsed merchant quarter, brackish underbelly.
  // Each zone: 704 × 512 px.

  // Row 1 — Upper tier: fortified towers and archway gates
  {
    id: 'd1z01', status: 'locked', depthId: 'depth1',
    name: "The Gatewarden's Narthex",
    factionTheme: 'origin:custodian',
    mapRect: { x: 0, y: 0, w: 704, h: 512 },
    mazeCount: 1, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A carved obsidian eye — the pupil follows sources of light.',
  },
  {
    id: 'd1z02', status: 'locked', depthId: 'depth1',
    name: 'The Corbelled Stacks',
    factionTheme: 'origin:archive',
    mapRect: { x: 704, y: 0, w: 704, h: 512 },
    mazeCount: 2, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: "A water-damaged ledger — one page is written in tomorrow's date.",
  },
  {
    id: 'd1z03', status: 'locked', depthId: 'depth1',
    name: 'The Fallen Rampart',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 1408, y: 0, w: 704, h: 512 },
    mazeCount: 1, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A vial of glowing green fluid — it moves as if alive.',
  },
  {
    id: 'd1z04', status: 'locked', depthId: 'depth1',
    name: 'The Sentinel Keep',
    factionTheme: 'origin:custodian',
    mapRect: { x: 2112, y: 0, w: 704, h: 512 },
    mazeCount: 2, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: "A sentinel's bronze badge — the inscription changes each time you read it.",
  },

  // Row 2 — Middle tier: inner chambers and trade halls
  {
    id: 'd1z05', status: 'locked', depthId: 'depth1',
    name: 'The Stone Anteroom',
    factionTheme: 'origin:archive',
    mapRect: { x: 0, y: 512, w: 704, h: 512 },
    mazeCount: 2, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A stone key that fits no known lock — but every lock leans towards it.',
  },
  {
    id: 'd1z06', status: 'locked', depthId: 'depth1',
    name: 'The Sunken Hall',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 704, y: 512, w: 704, h: 512 },
    mazeCount: 2, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A shard of black mirror that shows the room as it was a century ago.',
  },
  {
    id: 'd1z07', status: 'locked', depthId: 'depth1',
    name: 'The Passage Ward',
    factionTheme: 'origin:archive',
    mapRect: { x: 1408, y: 512, w: 704, h: 512 },
    mazeCount: 3, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A roll of parchment sealed with wax — the seal re-forms each time you break it.',
  },
  {
    id: 'd1z08', status: 'locked', depthId: 'depth1',
    name: 'The Eastern Gallery',
    factionTheme: 'origin:custodian',
    mapRect: { x: 2112, y: 512, w: 704, h: 512 },
    mazeCount: 2, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A copper bell with no clapper — yet it rings in silence.',
  },

  // Row 3 — Lower tier: drainage tunnels and undercroft
  {
    id: 'd1z09', status: 'locked', depthId: 'depth1',
    name: "The Cooper's Cellar",
    factionTheme: 'origin:blackwater',
    mapRect: { x: 0, y: 1024, w: 704, h: 512 },
    mazeCount: 3, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A barrel stave wrapped in binding runes — the runes slowly crawl.',
  },
  {
    id: 'd1z10', status: 'locked', depthId: 'depth1',
    name: "The Merchant's Drain",
    factionTheme: 'origin:blackwater',
    mapRect: { x: 704, y: 1024, w: 704, h: 512 },
    mazeCount: 2, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: "A merchant's coin with the same face on both sides.",
  },
  {
    id: 'd1z11', status: 'locked', depthId: 'depth1',
    name: 'The Seeping Conduit',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 1408, y: 1024, w: 704, h: 512 },
    mazeCount: 3, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'A vial of sewer water — perfectly clear and perfectly still.',
  },
  {
    id: 'd1z12', status: 'locked', depthId: 'depth1',
    name: 'The Irongate Keep',
    factionTheme: 'origin:custodian',
    mapRect: { x: 2112, y: 1024, w: 704, h: 512 },
    mazeCount: 3, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 4, sightRange: 4,
    expectedArtifact: 'An iron portcullis key — impossibly heavy for its size.',
  },

  // ── Depth II — The Brackish Halls  (Level02.png 2752×1536) ───────────────────
  // Hexagonal cisterns, crystal veins, magma pools and iron wards.
  // Each zone: 688 × 512 px.

  // Row 1 — Upper tier: green glow, hex structures, iron towers
  {
    id: 'd2z01', status: 'locked', depthId: 'depth2',
    name: 'The Flotsam Entry',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 0, y: 0, w: 688, h: 512 },
    mazeCount: 2, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'A lump of luminous slime — it pulses faintly when spoken to.',
  },
  {
    id: 'd2z02', status: 'locked', depthId: 'depth2',
    name: 'The Algal Vault',
    factionTheme: 'origin:archive',
    mapRect: { x: 688, y: 0, w: 688, h: 512 },
    mazeCount: 3, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'A preserved fungal bloom — its spores spell a warning in the air.',
  },
  {
    id: 'd2z03', status: 'locked', depthId: 'depth2',
    name: 'The Cracked Cistern',
    factionTheme: 'origin:custodian',
    mapRect: { x: 1376, y: 0, w: 688, h: 512 },
    mazeCount: 2, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 2, sightRange: 4,
    expectedArtifact: "A cistern tile etched with a map of somewhere that doesn't exist.",
  },
  {
    id: 'd2z04', status: 'locked', depthId: 'depth2',
    name: 'The Veil Gate',
    factionTheme: 'origin:custodian',
    mapRect: { x: 2064, y: 0, w: 688, h: 512 },
    mazeCount: 3, startRadius: 3,
    mapPreviewTime: 2, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'A velvet-wrapped iron disc — it always falls edge-up.',
  },

  // Row 2 — Middle tier: crystal formations and brackish channels
  {
    id: 'd2z05', status: 'locked', depthId: 'depth2',
    name: 'The Slick Causeway',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 0, y: 512, w: 688, h: 512 },
    mazeCount: 3, startRadius: 3,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'A bridge stone worn perfectly smooth by unseen feet.',
  },
  {
    id: 'd2z06', status: 'locked', depthId: 'depth2',
    name: 'The Crystal Antechamber',
    factionTheme: 'origin:archive',
    mapRect: { x: 688, y: 512, w: 688, h: 512 },
    mazeCount: 3, startRadius: 3,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'A blue crystal shard that hums when near heat.',
  },
  {
    id: 'd2z07', status: 'locked', depthId: 'depth2',
    name: 'The Crystal Vein',
    factionTheme: 'origin:archive',
    mapRect: { x: 1376, y: 512, w: 688, h: 512 },
    mazeCount: 4, startRadius: 3,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'A hexagonal crystal that shows a tiny landscape inside — clouds move.',
  },
  {
    id: 'd2z08', status: 'locked', depthId: 'depth2',
    name: 'The Brackish Hollow',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 2064, y: 512, w: 688, h: 512 },
    mazeCount: 3, startRadius: 3,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'A hollow nautical compass — the needle spins and never settles.',
  },

  // Row 3 — Lower tier: magma pools and iron grating
  {
    id: 'd2z09', status: 'locked', depthId: 'depth2',
    name: 'The Algae Court',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 0, y: 1024, w: 688, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'A mass of writhing algae preserved in glass — it has not died.',
  },
  {
    id: 'd2z10', status: 'locked', depthId: 'depth2',
    name: 'The Glowing Sump',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 688, y: 1024, w: 688, h: 512 },
    mazeCount: 3, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'A small lava stone that glows faintly — cool to the touch.',
  },
  {
    id: 'd2z11', status: 'locked', depthId: 'depth2',
    name: 'The Sunken Ward',
    factionTheme: 'origin:custodian',
    mapRect: { x: 1376, y: 1024, w: 688, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 4,
    expectedArtifact: "A warden's ledger soaked in brine — entries in a cipher no one recognises.",
  },
  {
    id: 'd2z12', status: 'locked', depthId: 'depth2',
    name: 'The Iron Grate',
    factionTheme: 'origin:custodian',
    mapRect: { x: 2064, y: 1024, w: 688, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 4,
    expectedArtifact: 'An iron grating bolt — it opens locks by being held near them.',
  },

  // ── Depth III — The Amber Warrens  (Level03.png 2816×1536) ───────────────────
  // Crystal-lit perimeter chambers, central blue array, lava seams below.
  // Each zone: 704 × 512 px.

  // Row 1 — Upper chambers: crystal formations and archways
  {
    id: 'd3z01', status: 'locked', depthId: 'depth3',
    name: 'The Crystal Gallery',
    factionTheme: 'origin:archive',
    mapRect: { x: 0, y: 0, w: 704, h: 512 },
    mazeCount: 3, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A prism that splits light into colours that have no name.',
  },
  {
    id: 'd3z02', status: 'locked', depthId: 'depth3',
    name: 'The Gemstone Atrium',
    factionTheme: 'origin:archive',
    mapRect: { x: 704, y: 0, w: 704, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A faceted gem that grows a tiny new face each time it is examined.',
  },
  {
    id: 'd3z03', status: 'locked', depthId: 'depth3',
    name: 'The Stone Altar',
    factionTheme: 'origin:archive',
    mapRect: { x: 1408, y: 0, w: 704, h: 512 },
    mazeCount: 3, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A stone altar fragment carved with a sacrificial calendar — set in the future.',
  },
  {
    id: 'd3z04', status: 'locked', depthId: 'depth3',
    name: 'The Ancient Portico',
    factionTheme: 'origin:archive',
    mapRect: { x: 2112, y: 0, w: 704, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A column capital etched with a scene — the figures move when no one watches.',
  },

  // Row 2 — Middle: amber passages and central crystal array
  {
    id: 'd3z05', status: 'locked', depthId: 'depth3',
    name: 'The Resin Passage',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 0, y: 512, w: 704, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A lump of amber containing a still-living insect.',
  },
  {
    id: 'd3z06', status: 'locked', depthId: 'depth3',
    name: 'The Cavern Forum',
    factionTheme: 'origin:archive',
    mapRect: { x: 704, y: 512, w: 704, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A cathedral window fragment — the lead tracery rearranges each night.',
  },
  {
    id: 'd3z07', status: 'locked', depthId: 'depth3',
    name: 'The Amber Bridge',
    factionTheme: 'origin:archive',
    mapRect: { x: 1408, y: 512, w: 704, h: 512 },
    mazeCount: 5, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'An amber bridge tile — its reflection shows another bridge, submerged.',
  },
  {
    id: 'd3z08', status: 'locked', depthId: 'depth3',
    name: 'The Shard Corridor',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 2112, y: 512, w: 704, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A crystal shard warm as a living hand — it cools when you say its name.',
  },

  // Row 3 — Lower tier: lava seams and ember zones
  {
    id: 'd3z09', status: 'locked', depthId: 'depth3',
    name: 'The Cinder Terrace',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 0, y: 1024, w: 704, h: 512 },
    mazeCount: 5, startRadius: 4,
    mapPreviewTime: 0, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A cinder brick that never fully cools — wrapped in cloth that has not burned.',
  },
  {
    id: 'd3z10', status: 'locked', depthId: 'depth3',
    name: 'The Ember Shelf',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 704, y: 1024, w: 704, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 0, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A fossilised ember — still radiates faint heat after millennia.',
  },
  {
    id: 'd3z11', status: 'locked', depthId: 'depth3',
    name: 'The Lava Seam',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 1408, y: 1024, w: 704, h: 512 },
    mazeCount: 5, startRadius: 4,
    mapPreviewTime: 0, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A glass rod fused with volcanic glass — it vibrates near magma.',
  },
  {
    id: 'd3z12', status: 'locked', depthId: 'depth3',
    name: 'The Magma Vent',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 2112, y: 1024, w: 704, h: 512 },
    mazeCount: 5, startRadius: 4,
    mapPreviewTime: 0, generosityFactor: 2, sightRange: 3,
    expectedArtifact: 'A sealed ceramic vessel — something moves inside; it was sealed shut.',
  },

  // ── Depth IV — The Smoldering Deep  (Level04.png 2816×1536) ──────────────────
  // Forge platforms above, magma flow band across centre, energy fields below.
  // Each zone: 704 × 512 px.

  // Row 1 — Upper platforms: forges and burial chambers
  {
    id: 'd4z01', status: 'locked', depthId: 'depth4',
    name: 'The Funeral Platform',
    factionTheme: 'origin:custodian',
    mapRect: { x: 0, y: 0, w: 704, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 1, sightRange: 3,
    expectedArtifact: 'A sarcophagus nameplate — the name carved on it changes with the weather.',
  },
  {
    id: 'd4z02', status: 'locked', depthId: 'depth4',
    name: 'The Ossuary Shelf',
    factionTheme: 'origin:custodian',
    mapRect: { x: 704, y: 0, w: 704, h: 512 },
    mazeCount: 5, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 1, sightRange: 3,
    expectedArtifact: 'A bone flute — playing it causes other instruments nearby to answer.',
  },
  {
    id: 'd4z03', status: 'locked', depthId: 'depth4',
    name: 'The Upper Forge',
    factionTheme: 'origin:custodian',
    mapRect: { x: 1408, y: 0, w: 704, h: 512 },
    mazeCount: 4, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 1, sightRange: 3,
    expectedArtifact: 'A forge tong welded shut around nothing — something invisible is held between them.',
  },
  {
    id: 'd4z04', status: 'locked', depthId: 'depth4',
    name: 'The Crystal Annex',
    factionTheme: 'origin:archive',
    mapRect: { x: 2112, y: 0, w: 704, h: 512 },
    mazeCount: 5, startRadius: 4,
    mapPreviewTime: 1, generosityFactor: 1, sightRange: 3,
    expectedArtifact: 'A crystal lens that shows things at the moment of their creation.',
  },

  // Row 2 — Magma flow band: perilous crossings
  {
    id: 'd4z05', status: 'locked', depthId: 'depth4',
    name: 'The Rope Crossing',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 0, y: 512, w: 704, h: 512 },
    mazeCount: 5, startRadius: 4,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'A bridge chain link — too hot to hold yet cool enough not to burn.',
  },
  {
    id: 'd4z06', status: 'locked', depthId: 'depth4',
    name: 'The Fire Bridge',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 704, y: 512, w: 704, h: 512 },
    mazeCount: 5, startRadius: 4,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'A lava-cast footprint in obsidian — the foot that made it has six toes.',
  },
  {
    id: 'd4z07', status: 'locked', depthId: 'depth4',
    name: 'The Lava Overlook',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 1408, y: 512, w: 704, h: 512 },
    mazeCount: 6, startRadius: 4,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'A smoked glass bottle — the smoke inside forms recognisable shapes.',
  },
  {
    id: 'd4z08', status: 'locked', depthId: 'depth4',
    name: 'The Heat Exchanger',
    factionTheme: 'origin:custodian',
    mapRect: { x: 2112, y: 512, w: 704, h: 512 },
    mazeCount: 5, startRadius: 4,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'A heat-sintered schematic — a blueprint for a machine with no purpose.',
  },

  // Row 3 — Lower tier: caldera rim and deep energy fields
  {
    id: 'd4z09', status: 'locked', depthId: 'depth4',
    name: 'The Caldera Rim',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 0, y: 1024, w: 704, h: 512 },
    mazeCount: 6, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: "A caldera rim stone — it vibrates at the earth's core frequency.",
  },
  {
    id: 'd4z10', status: 'locked', depthId: 'depth4',
    name: 'The Magma Lake',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 704, y: 1024, w: 704, h: 512 },
    mazeCount: 5, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'A disc of cooled lava with a perfect blue circle embedded in its centre.',
  },
  {
    id: 'd4z11', status: 'locked', depthId: 'depth4',
    name: 'The Sunken Foundry',
    factionTheme: 'origin:custodian',
    mapRect: { x: 1408, y: 1024, w: 704, h: 512 },
    mazeCount: 6, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'A foundry stamp that marks materials with symbols no one designed.',
  },
  {
    id: 'd4z12', status: 'locked', depthId: 'depth4',
    name: 'The Crystal Chasm',
    factionTheme: 'origin:archive',
    mapRect: { x: 2112, y: 1024, w: 704, h: 512 },
    mazeCount: 6, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'A crystal from the deepest chasm — it sings a note too low to hear.',
  },

  // ── Depth V — The Null Core  (Level05.png 2752×1536) ─────────────────────────
  // The Infernal Library: scorched reading halls above, lava void at the heart.
  // Each zone: 688 × 512 px.

  // Row 1 — Upper tier: ancient reading rooms
  {
    id: 'd5z01', status: 'locked', depthId: 'depth5',
    name: 'The Reading Alcoves',
    factionTheme: 'origin:archive',
    mapRect: { x: 0, y: 0, w: 688, h: 512 },
    mazeCount: 5, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'A reading stand whose surface holds the ghost of every book ever placed on it.',
  },
  {
    id: 'd5z02', status: 'locked', depthId: 'depth5',
    name: 'The Manuscript Hall',
    factionTheme: 'origin:archive',
    mapRect: { x: 688, y: 0, w: 688, h: 512 },
    mazeCount: 6, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'A manuscript page that is always the same page regardless of which one you pull.',
  },
  {
    id: 'd5z03', status: 'locked', depthId: 'depth5',
    name: 'The Burning Index',
    factionTheme: 'origin:archive',
    mapRect: { x: 1376, y: 0, w: 688, h: 512 },
    mazeCount: 5, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: 'An index card that shows entries no catalogue should contain.',
  },
  {
    id: 'd5z04', status: 'locked', depthId: 'depth5',
    name: "The Archivist's Last Stand",
    factionTheme: 'origin:archive',
    mapRect: { x: 2064, y: 0, w: 688, h: 512 },
    mazeCount: 6, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 2,
    expectedArtifact: "A librarian's spectacles — through them, all text is legible regardless of language.",
  },

  // Row 2 — Middle tier: scorched stacks and lava threshold
  {
    id: 'd5z05', status: 'locked', depthId: 'depth5',
    name: 'The Scorched Stacks',
    factionTheme: 'origin:archive',
    mapRect: { x: 0, y: 512, w: 688, h: 512 },
    mazeCount: 6, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 1,
    expectedArtifact: 'A scorched book whose pages regenerate — the new text is not the original.',
  },
  {
    id: 'd5z06', status: 'locked', depthId: 'depth5',
    name: 'The Lava Threshold',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 688, y: 512, w: 688, h: 512 },
    mazeCount: 6, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 1,
    expectedArtifact: 'A lava-glass threshold stone — whoever crosses it backwards is seen in reverse.',
  },
  {
    id: 'd5z07', status: 'locked', depthId: 'depth5',
    name: 'The Null Chamber',
    factionTheme: 'origin:archive',
    mapRect: { x: 1376, y: 512, w: 688, h: 512 },
    mazeCount: 7, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 1,
    expectedArtifact: 'A perfectly spherical void — it absorbs light and emits no sound.',
  },
  {
    id: 'd5z08', status: 'locked', depthId: 'depth5',
    name: 'The Fallen Codex',
    factionTheme: 'origin:archive',
    mapRect: { x: 2064, y: 512, w: 688, h: 512 },
    mazeCount: 6, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 1,
    expectedArtifact: 'A codex with exactly one page — it records everything you have done.',
  },

  // Row 3 — Lower tier: lava shore and null terminus
  {
    id: 'd5z09', status: 'locked', depthId: 'depth5',
    name: 'The Drowned Folio',
    factionTheme: 'origin:archive',
    mapRect: { x: 0, y: 1024, w: 688, h: 512 },
    mazeCount: 7, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 1,
    expectedArtifact: 'A folio submerged in brine for centuries — the ink is brighter than when written.',
  },
  {
    id: 'd5z10', status: 'locked', depthId: 'depth5',
    name: 'The Lava Shore',
    factionTheme: 'origin:blackwater',
    mapRect: { x: 688, y: 1024, w: 688, h: 512 },
    mazeCount: 6, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 1,
    expectedArtifact: 'A lava shore pebble — on each of its facets, a perfect miniature landscape.',
  },
  {
    id: 'd5z11', status: 'locked', depthId: 'depth5',
    name: 'The Null Core',
    factionTheme: 'origin:archive',
    mapRect: { x: 1376, y: 1024, w: 688, h: 512 },
    mazeCount: 7, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 1,
    expectedArtifact: 'A null core sliver — it hovers an inch above any surface, untouchable.',
  },
  {
    id: 'd5z12', status: 'locked', depthId: 'depth5',
    name: 'The Void Terminus',
    factionTheme: 'origin:archive',
    mapRect: { x: 2064, y: 1024, w: 688, h: 512 },
    mazeCount: 7, startRadius: 5,
    mapPreviewTime: 0, generosityFactor: 1, sightRange: 1,
    expectedArtifact: 'A void terminus marker — a rod that points toward wherever the labyrinth ends.',
  },
];

// Attach computed fields
for (const z of EXPEDITION_ZONES) {
  z.aggregateRadii  = _aggregateRadii(z.startRadius, z.mazeCount);
  z.difficultyScore = _difficultyScore(z);
}

// ── Zone adjacency (4×3 grid within each depth) ───────────────────────────────
// Zone IDs: d{depth}z{01-12}  →  cols 0-3, rows 0-2
// Two zones are adjacent if they share an edge (no diagonals).

function _zoneNeighborIds(zoneId) {
  const m = zoneId.match(/^(d\d)z(\d+)$/);
  if (!m) return [];
  const prefix = m[1];                        // 'd1'
  const n      = parseInt(m[2], 10);          // 1-12
  const col    = (n - 1) % 4;                 // 0-3
  const row    = Math.floor((n - 1) / 4);     // 0-2
  const ids = [];
  if (col > 0) ids.push(`${prefix}z${String(n - 1).padStart(2, '0')}`); // left
  if (col < 3) ids.push(`${prefix}z${String(n + 1).padStart(2, '0')}`); // right
  if (row > 0) ids.push(`${prefix}z${String(n - 4).padStart(2, '0')}`); // up
  if (row < 2) ids.push(`${prefix}z${String(n + 4).padStart(2, '0')}`); // down
  return ids;
}

// ── ExpeditionMaps ─────────────────────────────────────────────────────────────

class ExpeditionMaps {
  constructor() {
    this._onStart      = null;
    this._activeZone   = null;
    this._currentDepth = null;   // depth selected in micro view
    this._overlay      = null;
    this._state        = this._loadState();
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

    // Mark zone completed (re-play allowed; completed stays accessible)
    zone.status = 'completed';
    if (!this._state.completedIds.includes(zoneId)) {
      this._state.completedIds.push(zoneId);
    }
    this._state.availableIds = (this._state.availableIds || []).filter(id => id !== zoneId);

    // Unlock 4-adjacent locked zones within the same depth
    this._unlockAdjacentZones(zoneId);

    // On first completion within this depth → unlock entry zone (z01) of next depth
    const depthIdx = MACRO_DEPTHS.findIndex(d => d.id === zone.depthId);
    if (depthIdx !== -1 && depthIdx + 1 < MACRO_DEPTHS.length) {
      const nextDepth      = MACRO_DEPTHS[depthIdx + 1];
      const nextDepthZones = EXPEDITION_ZONES.filter(z => z.depthId === nextDepth.id);
      if (nextDepthZones.every(z => z.status === 'locked')) {
        const entryId   = `d${depthIdx + 2}z01`;
        const entryZone = EXPEDITION_ZONES.find(z => z.id === entryId);
        if (entryZone) {
          entryZone.status = 'available';
          if (!this._state.availableIds.includes(entryId)) {
            this._state.availableIds.push(entryId);
          }
        }
      }
    }

    this._state.globalScore = (this._state.globalScore || 0) + expeditionScore;
    this._saveState();
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

    if (zone.status !== 'completed') {
      zone.status = 'aborted';
      if (!this._state.abortedIds) this._state.abortedIds = [];
      if (!this._state.abortedIds.includes(zoneId)) {
        this._state.abortedIds.push(zoneId);
      }
      this._state.availableIds = (this._state.availableIds || []).filter(id => id !== zoneId);
    }

    // Unlock 4-adjacent locked zones even on abort (area was explored)
    this._unlockAdjacentZones(zoneId);

    this._state.globalScore = (this._state.globalScore || 0) + penaltyScore;
    this._saveState();
    this._rebuildMicroSVG();
    this._updateScoreDisplays();
  }

  // ── State persistence ─────────────────────────────────────────────────────────

  static STATE_KEY     = 'hexmaze_expedition_state';
  static STATE_VERSION = '6'; // adjacency unlock; fresh state starts with only d1z01

  _loadState() {
    try {
      const raw = localStorage.getItem(ExpeditionMaps.STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version === ExpeditionMaps.STATE_VERSION) return parsed;
      }
    } catch (_) {}
    // Fresh state: only the entry zone of Depth I is available
    return {
      version:      ExpeditionMaps.STATE_VERSION,
      completedIds: [],
      abortedIds:   [],
      availableIds: ['d1z01'],
      globalScore:  0,
    };
  }

  _saveState() {
    try {
      this._state.version = ExpeditionMaps.STATE_VERSION;
      localStorage.setItem(ExpeditionMaps.STATE_KEY, JSON.stringify(this._state));
    } catch (_) {}
  }

  /** Mark all 4-adjacent locked zones as available and persist the change. */
  _unlockAdjacentZones(zoneId) {
    for (const nid of _zoneNeighborIds(zoneId)) {
      const nz = EXPEDITION_ZONES.find(z => z.id === nid);
      if (nz && nz.status === 'locked') {
        nz.status = 'available';
        if (!this._state.availableIds.includes(nid)) {
          this._state.availableIds.push(nid);
        }
      }
    }
  }

  /** Apply loaded state onto EXPEDITION_ZONES and derive MACRO_DEPTHS statuses. */
  _applyState() {
    const { completedIds = [], abortedIds = [], availableIds = [] } = this._state;
    for (const z of EXPEDITION_ZONES) {
      if (completedIds.includes(z.id)) { z.status = 'completed'; continue; }
      if (abortedIds.includes(z.id))   { z.status = 'aborted';   continue; }
      if (availableIds.includes(z.id)) { z.status = 'available'; continue; }
      z.status = 'locked';
    }
    // Derive MACRO_DEPTHS statuses from their zones
    for (const depth of MACRO_DEPTHS) {
      const zones = EXPEDITION_ZONES.filter(z => z.depthId === depth.id);
      if (zones.length > 0 && zones.every(z => z.status === 'completed')) {
        depth.status = 'completed';
      } else if (zones.some(z => z.status !== 'locked')) {
        depth.status = 'available';
      } else {
        depth.status = 'locked';
      }
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
                 preserveAspectRatio="xMidYMid meet"
                 style="max-width:100%;max-height:100%;display:block"></svg>
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
    // Micro SVG is built lazily when the user selects a depth (_goMicro)
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
    this._currentDepth = depth;
    this._activeZone   = null;

    document.getElementById('exp-macro-view').style.display = 'none';
    document.getElementById('exp-micro-view').style.display = 'flex';
    document.getElementById('exp-title').textContent         = depth.name;
    document.getElementById('btn-exp-back').style.visibility = 'visible';
    document.getElementById('exp-panel-content').style.display     = 'none';
    document.getElementById('exp-panel-placeholder').style.display = '';
    const btn = document.getElementById('btn-start-expedition');
    if (btn) btn.disabled = true;

    this._buildMicroSVG(depth);
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

  _buildMicroSVG(depth) {
    const svg = document.getElementById('exp-micro-svg');
    if (!svg || !depth) return;

    const IW = depth.mapWidth  ?? 2816;
    const IH = depth.mapHeight ?? 1536;
    svg.setAttribute('viewBox', `0 0 ${IW} ${IH}`);

    // Only zones belonging to this depth
    const depthZones     = EXPEDITION_ZONES.filter(z => z.depthId === depth.id);
    const completedZones = depthZones.filter(z => z.status === 'completed');

    // Per-zone torn-paper displacement filters (used for color-reveal of completed zones)
    const tornFilters = completedZones.map((z, i) =>
      `<filter id="torn-${z.id}" x="-8%" y="-8%" width="116%" height="116%">
         <feTurbulence type="fractalNoise" baseFrequency="0.038 0.028"
                       numOctaves="4" seed="${(depthZones.indexOf(z) + 1) * 7}" result="noise"/>
         <feDisplacementMap in="SourceGraphic" in2="noise" scale="26"
                            xChannelSelector="R" yChannelSelector="G"/>
       </filter>`
    ).join('');

    // Color-reveal mask: black everywhere → white torn windows for completed zones
    const colorRevealRects = completedZones.map(z => {
      const r = z.mapRect; if (!r) return '';
      return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"
                    fill="white" filter="url(#torn-${z.id})"/>`;
    }).join('');

    // Schematic mask: white everywhere → black for completed zones (let color photo show through)
    const schematicHideRects = completedZones.map(z => {
      const r = z.mapRect; if (!r) return '';
      return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"
                    fill="black" filter="url(#torn-${z.id})"/>`;
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
      <mask id="color-reveal-mask" maskContentUnits="userSpaceOnUse">
        <rect x="0" y="0" width="${IW}" height="${IH}" fill="black"/>
        ${colorRevealRects || ''}
      </mask>
      <mask id="schematic-mask" maskContentUnits="userSpaceOnUse">
        <rect x="0" y="0" width="${IW}" height="${IH}" fill="white"/>
        ${schematicHideRects || ''}
      </mask>
    </defs>`;

    // ── Layer 1: Grayscale photo — full image, always visible (no blackouts) ──
    svg.appendChild(svgEl('image', {
      href: depth.microMap,
      x: 0, y: 0, width: IW, height: IH,
      filter: 'url(#mm-gray)',
    }));

    // ── Layer 2: Full-color photo (torn reveal for completed zones) ───────────
    if (completedZones.length > 0) {
      const colorImg = svgEl('image', {
        href: depth.microMap,
        x: 0, y: 0, width: IW, height: IH,
      });
      colorImg.setAttribute('mask', 'url(#color-reveal-mask)');
      svg.appendChild(colorImg);
    }

    // ── Layer 3: Schematic overlay (hides where color photo shows through) ────
    if (depth.schematicMap) {
      const mapImg = svgEl('image', {
        href: depth.schematicMap,
        x: 0, y: 0, width: IW, height: IH,
      });
      if (completedZones.length > 0) mapImg.setAttribute('mask', 'url(#schematic-mask)');
      svg.appendChild(mapImg);
    }

    // ── Layers 4–6: Overlays, highlights, hit areas ────────────────────────
    for (const zone of depthZones) {
      const r = zone.mapRect;
      if (!r) continue;
      const g  = document.createElementNS(SVG_NS, 'g');
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;

      if (zone.status === 'locked') {
        // Light dim overlay — map stays readable; dashed border shows zone boundary
        g.appendChild(svgEl('rect', {
          x: r.x, y: r.y, width: r.w, height: r.h,
          fill: 'rgba(0,0,15,0.28)',
          stroke: 'rgba(80,110,140,0.45)', 'stroke-width': 2, 'stroke-dasharray': '14 9',
        }));
        // No interaction — locked zones are visible but not selectable
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
    if (this._currentDepth) this._buildMicroSVG(this._currentDepth);
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

// ── Faction loot-slot weights ─────────────────────────────────────────────────
// Defines which equipment slots are more likely to drop for each faction theme.
// Consumed by LootManager — lives here so adding new factions only requires
// extending this object, not editing engine logic.
window.FACTION_SLOT_BIAS = {
  'origin:blackwater': { boots: 30, face: 30, hands: 20, pouch: 5,  tool: 5,  eyes: 5,  head: 5  },
  'origin:custodian':  { tool: 30,  eyes: 30, head: 20,  boots: 5,  face: 5,  hands: 5, pouch: 5  },
  'origin:archive':    { pouch: 30, tool: 30, eyes: 10,  head: 10,  face: 5,  hands: 5, boots: 5  },
};
