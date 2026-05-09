import '@testing-library/jest-dom'
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web'
import { clearImmediate, setImmediate } from 'node:timers'
import { TextDecoder, TextEncoder } from 'node:util'

const installGlobal = (name: string, value: unknown) => {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  })
}

installGlobal('TextDecoder', TextDecoder)
installGlobal('TextEncoder', TextEncoder)
installGlobal('ReadableStream', ReadableStream)
installGlobal('setImmediate', setImmediate)
installGlobal('clearImmediate', clearImmediate)
installGlobal('TransformStream', TransformStream)
installGlobal('WritableStream', WritableStream)

const { fetch, File, FormData, Headers, Request, Response } = require('undici')

if (typeof Response.json !== 'function') {
  Object.defineProperty(Response, 'json', {
    configurable: true,
    value: (body: unknown, init?: ResponseInit) => {
      const headers = new Headers(init?.headers)
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json')
      }

      return new Response(JSON.stringify(body), { ...init, headers })
    },
  })
}

installGlobal('fetch', fetch)
installGlobal('Headers', Headers)
installGlobal('Request', Request)
installGlobal('Response', Response)
installGlobal('FormData', FormData)
installGlobal('File', File)

process.env.SUPPRESS_JEST_WARNINGS = 'true'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next/headers', () => ({
  headers: jest.fn(async () => new Headers({ 'user-agent': 'jest' })),
}))

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  redirect: jest.fn(),
  usePathname: () => '/en',
  useRouter: () => ({
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    push: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('mongoose', () => {
  const models: Record<string, unknown> = {}

  function Schema() {
    return {
      methods: {},
      pre: jest.fn(),
      virtual: jest.fn(() => ({ get: jest.fn() })),
    }
  }

  Schema.Types = {
    ObjectId: class ObjectId {},
  }

  const createModel = (name: string) => ({
    deleteOne: jest.fn(),
    find: jest.fn(() => ({
      lean: jest.fn().mockResolvedValue([]),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
    })),
    findById: jest.fn(() => ({
      lean: jest.fn().mockResolvedValue(null),
      populate: jest.fn().mockReturnThis(),
    })),
    findByIdAndDelete: jest.fn(),
    findByIdAndUpdate: jest.fn(() => ({
      populate: jest.fn().mockResolvedValue(null),
    })),
    findOne: jest.fn(),
    modelName: name,
    prototype: {},
  })

  const model = jest.fn((name: string) => {
    if (!models[name]) {
      models[name] = createModel(name)
    }
    return models[name]
  })

  const mongoose = {
    Schema,
    Types: Schema.Types,
    connection: { readyState: 0 },
    connect: jest.fn(),
    model,
    models,
  }

  return {
    __esModule: true,
    default: mongoose,
    ...mongoose,
  }
})
import 'whatwg-fetch'
