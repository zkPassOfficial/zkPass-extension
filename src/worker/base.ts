export enum WorkerStaus {
  EMPTY = 'empty',
  RUNNING = 'running'
}

interface WebWorker extends Worker {
  status: WorkerStaus
}

export default class WorkerBase {
  count: number// worker count
  workers: WebWorker[]
  promissWorkers?: Promise<WebWorker>[]

  constructor(count: number, workerScript: string) {
    this.count = count
    this.workers = Array(count).fill(workerScript).map(u => {
      const worker = new Worker(u) as WebWorker
      worker.status = WorkerStaus.EMPTY
      return worker
    })
  }

  async init() {
    this.promissWorkers = this.workers.map(worker => new Promise(resolve => {
      worker.onmessage = (event) => {
        if (event.data.type === 'Finished') {
          worker.status = WorkerStaus.EMPTY
          resolve(worker)
        }
      }

      if (worker.status === WorkerStaus.EMPTY) {
        resolve(worker)
      }
    }))
  }

  async dispatchWorker(data: [], exeFunc: (data: any, worker: WebWorker) => void) {

    if (!this.promissWorkers) {
      throw ('Please init web worker')
    }

    while (data.length > 0) {
      const worker = await Promise.any(this.promissWorkers)
      const exeData = data.splice(0, 1)[0]
      exeFunc(exeData, worker)
    }
  }
}