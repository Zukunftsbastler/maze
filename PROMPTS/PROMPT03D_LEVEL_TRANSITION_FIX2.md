# Role & Context
You are a Lead Game Developer working in Vanilla JS. We need to refine the visual rendering, island docking mechanics, and topology generation in our Hex Maze codebase. I have identified specific functions that cause visual bugs and prevent a seamless "Mega-Dungeon" illusion.

Please implement the following precise fixes across the specified files:

# 1. Fix the "Darker Path" Bug (`hex-grid-generator.js` & `hex-renderer.js`)
**The Issue:** The shortest A* path currently appears slightly darker because `_tagBuildableCells()` sets it to `isBuildable = false`, causing `HexRenderer` to use a different floor color.
**The Fix:** 
- In `hex-renderer.js` (Pass 2), ensure ALL standard floor tiles use `this.colors.floor`. The `showPath` mechanic (drawn in Pass 4) is sufficient for explicit path hints.

# 2. Fix the Black Background Overlap (`hex-renderer.js`)
**The Issue:** `Pass 0: void background` uses `ctx.fillRect(0, 0, W, H)` with `this.colors.void`. Because islands are rendered to off-screen canvases and layered in `game-loop.js`, this solid bounding box obscures previously archived islands.
**The Fix:** - In `hex-renderer.js`, completely delete `Pass 0`. The off-screen canvas MUST remain perfectly transparent. 
- (Note: `game-loop.js` already clears the main viewport with `#06060f` every frame, which handles the background safely).

# 3. Create Seamless "Tunnels" & Docking (`hex-grid-generator.js`)
**The Issue:** New islands overlap old ones because `offsetQ` is treated as the geometric center, and start/goal cells aren't strictly aligned to connect horizontally.
**The Fix:** Rewrite `_buildSingleBlob()` (and adapt `_buildFusedClusters()` similarly) to explicitly generate an entry tunnel and an exit tunnel along `r = 0`.
- Let `tunnelLength = 3`. 
- Calculate `centreQ = this.offsetQ + tunnelLength + this.radius`.
- Generate the organic blob around `(centreQ, 0)` with `this.radius`.
- Explicitly create a straight line of `HexCell`s (the Entry Tunnel) from `q = this.offsetQ` to `q = centreQ` at `r = 0`.
- Explicitly create a straight line of `HexCell`s (the Exit Tunnel) from `q = centreQ` to `q = centreQ + this.radius + tunnelLength` at `r = 0`.
- **CRITICAL:** Force `this.startCell` to exactly `(this.offsetQ, 0, -this.offsetQ)` and `this.goalCell` to exactly `(centreQ + this.radius + tunnelLength, 0, -...)`. Do not rely on `_placeStartAndGoal`'s min/max search anymore.

# 4. Remove Visual Archiving Constraints (`game-loop.js`)
**The Issue:** The archived islands look distinctly "disabled" (darkened with a blue separator), destroying the illusion of a contiguous world.
**The Fix:** - In `game-loop.js` -> `_archiveActiveIsland()`, completely remove the code that draws the `rgba(6,6,15,0.50)` dimming overlay and the blue separator line onto the `archCtx`. Archived islands should look visually identical to active ones.
- In `game-loop.js` -> `_onIslandComplete()`, update the docking math: set `this.nextOffsetQ = archivedGrid.goalCell.q + 1`. This perfectly connects the new Entry Tunnel to the old Exit Tunnel.
- Rewrite `_spawnPosition(grid)` to simply return the exact geometric pixel center of `grid.startCell`. Do not apply entrance vector offsets anymore, as the player spawns perfectly inside the tunnel.

# Output
Provide the updated code for the affected methods in `hex-grid-generator.js`, `hex-renderer.js`, and `game-loop.js`. Maintain all other logic (like the BFS validation and rendering passes).