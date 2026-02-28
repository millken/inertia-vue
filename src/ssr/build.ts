/**
 * Reusable SSR build configuration for esbuild.
 * 
 * Returns a complete esbuild BuildOptions object with sensible defaults
 * for Vue SSR targeting QuickJS/Goja/V8go runtimes.
 * 
 * The project calls esbuild.build() itself — this avoids peer dependency
 * resolution issues with linked packages.
 */
import path from 'node:path'
import { quickjsPolyfills } from './polyfills'

export interface SSRBuildUserOptions {
  /** Entry point file (default: './ssr-render.ts') */
  entryPoints?: string[]
  /** Output file path (default: 'dist/ssr-render-cjs.js') */
  outfile?: string
  /** esbuild plugins (vuePlugin is required) */
  plugins: any[]
  /** Path aliases (merged with defaults) */
  alias?: Record<string, string>
  /** Additional esbuild define values (merged with Vue defaults) */
  define?: Record<string, string>
  /** Enable minification (default: true for syntax/whitespace/identifiers) */
  minify?: boolean
  /** Any additional esbuild options to merge */
  esbuildOptions?: Record<string, any>
}

const defaultAlias: Record<string, string> = {
  '@': './src',
  '~': './src',
  '@pages': './pages',
  '~pages': './pages',
}

const vueDefines: Record<string, string> = {
  __VUE_OPTIONS_API__: 'false',
  __VUE_PROD_DEVTOOLS__: 'false',
  __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  __VUE_FEATURE_SUSPENSE__: 'false',
  __VUE_FEATURE_TELEPORT__: 'false',
  __VUE_FEATURE_TRANSITION__: 'false',
  __VUE_FEATURE_KEEP_ALIVE__: 'false',
  __VUE_FEATURE_SCOPED_SLOT__: 'false',
  'process.env.NODE_ENV': '"production"',
  'process.env.VUE_ENV': '"server"',
}

/**
 * Create esbuild options for SSR builds.
 * 
 * Usage:
 *   import { build } from 'esbuild'
 *   import { createSSRBuildOptions } from 'millken-inertia-vue/ssr-build'
 *   build(createSSRBuildOptions({ plugins: [vuePlugin()] }))
 */
export function createSSRBuildOptions(options: SSRBuildUserOptions): Record<string, any> {
  const {
    entryPoints = ['./ssr-render.ts'],
    outfile = 'dist/ssr-render-cjs.js',
    plugins,
    alias = {},
    define = {},
    minify = true,
    esbuildOptions = {},
  } = options

  return {
    entryPoints,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
    plugins,

    // QuickJS polyfills (atob/btoa)
    banner: { js: quickjsPolyfills },

    resolveExtensions: ['.vue', '.js', '.ts'],
    alias: { ...defaultAlias, ...alias },

    // Resolve packages from the project's node_modules (needed for linked packages)
    nodePaths: [path.resolve(process.cwd(), 'node_modules')],

    // Minification
    minify: false,
    treeShaking: false,
    minifyWhitespace: minify,
    minifyIdentifiers: minify,
    minifySyntax: minify,

    // Vue + user defines
    define: { ...vueDefines, ...define },

    target: ['es2020', 'node16'],
    sourcemap: false,
    metafile: false,
    write: true,
    dropLabels: ['DEV', 'DEBUG', 'TEST'],
    keepNames: false,
    legalComments: 'none',
    charset: 'utf8',
    conditions: ['node', 'import'],

    // Allow user overrides
    ...esbuildOptions,
  }
}
