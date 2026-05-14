# Changelog

## 0.2.0-rc.0

### Breaking

- **发布产物**：包改为 tsup 预编译为 `dist/`，`exports.*` 与 `files` 不再发布 `src/`。下游通过子路径（`millken-inertia-vue`、`/ssr-render`、`/ssr-build`、`/constants`、`/generate`）按需引入即可，无需 TS 直接消费源码。
- **Node**：`engines.node` 收紧到 `>=20`。
- **peerDependencies**：`vue` 收紧到 `>=3.5.0 <4`，`esbuild` 收紧到 `^0.25.0`。
- **`createSSRBuildOptions(opts)`** 改为纯函数，去除内部隐式调用 `generateModules` 的 `autoGenerate` 行为；构建管线请显式调用 `inertia-vue generate`（CLI 或 `scripts/generate`）。
- **`boot(modules, opts?)`** 第二参数改为 `BootOptions`（`{ el?, pjax?, setup? }`），不再是裸 selector 字符串。
- **`mountView(name, props, el?, opts?)`** 新增第四参数 `MountViewOptions`，`opts.hydrate=true` 触发 `createSSRApp(...).mount(target, true)`。

### Added

- 新增子路径导出：`millken-inertia-vue/constants`（`INERTIA_VIEW_KEY` / `INERTIA_DATA_PLACEHOLDER`）、`millken-inertia-vue/generate`（编程式调用模块生成）。
- 新增 `clearViewCache()`、`enablePjax()` 公共 API。
- `initModules` / `createSSRRender` / `boot` 全部接受 `setup({ app })` 钩子，便于注入 Vue 插件、provide 全局值。
- `InertiaLink` 改为手写 `defineComponent` + render fn，下游无需 SFC 编译器即可使用；mount/unmount 时自动管理 `pjaxClick` 绑定。
- 新增 Vitest 测试套件（39 个测试，9 个文件），覆盖 parseProps / ssr-render / view-loader / pjax-loader / boot / build-options / generate / Link 以及 QuickJS 端到端集成（`quickjs-emscripten` 加载真实 bundle 并断言 SSR HTML 输出）。
- 新增 GitHub Actions CI：Node 20 / 22 × Vue 3.5.0 / 3.5.25 / 3.5.26 / latest 矩阵跑 typecheck + test + build。

### Fixed

- **PJAX 重定向**：`data.redirect` 优先于 view 渲染，先 return 再赋 `location.href`，避免渲染后立即跳走的双闪。
- **`__pjaxBound` 真正写入 anchor**：避免重复绑定 click handler 触发多次 fetch。
- **首次挂载使用 hydration**：`boot()` 第一次挂载走 `createSSRApp + mount(target, true)`，与服务端 SSR HTML 对齐，消除 hydration mismatch warning。
- **生成器路径转义**：`scripts/generate` 与 `bin/cli.mjs` 中 path / view 名一律 `JSON.stringify`，避免文件名含 `'` 等字符时产生非法 JS。
- **`createSSRBuildOptions` 的 `minify`**：现在同时控制 `minify` 与 `treeShaking`，行为一致。
- 抽出 `parseProps` 为独立可测试函数。

### Changed

- `Link.vue` → `Link.ts`（手写 render-function 组件），`@vitejs/plugin-vue` 不再是包自身依赖。
- `pjax-loader` 内部 `history` 重命名为 `histRef`，`popstate` 监听改为 `enablePjax()` 懒注册，避免在 SSR/未启用场景下产生副作用。
- `quickjsPolyfills` 由原来的 `atob`/`btoa` 字符串方案，替换为更通用的 `Buffer.from(..., 'base64')` polyfill，覆盖 `entities@7` 真实使用路径。
