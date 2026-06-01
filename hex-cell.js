class HexCell {
  constructor(q, r, s) {
    this.q = q;
    this.r = r;
    this.s = s;
    this.key = HexMath.key(q, r, s);

    // walls[i] = true means wall exists on edge i (0–5)
    this.walls = [true, true, true, true, true, true];

    // Game metadata
    this.isStart = false;
    this.isGoal = false;
    this.isBuildable = true;   // Tower Defense: can place towers here
    this.isWalkable = true;    // Enemies/player can traverse
    this.terrainWeight = 1;    // Puzzle: cost to enter this cell

    // Fog of War — 0 = HIDDEN, 1 = REVEALED (memory), 2 = IN_SIGHT
    this.visibility = 0;

    // Generation bookkeeping
    this.visited = false;
    this.distFromCenter = 0;
  }

  removeWall(dir) {
    this.walls[dir] = false;
  }

  hasWall(dir) {
    return this.walls[dir];
  }

  toJSON() {
    return {
      q: this.q, r: this.r, s: this.s,
      walls: [...this.walls],
      isStart: this.isStart,
      isGoal: this.isGoal,
      isBuildable: this.isBuildable,
      isWalkable: this.isWalkable,
      terrainWeight: this.terrainWeight,
      visibility: this.visibility,
    };
  }

  static fromJSON(data) {
    const cell = new HexCell(data.q, data.r, data.s);
    cell.walls        = data.walls;
    cell.isStart      = data.isStart;
    cell.isGoal       = data.isGoal;
    cell.isBuildable  = data.isBuildable;
    cell.isWalkable   = data.isWalkable;
    cell.terrainWeight = data.terrainWeight;
    cell.visibility   = data.visibility ?? 0;
    return cell;
  }
}
