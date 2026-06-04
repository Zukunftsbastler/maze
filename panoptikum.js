'use strict';

// ────────────────────────────────────────────────────────────────────────────────
// panoptikum.js  –  Meta-Progression Hub + Global Persistent UI
// ────────────────────────────────────────────────────────────────────────────────

(function injectPanoStyles() {
  if (document.getElementById('pano-styles')) return;
  const s = document.createElement('style');
  s.id = 'pano-styles';
  s.textContent = `
    /* ── Panoptikum hub container ──────────────────────────────────────────── */
    #panoptikum-hub {
      position: fixed; inset: 0; z-index: 500;
      background: #06060f;
      display: none; flex-direction: column;
      font-family: 'Courier New', monospace; color: #c8d6e5;
      overflow: hidden;
    }

    /* ── Tutorial transition (dirty panoptikum) ────────────────────────────── */
    #pano-transition {
      position: absolute; inset: 0; z-index: 5;
      display: none; align-items: center; justify-content: center;
    }
    #pano-dirty-img {
      position: absolute; inset: 0;
      width: 100%; height: 100%; object-fit: cover;
      z-index: 1;
    }
    #pano-transition-panel {
      position: relative; z-index: 2;
      max-width: 520px; width: 90%;
      background: rgba(6,6,15,0.86); backdrop-filter: blur(8px);
      border: 1px solid rgba(184,153,114,0.38);
      border-radius: 10px; padding: 26px 28px;
      display: flex; flex-direction: column; gap: 20px; align-items: center;
    }
    #pano-transition-panel .lore-text {
      border: none; background: none; padding: 0; margin: 0;
      font-size: 0.88rem; text-align: left;
    }
    #btn-claim-sanctuary { width: 100%; }

    /* ── Main views wrapper ────────────────────────────────────────────────── */
    #pano-views {
      position: absolute; inset: 0;
    }

    /* ── Panoptikum hub view (z-index layer stack per spec) ────────────────── */
    #pano-view-hub {
      position: absolute; inset: 0;
      display: flex; align-items: flex-end;
    }
    #pano-bg {
      position: absolute; inset: 0; z-index: 1;
      background-image: url('ASSETS/PANOPTICUM/Panopticum.png');
      background-size: cover; background-position: center;
    }
    #artifact-layer {
      position: absolute; inset: 0; z-index: 10;
      pointer-events: none;
    }
    #crowd-foreground {
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 22%; z-index: 20; overflow: hidden;
      pointer-events: none;
    }

    /* ── Fade screen for smooth view transitions ───────────────────────────── */
    #pano-fade-screen {
      position: fixed; inset: 0; z-index: 1050;
      background: #06060f; opacity: 0;
      pointer-events: none; transition: opacity 0.20s ease;
    }
    #pano-fade-screen.fading { opacity: 1; pointer-events: all; }

    /* ── Global persistent UI bar ──────────────────────────────────────────── */
    #global-ui {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1100;
      height: 50px; display: none;
      align-items: center; justify-content: space-between;
      padding: 0 18px;
      background: rgba(6,6,15,0.90); backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(74,158,255,0.18);
      font-family: 'Courier New', monospace;
    }

    /* Left panel */
    #global-left { display: flex; align-items: center; gap: 20px; }
    #global-score-block { display: flex; flex-direction: column; line-height: 1.15; }
    #global-score-label {
      font-size: 0.54rem; letter-spacing: 0.14em; color: #4a9eff;
      text-transform: uppercase;
    }
    #global-score-val {
      font-size: 1.05rem; font-weight: bold; color: #ffd23f;
      text-shadow: 0 0 8px rgba(255,210,63,0.35);
    }
    #global-stats-placeholder {
      font-size: 0.60rem; color: #1e2e3e; letter-spacing: 0.06em;
      /* reserved for future statistics */
    }

    /* Right panel — navigation */
    #global-right { display: flex; gap: 6px; }
    .global-nav-btn {
      background: transparent;
      border: 1px solid rgba(74,158,255,0.25); color: #445566;
      border-radius: 5px; padding: 5px 13px;
      font-family: inherit; font-size: 0.70rem; letter-spacing: 0.09em;
      cursor: pointer; text-transform: uppercase;
      transition: background 0.14s, color 0.14s, border-color 0.14s,
                  box-shadow 0.14s;
      white-space: nowrap;
    }
    .global-nav-btn:hover {
      background: rgba(74,158,255,0.10); color: #4a9eff;
      border-color: rgba(74,158,255,0.55);
    }
    .global-nav-btn.active {
      background: rgba(74,158,255,0.14); color: #4a9eff;
      border-color: #4a9eff;
      box-shadow: 0 0 8px rgba(74,158,255,0.25);
    }

    /* ── Offset expedition overlay below global bar ────────────────────────── */
    body.pano-ui-active #expedition-overlay { top: 50px; }
    body.pano-ui-active #expedition-overlay #exp-title-bar { display: none; }

    /* ── Reset progress button (in global left panel) ──────────────────────── */
    #btn-reset-progress {
      background: transparent;
      border: 1px solid rgba(255,68,102,0.22); color: #3a2030;
      border-radius: 4px; padding: 3px 9px;
      font-family: inherit; font-size: 0.62rem; letter-spacing: 0.09em;
      cursor: pointer; text-transform: uppercase;
      transition: background 0.14s, color 0.14s, border-color 0.14s;
      white-space: nowrap;
    }
    #btn-reset-progress:hover {
      background: rgba(255,68,102,0.10); color: #ff4466;
      border-color: rgba(255,68,102,0.55);
    }

    /* ── Confirmation modal ─────────────────────────────────────────────────── */
    #reset-confirm-overlay {
      position: fixed; inset: 0; z-index: 1200;
      background: rgba(6,6,15,0.80); backdrop-filter: blur(6px);
      display: none; align-items: center; justify-content: center;
    }
    #reset-confirm-overlay.visible { display: flex; }
    #reset-confirm-dialog {
      background: rgba(12,10,22,0.98);
      border: 1px solid rgba(255,68,102,0.40);
      border-radius: 10px; padding: 28px 30px;
      max-width: 420px; width: 90%;
      font-family: 'Courier New', monospace; color: #c8d6e5;
      text-align: center;
      box-shadow: 0 0 40px rgba(255,68,102,0.12);
    }
    #reset-confirm-title {
      font-size: 0.95rem; font-weight: bold; letter-spacing: 0.12em;
      text-transform: uppercase; color: #ff4466;
      text-shadow: 0 0 10px rgba(255,68,102,0.5);
      margin-bottom: 14px;
    }
    #reset-confirm-body {
      font-size: 0.78rem; color: #7a8899; line-height: 1.68;
      margin-bottom: 22px;
    }
    #reset-confirm-body strong { color: #c8d6e5; }
    #reset-confirm-btns {
      display: flex; gap: 10px; justify-content: center;
    }
    #btn-reset-cancel {
      flex: 1; padding: 9px 0;
      background: transparent; border: 1.5px solid #334455; color: #556677;
      border-radius: 6px; font-family: inherit; font-size: 0.80rem;
      letter-spacing: 0.08em; cursor: pointer; text-transform: uppercase;
      transition: background 0.14s, color 0.14s, border-color 0.14s;
    }
    #btn-reset-cancel:hover {
      background: rgba(74,158,255,0.08); color: #4a9eff;
      border-color: rgba(74,158,255,0.4);
    }
    #btn-reset-confirm {
      flex: 1; padding: 9px 0;
      background: rgba(255,68,102,0.10); border: 1.5px solid #ff4466;
      color: #ff4466; border-radius: 6px; font-family: inherit;
      font-size: 0.80rem; font-weight: bold; letter-spacing: 0.08em;
      cursor: pointer; text-transform: uppercase;
      transition: background 0.14s, box-shadow 0.14s;
    }
    #btn-reset-confirm:hover {
      background: rgba(255,68,102,0.20);
      box-shadow: 0 0 14px rgba(255,68,102,0.35);
    }
  `;
  document.head.appendChild(s);
})();

