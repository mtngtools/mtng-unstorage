import { vi } from 'vitest'

// Ensure the AWS SDK command constructors used by the drivers return an
// object containing the `input` we need to interpret commands in the mock.
// This is hoisted by Vitest so it will take effect before modules that
// import `@aws-sdk/client-s3` are loaded.
vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {}
  class HeadObjectCommand { input: any; constructor(input: any) { this.input = input } }
  class GetObjectCommand { input: any; constructor(input: any) { this.input = input } }
  class PutObjectCommand { input: any; constructor(input: any) { this.input = input } }
  class DeleteObjectCommand { input: any; constructor(input: any) { this.input = input } }
  class ListObjectsV2Command { input: any; constructor(input: any) { this.input = input } }
  return {
    S3Client,
    HeadObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command
  }
})

// Lightweight mock S3 client that records commands and provides canned responses
export class MockS3Client {
  public storage = new Map<string, string>()
  async send(command: any) {
    const ctorName = command?.constructor?.name || ''
    const input = command?.input || command || {}

    // Prefer constructor name matching (works for real SDK and mocked constructors)
    if (/listobjectsv2/i.test(ctorName) || input.Prefix !== undefined) {
      const Prefix = input.Prefix || ''
      const Contents = Array.from(this.storage.keys())
        .filter(k => k.startsWith(Prefix))
        .map(Key => ({ Key }))
      return { Contents }
    }

    if (/putobject/i.test(ctorName) || input.Body !== undefined) {
      const Key = input.Key
      const Body = input.Body
      const bodyStr = typeof Body === 'string' ? Body : Body.toString()
      this.storage.set(Key, bodyStr)
      return {}
    }

    if (/deleteobject/i.test(ctorName)) {
      const Key = input.Key
      this.storage.delete(Key)
      return {}
    }

    // For Head/Get commands: return Body if present, otherwise emulate existence check
    if (input.Key !== undefined) {
      const Key = input.Key
      if (!this.storage.has(Key)) {
        const err: any = new Error('NotFound')
        err.name = 'NotFound'
        err.$metadata = { httpStatusCode: 404 }
        throw err
      }
      const value = this.storage.get(Key)!
      return { Body: { transformToString: async () => value } }
    }

    return {}
  }
}

export default MockS3Client
