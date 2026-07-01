# Design Specification v2.0: Economy Valves, Destructive Research & Onboarding
*Target Project: Hex Maze / The Antiquarian's Expeditions (Vanilla JS)*

---

## 0. Context & Structural Realignment

This document amends and extends `META_PROGRESSION_DESIGN.md`. 
**CRITICAL ARCHITECTURAL CORRECTION:** The game features exactly **5 World Map Depths**, each containing ~12 repeatable expeditions. Therefore, any system unlocks previously mapped to "Depths 1 through 9" must strictly be re-mapped to **Milestones based on `Total Expeditions Completed` OR `Max GPM (Gold Per Minute) reached`**. 

Do not gate fundamental meta-systems behind high Depths; allow players who enjoy grinding early Depths to unlock advanced Panoptikum/Lab mechanics through sustained economic growth.

---

## 1. The Surplus Valve: "The Surface Market" (New Screen)

To prevent inventory bloat from grinding, introduce a third primary navigation tab alongside *Panoptikum* and *Laboratory*: **The Surface Market** (narratively: *The Broker’s Antiquarian Stall*).

### 1.1 Core Concept
The player sends unwanted artifacts to the surface to be sold to wealthy bourgeois collectors. 
* **The Broker** handles the sales. The Broker receives **no recurring salary** (no Gold/min drain).
* Instead, the Market acts as a permanent **Capital Expenditure (CapEx) Sink**. The player buys static upgrades for the shop to increase sale speed and final payout.

### 1.2 Market Mechanics & Loop
1. **The Stockroom (Queue):** The Market has a fixed number of sale slots (starts at 2). The player drags an artifact from the Lab/Panoptikum reserve into a market slot.
2. **The Sale Timer:** Once placed, an artifact enters the `LISTED` state. A timer counts down. 
   $$\text{SaleTime} = \text{BaseTime} \times \text{TierMultiplier} \times \text{BrokerSpeedMod}$$
