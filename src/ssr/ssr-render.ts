/**
 * SSR render functions for Inertia.
 * 
 * These are used as the entry point for SSR bundles. The bundle is evaluated 
 * by the Go server's JS runtime (QuickJS/Goja/V8go) and the exported functions
 * are called via `module.exports.inertiaRenderComponent(name, jsonProps)`.
 * 
 * Usage in project's ssr-render.ts:
 *   import { createSSRRender } from 'millken-inertia-vue/ssr-render'
 *   import ssrModules from './ssr-modules'
 *   const { inertiaRenderComponent, inertiaRenderTemplate } = createSSRRender(ssrModules)
 *   export { inertiaRenderComponent, inertiaRenderTemplate }
 */
import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h, type Component } from 'vue'

type PropRecord = Record<string, any>
type ModulesMap = Record<string, Component>

function parseProps(input?: PropRecord | string): PropRecord {
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (parsed && typeof parsed === 'object') return parsed as PropRecord
      return {}
    } catch (e: any) {
      throw new Error(`Invalid JSON props: ${e?.message ?? e}`)
    }
  }
  return (input ?? {}) as PropRecord
}

export function createSSRRender(modules: ModulesMap) {
  async function inertiaRenderComponent(
    componentName: string,
    props?: PropRecord | string,
  ): Promise<string> {
    const component = modules[componentName]
    if (!component) {
      throw new Error(`Component "${componentName}" not found`)
    }
    const parsedProps = parseProps(props)
    const app = createSSRApp({
      render() {
        return h(component, parsedProps)
      },
    })
    return renderToString(app)
  }

  async function inertiaRenderTemplate(
    template: string,
    props?: PropRecord | string,
  ): Promise<string> {
    const parsedProps = parseProps(props)
    const tempComponent = {
      template,
      data: () => parsedProps,
    }
    const app = createSSRApp({
      render() {
        return h(tempComponent)
      },
    })
    return renderToString(app)
  }

  return { inertiaRenderComponent, inertiaRenderTemplate }
}
