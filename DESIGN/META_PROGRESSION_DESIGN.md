# Meta-Progression Design: Deep Systems & Staggered Complexity
*Design Document v2.0 — Hex Maze / The Antiquarian's Expeditions*
*v1 authored as META_PROGRESSION_DESIGN.md; v2 integrates DESIGN_SPEC_V2_MARKET_AND_RESEARCH.md*

---

## 0. Architecture & Structural Notes

### 0.1 World Map Depth Correction
The game has exactly **5 World Map Depths**, each containing ~12 repeatable expeditions. Any system unlock previously gated behind "Depth X" must be re-mapped to **Milestones based on Total Expeditions Completed or Max GPM reached**. Players who grind early depths must be able to unlock advanced Panoptikum/Lab mechanics through sustained economic growth.

### 0.2 The `StatsManager` Architecture (Single Source of Truth)
UI rendering functions (`renderPanoptikum()`, `renderHeader()`, etc.) are **strictly forbidden** from calculating stat totals themselves. A centralized `StatsManager` object runs `recalculateAll()` whenever an artifact is moved, an item is sold, or a tick happens — exactly once per event.

It outputs a clean, frozen object:
```javascript
const GlobalGameStats = {
  gpm: 142.5,
  gpmBreakdown: [{ label: 'Glow-Moth Lantern (T2)', value: 110.0, positive: true }, ...],
  researchPerMin: 12.0,
  visitors: 3,
  sightRangeBonus: 1,
  peekTimeBonus: 0.3,
  nemesisSpeedMult: -0.15,
  panoptikumGold: 4820,
  labResearch: 37,
};
```

`StatsManager` lives in `stats-manager.js`, loaded after `artifact-registry.js` but before `panoptikum.js` and `game-loop.js`. It holds a reference to `PanoptikumCollection` (set via `StatsManager.init(collection)`) and reads only raw data objects — no DOM access.

### 0.3 Granular UI Breakdown Tooltips
Every key metric (GPM in the Panoptikum, Research/min in the Lab) must feature a **hover tooltip** showing the mathematical breakdown. Example:

```
┌────────────────────────────────────────┐
│ Total Income:            142.5 G/min   │
├────────────────────────────────────────┤
│ Glow-Moth Lantern (T2):  + 110.0       │
│ Brass Compass (T1):      +  32.5       │
└────────────────────────────────────────┘
```

---

## 1. Artifact Properties & Spatial Dilemmas

### 1.1 Property Categories

Every artifact property belongs to exactly one category. Category membership determines which Research Equipment unlocks it (see §3).

| Category | Research Tool Required | Examples |
|---|---|---|
| **Material** | Spectrometer | Radiation aura, conductivity, decay |
| **Origin / Lore** | Translation Desk | Faction affinities, charter synergies |
| **Arcane Resonance** | Aether-Meter | Emanation fields, attunement bonds |
| **Physical Form** | Caliper & Scale | Adjacency rules, weight distribution |

### 1.2 Spatial / Adjacency Properties

These properties reference the pedestal *slot index*, making exhibit arrangement a puzzle rather than a formality. Adjacency is defined as slots sharing a wall in a 1D row layout (slot i is adjacent to i±1).

#### Amplification (positive adjacency)
| Property | Rule |
|---|---|
| **Resonant Pair** | +50% VISITOR_ATTRACTION if an artifact with the same Material tag occupies an adjacent slot |
| **Scholarly Halo** | +1 VISITOR_ATTRACTION per adjacent artifact of higher Tier |
| **Exhibition Anchor** | All adjacent artifacts gain +1 PASSIVE_INCOME_MULT, but this artifact generates no passive income itself |
| **Arcane Conduit** | Doubles the Research/min of any artifact placed in the Laboratory while this is exhibited |

#### Suppression (negative adjacency, with upside)
| Property | Rule |
|---|---|
| **Lead Aura** | Silences VISITOR_ATTRACTION of all adjacent artifacts but grants +3 PASSIVE_INCOME_MULT globally — requires Lead-Lined Case (see §2) |
| **Dread Emanation** | Reduces visitor count by 1 but adds a flat +15 Gold/visit bonus |
| **Unstable Matrix** | Adjacent artifacts lose all trait effects but this artifact's Tier counts doubled for Research |
| **Faction Silence (Blackwater/Custodian)** | A Blackwater artifact next to a Custodian artifact: both lose all arcane trait effects |

