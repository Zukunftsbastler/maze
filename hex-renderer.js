/**
 * HexRenderer — "shrunken tile + bridge" technique for instant maze readability.
 *
 * Key ideas:
 *  1. Draw each cell's floor as a hex scaled down to `floorScale` (≈86%) so a
 *     dark void gutter naturally appears between all adjacent tiles.
 *  2. Where two cells share an OPEN passage, fill the gutter gap with a bridge
 *     quad that visually merges the two floors into one continuous surface.
 *  3. Where a wall EXISTS, leave the gutter dark — the void IS the wall.
 *     Then draw a bright neon line (thick, round caps) on top so walls read as
 *     solid glowing geometry rather than absent strokes.
 *
 * Direction → edge-corner mapping (flat-top hex, corners at 60*i degrees):
 *   direction d  →  corners[(d+5)%6]  and  corners[d]
 * Bridge vertices for passage in direction d from A to B:
 *   A[(d+5)%6]  →  A[d]  →  B[(d+2)%6]  →  B[(d+3)%6]
 */
class HexRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = options.cellSize || 32;
    this.padding = options.padding || 52;
    this.floorScale = 0.84; // shrink factor; ~16% gutter width

    this.colors = {
      void:          '#06060f',           // background / gutter / wall darkness
      floor:         '#111827',           // plain walkable tile
      floorBuildable:'#162030',           // tower-placeable tile (slightly brighter)
      bridge:        '#111827',           // passage fill (matches floor)
      wall:          '#00d4ff',           // neon cyan wall line
      wallGlowInner: 'rgba(0,212,255,0.30)',
      wallGlowOuter: 'rgba(0,212,255,0.55)',
      start:         '#00ff88',
      goal:          '#ff4466',
      pathFloor:     'rgba(255,200,50,0.22)',
      pathBridge:    'rgba(255,200,50,0.22)',
      pathLine:      'rgba(255,200,50,0.80)',
    };

    this.showPath = options.showPath ?? false;
    this._path = [];
  }

  setPath(pathKeys) {
    this._path = pathKeys;
  }

  render(grid) {
    const ctx = this.ctx;
    const size = this.cellSize;
    const f = this.floorScale;

    // ── Bounding box ─────────────────────────────────────────────────────────
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const cell of grid.cells.values()) {
      const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
      minX = Math.min(minX, x - size);   maxX = Math.max(maxX, x + size);
      minY = Math.min(minY, y - size);   maxY = Math.max(maxY, y + size);
    }
    const W = maxX - minX + this.padding * 2;
    const H = maxY - minY + this.padding * 2;
    this.canvas.width  = W;
    this.canvas.height = H;
    const offX = -minX + this.padding;
    const offY = -minY + this.padding;
    // Expose for external coordinate conversion
    this.offX = offX;
    this.offY = offY;
    // World-pixel coordinate of the canvas top-left corner.
    // Derivation: canvas x=0 maps to world x = -offX (since canvasX = worldX + offX).
    this.worldLeft = -offX;
    this.worldTop  = -offY;

    // ── Helpers ───────────────────────────────────────────────────────────────

    // Returns shrunken corner array for a cell (absolute canvas coords)
    const shrunk = (cell, scale) => {
      const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
      return HexMath.corners(x + offX, y + offY, size * scale);
    };

    const pathSet = new Set(this._path);

    // ── Pass 1: bridge quads (open passages) ──────────────────────────────────
    // Drawn first so the floor tiles can paint on top of them at cell centres.
    for (const cell of grid.cells.values()) {
      const scA = shrunk(cell, f);
      const onPath = this.showPath && pathSet.has(cell.key);

      for (let d = 0; d < 6; d++) {
        if (cell.walls[d]) continue;                    // wall here → no bridge

        const nb  = HexMath.neighbor(cell.q, cell.r, cell.s, d);
        const nk  = HexMath.key(nb.q, nb.r, nb.s);
        const nbCell = grid.cells.get(nk);
        if (!nbCell) continue;

        // Draw each bridge only once (from the lexicographically smaller key)
        if (cell.key >= nk) continue;

        const scB = shrunk(nbCell, f);
        const nbOnPath = this.showPath && pathSet.has(nk);

        // Correct edge→corner mapping: direction d → corners (d+5)%6 and d
        // Bridge quad: A[(d+5)%6] → A[d] → B[(d+2)%6] → B[(d+3)%6]
        const a0 = (d + 5) % 6, a1 = d;
        const b0 = (d + 2) % 6, b1 = (d + 3) % 6;

        ctx.beginPath();
        ctx.moveTo(scA[a0].x, scA[a0].y);
        ctx.lineTo(scA[a1].x, scA[a1].y);
        ctx.lineTo(scB[b0].x, scB[b0].y);
        ctx.lineTo(scB[b1].x, scB[b1].y);
        ctx.closePath();

        ctx.fillStyle = (onPath && nbOnPath)
          ? this.colors.pathBridge
          : this.colors.bridge;
        ctx.fill();
      }
    }

    // ── Pass 2: shrunken hex floor tiles ─────────────────────────────────────
    for (const cell of grid.cells.values()) {
      const sc = shrunk(cell, f);

      ctx.beginPath();
      ctx.moveTo(sc[0].x, sc[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(sc[i].x, sc[i].y);
      ctx.closePath();

      if (cell.isGoal) {
        ctx.fillStyle = 'rgba(255,68,102,0.30)';
      } else if (cell.isStart) {
        ctx.fillStyle = 'rgba(0,255,136,0.30)';
      } else if (this.showPath && pathSet.has(cell.key)) {
        ctx.fillStyle = this.colors.pathFloor;
      } else {
        ctx.fillStyle = this.colors.floor;
      }
      ctx.fill();
    }

    // ── Pass 3: wall lines (thick, round, neon) ───────────────────────────────
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    for (const cell of grid.cells.values()) {
      const sc = shrunk(cell, f);

      for (let d = 0; d < 6; d++) {
        if (!cell.walls[d]) continue;

        const nb = HexMath.neighbor(cell.q, cell.r, cell.s, d);
        const nk = HexMath.key(nb.q, nb.r, nb.s);

        // Skip inner walls that will be drawn by the neighbour's pass too;
        // only draw each inner wall once (from the smaller key side).
        // Outer-boundary walls are always drawn (no neighbour exists).
        const isOuter = !grid.cells.has(nk);
        if (!isOuter && cell.key >= nk) continue;

        // Correct corner mapping for this direction
        const p0 = sc[(d + 5) % 6];
        const p1 = sc[d];

        if (isOuter) {
          // Outer boundary: wider glow + slightly thicker line
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = this.colors.wallGlowOuter;
          ctx.lineWidth = 14;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = this.colors.wall;
          ctx.lineWidth = 5;
          ctx.stroke();
        } else {
          // Inner wall: narrower glow + standard line
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = this.colors.wallGlowInner;
          ctx.lineWidth = 10;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = this.colors.wall;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }
    }

    // ── Pass 4: solution path line ────────────────────────────────────────────
    if (this.showPath && this._path.length > 1) {
      ctx.save();
      ctx.beginPath();
      let first = true;
      for (const key of this._path) {
        const cell = grid.cells.get(key);
        if (!cell) continue;
        const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
        if (first) { ctx.moveTo(x + offX, y + offY); first = false; }
        else        { ctx.lineTo(x + offX, y + offY); }
      }
      ctx.strokeStyle = this.colors.pathLine;
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Pass 5: Start / Goal markers ─────────────────────────────────────────
    this._drawMarker(ctx, grid.startCell, offX, offY, size, this.colors.start, 'S');
    this._drawMarker(ctx, grid.goalCell,  offX, offY, size, this.colors.goal,  'G');
  }

  _drawMarker(ctx, cell, offX, offY, size, color, label) {
    if (!cell) return;
    const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
    const cx = x + offX, cy = y + offY;
    const r  = size * 0.35;

    ctx.save();

    // Glow halo
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = color.replace(')', ', 0.15)').replace('rgb', 'rgba');
    ctx.fill();

    // Solid circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 18;
    ctx.fill();
    ctx.shadowBlur  = 0;

    // Label
    ctx.fillStyle    = '#06060f';
    ctx.font         = `bold ${Math.round(r * 1.15)}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);

    ctx.restore();
  }
}
