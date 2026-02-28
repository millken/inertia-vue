import { hasView, mountView } from './view-loader'

interface PjaxState {
  pjaxUrl: string
  pjaxData: {
    _ViEW_?: string
    [key: string]: any
  }
}

interface PjaxResponse {
  _ViEW_?: string
  redirect?: string
  [key: string]: any
}

let win: Window = typeof window !== 'undefined' ? window : ({} as Window)
let doc: Document = win.document || ({} as Document)
let elementProto = (win as any).Element && (win as any).Element.prototype
let history = win.history
let supported: boolean = !!(elementProto && history && history.pushState)
let origin: string = win.location ? win.location.protocol + '//' + win.location.host : ''

if (supported) {
  win.addEventListener('popstate', pjaxState)
}

export function pjaxClick(el: HTMLAnchorElement): { destroy(): void } | undefined {
  const url = el.href
  const href = el.getAttribute('href')
  if (
    supported &&
    url &&
    href &&
    !href.startsWith('#') &&
    sameWindowOrigin(el.target, url) &&
    !(el as any).__click
  ) {
    el.addEventListener('click', handleClick, true)
    return {
      destroy() {
        el.removeEventListener('click', handleClick, true)
      },
    }
  }
}

function pjaxState(e: PopStateEvent): void {
  if (e.state && e.state.pjaxUrl) {
    const { _ViEW_, ...props } = e.state.pjaxData
    loadAndMountComponent(e.state.pjaxUrl, _ViEW_, props)
  }
}

const handleClick = async (e: MouseEvent): Promise<void> => {
  e.preventDefault()
  const el = e.currentTarget as HTMLAnchorElement
  if (!el) return

  try {
    const url = new URL(el.href)
    url.searchParams.set('_t', Date.now().toString())

    let response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-PJAX': 'true',
        'X-Requested-With': 'XMLHttpRequest',
      },
    })

    if (response.ok) {
      let data: PjaxResponse = await response.json()
      const { _ViEW_ = undefined, ...props } = data
      if (!_ViEW_) {
        console.error('No view found')
        window.location.reload()
      } else {
        loadAndMountComponent(el.href, _ViEW_, props)
        const info: PjaxState = {
          pjaxUrl: el.href,
          pjaxData: data,
        }
        history.pushState(info, '', el.href)
        const scrollX = win.scrollX || win.pageXOffset || 0
        const scrollY = win.scrollY || win.pageYOffset || 0
        win.scrollTo(scrollX, scrollY)
      }
      if (data.redirect) {
        window.location.href = data.redirect
      }
    } else if (response.redirected) {
      window.location.href = el.href
    }
  } catch (error) {
    window.location.href = el.href
  }
}

function sameWindowOrigin(target: string, url: string): boolean {
  target = target.toLowerCase()
  return (
    (!target ||
      target === win.name ||
      target === '_self' ||
      (target === '_top' && win === win.top) ||
      (target === '_parent' && win === win.parent)) &&
    (url === origin || url.indexOf(origin) === 0)
  )
}

async function loadAndMountComponent(
  url: string,
  view: string | undefined,
  props: Record<string, any>,
): Promise<void> {
  if (!view) return
  try {
    await mountView(view, props)
  } catch (error) {
    console.error('Error loading component:', error)
    try {
      window.location.href = url
    } catch (e) {
      console.error('Failed to navigate to', url, e)
    }
  }
}
