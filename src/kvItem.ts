import KVApi from './kvApi'

interface KVItemArgs {
  kvApi: KVApi
  key: string
}

export default class KVItem<Value> {
  kvApi: KVApi
  key: string

  constructor(kvItemArgs: KVItemArgs) {
    const { kvApi, key } = kvItemArgs
    this.kvApi = kvApi
    this.key = key
  }

  set = async (value: Value) => {
    const res = await this.kvApi.writeKeyValuePair(this.key, JSON.stringify(value))
    if (!res.success) throw res
  }

  get = async () => {
    const res = await this.kvApi.readKeyValuePair<Value>(this.key)
    if (!res.success) throw res
    return res.result
  }

  del = async () => {
    const res = await this.kvApi.deleteKeyValuePair(this.key)
    if (!res.success) throw res
  }
}