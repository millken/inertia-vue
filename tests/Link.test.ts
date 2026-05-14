import { describe, it, expect, beforeEach } from 'vitest'
import { createApp, h } from 'vue'
import InertiaLink from '../src/runtime/Link'

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe('InertiaLink', () => {
  it('renders an <a> by default and passes through slot', () => {
    const app = createApp({
      render() {
        return h(InertiaLink, { href: '/foo' }, () => 'click me')
      },
    })
    app.mount('#app')
    const a = document.querySelector('a')
    expect(a).not.toBeNull()
    expect(a!.textContent).toBe('click me')
    app.unmount()
  })

  it('honors the tag prop', () => {
    const app = createApp({
      render() {
        return h(InertiaLink, { tag: 'span' }, () => 'x')
      },
    })
    app.mount('#app')
    expect(document.querySelector('span')).not.toBeNull()
    expect(document.querySelector('a')).toBeNull()
    app.unmount()
  })

  it('attaches the PJAX binding on mount and removes it on unmount', () => {
    // Full PJAX click semantics live in pjax-loader.test.ts. Here we just prove
    // that mounting/unmounting InertiaLink wires/unwires the listener.
    const app = createApp({
      render() {
        return h(InertiaLink, { href: window.location.origin + '/x' }, () => 'go')
      },
    })
    app.mount('#app')
    const a = document.querySelector('a') as HTMLAnchorElement & { __pjaxBound?: boolean }
    expect(a.__pjaxBound).toBe(true)
    app.unmount()
    expect(a.__pjaxBound).toBe(false)
  })
})
