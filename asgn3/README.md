# CSE160 Assignment 3 - Voxel World

Run from this folder with:

```sh
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

## Controls

- `W`, `A`, `S`, `D`: move the camera
- `Q`, `E`: rotate left and right
- Mouse drag or pointer lock click: look around
- `C`: toggle free-roam mode
- `Space`, `Shift`: move up/down while free roam is on
- `F`: add one block in front of the camera
- `R`: remove one block in front of the camera
- `T`: restart the game

## Features Included

- Perspective camera with view, projection, and model matrices
- 32x32 hardcoded map with wall heights from 0 to 4
- Flattened-cube terrain, large cube sky, and cube-built walls
- Multiple local texture PNGs in `assets/textures/`
- Texture/color mixing via `u_TexColorWeight`
- Simple block add/delete interaction
- Mouse look
- Elephant escape story: collect three baby elephants, avoid the large elephant, and escape by car