3. **The Sale Event:** When the timer hits 0, the artifact is permanently deleted, and Gold is deposited into the player's account.
   $$\text{Payout} = \text{BaseArtifactValue} \times 1.4^{\text{Tier}-1} \times \text{MarketDemandMod}$$
   *(Payouts must dynamically scale with the player's current progression stage so selling remains economically viable in late-game).*

### 1.3 Market Infrastructure Upgrades (Gold Sinks)
Players upgrade the Market Menu itself to improve the Broker's efficiency:

| Upgrade Name | Cost (Gold) | Effect | Lore Flavour |
|---|---|---|---|
| **Velvet Display Lining** | 400 G | +15% final Payout for all items | *"Makes even corroded iron look like a relic of the High Kings."* |
| **Bourgeois Gazette Ads** | 1,200 G | Sale Time reduced by 25% | *"Attracts collectors who have more money than historical taste."* |
| **Expanded Stockroom I** | 2,500 G | +1 Market sale slot | *"Renting the cellar next door."* |
| **'The Art of the Deal' (Treatise)** | 6,000 G | +10% chance a sold item triggers a "Bidding War" (2x Payout) | *"Chapter 4: Creating artificial scarcity among the gentry."* |
| **Smuggler's Backdoor** | 18,000 G | Allows selling `Cursed` items without public panic penalties | *"Some buyers specifically pay extra for the lingering dread."* |

---

## 2. Destructive Research: "The Aetheric Crucible" 

In addition to standard research (which preserves the artifact) and the 3-to-1 Tier Merge, the Laboratory gains a specialized apparatus: **The Crucible**.

### 2.1 The Sacrifice Mechanic
* The player places an artifact into the Crucible and selects **"Initiate Destructive Analysis"**.
* **The cost:** The artifact is **permanently destroyed** upon completion.
* **The reward:** It unlocks a hidden, high-tier **Global Meta-Property** tied to that artifact's specific `Origin` or `Material` tag. Normal research can *never* uncover these specific traits.

### 2.2 Global Trait Inheritance
Once a Destructive Research project completes:
1. The discovered property is added to the global `UnlockedKnowledge` registry.
2. **Retroactive & Future effect:** From that moment on, *every* artifact generated or already owned carrying that specific tag gains this property in an active, visible state.

*Example:* > Sacrificing a Tier-4 `House Blackwater` artifact destroys it, but permanently unlocks the global knowledge **"Osmotic Seals"**. Now, every Blackwater artifact in the player's possession (and all future drops) automatically grants `+5% movement speed in flooded biomes` when equipped.

### 2.3 Gating the 3-to-1 Merge
To prevent the 3-to-1 Tier Fusion from rendering standard research obsolete:
* Merging 3 identical artifacts into 1 higher-tier artifact **must cost a flat fee of Gold and Research**.
* Formula: `MergeCost = (BaseGold * Tier) + (BaseResearch * Tier)`
* This preserves the friction: *Do I spend money to consolidate my inventory, or do I sell the surplus at the Market?*

---

## 3. UI Integrity & Single Source of Truth

With spatial modifiers, curses, furniture, and global lab bonuses interacting, the UI will break unless strictly decoupled from state calculations.

### 3.1 The `StatsManager` Architecture
* **Strict Rule:** UI rendering functions (e.g., `renderPanoptikum()`, `renderHeader()`) are **strictly forbidden** from calculating stat totals themselves.
* Implement a centralized `StatsManager` object. Whenever an artifact is moved, an item is sold, or a tick happens, `StatsManager.recalculateAll()` runs *once*.
* It outputs a clean, frozen object:
  ```javascript
  const GlobalGameStats = {
    gpm: 142.5,
    researchPerMin: 12.0,
    sightRange: 4,
    nemesisSpeedMult: 0.85,
    // ...all active derived stats
  }

```

### 3.2 Granular UI Breakdown Tooltips

Every key metric displayed in the UI (specifically GPM in the header and inside the Panoptikum) must feature a **hover/tap Tooltip** showing the exact mathematical breakdown.

*UI Example for GPM display:*

```text
┌────────────────────────────────────────┐
│ Total Income:            142.5 G/min   │
├────────────────────────────────────────┤
│ Base Artifacts:          + 110.0       │
│ Mahogany Furniture (x2): +  22.0       │
│ Lead Aura Synergy:       +  30.0       │
│ Upkeep Curses:           -  19.5       │
└────────────────────────────────────────┘

```

---

## 4. The Discovery Pop-up Engine (`OnboardingManager`)

Whenever a system, room, or mechanic becomes available to the player **for the very first time**, the game must freeze play and present a bespoke explanation modal.

### 4.1 Implementation Logic

Maintain an object in `localStorage` tracking seen onboarding events:

```javascript
const OnboardingState = {
  seenMarket: false,
  seenCrucible: false,
  seenFirstCurse: false,
  seenFactionConflict: false,
  seenTierMerge: false
};

```

### 4.2 Trigger & Modal Rules

When a trigger condition is met (e.g., the player purchases the *Spectrometer*, or opens the *Market tab* for the first time), check `OnboardingState`. If `false`:

1. Pause the game loop (`cancelAnimationFrame` or set `state.paused = true`).
2. Render a centered overlay modal featuring:
* **Header:** Title of the newly unlocked mechanic.
* **Icon/Sprite:** Visual representation.
* **The Lore Briefing:** 2 sentences written in the voice of *The Antiquarian's mentor or personal journal*.
* **The System Rule:** 1–2 bullet points explaining strictly *what to click* and *what the dilemma is*.
* **Action Button:** `[ Resume Investigations ]` (flips flag to `true`, unpauses game).



---

## 5. Execution Priority for Claude Code

Do not attempt to write all systems simultaneously. Execute in this strict order:

1. **Refactor State:** Build `StatsManager` and decouple the header UI to read from it. Add the breakdown tooltips.
2. **Onboarding Engine:** Build the generic `OnboardingManager` modal structure so future steps can easily plug their text into it.
3. **The Market View:** Build the HTML/CSS structure for the Market screen, the inventory drag-and-drop queue, and the basic timer payout logic.
4. **Market Upgrades:** Wire the Market CapEx shop options to the sale formula.
5. **Lab Crucible:** Add the "Destroy for Global Knowledge" logic to `artifact-registry.js` and the Lab UI.