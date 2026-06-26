Please implement a major graphics and gameplay mechanics update for the Hex Maze project. Review the codebase and apply the following changes:

1. Currency Sprites & Incremental Gold Generation
- Replace the current circle graphics for gold with sprite rendering.
- Scan the `ASSETS/CURRENCY/` directory. Evaluate `single_gold_coin.png` and `single_gold_coin_full.png` and choose the one that reads better visually when scaled down into a hex cell.
- Implement an exponential gold distribution system based on the maze's `Radius`. As the maze gets larger, the total gold should scale exponentially.
- Distribute the gold highly unevenly: scatter single coins across regular paths, but concentrate large amounts (incremental game style) in specific dead-ends or hidden corners.
- Automatically find and use appropriately named sprites in `ASSETS/CURRENCY/` (e.g., piles, sacks, or chests) for these high-concentration nodes.

2. Dynamic Artifact Spawning
- Remove any existing meaningless items scattered in the mazes.
- Ensure exactly ONE guaranteed artifact spawns per Expedition, exclusively located in the final depth of the run.
- Use `ASSETS/ITEMS/ARTIFACTS/chitinous_puzzle_sphere.png` as the first implementation example. Place it strategically within the hex grid, reachable but off the optimal path.
- Expand the loot pool for subsequent expeditions by utilizing additional sprites from the `ASSETS/ITEMS/ARTIFACTS/` subfolder.
- Implement a dynamic, scaling spawn logic for bonus artifacts: As the player completes more runs and progresses to higher expedition tiers, the overall spawn rate and variety of artifacts should increase.
- Within a single expedition, bonus artifacts can occasionally appear in earlier mazes, but the probability of finding them should scale up significantly as the player reaches deeper levels.

3. The Panopticon (Curiosity Cabinet) Inventory & UI
- Build an inventory UI in the Panopticon/Cabinet scene to store collected artifacts. Design it as a grid overview with a scroll function to accommodate a growing collection.
- Implement drag-and-drop functionality: The player must be able to drag artifacts from the inventory and drop them onto empty exhibition pedestals (Stelen). 
- State Management: Dropping an artifact onto a pedestal changes its state to "exhibited", making its effects active.

4. Passive Income & Artifact Merging
- Implement a merge system: If the player combines 3 identical artifacts of the same Tier, they merge into 1 artifact of the next Tier. Allow merging up to Tier 10. Use these thematic rarity names: 1: Grimy, 2: Dusted, 3: Restored, 4: Intact, 5: Pristine, 6: Remarkable, 7: Extraordinary, 8: Relic, 9: Mythic, 10: Eldritch.
- Exhibited artifacts must generate passive income (Gold per minute) that calculates even while the player is actively on a run. Use the concept: `Income = BaseArtifactValue * TierMultiplier * VisitorBonus`.
- Implement a basic "Visitor" metric scaling with the total Tier value of all exhibited artifacts.

5. Extensible Trait System: Benefits, Curses & Conditions
- Architect a highly modular, data-driven system for artifact traits. Do not hardcode these effects; prepare an extensible structure.
- Traits must include both Positive Benefits (e.g., +Movement Speed, +Sight Range in Fog of War, +Visitor Attraction) AND Negative Effects/Curses. 
- Plausible examples of Negative Effects: "-1 Sight Range in Dense Fog", "Increases Nemesis base movement speed by 5%", or "Reduces base peek time by 0.5s".
- Traits must be tied to a versatile Condition System. The architecture must support conditions such as: "Is Exhibited", "Is NOT Exhibited", "Panopticon is Full", "Minimum X Visitors Present", "Maximum X Visitors Present", or tied to the categorical tags below.
- Traits should vary with increasind tier. 
- Write clean, decoupled functions for evaluating these conditions and applying the traits to the game state.

6. Lore & Metadata Architecture
- Implement a rich metadata object for every artifact type. This data will be used later for UI tooltips and constellation/synergy calculations.
- Each artifact must have a thematic short description matching its name and visual appearance.
- Include structured categorical tags. Example structure:
  - `Material`: (e.g., Organic, Brass, Stone, Ethereal)
  - `Size`: (e.g., Small, Bulky, Unwieldy)
  - `Weight`: (Numerical or categorical value)
  - `Type`: (e.g., Mechanism, Reliquary, Biological)
  - `Origin/History`: (e.g., The Grand Archive, House Blackwater, Unknown Depths)
  - `Arcane Resonance`: (e.g., Null, Low, High, Volatile)
- Ensure the `chitinous_puzzle_sphere` has this metadata fully populated as the template example.
- Prepare at least one artifact for each expedition on the first level in this way. 