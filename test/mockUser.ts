import { nanoid } from 'nanoid'
import faker from 'minifaker'
import 'minifaker/dist/locales/en'

export interface User {
  username: string
  email: string
  active: boolean
  points: number
  createdAt: number
  description: string
}

const toUnix = (date: Date) => new Date(date).getTime()

export const mockUser = () => {
  const key = nanoid()
  const user = {
    username: faker.username(),
    email: faker.email(),
    points: faker.number({ float: true }) * 100,
    active: faker.boolean(),
    createdAt: toUnix(faker.date({ from: new Date(2019), to: new Date(2020) }))
  } as User

  return { key, value: user }
}

export const mockUsers = (limit: number) => {
  return faker.array<{ key: string, value: User }>(limit, () => {
    return mockUser()
  })
}
