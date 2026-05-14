# millken-inertia-vue

Vue 3 SSR toolkit for [Inertia Go framework](https://github.com/millken/inertia), compatible with QuickJS, Goja, and V8go JS runtimes.

## Background

在 Go + Vue SSR 项目中，每次新建项目都需要复制大量模板代码：SSR 构建脚本（~120 行）、SSR 渲染入口（~50 行）、客户端启动代码（~35 行）、PJAX 导航、模块生成脚本等。本包将这些基础设施封装为可复用的 npm 包，使新项目只需 **3 个小文件**即可上手。

### 为什么需要 QuickJS polyfills？

Vue 3.5.26+ 的依赖 `entities@7` 使用 base64 编码的 HTML 实体数据，解码时走如下分支:

```js
typeof atob == "function" ? atob(s) : Buffer.from(s, "base64")...
```

QuickJS 既没有浏览器的 `atob`/`btoa`，也没有 Node.js 的 `Buffer`，因此 `typeof Buffer.from` 会抛出 `ReferenceError`。本包通过 esbuild `banner` 注入一个最小 `Buffer.from(s, 'base64')` polyfill（基于纯 JS base64 解码），让 `entities@7` 在 QuickJS 下也能正确还原 HTML 实体表。

> **注意**: Vue ≤3.5.25 使用 `entities@4`（Unicode 转义字符串），不需要 polyfill。Vue ≥3.5.26 使用 `entities@7`（base64），必须 polyfill。仓库内 [tests/quickjs.integration.test.ts](tests/quickjs.integration.test.ts) 在 `quickjs-emscripten` 中跑通了一个真实 SSR bundle 以验证此路径。

## Features

- **SSR Build Config** — 预配置 esbuild 选项，内置 QuickJS `Buffer.from` polyfill + Vue 编译时优化
- **SSR Render** — `createSSRRender(modules)` 一行创建 SSR 渲染函数
- **Client Runtime** — View loader、PJAX 导航、boot 启动函数
- **Module Generation** — CLI 扫描 `pages/` 自动生成模块注册文件
- **Zero Config** — 默认配置开箱即用，支持自定义覆盖

## Installation

要求 Node ≥ 20、Vue ≥ 3.5.0 < 4、esbuild ^0.25。

```bash
pnpm add millken-inertia-vue
pnpm add -D esbuild millken-esbuild-plugin-vue
```

## Project Structure

使用本包后，新项目的 `frontend/` 目录结构如下：

```
frontend/
├── pages/                    # Vue 页面组件（按约定组织）
│   ├── App.vue
│   ├── index/
│   │   ├── index.vue
│   │   ├── show.vue
│   │   └── edit.vue
│   └── ...
├── src/
│   ├── main.ts              # 客户端入口（4 行）
│   └── inertia/
│       ├── modules.ts        # 自动生成 — 异步客户端模块
│       ├── Link.vue          # PJAX 链接组件（本地保留）
│       └── pjax-loader.ts    # PJAX 导航（本地保留）
├── ssr-build.ts              # SSR 构建脚本（~10 行）
├── ssr-esm-render.ts         # SSR 渲染入口（5 行）
├── ssr-modules.ts            # 自动生成 — 同步 SSR 模块
├── package.json
└── vite.config.ts
```

## Quick Start

### 1. Generate module registries

```bash
npx inertia-vue generate
```

扫描 `pages/` 目录，自动生成两个文件：
- `src/inertia/modules.ts` — 异步 import（客户端代码分割）
- `ssr-modules.ts` — 同步 import（SSR 一次性打包）

### 2. Client entry (`src/main.ts`)

```ts
import { boot } from 'millken-inertia-vue'
import { modules } from './inertia/modules'

boot(modules, {
  // el: '#app',                // 默认 '#app'
  // pjax: true,                // 默认开启；调用 enablePjax()
  // setup: ({ app }) => {      // 在 mount 前注入插件、provide 等
  //   app.use(myPlugin)
  // },
})
```

`boot()` 会自动读取 `#app` 元素上的 `data-page` 或 `window.__INERTIA_PAGE_DATA__`，解析 `_ViEW_` 字段确定要渲染的组件，首次挂载走 `createSSRApp` + hydration，后续 PJAX 跳转走 `createApp`。

### 3. SSR render entry (`ssr-esm-render.ts`)

```ts
import { createSSRRender } from 'millken-inertia-vue/ssr-render'
import ssrModules from './ssr-modules'

const { inertiaRenderComponent, inertiaRenderTemplate } = createSSRRender(ssrModules, {
  // setup: ({ app }) => {     // SSR 侧也支持插件注入
  //   app.use(myI18n)
  // },
})
export { inertiaRenderComponent, inertiaRenderTemplate }
```

打包后 Go 服务端通过 JS 运行时调用：
```js
module.exports.inertiaRenderComponent("index/index", '{"posts": [...]}')
```

### 4. SSR build script (`ssr-build.ts`)

```ts
import { build } from 'esbuild'
import { createSSRBuildOptions } from 'millken-inertia-vue/ssr-build'
import vuePlugin from 'millken-esbuild-plugin-vue'

build(createSSRBuildOptions({
  entryPoints: ['./ssr-esm-render.ts'],
  plugins: [vuePlugin()],
})).then(() => {
  console.log('SSR build completed!')
}).catch((err) => {
  console.error('SSR build failed:', err)
  process.exit(1)
})
```

运行：
```bash
npx tsx ssr-build.ts
```

输出 `dist/ssr-render-cjs.js`，供 Go 服务端加载到 JS 运行时。

### 5. package.json scripts

```json
{
  "scripts": {
    "generate": "inertia-vue generate",
    "build:ssr": "npx tsx ssr-build.ts",
    "build:pages": "vite build --config inertia.vite.config.ts && npx tsx ssr-build.ts"
  },
  "dependencies": {
    "millken-inertia-vue": "^0.2.0",
    "vue": "^3.5.29"
  },
  "devDependencies": {
    "esbuild": "^0.25.0",
    "millken-esbuild-plugin-vue": "^0.9.4"
  }
}
```

## API Reference

### SSR Build (`millken-inertia-vue/ssr-build`)

#### `createSSRBuildOptions(options): Record<string, any>`

生成 esbuild `BuildOptions` 对象。项目自行调用 `esbuild.build()`，避免 linked package 时依赖解析问题。

**参数 (`SSRBuildUserOptions`)**:

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `entryPoints` | `string[]` | `['./ssr-render.ts']` | 入口文件 |
| `outfile` | `string` | `'dist/ssr-render-cjs.js'` | 输出文件路径 |
| `plugins` | `any[]` | **必填** | esbuild 插件（至少包含 vuePlugin） |
| `alias` | `Record<string, string>` | `{ '@': './src', '~': './src', '@pages': './pages', '~pages': './pages' }` | 路径别名（与默认值合并） |
| `define` | `Record<string, string>` | Vue 编译时常量 | 额外的 define 值（与 Vue 默认值合并） |
| `minify` | `boolean` | `true` | 启用 minifyWhitespace + minifyIdentifiers + minifySyntax |
| `esbuildOptions` | `Record<string, any>` | `{}` | 任意额外 esbuild 选项（覆盖所有默认值） |

**默认 Vue defines**:
```ts
__VUE_OPTIONS_API__: 'false'
__VUE_PROD_DEVTOOLS__: 'false'
__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
__VUE_FEATURE_SUSPENSE__: 'false'
__VUE_FEATURE_TELEPORT__: 'false'
__VUE_FEATURE_TRANSITION__: 'false'
__VUE_FEATURE_KEEP_ALIVE__: 'false'
__VUE_FEATURE_SCOPED_SLOT__: 'false'
'process.env.NODE_ENV': '"production"'
'process.env.VUE_ENV': '"server"'
```

#### `quickjsPolyfills: string`

QuickJS 的 `Buffer.from('...', 'base64')` polyfill 字符串。已自动注入到 `createSSRBuildOptions` 的 `banner.js` 中，一般不需要手动使用。

### Constants (`millken-inertia-vue/constants`)

与 Go 端共享的协议常量，便于自定义 SSR/客户端代码时复用：

```ts
import { INERTIA_VIEW_KEY, INERTIA_DATA_PLACEHOLDER } from 'millken-inertia-vue/constants'
```

### SSR Render (`millken-inertia-vue/ssr-render`)

#### `createSSRRender(modules: Record<string, Component>)`

传入同步模块映射，返回：

- `inertiaRenderComponent(name: string, props?: object | string): Promise<string>` — 渲染指定组件
- `inertiaRenderTemplate(template: string, props?: object | string): Promise<string>` — 渲染模板字符串

`props` 可以是对象或 JSON 字符串（Go 服务端传 JSON 字符串）。

### Client Runtime (`millken-inertia-vue`)

| 函数 | 说明 |
|---|---|
| `boot(modules, opts?)` | 启动客户端应用；`opts: { el?, pjax?, setup? }` |
| `initModules(modules, opts?)` | 设置异步模块映射，可注入 `setup({ app })` 钩子 |
| `mountView(name, props, el?, opts?)` | 加载并挂载指定视图；`opts.hydrate=true` 时走 SSR hydration |
| `hasView(name)` | 检查视图是否存在 |
| `loadView(name)` | 加载视图组件（带缓存） |
| `clearViewCache()` | 清空视图缓存（HMR/测试用） |
| `getCurrentApp()` | 获取当前 Vue App 实例 |
| `unmountCurrentApp()` | 卸载当前 App |
| `enablePjax()` | 注册一次性的 popstate 监听（`boot()` 默认已调用） |
| `pjaxClick(el)` | 给 `<a>` 元素附加 PJAX 行为，返回 `{ destroy() }` 用于解绑 |
| `InertiaLink` | `<InertiaLink href="/x">…</InertiaLink>`，自动挂载/卸载 PJAX 绑定 |

## CLI

```bash
# 生成模块注册文件
npx inertia-vue generate [pagesDir] [clientOutput] [ssrOutput]

# 默认等价于：
npx inertia-vue generate pages src/inertia/modules.ts ssr-modules.ts

# 执行 SSR 构建（调用项目的 ssr-build.ts）
npx inertia-vue build-ssr
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Go Server (github.com/millken/inertia)                  │
│                                                         │
│  handler: c.Render("index/index", data)                 │
│           ↓                                             │
│  ssr.RenderComponent("index/index", jsonProps)           │
│           ↓                                             │
│  JS Runtime (QuickJS / Goja / V8go)                     │
│    eval(bundleJS)                                       │
│    module.exports.inertiaRenderComponent(name, props)   │
│           ↓                                             │
│  Returns HTML string → embedded in response             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Build Time (esbuild)                                    │
│                                                         │
│  ssr-build.ts                                           │
│    → createSSRBuildOptions() from millken-inertia-vue   │
│    → esbuild.build(options)                             │
│    → dist/ssr-render-cjs.js (CJS bundle with polyfills) │
│                                                         │
│  vite build (client)                                    │
│    → dist/main.js + chunks (code-splitting)             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Client Side                                             │
│                                                         │
│  boot(modules) → read __INERTIA_PAGE_DATA__             │
│    → mountView(viewName, props)                         │
│    → Vue hydration / mount                              │
│                                                         │
│  PJAX Navigation:                                       │
│    Link click → fetch JSON → mountView(newView, props)  │
│    → history.pushState → no full page reload            │
└─────────────────────────────────────────────────────────┘
```

## Compatibility

| JS Runtime | 状态 | 说明 |
|---|---|---|
| QuickJS (buke/quickjs-go) | ✅ 已验证（CI 通过 quickjs-emscripten 集成测试覆盖） | 需要 `Buffer.from` polyfill（本包自动注入） |
| Goja | ✅ 应兼容 | CJS `module.exports` 协议相同 |
| V8go | ✅ 应兼容 | 同上 |

| Vue 版本 | 状态 | 说明 |
|---|---|---|
| 3.5.0 ~ 3.5.25 | ✅ | `entities@4`，不需要 polyfill（但注入不影响） |
| 3.5.26+ | ✅ | `entities@7`，必须有 atob polyfill |

## License

MIT
