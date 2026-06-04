# 6. Entity & Upgrade System (Spawned on grid)
Implement a generic system to spawn collectible items, heavily weighting them towards dead-ends.
- **Speed Boost (Passive):** Permanently increases player speed for the current level.
- **Eagle Eye (Passive):** Permanently increases `sightRange` for the level.
- **Clairvoyance (Active):** Briefly reveals the ENTIRE map for 3 seconds.
- **Ariadne's Thread (Active):** Briefly renders the ideal A* solution path on the ground for 3 seconds.
- **Phase Dash (Active):** 1 charge to seamlessly pass through exactly one solid wall. 
- **Wormhole Anchor (Deployable):** Drop a return point on the current hex. Press key to instantly teleport back to it. Ideal for scouting dead ends.
- **Lighthouse Beacon (Deployable):** Drops a stationary marker that permanently clears the Fog of War in a radius of 3 hexes around its location, ignoring walls.
- **Score Shield (Active):** For the next 15 hexes visited, deviating from the A* path incurs no score penalty.
- **Wall Synthesizer (Active):** Instantly spawns a solid wall directly behind the player's current trajectory. Highly effective for blocking dynamic hazards.
- **Echolocation Pulse (Active):** Briefly illuminates all wall outlines across the entire map for 2 seconds without revealing the floor tiles.
- **Chronosphere (Active):** Completely freezes the level timer and halts all dynamic environmental hazards (e.g., Rotational nodes, spikes) for 5 seconds.
- **Magnetic Compass (Passive):** Renders a faint, persistent UI arrow around the player pointing directly toward the goal, ignoring walls.
- **Decoy Hologram (Active):** Deploys a stationary clone of the player. Can be used to safely weigh down pressure plates or trigger proximity traps.
- **Momentum Glide (Passive):** Moving in a continuous straight line gradually increases movement speed up to +50%. Changing direction resets it.
- **Danger Sense (Passive):** If the player is adjacent to a cell that mathematically leads to a dead end, that cell pulses faintly with red warning color.
