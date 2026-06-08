Please implement a lightweight CSS animation system to breathe life into our static 2D game sprites without requiring sprite sheets.

Add the following utility classes and keyframes to the main stylesheet. CRITICAL: All entity sprites must have `transform-origin: bottom center;` applied so their base remains firmly anchored to the map tiles.

### 1. Idle Breathing (`.anim-idle-breathe`)
- Create an infinite, smooth keyframe animation that gently stretches the sprite vertically (e.g., `scaleY(1.03)`) and returns to normal. Give it a duration of around 2-3 seconds with an `ease-in-out` timing function.

### 2. Floating (`.anim-idle-float`)
- Create an infinite keyframe animation for ethereal enemies and magical artifacts. It should smoothly translate the entity up and down on the Y-axis (e.g., `translateY(-8px)`).
- Add a pseudo-element or manipulate the existing `drop-shadow` filter so the shadow expands and softens when the sprite is at its highest point, and sharpens when it goes down.

### 3. Walking/Stepping (`.anim-walk`)
- Create a movement class to be toggled via JS when an entity moves between tiles. 
- The animation should last exactly as long as the movement transition (e.g., 200ms). It should combine a slight upward hop (`translateY(-4px)`) with a tiny rotation/wobble (`rotate(-3deg)` to `rotate(3deg)`) to simulate shifting weight.

### 4. Landing Impact (`.anim-impact`)
- Create a quick "squash and stretch" animation class. When triggered, the sprite should briefly compress vertically (`scaleY(0.85)`) and expand horizontally (`scaleX(1.1)`), then snap back to normal over 150ms.

### 5. The Antiquarian's Focus (.anim-player-idle)
- Create a specialized idle animation exclusively for the Antiquarian/Player sprite.
- It should combine the gentle vertical breathing stretch (`scaleY(1.02)`) with a very subtle, slow rocking motion (`rotate(-1.5deg)` to `rotate(1.5deg)`) to simulate the character cautiously looking around the dark maze.
- Add an animated `filter: drop-shadow()` to this class that pulses a warm, golden-orange color (e.g., `rgba(255, 180, 50, 0.5)` to `rgba(255, 150, 20, 0.8)`) to simulate the flickering light of the Antiquarian's lantern casting light onto the parchment map.
- Update the JavaScript rendering logic so that the player entity always receives this specific `.anim-player-idle` class when stationary, instead of the generic breathing class.

Update the JavaScript rendering loop to automatically apply `.anim-idle-breathe` to humanoid characters and `.anim-idle-float` to floating entities when they are stationary. Apply `.anim-walk` during tile transitions.