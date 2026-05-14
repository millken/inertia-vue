import { describe, it, expect } from 'vitest'
import { createSSRBuildOptions } from '../src/ssr/build'
import { quickjsPolyfills } from '../src/ssr/polyfills'

describe('createSSRBuildOptions', () => {
  it('returns options carrying the QuickJS polyfill banner', () => {
    const opts = createSSRBuildOptions({ plugins: [] })
    expect(opts.banner?.js).toBe(quickjsPolyfills)
    expect(opts.banner?.js).toContain('Buffer')
  })

  it('defaults to CJS Node platform', () => {
    const opts = createSSRBuildOptions({ plugins: [] })
    expect(opts.platform).toBe('node')
    expect(opts.format).toBe('cjs')
    expect(opts.bundle).toBe(true)
  })

  it('minify=true enables both minify and treeShaking', () => {
    const opts = createSSRBuildOptions({ plugins: [], minify: true })
    expect(opts.minify).toBe(true)
    expect(opts.treeShaking).toBe(true)
  })

  it('minify=false disables both minify and treeShaking', () => {
    const opts = createSSRBuildOptions({ plugins: [], minify: false })
    expect(opts.minify).toBe(false)
    expect(opts.treeShaking).toBe(false)
  })

  it('user define merges over Vue defaults', () => {
    const opts = createSSRBuildOptions({
      plugins: [],
      define: { __VUE_OPTIONS_API__: 'true', MY_FLAG: '1' },
    })
    expect(opts.define!.__VUE_OPTIONS_API__).toBe('true')
    expect(opts.define!.MY_FLAG).toBe('1')
    expect(opts.define!.__VUE_PROD_DEVTOOLS__).toBe('false')
  })

  it('user esbuildOptions override base defaults', () => {
    const opts = createSSRBuildOptions({
      plugins: [],
      esbuildOptions: { format: 'esm', target: ['es2022'] },
    })
    expect(opts.format).toBe('esm')
    expect(opts.target).toEqual(['es2022'])
  })

  it('does not have any side effect (no autoGenerate)', () => {
    // Smoke check: calling the factory with no generateOptions must not throw,
    // even when no pages/ exists in cwd.
    expect(() => createSSRBuildOptions({ plugins: [] })).not.toThrow()
  })
})
