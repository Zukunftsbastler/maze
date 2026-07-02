'use strict';

// ────────────────────────────────────────────────────────────────────────────────
// artifact-registry.js  –  Artifact catalog, tier system, trait/condition engine,
//                          passive income, equip system & merge logic
// ────────────────────────────────────────────────────────────────────────────────

// ── Tier names & income multipliers ──────────────────────────────────────────────

const TIER_NAMES = ['', 'Grimy', 'Dusted', 'Restored', 'Intact', 'Pristine',
                    'Remarkable', 'Extraordinary', 'Relic', 'Mythic', 'Eldritch'];

const TIER_INCOME_MULT = [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512];

/**
 * Compute the base exhibition appeal (Gold/min at tier 1) for an artifact.
 * This value is ALWAYS active — it does not require field research.
 * Artifacts with fewer or weaker traits generate more crowd appeal because
 * their value comes from being visually striking exhibition pieces rather
 * than mechanically complex instruments.
 *
 * Formula inputs:
 *   - traitCount: more traits → lower raw appeal (traits ARE the value)
 *   - baseValue:  higher monetary value → slightly lower appeal (already priced in)
 *   - equipSlot:  null = display-only → highest appeal tier (pure exhibition)
 *
 * @param {Object} def - artifact definition from ARTIFACT_CATALOG
 * @returns {number} Gold/min at tier 1 (always ≥ 0.3)
 */
function _computeExhibitGPM(def) {
  if (!def) return 0;
  const traitCount  = (def.traits || []).length;
  const displayOnly = def.equipSlot === null;
  const base = displayOnly
    ? 5.0 - traitCount * 0.4                          // display-only: high ceiling
    : 3.0 - traitCount * 0.3 - (def.baseValue - 15) * 0.025; // equippable: inversely scaled
  return Math.max(0.3, Math.round(base * 10) / 10);
}

// ── Equipment slot types ──────────────────────────────────────────────────────────
// equipSlot values used in artifact definitions and the equipment screen.
// null = display-only (too large / fragile / ceremonial to carry on expedition).
const EQUIP_SLOTS = {
  head:  { label: 'Head',       icon: '🎩', desc: 'Headgear worn by the antiquarian' },
  eyes:  { label: 'Eyes',       icon: '🔭', desc: 'Optical instruments and eye-wear' },
  face:  { label: 'Face',       icon: '😷', desc: 'Masks and breathing apparatus'    },
  hands: { label: 'Hands',      icon: '🧤', desc: 'Gloves and hand equipment'        },
  tool:  { label: 'Tool',       icon: '⚙',  desc: 'Handheld instruments and devices' },
  pouch: { label: 'Pouch',      icon: '👝', desc: 'Small carried relics and charms'  },
  boots: { label: 'Boots',      icon: '👢', desc: 'Footwear'                         },
};

// ── Currency sprite tiers ─────────────────────────────────────────────────────────

const CURRENCY_SPRITES = [
  { min: 1,   max: 1,        src: 'ASSETS/CURRENCY/single_gold_coin.png'    },
  { min: 2,   max: 3,        src: 'ASSETS/CURRENCY/copper_coin.png'         },
  { min: 4,   max: 7,        src: 'ASSETS/CURRENCY/small_coin_stack.png'    },
  { min: 8,   max: 12,       src: 'ASSETS/CURRENCY/spilled_coin_pouch.png'  },
  { min: 13,  max: 25,       src: 'ASSETS/CURRENCY/small_wooden_chest.png'  },
  { min: 26,  max: 50,       src: 'ASSETS/CURRENCY/silver_goblet.png'       },
  { min: 51,  max: 100,      src: 'ASSETS/CURRENCY/ornate_reliquary.png'    },
  { min: 101, max: 200,      src: 'ASSETS/CURRENCY/overflowing_chalice.png' },
  { min: 201, max: Infinity, src: 'ASSETS/CURRENCY/large_treasure_hoard.png'},
];

function getCurrencySprite(amount) {
  for (const tier of CURRENCY_SPRITES) {
    if (amount >= tier.min && amount <= tier.max) return tier.src;
  }
  return CURRENCY_SPRITES[0].src;
}

// ── Condition evaluator ───────────────────────────────────────────────────────────
// ctx: { artifact, pedestals, pedestalCount, visitorCount, exhibitedArtifacts }

function evaluateCondition(cond, ctx) {
  switch (cond.type) {
    case 'IS_EXHIBITED':      return ctx.artifact?.state === 'exhibited';
    case 'IS_NOT_EXHIBITED':  return ctx.artifact?.state !== 'exhibited';
    case 'IS_EQUIPPED':       return ctx.artifact?.state === 'equipped';
    case 'IS_IN_RESEARCH':    return ctx.artifact?.state === 'in_lab';
    case 'PANOPTICON_FULL':   return (ctx.pedestals||[]).filter(Boolean).length >= (ctx.pedestalCount||5);
    case 'MIN_VISITORS':      return (ctx.visitorCount||0) >= cond.value;
    case 'MAX_VISITORS':      return (ctx.visitorCount||0) <= cond.value;
    case 'HAS_EXHIBITED_TAG': return (ctx.exhibitedArtifacts||[]).some(a => {
      const def = ARTIFACT_CATALOG[a.typeId];
      return def?.tags?.includes(cond.tag);
    });
    case 'MIN_TIER': return (ctx.artifact?.tier||1) >= cond.value;
    default: return true;
  }
}

// ── Effect accumulator ────────────────────────────────────────────────────────────

function buildActiveEffects() {
  return {
    visitorAttraction: 0,
    peekTimeBonus:     0,
    sightRangeBonus:   0,
    nemesisSpeedMult:  0,
    passiveIncomeMult: 1.0,
    excavationSpeed:   0, // fractional reduction in cave-in clearing time (IS_EQUIPPED only)
  };
}

function applyEffect(effects, effect, tier) {
  const v = typeof effect.value === 'function' ? effect.value(tier) : effect.value;
  switch (effect.type) {
    case 'VISITOR_ATTRACTION':  effects.visitorAttraction  += v; break;
    case 'PEEK_TIME':           effects.peekTimeBonus      += v; break;
    case 'SIGHT_RANGE':         effects.sightRangeBonus    += v; break;
    case 'NEMESIS_SPEED':       effects.nemesisSpeedMult   += v; break;
    case 'PASSIVE_INCOME_MULT': effects.passiveIncomeMult  *= v; break;
    case 'EXCAVATION_SPEED':    effects.excavationSpeed    += v; break;
  }
}

// ── Trait effect evaluation helper ────────────────────────────────────────────────
// Applies all trait effects from a list of artifact instances (slots) into effects.
// Only applies if: (a) conditions met, (b) 'traits' field is unlocked for that typeId.

function _applyTraitsFromSlots(slots, effects, unlockedByTypeId, ctx) {
  for (const slot of slots) {
    if (!slot) continue;
    const def = ARTIFACT_CATALOG[slot.typeId];
    if (!def) continue;
    // Gate: traits must be researched
    const typeUnlocked = unlockedByTypeId[slot.typeId] || [];
    if (!typeUnlocked.includes('traits')) continue;
    const artCtx = { ...ctx, artifact: slot };
    for (const trait of (def.traits || [])) {
      // Skip traits whose category is suppressed (e.g. by a faction conflict).
      if (slot._suppressedCategories?.has(trait.category)) continue;
      const allMet = (trait.conditions || []).every(c => evaluateCondition(c, artCtx));
      if (!allMet) continue;
      for (const eff of (trait.effects || [])) applyEffect(effects, eff, slot.tier);
    }
  }
}

// Apply global knowledge discoveries (from Crucible) to a set of slots.
// unlockedKnowledge: { 'tag': ['discoveryId', ...] }
// A discovery fires if the artifact has the tag in its tags[] array.
function _applyGlobalKnowledge(slots, effects, unlockedKnowledge, ctx) {
  if (!unlockedKnowledge || !Object.keys(unlockedKnowledge).length) return;
  for (const slot of slots) {
    if (!slot) continue;
    const def = ARTIFACT_CATALOG[slot.typeId];
    if (!def || !def.tags) continue;
    for (const [tag, discoveryIds] of Object.entries(unlockedKnowledge)) {
      if (!def.tags.includes(tag)) continue;
      for (const discoveryId of discoveryIds) {
        const discovery = _findCrucibleDiscovery(discoveryId);
        if (!discovery) continue;
        // Only apply if context matches: exhibition discoveries need IS_EXHIBITED,
        // equip discoveries need IS_EQUIPPED
        const artCtx = { ...ctx, artifact: slot };
        if (discovery.conditionType && !evaluateCondition({ type: discovery.conditionType }, artCtx)) continue;
        applyEffect(effects, discovery.effect, slot.tier);
      }
    }
  }
}

let _crucibleDiscoveryCache = null;
function _findCrucibleDiscovery(discoveryId) {
  if (!_crucibleDiscoveryCache) {
    _crucibleDiscoveryCache = {};
    for (const def of Object.values(ARTIFACT_CATALOG)) {
      if (def.crucibleDiscovery) _crucibleDiscoveryCache[def.crucibleDiscovery.id] = def.crucibleDiscovery;
    }
  }
  return _crucibleDiscoveryCache[discoveryId] ?? null;
}

// ── Artifact catalog ──────────────────────────────────────────────────────────────
// Schema per entry:
//   id, name, sprite, spriteFull, baseValue, description, metadata, tags
//   equipSlot: null | 'head'|'eyes'|'face'|'hands'|'tool'|'pouch'|'boots'
//   traits[]: id, name, type ('positive'|'negative'),
//             description fn(tier)→string,
//             conditions[], effects[]
//
// Condition context:
//   IS_EXHIBITED  → applies when in a Panoptikum display pedestal
//   IS_EQUIPPED   → applies when worn by the antiquarian on expedition
//   IS_IN_RESEARCH → applies when placed in a laboratory research slot

