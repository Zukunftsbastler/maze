# Sprint Task: UI/UX Overhaul - Onboarding, Economy Juice, and Flexible Building

Playtesting has revealed that the build mechanics in Phase B are not intuitive enough. We need to overhaul the visual feedback (Game Feel / Juice), explain mechanics using in-line icons, and improve the building input flow without using game-breaking tutorial popups.

Please implement the following changes across the codebase:

## 1. Dynamic Phase 2 Notification with In-Line Icons
Create a reusable, dynamic notification system for the HUD that explains Phase transitions using icons instead of just text.
* **The Message:** When Phase B starts, display a clear message: `"You can now spend [ICON_GOLD] on [ICON_SPOT] to build a [ICON_BLOCKADE]"`.
* **Implementation:** Build an HTML/CSS banner that parses a string and replaces placeholder tags (e.g., `<icon-gold>`) with small, inline SVG icons or `<img>` tags that exactly match the in-game assets. 
* **Scalability:** This system must be modular so we can easily swap in `<icon-iron>` or `<icon-turret>` in later levels.

## 2. Global Build Interaction (Pan & Build)
Building must be unlocked globally once the player reaches the goal, without requiring the player entity to walk back to the build spots.
* **Logic Fix:** Ensure `this._buildPhaseUnlocked = true` allows the `mousedown/touchstart` long-press logic to work on *any* valid build spot on the grid, regardless of the `player.worldX/Y` position. 
* **UX Requirement:** The player must be able to pan the camera across the map and long-press a distant spot to build.

## 3. Economy "Juice" (Visual Feedback)
We need to make resource collection and spending highly visible and satisfying.
* **Floating Text (Pickup):** When currency is collected, spawn a floating "+1" (in gold color) at the specific world coordinates of the cell. It should float upwards and fade out over 1 second. Create a `FloatingTextManager` to handle this in the render loop.
* **Arc Trajectory Animation (Pickup):** When currency is collected, animate a gold coin icon flying in a curved arc from the cell's world coordinates to the fixed screen coordinates of the HUD currency counter.
* **HUD Flash (Spend/Change):** When currency is spent (or gained via the arc animation), trigger a CSS keyframe animation on the HUD currency element. It should scale up briefly (e.g., `1.2x`), flash bright gold, and return to normal.
* **Error Wiggle (Negative Feedback):** If the player attempts to build without enough currency, trigger a CSS "shake" animation on the HUD currency element and flash it red to clearly indicate insufficient funds.

## 4. Contextual "Action Hints" (Non-Blocking Tutorials)
Instead of modal popups that pause the game, implement a one-time contextual hint system.
* **Trigger:** The very first time `_buildPhaseUnlocked` becomes true (e.g., in Level 4).
* **Action:** Find the `isBuildable` cell closest to the camera center. Render a bouncing, UI text element (or Canvas text) pointing at it that says: *"Tap and Hold to Build!"*. 
* **Dismissal:** This hint disappears permanently as soon as the player successfully opens the build menu for the first time.

## 5. Construction Impact (Game Feel)
* **Camera Shake:** When a blockade is successfully placed, apply a small, fast camera shake (offsetting `cameraX/Y` by 2-3 pixels randomly for ~150ms).
* **Dust Burst:** Add a simple transient particle effect (expanding circles or fading lines) at the cell coordinates when the blockade state is set.