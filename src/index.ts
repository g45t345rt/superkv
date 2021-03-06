import KVNamespaceApi from './kvNamespaceApi'
import KVApi, { KeyValuePair } from './kvApi'
import KVTable, { KVTableDefinition, ListOptions } from './kvTable'
import KVBatch from './kvBatch'
import KVBig from './kvBig'
import KVItem from './kvItem'

if (!globalThis.fetch) {
  throw new Error(`[fetch] is not defined. You are mostly using node and need a fetch polyfill like [isomorphic-fetch].`)
}

if (!globalThis.FormData) {
  throw new Error(`[FormData] is not defined. You are mostly using node and need a FormData polyfill like [isomorphic-form-data].`)
}

export {
  KVApi,
  KVNamespaceApi,
  KVTable,
  KVBatch,
  KVBig,
  KVItem,
  ListOptions,
  KeyValuePair,
  KVTableDefinition
}
