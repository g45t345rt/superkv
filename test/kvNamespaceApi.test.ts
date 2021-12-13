import { KVNamespaceApi } from '../src'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test kvNamespaceApi', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })

  expect(kvNamespaceApi.accountId).toBe(accountId)

  const res1 = await kvNamespaceApi.createNamespace('kvNamespace_test')
  expect(res1.success).toBe(true)

  const namespaceId = res1.result.id
  const res2 = await kvNamespaceApi.renameNamespace(namespaceId, 'test')
  expect(res2.success).toBe(true)

  const res3 = await kvNamespaceApi.listNamespaces()
  expect(res3.success).toBe(true)

  const res4 = await kvNamespaceApi.listNamespaces({ direction: 'desc', order: 'id', page: 0, per_page: 1 })
  expect(res4.success).toBe(true)

  const res5 = await kvNamespaceApi.removeNamespace(namespaceId)
  expect(res5.success).toBe(true)

  const namespace1 = await kvNamespaceApi.createOrGetNamespace('kvNamespace_test')
  const namespace2 = await kvNamespaceApi.resetAndGetNamespace('kvNamespace_test')
})