#### Positional constraints
| Property | Rule |
|---|---|
| **Cornerstone** | Effects only active while placed in slot 0 or the final slot |
| **Centrepiece** | Effects scale with the number of occupied slots on both sides |
| **Isolated Relic** | This artifact's effects double if no adjacent slot is occupied |

### 1.3 Set Bonuses

Sets activate regardless of pedestal order. Progress toward a set bonus is shown in the artifact dossier.

#### Material Sets
| Set | Materials | 2-piece | 3-piece |
|---|---|---|---|
| **Iron Trinity** | Corroded Iron artifacts | +20% PASSIVE_INCOME_MULT | Nemesis speed −10% (passive) |
| **Verdant Catalogue** | Organic / Bone / Wood artifacts | +1 visitor | Every 5th visitor triggers a bonus Gold event |
| **Crystalline Array** | Crystal / Glass / Ceramic artifacts | Sight range +1 | Peek time +20% |
| **Arcane Triad** | Arcane / Ethereal artifacts | Research rate ×1.5 | Unlocks Aether-Meter for free |

#### Origin Sets (Faction)
| Set | Faction | 2-piece | 3-piece |
|---|---|---|---|
| **House Blackwater** | Blackwater | +2 PASSIVE_INCOME_MULT | All Blackwater artifacts grant +5% movement speed in flooded biomes |
| **The Brass Custodian** | Custodian | Nemesis speed −15% | Expedition peek auto-extends 1s per Custodian set member |
| **Grand Archive** | Archive | Lore properties unlock 30% faster | Translation Desk Research cost −50% |

#### Era Sets
| Set | Era | Effect |
|---|---|---|
| **The Founding Age** | Pre-collapse | Each Tier 3+ artifact of this set adds 1 free Laboratory slot |
| **The Arcane Surge** | Mid-period | Aether-Meter research time −25% per piece |
| **The Collapse** | Late-era | Cursed traits revealed on acquisition (skip Spectrometer gate) |

### 1.4 Conflicting / Cursed Properties

The Blackwater/Custodian Schism: if any Blackwater-origin artifact and any Custodian-origin artifact are exhibited simultaneously, all **Arcane Resonance** properties on both are suppressed. A Lead-Lined Case can shield one slot from the conflict.

**Cursed Trait Examples** (hidden until Spectrometer research):
| Artifact | Hidden Curse | Discovery Gate |
|---|---|---|
| The Sludge Vial | −1 visitor per 2 exhibited | Spectrometer |
| The Custodian's Eye | Doubles Nemesis speed in Custodian expeditions | Aether-Meter |
| The Archivist's Seal | Costs 10 Gold/min upkeep drain | Translation Desk |

**Mitigation options:**
1. Ritual Cleansing (5× normal Research cost, permanent)
2. Suppression Furniture (Lead-Lined Case)
3. Complementary artifact (`CURSE_ABSORB` property)
4. Accept and adapt (Vault of Forbidden Studies doubles positive effects on cursed artifacts)

---

## 2. Panoptikum Expansion (Currency Sinks)

### 2.1 Specialised Display Furniture

| Furniture | Cost | Effect |
|---|---|---|
| **Polished Mahogany Case** | 300 G | +10% visitor attraction for this slot |
| **Arcane Pedestal** | 800 G | PASSIVE_INCOME_MULT ×1.5 for this slot |
| **Lead-Lined Display Case** | 1,400 G | Suppresses all aura/emanation effects (positive and negative) from this slot |
| **Floating Suspension Frame** | 2,500 G | Slot counts as adjacent to ALL other occupied slots |
| **Mirror of Attribution** | 6,000 G | Duplicates one chosen property of the artifact to its left |
| **The Grand Vitrine** | 15,000 G | 2× all effects; artifact cannot be moved without a 500 G removal fee |

### 2.2 New Wings / Rooms

Room costs follow: `Cost(n) = 1200 × 2.5^(n-2)` (Room 2 = n=2)

