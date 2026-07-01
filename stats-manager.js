'use strict';

// ────────────────────────────────────────────────────────────────────────────────
// stats-manager.js — Centralized stat calculation. Single source of truth.
//
// UI functions are FORBIDDEN from calling ArtifactRegistry calculation methods
// directly. All consumers read from window.GlobalGameStats instead.
//
// Load order: after artifact-registry.js, before panoptikum.js and game-loop.js
// ────────────────────────────────────────────────────────────────────────────────

const StatsManager = (() => {
  let _collection = null;

  // Called once after PanoptikumCollection is instantiated.
  function init(collection) {
    _collection = collection;
  }

  // Runs whenever an artifact is moved, an item is sold, or a tick happens.
  // Writes a frozen snapshot to window.GlobalGameStats.
  function recalculateAll() {
    if (!_collection || typeof ArtifactRegistry === 'undefined') return;

    const { state, labState } = _collection;
    const unlockedByTypeId  = labState.unlockedFields    || {};
    const unlockedKnowledge = labState.unlockedKnowledge || {};
    const pedestals  = state.pedestals  || [];
    const equipped   = labState.equipped || {};
    const labSlots   = labState.slots    || [];

    const exhibitFx = ArtifactRegistry.getActiveEffects(pedestals, unlockedByTypeId, unlockedKnowledge);
    const equipFx   = ArtifactRegistry.getEquippedEffects(equipped, unlockedByTypeId, unlockedKnowledge);
    const gpm       = ArtifactRegistry.calculatePassiveGPM(pedestals, unlockedByTypeId, unlockedKnowledge);
    const rpm       = ArtifactRegistry.calculateResearchRPM(labSlots);
    const visitors  = ArtifactRegistry.calculateVisitorCount(gpm);

    window.GlobalGameStats = Object.freeze({
      gpm,
      gpmBreakdown:     _buildGpmBreakdown(pedestals, unlockedByTypeId, unlockedKnowledge),
      researchPerMin:   rpm,
      visitors,
      panoptikumGold:   state.panoptikumGold  || 0,
      labResearch:      labState.research      || 0,
      sightRangeBonus:  exhibitFx.sightRangeBonus  + equipFx.sightRangeBonus,
      peekTimeBonus:    exhibitFx.peekTimeBonus     + equipFx.peekTimeBonus,
      nemesisSpeedMult: exhibitFx.nemesisSpeedMult  + equipFx.nemesisSpeedMult,
    });
  }

  // Returns an array of { label, value } lines for the GPM breakdown tooltip.
  function _buildGpmBreakdown(pedestals, unlockedByTypeId, unlockedKnowledge) {
    const lines = [];
    for (const slot of pedestals) {
      if (!slot) continue;
      const def  = ArtifactRegistry.getById(slot.typeId);
      const name = def?.name || slot.typeId;
      const slotGpm = ArtifactRegistry.calculatePassiveGPM([slot], unlockedByTypeId, unlockedKnowledge);
      lines.push({ label: `${name} (T${slot.tier})`, value: slotGpm });
    }
    return lines;
  }

  return { init, recalculateAll };
})();

window.StatsManager = StatsManager;
