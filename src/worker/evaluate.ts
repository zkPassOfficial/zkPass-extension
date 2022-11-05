import WorkerBase from './base'

export default class Evaluate extends WorkerBase {

  constructor() {
    super(2, './evaluate.worker.ts')
  }

  async prepare() {
    await this.init()
  }

  async evaluateTables(tables: []) {
    await this.dispatchWorker(tables, this.evaluate)
  }

  async evaluate(table: any, worker: Worker) {

  }


}