import KVApi, { KeyValuePair, SetOptions } from './kvApi'
import KVBatch from './kvBatch'

export interface Prefix<Metadata> {
  [key: string]: {
    keyValue?: (metadata: Metadata) => string
    sortValue?: (metadata: Metadata) => string
    filter?: (metadata: Metadata) => boolean
  }
}

export interface KVTableDefinition<Metadata> {
  name: string
  prefix?: Prefix<Metadata>
  prefixDevider?: string
}

interface KVTableArgs<Metadata> {
  kvApi: KVApi
  tableDefinition: KVTableDefinition<Metadata>
}

interface ListResponse<Metadata> {
  result: {
    prefixKey: string
    key: string
    metadata: Metadata
    expiration?: number
  }[]
  cursor?: string
}

export interface ListOptions {
  prefix?: string
  cursor?: string
  limit?: number
}

export default class KVTable<Metadata, Value> {
  kvApi: KVApi
  tableDefinition: KVTableDefinition<Metadata>

  constructor(args: KVTableArgs<Metadata>) {
    const { kvApi, tableDefinition } = args
    this.kvApi = kvApi
    this.tableDefinition = { prefix: {}, prefixDevider: '~~', ...tableDefinition }

    const prefix = this.tableDefinition
    Object.keys(prefix).forEach(prefixKey => {
      if (prefixKey === 'dataKey' || prefixKey === 'prefixData') {
        throw `Prefix [${prefixKey}] is reserved.`
      }
    })
  }

