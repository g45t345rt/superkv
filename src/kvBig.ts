import KVApi from './kvApi'
import { Writable, Readable } from 'stream'

interface KVBigArgs {
  kvApi: KVApi
}

export interface KVBigOptions {
  chunkSize?: number
  encoding?: BufferEncoding
}

interface KVBigMetadata {
  name: string
  type: string
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

  getMetadata = async (key: string) => {
    const list = await this.kvApi.listKeys<KVBigMetadata>({ prefix: this.createShardKey(key) }) // get first shard for shardCount
    if (list.result.length === 0) return null
    const shardKeys = list.result.map(r => r.name)
    const firstShard = list.result[0]
    const { name, type } = firstShard.metadata || {}
    return {
      name,
      type,
      shardKeys
    }
  }

  get = async (key: string, writable: Writable) => {
    const writeChunk = (chunk) => new Promise<void>((resolve, reject) => {
      writable.write(chunk, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    const metadata = await this.getMetadata(key)
    if (!metadata) return null

    const { shardKeys } = metadata
    for (let i = 0; i < shardKeys.length; i++) {
      const value = await this.kvApi.readKeyValuePair(shardKeys[i])
      const chunk = Buffer.from(value, this.options.encoding)

      await writeChunk(chunk)
    }
  }

  sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms))

  set = async (key: string, reader: Readable, metadata?: KVBigMetadata) => {
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
      await this.kvApi.writeKeyValuePair(shardKey, buffer.toString(this.options.encoding))
      console.log('Done', shardNumber)
      shardNumber++
    }

    for await (const chunk of reader) {
      await this.sleep(250)

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
    const { shardKeys } = await this.getMetadata(key)
    if (!shardKeys) return

    const keysToDelete = []
    for (let i = 0; i < shardKeys.length; i++) {
      keysToDelete.push(shardKeys[i])
    }

    await this.kvApi.deleteMultipleKeyValuePairs(keysToDelete)
  }
}
