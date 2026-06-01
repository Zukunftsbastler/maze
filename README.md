# ⬡ Hex Maze

A browser-based maze game built entirely in Vanilla JS. Navigate procedurally generated hexagonal dungeons while managing Fog of War, optimising your route, and chasing a high score.

---

## How to Play

Open `index.html` in any modern browser. Switch to **Play Mode** with the button in the header.

### Controls

| Input | Action |
|---|---|
| `Q` `W` `E` / `A` `S` `D` | Move in the six hex directions |
| Arrow keys | Move (cardinal approximation) |
| Click / tap and hold | Move toward pointer |
| Right-click drag / Space+drag | Pan the camera |
| Scroll wheel / pinch | Zoom |

---

## Game Flow

### 1. Pre-Run Screen
Before each level begins you see a summary overlay showing:
- The current **Level** and its **Difficulty Score**
- Any **newly introduced mechanic** (from Level 4 onward)
- All currently **active mechanics**
- **Peek options** — configure how long the map is revealed at the start and whether the solution path is shown

### 2. Peek Phase
When you click **Start Run**, the full maze is briefly revealed (the *peek*). During the peek the A* solution path is optionally visible. After the timer expires the map goes dark and play begins.

- **2 s peek** — standard (score multiplier **1.0×**)
- **1 s peek** — hard (multiplier **1.5×**)
- **0 s peek** — blind run (multiplier **2.0×**)
- **Hide path** during peek — flat **+20 bonus**

### 3. Play Phase
Navigate from the green **S** (Start) marker to the red **G** (Goal) marker. Walls block both movement and line of sight. Cells have three visibility states:

| State | Appearance |
|---|---|
| **Hidden** | Pure black — never visited |
| **Revealed** | Dimmed floor, muted walls — previously seen |
| **In Sight** | Full neon — currently within your sight range |

Sight range is determined by the active mechanics. The wall-aware BFS only follows open passages, so you cannot see through walls.

### 4. Post-Run Scoring

| Component | Formula |
|---|---|
| **Max Score** | Difficulty Score + optimal path length |
| **Penalty** | Number of unique off-path tiles visited |
| **Run Score** | Max Score − Penalty (min 0) |

The Run Score is added to your **Total Score**, which persists in `localStorage` across sessions.

---

## Difficulty Score Formula

```
Base     = Radius × 10  +  PathLength × 5
PeekMult = 1.0 (2s) | 1.5 (1s) | 2.0 (0s)
FoWMult  = 1.0 + (4 − SightRange) / 3     [1.0 at range 4 → 2.0 at range 1]
PathBonus = 20 if path was hidden during peek, else 0

DifficultyScore = round(Base × PeekMult × FoWMult) + PathBonus
```

---

## Progression

Levels 1–3 use a growing radius with full visibility (no Fog of War). From **Level 4** onward, one new mechanic is introduced each level in a randomised order drawn from the pool:

| Mechanic | Effect |
|---|---|
| Light Fog | Sight range reduced to 3 |
| Mega Dungeon | Maze splits into 2 fused clusters |
| Dense Fog | Sight range reduced to 2 |
| Labyrinthine Complex | Maze splits into 3 fused clusters |
| Pitch Black | Sight range reduced to 1 |

Once introduced, a mechanic remains active for all subsequent levels.

---

## Architecture

All code is plain ES2020 with no build step or dependencies.

| File | Responsibility |
|---|---|
| `hex-math.js` | Cube-coordinate maths (neighbour, distance, pixel conversion) |
| `random.js` | Seeded Mulberry32 PRNG |
| `hex-cell.js` | Cell data model (walls, visibility, metadata) |
| `hex-grid-generator.js` | Procedural generation: organic blobs, entry/exit tunnels, recursive backtracker, A\* |
| `hex-renderer.js` | Off-screen canvas rendering with fog-of-war, bridge-gutter technique |
| `player.js` | Movement, wall collision resolution, cell tracking |
| `game-loop.js` | `ProgressionManager` + `GameLoop` (RAF loop, fog BFS, run-state machine, scoring) |
| `index.html` | Single-file UI: analysis mode controls, play-mode HUD, pre/post-run overlays |

### Key Concepts

**Hex coordinate system** — flat-top hexagons in cube coordinates (q, r, s). All positions are stored as absolute world-pixel coordinates derived from `q` and `r` via `HexMath.toPixel`.

**Shrunken tile + bridge rendering** — each cell's floor hex is drawn at 84% size so a dark gutter forms between tiles. Where two cells share an open passage, a quad "bridge" fills the gap. Walls are the *absence* of bridges, emphasised by a neon glow line.

**Island chaining** — completed islands are archived as static off-screen canvases and drawn left-to-right to create the illusion of one continuous "Mega-Dungeon". The player cannot move back past the archive boundary.

**Fog of War** — every frame, if the player has moved to a new cell, a wall-aware BFS expands outward through open passages up to `sightRange` steps. Cells entering the radius become **In Sight**; cells leaving it drop to **Revealed** permanently.