const ARTIFACT_CATALOG = {

  // ╔══════════════════════════════════════════════════════╗
  // ║  ZONE FIRST-FINDS                                    ║
  // ╚══════════════════════════════════════════════════════╝

  chitinous_puzzle_sphere: {
    id: 'chitinous_puzzle_sphere', name: 'Chitinous Puzzle Sphere',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/chitinous_puzzle_sphere.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/chitinous_puzzle_sphere_full.png',
    baseValue: 12, equipSlot: 'pouch',
    description: 'A segmented orb of yellowed chitin locked into an intricate interlocking configuration. No known scholar has solved it. A faint rhythmic clicking can sometimes be heard from within — as though something inside is still turning.',
    metadata: { material: 'Organic', size: 'Small', weight: 3.2, type: 'Mechanism', origin: 'Unknown Depths', arcaneResonance: 'Low' },
    tags: ['organic', 'mechanism', 'puzzle', 'small', 'origin:custodian'],
    crucibleDiscovery: {
      id: 'organic_resonance',
      name: 'Organic Resonance',
      loreText: 'The chitin still pulses. Destroying it releases a sympathetic frequency that awakens dormant biological properties in every organic specimen in your collection.',
      appliesTo: 'organic',
      conditionType: 'IS_EXHIBITED',
      effect: { type: 'VISITOR_ATTRACTION', value: 1 },
    },
    traits: [
      { id: 'enigmatic_aura', name: 'Enigmatic Aura', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'chitin_distraction', name: 'Chitin Distraction', type: 'negative', category: 'material',
        description: t => `Equipped: Peek time −${(Math.max(0.05, 0.4 - t * 0.03)).toFixed(2)}s (clicking distracts you)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => -(Math.max(0.05, 0.4 - t * 0.03)) }] },
    ],
  },

  brass_compass: {
    id: 'brass_compass', name: 'Brass Compass',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/brass_compass.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/brass_compass_full.png',
    baseValue: 18, equipSlot: 'tool',
    description: 'A tarnished brass compass of extraordinary precision, its needle swinging freely toward some unseen magnetic north that shifts with the moon. The inner ring bears cartographic notations in a dead language.',
    metadata: { material: 'Brass', size: 'Small', weight: 0.8, type: 'Mechanism', origin: 'The Grand Archive', arcaneResonance: 'Null' },
    tags: ['brass', 'navigation', 'mechanism', 'small', 'origin:archive'],
    crucibleDiscovery: {
      id: 'wayfinder_attunement',
      name: 'Wayfinder Attunement',
      loreText: 'Dissolving the compass in acid releases a century of accumulated magnetic memory. Every navigation instrument you carry will henceforth find the path a fraction quicker.',
      appliesTo: 'navigation',
      conditionType: 'IS_EQUIPPED',
      effect: { type: 'SIGHT_RANGE', value: 1 },
    },
    traits: [
      { id: 'navigator_instinct', name: "Navigator's Instinct", type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 2))} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 2)) }] },
      { id: 'historical_curiosity_compass', name: 'Historical Curiosity', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'magnetic_interference', name: 'Magnetic Interference', type: 'negative', category: 'arcaneResonance',
        description: () => 'Exhibited: Nemesis speed +3% (magnetic field reaches the depths)',
        conditions: [{ type: 'IS_EXHIBITED' }, { type: 'MAX_VISITORS', value: 0 }],
        effects: [{ type: 'NEMESIS_SPEED', value: 0.03 }] },
    ],
  },

  glow_moth_lantern: {
    id: 'glow_moth_lantern', name: 'Glow-Moth Lantern',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/glow_moth_lantern.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/glow_moth_lantern_full.png',
    baseValue: 24, equipSlot: 'tool',
    description: 'A cage of bent copper wire containing three preserved glow-moths of prodigious size. Their bioluminescent wings pulse faintly long after death, casting a soft green-gold light that flickers like a heartbeat.',
    metadata: { material: 'Organic', size: 'Small', weight: 0.5, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'High' },
    tags: ['organic', 'light', 'reliquary', 'small', 'bioluminescent', 'origin:blackwater'],
    traits: [
      { id: 'bioluminescent_display', name: 'Bioluminescent Display', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'carried_light', name: 'Carried Light', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.floor(t / 3) + 1} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.floor(t / 3) + 1 }] },
      { id: 'life_drain', name: 'Life Drain', type: 'negative', category: 'arcaneResonance',
        description: () => 'Exhibited: Passive income ×0.9 while any visitors present',
        conditions: [{ type: 'IS_EXHIBITED' }, { type: 'MIN_VISITORS', value: 1 }],
        effects: [{ type: 'PASSIVE_INCOME_MULT', value: 0.9 }] },
    ],
  },

  clockwork_globe: {
    id: 'clockwork_globe', name: 'Clockwork Globe',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/clockwork_globe.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/clockwork_globe_full.png',
    baseValue: 35, equipSlot: null,
    description: 'A brass-and-ivory mechanical globe bristling with rotating armillary rings and tiny gear-driven continents. When wound, it slowly rearranges its surface into configurations matching no known cartography — and yet the positions feel strangely familiar.',
    metadata: { material: 'Brass', size: 'Bulky', weight: 12.4, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'High' },
    tags: ['brass', 'mechanism', 'cartography', 'bulky', 'clockwork', 'origin:blackwater'],
    traits: [
      { id: 'world_in_motion', name: 'World in Motion', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t * 2} Visitor Attraction; income ×${(1 + t * 0.10).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t * 2 },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.10 },
        ] },
      { id: 'gear_cacophony', name: 'Gear Cacophony', type: 'negative', category: 'material',
        description: t => `Exhibited: Nemesis speed +${t}% (grinding gears echo below)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.01 }] },
    ],
  },

  book_of_labyrinthine_architecture: {
    id: 'book_of_labyrinthine_architecture', name: 'Book of Labyrinthine Architecture',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/book_of_labyrinthine_architecture.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/book_of_labyrinthine_architecture_full.png',
    baseValue: 48, equipSlot: 'pouch',
    description: "A folio of vellum pages bound in cracked calfskin, filled with impossible architectural diagrams of mazes that recurse into themselves at every scale. The author's marginal notes grow increasingly incoherent toward the end, as though the act of writing this slowly unmade their sense of direction.",
    metadata: { material: 'Organic', size: 'Small', weight: 2.1, type: 'Reliquary', origin: 'The Grand Archive', arcaneResonance: 'Volatile' },
    tags: ['organic', 'knowledge', 'labyrinth', 'small', 'cursed', 'origin:archive'],
    traits: [
      { id: 'scholarly_display', name: 'Scholarly Display', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'cartographic_memory', name: 'Cartographic Memory', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 2))} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 2)) }] },
      { id: 'recursive_confusion', name: 'Recursive Confusion', type: 'negative', category: 'arcaneResonance',
        description: t => `Equipped: Peek time −${(0.3 - Math.min(0.25, t * 0.02)).toFixed(2)}s at low tiers`,
        conditions: [{ type: 'IS_EQUIPPED' }, { type: 'MIN_TIER', value: 1 }],
        effects: [{ type: 'PEEK_TIME', value: t => -(Math.max(0.05, 0.3 - t * 0.02)) }] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  GENERAL LOOT POOL — OPTICS & VISION                 ║
  // ╚══════════════════════════════════════════════════════╝

  goggles_of_true_sight: {
    id: 'goggles_of_true_sight', name: 'Goggles of True Sight',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/goggles_of_true_sight.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/goggles_of_true_sight_full.png',
    baseValue: 32, equipSlot: 'eyes',
    description: 'Heavy brass goggles with rotating amber and violet lenses. When worn, the wearer can discern hidden passages and perceive the structural memory of labyrinthine spaces.',
    metadata: { material: 'Brass', size: 'Small', weight: 1.1, type: 'Mechanism', origin: 'The Grand Archive', arcaneResonance: 'High' },
    tags: ['brass', 'optics', 'small', 'mechanism', 'vision', 'origin:archive'],
    traits: [
      { id: 'true_sight', name: 'True Sight', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: +${Math.ceil(t / 2)} Sight Range; peek time +${(t * 0.15).toFixed(2)}s`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [
          { type: 'SIGHT_RANGE', value: t => Math.ceil(t / 2) },
          { type: 'PEEK_TIME',   value: t => t * 0.15 },
        ] },
      { id: 'scholarly_appeal', name: 'Scholarly Appeal', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'sight_tax', name: 'Sight Tax', type: 'negative', category: 'arcaneResonance',
        description: () => 'Equipped: Nemesis speed +5% at Tier 5+ (it knows you see it)',
        conditions: [{ type: 'IS_EQUIPPED' }, { type: 'MIN_TIER', value: 5 }],
        effects: [{ type: 'NEMESIS_SPEED', value: 0.05 }] },
    ],
  },

  thermal_goggles: {
    id: 'thermal_goggles', name: 'Thermal Goggles',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/thermal_goggles.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/thermal_goggles_full.png',
    baseValue: 26, equipSlot: 'eyes',
    description: 'Copper-rimmed goggles fitted with heat-sensitive glass that renders warm bodies as luminous silhouettes against the cold stone of the labyrinth.',
    metadata: { material: 'Brass', size: 'Small', weight: 0.9, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Low' },
    tags: ['brass', 'optics', 'small', 'mechanism', 'heat', 'vision', 'origin:blackwater'],
    traits: [
      { id: 'heat_vision', name: 'Heat Vision', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 2))} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 2)) }] },
      { id: 'scientific_curiosity', name: 'Scientific Curiosity', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'sensory_overload', name: 'Sensory Overload', type: 'negative', category: 'physical',
        description: t => `Equipped: Peek time −${(0.2 + t * 0.01).toFixed(2)}s (too much information)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => -(0.2 + t * 0.01) }] },
    ],
  },

  cartographer_s_monocle: {
    id: 'cartographer_s_monocle', name: "Cartographer's Monocle",
    sprite:     'ASSETS/ITEMS/ARTIFACTS/cartographer_s_monocle.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/cartographer_s_monocle_full.png',
    baseValue: 16, equipSlot: 'eyes',
    description: "A precision glass monocle fitted with a rotating series of etched lenses, each calibrated for a different scale of observation. The engraved maker's mark reads: \"For eyes that seek where none have looked.\"",
    metadata: { material: 'Brass', size: 'Small', weight: 0.2, type: 'Mechanism', origin: 'The Grand Archive', arcaneResonance: 'Null' },
    tags: ['brass', 'optics', 'small', 'mechanism', 'origin:archive'],
    traits: [
      { id: 'keen_vision', name: 'Keen Vision', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, t)} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, t) }] },
      { id: 'cartographic_charm', name: 'Cartographic Charm', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'eyestrain', name: 'Eyestrain', type: 'negative', category: 'physical',
        description: () => 'Equipped: Peek time −0.2s',
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: -0.2 }] },
    ],
  },

  gold_pince_nez: {
    id: 'gold_pince_nez', name: 'Gold Pince-Nez',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/gold_pince_nez.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/gold_pince_nez_full.png',
    baseValue: 20, equipSlot: 'eyes',
    description: "Delicate gold-framed pince-nez spectacles of flawless craftsmanship, with lenses ground to a prescription no living oculist has ever matched. The frames bear a hallmark of an extinct guild.",
    metadata: { material: 'Gold', size: 'Small', weight: 0.05, type: 'Reliquary', origin: 'The Grand Archive', arcaneResonance: 'Null' },
    tags: ['gold', 'optics', 'small', 'aristocratic', 'origin:archive'],
    traits: [
      { id: 'aristocratic_elegance', name: 'Aristocratic Elegance', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t * 2} Visitor Attraction; income ×${(1 + t * 0.06).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t * 2 },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.06 },
        ] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  FACE / BREATHING EQUIPMENT                          ║
  // ╚══════════════════════════════════════════════════════╝

  breathing_wood_mask: {
    id: 'breathing_wood_mask', name: 'Breathing Wood Mask',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/breathing_wood_mask.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/breathing_wood_mask_full.png',
    baseValue: 18, equipSlot: 'face',
    description: 'A carved wooden mask whose grain shifts like breathing when held in warm hands. The maker carved breathing channels into its interior structure that still function after centuries.',
    metadata: { material: 'Organic', size: 'Small', weight: 0.3, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Low' },
    tags: ['organic', 'mask', 'small', 'breathing', 'sylvan', 'origin:blackwater'],
    traits: [
      { id: 'sylvan_display', name: 'Sylvan Curiosity', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'forest_calm', name: 'Forest Calm', type: 'positive', category: 'physical',
        description: t => `Equipped: Peek time +${(t * 0.20).toFixed(2)}s`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => t * 0.20 }] },
    ],
  },

  charcoal_breathing_mask: {
    id: 'charcoal_breathing_mask', name: 'Charcoal Breathing Mask',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/charcoal_breathing_mask.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/charcoal_breathing_mask_full.png',
    baseValue: 14, equipSlot: 'face',
    description: 'A hardened leather mask stuffed with charcoal filter layers. The outer surface is blackened and cracked but the filtration mechanism remains surprisingly effective.',
    metadata: { material: 'Organic', size: 'Small', weight: 0.4, type: 'Mechanism', origin: 'Unknown Depths', arcaneResonance: 'Null' },
    tags: ['organic', 'mask', 'small', 'breathing', 'functional', 'origin:blackwater'],
    traits: [
      { id: 'filtered_focus', name: 'Filtered Focus', type: 'positive', category: 'physical',
        description: t => `Equipped: Peek time +${(t * 0.15).toFixed(2)}s`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => t * 0.15 }] },
      { id: 'functional_relic', name: 'Functional Relic', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
    ],
  },

  frost_breathing_lung: {
    id: 'frost_breathing_lung', name: 'Frost Breathing Lung',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/frost_breathing_lung.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/frost_breathing_lung_full.png',
    baseValue: 22, equipSlot: 'face',
    description: 'A crystalline apparatus that fits over the lower face, filtering air through a chamber of perpetually frozen condensate. The breath it produces is always precisely 0°C, regardless of ambient temperature.',
    metadata: { material: 'Stone', size: 'Small', weight: 0.6, type: 'Mechanism', origin: 'Unknown Depths', arcaneResonance: 'High' },
    tags: ['stone', 'mask', 'small', 'breathing', 'cold', 'origin:blackwater'],
    traits: [
      { id: 'cryogenic_wonder', name: 'Cryogenic Wonder', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'frozen_clarity', name: 'Frozen Clarity', type: 'positive', category: 'physical',
        description: t => `Equipped: Peek time +${(t * 0.18).toFixed(2)}s; Nemesis speed −${(t * 0.5).toFixed(1)}%`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [
          { type: 'PEEK_TIME',    value: t => t * 0.18 },
          { type: 'NEMESIS_SPEED', value: t => -(t * 0.005) },
        ] },
    ],
  },

  porcelain_mask: {
    id: 'porcelain_mask', name: 'Porcelain Mask',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/porcelain_mask.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/porcelain_mask_full.png',
    baseValue: 17, equipSlot: 'face',
    description: "A blank white porcelain mask with deep-set eye holes. Mirrors found near it cease to reflect its image. Witnesses claim the mask's expression changes when no one is watching it directly.",
    metadata: { material: 'Stone', size: 'Small', weight: 0.6, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Volatile' },
    tags: ['stone', 'mask', 'small', 'cursed', 'uncanny', 'origin:custodian'],
    traits: [
      { id: 'uncanny_presence', name: 'Uncanny Presence', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t * 2} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t * 2 }] },
      { id: 'false_face', name: 'False Face', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: Nemesis speed −${(t * 1).toFixed(0)}% (it is confused by your face)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => -(t * 0.01) }] },
      { id: 'watching_back', name: 'Watching Back', type: 'negative', category: 'arcaneResonance',
        description: t => `Exhibited: Nemesis speed +${t}% (it is always aware of your display)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.01 }] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  HEAD                                                ║
  // ╚══════════════════════════════════════════════════════╝

  dented_top_hat: {
    id: 'dented_top_hat', name: 'Dented Top Hat',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/dented_top_hat.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/dented_top_hat_full.png',
    baseValue: 10, equipSlot: 'head',
    description: 'A once-elegant silk top hat, now dented and stained with substances best left unidentified. Its brim is scorched on one side and smells faintly of burnt hair.',
    metadata: { material: 'Organic', size: 'Small', weight: 0.3, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Null' },
    tags: ['organic', 'headgear', 'small', 'eccentric', 'origin:custodian'],
    traits: [
      { id: 'eccentric_appeal', name: 'Eccentric Appeal', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t * 2} Visitor Attraction (tourists adore the quirky)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t * 2 }] },
    ],
  },

  royal_crown: {
    id: 'royal_crown', name: 'Royal Crown',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/royal_crown.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/royal_crown_full.png',
    baseValue: 55, equipSlot: null,
    description: 'A heavy gold crown set with seventeen semi-precious stones, each representing a forgotten dynasty. The metal bears hairline cracks from some ancient impact — though historical records suggest no monarch ever fell in battle.',
    metadata: { material: 'Gold', size: 'Small', weight: 2.8, type: 'Reliquary', origin: 'The Grand Archive', arcaneResonance: 'Low' },
    tags: ['gold', 'headgear', 'small', 'royal', 'prestigious', 'origin:archive'],
    traits: [
      { id: 'regal_splendor', name: 'Regal Splendor', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t * 4} Visitor Attraction; income ×${(1 + t * 0.12).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t * 4 },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.12 },
        ] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  HANDS                                               ║
  // ╚══════════════════════════════════════════════════════╝

  spider_silk_gloves: {
    id: 'spider_silk_gloves', name: 'Spider-Silk Gloves',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/spider_silk_gloves.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/spider_silk_gloves_full.png',
    baseValue: 21, equipSlot: 'hands',
    description: 'Gloves woven from the silk of an unidentified arachnid species, impossibly fine yet stronger than steel. They conduct no electricity and insulate perfectly against cold.',
    metadata: { material: 'Organic', size: 'Small', weight: 0.05, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Low' },
    tags: ['organic', 'gloves', 'small', 'artisan', 'origin:blackwater'],
    traits: [
      { id: 'artisan_rarity', name: 'Artisan Rarity', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.05).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.05 },
        ] },
      { id: 'silken_grasp', name: 'Silken Grasp', type: 'positive', category: 'physical',
        description: t => `Equipped: Peek time +${(t * 0.18).toFixed(2)}s (steady hands, steady mind)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => t * 0.18 }] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  TOOLS & INSTRUMENTS                                 ║
  // ╚══════════════════════════════════════════════════════╝

  clockwork_mapping_beetle: {
    id: 'clockwork_mapping_beetle', name: 'Clockwork Mapping Beetle',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/clockwork_mapping_beetle.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/clockwork_mapping_beetle_full.png',
    baseValue: 20, equipSlot: 'tool',
    description: 'A brass automaton shaped like a scarab beetle, designed to crawl through narrow passages and record architectural data on a tiny scroll within its abdomen.',
    metadata: { material: 'Brass', size: 'Small', weight: 0.4, type: 'Mechanism', origin: 'The Grand Archive', arcaneResonance: 'Null' },
    tags: ['brass', 'mechanism', 'small', 'clockwork', 'insect', 'origin:archive'],
    traits: [
      { id: 'auto_mapping', name: 'Auto-Mapping', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 2))} Sight Range (it scouts ahead)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 2)) }] },
      { id: 'mechanical_marvel', name: 'Mechanical Marvel', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
    ],
  },

  stardust_hourglass: {
    id: 'stardust_hourglass', name: 'Stardust Hourglass',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/stardust_hourglass.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/stardust_hourglass_full.png',
    baseValue: 30, equipSlot: 'tool',
    description: 'A crystal hourglass containing silver-grey dust that falls upward. The dust occasionally forms constellations before dissolving into formless grey.',
    metadata: { material: 'Ethereal', size: 'Small', weight: 1.8, type: 'Mechanism', origin: 'Unknown Depths', arcaneResonance: 'High' },
    tags: ['ethereal', 'time', 'small', 'celestial', 'origin:custodian'],
    traits: [
      { id: 'celestial_wonder', name: 'Celestial Wonder', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.07).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.07 },
        ] },
      { id: 'temporal_dilation', name: 'Temporal Dilation', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: Peek time +${(t * 0.25).toFixed(2)}s`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => t * 0.25 }] },
      { id: 'time_debt', name: 'Time Debt', type: 'negative', category: 'arcaneResonance',
        description: t => `Exhibited: Nemesis speed +${t}% (the hourglass draws time from below)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.01 }] },
    ],
  },

  mercury_pendulum: {
    id: 'mercury_pendulum', name: 'Mercury Pendulum',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/mercury_pendulum.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/mercury_pendulum_full.png',
    baseValue: 28, equipSlot: null,
    description: 'A pendulum of amber-yellow mercury suspended in a glass tube, swinging with perfect regularity regardless of external disturbance. Its rhythm cannot be disrupted by any force.',
    metadata: { material: 'Brass', size: 'Bulky', weight: 5.6, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Null' },
    tags: ['brass', 'mechanism', 'bulky', 'time', 'precision', 'origin:blackwater'],
    traits: [
      { id: 'perfect_timing', name: 'Perfect Timing', type: 'positive', category: 'physical',
        description: t => `Exhibited: income ×${(1 + t * 0.08).toFixed(2)}; +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.08 },
          { type: 'VISITOR_ATTRACTION',  value: t => t },
        ] },
    ],
  },

  chaotic_metronome: {
    id: 'chaotic_metronome', name: 'Chaotic Metronome',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/chaotic_metronome.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/chaotic_metronome_full.png',
    baseValue: 19, equipSlot: 'tool',
    description: 'A brass metronome whose pendulum swings at irregular, seemingly random intervals — yet musicians who follow it always play in perfect time by the end of a piece.',
    metadata: { material: 'Brass', size: 'Small', weight: 1.2, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Low' },
    tags: ['brass', 'mechanism', 'small', 'sound', 'time', 'origin:blackwater'],
    traits: [
      { id: 'hypnotic_rhythm', name: 'Hypnotic Rhythm', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'disrupted_cadence', name: 'Disrupted Cadence', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: Nemesis speed −${(t * 1).toFixed(0)}% (its rhythm confuses the pursuer)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => -(t * 0.01) }] },
      { id: 'discord', name: 'Discord', type: 'negative', category: 'material',
        description: t => `Equipped: Peek time −${(0.2 - Math.min(0.15, t * 0.015)).toFixed(2)}s`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => -(Math.max(0.05, 0.2 - t * 0.015)) }] },
    ],
  },

  skeleton_key_set: {
    id: 'skeleton_key_set', name: 'Skeleton Key Set',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/skeleton_key_set.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/skeleton_key_set_full.png',
    baseValue: 18, equipSlot: 'tool',
    description: 'A ring of twenty-three skeleton keys, each of different metals and epochs. Their combined origin spans five centuries and at least three secret societies.',
    metadata: { material: 'Brass', size: 'Small', weight: 0.7, type: 'Mechanism', origin: 'Unknown Depths', arcaneResonance: 'Null' },
    tags: ['brass', 'mechanism', 'small', 'keys', 'access', 'origin:custodian'],
    traits: [
      { id: 'historical_collection', name: 'Historical Collection', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'master_of_locks', name: 'Master of Locks', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 2))} Sight Range (you open hidden passages)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 2)) }] },
    ],
  },

  iron_pickaxe: {
    id: 'iron_pickaxe', name: 'Iron Pickaxe',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 22, equipSlot: 'tool',
    description: 'A heavy iron pickaxe recovered from a collapsed section of the lower warrens. The tempered head has fractured but holds its edge remarkably well — ideal for breaking through soft cave-in deposits.',
    metadata: { material: 'Brass', size: 'Bulky', weight: 4.1, type: 'Tool', origin: 'Unknown Depths', arcaneResonance: 'Null' },
    tags: ['iron', 'tool', 'bulky', 'excavation', 'origin:custodian'],
    traits: [
      { id: 'rapid_excavation', name: 'Rapid Excavation', type: 'positive', category: 'physical',
        description: t => `Equipped: Cave-in clearing time −${Math.round(Math.min(80, t * 8))}%`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'EXCAVATION_SPEED', value: t => Math.min(0.80, t * 0.08) }] },
      { id: 'pickaxe_appeal', name: 'Mining Relic', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'heavy_carry', name: 'Heavy Load', type: 'negative', category: 'material',
        description: t => `Equipped: Peek time −${(Math.max(0.05, 0.25 - t * 0.02)).toFixed(2)}s (weight tires the arm)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => -(Math.max(0.05, 0.25 - t * 0.02)) }] },
    ],
  },

  broken_oil_lamp: {
    id: 'broken_oil_lamp', name: 'Broken Oil Lamp',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/broken_oil_lamp.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/broken_oil_lamp_full.png',
    baseValue: 8, equipSlot: 'tool',
    description: 'A dented oil lamp of unremarkable provenance, its glass cracked and its reservoir almost empty. And yet — it still lights. Somehow it is always almost empty, never quite out.',
    metadata: { material: 'Brass', size: 'Small', weight: 0.6, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Null' },
    tags: ['brass', 'light', 'small', 'humble', 'origin:custodian'],
    traits: [
      { id: 'humble_relic', name: 'Humble Relic', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction (the mundane has its charm)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'dim_illumination', name: 'Dim Illumination', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 3) + 1)} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 3) + 1) }] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  BOOTS                                               ║
  // ╚══════════════════════════════════════════════════════╝

  boots_of_the_swift_descent: {
    id: 'boots_of_the_swift_descent', name: 'Boots of the Swift Descent',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/boots_of_the_swift_descent.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/boots_of_the_swift_descent_full.png',
    baseValue: 23, equipSlot: 'boots',
    description: 'A pair of worn leather boots whose soles bear a strange residue that never quite dries. The boots are always warm to the touch, as though their last wearer only just removed them.',
    metadata: { material: 'Organic', size: 'Bulky', weight: 1.2, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Low' },
    tags: ['organic', 'boots', 'bulky', 'speed', 'origin:blackwater'],
    traits: [
      { id: 'swift_instinct', name: 'Swift Instinct', type: 'positive', category: 'physical',
        description: t => `Equipped: Peek time +${(t * 0.20).toFixed(2)}s; Nemesis speed −${(t * 1).toFixed(0)}%`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [
          { type: 'PEEK_TIME',    value: t => t * 0.20 },
          { type: 'NEMESIS_SPEED', value: t => -(t * 0.01) },
        ] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  POUCH ITEMS — SMALL RELICS & CHARMS                 ║
  // ╚══════════════════════════════════════════════════════╝

  glowing_crystal: {
    id: 'glowing_crystal', name: 'Glowing Crystal',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/glowing_crystal.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/glowing_crystal_full.png',
    baseValue: 14, equipSlot: 'pouch',
    description: 'A fist-sized translucent crystal of unknown mineral composition that emits a constant soft blue glow without any apparent energy source.',
    metadata: { material: 'Stone', size: 'Small', weight: 2.5, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'High' },
    tags: ['stone', 'light', 'small', 'crystal', 'origin:archive'],
    traits: [
      { id: 'ambient_glow', name: 'Ambient Glow', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'crystal_light', name: 'Crystal Light', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 2))} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 2)) }] },
    ],
  },

  mechanical_scarab: {
    id: 'mechanical_scarab', name: 'Mechanical Scarab',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/mechanical_scarab.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/mechanical_scarab_full.png',
    baseValue: 22, equipSlot: 'pouch',
    description: 'A clockwork scarab that still occasionally twitches its articulated legs and opens its elytra to reveal a spinning gear mechanism within.',
    metadata: { material: 'Brass', size: 'Small', weight: 0.3, type: 'Mechanism', origin: 'Unknown Depths', arcaneResonance: 'Low' },
    tags: ['brass', 'mechanism', 'small', 'clockwork', 'insect', 'origin:custodian'],
    traits: [
      { id: 'ticking_lure', name: 'Ticking Lure', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t * 2} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t * 2 }] },
      { id: 'scarab_signal', name: 'Scarab Signal', type: 'negative', category: 'material',
        description: () => 'Exhibited: Nemesis speed +2% (ticking echoes reach below)',
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: 0.02 }] },
    ],
  },

  blessed_rabbit_s_foot: {
    id: 'blessed_rabbit_s_foot', name: "Blessed Rabbit's Foot",
    sprite:     'ASSETS/ITEMS/ARTIFACTS/blessed_rabbit_s_foot.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/blessed_rabbit_s_foot_full.png',
    baseValue: 10, equipSlot: 'pouch',
    description: "A surprisingly large rabbit's foot, preserved in a solution that keeps it permanently soft. The faint smell of clover and old spells clings to it.",
    metadata: { material: 'Organic', size: 'Small', weight: 0.1, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Low' },
    tags: ['organic', 'luck', 'small', 'charm', 'origin:blackwater'],
    traits: [
      { id: 'lucky_charm', name: 'Lucky Charm', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'good_luck', name: 'Good Luck', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: Peek time +${(t * 0.12).toFixed(2)}s`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => t * 0.12 }] },
    ],
  },

  whispering_meteorite: {
    id: 'whispering_meteorite', name: 'Whispering Meteorite',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/whispering_meteorite.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/whispering_meteorite_full.png',
    baseValue: 40, equipSlot: 'pouch',
    description: 'A smooth dark iron meteorite that emits a barely perceptible hum on the threshold of hearing. Those who hold it too long report hearing fragments of conversation in an unknown language.',
    metadata: { material: 'Stone', size: 'Small', weight: 8.2, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Volatile' },
    tags: ['stone', 'ethereal', 'small', 'cosmic', 'cursed', 'origin:archive'],
    traits: [
      { id: 'cosmic_presence', name: 'Cosmic Presence', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t * 3} Visitor Attraction; income ×${(1 + t * 0.08).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t * 3 },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.08 },
        ] },
      { id: 'void_call', name: 'Void Call', type: 'negative', category: 'arcaneResonance',
        description: t => `Exhibited: Nemesis speed +${t * 2}% (it speaks to what lurks below)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.02 }] },
    ],
  },

  dusty_grimoire: {
    id: 'dusty_grimoire', name: 'Dusty Grimoire',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/dusty_grimoire.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/dusty_grimoire_full.png',
    baseValue: 15, equipSlot: 'pouch',
    description: 'A thick leather-bound tome filled with cramped notation and diagrams. The ink seems to rearrange itself overnight, leaving different passages legible each morning.',
    metadata: { material: 'Organic', size: 'Small', weight: 3.0, type: 'Reliquary', origin: 'The Grand Archive', arcaneResonance: 'Low' },
    tags: ['organic', 'knowledge', 'small', 'origin:archive'],
    traits: [
      { id: 'forbidden_lore', name: 'Forbidden Lore', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'arcane_insight', name: 'Arcane Insight', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 3) + 1)} Sight Range (you read it as you explore)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 3) + 1) }] },
    ],
  },

  fractal_gear: {
    id: 'fractal_gear', name: 'Fractal Gear',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/fractal_gear.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/fractal_gear_full.png',
    baseValue: 25, equipSlot: 'pouch',
    description: "A brass gear whose teeth are themselves small gears with even smaller teeth — recursive to the limit of visible detail. Spinning it reveals a mesmerising self-similar structure that makes observers feel they could fall inward forever.",
    metadata: { material: 'Brass', size: 'Small', weight: 0.9, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Null' },
    tags: ['brass', 'mechanism', 'small', 'clockwork', 'mathematical', 'origin:blackwater'],
    traits: [
      { id: 'recursive_income', name: 'Recursive Income', type: 'positive', category: 'physical',
        description: t => `Exhibited: Income ×${(1 + t * 0.15).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.15 }] },
    ],
  },

  humming_copper_cylinder: {
    id: 'humming_copper_cylinder', name: 'Humming Copper Cylinder',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/humming_copper_cylinder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/humming_copper_cylinder_full.png',
    baseValue: 19, equipSlot: 'pouch',
    description: 'A sealed copper cylinder that produces a constant pure tone when held. The frequency shifts subtly when other unusual objects are brought near, as if in conversation with them.',
    metadata: { material: 'Brass', size: 'Small', weight: 1.4, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Low' },
    tags: ['brass', 'mechanism', 'small', 'resonance', 'sound', 'origin:blackwater'],
    traits: [
      { id: 'harmonic_resonance', name: 'Harmonic Resonance', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.04).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.04 },
        ] },
    ],
  },

  chimera_bone: {
    id: 'chimera_bone', name: 'Chimera Bone',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/chimera_bone.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/chimera_bone_full.png',
    baseValue: 27, equipSlot: 'pouch',
    description: 'A large femur from an indeterminate creature — too long for any known animal and too articulated for simple quadrupeds. The marrow cavity contains a glassy substance that neither melts nor shatters.',
    metadata: { material: 'Organic', size: 'Unwieldy', weight: 4.8, type: 'Biological', origin: 'Unknown Depths', arcaneResonance: 'High' },
    tags: ['organic', 'biological', 'unwieldy', 'monster', 'cursed', 'origin:blackwater'],
    traits: [
      { id: 'predator_scent', name: 'Predator Scent', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t * 3} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t * 3 }] },
      { id: 'feral_resonance', name: 'Feral Resonance', type: 'negative', category: 'arcaneResonance',
        description: t => `Exhibited: Nemesis speed +${t * 2}% when Panopticon full`,
        conditions: [{ type: 'IS_EXHIBITED' }, { type: 'PANOPTICON_FULL' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.02 }] },
    ],
  },

  glowing_vacuum_cluster: {
    id: 'glowing_vacuum_cluster', name: 'Glowing Vacuum Cluster',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/glowing_vacuum_cluster.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/glowing_vacuum_cluster_full.png',
    baseValue: 16, equipSlot: 'pouch',
    description: 'A cluster of glass spheres, each containing a vacuum that somehow glows with a faint warm light. The spheres clink musically when disturbed and never seem to break.',
    metadata: { material: 'Stone', size: 'Small', weight: 0.8, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'High' },
    tags: ['stone', 'light', 'small', 'glass', 'origin:archive'],
    traits: [
      { id: 'luminous_enigma', name: 'Luminous Enigma', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'vacuum_glow', name: 'Vacuum Glow', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 2))} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 2)) }] },
    ],
  },

  wisp_glass_prism: {
    id: 'wisp_glass_prism', name: 'Wisp-Glass Prism',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/wisp_glass_prism.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/wisp_glass_prism_full.png',
    baseValue: 24, equipSlot: 'pouch',
    description: 'A perfectly cut prism of smoky glass that splits any light into spectral bands of colours that do not appear in the normal visible spectrum. Observers report brief visions of the spaces through which the light has previously traveled.',
    metadata: { material: 'Stone', size: 'Small', weight: 1.1, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Volatile' },
    tags: ['stone', 'light', 'small', 'vision', 'ethereal', 'origin:archive'],
    traits: [
      { id: 'spectral_beauty', name: 'Spectral Beauty', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.06).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.06 },
        ] },
      { id: 'prismatic_sight', name: 'Prismatic Sight', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 2))} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 2)) }] },
    ],
  },

  comet_ice_shard: {
    id: 'comet_ice_shard', name: 'Comet Ice Shard',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/comet_ice_shard.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/comet_ice_shard_full.png',
    baseValue: 28, equipSlot: 'pouch',
    description: 'A dagger-shaped fragment of ancient ice that will not melt. It radiates cold intense enough to frost nearby surfaces and is believed to be a fragment of a comet that struck the depths two centuries ago.',
    metadata: { material: 'Stone', size: 'Small', weight: 0.4, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'High' },
    tags: ['stone', 'cold', 'small', 'cosmic', 'origin:archive'],
    traits: [
      { id: 'cosmic_rarity', name: 'Cosmic Rarity', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.07).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.07 },
        ] },
      { id: 'icebound_field', name: 'Icebound Field', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: Nemesis speed −${(t * 1.5).toFixed(1)}% (cold slows pursuit)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => -(t * 0.015) }] },
    ],
  },

  patched_rag_doll: {
    id: 'patched_rag_doll', name: 'Patched Rag Doll',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/patched_rag_doll.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/patched_rag_doll_full.png',
    baseValue: 11, equipSlot: 'pouch',
    description: "A child's rag doll assembled from at least seven different original dolls. It has been repaired so many times that it is unclear which pieces are original. Its button eyes always seem to be looking at something just behind you.",
    metadata: { material: 'Organic', size: 'Small', weight: 0.2, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Volatile' },
    tags: ['organic', 'small', 'uncanny', 'cursed', 'origin:blackwater'],
    traits: [
      { id: 'unsettling_charm', name: 'Unsettling Charm', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t * 2} Visitor Attraction (it unnerves and fascinates)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t * 2 }] },
      { id: 'haunted_companion', name: 'Haunted Companion', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: Nemesis speed −${(t * 1).toFixed(0)}% (it occupies the pursuer's attention)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => -(t * 0.01) }] },
    ],
  },

  liquid_starlight_syringe: {
    id: 'liquid_starlight_syringe', name: 'Liquid Starlight Syringe',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/liquid_starlight_syringe.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/liquid_starlight_syringe_full.png',
    baseValue: 26, equipSlot: 'pouch',
    description: 'A glass syringe filled with a luminous substance that never settles. The liquid rearranges itself into constellations that predict weather, mood, and — some claim — the future.',
    metadata: { material: 'Stone', size: 'Small', weight: 0.3, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Volatile' },
    tags: ['stone', 'light', 'small', 'ethereal', 'cosmic', 'origin:archive'],
    traits: [
      { id: 'starlight_display', name: 'Starlight Display', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.06).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.06 },
        ] },
      { id: 'starlit_path', name: 'Starlit Path', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 2))} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 2)) }] },
    ],
  },

  vacuum_glass_drop: {
    id: 'vacuum_glass_drop', name: 'Vacuum Glass Drop',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/vacuum_glass_drop.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/vacuum_glass_drop_full.png',
    baseValue: 15, equipSlot: 'pouch',
    description: 'A teardrop of glass encasing a perfect vacuum. Sound does not pass through it. When worn at the belt, the area immediately around the carrier becomes slightly quieter.',
    metadata: { material: 'Stone', size: 'Small', weight: 0.05, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Null' },
    tags: ['stone', 'small', 'silence', 'glass', 'origin:blackwater'],
    crucibleDiscovery: {
      id: 'blackwater_resonance',
      name: 'Blackwater Resonance',
      loreText: 'Imploding the vacuum drop releases the sealed silence outward. Every relic bearing the Blackwater seal hums with a sympathetic quietude — collectors pay a premium for the atmosphere of dread.',
      appliesTo: 'silence',
      conditionType: 'IS_EXHIBITED',
      effect: { type: 'PASSIVE_INCOME_MULT', value: 1.15 },
    },
    traits: [
      { id: 'scientific_oddity', name: 'Scientific Oddity', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'vacuum_silence', name: 'Vacuum Silence', type: 'positive', category: 'physical',
        description: t => `Equipped: Nemesis speed −${(t * 1.5).toFixed(1)}% (sound cannot travel through you)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => -(t * 0.015) }] },
    ],
  },

  monolith_of_vanity: {
    id: 'monolith_of_vanity', name: 'Monolith of Vanity',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/monolith_of_vanity.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/monolith_of_vanity_full.png',
    baseValue: 45, equipSlot: null,
    description: 'An obsidian mirror-stone taller than a man, polished to a perfection that reflects only what the viewer wishes to see of themselves. No one who gazes into it agrees on what they saw.',
    metadata: { material: 'Stone', size: 'Unwieldy', weight: 72.0, type: 'Monument', origin: 'Unknown Depths', arcaneResonance: 'Volatile' },
    tags: ['stone', 'monument', 'unwieldy', 'vanity', 'mirror', 'origin:archive'],
    traits: [
      { id: 'vain_reflection', name: 'Vain Reflection', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t * 3} Visitor Attraction; income ×${(1 + t * 0.10).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t * 3 },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.10 },
        ] },
    ],
  },

  squeaking_yellow_idol: {
    id: 'squeaking_yellow_idol', name: 'Squeaking Yellow Idol',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/squeaking_yellow_idol.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/squeaking_yellow_idol_full.png',
    baseValue: 9, equipSlot: 'pouch',
    description: 'A vulcanized rubber idol of indeterminate deity, bright yellow and inexplicably squeaky. Scholars who dismiss it as a bathtub toy have not explained the inscriptions on its base.',
    metadata: { material: 'Organic', size: 'Small', weight: 0.2, type: 'Reliquary', origin: 'Unknown Depths', arcaneResonance: 'Low' },
    tags: ['organic', 'small', 'eccentric', 'idol', 'origin:custodian'],
    traits: [
      { id: 'inexplicable_charm', name: 'Inexplicable Charm', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t * 2} Visitor Attraction (everyone loves the squeaking)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t * 2 }] },
      { id: 'squeaky_footsteps', name: 'Squeaky Footsteps', type: 'negative', category: 'material',
        description: t => `Equipped: Nemesis speed +${t}% (every step announces your location)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.01 }] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  DISPLAY-ONLY LARGE PIECES                           ║
  // ╚══════════════════════════════════════════════════════╝

  shadowless_obelisk: {
    id: 'shadowless_obelisk', name: 'Shadowless Obelisk',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/shadowless_obelisk.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/shadowless_obelisk_full.png',
    baseValue: 50, equipSlot: null,
    description: 'A metre-tall obsidian monolith that casts no shadow regardless of lighting conditions. Light bends around it in ways that should be impossible without a gravitational field.',
    metadata: { material: 'Stone', size: 'Unwieldy', weight: 68.0, type: 'Monument', origin: 'Unknown Depths', arcaneResonance: 'Volatile' },
    tags: ['stone', 'monument', 'unwieldy', 'cursed', 'anomalous', 'origin:archive'],
    traits: [
      { id: 'shadow_anomaly', name: 'Shadow Anomaly', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t * 3} Visitor Attraction; income ×${(1 + t * 0.09).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t * 3 },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.09 },
        ] },
      { id: 'obelisk_curse', name: 'Obelisk Curse', type: 'negative', category: 'arcaneResonance',
        description: t => `Exhibited: Nemesis speed +${t}% (the shadow falls below instead)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.01 }] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  CUSTODIAN ORDER                                     ║
  // ╚══════════════════════════════════════════════════════╝

  overseers_brass_helm: {
    id: 'overseers_brass_helm', name: "Overseer's Brass Helm",
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 38, equipSlot: 'head',
    description: 'A full-coverage brass helmet of Custodian manufacture, fitted with rotating lens arrays and aural amplifiers. The wearer can perceive the mechanical heartbeat of any door lock or gear mechanism within thirty feet.',
    metadata: { material: 'Brass', size: 'Small', weight: 2.4, type: 'Mechanism', origin: 'Custodian Order', arcaneResonance: 'High' },
    tags: ['brass', 'headgear', 'small', 'clockwork', 'origin:custodian', 'mechanical'],
    traits: [
      { id: 'clockwork_perception', name: 'Clockwork Perception', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.07).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.07 },
        ] },
      { id: 'precision_helm_optics', name: 'Precision Optics', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.ceil(t / 2)} Sight Range`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.ceil(t / 2) }] },
      { id: 'tunnel_hearing', name: 'Tunnel Hearing', type: 'negative', category: 'physical',
        description: t => `Equipped: Peek time −${(0.15 + t * 0.01).toFixed(2)}s (sensory focus narrows reaction window)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => -(0.15 + t * 0.01) }] },
    ],
  },

  custodian_sight_array: {
    id: 'custodian_sight_array', name: 'Custodian Sight Array',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 34, equipSlot: 'eyes',
    description: 'A three-lens orbital array of Custodian manufacture, strapped to the head with a brass armature. The lenses rotate independently on spring-loaded bearings to provide simultaneous magnification, thermal, and spectral analysis.',
    metadata: { material: 'Brass', size: 'Small', weight: 1.3, type: 'Mechanism', origin: 'Custodian Order', arcaneResonance: 'High' },
    tags: ['brass', 'optics', 'small', 'origin:custodian', 'mechanical', 'clockwork'],
    traits: [
      { id: 'tri_spectral_analysis', name: 'Tri-Spectral Analysis', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: +${Math.ceil(t / 2)} Sight Range; Peek time +${(t * 0.12).toFixed(2)}s`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [
          { type: 'SIGHT_RANGE', value: t => Math.ceil(t / 2) },
          { type: 'PEEK_TIME',   value: t => t * 0.12 },
        ] },
      { id: 'custodian_precision_display', name: 'Custodian Precision', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.06).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.06 },
        ] },
      { id: 'gear_noise', name: 'Gear Noise', type: 'negative', category: 'material',
        description: t => `Equipped: Nemesis speed +${(t * 0.5).toFixed(1)}% (rotating lenses whir audibly)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.005 }] },
    ],
  },

  custodian_calibration_gauntlets: {
    id: 'custodian_calibration_gauntlets', name: 'Calibration Gauntlets',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 30, equipSlot: 'hands',
    description: 'Elbow-length brass gauntlets studded with micro-adjustment dials across the knuckles. Custodian engineers wore these to calibrate machinery by feel alone — each finger joint contains a precision torque sensor.',
    metadata: { material: 'Brass', size: 'Small', weight: 1.8, type: 'Mechanism', origin: 'Custodian Order', arcaneResonance: 'Low' },
    tags: ['brass', 'gloves', 'small', 'origin:custodian', 'mechanical', 'precision'],
    traits: [
      { id: 'calibrated_grip', name: 'Calibrated Grip', type: 'positive', category: 'physical',
        description: t => `Equipped: Peek time +${(t * 0.22).toFixed(2)}s (perfect grip, steady mind)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => t * 0.22 }] },
      { id: 'engineering_marvel_display', name: 'Engineering Marvel', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'overcalibrated', name: 'Overcalibrated', type: 'negative', category: 'material',
        description: t => `Equipped: Nemesis speed +${(t * 0.5).toFixed(1)}% (dials snag on stonework)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.005 }] },
    ],
  },

  custodian_iron_sabatons: {
    id: 'custodian_iron_sabatons', name: 'Iron Sabatons',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 27, equipSlot: 'boots',
    description: 'Full-coverage iron sabatons with Custodian spring-loaded toe mechanisms for silent heel-to-toe walking. Despite their mass, the spring dampeners produce almost no footfall sound.',
    metadata: { material: 'Brass', size: 'Bulky', weight: 4.2, type: 'Mechanism', origin: 'Custodian Order', arcaneResonance: 'Low' },
    tags: ['material:iron', 'boots', 'bulky', 'origin:custodian', 'mechanical', 'silent'],
    traits: [
      { id: 'spring_step', name: 'Spring Step', type: 'positive', category: 'physical',
        description: t => `Equipped: Nemesis speed −${(t * 2).toFixed(0)}% (spring dampeners muffle footfalls)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => -(t * 0.02) }] },
      { id: 'iron_sabatons_display', name: 'Mechanical Curiosity', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t * 2} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t * 2 }] },
      { id: 'iron_weight', name: 'Iron Weight', type: 'negative', category: 'material',
        description: t => `Equipped: Peek time −${(Math.max(0.05, 0.15 - t * 0.015)).toFixed(2)}s (mass demands focus to move quietly)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => -(Math.max(0.05, 0.15 - t * 0.015)) }] },
    ],
  },

  custodian_winding_key: {
    id: 'custodian_winding_key', name: 'Custodian Winding Key',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 24, equipSlot: 'tool',
    description: "An oversized clockwork winding key of Custodian manufacture, cast in brass with a decorative owl-head at the bow. It fits no single known mechanism — but somehow fits every one it encounters.",
    metadata: { material: 'Brass', size: 'Small', weight: 0.9, type: 'Mechanism', origin: 'Custodian Order', arcaneResonance: 'High' },
    tags: ['brass', 'mechanism', 'small', 'origin:custodian', 'clockwork', 'keys'],
    traits: [
      { id: 'universal_winding', name: 'Universal Winding', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: +${Math.ceil(t / 2)} Sight Range (it finds the mechanism in every wall)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.ceil(t / 2) }] },
      { id: 'clockwork_prestige', name: 'Clockwork Prestige', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t * 2} Visitor Attraction; income ×${(1 + t * 0.05).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t * 2 },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.05 },
        ] },
      { id: 'winding_resonance', name: 'Winding Resonance', type: 'negative', category: 'arcaneResonance',
        description: t => `Exhibited: Nemesis speed +${t}% (the ticking attracts attention from below)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.01 }] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  HOUSE BLACKWATER                                    ║
  // ╚══════════════════════════════════════════════════════╝

  blackwater_flood_hood: {
    id: 'blackwater_flood_hood', name: 'Blackwater Flood Hood',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 22, equipSlot: 'head',
    description: "A riveted leather diving hood sealed with Blackwater tar, designed for the flooded sub-chambers of the House's deepest excavations. The interior is lined with oilskin and smells permanently of the sump.",
    metadata: { material: 'Organic', size: 'Small', weight: 1.1, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Low' },
    tags: ['organic', 'headgear', 'small', 'origin:blackwater', 'waterproofed', 'diving'],
    traits: [
      { id: 'deep_salvage_mystique', name: 'Deep Salvage Mystique', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction (the stench of the depths draws the curious)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'damp_silence', name: 'Damp Silence', type: 'positive', category: 'physical',
        description: t => `Equipped: Nemesis speed −${(t * 1.5).toFixed(1)}% (sealed hood muffles presence)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => -(t * 0.015) }] },
      { id: 'claustrophobic_seal', name: 'Claustrophobic Seal', type: 'negative', category: 'material',
        description: t => `Equipped: Peek time −${(Math.max(0.05, 0.2 - t * 0.02)).toFixed(2)}s (airtight seal induces panic)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => -(Math.max(0.05, 0.2 - t * 0.02)) }] },
    ],
  },

  alchemical_rebreather: {
    id: 'alchemical_rebreather', name: 'Alchemical Rebreather',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 29, equipSlot: 'face',
    description: "A Blackwater alchemical rebreather assembled from copper, brass, and vulcanite, with twin filtration canisters that process noxious atmospheres into breathable mixtures. A pressure gauge on the cheek reads perpetually at 'ADEQUATE'.",
    metadata: { material: 'Brass', size: 'Small', weight: 1.6, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Low' },
    tags: ['brass', 'mask', 'small', 'origin:blackwater', 'alchemical', 'breathing'],
    traits: [
      { id: 'toxic_immunity', name: 'Toxic Immunity', type: 'positive', category: 'physical',
        description: t => `Equipped: Peek time +${(t * 0.20).toFixed(2)}s (filtered air sharpens focus)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => t * 0.20 }] },
      { id: 'alchemical_terror', name: 'Alchemical Terror', type: 'positive', category: 'arcaneResonance',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.05).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.05 },
        ] },
      { id: 'pressure_leak', name: 'Pressure Leak', type: 'negative', category: 'material',
        description: t => `Equipped: Nemesis speed +${(t * 0.5).toFixed(1)}% (venting hiss reveals position)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.005 }] },
    ],
  },

  lead_lined_gauntlets: {
    id: 'lead_lined_gauntlets', name: 'Lead-Lined Gauntlets',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 25, equipSlot: 'hands',
    description: 'Industrial gauntlets sheathed in lead plating, worn by Blackwater salvagers handling volatile alchemical canisters. Impervious to acid, corrosion, and most curses — but exhausting to lift.',
    metadata: { material: 'Stone', size: 'Small', weight: 6.8, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Null' },
    tags: ['material:iron', 'gloves', 'small', 'origin:blackwater', 'industrial', 'heavy'],
    traits: [
      { id: 'corrosion_proof', name: 'Corrosion Proof', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction (engineering marvel of Blackwater durability)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'iron_nerve', name: 'Iron Nerve', type: 'positive', category: 'physical',
        description: t => `Equipped: Nemesis speed −${t}% (lead weight grounds you against fear)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => -(t * 0.01) }] },
      { id: 'dead_weight', name: 'Dead Weight', type: 'negative', category: 'material',
        description: t => `Equipped: Peek time −${(Math.max(0.05, 0.3 - t * 0.03)).toFixed(2)}s (exhausting to lift)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => -(Math.max(0.05, 0.3 - t * 0.03)) }] },
    ],
  },

  lead_soled_waders: {
    id: 'lead_soled_waders', name: 'Lead-Soled Waders',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 20, equipSlot: 'boots',
    description: "Knee-high waders with lead-weighted soles designed to walk flooded corridors without drifting. The lead produces a rhythmic clang that, per the design notes, predators have learned to dread — but the reek of the sump drives visitors from the room.",
    metadata: { material: 'Organic', size: 'Bulky', weight: 7.4, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Null' },
    tags: ['material:iron', 'boots', 'bulky', 'origin:blackwater', 'waterproofed', 'heavy'],
    traits: [
      { id: 'wading_stride', name: 'Wading Stride', type: 'positive', category: 'physical',
        description: t => `Equipped: Nemesis speed −${(t * 1.5).toFixed(1)}% (the weight commands respect)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => -(t * 0.015) }] },
      { id: 'depth_authority', name: 'Depth Authority', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'lead_clatter', name: 'Lead Clatter', type: 'negative', category: 'material',
        description: t => `Exhibited: Nemesis speed +${t * 2}% (the echo of the sump reaches the depths)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => t * 0.02 }] },
      { id: 'flooded_stench', name: 'Flooded Stench', type: 'negative', category: 'material',
        description: t => `Exhibited: −${t * 2} Visitor Attraction (the reek of the sump clears the room)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => -(t * 2) }] },
    ],
  },

  blackwater_dredging_hook: {
    id: 'blackwater_dredging_hook', name: 'Blackwater Dredging Hook',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 19, equipSlot: 'tool',
    description: "A long-handled salvage hook of Blackwater manufacture, weighted at the tip for balanced throw in narrow corridors. The hook face is engraved with the House crest and the motto: 'What sinks, surfaces.'",
    metadata: { material: 'Brass', size: 'Small', weight: 2.1, type: 'Mechanism', origin: 'House Blackwater', arcaneResonance: 'Null' },
    tags: ['material:iron', 'mechanism', 'small', 'origin:blackwater', 'salvage', 'industrial'],
    traits: [
      { id: 'salvage_instinct', name: 'Salvage Instinct', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.ceil(t / 2)} Sight Range (trained eye spots anything recoverable)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.ceil(t / 2) }] },
      { id: 'blackwater_provenance', name: 'Blackwater Provenance', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
      { id: 'iron_bulk', name: 'Iron Bulk', type: 'negative', category: 'material',
        description: t => `Equipped: Peek time −${(0.1 + t * 0.01).toFixed(2)}s (cumbersome in tight spaces)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'PEEK_TIME', value: t => -(0.1 + t * 0.01) }] },
    ],
  },

  blackwater_bilge_charm: {
    id: 'blackwater_bilge_charm', name: 'Blackwater Bilge Charm',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 16, equipSlot: 'pouch',
    description: "A knotted rope charm strung with corroded coins, a sealed pitch vial, and three ship's nails. Blackwater salvagers tied these to bilge pumps to ward off flooding. It smells permanently of brine and machine oil.",
    metadata: { material: 'Organic', size: 'Small', weight: 0.4, type: 'Reliquary', origin: 'House Blackwater', arcaneResonance: 'Low' },
    tags: ['organic', 'charm', 'small', 'origin:blackwater', 'luck', 'maritime'],
    traits: [
      { id: 'maritime_ward', name: 'Maritime Ward', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: Nemesis speed −${(t * 1.5).toFixed(1)}% (old sailor's luck holds)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'NEMESIS_SPEED', value: t => -(t * 0.015) }] },
      { id: 'blackwater_memorabilia', name: 'Blackwater Memorabilia', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.04).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.04 },
        ] },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║  THE GRAND ARCHIVE                                   ║
  // ╚══════════════════════════════════════════════════════╝

  archive_scholars_mortarboard: {
    id: 'archive_scholars_mortarboard', name: "Scholar's Mortarboard",
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 28, equipSlot: 'head',
    description: "The ceremonial mortarboard of a Grand Archive scholar of the third rank, its flat cap stamped with the Archive's cartographic seal and a quill-and-compass emblem. The tassel is woven from preserved map-paper.",
    metadata: { material: 'Organic', size: 'Small', weight: 0.4, type: 'Reliquary', origin: 'The Grand Archive', arcaneResonance: 'Low' },
    tags: ['organic', 'headgear', 'small', 'origin:archive', 'scholarly', 'prestigious'],
    traits: [
      { id: 'scholarly_prestige', name: 'Scholarly Prestige', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t * 2} Visitor Attraction; income ×${(1 + t * 0.06).toFixed(2)} (scholars flock to see it)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t * 2 },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.06 },
        ] },
      { id: 'institutional_memory', name: 'Institutional Memory', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: +${Math.ceil(t / 3) + 1} Sight Range (Archive training guides your search)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.ceil(t / 3) + 1 }] },
    ],
  },

  archive_curators_gloves: {
    id: 'archive_curators_gloves', name: "Curator's White Gloves",
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 18, equipSlot: 'hands',
    description: 'White cotton gloves of Archive manufacture, laundered to institutional perfection. Every librarian of rank wears them when handling fragile specimens. They seem to remember the contours of every artifact ever touched.',
    metadata: { material: 'Organic', size: 'Small', weight: 0.05, type: 'Reliquary', origin: 'The Grand Archive', arcaneResonance: 'Low' },
    tags: ['organic', 'gloves', 'small', 'origin:archive', 'scholarly', 'preservation'],
    traits: [
      { id: 'archival_care', name: 'Archival Care', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.05).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.05 },
        ] },
      { id: 'specimen_sensitivity', name: 'Specimen Sensitivity', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: +${Math.ceil(t / 2)} Sight Range (trained hands sense hidden surfaces)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.ceil(t / 2) }] },
    ],
  },

  archive_soft_soled_shoes: {
    id: 'archive_soft_soled_shoes', name: 'Soft-Soled Inspection Shoes',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 18, equipSlot: 'boots',
    description: 'Catalogue-grade inspection shoes issued to all Archive field researchers — thin leather soles and linen uppers designed for absolute silence in stacks and specimen vaults. The soles have been resoled seventeen times.',
    metadata: { material: 'Organic', size: 'Small', weight: 0.6, type: 'Reliquary', origin: 'The Grand Archive', arcaneResonance: 'Null' },
    tags: ['organic', 'boots', 'small', 'origin:archive', 'scholarly', 'silent'],
    traits: [
      { id: 'stacks_silence', name: 'Stacks Silence', type: 'positive', category: 'physical',
        description: t => `Equipped: Peek time +${(t * 0.15).toFixed(2)}s; Nemesis speed −${t}%`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [
          { type: 'PEEK_TIME',    value: t => t * 0.15 },
          { type: 'NEMESIS_SPEED', value: t => -(t * 0.01) },
        ] },
      { id: 'wear_and_care', name: 'Wear and Care', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction (a century of careful scholarship)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'VISITOR_ATTRACTION', value: t => t }] },
    ],
  },

  archive_classification_rod: {
    id: 'archive_classification_rod', name: 'Classification Rod',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 26, equipSlot: 'tool',
    description: 'A telescoping ivory-and-brass classification rod used by Archive taxonomists to handle and label specimens without contact. The tip glows faintly blue when pointed at any object of significant historical age.',
    metadata: { material: 'Brass', size: 'Small', weight: 0.7, type: 'Mechanism', origin: 'The Grand Archive', arcaneResonance: 'High' },
    tags: ['brass', 'mechanism', 'small', 'origin:archive', 'scholarly', 'measurement'],
    traits: [
      { id: 'age_detection', name: 'Age Detection', type: 'positive', category: 'arcaneResonance',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 2))} Sight Range; +${t * 2} Visitor Attraction`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [
          { type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 2)) },
          { type: 'VISITOR_ATTRACTION', value: t => t * 2 },
        ] },
      { id: 'taxonomic_precision', name: 'Taxonomic Precision', type: 'positive', category: 'lore',
        description: t => `Exhibited: income ×${(1 + t * 0.06).toFixed(2)} (Archive quality commands premiums)`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [{ type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.06 }] },
    ],
  },

  archive_specimen_jar: {
    id: 'archive_specimen_jar', name: 'Archive Specimen Jar',
    sprite:     'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    spriteFull: 'ASSETS/ITEMS/ARTIFACTS/artifact_placeholder.png',
    baseValue: 22, equipSlot: 'pouch',
    description: 'A sealed glass specimen jar containing a perfectly preserved deep-labyrinth organism — the exact nature of which is disputed in three separate Archive monographs. The preservative solution is faint amber and smells of camphor and old paper.',
    metadata: { material: 'Stone', size: 'Small', weight: 1.8, type: 'Reliquary', origin: 'The Grand Archive', arcaneResonance: 'Low' },
    tags: ['stone', 'biological', 'small', 'origin:archive', 'scholarly', 'preserved'],
    traits: [
      { id: 'preservation_marvel', name: 'Preservation Marvel', type: 'positive', category: 'lore',
        description: t => `Exhibited: +${t} Visitor Attraction; income ×${(1 + t * 0.06).toFixed(2)}`,
        conditions: [{ type: 'IS_EXHIBITED' }],
        effects: [
          { type: 'VISITOR_ATTRACTION', value: t => t },
          { type: 'PASSIVE_INCOME_MULT', value: t => 1 + t * 0.06 },
        ] },
      { id: 'observer_training', name: 'Observer Training', type: 'positive', category: 'physical',
        description: t => `Equipped: +${Math.max(1, Math.floor(t / 3) + 1)} Sight Range (cataloguing sharpens the eye)`,
        conditions: [{ type: 'IS_EQUIPPED' }],
        effects: [{ type: 'SIGHT_RANGE', value: t => Math.max(1, Math.floor(t / 3) + 1) }] },
    ],
  },
};

