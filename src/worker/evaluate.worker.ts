import casm from 'casm'
import { assert } from '../utils'

export interface WorkerEventType {
  type: string;
  data: any;
}

let garbledTables: Uint8Array
let circuit: any

const ctx: Worker = self as any

// Post data to parent thread
ctx.postMessage({ foo: 'foo' })

// Respond to message from parent thread
ctx.addEventListener('message', (event) => {
  switch (event.type) {
    case 'setCircuit':
      setCircuit(event.data)
      break
    case 'setGarbledTables':
      setGarbledTables(event.data)
      break
    case 'evaluate':
      evaluateTable(event.data)
      break
  }
})

function setCircuit(c: any) {
  circuit = c
}

function setGarbledTables(data: Array<any>) {
  garbledTables = new Uint8Array(data)
}

function evaluateTable(labels: Array<any>) {
  if (!garbledTables) {
    throw ('Please set garbled tables')
  }

  const inputLabels = new Uint8Array(labels)

  assert(inputLabels.length === circuit.clientInputSize * 16 + circuit.nodeInputSize * 16)


}

export default null as any