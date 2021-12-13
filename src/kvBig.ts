import KVApi from './kvApi'
import { Writable, Readable } from 'stream'

interface KVBigArgs {
  kvApi: KVApi
}

export interface KVBigOptions {
  chunkSize?: number
  encoding?: BufferEncoding
}

export default class KVBig {
  kvApi: KVApi
  options: KVBigOptions

  constructor(args: KVBigArgs, options?: KVBigOptions) {
    const { kvApi } = args
    this.kvApi = kvApi
    this.options = { chunkSize: 25000000, encoding: 'base64url', ...options } // chunkSize 25MB default
  }

  createShardKey = (key: string, shardNumber?: number) => {
    const number = shardNumber !== null && shardNumber !== undefined ? shardNumber.toString().padStart(3, '0') : ''
    return `${key}__shard${number}`
  }

  getTotalShards = async (key: string) => {
    const list = await this.kvApi.listKeys({ prefix: this.createShardKey(key) })
    if (list.result.length === 0) return 0
    return list.result.length
  }

  get = async (key: string, writable: Writable) => {
    const writeChunk = (chunk) => new Promise<void>((resolve, reject) => {
      writable.write(chunk, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    const totalShards = await this.getTotalShards(key)
    if (totalShards === 0) return null

    for (let i = 0; i < totalShards; i++) {
      const shardKey = this.createShardKey(key, i)
      const res = await this.kvApi.readKeyValuePair(shardKey)
      if (!res.success) throw res

      const chunk = Buffer.from(res.result, this.options.encoding)

      await writeChunk(chunk)
    }
  }

  set = async (key: string, reader: Readable) => {
    let chunks = []
    let dataSize = 0
    let shardNumber = 0

    const sendChunk = async () => {
      if (chunks.length === 0) return
      const buffer = Buffer.concat(chunks)
      dataSize = 0
      chunks = []

      console.log('Writing keyValuePair', buffer.length)
      const shardKey = this.createShardKey(key, shardNumber)
      await this.kvApi.writeKeyValuePair(shardKey, buffer.toString(this.options.encoding), {})
      console.log('Done', shardNumber)
      shardNumber++
    }

    for await (const chunk of reader) {
      const chunkSize = chunk.length
      if (dataSize + chunkSize > this.options.chunkSize) {
        await sendChunk()
      }

      chunks.push(chunk)
      dataSize += chunkSize
      console.log('New chunk', dataSize)
    }

    await sendChunk() // send rest if any
  }

  del = async (key: string) => {
    const totalShards = await this.getTotalShards(key)
    if (totalShards === 0) return

    const keysToDelete = []
    for (let i = 0; i < totalShards; i++) {
      const shardKey = this.createShardKey(key, i)
      keysToDelete.push(shardKey)
    }

    await this.kvApi.deleteMultipleKeyValuePairs(keysToDelete)
  }
}
