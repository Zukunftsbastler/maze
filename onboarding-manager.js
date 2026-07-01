'use strict';

// ────────────────────────────────────────────────────────────────────────────────
// onboarding-manager.js — First-time discovery modals for new game mechanics.
//
// Call OnboardingManager.init() once on startup.
// Call OnboardingManager.trigger(key, config) to conditionally show a modal.
// Each key fires at most once (tracked in localStorage).
// ────────────────────────────────────────────────────────────────────────────────

const OnboardingManager = (() => {
  const STORAGE_KEY = 'hexmaze_onboarding';

  const DEFAULT_STATE = {
    seenMarket:          false,
    seenCrucible:        false,
    seenFirstCurse:      false,
    seenFactionConflict: false,
    seenTierMerge:       false,
  };

  let _state          = null;
  let _onResumeQueued = null;

  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      _state = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
    } catch (_) {
      _state = { ...DEFAULT_STATE };
    }
    _ensureModal();
  }

  // Trigger an onboarding modal if this key has not been seen before.
  // config: { title, icon, lore, rules: string[], onResume? }
  function trigger(key, config) {
    if (!_state || _state[key]) return;
    _state[key] = true;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); } catch (_) {}
    _showModal(config);
  }

  // Mark a key as already seen (e.g. programmatically, without showing the modal).
  function markSeen(key) {
    if (!_state) return;
    _state[key] = true;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); } catch (_) {}
  }

  function isSeen(key) {
    return !!_state?.[key];
  }

  // ── Private ────────────────────────────────────────────────────────────────────

  function _ensureModal() {
    if (document.getElementById('onboarding-overlay')) return;


    const el = document.createElement('div');
    el.id = 'onboarding-overlay';
    el.innerHTML = `
      <div id="onboarding-dialog">
        <div id="onboarding-tag">New Discovery</div>
        <div id="onboarding-icon"></div>
        <div id="onboarding-title"></div>
        <div id="onboarding-lore"></div>
        <ul id="onboarding-rules"></ul>
        <button id="btn-onboarding-resume">[ Resume Investigations ]</button>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector('#btn-onboarding-resume').addEventListener('click', () => {
      el.classList.remove('visible');
      const cb = _onResumeQueued;
      _onResumeQueued = null;
      if (cb) cb();
    });
  }

  function _showModal({ title = '', icon = '', lore = '', rules = [], onResume } = {}) {
    _ensureModal();
    const el = document.getElementById('onboarding-overlay');
    if (!el) return;
    el.querySelector('#onboarding-icon').textContent  = icon;
    el.querySelector('#onboarding-title').textContent = title;
    el.querySelector('#onboarding-lore').textContent  = lore;
    const rulesEl = el.querySelector('#onboarding-rules');
    rulesEl.innerHTML = '';
    for (const rule of rules) {
      const li = document.createElement('li');
      // Allow only <strong> tags (used for emphasis in hardcoded rule strings).
      li.innerHTML = String(rule).replace(/<(?!\/?(strong)\s*>)[^>]*>/gi, '');
      rulesEl.appendChild(li);
    }
    _onResumeQueued = onResume || null;
    el.classList.add('visible');
  }

  return { init, trigger, markSeen, isSeen };
})();

window.OnboardingManager = OnboardingManager;
