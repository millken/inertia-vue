/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { generateModules } from '../src/scripts/generate'

let tmp: string

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inertia-gen-'))
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
})

function write(rel: string, content = '<template></template>'): void {
  const full = path.join(tmp, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

describe('generateModules', () => {
  it('produces both client and ssr registries with sorted keys', () => {
    write('pages/Home.vue')
    write('pages/admin/users.vue')

    const count = generateModules({
      cwd: tmp,
      pagesDir: 'pages',
      clientOutput: 'src/inertia/modules.ts',
      ssrOutput: 'ssr-modules.ts',
    })

    expect(count).toBe(2)
    const client = fs.readFileSync(path.join(tmp, 'src/inertia/modules.ts'), 'utf8')
    const ssr = fs.readFileSync(path.join(tmp, 'ssr-modules.ts'), 'utf8')

    expect(client).toContain(`"Home": () => import(`)
    expect(client).toContain(`"admin/users": () => import(`)

    expect(ssr).toContain(`import Home from`)
    expect(ssr).toContain(`import AdminUsers from`)
    expect(ssr).toContain(`"Home": Home`)
    expect(ssr).toContain(`"admin/users": AdminUsers`)
  })

  it('escapes paths containing special characters via JSON.stringify', () => {
    // A folder name with a single quote would have produced a syntax error
    // in the previously string-interpolated output.
    write("pages/it's/page.vue")

    const count = generateModules({
      cwd: tmp,
      pagesDir: 'pages',
      clientOutput: 'modules.ts',
      ssrOutput: 'ssr-modules.ts',
    })

    expect(count).toBe(1)
    const client = fs.readFileSync(path.join(tmp, 'modules.ts'), 'utf8')
    // Output uses JSON-quoted paths; the apostrophe is preserved inside double quotes.
    expect(client).toContain(`"it's/page"`)
    // Single quotes are NOT used to wrap the path (would have broken the file).
    expect(client).not.toMatch(/'it's\/page'/)
  })

  it('returns 0 when pages directory is missing', () => {
    const count = generateModules({
      cwd: tmp,
      pagesDir: 'no-such-dir',
      clientOutput: 'modules.ts',
      ssrOutput: 'ssr-modules.ts',
    })
    expect(count).toBe(0)
  })
})
