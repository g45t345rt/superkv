import { KVNamespaceApi } from '../src'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test kvApi', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })

  const namepsace = await kvNamespaceApi.resetAndGetNamespace('kvApi_test')
  const kvApi = kvNamespaceApi.useKVApi(namepsace.id)

  const itemValue = { test: true }
  const itemMetadata = { hello: 'world' }
  const res = await kvApi.writeKeyValuePair('test', JSON.stringify(itemValue), itemMetadata)
  expect(res.success).toBe(true)

  const test2 = await kvApi.readKeyValuePair('test')
  expect(test2.result).toEqual(itemValue)

  const test3 = await kvApi.listKeys()
  expect(test3.result[0].metadata).toEqual(itemMetadata)
})
