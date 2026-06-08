Please refactor the labyrinth/maze rendering logic in the game to replace the current "neon and black" abstract aesthetic with a procedural "Antique Cartographer's Map" style using purely CSS and Vanilla JS for the environment, while integrating image assets for the entities.

Please implement the following visual overhaul:

### 1. The Parchment Background (Zero-Asset Texture)
- Remove the solid black background from the maze container.
- Apply a CSS radial gradient to the maze container to simulate old paper (e.g., from a warm, bright beige `#f4ebd8` in the center to a dirtier sepia `#d4c4a8` at the edges).
- Create a subtle paper texture overlay using a tiny inline Base64 SVG noise filter in the CSS. Apply this overlay with `opacity: 0.1` and `mix-blend-mode: multiply` over the gradient. 

### 2. Ink-Drawn Walls
- Replace the neon wall colors. Walls should now be rendered in a deep iron-gall ink color (e.g., dark black-brown `#2c1f14`).
- Give the wall elements a very slight `border-radius` (e.g., 2px or 3px) so they look like thick lines drawn by a quill, rather than perfect digital vectors.
- Walkable paths should be completely transparent, allowing the parchment background to show through.

### 3. The "Self-Drawing" Fog of War
- Update the exploration/visibility logic to feel like the map is being drawn in real-time.
- Unexplored tiles should simply look like blank parchment (hide the walls).
- When a tile enters the player's vision radius, transition its visibility using a CSS `opacity` fade-in (e.g., `transition: opacity 0.3s ease-in`). This will create the illusion that the ink is appearing on the paper as the Antiquarian discovers the layout.
- Ever so seldomly create splatters of ink in different sizes in the general area of the walls that have just been drawn. 

### 4. Entity Rendering (Integrating Image Assets)
- Stop rendering the Player, Nemesis, and Treasures as simple colored CSS squares.
- Update the rendering loop to use the actual image assets you will find in the respective asset folders (e.g., `/ASSETS/CHARACTERS/antiquarian.png`, `/ASSETS/CHARACTERS/nemesis.png`, `/ASSETS/TREASURES/loot.png`).
- Ensure these entity sprites are properly scaled to fit within their grid cells, maintaining their aspect ratios. Give the sprites a subtle CSS `filter: drop-shadow(2px 4px 4px rgba(0,0,0,0.4))` so they look like miniature figures standing ON the flat map.

Ensure the underlying grid math and collision detection remain completely intact; we are only changing the visual rendering layer.