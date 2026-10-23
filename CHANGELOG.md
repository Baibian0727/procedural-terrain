# Changelog

## 1.2.0

- Maker Studio 1.9.0 support: removed the hard 1.7.1 version check; the cross-layer undo transaction is now located by its interface, not by hashed file names. Tileset previews load through the tileset image command instead of renderer internals.
- English and Spanish translations (`i18n.js`); the UI follows the editor language and re-renders when it changes.

## 1.1.0 (release candidate)

See [bilingual release notes](RELEASE_NOTES.md) for the reviewed feature list and compatibility details.

- Added grass cliffs, configurable multi-level cliffs, and tall-pine and round-canopy forest brushes.
- Added reusable tile-teaching profiles for seven terrain types, including per-role drawing layers and partial-mapping behavior.
- Added orthogonal drawing and a clearer terrain-type/mode brush panel.
- Improved road conflict handling so valid cells in a stroke can still be drawn.
- Fixed the blank round-forest teaching example on non-Outside tilesets.
- Retained the Maker Studio 1.7.1 version guard and the published Mod ID.

## 1.0.0

First public release.

- Renamed the project to **Procedural Terrain / 程序化地形**.
- Permanent Mod ID set to `com.mimi.procedural-terrain`.
- Supports grass, cliffs, stacked heights, digging, water, roads and fences for the vanilla Pokémon Essentials `Outside` tileset.
- Live tile previews and conflict visualization.
- Native whole-stroke undo integration for Maker Studio 1.7.1.
- Added public-release manifest metadata and `ui.toasts` permission declaration.
