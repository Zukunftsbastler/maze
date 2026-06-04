Please implement the "Panoptikum" (Meta-Progression Hub) and a global persistent UI for the game using Vanilla JS, HTML, and CSS.

We have two new background assets for the Hub:
1. `ASSETS/PANOPTIKUM/ruined.jpg`
2. `ASSETS/PANOPTIKUM/restored.jpg`

Please build the following architecture:

### 1. Global UI Overlay (Persistent)
Create a persistent UI layer that stays on top of the Hub and the Expedition Maps (View A / View B).
- **Left Panel:** A clean, stylish overlay displaying the current `Total Score`. Include an empty placeholder container for "Future Statistics".
- **Right Panel:** A Navigation menu with buttons to freely switch between views: "Panoptikum", "Macro Map (View A)", and "Micro Map (View B)". 

### 2. The Tutorial Transition (Story Beat)
- Create a specific UI state triggered after the tutorial run is completed.
- Display a full-screen view of `ASSETS/PANOPTICUM/Panopticum_dirty.png`.
- Overlay a `.lore-text` box (styled like a journal entry) with the text: *"I have finally reached the legendary Panoptikum. It is covered in cobwebs, moss, and centuries of decay. If I can clean this place up, it will serve as the perfect sanctuary and exhibition hall for my discoveries."*
- Include an action button: "Restore & Claim Sanctuary". Clicking this transitions the player to the Restored Hub.

### 3. The Restored Hub (Main Menu)
- The "Panoptikum" view uses `ASSETS/PANOPTICUM/Panopticum.png` as a full-cover background.
- **Future-proofing structure (CRITICAL):** Inside the Hub container, establish a strict z-index hierarchy for future dynamic elements. Create these empty containers:
  - `z-index: 1`: The background image (`ASSETS/PANOPTICUM/Panopticum.png`).
  - `z-index: 10`: An `#artifact-layer` (an empty div with `position: relative` where we will later absolute-position collected artifacts onto the drawn pillars and bookshelves).
  - `z-index: 20`: A `#crowd-foreground` layer (an empty div anchored to the `bottom` of the screen, `overflow: hidden`, where animated audience sprites will eventually move horizontally).
  - `z-index: 30`: The Global UI Overlay (Left Stats, Right Nav).

### 4. View Switching Logic
- Update the JavaScript to handle seamlessly switching between the `#panoptikum-container`, `#view-a-container` (Macro Map), and `#view-b-container` (Micro Map) based on the Right Panel navigation buttons.
- Ensure the Global UI remains visible and functional regardless of which of the three views is currently active.
- Use smooth CSS fade transitions when switching between these main screens.