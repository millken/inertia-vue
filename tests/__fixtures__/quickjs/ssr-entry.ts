import { createSSRRender } from '../../../src/ssr/ssr-render'
import Hello from './Hello.vue'

const { inertiaRenderComponent } = createSSRRender({ Hello })
;(module as any).exports = { inertiaRenderComponent }
