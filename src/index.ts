import KVApi from './kvapi'
import KVNamespaceApi from './kvNamespaceApi'
import KVTable, { KVTableDefinition } from './kvtable'
import KVBatch from './kvbatch'
import KVBig from './kvBig'
import KVItem from './kvItem'

if (!globalThis.fetch) {
  throw new Error(`[fetch] is not defined. You are mostly using node and need a fetch polyfill like [isomorphic-fetch].`)
}

export {
  KVApi,
  KVNamespaceApi,
  KVTable,
  KVBatch,
  KVBig,
  KVItem,
  KVTableDefinition
}
