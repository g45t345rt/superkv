# SUPERKV - Supercharge Clouflare KeyValue store (experimental)

Store Cloudflare KV with more control and power.

## Features

- Create complex queries within KV :) - KVTable
- Upload KeyValue bigger the 25MB limit - KVBig
- Manage namespaces (create, rename, delete) - KVNamespaceApi
- Interact with CF KV API v4 - KVApi
- Insert / delete KeyValue in bulk - KVBatch
- You can use it outside of workers and manage KV in your own server.
- Trying to be subrequest efficient (always using bulk insert for prefix keys instead of `kv.put`...) avoid hitting the 50 subrequest to fast.

## Why / Limits / Warning

- I made this because I want more control with KV storage.
- If you have ideas or you know how to optimize/fix things please help :)
- KV uses ascending lexicographical order. You can use ULID <https://www.npmjs.com/package/ulidx> or reverse the number to sort descending.
- I have no prior knowledge in making a tool for data management and this is the best I could come up with.
- Reads will sometimes reflect older state and write can take up to 60 seconds before reads in all edge locations are guaranteed <https://developers.cloudflare.com/workers/platform/limits#kv>

## TODO

- [] Local KV api emulator
- [] KV triggers

## How to use it

For more example check `test` folder

### Simple usage

```ts
import { KVNamespaceApi } from 'superkv'
import { ulid } from 'ulid'

interface User {
  username: string
  points: number
  active: boolean
  timestamp: number
}

const userTableDefinition = {
  name: 'users',
  prefix: {
    'username': {
      keyValue: (metadata) => metadata.username
    },
    '>500points': {
      filter: (metadata) => metadata.points > 500,
    },
    'isActive': {
      sortValue: (metadata) => metadata.active ? 'true' : 'false',
    },
    'timestamp_desc': {
      sortValue: (metadata) => ulid(timestamp),
    },
  }
} as KVTableDefinition<User>

const main = async () => {
  const accountId = '', authToken = ''
  const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })
  const namespace = await kvNamespaceApi.createOrGetNamespace('worker_namespace')
  const kvApi = kvNamespaceApi.useKVApi()
  const kvUsers = kvApi.useKVTable(userTableDefinition)

  // Get user by key
  const user = await kvUsers.getMetadata('{key}')

  // Get user by username
  const user = await kvUsers.getMetadata('{username}'. 'username')

  // Get users with lease 500 points
  const prefix = kvUsers.createPrefixKey('>500points')
  const list = await kvUsers.list({ prefix })

  // Get active users
  const prefix = kvUsers.createPrefixKey('isActive', 'true')
  const list = await kvUsers.list({ prefix })

  // Get latest users
  const prefix = kvUsers.createPrefixKey('timestamp_desc')
  const list = await kvUsers.list({ prefix })
}

main()
```

### KVNamespaceApi

#### Initialize

```ts
import { KVNamespaceApi } from 'superkv'
const accountId = '', authToken = ''
const kvNamespaceApi = new KVNamespaceApi({ accountId }, { authToken })
```

#### Create a new namespace

```ts
const res = await kvNamespaceApi.createNamespace('{title}')
// { success, errors, messages }
const namespace = res.result
// { id, title, supports_url_encoding }
```

#### Rename namespace

```ts
const res = await kvNamespaceApi.renameNamespace('{namespaceId}', '{title}')
```

#### Remove namespace

```ts
const res = await kvNamespaceApi.removeNamespace('{namespaceId}')
```

#### List namespaces

```ts
const res = await kvNamespaceApi.listNamespaces()
const res = await kvNamespaceApi.listNamespaces({ direction: 'desc', order: 'id', page: 0, per_page: 1 })
```

#### Create or get namespace

```ts
const namespace = await kvNamespaceApi.createOrGetNamespace('{namespaceTitle}')
```

#### Reset or get namespace

I usually use this for testing and want to purge data every run

```ts
const namespace = await kvNamespaceApi.resetAndGetNamespace('{namespaceTitle}')
```

