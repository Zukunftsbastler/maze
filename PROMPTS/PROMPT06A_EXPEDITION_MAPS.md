Please implement an interactive, two-tier Expedition Selection System using Vanilla JS, HTML, SVG, and CSS. No external libraries.

We have two map assets:
1. Macro Map: `ASSETS/LEVEL_MAPS/Levels.png` (Overview of all 5 depths)
2. Micro Map: `ASSETS/LEVEL_MAPS/Level01.png` (Detailed map for Level 1)

Implement the following architecture:

### 1. View A: Macro Overview (Levels.png)
- Embed `Levels.png` inside an `<svg>` container.
- Use SVG paths/polygons to slice the image into 5 horizontal selectable regions (Depth 1 to 5).
- **Visual States via CSS filters/masks:**
  - Locked (Depths 2-5): Completely black.
  - Available (Depth 1): Grayscale (Black & White).
  - Completed: Full original color.
- **Interaction & Info Panel:** When hovering/focusing an available depth, display a "Lore Panel" containing only story and flavor text for that depth (no stats). Clicking Depth 1 transitions the UI to View B.

### 2. View B: Micro Level Detail (Level01.png)
- Embed `Level01.png` inside an `<svg>` container.
- Use SVG paths/polygons to define 3 to 4 distinct, irregular zones on this map. These represent specific "Expeditions" (Quests).
- **Visual States:** Same logic (Black for locked/unknown, Grayscale for available, Color for completed).
- **Interaction & Expedition Panel:** When hovering/focusing an available Expedition zone, display the "Expedition UI".
- **Expedition UI Requirements:** 
  - Display the Expedition Name.
  - Show a calculated `difficultyScore` (aggregated from parameters: `mapPreviewTime`, `timeUntilNemesis`, `goldAmount`, and `aggregateRadii`).
  - Display an `expectedArtifact` string (flavor hint for the loot).
  - Provide a "Start Expedition" button that initiates the cascade of maze runs.

### 3. Controls, Data & Accessibility
- **Data Structure:** Create a JS object/array holding the lore for the Macro Map, and the specific parameters (times, gold, radii, artifacts) for the Expeditions on the Micro Map.
- **Highlighting:** Apply a glowing stroke or brightness increase on hover/focus for any available or completed SVG region.
- **Accessibility:** All map areas (in both views) must be navigable via Mouse (click/hover), Touch (tap), and Keyboard (using `tabindex` and `Enter` to select). Ensure smooth UI transitions between the Macro and Micro views.


Please refine the Expedition Selection System, focusing deeply on View B (the Micro Map for `Level01.png`). 

Looking closely at `Level01.png`, the image naturally separates into 10 to 15 distinct isometric rooms/chambers (e.g., a room with spice barrels, a room with bookshelves, a collapsed pillar area, a green glowing sewer pit). 

Implement a data-driven SVG polygon mapping system for these 10-15 specific areas using Vanilla JS.

### 1. Data-Driven Architecture (Crucial)
Create a centralized JavaScript array of objects representing the ~12 Expedition Zones. Each object MUST contain:
- `id`: Unique identifier.
- `name`: A thematic name based on visual cues in the image (e.g., "Spice Merchant's Cellar", "The Green Drain", "Collapsed Archive", "Gargoyle's Overlook").
- `points`: A string of SVG polygon coordinates. **Note:** Since exact pixel mapping requires manual tracing, please provide a *best-effort isometric placeholder shape* for the points, but structure the code so I can easily swap these strings out with precise coordinates later.
- `status`: 'completed', 'available', or 'locked'. (Set 2-3 to completed, 2-3 to available, the rest locked).
- `difficultyScore`: A calculated integer based on internal parameters.
- `expectedArtifact`: A flavor string.

### 2. SVG Rendering Engine
- Dynamically render `<polygon>` elements inside the `<svg>` overlay over `Level01.png` by iterating through the JS array.
- Assign the `points` from the data object to the polygon.
- Apply CSS classes dynamically based on the `status` property.

### 3. Visual States & Masking
- **Locked:** The polygon area should be overlaid with a heavy, dark, semi-transparent mask (e.g., `rgba(0,0,0,0.8)`).
- **Available:** The polygon area should have a grayscale filter applied using CSS `backdrop-filter` or SVG filters.
- **Completed:** The polygon area shows the true color of the underlying image.
- **Hover/Focus:** When hovering over an 'available' or 'completed' polygon, smoothly transition an SVG stroke (e.g., glowing gold/cyan) around the precise shape of that room to indicate it is selectable.

### 4. Info Panel Interaction
- When clicking an 'available' room, update and show the Expedition UI panel with the specific data from the JS object (Name, Difficulty, Artifact, and a "Start" button).
- Ensure the map and polygons are responsive to window resizing.