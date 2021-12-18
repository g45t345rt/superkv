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

  const notFoundValue = await kvNotFoundItem.getValue()
  expect(notFoundValue).toBe(null)

  const kvItem = kvApi.useKVItem<Item>('single_key')

  const itemValue = { name: 'test', description: 'lorem ipsum' }
  const itemMetadata = { hello: 'world' }
  await kvItem.set(itemValue, itemMetadata)

  const _itemValue = await kvItem.getValue()
  expect(_itemValue).toEqual(itemValue)

  const _itemMetadata = await kvItem.getMetadata()
  expect(_itemMetadata).toEqual(itemMetadata)

  await kvItem.del()
})