import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { boot } from '../src/runtime/boot'
import { unmountCurrentApp, clearViewCache } from '../src/runtime/view-loader'
import { INERTIA_DATA_PLACEHOLDER, INERTIA_VIEW_KEY } from '../src/runtime/constants'

const Foo = defineComponent({
  props: { msg: { type: String, default: '' } },
  setup(p) {
    return () => h('div', { class: 'foo' }, p.msg)
  },
})

beforeEach(() => {
  unmountCurrentApp()
  clearViewCache()
  document.body.innerHTML = '<div id="app"></div>'
  delete (window as any).__INERTIA_PAGE_DATA__
})

describe('boot', () => {
  it('reads page data from window.__INERTIA_PAGE_DATA__ and mounts the view', async () => {
    ;(window as any).__INERTIA_PAGE_DATA__ = JSON.stringify({
      [INERTIA_VIEW_KEY]: 'Foo',
      msg: 'from window',
    })
    boot({ Foo: async () => ({ default: Foo }) }, { pjax: false })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(document.querySelector('.foo')?.textContent).toBe('from window')
  })

  it('reads page data from data-page attribute when present', async () => {
    const root = document.getElementById('app')!
    root.dataset.page = JSON.stringify({ [INERTIA_VIEW_KEY]: 'Foo', msg: 'from attr' })
    boot({ Foo: async () => ({ default: Foo }) }, { pjax: false })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(document.querySelector('.foo')?.textContent).toBe('from attr')
  })

  it('falls back to default view name "App" when key missing', async () => {
    ;(window as any).__INERTIA_PAGE_DATA__ = '{}'
    boot({ App: async () => ({ default: Foo }) }, { pjax: false })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(document.querySelector('.foo')).not.toBeNull()
  })

  it('treats the SSR placeholder as no data', async () => {
    ;(window as any).__INERTIA_PAGE_DATA__ = INERTIA_DATA_PLACEHOLDER
    boot({ App: async () => ({ default: Foo }) }, { pjax: false })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(document.querySelector('.foo')).not.toBeNull()
  })

  it('logs and falls back when JSON is malformed', async () => {
    ;(window as any).__INERTIA_PAGE_DATA__ = '{not json'
    boot({ App: async () => ({ default: Foo }) }, { pjax: false })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    // Should still mount default 'App' view.
    expect(document.querySelector('.foo')).not.toBeNull()
  })
})
