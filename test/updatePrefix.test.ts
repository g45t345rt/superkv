import { KVNamespaceApi, KVTable, KVApi } from '../src'
import { mockUsers, User, userKVTableDefinition, UserValue } from './mockUser'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

  await kvUsers.updatePrefix()
})
