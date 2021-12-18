import KVApi, { SetOptions } from './kvApi'

interface KVItemArgs {
  kvApi: KVApi
  key: string
}

export default class KVItem<Value, Metadata = {}> {
  kvApi: KVApi
  key: string

  constructor(kvItemArgs: KVItemArgs) {
    const { kvApi, key } = kvItemArgs
    this.kvApi = kvApi
    this.key = key
  }

  set = async (value: Value, metadata?: Metadata, setOptions?: SetOptions) => {
    return this.kvApi.writeKeyValuePair(this.key, JSON.stringify(value), metadata, setOptions)
  }

  getValue = async () => {
    const res = await this.kvApi.readKeyValuePair<Value>(this.key)
    if (res.success) return res.result
    return null
  }

  getMetadata = async () => {
    const res = await this.kvApi.listKeys<Metadata>({ prefix: this.key })
    if (res.success && res.result.length > 0) return res.result[0].metadata
    return null
  }

  del = () => {
    return this.kvApi.deleteKeyValuePair(this.key)
  }
}