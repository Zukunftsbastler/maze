# Role & Context
You are a Lead Game Developer working in strictly Vanilla JS. We are massively upgrading our Hex Maze Game Prototype. We are focusing entirely on gameplay depth through Fog of War, dynamic level topology, a rigorous math-based scoring system, and environmental hazards. 
CRITICAL: Do NOT implement any AI enemies or patrolling entities at this stage. Focus solely on environment, player mechanics, and progression.

# 1. Advanced Difficulty Scoring & The "Peek" Mechanic
Levels must be assigned a precise `Difficulty Score` generated before the run begins. Implement a scoring formula in `ProgressionManager`.
- **Base Score:** Use a formula like `Base = (Radius * 10) + (minimumPathLength * 5)`.
- **The "Peek" Modifier:** At the start of a run, the active maze and ideal A* path are fully revealed. 
  - Standard peek is `2.0s` (Multiplier `1.0x`).
  - Reducing peek time to `1.0s` applies a `1.5x` multiplier to the Base Score. A `0s` peek applies a `2.0x` multiplier.
  - Hiding the A* path during the peek adds a flat bonus.
- **Fog of War Modifier:** A `sightRange` of 1 is brutal (`2.0x` multiplier), while `sightRange` of 4 is standard (`1.0x`).
- **Final Score:** Display this `Difficulty Score` in the Pre-Run UI.

# 2. Pre-Run Summary & Non-Linear Progression (`ProgressionManager`)
Decouple "Level" from "Radius". Difficulty must scale non-linearly (e.g., Lvl 1: R3/Full Sight, Lvl 2: R4/Full Sight, Lvl 3: R5/Full Sight, Lvl 4: R4/Limited Sight). 
- **The "One Mechanic" Rule:** Starting from Level 4, introduce at most ONE new hazard or mechanic per level. The order of introduced mechanics must be randomized from the available pool.
- **Pre-Run UI:** Before the player starts moving, show an overlay overlay containing:
  - Current Level & Expected Difficulty Score.
  - A brief, 1-2 sentence description of any newly introduced mechanic for this level. Once introduced, the game assumes the player knows it for all future levels.
  - mechanics present in the coming maze. 
  - A "Start Run" button that triggers the initial "Peek" phase.

# 3. Fog of War, Line of Sight & The 3-State Visibility (`hex-renderer.js` & `hex-cell.js`)
We must implement a strict 3-state visibility system for the `activeIsland` to create a true Fog of War, while preserving the archived "Mega-Dungeon" aesthetic.

**A. The 3 Visibility States (Add to `HexCell`):**
1. **Hidden (Unexplored):** The cell has never been seen. Rendered as pure black void (`#000000`).
2. **Revealed (Memory):** The cell was seen previously but is not currently in the player's line of sight. Render the floor dimmed/darkened, and walls with no neon glow (just flat, muted colors). Enemies or hazards in these cells are invisible.
3. **In Line of Sight (Active):** The cell is currently within the player's `sightRange` and not blocked by walls. Rendered fully bright (neon walls, standard floors). 

**B. The Visibility Update Loop (`game-loop.js`):**
- Every frame or movement tick, calculate a Hex-based Raycast or Wall-Aware Breadth-First-Search up to `sightRange`.
- Mark all cells in this radius as `In Line of Sight`. 
- Crucially, mark them as permanently `Revealed` so they don't revert to `Hidden` when the player walks away.
- Cells that fall out of the radius transition from `Active` back to `Revealed`.

**C. The "Peek" Phase Override:**
- When the level starts, force the entire `activeIsland` to render as `Revealed` (with the A* path highlighted) for the duration of the peek timer. 
- Once the timer expires, reset all cells (except those immediately around the player) to `Hidden`.

**D. Mega-Dungeon Preservation (CRITICAL):**
- The Fog of War logic applies ONLY to the `activeIsland`. 
- Archived islands (the previous levels) MUST ignore all Fog of War calculations. They are permanently locked to the `Revealed` state (or fully visible) and simply drawn to their static off-screen canvas. Do not run raycasts on archived islands.

# 4. Base Stats & Post-Run Screen (`game-loop.js`)
- **Movement Speed:** Reduce the player's initial base movement speed to allow room for speed upgrades.
- **Post-Run Scoring Screen:** When the player reaches the goal, display a summary screen:
  - `Max Score` = The Difficulty Score + Length of the ideal A* path.
  - `Penalty` = Number of unique non-ideal tiles visited.
  - `Run Score` = Max Score - Penalty. 
  - Add this `Run Score` to a persistent `Total Global Score` displayed in the UI.