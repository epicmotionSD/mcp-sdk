import { describe, it, expect } from 'vitest'
import { createLogger } from '../src/logger'
import { wrapTool } from '../src/server'
import { schemas, validateInput, z } from '../src/validate'


describe('validateInput', () => {
  it('applies defaults and returns typed input', async () => {
    const handler = validateInput(
      z.object({
        query: schemas.nonEmptyString,
        limit: schemas.limit,
      }),
      async (input) => input
    )

    const result = await handler({ query: 'hello' })

    expect(result).toEqual({ query: 'hello', limit: 10 })
  })
})

describe('wrapTool', () => {
  it('redacts sensitive input in logs', async () => {
    const entries: Array<Record<string, unknown>> = []
    const logger = createLogger('test', {
      timestamps: false,
      output: (entry) => entries.push(entry),
    })

    const tool = wrapTool(
      async (input: { token: string; ok: boolean }, ctx) => {
        expect(ctx.name).toBe('test-tool')
        return input.ok
      },
      { name: 'test-tool', logger, telemetry: false }
    )

    const result = await tool({ token: 'secret', ok: true })

    expect(result).toBe(true)
    expect(entries[0]?.input).toEqual({ token: '[REDACTED]', ok: true })
  })
})
