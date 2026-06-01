# Role & Context
You are a Lead Game Developer working in Vanilla JS. We are refining our "Mega-Dungeon" hex maze transition and camera system. I have identified three critical bugs in the current codebase (`game-loop.js` and `hex-grid-generator.js`) that need fixing.

# 1. The Overlap & Tunnel Fix (`hex-grid-generator.js` & `game-loop.js`)
**The Bug:** In `game-loop.js`, `_generateNextIsland()` sets `this.nextOffsetQ = maxQ + 2`. However, `HexGridGenerator` uses `offsetQ` as the *center* (`centreQ`) of the new blob. This causes the left edge of the new blob (`offsetQ - radius`) to massively overlap the previous island.
**The Fix:** - In `game-loop.js`, calculate `nextOffsetQ` properly. It should be `oldMaxQ + pm.radius + tunnelLength` (e.g., a tunnel length of 4 or 5 hexes).
- In `hex-grid-generator.js`, add a `_buildTunnel()` pass *after* the main shape generation but *before* the maze algorithm. This method should explicitly generate a straight horizontal line of walkable `HexCell`s (at `r = 0`) connecting the old `maxQ` coordinate to the new island's `minQ` coordinate. 
- Ensure this tunnel has solid walls on its top and bottom edges, but open passages connecting left and right.

# 2. The Spawn Bug (`game-loop.js`)
**The Bug:** `_spawnPosition(grid)` pushes the player `1.7 * cellSize` OUTSIDE the start cell based on the entrance vector. With the new tunnel, this pushes them into the void or walls.
**The Fix:** Rewrite `_spawnPosition` to simply return the exact geometric center (`HexMath.toPixel`) of the `grid.startCell`. The player should spawn exactly inside the first cell of the new island (or the end of the tunnel).

# 3. Manual Pan & Pinch-to-Zoom Camera (`game-loop.js`)
We are dropping the auto-centering camera in favor of a free-look system.
- **Remove Auto-Center:** Delete the exponential lerp tracking (`this.targetCameraX = this.player.worldX`, etc.) inside `_update(dt)`.
- **Add Zoom State:** Add `this.cameraZoom = 1.0` to the `GameLoop` constructor.
- **Implement Mouse Controls:** - In `_bindInput()`, listen for the `wheel` event to adjust `this.cameraZoom` (clamp it between e.g., 0.3 and 3.0). Zoom should target the mouse pointer's position (standard zoom-to-cursor math).
  - Implement a dedicated Pan control (e.g., Dragging with the Right Mouse Button or holding Spacebar + Drag).
- **Implement Touch Controls:** In `touchstart`, `touchmove`, and `touchend`, implement 2-finger Pinch-to-Zoom and 2-finger Drag-to-Pan. Single-finger touch should remain strictly for moving the player.
- **Coordinate Math (CRITICAL):** You MUST update `_render()` to apply `ctx.scale(this.cameraZoom, this.cameraZoom)`. Furthermore, you MUST update `_pointerToWorld()` so that the physical pointer interactions (player movement vector) perfectly match the new zoomed/panned coordinate space. If `_pointerToWorld` is wrong, the "Follow the Finger" player movement will break completely.

# Output Instructions
Please provide the specific code updates for `game-loop.js` and `hex-grid-generator.js`. Do not change the overall architecture, just fix the generation overlap via a tunnel, fix the spawn point, and implement the robust Pan/Zoom camera.