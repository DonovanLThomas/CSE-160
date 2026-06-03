# Crash Test Blackout

`Crash Test Blackout` is a Three.js first-person escape scene for CSE 160 Assignment 5. The player starts in a broken-down crash testing warehouse, searches for seven spark plugs, repairs the generator fuse box, survives an animated chaser, and escapes through the gate after power is restored.

## How To Run

Start a local server from this folder:

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173/
```

Use a local server instead of opening `index.html` directly, because the project loads ES modules and local `.glb` assets.

## How To Play

- Click `Start Run` on the instruction screen.
- Move with `WASD`.
- Look around with the mouse.
- Hold `Shift` to sprint while stamina lasts.
- Press `E` or click when near a spark plug to collect it.
- Aim the flashlight at the chaser to slow or stagger it.
- After collecting all seven spark plugs, go to the generator/fuse box and press `E` or click to restore power.
- After the power surge, reach the opened exit gate to win.
- Press `F` or the `CCTV View` button to pause gameplay and inspect the warehouse from an indoor security camera view.
- Press `R` or the reset button to restart.

## Local Textures

Upload texture images into:

```text
assets/textures/
```

Use these exact filenames if you want the scene to automatically use them:

- `warehouse_concrete.jpg`: the uploaded seamless gray concrete texture for warehouse floors and walls. The code also accepts `warehouse-concrete.jpg` as a fallback name.
- `warehouse-grime.jpg`: dark oil, dirt, scuffs, or stained concrete for dirty floor and wall overlays. Best choice: tileable grime texture with visible stains.
- `rusty-metal.jpg`: rusty or scratched industrial metal for beams, gate pieces, generator metal, and crash-test props. Best choice: tileable metal with rust variation.
- `fuse-box-panel.jpg`: a fuse box or electrical panel face texture for the generator front. Best choice: square image with switches, warning labels, screws, vents, or panel details.

If one of these files is missing, the game still runs by using generated canvas textures as fallbacks. JPG is easiest, but PNG also works if you update the filename in `src/main.js`.

## Main Assets

- `Animated Base Character.glb`: animated chaser model with idle, jog, sprint, and hit/stagger clips.
- `Spark plug.glb`: collectible spark plug model.
- `Broken Car.glb`: crash-test vehicle prop.
- `Barrel.glb`: warehouse barrel props.
- `Container Green.glb`: cargo container props.
- Generated textures: concrete, grime, rust, signs, skybox, labels, and glow materials.

## Rubric Coverage

- Simple Three.js scene: the project creates a scene, renderer, perspective camera, animation loop, lights, and many meshes in `src/main.js`.
- Perspective camera: uses `THREE.PerspectiveCamera` with a wider 75 degree FOV for playability.
- Camera controls: uses `PointerLockControls` for mouse-look first-person movement, plus a dedicated CCTV inspection camera mode.
- Textures: uses generated canvas textures and optional local image textures from `assets/textures/`.
- Custom 3D models: loads multiple `.glb` models with `GLTFLoader`, including the animated character, spark plug, broken car, barrel, and cargo container.
- Skybox: uses a generated six-sided cube texture background.
- Extra lights: includes ambient, hemisphere, directional, spot, and point lights.
- 20+ primary shapes: includes warehouse walls, floor slabs, crash barriers, crates, cones, tires, generator pieces, gate posts, lights, beams, signs, and other props.
- 3+ shape types: uses boxes, cylinders, cones, torus rings, spheres, and planes.
- Animation: spark plugs bob/rotate, the chaser animates and faces the player, lights flicker, the generator surges, and the exit gate opens.
- Meaningful scene: the warehouse layout, crash props, generator objective, exit gate, CCTV view, and dark flashlight-driven navigation all support the escape-game theme.

## Wow Features

- First-person escape gameplay with WASD, sprint, stamina, collection, repair, win, and game-over states.
- Flashlight-focused darkness where the flashlight is the main source of visibility before the generator is restored.
- Animated chaser that idles, jogs/runs, faces the player, speeds up after power restoration, and staggers when hit by the flashlight.
- Spark plug collection loop that unlocks generator repair.
- Generator power surge that brightens the warehouse dramatically and opens the exit gate.
- Collision against major props so the player cannot walk through the warehouse set.
- CCTV Camera View that pauses gameplay and shows the scene from an indoor security-camera angle with a film/security-feed overlay.
- Start instruction screen, win screen, and game-over screen so the game feels complete instead of freezing.

## Submission Note

For grading, start the local server, open the page, press `Start Run`, collect the seven spark plugs, repair the generator, and escape through the gate. The assignment features are visible during normal play, and the `CCTV View` button can be used to inspect the full scene layout and object count.
