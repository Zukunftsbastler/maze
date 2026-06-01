# Role & Context
You are a Lead Game Developer. We are pivoting the core topology of our Hex Maze game. Instead of a single, radial "blob" expanding from the center, we want to restructure the game into a "Directional Journey" (Left to Right), similar to a continuous dungeon crawler. 

# 1. Level Design & Topology (`hex-grid-generator.js`)
We are keeping `Radius` as our core metric for total maze size, but the topology must support both single massive blobs and fused clusters to create unpredictable, sprawling labyrinth shapes.

- **Topology Modes:** The `ProgressionManager` will define the `topologyMode` for the level:
  - `SINGLE_BLOB`: The traditional organic generation. Uses the full `Radius` originating from a center point with edge noise to create a single, massive clump.
  - `FUSED_CLUSTERS` (For later levels): The generator picks 2 or 3 center points that overlap mathematically. It distributes the overall `Radius` area among these clusters. They fuse together during generation to form a single, continuous, highly irregular mega-maze without any loading screens or distinct breaks.
- **Start & Goal Placement (Edge-to-Edge):** To ensure the player must traverse the entire structure, strict placement is required:
  - **Start:** Find the valid cell with the absolute minimum `q` coordinate (the far left edge).
  - **Goal:** Find the valid cell with the absolute maximum `q` coordinate (the far right edge). 
- **Loop Creation (Anti-Dead-End):** To prevent absolute dead-ends, implement a method `_removeRandomWalls(count)`. In early levels, randomly remove a number of internal walls equal to the current `Radius`. 
- **Optimized Path Validation (NO Rejection Sampling):** Do not randomly remove walls and test with A* (too slow). Instead, implement an efficient Distance Mapping heuristic:
  1. Define a `minimumPathLength` threshold (e.g., `Radius * 2.5`).
  2. For each wall removal iteration, run two standard Breadth-First Searches (BFS) on the open passages: one from the Start cell (`distS`) and one from the Goal cell (`distG`).
  3. Iterate through all currently existing internal walls. For a wall separating Cell A and Cell B, calculate the hypothetical new shortest path if this wall were removed:
     `potentialPath = Math.min(distS[A] + 1 + distG[B], distS[B] + 1 + distG[A])`
  4. Filter the list of internal walls to ONLY include those where `potentialPath >= minimumPathLength`.
  5. Randomly select and remove ONE wall from this safe list.
  6. Repeat the BFS and filtering process until `count` walls are removed or no safe walls remain. This guarantees the minimum path length is preserved perfectly.

# 2. Chained Progression (The Sub-Maze Concept)
Instead of scaling up a single massive radius as difficulty increases (which hurts performance), scale by chaining multiple smaller islands together into a single "Level".
- A "Level" now consists of `X` number of Islands (Stages).
- E.g., Level 1 is a single Island. Level 3 might be a sequence of 2 Islands. The player must traverse from Left to Right through Island 1, hit the Goal, instantly load into the Left side of Island 2, and hit the Goal there to complete the Level.
- The `Run Score` and Level Timer run continuously across all Islands within a Level.

# 3. Hazard Zoning (Island Encapsulation)
Because an Island has a clear Entry and Exit, hazards become much easier to manage.
- When generating an Island, the `ProgressionManager` can assign a specific theme or primary hazard ONLY to that specific Island. 
- Example: Island 1 of a Level might have Conveyor Currents, while Island 2 has Crumbling Floors. This isolates mechanical complexity, preventing impossible overlapping mechanics while keeping the player on their toes as they enter a new zone.

# 4. Level Transitions & The "Mega-Dungeon" Aesthetic
Instead of clearing the canvas and state when a level is completed, we want to create the illusion of an ever-expanding, persistent "Mega-Dungeon".

- **State Freezing (Archiving):** When the player reaches the Goal cell of the current level, that entire maze structure becomes "Archived". 
- **Visual Reveal:** Instantly lift the Fog of War for the entire archived level. Reveal all uncollected items, undiscovered topology, and untriggered traps so the player can see what they missed.
- **No Backtracking:** The archived level becomes strictly read-only. The new level must generate immediately to the right of the old one (e.g., the new Start cell is at `old_max_q + 1`). There must be a solid, impassable wall or a one-way threshold preventing the player from physically re-entering the archived maze.
- **Coordinate Shift (CRITICAL):** The generator must accept an `offsetQ` parameter so the math for the new level starts exactly where the old one ended, ensuring continuous hex-grid alignment.
- **No Cross-Contamination:** Hazards, traps, and dynamic elements in the archived level must be completely deactivated. They must not trigger, animate, or consume CPU cycles. The archived level has zero collision detection for the player anymore.
- **Rendering & Camera:** The canvas must continue to render the archived levels alongside the active one. The camera/viewport should smoothly pan to center on the new Start cell, but the player should ideally still see the edge of the previous level on the left side of their screen, reinforcing the massive scale of the dungeon. 

# Technical Implementation Note
To keep the frame rate at 60fps as the Mega-Dungeon grows, consider rendering the "Archived" levels to a static off-screen canvas once, and simply drawing that image to the main canvas, rather than looping through thousands of inactive hex cells every frame.

# Output Instructions
Update `hex-grid-generator.js` and `game-loop.js` to support this `q`-axis directional generation, the strict Left/Right Start/Goal placements, and the multi-island Level progression logic. Ensure the A* pathfinding and distance heuristics still validate the path from the far-left to the far-right before confirming the level generation.