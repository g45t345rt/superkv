import { KVNamespaceApi, KVApi, KVBig, KVItem, KVTable, KVBatch } from '../dist'

test('Test dist', () => {
  const kvNamespaceApi = new KVNamespaceApi({ accountId: '' })

  const kvApi = kvNamespaceApi.useKVApi('')
  const kvApi2 = new KVApi({ kvNamespaceApi, namespaceId: '' })

  const kvBig = kvApi.useKVBig()
  const kvBig2 = new KVBig({ kvApi })

  const kvItem = kvApi.useKVItem('')
  const kvItem2 = new KVItem({ kvApi, key: '' })

  const kvTable = kvApi.useKVTable({ name: '' })
  const kvTable2 = new KVTable({ kvApi, tableDefinition: { name: '' } })

  const kvBatch = kvApi.useKVBatch()
  const kvBatch2 = new KVBatch({ kvApi })
})