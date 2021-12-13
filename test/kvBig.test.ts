import { KVNamespaceApi } from '../src'
import { open } from 'fs/promises'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test createShardKey', () => {

})

test('Test kvBig set', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })

  expect(kvNamespaceApi.accountId).toBe(accountId)

  const namepsace = await kvNamespaceApi.createOrGetNamespace('kbBig_test')
  const kvApi = kvNamespaceApi.useKVApi(namepsace.id)
  
  const kvBig = kvApi.useKVBig({ chunkSize: 500000 })

  const shardKey0 = kvBig.createShardKey('testing', 0)
  expect(shardKey0).toBe('testing__shard000')

  const shardKey1 = kvBig.createShardKey('testing', 1)
  expect(shardKey1).toBe('testing__shard001')

  const shardKey10 = kvBig.createShardKey('testing', 10)
  expect(shardKey10).toBe('testing__shard010')

  const shardKey100 = kvBig.createShardKey('testing', 100)
  expect(shardKey100).toBe('testing__shard100')

  //const fd = await open('./test/sample-2mb.json', 'r')
  //const readStream = fd.createReadStream()
  //await kvBig.set('file', readStream)

  const fd2 = await open('./test/sample-from-get.json', 'a')
  await kvBig.get('file', fd2.createWriteStream())
})
