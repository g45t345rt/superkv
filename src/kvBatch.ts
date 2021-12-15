import KVApi, { KeyValuePair, SetOptions } from './kvApi'
import DispatchAfter from './dispatchAfter'

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

  setPair = async (keyValuePair: KeyValuePair | KeyValuePair[]) => {
    await this.writeDispatcher.set(keyValuePair)
  }

  set = async <Metadata, Value>(key: string, metadata: Metadata, value?: Value, options?: SetOptions) => {
    const _value = value ? JSON.stringify(value) : ''
    const keyValuePair = { key, metadata, value: _value, ...options } as KeyValuePair
    await this.writeDispatcher.set(keyValuePair)
  }

  del = async (key: string | string[]) => {
    await this.deleteDispatcher.set(key)
  }

  finish = async () => {
    await this.writeDispatcher.finish()
    await this.deleteDispatcher.finish()
  }
}
