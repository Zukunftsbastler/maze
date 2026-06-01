# Implementation Blueprint: 3-Phase Maze Defense & Dynamic Setup Timer

## 1. Core Phase State Machine & Unified Timer (`game-loop.js`)
The game loop transitions through three distinct phases. Phases A and B are governed by a single, shared setup countdown timer that ticks backward.

* **Phase A: Exploration:** Starts immediately upon player spawn. The player explores the maze to find build spots and resources while the setup timer counts down.
* **Phase B: Build Phase:** Unlocks the moment the player physically reaches `grid.goalCell`. The phase transition is seamless: the setup timer **does not reset**, but continues counting down from where it was. The player uses this remaining time to spend resources and build defenses.
* **Phase C: Nemesis Attack:** Triggers instantly when the setup timer hits `0`, regardless of whether the player reached the goal or is still exploring (forcing an early start). The Nemesis spawns, and a new "Attack Timer" begins.

## 2. Timer Math & Risk/Reward Scaling (`game-loop.js` & `progression.js`)
The shared setup timer is dynamically calculated based on the ideal path to ensure fairness, with high-score scaling in later levels.

* **Base Traversal Time:** Mathematically calculated by taking the A* path length, multiplying by the physical cell distance (sqrt(3) * cellSize), and dividing by `player.speed`.
* **Generosity Factor:** In early levels, the setup timer is allocated `4.0x` the base traversal time, making it very generous.
* **Dynamic Scoring:** In later levels, players can configure the timer to be less generous (e.g., `2.0x` or `1.0x`). Reducing the timer restricts setup time but significantly increases the level's final score multiplier. 

## 3. Grid Economy & Exploration Loot (`hex-grid-generator.js` & `hex-cell.js`)
* **Cell Data (`hex-cell.js`):** Add state properties for `hasCurrency`, `hasUpgrade`, and `blockadeLevel`.
* **Dead-End Generation:** During maze generation, algorithmically identify dead ends (cells with exactly 5 walls). Populate these specifically with currency, temporary upgrades, and items.
* **Temporary Buffs:** All collected resources and upgrades strictly reset at the end of the round (whether won or lost).
* **Build Spots:** Specific cells must be designated as valid `isBuildable` spots where defenses can be placed. There should be no more build spots available in a given maze than its radius. They must be easily recognizable. Chose an appropriate color from the existing palette. 

## 4. Interaction Controls & Construction (`game-loop.js`)
Building defenses requires a distinct input method separated from normal movement.
* **Build Selection:** The player must click on a valid build spot to open the defense selection UI.
* **Availability:** Construction is locked during Phase A. It unlocks when Phase B starts (goal reached) and remains active even during Phase C (if the player has resources left).
* **Initial Defense:** The only available structure is a simple "Blockade" that costs currency.

## 5. Algorithmic Path Validation & Soft-Lock Prevention (`hex-grid-generator.js`)
Players are expected to build blockades *directly* on the optimal A* path to reroute the enemy, but they cannot completely trap the Nemesis. They are, however, also offered a handful of build spots outside the optimal A* path. 
* **Validation Check:** Before confirming a blockade placement, temporarily set the target cell to unwalkable and run `findPath(nemesis.currentCell, goalCell)`.
* **Enforcement:** If no alternative path exists (`path.length === 0`), the placement is rejected to prevent a soft-lock. At least one valid route to the goal must remain open.

## 6. Nemesis Logic & Win/Loss Conditions (`nemesis.js` & `game-loop.js`)
* **Level Constraint:** The Nemesis is completely disabled for the first three levels (`level <= 3`).
* **Spawning & Pathing:** At the start of Phase C, the Nemesis spawns at `grid.startCell` and continuously paths toward the goal.
* **Attack Timer (Win Condition):** The Nemesis is given *exactly* enough time to walk the absolute shortest, unobstructed A* path. If the player's blockades force the Nemesis to take a detour, the attack timer will expire before it reaches the goal. Time expiring = Level Won (proceed to next level).
* **Loss Condition:** If the Nemesis touches the goal, the level is failed. The player must repeat the current level with a freshly generated maze seed.

## 7. Critical UI / UX Requirements (`index.html` & `game-loop.js`)
The shared countdown timer is central to the gameplay loop and must be a highly visible HUD element.
* **Placement:** The timer must be centrally positioned and scaled relatively large.
* **Warning State:** When the timer hits the final **10%**, it must dynamically shift to a high-contrast red color and trigger a CSS keyframe shaking/wiggling animation to signal urgency.