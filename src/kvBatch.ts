import { KeyValuePair } from './kvApi'
import KVTable, { SetOptions } from './kvTable'
import PushAfter from './pushAfter'

interface KVBatchArgs<Metadata> {
  kvTable: KVTable<Metadata>
}

export interface KVBatchOptions {
  chunkSize?: number
}

export default class KVBatch<Metadata> {
  kvTable: KVTable<Metadata>
  options: KVBatchOptions
  dataToWrite: PushAfter<KeyValuePair>
  keysToDelete: PushAfter<string>

  constructor(args: KVBatchArgs<Metadata>, options: KVBatchOptions = {}) {
    const { kvTable } = args
    this.kvTable = kvTable
    const chunkSize = options.chunkSize || 10000

    this.dataToWrite = new PushAfter<KeyValuePair>({
      max: chunkSize, onPush: async (chunks) => {
        await this.kvTable.kvApi.writeMultipleKeyValuePairs(chunks)
      }
    })

    this.keysToDelete = new PushAfter<string>({
      max: chunkSize, onPush: async (chunks) => {
        await this.kvTable.kvApi.deleteMultipleKeyValuePairs(chunks)
      }
    })
  }

  set = async (key: string, metadata: Metadata, value: string, options?: SetOptions) => {
    const { dataToWrite, keysToDelete } = await this.kvTable.prepareSet(key, metadata, value, options)
    await this.dataToWrite.set(dataToWrite)
    await this.keysToDelete.set(keysToDelete)
  }

  del = async (key: string) => {
    const keysToDelete = await this.kvTable.prepareDel(key)
    await this.keysToDelete.set(keysToDelete)
  }

  finish = async () => {
    await this.dataToWrite.finish()
    await this.keysToDelete.finish()
  }
}
