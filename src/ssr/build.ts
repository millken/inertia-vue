/**
 * Reusable SSR build function for esbuild.
 * 
 * Merges user-provided options with sensible defaults for Vue SSR
 * targeting QuickJS/Goja/V8go runtimes.
 */
import { build, type BuildOptions } from 'esbuild'
import { quickjsPolyfills } from './polyfills'

export interface SSRBuildOptions {
  /** Entry point file (default: './ssr-render.ts') */
  entryPoints?: string[]
  /** Output file path (default: 'dist/ssr-render-cjs.js') */
  outfile?: string
  /** Additional esbuild plugins (vuePlugin is required) */
  plugins: any[]
  /** Path aliases (merged with defaults) */
  alias?: Record<string, string>
  /** Additional esbuild define values (merged with Vue defaults) */
  define?: Record<string, string>
  /** Enable minification (default: true for syntax/whitespace/identifiers) */
  minify?: boolean
  /** Any additional esbuild options to merge */
  esbuildOptions?: Partial<BuildOptions>
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

export async function buildSSR(options: SSRBuildOptions): Promise<void> {
  const {
    entryPoints = ['./ssr-render.ts'],
    outfile = 'dist/ssr-render-cjs.js',
    plugins,
    alias = {},
    define = {},
    minify = true,
    esbuildOptions = {},
  } = options

  const buildOptions: BuildOptions = {
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

  await build(buildOptions)
}
