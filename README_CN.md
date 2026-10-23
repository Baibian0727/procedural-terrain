# Procedural Terrain / 程序化地形

这是一个面向 **Maker Studio** 的程序化地形绘制 MOD。内置模板使用 **Pokémon Essentials 原生 `Outside` 图块组**；部分地形也可通过图块教学适配其他普通图块布局。

作者：**千面之途**  
GitHub：**Baibian0727**  
Mod ID：`com.mimi.procedural-terrain`  
版本：**1.1.0**

## 功能

当前版本支持：

- 草地绘制与取样
- 单层山体
- 叠加高台
- 扩展已有高台高度
- 擦除底座 / 擦除高台
- 下挖一层
- 水坑绘制 / 擦除
- 道路自动接边
  - 棕色沙土
  - 浅黄沙地
  - 灰色砂砾
  - 浅灰城市道路
- 栅栏绘制 / 擦除
- 圆形、方形笔刷
- 最大 31 格笔刷直径
- 按下后即时显示实际图块预览
- 冲突位置标红，不盲目覆盖不支持的地形
- 松开鼠标后整笔提交
- 使用 Maker Studio 原生撤销记录，`Ctrl+Z` 可整笔撤销
- 预览期间按 `Esc` 取消当前这一笔

1.1.0 还加入草地山体、可设置层数的多层山体、高松林、圆冠林、正交绘图和窗口内图块教学。每个教学位置可以指定自己的图块 ID 与绘制图层，同一图块集和地形类型也可以保存多套式样。详情见[中英双语更新说明](RELEASE_NOTES.md)。

## 兼容性

**适用于 Maker Studio 1.9.0（兼容 1.7.1）。**

跨层撤销依赖编辑器自身的批量事务（公开 Mod API 尚未提供）。本 Mod 按接口形状在已加载模块中查找，而不再按版本号或文件名；找不到时会主动停止绘图，以免损坏撤销记录。

界面语言跟随编辑器（视图 → 语言）：英语、西班牙语；`zh` 区域显示中文原文，其他语言回退英语。

内置模板按 **Pokémon Essentials 原生 `Outside` Tileset** 的图块排列编写。受支持的地形类型可以通过教学映射到其他普通图块布局；水坑和栅栏仍使用内置 Outside 布局。

## 手动安装

将 `com.mimi.procedural-terrain` 文件夹放到：

```text
<你的游戏工程>/Plugins/MakerStudio/003_Editor/Mods/
```

最终目录应为：

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

重新打开项目或重载 Maker Studio 后，在 Mods 中打开：

**Procedural Terrain / 程序化地形**

## 使用原则

程序会先生成实时预览，只有松开鼠标后才正式写入地图。冲突位置标红并跳过，其余有效位置继续绘制。提交的一笔仍对应一次原生撤销。

## 素材说明

本 MOD 不包含任何 Pokémon / Essentials 图块图片。它只对用户自己的工程地图进行编辑。以后发布新版本的操作见 [PUBLISHING.md](PUBLISHING.md)。
