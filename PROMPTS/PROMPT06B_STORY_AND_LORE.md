Please implement story and lore elements into the game loop and UI to increase immersion, without adding new intrusive text boxes. We will use the existing `#pre-run-overlay` and `#post-run-overlay` to deliver short flavor texts.

Implement the following requirements:

### 1. Visual Styling for Lore
- Add a new CSS class `.lore-text` to `index.html`.
- It must look distinctly like a story or journal entry, completely different from UI instructions. 
- Use a serif font (e.g., 'Georgia', 'Times New Roman', serif), italics, and a fitting color (like a dusty gold or faded parchment, e.g., `#d4c4a8` or `#b89972`). Add slight padding and maybe a subtle border (like a quote block) so players immediately recognize it as narrative flavor.

### 2. The Narrative Arc & Text Injection
Update `game-loop.js` (likely inside `_showPreRun()` and `_showPostRun()`) to inject specific `.lore-text` paragraphs based on the current level:

- **Level 1 (Pre-Run):** *Lore Text:* "The rumors speak of a legendary 'Panoptikum' hidden just beneath the upper crust. A quirky, marvelous museum, though long abandoned and stripped of its artifacts. If I can navigate these shifting ruins, it would make the perfect laboratory and sanctuary for my research."
- **Level 3 (Post-Run - Victory):**
  *Lore Text:* "I have found it! The Panoptikum is mine. The shelves are bare, and dust coats the display cases, but its eccentric charm is undeniable. From this safe haven, I shall launch expeditions deeper into the abyss. The city's true history is not written in books, but buried in these depths. For science and preservation, I must map what lies below."
- **Level 4 and beyond (Pre-Run - The Expeditions):**
  Create an array of short, randomized journal entries in `ProgressionManager`. Every time a run starts (Level >= 4), display one of these entries. They must combine two elements:
  1. A sense of urgency/paranoia ("I am being watched," "The air is heavy," "I must be quick").
  2. A vague hint at the Nemesis ("Something ancient guards these workshops," "I hear heavy shifting in the dark," "A territorial presence stalks the forgotten curiosities").
  *Example:* "The shadows here feel alive, and the feeling of being observed makes my skin crawl. Whatever guards this forgotten knowledge does not welcome visitors. I must work fast, grab the data, and run. For science."

### 3. Nemesis Collision Mechanic (Fail State)
- Ensure the collision logic in Phase C is strictly enforced.
- If the Nemesis catches the player (i.e., reaches the player's exact hex or the goal before the player finishes), the current lab/run is completely lost.
- This must trigger the "Level Failed" state (`_showPostRun(false)`), forcing the player to use the "Retry Level" button and re-attempt the depth with a newly generated maze seed.