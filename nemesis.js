class Nemesis {
  constructor() {
    this.worldX          = 0;
    this.worldY          = 0;
    this.radius          = 9;
    this.speed           = 130;       // px/s — calibrated against attackTimer formula
    this.currentCellKey  = null;
    this._path           = [];
    this._pathIndex      = 0;
    this._goalKey        = null;
    this.reachedGoal     = false;
    this.active          = false;
    this._repathNeeded   = false;

    // Attack stats (set via spawn())
    this.attackPower     = 10;        // damage per hit
    this.attackRate      = 1;         // hits per second
    this._attackCooldown = 0;

    // Set to true for one tick when a barricade is destroyed (game loop reads + clears)
    this.destroyedBarricade = false;
  }

  get attackDps() { return this.attackPower * this.attackRate; }

  spawn(worldX, worldY, startKey, goalKey, attackPower = 10, attackRate = 1) {
    this.worldX          = worldX;
    this.worldY          = worldY;
    this.currentCellKey  = startKey;
    this._goalKey        = goalKey;
    this.reachedGoal     = false;
    this.active          = true;
    this._path           = [];
    this._pathIndex      = 0;
    this._repathNeeded   = true;
    this._attackCooldown = 0;
    this.attackPower     = attackPower;
    this.attackRate      = attackRate;
    this.destroyedBarricade = false;
  }

  requestRepath() { this._repathNeeded = true; }

  update(dt, grid, cellSize) {
    if (!this.active) return;

    if (this._repathNeeded) {
      this._repathNeeded = false;
      const from  = this.currentCellKey ?? grid.startCell.key;
      // Use destructive pathfinding — barricades are passable at a time cost
      this._path  = grid.findPathDestructive
        ? grid.findPathDestructive(from, this._goalKey, this.attackDps)
        : grid.findPath(from, this._goalKey);
      this._pathIndex = (this._path.length > 0 && this._path[0] === from) ? 1 : 0;
    }

    if (this._pathIndex >= this._path.length) return;

    const targetKey  = this._path[this._pathIndex];
    const targetCell = grid.cells.get(targetKey);
    if (!targetCell) { this._repathNeeded = true; return; }

    // ── Attack barricade if next step is blocked ──────────────────────────────
    if (targetCell.blockadeLevel > 0) {
      this._attackCooldown -= dt;
      if (this._attackCooldown <= 0) {
        this._attackCooldown = 1 / this.attackRate;
        targetCell.blockadeHp = (targetCell.blockadeHp ?? BARRICADE_HP) - this.attackPower;
        if (targetCell.blockadeHp <= 0) {
          targetCell.blockadeHp      = 0;
          targetCell.blockadeLevel   = 0;
          targetCell.isWalkable      = true;
          this.destroyedBarricade    = true;
          this._repathNeeded         = true;   // replan now that route is clear
        }
      }
      return; // hold position while demolishing
    }

    // ── Normal movement ───────────────────────────────────────────────────────
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
