import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import {
  initModules,
  hasView,
  loadView,
  mountView,
  unmountCurrentApp,
  clearViewCache,
  getCurrentApp,
} from '../src/runtime/view-loader'

const Foo = defineComponent({
  props: { msg: { type: String, default: '' } },
  setup(p) {
    return () => h('div', { class: 'foo' }, p.msg)
  },
})

const Bar = defineComponent({
  setup() {
    return () => h('span', { class: 'bar' }, 'bar')
  },
})

beforeEach(() => {
  unmountCurrentApp()
  clearViewCache()
  initModules({})
  document.body.innerHTML = '<div id="app"></div>'
})

describe('view-loader', () => {
  it('hasView reflects registered modules', () => {
    initModules({ Foo: async () => ({ default: Foo }) })
    expect(hasView('Foo')).toBe(true)
    expect(hasView('Missing')).toBe(false)
  })

  it('loadView caches resolved components', async () => {
    let calls = 0
    initModules({
      Foo: async () => {
        calls++
        return { default: Foo }
      },
    })
    await loadView('Foo')
    await loadView('Foo')
    expect(calls).toBe(1)
  })

  it('mountView renders into #app and replaces previous app', async () => {
    initModules({
      Foo: async () => ({ default: Foo }),
      Bar: async () => ({ default: Bar }),
    })
    await mountView('Foo', { msg: 'hi' })
    const root = document.getElementById('app')!
    expect(root.querySelector('.foo')?.textContent).toBe('hi')
    expect(getCurrentApp()).not.toBeNull()

    await mountView('Bar')
    expect(root.querySelector('.foo')).toBeNull()
    expect(root.querySelector('.bar')).not.toBeNull()
  })

  it('throws for unknown view', async () => {
    await expect(mountView('Nope')).rejects.toThrow(/not found/)
  })

  it('setup hook receives every Vue App created', async () => {
    let appsSeen = 0
    initModules(
      { Foo: async () => ({ default: Foo }) },
      { setup: () => { appsSeen++ } },
    )
    await mountView('Foo')
    await mountView('Foo')
    expect(appsSeen).toBe(2)
  })

  it('hydrate mode keeps SSR markup instead of wiping it', async () => {
    initModules({ Foo: async () => ({ default: Foo }) })
    const root = document.getElementById('app')!
    // Pre-existing SSR markup must match the component output exactly,
    // otherwise Vue would warn and replace it.
    root.innerHTML = '<div class="foo">ssr</div>'
    await mountView('Foo', { msg: 'ssr' }, root, { hydrate: true })
    // With hydrate=true the existing node should be reused (not wiped).
    expect(root.querySelector('.foo')?.textContent).toBe('ssr')
  })
})
