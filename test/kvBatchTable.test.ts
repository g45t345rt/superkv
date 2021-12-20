import { KVNamespaceApi } from '../src'

import { mockUser, User, userKVTableDefinition, UserValue } from './mockUser'
import sleep from './sleep'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test kvNamespaceApi', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })
  const namespace = await kvNamespaceApi.resetAndGetNamespace('kvBatchTable_test')

  const kvApi = kvNamespaceApi.useKVApi(namespace.id)
  const kvBatch = kvApi.useKVBatch()
  const kvUsers = kvApi.useKVTable<User, void>({
    name: 'users',
    prefix: {
      'timestamp': {
        sortValue: (metadata) => `${10000000000000 - metadata.timestamp}`
      }
    }
  })

  const user = mockUser()
  await kvBatch.setToTable(kvUsers, user.key, user.metadata)
  user.metadata.timestamp = new Date().getTime()
  await kvBatch.setToTable(kvUsers, user.key, user.metadata)
  await kvBatch.finish()

  await sleep(1000)

  const prefix = kvUsers.createPrefixKey('timestamp')
  const res = await kvUsers.list({ prefix })
  // make sure it's one because we inserted the same value twice but the second one must overwrite that last one including prefixes even if they are not the same!
  expect(res.result.length).toBe(1)
})
