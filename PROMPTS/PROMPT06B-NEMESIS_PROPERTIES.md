# Role & Context
You are a Lead Game Developer working in strictly Vanilla JS. We are defining the fundamental data structure for our "Nemesis" entity. To ensure highly emergent gameplay and deep systemic interactions, the Nemesis must be built on a comprehensive, standardized set of base properties before any modular "Traits" are applied.

# 1. The `BaseNemesisStats` Data Structure
Please create a robust configuration object or class structure (e.g., `NemesisStats`) that EVERY Nemesis instantiation must populate. Implement the following properties:

**A. Senses & Emission**
- `sightRange` (Float): Visual detection radius (blocked by walls - straight line of sight).
- `hearingRange` (Float): Audio detection radius (closest distance calculated by A* - works around corners).
- `mentalPerception` (Float): Absolute detection radius ignoring walls (default: 0).
- `noiseEmission` (Float): Radius of sound the Nemesis generates while moving (allows the player to detect them early).

**B. Physics & Locomotion (Critical for Continuous Movement)**
- `topSpeed` (Float): Maximum movement velocity.
- `acceleration` (Float): How quickly it reaches top speed.
- `turnRate` (Float): How sharply it can change direction vectors.
- `mass` (Float): Used for physics knockback and determining if it triggers heavy pressure plates.
- `terrainAffinity` (Boolean/Enum): Determines if the entity is affected by floor modifiers (swamp, ice) or ignores them.

**C. Combat & Vitals**
- `maxHp` / `currentHp` (Int).
- `respawnTime` (Float): Seconds until respawn if killed (0 = permanent death).
- `meleePower` (Float): Damage dealt upon circle-collision.
- `rangedPower` (Float): Damage dealt by projectiles (default: 0).
- `tenacity` (Float, 0.0 - 1.0): Resistance to stuns and movement-impairing effects.

**D. Visibility & Stealth**
Create a `VisibilityState` enum with the following rules for the renderer:
- `ALWAYS_VISIBLE`: Drawn regardless of Fog of War.
- `PATH_VISIBLE`: Only the Nemesis's planned A* path is drawn on the floor.
- `LOS_ONLY`: Drawn only if a clear raycast exists between Player and Nemesis.
- `PERCEPTION_DEPENDENT`: Drawn only if the Player's stats/upgrades allow it.
- `GHOST`: Completely invisible, detectable only via environmental interaction.
- Assign a `visibilityMode` property to the stats.

**E. Systemic Properties**
- `trapInteraction` (Boolean): Does this entity trigger and suffer from environmental traps (spikes, lasers)?
- `calculateLootValue()` (Method): A function that calculates a monetary/material reward score based on a weighted sum of its offensive stats (Speed, HP, MeleePower, MentalPerception). High-stat enemies drop better loot.

# Output Instructions
Write the vanilla JS code for this base data structure (class or factory function). Also, provide ONE concrete instantiation example (e.g., a "Heavy Juggernaut" configuration) to demonstrate how these values interact to form a specific archetype. Do not modify the rendering logic yet, just establish this data foundation.