| Room | Cost | Slots | Constraint | Constraint Bonus |
|---|---|---|---|---|
| Entrance Gallery | Free | 3 | None | None |
| Archive Annex | 1,200 G | +2 | Archive/Document/Book tag artifacts only | Research rate +25% globally |
| The Reliquary | 3,000 G | +2 | Tier 5+ only | +3 visitors globally |
| Vault of Forbidden Studies | 7,500 G | +3 | Cursed artifacts only | Curse negatives halved, positives doubled |
| Aetheric Sanctum | 20,000 G | +4 | Arcane Resonance artifacts only | Arcane Resonance effects tripled |
| Collector's Study | 50,000 G | 1 | Tier 9+ only | Generates income as if all rooms were full |

---

## 3. Laboratory & Research Gating

### 3.1 Research Equipment — Purchase Gates

| Equipment | Cost | Unlocks | Passive Bonus |
|---|---|---|---|
| **Spectrometer** | 800 G | Material category properties | Research slots 10% faster |
| **Translation Desk** | 1,500 G | Origin/Lore properties | Archive set activates at 2 pieces |
| **Aether-Meter** | 3,000 G | Arcane Resonance properties | Curses on Arcane artifacts revealed immediately |
| **Caliper & Scale** | 600 G | Physical Form / adjacency properties | Shows adjacency preview lines |
| **Restoration Bench** | 2,200 G | Enables artifact Tier upgrades | +0.5 Research/min per occupied lab slot |
| **Lore Binder** | 4,000 G | Era metadata and Era set bonuses | Translation Desk costs −20% |

### 3.2 Research Flow

```
Artifact acquired
    └─► Dossier shows: Name, sprite, Tier, base value
         ├─► [Material properties: ?????] — unlock with Spectrometer + Research
         ├─► [Lore properties: ?????] — unlock with Translation Desk + Research
         └─► [Arcane properties: ?????] — unlock with Aether-Meter + Research
```

### 3.3 The Aetheric Crucible — Destructive Analysis

A specialized apparatus in the Laboratory for irreversible sacrifice of an artifact in exchange for a permanent **Global Meta-Property**.

**Flow:**
1. Player places an artifact into the Crucible and clicks "Initiate Destructive Analysis"
2. A timer counts down (duration = `tier × 5 minutes`)
3. The artifact is **permanently destroyed** on completion
4. A hidden **Global Knowledge** entry is added to `labState.unlockedKnowledge`
5. **Retroactive effect**: every artifact with the matching tag (Origin or Material) now gains this property in an active, visible state — both artifacts already owned and all future drops

**Implementation structure:**
```javascript
labState.unlockedKnowledge = {
  'origin:blackwater': ['blackwater_resonance'],  // key: tag, value: discovery IDs
  'material:organic':  ['moth_commune'],
}
```

Each artifact definition carries a `crucibleDiscovery` field:
```javascript
crucibleDiscovery: {
  id: 'moth_commune',
  name: 'Moth Commune',
  loreText: '...',
  appliesTo: 'material:organic',
  effect: { type: 'VISITOR_ATTRACTION', value: 1 }
}
```

### 3.4 Gated Merge (3→1 Tier Fusion)

Merging 3 identical artifacts into 1 higher-tier artifact costs a flat fee:

`MergeCost = (50 × Tier) Gold + (5 × Tier) Research`

The merge no longer triggers automatically on drag. Instead, when 3 identical artifacts are detected in inventory after any state change, a **confirmation modal** appears showing the cost. Players can dismiss and choose to sell the surplus at the Market instead.

### 3.5 Artifact Tier Upgrade (Restoration Bench)

| Upgrade | Research Cost | Gold Cost | Cooldown |
|---|---|---|---|
| Tier 1→2 | 15 R | 200 G | 5 min |
| Tier 2→3 | 40 R | 500 G | 15 min |
| Tier n→n+1 | 15 × 2^(n-1) R | 200 × 2^(n-1) G | doubles each tier |

---

## 4. The Surface Market — "The Broker's Antiquarian Stall" (New Screen)

Prevents inventory bloat from grinding. A third primary navigation tab alongside *Panoptikum* and *Laboratory*.

### 4.1 Core Concept
The player sends unwanted artifacts to the surface to be sold to wealthy bourgeois collectors. The **Broker** charges no salary — the Market is a CapEx sink (one-time upgrade purchases).

### 4.2 Market Mechanics

**Sale Slot Queue:** Starts with 2 slots. The player drags an artifact from Lab/Panoptikum reserve into a slot. The artifact enters `LISTED` state.

**Sale Timer:**
```
SaleTime = 60s × Tier × BrokerSpeedMod
```
- BrokerSpeedMod: 0.75 if Gazette Ads purchased, 1.0 otherwise

