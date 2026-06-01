# Role and Objective
You are an expert game developer specializing in Vanilla JavaScript, procedural generation, and game architecture. Your goal is to build a robust, dependency-free Hexagonal Maze Generator that serves as a foundational engine for a Tower Defense or Puzzle game.

# Tech Stack & Deployment
- **Language:** Strictly Vanilla JavaScript (ES6+), HTML5, and standard CSS.
- **Rendering:** Use HTML5 `<canvas>` or `<svg>` for lightweight, fast rendering. 
- **Dependencies:** Zero external dependencies (no React, no Three.js, no Lodash). The output must be ready to deploy as a static site on Netlify with minimal attack surface.

# Grid & Hexagonal Mathematics
- **Coordinate System:** Implement standard Hexagonal math (Cube or Axial coordinates) following the principles from the "Red Blob Games" hex grid reference.
- **Data Structure:** Create a modular `HexCell` class/object. Each cell must contain:
  - Coordinates (q, r, s).
  - Wall definitions (an object or array representing the 6 edges).
  - Game-ready metadata: `isStart`, `isGoal`, `isBuildable` (boolean for Tower Defense), `isWalkable`, and `terrainWeight` (for puzzle mechanics).

# Procedural Generation & Organic Shape
- **Shape Generation:** Do not generate a strict, perfect mathematical hexagon. Create an organic, blob-like cluster. Use a distance-from-center mask combined with randomized edge-culling or cellular automata to create irregular boundaries and "bulges".
- **Dynamic Sizing:** Accept a parameter for the total number of cells or the maximum radius.
- **Start & Goal Placement:** - **Goal:** Must be placed exactly at the center coordinate.
  - **Start:** Must be dynamically placed on the furthest valid outer edge of the organic shape.

# Maze Algorithm & Difficulty Control
- **Path Generation:** Implement a maze generation algorithm adapted for 6 neighbors (e.g., modified Recursive Backtracking or Prim's algorithm).
- **Difficulty Parameter:** The path must not be a direct line. Implement a `windingFactor` or `branchingProbability` parameter. High difficulty should result in a highly convoluted, serpentine path from Start to Goal.
- **Seedable RNG:** Include a simple, custom pseudo-random number generator (PRNG) so that a specific "seed" string always generates the exact same maze (crucial for sharing puzzle levels).

# Pathfinding & Utility Methods
- **A* Algorithm:** Include an A* (A-Star) or Dijkstra pathfinding implementation to guarantee solvability and to calculate the actual path distance. This will be used later for enemy routing.
- **Serialization:** Provide `toJSON` and `fromJSON` methods to export and import the generated maze state, allowing me to save specific layouts as static levels.

# Output Requirements
Please provide a complete, well-commented codebase containing:
1. The mathematical core and PRNG (`HexMath`, `Random`).
2. The grid and maze generation logic (`HexGridGenerator`).
3. The rendering logic (`HexRenderer`).
4. A minimal `index.html` file that wires everything together. Include a basic UI overlay with sliders/inputs for Size, Winding Factor, and Seed, plus a "Generate" and "Export to JSON" button.