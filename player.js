// Normalised velocity vectors for QWEASD / arrow keys (flat-top hex layout).
// Q W E / A S D  →  hex directions 4,5,0 / 3,2,1
const KEY_VECTORS = (() => {
  const dirs = HexMath.directions.map(d => {
    const p = HexMath.toPixel(d.q, d.r, 1);
    const m = Math.sqrt(p.x * p.x + p.y * p.y);
    return { vx: p.x / m, vy: p.y / m };
  });
  return {
    'q': dirs[4], 'Q': dirs[4],
    'w': dirs[5], 'W': dirs[5],
    'e': dirs[0], 'E': dirs[0],
    'a': dirs[3], 'A': dirs[3],
    's': dirs[2], 'S': dirs[2],
    'd': dirs[1], 'D': dirs[1],
    'ArrowUp':    { vx:  0, vy: -1 },
    'ArrowDown':  { vx:  0, vy:  1 },
    'ArrowLeft':  { vx: -1, vy:  0 },
    'ArrowRight': { vx:  1, vy:  0 },
  };
})();

// Key label displayed inside each adjacent cell by the movement assist overlay.
const DIR_KEY_LABEL = ['E', 'D', 'S', 'A', 'Q', 'W']; // index = direction 0..5

class Player {
  constructor() {
    this.worldX = 0;          // position in world-pixel space (no canvas offset)
    this.worldY = 0;
    this.radius  = 8;         // px — small enough to fit through shrunken passages
    this.speed   = 155;       // px / second
    this.currentCellKey = null;
    this.totalSteps     = 0;  // cell-transition count used for efficiency score
  }

  spawn(worldX, worldY) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.currentCellKey = null;
    this.totalSteps     = 0;
  }

  /**
   * @param {number}   dt          - seconds since last frame
   * @param {object}   grid        - active island's HexGridGenerator (cells in world coords)
   * @param {number}   cellSize
   * @param {number}   floorScale  - tile shrink factor (same as renderer)
   * @param {object}   inputState  - { keys, pointerActive, worldPointerX, worldPointerY }
   */
  update(dt, grid, cellSize, floorScale, inputState) {
    let dvx = 0, dvy = 0;

    // Keyboard
    for (const [k, active] of Object.entries(inputState.keys)) {
      if (active && KEY_VECTORS[k]) { dvx += KEY_VECTORS[k].vx; dvy += KEY_VECTORS[k].vy; }
    }

    // Mouse / touch: move toward world-space pointer when held
    if (inputState.pointerActive) {
      const dx = inputState.worldPointerX - this.worldX;
      const dy = inputState.worldPointerY - this.worldY;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d > this.radius) { dvx += dx / d; dvy += dy / d; }
    }

    const mag = Math.sqrt(dvx * dvx + dvy * dvy);
    if (mag > 0.001) {
      this.worldX += (dvx / mag) * this.speed * dt;
      this.worldY += (dvy / mag) * this.speed * dt;
    }

    // Collision resolution — 3 iterations stabilises corners
    const walls = this._collectWalls(grid, cellSize, floorScale);
    for (let i = 0; i < 3; i++) {
      for (const seg of walls) this._resolveSegment(...seg);
    }

    // Track current cell (world coords, no offset needed)
    this._updateCell(grid, cellSize);
  }

  // Collect unique wall segments (world coords) within the 1-ring of the player.
  _collectWalls(grid, cellSize, f) {
    const coord = HexMath.fromPixel(this.worldX, this.worldY, cellSize);
    const segs  = [];
    const seen  = new Set();

    const candidates = [coord];
    for (let d = 0; d < 6; d++) {
      candidates.push(HexMath.neighbor(coord.q, coord.r, coord.s, d));
    }

    for (const c of candidates) {
      const cell = grid.cells.get(HexMath.key(c.q, c.r, c.s));
      if (!cell) continue;

      // World-pixel centre of this cell (cells carry absolute q — no extra offset)
      const { x, y } = HexMath.toPixel(cell.q, cell.r, cellSize);
      const sc = HexMath.corners(x, y, cellSize * f);  // shrunken corners in world space

      for (let d = 0; d < 6; d++) {
        if (!cell.walls[d]) continue;
        const p0 = sc[(d + 5) % 6], p1 = sc[d];

        // Deduplicate by sorted endpoint string
        const k0  = `${p0.x.toFixed(1)},${p0.y.toFixed(1)}`;
        const k1  = `${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
        const key = k0 < k1 ? `${k0}|${k1}` : `${k1}|${k0}`;
        if (!seen.has(key)) {
          seen.add(key);
          segs.push([p0.x, p0.y, p1.x, p1.y]);
        }
      }
    }
    return segs;
  }

  // Circle–segment penetration resolve (push-out normal).
  _resolveSegment(ax, ay, bx, by) {
    const ex   = bx - ax, ey = by - ay;
    const len2 = ex * ex + ey * ey;
    if (len2 < 0.0001) return;

    const t  = Math.max(0, Math.min(1, ((this.worldX - ax) * ex + (this.worldY - ay) * ey) / len2));
    const nx = this.worldX - (ax + t * ex);
    const ny = this.worldY - (ay + t * ey);
    const d2 = nx * nx + ny * ny;

    if (d2 > 0 && d2 < this.radius * this.radius) {
      const d = Math.sqrt(d2);
      this.worldX += (nx / d) * (this.radius - d);
      this.worldY += (ny / d) * (this.radius - d);
    }
  }

  // Resolve which grid cell the player occupies and count transitions.
  _updateCell(grid, cellSize) {
    const coord = HexMath.fromPixel(this.worldX, this.worldY, cellSize);
    const key   = HexMath.key(coord.q, coord.r, coord.s);
    if (grid.cells.has(key) && key !== this.currentCellKey) {
      this.currentCellKey = key;
      this.totalSteps++;
    }
  }
}
