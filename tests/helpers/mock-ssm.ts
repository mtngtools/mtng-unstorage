import { vi } from 'vitest'

vi.mock('@aws-sdk/client-ssm', () => {
  class SSMClient {}
  class GetParameterCommand { input: unknown; constructor(input: unknown) { this.input = input } }
  class PutParameterCommand { input: unknown; constructor(input: unknown) { this.input = input } }
  class DeleteParameterCommand { input: unknown; constructor(input: unknown) { this.input = input } }
  class GetParametersByPathCommand { input: unknown; constructor(input: unknown) { this.input = input } }
  return {
    SSMClient,
    GetParameterCommand,
    PutParameterCommand,
    DeleteParameterCommand,
    GetParametersByPathCommand,
  }
})

function parameterNotFound(): never {
  const err = new Error('Parameter not found') as Error & { name?: string; Code?: string }
  err.name = 'ParameterNotFound'
  err.Code = 'ParameterNotFound'
  throw err
}

/**
 * Lightweight mock SSM client. storage is keyed by parameter name (path, e.g. "/my-app/key1").
 */
export class MockSSMClient {
  public storage = new Map<string, string>()

  async send(command: { constructor?: { name?: string }; input?: Record<string, unknown> }) {
    const ctorName = command?.constructor?.name ?? ''
    const input = (command?.input ?? command ?? {}) as Record<string, unknown>

    // Order matters: Path vs Name+Value vs Name-only (GetParametersByPath, PutParameter, then GetParameter/DeleteParameter)
    if (/getparametersbypath/i.test(ctorName) || input.Path !== undefined) {
      const Path = String(input.Path ?? '')
      const normalizedPath = Path.endsWith('/') ? Path : Path + '/'
      const Parameters = Array.from(this.storage.entries())
        .filter(([name]) => name.startsWith(normalizedPath) || name.startsWith(Path))
        .map(([Name, Value]) => ({ Name, Value }))
      return { Parameters, NextToken: undefined }
    }

    if (/putparameter/i.test(ctorName) || (input.Name !== undefined && input.Value !== undefined)) {
      const Name = String(input.Name)
      const Value = typeof input.Value === 'string' ? input.Value : String(input.Value)
      this.storage.set(Name, Value)
      return {}
    }

    if (/deleteparameter/i.test(ctorName)) {
      const Name = String(input.Name ?? '')
      if (!this.storage.has(Name)) parameterNotFound()
      this.storage.delete(Name)
      return {}
    }

    if (/getparameter/i.test(ctorName) || input.Name !== undefined) {
      const Name = String(input.Name ?? '')
      if (!this.storage.has(Name)) parameterNotFound()
      const Value = this.storage.get(Name)!
      return { Parameter: { Name, Value } }
    }

    return {}
  }
}

export default MockSSMClient
