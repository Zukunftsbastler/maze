// ── Mechanic Pool ──────────────────────────────────────────────────────────────
// Each entry describes one gameplay mechanic that can be introduced starting
// from Level 4, one per level, in a randomised order per game session.

const MECHANIC_POOL = [
  {
    id:   'FOG_LIGHT',
    name: 'Light Fog',
    desc: 'A thin mist reduces your sight range to 3 tiles. Mark your surroundings before they fade.',
    apply(cfg) { cfg.sightRange = 3; },
  },
  {
    id:   'MEGA_DUNGEON',
    name: 'Mega Dungeon',
    desc: 'The dungeon splits into multiple fused chambers. Expect open areas connected by corridors.',
    apply(cfg) { cfg.topology = 'FUSED_CLUSTERS'; cfg.clusterCount = 2; },
  },
  {
    id:   'FOG_DENSE',
    name: 'Dense Fog',
    desc: 'Thick fog cuts your vision to 2 tiles. The maze becomes mostly memory — peek wisely.',
    apply(cfg) { cfg.sightRange = 2; },
  },
  {
    id:   'LABYRINTH',
    name: 'Labyrinthine Complex',
    desc: 'A three-chamber complex with deep, twisting passages and many dead ends.',
    apply(cfg) { cfg.topology = 'FUSED_CLUSTERS'; cfg.clusterCount = 3; },
  },
  {
    id:   'FOG_BRUTAL',
    name: 'Pitch Black',
    desc: 'Pure darkness — only the cells immediately beside you are lit. Move by instinct.',
    apply(cfg) { cfg.sightRange = 1; },
  },
];

// Non-linear base radius per level (index = level - 1, clamped at last entry).
const LEVEL_RADIUS = [3, 4, 5, 4, 5, 6, 6, 7, 7, 8];

// ── Progression Manager ────────────────────────────────────────────────────────

class ProgressionManager {
  constructor() {
    this.level           = 1;
    this.peekDuration    = 2.0;   // seconds — player can change in pre-run UI (0 / 1 / 2)
    this.peekHidePath    = false; // hide A* path during peek for flat bonus
    this.generosityFactor = 4.0;  // setup-timer multiplier; lower = harder, higher score

    this._activeMechanics      = [];  // accumulated mechanic objects
    this._pendingPool          = this._shufflePool();
    this._newMechanicThisLevel = null; // set by advanceLevel(), reset each level
  }

  // Call BEFORE generating the next island, after completing the previous one.
  advanceLevel() {
    this._newMechanicThisLevel = null;
    if (this.level >= 4 && this._pendingPool.length > 0) {
      const m = this._pendingPool.shift();
      this._activeMechanics.push(m);
      this._newMechanicThisLevel = m;
    }
    this.level++;
  }

  // Computed config for the current level (merges base + active mechanics).
  get config() {
    const l = this.level;
    const r = LEVEL_RADIUS[Math.min(l - 1, LEVEL_RADIUS.length - 1)];
    const cfg = {
      radius:       r,
      sightRange:   4,
      topology:     'SINGLE_BLOB',
      clusterCount: 2,
    };
    for (const m of this._activeMechanics) m.apply(cfg);
    return cfg;
  }

  // Difficulty score for a given optimal path length, taking peek & FoW into account.
  difficultyScore(pathLength) {
    const cfg      = this.config;
    const base     = cfg.radius * 10 + pathLength * 5;
    const peekMult = this.peekDuration === 0 ? 2.0 : (this.peekDuration <= 1.0 ? 1.5 : 1.0);
    const pathBonus = this.peekHidePath ? 20 : 0;
    const sr       = cfg.sightRange;
    const fowMult  = 1.0 + Math.max(0, 4 - sr) * (1.0 / 3);
    // Generosity factor applies from level 4 (nemesis enabled): less time = higher score
    const genMult  = this.level >= 4
      ? (this.generosityFactor <= 1.0 ? 2.5 : this.generosityFactor <= 2.0 ? 1.5 : 1.0)
      : 1.0;
    return Math.round(base * peekMult * fowMult * genMult) + pathBonus;
  }

  get activeMechanicNames() { return this._activeMechanics.map(m => m.name); }
  get newMechanicThisLevel() { return this._newMechanicThisLevel; }

