interface DispatchAfterArgs<T> {
  max: number
  onDispatch: (chunks: T[]) => void
}

export default class DispatchAfter<T> {
  max: number
  chunks: T[]
  dispatch: (chunks: T[]) => void

  constructor(args: DispatchAfterArgs<T>) {
    this.max = args.max
    this.dispatch = args.onDispatch
    this.chunks = []
  }

  set = async (value: T | T[]) => {
    if (Array.isArray(value)) {
      this.chunks = [...this.chunks, ...value]
    } else {
      this.chunks.push(value)
    }

    if (this.chunks.length >= this.max) {
      await this.dispatch(this.chunks)
      this.chunks = []
    }
  }

  finish = async () => {
    await this.dispatch(this.chunks)
    this.chunks = []
  }
}
