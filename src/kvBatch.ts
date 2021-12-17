import KVApi, { KeyValuePair, SetOptions } from './kvApi'
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
  dataToWrite: Map<string, KeyValuePair>
  keysToDelete: Map<string, void>

  constructor(args: KVBatchArgs, options: KVBatchOptions = {}) {
    const { kvApi } = args
    this.kvApi = kvApi
    this.options = { chunkSize: 10000, ...options }

    this.dataToWrite = new Map()
    this.keysToDelete = new Map()
  }

  send = async ({ force } = { force: false }) => {
    if (this.dataToWrite.size >= this.options.chunkSize || force) {
      const keyValuePairs = [...this.dataToWrite].map(([k, v]) => v)
      await this.kvApi.writeMultipleKeyValuePairs(keyValuePairs)
    }

    if (this.keysToDelete.size >= this.options.chunkSize || force) {
      const keys = [...this.keysToDelete].map(([k]) => k)
      await this.kvApi.deleteMultipleKeyValuePairs(keys)
    }
  }

  setToTable = async <Metadata, Value>(kvTable: KVTable<Metadata, Value>, key: string, metadata: Metadata, value?: Value, options?: SetOptions) => {
    const { dataToWrite, keysToDelete } = await kvTable.prepareSet(key, metadata, value, options)

    await this.delMulti(keysToDelete)
    await this.setMulti(dataToWrite)
  }

  delFromTable = async (kvTable: KVTable<any, any>, key: string) => {
    const keysToDelete = await kvTable.prepareDel(key)
    await this.delMulti(keysToDelete)
  }

  setMulti = async (keyValuePairs: KeyValuePair[]) => {
    for (let i = 0; keyValuePairs.length; i++) {
      const keyValuePair = keyValuePairs[i]
      await this.set(keyValuePair)
    }
  }

  set = async (keyValuePair: KeyValuePair) => {
    const { key } = keyValuePair
    this.keysToDelete.delete(key)
    this.dataToWrite.set(key, keyValuePair)
    await this.send()
  }

  delMulti = async (keys: string[]) => {
    for (let i = 0; keys.length; i++) {
      await this.del(keys[i])
    }
  }

  del = async (key: string) => {
    this.dataToWrite.delete(key)
    this.keysToDelete.set(key)
    await this.send()
  }

  finish = async () => {
    await this.send({ force: true })
  }
}
