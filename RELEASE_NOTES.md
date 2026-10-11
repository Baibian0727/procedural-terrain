# Procedural Terrain 1.1.0 / 程序化地形 1.1.0

## 中文

### 新增功能

- 新增草地山体，以及可设置层数的岩面多层山体和草地多层山体。高台可在已有山体内部继续叠加；地图边缘可作为山体边界。
- 新增高松林和圆冠林画笔，支持单棵、连片接续与擦除。
- 新增窗口内“图块教学”：可为山体、草地山体、多层山体、道路及两种森林指定自己的普通图块。教学式样按项目和图块集保存，同一类型可保留多套式样，并可导入或导出 JSON。
- 教学中的每个图块位置可单独选择绘制图层；预览与画笔按所选图层工作。未填写映射只使实际用到该映射的格子标红跳过。
- 新增正交绘图按钮；也可按住 Shift 临时沿水平或垂直方向绘制。

### 改进

- 绘图面板将地形类型与绘制方式分开，并用一个按钮切换启用画笔和停止绘画。
- 道路画笔按图层占用处理冲突，不再因为图层 1 的地面图块 ID 与教学背景不同而整笔拒绘。冲突格跳过，其余格继续提交。

### 修复

- 修复非 Outside 图块集的空白圆冠林教学中，半透明树形范例索引错位的问题。

### 兼容性

- Marketplace Mod ID 维持 `com.mimi.procedural-terrain`；版本由 1.0.0 升至 1.1.0。
- 仍仅在 Maker Studio 1.7.1 上验证，并保留版本检查。默认图块模板仍针对 Pokémon Essentials 的 `Outside`；其他图块集需先建立相应教学式样。
- 新增 `fs.mod` 和 `ui.dialogs` 权限，分别用于教学 JSON 导出到 Mod 目录及确认对话框；保留 `ui.toasts`。
- 本地开发版 `com.mimi.procedural-grass` 与 Marketplace Mod 使用不同 ID；本次发布不会自动迁移该本地版的教学存储。

## English

### Added

- Grass cliffs and configurable multi-level rocky and grass-topped cliffs. Elevated terrain can be stacked further, and map edges can bound cliff shapes.
- Tall-pine and round-canopy forest brushes for isolated trees, connected groups, and erasing.
- An in-window tile-teaching workflow for cliffs, grass cliffs, multi-level cliffs, roads, and both forest styles. Multiple profiles can be saved per project, tileset, and terrain type, with JSON import/export.
- A drawing-layer choice for each taught tile role. The preview and brush use the chosen layers; cells that require missing mappings are highlighted and skipped individually.
- An orthogonal drawing toggle, with Shift for temporary axis locking.

### Improved

- The brush panel separates terrain type from drawing mode and uses one button to toggle painting on and off.
- Road painting checks occupied layers without rejecting an entire stroke solely because the Layer 1 ground tile differs from the teaching background. Conflicting cells are skipped while the rest of the stroke is committed.

### Fixed

- Corrected the misaligned translucent example in blank round-forest teaching profiles on non-Outside tilesets.

### Compatibility

- The Marketplace Mod ID remains `com.mimi.procedural-terrain`; the release version moves from 1.0.0 to 1.1.0.
- Maker Studio 1.7.1 remains the only verified host version, and the existing version guard stays in place. Built-in tile templates still target Pokémon Essentials `Outside`; other tilesets require teaching profiles.
- Added `fs.mod` and `ui.dialogs` permissions for exporting teaching JSON to the Mod folder and showing confirmation dialogs; retained `ui.toasts`.
- The local development Mod ID `com.mimi.procedural-grass` has a separate storage namespace; its teaching profiles are not migrated automatically by this release.
