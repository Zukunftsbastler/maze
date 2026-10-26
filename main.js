// Spielstart und Bedienoberfläche – früher als Inline-Skript in index.html.
// Ausgelagert, damit die Content-Security-Policy ohne 'unsafe-inline' für Skripte auskommt.
// ── State ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('maze-canvas');
let analysisGrid     = null;
let analysisRenderer = null;
let gameLoop         = null;
let currentMode      = 'analysis';

const expeditionMaps = new ExpeditionMaps();
const panoptikum     = new PanoptikumHub(expeditionMaps);

// ── Expedition flow helpers ────────────────────────────────────────────────
function startExpeditionFlow(zone) {
  panoptikum.enterPlayMode();
  enterPlayMode({
    expedition: zone,
    onComplete: score => {
      enterAnalysisMode();
      expeditionMaps.onExpeditionComplete(zone.id, score);
      panoptikum.syncScore();
      panoptikum.showViewB(startExpeditionFlow);
    },
    onAbort: penaltyScore => {
      enterAnalysisMode();
      expeditionMaps.onExpeditionAborted(zone.id, penaltyScore);
      panoptikum.syncScore();
      panoptikum.showViewB(startExpeditionFlow);
    },
  });
}

// ── Analysis Mode ──────────────────────────────────────────────────────────
function getAnalysisParams() {
  return {
    radius:        parseInt(document.getElementById('radius').value, 10),
    windingFactor: parseFloat(document.getElementById('winding').value),
    seed:          document.getElementById('seed').value || 'maze',
    cellSize:      parseInt(document.getElementById('cellsize').value, 10),
    showPath:      document.getElementById('show-path').checked,
  };
}

function generateAnalysis() {
  const p   = getAnalysisParams();
  const gen = new HexGridGenerator({
    radius: p.radius, windingFactor: p.windingFactor, seed: p.seed,
    offsetQ: 0, topologyMode: 'SINGLE_BLOB',
  });
  analysisGrid = gen.generate();

  // Analysis renderer: fog disabled so everything is fully visible
  analysisRenderer = new HexRenderer(canvas, {
    cellSize: p.cellSize, showPath: p.showPath, fogMode: false,
  });
  const path = analysisGrid.findPath(analysisGrid.startCell.key, analysisGrid.goalCell.key);
  analysisRenderer.setPath(path);
  analysisRenderer.render(analysisGrid);

  const s = analysisGrid.startCell, g = analysisGrid.goalCell;
  document.getElementById('stats').textContent =
    `Cells: ${analysisGrid.cells.size}  |  Path: ${path.length}  |  ` +
    `Start: (${s.q},${s.r})  →  Goal: (${g.q},${g.r})  |  ` +
    `Mode: ${analysisGrid.topologyMode}`;
}

// ── Mode switching ─────────────────────────────────────────────────────────
function enterPlayMode(config = {}) {
  currentMode = 'play';
  document.body.classList.add('play-mode');
  document.getElementById('btn-mode').textContent = 'Analysis Mode';
  document.getElementById('btn-mode').classList.add('active');
  document.getElementById('controls').style.display = 'none';
  document.getElementById('stats').style.display    = 'none';
  document.getElementById('play-bar').classList.add('visible');
  document.getElementById('hud').classList.add('visible');
  document.getElementById('controls-hint').classList.add('visible');

  gameLoop = new GameLoop(canvas);
  gameLoop.setShowMovementAssist(document.getElementById('show-assist').checked);

  if (config.tutorial) {
    gameLoop.startTutorial(config.onComplete);
  } else if (config.expedition) {
    gameLoop.startExpedition(config.expedition, config.onComplete, config.onAbort);
  } else {
    gameLoop.start();
  }
}

function enterAnalysisMode() {
  currentMode = 'analysis';
  document.body.classList.remove('play-mode');
  document.getElementById('btn-mode').textContent = 'Play Mode';
  document.getElementById('btn-mode').classList.remove('active');
  document.getElementById('controls').style.display = '';
  document.getElementById('stats').style.display    = '';
  document.getElementById('play-bar').classList.remove('visible');
  document.getElementById('hud').classList.remove('visible');
  document.getElementById('controls-hint').classList.remove('visible');

  // Hide any lingering overlays
  document.getElementById('pre-run-overlay').style.display  = 'none';
  document.getElementById('post-run-overlay').style.display = 'none';
  document.getElementById('build-panel').style.display      = 'none';
  document.getElementById('phase-timer').style.display      = 'none';

  if (gameLoop) { gameLoop.stop(); gameLoop = null; }
  generateAnalysis();
}