  optionsPrefixToArray = () => {
    const { prefix } = this.tableDefinition
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

      let dataPrefixKey = this.createPrefixKey(prefixName, null, key)
      if (sortValue) dataPrefixKey = this.createPrefixKey(prefixName, sortValue(metadata), key)
      if (keyValue) dataPrefixKey = this.createPrefixKey(prefixName, keyValue(metadata), key)

      if (dataPrefixKey) prefixKeys.push(dataPrefixKey)
    })

    return prefixKeys
  }

  createDataKey = (key?: string) => {
    return this.toKey([this.tableDefinition.name, 'dataKey', key])
  }

  createPrefixDataKey = (key?: string) => {
    return this.toKey([this.tableDefinition.name, 'prefixData', key])
  }

  createPrefixKey = (prefixName: string, value?: string, key?: string) => {
    return this.toKey([this.tableDefinition.name, 'prefix', prefixName, value, key])
  }

  toKey = (args: string[]) => args.filter(i => !!i).join(this.tableDefinition.prefixDevider)

  preparePrefixSet = async (key: string, metadata: Metadata, options: SetOptions = {}) => {
    // Prefix keys with metadata
    const prefixKeys = this.createPrefixKeys(key, metadata)
    const dataPrefix = prefixKeys.map<KeyValuePair>(k => ({ key: k, value: '', metadata, ...options }))

    // Key with prefix keys [need this to delete keys]
    const prefixDataKey = this.createPrefixDataKey(key)
    const prefixData = { key: prefixDataKey, value: JSON.stringify(prefixKeys), ...options } as KeyValuePair
    const dataToWrite = [...dataPrefix, prefixData]

    const currentPrefixKeys = await this.getPrefixKeys(key)
    const keysToDelete = currentPrefixKeys.filter((k) => !prefixKeys.includes(k))
    return { dataToWrite, keysToDelete }
  }

  prepareSet = async (key: string, metadata: Metadata, value?: Value, options?: SetOptions) => {
    const dataKey = this.createDataKey(key)
    const _value = value ? JSON.stringify(value) : ''
    const data = { key: dataKey, value: _value, metadata, ...options } as KeyValuePair

    const { dataToWrite, keysToDelete } = await this.preparePrefixSet(key, metadata, options)
    return {
      dataToWrite: [data, ...dataToWrite],
      keysToDelete
    }
  }

  set = async (key: string, metadata: Metadata, value?: Value, options?: SetOptions) => {
    const { dataToWrite, keysToDelete } = await this.prepareSet(key, metadata, value, options)

    const res1 = await this.kvApi.writeMultipleKeyValuePairs(dataToWrite)
    if (!res1.success) throw res1

    if (keysToDelete.length === 0) return
    const res2 = await this.kvApi.deleteMultipleKeyValuePairs(keysToDelete)
    if (!res2.success) throw res2
  }

  prepareDel = async (key: string) => {
    const prefixKeys = await this.getPrefixKeys(key)
    const prefixDataKey = this.createPrefixDataKey(key)
    const dataKey = this.createDataKey(key)
    return [dataKey, prefixDataKey, ...prefixKeys]
  }

  del = async (key: string) => {
    const keysToDelete = await this.prepareDel(key)
    const res = await this.kvApi.deleteMultipleKeyValuePairs(keysToDelete)
    if (!res.success) throw res
  }

  getMetadata = async (keyOrPrefixValue: string, prefixName?: string) => {
    const prefix = prefixName ? this.createPrefixKey(prefixName, keyOrPrefixValue) : this.createDataKey(keyOrPrefixValue)
    const { result } = await this.list({ prefix })
    if (result.length === 0) return null
    return result[0].metadata
  }

  getValue = async (key: string) => {
    const dataKey = this.createDataKey(key)
    const res = await this.kvApi.readKeyValuePair<Value>(dataKey)
    if (res.success) return res.result
    return null
  }

  getPrefixKeys = async (key: string) => {
    const prefixDataKey = this.createPrefixDataKey(key)
    const res = await this.kvApi.readKeyValuePair<string[]>(prefixDataKey)
    if (!res.success) return []
    return res.result
  }

  list = async (listOptions?: ListOptions): Promise<ListResponse<Metadata>> => {
    const { prefix, cursor, limit } = { prefix: this.createDataKey(), limit: 1000, ...listOptions }
    const res = await this.kvApi.listKeys<Metadata>({ cursor, limit, prefix })
    if (!res.success) throw res

    const parseKey = (key: string) => {
      const parsed = key.split(this.tableDefinition.prefixDevider)
      return parsed[parsed.length - 1]
    }

    return {
      result: res.result.map((r) => {
        const { name, expiration, metadata } = r
        const key = parseKey(name)
        if (expiration) return { key, prefixKey: name, metadata, expiration }
        return { key, prefixKey: name, metadata }
      }),
      cursor: res.result_info.cursor
    }
  }

  iterator = (prefix?: string) => {
    let cursor = null

    const next = async () => {
      const list = await this.list({ cursor, limit: 1000, prefix })
      cursor = list.cursor
      const done = cursor === ''
      return { value: list.result, done }
    }

    return { next }
  }

  updatePrefix = async (chunkSize?: number) => {
    const kvBatch = new KVBatch({ kvApi: this.kvApi }, { chunkSize })
    const prefix = this.createDataKey()
    const it = this.iterator(prefix)

    let done = false
    while (!done) {
      const result = await it.next()
      const list = result.value

      for (let i = 0; i < list.length; i++) {
        const { key, metadata, expiration } = list[i]
        const { dataToWrite, keysToDelete } = await this.preparePrefixSet(key, metadata, { expiration })
        await kvBatch.delMulti(keysToDelete)
        await kvBatch.setMulti(dataToWrite)
      }

      done = result.done
    }

    await kvBatch.finish()
  }

  delPrefix = async (prefixName: string, chunkSize?: number) => {
    const kvBatch = new KVBatch({ kvApi: this.kvApi }, { chunkSize })
    const prefix = this.createPrefixKey(prefixName)
    const it = this.iterator(prefix)
    let done = false
    while (!done) {
      let result = await it.next()
      const prefixKeys = result.value.map(v => v.prefixKey)
      for (let i = 0; i < prefixKeys.length; i++) {
        const prefixKey = prefixKeys[i]
        // Maybe remove the prefixKey from the prefixData of the dataKey ??? will keep it for now because it does not change anything and avoid more requests
        await kvBatch.del(prefixKey)
      }

      done = result.done
    }

    await kvBatch.finish()
  }
}
