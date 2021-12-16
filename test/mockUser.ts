import { nanoid } from 'nanoid'
import faker, { array } from 'minifaker'
import 'minifaker/dist/locales/en'

import { KVTableDefinition } from '../src/kvTable'

export interface User {
  username: string
  email: string
  active: boolean
  points: number
  timestamp: number
}

export interface UserValue extends User {
  description: string
}

const toUnix = (date: Date) => date.getTime()

export const userKVTableDefinition = {
  name: 'users',
  prefix: {
    'email': {
      keyValue: (user) => user.email
    },
    'username': {
      keyValue: (user) => user.username
    },
    'timestamp_desc': {
      sortValue: (user) => `${1000000000000000 - user.timestamp}`,
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

  const userValue = {
    description: array(10, () => faker.word()).join(' ')
  } as UserValue

  return { key, metadata: user, value: userValue }
}

export const mockUsers = (limit: number) => {
  return faker.array<{ key: string, metadata: User, value: UserValue }>(limit, () => {
    return mockUser()
  })
}
