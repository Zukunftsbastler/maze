Please implement an Auto-Battle and Persistent Health system for the "Hex Maze" game, replacing the previous instant-death environmental stealth mechanics for monsters. Adhere to the existing Vanilla JS architecture (ES2020) and update `player.js`, `game-loop.js`, `artifact-registry.js`, and the rendering logic accordingly.

### 1. Persistent Player Health & Expedition Failure
- **Player HP:** Add a `maxHP` and `currentHP` property to the Player. Base `maxHP` is 10.
- **Persistence:** `currentHP` persists across all labyrinths within a single Expedition. It only refills to max when returning to the Panoptikum.
- **Visuals:** Render a small, floating green health bar above the player's sprite whenever `currentHP < maxHP` or while in combat.
- **Death State:** If `currentHP <= 0`, the Expedition immediately fails. All loot collected during this specific run (which would normally be kept on an abort) is deleted. The player is returned to the Panoptikum Hub with 0 gained score/resources for this run.

### 2. Auto-Battle System
- Implement an automatic combat loop in `GameLoop._update()`.
- **Combat Trigger:** When a monster is within the player's attack reach (base reach: 1 hex / adjacent), combat begins.
- **Player Base Attack:** The player automatically executes a melee attack (1 Damage) at a fixed base frequency (e.g., once per 1.0 seconds).
- **Artifact Modifiers:** Update `artifact-registry.js` to support new trait categories for combat:
  - *Damage:* Flat increases to attack damage.
  - *Frequency (Attack Speed):* Reduces the cooldown between auto-attacks.
  - *Reach / Ranged:* Allows the player to attack from 2+ hexes away.
  - *Knockback:* Weapons may have a knockback property that pushes the attacking monster a certain distance away from the player. 

### 3. Monster Spawning, HP Pool & Normal Distribution
- Monsters now have HP and health bars (rendered above them when taking damage).
- **Monster Cap:** A maximum of `Math.max(1, radius - 5)` monsters can spawn per labyrinth.
- **Expedition HP Pool:** The aggregate total HP of all monsters across an ENTIRE expedition scales exponentially:
  - Depth 1-2: 0 HP (No monsters).
  - Depth 3: Total Expedition HP = 10.
  - Depth 4: Total Expedition HP = 100.
  - Depth 5: Total Expedition HP = ~1000.
  - *Formula:* Allocate this Total Expedition HP evenly across the number of labyrinths in that expedition to get the `MazeTotalHP`.
- **Normal Distribution:** Distribute the `MazeTotalHP` among the spawned monsters in the labyrinth using a normal distribution. 
  - *Implementation:* Use the Box-Muller transform to generate normally distributed random weights for each monster, normalize the weights so they sum to 1, and multiply by `MazeTotalHP`. Ensure a minimum of 1 HP per monster.

### 4. Monster Scaling Formulas (Size, Attack, Speed)
Monster attributes must scale proportionally to their assigned HP to ensure mechanical balance. Implement the following formulas for each monster:
- **Size (Radius):** Scales logarithmically so high HP monsters are visually imposing but fit on the grid.
  - `MonsterRadius = BaseRadius * (1 + Math.log10(HP) * 0.3)`
- **Attack Power (Damage):** Scales via square root to prevent one-shotting the player.
  - `AttackDamage = Math.max(1, Math.ceil(Math.sqrt(HP / 2)))`
- **Speed:** High HP monsters become slower (brutes), low HP monsters are faster (swarms).
  - `MovementSpeed = BaseSpeed * (1 / (1 + Math.log10(HP) * 0.25))`
- **Attack Frequency:** Monsters also auto-attack when in range (base 1.5s cooldown).

### 5. Scaling Monster Loot & Artifact Drops
- Defeated monsters drop in-run currency (Barricade Materials / Gold) directly proportional to their HP (`Loot Amount = ceil(HP / 5)`).
- **Artifact Drop Rule:** A maximum of 1 monster per labyrinth can hold an Artifact. 
  - Assign this artifact drop to the monster with the highest HP in the maze.
  - The tier/rarity of the dropped artifact must correspond to the Depth level (e.g., Depth 4 drops Tier 4-6 artifacts).