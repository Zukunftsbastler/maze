# Sprint Task: Holographic Build Spots UX Update

I have already implemented the core logic for the build spots. Now, I need to update the visual representation of `isBuildable` cells in `hex-renderer.js` so they stand out as interactive "blueprint holograms", even when covered by the Fog of War. 

Please implement the following visual update:

## 1. Add New Colors
Add these specific colors to the `this.colors` object in the `HexRenderer` constructor:
* `buildSpotHolo: 'rgba(255, 158, 0, 0.85)'` (Bright amber for direct sight)
* `buildSpotGlow: 'rgba(255, 158, 0, 0.45)'` (Amber glow)
* `buildSpotTint: 'rgba(255, 158, 0, 0.12)'` (Faint floor tint)
* `buildSpotRevealed: '#cc7a00'` (Flat, high-contrast ochre for fog of war)

## 2. Implement a New Render Pass (Pass 2.5)
Insert a new rendering loop in the `render(grid)` method specifically for build spots. This must happen **after** Pass 2 (shrunken hex floor tiles) and **before** Pass 3 (wall lines).

For every cell where `v > 0` and `cell.isBuildable === true`, draw the following:
* **The Blueprint Hexagon:** Draw an inner hexagon scaled to 60% of the floor tile (`f * 0.60`). Use a dashed line (`ctx.setLineDash([4, 4])`) with `lineWidth = 2`.
* **The Anchor Point:** Draw a small `+` symbol in the exact center of the pixel coordinates to indicate an interaction point. 

## 3. Apply Fog of War Logic
The rendering style must react to the `vis(cell)` state:
* **If `v === 2` (In direct sight):** * Draw the faint `buildSpotTint` over the full hex floor tile.
  * Stroke the dashed hexagon and the anchor using `buildSpotHolo`.
  * Add a neon glow by setting `shadowColor = this.colors.buildSpotGlow` and `shadowBlur = 12`.
* **If `v === 1` (Revealed / in Fog of War):**
  * Do NOT draw the floor tint.
  * Turn off the glow (`shadowBlur = 0`).
  * Stroke the dashed hexagon and anchor using the flat, solid `buildSpotRevealed` color. This ensures the blueprint remains sharply visible against the dark fog background without illuminating it.
  
*(Important: Ensure you reset `ctx.setLineDash([])` and `ctx.shadowBlur = 0` at the end of this pass so it doesn't bleed into the wall rendering).*