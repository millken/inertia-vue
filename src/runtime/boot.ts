import { mountView, initModules } from './view-loader'

interface PageData {
  _ViEW_?: string
  [key: string]: any
}

/**
 * Bootstrap the Inertia client app.
 * Call this in your main.ts with the modules map.
 *
 * Example:
 *   import { boot } from 'millken-inertia-vue'
 *   import { modules } from './inertia/modules'
 *   boot(modules)
 */
export function boot(
  modules: Record<string, () => Promise<any>>,
  el?: HTMLElement | null,
): void {
  initModules(modules)

  if (typeof document === 'undefined') return

  ;(async function init(): Promise<void> {
    const target: HTMLElement = el || document.getElementById('app') || document.body

    const raw: string =
      target?.dataset?.page ?? ((window as any).__INERTIA_PAGE_DATA__ || '{}')
    let page: PageData = {}
    if (raw && raw !== '<!--inertia-data-page-inertia-->') {
      try {
        page = JSON.parse(raw) || {}
      } catch (e: unknown) {
        console.error('Failed to parse page JSON:', e)
        page = {}
      }
    }

    const { _ViEW_: viewName = 'App', ...props } = page

    try {
      await mountView(viewName, props, target)
    } catch (error: unknown) {
      console.error(`Error loading view ${viewName}`, error)
    }
  })()
}