// ── Event wiring ───────────────────────────────────────────────────────────
document.getElementById('btn-mode').addEventListener('click', () => {
  if (currentMode === 'analysis') {
    const tutorialDone    = !!localStorage.getItem('hexmaze_tutorial_done');
    const panoptikumShown = !!localStorage.getItem('hexmaze_panoptikum_restored');
    if (!tutorialDone) {
      // First time: run tutorial, then show dirty panoptikum transition
      enterPlayMode({
        tutorial: true,
        onComplete: () => {
          localStorage.setItem('hexmaze_tutorial_done', '1');
          enterAnalysisMode();
          panoptikum.showTransition(() => panoptikum.showHub(startExpeditionFlow));
        },
      });
    } else if (!panoptikumShown) {
      // Tutorial done but transition not yet claimed (e.g. page reload mid-transition)
      panoptikum.showTransition(() => panoptikum.showHub(startExpeditionFlow));
    } else {
      // Fully set up: go straight to hub
      panoptikum.showHub(startExpeditionFlow);
    }
  } else {
    enterAnalysisMode();
  }
});

['radius','winding','cellsize'].forEach(id => {
  const el  = document.getElementById(id);
  const lbl = document.getElementById(id + '-val');
  el.addEventListener('input', () => {
    lbl.textContent = id === 'winding' ? parseFloat(el.value).toFixed(2) : el.value;
  });
});

document.getElementById('btn-generate').addEventListener('click', generateAnalysis);
document.getElementById('btn-random').addEventListener('click', () => {
  document.getElementById('seed').value = Math.random().toString(36).slice(2, 10);
  generateAnalysis();
});
document.getElementById('show-path').addEventListener('change', () => {
  if (!analysisGrid || !analysisRenderer) return;
  analysisRenderer.showPath = document.getElementById('show-path').checked;
  analysisRenderer.render(analysisGrid);
});
document.getElementById('btn-export').addEventListener('click', () => {
  if (!analysisGrid) return;
  const data = JSON.stringify(analysisGrid.toJSON(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a    = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `maze-${analysisGrid.seed}-r${analysisGrid.radius}.json`,
  });
  a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById('show-assist').addEventListener('change', e => {
  if (gameLoop) gameLoop.setShowMovementAssist(e.target.checked);
});

// ── Dev Mode ──────────────────────────────────────────────────────────────
document.getElementById('btn-dev-mode').addEventListener('click', () => {
  if (!panoptikum || !panoptikum._collection) {
    alert('Panoptikum not initialised yet — click Play Mode first.');
    return;
  }
  const col = panoptikum._collection;

  // localStorage flags — skip tutorial & transition
  localStorage.setItem('hexmaze_tutorial_done', '1');
  localStorage.setItem('hexmaze_panoptikum_restored', '1');

  // Gold
  col.state.panoptikumGold = 999999;

  // Lab: purchased + max research + unlock all audience insight tiers
  col.labState.purchased = true;
  col.labState.research  = 999999;
  if (!col.labState.audienceInsight) col.labState.audienceInsight = {};
  for (let t = 1; t <= 10; t++) col.labState.audienceInsight[t] = true;
  if (!col.labState.unlockedKnowledge) col.labState.unlockedKnowledge = {};

  // Market: mark all upgrades as purchased
  const allUpgradeIds = (PanoptikumCollection.MARKET_UPGRADES || []).map(u => u.id);
  for (const id of allUpgradeIds) col.marketState.upgrades[id] = true;
  // stockroomI expands slots to 3
  if (!col.marketState.slots[2]) col.marketState.slots[2] = null;

  // Expedition maps: unlock all 60 zones (d1z01–d5z12) in persisted state
  const allZoneIds = [
    'd1z01','d1z02','d1z03','d1z04','d1z05','d1z06','d1z07','d1z08','d1z09','d1z10','d1z11','d1z12',
    'd2z01','d2z02','d2z03','d2z04','d2z05','d2z06','d2z07','d2z08','d2z09','d2z10','d2z11','d2z12',
    'd3z01','d3z02','d3z03','d3z04','d3z05','d3z06','d3z07','d3z08','d3z09','d3z10','d3z11','d3z12',
    'd4z01','d4z02','d4z03','d4z04','d4z05','d4z06','d4z07','d4z08','d4z09','d4z10','d4z11','d4z12',
    'd5z01','d5z02','d5z03','d5z04','d5z05','d5z06','d5z07','d5z08','d5z09','d5z10','d5z11','d5z12',
  ];
  expeditionMaps._state.availableIds = [...allZoneIds];
  expeditionMaps._state.completedIds = [...allZoneIds];
  expeditionMaps._saveState();
  // Apply state to zone objects and derive MACRO_DEPTHS statuses
  expeditionMaps._applyState();
  // Rebuild both SVGs so the new statuses are reflected immediately
  expeditionMaps._buildMacroSVG();
  expeditionMaps._rebuildMicroSVG();

  // Persist
  col._save();
  col._saveLab();
  col._saveMarket();
  if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();

  // Switch to hub
  if (currentMode !== 'analysis') enterAnalysisMode();
  panoptikum.showHub(startExpeditionFlow);
});

// ── Boot ───────────────────────────────────────────────────────────────────
generateAnalysis();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('impressum-toggle').addEventListener('click', () => {
    const body = document.getElementById('impressum-body');
    const open = body.classList.toggle('open');
    document.getElementById('impressum-toggle').textContent = open ? '▲ Impressum & Datenschutz' : '▼ Impressum & Datenschutz';
  });
});
