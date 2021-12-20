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
  tableWriteStore: Map<string, KeyValuePair[]>
  tableDeleteStore: Map<string, string[]>

  constructor(args: KVBatchArgs, options: KVBatchOptions = {}) {
    const { kvApi } = args
    this.kvApi = kvApi
    this.options = { chunkSize: 10000, ...options }

    this.dataToWrite = new Map()
    this.keysToDelete = new Map()
    this.tableWriteStore = new Map()
    this.tableDeleteStore = new Map()
  }

  send = async ({ force } = { force: false }) => {
    if (this.dataToWrite.size >= this.options.chunkSize || force) {
      const keyValuePairs = [...this.dataToWrite].map(([k, v]) => v)
      await this.kvApi.writeMultipleKeyValuePairs(keyValuePairs)
      this.dataToWrite.clear()
      this.tableWriteStore.clear()
    }

    if (this.keysToDelete.size >= this.options.chunkSize || force) {
      const keys = [...this.keysToDelete].map(([k]) => k)
      await this.kvApi.deleteMultipleKeyValuePairs(keys)
      this.keysToDelete.clear()
      this.tableDeleteStore.clear()
    }
  }

  setToTable = async <Metadata, Value>(kvTable: KVTable<Metadata, Value>, key: string, metadata: Metadata, value?: Value, options?: SetOptions) => {
    const { dataToWrite, keysToDelete } = await kvTable.prepareSet(key, metadata, value, options)

    this.cleanKeyFromTableStore(key)
    await this.delMulti(keysToDelete)
    await this.setMulti(dataToWrite)
    this.tableWriteStore.set(key, dataToWrite)
    this.tableDeleteStore.set(key, keysToDelete)
  }

  cleanKeyFromTableStore = (key: string) => {
    const currentDataToWrite = this.tableWriteStore.get(key)
    if (currentDataToWrite) currentDataToWrite.forEach((keyValuePair) => this.dataToWrite.delete(keyValuePair.key))

    const currentKeysToDelete = this.tableDeleteStore.get(key)
    if (currentKeysToDelete) currentKeysToDelete.forEach((k) => this.keysToDelete.delete(k))
  }

  delFromTable = async (kvTable: KVTable<any, any>, key: string) => {
    const keysToDelete = await kvTable.prepareDel(key)

    this.cleanKeyFromTableStore(key)
    await this.delMulti(keysToDelete)
    this.tableDeleteStore.set(key, keysToDelete)
  }

  setMulti = async (keyValuePairs: KeyValuePair[]) => {
    for (let i = 0; i < keyValuePairs.length; i++) {
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
    for (let i = 0; i < keys.length; i++) {
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
