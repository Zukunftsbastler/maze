class Nemesis {
  constructor() {
    this.worldX         = 0;
    this.worldY         = 0;
    this.radius         = 9;
    this.speed          = 130; // px/s — calibrated against attackTimer formula
    this.currentCellKey = null;
    this._path          = [];
    this._pathIndex     = 0;
    this._goalKey       = null;
    this.reachedGoal    = false;
    this.active         = false;
    this._repathNeeded  = false;
  }

  spawn(worldX, worldY, startKey, goalKey) {
    this.worldX         = worldX;
    this.worldY         = worldY;
    this.currentCellKey = startKey;
    this._goalKey       = goalKey;
    this.reachedGoal    = false;
    this.active         = true;
    this._path          = [];
    this._pathIndex     = 0;
    this._repathNeeded  = true;
  }

  // Called whenever a blockade changes the grid walkability.
  requestRepath() { this._repathNeeded = true; }

  update(dt, grid, cellSize) {
    if (!this.active) return;

    if (this._repathNeeded) {
      this._repathNeeded = false;
      const from = this.currentCellKey ?? grid.startCell.key;
      this._path = grid.findPath(from, this._goalKey);
      // Skip the cell we're already on
      this._pathIndex = (this._path.length > 0 && this._path[0] === from) ? 1 : 0;
    }

    if (this._pathIndex >= this._path.length) return;

    const targetKey  = this._path[this._pathIndex];
    const targetCell = grid.cells.get(targetKey);
    if (!targetCell) { this._repathNeeded = true; return; }

    const { x: tx, y: ty } = HexMath.toPixel(targetCell.q, targetCell.r, cellSize);
    const dx   = tx - this.worldX;
    const dy   = ty - this.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = this.speed * dt;

    if (dist <= step + 0.5) {
      this.worldX         = tx;
      this.worldY         = ty;
      this.currentCellKey = targetKey;
      this._pathIndex++;
      if (targetKey === this._goalKey) {
        this.reachedGoal = true;
        this.active      = false;
      }
    } else {
      this.worldX += (dx / dist) * step;
      this.worldY += (dy / dist) * step;
    }
  }
}