// ── Zone → guaranteed first-artifact mapping ───────────────────────────────────────

const ZONE_FIRST_ARTIFACT = {
  z01: 'chitinous_puzzle_sphere',
  z02: 'brass_compass',
  z03: 'glow_moth_lantern',
  z04: 'clockwork_globe',
  z05: 'book_of_labyrinthine_architecture',
};

const ARTIFACT_POOL = Object.keys(ARTIFACT_CATALOG);

// ── ArtifactRegistry public API ──────────────────────────────────────────────────

const ArtifactRegistry = {

  getById(id) { return ARTIFACT_CATALOG[id] ?? null; },

  getFirstArtifactForZone(zoneId) {
    return ZONE_FIRST_ARTIFACT[zoneId] ?? this.getRandomFromPool(null);
  },

  getRandomFromPool(rng) {
    const idx = rng
      ? rng.int(0, ARTIFACT_POOL.length - 1)
      : Math.floor(Math.random() * ARTIFACT_POOL.length);
    return ARTIFACT_POOL[idx];
  },

  createInstance(typeId, tier = 1) {
    return {
      instanceId:    'art_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      typeId,
      tier:          Math.max(1, Math.min(10, tier)),
      state:         'inventory',
      pedestalIndex: null,
      labSlotIndex:  null,
      equipSlot:     null,
    };
  },

  getDisplayName(instance) {
    const def      = this.getById(instance.typeId);
    const tierName = TIER_NAMES[instance.tier] || '';
    return def ? `${tierName} ${def.name}` : 'Unknown Artifact';
  },

  // Visitor count = floor(log10(gpm)) + 1 at 1 gpm, 2 at 10, 3 at 100…
  calculateVisitorCount(gpm) {
    if (gpm < 1) return 0;
    return Math.floor(Math.log10(gpm)) + 1;
  },

  // GPM from exhibited artifacts. unlockedByTypeId: { typeId: ['traits', 'lore', …] }
  // unlockedKnowledge: { tag: [discoveryId, ...] } from Crucible sacrifices
  calculatePassiveGPM(pedestalSlots, unlockedByTypeId = {}, unlockedKnowledge = {}) {
    const effects = this.getActiveEffects(pedestalSlots, unlockedByTypeId, unlockedKnowledge);
    let baseGpm = 0;
    for (const s of pedestalSlots) {
      if (!s) continue;
      const def = this.getById(s.typeId);
      if (!def) continue;
      const tierMult = TIER_INCOME_MULT[s.tier] ?? 1;
      baseGpm += def.baseValue * tierMult;
      baseGpm += _computeExhibitGPM(def) * tierMult; // always active, no research required
    }
    baseGpm *= effects.passiveIncomeMult;
    const visitors    = Math.max(0, this.calculateVisitorCount(baseGpm) + effects.visitorAttraction);
    const visitorMult = 1 + visitors * 0.05;
    return baseGpm * visitorMult;
  },

  /**
   * Returns the exhibition appeal (Gold/min at tier 1) for the given artifact type.
   * This is always active and does not require field research.
   * Multiply by TIER_INCOME_MULT[tier] to get the per-tier GPM contribution.
   *
   * @param {string} typeId
   * @returns {number}
   */
  getExhibitGPM(typeId) {
    return _computeExhibitGPM(this.getById(typeId));
  },

  /**
   * Evaluates faction conflicts on the exhibition board.
   * Returns an augmented copy of `pedestals`. Slots belonging to conflicting
   * factions (Blackwater vs. Custodian) receive `_suppressedCategories: Set`
   * and `_suppressReason: string`. `_applyTraitsFromSlots` skips any trait
   * whose `category` is in that Set.
   *
   * @param {Array}  pedestals           - artifact instances (may contain null)
   * @param {Object} [unlockedFields={}] - reserved for future rule expansions
   * @returns {Array} augmented pedestal array
   */
  resolvePedestalState(pedestals, unlockedFields = {}) {
    const exhibited     = pedestals.filter(Boolean);
    const hasBlackwater = exhibited.some(a => ARTIFACT_CATALOG[a.typeId]?.tags?.includes('origin:blackwater'));
    const hasCustodian  = exhibited.some(a => ARTIFACT_CATALOG[a.typeId]?.tags?.includes('origin:custodian'));
    if (!hasBlackwater || !hasCustodian) return pedestals;
    // Blackwater/Custodian Schism: suppress arcaneResonance traits on both factions.
    return pedestals.map(slot => {
      if (!slot) return slot;
      const def = ARTIFACT_CATALOG[slot.typeId];
      const isFaction = def?.tags?.includes('origin:blackwater') || def?.tags?.includes('origin:custodian');
      if (!isFaction) return slot;
      return { ...slot, _suppressedCategories: new Set(['arcaneResonance']), _suppressReason: 'Faction Conflict' };
    });
  },

  // Effects from exhibited artifacts (IS_EXHIBITED context).
  // Traits only apply if the 'traits' field has been researched for that typeId.
  getActiveEffects(pedestalSlots, unlockedByTypeId = {}, unlockedKnowledge = {}) {
    const resolvedSlots = this.resolvePedestalState(pedestalSlots, unlockedByTypeId);
    const effects = buildActiveEffects();
    const base    = (() => {
      let g = 0;
      for (const s of resolvedSlots) {
        if (!s) continue;
        const d = this.getById(s.typeId);
        if (d) g += d.baseValue * (TIER_INCOME_MULT[s.tier] ?? 1);
      }
      return g;
    })();
    const ctx = {
      pedestals:          resolvedSlots,
      pedestalCount:      resolvedSlots.length,
      visitorCount:       base < 1 ? 0 : Math.floor(Math.log10(base)) + 1,
      exhibitedArtifacts: resolvedSlots.filter(Boolean),
    };
    _applyTraitsFromSlots(resolvedSlots, effects, unlockedByTypeId, ctx);
    _applyGlobalKnowledge(resolvedSlots, effects, unlockedKnowledge, ctx);
    return effects;
  },

  // Effects from equipped artifacts (IS_EQUIPPED context).
  // equippedSlots: object { slotType: instanceData|null }
  // Traits only apply if 'traits' is unlocked for that typeId.
  getEquippedEffects(equippedSlots, unlockedByTypeId = {}, unlockedKnowledge = {}) {
    const effects  = buildActiveEffects();
    const slotList = Object.values(equippedSlots).filter(Boolean).map(item => ({
      ...item, state: 'equipped',
    }));
    const ctx = {
      pedestals:          [],
      pedestalCount:      0,
      visitorCount:       0,
      exhibitedArtifacts: [],
    };
    _applyTraitsFromSlots(slotList, effects, unlockedByTypeId, ctx);
    _applyGlobalKnowledge(slotList, effects, unlockedKnowledge, ctx);
    return effects;
  },

  // Returns the crucible discovery config for a given typeId, or null.
  getCrucibleDiscovery(typeId) {
    return ARTIFACT_CATALOG[typeId]?.crucibleDiscovery || null;
  },

  // Research rate from lab slots (Research per minute)
  calculateResearchRPM(labSlots) {
    let pts = 0;
    for (const s of labSlots) { if (s) pts += s.tier; }
    return pts; // 1 Research/min per tier point
  },

  // 3→1 merge: returns { remove: [ids], add: newInstance } or null
  tryMerge(inventoryItems) {
    const groups = new Map();
    for (const item of inventoryItems) {
      const key = `${item.typeId}|${item.tier}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    for (const [, group] of groups) {
      if (group.length >= 3 && group[0].tier < 10) {
        const trio = group.slice(0, 3);
        return {
          remove: trio.map(i => i.instanceId),
          add:    this.createInstance(trio[0].typeId, trio[0].tier + 1),
        };
      }
    }
    return null;
  },

  describeTraits(typeId, tier) {
    const def = this.getById(typeId);
    if (!def) return [];
    return (def.traits || []).map(t => ({
      name:        t.name,
      type:        t.type,
      description: typeof t.description === 'function' ? t.description(tier) : t.description,
    }));
  },
};

// ── Global exports ────────────────────────────────────────────────────────────────
window.ArtifactRegistry  = ArtifactRegistry;
window.TIER_NAMES        = TIER_NAMES;
window.TIER_INCOME_MULT  = TIER_INCOME_MULT;
window.EQUIP_SLOTS       = EQUIP_SLOTS;
window.ARTIFACT_CATALOG  = ARTIFACT_CATALOG;
window.ARTIFACT_POOL     = ARTIFACT_POOL;
window.getCurrencySprite = getCurrencySprite;
window.CURRENCY_SPRITES  = CURRENCY_SPRITES;