**Payout on completion:**
```
Payout = BaseArtifactValue × 1.4^(Tier−1) × MarketDemandMod × BiddingWarMult
```
- MarketDemandMod: 1.15 if Velvet Lining purchased
- BiddingWarMult: 2.0 with 10% probability if Art of the Deal purchased

**The artifact is permanently deleted when the sale completes.**

### 4.3 Market Infrastructure Upgrades (Gold Sinks)

| Upgrade | Cost | Effect |
|---|---|---|
| **Velvet Display Lining** | 400 G | +15% final payout for all items |
| **Bourgeois Gazette Ads** | 1,200 G | Sale time −25% |
| **Expanded Stockroom I** | 2,500 G | +1 market sale slot |
| **'The Art of the Deal'** | 6,000 G | 10% chance: sold item triggers Bidding War (2× payout) |
| **Smuggler's Backdoor** | 18,000 G | Allows selling Cursed artifacts without penalty |

---

## 5. The Discovery Pop-up Engine (`OnboardingManager`)

Whenever a system, room, or mechanic becomes available to the player **for the very first time**, the game freezes (income ticker continues) and presents a bespoke explanation modal.

### 5.1 Implementation

`localStorage` key `hexmaze_onboarding` tracks seen events:
```javascript
const OnboardingState = {
  seenMarket:          false,
  seenCrucible:        false,
  seenFirstCurse:      false,
  seenFactionConflict: false,
  seenTierMerge:       false,
};
```

### 5.2 Modal Structure

1. **Tag**: "New Discovery" chip
2. **Icon**: emoji or sprite
3. **Title**: mechanic name
4. **Lore Briefing**: 2 sentences in The Antiquarian's voice
5. **System Rules**: 1–2 bullet points (what to click, what the dilemma is)
6. **Action Button**: `[ Resume Investigations ]` (flips flag to `true`)

---

## 6. Loadout, World Map & Expeditions

### 6.1 Biome Unlocks via Equipment

| Biome | Unlock Requirement | GPM Milestone |
|---|---|---|
| **Dry Archive** (standard) | None | Any |
| **Flooded Vaults** | `boots` slot: artifact with `waterproof` tag | 200 GPM |
| **Gas Pocket Tunnels** | `face` slot: artifact with `filter` tag | 500 GPM |
| **Aetheric Deep** | `head` slot: `shielded` tag + Aether-Meter purchased | 1,000 GPM |
| **The Sealed Sanctum** | head + eyes + face all at Tier 5+ | 5,000 GPM |

### 6.2 Nemesis Counter Consumables (Pouch slot)

| Consumable | Effect | Crafted With |
|---|---|---|
| **Alchemical Fire Flask** | −30s to Nemesis position timer | Spectrometer |
| **Iron Spike** | Slows Nemesis −40% for one depth | Caliper & Scale |
| **Salt Circle Powder** | Prevents Nemesis mutation at next depth | Any equipment |
| **Disruption Lens** | Resets Nemesis to start position | Aether-Meter |
| **Petrified Eye** | Reveals Nemesis on map for 90s | Translation Desk |

### 6.3 Research-Unlocked Charter Modifications

| Research Milestone | Charter Modification |
|---|---|
| Full House Blackwater set researched | Flooded Charter: all Blackwater expeditions start at Depth 3 |
| Full Archive set researched | Extended Briefing: charter reveals one Nemesis mutation in advance |
| Any Tier 8 artifact fully researched | Legendary Depth: +2 depths to any charter at ×2 reward |

---

## 7. Staggered Complexity — The Reveal Roadmap

Complexity gates are **GPM milestones** (not depth-gated).

| Phase | GPM Range | Key Unlock | What Player Discovers |
|---|---|---|---|
| 1 — Foundation | 0–50 | Lab purchase | Simple exhibit, basic income, Research currency |
| 2 — Research Hook | 50–200 | Spectrometer | Material properties; first curse; adjacency previews |
| 3 — Faction Layer | 200–800 | Translation Desk | Factions; Blackwater/Custodian schism; Market available |
| 4 — Aetheric Layer | 800–3,000 | Aether-Meter | Crucible available; cursed Arcane artifacts; biome unlocks |
| 5 — Spatial Mastery | 3,000–15,000 | Reliquary + Vault | Era sets; Grand Vitrine lock-in; full spatial puzzle |
| 6 — Endgame Engine | 15,000+ | Aetheric Sanctum | Collector's Study; Sealed Sanctum biome; full engine |

