Act as an Expert Vanilla JS Game Developer and Game Systems Designer. We are implementing a major update to our meta-progression, specifically "The Faction Layer & Lore Conflicts" combined with a dynamic "Smart Loot Generation" system.

We have recently refactored our UI and fixed performance issues. Your task is strictly to upgrade the backend logic in `artifact-registry.js` (and add a new `LootManager` utility). Do NOT modify any UI or DOM files (like panoptikum-ui.js).

Please execute the following 4 phases in order:

### PHASE 1: Massive Artifact Database Expansion
Currently, our `ARTIFACT_DEFINITIONS` has severe gaps (e.g., 0 items for `head`, `face`, and `boots`). The LootManager will crash if it tries to drop items for these slots.
1. Add at least 15 NEW lore-rich artifacts to `ARTIFACT_DEFINITIONS`.
2. Ensure that EVERY `equipSlot` (`head`, `eyes`, `face`, `hands`, `tool`, `pouch`, `boots`) has at least 2 to 3 distinct artifacts available.
3. Distribute these artifacts logically across our three main factions (`origin:blackwater`, `origin:custodian`, `origin:archive`). 
   - Examples to include: "Lead-Soled Waders" (boots, blackwater, negative visitor curse), "Overseer's Brass Helm" (head, custodian), "Alchemical Rebreather" (face, blackwater).
4. Upgrade ALL artifact definitions (old and new) to include a `tags` array (e.g., `['origin:blackwater', 'arcane', 'material:iron']`).
5. Expand the `traits` schema so each trait explicitly defines a `category` (e.g., 'lore', 'material', 'arcaneResonance', 'physical').
6. Provide a separate file with a description for each newly created artifact so that I can provide sprites. Make sure that working placeholders exist as long as these sprites are not yet provided. 

### PHASE 2: Implement the Rules Engine (`resolvePedestalState`)
We need `artifact-registry.js` to evaluate spatial and faction conflicts on the exhibition board.
1. Create a new static core method: `ArtifactRegistry.resolvePedestalState(pedestals, unlockedFields)`. 
2. Implement "The Blackwater / Custodian Schism" logic: Iterate through the pedestals. If at least one exhibited artifact has `'origin:blackwater'` AND at least one has `'origin:custodian'`, a conflict is triggered.
3. When triggered, dynamically add a `suppressed: true` flag (and `suppressReason: 'Faction Conflict'`) to any traits of the conflicting artifacts that belong to the `category: 'arcaneResonance'`.
4. Refactor `ArtifactRegistry.calculatePassiveGPM()` (and any other relevant calculators) to pass the raw `pedestals` array through `resolvePedestalState()` first, strictly ignoring any traits marked as `suppressed: true`.

### PHASE 3: Implement `LootManager`
Design and implement a new utility class, `LootManager`, responsible for generating artifacts at the end of an expedition.
1. **Faction-Weighted Probabilities:** Drops must be influenced by the `factionTheme` of the expedition. 
   - `'origin:blackwater'` heavily weights drops toward `boots`, `face`, and `hands` (toxic/flooded gear).
   - `'origin:custodian'` heavily weights drops toward `tool`, `eyes`, and `head` (clockwork/mechanical gear).
   - `'origin:archive'` heavily weights toward `pouch` and `tool` (scholarly gear).
2. **The "Smart Pity" System (Milestone Guarantees):** Inject a `playerInventorySummary` object into the generator. 
   - By Depth 3, the algorithm must dynamically multiply the drop weight (e.g., +300 weight) of any equipment slot the player has NEVER acquired. It must mathematically guarantee that a player running a balanced mix of expeditions will see all 7 slots filled by the end of Depth 3.
3. **Depth 4 "Upgrade RNG":** If `currentDepth >= 4`, check the player's equipped Tiers. Bias the RNG to drop an artifact matching a slot where the player's current gear is falling behind in Tier.

### PHASE 4: Integration
- Write the `LootManager.generateLoot(depth, faction, inventorySummary)` function using a robust "Weighted Random Selection" mathematical model.
- Hook this cleanly into our existing `ArtifactRegistry.createInstance` method.
- Add clear JSDoc comments explaining the weight shifts and conflict resolution logic.