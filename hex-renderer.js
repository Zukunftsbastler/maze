/**
 * HexRenderer — "shrunken tile + bridge" technique for instant maze readability.
 *
 * Fog-of-War support (fogMode = true):
 *   visibility 0 = HIDDEN   → cell not drawn (void shows through)
 *   visibility 1 = REVEALED → dimmed floor, flat muted walls (no glow)
 *   visibility 2 = IN_SIGHT → full bright / neon rendering
 *
 * When fogMode = false (analysis mode, archived islands) all cells render
 * as IN_SIGHT regardless of their stored visibility value.
 */
class HexRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = options.cellSize || 32;
    this.padding = options.padding || 52;
    this.floorScale = 0.84;
    this.fogMode = options.fogMode ?? false;

    this.colors = {
      void:             '#06060f',
      floor:            '#111827',
      bridge:           '#111827',
      wall:             '#00d4ff',
      wallGlowInner:    'rgba(0,212,255,0.30)',
      wallGlowOuter:    'rgba(0,212,255,0.55)',
      start:            '#00ff88',
      goal:             '#ff4466',
      pathFloor:        'rgba(255,200,50,0.22)',
      pathBridge:       'rgba(255,200,50,0.22)',
      pathLine:         'rgba(255,200,50,0.80)',
      // Fog-of-war: revealed (memory) state
      floorRevealed:    '#0b0f17',
      bridgeRevealed:   '#0b0f17',
      wallRevealed:     '#1e3a4a',
      // Defence
      floorBuildable:   'rgba(110,55,210,0.22)',
      floorBlockade:    '#1a080e',
    };

    this.showPath = options.showPath ?? false;
    this._path = [];
  }

  setPath(pathKeys) { this._path = pathKeys; }

  render(grid) {
    const ctx = this.ctx;
    const size = this.cellSize;
    const f    = this.floorScale;
    const fog  = this.fogMode;

    // ── Bounding box ──────────────────────────────────────────────────────────
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
    this.offX = offX;
    this.offY = offY;
    this.worldLeft = -offX;
    this.worldTop  = -offY;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const shrunk = (cell, scale) => {
      const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
      return HexMath.corners(x + offX, y + offY, size * scale);
    };

    // Effective visibility: in fogMode read cell state, otherwise treat as 2.
    const vis = fog
      ? cell => cell.visibility
      : ()   => 2;

    const pathSet = new Set(this._path);

    // ── Pass 1: bridge quads (open passages) ──────────────────────────────────
    for (const cell of grid.cells.values()) {
      const vA = vis(cell);
      if (vA === 0) continue; // hidden cell never contributes a bridge

      const scA    = shrunk(cell, f);
      const onPath = this.showPath && pathSet.has(cell.key);

      for (let d = 0; d < 6; d++) {
        if (cell.walls[d]) continue;

        const nb     = HexMath.neighbor(cell.q, cell.r, cell.s, d);
        const nk     = HexMath.key(nb.q, nb.r, nb.s);
        const nbCell = grid.cells.get(nk);
        if (!nbCell) continue;
        if (cell.key >= nk) continue; // draw once

        const vB = vis(nbCell);
        if (vB === 0) continue; // other side hidden

        const scB      = shrunk(nbCell, f);
        const nbOnPath = this.showPath && pathSet.has(nk);

        const a0 = (d + 5) % 6, a1 = d;
        const b0 = (d + 2) % 6, b1 = (d + 3) % 6;

        ctx.beginPath();
        ctx.moveTo(scA[a0].x, scA[a0].y);
        ctx.lineTo(scA[a1].x, scA[a1].y);
        ctx.lineTo(scB[b0].x, scB[b0].y);
        ctx.lineTo(scB[b1].x, scB[b1].y);
        ctx.closePath();

        // Dimmed bridge if either side is only revealed (not in-sight)
        if (vA < 2 || vB < 2) {
          ctx.fillStyle = this.colors.bridgeRevealed;
        } else if (onPath && nbOnPath) {
          ctx.fillStyle = this.colors.pathBridge;
        } else {
          ctx.fillStyle = this.colors.bridge;
        }
        ctx.fill();
      }
    }

    // ── Pass 2: shrunken hex floor tiles ──────────────────────────────────────
    for (const cell of grid.cells.values()) {
      const v = vis(cell);
      if (v === 0) continue; // hidden — void shows through

      const sc = shrunk(cell, f);
      ctx.beginPath();
      ctx.moveTo(sc[0].x, sc[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(sc[i].x, sc[i].y);
      ctx.closePath();

      if (v === 1) {
        ctx.fillStyle = this.colors.floorRevealed;
      } else if (cell.blockadeLevel > 0) {
        ctx.fillStyle = this.colors.floorBlockade;
      } else if (cell.isGoal) {
        ctx.fillStyle = 'rgba(255,68,102,0.30)';
      } else if (cell.isStart) {
        ctx.fillStyle = 'rgba(0,255,136,0.30)';
      } else if (this.showPath && pathSet.has(cell.key)) {
        ctx.fillStyle = this.colors.pathFloor;
      } else if (cell.isBuildable) {
        ctx.fillStyle = this.colors.floorBuildable;
      } else {
        ctx.fillStyle = this.colors.floor;
      }
      ctx.fill();
    }

    // ── Pass 3: wall lines ────────────────────────────────────────────────────
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    for (const cell of grid.cells.values()) {
      const v = vis(cell);
      if (v === 0) continue; // hidden — no walls drawn

      const sc = shrunk(cell, f);

      for (let d = 0; d < 6; d++) {
        if (!cell.walls[d]) continue;

        const nb  = HexMath.neighbor(cell.q, cell.r, cell.s, d);
        const nk  = HexMath.key(nb.q, nb.r, nb.s);
        const isOuter = !grid.cells.has(nk);
        if (!isOuter && cell.key >= nk) continue;

        const p0 = sc[(d + 5) % 6];
        const p1 = sc[d];

        const vOther = isOuter ? v : vis(grid.cells.get(nk) ?? cell);
        const dimmed  = v < 2 && vOther < 2; // both revealed/hidden → flat wall

        if (dimmed) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = this.colors.wallRevealed;
          ctx.lineWidth = isOuter ? 5 : 4;
          ctx.stroke();
        } else if (isOuter) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = this.colors.wallGlowOuter;
          ctx.lineWidth = 14; ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = this.colors.wall;
          ctx.lineWidth = 5;  ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = this.colors.wallGlowInner;
          ctx.lineWidth = 10; ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = this.colors.wall;
          ctx.lineWidth = 4;  ctx.stroke();
        }
      }
    }

    // ── Pass 3.5: in-world icons (currency, upgrade, blockade X, build dot) ─────
    for (const cell of grid.cells.values()) {
      if (vis(cell) !== 2) continue; // icons only when fully visible

      const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
      const cx = x + offX, cy = y + offY;
      const ir = size * 0.20;

      if (cell.blockadeLevel > 0) {
        const w = ir * 0.75;
        ctx.strokeStyle = '#ff4466'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - w, cy - w); ctx.lineTo(cx + w, cy + w); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + w, cy - w); ctx.lineTo(cx - w, cy + w); ctx.stroke();
      } else if (cell.hasCurrency) {
        ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI * 2);
        ctx.fillStyle   = '#ffd23f';
        ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 10;
        ctx.fill(); ctx.shadowBlur = 0;
      } else if (cell.hasUpgrade) {
        ctx.beginPath();
        ctx.moveTo(cx,      cy - ir * 1.3);
        ctx.lineTo(cx + ir, cy);
        ctx.lineTo(cx,      cy + ir * 1.3);
        ctx.lineTo(cx - ir, cy);
        ctx.closePath();
        ctx.fillStyle   = '#4a9eff';
        ctx.shadowColor = '#4a9eff'; ctx.shadowBlur = 10;
        ctx.fill(); ctx.shadowBlur = 0;
      } else if (cell.isBuildable) {
        ctx.beginPath(); ctx.arc(cx, cy, ir * 0.42, 0, Math.PI * 2);
        ctx.fillStyle   = 'rgba(150,90,255,0.85)';
        ctx.shadowColor = '#8844ff'; ctx.shadowBlur = 7;
        ctx.fill(); ctx.shadowBlur = 0;
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

    // ── Pass 5: Start / Goal markers ──────────────────────────────────────────
    // Goal is always shown (navigation target); start only when visible.
    this._drawMarker(ctx, grid.goalCell,  offX, offY, size, this.colors.goal,  'G');
    if (!fog || vis(grid.startCell) > 0) {
      this._drawMarker(ctx, grid.startCell, offX, offY, size, this.colors.start, 'S');
    }
  }

  _drawMarker(ctx, cell, offX, offY, size, color, label) {
    if (!cell) return;
    const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
    const cx = x + offX, cy = y + offY;
    const r  = size * 0.35;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = color.replace(')', ', 0.15)').replace('rgb', 'rgba');
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle   = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 18;
    ctx.fill();
    ctx.shadowBlur  = 0;

    ctx.fillStyle    = '#06060f';
    ctx.font         = `bold ${Math.round(r * 1.15)}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    ctx.restore();
  }
}