### KVApi

#### Initialize

```ts
const namespace = await kvNamespaceApi.createOrGetNamespace('{namespaceTitle}')
const kvApi = kvNamespaceApi.useKVApi(namespace.id)
// or
const kvApi = new KVApi({ kvNamespaceApi, namespaceId: namespace.id })
```

#### Read keyValue

```ts
const res = await kvApi.readKeyValuePair('{key}')
// { success, errors, messages }
const value = res.result
```

#### Write keyValue

```ts
const res = await kvApi.writeKeyValuePair('{key}', '{value}')
const res = await kvApi.writeKeyValuePair('{key}', '{value}', metadata, { expiration: 1578435000, expiration_ttl: 300 })
```

#### Write multiple keyValue

```ts
const res = await kvApi.writeMultipleKeyValuePairs([
  { key: '{key}', value: '{value}' }
  { key: '{key}', value: '{value}', metadata: {} },
  { key: '{key}', value: '{value}', metadata: {}, expiration: 1578435000, expiration_ttl: 300 }
])
```

#### Delete keyValue

```ts
const res = await kvApi.deleteKeyValuePair('{key}')
```

#### Delete multiple keyValue

```ts
const res = await kvApi.deleteMultipleKeyValuePairs(['{key}', '{key}'])
```

#### List keyValues

```ts
const res = await kvApi.listKeys({ prefix: '', limit: 10, cursor: '' })
const result = res.result
// { name, expiration, metadata }[]
const result_info = res.result_info
// { count, cursor }
```

### KVTable

#### Initialize

```ts
const tableDefinition = { name, prefix, ... }
const kvUser = kvApi.useKVTable<Metadata>(tableDefinition)
// or
const kvUser = new KVTable<Metadata>({ kvApi, tableDefinition })
```

#### Set user

```ts
const user = { username: 'fred', emai: 'fred@mail.com', ... }
await kvUsers.set('{key}', user)
```

#### Del user

```ts
await kvUsers.del('{key}')
```

#### Get user

```ts
await kvUsers.del('{key}')
```

#### List users

```ts
const list = await kvUsers.list()
const result = list.result
// { key: name, expiration, metadata }[]
const cursor = list.cursor

// or list by prefix
const prefix = kvUsers.createPrefixKey('{prefixName}')
const list = await kvUsers.list({ prefix })
```

#### Iterator

```ts
const prefix = kvUsers.createPrefixKey('{prefixName}')
const it = kvUsers.iterator(prefix)
let result = await it.next()
while (!result.done) {
  const list = result.value
}
```

#### Update prefix

```ts
await kvUsers.updatePrefix()
```

#### Delete prefix

```ts
await kvUsers.delPrefix('{prefixName}')
```

### KVBatch

#### Initialize

```ts
const kvBatch = kvApi.useKVBig()
// or
const kvBatch = new KVBig({ kvApi })
```

#### Set keyValue in bulk

```ts
for (const user of users) {
    await kvBatch.set('{key}', metadata, '{value}')
}
await kvBatch.finish()
```

#### Delete keyValue in bulk

```ts
for (const user of users) {
    await kvBatch.del('{key}')
}
await kvBatch.finish()
```

### KVBig

#### Initialize

```ts
const kvBig = kvApi.useKVBig()
// or
const kvBig = new KVBig({ kvApi })
```

#### Write kv file from readStream

```ts
import { open } from 'fs/promises'

const fd = await open('./data.txt', 'r')
await kvBig.set('{key}', fd.createReadStream())
```

#### Get KV file to writeStream

```ts
import { open } from 'fs/promises'

const fd = await open('./data.txt', 'a')
await kvBig.get('{key}', fd.createWriteStream())
```

## Previous package

<https://github.com/g45t345rt/cf-kvprefix>

`cf-kvprefix` is deprecated in a favor of `superkv`

- Only works in workers
- Does not use any bulk operations
- Can't update or add new prefix
- Is not subrequest efficient
- Can't upload KeyValue bigger than 25MB
