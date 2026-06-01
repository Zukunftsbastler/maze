# Sprint Task: Smart Build Spot Pre-Validation

Please update the `_tagBuildableCells()` method in `hex-grid-generator.js` to prevent soft-locks where all build spots on the main path act as unblockable choke points.

## Algorithmic Change: A* Validation During Generation
Before finalizing a cell from `pathCands` as a build spot, the generator must verify that placing a blockade there will not completely block the path from `startCell` to `goalCell`.

1. **Filter `pathCands`:** Iterate through the randomized `pathCands` array.
2. **Simulation:** For each candidate key:
   * Fetch the cell and temporarily set `cell.isWalkable = false`.
   * Run `this.findPath(this.startCell.key, this.goalCell.key)`.
   * If `path.length > 0`, this is a valid spot (a bypass exists). Keep it in a `validPathCands` array.
   * If `path.length === 0`, this is a critical choke point. Discard it.
   * Restore `cell.isWalkable = true`.
3. **Capacity Handling:** Stop evaluating once `validPathCands` reaches the target `pathCount` (which is `Math.ceil(maxBuildable * 0.65)`).
4. **Fallback:** If there aren't enough valid path spots because the maze is too linear, calculate the deficit and add that number to the `offCount` quota so the total number of build spots remains consistent, filled by `offCands`.
5. **Apply Tags:** Set `isBuildable = true` for the chosen `validPathCands` and the allocated `offCands`.