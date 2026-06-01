# Role & Context
You are an expert Vanilla JS game developer. We are upgrading our Hex Maze Generator into a playable Game Prototype. 
CRITICAL: The existing "Analysis Mode" (generating mazes, viewing the A* solution path, tweaking parameters) MUST remain fully functional as a toggleable mode or secondary view. 

# Core Objectives
Implement a "Play Mode" with continuous player movement, collision detection, and a level progression system, ensuring a fluid real-time experience to accommodate future action/combat mechanics.

# 1. Generator Updates (`hex-grid-generator.js`)
- **Start Wall Removal:** Modify the generation logic so the outer boundary wall at the `isStart` cell is explicitly removed, creating a visible entrance from the outside void into the maze.
- **Fix Winding Factor:** The current `windingFactor` logic in `_runMazeAlgorithm` feels ineffective. Please audit and rewrite the directional bias logic so that a high winding factor actively forces long, serpentine corridors and heavily reduces early branching.

# 2. Game Mode & Progression (`index.html` & Game Loop)
- **State Management:** Add a UI toggle to switch between "Analysis Mode" (current behavior) and "Play Mode".
- **Starting Conditions (Play Mode):** Force initialization with `Radius = 3`, `Cell Size = 30`, and a completely random Seed.
- **Level Progression:** When the player's marker reaches the `isGoal` cell, automatically increment the `Radius` by 1, generate a new random seed, and instantly start the next level.
- **Game HUD (Overlay):** In Play Mode, display:
  - Current Level (Calculated as `Radius - 2`).
  - Level Timer (Time elapsed since the current level started).
  - Efficiency Score (Player's actual traveled distance compared to the ideal A* path length).

# 3. Player Movement & Physics (Continuous Real-Time)
- **Continuous Movement:** The player is represented as a smooth-moving circle (marker), NOT locked to grid steps. DO NOT implement turn-based movement.
- **Collision Detection:** Implement circle-vs-line-segment collision detection. The player marker must slide smoothly along the neon walls without passing through them.
- **Spawn Point:** The player spawns slightly outside the maze at the newly opened `isStart` entrance.
- **Input Handling:** - *Mouse/Touch ("Follow the Finger"):* If the user clicks or touches the canvas, the player marker should move continuously in a straight vector toward the current pointer position.
  - *Keyboard:* Support standard keys for continuous directional velocity (resolved via a 2D vector physics engine).

# 4. Visual Movement Assist (Tactical Overlay)
- **Concept:** To bridge the gap between continuous physics and the hex grid, implement a "Movement Assist" visual overlay.
- **Toggle:** Add a UI checkbox for "Show Movement Assist" (Default: ON).
- **Highlighting:** When ON, the walkable hex cells immediately adjacent to the cell the player is currently in should be slightly highlighted (e.g., a brighter floor color).
- **Key Prompts:** Inside those highlighted adjacent hexes, faintly render the recommended keyboard letter that the player should press to move toward that specific hex (e.g., mapping Q, W, E, A, S, D to the 6 hex directions depending on the flat-top orientation).

# 5. Rendering (`hex-renderer.js`)
- Ensure the start entrance is visibly open (no outer wall stroke).
- Add a rendering pass for the Player entity (a distinct, glowing circle or marker) that updates at 60fps via `requestAnimationFrame`.
- Implement the "Movement Assist" rendering pass behind the player but above the floor.

# Output
Provide the necessary code updates across the files (`index.html`, `hex-grid-generator.js`, `hex-renderer.js` and a new `game-loop.js`/`player.js`). Keep the code modular, strictly Vanilla JS, and ensure zero external dependencies.