---

## 8. Pre-Playtest Balancing Framework

### 8.1 Power Budget

`Budget(t) = round(4 × 1.3^(t-1))` per tier.

| Tier | Budget | | Tier | Budget |
|---|---|---|---|---|
| 1 (Grimy) | 4 | | 6 (Remarkable) | 20 |
| 2 (Dusted) | 6 | | 7 (Extraordinary) | 26 |
| 3 (Restored) | 8 | | 8 (Relic) | 33 |
| 4 (Intact) | 11 | | 9 (Mythic) | 42 |
| 5 (Pristine) | 15 | | 10 (Eldritch) | 54 |

### 8.2 Property Weighting Matrix

#### Positive Traits (Budget Cost)
| Property | Base Cost |
|---|---|
| +1 VISITOR_ATTRACTION | 2 pts |
| +10% PASSIVE_INCOME_MULT | 2 pts |
| +1 SIGHT_RANGE | 3 pts |
| +10% PEEK_TIME | 2 pts |
| −10% NEMESIS_SPEED | 3 pts |
| Set bonus contribution | 1 pt |
| Adjacency amplifier | 3 pts |

#### Curses (Budget Credit)
| Curse | Credit |
|---|---|
| −1 VISITOR_ATTRACTION | +2 pts |
| Upkeep drain (−2 Gold/min) | +3 pts |
| Adjacent suppression | +3 pts |
| Faction conflict trigger | +4 pts |
| Nemesis speed +10% | +4 pts |

#### Equipment Gate Discounts
| Gate | Cost Discount |
|---|---|
| No gate | 0 |
| Spectrometer | −0.5 pts |
| Translation Desk | −0.5 pts |
| Aether-Meter | −1 pt |

### 8.3 Exponential Room & Research Cost Formulas

**Rooms:** `Cost(n) = 1200 × 2.5^(n-2)`  
**Research per property:** `ResearchCost = baseCategoryCost × tier`  
**Ritual Cleansing:** `5 × ResearchCost`  
**Merge:** `50 × tier Gold + 5 × tier Research`

### 8.4 Playtesting Flags

| Metric | Warning Threshold |
|---|---|
| Time to first curse discovery | >2 hours → Spectrometer too expensive |
| % players using Lead-Lined Case | <10% → furniture irrelevant |
| % players triggering Blackwater/Custodian conflict | Target: 60% at Phase 3 |
| Avg Tier at first Bench upgrade | Should be Tier 2→3 (not 1→2) |
| Research/min when Aether-Meter first used | Target: 5–10 R/min |
| Avg Gold/min at Market first use | Target: 200–400 GPM |

---

## Appendix: Implementation Execution Order (for Claude Code)

Execute in this strict order to avoid cascading dependency errors:

1. **StatsManager** — build `stats-manager.js`, decouple header UI, add breakdown tooltips
2. **OnboardingManager** — build `onboarding-manager.js`, generic modal structure
3. **The Market View** — HTML/CSS structure, drag-drop queue, timer payout logic
4. **Market Upgrades** — wire CapEx shop options to sale formula
5. **Lab Crucible** — destructive research logic in `artifact-registry.js` and Lab UI

## Appendix: New Tag Values for `artifact-registry.js`

```javascript
// Tags on artifact definitions
tags: ['material:iron', 'origin:blackwater', 'era:founding', 'cursed', 'waterproof', 'filter', 'shielded']

// New effect types (future)
// ADJACENCY_BOOST    — bonus applied to adjacent slot
// ADJACENCY_SUPPRESS — penalty applied to adjacent slot  
// SET_CONTRIBUTION   — meta-tag for set-bonus logic
// UPKEEP_DRAIN       — Gold/min subtracted
// BIOME_UNLOCK       — value: biome key string
// MOVEMENT_FLOODED   — expedition speed bonus in flooded biomes

// New condition types (future)
// IS_CORNERSTONE     — active if slotIndex === 0 or maxSlot-1
// IS_CENTREPIECE     — occupied slots exist on both sides
// IS_ISOLATED        — adjacent slots are empty
// FACTION_CONFLICT   — checks all exhibited artifacts' origin tags
// IN_ROOM            — active if pedestal belongs to named room
```
