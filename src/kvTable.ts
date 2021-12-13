import KVApi, { KeyValuePair } from './kvApi'
import pick from 'lodash.pick'
import KVBatch from './kvBatch'
import DispatchAfter from './dispatchAfter'

export interface Prefix<Metadata> {
  [key: string]: {
    keyValue?: (metadata: Metadata) => string
    sortValue?: (metadata: Metadata) => string
    filter?: (metadata: Metadata) => boolean
  }
}

export interface SetOptions {
  expiration?: number
  expiration_ttl?: number
}

export interface KVTableOptions<Metadata> {
  prefix?: Prefix<Metadata>
  prefixDevider?: string
}

interface KVTableArgs {
  kvApi: KVApi
  name: string
  properties: string[]
}

interface ListResponse<Metadata> {
  result: {
    key: string
    expiration: number
    metadata: Metadata
  }[]
  cursor?: string
}

interface ListOptions {
  prefix?: string
  cursor?: string
  limit?: number
}

export default class KVTable<Metadata> {
  kvApi: KVApi
  properties: string[]
  name: string
  options: KVTableOptions<Metadata>

  constructor(args: KVTableArgs, options?: KVTableOptions<Metadata>) {
    const { kvApi, name, properties } = args
    this.kvApi = kvApi
    this.name = name
    this.properties = properties
    this.options = { prefix: {}, prefixDevider: '__', ...options }

    Object.keys(this.options.prefix).forEach(prefixKey => {
      if (prefixKey === 'dataKey' || prefixKey === 'prefixData') {
        throw `Prefix [${prefixKey}] is reserved.`
      }
    })
  }

  optionsPrefixToArray = () => {
    const { prefix } = this.options
    return Object.keys(prefix).map((prefixName) => {
      const value = prefix[prefixName]
      return { prefixName, value }
    })
  }

  createPrefixKeys = (key: string, metadata: Metadata) => {
    const prefixKeys = [] as string[]

    this.optionsPrefixToArray().forEach(({ prefixName, value }) => {
      const { filter, sortValue, keyValue } = value
      if (typeof filter === 'function' && !filter(metadata)) return

      let dataPrefixKey = this.createPrefixKey(prefixName, key)
      if (sortValue) dataPrefixKey = this.createPrefixKey(prefixName, key, sortValue(metadata))
      if (keyValue) dataPrefixKey = this.createPrefixKey(prefixName, key, keyValue(metadata))

      if (dataPrefixKey) prefixKeys.push(dataPrefixKey)
    })

    return prefixKeys
  }

  createDataKey = (key?: string) => {
    return this.toKey([this.name, 'dataKey', key])
  }

  createPrefixDataKey = (key?: string) => {
    return this.toKey([this.name, 'prefixData', key])
  }

  createPrefixKey = (prefixName: string, key?: string, value?: string) => {
    return this.toKey([this.name, 'prefix', prefixName, value, key])
  }

  toKey = (args: string[]) => args.filter(i => !!i).join(this.options.prefixDevider)

  preparePrefixSet = async (key: string, metadata: Metadata, options?: SetOptions) => {
    const sanitizedMetadata = pick(metadata, this.properties)
    const currentPrefixKeys = await this.getPrefixKeys(key)

    // Prefix keys with metadata
    const prefixKeys = this.createPrefixKeys(key, metadata)
    const dataPrefix = prefixKeys.map<KeyValuePair>(k => ({ key: k, value: '', metadata: sanitizedMetadata, ...options }))

    // Key with prefix keys [need this to delete keys]
    const prefixDataKey = this.createPrefixDataKey(key)
    const prefixData = { key: prefixDataKey, value: JSON.stringify(prefixKeys), ...options } as KeyValuePair

    const dataToWrite = [...dataPrefix, prefixData]
    const keysToDelete = currentPrefixKeys.filter((k) => prefixKeys.includes(k))

    return {
      dataToWrite,
      keysToDelete
    }
  }

  prepareSet = async (key: string, metadata: Metadata, value?: string, options?: SetOptions) => {
    const sanitizedMetadata = pick(metadata, this.properties)
    const dataKey = this.createDataKey(key)
    const data = { key: dataKey, value: value || '', metadata: sanitizedMetadata, ...options } as KeyValuePair

    const { dataToWrite, keysToDelete } = await this.preparePrefixSet(key, metadata, options)
    return {
      dataToWrite: [data, ...dataToWrite],
      keysToDelete
    }
  }

