/**
 * InertiaLink — anchor-like component that intercepts navigation and
 * routes through PJAX (no full page reload).
 *
 * Hand-written as a render-function component so the package can be shipped
 * as plain JS/d.ts without a Vue SFC compiler in its build pipeline.
 */
import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { pjaxClick } from './pjax-loader'

const InertiaLink = defineComponent({
  name: 'InertiaLink',
  props: {
    /** Tag to render. Defaults to <a>. PJAX only intercepts anchor clicks. */
    tag: { type: String, default: 'a' },
  },
  setup(props, { slots }) {
    const linkEl = ref<HTMLElement | null>(null)
    let cleanup: { destroy(): void } | undefined

    onMounted(() => {
      const el = linkEl.value
      if (el && el instanceof HTMLAnchorElement) {
        cleanup = pjaxClick(el)
      }
    })

    onBeforeUnmount(() => {
      cleanup?.destroy()
      cleanup = undefined
    })

    return () => h(props.tag, { ref: linkEl }, slots.default?.())
  },
})

export default InertiaLink
