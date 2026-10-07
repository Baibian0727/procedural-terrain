# Procedural Terrain / 程序化地形

A Maker Studio mod for drawing terrain procedurally with the **vanilla Pokémon Essentials `Outside` tileset**.

Author: **百变**  
GitHub: **Baibian0727**  
Mod ID: `com.mimi.procedural-terrain`  
Version: **1.0.0**

## What it does

Procedural Terrain turns repetitive tile-by-tile terrain work into brush-based editing. The current release provides tools for:

- Grass painting and sampling
- Single-level cliffs
- Stacked elevated terrain
- Extending an existing elevated level
- Removing a base or upper level
- Digging terrain down by one level
- Water / pond drawing and erasing
- Roads with automatic neighbour connections
  - Brown dirt
  - Light yellow sand
  - Gray gravel
  - Light gray city road
- Fence drawing and erasing
- Circle and square brushes up to 31 tiles in diameter
- Live tile preview before committing
- Conflict highlighting instead of blindly overwriting unsupported terrain
- Whole-stroke undo through Maker Studio's native undo history
- `Esc` to cancel the current preview before committing

## Compatibility

**Tested with Maker Studio 1.7.1.**

This release intentionally refuses to draw on a different Maker Studio version because it relies on 1.7.1 host internals for safe cross-layer transactions and native undo behavior.

The procedural terrain templates are currently designed for the **vanilla Pokémon Essentials `Outside` tileset layout**. The cliff/water/road/fence tools are not universal tileset generators and should not be used on unrelated tileset layouts.

## Install manually

Unzip the mod folder to either:

```text
<YourGame>/Plugins/MakerStudio/003_Editor/Mods/com.mimi.procedural-terrain/
```

or Maker Studio's global Mods folder.

The final folder should contain:

```text
com.mimi.procedural-terrain/
├─ manifest.json
├─ index.js
├─ README.md
├─ README_CN.md
└─ CHANGELOG.md
```

Restart/reload Maker Studio, then open **Procedural Terrain / 程序化地形** from the Mods panel.

## Safety model

The mod previews terrain first and commits the stroke only when the pointer is released. Unsupported/conflicting cells are marked instead of being silently overwritten. A committed stroke is grouped as one native Maker Studio undo action when the host transaction succeeds.

## Notes

This project does **not** bundle Pokémon graphics or tileset assets. It operates on the user's own project data and expects the standard Essentials `Outside` tile arrangement.

The interface in v1.0.0 is primarily Chinese. English UI localization may be added later.
