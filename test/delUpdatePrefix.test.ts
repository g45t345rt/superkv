import { KVNamespaceApi, KVTable, KVApi } from '../src'
import { mockUsers, User, userKVTableDefinition, UserValue } from './mockUser'
import sleep from './sleep'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test kvTable', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })
  const namespace = await kvNamespaceApi.resetAndGetNamespace('kvTable_test')

  const kvApi = new KVApi({ kvNamespaceApi, namespaceId: namespace.id })
  const kvUsers = new KVTable<User, UserValue>({ kvApi, tableDefinition: userKVTableDefinition })

  const userCount = 10
  const users = mockUsers(userCount)
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    await kvUsers.set(user.key, user.metadata, user.value)
  }

  const metadataUsers = users.sort((a, b) => a.key > b.key ? 1 : -1).map((u) => ({ key: u.key, metadata: u.metadata }))

  await kvUsers.delPrefix('timestamp_desc')

  await sleep(1000)
  const prefix = kvUsers.createPrefixKey('timestamp_desc')
  let res = await kvUsers.list({ prefix })
  expect(res.result.length).toBe(0)

  await kvUsers.updatePrefix()
  await sleep(1000)
  res = await kvUsers.list({ prefix })
  expect(res.result.map((r) => ({ key: r.key, metadata: r.metadata, expiration: r.expiration }))).toEqual(metadataUsers.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp))
})
