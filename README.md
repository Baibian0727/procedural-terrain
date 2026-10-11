# Procedural Terrain / 程序化地形

A Maker Studio mod for brush-based terrain drawing, with built-in templates for the vanilla Pokémon Essentials `Outside` tileset and reusable teaching profiles for other regular-tile layouts.

Author: **千面之途**  
GitHub: **Baibian0727**  
Mod ID: `com.mimi.procedural-terrain`  
Version: **1.1.0**

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

Version 1.1.0 also adds grass-topped cliffs, configurable multi-level cliffs, tall-pine and round-canopy forests, orthogonal drawing, and in-window tile teaching. Each teaching profile can specify tile IDs and output layers per role. Several profiles can coexist for one terrain type and tileset. See [the bilingual release notes](RELEASE_NOTES.md).

## Compatibility

**Tested with Maker Studio 1.7.1.**

This release intentionally refuses to draw on a different Maker Studio version because it relies on 1.7.1 host internals for safe cross-layer transactions and native undo behavior.

Built-in tile templates target the **vanilla Pokémon Essentials `Outside` tileset layout**. Teaching profiles can map supported terrain types to other regular-tile layouts. Water and fences still use their built-in Outside layouts.

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
├─ CHANGELOG.md
├─ RELEASE_NOTES.md
└─ PUBLISHING.md
```

Restart/reload Maker Studio, then open **Procedural Terrain / 程序化地形** from the Mods panel.

## Safety model

The mod previews terrain first and commits the stroke only when the pointer is released. Unsupported/conflicting cells are marked instead of being silently overwritten. A committed stroke is grouped as one native Maker Studio undo action when the host transaction succeeds.

## Notes

This project does **not** bundle Pokémon graphics or tileset assets. It operates on the user's own project data and expects the standard Essentials `Outside` tile arrangement.

The interface remains primarily Chinese. The release workflow and future update steps are documented in [PUBLISHING.md](PUBLISHING.md).
