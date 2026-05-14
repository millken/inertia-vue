import { describe, it, expect } from 'vitest'
import { parseProps } from '../src/ssr/ssr-render'

describe('parseProps', () => {
  it('returns {} for undefined', () => {
    expect(parseProps()).toEqual({})
  })

  it('returns object as-is', () => {
    const o = { a: 1, b: 'x' }
    expect(parseProps(o)).toBe(o)
  })

  it('parses JSON strings into objects', () => {
    expect(parseProps('{"a":1}')).toEqual({ a: 1 })
  })

  it('returns {} for non-object JSON (e.g. array, number, null)', () => {
    // Arrays and primitives are not valid prop bags; coerce to {}.
    expect(parseProps('null')).toEqual({})
    expect(parseProps('42')).toEqual({})
  })

  it('throws for malformed JSON', () => {
    expect(() => parseProps('{not json')).toThrow(/Invalid JSON props/)
  })
})
