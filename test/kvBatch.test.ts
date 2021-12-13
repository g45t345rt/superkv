import { KVNamespaceApi, KVTable, KVApi } from '../src'
import { mockUsers, User, userProperties } from './mockUser'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test kvTable', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })
  const namespace = await kvNamespaceApi.resetAndGetNamespace('kvtable_test')

  const kvApi = new KVApi({ kvNamespaceApi, namespaceId: namespace.id })
  const kvUsers = new KVTable<User>({
    kvApi,
    name: 'users',
    properties: userProperties
  }, {
    prefix: {
      'email': {
        keyValue: (metadata) => metadata.email
      },
      'username': {
        keyValue: (metadata) => metadata.username
      },
      'createdAt': {
        sortValue: (metadata) => metadata.createdAt.toString(),
      },
      '>500points': {
        filter: (metadata) => metadata.points > 500,
      },
      'activeAnd>1000points': {
        filter: (metadata) => metadata.points > 1000 && metadata.active,
      }
    }
  })

  const kvBatchUsers = kvUsers.useBatch()

  const userCount = 10
  const users = mockUsers(userCount)
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    await kvBatchUsers.set(user.key, user.value, JSON.stringify(user.value))
  }

  await kvBatchUsers.finish()

  console.log(kvNamespaceApi.fetchCount)
})
