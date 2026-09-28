# Block World

A first-person voxel adventure built with HTML, CSS, JavaScript, and Three.js. Explore a randomly generated landscape, chop trees for wood, avoid hazards, and find the glowing exit.

## Play

Open `index.html` in a modern browser with WebGL support. Three.js loads from jsDelivr, so an internet connection is required. There is no install or build step.

Click the game view to capture the mouse and begin. Press `Escape` to release the mouse.

## Multiplayer

Open Multiplayer from the HUD or press `M`. One player chooses **Host a world**, then shares the room code. Friends enter that code and choose **Join**. The host sends the world to each new player and relays movement and block edits. Keep the host browser open while playing. Multiplayer uses PeerJS and WebRTC signaling, so everyone needs an internet connection and a browser that permits peer connections.

## Multiplayer

Open Multiplayer from the HUD or press `M`. One player hosts a world and shares the room code; friends enter that code and choose Join. The host sends the world to new players and relays player movement and block edits. Keep the host browser open while playing. Multiplayer uses PeerJS/WebRTC signaling, so everyone needs an internet connection and a browser that allows peer connections.

## Controls

| Action | Control |
| --- | --- |
| Move relative to where you look | `Z` `Q` `S` `D`, `W` `A` `S` `D`, or arrow keys |
| Look around | Mouse |
| Jump | `Space` |
| Swim up / dive | Hold `Space` / hold `Ctrl` while swimming |
| Break the block under the crosshair | Left mouse button |
| Sprint | `Shift` |
| Select a hotbar slot | Number-row keys `1` to `5` |
| Open or close inventory | `E` |
| Open multiplayer | `M` |
| Open multiplayer | `M` |
| Place the selected leaves or log | Right mouse button |
| Generate a new world and restart | `R` |
| Release mouse capture | `Escape` |

## World And Items

Each new world is 80 x 80 blocks, with a clear grass route connecting the start and exit. Lakes have sandy shores and can be swum through; hold `Space` to rise and `Ctrl` to dive. Lava drains health; water slowly restores it. Trees have harvestable trunks and leafy crowns; rocks can be jumped onto. The axe gives extra logs, and the pickaxe gives extra stone. Open the inventory with `E` without releasing mouse capture. Select Leaves or Logs in the hotbar, then right-click to place one in the world. If health reaches zero, you respawn at the start.

## Project Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, HUD, controls, and Three.js loader |
| `style.css` | Responsive layout and game interface styling |
| `fps-game.js` | World generation, 3D rendering, movement, mining, hazards, and exit logic |

The game uses the browser's WebGL renderer through Three.js. Google Fonts are used for the interface when available; fallback fonts are included.
