/**
 * HexRenderer — "Antique Cartographer's Map" style.
 *
 * WALL CONNECTIVITY
 *   Wall corners are computed at scale = 1.0 (full circumradius).  In a
 *   flat-top hex grid the six corner points at circumradius = size are shared
 *   exactly between adjacent cells.
 *
 * KRAKELIG / SHAKY-HAND LINE STYLE
 *   Each wall segment is rendered as a polyline with several intermediate
 *   points displaced perpendicularly.  Variable per-segment lineWidth simulates
 *   natural quill-pen pressure.  Endpoint displacement is always zero so
 *   adjacent runs meet flush.  Vertex joint dots cap every junction cleanly.
 *
 * EXTERIOR HATCHING
 *   Short parallel ink strokes extend outward from boundary walls into the
 *   "solid rock" exterior, communicating topological depth.
 *
 * CARTOGRAPHIC MARKERS
 *   Start/Goal replaced with hand-drawn compass star and X-marks-the-spot
 *   symbols in the same ink palette — no digital typography.
 *
 * INK BLEED
 *   All ink strokes interact with the CSS parchment background via
 *   mix-blend-mode: multiply applied on the <canvas> element (index.html).
 */
class HexRenderer {
  constructor(canvas, options = {}) {
    this.canvas      = canvas;
    this.ctx         = canvas.getContext('2d');
    this.cellSize    = options.cellSize  || 32;
    this.padding     = options.padding   || 52;
    this.floorScale  = 0.84;
    this.fogMode     = options.fogMode   ?? false;
    this.images      = options.images    || {};
    this.renderTime  = 0;

    // All ink tones share the warm umber family — they belong on the same paper
    this.INK         = '#2c1f14';              // deep iron-gall sepia
    this.INK_HALO    = 'rgba(44,31,20,0.07)';  // warm bloom halo
    this.INK_GHOST   = 'rgba(44,31,20,0.17)';  // fog-memory wall tint
    this.INK_START   = '#263912';              // desaturated forest olive — same ink family
    this.INK_GOAL    = '#4e130a';              // desaturated oxblood — same ink family

    this.showPath = options.showPath ?? false;
    this._path    = [];
  }

  setPath(pathKeys) { this._path = pathKeys; }

  // Deterministic [0, 1) — same seed → same value every render
  _rng(seed) {
    const x = Math.sin(seed + 1.0) * 43758.5453;
    return x - Math.floor(x);
  }