  _shufflePool() {
    const arr = [...MECHANIC_POOL];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// ── Game Loop ──────────────────────────────────────────────────────────────────

class GameLoop {
  constructor(canvas) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.player   = new Player();

    this.viewportW = canvas.width;
    this.viewportH = canvas.height;

    // ── Camera ────────────────────────────────────────────────────────────────
    this.cameraX    = 0;
    this.cameraY    = 0;
    this.cameraZoom = 1.0;

    this._panActive       = false;
    this._lastPanClientX  = 0;
    this._lastPanClientY  = 0;
    this._spaceHeld       = false;

    this._pinching            = false;
    this._pinchStartDist      = 1;
    this._pinchStartZoom      = 1;
    this._lastPinchMidClientX = 0;
    this._lastPinchMidClientY = 0;

    // ── Islands ───────────────────────────────────────────────────────────────
    this.activeIsland    = null;
    this.archivedIslands = [];
    this.archiveBoundaryWorldX = -Infinity;

    this.nextOffsetQ = 0;
    this.prevMaxQ    = undefined;

    // ── Progression ───────────────────────────────────────────────────────────
    this.progression   = new ProgressionManager();
    this.totalScore    = parseInt(localStorage.getItem('hexmaze_totalscore') || '0', 10);

    // ── Run-state machine ────────────────────────────────────────────────────
    // 'prerun' → 'peeking' → 'playing' (A/B) → 'nemesis' (C) → 'postrun'
    this._runState  = 'prerun';
    this._peekTimer = 0;

    // ── Phase A/B setup timer (levels 4+) ────────────────────────────────────
    this._setupTimer     = 0;
    this._setupTimeTotal = 0;

    // ── Phase C attack timer ──────────────────────────────────────────────────
    this._attackTimer     = 0;
    this._attackTimeTotal = 0;

    // ── Build / Defence ───────────────────────────────────────────────────────
    this._buildPhaseUnlocked = false;
    this._playerCurrency     = 0;
    this._buildUIOpen        = false;
    this._buildTargetKey     = null;

    // ── Nemesis ───────────────────────────────────────────────────────────────
    this._nemesis     = new Nemesis();
    this._nemesisSpeed = 130; // px/s — must match Nemesis.speed for timer calibration

    // ── Retry support ─────────────────────────────────────────────────────────
    this._levelStartOffsetQ  = 0;
    this._levelStartPrevMaxQ = undefined;

    // ── Fog of War ─────────────────────────────────────────────────────────
    this.sightRange = 4;
    this._fogDirty  = false;

    // ── Scoring ───────────────────────────────────────────────────────────────
    this._idealPathSet          = new Set();
    this._visitedNonIdealCells  = new Set();
    this._levelDifficultyScore  = 0;
    this._levelPathLength       = 0;

    // ── Display helpers ───────────────────────────────────────────────────────
    this.cellSize           = 30;
    this.floorScale         = 0.84;
    this.showMovementAssist = true;
    this._levelCompleting   = false; // brief flash before post-run

    // ── Input ─────────────────────────────────────────────────────────────────
    this._keys          = {};
    this._pointerActive = false;
    this._pointerX      = 0;
    this._pointerY      = 0;

    this._rafId    = null;
    this._lastTime = 0;

    this._bindInput();
    this._bindOverlayButtons();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  start() {
    const headerH = (document.getElementById('header')?.offsetHeight ?? 60) + 10;
    this.canvas.width  = Math.min(window.innerWidth  - 10, 1600);
    this.canvas.height = Math.max(420, window.innerHeight - headerH - 10);
    this.viewportW = this.canvas.width;
    this.viewportH = this.canvas.height;

    this.nextOffsetQ     = 0;
    this.prevMaxQ        = undefined;
    this.cameraZoom      = 1.0;
    this.progression     = new ProgressionManager();
    this.archivedIslands = [];
    this.archiveBoundaryWorldX = -Infinity;

    this._runState  = 'prerun';
    this._levelCompleting = false;

    this.activeIsland = this._generateNextIsland();
    this._showPreRun();
    this._updateHUD();
    this._startRAF();
  }

  stop() { this._stopRAF(); }

  setShowMovementAssist(val) { this.showMovementAssist = val; }

  // ── Input ──────────────────────────────────────────────────────────────────

  _bindInput() {
    const MOVE_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
                               'q','Q','w','W','e','E','a','A','s','S','d','D']);

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

    this.canvas.addEventListener('wheel', e => {
      if (!this._rafId) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      this._zoomAtClient(e.clientX, e.clientY, factor);
    }, { passive: false });

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
        // Build UI: intercept clicks on buildable cells during phase B or C
        const canBuild = this._buildPhaseUnlocked &&
          (this._runState === 'playing' || this._runState === 'nemesis');
        if (canBuild && this._tryInterceptBuildClick(e.clientX, e.clientY)) return;
        // Also close build panel if clicking elsewhere
        if (this._buildUIOpen) { this._closeBuildUI(); return; }
        this._pointerActive = true;
        this._updatePointer(e);
      }
    });

    this.canvas.addEventListener('mousemove', e => {
      if (this._panActive) {
        this._applyPanDelta(e.clientX - this._lastPanClientX, e.clientY - this._lastPanClientY);
        this._lastPanClientX = e.clientX;
        this._lastPanClientY = e.clientY;
      }
      if (this._pointerActive) this._updatePointer(e);
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 2 || (e.button === 0 && this._panActive)) this._panActive = false;
      if (e.button === 0 && !this._panActive) this._pointerActive = false;
    });

    this.canvas.addEventListener('touchstart', e => {
      if (!this._rafId) return;
      e.preventDefault();
      if (e.touches.length === 1 && !this._pinching) {
        this._pointerActive = true; this._updatePointer(e.touches[0]);
      } else if (e.touches.length === 2) {
        this._pointerActive = false; this._pinching = true;
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
      if (e.touches.length === 0) { this._pointerActive = false; this._pinching = false; }
      else if (e.touches.length === 1) {
        this._pinching = false;
        this._pointerActive = true; this._updatePointer(e.touches[0]);
      }
    });
  }

  _bindOverlayButtons() {
    // Pre-run overlay: "Start Run" button
    const btnStart = document.getElementById('btn-start-run');
    if (btnStart) {
      btnStart.addEventListener('click', () => this._startPeek());
    }

    // Pre-run: peek duration radio buttons
    document.querySelectorAll('input[name="peek-duration"]').forEach(el => {
      el.addEventListener('change', () => {
        this.progression.peekDuration = parseFloat(el.value);
        this._refreshPreRunScore();
      });
    });

    // Pre-run: hide path toggle
    const hidePathEl = document.getElementById('peek-hide-path');
    if (hidePathEl) {
      hidePathEl.addEventListener('change', () => {
        this.progression.peekHidePath = hidePathEl.checked;
        this._refreshPreRunScore();
      });
    }

    // Post-run: "Next Level" button
    const btnNext = document.getElementById('btn-next-level');
    if (btnNext) btnNext.addEventListener('click', () => this._advanceToNextLevel());

    // Post-run: "Retry" button
    const btnRetry = document.getElementById('btn-retry');
    if (btnRetry) btnRetry.addEventListener('click', () => this._retryLevel());

    // Pre-run: generosity factor radios
    document.querySelectorAll('input[name="generosity"]').forEach(el => {
      el.addEventListener('change', () => {
        this.progression.generosityFactor = parseFloat(el.value);
        this._refreshPreRunScore();
      });
    });

    // Build panel: place blockade
    const btnBlockade = document.getElementById('btn-place-blockade');
    if (btnBlockade) btnBlockade.addEventListener('click', () => this._placeBlockade());

    // Build panel: cancel
    const btnCloseBuild = document.getElementById('btn-close-build');
    if (btnCloseBuild) btnCloseBuild.addEventListener('click', () => this._closeBuildUI());
  }

  // ── Camera helpers ─────────────────────────────────────────────────────────

  _zoomAtClient(clientX, clientY, factor) {
    const rect = this.canvas.getBoundingClientRect();
    const px   = (clientX - rect.left) * (this.canvas.width  / rect.width);
    const py   = (clientY - rect.top)  * (this.canvas.height / rect.height);
    const wx   = (px - this.viewportW / 2) / this.cameraZoom + this.cameraX;
    const wy   = (py - this.viewportH / 2) / this.cameraZoom + this.cameraY;
    this.cameraZoom = Math.max(0.3, Math.min(3.0, this.cameraZoom * factor));
    this.cameraX = wx - (px - this.viewportW / 2) / this.cameraZoom;
    this.cameraY = wy - (py - this.viewportH / 2) / this.cameraZoom;
  }

  _applyPanDelta(clientDX, clientDY) {
    const rect = this.canvas.getBoundingClientRect();
    this.cameraX -= (clientDX * this.canvas.width  / rect.width)  / this.cameraZoom;
    this.cameraY -= (clientDY * this.canvas.height / rect.height) / this.cameraZoom;
  }

  _initPinch(t1, t2) {
    this._pinchStartDist      = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    this._pinchStartZoom      = this.cameraZoom;
    this._lastPinchMidClientX = (t1.clientX + t2.clientX) / 2;
    this._lastPinchMidClientY = (t1.clientY + t2.clientY) / 2;
  }

  _handlePinch(t1, t2) {
    const dist  = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const midCX = (t1.clientX + t2.clientX) / 2;
    const midCY = (t1.clientY + t2.clientY) / 2;
    const newZ  = Math.max(0.3, Math.min(3.0, this._pinchStartZoom * dist / this._pinchStartDist));
    this._zoomAtClient(midCX, midCY, newZ / this.cameraZoom);
    this._applyPanDelta(midCX - this._lastPinchMidClientX, midCY - this._lastPinchMidClientY);
    this._lastPinchMidClientX = midCX;
    this._lastPinchMidClientY = midCY;
  }

  // Returns true if the click hit a buildable cell and the build UI was opened.
  _tryInterceptBuildClick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (this.canvas.width  / rect.width);
    const py = (clientY - rect.top)  * (this.canvas.height / rect.height);
    const wx = (px - this.viewportW / 2) / this.cameraZoom + this.cameraX;
    const wy = (py - this.viewportH / 2) / this.cameraZoom + this.cameraY;
    const coord = HexMath.fromPixel(wx, wy, this.cellSize);
    const key   = HexMath.key(coord.q, coord.r, coord.s);
    const cell  = this.activeIsland?.grid.cells.get(key);
    if (cell && cell.isBuildable && cell.blockadeLevel === 0) {
      this._openBuildUI(key);
      return true;
    }
    return false;
  }

  // ── Pointer ────────────────────────────────────────────────────────────────

  _updatePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    this._pointerX = (e.clientX - rect.left) * (this.canvas.width  / rect.width);
    this._pointerY = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
  }

  _pointerToWorld() {
    return {
      x: (this._pointerX - this.viewportW / 2) / this.cameraZoom + this.cameraX,
      y: (this._pointerY - this.viewportH / 2) / this.cameraZoom + this.cameraY,
    };
  }

  // ── Island generation ──────────────────────────────────────────────────────

  _randomSeed() { return Math.random().toString(36).slice(2, 10); }

  _randomWindingFactor() {
    const u = 1 - Math.random(), v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.max(0, Math.min(1, 0.5 + 0.15 * z));
  }

  _generateNextIsland() {
    // Snapshot for retry (before any offsetQ mutations)
    this._levelStartOffsetQ  = this.nextOffsetQ;
    this._levelStartPrevMaxQ = this.prevMaxQ;

    const pm  = this.progression;
    const cfg = pm.config;

    const gen = new HexGridGenerator({
      radius:        cfg.radius,
      windingFactor: this._randomWindingFactor(),
      seed:          this._randomSeed(),
      offsetQ:       this.nextOffsetQ,
      topologyMode:  cfg.topology,
      clusterCount:  cfg.clusterCount,
      incomingQ:     this.prevMaxQ ?? -1,
    });
    const grid = gen.generate();

    const path = grid.findPath(grid.startCell.key, grid.goalCell.key);
    if (path.length === 0) return this._generateNextIsland();

    // Store ideal path for scoring
    this._idealPathSet         = new Set(path);
    this._visitedNonIdealCells = new Set();
    this._levelPathLength      = path.length;

    // Compute max Q for tunnel chaining
    let maxQ = -Infinity;
    for (const cell of grid.cells.values()) maxQ = Math.max(maxQ, cell.q);
    this.prevMaxQ    = maxQ;
    this.nextOffsetQ = grid.goalCell.q + 1;

    // Render with fog enabled (starts fully hidden)
    const offscreen = document.createElement('canvas');
    const renderer  = new HexRenderer(offscreen, {
      cellSize: this.cellSize, showPath: false, padding: 60, fogMode: true,
    });
    renderer.render(grid);

    return { grid, canvas: offscreen, worldLeft: renderer.worldLeft, worldTop: renderer.worldTop, renderer };
  }

  // Spawn at the geometric centre of the start cell.
  _spawnPosition(grid) {
    const { x, y } = HexMath.toPixel(grid.startCell.q, grid.startCell.r, this.cellSize);
    return { x, y };
  }

  // ── Run-state transitions ──────────────────────────────────────────────────

  _showPreRun() {
    const pm  = this.progression;
    const cfg = pm.config;
    this.sightRange = cfg.sightRange;

    // Re-compute difficulty score and store
    this._levelDifficultyScore = pm.difficultyScore(this._levelPathLength);

    const overlay = document.getElementById('pre-run-overlay');
    if (!overlay) return;

    document.getElementById('pre-level-num').textContent  = pm.level;
    document.getElementById('pre-difficulty').textContent = this._levelDifficultyScore;

    // New mechanic banner
    const newMechEl = document.getElementById('pre-new-mechanic');
    const m = pm.newMechanicThisLevel;
    if (m && newMechEl) {
      newMechEl.style.display = '';
      document.getElementById('pre-mechanic-name').textContent = m.name;
      document.getElementById('pre-mechanic-desc').textContent = m.desc;
    } else if (newMechEl) {
      newMechEl.style.display = 'none';
    }

    // Active mechanics list
    const activeEl = document.getElementById('pre-active-mechanics');
    if (activeEl) {
      const names = pm.activeMechanicNames;
      activeEl.style.display = names.length ? '' : 'none';
      document.getElementById('pre-mechanics-list').textContent = names.join(' · ');
    }

    // Sight range info
    const srEl = document.getElementById('pre-sight-range');
    if (srEl) srEl.textContent = cfg.sightRange >= 4 ? 'Full' : cfg.sightRange;

    // Reset peek options to defaults
    const defaultPeek = document.querySelector('input[name="peek-duration"][value="2"]');
    if (defaultPeek) defaultPeek.checked = true;
    pm.peekDuration = 2.0;
    const hpEl = document.getElementById('peek-hide-path');
    if (hpEl) hpEl.checked = false;
    pm.peekHidePath = false;

    // Generosity factor selector (only from level 4)
    const genSection = document.getElementById('pre-generosity-section');
    if (genSection) {
      genSection.style.display = pm.level >= 4 ? '' : 'none';
    }
    const defaultGen = document.querySelector('input[name="generosity"][value="4"]');
    if (defaultGen) defaultGen.checked = true;
    pm.generosityFactor = 4.0;

    overlay.style.display = 'flex';
    this._runState = 'prerun';
  }

  _refreshPreRunScore() {
    this._levelDifficultyScore = this.progression.difficultyScore(this._levelPathLength);
    const el = document.getElementById('pre-difficulty');
    if (el) el.textContent = this._levelDifficultyScore;
  }

  _startPeek() {
    const overlay = document.getElementById('pre-run-overlay');
    if (overlay) overlay.style.display = 'none';

    const pm = this.progression;

    if (pm.peekDuration === 0) {
      // Skip peek phase entirely
      this._endPeek();
      return;
    }

    // Fully reveal island for peek
    this._fullReveal();
    this.activeIsland.renderer.showPath = !pm.peekHidePath;
    if (!pm.peekHidePath) {
      const path = [...this._idealPathSet];
      this.activeIsland.renderer.setPath(path);
    }
    this._fogDirty = true;

    this._peekTimer = pm.peekDuration;
    this._runState  = 'peeking';

    // Centre camera on start cell during peek
    const { x: sx, y: sy } = HexMath.toPixel(
      this.activeIsland.grid.startCell.q,
      this.activeIsland.grid.startCell.r,
      this.cellSize
    );
    this.cameraX = sx; this.cameraY = sy;
    this._updateHUD();
  }

  _endPeek() {
    this._resetFog();
    this.activeIsland.renderer.showPath = false;
    this.activeIsland.renderer.setPath([]);

    // Spawn player and apply initial fog
    const spawn = this._spawnPosition(this.activeIsland.grid);
    this.player.spawn(spawn.x, spawn.y);
    this.player.currentCellKey = this.activeIsland.grid.startCell.key;
    this._updateFogOfWar();

    const { x: sx, y: sy } = HexMath.toPixel(
      this.activeIsland.grid.startCell.q,
      this.activeIsland.grid.startCell.r,
      this.cellSize
    );
    this.cameraX = sx; this.cameraY = sy;

    // Economy reset (resources carry no state between runs / retries)
    this._buildPhaseUnlocked = false;
    this._playerCurrency     = 0;

    // Setup timer for nemesis-enabled levels
    if (this.progression.level >= 4) {
      const physDist       = Math.sqrt(3) * this.cellSize;
      const baseTraversal  = this._levelPathLength * physDist / this.player.speed;
      this._setupTimeTotal = baseTraversal * this.progression.generosityFactor;
      this._setupTimer     = this._setupTimeTotal;
    }

    this._runState = 'playing';
    this._levelCompleting = false;
    this._updateHUD();
  }

  _showPostRun(won = true) {
    const pm = this.progression;
    let runScore = 0;

    if (pm.level <= 3) {
      // Classic scoring
      const diffScore = this._levelDifficultyScore;
      const pathLen   = this._levelPathLength;
      const penalty   = this._visitedNonIdealCells.size;
      const maxScore  = diffScore + pathLen;
      runScore = Math.max(0, maxScore - penalty);
      this._setPostRunContent({
        title: `Level ${pm.level} Complete`,
        won:   true,
        rows: [
          ['Max Score',          maxScore],
          ['Penalty (off-path)', `−${penalty}`],
          ['Run Score',          runScore],
        ],
      });
    } else if (won) {
      const timeBonus = Math.floor(this._attackTimer * 10);
      runScore = this._levelDifficultyScore + timeBonus;
      this._setPostRunContent({
        title: `Level ${pm.level} Complete`,
        won:   true,
        rows: [
          ['Difficulty Score',  this._levelDifficultyScore],
          ['Time Bonus',        `+${timeBonus}`],
          ['Run Score',         runScore],
        ],
      });
    } else {
      this._setPostRunContent({
        title: `Level ${pm.level} — Nemesis!`,
        won:   false,
        rows: [['The Nemesis reached the goal.', ''], ['Run Score', 0]],
      });
    }

    if (won) {
      this.totalScore += runScore;
      localStorage.setItem('hexmaze_totalscore', String(this.totalScore));
    }

    const overlay = document.getElementById('post-run-overlay');
    if (overlay) {
      document.getElementById('post-total-score').textContent = this.totalScore;
      overlay.style.display = 'flex';
    }

    this._runState = 'postrun';
    this._closeBuildUI();
    this._updateHUD();
  }

  _setPostRunContent({ title, won, rows }) {
    const el = id => document.getElementById(id);
    if (el('post-run-title')) el('post-run-title').textContent = title;
    if (el('post-run-title')) {
      el('post-run-title').style.color      = won ? '#00ff88' : '#ff4466';
      el('post-run-title').style.textShadow = won
        ? '0 0 16px rgba(0,255,136,0.6)'
        : '0 0 16px rgba(255,68,102,0.6)';
    }

    const tbody = el('post-score-rows');
    if (tbody) {
      tbody.innerHTML = rows.map(([k, v]) =>
        `<div class="overlay-kv"><span class="key">${k}</span><span class="value gold">${v}</span></div>`
      ).join('');
    }

    // Show/hide buttons
    if (el('btn-next-level')) el('btn-next-level').style.display = won ? ''     : 'none';
    if (el('btn-retry'))      el('btn-retry').style.display      = won ? 'none' : '';
  }

  _startNemesisPhase() {
    const physDist       = Math.sqrt(3) * this.cellSize;
    this._attackTimeTotal = this._levelPathLength * physDist / this._nemesisSpeed;
    this._attackTimer    = this._attackTimeTotal;

    if (this.progression.level >= 4) {
      const grid  = this.activeIsland.grid;
      const spawn = this._spawnPosition(grid);
      this._nemesis.spawn(spawn.x, spawn.y, grid.startCell.key, grid.goalCell.key);
    }

    this._closeBuildUI();
    this._runState = 'nemesis';
    this._updateHUD();
  }

  _retryLevel() {
    const overlay = document.getElementById('post-run-overlay');
    if (overlay) overlay.style.display = 'none';

    // Restore pre-island-generation state so new island sits in the same slot
    this.nextOffsetQ = this._levelStartOffsetQ;
    this.prevMaxQ    = this._levelStartPrevMaxQ;
    this.activeIsland = null;

    this.activeIsland = this._generateNextIsland();
    this._levelCompleting = false;
    this._showPreRun();
    this._updateHUD();
  }

  _closeBuildUI() {
    this._buildUIOpen    = false;
    this._buildTargetKey = null;
    const panel = document.getElementById('build-panel');
    if (panel) panel.style.display = 'none';
  }

  _openBuildUI(key) {
    const grid = this.activeIsland?.grid;
    if (!grid) return;
    const cell = grid.cells.get(key);
    if (!cell) return;

    this._buildTargetKey = key;
    this._buildUIOpen    = true;

    const { x, y } = HexMath.toPixel(cell.q, cell.r, this.cellSize);
    // World → screen
    const sx = (x - this.cameraX) * this.cameraZoom + this.viewportW / 2;
    const sy = (y - this.cameraY) * this.cameraZoom + this.viewportH / 2;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width  / this.canvas.width;
    const scaleY = rect.height / this.canvas.height;
    const screenX = sx * scaleX + rect.left;
    const screenY = sy * scaleY + rect.top;

    const panel = document.getElementById('build-panel');
    if (panel) {
      const wrap = document.getElementById('canvas-wrap');
      const wr   = wrap.getBoundingClientRect();
      panel.style.left    = `${(screenX - wr.left)}px`;
      panel.style.top     = `${(screenY - wr.top - 80)}px`;
      panel.style.display = 'block';

      const btnB = document.getElementById('btn-place-blockade');
      if (btnB) btnB.disabled = this._playerCurrency < 1;

      const costEl = document.getElementById('build-currency-display');
      if (costEl) costEl.textContent = `Currency: ${this._playerCurrency}`;
    }
  }

  _placeBlockade() {
    const grid = this.activeIsland?.grid;
    if (!grid || !this._buildTargetKey || this._playerCurrency < 1) return;

    const cell = grid.cells.get(this._buildTargetKey);
    if (!cell || cell.blockadeLevel > 0) return;

    // Validate: at least one path must remain for the nemesis
    const fromKey = this._nemesis.active
      ? (this._nemesis.currentCellKey ?? grid.startCell.key)
      : grid.startCell.key;

    cell.isWalkable = false;
    const testPath  = grid.findPath(fromKey, grid.goalCell.key);
    if (testPath.length === 0) {
      cell.isWalkable = true;
      this._showBuildMessage('No valid path — placement blocked!');
      this._closeBuildUI();
      return;
    }

    cell.blockadeLevel = 1;
    this._playerCurrency -= 1;
    this._nemesis.requestRepath();
    this._fogDirty = true;
    this._closeBuildUI();
    this._updateHUD();
  }

  _showBuildMessage(text) {
    const el = document.getElementById('build-message');
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(this._buildMsgTimer);
    this._buildMsgTimer = setTimeout(() => { el.style.opacity = '0'; }, 2000);
  }

  _advanceToNextLevel() {
    const overlay = document.getElementById('post-run-overlay');
    if (overlay) overlay.style.display = 'none';
    this._closeBuildUI();

    this.progression.advanceLevel();
    this._archiveActiveIsland();

    const archivedGrid = this.archivedIslands[this.archivedIslands.length - 1].grid;
    this.nextOffsetQ   = archivedGrid.goalCell.q + 1;

    this.activeIsland = this._generateNextIsland();

    const { x: gx } = HexMath.toPixel(archivedGrid.goalCell.q, archivedGrid.goalCell.r, this.cellSize);
    this.archiveBoundaryWorldX = gx + this.cellSize * 0.6;

    this._levelCompleting = false;
    this._showPreRun();
    this._updateHUD();
  }

  _archiveActiveIsland() {
    const island = this.activeIsland;
    if (!island) return;

    // Re-render the island without fog for the archive view
    const archRenderer = new HexRenderer(island.canvas, {
      cellSize: this.cellSize, showPath: false, padding: 60, fogMode: false,
    });
    archRenderer.render(island.grid);
    island.worldLeft = archRenderer.worldLeft;
    island.worldTop  = archRenderer.worldTop;

    this.archivedIslands.push(island);
    this.activeIsland = null;
  }

  // ── Fog of War helpers ─────────────────────────────────────────────────────

  // Wall-aware BFS: expand through open passages up to sightRange steps.
  _updateFogOfWar() {
    const grid  = this.activeIsland?.grid;
    if (!grid) return;

    // Downgrade IN_SIGHT → REVEALED for cells leaving the active radius
    for (const cell of grid.cells.values()) {
      if (cell.visibility === 2) cell.visibility = 1;
    }

    const startKey = this.player.currentCellKey;
    if (!startKey || !grid.cells.has(startKey)) return;

    const dist  = new Map([[startKey, 0]]);
    const queue = [startKey];

    while (queue.length) {
      const key  = queue.shift();
      const cell = grid.cells.get(key);
      if (!cell) continue;
      cell.visibility = 2; // IN_SIGHT

      const d = dist.get(key);
      if (d >= this.sightRange) continue;

      for (let dir = 0; dir < 6; dir++) {
        if (cell.walls[dir]) continue; // walls block sight
        const nb = HexMath.neighbor(cell.q, cell.r, cell.s, dir);
        const nk = HexMath.key(nb.q, nb.r, nb.s);
        if (!dist.has(nk) && grid.cells.has(nk)) {
          dist.set(nk, d + 1);
          queue.push(nk);
        }
      }
    }

    this._fogDirty = true;
  }

  // Mark every active island cell as IN_SIGHT (used during peek).
  _fullReveal() {
    const grid = this.activeIsland?.grid;
    if (!grid) return;
    for (const cell of grid.cells.values()) cell.visibility = 2;
    this._fogDirty = true;
  }

  // Reset every active island cell to HIDDEN.
  _resetFog() {
    const grid = this.activeIsland?.grid;
    if (!grid) return;
    for (const cell of grid.cells.values()) cell.visibility = 0;
    this._fogDirty = true;
  }

  // Re-render active island offscreen canvas when fog state has changed.
  _flushFog() {
    if (!this._fogDirty || !this.activeIsland) return;
    this._fogDirty = false;
    this.activeIsland.renderer.render(this.activeIsland.grid);
    this.activeIsland.worldLeft = this.activeIsland.renderer.worldLeft;
    this.activeIsland.worldTop  = this.activeIsland.renderer.worldTop;
  }

  // ── RAF loop ───────────────────────────────────────────────────────────────

  _startRAF() {
    this._lastTime = performance.now();
    const tick = time => {
      if (!this._rafId) return;
      const dt = Math.min((time - this._lastTime) / 1000, 0.05);
      this._lastTime = time;
      this._update(dt);
      this._flushFog();
      this._render();
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _stopRAF() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._keys = {}; this._pointerActive = false; this._panActive = false;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  _update(dt) {
    if (this._runState === 'peeking') {
      this._peekTimer -= dt;
      if (this._peekTimer <= 0) this._endPeek();
      this._updateHUD();
      return;
    }

    const active = this._runState === 'playing' || this._runState === 'nemesis';
    if (!active || !this.activeIsland) return;

    const grid = this.activeIsland.grid;

    // One-way door: block re-entry into archived islands
    if (this.player.worldX - this.player.radius < this.archiveBoundaryWorldX) {
      this.player.worldX = this.archiveBoundaryWorldX + this.player.radius;
    }

    // ── Phase A/B: setup timer countdown ──────────────────────────────────────
    if (this._runState === 'playing' && this.progression.level >= 4) {
      this._setupTimer -= dt;
      if (this._setupTimer <= 0) {
        this._setupTimer = 0;
        this._startNemesisPhase();
        return;
      }
    }

    // ── Phase C: attack timer + nemesis movement ───────────────────────────────
    if (this._runState === 'nemesis') {
      this._attackTimer -= dt;
      if (this._attackTimer <= 0) {
        this._attackTimer = 0;
        if (!this._levelCompleting) {
          this._levelCompleting = true;
          setTimeout(() => this._showPostRun(true), 800);
        }
        this._updateHUD();
        return;
      }
      if (this.progression.level >= 4) {
        this._nemesis.update(dt, grid, this.cellSize);
        if (this._nemesis.reachedGoal && !this._levelCompleting) {
          this._levelCompleting = true;
          setTimeout(() => this._showPostRun(false), 400);
        }
      }
    }

    // ── Player movement (phases A, B, C) ──────────────────────────────────────
    const wp = this._pointerToWorld();
    this.player.update(dt, grid, this.cellSize, this.floorScale, {
      keys:          this._keys,
      pointerActive: this._pointerActive && !this._buildUIOpen,
      worldPointerX: wp.x,
      worldPointerY: wp.y,
    });

    const ck = this.player.currentCellKey;

    // Track non-ideal visits (levels 1-3 only)
    if (this.progression.level <= 3 && ck && !this._idealPathSet.has(ck)) {
      this._visitedNonIdealCells.add(ck);
    }

    // Collect loot on cell entry
    if (ck) {
      const cell = grid.cells.get(ck);
      if (cell) {
        if (cell.hasCurrency && cell.currencyAmount > 0) {
          this._playerCurrency += cell.currencyAmount;
          cell.hasCurrency = false; cell.currencyAmount = 0;
          this._fogDirty = true;
        }
        if (cell.hasUpgrade) {
          this._playerCurrency += 2; // upgrades convert to +2 currency
          cell.hasUpgrade = false;
          this._fogDirty = true;
        }
      }
    }

    // Fog update on cell change
    if (this._fogNeedsUpdate()) this._updateFogOfWar();

    this._updateHUD();

    // ── Goal reached ──────────────────────────────────────────────────────────
    if (ck === grid.goalCell.key) {
      if (this.progression.level >= 4) {
        // Phase B: unlock building
        if (!this._buildPhaseUnlocked) {
          this._buildPhaseUnlocked = true;
          this._updateHUD();
        }
      } else {
        // Levels 1-3: direct win
        if (!this._levelCompleting) {
          this._levelCompleting = true;
          setTimeout(() => this._showPostRun(true), 600);
        }
      }
    }
  }

  _lastFogCellKey = null;
  _fogNeedsUpdate() {
    const ck = this.player.currentCellKey;
    if (ck !== this._lastFogCellKey) { this._lastFogCellKey = ck; return true; }
    return false;
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  _render() {
    const ctx = this.ctx;
    const W   = this.viewportW;
    const H   = this.viewportH;

    ctx.fillStyle = '#06060f';
    ctx.fillRect(0, 0, W, H);

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

    if (this._runState === 'playing' || this._runState === 'nemesis') {
      if (this.showMovementAssist && this.player.currentCellKey && this.activeIsland) {
        this._renderMovementAssist(ctx);
      }
      this._renderPlayer(ctx);
      if (this._runState === 'nemesis' && this._nemesis.active) {
        this._renderNemesis(ctx);
      }
    } else if (this._runState === 'peeking') {
      this._renderPlayer(ctx);
    }

    if (this._levelCompleting) {
      ctx.fillStyle = 'rgba(0,255,136,0.06)';
      ctx.fillRect(this.player.worldX - W, this.player.worldY - H, W * 2, H * 2);
    }

    ctx.restore();

    // Archive boundary (screen space)
    if (this.archiveBoundaryWorldX > -Infinity) {
      const bx = (this.archiveBoundaryWorldX - this.cameraX) * this.cameraZoom + W / 2;
      if (bx > 0 && bx < W) {
        ctx.strokeStyle = 'rgba(0,212,255,0.18)';
        ctx.lineWidth   = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, H); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Peek countdown overlay
    if (this._runState === 'peeking') {
      const pct = this._peekTimer / this.progression.peekDuration;
      ctx.fillStyle = `rgba(255,200,50,${0.06 * pct})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(255,200,50,${0.7 * pct})`;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`PEEK  ${this._peekTimer.toFixed(1)}s`, W / 2, 12);
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
    ctx.beginPath(); ctx.arc(px, py, r * 3.2, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle   = '#ffd23f';
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur  = 14; ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.beginPath(); ctx.arc(px - r * 0.28, py - r * 0.28, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.restore();
  }

  _renderNemesis(ctx) {
    const n = this._nemesis, r = n.radius;
    ctx.save();
    const grd = ctx.createRadialGradient(n.worldX, n.worldY, 0, n.worldX, n.worldY, r * 3.5);
    grd.addColorStop(0, 'rgba(255,68,102,0.50)');
    grd.addColorStop(1, 'rgba(255,68,102,0)');
    ctx.beginPath(); ctx.arc(n.worldX, n.worldY, r * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.fill();
    ctx.beginPath(); ctx.arc(n.worldX, n.worldY, r, 0, Math.PI * 2);
    ctx.fillStyle   = '#ff4466';
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur  = 20; ctx.fill();
    ctx.shadowBlur  = 0;
    // Label
    ctx.fillStyle    = '#fff';
    ctx.font         = `bold ${Math.round(r * 0.9)}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', n.worldX, n.worldY);
    ctx.restore();
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  _updateHUD() {
    const pm = this.progression;
    const el = id => document.getElementById(id);

    if (el('hud-level'))      el('hud-level').textContent      = pm.level;
    if (el('hud-difficulty')) el('hud-difficulty').textContent = this._levelDifficultyScore;
    if (el('hud-sight'))      el('hud-sight').textContent      = this.sightRange >= 4 ? '∞' : this.sightRange;
    if (el('hud-total-score')) el('hud-total-score').textContent = this.totalScore;

    // Currency
    const cRow = el('hud-currency-row');
    if (cRow) cRow.style.display = this.progression.level >= 4 ? '' : 'none';
    if (el('hud-currency')) el('hud-currency').textContent = this._playerCurrency;

    // Phase indicator (A / B / C)
    const phaseRow = el('hud-phase-row');
    if (phaseRow) phaseRow.style.display = pm.level >= 4 ? '' : 'none';
    if (el('hud-phase')) {
      const phaseLabel = this._runState === 'nemesis' ? 'C — Attack!'
        : this._buildPhaseUnlocked ? 'B — Build' : 'A — Explore';
      el('hud-phase').textContent = phaseLabel;
      el('hud-phase').style.color = this._runState === 'nemesis' ? '#ff4466'
        : this._buildPhaseUnlocked ? '#ffd23f' : '#4a9eff';
    }

    // Peek timer
    if (this._runState === 'peeking') {
      if (el('hud-peek')) el('hud-peek').textContent = this._peekTimer.toFixed(1) + 's';
      el('hud-peek-row')?.style && (el('hud-peek-row').style.display = '');
    } else {
      el('hud-peek-row')?.style && (el('hud-peek-row').style.display = 'none');
    }

    // Central phase timer display
    this._updateTimerDisplay();
  }

  _updateTimerDisplay() {
    const timerEl = document.getElementById('phase-timer');
    const valEl   = document.getElementById('phase-timer-value');
    const lblEl   = document.getElementById('phase-timer-label');
    if (!timerEl || !valEl) return;

    const lv = this.progression.level;

    if (this._runState === 'playing' && lv >= 4) {
      timerEl.style.display = '';
      if (lblEl) lblEl.textContent = 'SETUP';
      valEl.textContent = this._setupTimer.toFixed(1);
      const pct = this._setupTimeTotal > 0 ? this._setupTimer / this._setupTimeTotal : 1;
      timerEl.classList.toggle('timer-warning', pct <= 0.10);
    } else if (this._runState === 'nemesis') {
      timerEl.style.display = '';
      if (lblEl) lblEl.textContent = 'ATTACK';
      valEl.textContent = this._attackTimer.toFixed(1);
      const pct = this._attackTimeTotal > 0 ? this._attackTimer / this._attackTimeTotal : 1;
      timerEl.classList.toggle('timer-warning', pct <= 0.10);
    } else {
      timerEl.style.display = 'none';
      timerEl.classList.remove('timer-warning');
    }
  }
}
