# Role & Context
You are optimizing the `HexRenderer` class for the Hexagonal Maze Generator we built. The core math and generation logic work perfectly, but the visual UX is currently failing: it is extremely difficult to intuitively see which hex edges are blocked by walls and which are open passages. 

# Problem Statement
Simply omitting a 1.5px stroke on a shared hex edge does not create a strong visual "passage" in a dense grid. The maze currently looks like a solid block of hexagons with faint missing lines, making pathfinding visually frustrating.

# Required Visual Improvements
Please rewrite the `HexRenderer` class to make the labyrinth structure instantly and intuitively readable. Implement the following rendering techniques:

1. **Thick, High-Contrast Barriers:** - Increase the stroke width of walls significantly (e.g., 4-6px). 
   - Use `ctx.lineCap = 'round'` and `ctx.lineJoin = 'round'` so the vertices where walls meet look like solid pillars rather than broken line segments.
2. **Visual Inset (The "Shrunken Tile" Trick):**
   - Draw the background of the canvas in a dark "void" color (e.g., very dark blue/black).
   - Draw the walkable floor of the hexes slightly smaller than the mathematical cell size (e.g., scale the corner points down by 10-15%). This leaves a natural dark gutter between cells, which the bright walls will sit on top of. 
3. **Passage Bridging:**
   - Where there is NO wall between two adjacent cells, draw a floor-colored bridge connecting the two shrunken tiles. This visually merges the open cells into a continuous, flowing path.
4. **Distinct Coloring:**
   - Make the walls a bright, neon-like color (e.g., cyan or electric blue) with a slight glow so they clearly pop out as solid geometry above the darker floor tiles.

# Output
Provide the fully updated `hex-renderer.js` code. Do not change the math or generation logic. Keep it strictly Vanilla JS.