import { KVNamespaceApi } from '../src'
import { KeyValuePair } from '../src/kvapi'
import { mockUsers } from './mockUser'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test kvApi', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })

  const namepsace = await kvNamespaceApi.resetAndGetNamespace('kvApi_test')
  const kvApi = kvNamespaceApi.useKVApi(namepsace.id)
  
  const users = mockUsers(10)
  const firstKey = users[0].key

  const keyValuePair = users.map<KeyValuePair>(user => ({ key: user.key, value: JSON.stringify(user.value), metadata: user.value }))
  const res3 = await kvApi.writeMultipleKeyValuePairs(keyValuePair)
  expect(res3.success).toBe(true)

  const value = await kvApi.readKeyValuePair(firstKey)

  const res4 = await kvApi.listKeys()
  expect(res4.success).toBe(true)
  expect(res4.result.length).toBe(users.length)

  const res5 = await kvApi.deleteMultipleKeyValuePairs(users.map(user => user.key))
  expect(res5.success).toBe(true)

  const res6 = await kvApi.deleteKeyValuePair('3n90g2n345-g2')
  expect(res6.success).toBe(true)

  const res7 = await kvApi.listKeys({ prefix: '', limit: 10, cursor: '' })
  expect(res7.success).toBe(true)

  const res8 = await kvNamespaceApi.removeNamespace(namepsace.id)
  expect(res8.success).toBe(true)
})
