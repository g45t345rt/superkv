import { KVNamespaceApi } from '../src'
import { mockUsers, userKVTableDefinition } from './mockUser'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test kvBatch with kvTable', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })
  const namespace = await kvNamespaceApi.resetAndGetNamespace('kbBatch_test')

  const kvApi = kvNamespaceApi.useKVApi(namespace.id)
  const kvUsers = kvApi.useKVTable(userKVTableDefinition)
  const kvBatchUsers = kvUsers.useBatch()

  const userCount = 10
  const users = mockUsers(userCount)
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    await kvBatchUsers.set(user.key, user.metadata)
  }

  await kvBatchUsers.finish()

  console.log(kvNamespaceApi.fetchCount)
})
