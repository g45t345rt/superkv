import { KVNamespaceApi, KVTable, KVApi } from '../src'
import { mockUsers, User, userKVTableDefinition, UserValue } from './mockUser'

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

  const deleteCount = 2
  for (let i = 0; i < deleteCount; i++) {
    const user = users[i]
    users.splice(i, 1)
    await kvUsers.del(user.key)
  }

  const firstUserValue = await kvUsers.getValue(users[0].key)
  expect(firstUserValue).toEqual(users[0].value)

  // sort lexically and remove value to match list.result
  const metadataUsers = users.sort((a, b) => a.key > b.key ? 1 : -1).map((u) => ({ key: u.key, metadata: u.metadata }))

  const { result } = await kvUsers.list()
  console.log(result)
  expect(result.length).toBe(metadataUsers.length)

  const firstUser = result[0].metadata

  // Get user metadata by email
  let metadata = await kvUsers.getMetadata(firstUser.email, 'email')
  expect(metadata).toEqual(firstUser)
  console.log(metadata)

  // Get user metadata by username
  metadata = await kvUsers.getMetadata(firstUser.username, 'username')
  expect(metadata).toEqual(firstUser)

  // Get active users
  let prefix = kvUsers.createPrefixKey('isActive', 'true')
  let list = await kvUsers.list({ prefix })
  console.log(metadataUsers.filter(u => u.metadata.active), list.result)
  expect(metadataUsers.filter(u => u.metadata.active)).toEqual(list.result)

  // Get inactive users
  prefix = kvUsers.createPrefixKey('isActive', 'false')
  list = await kvUsers.list({ prefix })
  expect(metadataUsers.filter(u => !u.metadata.active)).toEqual(list.result)

  // Get users with at least 500 points
  prefix = kvUsers.createPrefixKey('>500points')
  list = await kvUsers.list({ prefix })
  expect(metadataUsers.filter(u => u.metadata.points > 500)).toEqual(list.result)

  // Get latest users
  prefix = kvUsers.createPrefixKey('timestamp_desc')
  list = await kvUsers.list({ prefix })
  expect(metadataUsers.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp)).toEqual(list.result)

  console.log(kvNamespaceApi.fetchCount)
})
