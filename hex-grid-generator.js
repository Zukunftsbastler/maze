class HexGridGenerator {
  constructor(options = {}) {
    this.radius        = options.radius        || 5;
    this.windingFactor = Math.max(0, Math.min(1, options.windingFactor ?? 0.75));
    this.seed          = options.seed          || 'maze';
    this.offsetQ       = options.offsetQ       || 0;   // q-axis shift for island chaining
    this.topologyMode  = options.topologyMode  || 'SINGLE_BLOB'; // | 'FUSED_CLUSTERS'
    this.clusterCount  = options.clusterCount  || 2;
    // q-coordinate of the previous island's rightmost cell (-1 = no tunnel)
    this.incomingQ     = options.incomingQ     ?? -1;

    this.rng      = new Random(this.seed);
    this.cells    = new Map();
    this.startCell      = null;
    this.goalCell       = null;
    this.startEntranceDir = -1;
    this.goalExitDir      = -1;
  }

  generate() {
    this.rng.reset();
    this.cells.clear();
    this._forcedStartKey = null;
    this._forcedGoalKey  = null;
    this._blobCentreQ    = null;

    this._buildOrganicShape();
    // _buildSingleBlob/_buildFusedClusters embed their own tunnels and set
    // _forcedStartKey; only fall back to legacy _buildTunnel when not set.
    if (this.incomingQ >= 0 && !this._forcedStartKey) this._buildTunnel();
    this._runMazeAlgorithm();
    this._placeStartAndGoal();
    if (this.startEntranceDir < 0) this._openStartEntrance();
    this._openGoalExit();
    this._removeRandomWalls(this.radius);
    this._tagBuildableCells();

    return this;
  }

  // ── Shape Generation ──────────────────────────────────────────────────────

  _buildOrganicShape() {
    if (this.topologyMode === 'FUSED_CLUSTERS') {
      this._buildFusedClusters();
    } else {
      this._buildSingleBlob();
    }
    this._ensureConnectedShape();
  }

  _buildSingleBlob() {
    const tunnelLength = 3;
    const centreQ    = this.offsetQ + tunnelLength + this.radius;
    const entryEndQ  = centreQ - this.radius - 1;  // last cell of entry tunnel
    const exitStartQ = centreQ + this.radius + 1;  // first cell of exit tunnel
    const exitEndQ   = centreQ + this.radius + tunnelLength;

    this._blobCentreQ = centreQ;
    // Organic blob around (centreQ, 0) — interior cells remain normal maze cells
    this._buildBlob(centreQ, 0, this.radius);

    // ── Exterior entry tunnel (pre-visited, no randomisation) ────────────────
    this._stampTunnel(this.offsetQ, entryEndQ);

    // ── Exterior exit tunnel ──────────────────────────────────────────────────
    this._stampTunnel(exitStartQ, exitEndQ);

    // ── Connect entry tunnel → blob junction (entry tunnel end → blob left edge)
    this._openR0Passage(entryEndQ, entryEndQ + 1);

    // ── Connect blob junction → exit tunnel (blob right edge → exit tunnel start)
    this._openR0Passage(exitStartQ - 1, exitStartQ);

    // Open left entrance of start cell
    const startCell = this.cells.get(HexMath.key(this.offsetQ, 0, -this.offsetQ));
    if (startCell) { startCell.walls[4] = false; this.startEntranceDir = 4; }

    this._forcedStartKey = HexMath.key(this.offsetQ, 0, -this.offsetQ);
    this._forcedGoalKey  = HexMath.key(exitEndQ, 0, -exitEndQ);
  }

  // Generates overlapping blobs spread along the q-axis to form an irregular
  // mega-maze with no internal breaks.
  _buildFusedClusters() {
    const r          = this.radius;
    const count      = this.clusterCount;
    const subR       = Math.ceil(r * 0.72);
    const spacing    = Math.round(r * 0.75); // < 2*subR so blobs always overlap
    const tunnelLength = 3;

    // Blob centres start after the entry tunnel
    const firstCentreQ = this.offsetQ + tunnelLength + subR;
    this._blobCentreQ  = firstCentreQ + Math.floor((count - 1) * spacing / 2);
    for (let i = 0; i < count; i++) {
      const cq = firstCentreQ + i * spacing;
      const cr = Math.round((this.rng.next() - 0.5) * Math.floor(r * 0.5));
      this._buildBlob(cq, cr, subR);
    }

    const lastCentreQ = firstCentreQ + (count - 1) * spacing;
    const entryEndQ   = firstCentreQ - subR - 1;
    const exitStartQ  = lastCentreQ  + subR + 1;
    const exitEndQ    = lastCentreQ  + subR + tunnelLength;

    // ── Exterior entry / exit tunnels only — blob interior stays as maze ──────
    this._stampTunnel(this.offsetQ, entryEndQ);
    this._stampTunnel(exitStartQ,   exitEndQ);
    this._openR0Passage(entryEndQ, entryEndQ + 1);
    this._openR0Passage(exitStartQ - 1, exitStartQ);

    const startCell = this.cells.get(HexMath.key(this.offsetQ, 0, -this.offsetQ));
    if (startCell) { startCell.walls[4] = false; this.startEntranceDir = 4; }

    this._forcedStartKey = HexMath.key(this.offsetQ, 0, -this.offsetQ);
    this._forcedGoalKey  = HexMath.key(exitEndQ, 0, -exitEndQ);
  }

  // Creates pre-visited tunnel cells along r=0 from startQ to endQ (inclusive)
  // and opens all internal passages along that segment.
  _stampTunnel(startQ, endQ) {
    for (let q = startQ; q <= endQ; q++) {
      const key = HexMath.key(q, 0, -q);
      if (!this.cells.has(key)) this.cells.set(key, new HexCell(q, 0, -q));
      const cell = this.cells.get(key);
      cell.visited = true; cell.isTunnel = true;
      cell.isWalkable = true; cell.isBuildable = false;
    }
    for (let q = startQ; q < endQ; q++) {
      const cell = this.cells.get(HexMath.key(q, 0, -q));
      const nk   = HexMath.key(q + 1, 0, -(q + 1));
      if (cell && this.cells.has(nk)) {
        cell.walls[1] = false;
        this.cells.get(nk).walls[4] = false;
      }
    }
  }

  // Opens a rightward passage between the cell at leftQ and the cell at rightQ
  // (both at r=0), creating either cell if it doesn't exist yet.
  _openR0Passage(leftQ, rightQ) {
    const lk = HexMath.key(leftQ,  0, -leftQ);
    const rk = HexMath.key(rightQ, 0, -rightQ);
    if (!this.cells.has(lk)) this.cells.set(lk, new HexCell(leftQ,  0, -leftQ));
    if (!this.cells.has(rk)) this.cells.set(rk, new HexCell(rightQ, 0, -rightQ));
    this.cells.get(lk).walls[1] = false;
    this.cells.get(rk).walls[4] = false;
  }

  // Adds a single organic blob centred at (centreQ, centreR) with radius r.
  _buildBlob(centreQ, centreR, r) {
    const centreS = -centreQ - centreR;
    const rng     = this.rng;
    const bumpAmp = r * 0.45;
    const bumps   = HexMath.directions.map(() => rng.next() * bumpAmp);

    for (let q = centreQ - r - 1; q <= centreQ + r + 1; q++) {
      for (let rr = centreR - r - 1; rr <= centreR + r + 1; rr++) {
        const s    = -q - rr;
        const dist = HexMath.distance({ q, r: rr, s }, { q: centreQ, r: centreR, s: centreS });

        const jitter = (rng.next() - 0.5) * 1.8;
        if (dist > r + jitter) continue;

        if (dist >= r - 1) {
          const angle       = Math.atan2(rr - centreR, q - centreQ);
          const sectorFloat = ((angle / (Math.PI * 2)) * 6 + 6) % 6;
          const s0          = Math.floor(sectorFloat);
          const s1          = (s0 + 1) % 6;
          const t           = sectorFloat - s0;
          const bumpVal     = bumps[s0] * (1 - t) + bumps[s1] * t;
          if (dist > r - 0.5 + bumpVal * 0.3) continue;
        }

        const key = HexMath.key(q, rr, s);
        if (!this.cells.has(key)) {
          const cell = new HexCell(q, rr, s);
          cell.distFromCenter = dist;
          this.cells.set(key, cell);
        }
      }
    }
  }

  // BFS from the organic blob centre; remove disconnected orphans.
  // Tunnel cells (isTunnel=true) are always kept — they are essential connectors
  // and must not be pruned even if the blob jitter leaves a physical gap.
  _ensureConnectedShape() {
    if (this.cells.size === 0) return;

    // Seed from the blob interior, not the tunnel start, so jitter-induced gaps
    // between the tunnel and blob edge don't cause the blob to be pruned away.
    const targetQ = this._blobCentreQ ?? this.offsetQ;
    let seedKey = null, bestDist = Infinity;
    for (const cell of this.cells.values()) {
      if (cell.isTunnel) continue; // tunnels are kept unconditionally — skip as seed
      const d = Math.abs(cell.q - targetQ) + Math.abs(cell.r);
      if (d < bestDist) { bestDist = d; seedKey = cell.key; }
    }
    if (!seedKey) return; // only tunnel cells exist — nothing to prune

    const visited = new Set([seedKey]);
    const queue   = [seedKey];
    while (queue.length) {
      const key  = queue.shift();
      const cell = this.cells.get(key);
      for (let d = 0; d < 6; d++) {
        const nb = HexMath.neighbor(cell.q, cell.r, cell.s, d);
        const nk = HexMath.key(nb.q, nb.r, nb.s);
        if (this.cells.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }
    // Prune disconnected non-tunnel cells; always preserve tunnel cells.
    for (const key of [...this.cells.keys()]) {
      if (!visited.has(key) && !this.cells.get(key).isTunnel) {
        this.cells.delete(key);
      }
    }
  }

  // ── Tunnel (inter-island corridor) ───────────────────────────────────────

  // Builds a straight corridor at r = 0 from incomingQ+1 to minQ_blob-1.
  // Cells are pre-marked visited (maze algorithm ignores them) and isTunnel=true
  // (wall-removal pass skips them, keeping the corridor solid).
  _buildTunnel() {
    // Find the actual left edge of the blob we just built
    let minQ = Infinity;
    for (const cell of this.cells.values()) minQ = Math.min(minQ, cell.q);

    const tunnelStartQ = this.incomingQ + 1;
    const tunnelEndQ   = minQ - 1;
    if (tunnelEndQ < tunnelStartQ) return; // no gap — nothing to fill

    // ── Step 1: create tunnel cells ─────────────────────────────────────────
    for (let q = tunnelStartQ; q <= tunnelEndQ; q++) {
      const key = HexMath.key(q, 0, -q);
      if (this.cells.has(key)) continue;
      const cell = new HexCell(q, 0, -q);
      cell.visited     = true;   // maze backtracker skips pre-visited cells
      cell.isTunnel    = true;   // wall-removal pass skips tunnel cells
      cell.isWalkable  = true;
      cell.isBuildable = false;
      // all walls default to true from HexCell constructor — correct for closed corridor
      this.cells.set(key, cell);
    }

    // ── Step 2: open passages along the corridor (dir 1 = right, dir 4 = left) ─
    for (let q = tunnelStartQ; q <= tunnelEndQ; q++) {
      const cell     = this.cells.get(HexMath.key(q, 0, -q));
      const rightKey = HexMath.key(q + 1, 0, -(q + 1));
      if (this.cells.has(rightKey)) {
        cell.walls[1] = false;
        this.cells.get(rightKey).walls[4] = false;
      }
    }

    // ── Step 3: open left entrance of the leftmost tunnel cell ──────────────
    const leftmost = this.cells.get(HexMath.key(tunnelStartQ, 0, -tunnelStartQ));
    if (leftmost) {
      leftmost.walls[4] = false;  // direction 4 = upper-left (faces incomingQ void)
      this.startEntranceDir = 4;  // signal to generate() to skip _openStartEntrance
    }

    // ── Step 4: connect rightmost tunnel cell to the nearest blob cell ───────
    // Direction 1 connection is already handled in Step 2 if (minQ, 0) is in grid.
    // This fallback finds any adjacent blob cell in case the blob is off-axis.
    const rightmost = this.cells.get(HexMath.key(tunnelEndQ, 0, -tunnelEndQ));
    if (rightmost && rightmost.walls[1] === true) {
      for (let d = 0; d < 6; d++) {
        if (d === 4) continue; // never reconnect leftward
        const nb     = HexMath.neighbor(rightmost.q, rightmost.r, rightmost.s, d);
        const nk     = HexMath.key(nb.q, nb.r, nb.s);
        const nbCell = this.cells.get(nk);
        if (nbCell && !nbCell.isTunnel) { // unvisited-by-tunnel = blob cell
          rightmost.walls[d] = false;
          nbCell.walls[HexMath.opposite(d)] = false;
          break;
        }
      }
    }
  }

  // ── Maze Algorithm (Recursive Backtracking + winding) ────────────────────

  _runMazeAlgorithm() {
    // Seed from the cell nearest to the island's geometric centre
    const targetQ = this.offsetQ +
      (this.topologyMode === 'FUSED_CLUSTERS'
        ? Math.floor(this.radius * (this.clusterCount - 1) * 0.38)
        : 0);

    let seedCell = null, bestDist = Infinity;
    for (const cell of this.cells.values()) {
      if (cell.visited) continue; // skip pre-visited tunnel cells
      const d = Math.abs(cell.q - targetQ) + Math.abs(cell.r);
      if (d < bestDist) { bestDist = d; seedCell = cell; }
    }
    if (!seedCell) return;

    const rng     = this.rng;
    const winding = this.windingFactor;
    const stack   = [seedCell.key];
    seedCell.visited = true;
    let visitedCount = 1;
    const total = this.cells.size;
    let lastDir = -1;

    while (stack.length && visitedCount < total) {
      const currentKey = stack[stack.length - 1];
      const cell       = this.cells.get(currentKey);

      const unvisited = [];
      for (let d = 0; d < 6; d++) {
        const nb     = HexMath.neighbor(cell.q, cell.r, cell.s, d);
        const nbCell = this.cells.get(HexMath.key(nb.q, nb.r, nb.s));
        if (nbCell && !nbCell.visited) unvisited.push(d);
      }

      if (unvisited.length === 0) { stack.pop(); lastDir = -1; continue; }

      let chosenDir;
      if (lastDir >= 0 && unvisited.includes(lastDir) && rng.next() < winding) {
        chosenDir = lastDir;
      } else {
        rng.shuffle(unvisited);
        chosenDir = unvisited[0];
      }

      const nb     = HexMath.neighbor(cell.q, cell.r, cell.s, chosenDir);
      const nk     = HexMath.key(nb.q, nb.r, nb.s);
      const nbCell = this.cells.get(nk);
      cell.removeWall(chosenDir);
      nbCell.removeWall(HexMath.opposite(chosenDir));
      nbCell.visited = true;
      visitedCount++;
      stack.push(nk);
      lastDir = chosenDir;
    }
  }

  // ── Start / Goal Placement (edge-to-edge, left → right) ──────────────────

  _placeStartAndGoal() {
    if (this._forcedStartKey && this._forcedGoalKey) {
      const startCell = this.cells.get(this._forcedStartKey);
      const goalCell  = this.cells.get(this._forcedGoalKey);
      if (startCell && goalCell) {
        startCell.isStart = true; startCell.isBuildable = false; startCell.isWalkable = true;
        this.startCell = startCell;
        goalCell.isGoal = true; goalCell.isBuildable = false; goalCell.isWalkable = true;
        this.goalCell = goalCell;
        return;
      }
    }

    // Fallback: min/max q search (used when no tunnel keys are forced)
    let minQ = Infinity,  maxQ = -Infinity;
    let startCell = null, goalCell = null;

    for (const cell of this.cells.values()) {
      if (cell.q < minQ || (cell.q === minQ && Math.abs(cell.r) < Math.abs(startCell.r))) {
        minQ = cell.q; startCell = cell;
      }
      if (cell.q > maxQ || (cell.q === maxQ && Math.abs(cell.r) < Math.abs(goalCell.r))) {
        maxQ = cell.q; goalCell = cell;
      }
    }

    if (startCell === goalCell) {
      const arr = [...this.cells.values()];
      startCell = arr[0]; goalCell = arr[arr.length - 1];
    }

    startCell.isStart    = true; startCell.isBuildable = false; startCell.isWalkable = true;
    this.startCell = startCell;
    goalCell.isGoal      = true; goalCell.isBuildable  = false; goalCell.isWalkable  = true;
    this.goalCell = goalCell;
  }

  // ── Entrance / Exit walls ─────────────────────────────────────────────────

  _openStartEntrance() {
    this.startEntranceDir = this._openOuterWallFacing(this.startCell, -1, 0);
  }

  _openGoalExit() {
    this.goalExitDir = this._openOuterWallFacing(this.goalCell, 1, 0);
  }

  // Removes the outer boundary wall on `cell` whose direction best matches the
  // target pixel unit vector (targetDX, targetDY). Returns the direction index.
  _openOuterWallFacing(cell, targetDX, targetDY) {
    let bestDir = -1, bestDot = -Infinity;

    for (let d = 0; d < 6; d++) {
      const nb = HexMath.neighbor(cell.q, cell.r, cell.s, d);
      if (this.cells.has(HexMath.key(nb.q, nb.r, nb.s))) continue; // inner wall

      const dp  = HexMath.toPixel(HexMath.directions[d].q, HexMath.directions[d].r, 1);
      const mag = Math.sqrt(dp.x * dp.x + dp.y * dp.y);
      const dot = (dp.x / mag) * targetDX + (dp.y / mag) * targetDY;
      if (dot > bestDot) { bestDot = dot; bestDir = d; }
    }

    if (bestDir >= 0) cell.walls[bestDir] = false;
    return bestDir;
  }

  // ── Loop creation (Anti-Dead-End) ─────────────────────────────────────────

  // Removes `count` internal walls while guaranteeing the shortest path from
  // start to goal never drops below minimumPathLength. Uses a BFS distance
  // heuristic to pre-screen candidates — no rejection sampling.
  _removeRandomWalls(count) {
    const minPath = this.radius * 2.5;

    for (let iter = 0; iter < count; iter++) {
      const distS = this._bfsDistances(this.startCell.key);
      const distG = this._bfsDistances(this.goalCell.key);

      const candidates = [];

      for (const cell of this.cells.values()) {
        for (let d = 0; d < 6; d++) {
          if (!cell.walls[d]) continue;

          const nb     = HexMath.neighbor(cell.q, cell.r, cell.s, d);
          const nk     = HexMath.key(nb.q, nb.r, nb.s);
          const nbCell = this.cells.get(nk);
          if (!nbCell) continue;               // outer wall — skip
          if (cell.key >= nk) continue;        // deduplicate pairs
          if (cell.isTunnel || nbCell.isTunnel) continue; // keep corridor solid

          const dSA = distS.get(cell.key) ?? Infinity;
          const dGA = distG.get(cell.key) ?? Infinity;
          const dSB = distS.get(nk)       ?? Infinity;
          const dGB = distG.get(nk)       ?? Infinity;

          // Hypothetical shortest path if this wall were removed
          const potentialPath = Math.min(dSA + 1 + dGB, dSB + 1 + dGA);

          if (potentialPath >= minPath) candidates.push({ cell, d, nbCell });
        }
      }

      if (candidates.length === 0) break;

      const pick = candidates[this.rng.int(0, candidates.length - 1)];
      pick.cell.removeWall(pick.d);
      pick.nbCell.removeWall(HexMath.opposite(pick.d));
    }
  }

  // ── BFS (open passages only) ──────────────────────────────────────────────

  _bfsDistances(fromKey) {
    const dist = new Map([[fromKey, 0]]);
    const queue = [fromKey];
    while (queue.length) {
      const key  = queue.shift();
      const cell = this.cells.get(key);
      const d    = dist.get(key);
      for (let dir = 0; dir < 6; dir++) {
        if (cell.walls[dir]) continue;
        const nb = HexMath.neighbor(cell.q, cell.r, cell.s, dir);
        const nk = HexMath.key(nb.q, nb.r, nb.s);
        if (!dist.has(nk) && this.cells.has(nk)) {
          dist.set(nk, d + 1);
          queue.push(nk);
        }
      }
    }
    return dist;
  }

  // ── Tagging ───────────────────────────────────────────────────────────────

  _tagBuildableCells() {
    const path    = this.findPath(this.startCell.key, this.goalCell.key);
    const pathSet = new Set(path);
    for (const [key, cell] of this.cells) {
      if (pathSet.has(key)) { cell.isBuildable = false; cell.isWalkable = true; }
    }
  }

  // ── A* Pathfinding ────────────────────────────────────────────────────────

  findPath(fromKey, toKey) {
    const goal = this.cells.get(toKey);
    if (!goal) return [];

    const h = key => HexMath.distance(this.cells.get(key), goal);

    const open     = new Set([fromKey]);
    const cameFrom = new Map();
    const gScore   = new Map([[fromKey, 0]]);
    const fScore   = new Map([[fromKey, h(fromKey)]]);

    const lowestF = () => {
      let best = null, bestF = Infinity;
      for (const k of open) { const f = fScore.get(k) ?? Infinity; if (f < bestF) { bestF = f; best = k; } }
      return best;
    };

    while (open.size) {
      const current = lowestF();
      if (current === toKey) return this._reconstructPath(cameFrom, current);
      open.delete(current);
      const cell = this.cells.get(current);
      const g    = gScore.get(current);

      for (let dir = 0; dir < 6; dir++) {
        if (cell.walls[dir]) continue;
        const nb     = HexMath.neighbor(cell.q, cell.r, cell.s, dir);
        const nk     = HexMath.key(nb.q, nb.r, nb.s);
        const nbCell = this.cells.get(nk);
        if (!nbCell || !nbCell.isWalkable) continue;
        const tentG = g + nbCell.terrainWeight;
        if (tentG < (gScore.get(nk) ?? Infinity)) {
          cameFrom.set(nk, current);
          gScore.set(nk, tentG);
          fScore.set(nk, tentG + h(nk));
          open.add(nk);
        }
      }
    }
    return [];
  }

  _reconstructPath(cameFrom, current) {
    const path = [current];
    while (cameFrom.has(current)) { current = cameFrom.get(current); path.unshift(current); }
    return path;
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  toJSON() {
    return {
      radius: this.radius, windingFactor: this.windingFactor, seed: this.seed,
      offsetQ: this.offsetQ, topologyMode: this.topologyMode, clusterCount: this.clusterCount,
      incomingQ: this.incomingQ,
      startKey: this.startCell?.key, goalKey: this.goalCell?.key,
      startEntranceDir: this.startEntranceDir ?? -1,
      goalExitDir:      this.goalExitDir      ?? -1,
      cells: [...this.cells.values()].map(c => c.toJSON()),
    };
  }

  static fromJSON(data) {
    const gen = new HexGridGenerator({
      radius: data.radius, windingFactor: data.windingFactor, seed: data.seed,
      offsetQ: data.offsetQ ?? 0, topologyMode: data.topologyMode ?? 'SINGLE_BLOB',
      clusterCount: data.clusterCount ?? 2, incomingQ: data.incomingQ ?? -1,
    });
    for (const cellData of data.cells) {
      const cell = HexCell.fromJSON(cellData);
      gen.cells.set(cell.key, cell);
    }
    gen.startCell        = gen.cells.get(data.startKey) || null;
    gen.goalCell         = gen.cells.get(data.goalKey)  || null;
    gen.startEntranceDir = data.startEntranceDir ?? -1;
    gen.goalExitDir      = data.goalExitDir      ?? -1;
    return gen;
  }
}
