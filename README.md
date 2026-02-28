# @millken/inertia-vue

Vue 3 SSR toolkit for [Inertia Go framework](https://github.com/millken/inertia), compatible with QuickJS, Goja, and V8go runtimes.

## Features

- **SSR Build**: Pre-configured esbuild setup with QuickJS polyfills (atob/btoa) and Vue optimizations
- **Client Runtime**: View loader, PJAX navigation, Link component, and boot function
- **Module Generation**: CLI to scan `pages/` and auto-generate module registries
- **Zero Config**: Sensible defaults, everything works out of the box

## Installation

```bash
pnpm add @millken/inertia-vue
pnpm add -D esbuild millken-esbuild-plugin-vue
```

## Quick Start

### 1. Generate module registries

```bash
npx inertia-vue generate
```

This scans `pages/` and generates:
- `src/inertia/modules.ts` — async imports for client
- `ssr-modules.ts` — sync imports for SSR

### 2. Client entry (`src/main.ts`)

```ts
import { boot } from '@millken/inertia-vue'
import { modules } from './inertia/modules'

boot(modules)
```

### 3. SSR render entry (`ssr-render.ts`)

```ts
import { createSSRRender } from '@millken/inertia-vue/ssr-render'
import ssrModules from './ssr-modules'

const { inertiaRenderComponent, inertiaRenderTemplate } = createSSRRender(ssrModules)
export { inertiaRenderComponent, inertiaRenderTemplate }
```

### 4. SSR build script (`ssr-build.ts`)

```ts
import { buildSSR } from '@millken/inertia-vue/ssr-build'
import vuePlugin from 'millken-esbuild-plugin-vue'

buildSSR({
  plugins: [vuePlugin()],
  // Optional: customize aliases, defines, etc.
})
```

Run:
```bash
npx tsx ssr-build.ts
```

### 5. Use Link component in pages

```vue
<template>
  <Link href="/about">About</Link>
</template>

<script setup>
import { Link } from '@millken/inertia-vue'
</script>
```

## API

### SSR Build (`@millken/inertia-vue/ssr-build`)

- `buildSSR(options)` — Build SSR bundle with esbuild
- `quickjsPolyfills` — atob/btoa polyfill string for QuickJS

### SSR Render (`@millken/inertia-vue/ssr-render`)

- `createSSRRender(modules)` — Returns `{ inertiaRenderComponent, inertiaRenderTemplate }`

### Client Runtime (`@millken/inertia-vue`)

- `boot(modules, el?)` — Bootstrap the client app
- `initModules(modules)` — Set the modules map
- `mountView(name, props, el?)` — Mount a view component
- `hasView(name)` — Check if a view exists
- `loadView(name)` — Load a view component
- `Link` — PJAX link component
- `pjaxClick(el)` — Attach PJAX behavior to an anchor element

## CLI

```bash
npx inertia-vue generate [pagesDir] [clientOutput] [ssrOutput]
npx inertia-vue build-ssr
```

## License

MIT
