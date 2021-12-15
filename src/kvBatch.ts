import KVApi, { KeyValuePair, SetOptions } from './kvApi'
import DispatchAfter from './dispatchAfter'
import KVTable from './kvTable'

interface KVBatchArgs {
  kvApi: KVApi
}

export interface KVBatchOptions {
  chunkSize?: number
}

export default class KVBatch {
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

  setFromPair = async (keyValuePair: KeyValuePair | KeyValuePair[]) => {
    await this.writeDispatcher.set(keyValuePair)
  }

  set = async <Metadata, Value>(key: string, metadata: Metadata, value?: Value, options?: SetOptions) => {
    const _value = value ? JSON.stringify(value) : ''
    const keyValuePair = { key, metadata, value: _value, ...options } as KeyValuePair
    await this.writeDispatcher.set(keyValuePair)
  }

  setToTable = async <Metadata, Value>(kvTable: KVTable<Metadata, Value>, key: string, metadata: Metadata, value?: Value, options?: SetOptions) => {
    const { dataToWrite, keysToDelete } = await kvTable.prepareSet(key, metadata, value, options)
    await this.writeDispatcher.set(dataToWrite)
    await this.deleteDispatcher.set(keysToDelete)
  }

  delFromTable = async (kvTable: KVTable<any, any>, key: string) => {
    const keysToDelete = await kvTable.prepareDel(key as string)
    await this.deleteDispatcher.set(keysToDelete)
  }

  del = async (key: string | string[], kvTable?: KVTable<any, any>) => {
    await this.deleteDispatcher.set(key)
  }

  finish = async () => {
    await this.writeDispatcher.finish()
    await this.deleteDispatcher.finish()
  }
}
