import { createApp, type App, type Component } from 'vue'

type ModulesMap = Record<string, () => Promise<any>>

const cache = new Map<string, Component>()
let currentApp: App | null = null

let _modules: ModulesMap = {}

/**
 * Initialize the view loader with a modules map.
 * Call this once at app startup.
 */
export function initModules(modules: ModulesMap): void {
  _modules = modules
}

export function hasView(name: string): boolean {
  return !!_modules[name]
}

export async function loadView(name: string): Promise<Component> {
  if (!_modules[name]) {
    throw new Error(`View ${name} not found`)
  }
  if (cache.has(name)) {
    return cache.get(name)!
  }
  const mod = await _modules[name]()
  const component = (mod as any).default || mod
  cache.set(name, component as Component)
  return component as Component
}

export async function mountView(
  viewName: string,
  props: Record<string, any> = {},
  targetElement: HTMLElement | null = null,
): Promise<App> {
  try {
    if (!hasView(viewName)) {
      throw new Error(`View ${viewName} not found`)
    }

    const component = await loadView(viewName)
    const target = targetElement || document.getElementById('app') || document.body

    // Unmount previous instance
    if (currentApp) {
      currentApp.unmount()
    }

    // Clear content
    target.innerHTML = ''

    // Create and mount new instance
    currentApp = createApp(component, props)
    currentApp.mount(target)

    return currentApp
  } catch (error) {
    console.error(`Error mounting view ${viewName}:`, error)
    throw error
  }
}

export function getCurrentApp(): App | null {
  return currentApp
}

export function unmountCurrentApp(): void {
  if (currentApp) {
    currentApp.unmount()
    currentApp = null
  }
}
