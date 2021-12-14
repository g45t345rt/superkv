import { nanoid } from 'nanoid'
import faker from 'minifaker'
import { ulid } from 'ulid'
import 'minifaker/dist/locales/en'

import { KVTableDefinition } from '../src/kvTable'

export interface User {
  username: string
  email: string
  active: boolean
  points: number
  timestamp: number
  description: string
}

export const userProperties = [
  'username', 'email', 'active', 'points', 'timestamp', 'description'
]

const toUnix = (date: Date) => date.getTime()

export const userKVTableDefinition = {
  name: 'users',
  properties: userProperties,
  prefix: {
    'email': {
      keyValue: (user) => user.email
    },
    'username': {
      keyValue: (user) => user.username
    },
    'timestamp_desc': {
      sortValue: (user) => ulid(user.timestamp),
    },
    '>500points': {
      filter: (user) => user.points > 500,
    },
    'isActive': {
      sortValue: (user) => user.active ? 'true' : 'false'
    }
  }
} as KVTableDefinition<User>


export const mockUser = () => {
  const key = nanoid()
  const user = {
    username: faker.username(),
    email: faker.email(),
    points: faker.number({ max: 1000 }),
    active: faker.boolean(),
    timestamp: toUnix(faker.date({ from: new Date('2019'), to: new Date('2020') }))
  } as User

  return { key, metadata: user }
}

export const mockUsers = (limit: number) => {
  return faker.array<{ key: string, metadata: User }>(limit, () => {
    return mockUser()
  })
}
