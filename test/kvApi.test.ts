import { KVNamespaceApi, KeyValuePair } from '../src'
import { mockUsers } from './mockUser'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test kvApi', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })

  const namepsace = await kvNamespaceApi.resetAndGetNamespace('kvApi_test')
  const kvApi = kvNamespaceApi.useKVApi(namepsace.id)

  const users = mockUsers(10)
  const firstUser = users[0]

  const keyValuePair = users.map<KeyValuePair>(user => ({ key: user.key, value: JSON.stringify(user.value), metadata: user.value }))
  const res1 = await kvApi.writeMultipleKeyValuePairs(keyValuePair)
  expect(res1.success).toBe(true)

  const res2 = await kvApi.readKeyValuePair(firstUser.key)
  expect(res2.success).toBe(true)
  expect(res2.result).toEqual(firstUser.value)

  const res3 = await kvApi.readKeyValuePair('notfound')
  expect(res3.success).toBe(false)
  expect(res3.result).toBe(null)

  const res4 = await kvApi.listKeys()
  expect(res4.success).toBe(true)
  expect(res4.result.length).toBe(users.length)

  const res5 = await kvApi.deleteMultipleKeyValuePairs(users.map(user => user.key))
  expect(res5.success).toBe(true)

  const res6 = await kvApi.deleteKeyValuePair('3n90g2n345-g2')
  expect(res6.success).toBe(true)

  const res7 = await kvApi.listKeys({ prefix: '', limit: 10, cursor: '' })
  expect(res7.success).toBe(true)

  const res8 = await kvApi.writeKeyValuePair('test', 'hello', { test: 'hello' }, { expiration: 1578435000, expiration_ttl: 300 })
  expect(res8.success).toBe(true)

  const res9 = await kvNamespaceApi.removeNamespace(namepsace.id)
  expect(res9.success).toBe(true)
})
