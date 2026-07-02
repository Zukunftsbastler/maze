'use strict';

// panoptikum-ui.js — PanoptikumHub (DOM, drag-drop, sync)
// Requires panoptikum-collection.js, artifact-registry.js, stats-manager.js, onboarding-manager.js

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
    this._el('pano-view-hub').classList.add('active');
    this._el('pano-view-lab')?.classList.remove('active');
    this._el('pano-view-equip')?.classList.remove('active');
    this._el('pano-view-market')?.classList.remove('active');
    this._showGlobalUI();
    this._setNavActive('panoptikum');
    this._updateLabNavButton();
    this._syncScore();
    if (this._collection) {
      this._collection.awardOfflineIncome();
      this._collection.tickResearch();
      this._syncCollectionUI();
      this._startHubVisitors();
    }
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
      if (typeof OnboardingManager !== 'undefined') {
        const prevSeen = OnboardingManager.isSeen('seenWorldMap');
        OnboardingManager.trigger('seenWorldMap', {
          title: 'The World Map',
          icon:  '⬡',
          lore:  'The labyrinth network spreads far beneath the old city. Each marked site is an independent expedition — catalogued by depth, but never fully mapped.',
          rules: [
            'Select a zone to begin an expedition, or study its known data first.',
            '<strong>Deeper zones</strong> yield rarer artifacts but the mazes grow more complex.',
            'Completing a zone for the first time unlocks permanent score bonuses and may reveal adjacent sites.',
          ],
        });
        const inv = this._collection?.state?.inventory;
        if (prevSeen && inv?.length > 0) {
          OnboardingManager.trigger('seenWorldMapWithArtifact', {
            title: 'The Map Reveals More',
            icon:  '⬡',
            lore:  'Your recovered artifacts hint at the geography of the labyrinth. Each zone\'s depth corresponds to the tier of artifacts found there.',
            rules: [
              '<strong>Tier I artifacts</strong> spawn in depth 1 zones, <strong>Tier II</strong> in depth 2, and so on.',
              'Return to a completed zone to farm a specific artifact type for research or Market sales.',
              'New zones unlock as you complete adjacent expeditions — the map grows with your investigations.',
            ],
          });
        }
      }
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
      if (typeof OnboardingManager !== 'undefined') {
        const prevSeen = OnboardingManager.isSeen('seenExpeditions');
        OnboardingManager.trigger('seenExpeditions', {
          title: 'Expedition Sites',
          icon:  '⬡',
          lore:  'These are the surveyed sites within a depth tier — each with partial records, and each concealing more than the dossier admits.',
          rules: [
            'Select a site and read its dossier, then <strong>launch the expedition</strong>.',
            'Sites completed with a <strong>high score</strong> earn bonus Pano-Gold on the first run.',
            'Some sites are sealed until adjacent routes have been established.',
          ],
        });
        const inv = this._collection?.state?.inventory;
        if (prevSeen && inv?.length > 0) {
          OnboardingManager.trigger('seenExpeditionsWithArtifact', {
            title: 'Plan Your Next Descent',
            icon:  '⬡',
            lore:  'With artifacts already in hand, you have a sense of what the labyrinth yields. Plan your next expedition accordingly.',
            rules: [
              'Completing zones for the first time always earns higher rewards than revisiting.',
              '<strong>Match your research needs</strong> to the artifact types available in each zone.',
              'The further you push into unknown depths, the rarer — and more valuable — your finds will be.',
            ],
          });
        }
      }
    });
  }

  /** Call before entering play mode — hides hub + global UI. */
  enterPlayMode() {
    this._exp.hide();
    this._hub().style.display = 'none';
    this._hideGlobalUI();
    this._stopVisitorAnimation();
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
        <!-- View: Laboratory -->
        <div id="pano-view-lab">
          <div id="lab-header">
            <span id="lab-header-title">⚗ The Laboratory</span>
          </div>
          <div id="lab-stats-bar">
            <div class="lab-stat-chip">
              <span class="lab-stat-label">Research</span>
              <span class="lab-stat-value" id="lab-research-val">0</span>
            </div>
            <div class="lab-stat-chip">
              <span class="lab-stat-label">Research / min</span>
              <span class="lab-stat-value green" id="lab-research-rate">0</span>
            </div>
          </div>
          <div id="lab-content-row">
            <div id="lab-slots-col">
              <div class="lab-col-title">Research Slots</div>
              <div id="lab-slots-area"></div>
              <div id="lab-help-text">
                Artifacts placed here generate Research over time (1 ⬡/min per tier).<br>
                Click any artifact to open its dossier and spend Research to unlock hidden properties.
              </div>
            </div>
            <div id="lab-inv-col">
              <div class="lab-col-title">Cabinet of Curiosities</div>
              <div id="lab-inv-grid"></div>
            </div>
          </div>
          <div id="lab-insight-section" style="display:none;">
            <div class="lab-col-title">⚑ Audience Research</div>
            <div id="lab-insight-help" style="font-size:0.72rem;color:#8899aa;margin-bottom:8px;">
              Purchase a valuation survey to reveal the exhibition appeal of artifacts of that grade.
            </div>
            <div id="lab-insight-area"></div>
          </div>
          <div id="lab-crucible-section">
            <div class="lab-col-title">⊗ Crucible — Destructive Analysis</div>
            <div id="lab-crucible-row">
              <div id="crucible-slot" class="crucible-slot">
                <span class="crucible-slot-icon">⊗</span>
              </div>
              <div id="lab-crucible-info">
                <div id="lab-crucible-help">
                  Sacrifice an artifact to the Crucible. After the analysis period, its essence
                  will unlock a <strong>global knowledge</strong> — a permanent bonus affecting
                  all artifacts that share its tag.
                </div>
                <div id="lab-crucible-status"></div>
                <div id="lab-crucible-btns" style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button class="btn-crucible" id="btn-crucible-cancel" style="display:none;">✕ Abort</button>
                  <button class="btn-crucible" id="btn-crucible-collect" style="display:none;">✦ Collect Discovery</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- View: Market -->
        <div id="pano-view-market">
          <div id="market-header">
            <span id="market-header-title">✦ Antiquities Exchange</span>
            <span id="market-header-sub">List artifacts for timed sales. Upgrades increase payouts and speed.</span>
          </div>
          <div id="market-content-row">
            <div id="market-slots-col">
              <div class="lab-col-title" style="font-size:0.68rem;letter-spacing:0.10em;color:#ffd23f;text-transform:uppercase;margin-bottom:6px;">Sale Slots</div>
              <div id="market-slots-area"></div>
              <div id="market-help-text">Drag an artifact here to list it. Sales complete automatically.</div>
            </div>
            <div id="market-upgrades-col">
              <div class="lab-col-title" style="font-size:0.68rem;letter-spacing:0.10em;color:#ffd23f;text-transform:uppercase;margin-bottom:6px;">Shop Upgrades</div>
              <div id="market-upgrades-area"></div>
            </div>
            <div id="market-inv-col">
              <div class="lab-col-title" style="font-size:0.68rem;letter-spacing:0.10em;color:#c8d6e5;text-transform:uppercase;margin-bottom:6px;">Cabinet of Curiosities</div>
              <div id="market-inv-grid"></div>
            </div>
          </div>
        </div>
        <!-- View: Equipment / Loadout -->
        <div id="pano-view-equip">
          <div id="equip-slot-overlay"></div>
          <div id="equip-inv-panel">
            <div class="lab-col-title">Cabinet of Curiosities</div>
            <div id="equip-inv-grid"></div>
          </div>
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
        <button id="btn-nav-panoptikum"  class="global-nav-btn active">⌂ Panoptikum</button>
        <button id="btn-nav-laboratory"  class="global-nav-btn lab-locked">⚗ Laboratory</button>
        <button id="btn-nav-market"      class="global-nav-btn market-locked">✦ Market</button>
        <button id="btn-nav-equipment"   class="global-nav-btn">⚔ Loadout</button>
        <button id="btn-nav-view-a"      class="global-nav-btn">⬡ World Map</button>
        <button id="btn-nav-view-b"      class="global-nav-btn">⚔ Expeditions</button>
      </div>
    `;
    document.body.appendChild(ui);

    ui.querySelector('#btn-nav-panoptikum').addEventListener('click', () => {
      this._fadeTransition(() => this.showHub());
    });
    ui.querySelector('#btn-nav-laboratory').addEventListener('click', () => {
      this._onLabNavClick();
    });
    ui.querySelector('#btn-nav-market').addEventListener('click', () => {
      this._fadeTransition(() => this.showMarket());
    });
    ui.querySelector('#btn-nav-equipment').addEventListener('click', () => {
      this._fadeTransition(() => this.showEquip());
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

    // ── Lab purchase modal ────────────────────────────────────────────────────
    const labModal = document.createElement('div');
    labModal.id = 'lab-purchase-overlay';
    labModal.innerHTML = `
      <div id="lab-purchase-dialog">
        <div id="lab-purchase-title">⚗ Establish the Laboratory</div>
        <div id="lab-purchase-body">
          The ruins of an ancient alchemical laboratory lie beneath the Panoptikum.<br><br>
          Excavating and restoring the chambers will allow you to conduct structured
          research on your artifacts — unlocking hidden lore, origins, and arcane
          properties that cannot be discerned through exhibition alone.<br><br>
          <strong>One-time cost: 600 Pano-Gold</strong>
        </div>
        <div id="lab-purchase-gold-display"></div>
        <div id="lab-purchase-btns">
          <button id="btn-lab-cancel">Cancel</button>
          <button id="btn-lab-confirm">Excavate &amp; Restore (600 ⬡)</button>
        </div>
      </div>
    `;
    document.body.appendChild(labModal);
    labModal.querySelector('#btn-lab-cancel').addEventListener('click', () => {
      labModal.classList.remove('visible');
    });
    labModal.addEventListener('click', e => {
      if (e.target === labModal) labModal.classList.remove('visible');
    });
    labModal.querySelector('#btn-lab-confirm').addEventListener('click', () => {
      const gold = Math.floor(this._collection.state.panoptikumGold);
      if (gold < 600) return;
      this._collection.state.panoptikumGold -= 600;
      this._collection._save();
      this._collection.labState.purchased = true;
      this._collection._saveLab();
      labModal.classList.remove('visible');
      this._updateLabNavButton();
      this._fadeTransition(() => this.showLab());
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
        'hexmaze_collection',
        'hexmaze_laboratory',
        'hexmaze_market',
        'hexmaze_onboarding',
        'hexmaze_first_visitor_seen',
      ].forEach(k => localStorage.removeItem(k));
      window.location.reload();
    });

    // ── Merge confirm overlay ─────────────────────────────────────────────────
    const mergeOverlay = document.createElement('div');
    mergeOverlay.id = 'merge-confirm-overlay';
    mergeOverlay.innerHTML = `
      <div id="merge-confirm-dialog">
        <div id="merge-confirm-title">⬡ Tier Merge Available</div>
        <div id="merge-confirm-body">
          You have <strong>three artifacts of the same type and tier</strong>.<br>
          They can be fused into a single, higher-tier specimen.
        </div>
        <div id="merge-confirm-cost">
          Cost: <span class="gold-cost" id="merge-cost-gold">— gold</span>
          + <span class="res-cost" id="merge-cost-research">— research</span>
        </div>
        <div id="merge-confirm-btns">
          <button id="btn-merge-cancel">✕ Keep Separate</button>
          <button id="btn-merge-execute">⬡ Fuse Artifacts</button>
        </div>
      </div>
    `;
    document.body.appendChild(mergeOverlay);
    this._pendingMergeCandidate = null;

    mergeOverlay.querySelector('#btn-merge-cancel').addEventListener('click', () => {
      mergeOverlay.classList.remove('visible');
      this._pendingMergeCandidate = null;
    });
    mergeOverlay.addEventListener('click', e => {
      if (e.target === mergeOverlay) {
        mergeOverlay.classList.remove('visible');
        this._pendingMergeCandidate = null;
      }
    });
    mergeOverlay.querySelector('#btn-merge-execute').addEventListener('click', () => {
      const cand = this._pendingMergeCandidate;
      if (!cand) { mergeOverlay.classList.remove('visible'); return; }
      const result = this._collection.executeMerge(cand.typeId, cand.tier);
      mergeOverlay.classList.remove('visible');
      this._pendingMergeCandidate = null;
      if (result) {
        this._showToast(`⬡ Fused into ${ArtifactRegistry.getById(result.typeId)?.name || result.typeId} T${result.tier}`);
        StatsManager.recalculateAll();
        this._syncCollectionUI();
      } else {
        this._showToast('✕ Insufficient resources for merge');
      }
    });

    // ── Arc animation manager ─────────────────────────────────────────────────
    this._arcManager = new PanoArcManager();

    // ── Inventory + pedestal system ───────────────────────────────────────────
    this._collection = new PanoptikumCollection();
    if (typeof StatsManager !== 'undefined') StatsManager.init(this._collection);
    if (typeof OnboardingManager !== 'undefined') OnboardingManager.init();
    this._buildInventoryDOM();
    this._collection.startIncomeTicker(data => this._onIncomeTick(data));

    // Listen for in-game artifact pickups
    document.addEventListener('artifact:collected', e => {
      const instance = this._collection.addArtifact(e.detail.typeId, e.detail.tier ?? 1);
      if (instance?.instanceId) {
        // Let game-loop track this instanceId for rollback on a failed run
        document.dispatchEvent(new CustomEvent('artifact:registered', {
          detail: { instanceId: instance.instanceId },
        }));
      }
      this._syncCollectionUI();
      this._showArtifactToast(instance);
    });

    // Rollback artifacts collected during a failed run
    document.addEventListener('artifact:rollback', e => {
      const ids = e.detail?.instanceIds || [];
      if (!ids.length) return;
      for (const id of ids) this._collection.removeByInstanceId(id);
      if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
      this._syncCollectionUI();
    });

    // Meta-gold earned at end of a successful run → add to panoptikumGold
    document.addEventListener('gold:earned', e => {
      const amount = e.detail?.amount ?? 0;
      if (amount <= 0) return;
      this._collection.state.panoptikumGold = (this._collection.state.panoptikumGold ?? 0) + amount;
      this._collection._save();
      if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
      this._showToast(`+${amount} ⬡ Gold → Panoptikum`);
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
      laboratory: '#btn-nav-laboratory',
      market:     '#btn-nav-market',
      equipment:  '#btn-nav-equipment',
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

  // ── Inventory DOM ─────────────────────────────────────────────────────────────

  _buildInventoryDOM() {
    // ── Extra styles ──────────────────────────────────────────────────────────

    // ── Stats bar (income / visitors / gold) ─────────────────────────────────
    const statsBar = document.createElement('div');
    statsBar.id = 'pano-stats-bar';
    statsBar.innerHTML = `
      <div class="pano-stat-chip">
        <span class="pano-stat-label">Gold / min</span>
        <span class="pano-stat-value green" id="pano-gpm-val">0</span>
      </div>
      <div class="pano-stat-chip">
        <span class="pano-stat-label">Visitors</span>
        <span class="pano-stat-value" id="pano-visitors-val">0</span>
      </div>
      <div class="pano-stat-chip">
        <span class="pano-stat-label">Pano-Gold</span>
        <span class="pano-stat-value purple" id="pano-gold-val">0</span>
      </div>
    `;
    document.getElementById('pano-view-hub').appendChild(statsBar);

    // ── Pedestal drop zones (5 positions across the background) ──────────────
    const PEDESTAL_POSITIONS = [
      { left: '16%', top: '64%' },
      { left: '31%', top: '70%' },
      { left: '50%', top: '72%' },
      { left: '69%', top: '70%' },
      { left: '84%', top: '64%' },
    ];
    const artifactLayer = document.getElementById('artifact-layer');
    this._pedestalEls = PEDESTAL_POSITIONS.map((pos, i) => {
      const el = document.createElement('div');
      el.className   = 'pano-pedestal';
      el.style.left  = pos.left;
      el.style.top   = pos.top;
      el.dataset.pedestalIndex = i;
      el.innerHTML   = `<span class="pano-pedestal-empty-icon">⬡</span>`;
      artifactLayer.appendChild(el);
      this._bindPedestalEvents(el, i);
      return el;
    });

    // ── Inventory toggle button ───────────────────────────────────────────────
    const invBtn = document.createElement('button');
    invBtn.id = 'btn-open-inventory';
    invBtn.textContent = '⊞ Cabinet of Curiosities';
    document.getElementById('pano-view-hub').appendChild(invBtn);
    invBtn.addEventListener('click', () => this._toggleInventory());

    // ── Audience Insight card (Tier 1 only — no Lab required) ────────────────
    const hubInsight = document.createElement('div');
    hubInsight.id = 'hub-insight-area';
    document.getElementById('pano-view-hub').appendChild(hubInsight);

    // ── Inventory drawer ──────────────────────────────────────────────────────
    const drawer = document.createElement('div');
    drawer.id = 'pano-inventory-drawer';
    drawer.innerHTML = `
      <div id="pano-inv-header">
        <span id="pano-inv-title">⊞ Cabinet of Curiosities</span>
        <button id="btn-close-inventory">✕</button>
      </div>
      <div id="pano-inv-grid"></div>
    `;
    document.getElementById('pano-view-hub').appendChild(drawer);
    drawer.querySelector('#btn-close-inventory').addEventListener('click', () => this._closeInventory());

    // ── Artifact toast ────────────────────────────────────────────────────────
    const toast = document.createElement('div');
    toast.id = 'artifact-toast';
    toast.innerHTML = `
      <img id="artifact-toast-img" src="" alt="">
      <div id="artifact-toast-body">
        <div id="artifact-toast-label">Artifact Recovered!</div>
        <div id="artifact-toast-name"></div>
        <div id="artifact-toast-tier"></div>
      </div>
    `;
    document.body.appendChild(toast);

    // ── Drag ghost ────────────────────────────────────────────────────────────
    const ghost = document.createElement('div');
    ghost.id = 'artifact-drag-ghost';
    ghost.style.display = 'none';
    document.body.appendChild(ghost);

    // ── Merge flash ───────────────────────────────────────────────────────────
    const mf = document.createElement('div');
    mf.id = 'merge-flash';
    document.body.appendChild(mf);

    // ── First-visitor notification ─────────────────────────────────────────────
    const vnotif = document.createElement('div');
    vnotif.id = 'visitor-notification';
    vnotif.innerHTML = `
      <div id="visitor-notification-title">⚑ An Audience Has Gathered</div>
      <div id="visitor-notification-body">Your exhibition has drawn significant attention. The public is now paying for admission to the Panoptikum, generating a continuous passive income — as long as you keep attractive artifacts on display.</div>
    `;
    document.body.appendChild(vnotif);

    // ── Exhibit appeal notification ───────────────────────────────────────────
    const appealNotif = document.createElement('div');
    appealNotif.id = 'exhibit-appeal-notification';
    appealNotif.innerHTML = `
      <div id="exhibit-appeal-title">⚑ A Pattern Emerges</div>
      <div id="exhibit-appeal-body">Visitor numbers have begun to fluctuate in ways that do not align with the known monetary value of each exhibit. Certain displays seem to command disproportionate attention — or an unusual willingness to pay. Can the appeal of individual artifacts be systematically studied?</div>
    `;
    document.body.appendChild(appealNotif);

    // ── Artifact dossier overlay ───────────────────────────────────────────────
    const dossier = document.createElement('div');
    dossier.id = 'artifact-dossier';
    dossier.innerHTML = `
      <div id="dossier-panel">
        <div id="dossier-img-col">
          <img id="dossier-full-img" src="" alt="">
          <div id="dossier-tier-badge"></div>
        </div>
        <div id="dossier-info-col">
          <div id="dossier-name"></div>
          <div>
            <div class="dossier-section-title">Lore</div>
            <div id="dossier-lore" class="dossier-lore"></div>
          </div>
          <div>
            <div class="dossier-section-title">Catalogue Entry</div>
            <div id="dossier-meta" class="dossier-meta-table"></div>
          </div>
          <div id="dossier-traits-section">
            <div class="dossier-section-title">Known Properties</div>
            <div id="dossier-traits"></div>
          </div>
          <div id="dossier-unlock-row"></div>
          <button id="btn-close-dossier">Close Dossier</button>
        </div>
      </div>
    `;
    document.body.appendChild(dossier);
    dossier.querySelector('#btn-close-dossier').addEventListener('click', () => this._closeDossier());
    dossier.addEventListener('click', e => { if (e.target === dossier) this._closeDossier(); });

    // ── Text toast ───────────────────────────────────────────────────────────────
    const textToast = document.createElement('div');
    textToast.id = 'pano-text-toast';
    document.body.appendChild(textToast);

    // ── Lab drop zones ─────────────────────────────────────────────────────────
    this._buildLabSlots();

    // Drag + click + visitor tracking
    this._dragState       = null;
    this._pendingClick    = null;
    this._visitorEntities = [];
    this._visitorRAF      = null;
    document.addEventListener('mousemove', e => this._onDragMove(e));
    document.addEventListener('mouseup',   e => this._onDragEnd(e));
    document.addEventListener('touchmove', e => { if (this._dragState) { e.preventDefault(); this._onDragMove(e.touches[0]); } }, { passive: false });
    document.addEventListener('touchend',  e => { if (this._dragState) this._onDragEnd(e.changedTouches[0]); });

    this._syncCollectionUI();
  }

  // ── Inventory open/close ──────────────────────────────────────────────────────

  _toggleInventory() {
    const d = document.getElementById('pano-inventory-drawer');
    if (d?.classList.contains('open')) this._closeInventory();
    else this._openInventory();
  }
  _openInventory()  { document.getElementById('pano-inventory-drawer')?.classList.add('open'); }
  _closeInventory() { document.getElementById('pano-inventory-drawer')?.classList.remove('open'); }

  // ── Income tick handler: update UI + spawn currency arcs ────────────────────

  _onIncomeTick({ goldEarned = 0, researchEarned = 0 } = {}) {
    // Lightweight tick: update displayed numbers only — no DOM grid rebuilds.
    // Full _syncCollectionUI() is reserved for state-mutating events (drops,
    // sales, merges, crucible completions) so the grid isn't trashed every second.
    if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
    this._syncStatsBar();
    if (this._el('pano-view-lab')?.classList.contains('active')) {
      const rateEl = document.getElementById('lab-research-rate');
      if (rateEl) {
        const rpm = window.GlobalGameStats?.researchPerMin
          ?? ArtifactRegistry.calculateResearchRPM(this._collection.labState.slots);
        rateEl.textContent = rpm > 0 ? `+${rpm}` : '0';
      }
      const resEl = document.getElementById('lab-research-val');
      if (resEl) resEl.textContent = Math.floor(this._collection.labState.research);
      this._syncCrucibleUI();
    }
    if (this._el('pano-view-market')?.classList.contains('active')) this._syncMarketUI();

    // ── State-change checks ───────────────────────────────────────────────────
    const completedSales = this._collection.checkCompletedSales();
    if (completedSales.length) {
      for (const { payout, artifact } of completedSales) {
        const def = ArtifactRegistry.getById(artifact.typeId);
        this._showToast(`✦ Sold ${def?.name || artifact.typeId} for ${payout} gold`);
      }
      // State changed — full sync now
      if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
      this._syncCollectionUI();
    }
    const discovery = this._collection.checkCrucibleComplete();
    if (discovery) {
      if (typeof OnboardingManager !== 'undefined') {
        OnboardingManager.trigger('seenCrucible', {
          title: discovery.name,
          icon: '⊗',
          lore: discovery.loreText,
          rules: [
            `Applies to: <strong>${discovery.appliesTo}</strong> artifacts`,
            `Effect: <strong>${discovery.effect?.type}</strong> +${discovery.effect?.value}`,
            'This discovery is <strong>permanent</strong> and applies retroactively.',
          ],
        });
      }
      if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
      this._syncCollectionUI();
    }

    // ── Gold arcs ─────────────────────────────────────────────────────────────
    // Accumulate fractions; only spawn when a whole unit is ready.
    this._goldArcAccum = (this._goldArcAccum ?? 0) + goldEarned;
    if (this._goldArcAccum >= 1 && this._el('pano-view-hub')?.classList.contains('active')) {
      this._goldArcAccum -= 1;
      this._spawnGoldArc();
    }

    // ── Research arcs ─────────────────────────────────────────────────────────
    this._researchArcAccum = (this._researchArcAccum ?? 0) + researchEarned;
    if (this._researchArcAccum >= 1 && this._el('pano-view-lab')?.classList.contains('active')) {
      const units = Math.floor(this._researchArcAccum);
      this._researchArcAccum -= units;
      this._spawnResearchArcs(Math.max(1, units));
    }
  }

  _spawnGoldArc() {
    const targetEl = document.getElementById('pano-gold-val');
    const crowd    = document.getElementById('crowd-foreground');
    if (!targetEl || !crowd) return;

    const visitors = Array.from(crowd.children).filter(v => {
      const r = v.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!visitors.length) return;

    // Pick randomly but never the same index twice in a row
    let idx;
    if (visitors.length === 1) {
      idx = 0;
    } else {
      do { idx = Math.floor(Math.random() * visitors.length); }
      while (idx === (this._lastVisitorIdx ?? -1));
    }
    this._lastVisitorIdx = idx;

    const r = visitors[idx].getBoundingClientRect();
    this._arcManager.spawnGold(r.left + r.width / 2, r.top, targetEl);
  }

  _spawnResearchArcs(size = 1) {
    const targetEl = document.getElementById('lab-research-val');
    const slots    = this._collection.labState.slots;
    const labEls   = this._labSlotEls || [];
    if (!targetEl) return;

    // Collect occupied slots with valid screen positions
    const occupied = labEls
      .map((el, i) => ({ el, i }))
      .filter(({ el, i }) => {
        if (!slots[i]) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0;
      });
    if (!occupied.length) return;

    // Pick randomly, never the same slot twice in a row
    let pick;
    if (occupied.length === 1) {
      pick = occupied[0];
    } else {
      do { pick = occupied[Math.floor(Math.random() * occupied.length)]; }
      while (pick.i === (this._lastResearchSlotIdx ?? -1));
    }
    this._lastResearchSlotIdx = pick.i;

    const r = pick.el.getBoundingClientRect();
    this._arcManager.spawnResearch(r.left + r.width / 2, r.top + r.height / 2, targetEl, size);
  }

  // ── Sync UI from collection state ─────────────────────────────────────────────

  _syncCollectionUI() {
    if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
    this._syncPedestals();
    this._syncInventoryGrid();
    this._syncStatsBar();
    this._syncLabUI();
    const stats    = window.GlobalGameStats;
    const visitors = stats ? stats.visitors : (() => {
      const unlockedByTypeId  = this._collection.getUnlockedByTypeId();
      const unlockedKnowledge = this._collection.labState.unlockedKnowledge || {};
      const gpm = ArtifactRegistry.calculatePassiveGPM(this._collection.state.pedestals, unlockedByTypeId, unlockedKnowledge);
      return ArtifactRegistry.calculateVisitorCount(gpm);
    })();
    this._updateVisitors(visitors);
    this._checkFirstVisitor(visitors);
    this._checkHighExhibitGPM();
    this._buildInsightUI();
  }

  /**
   * Fires the "A Pattern Emerges" notification the first time any exhibited artifact
   * has an exhibitGPM > 2.0 (indicating meaningful crowd appeal variation).
   */
  _checkHighExhibitGPM() {
    if (localStorage.getItem('hexmaze_appeal_noticed')) return;
    if (typeof ArtifactRegistry === 'undefined') return;
    const pedestals = this._collection.state.pedestals;
    const triggered = pedestals.some(s => {
      if (!s) return false;
      return ArtifactRegistry.getExhibitGPM(s.typeId) > 2.0;
    });
    if (!triggered) return;
    localStorage.setItem('hexmaze_appeal_noticed', '1');
    const el = document.getElementById('exhibit-appeal-notification');
    if (!el) return;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 9000);
  }

  /**
   * Rebuilds Audience Research UI in two locations:
   *  - Hub (#hub-insight-area): Tier 1 only — always available, no Lab needed.
   *  - Lab (#lab-insight-area): Tier 2+ only — becomes available when player has
   *    Tier 2+ artifacts and the Lab is purchased.
   * Both are hidden until the "hexmaze_appeal_noticed" flag is set.
   */
  _buildInsightUI() {
    const noticed = !!localStorage.getItem('hexmaze_appeal_noticed');
    const maxTier = this._collection.getMaxCollectionTier();
    const gold    = Math.floor(this._collection.state.panoptikumGold);

    // ── Hub card: Tier 1 (Grimy) only ────────────────────────────────────────
    const hubArea = document.getElementById('hub-insight-area');
    if (hubArea) {
      if (!noticed) {
        hubArea.style.display = 'none';
      } else {
        hubArea.style.display = '';
        hubArea.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'hub-insight-header';
        header.textContent = '⚑ Audience Research';
        hubArea.appendChild(header);
        hubArea.appendChild(this._makeInsightCard(1, gold));
      }
    }

    // ── Lab section: Tier 2 and above ────────────────────────────────────────
    const labSection = document.getElementById('lab-insight-section');
    const labArea    = document.getElementById('lab-insight-area');
    if (labSection && labArea) {
      if (!noticed || maxTier < 2) {
        labSection.style.display = 'none';
      } else {
        labSection.style.display = '';
        labArea.innerHTML = '';
        for (let tier = 2; tier <= maxTier; tier++) {
          labArea.appendChild(this._makeInsightCard(tier, gold));
        }
      }
    }

    // Wire purchase buttons. Cards are rebuilt from scratch above so there are
    // no stale listeners — attach directly without clone-and-replace.
    for (const btn of document.querySelectorAll('[data-insight-tier]')) {
      const tier = Number(btn.dataset.insightTier);
      btn.disabled = gold < this._collection.audienceInsightCost(tier);
      btn.addEventListener('click', () => {
        const ok = this._collection.purchaseAudienceInsight(tier);
        if (ok) {
          const tierName = (typeof TIER_NAMES !== 'undefined' ? TIER_NAMES[tier] : '') || `T${tier}`;
          this._showToast(`✦ Survey commissioned — ${tierName} appeal now quantified`);
          this._syncCollectionUI(); // triggers _buildInsightUI → cards rebuild immediately
        } else {
          this._showToast('✕ Insufficient gold');
        }
      });
    }
  }

  /** Builds a single insight card DOM element for the given tier. */
  _makeInsightCard(tier, currentGold) {
    const purchased = this._collection.hasAudienceInsight(tier);
    const cost      = this._collection.audienceInsightCost(tier);
    const tierName  = (typeof TIER_NAMES !== 'undefined' ? TIER_NAMES[tier] : '') || `T${tier}`;
    const card = document.createElement('div');
    card.className = `market-upgrade-card${purchased ? ' purchased' : ''}`;
    card.innerHTML = purchased
      ? `<div class="market-upgrade-name">Valuation Survey — ${tierName}</div>
         <div class="market-upgrade-effect">Exhibition appeal visible in artifact dossiers</div>
         <div style="font-size:0.62rem;color:#00ff88;">✓ Conducted</div>`
      : `<div class="market-upgrade-name">Valuation Survey — ${tierName}</div>
         <div class="market-upgrade-effect">Reveals exhibition appeal of all ${tierName} artifacts</div>
         <div class="market-upgrade-cost">Cost: ${cost} gold</div>
         <button class="btn-market-upgrade" data-insight-tier="${tier}">Commission</button>`;
    return card;
  }

  _syncPedestals() {
    const pedestals = this._collection.state.pedestals;
    (this._pedestalEls || []).forEach((el, i) => {
      const slot = pedestals[i];
      el.innerHTML = '';
      // Remove old drag listener by cloning the element shell
      const fresh = el.cloneNode(false);
      el.replaceWith(fresh);
      this._pedestalEls[i] = fresh;
      this._bindPedestalEvents(fresh, i);

      if (slot) {
        const def = ArtifactRegistry.getById(slot.typeId);
        fresh.classList.add('occupied');
        const img = document.createElement('img');
        img.className = 'pano-pedestal-img';
        img.src = def?.spriteFull || def?.sprite || '';
        img.alt = def?.name || '';
        img.draggable = false;
        fresh.appendChild(img);
        const badge = document.createElement('div');
        badge.className = 'pano-pedestal-badge';
        badge.textContent = `T${slot.tier} ${TIER_NAMES[slot.tier] || ''}`;
        fresh.appendChild(badge);
        fresh.title = `${ArtifactRegistry.getDisplayName(slot)} — drag to move · right-click to remove`;
        // Block browser-native image/element drag so our custom drag takes over
        fresh.addEventListener('dragstart', e => e.preventDefault());
        // Drag FROM pedestal
        fresh.addEventListener('mousedown', e => {
          if (e.button !== 0) return;
          e.preventDefault();
          this._pendingClick = { instanceId: slot.instanceId, x: e.clientX, y: e.clientY, cardEl: fresh, sourceType: 'pedestal', sourceIndex: i };
        });
        fresh.addEventListener('touchstart', e => {
          e.preventDefault();
          const t = e.touches[0];
          this._pendingClick = { instanceId: slot.instanceId, x: t.clientX, y: t.clientY, cardEl: fresh, sourceType: 'pedestal', sourceIndex: i };
        }, { passive: false });
      } else {
        fresh.classList.remove('occupied');
        fresh.innerHTML = `<span class="pano-pedestal-empty-icon">⬡</span>`;
        fresh.title = 'Drop an artifact here to exhibit it';
      }
    });
  }

  _syncInventoryGrid(extraGridId) {
    this._renderInventoryInto(document.getElementById('pano-inv-grid'), 'pano-inv-empty');
    this._renderInventoryInto(document.getElementById('lab-inv-grid'),  'lab-inv-empty');
    this._renderInventoryInto(document.getElementById('equip-inv-grid'), 'equip-inv-empty');
    if (extraGridId) this._renderInventoryInto(document.getElementById(extraGridId), `${extraGridId}-empty`);
  }

  _renderInventoryInto(grid, emptyId) {
    if (!grid) return;
    const items = this._collection.state.inventory;
    if (items.length === 0) {
      grid.innerHTML = `<div id="${emptyId}">No artifacts in Cabinet yet.</div>`;
      return;
    }
    grid.innerHTML = '';
    for (const item of items) {
      const def = ArtifactRegistry.getById(item.typeId);
      if (!def) continue;
      const card = document.createElement('div');
      card.className      = 'artifact-card';
      card.dataset.instId = item.instanceId;
      card.title          = ArtifactRegistry.getDisplayName(item);
      card.innerHTML = `
        <div class="artifact-card-img-wrap">
          <img class="artifact-card-img" src="${def.spriteFull || def.sprite}" alt="${escapeHtml(def.name)}">
        </div>
        <div class="artifact-card-tier">T${item.tier}</div>
        <div class="artifact-card-name">${escapeHtml(TIER_NAMES[item.tier])} ${escapeHtml(def.name)}</div>
      `;
      card.addEventListener('dragstart',   e => e.preventDefault());
      card.addEventListener('mousedown',  e => { e.preventDefault(); this._pendingClick = { instanceId: item.instanceId, x: e.clientX, y: e.clientY, cardEl: card, sourceType: 'inventory' }; });
      card.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; this._pendingClick = { instanceId: item.instanceId, x: t.clientX, y: t.clientY, cardEl: card, sourceType: 'inventory' }; }, { passive: false });
      grid.appendChild(card);
    }
  }

  _syncStatsBar() {
    const stats = window.GlobalGameStats;
    let gpm, visitors, gold;
    if (stats) {
      gpm      = stats.gpm;
      visitors = stats.visitors;
      gold     = Math.floor(stats.panoptikumGold);
    } else {
      const pedestals         = this._collection.state.pedestals;
      const unlockedByTypeId  = this._collection.getUnlockedByTypeId();
      const unlockedKnowledge = this._collection.labState.unlockedKnowledge || {};
      gpm      = ArtifactRegistry.calculatePassiveGPM(pedestals, unlockedByTypeId, unlockedKnowledge);
      visitors = ArtifactRegistry.calculateVisitorCount(gpm);
      gold     = Math.floor(this._collection.state.panoptikumGold);
    }
    const gpmEl      = document.getElementById('pano-gpm-val');
    const visitorsEl = document.getElementById('pano-visitors-val');
    const goldEl     = document.getElementById('pano-gold-val');
    if (gpmEl)      gpmEl.textContent      = gpm.toFixed(1);
    if (visitorsEl) visitorsEl.textContent = visitors;
    if (goldEl)     goldEl.textContent     = gold.toLocaleString();
    this._syncGpmTooltip(stats?.gpmBreakdown);
  }

  _syncGpmTooltip(breakdown) {
    let wrap = document.getElementById('pano-gpm-tooltip-wrap');
    if (!wrap) {
      const gpmEl = document.getElementById('pano-gpm-val');
      if (!gpmEl) return;
      wrap = document.createElement('span');
      wrap.id = 'pano-gpm-tooltip-wrap';
      wrap.className = 'gpm-tooltip-wrap';
      gpmEl.parentNode.replaceChild(wrap, gpmEl);
      wrap.appendChild(gpmEl);
      const tip = document.createElement('div');
      tip.id = 'pano-gpm-tooltip';
      tip.className = 'gpm-tooltip';
      wrap.appendChild(tip);
      wrap.addEventListener('mouseenter', () => { document.getElementById('pano-gpm-tooltip')?.classList.add('visible'); });
      wrap.addEventListener('mouseleave', () => { document.getElementById('pano-gpm-tooltip')?.classList.remove('visible'); });
    }
    const tip = document.getElementById('pano-gpm-tooltip');
    if (!tip || !breakdown) return;
    const total = breakdown.reduce((s, r) => s + r.value, 0);
    tip.innerHTML = `<div class="gpm-tooltip-total">Total: ${total.toFixed(1)} gold/min</div>` +
      (breakdown.length === 0 ? '<div style="color:#334455;font-size:0.64rem;">No artifacts on pedestals</div>' :
        breakdown.map(r => `<div class="gpm-tooltip-row"><span class="gpm-t-label">${r.label}</span><span class="gpm-t-val">${r.value.toFixed(1)}</span></div>`).join(''));
  }

  // ── Pedestal event binding ────────────────────────────────────────────────────

  _bindPedestalEvents(el, index) {
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      this._collection.unexhibit(index);
      this._syncCollectionUI();
    });
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────────

  _startDrag(e, instanceId, cardEl, sourceType = 'inventory', sourceIndex = -1) {
    // Locate item in any location (inventory, pedestal, lab)
    let item = this._collection.getItem(instanceId);
    if (!item) {
      for (const s of this._collection.state.pedestals)  { if (s?.instanceId === instanceId) { item = s; break; } }
    }
    if (!item) {
      for (const s of this._collection.labState.slots)   { if (s?.instanceId === instanceId) { item = s; break; } }
    }
    const def   = ArtifactRegistry.getById(item?.typeId);
    const ghost = document.getElementById('artifact-drag-ghost');
    ghost.innerHTML = '';
    const ghostImg = document.createElement('img');
    ghostImg.src = def?.spriteFull || def?.sprite || '';
    ghost.appendChild(ghostImg);
    ghost.style.display  = 'flex';
    ghost.style.left     = `${e.clientX}px`;
    ghost.style.top      = `${e.clientY}px`;
    if (cardEl?.classList) cardEl.classList.add('dragging');
    this._dragState = { instanceId, cardEl, sourceType, sourceIndex };
  }

  _onDragMove(e) {
    // Convert pending click to drag after 5px movement
    if (this._pendingClick && !this._dragState) {
      const dx = e.clientX - this._pendingClick.x;
      const dy = e.clientY - this._pendingClick.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        const { instanceId, cardEl, sourceType, sourceIndex } = this._pendingClick;
        this._pendingClick = null;
        this._startDrag(e, instanceId, cardEl, sourceType, sourceIndex);
      }
      return;
    }
    if (!this._dragState) return;
    const ghost = document.getElementById('artifact-drag-ghost');
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top  = `${e.clientY}px`;
    // Highlight drop zones under cursor
    const draggedTypeId = this._dragState ? this._collection._resolveTypeId(this._dragState.instanceId) : null;
    const draggedEquipSlot = draggedTypeId ? ArtifactRegistry.getById(draggedTypeId)?.equipSlot : null;
    const allDropZones = [
      ...(this._pedestalEls || []),
      ...(this._labSlotEls  || []),
      ...Object.values(this._equipSlotEls || {}),
    ];
    allDropZones.forEach(el => {
      const r = el.getBoundingClientRect();
      const over = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top  && e.clientY <= r.bottom;
      // Only highlight equip slots if the dragged item fits
      if (el.dataset.slotType) {
        el.classList.toggle('drag-over', over && el.dataset.slotType === draggedEquipSlot);
      } else {
        el.classList.toggle('drag-over', over);
      }
    });
  }

  _onDragEnd(e) {
    // If no drag was started (short click), open dossier
    if (this._pendingClick && !this._dragState) {
      const id = this._pendingClick.instanceId;
      this._pendingClick = null;
      this._openDossier(id);
      return;
    }
    this._pendingClick = null;
    if (!this._dragState) return;

    const { instanceId, cardEl, sourceType, sourceIndex } = this._dragState;
    this._dragState = null;
    document.getElementById('artifact-drag-ghost').style.display = 'none';
    if (cardEl && typeof cardEl.classList !== 'undefined') cardEl.classList.remove('dragging');
    const allDropZones = [
      ...(this._pedestalEls || []),
      ...(this._labSlotEls  || []),
      ...Object.values(this._equipSlotEls || {}),
    ];
    allDropZones.forEach(el => el.classList.remove('drag-over'));

    // Check if dropped on a pedestal
    let droppedOnPedestal = -1;
    (this._pedestalEls || []).forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top  && e.clientY <= r.bottom) {
        droppedOnPedestal = i;
      }
    });

    if (droppedOnPedestal >= 0) {
      this._collection.exhibit(instanceId, droppedOnPedestal);
      if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
      this._syncCollectionUI();
      const mergeCandidate = this._collection.detectMerge();
      if (mergeCandidate) this._showMergeConfirm(mergeCandidate);
      return;
    }

    // Check if dropped on a lab slot
    let droppedOnLab = -1;
    (this._labSlotEls || []).forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top  && e.clientY <= r.bottom) {
        droppedOnLab = i;
      }
    });

    if (droppedOnLab >= 0) {
      this._collection.placeInLab(instanceId, droppedOnLab);
      if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
      this._syncCollectionUI();
      this._syncLabUI();
      const mergeCandidate = this._collection.detectMerge();
      if (mergeCandidate) this._showMergeConfirm(mergeCandidate);
      return;
    }

    // Check if dropped on crucible slot
    const crucibleEl = document.getElementById('crucible-slot');
    if (crucibleEl) {
      const r = crucibleEl.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top  && e.clientY <= r.bottom) {
        const ok = this._collection.startCrucible(instanceId);
        if (ok) {
          if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
          this._syncCollectionUI();
          this._syncLabUI();
        } else {
          this._showToast('✕ Crucible already in use or artifact not found');
        }
        return;
      }
    }

    // Check if dropped on an equipment slot
    let droppedOnEquip = null;
    for (const [slotType, el] of Object.entries(this._equipSlotEls || {})) {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top  && e.clientY <= r.bottom) {
        droppedOnEquip = slotType;
      }
    }
    if (droppedOnEquip) {
      const ok = this._collection.equipArtifact(instanceId, droppedOnEquip);
      if (ok) { this._syncEquipUI(); this._syncCollectionUI(); }
      return;
    }

    // Dropped on empty space → return source item to inventory
    if (sourceType === 'pedestal' && sourceIndex >= 0) {
      this._collection.unexhibit(sourceIndex);
      this._syncCollectionUI();
    } else if (sourceType === 'lab' && sourceIndex >= 0) {
      this._collection.removeFromLab(sourceIndex);
      this._syncCollectionUI();
      this._syncLabUI();
    } else if (sourceType === 'equip') {
      this._collection.unequipSlot(sourceIndex);
      this._syncEquipUI();
      this._syncCollectionUI();
    }
    // sourceType === 'inventory' → item stays in inventory, nothing to do
  }

  // ── Artifact toast notification ───────────────────────────────────────────────

  _showArtifactToast(instance) {
    const def  = ArtifactRegistry.getById(instance.typeId);
    const toast = document.getElementById('artifact-toast');
    if (!toast || !def) return;
    document.getElementById('artifact-toast-img').src         = def.spriteFull || def.sprite || '';
    document.getElementById('artifact-toast-name').textContent = def.name;
    document.getElementById('artifact-toast-tier').textContent = `${TIER_NAMES[instance.tier]} (Tier ${instance.tier})`;
    toast.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('visible'), 4200);
  }

  // ── Merge flash ───────────────────────────────────────────────────────────────

  _showMergeFlash(newTier, typeId) {
    const def = ArtifactRegistry.getById(typeId);
    const el  = document.getElementById('merge-flash');
    if (!el) return;
    el.textContent = `✦ MERGED → ${TIER_NAMES[newTier]} ${def?.name ?? 'Artifact'} ✦`;
    el.classList.add('visible');
    clearTimeout(this._mergeFlashTimer);
    this._mergeFlashTimer = setTimeout(() => el.classList.remove('visible'), 2500);
  }

  // ── Laboratory nav + purchase ─────────────────────────────────────────────────

  _onLabNavClick() {
    if (this._collection.labState.purchased) {
      this._fadeTransition(() => this.showLab());
    } else {
      // Show purchase modal with current gold
      const gold = Math.floor(this._collection.state.panoptikumGold);
      const display = this._el('lab-purchase-gold-display');
      if (display) display.textContent = `Your Pano-Gold: ${gold.toLocaleString()} ⬡`;
      const confirmBtn = document.getElementById('btn-lab-confirm');
      if (confirmBtn) confirmBtn.disabled = gold < 600;
      this._el('lab-purchase-overlay')?.classList.add('visible');
    }
  }

  _updateLabNavButton() {
    const btn = document.getElementById('btn-nav-laboratory');
    if (!btn) return;
    if (this._collection.labState.purchased) {
      btn.classList.remove('lab-locked');
    } else {
      btn.classList.add('lab-locked');
    }
  }

  showLab() {
    this._exp.hide();
    this._hub().style.display = 'flex';
    this._el('pano-transition').style.display = 'none';
    this._el('pano-views').style.display      = '';
    this._el('pano-view-hub').style.display   = 'none';
    this._el('pano-view-hub').classList.remove('active');
    this._el('pano-view-equip')?.classList.remove('active');
    this._el('pano-view-market')?.classList.remove('active');
    this._el('pano-view-lab').classList.add('active');
    this._showGlobalUI();
    this._setNavActive('laboratory');
    this._stopVisitorAnimation();
    this._syncLabUI();
    if (typeof OnboardingManager !== 'undefined') {
      const prevSeen = OnboardingManager.isSeen('seenLaboratory');
      OnboardingManager.trigger('seenLaboratory', {
        title: 'The Laboratory',
        icon:  '⚗',
        lore:  'The research chambers now open before you. This is where the secrets of recovered artifacts can be methodically extracted.',
        rules: [
          'Drag artifacts into the <strong>research slots</strong> — they accumulate Research Points (RP) over time.',
          'Spend RP in the knowledge tree to unlock hidden properties and arcane data about artifact types.',
          'Unlocked discoveries raise <strong>exhibition appeal</strong>, increasing passive Panoptikum income.',
        ],
      });
      const inv = this._collection?.state?.inventory;
      if (prevSeen && inv?.length > 0) {
        OnboardingManager.trigger('seenLabWithArtifact', {
          title: 'First Specimen Ready',
          icon:  '⚗',
          lore:  'You have returned with something worth studying. The research stations await — slot your finds and let the analysis begin.',
          rules: [
            'Each artifact in a research slot generates RP continuously.',
            '<strong>Higher-tier artifacts</strong> yield RP faster and unlock deeper discoveries.',
            'Removing an artifact from its slot does not erase accumulated RP — progress is retained.',
          ],
        });
      }
    }
  }

  showEquip() {
    this._exp.hide();
    this._hub().style.display = 'flex';
    this._el('pano-transition').style.display   = 'none';
    this._el('pano-views').style.display        = '';
    this._el('pano-view-hub').style.display     = 'none';
    this._el('pano-view-hub').classList.remove('active');
    this._el('pano-view-lab').classList.remove('active');
    this._el('pano-view-market')?.classList.remove('active');
    this._el('pano-view-equip').classList.add('active');
    this._showGlobalUI();
    this._setNavActive('equipment');
    this._stopVisitorAnimation();
    this._buildEquipSlots();
    this._syncEquipUI();
    if (typeof OnboardingManager !== 'undefined') {
      const prevSeen = OnboardingManager.isSeen('seenEquipment');
      OnboardingManager.trigger('seenEquipment', {
        title: "The Antiquarian's Loadout",
        icon:  '⚔',
        lore:  'Every descent into the labyrinth is a calculated risk. The relics you carry can mean the difference between escape and ruin.',
        rules: [
          'Drag items into equipment slots <strong>before starting</strong> an expedition.',
          'Each equipped item grants a passive or active effect during the maze run.',
          'Items cannot be swapped mid-expedition — choose carefully before you enter.',
        ],
      });
      const inv = this._collection?.state?.inventory;
      if (prevSeen && inv?.length > 0) {
        OnboardingManager.trigger('seenEquipWithArtifact', {
          title: 'Something to Carry',
          icon:  '⚔',
          lore:  'Among your recovered relics, some may prove useful in the field. Equip them here before your next descent.',
          rules: [
            'Drag a recovered item into an equipment slot to equip it.',
            'Check the item <strong>dossier</strong> for its exact effect — some bonuses only activate under specific conditions.',
            'Cursed items carry side effects. Read carefully before equipping.',
          ],
        });
      }
    }
  }

  showMarket() {
    this._exp.hide();
    this._hub().style.display = 'flex';
    this._el('pano-transition').style.display = 'none';
    this._el('pano-views').style.display      = '';
    this._el('pano-view-hub').style.display   = 'none';
    this._el('pano-view-hub').classList.remove('active');
    this._el('pano-view-lab').classList.remove('active');
    this._el('pano-view-equip')?.classList.remove('active');
    this._el('pano-view-market').classList.add('active');
    this._showGlobalUI();
    this._setNavActive('market');
    this._stopVisitorAnimation();
    this._buildMarketSlots();
    this._syncMarketUI();
    if (typeof OnboardingManager !== 'undefined') {
      const prevSeen = OnboardingManager.isSeen('seenMarket');
      OnboardingManager.trigger('seenMarket', {
        title: 'The Antiquities Exchange',
        icon:  '✦',
        lore:  "Word travels fast among the city's collectors. A booth in the Bourgeois Arcade awaits — but the right buyer takes time to find.",
        rules: [
          '<strong>List artifacts</strong> by dragging them into a Market slot.',
          'Sales complete on a <strong>timer</strong> — check back to collect your gold.',
          '<strong>Upgrades</strong> in the right column speed up sales or increase payouts.',
          "Cursed artifacts cannot be listed without the Smuggler's Backdoor.",
        ],
      });
      const inv = this._collection?.state?.inventory;
      if (prevSeen && inv?.length > 0) {
        OnboardingManager.trigger('seenMarketWithArtifact', {
          title: 'Buyers Are Waiting',
          icon:  '✦',
          lore:  'Word has reached the collectors. Drag a recovered artifact into a Market slot — the right buyer will surface, eventually.',
          rules: [
            'Sales complete on a timer. Check back to <strong>collect your gold</strong>.',
            'Upgrades in the right column can speed up sales or <strong>increase the payout</strong>.',
            'Cursed items require the <strong>Smuggler\'s Backdoor</strong> upgrade before they can be listed.',
          ],
        });
      }
    }
  }

  _buildEquipSlots() {
    const overlay = document.getElementById('equip-slot-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    this._equipSlotEls = {};
    for (const slotType of PanoptikumCollection.EQUIP_SLOT_TYPES) {
      const el = document.createElement('div');
      el.className = 'equip-photo-slot';
      el.dataset.slotType = slotType;
      overlay.appendChild(el);
      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._collection.unequipSlot(slotType);
        this._syncEquipUI();
        this._syncCollectionUI();
      });
      this._equipSlotEls[slotType] = el;
    }
    if (!this._equipResizeObserver) {
      const container = document.getElementById('pano-view-equip');
      if (container) {
        this._equipResizeObserver = new ResizeObserver(() => this._positionEquipSlots());
        this._equipResizeObserver.observe(container);
      }
    }
    this._positionEquipSlots();
  }

  _positionEquipSlots() {
    const container = document.getElementById('pano-view-equip');
    if (!container || !this._equipSlotEls) return;
    const cW = container.offsetWidth;
    const cH = container.offsetHeight;
    if (!cW || !cH) return;
    // Background image: 2816×1536, background-size: cover, background-position: left top
    const IMG_W = 2816, IMG_H = 1536;
    const scale = Math.max(cW / IMG_W, cH / IMG_H);
    const dW = IMG_W * scale;
    const dH = IMG_H * scale;
    // Copper slot column x=484..770, dividers at y=216,395,575,756,936,1116,1296
    const SLOTS = [
      { type: 'head',  x: 484, y: 216,  w: 286, h: 179 },
      { type: 'eyes',  x: 484, y: 395,  w: 286, h: 180 },
      { type: 'face',  x: 484, y: 575,  w: 286, h: 181 },
      { type: 'hands', x: 484, y: 756,  w: 286, h: 180 },
      { type: 'tool',  x: 484, y: 936,  w: 286, h: 180 },
      { type: 'pouch', x: 484, y: 1116, w: 286, h: 180 },
      { type: 'boots', x: 484, y: 1296, w: 286, h: 180 },
    ];
    for (const s of SLOTS) {
      const el = this._equipSlotEls[s.type];
      if (!el) continue;
      el.style.left   = (s.x / IMG_W * dW).toFixed(1) + 'px';
      el.style.top    = (s.y / IMG_H * dH).toFixed(1) + 'px';
      el.style.width  = (s.w / IMG_W * dW).toFixed(1) + 'px';
      el.style.height = (s.h / IMG_H * dH).toFixed(1) + 'px';
    }
  }

  _syncEquipUI() {
    if (!this._equipSlotEls) return;
    const equipped = this._collection.getEquippedItems();

    // Refresh equip slot elements — clone to clear stale listeners (same pattern as _syncLabUI)
    for (const slotType of PanoptikumCollection.EQUIP_SLOT_TYPES) {
      const el = this._equipSlotEls[slotType];
      if (!el) continue;

      const fresh = el.cloneNode(false); // no children — we rebuild completely
      el.replaceWith(fresh);
      this._equipSlotEls[slotType] = fresh;
      fresh.dataset.slotType = slotType;

      // Always re-attach contextmenu (right-click to unequip)
      fresh.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._collection.unequipSlot(slotType);
        this._syncEquipUI();
        this._syncCollectionUI();
      });

      const info  = (typeof EQUIP_SLOTS !== 'undefined' && EQUIP_SLOTS[slotType]) || { label: slotType, icon: '▪', desc: slotType };
      const labelEl = document.createElement('div');
      labelEl.className   = 'equip-slot-label';
      labelEl.textContent = `${info.icon} ${info.label}`;
      fresh.appendChild(labelEl);

      const inner = document.createElement('div');
      inner.className = 'equip-slot-inner';
      fresh.appendChild(inner);

      const slot = equipped[slotType];
      if (slot) {
        fresh.classList.add('occupied');
        const def = ArtifactRegistry.getById(slot.typeId);
        const img = document.createElement('img');
        img.src       = def?.sprite || '';
        img.alt       = def?.name  || '';
        img.className = 'equip-slot-img';
        img.draggable = false;
        img.addEventListener('dragstart', e => e.preventDefault());
        inner.appendChild(img);
        const nameEl = document.createElement('div');
        nameEl.className   = 'equip-slot-name';
        nameEl.textContent = `${TIER_NAMES[slot.tier] || ''} ${def?.name || slot.typeId}`;
        inner.appendChild(nameEl);
        // Drag from equip slot back to inventory
        fresh.addEventListener('mousedown', ev => {
          if (ev.button !== 0) return;
          ev.preventDefault();
          this._pendingClick = { instanceId: slot.instanceId, x: ev.clientX, y: ev.clientY, cardEl: fresh, sourceType: 'equip', sourceIndex: slotType };
        });
        fresh.title = `${ArtifactRegistry.getDisplayName(slot)} — drag to move · right-click to unequip`;
      } else {
        fresh.classList.remove('occupied');
        inner.innerHTML = `<span class="equip-slot-empty">${info.desc || slotType}</span>`;
        fresh.title = `Drop a ${info.label} artifact here`;
      }
    }

    // Populate Cabinet grid — show ALL inventory items that have an equipSlot
    const grid = document.getElementById('equip-inv-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const items = this._collection.state.inventory.filter(item => {
      const def = ArtifactRegistry.getById(item.typeId);
      return def?.equipSlot != null;
    });
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className   = 'lab-inv-empty';
      empty.textContent = 'No equippable artifacts in Cabinet.';
      grid.appendChild(empty);
      return;
    }
    for (const item of items) {
      const def      = ArtifactRegistry.getById(item.typeId);
      const slotInfo = (typeof EQUIP_SLOTS !== 'undefined' && EQUIP_SLOTS[def.equipSlot]) || { icon: '', label: def.equipSlot };
      const card = document.createElement('div');
      card.className = 'inv-card';
      card.draggable = false;
      card.addEventListener('dragstart', e => e.preventDefault());

      const img = document.createElement('img');
      img.src = def?.sprite || '';
      img.alt = def?.name  || '';
      img.draggable = false;
      img.addEventListener('dragstart', e => e.preventDefault());

      const label = document.createElement('span');
      label.className   = 'inv-card-label';
      label.textContent = `${TIER_NAMES[item.tier] || ''} ${def?.name || item.typeId}`;

      const slotTag = document.createElement('span');
      slotTag.className   = 'inv-card-slot-tag';
      slotTag.textContent = `${slotInfo.icon} ${slotInfo.label}`;

      card.appendChild(img);
      card.appendChild(label);
      card.appendChild(slotTag);
      card.addEventListener('mousedown', ev => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        this._pendingClick = { instanceId: item.instanceId, x: ev.clientX, y: ev.clientY, cardEl: card, sourceType: 'inventory' };
      });
      grid.appendChild(card);
    }
  }

  // ── Lab slots DOM ─────────────────────────────────────────────────────────────

  _buildLabSlots() {
    const area = document.getElementById('lab-slots-area');
    if (!area) return;
    area.innerHTML = '';
    this._labSlotEls = [];
    for (let i = 0; i < PanoptikumCollection.LAB_SLOT_COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'lab-slot';
      el.dataset.labSlotIndex = i;
      el.innerHTML = `<span class="lab-slot-empty-icon">⚗</span>`;
      area.appendChild(el);
      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._collection.removeFromLab(i);
        this._syncCollectionUI();
        this._syncLabUI();
      });
      this._labSlotEls.push(el);
    }
  }

  _addLabSlotDragStart(el, slotIndex, instanceId) {
    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      this._pendingClick = { instanceId, x: e.clientX, y: e.clientY, cardEl: el, sourceType: 'lab', sourceIndex: slotIndex };
    });
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      this._pendingClick = { instanceId, x: t.clientX, y: t.clientY, cardEl: el, sourceType: 'lab', sourceIndex: slotIndex };
    }, { passive: false });
  }

  _syncLabUI() {
    // Update lab button state
    this._updateLabNavButton();

    const resEl  = document.getElementById('lab-research-val');
    if (resEl) resEl.textContent = Math.floor(this._collection.labState.research).toLocaleString();
    const rateEl = document.getElementById('lab-research-rate');
    if (rateEl) {
      const rpm = window.GlobalGameStats?.researchPerMin
        ?? ArtifactRegistry.calculateResearchRPM(this._collection.labState.slots);
      rateEl.textContent = rpm > 0 ? `+${rpm}` : '0';
    }
    this._syncCrucibleUI();

    const slots = this._collection.labState.slots;
    (this._labSlotEls || []).forEach((el, i) => {
      const slot = slots[i];
      // Clone to clear old event listeners
      const fresh = el.cloneNode(false);
      el.replaceWith(fresh);
      this._labSlotEls[i] = fresh;
      fresh.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._collection.removeFromLab(i);
        this._syncCollectionUI();
        this._syncLabUI();
      });

      fresh.innerHTML = '';
      if (slot) {
        const def = ArtifactRegistry.getById(slot.typeId);
        fresh.classList.add('occupied');
        const img = document.createElement('img');
        img.className = 'lab-slot-img';
        img.src = def?.sprite || '';
        img.alt = def?.name || '';
        fresh.appendChild(img);
        const nameEl = document.createElement('div');
        nameEl.className = 'lab-slot-name';
        nameEl.textContent = def?.name || slot.typeId;
        fresh.appendChild(nameEl);
        const rateEl = document.createElement('div');
        rateEl.className = 'lab-slot-research-rate';
        rateEl.textContent = `+${slot.tier} ⬡/min`;
        fresh.appendChild(rateEl);
        fresh.title = `${ArtifactRegistry.getDisplayName(slot)} — drag to move · right-click to remove`;
        this._addLabSlotDragStart(fresh, i, slot.instanceId);
        // Click to open dossier (if no drag)
        fresh.addEventListener('click', () => this._openDossier(slot.instanceId));
      } else {
        fresh.classList.remove('occupied');
        fresh.innerHTML = `<span class="lab-slot-empty-icon">⚗</span>`;
        fresh.title = 'Drag an artifact here to research it';
      }
    });
  }

  // ── Visitor animation ─────────────────────────────────────────────────────────

  static VISITOR_SPRITES = [
    'bald_scholar', 'burly_sailor', 'crazy_alchemist', 'dreadlocked_traveler',
    'elegant_updo', 'ghostly_visitor', 'high_priest', 'hooded_figure',
    'little_girl', 'nobleman', 'old_woman', 'resting_knight',
    'street_urchin', 'tall_top_hat', 'young_boy',
  ];

  _startVisitorAnimation() {
    if (this._visitorRAF) return;
    this._visitorLastTime = performance.now();
    const loop = (now) => {
      const dt = Math.min(now - this._visitorLastTime, 50);
      this._visitorLastTime = now;
      this._tickVisitors(dt);
      this._visitorRAF = requestAnimationFrame(loop);
    };
    this._visitorRAF = requestAnimationFrame(loop);
  }

  _stopVisitorAnimation() {
    if (this._visitorRAF) { cancelAnimationFrame(this._visitorRAF); this._visitorRAF = null; }
  }

  _tickVisitors(dt) {
    const container = document.getElementById('crowd-foreground');
    if (!container) return;
    const w = container.clientWidth || window.innerWidth;
    const now = Date.now();

    for (const v of (this._visitorEntities || [])) {
      const margin = 30; // px from edges
      const maxPx = w - margin * 2;

      if (v.pauseEnd > now) {
        // Bob in place while paused
        v.bobPhase += dt * 0.003;
        v.el.style.transform = `translateY(${Math.sin(v.bobPhase) * 1.5}px)`;
        continue;
      }

      const dx = v.targetPx - v.xPx;
      const dist = Math.abs(dx);
      if (dist < 2) {
        v.xPx = v.targetPx;
        v.pauseEnd = now + 800 + Math.random() * 2500;
        v.targetPx = margin + Math.random() * maxPx;
      } else {
        const step = v.speedPxMs * dt;
        v.xPx += dx > 0 ? Math.min(step, dist) : -Math.min(step, dist);
        v.bobPhase += dt * 0.007;
        const bob    = Math.sin(v.bobPhase) * 3;
        const flip   = dx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
        v.el.style.transform = `translateY(${bob}px) ${flip}`;
      }
      v.el.style.left = `${v.xPx}px`;
    }
  }

  _updateVisitors(count) {
    if (!this._visitorEntities) this._visitorEntities = [];
    const container = document.getElementById('crowd-foreground');
    if (!container) return;

    // Remove excess
    while (this._visitorEntities.length > count) {
      const v = this._visitorEntities.pop();
      v.el.remove();
    }

    // Add new
    const w = container.clientWidth || window.innerWidth;
    const sprites = PanoptikumHub.VISITOR_SPRITES;
    while (this._visitorEntities.length < count) {
      const idx    = this._visitorEntities.length % sprites.length;
      const el     = document.createElement('img');
      el.className = 'crowd-visitor';
      el.src       = `ASSETS/VISITORS/${sprites[idx]}_full.png`;
      el.alt       = '';
      container.appendChild(el);
      const margin  = 30;
      const startPx = margin + Math.random() * Math.max(1, w - margin * 2);
      this._visitorEntities.push({
        el,
        xPx:       startPx,
        targetPx:  margin + Math.random() * Math.max(1, w - margin * 2),
        speedPxMs: 0.025 + Math.random() * 0.020,
        pauseEnd:  Date.now() + Math.random() * 1500,
        bobPhase:  Math.random() * Math.PI * 2,
      });
      el.style.left = `${startPx}px`;
    }
  }

  _checkFirstVisitor(visitors) {
    if (visitors < 1) return;
    if (localStorage.getItem('hexmaze_first_visitor_seen')) return;
    localStorage.setItem('hexmaze_first_visitor_seen', '1');
    const el = document.getElementById('visitor-notification');
    if (!el) return;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 7000);
  }

  // ── Crucible UI ───────────────────────────────────────────────────────────────

  _syncCrucibleUI() {
    const slot   = this._el('crucible-slot');
    const status = this._el('lab-crucible-status');
    const btnCancel  = this._el('btn-crucible-cancel');
    const btnCollect = this._el('btn-crucible-collect');
    if (!slot) return;
    const { artifact, startedAt, totalDuration } = this._collection.labState.crucible;
    slot.innerHTML = artifact
      ? (() => {
          const def = ArtifactRegistry.getById(artifact.typeId);
          return `<img src="${def?.sprite || ''}" alt="${def?.name || ''}">`;
        })()
      : '<span class="crucible-slot-icon">⊗</span>';
    slot.classList.toggle('occupied', !!artifact);
    if (!artifact) {
      if (status) status.textContent = '';
      if (btnCancel)  btnCancel.style.display  = 'none';
      if (btnCollect) btnCollect.style.display = 'none';
      return;
    }
    const elapsed  = Date.now() - startedAt;
    const pct      = Math.min(1, elapsed / totalDuration);
    const done     = pct >= 1;
    const remaining = done ? 0 : Math.ceil((totalDuration - elapsed) / 1000);
    const def = ArtifactRegistry.getById(artifact.typeId);
    if (status) {
      status.textContent = done
        ? `Analysis complete — ${def?.name || artifact.typeId} ready to collect`
        : `Analyzing ${def?.name || artifact.typeId}… ${Math.floor(remaining / 60)}m ${remaining % 60}s remaining`;
    }
    if (btnCancel)  btnCancel.style.display  = done ? 'none'  : '';
    if (btnCollect) btnCollect.style.display = done ? ''      : 'none';
    if (!this._crucibleBtnsWired) {
      this._crucibleBtnsWired = true;
      btnCancel?.addEventListener('click', () => {
        this._collection.cancelCrucible();
        StatsManager?.recalculateAll?.();
        this._syncCollectionUI();
      });
      btnCollect?.addEventListener('click', () => {
        const discovery = this._collection.checkCrucibleComplete();
        if (discovery) {
          this._showToast(`✦ Discovery: ${discovery.name}`);
          if (typeof OnboardingManager !== 'undefined')
            OnboardingManager.trigger('seenCrucible', {
              title: discovery.name,
              icon: '⊗',
              lore: discovery.loreText,
              rules: [
                `Applies to: <strong>${discovery.appliesTo}</strong> artifacts`,
                `Effect: <strong>${discovery.effect.type}</strong> +${discovery.effect.value}`,
                'This discovery is <strong>permanent</strong> — it applies retroactively to your entire collection.',
              ],
            });
        }
        if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
        this._syncCollectionUI();
      });
    }
  }

  // ── Market UI ─────────────────────────────────────────────────────────────────

  _buildMarketSlots() {
    const area = document.getElementById('market-slots-area');
    if (!area) return;
    area.innerHTML = '';
    const slots = this._collection.marketState.slots;
    slots.forEach((_, i) => {
      const el = document.createElement('div');
      el.className    = 'market-slot';
      el.dataset.slotIndex = i;
      area.appendChild(el);
      el.addEventListener('dragover',  e => { e.preventDefault(); el.classList.add('drag-over'); });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('drag-over');
        if (!this._dragState) return;
        const { instanceId } = this._dragState;
        this._collection.listForSale(instanceId, i);
        this._endDrag();
        if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
        this._syncCollectionUI();
        this._syncMarketUI();
      });
    });
    this._buildMarketUpgrades();
  }

  _buildMarketUpgrades() {
    const area = document.getElementById('market-upgrades-area');
    if (!area) return;
    area.innerHTML = '';
    for (const def of PanoptikumCollection.MARKET_UPGRADES) {
      const card = document.createElement('div');
      card.className = `market-upgrade-card${this._collection.marketState.upgrades[def.id] ? ' purchased' : ''}`;
      card.innerHTML = `
        <div class="market-upgrade-name">${escapeHtml(def.name)}</div>
        <div class="market-upgrade-effect">${escapeHtml(def.effect)}</div>
        <div class="market-upgrade-cost">Cost: ${def.cost} gold</div>
        ${this._collection.marketState.upgrades[def.id]
          ? '<div style="font-size:0.62rem;color:#00ff88;">✓ Purchased</div>'
          : `<button class="btn-market-upgrade" data-upgrade-id="${def.id}">Purchase</button>`}
      `;
      area.appendChild(card);
    }
    area.querySelectorAll('.btn-market-upgrade').forEach(btn => {
      btn.addEventListener('click', () => {
        const upgradeId = btn.dataset.upgradeId;
        const ok = this._collection.purchaseMarketUpgrade(upgradeId);
        if (ok) {
          const def = PanoptikumCollection.MARKET_UPGRADES.find(u => u.id === upgradeId);
          this._showToast(`✦ ${def?.name ?? 'Upgrade'} — purchased`);
          if (typeof StatsManager !== 'undefined') StatsManager.recalculateAll();
          this._syncCollectionUI();
          this._syncMarketUI();
          this._buildMarketUpgrades(); // rebuild cards so the purchased state shows immediately
        } else {
          this._showToast('✕ Insufficient gold');
        }
      });
    });
  }

  _syncMarketUI() {
    const slots = this._collection.marketState.slots;
    const area  = document.getElementById('market-slots-area');
    if (!area) return;
    const slotEls = area.querySelectorAll('.market-slot');
    const now     = Date.now();
    slotEls.forEach((el, i) => {
      const slot = slots[i];
      el.classList.toggle('occupied', !!slot);
      if (!slot) {
        el.innerHTML = '<div class="market-slot-empty">Drop artifact to list</div>';
        return;
      }
      const def       = ArtifactRegistry.getById(slot.artifact.typeId);
      const elapsed   = now - slot.listedAt;
      const pct       = Math.min(1, elapsed / slot.totalSaleTime);
      const remaining = Math.ceil((slot.totalSaleTime - elapsed) / 1000);
      const payout    = this._collection.getMarketPayout(slot.artifact);
      el.innerHTML = `
        <div class="market-slot-name">${def?.name || slot.artifact.typeId} T${slot.artifact.tier}</div>
        <div class="market-slot-payout">Payout: ~${payout} gold</div>
        <div class="market-slot-timer">${pct >= 1 ? '✦ Ready!' : `${Math.floor(remaining / 60)}m ${remaining % 60}s`}</div>
        <div class="market-timer-track"><div class="market-timer-bar" style="width:${(pct * 100).toFixed(1)}%"></div></div>
        <button class="market-slot-cancel" data-slot="${i}">✕</button>
      `;
    });
    area.querySelectorAll('.market-slot-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        this._collection.cancelSale(parseInt(btn.dataset.slot, 10));
        this._syncMarketUI();
        this._syncCollectionUI();
      });
    });
    // Sync inventory grid into market column
    this._syncInventoryGrid('market-inv-grid');
  }

  // ── Merge confirm flow ─────────────────────────────────────────────────────────

  _showMergeConfirm(candidate) {
    this._pendingMergeCandidate = candidate;
    const def = ArtifactRegistry.getById(candidate.typeId);
    const name = def?.name || candidate.typeId;
    const stats = window.GlobalGameStats;
    const goldOk    = (stats?.panoptikumGold ?? this._collection.state.panoptikumGold) >= candidate.cost.gold;
    const resOk     = (stats?.labResearch    ?? this._collection.labState.research)     >= candidate.cost.research;
    const bodyEl = document.getElementById('merge-confirm-body');
    bodyEl.innerHTML = '';
    const s1 = document.createElement('strong');
    s1.textContent = `three ${name} (T${candidate.tier})`;
    const s2 = document.createElement('strong');
    s2.textContent = `T${candidate.tier + 1}`;
    bodyEl.append('You have ', s1, ' specimens.', document.createElement('br'),
                  'They can be fused into a single ', s2, '.');
    document.getElementById('merge-cost-gold').textContent     = `${candidate.cost.gold} gold`;
    document.getElementById('merge-cost-gold').classList.toggle('insufficient', !goldOk);
    document.getElementById('merge-cost-research').textContent = `${candidate.cost.research} research`;
    document.getElementById('merge-cost-research').classList.toggle('insufficient', !resOk);
    const execBtn = document.getElementById('btn-merge-execute');
    if (execBtn) execBtn.disabled = !goldOk || !resOk;
    document.getElementById('merge-confirm-overlay').classList.add('visible');
    if (typeof OnboardingManager !== 'undefined') {
      OnboardingManager.trigger('seenTierMerge', {
        title: 'Tier Fusion',
        icon: '⬡',
        lore: 'Three specimens of the same kind, when combined through alchemical resonance, produce a single artifact of greater potency. The process is irreversible — and expensive.',
        rules: [
          'Drag an artifact onto an occupied pedestal or lab slot to trigger merge detection.',
          '<strong>Costs Gold + Research</strong> — see the dialog for exact amounts.',
          'The resulting artifact is <strong>one tier higher</strong>.',
          'Merging is always optional: dismiss the dialog to keep all three.',
        ],
      });
    }
  }

  // ── Artifact dossier ──────────────────────────────────────────────────────────

  _openDossier(instanceId) {
    // Look in both inventory and pedestals and lab slots
    let item = this._collection.getItem(instanceId);
    if (!item) {
      for (const s of this._collection.state.pedestals) {
        if (s?.instanceId === instanceId) { item = s; break; }
      }
    }
    if (!item) {
      for (const s of this._collection.labState.slots) {
        if (s?.instanceId === instanceId) { item = s; break; }
      }
    }
    if (!item) return;

    const def  = ArtifactRegistry.getById(item.typeId);
    if (!def) return;

    const unlockedByTypeId = this._collection.getUnlockedByTypeId();
    const unlocked = unlockedByTypeId[item.typeId] || [];
    const research = Math.floor(this._collection.labState.research);

    // Populate dossier
    this._el('dossier-full-img').src = def.spriteFull || def.sprite || '';
    this._el('dossier-tier-badge').textContent =
      `${TIER_NAMES[item.tier] || ''} — Tier ${item.tier}`;
    this._el('dossier-name').textContent = def.name;

    // Lore
    const loreEl = this._el('dossier-lore');
    if (unlocked.includes('lore') || !def.description) {
      loreEl.textContent = def.description || '—';
      loreEl.classList.remove('locked');
    } else {
      loreEl.textContent = def.description; // show it blurred via CSS
      loreEl.classList.add('locked');
    }

    // Metadata
    const meta = def.metadata || {};
    const META_FIELDS = [
      ['material',       'Material',        false],
      ['type',           'Type',            false],
      ['size',           'Size',            false],
      ['weight',         'Weight (kg)',      false],
      ['origin',         'Origin',          'origin'],
      ['arcaneResonance','Arcane Resonance', 'arcaneResonance'],
    ];
    const metaEl = this._el('dossier-meta');
    metaEl.innerHTML = '';
    for (const [key, label, lockField] of META_FIELDS) {
      const isLocked = lockField && !unlocked.includes(lockField);
      const keyEl = document.createElement('div');
      keyEl.className   = 'dossier-meta-key';
      keyEl.textContent = label;
      const valEl = document.createElement('div');
      valEl.className   = `dossier-meta-val${isLocked ? ' locked' : ''}`;
      valEl.textContent = isLocked ? '???' : (meta[key] ?? '—');
      metaEl.appendChild(keyEl);
      metaEl.appendChild(valEl);
    }

    // Exhibition appeal — always active, revealed by Audience Insight upgrade
    if (typeof ArtifactRegistry !== 'undefined' && localStorage.getItem('hexmaze_appeal_noticed')) {
      const hasInsight  = this._collection.hasAudienceInsight(item.tier);
      const exhibitGPM  = ArtifactRegistry.getExhibitGPM(item.typeId);
      const appealKey   = document.createElement('div');
      appealKey.className   = 'dossier-meta-key';
      appealKey.textContent = 'Exhibition Appeal';
      const appealVal   = document.createElement('div');
      appealVal.className   = `dossier-meta-val${hasInsight ? '' : ' locked'}`;
      appealVal.textContent = hasInsight ? `${exhibitGPM.toFixed(1)} Gold/min` : '???';
      metaEl.appendChild(appealKey);
      metaEl.appendChild(appealVal);
    }

    // Traits — hidden until 'traits' field is researched
    const traitsEl = this._el('dossier-traits');
    const traitsSectionEl = this._el('dossier-traits-section');
    traitsEl.innerHTML = '';
    if (unlocked.includes('traits') && (def.traits || []).length > 0) {
      for (const trait of def.traits) {
        const d = document.createElement('div');
        d.className = `dossier-trait ${trait.type}`;
        const desc = typeof trait.description === 'function'
          ? trait.description(item.tier) : (trait.description || '');
        const nameEl = document.createElement('div');
        nameEl.className = 'dossier-trait-name';
        nameEl.textContent = trait.name;
        const descEl = document.createElement('div');
        descEl.textContent = desc;
        d.appendChild(nameEl);
        d.appendChild(descEl);
        traitsEl.appendChild(d);
      }
      if (traitsSectionEl) traitsSectionEl.style.display = '';
    } else if ((def.traits || []).length > 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'dossier-trait';
      placeholder.style.cssText = 'color:#2a3a4a; font-style:italic;';
      placeholder.textContent = 'Properties unknown — conduct research in the Laboratory to reveal.';
      traitsEl.appendChild(placeholder);
      if (traitsSectionEl) traitsSectionEl.style.display = '';
    } else {
      if (traitsSectionEl) traitsSectionEl.style.display = 'none';
    }

    // Unlock buttons
    const unlockRow = this._el('dossier-unlock-row');
    unlockRow.innerHTML = '';
    const UNLOCK_LABELS = {
      lore:           `Unlock Lore (${PanoptikumCollection.UNLOCK_COSTS.lore} ⬡)`,
      traits:         `Reveal Properties (${PanoptikumCollection.UNLOCK_COSTS.traits} ⬡)`,
      origin:         `Unlock Origin (${PanoptikumCollection.UNLOCK_COSTS.origin} ⬡)`,
      arcaneResonance:`Unlock Arcane Resonance (${PanoptikumCollection.UNLOCK_COSTS.arcaneResonance} ⬡)`,
    };
    for (const [field, label] of Object.entries(UNLOCK_LABELS)) {
      if (unlocked.includes(field)) continue;
      const btn = document.createElement('button');
      btn.className   = 'dossier-unlock-btn';
      btn.textContent = label;
      btn.disabled    = research < PanoptikumCollection.UNLOCK_COSTS[field];
      btn.addEventListener('click', () => {
        if (this._collection.unlockField(instanceId, field)) {
          this._openDossier(instanceId);
        }
      });
      unlockRow.appendChild(btn);
    }

    this._el('artifact-dossier').classList.add('visible');
    this._currentDossierInstanceId = instanceId;
  }

  _closeDossier() {
    this._el('artifact-dossier')?.classList.remove('visible');
    this._currentDossierInstanceId = null;
  }

  // ── Override showHub / enterPlayMode for visitor management ──────────────────

  _startHubVisitors() {
    const visitors = window.GlobalGameStats
      ? window.GlobalGameStats.visitors
      : ArtifactRegistry.calculateVisitorCount(
          ArtifactRegistry.calculatePassiveGPM(
            this._collection.state.pedestals,
            this._collection.getUnlockedByTypeId(),
            this._collection.labState.unlockedKnowledge || {},
          )
        );
    this._updateVisitors(visitors);
    this._checkFirstVisitor(visitors);
    this._startVisitorAnimation();
  }

  // ── Text toast ────────────────────────────────────────────────────────────────

  _showToast(msg) {
    const el = document.getElementById('pano-text-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('visible');
    void el.offsetWidth; // force reflow so the CSS transition restarts
    el.classList.add('visible');
    clearTimeout(this._textToastTimer);
    this._textToastTimer = setTimeout(() => el.classList.remove('visible'), 3000);
  }
}
