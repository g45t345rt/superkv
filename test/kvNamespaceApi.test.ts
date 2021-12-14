import { nanoid } from 'nanoid'

import { KVNamespaceApi } from '../src'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

test('Test kvNamespaceApi', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })

  expect(kvNamespaceApi.accountId).toBe(accountId)

  let title = `kvNamespace_test_${nanoid()}`
  const res1 = await kvNamespaceApi.createNamespace(title)
  expect(res1.success).toBe(true)

  const namespaceId = res1.result.id
  title = `kvNamespace_test_${nanoid()}`
  const res2 = await kvNamespaceApi.renameNamespace(namespaceId, title)
  expect(res2.success).toBe(true)

  const res3 = await kvNamespaceApi.listNamespaces()
  expect(res3.success).toBe(true)

  const res4 = await kvNamespaceApi.listNamespaces({ direction: 'desc', order: 'id', page: 0, per_page: 1 })
  expect(res4.success).toBe(true)

  const namespace1 = await kvNamespaceApi.createOrGetNamespace(title)
  console.log(namespace1)

  const namespace2 = await kvNamespaceApi.resetAndGetNamespace(title)
  console.log(namespace2)

  const res5 = await kvNamespaceApi.removeNamespace(namespace2.id)
  expect(res5.success).toBe(true)
})
