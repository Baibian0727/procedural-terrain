# Procedural Terrain / 程序化地形

这是一个面向 **Maker Studio** 的程序化地形绘制 MOD，目前针对 **Pokémon Essentials 原生 `Outside` 图块组**。

作者：**百变**  
GitHub：**Baibian0727**  
Mod ID：`com.mimi.procedural-terrain`  
版本：**1.0.0**

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

## 兼容性

**当前只核对并测试 Maker Studio 1.7.1。**

为了避免跨层撤销或地图数据损坏，本版本在检测到 Maker Studio 不是 1.7.1 时会主动停止绘图，而不是勉强运行。

山体、水坑、道路、栅栏等程序化模板目前按 **Pokémon Essentials 原生 `Outside` Tileset** 的图块排列编写，不是任意 Tileset 通用生成器。

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
└─ CHANGELOG.md
```

重新打开项目或重载 Maker Studio 后，在 Mods 中打开：

**Procedural Terrain / 程序化地形**

## 使用原则

程序会先生成实时预览，只有松开鼠标后才正式写入地图。遇到不支持或可能破坏现有地形的位置会标记冲突并阻止整笔提交，以降低误改地图的风险。

## 素材说明

本 MOD 不包含任何 Pokémon / Essentials 图块图片。它只对用户自己的工程地图进行编辑，并依据 Essentials 原生 `Outside` 图块布局工作。
