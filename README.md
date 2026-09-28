# Minecraft Mini

A first-person block adventure in a large, randomly generated voxel world. Look around with the mouse, roam freely, mine obstacles, avoid lava, and use the compass to find the distant green gate.

## Play

1. Open `index.html` in a modern browser with WebGL support.
2. Click the game to capture the mouse, then look around and explore. Press `Escape` to release the mouse.

The world is 128 x 128 blocks. Three.js loads from jsDelivr, so an internet connection is needed. No server, package install, or build step is required.

## Controls

| Action | Keys |
| --- | --- |
| Move relative to where you are looking | `W` `A` `S` `D` or arrow keys |
| Look around | Mouse (click the game first) |
| Sprint | `Shift` |
| Mine the block under the crosshair | `Space` |
| Start a new world | `R` |

Mining clears stone, logs, and leaves and adds to your block count. The compass points toward the green gate. Lava drains health, while water slowly restores it. If health reaches zero, you respawn at the center of the world.

## Project Files

| File | Purpose |
| --- | --- |
| `index.html` | Game page, HUD, and on-screen controls |
| `style.css` | Page layout and responsive styling |
| `fps-game.js` | Three.js scene, pointer lock, voxel world, movement, mining, and hazards |

## Built With

Plain HTML, CSS, and JavaScript with Three.js for WebGL rendering. Three.js is loaded from a CDN; there is no local build toolchain.