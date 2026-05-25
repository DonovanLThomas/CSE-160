# CSE160 Assignment 4 - Phong Lighting World

This version turns the Assignment 3 voxel world into a focused Phong lighting demo:

- Cube world made from lit cubes with per-face normals
- Generated spheres with smooth normals
- Movable animated point light with visible cube marker
- Camera-attached spotlight
- Lighting, normal visualization, point light, and spotlight toggles
- Sliders for point light position and RGB light color
- Local OBJ model loading from `assets/models/head.obj`

## Controls

- `W`, `A`, `S`, `D`: move the camera
- `Q`, `E`: rotate left and right
- Mouse drag or pointer lock click: look around
- `C`: toggle free-roam mode
- `Space`, `Shift`: move up/down while free roam is on
- `F`: add one block in front of the camera
- `R`: remove one block in front of the camera
- `T`: reset the lighting demo

Run through a local web server so `fetch()` can load the OBJ file:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
