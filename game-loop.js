// ── Progression Manager ───────────────────────────────────────────────────────

class ProgressionManager {
  constructor() {
    this.level                   = 1;
    this.completedIslandsInLevel = 0;
  }

  get islandsForCurrentLevel() {
    const l = this.level;
    if (l <= 2) return 1;
    if (l <= 5) return 2;
    return 3;
  }

  get topologyMode() {
    return this.level <= 2 ? 'SINGLE_BLOB' : 'FUSED_CLUSTERS';
  }

  get radius() {
    return Math.min(4 + Math.floor(this.level * 0.7), 11);
  }

  get clusterCount() {
    return this.level <= 4 ? 2 : 3;
  }

  completeIsland() {
    this.completedIslandsInLevel++;
    if (this.completedIslandsInLevel >= this.islandsForCurrentLevel) {
      this.level++;
      this.completedIslandsInLevel = 0;
      return true;
    }
    return false;
  }

  get islandLabel() {
    const total = this.islandsForCurrentLevel;
    return total > 1 ? `${this.completedIslandsInLevel + 1} / ${total}` : '';
  }
}

// ── Game Loop ─────────────────────────────────────────────────────────────────

class GameLoop {
  constructor(canvas) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.player   = new Player();

    this.viewportW = canvas.width;
    this.viewportH = canvas.height;

    // ── Camera (world-pixel space) ────────────────────────────────────────────
    this.cameraX    = 0;
    this.cameraY    = 0;
    this.cameraZoom = 1.0;

    // Pan state (right-click drag or Space+drag)
    this._panActive      = false;
    this._lastPanClientX = 0;
    this._lastPanClientY = 0;
    this._spaceHeld      = false;

    // Pinch state (two-finger touch)
    this._pinching          = false;
    this._pinchStartDist    = 1;
    this._pinchStartZoom    = 1;
    this._lastPinchMidClientX = 0;
    this._lastPinchMidClientY = 0;

    // ── Islands ───────────────────────────────────────────────────────────────
    this.activeIsland    = null;
    this.archivedIslands = [];
    this.archiveBoundaryWorldX = -Infinity;

    // Island chaining
    this.nextOffsetQ = 0;
    this.prevMaxQ    = undefined; // undefined = first island (no tunnel)

    // ── Progression ───────────────────────────────────────────────────────────
    this.progression    = new ProgressionManager();
    this.levelStartTime = 0;
    this.levelOptSteps  = 0;
    this.levelCompleting = false;

    this.cellSize      = 30;
    this.floorScale    = 0.84;
    this.showMovementAssist = true;

    // ── Input ─────────────────────────────────────────────────────────────────
    this._keys          = {};
    this._pointerActive = false;
    this._pointerX      = 0;
    this._pointerY      = 0;

    this._rafId    = null;
    this._lastTime = 0;

    this._bindInput();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  start() {
    const headerH = (document.getElementById('header')?.offsetHeight ?? 60) + 10;
    this.canvas.width  = Math.min(window.innerWidth  - 10, 1600);
    this.canvas.height = Math.max(420, window.innerHeight - headerH - 10);
    this.viewportW = this.canvas.width;
    this.viewportH = this.canvas.height;

    // Reset all state
    this.nextOffsetQ     = 0;
    this.prevMaxQ        = undefined;
    this.cameraZoom      = 1.0;
    this.progression     = new ProgressionManager();
    this.archivedIslands = [];
    this.archiveBoundaryWorldX = -Infinity;
    this.levelStartTime  = performance.now();
    this.levelOptSteps   = 0;
    this.levelCompleting = false;

    this.activeIsland = this._generateNextIsland();
    this.player.spawn(...Object.values(this._spawnPosition(this.activeIsland.grid)));

    const { x, y } = HexMath.toPixel(
      this.activeIsland.grid.startCell.q,
      this.activeIsland.grid.startCell.r,
      this.cellSize
    );
    this.cameraX = x;
    this.cameraY = y;

    this._updateHUD();
    this._startRAF();
  }

  stop() { this._stopRAF(); }

  setShowMovementAssist(val) { this.showMovementAssist = val; }

  // ── Input ─────────────────────────────────────────────────────────────────

