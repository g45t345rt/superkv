import KVNamespaceApi, { NamespaceResponse } from './kvNamespaceApi'
import KVBig, { KVBigOptions } from './kvBig'

interface KVApiArgs {
  kvNamespaceApi: KVNamespaceApi
  namespaceId: string
}

export interface KeyValuePair {
  key: string
  value: string
  expiration?: number
  expiration_ttl?: number
  metadata?: unknown
  base64?: boolean
}

interface ListNamespaceResponse<T> extends NamespaceResponse {
  result: {
    name: string
    expiration: number
    metadata: T
  }[]
  result_info: {
    count: number
    cursor: string
  }
}

interface ListKeysOptions {
  limit?: number
  cursor?: string
  prefix?: string
}

export default class KVApi {
  kvNamespaceApi: KVNamespaceApi
  namespaceId: string

  constructor(args: KVApiArgs) {
    const { kvNamespaceApi, namespaceId } = args
    this.kvNamespaceApi = kvNamespaceApi
    this.namespaceId = namespaceId
  }

  fetch = async (path: string, init: RequestInit) => {
    return this.kvNamespaceApi.fetch(`/${this.namespaceId}${path}`, init)
  }

  readKeyValuePair = async (key: string): Promise<string> => {
    return await this.fetch(`/values/${key}`, {
      method: 'GET'
    })
  }

  writeKeyValuePair = (key: string, value: string) => {
    return this.fetch(`/values/${key}`, {
      method: 'PUT',
      body: JSON.stringify(value),
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  }

  writeMultipleKeyValuePairs = (keyValues: KeyValuePair[]): Promise<NamespaceResponse> => {
    return this.fetch('/bulk', {
      method: 'PUT',
      body: JSON.stringify(keyValues)
    })
  }

  deleteKeyValuePair = (key: string): Promise<NamespaceResponse> => {
    return this.fetch(`/values/${key}`, {
      method: 'DELETE'
    })
  }

  deleteMultipleKeyValuePairs = (keys: string[]): Promise<NamespaceResponse> => {
    return this.fetch(`/bulk`, {
      method: 'DELETE',
      body: JSON.stringify(keys)
    })
  }

  listKeys = <T>(listOptions?: ListKeysOptions): Promise<ListNamespaceResponse<T>> => {
    const initParams = {}
    if (listOptions) {
      if (listOptions.limit) initParams['limit'] = listOptions.limit.toString()
      if (listOptions.cursor) initParams['cursor'] = listOptions.cursor
      if (listOptions.prefix) initParams['prefix'] = listOptions.prefix
    }

    const params = new URLSearchParams(initParams)

    return this.fetch(`/keys?${params.toString()}`, {
      method: 'GET'
    })
  }

  useKVBig = (options?: KVBigOptions) => {
    return new KVBig({ kvApi: this }, options)
  }
}
