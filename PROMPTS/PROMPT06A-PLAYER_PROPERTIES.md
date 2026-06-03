# Role & Context
You are a Lead Game Developer working in strictly Vanilla JS. We are massively expanding the `Player` entity to serve as the foundation for a deep RPG progression system. The player needs a comprehensive "Character Sheet" architecture where core attributes drive derived physical and sensory stats, heavily inspired by classic tabletop RPG mechanics.

# 1. The RPG `PlayerStats` Data Structure
Refactor the `Player` class to include a robust state object (e.g., `this.stats`). Implement the following properties. 

**A. Core Progression (The Meta Layer)**
- `level` (Int): Current player level.
- `currentXp` (Int): Accumulated experience points.
- `xpToNextLevel` (Int): The threshold to reach the next level (should scale exponentially or via a curve).
- `skillPoints` (Int): Unspent points awarded upon leveling up, used to upgrade Core Attributes.

**B. Core Attributes (The Primary Stats)**
These are the foundational RPG stats that the player can upgrade. They should start at a baseline (e.g., 10).
- `strength` (Int): Drives physical mass, melee power, and knockback resistance.
- `dexterity` (Int): Drives movement speed, acceleration, handling, and evasion.
- `constitution` (Int): Drives max HP, stamina pool, and physical resistances.
- `focus / wisdom` (Int): Drives sight radius, passive trap detection, and cooldown reduction.

**C. Derived Locomotion & Physics**
These must be calculated dynamically based on Core Attributes and current Modifiers.
- `baseSpeed` (Float): Derived from `dexterity`.
- `acceleration` (Float): Derived from `dexterity`.
- `handling / friction` (Float): Derived from `dexterity`.
- `mass` (Float): Derived from `strength`.
- `staminaMax` / `currentStamina` (Float): Derived from `constitution`.
- `staminaRegen` (Float): How fast stamina recovers per second.

**D. Perception & Stealth (Fog of War & Nemesis Interaction)**
- `sightRadius` (Float): Derived from `focus`.
- `stealthProfile / noiseEmission` (Float): The radius of sound the player makes. Higher `dexterity` reduces this.
- `passivePerception / trapDetection` (Float): Radius at which hidden traps become faintly visible. Derived from `focus`.
- `sixthSense` (Float): Radius to see entities through walls (default 0).

**E. Vitals, Defenses & Resistances**
- `maxHp` / `currentHp` (Int): Derived from `constitution`.
- `armor` (Int): Flat damage reduction from hits.
- `evasionChance` (Float, 0.0 - 1.0): Chance to completely dodge an attack or trap. Derived from `dexterity`.
- `resistances` (Object): Percentage-based damage mitigation for specific damage types (e.g., `{ kinetic: 0.1, thermal/laser: 0.0, toxic: 0.0 }`).
- `tenacity` (Float, 0.0 - 1.0): Resistance to stuns/slows.

**F. Combat & Offense**
- `critChance` (Float, 0.0 - 1.0): Base chance to deal X times damage.
- `critEffect`(Float) crit modifier, starting at 2.
- `meleePower` (Float): Derived from `strength`.
- `knockbackPower` (Float): Force applied to enemies upon collision.

**G. Utility & Economy**
- `luck` (Float): Affects loot drops, critical hits, and occasionally surviving lethal blows with 1 HP.
- `interactionRadius` (Float): Magnetic radius for picking up loot/keys. Does not work through walls. 
- `currency / sparks` (Int): Money used for meta-progression or mid-level shops.
- `inventory` (Object): Stores keys, consumables, and active ability charges (e.g., `{ redKeys: 0, phaseDashes: 1 }`).

# 2. The Calculation & Modifier Engine
- **`recalculateDerivedStats()`:** Create a method that fires whenever a Core Attribute changes. It updates all derived stats (e.g., `this.stats.maxHp = this.stats.constitution * 5`).
- **`ModifierManager`:** Implement a system to handle temporary buffs/debuffs from items or traps. 
  - E.g., `applyModifier('baseSpeed', multiplier, durationInMs)`.
  - The game loop must continuously calculate `getEffectiveStat(statName)` by combining the derived base stat with all currently active modifiers, and clean up expired modifiers.

# Output Instructions
Write the vanilla JS code for this updated `Player` class. Include the Core Attributes, the derived stats calculation logic, the Modifier Manager, and a basic `addXp(amount)` method that triggers a level up when the threshold is reached. Do not modify external rendering logic yet.