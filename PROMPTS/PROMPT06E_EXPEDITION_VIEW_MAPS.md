Please refactor the Expedition View (Micro Map) UI and the game loop logic to implement a new "Torn Map" reveal mechanic and an "Abort" feature.

### 1. Dual-Layer Map UI & Rectangular Zones
We are replacing the old diamond-shaped buttons with a rectangular grid/zone system. We now have two image assets per level, e.g., `Level01.png` (the realistic image) and `Level01_map.png` (the schematic treasure map).

- Overlay `Level01_map.png` directly on top of `Level01.png`. 
- Divide the interactive area into rectangular CSS grid zones (or absolutely positioned rectangular divs).
- **The 3 Visual States for each Zone:**
  - **New/Unattempted:** The zone shows the schematic map overlay (`Level01_map.png`).
  - **Aborted (Failed):** The schematic map is "torn away" to reveal the realistic `Level01.png` underneath, but a CSS `filter: grayscale(100%)` is applied to this revealed rectangular section.
  - **Completed (Success):** The schematic map is "torn away" to reveal the realistic `Level01.png` underneath in full original color.

### 2. The "Torn Paper" Edge Effect
When a zone reveals the underlying image (Aborted or Completed), the edges of that rectangular zone must NOT be perfectly straight. 
- Implement a procedural "torn paper" or rough, jagged edge effect. 
- You can achieve this using an SVG `<filter>` with `feTurbulence` and `feDisplacementMap` applied to the zone container, OR by using a CSS `mask-image` with a jagged SVG pattern. It should look like the treasure map was physically ripped away to reveal a window into the real world.

### 3. Gameplay Mechanics: Abort & Penalty
- Add an "Abort Expedition" button to the active game loop UI (visible during the run, as an alterantive to continuing to the next labyrinth or starting the run).
- If the player clicks "Abort":
  1. The run ends immediately (transitions to the post-run overlay).
  2. Apply the penalty: The player keeps exactly 10% of the gathered resources/gold (rounded down), and loses ALL collected artifacts (array is cleared).
  3. The zone's status is saved as `aborted` instead of `completed`.
- Update the Info Panel on the Expedition View: When hovering over an `aborted` zone, display its status so the player knows they can try again.

### 4. Replayability
- Crucially, zones that have the status `completed` MUST remain interactive and selectable. The player is allowed to replay successful expeditions to farm resources.
- Ensure the selection highlighting (hover effects) still works perfectly on the torn, revealed image areas (both grayscale and colored).