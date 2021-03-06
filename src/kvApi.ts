import KVNamespaceApi, { NamespaceResponse } from './kvNamespaceApi'
import KVBig, { KVBigOptions } from './kvBig'
import KVTable, { KVTableDefinition } from './kvTable'
import KVBatch, { KVBatchOptions } from './kvBatch'
import KVItem from './kvItem'

interface KVApiArgs {
  kvNamespaceApi: KVNamespaceApi
  namespaceId: string
}

export interface SetOptions {
  expiration?: number
  expiration_ttl?: number
}

export interface KeyValuePair {
  key: string
  value: string
  expiration?: number
  expiration_ttl?: number
  metadata?: unknown
  base64?: boolean
}

interface KeyValue<T> {
  name: string
  expiration: number
  metadata: T
}

interface ListNamespaceResponse<T> extends NamespaceResponse<KeyValue<T>[]> {
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

  fetch = async (path: string, init: RequestInit, setJsonHeader = true) => {
    return this.kvNamespaceApi.fetch(`/${this.namespaceId}${path}`, init, setJsonHeader)
  }

  readKeyValuePair = async <T>(key: string): Promise<NamespaceResponse<T>> => {
    const res = await this.fetch(`/values/${key}`, {
      method: 'GET'
    })

    // Note
    // the api returns the success and error if it does not exists
    // but return only the object when it does without the encapsulation of success and errors, messages metadata... weird
    if (!res.success && res.errors && res.errors.length > 0) return res
    return { success: true, result: res, errors: [], messages: [] }
  }

  writeKeyValuePair = (key: string, value: string, metadata?: any, options?: SetOptions): Promise<NamespaceResponse<void>> => {
    const initParams = {}
    if (options) {
      if (options.expiration) initParams['expiration'] = options.expiration
      if (options.expiration_ttl) initParams['expiration_ttl'] = options.expiration_ttl
    }

    const params = new URLSearchParams(initParams)
    const formData = new FormData()
    formData.append('value', value)
    formData.append('metadata', JSON.stringify(metadata || {}))

    let headers = {}
    //@ts-ignore
    if (typeof formData.getHeaders === 'function') {
      //@ts-ignore
      headers = formData.getHeaders() // this is for request inside nodejs instead of using browser fetch
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
     * Warning: When using FormData to submit POST requests using XMLHttpRequest or 
     * the Fetch_API with the multipart/form-data Content-Type (e.g. when uploading Files and Blobs to the server), 
     * do not explicitly set the Content-Type header on the request. 
     * Doing so will prevent the browser from being able to set the Content-Type header 
     * with the boundary expression it will use to delimit form fields in the request body.
     */

    return this.fetch(`/values/${key}?${params}`, {
      method: 'PUT',
      // @ts-ignore
      body: formData,
      headers
    }, false) // we need to setJsonHeader to false -- reason explained above
  }

  writeMultipleKeyValuePairs = (keyValues: KeyValuePair[]): Promise<NamespaceResponse<void>> => {
    return this.fetch('/bulk', {
      method: 'PUT',
      body: JSON.stringify(keyValues)
    })
  }

  deleteKeyValuePair = (key: string): Promise<NamespaceResponse<void>> => {
    return this.fetch(`/values/${key}`, {
      method: 'DELETE'
    })
  }

  deleteMultipleKeyValuePairs = (keys: string[]): Promise<NamespaceResponse<void>> => {
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

  useKVTable = <Metadata, Value>(tableDefinition: KVTableDefinition<Metadata>) => {
    return new KVTable<Metadata, Value>({ kvApi: this, tableDefinition })
  }

  useKVBatch = (options?: KVBatchOptions) => {
    return new KVBatch({ kvApi: this }, options)
  }

  useKVBig = (options?: KVBigOptions) => {
    return new KVBig({ kvApi: this }, options)
  }

  useKVItem = <Value, Metadata = {}>(key: string) => {
    return new KVItem<Value, Metadata>({ kvApi: this, key })
  }
}