  render(grid, now = 0) {
    this.renderTime = now || this.renderTime;
    const ctx  = this.ctx;
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
    const W    = maxX - minX + this.padding * 2;
    const H    = maxY - minY + this.padding * 2;
    this.canvas.width  = W;
    this.canvas.height = H;
    const offX = -minX + this.padding;
    const offY = -minY + this.padding;
    this.offX      = offX;
    this.offY      = offY;
    this.worldLeft = -offX;
    this.worldTop  = -offY;

    ctx.clearRect(0, 0, W, H);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const hexCorners = (cell, scale) => {
      const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
      return HexMath.corners(x + offX, y + offY, size * scale);
    };

    const vis        = fog ? cell => cell.visibility : () => 2;
    const cellAlpha  = (cell) => {
      if (!fog || !cell._revealTime) return 1;
      return Math.min(1, (now - cell._revealTime) / 380);
    };

    const cellVariant = (cell, n) => Math.abs(cell.q * 7 + cell.r * 11) % n;

    // ── Pass 0: Fog hachure — diagonal pen strokes replace flat opaque fills ────
    // HIDDEN (v=0): dense warm-umber hachure — reads solid at a glance, paper shows through
    // REVEALED (v=1): sparse lighter hachure — memory impression, more paper visible
    if (fog) {
      for (const cell of grid.cells.values()) {
        const v = vis(cell);
        if (v === 2) continue;

        const sc    = hexCorners(cell, 0.97);
        const alpha = cellAlpha(cell);
        const hSeed = cell.q * 73.1 + cell.r * 197.3;
        // Per-cell angle variation ±5° — cohesive field, not mechanical
        const hAngle = Math.PI * 0.22 + (this._rng(hSeed * 1.7) - 0.5) * Math.PI * 0.055;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Subtle warm base tint before hachure softens the paper-to-fog transition
        ctx.beginPath();
        ctx.moveTo(sc[0].x, sc[0].y);
        for (let i = 1; i < 6; i++) ctx.lineTo(sc[i].x, sc[i].y);
        ctx.closePath();
        ctx.fillStyle = v === 0 ? 'rgba(145,112,65,0.28)' : 'rgba(152,120,72,0.12)';
        ctx.fill();

        if (v === 0) {
          this._drawHachure(ctx, sc, 'rgba(104,71,36,0.86)', 1.10, 3.3, hAngle, hSeed);
        } else {
          this._drawHachure(ctx, sc, 'rgba(104,71,36,0.42)', 0.75, 5.8, hAngle, hSeed);
        }

        ctx.restore();
      }
    }

    // ── Pass 1: Ink splatters — small organic navy blobs ──────────────────────
    if (fog) {
      for (const cell of grid.cells.values()) {
        if (!cell._inkSplatters?.length) continue;
        const v = vis(cell);
        if (v === 0) continue;
        const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
        const cx = x + offX, cy = y + offY;

        ctx.save();
        ctx.globalAlpha = cellAlpha(cell) * (v === 1 ? 0.40 : 0.82);
        for (const s of cell._inkSplatters) {
          this._drawInkSplatter(ctx, cx + s.dx, cy + s.dy, s.r, s.angle ?? 0, s.seed ?? 0);
        }
        ctx.restore();
      }
    }

    // ── Pass 2: Blockade floor — cross-hatch reads as solid barrier ──────────
    for (const cell of grid.cells.values()) {
      if (cell.blockadeLevel === 0) continue;
      const v = vis(cell);
      if (v === 0) continue;
      const sc    = hexCorners(cell, f);
      const alpha = cellAlpha(cell);
      const hSeed = cell.q * 53.1 + cell.r * 173.7;
      const angle = Math.PI * 0.18 + (this._rng(hSeed) - 0.5) * 0.10;
      const opa   = v === 2 ? 0.44 : 0.26;
      ctx.save();
      ctx.globalAlpha = alpha;
      this._drawHachure(ctx, sc, `rgba(76,44,18,${opa})`,        0.72, 4.6, angle,              hSeed);
      this._drawHachure(ctx, sc, `rgba(76,44,18,${opa * 0.55})`, 0.55, 5.8, angle + Math.PI * 0.5, hSeed + 77);
      ctx.restore();
    }

    // ── Pass 3: Solution path line ────────────────────────────────────────────
    if (this.showPath && this._path.length > 1) {
      ctx.save();
      ctx.beginPath();
      let first = true;
      for (const key of this._path) {
        const cell = grid.cells.get(key);
        if (!cell) continue;
        if (fog && vis(cell) === 0) { first = true; continue; }
        const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
        if (first) { ctx.moveTo(x + offX, y + offY); first = false; }
        else        { ctx.lineTo(x + offX, y + offY); }
      }
      ctx.strokeStyle = 'rgba(100,65,20,0.70)';
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Pass 4: Build-spot cartographic markers ───────────────────────────────
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const cell of grid.cells.values()) {
      if (!cell.isBuildable || cell.blockadeLevel > 0) continue;
      const v = vis(cell);
      if (v === 0) continue;
      const alpha = cellAlpha(cell) * (v === 1 ? 0.45 : 1.0);
      const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
      const cx = x + offX, cy = y + offY;

      ctx.save();
      ctx.globalAlpha = alpha;

      const bsc = hexCorners(cell, f * 0.55);
      ctx.beginPath();
      ctx.moveTo(bsc[0].x, bsc[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(bsc[i].x, bsc[i].y);
      ctx.closePath();
      ctx.lineWidth  = 1.5;
      ctx.setLineDash([4, 4]);
      if (v === 2) {
        // Muted slate-navy — desaturated so multiply blend keeps it parchment-warm
        ctx.strokeStyle = 'rgba(44,54,82,0.72)';
        ctx.shadowColor = 'rgba(44,54,82,0.15)';
        ctx.shadowBlur  = 5;
      } else {
        ctx.strokeStyle = 'rgba(38,46,72,0.36)';
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      const arm = size * 0.09;
      ctx.setLineDash([]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - arm, cy); ctx.lineTo(cx + arm, cy);
      ctx.moveTo(cx, cy - arm); ctx.lineTo(cx, cy + arm);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);

    // ── Pass 4.5: Exterior hatching — solid rock beyond the maze boundary ─────
    //
    // Short, parallel, sketchy ink strokes radiate outward from every boundary
    // wall.  They communicate topological depth: the empty space beyond is not
    // void, it is solid earth.
    {
      ctx.save();
      ctx.lineCap = 'round';   // same pen character as walls

      for (const cell of grid.cells.values()) {
        const v = vis(cell);
        if (v === 0) continue;

        const alpha  = cellAlpha(cell);
        const scW    = hexCorners(cell, 1.0);
        const s0     = cell.q * 53.1 + cell.r * 197.3;
        const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
        const cx = x + offX, cy = y + offY;

        for (let d = 0; d < 6; d++) {
          if (!cell.walls[d]) continue;
          const nb  = HexMath.neighbor(cell.q, cell.r, cell.s, d);
          const nk  = HexMath.key(nb.q, nb.r, nb.s);
          if (grid.cells.has(nk)) continue;   // inner wall — no hatching

          const p0 = scW[(d + 5) % 6];
          const p1 = scW[d];
          const edgeX = p1.x - p0.x, edgeY = p1.y - p0.y;
          const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY) || 1;

          // Outward normal: cell-centre → wall midpoint
          const midX = (p0.x + p1.x) * 0.5, midY = (p0.y + p1.y) * 0.5;
          let nrmX = midX - cx, nrmY = midY - cy;
          const nrmLen = Math.sqrt(nrmX * nrmX + nrmY * nrmY) || 1;
          nrmX /= nrmLen; nrmY /= nrmLen;

          // Organic clustering — strokes in tight groups with irregular gaps.
          // Angle: 30°–48° from outward normal = 42°–60° from wall surface.
          // Length: high variance so some are very short, some nearly full depth.
          const baseLen     = size * 0.54;
          const baseSpacing = Math.max(4.5, size * 0.17);
          const edgeDirX    = edgeX / edgeLen, edgeDirY = edgeY / edgeLen;

          // Per-wall tilt magnitude (stable across frames — deterministic)
          const baseTiltMag = Math.PI * (0.17 + this._rng(s0 * 1.9 + d * 5.3) * 0.09);

          let pos       = this._rng(s0 * 2.3 + d * 7.1) * baseSpacing;
          let strokeIdx = 0;

          while (pos < edgeLen) {
            const clusterN   = 2 + Math.floor(this._rng(s0 * 3.7 + d * 11  + strokeIdx * 17) * 3.6);
            const intraSpace = baseSpacing * (0.20 + this._rng(s0 * 4.1 + d * 13 + strokeIdx * 19) * 0.32);

            for (let c = 0; c < clusterN; c++) {
              const edgeT = (pos + c * intraSpace) / edgeLen;
              if (edgeT >= 1.0) break;

              const hx = p0.x + edgeX * edgeT;
              const hy = p0.y + edgeY * edgeT;

              // Per-stroke tilt variation ±15° from cluster base
              const tiltVar = (this._rng(s0 * 7.3 + d * 29 + strokeIdx * 7 + c * 3) - 0.5) * 0.26;
              const tiltMag = baseTiltMag + tiltVar;
              const cosT    = Math.cos(tiltMag), sinT = Math.sin(tiltMag);
              // dir = nrm rotated toward edge direction by tiltMag
              const lnX = nrmX * cosT + edgeDirX * sinT;
              const lnY = nrmY * cosT + edgeDirY * sinT;

              // High length variance: 0.10× to 1.25× baseLen
              const hLen = baseLen * (0.10 + this._rng(s0 * 9.1 + d * 31 + strokeIdx * 11 + c * 7) * 1.15);
              const rawO = 0.22 + this._rng(s0 * 11 + d * 41 + strokeIdx * 13 + c *  5) * 0.24;
              const opa  = rawO * (v === 1 ? 0.40 : 1.0);
              const lw   = 0.90 + this._rng(s0 * 13 + d *  7 + strokeIdx * 17 + c *  3) * 0.70;

              ctx.globalAlpha = alpha * opa;
              ctx.lineWidth   = lw;
              ctx.strokeStyle = this.INK;

              const perpX  = -lnY, perpY = lnX;
              const hSteps = Math.max(2, Math.ceil(hLen / 5));
              ctx.beginPath();
              ctx.moveTo(hx, hy);
              for (let hs = 1; hs <= hSteps; hs++) {
                const ht = hs / hSteps;
                const hj = hs < hSteps
                  ? (this._rng(s0 * 19 + d * 61 + strokeIdx * 23 + c * 7 + hs * 11) - 0.5) * hLen * 0.15
                  : 0;
                ctx.lineTo(hx + lnX * hLen * ht + perpX * hj, hy + lnY * hLen * ht + perpY * hj);
              }
              ctx.stroke();
            }

            strokeIdx++;
            // Gap between clusters: 1.8×–4.0× baseSpacing
            pos += clusterN * intraSpace
                 + baseSpacing * (1.8 + this._rng(s0 * 15 + d * 43 + strokeIdx * 23) * 2.2);
          }
        }
      }

      ctx.restore();
    }

    // ── Pass 5: Walls — polyline jitter, variable-width ink, vertex joints ─────
    //
    // CONNECTIVITY: corners at scale 1.0 are the true hex vertices.  All wall
    // run endpoints land on exact shared vertices → adjacent runs meet flush.
    //
    // PEN PRESSURE: the main ink stroke is drawn segment-by-segment, each with
    // its own lineWidth derived from a sine-wave + noise "pressure" function.
    //
    // VERTEX JOINTS: endpoint positions are collected; after all runs a filled
    // dot at each vertex bridges any visible cap-overlap between meeting runs.
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const wallJoints = new Map();
    const addJoint   = (p, lw) => {
      const k = `${Math.round(p.x * 4)},${Math.round(p.y * 4)}`;
      if (!wallJoints.has(k)) wallJoints.set(k, { x: p.x, y: p.y, lw });
      else if (lw > wallJoints.get(k).lw) wallJoints.get(k).lw = lw;
    };

    for (const cell of grid.cells.values()) {
      const v = vis(cell);
      if (v === 0) continue;

      const alpha  = cellAlpha(cell);
      const scW    = hexCorners(cell, 1.0);
      const ghost  = v < 2;
      const seed0  = cell.q * 127.1 + cell.r * 311.7;

      // ── Determine which directions this cell owns ─────────────────────────
      const own = [false, false, false, false, false, false];
      for (let d = 0; d < 6; d++) {
        if (!cell.walls[d]) continue;
        const nb     = HexMath.neighbor(cell.q, cell.r, cell.s, d);
        const nk     = HexMath.key(nb.q, nb.r, nb.s);
        const outer  = !grid.cells.has(nk);
        if (outer) {
          own[d] = true;
        } else {
          const vNb = vis(grid.cells.get(nk));
          if (vNb === 0)           own[d] = true;
          else if (cell.key < nk)  own[d] = true;
        }
      }

      // ── Group consecutive owned directions into runs ──────────────────────
      let gapStart = 0;
      while (gapStart < 6 && own[gapStart]) gapStart++;

      const drawRun = (run, closed) => {
        if (!run.length) return;

        // Exact full-scale corner endpoints
        const pts = [ scW[(run[0] + 5) % 6] ];
        for (const d of run) pts.push(scW[d]);

        // Build jittered polyline
        const jPts = [ pts[0] ];
        for (let i = 0; i < run.length; i++) {
          const p0  = pts[i], p1 = pts[i + 1];
          const dx  = p1.x - p0.x, dy = p1.y - p0.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx  = -dy / len, ny = dx / len;
          const d   = run[i];
          const steps = Math.max(4, Math.ceil(len / 7));

          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            let jitter = 0;
            if (s < steps) {
              const wave  = Math.sin(t * Math.PI * 2.2 + d * 2.3 + seed0 * 0.01) * size * 0.05;
              const noise = (this._rng(seed0 * 13.7 + d * 23.1 + s * 7.3) - 0.5) * size * 0.07;
              jitter = wave + noise;
            }
            jPts.push({ x: p0.x + dx * t + nx * jitter, y: p0.y + dy * t + ny * jitter });
          }
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        if (ghost) {
          // Single faint stroke for memory-revealed walls
          ctx.beginPath();
          ctx.moveTo(jPts[0].x, jPts[0].y);
          for (let i = 1; i < jPts.length; i++) ctx.lineTo(jPts[i].x, jPts[i].y);
          if (closed) ctx.closePath();
          ctx.strokeStyle = this.INK_GHOST;
          ctx.lineWidth   = 1.3;
          ctx.stroke();
        } else {
          // Wide warm halo — drawn once as a single path for speed
          ctx.beginPath();
          ctx.moveTo(jPts[0].x, jPts[0].y);
          for (let i = 1; i < jPts.length; i++) ctx.lineTo(jPts[i].x, jPts[i].y);
          if (closed) ctx.closePath();
          ctx.strokeStyle = this.INK_HALO;
          ctx.lineWidth   = 8;
          ctx.stroke();

          // Variable-width main ink stroke — per-segment for pen-pressure effect.
          // A taper envelope narrows the first and last 2–3 segments to ~38 % of
          // peak width, simulating the pen nib lifting from the parchment surface.
          const baseW  = 2.2;
          const pressA = 0.85;     // amplitude: ±0.85 px swing
          let maxLw    = baseW;
          ctx.strokeStyle = this.INK;
          const segCount = jPts.length - 1;
          for (let i = 0; i < segCount; i++) {
            const t        = segCount > 1 ? i / (segCount - 1) : 0.5;
            const rn       = (this._rng(seed0 * 17.3 + i * 6.1 + run[0] * 2.9) - 0.5) * 0.30;
            const pressure = baseW + pressA * Math.sin(t * Math.PI * 3.1 + seed0 * 0.07) + rn;
            // Taper: fade in over first 2.5 segs, fade out over last 2.5 segs
            const taperIn  = Math.min(1.0, (i + 0.5) / 2.5);
            const taperOut = Math.min(1.0, (segCount - i - 0.5) / 2.5);
            const taper    = Math.min(taperIn, taperOut);
            const lw       = Math.max(0.28, pressure * (0.38 + taper * 0.62));
            if (lw > maxLw) maxLw = lw;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(jPts[i].x,     jPts[i].y);
            ctx.lineTo(jPts[i + 1].x, jPts[i + 1].y);
            ctx.stroke();
          }

          // Register endpoints for the joint-dot pass
          addJoint(jPts[0],                jPts.length > 1 ?
            Math.max(0.75, baseW + pressA * Math.sin(0 + seed0 * 0.07)) : baseW);
          addJoint(jPts[jPts.length - 1],  maxLw);
        }

        ctx.restore();
      };

      if (gapStart === 6) {
        drawRun([0, 1, 2, 3, 4, 5], true);
      } else {
        let run = [];
        for (let i = 0; i < 6; i++) {
          const d = (gapStart + i) % 6;
          if (own[d]) {
            run.push(d);
          } else if (run.length) {
            drawRun(run, false);
            run = [];
          }
        }
        if (run.length) drawRun(run, false);
      }
    }

    // ── Pass 5.5: Vertex joint dots — clean up cap-overlap at intersections ───
    {
      ctx.save();
      ctx.fillStyle = this.INK;
      for (const { x, y, lw } of wallJoints.values()) {
        ctx.beginPath();
        ctx.arc(x, y, lw * 0.60, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ── Pass 6: Blockade markers — depth-appropriate material sprites ─────────
    for (const cell of grid.cells.values()) {
      if (cell.blockadeLevel === 0) continue;
      const v = vis(cell);
      if (v === 0) continue;

      const alpha = cellAlpha(cell);
      const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
      const cx = x + offX, cy = y + offY;

      ctx.save();
      ctx.globalAlpha = alpha * (v === 2 ? 1.0 : 0.65);

      const matFull = this.images.matFull;
      if (matFull?.length) {
        const img = matFull[cellVariant(cell, matFull.length)];
        if (img?.complete && img.naturalWidth > 0) {
          const iSize = size * 1.15;
          ctx.filter = 'drop-shadow(1px 2px 4px rgba(0,0,0,0.45))';
          ctx.drawImage(img, cx - iSize / 2, cy - iSize / 2, iSize, iSize);
          ctx.filter = 'none';
        } else {
          this._drawBlockadeX(ctx, cx, cy, size, v);
        }
      } else {
        this._drawBlockadeX(ctx, cx, cy, size, v);
      }

      ctx.restore();
    }

    // ── Pass 7: Loot icons ────────────────────────────────────────────────────
    for (const cell of grid.cells.values()) {
      const v = vis(cell);
      if (v !== 2) continue;

      const alpha = cellAlpha(cell);
      const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
      const cx = x + offX, cy = y + offY;
      const ir = size * 0.36;

      if (cell.hasCurrency) {
        const img = this.images.coin;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (img?.complete && img.naturalWidth > 0) {
          ctx.filter = 'drop-shadow(1px 2px 3px rgba(0,0,0,0.45))';
          ctx.drawImage(img, cx - ir, cy - ir, ir * 2, ir * 2);
          ctx.filter = 'none';
        } else {
          ctx.beginPath(); ctx.arc(cx, cy, ir * 0.85, 0, Math.PI * 2);
          ctx.fillStyle   = '#b8852a';
          ctx.shadowColor = '#b8852a'; ctx.shadowBlur = 8;
          ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(244,235,216,0.85)';
          ctx.font = `bold ${Math.round(ir * 0.9)}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('G', cx, cy);
        }
        ctx.restore();
      } else if (cell.hasUpgrade) {
        const img = this.images.upgrade;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (img?.complete && img.naturalWidth > 0) {
          ctx.filter = 'drop-shadow(1px 2px 3px rgba(0,0,0,0.45))';
          ctx.drawImage(img, cx - ir, cy - ir, ir * 2, ir * 2);
          ctx.filter = 'none';
        } else {
          ctx.beginPath();
          ctx.moveTo(cx,      cy - ir * 1.15);
          ctx.lineTo(cx + ir, cy);
          ctx.lineTo(cx,      cy + ir * 1.15);
          ctx.lineTo(cx - ir, cy);
          ctx.closePath();
          ctx.fillStyle   = '#3a5a8b';
          ctx.shadowColor = '#3a5a8b'; ctx.shadowBlur = 8;
          ctx.fill(); ctx.shadowBlur = 0;
        }
        ctx.restore();
      } else if (cell.hasMaterial) {
        const matFrag = this.images.matFrag;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (matFrag?.length) {
          const img = matFrag[cellVariant(cell, matFrag.length)];
          if (img?.complete && img.naturalWidth > 0) {
            ctx.filter = 'drop-shadow(1px 2px 3px rgba(0,0,0,0.38))';
            ctx.drawImage(img, cx - ir, cy - ir, ir * 2, ir * 2);
            ctx.filter = 'none';
          } else {
            ctx.beginPath(); ctx.arc(cx, cy, ir * 0.65, 0, Math.PI * 2);
            ctx.fillStyle = '#c8960a'; ctx.fill();
          }
        } else {
          ctx.beginPath(); ctx.arc(cx, cy, ir * 0.65, 0, Math.PI * 2);
          ctx.fillStyle = '#c8960a'; ctx.fill();
        }
        ctx.restore();
      }
    }

    // ── Pass 8: Start / Goal markers — cartographic ink symbols ───────────────
    this._drawCartographicMarker(ctx, grid.goalCell,  offX, offY, size, 'goal');
    if (!fog || vis(grid.startCell) > 0) {
      this._drawCartographicMarker(ctx, grid.startCell, offX, offY, size, 'start');
    }
  }

  // Fallback X when no barricade material sprite is available
  _drawBlockadeX(ctx, cx, cy, size, v) {
    const w = size * 0.18;
    ctx.strokeStyle = v === 2 ? '#7a2020' : '#5a1818';
    ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w, cy - w); ctx.lineTo(cx + w, cy + w); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w, cy - w); ctx.lineTo(cx - w, cy + w); ctx.stroke();
  }

  // Diagonal hachure fill — clips to the corners polygon and draws parallel
  // slightly-bowed strokes through it.  Caller sets ctx.globalAlpha.
  _drawHachure(ctx, corners, color, lineWidth, spacing, angleRad, seed) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.clip();

    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
    for (const p of corners) {
      minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x);
      minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y);
    }
    const cx   = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5;
    const span = Math.max(maxX - minX, maxY - minY) * 1.44;

    const cos   = Math.cos(angleRad), sin = Math.sin(angleRad);
    const perpX = -sin, perpY = cos;

    ctx.strokeStyle = color;
    ctx.lineCap     = 'round';

    const halfN = Math.ceil(span / spacing) + 1;
    for (let li = -halfN; li <= halfN; li++) {
      const jit = (this._rng(seed * 7.3 + li * 11.7) - 0.5) * spacing * 0.18;
      const off = li * spacing + jit;
      const ox  = cx + perpX * off, oy = cy + perpY * off;

      const x0 = ox - cos * span, y0 = oy - sin * span;
      const x1 = ox + cos * span, y1 = oy + sin * span;

      ctx.lineWidth = lineWidth * (0.70 + this._rng(seed * 9.1 + li * 13.3) * 0.58);

      // Very gentle bow — quadratic gives hand-drawn feel without wildness
      const bow  = (this._rng(seed * 11.7 + li * 17.1) - 0.5) * span * 0.013;
      const midX = (x0 + x1) * 0.5 + perpX * bow;
      const midY = (y0 + y1) * 0.5 + perpY * bow;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(midX, midY, x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Hard-edged ink drop — same medium as the walls (no gradient, no blur).
  // The irregular polygon gives a jagged perimeter; satellite dots are concentrated
  // drops of the identical ink color.
  _drawInkSplatter(ctx, x, y, r, angle, seed) {
    const rng = (n) => this._rng(seed * 37.3 + n * 91.7);

    // Main blob — hard-edged polygon, solid wall ink
    const sides = 8 + Math.floor(rng(0) * 5);
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a  = (i / sides) * Math.PI * 2 + (rng(i + 1) - 0.5) * 0.60;
      const dr = r * (0.50 + rng(i + 2) * 0.56);
      if (i === 0) ctx.moveTo(x + Math.cos(a) * dr, y + Math.sin(a) * dr);
      else         ctx.lineTo(x + Math.cos(a) * dr, y + Math.sin(a) * dr);
    }
    ctx.closePath();
    // Slight per-blob density variation (0.82–0.97) but no gradient → hard edge
    ctx.fillStyle = `rgba(44,31,20,${(0.82 + rng(5) * 0.15).toFixed(2)})`;
    ctx.fill();

    // Satellite drops — concentrated ink, same color, solid
    const nDots = 1 + Math.floor(rng(10) * 3.0);
    for (let i = 0; i < nDots; i++) {
      const da = angle + (rng(i + 20) - 0.5) * Math.PI * 2;
      const dd = r * (1.05 + rng(i + 21) * 2.0);
      const dr = Math.max(0.35, r * (0.07 + rng(i + 22) * 0.14));
      ctx.beginPath();
      ctx.arc(x + Math.cos(da) * dd, y + Math.sin(da) * dd, dr, 0, Math.PI * 2);
      // Dense centre drops to more diffuse outliers — but still hard-edged
      ctx.fillStyle = `rgba(44,31,20,${(0.68 + rng(i + 23) * 0.27).toFixed(2)})`;
      ctx.fill();
    }
  }

  // Cartographic hand-drawn markers — no digital typography, no glows.
  // Start: 8-arm compass star with a rough ink ring.
  // Goal:  bold "X marks the spot" with two concentric rough circles.
  _drawCartographicMarker(ctx, cell, offX, offY, size, type) {
    if (!cell) return;
    const { x, y } = HexMath.toPixel(cell.q, cell.r, size);
    const cx  = x + offX, cy = y + offY;
    const r   = size * 0.34;
    const rng = (n) => this._rng(cell.q * 47.3 + cell.r * 91.1 + n * 37.7);

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    if (type === 'start') {
      ctx.strokeStyle = this.INK_START;
      ctx.fillStyle   = this.INK_START;

      // 8-arm compass star: alternating long (cardinal) and short (diagonal) arms
      for (let i = 0; i < 8; i++) {
        const baseAngle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const isCardinal = i % 2 === 0;
        const armLen    = r * (isCardinal ? 1.08 : 0.58);
        const jAngle    = baseAngle + (rng(i * 3) - 0.5) * 0.10;
        const tipX      = cx + Math.cos(jAngle) * armLen;
        const tipY      = cy + Math.sin(jAngle) * armLen;

        // Slight mid-point jitter makes it look hand-drawn
        const midT   = 0.50 + (rng(i * 3 + 1) - 0.5) * 0.08;
        const midLen = armLen * midT;
        const midX   = cx + Math.cos(jAngle) * midLen + (rng(i * 3 + 2) - 0.5) * r * 0.07;
        const midY   = cy + Math.sin(jAngle) * midLen + (rng(i * 3 + 3) - 0.5) * r * 0.07;

        ctx.lineWidth = isCardinal ? 1.65 : 1.0;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
        ctx.stroke();
      }

      // Small filled centre dot
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.11, 0, Math.PI * 2);
      ctx.fill();

      // Rough ink ring
      this._inkCircle(ctx, cx, cy, r * 0.44, 1.0, rng, 0);

    } else {
      // Goal: bold ink "X" + two rough concentric circles
      ctx.strokeStyle = this.INK_GOAL;
      ctx.fillStyle   = this.INK_GOAL;

      const arm = r * 0.68;
      const jit = (n) => (rng(n) - 0.5) * r * 0.10;

      // First diagonal
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - arm + jit(1), cy - arm + jit(2));
      ctx.lineTo(cx + arm + jit(3), cy + arm + jit(4));
      ctx.stroke();

      // Second diagonal
      ctx.beginPath();
      ctx.moveTo(cx + arm + jit(5), cy - arm + jit(6));
      ctx.lineTo(cx - arm + jit(7), cy + arm + jit(8));
      ctx.stroke();

      // Outer rough circle
      this._inkCircle(ctx, cx, cy, r * 0.88, 1.1, rng, 0);
      // Inner rough circle
      this._inkCircle(ctx, cx, cy, r * 0.53, 0.9, rng, 30);
    }

    ctx.restore();
  }

  // Slightly irregular ink circle — 22-point polygon with radial noise
  _inkCircle(ctx, cx, cy, r, lw, rng, seedOff) {
    const pts = 24;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i < pts; i++) {
      const a  = (i / pts) * Math.PI * 2;
      const dr = r * (1.0 + (rng(seedOff + i) - 0.5) * 0.07);
      const px = cx + Math.cos(a) * dr;
      const py = cy + Math.sin(a) * dr;
      if (i === 0) ctx.moveTo(px, py);
      else         ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
}