  _bindInput() {
    const MOVE_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
                               'q','Q','w','W','e','E','a','A','s','S','d','D']);

    // ── Keyboard ────────────────────────────────────────────────────────────
    window.addEventListener('keydown', e => {
      if (!this._rafId) return;
      if (e.key === ' ') { this._spaceHeld = true; e.preventDefault(); return; }
      this._keys[e.key] = true;
      if (MOVE_KEYS.has(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      if (e.key === ' ') { this._spaceHeld = false; this._panActive = false; }
      this._keys[e.key] = false;
    });

    // ── Mouse wheel zoom ─────────────────────────────────────────────────────
    this.canvas.addEventListener('wheel', e => {
      if (!this._rafId) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      this._zoomAtClient(e.clientX, e.clientY, factor);
    }, { passive: false });

    // ── Right-click or Space+drag pan ────────────────────────────────────────
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.canvas.addEventListener('mousedown', e => {
      if (!this._rafId) return;
      const isPanTrigger = e.button === 2 || (e.button === 0 && this._spaceHeld);
      if (isPanTrigger) {
        this._panActive      = true;
        this._lastPanClientX = e.clientX;
        this._lastPanClientY = e.clientY;
        return;
      }
      if (e.button === 0) {
        this._pointerActive = true;
        this._updatePointer(e);
      }
    });

    this.canvas.addEventListener('mousemove', e => {
      if (this._panActive) {
        this._applyPanDelta(e.clientX - this._lastPanClientX,
                            e.clientY - this._lastPanClientY);
        this._lastPanClientX = e.clientX;
        this._lastPanClientY = e.clientY;
      }
      if (this._pointerActive) this._updatePointer(e);
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 2 || (e.button === 0 && this._panActive)) {
        this._panActive = false;
      }
      if (e.button === 0 && !this._panActive) this._pointerActive = false;
    });

    // ── Touch: 1-finger = player, 2-finger = pinch/pan ───────────────────────
    this.canvas.addEventListener('touchstart', e => {
      if (!this._rafId) return;
      e.preventDefault();
      if (e.touches.length === 1 && !this._pinching) {
        this._pointerActive = true;
        this._updatePointer(e.touches[0]);
      } else if (e.touches.length === 2) {
        this._pointerActive = false;
        this._pinching = true;
        this._initPinch(e.touches[0], e.touches[1]);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (this._pinching && e.touches.length >= 2) {
        this._handlePinch(e.touches[0], e.touches[1]);
      } else if (!this._pinching && e.touches.length === 1 && this._pointerActive) {
        this._updatePointer(e.touches[0]);
      }
    }, { passive: false });

    window.addEventListener('touchend', e => {
      if (e.touches.length === 0) {
        this._pointerActive = false;
        this._pinching      = false;
      } else if (e.touches.length === 1) {
        this._pinching = false;
        // Resume single-finger player control
        this._pointerActive = true;
        this._updatePointer(e.touches[0]);
      }
    });
  }

  // ── Camera helpers ────────────────────────────────────────────────────────

  // Zoom so the world-pixel under (clientX, clientY) stays fixed on screen.
  _zoomAtClient(clientX, clientY, factor) {
    const rect   = this.canvas.getBoundingClientRect();
    const px     = (clientX - rect.left) * (this.canvas.width  / rect.width);
    const py     = (clientY - rect.top)  * (this.canvas.height / rect.height);
    // World position under pointer before zoom
    const wx = (px - this.viewportW / 2) / this.cameraZoom + this.cameraX;
    const wy = (py - this.viewportH / 2) / this.cameraZoom + this.cameraY;
    this.cameraZoom = Math.max(0.3, Math.min(3.0, this.cameraZoom * factor));
    // Re-anchor so the same world point is under the pointer after zoom
    this.cameraX = wx - (px - this.viewportW / 2) / this.cameraZoom;
    this.cameraY = wy - (py - this.viewportH / 2) / this.cameraZoom;
  }

  // Pan by a delta in CSS pixels.
  _applyPanDelta(clientDX, clientDY) {
    const rect = this.canvas.getBoundingClientRect();
    this.cameraX -= (clientDX * this.canvas.width  / rect.width)  / this.cameraZoom;
    this.cameraY -= (clientDY * this.canvas.height / rect.height) / this.cameraZoom;
  }

  _initPinch(t1, t2) {
    this._pinchStartDist    = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    this._pinchStartZoom    = this.cameraZoom;
    this._lastPinchMidClientX = (t1.clientX + t2.clientX) / 2;
    this._lastPinchMidClientY = (t1.clientY + t2.clientY) / 2;
  }

  _handlePinch(t1, t2) {
    const dist  = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const midCX = (t1.clientX + t2.clientX) / 2;
    const midCY = (t1.clientY + t2.clientY) / 2;
    // Zoom at the midpoint
    const newZoom = Math.max(0.3, Math.min(3.0,
      this._pinchStartZoom * dist / this._pinchStartDist));
    this._zoomAtClient(midCX, midCY, newZoom / this.cameraZoom);
    // Pan by midpoint delta
    this._applyPanDelta(midCX - this._lastPinchMidClientX,
                        midCY - this._lastPinchMidClientY);
    this._lastPinchMidClientX = midCX;
    this._lastPinchMidClientY = midCY;
  }

  // ── Pointer ───────────────────────────────────────────────────────────────

  _updatePointer(e) {
    const rect   = this.canvas.getBoundingClientRect();
    this._pointerX = (e.clientX - rect.left) * (this.canvas.width  / rect.width);
    this._pointerY = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
  }

  // Canvas-pixel pointer → world-pixel, accounting for zoom.
  // Inverse of the render transform: world = (screen - W/2) / zoom + camera
  _pointerToWorld() {
    return {
      x: (this._pointerX - this.viewportW / 2) / this.cameraZoom + this.cameraX,
      y: (this._pointerY - this.viewportH / 2) / this.cameraZoom + this.cameraY,
    };
  }

  // ── Island generation ─────────────────────────────────────────────────────

  _randomSeed() { return Math.random().toString(36).slice(2, 10); }

  // Box-Muller: normal distribution with given mean and standard deviation,
  // clamped to [0, 1].
  _randomWindingFactor() {
    const u = 1 - Math.random(), v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.max(0, Math.min(1, 0.5 + 0.15 * z));
  }

  _generateNextIsland() {
    const pm = this.progression;

    const gen = new HexGridGenerator({
      radius:        pm.radius,
      windingFactor: this._randomWindingFactor(),
      seed:          this._randomSeed(),
      offsetQ:       this.nextOffsetQ,
      topologyMode:  pm.topologyMode,
      clusterCount:  pm.clusterCount,
      // Pass prevMaxQ so the generator can build the connecting tunnel.
      // -1 means "first island, no tunnel".
      incomingQ: this.prevMaxQ ?? -1,
    });
    const grid = gen.generate();

    const path = grid.findPath(grid.startCell.key, grid.goalCell.key);
    if (path.length === 0) return this._generateNextIsland(); // extremely rare

    this.levelOptSteps += Math.max(1, path.length - 1);

    // Track the rightmost cell of this island so the next island can be
    // placed non-overlapping and build the correct connecting tunnel.
    let maxQ = -Infinity;
    for (const cell of grid.cells.values()) maxQ = Math.max(maxQ, cell.q);

    this.prevMaxQ    = maxQ;
    this.nextOffsetQ = grid.goalCell.q + 1;

    const offscreen = document.createElement('canvas');
    const renderer  = new HexRenderer(offscreen, { cellSize: this.cellSize, showPath: false, padding: 60 });
    renderer.render(grid);

    return { grid, canvas: offscreen, worldLeft: renderer.worldLeft, worldTop: renderer.worldTop };
  }

  // Spawn at the geometric centre of the start cell (no outward offset).
  _spawnPosition(grid) {
    const { x, y } = HexMath.toPixel(grid.startCell.q, grid.startCell.r, this.cellSize);
    return { x, y };
  }

  // ── RAF loop ──────────────────────────────────────────────────────────────

  _startRAF() {
    this._lastTime = performance.now();
    const tick = time => {
      if (!this._rafId) return;
      const dt = Math.min((time - this._lastTime) / 1000, 0.05);
      this._lastTime = time;
      this._update(dt);
      this._render();
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _stopRAF() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._keys = {}; this._pointerActive = false; this._panActive = false;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  _update(dt) {
    if (this.levelCompleting || !this.activeIsland) return;

    // One-way door: prevent the player from re-entering an archived island
    if (this.player.worldX - this.player.radius < this.archiveBoundaryWorldX) {
      this.player.worldX = this.archiveBoundaryWorldX + this.player.radius;
    }

    const wp = this._pointerToWorld();
    this.player.update(dt, this.activeIsland.grid, this.cellSize, this.floorScale, {
      keys:          this._keys,
      pointerActive: this._pointerActive,
      worldPointerX: wp.x,
      worldPointerY: wp.y,
    });

    // Camera no longer auto-follows the player — it is manually panned/zoomed.

    if (this.player.currentCellKey === this.activeIsland.grid.goalCell.key) {
      this.levelCompleting = true;
      setTimeout(() => this._onIslandComplete(), 750);
    }

    this._updateHUD();
  }

  _onIslandComplete() {
    this._archiveActiveIsland();

    const levelAdvanced = this.progression.completeIsland();
    if (levelAdvanced) {
      this.levelStartTime    = performance.now();
      this.levelOptSteps     = 0;
      this.player.totalSteps = 0;
    }

    const archivedGrid = this.archivedIslands[this.archivedIslands.length - 1].grid;
    // Dock new island's entry tunnel flush against the archived exit tunnel
    this.nextOffsetQ = archivedGrid.goalCell.q + 1;

    this.activeIsland = this._generateNextIsland();

    const { x: gx } = HexMath.toPixel(archivedGrid.goalCell.q, archivedGrid.goalCell.r, this.cellSize);
    this.archiveBoundaryWorldX = gx + this.cellSize * 0.6;

    const spawn = this._spawnPosition(this.activeIsland.grid);
    this.player.spawn(spawn.x, spawn.y);

    // Pan camera to the new start cell
    const { x: sx, y: sy } = HexMath.toPixel(
      this.activeIsland.grid.startCell.q,
      this.activeIsland.grid.startCell.r,
      this.cellSize
    );
    this.cameraX = sx;
    this.cameraY = sy;

    this.levelCompleting = false;
    this._updateHUD();
  }

  _archiveActiveIsland() {
    const island = this.activeIsland;
    if (!island) return;
    this.archivedIslands.push(island);
    this.activeIsland = null;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  _render() {
    const ctx = this.ctx;
    const W   = this.viewportW;
    const H   = this.viewportH;

    ctx.fillStyle = '#06060f';
    ctx.fillRect(0, 0, W, H);

    // World → screen transform:
    //   screen = (world - camera) * zoom + viewportCentre
    // Applied as:  translate(W/2, H/2)  ·  scale(zoom)  ·  translate(-camX, -camY)
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.translate(-this.cameraX, -this.cameraY);

    for (const arch of this.archivedIslands) {
      ctx.drawImage(arch.canvas, arch.worldLeft, arch.worldTop);
    }

    if (this.activeIsland) {
      ctx.drawImage(this.activeIsland.canvas, this.activeIsland.worldLeft, this.activeIsland.worldTop);
    }

    if (this.showMovementAssist && this.player.currentCellKey && this.activeIsland) {
      this._renderMovementAssist(ctx);
    }

    this._renderPlayer(ctx);

    if (this.levelCompleting) {
      ctx.fillStyle = 'rgba(0,255,136,0.08)';
      ctx.fillRect(this.player.worldX - W, this.player.worldY - H, W * 2, H * 2);
    }

    ctx.restore();

    // Archive boundary (screen space — drawn after restore, no zoom applied)
    if (this.archiveBoundaryWorldX > -Infinity) {
      const bx = (this.archiveBoundaryWorldX - this.cameraX) * this.cameraZoom + W / 2;
      if (bx > 0 && bx < W) {
        ctx.strokeStyle = 'rgba(0,212,255,0.18)';
        ctx.lineWidth   = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx, H);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  _renderMovementAssist(ctx) {
    const cell = this.activeIsland.grid.cells.get(this.player.currentCellKey);
    if (!cell) return;

    const size = this.cellSize, f = this.floorScale;

    for (let d = 0; d < 6; d++) {
      if (cell.walls[d]) continue;
      const nb     = HexMath.neighbor(cell.q, cell.r, cell.s, d);
      const nbCell = this.activeIsland.grid.cells.get(HexMath.key(nb.q, nb.r, nb.s));
      if (!nbCell) continue;

      const { x, y } = HexMath.toPixel(nbCell.q, nbCell.r, size);
      const sc = HexMath.corners(x, y, size * f);

      ctx.beginPath();
      ctx.moveTo(sc[0].x, sc[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(sc[i].x, sc[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,212,255,0.14)';
      ctx.fill();

      const fs = Math.max(9, Math.round(size * 0.30));
      ctx.fillStyle = 'rgba(0,212,255,0.60)';
      ctx.font = `bold ${fs}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(DIR_KEY_LABEL[d], x, y);
    }
  }

  _renderPlayer(ctx) {
    const p = this.player, r = p.radius, px = p.worldX, py = p.worldY;
    ctx.save();
    const grd = ctx.createRadialGradient(px, py, 0, px, py, r * 3.2);
    grd.addColorStop(0, 'rgba(255,210,50,0.38)');
    grd.addColorStop(1, 'rgba(255,210,50,0)');
    ctx.beginPath();
    ctx.arc(px, py, r * 3.2, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f';
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur  = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(px - r * 0.28, py - r * 0.28, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.restore();
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    const pm      = this.progression;
    const elapsed = (performance.now() - this.levelStartTime) / 1000;
    const min     = Math.floor(elapsed / 60);
    const sec     = (elapsed % 60).toFixed(1).padStart(4, '0');
    const eff     = this.player.totalSteps > 0
      ? Math.min(100, Math.round(this.levelOptSteps / this.player.totalSteps * 100))
      : 100;

    const el = id => document.getElementById(id);
    if (el('hud-level'))      el('hud-level').textContent      = pm.level;
    if (el('hud-timer'))      el('hud-timer').textContent      = `${min}:${sec}`;
    if (el('hud-efficiency')) el('hud-efficiency').textContent = `${eff}%`;

    const islandEl = el('hud-island');
    if (islandEl) {
      const label = pm.islandLabel;
      islandEl.parentElement.style.display = label ? '' : 'none';
      islandEl.textContent = label;
    }
  }
}
