import KVApi from './kvApi'

interface KVNamespaceApiArgs {
  accountId: string
}

export interface KVNamespaceApiOptions {
  authToken?: string
  xAuthApi?: string
  xAuthEmail?: string
  userAgent?: string
}

interface ListNamespacesOptions {
  page?: number
  per_page?: number
  order?: 'id' | 'title'
  direction?: 'asc' | 'desc'
}

export interface NamespaceResponse<T> {
  success: boolean
  errors: {
    code: number
    message: string
  }[]
  messages: []
  result?: T
}

interface Namespace {
  id: string
  title: string
  supports_url_encoding: boolean
}

export default class KVNamespaceApi {
  accountId: string
  options: KVNamespaceApiOptions
  fetchCount: number

  constructor(args: KVNamespaceApiArgs, options?: KVNamespaceApiOptions) {
    const { accountId } = args
    this.accountId = accountId
    this.options = options || {}
    this.fetchCount = 0
  }

  fetch = async (path: string, init: RequestInit, setJsonHeader = true) => {
    this.fetchCount++
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces${path}`

    const { authToken, userAgent, xAuthApi, xAuthEmail } = this.options
    if (!init.headers) init.headers = {}
    if (authToken) init.headers['authorization'] = `Bearer ${authToken}`
    if (userAgent) init.headers['user-agent'] = userAgent
    if (xAuthApi) init.headers['x-auth-api'] = xAuthApi
    if (xAuthEmail) init.headers['x-auth-email'] = xAuthEmail

    if (setJsonHeader && !init.headers['content-type']) init.headers['content-type'] = `application/json`

    const res = await fetch(endpoint, init)
    const data = await res.json()
    return data
  }

  createOrGetNamespace = async (title: string): Promise<Namespace> => {
    const res1 = await this.listNamespaces()
    const namespace = res1.result.find((item) => item.title === title)
    if (namespace) return namespace

    const res2 = await this.createNamespace(title)
    return res2.result
  }

  resetAndGetNamespace = async (title: string): Promise<Namespace> => {
    const res1 = await this.listNamespaces()
    const namespace = res1.result.find((item) => item.title === title)
    if (namespace) await this.removeNamespace(namespace.id)

    const res2 = await this.createNamespace(title)
    return res2.result
  }

  createNamespace = (title: string): Promise<NamespaceResponse<Namespace>> => {
    return this.fetch(``, {
      method: 'POST',
      body: JSON.stringify({ title })
    })
  }

  removeNamespace = (id: string): Promise<NamespaceResponse<void>> => {
    return this.fetch(`/${id}`, {
      method: 'DELETE'
    })
  }

  renameNamespace = (id: string, title: string): Promise<NamespaceResponse<void>> => {
    return this.fetch(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title })
    })
  }

  listNamespaces = (listOptions: ListNamespacesOptions = {}): Promise<NamespaceResponse<Namespace[]>> => {
    const initParams = {}
    if (listOptions) {
      if (listOptions.direction) initParams['direction'] = listOptions.direction
      if (listOptions.order) initParams['order'] = listOptions.order
      if (listOptions.page) initParams['page'] = listOptions.page.toString()
      if (listOptions.per_page) initParams['per_page'] = listOptions.per_page.toString()
    }

    const params = new URLSearchParams(initParams)

    return this.fetch(`?${params.toString()}`, {
      method: 'GET'
    })
  }

  useKVApi = (namespaceId: string) => {
    return new KVApi({ namespaceId, kvNamespaceApi: this })
  }
}
