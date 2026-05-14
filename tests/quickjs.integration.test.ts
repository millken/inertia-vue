/**
 * @vitest-environment node
 *
 * QuickJS smoke test — builds a minimal SSR bundle the same way downstream
 * projects do, then loads it inside an in-process QuickJS VM
 * (quickjs-emscripten ≈ same engine semantics as buke/quickjs-go on Go side).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { build } from 'esbuild'
import vuePlugin from 'millken-esbuild-plugin-vue'
import { getQuickJS, type QuickJSContext, type QuickJSWASMModule } from 'quickjs-emscripten'
import { createSSRBuildOptions } from '../src/ssr/build'

let bundlePath: string
let qjs: QuickJSWASMModule

beforeAll(async () => {
  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'inertia-qjs-'))
  bundlePath = path.join(tmpOut, 'bundle.js')

  await build(
    createSSRBuildOptions({
      entryPoints: [path.resolve(__dirname, '__fixtures__/quickjs/ssr-entry.ts')],
      outfile: bundlePath,
      plugins: [vuePlugin()],
    }),
  )

  qjs = await getQuickJS()
}, 60_000)

function evalInQuickJS(): string {
  const vm: QuickJSContext = qjs.newContext()
  try {
    vm.evalCode(`var module = { exports: {} }; var exports = module.exports;`)

    const code = fs.readFileSync(bundlePath, 'utf8')
    const evalRes = vm.evalCode(code)
    if (evalRes.error) {
      const err = vm.dump(evalRes.error)
      evalRes.error.dispose()
      throw new Error(`QuickJS eval failed: ${JSON.stringify(err)}`)
    }
    evalRes.value.dispose()

    // Kick off render; result lands in a globalThis slot.
    const callRes = vm.evalCode(`
      globalThis.__r = { v: null, e: null };
      module.exports
        .inertiaRenderComponent("Hello", { name: "qjs" })
        .then(function(v){ globalThis.__r.v = v }, function(e){ globalThis.__r.e = String(e) });
      0;
    `)
    if (callRes.error) {
      const err = vm.dump(callRes.error)
      callRes.error.dispose()
      throw new Error(`QuickJS call failed: ${JSON.stringify(err)}`)
    }
    callRes.value.dispose()

    while (vm.runtime.hasPendingJob()) {
      const r = vm.runtime.executePendingJobs(100)
      if (r.error) {
        const err = vm.dump(r.error)
        r.error.dispose()
        throw new Error(`QuickJS jobs failed: ${JSON.stringify(err)}`)
      }
    }

    const resHandle = vm.evalCode(`globalThis.__r`)
    if (resHandle.error) {
      const err = vm.dump(resHandle.error)
      resHandle.error.dispose()
      throw new Error(`QuickJS read result failed: ${JSON.stringify(err)}`)
    }
    const dumped = vm.dump(resHandle.value) as { v: string | null; e: string | null }
    resHandle.value.dispose()
    if (dumped.e) throw new Error(`Render rejected: ${dumped.e}`)
    return dumped.v ?? ''
  } finally {
    vm.dispose()
  }
}

describe('QuickJS SSR smoke test', () => {
  it('renders a Vue component inside QuickJS using the produced bundle', () => {
    const html = evalInQuickJS()
    expect(html).toBe('<p>hello qjs</p>')
  })
})
