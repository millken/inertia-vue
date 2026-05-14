import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { enablePjax, pjaxClick } from '../src/runtime/pjax-loader'
import {
  initModules,
  unmountCurrentApp,
  clearViewCache,
} from '../src/runtime/view-loader'

const Foo = defineComponent({
  props: { msg: { type: String, default: '' } },
  setup(p) {
    return () => h('div', { class: 'foo' }, p.msg)
  },
})

function makeAnchor(href: string): HTMLAnchorElement {
  const a = document.createElement('a')
  a.href = href
  document.body.appendChild(a)
  return a
}

beforeEach(() => {
  unmountCurrentApp()
  clearViewCache()
  initModules({ Foo: async () => ({ default: Foo }) })
  document.body.innerHTML = '<div id="app"></div>'
  enablePjax() // idempotent
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pjax-loader', () => {
  it('pjaxClick is idempotent — second call on same element returns undefined', () => {
    const a = makeAnchor(window.location.origin + '/page')
    const first = pjaxClick(a)
    expect(first).toBeDefined()
    const second = pjaxClick(a)
    expect(second).toBeUndefined()
  })

  it('skips fragment-only hrefs', () => {
    const a = document.createElement('a')
    a.setAttribute('href', '#anchor')
    document.body.appendChild(a)
    expect(pjaxClick(a)).toBeUndefined()
  })

  it('PJAX fetch returning {redirect} triggers location change WITHOUT mounting view', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      redirected: false,
      json: async () => ({ redirect: '/elsewhere' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    // Track location.href writes via a property descriptor on a fake.
    const navigations: string[] = []
    const origLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...origLocation,
        get href() { return origLocation.href },
        set href(v: string) { navigations.push(v) },
        get protocol() { return origLocation.protocol },
        get host() { return origLocation.host },
      },
    })

    try {
      const a = makeAnchor(origLocation.origin + '/somewhere')
      pjaxClick(a)
      a.click()
      // Wait microtasks
      await new Promise((r) => setTimeout(r, 0))

      expect(fetchMock).toHaveBeenCalledOnce()
      expect(navigations).toEqual(['/elsewhere'])
      // No view was mounted: #app stays empty.
      expect(document.getElementById('app')!.innerHTML).toBe('')
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: origLocation })
    }
  })

  it('PJAX fetch returning view data mounts the view and pushes history', async () => {
    const payload = { _ViEW_: 'Foo', msg: 'pjax!' }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      redirected: false,
      json: async () => payload,
    })
    vi.stubGlobal('fetch', fetchMock)
    const pushSpy = vi.spyOn(window.history, 'pushState')

    const a = makeAnchor(window.location.origin + '/foo')
    pjaxClick(a)
    a.click()
    await new Promise((r) => setTimeout(r, 0))
    // mountView is async; give it another tick.
    await new Promise((r) => setTimeout(r, 0))

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(pushSpy).toHaveBeenCalledOnce()
    expect(document.querySelector('.foo')?.textContent).toBe('pjax!')
  })
})
