# Role & Context
You are a Lead Game Developer working in strictly Vanilla JS. We are massively upgrading our Hex Maze Game Prototype. We are focusing entirely on gameplay depth through Fog of War, dynamic level topology, a rigorous math-based scoring system, and environmental hazards. 
CRITICAL: Do NOT implement any AI enemies or patrolling entities at this stage. Focus solely on environment, player mechanics, and progression.

# 1. Difficulty Scoring & The "Peek" Mechanic
Levels must be assigned a `Difficulty Score` generated before the run begins.
- **Base Score:** Derived primarily from the `Radius` and `minimumPathLength`.
- **The "Peek" Modifier:** At the very start of a run, the ENTIRE maze and the ideal A* path are fully revealed to the player for a default of `2.0 seconds` before the Fog of War sets in. 
  - Reducing this peek time (e.g., to 1.0s or 0s) or removing the A* path from the peek drastically increases the Difficulty Score multiplier.
- **Fog of War Modifier:** A smaller `sightRange` drastically increases the Difficulty Score.

# 2. Pre-Run Summary & Non-Linear Progression (`ProgressionManager`)
Decouple "Level" from "Radius". Difficulty must scale non-linearly (e.g., Lvl 1: R3/Full Sight, Lvl 2: R4/Full Sight, Lvl 3: R5/Full Sight, Lvl 4: R4/Limited Sight). 
- **The "One Mechanic" Rule:** Starting from Level 4, introduce at most ONE new hazard or mechanic per level. The order of introduced mechanics must be randomized from the available pool.
- **Pre-Run UI:** Before the player starts moving, show an overlay overlay containing:
  - Current Level & Expected Difficulty Score.
  - A brief, 1-2 sentence description of any newly introduced mechanic for this level. Once introduced, the game assumes the player knows it for all future levels.
  - mechanics present in the coming maze. 
  - A "Start Run" button that triggers the initial "Peek" phase.

# 3. Fog of War & Line of Sight (`hex-renderer.js`)
- **Mechanic:** After the initial "Peek", the maze is shrouded in darkness.
- **Discovery:** As the player moves, hexes within a `sightRange` are permanently revealed. Being revealed is different from "currently in sight". 
- **Wall-Aware:** Visibility MUST be blocked by walls. Implement a hex-based raycast or wall-aware breadth-first search for the vision cone.

# 4. Base Stats & Post-Run Screen (`game-loop.js`)
- **Movement Speed:** Reduce the player's initial base movement speed to allow room for speed upgrades.
- **Post-Run Scoring Screen:** When the player reaches the goal, display a summary screen:
  - `Max Score` = The Difficulty Score + Length of the ideal A* path.
  - `Penalty` = Number of unique non-ideal tiles visited.
  - `Run Score` = Max Score - Penalty. 
  - Add this `Run Score` to a persistent `Total Global Score` displayed in the UI.