interface PushAfterArgs<T> {
  max: number
  onPush: (chunks: T[]) => void
}

export default class PushAfter<T> {
  max: number
  #chunks: T[]
  #push: (chunks: T[]) => void

  constructor(args: PushAfterArgs<T>) {
    this.max = args.max
    this.#push = args.onPush
    this.#chunks = []
  }

  set = async (value: T | T[]) => {
    if (Array.isArray(value)) {
      this.#chunks = [...this.#chunks, ...value]
    } else {
      this.#chunks.push(value)
    }

    if (this.#chunks.length >= this.max) {
      await this.#push(this.#chunks)
      this.#chunks = []
    }
  }

  finish = async () => {
    await this.#push(this.#chunks)
    this.#chunks = []
  }
}