// ── PanoptikumHub ──────────────────────────────────────────────────────────────

class PanoptikumHub {
  /**
   * @param {ExpeditionMaps} expeditionMaps
   */
  constructor(expeditionMaps) {
    this._exp         = expeditionMaps;
    this._startExpCb  = null;
    this._onAfterClaim = null;
    this._buildDOM();
    this._syncScore();
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Show the dirty-panoptikum transition screen (called once after tutorial).
   * onAfterClaim() fires when the player clicks "Restore & Claim Sanctuary".
   */
  showTransition(onAfterClaim) {
    this._onAfterClaim = onAfterClaim;
    this._hideGlobalUI();
    this._hub().style.display = 'flex';
    this._el('pano-transition').style.display = 'flex';
    this._el('pano-views').style.display      = 'none';
  }

  /**
   * Show the restored Panoptikum hub (main menu).
   * startCb(zone) is called when the player starts an expedition.
   */
  showHub(startCb) {
    if (startCb) this._startExpCb = startCb;
    this._exp.hide();
    this._hub().style.display = 'flex';
    this._el('pano-transition').style.display = 'none';
    this._el('pano-views').style.display      = '';
    this._el('pano-view-hub').style.display   = '';
    this._showGlobalUI();
    this._setNavActive('panoptikum');
    this._syncScore();
  }

  /**
   * Show View A (macro map) via the expedition overlay.
   * startCb(zone) is called when an expedition is started from the overlay.
   */
  showViewA(startCb) {
    if (startCb) this._startExpCb = startCb;
    this._fadeTransition(() => {
      this._hub().style.display = 'none';
      this._exp.show(zone => { if (this._startExpCb) this._startExpCb(zone); });
      this._showGlobalUI();
      this._setNavActive('view-a');
      this._syncScore();
    });
  }

  /**
   * Show View B (micro map) via the expedition overlay.
   */
  showViewB(startCb) {
    if (startCb) this._startExpCb = startCb;
    this._fadeTransition(() => {
      this._hub().style.display = 'none';
      this._exp.showAtMicro(zone => { if (this._startExpCb) this._startExpCb(zone); });
      this._showGlobalUI();
      this._setNavActive('view-b');
      this._syncScore();
    });
  }

  /** Call before entering play mode — hides hub + global UI. */
  enterPlayMode() {
    this._exp.hide();
    this._hub().style.display = 'none';
    this._hideGlobalUI();
  }

  /** Refresh the global score display from expedition state. */
  syncScore() { this._syncScore(); }

  // ── DOM construction ──────────────────────────────────────────────────────────

  _buildDOM() {
    // ── Fade screen (sits above everything except the very top) ──────────────
    const fade = document.createElement('div');
    fade.id = 'pano-fade-screen';
    document.body.appendChild(fade);

    // ── Hub container ─────────────────────────────────────────────────────────
    const hub = document.createElement('div');
    hub.id = 'panoptikum-hub';
    hub.innerHTML = `
      <!-- Transition: dirty panoptikum -->
      <div id="pano-transition">
        <img id="pano-dirty-img"
             src="ASSETS/PANOPTICUM/Panopticum_dirty.png"
             alt="The Panoptikum — ruined">
        <div id="pano-transition-panel">
          <p class="lore-text">I have finally reached the legendary Panoptikum. It is covered in cobwebs, moss, and centuries of decay. If I can clean this place up, it will serve as the perfect sanctuary and exhibition hall for my discoveries.</p>
          <button class="primary accent" id="btn-claim-sanctuary">Restore &amp; Claim Sanctuary</button>
        </div>
      </div>

      <!-- Main views (shown after transition) -->
      <div id="pano-views">
        <!-- View: Restored Panoptikum hub -->
        <div id="pano-view-hub">
          <div id="pano-bg"></div>
          <div id="artifact-layer"></div>
          <div id="crowd-foreground"></div>
        </div>
        <!-- Views A & B are rendered by the expedition overlay (z-1000) above this -->
      </div>
    `;
    document.body.appendChild(hub);

    hub.querySelector('#btn-claim-sanctuary').addEventListener('click', () => {
      localStorage.setItem('hexmaze_panoptikum_restored', '1');
      this._fadeTransition(() => {
        if (this._onAfterClaim) this._onAfterClaim();
        else this.showHub();
      });
    });

    // ── Global UI bar ─────────────────────────────────────────────────────────
    const ui = document.createElement('div');
    ui.id = 'global-ui';
    ui.innerHTML = `
      <div id="global-left">
        <div id="global-score-block">
          <span id="global-score-label">Total Score</span>
          <span id="global-score-val">0</span>
        </div>
        <div id="global-stats-placeholder"></div>
        <button id="btn-reset-progress">↺ Reset</button>
      </div>
      <div id="global-right">
        <button id="btn-nav-panoptikum" class="global-nav-btn active">⌂ Panoptikum</button>
        <button id="btn-nav-view-a"     class="global-nav-btn">⬡ World Map</button>
        <button id="btn-nav-view-b"     class="global-nav-btn">⚔ Expeditions</button>
      </div>
    `;
    document.body.appendChild(ui);

    ui.querySelector('#btn-nav-panoptikum').addEventListener('click', () => {
      this._fadeTransition(() => this.showHub());
    });
    ui.querySelector('#btn-nav-view-a').addEventListener('click', () => {
      this.showViewA();
    });
    ui.querySelector('#btn-nav-view-b').addEventListener('click', () => {
      this.showViewB();
    });
    ui.querySelector('#btn-reset-progress').addEventListener('click', () => {
      this._el('reset-confirm-overlay').classList.add('visible');
    });

    // ── Confirmation modal ────────────────────────────────────────────────────
    const modal = document.createElement('div');
    modal.id = 'reset-confirm-overlay';
    modal.innerHTML = `
      <div id="reset-confirm-dialog">
        <div id="reset-confirm-title">Reset All Progress?</div>
        <div id="reset-confirm-body">
          This will permanently erase:<br>
          <strong>Tutorial completion · Panoptikum restoration<br>
          All expedition progress · Total score</strong><br><br>
          You will restart from the very beginning.
          This cannot be undone.
        </div>
        <div id="reset-confirm-btns">
          <button id="btn-reset-cancel">Cancel</button>
          <button id="btn-reset-confirm">Yes, Reset Everything</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#btn-reset-cancel').addEventListener('click', () => {
      modal.classList.remove('visible');
    });
    modal.addEventListener('click', e => {
      // Close when clicking the dark backdrop (outside the dialog)
      if (e.target === modal) modal.classList.remove('visible');
    });
    modal.querySelector('#btn-reset-confirm').addEventListener('click', () => {
      [
        'hexmaze_tutorial_done',
        'hexmaze_panoptikum_restored',
        'hexmaze_expedition_state',
        'hexmaze_totalscore',
      ].forEach(k => localStorage.removeItem(k));
      window.location.reload();
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  _hub()       { return document.getElementById('panoptikum-hub'); }
  _el(id)      { return document.getElementById(id); }

  _showGlobalUI() {
    document.body.classList.add('pano-ui-active');
    this._el('global-ui').style.display = 'flex';
  }

  _hideGlobalUI() {
    document.body.classList.remove('pano-ui-active');
    this._el('global-ui').style.display = 'none';
  }

  _setNavActive(key) {
    const map = {
      panoptikum: '#btn-nav-panoptikum',
      'view-a':   '#btn-nav-view-a',
      'view-b':   '#btn-nav-view-b',
    };
    document.querySelectorAll('.global-nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(map[key]);
    if (btn) btn.classList.add('active');
  }

  /** Cross-fade to black, run callback, then fade back. */
  _fadeTransition(callback) {
    const fs = document.getElementById('pano-fade-screen');
    fs.classList.add('fading');
    setTimeout(() => {
      callback();
      setTimeout(() => fs.classList.remove('fading'), 40);
    }, 210);
  }

  _syncScore() {
    try {
      const state = JSON.parse(
        localStorage.getItem('hexmaze_expedition_state') || '{}'
      );
      const score = state.globalScore || 0;
      const el = document.getElementById('global-score-val');
      if (el) el.textContent = score;
    } catch (_) {}
  }
}
