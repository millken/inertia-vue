/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { createSSRRender } from '../src/ssr/ssr-render'

const Hello = defineComponent({
  props: { name: { type: String, default: 'world' } },
  setup(props) {
    return () => h('p', `hello ${props.name}`)
  },
})

describe('createSSRRender', () => {
  it('renders a registered component with object props', async () => {
    const { inertiaRenderComponent } = createSSRRender({ Hello })
    const html = await inertiaRenderComponent('Hello', { name: 'go' })
    expect(html).toBe('<p>hello go</p>')
  })

  it('parses JSON-string props', async () => {
    const { inertiaRenderComponent } = createSSRRender({ Hello })
    const html = await inertiaRenderComponent('Hello', '{"name":"json"}')
    expect(html).toBe('<p>hello json</p>')
  })

  it('throws for unknown component', async () => {
    const { inertiaRenderComponent } = createSSRRender({})
    await expect(inertiaRenderComponent('Missing')).rejects.toThrow(/not found/)
  })

  it('invokes setup hook on each rendered app', async () => {
    let calls = 0
    const { inertiaRenderComponent } = createSSRRender(
      { Hello },
      { setup: () => { calls++ } },
    )
    await inertiaRenderComponent('Hello')
    await inertiaRenderComponent('Hello')
    expect(calls).toBe(2)
  })

  it('renders inline templates', async () => {
    const { inertiaRenderTemplate } = createSSRRender({})
    const html = await inertiaRenderTemplate('<span>{{ msg }}</span>', { msg: 'ok' })
    expect(html).toBe('<span>ok</span>')
  })
})
