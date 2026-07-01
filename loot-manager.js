'use strict';

// ────────────────────────────────────────────────────────────────────────────────
// loot-manager.js  –  Smart loot generation for expedition rewards.
//
// Usage:
//   const loot = LootManager.generateLoot(depth, 'origin:blackwater', summary);
//
// @typedef {Object} InventorySummary
// @property {Object.<string, boolean>} acquiredSlots  - Slots the player has EVER received, e.g. { boots: true }
// @property {Object.<string, number>}  equippedTiers  - Current equipped tier per slot (0 = empty slot)
//
// Depends on: artifact-registry.js (ARTIFACT_CATALOG, ArtifactRegistry),
//             expedition-maps.js (window.FACTION_SLOT_BIAS)
// Load order: after artifact-registry.js and expedition-maps.js, before game-loop.js
// ────────────────────────────────────────────────────────────────────────────────

const LootManager = (() => {

  // Base weight every slot starts with before modifiers.
  const BASE_WEIGHT = 10;

  /**
   * Pity bonus added to any slot the player has never acquired (Depth ≤ 3).
   * At +300 vs a base of 10, an unseen slot is ~30× more likely to drop than
   * a neutral slot, mathematically guaranteeing all 7 slots appear by Depth 3
   * in any balanced expedition mix.
   */
  const PITY_BONUS = 300;

  /**
   * Weight bonus per tier unit a slot's equipped item falls below the
   * player's average equipped tier (active at Depth ≥ 4 only).
   * E.g. average tier = 3, boots tier = 1 → +2 × 15 = +30 weight to boots.
   */
  const UPGRADE_BIAS_PER_TIER = 15;

  /** Canonical order of equip slots (must match EQUIP_SLOTS in artifact-registry.js). */
  const ALL_SLOTS = ['head', 'eyes', 'face', 'hands', 'tool', 'pouch', 'boots'];

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Generate a single loot artifact for an expedition reward.
   *
   * The algorithm runs three stacked weight modifiers in order:
   *   1. Faction bias   – favours thematically appropriate slots.
   *   2. Pity guarantee – at Depth ≤ 3, dramatically boosts any slot the
   *                       player has never received to guarantee full coverage.
   *   3. Upgrade bias   – at Depth ≥ 4, shifts weight toward slots where the
   *                       player's equipped item is furthest below average tier.
   *
   * @param {number}           depth           - Expedition depth (1+). Controls tier roll and upgrade bias.
   * @param {string}           faction         - Faction tag of the expedition, e.g. 'origin:custodian'.
   * @param {InventorySummary} [inventorySummary={}]
   * @returns {Object|null} Artifact instance (ArtifactRegistry.createInstance shape), or null on failure.
   */
  function generateLoot(depth, faction, inventorySummary = {}) {
    const weights  = _buildSlotWeights(depth, faction, inventorySummary);
    const slotType = _weightedRandomSlot(weights);
    const typeId   = _pickArtifactForSlot(slotType, faction);
    if (!typeId) return null;
    return ArtifactRegistry.createInstance(typeId, _rollTier(depth));
  }

  // ── Weight Calculation ────────────────────────────────────────────────────────

  /**
   * Builds the weight map { slotType → weight } for a single loot roll.
   * Exposed for testing and UI previews.
   *
   * @param {number}           depth
   * @param {string}           faction
   * @param {InventorySummary} inventorySummary
   * @returns {Object.<string, number>}
   */
  function _buildSlotWeights(depth, faction, inventorySummary) {
    const acquiredSlots = inventorySummary.acquiredSlots || {};
    const equippedTiers = inventorySummary.equippedTiers  || {};
    const factionBias   = (window.FACTION_SLOT_BIAS || {})[faction] || {};

    // Pre-compute average equipped tier for the upgrade bias pass.
    let avgTier = 0;
    if (depth >= 4) {
      const tiers = ALL_SLOTS.map(s => equippedTiers[s] || 0);
      avgTier = tiers.reduce((a, b) => a + b, 0) / tiers.length;
    }

    const weights = {};
    for (const slot of ALL_SLOTS) {
      let w = BASE_WEIGHT;

      // Pass 1 – faction bias
      w += (factionBias[slot] || 0);

      // Pass 2 – pity guarantee (Depth ≤ 3)
      // Any slot the player has NEVER acquired gets a massive weight boost,
      // ensuring all 7 slots appear by the time the player clears Depth 3.
      if (depth <= 3 && !acquiredSlots[slot]) {
        w += PITY_BONUS;
      }

      // Pass 3 – upgrade bias (Depth ≥ 4)
      // Favour slots where the equipped item is behind the player's average tier.
      if (depth >= 4 && avgTier > 0) {
        const tierGap = Math.max(0, avgTier - (equippedTiers[slot] || 0));
        w += tierGap * UPGRADE_BIAS_PER_TIER;
      }

      weights[slot] = Math.max(1, w);
    }
    return weights;
  }

  // ── Weighted Random Selection ─────────────────────────────────────────────────

  /**
   * Selects a slot key using weighted random selection (linear scan, O(n)).
   * Exposed for testing.
   *
   * @param {Object.<string, number>} weights
   * @returns {string}
   */
  function _weightedRandomSlot(weights) {
    const entries = Object.entries(weights);
    const total   = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [slot, w] of entries) {
      r -= w;
      if (r <= 0) return slot;
    }
    // Floating-point edge case: return last slot.
    return entries[entries.length - 1][0];
  }

  // ── Artifact Selection ────────────────────────────────────────────────────────

  /**
   * Picks a typeId for the given slot, faction-biased via double-entry pool.
   * Faction-matching artifacts appear twice in the draw pool, giving them a
   * 2× relative probability vs non-matching artifacts in the same slot.
   *
   * @param {string} slotType - e.g. 'boots'
   * @param {string} faction  - e.g. 'origin:blackwater'
   * @returns {string|null}
   */
  function _pickArtifactForSlot(slotType, faction) {
    const candidates = Object.values(ARTIFACT_CATALOG).filter(
      def => def.equipSlot === slotType,
    );
    if (!candidates.length) return null;

    // Double-entry pool: faction matches appear twice → 2× draw probability.
    const pool = [];
    for (const def of candidates) {
      pool.push(def.id);
      if (def.tags?.includes(faction)) pool.push(def.id);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Tier Roll ────────────────────────────────────────────────────────────────

  /**
   * Rolls a tier for the generated artifact based on expedition depth.
   *
   * Depth 1  → Tier 1–2    (early game, low power)
   * Depth 2  → Tier 1–3
   * Depth 3  → Tier 2–4
   * Depth 4+ → Tier (d−1) to (d+1), capped at 10
   *
   * @param {number} depth
   * @returns {number} tier in range [1, 10]
   */
  function _rollTier(depth) {
    const minTier = Math.max(1, depth - 1);
    const maxTier = Math.min(10, depth + 1);
    return minTier + Math.floor(Math.random() * (maxTier - minTier + 1));
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return {
    generateLoot,
    // Exposed for unit tests / UI previews:
    _buildSlotWeights,
    _weightedRandomSlot,
  };
})();

window.LootManager = LootManager;
