import { KVNamespaceApi } from '../src'

const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN

interface Item {
  name: string
  description: string
}

test('Test kvItem', async () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })

  const namepsace = await kvNamespaceApi.resetAndGetNamespace('kvItem_test')
  const kvApi = kvNamespaceApi.useKVApi(namepsace.id)

  const kvNotFoundItem = kvApi.useKVItem<Item>('asdfgwkergkwem')

  await expect(kvNotFoundItem.get()).rejects.toThrowError()

  const kvItem = kvApi.useKVItem<Item>('single_key')

  const itemData = { name: 'test', description: 'lorem ipsum' }
  await kvItem.set(itemData)

  const item = await kvItem.get()
  expect(item).toEqual(itemData)

  await kvItem.del()
})