import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'runtime/index': 'src/runtime/index.ts',
    'runtime/constants': 'src/runtime/constants.ts',
    'ssr/ssr-render': 'src/ssr/ssr-render.ts',
    'ssr/build': 'src/ssr/build.ts',
    'ssr/polyfills': 'src/ssr/polyfills.ts',
    'scripts/generate': 'src/scripts/generate.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Vue is a peer dep — never inline it.
  external: ['vue', 'vue/server-renderer', 'esbuild', 'millken-esbuild-plugin-vue'],
  splitting: false,
  treeshake: true,
  target: 'node20',
  outDir: 'dist',
})
