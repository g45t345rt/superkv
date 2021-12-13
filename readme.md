# SUPERKV (experimental)

Store Cloudflare KV data with more control and power.

## Features

- Batch insert / delete
- Trying to be subrequest efficient (using KV Bulk insert / delete instead of `kv.put`...) because of the 50 subrequest limit :(
- Create namepspaces & table with prefixes
- Using metadata sharding - you can insert file bigger than 10MB but don't forget the 128MB worker limit or run your script outside Cloudflare
- Create complex queries within KV :)

## Classes

- KVNamespaceApi - manage kv namespaces (create, rename, delete)
- KVApi - kv underlying api (readKeyValuePair, listKeys, deleteMultipleKeyValuePairs, deleteKeyValuePair,writeMultipleKeyValuePairs)
- KVTable - set / delete keyValues with managed prefix
- KVBatch - set / delete keyValues in bulk
- KVBig - set / get / delete big files without LIMIT :) bypassing the 25MB limit

## Why / Limits / Warning

- I made this because wanted to have more control over the KV storage.
- If you have ideas or you know how to optimize/fix things please help :)
- KV uses lexicographical order ascending only so if you want to sort descending...
- I have no prior knowledge in making a database interface and this is the best I could come up with.

## How to use it

### KVNamespaceApi

### KVApi

### KVTable

### KVBatch

### KVBig

## Development

## Previous try

<https://github.com/g45t345rt/cf-kvprefix>

