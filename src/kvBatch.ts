import KVApi, { KeyValuePair } from './kvApi'
import KVTable, { SetOptions } from './kvTable'
import DispatchAfter from './dispatchAfter'

interface KVBatchArgs {
  kvApi: KVApi
}

export interface KVBatchOptions {
  chunkSize?: number
  kvTable?: KVTable<any, any>
}

export default class KVBatch<Metadata, Value> {
  kvApi: KVApi
  options: KVBatchOptions
  writeDispatcher: DispatchAfter<KeyValuePair>
  deleteDispatcher: DispatchAfter<string>

  constructor(args: KVBatchArgs, options: KVBatchOptions = {}) {
    const { kvApi } = args
    this.kvApi = kvApi
    this.options = { chunkSize: 10000, ...options }

    this.writeDispatcher = new DispatchAfter<KeyValuePair>({
      max: this.options.chunkSize,
      onDispatch: async (keyValuePairs) => {
        await this.kvApi.writeMultipleKeyValuePairs(keyValuePairs)
      }
    })

    this.deleteDispatcher = new DispatchAfter<string>({
      max: this.options.chunkSize,
      onDispatch: async (keys) => {
        await this.kvApi.deleteMultipleKeyValuePairs(keys)
      }
    })
  }

  set = async (key: string, metadata: Metadata, value?: Value, options?: SetOptions) => {
    const { kvTable } = this.options
    if (kvTable) {
      const { dataToWrite, keysToDelete } = await kvTable.prepareSet(key, metadata, value, options)
      await this.writeDispatcher.set(dataToWrite)
      await this.deleteDispatcher.set(keysToDelete)
    } else {
      const keyValuePair = { key, metadata, value: value || '', ...options } as KeyValuePair
      this.writeDispatcher.set(keyValuePair)
    }
  }

  del = async (key: string) => {
    const { kvTable } = this.options
    if (kvTable) {
      const keysToDelete = await kvTable.prepareDel(key)
      await this.deleteDispatcher.set(keysToDelete)
    } else {
      await this.deleteDispatcher.set(key)
    }
  }

  finish = async () => {
    await this.writeDispatcher.finish()
    await this.deleteDispatcher.finish()
  }
}
