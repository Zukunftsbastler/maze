Please resolve inventory routing bugs, implement the research gating mechanic for properties, and fully wire artifact traits into the game logic. Review the codebase and apply the following changes:

1. Unified Inventory Access & Bidirectional Drag-and-Drop
- Fix the bug preventing artifacts in the Exhibition from being dragged back into the Cabinet of Curiosities (Inventory).
- Fix the Laboratory scene: Ensure the Cabinet of Curiosities (Inventory grid view) is visible and fully functional within the Laboratory layout, allowing the player to drag artifacts from the inventory onto research slots and vice versa.
- Ensure seamless, bidirectional moving and dragging between Cabinet <-> Exhibition and Cabinet <-> Laboratory.

2. Research Gating for Properties
- Ensure that an artifact's "Known Properties" (all traits, benefits, and curses) are NEVER visible upon initial collection.
- All properties must remain completely hidden and locked until the player explicitly conducts research on that specific artifact in the Laboratory using the accumulated "Research/Knowledge" currency.

3. Core Logic Integration & Tier Scaling for Traits
- Ensure that ALL defined artifact properties (such as "+X visitor attraction", movement speed modifiers, fog of war sight range adjustments, or nemesis speed tweaks) are completely "wired" into the actual game mechanics and loops.
- Fix the issue where traits like "+2 visitor attraction" exist as metadata but have no functional impact on the visitor calculation loop or game state. 
- Implement an explicit scaling logic based on the artifact's Tier: At Tier 1 (Grimy), the magnitude of any active property's effect must be very minimal/slight, scaling up progressively with each higher tier.