Please implement the next phase of the incremental game loop and UI for the Hex Maze project. Review the current state and apply the following features:

1. Passive Income & Logarithmic Visitor System
- Ensure passive gold income is calculated continuously in the background, not in "chunks".
- Implement a visual Visitor System in the Panopticon that scales logarithmically based on the current passive gold per minute (e.g., 1 visitor at 1 Gold/min, 2 visitors at 10 Gold/min, 3 at 100 Gold/min, etc.).
- Use the visitor sprites located in `ASSETS/VISITORS/` (specifically use the `_full` versions). These images depict people from behind.
- Animation Logic: Spawn visitors at the bottom edge of the screen. Animate them wandering left and right, occasionally pausing as if inspecting the exhibits. While moving, apply a subtle up-and-down bobbing motion to simulate walking.
- Layout Constraints: Visitors must strictly remain in the foreground at the bottom edge. They must never overlap or obscure the exhibition pedestals and artifacts.
- Event Trigger: When the player hits 1 Gold/min and the very first visitor appears, trigger a one-time UI notification. The text should explain that an exhibit has drawn significant attention, causing the public to pay for admission to the Panopticon, which generates a continuous passive income while attractive artifacts are on display.

2. Artifact Dossier (Info Card UI)
- Create a detailed UI overlay/dossier for inspecting individual artifacts, which is opened when an artifact is clicked on (not click-and-drag - which is needed for the drag-and-drop mentioned below).
- The dossier must prominently display the high-resolution version of the artifact sprite (files with the `_full` suffix).
- Present the artifact's metadata (Lore, Material, Size, Weight, Type, etc.) in a structured layout.
- Hidden Information Mechanics: If certain lore or metadata has not been unlocked yet, display clear placeholders (e.g., "???", blurred text, or a "Requires Research" tag) so the player recognizes that more information exists to be discovered.

3. The Laboratory & Knowledge Currency
- Introduce a new interactive scene: The Laboratory.
- Implement a secondary currency named "Research" (or "Knowledge"), which is generated exclusively in the Laboratory.
- Research Mechanic: To unlock the hidden information on an artifact's dossier, the player must conduct research. This requires moving the artifact OUT of the Exhibition and placing it into the Laboratory. 
- Enable drag-and-drop (or an intuitive context menu) to move artifacts seamlessly between the Cabinet (Inventory), Exhibition (Pedestals), and the Laboratory.

4. Navigation UI & Unlocking the Lab
- Update the main UI navigation bar to include a button for the Laboratory, placed next to the Panopticon/Cabinet button.
- Lock State: The Laboratory is locked by default. The button should initially be grayed out but interactive.
- Purchase Flow: Clicking the grayed-out button should prompt the player to purchase the Laboratory for a one-time cost of 600 Gold. Once purchased, deduct the gold, fully activate the button, and grant access to the Lab scene.