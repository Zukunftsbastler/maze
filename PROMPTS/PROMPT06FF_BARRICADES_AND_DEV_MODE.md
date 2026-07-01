Das ergibt absolut Sinn. Holzplanken und Schrott passen viel besser zu provisorischen, funktionalen Barrikaden, die man schnell aus der Umgebung zusammensucht, als wertvolle Ressourcen.

Für Depth 3 (die *Amber Warrens*) habe ich "Hardened Resin Chunks" (Ausgehärtete Harzbrocken) gewählt. Harz passt perfekt zum Bernstein-Thema, ist klobig, klebrig und eignet sich ideal als natürliches Hindernis, ohne wertvoll zu wirken. Für die feurigen Tiefen (Depth 4) bietet sich "Pumice Boulders" (Bimsstein) an – das ist vulkanisch, extrem leicht zu transportieren, aber durch die Größe eine perfekte Barriere.

Hier ist der angepasste Prompt auf Englisch, bereit für Claude Code:

```markdown
Please refactor the codebase for my game "Hex Maze" based on the following three main requirements. Ensure you adhere to the existing architecture (Vanilla JS, no build steps, ES2020).

### 1. "Dev Mode" Button (God Mode & Tutorial Skip)
Add a "Dev Mode" button to the UI (e.g., in `index.html` within the `#controls` area or header). When clicked, it must execute the following:
- Skip the tutorial by setting the respective `localStorage` flags (`hexmaze_tutorial_done`, `hexmaze_panoptikum_restored`).
- Populate the `PanoptikumCollection` with massive amounts of resources (e.g., 999,999 Gold and Research).
- Unlock all lore fields and knowledge upgrades in the lab (`unlockedFields`, `unlockedKnowledge`).
- Unlock all depths and expeditions in `expedition-maps.js` (add them to `availableIds` or `completedIds`).
- Start the game directly in the Panoptikum Hub (`panoptikum.showHub()`) to allow immediate testing with full access.

### 2. Separation of Gold and Barricade Material (In-Run Currency)
Currently, "Gold" is collected in the maze and spent on barricades. This needs to be decoupled:
- **Gold:** Continues to spawn in the maze as a meta-currency. It can be collected, but it is NO LONGER used to build barricades during a run. Collected gold is simply added to `panoptikumGold` at the end of the expedition. 
- **Barricade Material (Building Material):** This is the new in-run currency specifically required to build at construction spots.
- **Spawn Rates & Amounts:** Barricade materials should be scarce: Each pickup should only yield 1 or at most 2 units.
- **Biome/Depth Dependency:** The naming and visual representation of the barricade material must change depending on the current Depth (aligned with the lore). It should feel like cheap, bulky, and makeshift items rather than valuable treasures:
  - *Depth 1 (Outer Vaults):* "Wooden Planks" 
  - *Depth 2 (Brackish Halls):* "Scrap Metal" 
  - *Depth 3 (Amber Warrens):* "Hardened Resin Chunks" 
  - *Depth 4 (Smoldering Deep):* "Pumice Boulders" 
  - *Depth 5 (Null Core):* "Dense Bedrock Fragments" 
- **Placeholders:** Create simple SVG/Canvas placeholders for these materials in the rendering logic (`hex-renderer.js` / `game-loop.js`) and the icon system (`ICON_SVG`) (e.g., simple brown rectangles for planks, grey jagged shapes for scrap). Leave comments in the code describing how the final sprites should roughly look.
- **HUD Update:** Adjust the `hud-currency` so that it clearly displays the available Barricade Material instead of Gold during a run.

### 3. Convert Score to Experience Points (XP)
The current "Score" has no real function yet. Rename the score conceptually and visually to "XP" (Experience Points) throughout the UI and logic.
- Change the labels in the post-run overlays and the HUD from "Total Score" / "Run Score" to "Total XP" / "Run XP".
- Ensure the underlying calculation of points (formerly score) remains intact, but treat it conceptually as the Antiquarian's experience points. (We will implement a deeper functional connection, like a skill tree, in a future step, but prepare the variable naming like replacing `totalScore` with `totalXP` globally now).

```