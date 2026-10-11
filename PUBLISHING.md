# 发布流程 / Release workflow

本仓库使用 Maker Studio Mod 注册仓库提供的 `templates/publish.yml`，放在 `.github/workflows/publish.yml`。在官方模板上仅增加 JavaScript 语法检查，并以 `RELEASE_NOTES.md` 作为 GitHub Release 正文。

## 每次发布

1. 修改 `index.js`，将 `manifest.json#version` 和面板中的版本号设为同一个尚未使用的语义版本号。更新 `RELEASE_NOTES.md` 与 `CHANGELOG.md`。保持 Mod ID `com.mimi.procedural-terrain` 不变。
2. 运行 `node --check index.js` 和适用的功能测试，检查 `manifest.json` 的入口、作者及实际使用的权限。提交代码并推送到本仓库的 `main`。
3. 确认本次更新说明后，创建并推送与 manifest 对应的标签，例如 `git tag v1.1.0`、`git push origin v1.1.0`。
4. GitHub Actions 自动验证标签版本、检查语法、打包 `<modId>-<version>.zip`、计算 SHA-256，并创建或更新该标签的 Release，同时上传 ZIP 和 `SHA256SUMS.txt`。
5. 等待 Action 成功，然后从 **实际 Release 附件**读取 ZIP 名称与 SHA-256。向 [`Toskan4134/maker-studio-mods`](https://github.com/Toskan4134/maker-studio-mods) 提交 PR：只更新 `index.json` 中现有 ID 的 `version`、`assetName`、`sha256` 等本次确需变动的字段与顶层 `updatedAt`，不要新增同 ID 条目。
6. 检查 PR 的自动验证。PR 由 Maker Studio 维护者审核与合并；本流程不会自行合并。

推送标签是对外发布的触发动作。不要在代码、版本号、权限或更新说明尚未确认时推送标签。官方模板保留了可选的自动创建注册表 PR 配置；它需要仓库所有者自行设置 `REGISTRY_PAT` 与注册表 fork，目前未启用，也不影响自动打包和 Release 发布。

## Future releases

Update the code, manifest version, release notes, and changelog; run the checks and push the commit. After reviewing the release, push the matching `vX.Y.Z` tag. The official-template workflow verifies and publishes the ZIP and checksum. Use the actual Release asset and hash in a PR that updates the existing Marketplace entry. The maintainer reviews and merges that PR.
