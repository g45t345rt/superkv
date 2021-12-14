import { KVNamespaceApi, KVTable, KVApi } from '../src'
import { mockUsers, userKVTableDefinition } from './mockUser'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test kvTable', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })
  const namespace = await kvNamespaceApi.resetAndGetNamespace('kvTable_test')

  const kvApi = new KVApi({ kvNamespaceApi, namespaceId: namespace.id })
  const kvUsers = new KVTable({ kvApi, tableDefinition: userKVTableDefinition })

  const userCount = 10
  const users = mockUsers(userCount)
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    await kvUsers.set(user.key, user.metadata)
  }

  const deleteCount = 2
  for (let i = 0; i < deleteCount; i++) {
    const user = users[i]
    users.splice(i, 1)
    await kvUsers.del(user.key)
  }

  users.sort((a, b) => a.key > b.key ? 1 : -1)

  const { result } = await kvUsers.list()
  console.log(result)
  expect(result.length).toBe(users.length)

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
  expect(users.filter(u => u.metadata.active)).toEqual(list.result)

  // Get inactive users
  prefix = kvUsers.createPrefixKey('isActive', 'false')
  list = await kvUsers.list({ prefix })
  expect(users.filter(u => !u.metadata.active)).toEqual(list.result)

  // Get users with at least 500 points
  prefix = kvUsers.createPrefixKey('>500points')
  list = await kvUsers.list({ prefix })
  expect(users.filter(u => u.metadata.points > 500)).toEqual(list.result)

  // Get latest users
  prefix = kvUsers.createPrefixKey('timestamp_desc')
  list = await kvUsers.list({ prefix })
  expect(users.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp)).toEqual(list.result)

  console.log(kvNamespaceApi.fetchCount)
})
