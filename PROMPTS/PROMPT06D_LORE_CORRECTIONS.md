Please update the story text injection and the Expedition Micro Map (View B) data structure to fix narrative timing and map progression.

### 1. Story Text Timing (in `game-loop.js` or ProgressionManager)
The current lore text about discovering the Panoptikum is playing at the wrong time (when selecting Level 1, after the Hub is already unlocked). 
- **Tutorial (Level 0 / Initial Start):** Move the Panoptikum discovery text here. 
  *Lore Text:* "The rumors speak of a legendary 'Panoptikum' hidden just beneath the upper crust. A quirky, marvelous museum, though long abandoned and stripped of its artifacts. If I can navigate these shifting ruins, it would make the perfect laboratory and sanctuary for my research."
- **Level 1 (First Real Expedition from the Hub):** Inject a new flavor text.
  *Lore Text:* "The Panoptikum is secured, but its display cases are tragically bare. It is time to begin the real work. I will start with a short expedition into a promising, nearby sector of the crushed upper levels. Let's see what history the earth has swallowed here."

### 2. Micro Map (Level01.png) Reset & Naming
Update the JavaScript data array that defines the interactive zones/polygons for `Level01.png`.
- **Reset Progression:** Currently, some zones start as 'completed'. Change the initialization so that **ONLY the very first zone is `'available'`**, and **ALL other zones are strictly `'locked'`**. Zones get unlocked subsequently when each previous zone was completed. All zones can be re-played over and over again. Once unlocked, zones do not get locked again. 
- **Rename & Map Zones to Visuals:** Update the `name` properties of the zones to match the visual layout of the image, starting from the top left and moving through the map. Ensure your array follows this logical order:
  1. **"Gargoyle's Overlook"** (Status: 'available') - Maps to the top-left statue.
  2. **"The Ruined Archive"** (Status: 'locked') - Maps to the room with bookshelves and scattered tomes just right of the Gargoyle. 
  3. **"The Splintered Niche"** (Status: 'locked') - Maps to the dark area crushed underneath the massive, broken wooden support beam (top center/right).
  4. **"Spice Merchant's Cellar"** (Status: 'locked') - Maps to the bottom-left room with barrels.
  5. **"The Green Drain"** (Status: 'locked') - Maps to the glowing green sewer pipe in the bottom center.
  6. **"The Rusted Gate"** (Status: 'locked') - Maps to the iron cell gate in the bottom right.
  *(If you have more placeholder zones in the array, name them logically based on rubble/ruins and set them all to 'locked').*


Ensure the highlight and selection logic now correctly forces the player to start at "Gargoyle's Overlook" and progress from there.