  set = async (key: string, metadata: Metadata, value?: string, options?: SetOptions) => {
    const { dataToWrite, keysToDelete } = await this.prepareSet(key, metadata, value, options)
    const res1 = await this.kvApi.writeMultipleKeyValuePairs(dataToWrite)
    if (!res1.success) throw res1


    if (keysToDelete.length === 0) return
    const res2 = await this.kvApi.deleteMultipleKeyValuePairs(keysToDelete)
    if (!res2.success) throw res2
  }

  prepareDel = async (key: string) => {
    const prefixKeys = await this.getPrefixKeys(key)
    const dataKey = this.createDataKey(key)
    return [dataKey, ...prefixKeys]
  }

  del = async (key: string) => {
    const keysToDelete = await this.prepareDel(key)
    const res = await this.kvApi.deleteMultipleKeyValuePairs(keysToDelete)
    if (!res.success) throw res
  }

  getMetadata = async (key: string) => {
    const dataKey = this.createDataKey(key)
    const { result } = await this.list({ prefix: dataKey })
    if (result.length === 0) return null
    return result[0].metadata
  }

  getValue = async (key: string) => {
    const dataKey = this.createDataKey(key)
    return await this.kvApi.readKeyValuePair(dataKey)
  }

  getPrefixKeys = async (key: string): Promise<string[]> => {
    const prefixDataKey = this.createPrefixDataKey(key)
    const res = await this.kvApi.readKeyValuePair(prefixDataKey)
    if (!res.success) return []
    return res.result
  }

  list = async (listOptions?: ListOptions): Promise<ListResponse<Metadata>> => {
    const { prefix, cursor, limit } = { prefix: this.createDataKey(), limit: 1000, ...listOptions }
    const res = await this.kvApi.listKeys<Metadata>({ cursor, limit, prefix })
    if (!res.success) throw res
    return {
      result: res.result.map((r) => {
        const { name, expiration, metadata } = r
        return { key: name, expiration, metadata }
      }),
      cursor: res.result_info.cursor
    }
  }

  iterator = (prefix?: string) => {
    let cursor = null

    const next = async () => {
      const list = await this.list({ cursor, limit: 1000, prefix })
      cursor = list.cursor
      const done = cursor === null
      return { value: list.result, done }
    }

    return { next }
  }

  updatePrefix = async (chunk?: number) => {
    const writeDispatcher = new DispatchAfter<KeyValuePair>({
      max: chunk || 10000,
      onDispatch: async (keyValuePairs) => {
        await this.kvApi.writeMultipleKeyValuePairs(keyValuePairs)
      }
    })

    const deleteDispatcher = new DispatchAfter<string>({
      max: chunk || 10000,
      onDispatch: async (keys) => {
        await this.kvApi.deleteMultipleKeyValuePairs(keys)
      }
    })

    const prefix = this.createDataKey()
    const it = this.iterator(prefix)
    let result = await it.next()
    while (!result.done) {
      const list = result.value
      for (let i = 0; i < list.length; i++) {
        const { key, metadata, expiration } = list[i]
        const { dataToWrite, keysToDelete } = await this.preparePrefixSet(key, metadata, { expiration })
        await writeDispatcher.set(dataToWrite)
        await deleteDispatcher.set(keysToDelete)
      }
    }

    await writeDispatcher.finish()
    await deleteDispatcher.finish()
  }

  delPrefix = async (prefixName: string, chunk?: number) => {
    const deleteDispatcher = new DispatchAfter<string>({
      max: chunk || 10000,
      onDispatch: async (keys) => {
        await this.kvApi.deleteMultipleKeyValuePairs(keys)
      }
    })

    const prefix = this.createPrefixKey(prefixName)
    const it = this.iterator(prefix)
    let result = await it.next()
    while (!result.done) {
      const keys = result.value.map(v => v.key)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        // Maybe remove the prefixKey from the prefixData of the dataKey ??? will keep it because it does not change anything and avoid more requests
        await deleteDispatcher.set(key)
      }

      result = await it.next()
    }

    await deleteDispatcher.finish()
  }

  useBatch = (chunkSize?: number) => {
    return new KVBatch<Metadata>({ kvApi: this.kvApi }, { kvTable: this, chunkSize })
  }
}
