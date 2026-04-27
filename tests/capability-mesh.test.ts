import { describe, it, expect } from 'vitest'
import {
  CapabilityRequest,
  CapabilityResponse,
  CapabilityName,
} from '../src/resolve'
import { NotImplementedBroker } from '../src/broker'
import {
  ConfigurationError,
  CapabilityUnavailableError,
  BudgetExceededError,
  TenantNotProvisionedError,
} from '../src/errors'

describe('CapabilityName', () => {
  it.each([
    'database:write',
    'lint:gdscript',
    'asset-pipeline:optimize',
    'ml_inference:run',
  ])('accepts %s', (name) => {
    expect(() => CapabilityName.parse(name)).not.toThrow()
  })

  it.each([
    'no-namespace',
    'Database:Write',
    'database:',
    ':write',
    'a:b:c',
    '',
  ])('rejects %s', (name) => {
    expect(() => CapabilityName.parse(name)).toThrow()
  })
})

describe('CapabilityRequest', () => {
  it('parses a minimal request', () => {
    const req = CapabilityRequest.parse({
      capability: 'database:write',
      auth: 't1',
    })
    expect(req.capability).toBe('database:write')
    expect(req.auth).toBe('t1')
  })

  it('parses a full request with constraints', () => {
    const req = CapabilityRequest.parse({
      capability: 'database:write',
      auth: 'tenant_id_123',
      tags: ['fast', 'pre-build'],
      description: 'pre-flight write check',
      budget: 0.05,
      traceId: '550e8400-e29b-41d4-a716-446655440000',
      constraints: {
        region: 'us',
        compliance: ['soc2'],
        maxLatencyMs: 500,
      },
    })
    expect(req.constraints?.region).toBe('us')
    expect(req.budget).toBe(0.05)
  })

  it('rejects negative budget', () => {
    expect(() =>
      CapabilityRequest.parse({
        capability: 'database:write',
        auth: 't1',
        budget: -1,
      })
    ).toThrow()
  })

  it('rejects empty auth', () => {
    expect(() =>
      CapabilityRequest.parse({ capability: 'database:write', auth: '' })
    ).toThrow()
  })

  it('rejects malformed traceId', () => {
    expect(() =>
      CapabilityRequest.parse({
        capability: 'database:write',
        auth: 't1',
        traceId: 'not-a-uuid',
      })
    ).toThrow()
  })
})

describe('CapabilityResponse', () => {
  it('parses a well-formed response', () => {
    const resp = CapabilityResponse.parse({
      resolutionId: '550e8400-e29b-41d4-a716-446655440000',
      serverId: 'supabase-mcp',
      result: { rowsAffected: 1 },
      costApplied: 0.012,
      latencyMs: 87,
    })
    expect(resp.serverId).toBe('supabase-mcp')
    expect(resp.costApplied).toBe(0.012)
  })
})

describe('NotImplementedBroker', () => {
  const broker = new NotImplementedBroker()
  const req = CapabilityRequest.parse({
    capability: 'database:write',
    auth: 't1',
  })

  it('throws ConfigurationError on resolve()', async () => {
    await expect(broker.resolve(req)).rejects.toBeInstanceOf(
      ConfigurationError
    )
  })

  it('throws ConfigurationError on list()', async () => {
    await expect(broker.list('t1')).rejects.toBeInstanceOf(ConfigurationError)
  })

  it('throws ConfigurationError on dryRun()', async () => {
    await expect(broker.dryRun(req)).rejects.toBeInstanceOf(ConfigurationError)
  })

  it('throws ConfigurationError when iterating resolveStream()', async () => {
    const stream = broker.resolveStream(req)
    await expect(async () => {
      for await (const _ of stream) {
        // unreachable
      }
    }).rejects.toBeInstanceOf(ConfigurationError)
  })
})

describe('Capability Mesh errors', () => {
  it('CapabilityUnavailableError carries capability + reason', () => {
    const e = new CapabilityUnavailableError('database:write', 'no candidates in region eu')
    expect(e.code).toBe(-32014)
    expect(e.data).toMatchObject({
      capability: 'database:write',
      reason: 'no candidates in region eu',
    })
  })

  it('BudgetExceededError carries requested/available', () => {
    const e = new BudgetExceededError('database:write', 0.10, 0.05)
    expect(e.code).toBe(-32015)
    expect(e.data).toMatchObject({ requested: 0.10, available: 0.05 })
  })

  it('TenantNotProvisionedError carries tenantId', () => {
    const e = new TenantNotProvisionedError('t-missing')
    expect(e.code).toBe(-32016)
    expect(e.data).toMatchObject({ tenantId: 't-missing' })
  })
})
