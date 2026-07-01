'use strict';
// ────────────────────────────────────────────────────────────────────────────────
// validate-artifacts.js — Artifact catalog integrity checker
//
// Usage (browser console, after game has loaded):
//   ArtifactValidator.run();
//
// Usage (Node.js CLI):
//   node validate-artifacts.js
//
// Referenced from MEMORY.md so it survives context resets.
// ────────────────────────────────────────────────────────────────────────────────

const ArtifactValidator = (() => {

  const VALID_EQUIP_SLOTS  = new Set(['head', 'eyes', 'face', 'hands', 'tool', 'pouch', 'boots', null]);
  const VALID_CATEGORIES   = new Set(['lore', 'arcaneResonance', 'physical', 'material']);
  const VALID_EFFECT_TYPES = new Set(['VISITOR_ATTRACTION', 'PEEK_TIME', 'SIGHT_RANGE', 'NEMESIS_SPEED', 'PASSIVE_INCOME_MULT']);
  const VALID_COND_TYPES   = new Set(['IS_EXHIBITED', 'IS_NOT_EXHIBITED', 'IS_EQUIPPED', 'IS_IN_RESEARCH',
                                       'PANOPTICON_FULL', 'MIN_VISITORS', 'MAX_VISITORS', 'HAS_EXHIBITED_TAG', 'MIN_TIER']);
  const VALID_FACTIONS     = new Set(['origin:blackwater', 'origin:custodian', 'origin:archive']);

  function validate(catalog) {
    const issues = [];
    let total = 0;

    for (const [id, def] of Object.entries(catalog)) {
      total++;

      // ── Top-level required fields ─────────────────────────────────────────────
      if (!def.name)                          issues.push(`${id}: missing 'name'`);
      if (!def.sprite)                        issues.push(`${id}: missing 'sprite'`);
      if (!def.description)                   issues.push(`${id}: missing 'description'`);
      if (typeof def.baseValue !== 'number')  issues.push(`${id}: missing or non-numeric 'baseValue'`);
      if (!Array.isArray(def.tags))           issues.push(`${id}: missing 'tags' array`);
      if (!('equipSlot' in def))              issues.push(`${id}: missing 'equipSlot' field`);
      else if (!VALID_EQUIP_SLOTS.has(def.equipSlot))
        issues.push(`${id}: invalid equipSlot '${def.equipSlot}'`);

      // ── Faction tag ──────────────────────────────────────────────────────────
      const factionTag = (def.tags || []).find(t => t.startsWith('origin:'));
      if (!factionTag)
        issues.push(`${id}: no faction tag (origin:blackwater / origin:custodian / origin:archive)`);
      else if (!VALID_FACTIONS.has(factionTag))
        issues.push(`${id}: unknown faction tag '${factionTag}'`);

      // ── Traits ───────────────────────────────────────────────────────────────
      if (!Array.isArray(def.traits)) {
        issues.push(`${id}: missing 'traits' array`);
      } else {
        def.traits.forEach((trait, ti) => {
          const tp = `${id}.traits[${ti}] (${trait.id ?? '?'})`;

          if (!trait.id)   issues.push(`${tp}: missing 'id'`);
          if (!trait.name) issues.push(`${tp}: missing 'name'`);
          if (!trait.type || !['positive', 'negative'].includes(trait.type))
            issues.push(`${tp}: invalid type '${trait.type}' (must be positive/negative)`);
          if (!trait.category)
            issues.push(`${tp}: missing 'category'`);
          else if (!VALID_CATEGORIES.has(trait.category))
            issues.push(`${tp}: invalid category '${trait.category}' (valid: ${[...VALID_CATEGORIES].join(', ')})`);
          if (typeof trait.description !== 'function')
            issues.push(`${tp}: 'description' must be a function (tier) => string`);

          if (!Array.isArray(trait.effects) || trait.effects.length === 0) {
            issues.push(`${tp}: missing or empty 'effects' array`);
          } else {
            trait.effects.forEach((eff, ei) => {
              if (!VALID_EFFECT_TYPES.has(eff.type))
                issues.push(`${tp}.effects[${ei}]: unknown type '${eff.type}'`);
              if (eff.value === undefined)
                issues.push(`${tp}.effects[${ei}]: missing 'value'`);
            });
          }

          (trait.conditions || []).forEach((cond, ci) => {
            if (!VALID_COND_TYPES.has(cond.type))
              issues.push(`${tp}.conditions[${ci}]: unknown type '${cond.type}'`);
          });
        });
      }
    }

    return { total, issues };
  }

  function run() {
    const catalog = (typeof ARTIFACT_CATALOG !== 'undefined') ? ARTIFACT_CATALOG : null;
    if (!catalog) {
      console.error('[ArtifactValidator] ARTIFACT_CATALOG not found. Load artifact-registry.js first.');
      return;
    }
    const { total, issues } = validate(catalog);
    if (issues.length === 0) {
      console.log(`[ArtifactValidator] ✓ All ${total} artifacts valid.`);
    } else {
      console.warn(`[ArtifactValidator] ✗ ${issues.length} issue(s) across ${total} artifacts:`);
      issues.forEach(i => console.warn('  ' + i));
    }
    return { total, issues };
  }

  return { run, validate };

})();

// ── Node.js CLI runner ────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs');
  const src = fs.readFileSync(__dirname + '/artifact-registry.js', 'utf8');
  const match = src.match(/const ARTIFACT_CATALOG = \{([\s\S]*?)^};/m);
  if (!match) { console.error('Could not extract ARTIFACT_CATALOG'); process.exit(1); }
  let ARTIFACT_CATALOG;
  eval('ARTIFACT_CATALOG = {' + match[1] + '}');
  const { total, issues } = ArtifactValidator.validate(ARTIFACT_CATALOG);
  console.log(`Checked ${total} artifacts.`);
  if (issues.length === 0) {
    console.log('✓ No issues found.');
  } else {
    console.log(`✗ ${issues.length} issue(s):`);
    issues.forEach(i => console.log('  ' + i));
    process.exit(1);
  }
}
